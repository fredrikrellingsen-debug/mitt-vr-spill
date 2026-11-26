import * as THREE from 'three';
import { createSeededRng } from './textures.js';
import { drawRoundedRect } from './i18n.js';

// ============================================================================
// FRONTIER EXPANSION: 4 NYE BYER MED FRISTEDER, VEDSANKING & LEIRBÅL SOM
// HOLDER MONSTRE BORTE, MONSTER-EVOLUSJON, 4 NYE DYREARTER OG 4 NYE MONSTRE
// ============================================================================

export const WOOD_PER_CAMPFIRE = 3;
export const CAMPFIRE_BASE_DURATION = 120;
export const CAMPFIRE_MAX_DURATION = 180;
export const CAMPFIRE_SAFE_RADIUS = 9.5;
export const CAMPFIRE_REPEL_RADIUS = 11.2;

export const OUTER_TOWNS = [
  {
    id: 'silver_creek',
    x: -275,
    z: -285,
    y: 2.60,
    travelX: -275,
    travelZ: -266,
    travelYaw: 0,
    shopTab: 'armor',
    theme: 'timber',
    enName: 'SILVER CREEK',
    noName: 'SILVER CREEK',
    enSub: 'TIMBER TOWN & SAFE HAVEN',
    noSub: 'TØMMERBY & TRYGT FRISTED',
    enShopTitle: 'TRAPPERS OUTFITTER',
    noShopTitle: 'PELSJEGER-BUTIKK',
    enShopSub: 'Armor, Clothes & Gold [Click / B]',
    noShopSub: 'Rustning, Klær & Gull [Klikk / B]',
    enSafeTitle: '🛡 SAFE HAVEN LODGE',
    noSafeTitle: '🛡 FRISTED — TØMMERHYTTE',
    enSafeSub: 'Monsters Cannot Enter!',
    noSafeSub: 'Monstre slipper aldri inn!',
    enTravelLabel: '↖ Silver Creek Town (Safe Haven)',
    noTravelLabel: '↖ Silver Creek By (Fristed & Butikk)'
  },
  {
    id: 'copper_mesa',
    x: 290,
    z: -265,
    y: 1.85,
    travelX: 290,
    travelZ: -246,
    travelYaw: 0,
    shopTab: 'weapons',
    theme: 'canyon',
    enName: 'COPPER MESA',
    noName: 'COPPER MESA',
    enSub: 'CANYON TOWN & SAFE HAVEN',
    noSub: 'KLØFTEBY & TRYGT FRISTED',
    enShopTitle: 'MESA GUNSMITH & BANK',
    noShopTitle: 'MESA VÅPENSMED & BANK',
    enShopSub: 'Weapons, Upgrades & Gold [Click / B]',
    noShopSub: 'Våpen, Oppgradering & Gull [Klikk / B]',
    enSafeTitle: '🛡 SAFE HAVEN FORT',
    noSafeTitle: '🛡 FRISTED — STEINFORT',
    enSafeSub: 'Monsters Cannot Enter!',
    noSafeSub: 'Monstre slipper aldri inn!',
    enTravelLabel: '↗ Copper Mesa Town (Safe Haven)',
    noTravelLabel: '↗ Copper Mesa By (Fristed & Våpen)'
  },
  {
    id: 'sanctuary_springs',
    x: -280,
    z: 285,
    y: 0.45,
    travelX: -280,
    travelZ: 266,
    travelYaw: Math.PI,
    shopTab: 'armor',
    theme: 'oasis',
    enName: 'SANCTUARY SPRINGS',
    noName: 'SANCTUARY SPRINGS',
    enSub: 'OASIS TOWN & SAFE HAVEN',
    noSub: 'OASEBY & TRYGT FRISTED',
    enShopTitle: 'OASIS BAZAAR & TAILOR',
    noShopTitle: 'OASE-HANDELSHUS',
    enShopSub: 'Armor, Supplies & Gold [Click / B]',
    noShopSub: 'Klær, Forsyninger & Gull [Klikk / B]',
    enSafeTitle: '🛡 SAFE HAVEN CHAPEL',
    noSafeTitle: '🛡 FRISTED — OASEKAPELL',
    enSafeSub: 'Monsters Cannot Enter!',
    noSafeSub: 'Monstre slipper aldri inn!',
    enTravelLabel: '↙ Sanctuary Springs (Safe Haven)',
    noTravelLabel: '↙ Sanctuary Springs (Fristed & Oase)'
  },
  {
    id: 'ironwood_crossing',
    x: 285,
    z: 280,
    y: 1.10,
    travelX: 285,
    travelZ: 261,
    travelYaw: Math.PI,
    shopTab: 'weapons',
    theme: 'outpost',
    enName: 'IRONWOOD CROSSING',
    noName: 'IRONWOOD CROSSING',
    enSub: 'FRONTIER DEPOT & SAFE HAVEN',
    noSub: 'UTPOSTBY & TRYGT FRISTED',
    enShopTitle: 'IRONWOOD ARMORY',
    noShopTitle: 'IRONWOOD VÅPENDEPOT',
    enShopSub: 'Heavy Weapons & Gold [Click / B]',
    noShopSub: 'Tunge Våpen & Gull [Klikk / B]',
    enSafeTitle: '🛡 SAFE HAVEN BUNKER',
    noSafeTitle: '🛡 FRISTED — VAKTSTASJON',
    enSafeSub: 'Monsters Cannot Enter!',
    noSafeSub: 'Monstre slipper aldri inn!',
    enTravelLabel: '↘ Ironwood Crossing (Safe Haven)',
    noTravelLabel: '↘ Ironwood Crossing (Fristed & Depot)'
  },
  {
    id: 'frostpeak_citadel',
    x: -860,
    z: -880,
    y: 6.20,
    travelX: -860,
    travelZ: -861,
    travelYaw: 0,
    shopTab: 'armor',
    theme: 'timber',
    enName: 'FROSTPEAK CITADEL',
    noName: 'FROSTPEAK CITADEL',
    enSub: 'NORTHERN GLACIER FORTRESS & HAVEN',
    noSub: 'SNØFJELLSBY & TRYGT FRISTED',
    enShopTitle: 'FROSTPEAK FURS & ARMOR',
    noShopTitle: 'FROSTPEAK RUSTNINGSHUS',
    enShopSub: 'Heavy Pelts, Armor & Gold [Click / B]',
    noShopSub: 'Vinterrustning, Klær & Gull [Klikk / B]',
    enSafeTitle: '🛡 SAFE HAVEN GREAT HALL',
    noSafeTitle: '🛡 FRISTED — FJELLHALLEN',
    enSafeSub: 'Monsters Cannot Enter!',
    noSafeSub: 'Monstre slipper aldri inn!',
    enTravelLabel: '↖↖ Frostpeak Citadel (Far North 1.2km)',
    noTravelLabel: '↖↖ Frostpeak Citadel (Snøfjellsby 1,2 km)'
  },
  {
    id: 'sunfire_canyon',
    x: 890,
    z: -840,
    y: 3.85,
    travelX: 890,
    travelZ: -821,
    travelYaw: 0,
    shopTab: 'weapons',
    theme: 'canyon',
    enName: 'SUNFIRE CANYON CITY',
    noName: 'SUNFIRE KLØFTEBY',
    enSub: 'GOLDEN MESA CITADEL & SAFE HAVEN',
    noSub: 'SOLKLØFT-BY & TRYGT FRISTED',
    enShopTitle: 'SUNFIRE MASTER GUNSMITH',
    noShopTitle: 'SUNFIRE MESTERSMED',
    enShopSub: 'Legendary Weapons & Gold [Click / B]',
    noShopSub: 'Mestervåpen & Gull [Klikk / B]',
    enSafeTitle: '🛡 SAFE HAVEN CITADEL',
    noSafeTitle: '🛡 FRISTED — SOLBORG',
    enSafeSub: 'Monsters Cannot Enter!',
    noSafeSub: 'Monstre slipper aldri inn!',
    enTravelLabel: '↗↗ Sunfire Canyon City (Far NE 1.2km)',
    noTravelLabel: '↗↗ Sunfire Kløfteby (Solkløft 1,2 km)'
  },
  {
    id: 'emerald_mirage',
    x: -880,
    z: 870,
    y: 0.55,
    travelX: -880,
    travelZ: 851,
    travelYaw: Math.PI,
    shopTab: 'armor',
    theme: 'oasis',
    enName: 'EMERALD MIRAGE LAGOON',
    noName: 'SMARAGD-LAGUNEN',
    enSub: 'ENCHANTED OASIS & SAFE HAVEN',
    noSub: 'MAGISK OASEBY & TRYGT FRISTED',
    enShopTitle: 'EMERALD SILK & ARMOR BAZAAR',
    noShopTitle: 'SMARAGD-BASAREN',
    enShopSub: 'Exotic Gear & Gold [Click / B]',
    noShopSub: 'Rustning, Utstyr & Gull [Klikk / B]',
    enSafeTitle: '🛡 SAFE HAVEN SANCTUM',
    noSafeTitle: '🛡 FRISTED — HELLIGDOMMEN',
    enSafeSub: 'Monsters Cannot Enter!',
    noSafeSub: 'Monstre slipper aldri inn!',
    enTravelLabel: '↙↙ Emerald Mirage Lagoon (Far SW 1.2km)',
    noTravelLabel: '↙↙ Smaragd-Lagunen (Magisk Oase 1,2 km)'
  },
  {
    id: 'ashenforge_bastion',
    x: 875,
    z: 885,
    y: 2.85,
    travelX: 875,
    travelZ: 866,
    travelYaw: Math.PI,
    shopTab: 'weapons',
    theme: 'outpost',
    enName: 'ASHENFORGE BASTION',
    noName: 'ASHENFORGE BASTION',
    enSub: 'OBSIDIAN FORGE TOWN & SAFE HAVEN',
    noSub: 'OBSIDIAN-BY & TRYGT FRISTED',
    enShopTitle: 'ASHENFORGE WAR-ARMORY',
    noShopTitle: 'ASHENFORGE VÅPENSMIE',
    enShopSub: 'Heavy Artillery & Gold [Click / B]',
    noShopSub: 'Tunge Våpen & Gull [Klikk / B]',
    enSafeTitle: '🛡 SAFE HAVEN FORTRESS',
    noSafeTitle: '🛡 FRISTED — JERNBASTION',
    enSafeSub: 'Monsters Cannot Enter!',
    noSafeSub: 'Monstre slipper aldri inn!',
    enTravelLabel: '↘↘ Ashenforge Bastion (Far SE 1.2km)',
    noTravelLabel: '↘↘ Ashenforge Bastion (Vulkanby 1,2 km)'
  }
];

export function initFrontierExpansion(ctx) {
  const {
    scene,
    camera,
    playerRig,
    playerState,
    storyState,
    M,
    W,
    C,
    getLang,
    getTerrainHeight,
    addWorldWallCollider,
    resolveWallCollisions,
    pointHitsSolidWall,
    segmentPointDistance,
    awardScaledGold,
    recordQuestKill,
    checkStoryProgression,
    saveCareerProgress,
    updateStatusUI,
    showFrontierToast,
    spawnSparkBurst,
    spawnImpact,
    spawnVampireAshDissolution,
    damagePlayer,
    playerHeadPosition,
    playerChestPosition,
    updatePlayerBodyPoints,
    getWeaponDamage,
    getNightMonsterDamage,
    getExtraFoodBonus,
    getExtraPeltBonus,
    getPrestigeHpMult,
    getIsNight,
    getPlayerHiddenStatus,
    openStoreModal,
    entities,
    audio
  } = ctx;

  const expRoot = new THREE.Group();
  expRoot.name = 'FrontierExpansionRoot';
  scene.add(expRoot);

  const campfireBtnEl = document.getElementById('campfire-btn');
  const touchCampfireBtnEl = document.getElementById('btn-touch-campfire');

  // Pre-allokerte vektorer for 0 per-frame GC-allokeringer
  const tmpVecA = new THREE.Vector3();
  const tmpVecB = new THREE.Vector3();
  const tmpVecC = new THREE.Vector3();
  const tmpForward = new THREE.Vector3(0, 0, -1);
  const tmpUp = new THREE.Vector3(0, 1, 0);

  // ==========================================================================
  // 1. FELLES MATERIALER OG HJELPERE FOR YTTERVERDENEN
  // ==========================================================================
  const adobeWallMat = new THREE.MeshStandardMaterial({
    color: 0xdcc5a4,
    roughness: 0.90,
    metalness: 0.02
  });
  const terracottaRoofMat = new THREE.MeshStandardMaterial({
    color: 0xa44a2a,
    roughness: 0.82,
    metalness: 0.05
  });
  const safeGlowFloorMat = new THREE.MeshBasicMaterial({
    color: 0x56f08a,
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const safeLanternBulbMat = new THREE.MeshBasicMaterial({
    color: 0xffdf88,
    toneMapped: false
  });
  const dryWoodLogMat = new THREE.MeshStandardMaterial({
    color: 0x8b6239,
    map: M.sharedBarkTex || null,
    roughness: 0.88,
    metalness: 0.02
  });
  const splitWoodEndMat = new THREE.MeshStandardMaterial({
    color: 0xd6b07a,
    roughness: 0.82,
    metalness: 0.01
  });
  const woodShimmerMat = new THREE.MeshBasicMaterial({
    color: 0xffcf68,
    transparent: true,
    opacity: 0.36,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  const signUpdaters = [];
  function makeLocalizedSign(enTitle, noTitle, enSub, noSub, w = 4.2, h = 1.08) {
    const isNo = getLang() === 'no';
    const mesh = W.createWesternSign(isNo ? noTitle : enTitle, isNo ? noSub : enSub, w, h);
    signUpdaters.push(() => {
      const no = getLang() === 'no';
      mesh.userData.updateSign(no ? noTitle : enTitle, no ? noSub : enSub);
    });
    return mesh;
  }

  function createHealthBarOverhead(width = 1.45, height = 0.20) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 44;
    const c2d = canvas.getContext('2d');
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);

    const draw = (hp, maxHp, label, barHex = '#ff4738') => {
      c2d.clearRect(0, 0, 256, 44);
      drawRoundedRect(c2d, 4, 4, 248, 36, 9);
      c2d.fillStyle = 'rgba(20, 10, 6, 0.88)';
      c2d.fill();
      c2d.lineWidth = 2.5;
      c2d.strokeStyle = '#e5b25d';
      c2d.stroke();

      const ratio = Math.max(0, Math.min(1, hp / Math.max(1, maxHp)));
      if (ratio > 0) {
        drawRoundedRect(c2d, 8, 22, Math.max(8, 240 * ratio), 13, 5);
        c2d.fillStyle = barHex;
        c2d.fill();
      }
      c2d.font = 'bold 12px sans-serif';
      c2d.textAlign = 'center';
      c2d.textBaseline = 'middle';
      c2d.fillStyle = '#fff5dc';
      c2d.fillText(`${label} (${Math.ceil(hp)}/${maxHp})`, 128, 13);
      tex.needsUpdate = true;
    };
    mesh.userData.drawBar = draw;
    return mesh;
  }

  // ==========================================================================
  // 2. UTVIDET NATUR, TRÆR, KAKTUS, OASEPALMER, KLIPPER OG VEISKILT (±200..±405m)
  // ==========================================================================
  function buildOuterWildernessScenery() {
    const rng = createSeededRng(20261126);
    const sceneryGroup = new THREE.Group();
    expRoot.add(sceneryGroup);

    const isNearTownOrRoad = (x, z) => {
      for (let i = 0; i < OUTER_TOWNS.length; i++) {
        const t = OUTER_TOWNS[i];
        if (Math.hypot(x - t.x, z - t.z) < 34) return true;
      }
      // Hold hovedveiene og diagonale kontinentalveier til alle 8 byene åpne
      if (Math.abs(x) < 9.5 && Math.abs(z) < 1140) return true;
      if (Math.abs(z + 1.5) < 9.5 && Math.abs(x) < 1140) return true;
      if (Math.abs(x - z * 0.985) < 10.5) return true;
      if (Math.abs(x + z * 1.015) < 10.5) return true;
      return false;
    };

    // Instanced Furutrær i Nord / Nordvest ut til -1120m (420 trær i kun 3 InstancedMesh draw calls!)
    const pineCount = 420;
    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.34, 2.8, 7);
    const coneLowGeo = new THREE.ConeGeometry(1.85, 3.2, 8);
    const coneTopGeo = new THREE.ConeGeometry(1.25, 2.7, 8);
    const pineMat = new THREE.MeshStandardMaterial({
      color: 0x355834,
      map: M.sharedFoliageTex || null,
      roughness: 0.88
    });
    const instTrunks = new THREE.InstancedMesh(trunkGeo, M.logTimberMat || dryWoodLogMat, pineCount);
    const instLow = new THREE.InstancedMesh(coneLowGeo, pineMat, pineCount);
    const instTop = new THREE.InstancedMesh(coneTopGeo, pineMat, pineCount);
    instTrunks.castShadow = true;
    instLow.castShadow = true;
    const dummy = new THREE.Object3D();
    let pPlaced = 0;
    let guard = 0;
    while (pPlaced < pineCount && guard < 3600) {
      guard++;
      const px = -1120 + rng() * 1650; // -1120..+530
      const pz = -1120 + rng() * 930;  // -1120..-190
      if (Math.abs(px) < 195 && Math.abs(pz) < 195) continue;
      if (isNearTownOrRoad(px, pz)) continue;
      const py = getTerrainHeight(px, pz);
      const sc = 0.88 + rng() * 0.85;
      dummy.position.set(px, py + 1.35 * sc, pz);
      dummy.rotation.set(0, rng() * Math.PI * 2, 0);
      dummy.scale.setScalar(sc);
      dummy.updateMatrix();
      instTrunks.setMatrixAt(pPlaced, dummy.matrix);

      dummy.position.set(px, py + 3.05 * sc, pz);
      dummy.updateMatrix();
      instLow.setMatrixAt(pPlaced, dummy.matrix);

      dummy.position.set(px, py + 4.55 * sc, pz);
      dummy.updateMatrix();
      instTop.setMatrixAt(pPlaced, dummy.matrix);
      pPlaced++;
    }
    instTrunks.count = pPlaced;
    instLow.count = pPlaced;
    instTop.count = pPlaced;
    sceneryGroup.add(instTrunks, instLow, instTop);

    // Instanced Saguaro-kaktuser ut til +-1120m (280 stk)
    const cactusCount = 280;
    const cacMainGeo = new THREE.CylinderGeometry(0.24, 0.30, 3.1, 8);
    const cacArmGeo = new THREE.CylinderGeometry(0.16, 0.19, 1.35, 7);
    const cactusMat = new THREE.MeshStandardMaterial({ color: 0x4b7a3f, roughness: 0.86 });
    const instCacMain = new THREE.InstancedMesh(cacMainGeo, cactusMat, cactusCount);
    const instCacArm = new THREE.InstancedMesh(cacArmGeo, cactusMat, cactusCount);
    let cPlaced = 0;
    guard = 0;
    while (cPlaced < cactusCount && guard < 2800) {
      guard++;
      const cx = -1120 + rng() * 2240;
      const cz = -920 + rng() * 2040;
      if (Math.abs(cx) < 205 && Math.abs(cz) < 205) continue;
      if (cx < -120 && cz < -120) continue;
      if (isNearTownOrRoad(cx, cz)) continue;
      const cy = getTerrainHeight(cx, cz);
      const sc = 0.85 + rng() * 0.72;
      const yaw = rng() * Math.PI * 2;
      dummy.position.set(cx, cy + 1.5 * sc, cz);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.setScalar(sc);
      dummy.updateMatrix();
      instCacMain.setMatrixAt(cPlaced, dummy.matrix);

      dummy.position.set(cx + Math.cos(yaw) * 0.42 * sc, cy + 2.05 * sc, cz + Math.sin(yaw) * 0.42 * sc);
      dummy.rotation.set(0, yaw, -0.45);
      dummy.updateMatrix();
      instCacArm.setMatrixAt(cPlaced, dummy.matrix);
      cPlaced++;
    }
    instCacMain.count = cPlaced;
    instCacArm.count = cPlaced;
    sceneryGroup.add(instCacMain, instCacArm);

    // Instanced Kampesteiner / Røde Klippeblokker og Basalt-spir over hele kontinentet
    const boulderGeo = new THREE.DodecahedronGeometry(1.55, 1);
    const boulderMat = new THREE.MeshStandardMaterial({
      color: 0x9b6d52,
      map: M.sharedSandstoneTex || null,
      roughness: 0.92
    });
    const basaltMat = new THREE.MeshStandardMaterial({
      color: 0x3b3538,
      roughness: 0.88,
      metalness: 0.08
    });
    const instBoulders = new THREE.InstancedMesh(boulderGeo, boulderMat, 190);
    const instBasalt = new THREE.InstancedMesh(new THREE.ConeGeometry(1.5, 5.2, 6), basaltMat, 90);
    let bIdx = 0;
    for (let i = 0; i < 1200 && bIdx < 190; i++) {
      const bx = -1130 + rng() * 2260;
      const bz = -1130 + rng() * 2260;
      if (Math.abs(bx) < 208 && Math.abs(bz) < 208) continue;
      if (isNearTownOrRoad(bx, bz)) continue;
      const by = getTerrainHeight(bx, bz);
      const sx = 1.1 + rng() * 2.2;
      const sy = 0.85 + rng() * 2.0;
      const sz = 1.1 + rng() * 2.1;
      dummy.position.set(bx, by + sy * 0.7, bz);
      dummy.rotation.set((rng() - 0.5) * 0.25, rng() * Math.PI * 2, (rng() - 0.5) * 0.25);
      dummy.scale.set(sx, sy, sz);
      dummy.updateMatrix();
      instBoulders.setMatrixAt(bIdx++, dummy.matrix);
      if (sx > 2.1 && addWorldWallCollider) {
        const rad = Math.max(sx, sz) * 1.15;
        addWorldWallCollider(bx - rad, bx + rad, bz - rad, bz + rad, by + sy * 2.2);
      }
    }
    instBoulders.count = bIdx;

    let vIdx = 0;
    for (let i = 0; i < 650 && vIdx < 90; i++) {
      const vx = 195 + rng() * 930;
      const vz = 160 + rng() * 960;
      if (isNearTownOrRoad(vx, vz)) continue;
      const vy = getTerrainHeight(vx, vz);
      const sc = 0.9 + rng() * 1.65;
      dummy.position.set(vx, vy + 2.3 * sc, vz);
      dummy.rotation.set((rng() - 0.5) * 0.18, rng() * Math.PI * 2, (rng() - 0.5) * 0.18);
      dummy.scale.set(sc, sc * (1.0 + rng() * 0.45), sc);
      dummy.updateMatrix();
      instBasalt.setMatrixAt(vIdx++, dummy.matrix);
    }
    instBasalt.count = vIdx;
    sceneryGroup.add(instBoulders, instBasalt);

    // Veiskilt langs stiene både til mellom-byene (~285m) og de fjerne kontinent-citadellene (~880m)!
    const trailSigns = [
      { x: -185, z: -192, yaw: 0.78, enT: '↖ SILVER CREEK & FROSTPEAK', noT: '↖ SILVER CREEK & FROSTPEAK', enS: 'Safe Havens & Northern Trail', noS: 'Trygge Fristeder & Nordveien' },
      { x: 196, z: -182, yaw: -0.78, enT: '↗ COPPER MESA & SUNFIRE', noT: '↗ COPPER MESA & SUNFIRE', enS: 'Safe Havens & Canyon Highway', noS: 'Trygge Fristeder & Kløfteveien' },
      { x: -190, z: 194, yaw: 2.35, enT: '↙ SANCTUARY & EMERALD LAGOON', noT: '↙ SANCTUARY & SMARAGDOASEN', enS: 'Oasis Safe Havens', noS: 'Oasebyer med Fristed' },
      { x: 194, z: 190, yaw: -2.35, enT: '↘ IRONWOOD & ASHENFORGE', noT: '↘ IRONWOOD & ASHENFORGE', enS: 'Safe Havens & Volcanic Trail', noS: 'Trygge Fristeder & Vulkanveien' },
      { x: -545, z: -555, yaw: 0.78, enT: '↖ FROSTPEAK CITADEL (450m)', noT: '↖ FROSTPEAK CITADEL (450m)', enS: 'Glacier Titan & Safe Hall', noS: 'Is-Titanen & Fjell-Fristed' },
      { x: 560, z: -540, yaw: -0.78, enT: '↗ SUNFIRE CANYON CITY (450m)', noT: '↗ SUNFIRE KLØFTEBY (450m)', enS: 'Sunstone Colossus & Armory', noS: 'Sol-Kolossen & Våpensmie' },
      { x: -555, z: 550, yaw: 2.35, enT: '↙ EMERALD MIRAGE LAGOON', noT: '↙ SMARAGD-LAGUNEN (450m)', enS: 'Enchanted Lagoon & Safe Haven', noS: 'Magisk Lagune & Fristed' },
      { x: 555, z: 560, yaw: -2.35, enT: '↘ ASHENFORGE BASTION (450m)', noT: '↘ ASHENFORGE BASTION (450m)', enS: 'Ignis Rex & War-Armory', noS: 'Ignis Rex & Våpensmie' }
    ];
    trailSigns.forEach((ts) => {
      const postGrp = new THREE.Group();
      const sy = getTerrainHeight(ts.x, ts.z);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 2.5, 8), M.darkWoodMat || dryWoodLogMat);
      post.position.y = 1.25;
      postGrp.add(post);
      const sign = makeLocalizedSign(ts.enT, ts.noT, ts.enS, ts.noS, 3.4, 0.88);
      sign.position.set(0, 2.25, 0.08);
      postGrp.add(sign);
      postGrp.position.set(ts.x, sy, ts.z);
      postGrp.rotation.y = ts.yaw;
      sceneryGroup.add(postGrp);
    });
  }

  // ==========================================================================
  // 3. 4 NYE BYER MED TRYGGE FRISTEDER ("SAFE HAVENS") OG HANDELSBUTIKKER
  // ==========================================================================
  const outerSafeZones = []; // { townId, minX, maxX, minZ, maxZ, cx, cz, repelRadius }
  const outerTownShopAnchors = []; // { town, x, y, z, tab, hitMeshes }
  const allOuterShopHitMeshes = [];
  const townCampfireFlames = [];

  function buildOuterTownsAndSafeHavens() {
    OUTER_TOWNS.forEach((town, tIdx) => {
      const townGrp = new THREE.Group();
      const baseY = getTerrainHeight(town.x, town.z);
      townGrp.position.set(town.x, baseY, town.z);
      expRoot.add(townGrp);

      const wallMat =
        town.theme === 'oasis' ? adobeWallMat :
        (town.theme === 'canyon' ? (M.crimsonRockMat || M.woodWallMat) :
        (town.theme === 'timber' ? (M.logTimberMat || M.woodWallMat) : M.woodWallMat));
      const trimMat = M.darkWoodMat || dryWoodLogMat;
      const roofMat = town.theme === 'oasis' ? terracottaRoofMat : trimMat;

      // --- A) BYPORT / VELKOMSTPORTAL SØR/NORD FOR TORGET ---
      const gateZ = town.z < 0 ? 15.5 : -15.5;
      const gateFaceYaw = town.z < 0 ? 0 : Math.PI;
      const gateGrp = new THREE.Group();
      gateGrp.position.set(0, 0, gateZ);
      gateGrp.rotation.y = gateFaceYaw;
      [-4.2, 4.2].forEach((px) => {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 4.6, 10), trimMat);
        pillar.position.set(px, 2.3, 0);
        pillar.castShadow = true;
        gateGrp.add(pillar);
      });
      const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.38, 0.38), trimMat);
      crossBeam.position.set(0, 4.5, 0);
      gateGrp.add(crossBeam);
      const townSign = makeLocalizedSign(town.enName, town.noName, town.enSub, town.noSub, 6.2, 1.32);
      townSign.position.set(0, 4.55, 0.24);
      gateGrp.add(townSign);
      const townSignBack = makeLocalizedSign(town.enName, town.noName, town.enSub, town.noSub, 6.2, 1.32);
      townSignBack.position.set(0, 4.55, -0.24);
      townSignBack.rotation.y = Math.PI;
      gateGrp.add(townSignBack);
      townGrp.add(gateGrp);

      // --- B) FRISTED / SAFE HAVEN BYGNING (VENSTRE SIDE AV BYTORGET, x = -9.5) ---
      // 100 % trygg sone hvor verken gamle eller nye monstre kan gå inn eller skade spilleren!
      const shX = -9.5;
      const shZ = 0;
      const shW = 8.4;
      const shD = 7.6;
      const shH = 3.5;
      const safeGrp = new THREE.Group();
      safeGrp.position.set(shX, 0, shZ);
      townGrp.add(safeGrp);

      // Steinplattform & lysende grønn/gyllen beskyttelsesmatte inne i Fristedet
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(shW + 0.8, 0.22, shD + 0.8), M.stonePlinthMat || trimMat);
      plinth.position.y = 0.11;
      plinth.receiveShadow = true;
      safeGrp.add(plinth);

      const safeRug = new THREE.Mesh(new THREE.PlaneGeometry(shW - 1.0, shD - 1.0), safeGlowFloorMat);
      safeRug.rotation.x = -Math.PI / 2;
      safeRug.position.y = 0.24;
      safeGrp.add(safeRug);

      // Vegger: Bakvegg (-X), Nordvegg (-Z), Sørvegg (+Z) og to frontsegmenter (+X mot torget med 2.6m åpen dør!)
      const wallThick = 0.34;
      const backW = new THREE.Mesh(new THREE.BoxGeometry(wallThick, shH, shD), wallMat);
      backW.position.set(-shW * 0.5, shH * 0.5 + 0.2, 0);
      backW.castShadow = true;
      backW.receiveShadow = true;
      safeGrp.add(backW);

      const northW = new THREE.Mesh(new THREE.BoxGeometry(shW, shH, wallThick), wallMat);
      northW.position.set(0, shH * 0.5 + 0.2, -shD * 0.5);
      northW.castShadow = true;
      safeGrp.add(northW);

      const southW = new THREE.Mesh(new THREE.BoxGeometry(shW, shH, wallThick), wallMat);
      southW.position.set(0, shH * 0.5 + 0.2, shD * 0.5);
      southW.castShadow = true;
      safeGrp.add(southW);

      const doorHalf = 1.35; // 2.7m bred fri inngang!
      const segLen = (shD - doorHalf * 2) * 0.5;
      [-1, 1].forEach((side) => {
        const fw = new THREE.Mesh(new THREE.BoxGeometry(wallThick, shH, segLen), wallMat);
        fw.position.set(shW * 0.5, shH * 0.5 + 0.2, side * (doorHalf + segLen * 0.5));
        fw.castShadow = true;
        safeGrp.add(fw);
      });
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(wallThick + 0.06, 0.85, doorHalf * 2 + 0.2), wallMat);
      lintel.position.set(shW * 0.5, shH + 0.2 - 0.42, 0);
      safeGrp.add(lintel);

      // Tak med overbygg over verandaen
      const roof = new THREE.Mesh(new THREE.BoxGeometry(shW + 1.8, 0.32, shD + 1.2), roofMat);
      roof.position.set(0.35, shH + 0.36, 0);
      roof.castShadow = true;
      safeGrp.add(roof);

      const falseFront = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.45, shD + 0.6), wallMat);
      falseFront.position.set(shW * 0.5 + 0.65, shH + 1.05, 0);
      safeGrp.add(falseFront);

      // Skilt over døråpningen til Fristedet
      const safeSign = makeLocalizedSign(town.enSafeTitle, town.noSafeTitle, town.enSafeSub, town.noSafeSub, 4.8, 1.15);
      safeSign.position.set(shW * 0.5 + 0.84, shH + 1.05, 0);
      safeSign.rotation.y = Math.PI / 2;
      safeGrp.add(safeSign);

      // To varme beskyttelseslykter ved inngangen + køyeseng og ildgryte inne i Fristedet
      [-1.75, 1.75].forEach((lz) => {
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), safeLanternBulbMat);
        bulb.position.set(shW * 0.5 + 0.45, 2.55, lz);
        safeGrp.add(bulb);
      });
      if (W.registerWorldVirtualLight) {
        W.registerWorldVirtualLight(new THREE.Vector3(town.x + shX + 1.5, baseY + 2.6, town.z + shZ), 0xffcf70, 5.2, 22, 2);
      }

      const bunk = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.55, 2.4), trimMat);
      bunk.position.set(-shW * 0.5 + 1.05, 0.5, -1.8);
      safeGrp.add(bunk);
      const brazier = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.35, 0.55, 10), M.wroughtIronMat || trimMat);
      brazier.position.set(-1.2, 0.5, 1.6);
      safeGrp.add(brazier);
      const brazierFlame = new THREE.Mesh(
        new THREE.ConeGeometry(0.28, 0.65, 7),
        new THREE.MeshBasicMaterial({ color: 0xff9428, toneMapped: false })
      );
      brazierFlame.position.set(-1.2, 0.95, 1.6);
      brazierFlame.userData.baseY = 0.95;
      brazierFlame.userData.phase = tIdx * 1.7;
      safeGrp.add(brazierFlame);
      townCampfireFlames.push(brazierFlame);

      // Registrer solide vegger rundt Fristedet (med åpen 2.7m dør på +X-veggen)
      const wxMin = town.x + shX - shW * 0.5;
      const wxMax = town.x + shX + shW * 0.5;
      const wzMin = town.z + shZ - shD * 0.5;
      const wzMax = town.z + shZ + shD * 0.5;
      if (addWorldWallCollider) {
        addWorldWallCollider(wxMin - 0.22, wxMin + 0.22, wzMin - 0.2, wzMax + 0.2, baseY + 4.2);
        addWorldWallCollider(wxMin - 0.2, wxMax + 0.2, wzMin - 0.22, wzMin + 0.22, baseY + 4.2);
        addWorldWallCollider(wxMin - 0.2, wxMax + 0.2, wzMax - 0.22, wzMax + 0.22, baseY + 4.2);
        addWorldWallCollider(wxMax - 0.22, wxMax + 0.22, wzMin - 0.2, town.z + shZ - doorHalf, baseY + 4.2);
        addWorldWallCollider(wxMax - 0.22, wxMax + 0.22, town.z + shZ + doorHalf, wzMax + 0.2, baseY + 4.2);
      }

      // Registrer den hellige/trygge Fristed-sonen (inkl. litt av inngangspartiet!)
      outerSafeZones.push({
        townId: town.id,
        enName: town.enName,
        noName: town.noName,
        minX: wxMin - 0.4,
        maxX: wxMax + 1.6,
        minZ: wzMin - 0.4,
        maxZ: wzMax + 0.4,
        cx: town.x + shX,
        cz: town.z + shZ,
        repelPad: 2.2
      });

      // --- C) HANDELSSTASJON / BUTIKK (HØYRE SIDE AV BYTORGET, x = +9.5) ---
      const stX = 9.5;
      const stZ = 0;
      const storeGrp = new THREE.Group();
      storeGrp.position.set(stX, 0, stZ);
      townGrp.add(storeGrp);

      const shopHitMeshes = [];
      const deck = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.24, 7.2), trimMat);
      deck.position.y = 0.12;
      deck.receiveShadow = true;
      storeGrp.add(deck);

      const storeBody = new THREE.Mesh(new THREE.BoxGeometry(5.2, 3.4, 6.6), wallMat);
      storeBody.position.set(1.2, 1.92, 0);
      storeBody.castShadow = true;
      storeBody.receiveShadow = true;
      storeGrp.add(storeBody);
      shopHitMeshes.push(storeBody);

      const storeRoof = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.30, 7.4), roofMat);
      storeRoof.position.set(0, 3.74, 0);
      storeRoof.castShadow = true;
      storeGrp.add(storeRoof);

      const storeFrontCrest = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.4, 6.8), wallMat);
      storeFrontCrest.position.set(-3.85, 4.45, 0);
      storeGrp.add(storeFrontCrest);

      // Butikkdisk & Handelsmann på verandaen mot torget (-X)
      const counter = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.12, 3.8), M.lightWoodMat || trimMat);
      counter.position.set(-2.35, 0.80, 0);
      counter.castShadow = true;
      storeGrp.add(counter);
      shopHitMeshes.push(counter);

      if (C.createTailorNPC || C.createGunsmithNPC) {
        const clerk = town.shopTab === 'weapons' && C.createGunsmithNPC
          ? C.createGunsmithNPC(shopHitMeshes)
          : C.createTailorNPC(shopHitMeshes);
        clerk.position.set(-1.25, 0.24, 0);
        clerk.rotation.y = -Math.PI / 2;
        storeGrp.add(clerk);
      }

      const shopSign = makeLocalizedSign(town.enShopTitle, town.noShopTitle, town.enShopSub, town.noShopSub, 4.9, 1.15);
      shopSign.position.set(-4.04, 4.45, 0);
      shopSign.rotation.y = -Math.PI / 2;
      storeGrp.add(shopSign);
      shopHitMeshes.push(shopSign);

      if (W.createDetailedBarrel) {
        const b1 = W.createDetailedBarrel();
        b1.position.set(-2.6, 0.65, 2.55);
        storeGrp.add(b1);
      }
      if (W.createWagonWheel) {
        const wh = W.createWagonWheel();
        wh.position.set(-2.4, 0.78, -2.65);
        wh.rotation.y = Math.PI / 2;
        storeGrp.add(wh);
      }

      if (addWorldWallCollider) {
        addWorldWallCollider(town.x + stX - 1.5, town.x + stX + 3.9, town.z + stZ - 3.4, town.z + stZ + 3.4, baseY + 4.2);
      }

      shopHitMeshes.forEach((hm) => {
        hm.userData.outerShopTab = town.shopTab;
        allOuterShopHitMeshes.push(hm);
      });
      outerTownShopAnchors.push({
        town,
        x: town.x + stX - 2.35,
        y: baseY,
        z: town.z + stZ,
        tab: town.shopTab,
        hitMeshes: shopHitMeshes
      });

      // --- D) TORG-LEIRBÅL / OASEBRØNN MIDT PÅ BYTORGET (x = 0, z = 0) ---
      const plazaRing = new THREE.Group();
      for (let s = 0; s < 10; s++) {
        const ang = (s / 10) * Math.PI * 2;
        const st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), M.stonePlinthMat || trimMat);
        st.position.set(Math.cos(ang) * 0.95, 0.12, Math.sin(ang) * 0.95);
        plazaRing.add(st);
      }
      for (let l = 0; l < 4; l++) {
        const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.35, 7), dryWoodLogMat);
        lg.position.y = 0.20;
        lg.rotation.z = Math.PI / 2 - 0.25;
        lg.rotation.y = (l / 4) * Math.PI;
        plazaRing.add(lg);
      }
      const pFlame = new THREE.Mesh(
        new THREE.ConeGeometry(0.42, 1.05, 8),
        new THREE.MeshBasicMaterial({ color: 0xff8c24, toneMapped: false })
      );
      pFlame.position.y = 0.62;
      pFlame.userData.baseY = 0.62;
      pFlame.userData.phase = tIdx * 2.3 + 0.6;
      plazaRing.add(pFlame);
      townCampfireFlames.push(pFlame);
      townGrp.add(plazaRing);

      if (W.registerWorldVirtualLight) {
        W.registerWorldVirtualLight(new THREE.Vector3(town.x, baseY + 1.5, town.z), 0xff8a2b, 5.6, 24, 2);
      }

      // Ekstra oasedam med palmer i Sanctuary Springs!
      if (town.theme === 'oasis') {
        const pool = new THREE.Mesh(
          new THREE.CircleGeometry(4.4, 20),
          new THREE.MeshStandardMaterial({ color: 0x2492a8, roughness: 0.16, metalness: 0.25 })
        );
        pool.rotation.x = -Math.PI / 2;
        pool.position.set(0, 0.05, -7.2);
        townGrp.add(pool);
        [[-4.2, -7.5], [4.4, -7.0], [0.2, -11.4]].forEach(([px, pz]) => {
          const palm = new THREE.Group();
          const pTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 4.8, 8), dryWoodLogMat);
          pTrunk.position.y = 2.4;
          palm.add(pTrunk);
          for (let f = 0; f < 6; f++) {
            const frond = new THREE.Mesh(
              new THREE.BoxGeometry(0.45, 0.08, 2.2),
              new THREE.MeshStandardMaterial({ color: 0x3f8838, roughness: 0.8 })
            );
            const fa = (f / 6) * Math.PI * 2;
            frond.position.set(Math.sin(fa) * 0.95, 4.75, Math.cos(fa) * 0.95);
            frond.rotation.y = fa;
            frond.rotation.x = 0.42;
            palm.add(frond);
          }
          palm.position.set(px, 0, pz);
          townGrp.add(palm);
        });
      }
    });
  }

  // ==========================================================================
  // 4. VEDSANKING (72 VEDKUBBER I VERDENEN) & BYGGBART LEIRBÅL SOM JAGER MONSTRE
  // ==========================================================================
  const firewoodPickups = [];
  const firewoodHitMeshes = [];

  function buildFirewoodNodes() {
    const rng = createSeededRng(884422);
    // Garanter flere lett tilgjengelige vedstabler nær Dustwood/Whispering Woods + langs alle stier og i villmarken!
    const fixedSpots = [
      { x: -12.5, z: -26.5, amt: 2 },
      { x: 11.0, z: -31.0, amt: 2 },
      { x: -4.5, z: -42.0, amt: 2 },
      { x: 16.5, z: 26.0, amt: 1 },
      { x: -25.0, z: 18.0, amt: 1 },
      { x: 38.0, z: -8.0, amt: 2 },
      { x: -42.0, z: -12.0, amt: 2 }
    ];

    for (let i = 0; i < 65; i++) {
      let fx = -380 + rng() * 760;
      let fz = -380 + rng() * 760;
      if (Math.abs(fx) < 23 && Math.abs(fz) < 23) {
        fx = (fx < 0 ? -1 : 1) * (32 + rng() * 60);
      }
      fixedSpots.push({ x: fx, z: fz, amt: rng() < 0.42 ? 2 : 1 });
    }
    // 84 ekstra vedstabler langs de lange kontinentalveiene og rundt ytter-citadellene (+-400..+-1100m)!
    for (let i = 0; i < 84; i++) {
      let fx = -1090 + rng() * 2180;
      let fz = -1090 + rng() * 2180;
      if (Math.abs(fx) < 380 && Math.abs(fz) < 380) {
        fx = (fx < 0 ? -1 : 1) * (420 + rng() * 640);
      }
      fixedSpots.push({ x: fx, z: fz, amt: rng() < 0.55 ? 2 : 1 });
    }

    const logGeo = new THREE.CylinderGeometry(0.095, 0.105, 0.92, 8);
    logGeo.rotateZ(Math.PI / 2);
    const ringGeo = new THREE.RingGeometry(0.46, 0.62, 16);
    ringGeo.rotateX(-Math.PI / 2);
    const hitGeo = new THREE.SphereGeometry(0.68, 8, 6);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });

    fixedSpots.forEach((sp, idx) => {
      const grp = new THREE.Group();
      const gy = getTerrainHeight(sp.x, sp.z);
      grp.position.set(sp.x, gy, sp.z);
      grp.rotation.y = (idx * 1.37) % (Math.PI * 2);

      // 3 kryssede tørre vedkubber + 1 kløvd kubbe på toppen
      const l1 = new THREE.Mesh(logGeo, dryWoodLogMat);
      l1.position.set(0, 0.10, -0.13);
      l1.rotation.y = 0.14;
      const l2 = new THREE.Mesh(logGeo, dryWoodLogMat);
      l2.position.set(0, 0.10, 0.13);
      l2.rotation.y = -0.16;
      const l3 = new THREE.Mesh(logGeo, splitWoodEndMat);
      l3.position.set(0, 0.24, 0);
      l3.rotation.y = 0.55;
      l1.castShadow = true;
      l2.castShadow = true;
      l3.castShadow = true;
      grp.add(l1, l2, l3);

      const ring = new THREE.Mesh(ringGeo, woodShimmerMat);
      ring.position.y = 0.03;
      grp.add(ring);

      const hitMesh = new THREE.Mesh(hitGeo, hitMat);
      hitMesh.position.y = 0.25;
      grp.add(hitMesh);

      expRoot.add(grp);
      const entry = {
        id: `wood_${idx}`,
        group: grp,
        ring,
        hitMesh,
        amount: sp.amt,
        collected: false,
        respawnTimer: 0,
        worldPos: new THREE.Vector3(sp.x, gy + 0.22, sp.z)
      };
      hitMesh.userData.firewoodEntry = entry;
      firewoodPickups.push(entry);
      firewoodHitMeshes.push(hitMesh);
    });
  }

  function collectFirewood(entry) {
    if (!entry || entry.collected) return false;
    entry.collected = true;
    entry.respawnTimer = 48;
    entry.group.visible = false;

    playerState.wood = Math.max(0, (playerState.wood || 0)) + entry.amount;
    if (spawnSparkBurst) spawnSparkBurst(entry.worldPos, 10, 0xffc864, 0.95);
    if (audio && audio.playCollectSound) audio.playCollectSound();
    else if (audio && audio.playGoldPickupSound) audio.playGoldPickupSound();

    const isNo = getLang() === 'no';
    const have = playerState.wood;
    const readyHint = have >= WOOD_PER_CAMPFIRE
      ? (isNo ? 'Klar til å tenne bål [X]!' : 'Ready to build campfire [X]!')
      : `${have}/${WOOD_PER_CAMPFIRE}`;
    showFrontierToast(
      isNo
        ? `🪵 +${entry.amount} Ved sanket! (Ved: ${have} — ${readyHint})`
        : `🪵 +${entry.amount} Firewood gathered! (Wood: ${have} — ${readyHint})`,
      3.4
    );

    saveCareerProgress();
    syncCampfireButtonsUI();
    updateStatusUI();
    return true;
  }

  // --- Spillerens byggbare leirbål i villmarken ---
  const activeCampfire = {
    active: false,
    x: 0,
    y: 0,
    z: 0,
    timeLeft: 0,
    healAccum: 0
  };

  const campfireGroup = new THREE.Group();
  campfireGroup.visible = false;
  expRoot.add(campfireGroup);

  const playerCampfireFlames = [];
  const playerCampfireSparks = [];
  let campfireBannerCanvas = null;
  let campfireBannerCtx = null;
  let campfireBannerTex = null;
  let campfireBannerMesh = null;
  let campfireLastShownSec = -1;
  let campfireLastShownLang = '';
  let campfireSanctuaryRing = null;
  let campfirePointLight = null;

  function initPlayerCampfireMesh() {
    // Steinring (12 steiner)
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.20, 0),
        M.stonePlinthMat || dryWoodLogMat
      );
      rock.position.set(Math.cos(ang) * 0.92, 0.11, Math.sin(ang) * 0.92);
      rock.scale.set(1.15, 0.75, 1.0);
      campfireGroup.add(rock);
    }

    // Glødende kullbunn
    const coalBed = new THREE.Mesh(
      new THREE.CylinderGeometry(0.74, 0.80, 0.10, 14),
      new THREE.MeshBasicMaterial({ color: 0xff5214, toneMapped: false })
    );
    coalBed.position.y = 0.06;
    campfireGroup.add(coalBed);

    // 5 kryssede vedkubber i pyramide
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2;
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.105, 1.38, 8), dryWoodLogMat);
      log.position.set(Math.cos(ang) * 0.24, 0.28, Math.sin(ang) * 0.24);
      log.rotation.z = 0.88;
      log.rotation.y = ang;
      log.castShadow = true;
      campfireGroup.add(log);
    }

    // 5 levende flammekjegler
    const flameColors = [0xff6a14, 0xff9d24, 0xffcc38, 0xff7b1a, 0xffe46b];
    for (let f = 0; f < 5; f++) {
      const fl = new THREE.Mesh(
        new THREE.ConeGeometry(f === 0 ? 0.38 : 0.24, f === 0 ? 1.15 : 0.82, 7),
        new THREE.MeshBasicMaterial({
          color: flameColors[f],
          transparent: true,
          opacity: 0.90,
          toneMapped: false
        })
      );
      const ang = (f / 5) * Math.PI * 2;
      const rad = f === 0 ? 0 : 0.20;
      const baseY = f === 0 ? 0.68 : 0.52;
      fl.position.set(Math.cos(ang) * rad, baseY, Math.sin(ang) * rad);
      fl.userData.baseY = baseY;
      fl.userData.phase = f * 1.4;
      campfireGroup.add(fl);
      playerCampfireFlames.push(fl);
    }

    // Stigende gnister over bålet
    const sparkGeo = new THREE.SphereGeometry(0.045, 5, 5);
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffd258, toneMapped: false });
    for (let s = 0; s < 8; s++) {
      const sp = new THREE.Mesh(sparkGeo, sparkMat);
      sp.userData.offset = s / 8;
      sp.userData.angle = s * 0.9;
      campfireGroup.add(sp);
      playerCampfireSparks.push(sp);
    }

    // Ekte varm PointLight slik at leirbålet lyser opp natten og skogen rundt deg!
    campfirePointLight = new THREE.PointLight(0xff8e2b, 5.8, 22, 1.8);
    campfirePointLight.position.set(0, 1.25, 0);
    campfireGroup.add(campfirePointLight);

    // Synlig gyllen-ravfarget beskyttelsesring på bakken (9,5 m radius — viser nøyaktig hvor monstre ikke kan røre deg!)
    const ringGeo = new THREE.RingGeometry(CAMPFIRE_SAFE_RADIUS - 0.22, CAMPFIRE_SAFE_RADIUS, 48);
    ringGeo.rotateX(-Math.PI / 2);
    campfireSanctuaryRing = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({
        color: 0xffaa38,
        transparent: true,
        opacity: 0.42,
        side: THREE.DoubleSide,
        depthWrite: false,
        toneMapped: false
      })
    );
    campfireSanctuaryRing.position.y = 0.08;
    campfireGroup.add(campfireSanctuaryRing);

    // Flytende 3D-statusskilt over bålet med nedtelling
    campfireBannerCanvas = document.createElement('canvas');
    campfireBannerCanvas.width = 512;
    campfireBannerCanvas.height = 96;
    campfireBannerCtx = campfireBannerCanvas.getContext('2d');
    campfireBannerTex = new THREE.CanvasTexture(campfireBannerCanvas);
    campfireBannerTex.colorSpace = THREE.SRGBColorSpace;
    campfireBannerMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2.7, 0.50),
      new THREE.MeshBasicMaterial({
        map: campfireBannerTex,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        toneMapped: false
      })
    );
    campfireBannerMesh.position.set(0, 2.05, 0);
    campfireGroup.add(campfireBannerMesh);
  }

  function updateCampfireBannerTexture(secLeft) {
    if (!campfireBannerCtx) return;
    const isNo = getLang() === 'no';
    campfireBannerCtx.clearRect(0, 0, 512, 96);
    drawRoundedRect(campfireBannerCtx, 6, 6, 500, 84, 18);
    campfireBannerCtx.fillStyle = 'rgba(44, 20, 8, 0.92)';
    campfireBannerCtx.fill();
    campfireBannerCtx.lineWidth = 4;
    campfireBannerCtx.strokeStyle = '#ffae42';
    campfireBannerCtx.stroke();

    campfireBannerCtx.textAlign = 'center';
    campfireBannerCtx.textBaseline = 'middle';
    campfireBannerCtx.font = 'bold 25px Georgia, serif';
    campfireBannerCtx.fillStyle = '#ffe596';
    campfireBannerCtx.fillText(
      isNo ? `🔥 TRYGT LEIRBÅL (${secLeft}s)` : `🔥 SAFE CAMPFIRE (${secLeft}s)`,
      256,
      34
    );
    campfireBannerCtx.font = 'bold 18px sans-serif';
    campfireBannerCtx.fillStyle = '#9ef7a8';
    campfireBannerCtx.fillText(
      isNo ? 'Holder alle monstre unna • +Helse' : 'Repels all monsters • +Warmth Heal',
      256,
      68
    );
    campfireBannerTex.needsUpdate = true;
  }

  function syncCampfireButtonsUI() {
    const isNo = getLang() === 'no';
    const wood = playerState.wood || 0;
    const nearOwnFire =
      activeCampfire.active &&
      Math.hypot(playerRig.position.x - activeCampfire.x, playerRig.position.z - activeCampfire.z) <= 12.0;

    if (campfireBtnEl) {
      if (nearOwnFire) {
        const sec = Math.max(1, Math.ceil(activeCampfire.timeLeft));
        campfireBtnEl.textContent = isNo
          ? `🔥 Bål aktivt (${sec}s) • Legg på ved (${wood}) [X]`
          : `🔥 Fire Lit (${sec}s) • Add Wood (${wood}) [X]`;
        campfireBtnEl.style.borderColor = '#ffae42';
        campfireBtnEl.style.background = 'rgba(92, 42, 12, 0.96)';
      } else {
        campfireBtnEl.textContent = isNo
          ? `🔥 Lag bål (${wood}/${WOOD_PER_CAMPFIRE} Ved) [X]`
          : `🔥 Campfire (${wood}/${WOOD_PER_CAMPFIRE} Wood) [X]`;
        campfireBtnEl.style.borderColor = wood >= WOOD_PER_CAMPFIRE ? '#92f588' : '#e5b25d';
        campfireBtnEl.style.background = wood >= WOOD_PER_CAMPFIRE
          ? 'rgba(42, 72, 24, 0.95)'
          : 'rgba(58, 33, 16, 0.94)';
      }
    }

    if (touchCampfireBtnEl) {
      touchCampfireBtnEl.textContent = nearOwnFire
        ? `🔥 +VED (${wood})`
        : (isNo ? `🔥 BÅL (${wood}/${WOOD_PER_CAMPFIRE})` : `🔥 FIRE (${wood}/${WOOD_PER_CAMPFIRE})`);
    }
  }

  function tryBuildOrStokeCampfire() {
    const isNo = getLang() === 'no';
    const wood = playerState.wood || 0;

    // 1) Står spilleren allerede ved sitt aktive bål? Legg på 1 vedkubbe (+45s)!
    if (
      activeCampfire.active &&
      Math.hypot(playerRig.position.x - activeCampfire.x, playerRig.position.z - activeCampfire.z) <= 12.0
    ) {
      if (wood < 1) {
        if (audio && audio.playShopDenySound) audio.playShopDenySound();
        showFrontierToast(
          isNo
            ? '🪵 Ingen ved igjen å legge på bålet! Sank tørre vedkubber langs skog og stier.'
            : '🪵 No firewood left to stoke the fire! Gather drywood bundles along trails & woods.',
          3.8
        );
        return false;
      }
      playerState.wood = wood - 1;
      activeCampfire.timeLeft = Math.min(CAMPFIRE_MAX_DURATION, activeCampfire.timeLeft + 45);
      campfireLastShownSec = -1;
      if (spawnSparkBurst) spawnSparkBurst(campfireGroup.position, 18, 0xffaa32, 1.35);
      if (audio && audio.playUpgradeSound) audio.playUpgradeSound();
      showFrontierToast(
        isNo
          ? `🔥 La 1 Ved på bålet! Brennetid: ${Math.ceil(activeCampfire.timeLeft)}s — monstre holdes borte!`
          : `🔥 Added 1 Wood to the campfire! Burn time: ${Math.ceil(activeCampfire.timeLeft)}s!`,
        3.8
      );
      saveCareerProgress();
      syncCampfireButtonsUI();
      updateStatusUI();
      return true;
    }

    // 2) Bygg nytt leirbål foran spilleren (krever 3 Ved)
    if (wood < WOOD_PER_CAMPFIRE) {
      if (audio && audio.playShopDenySound) audio.playShopDenySound();
      showFrontierToast(
        isNo
          ? `🪵 Du må sanke ${WOOD_PER_CAMPFIRE} Ved først for å lage bål (har ${wood}/${WOOD_PER_CAMPFIRE})! Se etter vedstabler i skog og langs veier.`
          : `🪵 Gather ${WOOD_PER_CAMPFIRE} Firewood first to build a campfire (have ${wood}/${WOOD_PER_CAMPFIRE})! Look for log piles along trails & woods.`,
        4.5
      );
      return false;
    }

    if (playerRig.position.y < -1.8) {
      if (audio && audio.playShopDenySound) audio.playShopDenySound();
      showFrontierToast(
        isNo ? '🔥 Gå opp til overflaten for å tenne leirbål!' : '🔥 Head back to the surface to light a campfire!',
        3.2
      );
      return false;
    }

    const yaw = playerRig.rotation.y;
    let fx = playerRig.position.x - Math.sin(yaw) * 2.25;
    let fz = playerRig.position.z - Math.cos(yaw) * 2.25;
    fx = THREE.MathUtils.clamp(fx, -1172, 1172);
    fz = THREE.MathUtils.clamp(fz, -1172, 1172);
    const fy = getTerrainHeight(fx, fz, playerRig.position.y);

    playerState.wood = wood - WOOD_PER_CAMPFIRE;
    activeCampfire.active = true;
    activeCampfire.x = fx;
    activeCampfire.y = fy;
    activeCampfire.z = fz;
    activeCampfire.timeLeft = CAMPFIRE_BASE_DURATION;
    activeCampfire.healAccum = 0;

    campfireGroup.position.set(fx, fy, fz);
    campfireGroup.visible = true;
    campfireLastShownSec = -1;
    updateCampfireBannerTexture(CAMPFIRE_BASE_DURATION);

    // Jager øyeblikkelig bort eventuelle monstre rundt spilleren!
    repelAllHostilesNow();

    if (spawnSparkBurst) spawnSparkBurst(campfireGroup.position, 24, 0xff9c2a, 1.5);
    if (audio && audio.playUpgradeSound) audio.playUpgradeSound();
    showFrontierToast(
      isNo
        ? `🔥 Leirbål tent (${CAMPFIRE_BASE_DURATION}s)! Stå innenfor ildringen — alle monstre skremmes unna og du helbredes!`
        : `🔥 Campfire lit (${CAMPFIRE_BASE_DURATION}s)! Stay inside the firelight ring — monsters are repelled & health regenerates!`,
      5.0
    );

    saveCareerProgress();
    syncCampfireButtonsUI();
    updateStatusUI();
    return true;
  }

  if (campfireBtnEl) {
    campfireBtnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      tryBuildOrStokeCampfire();
    });
  }
  if (touchCampfireBtnEl) {
    touchCampfireBtnEl.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      tryBuildOrStokeCampfire();
    });
  }

  // Sjekk om et punkt (spiller eller kamera) er trygt inne i et av de 4 nye By-Fristedene ELLER innenfor et tent Leirbål!
  function isPointSafeFromMonsters(px, pz) {
    if (activeCampfire.active && activeCampfire.timeLeft > 0) {
      const dx = px - activeCampfire.x;
      const dz = pz - activeCampfire.z;
      if (dx * dx + dz * dz <= CAMPFIRE_SAFE_RADIUS * CAMPFIRE_SAFE_RADIUS) {
        return true;
      }
    }
    for (let i = 0; i < outerSafeZones.length; i++) {
      const sz = outerSafeZones[i];
      if (px >= sz.minX && px <= sz.maxX && pz >= sz.minZ && pz <= sz.maxZ) {
        return true;
      }
    }
    return false;
  }

  // Skyv et hvilket som helst monster (gammelt eller nytt) fysisk ut av ALLE By-Fristeder og ut av leirbålets 11,2m frykt-sirkel!
  function repelGroupFromSafeZonesAndCampfires(group, radius = 0.5) {
    if (!group) return false;
    let pushed = false;

    // 1) Aktivt spiller-leirbål (sirkulær ild-barriere på 11.2m!)
    if (activeCampfire.active && activeCampfire.timeLeft > 0) {
      const minR = CAMPFIRE_REPEL_RADIUS + radius;
      const dx = group.position.x - activeCampfire.x;
      const dz = group.position.z - activeCampfire.z;
      const distSq = dx * dx + dz * dz;
      if (distSq < minR * minR) {
        if (distSq > 1e-6) {
          const dist = Math.sqrt(distSq);
          const pen = minR - dist;
          group.position.x += (dx / dist) * pen;
          group.position.z += (dz / dist) * pen;
        } else {
          group.position.x = activeCampfire.x + minR;
        }
        pushed = true;
      }
    }

    // 2) Alle 4 nye By-Fristeder (AABB-barriere rundt Fristedet)
    for (let i = 0; i < outerSafeZones.length; i++) {
      const sz = outerSafeZones[i];
      const pad = radius + sz.repelPad;
      const bMinX = sz.minX - 0.5;
      const bMaxX = sz.maxX + 0.5;
      const bMinZ = sz.minZ - 0.5;
      const bMaxZ = sz.maxZ + 0.5;

      const x = group.position.x;
      const z = group.position.z;
      const cx = x < bMinX ? bMinX : (x > bMaxX ? bMaxX : x);
      const cz = z < bMinZ ? bMinZ : (z > bMaxZ ? bMaxZ : z);
      const dx = x - cx;
      const dz = z - cz;
      const dSq = dx * dx + dz * dz;
      if (dSq >= pad * pad) continue;

      if (dSq > 1e-8) {
        const d = Math.sqrt(dSq);
        const pen = pad - d;
        group.position.x += (dx / d) * pen;
        group.position.z += (dz / d) * pen;
      } else {
        group.position.x = bMaxX + pad;
      }
      pushed = true;
    }

    return pushed;
  }

  function repelAllHostilesNow() {
    if (entities) {
      const lists = [entities.nightEnemies, entities.wolfList, entities.bearList];
      lists.forEach((arr) => {
        if (!Array.isArray(arr)) return;
        for (let i = 0; i < arr.length; i++) {
          if (arr[i] && arr[i].alive && arr[i].group) {
            repelGroupFromSafeZonesAndCampfires(arr[i].group, 0.55);
          }
        }
      });
      if (entities.bossEnemy && entities.bossEnemy.alive) {
        repelGroupFromSafeZonesAndCampfires(entities.bossEnemy.group, 0.7);
      }
      if (entities.wendigoBossEnemy && entities.wendigoBossEnemy.alive) {
        repelGroupFromSafeZonesAndCampfires(entities.wendigoBossEnemy.group, 0.7);
      }
    }
    for (let i = 0; i < regionalMonsters.length; i++) {
      if (regionalMonsters[i].alive) {
        repelGroupFromSafeZonesAndCampfires(regionalMonsters[i].group, regionalMonsters[i].radius);
      }
    }
  }

  // ==========================================================================
  // 5. 4 NYE DYREARTER (SPREDT I HVER SIN REGION — IKKE PÅ SAMME STED!)
  //    1) Nordlig Kronelg (Moose) — Nordlige elvedal & skog
  //    2) Alpin Fjellbukk (Bighorn Ram) — NV Silver Creek høyfjell
  //    3) Villsvin (Razorback Boar) — NØ/Øst krattskog & kløftekant
  //    4) Ørken-Prærieulv / Ørkenrev (Coyote) — SV/Sør oase & sanddyner
  // ==========================================================================
  const regionalAnimals = [];

  function makeQuadrupedAnimalMesh(spec) {
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: spec.bodyColor, roughness: 0.85 });
    const darkMat = new THREE.MeshStandardMaterial({ color: spec.accentColor, roughness: 0.88 });
    const hornMat = new THREE.MeshStandardMaterial({ color: 0xe6dcc5, roughness: 0.55 });

    const torso = new THREE.Mesh(
      new THREE.CapsuleGeometry(spec.bodyR, spec.bodyLen, 6, 12),
      bodyMat
    );
    torso.rotation.x = Math.PI / 2;
    torso.position.y = spec.legH + spec.bodyR * 0.82;
    torso.castShadow = true;
    g.add(torso);

    if (spec.species === 'moose') {
      // Kraftig skulderpukkel på elgen
      const hump = new THREE.Mesh(new THREE.SphereGeometry(spec.bodyR * 0.95, 10, 8), darkMat);
      hump.position.set(0, spec.legH + spec.bodyR * 1.45, -spec.bodyLen * 0.32);
      g.add(hump);
    }

    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(spec.bodyR * 0.44, spec.bodyR * 0.58, spec.neckH, 8),
      darkMat
    );
    neck.position.set(0, spec.legH + spec.bodyR * 1.15 + spec.neckH * 0.3, -spec.bodyLen * 0.52);
    neck.rotation.x = -0.45;
    g.add(neck);

    const head = new THREE.Mesh(
      new THREE.BoxGeometry(spec.headW, spec.headH, spec.headL),
      bodyMat
    );
    const headY = spec.legH + spec.bodyR * 1.25 + spec.neckH * 0.62;
    const headZ = -spec.bodyLen * 0.68 - spec.headL * 0.35;
    head.position.set(0, headY, headZ);
    head.castShadow = true;
    g.add(head);

    // Arts-spesifikke horn, støttenner eller ører!
    if (spec.species === 'moose') {
      [-1, 1].forEach((s) => {
        const palm = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.34, 0.10), hornMat);
        palm.position.set(s * 0.42, headY + 0.24, headZ + 0.06);
        palm.rotation.z = s * -0.35;
        palm.rotation.y = s * 0.22;
        g.add(palm);
        for (let t = -1; t <= 1; t++) {
          const tine = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.28, 6), hornMat);
          tine.position.set(s * (0.52 + (t + 1) * 0.08), headY + 0.45, headZ + t * 0.11);
          g.add(tine);
        }
      });
    } else if (spec.species === 'bighorn') {
      [-1, 1].forEach((s) => {
        const curl = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.068, 8, 16, Math.PI * 1.55), hornMat);
        curl.position.set(s * 0.22, headY + 0.08, headZ + 0.06);
        curl.rotation.y = Math.PI / 2 + s * 0.22;
        g.add(curl);
      });
    } else if (spec.species === 'boar') {
      const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.28, 8), darkMat);
      snout.rotation.x = Math.PI / 2;
      snout.position.set(0, headY - 0.05, headZ - spec.headL * 0.55);
      g.add(snout);
      [-1, 1].forEach((s) => {
        const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.22, 6), hornMat);
        tusk.position.set(s * 0.14, headY - 0.02, headZ - spec.headL * 0.55);
        tusk.rotation.x = -0.35;
        tusk.rotation.z = s * -0.35;
        g.add(tusk);
      });
      const mane = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, spec.bodyLen * 0.9), darkMat);
      mane.position.set(0, spec.legH + spec.bodyR * 1.65, 0);
      g.add(mane);
    } else if (spec.species === 'coyote') {
      [-1, 1].forEach((s) => {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.18, 6), darkMat);
        ear.position.set(s * 0.09, headY + 0.15, headZ + 0.05);
        g.add(ear);
      });
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.52, 7), darkMat);
      tail.position.set(0, spec.legH + spec.bodyR * 0.7, spec.bodyLen * 0.68);
      tail.rotation.x = 2.35;
      g.add(tail);
    }

    // 4 leddede bein for naturlig galopp/gange
    const legs = [];
    const legGeo = new THREE.CylinderGeometry(spec.legR, spec.legR * 0.78, spec.legH, 7);
    legGeo.translate(0, -spec.legH * 0.5, 0);
    const lx = spec.bodyR * 0.62;
    const lz = spec.bodyLen * 0.42;
    [
      [-lx, -lz],
      [lx, -lz],
      [-lx, lz],
      [lx, lz]
    ].forEach(([px, pz]) => {
      const leg = new THREE.Mesh(legGeo, darkMat);
      leg.position.set(px, spec.legH, pz);
      leg.castShadow = true;
      g.add(leg);
      legs.push(leg);
    });
    g.userData.legs = legs;
    return g;
  }

  function spawnRegionalAnimals() {
    const animalRegions = [
      {
        species: 'moose',
        enName: 'Bull Moose',
        noName: 'Kronelg',
        bodyColor: 0x4b3322,
        accentColor: 0x2c1c12,
        bodyR: 0.48,
        bodyLen: 1.35,
        legH: 1.12,
        legR: 0.075,
        neckH: 0.55,
        headW: 0.30,
        headH: 0.32,
        headL: 0.56,
        hp: 4,
        food: 3,
        pelts: 2,
        gold: 22,
        speedWalk: 2.0,
        speedFlee: 7.4,
        defensiveCharge: false,
        spawns: [
          { x: -135, z: -245 }, { x: -45, z: -268 }, { x: 48, z: -285 },
          { x: 122, z: -252 }, { x: -88, z: -332 }, { x: 15, z: -348 },
          { x: -520, z: -640 }, { x: -280, z: -780 }, { x: 140, z: -760 }, { x: -690, z: -890 }
        ]
      },
      {
        species: 'bighorn',
        enName: 'Bighorn Mountain Ram',
        noName: 'Alpin Fjellbukk',
        bodyColor: 0x9b8b78,
        accentColor: 0x5c5046,
        bodyR: 0.34,
        bodyLen: 0.88,
        legH: 0.72,
        legR: 0.055,
        neckH: 0.34,
        headW: 0.24,
        headH: 0.24,
        headL: 0.38,
        hp: 3,
        food: 2,
        pelts: 2,
        gold: 18,
        speedWalk: 2.2,
        speedFlee: 7.8,
        defensiveCharge: false,
        spawns: [
          { x: -225, z: -235 }, { x: -328, z: -255 }, { x: -310, z: -338 },
          { x: -238, z: -342 }, { x: -355, z: -292 }, { x: -205, z: -298 },
          { x: -780, z: -790 }, { x: -940, z: -840 }, { x: -820, z: -960 }, { x: -640, z: -580 }
        ]
      },
      {
        species: 'boar',
        enName: 'Razorback Wild Boar',
        noName: 'Villsvin',
        bodyColor: 0x3d322c,
        accentColor: 0x221b18,
        bodyR: 0.32,
        bodyLen: 0.76,
        legH: 0.44,
        legR: 0.055,
        neckH: 0.16,
        headW: 0.28,
        headH: 0.26,
        headL: 0.40,
        hp: 3,
        food: 3,
        pelts: 1,
        gold: 16,
        speedWalk: 2.3,
        speedFlee: 6.8,
        defensiveCharge: true,
        spawns: [
          { x: 212, z: -195 }, { x: 245, z: -318 }, { x: 338, z: -235 },
          { x: 342, z: -312 }, { x: 225, z: -145 }, { x: 318, z: -172 },
          { x: 640, z: -590 }, { x: 810, z: -780 }, { x: 760, z: 680 }, { x: 920, z: 790 }
        ]
      },
      {
        species: 'coyote',
        enName: 'Desert Coyote',
        noName: 'Prærieulv',
        bodyColor: 0xc59b68,
        accentColor: 0x6e5032,
        bodyR: 0.22,
        bodyLen: 0.68,
        legH: 0.52,
        legR: 0.040,
        neckH: 0.22,
        headW: 0.19,
        headH: 0.18,
        headL: 0.34,
        hp: 2,
        food: 1,
        pelts: 2,
        gold: 15,
        speedWalk: 2.8,
        speedFlee: 8.6,
        defensiveCharge: false,
        spawns: [
          { x: -225, z: 225 }, { x: -332, z: 255 }, { x: -315, z: 338 },
          { x: -228, z: 342 }, { x: -95, z: 265 }, { x: 65, z: 275 },
          { x: -640, z: 620 }, { x: -810, z: 790 }, { x: -940, z: 920 }, { x: -480, z: 780 }
        ]
      }
    ];

    animalRegions.forEach((def) => {
      def.spawns.forEach((pt, idx) => {
        const group = makeQuadrupedAnimalMesh(def);
        const gy = getTerrainHeight(pt.x, pt.z);
        group.position.set(pt.x, gy, pt.z);
        group.rotation.y = (idx * 1.9) % (Math.PI * 2);
        expRoot.add(group);

        regionalAnimals.push({
          kind: 'exp_animal',
          species: def.species,
          def,
          group,
          homeX: pt.x,
          homeZ: pt.z,
          targetX: pt.x + 8,
          targetZ: pt.z - 6,
          alive: true,
          hp: def.hp,
          maxHp: def.hp,
          fleeTimer: 0,
          provokedTimer: 0,
          attackCooldown: 0,
          respawnTimer: 0,
          stride: idx * 0.8,
          radius: Math.max(0.38, def.bodyR * 1.25),
          hitCenterY: def.legH + def.bodyR * 0.9,
          hitRadius: Math.max(0.68, def.bodyLen * 0.72)
        });
      });
    });
  }

  // ==========================================================================
  // 6. 4 NYE REGIONALE MONSTERARTER + EVOLUSJON AV EKSISTERENDE MONSTRE
  //    1) Kjempeskorpion (Giant Venom Scorpion) — Øst/NØ Copper Mesa Badlands
  //    2) Skygge-Chupacabra (Shadow Chupacabra) — SV Ørken utenfor Sanctuary Springs
  //    3) Bein-Skinnvandrer (Antlered Bone Skinwalker) — NV Mørkeskog ved Silver Creek
  //    4) Magma-Golem (Obsidian Cinder Golem) — SØ Vulkansk ødemark ved Ironwood
  // ==========================================================================
  const regionalMonsters = [];
  const monsterProjectiles = [];

  const venomOrbGeo = new THREE.SphereGeometry(0.14, 8, 8);
  const projMats = {
    venom: new THREE.MeshBasicMaterial({ color: 0x58ff3a, toneMapped: false }),
    frost: new THREE.MeshBasicMaterial({ color: 0x48f5e8, toneMapped: false }),
    magma: new THREE.MeshBasicMaterial({ color: 0xff5a18, toneMapped: false }),
    shadow: new THREE.MeshBasicMaterial({ color: 0xd438ff, toneMapped: false })
  };

  function spawnMonsterProjectile(origin, targetPos, speed, damage, style = 'venom') {
    const mesh = new THREE.Mesh(venomOrbGeo, projMats[style] || projMats.venom);
    mesh.position.copy(origin);
    scene.add(mesh);
    const dir = targetPos.clone().sub(origin).normalize();
    monsterProjectiles.push({
      mesh,
      dir,
      prev: origin.clone(),
      speed,
      damage,
      style,
      life: 3.6
    });
  }

  function createScorpionModel() {
    const g = new THREE.Group();
    const chitinMat = new THREE.MeshStandardMaterial({ color: 0x3b1f16, roughness: 0.45, metalness: 0.22 });
    const segMat = new THREE.MeshStandardMaterial({ color: 0x562b1c, roughness: 0.52, metalness: 0.16 });
    const venomGlowMat = new THREE.MeshBasicMaterial({ color: 0x5cff3b, toneMapped: false });

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.46, 0.95, 6, 12), chitinMat);
    body.rotation.x = Math.PI / 2;
    body.scale.set(1.18, 0.68, 1.0);
    body.position.y = 0.56;
    body.castShadow = true;
    g.add(body);

    // Glødende grønne giftøyne
    [-0.16, 0.16].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), venomGlowMat);
      eye.position.set(ex, 0.66, -0.78);
      g.add(eye);
    });

    // 2 tunge klør foran
    const pincers = [];
    [-1, 1].forEach((s) => {
      const arm = new THREE.Group();
      arm.position.set(s * 0.48, 0.56, -0.62);
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.10, 0.62, 7), segMat);
      upper.rotation.x = Math.PI / 2;
      upper.rotation.z = s * -0.35;
      upper.position.set(s * 0.16, 0, -0.28);
      arm.add(upper);
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.52, 7), chitinMat);
      claw.rotation.x = -Math.PI / 2;
      claw.position.set(s * 0.26, 0.02, -0.65);
      arm.add(claw);
      g.add(arm);
      pincers.push(arm);
    });

    // 8 leddede edderkopp/skorpion-bein
    const legs = [];
    const legGeo = new THREE.CylinderGeometry(0.048, 0.032, 0.78, 6);
    legGeo.translate(0, -0.39, 0);
    for (let i = 0; i < 4; i++) {
      const lz = -0.42 + i * 0.32;
      [-1, 1].forEach((s) => {
        const leg = new THREE.Mesh(legGeo, segMat);
        leg.position.set(s * 0.48, 0.54, lz);
        leg.rotation.z = s * 0.62;
        g.add(leg);
        legs.push(leg);
      });
    }

    // Buet 5-leddet skorpionhale med lysende grønn giftbrodd!
    const tailPivot = new THREE.Group();
    tailPivot.position.set(0, 0.66, 0.65);
    const tailPts = [
      [0, 0.22, 0.22],
      [0, 0.56, 0.36],
      [0, 0.94, 0.30],
      [0, 1.28, 0.08],
      [0, 1.48, -0.22]
    ];
    tailPts.forEach(([tx, ty, tz], idx) => {
      const seg = new THREE.Mesh(new THREE.SphereGeometry(0.18 - idx * 0.018, 8, 8), idx % 2 === 0 ? chitinMat : segMat);
      seg.position.set(tx, ty, tz);
      tailPivot.add(seg);
    });
    const stinger = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.42, 7), venomGlowMat);
    stinger.position.set(0, 1.48, -0.48);
    stinger.rotation.x = -Math.PI * 0.62;
    tailPivot.add(stinger);
    g.add(tailPivot);

    const hpBar = createHealthBarOverhead(1.45, 0.20);
    hpBar.position.set(0, 2.55, 0);
    g.add(hpBar);

    g.userData.legs = legs;
    g.userData.pincers = pincers;
    g.userData.tailPivot = tailPivot;
    g.userData.hpBar = hpBar;
    return g;
  }

  function createChupacabraModel() {
    const g = new THREE.Group();
    const hideMat = new THREE.MeshStandardMaterial({ color: 0x281b2e, roughness: 0.78 });
    const spineMat = new THREE.MeshBasicMaterial({ color: 0xff2644, toneMapped: false });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.76, 6, 10), hideMat);
    torso.rotation.x = Math.PI / 2 - 0.28;
    torso.position.y = 0.72;
    torso.castShadow = true;
    g.add(torso);

    const head = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.52, 8), hideMat);
    head.rotation.x = -Math.PI / 2;
    head.position.set(0, 0.96, -0.58);
    g.add(head);

    [-0.10, 0.10].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), spineMat);
      eye.position.set(ex, 1.02, -0.74);
      g.add(eye);
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.28, 6), hideMat);
      ear.position.set(ex * 1.8, 1.22, -0.50);
      ear.rotation.z = ex < 0 ? 0.35 : -0.35;
      g.add(ear);
    });

    // Glødende blodrøde ryggpigger nedover ryggraden
    for (let s = 0; s < 6; s++) {
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.34 - s * 0.03, 6), spineMat);
      sp.position.set(0, 1.05 - s * 0.05, -0.30 + s * 0.18);
      sp.rotation.x = -0.35;
      g.add(sp);
    }

    const legs = [];
    const legGeo = new THREE.CylinderGeometry(0.055, 0.04, 0.68, 6);
    legGeo.translate(0, -0.34, 0);
    [[-0.24, -0.32], [0.24, -0.32], [-0.26, 0.34], [0.26, 0.34]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, hideMat);
      leg.position.set(lx, 0.66, lz);
      g.add(leg);
      legs.push(leg);
    });

    const hpBar = createHealthBarOverhead(1.35, 0.19);
    hpBar.position.set(0, 1.75, 0);
    g.add(hpBar);

    g.userData.legs = legs;
    g.userData.hpBar = hpBar;
    return g;
  }

  function createSkinwalkerModel() {
    const g = new THREE.Group();
    const cloakMat = new THREE.MeshStandardMaterial({ color: 0x1e2422, roughness: 0.92 });
    const boneMat = new THREE.MeshStandardMaterial({ color: 0xe6dec8, roughness: 0.55 });
    const soulGlowMat = new THREE.MeshBasicMaterial({ color: 0x42f5e6, toneMapped: false });

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.46, 1.45, 9), cloakMat);
    torso.position.y = 1.42;
    torso.castShadow = true;
    g.add(torso);

    const soulCore = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), soulGlowMat);
    soulCore.position.set(0, 1.52, -0.18);
    g.add(soulCore);

    // Bleket hjorteskalle med vridde gevirhorn
    const skull = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.58, 7), boneMat);
    skull.rotation.x = -Math.PI / 2 + 0.25;
    skull.position.set(0, 2.28, -0.18);
    g.add(skull);

    [-0.09, 0.09].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), soulGlowMat);
      eye.position.set(ex, 2.34, -0.34);
      g.add(eye);
    });

    [-1, 1].forEach((s) => {
      const mainBranch = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.85, 6), boneMat);
      mainBranch.position.set(s * 0.28, 2.68, -0.05);
      mainBranch.rotation.z = s * -0.48;
      g.add(mainBranch);
      const tine = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.42, 6), boneMat);
      tine.position.set(s * 0.44, 2.95, -0.16);
      tine.rotation.x = -0.35;
      g.add(tine);
    });

    const arms = [];
    [-1, 1].forEach((s) => {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.045, 1.18, 6), cloakMat);
      arm.geometry.translate(0, -0.55, 0);
      arm.position.set(s * 0.42, 1.98, 0);
      arm.rotation.x = -0.55;
      g.add(arm);
      arms.push(arm);
    });

    const legs = [];
    [-0.18, 0.18].forEach((lx) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.92, 6), cloakMat);
      leg.geometry.translate(0, -0.46, 0);
      leg.position.set(lx, 0.88, 0);
      g.add(leg);
      legs.push(leg);
    });

    const hpBar = createHealthBarOverhead(1.55, 0.21);
    hpBar.position.set(0, 3.35, 0);
    g.add(hpBar);

    g.userData.arms = arms;
    g.userData.legs = legs;
    g.userData.hpBar = hpBar;
    return g;
  }

  function createMagmaGolemModel() {
    const g = new THREE.Group();
    const obsidianMat = new THREE.MeshStandardMaterial({ color: 0x282326, roughness: 0.82, metalness: 0.18 });
    const lavaGlowMat = new THREE.MeshBasicMaterial({ color: 0xff5e14, toneMapped: false });

    const chest = new THREE.Mesh(new THREE.DodecahedronGeometry(0.76, 0), obsidianMat);
    chest.position.y = 1.62;
    chest.scale.set(1.22, 1.05, 0.92);
    chest.castShadow = true;
    g.add(chest);

    const magmaHeart = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 0), lavaGlowMat);
    magmaHeart.position.set(0, 1.62, -0.38);
    g.add(magmaHeart);

    const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.36, 0), obsidianMat);
    head.position.set(0, 2.42, -0.14);
    g.add(head);
    [-0.12, 0.12].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), lavaGlowMat);
      eye.position.set(ex, 2.46, -0.44);
      g.add(eye);
    });

    const arms = [];
    [-1, 1].forEach((s) => {
      const armGrp = new THREE.Group();
      armGrp.position.set(s * 0.96, 1.98, 0);
      const boulderShoulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.34, 0), obsidianMat);
      armGrp.add(boulderShoulder);
      const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.95, 0.38), obsidianMat);
      forearm.position.set(0, -0.62, -0.10);
      armGrp.add(forearm);
      const fist = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 0), lavaGlowMat);
      fist.position.set(0, -1.12, -0.14);
      armGrp.add(fist);
      g.add(armGrp);
      arms.push(armGrp);
    });

    const legs = [];
    [-0.42, 0.42].forEach((lx) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.98, 0.44), obsidianMat);
      leg.geometry.translate(0, -0.49, 0);
      leg.position.set(lx, 0.98, 0);
      g.add(leg);
      legs.push(leg);
    });

    const hpBar = createHealthBarOverhead(1.65, 0.22);
    hpBar.position.set(0, 3.08, 0);
    g.add(hpBar);

    g.userData.arms = arms;
    g.userData.legs = legs;
    g.userData.hpBar = hpBar;
    return g;
  }

  function spawnRegionalMonsters() {
    const monsterDefs = [
      {
        species: 'scorpion',
        enName: 'GIANT VENOM SCORPION',
        noName: 'KJEMPESKORPION',
        barColor: '#58f244',
        impactColor: 0x58ff3a,
        projStyle: 'venom',
        hp: 11,
        speed: 3.35,
        meleeDmg: 22,
        rangedDmg: 15,
        rangedCooldown: 3.4,
        gold: 38,
        pelts: 1,
        radius: 0.72,
        hitCenterY: 0.85,
        hitRadius: 1.15,
        undeadBonus: false,
        questTags: ['combat_any', 'elite_foe', 'bandit_any', 'caldera_foe'],
        buildMesh: createScorpionModel,
        spawns: [
          { x: 225, z: -185 }, { x: 342, z: -195 }, { x: 348, z: -315 },
          { x: 242, z: -328 }, { x: 258, z: -45 }, { x: 325, z: 32 },
          { x: 680, z: -660 }, { x: 820, z: -915 }, { x: 965, z: -810 }, { x: 760, z: -420 }
        ]
      },
      {
        species: 'chupacabra',
        enName: 'SHADOW CHUPACABRA',
        noName: 'SKYGGE-CHUPACABRA',
        barColor: '#ff3856',
        impactColor: 0xff2848,
        projStyle: '',
        hp: 9,
        speed: 4.45,
        meleeDmg: 20,
        rangedDmg: 0,
        rangedCooldown: 99,
        gold: 36,
        pelts: 1,
        radius: 0.52,
        hitCenterY: 0.82,
        hitRadius: 0.92,
        undeadBonus: true,
        questTags: ['combat_any', 'night_any', 'oasis_foe', 'apex_predator'],
        buildMesh: createChupacabraModel,
        spawns: [
          { x: -222, z: 215 }, { x: -342, z: 238 }, { x: -345, z: 342 },
          { x: -225, z: 348 }, { x: -175, z: 295 }, { x: -355, z: 185 },
          { x: -680, z: 690 }, { x: -815, z: 935 }, { x: -960, z: 830 }, { x: -740, z: 480 }
        ]
      },
      {
        species: 'skinwalker',
        enName: 'BONE SKINWALKER',
        noName: 'BEIN-SKINNVANDRER',
        barColor: '#42f5e6',
        impactColor: 0x48f5e8,
        projStyle: 'frost',
        hp: 14,
        speed: 3.15,
        meleeDmg: 24,
        rangedDmg: 17,
        rangedCooldown: 3.8,
        gold: 48,
        pelts: 2,
        radius: 0.58,
        hitCenterY: 1.45,
        hitRadius: 1.05,
        undeadBonus: true,
        questTags: ['combat_any', 'night_any', 'wendigo', 'elite_foe'],
        buildMesh: createSkinwalkerModel,
        spawns: [
          { x: -215, z: -218 }, { x: -342, z: -228 }, { x: -348, z: -345 },
          { x: -228, z: -352 }, { x: -185, z: -312 }, { x: -358, z: -185 },
          { x: -690, z: -710 }, { x: -790, z: -945 }, { x: -945, z: -830 }, { x: -580, z: -820 }
        ]
      },
      {
        species: 'magma_golem',
        enName: 'MAGMA COLOSSUS',
        noName: 'MAGMA-GOLEM',
        barColor: '#ff7424',
        impactColor: 0xff5a18,
        projStyle: 'magma',
        hp: 18,
        speed: 2.55,
        meleeDmg: 28,
        rangedDmg: 20,
        rangedCooldown: 4.2,
        gold: 58,
        pelts: 0,
        radius: 0.85,
        hitCenterY: 1.55,
        hitRadius: 1.28,
        undeadBonus: false,
        questTags: ['combat_any', 'caldera_foe', 'brimstone_foe', 'elite_foe'],
        buildMesh: createMagmaGolemModel,
        spawns: [
          { x: 218, z: 215 }, { x: 342, z: 225 }, { x: 348, z: 342 },
          { x: 228, z: 348 }, { x: 235, z: 162 }, { x: 345, z: 168 },
          { x: 690, z: 685 }, { x: 810, z: 945 }, { x: 955, z: 840 }, { x: 740, z: 510 }
        ]
      },
      // 4 KOLOSSALE VERDENSENDE-BOSSER (~990..1015m ut i hvert hjørne av 2.4km-kontinentet!)
      {
        species: 'boss_kaelith',
        isContinentBoss: true,
        bossId: 'kaelith',
        enName: '★ KAELITH — GLACIER TITAN',
        noName: '★ KAELITH — ISBRE-TITANEN',
        barColor: '#5cf2ff',
        impactColor: 0x5cf2ff,
        projStyle: 'frost',
        hp: 85,
        speed: 2.95,
        meleeDmg: 34,
        rangedDmg: 24,
        rangedCooldown: 3.1,
        gold: 280,
        pelts: 5,
        scaleMult: 1.68,
        radius: 1.15,
        hitCenterY: 2.35,
        hitRadius: 1.75,
        undeadBonus: true,
        questTags: ['combat_any', 'any_boss', 'elite_foe', 'wendigo', 'night_any'],
        buildMesh: createSkinwalkerModel,
        spawns: [{ x: -990, z: -985 }]
      },
      {
        species: 'boss_solaris',
        isContinentBoss: true,
        bossId: 'solaris',
        enName: '★ SOLARIS — SUNSTONE EMPEROR',
        noName: '★ SOLARIS — SOLKLØFT-KEISEREN',
        barColor: '#ffd447',
        impactColor: 0xffd447,
        projStyle: 'venom',
        hp: 90,
        speed: 3.25,
        meleeDmg: 35,
        rangedDmg: 25,
        rangedCooldown: 2.9,
        gold: 295,
        pelts: 4,
        scaleMult: 1.85,
        radius: 1.25,
        hitCenterY: 1.55,
        hitRadius: 1.95,
        undeadBonus: false,
        questTags: ['combat_any', 'any_boss', 'elite_foe', 'bandit_any', 'caldera_foe'],
        buildMesh: createScorpionModel,
        spawns: [{ x: 1005, z: -955 }]
      },
      {
        species: 'boss_mirage',
        isContinentBoss: true,
        bossId: 'mirage_sovereign',
        enName: '★ MIRAGE SOVEREIGN — DUNE HYDRA',
        noName: '★ OASE-HERSKEREN — SKYGGEBEIST',
        barColor: '#ff4278',
        impactColor: 0xff4278,
        projStyle: 'shadow',
        hp: 95,
        speed: 4.15,
        meleeDmg: 36,
        rangedDmg: 24,
        rangedCooldown: 3.2,
        gold: 310,
        pelts: 5,
        scaleMult: 1.95,
        radius: 1.10,
        hitCenterY: 1.55,
        hitRadius: 1.75,
        undeadBonus: true,
        questTags: ['combat_any', 'any_boss', 'elite_foe', 'oasis_foe', 'night_any'],
        buildMesh: createChupacabraModel,
        spawns: [{ x: -995, z: 985 }]
      },
      {
        species: 'boss_ignis',
        isContinentBoss: true,
        bossId: 'ignis_rex',
        enName: '★ IGNIS REX — OVERLORD OF ASHENFORGE',
        noName: '★ IGNIS REX — VULKAN-OVERHERREN',
        barColor: '#ff5e18',
        impactColor: 0xff5e18,
        projStyle: 'magma',
        hp: 115,
        speed: 2.75,
        meleeDmg: 40,
        rangedDmg: 28,
        rangedCooldown: 2.8,
        gold: 350,
        pelts: 4,
        scaleMult: 1.72,
        radius: 1.38,
        hitCenterY: 2.55,
        hitRadius: 2.10,
        undeadBonus: false,
        questTags: ['combat_any', 'any_boss', 'elite_foe', 'caldera_foe', 'brimstone_foe'],
        buildMesh: createMagmaGolemModel,
        spawns: [{ x: 995, z: 995 }]
      }
    ];

    monsterDefs.forEach((def) => {
      def.spawns.forEach((pt, idx) => {
        const group = def.buildMesh();
        if (def.scaleMult) {
          group.scale.setScalar(def.scaleMult);
        }
        const gy = getTerrainHeight(pt.x, pt.z);
        group.position.set(pt.x, gy, pt.z);
        repelGroupFromSafeZonesAndCampfires(group, def.radius);
        expRoot.add(group);

        const maxHp = Math.round(def.hp * (getPrestigeHpMult ? getPrestigeHpMult() : 1));
        const label = getLang() === 'no' ? def.noName : def.enName;
        if (group.userData.hpBar) {
          group.userData.hpBar.userData.drawBar(maxHp, maxHp, label, def.barColor);
        }

        regionalMonsters.push({
          kind: 'exp_monster',
          species: def.species,
          def,
          group,
          homeX: pt.x,
          homeZ: pt.z,
          wanderX: pt.x + 6,
          wanderZ: pt.z - 6,
          alive: true,
          hp: maxHp,
          maxHp,
          attackCooldown: 1.0 + (idx % 3) * 0.4,
          rangedTimer: def.rangedCooldown * (0.5 + (idx % 3) * 0.25),
          leapTimer: 2.5 + idx * 0.5,
          igniteTimer: 0,
          igniteTick: 0,
          respawnTimer: 0,
          stride: idx * 1.1,
          radius: def.radius,
          hitCenterY: def.hitCenterY,
          hitRadius: def.hitRadius
        });
      });
    });
  }

  // --- Monster-evolusjon på eksisterende monstre (glødende mutasjonskrystaller, sprang og skyggeprosjektiler!) ---
  let existingMonstersDecorated = false;
  function decorateExistingMonstersAsEvolved() {
    if (existingMonstersDecorated || !entities) return;
    existingMonstersDecorated = true;

    const evoCrystalGeo = new THREE.OctahedronGeometry(0.11, 0);
    const vampEvoMat = new THREE.MeshBasicMaterial({ color: 0xd938ff, toneMapped: false });
    const wolfEvoMat = new THREE.MeshBasicMaterial({ color: 0xff5428, toneMapped: false });

    if (Array.isArray(entities.nightEnemies)) {
      entities.nightEnemies.forEach((ne, idx) => {
        if (!ne || !ne.group || ne.isSandwraithBoss) return;
        // Gi annenhver nattfiende og alle overflate-stalkere evolverte skulderkrystaller og avstands-skyggekule!
        if (idx % 2 === 0 || ne.isAlwaysActiveSurface) {
          ne.isEvolvedFiend = true;
          ne.evoShotTimer = 3.2 + (idx % 4) * 0.8;
          [-0.26, 0.26].forEach((sx) => {
            const cr = new THREE.Mesh(evoCrystalGeo, vampEvoMat);
            cr.position.set(sx, 1.52, 0.08);
            ne.group.add(cr);
          });
        }
      });
    }

    if (Array.isArray(entities.wolfList)) {
      entities.wolfList.forEach((w, idx) => {
        if (!w || !w.group) return;
        if (idx % 2 === 1 || w.isAlphaWolf || w.isHellhound) {
          w.isEvolvedPredator = true;
          w.evoLungeTimer = 3.5 + (idx % 3);
          const crest = new THREE.Mesh(evoCrystalGeo, wolfEvoMat);
          crest.scale.set(0.75, 1.35, 0.75);
          crest.position.set(0, 0.76, -0.15);
          w.group.add(crest);
        }
      });
    }
  }

  // ==========================================================================
  // 7. KAMPTREFF, SKADE, DYNAMITT, KLASSE-ANGREP OG REX-INTEGRASJON
  // ==========================================================================
  function considerExpansionHits(a, b, considerFn) {
    for (let i = 0; i < regionalAnimals.length; i++) {
      const an = regionalAnimals[i];
      if (!an.alive || !an.group.visible) continue;
      considerFn(a, b, an, 'exp_animal', an.hitCenterY, an.hitRadius);
    }
    for (let i = 0; i < regionalMonsters.length; i++) {
      const mo = regionalMonsters[i];
      if (!mo.alive || !mo.group.visible) continue;
      considerFn(a, b, mo, 'exp_monster', mo.hitCenterY, mo.hitRadius);
    }
  }

  function computePlayerHitDamage(bulletInfo, undeadBonus = false) {
    const baseWep = getWeaponDamage ? getWeaponDamage() : 1;
    const mult = bulletInfo && bulletInfo.dmgMult ? bulletInfo.dmgMult : 1;
    const isSilver = !!(bulletInfo && bulletInfo.isSilverBolt);
    const uMult = undeadBonus ? (isSilver ? 2.6 : Math.max(1, getNightMonsterDamage ? getNightMonsterDamage() * 0.75 : 1)) : 1;
    return Math.max(1, baseWep * mult * uMult);
  }

  function damageRegionalAnimal(animal, bulletInfo, rawOverride = 0) {
    if (!animal || !animal.alive) return;
    const dmg = rawOverride > 0 ? rawOverride : computePlayerHitDamage(bulletInfo, false);
    animal.hp = Math.max(0, animal.hp - dmg);
    if (audio && audio.playFleshHitSound) audio.playFleshHitSound();

    if (animal.hp > 0) {
      if (animal.def.defensiveCharge) {
        animal.provokedTimer = 4.5;
      } else {
        animal.fleeTimer = 5.5;
      }
      return;
    }

    animal.alive = false;
    animal.group.visible = false;
    animal.respawnTimer = 28;
    if (spawnSparkBurst) spawnSparkBurst(animal.group.position, 10, 0xffe082, 1.0);

    const foodGain = animal.def.food + (getExtraFoodBonus ? getExtraFoodBonus() : 0);
    const peltGain = animal.def.pelts + (getExtraPeltBonus ? getExtraPeltBonus() : 0);
    playerState.food += foodGain;
    playerState.pelt += peltGain;
    awardScaledGold(animal.def.gold);

    storyState.act1Deer = (storyState.act1Deer || 0) + 1;
    storyState.totalKills = (storyState.totalKills || 0) + 1;
    if (audio && audio.playGoldPickupSound) audio.playGoldPickupSound();

    const isNo = getLang() === 'no';
    const aName = isNo ? animal.def.noName : animal.def.enName;
    showFrontierToast(
      isNo
        ? `🦌 ${aName} felt! +${foodGain} Mat, +${peltGain} Skinn & Gull!`
        : `🦌 ${aName} hunted! +${foodGain} Food, +${peltGain} Pelts & Gold!`,
      3.0
    );

    recordQuestKill(['wild_beast', 'deer_any', 'deer']);
    checkStoryProgression();
    updateStatusUI();
  }

  function damageRegionalMonster(monster, bulletInfo, rawOverride = 0) {
    if (!monster || !monster.alive) return;
    const isSilver = !!(bulletInfo && bulletInfo.isSilverBolt);
    const dmg = rawOverride > 0 ? rawOverride : computePlayerHitDamage(bulletInfo, monster.def.undeadBonus);
    monster.hp = Math.max(0, monster.hp - dmg);
    if (isSilver && monster.def.undeadBonus) {
      monster.igniteTimer = 2.8;
      monster.igniteTick = 0.45;
    }
    if (audio && audio.playFleshHitSound) audio.playFleshHitSound();

    const isNo = getLang() === 'no';
    const mName = isNo ? monster.def.noName : monster.def.enName;
    if (monster.group.userData.hpBar) {
      monster.group.userData.hpBar.userData.drawBar(monster.hp, monster.maxHp, mName, monster.def.barColor);
    }

    if (monster.hp > 0) return;

    monster.alive = false;
    monster.igniteTimer = 0;
    monster.group.visible = false;
    monster.respawnTimer = monster.def.isContinentBoss ? 85 : 34;

    if (monster.def.isContinentBoss && monster.def.bossId) {
      if (!Array.isArray(storyState.continentBossesSlain)) {
        storyState.continentBossesSlain = [];
      }
      if (!storyState.continentBossesSlain.includes(monster.def.bossId)) {
        storyState.continentBossesSlain.push(monster.def.bossId);
      }
      if (storyState.currentLevel >= 51) {
        storyState.prestigeBosses = (storyState.prestigeBosses || 0) + 1;
      }
    }

    tmpVecA.copy(monster.group.position);
    tmpVecA.y += 1.1;
    if (spawnImpact) spawnImpact(tmpVecA, monster.def.impactColor, 0.85);
    if (spawnVampireAshDissolution) spawnVampireAshDissolution(monster.group.position, 1.25);

    const goldGain = awardScaledGold(monster.def.gold);
    if (monster.def.pelts > 0) {
      playerState.pelt += monster.def.pelts + (getExtraPeltBonus ? getExtraPeltBonus() : 0);
    }
    storyState.eliteKills = (storyState.eliteKills || 0) + 1;
    storyState.totalKills = (storyState.totalKills || 0) + 1;
    if (audio && audio.playGoldPickupSound) audio.playGoldPickupSound();

    showFrontierToast(
      isNo
        ? `⚔ ${mName} beseiret! +${goldGain} Gull${monster.def.pelts > 0 ? ` & +${monster.def.pelts} Skinn` : ''}!`
        : `⚔ ${mName} slain! +${goldGain} Gold${monster.def.pelts > 0 ? ` & +${monster.def.pelts} Pelt` : ''}!`,
      3.4
    );

    recordQuestKill(monster.def.questTags);
    checkStoryProgression();
    updateStatusUI();
  }

  function damageExpansionTarget(hit, _direction, bulletInfo) {
    if (!hit) return false;
    if (hit.type === 'exp_animal') {
      damageRegionalAnimal(hit.entity || hit.target, bulletInfo);
      return true;
    }
    if (hit.type === 'exp_monster') {
      damageRegionalMonster(hit.entity || hit.target, bulletInfo);
      return true;
    }
    return false;
  }

  function applyDynamiteToExpansion(blastPos, radius) {
    for (let i = 0; i < regionalMonsters.length; i++) {
      const mo = regionalMonsters[i];
      if (!mo.alive || !mo.group.visible) continue;
      const d = Math.hypot(mo.group.position.x - blastPos.x, mo.group.position.z - blastPos.z);
      if (d < radius) {
        const dmg = Math.max(4, Math.round(10 * (1 - d / (radius * 1.15))));
        damageRegionalMonster(mo, null, dmg);
      }
    }
    for (let i = 0; i < regionalAnimals.length; i++) {
      const an = regionalAnimals[i];
      if (!an.alive || !an.group.visible) continue;
      const d = Math.hypot(an.group.position.x - blastPos.x, an.group.position.z - blastPos.z);
      if (d < radius) {
        damageRegionalAnimal(an, null, 6);
      }
    }
  }

  // Sjekk både ved-oppsamling på skudd og klikk på bybutikker / vedstabler
  function checkBulletFirewoodHit(prevPos, currPos) {
    for (let i = 0; i < firewoodPickups.length; i++) {
      const fw = firewoodPickups[i];
      if (fw.collected) continue;
      if (segmentPointDistance(prevPos, currPos, fw.worldPos) < 0.72) {
        collectFirewood(fw);
        return true;
      }
    }
    return false;
  }

  function tryRayExpansionInteractions(raycaster) {
    // 1) Klikk på bybutikk i en av de 4 nye byene
    if (allOuterShopHitMeshes.length > 0) {
      const hits = raycaster.intersectObjects(allOuterShopHitMeshes, false);
      if (hits.length > 0 && hits[0].distance <= 13.5) {
        const tab = hits[0].object.userData.outerShopTab || 'armor';
        if (openStoreModal) openStoreModal(true, tab);
        return true;
      }
    }
    // 2) Klikk direkte på en vedstabel innenfor 6.5m
    if (firewoodHitMeshes.length > 0) {
      const fHits = raycaster.intersectObjects(firewoodHitMeshes, false);
      if (fHits.length > 0 && fHits[0].distance <= 6.5) {
        const fw = fHits[0].object.userData.firewoodEntry;
        if (fw && !fw.collected) {
          collectFirewood(fw);
          return true;
        }
      }
    }
    return false;
  }

  function getNearbyOuterTownShop() {
    const px = playerRig.position.x;
    const pz = playerRig.position.z;
    for (let i = 0; i < outerTownShopAnchors.length; i++) {
      const a = outerTownShopAnchors[i];
      if (Math.hypot(px - a.x, pz - a.z) <= 6.5) {
        return a;
      }
    }
    return null;
  }

  // ==========================================================================
  // 8. HOVEDLØKKE-OPPDATERING (0 PER-FRAME ALLOKERINGER)
  // ==========================================================================
  function stepToward(group, tx, tz, speed, dt, radius) {
    const dx = tx - group.position.x;
    const dz = tz - group.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.05) {
      const step = Math.min(dist, speed * dt);
      group.position.x += (dx / dist) * step;
      group.position.z += (dz / dist) * step;
      group.rotation.y = Math.atan2(-dx, -dz);
    }
    repelGroupFromSafeZonesAndCampfires(group, radius);
    resolveWallCollisions(group.position, radius, true);
    group.position.x = THREE.MathUtils.clamp(group.position.x, -1172, 1172);
    group.position.z = THREE.MathUtils.clamp(group.position.z, -1172, 1172);
    group.position.y = getTerrainHeight(group.position.x, group.position.z);
  }

  function animateSimpleLegs(legs, stride, amp = 0.45) {
    if (!legs || legs.length === 0) return;
    for (let i = 0; i < legs.length; i++) {
      const phase = i % 2 === 0 ? 0 : Math.PI;
      legs[i].rotation.x = Math.sin(stride + phase) * amp;
    }
  }

  function updateFrontierExpansion(dt, worldTime) {
    decorateExistingMonstersAsEvolved();

    const px = playerRig.position.x;
    const pz = playerRig.position.z;
    const playerSafe = getPlayerHiddenStatus ? getPlayerHiddenStatus() : isPointSafeFromMonsters(px, pz);

    // 1) Oppdater vedstabler (nærhets-oppsamling innenfor 2,75m + respawn)
    for (let i = 0; i < firewoodPickups.length; i++) {
      const fw = firewoodPickups[i];
      if (fw.collected) {
        fw.respawnTimer -= dt;
        if (fw.respawnTimer <= 0) {
          fw.collected = false;
          fw.group.visible = true;
        }
        continue;
      }
      fw.ring.material.opacity = 0.25 + Math.sin(worldTime * 3.2 + i) * 0.12;
      const dx = px - fw.worldPos.x;
      const dz = pz - fw.worldPos.z;
      if (dx * dx + dz * dz < 7.6 && Math.abs(playerRig.position.y - fw.group.position.y) < 2.6) {
        collectFirewood(fw);
      }
    }

    // 2) Oppdater byenes faste bålflammer
    for (let i = 0; i < townCampfireFlames.length; i++) {
      const fl = townCampfireFlames[i];
      const ph = fl.userData.phase || 0;
      const sy = 0.85 + Math.sin(worldTime * 11.5 + ph) * 0.20;
      fl.scale.set(0.94, sy, 0.94);
      fl.position.y = fl.userData.baseY * (0.92 + 0.08 * sy);
    }

    // 3) Oppdater spillerens tente leirbål (nedtelling, helbredelse og monster-frykt!)
    if (activeCampfire.active) {
      activeCampfire.timeLeft -= dt;
      if (activeCampfire.timeLeft <= 0) {
        activeCampfire.active = false;
        activeCampfire.timeLeft = 0;
        campfireGroup.visible = false;
        showFrontierToast(
          getLang() === 'no'
            ? '🔥 Leirbålet sluknet! Sank 3 Ved og trykk [X] for å tenne nytt bål.'
            : '🔥 Your campfire burned out! Gather 3 Wood and press [X] to light a new fire.',
          4.2
        );
        syncCampfireButtonsUI();
        updateStatusUI();
      } else {
        for (let f = 0; f < playerCampfireFlames.length; f++) {
          const fl = playerCampfireFlames[f];
          const ph = fl.userData.phase;
          const sy = 0.84 + Math.sin(worldTime * 13.5 + ph) * 0.24 + Math.cos(worldTime * 21.0 + ph) * 0.08;
          fl.scale.set(0.92 + Math.cos(worldTime * 9.5 + ph) * 0.08, sy, 0.92);
          fl.position.y = fl.userData.baseY * (0.9 + 0.1 * sy);
        }
        for (let s = 0; s < playerCampfireSparks.length; s++) {
          const sp = playerCampfireSparks[s];
          const u = (worldTime * 0.75 + sp.userData.offset) % 1;
          const ang = sp.userData.angle + worldTime * 1.8;
          sp.position.set(Math.cos(ang) * (0.18 + u * 0.35), 0.45 + u * 1.65, Math.sin(ang) * (0.18 + u * 0.35));
          sp.scale.setScalar(Math.max(0.15, 1.0 - u));
        }
        if (campfirePointLight) {
          campfirePointLight.intensity = 5.4 + Math.sin(worldTime * 12.2) * 0.9 + Math.cos(worldTime * 23.0) * 0.45;
        }
        if (campfireSanctuaryRing) {
          campfireSanctuaryRing.material.opacity = 0.30 + Math.sin(worldTime * 2.8) * 0.10;
        }
        if (campfireBannerMesh && camera) {
          campfireBannerMesh.lookAt(camera.getWorldPosition(tmpVecA));
        }
        const secNow = Math.max(1, Math.ceil(activeCampfire.timeLeft));
        const langNow = getLang();
        if (secNow !== campfireLastShownSec || langNow !== campfireLastShownLang) {
          campfireLastShownSec = secNow;
          campfireLastShownLang = langNow;
          updateCampfireBannerTexture(secNow);
          syncCampfireButtonsUI();
        }

        // Helbred spilleren rolig ved leirbålet eller inne i et av de 4 nye By-Fristedene!
        const distFireSq = (px - activeCampfire.x) ** 2 + (pz - activeCampfire.z) ** 2;
        if (distFireSq <= CAMPFIRE_SAFE_RADIUS * CAMPFIRE_SAFE_RADIUS && playerState.health < playerState.maxHealth) {
          activeCampfire.healAccum += dt * 3.5;
          if (activeCampfire.healAccum >= 1.0) {
            const addHp = Math.floor(activeCampfire.healAccum);
            activeCampfire.healAccum -= addHp;
            playerState.health = Math.min(playerState.maxHealth, playerState.health + addHp);
            updateStatusUI();
          }
        }
      }
    }

    // Helbred også rolig inne i et av de 4 nye By-Fristedene
    if (playerState.health < playerState.maxHealth) {
      for (let i = 0; i < outerSafeZones.length; i++) {
        const sz = outerSafeZones[i];
        if (px >= sz.minX && px <= sz.maxX && pz >= sz.minZ && pz <= sz.maxZ) {
          activeCampfire.healAccum += dt * 4.0;
          if (activeCampfire.healAccum >= 1.0) {
            const addHp = Math.floor(activeCampfire.healAccum);
            activeCampfire.healAccum -= addHp;
            playerState.health = Math.min(playerState.maxHealth, playerState.health + addHp);
            updateStatusUI();
          }
          break;
        }
      }
    }

    // 4) Oppdater de 4 nye dyreartene i sine respektive biomer
    for (let i = 0; i < regionalAnimals.length; i++) {
      const an = regionalAnimals[i];
      if (!an.alive) {
        an.respawnTimer -= dt;
        if (an.respawnTimer <= 0) {
          an.alive = true;
          an.hp = an.maxHp;
          an.fleeTimer = 0;
          an.provokedTimer = 0;
          an.group.position.set(an.homeX, getTerrainHeight(an.homeX, an.homeZ), an.homeZ);
          an.group.visible = true;
        }
        continue;
      }

      const dPlayer = Math.hypot(px - an.group.position.x, pz - an.group.position.z);
      let moveSpd = 0;

      if (an.provokedTimer > 0 && !playerSafe && dPlayer < 18) {
        an.provokedTimer = Math.max(0, an.provokedTimer - dt);
        if (dPlayer > 1.7) {
          stepToward(an.group, px, pz, an.def.speedFlee * 0.92, dt, an.radius);
          moveSpd = an.def.speedFlee;
        } else {
          an.attackCooldown = Math.max(0, an.attackCooldown - dt);
          if (an.attackCooldown <= 0) {
            an.attackCooldown = 1.4;
            damagePlayer(12);
          }
        }
      } else if (an.fleeTimer > 0 || dPlayer < 10.5) {
        an.fleeTimer = Math.max(0, an.fleeTimer - dt);
        const awayX = an.group.position.x + (an.group.position.x - px) * 2.0;
        const awayZ = an.group.position.z + (an.group.position.z - pz) * 2.0;
        stepToward(an.group, awayX, awayZ, an.def.speedFlee, dt, an.radius);
        moveSpd = an.def.speedFlee;
      } else {
        const dTarget = Math.hypot(an.targetX - an.group.position.x, an.targetZ - an.group.position.z);
        if (dTarget < 2.0) {
          const ang = (worldTime * 0.7 + i * 2.1) % (Math.PI * 2);
          an.targetX = THREE.MathUtils.clamp(an.homeX + Math.cos(ang) * 22, -1165, 1165);
          an.targetZ = THREE.MathUtils.clamp(an.homeZ + Math.sin(ang) * 22, -1165, 1165);
        }
        stepToward(an.group, an.targetX, an.targetZ, an.def.speedWalk, dt, an.radius);
        moveSpd = an.def.speedWalk;
      }

      an.stride += dt * (moveSpd > 3.5 ? 13 : 6);
      animateSimpleLegs(an.group.userData.legs, an.stride, moveSpd > 3.5 ? 0.55 : 0.28);
    }

    // 5) Oppdater de 4 nye regionale monstrene (med frykt/flukt fra bål og fristeder!)
    if (camera) camera.getWorldPosition(tmpVecC);
    for (let i = 0; i < regionalMonsters.length; i++) {
      const mo = regionalMonsters[i];
      if (!mo.alive) {
        mo.respawnTimer -= dt;
        if (mo.respawnTimer <= 0) {
          mo.maxHp = Math.round(mo.def.hp * (getPrestigeHpMult ? getPrestigeHpMult() : 1));
          mo.hp = mo.maxHp;
          mo.alive = true;
          mo.igniteTimer = 0;
          mo.group.position.set(mo.homeX, getTerrainHeight(mo.homeX, mo.homeZ), mo.homeZ);
          repelGroupFromSafeZonesAndCampfires(mo.group, mo.radius);
          mo.group.visible = true;
          if (mo.group.userData.hpBar) {
            const mName = getLang() === 'no' ? mo.def.noName : mo.def.enName;
            mo.group.userData.hpBar.userData.drawBar(mo.hp, mo.maxHp, mName, mo.def.barColor);
          }
        }
        continue;
      }

      if (mo.igniteTimer > 0) {
        mo.igniteTimer = Math.max(0, mo.igniteTimer - dt);
        mo.igniteTick -= dt;
        if (mo.igniteTick <= 0) {
          mo.igniteTick = 0.5;
          if (spawnSparkBurst) spawnSparkBurst(mo.group.position, 4, 0xff7824, 0.8);
          damageRegionalMonster(mo, null, 1);
          if (!mo.alive) continue;
        }
      }

      if (mo.group.userData.hpBar && camera) {
        mo.group.userData.hpBar.lookAt(tmpVecC);
      }

      const dPlayer = Math.hypot(px - mo.group.position.x, pz - mo.group.position.z);
      const dFire = activeCampfire.active ? Math.hypot(activeCampfire.x - mo.group.position.x, activeCampfire.z - mo.group.position.z) : 999;
      let moveSpd = 0;

      // Hvis et monster kommer nær leirbålet (< 13.5m), rygger det skremt vekk fra flammene!
      if (dFire < CAMPFIRE_REPEL_RADIUS + 2.4) {
        const fleeX = mo.group.position.x + (mo.group.position.x - activeCampfire.x) * 2.2;
        const fleeZ = mo.group.position.z + (mo.group.position.z - activeCampfire.z) * 2.2;
        stepToward(mo.group, fleeX, fleeZ, mo.def.speed * 1.15, dt, mo.radius);
        moveSpd = mo.def.speed * 1.15;
        if (Math.random() < dt * 3.5 && spawnSparkBurst) {
          spawnSparkBurst(mo.group.position, 3, 0xff9428, 0.65);
        }
      } else if (!playerSafe && dPlayer < 46) {
        // Jakt på spilleren!
        let chaseSpd = mo.def.speed;
        if (mo.species === 'chupacabra' && dPlayer > 4.5 && dPlayer < 16) {
          mo.leapTimer -= dt;
          if (mo.leapTimer <= 0) {
            mo.leapTimer = 3.6;
            chaseSpd *= 2.35;
            if (spawnSparkBurst) spawnSparkBurst(mo.group.position, 6, 0xff2848, 0.85);
          } else if (mo.leapTimer > 3.1) {
            chaseSpd *= 2.15;
          }
        }

        if (dPlayer > 2.2) {
          stepToward(mo.group, px, pz, chaseSpd, dt, mo.radius);
          moveSpd = chaseSpd;
        } else {
          mo.group.rotation.y = Math.atan2(-(px - mo.group.position.x), -(pz - mo.group.position.z));
          mo.attackCooldown -= dt;
          if (mo.attackCooldown <= 0) {
            mo.attackCooldown = 1.25;
            damagePlayer(mo.def.meleeDmg);
            if (spawnImpact) spawnImpact(playerChestPosition, mo.def.impactColor, 0.24);
          }
        }

        // Avstandsangrep (Giftspytt / Frostbolt / Magmakule)
        if (mo.def.rangedDmg > 0 && dPlayer > 5.5 && dPlayer < 30) {
          mo.rangedTimer -= dt;
          if (mo.rangedTimer <= 0) {
            mo.rangedTimer = mo.def.rangedCooldown;
            tmpVecA.copy(mo.group.position);
            tmpVecA.y += mo.hitCenterY + 0.35;
            updatePlayerBodyPoints();
            spawnMonsterProjectile(tmpVecA, playerChestPosition, 19, mo.def.rangedDmg, mo.def.projStyle);
            if (audio && audio.playBanditShotSound) audio.playBanditShotSound();
          }
        }
      } else {
        // Patruljer rundt sitt eget hi i regionen
        const dWander = Math.hypot(mo.wanderX - mo.group.position.x, mo.wanderZ - mo.group.position.z);
        if (dWander < 2.2) {
          const ang = (worldTime * 0.55 + i * 1.7) % (Math.PI * 2);
          mo.wanderX = THREE.MathUtils.clamp(mo.homeX + Math.cos(ang) * 20, -1165, 1165);
          mo.wanderZ = THREE.MathUtils.clamp(mo.homeZ + Math.sin(ang) * 20, -1165, 1165);
        }
        stepToward(mo.group, mo.wanderX, mo.wanderZ, mo.def.speed * 0.58, dt, mo.radius);
        moveSpd = mo.def.speed * 0.58;
      }

      mo.stride += dt * (moveSpd > 0.2 ? 9.5 : 2.0);
      animateSimpleLegs(mo.group.userData.legs, mo.stride, moveSpd > 0.2 ? 0.42 : 0.06);
      if (mo.group.userData.tailPivot) {
        mo.group.userData.tailPivot.rotation.x = Math.sin(worldTime * 4.2 + i) * 0.18;
      }
      if (mo.group.userData.arms) {
        const armSwing = Math.sin(mo.stride) * 0.35;
        mo.group.userData.arms[0].rotation.x = -0.45 + armSwing;
        mo.group.userData.arms[1].rotation.x = -0.45 - armSwing;
      }
    }

    // 6) Evolusjons-oppførsel på eksisterende monstre (skygge-prosjektiler & rovdyr-byks, samt frykt for bål!)
    if (entities && !playerSafe) {
      if (Array.isArray(entities.nightEnemies)) {
        for (let i = 0; i < entities.nightEnemies.length; i++) {
          const ne = entities.nightEnemies[i];
          if (!ne || !ne.alive || !ne.group.visible || !ne.isEvolvedFiend || ne.burning) continue;
          const d = Math.hypot(px - ne.group.position.x, pz - ne.group.position.z);
          if (d > 6.5 && d < 25) {
            ne.evoShotTimer = (ne.evoShotTimer || 3.5) - dt;
            if (ne.evoShotTimer <= 0) {
              ne.evoShotTimer = 4.2;
              tmpVecA.copy(ne.group.position);
              tmpVecA.y += 1.45;
              updatePlayerBodyPoints();
              spawnMonsterProjectile(tmpVecA, playerChestPosition, 17.5, 13, 'shadow');
            }
          }
        }
      }
      if (Array.isArray(entities.wolfList)) {
        for (let i = 0; i < entities.wolfList.length; i++) {
          const w = entities.wolfList[i];
          if (!w || !w.alive || !w.group.visible || !w.isEvolvedPredator) continue;
          const d = Math.hypot(px - w.group.position.x, pz - w.group.position.z);
          if (d > 3.5 && d < 13.5) {
            w.evoLungeTimer = (w.evoLungeTimer || 3.5) - dt;
            if (w.evoLungeTimer <= 0) {
              w.evoLungeTimer = 4.4;
              const lx = (px - w.group.position.x) / d;
              const lz = (pz - w.group.position.z) / d;
              w.group.position.x += lx * 1.65;
              w.group.position.z += lz * 1.65;
              repelGroupFromSafeZonesAndCampfires(w.group, 0.42);
              if (spawnSparkBurst) spawnSparkBurst(w.group.position, 5, 0xff5a28, 0.75);
            }
          }
        }
      }
    }

    // 7) Oppdater monster-prosjektiler (oppløses i gnister hvis de treffer leirbålets beskyttelsesskjold eller Fristed!)
    updatePlayerBodyPoints();
    for (let i = monsterProjectiles.length - 1; i >= 0; i--) {
      const p = monsterProjectiles[i];
      p.prev.copy(p.mesh.position);
      p.mesh.position.addScaledVector(p.dir, p.speed * dt);
      p.life -= dt;

      if (
        isPointSafeFromMonsters(p.mesh.position.x, p.mesh.position.z) ||
        pointHitsSolidWall(p.mesh.position.x, p.mesh.position.y, p.mesh.position.z)
      ) {
        if (spawnSparkBurst) spawnSparkBurst(p.mesh.position, 6, 0xffb84d, 0.75);
        scene.remove(p.mesh);
        monsterProjectiles.splice(i, 1);
        continue;
      }

      if (
        !playerSafe &&
        (segmentPointDistance(p.prev, p.mesh.position, playerHeadPosition) < 0.44 ||
          segmentPointDistance(p.prev, p.mesh.position, playerChestPosition) < 0.52)
      ) {
        damagePlayer(p.damage);
        if (spawnImpact) spawnImpact(p.mesh.position, 0xff4828, 0.22);
        scene.remove(p.mesh);
        monsterProjectiles.splice(i, 1);
        continue;
      }

      const gy = getTerrainHeight(p.mesh.position.x, p.mesh.position.z);
      if (p.life <= 0 || p.mesh.position.y < gy + 0.05) {
        scene.remove(p.mesh);
        monsterProjectiles.splice(i, 1);
      }
    }
  }

  function drawExpansionOnMinimap(minimapCtx, toRadar) {
    // Tegn de 4 nye byene med grønne Fristed-skjold på radaren
    for (let i = 0; i < OUTER_TOWNS.length; i++) {
      const t = OUTER_TOWNS[i];
      const pt = toRadar(t.x, t.z);
      minimapCtx.fillStyle = '#58f288';
      minimapCtx.beginPath();
      minimapCtx.arc(pt.sx, pt.sy, pt.clamped ? 3.5 : 4.8, 0, Math.PI * 2);
      minimapCtx.fill();
      minimapCtx.strokeStyle = '#0c3318';
      minimapCtx.lineWidth = 1.4;
      minimapCtx.stroke();
    }

    // Tegn aktivt leirbål med varm oransje flammesirkel på radaren!
    if (activeCampfire.active && activeCampfire.timeLeft > 0) {
      const fp = toRadar(activeCampfire.x, activeCampfire.z);
      minimapCtx.fillStyle = '#ff9d2e';
      minimapCtx.beginPath();
      minimapCtx.arc(fp.sx, fp.sy, 4.6, 0, Math.PI * 2);
      minimapCtx.fill();
      minimapCtx.strokeStyle = '#fff0a6';
      minimapCtx.lineWidth = 1.4;
      minimapCtx.stroke();
    }
  }

  function refreshLanguage() {
    for (let i = 0; i < signUpdaters.length; i++) {
      signUpdaters[i]();
    }
    campfireLastShownLang = '';
    syncCampfireButtonsUI();
    for (let i = 0; i < regionalMonsters.length; i++) {
      const mo = regionalMonsters[i];
      if (mo.group.userData.hpBar) {
        const mName = getLang() === 'no' ? mo.def.noName : mo.def.enName;
        mo.group.userData.hpBar.userData.drawBar(mo.hp, mo.maxHp, mName, mo.def.barColor);
      }
    }
  }

  // Bygg alt ved oppstart
  buildOuterWildernessScenery();
  buildOuterTownsAndSafeHavens();
  buildFirewoodNodes();
  initPlayerCampfireMesh();
  spawnRegionalAnimals();
  spawnRegionalMonsters();
  syncCampfireButtonsUI();

  return {
    OUTER_TOWNS,
    outerSafeZones,
    firewoodPickups,
    activeCampfire,
    regionalAnimals,
    regionalMonsters,
    tryBuildOrStokeCampfire,
    syncCampfireButtonsUI,
    isPointSafeFromMonsters,
    repelGroupFromSafeZonesAndCampfires,
    considerExpansionHits,
    damageExpansionTarget,
    applyDynamiteToExpansion,
    checkBulletFirewoodHit,
    tryRayExpansionInteractions,
    getNearbyOuterTownShop,
    updateFrontierExpansion,
    drawExpansionOnMinimap,
    refreshLanguage
  };
}
