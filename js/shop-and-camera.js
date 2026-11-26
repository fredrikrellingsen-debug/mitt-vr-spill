import * as THREE from 'three';

// ============================================================================
// WESTERN VR & PC/MOBILE: 1ST-PERSON (VR) <-> 3RD-PERSON CHARACTER VIEW [V],
// FULL ARMOR/CLOTHING & WEAPON GOLD SHOP [B], AND STRIPE GOLD PACK STORE
// ============================================================================

export const ARMOR_CATALOG = [
  {
    tier: 0,
    id: 'shirt_plain',
    goldCost: 0,
    peltAltCost: 0,
    damageMultiplier: 1.0,
    armorPct: 0,
    bonusMaxHp: 0,
    nightMonsterDamage: 1,
    coatHex: 0xc8b28e,
    vestHex: 0x6e4e32,
    hatHex: 0x5c361d,
    bandHex: 0xb8893c,
    icon: '👕',
    enName: 'Frontier Shirt',
    noName: 'Nybygger-skjorte',
    enDesc: 'Standard cotton shirt & worn Stetson hat.',
    noDesc: 'Enkel bomullsskjorte og slitt cowboyhatt.'
  },
  {
    tier: 1,
    id: 'leather_vest',
    goldCost: 35,
    peltAltCost: 2,
    damageMultiplier: 0.75,
    armorPct: 25,
    bonusMaxHp: 20,
    nightMonsterDamage: 1,
    coatHex: 0xa8784e,
    vestHex: 0x5c2e14,
    hatHex: 0x462916,
    bandHex: 0xd9a441,
    icon: '🦺',
    enName: 'Frontier Leather Vest',
    noName: 'Speider-lærvest',
    enDesc: 'Thick saddle-leather vest with brass rivets. -25% damage taken & +20 Max HP.',
    noDesc: 'Tykk sal-lærvest med messingnagler. Gir 25% beskyttelse og +20 Maks Helse.'
  },
  {
    tier: 2,
    id: 'ranger_duster',
    goldCost: 90,
    peltAltCost: 3,
    damageMultiplier: 0.60,
    armorPct: 40,
    bonusMaxHp: 45,
    nightMonsterDamage: 1,
    coatHex: 0x6d5239,
    vestHex: 0x3f2716,
    hatHex: 0x382214,
    bandHex: 0xe2b34c,
    icon: '🧥',
    enName: 'Ranger Trail Duster',
    noName: 'Prærie-støvfrakk',
    enDesc: 'Reinforced oilskin duster & shoulder cape. -40% damage taken & +45 Max HP.',
    noDesc: 'Forsterket oljefrakk med skulderkappe. Gir 40% beskyttelse og +45 Maks Helse.'
  },
  {
    tier: 3,
    id: 'direwolf_coat',
    goldCost: 180,
    peltAltCost: 4,
    damageMultiplier: 0.45,
    armorPct: 55,
    bonusMaxHp: 75,
    nightMonsterDamage: 2,
    coatHex: 0x556070,
    vestHex: 0x2c3440,
    hatHex: 0x2a2f38,
    bandHex: 0xdce6f5,
    icon: '🐺',
    enName: 'Direwolf Fur Armor',
    noName: 'Vargpels-rustning',
    enDesc: 'Heavy silver-wolf fur mantle & iron buckles. -55% damage, +75 Max HP & 2x Night Dmg.',
    noDesc: 'Tung ulvepels-krage og jernspenner. 55% beskyttelse, +75 Maks HP og 2x nattskade.'
  },
  {
    tier: 4,
    id: 'vampire_hunter',
    goldCost: 340,
    peltAltCost: 6,
    damageMultiplier: 0.30,
    armorPct: 70,
    bonusMaxHp: 110,
    nightMonsterDamage: 2,
    coatHex: 0x5c1424,
    vestHex: 0x260d14,
    hatHex: 0x1e1318,
    bandHex: 0xe6f0ff,
    icon: '🦇',
    enName: 'Vampire Hunter Armor',
    noName: 'Vampyrjeger-rustning',
    enDesc: 'Crimson hunter coat with blessed silver chestplate. -70% damage, +110 Max HP & 2x Night Dmg.',
    noDesc: 'Blodrød jegerfrakk med velsignet sølvplate. 70% beskyttelse, +110 Maks HP og 2x nattskade.'
  },
  {
    tier: 5,
    id: 'marshal_ironclad',
    goldCost: 650,
    peltAltCost: 10,
    damageMultiplier: 0.22,
    armorPct: 78,
    bonusMaxHp: 160,
    nightMonsterDamage: 3,
    coatHex: 0x1f3654,
    vestHex: 0x3b4656,
    hatHex: 0x182334,
    bandHex: 0xffd25a,
    icon: '🛡️',
    enName: 'Ironclad Marshal Armor',
    noName: 'Marskalk-pansring',
    enDesc: 'Forged steel breastplate & pauldrons over Marshal coat. -78% damage, +160 HP & 3x Night Dmg.',
    noDesc: 'Smidd stålbrystplate og skulderpanser. 78% beskyttelse, +160 Maks HP og 3x nattskade.'
  },
  {
    tier: 6,
    id: 'golden_legend',
    goldCost: 1200,
    peltAltCost: 16,
    damageMultiplier: 0.15,
    armorPct: 85,
    bonusMaxHp: 240,
    nightMonsterDamage: 3,
    coatHex: 0x261d12,
    vestHex: 0xd49c2a,
    hatHex: 0xf0dfbe,
    bandHex: 0xffdf4f,
    icon: '👑',
    enName: 'Golden Legend Armor',
    noName: 'Legendarisk Gullrustning',
    enDesc: '24k gold-engraved frontier plate, golden pauldrons & white Stetson. -85% damage & +240 Max HP!',
    noDesc: '24k gullgravert brystpanser, gullskuldre og kremhvit Stetson. 85% beskyttelse og +240 Maks HP!'
  }
];

export const WEAPON_SHOP_CATALOG = [
  {
    id: 'shotgun',
    kind: 'weapon',
    weaponId: 'shotgun',
    goldCost: 45,
    icon: '💥',
    enName: 'Double-Barrel Coach Shotgun',
    noName: 'Avsaget Dobbeltløpet Hagle',
    enDesc: 'Fires 6 heavy buckshot pellets per blast. Devastating at close & medium range.',
    noDesc: 'Skyter 6 tunge hagl per skudd. Knusende slagkraft på nært og middels hold.'
  },
  {
    id: 'rifle',
    kind: 'weapon',
    weaponId: 'rifle',
    goldCost: 80,
    icon: '🎯',
    enName: 'Winchester Lever-Action Rifle',
    noName: 'Winchester Lever-Action Rifle',
    enDesc: '3x bullet damage with high-velocity long-range precision.',
    noDesc: '3x kuleskade med lynrask utgangshastighet og langtrekkende presisjon.'
  },
  {
    id: 'gold_revolver',
    kind: 'gold_revolver',
    weaponId: 'revolver',
    goldCost: 130,
    icon: '✨',
    enName: '24k Golden Peacemaker',
    noName: '24k Gull-belagt Peacemaker',
    enDesc: 'Engraved golden revolver that permanently doubles base weapon damage (2x)!',
    noDesc: 'Gullgravert Peacemaker som permanent dobler grunnskaden din (2x)!'
  },
  {
    id: 'crossbow',
    kind: 'weapon',
    weaponId: 'crossbow',
    goldCost: 155,
    icon: '🏹',
    enName: 'Blessed Silver Crossbow',
    noName: 'Velsignet Sølv-armbrøst',
    enDesc: 'Launches glowing silver bolts dealing 3x searing burn damage to Vampires & Undead.',
    noDesc: 'Skyter glødende sølvbolter med 3x brennende skade mot vampyrer og nattmonstre.'
  },
  {
    id: 'hellfire',
    kind: 'weapon',
    weaponId: 'hellfire',
    goldCost: 420,
    icon: '🔥',
    enName: 'Hellfire Silver Gatling Repeater',
    noName: 'Hellfire Sølv-Gatling Karabin',
    enDesc: 'Rapid-fire arcane rotary repeater (10 shots/sec, 2x silver bolt damage).',
    noDesc: 'Lynrask roterende sølv-gatling (10 skudd/sek, 2x sølvskade mot alle fiender).'
  },
  {
    id: 'dynamite_5',
    kind: 'dynamite',
    amount: 5,
    goldCost: 25,
    icon: '🧨',
    enName: '5x Frontier Dynamite Crate',
    noName: '5x Dynamitt-kasse',
    enDesc: 'Adds +5 Throwable Dynamite sticks with massive 7.2m explosion radius.',
    noDesc: 'Gir +5 kaste-dynamitt med mektig 7,2 m trykkbølge og områdeskade.'
  },
  {
    id: 'rations_heal',
    kind: 'rations',
    amount: 5,
    goldCost: 15,
    icon: '🥩',
    enName: 'Trail Rations (+5 Food & Full Heal)',
    noName: 'Reiseproviant (+5 Mat & Full Helse)',
    enDesc: 'Instantly restores 100% Health and adds +5 Smoked Venison rations [E].',
    noDesc: 'Gjenoppretter 100% helse umiddelbart og legger til +5 Mat i sekken [E].'
  },
  {
    id: 'mastery',
    kind: 'mastery',
    goldCost: 90,
    icon: '⚒️',
    enName: 'Masterwork Barrel Rifling (+20% Dmg)',
    noName: 'Våpenmestring: Mestermunning (+20% Skade)',
    enDesc: 'Permanently boosts ALL weapon damage by +20% per rank (up to Rank 40).',
    noDesc: 'Øker permanent skaden på ALLE våpen med +20% per nivå (opptil Nivå 40).'
  }
];

// Offentlige Stripe Payment Links (INGEN hemmelige nøkler i klientkode!).
// Når live/sandbox Stripe Payment Links er aktivert, limes kun offentlige https://buy.stripe.com/... URL-er inn her
// (eller settes dynamisk via window.__WVR_STRIPE_LINKS).
export const STRIPE_GOLD_PACKS = [
  {
    id: 'prospector_500',
    gold: 500,
    bonusTagEn: 'Starter Pouch',
    bonusTagNo: 'Startpung',
    priceNok: 29,
    priceUsd: '29 kr inkl. mva',
    icon: '🪙',
    enName: '500 Gold Coins',
    noName: '500 Gullmynter',
    enDesc: 'Great for unlocking your first Leather Armor, Shotgun & Winchester Rifle.',
    noDesc: 'Perfekt startpakke til Lærvest, Hagle, Winchester og dynamitt.',
    paymentLinkUrl: 'https://buy.stripe.com/bJe00k3v32kb7IC43p5Ne0A'
  },
  {
    id: 'sheriff_1600',
    gold: 1600,
    bonusTagEn: '+100 Bonus Gold',
    bonusTagNo: '+100 Bonusgull',
    priceNok: 79,
    priceUsd: '79 kr inkl. mva',
    popular: true,
    icon: '💰',
    enName: '1,600 Gold Coins',
    noName: '1 600 Gullmynter',
    enDesc: 'Popular! Enough for Vampire Hunter Armor, Silver Crossbow & Golden Peacemaker.',
    noDesc: 'Mest populær! Nok til Vampyrjeger-rustning, Sølv-armbrøst og Gull-Peacemaker.',
    paymentLinkUrl: 'https://buy.stripe.com/14A5kE5Dbe2T3sm57t5Ne0B'
  },
  {
    id: 'vault_4500',
    gold: 4500,
    bonusTagEn: '+500 Bonus Gold',
    bonusTagNo: '+500 Bonusgull',
    priceNok: 179,
    priceUsd: '179 kr inkl. mva',
    icon: '🏦',
    enName: '4,500 Gold Coins',
    noName: '4 500 Gullmynter',
    enDesc: 'Unlock Golden Legend Armor, Hellfire Repeater & high Homestead Ranch ranks!',
    noDesc: 'Lås opp Legendarisk Gullrustning, Hellfire-karabin og høye Ranch-oppgraderinger!',
    paymentLinkUrl: 'https://buy.stripe.com/14A4gA1mVcYPfb4arN5Ne0C'
  },
  {
    id: 'baron_12000',
    gold: 12000,
    bonusTagEn: '+2,500 Bonus Gold',
    bonusTagNo: '+2 500 Bonusgull',
    priceNok: 399,
    priceUsd: '399 kr inkl. mva',
    icon: '👑',
    enName: '12,000 Gold Coins',
    noName: '12 000 Gullmynter',
    enDesc: 'Ultimate Frontier Tycoon chest — fund max Armor Padding, Weapon Mastery & Ranch Empire!',
    noDesc: 'Gullbaronens skattkiste — finansier maks rustningsfôr, våpenmestring og hele Ranch-imperiet!',
    paymentLinkUrl: 'https://buy.stripe.com/dRm4gAc1z5wn5AubvR5Ne0D'
  }
];

const PENDING_STRIPE_KEY = 'western_vr_pending_stripe_v1';

const SHOP_STRINGS = {
  en: {
    viewBtnFirst: '🎥 View: 1st Person (VR) [V]',
    viewBtnThird: '🎥 View: 3rd Person (Character) [V]',
    sensViewLabel: 'Character / Camera View [V]',
    sensViewFirst: '1st Person (Best for VR)',
    sensViewThird: '3rd Person (See Character)',
    storeHudBtn: (gold) => `🛒 Shop & Gold: ${gold} 💰 [B]`,
    modalTitle: '🤠 DUSTWOOD OUTFITTER, ARMORY & GOLD BANK [B]',
    closeBtn: 'Close [B]',
    preview3rdBtn: '🎥 See Character (3rd Person)',
    preview1stBtn: '🎥 Switch to 1st Person (VR)',
    tabArmor: '🧥 Armor & Clothes (+Protection)',
    tabWeapons: '🔫 Weapons & Upgrades',
    tabGold: '💳 Buy Gold (Stripe)',
    earnNote:
      '💡 Earn Gold in-game by completing Saloon Quests [J], NPC Zone Quests (! / ?), Homestead Ranch dividends & Bosses — or top up anytime via Stripe!',
    statGold: 'Gold',
    statArmor: 'Protection',
    statHp: 'Max HP',
    statWeapon: 'Weapon',
    buyForGold: (g) => `Buy (${g} Gold)`,
    equipBtn: 'Equip Look',
    equippedBadge: '✓ Equipped',
    unlockedBadge: 'Owned',
    needGold: (g) => `Need ${g} Gold (Earn from Quests or Buy Gold)`,
    boughtArmorToast: (name, pct, hp) => `🛡️ Equipped ${name}! (${pct}% Protection • Max HP ${hp})`,
    switchedArmorToast: (name) => `🤠 Outfit style switched to ${name}!`,
    boughtWeaponToast: (name) => `🔫 Purchased & equipped: ${name}!`,
    paddingTitle: 'Reinforced Steel & Leather Padding (+20 Max HP)',
    paddingDesc: (cur, cap) => `Permanently reinforces your armor lining. Current Base Max HP: ${cur} / ${cap}.`,
    paddingMaxed: '✓ Max Armor Padding (500 HP)',
    stripeBannerTitle: '💳 Secure In-Game Gold Store (Powered by Stripe)',
    stripeBannerSub:
      'Want extra Gold right away without grinding quests? Choose a Gold Pack below to pay securely with Card, Apple Pay, Google Pay or Vipps via Stripe Checkout.',
    stripeBuyBtn: (nok) => `💳 Buy with Stripe — ${nok} kr`,
    stripePendingSetupMsg:
      '🔒 Stripe Checkout is ready!',
    stripeSuccessToast: (gold, packName) => `🎉 Stripe Payment Complete! +${gold} Gold credited (${packName})!`,
    notEnoughGoldBanner: (have, need, item) =>
      `⚠️ Not enough Gold for ${item}: you have ${have} Gold, need ${need} Gold. Complete Quests [J] or click "💳 Buy Gold (Stripe)" above!`,
    proxTailorBtn: '🧥 Enter Tailor Armor Shop [B / Click]',
    proxGunsmithBtn: '🔫 Enter Gunsmith Weapon Shop [B / Click]'
  },
  no: {
    viewBtnFirst: '🎥 Visning: 1. person (VR) [V]',
    viewBtnThird: '🎥 Visning: 3. person (Karakter) [V]',
    sensViewLabel: 'Karakter- / Kameravisning [V]',
    sensViewFirst: '1. person (Best for VR)',
    sensViewThird: '3. person (Se karakteren)',
    storeHudBtn: (gold) => `🛒 Butikk & Gull: ${gold} 💰 [B]`,
    modalTitle: '🤠 DUSTWOOD HANDELSHUS — ARMOR, VÅPEN & GULLBANK [B]',
    closeBtn: 'Lukk [B]',
    preview3rdBtn: '🎥 Se karakteren (3. person)',
    preview1stBtn: '🎥 Bytt til 1. person (VR)',
    tabArmor: '🧥 Armor & Klær (+Beskyttelse)',
    tabWeapons: '🔫 Våpen & Oppgraderinger',
    tabGold: '💳 Kjøp Spillpenger (Stripe)',
    earnNote:
      '💡 Du tjener spillpenger (Gull) gratis ved å klare Saloon-oppdrag [J], Sone-oppdrag hos NPC-er (! / ?), gullkister og bosser — eller du kan kjøpe ekstra Gull direkte med Stripe!',
    statGold: 'Spillpenger',
    statArmor: 'Beskyttelse',
    statHp: 'Maks Helse',
    statWeapon: 'Våpen',
    buyForGold: (g) => `Kjøp (${g} Gull)`,
    equipBtn: 'Bruk utseende',
    equippedBadge: '✓ Utstyrt',
    unlockedBadge: 'Eies',
    needGold: (g) => `Mangler Gull (${g} Gull — klar quests eller kjøp Gull)`,
    boughtArmorToast: (name, pct, hp) => `🛡️ Kjøpt og utstyrt: ${name}! (${pct}% beskyttelse • Maks HP ${hp})`,
    switchedArmorToast: (name) => `🤠 Byttet antrekk-utseende til ${name}!`,
    boughtWeaponToast: (name) => `🔫 Kjøpt og utstyrt: ${name}!`,
    paddingTitle: 'Forsterket Panser- og Lærfôr (+20 Maks Helse)',
    paddingDesc: (cur, cap) => `Forsterker rustningen permanent. Nåværende grunn-helse: ${cur} / ${cap} HP.`,
    paddingMaxed: '✓ Maks Panserfôr (500 HP)',
    stripeBannerTitle: '💳 Kjøp Spillpenger med Stripe (Kort / Vipps / Apple Pay)',
    stripeBannerSub:
      'Vil du fylle opp gullkisten med én gang? Velg en gullpakke under for trygg betaling via Stripe Checkout — gullet legges rett inn på karakteren din.',
    stripeBuyBtn: (nok) => `💳 Kjøp med Stripe — ${nok} kr (inkl. mva)`,
    stripePendingSetupMsg:
      '🔒 Stripe Checkout er klar!',
    stripeSuccessToast: (gold, packName) => `🎉 Stripe-kjøp fullført! +${gold} Gull lagt til (${packName})!`,
    notEnoughGoldBanner: (have, need, item) =>
      `⚠️ Ikke nok Gull til ${item}: du har ${have} Gull, men trenger ${need} Gull. Klar oppdrag [J] eller klikk på fanen «💳 Kjøp Spillpenger (Stripe)» over!`,
    proxTailorBtn: '🧥 Åpne Skredderbutikken (Armor & Klær) [Klikk / B]',
    proxGunsmithBtn: '🔫 Åpne Våpensmeden (Våpen & Ammo) [Klikk / B]'
  }
};

export function getArmorDefByTier(tier) {
  const idx = Math.max(0, Math.min(ARMOR_CATALOG.length - 1, Math.round(tier || 0)));
  return ARMOR_CATALOG[idx];
}

export function initShopAndCameraSystem(ctx) {
  const {
    scene,
    camera,
    renderer,
    playerRig,
    playerState,
    storyState,
    controlSettings,
    saveControlSettings,
    M,
    C,
    FX,
    WEAPON_ORDER,
    pcWeapons,
    unlockedWeapons,
    getLang,
    getActiveWeaponId,
    equipWeapon,
    getIsRidingHorse,
    getHorseEntity,
    getPcPitch,
    getMoveSpeed,
    getTerrainHeight,
    pointHitsSolidWall,
    findCombatHit,
    triggerWeaponKick,
    updateWeaponViewFX,
    getOutfitTier,
    setOutfitStats,
    getVisualOutfitTier,
    setVisualOutfitTier,
    getArmorPaddingRanks,
    setArmorPaddingRanks,
    getHasSheriffStar,
    getHasGoldenRevolver,
    grantGoldenRevolver,
    getWeaponMasteryRank,
    incrementWeaponMasteryRank,
    getRedeemedStripeSessions,
    addRedeemedStripeSession,
    updateLeftSleeveAppearance,
    checkStoryProgression,
    saveCareerProgress,
    updateStatusUI,
    showFrontierToast,
    spawnSparkBurst,
    audio
  } = ctx;

  function SL() {
    return SHOP_STRINGS[getLang() === 'no' ? 'no' : 'en'] || SHOP_STRINGS.en;
  }

  // ==========================================================================
  // 1. 3D LOKAL SPILLER-AVATAR (SYNLIG I 3.-PERSON VISNING, MED SYNLIG ARMOR,
  //    COWBOYHATT, SHERIFF-STJERNE, VÅPEN I HÅNDEN OG HESTERIDNING!)
  // ==========================================================================
  const playerAvatarRoot = new THREE.Group();
  playerAvatarRoot.name = 'LocalPlayerThirdPersonAvatar';
  playerAvatarRoot.visible = false;
  scene.add(playerAvatarRoot);

  const avatarBody = C.createPlayerHeroModel
    ? C.createPlayerHeroModel()
    : (C.createBanditModel ? C.createBanditModel() : C.createSheriffVanceNPC([]));
  // Fjern eventuelt prat-skilt på spillerens egen figur; createPlayerHeroModel peker allerede rett fremover (-Z)!
  const toRemove = [];
  avatarBody.traverse((n) => {
    if (n.isSprite || (n.userData && n.userData.isDialogueSign)) {
      toRemove.push(n);
    }
  });
  toRemove.forEach((n) => {
    if (n.parent) n.parent.remove(n);
  });
  avatarBody.rotation.y = 0;
  playerAvatarRoot.add(avatarBody);

  // Finn skjelett-bein (GLB) fra createPlayerHeroModel for å feste Hatt, Armor og Våpen rett i høyre hånd!
  const heroBones = avatarBody.userData.heroBones || {};
  let headBone = heroBones.headBone || null;
  let chestBone = heroBones.chestBone || null;
  let handRBone = heroBones.handRBone || null;
  let upperArmRBone = null;
  let thighLBone = null;
  let thighRBone = null;
  let calfLBone = null;
  let calfRBone = null;
  const baseBodyMaterials = [];
  const hatMeshes = [];

  avatarBody.traverse((n) => {
    const nm = (n.name || '').toLowerCase();
    if (!headBone && (nm === 'head' || nm.endsWith('head'))) headBone = n;
    if (!chestBone && (nm === 'spine_03' || nm === 'spine_02' || nm === 'spine02')) chestBone = n;
    if (!handRBone && (nm === 'hand_r' || nm === 'righthand')) handRBone = n;
    if (!upperArmRBone && nm === 'upperarm_r') upperArmRBone = n;
    if (!thighLBone && nm === 'thigh_l') thighLBone = n;
    if (!thighRBone && nm === 'thigh_r') thighRBone = n;
    if (!calfLBone && nm === 'calf_l') calfLBone = n;
    if (!calfRBone && nm === 'calf_r') calfRBone = n;

    if (n.isMesh && n.material) {
      n.castShadow = true;
      n.receiveShadow = true;
      const mats = Array.isArray(n.material) ? n.material : [n.material];
      const cloned = mats.map((m) => {
        if (!m) return m;
        const cm = m.clone();
        cm.side = THREE.DoubleSide;
        const mName = (m.name || '').toLowerCase();
        const isSkinOrEye =
          mName.includes('skin') ||
          mName.includes('head') ||
          mName.includes('eye') ||
          mName.includes('teeth') ||
          mName.includes('hair') ||
          mName.includes('beard') ||
          mName.includes('eyelash') ||
          mName.includes('brow');
        if (!isSkinOrEye && cm.color) {
          let p = n;
          let inHat = false;
          while (p && p !== avatarBody) {
            if (p.geometry && p.geometry.type === 'LatheGeometry' && p.position.y < 0.3) {
              inHat = true;
            }
            p = p.parent;
          }
          if (inHat || (headBone && n.parent && n.parent.parent === headBone)) {
            hatMeshes.push({ mesh: n, mat: cm, baseHex: cm.color.getHex(), baseMap: cm.map || null });
          } else if (cm.metalness < 0.55) {
            baseBodyMaterials.push({ mat: cm, baseColor: cm.color.clone() });
          }
        }
        return cm;
      });
      n.material = Array.isArray(n.material) ? cloned : cloned[0];
    }
  });

  // Bygg visuelt 3D-rustningssett festet direkte på karakterens brystbein (spine_03: +Y opp ryggraden, +Z brystfront)
  const armorRig = new THREE.Group();
  if (chestBone) {
    armorRig.position.set(0, 0.08, 0.005);
    chestBone.add(armorRig);
  } else {
    armorRig.position.set(0, 1.20, 0);
    playerAvatarRoot.add(armorRig);
  }

  const armorVestMat = new THREE.MeshStandardMaterial({
    color: 0x5c2e14,
    roughness: 0.55,
    metalness: 0.18,
    side: THREE.DoubleSide
  });
  const armorTrimMat = new THREE.MeshStandardMaterial({
    color: 0xd9a441,
    roughness: 0.26,
    metalness: 0.86,
    side: THREE.DoubleSide
  });
  const furCollarMat = new THREE.MeshStandardMaterial({
    color: 0x7b8596,
    roughness: 0.92,
    metalness: 0.04,
    side: THREE.DoubleSide
  });

  // Smal, kroppsnær brystvest / brystpanser rundt overkroppen
  const chestPlateMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.148, 0.138, 0.24, 18, 1, false),
    armorVestMat
  );
  chestPlateMesh.scale.set(1.06, 1.0, 0.72);
  chestPlateMesh.castShadow = true;
  armorRig.add(chestPlateMesh);

  // Skulderplater (Pauldrons) tett på skuldrene (Tier 2+)
  const pauldronGroup = new THREE.Group();
  [-1, 1].forEach((side) => {
    const pad = new THREE.Mesh(
      new THREE.SphereGeometry(0.072, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.56),
      armorTrimMat
    );
    pad.position.set(side * 0.175, 0.115, 0);
    pad.rotation.z = side * -0.36;
    pad.scale.set(1.02, 0.80, 1.08);
    pad.castShadow = true;
    pauldronGroup.add(pad);
  });
  armorRig.add(pauldronGroup);

  // Ulvepels-krage rundt hals/skuldre (Tier 3)
  const furCollarMesh = new THREE.Mesh(
    new THREE.TorusGeometry(0.135, 0.038, 10, 20),
    furCollarMat
  );
  furCollarMesh.rotation.x = Math.PI / 2 + 0.12;
  furCollarMesh.scale.set(1.10, 0.85, 1.0);
  furCollarMesh.position.set(0, 0.135, 0.005);
  armorRig.add(furCollarMesh);

  // Bryst- og ryggemblem (Tier 4–6)
  const chestCrestMesh = new THREE.Group();
  [-1, 1].forEach((zSide) => {
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.038, 0), armorTrimMat);
    gem.scale.set(1.0, 1.28, 0.34);
    gem.position.set(0, 0.03, zSide * 0.112);
    chestCrestMesh.add(gem);
  });
  armorRig.add(chestCrestMesh);

  // Synlig 3D Sheriff-stjerne på brystet
  const avatarStarMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.024, 0.024, 0.007, 6),
    M.polishedBrassMat || armorTrimMat
  );
  avatarStarMesh.rotation.x = Math.PI / 2;
  avatarStarMesh.position.set(-0.068, 0.068, 0.110);
  armorRig.add(avatarStarMesh);

  // Våpenfeste låst DIREKTE inni karakterens høyre hånd (handRBone)!
  // I MakeHuman hand_r peker fingrene/løpet langs +Y og skjeftet ned langs -X, mens createWeaponModel har løp langs -Z og skjefte langs -Y.
  const tpWeaponPivot = new THREE.Group();
  if (handRBone) {
    const handBasis = new THREE.Matrix4().makeBasis(
      new THREE.Vector3(0, 0, -1), // weapon +X
      new THREE.Vector3(1, 0, 0),  // weapon +Y (opp fra skjefte -> +X i hand_r)
      new THREE.Vector3(0, -1, 0)  // weapon +Z -> -Y i hand_r (så løpet -Z peker rett ut langs +Y!)
    );
    tpWeaponPivot.quaternion.setFromRotationMatrix(handBasis);
    tpWeaponPivot.position.set(0.022, 0.065, 0.005);
    handRBone.add(tpWeaponPivot);
  } else {
    tpWeaponPivot.position.set(0.28, 1.18, -0.46);
    playerAvatarRoot.add(tpWeaponPivot);
  }

  const tpWeapons = Object.create(null);
  const TP_WEAPON_SCALES = {
    revolver: 0.96,
    shotgun: 0.98,
    rifle: 0.98,
    crossbow: 0.96,
    dynamite: 0.98,
    hellfire: 0.98
  };
  WEAPON_ORDER.forEach((wId) => {
    const wm = FX.createWeaponModel(wId);
    wm.scale.setScalar(TP_WEAPON_SCALES[wId] || 0.76);
    wm.visible = wId === getActiveWeaponId();
    tpWeaponPivot.add(wm);
    tpWeapons[wId] = wm;
  });

  // Animasjonsmikser for karakterens Idle / Walk / Run i 3.-person
  function createAvatarMixer(rootGroup) {
    const clips = (rootGroup.animations && rootGroup.animations.length)
      ? rootGroup.animations
      : (rootGroup.userData && rootGroup.userData.animations ? rootGroup.userData.animations : null);
    if (!clips || clips.length === 0) return null;
    const animTarget = (rootGroup.userData && rootGroup.userData.animRoot) || rootGroup;
    const mixer = new THREE.AnimationMixer(animTarget);
    let idleClip = null;
    let walkClip = null;
    let runClip = null;
    for (let i = 0; i < clips.length; i++) {
      const nm = (clips[i].name || '').toLowerCase();
      if (!idleClip && (nm.includes('idle') || nm.includes('stand')) && !nm.includes('toidle')) idleClip = clips[i];
      if (!walkClip && nm.includes('walk')) walkClip = clips[i];
      if (!runClip && (nm.includes('run') || nm.includes('jog') || nm.includes('sprint'))) runClip = clips[i];
    }
    if (!idleClip) idleClip = clips[0];
    if (!walkClip) walkClip = runClip || idleClip;
    if (!runClip) runClip = walkClip;

    const idleAction = mixer.clipAction(idleClip);
    const walkAction = walkClip !== idleClip ? mixer.clipAction(walkClip) : null;
    const runAction = runClip !== walkClip && runClip !== idleClip ? mixer.clipAction(runClip) : walkAction;
    idleAction.play();
    mixer.update(0.02);
    return { mixer, idleAction, walkAction, runAction, state: 'idle' };
  }

  const avatarAnim = createAvatarMixer(avatarBody);

  const tmpTintCol = new THREE.Color();
  let lastAppliedVisualTier = -1;
  let lastAppliedGoldRev = false;

  function syncAvatarAppearance() {
    const vTier = getVisualOutfitTier();
    const def = getArmorDefByTier(vTier);

    if (vTier !== lastAppliedVisualTier) {
      lastAppliedVisualTier = vTier;
      tmpTintCol.setHex(def.coatHex);
      for (let i = 0; i < baseBodyMaterials.length; i++) {
        const entry = baseBodyMaterials[i];
        entry.mat.color.copy(entry.baseColor).lerp(tmpTintCol, vTier === 0 ? 0.15 : 0.76);
      }
      for (let i = 0; i < hatMeshes.length; i++) {
        const hm = hatMeshes[i];
        if (hm.mat.metalness > 0.5) {
          hm.mat.color.setHex(def.bandHex);
        } else {
          const nextMap = vTier === 6 ? null : hm.baseMap;
          if (hm.mat.map !== nextMap) {
            hm.mat.map = nextMap;
            hm.mat.needsUpdate = true;
          }
          hm.mat.color.setHex(def.hatHex);
        }
      }

      chestPlateMesh.visible = vTier >= 1;
      pauldronGroup.visible = vTier >= 2;
      furCollarMesh.visible = vTier === 3;
      chestCrestMesh.visible = vTier >= 4;

      armorVestMat.color.setHex(def.vestHex);
      armorVestMat.metalness = vTier >= 5 ? 0.78 : (vTier === 4 ? 0.35 : 0.14);
      armorVestMat.roughness = vTier >= 5 ? 0.28 : 0.58;

      armorTrimMat.color.setHex(def.bandHex);
      armorTrimMat.metalness = vTier >= 4 ? 0.88 : 0.45;
      armorTrimMat.roughness = vTier >= 4 ? 0.22 : 0.52;
      armorTrimMat.emissive.setHex(vTier === 6 ? 0x3d2800 : (vTier === 4 ? 0x102238 : 0x000000));

      updateLeftSleeveAppearance(vTier);
    }

    avatarStarMesh.visible = !!getHasSheriffStar();

    const wId = getActiveWeaponId();
    WEAPON_ORDER.forEach((id) => {
      if (tpWeapons[id]) tpWeapons[id].visible = id === wId;
    });

    if (getHasGoldenRevolver() && !lastAppliedGoldRev && tpWeapons.revolver) {
      lastAppliedGoldRev = true;
      tpWeapons.revolver.traverse((m) => {
        if (m.isMesh && m.material && m.material.metalness > 0.4) {
          m.material = m.material.clone();
          m.material.color.setHex(0xffd24c);
          m.material.metalness = 0.92;
          m.material.roughness = 0.20;
        }
      });
    }
  }

  // ==========================================================================
  // 2. KAMERAVALG: 1.-PERSON (BEST FOR VR) <-> 3.-PERSON (SE KARAKTEREN) [V]
  // ==========================================================================
  const viewModeBtnEl = document.getElementById('view-mode-btn');
  const sensViewLabelEl = document.getElementById('sens-view-label');
  const sensViewBtnEl = document.getElementById('sens-view-btn');

  let currentBoomDist = 3.05;

  function isThirdPersonActive() {
    if (renderer.xr.isPresenting) return false;
    return controlSettings.viewMode === 'third';
  }

  function applyCameraAndWeaponVisibility() {
    const inVR = renderer.xr.isPresenting;
    const third = !inVR && controlSettings.viewMode === 'third';
    const wId = getActiveWeaponId();

    playerAvatarRoot.visible = third;
    WEAPON_ORDER.forEach((id) => {
      if (pcWeapons[id]) {
        pcWeapons[id].visible = !inVR && !third && id === wId;
      }
    });

    if (!inVR && !third) {
      camera.position.set(0, 1.65, 0);
      camera.rotation.set(getPcPitch(), 0, 0);
    }
    syncViewButtonsUI();
    syncAvatarAppearance();
  }

  function setViewMode(mode) {
    controlSettings.viewMode = mode === 'third' ? 'third' : 'first';
    saveControlSettings();
    applyCameraAndWeaponVisibility();
    if (audio && audio.playQuestSelectSound) audio.playQuestSelectSound();
    if (storeModalOpen) renderStoreModal();
  }

  function toggleViewMode() {
    if (renderer.xr.isPresenting) return;
    setViewMode(controlSettings.viewMode === 'third' ? 'first' : 'third');
  }

  function syncViewButtonsUI() {
    const s = SL();
    const isThird = controlSettings.viewMode === 'third';
    if (viewModeBtnEl) {
      viewModeBtnEl.textContent = isThird ? s.viewBtnThird : s.viewBtnFirst;
      viewModeBtnEl.classList.toggle('active-view-third', isThird);
    }
    if (sensViewLabelEl) sensViewLabelEl.textContent = s.sensViewLabel;
    if (sensViewBtnEl) {
      sensViewBtnEl.textContent = isThird ? s.sensViewThird : s.sensViewFirst;
      sensViewBtnEl.classList.toggle('active', isThird);
    }
    const storeBtnEl = document.getElementById('store-open-btn');
    if (storeBtnEl) {
      storeBtnEl.textContent = s.storeHudBtn(playerState.gold);
    }
  }

  if (viewModeBtnEl) {
    viewModeBtnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleViewMode();
    });
  }
  if (sensViewBtnEl) {
    sensViewBtnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleViewMode();
    });
  }

  // Pre-allokerte hjelpeobjekter for 3.-person siktearm og sal-positur (0 GC-allokeringer per frame!)
  const tmpParentWorldQuat = new THREE.Quaternion();
  const tmpParentInvQuat = new THREE.Quaternion();
  const tmpWorldRotQuat = new THREE.Quaternion();
  const tmpLocalDeltaQuat = new THREE.Quaternion();
  const tmpCharRightAxis = new THREE.Vector3(1, 0, 0);
  const tmpCharFwdAxis = new THREE.Vector3(0, 0, -1);
  let tpArmRecoilKick = 0;

  function rotateBoneInWorldSpace(bone, worldAxis, angleRad) {
    if (!bone || !bone.parent) return;
    bone.parent.updateWorldMatrix(true, false);
    bone.parent.getWorldQuaternion(tmpParentWorldQuat);
    tmpParentInvQuat.copy(tmpParentWorldQuat).invert();
    tmpWorldRotQuat.setFromAxisAngle(worldAxis, angleRad);
    tmpLocalDeltaQuat.copy(tmpParentInvQuat).multiply(tmpWorldRotQuat).multiply(tmpParentWorldQuat);
    bone.quaternion.premultiply(tmpLocalDeltaQuat);
  }

  // Oppdater 3.-person kamera og karakter-animasjon i hver frame (0 objektallokeringer!)
  function updateThirdPersonCameraAndAvatar(dt, worldTime) {
    if (renderer.xr.isPresenting) {
      if (playerAvatarRoot.visible) playerAvatarRoot.visible = false;
      return;
    }

    const third = controlSettings.viewMode === 'third';
    if (!third) {
      if (playerAvatarRoot.visible) playerAvatarRoot.visible = false;
      camera.position.set(0, 1.65, 0);
      return;
    }

    if (!playerAvatarRoot.visible) {
      applyCameraAndWeaponVisibility();
    }

    const riding = !!getIsRidingHorse();
    const horseEnt = getHorseEntity ? getHorseEntity() : null;
    const speed = getMoveSpeed();
    const pitch = getPcPitch();
    const rigYaw = playerRig.rotation.y;

    if (riding && horseEnt && horseEnt.group) {
      playerAvatarRoot.position.set(
        horseEnt.group.position.x,
        horseEnt.group.position.y + 0.76 + Math.sin(worldTime * (speed > 0.35 ? 13.0 : 2.2)) * (speed > 0.35 ? 0.035 : 0.008),
        horseEnt.group.position.z
      );
      playerAvatarRoot.rotation.y = rigYaw;
    } else {
      playerAvatarRoot.position.set(
        playerRig.position.x,
        playerRig.position.y,
        playerRig.position.z
      );
      playerAvatarRoot.rotation.y = rigYaw;
    }

    // Oppdater Idle / Walk / Run-animasjon på karakteren FØRST, og legg deretter på sikte-arm og ev. sal-ben!
    if (avatarAnim && avatarAnim.mixer) {
      const targetState = riding
        ? 'idle'
        : (speed > 5.2 ? 'run' : (speed > 0.25 ? 'walk' : 'idle'));
      if (avatarAnim.state !== targetState) {
        const prevAct =
          avatarAnim.state === 'run' ? avatarAnim.runAction :
          (avatarAnim.state === 'walk' ? avatarAnim.walkAction : avatarAnim.idleAction);
        const nextAct =
          targetState === 'run' ? (avatarAnim.runAction || avatarAnim.walkAction || avatarAnim.idleAction) :
          (targetState === 'walk' ? (avatarAnim.walkAction || avatarAnim.idleAction) : avatarAnim.idleAction);
        if (nextAct && prevAct && nextAct !== prevAct) {
          nextAct.reset().fadeIn(0.16).play();
          prevAct.fadeOut(0.16);
        } else if (nextAct) {
          nextAct.play();
        }
        avatarAnim.state = targetState;
      }
      avatarAnim.mixer.update(dt * (targetState === 'run' ? 1.22 : 1.0));
    }

    if (tpArmRecoilKick > 0) {
      tpArmRecoilKick = Math.max(0, tpArmRecoilKick - dt * 4.5);
    }

    tmpCharRightAxis.set(Math.cos(rigYaw), 0, -Math.sin(rigYaw));
    tmpCharFwdAxis.set(-Math.sin(rigYaw), 0, -Math.cos(rigYaw));

    // Løft høyre våpenarm frem mot siktet slik at revolver, hagle, rifle og armbrøst alltid holdes klart fremover!
    if (upperArmRBone) {
      const aimLift = 0.88 + pitch * 0.68 + tpArmRecoilKick;
      rotateBoneInWorldSpace(upperArmRBone, tmpCharRightAxis, aimLift);
    }

    // Naturlig rytter-positur i salen når man rir på Mustang-hesten!
    if (riding) {
      if (thighLBone) {
        rotateBoneInWorldSpace(thighLBone, tmpCharRightAxis, 0.78);
        rotateBoneInWorldSpace(thighLBone, tmpCharFwdAxis, -0.32);
      }
      if (thighRBone) {
        rotateBoneInWorldSpace(thighRBone, tmpCharRightAxis, 0.78);
        rotateBoneInWorldSpace(thighRBone, tmpCharFwdAxis, 0.32);
      }
      if (calfLBone) rotateBoneInWorldSpace(calfLBone, tmpCharRightAxis, -0.68);
      if (calfRBone) rotateBoneInWorldSpace(calfRBone, tmpCharRightAxis, -0.68);
    }

    if (!handRBone) {
      tpWeaponPivot.position.y = riding ? 1.06 : 1.18;
      tpWeaponPivot.rotation.x = pitch * 0.55;
    }
    const activeTpWep = tpWeapons[getActiveWeaponId()];
    if (activeTpWep) {
      updateWeaponViewFX(activeTpWep, dt);
    }

    // Skulder-kamera (Over-the-shoulder 3rd-person orbit med automatisk vegg- og bakke-antikollisjon!)
    const pivotLocalX = 0.46;
    const pivotLocalY = riding ? 1.76 : 1.66;
    const desiredBoom = riding ? 3.85 : 3.05;

    const cosY = Math.cos(rigYaw);
    const sinY = Math.sin(rigYaw);
    const sinP = Math.sin(pitch);
    const cosP = Math.cos(pitch);

    let safeBoom = desiredBoom;
    for (let s = 1; s <= 8; s++) {
      const testD = desiredBoom * (s / 8);
      const lx = pivotLocalX;
      const ly = pivotLocalY - sinP * testD;
      const lz = cosP * testD;

      const wx = playerRig.position.x + lx * cosY + lz * sinY;
      const wy = playerRig.position.y + ly;
      const wz = playerRig.position.z - lx * sinY + lz * cosY;

      const minGround = getTerrainHeight(wx, wz, playerRig.position.y) + 0.26;
      if (wy < minGround || pointHitsSolidWall(wx, wy, wz)) {
        safeBoom = Math.max(0.58, desiredBoom * ((s - 1) / 8) - 0.12);
        break;
      }
    }

    if (safeBoom < currentBoomDist) {
      currentBoomDist = safeBoom;
    } else {
      currentBoomDist += (safeBoom - currentBoomDist) * Math.min(1, dt * 8.5);
    }

    camera.position.set(
      pivotLocalX,
      pivotLocalY - sinP * currentBoomDist,
      cosP * currentBoomDist
    );
    camera.rotation.set(pitch, 0, 0);
  }

  // Presis sikte- og munningsberegning når man skyter i 3.-person!
  const tpAimCamPos = new THREE.Vector3();
  const tpAimCamDir = new THREE.Vector3();
  const tpRayStart = new THREE.Vector3();
  const tpRayEnd = new THREE.Vector3();

  function getThirdPersonShotOriginAndDir(outOrigin, outDir) {
    playerAvatarRoot.updateMatrixWorld(true);
    const wId = getActiveWeaponId();
    const wep = tpWeapons[wId];
    tpArmRecoilKick = wId === 'shotgun' ? 0.24 : 0.14;
    if (wep && wep.userData && wep.userData.muzzle) {
      wep.userData.muzzle.getWorldPosition(outOrigin);
      triggerWeaponKick(wep, wId === 'shotgun' ? 12.0 : 7.0, wId === 'dynamite' ? 0 : 20);
    } else {
      outOrigin.set(playerRig.position.x, playerRig.position.y + 1.35, playerRig.position.z);
    }

    camera.getWorldPosition(tpAimCamPos);
    camera.getWorldDirection(tpAimCamDir);

    // Start treffsøk rett foran spilleren slik at kameraet aldri låser på noe bak skulderen
    tpRayStart.copy(tpAimCamPos).addScaledVector(tpAimCamDir, Math.max(0.4, currentBoomDist + 0.25));
    tpRayEnd.copy(tpAimCamPos).addScaledVector(tpAimCamDir, 65.0);

    const hit = findCombatHit ? findCombatHit(tpRayStart, tpRayEnd) : null;
    if (hit && hit.point) {
      outDir.copy(hit.point).sub(outOrigin).normalize();
    } else {
      tpRayEnd.copy(tpAimCamPos).addScaledVector(tpAimCamDir, 26.0);
      outDir.copy(tpRayEnd).sub(outOrigin).normalize();
    }
  }

  // ==========================================================================
  // 3. FELLES KJØPSLOGIKK FOR ARMOR / KLÆR, VÅPEN OG STRIPE-GULLPAKKER
  // ==========================================================================
  function recomputePlayerMaxHealth() {
    const tier = getOutfitTier();
    const armorBonus = getArmorDefByTier(tier).bonusMaxHp || 0;
    const padBonus = getArmorPaddingRanks() * 20;
    const ranchBonus = (ctx.getTrailblazerRank ? ctx.getTrailblazerRank() : 0) * 10;
    const newBaseMax = Math.min(500, 100 + armorBonus + padBonus + ranchBonus);
    const prevMax = playerState.maxHealth || 100;
    playerState.maxHealth = Math.max(prevMax, newBaseMax);
    if (playerState.health > playerState.maxHealth) {
      playerState.health = playerState.maxHealth;
    }
  }

  function buyOrEquipArmorTier(targetTier, allowPeltPayment = false) {
    const def = getArmorDefByTier(targetTier);
    const ownedTier = getOutfitTier();
    const isNo = getLang() === 'no';
    const itemName = isNo ? def.noName : def.enName;

    // Hvis spilleren allerede har låst opp dette eller høyere tier, la dem fritt bytte utseende (Transmog) uten å miste beskyttelse!
    if (targetTier <= ownedTier) {
      setVisualOutfitTier(targetTier);
      syncAvatarAppearance();
      saveCareerProgress();
      updateStatusUI();
      if (audio && audio.playQuestSelectSound) audio.playQuestSelectSound();
      showFrontierToast(SL().switchedArmorToast(itemName), 3.8);
      if (storeModalOpen) renderStoreModal();
      return { ok: true, mode: 'equipped' };
    }

    let paidWithPelts = false;
    if (playerState.gold >= def.goldCost) {
      playerState.gold -= def.goldCost;
    } else if (allowPeltPayment && def.peltAltCost > 0 && playerState.pelt >= def.peltAltCost) {
      playerState.pelt -= def.peltAltCost;
      paidWithPelts = true;
    } else {
      if (audio && audio.playShopDenySound) audio.playShopDenySound();
      return { ok: false, reason: 'no_gold' };
    }

    setOutfitStats(def.tier, def.damageMultiplier, def.nightMonsterDamage);
    setVisualOutfitTier(def.tier);
    recomputePlayerMaxHealth();
    playerState.health = playerState.maxHealth;
    storyState.boughtGear = true;
    if (def.tier >= 3) storyState.hasVampireGear = true;
    if (def.tier >= 4) storyState.masterUpgradeBought = true;

    syncAvatarAppearance();
    checkStoryProgression();
    saveCareerProgress();
    updateStatusUI();
    if (spawnSparkBurst) spawnSparkBurst(playerRig.position, 20, 0xffe066, 1.4);
    if (audio && audio.playUpgradeSound) audio.playUpgradeSound();
    showFrontierToast(SL().boughtArmorToast(itemName, def.armorPct, playerState.maxHealth), 4.8);
    if (storeModalOpen) renderStoreModal();
    return { ok: true, mode: 'bought', paidWithPelts };
  }

  function getPaddingUpgradeCost() {
    return 95 + getArmorPaddingRanks() * 35;
  }

  function buyArmorPaddingUpgrade() {
    if (playerState.maxHealth >= 500) {
      if (audio && audio.playShopDenySound) audio.playShopDenySound();
      return false;
    }
    const cost = getPaddingUpgradeCost();
    if (playerState.gold < cost) {
      if (audio && audio.playShopDenySound) audio.playShopDenySound();
      return false;
    }
    playerState.gold -= cost;
    setArmorPaddingRanks(getArmorPaddingRanks() + 1);
    playerState.maxHealth = Math.min(500, playerState.maxHealth + 20);
    playerState.health = playerState.maxHealth;
    storyState.boughtGear = true;
    storyState.masterUpgradeBought = true;
    checkStoryProgression();
    saveCareerProgress();
    updateStatusUI();
    if (audio && audio.playUpgradeSound) audio.playUpgradeSound();
    if (storeModalOpen) renderStoreModal();
    return true;
  }

  function buyStoreWeaponItem(item) {
    if (!item) return false;
    const isNo = getLang() === 'no';
    const name = isNo ? item.noName : item.enName;

    if (item.kind === 'weapon') {
      if (unlockedWeapons[item.weaponId]) {
        equipWeapon(item.weaponId);
        syncAvatarAppearance();
        if (storeModalOpen) renderStoreModal();
        return true;
      }
      if (playerState.gold < item.goldCost) {
        if (audio && audio.playShopDenySound) audio.playShopDenySound();
        return false;
      }
      playerState.gold -= item.goldCost;
      unlockedWeapons[item.weaponId] = true;
      storyState.boughtGear = true;
      if (item.weaponId === 'crossbow') storyState.hasVampireGear = true;
      if (item.weaponId === 'hellfire') {
        storyState.hellfireCollected = true;
        storyState.hasVampireGear = true;
      }
      equipWeapon(item.weaponId, true);
      syncAvatarAppearance();
      checkStoryProgression();
      saveCareerProgress();
      updateStatusUI();
      if (audio && audio.playUpgradeSound) audio.playUpgradeSound();
      showFrontierToast(SL().boughtWeaponToast(name), 4.5);
      if (storeModalOpen) renderStoreModal();
      return true;
    }

    if (item.kind === 'gold_revolver') {
      if (getHasGoldenRevolver()) {
        equipWeapon('revolver');
        syncAvatarAppearance();
        if (storeModalOpen) renderStoreModal();
        return true;
      }
      if (playerState.gold < item.goldCost) {
        if (audio && audio.playShopDenySound) audio.playShopDenySound();
        return false;
      }
      playerState.gold -= item.goldCost;
      grantGoldenRevolver();
      storyState.boughtGear = true;
      equipWeapon('revolver', true);
      syncAvatarAppearance();
      checkStoryProgression();
      saveCareerProgress();
      updateStatusUI();
      if (audio && audio.playUpgradeSound) audio.playUpgradeSound();
      showFrontierToast(SL().boughtWeaponToast(name), 4.5);
      if (storeModalOpen) renderStoreModal();
      return true;
    }

    if (item.kind === 'dynamite') {
      if (playerState.gold < item.goldCost) {
        if (audio && audio.playShopDenySound) audio.playShopDenySound();
        return false;
      }
      playerState.gold -= item.goldCost;
      playerState.dynamite += item.amount;
      storyState.boughtGear = true;
      checkStoryProgression();
      saveCareerProgress();
      updateStatusUI();
      if (audio && audio.playUpgradeSound) audio.playUpgradeSound();
      showFrontierToast(SL().boughtWeaponToast(name), 3.8);
      if (storeModalOpen) renderStoreModal();
      return true;
    }

    if (item.kind === 'rations') {
      if (playerState.gold < item.goldCost) {
        if (audio && audio.playShopDenySound) audio.playShopDenySound();
        return false;
      }
      playerState.gold -= item.goldCost;
      playerState.food += item.amount;
      playerState.health = playerState.maxHealth;
      saveCareerProgress();
      updateStatusUI();
      if (audio && audio.playHealSound) audio.playHealSound();
      showFrontierToast(SL().boughtWeaponToast(name), 3.8);
      if (storeModalOpen) renderStoreModal();
      return true;
    }

    if (item.kind === 'mastery') {
      const rank = getWeaponMasteryRank();
      if (rank >= 40) {
        if (audio && audio.playShopDenySound) audio.playShopDenySound();
        return false;
      }
      const mCost = 90 + rank * 45;
      if (playerState.gold < mCost) {
        if (audio && audio.playShopDenySound) audio.playShopDenySound();
        return false;
      }
      playerState.gold -= mCost;
      incrementWeaponMasteryRank();
      storyState.masterUpgradeBought = true;
      checkStoryProgression();
      saveCareerProgress();
      updateStatusUI();
      if (audio && audio.playUpgradeSound) audio.playUpgradeSound();
      showFrontierToast(SL().boughtWeaponToast(`${name} (Lv.${rank + 1})`), 4.2);
      if (storeModalOpen) renderStoreModal();
      return true;
    }

    return false;
  }

  // ==========================================================================
  // 4. STRIPE CHECKOUT REDIRECT & IDEMPOTENT GULL-UTBETALING
  // ==========================================================================
  let stripeInlineFeedback = '';

  function resolveStripePackUrl(pack) {
    const customMap = window.__WVR_STRIPE_LINKS;
    if (customMap && typeof customMap[pack.id] === 'string' && customMap[pack.id].startsWith('https://')) {
      return customMap[pack.id];
    }
    if (pack.paymentLinkUrl && pack.paymentLinkUrl.startsWith('https://')) {
      return pack.paymentLinkUrl;
    }
    return '';
  }

  function startStripeGoldCheckout(pack) {
    const baseUrl = resolveStripePackUrl(pack);
    if (!baseUrl) {
      stripeInlineFeedback = SL().stripePendingSetupMsg;
      if (audio && audio.playQuestSelectSound) audio.playQuestSelectSound();
      renderStoreModal();
      return false;
    }

    const nonce = `wvr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    try {
      localStorage.setItem(
        PENDING_STRIPE_KEY,
        JSON.stringify({
          packId: pack.id,
          nonce,
          createdAt: Date.now()
        })
      );
    } catch (_) {}
    saveCareerProgress();

    const sep = baseUrl.includes('?') ? '&' : '?';
    const targetUrl = `${baseUrl}${sep}client_reference_id=${encodeURIComponent(nonce)}`;
    window.location.assign(targetUrl);
    return true;
  }

  function checkStripeReturnFulfillment() {
    try {
      const params = new URLSearchParams(window.location.search);
      const packId = params.get('stripe_gold');
      if (!packId) return;

      const sessionId = params.get('session_id') || '';
      const pack = STRIPE_GOLD_PACKS.find((p) => p.id === packId);

      // Rens URL-parametrene med én gang så F5 aldri trigger på nytt
      const cleanUrl = `${window.location.pathname}${window.location.hash || ''}`;
      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, document.title, cleanUrl);
      }

      if (!pack) return;

      // Idempotens- og øktsjekk: enten gyldig ny Stripe session_id + aktiv ventende bestilling i nettleseren
      const rawPending = localStorage.getItem(PENDING_STRIPE_KEY);
      if (!rawPending) return;
      const pending = JSON.parse(rawPending);
      if (!pending || pending.packId !== pack.id) return;
      const ageMs = Date.now() - Number(pending.createdAt || 0);
      if (ageMs < 0 || ageMs > 2 * 60 * 60 * 1000) return;

      const redeemKey = sessionId ? `cs_${sessionId}` : `nonce_${pending.nonce}`;
      const redeemed = getRedeemedStripeSessions();
      if (redeemed.includes(redeemKey)) return;

      localStorage.removeItem(PENDING_STRIPE_KEY);
      addRedeemedStripeSession(redeemKey);

      playerState.gold += pack.gold;
      saveCareerProgress();
      updateStatusUI();

      setTimeout(() => {
        if (spawnSparkBurst) spawnSparkBurst(playerRig.position, 32, 0xffe055, 1.85);
        if (audio && audio.playQuestFanfare) audio.playQuestFanfare();
        const pName = getLang() === 'no' ? pack.noName : pack.enName;
        const msg = SL().stripeSuccessToast(pack.gold, pName);
        stripeInlineFeedback = msg;
        showFrontierToast(msg, 7.5);
        toggleStoreModal(true, 'gold');
      }, 350);
    } catch (_) {
      // Ignorer korrupt URL/storage
    }
  }

  // ==========================================================================
  // 5. FULL BUTIKK- OG GULLBANK-MODAL (#store-modal, [B])
  // ==========================================================================
  const storeModalEl = document.getElementById('store-modal');
  const storeOpenBtnEl = document.getElementById('store-open-btn');
  const storeCloseBtnEl = document.getElementById('store-close-btn');
  const storePreviewViewBtnEl = document.getElementById('store-preview-view-btn');
  const storeTabArmorBtnEl = document.getElementById('store-tab-armor');
  const storeTabWeaponsBtnEl = document.getElementById('store-tab-weapons');
  const storeTabGoldBtnEl = document.getElementById('store-tab-gold');
  const storeGridEl = document.getElementById('store-items-grid');
  const storeStatusBannerEl = document.getElementById('store-status-banner');

  let storeModalOpen = false;
  let activeStoreTab = 'armor'; // 'armor' | 'weapons' | 'gold'

  function toggleStoreModal(forceState, tabOverride = '') {
    if (!storeModalEl) return;
    storeModalOpen = typeof forceState === 'boolean' ? forceState : !storeModalEl.classList.contains('open');
    if (tabOverride) activeStoreTab = tabOverride;
    storeModalEl.classList.toggle('open', storeModalOpen);
    if (storeModalOpen) {
      if (document.pointerLockElement && document.exitPointerLock) {
        document.exitPointerLock();
      }
      renderStoreModal();
    }
  }

  function renderStoreModal() {
    if (!storeModalEl || !storeGridEl) return;
    const s = SL();
    const isNo = getLang() === 'no';

    const titleEl = document.getElementById('store-modal-title');
    if (titleEl) titleEl.textContent = s.modalTitle;
    if (storeCloseBtnEl) storeCloseBtnEl.textContent = s.closeBtn;
    if (storePreviewViewBtnEl) {
      storePreviewViewBtnEl.textContent = controlSettings.viewMode === 'third' ? s.preview1stBtn : s.preview3rdBtn;
    }

    const statsBarEl = document.getElementById('store-stats-bar');
    if (statsBarEl) {
      const curArmor = getArmorDefByTier(getOutfitTier());
      statsBarEl.innerHTML =
        `<span class="store-stat-pill gold">💰 ${s.statGold}: <strong>${playerState.gold}</strong></span>` +
        `<span class="store-stat-pill">🛡️ ${s.statArmor}: <strong>${curArmor.armorPct}%</strong></span>` +
        `<span class="store-stat-pill">❤️ ${s.statHp}: <strong>${playerState.health}/${playerState.maxHealth}</strong></span>` +
        `<span class="store-stat-pill">🔫 ${s.statWeapon}: <strong>${playerState.weapon}</strong></span>`;
    }

    const noteEl = document.getElementById('store-earn-note');
    if (noteEl) noteEl.textContent = s.earnNote;

    if (storeTabArmorBtnEl) {
      storeTabArmorBtnEl.textContent = s.tabArmor;
      storeTabArmorBtnEl.classList.toggle('active', activeStoreTab === 'armor');
    }
    if (storeTabWeaponsBtnEl) {
      storeTabWeaponsBtnEl.textContent = s.tabWeapons;
      storeTabWeaponsBtnEl.classList.toggle('active', activeStoreTab === 'weapons');
    }
    if (storeTabGoldBtnEl) {
      storeTabGoldBtnEl.textContent = s.tabGold;
      storeTabGoldBtnEl.classList.toggle('active', activeStoreTab === 'gold');
    }

    if (storeStatusBannerEl) {
      if (stripeInlineFeedback) {
        const isWarn = stripeInlineFeedback.startsWith('⚠️');
        storeStatusBannerEl.style.display = 'block';
        storeStatusBannerEl.style.background = isWarn ? 'rgba(108, 36, 20, 0.96)' : 'rgba(32, 74, 42, 0.96)';
        storeStatusBannerEl.style.borderColor = isWarn ? '#ffaa78' : '#8ef79e';
        storeStatusBannerEl.textContent = stripeInlineFeedback;
      } else {
        storeStatusBannerEl.style.display = 'none';
      }
    }

    storeGridEl.innerHTML = '';

    if (activeStoreTab === 'armor') {
      const ownedTier = getOutfitTier();
      const visTier = getVisualOutfitTier();

      for (let i = 1; i < ARMOR_CATALOG.length; i++) {
        const def = ARMOR_CATALOG[i];
        const isOwned = ownedTier >= def.tier;
        const isVisEquipped = visTier === def.tier;
        const canAfford = playerState.gold >= def.goldCost;

        const card = document.createElement('div');
        card.className = `store-item-card${isVisEquipped ? ' equipped' : ''}`;
        const name = isNo ? def.noName : def.enName;
        const desc = isNo ? def.noDesc : def.enDesc;

        const top = document.createElement('div');
        top.innerHTML =
          `<div class="store-item-hdr">` +
          `<span class="store-item-title">${def.icon} ${name}</span>` +
          `<span class="store-item-badge">-${def.armorPct}% Dmg • +${def.bonusMaxHp} HP</span>` +
          `</div>` +
          `<div class="store-item-desc">${desc}</div>`;

        const btn = document.createElement('button');
        btn.type = 'button';
        if (isVisEquipped && isOwned) {
          btn.className = 'wow-gold-btn turnin disabled';
          btn.textContent = s.equippedBadge;
        } else if (isOwned) {
          btn.className = 'sens-mini-btn';
          btn.textContent = s.equipBtn;
          btn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            buyOrEquipArmorTier(def.tier, false);
          });
        } else if (canAfford) {
          btn.className = 'wow-gold-btn';
          btn.textContent = s.buyForGold(def.goldCost);
          btn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            stripeInlineFeedback = `✓ ${s.boughtArmorToast(name, def.armorPct, (playerState.maxHealth || 100) + def.bonusMaxHp)}`;
            buyOrEquipArmorTier(def.tier, false);
          });
        } else {
          btn.className = 'sens-mini-btn';
          btn.style.borderColor = '#ffaa6e';
          btn.textContent = s.needGold(def.goldCost);
          btn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            if (audio && audio.playShopDenySound) audio.playShopDenySound();
            stripeInlineFeedback = s.notEnoughGoldBanner(playerState.gold, def.goldCost, name);
            renderStoreModal();
          });
        }

        card.appendChild(top);
        card.appendChild(btn);
        storeGridEl.appendChild(card);
      }

      // Repeterbart Panserfôr (+20 Maks HP opp til 500 HP)
      const padCost = getPaddingUpgradeCost();
      const padMaxed = playerState.maxHealth >= 500;
      const padCard = document.createElement('div');
      padCard.className = 'store-item-card';
      padCard.innerHTML =
        `<div class="store-item-hdr">` +
        `<span class="store-item-title">❤️ ${s.paddingTitle}</span>` +
        `<span class="store-item-badge">+20 Max HP</span>` +
        `</div>` +
        `<div class="store-item-desc">${s.paddingDesc(playerState.maxHealth, 500)}</div>`;
      const padBtn = document.createElement('button');
      padBtn.type = 'button';
      if (padMaxed) {
        padBtn.className = 'wow-gold-btn turnin disabled';
        padBtn.textContent = s.paddingMaxed;
      } else if (playerState.gold >= padCost) {
        padBtn.className = 'wow-gold-btn';
        padBtn.textContent = s.buyForGold(padCost);
        padBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          stripeInlineFeedback = `✓ +20 Max HP!`;
          buyArmorPaddingUpgrade();
        });
      } else {
        padBtn.className = 'sens-mini-btn';
        padBtn.style.borderColor = '#ffaa6e';
        padBtn.textContent = s.needGold(padCost);
        padBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          if (audio && audio.playShopDenySound) audio.playShopDenySound();
          stripeInlineFeedback = s.notEnoughGoldBanner(playerState.gold, padCost, s.paddingTitle);
          renderStoreModal();
        });
      }
      padCard.appendChild(padBtn);
      storeGridEl.appendChild(padCard);
      return;
    }

    if (activeStoreTab === 'weapons') {
      WEAPON_SHOP_CATALOG.forEach((item) => {
        const name = isNo ? item.noName : item.enName;
        const desc = isNo ? item.noDesc : item.enDesc;
        const mRank = getWeaponMasteryRank();
        const cost = item.kind === 'mastery' ? (90 + mRank * 45) : item.goldCost;

        const isOwnedWeapon =
          (item.kind === 'weapon' && !!unlockedWeapons[item.weaponId]) ||
          (item.kind === 'gold_revolver' && getHasGoldenRevolver());
        const isEquippedWeapon =
          isOwnedWeapon && getActiveWeaponId() === item.weaponId;
        const isMaxMastery = item.kind === 'mastery' && mRank >= 40;

        const card = document.createElement('div');
        card.className = `store-item-card${isEquippedWeapon ? ' equipped' : ''}`;
        const badgeTxt = item.kind === 'mastery'
          ? `Lv.${mRank}/40 (+${mRank * 20}%)`
          : (isOwnedWeapon ? s.unlockedBadge : `${cost} 💰`);

        card.innerHTML =
          `<div class="store-item-hdr">` +
          `<span class="store-item-title">${item.icon} ${name}</span>` +
          `<span class="store-item-badge">${badgeTxt}</span>` +
          `</div>` +
          `<div class="store-item-desc">${desc}</div>`;

        const btn = document.createElement('button');
        btn.type = 'button';
        if (isEquippedWeapon || isMaxMastery) {
          btn.className = 'wow-gold-btn turnin disabled';
          btn.textContent = s.equippedBadge;
        } else if (isOwnedWeapon) {
          btn.className = 'sens-mini-btn';
          btn.textContent = isNo ? 'Utstyr våpen' : 'Equip Weapon';
          btn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            buyStoreWeaponItem(item);
          });
        } else if (playerState.gold >= cost) {
          btn.className = 'wow-gold-btn';
          btn.textContent = s.buyForGold(cost);
          btn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            stripeInlineFeedback = `✓ ${s.boughtWeaponToast(name)}`;
            buyStoreWeaponItem(item);
          });
        } else {
          btn.className = 'sens-mini-btn';
          btn.style.borderColor = '#ffaa6e';
          btn.textContent = s.needGold(cost);
          btn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            if (audio && audio.playShopDenySound) audio.playShopDenySound();
            stripeInlineFeedback = s.notEnoughGoldBanner(playerState.gold, cost, name);
            renderStoreModal();
          });
        }
        card.appendChild(btn);
        storeGridEl.appendChild(card);
      });
      return;
    }

    // Tab 3: Kjøp Spillpenger (Gull) med Stripe!
    const introCard = document.createElement('div');
    introCard.className = 'store-stripe-hero';
    introCard.style.gridColumn = '1 / -1';
    introCard.innerHTML =
      `<div style="font-size:15px;font-weight:bold;color:#ffe28a;margin-bottom:4px">${s.stripeBannerTitle}</div>` +
      `<div style="font-size:12.5px;color:#f5e6cc;line-height:1.45">${s.stripeBannerSub}</div>`;
    storeGridEl.appendChild(introCard);

    STRIPE_GOLD_PACKS.forEach((pack) => {
      const card = document.createElement('div');
      card.className = `store-item-card stripe-pack${pack.popular ? ' equipped' : ''}`;
      const pName = isNo ? pack.noName : pack.enName;
      const pDesc = isNo ? pack.noDesc : pack.enDesc;
      const bTag = isNo ? pack.bonusTagNo : pack.bonusTagEn;

      card.innerHTML =
        `<div class="store-item-hdr">` +
        `<span class="store-item-title">${pack.icon} ${pName}</span>` +
        `<span class="store-item-badge">${bTag}</span>` +
        `</div>` +
        `<div class="store-item-desc">${pDesc}</div>`;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'wow-gold-btn stripe-checkout-btn';
      btn.dataset.packId = pack.id;
      btn.textContent = s.stripeBuyBtn(pack.priceNok, pack.priceUsd);
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        startStripeGoldCheckout(pack);
      });

      card.appendChild(btn);
      storeGridEl.appendChild(card);
    });
  }

  if (storeOpenBtnEl) {
    storeOpenBtnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      stripeInlineFeedback = '';
      toggleStoreModal();
    });
  }
  if (storeCloseBtnEl) {
    storeCloseBtnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleStoreModal(false);
    });
  }
  if (storePreviewViewBtnEl) {
    storePreviewViewBtnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleViewMode();
    });
  }
  if (storeTabArmorBtnEl) {
    storeTabArmorBtnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      stripeInlineFeedback = '';
      activeStoreTab = 'armor';
      renderStoreModal();
    });
  }
  if (storeTabWeaponsBtnEl) {
    storeTabWeaponsBtnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      stripeInlineFeedback = '';
      activeStoreTab = 'weapons';
      renderStoreModal();
    });
  }
  if (storeTabGoldBtnEl) {
    storeTabGoldBtnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      stripeInlineFeedback = '';
      activeStoreTab = 'gold';
      renderStoreModal();
    });
  }
  if (storeModalEl) {
    storeModalEl.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (e.target === storeModalEl) toggleStoreModal(false);
    });
  }

  const shopProximityBtnEl = document.getElementById('shop-proximity-btn');
  let currentNearbyShopTab = '';

  if (shopProximityBtnEl) {
    shopProximityBtnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      stripeInlineFeedback = '';
      toggleStoreModal(true, currentNearbyShopTab || 'armor');
    });
  }

  function updateNearbyShopPrompt(nearTailor, nearGunsmith) {
    if (!shopProximityBtnEl) return;
    if (renderer.xr.isPresenting || storeModalOpen) {
      shopProximityBtnEl.style.display = 'none';
      currentNearbyShopTab = '';
      return;
    }
    const s = SL();
    if (nearTailor) {
      currentNearbyShopTab = 'armor';
      shopProximityBtnEl.textContent = s.proxTailorBtn;
      shopProximityBtnEl.style.display = 'block';
    } else if (nearGunsmith) {
      currentNearbyShopTab = 'weapons';
      shopProximityBtnEl.textContent = s.proxGunsmithBtn;
      shopProximityBtnEl.style.display = 'block';
    } else {
      currentNearbyShopTab = '';
      shopProximityBtnEl.style.display = 'none';
    }
  }

  // Init ved oppstart
  applyCameraAndWeaponVisibility();
  checkStripeReturnFulfillment();

  return {
    isThirdPersonActive,
    setViewMode,
    toggleViewMode,
    applyCameraAndWeaponVisibility,
    syncViewButtonsUI,
    syncAvatarAppearance,
    updateThirdPersonCameraAndAvatar,
    updateNearbyShopPrompt,
    getNearbyShopTab: () => currentNearbyShopTab,
    getThirdPersonShotOriginAndDir,
    buyOrEquipArmorTier,
    buyArmorPaddingUpgrade,
    buyStoreWeaponItem,
    toggleStoreModal,
    isStoreModalOpen: () => storeModalOpen,
    renderStoreModal,
    playerAvatarRoot
  };
}
