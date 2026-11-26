import * as THREE from 'three';
import { batchStaticMeshesInGroup } from './glb-utils.js';

export function buildOuterFrontierLandmarks(ctx) {
  const {
    M, scene, dInit, getTerrainBaseHeight, getTerrainHeight,
    stonePlinthMat, darkGraveStoneMat, crimsonRockMat, logTimberMat,
    darkWoodMat, lightWoodMat, weatheredPlankMatA, weatheredPlankMatB,
    mesaCapMat, wroughtIronMat, polishedBrassMat,
    sharedSparkGlowTex, sharedParticleGlowTex,
    createWesternSign, createContactShadow, createDetailedBarrel, createWagonWheel,
    createFramedWindow, addWeatheredFacadePlanks, createWoodenFence, createCarvedBatwingDoor,
    createCampfire, pushMeasuredWorldBoxCollider, worldVirtualLights
  } = ctx;
  const { woodWallMat, roofMat, sharedDesertSandNormalTex } = M;

  // =========================================================================
  // 6e-2. FIRE NYE HJØRNEBIOMER & LANDEMERKER FOR 48-TIMERS GRENSELANDSUTVIDELSE
  // =========================================================================
  // (1) NV Silverpine Peak & Trapper's Stone Watchtower Ruin (x = -142, z = -138)
  const silverpineGroup = new THREE.Group();
  const spCenterY = getTerrainBaseHeight(-142.0, -138.0);
  silverpineGroup.position.set(-142.0, spCenterY, -138.0);
  scene.add(silverpineGroup);

  const spPlinth = new THREE.Mesh(new THREE.CylinderGeometry(5.8, 6.4, 0.34, 12), stonePlinthMat);
  spPlinth.position.y = 0.17;
  spPlinth.receiveShadow = true;
  silverpineGroup.add(spPlinth);

  // Åtte gamle vakttårn-søyler rundt ruin-platået (bred åpen inngang mot sørøst)
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    if (Math.cos(ang - Math.PI * 0.25) > 0.65) continue;
    const colH = 3.2 + (i % 3) * 0.85;
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.95, colH, 0.95), darkGraveStoneMat || stonePlinthMat);
    col.position.set(Math.cos(ang) * 4.8, colH * 0.5 + 0.2, Math.sin(ang) * 4.8);
    col.rotation.y = -ang;
    col.castShadow = true;
    col.receiveShadow = true;
    silverpineGroup.add(col);
  }
  const spSignMesh = createWesternSign(
    dInit.signSilverpineTitle || 'SILVERPINE PEAK',
    dInit.signSilverpineSub || 'MOONSTONE GROVE',
    3.8,
    0.96
  );
  spSignMesh.position.set(3.8, 3.6, 3.8);
  spSignMesh.rotation.y = Math.PI * 0.25;
  silverpineGroup.add(spSignMesh);

  silverpineGroup.updateMatrixWorld(true);
  silverpineGroup.children.forEach((ch) => {
    if (ch.isMesh && ch !== spPlinth && !ch.userData.updateSign) {
      pushMeasuredWorldBoxCollider(ch, 4.5, 0.04, 2.5);
    }
  });

  // 3 Lysende Månestein-totemer (Moonstone Totems) rundt Silverpine Peak
  const moonstoneTotems = [];
  const moonstoneHitMeshes = [];
  const moonstoneMat = new THREE.MeshStandardMaterial({
    color: 0x9adfff,
    emissive: 0x2f9bff,
    emissiveIntensity: 1.85,
    metalness: 0.45,
    roughness: 0.18
  });
  [
    { x: -131.5, z: -126.5 },
    { x: -153.5, z: -136.0 },
    { x: -140.5, z: -151.5 }
  ].forEach((pt, idx) => {
    const tGrp = new THREE.Group();
    const gy = getTerrainBaseHeight(pt.x, pt.z);
    tGrp.position.set(pt.x, gy, pt.z);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.54, 0.72, 8), stonePlinthMat);
    ped.position.y = 0.36;
    tGrp.add(ped);
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), moonstoneMat);
    crystal.position.y = 1.16;
    crystal.scale.set(0.85, 1.55, 0.85);
    tGrp.add(crystal);
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: sharedSparkGlowTex || sharedParticleGlowTex,
        color: 0x86dcff,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    halo.scale.set(1.8, 1.8, 1);
    halo.position.y = 1.22;
    tGrp.add(halo);
    scene.add(tGrp);
    const entry = {
      id: `moonstone_${idx}`,
      kind: 'moonstone',
      group: tGrp,
      hitMesh: crystal,
      halo,
      worldPos: new THREE.Vector3(pt.x, gy + 1.1, pt.z),
      collected: false,
      respawnTimer: 0
    };
    crystal.userData.frontierObjective = entry;
    ped.userData.frontierObjective = entry;
    moonstoneTotems.push(entry);
    moonstoneHitMeshes.push(crystal);
  });

  // (2) NØ Fort Rattlesnake i Sunscorch Badlands (x = 140, z = -132)
  const fortGroup = new THREE.Group();
  const fortBaseY = getTerrainBaseHeight(140.0, -132.0);
  fortGroup.position.set(140.0, fortBaseY, -132.0);
  scene.add(fortGroup);

  // Tømmerpalisader rundt en 19m × 17m borggård med 4,8m bred åpen sørport mot Dustwood!
  const fortWallN = new THREE.Mesh(new THREE.BoxGeometry(19.2, 3.4, 0.55), logTimberMat);
  fortWallN.position.set(0, 1.7, -8.5);
  fortWallN.castShadow = true;
  fortGroup.add(fortWallN);

  const fortWallW = new THREE.Mesh(new THREE.BoxGeometry(0.55, 3.4, 17.2), logTimberMat);
  fortWallW.position.set(-9.4, 1.7, 0);
  fortWallW.castShadow = true;
  fortGroup.add(fortWallW);

  const fortWallE = new THREE.Mesh(new THREE.BoxGeometry(0.55, 3.4, 17.2), logTimberMat);
  fortWallE.position.set(9.4, 1.7, 0);
  fortWallE.castShadow = true;
  fortGroup.add(fortWallE);

  const fortWallSW = new THREE.Mesh(new THREE.BoxGeometry(7.0, 3.4, 0.55), logTimberMat);
  fortWallSW.position.set(-6.0, 1.7, 8.5);
  fortWallSW.castShadow = true;
  fortGroup.add(fortWallSW);

  const fortWallSE = new THREE.Mesh(new THREE.BoxGeometry(7.0, 3.4, 0.55), logTimberMat);
  fortWallSE.position.set(6.0, 1.7, 8.5);
  fortWallSE.castShadow = true;
  fortGroup.add(fortWallSE);

  const fortGateArch = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.48, 0.65), darkWoodMat);
  fortGateArch.position.set(0, 3.55, 8.5);
  fortGroup.add(fortGateArch);

  // To hjørnevakttårn på palisaden
  [-9.1, 9.1].forEach((tx) => {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(2.6, 5.2, 2.6), woodWallMat);
    tower.position.set(tx, 2.6, 8.2);
    tower.castShadow = true;
    fortGroup.add(tower);
    const tRoof = new THREE.Mesh(new THREE.ConeGeometry(2.15, 1.35, 4), M.roofMat || darkWoodMat);
    tRoof.position.set(tx, 5.85, 8.2);
    tRoof.rotation.y = Math.PI * 0.25;
    fortGroup.add(tRoof);
  });

  const fortFire = createCampfire();
  fortFire.position.set(0, 0, -1.2);
  fortGroup.add(fortFire);
  if (fortFire.userData.virtualLight) worldVirtualLights.push(fortFire.userData.virtualLight);

  const fortSignMesh = createWesternSign(
    dInit.signFortTitle || 'FORT RATTLESNAKE',
    dInit.signFortSub || 'OUTLAW STRONGHOLD',
    4.1,
    1.02
  );
  fortSignMesh.position.set(0, 4.35, 8.88);
  fortGroup.add(fortSignMesh);

  fortGroup.updateMatrixWorld(true);
  [fortWallN, fortWallW, fortWallE, fortWallSW, fortWallSE].forEach((fw) => {
    pushMeasuredWorldBoxCollider(fw, 4.2, 0.04, 1.0);
  });

  // 3 Stjålne Pengekasser (Treasury Strongboxes) i Fort Rattlesnake
  const fortStrongboxes = [];
  const fortStrongboxHitMeshes = [];
  const strongboxMat = new THREE.MeshStandardMaterial({
    color: 0x32404d,
    metalness: 0.78,
    roughness: 0.34
  });
  [
    { x: 133.8, z: -137.2 },
    { x: 146.2, z: -136.8 },
    { x: 140.0, z: -126.5 }
  ].forEach((pt, idx) => {
    const sbGrp = new THREE.Group();
    const gy = getTerrainBaseHeight(pt.x, pt.z);
    sbGrp.position.set(pt.x, gy, pt.z);
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.58, 0.62), strongboxMat);
    chest.position.y = 0.29;
    chest.castShadow = true;
    sbGrp.add(chest);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.14, 0.66), polishedBrassMat);
    trim.position.y = 0.52;
    sbGrp.add(trim);
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: sharedSparkGlowTex || sharedParticleGlowTex,
        color: 0xffd24c,
        transparent: true,
        opacity: 0.82,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    halo.scale.set(1.55, 1.55, 1);
    halo.position.y = 0.82;
    sbGrp.add(halo);
    scene.add(sbGrp);
    const entry = {
      id: `strongbox_${idx}`,
      kind: 'strongbox',
      group: sbGrp,
      hitMesh: chest,
      halo,
      worldPos: new THREE.Vector3(pt.x, gy + 0.5, pt.z),
      collected: false,
      respawnTimer: 0
    };
    chest.userData.frontierObjective = entry;
    trim.userData.frontierObjective = entry;
    fortStrongboxes.push(entry);
    fortStrongboxHitMeshes.push(chest);
  });

  // (3) SØ Brimstone Ghost Town i Devil's Basin (x = 140, z = 136)
  const brimstoneGroup = new THREE.Group();
  const brimBaseY = getTerrainBaseHeight(140.0, 136.0);
  brimstoneGroup.position.set(140.0, brimBaseY, 136.0);
  scene.add(brimstoneGroup);

  // To forfalne spøkelsesby-fasader på hver side av en åpen gate (z_local = -6.8 og +6.8)
  const brimWallN1 = new THREE.Mesh(new THREE.BoxGeometry(10.5, 4.2, 0.48), darkWoodMat);
  brimWallN1.position.set(-4.5, 2.1, -6.8);
  brimWallN1.castShadow = true;
  brimstoneGroup.add(brimWallN1);

  const brimWallN2 = new THREE.Mesh(new THREE.BoxGeometry(8.5, 3.5, 0.48), weatheredPlankMatA);
  brimWallN2.position.set(6.5, 1.75, -6.8);
  brimWallN2.castShadow = true;
  brimstoneGroup.add(brimWallN2);

  const brimWallS1 = new THREE.Mesh(new THREE.BoxGeometry(11.0, 3.8, 0.48), woodWallMat);
  brimWallS1.position.set(4.0, 1.9, 6.8);
  brimWallS1.castShadow = true;
  brimstoneGroup.add(brimWallS1);

  const brimGallowsPost = new THREE.Mesh(new THREE.BoxGeometry(0.28, 3.8, 0.28), darkWoodMat);
  brimGallowsPost.position.set(-7.5, 1.9, 5.2);
  brimstoneGroup.add(brimGallowsPost);
  const brimGallowsArm = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.24, 0.24), darkWoodMat);
  brimGallowsArm.position.set(-6.6, 3.68, 5.2);
  brimstoneGroup.add(brimGallowsArm);

  const brimSignMesh = createWesternSign(
    dInit.signBrimstoneTitle || 'BRIMSTONE',
    dInit.signBrimstoneSub || 'CURSED GHOST TOWN',
    3.9,
    0.98
  );
  brimSignMesh.position.set(-4.5, 4.65, -6.48);
  brimstoneGroup.add(brimSignMesh);

  brimstoneGroup.updateMatrixWorld(true);
  [brimWallN1, brimWallN2, brimWallS1].forEach((bw) => {
    pushMeasuredWorldBoxCollider(bw, 4.4, 0.04, 0.2);
  });

  // 3 Forbannede Svovel-totemer (Cursed Brimstone Totems — skytes i stykker!)
  const brimstoneTotems = [];
  const brimstoneTotemHitMeshes = [];
  const brimCoreMat = new THREE.MeshStandardMaterial({
    color: 0xff5a1f,
    emissive: 0xff3b08,
    emissiveIntensity: 2.1,
    roughness: 0.3
  });
  [
    { x: 131.5, z: 133.0 },
    { x: 148.5, z: 134.5 },
    { x: 139.5, z: 145.5 }
  ].forEach((pt, idx) => {
    const btGrp = new THREE.Group();
    const gy = getTerrainBaseHeight(pt.x, pt.z);
    btGrp.position.set(pt.x, gy, pt.z);
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.44, 1.65, 7), darkGraveStoneMat || stonePlinthMat);
    pillar.position.y = 0.82;
    pillar.castShadow = true;
    btGrp.add(pillar);
    const emberOrb = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0), brimCoreMat);
    emberOrb.position.y = 1.88;
    btGrp.add(emberOrb);
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: sharedSparkGlowTex || sharedParticleGlowTex,
        color: 0xff6424,
        transparent: true,
        opacity: 0.88,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    halo.scale.set(1.9, 1.9, 1);
    halo.position.y = 1.92;
    btGrp.add(halo);
    scene.add(btGrp);
    const entry = {
      id: `brimtotem_${idx}`,
      kind: 'brimstone_totem',
      group: btGrp,
      hitMesh: emberOrb,
      pillarMesh: pillar,
      halo,
      worldPos: new THREE.Vector3(pt.x, gy + 1.5, pt.z),
      hp: 3,
      maxHp: 3,
      destroyed: false,
      respawnTimer: 0
    };
    emberOrb.userData.brimstoneTotem = entry;
    pillar.userData.brimstoneTotem = entry;
    brimstoneTotems.push(entry);
    brimstoneTotemHitMeshes.push(emberOrb, pillar);
  });

  // (4) SV Ancient Stone Circle på Thunder Plains (x = -140, z = 136)
  const stoneCircleGroup = new THREE.Group();
  const scBaseY = getTerrainBaseHeight(-140.0, 136.0);
  stoneCircleGroup.position.set(-140.0, scBaseY, 136.0);
  scene.add(stoneCircleGroup);

  const monolithPillars = [];
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const mx = Math.cos(ang) * 11.2;
    const mz = Math.sin(ang) * 11.2;
    const mStone = new THREE.Mesh(new THREE.BoxGeometry(1.35, 4.5, 0.92), mesaCapMat || stonePlinthMat);
    mStone.position.set(mx, 2.25, mz);
    mStone.rotation.y = -ang + Math.PI * 0.5;
    mStone.castShadow = true;
    mStone.receiveShadow = true;
    stoneCircleGroup.add(mStone);
    monolithPillars.push(mStone);
  }
  const scSignMesh = createWesternSign(
    dInit.signStoneCircleTitle || 'ANCIENT STONE CIRCLE',
    dInit.signStoneCircleSub || 'THUNDER PLAINS ALTAR',
    4.1,
    1.02
  );
  scSignMesh.position.set(8.2, 3.85, -8.2);
  scSignMesh.rotation.y = Math.PI * 0.75;
  stoneCircleGroup.add(scSignMesh);

  // Sentral Ur-Obelisk i Steinringen (vekker Ur-Wendigoen eller starter ny Prestisje-kamp!)
  const wendigoAltarHitMeshes = [];
  const wendigoPedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.25, 1.15, 8), darkGraveStoneMat || stonePlinthMat);
  wendigoPedestal.position.set(0, 0.58, 0);
  wendigoPedestal.castShadow = true;
  stoneCircleGroup.add(wendigoPedestal);
  wendigoAltarHitMeshes.push(wendigoPedestal);

  const wendigoObeliskOrb = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.36, 1),
    new THREE.MeshStandardMaterial({
      color: 0x58ffb8,
      emissive: 0x16d488,
      emissiveIntensity: 2.2,
      metalness: 0.4,
      roughness: 0.16
    })
  );
  wendigoObeliskOrb.position.set(0, 1.62, 0);
  stoneCircleGroup.add(wendigoObeliskOrb);
  wendigoAltarHitMeshes.push(wendigoObeliskOrb);

  const wendigoHalo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: sharedSparkGlowTex || sharedParticleGlowTex,
      color: 0x58ffb8,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  wendigoHalo.scale.set(2.1, 2.1, 1);
  wendigoHalo.position.set(0, 1.62, 0);
  stoneCircleGroup.add(wendigoHalo);
  const wendigoAltarWorldPos = new THREE.Vector3(-140.0, scBaseY + 1.55, 136.0);

  stoneCircleGroup.updateMatrixWorld(true);
  monolithPillars.forEach((mp) => pushMeasuredWorldBoxCollider(mp, 4.8, 0.04, 0.8));
  pushMeasuredWorldBoxCollider(wendigoPedestal, 1.6, 0.04, 0.8);

  // 3 Eldgamle Solruner (Ancient Sun Runes) rundt Thunder Plains
  const ancientRunes = [];
  const ancientRuneHitMeshes = [];
  const sunRuneMat = new THREE.MeshStandardMaterial({
    color: 0xffe478,
    emissive: 0xd99b16,
    emissiveIntensity: 1.9,
    metalness: 0.65,
    roughness: 0.22
  });
  [
    { x: -126.0, z: 128.0 },
    { x: -154.0, z: 134.0 },
    { x: -138.0, z: 151.5 }
  ].forEach((pt, idx) => {
    const rGrp = new THREE.Group();
    const gy = getTerrainBaseHeight(pt.x, pt.z);
    rGrp.position.set(pt.x, gy, pt.z);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.40, 0.52, 0.68, 8), stonePlinthMat);
    base.position.y = 0.34;
    rGrp.add(base);
    const rune = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.075, 8, 18), sunRuneMat);
    rune.position.y = 1.12;
    rGrp.add(rune);
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: sharedSparkGlowTex || sharedParticleGlowTex,
        color: 0xffe26a,
        transparent: true,
        opacity: 0.86,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    halo.scale.set(1.75, 1.75, 1);
    halo.position.y = 1.12;
    rGrp.add(halo);
    scene.add(rGrp);
    const entry = {
      id: `sunrune_${idx}`,
      kind: 'sun_rune',
      group: rGrp,
      hitMesh: rune,
      halo,
      worldPos: new THREE.Vector3(pt.x, gy + 1.05, pt.z),
      collected: false,
      respawnTimer: 0
    };
    rune.userData.frontierObjective = entry;
    base.userData.frontierObjective = entry;
    ancientRunes.push(entry);
    ancientRuneHitMeshes.push(rune);
  });

  // =========================================================================
  // 6e-3. FIRE NYE YTTER-LANDEMERKER + 24 SKJULTE GULL-HESTESKO (200-TIMERS SAGA)
  // =========================================================================
  // (5) SØR: Dead Man's Oasis & Sunken Sandstone Temple (x = -6.0, z = 168.0)
  const oasisGroup = new THREE.Group();
  const oasisBaseY = getTerrainBaseHeight(-6.0, 168.0);
  oasisGroup.position.set(-6.0, oasisBaseY, 168.0);
  scene.add(oasisGroup);

  const oasisPoolRim = new THREE.Mesh(new THREE.CylinderGeometry(6.8, 7.5, 0.28, 18), stonePlinthMat);
  oasisPoolRim.position.y = 0.12;
  oasisPoolRim.receiveShadow = true;
  oasisGroup.add(oasisPoolRim);

  const oasisWaterMesh = new THREE.Mesh(
    new THREE.CircleGeometry(6.2, 24),
    new THREE.MeshStandardMaterial({
      color: 0x1a687c,
      roughness: 0.05,
      metalness: 0.14,
      normalMap: M.sharedWaterRippleNormalTex || sharedDesertSandNormalTex,
      normalScale: new THREE.Vector2(0.26, 0.26),
      envMapIntensity: 1.65
    })
  );
  oasisWaterMesh.rotation.x = -Math.PI / 2;
  oasisWaterMesh.position.y = 0.27;
  oasisGroup.add(oasisWaterMesh);

  const oasisColumns = [];
  for (let i = 0; i < 6; i++) {
    const ang = -Math.PI * 0.15 + (i / 5) * (Math.PI * 1.3);
    const cx = Math.cos(ang) * 9.4;
    const cz = Math.sin(ang) * 9.4;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.62, 4.4, 10), crimsonRockMat);
    col.position.set(cx, 2.2, cz);
    col.castShadow = true;
    col.receiveShadow = true;
    oasisGroup.add(col);
    oasisColumns.push(col);
  }
  const oasisArchLintel = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.65, 1.15), stonePlinthMat);
  oasisArchLintel.position.set(0, 4.55, 9.2);
  oasisArchLintel.castShadow = true;
  oasisGroup.add(oasisArchLintel);

  const oasisFire = createCampfire();
  oasisFire.position.set(0, 0.02, -8.2);
  oasisGroup.add(oasisFire);
  if (oasisFire.userData.virtualLight) worldVirtualLights.push(oasisFire.userData.virtualLight);

  const oasisSignMesh = createWesternSign(
    dInit.signOasisTitle || "DEAD MAN'S OASIS",
    dInit.signOasisSub || 'SUNKEN MIRAGE TEMPLE',
    4.1,
    1.0
  );
  oasisSignMesh.position.set(0, 4.15, -9.8);
  oasisSignMesh.rotation.y = Math.PI;
  oasisGroup.add(oasisSignMesh);

  oasisGroup.updateMatrixWorld(true);
  oasisColumns.forEach((oc) => pushMeasuredWorldBoxCollider(oc, 4.5, 0.04, 0.8));

  const oasisIdols = [];
  const oasisIdolHitMeshes = [];
  const scarabGoldMat = new THREE.MeshStandardMaterial({
    color: 0xffd85e,
    emissive: 0xd48812,
    emissiveIntensity: 1.75,
    metalness: 0.85,
    roughness: 0.18
  });
  [
    { x: -14.5, z: 164.0 },
    { x: 2.8, z: 163.5 },
    { x: -6.0, z: 178.5 }
  ].forEach((pt, idx) => {
    const g = new THREE.Group();
    const gy = getTerrainBaseHeight(pt.x, pt.z);
    g.position.set(pt.x, gy, pt.z);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.50, 0.68, 8), crimsonRockMat);
    ped.position.y = 0.34;
    g.add(ped);
    const idol = new THREE.Mesh(new THREE.OctahedronGeometry(0.30, 1), scarabGoldMat);
    idol.scale.set(1.15, 0.85, 1.35);
    idol.position.y = 1.08;
    g.add(idol);
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: sharedSparkGlowTex || sharedParticleGlowTex,
        color: 0xffdf68,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    halo.scale.set(1.75, 1.75, 1);
    halo.position.y = 1.12;
    g.add(halo);
    scene.add(g);
    const entry = {
      id: `oasis_idol_${idx}`,
      kind: 'oasis_idol',
      group: g,
      hitMesh: idol,
      halo,
      worldPos: new THREE.Vector3(pt.x, gy + 1.05, pt.z),
      collected: false,
      respawnTimer: 0
    };
    idol.userData.frontierObjective = entry;
    ped.userData.frontierObjective = entry;
    oasisIdols.push(entry);
    oasisIdolHitMeshes.push(idol);
  });

  // (6) NORD: Frostfang Timber Mill & Kodiak Den (x = 2.0, z = -176.0)
  const millGroup = new THREE.Group();
  const millBaseY = getTerrainBaseHeight(2.0, -176.0);
  millGroup.position.set(2.0, millBaseY, -176.0);
  scene.add(millGroup);

  const millDeck = new THREE.Mesh(new THREE.BoxGeometry(13.2, 0.28, 8.6), darkWoodMat);
  millDeck.position.set(0, 0.14, 0);
  millDeck.receiveShadow = true;
  millGroup.add(millDeck);

  const millBackWall = new THREE.Mesh(new THREE.BoxGeometry(12.6, 4.1, 0.44), logTimberMat);
  millBackWall.position.set(0, 2.18, -4.0);
  millBackWall.castShadow = true;
  millGroup.add(millBackWall);

  const millSideW = new THREE.Mesh(new THREE.BoxGeometry(0.44, 4.1, 8.2), logTimberMat);
  millSideW.position.set(-6.1, 2.18, 0);
  millSideW.castShadow = true;
  millGroup.add(millSideW);

  const millRoof = new THREE.Mesh(new THREE.BoxGeometry(13.6, 0.34, 9.2), M.roofMat || darkWoodMat);
  millRoof.position.set(0, 4.35, 0);
  millRoof.rotation.x = 0.08;
  millRoof.castShadow = true;
  millGroup.add(millRoof);

  // Stort roterende PBR-møllehjul / saghjul på østsiden av sagbruket
  const millWheelPivot = new THREE.Group();
  millWheelPivot.position.set(6.55, 2.35, 0);
  const wheelRim = new THREE.Mesh(new THREE.TorusGeometry(1.85, 0.14, 8, 20), darkWoodMat);
  wheelRim.rotation.y = Math.PI / 2;
  wheelRim.castShadow = true;
  millWheelPivot.add(wheelRim);
  const wheelHub = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.55, 10), wroughtIronMat);
  wheelHub.rotation.z = Math.PI / 2;
  millWheelPivot.add(wheelHub);
  for (let s = 0; s < 8; s++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.65, 0.26), weatheredPlankMatA);
    spoke.rotation.x = (s / 8) * Math.PI;
    millWheelPivot.add(spoke);
  }
  millGroup.add(millWheelPivot);

  // Tømmerstokk-stabel foran sagbruket
  [[-3.2, 0.52, 5.4], [-2.3, 0.52, 5.4], [-2.75, 1.12, 5.4]].forEach(([lx, ly, lz]) => {
    const logM = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 4.4, 10), logTimberMat);
    logM.rotation.z = Math.PI / 2;
    logM.position.set(lx, ly, lz);
    logM.castShadow = true;
    millGroup.add(logM);
  });

  const millSignMesh = createWesternSign(
    dInit.signMillTitle || 'FROSTFANG TIMBER MILL',
    dInit.signMillSub || 'OLD GOLIATH DEN',
    4.2,
    1.0
  );
  millSignMesh.position.set(0, 4.95, 4.45);
  millGroup.add(millSignMesh);

  millGroup.updateMatrixWorld(true);
  [millBackWall, millSideW].forEach((mw) => pushMeasuredWorldBoxCollider(mw, 4.4, 0.04, 0.6));

  const millCrates = [];
  const millCrateHitMeshes = [];
  [
    { x: -6.5, z: -168.5 },
    { x: 9.8, z: -171.0 },
    { x: 2.5, z: -185.5 }
  ].forEach((pt, idx) => {
    const g = new THREE.Group();
    const gy = getTerrainBaseHeight(pt.x, pt.z);
    g.position.set(pt.x, gy, pt.z);
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.76, 0.86), woodWallMat);
    crate.position.y = 0.38;
    crate.castShadow = true;
    g.add(crate);
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.90, 0.14, 0.90), polishedBrassMat);
    band.position.y = 0.62;
    g.add(band);
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: sharedSparkGlowTex || sharedParticleGlowTex,
        color: 0x9effa8,
        transparent: true,
        opacity: 0.84,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    halo.scale.set(1.65, 1.65, 1);
    halo.position.y = 0.95;
    g.add(halo);
    scene.add(g);
    const entry = {
      id: `mill_crate_${idx}`,
      kind: 'mill_crate',
      group: g,
      hitMesh: crate,
      halo,
      worldPos: new THREE.Vector3(pt.x, gy + 0.6, pt.z),
      collected: false,
      respawnTimer: 0
    };
    crate.userData.frontierObjective = entry;
    band.userData.frontierObjective = entry;
    millCrates.push(entry);
    millCrateHitMeshes.push(crate);
  });

  // (7) ØST-SØRØST: Diablo Caldera & Obsidian Forge (x = 176.0, z = 62.0)
  const calderaGroup = new THREE.Group();
  const calderaBaseY = getTerrainBaseHeight(176.0, 62.0);
  calderaGroup.position.set(176.0, calderaBaseY, 62.0);
  scene.add(calderaGroup);

  const lavaPoolMat = new THREE.MeshStandardMaterial({
    color: 0xff4508,
    emissive: 0xff3200,
    emissiveIntensity: 2.25,
    roughness: 0.28
  });
  const lavaPool = new THREE.Mesh(new THREE.CircleGeometry(4.8, 18), lavaPoolMat);
  lavaPool.rotation.x = -Math.PI / 2;
  lavaPool.position.y = 0.16;
  calderaGroup.add(lavaPool);

  const calderaSpireCols = [];
  for (let i = 0; i < 7; i++) {
    const ang = (i / 7) * Math.PI * 2 + 0.35;
    if (Math.cos(ang - Math.PI) > 0.62) continue;
    const spireH = 3.8 + (i % 3) * 1.15;
    const spire = new THREE.Mesh(new THREE.ConeGeometry(1.15, spireH, 6), darkGraveStoneMat || crimsonRockMat);
    spire.position.set(Math.cos(ang) * 8.6, spireH * 0.5 - 0.1, Math.sin(ang) * 8.6);
    spire.castShadow = true;
    calderaGroup.add(spire);
    calderaSpireCols.push(spire);
  }

  // Obsidian-ambolt ved kanten av lavagropen
  const forgeAnvilBase = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.72, 0.82), wroughtIronMat);
  forgeAnvilBase.position.set(-6.0, 0.36, 0);
  forgeAnvilBase.castShadow = true;
  calderaGroup.add(forgeAnvilBase);
  const forgeAnvilTop = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.36, 0.66), wroughtIronMat);
  forgeAnvilTop.position.set(-6.0, 0.86, 0);
  calderaGroup.add(forgeAnvilTop);

  worldVirtualLights.push({
    anchor: calderaGroup,
    colorHex: 0xff5418,
    intensity: 2.8,
    distance: 22,
    decay: 2
  });

  const calderaSignMesh = createWesternSign(
    dInit.signCalderaTitle || 'DIABLO CALDERA',
    dInit.signCalderaSub || 'OBSIDIAN FORGE',
    4.0,
    0.98
  );
  calderaSignMesh.position.set(-8.8, 3.85, -3.6);
  calderaSignMesh.rotation.y = -Math.PI * 0.5;
  calderaGroup.add(calderaSignMesh);

  calderaGroup.updateMatrixWorld(true);
  calderaSpireCols.forEach((sp) => pushMeasuredWorldBoxCollider(sp, 4.5, 0.04, 0.6));

  const meteorCores = [];
  const meteorCoreHitMeshes = [];
  const meteorMat = new THREE.MeshStandardMaterial({
    color: 0xff7b2e,
    emissive: 0xff3b05,
    emissiveIntensity: 2.0,
    metalness: 0.72,
    roughness: 0.24
  });
  [
    { x: 166.5, z: 56.5 },
    { x: 184.5, z: 58.0 },
    { x: 175.5, z: 72.5 }
  ].forEach((pt, idx) => {
    const g = new THREE.Group();
    const gy = getTerrainBaseHeight(pt.x, pt.z);
    g.position.set(pt.x, gy, pt.z);
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 0.64, 7), darkGraveStoneMat || stonePlinthMat);
    plinth.position.y = 0.32;
    g.add(plinth);
    const core = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0), meteorMat);
    core.position.y = 1.08;
    g.add(core);
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: sharedSparkGlowTex || sharedParticleGlowTex,
        color: 0xff6e24,
        transparent: true,
        opacity: 0.88,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    halo.scale.set(1.85, 1.85, 1);
    halo.position.y = 1.12;
    g.add(halo);
    scene.add(g);
    const entry = {
      id: `meteor_core_${idx}`,
      kind: 'meteor_core',
      group: g,
      hitMesh: core,
      halo,
      worldPos: new THREE.Vector3(pt.x, gy + 1.05, pt.z),
      collected: false,
      respawnTimer: 0
    };
    core.userData.frontierObjective = entry;
    plinth.userData.frontierObjective = entry;
    meteorCores.push(entry);
    meteorCoreHitMeshes.push(core);
  });

  // (8) VEST-NORDVEST: Raven's Roost Ghost Observatory (x = -176.0, z = -68.0)
  const observatoryGroup = new THREE.Group();
  const obsBaseY = getTerrainBaseHeight(-176.0, -68.0);
  observatoryGroup.position.set(-176.0, obsBaseY, -68.0);
  scene.add(observatoryGroup);

  const obsDais = new THREE.Mesh(new THREE.CylinderGeometry(7.2, 7.8, 0.38, 16), stonePlinthMat);
  obsDais.position.y = 0.19;
  obsDais.receiveShadow = true;
  observatoryGroup.add(obsDais);

  const obsPillars = [];
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2 + 0.5;
    if (Math.cos(ang - 0.5) > 0.72) continue;
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.95, 4.4, 0.95), stonePlinthMat);
    p.position.set(Math.cos(ang) * 6.4, 2.35, Math.sin(ang) * 6.4);
    p.rotation.y = -ang;
    p.castShadow = true;
    observatoryGroup.add(p);
    obsPillars.push(p);
  }

  // Roterende himmel-astrolabium i polert messing over observatoriet
  const astrolabeGroup = new THREE.Group();
  astrolabeGroup.position.set(0, 3.65, 0);
  const astrolabeOuterRing = new THREE.Mesh(new THREE.TorusGeometry(2.15, 0.09, 10, 28), polishedBrassMat);
  astrolabeGroup.add(astrolabeOuterRing);
  const astrolabeInnerRing = new THREE.Mesh(new THREE.TorusGeometry(1.48, 0.075, 10, 24), polishedBrassMat);
  astrolabeInnerRing.rotation.x = Math.PI / 3;
  astrolabeGroup.add(astrolabeInnerRing);
  const astrolabeStarCore = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.36, 1),
    new THREE.MeshStandardMaterial({
      color: 0xaee8ff,
      emissive: 0x38b6ff,
      emissiveIntensity: 2.2,
      metalness: 0.5,
      roughness: 0.14
    })
  );
  astrolabeGroup.add(astrolabeStarCore);
  observatoryGroup.add(astrolabeGroup);

  const observatorySignMesh = createWesternSign(
    dInit.signObservatoryTitle || "RAVEN'S ROOST",
    dInit.signObservatorySub || 'ASTRAL OBSERVATORY',
    4.0,
    0.98
  );
  observatorySignMesh.position.set(6.8, 3.85, 3.6);
  observatorySignMesh.rotation.y = Math.PI * 0.35;
  observatoryGroup.add(observatorySignMesh);

  observatoryGroup.updateMatrixWorld(true);
  obsPillars.forEach((op) => pushMeasuredWorldBoxCollider(op, 4.5, 0.04, 0.8));

  const starShards = [];
  const starShardHitMeshes = [];
  const starShardMat = new THREE.MeshStandardMaterial({
    color: 0xc2f0ff,
    emissive: 0x42baff,
    emissiveIntensity: 2.05,
    metalness: 0.55,
    roughness: 0.14
  });
  [
    { x: -167.5, z: -63.0 },
    { x: -184.5, z: -65.5 },
    { x: -175.5, z: -77.5 }
  ].forEach((pt, idx) => {
    const g = new THREE.Group();
    const gy = getTerrainBaseHeight(pt.x, pt.z);
    g.position.set(pt.x, gy, pt.z);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.50, 0.68, 8), stonePlinthMat);
    ped.position.y = 0.34;
    g.add(ped);
    const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.30, 0), starShardMat);
    shard.scale.set(0.78, 1.65, 0.78);
    shard.position.y = 1.14;
    g.add(shard);
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: sharedSparkGlowTex || sharedParticleGlowTex,
        color: 0x8ae4ff,
        transparent: true,
        opacity: 0.88,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    halo.scale.set(1.75, 1.75, 1);
    halo.position.y = 1.16;
    g.add(halo);
    scene.add(g);
    const entry = {
      id: `star_shard_${idx}`,
      kind: 'star_shard',
      group: g,
      hitMesh: shard,
      halo,
      worldPos: new THREE.Vector3(pt.x, gy + 1.1, pt.z),
      collected: false,
      respawnTimer: 0
    };
    shard.userData.frontierObjective = entry;
    ped.userData.frontierObjective = entry;
    starShards.push(entry);
    starShardHitMeshes.push(shard);
  });

  // 24 Permanente Skjulte Gull-Hestesko (2 per region på tvers av alle 12 regioner — for 100 % fullføring!)
  const goldenHorseshoes = [];
  const goldenHorseshoeHitMeshes = [];
  const goldenShoeMat = new THREE.MeshStandardMaterial({
    color: 0xffe066,
    emissive: 0xd99414,
    emissiveIntensity: 1.45,
    metalness: 0.92,
    roughness: 0.16
  });
  const sharedShoeGeo = new THREE.TorusGeometry(0.23, 0.058, 8, 16, Math.PI * 1.42);
  const sharedShoeHitGeo = new THREE.SphereGeometry(0.42, 8, 6);
  const sharedShoeHitMat = new THREE.MeshBasicMaterial({ visible: false });
  const horseshoeCoords = [
    [-9.6, 5.2], [9.8, -14.2],          // 1–2: Dustwood Town
    [-4.2, -78.2], [22.0, -108.0],      // 3–4: Whispering Woods
    [92.0, -8.5], [162.5, -1.5],        // 5–6: Crimson Canyon & Deep Mine
    [-22.0, 75.2], [44.0, 73.5],        // 7–8: Southern Railway & Gorge
    [-92.0, 8.8], [-158.0, -1.5, -6.5], // 9–10: Boot Hill & Sunken Catacombs
    [-142.0, -144.5], [-155.0, -125.0], // 11–12: NW Silverpine Peak
    [140.0, -139.0], [148.5, -124.5],   // 13–14: NE Fort Rattlesnake
    [133.5, 136.0], [147.0, 143.5],     // 15–16: SE Brimstone Ghost Town
    [-140.0, 145.5], [-151.0, 127.0],   // 17–18: SW Thunder Plains & Stone Circle
    [-6.0, 160.5], [1.5, 173.5],        // 19–20: S Dead Man's Oasis
    [-3.5, -175.5], [8.5, -180.0],      // 21–22: N Frostfang Timber Mill
    [170.5, 62.0], [-176.0, -61.5]      // 23–24: Diablo Caldera & Raven's Roost
  ];
  horseshoeCoords.forEach((coord, idx) => {
    const [hx, hz, customY] = coord;
    const gy = customY !== undefined ? customY : getTerrainHeight(hx, hz);
    const g = new THREE.Group();
    g.position.set(hx, gy + 0.72, hz);
    const shoeMesh = new THREE.Mesh(sharedShoeGeo, goldenShoeMat);
    shoeMesh.rotation.z = Math.PI * 0.29;
    g.add(shoeMesh);
    const hitM = new THREE.Mesh(sharedShoeHitGeo, sharedShoeHitMat);
    g.add(hitM);
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: sharedSparkGlowTex || sharedParticleGlowTex,
        color: 0xffe47a,
        transparent: true,
        opacity: 0.82,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    halo.scale.set(1.35, 1.35, 1);
    g.add(halo);
    scene.add(g);
    const entry = {
      id: `hs_${idx}`,
      index: idx,
      group: g,
      shoeMesh,
      hitMesh: hitM,
      worldPos: new THREE.Vector3(hx, gy + 0.72, hz),
      collected: false
    };
    hitM.userData.horseshoeEntry = entry;
    shoeMesh.userData.horseshoeEntry = entry;
    goldenHorseshoes.push(entry);
    goldenHorseshoeHitMeshes.push(hitM);
  });


  batchStaticMeshesInGroup(silverpineGroup);
  batchStaticMeshesInGroup(fortGroup, { protectedObjects: new Set([fortFire]) });
  batchStaticMeshesInGroup(brimstoneGroup);
  batchStaticMeshesInGroup(stoneCircleGroup, { protectedObjects: new Set([...wendigoAltarHitMeshes]) });
  batchStaticMeshesInGroup(oasisGroup, { protectedObjects: new Set([oasisFire, oasisWaterMesh]) });
  batchStaticMeshesInGroup(millGroup, { protectedObjects: new Set([millWheelPivot]) });
  batchStaticMeshesInGroup(calderaGroup, { protectedObjects: new Set([lavaPool]) });
  batchStaticMeshesInGroup(observatoryGroup, { protectedObjects: new Set([astrolabeGroup]) });

  return {
    spSignMesh, fortSignMesh, brimSignMesh, scSignMesh,
    oasisSignMesh, millSignMesh, calderaSignMesh, observatorySignMesh,
    millWheelPivot, astrolabeOuterRing, astrolabeInnerRing,
    moonstoneTotems, moonstoneHitMeshes,
    fortStrongboxes, fortStrongboxHitMeshes,
    brimstoneTotems, brimstoneTotemHitMeshes,
    ancientRunes, ancientRuneHitMeshes,
    wendigoAltarHitMeshes, wendigoObeliskOrb, wendigoAltarWorldPos,
    oasisIdols, oasisIdolHitMeshes,
    millCrates, millCrateHitMeshes,
    meteorCores, meteorCoreHitMeshes,
    starShards, starShardHitMeshes,
    goldenHorseshoes, goldenHorseshoeHitMeshes
  };
}
