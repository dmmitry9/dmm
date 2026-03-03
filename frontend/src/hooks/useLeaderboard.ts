import { useState, useEffect, useCallback, useMemo } from "react";
import { useReadContracts } from "wagmi";
import { querySubgraph, isSubgraphConfigured } from "../lib/subgraph";
import { ADDRESSES, GAME_ENGINE_ABI, TREASURY_ABI } from "../config/contracts";

export type LeaderboardTab = "spenders" | "active" | "earners" | "roi" | "hold";

export interface LeaderboardEntry {
  address: string;
  faction: number;
  usdcSpent: bigint;
  squadsDeployed: number;
  earnings: bigint;
  holdScore: bigint;
  roi: number;
}

interface SubgraphPlayerSeason {
  player: { id: string };
  faction: number;
  usdcSpent: string;
  squadsDeployed: string;
}

export function useLeaderboard(seasonId: bigint | undefined) {
  const [subgraphData, setSubgraphData] = useState<SubgraphPlayerSeason[]>([]);

  const fetchSubgraph = useCallback(async () => {
    if (!isSubgraphConfigured() || seasonId === undefined) return;
    const data = await querySubgraph<{
      playerSeasons: SubgraphPlayerSeason[];
    }>(
      `query($seasonId: String!) {
        playerSeasons(
          where: { season: $seasonId }
          orderBy: usdcSpent
          orderDirection: desc
          first: 50
        ) {
          player { id }
          faction
          usdcSpent
          squadsDeployed
        }
      }`,
      { seasonId: seasonId.toString() }
    );
    if (data?.playerSeasons) setSubgraphData(data.playerSeasons);
  }, [seasonId]);

  useEffect(() => {
    fetchSubgraph();
    const interval = setInterval(fetchSubgraph, 30_000);
    return () => clearInterval(interval);
  }, [fetchSubgraph]);

  const addresses = useMemo(
    () => subgraphData.map((p) => p.player.id as `0x${string}`),
    [subgraphData]
  );

  const { data: onChainData } = useReadContracts({
    contracts: addresses.flatMap((addr) => [
      {
        address: ADDRESSES.treasury,
        abi: TREASURY_ABI,
        functionName: "pendingRewards" as const,
        args: [addr] as const,
      },
      {
        address: ADDRESSES.gameEngine,
        abi: GAME_ENGINE_ABI,
        functionName: "getPlayerHoldScore" as const,
        args: [seasonId ?? 0n, addr] as const,
      },
    ]),
    query: {
      enabled: addresses.length > 0 && seasonId !== undefined,
      refetchInterval: 30_000,
    },
  });

  const entries: LeaderboardEntry[] = useMemo(() => {
    return subgraphData.map((p, i) => {
      const earnings = (onChainData?.[i * 2]?.result as bigint) ?? 0n;
      const holdScore = (onChainData?.[i * 2 + 1]?.result as bigint) ?? 0n;
      const spent = BigInt(p.usdcSpent || "0");
      const roi = spent > 0n ? Number(earnings * 10000n / spent) / 100 : 0;
      return {
        address: p.player.id,
        faction: p.faction,
        usdcSpent: spent,
        squadsDeployed: Number(p.squadsDeployed || "0"),
        earnings,
        holdScore,
        roi,
      };
    });
  }, [subgraphData, onChainData]);

  return entries;
}

export function sortLeaderboard(
  entries: LeaderboardEntry[],
  tab: LeaderboardTab
): LeaderboardEntry[] {
  const sorted = [...entries];
  switch (tab) {
    case "spenders":
      return sorted.sort((a, b) => (b.usdcSpent > a.usdcSpent ? 1 : -1));
    case "active":
      return sorted.sort((a, b) => b.squadsDeployed - a.squadsDeployed);
    case "earners":
      return sorted.sort((a, b) => (b.earnings > a.earnings ? 1 : -1));
    case "roi":
      return sorted.sort((a, b) => b.roi - a.roi);
    case "hold":
      return sorted.sort((a, b) => (b.holdScore > a.holdScore ? 1 : -1));
  }
}
