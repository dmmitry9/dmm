# PEPE vs SHIB — Session Handoff Document

> **Last updated:** 2026-02-25
> **Branch:** `claude/stoic-rosalind`
> **Site:** https://dmmitry9.github.io/dmm/
> **Repo:** https://github.com/dmmitry9/dmm.git

---

## 1. Project Overview

**PEPE vs SHIB** — on-chain competitive strategy game on Base L2 (Sepolia testnet). Players choose a faction (PEPE or SHIB), recruit units for USDC, and battle across 3 lanes with a Rock-Paper-Scissors combat system. 70% of recruitment fees go to kill pots, winners take losers' USDC. Seasons last 7 days, top 3 players of winning faction earn Season NFTs.

### Tech Stack
- **Smart Contracts:** Solidity 0.8.x, Foundry (forge/cast)
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Web3:** wagmi v2 + viem for contract interaction
- **State:** @tanstack/react-query + custom hooks
- **Deployment:** GitHub Actions → GitHub Pages (auto-deploy on push)
- **Chain:** Base Sepolia (chainId 84532)

---

## 2. Deployed Contracts (Base Sepolia)

| Contract | Address |
|----------|---------|
| MockUSDC | `0x5d5a379eE59D0EE533AB6C35D98B251e0487e45C` |
| GameEngine (v6) | `0x9A6d6B625077edF9b18dFD27dA96ebFC8D742eB1` |
| Treasury (v5) | `0xB493Ae859B2f76B8402d40CD19fAA893a7faF942` |
| SeasonNFT | `0xcdC2752697416aeA5B31C2ca1F8d1F6894E59A4E` |

### Deployer Account
- **Address:** `0x777715E32Bad440FfAc2E6ab67dF4F2E817571d2`
- **Private Key:** `0x20df39751fd268fdb570ed008deab329cdd935f105412d8de45a61ff4fd11bc9`

### User Test Account
- `0x64Ec16FB86a6ED045197478F3E3Fe788D1E31F3C` (received 10,000 MockUSDC from deployer)

---

## 3. Development Environment

- **Working directory:** `C:\claude\main\.claude\worktrees\stoic-rosalind`
- **Node.js NOT installed locally** — all builds happen via GitHub Actions CI
- **Git credentials:** username=dmmitry9 (via `git credential fill`)
- **Package manager:** npm (see `frontend/package-lock.json`)
- **Foundry (forge/cast):** available for contract interaction via `cast send`/`cast call`

### Build & Deploy Flow
1. Edit code locally
2. `git add <files> && git commit`
3. `git push origin claude/stoic-rosalind`
4. GitHub Actions builds (`tsc && vite build`) and deploys to GitHub Pages
5. Live at https://dmmitry9.github.io/dmm/

---

## 4. Project Structure

```
stoic-rosalind/
├── .github/workflows/
│   └── deploy-frontend.yml          # CI: build + deploy to GH Pages
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── App.tsx               # Main app layout, theme, routing
│   │   │   ├── GameMap.tsx           # Battlefield: lanes, segments, squads
│   │   │   ├── SeasonInfo.tsx        # Season dashboard + treasury breakdown
│   │   │   ├── DeployPanel.tsx       # Unit deployment form (approve + deploy)
│   │   │   ├── RewardsPanel.tsx      # Withdraw/Claim rewards
│   │   │   ├── BattleLog.tsx         # Last 10 battles from on-chain events
│   │   │   ├── RulesPage.tsx         # Detailed rules (11 sections)
│   │   │   └── ConnectWallet.tsx     # Wallet connection (MetaMask/WC)
│   │   ├── config/
│   │   │   ├── contracts.ts          # Addresses + ABIs (GameEngine, Treasury, ERC20)
│   │   │   └── wagmi.ts             # wagmi config (baseSepolia + base chains)
│   │   ├── hooks/
│   │   │   └── useGameState.ts       # All on-chain data hooks
│   │   ├── lib/
│   │   │   └── constants.ts          # Game constants, enums, formatters
│   │   ├── main.tsx                  # Entry point (React + wagmi + react-query)
│   │   ├── index.css                 # Theme variables (dark/light) + Tailwind
│   │   └── vite-env.d.ts
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts                # base: "/dmm/"
│   ├── tailwind.config.js            # Custom colors (pepe, shib, bastion, game)
│   ├── postcss.config.js
│   └── tsconfig.json
├── src/                               # Solidity contracts
│   ├── GameEngine.sol                 # Core game logic
│   ├── Treasury.sol                   # USDC treasury management
│   ├── SeasonNFT.sol                  # Season winner NFTs
│   ├── types/GameTypes.sol            # Shared types/enums
│   └── interfaces/                    # Contract interfaces
├── test/                              # Foundry tests (fuzz + invariant)
├── script/                            # Deployment scripts
├── foundry.toml
├── AUDIT_NOTES.md
└── CLAUDE.md                          # AI development instructions
```

---

## 5. Frontend Architecture

### React Hooks (useGameState.ts)
| Hook | Purpose | Refresh |
|------|---------|---------|
| `useGameState()` | Season ID, active, start time, forces, weather, events | 15s |
| `useLaneScores()` | Hold scores for 3 lanes (PEPE vs SHIB) | 30s |
| `usePlayerFaction(address)` | Player's faction (locked per season) | — |
| `useUSDCBalance(address)` | MockUSDC balance | 30s |
| `usePendingRewards(address)` | Claimable USDC rewards | 15s |
| `useUnitPrice(faction, count, totalPEPE, totalSHIB)` | Unit cost estimate | on demand |
| `useTreasuryBreakdown(seasonId)` | Kill pots (3 lanes × 2 factions), season pool, creators, buyback | 15s |
| `useLaneSquads()` | 3-step multicall: counts → IDs → details. Returns `[lane][segment][]` | 15s |
| `useBattleHistory()` | BattleResolved events from last 50k blocks, top 10 | 30s |

### Component Layout
```
<App>
  ├── <header>  —  Title + Theme toggle (☀️/🌙) + <ConnectWallet/>
  ├── <main> (3-col grid on lg)
  │   ├── Left (2/3):
  │   │   ├── <GameMap>  —  3 lanes × 7 segments with squad display
  │   │   ├── Forces grid  —  PEPE Forces | SHIB Forces | RPS System
  │   │   ├── <BattleLog>  —  Last 10 battles
  │   │   └── Spectator notice (if no wallet)
  │   └── Right (1/3):
  │       ├── <SeasonInfo>  —  Dashboard + treasury breakdown
  │       ├── <DeployPanel>  —  Recruit units
  │       └── <RewardsPanel>  —  Withdraw/Claim
  ├── <section>  —  "How It Works" rules summary + link to #rules
  └── <footer>

  <RulesPage>  —  Shown when hash === "#rules"
```

### Theme System
- CSS custom properties in `index.css` (`:root` = dark, `[data-theme="light"]` = light)
- `useTheme()` hook in App.tsx manages toggle + localStorage persistence
- Tailwind colors reference CSS vars: `game-bg`, `game-card`, `game-border`
- Light theme: warm cream palette (#f0ebe3), not white

### Key UI Features
- **GameMap segments:** Min-height 5.5rem, show 5 squad timers, Total line per segment (except bastion), hover tooltip for 20 squads
- **Squad timers:** Only shown for marching squads where `arrivalTime > now` (no "Ended" display)
- **Arrive button:** Appears when squads finish marching. `arrive()` auto-triggers battle if both factions present in bastion
- **Resolve Battle button:** Manual battle trigger when bastion is contested
- **Forces counter:** Shows computed effective units from `laneSquads` data (not stale contract `totalUnitsPEPE`/`totalUnitsSHIB`)
- **RPS icons:** ⚔️ Swordsman > 🔱 Spearman > 🐎 Cavalry
- **Hash routing:** `#rules` → RulesPage, no router dependency
- **Attrition table:** Rules page includes decay table showing effective units at 6h/12h/18h/24h for stack sizes 1–100

---

## 6. Smart Contract Architecture

### GameEngine.sol
- **Factions:** PEPE (1) / SHIB (2), locked per season per player
- **Lanes:** 3 lanes, 7 segments each (0=PEPE base, 3=Bastion, 6=SHIB base)
- **Units:** Swordsman / Spearman / Cavalry (RPS: 1.5× advantage)
- **March:** 9 minutes across 3 segments to bastion (10x speed for testing)
- **Weather:** Changes every 6 hours, +20% to one unit type
- **Special Events:** Epidemic (2× decay), Harvest (½ decay), Eclipse (no RPS)
- **Attrition:** ~4%/hour after march duration (0.96^h). Small stacks (1 unit) die in ~5h due to integer truncation
- **Zombie Cleanup:** `arrive()` checks for 0-effective squads and cleans them. `cleanupMarchingZombies(laneId)` — permissionless batch cleanup for marching zombies
- **Battle:** Combat power = effective × RPS multiplier × weather bonus

### Treasury.sol
- **USDC distribution:** 70% kill pot, 8% season pool, 10% next season, 5% +2 seasons, 2% creators, 5% buyback
- **Kill pot:** Winner takes 100%, loser gets partial share
- **Bastion farming:** Hold score = units × minutes → determines season treasury share
- **Pricing:** $5-$7 USDC per unit, scales with supply imbalance

### SeasonNFT.sol
- SVG-based on-chain NFTs for top 3 players of winning faction per season

---

## 7. Commit History (Chronological)

```
11e3a96 initial project setup
0904643 feat: GameEngine with full audit fixes (13 issues resolved)
91f5c6f feat: Phase 2-5 — Treasury, SeasonNFT, Subgraph, React frontend
70a33cf feat: add fuzz and invariant tests for economic logic (Phase 7)
2f86342 feat: gas optimization, audit prep, and testnet deploy script
c39f297 chore: update frontend env with Base Sepolia deployed addresses
29cdbec ci: add GitHub Actions workflow for GitHub Pages deployment
ad0df84 feat: show squads on battlefield + fix pricing formula
83ea900 fix: approve GameEngine instead of Treasury for USDC spending
fe68395 feat: hide Approve button when allowance is sufficient
b583955 feat: show Treasury USDC balance in Season Info panel
7e0e17b feat(frontend): treasury breakdown + squad arrival times
a7def72 fix: update USDC fallback address to MockUSDC
1046df9 ui: taller segment boxes, show up to 5 squad timers, remove labels
84c27dc ui: change spearman icon from 🏹 to 🔱
1b76c84 fix: update hardcoded RPS display to use 🔱 for spearman
235c37e ui: add game rules section above footer
6ad96b4 feat: add detailed rules page with hash routing
1080468 feat: battle history log from on-chain events
a63aef8 ui: total summary line + hover tooltip for segment squads
ca1158c ui: move battle log below forces/RPS info bar
1354c3f feat: light/dark theme toggle + UI cleanup
6f1e063 fix: theme-aware colors for light mode + bastion shows only Total
a0f1c33 fix: accent colors contrast for light theme
e70f920 feat: add Resolve Battle button when bastion is contested
2ad427a feat: add Arrive button for squads that finished marching
d7a2405 fix: cleanup marching zombie squads + effective forces counter
4363074 feat: add attrition decay table to rules page
2d9bf80 fix: cast squadId to bigint for arrive() contract call
5d589bf fix: hold score attrition bug + 10x speed for testing
1604b44 fix: battle history resilient to RPC failures
48ee99e feat: enhanced battle log, weather buttons, player hold score
XXXXXXX feat: per-lane treasury, retreat button, weather timer, event descriptions ← LATEST
```

---

## 8. Known Issues & Potential Improvements

### Theme Gaps (Light Mode)
Most light theme issues are fixed. Some components may still use hardcoded `bg-gray-800` / `text-gray-*`:
- `DeployPanel.tsx` — faction/unit/lane buttons, price preview and count input
- `SeasonInfo.tsx` — weather panel

### Completed Features (from previous "next steps")
- ~~Add "Arrive" button~~ → Done (commit `2ad427a`)
- ~~Add "Resolve Battle" button~~ → Done (commit `e70f920`)
- ~~Fix light theme colors~~ → Mostly done (commits `6f1e063`, `a0f1c33`)
- ~~Zombie cleanup for marching squads~~ → Done (commit `d7a2405`)
- ~~Effective forces counter~~ → Done (commit `d7a2405`)
- ~~Per-lane treasury distribution~~ → Done (v6 contracts)
- ~~Retreat button~~ → Done (v6 contracts)
- ~~Weather cooldown timer~~ → Done
- ~~Event attrition descriptions~~ → Done
- ~~Retreat history in battle log~~ → Done
- ~~Reduced cooldowns (weather 10×, events 5×)~~ → Done

### Possible Next Steps
- Player's own squads highlighting / management panel
- Auto-refresh squad positions with animation
- Mobile responsive layout improvements
- Sound effects / notifications for battles
- Subgraph integration for historical analytics
- Mainnet (Base) deployment
- Fix remaining light theme hardcoded colors in DeployPanel/SeasonInfo

---

## 9. Environment Variables (CI)

Set in `.github/workflows/deploy-frontend.yml`:
```
VITE_WC_PROJECT_ID=demo
VITE_GAME_ENGINE=0x9A6d6B625077edF9b18dFD27dA96ebFC8D742eB1
VITE_TREASURY=0xB493Ae859B2f76B8402d40CD19fAA893a7faF942
VITE_SEASON_NFT=0xcdC2752697416aeA5B31C2ca1F8d1F6894E59A4E
VITE_USDC=0x5d5a379eE59D0EE533AB6C35D98B251e0487e45C
```

---

## 10. How to Continue in New Session

**Option A (recommended):** Send this file to the new session with the message:
```
Here is the context file for my PEPE vs SHIB project.
Working directory: C:\claude\main\.claude\worktrees\stoic-rosalind
Branch: claude/stoic-rosalind
[paste your new task here]
```

**Option B:** If you need the AI to inspect the codebase first:
```
Read SESSION_HANDOFF.md at C:\claude\main\.claude\worktrees\stoic-rosalind\SESSION_HANDOFF.md
and then [your task]
```

The AI will have full context of the architecture, deployed contracts, file structure, and current state. No need to re-explain the project.
