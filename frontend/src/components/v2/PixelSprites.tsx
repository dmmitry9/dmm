/**
 * Pixel Art Sprite Library
 * All sprites rendered via CSS box-shadow on a 1×1px div, scaled up.
 * Convention: Each "pixel" in the grid is 1px, then CSS scale(N) enlarges.
 */

interface SpriteProps {
  scale?: number;
  className?: string;
}

interface FactionSpriteProps extends SpriteProps {
  faction?: "pepe" | "shib";
}

// Helper: builds box-shadow string from pixel map
// pixels: [row][col] = color string or "" for transparent
function buildShadow(pixels: string[][]): string {
  const parts: string[] = [];
  for (let y = 0; y < pixels.length; y++) {
    for (let x = 0; x < pixels[y].length; x++) {
      const c = pixels[y][x];
      if (c) parts.push(`${x}px ${y}px ${c}`);
    }
  }
  return parts.join(",");
}

function SpriteDiv({
  shadow,
  w,
  h,
  scale = 2,
  className = "",
}: {
  shadow: string;
  w: number;
  h: number;
  scale?: number;
  className?: string;
}) {
  return (
    <div
      className={`sprite-inline ${className}`}
      style={{
        width: 1,
        height: 1,
        boxShadow: shadow,
        transform: `scale(${scale})`,
        transformOrigin: "top left",
        marginRight: w * scale - 1,
        marginBottom: h * scale - 1,
        imageRendering: "pixelated",
      }}
    />
  );
}

// ═══════════════════════════════════
//  FACTION ICONS
// ═══════════════════════════════════

const PEPE_FROG: string[][] = [
  ["","","","#2e7d32","#2e7d32","#2e7d32","#2e7d32","","","","#2e7d32","#2e7d32","#2e7d32","#2e7d32","",""],
  ["","","#2e7d32","#fff","#fff","#2e7d32","#2e7d32","#2e7d32","#2e7d32","#2e7d32","#2e7d32","#fff","#fff","#2e7d32","",""],
  ["","","#2e7d32","#fff","#111","#fff","#2e7d32","#2e7d32","#2e7d32","#2e7d32","#fff","#111","#fff","#2e7d32","",""],
  ["","","","#2e7d32","#2e7d32","#2e7d32","#4caf50","#4caf50","#4caf50","#4caf50","#2e7d32","#2e7d32","#2e7d32","","",""],
  ["","","#4caf50","#4caf50","#4caf50","#4caf50","#4caf50","#4caf50","#4caf50","#4caf50","#4caf50","#4caf50","#4caf50","#4caf50","",""],
  ["","#4caf50","#4caf50","#4caf50","#4caf50","#4caf50","#4caf50","#4caf50","#4caf50","#4caf50","#4caf50","#4caf50","#4caf50","#4caf50","#4caf50",""],
  ["#4caf50","#4caf50","#e53935","#e53935","#e53935","#e53935","#e53935","#e53935","#e53935","#e53935","#e53935","#e53935","#e53935","#e53935","#4caf50","#4caf50"],
  ["#4caf50","#e53935","#e53935","#fff","#e53935","#fff","#e53935","#fff","#e53935","#fff","#e53935","#fff","#e53935","#e53935","#e53935","#4caf50"],
  ["","#4caf50","#e53935","#e53935","#e53935","#e53935","#e53935","#e53935","#e53935","#e53935","#e53935","#e53935","#e53935","#e53935","#4caf50",""],
  ["","","#4caf50","#4caf50","#4caf50","#4caf50","#4caf50","#4caf50","#4caf50","#4caf50","#4caf50","#4caf50","#4caf50","#4caf50","",""],
];

export function PixelPepe({ scale = 2, className }: SpriteProps) {
  return <SpriteDiv shadow={buildShadow(PEPE_FROG)} w={16} h={10} scale={scale} className={className} />;
}

const SHIB_FOX: string[][] = [
  ["","","#ff6f00","","","","","","","","","","","#ff6f00","",""],
  ["","#ff6f00","#ff9800","#ff6f00","","","","","","","","#ff6f00","#ff9800","#ff6f00","",""],
  ["","#ff9800","#ff9800","#ff9800","#ff6f00","","","","","","#ff6f00","#ff9800","#ff9800","#ff9800","",""],
  ["#ff9800","#ff9800","#ffb74d","#ff9800","#ff9800","#ff6f00","","","","#ff6f00","#ff9800","#ff9800","#ffb74d","#ff9800","#ff9800",""],
  ["#ff9800","#fff","#111","#ffb74d","#ff9800","#ff9800","#ff6f00","#ff6f00","#ff6f00","#ff9800","#ff9800","#ffb74d","#111","#fff","#ff9800",""],
  ["","#ff9800","#ffb74d","#ffb74d","#ff9800","#ff9800","#ff9800","#ff9800","#ff9800","#ff9800","#ff9800","#ffb74d","#ffb74d","#ff9800","",""],
  ["","","#ff9800","#ffb74d","#ffb74d","#ffb74d","#fff","#111","#fff","#ffb74d","#ffb74d","#ffb74d","#ff9800","","",""],
  ["","","","#ff9800","#ffb74d","#ffb74d","#ffb74d","#ffb74d","#ffb74d","#ffb74d","#ffb74d","#ff9800","","","",""],
  ["","","","","#ff9800","#ff9800","#ffb74d","#ffb74d","#ffb74d","#ff9800","#ff9800","","","","",""],
  ["","","","","","","#ff9800","#ff9800","#ff9800","","","","","","",""],
];

export function PixelShib({ scale = 2, className }: SpriteProps) {
  return <SpriteDiv shadow={buildShadow(SHIB_FOX)} w={16} h={10} scale={scale} className={className} />;
}

// ═══════════════════════════════════
//  UNIT SPRITES
// ═══════════════════════════════════

const PEPE_GREEN = "#4caf50";
const PEPE_DARK = "#2e7d32";
const SHIB_ORANGE = "#ff9800";
const SHIB_DARK = "#e65100";
const SKIN = "#fdd835";
const METAL = "#9e9e9e";
const DARK_METAL = "#616161";

function swordsmanPixels(f: "pepe" | "shib"): string[][] {
  const c1 = f === "pepe" ? PEPE_GREEN : SHIB_ORANGE;
  const c2 = f === "pepe" ? PEPE_DARK : SHIB_DARK;
  return [
    ["","","","","","#555","","",""],
    ["","","","","#555","#999","#555","",""],
    ["","","","",SKIN,SKIN,SKIN,"",""],
    ["","","","",SKIN,"#111",SKIN,"",""],
    ["","","","","",c1,"","",""],
    ["","","METAL","",c1,c1,c1,"",""],
    ["","","METAL","",c1,c2,c1,"",""],
    ["","","METAL","",c1,c1,c1,"",""],
    ["","","","","",c1,"","",""],
    ["","","","",c2,"",c2,"",""],
    ["","","","",c2,"",c2,"",""],
  ];
}

export function PixelSwordsman({ faction = "pepe", scale = 2, className }: FactionSpriteProps) {
  return <SpriteDiv shadow={buildShadow(swordsmanPixels(faction))} w={9} h={11} scale={scale} className={className} />;
}

function spearmanPixels(f: "pepe" | "shib"): string[][] {
  const c1 = f === "pepe" ? PEPE_GREEN : SHIB_ORANGE;
  const c2 = f === "pepe" ? PEPE_DARK : SHIB_DARK;
  return [
    ["","","","","","","","#999",""],
    ["","","","","","","","#666",""],
    ["","","","","","","","#666",""],
    ["","","","",SKIN,SKIN,SKIN,"#666",""],
    ["","","","",SKIN,"#111",SKIN,"",""],
    ["","","","","",c1,"","",""],
    ["","","","",c1,c1,c1,"",""],
    ["","","","",c1,c2,c1,"",""],
    ["","","","",c1,c1,c1,"",""],
    ["","","","","",c1,"","",""],
    ["","","","",c2,"",c2,"",""],
  ];
}

export function PixelSpearman({ faction = "pepe", scale = 2, className }: FactionSpriteProps) {
  return <SpriteDiv shadow={buildShadow(spearmanPixels(faction))} w={9} h={11} scale={scale} className={className} />;
}

function cavalryPixels(f: "pepe" | "shib"): string[][] {
  const c1 = f === "pepe" ? PEPE_GREEN : SHIB_ORANGE;
  const c2 = f === "pepe" ? PEPE_DARK : SHIB_DARK;
  const HORSE = "#8d6e63";
  const HORSE_D = "#5d4037";
  return [
    ["","","","",SKIN,SKIN,"","","","","",""],
    ["","","","",SKIN,"#111","","","","","",""],
    ["","","","","",c1,"","","","","",""],
    ["","","","",c1,c1,c1,"","","","",""],
    ["","","","",c1,c2,c1,"","","","",""],
    ["","","",HORSE,HORSE,HORSE,HORSE,HORSE,HORSE,"","",""],
    ["","","",HORSE,HORSE,HORSE,HORSE,HORSE,HORSE,HORSE,"",""],
    ["","",HORSE_D,HORSE,HORSE,HORSE,HORSE,HORSE,HORSE,HORSE,HORSE_D,""],
    ["","","",HORSE_D,"","","","","",HORSE_D,"",""],
    ["","","",HORSE_D,"","","","","",HORSE_D,"",""],
  ];
}

export function PixelCavalry({ faction = "pepe", scale = 2, className }: FactionSpriteProps) {
  return <SpriteDiv shadow={buildShadow(cavalryPixels(faction))} w={12} h={10} scale={scale} className={className} />;
}

// ═══════════════════════════════════
//  BUILDING SPRITES
// ═══════════════════════════════════

const BASTION_PIXELS: string[][] = (() => {
  const S = "#7c3aed"; // purple
  const D = "#5b21b6";
  const L = "#a78bfa";
  const W = "#e0e0e0";
  return [
    [D,"","","",D,"","","",D,"","","",D],
    [D,S,"","",D,S,"","",D,S,"","",D],
    [D,S,S,"",D,S,S,"",D,S,S,"",D],
    [D,S,S,S,D,S,S,S,D,S,S,S,D],
    [D,S,S,S,S,S,S,S,S,S,S,S,D],
    [D,S,S,S,S,S,S,S,S,S,S,S,D],
    [D,S,S,S,S,L,W,L,S,S,S,S,D],
    [D,S,S,S,S,L,W,L,S,S,S,S,D],
    [D,S,S,S,S,S,W,S,S,S,S,S,D],
    [D,D,D,D,D,D,W,D,D,D,D,D,D],
  ];
})();

export function PixelBastion({ scale = 2, className }: SpriteProps) {
  return <SpriteDiv shadow={buildShadow(BASTION_PIXELS)} w={13} h={10} scale={scale} className={className} />;
}

function basePixels(f: "pepe" | "shib"): string[][] {
  const S = f === "pepe" ? PEPE_GREEN : SHIB_ORANGE;
  const D = f === "pepe" ? PEPE_DARK : SHIB_DARK;
  const W = "#e0e0e0";
  return [
    [D,"","",D,"","",D],
    [D,S,"",D,S,"",D],
    [D,S,S,D,S,S,D],
    [D,S,S,S,S,S,D],
    [D,S,S,S,S,S,D],
    [D,S,W,W,W,S,D],
    [D,S,W,W,W,S,D],
    [D,D,D,W,D,D,D],
  ];
}

export function PixelBase({ faction = "pepe", scale = 2, className }: FactionSpriteProps) {
  return <SpriteDiv shadow={buildShadow(basePixels(faction))} w={7} h={8} scale={scale} className={className} />;
}

// ═══════════════════════════════════
//  WEATHER SPRITES
// ═══════════════════════════════════

const RAIN_PIXELS: string[][] = [
  ["","","#90caf9","#90caf9","#90caf9","#90caf9","#90caf9","",""],
  ["","#90caf9","#64b5f6","#64b5f6","#64b5f6","#64b5f6","#64b5f6","#90caf9",""],
  ["#90caf9","#64b5f6","#64b5f6","#64b5f6","#64b5f6","#64b5f6","#64b5f6","#64b5f6","#90caf9"],
  ["#90caf9","#64b5f6","#64b5f6","#64b5f6","#64b5f6","#64b5f6","#64b5f6","#64b5f6","#90caf9"],
  ["","","","","","","","",""],
  ["","#42a5f5","","","#42a5f5","","","#42a5f5",""],
  ["","","","#42a5f5","","","","",""],
  ["","","#42a5f5","","","#42a5f5","","",""],
];

export function PixelRain({ scale = 2, className }: SpriteProps) {
  return <SpriteDiv shadow={buildShadow(RAIN_PIXELS)} w={9} h={8} scale={scale} className={className} />;
}

const SUN_PIXELS: string[][] = [
  ["","","","","#fdd835","","","",""],
  ["","","#fdd835","","#fdd835","","#fdd835","",""],
  ["","","","#ffeb3b","#ffeb3b","#ffeb3b","","",""],
  ["","#fdd835","#ffeb3b","#fff176","#fff176","#fff176","#ffeb3b","#fdd835",""],
  ["#fdd835","","#ffeb3b","#fff176","#fff176","#fff176","#ffeb3b","","#fdd835"],
  ["","#fdd835","#ffeb3b","#fff176","#fff176","#fff176","#ffeb3b","#fdd835",""],
  ["","","","#ffeb3b","#ffeb3b","#ffeb3b","","",""],
  ["","","#fdd835","","#fdd835","","#fdd835","",""],
  ["","","","","#fdd835","","","",""],
];

export function PixelSun({ scale = 2, className }: SpriteProps) {
  return <SpriteDiv shadow={buildShadow(SUN_PIXELS)} w={9} h={9} scale={scale} className={className} />;
}

const FOG_PIXELS: string[][] = [
  ["","","#bdbdbd","#bdbdbd","#bdbdbd","#bdbdbd","","",""],
  ["","#bdbdbd","#e0e0e0","#e0e0e0","#e0e0e0","#e0e0e0","#bdbdbd","",""],
  ["#bdbdbd","#e0e0e0","#e0e0e0","#e0e0e0","#e0e0e0","#e0e0e0","#e0e0e0","#bdbdbd",""],
  ["","","","","","","","",""],
  ["","#9e9e9e","#bdbdbd","#bdbdbd","#bdbdbd","#bdbdbd","#bdbdbd","#9e9e9e",""],
  ["#9e9e9e","#bdbdbd","#bdbdbd","#bdbdbd","#bdbdbd","#bdbdbd","#bdbdbd","#bdbdbd","#9e9e9e"],
];

export function PixelFog({ scale = 2, className }: SpriteProps) {
  return <SpriteDiv shadow={buildShadow(FOG_PIXELS)} w={9} h={6} scale={scale} className={className} />;
}

// ═══════════════════════════════════
//  UI ICON SPRITES (small)
// ═══════════════════════════════════

const SWORD_ICON: string[][] = [
  ["","","","","","","","#999"],
  ["","","","","","","#999","#ccc"],
  ["","","","","","#999","#ccc",""],
  ["","","","","#999","#ccc","",""],
  ["","","","#999","#ccc","","",""],
  ["","#8d6e63","#999","#ccc","","","",""],
  ["#8d6e63","#a1887f","#8d6e63","","","","",""],
  ["","#8d6e63","","","","","",""],
];

export function PixelSword({ scale = 2, className }: SpriteProps) {
  return <SpriteDiv shadow={buildShadow(SWORD_ICON)} w={8} h={8} scale={scale} className={className} />;
}

const TRIDENT_ICON: string[][] = [
  ["#999","","#999","","#999"],
  ["#999","","#999","","#999"],
  ["#ccc","#999","#ccc","#999","#ccc"],
  ["","","#8d6e63","",""],
  ["","","#8d6e63","",""],
  ["","","#8d6e63","",""],
  ["","","#8d6e63","",""],
  ["","","#8d6e63","",""],
];

export function PixelTrident({ scale = 2, className }: SpriteProps) {
  return <SpriteDiv shadow={buildShadow(TRIDENT_ICON)} w={5} h={8} scale={scale} className={className} />;
}

const HORSE_ICON: string[][] = [
  ["","","#8d6e63","#8d6e63","",""],
  ["","#8d6e63","#a1887f","#a1887f","#8d6e63",""],
  ["","#8d6e63","#a1887f","#111","#a1887f",""],
  ["#5d4037","#8d6e63","#a1887f","#a1887f","",""],
  ["","","#8d6e63","#8d6e63","",""],
  ["","","","#8d6e63","#8d6e63",""],
  ["","","","","#8d6e63","#8d6e63"],
];

export function PixelHorse({ scale = 2, className }: SpriteProps) {
  return <SpriteDiv shadow={buildShadow(HORSE_ICON)} w={6} h={7} scale={scale} className={className} />;
}

const TROPHY_ICON: string[][] = [
  ["","#fdd835","#fdd835","#fdd835","#fdd835","#fdd835",""],
  ["#fdd835","#ffeb3b","#ffeb3b","#ffeb3b","#ffeb3b","#ffeb3b","#fdd835"],
  ["#fdd835","#ffeb3b","#ffeb3b","#ffeb3b","#ffeb3b","#ffeb3b","#fdd835"],
  ["","#fdd835","#ffeb3b","#ffeb3b","#ffeb3b","#fdd835",""],
  ["","","#fdd835","#ffeb3b","#fdd835","",""],
  ["","","","#fdd835","","",""],
  ["","","#8d6e63","#8d6e63","#8d6e63","",""],
  ["","#8d6e63","#8d6e63","#8d6e63","#8d6e63","#8d6e63",""],
];

export function PixelTrophy({ scale = 2, className }: SpriteProps) {
  return <SpriteDiv shadow={buildShadow(TROPHY_ICON)} w={7} h={8} scale={scale} className={className} />;
}

const COIN_ICON: string[][] = [
  ["","#fdd835","#fdd835","#fdd835",""],
  ["#fdd835","#ffeb3b","#ffeb3b","#ffeb3b","#fdd835"],
  ["#fdd835","#ffeb3b","#fdd835","#ffeb3b","#fdd835"],
  ["#fdd835","#ffeb3b","#ffeb3b","#ffeb3b","#fdd835"],
  ["","#fdd835","#fdd835","#fdd835",""],
];

export function PixelCoin({ scale = 2, className }: SpriteProps) {
  return <SpriteDiv shadow={buildShadow(COIN_ICON)} w={5} h={5} scale={scale} className={className} />;
}

const SKULL_ICON: string[][] = [
  ["","#e0e0e0","#e0e0e0","#e0e0e0",""],
  ["#e0e0e0","#111","#e0e0e0","#111","#e0e0e0"],
  ["#e0e0e0","#e0e0e0","#e0e0e0","#e0e0e0","#e0e0e0"],
  ["#e0e0e0","#e0e0e0","#bdbdbd","#e0e0e0","#e0e0e0"],
  ["","#e0e0e0","#111","#e0e0e0",""],
];

export function PixelSkull({ scale = 2, className }: SpriteProps) {
  return <SpriteDiv shadow={buildShadow(SKULL_ICON)} w={5} h={5} scale={scale} className={className} />;
}

const STAR_ICON: string[][] = [
  ["","","#fdd835","",""],
  ["","#fdd835","#ffeb3b","#fdd835",""],
  ["#fdd835","#ffeb3b","#ffeb3b","#ffeb3b","#fdd835"],
  ["","#fdd835","#ffeb3b","#fdd835",""],
  ["#fdd835","","#fdd835","","#fdd835"],
];

export function PixelStar({ scale = 2, className }: SpriteProps) {
  return <SpriteDiv shadow={buildShadow(STAR_ICON)} w={5} h={5} scale={scale} className={className} />;
}

const SHIELD_ICON: string[][] = [
  ["","#999","#999","#999","#999","#999",""],
  ["#999","#64b5f6","#64b5f6","#42a5f5","#64b5f6","#64b5f6","#999"],
  ["#999","#64b5f6","#42a5f5","#fff","#42a5f5","#64b5f6","#999"],
  ["#999","#64b5f6","#42a5f5","#42a5f5","#42a5f5","#64b5f6","#999"],
  ["","#999","#64b5f6","#64b5f6","#64b5f6","#999",""],
  ["","","#999","#64b5f6","#999","",""],
  ["","","","#999","","",""],
];

export function PixelShield({ scale = 2, className }: SpriteProps) {
  return <SpriteDiv shadow={buildShadow(SHIELD_ICON)} w={7} h={7} scale={scale} className={className} />;
}

const ROCKET_ICON: string[][] = [
  ["","","#e0e0e0","",""],
  ["","#e0e0e0","#fff","#e0e0e0",""],
  ["","#e53935","#e0e0e0","#e53935",""],
  ["#e53935","#ff5722","#e0e0e0","#ff5722","#e53935"],
  ["","#ff5722","#e0e0e0","#ff5722",""],
  ["","#ff5722","#bdbdbd","#ff5722",""],
  ["","","#fdd835","",""],
  ["","#ff6f00","#fdd835","#ff6f00",""],
];

export function PixelRocket({ scale = 2, className }: SpriteProps) {
  return <SpriteDiv shadow={buildShadow(ROCKET_ICON)} w={5} h={8} scale={scale} className={className} />;
}

// ═══════════════════════════════════
//  TERRAIN (small decorations)
// ═══════════════════════════════════

const TREE_PIXELS: string[][] = [
  ["","","#2e7d32","",""],
  ["","#2e7d32","#4caf50","#2e7d32",""],
  ["#2e7d32","#4caf50","#4caf50","#4caf50","#2e7d32"],
  ["","","#8d6e63","",""],
  ["","","#8d6e63","",""],
];

export function PixelTree({ scale = 2, className }: SpriteProps) {
  return <SpriteDiv shadow={buildShadow(TREE_PIXELS)} w={5} h={5} scale={scale} className={className} />;
}

const ROCK_PIXELS: string[][] = [
  ["","#9e9e9e","#9e9e9e",""],
  ["#9e9e9e","#bdbdbd","#bdbdbd","#9e9e9e"],
  ["#757575","#9e9e9e","#9e9e9e","#757575"],
];

export function PixelRock({ scale = 2, className }: SpriteProps) {
  return <SpriteDiv shadow={buildShadow(ROCK_PIXELS)} w={4} h={3} scale={scale} className={className} />;
}

// ═══════════════════════════════════
//  HELPER: Get unit sprite by type
// ═══════════════════════════════════

export function PixelUnit({
  unitType,
  faction = "pepe",
  scale = 2,
  className,
}: {
  unitType: number;
  faction?: "pepe" | "shib";
  scale?: number;
  className?: string;
}) {
  switch (unitType) {
    case 1: return <PixelSwordsman faction={faction} scale={scale} className={className} />;
    case 2: return <PixelSpearman faction={faction} scale={scale} className={className} />;
    case 3: return <PixelCavalry faction={faction} scale={scale} className={className} />;
    default: return null;
  }
}

export function PixelWeather({ weather, scale = 2, className }: { weather: number } & SpriteProps) {
  switch (weather) {
    case 1: return <PixelRain scale={scale} className={className} />;
    case 2: return <PixelSun scale={scale} className={className} />;
    case 3: return <PixelFog scale={scale} className={className} />;
    default: return <PixelSun scale={scale} className={className} />;
  }
}
