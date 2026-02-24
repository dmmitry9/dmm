// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {GameEngine} from "../../src/GameEngine.sol";

contract AttritionHarness is GameEngine {
    constructor(address _usdc, address _treasury, address _seasonNFT)
        GameEngine(_usdc, _treasury, _seasonNFT)
    {}

    function exposed_getAttrition(uint256 h) external pure returns (uint256) {
        return _getAttrition(h);
    }
}
