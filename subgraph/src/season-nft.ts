import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import { SeasonNFTMinted } from "../generated/SeasonNFT/SeasonNFT";
import {
  SeasonNFTToken,
  Player,
  Season,
  Activity,
} from "../generated/schema";

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

export function handleSeasonNFTMinted(event: SeasonNFTMinted): void {
  let tokenId = event.params.tokenId;
  let seasonId = event.params.seasonId;

  let player = getOrCreatePlayer(event.params.player);

  let nft = new SeasonNFTToken(tokenId.toString());
  nft.tokenId = tokenId;
  nft.season = seasonId.toString();
  nft.rank = event.params.rank;
  nft.faction = event.params.faction;
  nft.player = player.id;
  nft.mintedAt = event.block.timestamp;
  nft.save();

  let activity = new Activity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  activity.type = "nft_mint";
  activity.season = seasonId.toString();
  activity.player = player.id;
  activity.laneId = -1;
  activity.faction = event.params.faction;
  activity.details =
    '{"tokenId":"' +
    tokenId.toString() +
    '","rank":' +
    event.params.rank.toString() +
    "}";
  activity.timestamp = event.block.timestamp;
  activity.blockNumber = event.block.number;
  activity.txHash = event.transaction.hash;
  activity.save();
}
