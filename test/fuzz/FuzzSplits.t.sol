// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseTest} from "../BaseTest.sol";
import {UnitType, Faction} from "../../src/types/GameTypes.sol";

contract FuzzSplits is BaseTest {
    uint256 constant SPLIT_KILL     = 7_000;
    uint256 constant SPLIT_NOW      = 1_200;
    uint256 constant SPLIT_NEXT     = 1_000;
    uint256 constant SPLIT_NEXT2    =   500;
    uint256 constant SPLIT_PROTOCOL =   300;

    // ── Sum of all splits <= amount, dust <= 5 wei ───────────────

    function testFuzz_splitConservation(uint256 amount) external {
        amount = bound(amount, 10_000, 10_000_000e6); // min $0.01 to avoid dust edge cases

        _startSeason();
        uint256 seasonId = engine.currentSeasonId();

        // Snapshot before
        uint256 killBefore = treasury.killPot(0, 1);
        uint256 protocolBefore = treasury.protocolBalance();
        uint256 treasNow = treasury.seasonTreasury(seasonId);
        uint256 treasNext = treasury.seasonTreasury(seasonId + 1);
        uint256 treasNext2 = treasury.seasonTreasury(seasonId + 2);

        // Mint USDC to treasury (simulates transfer from player)
        usdc.mint(address(treasury), amount);

        vm.prank(address(engine));
        treasury.recordDeployment(alice, amount, 1, 0, seasonId);

        // Compute deltas
        uint256 killDelta = treasury.killPot(0, 1) - killBefore;
        uint256 protocolDelta = treasury.protocolBalance() - protocolBefore;
        uint256 treasuryDelta = (treasury.seasonTreasury(seasonId) - treasNow)
            + (treasury.seasonTreasury(seasonId + 1) - treasNext)
            + (treasury.seasonTreasury(seasonId + 2) - treasNext2);

        uint256 totalSplit = killDelta + protocolDelta + treasuryDelta;

        // Conservation: no money created
        assertLe(totalSplit, amount, "Splits exceed amount");
        // Dust is tiny (4 independent divisions → max 4 wei lost)
        assertGe(totalSplit, amount - 4, "Too much dust");
    }

    // ── Each split matches floor(amount * bps / 10000) ───────────

    function testFuzz_splitExactPercentages(uint256 amount) external {
        amount = bound(amount, 10_000, 10_000_000e6);

        _startSeason();
        uint256 seasonId = engine.currentSeasonId();

        uint256 killBefore = treasury.killPot(0, 1);
        uint256 protocolBefore = treasury.protocolBalance();
        uint256 treasNow = treasury.seasonTreasury(seasonId);
        uint256 treasNext = treasury.seasonTreasury(seasonId + 1);
        uint256 treasNext2 = treasury.seasonTreasury(seasonId + 2);

        usdc.mint(address(treasury), amount);
        vm.prank(address(engine));
        treasury.recordDeployment(alice, amount, 1, 0, seasonId);

        assertEq(treasury.killPot(0, 1) - killBefore, (amount * SPLIT_KILL) / BPS_DENOM, "Kill split wrong");
        assertEq(treasury.protocolBalance() - protocolBefore, (amount * SPLIT_PROTOCOL) / BPS_DENOM, "Protocol split wrong");
        assertEq(treasury.seasonTreasury(seasonId) - treasNow, (amount * SPLIT_NOW) / BPS_DENOM, "Treasury now wrong");
        assertEq(treasury.seasonTreasury(seasonId + 1) - treasNext, (amount * SPLIT_NEXT) / BPS_DENOM, "Treasury next wrong");
        assertEq(treasury.seasonTreasury(seasonId + 2) - treasNext2, (amount * SPLIT_NEXT2) / BPS_DENOM, "Treasury +2 wrong");
    }

    // ── Multiple deployments: cumulative conservation ─────────────

    function testFuzz_multipleDeploymentsConservation(uint256 amount1, uint256 amount2) external {
        amount1 = bound(amount1, 1, 5_000_000e6);
        amount2 = bound(amount2, 1, 5_000_000e6);

        _startSeason();

        uint256 treasuryBalBefore = usdc.balanceOf(address(treasury));

        // Cache seasonId BEFORE prank (vm.prank is consumed by next external call)
        uint256 seasonId = engine.currentSeasonId();

        // Two deployments: different lanes, different factions
        usdc.mint(address(treasury), amount1);
        vm.prank(address(engine));
        treasury.recordDeployment(alice, amount1, 1, 0, seasonId);

        usdc.mint(address(treasury), amount2);
        vm.prank(address(engine));
        treasury.recordDeployment(bob, amount2, 2, 1, seasonId);

        uint256 treasuryBalAfter = usdc.balanceOf(address(treasury));

        // Treasury USDC grew by exactly amount1 + amount2
        assertEq(treasuryBalAfter - treasuryBalBefore, amount1 + amount2, "USDC balance mismatch");

        // Total obligations should not exceed balance
        uint256 obligations = _treasuryObligations();
        assertLe(obligations, treasuryBalAfter, "Obligations exceed balance");
    }
}
