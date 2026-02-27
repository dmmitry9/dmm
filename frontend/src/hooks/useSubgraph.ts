import { useState, useEffect, useCallback } from "react";
import { querySubgraph, isSubgraphConfigured } from "../lib/subgraph";

// ── Types ──

export interface SubgraphBattle {
  id: string;
  laneId: number;
  winner: number;
  totalSurvivors: string;
  winnerPot: string;
  loserEarned: string;
  timestamp: number;
}

export interface SubgraphActivity {
  id: string;
  type: string;
  timestamp: number;
  player: string | null;
  faction: number;
  details: string;
}

export interface SubgraphPlayerStats {
  id: string;
  totalUsdcSpent: string;
  totalKillRewards: string;
  totalWithdrawn: string;
  totalSquadsDeployed: number;
}

export interface SubgraphLeaderboardEntry {
  player: { id: string };
  faction: number;
  usdcSpent: string;
  killRewards: string;
  squadsDeployed: number;
}

// ── Hooks ──

/** Battle history from subgraph (richer than on-chain log scanning) */
export function useSubgraphBattles(seasonId?: string, limit = 15) {
  const [battles, setBattles] = useState<SubgraphBattle[]>([]);

  const fetch = useCallback(async () => {
    if (!isSubgraphConfigured() || !seasonId) return;
    const data = await querySubgraph<{ battles: SubgraphBattle[] }>(`
      query($seasonId: String!, $limit: Int!) {
        battles(
          where: { season: $seasonId }
          orderBy: timestamp
          orderDirection: desc
          first: $limit
        ) {
          id
          laneId
          winner
          totalSurvivors
          winnerPot
          loserEarned
          timestamp
        }
      }
    `, { seasonId, limit });
    if (data?.battles) setBattles(data.battles);
  }, [seasonId, limit]);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, 30_000);
    return () => clearInterval(interval);
  }, [fetch]);

  return battles;
}

/** Recent activity feed (all event types) */
export function useSubgraphActivity(limit = 20) {
  const [activities, setActivities] = useState<SubgraphActivity[]>([]);

  const fetch = useCallback(async () => {
    if (!isSubgraphConfigured()) return;
    const data = await querySubgraph<{ activities: SubgraphActivity[] }>(`
      query($limit: Int!) {
        activities(
          orderBy: timestamp
          orderDirection: desc
          first: $limit
        ) {
          id
          type
          timestamp
          player
          faction
          details
        }
      }
    `, { limit });
    if (data?.activities) setActivities(data.activities);
  }, [limit]);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, 15_000);
    return () => clearInterval(interval);
  }, [fetch]);

  return activities;
}

/** Season leaderboard — top players by USDC spent */
export function useSubgraphLeaderboard(seasonId?: string, limit = 20) {
  const [entries, setEntries] = useState<SubgraphLeaderboardEntry[]>([]);

  const fetch = useCallback(async () => {
    if (!isSubgraphConfigured() || !seasonId) return;
    const data = await querySubgraph<{ playerSeasons: SubgraphLeaderboardEntry[] }>(`
      query($seasonId: String!, $limit: Int!) {
        playerSeasons(
          where: { season: $seasonId }
          orderBy: usdcSpent
          orderDirection: desc
          first: $limit
        ) {
          player { id }
          faction
          usdcSpent
          killRewards
          squadsDeployed
        }
      }
    `, { seasonId, limit });
    if (data?.playerSeasons) setEntries(data.playerSeasons);
  }, [seasonId, limit]);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, 30_000);
    return () => clearInterval(interval);
  }, [fetch]);

  return entries;
}

/** Individual player stats */
export function useSubgraphPlayerStats(address?: string) {
  const [stats, setStats] = useState<SubgraphPlayerStats | null>(null);

  const fetch = useCallback(async () => {
    if (!isSubgraphConfigured() || !address) return;
    const id = address.toLowerCase();
    const data = await querySubgraph<{ player: SubgraphPlayerStats | null }>(`
      query($id: ID!) {
        player(id: $id) {
          id
          totalUsdcSpent
          totalKillRewards
          totalWithdrawn
          totalSquadsDeployed
        }
      }
    `, { id });
    if (data) setStats(data.player);
  }, [address]);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, 30_000);
    return () => clearInterval(interval);
  }, [fetch]);

  return stats;
}
