import { useReadContract, useReadContracts } from "wagmi";
import { ADDRESSES, GAME_ENGINE_ABI, TREASURY_ABI, ERC20_ABI } from "../config/contracts";

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
