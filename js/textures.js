import * as THREE from 'three';

export function createSeededRng(seed) {
  let s = seed >>> 0;
  return function nextRng() {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Beholdes eksportert for bakoverkompatibilitet
export function createNormalCanvasFromHeight(bumpCanvas, strength = 2.0) {
  const w = bumpCanvas.width;
  const h = bumpCanvas.height;
  const srcCtx = bumpCanvas.getContext('2d');
  const srcData = srcCtx.getImageData(0, 0, w, h).data;
  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = w;
  normalCanvas.height = h;
  const dstCtx = normalCanvas.getContext('2d');
  const dstImg = dstCtx.createImageData(w, h);
  const dstData = dstImg.data;
  const len = w * h;
  const heights = new Float32Array(len);
  const inv255 = 1.0 / 255.0;
  for (let i = 0, p = 0; i < len; i++, p += 4) heights[i] = srcData[p] * inv255;

  for (let y = 0; y < h; y++) {
    const ym1 = ((y - 1 + h) % h) * w;
    const y0 = y * w;
    const yp1 = ((y + 1) % h) * w;
    for (let x = 0; x < w; x++) {
      const xm1 = (x - 1 + w) % w;
      const xp1 = (x + 1) % w;
      const dX = (heights[ym1 + xp1] + 2 * heights[y0 + xp1] + heights[yp1 + xp1]) -
                 (heights[ym1 + xm1] + 2 * heights[y0 + xm1] + heights[yp1 + xm1]);
      const dY = (heights[yp1 + xm1] + 2 * heights[yp1 + x] + heights[yp1 + xp1]) -
                 (heights[ym1 + xm1] + 2 * heights[ym1 + x] + heights[ym1 + xp1]);
      const nx = -dX * strength;
      const ny = dY * strength;
      const invLen = 1.0 / Math.sqrt(nx * nx + ny * ny + 1.0);
      const outIdx = (y0 + x) << 2;
      dstData[outIdx] = (nx * invLen * 127.5 + 127.5) | 0;
      dstData[outIdx + 1] = (ny * invLen * 127.5 + 127.5) | 0;
      dstData[outIdx + 2] = (invLen * 127.5 + 127.5) | 0;
      dstData[outIdx + 3] = 255;
    }
  }
  dstCtx.putImageData(dstImg, 0, 0);
  return normalCanvas;
}

export function createSoftRadialGlowTexture(rCol, gCol, bCol) {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 1, 32, 32, 31);
  grad.addColorStop(0.0, `rgba(${rCol},${gCol},${bCol},1.0)`);
  grad.addColorStop(0.32, `rgba(${rCol},${gCol},${bCol},0.62)`);
  grad.addColorStop(0.7, `rgba(${rCol},${gCol},${bCol},0.16)`);
  grad.addColorStop(1.0, `rgba(${rCol},${gCol},${bCol},0.0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Subtil verdensrom-mikrodetalj og anti-flising for plankevegger, tak og murverk (Quest-optimalisert)
export function applyAntiTilingSurfaceShader(mat, macroStrength = 0.14, dustRise = 0.85) {
  if (!mat || mat.userData._hasAntiTile) return mat;
  mat.userData._hasAntiTile = true;
  const cacheTag = `western_antitile_${Math.round(macroStrength * 100)}_${Math.round(dustRise * 100)}`;
  mat.customProgramCacheKey = () => cacheTag;
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSurfaceWorldPos;')
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvSurfaceWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;'
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSurfaceWorldPos;')
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        {
          float macroA = sin(vSurfaceWorldPos.x * 0.63 + vSurfaceWorldPos.z * 0.51 + vSurfaceWorldPos.y * 0.87);
          float macroB = cos(vSurfaceWorldPos.x * 1.91 - vSurfaceWorldPos.y * 2.43 + vSurfaceWorldPos.z * 1.37);
          float microG = sin(vSurfaceWorldPos.x * 19.7 + vSurfaceWorldPos.y * 27.3 + vSurfaceWorldPos.z * 17.1);
          float weatherMod = 1.0 + (macroA * 0.6 + macroB * 0.4) * ${macroStrength.toFixed(3)} + microG * 0.032;
          float groundDust = smoothstep(${dustRise.toFixed(2)}, 0.02, vSurfaceWorldPos.y) * 0.16;
          diffuseColor.rgb = mix(diffuseColor.rgb * weatherMod, vec3(0.58, 0.43, 0.28), groundDust);
        }`
      );
  };
  return mat;
}

export function initTexturesAndMaterials(maxAnisotropy = 8) {
  const texLoader = new THREE.TextureLoader();
  const loadPromises = [];

  function loadPhotoTex(url, repeatX, repeatY, isColor = true, flipY = true) {
    let resolveFn;
    const p = new Promise((resolve) => {
      resolveFn = resolve;
    });
    loadPromises.push(p);

    const clones = [];
    const tex = texLoader.load(
      url,
      (loaded) => {
        for (let i = 0; i < clones.length; i++) {
          const c = clones[i];
          c.source = loaded.source;
          c.needsUpdate = true;
        }
        resolveFn(loaded);
      },
      undefined,
      (err) => {
        console.warn(`[WesternVR] Kunne ikke laste tekstur ${url}:`, err);
        resolveFn(null);
      }
    );
    tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.LinearSRGBColorSpace;
    tex.flipY = flipY;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.anisotropy = maxAnisotropy;
    tex.userData._clones = clones;
    return tex;
  }

  function cloneRepeatTex(baseTex, repeatX, repeatY, isColor = true) {
    const c = baseTex.clone();
    c.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.LinearSRGBColorSpace;
    c.wrapS = THREE.RepeatWrapping;
    c.wrapT = THREE.RepeatWrapping;
    c.repeat.set(repeatX, repeatY);
    c.anisotropy = maxAnisotropy;
    if (baseTex.image) {
      c.needsUpdate = true;
    } else if (baseTex.userData && baseTex.userData._clones) {
      baseTex.userData._clones.push(c);
    }
    return c;
  }

  // --- Ekte 1K CC0 fotografiske PBR-tekstursett fra Poly Haven (./assets/textures/) ---
  // 1. Værbitt treverk (weathered_brown_planks)
  const sharedWoodTex = loadPhotoTex('./assets/textures/wood_diff.jpg', 2.2, 2.2, true, true);
  const sharedWoodNormalTex = loadPhotoTex('./assets/textures/wood_nor.jpg', 2.2, 2.2, false, true);
  const sharedWoodRoughTex = loadPhotoTex('./assets/textures/wood_rough.jpg', 2.2, 2.2, false, true);
  const sharedWoodBumpTex = sharedWoodRoughTex;

  // 2. Mørkt tømmer / takbord (dark_wooden_planks)
  const sharedRoofShingleTex = loadPhotoTex('./assets/textures/roof_diff.jpg', 3.0, 2.4, true, true);
  const sharedShingleNormalTex = loadPhotoTex('./assets/textures/roof_nor.jpg', 3.0, 2.4, false, true);
  const sharedShingleRoughTex = loadPhotoTex('./assets/textures/roof_rough.jpg', 3.0, 2.4, false, true);
  const sharedShingleBumpTex = sharedShingleRoughTex;

  // 3. Ørkensand med vindbølger (aerial_sand)
  const sharedDesertSandTex = loadPhotoTex('./assets/textures/sand_diff.jpg', 58, 58, true, true);
  const sharedDesertSandNormalTex = loadPhotoTex('./assets/textures/sand_nor.jpg', 58, 58, false, true);
  const sharedDesertSandRoughTex = loadPhotoTex('./assets/textures/sand_rough.jpg', 58, 58, false, true);
  const sharedDesertSandBumpTex = sharedDesertSandRoughTex;

  // 4. Pakket grus-/jordvei med småstein (dirt_floor)
  const sharedRoadSandTex = loadPhotoTex('./assets/textures/road_diff.jpg', 2.2, 16, true, true);
  const sharedRoadNormalTex = loadPhotoTex('./assets/textures/road_nor.jpg', 2.2, 16, false, true);
  const sharedRoadRoughTex = loadPhotoTex('./assets/textures/road_rough.jpg', 2.2, 16, false, true);
  const sharedRoadBumpTex = sharedRoadRoughTex;

  // 5. Sprukket sandstein & klippevegg (sandstone_cracks)
  const sharedSandstoneTex = loadPhotoTex('./assets/textures/sandstone_diff.jpg', 2.2, 2.2, true, true);
  const sharedSandstoneNormalTex = loadPhotoTex('./assets/textures/sandstone_nor.jpg', 2.2, 2.2, false, true);
  const sharedSandstoneRoughTex = loadPhotoTex('./assets/textures/sandstone_rough.jpg', 2.2, 2.2, false, true);
  const sharedSandstoneBumpTex = sharedSandstoneRoughTex;

  const sharedMesaTex = cloneRepeatTex(sharedSandstoneTex, 9.5, 4.5, true);
  const sharedMesaNormalTex = cloneRepeatTex(sharedSandstoneNormalTex, 9.5, 4.5, false);
  const sharedMesaRoughTex = cloneRepeatTex(sharedSandstoneRoughTex, 9.5, 4.5, false);
  const sharedMesaBumpTex = sharedMesaRoughTex;

  // 6. Dyp trebark til stammer og tømmerhytte (bark_brown_02)
  const sharedBarkTex = loadPhotoTex('./assets/textures/bark_diff.jpg', 2.0, 2.5, true, true);
  const sharedBarkNormalTex = loadPhotoTex('./assets/textures/bark_nor.jpg', 2.0, 2.5, false, true);
  const sharedBarkRoughTex = loadPhotoTex('./assets/textures/bark_rough.jpg', 2.0, 2.5, false, true);
  const sharedBarkBumpTex = sharedBarkRoughTex;

  // 7. Skogbunn og løvverk (forest_leaves_02)
  const sharedFoliageTex = loadPhotoTex('./assets/textures/foliage_diff.jpg', 2.5, 2.5, true, true);
  const sharedFoliageNormalTex = loadPhotoTex('./assets/textures/foliage_nor.jpg', 2.5, 2.5, false, true);
  const sharedFoliageRoughTex = loadPhotoTex('./assets/textures/foliage_rough.jpg', 2.5, 2.5, false, true);
  const sharedFoliageBumpTex = sharedFoliageRoughTex;

  // 8. Slitt western-lær til sal, hylster, vester og støvler (brown_leather)
  const sharedLeatherTex = loadPhotoTex('./assets/textures/leather_diff.jpg', 2.0, 2.0, true, true);
  const sharedLeatherNormalTex = loadPhotoTex('./assets/textures/leather_nor.jpg', 2.0, 2.0, false, true);
  const sharedLeatherRoughTex = loadPhotoTex('./assets/textures/leather_rough.jpg', 2.0, 2.0, false, true);

  // Dedikerte glTF-teksturer (flipY = false for glTF UV-standard) inkludert Albedo + Normal + Roughness!
  const gltfWoodTex = loadPhotoTex('./assets/textures/wood_diff.jpg', 1.6, 1.6, true, false);
  const gltfWoodNormalTex = loadPhotoTex('./assets/textures/wood_nor.jpg', 1.6, 1.6, false, false);
  const gltfWoodRoughTex = loadPhotoTex('./assets/textures/wood_rough.jpg', 1.6, 1.6, false, false);

  const gltfShingleTex = loadPhotoTex('./assets/textures/roof_diff.jpg', 2.2, 2.2, true, false);
  const gltfShingleNormalTex = loadPhotoTex('./assets/textures/roof_nor.jpg', 2.2, 2.2, false, false);
  const gltfShingleRoughTex = loadPhotoTex('./assets/textures/roof_rough.jpg', 2.2, 2.2, false, false);

  const gltfSandstoneTex = loadPhotoTex('./assets/textures/sandstone_diff.jpg', 1.8, 1.8, true, false);
  const gltfSandstoneNormalTex = loadPhotoTex('./assets/textures/sandstone_nor.jpg', 1.8, 1.8, false, false);
  const gltfSandstoneRoughTex = loadPhotoTex('./assets/textures/sandstone_rough.jpg', 1.8, 1.8, false, false);

  const gltfBarkTex = loadPhotoTex('./assets/textures/bark_diff.jpg', 1.8, 1.8, true, false);
  const gltfBarkNormalTex = loadPhotoTex('./assets/textures/bark_nor.jpg', 1.8, 1.8, false, false);
  const gltfBarkRoughTex = loadPhotoTex('./assets/textures/bark_rough.jpg', 1.8, 1.8, false, false);

  const gltfLeatherTex = loadPhotoTex('./assets/textures/leather_diff.jpg', 2.2, 2.2, true, false);
  const gltfLeatherNormalTex = loadPhotoTex('./assets/textures/leather_nor.jpg', 2.2, 2.2, false, false);
  const gltfLeatherRoughTex = loadPhotoTex('./assets/textures/leather_rough.jpg', 2.2, 2.2, false, false);

  // 9. Subtil prosedyrisk pels-/hud-støytekstur (bumpMap) så dyr og hud aldri ser ut som glatt plast
  const organicNoiseCanvas = document.createElement('canvas');
  organicNoiseCanvas.width = 256;
  organicNoiseCanvas.height = 256;
  {
    const nCtx = organicNoiseCanvas.getContext('2d');
    const nImg = nCtx.createImageData(256, 256);
    const nData = nImg.data;
    const rng = createSeededRng(918273);
    const g0 = new Float32Array(256 * 256);
    for (let i = 0; i < g0.length; i++) g0[i] = rng();
    for (let y = 0; y < 256; y++) {
      const ym1 = ((y - 1 + 256) & 255) * 256;
      const y0 = y * 256;
      const yp1 = ((y + 1) & 255) * 256;
      for (let x = 0; x < 256; x++) {
        const xm1 = (x - 1 + 256) & 255;
        const xp1 = (x + 1) & 255;
        // Fin 2-oktavs hårfiber-/porestøy (litt strekt langs Y for naturlig pelsretning)
        const fine = g0[y0 + x] * 0.48 + (g0[ym1 + x] + g0[yp1 + x]) * 0.19 + (g0[y0 + xm1] + g0[y0 + xp1]) * 0.07;
        const streak = Math.sin(x * 0.62 + Math.sin(y * 0.14) * 2.2) * 0.08;
        const val = Math.max(0, Math.min(255, Math.round((fine + streak) * 255)));
        const idx = (y0 + x) << 2;
        nData[idx] = val;
        nData[idx + 1] = val;
        nData[idx + 2] = val;
        nData[idx + 3] = 255;
      }
    }
    nCtx.putImageData(nImg, 0, 0);
  }
  const sharedOrganicNoiseBumpTex = new THREE.CanvasTexture(organicNoiseCanvas);
  sharedOrganicNoiseBumpTex.colorSpace = THREE.LinearSRGBColorSpace;
  sharedOrganicNoiseBumpTex.wrapS = THREE.RepeatWrapping;
  sharedOrganicNoiseBumpTex.wrapT = THREE.RepeatWrapping;
  sharedOrganicNoiseBumpTex.repeat.set(6, 6);
  sharedOrganicNoiseBumpTex.anisotropy = maxAnisotropy;

  const gltfOrganicNoiseBumpTex = new THREE.CanvasTexture(organicNoiseCanvas);
  gltfOrganicNoiseBumpTex.colorSpace = THREE.LinearSRGBColorSpace;
  gltfOrganicNoiseBumpTex.flipY = false;
  gltfOrganicNoiseBumpTex.wrapS = THREE.RepeatWrapping;
  gltfOrganicNoiseBumpTex.wrapT = THREE.RepeatWrapping;
  gltfOrganicNoiseBumpTex.repeat.set(5, 5);
  gltfOrganicNoiseBumpTex.anisotropy = maxAnisotropy;

  // 10. Fin krusnings-normalMap til vanntrauets vannoverflate (konsentriske ringer + svake vindkrusninger)
  const rippleHeightCanvas = document.createElement('canvas');
  rippleHeightCanvas.width = 256;
  rippleHeightCanvas.height = 256;
  {
    const wCtx = rippleHeightCanvas.getContext('2d');
    const wImg = wCtx.createImageData(256, 256);
    const wData = wImg.data;
    for (let y = 0; y < 256; y++) {
      for (let x = 0; x < 256; x++) {
        const u = (x / 256) * Math.PI * 2;
        const v = (y / 256) * Math.PI * 2;
        const dx1 = (x - 68) / 256;
        const dy1 = (y - 128) / 256;
        const r1 = Math.hypot(dx1, dy1);
        const dropRing = Math.sin(r1 * 56.0) * Math.exp(-r1 * 4.5) * 0.38;
        const windWave =
          Math.sin(u * 4.0 + v * 2.0) * 0.22 +
          Math.cos(u * 7.0 - v * 5.0) * 0.15 +
          Math.sin(u * 11.0 + v * 9.0) * 0.08;
        const hVal = Math.max(0, Math.min(255, Math.round((0.5 + (dropRing + windWave) * 0.45) * 255)));
        const idx = (y * 256 + x) << 2;
        wData[idx] = hVal;
        wData[idx + 1] = hVal;
        wData[idx + 2] = hVal;
        wData[idx + 3] = 255;
      }
    }
    wCtx.putImageData(wImg, 0, 0);
  }
  const sharedWaterRippleNormalTex = new THREE.CanvasTexture(createNormalCanvasFromHeight(rippleHeightCanvas, 1.65));
  sharedWaterRippleNormalTex.colorSpace = THREE.LinearSRGBColorSpace;
  sharedWaterRippleNormalTex.wrapS = THREE.RepeatWrapping;
  sharedWaterRippleNormalTex.wrapT = THREE.RepeatWrapping;
  sharedWaterRippleNormalTex.repeat.set(2.4, 1.2);
  sharedWaterRippleNormalTex.anisotropy = maxAnisotropy;

  // --- Subtil Fresnel «Rim Lighting» (onBeforeCompile) for alle karakterer, fiender og dyr ---
  const rimUniforms = {
    uRimColor: { value: new THREE.Color(0xffbe76) },
    uRimStrength: { value: 0.34 }
  };

  function applyCharacterRimLighting(mat) {
    if (!mat || mat.userData._hasRimLighting) return mat;
    if (!mat.isMeshStandardMaterial && !mat.isMeshPhysicalMaterial) return mat;
    mat.userData._hasRimLighting = true;
    mat.customProgramCacheKey = () => 'western_char_rim_v1';
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uRimColor = rimUniforms.uRimColor;
      shader.uniforms.uRimStrength = rimUniforms.uRimStrength;
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          '#include <common>\nuniform vec3 uRimColor;\nuniform float uRimStrength;'
        )
        .replace(
          '#include <opaque_fragment>',
          `{
            float rimNdotV = clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
            float rimFresnel = pow(1.0 - rimNdotV, 3.15);
            float rimSkyBias = clamp(normal.y * 0.45 + 0.65, 0.25, 1.0);
            outgoingLight += uRimColor * (rimFresnel * rimSkyBias * uRimStrength);
          }
          #include <opaque_fragment>`
        );
    };
    return mat;
  }

  // --- Felles fotografiske PBR-bygningsmaterialer (ekte matt værbitt treverk uten plastglans!) ---
  const woodWallMat = applyAntiTilingSurfaceShader(new THREE.MeshStandardMaterial({
    color: 0xc99b72,
    map: sharedWoodTex,
    normalMap: sharedWoodNormalTex,
    normalScale: new THREE.Vector2(0.88, 0.88),
    roughnessMap: sharedWoodRoughTex,
    roughness: 0.88,
    metalness: 0.0,
    envMapIntensity: 0.38
  }), 0.15, 0.95);

  const lightWoodMat = applyAntiTilingSurfaceShader(new THREE.MeshStandardMaterial({
    color: 0xd8b086,
    map: sharedWoodTex,
    normalMap: sharedWoodNormalTex,
    normalScale: new THREE.Vector2(0.72, 0.72),
    roughnessMap: sharedWoodRoughTex,
    roughness: 0.84,
    metalness: 0.0,
    envMapIntensity: 0.38
  }), 0.12, 0.75);

  const darkWoodMat = applyAntiTilingSurfaceShader(new THREE.MeshStandardMaterial({
    color: 0x825b3d,
    map: sharedRoofShingleTex,
    normalMap: sharedShingleNormalTex,
    normalScale: new THREE.Vector2(0.92, 0.92),
    roughnessMap: sharedShingleRoughTex,
    roughness: 0.88,
    metalness: 0.0,
    envMapIntensity: 0.36
  }), 0.14, 0.8);

  const weatheredPlankMatA = applyAntiTilingSurfaceShader(new THREE.MeshStandardMaterial({
    color: 0xb8875e,
    map: sharedWoodTex,
    normalMap: sharedWoodNormalTex,
    normalScale: new THREE.Vector2(0.96, 0.96),
    roughnessMap: sharedWoodRoughTex,
    roughness: 0.90,
    metalness: 0.0,
    envMapIntensity: 0.35
  }), 0.16, 0.9);

  const weatheredPlankMatB = applyAntiTilingSurfaceShader(new THREE.MeshStandardMaterial({
    color: 0xcfa379,
    map: sharedWoodTex,
    normalMap: sharedWoodNormalTex,
    normalScale: new THREE.Vector2(0.85, 0.85),
    roughnessMap: sharedWoodRoughTex,
    roughness: 0.86,
    metalness: 0.0,
    envMapIntensity: 0.36
  }), 0.14, 0.85);

  const shutterWoodMat = applyAntiTilingSurfaceShader(new THREE.MeshStandardMaterial({
    color: 0x657b5e,
    map: sharedWoodTex,
    normalMap: sharedWoodNormalTex,
    normalScale: new THREE.Vector2(0.72, 0.72),
    roughnessMap: sharedWoodRoughTex,
    roughness: 0.86,
    metalness: 0.0,
    envMapIntensity: 0.36
  }), 0.10, 0.5);

  const logTimberMat = applyAntiTilingSurfaceShader(new THREE.MeshStandardMaterial({
    color: 0xad7c52,
    map: sharedBarkTex,
    normalMap: sharedBarkNormalTex,
    normalScale: new THREE.Vector2(1.05, 1.05),
    roughnessMap: sharedBarkRoughTex,
    roughness: 0.91,
    metalness: 0.0,
    envMapIntensity: 0.34
  }), 0.15, 0.9);

  const roofMat = applyAntiTilingSurfaceShader(new THREE.MeshStandardMaterial({
    color: 0x8f6b4e,
    map: sharedRoofShingleTex,
    normalMap: sharedShingleNormalTex,
    normalScale: new THREE.Vector2(1.0, 1.0),
    roughnessMap: sharedShingleRoughTex,
    roughness: 0.89,
    metalness: 0.0,
    envMapIntensity: 0.36
  }), 0.14, 0.4);

  const wroughtIronMat = new THREE.MeshStandardMaterial({
    color: 0x353b42,
    roughnessMap: sharedLeatherRoughTex,
    metalness: 0.88,
    roughness: 0.34,
    envMapIntensity: 1.30
  });

  const polishedBrassMat = new THREE.MeshStandardMaterial({
    color: 0xe8bd62,
    roughnessMap: sharedLeatherRoughTex,
    metalness: 0.92,
    roughness: 0.26,
    envMapIntensity: 1.45
  });

  const stonePlinthMat = applyAntiTilingSurfaceShader(new THREE.MeshStandardMaterial({
    color: 0xa69482,
    map: sharedSandstoneTex,
    normalMap: sharedSandstoneNormalTex,
    normalScale: new THREE.Vector2(1.05, 1.05),
    roughnessMap: sharedSandstoneRoughTex,
    roughness: 0.91,
    metalness: 0.0,
    envMapIntensity: 0.35
  }), 0.15, 0.85);

  // Ekte fotografisk reflekterende vindusglass om dagen som gløder varmt gult innenfra om natten
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0x485e70,
    emissive: 0xffb347,
    emissiveIntensity: 0.16,
    roughness: 0.07,
    metalness: 0.28,
    envMapIntensity: 1.65
  });
  const darkInteriorMat = new THREE.MeshBasicMaterial({ color: 0x140b05 });

  const sharedParticleGlowTex = createSoftRadialGlowTexture(255, 240, 200);
  const sharedRedEyeGlowTex = createSoftRadialGlowTexture(255, 38, 38);
  const sharedSparkGlowTex = createSoftRadialGlowTexture(255, 215, 95);

  // Delt mørkere og bredere radial kontaktskygge-tekstur (plantet tungt i sanden)
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 64;
  shadowCanvas.height = 64;
  {
    const sCtx = shadowCanvas.getContext('2d');
    const sGrad = sCtx.createRadialGradient(32, 32, 2, 32, 32, 31);
    sGrad.addColorStop(0.0, 'rgba(8, 5, 2, 0.92)');
    sGrad.addColorStop(0.42, 'rgba(10, 6, 3, 0.68)');
    sGrad.addColorStop(0.76, 'rgba(12, 7, 4, 0.28)');
    sGrad.addColorStop(1.0, 'rgba(12, 7, 4, 0.0)');
    sCtx.fillStyle = sGrad;
    sCtx.fillRect(0, 0, 64, 64);
  }
  const sharedContactShadowTex = new THREE.CanvasTexture(shadowCanvas);
  sharedContactShadowTex.colorSpace = THREE.SRGBColorSpace;

  const sharedContactShadowMat = new THREE.MeshBasicMaterial({
    map: sharedContactShadowTex,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -2
  });
  const sharedContactShadowGeo = new THREE.PlaneGeometry(1, 1);
  sharedContactShadowGeo.rotateX(-Math.PI / 2);

  function createContactShadow(radiusX = 0.65, radiusZ = radiusX, yOffset = 0.026) {
    const mesh = new THREE.Mesh(sharedContactShadowGeo, sharedContactShadowMat);
    mesh.scale.set(radiusX * 2.35, 1, radiusZ * 2.35);
    mesh.position.y = yOffset;
    mesh.renderOrder = 1;
    return mesh;
  }

  // Delt myk røyksky-tekstur til kruttrøyk og tåke på Boot Hill
  const smokeCanvas = document.createElement('canvas');
  smokeCanvas.width = 64;
  smokeCanvas.height = 64;
  {
    const smCtx = smokeCanvas.getContext('2d');
    const smGrad = smCtx.createRadialGradient(32, 32, 2, 32, 32, 30);
    smGrad.addColorStop(0.0, 'rgba(232, 224, 212, 0.85)');
    smGrad.addColorStop(0.45, 'rgba(196, 186, 174, 0.46)');
    smGrad.addColorStop(0.8, 'rgba(155, 146, 138, 0.14)');
    smGrad.addColorStop(1.0, 'rgba(155, 146, 138, 0.0)');
    smCtx.fillStyle = smGrad;
    smCtx.fillRect(0, 0, 64, 64);
  }
  const sharedSmokePuffTex = new THREE.CanvasTexture(smokeCanvas);
  sharedSmokePuffTex.colorSpace = THREE.SRGBColorSpace;

  // Volumetrisk lysstråle-tekstur (God Rays)
  const rayCanvas = document.createElement('canvas');
  rayCanvas.width = 64;
  rayCanvas.height = 128;
  {
    const rCtx = rayCanvas.getContext('2d');
    const vGrad = rCtx.createLinearGradient(0, 0, 0, 128);
    vGrad.addColorStop(0.0, 'rgba(255, 240, 200, 0.0)');
    vGrad.addColorStop(0.18, 'rgba(255, 232, 185, 0.85)');
    vGrad.addColorStop(0.65, 'rgba(255, 215, 155, 0.36)');
    vGrad.addColorStop(1.0, 'rgba(255, 205, 140, 0.0)');
    rCtx.fillStyle = vGrad;
    rCtx.fillRect(0, 0, 64, 128);
    rCtx.globalCompositeOperation = 'destination-in';
    const hGrad = rCtx.createLinearGradient(0, 0, 64, 0);
    hGrad.addColorStop(0.0, 'rgba(0,0,0,0)');
    hGrad.addColorStop(0.5, 'rgba(0,0,0,1)');
    hGrad.addColorStop(1.0, 'rgba(0,0,0,0)');
    rCtx.fillStyle = hGrad;
    rCtx.fillRect(0, 0, 64, 128);
    rCtx.globalCompositeOperation = 'source-over';
  }
  const sharedGodRayTex = new THREE.CanvasTexture(rayCanvas);
  sharedGodRayTex.colorSpace = THREE.SRGBColorSpace;

  // Dempet, jordnær rødbrun sandstein (ingen knalloransje glans; matcher HDRI-fjellene)
  const crimsonRockMat = applyAntiTilingSurfaceShader(new THREE.MeshStandardMaterial({
    color: 0x8e6b56,
    map: sharedSandstoneTex,
    normalMap: sharedSandstoneNormalTex,
    normalScale: new THREE.Vector2(1.35, 1.35),
    roughnessMap: sharedSandstoneRoughTex,
    roughness: 0.92,
    metalness: 0.0,
    envMapIntensity: 0.34
  }), 0.18, 0.75);

  const darkGraveStoneMat = applyAntiTilingSurfaceShader(new THREE.MeshStandardMaterial({
    color: 0x6f7078,
    map: sharedSandstoneTex,
    normalMap: sharedSandstoneNormalTex,
    normalScale: new THREE.Vector2(1.15, 1.15),
    roughnessMap: sharedSandstoneRoughTex,
    roughness: 0.92,
    metalness: 0.0,
    envMapIntensity: 0.34
  }), 0.15, 0.65);

  const texturesReadyPromise = Promise.all(loadPromises);

  return {
    maxAnisotropy,
    texturesReadyPromise,
    rimUniforms,
    applyCharacterRimLighting,
    applyAntiTilingSurfaceShader,
    sharedWoodTex, sharedWoodBumpTex, sharedWoodNormalTex, sharedWoodRoughTex,
    sharedRoofShingleTex, sharedShingleBumpTex, sharedShingleNormalTex, sharedShingleRoughTex,
    sharedDesertSandTex, sharedDesertSandBumpTex, sharedDesertSandNormalTex, sharedDesertSandRoughTex,
    sharedRoadSandTex, sharedRoadBumpTex, sharedRoadNormalTex, sharedRoadRoughTex,
    sharedSandstoneTex, sharedSandstoneBumpTex, sharedSandstoneNormalTex, sharedSandstoneRoughTex,
    sharedMesaTex, sharedMesaBumpTex, sharedMesaNormalTex, sharedMesaRoughTex,
    sharedBarkTex, sharedBarkBumpTex, sharedBarkNormalTex, sharedBarkRoughTex,
    sharedFoliageTex, sharedFoliageBumpTex, sharedFoliageNormalTex, sharedFoliageRoughTex,
    sharedLeatherTex, sharedLeatherNormalTex, sharedLeatherRoughTex,
    sharedOrganicNoiseBumpTex, gltfOrganicNoiseBumpTex, sharedWaterRippleNormalTex,
    gltfWoodTex, gltfWoodNormalTex, gltfWoodRoughTex,
    gltfShingleTex, gltfShingleNormalTex, gltfShingleRoughTex,
    gltfSandstoneTex, gltfSandstoneNormalTex, gltfSandstoneRoughTex,
    gltfBarkTex, gltfBarkNormalTex, gltfBarkRoughTex,
    gltfLeatherTex, gltfLeatherNormalTex, gltfLeatherRoughTex,
    woodWallMat, lightWoodMat, darkWoodMat,
    weatheredPlankMatA, weatheredPlankMatB, shutterWoodMat,
    logTimberMat, roofMat, wroughtIronMat, polishedBrassMat,
    stonePlinthMat, crimsonRockMat, darkGraveStoneMat, windowMat, darkInteriorMat,
    sharedParticleGlowTex, sharedRedEyeGlowTex, sharedSparkGlowTex,
    sharedContactShadowTex, sharedContactShadowMat, createContactShadow,
    sharedSmokePuffTex, sharedGodRayTex
  };
}
