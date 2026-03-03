// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {GameEngine} from "../src/GameEngine.sol";
import {Treasury} from "../src/Treasury.sol";
import {SeasonNFT} from "../src/SeasonNFT.sol";

/// @title Deploy — Deploys all 3 game contracts with correct cross-references.
/// @dev   Handles circular dependency: GameEngine ↔ Treasury ↔ SeasonNFT.
///
///   Deployment order:
///   1. SeasonNFT (no dependencies)
///   2. Treasury  (needs GameEngine address → set later)
///   3. GameEngine(needs Treasury + SeasonNFT)
///   4. Wire: Treasury.setGameEngine(gameEngine)
///   5. Wire: SeasonNFT.setMinter(gameEngine)
///
///   Usage:
///     forge script script/Deploy.s.sol:DeployScript \
///       --rpc-url base_sepolia \
///       --broadcast \
///       --verify
///
///   Required env vars:
///     DEPLOYER_PRIVATE_KEY — deployer wallet private key
///     USDC_ADDRESS         — USDC token address on target chain
///     PROTOCOL_WALLET      — protocol fee recipient
contract DeployScript is Script {
    function run() external {
        // ── Read env ──────────────────────────────
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address usdc = vm.envAddress("USDC_ADDRESS");
        address protocolWallet = vm.envAddress("PROTOCOL_WALLET");

        console.log("Deployer:", vm.addr(deployerKey));
        console.log("USDC:", usdc);
        console.log("Protocol wallet:", protocolWallet);

        vm.startBroadcast(deployerKey);

        // ── Step 1: Deploy SeasonNFT ──────────────
        SeasonNFT seasonNFT = new SeasonNFT();
        console.log("SeasonNFT deployed:", address(seasonNFT));

        // ── Step 2: Deploy Treasury (gameEngine = address(0) for now) ──
        Treasury treasury = new Treasury(
            usdc,
            address(0),        // gameEngine — set after deployment
            protocolWallet
        );
        console.log("Treasury deployed:", address(treasury));

        // ── Step 3: Deploy GameEngine ─────────────
        GameEngine gameEngine = new GameEngine(
            usdc,
            address(treasury),
            address(seasonNFT)
        );
        console.log("GameEngine deployed:", address(gameEngine));

        // ── Step 4: Wire cross-references ─────────
        treasury.setGameEngine(address(gameEngine));
        console.log("Treasury.setGameEngine done");

        seasonNFT.setMinter(address(gameEngine));
        console.log("SeasonNFT.setMinter done");

        vm.stopBroadcast();

        // ── Summary ──────────────────────────────
        console.log("");
        console.log("=== DEPLOYMENT COMPLETE ===");
        console.log("GameEngine:", address(gameEngine));
        console.log("Treasury:  ", address(treasury));
        console.log("SeasonNFT: ", address(seasonNFT));
        console.log("");
        console.log("Next steps:");
        console.log("  1. Seed treasury: treasury.seedTreasury(1, 5_000_000_000)  // $5000 USDC");
        console.log("  2. Configure VRF: treasury.setVRFConfig(...)");
        console.log("  3. Start season:  gameEngine.startSeason()");
    }
}
