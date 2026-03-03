import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  SeasonFinalized,
  SeasonClaimed,
  Withdrawn,
  TreasurySeeded,
  TreasuryDonation,
  KillRewardDistributed,
  PartialKillRewardDistributed,
} from "../generated/Treasury/Treasury";
import {
  Season,
  Player,
  PlayerSeason,
  TreasuryState,
  Activity,
} from "../generated/schema";

// ═══════════════════════════════════════════
//                  HELPERS
// ═══════════════════════════════════════════

function getOrCreateTreasuryState(): TreasuryState {
  let state = TreasuryState.load("global");
  if (state == null) {
    state = new TreasuryState("global");
    state.creatorsWithdrawn = BigInt.zero();
    state.buybackWithdrawn = BigInt.zero();
    state.totalSeeded = BigInt.zero();
    state.totalDonated = BigInt.zero();
    state.save();
  }
  return state;
}

function getOrCreatePlayer(address: Bytes): Player {
  let id = address.toHexString();
  let player = Player.load(id);
  if (player == null) {
    player = new Player(id);
    player.address = address;
    player.totalUsdcSpent = BigInt.zero();
    player.totalKillRewards = BigInt.zero();
    player.totalWithdrawn = BigInt.zero();
    player.pendingRewards = BigInt.zero();
    player.save();
  }
  return player;
}

// ═══════════════════════════════════════════
//              EVENT HANDLERS
// ═══════════════════════════════════════════

export function handleSeasonFinalized(event: SeasonFinalized): void {
  let seasonId = event.params.seasonId;
  let season = Season.load(seasonId.toString());
  if (season == null) return;

  season.winner = event.params.winnerFaction;
  season.treasuryBalance = event.params.treasuryBalance;
  season.save();

  let activity = new Activity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  activity.type = "season_finalized";
  activity.season = seasonId.toString();
  activity.player = null;
  activity.laneId = -1;
  activity.faction = event.params.winnerFaction;
  activity.details =
    '{"treasuryBalance":"' + event.params.treasuryBalance.toString() + '"}';
  activity.timestamp = event.block.timestamp;
  activity.blockNumber = event.block.number;
  activity.txHash = event.transaction.hash;
  activity.save();
}

export function handleSeasonClaimed(event: SeasonClaimed): void {
  let player = getOrCreatePlayer(event.params.player);
  player.pendingRewards = player.pendingRewards.plus(event.params.amount);
  player.save();

  let psId =
    event.params.player.toHexString() +
    "-" +
    event.params.seasonId.toString();
  let ps = PlayerSeason.load(psId);
  if (ps != null) {
    ps.seasonClaimed = ps.seasonClaimed.plus(event.params.amount);
    ps.save();
  }

  let activity = new Activity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  activity.type = "claim";
  activity.season = event.params.seasonId.toString();
  activity.player = player.id;
  activity.laneId = -1;
  activity.faction = 0;
  activity.details = '{"amount":"' + event.params.amount.toString() + '"}';
  activity.timestamp = event.block.timestamp;
  activity.blockNumber = event.block.number;
  activity.txHash = event.transaction.hash;
  activity.save();
}

export function handleWithdrawn(event: Withdrawn): void {
  let player = getOrCreatePlayer(event.params.player);
  player.totalWithdrawn = player.totalWithdrawn.plus(event.params.amount);
  player.pendingRewards = player.pendingRewards.minus(event.params.amount);
  if (player.pendingRewards.lt(BigInt.zero())) {
    player.pendingRewards = BigInt.zero();
  }
  player.save();
}

export function handleTreasurySeeded(event: TreasurySeeded): void {
  let state = getOrCreateTreasuryState();
  state.totalSeeded = state.totalSeeded.plus(event.params.amount);
  state.save();

  let season = Season.load(event.params.seasonId.toString());
  if (season != null) {
    season.treasuryBalance = season.treasuryBalance.plus(event.params.amount);
    season.save();
  }
}

export function handleTreasuryDonation(event: TreasuryDonation): void {
  let state = getOrCreateTreasuryState();
  state.totalDonated = state.totalDonated.plus(event.params.amount);
  state.save();

  let season = Season.load(event.params.seasonId.toString());
  if (season != null) {
    season.treasuryBalance = season.treasuryBalance.plus(event.params.amount);
    season.save();
  }
}

export function handleKillRewardDistributed(
  event: KillRewardDistributed
): void {
  // Aggregate tracking — individual rewards tracked via pendingRewards
}

export function handlePartialKillRewardDistributed(
  event: PartialKillRewardDistributed
): void {
  // Aggregate tracking — individual rewards tracked via pendingRewards
}

