// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {Weather, SpecialEvent} from "./types/GameTypes.sol";
import {ITreasury} from "./interfaces/ITreasury.sol";
import {IGameEngine} from "./interfaces/IGameEngine.sol";

/// @title Treasury — USDC flows, kill pots, season rewards, VRF integration
/// @notice Manages all financial operations for the PEPE vs SHIB game.
/// @dev    Pull-payment pattern: rewards accumulate in pendingRewards, players withdraw().
contract Treasury is ITreasury, Ownable, ReentrancyGuard {
    // ═══════════════════════════════════════════
    //                 CONSTANTS
    // ═══════════════════════════════════════════

    // Economic splits (basis points, sum = 10000)
    uint256 public constant SPLIT_KILL_REWARD    = 7_000; // 70% → killPot
    uint256 public constant SPLIT_TREASURY_NOW   =   800; //  8% → current season treasury
    uint256 public constant SPLIT_TREASURY_NEXT  = 1_000; // 10% → next season treasury
    uint256 public constant SPLIT_TREASURY_NEXT2 =   500; //  5% → season+2 treasury
    uint256 public constant SPLIT_CREATORS       =   200; //  2% → creators
    uint256 public constant SPLIT_BUYBACK        =   500; //  5% → buyback reserve
    uint256 public constant BPS_DENOM            = 10_000;

    // Pricing (USDC 6 decimals)
    uint256 public constant BASE_PRICE_USDC = 5_000_000; // $5
    uint256 public constant MAX_PRICE_USDC  = 7_000_000; // $7
    uint256 public constant SURGE_START     = 100;        // diff threshold to start price increase
    uint256 public constant SURGE_END       = 1000;       // diff threshold for max price

    // VRF timing
    uint256 public constant WEATHER_INTERVAL      = 6 hours;
    uint256 public constant MIN_EVENT_COOLDOWN     = 8 hours;

    // ═══════════════════════════════════════════
    //                  EVENTS
    // ═══════════════════════════════════════════

    event DeploymentRecorded(
        address indexed payer, uint256 amount, uint8 faction, uint8 laneId, uint256 seasonId
    );
    event KillRewardDistributed(uint8 indexed laneId, uint8 loserFaction, uint256 totalPot);
    event PartialKillRewardDistributed(
        uint8 indexed laneId, uint8 fromFaction, uint256 distributed, uint256 remaining
    );
    event RetreatRefunded(address indexed player, uint256 refund, uint8 laneId, uint8 faction);
    event AttritionPotTransferred(uint8 indexed laneId, uint8 faction, uint256 amount);
    event SeasonFinalized(uint256 indexed seasonId, uint8 winnerFaction, uint256 treasuryBalance);
    event SeasonClaimed(uint256 indexed seasonId, address indexed player, uint256 amount);
    event Withdrawn(address indexed player, uint256 amount);
    event TreasurySeeded(uint256 indexed seasonId, uint256 amount);
    event TreasuryDonation(uint256 indexed seasonId, address indexed donor, uint256 amount);
    event CreatorsWithdrawn(address indexed to, uint256 amount);
    event BuybackWithdrawn(address indexed to, uint256 amount);
    event WeatherRequested(uint256 requestId);
    event SpecialEventRequested(uint256 requestId);

    // ═══════════════════════════════════════════
    //                  STORAGE
    // ═══════════════════════════════════════════

    IGameEngine public gameEngine;
    IERC20 public usdc;

    // Kill pots: killPot[laneId][factionUint8] → USDC balance
    mapping(uint8 => mapping(uint8 => uint256)) public killPot;

    // Season treasury pools: seasonId → accumulated USDC
    mapping(uint256 => uint256) public seasonTreasury;

    // Season results (populated at finalizeSeason)
    struct SeasonResult {
        bool finalized;
        uint8 winnerFaction;
        uint256 totalHoldScore;
        uint256 treasuryBalance; // snapshot at finalize time
        uint256 totalClaimed;
        uint256[3] laneHoldScores; // per-lane totals
    }
    mapping(uint256 => SeasonResult) public seasonResults;
    mapping(uint256 => mapping(address => bool)) public hasClaimed;

    // Pull-payment balances
    mapping(address => uint256) public pendingRewards;

    // Creator & buyback reserves
    uint256 public creatorsBalance;
    uint256 public buybackReserve;
    address public creatorsWallet;
    address public buybackWallet;

    // Current season reference (set from GameEngine via finalizeSeason)
    uint256 public currentSeasonId;

    // VRF state (Phase 2 Chainlink VRF v2 — addresses set by owner)
    address public vrfCoordinator;
    uint64  public vrfSubscriptionId;
    bytes32 public vrfKeyHash;
    uint16  public vrfConfirmations;
    uint32  public vrfCallbackGasLimit;
    mapping(uint256 => uint8) public vrfRequestType; // requestId → 1=weather, 2=event
    uint256 public lastWeatherUpdate;
    uint256 public lastEventTrigger;

    // ═══════════════════════════════════════════
    //                 MODIFIERS
    // ═══════════════════════════════════════════

    modifier onlyGameEngine() {
        require(msg.sender == address(gameEngine), "Only GameEngine");
        _;
    }

    // ═══════════════════════════════════════════
    //               CONSTRUCTOR
    // ═══════════════════════════════════════════

    constructor(
        address _usdc,
        address _gameEngine,
        address _creatorsWallet,
        address _buybackWallet
    ) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC address");
        require(_creatorsWallet != address(0), "Invalid creators wallet");
        require(_buybackWallet != address(0), "Invalid buyback wallet");

        usdc = IERC20(_usdc);
        creatorsWallet = _creatorsWallet;
        buybackWallet = _buybackWallet;

        // gameEngine can be set later if circular deployment needed
        if (_gameEngine != address(0)) {
            gameEngine = IGameEngine(_gameEngine);
        }
    }

    // ═══════════════════════════════════════════
    //            ADMIN FUNCTIONS
    // ═══════════════════════════════════════════

    /// @notice Set the GameEngine address (for circular deployment).
    function setGameEngine(address _gameEngine) external onlyOwner {
        require(_gameEngine != address(0), "Invalid GameEngine address");
        gameEngine = IGameEngine(_gameEngine);
    }

    /// @notice Update creators wallet.
    function setCreatorsWallet(address _wallet) external onlyOwner {
        require(_wallet != address(0), "Invalid address");
        creatorsWallet = _wallet;
    }

    /// @notice Update buyback wallet.
    function setBuybackWallet(address _wallet) external onlyOwner {
        require(_wallet != address(0), "Invalid address");
        buybackWallet = _wallet;
    }

    /// @notice Configure Chainlink VRF v2 parameters.
    function setVRFConfig(
        address _coordinator,
        uint64 _subscriptionId,
        bytes32 _keyHash,
        uint16 _confirmations,
        uint32 _callbackGasLimit
    ) external onlyOwner {
        vrfCoordinator = _coordinator;
        vrfSubscriptionId = _subscriptionId;
        vrfKeyHash = _keyHash;
        vrfConfirmations = _confirmations;
        vrfCallbackGasLimit = _callbackGasLimit;
    }

    // ═══════════════════════════════════════════
    //       GAME ENGINE → TREASURY (CORE)
    // ═══════════════════════════════════════════

    /// @inheritdoc ITreasury
    function recordDeployment(
        address payer,
        uint256 amount,
        uint8 faction,
        uint8 laneId,
        uint256 seasonId
    ) external override onlyGameEngine {
        // 70% → killPot
        uint256 killPortion = (amount * SPLIT_KILL_REWARD) / BPS_DENOM;
        killPot[laneId][faction] += killPortion;

        // 8% → current season treasury
        uint256 treasuryNow = (amount * SPLIT_TREASURY_NOW) / BPS_DENOM;
        seasonTreasury[seasonId] += treasuryNow;

        // 10% → next season treasury
        uint256 treasuryNext = (amount * SPLIT_TREASURY_NEXT) / BPS_DENOM;
        seasonTreasury[seasonId + 1] += treasuryNext;

        // 5% → season+2 treasury
        uint256 treasuryNext2 = (amount * SPLIT_TREASURY_NEXT2) / BPS_DENOM;
        seasonTreasury[seasonId + 2] += treasuryNext2;

        // 2% → creators
        uint256 creatorsPortion = (amount * SPLIT_CREATORS) / BPS_DENOM;
        creatorsBalance += creatorsPortion;

        // 5% → buyback
        uint256 buybackPortion = (amount * SPLIT_BUYBACK) / BPS_DENOM;
        buybackReserve += buybackPortion;

        // Track current season
        if (seasonId > currentSeasonId) {
            currentSeasonId = seasonId;
        }

        emit DeploymentRecorded(payer, amount, faction, laneId, seasonId);
    }

    /// @inheritdoc ITreasury
    function getUnitPrice(
        uint8 faction,
        uint256 count,
        uint256 totalPEPE,
        uint256 totalSHIB
    ) external pure override returns (uint256) {
        if (count == 0) return 0;

        uint256 total = totalPEPE + totalSHIB;
        if (total == 0) {
            return BASE_PRICE_USDC * count;
        }

        // Determine dominant faction
        uint256 dominant;
        uint256 underdog;
        uint8 dominantFaction;

        if (totalPEPE > totalSHIB) {
            dominant = totalPEPE;
            underdog = totalSHIB;
            dominantFaction = 1; // PEPE
        } else if (totalSHIB > totalPEPE) {
            dominant = totalSHIB;
            underdog = totalPEPE;
            dominantFaction = 2; // SHIB
        } else {
            // Equal — both pay base price
            return BASE_PRICE_USDC * count;
        }

        // Underdog always pays base price
        if (faction != dominantFaction) {
            return BASE_PRICE_USDC * count;
        }

        // Dominant faction: linear price ramp from BASE to MAX
        // based on unit difference (SURGE_START..SURGE_END → $5..$7)
        uint256 diff = dominant - underdog;
        if (diff <= SURGE_START) {
            return BASE_PRICE_USDC * count;
        }
        if (diff >= SURGE_END) {
            return MAX_PRICE_USDC * count;
        }
        uint256 pricePerUnit = BASE_PRICE_USDC
            + ((MAX_PRICE_USDC - BASE_PRICE_USDC) * (diff - SURGE_START))
            / (SURGE_END - SURGE_START);
        return pricePerUnit * count;
    }

    /// @inheritdoc ITreasury
    function getKillPot(uint8 laneId, uint8 faction) external view override returns (uint256) {
        return killPot[laneId][faction];
    }

    // ═══════════════════════════════════════════
    //          KILL REWARD DISTRIBUTION
    // ═══════════════════════════════════════════

    /// @inheritdoc ITreasury
    function distributeKillReward(
        uint8 laneId,
        uint8 loser,
        address[] calldata winners,
        uint256[] calldata shares
    ) external override onlyGameEngine {
        require(winners.length == shares.length, "Length mismatch");
        require(winners.length > 0, "No winners");

        uint256 pot = killPot[laneId][loser];
        if (pot == 0) return;

        // Compute total shares
        uint256 totalShares;
        for (uint256 i = 0; i < shares.length;) {
            totalShares += shares[i];
            unchecked { ++i; }
        }
        if (totalShares == 0) return;

        // Distribute proportionally
        uint256 distributed;
        for (uint256 i = 0; i < winners.length;) {
            unchecked {
                uint256 reward = (pot * shares[i]) / totalShares;
                pendingRewards[winners[i]] += reward;
                distributed += reward;
                ++i;
            }
        }

        // @dev Dust from integer division stays in killPot as rounding buffer.
        // Remaining dust is swept to seasonTreasury during finalizeSeason().
        killPot[laneId][loser] = pot - distributed;

        emit KillRewardDistributed(laneId, loser, distributed);
    }

    /// @inheritdoc ITreasury
    function distributePartialKillReward(
        uint8 laneId,
        uint8 fromFaction,
        address[] calldata recipients,
        uint256[] calldata shares,
        uint256 casualtiesRatioBps
    ) external override onlyGameEngine {
        require(recipients.length == shares.length, "Length mismatch");
        require(casualtiesRatioBps <= BPS_DENOM, "Invalid ratio");

        uint256 pot = killPot[laneId][fromFaction];
        if (pot == 0 || recipients.length == 0) return;

        uint256 portionToDistribute = (pot * casualtiesRatioBps) / BPS_DENOM;
        if (portionToDistribute == 0) return;

        // Compute total shares
        uint256 totalShares;
        for (uint256 i = 0; i < shares.length;) {
            totalShares += shares[i];
            unchecked { ++i; }
        }
        if (totalShares == 0) return;

        // Distribute proportionally
        uint256 distributed;
        for (uint256 i = 0; i < recipients.length;) {
            unchecked {
                uint256 reward = (portionToDistribute * shares[i]) / totalShares;
                pendingRewards[recipients[i]] += reward;
                distributed += reward;
                ++i;
            }
        }

        // Deduct from killPot
        killPot[laneId][fromFaction] -= distributed;

        emit PartialKillRewardDistributed(laneId, fromFaction, distributed, killPot[laneId][fromFaction]);
    }

    // ═══════════════════════════════════════════
    //          RETREAT & ATTRITION
    // ═══════════════════════════════════════════

    /// @inheritdoc ITreasury
    function refundRetreat(
        address player,
        uint256 totalRefund,
        uint8 laneId,
        uint8 faction,
        uint256 costPaid
    ) external override onlyGameEngine {
        // 70% of original cost came from killPot
        uint256 killPotPortion = (costPaid * SPLIT_KILL_REWARD) / BPS_DENOM;
        // Remaining refund comes from season treasury
        uint256 treasuryPortion = totalRefund - killPotPortion;

        // @dev Underflow guards: kill pot and season treasury may have less than expected
        // due to battle distributions or rounding dust. The deficit is absorbed by protocol
        // seed funds (initial USDC deposited via seedTreasury). This is a known design decision.
        if (killPotPortion <= killPot[laneId][faction]) {
            killPot[laneId][faction] -= killPotPortion;
        } else {
            killPotPortion = killPot[laneId][faction];
            killPot[laneId][faction] = 0;
            treasuryPortion = totalRefund - killPotPortion;
        }

        // Debit season treasury (with underflow guard)
        if (treasuryPortion <= seasonTreasury[currentSeasonId]) {
            seasonTreasury[currentSeasonId] -= treasuryPortion;
        } else {
            // If season treasury insufficient, debit what's available
            // The deficit is absorbed by the protocol (covered by seed funds)
            seasonTreasury[currentSeasonId] = 0;
        }

        // Credit player
        pendingRewards[player] += totalRefund;

        emit RetreatRefunded(player, totalRefund, laneId, faction);
    }

    /// @inheritdoc ITreasury
    function transferAttritionPotToTreasury(
        uint8 laneId,
        uint8 faction,
        uint256 amount
    ) external override onlyGameEngine {
        // Debit from killPot (underflow guard)
        if (amount <= killPot[laneId][faction]) {
            killPot[laneId][faction] -= amount;
        } else {
            amount = killPot[laneId][faction];
            killPot[laneId][faction] = 0;
        }

        // Credit to current season treasury
        seasonTreasury[currentSeasonId] += amount;

        emit AttritionPotTransferred(laneId, faction, amount);
    }

    // ═══════════════════════════════════════════
    //          SEASON LIFECYCLE
    // ═══════════════════════════════════════════

    /// @inheritdoc ITreasury
    function finalizeSeason(
        uint256 seasonId,
        uint256 totalHoldScore,
        uint8 winnerFaction,
        uint256[3] calldata laneHoldScores
    ) external override onlyGameEngine {
        require(!seasonResults[seasonId].finalized, "Already finalized");

        // Transfer remaining killPots to season treasury
        for (uint8 lane = 0; lane < 3;) {
            for (uint8 faction = 1; faction <= 2;) {
                uint256 remaining = killPot[lane][faction];
                if (remaining > 0) {
                    seasonTreasury[seasonId] += remaining;
                    killPot[lane][faction] = 0;
                }
                unchecked { ++faction; }
            }
            unchecked { ++lane; }
        }

        // Store season result with per-lane hold scores
        SeasonResult storage result = seasonResults[seasonId];
        result.finalized = true;
        result.winnerFaction = winnerFaction;
        result.totalHoldScore = totalHoldScore;
        result.treasuryBalance = seasonTreasury[seasonId];
        result.totalClaimed = 0;
        result.laneHoldScores[0] = laneHoldScores[0];
        result.laneHoldScores[1] = laneHoldScores[1];
        result.laneHoldScores[2] = laneHoldScores[2];

        emit SeasonFinalized(seasonId, winnerFaction, seasonTreasury[seasonId]);
    }

    /// @inheritdoc ITreasury
    function claim(uint256 seasonId) external override nonReentrant {
        SeasonResult storage result = seasonResults[seasonId];
        require(result.finalized, "Season not finalized");
        require(!hasClaimed[seasonId][msg.sender], "Already claimed");
        require(result.totalHoldScore > 0, "No hold score in season");

        // Per-lane distribution: treasury split equally across 3 lanes
        // Inactive lanes (0 total score) redistribute to active lanes
        IGameEngineExtended ge = IGameEngineExtended(address(gameEngine));

        uint256 lanePool = result.treasuryBalance / 3;
        uint8 activeLanes = 0;
        for (uint8 i = 0; i < 3; i++) {
            if (result.laneHoldScores[i] > 0) activeLanes++;
        }
        require(activeLanes > 0, "No hold score in season");

        // Redistribution: inactive lanes' shares go to active lanes
        uint256 redistribution = activeLanes < 3
            ? (lanePool * (3 - activeLanes)) / activeLanes
            : 0;

        uint256 totalShare;
        for (uint8 i = 0; i < 3; i++) {
            if (result.laneHoldScores[i] == 0) continue;
            uint128 playerLaneScore = ge.getPlayerLaneScore(seasonId, msg.sender, i);
            if (playerLaneScore == 0) continue;
            totalShare += ((lanePool + redistribution) * uint256(playerLaneScore)) / result.laneHoldScores[i];
        }
        require(totalShare > 0, "No contribution");

        // Mark claimed
        hasClaimed[seasonId][msg.sender] = true;
        result.totalClaimed += totalShare;

        // Credit to pending rewards (player withdraws via withdraw())
        pendingRewards[msg.sender] += totalShare;

        emit SeasonClaimed(seasonId, msg.sender, totalShare);
    }

    // ═══════════════════════════════════════════
    //          PLAYER: WITHDRAW
    // ═══════════════════════════════════════════

    /// @inheritdoc ITreasury
    function withdraw() external override nonReentrant {
        uint256 amount = pendingRewards[msg.sender];
        require(amount > 0, "Nothing to withdraw");

        pendingRewards[msg.sender] = 0;

        require(usdc.transfer(msg.sender, amount), "USDC transfer failed");

        emit Withdrawn(msg.sender, amount);
    }

    // ═══════════════════════════════════════════
    //          FUNDING
    // ═══════════════════════════════════════════

    /// @inheritdoc ITreasury
    function seedTreasury(uint256 seasonId, uint256 amount) external override {
        require(amount > 0, "Zero amount");
        require(usdc.transferFrom(msg.sender, address(this), amount), "USDC transfer failed");

        seasonTreasury[seasonId] += amount;

        emit TreasurySeeded(seasonId, amount);
    }

    /// @inheritdoc ITreasury
    function donate(uint256 seasonId, uint256 amount) external override {
        require(amount > 0, "Zero amount");
        require(usdc.transferFrom(msg.sender, address(this), amount), "USDC transfer failed");

        seasonTreasury[seasonId] += amount;

        emit TreasuryDonation(seasonId, msg.sender, amount);
    }

    /// @notice Creators withdraw accumulated fees.
    function withdrawCreators() external nonReentrant {
        require(msg.sender == creatorsWallet, "Not creators wallet");
        uint256 amount = creatorsBalance;
        require(amount > 0, "Nothing to withdraw");

        creatorsBalance = 0;
        require(usdc.transfer(creatorsWallet, amount), "USDC transfer failed");

        emit CreatorsWithdrawn(creatorsWallet, amount);
    }

    /// @notice Buyback wallet withdraws accumulated reserve.
    function withdrawBuyback() external nonReentrant {
        require(msg.sender == buybackWallet, "Not buyback wallet");
        uint256 amount = buybackReserve;
        require(amount > 0, "Nothing to withdraw");

        buybackReserve = 0;
        require(usdc.transfer(buybackWallet, amount), "USDC transfer failed");

        emit BuybackWithdrawn(buybackWallet, amount);
    }

    // ═══════════════════════════════════════════
    //        CHAINLINK VRF v2 INTEGRATION
    // ═══════════════════════════════════════════

    /// @notice Request a weather update via Chainlink VRF. Permissionless, but rate-limited.
    function requestWeatherUpdate() external {
        require(vrfCoordinator != address(0), "VRF not configured");
        require(
            block.timestamp >= lastWeatherUpdate + WEATHER_INTERVAL,
            "Weather cooldown active"
        );

        lastWeatherUpdate = block.timestamp;

        uint256 requestId = IVRFCoordinator(vrfCoordinator).requestRandomWords(
            vrfKeyHash,
            vrfSubscriptionId,
            vrfConfirmations,
            vrfCallbackGasLimit,
            1 // numWords
        );

        vrfRequestType[requestId] = 1; // weather

        emit WeatherRequested(requestId);
    }

    /// @notice Request a special event via Chainlink VRF. Permissionless, but rate-limited.
    function requestSpecialEvent() external {
        require(vrfCoordinator != address(0), "VRF not configured");
        require(
            block.timestamp >= lastEventTrigger + MIN_EVENT_COOLDOWN,
            "Event cooldown active"
        );

        lastEventTrigger = block.timestamp;

        uint256 requestId = IVRFCoordinator(vrfCoordinator).requestRandomWords(
            vrfKeyHash,
            vrfSubscriptionId,
            vrfConfirmations,
            vrfCallbackGasLimit,
            1 // numWords
        );

        vrfRequestType[requestId] = 2; // event

        emit SpecialEventRequested(requestId);
    }

    /// @notice Chainlink VRF v2 callback. Only callable by VRF coordinator.
    function rawFulfillRandomWords(uint256 requestId, uint256[] memory randomWords) external {
        require(msg.sender == vrfCoordinator, "Only VRF coordinator");
        require(randomWords.length > 0, "No random words");

        uint8 requestType = vrfRequestType[requestId];
        delete vrfRequestType[requestId];

        if (requestType == 1) {
            // Weather: map random to Weather enum (1=RAINY, 2=SUNNY, 3=FOGGY)
            uint256 weatherIndex = (randomWords[0] % 3) + 1;
            gameEngine.setWeather(Weather(weatherIndex));
        } else if (requestType == 2) {
            // Special event: map random to SpecialEvent enum (0=NONE, 1=EPIDEMIC, 2=HARVEST, 3=ECLIPSE)
            // 25% chance each — but NONE means no event this cycle
            uint256 eventIndex = randomWords[0] % 4;
            if (eventIndex > 0) {
                gameEngine.setSpecialEvent(SpecialEvent(eventIndex));
            }
            // eventIndex == 0 → no event triggered
        }
    }

    // ═══════════════════════════════════════════
    //              VIEW HELPERS
    // ═══════════════════════════════════════════

    /// @notice Check how much a player can withdraw.
    function getPendingRewards(address player) external view returns (uint256) {
        return pendingRewards[player];
    }

    /// @notice Check if a player has claimed season rewards.
    function getHasClaimed(uint256 seasonId, address player) external view returns (bool) {
        return hasClaimed[seasonId][player];
    }

    /// @notice Get season treasury balance.
    function getSeasonTreasury(uint256 seasonId) external view returns (uint256) {
        return seasonTreasury[seasonId];
    }
}

// ═══════════════════════════════════════════
//          MINIMAL INTERFACES
// ═══════════════════════════════════════════

/// @dev Extended GameEngine interface for hold score queries.
interface IGameEngineExtended is IGameEngine {
    function getPlayerHoldScore(uint256 seasonId, address player) external view returns (uint128);
    function getPlayerLaneScore(uint256 seasonId, address player, uint8 laneId) external view returns (uint128);
}

/// @dev Minimal Chainlink VRF v2 Coordinator interface.
interface IVRFCoordinator {
    function requestRandomWords(
        bytes32 keyHash,
        uint64 subId,
        uint16 minimumRequestConfirmations,
        uint32 callbackGasLimit,
        uint32 numWords
    ) external returns (uint256 requestId);
}
