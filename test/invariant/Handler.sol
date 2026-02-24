// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {GameEngine} from "../../src/GameEngine.sol";
import {Treasury} from "../../src/Treasury.sol";
import {MockUSDC} from "../mocks/MockUSDC.sol";
import {UnitType, Faction, Weather} from "../../src/types/GameTypes.sol";

contract Handler is Test {
    GameEngine public engine;
    Treasury public treasury;
    MockUSDC public usdc;

    address public owner;
    address[] public players;
    mapping(address => Faction) public playerFactions;

    // Ghost variables for invariant checking
    uint256 public ghost_totalDeposited;
    uint256 public ghost_totalWithdrawn;
    uint256 public ghost_totalPepeDeployed;
    uint256 public ghost_totalShibDeployed;

    // Hold score snapshots (per lane, for monotonicity check)
    uint128[3] public ghost_holdScorePEPE;
    uint128[3] public ghost_holdScoreSHIB;

    // Action counters
    uint256 public calls_deploy;
    uint256 public calls_arrive;
    uint256 public calls_retreat;
    uint256 public calls_withdraw;
    uint256 public calls_advanceTime;

    // Track deployed squads for arrive/retreat
    uint256[] public deployedSquadIds;

    uint256 constant MARCH_DURATION = 90 minutes;

    constructor(
        GameEngine _engine,
        Treasury _treasury,
        MockUSDC _usdc,
        address _owner,
        address[] memory _players
    ) {
        engine = _engine;
        treasury = _treasury;
        usdc = _usdc;
        owner = _owner;
        for (uint256 i = 0; i < _players.length; i++) {
            players.push(_players[i]);
        }
    }

    // ════════════════════════════════════════════
    //  VIA_IR SAFE WARP
    // ════════════════════════════════════════════

    function _warpForwardSafe(uint256 delta) internal {
        vm.warp(block.timestamp + delta);
    }

    // ════════════════════════════════════════════
    //  HANDLER ACTIONS
    // ════════════════════════════════════════════

    function deploy(uint256 seed) external {
        address player = _pickPlayer(seed);
        uint8 laneId = uint8(bound(seed >> 8, 0, 2));
        UnitType ut = UnitType(bound(seed >> 16, 1, 3));
        uint32 count = uint32(bound(seed >> 32, 1, 200));

        // Pick or maintain faction for this player
        Faction f = _pickFaction(player, seed);

        // Ensure player has enough USDC (max price = $7 * count)
        uint256 maxCost = 7_000_000 * uint256(count);
        _ensureBalance(player, maxCost);

        uint256 balBefore = usdc.balanceOf(address(treasury));

        vm.prank(player);
        try engine.deployUnits(laneId, ut, f, count) {
            uint256 balAfter = usdc.balanceOf(address(treasury));
            uint256 deposited = balAfter - balBefore;
            ghost_totalDeposited += deposited;

            if (f == Faction.PEPE) {
                ghost_totalPepeDeployed += count;
            } else {
                ghost_totalShibDeployed += count;
            }

            deployedSquadIds.push(engine.nextSquadId() - 1);
            calls_deploy++;
        } catch {}
    }

    function arrive(uint256 seed) external {
        if (deployedSquadIds.length == 0) return;

        // Warp past march duration to ensure squads can arrive
        _warpForwardSafe(MARCH_DURATION + 1 minutes);

        uint256 idx = bound(seed, 0, deployedSquadIds.length - 1);
        uint256 squadId = deployedSquadIds[idx];

        try engine.arrive(squadId) {
            calls_arrive++;
        } catch {}
    }

    function retreat(uint256 seed) external {
        if (deployedSquadIds.length == 0) return;

        uint256 idx = bound(seed, 0, deployedSquadIds.length - 1);
        uint256 squadId = deployedSquadIds[idx];

        (address squadOwner,,,, bool active, , uint40 bastionEnteredAt,,,) = engine.squads(squadId);
        if (!active || bastionEnteredAt > 0) return;

        vm.prank(squadOwner);
        try engine.retreat(squadId) {
            calls_retreat++;
        } catch {}
    }

    function withdraw(uint256 seed) external {
        address player = _pickPlayer(seed);
        uint256 pending = treasury.pendingRewards(player);
        if (pending == 0) return;

        vm.prank(player);
        try treasury.withdraw() {
            ghost_totalWithdrawn += pending;
            calls_withdraw++;
        } catch {}
    }

    function advanceTime(uint256 seed) external {
        uint256 delta = bound(seed, 1 minutes, 4 hours);
        _warpForwardSafe(delta);
        calls_advanceTime++;
    }

    function refreshHoldScore(uint256 seed) external {
        uint8 laneId = uint8(bound(seed, 0, 2));
        try engine.refreshHoldScore(laneId) {} catch {}
    }

    function changeWeather(uint256 seed) external {
        Weather w = Weather(bound(seed, 0, 3));
        vm.prank(address(treasury));
        try engine.setWeather(w) {} catch {}
    }

    // ════════════════════════════════════════════
    //  GHOST STATE UPDATES (called by invariant test)
    // ════════════════════════════════════════════

    function snapshotHoldScores() external {
        for (uint8 lane = 0; lane < 3; lane++) {
            (uint128 pepe, uint128 shib) = engine.getHoldScore(lane);
            ghost_holdScorePEPE[lane] = pepe;
            ghost_holdScoreSHIB[lane] = shib;
        }
    }

    // ════════════════════════════════════════════
    //  INTERNAL HELPERS
    // ════════════════════════════════════════════

    function _pickPlayer(uint256 seed) internal view returns (address) {
        return players[seed % players.length];
    }

    function _pickFaction(address player, uint256 seed) internal returns (Faction) {
        // If player already has a faction assigned for this season, use it
        if (playerFactions[player] != Faction.NONE) {
            return playerFactions[player];
        }
        // Otherwise assign randomly
        Faction f = (seed % 2 == 0) ? Faction.PEPE : Faction.SHIB;
        playerFactions[f == Faction.PEPE ? player : player] = f;
        return f;
    }

    function _ensureBalance(address player, uint256 needed) internal {
        uint256 bal = usdc.balanceOf(player);
        if (bal < needed) {
            usdc.mint(player, needed - bal + 1_000e6);
        }
    }

    function getDeployedCount() external view returns (uint256) {
        return deployedSquadIds.length;
    }

    function getPlayerCount() external view returns (uint256) {
        return players.length;
    }
}
