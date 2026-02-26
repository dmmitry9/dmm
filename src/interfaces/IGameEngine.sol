// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Weather, SpecialEvent} from "../types/GameTypes.sol";

interface IGameEngine {
    /// @notice Called by Treasury (VRF callback) to update weather.
    function setWeather(Weather weather) external;

    /// @notice Called by Treasury (VRF callback) to start a special event.
    function setSpecialEvent(SpecialEvent evt) external;
}
