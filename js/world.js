import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { drawRoundedRect } from './i18n.js';
import { createSeededRng } from './textures.js';
import { instantiateBuildingGLB, ensureGeometryUVs, smoothSplitVertexNormals, batchStaticMeshesInGroup } from './glb-utils.js';

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

  const outerFactor = Math.max(0, (cheb - 175.0) / 55.0);
  const rimLift = outerFactor * outerFactor * (2.6 + 0.9 * Math.sin(x * 0.05) * Math.cos(z * 0.05));

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

  // Jevn flate foran og langs den dype gullgruven (x ~ 116..175, z ~ -1.5)
  if (x >= 108 && x <= 182 && Math.abs(z + 1.5) < 14) {
    const fx = Math.min(
      x < 120 ? Math.max(0, (x - 108) / 12.0) : 1.0,
      x > 170 ? Math.max(0, (182 - x) / 12.0) : 1.0
    );
    const fz = 1.0 - Math.max(0, Math.min(1, (Math.abs(z + 1.5) - 6.0) / 8.0));
    const fm = fx * fz;
    const smoothMine = fm * fm * (3 - 2 * fm);
    h = THREE.MathUtils.lerp(h, 0.65, smoothMine);
  }

  // Sørlig jernbanevoll ved z = +75 (x = -135..+50) og sprengt kløft ved broen (x = +52..+86)
  if (x >= -145 && x <= 52 && Math.abs(z - 75) < 13) {
    const fx = Math.min(
      x < -130 ? Math.max(0, (x + 145) / 15.0) : 1.0,
      x > 46 ? Math.max(0, (52 - x) / 6.0) : 1.0
    );
    const fz = 1.0 - Math.max(0, Math.min(1, (Math.abs(z - 75) - 5.5) / 7.5));
    const ft = fx * fz;
    const smoothRail = ft * ft * (3 - 2 * ft);
    h = THREE.MathUtils.lerp(h, 0.25, smoothRail);
  }
  if (x >= 50 && x <= 88 && Math.abs(z - 75) < 18) {
    const gx = Math.sin(THREE.MathUtils.clamp((x - 50) / 38.0, 0, 1) * Math.PI);
    const gz = 1.0 - Math.max(0, Math.min(1, (Math.abs(z - 75) - 5.0) / 13.0));
    h -= gx * gz * 5.8;
  }
  // Sørlig grusvei fra Dustwood til jernbanen (|x| < 5, z = 22..72)
  if (Math.abs(x) < 6.0 && z >= 22 && z <= 73) {
    const fr = 1.0 - Math.max(0, Math.min(1, (Math.abs(x) - 2.4) / 3.6));
    const smoothRoad = fr * fr * (3 - 2 * fr);
    const targetH = THREE.MathUtils.lerp(0.0, 0.25, (z - 22) / 51.0);
    h = THREE.MathUtils.lerp(h, targetH, smoothRoad);
  }

  // Jevn kirkegårdsbakke rundt det ødelagte steinkapellet på Boot Hill (x ~ -120, z ~ 0)
  const dChapel = Math.hypot((x + 118) * 0.7, z);
  if (dChapel < 16.0) {
    const fChap = Math.max(0, Math.min(1, (dChapel - 8.0) / 8.0));
    const smoothChap = fChap * fChap * (3 - 2 * fChap);
    h = THREE.MathUtils.lerp(0.55, h, smoothChap);
  }

  // 4 Nye Hjørnebiomer for 48-timers Grenselandsutvidelse:
  // (A) NV Silverpine Peak høyfjellsplatå (x = -142, z = -138, h = 2.85)
  const dSilverpine = Math.hypot(x + 142.0, z + 138.0);
  if (dSilverpine < 28.0) {
    const fp = Math.max(0, Math.min(1, (dSilverpine - 13.5) / 14.5));
    h = THREE.MathUtils.lerp(2.85, h, fp * fp * (3 - 2 * fp));
  }
  // (B) NØ Fort Rattlesnake i Sunscorch Badlands (x = 140, z = -132, h = 1.45)
  const dFort = Math.max(Math.abs(x - 140.0), Math.abs(z + 132.0));
  if (dFort < 24.0) {
    const ff = Math.max(0, Math.min(1, (dFort - 13.0) / 11.0));
    h = THREE.MathUtils.lerp(1.45, h, ff * ff * (3 - 2 * ff));
  }
  // (C) SØ Brimstone Ghost Town i Devil's Basin (x = 140, z = 136, h = 0.55)
  const dBrim = Math.max(Math.abs(x - 140.0), Math.abs(z - 136.0));
  if (dBrim < 25.0) {
    const fb = Math.max(0, Math.min(1, (dBrim - 14.0) / 11.0));
    h = THREE.MathUtils.lerp(0.55, h, fb * fb * (3 - 2 * fb));
  }
  // (D) SV Ancient Stone Circle på Thunder Plains (x = -140, z = 136, h = 1.15)
  const dStoneCircle = Math.hypot(x + 140.0, z - 136.0);
  if (dStoneCircle < 25.0) {
    const fs = Math.max(0, Math.min(1, (dStoneCircle - 14.0) / 11.0));
    h = THREE.MathUtils.lerp(1.15, h, fs * fs * (3 - 2 * fs));
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

export function getTerrainHeight(x, z, refY = 0) {
  // Steintrapp ned til Den sunkne katakombe under Boot Hill-kapellet (x = -122..-134, z = -3.05..+0.05)
  if (x >= -134.2 && x <= -121.8 && z >= -3.05 && z <= 0.05) {
    const u = THREE.MathUtils.clamp((-122.0 - x) / 12.0, 0, 1);
    return THREE.MathUtils.lerp(0.55, -6.5, u);
  }
  // Underjordisk katakombe-kammer (gulv på y = -6.5 når spilleren er nede i katakomben)
  if (refY < -1.8 && x >= -172.5 && x <= -133.5 && z >= -14.0 && z <= 11.0) {
    return -6.5;
  }
  const baseH = getTerrainBaseHeight(x, z);
  // Trebroen over elveleiet i Whispering Woods (x = -2.05..+2.05, z = -84.0..-72.0)
  if (Math.abs(x) <= 2.05 && z >= -84.0 && z <= -72.0) {
    return Math.max(baseH, getBridgeDeckY(z));
  }
  // Trerampe opp til Gatling-flakvognen (x = 12.15..15.05, z = 70.20..73.95)
  if (x >= 12.15 && x <= 15.05 && z >= 70.2 && z <= 73.95) {
    const t = THREE.MathUtils.clamp((z - 70.2) / 3.75, 0, 1);
    return Math.max(baseH, THREE.MathUtils.lerp(0.25, 1.46, t));
  }
  // Gatling-flakvognen på Southern Railway (x = 11.15..20.55, z = 73.75..76.25)
  if (x >= 11.15 && x <= 20.55 && z >= 73.75 && z <= 76.25) {
    return Math.max(baseH, 1.46);
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
    sharedParticleGlowTex, sharedSparkGlowTex, sharedSmokePuffTex, sharedGodRayTex, createContactShadow
  } = M;

  const windUniforms = { uWindTime: { value: 0 } };

  // --- 3f. Ekte HDRI-miljølys (.hdr + PMREMGenerator) med prosedyrisk Sky-fallback ---
  const sky = new SkyClass();
  sky.scale.setScalar(720);
  scene.add(sky);

  const skySunVec = new THREE.Vector3();
  applySkyShaderParams(sky, 0, skySunVec);

  function bakeFallbackSkyEnvironment(pmrem, nightAmt) {
    const envScene = new THREE.Scene();
    const envSky = new SkyClass();
    envSky.scale.setScalar(80);
    const tmpSun = new THREE.Vector3();
    applySkyShaderParams(envSky, nightAmt, tmpSun);
    envScene.add(envSky);

    const bounceGround = new THREE.Mesh(
      new THREE.SphereGeometry(38, 16, 8, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5),
      new THREE.MeshBasicMaterial({
        color: nightAmt > 0.5 ? 0x151828 : 0xc98b52,
        side: THREE.BackSide
      })
    );
    envScene.add(bounceGround);

    const rt = pmrem.fromScene(envScene, 0.035);
    envSky.geometry.dispose();
    envSky.material.dispose();
    bounceGround.geometry.dispose();
    bounceGround.material.dispose();
    return rt;
  }

  const initPmrem = new THREE.PMREMGenerator(renderer);
  initPmrem.compileEquirectangularShader();
  let dayEnvRT = bakeFallbackSkyEnvironment(initPmrem, 0);
  let nightEnvRT = bakeFallbackSkyEnvironment(initPmrem, 1);
  initPmrem.dispose();

  const HDRI_ROT_Y = 2.25;
  const hdrState = {
    hasRealHDRI: false,
    dayBgTex: null,
    nightBgTex: null,
    dayEnvTex: dayEnvRT.texture,
    nightEnvTex: nightEnvRT.texture,
    // Eksakt målt sol- og måneretning i desert_sunset.hdr (12.8 deg Golden Hour) og moonlit_night.hdr (30.1 deg)
    daySunDir: new THREE.Vector3(0.788, 0.222, 0.574).applyAxisAngle(new THREE.Vector3(0, 1, 0), -HDRI_ROT_Y).normalize(),
    nightMoonDir: new THREE.Vector3(0.700, 0.501, 0.509).applyAxisAngle(new THREE.Vector3(0, 1, 0), -HDRI_ROT_Y).normalize()
  };

  function mountHDRIEnvironments(dayHdrTex, nightHdrTex) {
    if (!dayHdrTex && !nightHdrTex) return false;
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();

    if (dayHdrTex) {
      dayHdrTex.mapping = THREE.EquirectangularReflectionMapping;
      const newDayRT = pmrem.fromEquirectangular(dayHdrTex);
      if (dayEnvRT) dayEnvRT.dispose();
      dayEnvRT = newDayRT;
      hdrState.dayBgTex = dayHdrTex;
      hdrState.dayEnvTex = newDayRT.texture;
    }
    if (nightHdrTex) {
      nightHdrTex.mapping = THREE.EquirectangularReflectionMapping;
      const newNightRT = pmrem.fromEquirectangular(nightHdrTex);
      if (nightEnvRT) nightEnvRT.dispose();
      nightEnvRT = newNightRT;
      hdrState.nightBgTex = nightHdrTex;
      hdrState.nightEnvTex = newNightRT.texture;
    }
    pmrem.dispose();

    hdrState.hasRealHDRI = Boolean(dayHdrTex);
    if (hdrState.hasRealHDRI) {
      sky.visible = false;
      sunMesh.visible = false;
      if (scene.backgroundRotation) scene.backgroundRotation.set(0, HDRI_ROT_Y, 0);
      if (scene.environmentRotation) scene.environmentRotation.set(0, HDRI_ROT_Y, 0);
      scene.background = hdrState.dayBgTex;
      scene.environment = hdrState.dayEnvTex;
    }
    return hdrState.hasRealHDRI;
  }

  scene.environment = hdrState.dayEnvTex;
  scene.environmentIntensity = 1.05;

  // Kinematisk «Golden Hour» lyssetting: varm ravfarget himmeltopp + dype kjølige blå-fiolette skygger
  const hemiLight = new THREE.HemisphereLight(0xffd6a8, 0x4c4778, 0.78);
  scene.add(hemiLight);

  // Skarp 1536x1536 hovedsol med tett skygge-frustum rundt spilleren (høyere pikseltetthet per meter og 44 % lavere GPU-kostnad)
  const sunLight = new THREE.DirectionalLight(0xffb86b, 2.35);
  sunLight.position.copy(hdrState.daySunDir).multiplyScalar(88);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(1536, 1536);
  sunLight.shadow.camera.near = 6;
  sunLight.shadow.camera.far = 170;
  sunLight.shadow.camera.left = -36;
  sunLight.shadow.camera.right = 36;
  sunLight.shadow.camera.top = 38;
  sunLight.shadow.camera.bottom = -36;
  sunLight.shadow.bias = -0.00035;
  sunLight.shadow.normalBias = 0.024;
  scene.add(sunLight);
  scene.add(sunLight.target);

  const sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(5.8, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xfff0c4, fog: false, toneMapped: false })
  );
  sunMesh.position.copy(skySunVec).multiplyScalar(295);
  scene.add(sunMesh);

  // --- 3g. Utvidet ørkenlandskap (-220 til +220) med ekte fotografisk 4-biome PBR Terrain Splatting & Anti-Tiling ---
  const desertGroundGeo = new THREE.PlaneGeometry(520, 520, 180, 180);
  desertGroundGeo.rotateX(-Math.PI / 2);
  {
    const pos = desertGroundGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      pos.setY(i, getTerrainBaseHeight(vx, vz));
    }
    // Åpne fysisk sjakt over steintrappen ned til Den sunkne katakombe (x: -133.4..-122.2, z: -3.05..0.05)
    const idxAttr = desertGroundGeo.index;
    if (idxAttr) {
      const filtered = [];
      const arr = idxAttr.array;
      for (let i = 0; i < arr.length; i += 3) {
        const a = arr[i], b = arr[i + 1], c = arr[i + 2];
        const cx = (pos.getX(a) + pos.getX(b) + pos.getX(c)) / 3;
        const cz = (pos.getZ(a) + pos.getZ(b) + pos.getZ(c)) / 3;
        if (cx >= -133.4 && cx <= -122.2 && cz >= -3.05 && cz <= 0.05) {
          continue;
        }
        filtered.push(a, b, c);
      }
      desertGroundGeo.setIndex(filtered);
    }
    desertGroundGeo.computeVertexNormals();
  }

  const desertGroundMat = new THREE.MeshStandardMaterial({
    color: 0xdcb488,
    map: sharedDesertSandTex,
    normalMap: sharedDesertSandNormalTex,
    normalScale: new THREE.Vector2(0.84, 0.84),
    roughnessMap: sharedDesertSandRoughTex,
    roughness: 0.94,
    metalness: 0.0,
    envMapIntensity: 0.36
  });
  desertGroundMat.customProgramCacheKey = () => 'western_photo_terrain_v3_fbm';
  desertGroundMat.onBeforeCompile = (shader) => {
    shader.uniforms.uRoadPhotoMap = { value: sharedRoadSandTex };
    shader.uniforms.uRockPhotoMap = { value: sharedSandstoneTex };
    shader.uniforms.uForestPhotoMap = { value: sharedFoliageTex };

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vTerrainWorldPos;'
      )
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvTerrainWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;'
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vTerrainWorldPos;
        uniform sampler2D uRoadPhotoMap;
        uniform sampler2D uRockPhotoMap;
        uniform sampler2D uForestPhotoMap;

        float wHash21(vec2 p) {
          p = fract(p * vec2(127.1, 311.7));
          p += dot(p, p + 34.23);
          return fract(p.x * p.y);
        }
        float wNoise2(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          float a = wHash21(i);
          float b = wHash21(i + vec2(1.0, 0.0));
          float c = wHash21(i + vec2(0.0, 1.0));
          float d = wHash21(i + vec2(1.0, 1.0));
          return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
        }
        float wFbm(vec2 p) {
          float v = 0.5 * wNoise2(p);
          p = mat2(0.80, -0.60, 0.60, 0.80) * p * 2.07 + vec2(13.7, 9.2);
          v += 0.25 * wNoise2(p);
          p = mat2(0.80, -0.60, 0.60, 0.80) * p * 2.05 + vec2(7.1, 4.3);
          v += 0.125 * wNoise2(p);
          return v * 1.1428;
        }
        float wFbmFast(vec2 p) {
          float v = 0.666 * wNoise2(p);
          p = mat2(0.80, -0.60, 0.60, 0.80) * p * 2.11 + vec2(11.3, 5.7);
          v += 0.334 * wNoise2(p);
          return v;
        }`
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        {
          float wx = vTerrainWorldPos.x;
          float wz = vTerrainWorldPos.z;
          float wy = vTerrainWorldPos.y;
          vec2 wp = vec2(wx, wz);

          // To-skala rotert UV-oppslag + rask støy som fjerner all synlig flisegjentakelse
          vec2 uvFine = wp * 0.145;
          vec2 uvMacro = vec2(wx * 0.866 - wz * 0.5, wx * 0.5 + wz * 0.866) * 0.031;
          vec3 sandMacro = texture2D(map, uvMacro).rgb;
          float macroN = wFbmFast(wp * 0.045);
          vec3 antiTiledSand = mix(diffuseColor.rgb, sandMacro * vec3(1.04, 0.96, 0.88), 0.42 * macroN);

          float detailGrain = (wNoise2(wp * 3.8) - 0.5) * 0.07;
          antiTiledSand *= (1.0 + detailGrain);

          // Ekte støybasert veikant-blending (kun beregn teksturopslag der biome faktisk er synlig -> 5x raskere på PC!)
          float sandDrift = (wFbmFast(wp * 0.24) - 0.48) * 1.65;
          float swayNS = (wNoise2(vec2(wz * 0.055, 3.1)) - 0.5) * 0.85;
          float swayEW = (wNoise2(vec2(wx * 0.055, 8.7)) - 0.5) * 0.85;

          float spanNS = smoothstep(-154.0, -136.0, wz) * smoothstep(82.0, 68.0, wz);
          float halfW_NS = mix(2.15, 3.35, exp(-pow(wz / 18.0, 2.0))) + sandDrift;
          float dNS = smoothstep(halfW_NS + 1.35, max(0.35, halfW_NS - 1.25), abs(wx - swayNS)) * spanNS;

          float spanEW = smoothstep(-132.0, -114.0, wx) * smoothstep(134.0, 116.0, wx);
          float halfW_EW = mix(2.05, 2.85, exp(-pow(wx / 18.0, 2.0))) + sandDrift;
          float dEW = smoothstep(halfW_EW + 1.35, max(0.35, halfW_EW - 1.20), abs((wz + 1.5) - swayEW)) * spanEW;

          float spanRail = smoothstep(-146.0, -132.0, wx) * smoothstep(54.0, 44.0, wx);
          float dRail = smoothstep(3.4 + sandDrift * 0.6, 1.35, abs(wz - 75.0)) * spanRail;

          float townCourt = exp(-(wx * wx) / 38.0 - ((wz - 1.5) * (wz - 1.5)) / 185.0) * (0.68 + 0.32 * macroN);
          float roadMask = clamp(max(max(dNS, dEW), max(dRail, townCourt)), 0.0, 1.0);

          vec3 baseSand = antiTiledSand * mix(0.91, 1.06, clamp(wy * 0.18 + 0.45, 0.0, 1.0));
          vec3 splatted = baseSand;

          if (roadMask > 0.008) {
            float rutBreak = smoothstep(0.28, 0.78, wFbmFast(wp * 0.38 + vec2(4.2, -7.1)));
            float rutNS = smoothstep(0.42, 0.06, abs(abs(wx - swayNS) - 0.82)) * dNS;
            float rutEW = smoothstep(0.42, 0.06, abs(abs((wz + 1.5) - swayEW) - 0.82)) * dEW;
            float rutMask = max(rutNS, rutEW) * (0.45 + 0.55 * rutBreak);

            vec3 roadTex = mix(texture2D(uRoadPhotoMap, uvFine * 1.15).rgb, texture2D(uRoadPhotoMap, uvMacro * 2.1).rgb, 0.32);
            vec3 gravelCol = mix(roadTex * vec3(0.95, 0.84, 0.72), roadTex * vec3(0.64, 0.52, 0.41), rutMask * 0.68);
            float sandOverRoad = smoothstep(0.56, 0.86, rutBreak) * 0.32;
            float finalRoadBlend = clamp(roadMask * (0.64 - sandOverRoad), 0.0, 0.72);
            splatted = mix(splatted, gravelCol, finalRoadBlend);
          }

          float edgeN = (wFbmFast(wp * 0.085) - 0.5) * 14.0;
          float forestMask = smoothstep(-22.0, -44.0, wz + edgeN) * (1.0 - roadMask * 0.68);
          if (forestMask > 0.008) {
            vec3 forestTex = mix(texture2D(uForestPhotoMap, uvFine * 0.92).rgb, texture2D(uForestPhotoMap, uvMacro * 1.8).rgb, 0.35);
            splatted = mix(splatted, forestTex * vec3(0.74, 0.82, 0.60), forestMask * 0.76);
          }

          float canyonMask = smoothstep(42.0, 76.0, wx + edgeN) * (1.0 - roadMask * 0.65);
          float bootMask = smoothstep(-42.0, -74.0, wx - edgeN) * (1.0 - roadMask * 0.65);
          if ((canyonMask + bootMask) > 0.008) {
            vec3 rockTex = mix(texture2D(uRockPhotoMap, uvFine * 0.85).rgb, texture2D(uRockPhotoMap, uvMacro * 1.35).rgb, 0.4);
            splatted = mix(splatted, rockTex * vec3(0.86, 0.68, 0.55), canyonMask * 0.66);
            splatted = mix(splatted, rockTex * vec3(0.56, 0.55, 0.58), bootMask * 0.68);
          }
          diffuseColor.rgb = splatted;
        }`
      );
  };
  const desertGround = new THREE.Mesh(desertGroundGeo, desertGroundMat);
  desertGround.receiveShadow = true;
  scene.add(desertGround);

  // Grusveier gjennom Dustwood og ut til alle 4 ytterregionene rendres sømløst i terreng-splatshaderen over (0 harde kanter!).
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0xb8844f,
    map: sharedRoadSandTex,
    normalMap: sharedRoadNormalTex,
    normalScale: new THREE.Vector2(0.45, 0.45),
    roughnessMap: sharedRoadRoughTex,
    roughness: 0.94,
    metalness: 0.01
  });

  // --- 3h. Forrevne, skarpt lagdelte sandsteinsklipper i dempede jordfarger som matcher HDRI-fjellene ---
  const mesaMat = new THREE.MeshStandardMaterial({
    color: 0x8b7b69,
    map: sharedMesaTex,
    normalMap: sharedMesaNormalTex,
    normalScale: new THREE.Vector2(1.55, 1.55),
    roughnessMap: sharedMesaRoughTex,
    roughness: 0.93,
    metalness: 0.0,
    envMapIntensity: 0.32
  });
  const mesaCapMat = new THREE.MeshStandardMaterial({
    color: 0x726455,
    map: sharedMesaTex,
    normalMap: sharedMesaNormalTex,
    normalScale: new THREE.Vector2(1.45, 1.45),
    roughnessMap: sharedMesaRoughTex,
    roughness: 0.94,
    metalness: 0.0,
    envMapIntensity: 0.30
  });
  if (M.applyAntiTilingSurfaceShader) {
    M.applyAntiTilingSurfaceShader(mesaMat, 0.24, 0.85);
    M.applyAntiTilingSurfaceShader(mesaCapMat, 0.24, 0.85);
  }

  function createFlutedCliffGeo(rTop, rBot, height, radialSegs, heightSegs, seed) {
    const rng = createSeededRng(seed);
    const geo = new THREE.CylinderGeometry(rTop, rBot, height, radialSegs, heightSegs + 4);
    const pos = geo.attributes.position;
    const angleNoise = new Float32Array(radialSegs);
    for (let a = 0; a < radialSegs; a++) {
      // Skarpe, forrevne klippefremspring og sprekker rundt omkretsen
      angleNoise[a] = 0.68 + Math.pow(rng(), 0.75) * 0.56;
    }
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      let y = pos.getY(i);
      const z = pos.getZ(i);
      const r = Math.hypot(x, z);
      if (r < 0.001) continue;
      const ang = Math.atan2(z, x);
      const idx = ((Math.round(((ang + Math.PI) / (Math.PI * 2)) * radialSegs) % radialSegs) + radialSegs) % radialSegs;
      const hFrac = (y + height * 0.5) / height;
      // Tydelige horisontale sedimentære klippehyller (trappetrinns-lagdeling)
      const terrace = Math.floor(hFrac * 5.0) / 5.0;
      const ledgeStep = 1.0 + (hFrac - terrace) * 0.42 + Math.sin(hFrac * Math.PI * 10.0) * 0.07;
      const crag = angleNoise[idx] * ledgeStep;
      // Ujevn taggete overkant i stedet for flat sylinderkant
      if (hFrac > 0.92) {
        y += (angleNoise[idx] - 0.95) * height * 0.14;
      }
      pos.setXYZ(i, x * crag, y, z * crag);
    }
    geo.computeVertexNormals();
    return geo;
  }

  const staticDesertPropsGroup = new THREE.Group();
  scene.add(staticDesertPropsGroup);

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
    staticDesertPropsGroup.add(g);
  }

  // Plasser Monument Valley-platåer i en vid horisontring utenfor PLAY_AREA_LIMIT (215) (åpen siktlinje langs x = 0 for HDRI-horisonten)
  [
    { x: -165, z: -245, r: 32, h: 42, seed: 101, spire: true },
    { x: 104, z: -258, r: 36, h: 38, seed: 202, spire: false },
    { x: 192, z: -235, r: 34, h: 44, seed: 303, spire: true },
    { x: -248, z: -85, r: 30, h: 38, seed: 404, spire: false },
    { x: 252, z: -68, r: 32, h: 40, seed: 505, spire: true },
    { x: -244, z: 88, r: 28, h: 36, seed: 606, spire: false },
    { x: 248, z: 96, r: 30, h: 38, seed: 707, spire: false },
    { x: -102, z: 246, r: 34, h: 42, seed: 808, spire: true },
    { x: 110, z: 252, r: 36, h: 44, seed: 909, spire: false }
  ].forEach((m) => spawnMonumentMesa(m.x, m.z, m.r, m.h, m.seed, m.spire));

  // Forrevne, skarpt lagdelte sandsteinsklipper (erstatter glatte kuler/bobler med ekte kløvede klippeblokker + boks-UV!)
  const rockColliders = [];
  const rockMeasureBox = new THREE.Box3();

  function createJaggedSandstoneOutcropGeo(seed) {
    const rng = createSeededRng(seed);
    const radialSegs = 18;
    const heightSegs = 10;
    const baseGeo = new THREE.CylinderGeometry(0.56, 1.06, 1.85, radialSegs, heightSegs);
    const pos = baseGeo.attributes.position;

    const sectorRadius = new Float32Array(radialSegs);
    const sectorCrest = new Float32Array(radialSegs);
    for (let s = 0; s < radialSegs; s++) {
      sectorRadius[s] = 0.68 + rng() * 0.48;
      sectorCrest[s] = (rng() - 0.45) * 0.34;
    }

    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);
      const r = Math.hypot(x, z);
      const hNorm = (y + 0.925) / 1.85;
      if (r > 0.001) {
        const ang = Math.atan2(z, x);
        const sExact = (((ang + Math.PI) / (Math.PI * 2)) * radialSegs + radialSegs) % radialSegs;
        const s0 = Math.floor(sExact) % radialSegs;
        const s1 = (s0 + 1) % radialSegs;
        const sf = sExact - Math.floor(sExact);
        const smoothRad = THREE.MathUtils.lerp(sectorRadius[s0], sectorRadius[s1], sf);
        // Naturlig sedimentær lagdeling med kløfter og ujevne fjellhyller (ingen store flate trapeser)
        const strata = Math.sin(hNorm * Math.PI * 7.5 + ang * 1.4) * 0.085 + Math.cos(hNorm * Math.PI * 15.0 - ang * 2.3) * 0.038;
        const band = Math.floor(hNorm * 4.5) / 4.5;
        const shelfLedge = 1.0 + (hNorm - band) * 0.36 + strata;
        const crevice = 1.0 - Math.pow(Math.max(0, Math.sin(ang * 3.0 + seed * 0.17)), 6.0) * 0.24;
        const microCrag = 1.0 + (rng() - 0.5) * 0.09;
        const shearX = (hNorm - 0.5) * (seed % 2 === 0 ? 0.22 : -0.20);
        const totalScale = smoothRad * shelfLedge * crevice * microCrag;
        x = x * totalScale + shearX;
        z = z * totalScale * (0.92 + 0.16 * Math.sin(ang * 2.0 + seed));
        if (hNorm > 0.82) {
          y += THREE.MathUtils.lerp(sectorCrest[s0], sectorCrest[s1], sf) * ((hNorm - 0.82) / 0.18);
        }
      } else if (y > 0) {
        y += 0.10;
      }
      pos.setXYZ(i, x, y, z);
    }

    // Beholder skarpe fjellhyller (>44 grader) men glatter ut kunstige trekantfasetter (<44 grader) + boks-UV
    const sharpGeo = baseGeo.toNonIndexed();
    baseGeo.dispose();
    sharpGeo.computeVertexNormals();
    smoothSplitVertexNormals(sharpGeo, 0.72);
    sharpGeo.deleteAttribute('uv');
    ensureGeometryUVs(sharpGeo, 2.4);
    return sharpGeo;
  }

  const cragVariants = [
    createJaggedSandstoneOutcropGeo(7101),
    createJaggedSandstoneOutcropGeo(7202),
    createJaggedSandstoneOutcropGeo(7303),
    createJaggedSandstoneOutcropGeo(7404)
  ];

  function spawnBanditRockCluster(cx, cz, scale, seed, useCrimson = false) {
    const rng = createSeededRng(seed);
    const cluster = new THREE.Group();
    const baseGround = getTerrainBaseHeight(cx, cz);
    const primaryMat = useCrimson && crimsonRockMat ? crimsonRockMat : mesaMat;
    const specs = [
      { ox: 0, oz: 0, sx: 2.6, sy: 2.1, sz: 2.2, mat: primaryMat, v: 0 },
      { ox: -2.0, oz: 1.0, sx: 1.9, sy: 1.35, sz: 1.7, mat: mesaCapMat, v: 1 },
      { ox: 1.9, oz: -0.9, sx: 2.1, sy: 1.65, sz: 1.8, mat: primaryMat, v: 2 },
      { ox: 0.35, oz: 1.65, sx: 1.55, sy: 0.92, sz: 1.35, mat: stonePlinthMat, v: 3 }
    ];
    const boulders = [];
    specs.forEach((sp, idx) => {
      const geo = cragVariants[(sp.v + seed) & 3];
      const b = new THREE.Mesh(geo, sp.mat);
      b.scale.set(sp.sx * scale, sp.sy * scale, sp.sz * scale);
      b.position.set(sp.ox * scale, sp.sy * scale * 0.72 - 0.22, sp.oz * scale);
      b.rotation.set((rng() - 0.5) * 0.14, rng() * Math.PI * 2, (rng() - 0.5) * 0.14);
      b.castShadow = true;
      b.receiveShadow = true;
      cluster.add(b);
      boulders.push(b);
      if (createContactShadow && idx < 3) {
        const sh = createContactShadow(sp.sx * scale * 0.85, sp.sz * scale * 0.85, 0.025);
        sh.position.x = sp.ox * scale;
        sh.position.z = sp.oz * scale;
        cluster.add(sh);
      }
    });
    cluster.position.set(cx, baseGround, cz);
    staticDesertPropsGroup.add(cluster);
    cluster.updateMatrixWorld(true);

    for (let i = 0; i < boulders.length; i++) {
      rockMeasureBox.setFromObject(boulders[i]);
      const shrinkX = (rockMeasureBox.max.x - rockMeasureBox.min.x) * 0.12;
      const shrinkZ = (rockMeasureBox.max.z - rockMeasureBox.min.z) * 0.12;
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
    if (createContactShadow) {
      const sh = createContactShadow(0.36, 0.36, -0.395);
      g.add(sh);
    }
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

  const fencePostGeo = new THREE.CylinderGeometry(0.058, 0.072, 1.12, 8);
  function createWoodenFence(length = 3.4, postCount = 3) {
    const fence = new THREE.Group();
    for (let i = 0; i < postCount; i++) {
      const px = -length / 2 + (length / (postCount - 1)) * i;
      const post = new THREE.Mesh(fencePostGeo, darkWoodMat);
      post.position.set(px, 0.55, 0);
      post.rotation.z = ((i % 2) * 2 - 1) * 0.035;
      post.castShadow = true;
      fence.add(post);
      if (createContactShadow) {
        const sh = createContactShadow(0.24, 0.24, 0.022);
        sh.position.x = px;
        fence.add(sh);
      }
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

  // Gjerder, hestebom, reflekterende vanntrau med enkeltplanker/jernbånd og flakkende cowboy-leirbål
  const hitchPost = new THREE.Group();
  [-1.1, 1.1].forEach((hx) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.082, 1.1, 10), darkWoodMat);
    p.position.set(hx, 0.55, 0);
    p.castShadow = true;
    hitchPost.add(p);

    if (createContactShadow) {
      const sh = createContactShadow(0.26, 0.26, 0.022);
      sh.position.x = hx;
      hitchPost.add(sh);
    }

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.011, 6, 12), wroughtIronMat);
    ring.position.set(hx * 0.65, 0.92, 0.055);
    hitchPost.add(ring);
  });
  const hitchBar = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 2.55, 10), lightWoodMat);
  hitchBar.rotation.z = Math.PI / 2;
  hitchBar.position.set(0, 1.0, 0);
  hitchBar.castShadow = true;
  hitchPost.add(hitchBar);
  hitchPost.position.set(-4.6, 0, 6.6);
  hitchPost.rotation.y = 0.45;
  staticDesertPropsGroup.add(hitchPost);

  // Håndlaget western-vanntrau med synlige enkeltplanker, smijernsbånd m/ nagler og reflekterende vannflate med krusninger
  function createWaterTrough() {
    const trough = new THREE.Group();
    const len = 2.02;
    const wid = 0.76;
    const h = 0.54;

    if (createContactShadow) {
      trough.add(createContactShadow(1.08, 0.48, 0.024));
    }

    // Tunge tømmersviller nederst i sanden
    [-0.72, 0, 0.72].forEach((lx) => {
      const skid = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, wid + 0.12), darkWoodMat);
      skid.position.set(lx, 0.045, 0);
      skid.castShadow = true;
      skid.receiveShadow = true;
      trough.add(skid);
    });

    // Mørk bunn og innside slik at sprekker mellom plankene gir ekte dybdeskygge
    const innerLiner = new THREE.Mesh(new THREE.BoxGeometry(len - 0.09, h - 0.04, wid - 0.09), M.darkInteriorMat || darkWoodMat);
    innerLiner.position.y = 0.09 + (h - 0.04) * 0.5;
    trough.add(innerLiner);

    const bottomFloor = new THREE.Mesh(new THREE.BoxGeometry(len - 0.06, 0.05, wid - 0.06), darkWoodMat);
    bottomFloor.position.y = 0.11;
    trough.add(bottomFloor);

    // 3 tydelig adskilte horisontale planker på langsidene (med glipe og lett variasjon)
    const plankRows = 3;
    const plankH = (h - 0.04) / plankRows - 0.014;
    for (let r = 0; r < plankRows; r++) {
      const py = 0.115 + plankH * 0.5 + r * (plankH + 0.014);
      const pMat = r % 2 === 0 ? weatheredPlankMatA : weatheredPlankMatB;
      [-1, 1].forEach((side) => {
        const sz = side * (wid * 0.5 - 0.026);
        const plank = new THREE.Mesh(new THREE.BoxGeometry(len + 0.02, plankH, 0.052), pMat);
        plank.position.set(0, py, sz);
        plank.rotation.z = (r === 1 ? -0.005 : 0.004) * side;
        plank.castShadow = true;
        plank.receiveShadow = true;
        trough.add(plank);
      });

      // 3 horisontale kortende-planker i hver gavl
      [-1, 1].forEach((endSgn) => {
        const ex = endSgn * (len * 0.5 - 0.028);
        const endPlank = new THREE.Mesh(new THREE.BoxGeometry(0.054, plankH, wid - 0.06), r % 2 === 1 ? weatheredPlankMatA : weatheredPlankMatB);
        endPlank.position.set(ex, py, 0);
        endPlank.castShadow = true;
        endPlank.receiveShadow = true;
        trough.add(endPlank);
      });
    }

    // Slitte overkantbord (coping rim) langs alle fire sider av vanntrauet
    [-1, 1].forEach((side) => {
      const topRimLong = new THREE.Mesh(new THREE.BoxGeometry(len + 0.06, 0.042, 0.095), lightWoodMat);
      topRimLong.position.set(0, 0.10 + h, side * (wid * 0.5 - 0.022));
      topRimLong.castShadow = true;
      topRimLong.receiveShadow = true;
      trough.add(topRimLong);
    });
    [-1, 1].forEach((endSgn) => {
      const topRimEnd = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.044, wid + 0.04), darkWoodMat);
      topRimEnd.position.set(endSgn * (len * 0.5 - 0.02), 0.102 + h, 0);
      topRimEnd.castShadow = true;
      trough.add(topRimEnd);
    });

    // 3 kraftige smijernsbånd + hjørnebeslag med nagler rundt plankene
    const boltGeo = new THREE.SphereGeometry(0.014, 6, 5);
    [-0.74, 0.0, 0.74].forEach((bx) => {
      [-1, 1].forEach((side) => {
        const vStrap = new THREE.Mesh(new THREE.BoxGeometry(0.052, h + 0.03, 0.018), wroughtIronMat);
        vStrap.position.set(bx, 0.10 + h * 0.5, side * (wid * 0.5 + 0.006));
        vStrap.castShadow = true;
        trough.add(vStrap);

        [0.19, 0.36, 0.53].forEach((by) => {
          const rivet = new THREE.Mesh(boltGeo, wroughtIronMat);
          rivet.position.set(bx, by, side * (wid * 0.5 + 0.016));
          trough.add(rivet);
        });
      });
      const botStrap = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.018, wid + 0.03), wroughtIronMat);
      botStrap.position.set(bx, 0.092, 0);
      trough.add(botStrap);
    });

    // Hjørnevinkler i smijern
    [-1, 1].forEach((ex) => {
      [-1, 1].forEach((sz) => {
        const cornerIron = new THREE.Mesh(new THREE.BoxGeometry(0.075, h + 0.02, 0.075), wroughtIronMat);
        cornerIron.position.set(ex * (len * 0.5 - 0.012), 0.10 + h * 0.5, sz * (wid * 0.5 - 0.012));
        trough.add(cornerIron);
      });
    });

    // Reflekterende vannoverflate med svake krusninger inni trauet (speiler HDRI-himmel og Saloon)
    const waterSurface = new THREE.Mesh(
      new THREE.PlaneGeometry(len - 0.14, wid - 0.14, 12, 6),
      new THREE.MeshStandardMaterial({
        color: 0x203a46,
        roughness: 0.06,
        metalness: 0.12,
        normalMap: M.sharedWaterRippleNormalTex || sharedDesertSandNormalTex,
        normalScale: new THREE.Vector2(0.22, 0.22),
        envMapIntensity: 1.45
      })
    );
    waterSurface.rotation.x = -Math.PI / 2;
    waterSurface.position.y = 0.54;
    trough.add(waterSurface);

    // Klassisk støpejernspumpe ved enden av trauet
    const pumpCol = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.085, 1.05, 12), wroughtIronMat);
    pumpCol.position.set(-len * 0.5 - 0.16, 0.52, 0);
    pumpCol.castShadow = true;
    trough.add(pumpCol);

    if (createContactShadow) {
      const pSh = createContactShadow(0.24, 0.24, 0.022);
      pSh.position.x = -len * 0.5 - 0.16;
      trough.add(pSh);
    }

    const pumpCap = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), wroughtIronMat);
    pumpCap.position.set(-len * 0.5 - 0.16, 1.06, 0);
    trough.add(pumpCap);

    const spoutCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-len * 0.5 - 0.14, 0.78, 0),
      new THREE.Vector3(-len * 0.5 + 0.04, 0.76, 0),
      new THREE.Vector3(-len * 0.5 + 0.13, 0.67, 0)
    ]);
    trough.add(new THREE.Mesh(new THREE.TubeGeometry(spoutCurve, 10, 0.024, 8, false), wroughtIronMat));

    const pumpHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.52, 8), wroughtIronMat);
    pumpHandle.position.set(-len * 0.5 - 0.32, 0.88, 0);
    pumpHandle.rotation.z = 0.85;
    trough.add(pumpHandle);

    return trough;
  }

  const townWaterTrough = createWaterTrough();
  townWaterTrough.position.set(-5.3, 0, 8.0);
  townWaterTrough.rotation.y = 0.45;
  staticDesertPropsGroup.add(townWaterTrough);

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

    const vLight = {
      intensity: 2.4,
      colorHex: 0xff842e,
      distance: 16,
      decay: 2,
      anchor: new THREE.Object3D()
    };
    vLight.anchor.position.set(0, 0.58, 0);
    fire.add(vLight.anchor);
    fire.userData.virtualLight = vLight;
    if (!campfireLight) campfireLight = vLight;

    return fire;
  }

  const worldVirtualLights = [];
  const townCampfire = createCampfire();
  townCampfire.position.set(5.1, 0, 7.6);
  scene.add(townCampfire);
  if (townCampfire.userData.virtualLight) worldVirtualLights.push(townCampfire.userData.virtualLight);

  const eastTownFence = createWoodenFence(3.6, 3);
  eastTownFence.position.set(6.3, 0, 10.2);
  eastTownFence.rotation.y = -0.35;
  staticDesertPropsGroup.add(eastTownFence);

  const southWestFence = createWoodenFence(3.6, 3);
  southWestFence.position.set(-6.3, 0, 10.2);
  southWestFence.rotation.y = 0.35;
  staticDesertPropsGroup.add(southWestFence);

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
    staticDesertPropsGroup.add(g);
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

  // Delte geometrier og PBR-materialer for naturlige trær med organiske greinkranser (72–90 FPS i Quest)
  function createScallopedPineTierGeo(radius, height, radialSegs = 14, seed = 1) {
    const geo = new THREE.ConeGeometry(radius, height, radialSegs, 3);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      let y = pos.getY(i);
      const z = pos.getZ(i);
      const r = Math.hypot(x, z);
      if (r < 0.02) continue;
      const ang = Math.atan2(z, x);
      const hNorm = (y + height * 0.5) / height;
      const boughWave = 1.0 + (1.0 - hNorm) * (0.16 * Math.sin(ang * 7 + seed) + 0.09 * Math.cos(ang * 5 - seed));
      const droop = (1.0 - hNorm) * 0.14 * Math.cos(ang * 7 + seed);
      pos.setXYZ(i, x * boughWave, y - droop, z * boughWave);
    }
    geo.computeVertexNormals();
    return geo;
  }

  const trunkGeo = new THREE.CylinderGeometry(0.16, 0.38, 2.7, 9);
  const rootFlareGeo = new THREE.ConeGeometry(0.52, 0.55, 8);
  const branchGeo = new THREE.CylinderGeometry(0.055, 0.11, 0.98, 6);
  const tier1Geo = createScallopedPineTierGeo(1.86, 1.96, 14, 1.1);
  const tier2Geo = createScallopedPineTierGeo(1.48, 1.82, 14, 2.7);
  const tier3Geo = createScallopedPineTierGeo(1.10, 1.60, 12, 4.3);
  const boughClumpGeo = new THREE.DodecahedronGeometry(0.8, 1);

  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x784b28,
    map: sharedBarkTex,
    normalMap: sharedBarkNormalTex,
    normalScale: new THREE.Vector2(0.95, 0.95),
    roughnessMap: sharedBarkRoughTex,
    roughness: 0.92
  });
  function applyWindSwayShader(mat, amp = 0.08, minY = 1.6) {
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uWindTime = windUniforms.uWindTime;
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          '#include <common>\nuniform float uWindTime;'
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          {
            vec4 wPos = vec4(transformed, 1.0);
            #ifdef USE_INSTANCING
              wPos = instanceMatrix * wPos;
            #endif
            wPos = modelMatrix * wPos;
            float hWeight = clamp((position.y - (${minY.toFixed(2)})) * 0.45, 0.0, 1.25);
            float gust = sin(uWindTime * 1.9 + wPos.x * 0.14 + wPos.z * 0.11) * ${amp.toFixed(3)}
                       + cos(uWindTime * 3.1 + wPos.z * 0.27) * ${(amp * 0.35).toFixed(3)};
            transformed.x += gust * hWeight;
            transformed.z += gust * 0.45 * hWeight;
          }`
        );
    };
  }

  const foliageMatA = new THREE.MeshStandardMaterial({
    color: 0x607c4c,
    map: sharedFoliageTex,
    normalMap: sharedFoliageNormalTex,
    normalScale: new THREE.Vector2(0.92, 0.92),
    roughnessMap: sharedFoliageRoughTex,
    roughness: 0.9
  });
  const foliageMatB = new THREE.MeshStandardMaterial({
    color: 0x708b55,
    map: sharedFoliageTex,
    normalMap: sharedFoliageNormalTex,
    normalScale: new THREE.Vector2(0.92, 0.92),
    roughnessMap: sharedFoliageRoughTex,
    roughness: 0.88
  });
  const foliageMatDark = new THREE.MeshStandardMaterial({
    color: 0x455e38,
    map: sharedFoliageTex,
    normalMap: sharedFoliageNormalTex,
    normalScale: new THREE.Vector2(0.98, 0.98),
    roughnessMap: sharedFoliageRoughTex,
    roughness: 0.92
  });
  applyWindSwayShader(foliageMatA, 0.085, 0.0);
  applyWindSwayShader(foliageMatB, 0.095, 0.0);
  applyWindSwayShader(foliageMatDark, 0.070, 0.0);

  let fallbackGrassInst = null;
  const proceduralTreeGroups = [];
  // Fallback ørken-gress (fjernes automatisk straks undergrowth.glb monteres!)
  {
    const bladeGeo = new THREE.ConeGeometry(0.18, 0.72, 4, 2);
    bladeGeo.translate(0, 0.36, 0);
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x9c8b4e,
      roughness: 0.9,
      metalness: 0.02
    });
    grassMat.onBeforeCompile = (shader) => {
      shader.uniforms.uWindTime = windUniforms.uWindTime;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uWindTime;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          {
            vec4 instPos = vec4(transformed, 1.0);
            #ifdef USE_INSTANCING
              instPos = instanceMatrix * instPos;
            #endif
            float hW = clamp(position.y * 1.4, 0.0, 1.2);
            float sway = sin(uWindTime * 2.5 + instPos.x * 0.25 + instPos.z * 0.19) * 0.11;
            transformed.x += sway * hW;
            transformed.z += sway * 0.55 * hW;
          }`
        );
    };
    const gRng = createSeededRng(4041);
    const grassCount = 260;
    const grassInst = new THREE.InstancedMesh(bladeGeo, grassMat, grassCount);
    const dummy = new THREE.Object3D();
    const gCol = new THREE.Color();
    let placed = 0;
    for (let i = 0; i < 600 && placed < grassCount; i++) {
      const gx = (gRng() - 0.5) * 340;
      const gz = (gRng() - 0.5) * 340;
      if (Math.abs(gx) < 26 && Math.abs(gz) < 26) continue;
      if (Math.abs(gx) < 3.8 || Math.abs(gz + 1.5) < 3.8 || Math.abs(gz - 75) < 5.0) continue;
      if (gx < -118 && gx > -176 && Math.abs(gz + 1.5) < 16) continue;
      if (gx > 116 && gx < 176 && Math.abs(gz + 1.5) < 12) continue;
      const gy = getTerrainBaseHeight(gx, gz);
      dummy.position.set(gx, gy - 0.04, gz);
      dummy.rotation.set((gRng() - 0.5) * 0.15, gRng() * Math.PI * 2, (gRng() - 0.5) * 0.15);
      const sc = 0.75 + gRng() * 0.9;
      dummy.scale.set(sc, sc * (0.7 + gRng() * 0.6), sc);
      dummy.updateMatrix();
      grassInst.setMatrixAt(placed, dummy.matrix);
      gCol.setHSL(gz < -28 ? 0.24 : 0.12 + gRng() * 0.05, 0.34, gz < -28 ? 0.28 : 0.42 + gRng() * 0.12);
      grassInst.setColorAt(placed, gCol);
      placed++;
    }
    grassInst.count = placed;
    grassInst.instanceMatrix.needsUpdate = true;
    if (grassInst.instanceColor) grassInst.instanceColor.needsUpdate = true;
    fallbackGrassInst = grassInst;
    scene.add(grassInst);
  }

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
    proceduralTreeGroups.push(tree);
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

  // Forrevne natursteiner med ru sandsteinstekstur, normalMap og roughnessMap (aldri glatte kuler/bobler)
  const rockMatA = new THREE.MeshStandardMaterial({
    color: 0x7c7164,
    map: sharedSandstoneTex,
    normalMap: sharedSandstoneNormalTex,
    normalScale: new THREE.Vector2(1.35, 1.35),
    roughnessMap: sharedSandstoneRoughTex,
    roughness: 0.93,
    metalness: 0.0,
    envMapIntensity: 0.30
  });
  const rockMatB = new THREE.MeshStandardMaterial({
    color: 0x685f54,
    map: sharedSandstoneTex,
    normalMap: sharedSandstoneNormalTex,
    normalScale: new THREE.Vector2(1.45, 1.45),
    roughnessMap: sharedSandstoneRoughTex,
    roughness: 0.94,
    metalness: 0.0,
    envMapIntensity: 0.28
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
    const rock = new THREE.Mesh(cragVariants[idx % cragVariants.length], idx % 2 === 0 ? rockMatA : rockMatB);
    rock.position.set(x, getTerrainBaseHeight(x, z) + sy * 0.48, z);
    rock.scale.set(sx * 0.82, sy * 0.75, sz * 0.82);
    rock.rotation.set(0, idx * 1.37, 0);
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

  function pushMeasuredWorldBoxCollider(meshOrGroup, maxY = 4.2, shrinkPad = 0.04, minY = -20) {
    meshOrGroup.updateMatrixWorld(true);
    rockMeasureBox.setFromObject(meshOrGroup);
    const col = {
      minX: rockMeasureBox.min.x + shrinkPad,
      maxX: rockMeasureBox.max.x - shrinkPad,
      minZ: rockMeasureBox.min.z + shrinkPad,
      maxZ: rockMeasureBox.max.z - shrinkPad,
      minY,
      maxY,
      disabled: false
    };
    structureWallColliders.push(col);
    return col;
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
  if (outlawCampfire.userData.virtualLight) worldVirtualLights.push(outlawCampfire.userData.virtualLight);

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

  // Forsterket dyp gullgruve (Abandoned Gold Mine) ved x = 124..168, z = -1.5 (vendt mot -X vest)
  const mineOriginX = 124.0;
  const mineOriginZ = -1.5;
  const mineBaseY = getTerrainBaseHeight(mineOriginX, mineOriginZ); // 0.65
  const mineGroup = new THREE.Group();
  mineGroup.position.set(mineOriginX, mineBaseY, mineOriginZ);
  canyonGroup.add(mineGroup);

  // Røde klippeblokker rundt og langs hele den 44 m dype gruvegjenget (fri passasje z_local = -1.75..+1.75)
  const mineCliffLeft = new THREE.Mesh(new THREE.BoxGeometry(46.0, 7.2, 6.0), crimsonRockMat || mesaMat);
  mineCliffLeft.position.set(22.5, 3.5, -4.85);
  mineCliffLeft.castShadow = true;
  mineCliffLeft.receiveShadow = true;
  mineGroup.add(mineCliffLeft);

  const mineCliffRight = new THREE.Mesh(new THREE.BoxGeometry(46.0, 7.2, 6.0), crimsonRockMat || mesaMat);
  mineCliffRight.position.set(22.5, 3.5, 4.85);
  mineCliffRight.castShadow = true;
  mineCliffRight.receiveShadow = true;
  mineGroup.add(mineCliffRight);

  const mineCliffTop = new THREE.Mesh(new THREE.BoxGeometry(46.5, 3.6, 4.4), crimsonRockMat || mesaMat);
  mineCliffTop.position.set(22.5, 5.4, 0);
  mineCliffTop.castShadow = true;
  mineGroup.add(mineCliffTop);

  // Stort endekammer innerst (x_local = 33..45) for kamp mot Foreman Slade
  const mineChamberFloor = new THREE.Mesh(new THREE.BoxGeometry(45.0, 0.24, 4.2), darkGraveStoneMat || stonePlinthMat);
  mineChamberFloor.position.set(22.0, -0.08, 0);
  mineChamberFloor.receiveShadow = true;
  mineGroup.add(mineChamberFloor);

  const mineBackWall = new THREE.Mesh(new THREE.BoxGeometry(1.8, 5.6, 5.6), darkGraveStoneMat || mesaCapMat);
  mineBackWall.position.set(44.8, 2.7, 0);
  mineGroup.add(mineBackWall);

  // Kraftige tømmerrammer og hengende gruvelykter hele veien inn til x = 166
  for (let tx = -0.2; tx <= 42.5; tx += 3.5) {
    [-1.68, 1.68].forEach((tz) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.32, 3.5, 0.32), logTimberMat);
      post.position.set(tx, 1.72, tz);
      post.castShadow = true;
      mineGroup.add(post);
    });
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 3.9), logTimberMat);
    beam.position.set(tx, 3.52, 0);
    beam.castShadow = true;
    mineGroup.add(beam);

    if (tx > 4.0 && Math.round(tx * 10) % 2 === 0) {
      const lGlow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: sharedSparkGlowTex || sharedParticleGlowTex,
          color: 0xffb347,
          transparent: true,
          opacity: 0.72,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
      );
      lGlow.scale.set(1.65, 1.65, 1);
      lGlow.position.set(tx, 3.15, 0);
      mineGroup.add(lGlow);
    }
  }
  {
    const mA = new THREE.Object3D();
    mA.position.set(24.0, 2.9, 0);
    mineGroup.add(mA);
    worldVirtualLights.push({ intensity: 2.4, colorHex: 0xffa94a, distance: 34, decay: 1.6, anchor: mA });
    const mB = new THREE.Object3D();
    mB.position.set(39.0, 2.9, 0);
    mineGroup.add(mB);
    worldVirtualLights.push({ intensity: 2.8, colorHex: 0xff9b3a, distance: 28, decay: 1.6, anchor: mB });
  }

  // Gruveskinner (x_local = -20..+42) + stål-gruvevogn full av gullmalm!
  [-0.48, 0.48].forEach((rz) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(62.0, 0.07, 0.07), wroughtIronMat);
    rail.position.set(11.0, 0.08, rz);
    mineGroup.add(rail);
  });
  for (let sx = -19.0; sx <= 41.5; sx += 1.05) {
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

  // Mål gruvevegger nøyaktig med THREE.Box3 (fri inngang hele veien innover til Foreman Slade!)
  canyonGroup.updateMatrixWorld(true);
  pushMeasuredWorldBoxCollider(mineCliffLeft, 7.2, 0.05);
  pushMeasuredWorldBoxCollider(mineCliffRight, 7.2, 0.05);
  pushMeasuredWorldBoxCollider(mineBackWall, 5.6, 0.05);
  pushMeasuredWorldBoxCollider(minecart, 1.3, 0.04);

  // 2 Sprengbare Dynamitt-barrikader inne i gruvetunnelen (x = 136 og x = 150)
  const mineBarricades = [];
  const barricadeHitMeshes = [];
  const tntBarrelMat = new THREE.MeshStandardMaterial({
    color: 0xb9221d,
    emissive: 0x330400,
    roughness: 0.55,
    metalness: 0.15
  });
  [12.0, 26.0].forEach((localX, bIdx) => {
    const bGroup = new THREE.Group();
    bGroup.position.set(localX, 0, 0);
    // Kryssede tømmerbjelker og kasser
    const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 3.1), logTimberMat);
    b1.position.set(0, 0.75, 0);
    b1.rotation.x = 0.24;
    bGroup.add(b1);
    const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 3.1), logTimberMat);
    b2.position.set(0, 1.35, 0);
    b2.rotation.x = -0.22;
    bGroup.add(b2);
    const crateL = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.88, 0.96), darkWoodMat);
    crateL.position.set(0, 0.44, -0.78);
    bGroup.add(crateL);
    const tntKeg = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.92, 12), tntBarrelMat);
    tntKeg.position.set(-0.22, 0.46, 0.18);
    bGroup.add(tntKeg);
    const crateR = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.88, 0.96), darkWoodMat);
    crateR.position.set(0, 0.44, 0.88);
    bGroup.add(crateR);

    const tntGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: sharedSparkGlowTex || sharedParticleGlowTex,
        color: 0xff5a22,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    tntGlow.scale.set(1.2, 1.2, 1);
    tntGlow.position.set(-0.22, 1.15, 0.18);
    bGroup.add(tntGlow);

    mineGroup.add(bGroup);
    bGroup.updateMatrixWorld(true);
    const colRef = pushMeasuredWorldBoxCollider(bGroup, 3.5, 0.04);
    const barEntry = {
      index: bIdx,
      group: bGroup,
      worldPos: new THREE.Vector3(mineOriginX + localX, mineBaseY + 0.6, mineOriginZ),
      hp: 4,
      destroyed: false,
      colliderRef: colRef,
      meshes: [b1, b2, crateL, tntKeg, crateR]
    };
    barEntry.meshes.forEach((bm) => {
      bm.userData.barricadeEntry = barEntry;
      barricadeHitMeshes.push(bm);
    });
    mineBarricades.push(barEntry);
  });

  // Gammelt Gruvekart (Old Mine Map) på ambolt innerst i gruven (x = 163.5, z = -1.5)
  const mineMapGroup = new THREE.Group();
  mineMapGroup.position.set(39.5, 0, 0);
  const mapPedestal = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.82, 0.95), darkWoodMat);
  mapPedestal.position.y = 0.41;
  mineMapGroup.add(mapPedestal);
  const scrollMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.58, 0.12, 0.72),
    new THREE.MeshStandardMaterial({ color: 0xf4dfb4, emissive: 0x3b2a10, roughness: 0.55 })
  );
  scrollMesh.position.y = 0.90;
  scrollMesh.rotation.y = 0.25;
  mineMapGroup.add(scrollMesh);
  const mapHalo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: sharedSparkGlowTex || sharedParticleGlowTex,
      color: 0xffe066,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  mapHalo.scale.set(1.65, 1.65, 1);
  mapHalo.position.y = 1.15;
  mineMapGroup.add(mapHalo);
  mineGroup.add(mineMapGroup);
  const mineMapPickup = {
    group: mineMapGroup,
    hitMesh: scrollMesh,
    worldPos: new THREE.Vector3(mineOriginX + 39.5, mineBaseY + 0.9, mineOriginZ),
    collected: false
  };
  scrollMesh.userData.mineMapPickup = mineMapPickup;
  mapPedestal.userData.mineMapPickup = mineMapPickup;

  // 12 Glitrende gullklumper / skattekister i gruven og i de 4 nye hjørnebiomene som gir Gull (Gold)
  const goldPickups = [];
  const goldHitMeshes = [];
  [
    { x: 129.2, z: -1.5, amount: 20, isChest: true },
    { x: 126.4, z: -0.6, amount: 15, isChest: false },
    { x: 122.2, z: -2.4, amount: 12, isChest: false },
    { x: 114.5, z: 2.2, amount: 15, isChest: true },
    { x: 91.5, z: -2.8, amount: 12, isChest: false },
    { x: 83.8, z: 6.4, amount: 15, isChest: true },
    { x: -142.0, z: -133.5, amount: 25, isChest: true },
    { x: 145.5, z: -136.5, amount: 28, isChest: true },
    { x: 134.0, z: -127.0, amount: 22, isChest: false },
    { x: 144.8, z: 136.2, amount: 26, isChest: true },
    { x: -145.0, z: 131.5, amount: 24, isChest: true },
    { x: -58.0, z: -118.0, amount: 18, isChest: false }
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

  // Visne/døde trær på Boot Hill (erstattes av ekte knudrete trær fra trees.glb når lastet)
  const bootHillDeadTreeCoords = [
    [-70, -14], [-74, 12], [-86, -16], [-89, 14], [-102, -13], [-104, 11], [-128, -12], [-129, 10]
  ];
  const proceduralDeadTreeGroups = [];
  bootHillDeadTreeCoords.forEach(([dx, dz], idx) => {
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
    proceduralDeadTreeGroups.push(dtGroup);
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
  // Kapellgulv slutter ved x_local = -2.0 (x = -122) slik at steintrappen ned til Katakombene er åpen!
  const chapelFloorFront = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.22, 8.6), chapelStoneMat);
  chapelFloorFront.position.set(1.4, 0.11, 0);
  chapelFloorFront.receiveShadow = true;
  chapelGroup.add(chapelFloorFront);
  const chapelFloorSideN = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.22, 2.8), chapelStoneMat);
  chapelFloorSideN.position.set(-3.4, 0.11, -2.9);
  chapelGroup.add(chapelFloorSideN);
  const chapelFloorSideS = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.22, 2.8), chapelStoneMat);
  chapelFloorSideS.position.set(-3.4, 0.11, 2.9);
  chapelGroup.add(chapelFloorSideS);

  // Nordvegg (-Z), Sørvegg (+Z), Vestvegg (-X med 2,70 m åpen trappeportal!) og Østvegg (+X med 2,80 m åpen dør)
  const chNorthWall = new THREE.Mesh(new THREE.BoxGeometry(9.4, 3.9, 0.52), chapelStoneMat);
  chNorthWall.position.set(0, 2.05, -4.04);
  chNorthWall.castShadow = true;
  chapelGroup.add(chNorthWall);

  const chSouthWall = new THREE.Mesh(new THREE.BoxGeometry(9.4, 3.2, 0.52), chapelStoneMat);
  chSouthWall.position.set(0, 1.70, 4.04);
  chSouthWall.castShadow = true;
  chapelGroup.add(chSouthWall);

  const chBackNorth = new THREE.Mesh(new THREE.BoxGeometry(0.56, 5.2, 2.95), chapelStoneMat);
  chBackNorth.position.set(-4.52, 2.70, -2.83);
  chBackNorth.castShadow = true;
  chapelGroup.add(chBackNorth);

  const chBackSouth = new THREE.Mesh(new THREE.BoxGeometry(0.56, 5.2, 2.95), chapelStoneMat);
  chBackSouth.position.set(-4.52, 2.70, 2.83);
  chBackSouth.castShadow = true;
  chapelGroup.add(chBackSouth);

  const chBackHeader = new THREE.Mesh(new THREE.BoxGeometry(0.58, 1.65, 3.1), chapelStoneMat);
  chBackHeader.position.set(-4.52, 4.35, 0);
  chapelGroup.add(chBackHeader);

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

  // Glødende Blodalter ved nordveggen inne i kapellet (klikk/skyt for Blodmåne & Lord Malakor!)
  const chapelAltarHitMeshes = [];
  const altarPedestal = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.08, 1.50), chapelStoneMat);
  altarPedestal.position.set(-1.6, 0.65, -2.65);
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
  bloodChaliceOrb.position.set(-1.6, 1.52, -2.65);
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
  altarHalo.position.set(-1.6, 1.52, -2.65);
  chapelGroup.add(altarHalo);

  graveyardGroup.updateMatrixWorld(true);
  pushMeasuredWorldBoxCollider(chNorthWall, 4.5, 0.02, -0.4);
  pushMeasuredWorldBoxCollider(chSouthWall, 4.2, 0.02, -0.4);
  pushMeasuredWorldBoxCollider(chBackNorth, 5.4, 0.02, -0.4);
  pushMeasuredWorldBoxCollider(chBackSouth, 5.4, 0.02, -0.4);
  pushMeasuredWorldBoxCollider(chFrontNorth, 4.4, 0.02, -0.4);
  pushMeasuredWorldBoxCollider(chFrontSouth, 4.4, 0.02, -0.4);
  pushMeasuredWorldBoxCollider(altarPedestal, 1.4, 0.02, -0.4);

  // =========================================================================
  // 6d-2. DEN SUNKNE KATAKOMBE UNDER BOOT HILL KAPELL (x = -122..-172, y = -6.5)
  // =========================================================================
  const catacombGroup = new THREE.Group();
  scene.add(catacombGroup);

  // 14 brede steintrappetrinn ned vestover fra (-122, 0.55) til (-134, -6.5)
  const stairSteps = 14;
  for (let si = 0; si < stairSteps; si++) {
    const t0 = si / stairSteps;
    const t1 = (si + 1) / stairSteps;
    const sx = THREE.MathUtils.lerp(-122.0, -134.0, (t0 + t1) * 0.5);
    const sy = THREE.MathUtils.lerp(0.55, -6.5, (t0 + t1) * 0.5);
    const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(12.2 / stairSteps + 0.08, 0.52, 2.74), chapelStoneMat);
    stepMesh.position.set(sx, sy - 0.25, chapelZ);
    stepMesh.receiveShadow = true;
    catacombGroup.add(stepMesh);
  }

  // Trappesjakt-sidevegger (hindrer å falle ut til siden, gjelder fra y = -7.5 opp til +3.5)
  const stairWallN = new THREE.Mesh(new THREE.BoxGeometry(12.6, 10.5, 0.55), chapelStoneMat);
  stairWallN.position.set(-128.0, -2.2, chapelZ - 1.65);
  catacombGroup.add(stairWallN);
  const stairWallS = new THREE.Mesh(new THREE.BoxGeometry(12.6, 10.5, 0.55), chapelStoneMat);
  stairWallS.position.set(-128.0, -2.2, chapelZ + 1.65);
  catacombGroup.add(stairWallS);
  const stairCeiling = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.45, 3.3), chapelStoneMat);
  stairCeiling.position.set(-130.5, -0.45, chapelZ);
  catacombGroup.add(stairCeiling);

  // Hovedhall i Den sunkne katakombe (x = -134..-172, z = -13.5..+10.5, gulv y = -6.5, tak y = -1.2)
  const catFloor = new THREE.Mesh(new THREE.BoxGeometry(38.8, 0.4, 24.4), chapelStoneMat);
  catFloor.position.set(-153.0, -6.7, chapelZ);
  catFloor.receiveShadow = true;
  catacombGroup.add(catFloor);

  const catCeiling = new THREE.Mesh(new THREE.BoxGeometry(38.8, 0.5, 24.4), chapelStoneMat);
  catCeiling.position.set(-153.0, -1.0, chapelZ);
  catacombGroup.add(catCeiling);

  const catWallN = new THREE.Mesh(new THREE.BoxGeometry(38.8, 5.6, 0.8), chapelStoneMat);
  catWallN.position.set(-153.0, -3.8, chapelZ - 12.1);
  catacombGroup.add(catWallN);
  const catWallS = new THREE.Mesh(new THREE.BoxGeometry(38.8, 5.6, 0.8), chapelStoneMat);
  catWallS.position.set(-153.0, -3.8, chapelZ + 12.1);
  catacombGroup.add(catWallS);
  const catWallW = new THREE.Mesh(new THREE.BoxGeometry(0.9, 5.6, 24.4), chapelStoneMat);
  catWallW.position.set(-172.0, -3.8, chapelZ);
  catacombGroup.add(catWallW);
  const catWallEN = new THREE.Mesh(new THREE.BoxGeometry(0.8, 5.6, 10.6), chapelStoneMat);
  catWallEN.position.set(-134.0, -3.8, chapelZ - 6.85);
  catacombGroup.add(catWallEN);
  const catWallES = new THREE.Mesh(new THREE.BoxGeometry(0.8, 5.6, 10.6), chapelStoneMat);
  catWallES.position.set(-134.0, -3.8, chapelZ + 6.85);
  catacombGroup.add(catWallES);

  // 4 Utskårne katakombe-steinsøyler + fakler
  const catacombTorchSpots = [
    [-143.5, chapelZ - 4.8], [-143.5, chapelZ + 4.8],
    [-158.0, chapelZ - 4.8], [-158.0, chapelZ + 4.8]
  ];
  catacombTorchSpots.forEach(([px, pz]) => {
    const colMesh = new THREE.Mesh(new THREE.BoxGeometry(1.15, 5.4, 1.15), chapelStoneMat);
    colMesh.position.set(px, -3.8, pz);
    colMesh.castShadow = true;
    colMesh.receiveShadow = true;
    catacombGroup.add(colMesh);
    pushMeasuredWorldBoxCollider(colMesh, -0.5, 0.02, -7.5);

    const torchHalo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: sharedSparkGlowTex || sharedParticleGlowTex,
        color: 0xffaa44,
        transparent: true,
        opacity: 0.78,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    torchHalo.scale.set(1.4, 1.4, 1);
    torchHalo.position.set(px + (px > -150 ? 0.75 : -0.75), -4.1, pz);
    catacombGroup.add(torchHalo);
  });

  // 2 Virtuelle lysankere under bakken (styrt av spillets 2-lys nærhets-pool så overflaten aldri betaler shader-kostnad for underjordiske lys!)
  {
    const cA = new THREE.Object3D();
    cA.position.set(-144.0, -3.3, chapelZ);
    catacombGroup.add(cA);
    worldVirtualLights.push({ intensity: 2.8, colorHex: 0xffa444, distance: 28, decay: 1.5, anchor: cA });
    const cB = new THREE.Object3D();
    cB.position.set(-165.0, -3.2, chapelZ);
    catacombGroup.add(cB);
    worldVirtualLights.push({ intensity: 3.2, colorHex: 0x74c6ff, distance: 26, decay: 1.5, anchor: cB });
  }

  // Hellfire Repeater-piedestal innerst i katakombene (-166.5, -6.5, chapelZ)
  const hellfirePedestalGroup = new THREE.Group();
  hellfirePedestalGroup.position.set(-166.5, -6.5, chapelZ);
  const hfStoneBase = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.05, 1.05, 8), chapelStoneMat);
  hfStoneBase.position.y = 0.52;
  hellfirePedestalGroup.add(hfStoneBase);
  const hfOrb = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.28, 1),
    new THREE.MeshStandardMaterial({
      color: 0x62d2ff,
      emissive: 0x2a8cff,
      emissiveIntensity: 2.0,
      metalness: 0.5,
      roughness: 0.15
    })
  );
  hfOrb.position.y = 1.42;
  hellfirePedestalGroup.add(hfOrb);
  const hfHalo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: sharedSparkGlowTex || sharedParticleGlowTex,
      color: 0x70d4ff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  hfHalo.scale.set(2.2, 2.2, 1);
  hfHalo.position.y = 1.48;
  hellfirePedestalGroup.add(hfHalo);
  catacombGroup.add(hellfirePedestalGroup);

  const hellfirePickup = {
    group: hellfirePedestalGroup,
    orb: hfOrb,
    halo: hfHalo,
    hitMesh: hfOrb,
    basePedestal: hfStoneBase,
    worldPos: new THREE.Vector3(-166.5, -5.1, chapelZ),
    collected: false
  };
  hfOrb.userData.hellfirePickup = hellfirePickup;
  hfStoneBase.userData.hellfirePickup = hellfirePickup;

  catacombGroup.updateMatrixWorld(true);
  pushMeasuredWorldBoxCollider(stairWallN, 3.2, 0.02, -7.5);
  pushMeasuredWorldBoxCollider(stairWallS, 3.2, 0.02, -7.5);
  pushMeasuredWorldBoxCollider(catWallN, -0.5, 0.02, -7.5);
  pushMeasuredWorldBoxCollider(catWallS, -0.5, 0.02, -7.5);
  pushMeasuredWorldBoxCollider(catWallW, -0.5, 0.02, -7.5);
  pushMeasuredWorldBoxCollider(catWallEN, -0.5, 0.02, -7.5);
  pushMeasuredWorldBoxCollider(catWallES, -0.5, 0.02, -7.5);
  pushMeasuredWorldBoxCollider(hfStoneBase, -0.5, 0.02, -7.5);

  // =========================================================================
  // 6d-3. SØRLIG JERNBANE, SPRENGT KLØFTBRO & PANSRET DAMPTOG (z = +75)
  // =========================================================================
  const railwayGroup = new THREE.Group();
  const railZ = 75.0;
  const railGroundY = 0.25;
  scene.add(railwayGroup);

  // Parallele jernbaneskinner & sviller fra x = -135 til brokanten ved x = +50
  [-0.92, 0.92].forEach((rzOff) => {
    const track = new THREE.Mesh(new THREE.BoxGeometry(185.0, 0.11, 0.09), wroughtIronMat);
    track.position.set(-42.5, railGroundY + 0.09, railZ + rzOff);
    railwayGroup.add(track);
  });
  for (let tx = -134.0; tx <= 49.0; tx += 1.15) {
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 2.65), darkWoodMat);
    tie.position.set(tx, railGroundY + 0.02, railZ);
    railwayGroup.add(tie);
  }
  // Sprengt jernbanebro ved østre kløft (x = +50..+88) med ødelagte bropilarer og skjeve bjelker
  [51.5, 86.5].forEach((bx) => {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(2.2, 5.2, 4.2), stonePlinthMat);
    pier.position.set(bx, railGroundY - 2.3, railZ);
    railwayGroup.add(pier);
  });
  [-0.92, 0.92].forEach((rzOff) => {
    const bentRailW = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.11, 0.10), wroughtIronMat);
    bentRailW.position.set(53.4, railGroundY - 0.65, railZ + rzOff);
    bentRailW.rotation.z = -0.24;
    railwayGroup.add(bentRailW);
    const bentRailE = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.11, 0.10), wroughtIronMat);
    bentRailE.position.set(83.2, railGroundY - 0.72, railZ + rzOff);
    bentRailE.rotation.z = 0.26;
    railwayGroup.add(bentRailE);
  });
  // Usynlig sperreboks langs kanten av den sprengte broen
  structureWallColliders.push({ minX: 49.2, maxX: 88.5, minZ: railZ - 2.4, maxZ: railZ + 2.4, minY: -8, maxY: 6 });

  // Pansret Damptog-gruppe sentrert ved (0, railGroundY + 0.10, +75)
  const trainAnchor = new THREE.Group();
  trainAnchor.position.set(0, railGroundY + 0.10, railZ);
  railwayGroup.add(trainAnchor);

  const trainFallbackGroup = new THREE.Group();
  {
    const fbBoiler = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 9.5, 14), wroughtIronMat);
    fbBoiler.rotation.z = Math.PI / 2;
    fbBoiler.position.set(-16.0, 2.0, 0);
    trainFallbackGroup.add(fbBoiler);
    const fbCab = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2.8, 2.6), darkWoodMat);
    fbCab.position.set(-10.0, 2.1, 0);
    trainFallbackGroup.add(fbCab);
    const fbBox = new THREE.Mesh(new THREE.BoxGeometry(12.2, 2.5, 2.5), wroughtIronMat);
    fbBox.position.set(4.1, 2.1, 0);
    trainFallbackGroup.add(fbBox);
    const fbFlat = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.9, 2.5), darkWoodMat);
    fbFlat.position.set(15.85, 0.95, 0);
    trainFallbackGroup.add(fbFlat);
  }
  trainAnchor.add(trainFallbackGroup);

  function mountTrainAsset(trainGLTF) {
    if (!trainGLTF || !trainGLTF.scene) return false;
    trainAnchor.remove(trainFallbackGroup);
    const normalizedTrain = instantiateBuildingGLB(trainGLTF.scene, M, {
      targetHeight: 4.15,
      centerXZ: false
    });
    trainAnchor.add(normalizedTrain);
    return true;
  }

  // Skrå trerampe opp til Gatling-flakvognen fra byen (nordside av x = +13..+16)
  const trainRamp = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.20, 3.8), weatheredPlankMatA);
  trainRamp.position.set(13.6, railGroundY + 0.62, railZ - 2.95);
  trainRamp.rotation.x = 0.30;
  trainRamp.receiveShadow = true;
  railwayGroup.add(trainRamp);

  // Kollisjonsbokser rundt toget (lokomotiv, kulletender, pansret vogn og flakvogn — åpning ved rampen)
  structureWallColliders.push({ minX: -22.2, maxX: -8.2, minZ: railZ - 1.38, maxZ: railZ + 1.38, minY: 0, maxY: 5.0 });
  structureWallColliders.push({ minX: -8.1, maxX: -2.6, minZ: railZ - 1.32, maxZ: railZ + 1.32, minY: 0, maxY: 4.0 });
  structureWallColliders.push({ minX: -2.0, maxX: 10.4, minZ: railZ - 1.35, maxZ: railZ + 1.35, minY: 0, maxY: 4.5 });
  structureWallColliders.push({ minX: 11.1, maxX: 20.8, minZ: railZ + 0.95, maxZ: railZ + 1.45, minY: 0, maxY: 4.0 });

  // Interaktivt Gatling-mål på bakvognen (x = +16.4, z = +75)
  const trainGatlingHitMeshes = [];
  const trainGatlingBeacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.45, 1.35, 10),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false })
  );
  trainGatlingBeacon.position.set(16.4, railGroundY + 1.95, railZ);
  railwayGroup.add(trainGatlingBeacon);
  trainGatlingHitMeshes.push(trainGatlingBeacon);

  const gatlingHalo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: sharedSparkGlowTex || sharedParticleGlowTex,
      color: 0xffd24c,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  gatlingHalo.scale.set(2.2, 2.2, 1);
  gatlingHalo.position.set(16.4, railGroundY + 2.65, railZ);
  railwayGroup.add(gatlingHalo);

  // =========================================================================
  // 6d-4. VOLUMETRISKE LYSSTRÅLER (GOD RAYS) GJENNOM SKOG, KAPELL & BY
  // =========================================================================
  const godRayMeshes = [];
  if (sharedGodRayTex) {
    const rayGeo = new THREE.PlaneGeometry(4.2, 16.5);
    const raySpecs = [
      { x: -12.0, z: -48.0, rotY: 0.35, tiltZ: 0.28, sx: 1.0, sy: 1.0 },
      { x: 11.0, z: -66.0, rotY: 0.85, tiltZ: 0.25, sx: 1.2, sy: 1.05 },
      { x: -8.5, z: -98.0, rotY: 0.15, tiltZ: 0.30, sx: 1.15, sy: 1.1 },
      { x: 1.5, z: -6.5, rotY: 0.45, tiltZ: 0.32, sx: 1.35, sy: 1.1 },
      { x: 118.0, z: -1.5, rotY: 0.2, tiltZ: 0.28, sx: 1.1, sy: 1.0 },
      { x: -119.5, z: -1.5, rotY: 0.55, tiltZ: 0.24, sx: 0.95, sy: 0.95 },
      { x: 12.0, z: 75.0, rotY: 0.40, tiltZ: 0.28, sx: 1.3, sy: 1.05 }
    ];
    raySpecs.forEach((rs) => {
      const mat = new THREE.MeshBasicMaterial({
        map: sharedGodRayTex,
        color: 0xffe4b2,
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      const rGroup = new THREE.Group();
      const gy = getTerrainBaseHeight(rs.x, rs.z);
      rGroup.position.set(rs.x, gy + 7.2, rs.z);
      rGroup.rotation.set(0.14, rs.rotY, rs.tiltZ);
      rGroup.scale.set(rs.sx, rs.sy, rs.sx);
      const p1 = new THREE.Mesh(rayGeo, mat);
      const p2 = new THREE.Mesh(rayGeo, mat);
      p2.rotation.y = Math.PI * 0.5;
      rGroup.add(p1, p2);
      scene.add(rGroup);
      godRayMeshes.push({ group: rGroup, mat, baseOpacity: 0.15 });
    });
  }

  function updateGodRays(nightBlend, bloodMoonBlend = 0) {
    for (let i = 0; i < godRayMeshes.length; i++) {
      const gr = godRayMeshes[i];
      if (bloodMoonBlend > 0.05) {
        gr.mat.color.setHex(0xff5258);
        gr.mat.opacity = 0.08 + bloodMoonBlend * 0.11;
      } else if (nightBlend > 0.5) {
        gr.mat.color.setHex(0x88b0e8);
        gr.mat.opacity = gr.baseOpacity * 0.45;
      } else {
        gr.mat.color.setHex(0xffe6b8);
        gr.mat.opacity = gr.baseOpacity * (1.0 - nightBlend * 0.45);
      }
    }
  }

  // =========================================================================
  // 6e. FEM REGIONALE VEISKILT (CanvasTexture på EN/NO) LANGS GRUSVEIENE
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
  spawnRoadSignpost(-3.4, 21.5, Math.PI, 'roadRailwayTitle', 'roadRailwaySub');
  spawnRoadSignpost(3.4, 15.2, 0.0, 'roadTownTitle', 'roadTownSub');
  spawnRoadSignpost(-16.5, -21.5, 0.55, 'roadSilverpineTitle', 'roadSilverpineSub');
  spawnRoadSignpost(16.5, -21.5, -0.55, 'roadFortTitle', 'roadFortSub');
  spawnRoadSignpost(16.5, 21.5, -2.55, 'roadBrimstoneTitle', 'roadBrimstoneSub');
  spawnRoadSignpost(-16.5, 21.5, 2.55, 'roadStoneCircleTitle', 'roadStoneCircleSub');

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

  function refreshRegionSigns() {
    if (!L) return;
    const d = L();
    mineSignMesh.userData.updateSign(d.signMineTitle, d.signMineSub);
    chapelSignMesh.userData.updateSign(d.signChapelTitle, d.signChapelSub);
    if (spSignMesh && d.signSilverpineTitle) spSignMesh.userData.updateSign(d.signSilverpineTitle, d.signSilverpineSub);
    if (fortSignMesh && d.signFortTitle) fortSignMesh.userData.updateSign(d.signFortTitle, d.signFortSub);
    if (brimSignMesh && d.signBrimstoneTitle) brimSignMesh.userData.updateSign(d.signBrimstoneTitle, d.signBrimstoneSub);
    if (scSignMesh && d.signStoneCircleTitle) scSignMesh.userData.updateSign(d.signStoneCircleTitle, d.signStoneCircleSub);
    for (let i = 0; i < roadSignEntries.length; i++) {
      const rs = roadSignEntries[i];
      if (d[rs.titleKey]) {
        rs.signA.userData.updateSign(d[rs.titleKey], d[rs.subKey] || '');
        rs.signB.userData.updateSign(d[rs.titleKey], d[rs.subKey] || '');
      }
    }
  }

  // =========================================================================
  // 6f. BOTANISKE PBR-TRÆR, BUSKER, GRESS/BREGNER & LEVENDE SMÅVILT (.glb)
  // =========================================================================
  const ambientVultures = [];
  const ambientRavens = [];
  const ambientRabbits = [];
  const ambientFish = [];

  function mirrorGeometryX(srcGeo) {
    const geo = srcGeo.clone();
    const pos = geo.attributes.position;
    if (pos) {
      for (let i = 0; i < pos.count; i++) {
        pos.setX(i, -pos.getX(i));
      }
    }
    const norm = geo.attributes.normal;
    if (norm) {
      for (let i = 0; i < norm.count; i++) {
        norm.setX(i, -norm.getX(i));
      }
    }
    if (geo.index) {
      const idx = geo.index.array;
      for (let i = 0; i + 2 < idx.length; i += 3) {
        const tmp = idx[i + 1];
        idx[i + 1] = idx[i + 2];
        idx[i + 2] = tmp;
      }
      geo.index.needsUpdate = true;
    }
    return geo;
  }

  function prepareBotanicalMaterial(origMat, opts = {}) {
    const mat = origMat.clone();
    const maxAniso = M.maxAnisotropy || 8;
    if (mat.map) {
      mat.map.colorSpace = THREE.SRGBColorSpace;
      mat.map.anisotropy = maxAniso;
    }
    if (mat.normalMap) {
      mat.normalMap.colorSpace = THREE.LinearSRGBColorSpace;
      mat.normalMap.anisotropy = maxAniso;
    }
    mat.flatShading = false;
    mat.metalness = 0.0;
    mat.roughness = opts.roughness ?? 0.88;
    mat.envMapIntensity = opts.envMapIntensity ?? 0.34;
    if (opts.vertexColors !== false) {
      mat.vertexColors = true;
    }
    if (opts.alphaCutout) {
      mat.alphaTest = opts.alphaCutoff ?? 0.38;
      mat.transparent = false;
      mat.side = THREE.DoubleSide;
    } else if (opts.doubleSided) {
      mat.side = THREE.DoubleSide;
    }
    if (opts.swayAmp && opts.swayAmp > 0) {
      applyWindSwayShader(mat, opts.swayAmp, opts.swayMinY ?? 0.05);
    }
    mat.needsUpdate = true;
    return mat;
  }

  function isClearForFlora(x, z) {
    // Hold Dustwood sentrum og bygningstomter rene
    if (Math.abs(x) < 22.5 && Math.abs(z) < 21.5) return false;
    // Hold hovedveiene (Nord-Sør og Øst-Vest) frie
    if (Math.abs(x) < 3.6 && z > -146 && z < 78) return false;
    if (Math.abs(z + 1.5) < 3.6 && Math.abs(x) < 132) return false;
    // Hold jernbanesporet og stasjonen i sør fri
    if (Math.abs(z - 75.0) < 4.8) return false;
    // Hold selve elveløpet og trebroen fri
    const creekZ = -78.0 + Math.sin(x * 0.065) * 3.6;
    if (Math.abs(z - creekZ) < 2.25) return false;
    if (Math.abs(x) < 4.6 && z > -85.5 && z < -70.5) return false;
    // Hold kapellgulvet på Boot Hill, gruveåpningen og de 4 nye hjørnelandemerkene fri for busker/trær
    if (x > -128 && x < -112 && Math.abs(z + 1.5) < 8.5) return false;
    if (x > 113 && x < 138 && Math.abs(z + 1.5) < 9.5) return false;
    if (Math.hypot(x + 142, z + 138) < 11.5) return false;
    if (Math.abs(x - 140) < 13.5 && Math.abs(z + 132) < 12.5) return false;
    if (Math.abs(x - 140) < 14.5 && Math.abs(z - 136) < 11.5) return false;
    if (Math.hypot(x + 140, z - 136) < 14.5) return false;
    return true;
  }

  function mountWorldBotanicalAndWildlifeAssets(assets) {
    if (!assets) return;
    const dummy = new THREE.Object3D();
    const tmpCol = new THREE.Color();

    // 1. Ekte botaniske furu-, eike-, bøke- og døde trær (assets/trees.glb)
    if (assets.trees && assets.trees.scene) {
      for (let i = 0; i < proceduralTreeGroups.length; i++) {
        forestGroup.remove(proceduralTreeGroups[i]);
      }
      proceduralTreeGroups.length = 0;

      for (let i = 0; i < proceduralDeadTreeGroups.length; i++) {
        graveyardGroup.remove(proceduralDeadTreeGroups[i]);
      }
      proceduralDeadTreeGroups.length = 0;

      const treeMatCache = new Map();
      const getTreeMat = (m) => {
        if (treeMatCache.has(m)) return treeMatCache.get(m);
        const mName = (m.name || '').toLowerCase();
        const isCanopy = mName.includes('canopy');
        const up = prepareBotanicalMaterial(m, {
          alphaCutout: isCanopy,
          alphaCutoff: 0.40,
          roughness: isCanopy ? 0.86 : 0.92,
          envMapIntensity: isCanopy ? 0.36 : 0.30,
          swayAmp: isCanopy ? 0.085 : 0.0,
          swayMinY: 1.35
        });
        treeMatCache.set(m, up);
        return up;
      };

      const extractTreeParts = (nodeName) => {
        const rootNode = assets.trees.scene.getObjectByName(nodeName);
        if (!rootNode) return null;
        const parts = [];
        rootNode.traverse((n) => {
          if (n.isMesh && n.geometry && n.material) {
            const mName = (n.material.name || '').toLowerCase();
            parts.push({
              geometry: n.geometry,
              material: getTreeMat(n.material),
              isCanopy: mName.includes('canopy')
            });
          }
        });
        return parts.length > 0 ? parts : null;
      };

      const liveTemplates = [
        extractTreeParts('pine_a_lod0'),
        extractTreeParts('pine_b_lod0'),
        extractTreeParts('oak_a_lod0'),
        extractTreeParts('pine_c_lod0'),
        extractTreeParts('oak_b_lod0'),
        extractTreeParts('beech_a_lod0')
      ].filter(Boolean);

      if (liveTemplates.length > 0) {
        const extraWoodsRng = createSeededRng(7719);
        const allTreePlacements = treeCoords.map(([x, z, s], idx) => ({
          x,
          z,
          s: s * 1.02,
          rotY: (idx * 1.93) % (Math.PI * 2),
          tplIdx: idx % liveTemplates.length
        }));

        // Legg til ekstra skogbryn- og elvebreddstrær i Whispering Woods uten å blokkere veien
        for (let i = 0; i < 90 && allTreePlacements.length < 82; i++) {
          const tx = (extraWoodsRng() - 0.5) * 88;
          const tz = -27 - extraWoodsRng() * 116;
          if (!isClearForFlora(tx, tz) || Math.abs(tx) < 5.6) continue;
          let tooClose = false;
          for (let j = 0; j < allTreePlacements.length; j++) {
            const dx = tx - allTreePlacements[j].x;
            const dz = tz - allTreePlacements[j].z;
            if (dx * dx + dz * dz < 34.0) {
              tooClose = true;
              break;
            }
          }
          if (tooClose) continue;
          allTreePlacements.push({
            x: tx,
            z: tz,
            s: 1.08 + extraWoodsRng() * 0.48,
            rotY: extraWoodsRng() * Math.PI * 2,
            tplIdx: allTreePlacements.length % liveTemplates.length
          });
        }

        // Legg til høyreiste furutrær rundt NV Silverpine Peak uten ekstra draw calls (samme InstancedMesh!)
        for (let spIdx = 0; spIdx < 28; spIdx++) {
          const ang = (spIdx / 28) * Math.PI * 2 + extraWoodsRng() * 0.22;
          const rad = 14.5 + extraWoodsRng() * 34.0;
          const sx = -142.0 + Math.cos(ang) * rad;
          const sz = -138.0 + Math.sin(ang) * rad;
          if (sx < -202 || sz < -202 || !isClearForFlora(sx, sz)) continue;
          allTreePlacements.push({
            x: sx,
            z: sz,
            s: 1.22 + extraWoodsRng() * 0.52,
            rotY: extraWoodsRng() * Math.PI * 2,
            tplIdx: 0
          });
        }

        for (let t = 0; t < liveTemplates.length; t++) {
          const bucket = allTreePlacements.filter((p) => p.tplIdx === t);
          if (bucket.length === 0) continue;
          const parts = liveTemplates[t];
          for (let pIdx = 0; pIdx < parts.length; pIdx++) {
            const part = parts[pIdx];
            const inst = new THREE.InstancedMesh(part.geometry, part.material, bucket.length);
            // Stammen kaster skarp skygge + bakke-kontaktsygge under kronen; unngå dyr alpha-discard i skyggekartet på trekronen!
            inst.castShadow = !part.isCanopy;
            inst.receiveShadow = true;
            for (let i = 0; i < bucket.length; i++) {
              const b = bucket[i];
              const ty = getTerrainBaseHeight(b.x, b.z) - 0.05;
              dummy.position.set(b.x, ty, b.z);
              dummy.rotation.set(0, b.rotY, 0);
              dummy.scale.setScalar(b.s);
              dummy.updateMatrix();
              inst.setMatrixAt(i, dummy.matrix);
              if (part.isCanopy) {
                const vTint = 0.90 + ((i * 37) % 19) * 0.01;
                tmpCol.setRGB(vTint * 0.96, vTint * 1.03, vTint * 0.92);
                inst.setColorAt(i, tmpCol);
              }
            }
            inst.instanceMatrix.needsUpdate = true;
            if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
            forestGroup.add(inst);
          }
          if (createContactShadow) {
            for (let i = 0; i < bucket.length; i++) {
              const b = bucket[i];
              if (b.z < -95) continue;
              const sh = createContactShadow(1.45 * b.s, 1.45 * b.s, 0.05);
              sh.position.set(b.x, getTerrainBaseHeight(b.x, b.z) + 0.02, b.z);
              forestGroup.add(sh);
            }
          }
        }
      }

      const deadParts = extractTreeParts('dead_a_lod0');
      if (deadParts) {
        const canyonSnags = [
          [48, -15, 1.05], [64, 14, 1.18], [82, -17, 1.12], [98, 16, 1.24],
          [112, -16, 1.15], [-46, 14, 0.96], [-58, -15, 1.08], [38, 28, 1.02],
          [122, 122, 1.14], [156, 124, 1.20], [124, 152, 1.08], [158, 150, 1.18],
          [122, -118, 1.06], [158, -148, 1.16]
        ];
        const snagPlacements = [
          ...bootHillDeadTreeCoords.map(([dx, dz], idx) => ({
            x: dx,
            z: dz,
            s: 1.02 + (idx % 3) * 0.14,
            rotY: idx * 1.37
          })),
          ...canyonSnags.map(([dx, dz, ds], idx) => ({
            x: dx,
            z: dz,
            s: ds,
            rotY: idx * 2.11 + 0.6
          }))
        ];
        for (let pIdx = 0; pIdx < deadParts.length; pIdx++) {
          const part = deadParts[pIdx];
          const inst = new THREE.InstancedMesh(part.geometry, part.material, snagPlacements.length);
          inst.castShadow = true;
          inst.receiveShadow = true;
          for (let i = 0; i < snagPlacements.length; i++) {
            const sp = snagPlacements[i];
            dummy.position.set(sp.x, getTerrainBaseHeight(sp.x, sp.z) - 0.04, sp.z);
            dummy.rotation.set(0, sp.rotY, ((i % 2) * 2 - 1) * 0.04);
            dummy.scale.setScalar(sp.s);
            dummy.updateMatrix();
            inst.setMatrixAt(i, dummy.matrix);
          }
          inst.instanceMatrix.needsUpdate = true;
          graveyardGroup.add(inst);
        }
      }
    }

    // 2. Fotogrammetri-busker (assets/shrubs.glb) i ørken, veikant, canyon og skog
    if (assets.shrubs && assets.shrubs.scene) {
      const bushNodes = ['bush_a_lod1', 'bush_b_lod1']
        .map((nm) => assets.shrubs.scene.getObjectByName(nm))
        .filter((n) => n && n.isMesh);
      if (bushNodes.length > 0) {
        const shrubMat = prepareBotanicalMaterial(bushNodes[0].material, {
          doubleSided: true,
          roughness: 0.88,
          envMapIntensity: 0.34,
          swayAmp: 0.045,
          swayMinY: 0.12
        });
        const sRng = createSeededRng(5183);
        for (let bIdx = 0; bIdx < bushNodes.length; bIdx++) {
          const maxCount = 64;
          const inst = new THREE.InstancedMesh(bushNodes[bIdx].geometry, shrubMat, maxCount);
          inst.castShadow = false;
          inst.receiveShadow = true;
          let placed = 0;
          for (let i = 0; i < 650 && placed < maxCount; i++) {
            const bx = (sRng() - 0.5) * 290;
            const bz = (sRng() - 0.5) * 290;
            if (!isClearForFlora(bx, bz)) continue;
            const by = getTerrainBaseHeight(bx, bz);
            dummy.position.set(bx, by - 0.04, bz);
            dummy.rotation.set((sRng() - 0.5) * 0.08, sRng() * Math.PI * 2, (sRng() - 0.5) * 0.08);
            const sc = (bz < -26 ? 0.92 : 0.72) + sRng() * 0.58;
            dummy.scale.set(sc, sc * (0.82 + sRng() * 0.34), sc);
            dummy.updateMatrix();
            inst.setMatrixAt(placed, dummy.matrix);
            if (bz < -26) {
              // Frodig skogsbusk i Whispering Woods
              tmpCol.setRGB(0.84 + sRng() * 0.16, 0.95 + sRng() * 0.12, 0.78 + sRng() * 0.14);
            } else if (bx < -42) {
              // Dempet aske-/olivengrønn krattbusk på Boot Hill
              tmpCol.setRGB(0.76 + sRng() * 0.12, 0.72 + sRng() * 0.12, 0.62 + sRng() * 0.10);
            } else {
              // Tørr western sagebrush / chaparral i ørken og Crimson Canyon
              tmpCol.setRGB(1.06 + sRng() * 0.14, 0.94 + sRng() * 0.12, 0.72 + sRng() * 0.10);
            }
            inst.setColorAt(placed, tmpCol);
            placed++;
          }
          inst.count = placed;
          inst.instanceMatrix.needsUpdate = true;
          if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
          scene.add(inst);
        }
      }
    }

    // 3. Ekte vindsusende 3D-gress, tørr præriegress, bregner og markblomster (assets/undergrowth.glb)
    if (assets.undergrowth && assets.undergrowth.scene) {
      if (fallbackGrassInst) {
        scene.remove(fallbackGrassInst);
        fallbackGrassInst.geometry.dispose();
        fallbackGrassInst.material.dispose();
        fallbackGrassInst = null;
      }

      let baseUnderMat = null;
      assets.undergrowth.scene.traverse((n) => {
        if (!baseUnderMat && n.isMesh && n.material) {
          baseUnderMat = prepareBotanicalMaterial(n.material, {
            alphaCutout: true,
            alphaCutoff: 0.36,
            roughness: 0.87,
            envMapIntensity: 0.34,
            swayAmp: 0.068,
            swayMinY: 0.04
          });
        }
      });

      const getUnderGeo = (nm) => {
        const n = assets.undergrowth.scene.getObjectByName(nm);
        return n && n.isMesh ? n.geometry : null;
      };

      if (baseUnderMat) {
        const uRng = createSeededRng(9047);

        // 3a. Tørt prærie- og ørkengress langs ørkendyner, veikanter, canyon og jernbane
        const prairieGeos = [getUnderGeo('grass_a'), getUnderGeo('stalks_a')].filter(Boolean);
        for (let gIdx = 0; gIdx < prairieGeos.length; gIdx++) {
          const maxCount = 480;
          const inst = new THREE.InstancedMesh(prairieGeos[gIdx], baseUnderMat, maxCount);
          inst.receiveShadow = true;
          let placed = 0;
          for (let i = 0; i < 2400 && placed < maxCount; i++) {
            const gx = (uRng() - 0.5) * 300;
            const gz = -24 + uRng() * 175;
            if (!isClearForFlora(gx, gz)) continue;
            const gy = getTerrainBaseHeight(gx, gz);
            dummy.position.set(gx, gy - 0.02, gz);
            dummy.rotation.set((uRng() - 0.5) * 0.12, uRng() * Math.PI * 2, (uRng() - 0.5) * 0.12);
            const sc = 1.15 + uRng() * 0.95;
            dummy.scale.set(sc, sc * (0.95 + uRng() * 0.55), sc);
            dummy.updateMatrix();
            inst.setMatrixAt(placed, dummy.matrix);
            // Solbleket gyllent præriegress (aldri knallgult plastgress!)
            tmpCol.setRGB(1.22 + uRng() * 0.18, 1.06 + uRng() * 0.14, 0.74 + uRng() * 0.12);
            inst.setColorAt(placed, tmpCol);
            placed++;
          }
          inst.count = placed;
          inst.instanceMatrix.needsUpdate = true;
          if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
          scene.add(inst);
        }

        // 3b. Frodig skoggress i Whispering Woods (nord, z: -24 til -145)
        const woodsGrassGeos = [getUnderGeo('lush_a'), getUnderGeo('grass_b')].filter(Boolean);
        for (let gIdx = 0; gIdx < woodsGrassGeos.length; gIdx++) {
          const maxCount = 450;
          const inst = new THREE.InstancedMesh(woodsGrassGeos[gIdx], baseUnderMat, maxCount);
          inst.receiveShadow = true;
          let placed = 0;
          for (let i = 0; i < 2200 && placed < maxCount; i++) {
            const gx = (uRng() - 0.5) * 96;
            const gz = -24.5 - uRng() * 120;
            if (!isClearForFlora(gx, gz)) continue;
            const gy = getTerrainBaseHeight(gx, gz);
            dummy.position.set(gx, gy - 0.02, gz);
            dummy.rotation.set((uRng() - 0.5) * 0.1, uRng() * Math.PI * 2, (uRng() - 0.5) * 0.1);
            const sc = 1.18 + uRng() * 0.85;
            dummy.scale.set(sc, sc * (0.95 + uRng() * 0.45), sc);
            dummy.updateMatrix();
            inst.setMatrixAt(placed, dummy.matrix);
            tmpCol.setRGB(0.84 + uRng() * 0.18, 1.02 + uRng() * 0.18, 0.78 + uRng() * 0.14);
            inst.setColorAt(placed, tmpCol);
            placed++;
          }
          inst.count = placed;
          inst.instanceMatrix.needsUpdate = true;
          if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
          forestGroup.add(inst);
        }

        // 3c. Ekte 3D skogsbregner (Poly Haven fern_02) i Whispering Woods og langs elvebredden
        const fernGeos = [getUnderGeo('fern_a'), getUnderGeo('fern_b')].filter(Boolean);
        for (let fIdx = 0; fIdx < fernGeos.length; fIdx++) {
          const maxCount = 210;
          const inst = new THREE.InstancedMesh(fernGeos[fIdx], baseUnderMat, maxCount);
          inst.receiveShadow = true;
          let placed = 0;
          for (let i = 0; i < 900 && placed < maxCount; i++) {
            const fx = (uRng() - 0.5) * 86;
            const fz = -26 - uRng() * 116;
            if (!isClearForFlora(fx, fz)) continue;
            const fy = getTerrainBaseHeight(fx, fz);
            dummy.position.set(fx, fy - 0.02, fz);
            dummy.rotation.set((uRng() - 0.5) * 0.12, uRng() * Math.PI * 2, (uRng() - 0.5) * 0.12);
            const sc = 1.22 + uRng() * 0.78;
            dummy.scale.setScalar(sc);
            dummy.updateMatrix();
            inst.setMatrixAt(placed, dummy.matrix);
            tmpCol.setRGB(0.88 + uRng() * 0.16, 1.04 + uRng() * 0.16, 0.82 + uRng() * 0.12);
            inst.setColorAt(placed, tmpCol);
            placed++;
          }
          inst.count = placed;
          inst.instanceMatrix.needsUpdate = true;
          if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
          forestGroup.add(inst);
        }

        // 3d. Markblomster (lupiner, prestekrager og smørblomster) i lysninger og langs elva
        const flowerGeos = [getUnderGeo('flower_lupine_a'), getUnderGeo('flower_daisy'), getUnderGeo('flower_yellow')].filter(Boolean);
        for (let flIdx = 0; flIdx < flowerGeos.length; flIdx++) {
          const maxCount = 85;
          const inst = new THREE.InstancedMesh(flowerGeos[flIdx], baseUnderMat, maxCount);
          inst.receiveShadow = true;
          let placed = 0;
          for (let i = 0; i < 450 && placed < maxCount; i++) {
            const fx = (uRng() - 0.5) * 76;
            const fz = -25 - uRng() * 110;
            if (!isClearForFlora(fx, fz)) continue;
            const fy = getTerrainBaseHeight(fx, fz);
            dummy.position.set(fx, fy - 0.02, fz);
            dummy.rotation.set(0, uRng() * Math.PI * 2, 0);
            const sc = 0.95 + uRng() * 0.55;
            dummy.scale.setScalar(sc);
            dummy.updateMatrix();
            inst.setMatrixAt(placed, dummy.matrix);
            tmpCol.setRGB(1.04, 1.04, 1.02);
            inst.setColorAt(placed, tmpCol);
            placed++;
          }
          inst.count = placed;
          inst.instanceMatrix.needsUpdate = true;
          if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
          forestGroup.add(inst);
        }
      }
    }

    // 4. Levende småvilt i luften, skogen og elva (assets/wildlife.glb: gribber, ravner, kaniner og gjedder)
    if (assets.wildlife && assets.wildlife.scene) {
      let creatureMat = null;
      assets.wildlife.scene.traverse((n) => {
        if (!creatureMat && n.isMesh && n.material) {
          creatureMat = prepareBotanicalMaterial(n.material, {
            vertexColors: true,
            roughness: 0.86,
            envMapIntensity: 0.36
          });
        }
      });

      const getWildGeo = (nm) => {
        const n = assets.wildlife.scene.getObjectByName(nm);
        return n && n.isMesh ? n.geometry : null;
      };

      if (creatureMat) {
        // 4a. Svevende gribber over Crimson Canyon og Boot Hill
        const vulBodyGeo = getWildGeo('dl_vulture_body');
        const vulWingRGeo = getWildGeo('dl_vulture_wing');
        const vulLegsGeo = getWildGeo('dl_vulture_legs');
        if (vulBodyGeo && vulWingRGeo) {
          const vulWingLGeo = mirrorGeometryX(vulWingRGeo);
          const vultureCenters = [
            { cx: 82, cz: -6, y: 23.5, r: 22, speed: 0.24, phase: 0.0 },
            { cx: 96, cz: 4, y: 26.5, r: 26, speed: 0.20, phase: 2.1 },
            { cx: 68, cz: -14, y: 21.0, r: 19, speed: 0.27, phase: 4.2 },
            { cx: -88, cz: -4, y: 22.0, r: 21, speed: 0.22, phase: 1.0 },
            { cx: -108, cz: 5, y: 25.0, r: 25, speed: 0.19, phase: 3.3 },
            { cx: -72, cz: 8, y: 20.5, r: 18, speed: 0.25, phase: 5.1 }
          ];
          for (let i = 0; i < vultureCenters.length; i++) {
            const vc = vultureCenters[i];
            const vg = new THREE.Group();
            const body = new THREE.Mesh(vulBodyGeo, creatureMat);
            vg.add(body);
            if (vulLegsGeo) vg.add(new THREE.Mesh(vulLegsGeo, creatureMat));
            const wingR = new THREE.Mesh(vulWingRGeo, creatureMat);
            const wingL = new THREE.Mesh(vulWingLGeo, creatureMat);
            vg.add(wingR, wingL);
            vg.scale.setScalar(1.32);
            scene.add(vg);
            ambientVultures.push({ group: vg, wingR, wingL, ...vc });
          }
        }

        // 4b. Sittende ravner på veiskiltene og Boot Hill-ruinen
        const crowGeo = getWildGeo('dl_crow');
        if (crowGeo) {
          const ravenPerches = [
            [3.2, 2.66, -21.5, 0.3],
            [-21.5, 2.66, -4.6, 1.9],
            [21.5, 2.66, -4.6, -1.2],
            [-78.0, 2.55, -8.5, 0.8],
            [-116.6, 4.18, -5.6, 2.4]
          ];
          for (let i = 0; i < ravenPerches.length; i++) {
            const [rx, ryOff, rz, rRot] = ravenPerches[i];
            const baseH = i < 3 ? getTerrainBaseHeight(rx, rz) : getTerrainBaseHeight(rx, rz);
            const rg = new THREE.Group();
            const crowMesh = new THREE.Mesh(crowGeo, creatureMat);
            crowMesh.castShadow = true;
            rg.add(crowMesh);
            rg.position.set(rx, baseH + ryOff, rz);
            rg.rotation.y = rRot;
            rg.scale.setScalar(0.56);
            scene.add(rg);
            ambientRavens.push({ group: rg, baseRotY: rRot, phase: i * 1.7 });
          }
        }

        // 4c. Ville skogskaniner som hopper mellom bregnene i Whispering Woods
        const rabTorso = getWildGeo('dl_rabbit_torso');
        const rabHead = getWildGeo('dl_rabbit_head');
        const rabFL = getWildGeo('dl_rabbit_leg_fl');
        const rabFR = getWildGeo('dl_rabbit_leg_fr');
        const rabBL = getWildGeo('dl_rabbit_leg_bl');
        const rabBR = getWildGeo('dl_rabbit_leg_br');
        if (rabTorso && rabHead) {
          const rabbitHomes = [
            [-9.5, -34], [10.5, -38], [-15.0, -49], [14.2, -55],
            [-8.5, -67], [11.5, -86], [-13.5, -98], [9.2, -110]
          ];
          for (let i = 0; i < rabbitHomes.length; i++) {
            const [hx, hz] = rabbitHomes[i];
            const rg = new THREE.Group();
            const torsoM = new THREE.Mesh(rabTorso, creatureMat);
            torsoM.castShadow = true;
            rg.add(torsoM);

            const headPiv = new THREE.Group();
            headPiv.position.set(0, 0.20, 0.22);
            const headM = new THREE.Mesh(rabHead, creatureMat);
            headM.position.set(0, -0.06, -0.02);
            headPiv.add(headM);
            rg.add(headPiv);

            const frontLegs = new THREE.Group();
            frontLegs.position.set(0, 0.16, 0.18);
            if (rabFL) frontLegs.add(new THREE.Mesh(rabFL, creatureMat));
            if (rabFR) frontLegs.add(new THREE.Mesh(rabFR, creatureMat));
            rg.add(frontLegs);

            const backLegs = new THREE.Group();
            backLegs.position.set(0, 0.18, -0.06);
            if (rabBL) backLegs.add(new THREE.Mesh(rabBL, creatureMat));
            if (rabBR) backLegs.add(new THREE.Mesh(rabBR, creatureMat));
            rg.add(backLegs);

            rg.scale.setScalar(1.18);
            rg.position.set(hx, getTerrainBaseHeight(hx, hz), hz);
            forestGroup.add(rg);
            ambientRabbits.push({
              group: rg,
              headPiv,
              frontLegs,
              backLegs,
              hx,
              hz,
              radius: 2.2 + (i % 3) * 0.9,
              speed: 0.42 + (i % 4) * 0.08,
              phase: i * 1.35
            });
          }
        }

        // 4d. Elvefisk (gjedde) som svømmer under trebroen i Whispering Woods-elva
        const pikeBody = getWildGeo('dl_pike_body');
        const pikeTail = getWildGeo('dl_pike_tail');
        if (pikeBody) {
          const fishSpawns = [-22, -14, -6, -1.5, 2.5, 9, 17, 26];
          for (let i = 0; i < fishSpawns.length; i++) {
            const fg = new THREE.Group();
            fg.add(new THREE.Mesh(pikeBody, creatureMat));
            let tailM = null;
            if (pikeTail) {
              tailM = new THREE.Mesh(pikeTail, creatureMat);
              tailM.position.set(0, 0, -0.34);
              fg.add(tailM);
            }
            fg.scale.setScalar(1.15);
            scene.add(fg);
            ambientFish.push({
              group: fg,
              tail: tailM,
              baseX: fishSpawns[i],
              rangeX: 4.5 + (i % 3) * 1.8,
              speed: 0.55 + (i % 4) * 0.12,
              phase: i * 1.9,
              zOffset: ((i % 3) - 1) * 0.85
            });
          }
        }
      }
    }
  }

  function updateAmbientWildlife(dt, worldTime) {
    // Svevende gribber i termikk over Crimson Canyon og Boot Hill
    for (let i = 0; i < ambientVultures.length; i++) {
      const v = ambientVultures[i];
      const ang = worldTime * v.speed + v.phase;
      const vx = v.cx + Math.cos(ang) * v.r;
      const vz = v.cz + Math.sin(ang) * v.r;
      const vy = v.y + Math.sin(worldTime * 0.7 + v.phase) * 1.25;
      v.group.position.set(vx, vy, vz);
      // +Z er fremover på dl_vulture_body; tangentvektoren til sirkelen er (-sin(ang), cos(ang))
      v.group.rotation.set(
        0.04 * Math.cos(worldTime * 0.7 + v.phase),
        Math.atan2(-Math.sin(ang), Math.cos(ang)),
        -0.24
      );
      const flap = Math.max(0, Math.sin(worldTime * 0.55 + v.phase * 1.7) - 0.35);
      const wingAngle = flap > 0 ? Math.sin(worldTime * 6.8 + v.phase) * 0.38 * flap : 0.06;
      v.wingR.rotation.z = wingAngle;
      v.wingL.rotation.z = -wingAngle;
    }

    // Sittende ravner som speider langs veiene
    for (let i = 0; i < ambientRavens.length; i++) {
      const rv = ambientRavens[i];
      rv.group.rotation.y = rv.baseRotY + Math.sin(worldTime * 1.1 + rv.phase) * 0.28;
      rv.group.rotation.x = Math.sin(worldTime * 2.3 + rv.phase) * 0.06;
    }

    // Ville skogskaniner som hopper og beiter i Whispering Woods
    for (let i = 0; i < ambientRabbits.length; i++) {
      const rb = ambientRabbits[i];
      const cycle = (worldTime * 0.75 + rb.phase) % 4.0;
      const moving = cycle < 2.2;
      const tMove = rb.phase * 3.0 + Math.floor((worldTime * 0.75 + rb.phase) / 4.0) * 2.2 + Math.min(cycle, 2.2);
      const ang = tMove * rb.speed;
      const rx = rb.hx + Math.cos(ang) * rb.radius;
      const rz = rb.hz + Math.sin(ang * 1.5) * (rb.radius * 0.72);
      const groundY = getTerrainBaseHeight(rx, rz);

      if (moving) {
        const hopSin = Math.abs(Math.sin(cycle * Math.PI * 2.72));
        rb.group.position.set(rx, groundY + hopSin * 0.16, rz);
        const dx = -Math.sin(ang) * rb.radius;
        const dz = Math.cos(ang * 1.5) * 1.5 * (rb.radius * 0.72);
        rb.group.rotation.y = Math.atan2(dx, dz);
        rb.frontLegs.rotation.x = -hopSin * 0.55;
        rb.backLegs.rotation.x = hopSin * 0.65;
        rb.headPiv.rotation.x = -0.08;
      } else {
        rb.group.position.set(rx, groundY, rz);
        rb.frontLegs.rotation.x = 0;
        rb.backLegs.rotation.x = 0;
        rb.headPiv.rotation.x = 0.22 + Math.sin(worldTime * 7.0 + rb.phase) * 0.08;
      }
    }

    // Elvefisk i Whispering Woods-elva
    for (let i = 0; i < ambientFish.length; i++) {
      const f = ambientFish[i];
      const s = Math.sin(worldTime * f.speed + f.phase);
      const c = Math.cos(worldTime * f.speed + f.phase);
      const fx = f.baseX + s * f.rangeX;
      const creekCenterZ = -78.0 + Math.sin(fx * 0.065) * 3.6;
      const fz = creekCenterZ + f.zOffset;
      const bedY = getTerrainBaseHeight(fx, creekCenterZ);
      f.group.position.set(fx, bedY + 0.12, fz);
      f.group.rotation.y = c >= 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
      if (f.tail) {
        f.tail.rotation.y = Math.sin(worldTime * 9.5 + f.phase) * 0.32;
      }
    }
  }

  // --- 6g. Dynamisk 2-PointLight Nærhets-Pool & Underjordisk Sone-Culling (0 allokeringer, 0 shader-rekompileringer!) ---
  const pooledWorldLightA = new THREE.PointLight(0xff842e, 2.2, 18, 2);
  const pooledWorldLightB = new THREE.PointLight(0xffa448, 1.2, 18, 2);
  scene.add(pooledWorldLightA);
  scene.add(pooledWorldLightB);
  const lightWorldPosTmp = new THREE.Vector3();
  const bestLightPosA = new THREE.Vector3();
  const bestLightPosB = new THREE.Vector3();

  function registerWorldVirtualLight(vLight) {
    if (!vLight) return;
    worldVirtualLights.push(vLight);
  }

  function updateWorldPerformanceAndLights(playerPos) {
    const px = playerPos.x;
    const py = playerPos.y;
    const pz = playerPos.z;

    // Skjul dype underjordiske/fjerne soner helt når spilleren er langt unna (sparer hundrevis av draw calls)
    mineGroup.visible = px > 66;
    catacombGroup.visible = px < -72;

    // Finn de 2 nærmeste virtuelle lyskildene til spilleren og flytt pooledWorldLightA & B dit
    let bestIdxA = -1;
    let bestIdxB = -1;
    let bestDistA = Infinity;
    let bestDistB = Infinity;

    for (let i = 0; i < worldVirtualLights.length; i++) {
      const vl = worldVirtualLights[i];
      const obj = vl.anchor || vl.group;
      if (!obj || vl.intensity <= 0.01) continue;
      obj.getWorldPosition(lightWorldPosTmp);
      const dx = lightWorldPosTmp.x - px;
      const dy = (lightWorldPosTmp.y - py) * 1.6;
      const dz = lightWorldPosTmp.z - pz;
      const dSq = dx * dx + dy * dy + dz * dz;
      if (dSq > 55 * 55) continue;

      if (dSq < bestDistA) {
        bestDistB = bestDistA;
        bestIdxB = bestIdxA;
        bestLightPosB.copy(bestLightPosA);
        bestDistA = dSq;
        bestIdxA = i;
        bestLightPosA.copy(lightWorldPosTmp);
      } else if (dSq < bestDistB) {
        bestDistB = dSq;
        bestIdxB = i;
        bestLightPosB.copy(lightWorldPosTmp);
      }
    }

    if (bestIdxA >= 0) {
      const a = worldVirtualLights[bestIdxA];
      pooledWorldLightA.position.copy(bestLightPosA);
      pooledWorldLightA.color.setHex(a.colorHex || 0xff9a44);
      pooledWorldLightA.distance = a.distance || 18;
      pooledWorldLightA.decay = a.decay || 2;
      pooledWorldLightA.intensity = a.intensity;
    } else {
      pooledWorldLightA.intensity = 0;
    }

    if (bestIdxB >= 0) {
      const b = worldVirtualLights[bestIdxB];
      pooledWorldLightB.position.copy(bestLightPosB);
      pooledWorldLightB.color.setHex(b.colorHex || 0xff9a44);
      pooledWorldLightB.distance = b.distance || 18;
      pooledWorldLightB.decay = b.decay || 2;
      pooledWorldLightB.intensity = b.intensity;
    } else {
      pooledWorldLightB.intensity = 0;
    }
  }

  // --- 6h. Statisk geometri-batching (slår sammen hundrevis av statiske klippe-, gjerde-, grav-, bro- og skinne-meshes til få draw calls!) ---
  batchStaticMeshesInGroup(staticDesertPropsGroup, { sectorSize: 110 });
  batchStaticMeshesInGroup(bridgeGroup);
  batchStaticMeshesInGroup(canyonGroup, { protectedObjects: new Set([mineGroup]) });
  batchStaticMeshesInGroup(mineGroup, {
    protectedObjects: new Set([mineMapGroup, ...mineBarricades.map((b) => b.group)])
  });
  batchStaticMeshesInGroup(graveyardGroup, {
    protectedObjects: new Set([...proceduralDeadTreeGroups, ...chapelAltarHitMeshes])
  });
  batchStaticMeshesInGroup(catacombGroup, {
    protectedObjects: new Set([hellfirePedestalGroup])
  });
  batchStaticMeshesInGroup(railwayGroup, {
    protectedObjects: new Set([trainAnchor, ...trainGatlingHitMeshes])
  });
  batchStaticMeshesInGroup(silverpineGroup);
  batchStaticMeshesInGroup(fortGroup, { protectedObjects: new Set([fortFire]) });
  batchStaticMeshesInGroup(brimstoneGroup);
  batchStaticMeshesInGroup(stoneCircleGroup, { protectedObjects: new Set([...wendigoAltarHitMeshes]) });

  return {
    sky, skySunVec, dayEnvRT, nightEnvRT,
    hdrState, mountHDRIEnvironments,
    hemiLight, sunLight, sunMesh,
    rockColliders,
    structureWallColliders,
    goldPickups,
    goldHitMeshes,
    moonstoneTotems,
    moonstoneHitMeshes,
    fortStrongboxes,
    fortStrongboxHitMeshes,
    brimstoneTotems,
    brimstoneTotemHitMeshes,
    ancientRunes,
    ancientRuneHitMeshes,
    wendigoAltarHitMeshes,
    wendigoObeliskOrb,
    wendigoAltarWorldPos,
    mineBarricades,
    barricadeHitMeshes,
    mineMapPickup,
    hellfirePickup,
    trainAnchor,
    mountTrainAsset,
    mountWorldBotanicalAndWildlifeAssets,
    updateAmbientWildlife,
    registerWorldVirtualLight,
    updateWorldPerformanceAndLights,
    trainGatlingHitMeshes,
    trainGatlingBeacon,
    gatlingHalo,
    chapelAltarHitMeshes,
    bloodChaliceOrb,
    mineGroup,
    chapelGroup,
    catacombGroup,
    windUniforms,
    updateGodRays,
    refreshRegionSigns,
    createWesternSign, createDetailedBarrel, createWagonWheel,
    createFramedWindow, addWeatheredFacadePlanks, createWoodenFence,
    createCarvedBatwingDoor,
    campfireFlameMeshes, campfireLight, campfireEmberMat
  };
}
