// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseTest} from "../BaseTest.sol";
import {UnitType, Faction, Weather, Squad} from "../../src/types/GameTypes.sol";

contract FuzzBattle is BaseTest {
    // ── After battle: at least 1 survivor on winning side ────────

    function testFuzz_battleSurvivorMin(
        uint8 laneId,
        uint8 pepeType,
        uint8 shibType,
        uint32 pepeCount,
        uint32 shibCount
    ) external {
        laneId = uint8(bound(laneId, 0, 2));
        pepeType = uint8(bound(pepeType, 1, 3));
        shibType = uint8(bound(shibType, 1, 3));
        pepeCount = uint32(bound(pepeCount, 1, 500));
        shibCount = uint32(bound(shibCount, 1, 500));

        _startSeason();
        _deployBothAndBattle(
            alice, bob,
            laneId,
            UnitType(pepeType), UnitType(shibType),
            pepeCount, shibCount
        );

        // At least 1 squad should remain in bastion
        uint256 remaining = engine.getBastionSquadCount(laneId);
        assertGe(remaining, 1, "No survivors after battle");
    }

    // ── After battle: all loser squads deactivated ───────────────

    function testFuzz_battleLoserDeactivated(
        uint8 pepeType,
        uint8 shibType,
        uint32 pepeCount,
        uint32 shibCount
    ) external {
        pepeType = uint8(bound(pepeType, 1, 3));
        shibType = uint8(bound(shibType, 1, 3));
        pepeCount = uint32(bound(pepeCount, 1, 500));
        shibCount = uint32(bound(shibCount, 1, 500));

        _startSeason();
        (uint256 pepeSquad, uint256 shibSquad) = _deployBothAndBattle(
            alice, bob, 0,
            UnitType(pepeType), UnitType(shibType),
            pepeCount, shibCount
        );

        // At most one side should have active squads
        (,,,, bool pepeActive,,,,,,) = engine.squads(pepeSquad);
        (,,,, bool shibActive,,,,,,) = engine.squads(shibSquad);

        // Not both can survive (one side must lose)
        assertTrue(!pepeActive || !shibActive, "Both sides still active");
    }

    // ── Kill reward conservation: distributed <= pot ──────────────

    function testFuzz_killRewardConservation(
        uint8 pepeType,
        uint8 shibType,
        uint32 pepeCount,
        uint32 shibCount
    ) external {
        pepeType = uint8(bound(pepeType, 1, 3));
        shibType = uint8(bound(shibType, 1, 3));
        pepeCount = uint32(bound(pepeCount, 1, 500));
        shibCount = uint32(bound(shibCount, 1, 500));

        _startSeason();

        // Deploy both squads (this grows the kill pots via recordDeployment)
        uint256 pepeSquad = _deploySquad(alice, 0, UnitType(pepeType), Faction.PEPE, pepeCount);
        uint256 shibSquad = _deploySquad(bob, 0, UnitType(shibType), Faction.SHIB, shibCount);

        uint256 deployTime = block.timestamp;
        _warpToMarchComplete(deployTime);

        // Snapshot AFTER deployment, BEFORE battle (arrivals + battle triggered together)
        uint256 pepePotBefore = treasury.killPot(0, 1);
        uint256 shibPotBefore = treasury.killPot(0, 2);
        uint256 totalPotBefore = pepePotBefore + shibPotBefore;
        uint256 treasuryBal = usdc.balanceOf(address(treasury));

        engine.resolveBattle(0); // triggers _processArrivals → battle

        uint256 pepePotAfter = treasury.killPot(0, 1);
        uint256 shibPotAfter = treasury.killPot(0, 2);
        uint256 totalPotAfter = pepePotAfter + shibPotAfter;

        // Total kill pots can only decrease (battle distributes to pendingRewards)
        assertLe(totalPotAfter, totalPotBefore, "Total kill pots grew after battle");

        // Treasury USDC balance unchanged (no USDC leaves during battle)
        assertEq(usdc.balanceOf(address(treasury)), treasuryBal, "Treasury balance changed");
    }

    // ── Battle with weather bonus: winner still respects rules ───

    function testFuzz_battleWithWeather(
        uint8 pepeType,
        uint8 shibType,
        uint32 pepeCount,
        uint32 shibCount,
        uint8 weather
    ) external {
        pepeType = uint8(bound(pepeType, 1, 3));
        shibType = uint8(bound(shibType, 1, 3));
        pepeCount = uint32(bound(pepeCount, 1, 500));
        shibCount = uint32(bound(shibCount, 1, 500));
        weather = uint8(bound(weather, 1, 3));

        _startSeason();

        // Set weather
        vm.prank(address(treasury));
        engine.setWeather(Weather(weather));

        _deployBothAndBattle(
            alice, bob, 0,
            UnitType(pepeType), UnitType(shibType),
            pepeCount, shibCount
        );

        uint256 remaining = engine.getBastionSquadCount(0);
        assertGe(remaining, 1, "No survivors with weather");

        // Treasury solvency after battle
        uint256 obligations = _treasuryObligations();
        uint256 bal = usdc.balanceOf(address(treasury));
        assertLe(obligations, bal, "Insolvency after weather battle");
    }

    // ── Unit accounting: totalUnits decreases after battle ───────

    function testFuzz_battleUnitAccounting(
        uint8 pepeType,
        uint8 shibType,
        uint32 pepeCount,
        uint32 shibCount
    ) external {
        pepeType = uint8(bound(pepeType, 1, 3));
        shibType = uint8(bound(shibType, 1, 3));
        pepeCount = uint32(bound(pepeCount, 1, 500));
        shibCount = uint32(bound(shibCount, 1, 500));

        _startSeason();

        uint256 pepeBefore = engine.totalUnitsPEPE();
        uint256 shibBefore = engine.totalUnitsSHIB();

        _deployBothAndBattle(
            alice, bob, 0,
            UnitType(pepeType), UnitType(shibType),
            pepeCount, shibCount
        );

        uint256 pepeAfter = engine.totalUnitsPEPE();
        uint256 shibAfter = engine.totalUnitsSHIB();

        // Both sides deployed, so totals increased before battle
        // After battle: at least one side lost units
        // Total should decrease from the peak (pepeBefore+pepeCount, shibBefore+shibCount)
        assertLe(pepeAfter + shibAfter, pepeBefore + shibBefore + pepeCount + shibCount,
            "Units exceeded deployed total");

        // At least some units were lost (one side fully eliminated)
        assertTrue(
            pepeAfter < pepeBefore + pepeCount || shibAfter < shibBefore + shibCount,
            "No units lost in battle"
        );
    }

    // ── Multi-lane battles don't interfere ───────────────────────

    function testFuzz_multiLaneBattlesIndependent(
        uint32 count0,
        uint32 count1
    ) external {
        count0 = uint32(bound(count0, 1, 200));
        count1 = uint32(bound(count1, 1, 200));

        _startSeason();

        // Deploy to lane 0
        uint256 pepe0 = _deploySquad(alice, 0, UnitType.SWORDSMAN, Faction.PEPE, count0);
        uint256 shib0 = _deploySquad(bob, 0, UnitType.SPEARMAN, Faction.SHIB, count0);

        // Deploy to lane 1 (charlie=PEPE, dave=SHIB for different faction locks)
        uint256 pepe1 = _deploySquad(charlie, 1, UnitType.CAVALRY, Faction.PEPE, count1);
        uint256 shib1 = _deploySquad(dave, 1, UnitType.SWORDSMAN, Faction.SHIB, count1);

        uint256 deployTime = block.timestamp;
        _warpToMarchComplete(deployTime);

        // Process arrivals on lane 0 (triggers battle)
        engine.resolveBattle(0);

        // Lane 1 should be unaffected
        assertEq(engine.getBastionSquadCount(1), 0, "Lane 1 affected by lane 0 battle");

        // Process arrivals on lane 1 (triggers battle)
        engine.resolveBattle(1);

        // Both lanes had battles, at least 1 survivor each
        assertGe(engine.getBastionSquadCount(0), 1, "Lane 0 no survivors");
        assertGe(engine.getBastionSquadCount(1), 1, "Lane 1 no survivors");
    }
}
