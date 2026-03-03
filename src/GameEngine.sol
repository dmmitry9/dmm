// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {UnitType, Faction, Weather, SpecialEvent, Squad, BastionState, PlayerStats} from "./types/GameTypes.sol";
import {ITreasury} from "./interfaces/ITreasury.sol";
import {IGameEngine} from "./interfaces/IGameEngine.sol";
import {ISeasonNFT} from "./interfaces/ISeasonNFT.sol";

contract GameEngine is IGameEngine, Ownable, ReentrancyGuard {
    // ═══════════════════════════════════════════
    //                 CONSTANTS
    // ═══════════════════════════════════════════

    uint256 public constant SEGMENT_DURATION       = 1 minutes;  // 30x speed (was 30 min)
    uint256 public constant MARCH_DURATION         = 3 minutes;  // 30x speed (was 90 min)
    uint256 public constant ATTRITION_TICK         = 2 minutes;  // 30x speed: 2 min = 1 "hour" of attrition (was 1 hour)
    uint256 public constant WEATHER_INTERVAL       = 12 minutes; // 30x speed (was 6 hours)
    uint256 public constant SPECIAL_EVENT_DURATION = 8 minutes;  // 15x speed (was 2 hours)
    uint256 public constant SEASON_DURATION        = 20160;      // 30x speed: ~5.6h (was 7 days)
    uint8   public constant BASTION_SEGMENT        = 3;
    uint8   public constant PEPE_START_SEGMENT     = 0;
    uint8   public constant SHIB_START_SEGMENT     = 6;
    uint8   public constant NUM_LANES              = 3;

    // Combat multipliers (fixed-point ×1000)
    uint256 public constant RPS_WIN_MULT   = 1_800;
    uint256 public constant RPS_DENOM      = 1_000;
    uint256 public constant WEATHER_BONUS  = 1_200;
    uint256 public constant WEATHER_DENOM  = 1_000;

    // Economics (basis points, sum = 10000)
    uint256 public constant SPLIT_KILL_REWARD    = 7_000; // 70%
    uint256 public constant BPS_DENOM            = 10_000;

    // USDC pricing (6 decimals)
    uint256 public constant BASE_PRICE_USDC = 5_000_000;  // $5
    uint256 public constant MAX_PRICE_USDC  = 7_000_000;  // $7

    // Attrition table: 0.96^h × 10000 for h=0..168, encoded as 2-byte big-endian
    bytes public constant ATTRITION_DATA = hex"2710"  // h=0: 10000
        hex"2580" hex"2400" hex"228F" hex"212D" hex"1FDA" hex"1E94" hex"1D5A"  // h=1-7
        hex"1C2D" hex"1B0D" hex"19F8" hex"18EE" hex"17EF" hex"16FA" hex"160F" hex"152D"  // h=8-15
        hex"1454" hex"1384" hex"12BC" hex"11FC" hex"1144" hex"1093" hex"0FE9" hex"0F46"  // h=16-23
        hex"0EAA" hex"0E14" hex"0D84" hex"0CF9" hex"0C75" hex"0BF5" hex"0B7B" hex"0B05"  // h=24-31
        hex"0A94" hex"0A27" hex"09BF" hex"095B" hex"08FB" hex"089F" hex"0847" hex"07F2"  // h=32-39
        hex"07A1" hex"0753" hex"0708" hex"06C0" hex"067B" hex"0639" hex"05F9" hex"05BC"  // h=40-47
        hex"0581" hex"0549" hex"0513" hex"04DF" hex"04AD" hex"047D" hex"044F" hex"0423"  // h=48-55
        hex"03F9" hex"03D0" hex"03A9" hex"0384" hex"0360" hex"033D" hex"031C" hex"02FC"  // h=56-63
        hex"02DD" hex"02C0" hex"02A4" hex"0289" hex"026F" hex"0256" hex"023E" hex"0227"  // h=64-71
        hex"0210" hex"01FB" hex"01E7" hex"01D3" hex"01C1" hex"01AF" hex"019E" hex"018D"  // h=72-79
        hex"017D" hex"016E" hex"015F" hex"0151" hex"0144" hex"0137" hex"012A" hex"011E"  // h=80-87
        hex"0113" hex"0108" hex"00FD" hex"00F3" hex"00E9" hex"00E0" hex"00D7" hex"00CE"  // h=88-95
        hex"00C6" hex"00BE" hex"00B7" hex"00AF" hex"00A8" hex"00A1" hex"009B" hex"0095"  // h=96-103
        hex"008F" hex"0089" hex"0084" hex"007E" hex"0079" hex"0075" hex"0070" hex"006B"  // h=104-111
        hex"0067" hex"0063" hex"005F" hex"005B" hex"0057" hex"0054" hex"0050" hex"004D"  // h=112-119
        hex"004A" hex"0047" hex"0044" hex"0042" hex"003F" hex"003D" hex"003A" hex"0038"  // h=120-127
        hex"0036" hex"0034" hex"0032" hex"0030" hex"002E" hex"002C" hex"002A" hex"0028"  // h=128-135
        hex"0027" hex"0025" hex"0024" hex"0022" hex"0021" hex"0020" hex"001E" hex"001D"  // h=136-143
        hex"001C" hex"001B" hex"001A" hex"0019" hex"0018" hex"0017" hex"0016" hex"0015"  // h=144-151
        hex"0014" hex"0013" hex"0012" hex"0012" hex"0011" hex"0010" hex"0010" hex"000F"  // h=152-159
        hex"000E" hex"000E" hex"000D" hex"000D" hex"000C" hex"000C" hex"000B" hex"000B"  // h=160-167
        hex"000A";  // h=168

    // ═══════════════════════════════════════════
    //                  EVENTS
    // ═══════════════════════════════════════════

    event UnitsDeployed(
        uint256 indexed squadId, address indexed owner, Faction faction,
        uint8 laneId, UnitType unitType, uint32 count, uint256 cost
    );
    event SquadArrived(uint256 indexed squadId, uint8 laneId);
    event BattleResolved(
        uint8 indexed laneId, Faction winner,
        uint256 totalSurvivors, uint256 winnerPot, uint256 loserEarned
    );
    event BattleDetails(
        uint8 indexed laneId,
        uint256 pepeUnitsStart, uint256 shibUnitsStart,
        uint256 pepeCombat, uint256 shibCombat
    );
    event SeasonStarted(uint256 indexed seasonId, uint256 startTime);
    event SeasonEnded(uint256 indexed seasonId, Faction winner);
    event WeatherChanged(Weather weather);
    event SpecialEventStarted(SpecialEvent evt, uint256 endsAt);
    event HoldScoreUpdated(uint8 laneId, uint128 scorePEPE, uint128 scoreSHIB);
    event ZombieCleaned(uint256 indexed squadId, uint256 attritionPotReturned);

    // ═══════════════════════════════════════════
    //                  STORAGE
    // ═══════════════════════════════════════════

    ITreasury  public treasury;
    ISeasonNFT public seasonNFT;
    IERC20     public usdc;

    uint256 public currentSeasonId;
    uint256 public seasonStartTime;
    bool    public seasonActive;

    uint256 public nextSquadId; // starts at 1

    mapping(uint256 => Squad) public squads;
    mapping(uint256 => uint256[]) public bastionSquads;  // laneId → [squadId]
    mapping(uint256 => uint256[]) public marchingSquads; // laneId → [squadId]

    BastionState[3] public bastions;
    mapping(uint256 => mapping(address => PlayerStats)) public playerStats; // seasonId => player => stats
    mapping(uint256 => mapping(address => uint128[3])) public playerLaneScores; // seasonId => player => per-lane scores

    uint256 public totalUnitsPEPE;
    uint256 public totalUnitsSHIB;

    Weather      public currentWeather;
    uint256      public weatherSetAt;
    SpecialEvent public currentSpecialEvent;
    uint256      public specialEventEndsAt;

    mapping(address => Faction) public playerFaction; // locked per season
    mapping(address => uint256) public playerFactionSeason; // season when faction was set

    // ═══════════════════════════════════════════
    //                 MODIFIERS
    // ═══════════════════════════════════════════

    modifier onlyTreasury() {
        require(msg.sender == address(treasury), "Only treasury");
        _;
    }

    modifier onlySeason() {
        require(seasonActive, "No active season");
        require(block.timestamp < seasonStartTime + SEASON_DURATION, "Season expired");
        _;
    }

    // ═══════════════════════════════════════════
    //               CONSTRUCTOR
    // ═══════════════════════════════════════════

    constructor(address _usdc, address _treasury, address _seasonNFT) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
        treasury = ITreasury(_treasury);
        if (_seasonNFT != address(0)) {
            seasonNFT = ISeasonNFT(_seasonNFT);
        }
        nextSquadId = 1;
    }

    /// @notice Set SeasonNFT address (for circular deployment).
    function setSeasonNFT(address _seasonNFT) external onlyOwner {
        require(_seasonNFT != address(0), "Invalid address");
        seasonNFT = ISeasonNFT(_seasonNFT);
    }

    // ═══════════════════════════════════════════
    //              VIEW FUNCTIONS
    // ═══════════════════════════════════════════

    /// @notice Lazy-compute the current segment position of a squad (0..6).
    function getSquadSegment(uint256 squadId) public view returns (uint8) {
        Squad storage s = squads[squadId];
        require(s.active && s.seasonId == currentSeasonId, "Invalid squad");

        if (s.bastionEnteredAt > 0) return BASTION_SEGMENT;

        uint256 elapsed = block.timestamp - s.deployedAt;
        uint256 steps = elapsed / SEGMENT_DURATION;
        if (steps > 3) steps = 3;

        if (s.faction == Faction.PEPE) {
            return uint8(PEPE_START_SEGMENT + steps); // 0→1→2→3
        } else {
            return uint8(SHIB_START_SEGMENT - steps); // 6→5→4→3
        }
    }

    /// @notice Lazy-compute effective units after attrition.
    function getEffectiveUnits(uint256 squadId) public view returns (uint256) {
        Squad storage s = squads[squadId];
        if (!s.active || s.seasonId != currentSeasonId) return 0;

        // Attrition start = max(bastionEnteredAt, deployedAt + MARCH_DURATION)
        // If not arrived yet, attrition starts from computed arrival time (anti-exploit)
        uint256 attritionStart;
        if (s.bastionEnteredAt > 0) {
            attritionStart = s.bastionEnteredAt;
        } else {
            attritionStart = s.deployedAt + MARCH_DURATION;
        }

        if (block.timestamp <= attritionStart) {
            return s.initialCount; // Still marching, no decay
        }

        uint256 hoursInBastion = (block.timestamp - attritionStart) / ATTRITION_TICK;

        // Apply special event modifier
        if (currentSpecialEvent == SpecialEvent.EPIDEMIC && block.timestamp < specialEventEndsAt) {
            hoursInBastion = hoursInBastion * 2;
        } else if (currentSpecialEvent == SpecialEvent.HARVEST && block.timestamp < specialEventEndsAt) {
            hoursInBastion = hoursInBastion / 2;
        }

        // Clamp to table max
        if (hoursInBastion > 168) hoursInBastion = 168;

        uint256 attritionMult = _getAttrition(hoursInBastion);
        return (uint256(s.initialCount) * attritionMult) / 10_000;
    }

    function _getEffectiveUnitsFromRef(Squad storage s) internal view returns (uint256) {
        if (!s.active || s.seasonId != currentSeasonId) return 0;

        uint256 attritionStart;
        if (s.bastionEnteredAt > 0) {
            attritionStart = s.bastionEnteredAt;
        } else {
            attritionStart = s.deployedAt + MARCH_DURATION;
        }

        if (block.timestamp <= attritionStart) {
            return s.initialCount;
        }

        uint256 hoursInBastion = (block.timestamp - attritionStart) / ATTRITION_TICK;

        if (currentSpecialEvent == SpecialEvent.EPIDEMIC && block.timestamp < specialEventEndsAt) {
            hoursInBastion = hoursInBastion * 2;
        } else if (currentSpecialEvent == SpecialEvent.HARVEST && block.timestamp < specialEventEndsAt) {
            hoursInBastion = hoursInBastion / 2;
        }

        if (hoursInBastion > 168) hoursInBastion = 168;

        uint256 attritionMult = _getAttrition(hoursInBastion);
        return (uint256(s.initialCount) * attritionMult) / 10_000;
    }

    /// @notice Get current (unfixed) hold scores for a lane. Includes delta since last update.
    /// @param laneId Lane to query (0–2).
    /// @return pepe Cumulative PEPE hold score (units × minutes).
    /// @return shib Cumulative SHIB hold score (units × minutes).
    function getHoldScore(uint8 laneId) external view returns (uint128 pepe, uint128 shib) {
        BastionState storage b = bastions[laneId];
        pepe = b.holdScorePEPE;
        shib = b.holdScoreSHIB;

        // Add unfixed score since last update (use live contested check, not stale flag)
        if (b.lastHoldScoreUpdate > 0) {
            (uint256 pepeUnits, uint256 shibUnits) = _countBastionUnits(laneId);
            bool currentlyContested = pepeUnits > 0 && shibUnits > 0;
            if (!currentlyContested) {
                uint256 minutesDelta = (block.timestamp - b.lastHoldScoreUpdate) / 1 minutes;
                if (minutesDelta > 0) {
                    pepe += uint128(pepeUnits * minutesDelta);
                    shib += uint128(shibUnits * minutesDelta);
                }
            }
        }
    }

    /// @notice Get the number of squads currently in a bastion.
    /// @param laneId Lane to query (0–2).
    /// @return The number of squads in the bastion array (may include inactive entries).
    function getBastionSquadCount(uint8 laneId) external view returns (uint256) {
        return bastionSquads[laneId].length;
    }

    /// @notice Get the length of marchingSquads for a lane.
    function getMarchingSquadCount(uint8 laneId) external view returns (uint256) {
        return marchingSquads[laneId].length;
    }

    /// @notice Get a player's hold score contribution for a specific season.
    /// @dev    Used by Treasury.claim() to compute player's share of season rewards.
    function getPlayerHoldScore(uint256 seasonId, address player) external view returns (uint128) {
        return playerStats[seasonId][player].holdScoreContrib;
    }

    /// @notice Get a player's hold score contribution for a specific season and lane.
    function getPlayerLaneScore(uint256 seasonId, address player, uint8 laneId) external view returns (uint128) {
        require(laneId < NUM_LANES, "Invalid lane");
        return playerLaneScores[seasonId][player][laneId];
    }

    // ═══════════════════════════════════════════
    //            EXTERNAL FUNCTIONS
    // ═══════════════════════════════════════════

    /// @notice Deploy a squad of units to a lane. Charges USDC via dynamic pricing.
    /// @param laneId Target lane (0–2).
    /// @param unitType Type of unit (SWORDSMAN, SPEARMAN, CAVALRY). Determines RPS combat multiplier.
    /// @param faction Faction to deploy for (PEPE or SHIB). Locked per player per season.
    /// @param count Number of units in the squad.
    function deployUnits(
        uint8 laneId,
        UnitType unitType,
        Faction faction,
        uint32 count
    ) external nonReentrant onlySeason {
        require(count > 0, "Zero units");
        require(laneId < NUM_LANES, "Invalid lane");
        require(unitType != UnitType.NONE, "Invalid unit type");
        require(faction == Faction.PEPE || faction == Faction.SHIB, "Invalid faction");

        _updateHoldScore(laneId);
        _processArrivals(laneId);

        // Lock player to faction for this season (reset each season)
        if (playerFactionSeason[msg.sender] != currentSeasonId) {
            playerFaction[msg.sender] = faction;
            playerFactionSeason[msg.sender] = currentSeasonId;
        } else {
            require(playerFaction[msg.sender] == faction, "Faction locked");
        }

        // Update total units BEFORE price computation (prevents batch underpricing)
        if (faction == Faction.PEPE) {
            totalUnitsPEPE += count;
        } else {
            totalUnitsSHIB += count;
        }

        // Compute price (uses updated totals to prevent dominant-side batching discount)
        uint256 cost = treasury.getUnitPrice(
            uint8(faction), count, totalUnitsPEPE, totalUnitsSHIB
        );

        // Transfer USDC: player → treasury
        require(usdc.transferFrom(msg.sender, address(treasury), cost), "USDC transfer failed");

        // Record in treasury (splits into killPot, treasury, etc.)
        treasury.recordDeployment(msg.sender, cost, uint8(faction), laneId, currentSeasonId);

        // Create squad
        uint256 squadId = nextSquadId++;
        squads[squadId] = Squad({
            owner: msg.sender,
            laneId: laneId,
            unitType: unitType,
            faction: faction,
            active: true,
            deployedAt: uint40(block.timestamp),
            bastionEnteredAt: 0,
            initialCount: count,
            originalCount: count,
            costPaid: uint96(cost),
            seasonId: uint32(currentSeasonId)
        });

        marchingSquads[laneId].push(squadId);

        // Update player stats
        playerStats[currentSeasonId][msg.sender].usdcSpent += uint128(cost);

        emit UnitsDeployed(squadId, msg.sender, faction, laneId, unitType, count, cost);
    }

    /// @notice Deploy a mixed squad of up to 3 unit types in a single transaction.
    /// Creates 1–3 separate squads (one per non-zero count), but batches pricing,
    /// USDC transfer, and treasury recording into one atomic operation.
    /// @param laneId Target lane (0–2).
    /// @param faction Faction to deploy for (PEPE or SHIB). Locked per player per season.
    /// @param swordsmanCount Number of Swordsman units.
    /// @param spearmanCount Number of Spearman units.
    /// @param cavalryCount Number of Cavalry units.
    function deployMixedUnits(
        uint8 laneId,
        Faction faction,
        uint32 swordsmanCount,
        uint32 spearmanCount,
        uint32 cavalryCount
    ) external nonReentrant onlySeason {
        uint32 totalCount = swordsmanCount + spearmanCount + cavalryCount;
        require(totalCount > 0, "Zero units");
        require(laneId < NUM_LANES, "Invalid lane");
        require(faction == Faction.PEPE || faction == Faction.SHIB, "Invalid faction");

        _updateHoldScore(laneId);
        _processArrivals(laneId);

        // Lock player to faction for this season (reset each season)
        if (playerFactionSeason[msg.sender] != currentSeasonId) {
            playerFaction[msg.sender] = faction;
            playerFactionSeason[msg.sender] = currentSeasonId;
        } else {
            require(playerFaction[msg.sender] == faction, "Faction locked");
        }

        // Update total units BEFORE price computation (prevents batch underpricing)
        if (faction == Faction.PEPE) {
            totalUnitsPEPE += totalCount;
        } else {
            totalUnitsSHIB += totalCount;
        }

        // Compute price for ALL units at once (same faction → same price per unit)
        uint256 cost = treasury.getUnitPrice(
            uint8(faction), totalCount, totalUnitsPEPE, totalUnitsSHIB
        );

        // Single USDC transfer: player → treasury
        require(usdc.transferFrom(msg.sender, address(treasury), cost), "USDC transfer failed");

        // Single treasury recording (splits into killPot, treasury, etc.)
        treasury.recordDeployment(msg.sender, cost, uint8(faction), laneId, currentSeasonId);

        // Update player stats once
        playerStats[currentSeasonId][msg.sender].usdcSpent += uint128(cost);

        // Create individual squads for each non-zero unit type
        uint32[3] memory counts = [swordsmanCount, spearmanCount, cavalryCount];
        UnitType[3] memory types = [UnitType.SWORDSMAN, UnitType.SPEARMAN, UnitType.CAVALRY];

        for (uint8 i = 0; i < 3;) {
            if (counts[i] > 0) {
                uint256 squadCost = (cost * counts[i]) / totalCount;
                uint256 squadId = nextSquadId++;
                squads[squadId] = Squad({
                    owner: msg.sender,
                    laneId: laneId,
                    unitType: types[i],
                    faction: faction,
                    active: true,
                    deployedAt: uint40(block.timestamp),
                    bastionEnteredAt: 0,
                    initialCount: counts[i],
                    originalCount: counts[i],
                    costPaid: uint96(squadCost),
                    seasonId: uint32(currentSeasonId)
                });

                marchingSquads[laneId].push(squadId);

                emit UnitsDeployed(squadId, msg.sender, faction, laneId, types[i], counts[i], squadCost);
            }
            unchecked { ++i; }
        }
    }

    /// @notice Public trigger for battle resolution. Permissionless.
    /// @param laneId Lane to resolve (0–2). Requires both factions present.
    function resolveBattle(uint8 laneId) external nonReentrant onlySeason {
        require(laneId < NUM_LANES, "Invalid lane");
        _updateHoldScore(laneId);
        _processArrivals(laneId);
        require(_hasBothFactions(laneId), "No battle needed");
        _resolveBattle(laneId);
    }

    /// @notice Permissionless: refresh hold scores for a lane. Cleans zombie squads.
    /// @param laneId Lane to refresh (0–2).
    function refreshHoldScore(uint8 laneId) external {
        require(laneId < NUM_LANES, "Invalid lane");
        _updateHoldScore(laneId);
        _processArrivals(laneId);
    }

    /// @notice Permissionless: refresh all lanes in one transaction.
    function refreshAllLanes() external {
        for (uint8 i = 0; i < NUM_LANES; i++) {
            _updateHoldScore(i);
            _processArrivals(i);
        }
    }

    /// @notice Permissionless: clean zombie marching squads for a lane.
    /// @param laneId Lane to clean (0–2).
    function cleanupMarchingZombies(uint8 laneId) external {
        require(laneId < NUM_LANES, "Invalid lane");
        uint256[] storage ids = marchingSquads[laneId];
        uint256 i = 0;
        uint256 len = ids.length;
        while (i < len) {
            uint256 sid = ids[i];
            Squad storage s = squads[sid];
            if (!s.active || s.seasonId != currentSeasonId) {
                ids[i] = ids[len - 1];
                ids.pop();
                unchecked { --len; }
                continue;
            }
            uint256 eff = _getEffectiveUnitsFromRef(s);
            if (eff == 0) {
                uint256 fullKillPot = (uint256(s.costPaid) * SPLIT_KILL_REWARD) / BPS_DENOM;
                uint256 attritionPot = s.originalCount > 0 ? (fullKillPot * uint256(s.initialCount)) / uint256(s.originalCount) : fullKillPot;
                s.active = false;
                if (s.faction == Faction.PEPE) {
                    if (s.initialCount <= totalUnitsPEPE) totalUnitsPEPE -= s.initialCount;
                    else totalUnitsPEPE = 0;
                } else {
                    if (s.initialCount <= totalUnitsSHIB) totalUnitsSHIB -= s.initialCount;
                    else totalUnitsSHIB = 0;
                }
                treasury.transferAttritionPotToTreasury(laneId, uint8(s.faction), attritionPot);
                emit ZombieCleaned(sid, attritionPot);
                ids[i] = ids[len - 1];
                ids.pop();
                unchecked { --len; }
                continue;
            }
            unchecked { ++i; }
        }
    }

    // ═══════════════════════════════════════════
    //          TREASURY-ONLY FUNCTIONS
    // ═══════════════════════════════════════════

    /// @notice Set the current weather. Called by Treasury via VRF callback.
    /// @param weather The new weather state.
    function setWeather(Weather weather) external override onlyTreasury {
        currentWeather = weather;
        weatherSetAt = block.timestamp;
        emit WeatherChanged(weather);
    }

    /// @notice Set a special event. Called by Treasury via VRF callback. Lasts SPECIAL_EVENT_DURATION.
    /// @param evt The special event type (EPIDEMIC, HARVEST, ECLIPSE).
    function setSpecialEvent(SpecialEvent evt) external override onlyTreasury {
        // Snapshot all bastions before event change to lock in attrition
        for (uint8 i = 0; i < NUM_LANES; i++) {
            _updateHoldScore(i);
            _processArrivals(i);
        }
        currentSpecialEvent = evt;
        specialEventEndsAt = block.timestamp + SPECIAL_EVENT_DURATION;
        emit SpecialEventStarted(evt, specialEventEndsAt);
    }

    // ═══════════════════════════════════════════
    //     PERMISSIONLESS WEATHER/EVENT ROLLS
    // ═══════════════════════════════════════════

    /// @notice Permissionless weather roll. Uses blockhash pseudo-randomness. Rate-limited.
    function rollWeather() external onlySeason {
        require(block.timestamp >= weatherSetAt + WEATHER_INTERVAL, "Weather cooldown");
        uint256 rand = uint256(keccak256(abi.encodePacked(blockhash(block.number - 1), block.timestamp)));
        Weather w = Weather((rand % 3) + 1); // RAINY=1, SUNNY=2, FOGGY=3
        currentWeather = w;
        weatherSetAt = block.timestamp;
        emit WeatherChanged(w);
    }

    /// @notice Permissionless special event roll. Uses blockhash pseudo-randomness. Rate-limited.
    function rollSpecialEvent() external onlySeason {
        require(block.timestamp >= specialEventEndsAt, "Event still active");
        // Snapshot all bastions before event change to lock in attrition
        for (uint8 i = 0; i < NUM_LANES; i++) {
            _updateHoldScore(i);
            _processArrivals(i);
        }
        uint256 rand = uint256(keccak256(abi.encodePacked(blockhash(block.number - 1), block.timestamp, msg.sender)));
        uint256 eventIndex = rand % 4; // 25% each: NONE, EPIDEMIC, HARVEST, ECLIPSE
        if (eventIndex == 0) {
            currentSpecialEvent = SpecialEvent.NONE;
        } else {
            currentSpecialEvent = SpecialEvent(eventIndex);
            specialEventEndsAt = block.timestamp + SPECIAL_EVENT_DURATION;
            emit SpecialEventStarted(currentSpecialEvent, specialEventEndsAt);
        }
    }

    // ═══════════════════════════════════════════
    //           SEASON MANAGEMENT
    // ═══════════════════════════════════════════

    /// @notice End the current season. Permissionless — anyone can call after duration expires.
    function endSeason() external {
        require(seasonActive, "No active season");
        require(block.timestamp >= seasonStartTime + SEASON_DURATION, "Too early");

        seasonActive = false;

        // Determine winner by total hold score across all 3 bastions
        uint256 pepeTotal;
        uint256 shibTotal;
        uint256[3] memory laneHoldScores;
        for (uint8 i = 0; i < NUM_LANES; i++) {
            _updateHoldScore(i);
            _processArrivals(i);
            laneHoldScores[i] = uint256(bastions[i].holdScorePEPE) + uint256(bastions[i].holdScoreSHIB);
            pepeTotal += bastions[i].holdScorePEPE;
            shibTotal += bastions[i].holdScoreSHIB;
        }

        Faction winner;
        if (pepeTotal > shibTotal) {
            winner = Faction.PEPE;
        } else if (shibTotal > pepeTotal) {
            winner = Faction.SHIB;
        } else {
            winner = (currentSeasonId % 2 == 1) ? Faction.PEPE : Faction.SHIB;
        }

        uint256 totalHoldScore = pepeTotal + shibTotal;
        treasury.finalizeSeason(currentSeasonId, totalHoldScore, uint8(winner), laneHoldScores);

        emit SeasonEnded(currentSeasonId, winner);
    }

    /// @notice Owner-only: skip a stuck season (e.g. Treasury already finalized this seasonId).
    function skipSeason() external onlyOwner {
        require(seasonActive, "No active season");
        seasonActive = false;
        emit SeasonEnded(currentSeasonId, Faction.PEPE);
    }

    /// @notice Bootstrap season 1. Owner-only.
    function startSeason() external onlyOwner {
        require(!seasonActive, "Season already active");

        currentSeasonId++;
        seasonStartTime = block.timestamp;
        seasonActive = true;

        totalUnitsPEPE = 0;
        totalUnitsSHIB = 0;
        currentWeather = Weather.NONE;
        currentSpecialEvent = SpecialEvent.NONE;

        for (uint8 i = 0; i < NUM_LANES; i++) {
            delete bastionSquads[i];
            delete marchingSquads[i];
            bastions[i] = BastionState(0, false, 0, 0);
        }

        emit SeasonStarted(currentSeasonId, seasonStartTime);
    }

    /// @notice Start the next season. Permissionless — anyone can call after season ended.
    function startNextSeason() external {
        require(!seasonActive, "Season already active");

        currentSeasonId++;
        seasonStartTime = block.timestamp;
        seasonActive = true;

        totalUnitsPEPE = 0;
        totalUnitsSHIB = 0;
        currentWeather = Weather.NONE;
        currentSpecialEvent = SpecialEvent.NONE;

        for (uint8 i = 0; i < NUM_LANES; i++) {
            delete bastionSquads[i];
            delete marchingSquads[i];
            bastions[i] = BastionState(0, false, 0, 0);
        }

        emit SeasonStarted(currentSeasonId, seasonStartTime);
    }

    // ═══════════════════════════════════════════
    //          INTERNAL: BATTLE RESOLUTION
    // ═══════════════════════════════════════════

    function _resolveBattle(uint8 laneId) internal {
        // Phase 0: Fix hold scores before battle
        _updateHoldScore(laneId);

        uint256[] storage bSquads = bastionSquads[laneId];
        uint256 len = bSquads.length;
        if (len == 0) return;

        // Separate into factions and compute effective units
        uint256[] memory pepeIds = new uint256[](len);
        uint256[] memory shibIds = new uint256[](len);
        uint256[] memory pepeEffective = new uint256[](len);
        uint256[] memory shibEffective = new uint256[](len);
        uint256 pepeCount;
        uint256 shibCount;

        for (uint256 i = 0; i < len;) {
            uint256 sid = bSquads[i];
            Squad storage sq = squads[sid];
            if (!sq.active || sq.seasonId != currentSeasonId) {
                unchecked { ++i; }
                continue;
            }
            uint256 eff = _getEffectiveUnitsFromRef(sq);
            if (sq.faction == Faction.PEPE) {
                pepeIds[pepeCount] = sid;
                pepeEffective[pepeCount] = eff;
                unchecked { ++pepeCount; }
            } else {
                shibIds[shibCount] = sid;
                shibEffective[shibCount] = eff;
                unchecked { ++shibCount; }
            }
            unchecked { ++i; }
        }

        // Guard: need both sides
        if (pepeCount == 0 || shibCount == 0) {
            // Check for zombie cleanup on both sides
            _cleanupZombiesInBattle(laneId, pepeIds, pepeEffective, pepeCount);
            _cleanupZombiesInBattle(laneId, shibIds, shibEffective, shibCount);
            _compactBastionSquads(laneId);
            return;
        }

        // Phase 1: Count units by type for each faction
        uint256[4] memory pepeTypeUnits; // indexed by UnitType
        uint256[4] memory shibTypeUnits;
        uint256 pepeTotalUnits;
        uint256 shibTotalUnits;

        for (uint256 i = 0; i < pepeCount;) {
            uint256 ut = uint256(squads[pepeIds[i]].unitType);
            pepeTypeUnits[ut] += pepeEffective[i];
            pepeTotalUnits += pepeEffective[i];
            unchecked { ++i; }
        }
        for (uint256 i = 0; i < shibCount;) {
            uint256 ut = uint256(squads[shibIds[i]].unitType);
            shibTypeUnits[ut] += shibEffective[i];
            shibTotalUnits += shibEffective[i];
            unchecked { ++i; }
        }

        // Guard: both sides must have non-zero effective units
        if (pepeTotalUnits == 0 && shibTotalUnits == 0) {
            _cleanupZombiesInBattle(laneId, pepeIds, pepeEffective, pepeCount);
            _cleanupZombiesInBattle(laneId, shibIds, shibEffective, shibCount);
            _compactBastionSquads(laneId);
            return;
        }
        if (pepeTotalUnits == 0 || shibTotalUnits == 0) {
            _cleanupZombiesInBattle(laneId, pepeIds, pepeEffective, pepeCount);
            _cleanupZombiesInBattle(laneId, shibIds, shibEffective, shibCount);
            _compactBastionSquads(laneId);
            return;
        }

        // Phase 1b: Compute squad powers
        uint256 pepeCombatPower;
        uint256 shibCombatPower;
        uint256[] memory pepePower = new uint256[](pepeCount);
        uint256[] memory shibPower = new uint256[](shibCount);

        bool isEclipse = currentSpecialEvent == SpecialEvent.ECLIPSE
            && block.timestamp < specialEventEndsAt;

        for (uint256 i = 0; i < pepeCount;) {
            uint256 rpsAvg = isEclipse
                ? RPS_DENOM
                : _weightedRPS(squads[pepeIds[i]].unitType, shibTypeUnits, shibTotalUnits);
            uint256 wMult = _getWeatherMultiplier(squads[pepeIds[i]].unitType);
            pepePower[i] = (pepeEffective[i] * wMult * rpsAvg) / 1_000_000;
            pepeCombatPower += pepePower[i];
            unchecked { ++i; }
        }
        for (uint256 i = 0; i < shibCount;) {
            uint256 rpsAvg = isEclipse
                ? RPS_DENOM
                : _weightedRPS(squads[shibIds[i]].unitType, pepeTypeUnits, pepeTotalUnits);
            uint256 wMult = _getWeatherMultiplier(squads[shibIds[i]].unitType);
            shibPower[i] = (shibEffective[i] * wMult * rpsAvg) / 1_000_000;
            shibCombatPower += shibPower[i];
            unchecked { ++i; }
        }

        emit BattleDetails(laneId, pepeTotalUnits, shibTotalUnits, pepeCombatPower, shibCombatPower);

        // Phase 2: Determine winner
        bool pepeWins;
        if (pepeCombatPower > shibCombatPower) {
            pepeWins = true;
        } else if (shibCombatPower > pepeCombatPower) {
            pepeWins = false;
        } else {
            // Tie-break: earliest bastionEnteredAt (skip zombies with 0 effective units)
            uint40 pepeMinArrival = _minArrivalAlive(pepeIds, pepeEffective, pepeCount);
            uint40 shibMinArrival = _minArrivalAlive(shibIds, shibEffective, shibCount);
            if (pepeMinArrival < shibMinArrival) {
                pepeWins = true;
            } else if (shibMinArrival < pepeMinArrival) {
                pepeWins = false;
            } else {
                // Secondary tie-break: actual min squadId among alive squads
                uint256 pepeMinId = _minSquadIdAlive(pepeIds, pepeEffective, pepeCount);
                uint256 shibMinId = _minSquadIdAlive(shibIds, shibEffective, shibCount);
                pepeWins = pepeMinId < shibMinId;
            }
        }

        // Phase 3: Compute survival ratio
        // @dev Safe unchecked: winnerPower > loserPower guaranteed by Phase 2 winner determination.
        // winnerPower > 0 guaranteed because both factions must have > 0 units to enter battle.
        uint256 winnerPower = pepeWins ? pepeCombatPower : shibCombatPower;
        uint256 loserPower  = pepeWins ? shibCombatPower : pepeCombatPower;
        uint256 survivalBps;
        unchecked { survivalBps = ((winnerPower - loserPower) * BPS_DENOM) / winnerPower; }

        uint256[] memory winIds  = pepeWins ? pepeIds : shibIds;
        uint256[] memory losIds  = pepeWins ? shibIds : pepeIds;
        uint256[] memory winEff  = pepeWins ? pepeEffective : shibEffective;
        uint256[] memory losEff  = pepeWins ? shibEffective : pepeEffective;
        uint256 winCount = pepeWins ? pepeCount : shibCount;
        uint256 losCount = pepeWins ? shibCount : pepeCount;

        // Save winner initialCount totals BEFORE overwriting with survivors
        uint256 winnerOldInitialTotal;
        for (uint256 i = 0; i < winCount;) {
            winnerOldInitialTotal += squads[winIds[i]].initialCount;
            unchecked { ++i; }
        }

        // Apply survivors to winner squads
        uint256 totalSurvivors;
        uint256 maxPreBattleIdx;
        uint256 maxPreBattle;
        bool allZero = true;

        for (uint256 i = 0; i < winCount;) {
            uint256 survivors;
            unchecked { survivors = (winEff[i] * survivalBps) / BPS_DENOM; }
            if (survivors > 0) {
                allZero = false;
                Squad storage ws = squads[winIds[i]];
                ws.initialCount = uint32(survivors);
                ws.bastionEnteredAt = uint40(block.timestamp);
                totalSurvivors += survivors;
            } else {
                squads[winIds[i]].active = false;
            }
            if (winEff[i] > maxPreBattle) {
                maxPreBattle = winEff[i];
                maxPreBattleIdx = i;
            }
            unchecked { ++i; }
        }

        // Guarantee: if all winner squads got 0, assign 1 to strongest
        if (allZero && winCount > 0) {
            Squad storage strongest = squads[winIds[maxPreBattleIdx]];
            strongest.active = true;
            strongest.initialCount = 1;
            strongest.bastionEnteredAt = uint40(block.timestamp);
            totalSurvivors = 1;
        }

        // Phase 4: Deactivate all loser squads + update totalUnits
        Faction loserFaction = pepeWins ? Faction.SHIB : Faction.PEPE;
        Faction winnerFaction = pepeWins ? Faction.PEPE : Faction.SHIB;

        uint256 loserUnitsLost;
        for (uint256 i = 0; i < losCount;) {
            Squad storage ls = squads[losIds[i]];
            loserUnitsLost += ls.initialCount;
            ls.active = false;
            unchecked { ++i; }
        }

        // Update totalUnits for losers
        if (loserFaction == Faction.PEPE) {
            totalUnitsPEPE -= loserUnitsLost;
        } else {
            totalUnitsSHIB -= loserUnitsLost;
        }

        // Update totalUnits for winner casualties (using initialCount, not effectiveUnits)
        uint256 winnerLost = winnerOldInitialTotal - totalSurvivors;
        if (winnerFaction == Faction.PEPE) {
            if (winnerLost <= totalUnitsPEPE) totalUnitsPEPE -= winnerLost;
            else totalUnitsPEPE = 0;
        } else {
            if (winnerLost <= totalUnitsSHIB) totalUnitsSHIB -= winnerLost;
            else totalUnitsSHIB = 0;
        }

        // Phase 5: Kill rewards (bidirectional)
        // Read killPots BEFORE distribution for event emission
        uint256 winnerPot = treasury.getKillPot(laneId, uint8(loserFaction));
        uint256 winnerFactionKillPot = treasury.getKillPot(laneId, uint8(winnerFaction));
        uint256 casualtiesBps;
        unchecked { casualtiesBps = BPS_DENOM - survivalBps; }
        uint256 loserEarned = (winnerFactionKillPot * casualtiesBps) / BPS_DENOM;

        // Winner gets all of loser's killPot
        {
            address[] memory winAddrs = new address[](winCount);
            uint256[] memory winShares = new uint256[](winCount);
            for (uint256 i = 0; i < winCount;) {
                winAddrs[i] = squads[winIds[i]].owner;
                winShares[i] = winEff[i];
                unchecked { ++i; }
            }
            treasury.distributeKillReward(
                laneId, uint8(loserFaction), winAddrs, winShares
            );
        }

        // Loser gets partial winner killPot based on casualties
        {
            address[] memory losAddrs = new address[](losCount);
            uint256[] memory losShares = new uint256[](losCount);
            for (uint256 i = 0; i < losCount;) {
                losAddrs[i] = squads[losIds[i]].owner;
                losShares[i] = losEff[i];
                unchecked { ++i; }
            }
            treasury.distributePartialKillReward(
                laneId, uint8(winnerFaction), losAddrs, losShares, casualtiesBps
            );
        }

        // Phase 6: Update player stats
        // (simplified: detailed accounting in Treasury)

        // Phase 7: Compact and finalize
        _compactBastionSquads(laneId);
        bastions[laneId].lastHoldScoreUpdate = uint40(block.timestamp);
        bastions[laneId].contestedAtUpdate = false;

        emit BattleResolved(laneId, winnerFaction, totalSurvivors, winnerPot, loserEarned);
    }

    /// @notice Process all marching squads that have completed their march for a lane.
    function _processArrivals(uint8 laneId) internal {
        uint256[] storage ids = marchingSquads[laneId];
        uint256 i = 0;
        uint256 len = ids.length;
        while (i < len) {
            uint256 sid = ids[i];
            Squad storage s = squads[sid];
            if (!s.active || s.seasonId != currentSeasonId) {
                ids[i] = ids[len - 1];
                ids.pop();
                unchecked { --len; }
                continue;
            }
            if (block.timestamp < s.deployedAt + MARCH_DURATION) {
                unchecked { ++i; }
                continue;
            }
            uint256 eff = _getEffectiveUnitsFromRef(s);
            if (eff == 0) {
                uint256 fullKillPot = (uint256(s.costPaid) * SPLIT_KILL_REWARD) / BPS_DENOM;
                uint256 attritionPot = s.originalCount > 0 ? (fullKillPot * uint256(s.initialCount)) / uint256(s.originalCount) : fullKillPot;
                s.active = false;
                if (s.faction == Faction.PEPE) {
                    if (s.initialCount <= totalUnitsPEPE) totalUnitsPEPE -= s.initialCount;
                    else totalUnitsPEPE = 0;
                } else {
                    if (s.initialCount <= totalUnitsSHIB) totalUnitsSHIB -= s.initialCount;
                    else totalUnitsSHIB = 0;
                }
                treasury.transferAttritionPotToTreasury(laneId, uint8(s.faction), attritionPot);
                emit ZombieCleaned(sid, attritionPot);
                ids[i] = ids[len - 1];
                ids.pop();
                unchecked { --len; }
                continue;
            }
            // Move to bastion (use computed arrival time, not block.timestamp, to preserve attrition continuity)
            s.bastionEnteredAt = uint40(s.deployedAt + MARCH_DURATION);
            bastionSquads[laneId].push(sid);
            emit SquadArrived(sid, laneId);
            ids[i] = ids[len - 1];
            ids.pop();
            unchecked { --len; }
        }
    }

    // ═══════════════════════════════════════════
    //          INTERNAL: HOLD SCORE
    // ═══════════════════════════════════════════

    function _updateHoldScore(uint8 laneId) internal {
        BastionState storage b = bastions[laneId];

        if (b.lastHoldScoreUpdate == 0) {
            b.lastHoldScoreUpdate = uint40(block.timestamp);
            return;
        }

        uint256 elapsed = block.timestamp - b.lastHoldScoreUpdate;
        uint256 minutesDelta = elapsed / 1 minutes;
        if (minutesDelta == 0) {
            // Advance timer even with 0 credit to prevent retroactive hold score
            // for squads that arrive via _processArrivals after this call.
            b.lastHoldScoreUpdate = uint40(block.timestamp);
            return;
        }

        // Single pass: count units, distribute player scores, and clean zombies
        uint256[] storage ids = bastionSquads[laneId];
        uint256 pepeUnits;
        uint256 shibUnits;
        bool hasPepe;
        bool hasShib;
        uint256 i = 0;
        uint256 len = ids.length;
        while (i < len) {
            uint256 sid = ids[i];
            Squad storage s = squads[sid];
            if (!s.active || s.seasonId != currentSeasonId) {
                ids[i] = ids[len - 1];
                ids.pop();
                unchecked { --len; }
                continue;
            }
            uint256 eff = _getEffectiveUnitsFromRef(s);
            if (eff == 0) {
                // Zombie cleanup — no bonus credit (they were credited while alive)
                uint256 fullKillPot = (uint256(s.costPaid) * SPLIT_KILL_REWARD) / BPS_DENOM;
                uint256 attritionPot = s.originalCount > 0 ? (fullKillPot * uint256(s.initialCount)) / uint256(s.originalCount) : fullKillPot;
                s.active = false;
                if (s.faction == Faction.PEPE) {
                    if (s.initialCount <= totalUnitsPEPE) totalUnitsPEPE -= s.initialCount;
                    else totalUnitsPEPE = 0;
                } else {
                    if (s.initialCount <= totalUnitsSHIB) totalUnitsSHIB -= s.initialCount;
                    else totalUnitsSHIB = 0;
                }
                treasury.transferAttritionPotToTreasury(laneId, uint8(s.faction), attritionPot);
                emit ZombieCleaned(sid, attritionPot);
                ids[i] = ids[len - 1];
                ids.pop();
                unchecked { --len; }
                continue;
            }
            // Track faction presence for contested state recalculation
            if (s.faction == Faction.PEPE) hasPepe = true;
            else hasShib = true;
            // Snapshot attrition into squad state — makes decay permanent.
            // Prevents units from "recovering" when a special event ends.
            if (eff < s.initialCount) {
                uint256 unitsLost = uint256(s.initialCount) - eff;
                uint256 fullKP = (uint256(s.costPaid) * SPLIT_KILL_REWARD) / BPS_DENOM;
                uint256 transferAmt = s.originalCount > 0 ? (fullKP * unitsLost) / uint256(s.originalCount) : 0;
                if (transferAmt > 0) {
                    treasury.transferAttritionPotToTreasury(laneId, uint8(s.faction), transferAmt);
                }
                s.initialCount = uint32(eff);
                s.bastionEnteredAt = uint40(block.timestamp);
            }
            // @dev Contested lanes (both factions present) don't accrue hold score.
            // This prevents gaming via deliberate small deployments to farm score during contested periods.
            if (!b.contestedAtUpdate) {
                if (s.faction == Faction.PEPE) {
                    pepeUnits += eff;
                } else {
                    shibUnits += eff;
                }
                playerStats[currentSeasonId][s.owner].holdScoreContrib += uint128(eff * minutesDelta);
                playerLaneScores[currentSeasonId][s.owner][laneId] += uint128(eff * minutesDelta);
            }
            unchecked { ++i; }
        }

        if (!b.contestedAtUpdate) {
            if (pepeUnits > 0) b.holdScorePEPE += uint128(pepeUnits * minutesDelta);
            if (shibUnits > 0) b.holdScoreSHIB += uint128(shibUnits * minutesDelta);
        }

        // Recalculate contested state after zombie cleanup
        b.contestedAtUpdate = hasPepe && hasShib;
        b.lastHoldScoreUpdate = uint40(block.timestamp);
        emit HoldScoreUpdated(laneId, b.holdScorePEPE, b.holdScoreSHIB);
    }

    function _countBastionUnits(uint8 laneId) internal view returns (uint256 pepe, uint256 shib) {
        uint256[] storage ids = bastionSquads[laneId];
        uint256 len = ids.length;
        for (uint256 i = 0; i < len;) {
            Squad storage s = squads[ids[i]];
            if (s.active && s.seasonId == currentSeasonId) {
                uint256 eff = _getEffectiveUnitsFromRef(s);
                if (s.faction == Faction.PEPE) {
                    pepe += eff;
                } else {
                    shib += eff;
                }
            }
            unchecked { ++i; }
        }
    }

    // ═══════════════════════════════════════════
    //          INTERNAL: HELPERS
    // ═══════════════════════════════════════════

    /// @dev Lookup attrition multiplier from pre-computed table (big-endian uint16, 169 entries).
    /// Returns value in [10, 10000] where 10000 = 100% (no attrition) and 10 = 0.1% (near-total loss).
    /// Table index h = hours in bastion (0–168). Monotonically decreasing.
    function _getAttrition(uint256 h) internal pure returns (uint256) {
        require(h <= 168, "h out of range");
        uint256 offset = h * 2;
        return (uint256(uint8(ATTRITION_DATA[offset])) << 8) | uint256(uint8(ATTRITION_DATA[offset + 1]));
    }

    function _getWeatherMultiplier(UnitType ut) internal view returns (uint256) {
        if (currentWeather == Weather.FOGGY && ut == UnitType.SWORDSMAN) return WEATHER_BONUS;
        if (currentWeather == Weather.RAINY && ut == UnitType.SPEARMAN) return WEATHER_BONUS;
        if (currentWeather == Weather.SUNNY && ut == UnitType.CAVALRY) return WEATHER_BONUS;
        return WEATHER_DENOM;
    }

    function _getRPSMultiplier(UnitType attacker, UnitType defender) internal pure returns (uint256) {
        if (attacker == UnitType.SWORDSMAN && defender == UnitType.SPEARMAN) return RPS_WIN_MULT;
        if (attacker == UnitType.SPEARMAN  && defender == UnitType.CAVALRY)  return RPS_WIN_MULT;
        if (attacker == UnitType.CAVALRY   && defender == UnitType.SWORDSMAN) return RPS_WIN_MULT;
        return RPS_DENOM;
    }

    function _weightedRPS(
        UnitType myType,
        uint256[4] memory enemyTypeUnits,
        uint256 totalEnemy
    ) internal pure returns (uint256) {
        if (totalEnemy == 0) return RPS_DENOM;

        uint256 weighted;
        for (uint256 t = 1; t <= 3;) { // SWORDSMAN=1, SPEARMAN=2, CAVALRY=3
            if (enemyTypeUnits[t] > 0) {
                uint256 rpsMult = _getRPSMultiplier(myType, UnitType(t));
                weighted += rpsMult * enemyTypeUnits[t];
            }
            unchecked { ++t; }
        }
        return weighted / totalEnemy;
    }

    function _hasBothFactions(uint8 laneId) internal view returns (bool) {
        uint256[] storage ids = bastionSquads[laneId];
        bool hasPepe;
        bool hasShib;
        uint256 len = ids.length;
        for (uint256 i = 0; i < len;) {
            Squad storage s = squads[ids[i]];
            if (s.active && s.seasonId == currentSeasonId) {
                if (s.faction == Faction.PEPE) hasPepe = true;
                else if (s.faction == Faction.SHIB) hasShib = true;
                if (hasPepe && hasShib) return true;
            }
            unchecked { ++i; }
        }
        return false;
    }

    function _minArrivalAlive(uint256[] memory ids, uint256[] memory effs, uint256 count) internal view returns (uint40) {
        uint40 minVal = type(uint40).max;
        for (uint256 i = 0; i < count;) {
            if (effs[i] > 0) {
                uint40 arr = squads[ids[i]].bastionEnteredAt;
                if (arr < minVal) minVal = arr;
            }
            unchecked { ++i; }
        }
        return minVal;
    }

    function _minSquadIdAlive(uint256[] memory ids, uint256[] memory effs, uint256 count) internal pure returns (uint256) {
        uint256 minId = type(uint256).max;
        for (uint256 i = 0; i < count;) {
            if (effs[i] > 0 && ids[i] < minId) {
                minId = ids[i];
            }
            unchecked { ++i; }
        }
        return minId;
    }

    function _compactBastionSquads(uint8 laneId) internal {
        uint256[] storage ids = bastionSquads[laneId];
        uint256 i = 0;
        uint256 len = ids.length;
        while (i < len) {
            Squad storage s = squads[ids[i]];
            if (!s.active || s.seasonId != currentSeasonId) {
                ids[i] = ids[len - 1];
                ids.pop();
                unchecked { --len; }
            } else {
                unchecked { ++i; }
            }
        }
    }



    function _cleanupZombiesInBattle(
        uint8 laneId,
        uint256[] memory ids,
        uint256[] memory effective,
        uint256 count
    ) internal {
        for (uint256 i = 0; i < count;) {
            if (effective[i] == 0) {
                Squad storage s = squads[ids[i]];
                if (s.active) {
                    uint256 fullKillPot = (uint256(s.costPaid) * SPLIT_KILL_REWARD) / BPS_DENOM;
                    uint256 attritionPot = s.originalCount > 0 ? (fullKillPot * uint256(s.initialCount)) / uint256(s.originalCount) : fullKillPot;
                    s.active = false;

                    if (s.faction == Faction.PEPE) {
                        if (s.initialCount <= totalUnitsPEPE) totalUnitsPEPE -= s.initialCount;
                        else totalUnitsPEPE = 0;
                    } else {
                        if (s.initialCount <= totalUnitsSHIB) totalUnitsSHIB -= s.initialCount;
                        else totalUnitsSHIB = 0;
                    }

                    treasury.transferAttritionPotToTreasury(laneId, uint8(s.faction), attritionPot);
                    emit ZombieCleaned(ids[i], attritionPot);
                }
            }
            unchecked { ++i; }
        }
    }
}
