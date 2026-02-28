import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  UnitsDeployed,
  SquadArrived,
  BattleResolved,
  SeasonStarted,
  SeasonEnded,
  WeatherChanged,
  SpecialEventStarted,
  HoldScoreUpdated,
  ZombieCleaned,
} from "../generated/GameEngine/GameEngine";
import {
  Season,
  Squad,
  Battle,
  Player,
  PlayerSeason,
  Lane,
  WeatherChange,
  SpecialEventChange,
  Activity,
} from "../generated/schema";

// ═══════════════════════════════════════════
//                  HELPERS
// ═══════════════════════════════════════════

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

function getOrCreatePlayerSeason(
  playerAddress: Bytes,
  seasonId: BigInt,
  faction: i32
): PlayerSeason {
  let id = playerAddress.toHexString() + "-" + seasonId.toString();
  let ps = PlayerSeason.load(id);
  if (ps == null) {
    ps = new PlayerSeason(id);
    ps.player = playerAddress.toHexString();
    ps.season = seasonId.toString();
    ps.faction = faction;
    ps.usdcSpent = BigInt.zero();
    ps.killRewardsEarned = BigInt.zero();
    ps.seasonClaimed = BigInt.zero();
    ps.squadsDeployed = BigInt.zero();
    ps.save();
  }
  return ps;
}

function getOrCreateLane(laneId: i32): Lane {
  let id = laneId.toString();
  let lane = Lane.load(id);
  if (lane == null) {
    lane = new Lane(id);
    lane.laneId = laneId;
    lane.holdScorePEPE = BigInt.zero();
    lane.holdScoreSHIB = BigInt.zero();
    lane.lastUpdated = BigInt.zero();
    lane.save();
  }
  return lane;
}

function createActivity(
  event_txHash: Bytes,
  logIndex: BigInt,
  type: string,
  seasonId: string | null,
  playerId: string | null,
  laneId: i32,
  faction: i32,
  details: string | null,
  timestamp: BigInt,
  blockNumber: BigInt
): void {
  let id = event_txHash.toHexString() + "-" + logIndex.toString();
  let activity = new Activity(id);
  activity.type = type;
  activity.season = seasonId;
  activity.player = playerId;
  activity.laneId = laneId;
  activity.faction = faction;
  activity.details = details;
  activity.timestamp = timestamp;
  activity.blockNumber = blockNumber;
  activity.txHash = event_txHash;
  activity.save();
}

// Track current season ID via a singleton entity
function getCurrentSeasonId(): string {
  // Find the latest active season by iterating from high IDs down
  // Since seasons are sequential, check recent ones
  for (let i = 100; i >= 1; i--) {
    let season = Season.load(i.toString());
    if (season != null) return i.toString();
  }
  return "2"; // fallback for current deployment
}

// ═══════════════════════════════════════════
//              EVENT HANDLERS
// ═══════════════════════════════════════════

export function handleSeasonStarted(event: SeasonStarted): void {
  let seasonId = event.params.seasonId;
  let season = new Season(seasonId.toString());
  season.seasonId = seasonId;
  season.startTime = event.params.startTime;
  season.endTime = null;
  season.active = true;
  season.winner = 0;
  season.holdScorePEPE = BigInt.zero();
  season.holdScoreSHIB = BigInt.zero();
  season.treasuryBalance = BigInt.zero();
  season.totalDeployments = BigInt.zero();
  season.totalBattles = BigInt.zero();
  season.top3 = null;
  season.save();

  // Reset lanes
  for (let i = 0; i < 3; i++) {
    let lane = getOrCreateLane(i);
    lane.holdScorePEPE = BigInt.zero();
    lane.holdScoreSHIB = BigInt.zero();
    lane.lastUpdated = event.block.timestamp;
    lane.save();
  }

  createActivity(
    event.transaction.hash,
    event.logIndex,
    "season_start",
    seasonId.toString(),
    null,
    -1,
    0,
    null,
    event.block.timestamp,
    event.block.number
  );
}

export function handleSeasonEnded(event: SeasonEnded): void {
  let seasonId = event.params.seasonId;
  let season = Season.load(seasonId.toString());
  if (season == null) return;

  season.active = false;
  season.endTime = event.block.timestamp;
  season.winner = event.params.winner;
  season.save();

  createActivity(
    event.transaction.hash,
    event.logIndex,
    "season_end",
    seasonId.toString(),
    null,
    -1,
    event.params.winner,
    null,
    event.block.timestamp,
    event.block.number
  );
}

export function handleUnitsDeployed(event: UnitsDeployed): void {
  let squadId = event.params.squadId;
  let ownerAddress = event.params.owner;
  let faction = event.params.faction;
  let laneId = event.params.laneId;

  let seasonId = getCurrentSeasonId();

  let player = getOrCreatePlayer(ownerAddress);
  player.totalUsdcSpent = player.totalUsdcSpent.plus(event.params.cost);
  player.save();

  let squad = new Squad(squadId.toString());
  squad.squadId = squadId;
  squad.owner = player.id;
  squad.laneId = laneId;
  squad.unitType = event.params.unitType;
  squad.faction = faction;
  squad.active = true;
  squad.deployedAt = event.block.timestamp;
  squad.bastionEnteredAt = null;
  squad.initialCount = BigInt.fromI32(event.params.count);
  squad.costPaid = event.params.cost;
  squad.season = seasonId; // Will be updated when we can determine current season
  squad.arrivedAt = null;
  squad.retreatedAt = null;
  squad.zombieCleanedAt = null;
  squad.save();

  // Update player-season
  let ps = getOrCreatePlayerSeason(
    ownerAddress,
    BigInt.fromString(seasonId),
    faction
  );
  ps.usdcSpent = ps.usdcSpent.plus(event.params.cost);
  ps.squadsDeployed = ps.squadsDeployed.plus(BigInt.fromI32(1));
  ps.save();

  // Update season stats
  let season = Season.load(seasonId);
  if (season != null) {
    season.totalDeployments = season.totalDeployments.plus(BigInt.fromI32(1));
    season.save();
  }

  createActivity(
    event.transaction.hash,
    event.logIndex,
    "deploy",
    seasonId,
    player.id,
    laneId,
    faction,
    '{"unitType":' +
      event.params.unitType.toString() +
      ',"count":' +
      event.params.count.toString() +
      ',"cost":"' +
      event.params.cost.toString() +
      '"}',
    event.block.timestamp,
    event.block.number
  );
}

export function handleSquadArrived(event: SquadArrived): void {
  let squad = Squad.load(event.params.squadId.toString());
  if (squad == null) return;

  squad.bastionEnteredAt = event.block.timestamp;
  squad.arrivedAt = event.block.timestamp;
  squad.save();

  createActivity(
    event.transaction.hash,
    event.logIndex,
    "arrive",
    squad.season,
    squad.owner,
    event.params.laneId,
    squad.faction,
    '{"squadId":"' + event.params.squadId.toString() + '"}',
    event.block.timestamp,
    event.block.number
  );
}

export function handleBattleResolved(event: BattleResolved): void {
  let id =
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString();

  let battle = new Battle(id);
  battle.season = getCurrentSeasonId();
  battle.laneId = event.params.laneId;
  battle.winner = event.params.winner;
  battle.totalSurvivors = event.params.totalSurvivors;
  battle.winnerPot = event.params.winnerPot;
  battle.loserEarned = event.params.loserEarned;
  battle.timestamp = event.block.timestamp;
  battle.blockNumber = event.block.number;
  battle.txHash = event.transaction.hash;
  battle.save();

  // Update season battle count
  let season = Season.load(battle.season);
  if (season != null) {
    season.totalBattles = season.totalBattles.plus(BigInt.fromI32(1));
    season.save();
  }

  createActivity(
    event.transaction.hash,
    event.logIndex,
    "battle",
    battle.season,
    null,
    event.params.laneId,
    event.params.winner,
    '{"survivors":"' +
      event.params.totalSurvivors.toString() +
      '","winnerPot":"' +
      event.params.winnerPot.toString() +
      '","loserEarned":"' +
      event.params.loserEarned.toString() +
      '"}',
    event.block.timestamp,
    event.block.number
  );
}

export function handleWeatherChanged(event: WeatherChanged): void {
  let id =
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString();

  let wc = new WeatherChange(id);
  wc.weather = event.params.weather;
  wc.timestamp = event.block.timestamp;
  wc.blockNumber = event.block.number;
  wc.save();

  createActivity(
    event.transaction.hash,
    event.logIndex,
    "weather",
    null,
    null,
    -1,
    0,
    '{"weather":' + event.params.weather.toString() + "}",
    event.block.timestamp,
    event.block.number
  );
}

export function handleSpecialEventStarted(event: SpecialEventStarted): void {
  let id =
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString();

  let se = new SpecialEventChange(id);
  se.eventType = event.params.evt;
  se.endsAt = event.params.endsAt;
  se.timestamp = event.block.timestamp;
  se.blockNumber = event.block.number;
  se.save();

  createActivity(
    event.transaction.hash,
    event.logIndex,
    "event",
    null,
    null,
    -1,
    0,
    '{"eventType":' +
      event.params.evt.toString() +
      ',"endsAt":"' +
      event.params.endsAt.toString() +
      '"}',
    event.block.timestamp,
    event.block.number
  );
}

export function handleHoldScoreUpdated(event: HoldScoreUpdated): void {
  let lane = getOrCreateLane(event.params.laneId);
  lane.holdScorePEPE = event.params.scorePEPE;
  lane.holdScoreSHIB = event.params.scoreSHIB;
  lane.lastUpdated = event.block.timestamp;
  lane.save();
}

export function handleZombieCleaned(event: ZombieCleaned): void {
  let squad = Squad.load(event.params.squadId.toString());
  if (squad == null) return;

  squad.active = false;
  squad.zombieCleanedAt = event.block.timestamp;
  squad.save();
}
