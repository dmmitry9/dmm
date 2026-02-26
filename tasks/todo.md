# PEPE vs SHIB — Task Tracker

## Completed

- [x] Phase 1: GameEngine.sol — core game logic + audit fixes (13 issues)
- [x] Phase 2-5: Treasury.sol, SeasonNFT.sol, frontend scaffold
- [x] Phase 6: Fuzz & invariant tests
- [x] Phase 7: Gas optimization + testnet deploy (Base Sepolia)
- [x] Frontend: Game map, squad display, deploy panel, rewards panel
- [x] Frontend: Treasury breakdown, squad arrival timers
- [x] Frontend: Battle history log from on-chain events
- [x] Frontend: Detailed rules page (11 sections) with hash routing
- [x] Frontend: Light/dark theme toggle + localStorage persistence
- [x] Fix: Light theme colors (accent contrast, theme-aware vars)
- [x] Feat: Resolve Battle button when bastion is contested
- [x] Feat: Arrive button for squads that finished marching
- [x] Fix: Marching zombie squads cleanup (arrive() + cleanupMarchingZombies())
- [x] Fix: Forces counter shows effective units (not stale contract counters)
- [x] Feat: Attrition decay table in rules page
- [x] Redeploy GameEngine v2 → `0x6b730ddd0d5BdE94BF4f3E624E0163E90320ff83`

## Next Steps (Backlog)

- [ ] Add "Retreat" button for marching squads (80% refund)
- [ ] Player's own squads highlighting / management panel
- [ ] Fix remaining light theme hardcoded colors (DeployPanel, SeasonInfo)
- [ ] Auto-refresh squad positions with animation
- [ ] Mobile responsive layout
- [ ] Sound effects / notifications for battles
- [ ] Subgraph integration for historical analytics
- [ ] Mainnet (Base) deployment
