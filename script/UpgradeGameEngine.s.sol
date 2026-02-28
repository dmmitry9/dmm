// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {GameEngine} from "../src/GameEngine.sol";
import {Treasury} from "../src/Treasury.sol";
import {SeasonNFT} from "../src/SeasonNFT.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title UpgradeGameEngine — Redeploy GameEngine only, re-wire Treasury & SeasonNFT.
/// @dev   Keeps existing USDC, Treasury, SeasonNFT. Only deploys a new GameEngine.
///
///   Usage:
///     forge script script/UpgradeGameEngine.s.sol:UpgradeGameEngineScript \
///       --rpc-url base_sepolia \
///       --broadcast
///
///   Required env vars:
///     DEPLOYER_PRIVATE_KEY — deployer wallet private key (owner of Treasury & SeasonNFT)
contract UpgradeGameEngineScript is Script {
    // Current deployed addresses (Base Sepolia)
    address constant USDC       = 0xb64591F38292dA40375FC9f3BAf231f26e2c3903;
    address constant TREASURY   = 0x11e49674CE039A9fb15210e5258e0F062eF029E2;
    address constant SEASON_NFT = 0x9b6Fcf35e4728D78107F9D9295d40629CE3c9Ce4;

    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        console.log("Deployer:", deployer);
        console.log("Upgrading GameEngine on Base Sepolia");
        console.log("Existing Treasury:", TREASURY);
        console.log("Existing SeasonNFT:", SEASON_NFT);

        vm.startBroadcast(deployerKey);

        // ── Step 1: Deploy new GameEngine ─────────────
        GameEngine gameEngine = new GameEngine(USDC, TREASURY, SEASON_NFT);
        console.log("New GameEngine deployed:", address(gameEngine));

        // ── Step 2: Re-wire Treasury → new GameEngine ─
        Treasury(TREASURY).setGameEngine(address(gameEngine));
        console.log("Treasury.setGameEngine() done");

        // ── Step 3: Re-wire SeasonNFT → new GameEngine ─
        SeasonNFT(SEASON_NFT).setMinter(address(gameEngine));
        console.log("SeasonNFT.setMinter() done");

        // ── Step 4: Bootstrap → skip colliding Season 1 → start Season 2
        gameEngine.startSeason();
        console.log("Season 1 started (will skip - collides with Treasury)");

        gameEngine.skipSeason();
        console.log("Season 1 skipped");

        gameEngine.startNextSeason();
        console.log("Season 2 started (clean, no Treasury collision)");

        vm.stopBroadcast();

        // ── Summary ───────────────────────────────────
        console.log("");
        console.log("========================================");
        console.log("  GAMEENGINE UPGRADE COMPLETE");
        console.log("========================================");
        console.log("NEW GameEngine:", address(gameEngine));
        console.log("Treasury:      ", TREASURY);
        console.log("SeasonNFT:     ", SEASON_NFT);
        console.log("USDC:          ", USDC);
        console.log("========================================");
        console.log("");
        console.log("UPDATE frontend/.env and CI with new GameEngine address!");
    }
}
