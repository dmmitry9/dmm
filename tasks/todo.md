# Phase 2: Treasury.sol — Implementation Plan

## Overview

Treasury.sol is the financial backbone: all USDC flows, kill pots, season rewards, retreat refunds, dynamic pricing, Chainlink VRF for weather/events, and player claims.

---

## 1. Interface Changes Required

### ITreasury.sol updates
- `refundRetreat(address player, uint256 amount)` → `refundRetreat(address player, uint256 totalRefund, uint8 laneId, uint8 faction, uint256 costPaid)`
  - Treasury needs laneId+faction to debit killPot, and costPaid to compute split
- `finalizeSeason(uint256 seasonId)` → `finalizeSeason(uint256 seasonId, uint256 totalHoldScore, uint8 winnerFaction)`
  - Treasury needs totalHoldScore for claim computation and winner for NFT eligibility
- Add `withdraw() external` — pull payment for all accumulated rewards
- Add `seedTreasury(uint256 seasonId, uint256 amount) external` — founders seed initial $5000
- Add `donate(uint256 seasonId, uint256 amount) external` — community donations

### GameEngine.sol updates
- `retreat()` line 362: pass extra args to `refundRetreat`
- `endSeason()` line 441: pass `totalHoldScore` and `winner` to `finalizeSeason`
- Add public getter `getPlayerHoldScore(uint256 seasonId, address player) → uint128` for Treasury queries

---

## 2. Treasury.sol Storage Layout

```solidity
// Core references
IGameEngine public gameEngine;
IERC20 public usdc;
address public owner;

// Kill pots: killPot[laneId][faction] → USDC amount
mapping(uint8 => mapping(uint8 => uint256)) public killPot;

// Season treasury pools
mapping(uint256 => uint256) public seasonTreasury; // seasonId → accumulated USDC

// Season results (set at finalizeSeason)
struct SeasonResult {
    bool finalized;
    uint8 winnerFaction;
    uint256 totalHoldScore;
    uint256 treasuryBalance; // snapshot at finalize time
    uint256 totalClaimed;
}
mapping(uint256 => SeasonResult) public seasonResults;
mapping(uint256 => mapping(address => bool)) public hasClaimed; // seasonId → player → claimed

// Pull payment balances
mapping(address => uint256) public pendingRewards; // accumulated kill rewards, retreat refunds

// Creator & buyback reserves
uint256 public creatorsBalance;
uint256 public buybackReserve;
address public creatorsWallet;
address public buybackWallet;

// Chainlink VRF v2
VRFCoordinatorV2Interface public vrfCoordinator;
uint64 public vrfSubscriptionId;
bytes32 public vrfKeyHash;
uint16 public vrfConfirmations;
uint32 public vrfCallbackGasLimit;
mapping(uint256 => uint8) public vrfRequestType; // requestId → 1=weather, 2=event

// Timing
uint256 public lastWeatherUpdate;
uint256 public lastEventTrigger;

// Constants (same as GameEngine for consistency)
uint256 public constant SPLIT_KILL_REWARD   = 7_000; // 70%
uint256 public constant SPLIT_TREASURY_NOW  =   800; //  8%
uint256 public constant SPLIT_TREASURY_NEXT = 1_000; // 10%
uint256 public constant SPLIT_TREASURY_NEXT2=   500; //  5%
uint256 public constant SPLIT_CREATORS      =   200; //  2%
uint256 public constant SPLIT_BUYBACK       =   500; //  5%
uint256 public constant BPS_DENOM           = 10_000;
uint256 public constant BASE_PRICE_USDC     = 5_000_000; // $5
uint256 public constant MAX_PRICE_USDC      = 7_000_000; // $7
uint256 public constant WEATHER_INTERVAL    = 6 hours;
```

---

## 3. Function-by-function Implementation

### 3.1 `recordDeployment(payer, amount, faction, laneId, seasonId)`
- **Called by:** GameEngine.deployUnits (USDC already transferred to Treasury)
- **Logic:**
  - killPot[laneId][faction] += amount × 70% / 10000
  - seasonTreasury[seasonId] += amount × 8% / 10000
  - seasonTreasury[seasonId+1] += amount × 10% / 10000
  - seasonTreasury[seasonId+2] += amount × 5% / 10000
  - creatorsBalance += amount × 2% / 10000
  - buybackReserve += amount × 5% / 10000
- **Access:** onlyGameEngine

### 3.2 `getUnitPrice(faction, count, totalPEPE, totalSHIB) → uint256`
- **Pure function** (no state)
- **Logic:**
  - If totalPEPE + totalSHIB == 0 → return BASE_PRICE × count
  - Determine dominant faction
  - If caller faction is underdog → return BASE_PRICE × count
  - price = min(MAX_PRICE, BASE_PRICE × (1 + (dominant - underdog) / (dominant + underdog))) × count
  - Fixed-point math: `BASE_PRICE * (2 * dominant) / (dominant + underdog)` capped at MAX_PRICE
- **Access:** pure (anyone)

### 3.3 `getKillPot(laneId, faction) → uint256`
- Simple view: return killPot[laneId][faction]

### 3.4 `distributeKillReward(laneId, loser, winners[], shares[])`
- **Called by:** GameEngine._resolveBattle (winner takes ALL of loser's killPot)
- **Logic:**
  - pot = killPot[laneId][loser]
  - totalShares = sum(shares)
  - For each winner: pendingRewards[winner] += pot × shares[i] / totalShares
  - killPot[laneId][loser] = 0
- **Access:** onlyGameEngine

### 3.5 `distributePartialKillReward(laneId, fromFaction, recipients[], shares[], casualtiesBps)`
- **Called by:** GameEngine._resolveBattle (loser gets partial winner's killPot)
- **Logic:**
  - pot = killPot[laneId][fromFaction]
  - portionToDistribute = pot × casualtiesBps / BPS_DENOM
  - totalShares = sum(shares)
  - For each recipient: pendingRewards[recipient] += portionToDistribute × shares[i] / totalShares
  - killPot[laneId][fromFaction] -= portionToDistribute
- **Access:** onlyGameEngine

### 3.6 `refundRetreat(player, totalRefund, laneId, faction, costPaid)`
- **Called by:** GameEngine.retreat
- **Logic:**
  - killPotPortion = costPaid × SPLIT_KILL_REWARD / BPS_DENOM (= 70% of cost)
  - treasuryPortion = totalRefund - killPotPortion (= 10% of cost)
  - killPot[laneId][faction] -= killPotPortion
  - seasonTreasury[currentSeasonId] -= treasuryPortion (with underflow guard)
  - pendingRewards[player] += totalRefund
- **Access:** onlyGameEngine

### 3.7 `transferAttritionPotToTreasury(laneId, faction, amount)`
- **Called by:** GameEngine (zombie cleanup)
- **Logic:**
  - killPot[laneId][faction] -= amount (with underflow guard)
  - seasonTreasury[currentSeasonId] += amount
- **Access:** onlyGameEngine

### 3.8 `finalizeSeason(seasonId, totalHoldScore, winnerFaction)`
- **Called by:** GameEngine.endSeason
- **Logic:**
  - Store SeasonResult: finalized=true, winner, totalHoldScore, treasuryBalance=seasonTreasury[seasonId]
  - Transfer remaining killPots to season treasury (cleanup)
  - Mark season as finalized
- **Access:** onlyGameEngine

### 3.9 `claim(seasonId)`
- **Called by:** Player directly
- **Logic:**
  - Require season finalized, not already claimed
  - Query gameEngine.getPlayerHoldScore(seasonId, msg.sender) for holdScoreContrib
  - share = treasuryBalance × holdScoreContrib / totalHoldScore
  - pendingRewards[msg.sender] += share
  - seasonResults[seasonId].totalClaimed += share
  - hasClaimed[seasonId][msg.sender] = true
- **Access:** anyone

### 3.10 `withdraw()`
- **Pull payment** — player withdraws all accumulated rewards
- **Logic:**
  - amount = pendingRewards[msg.sender]
  - pendingRewards[msg.sender] = 0
  - usdc.transfer(msg.sender, amount)
- **Access:** anyone

### 3.11 Chainlink VRF functions
- `requestWeatherUpdate()` — anyone, but only every 6 hours
  - Requests 1 random word from VRF
  - Stores requestId as weather type
- `requestSpecialEvent()` — anyone, but with cooldown
  - Requests 1 random word from VRF
  - Stores requestId as event type
- `fulfillRandomWords(requestId, randomWords[])` — VRF callback
  - If weather: randomWord % 3 → Weather(1..3), calls gameEngine.setWeather()
  - If event: randomWord % 4 → SpecialEvent(0..3), calls gameEngine.setSpecialEvent()

### 3.12 Admin functions
- `seedTreasury(seasonId)` — owner deposits USDC to season treasury
- `donate(seasonId)` — anyone deposits USDC to season treasury
- `withdrawCreators()` — creatorsWallet withdraws accumulated fees
- `withdrawBuyback()` — buybackWallet withdraws accumulated reserve
- `setVRFConfig(...)` — owner configures VRF parameters

---

## 4. Security Considerations

1. **Access control:** All GameEngine-facing functions require `onlyGameEngine` modifier
2. **Reentrancy:** ReentrancyGuard on withdraw(), claim(), and all USDC transfer functions
3. **Pull payment:** No push transfers to players — only pendingRewards + withdraw()
4. **Underflow guards:** killPot and seasonTreasury deductions use `min(balance, amount)`
5. **Integer overflow:** Solidity 0.8.24 built-in checks
6. **VRF manipulation:** fulfillRandomWords is internal callback, only callable by VRF coordinator
7. **Season isolation:** claim() checks finalized flag, double-claim prevention

---

## 5. Files to Create/Modify

| File | Action |
|------|--------|
| `src/Treasury.sol` | **CREATE** — main implementation (~300 lines) |
| `src/interfaces/ITreasury.sol` | **MODIFY** — update refundRetreat, finalizeSeason, add withdraw/seed/donate |
| `src/GameEngine.sol` | **MODIFY** — update retreat() and endSeason() calls, add getPlayerHoldScore getter |
| `foundry.toml` | **MODIFY** — add Chainlink VRF remapping |

---

## 6. Implementation Order

- [ ] Step 1: Update ITreasury.sol interface (new signatures)
- [ ] Step 2: Update GameEngine.sol (retreat + endSeason calls + getter)
- [ ] Step 3: Create Treasury.sol (core: constructor, recordDeployment, getUnitPrice, getKillPot)
- [ ] Step 4: Treasury.sol kill rewards (distributeKillReward, distributePartialKillReward)
- [ ] Step 5: Treasury.sol retreat + attrition (refundRetreat, transferAttritionPotToTreasury)
- [ ] Step 6: Treasury.sol season lifecycle (finalizeSeason, claim, withdraw)
- [ ] Step 7: Treasury.sol admin (seedTreasury, donate, withdrawCreators, withdrawBuyback)
- [ ] Step 8: Treasury.sol VRF integration (requestWeatherUpdate, requestSpecialEvent, fulfillRandomWords)
- [ ] Step 9: Review all contracts for consistency
