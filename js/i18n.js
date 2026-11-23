// Sentralt språksystem (EN standard / NO valg) for 20-nivås kampanje + Evig Prestisje, 8 biomer, eskalering av dusører og butikkoppgraderinger

export const I18N = {
  en: {
    langBtn: 'Language: [EN] / NO',
    wristLangBtn: 'LANG: EN',
    saloonLangSign: 'LANGUAGE: [EN] / NO',
    saloonLangSub: 'Click or shoot to switch',
    pcHintHtml:
      'PC: WASD / Arrows = move • Click game = FPS Mouse Look (Esc = unlock) • Click/Hold = shoot / interact • 1–6 / Wheel = weapon • C = call horse • R = mount • E = eat • F = door • N = day/night<br />' +
      'Phone & Pad: Left stick = move • Swipe right side = smooth look • Hold FIRE + drag = aim & shoot • Meta Quest VR: Left stick = move • Right stick = turn • Trigger = shoot • Grip = eat / horse • Auto-Saved!',
    sensBtn: (pct) => `⚙ Sens: ${pct}%`,
    sensTitle: 'CONTROLS, GRAPHICS & SAVE',
    sensLookLabel: 'Look Sensitivity',
    sensInvertLabel: 'Invert Y-Axis',
    sensVrTurnLabel: 'VR Turn Mode',
    sensVrSnap: 'Snap 30°',
    sensVrSmooth: 'Smooth',
    sensPerfLabel: 'Graphics / FPS',
    sensPerfAuto: 'Auto (Smooth)',
    sensPerfFast: 'Max FPS',
    sensPerfUltra: 'Ultra',
    sensResetBtn: 'Reset Controls 100%',
    careerSaveLabel: 'Career Auto-Save',
    careerResetBtn: 'New Game (Reset)',
    careerResetConfirmBtn: 'Confirm Reset?',
    careerSavedTag: 'Auto-Saved ✓',
    touchFire: 'FIRE',
    touchWeapon: 'WEAPON',
    touchHorse: 'HORSE',
    touchEat: 'EAT +35',
    touchUse: 'DOOR / USE',
    touchTime: 'DAY / NIGHT',
    hudHealth: 'Health',
    hudGold: 'Gold',
    hudFood: 'Food',
    hudEatHint: '(E)',
    hudPelts: 'Pelts',
    hudOutfit: 'Outfit',
    hudWeapon: 'Weapon',
    hudDynamite: 'Dynamite',
    hudTime: 'Time',
    hudTargets: 'Bottles',
    hudTitle: 'Title',
    hudKills: 'Kills',
    hudPlaytime: 'Time Played',
    hudMastery: 'Mastery',
    hiddenStatus: 'Status: HIDDEN (Safe)',
    horseRidingHud: 'Mount: GALLOPING',
    horseCallBtn: 'CALL HORSE',
    horseMountBtn: 'DISMOUNT HORSE',
    horseCalledMsg: 'Mustang galloped to your side! Press R (or Left Grip) to mount.',
    day: 'Day',
    night: 'Night',
    outfits: ['Plain', 'Leather Vest', 'Wolf-Pelt Coat', 'Vampire Hunter Set', 'Mythic Frontier Duster'],
    weapons: {
      revolver: 'Peacemaker',
      revolverGold: 'Gold Peacemaker',
      shotgun: 'Coach Shotgun',
      rifle: 'Winchester Rifle',
      crossbow: 'Silver Crossbow',
      dynamite: 'Dynamite',
      hellfire: 'Hellfire Repeater'
    },
    legendTitle: 'Legend of the Frontier',
    prestigeTitle: (rank) => `Frontier Immortal (Prestige ${rank})`,
    wristHeader: 'COWBOY STATUS',
    wristLegendPrefix: 'HERO • ',
    eatBtn: 'EAT (+35 HP)',
    weaponCycleBtn: (wName) => `WEAPON: ${wName}`,
    questPrefix: 'Bounty',
    questNone: 'Bounty: Check Saloon Board',
    questAllDone: 'Bounty: Escalating Contracts Open!',

    // 20-Level Grand Campaign + Infinite Frontier Prestige Chapters (48h+ Marathon Progression)
    storyPrefix: 'Campaign',
    formatPrestigeProgress: (s) => {
      const ch = s.currentLevel;
      const pRank = s.prestigeRank || 1;
      const beasts = Math.min(s.prestigeGoalBeasts || 8, s.prestigeBeasts || 0);
      const foes = Math.min(s.prestigeGoalFoes || 10, s.prestigeFoes || 0);
      const bosses = Math.min(s.prestigeGoalBosses || 1, s.prestigeBosses || 0);
      return `Prestige ${pRank} • Chapter ${ch}: Frontier Operation (Wild Hunt ${beasts}/${s.prestigeGoalBeasts || 8} • Outlaws/Fiends ${foes}/${s.prestigeGoalFoes || 10} • World Boss ${bosses}/${s.prestigeGoalBosses || 1})`;
    },
    storyComplete: 'Campaign Complete: Legend of the Frontier! Continue Endless Prestige Chapters & Bounties.',
    acts: [
      {
        num: 1,
        title: 'Level 1/20 – Stranger in Dustwood',
        formatProgress: (s) => {
          const parts = [];
          parts.push(s.talkedSheriff ? 'Sheriff ✓' : 'Talk to Sheriff Vance');
          parts.push(`Deer ${Math.min(2, s.act1Deer)}/2`);
          parts.push(s.boughtGear ? 'Upgrade ✓' : 'Buy outfit or weapon');
          return `Level 1/20: Stranger in Dustwood (${parts.join(' • ')})`;
        }
      },
      {
        num: 2,
        title: 'Level 2/20 – Predators of Whispering Woods',
        formatProgress: (s) =>
          `Level 2/20: Whispering Woods (Wolves ${Math.min(3, s.level2Wolves)}/3 • Grizzly ${s.grizzlyDefeated ? '✓' : '0/1'})`
      },
      {
        num: 3,
        title: 'Level 3/20 – Outlaws of Crimson Canyon',
        formatProgress: (s) =>
          `Level 3/20: Crimson Canyon (Bandits ${Math.min(4, s.act2Bandits)}/4 • Captain ${s.captainDefeated ? '✓' : '0/1'})`
      },
      {
        num: 4,
        title: 'Level 4/20 – The Abandoned Gold Mine',
        formatProgress: (s) =>
          `Level 4/20: Deep Gold Mine (Barricades ${Math.min(2, s.barricadesCleared)}/2 • Foreman Slade ${s.sladeDefeated ? '✓' : '0/1'} • Mine Map ${s.mineMapCollected ? '✓' : '0/1'})`
      },
      {
        num: 5,
        title: 'Level 5/20 – The Armored Steam Train',
        formatProgress: (s) =>
          `Level 5/20: Southern Railway (Train Snipers ${Math.min(4, s.trainSnipersKilled)}/4 • Capture Gatling Wagon ${s.trainGatlingCaptured ? '✓' : '0/1'})`
      },
      {
        num: 6,
        title: 'Level 6/20 – Shadows of Boot Hill',
        formatProgress: (s) =>
          `Level 6/20: Boot Hill Graveyard (Vampires ${Math.min(4, s.bootHillVampires)}/4 • Silver Relics ${Math.min(2, s.bootHillRelics)}/2)`
      },
      {
        num: 7,
        title: 'Level 7/20 – The Sunken Catacombs',
        formatProgress: (s) =>
          `Level 7/20: Sunken Catacombs (Guardians ${Math.min(3, s.catacombGuardiansKilled)}/3 • Hellfire Repeater ${s.hellfireCollected ? '✓' : '0/1'})`
      },
      {
        num: 8,
        title: 'Level 8/20 – Blood Moon Reckoning',
        formatProgress: (s) =>
          s.bossActive
            ? `Level 8/20 [BLOOD MOON]: Slay LORD MALAKOR (${Math.max(0, Math.ceil(s.bossHp))}/${s.bossMaxHp} HP)!`
            : 'Level 8/20 [BLOOD MOON]: Ride west & face Lord Malakor at Boot Hill Chapel Altar!'
      },
      {
        num: 9,
        title: 'Level 9/20 – Trails of Thunder Plains',
        formatProgress: (s) =>
          `Level 9/20: Thunder Plains ↙ & Peaks ↖ (Plains Bison ${Math.min(3, s.bisonHunted || 0)}/3 • Mountain Cougars ${Math.min(2, s.cougarsHunted || 0)}/2)`
      },
      {
        num: 10,
        title: 'Level 10/20 – Legend of Silverpine Peak',
        formatProgress: (s) =>
          `Level 10/20: Silverpine Peak ↖ (White Stag ${Math.min(1, s.whiteStagsHunted || 0)}/1 • Alpha Wolves ${Math.min(3, s.alphaWolvesKilled || 0)}/3 • Moonstones ${Math.min(3, s.moonstonesCollected || 0)}/3)`
      },
      {
        num: 11,
        title: 'Level 11/20 – Siege of Fort Rattlesnake',
        formatProgress: (s) =>
          `Level 11/20: Outlaw Fort ↗ (Fort Desperados ${Math.min(5, s.fortBanditsKilled || 0)}/5 • Strongboxes ${Math.min(3, s.strongboxesRecovered || 0)}/3)`
      },
      {
        num: 12,
        title: 'Level 12/20 – Fall of General Cortez',
        formatProgress: (s) =>
          `Level 12/20: Fort Rattlesnake ↗ (Defeat Warlord GENERAL CORTEZ ${s.cortezDefeated ? '✓' : '0/1'})`
      },
      {
        num: 13,
        title: 'Level 13/20 – Cursed Ghost Town of Brimstone',
        formatProgress: (s) =>
          `Level 13/20: Brimstone ↘ (Raiders & Revenants ${Math.min(5, s.brimstoneFoesKilled || 0)}/5 • Cursed Totems ${Math.min(3, s.brimstoneTotemsShattered || 0)}/3)`
      },
      {
        num: 14,
        title: 'Level 14/20 – The Brimstone Marshal',
        formatProgress: (s) =>
          `Level 14/20: Brimstone Ghost Town ↘ (Defeat THE BRIMSTONE MARSHAL ${s.brimstoneMarshalDefeated ? '✓' : '0/1'})`
      },
      {
        num: 15,
        title: 'Level 15/20 – Whispers of the Stone Circle',
        formatProgress: (s) =>
          `Level 15/20: Ancient Stone Circle ↙ (Sun Runes ${Math.min(3, s.ancientRunesAttuned || 0)}/3 • Wendigo Stalkers ${Math.min(4, s.wendigosKilled || 0)}/4)`
      },
      {
        num: 16,
        title: 'Level 16/20 – Wrath of the Ancient Wendigo',
        formatProgress: (s) =>
          s.wendigoBossActive
            ? `Level 16/20 [STONE CIRCLE ↙]: Slay ANCIENT WENDIGO (${Math.max(0, Math.ceil(s.wendigoBossHp || 0))}/${s.wendigoBossMaxHp || 42} HP)!`
            : 'Level 16/20: Shoot or touch the Stone Circle Obelisk ↙ & slay THE ANCIENT WENDIGO!'
      },
      {
        num: 17,
        title: 'Level 17/20 – Master of Dustwood',
        formatProgress: (s) =>
          `Level 17/20: Frontier Mastery (Bounties Completed ${Math.min(5, s.totalBountiesDone || 0)}/5 • Master Gear/Smithing ${s.masterUpgradeBought ? '✓' : '0/1'})`
      },
      {
        num: 18,
        title: 'Level 18/20 – War Across Four Corners',
        formatProgress: (s) =>
          `Level 18/20: Four Corners Sweep (Elite Foes & Bosses ${Math.min(12, s.eliteKills || 0)}/12)`
      },
      {
        num: 19,
        title: 'Level 19/20 – Night of the Eclipse',
        formatProgress: (s) =>
          `Level 19/20: Eclipse Hunt (Vampires, Revenants & Wendigos ${Math.min(10, s.eclipseKills || 0)}/10)`
      },
      {
        num: 20,
        title: 'Level 20/20 – Eternal Blood Moon',
        formatProgress: (s) =>
          s.bossActive
            ? `Level 20/20 [FINAL RECKONING]: Slay ASCENDED MALAKOR (${Math.max(0, Math.ceil(s.bossHp))}/${s.bossMaxHp} HP)!`
            : 'Level 20/20 [FINAL RECKONING]: Summon & destroy Ascended Lord Malakor at Boot Hill Altar!'
      }
    ],
    sheriffBannerTitle: 'SHERIFF VANCE',
    sheriffQuotes: [
      '"Welcome to Dustwood! Hunt 2 deer north in Whispering Woods & buy an upgrade."',
      '"Cross the north timber bridge! A wolf pack & Grizzly terrorize Whispering Woods."',
      '"Captain Iron-Jaw\'s outlaws seized Crimson Canyon east. Clear their camp!"',
      '"Blast the Gold Mine barricades deep east, defeat Foreman Slade & grab the Mine Map!"',
      '"An armored Steam Train stopped south at z=75! Defeat the Snipers & seize the Gatling Wagon!"',
      '"Vampires stalk Boot Hill west! Slay 4 night fiends & recover 2 glowing Silver Relics."',
      '"Descend the stone stairs inside Boot Hill Chapel & claim the Hellfire Repeater!"',
      '"The Blood Moon rises! Ride west and strike down Lord Malakor at the Chapel!"',
      '"Malakor fled into shadow! Ride SW ↙ to Thunder Plains & NW ↖ to hunt Bison & Cougars."',
      '"Climb NW ↖ to Silverpine Peak! Hunt the White Stag, Alpha Wolves & touch 3 Moonstones."',
      '"General Cortez built Fort Rattlesnake NE ↗! Storm the gates & recover 3 Strongboxes!"',
      '"Finish the siege NE ↗! Take down Warlord General Cortez inside Fort Rattlesnake!"',
      '"Ride SE ↘ to cursed Brimstone Ghost Town! Shatter 3 Brimstone Totems & clear the raiders!"',
      '"The undead Brimstone Marshal rules SE ↘ Ghost Town. Put him in the ground!"',
      '"Ride SW ↙ to the Ancient Stone Circle! Attune 3 Sun Runes & hunt 4 Wendigo Stalkers."',
      '"Touch or shoot the green Obelisk in the Stone Circle ↙ to summon & slay the Ancient Wendigo!"',
      '"Complete 5 Saloon Bounties & forge Mythic Armor or Gunsmith Weapon Mastery in town!"',
      '"Sweep all four corners of the Frontier and defeat 12 Elite Outlaws, Revenants or Bosses!"',
      '"Darkness gathers! Slay 10 Vampires, Revenants or Wendigos to break the Eclipse!"',
      '"Ascended Lord Malakor awaits at Boot Hill Altar ←! End the Blood Moon once and for all!"',
      '"Immortal Legend! Endless Prestige Operations & escalating Saloon Bounties await across all 8 regions!"'
    ],

    // Town & 8-Region Signs
    signSaloonTitle: 'SALOON',
    signSaloonSub: 'TAVERN & BOUNTIES',
    signTailorTitle: 'TAILOR',
    signTailorSub: 'ARMOR & MAX HP',
    signGunsmithTitle: 'GUNSMITH',
    signGunsmithSub: 'WEAPONS & MASTERY',
    signSafeHouseTitle: 'SAFE HOUSE',
    signSafeHouseSub: 'SHERIFF SHELTER',
    signMineTitle: 'ABANDONED MINE',
    signMineSub: 'CRIMSON GOLD VEIN',
    signChapelTitle: 'BOOT HILL CHAPEL',
    signChapelSub: 'SUNKEN CATACOMBS & ALTAR',
    signSilverpineTitle: 'SILVERPINE PEAK',
    signSilverpineSub: 'MOONSTONE GROVE',
    signFortTitle: 'FORT RATTLESNAKE',
    signFortSub: 'CORTÉZ STRONGHOLD',
    signBrimstoneTitle: 'BRIMSTONE',
    signBrimstoneSub: 'CURSED GHOST TOWN',
    signStoneCircleTitle: 'ANCIENT STONE CIRCLE',
    signStoneCircleSub: 'THUNDER PLAINS OBELISK',

    roadWoodsTitle: '↑ WHISPERING WOODS',
    roadWoodsSub: 'River Bridge • Deer • Grizzlies',
    roadCanyonTitle: '→ CRIMSON CANYON',
    roadCanyonSub: 'Outlaw Camp & Deep Mine',
    roadGraveyardTitle: '← BOOT HILL',
    roadGraveyardSub: 'Graveyard & Sunken Catacombs',
    roadRailwayTitle: '↓ SOUTHERN RAILWAY',
    roadRailwaySub: 'Armored Steam Train & Bridge',
    roadTownTitle: 'DUSTWOOD TOWN',
    roadTownSub: 'Saloon • Gunsmith • Horse',
    roadSilverpineTitle: '↖ SILVERPINE PEAK',
    roadSilverpineSub: 'White Stag • Cougars • Moonstones',
    roadFortTitle: '↗ FORT RATTLESNAKE',
    roadFortSub: 'Outlaw Fort & General Cortez',
    roadBrimstoneTitle: '↘ BRIMSTONE TOWN',
    roadBrimstoneSub: 'Ghost Town & Brimstone Marshal',
    roadStoneCircleTitle: '↙ THUNDER PLAINS',
    roadStoneCircleSub: 'Bison • Stone Circle • Wendigo',

    // Tailor Shop (Outfits Tiers 1–4 + Repeatable Max HP Reinforcement & Rations)
    tailorBoardTitle: "TAILOR'S WORKSHOP",
    tailorInfo: (pelts, outfit, maxHp) =>
      `Pelts: ${pelts}  •  Outfit: ${outfit}  •  Max HP: ${maxHp || 100}`,
    tailorButtons: [
      'Leather Vest (2 Pelts) -> 25% Armor',
      'Wolf-Pelt Coat (4 Pelts) -> 50% Armor',
      'Vampire Hunter Set (6 Pelts) -> 70% Armor + 2x Night Dmg'
    ],
    tailorMythicBtn: (owned) =>
      owned
        ? 'Mythic Frontier Duster -> 80% Armor + 3x Night Dmg [EQUIPPED]'
        : 'Mythic Frontier Duster (12 Pelts) -> 80% Armor + 3x Night Dmg',
    tailorReinforceBtn: (cost, maxHp) =>
      maxHp >= 300
        ? `Reinforced Frontier Padding (Max ${maxHp} HP Reached!)`
        : `Reinforce Armor Padding (${cost} Pelts) -> +15 Max HP (Now ${maxHp})`,
    tailorRationsBtn: 'Smoked Venison Pack (2 Pelts) -> +4 Food & Full Heal',
    equippedTag: '[EQUIPPED]',
    ownedTag: '[OWNED]',
    tailorMsgSame: 'Already at maximum upgrade for this slot!',
    tailorMsgBetter: 'You already wear stronger armor!',
    tailorMsgNoPelts: 'Not enough pelts! Hunt deer, wolves, cougars or bison.',
    tailorMsgCrafted: 'New frontier gear crafted!',
    tailorMsgHpUp: (hp) => `Armor reinforced! Max Health increased to ${hp} HP!`,
    tailorMsgRations: '+4 Food & Full Health restored!',

    // Gunsmith Shop (Weapons + Repeatable Weapon Mastery Rank +1..+30)
    gunsmithBoardTitle: "GUNSMITH'S ARMORY",
    gunsmithInfo: (gold, pelts, dyn, mastery = 0) =>
      `Gold: ${gold}  •  Pelts: ${pelts}  •  Dynamite: ${dyn}${mastery > 0 ? `  •  Mastery +${mastery * 20}%` : ''}`,
    gunsmithButtons: [
      'Double-Barrel Shotgun (25 Gold) -> 6-Pellet Heavy Blast',
      'Winchester Rifle (40 Gold) -> Long-Range Precision (3x Dmg)',
      'Silver Crossbow (65 Gold + 2 Pelts) -> 3x Burn vs Undead',
      '3x Dynamite Pack (15 Gold) -> Thrown 2.2s Explosive Blast',
      'Hellfire Repeater (120 Gold) -> Rapid Arcane Silver Gatling (Lv 7+)'
    ],
    gunsmithMasteryBtn: (nextRank, cost) =>
      `Forge Masterwork Rifling Lv.${nextRank} (${cost} Gold) -> +20% All Weapon Dmg`,
    gunsmithMsgLockedLevel: 'Unlock the Sunken Catacombs (Level 7) or claim it below Boot Hill Chapel!',
    gunsmithMsgOwned: 'Weapon unlocked! Switched to it.',
    gunsmithMsgNoGold: 'Not enough Gold! Hunt bounties, strongboxes or bosses.',
    gunsmithMsgNoPelts: 'Need 2 Pelts + 65 Gold for Silver Crossbow!',
    gunsmithMsgBoughtWeapon: (name) => `Unlocked & equipped: ${name}!`,
    gunsmithMsgBoughtDynamite: (count) => `+3 Dynamite purchased! (Total: ${count})`,
    gunsmithMsgMasteryUp: (rank, pct) => `Weapon Mastery Lv.${rank} forged! (+${pct}% Damage!)`,

    // Escalating Bounty Board (Infinite Tiers 1 -> 100+)
    questBoardTitle: "SHERIFF'S BOUNTY BOARD",
    questBoardActiveSub: (title, prog, goal, gold) =>
      `Active: ${title} (${prog}/${goal})  •  Gold: ${gold}`,
    questBoardIdleSub: (done, gold) =>
      `Escalating Contracts • Total Cleared: ${done} • Gold: ${gold}`,
    badgeOpen: 'OPEN',
    badgeActive: 'ACTIVE',
    badgeDone: 'NEXT TIER',
    quests: {
      deer_hunt: {
        title: 'Frontier Big-Game Hunt',
        formatTask: (tier, goal) =>
          `"Frontier Hunt ${tier > 1 ? `Tier ${tier}` : ''}" – Hunt ${goal} beasts (Deer, Cougars, Grizzlies, Bison)`,
        formatReward: (gold, food, pelts, first) =>
          first
            ? `Reward: +${gold} Gold, +${food} Food, +${pelts} Pelts & Sheriff Star`
            : `Reward: +${gold} Gold, +${food} Food & +${pelts} Pelts`
      },
      bandit_clear: {
        title: 'Outlaw & Fort Warrant',
        formatTask: (tier, goal) =>
          `"Outlaw Warrant ${tier > 1 ? `Tier ${tier}` : ''}" – Defeat ${goal} outlaws (Canyon, Fort, Brimstone)`,
        formatReward: (gold, _f, _p, first) =>
          first
            ? `Reward: +${gold} Gold & Golden Revolver (2x base damage)`
            : `Reward: +${gold} Gold & +1 Dynamite`
      },
      night_guardian: {
        title: 'Occult & Monster Purge',
        formatTask: (tier, goal) =>
          `"Occult Purge ${tier > 1 ? `Tier ${tier}` : ''}" – Slay ${goal} Vampires, Revenants, Wendigos or Bosses`,
        formatReward: (gold) =>
          `Reward: +${gold} Gold, +1 Pelt & Full Health Restore`
      }
    },
    questMsgDoneAlready: 'Next Escalating Bounty Tier accepted!',
    questMsgActiveNow: (title, prog, goal) => `Active bounty: ${title} (${prog}/${goal})`,
    questMsgAccepted: (title) => `Bounty accepted: ${title}!`,
    questMsgRewardGeneric: (gold, tier) => `Bounty Tier ${tier} Complete! +${gold} Gold earned!`,
    questMsgRewardDeer: 'Completed! +25 Gold, +2 Food, +2 Pelts & Sheriff Star!',
    questMsgRewardBandit: 'Completed! +30 Gold & Golden Revolver!',
    questMsgRewardNight: 'Completed! +45 Gold & Full Health!',

    // 4 World Lore / Wanted Posters
    posters: [
      {
        header: 'WANTED — $500 GOLD',
        title: 'CAPTAIN IRON-JAW',
        lines: [
          'Leader of the Crimson Canyon Outlaws.',
          'Allied with General Cortez NE at',
          'Fort Rattlesnake in the Badlands.',
          'Clear their camps & seize their gold!'
        ]
      },
      {
        header: 'DUSTWOOD CHRONICLE',
        title: 'THE FOUR CORNERS',
        lines: [
          'NW: Silverpine Peak & White Stag.',
          'NE: Fort Rattlesnake & General Cortez.',
          'SE: Cursed Brimstone Ghost Town.',
          'SW: Thunder Plains & Ancient Wendigo.'
        ]
      },
      {
        header: "FOREMAN'S LOG — 1884",
        title: 'THE CRIMSON VEIN',
        lines: [
          'We struck rich gold deep in the canyon,',
          'but broke into a sealed black crypt.',
          'Cold fog poured west toward Boot Hill.',
          'Grab the gold — beware the dark!'
        ]
      },
      {
        header: 'ANCIENT EPITAPH',
        title: 'LORD MALAKOR',
        lines: [
          'Beneath Boot Hill Chapel sleeps the',
          'Vampire Overlord of the Western Wastes.',
          'Shoot the Chapel Altar or Stone Circle',
          'Obelisk to challenge the Elder Bosses!'
        ]
      }
    ],
    bossBarTitle: 'LORD MALAKOR — VAMPIRE LORD',
    wendigoBossBarTitle: 'ANCIENT WENDIGO — ELDER DREAD',
    cortezBarTitle: 'GENERAL CORTEZ — FORT WARLORD',
    marshalBarTitle: 'BRIMSTONE MARSHAL — UNDEAD LAW',
    captainLabel: 'BANDIT CAPTAIN'
  },

  no: {
    langBtn: 'Språk: EN / [NO]',
    wristLangBtn: 'SPRÅK: NO',
    saloonLangSign: 'SPRÅK: EN / [NO]',
    saloonLangSub: 'Klikk eller skyt for å bytte',
    pcHintHtml:
      'PC: WASD / piltaster = gå • Klikk i spillet = FPS-mus (Esc = frigjør peker) • Klikk/hold = skyt / velg • 1–6 / hjul = våpen • C = rop på hest • R = ri • E = spis • F = dør • N = dag/natt<br />' +
      'Telefon & Pad: Venstre spak = gå • Sveip høyre side = se rundt • Hold SKYT + dra = sikt & skyt • Meta Quest VR: Venstre spak = gå • Høyre spak = sving • Avtrekker = skyt • Autolagring aktiv!',
    sensBtn: (pct) => `⚙ Følsomhet: ${pct}%`,
    sensTitle: 'KONTROLLER, GRAFIKK & LAGRING',
    sensLookLabel: 'Sikte-følsomhet',
    sensInvertLabel: 'Inverter opp/ned',
    sensVrTurnLabel: 'VR-svingemodus',
    sensVrSnap: 'Trinn 30°',
    sensVrSmooth: 'Myk sving',
    sensPerfLabel: 'Grafikk / Ytelse',
    sensPerfAuto: 'Auto (Jevn)',
    sensPerfFast: 'Maks FPS',
    sensPerfUltra: 'Ultra',
    sensResetBtn: 'Nullstill kontroller 100%',
    careerSaveLabel: 'Karriere (Autolagret)',
    careerResetBtn: 'Nytt spill (Nullstill)',
    careerResetConfirmBtn: 'Bekreft sletting?',
    careerSavedTag: 'Autolagret ✓',
    touchFire: 'SKYT',
    touchWeapon: 'VÅPEN',
    touchHorse: 'HEST',
    touchEat: 'SPIS +35',
    touchUse: 'DØR / VELG',
    touchTime: 'DAG / NATT',
    hudHealth: 'Helse',
    hudGold: 'Gull',
    hudFood: 'Mat',
    hudEatHint: '(E)',
    hudPelts: 'Skinn',
    hudOutfit: 'Antrekk',
    hudWeapon: 'Våpen',
    hudDynamite: 'Dynamitt',
    hudTime: 'Tid',
    hudTargets: 'Blinker',
    hudTitle: 'Tittel',
    hudKills: 'Nedlagt',
    hudPlaytime: 'Spilletid',
    hudMastery: 'Mestring',
    hiddenStatus: 'Status: SKJULT (Trygg)',
    horseRidingHud: 'Hest: GALOPPERER',
    horseCallBtn: 'ROP PÅ HEST',
    horseMountBtn: 'GÅ AV HEST',
    horseCalledMsg: 'Mustangen galopperte til deg! Trykk R (eller venstre grip) for å sitte opp.',
    day: 'Dag',
    night: 'Natt',
    outfits: ['Vanlig', 'Lærvest', 'Vargpels-frakk', 'Vampyrjeger-sett', 'Mytisk Grenselandsfrakk'],
    weapons: {
      revolver: 'Peacemaker',
      revolverGold: 'Gull-revolver',
      shotgun: 'Avsaget Hagle',
      rifle: 'Winchester Rifle',
      crossbow: 'Sølv-armbrøst',
      dynamite: 'Dynamitt',
      hellfire: 'Hellfire-karabin'
    },
    legendTitle: 'Legenden på Grenselandet',
    prestigeTitle: (rank) => `Udødelig Grenselandshelt (Prestisje ${rank})`,
    wristHeader: 'COWBOY-STATUS',
    wristLegendPrefix: 'HELT • ',
    eatBtn: 'SPIS (+35 HP)',
    weaponCycleBtn: (wName) => `VÅPEN: ${wName}`,
    questPrefix: 'Dusør',
    questNone: 'Dusør: Sjekk Saloon-tavlen',
    questAllDone: 'Dusør: Nye eskalerende oppdrag klare!',

    // 20-stegs hovedkampanje + Evige Prestisje-kapitler (48+ timers progresjon)
    storyPrefix: 'Kampanje',
    formatPrestigeProgress: (s) => {
      const ch = s.currentLevel;
      const pRank = s.prestigeRank || 1;
      const beasts = Math.min(s.prestigeGoalBeasts || 8, s.prestigeBeasts || 0);
      const foes = Math.min(s.prestigeGoalFoes || 10, s.prestigeFoes || 0);
      const bosses = Math.min(s.prestigeGoalBosses || 1, s.prestigeBosses || 0);
      return `Prestisje ${pRank} • Kapittel ${ch}: Grenselandsoperasjon (Storvilt ${beasts}/${s.prestigeGoalBeasts || 8} • Fiender ${foes}/${s.prestigeGoalFoes || 10} • Verdensboss ${bosses}/${s.prestigeGoalBosses || 1})`;
    },
    storyComplete: 'Kampanje fullført: Legenden på Grenselandet! Fortsett evige Prestisje-kapitler og dusører.',
    acts: [
      {
        num: 1,
        title: 'Level 1/20 – Fremmed i Dustwood',
        formatProgress: (s) => {
          const parts = [];
          parts.push(s.talkedSheriff ? 'Sheriff ✓' : 'Snakk med Sheriff Vance');
          parts.push(`Hjort ${Math.min(2, s.act1Deer)}/2`);
          parts.push(s.boughtGear ? 'Oppgradering ✓' : 'Kjøp antrekk/våpen');
          return `Level 1/20: Fremmed i Dustwood (${parts.join(' • ')})`;
        }
      },
      {
        num: 2,
        title: 'Level 2/20 – Rovdyrene i Whispering Woods',
        formatProgress: (s) =>
          `Level 2/20: Whispering Woods (Ulver ${Math.min(3, s.level2Wolves)}/3 • Grizzly ${s.grizzlyDefeated ? '✓' : '0/1'})`
      },
      {
        num: 3,
        title: 'Level 3/20 – Lovløse i Crimson Canyon',
        formatProgress: (s) =>
          `Level 3/20: Crimson Canyon (Banditter ${Math.min(4, s.act2Bandits)}/4 • Kaptein ${s.captainDefeated ? '✓' : '0/1'})`
      },
      {
        num: 4,
        title: 'Level 4/20 – Den Forlatte Gullgruven',
        formatProgress: (s) =>
          `Level 4/20: Dyp Gullgruve (Barrikader ${Math.min(2, s.barricadesCleared)}/2 • Formann Slade ${s.sladeDefeated ? '✓' : '0/1'} • Gruvekart ${s.mineMapCollected ? '✓' : '0/1'})`
      },
      {
        num: 5,
        title: 'Level 5/20 – Det Pansrede Damptoget',
        formatProgress: (s) =>
          `Level 5/20: Søndre Jernbane (Tog-skarpskyttere ${Math.min(4, s.trainSnipersKilled)}/4 • Erobre Gatling-vogn ${s.trainGatlingCaptured ? '✓' : '0/1'})`
      },
      {
        num: 6,
        title: 'Level 6/20 – Skyggene på Boot Hill',
        formatProgress: (s) =>
          `Level 6/20: Boot Hill Kirkegård (Vampyrer ${Math.min(4, s.bootHillVampires)}/4 • Sølvrelikvier ${Math.min(2, s.bootHillRelics)}/2)`
      },
      {
        num: 7,
        title: 'Level 7/20 – Den Sunkne Katakombe',
        formatProgress: (s) =>
          `Level 7/20: Sunkne Katakombe (Voktere ${Math.min(3, s.catacombGuardiansKilled)}/3 • Hellfire-karabin ${s.hellfireCollected ? '✓' : '0/1'})`
      },
      {
        num: 8,
        title: 'Level 8/20 – Blodmånens Oppgjør',
        formatProgress: (s) =>
          s.bossActive
            ? `Level 8/20 [BLODMÅNE]: Beseir LORD MALAKOR (${Math.max(0, Math.ceil(s.bossHp))}/${s.bossMaxHp} HP)!`
            : 'Level 8/20 [BLODMÅNE]: Ri vest til Boot Hill og møt Lord Malakor ved Kapellalteret!'
      },
      {
        num: 9,
        title: 'Level 9/20 – Tordensletten & Fjellpasset',
        formatProgress: (s) =>
          `Level 9/20: Thunder Plains ↙ & Fjell ↖ (Præriebison ${Math.min(3, s.bisonHunted || 0)}/3 • Fjellpuma ${Math.min(2, s.cougarsHunted || 0)}/2)`
      },
      {
        num: 10,
        title: 'Level 10/20 – Legenden på Silverpine Peak',
        formatProgress: (s) =>
          `Level 10/20: Silverpine Peak ↖ (Hvit Kronhjort ${Math.min(1, s.whiteStagsHunted || 0)}/1 • Alfa-ulver ${Math.min(3, s.alphaWolvesKilled || 0)}/3 • Månesteiner ${Math.min(3, s.moonstonesCollected || 0)}/3)`
      },
      {
        num: 11,
        title: 'Level 11/20 – Beleiringen av Fort Rattlesnake',
        formatProgress: (s) =>
          `Level 11/20: Bandittfortet ↗ (Fort-desperadoer ${Math.min(5, s.fortBanditsKilled || 0)}/5 • Pengekasser ${Math.min(3, s.strongboxesRecovered || 0)}/3)`
      },
      {
        num: 12,
        title: 'Level 12/20 – General Cortez sitt Fall',
        formatProgress: (s) =>
          `Level 12/20: Fort Rattlesnake ↗ (Beseir krigsherren GENERAL CORTEZ ${s.cortezDefeated ? '✓' : '0/1'})`
      },
      {
        num: 13,
        title: 'Level 13/20 – Spøkelsesbyen Brimstone',
        formatProgress: (s) =>
          `Level 13/20: Brimstone ↘ (Plyndrere & Gjengangere ${Math.min(5, s.brimstoneFoesKilled || 0)}/5 • Svovel-totemer ${Math.min(3, s.brimstoneTotemsShattered || 0)}/3)`
      },
      {
        num: 14,
        title: 'Level 14/20 – Den Udøde Marskalken',
        formatProgress: (s) =>
          `Level 14/20: Spøkelsesbyen Brimstone ↘ (Beseir BRIMSTONE MARSHAL ${s.brimstoneMarshalDefeated ? '✓' : '0/1'})`
      },
      {
        num: 15,
        title: 'Level 15/20 – Steinringens Hemmelighet',
        formatProgress: (s) =>
          `Level 15/20: Steinringen ↙ (Solruner ${Math.min(3, s.ancientRunesAttuned || 0)}/3 • Wendigo-rovdyr ${Math.min(4, s.wendigosKilled || 0)}/4)`
      },
      {
        num: 16,
        title: 'Level 16/20 – Ur-Wendigoens Vrede',
        formatProgress: (s) =>
          s.wendigoBossActive
            ? `Level 16/20 [STEINRINGEN ↙]: Beseir ANCIENT WENDIGO (${Math.max(0, Math.ceil(s.wendigoBossHp || 0))}/${s.wendigoBossMaxHp || 42} HP)!`
            : 'Level 16/20: Skyt eller berør Obelisken i Steinringen ↙ og beseir ANCIENT WENDIGO!'
      },
      {
        num: 17,
        title: 'Level 17/20 – Mester av Dustwood',
        formatProgress: (s) =>
          `Level 17/20: Grenselandsmester (Dusører fullført ${Math.min(5, s.totalBountiesDone || 0)}/5 • Mesterutstyr/Smiing ${s.masterUpgradeBought ? '✓' : '0/1'})`
      },
      {
        num: 18,
        title: 'Level 18/20 – Krigen om De Fire Hjørner',
        formatProgress: (s) =>
          `Level 18/20: De Fire Hjørner (Elitefiender & Bosser ${Math.min(12, s.eliteKills || 0)}/12)`
      },
      {
        num: 19,
        title: 'Level 19/20 – Formørkelsens Natt',
        formatProgress: (s) =>
          `Level 19/20: Mørkejakt (Vampyrer, Gjengangere & Wendigoer ${Math.min(10, s.eclipseKills || 0)}/10)`
      },
      {
        num: 20,
        title: 'Level 20/20 – Den Evige Blodmåne',
        formatProgress: (s) =>
          s.bossActive
            ? `Level 20/20 [SLUTTOPPGJØR]: Beseir OPPHØYET MALAKOR (${Math.max(0, Math.ceil(s.bossHp))}/${s.bossMaxHp} HP)!`
            : 'Level 20/20 [SLUTTOPPGJØR]: Vekk og knus Opphøyet Lord Malakor ved Boot Hill-alteret!'
      }
    ],
    sheriffBannerTitle: 'SHERIFF VANCE',
    sheriffQuotes: [
      '«Velkommen til Dustwood! Jakt 2 hjorter nord i Whispering Woods og kjøp en oppgradering.»',
      '«Kryss nordbroen! En ulveflokk og en diger Grizzly terroriserer Whispering Woods.»',
      '«Kaptein Jernkjeve holder Crimson Canyon østover. Rydd ut leiren deres!»',
      '«Spreng barrikadene dypt i gullgruven øst, beseir Formann Slade og ta Gruvekartet!»',
      '«Et pansret Damptog har stoppet sør ved z=75! Ta skarpskytterne og erobre Gatling-vognen!»',
      '«Vampyrer sniker på Boot Hill vest! Drep 4 nattmonstre og finn 2 lysende Sølvrelikvier.»',
      '«Gå ned steintrappen inne i Boot Hill Kapell til Katakombene og hent Hellfire-karabinen!»',
      '«Blodmånen stiger! Ri vestover og slå tilbake Lord Malakor ved Kapellet!»',
      '«Malakor flyktet i skyggene! Ri SV ↙ til Thunder Plains og NV ↖ etter Præriebison og Fjellpuma.»',
      '«Ri NV ↖ opp til Silverpine Peak! Felle den Hvite Kronhjorten, Alfa-ulver og 3 Månesteiner.»',
      '«General Cortez har reist Fort Rattlesnake i NØ ↗! Storm porten og ta tilbake 3 Pengekasser!»',
      '«Fullfør angrepet i NØ ↗! Beseir krigsherren General Cortez inne i Fort Rattlesnake!»',
      '«Ri SØ ↘ til spøkelsesbyen Brimstone! Knus 3 Svovel-totemer og rens ut plyndrerne!»',
      '«Den udøde Brimstone Marshal styrer spøkelsesbyen i SØ ↘. Send ham i jorda!»',
      '«Ri SV ↙ til den eldgamle Steinringen! Aktiver 3 Solruner og jakt 4 Wendigo-rovdyr.»',
      '«Skyt eller berør den grønne Obelisken i Steinringen ↙ for å vekke og beseire Ur-Wendigoen!»',
      '«Fullfør 5 dusører på Saloon-tavlen og skaff Mytisk Frakk eller Våpenmestring hos smeden!»',
      '«Rens alle fire verdenshjørner og bekjemp 12 elitebanditter, gjengangere eller bosser!»',
      '«Formørkelsen senker seg! Bekjemp 10 vampyrer, gjengangere eller wendigoer!»',
      '«Opphøyet Lord Malakor venter ved Boot Hill-alteret ←! Knus Blodmånen én gang for alle!»',
      '«Udødelig Legende! Evige Prestisje-kapitler og eskalerende dusører venter i alle 8 regioner!»'
    ],

    // By- og regionsskilt
    signSaloonTitle: 'SALOON',
    signSaloonSub: 'KRO & DUSØRER',
    signTailorTitle: 'SKREDDER',
    signTailorSub: 'RUSTNING & MAKS HELSE',
    signGunsmithTitle: 'VÅPENSMED',
    signGunsmithSub: 'VÅPEN & MESTRING',
    signSafeHouseTitle: 'SAFE HOUSE',
    signSafeHouseSub: 'TRYGT GJEMMESTED',
    signMineTitle: 'FORLATT GULLGRUVE',
    signMineSub: 'CRIMSON GULLÅRE',
    signChapelTitle: 'BOOT HILL KAPELL',
    signChapelSub: 'KATAKOMBER & ALTER',
    signSilverpineTitle: 'SILVERPINE PEAK',
    signSilverpineSub: 'MÅNESTEINSHOLTET',
    signFortTitle: 'FORT RATTLESNAKE',
    signFortSub: 'CORTÉZ SIN FESTNING',
    signBrimstoneTitle: 'BRIMSTONE',
    signBrimstoneSub: 'SPØKELSESBYEN',
    signStoneCircleTitle: 'STEINRINGEN',
    signStoneCircleSub: 'TORDENSLETTEN OBELISK',

    roadWoodsTitle: '↑ WHISPERING WOODS',
    roadWoodsSub: 'Trebro • Hjort • Grizzlybjørn',
    roadCanyonTitle: '→ CRIMSON CANYON',
    roadCanyonSub: 'Bandittleir & Dyp Gullgruve',
    roadGraveyardTitle: '← BOOT HILL',
    roadGraveyardSub: 'Kirkegård & Sunkne Katakomber',
    roadRailwayTitle: '↓ SØNDRE JERNBANE',
    roadRailwaySub: 'Pansret Damptog & Sprengt Bro',
    roadTownTitle: 'DUSTWOOD SENTRUM',
    roadTownSub: 'Saloon • Våpensmed • Hest',
    roadSilverpineTitle: '↖ SILVERPINE PEAK',
    roadSilverpineSub: 'Hvit Hjort • Puma • Månesteiner',
    roadFortTitle: '↗ FORT RATTLESNAKE',
    roadFortSub: 'Bandittfort & General Cortez',
    roadBrimstoneTitle: '↘ BRIMSTONE BY',
    roadBrimstoneSub: 'Spøkelsesby & Udød Marskalk',
    roadStoneCircleTitle: '↙ THUNDER PLAINS',
    roadStoneCircleSub: 'Bison • Steinring • Wendigo',

    // Skredderbutikk
    tailorBoardTitle: 'SKREDDERENS VERKSTED',
    tailorInfo: (pelts, outfit, maxHp) =>
      `Skinn: ${pelts}  •  Antrekk: ${outfit}  •  Maks helse: ${maxHp || 100}`,
    tailorButtons: [
      'Lærvest (2 Skinn) -> 25% rustning',
      'Vargpels-frakk (4 Skinn) -> 50% rustning',
      'Vampyrjeger-sett (6 Skinn) -> 70% rustning + 2x nattskade'
    ],
    tailorMythicBtn: (owned) =>
      owned
        ? 'Mytisk Grenselandsfrakk -> 80% rustning + 3x nattskade [AKTIV]'
        : 'Mytisk Grenselandsfrakk (12 Skinn) -> 80% rustning + 3x nattskade',
    tailorReinforceBtn: (cost, maxHp) =>
      maxHp >= 300
        ? `Forsterket Pelsfôr (Maks ${maxHp} HP nådd!)`
        : `Forsterk Rustningsfôr (${cost} Skinn) -> +15 Maks HP (Nå ${maxHp})`,
    tailorRationsBtn: 'Røkt Viltproviant (2 Skinn) -> +4 Mat & Full Helse',
    equippedTag: '[AKTIV]',
    ownedTag: '[KJØPT]',
    tailorMsgSame: 'Allerede maksimalt oppgradert på dette valget!',
    tailorMsgBetter: 'Du har allerede sterkere rustning!',
    tailorMsgNoPelts: 'Ikke nok skinn! Jakt hjort, ulv, puma eller bison.',
    tailorMsgCrafted: 'Nytt mektig antrekk sydd!',
    tailorMsgHpUp: (hp) => `Rustning forsterket! Maks helse økt til ${hp} HP!`,
    tailorMsgRations: '+4 Mat og full helse gjenopprettet!',

    // Våpensmed
    gunsmithBoardTitle: 'VÅPENSMEDENS VERKSTED',
    gunsmithInfo: (gold, pelts, dyn, mastery = 0) =>
      `Gull: ${gold}  •  Skinn: ${pelts}  •  Dynamitt: ${dyn}${mastery > 0 ? `  •  Mestring +${mastery * 20}%` : ''}`,
    gunsmithButtons: [
      'Avsaget Hagle (25 Gull) -> 6 hagl med enorm nærskade',
      'Winchester Rifle (40 Gull) -> Langtrekkende presisjon (3x skade)',
      'Sølv-armbrøst (65 Gull + 2 Skinn) -> 3x brannskade mot udøde',
      '3x Dynamitt-pakke (15 Gull) -> Kastes i bue, eksploderer etter 2,2s',
      'Hellfire-karabin (120 Gull) -> Lynrask sølv-gatling (Level 7+)'
    ],
    gunsmithMasteryBtn: (nextRank, cost) =>
      `Smi Mestermunning Nivå ${nextRank} (${cost} Gull) -> +20% våpenskade`,
    gunsmithMsgLockedLevel: 'Lås opp Katakombene (Level 7) eller hent den under Boot Hill Kapell!',
    gunsmithMsgOwned: 'Våpenet er kjøpt! Byttet til våpenet.',
    gunsmithMsgNoGold: 'Ikke nok Gull! Fullfør dusører, pengekasser eller bosser.',
    gunsmithMsgNoPelts: 'Trenger 2 Skinn + 65 Gull for Sølv-armbrøst!',
    gunsmithMsgBoughtWeapon: (name) => `Kjøpt og utstyrt: ${name}!`,
    gunsmithMsgBoughtDynamite: (count) => `+3 Dynamitt kjøpt! (Totalt: ${count})`,
    gunsmithMsgMasteryUp: (rank, pct) => `Våpenmestring Nivå ${rank} smidd! (+${pct}% skade!)`,

    // Eskalerende Oppdragstavle (Nivå 1 -> 100+)
    questBoardTitle: 'SHERIFFENS OPPDRAGSTAVLE',
    questBoardActiveSub: (title, prog, goal, gold) =>
      `Aktivt: ${title} (${prog}/${goal})  •  Gull: ${gold}`,
    questBoardIdleSub: (done, gold) =>
      `Eskalerende dusører • Fullført totalt: ${done} • Gull: ${gold}`,
    badgeOpen: 'LEDIG',
    badgeActive: 'AKTIVT',
    badgeDone: 'NESTE NIVÅ',
    quests: {
      deer_hunt: {
        title: 'Storviltjegeren',
        formatTask: (tier, goal) =>
          `«Storviltjakt ${tier > 1 ? `Nivå ${tier}` : ''}» – Felle ${goal} vilt (Hjort, Puma, Grizzly, Bison)`,
        formatReward: (gold, food, pelts, first) =>
          first
            ? `Belønning: +${gold} Gull, +${food} Mat, +${pelts} Skinn & Sheriff-stjerne`
            : `Belønning: +${gold} Gull, +${food} Mat & +${pelts} Skinn`
      },
      bandit_clear: {
        title: 'Lovløs- & Fortdusør',
        formatTask: (tier, goal) =>
          `«Lovløs-jakt ${tier > 1 ? `Nivå ${tier}` : ''}» – Bekjemp ${goal} lovløse (Canyon, Fort, Brimstone)`,
        formatReward: (gold, _f, _p, first) =>
          first
            ? `Belønning: +${gold} Gull & Gull-revolver (2x grunnskade)`
            : `Belønning: +${gold} Gull & +1 Dynamitt`
      },
      night_guardian: {
        title: 'Mørkejeger-kontrakt',
        formatTask: (tier, goal) =>
          `«Mørkejakt ${tier > 1 ? `Nivå ${tier}` : ''}» – Bekjemp ${goal} Vampyrer, Gjengangere, Wendigo eller Bosser`,
        formatReward: (gold) =>
          `Belønning: +${gold} Gull, +1 Skinn & Full Helse`
      }
    },
    questMsgDoneAlready: 'Neste eskalerende dusørnivå aktivert!',
    questMsgActiveNow: (title, prog, goal) => `Aktivt oppdrag: ${title} (${prog}/${goal})`,
    questMsgAccepted: (title) => `Oppdrag aktivert: ${title}!`,
    questMsgRewardGeneric: (gold, tier) => `Dusør Nivå ${tier} fullført! +${gold} Gull utbetalt!`,
    questMsgRewardDeer: 'Fullført! +25 Gull, +2 Mat, +2 Skinn og Sheriff-stjerne!',
    questMsgRewardBandit: 'Fullført! +30 Gull og Gull-revolver!',
    questMsgRewardNight: 'Fullført! +45 Gull og full helse!',

    // 4 Lore / Etterlyst-plakater
    posters: [
      {
        header: 'ETTERLYST — 500 GULL',
        title: 'KAPTEIN JERNKJEVE',
        lines: [
          'Leder bandittene i Crimson Canyon,',
          'alliert med General Cortez i NØ',
          'ved Fort Rattlesnake i ødemarken.',
          'Storm fortet og ta tilbake gullet!'
        ]
      },
      {
        header: 'DUSTWOOD KRØNIKE',
        title: 'DE FIRE HJØRNER',
        lines: [
          'NV: Silverpine Peak & Hvit Kronhjort.',
          'NØ: Fort Rattlesnake & General Cortez.',
          'SØ: Spøkelsesbyen Brimstone.',
          'SV: Thunder Plains & Ur-Wendigoen.'
        ]
      },
      {
        header: 'GRUVELOGG — 1884',
        title: 'DEN RØDE ÅREN',
        lines: [
          'Vi fant rent gull dypt inne i kløften,',
          'men slo hull inn til en eldgammel krypt.',
          'Iskald tåke drev vestover mot Boot Hill.',
          'Ta med gullet – vokt deg for mørket!'
        ]
      },
      {
        header: 'STEINTAVLE VED KAPELLET',
        title: 'LORD MALAKOR',
        lines: [
          'Under Boot Hill Kapell hviler',
          'Vampyrfyrsten over Vestens ødemark.',
          'Skyt Kapellalteret eller Obelisken i SV',
          'for å utfordre de mektige Ur-Bossene!'
        ]
      }
    ],
    bossBarTitle: 'LORD MALAKOR — VAMPYRFYRSTE',
    wendigoBossBarTitle: 'ANCIENT WENDIGO — UR-SKREKKEN',
    cortezBarTitle: 'GENERAL CORTEZ — KRIGSHERRE',
    marshalBarTitle: 'BRIMSTONE MARSHAL — UDØD LOVMANN',
    captainLabel: 'BANDITTKAPTEIN'
  }
};

export function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function drawSheriffStar2D(ctx, cx, cy, outerR, innerR) {
  ctx.beginPath();
  for (let i = 0; i < 12; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 6;
    const r = i % 2 === 0 ? outerR : innerR;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffd54a';
  ctx.fill();
  lineWidthSafe(ctx);
}

function lineWidthSafe(ctx) {
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#9e6b14';
  ctx.stroke();
}
