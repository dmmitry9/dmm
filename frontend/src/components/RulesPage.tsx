export default function RulesPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-game-bg">
      <header className="border-b border-game-border px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">
            📜 <span className="text-pepe">PEPE</span> vs{" "}
            <span className="text-shib">SHIB</span> — Full Rules
          </h1>
          <button
            onClick={onBack}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            ← Back to Game
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8 text-gray-300 text-sm leading-relaxed">
        {/* Overview */}
        <Section title="🎮 Overview">
          <p>
            PEPE vs SHIB is an on-chain strategy game on Base L2.
            Two factions compete for control of 3 battlefield lanes.
            Recruit units with USDC, march them to the enemy bastion, win battles, and earn rewards.
            Each season lasts <B>7 days</B>.
          </p>
        </Section>

        {/* Factions & Recruitment */}
        <Section title="🐸🐕 Factions & Recruitment">
          <ul className="list-disc pl-5 space-y-1">
            <li>Pick <span className="text-pepe font-semibold">PEPE</span> or{" "}
              <span className="text-shib font-semibold">SHIB</span> — you are locked to one faction per season.</li>
            <li>Base unit cost: <B>$5 USDC</B>. Max: <B>$7 USDC</B>.</li>
            <li>Price increases linearly when the dominant faction leads by <B>100–1,000 units</B>.</li>
            <li>The underdog faction always pays the base price — join the weaker side for cheaper units.</li>
          </ul>
        </Section>

        {/* Battlefield */}
        <Section title="⚔️ Battlefield">
          <ul className="list-disc pl-5 space-y-1">
            <li><B>3 lanes</B>, each with <B>7 segments</B> (PEPE base → 3 segments → Bastion → 3 segments → SHIB base).</li>
            <li>Units march from your base toward the enemy bastion 🏰 (segment 3).</li>
            <li>March duration: <B>90 minutes</B> (30 min per segment).</li>
            <li>When both factions reach the bastion, a battle is triggered.</li>
          </ul>
        </Section>

        {/* Unit Types & RPS */}
        <Section title="🗡️ Unit Types — Rock-Paper-Scissors">
          <div className="flex items-center gap-2 text-lg mb-3 font-bold">
            <span>⚔️ Swordsman</span>
            <span className="text-gray-500">&gt;</span>
            <span>🔱 Spearman</span>
            <span className="text-gray-500">&gt;</span>
            <span>🐎 Cavalry</span>
            <span className="text-gray-500">&gt;</span>
            <span>⚔️ Swordsman</span>
          </div>
          <ul className="list-disc pl-5 space-y-1">
            <li>Winning matchup grants a <B>1.5× combat power</B> multiplier.</li>
            <li>Choose your unit type strategically based on what the enemy has deployed.</li>
          </ul>
        </Section>

        {/* Weather */}
        <Section title="🌦️ Weather System">
          <p className="mb-2">Weather changes every <B>6 hours</B> via on-chain VRF randomness:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>🌧️ <B>Rainy</B> — Spearmen get <B>+20%</B> combat bonus.</li>
            <li>☀️ <B>Sunny</B> — Cavalry gets <B>+20%</B> combat bonus.</li>
            <li>🌫️ <B>Foggy</B> — Swordsmen get <B>+20%</B> combat bonus.</li>
          </ul>
        </Section>

        {/* Special Events */}
        <Section title="🎲 Special Events">
          <p className="mb-2">Random events last <B>2 hours</B>, with an <B>8-hour cooldown</B> between them:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>🦠 <B>Epidemic</B> — Attrition decay rate is <B>doubled</B> (units die faster).</li>
            <li>🌾 <B>Harvest</B> — Attrition decay rate is <B>halved</B> (units last longer).</li>
            <li>🌑 <B>Eclipse</B> — RPS advantage is <B>neutralized</B> (all units fight at equal multiplier).</li>
          </ul>
          <p className="text-gray-500 mt-1">25% chance for each event type, 25% chance for no event.</p>
        </Section>

        {/* Attrition */}
        <Section title="💀 Attrition (Unit Decay)">
          <ul className="list-disc pl-5 space-y-1">
            <li>Units take <B>no damage</B> during the 90-minute march.</li>
            <li>Once in the bastion, units decay at <B>~4% per hour</B> (0.96^h formula).</li>
            <li>After 7 days (full season), a unit is reduced to <B>0.1%</B> of its original strength.</li>
            <li>When effective units hit 0, the squad is removed and <B>70% of its original cost</B> goes to the season treasury.</li>
            <li>Epidemic doubles the effective hours; Harvest halves them.</li>
          </ul>
        </Section>

        {/* Battle Resolution */}
        <Section title="⚔️ Battle Resolution">
          <ul className="list-disc pl-5 space-y-1">
            <li>Triggered when both factions are present in the same bastion.</li>
            <li><B>Combat power</B> = effective units × RPS multiplier × weather bonus.</li>
            <li>The faction with higher total combat power wins.</li>
            <li>Tie-breaker: earliest arrival → lowest squad ID.</li>
            <li>Winner&apos;s casualties: proportional to the power ratio. Loser is eliminated.</li>
            <li><B>Winner</B> claims <B>100% of the loser&apos;s kill pot</B> for that lane.</li>
            <li><B>Loser</B> earns a <B>partial share</B> of the winner&apos;s kill pot, based on casualties inflicted.</li>
          </ul>
        </Section>

        {/* Retreat */}
        <Section title="🏃 Retreat">
          <ul className="list-disc pl-5 space-y-1">
            <li>You can retreat units <B>before</B> they reach the bastion.</li>
            <li>Refund: <B>80%</B> of the original deployment cost.</li>
            <li>The remaining 20% stays in the kill pot.</li>
          </ul>
        </Section>

        {/* Treasury & Economy */}
        <Section title="💰 Treasury & Economy">
          <p className="mb-2">Every USDC spent on recruitment is split:</p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <Stat label="Kill Pot (battle rewards)" value="70%" />
            <Stat label="Current Season Pool" value="8%" />
            <Stat label="Next Season Pool" value="10%" />
            <Stat label="Season +2 Pool" value="5%" />
            <Stat label="Creators Fee" value="2%" />
            <Stat label="Buyback Reserve" value="5%" />
          </div>
          <ul className="list-disc pl-5 space-y-1">
            <li>At season end, all remaining kill pots are swept into the season treasury.</li>
            <li>Next-season seeding means new seasons always start with a prize pool.</li>
          </ul>
        </Section>

        {/* Hold Score & Farming */}
        <Section title="🏦 Bastion Holding & Farming">
          <ul className="list-disc pl-5 space-y-1">
            <li>Units in the bastion accumulate <B>hold score</B> = units × minutes held.</li>
            <li>Hold score determines your share of the <B>season treasury</B> at season end.</li>
            <li>⚠️ <B>Contested bastions</B> (both factions present) do <B>NOT</B> accumulate hold score — clear the enemy first!</li>
            <li>After the season ends, call <B>claim()</B> to receive your share proportional to hold score.</li>
          </ul>
        </Section>

        {/* Season NFT */}
        <Section title="🏆 Season NFT">
          <ul className="list-disc pl-5 space-y-1">
            <li>Each season lasts <B>7 days</B>.</li>
            <li>The winning faction is determined by total hold score across all 3 lanes.</li>
            <li>Top 3 players from the winning faction receive a <B>Season Champion NFT</B> (on-chain SVG).</li>
            <li>Ranks: 🥇 1st Place, 🥈 2nd Place, 🥉 3rd Place.</li>
            <li>NFTs are collectibles with no financial rights.</li>
          </ul>
        </Section>

        {/* Withdrawals */}
        <Section title="💸 Claiming & Withdrawing">
          <ul className="list-disc pl-5 space-y-1">
            <li>Kill pot rewards are added to your <B>pending balance</B> automatically after battles.</li>
            <li>Season treasury share requires calling <B>claim(seasonId)</B> after the season ends.</li>
            <li>Call <B>withdraw()</B> at any time to transfer all pending USDC to your wallet.</li>
          </ul>
        </Section>

        <div className="text-center pt-4 border-t border-game-border">
          <button
            onClick={onBack}
            className="text-pepe hover:text-pepe/80 transition-colors font-semibold"
          >
            ← Back to Game
          </button>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card space-y-2">
      <h2 className="text-base font-bold text-gray-100">{title}</h2>
      {children}
    </div>
  );
}

function B({ children }: { children: React.ReactNode }) {
  return <span className="text-white font-semibold">{children}</span>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-800/50 rounded px-3 py-1.5 flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span className="text-yellow-400 font-bold">{value}</span>
    </div>
  );
}
