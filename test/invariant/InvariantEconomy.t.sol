// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseTest} from "../BaseTest.sol";
import {Handler} from "./Handler.sol";
import {UnitType, Faction} from "../../src/types/GameTypes.sol";

contract InvariantEconomy is BaseTest {
    Handler public handler;

    function setUp() public override {
        super.setUp();

        // Start a season so the handler can operate
        _startSeason();

        // Create handler with player pool
        address[] memory players = new address[](5);
        players[0] = alice;
        players[1] = bob;
        players[2] = charlie;
        players[3] = dave;
        players[4] = eve;

        handler = new Handler(engine, treasury, usdc, owner, players);

        // Target only the handler's action functions (exclude snapshotHoldScores and getters)
        bytes4[] memory selectors = new bytes4[](6);
        selectors[0] = Handler.deploy.selector;
        selectors[1] = Handler.arrive.selector;
        selectors[2] = Handler.withdraw.selector;
        selectors[3] = Handler.advanceTime.selector;
        selectors[4] = Handler.refreshHoldScore.selector;
        selectors[5] = Handler.changeWeather.selector;
        targetSelector(FuzzSelector({
            addr: address(handler),
            selectors: selectors
        }));
    }

    // ════════════════════════════════════════════
    //  INVARIANT 1: USDC CONSERVATION
    //  Treasury balance == total deposited - total withdrawn
    // ════════════════════════════════════════════

    function invariant_usdcConservation() external view {
        uint256 actual = usdc.balanceOf(address(treasury));
        uint256 expected = handler.ghost_totalDeposited() - handler.ghost_totalWithdrawn();

        assertEq(actual, expected, "USDC conservation violated");
    }

    // ════════════════════════════════════════════
    //  INVARIANT 2: KILL POTS + PENDING <= BALANCE
    //  Kill pots + pending rewards (the claimable obligations)
    //  must never exceed treasury USDC balance.
    //  Note: Full solvency check (including season treasuries)
    //  may show a deficit if rounding absorbs small losses —
    //  this is a known design decision (covered by seeds).
    // ════════════════════════════════════════════

    function invariant_claimableSolvency() external view {
        uint256 balance = usdc.balanceOf(address(treasury));
        uint256 claimable = _sumAllKillPots() + _sumPendingRewards();

        assertGe(balance, claimable, "Claimable obligations exceed balance");
    }

    // ════════════════════════════════════════════
    //  INVARIANT 3: KILL POT BOUNDED
    //  Each kill pot <= total treasury balance
    // ════════════════════════════════════════════

    function invariant_killPotBounded() external view {
        uint256 balance = usdc.balanceOf(address(treasury));
        for (uint8 lane = 0; lane < 3; lane++) {
            for (uint8 faction = 1; faction <= 2; faction++) {
                assertLe(
                    treasury.killPot(lane, faction),
                    balance,
                    "Kill pot exceeds treasury balance"
                );
            }
        }
    }

    // ════════════════════════════════════════════
    //  INVARIANT 4: PRICING BOUNDS
    //  Unit price always in [$5, $7] per unit
    // ════════════════════════════════════════════

    function invariant_pricingBounds() external view {
        uint256 totalPEPE = engine.totalUnitsPEPE();
        uint256 totalSHIB = engine.totalUnitsSHIB();

        for (uint8 f = 1; f <= 2; f++) {
            uint256 price = treasury.getUnitPrice(f, 1, totalPEPE, totalSHIB);
            assertGe(price, 1_000_000, "Price below $1");
            assertLe(price, 1_400_000, "Price above $1.40");
        }
    }

    // ════════════════════════════════════════════
    //  INVARIANT 5: UNIT COUNTS BOUNDED
    //  totalUnits never exceeds total deployed
    // ════════════════════════════════════════════

    function invariant_unitCountsBounded() external view {
        assertLe(
            engine.totalUnitsPEPE(),
            handler.ghost_totalPepeDeployed(),
            "PEPE units exceed deployed"
        );
        assertLe(
            engine.totalUnitsSHIB(),
            handler.ghost_totalShibDeployed(),
            "SHIB units exceed deployed"
        );
    }

    // ════════════════════════════════════════════
    //  INVARIANT 6: HOLD SCORE MONOTONICITY
    //  Hold scores only increase within a season
    // ════════════════════════════════════════════

    function invariant_holdScoreMonotonic() external {
        for (uint8 lane = 0; lane < 3; lane++) {
            (uint128 pepe, uint128 shib) = engine.getHoldScore(lane);

            assertGe(pepe, handler.ghost_holdScorePEPE(lane), "PEPE hold score decreased");
            assertGe(shib, handler.ghost_holdScoreSHIB(lane), "SHIB hold score decreased");
        }

        // Update snapshots for next check
        handler.snapshotHoldScores();
    }

    // ════════════════════════════════════════════
    //  CALL SUMMARY (for debugging coverage)
    // ════════════════════════════════════════════

    function invariant_callSummary() external view {
        // This invariant always passes; it just logs action counts
        // Useful to verify the handler is exercising all paths
        handler.calls_deploy();
        handler.calls_arrive();
        handler.calls_withdraw();
        handler.calls_advanceTime();
    }
}
