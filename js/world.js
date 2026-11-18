import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { drawRoundedRect } from './i18n.js';
import { createSeededRng } from './textures.js';

export function applySkyShaderParams(skyObj, nightAmt, outSunDir) {
  const uniforms = skyObj.material.uniforms;
  const elevationDeg = THREE.MathUtils.lerp(14.5, -14.0, nightAmt);
  const azimuthDeg = THREE.MathUtils.lerp(146, 205, nightAmt);
  const phi = THREE.MathUtils.degToRad(90 - elevationDeg);
  const theta = THREE.MathUtils.degToRad(azimuthDeg);
  outSunDir.setFromSphericalCoords(1, phi, theta);

  uniforms.turbidity.value = THREE.MathUtils.lerp(8.5, 2.2, nightAmt);
  uniforms.rayleigh.value = THREE.MathUtils.lerp(2.65, 0.32, nightAmt);
  uniforms.mieCoefficient.value = THREE.MathUtils.lerp(0.0065, 0.0012, nightAmt);
  uniforms.mieDirectionalG.value = THREE.MathUtils.lerp(0.84, 0.65, nightAmt);
  uniforms.sunPosition.value.copy(outSunDir);
}

export function getTerrainBaseHeight(x, z) {
  const cheb = Math.max(Math.abs(x), Math.abs(z));
  // Dustwood Town i sentrum (x: -24..24, z: -24..24) holdes 100 % flatt på y = 0
  if (cheb <= 24.0) return 0;

  const t = Math.min(1, (cheb - 24.0) / 10.0);
  const blend = t * t * (3 - 2 * t);

  const dunePrimary =
    Math.sin(x * 0.044 + Math.cos(z * 0.036) * 1.2) * 1.05 +
    Math.cos(z * 0.052 - x * 0.025) * 0.78;
  const duneSecondary =
    Math.sin((x + z) * 0.095) * 0.24 +
    Math.cos((x - z * 1.2) * 0.075) * 0.20;

  const outerFactor = Math.max(0, (cheb - 118.0) / 55.0);
  const rimLift = outerFactor * outerFactor * (2.2 + 0.9 * Math.sin(x * 0.05) * Math.cos(z * 0.05));

  let h = (dunePrimary + duneSecondary + rimLift + 0.18) * blend;

  // Grunt/tørt elveleie gjennom Whispering Woods (nord, rundt z = -78)
  if (z < -62 && z > -94 && Math.abs(x) < 68) {
    const riverCenterZ = -78.0 + Math.sin(x * 0.065) * 3.6;
    const distRiver = Math.abs(z - riverCenterZ);
    if (distRiver < 5.4) {
      const rNorm = distRiver / 5.4;
      const carve = (1 - rNorm * rNorm) * 0.95;
      h -= carve;
    }
  }

  // Jevn flate foran og inne i den forlatte gullgruven (x ~ 118..134, z ~ 0)
  const dMine = Math.hypot((x - 122) * 0.7, z);
  if (dMine < 15.0) {
    const fMine = Math.max(0, Math.min(1, (dMine - 7.0) / 8.0));
    const smoothMine = fMine * fMine * (3 - 2 * fMine);
    h = THREE.MathUtils.lerp(0.65, h, smoothMine);
  }

  // Jevn kirkegårdsbakke rundt det ødelagte steinkapellet på Boot Hill (x ~ -120, z ~ 0)
  const dChapel = Math.hypot((x + 118) * 0.7, z);
  if (dChapel < 16.0) {
    const fChap = Math.max(0, Math.min(1, (dChapel - 8.0) / 8.0));
    const smoothChap = fChap * fChap * (3 - 2 * fChap);
    h = THREE.MathUtils.lerp(0.55, h, smoothChap);
  }

  return h;
}

export function getBridgeDeckY(z) {
  const southBank = getTerrainBaseHeight(0, -72.0) + 0.05;
  const northBank = getTerrainBaseHeight(0, -84.0) + 0.05;
  const u = THREE.MathUtils.clamp((-72.0 - z) / 12.0, 0, 1);
  const baseLine = THREE.MathUtils.lerp(southBank, northBank, u);
  const spanT = (z + 78.0) / 6.0; // -1..+1
  return baseLine + Math.max(0, 1 - spanT * spanT) * 0.62;
}

export function getTerrainHeight(x, z) {
  const baseH = getTerrainBaseHeight(x, z);
  // Trebroen over elveleiet i Whispering Woods (x = -2.05..+2.05, z = -84.0..-72.0)
  if (Math.abs(x) <= 2.05 && z >= -84.0 && z <= -72.0) {
    return Math.max(baseH, getBridgeDeckY(z));
  }
  return baseH;
}

export function buildEnvironmentAndScenery({ scene, renderer, L, M, maxAnisotropy, Sky: SkyClass = Sky }) {
  const {
    sharedDesertSandTex, sharedDesertSandNormalTex, sharedDesertSandRoughTex,
    sharedRoadSandTex, sharedRoadNormalTex, sharedRoadRoughTex,
    sharedSandstoneTex, sharedSandstoneNormalTex, sharedSandstoneRoughTex,
    sharedMesaTex, sharedMesaNormalTex, sharedMesaRoughTex,
    sharedBarkTex, sharedBarkNormalTex, sharedBarkRoughTex,
    sharedFoliageTex, sharedFoliageNormalTex, sharedFoliageRoughTex,
    woodWallMat, lightWoodMat, darkWoodMat,
    weatheredPlankMatA, weatheredPlankMatB, shutterWoodMat, logTimberMat,
    wroughtIronMat, polishedBrassMat, stonePlinthMat, crimsonRockMat, darkGraveStoneMat, windowMat,
    sharedParticleGlowTex, sharedSparkGlowTex, sharedSmokePuffTex, createContactShadow
  } = M;

  // --- 3f. Atmosfærisk Sky-shader og forhåndsbakt PMREM PBR-miljølys ---
  const sky = new SkyClass();
  sky.scale.setScalar(720);
  scene.add(sky);

  const skySunVec = new THREE.Vector3();

  applySkyShaderParams(sky, 0, skySunVec);

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();

  function bakeWesternEnvironment(nightAmt) {
    const envScene = new THREE.Scene();
    const envSky = new SkyClass();
    envSky.scale.setScalar(80);
    const tmpSun = new THREE.Vector3();
    applySkyShaderParams(envSky, nightAmt, tmpSun);
    envScene.add(envSky);

    const bounceGround = new THREE.Mesh(
      new THREE.SphereGeometry(38, 16, 8, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5),
      new THREE.MeshBasicMaterial({
        color: nightAmt > 0.5 ? 0x1a1928 : 0xc98f55,
        side: THREE.BackSide
      })
    );
    envScene.add(bounceGround);

    const rt = pmremGenerator.fromScene(envScene, 0.035);
    envSky.geometry.dispose();
    envSky.material.dispose();
    bounceGround.geometry.dispose();
    bounceGround.material.dispose();
    return rt;
  }

  const dayEnvRT = bakeWesternEnvironment(0);
  const nightEnvRT = bakeWesternEnvironment(1);
  pmremGenerator.dispose();

  scene.environment = dayEnvRT.texture;
  scene.environmentIntensity = 0.85;

  const hemiLight = new THREE.HemisphereLight(0xffebd2, 0xc28a52, 0.92);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xffd8a2, 1.85);
  sunLight.position.set(34, 26, -42);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(1024, 1024);
  sunLight.shadow.camera.near = 6;
  sunLight.shadow.camera.far = 175;
  sunLight.shadow.camera.left = -52;
  sunLight.shadow.camera.right = 52;
  sunLight.shadow.camera.top = 56;
  sunLight.shadow.camera.bottom = -44;
  sunLight.shadow.bias = -0.0006;
  sunLight.shadow.normalBias = 0.035;
  scene.add(sunLight);

  const sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(5.8, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xfff0c4, fog: false, toneMapped: false })
  );
  sunMesh.position.copy(skySunVec).multiplyScalar(295);
  scene.add(sunMesh);

  // --- 3g. Utvidet ørkenlandskap (-160 til +160, flatt y = 0 i Dustwood [-24..24]) ---
  const desertGroundGeo = new THREE.PlaneGeometry(390, 390, 160, 160);
  desertGroundGeo.rotateX(-Math.PI / 2);
  {
    const pos = desertGroundGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      pos.setY(i, getTerrainBaseHeight(vx, vz));
    }
    desertGroundGeo.computeVertexNormals();
  }

  const desertGroundMat = new THREE.MeshStandardMaterial({
    color: 0xe2b47c,
    map: sharedDesertSandTex,
    normalMap: sharedDesertSandNormalTex,
    normalScale: new THREE.Vector2(0.58, 0.58),
    roughnessMap: sharedDesertSandRoughTex,
    roughness: 0.92,
    metalness: 0.02
  });
  const desertGround = new THREE.Mesh(desertGroundGeo, desertGroundMat);
  desertGround.receiveShadow = true;
  scene.add(desertGround);

  // Grusveier gjennom Dustwood og ut til alle 3 ytterregionene (Nord, Øst, Vest)
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0xb8844f,
    map: sharedRoadSandTex,
    normalMap: sharedRoadNormalTex,
    normalScale: new THREE.Vector2(0.45, 0.45),
    roughnessMap: sharedRoadRoughTex,
    roughness: 0.94,
    metalness: 0.01
  });

  const mainRoad = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 44), roadMat);
  mainRoad.rotation.x = -Math.PI / 2;
  mainRoad.position.set(0, 0.016, 0);
  mainRoad.receiveShadow = true;
  scene.add(mainRoad);

  const crossRoad = new THREE.Mesh(new THREE.PlaneGeometry(44, 5.2), roadMat);
  crossRoad.rotation.x = -Math.PI / 2;
  crossRoad.position.set(0, 0.015, -3.2);
  crossRoad.receiveShadow = true;
  scene.add(crossRoad);

  function buildTerrainTrail(cx, cz, width, length, alongX = false, segsLen = 72) {
    const geo = new THREE.PlaneGeometry(alongX ? length : width, alongX ? width : length, alongX ? segsLen : 6, alongX ? 6 : segsLen);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const wx = pos.getX(i) + cx;
      const wz = pos.getZ(i) + cz;
      pos.setY(i, getTerrainBaseHeight(wx, wz) + 0.028);
    }
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, roadMat);
    mesh.position.set(cx, 0, cz);
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }

  // Nordvei til Whispering Woods, Østvei til Crimson Canyon & Gruven, Vestvei til Boot Hill
  buildTerrainTrail(0, -82, 3.8, 124, false, 84);
  buildTerrainTrail(71, -1.5, 4.0, 102, true, 72);
  buildTerrainTrail(-69, -1.5, 3.8, 98, true, 72);

  // --- 3h. Monument Valley-inspirerte lagdelte sandsteinsplatåer i horisontringen utenfor [-160..160] ---
  const mesaMat = new THREE.MeshStandardMaterial({
    color: 0xc9744a,
    map: sharedMesaTex,
    normalMap: sharedMesaNormalTex,
    normalScale: new THREE.Vector2(1.35, 1.35),
    roughnessMap: sharedMesaRoughTex,
    roughness: 0.88,
    metalness: 0.03
  });
  const mesaCapMat = new THREE.MeshStandardMaterial({
    color: 0xa45434,
    map: sharedSandstoneTex,
    normalMap: sharedSandstoneNormalTex,
    normalScale: new THREE.Vector2(1.15, 1.15),
    roughnessMap: sharedSandstoneRoughTex,
    roughness: 0.9,
    metalness: 0.02
  });

  function createFlutedCliffGeo(rTop, rBot, height, radialSegs, heightSegs, seed) {
    const rng = createSeededRng(seed);
    const geo = new THREE.CylinderGeometry(rTop, rBot, height, radialSegs, heightSegs);
    const pos = geo.attributes.position;
    // Perturber vinkler konsistent rundt søylen slik at sømmen er lukket, men veggene får kløfter og hyller
    const angleNoise = new Float32Array(radialSegs);
    for (let a = 0; a < radialSegs; a++) {
      angleNoise[a] = 0.82 + rng() * 0.34;
    }
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const r = Math.hypot(x, z);
      if (r < 0.001) continue;
      const ang = Math.atan2(z, x);
      const idx = ((Math.round(((ang + Math.PI) / (Math.PI * 2)) * radialSegs) % radialSegs) + radialSegs) % radialSegs;
      const strataStep = 1.0 + Math.sin((y / height) * Math.PI * 6) * 0.06;
      const scale = angleNoise[idx] * strataStep;
      pos.setX(i, x * scale);
      pos.setZ(i, z * scale);
    }
    geo.computeVertexNormals();
    return geo;
  }

  function spawnMonumentMesa(x, z, baseR, totalH, seed, hasMittenSpire = false) {
    const g = new THREE.Group();
    const groundY = getTerrainHeight(x, z) - 0.8;

    // Bred talus-skråning nederst (erosjonskjegle)
    const talusH = totalH * 0.36;
    const talus = new THREE.Mesh(
      createFlutedCliffGeo(baseR * 0.64, baseR * 1.25, talusH, 18, 4, seed),
      mesaMat
    );
    talus.position.y = talusH * 0.5;
    g.add(talus);

    // Steil midtseksjon med vertikale klippelag
    const midH = totalH * 0.44;
    const midCliff = new THREE.Mesh(
      createFlutedCliffGeo(baseR * 0.54, baseR * 0.66, midH, 18, 5, seed + 17),
      mesaMat
    );
    midCliff.position.y = talusH + midH * 0.5 - 0.3;
    g.add(midCliff);

    // Flat, overhengende caprock-platå på toppen
    const capH = totalH * 0.20;
    const capRock = new THREE.Mesh(
      createFlutedCliffGeo(baseR * 0.57, baseR * 0.52, capH, 16, 2, seed + 43),
      mesaCapMat
    );
    capRock.position.y = talusH + midH + capH * 0.5 - 0.5;
    g.add(capRock);

    // Valgfri Monument Valley «Mitten»-søyle/tårn ved siden av hovedplatået
    if (hasMittenSpire) {
      const spireH = totalH * 0.88;
      const spire = new THREE.Mesh(
        createFlutedCliffGeo(baseR * 0.11, baseR * 0.22, spireH, 12, 4, seed + 91),
        mesaCapMat
      );
      spire.position.set(baseR * 0.72, spireH * 0.46, baseR * 0.18);
      g.add(spire);
    }

    g.position.set(x, groundY, z);
    g.rotation.y = (seed % 628) * 0.01;
    scene.add(g);
  }

  // Plasser Monument Valley-platåer i en vid horisontring utenfor PLAY_AREA_LIMIT (160)
  [
    { x: -135, z: -205, r: 30, h: 42, seed: 101, spire: true },
    { x: 24, z: -218, r: 38, h: 48, seed: 202, spire: false },
    { x: 155, z: -195, r: 32, h: 44, seed: 303, spire: true },
    { x: -212, z: -75, r: 28, h: 36, seed: 404, spire: false },
    { x: 215, z: -62, r: 30, h: 38, seed: 505, spire: true },
    { x: -205, z: 78, r: 26, h: 33, seed: 606, spire: false },
    { x: 208, z: 86, r: 28, h: 35, seed: 707, spire: false },
    { x: -88, z: 206, r: 32, h: 40, seed: 808, spire: true },
    { x: 96, z: 212, r: 34, h: 41, seed: 909, spire: false }
  ].forEach((m) => spawnMonumentMesa(m.x, m.z, m.r, m.h, m.seed, m.spire));

  // Klipper og røde sandsteinsformasjoner (målt nøyaktig med THREE.Box3)
  const rockColliders = [];
  const rockMeasureBox = new THREE.Box3();
  const cragBoulderGeo = new THREE.DodecahedronGeometry(1.0, 1);
  function spawnBanditRockCluster(cx, cz, scale, seed, useCrimson = false) {
    const rng = createSeededRng(seed);
    const cluster = new THREE.Group();
    const baseGround = getTerrainBaseHeight(cx, cz);
    const primaryMat = useCrimson && crimsonRockMat ? crimsonRockMat : mesaMat;
    const specs = [
      { ox: 0, oz: 0, sx: 2.8, sy: 2.5, sz: 2.4, mat: primaryMat },
      { ox: -1.9, oz: 1.1, sx: 1.9, sy: 1.5, sz: 1.7, mat: mesaCapMat },
      { ox: 1.8, oz: -0.9, sx: 2.1, sy: 1.8, sz: 1.8, mat: primaryMat },
      { ox: 0.4, oz: 1.7, sx: 1.5, sy: 1.0, sz: 1.4, mat: mesaCapMat }
    ];
    const boulders = [];
    specs.forEach((sp) => {
      const b = new THREE.Mesh(cragBoulderGeo, sp.mat);
      b.scale.set(sp.sx * scale, sp.sy * scale, sp.sz * scale);
      b.position.set(sp.ox * scale, sp.sy * scale * 0.52 - 0.25, sp.oz * scale);
      b.rotation.set((rng() - 0.5) * 0.5, rng() * Math.PI * 2, (rng() - 0.5) * 0.4);
      b.castShadow = true;
      b.receiveShadow = true;
      cluster.add(b);
      boulders.push(b);
    });
    cluster.position.set(cx, baseGround, cz);
    scene.add(cluster);
    cluster.updateMatrixWorld(true);

    for (let i = 0; i < boulders.length; i++) {
      rockMeasureBox.setFromObject(boulders[i]);
      const shrinkX = (rockMeasureBox.max.x - rockMeasureBox.min.x) * 0.10;
      const shrinkZ = (rockMeasureBox.max.z - rockMeasureBox.min.z) * 0.10;
      rockColliders.push({
        minX: rockMeasureBox.min.x + shrinkX,
        maxX: rockMeasureBox.max.x - shrinkX,
        minZ: rockMeasureBox.min.z + shrinkZ,
        maxZ: rockMeasureBox.max.z - shrinkZ
      });
    }
  }

  [
    { x: -31.5, z: 9.5, s: 1.05, seed: 1111, crimson: false },
    { x: 33.5, z: -16.5, s: 1.15, seed: 1212, crimson: true },
    { x: -50.0, z: -45.0, s: 1.25, seed: 1313, crimson: false },
    // Crimson Canyon kløftvegger på begge sider av østveien (x: +45 til +135)
    { x: 52.0, z: -13.5, s: 1.65, seed: 2101, crimson: true },
    { x: 56.0, z: 12.5, s: 1.55, seed: 2102, crimson: true },
    { x: 74.0, z: -17.0, s: 1.85, seed: 2103, crimson: true },
    { x: 78.0, z: 16.5, s: 1.75, seed: 2104, crimson: true },
    { x: 98.0, z: -16.0, s: 1.95, seed: 2105, crimson: true },
    { x: 102.0, z: 15.5, s: 1.90, seed: 2106, crimson: true },
    { x: 120.0, z: -14.5, s: 2.10, seed: 2107, crimson: true },
    { x: 120.0, z: 14.5, s: 2.10, seed: 2108, crimson: true }
  ].forEach((oc) => spawnBanditRockCluster(oc.x, oc.z, oc.s, oc.seed, oc.crimson));

  // =========================================================================
  // 4. OPPDATERBARE 3D-SKILT MED CANVASTEXTURE OG FELLES PBR-BYGNINGSMATERIALER
  // =========================================================================
  function renderWesternSignCanvas(canvas, ctx, title, subtitle) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawRoundedRect(ctx, 6, 6, 756, 188, 16);
    ctx.fillStyle = '#381f0f';
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#d9a04e';
    ctx.stroke();

    drawRoundedRect(ctx, 20, 20, 728, 160, 10);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(245, 205, 130, 0.55)';
    ctx.stroke();

    // Små messingnagler i hjørnene
    [
      [34, 34], [734, 34], [34, 166], [734, 166]
    ].forEach(([nx, ny]) => {
      ctx.fillStyle = '#e5b35c';
      ctx.beginPath();
      ctx.arc(nx, ny, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (subtitle) {
      let titleSize = 80;
      ctx.font = `bold ${titleSize}px Georgia, serif`;
      while (titleSize > 44 && ctx.measureText(title).width > 690) {
        titleSize -= 2;
        ctx.font = `bold ${titleSize}px Georgia, serif`;
      }
      ctx.fillStyle = '#fff1cf';
      ctx.fillText(title, 384, 82);

      ctx.font = 'bold 29px Georgia, serif';
      ctx.fillStyle = '#e8b563';
      ctx.fillText(subtitle, 384, 148);
    } else {
      ctx.font = 'bold 92px Georgia, serif';
      ctx.fillStyle = '#fff1cf';
      ctx.fillText(title, 384, 102);
    }
  }

  function createWesternSign(title, subtitle, width = 4.0, height = 1.05) {
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    renderWesternSignCanvas(canvas, ctx, title, subtitle);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = maxAnisotropy;

    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false })
    );
    mesh.userData.updateSign = (newTitle, newSub) => {
      renderWesternSignCanvas(canvas, ctx, newTitle, newSub);
      texture.needsUpdate = true;
    };
    return mesh;
  }

  // Felles hjelpere for arkitektoniske detaljer: tønne med buede staver, vognhjul, vindu med skodder og slitte planker
  const barrelProfile = [
    new THREE.Vector2(0.001, -0.41),
    new THREE.Vector2(0.255, -0.41),
    new THREE.Vector2(0.305, -0.22),
    new THREE.Vector2(0.328, 0.0),
    new THREE.Vector2(0.305, 0.22),
    new THREE.Vector2(0.255, 0.41),
    new THREE.Vector2(0.001, 0.41)
  ];
  const barrelBodyGeo = new THREE.LatheGeometry(barrelProfile, 16);
  const barrelHoopGeo = new THREE.TorusGeometry(0.312, 0.016, 6, 18);
  barrelHoopGeo.rotateX(Math.PI / 2);

  function createDetailedBarrel() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(barrelBodyGeo, lightWoodMat);
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);
    [-0.25, -0.08, 0.12, 0.27].forEach((hy, idx) => {
      const hoop = new THREE.Mesh(barrelHoopGeo, wroughtIronMat);
      const s = idx === 0 || idx === 3 ? 0.96 : 1.03;
      hoop.scale.set(s, 1, s);
      hoop.position.y = hy;
      g.add(hoop);
    });
    return g;
  }

  const wheelRimGeo = new THREE.TorusGeometry(0.52, 0.048, 8, 20);
  const wheelIronTireGeo = new THREE.TorusGeometry(0.562, 0.018, 6, 20);
  const wheelHubGeo = new THREE.CylinderGeometry(0.09, 0.105, 0.18, 12);
  const wheelSpokeGeo = new THREE.CylinderGeometry(0.016, 0.024, 0.98, 7);

  function createWagonWheel() {
    const wheel = new THREE.Group();
    const rim = new THREE.Mesh(wheelRimGeo, darkWoodMat);
    rim.castShadow = true;
    wheel.add(rim);

    const tire = new THREE.Mesh(wheelIronTireGeo, wroughtIronMat);
    wheel.add(tire);

    const hub = new THREE.Mesh(wheelHubGeo, darkWoodMat);
    hub.rotation.x = Math.PI / 2;
    wheel.add(hub);

    const hubCap = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.21, 10), wroughtIronMat);
    hubCap.rotation.x = Math.PI / 2;
    wheel.add(hubCap);

    for (let s = 0; s < 6; s++) {
      const spoke = new THREE.Mesh(wheelSpokeGeo, lightWoodMat);
      spoke.rotation.z = (s * Math.PI) / 6;
      wheel.add(spoke);
    }
    return wheel;
  }

  function createFramedWindow(width = 1.1, height = 1.2, withShutters = true) {
    const winGroup = new THREE.Group();
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(width, height), windowMat);
    winGroup.add(glass);

    const frameDepth = 0.07;
    const barThick = 0.068;
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(width + 0.18, barThick + 0.02, frameDepth + 0.02), darkWoodMat);
    topBar.position.set(0, height / 2 + barThick / 2, 0.025);
    topBar.castShadow = true;
    winGroup.add(topBar);

    const sill = new THREE.Mesh(new THREE.BoxGeometry(width + 0.24, 0.08, 0.13), darkWoodMat);
    sill.position.set(0, -height / 2 - 0.032, 0.042);
    sill.castShadow = true;
    winGroup.add(sill);

    [-width / 2 - 0.028, width / 2 + 0.028].forEach((sx) => {
      const side = new THREE.Mesh(new THREE.BoxGeometry(barThick, height + 0.06, frameDepth), darkWoodMat);
      side.position.set(sx, 0, 0.022);
      winGroup.add(side);
    });

    // Sprosse-kryss
    const vMullion = new THREE.Mesh(new THREE.BoxGeometry(0.032, height, 0.032), darkWoodMat);
    vMullion.position.z = 0.02;
    winGroup.add(vMullion);
    const hMullion = new THREE.Mesh(new THREE.BoxGeometry(width, 0.032, 0.032), darkWoodMat);
    hMullion.position.z = 0.02;
    winGroup.add(hMullion);

    // Håndlagde treskodder med skråstilte lameller og smijernshengsler på hver side
    if (withShutters) {
      const shutterW = width * 0.44;
      const shutterH = height - 0.02;
      const slatGeo = new THREE.BoxGeometry(shutterW - 0.07, 0.042, 0.018);

      [-1, 1].forEach((side) => {
        const pivot = new THREE.Group();
        pivot.position.set(side * (width * 0.5 + 0.055), 0, 0.045);
        // Litt ulik vinkel gir ekte levd western-preg
        pivot.rotation.y = side * (side < 0 ? -0.32 : -0.22);

        const leafX = side * (shutterW * 0.5);
        const stileGeo = new THREE.BoxGeometry(0.042, shutterH, 0.032);
        [-shutterW * 0.5 + 0.021, shutterW * 0.5 - 0.021].forEach((stx) => {
          const stile = new THREE.Mesh(stileGeo, shutterWoodMat);
          stile.position.set(leafX + stx, 0, 0);
          stile.castShadow = true;
          pivot.add(stile);
        });

        const railGeo = new THREE.BoxGeometry(shutterW, 0.055, 0.032);
        [-shutterH * 0.5 + 0.028, 0, shutterH * 0.5 - 0.028].forEach((ry) => {
          const rail = new THREE.Mesh(railGeo, shutterWoodMat);
          rail.position.set(leafX, ry, 0);
          pivot.add(rail);
        });

        for (let sy = -shutterH * 0.38; sy <= shutterH * 0.39; sy += 0.11) {
          if (Math.abs(sy) < 0.04) continue;
          const slat = new THREE.Mesh(slatGeo, shutterWoodMat);
          slat.position.set(leafX, sy, 0.004);
          slat.rotation.x = 0.42;
          pivot.add(slat);
        }

        [-shutterH * 0.34, shutterH * 0.34].forEach((hy) => {
          const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.028, 0.04), wroughtIronMat);
          hinge.position.set(side * 0.05, hy, 0.012);
          pivot.add(hinge);
        });

        winGroup.add(pivot);
      });
    }

    return winGroup;
  }

  // Legger på håndlagde, lett skjeve/slitte fasadeplanker så vegger brytes opp organisk
  function addWeatheredFacadePlanks(parent, width, yStart, yEnd, zFront, seed) {
    const rng = createSeededRng(seed);
    const plankGeo = new THREE.BoxGeometry(1, 0.23, 0.032);
    for (let y = yStart; y <= yEnd; y += 0.255) {
      if (rng() < 0.22) continue;
      const segW = width * (0.42 + rng() * 0.54);
      const offsetX = (rng() - 0.5) * (width - segW) * 0.85;
      const mat = rng() > 0.5 ? weatheredPlankMatA : weatheredPlankMatB;
      const plank = new THREE.Mesh(plankGeo, mat);
      plank.scale.x = segW;
      plank.position.set(offsetX, y, zFront + (rng() - 0.5) * 0.014);
      plank.rotation.z = (rng() - 0.5) * 0.022;
      plank.rotation.y = (rng() - 0.5) * 0.012;
      plank.castShadow = true;
      plank.receiveShadow = true;
      parent.add(plank);
    }
  }

  const fencePostGeo = new THREE.CylinderGeometry(0.058, 0.072, 1.12, 7);
  function createWoodenFence(length = 3.4, postCount = 3) {
    const fence = new THREE.Group();
    for (let i = 0; i < postCount; i++) {
      const px = -length / 2 + (length / (postCount - 1)) * i;
      const post = new THREE.Mesh(fencePostGeo, darkWoodMat);
      post.position.set(px, 0.55, 0);
      post.rotation.z = ((i % 2) * 2 - 1) * 0.035;
      post.castShadow = true;
      fence.add(post);
    }
    [0.38, 0.78].forEach((ry, rIdx) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(length + 0.22, 0.082, 0.045), lightWoodMat);
      rail.position.set(0, ry, 0.05);
      rail.rotation.z = rIdx === 0 ? 0.015 : -0.018;
      rail.castShadow = true;
      fence.add(rail);
    });
    return fence;
  }

  // Utskåret Saloon-svingdørblad (batwing) med svungen topp, lameller og messinghengsler
  function createCarvedBatwingDoor(isRightWing) {
    const wing = new THREE.Group();
    const sign = isRightWing ? 1 : -1;
    const w = 0.64;

    const stileOuter = new THREE.Mesh(new THREE.BoxGeometry(0.065, 1.32, 0.055), darkWoodMat);
    stileOuter.position.set(sign * 0.032, 0, 0);
    stileOuter.castShadow = true;
    wing.add(stileOuter);

    const stileInner = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.12, 0.055), darkWoodMat);
    stileInner.position.set(sign * (w - 0.03), -0.08, 0);
    stileInner.castShadow = true;
    wing.add(stileInner);

    const botRail = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, 0.052), darkWoodMat);
    botRail.position.set(sign * (w * 0.5), -0.56, 0);
    wing.add(botRail);

    const midRail = new THREE.Mesh(new THREE.BoxGeometry(w, 0.09, 0.052), darkWoodMat);
    midRail.position.set(sign * (w * 0.5), -0.1, 0);
    wing.add(midRail);

    // Svungen toppbue skulpturert langs en kurve
    const archCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sign * 0.03, 0.62, 0),
      new THREE.Vector3(sign * (w * 0.36), 0.66, 0),
      new THREE.Vector3(sign * (w * 0.72), 0.52, 0),
      new THREE.Vector3(sign * (w - 0.03), 0.45, 0)
    ]);
    const archTop = new THREE.Mesh(new THREE.TubeGeometry(archCurve, 10, 0.034, 7, false), darkWoodMat);
    archTop.castShadow = true;
    wing.add(archTop);

    // Lameller og utskåret medaljong i dørbladet
    for (let ly = -0.40; ly <= 0.36; ly += 0.105) {
      if (Math.abs(ly + 0.1) < 0.06) continue;
      const slat = new THREE.Mesh(new THREE.BoxGeometry(w - 0.11, 0.048, 0.025), lightWoodMat);
      slat.position.set(sign * (w * 0.5), ly, 0);
      slat.rotation.x = 0.34;
      wing.add(slat);
    }

    const rosette = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.06, 10), polishedBrassMat);
    rosette.rotation.x = Math.PI / 2;
    rosette.position.set(sign * (w * 0.5), -0.1, 0);
    wing.add(rosette);

    [-0.46, 0.46].forEach((hy) => {
      const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.11, 8), polishedBrassMat);
      hinge.position.set(0, hy, 0);
      wing.add(hinge);
    });

    return wing;
  }

  // Gjerder, hestebom, reflekterende vanntrau og flakkende cowboy-leirbål langs gata
  const hitchPost = new THREE.Group();
  [-1.1, 1.1].forEach((hx) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.082, 1.1, 9), darkWoodMat);
    p.position.set(hx, 0.55, 0);
    p.castShadow = true;
    hitchPost.add(p);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.011, 6, 12), wroughtIronMat);
    ring.position.set(hx * 0.65, 0.92, 0.055);
    hitchPost.add(ring);
  });
  const hitchBar = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 2.55, 9), lightWoodMat);
  hitchBar.rotation.z = Math.PI / 2;
  hitchBar.position.set(0, 1.0, 0);
  hitchBar.castShadow = true;
  hitchPost.add(hitchBar);
  hitchPost.position.set(-4.6, 0, 6.6);
  hitchPost.rotation.y = 0.45;
  scene.add(hitchPost);

  // Håndlaget vanntrau med smijernsbånd, vannpumpe og blank vannflate som speiler himmelen (PMREM)
  function createWaterTrough() {
    const trough = new THREE.Group();
    const len = 1.95;
    const wid = 0.72;
    const h = 0.54;

    const bottom = new THREE.Mesh(new THREE.BoxGeometry(len - 0.08, 0.06, wid - 0.08), darkWoodMat);
    bottom.position.y = 0.12;
    bottom.castShadow = true;
    trough.add(bottom);

    [-0.68, 0.68].forEach((lx) => {
      const skid = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, wid + 0.08), darkWoodMat);
      skid.position.set(lx, 0.05, 0);
      trough.add(skid);
    });

    [-wid * 0.5 + 0.03, wid * 0.5 - 0.03].forEach((sz) => {
      const sideWall = new THREE.Mesh(new THREE.BoxGeometry(len, h, 0.06), weatheredPlankMatA);
      sideWall.position.set(0, 0.1 + h * 0.5, sz);
      sideWall.castShadow = true;
      sideWall.receiveShadow = true;
      trough.add(sideWall);
    });

    [-len * 0.5 + 0.03, len * 0.5 - 0.03].forEach((ex) => {
      const endWall = new THREE.Mesh(new THREE.BoxGeometry(0.06, h, wid - 0.08), weatheredPlankMatB);
      endWall.position.set(ex, 0.1 + h * 0.5, 0);
      endWall.castShadow = true;
      trough.add(endWall);
    });

    // Smijerns-stag rundt trauet
    [-0.62, 0.62].forEach((bx) => {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.045, h + 0.04, wid + 0.05), wroughtIronMat);
      strap.position.set(bx, 0.1 + h * 0.5, 0);
      trough.add(strap);
    });

    // Blank PBR-vannflate som speiler solnedgangshimmel og bygninger via scene.environment
    const waterSurface = new THREE.Mesh(
      new THREE.PlaneGeometry(len - 0.13, wid - 0.13),
      new THREE.MeshStandardMaterial({
        color: 0x264858,
        roughness: 0.04,
        metalness: 0.16,
        normalMap: sharedDesertSandNormalTex,
        normalScale: new THREE.Vector2(0.08, 0.08),
        envMapIntensity: 1.55
      })
    );
    waterSurface.rotation.x = -Math.PI / 2;
    waterSurface.position.y = 0.53;
    trough.add(waterSurface);

    // Klassisk støpejernspumpe ved enden av trauet
    const pumpCol = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.085, 1.05, 10), wroughtIronMat);
    pumpCol.position.set(-len * 0.5 - 0.16, 0.52, 0);
    pumpCol.castShadow = true;
    trough.add(pumpCol);

    const pumpCap = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), wroughtIronMat);
    pumpCap.position.set(-len * 0.5 - 0.16, 1.06, 0);
    trough.add(pumpCap);

    const spoutCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-len * 0.5 - 0.14, 0.78, 0),
      new THREE.Vector3(-len * 0.5 + 0.04, 0.76, 0),
      new THREE.Vector3(-len * 0.5 + 0.12, 0.67, 0)
    ]);
    trough.add(new THREE.Mesh(new THREE.TubeGeometry(spoutCurve, 8, 0.024, 7, false), wroughtIronMat));

    const pumpHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.52, 7), wroughtIronMat);
    pumpHandle.position.set(-len * 0.5 - 0.32, 0.88, 0);
    pumpHandle.rotation.z = 0.85;
    trough.add(pumpHandle);

    return trough;
  }

  const townWaterTrough = createWaterTrough();
  townWaterTrough.position.set(-5.3, 0, 8.0);
  townWaterTrough.rotation.y = 0.45;
  scene.add(townWaterTrough);

  // Stemningsfullt flakkende leirbål ved utkanten av gata (konstant PointLight for høy Quest-FPS)
  const campfireFlameMeshes = [];
  let campfireLight = null;
  let campfireEmberMat = null;

  function createCampfire() {
    const fire = new THREE.Group();
    const stoneCount = 10;
    const stoneGeo = new THREE.DodecahedronGeometry(0.14, 0);
    for (let i = 0; i < stoneCount; i++) {
      const ang = (i / stoneCount) * Math.PI * 2;
      const st = new THREE.Mesh(stoneGeo, stonePlinthMat);
      st.position.set(Math.cos(ang) * 0.54, 0.08, Math.sin(ang) * 0.54);
      st.scale.set(1.15, 0.72, 0.95);
      st.rotation.y = ang;
      st.castShadow = true;
      fire.add(st);
    }

    campfireEmberMat = new THREE.MeshStandardMaterial({
      color: 0x3b180a,
      emissive: 0xff4d12,
      emissiveIntensity: 1.3,
      roughness: 0.95
    });
    const emberBed = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.45, 0.09, 12), campfireEmberMat);
    emberBed.position.y = 0.045;
    fire.add(emberBed);

    const charredLogMat = new THREE.MeshStandardMaterial({
      color: 0x2b1a10,
      map: sharedBarkTex,
      normalMap: sharedBarkNormalTex,
      normalScale: new THREE.Vector2(0.85, 0.85),
      roughnessMap: sharedBarkRoughTex,
      roughness: 0.94
    });
    const logGeo = new THREE.CylinderGeometry(0.065, 0.075, 0.86, 8);
    for (let l = 0; l < 3; l++) {
      const lg = new THREE.Mesh(logGeo, charredLogMat);
      lg.position.y = 0.14;
      lg.rotation.z = Math.PI / 2 - 0.24;
      lg.rotation.y = (l * Math.PI) / 3 + 0.2;
      lg.castShadow = true;
      fire.add(lg);
    }

    const outerFlameMat = new THREE.MeshBasicMaterial({
      color: 0xff6a1a,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
      toneMapped: false
    });
    const innerFlameMat = new THREE.MeshBasicMaterial({
      color: 0xffe066,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
      toneMapped: false
    });

    [
      { x: 0, z: 0, r: 0.19, h: 0.56, mat: outerFlameMat, phase: 0.0 },
      { x: 0.08, z: -0.05, r: 0.13, h: 0.44, mat: outerFlameMat, phase: 1.7 },
      { x: -0.07, z: 0.06, r: 0.12, h: 0.40, mat: outerFlameMat, phase: 3.1 },
      { x: 0, z: 0, r: 0.11, h: 0.36, mat: innerFlameMat, phase: 0.8 }
    ].forEach((f) => {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(f.r, f.h, 7), f.mat);
      cone.position.set(f.x, 0.12 + f.h * 0.45, f.z);
      cone.userData.baseH = 0.12 + f.h * 0.45;
      cone.userData.phase = f.phase;
      fire.add(cone);
      campfireFlameMeshes.push(cone);
    });

    campfireLight = new THREE.PointLight(0xff842e, 2.4, 15, 2);
    campfireLight.position.set(0, 0.58, 0);
    fire.add(campfireLight);

    return fire;
  }

  const townCampfire = createCampfire();
  townCampfire.position.set(5.1, 0, 7.6);
  scene.add(townCampfire);

  const eastTownFence = createWoodenFence(3.6, 3);
  eastTownFence.position.set(6.3, 0, 10.2);
  eastTownFence.rotation.y = -0.35;
  scene.add(eastTownFence);

  const southWestFence = createWoodenFence(3.6, 3);
  southWestFence.position.set(-6.3, 0, 10.2);
  southWestFence.rotation.y = 0.35;
  scene.add(southWestFence);

  // --- Skulpturerte Saguaro-kaktuser med riller, buede armer og ørkenblomster ---
  function createRibbedCactusStemGeo(rTop, rBot, height) {
    const radialSegs = 20;
    const geo = new THREE.CylinderGeometry(rTop, rBot, height, radialSegs, 6);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const r = Math.hypot(x, z);
      if (r < 0.001) continue;
      const ang = Math.atan2(z, x);
      const rib = 1.0 + 0.09 * Math.cos(ang * 10);
      pos.setX(i, x * rib);
      pos.setZ(i, z * rib);
    }
    geo.computeVertexNormals();
    return geo;
  }

  const cactusStemGeo = createRibbedCactusStemGeo(0.20, 0.25, 2.35);
  const cactusCapGeo = new THREE.SphereGeometry(0.205, 12, 8);
  const cactusMat = new THREE.MeshStandardMaterial({
    color: 0x427c3d,
    map: sharedFoliageTex,
    normalMap: sharedFoliageNormalTex,
    normalScale: new THREE.Vector2(0.45, 0.45),
    roughnessMap: sharedFoliageRoughTex,
    roughness: 0.76
  });
  const cactusFlowerCoralMat = new THREE.MeshStandardMaterial({
    color: 0xff6b57,
    emissive: 0x3b0c06,
    roughness: 0.55
  });
  const cactusFlowerGoldMat = new THREE.MeshStandardMaterial({
    color: 0xffd24d,
    emissive: 0x382600,
    roughness: 0.5
  });
  const cactusPetalGeo = new THREE.ConeGeometry(0.055, 0.09, 6);

  function createCactusFlower(isGold) {
    const fl = new THREE.Group();
    const petalMat = isGold ? cactusFlowerGoldMat : cactusFlowerCoralMat;
    for (let p = 0; p < 5; p++) {
      const ang = (p / 5) * Math.PI * 2;
      const petal = new THREE.Mesh(cactusPetalGeo, petalMat);
      petal.position.set(Math.cos(ang) * 0.036, 0.02, Math.sin(ang) * 0.036);
      petal.rotation.z = -Math.cos(ang) * 0.65;
      petal.rotation.x = Math.sin(ang) * 0.65;
      fl.add(petal);
    }
    const center = new THREE.Mesh(new THREE.SphereGeometry(0.026, 6, 5), cactusFlowerGoldMat);
    center.position.y = 0.03;
    fl.add(center);
    return fl;
  }

  function spawnCactus(x, z, scale = 1, variant = 0) {
    const g = new THREE.Group();
    const stem = new THREE.Mesh(cactusStemGeo, cactusMat);
    stem.position.y = 1.16;
    stem.castShadow = true;
    stem.receiveShadow = true;
    g.add(stem);

    const topDome = new THREE.Mesh(cactusCapGeo, cactusMat);
    topDome.position.y = 2.33;
    g.add(topDome);

    const topBloom = createCactusFlower(variant % 2 === 0);
    topBloom.position.set(0.02, 2.51, 0.02);
    g.add(topBloom);

    // Ekte buet høyre Saguaro-arm (TubeGeometry)
    const rightCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.14, 1.18, 0),
      new THREE.Vector3(0.48, 1.20, 0),
      new THREE.Vector3(0.62, 1.42, 0),
      new THREE.Vector3(0.63, 1.98, 0)
    ]);
    const rightArm = new THREE.Mesh(new THREE.TubeGeometry(rightCurve, 12, 0.128, 10, false), cactusMat);
    rightArm.castShadow = true;
    g.add(rightArm);

    const rightTip = new THREE.Mesh(new THREE.SphereGeometry(0.128, 10, 8), cactusMat);
    rightTip.position.set(0.63, 1.98, 0);
    g.add(rightTip);

    const rightBloom = createCactusFlower(variant % 2 !== 0);
    rightBloom.position.set(0.63, 2.1, 0);
    g.add(rightBloom);

    // Venstre arm for variasjon
    if (variant % 3 !== 1) {
      const leftCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.14, 0.96, 0.02),
        new THREE.Vector3(-0.44, 0.99, 0.03),
        new THREE.Vector3(-0.56, 1.22, 0.03),
        new THREE.Vector3(-0.56, 1.68, 0.03)
      ]);
      const leftArm = new THREE.Mesh(new THREE.TubeGeometry(leftCurve, 11, 0.115, 10, false), cactusMat);
      leftArm.castShadow = true;
      g.add(leftArm);

      const leftTip = new THREE.Mesh(new THREE.SphereGeometry(0.115, 10, 8), cactusMat);
      leftTip.position.set(-0.56, 1.68, 0.03);
      g.add(leftTip);
    }

    g.position.set(x, getTerrainHeight(x, z), z);
    g.rotation.y = variant * 1.15;
    g.scale.setScalar(scale);
    scene.add(g);
  }

  [
    [-15, 6, 1.05], [16, 8, 0.92], [14, -10, 1.15], [-17, -12, 0.88],
    [-28, 18, 1.22], [29, 20, 1.1], [-34, -16, 1.0], [36, -6, 1.28],
    [-22, 32, 0.95], [24, 35, 1.12]
  ].forEach(([cx, cz, cs], idx) => spawnCactus(cx, cz, cs, idx));

  // =========================================================================
  // 6. SKOG- OG JAKTOMRÅDE MED NATURLIGE TRÆR (BARK + BUMP + LAGDELTE KRONER) OG STEINER
  // =========================================================================
  const forestGroup = new THREE.Group();
  scene.add(forestGroup);

  // Subdividert skogbunn med myk radial uttoning slik at den følger alle sanddyner uten kutt/søm
  const forestAlphaCanvas = document.createElement('canvas');
  forestAlphaCanvas.width = 128;
  forestAlphaCanvas.height = 128;
  {
    const aCtx = forestAlphaCanvas.getContext('2d');
    aCtx.fillStyle = '#000000';
    aCtx.fillRect(0, 0, 128, 128);
    const grad = aCtx.createRadialGradient(64, 64, 18, 64, 64, 62);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.68, '#d8d8d8');
    grad.addColorStop(1, '#000000');
    aCtx.fillStyle = grad;
    aCtx.fillRect(0, 0, 128, 128);
  }
  const forestAlphaTex = new THREE.CanvasTexture(forestAlphaCanvas);

  const forestPatchGeo = new THREE.PlaneGeometry(64, 64, 32, 32);
  forestPatchGeo.rotateX(-Math.PI / 2);
  {
    const pos = forestPatchGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const wx = pos.getX(i);
      const wz = pos.getZ(i) - 46;
      pos.setY(i, getTerrainHeight(wx, wz) + 0.025);
    }
    forestPatchGeo.computeVertexNormals();
  }
  const forestPatch = new THREE.Mesh(
    forestPatchGeo,
    new THREE.MeshStandardMaterial({
      color: 0x768c46,
      map: sharedFoliageTex,
      normalMap: sharedFoliageNormalTex,
      normalScale: new THREE.Vector2(0.52, 0.52),
      roughnessMap: sharedFoliageRoughTex,
      alphaMap: forestAlphaTex,
      transparent: true,
      depthWrite: false,
      roughness: 0.94
    })
  );
  forestPatch.position.set(0, 0, -46);
  forestPatch.receiveShadow = true;
  forestGroup.add(forestPatch);

  // Delte geometrier og PBR-materialer for naturlige trær (72–90 FPS i Quest)
  const trunkGeo = new THREE.CylinderGeometry(0.16, 0.38, 2.7, 9);
  const rootFlareGeo = new THREE.ConeGeometry(0.52, 0.55, 8);
  const branchGeo = new THREE.CylinderGeometry(0.055, 0.11, 0.98, 6);
  const tier1Geo = new THREE.ConeGeometry(1.82, 1.92, 9);
  const tier2Geo = new THREE.ConeGeometry(1.46, 1.78, 9);
  const tier3Geo = new THREE.ConeGeometry(1.08, 1.58, 9);
  const boughClumpGeo = new THREE.DodecahedronGeometry(0.8, 1);

  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x784b28,
    map: sharedBarkTex,
    normalMap: sharedBarkNormalTex,
    normalScale: new THREE.Vector2(0.95, 0.95),
    roughnessMap: sharedBarkRoughTex,
    roughness: 0.92
  });
  const foliageMatA = new THREE.MeshStandardMaterial({
    color: 0x387836,
    map: sharedFoliageTex,
    normalMap: sharedFoliageNormalTex,
    normalScale: new THREE.Vector2(0.55, 0.55),
    roughnessMap: sharedFoliageRoughTex,
    roughness: 0.88
  });
  const foliageMatB = new THREE.MeshStandardMaterial({
    color: 0x488a3f,
    map: sharedFoliageTex,
    normalMap: sharedFoliageNormalTex,
    normalScale: new THREE.Vector2(0.55, 0.55),
    roughnessMap: sharedFoliageRoughTex,
    roughness: 0.86
  });
  const foliageMatDark = new THREE.MeshStandardMaterial({
    color: 0x295e2a,
    map: sharedFoliageTex,
    normalMap: sharedFoliageNormalTex,
    normalScale: new THREE.Vector2(0.62, 0.62),
    roughnessMap: sharedFoliageRoughTex,
    roughness: 0.9
  });

  function addTree(x, z, scale = 1, variant = 0) {
    const tree = new THREE.Group();
    const leafMain = variant % 2 === 0 ? foliageMatA : foliageMatB;
    const castTreeShadow = z > -46; // Skygger på de nærmeste trærne for høy FPS

    const rootFlare = new THREE.Mesh(rootFlareGeo, trunkMat);
    rootFlare.position.y = 0.22;
    tree.add(rootFlare);

    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1.3;
    trunk.rotation.z = ((variant % 3) - 1) * 0.032;
    trunk.castShadow = castTreeShadow;
    trunk.receiveShadow = true;
    tree.add(trunk);

    // To synlige sidegrener som bryter opp stammen
    const branchL = new THREE.Mesh(branchGeo, trunkMat);
    branchL.position.set(-0.28, 1.88, 0.06);
    branchL.rotation.z = 0.72;
    tree.add(branchL);

    const branchR = new THREE.Mesh(branchGeo, trunkMat);
    branchR.position.set(0.26, 2.18, -0.08);
    branchR.rotation.z = -0.68;
    tree.add(branchR);

    // Lagdelte, lett forskjøvne trekroner + organiske løvklynger på sidene
    const t1 = new THREE.Mesh(tier1Geo, foliageMatDark);
    t1.position.set(0.04, 2.58, -0.03);
    t1.rotation.y = variant * 0.7;
    t1.castShadow = castTreeShadow;
    tree.add(t1);

    const t2 = new THREE.Mesh(tier2Geo, leafMain);
    t2.position.set(-0.05, 3.58, 0.04);
    t2.rotation.y = variant * 1.3 + 0.4;
    t2.rotation.z = 0.04;
    t2.castShadow = castTreeShadow;
    tree.add(t2);

    const t3 = new THREE.Mesh(tier3Geo, leafMain);
    t3.position.set(0.02, 4.54, 0);
    t3.rotation.y = variant * 0.9;
    t3.rotation.x = -0.04;
    tree.add(t3);

    // Organiske sideklynger + rund eikekrone-variant + myk kontaktsygge ved roten
    const clumpA = new THREE.Mesh(boughClumpGeo, leafMain);
    clumpA.position.set(-0.68, 2.65, 0.28);
    clumpA.scale.set(1.05, 0.72, 0.95);
    tree.add(clumpA);

    const clumpB = new THREE.Mesh(boughClumpGeo, foliageMatDark);
    clumpB.position.set(0.64, 3.1, -0.24);
    clumpB.scale.set(0.95, 0.68, 0.9);
    tree.add(clumpB);

    if (variant % 3 === 2) {
      // Fyldig eikekrone som gir variasjon i Whispering Woods
      const oakCrown = new THREE.Mesh(boughClumpGeo, foliageMatB);
      oakCrown.position.set(0, 3.45, 0);
      oakCrown.scale.set(1.95, 1.38, 1.88);
      tree.add(oakCrown);
    }

    if (createContactShadow) {
      tree.add(createContactShadow(1.35, 1.35, 0.06));
    }

    tree.position.set(x, getTerrainBaseHeight(x, z) - 0.04, z);
    tree.rotation.y = (variant * 1.9) % (Math.PI * 2);
    tree.scale.setScalar(scale);
    forestGroup.add(tree);
  }

  const treeCoords = [
    [-6.5, -26, 1.05], [6.2, -27, 1.1], [-11.5, -29, 1.25], [10.8, -30, 0.95],
    [-4.8, -33, 1.15], [5.0, -34, 1.2], [-15.0, -35, 1.3], [14.5, -36, 1.1],
    [-8.5, -39, 1.35], [8.8, -40, 1.0], [-19.5, -41, 1.25], [19.0, -40, 1.3],
    [-5.4, -44, 1.1], [5.8, -45, 1.25], [-13.5, -46, 1.4], [13.0, -47, 1.15],
    [-23.0, -49, 1.2], [22.5, -48, 1.35], [-7.5, -52, 1.3], [7.2, -53, 1.05],
    [-16.5, -55, 1.25], [16.8, -56, 1.4], [-4.8, -58, 1.15], [5.2, -59, 1.2],
    [-11.5, -62, 1.35], [11.2, -63, 1.1], [-20.0, -64, 1.3], [19.2, -65, 1.25],
    [-6.5, -68, 1.4], [6.8, -69, 1.2], [-14.0, -71, 1.15], [13.5, -71, 1.3],
    // Nord for elven og trebroen (z: -86 til -142) – dype Whispering Woods med bjørnehi
    [-6.5, -87, 1.35], [6.8, -88, 1.25], [-15.5, -90, 1.45], [15.2, -91, 1.3],
    [-26.0, -92, 1.4], [25.5, -93, 1.35], [-9.2, -96, 1.5], [9.5, -97, 1.25],
    [-19.5, -101, 1.4], [19.0, -102, 1.45], [-5.8, -105, 1.3], [6.2, -106, 1.35],
    [-31.0, -108, 1.5], [30.5, -109, 1.4], [-13.5, -112, 1.45], [13.8, -113, 1.35],
    [-23.5, -117, 1.55], [23.0, -118, 1.45], [-7.2, -121, 1.35], [7.5, -122, 1.4],
    [-17.0, -126, 1.5], [17.5, -127, 1.45], [-29.0, -131, 1.55], [28.5, -132, 1.5],
    [-10.5, -136, 1.45], [10.8, -137, 1.4], [-21.0, -140, 1.5], [20.5, -141, 1.5]
  ];
  treeCoords.forEach(([x, z, s], idx) => addTree(x, z, s, idx));

  // Steiner med ru sandsteinstekstur, normalMap og roughnessMap
  const rockGeo = new THREE.DodecahedronGeometry(0.88, 1);
  const rockMatA = new THREE.MeshStandardMaterial({
    color: 0xa8927c,
    map: sharedSandstoneTex,
    normalMap: sharedSandstoneNormalTex,
    normalScale: new THREE.Vector2(1.05, 1.05),
    roughnessMap: sharedSandstoneRoughTex,
    roughness: 0.9
  });
  const rockMatB = new THREE.MeshStandardMaterial({
    color: 0x8b7764,
    map: sharedSandstoneTex,
    normalMap: sharedSandstoneNormalTex,
    normalScale: new THREE.Vector2(1.15, 1.15),
    roughnessMap: sharedSandstoneRoughTex,
    roughness: 0.92
  });

  const rockCoords = [
    [-4.6, -26, 0.9, 0.6, 1.1], [4.8, -28, 1.2, 0.75, 0.95],
    [-9.2, -31, 1.5, 0.9, 1.3], [8.4, -34, 1.1, 0.7, 1.2],
    [-13.5, -42, 1.7, 1.05, 1.4], [13.2, -48, 1.6, 0.95, 1.3],
    [-8.8, -56, 1.45, 0.8, 1.25], [9.5, -60, 1.3, 0.85, 1.1],
    [-12.0, -95, 1.8, 1.1, 1.5], [12.5, -104, 1.7, 1.0, 1.4],
    [-16.0, -124, 2.0, 1.25, 1.7], [15.5, -130, 1.9, 1.2, 1.6]
  ];
  rockCoords.forEach(([x, z, sx, sy, sz], idx) => {
    const rock = new THREE.Mesh(rockGeo, idx % 2 === 0 ? rockMatA : rockMatB);
    rock.position.set(x, getTerrainBaseHeight(x, z) + sy * 0.38, z);
    rock.scale.set(sx, sy, sz);
    rock.rotation.set(idx * 0.5, idx * 1.1, 0);
    rock.castShadow = z > -42;
    rock.receiveShadow = true;
    forestGroup.add(rock);

    const halfX = sx * 0.88;
    const halfZ = sz * 0.88;
    rockColliders.push({
      minX: x - halfX,
      maxX: x + halfX,
      minZ: z - halfZ,
      maxZ: z + halfZ
    });
  });

  // =========================================================================
  // 6b. ELVELEIE & TREBRO I WHISPERING WOODS (z ~ -78)
  // =========================================================================
  const structureWallColliders = [];

  function pushMeasuredWorldBoxCollider(meshOrGroup, maxY = 4.2, shrinkPad = 0.04) {
    meshOrGroup.updateMatrixWorld(true);
    rockMeasureBox.setFromObject(meshOrGroup);
    structureWallColliders.push({
      minX: rockMeasureBox.min.x + shrinkPad,
      maxX: rockMeasureBox.max.x - shrinkPad,
      minZ: rockMeasureBox.min.z + shrinkPad,
      maxZ: rockMeasureBox.max.z - shrinkPad,
      maxY
    });
  }

  // Grunt glitrende elveløp (sømløs terrengfølgende elveflate) gjennom Whispering Woods under trebroen
  const creekWaterMat = new THREE.MeshStandardMaterial({
    color: 0x265466,
    roughness: 0.07,
    metalness: 0.2,
    normalMap: sharedDesertSandNormalTex,
    normalScale: new THREE.Vector2(0.12, 0.12),
    envMapIntensity: 1.55
  });
  const creekGeo = new THREE.PlaneGeometry(116, 4.2, 72, 6);
  creekGeo.rotateX(-Math.PI / 2);
  {
    const cPos = creekGeo.attributes.position;
    for (let i = 0; i < cPos.count; i++) {
      const wx = cPos.getX(i);
      const localZ = cPos.getZ(i);
      const centerZ = -78.0 + Math.sin(wx * 0.065) * 3.6;
      const wz = centerZ + localZ;
      const centerBedY = getTerrainBaseHeight(wx, centerZ);
      cPos.setZ(i, wz);
      cPos.setY(i, centerBedY + 0.26);
    }
    creekGeo.computeVertexNormals();
  }
  const creekMesh = new THREE.Mesh(creekGeo, creekWaterMat);
  creekMesh.receiveShadow = true;
  scene.add(creekMesh);

  // Solid buet trebro ved (x = 0, z = -78) som flukter 100 % med elvebreddene + bærestolper ned i elva
  const bridgeGroup = new THREE.Group();
  for (let bz = -84.0; bz <= -72.0; bz += 0.48) {
    const deckY = getBridgeDeckY(bz);
    const plank = new THREE.Mesh(
      new THREE.BoxGeometry(4.1, 0.10, 0.43),
      Math.round(bz * 2) % 2 === 0 ? lightWoodMat : weatheredPlankMatA
    );
    plank.position.set(0, deckY - 0.04, bz);
    plank.receiveShadow = true;
    plank.castShadow = true;
    bridgeGroup.add(plank);
  }
  [-1.95, 1.95].forEach((bx) => {
    // Langsgående bærebjelker under brodekket
    for (let bz = -83.5; bz <= -72.5; bz += 1.0) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 1.08), darkWoodMat);
      beam.position.set(bx * 0.88, getBridgeDeckY(bz) - 0.15, bz);
      bridgeGroup.add(beam);
    }
    for (let pz = -83.0; pz <= -73.0; pz += 2.5) {
      const deckY = getBridgeDeckY(pz);
      const bedY = getTerrainBaseHeight(bx, pz) - 0.25;
      const postTop = deckY + 1.05;
      const totalH = Math.max(1.2, postTop - bedY);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.17, totalH, 0.17), darkWoodMat);
      post.position.set(bx, bedY + totalH * 0.5, pz);
      post.castShadow = true;
      bridgeGroup.add(post);

      if (pz < -73.0) {
        const nextZ = pz + 2.5;
        const y1 = deckY + 0.96;
        const y2 = getBridgeDeckY(nextZ) + 0.96;
        const dy = y2 - y1;
        const segLen = Math.hypot(2.5, dy) + 0.06;
        const railSeg = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.11, segLen), darkWoodMat);
        railSeg.position.set(bx, (y1 + y2) * 0.5, pz + 1.25);
        railSeg.rotation.x = -Math.atan2(dy, 2.5);
        bridgeGroup.add(railSeg);
      }
    }
    // Rekkverk-kollisjonsboks målt langs hver side av broen (fri bredde imellom = 3,58 m)
    structureWallColliders.push({
      minX: bx - 0.16,
      maxX: bx + 0.16,
      minZ: -84.0,
      maxZ: -72.0,
      maxY: 2.2
    });
  });
  scene.add(bridgeGroup);

  // =========================================================================
  // 6c. CRIMSON CANYON BANDITTLEIR, FORLATT GULLGRUVE & GULLKLUMPER (Øst, x: +35..+145)
  // =========================================================================
  const canyonGroup = new THREE.Group();
  scene.add(canyonGroup);

  // Bandittleir rundt (x = 82, z = 4.5) med leirbål, barrikader og tønner
  const outlawCampfire = createCampfire();
  outlawCampfire.position.set(82.0, getTerrainBaseHeight(82.0, 4.5), 4.5);
  canyonGroup.add(outlawCampfire);

  [
    { x: 76.5, z: -5.8, ry: 0.25 },
    { x: 88.5, z: 7.2, ry: -0.35 },
    { x: 96.0, z: -6.5, ry: 0.15 }
  ].forEach((bar) => {
    const barricade = createWoodenFence(3.8, 4);
    barricade.position.set(bar.x, getTerrainBaseHeight(bar.x, bar.z), bar.z);
    barricade.rotation.y = bar.ry;
    canyonGroup.add(barricade);
    pushMeasuredWorldBoxCollider(barricade, 1.4, 0.02);
  });

  [
    [79.2, -5.2], [80.0, -4.5], [89.8, 6.2], [106.5, -4.8], [116.5, 4.4]
  ].forEach(([bx, bz]) => {
    const brl = createDetailedBarrel();
    const gy = getTerrainBaseHeight(bx, bz);
    brl.position.set(bx, gy + 0.41, bz);
    canyonGroup.add(brl);
    if (createContactShadow) {
      const sh = createContactShadow(0.45, 0.45, gy + 0.03);
      sh.position.x = bx;
      sh.position.z = bz;
      canyonGroup.add(sh);
    }
  });

  // Forsterket gruveinngang (Abandoned Gold Mine) ved x = 124, z = -1.5 (vendt mot -X vest)
  const mineOriginX = 124.0;
  const mineOriginZ = -1.5;
  const mineBaseY = getTerrainBaseHeight(mineOriginX, mineOriginZ); // 0.65
  const mineGroup = new THREE.Group();
  mineGroup.position.set(mineOriginX, mineBaseY, mineOriginZ);
  canyonGroup.add(mineGroup);

  // Røde klippeblokker rundt gruveåpningen (fri tunnelåpning z_local = -1.55..+1.55 -> 3,10 m!)
  const mineCliffLeft = new THREE.Mesh(new THREE.BoxGeometry(8.5, 7.2, 6.2), crimsonRockMat || mesaMat);
  mineCliffLeft.position.set(3.8, 3.5, -4.65);
  mineCliffLeft.castShadow = true;
  mineCliffLeft.receiveShadow = true;
  mineGroup.add(mineCliffLeft);

  const mineCliffRight = new THREE.Mesh(new THREE.BoxGeometry(8.5, 7.2, 6.2), crimsonRockMat || mesaMat);
  mineCliffRight.position.set(3.8, 3.5, 4.65);
  mineCliffRight.castShadow = true;
  mineCliffRight.receiveShadow = true;
  mineGroup.add(mineCliffRight);

  const mineCliffTop = new THREE.Mesh(new THREE.BoxGeometry(8.6, 3.6, 4.2), crimsonRockMat || mesaMat);
  mineCliffTop.position.set(3.8, 5.4, 0);
  mineCliffTop.castShadow = true;
  mineGroup.add(mineCliffTop);

  const mineBackWall = new THREE.Mesh(new THREE.BoxGeometry(1.6, 5.2, 5.0), darkGraveStoneMat || mesaCapMat);
  mineBackWall.position.set(7.6, 2.5, 0);
  mineGroup.add(mineBackWall);

  // Kraftige tømmerrammer innover i gruvetunnelen
  for (let tx = -0.2; tx <= 6.2; tx += 2.1) {
    [-1.62, 1.62].forEach((tz) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.32, 3.4, 0.32), logTimberMat);
      post.position.set(tx, 1.7, tz);
      post.castShadow = true;
      mineGroup.add(post);
    });
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 3.8), logTimberMat);
    beam.position.set(tx, 3.45, 0);
    beam.castShadow = true;
    mineGroup.add(beam);
  }

  // Gruveskinner (x_local = -20..+6.4) + stål-gruvevogn full av gullmalm!
  [-0.48, 0.48].forEach((rz) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(26.0, 0.07, 0.07), wroughtIronMat);
    rail.position.set(-6.5, 0.08, rz);
    mineGroup.add(rail);
  });
  for (let sx = -19.0; sx <= 6.0; sx += 0.95) {
    const sleeper = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 1.38), darkWoodMat);
    sleeper.position.set(sx, 0.03, 0);
    mineGroup.add(sleeper);
  }

  // Gruvevogn (plassert på siden av sporet foran inngangen slik at midtgangen inn i gruven er åpen)
  const minecart = new THREE.Group();
  const cartTub = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.72, 0.96), wroughtIronMat);
  cartTub.position.y = 0.62;
  cartTub.castShadow = true;
  minecart.add(cartTub);
  [-0.48, 0.48].forEach((wx) => {
    [-0.50, 0.50].forEach((wz) => {
      const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 12), wroughtIronMat);
      wh.rotation.x = Math.PI / 2;
      wh.position.set(wx, 0.24, wz);
      minecart.add(wh);
    });
  });
  const oreMat = new THREE.MeshStandardMaterial({
    color: 0xffd248,
    emissive: 0x523600,
    metalness: 0.92,
    roughness: 0.2,
    envMapIntensity: 1.6
  });
  for (let oi = 0; oi < 6; oi++) {
    const nugget = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), oreMat);
    nugget.position.set((oi % 3 - 1) * 0.34, 1.02 + (oi % 2) * 0.08, (oi < 3 ? -0.16 : 0.16));
    minecart.add(nugget);
  }
  minecart.position.set(-7.5, 0.04, 2.35);
  minecart.rotation.y = 0.22;
  mineGroup.add(minecart);

  const dInit = L ? L() : {
    signMineTitle: 'ABANDONED MINE', signMineSub: 'CRIMSON GOLD VEIN',
    signChapelTitle: 'BOOT HILL CHAPEL', signChapelSub: 'ALTAR OF MALAKOR',
    roadWoodsTitle: '↑ WHISPERING WOODS', roadWoodsSub: 'River Bridge • Deer • Grizzlies',
    roadCanyonTitle: '→ CRIMSON CANYON', roadCanyonSub: 'Outlaw Camp & Gold Mine',
    roadGraveyardTitle: '← BOOT HILL', roadGraveyardSub: 'Graveyard & Ruined Chapel',
    roadTownTitle: 'DUSTWOOD TOWN', roadTownSub: 'Saloon • Gunsmith • Safe House'
  };

  const mineSignMesh = createWesternSign(dInit.signMineTitle, dInit.signMineSub, 3.8, 0.96);
  mineSignMesh.position.set(-0.45, 4.25, 0);
  mineSignMesh.rotation.y = -Math.PI / 2;
  mineGroup.add(mineSignMesh);

  // Varm gruvelykt med halo
  const mineGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: sharedSparkGlowTex || sharedParticleGlowTex,
      color: 0xffad42,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  mineGlow.scale.set(1.9, 1.9, 1);
  mineGlow.position.set(-0.35, 3.15, -1.55);
  mineGroup.add(mineGlow);

  // Mål gruvevegger nøyaktig med THREE.Box3 (fri inngang 3,10 m i midten!)
  canyonGroup.updateMatrixWorld(true);
  pushMeasuredWorldBoxCollider(mineCliffLeft, 7.2, 0.05);
  pushMeasuredWorldBoxCollider(mineCliffRight, 7.2, 0.05);
  pushMeasuredWorldBoxCollider(mineBackWall, 5.2, 0.05);
  pushMeasuredWorldBoxCollider(minecart, 1.3, 0.04);

  // 6 Glitrende gullklumper / skattekister i og ved gruven som gir Gull (Gold)
  const goldPickups = [];
  const goldHitMeshes = [];
  [
    { x: 129.2, z: -1.5, amount: 20, isChest: true },
    { x: 126.4, z: -0.6, amount: 15, isChest: false },
    { x: 122.2, z: -2.4, amount: 12, isChest: false },
    { x: 114.5, z: 2.2, amount: 15, isChest: true },
    { x: 91.5, z: -2.8, amount: 12, isChest: false },
    { x: 83.8, z: 6.4, amount: 15, isChest: true }
  ].forEach((gpSpec) => {
    const gHolder = new THREE.Group();
    const gy = getTerrainBaseHeight(gpSpec.x, gpSpec.z);
    gHolder.position.set(gpSpec.x, gy, gpSpec.z);

    let hitMesh;
    if (gpSpec.isChest) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.48, 0.52), darkWoodMat);
      box.position.y = 0.24;
      box.castShadow = true;
      gHolder.add(box);
      const lidGold = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.16, 0.42), oreMat);
      lidGold.position.y = 0.50;
      gHolder.add(lidGold);
      hitMesh = box;
    } else {
      const rockGold = new THREE.Mesh(new THREE.DodecahedronGeometry(0.34, 0), oreMat);
      rockGold.position.y = 0.28;
      rockGold.castShadow = true;
      gHolder.add(rockGold);
      hitMesh = rockGold;
    }

    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: sharedSparkGlowTex || sharedParticleGlowTex,
        color: 0xffe066,
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    halo.scale.set(1.15, 1.15, 1);
    halo.position.y = 0.55;
    gHolder.add(halo);

    scene.add(gHolder);
    const entry = {
      group: gHolder,
      hitMesh,
      amount: gpSpec.amount,
      collected: false,
      respawnTimer: 0
    };
    hitMesh.userData.goldEntry = entry;
    goldPickups.push(entry);
    goldHitMeshes.push(hitMesh);
  });

  // =========================================================================
  // 6d. BOOT HILL KIRKEGÅRD & ØDELAGT STEINKAPELL (Vest, x: -35 til -145)
  // =========================================================================
  const graveyardGroup = new THREE.Group();
  scene.add(graveyardGroup);

  // Smijernsgjerde ved inngangen til Boot Hill (x = -62, åpen port z = -3.7..-0.3 -> 4,4 m bred ved z = -1.5)
  [
    { zMin: -22.0, zMax: -4.0 },
    { zMin: 1.0, zMax: 19.0 }
  ].forEach((seg) => {
    const len = seg.zMax - seg.zMin;
    const midZ = (seg.zMin + seg.zMax) * 0.5;
    const baseY = getTerrainBaseHeight(-62.0, midZ);
    const fGroup = new THREE.Group();
    fGroup.position.set(-62.0, baseY, midZ);

    const railLow = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, len), wroughtIronMat);
    railLow.position.y = 0.35;
    fGroup.add(railLow);
    const railHigh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, len), wroughtIronMat);
    railHigh.position.y = 1.45;
    fGroup.add(railHigh);

    for (let pz = -len * 0.5; pz <= len * 0.5 + 0.01; pz += 0.65) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 1.68, 6), wroughtIronMat);
      bar.position.set(0, 0.84, pz);
      fGroup.add(bar);
    }
    graveyardGroup.add(fGroup);
    structureWallColliders.push({
      minX: -62.25,
      maxX: -61.75,
      minZ: seg.zMin,
      maxZ: seg.zMax,
      maxY: 2.0
    });
  });

  // Steinstolper og smijernsbue over kirkegårdsporten (x = -62, z = -4.0..+1.0, fri bredde 4,4 m)
  [-4.1, 1.1].forEach((gz) => {
    const py = getTerrainBaseHeight(-62.0, gz);
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.75, 2.8, 0.75), darkGraveStoneMat || stonePlinthMat);
    pillar.position.set(-62.0, py + 1.4, gz);
    pillar.castShadow = true;
    graveyardGroup.add(pillar);
  });
  const gateArch = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.08, 6, 16, Math.PI), wroughtIronMat);
  gateArch.rotation.y = Math.PI / 2;
  gateArch.position.set(-62.0, getTerrainBaseHeight(-62.0, -1.5) + 2.65, -1.5);
  graveyardGroup.add(gateArch);

  // Skjeve gravsteiner, steinkors og kontaktskygger på Boot Hill
  const headstoneGeo = new THREE.BoxGeometry(0.68, 1.08, 0.16);
  const headstoneTopGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.16, 12);
  headstoneTopGeo.rotateX(Math.PI / 2);
  const deadTreeMat = new THREE.MeshStandardMaterial({ color: 0x3b2f28, roughness: 0.95 });

  const graveRng = createSeededRng(1889);
  for (let gi = 0; gi < 22; gi++) {
    const gx = -68 - (gi % 6) * 7.2 + (graveRng() - 0.5) * 2.2;
    const gzSide = gi % 2 === 0 ? -1 : 1;
    const gz = -1.5 + gzSide * (4.8 + Math.floor(gi / 6) * 4.8 + graveRng() * 1.8);
    const gy = getTerrainBaseHeight(gx, gz);

    const grave = new THREE.Group();
    grave.position.set(gx, gy, gz);
    grave.rotation.set((graveRng() - 0.5) * 0.18, (graveRng() - 0.5) * 0.35, (graveRng() - 0.5) * 0.22);

    if (gi % 3 === 0) {
      // Keltisk/western steinkors
      const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.38, 0.18), darkGraveStoneMat || stonePlinthMat);
      vBar.position.y = 0.66;
      vBar.castShadow = true;
      grave.add(vBar);
      const hBar = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.20, 0.18), darkGraveStoneMat || stonePlinthMat);
      hBar.position.y = 0.96;
      hBar.castShadow = true;
      grave.add(hBar);
    } else {
      const slab = new THREE.Mesh(headstoneGeo, darkGraveStoneMat || stonePlinthMat);
      slab.position.y = 0.50;
      slab.castShadow = true;
      grave.add(slab);
      const cap = new THREE.Mesh(headstoneTopGeo, darkGraveStoneMat || stonePlinthMat);
      cap.position.y = 1.04;
      cap.rotation.z = Math.PI / 2;
      grave.add(cap);
    }

    if (createContactShadow) {
      grave.add(createContactShadow(0.58, 0.42, 0.03));
    }
    graveyardGroup.add(grave);
  }

  // Visne/døde trær på Boot Hill
  [
    [-70, -14], [-74, 12], [-86, -16], [-89, 14], [-102, -13], [-104, 11], [-128, -12], [-129, 10]
  ].forEach(([dx, dz], idx) => {
    const dtGroup = new THREE.Group();
    const dy = getTerrainBaseHeight(dx, dz);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.32, 3.4, 7), deadTreeMat);
    trunk.position.y = 1.65;
    trunk.rotation.z = ((idx % 2) * 2 - 1) * 0.09;
    trunk.castShadow = true;
    dtGroup.add(trunk);
    [-1, 1].forEach((s) => {
      const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.10, 1.65, 6), deadTreeMat);
      limb.position.set(s * 0.48, 2.55 + s * 0.18, 0.08);
      limb.rotation.z = -s * 0.78;
      dtGroup.add(limb);
    });
    if (createContactShadow) dtGroup.add(createContactShadow(0.95, 0.95, 0.04));
    dtGroup.position.set(dx, dy, dz);
    dtGroup.rotation.y = idx * 1.3;
    graveyardGroup.add(dtGroup);
  });

  // Lav spøkelseståke som hviler over Boot Hill Kirkegård (0 ekstra draw-dybdekonflikt)
  if (sharedSmokePuffTex) {
    const mistMat = new THREE.MeshBasicMaterial({
      map: sharedSmokePuffTex,
      color: 0x9bb0c9,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    [
      [-76, -6], [-84, 6], [-96, -4], [-108, 4], [-116, -5]
    ].forEach(([mx, mz], idx) => {
      const mist = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), mistMat);
      mist.rotation.x = -Math.PI / 2;
      mist.position.set(mx, getTerrainBaseHeight(mx, mz) + 0.32 + (idx % 2) * 0.14, mz);
      graveyardGroup.add(mist);
    });
  }

  // Halvt sammenrast steinkapell ved (x = -120, z = -1.5), vendt mot +X øst med 2,80 m fri døråpning!
  const chapelX = -120.0;
  const chapelZ = -1.5;
  const chapelBaseY = getTerrainBaseHeight(chapelX, chapelZ); // 0.55
  const chapelGroup = new THREE.Group();
  chapelGroup.position.set(chapelX, chapelBaseY, chapelZ);
  graveyardGroup.add(chapelGroup);

  const chapelStoneMat = darkGraveStoneMat || stonePlinthMat;
  const chapelFloor = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.22, 8.6), chapelStoneMat);
  chapelFloor.position.set(0, 0.11, 0);
  chapelFloor.receiveShadow = true;
  chapelGroup.add(chapelFloor);

  // Nordvegg (-Z), Sørvegg (+Z), Vestvegg (-X bakvegg) og to Østvegg-fløyer (+X) rundt 2,80 m åpen dør (-1.40..+1.40)
  const chNorthWall = new THREE.Mesh(new THREE.BoxGeometry(9.4, 3.9, 0.52), chapelStoneMat);
  chNorthWall.position.set(0, 2.05, -4.04);
  chNorthWall.castShadow = true;
  chapelGroup.add(chNorthWall);

  const chSouthWall = new THREE.Mesh(new THREE.BoxGeometry(9.4, 3.2, 0.52), chapelStoneMat);
  chSouthWall.position.set(0, 1.70, 4.04);
  chSouthWall.castShadow = true;
  chapelGroup.add(chSouthWall);

  const chBackWall = new THREE.Mesh(new THREE.BoxGeometry(0.56, 5.2, 8.6), chapelStoneMat);
  chBackWall.position.set(-4.52, 2.70, 0);
  chBackWall.castShadow = true;
  chapelGroup.add(chBackWall);

  const chFrontNorth = new THREE.Mesh(new THREE.BoxGeometry(0.56, 4.2, 2.90), chapelStoneMat);
  chFrontNorth.position.set(4.52, 2.20, -2.85);
  chFrontNorth.castShadow = true;
  chapelGroup.add(chFrontNorth);

  const chFrontSouth = new THREE.Mesh(new THREE.BoxGeometry(0.56, 4.2, 2.90), chapelStoneMat);
  chFrontSouth.position.set(4.52, 2.20, 2.85);
  chFrontSouth.castShadow = true;
  chapelGroup.add(chFrontSouth);

  const chFrontHeader = new THREE.Mesh(new THREE.BoxGeometry(0.58, 1.45, 3.2), chapelStoneMat);
  chFrontHeader.position.set(4.52, 3.72, 0);
  chapelGroup.add(chFrontHeader);

  // Halvt sammenraste taksperrer over kapellet
  for (let rx = -3.4; rx <= 3.5; rx += 2.2) {
    [-1, 1].forEach((side) => {
      if (rx > 0.5 && side > 0) return; // sammenrast hull mot nattehimmelen!
      const rafter = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.22, 4.8), darkWoodMat);
      rafter.position.set(rx, 4.45, side * 2.1);
      rafter.rotation.x = side * 0.42;
      chapelGroup.add(rafter);
    });
  }

  const chapelSignMesh = createWesternSign(dInit.signChapelTitle, dInit.signChapelSub, 3.7, 0.94);
  chapelSignMesh.position.set(4.86, 4.65, 0);
  chapelSignMesh.rotation.y = Math.PI / 2;
  chapelGroup.add(chapelSignMesh);

  // Glødende Blodalter inne i kapellet (klikk/skyt for å fremkalle natt og Lord Malakor!)
  const chapelAltarHitMeshes = [];
  const altarPedestal = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.08, 1.65), chapelStoneMat);
  altarPedestal.position.set(-2.95, 0.65, 0);
  altarPedestal.castShadow = true;
  chapelGroup.add(altarPedestal);
  chapelAltarHitMeshes.push(altarPedestal);

  const bloodOrbMat = new THREE.MeshStandardMaterial({
    color: 0xff1e38,
    emissive: 0xff122c,
    emissiveIntensity: 2.2,
    roughness: 0.18,
    metalness: 0.35
  });
  const bloodChaliceOrb = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 1), bloodOrbMat);
  bloodChaliceOrb.position.set(-2.95, 1.52, 0);
  chapelGroup.add(bloodChaliceOrb);
  chapelAltarHitMeshes.push(bloodChaliceOrb);

  const altarHalo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: sharedSparkGlowTex || sharedParticleGlowTex,
      color: 0xff1e3c,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  altarHalo.scale.set(1.8, 1.8, 1);
  altarHalo.position.set(-2.95, 1.52, 0);
  chapelGroup.add(altarHalo);

  graveyardGroup.updateMatrixWorld(true);
  pushMeasuredWorldBoxCollider(chNorthWall, 4.5, 0.02);
  pushMeasuredWorldBoxCollider(chSouthWall, 4.2, 0.02);
  pushMeasuredWorldBoxCollider(chBackWall, 5.4, 0.02);
  pushMeasuredWorldBoxCollider(chFrontNorth, 4.4, 0.02);
  pushMeasuredWorldBoxCollider(chFrontSouth, 4.4, 0.02);
  pushMeasuredWorldBoxCollider(altarPedestal, 1.4, 0.02);

  // =========================================================================
  // 6e. FIRE REGIONALE VEISKILT (CanvasTexture på EN/NO) LANGS GRUSVEIENE
  // =========================================================================
  const roadSignEntries = [];
  function spawnRoadSignpost(x, z, rotY, titleKey, subKey) {
    const postGroup = new THREE.Group();
    const gy = getTerrainBaseHeight(x, z);
    postGroup.position.set(x, gy, z);
    postGroup.rotation.y = rotY;

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.105, 2.65, 8), darkWoodMat);
    pole.position.y = 1.32;
    pole.castShadow = true;
    postGroup.add(pole);

    const signA = createWesternSign(dInit[titleKey] || '', dInit[subKey] || '', 2.55, 0.66);
    signA.position.set(0, 2.32, 0.11);
    postGroup.add(signA);

    const signB = createWesternSign(dInit[titleKey] || '', dInit[subKey] || '', 2.55, 0.66);
    signB.position.set(0, 2.32, -0.11);
    signB.rotation.y = Math.PI;
    postGroup.add(signB);

    if (createContactShadow) postGroup.add(createContactShadow(0.42, 0.42, 0.03));
    scene.add(postGroup);
    roadSignEntries.push({ signA, signB, titleKey, subKey });
  }

  spawnRoadSignpost(3.2, -21.5, 0.0, 'roadWoodsTitle', 'roadWoodsSub');
  spawnRoadSignpost(21.5, -4.6, -Math.PI / 2, 'roadCanyonTitle', 'roadCanyonSub');
  spawnRoadSignpost(-21.5, -4.6, Math.PI / 2, 'roadGraveyardTitle', 'roadGraveyardSub');
  spawnRoadSignpost(3.4, 15.2, 0.0, 'roadTownTitle', 'roadTownSub');

  function refreshRegionSigns() {
    if (!L) return;
    const d = L();
    mineSignMesh.userData.updateSign(d.signMineTitle, d.signMineSub);
    chapelSignMesh.userData.updateSign(d.signChapelTitle, d.signChapelSub);
    for (let i = 0; i < roadSignEntries.length; i++) {
      const rs = roadSignEntries[i];
      rs.signA.userData.updateSign(d[rs.titleKey], d[rs.subKey]);
      rs.signB.userData.updateSign(d[rs.titleKey], d[rs.subKey]);
    }
  }

  return {
    sky, skySunVec, dayEnvRT, nightEnvRT,
    hemiLight, sunLight, sunMesh,
    rockColliders,
    structureWallColliders,
    goldPickups,
    goldHitMeshes,
    chapelAltarHitMeshes,
    bloodChaliceOrb,
    mineGroup,
    chapelGroup,
    refreshRegionSigns,
    createWesternSign, createDetailedBarrel, createWagonWheel,
    createFramedWindow, addWeatheredFacadePlanks, createWoodenFence,
    createCarvedBatwingDoor,
    campfireFlameMeshes, campfireLight, campfireEmberMat
  };
}
