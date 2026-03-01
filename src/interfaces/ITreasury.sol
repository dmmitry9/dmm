// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ITreasury {
    // ═══════════════════════════════════════════
    //          GAME ENGINE → TREASURY
    // ═══════════════════════════════════════════

    /// @notice Record a deployment and split the USDC across killPot, treasury, protocol fee.
    /// @dev    GameEngine transfers USDC to Treasury before calling this.
    ///         70% → killPot[laneId][faction], 30% → treasury/protocol.
    function recordDeployment(
        address payer,
        uint256 amount,
        uint8 faction,
        uint8 laneId,
        uint256 seasonId
    ) external;

    /// @notice Distribute the FULL killPot of the losing faction to winners.
    /// @param laneId   Lane where the battle occurred.
    /// @param loser    Losing faction (1=PEPE, 2=SHIB) — rewards come from its killPot.
    /// @param winners  Addresses of surviving squad owners.
    /// @param shares   Proportional shares (pre-battle effectiveUnits) for each winner.
    function distributeKillReward(
        uint8 laneId,
        uint8 loser,
        address[] calldata winners,
        uint256[] calldata shares
    ) external;

    /// @notice Distribute a PARTIAL killPot to losers (bidirectional kill reward).
    /// @param laneId           Lane where the battle occurred.
    /// @param fromFaction      Faction whose killPot is partially distributed (the winner's pot).
    /// @param recipients       Addresses of losing squad owners.
    /// @param shares           Proportional shares (pre-battle effectiveUnits) for each loser.
    /// @param casualtiesRatioBps Percentage of the pot to distribute (10000 - survivalRatioBps).
    function distributePartialKillReward(
        uint8 laneId,
        uint8 fromFaction,
        address[] calldata recipients,
        uint256[] calldata shares,
        uint256 casualtiesRatioBps
    ) external;

    /// @notice Transfer attrition-killed units' killPot portion to the weekly treasury.
    function transferAttritionPotToTreasury(
        uint8 laneId,
        uint8 faction,
        uint256 amount
    ) external;

    /// @notice Return the current killPot balance for a lane/faction.
    function getKillPot(uint8 laneId, uint8 faction) external view returns (uint256);

    /// @notice Compute dynamic unit price.
    /// @dev    if totalPEPE + totalSHIB == 0 → returns BASE_PRICE * count.
    function getUnitPrice(
        uint8 faction,
        uint256 count,
        uint256 totalPEPE,
        uint256 totalSHIB
    ) external pure returns (uint256);

    /// @notice Finalize the season treasury (stops hold score accrual).
    /// @param seasonId       The season being finalized.
    /// @param totalHoldScore Sum of all hold scores across all bastions (PEPE + SHIB).
    /// @param winnerFaction  The winning faction (1=PEPE, 2=SHIB).
    function finalizeSeason(
        uint256 seasonId,
        uint256 totalHoldScore,
        uint8 winnerFaction,
        uint256[3] calldata laneHoldScores
    ) external;

    /// @notice Player claims their share of the season treasury after it ends.
    function claim(uint256 seasonId) external;

    // ═══════════════════════════════════════════
    //            PLAYER FUNCTIONS
    // ═══════════════════════════════════════════

    /// @notice Withdraw all accumulated pending rewards (kill rewards).
    function withdraw() external;

    // ═══════════════════════════════════════════
    //            FUNDING
    // ═══════════════════════════════════════════

    /// @notice Seed the treasury for a season with initial USDC (founders).
    function seedTreasury(uint256 seasonId, uint256 amount) external;

    /// @notice Donate USDC to a season's treasury (community).
    function donate(uint256 seasonId, uint256 amount) external;
}
