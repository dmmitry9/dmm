// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

enum UnitType  { NONE, SWORDSMAN, SPEARMAN, CAVALRY }
enum Faction   { NONE, PEPE, SHIB }
enum Weather   { NONE, RAINY, SUNNY, FOGGY }
// RAINY  = +20% Spearman
// SUNNY  = +20% Cavalry
// FOGGY  = +20% Swordsman
enum SpecialEvent { NONE, EPIDEMIC, HARVEST, ECLIPSE }

/// @dev Packed into 2 storage slots.
/// Slot 0 (29 bytes): owner(20) + laneId(1) + unitType(1) + faction(1) + active(1) + deployedAt(5)
/// Slot 1 (29 bytes): bastionEnteredAt(5) + initialCount(4) + originalCount(4) + costPaid(12) + seasonId(4)
struct Squad {
    address  owner;
    uint8    laneId;
    UnitType unitType;
    Faction  faction;
    bool     active;
    uint40   deployedAt;
    uint40   bastionEnteredAt; // 0 = not yet in bastion
    uint32   initialCount;
    uint32   originalCount;    // set once at deploy, never modified (for proportional kill pot)
    uint96   costPaid;
    uint32   seasonId;
}

/// @dev 2 storage slots.
/// Slot 0: lastHoldScoreUpdate(5) + contestedAtUpdate(1) + holdScorePEPE(16) = 22 bytes
/// Slot 1: holdScoreSHIB(16) = 16 bytes
struct BastionState {
    uint40  lastHoldScoreUpdate;
    bool    contestedAtUpdate;
    uint128 holdScorePEPE;
    uint128 holdScoreSHIB;
}

/// @dev 2 storage slots.
/// Slot 0: usdcSpent(16) + killsUsdcValue(12) = 28 bytes
/// Slot 1: holdScoreContrib(16) = 16 bytes
struct PlayerStats {
    uint128 usdcSpent;
    uint96  killsUsdcValue;
    uint128 holdScoreContrib;
}
