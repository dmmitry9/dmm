import { useState, useEffect, useCallback } from "react";
import { useReadContract, useReadContracts, usePublicClient } from "wagmi";
import { parseAbiItem } from "viem";
import { ADDRESSES, GAME_ENGINE_ABI, TREASURY_ABI, ERC20_ABI } from "../config/contracts";
import { NUM_LANES } from "../lib/constants";

// ── Read all core game state in one multicall ──
export function useGameState() {
  const { data, isLoading, refetch } = useReadContracts({
    contracts: [
      {
        address: ADDRESSES.gameEngine,
        abi: GAME_ENGINE_ABI,
        functionName: "currentSeasonId",
      },
      {
        address: ADDRESSES.gameEngine,
        abi: GAME_ENGINE_ABI,
        functionName: "seasonActive",
      },
      {
        address: ADDRESSES.gameEngine,
        abi: GAME_ENGINE_ABI,
        functionName: "seasonStartTime",
      },
      {
        address: ADDRESSES.gameEngine,
        abi: GAME_ENGINE_ABI,
        functionName: "totalUnitsPEPE",
      },
      {
        address: ADDRESSES.gameEngine,
        abi: GAME_ENGINE_ABI,
        functionName: "totalUnitsSHIB",
      },
      {
        address: ADDRESSES.gameEngine,
        abi: GAME_ENGINE_ABI,
        functionName: "currentWeather",
      },
      {
        address: ADDRESSES.gameEngine,
        abi: GAME_ENGINE_ABI,
        functionName: "currentSpecialEvent",
      },
      {
        address: ADDRESSES.gameEngine,
        abi: GAME_ENGINE_ABI,
        functionName: "specialEventEndsAt",
      },
    ],
    query: { refetchInterval: 15_000 },
  });

  return {
    isLoading,
    refetch,
    seasonId: data?.[0]?.result as bigint | undefined,
    seasonActive: data?.[1]?.result as boolean | undefined,
    seasonStartTime: data?.[2]?.result as bigint | undefined,
    totalPEPE: data?.[3]?.result as bigint | undefined,
    totalSHIB: data?.[4]?.result as bigint | undefined,
    weather: Number(data?.[5]?.result ?? 0),
    specialEvent: Number(data?.[6]?.result ?? 0),
    specialEventEndsAt: Number(data?.[7]?.result ?? 0),
  };
}

// ── Hold scores for all 3 lanes ──
export function useLaneScores() {
  const { data, isLoading } = useReadContracts({
    contracts: [0, 1, 2].map((laneId) => ({
      address: ADDRESSES.gameEngine,
      abi: GAME_ENGINE_ABI,
      functionName: "getHoldScore" as const,
      args: [laneId] as const,
    })),
    query: { refetchInterval: 30_000 },
  });

  const lanes = [0, 1, 2].map((i) => {
    const result = data?.[i]?.result as [bigint, bigint] | undefined;
    return {
      pepe: result?.[0] ?? 0n,
      shib: result?.[1] ?? 0n,
    };
  });

  return { lanes, isLoading };
}

// ── Player faction for current season ──
export function usePlayerFaction(address: `0x${string}` | undefined) {
  const { data } = useReadContract({
    address: ADDRESSES.gameEngine,
    abi: GAME_ENGINE_ABI,
    functionName: "playerFaction",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  return Number(data ?? 0);
}

// ── Player USDC balance ──
export function useUSDCBalance(address: `0x${string}` | undefined) {
  const { data } = useReadContract({
    address: ADDRESSES.usdc,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 30_000 },
  });

  return data as bigint | undefined;
}

// ── Pending rewards ──
export function usePendingRewards(address: `0x${string}` | undefined) {
  const { data } = useReadContract({
    address: ADDRESSES.treasury,
    abi: TREASURY_ABI,
    functionName: "pendingRewards",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 15_000 },
  });

  return data as bigint | undefined;
}

// ── Unit price preview ──
export function useUnitPrice(
  faction: number,
  count: number,
  totalPEPE: bigint,
  totalSHIB: bigint
) {
  const { data } = useReadContract({
    address: ADDRESSES.treasury,
    abi: TREASURY_ABI,
    functionName: "getUnitPrice",
    args: [faction, BigInt(count), totalPEPE, totalSHIB],
    query: { enabled: count > 0 },
  });

  return data as bigint | undefined;
}

// ── Treasury breakdown ──
export interface TreasuryBreakdown {
  killPots: { pepe: bigint; shib: bigint }[];
  seasonTreasury: bigint;
  creatorsBalance: bigint;
  buybackReserve: bigint;
}

export function useTreasuryBreakdown(seasonId: bigint | undefined): TreasuryBreakdown {
  const { data } = useReadContracts({
    contracts: [
      // Kill pots: 3 lanes × 2 factions = 6 calls
      ...[0, 1, 2].flatMap((lane) => [
        {
          address: ADDRESSES.treasury,
          abi: TREASURY_ABI,
          functionName: "getKillPot" as const,
          args: [lane, 1] as const, // PEPE
        },
        {
          address: ADDRESSES.treasury,
          abi: TREASURY_ABI,
          functionName: "getKillPot" as const,
          args: [lane, 2] as const, // SHIB
        },
      ]),
      // Season treasury
      {
        address: ADDRESSES.treasury,
        abi: TREASURY_ABI,
        functionName: "getSeasonTreasury" as const,
        args: [seasonId ?? 1n] as const,
      },
      // Creators balance
      {
        address: ADDRESSES.treasury,
        abi: TREASURY_ABI,
        functionName: "creatorsBalance" as const,
      },
      // Buyback reserve
      {
        address: ADDRESSES.treasury,
        abi: TREASURY_ABI,
        functionName: "buybackReserve" as const,
      },
    ],
    query: { refetchInterval: 15_000, enabled: seasonId !== undefined },
  });

  const killPots = [0, 1, 2].map((lane) => ({
    pepe: (data?.[lane * 2]?.result as bigint) ?? 0n,
    shib: (data?.[lane * 2 + 1]?.result as bigint) ?? 0n,
  }));

  return {
    killPots,
    seasonTreasury: (data?.[6]?.result as bigint) ?? 0n,
    creatorsBalance: (data?.[7]?.result as bigint) ?? 0n,
    buybackReserve: (data?.[8]?.result as bigint) ?? 0n,
  };
}

// ── Squad info for all lanes (3-step multicall) ──
export interface SegmentSquad {
  squadId: number;
  faction: number;
  unitType: number;
  effectiveUnits: number;
  isMarching: boolean;
  arrivalTime: number;
}

// laneSquads[laneId][segmentIndex] = SegmentSquad[]
export type LaneSquads = SegmentSquad[][][];

export function useLaneSquads(): LaneSquads {
  const client = usePublicClient();
  const [laneSquads, setLaneSquads] = useState<LaneSquads>(
    Array.from({ length: NUM_LANES }, () => Array.from({ length: 7 }, () => []))
  );

  const fetchSquads = useCallback(async () => {
    if (!client) return;

    const addr = ADDRESSES.gameEngine;
    const abi = GAME_ENGINE_ABI;

    // Step 1: Get bastion + marching counts for all lanes
    const countCalls = [];
    for (let lane = 0; lane < NUM_LANES; lane++) {
      countCalls.push({
        address: addr,
        abi,
        functionName: "getBastionSquadCount" as const,
        args: [lane] as const,
      });
      countCalls.push({
        address: addr,
        abi,
        functionName: "getMarchingSquadCount" as const,
        args: [lane] as const,
      });
    }

    const countResults = await client.multicall({ contracts: countCalls });

    const bastionCounts: number[] = [];
    const marchingCounts: number[] = [];
    for (let lane = 0; lane < NUM_LANES; lane++) {
      bastionCounts.push(Number(countResults[lane * 2]?.result ?? 0));
      marchingCounts.push(Number(countResults[lane * 2 + 1]?.result ?? 0));
    }

    // Step 2: Get all squad IDs
    const idCalls: { address: typeof addr; abi: typeof abi; functionName: string; args: readonly [number, number] }[] = [];
    const idMeta: { lane: number; isMarching: boolean }[] = [];

    for (let lane = 0; lane < NUM_LANES; lane++) {
      for (let i = 0; i < bastionCounts[lane]; i++) {
        idCalls.push({
          address: addr,
          abi,
          functionName: "bastionSquads",
          args: [lane, i] as const,
        });
        idMeta.push({ lane, isMarching: false });
      }
      for (let i = 0; i < marchingCounts[lane]; i++) {
        idCalls.push({
          address: addr,
          abi,
          functionName: "marchingSquads",
          args: [lane, i] as const,
        });
        idMeta.push({ lane, isMarching: true });
      }
    }

    if (idCalls.length === 0) {
      setLaneSquads(
        Array.from({ length: NUM_LANES }, () => Array.from({ length: 7 }, () => []))
      );
      return;
    }

    const idResults = await client.multicall({ contracts: idCalls });

    const squadIds: number[] = [];
    const squadMeta: { lane: number; isMarching: boolean }[] = [];
    for (let i = 0; i < idResults.length; i++) {
      const id = Number(idResults[i]?.result ?? 0);
      if (id > 0) {
        squadIds.push(id);
        squadMeta.push(idMeta[i]);
      }
    }

    if (squadIds.length === 0) {
      setLaneSquads(
        Array.from({ length: NUM_LANES }, () => Array.from({ length: 7 }, () => []))
      );
      return;
    }

    // Step 3: Get details for each squad
    const detailCalls: { address: typeof addr; abi: typeof abi; functionName: string; args: readonly [number] }[] = [];
    for (const id of squadIds) {
      detailCalls.push({
        address: addr,
        abi,
        functionName: "squads",
        args: [id] as const,
      });
      detailCalls.push({
        address: addr,
        abi,
        functionName: "getSquadSegment",
        args: [id] as const,
      });
      detailCalls.push({
        address: addr,
        abi,
        functionName: "getEffectiveUnits",
        args: [id] as const,
      });
    }

    const detailResults = await client.multicall({
      contracts: detailCalls,
    });

    // Build lane → segment → squad[] structure
    const result: LaneSquads = Array.from({ length: NUM_LANES }, () =>
      Array.from({ length: 7 }, () => [] as SegmentSquad[])
    );

    for (let i = 0; i < squadIds.length; i++) {
      const squadData = detailResults[i * 3]?.result as
        | [string, number, number, number, boolean, number, number, number, bigint, number]
        | undefined;
      const segment = Number(detailResults[i * 3 + 1]?.result ?? 0);
      const effective = Number(detailResults[i * 3 + 2]?.result ?? 0);

      if (!squadData || !squadData[4]) continue; // skip inactive

      const lane = squadMeta[i].lane;
      const deployedAt = Number(squadData[5]);
      const arrivalTime = deployedAt + 90 * 60; // MARCH_DURATION = 90 minutes
      if (lane < NUM_LANES && segment < 7) {
        result[lane][segment].push({
          squadId: squadIds[i],
          faction: squadData[3],
          unitType: squadData[2],
          effectiveUnits: effective,
          isMarching: squadMeta[i].isMarching,
          arrivalTime,
        });
      }
    }

    setLaneSquads(result);
  }, [client]);

  useEffect(() => {
    fetchSquads();
    const interval = setInterval(fetchSquads, 15_000);
    return () => clearInterval(interval);
  }, [fetchSquads]);

  return laneSquads;
}

// ── Battle history from BattleResolved events ──
export interface BattleRecord {
  laneId: number;
  winner: number;
  totalSurvivors: number;
  winnerPot: bigint;
  loserEarned: bigint;
  timestamp: number;
  blockNumber: bigint;
}

const BATTLE_EVENT = parseAbiItem(
  "event BattleResolved(uint8 indexed laneId, uint8 winner, uint256 totalSurvivors, uint256 winnerPot, uint256 loserEarned)"
);

export function useBattleHistory(): BattleRecord[] {
  const client = usePublicClient();
  const [battles, setBattles] = useState<BattleRecord[]>([]);

  const fetchBattles = useCallback(async () => {
    if (!client) return;

    try {
      const currentBlock = await client.getBlockNumber();
      const fromBlock = currentBlock > 50000n ? currentBlock - 50000n : 0n;

      const logs = await client.getLogs({
        address: ADDRESSES.gameEngine,
        event: BATTLE_EVENT,
        fromBlock,
        toBlock: "latest",
      });

      if (logs.length === 0) {
        setBattles([]);
        return;
      }

      // Get unique block numbers for timestamps
      const uniqueBlocks = [...new Set(logs.map((l) => l.blockNumber))];
      const blockMap = new Map<bigint, number>();
      await Promise.all(
        uniqueBlocks.map(async (bn) => {
          const block = await client.getBlock({ blockNumber: bn });
          blockMap.set(bn, Number(block.timestamp));
        })
      );

      const records: BattleRecord[] = logs
        .map((log) => ({
          laneId: Number(log.args.laneId ?? 0),
          winner: Number(log.args.winner ?? 0),
          totalSurvivors: Number(log.args.totalSurvivors ?? 0),
          winnerPot: log.args.winnerPot ?? 0n,
          loserEarned: log.args.loserEarned ?? 0n,
          timestamp: blockMap.get(log.blockNumber) ?? 0,
          blockNumber: log.blockNumber,
        }))
        .sort((a, b) => Number(b.blockNumber - a.blockNumber))
        .slice(0, 10);

      setBattles(records);
    } catch {
      // getLogs may fail on some RPCs; silently ignore
    }
  }, [client]);

  useEffect(() => {
    fetchBattles();
    const interval = setInterval(fetchBattles, 30_000);
    return () => clearInterval(interval);
  }, [fetchBattles]);

  return battles;
}
