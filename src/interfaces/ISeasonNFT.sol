// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ISeasonNFT {
    /// @notice Mint commemorative NFTs for the top-3 players of a season.
    /// @param seasonId The season that ended.
    /// @param faction  Winning faction (1=PEPE, 2=SHIB).
    /// @param top3     Addresses of the top-3 players (by Contribution Score).
    function mintSeasonRewards(
        uint256 seasonId,
        uint8 faction,
        address[3] calldata top3
    ) external;
}
