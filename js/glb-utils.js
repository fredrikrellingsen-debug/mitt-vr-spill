import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const PROCEDURAL_NEG_Z_MATS = new Set([
  'BanditDusterCoat',
  'BearGrizzleFur',
  'MalakorOuterCloak',
  'VampireDarkCloak',
  'DeerBuckskinCoat',
  'WolfCharcoalFur',
  'HorseCoat'
]);

const PROCEDURAL_POS_Z_MATS = new Set([
  'TailorWoolTrousers',
  'CharcoalCanvasTrousers'
]);

// Glatter ut fasetterte split-vertex normaler (f.eks. på skjelettanimerte dyremodeller) innenfor 68 grader uten å røre skinIndex/skinWeight
export function smoothSplitVertexNormals(geometry, creaseCos = 0.37) {
  if (!geometry || !geometry.attributes || !geometry.attributes.position) return;
  if (!geometry.attributes.normal) geometry.computeVertexNormals();
  const pos = geometry.attributes.position;
  const norm = geometry.attributes.normal;
  const count = pos.count;
  if (count > 24000) return;

  const buckets = new Map();
  for (let i = 0; i < count; i++) {
    const kx = Math.round(pos.getX(i) * 10000);
    const ky = Math.round(pos.getY(i) * 10000);
    const kz = Math.round(pos.getZ(i) * 10000);
    const key = `${kx}_${ky}_${kz}`;
    let list = buckets.get(key);
    if (!list) {
      list = [];
      buckets.set(key, list);
    }
    list.push(i);
  }

  const out = new Float32Array(norm.array.length);
  for (const list of buckets.values()) {
    if (list.length === 1) {
      const idx = list[0];
      out[idx * 3] = norm.getX(idx);
      out[idx * 3 + 1] = norm.getY(idx);
      out[idx * 3 + 2] = norm.getZ(idx);
      continue;
    }
    for (let a = 0; a < list.length; a++) {
      const i = list[a];
      const nix = norm.getX(i);
      const niy = norm.getY(i);
      const niz = norm.getZ(i);
      let sx = nix;
      let sy = niy;
      let sz = niz;
      for (let b = 0; b < list.length; b++) {
        if (a === b) continue;
        const j = list[b];
        const njx = norm.getX(j);
        const njy = norm.getY(j);
        const njz = norm.getZ(j);
        if (nix * njx + niy * njy + niz * njz >= creaseCos) {
          sx += njx;
          sy += njy;
          sz += njz;
        }
      }
      const len = Math.hypot(sx, sy, sz) || 1;
      out[i * 3] = sx / len;
      out[i * 3 + 1] = sy / len;
      out[i * 3 + 2] = sz / len;
    }
  }
  geometry.setAttribute('normal', new THREE.BufferAttribute(out, 3));
}

// Genererer rene, sømløse boks-projiserte UV-koordinater for eksterne .glb-modeller som mangler TEXCOORD_0
export function ensureGeometryUVs(geometry, repeatsAcrossBounds = 2.4) {
  if (!geometry || !geometry.attributes || !geometry.attributes.position) return;
  if (geometry.attributes.uv) return;

  geometry.computeBoundingBox();
  const bb = geometry.boundingBox;
  const spanX = Math.max(1e-5, bb.max.x - bb.min.x);
  const spanY = Math.max(1e-5, bb.max.y - bb.min.y);
  const spanZ = Math.max(1e-5, bb.max.z - bb.min.z);
  const maxSpan = Math.max(spanX, spanY, spanZ);
  const invScale = repeatsAcrossBounds / maxSpan;

  const pos = geometry.attributes.position;
  const norm = geometry.attributes.normal;
  const count = pos.count;
  const uvs = new Float32Array(count * 2);

  for (let i = 0; i < count; i++) {
    const px = (pos.getX(i) - bb.min.x) * invScale;
    const py = (pos.getY(i) - bb.min.y) * invScale;
    const pz = (pos.getZ(i) - bb.min.z) * invScale;

    let nx = 0;
    let ny = 1;
    let nz = 0;
    if (norm) {
      nx = Math.abs(norm.getX(i));
      ny = Math.abs(norm.getY(i));
      nz = Math.abs(norm.getZ(i));
    }
    if (nx >= ny && nx >= nz) {
      uvs[i * 2] = pz;
      uvs[i * 2 + 1] = py;
    } else if (nz >= nx && nz >= ny) {
      uvs[i * 2] = px;
      uvs[i * 2 + 1] = py;
    } else {
      uvs[i * 2] = px;
      uvs[i * 2 + 1] = pz;
    }
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
}

function configureEmbeddedTextures(mat, maxAnisotropy) {
  const srgbSlots = ['map', 'emissiveMap'];
  const linearSlots = ['normalMap', 'roughnessMap', 'metalnessMap', 'aoMap'];
  for (let i = 0; i < srgbSlots.length; i++) {
    const t = mat[srgbSlots[i]];
    if (t) {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = maxAnisotropy;
    }
  }
  for (let i = 0; i < linearSlots.length; i++) {
    const t = mat[linearSlots[i]];
    if (t) {
      t.colorSpace = THREE.LinearSRGBColorSpace;
      t.anisotropy = maxAnisotropy;
    }
  }
}

const WHITE_COLOR = new THREE.Color(0xffffff);

export function enhanceOrPreserveGLBMaterial(origMat, node, M, opts = {}) {
  if (!origMat) return origMat;
  const {
    isCharacter = false,
    isBuilding = false,
    isWeapon = false
  } = opts;
  const maxAniso = (M && M.maxAnisotropy) || 8;
  const mName = (origMat.name || '').toLowerCase();

  // Spesialtilfelle: vindusglass på bygninger
  if (isBuilding && mName === 'windowglass' && M && M.windowMat) {
    return M.windowMat;
  }

  const mat = origMat.clone();
  const hasVertexColors = !!(node && node.geometry && node.geometry.attributes && node.geometry.attributes.color);
  if (hasVertexColors) {
    mat.vertexColors = true;
  }

  const hasEmbeddedPBR = !!(
    origMat.map ||
    origMat.normalMap ||
    origMat.roughnessMap ||
    origMat.metalnessMap
  );

  // 1. Bevar ekte, innebygde PBR-teksturer (f.eks. fra Tripo3D, Meshy eller Quaternius PBR-modeller) 100 % urørt!
  if (hasEmbeddedPBR) {
    configureEmbeddedTextures(mat, maxAniso);
    if (opts.tintColorHex) {
      mat.color.multiply(new THREE.Color(opts.tintColorHex));
    }
    mat.envMapIntensity = Math.max(mat.envMapIntensity || 1.0, isWeapon ? 1.4 : 1.15);
    if (isCharacter && M && M.applyCharacterRimLighting) {
      M.applyCharacterRimLighting(mat);
    }
    return mat;
  }

  // 2. For modeller uten innebygde teksturer: oppgrader flate farger med fotografiske 1K PBR-teksturer fra ./assets/textures/
  if (node && node.geometry) {
    ensureGeometryUVs(node.geometry, isBuilding ? 1.6 : (isWeapon ? 2.8 : 2.6));
  }

  const isGlowing =
    mName.includes('glow') ||
    mName.includes('ember') ||
    mName.includes('flame') ||
    (mat.emissive && (mat.emissive.r > 0.32 || mat.emissive.g > 0.32 || mat.emissive.b > 0.32));

  if (isGlowing) {
    mat.emissiveIntensity = Math.max(mat.emissiveIntensity || 1.0, 2.2);
    return mat;
  }

  const isEyeOrTeeth = mName.includes('eye') || mName.includes('pupil') || mName.includes('tooth') || mName.includes('teeth') || mName.includes('fang');
  if (isEyeOrTeeth) {
    mat.roughness = Math.min(mat.roughness ?? 0.25, 0.18);
    mat.envMapIntensity = 1.55;
    return mat;
  }

  const isMetallic =
    (mat.metalness !== undefined && mat.metalness >= 0.45) ||
    mName.includes('steel') ||
    mName.includes('iron') ||
    mName.includes('brass') ||
    mName.includes('gold') ||
    mName.includes('silver') ||
    mName.includes('copper') ||
    mName.includes('metal') ||
    mName.includes('armor') ||
    mName.includes('boiler');

  if (isMetallic) {
    if (M && M.gltfLeatherRoughTex) {
      mat.roughnessMap = M.gltfLeatherRoughTex;
    }
    mat.metalness = Math.max(mat.metalness ?? 0.85, 0.82);
    mat.roughness = THREE.MathUtils.clamp(mat.roughness ?? 0.28, 0.14, 0.42);
    mat.envMapIntensity = isWeapon ? 1.6 : 1.45;
    if (isCharacter && M && M.applyCharacterRimLighting) {
      M.applyCharacterRimLighting(mat);
    }
    return mat;
  }

  if (
    mName.includes('shingle') ||
    mName.includes('roof') ||
    mName.includes('darktimber')
  ) {
    if (M && M.gltfShingleTex) {
      mat.color.lerp(WHITE_COLOR, 0.38);
      mat.map = M.gltfShingleTex;
      mat.normalMap = M.gltfShingleNormalTex;
      mat.normalScale = new THREE.Vector2(0.85, -0.85);
      mat.roughnessMap = M.gltfShingleRoughTex;
    }
    mat.envMapIntensity = 0.95;
    if (isBuilding && M && M.applyAntiTilingSurfaceShader) {
      M.applyAntiTilingSurfaceShader(mat, 0.14, 0.55);
    }
    return mat;
  }

  if (
    mName.includes('stone') ||
    mName.includes('brick') ||
    mName.includes('obsidian') ||
    mName.includes('rock')
  ) {
    if (M && M.gltfSandstoneTex) {
      mat.color.lerp(WHITE_COLOR, 0.32);
      mat.map = M.gltfSandstoneTex;
      mat.normalMap = M.gltfSandstoneNormalTex;
      mat.normalScale = new THREE.Vector2(0.92, -0.92);
      mat.roughnessMap = M.gltfSandstoneRoughTex;
    }
    mat.envMapIntensity = 0.95;
    if (isBuilding && M && M.applyAntiTilingSurfaceShader) {
      M.applyAntiTilingSurfaceShader(mat, 0.15, 0.85);
    }
    return mat;
  }

  if (
    isBuilding ||
    mName.includes('wood') ||
    mName.includes('walnut') ||
    mName.includes('siding') ||
    mName.includes('pine') ||
    mName.includes('plank') ||
    mName.includes('counter') ||
    mName.includes('shutter') ||
    mName.includes('stock')
  ) {
    if (M && M.gltfWoodTex) {
      const lum = mat.color.r * 0.299 + mat.color.g * 0.587 + mat.color.b * 0.114;
      if (lum < 0.26) {
        mat.color.lerp(WHITE_COLOR, isWeapon ? 0.26 : 0.28);
      }
      mat.map = M.gltfWoodTex;
      mat.normalMap = M.gltfWoodNormalTex;
      const ns = mName.includes('counter') || isWeapon ? 0.42 : 0.78;
      mat.normalScale = new THREE.Vector2(ns, -ns);
      mat.roughnessMap = M.gltfWoodRoughTex;
    }
    mat.envMapIntensity = mName.includes('counter') ? 1.2 : 0.98;
    if (isBuilding && M && M.applyAntiTilingSurfaceShader) {
      M.applyAntiTilingSurfaceShader(mat, 0.15, 0.9);
    }
    return mat;
  }

  // Karakterer, fiender og dyr uten egne innebygde teksturer: gi ekte lær-/pels-/stoff-tekstur + Fresnel rim-light
  if (isCharacter && M) {
    const isSkinOrShirt =
      mName.includes('skin') ||
      mName.includes('face') ||
      mName.includes('shirt') ||
      mName.includes('linen') ||
      mName.includes('cravat') ||
      mName.includes('silk');

    if (!isSkinOrShirt && M.gltfLeatherTex) {
      // Løft mørke lineære farger (f.eks. Quaternius lineær baseColor) litt så lær-/pels-albedo gir rik metning
      const lum = mat.color.r * 0.299 + mat.color.g * 0.587 + mat.color.b * 0.114;
      mat.color.lerp(WHITE_COLOR, lum < 0.12 ? 0.30 : 0.40);
      mat.map = M.gltfLeatherTex;
    }
    if (M.gltfLeatherNormalTex) {
      mat.normalMap = M.gltfLeatherNormalTex;
      const ns = isSkinOrShirt ? 0.14 : 0.38;
      mat.normalScale = new THREE.Vector2(ns, -ns);
    }
    if (M.gltfLeatherRoughTex) {
      mat.roughnessMap = M.gltfLeatherRoughTex;
    }
    mat.roughness = THREE.MathUtils.clamp(mat.roughness ?? 0.76, 0.42, 0.92);
    mat.envMapIntensity = 1.08;
    if (M.applyCharacterRimLighting) {
      M.applyCharacterRimLighting(mat);
    }
    return mat;
  }

  mat.envMapIntensity = Math.max(mat.envMapIntensity || 1.0, 1.05);
  return mat;
}

export function cloneGLTFSceneSafe(gltfScene) {
  let hasSkinned = false;
  gltfScene.traverse((n) => {
    if (n.isSkinnedMesh) hasSkinned = true;
  });
  const cloned = hasSkinned ? SkeletonUtils.clone(gltfScene) : gltfScene.clone(true);
  return { cloned, hasSkinned };
}

function detectModelForwardSignZ(model) {
  let proceduralHint = 0;

  model.traverse((n) => {
    if (n.isMesh && n.material) {
      const mats = Array.isArray(n.material) ? n.material : [n.material];
      for (let i = 0; i < mats.length; i++) {
        const mn = (mats[i] && mats[i].name) || '';
        if (PROCEDURAL_NEG_Z_MATS.has(mn)) proceduralHint = -1;
        else if (PROCEDURAL_POS_Z_MATS.has(mn)) proceduralHint = 1;
      }
    }
  });

  if (proceduralHint !== 0) return proceduralHint;

  // Standard glTF 2.0 / Tripo3D / Meshy / Quaternius fremover-retning er alltid +Z
  return 1;
}

// Re-mapper anonyme UUID-baserte animasjonsspor én gang per GLTF-mal
export function prepareGLTFAnimationsOnce(gltf, prefix) {
  if (!gltf || !gltf.scene) return;
  if (!gltf.userData) gltf.userData = {};
  if (gltf.userData._preparedPlugAndPlay) return;
  gltf.userData._preparedPlugAndPlay = true;

  let autoIdx = 0;
  const uuidToName = new Map();
  gltf.scene.traverse((node) => {
    if (!node.name) {
      node.name = `${prefix}_node_${autoIdx++}`;
    }
    uuidToName.set(node.uuid, node.name);
  });

  if (gltf.animations && gltf.animations.length > 0) {
    for (let a = 0; a < gltf.animations.length; a++) {
      const clip = gltf.animations[a];
      if (!clip || !clip.tracks) continue;
      for (let t = 0; t < clip.tracks.length; t++) {
        const track = clip.tracks[t];
        const dotIdx = track.name.indexOf('.');
        if (dotIdx > 0) {
          const targetId = track.name.slice(0, dotIdx);
          const mapped = uuidToName.get(targetId);
          if (mapped) {
            track.name = mapped + track.name.slice(dotIdx);
          }
        }
      }
    }
  }
}

/**
 * Plug-and-Play normalisering for karakterer, fiender, NPC-er og dyr (inkl. Tripo3D / Meshy / Quaternius).
 * Måler med Box3, skalerer til targetHeight, plasserer føttene nøyaktig på y = 0, sentrerer X/Z,
 * bevarer innebygde PBR-teksturer, legger på Fresnel rim-light og setter castShadow/receiveShadow.
 */
export function instantiateCharacterGLB(gltf, M, options = {}) {
  const {
    prefix = 'char',
    targetHeight = 1.82,
    desiredForwardZ = -1,
    tintColorHex = null,
    castShadow = true,
    receiveShadow = true
  } = options;

  if (gltf && gltf.scene && (!gltf.userData || !gltf.userData._normalsSmoothed)) {
    if (!gltf.userData) gltf.userData = {};
    gltf.userData._normalsSmoothed = true;
    gltf.scene.traverse((n) => {
      if (!n.isMesh || !n.geometry) return;
      const origM = Array.isArray(n.material) ? n.material[0] : n.material;
      if (origM && origM.normalMap) return;
      smoothSplitVertexNormals(n.geometry, 0.37);
    });
  }

  prepareGLTFAnimationsOnce(gltf, prefix);
  const { cloned: model, hasSkinned } = cloneGLTFSceneSafe(gltf.scene);

  const matCache = new Map();
  model.traverse((node) => {
    if (!node.isMesh) return;
    if (node.isSkinnedMesh) {
      // Forhindrer at SkinnedMesh med skalert bein-hierarki kuttes av frustum culling på kloss hold
      node.frustumCulled = false;
    }
    node.castShadow = castShadow;
    node.receiveShadow = receiveShadow;

    if (Array.isArray(node.material)) {
      node.material = node.material.map((m) => {
        if (!m) return m;
        let up = matCache.get(m);
        if (!up) {
          up = enhanceOrPreserveGLBMaterial(m, node, M, { isCharacter: true, tintColorHex });
          matCache.set(m, up);
        }
        return up;
      });
    } else if (node.material) {
      let up = matCache.get(node.material);
      if (!up) {
        up = enhanceOrPreserveGLBMaterial(node.material, node, M, { isCharacter: true, tintColorHex });
        matCache.set(node.material, up);
      }
      node.material = up;
    }
  });

  const group = new THREE.Group();
  const wrapper = new THREE.Group();
  wrapper.add(model);
  group.add(wrapper);

  wrapper.updateMatrixWorld(true);
  const rawBox = new THREE.Box3().setFromObject(model, true);
  if (!rawBox.isEmpty()) {
    const nativeFwd = detectModelForwardSignZ(model);
    if (nativeFwd !== desiredForwardZ) {
      wrapper.rotation.y = Math.PI;
      wrapper.updateMatrixWorld(true);
    }

    const orientedBox = new THREE.Box3().setFromObject(wrapper, true);
    const rawH = orientedBox.max.y - orientedBox.min.y;
    if (rawH > 1e-4 && targetHeight > 0) {
      const scaleFactor = targetHeight / rawH;
      wrapper.scale.setScalar(scaleFactor);
      wrapper.updateMatrixWorld(true);
    }

    const finalBox = new THREE.Box3().setFromObject(wrapper, true);
    const cx = (finalBox.min.x + finalBox.max.x) * 0.5;
    const cz = (finalBox.min.z + finalBox.max.z) * 0.5;
    wrapper.position.x -= cx;
    wrapper.position.z -= cz;
    wrapper.position.y -= finalBox.min.y;
    wrapper.updateMatrixWorld(true);
  }

  group.userData.animRoot = model;
  group.userData.normalizedWrapper = wrapper;
  group.userData.hasSkinnedMesh = hasSkinned;
  if (gltf.animations && gltf.animations.length > 0) {
    group.userData.animations = gltf.animations;
  }

  return { group, wrapper, model, hasSkinned };
}

/**
 * Plug-and-Play normalisering for bygninger og lokomotiv (saloon.glb, tailor.glb, gunsmith.glb, train.glb).
 * Måler med Box3, normaliserer kun hvis ekstern modell avviker fra forventet spillhøyde, setter y = 0,
 * aktiverer skygger og bevarer innebygde PBR-teksturer (eller oppgraderer med fotografiske PBR-kart).
 */
export function instantiateBuildingGLB(gltfScene, M, options = {}) {
  const {
    targetHeight = 0,
    centerXZ = false
  } = options;

  const { cloned: model } = cloneGLTFSceneSafe(gltfScene);
  const matCache = new Map();

  model.traverse((node) => {
    if (!node.isMesh || !node.material) return;
    const orig = node.material;
    const mName = (orig.name || '').toLowerCase();
    if (mName === 'windowglass') {
      node.material = M.windowMat;
      node.castShadow = false;
      node.receiveShadow = true;
      return;
    }
    node.castShadow = true;
    node.receiveShadow = true;

    let up = matCache.get(orig);
    if (!up) {
      up = enhanceOrPreserveGLBMaterial(orig, node, M, { isBuilding: true });
      matCache.set(orig, up);
    }
    node.material = up;
  });

  const holder = new THREE.Group();
  holder.add(model);
  holder.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(model, true);
  if (!box.isEmpty()) {
    const h = box.max.y - box.min.y;
    // Hvis en ekstern modell fra Tripo3D/Meshy er lagt inn med annen skala, normaliser til targetHeight
    if (targetHeight > 0 && h > 1e-4 && (h < targetHeight * 0.75 || h > targetHeight * 1.30)) {
      const s = targetHeight / h;
      model.scale.multiplyScalar(s);
      holder.updateMatrixWorld(true);
      box.setFromObject(model, true);
    }
    if (centerXZ) {
      model.position.x -= (box.min.x + box.max.x) * 0.5;
      model.position.z -= (box.min.z + box.max.z) * 0.5;
    }
    // Plasser fundamentet nøyaktig på y = 0 hvis modellen svever eller stikker dypt under bakken
    if (Math.abs(box.min.y) > 0.04) {
      model.position.y -= box.min.y;
    }
  }

  return holder;
}

/**
 * Plug-and-Play normalisering for første-persons og VR-våpen (revolver.glb, shotgun.glb, rifle.glb osv.).
 * Bevarer eksisterende MuzzlePoint/Cylinder/Hammer på egne modeller, og skalerer/orienterer automatisk
 * eksterne Tripo3D/Meshy-våpen til riktig spillengde langs -Z.
 */
export function instantiateWeaponGLB(gltfScene, M, options = {}) {
  const {
    targetLength = 0.36,
    onMaterialCloned = null
  } = options;

  const { cloned: model } = cloneGLTFSceneSafe(gltfScene);
  const matCache = new Map();

  model.traverse((node) => {
    if (!node.isMesh || !node.material) return;
    node.castShadow = false;
    node.receiveShadow = false;
    const orig = node.material;
    let up = matCache.get(orig);
    if (!up) {
      up = enhanceOrPreserveGLBMaterial(orig, node, M, { isWeapon: true });
      if (onMaterialCloned) onMaterialCloned(up, orig);
      matCache.set(orig, up);
    }
    node.material = up;
  });

  const hasNativeMuzzle = !!(model.getObjectByName('MuzzlePoint') || model.getObjectByName('muzzle'));
  const holder = new THREE.Group();
  holder.add(model);

  if (!hasNativeMuzzle) {
    // Ekstern Plug-and-Play våpenmodell (f.eks. fra Tripo3D / Meshy): orienter lengste akse langs -Z og skaler til targetLength
    holder.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model, true);
    if (!box.isEmpty()) {
      const sx = box.max.x - box.min.x;
      const sy = box.max.y - box.min.y;
      const sz = box.max.z - box.min.z;
      if (sx > sz && sx >= sy) {
        model.rotation.y = Math.PI * 0.5;
      } else if (sy > sz && sy > sx) {
        model.rotation.x = -Math.PI * 0.5;
      }
      holder.updateMatrixWorld(true);
      box.setFromObject(model, true);
      const lenZ = Math.max(1e-4, box.max.z - box.min.z);
      const scale = targetLength / lenZ;
      model.scale.multiplyScalar(scale);
      holder.updateMatrixWorld(true);
      box.setFromObject(model, true);

      const cx = (box.min.x + box.max.x) * 0.5;
      const cy = (box.min.y + box.max.y) * 0.5;
      // Plasser bakre skjefte nær håndgrepet (z ~ +0.10) og løpet fremover mot -Z
      model.position.x -= cx;
      model.position.y -= cy;
      model.position.z += (0.11 - box.max.z);
      holder.updateMatrixWorld(true);
      box.setFromObject(model, true);

      const autoMuzzle = new THREE.Object3D();
      autoMuzzle.name = 'MuzzlePoint';
      autoMuzzle.position.set(0, box.max.y * 0.65, box.min.z - 0.01);
      holder.add(autoMuzzle);
    }
  }

  return holder;
}
