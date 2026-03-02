import { type Address } from "viem";

// ── Contract addresses (Base Sepolia — update after deployment) ──
export const ADDRESSES = {
  gameEngine: (import.meta.env.VITE_GAME_ENGINE ||
    "0x92848Ae18eE729f1473691843D48d33112d3015c") as Address,
  treasury: (import.meta.env.VITE_TREASURY ||
    "0xbE99aEfF7fdE418A0e65F7e30Ff08DAD43907698") as Address,
  seasonNFT: (import.meta.env.VITE_SEASON_NFT ||
    "0x9b6Fcf35e4728D78107F9D9295d40629CE3c9Ce4") as Address,
  usdc: (import.meta.env.VITE_USDC ||
    "0xb64591F38292dA40375FC9f3BAf231f26e2c3903") as Address, // MockUSDC v8.2
} as const;

// ── GameEngine ABI (minimal — only functions used by frontend) ──
export const GAME_ENGINE_ABI = [
  // View
  {
    name: "currentSeasonId",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "seasonActive",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "bool" }],
  },
  {
    name: "seasonStartTime",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "totalUnitsPEPE",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "totalUnitsSHIB",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "currentWeather",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    name: "currentSpecialEvent",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    name: "specialEventEndsAt",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "getHoldScore",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "laneId", type: "uint8" }],
    outputs: [
      { name: "pepe", type: "uint128" },
      { name: "shib", type: "uint128" },
    ],
  },
  {
    name: "getBastionSquadCount",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "laneId", type: "uint8" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "getMarchingSquadCount",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "laneId", type: "uint8" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "getPlayerHoldScore",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "seasonId", type: "uint256" },
      { name: "player", type: "address" },
    ],
    outputs: [{ type: "uint128" }],
  },
  {
    name: "getPlayerLaneScore",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "seasonId", type: "uint256" },
      { name: "player", type: "address" },
      { name: "laneId", type: "uint8" },
    ],
    outputs: [{ type: "uint128" }],
  },
  {
    name: "playerFaction",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ type: "uint8" }],
  },
  {
    name: "bastionSquads",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "", type: "uint256" },
      { name: "", type: "uint256" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "marchingSquads",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "", type: "uint256" },
      { name: "", type: "uint256" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "squads",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "owner", type: "address" },
      { name: "laneId", type: "uint8" },
      { name: "unitType", type: "uint8" },
      { name: "faction", type: "uint8" },
      { name: "active", type: "bool" },
      { name: "deployedAt", type: "uint40" },
      { name: "bastionEnteredAt", type: "uint40" },
      { name: "initialCount", type: "uint32" },
      { name: "originalCount", type: "uint32" },
      { name: "costPaid", type: "uint96" },
      { name: "seasonId", type: "uint32" },
    ],
  },
  {
    name: "getSquadSegment",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "squadId", type: "uint256" }],
    outputs: [{ type: "uint8" }],
  },
  {
    name: "getEffectiveUnits",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "squadId", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
  // Write
  {
    name: "deployUnits",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "laneId", type: "uint8" },
      { name: "unitType", type: "uint8" },
      { name: "faction", type: "uint8" },
      { name: "count", type: "uint32" },
    ],
    outputs: [],
  },
  {
    name: "endSeason",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    name: "startNextSeason",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    name: "SEASON_DURATION",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "refreshHoldScore",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "laneId", type: "uint8" }],
    outputs: [],
  },
  {
    name: "refreshAllLanes",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    name: "resolveBattle",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "laneId", type: "uint8" }],
    outputs: [],
  },
  {
    name: "rollWeather",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    name: "rollSpecialEvent",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    name: "weatherSetAt",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  // Events
  {
    name: "UnitsDeployed",
    type: "event",
    inputs: [
      { indexed: true, name: "squadId", type: "uint256" },
      { indexed: true, name: "owner", type: "address" },
      { indexed: false, name: "faction", type: "uint8" },
      { indexed: false, name: "laneId", type: "uint8" },
      { indexed: false, name: "unitType", type: "uint8" },
      { indexed: false, name: "count", type: "uint32" },
      { indexed: false, name: "cost", type: "uint256" },
    ],
  },
  {
    name: "BattleResolved",
    type: "event",
    inputs: [
      { indexed: true, name: "laneId", type: "uint8" },
      { indexed: false, name: "winner", type: "uint8" },
      { indexed: false, name: "totalSurvivors", type: "uint256" },
      { indexed: false, name: "winnerPot", type: "uint256" },
      { indexed: false, name: "loserEarned", type: "uint256" },
    ],
  },
  {
    name: "BattleDetails",
    type: "event",
    inputs: [
      { indexed: true, name: "laneId", type: "uint8" },
      { indexed: false, name: "pepeUnitsStart", type: "uint256" },
      { indexed: false, name: "shibUnitsStart", type: "uint256" },
      { indexed: false, name: "pepeCombat", type: "uint256" },
      { indexed: false, name: "shibCombat", type: "uint256" },
    ],
  },
] as const;

// ── USDC ABI (approve + balanceOf) ──
export const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
] as const;

// ── Treasury ABI (getUnitPrice + withdraw + claim) ──
export const TREASURY_ABI = [
  {
    name: "getUnitPrice",
    type: "function",
    stateMutability: "pure",
    inputs: [
      { name: "faction", type: "uint8" },
      { name: "count", type: "uint256" },
      { name: "totalPEPE", type: "uint256" },
      { name: "totalSHIB", type: "uint256" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "pendingRewards",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "withdraw",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    name: "claim",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "seasonId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "getKillPot",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "laneId", type: "uint8" },
      { name: "faction", type: "uint8" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "getSeasonTreasury",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "seasonId", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "protocolBalance",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "donate",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "seasonId", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "seasonResults",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "seasonId", type: "uint256" }],
    outputs: [
      { name: "finalized", type: "bool" },
      { name: "winnerFaction", type: "uint8" },
      { name: "totalHoldScore", type: "uint256" },
      { name: "treasuryBalance", type: "uint256" },
      { name: "totalClaimed", type: "uint256" },
    ],
  },
  {
    name: "hasClaimed",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "seasonId", type: "uint256" },
      { name: "player", type: "address" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;
