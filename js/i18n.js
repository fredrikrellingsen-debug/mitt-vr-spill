// Sentralt språksystem (EN standard / NO valg) for 20-nivås kampanje + Evig Prestisje, 8 biomer, eskalering av dusører og butikkoppgraderinger

export const I18N = {
  en: {
    langBtn: 'Language: [EN] / NO',
    wristLangBtn: 'LANG: EN',
    saloonLangSign: 'LANGUAGE: [EN] / NO',
    saloonLangSub: 'Click or shoot to switch',
    pcHintHtml:
      'PC: WASD / Arrows = move • Click game = FPS Mouse Look (Esc = unlock) • Click/Hold = shoot / interact • J = next quest • 1–6 / Q / Wheel = weapon • C = call horse • R = mount • E = eat • F = door • N = day/night<br />' +
      'Phone & Pad: Left stick = move • Swipe right side = smooth look • Hold FIRE + drag = aim & shoot • Tap Quest Banner = next quest • Meta Quest VR: Left stick = move • Right stick = turn • Trigger = shoot • Auto-Saved!',
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
    questPrefix: 'Quest',
    questNone: 'Quest: Tap banner / [J] or pick at Saloon Board',
    questAllDone: 'Quest: New Frontier Contracts Ready!',
    questHudIdleBtn: (seq, title) => `📜 Next Quest [J]: #${seq} ${title} (Click here or pick at Saloon Board)`,
    questHudActiveBtn: (seq, title, prog, goal, rewardShort) =>
      `🎯 ACTIVE #${seq}: ${title} (${prog}/${goal})  •  ${rewardShort}`,
    questHudDoneBanner: (seq, title, rewardShort) =>
      `✓ COMPLETED #${seq}: ${title}! (${rewardShort}) — Click here or [J] for next quest!`,

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

    // Sequential Rotating Bounty & Quest Board (36 Hand-Crafted Quests + Infinite Contracts #37..#999+)
    questBoardTitle: "SHERIFF'S BOUNTY BOARD",
    questBoardActiveSub: (seq, title, prog, goal, done, gold) =>
      `Active: #${seq} ${title} (${prog}/${goal})  •  Done: ${done}  •  Gold: ${gold}`,
    questBoardIdleSub: (done, gold) =>
      `Pick any quest below (or press J)  •  Completed: ${done}  •  Gold: ${gold}`,
    badgeOpen: 'OPEN',
    badgeActive: 'ACTIVE',
    badgeCompleted: '✓ COMPLETED!',
    questCompletedSlotLine1: (seq, title) => `✓ #${seq} ${title} — COMPLETED!`,
    questCompletedSlotLine2: (rewardSummary) => `Paid: ${rewardSummary}  •  Loading next quest...`,
    questMsgActiveNow: (seq, title, prog, goal) => `Active quest: #${seq} ${title} (${prog}/${goal})`,
    questMsgAccepted: (seq, title) => `Quest #${seq} accepted: ${title}!`,
    questMsgCompletedToast: (seq, title, rewardSummary) => `✓ COMPLETED #${seq} ${title}! (${rewardSummary})`,

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
      'PC: WASD / piltaster = gå • Klikk i spillet = FPS-mus (Esc = frigjør peker) • Klikk/hold = skyt / velg • J = neste oppdrag • 1–6 / Q / hjul = våpen • C = rop på hest • R = ri • E = spis • F = dør • N = dag/natt<br />' +
      'Telefon & Pad: Venstre spak = gå • Sveip høyre side = se rundt • Hold SKYT + dra = sikt & skyt • Trykk Oppdrags-linjen = neste oppdrag • Meta Quest VR: Spaker + Avtrekker • Autolagring aktiv!',
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
    questPrefix: 'Oppdrag',
    questNone: 'Oppdrag: Trykk linjen / [J] eller velg på Saloon-tavlen',
    questAllDone: 'Oppdrag: Nye oppdrag klare på Saloon-tavlen!',
    questHudIdleBtn: (seq, title) => `📜 Neste oppdrag [J]: #${seq} ${title} (Klikk her eller på Saloon-tavlen)`,
    questHudActiveBtn: (seq, title, prog, goal, rewardShort) =>
      `🎯 AKTIVT #${seq}: ${title} (${prog}/${goal})  •  ${rewardShort}`,
    questHudDoneBanner: (seq, title, rewardShort) =>
      `✓ FULLFØRT #${seq}: ${title}! (${rewardShort}) — Klikk her eller [J] for neste oppdrag!`,

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

    // Sekvensiell Roterende Oppdragstavle (36 håndlagde oppdrag + uendelige kontrakter #37..#999+)
    questBoardTitle: 'SHERIFFENS OPPDRAGSTAVLE',
    questBoardActiveSub: (seq, title, prog, goal, done, gold) =>
      `Aktivt: #${seq} ${title} (${prog}/${goal})  •  Fullført: ${done}  •  Gull: ${gold}`,
    questBoardIdleSub: (done, gold) =>
      `Velg et oppdrag under (eller trykk J)  •  Fullført: ${done}  •  Gull: ${gold}`,
    badgeOpen: 'LEDIG',
    badgeActive: 'AKTIVT',
    badgeCompleted: '✓ FULLFØRT!',
    questCompletedSlotLine1: (seq, title) => `✓ #${seq} ${title} — FULLFØRT!`,
    questCompletedSlotLine2: (rewardSummary) => `Utbetalt: ${rewardSummary}  •  Henter neste oppdrag...`,
    questMsgActiveNow: (seq, title, prog, goal) => `Aktivt oppdrag: #${seq} ${title} (${prog}/${goal})`,
    questMsgAccepted: (seq, title) => `Oppdrag #${seq} valgt: ${title}!`,
    questMsgCompletedToast: (seq, title, rewardSummary) => `✓ FULLFØRT #${seq} ${title}! (${rewardSummary})`,

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

// ============================================================================
// SEKVENSIELL OPPDRAGSKATALOG (36 unike håndlagde oppdrag + uendelig kø #37+)
// Når et oppdrag fullføres, merkes det med ✓ FULLFØRT, forsvinner fra tavlen
// og erstattes av neste oppdrag i rekken (#4, #5, #6 ... #999+)!
// ============================================================================
export const CURATED_QUEST_CATALOG = [
  {
    seq: 1, targetType: 'deer_any', goal: 2, gold: 25, food: 2, pelts: 2, dynamite: 0,
    grantsSheriffStar: true,
    enTitle: 'Whispering Woods Hunt', enTask: 'Hunt 2 deer north in Whispering Woods',
    noTitle: 'Skogsjegeren', noTask: 'Felle 2 hjorter nord i Whispering Woods'
  },
  {
    seq: 2, targetType: 'bandit_any', goal: 3, gold: 30, food: 0, pelts: 0, dynamite: 0,
    grantsGoldRevolver: true,
    enTitle: 'Canyon Outlaw Warrant', enTask: 'Defeat 3 outlaws in Crimson Canyon →',
    noTitle: 'Canyon-opprydning', noTask: 'Bekjemp 3 banditter i Crimson Canyon →'
  },
  {
    seq: 3, targetType: 'night_any', goal: 4, gold: 45, food: 0, pelts: 1, dynamite: 0,
    fullHeal: true,
    enTitle: 'Boot Hill Night Watch', enTask: 'Slay 4 night fiends (Night or Boot Hill ←)',
    noTitle: 'Nattvakt ved Boot Hill', noTask: 'Bekjemp 4 nattmonstre (om natten eller på Boot Hill ←)'
  },
  {
    seq: 4, targetType: 'bottle', goal: 5, gold: 25, food: 2, pelts: 0, dynamite: 0,
    enTitle: 'Saloon Sharpshooter', enTask: 'Shoot down 5 practice bottles outside town',
    noTitle: 'Blinkskyting ved Saloonen', noTask: 'Skyt ned 5 øvingsflasker i Dustwood'
  },
  {
    seq: 5, targetType: 'wolf', goal: 3, gold: 38, food: 1, pelts: 2, dynamite: 0,
    enTitle: 'Northern Wolf Pack', enTask: 'Slay 3 wolves in Whispering Woods ↑',
    noTitle: 'Ulvejakt i Nord', noTask: 'Bekjemp 3 ulver i Whispering Woods ↑'
  },
  {
    seq: 6, targetType: 'gold_pickup', goal: 3, gold: 42, food: 0, pelts: 0, dynamite: 2,
    enTitle: "Prospector's Gold Rush", enTask: 'Collect or shoot 3 Gold Veins in Crimson Canyon →',
    noTitle: 'Gullgraverens Lykke', noTask: 'Plukk eller skyt 3 gullklumper i Crimson Canyon →'
  },
  {
    seq: 7, targetType: 'grizzly', goal: 1, gold: 55, food: 3, pelts: 3, dynamite: 0,
    enTitle: 'Grizzly Trophy Hunt', enTask: 'Hunt 1 Grizzly Bear beyond the north bridge ↑',
    noTitle: 'Grizzly-trofeet', noTask: 'Felle 1 Grizzlybjørn nord for trebroen ↑'
  },
  {
    seq: 8, targetType: 'bandit_any', goal: 5, gold: 58, food: 0, pelts: 0, dynamite: 2,
    enTitle: "Iron-Jaw's Raiders", enTask: 'Defeat 5 outlaws across Canyon or Railway',
    noTitle: 'Jernkjeves Røverbande', noTask: 'Bekjemp 5 banditter i Canyon eller ved Jernbanen'
  },
  {
    seq: 9, targetType: 'mine_action', goal: 2, gold: 62, food: 0, pelts: 0, dynamite: 3,
    enTitle: 'Deep Mine Breacher', enTask: 'Clear 2 Mine Barricades or defeat Mine outlaws →',
    noTitle: 'Gruvesprengeren', noTask: 'Spreng 2 gruvebarrikader eller ta gruvevoktere →'
  },
  {
    seq: 10, targetType: 'train_sniper', goal: 4, gold: 68, food: 1, pelts: 0, dynamite: 2,
    enTitle: 'Armored Train Ambush', enTask: 'Defeat 4 Train Snipers at Southern Railway ↓',
    noTitle: 'Jernbane-bakholdet', noTask: 'Bekjemp 4 tog-skarpskyttere ved Søndre Jernbane ↓'
  },
  {
    seq: 11, targetType: 'silver_relic', goal: 2, gold: 70, food: 0, pelts: 2, dynamite: 0,
    fullHeal: true,
    enTitle: 'Relics of Boot Hill', enTask: 'Recover 2 glowing Silver Relics on Boot Hill ←',
    noTitle: 'Sølvrelikviene på Boot Hill', noTask: 'Finn 2 lysende Sølvrelikvier på Boot Hill ←'
  },
  {
    seq: 12, targetType: 'catacomb_guardian', goal: 3, gold: 78, food: 2, pelts: 1, dynamite: 0,
    enTitle: 'Catacomb Purge', enTask: 'Slay 3 Catacomb Guardians beneath Boot Hill Chapel ←',
    noTitle: 'Katakombenes Voktere', noTask: 'Bekjemp 3 katakombevoktere under Boot Hill Kapell ←'
  },
  {
    seq: 13, targetType: 'bison', goal: 3, gold: 80, food: 4, pelts: 3, dynamite: 0,
    enTitle: 'Thunder Plains Buffalo', enTask: 'Hunt 3 Plains Bison on Thunder Plains ↙',
    noTitle: 'Bisonjakt på Tordensletten', noTask: 'Felle 3 præriebison på Thunder Plains ↙'
  },
  {
    seq: 14, targetType: 'cougar', goal: 2, gold: 76, food: 2, pelts: 3, dynamite: 0,
    enTitle: 'Silverpine Cougars', enTask: 'Hunt 2 Mountain Cougars near Silverpine Peak ↖',
    noTitle: 'Fjellpuma i Nordvest', noTask: 'Felle 2 fjellpumaer ved Silverpine Peak ↖'
  },
  {
    seq: 15, targetType: 'moonstone', goal: 3, gold: 85, food: 0, pelts: 2, dynamite: 0,
    enTitle: 'Moonstone Seeker', enTask: 'Collect 3 glowing Moonstones at Silverpine Peak ↖',
    noTitle: 'Månestein-søkeren', noTask: 'Samle 3 glødende Månesteiner på Silverpine Peak ↖'
  },
  {
    seq: 16, targetType: 'white_stag', goal: 1, gold: 95, food: 3, pelts: 4, dynamite: 0,
    enTitle: 'The Legendary White Stag', enTask: 'Hunt 1 White Stag high on Silverpine Peak ↖',
    noTitle: 'Den Hvite Kronhjorten', noTask: 'Felle 1 Hvit Kronhjort på Silverpine Peak ↖'
  },
  {
    seq: 17, targetType: 'alpha_wolf', goal: 3, gold: 90, food: 1, pelts: 3, dynamite: 0,
    enTitle: 'Alpha Direwolf Pack', enTask: 'Slay 3 Alpha Direwolves in NW Silverpine ↖',
    noTitle: 'Alfa-ulvenes Flokk', noTask: 'Bekjemp 3 alfa-skrekkulver ved Silverpine Peak ↖'
  },
  {
    seq: 18, targetType: 'fort_bandit', goal: 5, gold: 95, food: 0, pelts: 0, dynamite: 3,
    enTitle: 'Storm Fort Rattlesnake', enTask: 'Defeat 5 Fort Desperados at NE Stronghold ↗',
    noTitle: 'Storm Fort Rattlesnake', noTask: 'Bekjemp 5 desperadoer ved Fort Rattlesnake ↗'
  },
  {
    seq: 19, targetType: 'strongbox', goal: 3, gold: 105, food: 0, pelts: 0, dynamite: 1,
    enTitle: 'Stolen Payroll Chests', enTask: 'Recover 3 Treasury Strongboxes inside Fort Rattlesnake ↗',
    noTitle: 'Stjålne Pengekasser', noTask: 'Hent 3 stjålne pengekasser i Fort Rattlesnake ↗'
  },
  {
    seq: 20, targetType: 'cortez', goal: 1, gold: 140, food: 2, pelts: 0, dynamite: 3,
    fullHeal: true,
    enTitle: 'Bounty: General Cortez', enTask: 'Defeat Warlord General Cortez at Fort Rattlesnake ↗',
    noTitle: 'Dusør: General Cortez', noTask: 'Beseir krigsherren General Cortez i Fort Rattlesnake ↗'
  },
  {
    seq: 21, targetType: 'brimstone_foe', goal: 5, gold: 110, food: 2, pelts: 1, dynamite: 0,
    enTitle: 'Ghost Town Sweep', enTask: 'Defeat 5 Raiders or Revenants in Brimstone SE ↘',
    noTitle: 'Rens Spøkelsesbyen', noTask: 'Bekjemp 5 plyndrere eller gjengangere i Brimstone ↘'
  },
  {
    seq: 22, targetType: 'brimstone_totem', goal: 3, gold: 105, food: 0, pelts: 0, dynamite: 2,
    enTitle: 'Totem Breaker', enTask: 'Shatter 3 Cursed Brimstone Totems in SE Ghost Town ↘',
    noTitle: 'Knus Svovel-totemene', noTask: 'Skyt i stykker 3 Svovel-totemer i Brimstone ↘'
  },
  {
    seq: 23, targetType: 'marshal', goal: 1, gold: 150, food: 0, pelts: 3, dynamite: 2,
    fullHeal: true,
    enTitle: 'Bounty: Brimstone Marshal', enTask: 'Defeat The Undead Brimstone Marshal in SE ↘',
    noTitle: 'Dusør: Den Udøde Marskalken', noTask: 'Beseir den udøde Brimstone Marshal i SØ ↘'
  },
  {
    seq: 24, targetType: 'sun_rune', goal: 3, gold: 105, food: 2, pelts: 1, dynamite: 0,
    fullHeal: true,
    enTitle: 'Ancient Sun Runes', enTask: 'Attune 3 Sun Runes at the SW Stone Circle ↙',
    noTitle: 'Solrunenes Kraft', noTask: 'Aktiver 3 Solruner i den eldgamle Steinringen ↙'
  },
  {
    seq: 25, targetType: 'wendigo', goal: 4, gold: 125, food: 2, pelts: 4, dynamite: 0,
    enTitle: 'Wendigo Stalker Hunt', enTask: 'Slay 4 Wendigo Stalkers in SW Stone Circle ↙',
    noTitle: 'Wendigo-jegeren', noTask: 'Bekjemp 4 Wendigo-rovdyr ved Steinringen ↙'
  },
  {
    seq: 26, targetType: 'wendigo_boss', goal: 1, gold: 170, food: 3, pelts: 4, dynamite: 0,
    fullHeal: true,
    enTitle: 'Bounty: Ancient Wendigo', enTask: 'Summon & slay The Ancient Wendigo at SW Obelisk ↙',
    noTitle: 'Dusør: Ur-Wendigoen', noTask: 'Vekk og beseir Ur-Wendigoen ved Obelisken i SV ↙'
  },
  {
    seq: 27, targetType: 'malakor', goal: 1, gold: 180, food: 3, pelts: 3, dynamite: 2,
    fullHeal: true,
    enTitle: 'Bounty: Lord Malakor', enTask: 'Summon & slay Lord Malakor at Boot Hill Altar ←',
    noTitle: 'Dusør: Lord Malakor', noTask: 'Vekk og beseir Lord Malakor ved Boot Hill-alteret ←'
  },
  {
    seq: 28, targetType: 'bottle', goal: 8, gold: 65, food: 2, pelts: 0, dynamite: 2,
    enTitle: 'Trick-Shot Champion', enTask: 'Shoot down 8 practice bottles in Dustwood',
    noTitle: 'Mester-skytteren', noTask: 'Skyt ned 8 øvingsflasker utenfor Saloonen'
  },
  {
    seq: 29, targetType: 'wild_beast', goal: 6, gold: 115, food: 4, pelts: 4, dynamite: 0,
    enTitle: 'Grand Frontier Safari', enTask: 'Hunt 6 wild animals across any region',
    noTitle: 'Storvilt-ekspedisjonen', noTask: 'Felle 6 ville dyr på tvers av alle regioner'
  },
  {
    seq: 30, targetType: 'vampire_or_catacomb', goal: 6, gold: 125, food: 2, pelts: 2, dynamite: 0,
    fullHeal: true,
    enTitle: 'Crimson Eclipse Purge', enTask: 'Slay 6 Vampires or Catacomb Guardians',
    noTitle: 'Blodmånens Vampyrjakt', noTask: 'Bekjemp 6 vampyrer eller katakombevoktere'
  },
  {
    seq: 31, targetType: 'apex_predator', goal: 4, gold: 130, food: 3, pelts: 4, dynamite: 0,
    enTitle: 'Apex Predator Challenge', enTask: 'Hunt 4 Grizzlies, Cougars or Alpha Direwolves',
    noTitle: 'Rovdyrenes Konge', noTask: 'Felle 4 grizzlybjørner, fjellpumaer eller alfa-ulver'
  },
  {
    seq: 32, targetType: 'treasure_any', goal: 4, gold: 135, food: 0, pelts: 1, dynamite: 3,
    enTitle: 'Badlands Treasure Hunter', enTask: 'Collect 4 Gold Veins, Strongboxes, Runes or Moonstones',
    noTitle: 'Skattejeger i Ødemarken', noTask: 'Samle 4 gullklumper, pengekasser, solruner eller månesteiner'
  },
  {
    seq: 33, targetType: 'bandit_any', goal: 8, gold: 140, food: 2, pelts: 0, dynamite: 3,
    enTitle: 'Territory Lawkeeper', enTask: 'Defeat 8 outlaws across Canyon, Train, Fort or Brimstone',
    noTitle: 'Grenselandets Lovmann', noTask: 'Bekjemp 8 lovløse i Canyon, Toget, Fortet eller Brimstone'
  },
  {
    seq: 34, targetType: 'elite_foe', goal: 8, gold: 160, food: 3, pelts: 3, dynamite: 2,
    enTitle: 'War of the Four Corners', enTask: 'Defeat 8 Elite enemies (Fort, Brimstone, Wendigo, Train)',
    noTitle: 'Slaget om De Fire Hjørner', noTask: 'Bekjemp 8 elitefiender (Fort, Brimstone, Wendigo, Tog)'
  },
  {
    seq: 35, targetType: 'any_boss', goal: 2, gold: 220, food: 3, pelts: 4, dynamite: 3,
    fullHeal: true,
    enTitle: 'Slayer of Overlords', enTask: 'Defeat any 2 Bosses (Cortez, Marshal, Wendigo, Malakor)',
    noTitle: 'Overherrenes Bane', noTask: 'Beseir 2 valgfrie bosser (Cortez, Marshal, Wendigo, Malakor)'
  },
  {
    seq: 36, targetType: 'combat_any', goal: 12, gold: 195, food: 4, pelts: 3, dynamite: 3,
    fullHeal: true,
    enTitle: "Legend's Grand Sweep", enTask: 'Defeat 12 Outlaws or Night Monsters anywhere',
    noTitle: 'Legendens Storoffensiv', noTask: 'Bekjemp 12 lovløse eller monstre hvor som helst'
  }
];

const PROCEDURAL_QUEST_TEMPLATES = [
  {
    targetType: 'wild_beast', baseGoal: 5, stepGoal: 1, maxGoal: 14, baseGold: 95, food: 3, pelts: 3, dynamite: 0,
    enTitle: 'Frontier Big-Game Contract', enTask: (g) => `Hunt ${g} wild beasts across Woods, Peaks or Plains`,
    noTitle: 'Storvilt-kontrakt', noTask: (g) => `Felle ${g} vilt i skogen, fjellet eller på sletten`
  },
  {
    targetType: 'bandit_any', baseGoal: 6, stepGoal: 1, maxGoal: 15, baseGold: 105, food: 1, pelts: 0, dynamite: 2,
    enTitle: 'Outlaw Posse Warrant', enTask: (g) => `Defeat ${g} outlaws in Canyon, Train or Fort`,
    noTitle: 'Dusør på Lovløse', noTask: (g) => `Bekjemp ${g} lovløse i Canyon, Toget eller Fortet`
  },
  {
    targetType: 'night_any', baseGoal: 6, stepGoal: 1, maxGoal: 14, baseGold: 115, food: 1, pelts: 2, dynamite: 0, fullHeal: true,
    enTitle: 'Shadow Hunter Contract', enTask: (g) => `Slay ${g} Vampires, Revenants or Wendigos`,
    noTitle: 'Mørkejeger-oppdrag', noTask: (g) => `Bekjemp ${g} vampyrer, gjengangere eller wendigoer`
  },
  {
    targetType: 'bison', baseGoal: 3, stepGoal: 1, maxGoal: 6, baseGold: 105, food: 4, pelts: 3, dynamite: 0,
    enTitle: 'Thunder Plains Herd', enTask: (g) => `Hunt ${g} Plains Bison in SW Thunder Plains ↙`,
    noTitle: 'Tordenslettens Bison', noTask: (g) => `Felle ${g} præriebison på Thunder Plains ↙`
  },
  {
    targetType: 'fort_bandit', baseGoal: 5, stepGoal: 1, maxGoal: 10, baseGold: 120, food: 0, pelts: 0, dynamite: 3,
    enTitle: 'Fort Rattlesnake Raid', enTask: (g) => `Defeat ${g} Desperados at NE Fort Rattlesnake ↗`,
    noTitle: 'Angrep på Fort Rattlesnake', noTask: (g) => `Bekjemp ${g} desperadoer ved Fort Rattlesnake ↗`
  },
  {
    targetType: 'brimstone_foe', baseGoal: 5, stepGoal: 1, maxGoal: 10, baseGold: 125, food: 2, pelts: 1, dynamite: 1,
    enTitle: 'Brimstone Exorcism', enTask: (g) => `Defeat ${g} Raiders or Revenants in Brimstone SE ↘`,
    noTitle: 'Eksorsisme i Brimstone', noTask: (g) => `Bekjemp ${g} plyndrere eller gjengangere i Brimstone ↘`
  },
  {
    targetType: 'apex_predator', baseGoal: 3, stepGoal: 1, maxGoal: 7, baseGold: 120, food: 3, pelts: 4, dynamite: 0,
    enTitle: 'Silverpine Apex Hunt', enTask: (g) => `Hunt ${g} Cougars, Grizzlies or Alpha Wolves`,
    noTitle: 'Rovdyrjakt i Fjellet', noTask: (g) => `Felle ${g} pumaer, grizzlybjørner eller alfa-ulver`
  },
  {
    targetType: 'treasure_any', baseGoal: 3, stepGoal: 1, maxGoal: 6, baseGold: 125, food: 0, pelts: 1, dynamite: 2,
    enTitle: 'Relic & Gold Expedition', enTask: (g) => `Recover ${g} Strongboxes, Gold Veins, Runes or Moonstones`,
    noTitle: 'Skatte- & Relikviejakt', noTask: (g) => `Finn ${g} pengekasser, gullklumper, solruner eller månesteiner`
  },
  {
    targetType: 'wendigo', baseGoal: 4, stepGoal: 1, maxGoal: 8, baseGold: 135, food: 2, pelts: 3, dynamite: 0,
    enTitle: 'Stone Circle Stalkers', enTask: (g) => `Slay ${g} Wendigos near SW Stone Circle ↙`,
    noTitle: 'Steinringens Rovdyr', noTask: (g) => `Bekjemp ${g} Wendigo-rovdyr ved Steinringen ↙`
  },
  {
    targetType: 'cortez', baseGoal: 1, stepGoal: 0, maxGoal: 1, baseGold: 160, food: 2, pelts: 0, dynamite: 3, fullHeal: true,
    enTitle: 'Warlord Warrant: Cortez', enTask: () => 'Defeat Warlord General Cortez at NE Fort ↗',
    noTitle: 'Etterlyst: General Cortez', noTask: () => 'Beseir krigsherren General Cortez i NØ-fortet ↗'
  },
  {
    targetType: 'marshal', baseGoal: 1, stepGoal: 0, maxGoal: 1, baseGold: 170, food: 2, pelts: 2, dynamite: 2, fullHeal: true,
    enTitle: 'Dead Warrant: Marshal', enTask: () => 'Defeat The Brimstone Marshal in SE Ghost Town ↘',
    noTitle: 'Etterlyst: Brimstone Marshal', noTask: () => 'Beseir den udøde Brimstone Marshal i SØ ↘'
  },
  {
    targetType: 'wendigo_boss', baseGoal: 1, stepGoal: 0, maxGoal: 1, baseGold: 185, food: 3, pelts: 4, dynamite: 0, fullHeal: true,
    enTitle: 'Elder Hunt: Ancient Wendigo', enTask: () => 'Summon & slay The Ancient Wendigo at SW Obelisk ↙',
    noTitle: 'Ur-jakt: Ancient Wendigo', noTask: () => 'Vekk og beseir Ur-Wendigoen ved Obelisken i SV ↙'
  },
  {
    targetType: 'malakor', baseGoal: 1, stepGoal: 0, maxGoal: 1, baseGold: 195, food: 3, pelts: 3, dynamite: 2, fullHeal: true,
    enTitle: 'Blood Warrant: Malakor', enTask: () => 'Summon & slay Lord Malakor at Boot Hill Altar ←',
    noTitle: 'Bloddusør: Lord Malakor', noTask: () => 'Vekk og beseir Lord Malakor ved Boot Hill-alteret ←'
  },
  {
    targetType: 'brimstone_totem', baseGoal: 3, stepGoal: 0, maxGoal: 3, baseGold: 120, food: 0, pelts: 0, dynamite: 3,
    enTitle: 'Brimstone Totem Purge', enTask: (g) => `Shatter ${g} Cursed Brimstone Totems in SE ↘`,
    noTitle: 'Knus Svovel-totemer', noTask: (g) => `Skyt i stykker ${g} Svovel-totemer i SØ ↘`
  },
  {
    targetType: 'bottle', baseGoal: 6, stepGoal: 1, maxGoal: 12, baseGold: 75, food: 2, pelts: 0, dynamite: 1,
    enTitle: 'Gunslinger Exhibition', enTask: (g) => `Shoot down ${g} practice bottles in Dustwood`,
    noTitle: 'Revolver-oppvisning', noTask: (g) => `Skyt ned ${g} øvingsflasker i Dustwood`
  },
  {
    targetType: 'elite_foe', baseGoal: 7, stepGoal: 1, maxGoal: 14, baseGold: 165, food: 3, pelts: 3, dynamite: 2,
    enTitle: 'Four Corners Patrol', enTask: (g) => `Defeat ${g} Elite enemies or Bosses across the map`,
    noTitle: 'Patrulje i De Fire Hjørner', noTask: (g) => `Bekjemp ${g} elitefiender eller bosser på kartet`
  }
];

export function getQuestBySeq(seqNum, prestigeRank = 0) {
  const seq = Math.max(1, Math.floor(seqNum || 1));
  const pMult = 1 + Math.max(0, prestigeRank || 0) * 0.35;

  if (seq <= CURATED_QUEST_CATALOG.length) {
    const base = CURATED_QUEST_CATALOG[seq - 1];
    return {
      seq,
      id: `q_${seq}`,
      targetType: base.targetType,
      goal: base.goal,
      gold: Math.round(base.gold * pMult),
      food: base.food || 0,
      pelts: base.pelts || 0,
      dynamite: base.dynamite || 0,
      fullHeal: !!base.fullHeal,
      grantsSheriffStar: !!base.grantsSheriffStar,
      grantsGoldRevolver: !!base.grantsGoldRevolver,
      enTitle: base.enTitle,
      noTitle: base.noTitle,
      enTask: base.enTask,
      noTask: base.noTask
    };
  }

  const offset = seq - CURATED_QUEST_CATALOG.length - 1;
  const tplIdx = (offset * 7 + Math.floor(offset / PROCEDURAL_QUEST_TEMPLATES.length)) % PROCEDURAL_QUEST_TEMPLATES.length;
  const tpl = PROCEDURAL_QUEST_TEMPLATES[tplIdx];
  const cycle = Math.floor(offset / PROCEDURAL_QUEST_TEMPLATES.length);
  const goal = Math.min(tpl.maxGoal, tpl.baseGoal + cycle * tpl.stepGoal);
  const scaledGold = Math.round((tpl.baseGold + offset * 4) * pMult);

  return {
    seq,
    id: `q_${seq}`,
    targetType: tpl.targetType,
    goal,
    gold: scaledGold,
    food: tpl.food || 0,
    pelts: tpl.pelts || 0,
    dynamite: tpl.dynamite || 0,
    fullHeal: !!tpl.fullHeal,
    grantsSheriffStar: false,
    grantsGoldRevolver: false,
    enTitle: tpl.enTitle,
    noTitle: tpl.noTitle,
    enTask: tpl.enTask(goal),
    noTask: tpl.noTask(goal)
  };
}

export function formatQuestTexts(quest, lang = 'en', opts = {}) {
  const isNo = lang === 'no';
  const title = isNo ? quest.noTitle : quest.enTitle;
  const task = isNo ? quest.noTask : quest.enTask;

  const parts = [];
  parts.push(`+${quest.gold} ${isNo ? 'Gull' : 'Gold'}`);
  if (quest.food > 0) parts.push(`+${quest.food} ${isNo ? 'Mat' : 'Food'}`);
  if (quest.pelts > 0) parts.push(`+${quest.pelts} ${isNo ? 'Skinn' : 'Pelts'}`);
  if (quest.dynamite > 0) parts.push(`+${quest.dynamite} ${isNo ? 'Dynamitt' : 'Dynamite'}`);
  if (quest.grantsSheriffStar && !opts.hasSheriffStar) {
    parts.push(isNo ? 'Sheriff-stjerne' : 'Sheriff Star');
  }
  if (quest.grantsGoldRevolver && !opts.hasGoldenRevolver) {
    parts.push(isNo ? 'Gull-revolver (2x skade)' : 'Gold Revolver (2x Dmg)');
  } else if (quest.grantsGoldRevolver && opts.hasGoldenRevolver) {
    parts.push(isNo ? '+1 Dynamitt' : '+1 Dynamite');
  }
  if (quest.fullHeal) {
    parts.push(isNo ? 'Full Helse' : 'Full Health');
  }

  const rewardSummary = parts.join(', ');
  const rewardLine = isNo ? `Belønning: ${rewardSummary}` : `Reward: ${rewardSummary}`;
  const cardTitleLine = `#${quest.seq} «${title}» – ${task}`;

  return {
    title,
    task,
    rewardSummary,
    rewardLine,
    cardTitleLine
  };
}
