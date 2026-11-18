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

export function getTerrainHeight(x, z) {
  const cheb = Math.max(Math.abs(x), Math.abs(z));
  if (cheb <= 22.0) return 0;

  const t = Math.min(1, (cheb - 22.0) / 9.0);
  const blend = t * t * (3 - 2 * t);

  const dunePrimary =
    Math.sin(x * 0.052 + Math.cos(z * 0.041) * 1.25) * 1.15 +
    Math.cos(z * 0.064 - x * 0.028) * 0.85;
  const duneSecondary =
    Math.sin((x + z) * 0.115) * 0.28 +
    Math.cos((x - z * 1.3) * 0.088) * 0.24;

  const outerFactor = Math.max(0, (cheb - 48.0) / 55.0);
  const rimLift = outerFactor * outerFactor * (1.8 + 0.9 * Math.sin(x * 0.07) * Math.cos(z * 0.07));

  return (dunePrimary + duneSecondary + rimLift + 0.22) * blend;
}

export function buildEnvironmentAndScenery({ scene, renderer, M, maxAnisotropy, Sky: SkyClass = Sky }) {
  const {
    sharedDesertSandTex, sharedDesertSandNormalTex, sharedDesertSandRoughTex,
    sharedRoadSandTex, sharedRoadNormalTex, sharedRoadRoughTex,
    sharedSandstoneTex, sharedSandstoneNormalTex, sharedSandstoneRoughTex,
    sharedMesaTex, sharedMesaNormalTex, sharedMesaRoughTex,
    sharedBarkTex, sharedBarkNormalTex, sharedBarkRoughTex,
    sharedFoliageTex, sharedFoliageNormalTex, sharedFoliageRoughTex,
    woodWallMat, lightWoodMat, darkWoodMat,
    weatheredPlankMatA, weatheredPlankMatB, shutterWoodMat,
    wroughtIronMat, polishedBrassMat, stonePlinthMat, windowMat
  } = M;

  // --- 3f. Atmosfærisk Sky-shader og forhåndsbakt PMREM PBR-miljølys ---
  const sky = new SkyClass();
  sky.scale.setScalar(490);
  scene.add(sky);

  const skySunVec = new THREE.Vector3();

  applySkyShaderParams(sky, 0, skySunVec);

  // Baker to lette PBR-miljøkart (dag og natt) én gang ved oppstart med PMREMGenerator.
  // Dermed får stål, gull, messing, glass og vann ekte himmel-/ørkenrefleksjoner ved 0 ms per frame!
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();

  function bakeWesternEnvironment(nightAmt) {
    const envScene = new THREE.Scene();
    const envSky = new SkyClass();
    envSky.scale.setScalar(80);
    const tmpSun = new THREE.Vector3();
    applySkyShaderParams(envSky, nightAmt, tmpSun);
    envScene.add(envSky);

    // Varm ørkenbunn i nedre halvkule for realistisk bakke-refleksjon på metall
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
  sunLight.shadow.camera.far = 155;
  sunLight.shadow.camera.left = -46;
  sunLight.shadow.camera.right = 46;
  sunLight.shadow.camera.top = 52;
  sunLight.shadow.camera.bottom = -40;
  sunLight.shadow.bias = -0.0006;
  sunLight.shadow.normalBias = 0.035;
  scene.add(sunLight);

  // Diskret solglorie som forsterker Sky-solskiven
  const sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(4.8, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xfff0c4, fog: false, toneMapped: false })
  );
  sunMesh.position.copy(skySunVec).multiplyScalar(210);
  scene.add(sunMesh);

  // --- 3g. Ørkenlandskap med myke sanddyner (helt flatt y = 0 i byen [-22..22]) ---
  const desertGroundGeo = new THREE.PlaneGeometry(360, 360, 128, 128);
  desertGroundGeo.rotateX(-Math.PI / 2);
  {
    const pos = desertGroundGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      pos.setY(i, getTerrainHeight(vx, vz));
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

  // Hovedgate i byen (ligger innenfor den flate sonen) + sti som følger terrenget inn i skogen
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0xb8844f,
    map: sharedRoadSandTex,
    normalMap: sharedRoadNormalTex,
    normalScale: new THREE.Vector2(0.45, 0.45),
    roughnessMap: sharedRoadRoughTex,
    roughness: 0.94,
    metalness: 0.01
  });

  const mainRoad = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 36), roadMat);
  mainRoad.rotation.x = -Math.PI / 2;
  mainRoad.position.set(0, 0.016, 2);
  mainRoad.receiveShadow = true;
  scene.add(mainRoad);

  const trailGeo = new THREE.PlaneGeometry(3.5, 48, 8, 44);
  trailGeo.rotateX(-Math.PI / 2);
  {
    const pos = trailGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const wx = pos.getX(i);
      const wz = pos.getZ(i) - 37;
      pos.setY(i, getTerrainHeight(wx, wz) + 0.024);
    }
    trailGeo.computeVertexNormals();
  }
  const huntingTrail = new THREE.Mesh(trailGeo, roadMat);
  huntingTrail.position.set(0, 0, -37);
  huntingTrail.receiveShadow = true;
  scene.add(huntingTrail);

  // --- 3h. Monument Valley-inspirerte lagdelte sandsteinsplatåer (Mesas / Buttes) i horisonten ---
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

  // Plasser Monument Valley-platåer i en vid horisontring utenfor PLAY_AREA_LIMIT (85)
  [
    { x: -95, z: -145, r: 26, h: 36, seed: 101, spire: true },
    { x: 18, z: -168, r: 34, h: 42, seed: 202, spire: false },
    { x: 108, z: -138, r: 28, h: 38, seed: 303, spire: true },
    { x: -145, z: -55, r: 24, h: 30, seed: 404, spire: false },
    { x: 148, z: -42, r: 25, h: 32, seed: 505, spire: true },
    { x: -136, z: 58, r: 22, h: 27, seed: 606, spire: false },
    { x: 138, z: 66, r: 24, h: 29, seed: 707, spire: false },
    { x: -64, z: 146, r: 28, h: 34, seed: 808, spire: true },
    { x: 74, z: 152, r: 30, h: 35, seed: 909, spire: false }
  ].forEach((m) => spawnMonumentMesa(m.x, m.z, m.r, m.h, m.seed, m.spire));

  // Nærmere klipper/kampestein-formasjoner ved bandittpostene (målt med THREE.Box3)
  const rockColliders = [];
  const rockMeasureBox = new THREE.Box3();
  const cragBoulderGeo = new THREE.DodecahedronGeometry(1.0, 1);
  function spawnBanditRockCluster(cx, cz, scale, seed) {
    const rng = createSeededRng(seed);
    const cluster = new THREE.Group();
    const baseGround = getTerrainHeight(cx, cz);
    const specs = [
      { ox: 0, oz: 0, sx: 2.8, sy: 2.3, sz: 2.4, mat: mesaMat },
      { ox: -1.9, oz: 1.1, sx: 1.9, sy: 1.4, sz: 1.7, mat: mesaCapMat },
      { ox: 1.8, oz: -0.9, sx: 2.1, sy: 1.7, sz: 1.8, mat: mesaMat },
      { ox: 0.4, oz: 1.7, sx: 1.5, sy: 0.95, sz: 1.4, mat: mesaCapMat }
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

    // Nøyaktig verdensposisjon og størrelse per kampestein målt direkte med THREE.Box3
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
    { x: -31.5, z: 4.5, s: 1.05, seed: 1111 },
    { x: 33.5, z: -16.5, s: 1.15, seed: 1212 },
    { x: -50.0, z: -45.0, s: 1.25, seed: 1313 }
  ].forEach((oc) => spawnBanditRockCluster(oc.x, oc.z, oc.s, oc.seed));

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

  const eastTownFence = createWoodenFence(4.2, 4);
  eastTownFence.position.set(5.6, 0, -5.8);
  eastTownFence.rotation.y = -Math.PI / 2 + 0.18;
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

    // Organiske sideklynger som gir naturlig silhuett i stedet for ren kjegle
    const clumpA = new THREE.Mesh(boughClumpGeo, leafMain);
    clumpA.position.set(-0.68, 2.65, 0.28);
    clumpA.scale.set(1.05, 0.72, 0.95);
    tree.add(clumpA);

    const clumpB = new THREE.Mesh(boughClumpGeo, foliageMatDark);
    clumpB.position.set(0.64, 3.1, -0.24);
    clumpB.scale.set(0.95, 0.68, 0.9);
    tree.add(clumpB);

    tree.position.set(x, getTerrainHeight(x, z) - 0.04, z);
    tree.rotation.y = (variant * 1.9) % (Math.PI * 2);
    tree.scale.setScalar(scale);
    forestGroup.add(tree);
  }

  const treeCoords = [
    [-6.5, -24, 1.05], [6.2, -25, 1.1], [-11.5, -27, 1.25], [10.8, -28, 0.95],
    [-4.8, -30, 1.15], [5.0, -31, 1.2], [-15.0, -32, 1.3], [14.5, -33, 1.1],
    [-8.5, -35, 1.35], [8.8, -36, 1.0], [-18.5, -38, 1.25], [18.0, -37, 1.3],
    [-5.2, -40, 1.1], [5.6, -41, 1.25], [-12.5, -42, 1.4], [12.0, -43, 1.15],
    [-21.0, -45, 1.2], [20.5, -44, 1.35], [-7.5, -47, 1.3], [7.2, -48, 1.05],
    [-15.5, -50, 1.25], [15.8, -51, 1.4], [-3.8, -53, 1.15], [4.5, -54, 1.2],
    [-10.5, -56, 1.35], [10.2, -57, 1.1], [-18.0, -58, 1.3], [17.2, -59, 1.25],
    [-6.0, -62, 1.4], [6.4, -63, 1.2], [-13.0, -65, 1.15], [12.5, -66, 1.3]
  ];
  treeCoords.forEach(([x, z, s], idx) => addTree(x, z, s, idx));

  // Steiner med ru sandsteinstekstur, normalMap og roughnessMap som følger terrenghøyden
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
    [-3.6, -23, 0.9, 0.6, 1.1], [4.1, -26, 1.2, 0.75, 0.95],
    [-9.2, -29, 1.5, 0.9, 1.3], [8.4, -32, 1.1, 0.7, 1.2],
    [-4.0, -36, 0.85, 0.55, 0.9], [6.8, -39, 1.4, 0.85, 1.15],
    [-13.5, -39, 1.7, 1.05, 1.4], [13.2, -46, 1.6, 0.95, 1.3],
    [-6.2, -44, 1.05, 0.65, 1.0], [3.9, -49, 0.95, 0.6, 1.15],
    [-8.8, -52, 1.45, 0.8, 1.25], [9.5, -55, 1.3, 0.85, 1.1],
    [-2.5, -59, 1.15, 0.7, 0.95], [5.2, -61, 1.5, 0.9, 1.35]
  ];
  rockCoords.forEach(([x, z, sx, sy, sz], idx) => {
    const rock = new THREE.Mesh(rockGeo, idx % 2 === 0 ? rockMatA : rockMatB);
    rock.position.set(x, getTerrainHeight(x, z) + sy * 0.38, z);
    rock.scale.set(sx, sy, sz);
    rock.rotation.set(idx * 0.5, idx * 1.1, 0);
    rock.castShadow = z > -42;
    rock.receiveShadow = true;
    forestGroup.add(rock);

    // Dodecahedron-geometrien har ca. 0,88 m radius før skalering.
    const halfX = sx * 0.95;
    const halfZ = sz * 0.95;
    rockColliders.push({
      minX: x - halfX,
      maxX: x + halfX,
      minZ: z - halfZ,
      maxZ: z + halfZ
    });
  });

  return {
    sky, skySunVec, dayEnvRT, nightEnvRT,
    hemiLight, sunLight, sunMesh,
    rockColliders,
    createWesternSign, createDetailedBarrel, createWagonWheel,
    createFramedWindow, addWeatheredFacadePlanks, createWoodenFence,
    createCarvedBatwingDoor,
    campfireFlameMeshes, campfireLight, campfireEmberMat
  };
}
