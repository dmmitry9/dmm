# PEPE vs SHIB — Security Audit Notes

## Overview

On-chain strategy game on Base L2 where two factions (PEPE, SHIB) compete for control of 3 bastions. Players deploy unit squads using USDC, which flows into kill pots and season treasuries. Winners earn proportional rewards; season top-3 earn commemorative NFTs.

**Solidity 0.8.24 | Base L2 (EVM cancun) | USDC (6 decimals) | Chainlink VRF v2**

---

## Architecture

### Contracts

| Contract | Responsibility | Lines |
|----------|---------------|-------|
| `GameEngine.sol` | Game logic: deploy, march, arrive, battle, hold score, seasons | ~990 |
| `Treasury.sol` | USDC custody: splits, kill pots, rewards, VRF weather/events | ~660 |
| `SeasonNFT.sol` | ERC721 commemorative NFTs for top-3 players per season | ~230 |
| `GameTypes.sol` | Shared enums (Faction, UnitType, Weather, SpecialEvent) and structs (Squad, BastionState, PlayerStats) | ~50 |

### Deployment Order

```
1. MockUSDC (or real USDC address on Base)
2. SeasonNFT()
3. Treasury(usdc, address(0), creatorsWallet, buybackWallet)
4. GameEngine(usdc, treasury, seasonNFT)
5. treasury.setGameEngine(engine)
6. seasonNFT.setMinter(engine)
```

### Cross-Contract Call Graph

```
GameEngine → Treasury:
  recordDeployment(), distributeKillReward(), distributePartialKillReward(),
  refundRetreat(), transferAttritionPotToTreasury(), finalizeSeason()

Treasury → GameEngine:
  setWeather(), setSpecialEvent() (via VRF callback)
  getPlayerHoldScore() (via IGameEngineExtended, in claim())

GameEngine → SeasonNFT:
  mintSeasonRewards() (at season end)
```

---

## Threat Model

### Trusted Actors

| Actor | Trust Level | Powers |
|-------|-------------|--------|
| Owner (deployer) | Full admin | startSeason(), endSeason(), setSeasonNFT() |
| Treasury contract | Cross-contract | setWeather(), setSpecialEvent() via VRF |
| Chainlink VRF | Oracle | rawFulfillRandomWords() — verified by msg.sender check |

### Untrusted Actors

| Actor | Capabilities |
|-------|-------------|
| Players | deployUnits(), arrive(), retreat(), withdraw(), claim() |
| Anyone | resolveBattle(), refreshHoldScore(), requestWeatherUpdate(), requestSpecialEvent() |

### Admin Powers (Centralization Risks)

- **Owner can start/end seasons** — `startSeason()` resets all game state; `endSeason()` requires SEASON_DURATION elapsed
- **Owner provides top-3 addresses** — `endSeason(address[3] top3)` is trusted input for NFT minting
- **Owner cannot**: withdraw USDC, modify splits, change kill pots, pause contracts
- **No upgradability**: contracts are immutable after deployment

---

## Economic Model

### USDC Splits (on each deployment)

| Split | BPS | Destination |
|-------|-----|-------------|
| Kill Reward | 7000 (70%) | `killPot[laneId][faction]` |
| Current Season | 800 (8%) | `seasonTreasury[currentSeasonId]` |
| Next Season | 1000 (10%) | `seasonTreasury[currentSeasonId + 1]` |
| Season + 2 | 500 (5%) | `seasonTreasury[currentSeasonId + 2]` |
| Creators | 200 (2%) | `creatorBalance` |
| Buyback | 500 (5%) | `buybackBalance` |
| **Total** | **10000** | |

### Dynamic Pricing

- Base price: $5 USDC per unit
- Max price: $7 USDC per unit
- Underdog faction (fewer units) always pays base price
- Dominant faction pays `base + (base * imbalanceRatio * SURGE_BPS) / BPS_DENOM`, capped at max

### Kill Pot Distribution

- On battle win: loser's kill pot distributed to winners proportional to effective units
- On partial kill: proportion based on casualtiesBps
- **Dust handling**: Integer division dust stays in killPot, swept to seasonTreasury at finalizeSeason()

### Season Treasury Claims

- After season ends, players on the winning faction claim proportional to their `holdScoreContrib / totalHoldScore`
- Each player can claim once per season (`hasClaimed` mapping)

### Retreat Refund

- 80% refund on retreat (20% penalty)
- Refund debited from killPot (70% portion) + seasonTreasury (remainder)
- **Underflow guards**: If killPot or seasonTreasury insufficient, deficit absorbed by protocol seed funds

---

## Security Properties & Invariants

### Verified by Fuzz Tests (22 tests, 256 runs each)

1. **Price bounds**: `getUnitPrice()` always returns value in `[BASE_PRICE * count, MAX_PRICE * count]`
2. **Split conservation**: Sum of all splits from `recordDeployment()` ≤ amount, dust ≤ 5 wei
3. **Attrition monotonicity**: `h1 ≤ h2 → _getAttrition(h1) ≥ _getAttrition(h2)`
4. **Attrition bounds**: `_getAttrition(h)` ∈ [10, 10000] for all h ∈ [0, 168]
5. **Battle survivor minimum**: At least 1 surviving unit on winning side
6. **Battle loser deactivation**: All loser squads set to `active = false`
7. **Kill reward conservation**: Distributed rewards ≤ available kill pot

### Verified by Invariant Tests (7 invariants, 256 runs × 50 depth)

1. **USDC conservation**: `treasury.balanceOf(usdc) == ghost_totalDeposited - ghost_totalWithdrawn`
2. **Claimable solvency**: `sum(killPots) + sum(pendingRewards) ≤ treasury.balance`
3. **Kill pot bounded**: Each individual kill pot ≤ total treasury balance
4. **Pricing bounds**: Unit price always in [$5, $7] range for current game state
5. **Unit counts bounded**: `totalUnitsPEPE ≤ ghost_totalPepeDeployed` (never exceeds total ever deployed)
6. **Hold score monotonicity**: Hold scores only increase within a season
7. **Handler coverage**: All 7 action types (deploy, arrive, retreat, withdraw, advanceTime, refreshHoldScore, changeWeather) exercised

---

## Known Design Decisions

### 1. Retreat Underflow Guards

`refundRetreat()` uses conditional guards (`if portion ≤ balance`) rather than strict subtraction. This prevents revert when kill pot has been partially distributed by a concurrent battle. The deficit is covered by protocol seed funds deposited via `seedTreasury()`.

**Risk level**: Low. Worst case: protocol absorbs small USDC deficit from timing edge case.

### 2. Kill Pot Dust

Integer division in `distributeKillReward()` leaves dust (typically < 10 wei USDC). Dust remains in the kill pot and is swept to the season treasury during `finalizeSeason()`. This is intentional — ensures no rounding loss at the protocol level.

### 3. Faction Locking

Players commit to a faction on their first deployment each season. Subsequent deployments must use the same faction. This prevents strategy gaming by deploying to both sides.

### 4. Contested Lane Hold Score

When both factions are present in a bastion (`contestedAtUpdate = true`), hold scores do NOT accrue. This prevents gaming via small deployments to farm hold score during contested periods.

### 5. Zombie Cleanup

Squads that reach 0 effective units (due to attrition) are cleaned up during `_updateHoldScore()`. Their kill pot portion is returned to the season treasury via `transferAttritionPotToTreasury()`.

### 6. VRF Weather/Events

Weather and special events are set via Chainlink VRF callbacks. Rate-limited to prevent spam: 1 hour between weather requests, 4 hours between special event requests. The VRF coordinator address is checked explicitly in `rawFulfillRandomWords()`.

---

## Access Control Matrix

### GameEngine.sol

| Function | Access | Modifier |
|----------|--------|----------|
| `deployUnits()` | Any player | `nonReentrant onlySeason` |
| `arrive()` | Any player | `nonReentrant onlySeason` |
| `resolveBattle()` | Anyone | `nonReentrant onlySeason` |
| `retreat()` | Squad owner only | `nonReentrant onlySeason` + `s.owner == msg.sender` |
| `refreshHoldScore()` | Anyone | None (permissionless) |
| `setWeather()` | Treasury only | `onlyTreasury` |
| `setSpecialEvent()` | Treasury only | `onlyTreasury` |
| `startSeason()` | Owner | `onlyOwner` |
| `endSeason()` | Owner | `onlyOwner` |
| `setSeasonNFT()` | Owner | `onlyOwner` |

### Treasury.sol

| Function | Access | Modifier |
|----------|--------|----------|
| `recordDeployment()` | GameEngine only | `onlyGameEngine` |
| `distributeKillReward()` | GameEngine only | `onlyGameEngine` |
| `distributePartialKillReward()` | GameEngine only | `onlyGameEngine` |
| `refundRetreat()` | GameEngine only | `onlyGameEngine` |
| `transferAttritionPotToTreasury()` | GameEngine only | `onlyGameEngine` |
| `finalizeSeason()` | GameEngine only | `onlyGameEngine` |
| `claim()` | Any player | `nonReentrant` |
| `withdraw()` | Any player | `nonReentrant` |
| `seedTreasury()` | Anyone | None |
| `donate()` | Anyone | None |
| `withdrawCreators()` | Creators wallet | `msg.sender == creatorsWallet` |
| `withdrawBuyback()` | Buyback wallet | `msg.sender == buybackWallet` |
| `requestWeatherUpdate()` | Anyone | Rate-limited (1h cooldown) |
| `requestSpecialEvent()` | Anyone | Rate-limited (4h cooldown) |
| `rawFulfillRandomWords()` | VRF coordinator | `msg.sender == vrfCoordinator` |

### SeasonNFT.sol

| Function | Access | Modifier |
|----------|--------|----------|
| `setMinter()` | Owner | `onlyOwner` |
| `mintSeasonRewards()` | Minter (GameEngine) | `msg.sender == minter` |

---

## Reentrancy Protection

- **ReentrancyGuard (OpenZeppelin v5.5.0)**: Inherited by both GameEngine and Treasury
- **nonReentrant**: Applied to all functions that transfer USDC or modify critical state
- **Pull-payment pattern**: Rewards accumulate in `pendingRewards` mapping; players call `withdraw()` to collect
- **Checks-effects-interactions**: All USDC transfers happen after state updates

---

## Test Coverage Summary

| Category | Tests | Coverage |
|----------|-------|---------|
| Unit tests (separate worktree) | 173 | All core logic paths |
| Fuzz tests | 22 | Pricing, splits, attrition, battles |
| Invariant tests | 7 | Economic invariants (256 runs × 50 depth) |
| **Total** | **202** | |

### Build & Test Commands

```bash
forge build              # Compile (requires via_ir = true)
forge test               # Run all tests
forge test -vv           # Verbose output
forge snapshot           # Gas benchmarks
forge snapshot --diff    # Compare gas after changes
```
