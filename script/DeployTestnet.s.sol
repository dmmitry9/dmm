// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {GameEngine} from "../src/GameEngine.sol";
import {Treasury} from "../src/Treasury.sol";
import {SeasonNFT} from "../src/SeasonNFT.sol";
import {MockUSDC} from "../test/mocks/MockUSDC.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title DeployTestnet — One-click Base Sepolia deployment with MockUSDC.
/// @dev   Deploys MockUSDC + all 3 game contracts, seeds treasury, starts season 1.
///
///   Usage:
///     forge script script/DeployTestnet.s.sol:DeployTestnetScript \
///       --rpc-url base_sepolia \
///       --broadcast
///
///   Required env vars:
///     DEPLOYER_PRIVATE_KEY — deployer wallet private key (with Base Sepolia ETH for gas)
contract DeployTestnetScript is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        console.log("Deployer:", deployer);
        console.log("Network: Base Sepolia");

        vm.startBroadcast(deployerKey);

        // ── Step 1: Deploy MockUSDC ─────────────────
        MockUSDC usdc = new MockUSDC();
        console.log("MockUSDC deployed:", address(usdc));

        // Mint 10M USDC to deployer for seeding + testing
        usdc.mint(deployer, 10_000_000 * 1e6);
        console.log("Minted 10M USDC to deployer");

        // ── Step 2: Deploy SeasonNFT ────────────────
        SeasonNFT seasonNFT = new SeasonNFT();
        console.log("SeasonNFT deployed:", address(seasonNFT));

        // ── Step 3: Deploy Treasury ─────────────────
        // Deployer acts as creators + buyback wallet on testnet
        Treasury treasury = new Treasury(
            address(usdc),
            address(0),    // gameEngine — set after
            deployer,      // creatorsWallet
            deployer       // buybackWallet
        );
        console.log("Treasury deployed:", address(treasury));

        // ── Step 4: Deploy GameEngine ───────────────
        GameEngine gameEngine = new GameEngine(
            address(usdc),
            address(treasury),
            address(seasonNFT)
        );
        console.log("GameEngine deployed:", address(gameEngine));

        // ── Step 5: Wire cross-references ───────────
        treasury.setGameEngine(address(gameEngine));
        seasonNFT.setMinter(address(gameEngine));
        console.log("Cross-references wired");

        // ── Step 6: Seed treasury with $10,000 USDC ─
        usdc.approve(address(treasury), 10_000 * 1e6);
        treasury.seedTreasury(1, 10_000 * 1e6);
        console.log("Treasury seeded with $10,000 USDC");

        // ── Step 7: Start Season 1 ─────────────────
        gameEngine.startSeason();
        console.log("Season 1 started");

        vm.stopBroadcast();

        // ── Summary ─────────────────────────────────
        console.log("");
        console.log("========================================");
        console.log("  TESTNET DEPLOYMENT COMPLETE");
        console.log("========================================");
        console.log("MockUSDC:   ", address(usdc));
        console.log("GameEngine: ", address(gameEngine));
        console.log("Treasury:   ", address(treasury));
        console.log("SeasonNFT:  ", address(seasonNFT));
        console.log("========================================");
        console.log("");
        console.log("Season 1 is ACTIVE. Game is ready to play.");
        console.log("Deployer has ~9,990,000 USDC remaining for testing.");
        console.log("");
        console.log("To mint test USDC for other players:");
        console.log("  cast send <MockUSDC> 'mint(address,uint256)' <player> 1000000000 --rpc-url base_sepolia --private-key $DEPLOYER_PRIVATE_KEY");
    }
}
