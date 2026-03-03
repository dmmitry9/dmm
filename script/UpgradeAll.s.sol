// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {GameEngine} from "../src/GameEngine.sol";
import {Treasury} from "../src/Treasury.sol";
import {SeasonNFT} from "../src/SeasonNFT.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title UpgradeAll — Redeploy both Treasury and GameEngine, re-wire SeasonNFT.
/// @dev   Keeps existing USDC and SeasonNFT. Deploys new Treasury + GameEngine.
contract UpgradeAllScript is Script {
    address constant USDC       = 0xb64591F38292dA40375FC9f3BAf231f26e2c3903;
    address constant SEASON_NFT = 0x9b6Fcf35e4728D78107F9D9295d40629CE3c9Ce4;

    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        console.log("Deployer:", deployer);

        vm.startBroadcast(deployerKey);

        // ── Step 1: Deploy new Treasury ─────────────
        Treasury treasury = new Treasury(USDC, address(0), deployer);
        console.log("New Treasury deployed:", address(treasury));

        // ── Step 2: Deploy new GameEngine ───────────
        GameEngine gameEngine = new GameEngine(USDC, address(treasury), SEASON_NFT);
        console.log("New GameEngine deployed:", address(gameEngine));

        // ── Step 3: Wire Treasury → GameEngine ──────
        treasury.setGameEngine(address(gameEngine));
        console.log("Treasury.setGameEngine() done");

        // ── Step 4: Wire SeasonNFT → new GameEngine ─
        SeasonNFT(SEASON_NFT).setMinter(address(gameEngine));
        console.log("SeasonNFT.setMinter() done");

        // ── Step 5: Start Season 1 ──────────────────
        gameEngine.startSeason();
        console.log("Season 1 started");

        vm.stopBroadcast();

        console.log("");
        console.log("========================================");
        console.log("  FULL UPGRADE COMPLETE");
        console.log("========================================");
        console.log("NEW Treasury:   ", address(treasury));
        console.log("NEW GameEngine: ", address(gameEngine));
        console.log("SeasonNFT:      ", SEASON_NFT);
        console.log("USDC:           ", USDC);
        console.log("========================================");
    }
}
