// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseTest} from "../BaseTest.sol";
import {UnitType, Faction} from "../../src/types/GameTypes.sol";

contract FuzzPricing is BaseTest {
    uint256 constant BASE = 1_000_000;
    uint256 constant MAX  = 1_400_000;

    // ── Price always in [BASE*count, MAX*count] ──────────────────

    function testFuzz_priceBounds(
        uint8 faction,
        uint256 count,
        uint256 totalPEPE,
        uint256 totalSHIB
    ) external view {
        faction = uint8(bound(faction, 1, 2));
        count = bound(count, 1, 10_000);
        totalPEPE = bound(totalPEPE, 0, 1e12);
        totalSHIB = bound(totalSHIB, 0, 1e12);

        uint256 price = treasury.getUnitPrice(faction, count, totalPEPE, totalSHIB);

        assertGe(price, BASE * count, "Below base price");
        assertLe(price, MAX * count, "Above max price");
    }

    // ── Underdog faction always pays base price ──────────────────

    function testFuzz_underdogPaysBase(
        uint256 count,
        uint256 dominant,
        uint256 underdog
    ) external view {
        count = bound(count, 1, 10_000);
        dominant = bound(dominant, 1, 1e12);
        underdog = bound(underdog, 0, dominant - 1); // strict underdog

        // PEPE dominant → SHIB is underdog (faction=2)
        uint256 price = treasury.getUnitPrice(2, count, dominant, underdog);
        assertEq(price, BASE * count, "Underdog should pay base");
    }

    // ── Equal factions → both pay base ───────────────────────────

    function testFuzz_equalFactionsBothPayBase(
        uint256 count,
        uint256 total
    ) external view {
        count = bound(count, 1, 10_000);
        total = bound(total, 1, 1e12);

        uint256 pricePEPE = treasury.getUnitPrice(1, count, total, total);
        uint256 priceSHIB = treasury.getUnitPrice(2, count, total, total);

        assertEq(pricePEPE, BASE * count, "PEPE should pay base when equal");
        assertEq(priceSHIB, BASE * count, "SHIB should pay base when equal");
    }

    // ── Price symmetry: swapping faction+totals → same price ─────

    function testFuzz_priceSymmetry(
        uint256 count,
        uint256 totalA,
        uint256 totalB
    ) external view {
        count = bound(count, 1, 10_000);
        totalA = bound(totalA, 0, 1e12);
        totalB = bound(totalB, 0, 1e12);

        // PEPE dominant with totals (A, B) should equal SHIB dominant with (B, A)
        uint256 pricePEPE = treasury.getUnitPrice(1, count, totalA, totalB);
        uint256 priceSHIB = treasury.getUnitPrice(2, count, totalB, totalA);

        assertEq(pricePEPE, priceSHIB, "Price should be symmetric");
    }

    // ── count=0 always returns 0 ─────────────────────────────────

    function testFuzz_zeroCountReturnsZero(
        uint8 faction,
        uint256 totalPEPE,
        uint256 totalSHIB
    ) external view {
        faction = uint8(bound(faction, 1, 2));
        totalPEPE = bound(totalPEPE, 0, 1e12);
        totalSHIB = bound(totalSHIB, 0, 1e12);

        uint256 price = treasury.getUnitPrice(faction, 0, totalPEPE, totalSHIB);
        assertEq(price, 0, "Zero count should return zero");
    }

    // ── Dominant price monotonically increases with imbalance ────

    function testFuzz_dominantPriceIncreasesWithImbalance(
        uint256 count,
        uint256 dominant,
        uint256 underdog1,
        uint256 underdog2
    ) external view {
        count = bound(count, 1, 10_000);
        dominant = bound(dominant, 2, 1e12);
        underdog1 = bound(underdog1, 1, dominant - 1);
        underdog2 = bound(underdog2, 0, underdog1 - 1);

        // underdog2 < underdog1 → more imbalanced → higher or equal price
        uint256 price1 = treasury.getUnitPrice(1, count, dominant, underdog1);
        uint256 price2 = treasury.getUnitPrice(1, count, dominant, underdog2);

        assertGe(price2, price1, "More imbalance should mean higher price");
    }
}
