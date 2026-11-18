// Sentralt språksystem (EN standard / NO valg) og 2D Canvas-hjelpere

export const I18N = {
  en: {
    langBtn: 'Language: [EN] / NO',
    wristLangBtn: 'LANG: EN',
    saloonLangSign: 'LANGUAGE: [EN] / NO',
    saloonLangSub: 'Click or shoot to switch',
    pcHintHtml:
      'PC: WASD / Arrows = move • Drag mouse = look • Click = shoot / select • E / H = eat (+35 HP) • F = Safe House door • R = reset bottles • N = day/night<br />' +
      'Meta Quest: Left stick = move • Right stick = turn 30° • Right trigger = shoot / select • Right grip = eat • Left grip = day/night',
    hudHealth: 'Health',
    hudFood: 'Food',
    hudEatHint: '(E = eat)',
    hudPelts: 'Pelts',
    hudOutfit: 'Outfit',
    hudTime: 'Time',
    hudTargets: 'Bottles',
    hudTitle: 'Title',
    day: 'Day',
    night: 'Night',
    outfits: ['Plain', 'Leather Vest', 'Wolf-Pelt Coat', 'Vampire Hunter Set'],
    legendTitle: 'Legend of the West',
    wristHeader: 'COWBOY STATUS',
    wristLegendPrefix: 'COWBOY • ',
    eatBtn: 'EAT FOOD (+35 HP)',
    questPrefix: 'Quest',
    questNone: 'Quest: Check the Saloon',
    questAllDone: 'Quest: All bounties completed!',
    signSaloonTitle: 'SALOON',
    signSaloonSub: 'TAVERN & BOUNTIES',
    signTailorTitle: 'TAILOR',
    signTailorSub: 'OUTFITS & PELTS',
    signSafeHouseTitle: 'SAFE HOUSE',
    signSafeHouseSub: 'SHERIFF SHELTER',
    tailorBoardTitle: "TAILOR'S WORKSHOP",
    tailorInfo: (pelts, outfit) =>
      `Your Pelts: ${pelts}  •  Outfit: ${outfit}  •  Click/shoot within 6m`,
    tailorButtons: [
      'Leather Vest (2 Pelts) -> 25% Armor',
      'Wolf-Pelt Coat (4 Pelts) -> 50% Armor',
      'Vampire Hunter Set (6 Pelts) -> 70% Armor + Bonus Night Damage'
    ],
    equippedTag: '[EQUIPPED]',
    tailorMsgSame: 'You are already wearing this outfit!',
    tailorMsgBetter: 'You already own better armor!',
    tailorMsgNoPelts: 'Not enough pelts!',
    tailorMsgCrafted: 'New outfit tailored!',
    questBoardTitle: "SHERIFF'S BOUNTY BOARD",
    questBoardActiveSub: (title, prog, goal, done, total) =>
      `Active: ${title} (${prog}/${goal})  •  Completed: ${done}/${total}`,
    questBoardIdleSub: (done, total) =>
      `Click/shoot a bounty within 6m  •  Completed: ${done}/${total}`,
    badgeOpen: 'OPEN',
    badgeActive: 'ACTIVE',
    badgeDone: 'COMPLETED',
    quests: {
      deer_hunt: {
        title: "Hunter's Trial",
        taskText: '"Hunter\'s Trial" – Hunt 2 deer in the woods',
        rewardText: 'Reward: +2 Food, +2 Pelts & Gold Sheriff Star'
      },
      bandit_clear: {
        title: 'Clear the Border',
        taskText: '"Clear the Border" – Defeat 3 bandits by the cliffs',
        rewardText: 'Reward: Golden Revolver (2x weapon damage)'
      },
      night_guardian: {
        title: 'Night Watchman',
        taskText: '"Night Watchman" – Slay 4 night monsters at night',
        rewardText: 'Reward: "Legend of the West" title & Full Health (100 HP)'
      }
    },
    questMsgDoneAlready: 'Bounty already completed!',
    questMsgActiveNow: (title, prog, goal) => `Active bounty: ${title} (${prog}/${goal})`,
    questMsgAccepted: (title) => `Bounty accepted: ${title}!`,
    questMsgRewardDeer: 'Completed! Reward: +2 Food, +2 Pelts & Sheriff Star!',
    questMsgRewardBandit: 'Completed! Reward: Golden Revolver (2x damage)!',
    questMsgRewardNight: 'Completed! You are now "Legend of the West" (100 HP)!'
  },
  no: {
    langBtn: 'Språk: EN / [NO]',
    wristLangBtn: 'SPRÅK: NO',
    saloonLangSign: 'SPRÅK: EN / [NO]',
    saloonLangSub: 'Klikk eller skyt for å bytte',
    pcHintHtml:
      'PC: WASD / piltaster = gå • Dra med musen = se deg rundt • Klikk = skyt / velg • E / H = spis mat (+35 HP) • F = Safe House-dør • R = nullstill blinker • N = dag/natt<br />' +
      'Meta Quest: Venstre spak = gå • Høyre spak = sving 30° • Høyre avtrekker = skyt / velg • Høyre grip = spis mat • Venstre grip = dag/natt',
    hudHealth: 'Helse',
    hudFood: 'Mat',
    hudEatHint: '(E = spis)',
    hudPelts: 'Skinn',
    hudOutfit: 'Antrekk',
    hudTime: 'Tid',
    hudTargets: 'Blinker',
    hudTitle: 'Tittel',
    day: 'Dag',
    night: 'Natt',
    outfits: ['Vanlig', 'Lærvest', 'Vargpels-frakk', 'Vampyrjeger-sett'],
    legendTitle: 'Vesten-legende',
    wristHeader: 'COWBOY-STATUS',
    wristLegendPrefix: 'COWBOY • ',
    eatBtn: 'SPIS MAT (+35 HP)',
    questPrefix: 'Oppdrag',
    questNone: 'Oppdrag: Sjekk Saloonen',
    questAllDone: 'Oppdrag: Alle oppdrag fullført!',
    signSaloonTitle: 'SALOON',
    signSaloonSub: 'KRO & OPPDRAG',
    signTailorTitle: 'SKREDDER',
    signTailorSub: 'ANTREKK & SKINN',
    signSafeHouseTitle: 'SAFE HOUSE',
    signSafeHouseSub: 'TRYGT GJEMMESTED',
    tailorBoardTitle: 'SKREDDERENS VERKSTED',
    tailorInfo: (pelts, outfit) =>
      `Dine skinn: ${pelts}  •  Aktivt antrekk: ${outfit}  •  Klikk/skyt innenfor 6m`,
    tailorButtons: [
      'Lærvest (2 Skinn) -> 25% rustning',
      'Vargpels-frakk (4 Skinn) -> 50% rustning',
      'Vampyrjeger-sett (6 Skinn) -> 70% rustning + ekstra skade mot nattmonstre'
    ],
    equippedTag: '[AKTIV]',
    tailorMsgSame: 'Du bruker allerede dette antrekket!',
    tailorMsgBetter: 'Du har allerede bedre antrekk!',
    tailorMsgNoPelts: 'Ikke nok skinn!',
    tailorMsgCrafted: 'Nytt antrekk sydd!',
    questBoardTitle: 'SHERIFFENS OPPDRAGSTAVLE',
    questBoardActiveSub: (title, prog, goal, done, total) =>
      `Aktivt: ${title} (${prog}/${goal})  •  Fullført: ${done}/${total}`,
    questBoardIdleSub: (done, total) =>
      `Klikk/skyt på et oppdrag innenfor 6m  •  Fullført: ${done}/${total}`,
    badgeOpen: 'LEDIG',
    badgeActive: 'AKTIVT',
    badgeDone: 'FULLFØRT',
    quests: {
      deer_hunt: {
        title: 'Jegerens prøve',
        taskText: '«Jegerens prøve» – Skyt 2 hjorter i skogen',
        rewardText: 'Belønning: +2 Mat, +2 Skinn og gull Sheriff-stjerne'
      },
      bandit_clear: {
        title: 'Rydd bygrensen',
        taskText: '«Rydd bygrensen» – Bekjemp 3 banditter ved klippene',
        rewardText: 'Belønning: Gull-revolver (våpenskade x2)'
      },
      night_guardian: {
        title: 'Nattens vokter',
        taskText: '«Nattens vokter» – Bekjemp 4 nattmonstre om natten',
        rewardText: 'Belønning: Tittelen «Vesten-legende» og full helse (100 HP)'
      }
    },
    questMsgDoneAlready: 'Oppdraget er allerede fullført!',
    questMsgActiveNow: (title, prog, goal) => `Aktivt oppdrag: ${title} (${prog}/${goal})`,
    questMsgAccepted: (title) => `Oppdrag aktivert: ${title}!`,
    questMsgRewardDeer: 'Fullført! Belønning: +2 Mat, +2 Skinn og Sheriff-stjerne!',
    questMsgRewardBandit: 'Fullført! Belønning: Gull-revolver (skade x2)!',
    questMsgRewardNight: 'Fullført! Du er nå «Vesten-legende» (100 HP)!'
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
