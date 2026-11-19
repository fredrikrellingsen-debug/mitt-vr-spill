import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

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

  // 1. Bevar ekte, innebygde PBR-teksturer (f.eks. fra Tripo3D, Meshy eller eksterne PBR-modeller),
  //    men tving glatt shading og realistisk matt hud/pels-ruhet så ingenting ser ut som blank plast!
  if (hasEmbeddedPBR) {
    configureEmbeddedTextures(mat, maxAniso);
    if (opts.tintColorHex) {
      mat.color.multiply(new THREE.Color(opts.tintColorHex));
    }
    if (isCharacter) {
      mat.flatShading = false;
      const isAlphaHairCard =
        mat.alphaTest > 0 ||
        mat.transparent ||
        mName.includes('hair') ||
        mName.includes('beard') ||
        mName.includes('brow') ||
        mName.includes('lash');
      const embeddedMetal = (origMat.metalness !== undefined && origMat.metalness >= 0.45) || mName.includes('horseshoe');
      const isEmbeddedLeather = mName.includes('saddle') || mName.includes('bridle') || mName.includes('leather');
      if (isAlphaHairCard) {
        mat.metalness = 0.0;
        mat.roughness = THREE.MathUtils.clamp(mat.roughness ?? 0.82, 0.76, 0.90);
        mat.envMapIntensity = 0.30;
        mat.side = THREE.DoubleSide;
      } else if (embeddedMetal) {
        mat.metalness = Math.max(origMat.metalness ?? 0.85, 0.80);
        mat.roughness = THREE.MathUtils.clamp(mat.roughness ?? 0.34, 0.25, 0.40);
        mat.envMapIntensity = 1.15;
      } else if (isEmbeddedLeather) {
        mat.metalness = 0.04;
        mat.roughness = THREE.MathUtils.clamp(mat.roughness ?? 0.66, 0.62, 0.72);
        mat.envMapIntensity = 0.44;
      } else {
        mat.metalness = 0.0;
        mat.roughness = mat.roughnessMap
          ? THREE.MathUtils.clamp(mat.roughness ?? 0.94, 0.86, 0.98)
          : THREE.MathUtils.clamp(mat.roughness ?? 0.88, 0.84, 0.92);
        mat.envMapIntensity = 0.35;
        if (!mat.normalMap && !mat.bumpMap && M && M.gltfOrganicNoiseBumpTex) {
          mat.bumpMap = M.gltfOrganicNoiseBumpTex;
          mat.bumpScale = 0.016;
        }
      }
      mat.needsUpdate = true;
      if (M && M.applyCharacterRimLighting && !isAlphaHairCard) {
        M.applyCharacterRimLighting(mat);
      }
    } else {
      mat.envMapIntensity = isWeapon ? 1.35 : 0.45;
    }
    return mat;
  }

  // 2. For modeller uten innebygde teksturer: oppgrader med riktige PBR-verdier og teksturer uten plastglans
  if (node && node.geometry) {
    ensureGeometryUVs(node.geometry, isBuilding ? 1.6 : (isWeapon ? 2.8 : 3.0));
  }

  const isGlowing =
    mName.includes('glow') ||
    mName.includes('ember') ||
    mName.includes('flame') ||
    (mat.emissive && (mat.emissive.r > 0.32 || mat.emissive.g > 0.32 || mat.emissive.b > 0.32));

  if (isGlowing) {
    mat.flatShading = false;
    mat.emissiveIntensity = Math.max(mat.emissiveIntensity || 1.0, 2.2);
    return mat;
  }

  const isEye = mName.includes('eye') || mName.includes('pupil') || mName.includes('sclera') || mName.includes('iris') || mName.includes('cornea');
  if (isEye) {
    mat.flatShading = false;
    mat.metalness = 0.02;
    mat.roughness = 0.22;
    mat.envMapIntensity = 0.75;
    return mat;
  }

  const isTeethOrClaw = mName.includes('tooth') || mName.includes('teeth') || mName.includes('fang') || mName.includes('claw');
  if (isTeethOrClaw) {
    mat.flatShading = false;
    mat.metalness = 0.0;
    mat.roughness = 0.58;
    mat.envMapIntensity = 0.40;
    return mat;
  }

  // Kun faktisk metall (revolver/våpen, spenner, sporer, beslag, kjelestål) skal ha lav roughness (0.25–0.38) og høy metalness
  const isMetallic =
    (mat.metalness !== undefined && mat.metalness >= 0.45) ||
    mName.includes('steel') ||
    mName.includes('iron') ||
    mName.includes('brass') ||
    mName.includes('gold') ||
    mName.includes('silver') ||
    mName.includes('copper') ||
    mName.includes('metal') ||
    mName.includes('boiler') ||
    mName.includes('buckle') ||
    mName.includes('spur') ||
    mName.includes('ferrule') ||
    mName.includes('shear');

  if (isMetallic) {
    if (M && M.gltfLeatherRoughTex) {
      mat.roughnessMap = M.gltfLeatherRoughTex;
    }
    mat.metalness = Math.max(mat.metalness ?? 0.88, 0.84);
    mat.roughness = THREE.MathUtils.clamp(mat.roughness ?? 0.30, 0.25, 0.38);
    mat.envMapIntensity = isWeapon ? 1.45 : 1.25;
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
    mat.flatShading = false;
    if (M && M.gltfShingleTex) {
      const lum = mat.color.r * 0.299 + mat.color.g * 0.587 + mat.color.b * 0.114;
      if (lum < 0.24) mat.color.lerp(WHITE_COLOR, 0.26);
      mat.map = M.gltfShingleTex;
      mat.normalMap = M.gltfShingleNormalTex;
      mat.normalScale = new THREE.Vector2(0.85, -0.85);
      mat.roughnessMap = M.gltfShingleRoughTex;
    }
    mat.metalness = 0.0;
    mat.roughness = THREE.MathUtils.clamp(mat.roughness ?? 0.88, 0.82, 0.92);
    mat.envMapIntensity = 0.38;
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
    mat.flatShading = false;
    if (M && M.gltfSandstoneTex) {
      const lum = mat.color.r * 0.299 + mat.color.g * 0.587 + mat.color.b * 0.114;
      if (lum < 0.28) mat.color.lerp(WHITE_COLOR, 0.24);
      mat.map = M.gltfSandstoneTex;
      mat.normalMap = M.gltfSandstoneNormalTex;
      mat.normalScale = new THREE.Vector2(0.92, -0.92);
      mat.roughnessMap = M.gltfSandstoneRoughTex;
    }
    mat.metalness = 0.0;
    mat.roughness = 0.90;
    mat.envMapIntensity = 0.35;
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
    mName.includes('stock') ||
    mName.includes('tiller')
  ) {
    mat.flatShading = false;
    if (M && M.gltfWoodTex) {
      const lum = mat.color.r * 0.299 + mat.color.g * 0.587 + mat.color.b * 0.114;
      if (lum < 0.26) {
        mat.color.lerp(WHITE_COLOR, isWeapon ? 0.24 : 0.26);
      }
      mat.map = M.gltfWoodTex;
      mat.normalMap = M.gltfWoodNormalTex;
      const ns = mName.includes('counter') || isWeapon ? 0.42 : 0.78;
      mat.normalScale = new THREE.Vector2(ns, -ns);
      mat.roughnessMap = M.gltfWoodRoughTex;
    }
    mat.metalness = 0.0;
    mat.roughness = isWeapon ? 0.68 : THREE.MathUtils.clamp(mat.roughness ?? 0.86, 0.82, 0.92);
    mat.envMapIntensity = isWeapon ? 0.55 : 0.38;
    if (isBuilding && M && M.applyAntiTilingSurfaceShader) {
      M.applyAntiTilingSurfaceShader(mat, 0.15, 0.9);
    }
    return mat;
  }

  // Karakterer, fiender og dyr: tving flatShading = false og eksakt PBR-ruhet for lær, stoff og pels/hud!
  if (isCharacter && M) {
    mat.flatShading = false;

    const isLeather =
      mName.includes('leather') ||
      mName.includes('boot') ||
      mName.includes('holster') ||
      mName.includes('belt') ||
      mName.includes('bridle') ||
      mName.includes('cinch') ||
      mName.includes('apron');

    const isCloth =
      mName.includes('trouser') ||
      mName.includes('pants') ||
      mName.includes('vest') ||
      mName.includes('shirt') ||
      mName.includes('bandana') ||
      mName.includes('cloak') ||
      mName.includes('silk') ||
      mName.includes('wool') ||
      mName.includes('blanket') ||
      mName.includes('stetson') ||
      mName.includes('hat') ||
      mName.includes('cravat') ||
      mName.includes('tape') ||
      mName.includes('linen') ||
      mName.includes('canvas') ||
      mName.includes('duster') ||
      mName.includes('robe') ||
      mName.includes('hood') ||
      mName.includes('collar') ||
      mName.includes('pincushion');

    if (isLeather) {
      // Lær (sal, støvler, belte, hylster): roughness 0.62–0.72, metalness 0.05
      if (M.gltfLeatherTex) {
        const lum = mat.color.r * 0.299 + mat.color.g * 0.587 + mat.color.b * 0.114;
        if (lum < 0.18) mat.color.lerp(WHITE_COLOR, 0.24);
        mat.map = M.gltfLeatherTex;
      }
      if (M.gltfLeatherNormalTex) {
        mat.normalMap = M.gltfLeatherNormalTex;
        mat.normalScale = new THREE.Vector2(0.36, -0.36);
      }
      if (M.gltfLeatherRoughTex) {
        mat.roughnessMap = M.gltfLeatherRoughTex;
      }
      mat.metalness = 0.05;
      mat.roughness = THREE.MathUtils.clamp(mat.roughness ?? 0.66, 0.62, 0.72);
      mat.envMapIntensity = 0.42;
    } else if (isCloth) {
      // Stoff/klær: roughness 0.88–0.95, metalness 0.0
      if (M.gltfOrganicNoiseBumpTex) {
        mat.bumpMap = M.gltfOrganicNoiseBumpTex;
        mat.bumpScale = 0.012;
      }
      mat.metalness = 0.0;
      mat.roughness = THREE.MathUtils.clamp(mat.roughness ?? 0.91, 0.88, 0.95);
      mat.envMapIntensity = 0.30;
    } else {
      // Hestepels, dyrepels, man, hale og hud: roughness 0.84–0.92, metalness 0.0, envMapIntensity 0.35 + støy-bumpMap
      if (M.gltfOrganicNoiseBumpTex) {
        mat.bumpMap = M.gltfOrganicNoiseBumpTex;
        mat.bumpScale = 0.018;
      }
      mat.metalness = 0.0;
      mat.roughness = THREE.MathUtils.clamp(mat.roughness ?? 0.88, 0.84, 0.92);
      mat.envMapIntensity = 0.35;
    }

    mat.needsUpdate = true;
    if (M.applyCharacterRimLighting) {
      M.applyCharacterRimLighting(mat);
    }
    return mat;
  }

  mat.flatShading = false;
  mat.metalness = Math.min(mat.metalness ?? 0.0, 0.05);
  mat.roughness = Math.max(mat.roughness ?? 0.85, 0.82);
  mat.envMapIntensity = 0.38;
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
    if (node.isSkinnedMesh && node.geometry) {
      // Gi SkinnedMesh en fast, romslig boundingSphere både på geometri og SkinnedMesh-instans
      // slik at Three.js r170 slipper dyr CPU computeBoundingSphere() og kutter alt utenfor synsfeltet lynraskt!
      if (!node.geometry.boundingSphere) {
        node.geometry.computeBoundingSphere();
      }
      if (node.geometry.boundingSphere && !node.geometry.userData._expandedBounds) {
        node.geometry.boundingSphere = node.geometry.boundingSphere.clone();
        node.geometry.boundingSphere.radius = Math.max(node.geometry.boundingSphere.radius * 1.85, 3.5);
        node.geometry.userData._expandedBounds = true;
      }
      const baseRadius = (node.geometry.boundingSphere && node.geometry.boundingSphere.radius) || 3.5;
      node.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1.0, 0), Math.max(baseRadius, 3.5));
      node.frustumCulled = true;
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

    // Deaktiver dyr alpha-discard skyggekasting på hår-/øyenbrynskort (selve kroppen/hodet kaster allerede skygge)
    const primaryMat = Array.isArray(node.material) ? node.material[0] : node.material;
    if (primaryMat && (primaryMat.alphaTest > 0 || primaryMat.transparent)) {
      node.castShadow = false;
      node.userData.neverCastShadow = true;
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

  // Slå sammen alle statiske bygningsdeler per materiale til få WebGL draw calls (uten å røre interaktive objekter)
  batchStaticMeshesInGroup(holder);

  return holder;
}

function flipNonIndexedTriangleWinding(geo) {
  const attrs = geo.attributes;
  for (const name of Object.keys(attrs)) {
    const attr = attrs[name];
    if (!attr || !attr.array) continue;
    const itemSize = attr.itemSize;
    const arr = attr.array;
    const triCount = Math.floor(attr.count / 3);
    for (let t = 0; t < triCount; t++) {
      const i1 = (t * 3 + 1) * itemSize;
      const i2 = (t * 3 + 2) * itemSize;
      for (let k = 0; k < itemSize; k++) {
        const tmp = arr[i1 + k];
        arr[i1 + k] = arr[i2 + k];
        arr[i2 + k] = tmp;
      }
    }
    attr.needsUpdate = true;
  }
}

/**
 * Slår sammen statiske, ugjennomsiktige Mesh-noder i en gruppe per (materiale, castShadow, receiveShadow, valgfri sektor)
 * til ett enkelt Mesh per bøtte. Reduserer hundrevis av individuelle draw calls til en håndfull uten visuelt tap.
 */
export function batchStaticMeshesInGroup(rootGroup, options = {}) {
  if (!rootGroup) return 0;
  const { protectedObjects = null, sectorSize = 0 } = options;

  rootGroup.updateMatrixWorld(true);
  const invRootMat = new THREE.Matrix4().copy(rootGroup.matrixWorld).invert();
  const buckets = new Map();

  function walk(obj) {
    if (!obj) return;
    if (protectedObjects && protectedObjects.has(obj)) return;
    const ud = obj.userData;
    if (
      ud &&
      (ud.neverBatch ||
        ud.updateSign ||
        ud.refreshPoster ||
        ud.hellfirePickup ||
        ud.mineMapPickup ||
        ud.barricadeEntry ||
        ud.goldEntry)
    ) {
      return;
    }

    if (
      obj.isMesh &&
      !obj.isInstancedMesh &&
      !obj.isSkinnedMesh &&
      obj.visible &&
      obj.geometry &&
      obj.geometry.attributes &&
      obj.geometry.attributes.position &&
      obj.material &&
      !Array.isArray(obj.material) &&
      !obj.material.transparent
    ) {
      const mat = obj.material;
      const cast = !!obj.castShadow;
      const recv = !!obj.receiveShadow;
      let sectorKey = '0,0';
      if (sectorSize > 0) {
        const e = obj.matrixWorld.elements;
        const sx = Math.floor(e[12] / sectorSize);
        const sz = Math.floor(e[14] / sectorSize);
        sectorKey = `${sx},${sz}`;
      }
      const key = `${mat.uuid}|${cast ? 1 : 0}|${recv ? 1 : 0}|${sectorKey}`;
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { mat, cast, recv, items: [] };
        buckets.set(key, bucket);
      }
      bucket.items.push(obj);
    }

    const children = obj.children;
    if (children && children.length > 0) {
      for (let i = 0; i < children.length; i++) {
        walk(children[i]);
      }
    }
  }

  walk(rootGroup);

  let mergedDrawsSaved = 0;
  const relMat = new THREE.Matrix4();

  for (const bucket of buckets.values()) {
    if (bucket.items.length < 2) continue;
    const wantVertexColor = !!bucket.mat.vertexColors;
    const geos = [];
    const validMeshes = [];

    for (let i = 0; i < bucket.items.length; i++) {
      const m = bucket.items[i];
      let g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      const posAttr = g.attributes.position;
      if (!posAttr || posAttr.count === 0) {
        g.dispose();
        continue;
      }
      if (posAttr.itemSize !== 3) {
        const fixedPos = new Float32Array(posAttr.count * 3);
        for (let v = 0; v < posAttr.count; v++) {
          fixedPos[v * 3] = posAttr.getX(v);
          fixedPos[v * 3 + 1] = posAttr.getY(v);
          fixedPos[v * 3 + 2] = posAttr.getZ(v);
        }
        g.setAttribute('position', new THREE.BufferAttribute(fixedPos, 3));
      }

      if (!g.attributes.normal) {
        g.computeVertexNormals();
      } else if (g.attributes.normal.itemSize !== 3) {
        g.deleteAttribute('normal');
        g.computeVertexNormals();
      }

      if (!g.attributes.uv) {
        ensureGeometryUVs(g, 1.0);
      } else if (g.attributes.uv.itemSize !== 2) {
        const oldUv = g.attributes.uv;
        const fixedUv = new Float32Array(posAttr.count * 2);
        for (let v = 0; v < posAttr.count; v++) {
          fixedUv[v * 2] = oldUv.getX(v);
          fixedUv[v * 2 + 1] = oldUv.getY(v);
        }
        g.setAttribute('uv', new THREE.BufferAttribute(fixedUv, 2));
      }

      if (wantVertexColor) {
        const colAttr = g.attributes.color;
        const fixedCol = new Float32Array(posAttr.count * 3);
        if (colAttr) {
          for (let v = 0; v < posAttr.count; v++) {
            fixedCol[v * 3] = colAttr.getX(v);
            fixedCol[v * 3 + 1] = colAttr.getY(v);
            fixedCol[v * 3 + 2] = colAttr.getZ(v);
          }
        } else {
          fixedCol.fill(1.0);
        }
        g.setAttribute('color', new THREE.BufferAttribute(fixedCol, 3));
      }

      // Fjern alle øvrige attributter slik at mergeGeometries alltid har 100 % identisk attributtsett
      for (const attrName of Object.keys(g.attributes)) {
        if (
          attrName !== 'position' &&
          attrName !== 'normal' &&
          attrName !== 'uv' &&
          !(wantVertexColor && attrName === 'color')
        ) {
          g.deleteAttribute(attrName);
        }
      }
      g.morphAttributes = {};
      g.clearGroups();

      relMat.multiplyMatrices(invRootMat, m.matrixWorld);
      g.applyMatrix4(relMat);
      if (relMat.determinant() < 0) {
        flipNonIndexedTriangleWinding(g);
      }

      geos.push(g);
      validMeshes.push(m);
    }

    if (geos.length < 2) {
      for (let i = 0; i < geos.length; i++) geos[i].dispose();
      continue;
    }

    let mergedGeo = null;
    try {
      mergedGeo = mergeGeometries(geos, false);
    } catch (_err) {
      mergedGeo = null;
    }
    for (let i = 0; i < geos.length; i++) geos[i].dispose();

    if (!mergedGeo) continue;
    mergedGeo.computeBoundingBox();
    mergedGeo.computeBoundingSphere();

    const mergedMesh = new THREE.Mesh(mergedGeo, bucket.mat);
    mergedMesh.castShadow = bucket.cast;
    mergedMesh.receiveShadow = bucket.recv;
    rootGroup.add(mergedMesh);

    for (let i = 0; i < validMeshes.length; i++) {
      const vm = validMeshes[i];
      if (vm.parent) vm.parent.remove(vm);
    }
    mergedDrawsSaved += validMeshes.length - 1;
  }

  return mergedDrawsSaved;
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
