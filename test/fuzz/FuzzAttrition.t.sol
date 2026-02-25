// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseTest} from "../BaseTest.sol";
import {AttritionHarness} from "../harness/AttritionHarness.sol";
import {UnitType, Faction} from "../../src/types/GameTypes.sol";

contract FuzzAttrition is BaseTest {
    AttritionHarness public harness;

    function setUp() public override {
        super.setUp();
        vm.prank(owner);
        harness = new AttritionHarness(
            address(usdc), address(treasury), address(seasonNFT)
        );
    }

    // ── Attrition table is monotonically decreasing ──────────────

    function testFuzz_attritionMonotonic(uint256 h1, uint256 h2) external view {
        h1 = bound(h1, 0, 168);
        h2 = bound(h2, h1, 168);

        uint256 a1 = harness.exposed_getAttrition(h1);
        uint256 a2 = harness.exposed_getAttrition(h2);

        assertGe(a1, a2, "Attrition not monotonic");
    }

    // ── Attrition values are within [10, 10000] ──────────────────

    function testFuzz_attritionBounds(uint256 h) external view {
        h = bound(h, 0, 168);

        uint256 a = harness.exposed_getAttrition(h);

        assertGe(a, 10, "Attrition below minimum");
        assertLe(a, 10_000, "Attrition above maximum");
    }

    // ── h=0 returns exactly 10000 (100%) ─────────────────────────

    function test_attritionZeroHoursIsFull() external view {
        assertEq(harness.exposed_getAttrition(0), 10_000, "h=0 should be 10000");
    }

    // ── h=168 returns exactly 10 (0.1%) ──────────────────────────

    function test_attritionMaxHoursIsMinimum() external view {
        assertEq(harness.exposed_getAttrition(168), 10, "h=168 should be 10");
    }

    // ── h > 168 reverts ──────────────────────────────────────────

    function testFuzz_attritionOutOfRangeReverts(uint256 h) external {
        h = bound(h, 169, 1_000);
        vm.expectRevert("h out of range");
        harness.exposed_getAttrition(h);
    }

    // ── Effective units after attrition: always <= initialCount ──

    function testFuzz_effectiveUnitsDecay(
        uint32 count,
        uint256 hoursInBastion
    ) external {
        count = uint32(bound(count, 1, 100_000));
        hoursInBastion = bound(hoursInBastion, 0, 168);

        _startSeason();

        uint256 squadId = _deploySquad(alice, 0, UnitType.SWORDSMAN, Faction.PEPE, count);
        uint256 deployTime = block.timestamp;

        // Warp past march + bastion hours
        _warpToMarchComplete(deployTime);
        engine.arrive(squadId);

        // Warp additional hours in bastion
        _warpForward(hoursInBastion * 6 minutes);

        uint256 eff = engine.getEffectiveUnits(squadId);

        assertLe(eff, count, "Effective exceeds initial");

        // At 0 hours in bastion, effective should equal initial
        if (hoursInBastion == 0) {
            assertEq(eff, count, "No attrition at h=0");
        }
    }

    // ── Effective units formula matches table ─────────────────────

    function testFuzz_effectiveUnitsMatchesTable(
        uint32 count,
        uint256 hoursInBastion
    ) external {
        count = uint32(bound(count, 100, 100_000));
        hoursInBastion = bound(hoursInBastion, 0, 168);

        _startSeason();

        uint256 squadId = _deploySquad(alice, 0, UnitType.SWORDSMAN, Faction.PEPE, count);
        uint256 deployTime = block.timestamp;
        _warpToMarchComplete(deployTime);
        engine.arrive(squadId);
        _warpForward(hoursInBastion * 6 minutes);

        uint256 eff = engine.getEffectiveUnits(squadId);
        uint256 attritionMult = harness.exposed_getAttrition(hoursInBastion);
        uint256 expected = (uint256(count) * attritionMult) / 10_000;

        assertEq(eff, expected, "Effective doesn't match table");
    }
}
