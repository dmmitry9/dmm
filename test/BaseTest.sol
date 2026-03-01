// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {GameEngine} from "../src/GameEngine.sol";
import {Treasury} from "../src/Treasury.sol";
import {SeasonNFT} from "../src/SeasonNFT.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";
import {MockVRFCoordinator} from "./mocks/MockVRFCoordinator.sol";
import {UnitType, Faction, Weather, SpecialEvent, Squad} from "../src/types/GameTypes.sol";

contract BaseTest is Test {
    GameEngine public engine;
    Treasury public treasury;
    SeasonNFT public seasonNFT;
    MockUSDC public usdc;
    MockVRFCoordinator public vrfMock;

    address public owner    = address(0xBEEF);
    address public protocol = address(0xC0FE);
    address public alice    = address(0xA11CE);
    address public bob      = address(0xB0B);
    address public charlie  = address(0xC0C0);
    address public dave     = address(0xDA7E);
    address public eve      = address(0xE7E);

    uint256 constant MARCH_DURATION  = 3 minutes;
    uint256 constant SEASON_DURATION = 20160;
    uint256 constant BPS_DENOM       = 10_000;

    function setUp() public virtual {
        vm.startPrank(owner);

        usdc = new MockUSDC();
        seasonNFT = new SeasonNFT();
        treasury = new Treasury(
            address(usdc),
            address(0), // gameEngine set later
            protocol
        );
        engine = new GameEngine(
            address(usdc),
            address(treasury),
            address(seasonNFT)
        );
        treasury.setGameEngine(address(engine));
        seasonNFT.setMinter(address(engine));

        // VRF mock
        vrfMock = new MockVRFCoordinator();
        treasury.setVRFConfig(
            address(vrfMock), 1, bytes32(0), 3, 500_000
        );

        vm.stopPrank();

        // Fund players (approve GameEngine for deployUnits, Treasury for seed/donate)
        _mintAndApprove(alice, 1_000_000e6);
        _mintAndApprove(bob, 1_000_000e6);
        _mintAndApprove(charlie, 1_000_000e6);
        _mintAndApprove(dave, 1_000_000e6);
        _mintAndApprove(eve, 1_000_000e6);

        // Warp past VRF cooldowns (weather: 6h, events: 8h)
        _warpTo(1 days);
    }

    // ════════════════════════════════════════════
    //  VIA_IR WARP WORKAROUNDS
    //  Each in its own function so Yul re-reads
    //  block.timestamp after the call boundary
    // ════════════════════════════════════════════

    function _warpTo(uint256 ts) internal {
        vm.warp(ts);
    }

    function _warpForward(uint256 delta) internal {
        vm.warp(block.timestamp + delta);
    }

    function _warpToMarchComplete(uint256 deployTime) internal {
        vm.warp(deployTime + MARCH_DURATION + 1);
    }

    function _warpToSeasonEnd() internal {
        vm.warp(engine.seasonStartTime() + SEASON_DURATION + 1);
    }

    // ════════════════════════════════════════════
    //  COMPOSITE HELPERS
    // ════════════════════════════════════════════

    function _startSeason() internal {
        vm.prank(owner);
        engine.startSeason();
    }

    function _deploySquad(
        address player,
        uint8 laneId,
        UnitType ut,
        Faction f,
        uint32 count
    ) internal returns (uint256 squadId) {
        squadId = engine.nextSquadId();
        vm.prank(player);
        engine.deployUnits(laneId, ut, f, count);
    }

    function _deployAndArrive(
        address player,
        uint8 laneId,
        UnitType ut,
        Faction f,
        uint32 count
    ) internal returns (uint256 squadId) {
        squadId = _deploySquad(player, laneId, ut, f, count);
        uint256 deployTime = block.timestamp;
        _warpToMarchComplete(deployTime);
        engine.refreshHoldScore(laneId);
    }

    /// @dev Deploy both factions to same lane at same time, warp, arrive both.
    ///      Second arrive triggers battle automatically.
    function _deployBothAndBattle(
        address pepePlayer,
        address shibPlayer,
        uint8 laneId,
        UnitType pepeType,
        UnitType shibType,
        uint32 pepeCount,
        uint32 shibCount
    ) internal returns (uint256 pepeSquad, uint256 shibSquad) {
        pepeSquad = _deploySquad(pepePlayer, laneId, pepeType, Faction.PEPE, pepeCount);
        shibSquad = _deploySquad(shibPlayer, laneId, shibType, Faction.SHIB, shibCount);

        uint256 deployTime = block.timestamp;
        _warpToMarchComplete(deployTime);

        engine.resolveBattle(laneId);  // triggers _processArrivals → _resolveBattle
    }

    function _endSeason() internal {
        _warpToSeasonEnd();
        vm.prank(owner);
        engine.endSeason();
    }

    function _mintAndApprove(address who, uint256 amount) internal {
        usdc.mint(who, amount);
        vm.prank(who);
        usdc.approve(address(engine), type(uint256).max);
        vm.prank(who);
        usdc.approve(address(treasury), type(uint256).max);
    }

    // ════════════════════════════════════════════
    //  VIEW HELPERS
    // ════════════════════════════════════════════

    function _sumAllKillPots() internal view returns (uint256 total) {
        for (uint8 lane = 0; lane < 3; lane++) {
            for (uint8 faction = 1; faction <= 2; faction++) {
                total += treasury.killPot(lane, faction);
            }
        }
    }

    function _sumSeasonTreasuries(uint256 maxSeason) internal view returns (uint256 total) {
        for (uint256 s = 1; s <= maxSeason + 2; s++) {
            total += treasury.seasonTreasury(s);
        }
    }

    function _treasuryObligations() internal view returns (uint256) {
        uint256 seasonId = engine.currentSeasonId();
        return _sumAllKillPots()
            + _sumSeasonTreasuries(seasonId)
            + treasury.protocolBalance()
            + _sumPendingRewards();
    }

    function _sumPendingRewards() internal view returns (uint256 total) {
        address[5] memory players = [alice, bob, charlie, dave, eve];
        for (uint256 i = 0; i < players.length; i++) {
            total += treasury.pendingRewards(players[i]);
        }
    }
}
