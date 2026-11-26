// Sentralt språksystem (EN standard / NO valg) for 20-nivås kampanje + Evig Prestisje, 8 biomer, eskalering av dusører og butikkoppgraderinger

export const I18N = {
  en: {
    langBtn: 'Language: [EN] / NO',
    wristLangBtn: 'LANG: EN',
    saloonLangSign: 'LANGUAGE: [EN] / NO',
    saloonLangSub: 'Click or shoot to switch',
    pcHintHtml:
      'PC: WASD = move • Click = FPS Mouse • V = 1st/3rd Person Character View • B = Armor, Weapon & Gold Shop • G = Skill • M = Co-op • K = Codex • J = Quest • 1–6/Q = weapon • C/R = horse<br />' +
      'Phone & Pad: Left stick = move • Swipe = look • 🎥 View [V] = see your cowboy • 🛒 Shop [B] = buy Armor, Weapons & Gold • Meta Quest VR: Auto 1st-Person VR!',
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
    outfits: [
      'Frontier Shirt',
      'Leather Vest',
      'Ranger Duster',
      'Direwolf Armor',
      'Vampire Hunter Armor',
      'Marshal Ironclad Armor',
      'Golden Legend Armor'
    ],
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
        title: 'Level 1/50 – Stranger in Dustwood',
        formatProgress: (s) => {
          const parts = [];
          parts.push(s.talkedSheriff ? 'Sheriff ✓' : 'Talk to Sheriff Vance');
          parts.push(`Deer ${Math.min(2, s.act1Deer)}/2`);
          parts.push(s.boughtGear ? 'Upgrade ✓' : 'Buy outfit or weapon');
          return `Level 1/50: Stranger in Dustwood (${parts.join(' • ')})`;
        }
      },
      {
        num: 2,
        title: 'Level 2/50 – Predators of Whispering Woods',
        formatProgress: (s) =>
          `Level 2/50: Whispering Woods (Wolves ${Math.min(3, s.level2Wolves)}/3 • Grizzly ${s.grizzlyDefeated ? '✓' : '0/1'})`
      },
      {
        num: 3,
        title: 'Level 3/50 – Outlaws of Crimson Canyon',
        formatProgress: (s) =>
          `Level 3/50: Crimson Canyon (Bandits ${Math.min(4, s.act2Bandits)}/4 • Captain ${s.captainDefeated ? '✓' : '0/1'})`
      },
      {
        num: 4,
        title: 'Level 4/50 – The Abandoned Gold Mine',
        formatProgress: (s) =>
          `Level 4/50: Deep Gold Mine (Barricades ${Math.min(2, s.barricadesCleared)}/2 • Foreman Slade ${s.sladeDefeated ? '✓' : '0/1'} • Mine Map ${s.mineMapCollected ? '✓' : '0/1'})`
      },
      {
        num: 5,
        title: 'Level 5/50 – The Armored Steam Train',
        formatProgress: (s) =>
          `Level 5/50: Southern Railway (Train Snipers ${Math.min(4, s.trainSnipersKilled)}/4 • Capture Gatling Wagon ${s.trainGatlingCaptured ? '✓' : '0/1'})`
      },
      {
        num: 6,
        title: 'Level 6/50 – Shadows of Boot Hill',
        formatProgress: (s) =>
          `Level 6/50: Boot Hill Graveyard (Vampires ${Math.min(4, s.bootHillVampires)}/4 • Silver Relics ${Math.min(2, s.bootHillRelics)}/2)`
      },
      {
        num: 7,
        title: 'Level 7/50 – The Sunken Catacombs',
        formatProgress: (s) =>
          `Level 7/50: Sunken Catacombs (Guardians ${Math.min(3, s.catacombGuardiansKilled)}/3 • Hellfire Repeater ${s.hellfireCollected ? '✓' : '0/1'})`
      },
      {
        num: 8,
        title: 'Level 8/50 – Blood Moon Reckoning',
        formatProgress: (s) =>
          s.bossActive
            ? `Level 8/50 [BLOOD MOON]: Slay LORD MALAKOR (${Math.max(0, Math.ceil(s.bossHp))}/${s.bossMaxHp} HP)!`
            : 'Level 8/50 [BLOOD MOON]: Ride west & face Lord Malakor at Boot Hill Chapel Altar!'
      },
      {
        num: 9,
        title: 'Level 9/50 – Trails of Thunder Plains',
        formatProgress: (s) =>
          `Level 9/50: Thunder Plains ↙ & Peaks ↖ (Plains Bison ${Math.min(3, s.bisonHunted || 0)}/3 • Mountain Cougars ${Math.min(2, s.cougarsHunted || 0)}/2)`
      },
      {
        num: 10,
        title: 'Level 10/50 – Legend of Silverpine Peak',
        formatProgress: (s) =>
          `Level 10/50: Silverpine Peak ↖ (White Stag ${Math.min(1, s.whiteStagsHunted || 0)}/1 • Alpha Wolves ${Math.min(3, s.alphaWolvesKilled || 0)}/3 • Moonstones ${Math.min(3, s.moonstonesCollected || 0)}/3)`
      },
      {
        num: 11,
        title: 'Level 11/50 – Siege of Fort Rattlesnake',
        formatProgress: (s) =>
          `Level 11/50: Outlaw Fort ↗ (Fort Desperados ${Math.min(5, s.fortBanditsKilled || 0)}/5 • Strongboxes ${Math.min(3, s.strongboxesRecovered || 0)}/3)`
      },
      {
        num: 12,
        title: 'Level 12/50 – Fall of General Cortez',
        formatProgress: (s) =>
          `Level 12/50: Fort Rattlesnake ↗ (Defeat Warlord GENERAL CORTEZ ${s.cortezDefeated ? '✓' : '0/1'})`
      },
      {
        num: 13,
        title: 'Level 13/50 – Cursed Ghost Town of Brimstone',
        formatProgress: (s) =>
          `Level 13/50: Brimstone ↘ (Raiders & Revenants ${Math.min(5, s.brimstoneFoesKilled || 0)}/5 • Cursed Totems ${Math.min(3, s.brimstoneTotemsShattered || 0)}/3)`
      },
      {
        num: 14,
        title: 'Level 14/50 – The Brimstone Marshal',
        formatProgress: (s) =>
          `Level 14/50: Brimstone Ghost Town ↘ (Defeat THE BRIMSTONE MARSHAL ${s.brimstoneMarshalDefeated ? '✓' : '0/1'})`
      },
      {
        num: 15,
        title: 'Level 15/50 – Whispers of the Stone Circle',
        formatProgress: (s) =>
          `Level 15/50: Ancient Stone Circle ↙ (Sun Runes ${Math.min(3, s.ancientRunesAttuned || 0)}/3 • Wendigo Stalkers ${Math.min(4, s.wendigosKilled || 0)}/4)`
      },
      {
        num: 16,
        title: 'Level 16/50 – Wrath of the Ancient Wendigo',
        formatProgress: (s) =>
          s.wendigoBossActive
            ? `Level 16/50 [STONE CIRCLE ↙]: Slay ANCIENT WENDIGO (${Math.max(0, Math.ceil(s.wendigoBossHp || 0))}/${s.wendigoBossMaxHp || 42} HP)!`
            : 'Level 16/50: Shoot or touch the Stone Circle Obelisk ↙ & slay THE ANCIENT WENDIGO!'
      },
      {
        num: 17,
        title: 'Level 17/50 – Master of Dustwood',
        formatProgress: (s) =>
          `Level 17/50: Frontier Mastery (Bounties Completed ${Math.min(5, s.totalBountiesDone || 0)}/5 • Master Gear/Smithing ${s.masterUpgradeBought ? '✓' : '0/1'})`
      },
      {
        num: 18,
        title: 'Level 18/50 – War Across Four Corners',
        formatProgress: (s) =>
          `Level 18/50: Four Corners Sweep (Elite Foes & Bosses ${Math.min(12, s.eliteKills || 0)}/12)`
      },
      {
        num: 19,
        title: 'Level 19/50 – Night of the Eclipse',
        formatProgress: (s) =>
          `Level 19/50: Eclipse Hunt (Vampires, Revenants & Wendigos ${Math.min(10, s.eclipseKills || 0)}/10)`
      },
      {
        num: 20,
        title: 'Level 20/50 – Eternal Blood Moon',
        formatProgress: (s) =>
          s.bossActive
            ? `Level 20/50 [BLOOD MOON]: Slay ASCENDED MALAKOR (${Math.max(0, Math.ceil(s.bossHp))}/${s.bossMaxHp} HP)!`
            : 'Level 20/50 [BLOOD MOON]: Summon & destroy Ascended Lord Malakor at Boot Hill Altar!'
      },
      {
        num: 21,
        title: 'Level 21/50 – Dustwood Homestead Founder',
        formatProgress: (s) =>
          `Level 21/50: Homestead Ranch (Buy 2 Ranch/Talent Upgrades in Town ${Math.min(2, s.ranchTotalRanks || 0)}/2)`
      },
      {
        num: 22,
        title: 'Level 22/50 – Loyal Frontier Warhound',
        formatProgress: (s) =>
          `Level 22/50: Faithful Hound (Recruit Warhound "Rex" at Homestead Ranch ${(s.warhoundRank || 0) >= 1 ? '✓' : '0/1'} • Hunt 4 Beasts ${Math.min(4, s.s22Beasts || 0)}/4)`
      },
      {
        num: 23,
        title: 'Level 23/50 – Golden Horseshoe Trail I',
        formatProgress: (s) =>
          `Level 23/50: Relic Explorer (Find 4 Golden Horseshoes across the map ${Math.min(4, s.horseshoesFound || 0)}/4)`
      },
      {
        num: 24,
        title: "Level 24/50 – Mirage of Dead Man's Oasis",
        formatProgress: (s) =>
          `Level 24/50: Dead Man's Oasis ↓ (Scarab Idols ${Math.min(3, s.oasisIdolsCollected || 0)}/3 • Oasis Stalkers ${Math.min(3, s.oasisFoesKilled || 0)}/3)`
      },
      {
        num: 25,
        title: 'Level 25/50 – Wrath of the Sandwraith King',
        formatProgress: (s) =>
          `Level 25/50: Dead Man's Oasis ↓ (Defeat SANDWRAITH KING ${s.sandwraithDefeated ? '✓' : '0/1'})`
      },
      {
        num: 26,
        title: 'Level 26/50 – Ranch Cattle Baron',
        formatProgress: (s) =>
          `Level 26/50: Frontier Economy (Reach 5 Ranch/Talent Upgrades ${Math.min(5, s.ranchTotalRanks || 0)}/5 • Complete 10 Quests ${Math.min(10, s.totalBountiesDone || 0)}/10)`
      },
      {
        num: 27,
        title: 'Level 27/50 – Frostfang Timber Expedition',
        formatProgress: (s) =>
          `Level 27/50: Frostfang Mill ↑ (Redwood Crates ${Math.min(3, s.millCratesCollected || 0)}/3 • Alpha Wolves ${Math.min(5, s.alphaWolvesKilled || 0)}/5)`
      },
      {
        num: 28,
        title: 'Level 28/50 – Old Goliath of the North',
        formatProgress: (s) =>
          `Level 28/50: Frostfang Mill ↑ (Defeat Elder Kodiak OLD GOLIATH ${s.goliathDefeated ? '✓' : '0/1'})`
      },
      {
        num: 29,
        title: 'Level 29/50 – Golden Horseshoe Trail II',
        formatProgress: (s) =>
          `Level 29/50: Relic Seeker (Find 8 Golden Horseshoes ${Math.min(8, s.horseshoesFound || 0)}/8)`
      },
      {
        num: 30,
        title: 'Level 30/50 – Fires of Diablo Caldera',
        formatProgress: (s) =>
          `Level 30/50: Diablo Caldera ↘ (Meteoric Cores ${Math.min(3, s.meteorCoresCollected || 0)}/3 • Hellhounds ${Math.min(3, s.hellhoundsKilled || 0)}/3)`
      },
      {
        num: 31,
        title: 'Level 31/50 – Fall of El Fuego',
        formatProgress: (s) =>
          `Level 31/50: Diablo Caldera ↘ (Defeat Obsidian Juggernaut EL FUEGO ${s.elFuegoDefeated ? '✓' : '0/1'})`
      },
      {
        num: 32,
        title: 'Level 32/50 – Master Gunsmith & Deadeye',
        formatProgress: (s) =>
          `Level 32/50: Master Gunslinger (Reach 12 Ranch/Talent Ranks ${Math.min(12, s.ranchTotalRanks || 0)}/12 • Complete 20 Quests ${Math.min(20, s.totalBountiesDone || 0)}/20)`
      },
      {
        num: 33,
        title: "Level 33/50 – Secrets of Raven's Roost",
        formatProgress: (s) =>
          `Level 33/50: Raven's Roost ↖ (Starlight Shards ${Math.min(3, s.starShardsCollected || 0)}/3 • Phantom Outlaws ${Math.min(3, s.observatoryFoesKilled || 0)}/3)`
      },
      {
        num: 34,
        title: 'Level 34/50 – Duel with Blackfeather',
        formatProgress: (s) =>
          `Level 34/50: Raven's Roost ↖ (Defeat Phantom Gunslinger BLACKFEATHER ${s.blackfeatherDefeated ? '✓' : '0/1'})`
      },
      {
        num: 35,
        title: 'Level 35/50 – Golden Horseshoe Trail III',
        formatProgress: (s) =>
          `Level 35/50: Master Tracker (Find 14 Golden Horseshoes ${Math.min(14, s.horseshoesFound || 0)}/14)`
      },
      {
        num: 36,
        title: 'Level 36/50 – Conquer All Eight Overlords',
        formatProgress: (s) => {
          const bCount = [
            s.bossDefeated, s.cortezDefeated, s.brimstoneMarshalDefeated, s.wendigoBossDefeated,
            s.sandwraithDefeated, s.goliathDefeated, s.elFuegoDefeated, s.blackfeatherDefeated
          ].filter(Boolean).length;
          return `Level 36/50: Eight Overlords (Unique World Bosses Defeated ${bCount}/8)`;
        }
      },
      {
        num: 37,
        title: 'Level 37/50 – Frontier Bounty Veteran',
        formatProgress: (s) =>
          `Level 37/50: Sheriff's Right Hand (Complete 35 Saloon Quests ${Math.min(35, s.totalBountiesDone || 0)}/35)`
      },
      {
        num: 38,
        title: 'Level 38/50 – Warhound Pack Alpha',
        formatProgress: (s) =>
          `Level 38/50: Rex Mastery (Upgrade Warhound to Rank 5 ${Math.min(5, s.warhoundRank || 0)}/5 • Elite Kills ${Math.min(35, s.eliteKills || 0)}/35)`
      },
      {
        num: 39,
        title: 'Level 39/50 – Golden Horseshoe Trail IV',
        formatProgress: (s) =>
          `Level 39/50: Grand Explorer (Find 20 Golden Horseshoes ${Math.min(20, s.horseshoesFound || 0)}/20)`
      },
      {
        num: 40,
        title: 'Level 40/50 – Baron of Dustwood Valley',
        formatProgress: (s) =>
          `Level 40/50: Homestead Tycoon (Reach 25 Total Ranch/Talent Upgrades ${Math.min(25, s.ranchTotalRanks || 0)}/25)`
      },
      {
        num: 41,
        title: 'Level 41/50 – Great Plains & Mountain Hunter',
        formatProgress: (s) =>
          `Level 41/50: Master Trapper (Bison ${Math.min(12, s.bisonHunted || 0)}/12 • Cougars ${Math.min(10, s.cougarsHunted || 0)}/10 • White Stags ${Math.min(4, s.whiteStagsHunted || 0)}/4)`
      },
      {
        num: 42,
        title: 'Level 42/50 – Outlaw Empire Breaker',
        formatProgress: (s) =>
          `Level 42/50: Lawbringer (Complete 55 Saloon Quests ${Math.min(55, s.totalBountiesDone || 0)}/55 • Total Kills ${Math.min(250, s.totalKills || 0)}/250)`
      },
      {
        num: 43,
        title: 'Level 43/50 – All 24 Golden Horseshoes',
        formatProgress: (s) =>
          `Level 43/50: Complete Relic Set (Find all 24 Golden Horseshoes ${Math.min(24, s.horseshoesFound || 0)}/24)`
      },
      {
        num: 44,
        title: 'Level 44/50 – Purge of the Shadow Wastes',
        formatProgress: (s) =>
          `Level 44/50: Shadow Purge (Eclipse & Night Fiends Slain ${Math.min(50, s.eclipseKills || 0)}/50)`
      },
      {
        num: 45,
        title: 'Level 45/50 – Grand Ranch Empire',
        formatProgress: (s) =>
          `Level 45/50: Empire Builder (Reach 40 Total Ranch/Talent Upgrades ${Math.min(40, s.ranchTotalRanks || 0)}/40)`
      },
      {
        num: 46,
        title: 'Level 46/50 – Hundred-Contract Marshal',
        formatProgress: (s) =>
          `Level 46/50: Marshal's Ledger (Complete 80 Saloon Quests ${Math.min(80, s.totalBountiesDone || 0)}/80)`
      },
      {
        num: 47,
        title: 'Level 47/50 – Slayer of Legends',
        formatProgress: (s) =>
          `Level 47/50: Elite Vanguard (Elite Enemies & Bosses Slain ${Math.min(80, s.eliteKills || 0)}/80)`
      },
      {
        num: 48,
        title: 'Level 48/50 – Mythic Arsenal & Ironhide',
        formatProgress: (s) =>
          `Level 48/50: Peak Power (Total Kills ${Math.min(450, s.totalKills || 0)}/450 • Ranch/Talent Ranks ${Math.min(55, s.ranchTotalRanks || 0)}/55)`
      },
      {
        num: 49,
        title: 'Level 49/50 – Centennial Bounty Legend',
        formatProgress: (s) =>
          `Level 49/50: Centennial Lawman (Complete 100 Saloon Quests ${Math.min(100, s.totalBountiesDone || 0)}/100)`
      },
      {
        num: 50,
        title: 'Level 50/50 – The Immortal Cowboy',
        formatProgress: (s) =>
          `Level 50/50 [GRAND FINALE]: Slay Lord Malakor & Ancient Wendigo (${s.immortalFinaleMalakor ? 'Malakor ✓' : 'Malakor 0/1'} • ${s.immortalFinaleWendigo ? 'Wendigo ✓' : 'Wendigo 0/1'})!`
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
      '"Visit your new Homestead Ranch in Dustwood SE! Invest in Cattle, Talents & recruit Warhound Rex!"',
      '"Explore all 12 regions, collect 24 Golden Horseshoes, defeat all 8 Bosses & reach 100% in the Codex [K]!"'
    ],

    // Town & 12-Region Signs
    signSaloonTitle: 'SALOON',
    signSaloonSub: 'TAVERN & BOUNTIES',
    signTailorTitle: 'TAILOR',
    signTailorSub: 'ARMOR & MAX HP',
    signGunsmithTitle: 'GUNSMITH',
    signGunsmithSub: 'WEAPONS & MASTERY',
    signSafeHouseTitle: 'SAFE HOUSE',
    signSafeHouseSub: 'SHERIFF SHELTER',
    signHomesteadTitle: 'HOMESTEAD RANCH',
    signHomesteadSub: 'EMPIRE • TALENTS • HOUND',
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
    signOasisTitle: "DEAD MAN'S OASIS",
    signOasisSub: 'SUNKEN MIRAGE TEMPLE',
    signMillTitle: 'FROSTFANG MILL',
    signMillSub: 'OLD GOLIATH DEN',
    signCalderaTitle: 'DIABLO CALDERA',
    signCalderaSub: 'OBSIDIAN FORGE',
    signObservatoryTitle: "RAVEN'S ROOST",
    signObservatorySub: 'ASTRAL OBSERVATORY',

    roadWoodsTitle: '↑ WHISPERING WOODS',
    roadWoodsSub: 'River Bridge • Deer • Grizzlies',
    roadCanyonTitle: '→ CRIMSON CANYON',
    roadCanyonSub: 'Outlaw Camp & Deep Mine',
    roadGraveyardTitle: '← BOOT HILL',
    roadGraveyardSub: 'Graveyard & Sunken Catacombs',
    roadRailwayTitle: '↓ SOUTHERN RAILWAY',
    roadRailwaySub: 'Armored Steam Train & Bridge',
    roadTownTitle: 'DUSTWOOD TOWN',
    roadTownSub: 'Saloon • Ranch • Horse',
    roadSilverpineTitle: '↖ SILVERPINE PEAK',
    roadSilverpineSub: 'White Stag • Cougars • Moonstones',
    roadFortTitle: '↗ FORT RATTLESNAKE',
    roadFortSub: 'Outlaw Fort & General Cortez',
    roadBrimstoneTitle: '↘ BRIMSTONE TOWN',
    roadBrimstoneSub: 'Ghost Town & Brimstone Marshal',
    roadStoneCircleTitle: '↙ THUNDER PLAINS',
    roadStoneCircleSub: 'Bison • Stone Circle • Wendigo',
    roadOasisTitle: "↓ DEAD MAN'S OASIS",
    roadOasisSub: 'Mirage Temple & Sandwraith King',
    roadMillTitle: '↑ FROSTFANG MILL',
    roadMillSub: 'Sawmill & Old Goliath Kodiak',
    roadCalderaTitle: '↘ DIABLO CALDERA',
    roadCalderaSub: 'Obsidian Forge & El Fuego',
    roadObservatoryTitle: "↖ RAVEN'S ROOST",
    roadObservatorySub: 'Astral Ruin & Blackfeather',

    // Homestead Ranch, Passive Empire, Cowboy Talents & Warhound Companion
    homesteadBoardTitle: 'HOMESTEAD RANCH & TALENTS',
    homesteadInfo: (gold, pelts, incomePerMin, houndRank) =>
      `Gold: ${gold} • Pelts: ${pelts} • Ranch Income: +${incomePerMin} Gold/min${houndRank > 0 ? ` • Rex Lv.${houndRank}` : ''}`,
    homesteadSlots: {
      cattle: (lv, maxLv, cost) =>
        lv >= maxLv
          ? `Cattle & Gold Shares [MAX Lv.${lv}] -> +${lv * 8} Gold/min + Rations`
          : `Cattle & Gold Shares Lv.${lv + 1}/${maxLv} (${cost} Gold) -> +8 Gold/min + Food`,
      trapper: (lv, maxLv, cost) =>
        lv >= maxLv
          ? `Trapper's Trading Post [MAX Lv.${lv}] -> Passive Pelts & Bonus Loot`
          : `Trapper's Post Lv.${lv + 1}/${maxLv} (${cost} Gold) -> Passive Pelts & +Loot`,
      deadeye: (lv, maxLv, cost) =>
        lv >= maxLv
          ? `Deadeye Gunslinger Talent [MAX Lv.${lv}] -> +${lv * 12}% All Dmg`
          : `Deadeye Talent Lv.${lv + 1}/${maxLv} (${cost} Gold) -> +12% All Weapon Dmg`,
      trailblazer: (lv, maxLv, costGold, costPelts) =>
        lv >= maxLv
          ? `Ironhide & Mustang Speed [MAX Lv.${lv}] -> +${lv * 10} HP & +${lv * 2}% Speed`
          : `Ironhide & Mustang Lv.${lv + 1}/${maxLv} (${costGold}G + ${costPelts}P) -> +10 Max HP & +Speed`,
      warhound: (lv, maxLv, costGold, costPelts) =>
        lv === 0
          ? `Recruit Loyal Warhound "Rex" (${costGold}G + ${costPelts}P) -> Fights Beside You!`
          : (lv >= maxLv
            ? `Loyal Warhound "Rex" [MAX Lv.${lv}] -> ${+(1.5 + lv * 0.9).toFixed(1)} Bite Dmg`
            : `Train Warhound "Rex" Lv.${lv + 1}/${maxLv} (${costGold}G + ${costPelts}P) -> Stronger Attack`)
    },
    homesteadMsgMaxed: 'Maximum rank reached for this Homestead upgrade!',
    homesteadMsgNoRes: 'Need more Gold or Pelts! Complete bounties or hunt wild game.',
    homesteadMsgBought: (name, lv) => `Upgraded ${name} to Rank ${lv}!`,
    ranchIncomeToast: (goldGain, foodGain, peltGain) =>
      `💰 Homestead Ranch Dividend: +${goldGain} Gold${foodGain > 0 ? `, +${foodGain} Food` : ''}${peltGain > 0 ? `, +${peltGain} Pelt` : ''}!`,
    horseshoeToast: (count, pct) =>
      `🧲 Golden Horseshoe Found (${count}/24)! +50 Gold & +${pct}% Permanent Gold/Dmg Bonus!`,

    // Dynamic World Events
    worldEvents: {
      gold_rush: '☀ GOLD RUSH EVENT (90s): 2x Gold from all enemies, pickups & bounties!',
      great_migration: '🦌 GREAT MIGRATION (90s): +1 Extra Pelt & +1 Extra Food on every hunt!',
      frontier_storm: '⚡ THUNDERSTORM SURGE (90s): +35% All Weapon Damage & +50% Gold!',
      blood_eclipse: '🌑 BLOOD ECLIPSE (90s): 2x Gold & +1 Extra Pelt across the Frontier!'
    },

    // 100% Completionist Codex & Stagecoach Fast Travel [K]
    codexBtn: (pct) => `📖 Codex & Travel: ${pct}%`,
    codexTitle: 'FRONTIER CODEX, 100% PROGRESS & STAGECOACH TRAVEL',
    codexCloseBtn: 'Close [K]',
    codexOverallLabel: (pct, hours) => `Total 200h Completion: ${pct}%  •  Playtime: ${hours}`,
    codexPillars: (d) => [
      `1. Grand Campaign: Level ${Math.min(50, d.level)} / 50`,
      `2. Frontier Prestige: Rank ${Math.min(10, d.prestige)} / 10`,
      `3. Saloon Quests Cleared: ${d.bounties} / 250`,
      `4. Golden Horseshoes Found: ${d.horseshoes} / 24 (+${d.horseshoes * 2}% Bonus)`,
      `5. Unique World Bosses Slain: ${d.bosses} / 8`,
      `6. Homestead Ranch & Rex Ranks: ${d.ranchRanks} / 85`,
      `7. Armor & Weapon Mastery: ${d.gearRanks} / 35`,
      `8. Frontier Combat & Hunts: ${d.kills} / 2500`
    ],
    codexTravelHeader: '🐎 STAGECOACH FAST TRAVEL (Instant Ride to Any Region):',
    codexRegions: [
      { id: 'town', label: 'Dustwood Town (Hub & Shops)', x: 0, z: 13.5, yaw: 0 },
      { id: 'woods', label: '↑ Whispering Woods Bridge', x: 0, z: -69.5, yaw: 0 },
      { id: 'canyon', label: '→ Crimson Canyon & Mine', x: 112.0, z: -1.5, yaw: -1.57 },
      { id: 'railway', label: '↓ Armored Steam Train', x: 4.0, z: 65.5, yaw: 3.14 },
      { id: 'boothill', label: '← Boot Hill Chapel & Crypt', x: -102.0, z: -1.5, yaw: 1.57 },
      { id: 'silverpine', label: '↖ Silverpine Peak', x: -131.0, z: -124.0, yaw: 0.78 },
      { id: 'fort', label: '↗ Fort Rattlesnake', x: 140.0, z: -115.5, yaw: 0 },
      { id: 'brimstone', label: '↘ Brimstone Ghost Town', x: 124.0, z: 136.0, yaw: -1.57 },
      { id: 'stonecircle', label: '↙ Thunder Plains Circle', x: -124.0, z: 136.0, yaw: 1.57 },
      { id: 'oasis', label: "↓ Dead Man's Oasis", x: -6.0, z: 152.5, yaw: 3.14 },
      { id: 'mill', label: '↑ Frostfang Timber Mill', x: 2.0, z: -161.5, yaw: 0 },
      { id: 'caldera', label: '↘ Diablo Caldera Forge', x: 159.5, z: 62.0, yaw: -1.57 },
      { id: 'observatory', label: "↖ Raven's Roost Ruin", x: -161.5, z: -68.0, yaw: 1.57 }
    ],

    // Tailor Shop (Outfits Tiers 1–4 + Repeatable Max HP Reinforcement & Rations)
    tailorBoardTitle: "TAILOR'S ARMOR & OUTFIT SHOP",
    tailorInfo: (pelts, outfit, maxHp, gold = 0) =>
      `Gold: ${gold}  •  Pelts: ${pelts}  •  Armor: ${outfit}  •  Max HP: ${maxHp || 100}`,
    tailorButtons: [
      'Leather Vest (55 Gold or 2 Pelts) -> 25% Armor +20 HP',
      'Direwolf Armor (220 Gold or 4 Pelts) -> 55% Armor +75 HP',
      'Vampire Hunter Armor (380 Gold or 6 Pelts) -> 70% Armor +110 HP'
    ],
    tailorMythicBtn: (owned) =>
      owned
        ? 'Golden Legend Armor -> 85% Armor +240 HP [EQUIPPED]'
        : 'Golden Legend Armor (1250 Gold or 16 Pelts) -> 85% Armor +240 HP',
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
      'Double-Barrel Shotgun (45 Gold) -> 6-Pellet Heavy Blast',
      'Winchester Rifle (85 Gold) -> Long-Range Precision (3x Dmg)',
      'Silver Crossbow (165 Gold or 65G+2P) -> 3x Burn vs Undead',
      '3x Dynamite Pack (15 Gold) -> Thrown 2.2s Explosive Blast',
      'Hellfire Repeater (450 Gold / Lv7: 120G) -> Rapid Silver Gatling'
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
    sandwraithBarTitle: 'SANDWRAITH KING — OASIS OVERLORD',
    goliathBarTitle: 'OLD GOLIATH — ELDER KODIAK',
    elFuegoBarTitle: 'EL FUEGO — OBSIDIAN JUGGERNAUT',
    blackfeatherBarTitle: 'BLACKFEATHER — PHANTOM GUNSLINGER',
    captainLabel: 'BANDIT CAPTAIN'
  },

  no: {
    langBtn: 'Språk: EN / [NO]',
    wristLangBtn: 'SPRÅK: NO',
    saloonLangSign: 'SPRÅK: EN / [NO]',
    saloonLangSub: 'Klikk eller skyt for å bytte',
    pcHintHtml:
      'PC: WASD = gå • Klikk = FPS-mus • V = 1./3.-person karaktervisning • B = Butikk (Armor, Våpen & Gull) • G = Egenskap • M = Co-op • K = Kodeks • J = Oppdrag • 1–6/Q = våpen • C/R = hest<br />' +
      'Telefon & Pad: Venstre spak = gå • Sveip = se rundt • 🎥 Visning [V] = se cowboyen din • 🛒 Butikk [B] = kjøp Armor, Våpen & Gull • Meta Quest VR: Automatisk 1.-person VR!',
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
    careerResetConfirmBtn: 'Bekkrft sletting?'.replace('Bekkrft', 'Bekreft'),
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
    outfits: [
      'Nybygger-skjorte',
      'Speider-lærvest',
      'Prærie-støvfrakk',
      'Vargpels-rustning',
      'Vampyrjeger-rustning',
      'Marskalk-pansring',
      'Legendarisk Gullrustning'
    ],
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
        title: 'Level 1/50 – Fremmed i Dustwood',
        formatProgress: (s) => {
          const parts = [];
          parts.push(s.talkedSheriff ? 'Sheriff ✓' : 'Snakk med Sheriff Vance');
          parts.push(`Hjort ${Math.min(2, s.act1Deer)}/2`);
          parts.push(s.boughtGear ? 'Oppgradering ✓' : 'Kjøp antrekk/våpen');
          return `Level 1/50: Fremmed i Dustwood (${parts.join(' • ')})`;
        }
      },
      {
        num: 2,
        title: 'Level 2/50 – Rovdyrene i Whispering Woods',
        formatProgress: (s) =>
          `Level 2/50: Whispering Woods (Ulver ${Math.min(3, s.level2Wolves)}/3 • Grizzly ${s.grizzlyDefeated ? '✓' : '0/1'})`
      },
      {
        num: 3,
        title: 'Level 3/50 – Lovløse i Crimson Canyon',
        formatProgress: (s) =>
          `Level 3/50: Crimson Canyon (Banditter ${Math.min(4, s.act2Bandits)}/4 • Kaptein ${s.captainDefeated ? '✓' : '0/1'})`
      },
      {
        num: 4,
        title: 'Level 4/50 – Den Forlatte Gullgruven',
        formatProgress: (s) =>
          `Level 4/50: Dyp Gullgruve (Barrikader ${Math.min(2, s.barricadesCleared)}/2 • Formann Slade ${s.sladeDefeated ? '✓' : '0/1'} • Gruvekart ${s.mineMapCollected ? '✓' : '0/1'})`
      },
      {
        num: 5,
        title: 'Level 5/50 – Det Pansrede Damptoget',
        formatProgress: (s) =>
          `Level 5/50: Søndre Jernbane (Tog-skarpskyttere ${Math.min(4, s.trainSnipersKilled)}/4 • Erobre Gatling-vogn ${s.trainGatlingCaptured ? '✓' : '0/1'})`
      },
      {
        num: 6,
        title: 'Level 6/50 – Skyggene på Boot Hill',
        formatProgress: (s) =>
          `Level 6/50: Boot Hill Kirkegård (Vampyrer ${Math.min(4, s.bootHillVampires)}/4 • Sølvrelikvier ${Math.min(2, s.bootHillRelics)}/2)`
      },
      {
        num: 7,
        title: 'Level 7/50 – Den Sunkne Katakombe',
        formatProgress: (s) =>
          `Level 7/50: Sunkne Katakombe (Voktere ${Math.min(3, s.catacombGuardiansKilled)}/3 • Hellfire-karabin ${s.hellfireCollected ? '✓' : '0/1'})`
      },
      {
        num: 8,
        title: 'Level 8/50 – Blodmånens Oppgjør',
        formatProgress: (s) =>
          s.bossActive
            ? `Level 8/50 [BLODMÅNE]: Beseir LORD MALAKOR (${Math.max(0, Math.ceil(s.bossHp))}/${s.bossMaxHp} HP)!`
            : 'Level 8/50 [BLODMÅNE]: Ri vest til Boot Hill og møt Lord Malakor ved Kapellalteret!'
      },
      {
        num: 9,
        title: 'Level 9/50 – Tordensletten & Fjellpasset',
        formatProgress: (s) =>
          `Level 9/50: Thunder Plains ↙ & Fjell ↖ (Præriebison ${Math.min(3, s.bisonHunted || 0)}/3 • Fjellpuma ${Math.min(2, s.cougarsHunted || 0)}/2)`
      },
      {
        num: 10,
        title: 'Level 10/50 – Legenden på Silverpine Peak',
        formatProgress: (s) =>
          `Level 10/50: Silverpine Peak ↖ (Hvit Kronhjort ${Math.min(1, s.whiteStagsHunted || 0)}/1 • Alfa-ulver ${Math.min(3, s.alphaWolvesKilled || 0)}/3 • Månesteiner ${Math.min(3, s.moonstonesCollected || 0)}/3)`
      },
      {
        num: 11,
        title: 'Level 11/50 – Beleiringen av Fort Rattlesnake',
        formatProgress: (s) =>
          `Level 11/50: Bandittfortet ↗ (Fort-desperadoer ${Math.min(5, s.fortBanditsKilled || 0)}/5 • Pengekasser ${Math.min(3, s.strongboxesRecovered || 0)}/3)`
      },
      {
        num: 12,
        title: 'Level 12/50 – General Cortez sitt Fall',
        formatProgress: (s) =>
          `Level 12/50: Fort Rattlesnake ↗ (Beseir krigsherren GENERAL CORTEZ ${s.cortezDefeated ? '✓' : '0/1'})`
      },
      {
        num: 13,
        title: 'Level 13/50 – Spøkelsesbyen Brimstone',
        formatProgress: (s) =>
          `Level 13/50: Brimstone ↘ (Plyndrere & Gjengangere ${Math.min(5, s.brimstoneFoesKilled || 0)}/5 • Svovel-totemer ${Math.min(3, s.brimstoneTotemsShattered || 0)}/3)`
      },
      {
        num: 14,
        title: 'Level 14/50 – Den Udøde Marskalken',
        formatProgress: (s) =>
          `Level 14/50: Spøkelsesbyen Brimstone ↘ (Beseir BRIMSTONE MARSHAL ${s.brimstoneMarshalDefeated ? '✓' : '0/1'})`
      },
      {
        num: 15,
        title: 'Level 15/50 – Steinringens Hemmelighet',
        formatProgress: (s) =>
          `Level 15/50: Steinringen ↙ (Solruner ${Math.min(3, s.ancientRunesAttuned || 0)}/3 • Wendigo-rovdyr ${Math.min(4, s.wendigosKilled || 0)}/4)`
      },
      {
        num: 16,
        title: 'Level 16/50 – Ur-Wendigoens Vrede',
        formatProgress: (s) =>
          s.wendigoBossActive
            ? `Level 16/50 [STEINRINGEN ↙]: Beseir ANCIENT WENDIGO (${Math.max(0, Math.ceil(s.wendigoBossHp || 0))}/${s.wendigoBossMaxHp || 42} HP)!`
            : 'Level 16/50: Skyt eller berør Obelisken i Steinringen ↙ og beseir ANCIENT WENDIGO!'
      },
      {
        num: 17,
        title: 'Level 17/50 – Mester av Dustwood',
        formatProgress: (s) =>
          `Level 17/50: Grenselandsmester (Dusører fullført ${Math.min(5, s.totalBountiesDone || 0)}/5 • Mesterutstyr/Smiing ${s.masterUpgradeBought ? '✓' : '0/1'})`
      },
      {
        num: 18,
        title: 'Level 18/50 – Krigen om De Fire Hjørner',
        formatProgress: (s) =>
          `Level 18/50: De Fire Hjørner (Elitefiender & Bosser ${Math.min(12, s.eliteKills || 0)}/12)`
      },
      {
        num: 19,
        title: 'Level 19/50 – Formørkelsens Natt',
        formatProgress: (s) =>
          `Level 19/50: Mørkejakt (Vampyrer, Gjengangere & Wendigoer ${Math.min(10, s.eclipseKills || 0)}/10)`
      },
      {
        num: 20,
        title: 'Level 20/50 – Den Evige Blodmåne',
        formatProgress: (s) =>
          s.bossActive
            ? `Level 20/50 [BLODMÅNE]: Beseir OPPHØYET MALAKOR (${Math.max(0, Math.ceil(s.bossHp))}/${s.bossMaxHp} HP)!`
            : 'Level 20/50 [BLODMÅNE]: Vekk og knus Opphøyet Lord Malakor ved Boot Hill-alteret!'
      },
      {
        num: 21,
        title: 'Level 21/50 – Grunnleggeren av Dustwood Ranch',
        formatProgress: (s) =>
          `Level 21/50: Homestead Ranch (Kjøp 2 Ranch-/Talent-oppgraderinger i byen ${Math.min(2, s.ranchTotalRanks || 0)}/2)`
      },
      {
        num: 22,
        title: 'Level 22/50 – Trofast Jakthund «Rex»',
        formatProgress: (s) =>
          `Level 22/50: Følgesvenn (Rekrutter jakthunden «Rex» på Ranchen ${(s.warhoundRank || 0) >= 1 ? '✓' : '0/1'} • Felle 4 vilt ${Math.min(4, s.s22Beasts || 0)}/4)`
      },
      {
        num: 23,
        title: 'Level 23/50 – Sporet av Gull-Hestesko I',
        formatProgress: (s) =>
          `Level 23/50: Skattefinner (Finn 4 skjulte Gull-Hestesko ${Math.min(4, s.horseshoesFound || 0)}/4)`
      },
      {
        num: 24,
        title: "Level 24/50 – Luftspeilingen ved Dead Man's Oasis",
        formatProgress: (s) =>
          `Level 24/50: Dead Man's Oasis ↓ (Skarabé-idoler ${Math.min(3, s.oasisIdolsCollected || 0)}/3 • Oase-voktere ${Math.min(3, s.oasisFoesKilled || 0)}/3)`
      },
      {
        num: 25,
        title: 'Level 25/50 – Sandkongens Vrede',
        formatProgress: (s) =>
          `Level 25/50: Dead Man's Oasis ↓ (Beseir SANDWRAITH KING ${s.sandwraithDefeated ? '✓' : '0/1'})`
      },
      {
        num: 26,
        title: 'Level 26/50 – Kvegbaronen i Dustwood',
        formatProgress: (s) =>
          `Level 26/50: Ranch-imperium (Nå 5 Ranch-/Talent-trinn ${Math.min(5, s.ranchTotalRanks || 0)}/5 • Fullfør 10 oppdrag ${Math.min(10, s.totalBountiesDone || 0)}/10)`
      },
      {
        num: 27,
        title: 'Level 27/50 – Ekspedisjon til Frostfang Sagbruk',
        formatProgress: (s) =>
          `Level 27/50: Frostfang Sagbruk ↑ (Tømmerkasser ${Math.min(3, s.millCratesCollected || 0)}/3 • Alfa-ulver ${Math.min(5, s.alphaWolvesKilled || 0)}/5)`
      },
      {
        num: 28,
        title: 'Level 28/50 – Gamle Goliat i Nord',
        formatProgress: (s) =>
          `Level 28/50: Frostfang Sagbruk ↑ (Beseir ur-bjørnen OLD GOLIATH ${s.goliathDefeated ? '✓' : '0/1'})`
      },
      {
        num: 29,
        title: 'Level 29/50 – Sporet av Gull-Hestesko II',
        formatProgress: (s) =>
          `Level 29/50: Relikviejeger (Finn 8 skjulte Gull-Hestesko ${Math.min(8, s.horseshoesFound || 0)}/8)`
      },
      {
        num: 30,
        title: 'Level 30/50 – Ilden i Diablo Caldera',
        formatProgress: (s) =>
          `Level 30/50: Diablo Caldera ↘ (Meteorkjerner ${Math.min(3, s.meteorCoresCollected || 0)}/3 • Helveteshunder ${Math.min(3, s.hellhoundsKilled || 0)}/3)`
      },
      {
        num: 31,
        title: 'Level 31/50 – El Fuegos Fall',
        formatProgress: (s) =>
          `Level 31/50: Diablo Caldera ↘ (Beseir obsidian-kjempen EL FUEGO ${s.elFuegoDefeated ? '✓' : '0/1'})`
      },
      {
        num: 32,
        title: 'Level 32/50 – Mesterskytter & Ranch-utbygger',
        formatProgress: (s) =>
          `Level 32/50: Skarpskytter (Nå 12 Ranch-/Talent-trinn ${Math.min(12, s.ranchTotalRanks || 0)}/12 • Fullfør 20 oppdrag ${Math.min(20, s.totalBountiesDone || 0)}/20)`
      },
      {
        num: 33,
        title: "Level 33/50 – Gåten på Raven's Roost",
        formatProgress: (s) =>
          `Level 33/50: Raven's Roost ↖ (Stjernesplinter ${Math.min(3, s.starShardsCollected || 0)}/3 • Spøkelseslovløse ${Math.min(3, s.observatoryFoesKilled || 0)}/3)`
      },
      {
        num: 34,
        title: 'Level 34/50 – Duellen mot Blackfeather',
        formatProgress: (s) =>
          `Level 34/50: Raven's Roost ↖ (Beseir spøkelsesskytteren BLACKFEATHER ${s.blackfeatherDefeated ? '✓' : '0/1'})`
      },
      {
        num: 35,
        title: 'Level 35/50 – Sporet av Gull-Hestesko III',
        formatProgress: (s) =>
          `Level 35/50: Mester-sporjeger (Finn 14 skjulte Gull-Hestesko ${Math.min(14, s.horseshoesFound || 0)}/14)`
      },
      {
        num: 36,
        title: 'Level 36/50 – Beseir Alle Åtte Verdensbosser',
        formatProgress: (s) => {
          const bCount = [
            s.bossDefeated, s.cortezDefeated, s.brimstoneMarshalDefeated, s.wendigoBossDefeated,
            s.sandwraithDefeated, s.goliathDefeated, s.elFuegoDefeated, s.blackfeatherDefeated
          ].filter(Boolean).length;
          return `Level 36/50: Åtte Overherrer (Unike verdensbosser beseiret ${bCount}/8)`;
        }
      },
      {
        num: 37,
        title: 'Level 37/50 – Sheriffens Høyre Hånd',
        formatProgress: (s) =>
          `Level 37/50: Dusør-veteran (Fullfør 35 Saloon-oppdrag ${Math.min(35, s.totalBountiesDone || 0)}/35)`
      },
      {
        num: 38,
        title: 'Level 38/50 – Alfa-leder for Rex',
        formatProgress: (s) =>
          `Level 38/50: Hundemester (Tren jakthunden Rex til Nivå 5 ${Math.min(5, s.warhoundRank || 0)}/5 • Elitefiender ${Math.min(35, s.eliteKills || 0)}/35)`
      },
      {
        num: 39,
        title: 'Level 39/50 – Sporet av Gull-Hestesko IV',
        formatProgress: (s) =>
          `Level 39/50: Stor-utforsker (Finn 20 skjulte Gull-Hestesko ${Math.min(20, s.horseshoesFound || 0)}/20)`
      },
      {
        num: 40,
        title: 'Level 40/50 – Baronen av Dustwood-dalen',
        formatProgress: (s) =>
          `Level 40/50: Ranch-magnat (Nå 25 totale Ranch-/Talent-trinn ${Math.min(25, s.ranchTotalRanks || 0)}/25)`
      },
      {
        num: 41,
        title: 'Level 41/50 – Slettens & Fjellets Mesterjeger',
        formatProgress: (s) =>
          `Level 41/50: Mesterjeger (Bison ${Math.min(12, s.bisonHunted || 0)}/12 • Puma ${Math.min(10, s.cougarsHunted || 0)}/10 • Hvit Hjort ${Math.min(4, s.whiteStagsHunted || 0)}/4)`
      },
      {
        num: 42,
        title: 'Level 42/50 – Lovens Jernneve',
        formatProgress: (s) =>
          `Level 42/50: Lovmann (Fullfør 55 Saloon-oppdrag ${Math.min(55, s.totalBountiesDone || 0)}/55 • Totalt nedlagt ${Math.min(250, s.totalKills || 0)}/250)`
      },
      {
        num: 43,
        title: 'Level 43/50 – Alle 24 Gull-Hestesko',
        formatProgress: (s) =>
          `Level 43/50: Komplett Relikviesamling (Finn alle 24 Gull-Hestesko ${Math.min(24, s.horseshoesFound || 0)}/24)`
      },
      {
        num: 44,
        title: 'Level 44/50 – Renselsen av Skyggeødemarken',
        formatProgress: (s) =>
          `Level 44/50: Skyggejakt (Nattmonstre & gjengangere beseiret ${Math.min(50, s.eclipseKills || 0)}/50)`
      },
      {
        num: 45,
        title: 'Level 45/50 – Det Store Ranch-imperiet',
        formatProgress: (s) =>
          `Level 45/50: Imperiebygger (Nå 40 totale Ranch-/Talent-trinn ${Math.min(40, s.ranchTotalRanks || 0)}/40)`
      },
      {
        num: 46,
        title: 'Level 46/50 – Riksmarskalk av Grenselandet',
        formatProgress: (s) =>
          `Level 46/50: Marskalk-protokoll (Fullfør 80 Saloon-oppdrag ${Math.min(80, s.totalBountiesDone || 0)}/80)`
      },
      {
        num: 47,
        title: 'Level 47/50 – Overherrenes Overmann',
        formatProgress: (s) =>
          `Level 47/50: Elite-spydspiss (Elitefiender & bosser beseiret ${Math.min(80, s.eliteKills || 0)}/80)`
      },
      {
        num: 48,
        title: 'Level 48/50 – Mytisk Rustning & Jernhud',
        formatProgress: (s) =>
          `Level 48/50: Toppnivå (Totalt nedlagt ${Math.min(450, s.totalKills || 0)}/450 • Ranch-/Talent-trinn ${Math.min(55, s.ranchTotalRanks || 0)}/55)`
      },
      {
        num: 49,
        title: 'Level 49/50 – Hundre Oppdrags Legende',
        formatProgress: (s) =>
          `Level 49/50: Århundrets Sheriff (Fullfør 100 Saloon-oppdrag ${Math.min(100, s.totalBountiesDone || 0)}/100)`
      },
      {
        num: 50,
        title: 'Level 50/50 – Den Udødelige Cowboyen',
        formatProgress: (s) =>
          `Level 50/50 [STORFINALE]: Beseir Lord Malakor & Ur-Wendigoen (${s.immortalFinaleMalakor ? 'Malakor ✓' : 'Malakor 0/1'} • ${s.immortalFinaleWendigo ? 'Wendigo ✓' : 'Wendigo 0/1'})!`
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
      '«Besøk din nye Homestead Ranch sørøst i Dustwood! Bygg kvegimperium, talenter og få jakthunden Rex!»',
      '«Utforsk alle 12 regioner, finn 24 Gull-Hestesko, beseir alle 8 bosser og nå 100% i Kodeksen [K]!»'
    ],

    // By- og 12-regionsskilt
    signSaloonTitle: 'SALOON',
    signSaloonSub: 'KRO & DUSØRER',
    signTailorTitle: 'SKREDDER',
    signTailorSub: 'RUSTNING & MAKS HELSE',
    signGunsmithTitle: 'VÅPENSMED',
    signGunsmithSub: 'VÅPEN & MESTRING',
    signSafeHouseTitle: 'SAFE HOUSE',
    signSafeHouseSub: 'TRYGT GJEMMESTED',
    signHomesteadTitle: 'HOMESTEAD RANCH',
    signHomesteadSub: 'IMPERIUM • TALENTER • HUND',
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
    signOasisTitle: "DEAD MAN'S OASIS",
    signOasisSub: 'SUNKET OASETEMPEL',
    signMillTitle: 'FROSTFANG SAGBRUK',
    signMillSub: 'GAMLE GOLIATS HI',
    signCalderaTitle: 'DIABLO CALDERA',
    signCalderaSub: 'OBSIDIAN-ESSEN',
    signObservatoryTitle: "RAVEN'S ROOST",
    signObservatorySub: 'STJERNE-OBSERVATORIUM',

    roadWoodsTitle: '↑ WHISPERING WOODS',
    roadWoodsSub: 'Trebro • Hjort • Grizzlybjørn',
    roadCanyonTitle: '→ CRIMSON CANYON',
    roadCanyonSub: 'Bandittleir & Dyp Gullgruve',
    roadGraveyardTitle: '← BOOT HILL',
    roadGraveyardSub: 'Kirkegård & Sunkne Katakomber',
    roadRailwayTitle: '↓ SØNDRE JERNBANE',
    roadRailwaySub: 'Pansret Damptog & Sprengt Bro',
    roadTownTitle: 'DUSTWOOD SENTRUM',
    roadTownSub: 'Saloon • Ranch • Hest',
    roadSilverpineTitle: '↖ SILVERPINE PEAK',
    roadSilverpineSub: 'Hvit Hjort • Puma • Månesteiner',
    roadFortTitle: '↗ FORT RATTLESNAKE',
    roadFortSub: 'Bandittfort & General Cortez',
    roadBrimstoneTitle: '↘ BRIMSTONE BY',
    roadBrimstoneSub: 'Spøkelsesby & Udød Marskalk',
    roadStoneCircleTitle: '↙ THUNDER PLAINS',
    roadStoneCircleSub: 'Bison • Steinring • Wendigo',
    roadOasisTitle: "↓ DEAD MAN'S OASIS",
    roadOasisSub: 'Oasetempel & Sandwraith King',
    roadMillTitle: '↑ FROSTFANG SAGBRUK',
    roadMillSub: 'Møllehjul & Gamle Goliat',
    roadCalderaTitle: '↘ DIABLO CALDERA',
    roadCalderaSub: 'Obsidian-esse & El Fuego',
    roadObservatoryTitle: "↖ RAVEN'S ROOST",
    roadObservatorySub: 'Observatorium & Blackfeather',

    // Homestead Ranch, Passiv Inntekt, Cowboy-talenter & Trofast Jakthund
    homesteadBoardTitle: 'HOMESTEAD RANCH & TALENTER',
    homesteadInfo: (gold, pelts, incomePerMin, houndRank) =>
      `Gull: ${gold} • Skinn: ${pelts} • Ranch-inntekt: +${incomePerMin} Gull/min${houndRank > 0 ? ` • Rex Nivå ${houndRank}` : ''}`,
    homesteadSlots: {
      cattle: (lv, maxLv, cost) =>
        lv >= maxLv
          ? `Kvegfarm & Gruveandeler [MAKS Nivå ${lv}] -> +${lv * 8} Gull/min + Mat`
          : `Kvegfarm & Gruveandeler Nivå ${lv + 1}/${maxLv} (${cost} Gull) -> +8 Gull/min + Mat`,
      trapper: (lv, maxLv, cost) =>
        lv >= maxLv
          ? `Pelsjeger-stasjon [MAKS Nivå ${lv}] -> Passive Skinn & Bonusbytte`
          : `Pelsjeger-stasjon Nivå ${lv + 1}/${maxLv} (${cost} Gull) -> Passive Skinn & +Bytte`,
      deadeye: (lv, maxLv, cost) =>
        lv >= maxLv
          ? `Deadeye Skarpskytter-talent [MAKS Nivå ${lv}] -> +${lv * 12}% skade`
          : `Deadeye-talent Nivå ${lv + 1}/${maxLv} (${cost} Gull) -> +12% all våpenskade`,
      trailblazer: (lv, maxLv, costGold, costPelts) =>
        lv >= maxLv
          ? `Jernhud & Mustang-tempo [MAKS Nivå ${lv}] -> +${lv * 10} HP & +${lv * 2}% fart`
          : `Jernhud & Mustang Nivå ${lv + 1}/${maxLv} (${costGold}G + ${costPelts}S) -> +10 Maks HP & +Fart`,
      warhound: (lv, maxLv, costGold, costPelts) =>
        lv === 0
          ? `Rekrutter Jakthunden «Rex» (${costGold}G + ${costPelts}S) -> Kjemper ved din side!`
          : (lv >= maxLv
            ? `Jakthunden «Rex» [MAKS Nivå ${lv}] -> ${+(1.5 + lv * 0.9).toFixed(1)} bittskade`
            : `Tren Jakthunden «Rex» Nivå ${lv + 1}/${maxLv} (${costGold}G + ${costPelts}S) -> Sterkere angrep`)
    },
    homesteadMsgMaxed: 'Maksimalt nivå nådd for denne Ranch-oppgraderingen!',
    homesteadMsgNoRes: 'Trenger mer Gull eller Skinn! Fullfør oppdrag eller jakt vilt.',
    homesteadMsgBought: (name, lv) => `Oppgraderte ${name} til Nivå ${lv}!`,
    ranchIncomeToast: (goldGain, foodGain, peltGain) =>
      `💰 Ranch-utbytte utbetalt: +${goldGain} Gull${foodGain > 0 ? `, +${foodGain} Mat` : ''}${peltGain > 0 ? `, +${peltGain} Skinn` : ''}!`,
    horseshoeToast: (count, pct) =>
      `🧲 Gull-Hestesko funnet (${count}/24)! +50 Gull og +${pct}% permanent Gull-/Skadebonus!`,

    // Dynamiske Verdenshendelser
    worldEvents: {
      gold_rush: '☀ GULLFEBER (90s): 2x Gull fra alle fiender, gullårer og dusører!',
      great_migration: '🦌 STORVILT-TREKK (90s): +1 ekstra Skinn og +1 ekstra Mat ved jakt!',
      frontier_storm: '⚡ TORDENSTORM (90s): +35% all våpenskade og +50% Gull!',
      blood_eclipse: '🌑 BLODFORMØRKELSE (90s): 2x Gull og +1 ekstra Skinn i hele verden!'
    },

    // 100% Fullføringskodeks & Diligense-hurtigreise [K]
    codexBtn: (pct) => `📖 Kodeks & Reise: ${pct}%`,
    codexTitle: 'GRENSELANDSKODEKS, 100% FULLFØRING & DILIGENSE-REISE',
    codexCloseBtn: 'Lukk [K]',
    codexOverallLabel: (pct, hours) => `Total 200t Fullføring: ${pct}%  •  Spilletid: ${hours}`,
    codexPillars: (d) => [
      `1. Hovedkampanje: Level ${Math.min(50, d.level)} / 50`,
      `2. Prestisje-rang: Prestisje ${Math.min(10, d.prestige)} / 10`,
      `3. Saloon-oppdrag fullført: ${d.bounties} / 250`,
      `4. Skjulte Gull-Hestesko: ${d.horseshoes} / 24 (+${d.horseshoes * 2}% bonus)`,
      `5. Unike verdensbosser beseiret: ${d.bosses} / 8`,
      `6. Homestead Ranch & Rex-trinn: ${d.ranchRanks} / 85`,
      `7. Rustning & Våpenmestring: ${d.gearRanks} / 35`,
      `8. Nedlagte fiender & vilt: ${d.kills} / 2500`
    ],
    codexTravelHeader: '🐎 DILIGENSE-HURTIGREISE (Klikk for direkte reise til valgt region):',
    codexRegions: [
      { id: 'town', label: 'Dustwood Sentrum (By & Butikker)', x: 0, z: 13.5, yaw: 0 },
      { id: 'woods', label: '↑ Whispering Woods Trebro', x: 0, z: -69.5, yaw: 0 },
      { id: 'canyon', label: '→ Crimson Canyon & Gullgruve', x: 112.0, z: -1.5, yaw: -1.57 },
      { id: 'railway', label: '↓ Pansret Damptog i Sør', x: 4.0, z: 65.5, yaw: 3.14 },
      { id: 'boothill', label: '← Boot Hill Kapell & Krypt', x: -102.0, z: -1.5, yaw: 1.57 },
      { id: 'silverpine', label: '↖ Silverpine Peak', x: -131.0, z: -124.0, yaw: 0.78 },
      { id: 'fort', label: '↗ Fort Rattlesnake', x: 140.0, z: -115.5, yaw: 0 },
      { id: 'brimstone', label: '↘ Brimstone Spøkelsesby', x: 124.0, z: 136.0, yaw: -1.57 },
      { id: 'stonecircle', label: '↙ Thunder Plains Steinring', x: -124.0, z: 136.0, yaw: 1.57 },
      { id: 'oasis', label: "↓ Dead Man's Oasis", x: -6.0, z: 152.5, yaw: 3.14 },
      { id: 'mill', label: '↑ Frostfang Sagbruk', x: 2.0, z: -161.5, yaw: 0 },
      { id: 'caldera', label: '↘ Diablo Caldera Esse', x: 159.5, z: 62.0, yaw: -1.57 },
      { id: 'observatory', label: "↖ Raven's Roost Observatorium", x: -161.5, z: -68.0, yaw: 1.57 }
    ],

    // Skredderbutikk
    tailorBoardTitle: 'SKREDDERENS ARMOR & KLÆR',
    tailorInfo: (pelts, outfit, maxHp, gold = 0) =>
      `Gull: ${gold}  •  Skinn: ${pelts}  •  Antrekk: ${outfit}  •  Maks helse: ${maxHp || 100}`,
    tailorButtons: [
      'Speider-lærvest (55 Gull eller 2 Skinn) -> 25% beskyttelse +20 HP',
      'Vargpels-rustning (220 Gull eller 4 Skinn) -> 55% beskyttelse +75 HP',
      'Vampyrjeger-rustning (380 Gull eller 6 Skinn) -> 70% beskyttelse +110 HP'
    ],
    tailorMythicBtn: (owned) =>
      owned
        ? 'Legendarisk Gullrustning -> 85% beskyttelse +240 HP [AKTIV]'
        : 'Legendarisk Gullrustning (1250 Gull eller 16 Skinn) -> 85% rustning +240 HP',
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
      'Avsaget Hagle (45 Gull) -> 6 hagl med enorm nærskade',
      'Winchester Rifle (85 Gull) -> Langtrekkende presisjon (3x skade)',
      'Sølv-armbrøst (165 Gull eller 65G+2S) -> 3x brannskade mot udøde',
      '3x Dynamitt-pakke (15 Gull) -> Kastes i bue, eksploderer etter 2,2s',
      'Hellfire-karabin (450 Gull / Lv7: 120G) -> Lynrask sølv-gatling'
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
    sandwraithBarTitle: 'SANDWRAITH KING — SANDENS OVERHERRE',
    goliathBarTitle: 'OLD GOLIATH — UR-BJØRNEN',
    elFuegoBarTitle: 'EL FUEGO — OBSIDIAN-KJEMPEN',
    blackfeatherBarTitle: 'BLACKFEATHER — SPØKELSESSKYTTEREN',
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
  },
  // --- Oppdrag #37..#100 (200-Timers Komplett Saga: Oasis, Frostfang, Caldera, Raven's Roost, Gull-Hestesko & 8 Bosser!) ---
  { seq: 37, targetType: 'oasis_idol', goal: 3, gold: 145, food: 2, pelts: 0, dynamite: 2, enTitle: "Scarab Idols of the Oasis", enTask: "Collect 3 Golden Scarab Idols at Dead Man's Oasis ↓", noTitle: 'Oasens Skarabé-idoler', noTask: "Samle 3 Skarabé-idoler ved Dead Man's Oasis ↓" },
  { seq: 38, targetType: 'oasis_foe', goal: 3, gold: 150, food: 2, pelts: 2, dynamite: 0, enTitle: 'Mirage Temple Purge', enTask: "Slay 3 Oasis Stalkers at Dead Man's Oasis ↓", noTitle: 'Rens Oasetempelet', noTask: "Bekjemp 3 oase-voktere ved Dead Man's Oasis ↓" },
  { seq: 39, targetType: 'sandwraith', goal: 1, gold: 195, food: 3, pelts: 3, dynamite: 2, fullHeal: true, enTitle: 'Bounty: Sandwraith King', enTask: "Defeat The Sandwraith King at Dead Man's Oasis ↓", noTitle: 'Dusør: Sandwraith King', noTask: "Beseir Sandwraith King ved Dead Man's Oasis ↓" },
  { seq: 40, targetType: 'mill_crate', goal: 3, gold: 150, food: 3, pelts: 2, dynamite: 0, enTitle: 'Frostfang Lumber Salvage', enTask: 'Recover 3 Redwood Crates at Frostfang Mill ↑', noTitle: 'Tømmerlast ved Frostfang', noTask: 'Hent 3 tømmerkasser ved Frostfang Sagbruk ↑' },
  { seq: 41, targetType: 'goliath', goal: 1, gold: 205, food: 5, pelts: 5, dynamite: 0, fullHeal: true, enTitle: 'Bounty: Old Goliath', enTask: 'Hunt Elder Kodiak Old Goliath at Frostfang Mill ↑', noTitle: 'Dusør: Gamle Goliat', noTask: 'Felle ur-bjørnen Old Goliath ved Frostfang Sagbruk ↑' },
  { seq: 42, targetType: 'meteor_core', goal: 3, gold: 165, food: 0, pelts: 0, dynamite: 3, enTitle: 'Meteoric Iron Harvest', enTask: 'Collect 3 Meteoric Iron Cores in Diablo Caldera ↘', noTitle: 'Meteorkjernene i Caldera', noTask: 'Samle 3 meteorkjerner i Diablo Caldera ↘' },
  { seq: 43, targetType: 'hellhound', goal: 3, gold: 165, food: 2, pelts: 3, dynamite: 1, enTitle: 'Caldera Hellhound Pack', enTask: 'Slay 3 volcanic Hellhounds at Diablo Caldera ↘', noTitle: 'Helveteshundene i Caldera', noTask: 'Bekjemp 3 vulkanske helveteshunder i Diablo Caldera ↘' },
  { seq: 44, targetType: 'el_fuego', goal: 1, gold: 215, food: 2, pelts: 2, dynamite: 3, fullHeal: true, enTitle: 'Bounty: El Fuego', enTask: 'Defeat Obsidian Juggernaut El Fuego at Diablo Caldera ↘', noTitle: 'Dusør: El Fuego', noTask: 'Beseir obsidian-kjempen El Fuego i Diablo Caldera ↘' },
  { seq: 45, targetType: 'star_shard', goal: 3, gold: 170, food: 2, pelts: 2, dynamite: 0, enTitle: 'Astral Starlight Shards', enTask: "Collect 3 Starlight Shards at Raven's Roost ↖", noTitle: 'Stjernesplintene i Vest', noTask: "Samle 3 stjernesplinter ved Raven's Roost ↖" },
  { seq: 46, targetType: 'observatory_foe', goal: 3, gold: 175, food: 1, pelts: 0, dynamite: 2, enTitle: 'Phantom Outlaw Posse', enTask: "Defeat 3 Phantom Outlaws at Raven's Roost ↖", noTitle: 'Spøkelsesbanden på Klippen', noTask: "Bekjemp 3 spøkelseslovløse på Raven's Roost ↖" },
  { seq: 47, targetType: 'blackfeather', goal: 1, gold: 220, food: 2, pelts: 3, dynamite: 2, fullHeal: true, enTitle: 'Bounty: Blackfeather', enTask: "Defeat Phantom Gunslinger Blackfeather at Raven's Roost ↖", noTitle: 'Dusør: Blackfeather', noTask: "Beseir spøkelsesskytteren Blackfeather på Raven's Roost ↖" },
  { seq: 48, targetType: 'ranch_upgrade', goal: 1, gold: 140, food: 3, pelts: 2, dynamite: 1, enTitle: 'Homestead Investment', enTask: 'Buy 1 upgrade at your Dustwood Homestead Ranch', noTitle: 'Utbygging på Ranchen', noTask: 'Kjøp 1 oppgradering på Homestead Ranch i Dustwood' },
  { seq: 49, targetType: 'bottle', goal: 10, gold: 95, food: 3, pelts: 0, dynamite: 2, enTitle: 'Dustwood Deadeye Trial', enTask: 'Shoot down 10 practice bottles in Dustwood', noTitle: 'Deadeye-prøven i Dustwood', noTask: 'Skyt ned 10 øvingsflasker i Dustwood' },
  { seq: 50, targetType: 'any_boss', goal: 3, gold: 280, food: 4, pelts: 4, dynamite: 4, fullHeal: true, enTitle: 'Grand Overlord Hunt', enTask: 'Defeat any 3 World Bosses across the 12 regions', noTitle: 'Storjakt på Overherrer', noTask: 'Beseir 3 valgfrie verdensbosser i de 12 regionene' },
  { seq: 51, targetType: 'deer_any', goal: 5, gold: 130, food: 5, pelts: 4, dynamite: 0, enTitle: 'Venison for the Town', enTask: 'Hunt 5 deer or stags in Whispering Woods or Peaks', noTitle: 'Viltkjøtt til Dustwood', noTask: 'Felle 5 hjorter i skogen eller fjellet' },
  { seq: 52, targetType: 'train_sniper', goal: 4, gold: 145, food: 1, pelts: 0, dynamite: 3, enTitle: 'Southern Line Clearance', enTask: 'Defeat 4 Train Snipers at Southern Railway ↓', noTitle: 'Sikring av Sørbanen', noTask: 'Bekjemp 4 tog-skarpskyttere ved Søndre Jernbane ↓' },
  { seq: 53, targetType: 'bison', goal: 4, gold: 155, food: 5, pelts: 4, dynamite: 0, enTitle: 'Great Bison Stampede', enTask: 'Hunt 4 Plains Bison on Thunder Plains ↙', noTitle: 'Den Store Bisonflokken', noTask: 'Felle 4 præriebison på Thunder Plains ↙' },
  { seq: 54, targetType: 'cougar', goal: 3, gold: 150, food: 2, pelts: 4, dynamite: 0, enTitle: 'Ridge Stalker Cougars', enTask: 'Hunt 3 Mountain Cougars in NW Silverpine ↖', noTitle: ' Fjellryggens Pumaer', noTask: 'Felle 3 fjellpumaer ved Silverpine Peak ↖' },
  { seq: 55, targetType: 'fort_bandit', goal: 6, gold: 165, food: 0, pelts: 0, dynamite: 3, enTitle: 'Rattlesnake Garrison', enTask: 'Defeat 6 Desperados at Fort Rattlesnake ↗ or Roost ↖', noTitle: 'Garnisonen på Fortet', noTask: 'Bekjemp 6 desperadoer ved Fortet ↗ eller Roost ↖' },
  { seq: 56, targetType: 'brimstone_foe', goal: 6, gold: 170, food: 2, pelts: 2, dynamite: 2, enTitle: 'Ashes of Brimstone', enTask: 'Defeat 6 Raiders or Revenants in SE/Caldera', noTitle: 'Asken i Brimstone', noTask: 'Bekjemp 6 plyndrere eller gjengangere i SØ/Caldera' },
  { seq: 57, targetType: 'treasure_any', goal: 5, gold: 180, food: 2, pelts: 2, dynamite: 3, enTitle: 'Five Relics of Fortune', enTask: 'Collect 5 Treasures (Gold, Idols, Cores, Shards, Chests)', noTitle: 'Fem Skatter i Ødemarken', noTask: 'Samle 5 skatter (gull, idoler, kjerner, splinter, kasser)' },
  { seq: 58, targetType: 'wendigo', goal: 5, gold: 185, food: 2, pelts: 4, dynamite: 0, enTitle: 'Howls of the Monoliths', enTask: 'Slay 5 Wendigo Stalkers in SW Stone Circle ↙', noTitle: 'Hylene ved Steinringen', noTask: 'Bekjemp 5 Wendigo-rovdyr ved Steinringen ↙' },
  { seq: 59, targetType: 'white_stag', goal: 2, gold: 195, food: 4, pelts: 5, dynamite: 0, enTitle: 'Twin Spirits of Silverpine', enTask: 'Hunt 2 Legendary White Stags on Silverpine Peak ↖', noTitle: 'Tvillingkronene i Nordvest', noTask: 'Felle 2 Hvite Kronhjorter på Silverpine Peak ↖' },
  { seq: 60, targetType: 'cortez', goal: 1, gold: 210, food: 2, pelts: 2, dynamite: 3, fullHeal: true, enTitle: "Cortez's Return", enTask: 'Defeat Warlord General Cortez at Fort Rattlesnake ↗', noTitle: 'Cortez sin Gjengjeldelse', noTask: 'Beseir General Cortez i Fort Rattlesnake ↗' },
  { seq: 61, targetType: 'marshal', goal: 1, gold: 215, food: 2, pelts: 3, dynamite: 2, fullHeal: true, enTitle: 'Judgment in Brimstone', enTask: 'Defeat The Brimstone Marshal in SE Ghost Town ↘', noTitle: 'Dommen i Brimstone', noTask: 'Beseir den udøde Brimstone Marshal i SØ ↘' },
  { seq: 62, targetType: 'caldera_foe', goal: 5, gold: 185, food: 2, pelts: 3, dynamite: 2, enTitle: 'Forged in Magma', enTask: 'Defeat 5 Hellhounds or Raiders in Diablo Caldera ↘', noTitle: 'Smidd i Magma', noTask: 'Bekjemp 5 helveteshunder eller plyndrere i Caldera ↘' },
  { seq: 63, targetType: 'alpha_wolf', goal: 4, gold: 175, food: 2, pelts: 4, dynamite: 0, enTitle: 'Northern Direwolf Hunt', enTask: 'Slay 4 Alpha Direwolves in Silverpine or Frostfang', noTitle: 'Nordens Skrekkulver', noTask: 'Bekjemp 4 alfa-ulver i Silverpine eller Frostfang' },
  { seq: 64, targetType: 'catacomb_guardian', goal: 4, gold: 175, food: 3, pelts: 2, dynamite: 1, enTitle: 'Depths Below Boot Hill', enTask: 'Slay 4 Catacomb Guardians beneath the Chapel ←', noTitle: 'Dypet under Kapellet', noTask: 'Bekjemp 4 katakombevoktere under Boot Hill Kapell ←' },
  { seq: 65, targetType: 'sandwraith', goal: 1, gold: 225, food: 3, pelts: 3, dynamite: 2, fullHeal: true, enTitle: 'Crown of the Dunes', enTask: "Defeat The Sandwraith King at Dead Man's Oasis ↓", noTitle: 'Sandens Kongekrone', noTask: "Beseir Sandwraith King ved Dead Man's Oasis ↓" },
  { seq: 66, targetType: 'goliath', goal: 1, gold: 230, food: 5, pelts: 5, dynamite: 0, fullHeal: true, enTitle: 'Roar of Frostfang', enTask: 'Defeat Elder Kodiak Old Goliath at Frostfang Mill ↑', noTitle: 'Brølet ved Frostfang', noTask: 'Beseir Old Goliath ved Frostfang Sagbruk ↑' },
  { seq: 67, targetType: 'moonstone', goal: 3, gold: 165, food: 1, pelts: 3, dynamite: 0, enTitle: 'Grove of Moonstones', enTask: 'Collect 3 glowing Moonstones on Silverpine Peak ↖', noTitle: 'Månesteinens Glød', noTask: 'Samle 3 Månesteiner på Silverpine Peak ↖' },
  { seq: 68, targetType: 'strongbox', goal: 3, gold: 175, food: 0, pelts: 0, dynamite: 3, enTitle: 'Gold of the Badlands', enTask: 'Recover 3 Strongboxes inside Fort Rattlesnake ↗', noTitle: 'Ødemarkens Pengekasser', noTask: 'Hent 3 pengekasser i Fort Rattlesnake ↗' },
  { seq: 69, targetType: 'brimstone_totem', goal: 3, gold: 170, food: 1, pelts: 1, dynamite: 3, enTitle: 'Break the Sulphur Seal', enTask: 'Shatter 3 Brimstone Totems in SE Ghost Town ↘', noTitle: 'Bryt Svovelforbannelsen', noTask: 'Skyt i stykker 3 Svovel-totemer i Brimstone ↘' },
  { seq: 70, targetType: 'sun_rune', goal: 3, gold: 170, food: 2, pelts: 2, dynamite: 0, fullHeal: true, enTitle: 'Light of the Ancients', enTask: 'Attune 3 Sun Runes at SW Stone Circle ↙', noTitle: 'De Eldstes Solkraft', noTask: 'Aktiver 3 Solruner i Steinringen ↙' },
  { seq: 71, targetType: 'el_fuego', goal: 1, gold: 245, food: 2, pelts: 3, dynamite: 3, fullHeal: true, enTitle: 'Lord of the Volcano', enTask: 'Defeat El Fuego at Diablo Caldera ↘', noTitle: 'Vulkanens Herre', noTask: 'Beseir El Fuego ved Diablo Caldera ↘' },
  { seq: 72, targetType: 'blackfeather', goal: 1, gold: 245, food: 2, pelts: 3, dynamite: 3, fullHeal: true, enTitle: 'Ghost of the Astrolabe', enTask: "Defeat Blackfeather at Raven's Roost ↖", noTitle: 'Astrolabiets Vokter', noTask: "Beseir Blackfeather ved Raven's Roost ↖" },
  { seq: 73, targetType: 'apex_predator', goal: 6, gold: 200, food: 4, pelts: 5, dynamite: 0, enTitle: 'Master Beast-Slayer', enTask: 'Hunt 6 Apex Predators (Grizzly, Cougar, Alpha, Hellhound)', noTitle: 'Rovdyrjeger i Særklasse', noTask: 'Felle 6 rovdyr (Grizzly, Puma, Alfa-ulv, Helveteshund)' },
  { seq: 74, targetType: 'oasis_idol', goal: 3, gold: 180, food: 3, pelts: 1, dynamite: 2, enTitle: 'Pharaoh Gold Recovery', enTask: "Collect 3 Scarab Idols at Dead Man's Oasis ↓", noTitle: 'Tempelgullet i Sør', noTask: "Samle 3 Skarabé-idoler ved Dead Man's Oasis ↓" },
  { seq: 75, targetType: 'mill_crate', goal: 3, gold: 180, food: 4, pelts: 2, dynamite: 1, enTitle: 'Timber Caravan Supplies', enTask: 'Recover 3 Redwood Crates at Frostfang Mill ↑', noTitle: 'Forsyninger fra Sagbruket', noTask: 'Hent 3 tømmerkasser ved Frostfang Sagbruk ↑' },
  { seq: 76, targetType: 'meteor_core', goal: 3, gold: 190, food: 0, pelts: 2, dynamite: 3, enTitle: 'Star-Metal for the Forge', enTask: 'Collect 3 Meteoric Cores at Diablo Caldera ↘', noTitle: 'Stjernejern til Smeden', noTask: 'Samle 3 meteorkjerner ved Diablo Caldera ↘' },
  { seq: 77, targetType: 'star_shard', goal: 3, gold: 190, food: 2, pelts: 2, dynamite: 1, enTitle: 'Celestial Shards', enTask: "Collect 3 Starlight Shards at Raven's Roost ↖", noTitle: 'Himmelsplintene', noTask: "Samle 3 stjernesplinter ved Raven's Roost ↖" },
  { seq: 78, targetType: 'wendigo_boss', goal: 1, gold: 255, food: 4, pelts: 5, dynamite: 2, fullHeal: true, enTitle: 'Wrath in the Monoliths', enTask: 'Summon & slay The Ancient Wendigo at SW Obelisk ↙', noTitle: 'Monolittenes Skrekk', noTask: 'Vekk og beseir Ur-Wendigoen i Steinringen ↙' },
  { seq: 79, targetType: 'malakor', goal: 1, gold: 265, food: 4, pelts: 4, dynamite: 3, fullHeal: true, enTitle: 'Vampire Overlord Hunt', enTask: 'Summon & slay Lord Malakor at Boot Hill Altar ←', noTitle: 'Jakt på Vampyrfyrsten', noTask: 'Vekk og beseir Lord Malakor ved Boot Hill-alteret ←' },
  { seq: 80, targetType: 'elite_foe', goal: 10, gold: 225, food: 3, pelts: 3, dynamite: 3, enTitle: 'Ten Elites of the Wastes', enTask: 'Defeat 10 Elite Outlaws, Fiends or Bosses', noTitle: 'Ti Eliter i Ødemarken', noTask: 'Bekjemp 10 elitefiender eller bosser' },
  { seq: 81, targetType: 'bottle', goal: 12, gold: 120, food: 3, pelts: 0, dynamite: 2, enTitle: 'Legendary Showdown Shots', enTask: 'Shoot down 12 practice bottles in Dustwood', noTitle: 'Mesterskyting i Byen', noTask: 'Skyt ned 12 øvingsflasker utenfor Saloonen' },
  { seq: 82, targetType: 'wild_beast', goal: 10, gold: 205, food: 6, pelts: 5, dynamite: 0, enTitle: 'Bounty of Twelve Lands', enTask: 'Hunt 10 wild animals across any region', noTitle: 'Storjakt i Tolv Regioner', noTask: 'Felle 10 ville dyr på tvers av kartet' },
  { seq: 83, targetType: 'bandit_any', goal: 10, gold: 215, food: 2, pelts: 0, dynamite: 4, enTitle: 'Grand Marshal Posse', enTask: 'Defeat 10 outlaws across the Frontier', noTitle: 'Riksmarskalkens Ordre', noTask: 'Bekjemp 10 lovløse på tvers av Grenselandet' },
  { seq: 84, targetType: 'night_any', goal: 10, gold: 225, food: 2, pelts: 3, dynamite: 2, fullHeal: true, enTitle: 'Banish the Night Legion', enTask: 'Slay 10 Night Fiends, Stalkers or Revenants', noTitle: 'Fordriv Nattlegionen', noTask: 'Bekjemp 10 nattmonstre, wendigoer eller gjengangere' },
  { seq: 85, targetType: 'mine_action', goal: 3, gold: 185, food: 1, pelts: 0, dynamite: 4, enTitle: 'Crimson Mine Siege', enTask: 'Clear 3 Mine Barricades, Gold Veins or Mine Outlaws →', noTitle: 'Stormen i Gullgruven', noTask: 'Ta 3 gruvebarrikader, gullfunn eller gruvebanditter →' },
  { seq: 86, targetType: 'silver_relic', goal: 2, gold: 185, food: 2, pelts: 3, dynamite: 0, fullHeal: true, enTitle: 'Sacred Silver of Boot Hill', enTask: 'Recover 2 glowing Silver Relics on Boot Hill ←', noTitle: 'Hellig Sølv på Boot Hill', noTask: 'Finn 2 lysende Sølvrelikvier på Boot Hill ←' },
  { seq: 87, targetType: 'gold_pickup', goal: 4, gold: 190, food: 2, pelts: 0, dynamite: 3, enTitle: "Motherlode Prospector", enTask: 'Collect 4 Gold Nuggets or Chests in Crimson Canyon →', noTitle: 'Hovedåren i Kløften', noTask: 'Plukk eller skyt 4 gullklumper i Crimson Canyon →' },
  { seq: 88, targetType: 'grizzly', goal: 3, gold: 205, food: 5, pelts: 5, dynamite: 0, enTitle: 'Three Grizzlies of the North', enTask: 'Hunt 3 Grizzlies or Kodiaks in the Northern Woods', noTitle: 'Tre Nordlige Grizzlybjørner', noTask: 'Felle 3 grizzlybjørner i nordskogen' },
  { seq: 89, targetType: 'hellhound', goal: 4, gold: 215, food: 2, pelts: 4, dynamite: 2, enTitle: 'Hounds of the Forge', enTask: 'Slay 4 Hellhounds at Diablo Caldera ↘', noTitle: 'Essens Helveteshunder', noTask: 'Bekjemp 4 helveteshunder ved Diablo Caldera ↘' },
  { seq: 90, targetType: 'any_boss', goal: 4, gold: 340, food: 5, pelts: 5, dynamite: 4, fullHeal: true, enTitle: 'Four Overlords Gauntlet', enTask: 'Defeat any 4 World Bosses across the map', noTitle: 'Fire Bossers Ildprøve', noTask: 'Beseir 4 valgfrie verdensbosser på kartet' },
  { seq: 91, targetType: 'treasure_any', goal: 6, gold: 235, food: 3, pelts: 3, dynamite: 3, enTitle: 'Grand Relic Collector', enTask: 'Recover 6 Frontier Relics, Crates, Cores or Chests', noTitle: 'Mester-skattejegeren', noTask: 'Samle 6 relikvier, kasser, kjerner eller gullfunn' },
  { seq: 92, targetType: 'vampire_or_catacomb', goal: 8, gold: 225, food: 3, pelts: 3, dynamite: 2, fullHeal: true, enTitle: 'Crypt & Graveyard Cleanse', enTask: 'Slay 8 Vampires or Catacomb Guardians ←', noTitle: 'Rens Kirkegård & Krypt', noTask: 'Bekjemp 8 vampyrer eller katakombevoktere ←' },
  { seq: 93, targetType: 'bison', goal: 5, gold: 220, food: 6, pelts: 5, dynamite: 0, enTitle: 'Thunder Herd Monarch', enTask: 'Hunt 5 Plains Bison on SW Thunder Plains ↙', noTitle: 'Tordenslettens Konge', noTask: 'Felle 5 præriebison på Thunder Plains ↙' },
  { seq: 94, targetType: 'observatory_foe', goal: 4, gold: 225, food: 2, pelts: 2, dynamite: 3, enTitle: 'Watchers of the Stars', enTask: "Defeat 4 Outlaws or Blackfeather at Raven's Roost ↖", noTitle: 'Stjernenes Voktere', noTask: "Bekjemp 4 fiender ved Raven's Roost ↖" },
  { seq: 95, targetType: 'oasis_foe', goal: 4, gold: 225, food: 3, pelts: 3, dynamite: 2, enTitle: 'Guardians of the Mirage', enTask: "Defeat 4 Oasis Stalkers or Sandwraith King ↓", noTitle: 'Luftspeilingens Voktere', noTask: "Bekjemp 4 oase-fiender ved Dead Man's Oasis ↓" },
  { seq: 96, targetType: 'ranch_upgrade', goal: 2, gold: 240, food: 4, pelts: 3, dynamite: 2, enTitle: 'Dynasty of Dustwood', enTask: 'Purchase 2 Homestead Ranch or Talent upgrades', noTitle: 'Dustwood-dynastiet', noTask: 'Kjøp 2 oppgraderinger på Homestead Ranch' },
  { seq: 97, targetType: 'elite_foe', goal: 14, gold: 280, food: 4, pelts: 4, dynamite: 4, enTitle: 'Supreme Frontier Marshal', enTask: 'Defeat 14 Elite Outlaws, Fiends or Bosses', noTitle: 'Øverste Grenselandsmarskalk', noTask: 'Bekjemp 14 elitefiender eller bosser' },
  { seq: 98, targetType: 'combat_any', goal: 18, gold: 290, food: 5, pelts: 4, dynamite: 4, fullHeal: true, enTitle: 'Unstoppable Gunslinger', enTask: 'Defeat 18 Outlaws or Night Monsters anywhere', noTitle: 'Ustoppelig Revolvermann', noTask: 'Bekjemp 18 lovløse eller monstre hvor som helst' },
  { seq: 99, targetType: 'any_boss', goal: 5, gold: 420, food: 6, pelts: 6, dynamite: 5, fullHeal: true, enTitle: 'Bane of the Five Kings', enTask: 'Defeat any 5 World Bosses across the Frontier', noTitle: 'Fem Kongers Bane', noTask: 'Beseir 5 valgfrie verdensbosser i verdenen' },
  { seq: 100, targetType: 'any_boss', goal: 8, gold: 650, food: 8, pelts: 8, dynamite: 6, fullHeal: true, enTitle: 'CENTENNIAL LEGEND (#100)', enTask: 'Grand Quest #100: Defeat 8 World Bosses across the Frontier!', noTitle: 'JUBILEUMSLEGENDE (#100)', noTask: 'Jubileumsoppdrag #100: Beseir 8 verdensbosser!' }
];

const PROCEDURAL_QUEST_TEMPLATES = [
  {
    targetType: 'wild_beast', baseGoal: 5, stepGoal: 1, maxGoal: 14, baseGold: 115, food: 3, pelts: 3, dynamite: 0,
    enTitle: 'Frontier Big-Game Contract', enTask: (g) => `Hunt ${g} wild beasts across Woods, Peaks or Plains`,
    noTitle: 'Storvilt-kontrakt', noTask: (g) => `Felle ${g} vilt i skogen, fjellet eller på sletten`
  },
  {
    targetType: 'bandit_any', baseGoal: 6, stepGoal: 1, maxGoal: 15, baseGold: 125, food: 1, pelts: 0, dynamite: 2,
    enTitle: 'Outlaw Posse Warrant', enTask: (g) => `Defeat ${g} outlaws in Canyon, Train, Fort or Roost`,
    noTitle: 'Dusør på Lovløse', noTask: (g) => `Bekjemp ${g} lovløse i Canyon, Toget, Fortet eller Roost`
  },
  {
    targetType: 'night_any', baseGoal: 6, stepGoal: 1, maxGoal: 14, baseGold: 135, food: 1, pelts: 2, dynamite: 0, fullHeal: true,
    enTitle: 'Shadow Hunter Contract', enTask: (g) => `Slay ${g} Vampires, Revenants, Stalkers or Wendigos`,
    noTitle: 'Mørkejeger-oppdrag', noTask: (g) => `Bekjemp ${g} vampyrer, gjengangere eller wendigoer`
  },
  {
    targetType: 'bison', baseGoal: 3, stepGoal: 1, maxGoal: 7, baseGold: 125, food: 4, pelts: 3, dynamite: 0,
    enTitle: 'Thunder Plains Herd', enTask: (g) => `Hunt ${g} Plains Bison in SW Thunder Plains ↙`,
    noTitle: 'Tordenslettens Bison', noTask: (g) => `Felle ${g} præriebison på Thunder Plains ↙`
  },
  {
    targetType: 'fort_bandit', baseGoal: 5, stepGoal: 1, maxGoal: 10, baseGold: 135, food: 0, pelts: 0, dynamite: 3,
    enTitle: 'Fort Rattlesnake Raid', enTask: (g) => `Defeat ${g} Desperados at NE Fort ↗ or Roost ↖`,
    noTitle: 'Angrep på Fort Rattlesnake', noTask: (g) => `Bekjemp ${g} desperadoer ved Fortet ↗ eller Roost ↖`
  },
  {
    targetType: 'brimstone_foe', baseGoal: 5, stepGoal: 1, maxGoal: 10, baseGold: 140, food: 2, pelts: 1, dynamite: 1,
    enTitle: 'Brimstone Exorcism', enTask: (g) => `Defeat ${g} Raiders or Revenants in Brimstone SE ↘`,
    noTitle: 'Eksorsisme i Brimstone', noTask: (g) => `Bekjemp ${g} plyndrere eller gjengangere i Brimstone ↘`
  },
  {
    targetType: 'apex_predator', baseGoal: 4, stepGoal: 1, maxGoal: 8, baseGold: 140, food: 3, pelts: 4, dynamite: 0,
    enTitle: 'Silverpine Apex Hunt', enTask: (g) => `Hunt ${g} Cougars, Grizzlies, Alpha Wolves or Hellhounds`,
    noTitle: 'Rovdyrjakt i Ødemarken', noTask: (g) => `Felle ${g} pumaer, grizzly, alfa-ulver eller helveteshunder`
  },
  {
    targetType: 'treasure_any', baseGoal: 4, stepGoal: 1, maxGoal: 7, baseGold: 145, food: 0, pelts: 1, dynamite: 2,
    enTitle: 'Relic & Gold Expedition', enTask: (g) => `Recover ${g} Treasures (Chests, Idols, Cores, Shards, Runes)`,
    noTitle: 'Skatte- & Relikviejakt', noTask: (g) => `Finn ${g} skatter (kasser, idoler, kjerner, splinter, runer)`
  },
  {
    targetType: 'wendigo', baseGoal: 4, stepGoal: 1, maxGoal: 8, baseGold: 150, food: 2, pelts: 3, dynamite: 0,
    enTitle: 'Stone Circle Stalkers', enTask: (g) => `Slay ${g} Wendigos near SW Stone Circle ↙`,
    noTitle: 'Steinringens Rovdyr', noTask: (g) => `Bekjemp ${g} Wendigo-rovdyr ved Steinringen ↙`
  },
  {
    targetType: 'cortez', baseGoal: 1, stepGoal: 0, maxGoal: 1, baseGold: 185, food: 2, pelts: 0, dynamite: 3, fullHeal: true,
    enTitle: 'Warlord Warrant: Cortez', enTask: () => 'Defeat Warlord General Cortez at NE Fort ↗',
    noTitle: 'Etterlyst: General Cortez', noTask: () => 'Beseir krigsherren General Cortez i NØ-fortet ↗'
  },
  {
    targetType: 'marshal', baseGoal: 1, stepGoal: 0, maxGoal: 1, baseGold: 195, food: 2, pelts: 2, dynamite: 2, fullHeal: true,
    enTitle: 'Dead Warrant: Marshal', enTask: () => 'Defeat The Brimstone Marshal in SE Ghost Town ↘',
    noTitle: 'Etterlyst: Brimstone Marshal', noTask: () => 'Beseir den udøde Brimstone Marshal i SØ ↘'
  },
  {
    targetType: 'wendigo_boss', baseGoal: 1, stepGoal: 0, maxGoal: 1, baseGold: 210, food: 3, pelts: 4, dynamite: 0, fullHeal: true,
    enTitle: 'Elder Hunt: Ancient Wendigo', enTask: () => 'Summon & slay The Ancient Wendigo at SW Obelisk ↙',
    noTitle: 'Ur-jakt: Ancient Wendigo', noTask: () => 'Vekk og beseir Ur-Wendigoen ved Obelisken i SV ↙'
  },
  {
    targetType: 'malakor', baseGoal: 1, stepGoal: 0, maxGoal: 1, baseGold: 220, food: 3, pelts: 3, dynamite: 2, fullHeal: true,
    enTitle: 'Blood Warrant: Malakor', enTask: () => 'Summon & slay Lord Malakor at Boot Hill Altar ←',
    noTitle: 'Bloddusør: Lord Malakor', noTask: () => 'Vekk og beseir Lord Malakor ved Boot Hill-alteret ←'
  },
  {
    targetType: 'sandwraith', baseGoal: 1, stepGoal: 0, maxGoal: 1, baseGold: 215, food: 3, pelts: 3, dynamite: 2, fullHeal: true,
    enTitle: "Mirage Warrant: Sandwraith", enTask: () => "Defeat The Sandwraith King at Dead Man's Oasis ↓",
    noTitle: 'Etterlyst: Sandwraith King', noTask: () => "Beseir Sandwraith King ved Dead Man's Oasis ↓"
  },
  {
    targetType: 'goliath', baseGoal: 1, stepGoal: 0, maxGoal: 1, baseGold: 220, food: 5, pelts: 5, dynamite: 0, fullHeal: true,
    enTitle: 'Trophy Warrant: Old Goliath', enTask: () => 'Hunt Elder Kodiak Old Goliath at Frostfang Mill ↑',
    noTitle: 'Trofédusør: Gamle Goliat', noTask: () => 'Felle ur-bjørnen Old Goliath ved Frostfang Sagbruk ↑'
  },
  {
    targetType: 'el_fuego', baseGoal: 1, stepGoal: 0, maxGoal: 1, baseGold: 230, food: 2, pelts: 2, dynamite: 3, fullHeal: true,
    enTitle: 'Forge Warrant: El Fuego', enTask: () => 'Defeat Obsidian Juggernaut El Fuego at Diablo Caldera ↘',
    noTitle: 'Etterlyst: El Fuego', noTask: () => 'Beseir obsidian-kjempen El Fuego i Diablo Caldera ↘'
  },
  {
    targetType: 'blackfeather', baseGoal: 1, stepGoal: 0, maxGoal: 1, baseGold: 230, food: 2, pelts: 3, dynamite: 2, fullHeal: true,
    enTitle: 'Astral Warrant: Blackfeather', enTask: () => "Defeat Phantom Gunslinger Blackfeather at Raven's Roost ↖",
    noTitle: 'Etterlyst: Blackfeather', noTask: () => "Beseir Blackfeather ved Raven's Roost ↖"
  },
  {
    targetType: 'caldera_foe', baseGoal: 4, stepGoal: 1, maxGoal: 8, baseGold: 165, food: 2, pelts: 3, dynamite: 2,
    enTitle: 'Caldera Hellhound Sweep', enTask: (g) => `Defeat ${g} Hellhounds or Raiders at Diablo Caldera ↘`,
    noTitle: 'Caldera-opprydning', noTask: (g) => `Bekjemp ${g} helveteshunder eller plyndrere i Caldera ↘`
  },
  {
    targetType: 'brimstone_totem', baseGoal: 3, stepGoal: 0, maxGoal: 3, baseGold: 145, food: 0, pelts: 0, dynamite: 3,
    enTitle: 'Brimstone Totem Purge', enTask: (g) => `Shatter ${g} Cursed Brimstone Totems in SE ↘`,
    noTitle: 'Knus Svovel-totemer', noTask: (g) => `Skyt i stykker ${g} Svovel-totemer i SØ ↘`
  },
  {
    targetType: 'bottle', baseGoal: 7, stepGoal: 1, maxGoal: 12, baseGold: 95, food: 2, pelts: 0, dynamite: 1,
    enTitle: 'Gunslinger Exhibition', enTask: (g) => `Shoot down ${g} practice bottles in Dustwood`,
    noTitle: 'Revolver-oppvisning', noTask: (g) => `Skyt ned ${g} øvingsflasker i Dustwood`
  },
  {
    targetType: 'any_boss', baseGoal: 2, stepGoal: 0, maxGoal: 3, baseGold: 295, food: 4, pelts: 4, dynamite: 3, fullHeal: true,
    enTitle: 'Overlord Bounty Hunt', enTask: (g) => `Defeat any ${g} World Bosses across the Frontier`,
    noTitle: 'Overherre-dusør', noTask: (g) => `Beseir ${g} valgfrie verdensbosser på kartet`
  },
  {
    targetType: 'elite_foe', baseGoal: 8, stepGoal: 1, maxGoal: 16, baseGold: 185, food: 3, pelts: 3, dynamite: 2,
    enTitle: 'Twelve Regions Patrol', enTask: (g) => `Defeat ${g} Elite enemies or Bosses across the map`,
    noTitle: 'Tolv-regioners Patrulje', noTask: (g) => `Bekjemp ${g} elitefiender eller bosser på kartet`
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
