import { type Address } from "viem";

// ── Contract addresses (Base Sepolia — update after deployment) ──
export const ADDRESSES = {
  gameEngine: (import.meta.env.VITE_GAME_ENGINE ||
    "0x0000000000000000000000000000000000000000") as Address,
  treasury: (import.meta.env.VITE_TREASURY ||
    "0x0000000000000000000000000000000000000000") as Address,
  seasonNFT: (import.meta.env.VITE_SEASON_NFT ||
    "0x0000000000000000000000000000000000000000") as Address,
  usdc: (import.meta.env.VITE_USDC ||
    "0xEA0EDBD17cC63AFe4795729B69f43f915Ca447F3") as Address, // MockUSDC (deployed)
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
    name: "arrive",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "squadId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "retreat",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "squadId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "resolveBattle",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "laneId", type: "uint8" }],
    outputs: [],
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
    name: "creatorsBalance",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "buybackReserve",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const;
