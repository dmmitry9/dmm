// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseTest} from "../BaseTest.sol";
import {UnitType, Faction, Squad} from "../../src/types/GameTypes.sol";

contract FuzzDeployMixed is BaseTest {

    // ── All 3 types → 3 squads created ─────────────────────────

    function test_deployMixed_allThreeTypes() external {
        _startSeason();
        uint256 startId = engine.nextSquadId();

        vm.prank(alice);
        engine.deployMixedUnits(0, Faction.PEPE, 30, 40, 30);

        assertEq(engine.nextSquadId(), startId + 3, "Should create 3 squads");

        // Verify each squad type
        (,, UnitType ut0,,,,,,,,) = engine.squads(startId);
        (,, UnitType ut1,,,,,,,,) = engine.squads(startId + 1);
        (,, UnitType ut2,,,,,,,,) = engine.squads(startId + 2);
        assertEq(uint8(ut0), uint8(UnitType.SWORDSMAN), "Squad 0 should be Swordsman");
        assertEq(uint8(ut1), uint8(UnitType.SPEARMAN), "Squad 1 should be Spearman");
        assertEq(uint8(ut2), uint8(UnitType.CAVALRY), "Squad 2 should be Cavalry");

        // Verify counts
        (,,,,,,,uint32 cnt0,,,) = engine.squads(startId);
        (,,,,,,,uint32 cnt1,,,) = engine.squads(startId + 1);
        (,,,,,,,uint32 cnt2,,,) = engine.squads(startId + 2);
        assertEq(cnt0, 30, "Swordsman count");
        assertEq(cnt1, 40, "Spearman count");
        assertEq(cnt2, 30, "Cavalry count");

        // Verify all marching on lane 0
        assertEq(engine.getMarchingSquadCount(0), 3, "3 marching squads on lane 0");
    }

    // ── 2 types (one zero) → 2 squads ─────────────────────────

    function test_deployMixed_twoTypes() external {
        _startSeason();
        uint256 startId = engine.nextSquadId();

        vm.prank(alice);
        engine.deployMixedUnits(1, Faction.PEPE, 50, 0, 50);

        assertEq(engine.nextSquadId(), startId + 2, "Should create 2 squads");

        (,, UnitType ut0,,,,,,,,) = engine.squads(startId);
        (,, UnitType ut1,,,,,,,,) = engine.squads(startId + 1);
        assertEq(uint8(ut0), uint8(UnitType.SWORDSMAN));
        assertEq(uint8(ut1), uint8(UnitType.CAVALRY));
    }

    // ── 1 type → 1 squad (equivalent to deployUnits) ──────────

    function test_deployMixed_oneType() external {
        _startSeason();
        uint256 startId = engine.nextSquadId();

        vm.prank(alice);
        engine.deployMixedUnits(2, Faction.SHIB, 0, 100, 0);

        assertEq(engine.nextSquadId(), startId + 1, "Should create 1 squad");

        (,, UnitType ut,,,,,,,,) = engine.squads(startId);
        assertEq(uint8(ut), uint8(UnitType.SPEARMAN));
    }

    // ── costPaid splits proportionally ─────────────────────────

    function test_deployMixed_costPaidSplit() external {
        _startSeason();
        uint256 startId = engine.nextSquadId();

        uint256 balBefore = usdc.balanceOf(alice);

        vm.prank(alice);
        engine.deployMixedUnits(0, Faction.PEPE, 50, 30, 20);

        uint256 balAfter = usdc.balanceOf(alice);
        uint256 totalCost = balBefore - balAfter;

        // Get individual costPaid values
        (,,,,,,,,, uint96 cost0,) = engine.squads(startId);
        (,,,,,,,,, uint96 cost1,) = engine.squads(startId + 1);
        (,,,,,,,,, uint96 cost2,) = engine.squads(startId + 2);

        // Sum should equal total cost (within rounding)
        uint256 sumCosts = uint256(cost0) + uint256(cost1) + uint256(cost2);
        assertApproxEqAbs(sumCosts, totalCost, 2, "costPaid sum should match total cost");

        // Proportionality: cost0/totalCost ≈ 50/100
        assertApproxEqAbs(cost0, totalCost * 50 / 100, 1, "Swordsman cost ~50%");
        assertApproxEqAbs(cost1, totalCost * 30 / 100, 1, "Spearman cost ~30%");
        assertApproxEqAbs(cost2, totalCost * 20 / 100, 1, "Cavalry cost ~20%");
    }

    // ── Single USDC transfer ───────────────────────────────────

    function test_deployMixed_singleTransfer() external {
        _startSeason();

        uint256 aliceBefore = usdc.balanceOf(alice);
        uint256 treasuryBefore = usdc.balanceOf(address(treasury));

        vm.prank(alice);
        engine.deployMixedUnits(0, Faction.PEPE, 30, 40, 30);

        uint256 aliceDelta = aliceBefore - usdc.balanceOf(alice);
        uint256 treasuryDelta = usdc.balanceOf(address(treasury)) - treasuryBefore;

        assertEq(aliceDelta, treasuryDelta, "Alice paid exactly what treasury received");
        assertGt(aliceDelta, 0, "Non-zero cost");
    }

    // ── totalUnits updated correctly ───────────────────────────

    function test_deployMixed_totalUnitsUpdated() external {
        _startSeason();

        vm.prank(alice);
        engine.deployMixedUnits(0, Faction.PEPE, 30, 40, 30);

        assertEq(engine.totalUnitsPEPE(), 100, "Total PEPE should be 100");
        assertEq(engine.totalUnitsSHIB(), 0, "Total SHIB should be 0");

        vm.prank(bob);
        engine.deployMixedUnits(1, Faction.SHIB, 20, 20, 20);

        assertEq(engine.totalUnitsSHIB(), 60, "Total SHIB should be 60");
    }

    // ── Faction lock respected ─────────────────────────────────

    function test_deployMixed_factionLock() external {
        _startSeason();

        vm.prank(alice);
        engine.deployMixedUnits(0, Faction.PEPE, 10, 10, 10);

        vm.expectRevert("Faction locked");
        vm.prank(alice);
        engine.deployMixedUnits(1, Faction.SHIB, 10, 10, 10);
    }

    // ── Player stats updated ───────────────────────────────────

    function test_deployMixed_playerStats() external {
        _startSeason();

        uint256 balBefore = usdc.balanceOf(alice);

        vm.prank(alice);
        engine.deployMixedUnits(0, Faction.PEPE, 30, 40, 30);

        uint256 totalCost = balBefore - usdc.balanceOf(alice);

        (uint128 spent,,) = engine.playerStats(1, alice);
        assertEq(spent, uint128(totalCost), "playerStats.usdcSpent should match");
    }

    // ── Reverts ────────────────────────────────────────────────

    function test_deployMixed_revert_zeroTotal() external {
        _startSeason();
        vm.expectRevert("Zero units");
        vm.prank(alice);
        engine.deployMixedUnits(0, Faction.PEPE, 0, 0, 0);
    }

    function test_deployMixed_revert_invalidLane() external {
        _startSeason();
        vm.expectRevert("Invalid lane");
        vm.prank(alice);
        engine.deployMixedUnits(3, Faction.PEPE, 10, 10, 10);
    }

    function test_deployMixed_revert_invalidFaction() external {
        _startSeason();
        vm.expectRevert("Invalid faction");
        vm.prank(alice);
        engine.deployMixedUnits(0, Faction.NONE, 10, 10, 10);
    }

    // ── Fuzz: arbitrary composition ────────────────────────────

    function testFuzz_deployMixed(
        uint32 sword,
        uint32 spear,
        uint32 cav,
        uint8 laneId
    ) external {
        sword = uint32(bound(sword, 0, 200));
        spear = uint32(bound(spear, 0, 200));
        cav   = uint32(bound(cav, 0, 200));
        laneId = uint8(bound(laneId, 0, 2));

        uint32 total = sword + spear + cav;
        vm.assume(total > 0);

        _startSeason();

        uint256 startId = engine.nextSquadId();
        uint256 balBefore = usdc.balanceOf(alice);

        vm.prank(alice);
        engine.deployMixedUnits(laneId, Faction.PEPE, sword, spear, cav);

        // Count expected squads
        uint256 expectedSquads;
        if (sword > 0) expectedSquads++;
        if (spear > 0) expectedSquads++;
        if (cav > 0)   expectedSquads++;

        assertEq(
            engine.nextSquadId(),
            startId + expectedSquads,
            "Squad count should match non-zero inputs"
        );
        assertEq(engine.totalUnitsPEPE(), total, "Total units should match sum");
        assertGt(balBefore - usdc.balanceOf(alice), 0, "Should have paid USDC");
    }

    // ── Mixed deploy → arrive → battle works ───────────────────

    function test_deployMixed_arriveAndBattle() external {
        _startSeason();

        // Alice deploys mixed PEPE on lane 0
        vm.prank(alice);
        engine.deployMixedUnits(0, Faction.PEPE, 30, 40, 30);

        // Bob deploys single SHIB on lane 0
        _deploySquad(bob, 0, UnitType.SWORDSMAN, Faction.SHIB, 100);

        // Warp past march and resolve
        _warpForward(MARCH_DURATION + 1);
        engine.resolveBattle(0);

        // Battle should have occurred — at least 1 squad survives
        uint256 remaining = engine.getBastionSquadCount(0);
        assertGe(remaining, 1, "Should have survivors after battle");
    }
}
