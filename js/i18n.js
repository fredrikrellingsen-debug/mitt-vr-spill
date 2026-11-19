// Sentralt språksystem (EN standard / NO valg) for utvidet verden, våpensmed, 4-akts historie og 2D Canvas-hjelpere

export const I18N = {
  en: {
    langBtn: 'Language: [EN] / NO',
    wristLangBtn: 'LANG: EN',
    saloonLangSign: 'LANGUAGE: [EN] / NO',
    saloonLangSub: 'Click or shoot to switch',
    pcHintHtml:
      'PC: WASD / Arrows = move • Mouse = look • Click = shoot / interact • 1–6 / Wheel = switch weapon • C = call horse • R = mount/dismount • E / H = eat (+35 HP) • F = Safe House door • T = reset bottles • N = day/night<br />' +
      'Meta Quest: Left stick = move • Right stick = turn 30° • Right trigger = shoot / select • A / X or Wrist btn = switch weapon • Wrist Call Horse • Left grip near horse = mount/dismount (else day/night) • Right grip = eat',
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
    hiddenStatus: 'Status: HIDDEN (Safe)',
    horseRidingHud: 'Mount: GALLOPING',
    horseCallBtn: 'CALL HORSE',
    horseMountBtn: 'DISMOUNT HORSE',
    horseCalledMsg: 'Mustang galloped to your side! Press R (or Left Grip) to mount.',
    day: 'Day',
    night: 'Night',
    outfits: ['Plain', 'Leather Vest', 'Wolf-Pelt Coat', 'Vampire Hunter Set'],
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
    wristHeader: 'COWBOY STATUS',
    wristLegendPrefix: 'HERO • ',
    eatBtn: 'EAT (+35 HP)',
    weaponCycleBtn: (wName) => `WEAPON: ${wName}`,
    questPrefix: 'Bounty',
    questNone: 'Bounty: Check Saloon Board',
    questAllDone: 'Bounty: Repeat for extra Gold!',

    // 8-Level Campaign (Acts 1–8)
    storyPrefix: 'Campaign',
    storyComplete: 'Campaign Complete (8/8): Legend of the Frontier! Explore & hunt bounties.',
    acts: [
      {
        num: 1,
        title: 'Level 1/8 – Stranger in Dustwood',
        formatProgress: (s) => {
          const parts = [];
          parts.push(s.talkedSheriff ? 'Sheriff ✓' : 'Talk to Sheriff Vance');
          parts.push(`Deer ${Math.min(2, s.act1Deer)}/2`);
          parts.push(s.boughtGear ? 'Upgrade ✓' : 'Buy outfit or weapon');
          return `Level 1/8: Stranger in Dustwood (${parts.join(' • ')})`;
        }
      },
      {
        num: 2,
        title: 'Level 2/8 – Predators of Whispering Woods',
        formatProgress: (s) =>
          `Level 2/8: Whispering Woods (Wolves ${Math.min(3, s.level2Wolves)}/3 • Grizzly ${s.grizzlyDefeated ? '✓' : '0/1'})`
      },
      {
        num: 3,
        title: 'Level 3/8 – Outlaws of Crimson Canyon',
        formatProgress: (s) =>
          `Level 3/8: Crimson Canyon (Bandits ${Math.min(4, s.act2Bandits)}/4 • Captain ${s.captainDefeated ? '✓' : '0/1'})`
      },
      {
        num: 4,
        title: 'Level 4/8 – The Abandoned Gold Mine',
        formatProgress: (s) =>
          `Level 4/8: Deep Gold Mine (Barricades ${Math.min(2, s.barricadesCleared)}/2 • Foreman Slade ${s.sladeDefeated ? '✓' : '0/1'} • Mine Map ${s.mineMapCollected ? '✓' : '0/1'})`
      },
      {
        num: 5,
        title: 'Level 5/8 – The Armored Steam Train',
        formatProgress: (s) =>
          `Level 5/8: Southern Railway (Train Snipers ${Math.min(4, s.trainSnipersKilled)}/4 • Capture Gatling Wagon ${s.trainGatlingCaptured ? '✓' : '0/1'})`
      },
      {
        num: 6,
        title: 'Level 6/8 – Shadows of Boot Hill',
        formatProgress: (s) =>
          `Level 6/8: Boot Hill Graveyard (Vampires ${Math.min(4, s.bootHillVampires)}/4 • Silver Relics ${Math.min(2, s.bootHillRelics)}/2)`
      },
      {
        num: 7,
        title: 'Level 7/8 – The Sunken Catacombs',
        formatProgress: (s) =>
          `Level 7/8: Sunken Catacombs (Guardians ${Math.min(3, s.catacombGuardiansKilled)}/3 • Hellfire Repeater ${s.hellfireCollected ? '✓' : '0/1'})`
      },
      {
        num: 8,
        title: 'Level 8/8 – Blood Moon Reckoning',
        formatProgress: (s) =>
          s.bossActive
            ? `Level 8/8 [BLOOD MOON]: Slay LORD MALAKOR (${Math.max(0, Math.ceil(s.bossHp))}/${s.bossMaxHp} HP)!`
            : 'Level 8/8 [BLOOD MOON]: Defend Boot Hill & face Lord Malakor at the Chapel Altar!'
      }
    ],
    sheriffBannerTitle: 'SHERIFF VANCE',
    sheriffQuotes: [
      '"Welcome to Dustwood, stranger! Hunt 2 deer north in Whispering Woods & buy an upgrade."',
      '"Cross the north timber bridge! A savage wolf pack & Grizzly terrorize Whispering Woods."',
      '"Captain Iron-Jaw\'s outlaws seized Crimson Canyon to the east. Clear their camp!"',
      '"Blast through the Gold Mine barricades deep east, defeat Foreman Slade & grab the Old Mine Map!"',
      '"An armored Steam Train rolled in south at z=75! Clear the Train Snipers & seize the Gatling Wagon!"',
      '"Vampires stalk Boot Hill west! Slay 4 night fiends & recover 2 glowing Silver Relics."',
      '"Descend the stone stairs inside Boot Hill Chapel into the Sunken Catacombs & claim the Hellfire Repeater!"',
      '"The Blood Moon rises over Dustwood! Ride west and destroy Lord Malakor forever!"',
      '"You are the Legend of the Frontier! Ride free, hunt bounties & guard Dustwood."'
    ],

    // Town & Region Signs
    signSaloonTitle: 'SALOON',
    signSaloonSub: 'TAVERN & BOUNTIES',
    signTailorTitle: 'TAILOR',
    signTailorSub: 'OUTFITS & PELTS',
    signGunsmithTitle: 'GUNSMITH',
    signGunsmithSub: 'WEAPONS & DYNAMITE',
    signSafeHouseTitle: 'SAFE HOUSE',
    signSafeHouseSub: 'SHERIFF SHELTER',
    signMineTitle: 'ABANDONED MINE',
    signMineSub: 'CRIMSON GOLD VEIN',
    signChapelTitle: 'BOOT HILL CHAPEL',
    signChapelSub: 'SUNKEN CATACOMBS & ALTAR',

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

    // Tailor Shop
    tailorBoardTitle: "TAILOR'S WORKSHOP",
    tailorInfo: (pelts, outfit) =>
      `Pelts: ${pelts}  •  Outfit: ${outfit}  •  Click/shoot within 6m`,
    tailorButtons: [
      'Leather Vest (2 Pelts) -> 25% Armor',
      'Wolf-Pelt Coat (4 Pelts) -> 50% Armor',
      'Vampire Hunter Set (6 Pelts) -> 70% Armor + Bonus Night Damage'
    ],
    equippedTag: '[EQUIPPED]',
    ownedTag: '[OWNED]',
    tailorMsgSame: 'You are already wearing this outfit!',
    tailorMsgBetter: 'You already own better armor!',
    tailorMsgNoPelts: 'Not enough pelts!',
    tailorMsgCrafted: 'New outfit tailored!',

    // Gunsmith Shop
    gunsmithBoardTitle: "GUNSMITH'S ARMORY",
    gunsmithInfo: (gold, pelts, dyn) =>
      `Gold: ${gold}  •  Pelts: ${pelts}  •  Dynamite: ${dyn}  •  Click/shoot within 6m`,
    gunsmithButtons: [
      'Double-Barrel Shotgun (25 Gold) -> 6-Pellet Heavy Blast',
      'Winchester Rifle (40 Gold) -> Long-Range Precision (3x Dmg)',
      'Silver Crossbow (65 Gold + 2 Pelts) -> 3x Burn vs Vampires',
      '3x Dynamite Pack (15 Gold) -> Thrown 2.2s Explosive Blast',
      'Hellfire Repeater (120 Gold) -> Rapid Arcane Silver Gatling (Lv 7+)'
    ],
    gunsmithMsgLockedLevel: 'Unlock the Sunken Catacombs (Level 7) or claim it below Boot Hill Chapel!',
    gunsmithMsgOwned: 'Weapon already unlocked! Switched to it.',
    gunsmithMsgNoGold: 'Not enough Gold! Hunt bandits, bears or mine gold.',
    gunsmithMsgNoPelts: 'Need 2 Pelts + 65 Gold for Silver Crossbow!',
    gunsmithMsgBoughtWeapon: (name) => `Unlocked & equipped: ${name}!`,
    gunsmithMsgBoughtDynamite: (count) => `+3 Dynamite purchased! (Total: ${count})`,

    // Bounty Board (Repeatable for extra Gold!)
    questBoardTitle: "SHERIFF'S BOUNTY BOARD",
    questBoardActiveSub: (title, prog, goal, gold) =>
      `Active: ${title} (${prog}/${goal})  •  Your Gold: ${gold}`,
    questBoardIdleSub: (done, gold) =>
      `Click/shoot a bounty within 6m  •  Cleared: ${done}  •  Gold: ${gold}`,
    badgeOpen: 'OPEN',
    badgeActive: 'ACTIVE',
    badgeDone: 'REPEAT',
    quests: {
      deer_hunt: {
        title: 'Woods Hunter',
        taskText: '"Woods Hunter" – Hunt 2 deer or grizzlies in Whispering Woods',
        rewardText: 'Reward: +25 Gold, +2 Food, +2 Pelts & Sheriff Star'
      },
      bandit_clear: {
        title: 'Canyon Outlaws',
        taskText: '"Canyon Outlaws" – Defeat 3 bandits in Crimson Canyon',
        rewardText: 'Reward: +30 Gold & Golden Revolver (2x base damage)'
      },
      night_guardian: {
        title: 'Boot Hill Watch',
        taskText: '"Boot Hill Watch" – Slay 4 night monsters at night',
        rewardText: 'Reward: +45 Gold & Full Health (100 HP)'
      }
    },
    questMsgDoneAlready: 'Bounty re-activated for extra Gold!',
    questMsgActiveNow: (title, prog, goal) => `Active bounty: ${title} (${prog}/${goal})`,
    questMsgAccepted: (title) => `Bounty accepted: ${title}!`,
    questMsgRewardDeer: 'Completed! +25 Gold, +2 Food, +2 Pelts & Sheriff Star!',
    questMsgRewardBandit: 'Completed! +30 Gold & Golden Revolver!',
    questMsgRewardNight: 'Completed! +45 Gold & Full Health (100 HP)!',

    // 4 World Lore / Wanted Posters
    posters: [
      {
        header: 'WANTED — $500 GOLD',
        title: 'CAPTAIN IRON-JAW',
        lines: [
          'Leader of the Crimson Canyon Outlaws.',
          'Seized the Dustwood Gold Mine in the East.',
          'Armed & armored — last seen guarding',
          'stolen gold chests by the mine rails.'
        ]
      },
      {
        header: 'DUSTWOOD CHRONICLE',
        title: 'SILVER & SHADOW',
        lines: [
          'Ordinary lead barely slows the undead.',
          'Gunsmith Caleb forges Silver Crossbows',
          'that ignite night creatures, while the',
          'Tailor stitches blessed Hunter coats.'
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
          'Enter at Night — or shoot the Blood Altar',
          'inside the ruins — to summon & end him!'
        ]
      }
    ],
    bossBarTitle: 'LORD MALAKOR — VAMPIRE LORD',
    captainLabel: 'BANDIT CAPTAIN'
  },

  no: {
    langBtn: 'Språk: EN / [NO]',
    wristLangBtn: 'SPRÅK: NO',
    saloonLangSign: 'SPRÅK: EN / [NO]',
    saloonLangSub: 'Klikk eller skyt for å bytte',
    pcHintHtml:
      'PC: WASD / piltaster = gå • Mus = se • Klikk = skyt / velg • 1–6 / musehjul = bytt våpen • C = rop på hest • R = sitt opp/av • E / H = spis (+35 HP) • F = Safe House-dør • T = nullstill blinker • N = dag/natt<br />' +
      'Meta Quest: Venstre spak = gå • Høyre spak = sving 30° • Høyre avtrekker = skyt / velg • A / X eller håndleddsknapp = bytt våpen • Rop på hest på håndledd • Venstre grip ved hest = sitt opp/av (ellers dag/natt) • Høyre grip = spis',
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
    hiddenStatus: 'Status: SKJULT (Trygg)',
    horseRidingHud: 'Hest: GALOPPERER',
    horseCallBtn: 'ROP PÅ HEST',
    horseMountBtn: 'GÅ AV HEST',
    horseCalledMsg: 'Mustangen galopperte til deg! Trykk R (eller venstre grip) for å sitte opp.',
    day: 'Dag',
    night: 'Natt',
    outfits: ['Vanlig', 'Lærvest', 'Vargpels-frakk', 'Vampyrjeger-sett'],
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
    wristHeader: 'COWBOY-STATUS',
    wristLegendPrefix: 'HELT • ',
    eatBtn: 'SPIS (+35 HP)',
    weaponCycleBtn: (wName) => `VÅPEN: ${wName}`,
    questPrefix: 'Dusør',
    questNone: 'Dusør: Sjekk Saloon-tavlen',
    questAllDone: 'Dusør: Gjenta for ekstra Gull!',

    // 8-stegs kampanje (Level 1–8)
    storyPrefix: 'Kampanje',
    storyComplete: 'Kampanje fullført (8/8): Legenden på Grenselandet! Utforsk og jakt dusører.',
    acts: [
      {
        num: 1,
        title: 'Level 1/8 – Fremmed i Dustwood',
        formatProgress: (s) => {
          const parts = [];
          parts.push(s.talkedSheriff ? 'Sheriff ✓' : 'Snakk med Sheriff Vance');
          parts.push(`Hjort ${Math.min(2, s.act1Deer)}/2`);
          parts.push(s.boughtGear ? 'Oppgradering ✓' : 'Kjøp antrekk/våpen');
          return `Level 1/8: Fremmed i Dustwood (${parts.join(' • ')})`;
        }
      },
      {
        num: 2,
        title: 'Level 2/8 – Rovdyrene i Whispering Woods',
        formatProgress: (s) =>
          `Level 2/8: Whispering Woods (Ulver ${Math.min(3, s.level2Wolves)}/3 • Grizzly ${s.grizzlyDefeated ? '✓' : '0/1'})`
      },
      {
        num: 3,
        title: 'Level 3/8 – Lovløse i Crimson Canyon',
        formatProgress: (s) =>
          `Level 3/8: Crimson Canyon (Banditter ${Math.min(4, s.act2Bandits)}/4 • Kaptein ${s.captainDefeated ? '✓' : '0/1'})`
      },
      {
        num: 4,
        title: 'Level 4/8 – Den Forlatte Gullgruven',
        formatProgress: (s) =>
          `Level 4/8: Dyp Gullgruve (Barrikader ${Math.min(2, s.barricadesCleared)}/2 • Formann Slade ${s.sladeDefeated ? '✓' : '0/1'} • Gruvekart ${s.mineMapCollected ? '✓' : '0/1'})`
      },
      {
        num: 5,
        title: 'Level 5/8 – Det Pansrede Damptoget',
        formatProgress: (s) =>
          `Level 5/8: Søndre Jernbane (Tog-skarpskyttere ${Math.min(4, s.trainSnipersKilled)}/4 • Erobre Gatling-vogn ${s.trainGatlingCaptured ? '✓' : '0/1'})`
      },
      {
        num: 6,
        title: 'Level 6/8 – Skyggene på Boot Hill',
        formatProgress: (s) =>
          `Level 6/8: Boot Hill Kirkegård (Vampyrer ${Math.min(4, s.bootHillVampires)}/4 • Sølvrelikvier ${Math.min(2, s.bootHillRelics)}/2)`
      },
      {
        num: 7,
        title: 'Level 7/8 – Den Sunkne Katakombe',
        formatProgress: (s) =>
          `Level 7/8: Sunkne Katakombe (Voktere ${Math.min(3, s.catacombGuardiansKilled)}/3 • Hellfire-karabin ${s.hellfireCollected ? '✓' : '0/1'})`
      },
      {
        num: 8,
        title: 'Level 8/8 – Blodmånens Oppgjør',
        formatProgress: (s) =>
          s.bossActive
            ? `Level 8/8 [BLODMÅNE]: Beseir LORD MALAKOR (${Math.max(0, Math.ceil(s.bossHp))}/${s.bossMaxHp} HP)!`
            : 'Level 8/8 [BLODMÅNE]: Forsvar Boot Hill og møt Lord Malakor ved Kapellalteret!'
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
      '«Blodmånen stiger over Dustwood! Ri vestover og knus Lord Malakor for alltid!»',
      '«Du er Legenden på Grenselandet! Ri fritt, jakt dusører og vokt Dustwood.»'
    ],

    // By- og veiskilt
    signSaloonTitle: 'SALOON',
    signSaloonSub: 'KRO & DUSØRER',
    signTailorTitle: 'SKREDDER',
    signTailorSub: 'ANTREKK & SKINN',
    signGunsmithTitle: 'VÅPENSMED',
    signGunsmithSub: 'VÅPEN & DYNAMITT',
    signSafeHouseTitle: 'SAFE HOUSE',
    signSafeHouseSub: 'TRYGT GJEMMESTED',
    signMineTitle: 'FORLATT GULLGRUVE',
    signMineSub: 'CRIMSON GULLÅRE',
    signChapelTitle: 'BOOT HILL KAPELL',
    signChapelSub: 'KATAKOMBER & ALTER',

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

    // Skredderbutikk
    tailorBoardTitle: 'SKREDDERENS VERKSTED',
    tailorInfo: (pelts, outfit) =>
      `Skinn: ${pelts}  •  Antrekk: ${outfit}  •  Klikk/skyt innenfor 6m`,
    tailorButtons: [
      'Lærvest (2 Skinn) -> 25% rustning',
      'Vargpels-frakk (4 Skinn) -> 50% rustning',
      'Vampyrjeger-sett (6 Skinn) -> 70% rustning + ekstra nattskade'
    ],
    equippedTag: '[AKTIV]',
    ownedTag: '[KJØPT]',
    tailorMsgSame: 'Du bruker allerede dette antrekket!',
    tailorMsgBetter: 'Du har allerede bedre antrekk!',
    tailorMsgNoPelts: 'Ikke nok skinn!',
    tailorMsgCrafted: 'Nytt antrekk sydd!',

    // Våpensmed
    gunsmithBoardTitle: 'VÅPENSMEDENS VERKSTED',
    gunsmithInfo: (gold, pelts, dyn) =>
      `Gull: ${gold}  •  Skinn: ${pelts}  •  Dynamitt: ${dyn}  •  Klikk/skyt innenfor 6m`,
    gunsmithButtons: [
      'Avsaget Hagle (25 Gull) -> 6 hagl med enorm nærskade',
      'Winchester Rifle (40 Gull) -> Langtrekkende presisjon (3x skade)',
      'Sølv-armbrøst (65 Gull + 2 Skinn) -> 3x brannskade mot vampyrer',
      '3x Dynamitt-pakke (15 Gull) -> Kastes i bue, eksploderer etter 2,2s',
      'Hellfire-karabin (120 Gull) -> Lynrask sølv-gatling (Level 7+)'
    ],
    gunsmithMsgLockedLevel: 'Lås opp Katakombene (Level 7) eller hent den under Boot Hill Kapell!',
    gunsmithMsgOwned: 'Våpenet er allerede kjøpt! Byttet til våpenet.',
    gunsmithMsgNoGold: 'Ikke nok Gull! Bekjemp banditter, bjørn eller finn gull i gruven.',
    gunsmithMsgNoPelts: 'Trenger 2 Skinn + 65 Gull for Sølv-armbrøst!',
    gunsmithMsgBoughtWeapon: (name) => `Kjøpt og utstyrt: ${name}!`,
    gunsmithMsgBoughtDynamite: (count) => `+3 Dynamitt kjøpt! (Totalt: ${count})`,

    // Oppdragstavle
    questBoardTitle: 'SHERIFFENS OPPDRAGSTAVLE',
    questBoardActiveSub: (title, prog, goal, gold) =>
      `Aktivt: ${title} (${prog}/${goal})  •  Ditt Gull: ${gold}`,
    questBoardIdleSub: (done, gold) =>
      `Klikk/skyt et oppdrag innenfor 6m  •  Fullført: ${done}  •  Gull: ${gold}`,
    badgeOpen: 'LEDIG',
    badgeActive: 'AKTIVT',
    badgeDone: 'GJENTA',
    quests: {
      deer_hunt: {
        title: 'Skogsjegeren',
        taskText: '«Skogsjegeren» – Skyt 2 hjort eller grizzly i Whispering Woods',
        rewardText: 'Belønning: +25 Gull, +2 Mat, +2 Skinn og Sheriff-stjerne'
      },
      bandit_clear: {
        title: 'Canyon-opprydning',
        taskText: '«Canyon-opprydning» – Bekjemp 3 banditter i Crimson Canyon',
        rewardText: 'Belønning: +30 Gull og Gull-revolver (2x grunnskade)'
      },
      night_guardian: {
        title: 'Nattvakt ved Boot Hill',
        taskText: '«Nattvakt ved Boot Hill» – Bekjemp 4 nattmonstre om natten',
        rewardText: 'Belønning: +45 Gull og full helse (100 HP)'
      }
    },
    questMsgDoneAlready: 'Oppdrag aktivert på nytt for ekstra Gull!',
    questMsgActiveNow: (title, prog, goal) => `Aktivt oppdrag: ${title} (${prog}/${goal})`,
    questMsgAccepted: (title) => `Oppdrag aktivert: ${title}!`,
    questMsgRewardDeer: 'Fullført! +25 Gull, +2 Mat, +2 Skinn og Sheriff-stjerne!',
    questMsgRewardBandit: 'Fullført! +30 Gull og Gull-revolver!',
    questMsgRewardNight: 'Fullført! +45 Gull og full helse (100 HP)!',

    // 4 Lore / Etterlyst-plakater
    posters: [
      {
        header: 'ETTERLYST — 500 GULL',
        title: 'KAPTEIN JERNKJEVE',
        lines: [
          'Leder for bandittene i Crimson Canyon.',
          'Har tatt gullgruven øst for Dustwood.',
          'Tungt bevæpnet – vokter stjålne',
          'gullkister ved gruveskinnene.'
        ]
      },
      {
        header: 'DUSTWOOD KRØNIKE',
        title: 'SØLV OG SKYGGE',
        lines: [
          'Vanlig bly biter svakt på nattens vesener.',
          'Våpensmed Caleb smir Sølv-armbrøster',
          'som setter vampyrer i brann, og Skredderen',
          'syr velsignede Vampyrjeger-frakker.'
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
          'Kom om natten – eller skyt Blodalteret',
          'inne i ruinen – for å vekke og beseire ham!'
        ]
      }
    ],
    bossBarTitle: 'LORD MALAKOR — VAMPYRFYRSTE',
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
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#9e6b14';
  ctx.stroke();
}
