import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createSeededRng } from './textures.js';

// ============================================================================
// MAGICAL GRAPHICS 5.0 & CONTINENT-SCALE ATMOSPHERE ENGINE (2.4 KM x 2.4 KM)
// - Kinematisk UnrealBloom + Varm Golden-Hour / Magisk Natt Color Grading
//   (automatisk stereo-trygg bypass i WebXR VR, der alle 3D-shadere fortsatt kjører!)
// - Nordlys / Celestial Aurora Borealis GLSL-kuppel om kvelden og natten
// - Glitrende, rennende elv & oasevann med Fresnel-himmelrefleks og solglitter
// - Stjerneskudd, 340 GPU-ildfluer/solstøv, bioluminescerende krystallflora & dal-tåke
// - Sømløst 2 600 m x 2 600 m ytterkontinent rundt 920 m sentralterrenget
// - 36 Mystiske Veistein-Helligdommer ("Waystone Shrines") for 200-timers progresjon
// ============================================================================

export const TOTAL_WAYSTONE_SHRINES = 36;

export function initMagicalGraphicsAndContinent(ctx) {
  const {
    scene,
    camera,
    renderer,
    playerRig,
    playerState,
    storyState,
    controlSettings,
    M,
    W,
    getLang,
    getTerrainBaseHeight,
    getTerrainHeight,
    segmentPointDistance,
    collectedWaystoneIds,
    awardScaledGold,
    recordQuestKill,
    checkStoryProgression,
    saveCareerProgress,
    updateStatusUI,
    showFrontierToast,
    spawnSparkBurst,
    audio
  } = ctx;

  const magicRoot = new THREE.Group();
  magicRoot.name = 'MagicalGraphicsAndContinentRoot';
  scene.add(magicRoot);

  // ==========================================================================
  // 1. KINEMATISK POST-PROCESSING (UNREAL BLOOM + MAGISK COLOR GRADING)
  // ==========================================================================
  let composer = null;
  let bloomPass = null;
  let magicGradePass = null;
  let composerReady = false;

  const MagicalColorGradeShader = {
    uniforms: {
      tDiffuse: { value: null },
      uNight: { value: 0.0 },
      uBloodMoon: { value: 0.0 },
      uTime: { value: 0.0 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float uNight;
      uniform float uBloodMoon;
      uniform float uTime;
      varying vec2 vUv;

      void main() {
        vec4 texel = texture2D(tDiffuse, vUv);
        vec3 col = texel.rgb;

        // Rik filmatisk kontrast-kurve (myke høylys, dype mettede farger)
        float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
        vec3 saturated = mix(vec3(luma), col, mix(1.16, 1.24, uNight));

        // Golden Hour varme i høylys om dagen, fortryllet safir/fiolett glød om natten
        vec3 dayHighlights = vec3(1.045, 1.005, 0.945);
        vec3 dayShadows = vec3(0.96, 0.95, 1.03);
        vec3 nightHighlights = vec3(0.95, 1.02, 1.08);
        vec3 nightShadows = vec3(0.88, 0.93, 1.12);

        vec3 hiTint = mix(dayHighlights, nightHighlights, uNight);
        vec3 loTint = mix(dayShadows, nightShadows, uNight);
        if (uBloodMoon > 0.01) {
          hiTint = mix(hiTint, vec3(1.12, 0.88, 0.90), uBloodMoon * 0.65);
        }

        vec3 graded = saturated * mix(loTint, hiTint, smoothstep(0.08, 0.78, luma));

        // Svært subtil kinematisk kant-vignett som rammer inn horisonten uten å mørklegge HUD
        vec2 centered = vUv - 0.5;
        float vig = 1.0 - dot(centered, centered) * mix(0.24, 0.34, uNight);
        graded *= clamp(vig, 0.76, 1.0);

        gl_FragColor = vec4(max(graded, vec3(0.0)), texel.a);
      }
    `
  };

  function setupPostProcessing() {
    try {
      const size = renderer.getSize(new THREE.Vector2());
      const pr = renderer.getPixelRatio();
      const rt = new THREE.WebGLRenderTarget(
        Math.max(2, Math.floor(size.x * pr)),
        Math.max(2, Math.floor(size.y * pr)),
        {
          type: THREE.HalfFloatType,
          samples: 2
        }
      );
      composer = new EffectComposer(renderer, rt);
      composer.setPixelRatio(pr);
      composer.setSize(size.x, size.y);

      const renderPass = new RenderPass(scene, camera);
      composer.addPass(renderPass);

      // Høy terskel (0.84) sikrer at kun himmelglød, sol/måne, bål, lykter, krystaller og magi gløder silkemykt!
      bloomPass = new UnrealBloomPass(
        new THREE.Vector2(Math.max(2, Math.floor(size.x * 0.5)), Math.max(2, Math.floor(size.y * 0.5))),
        0.38,
        0.62,
        0.84
      );
      composer.addPass(bloomPass);

      const outputPass = new OutputPass();
      composer.addPass(outputPass);

      magicGradePass = new ShaderPass(MagicalColorGradeShader);
      composer.addPass(magicGradePass);

      composerReady = true;
    } catch (err) {
      console.warn('[WesternVR] Fallback til direkte WebGLRenderer:', err);
      composerReady = false;
    }
  }
  setupPostProcessing();

  function onResize() {
    if (!composerReady || !composer) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const pr = renderer.getPixelRatio();
    composer.setPixelRatio(pr);
    composer.setSize(w, h);
    if (bloomPass) {
      bloomPass.resolution.set(Math.max(2, Math.floor(w * 0.5)), Math.max(2, Math.floor(h * 0.5)));
    }
  }
  window.addEventListener('resize', onResize);

  // ==========================================================================
  // 2. SØMLØST 2 600 M x 2 600 M YTTERKONTINENT + 20 KOLOSSALE HORISONTFJELL
  // ==========================================================================
  function buildContinentOuterTerrain() {
    if (!W.desertGroundMat) return;
    // Dekk hele +-1300m (2.6 km x 2.6 km!) med utskåret hull (|x| < 454, |z| < 454) for null Z-fighting mot sentralterrenget (920x920)
    const outerGeo = new THREE.PlaneGeometry(2640, 2640, 240, 240);
    outerGeo.rotateX(-Math.PI / 2);
    const pos = outerGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      pos.setY(i, getTerrainBaseHeight(vx, vz));
    }
    const idxAttr = outerGeo.index;
    if (idxAttr) {
      const filtered = [];
      const arr = idxAttr.array;
      for (let i = 0; i < arr.length; i += 3) {
        const a = arr[i], b = arr[i + 1], c = arr[i + 2];
        const maxAx = Math.max(Math.abs(pos.getX(a)), Math.abs(pos.getX(b)), Math.abs(pos.getX(c)));
        const maxAz = Math.max(Math.abs(pos.getZ(a)), Math.abs(pos.getZ(b)), Math.abs(pos.getZ(c)));
        // Hvis alle tre hjørnene ligger godt innenfor 920x920 sentralterrenget (+-460m), hopp over trekanten
        if (maxAx < 454.0 && maxAz < 454.0) continue;
        filtered.push(a, b, c);
      }
      outerGeo.setIndex(filtered);
    }
    outerGeo.computeVertexNormals();

    const outerTerrainMesh = new THREE.Mesh(outerGeo, W.desertGroundMat);
    outerTerrainMesh.receiveShadow = true;
    magicRoot.add(outerTerrainMesh);

    // Kjempefjell & Snødekte tinder rundt hele ytterhorisonten (+-1 275 m .. +-1 380 m)
    const snowCapMat = new THREE.MeshStandardMaterial({
      color: 0xf2f6ff,
      roughness: 0.72,
      metalness: 0.04,
      emissive: 0x162238,
      emissiveIntensity: 0.18
    });
    const cliffMat = M.crimsonRockMat || M.stonePlinthMat;
    const rng = createSeededRng(994411);
    const peakCount = 28;
    for (let p = 0; p < peakCount; p++) {
      const ang = (p / peakCount) * Math.PI * 2 + (rng() - 0.5) * 0.14;
      // Hold en liten glipe rett mot solnedgangen i HDRI-horisonten for dramatisk lys
      const dist = 1285 + rng() * 95;
      const mx = Math.cos(ang) * dist;
      const mz = Math.sin(ang) * dist;
      const baseR = 85 + rng() * 55;
      const totalH = 95 + rng() * 85;
      const mGrp = new THREE.Group();
      const gy = getTerrainBaseHeight(mx, mz) - 2.0;

      const baseCone = new THREE.Mesh(
        new THREE.ConeGeometry(baseR, totalH, 9, 3),
        cliffMat
      );
      baseCone.position.y = totalH * 0.48;
      baseCone.rotation.y = rng() * Math.PI;
      mGrp.add(baseCone);

      // Snøkappe på høye nordlige/vestlige fjell og steinkrone på ørkenmesaer
      if (mz < 120 || totalH > 135) {
        const cap = new THREE.Mesh(
          new THREE.ConeGeometry(baseR * 0.40, totalH * 0.42, 9, 1),
          snowCapMat
        );
        cap.position.y = totalH * 0.78;
        cap.rotation.y = baseCone.rotation.y;
        mGrp.add(cap);
      }
      mGrp.position.set(mx, gy, mz);
      magicRoot.add(mGrp);
    }
  }

  // ==========================================================================
  // 3. NORDLYS / AURORA BOREALIS KUPPEL & STJERNESKUDD PÅ NATTEHIMMELEN
  // ==========================================================================
  const auroraUniforms = {
    uTime: { value: 0 },
    uOpacity: { value: 0 },
    uBloodMoon: { value: 0 }
  };

  const auroraGeo = new THREE.CylinderGeometry(720, 860, 290, 64, 16, true);
  const auroraMat = new THREE.ShaderMaterial({
    uniforms: auroraUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    fog: false,
    vertexShader: `
      uniform float uTime;
      varying vec2 vUv;
      varying float vWave;
      void main() {
        vUv = uv;
        vec3 pos = position;
        float sway = sin(uv.x * 18.84955 + uTime * 0.32) * 28.0 + cos(uv.x * 37.6991 + uTime * 0.52) * 14.0;
        pos.x += sway * uv.y;
        pos.z += cos(uv.x * 12.56637 - uTime * 0.27) * 24.0 * uv.y;
        vWave = sway;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uOpacity;
      uniform float uBloodMoon;
      varying vec2 vUv;
      varying float vWave;

      float hash12(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float noise2(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash12(i), hash12(i + vec2(1.0, 0.0)), f.x),
          mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), f.x),
          f.y
        );
      }

      void main() {
        if (uOpacity <= 0.005) discard;
        // Konsentrer sterkest nordlys i nord- og zenit-buen, mykt tonet ut ellers
        float curtainA = noise2(vec2(vUv.x * 26.0 + uTime * 0.09, vUv.y * 2.4 - uTime * 0.05));
        float curtainB = noise2(vec2(vUv.x * 52.0 - uTime * 0.14, vUv.y * 3.8 + uTime * 0.08));
        float streaks = pow(clamp(curtainA * 0.65 + curtainB * 0.55, 0.0, 1.0), 2.3);

        float vertFade = smoothstep(0.02, 0.28, vUv.y) * smoothstep(0.98, 0.36, vUv.y);
        float intensity = streaks * vertFade * uOpacity;

        vec3 emerald = vec3(0.16, 0.98, 0.68);
        vec3 cyanGlow = vec3(0.20, 0.78, 1.00);
        vec3 violetTop = vec3(0.76, 0.32, 0.98);
        vec3 auroraCol = mix(emerald, cyanGlow, clamp(curtainB, 0.0, 1.0));
        auroraCol = mix(auroraCol, violetTop, smoothstep(0.35, 0.85, vUv.y));

        if (uBloodMoon > 0.01) {
          auroraCol = mix(auroraCol, vec3(1.0, 0.18, 0.32), uBloodMoon * 0.8);
        }

        gl_FragColor = vec4(auroraCol * intensity * 1.15, intensity);
      }
    `
  });
  const auroraMesh = new THREE.Mesh(auroraGeo, auroraMat);
  auroraMesh.position.set(0, 215, 0);
  auroraMesh.frustumCulled = false;
  magicRoot.add(auroraMesh);

  // Magisk Sol-glorie (Golden Hour Sunburst) som følger spilleren så den alltid skinner i horisonten!
  const sunCoronaGroup = new THREE.Group();
  const sunInnerMat = new THREE.SpriteMaterial({
    map: M.sharedSparkGlowTex || M.sharedParticleGlowTex,
    color: 0xfff2cc,
    transparent: true,
    opacity: 0.78,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
    toneMapped: false
  });
  const sunOuterMat = new THREE.SpriteMaterial({
    map: M.sharedParticleGlowTex,
    color: 0xffaa4c,
    transparent: true,
    opacity: 0.44,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
    toneMapped: false
  });
  const sunInnerSprite = new THREE.Sprite(sunInnerMat);
  sunInnerSprite.scale.set(52, 52, 1);
  const sunOuterSprite = new THREE.Sprite(sunOuterMat);
  sunOuterSprite.scale.set(165, 115, 1);
  sunCoronaGroup.add(sunOuterSprite, sunInnerSprite);
  magicRoot.add(sunCoronaGroup);

  // Stjerneskudd på nattehimmelen (3 resirkulerte kometer, 0 allokeringer)
  const shootingStars = [];
  const cometGeo = new THREE.CylinderGeometry(0.05, 0.55, 22, 6);
  cometGeo.rotateZ(Math.PI / 2);
  for (let i = 0; i < 3; i++) {
    const cMat = new THREE.MeshBasicMaterial({
      color: i === 0 ? 0xfff2b2 : 0x8ef5ff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
      toneMapped: false
    });
    const mesh = new THREE.Mesh(cometGeo, cMat);
    mesh.visible = false;
    magicRoot.add(mesh);
    shootingStars.push({
      mesh,
      mat: cMat,
      active: false,
      timer: 4 + i * 7,
      life: 0,
      maxLife: 1.2,
      vx: 0,
      vy: 0,
      vz: 0
    });
  }

  // ==========================================================================
  // 4. GLITRENDE ELV GJENNOM WHISPERING WOODS & OASEDAMMER MED FRESNEL-VANN
  // ==========================================================================
  const waterUniforms = {
    uTime: { value: 0 },
    uNight: { value: 0 },
    uSunDir: { value: new THREE.Vector3(0.6, 0.25, 0.5).normalize() }
  };

  const magicalWaterMat = new THREE.ShaderMaterial({
    uniforms: waterUniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: `
      uniform float uTime;
      varying vec3 vWorldPos;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 p = position;
        vec4 wp = modelMatrix * vec4(p, 1.0);
        wp.y += sin(wp.x * 0.45 + uTime * 2.1) * 0.025 + cos(wp.z * 0.55 - uTime * 1.7) * 0.02;
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uNight;
      uniform vec3 uSunDir;
      varying vec3 vWorldPos;
      varying vec2 vUv;

      void main() {
        vec2 p = vWorldPos.xz;
        float w1 = sin(p.x * 0.95 - uTime * 2.4 + sin(p.y * 0.6) * 1.4);
        float w2 = cos(p.y * 1.35 + uTime * 1.9 - cos(p.x * 0.5) * 1.2);
        float w3 = sin((p.x + p.y) * 2.6 - uTime * 3.3);
        vec3 n = normalize(vec3((w1 + w3 * 0.5) * 0.14, 1.0, (w2 + w3 * 0.5) * 0.14));

        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        float fresnel = pow(1.0 - clamp(dot(n, viewDir), 0.0, 1.0), 2.8);

        vec3 shallowDay = vec3(0.11, 0.56, 0.64);
        vec3 deepDay = vec3(0.05, 0.28, 0.44);
        vec3 skyRefDay = vec3(0.98, 0.78, 0.55);

        vec3 shallowNight = vec3(0.06, 0.34, 0.46);
        vec3 deepNight = vec3(0.02, 0.10, 0.22);
        vec3 skyRefNight = vec3(0.30, 0.85, 0.78);

        vec3 waterBase = mix(
          mix(deepDay, shallowDay, 0.45 + 0.35 * w1),
          mix(deepNight, shallowNight, 0.45 + 0.35 * w1),
          uNight
        );
        vec3 skyRef = mix(skyRefDay, skyRefNight, uNight);
        vec3 col = mix(waterBase, skyRef, clamp(fresnel * 0.82, 0.08, 0.88));

        // Sol- og måneglitter som danser bortover vannskorpen!
        vec3 halfVec = normalize(uSunDir + viewDir);
        float spec = pow(max(dot(n, halfVec), 0.0), 96.0);
        vec3 specCol = mix(vec3(1.6, 1.25, 0.82), vec3(0.75, 1.35, 1.5), uNight);
        col += specCol * spec * 1.35;

        // Mykt skum langs elvebredden
        float bankDist = abs(vUv.y - 0.5) * 2.0;
        float foam = smoothstep(0.76, 0.98, bankDist + w2 * 0.08);
        col = mix(col, vec3(0.92, 0.96, 1.0), foam * 0.42);
        float alpha = smoothstep(1.0, 0.86, bankDist) * 0.88;

        gl_FragColor = vec4(col, alpha);
      }
    `
  });

  function buildSparklingFrontierRiversAndLakes() {
    // Svingende elv gjennom Whispering Woods og ut over kontinentet (x = -1180..+1180 rundt z = -78)
    const segX = 260;
    const riverGeo = new THREE.PlaneGeometry(2360, 8.8, segX, 4);
    riverGeo.rotateX(-Math.PI / 2);
    const rPos = riverGeo.attributes.position;
    for (let i = 0; i < rPos.count; i++) {
      const rx = rPos.getX(i);
      const localZ = rPos.getZ(i);
      const centerZ = -78.0 + Math.sin(rx * 0.065) * 3.6 + Math.sin(rx * 0.008) * 14.0 * Math.min(1, Math.max(0, (Math.abs(rx) - 90) / 140));
      const wz = centerZ + localZ;
      const bankY = getTerrainBaseHeight(rx, centerZ);
      rPos.setZ(i, wz);
      rPos.setY(i, bankY + 0.16);
    }
    riverGeo.computeVertexNormals();
    const riverMesh = new THREE.Mesh(riverGeo, magicalWaterMat);
    magicRoot.add(riverMesh);

    // Glitrende laguner i Dead Man's Oasis (-6, 168), Sanctuary Springs (-280, 277.8) og Emerald Mirage Lagoon (-880, 870)
    const lagoons = [
      { x: -6.0, z: 168.0, r: 9.5, yOff: 0.12 },
      { x: -280.0, z: 277.8, r: 4.6, yOff: 0.09 },
      { x: -880.0, z: 856.0, r: 18.5, yOff: 0.14 },
      { x: -275.0, z: -312.0, r: 10.5, yOff: 0.10 }
    ];
    lagoons.forEach((lg) => {
      const geo = new THREE.CircleGeometry(lg.r, 32);
      geo.rotateX(-Math.PI / 2);
      // Sett vUv.y = 0.5 i midten og 1.0 langs kanten for skumkant!
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) {
        const dx = uv.getX(i) - 0.5;
        const dy = uv.getY(i) - 0.5;
        const rad01 = Math.min(1, Math.hypot(dx, dy) * 2.0);
        uv.setXY(i, uv.getX(i), 0.5 + rad01 * 0.5);
      }
      const mesh = new THREE.Mesh(geo, magicalWaterMat);
      mesh.position.set(lg.x, getTerrainBaseHeight(lg.x, lg.z) + lg.yOff, lg.z);
      magicRoot.add(mesh);
    });
  }

  // ==========================================================================
  // 5. 340 GPU-ILDFLUER / SOLSTØV, DRIVENDE DALTÅKE & BIOLUMINESCERENDE FLORA
  // ==========================================================================
  const FIREFLY_COUNT = 340;
  const fireflyUniforms = {
    uTime: { value: 0 },
    uNight: { value: 0 },
    uPlayerPos: { value: new THREE.Vector3() },
    uGlowMap: { value: M.sharedSparkGlowTex || M.sharedParticleGlowTex }
  };

  function buildGPUFirefliesAndMist() {
    const rng = createSeededRng(424242);
    const offsets = new Float32Array(FIREFLY_COUNT * 3);
    const phases = new Float32Array(FIREFLY_COUNT * 3);
    for (let i = 0; i < FIREFLY_COUNT; i++) {
      const i3 = i * 3;
      offsets[i3] = (rng() - 0.5) * 96.0;
      offsets[i3 + 1] = 0.35 + rng() * 6.5;
      offsets[i3 + 2] = (rng() - 0.5) * 96.0;
      phases[i3] = rng() * Math.PI * 2;
      phases[i3 + 1] = 0.5 + rng() * 1.4;
      phases[i3 + 2] = rng(); // fargevariant (gull / smaragd / turkis)
    }
    const ffGeo = new THREE.BufferGeometry();
    ffGeo.setAttribute('position', new THREE.BufferAttribute(offsets, 3));
    ffGeo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 3));

    const ffMat = new THREE.ShaderMaterial({
      uniforms: fireflyUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute vec3 aPhase;
        uniform float uTime;
        uniform float uNight;
        uniform vec3 uPlayerPos;
        varying float vPulse;
        varying float vTint;
        void main() {
          // Wrap partiklene sømløst i en 96m x 96m boks rundt spilleren direkte på GPU!
          vec3 rel = position;
          rel.x += sin(uTime * 0.45 * aPhase.y + aPhase.x) * 2.8 + uTime * 0.35;
          rel.z += cos(uTime * 0.38 * aPhase.y + aPhase.x * 1.3) * 2.8;
          vec3 wrapped;
          wrapped.x = uPlayerPos.x + mod(rel.x - uPlayerPos.x + 48.0, 96.0) - 48.0;
          wrapped.z = uPlayerPos.z + mod(rel.z - uPlayerPos.z + 48.0, 96.0) - 48.0;
          wrapped.y = uPlayerPos.y + position.y + sin(uTime * 1.6 * aPhase.y + aPhase.x) * 0.55;

          vPulse = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(uTime * (2.2 + aPhase.y) + aPhase.x * 3.0), 2.0);
          vTint = aPhase.z;

          vec4 mvPos = modelViewMatrix * vec4(wrapped, 1.0);
          float baseSize = mix(18.0, 30.0, uNight) * (0.7 + 0.6 * vPulse);
          gl_PointSize = clamp(baseSize / max(1.0, -mvPos.z), 1.5, 16.0);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform sampler2D uGlowMap;
        uniform float uNight;
        varying float vPulse;
        varying float vTint;
        void main() {
          vec4 tex = texture2D(uGlowMap, gl_PointCoord);
          vec3 dayGold = mix(vec3(1.0, 0.88, 0.58), vec3(1.0, 0.96, 0.80), vTint);
          vec3 nightMagic = vTint < 0.45
            ? vec3(0.45, 1.0, 0.62)
            : (vTint < 0.78 ? vec3(1.0, 0.82, 0.35) : vec3(0.38, 0.88, 1.0));
          vec3 col = mix(dayGold, nightMagic, uNight);
          float alpha = tex.a * vPulse * mix(0.48, 0.95, uNight);
          if (alpha < 0.01) discard;
          gl_FragColor = vec4(col * (1.0 + uNight * 0.45), alpha);
        }
      `
    });
    const ffPoints = new THREE.Points(ffGeo, ffMat);
    ffPoints.frustumCulled = false;
    magicRoot.add(ffPoints);

    // Instanced Bioluminescerende Krystallklynger rundt elver, skoger, kløfter og ytre regioner (220 stk i 1 draw call!)
    const crystalCount = 220;
    const crysGeo = new THREE.ConeGeometry(0.24, 1.15, 5);
    crysGeo.translate(0, 0.52, 0);
    const crysMat = new THREE.MeshStandardMaterial({
      color: 0x72f5e2,
      emissive: 0x26d9b8,
      emissiveIntensity: 1.25,
      roughness: 0.18,
      metalness: 0.25
    });
    const instCrystals = new THREE.InstancedMesh(crysGeo, crysMat, crystalCount * 3);
    const dummy = new THREE.Object3D();
    const colorTmp = new THREE.Color();
    const palette = [0x3af5c8, 0xffb84a, 0x56b8ff, 0xd46bff];
    let cIdx = 0;
    for (let i = 0; i < crystalCount; i++) {
      const rad = 34 + Math.pow(rng(), 0.82) * 1090;
      const ang = rng() * Math.PI * 2;
      const cx = Math.cos(ang) * rad;
      const cz = Math.sin(ang) * rad;
      const cy = getTerrainBaseHeight(cx, cz);
      const hex = palette[i % palette.length];
      colorTmp.setHex(hex);
      for (let k = 0; k < 3; k++) {
        const sc = (0.55 + rng() * 0.85) * (k === 0 ? 1.25 : 0.8);
        dummy.position.set(cx + (rng() - 0.5) * 0.55, cy - 0.06, cz + (rng() - 0.5) * 0.55);
        dummy.rotation.set((rng() - 0.5) * 0.45, rng() * Math.PI * 2, (rng() - 0.5) * 0.45);
        dummy.scale.set(sc * 0.85, sc * 1.15, sc * 0.85);
        dummy.updateMatrix();
        instCrystals.setMatrixAt(cIdx, dummy.matrix);
        instCrystals.setColorAt(cIdx, colorTmp);
        cIdx++;
      }
    }
    instCrystals.count = cIdx;
    if (instCrystals.instanceColor) instCrystals.instanceColor.needsUpdate = true;
    magicRoot.add(instCrystals);
    magicRoot.userData.crysMat = crysMat;
  }

  // Drivende morgendis / mystisk natte-tåke som glir lavt over dalbunnen rundt spilleren
  const mistRings = [];
  if (M.sharedSmokePuffTex) {
    const mistGeo = new THREE.PlaneGeometry(42, 42);
    mistGeo.rotateX(-Math.PI / 2);
    for (let m = 0; m < 6; m++) {
      const mMat = new THREE.MeshBasicMaterial({
        map: M.sharedSmokePuffTex,
        color: 0xffe6c4,
        transparent: true,
        opacity: 0.09,
        depthWrite: false,
        blending: THREE.NormalBlending
      });
      const mesh = new THREE.Mesh(mistGeo, mMat);
      magicRoot.add(mesh);
      mistRings.push({
        mesh,
        mat: mMat,
        angle: (m / 6) * Math.PI * 2,
        dist: 24 + (m % 3) * 16,
        speed: 0.06 + m * 0.015
      });
    }
  }

  // ==========================================================================
  // 6. 36 MYSTISKE VEISTEIN-HELLIGDOMMER ("WAYSTONE SHRINES") OVER 2.4x2.4 KM!
  // ==========================================================================
  const waystoneShrines = [];
  const waystoneHitMeshes = [];

  function buildMysticalWaystoneShrines() {
    const rng = createSeededRng(3636200);
    const coords = [
      // Indre/midtre ring (~185..420m)
      { x: 0, z: -225 }, { x: 225, z: 4 }, { x: 0, z: 225 }, { x: -225, z: -4 },
      { x: -245, z: -255 }, { x: 255, z: -235 }, { x: -250, z: 255 }, { x: 255, z: 245 },
      { x: -385, z: -95 }, { x: 385, z: -95 }, { x: -385, z: 105 }, { x: 385, z: 105 },
      // Ytre kontinent-ring (~520..780m)
      { x: 0, z: -560 }, { x: 560, z: 0 }, { x: 0, z: 560 }, { x: -560, z: 0 },
      { x: -540, z: -540 }, { x: 540, z: -540 }, { x: -540, z: 540 }, { x: 540, z: 540 },
      { x: -720, z: -240 }, { x: 720, z: -240 }, { x: -720, z: 240 }, { x: 720, z: 240 },
      { x: -240, z: -720 }, { x: 240, z: -720 }, { x: -240, z: 720 }, { x: 240, z: 720 },
      // Fjerne verdensende-helligdommer (~840..1090m!)
      { x: -835, z: -845 }, { x: 855, z: -815 }, { x: -845, z: 835 }, { x: 845, z: 855 },
      { x: 0, z: -1040 }, { x: 1040, z: 0 }, { x: 0, z: 1040 }, { x: -1040, z: 0 }
    ];

    const baseGeo = new THREE.CylinderGeometry(1.35, 1.65, 0.42, 8);
    const pillarGeo = new THREE.CylinderGeometry(0.32, 0.52, 3.6, 6);
    const orbGeo = new THREE.OctahedronGeometry(0.42, 1);
    const beamGeo = new THREE.CylinderGeometry(0.18, 0.55, 28, 8, 1, true);
    const hitGeo = new THREE.CylinderGeometry(1.3, 1.3, 4.4, 8);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });

    const stoneMat = M.stonePlinthMat || M.darkGraveStoneMat;
    const unlitOrbMat = new THREE.MeshStandardMaterial({
      color: 0x58d8ff,
      emissive: 0x2498ff,
      emissiveIntensity: 1.9,
      roughness: 0.15,
      metalness: 0.3
    });
    const attunedOrbMat = new THREE.MeshStandardMaterial({
      color: 0xffe478,
      emissive: 0xffb830,
      emissiveIntensity: 2.1,
      roughness: 0.15,
      metalness: 0.5
    });
    const unlitBeamMat = new THREE.MeshBasicMaterial({
      color: 0x4ec8ff,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const attunedBeamMat = new THREE.MeshBasicMaterial({
      color: 0xffd258,
      transparent: true,
      opacity: 0.14,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    coords.slice(0, TOTAL_WAYSTONE_SHRINES).forEach((pt, idx) => {
      const id = `ws_${idx + 1}`;
      const already = Array.isArray(collectedWaystoneIds) && collectedWaystoneIds.includes(id);
      const gy = getTerrainHeight(pt.x, pt.z);
      const grp = new THREE.Group();
      grp.position.set(pt.x, gy, pt.z);

      const base = new THREE.Mesh(baseGeo, stoneMat);
      base.position.y = 0.21;
      base.receiveShadow = true;
      grp.add(base);

      const pillar = new THREE.Mesh(pillarGeo, stoneMat);
      pillar.position.y = 2.0;
      pillar.castShadow = true;
      grp.add(pillar);

      // 3 mindre runesteiner rundt obelisken
      for (let r = 0; r < 3; r++) {
        const ra = (r / 3) * Math.PI * 2 + rng() * 0.3;
        const mini = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.25, 0.22), stoneMat);
        mini.position.set(Math.cos(ra) * 1.25, 0.62, Math.sin(ra) * 1.25);
        mini.rotation.y = -ra;
        mini.rotation.z = 0.12;
        grp.add(mini);
      }

      const orb = new THREE.Mesh(orbGeo, already ? attunedOrbMat : unlitOrbMat);
      orb.position.y = 4.35;
      grp.add(orb);

      // Himmelstråle synlig på lang avstand over det enorme kontinentet!
      const beam = new THREE.Mesh(beamGeo, already ? attunedBeamMat : unlitBeamMat);
      beam.position.y = 16.5;
      grp.add(beam);

      const hitMesh = new THREE.Mesh(hitGeo, hitMat);
      hitMesh.position.y = 2.2;
      grp.add(hitMesh);

      magicRoot.add(grp);
      const entry = {
        id,
        index: idx + 1,
        group: grp,
        orb,
        beam,
        hitMesh,
        attuned: already,
        worldPos: new THREE.Vector3(pt.x, gy + 2.2, pt.z),
        attunedOrbMat,
        attunedBeamMat
      };
      hitMesh.userData.waystoneEntry = entry;
      waystoneShrines.push(entry);
      waystoneHitMeshes.push(hitMesh);
    });
  }

  function attuneWaystoneShrine(entry) {
    if (!entry || entry.attuned) return false;
    entry.attuned = true;
    entry.orb.material = entry.attunedOrbMat;
    entry.beam.material = entry.attunedBeamMat;

    if (Array.isArray(collectedWaystoneIds) && !collectedWaystoneIds.includes(entry.id)) {
      collectedWaystoneIds.push(entry.id);
    }
    const count = Array.isArray(collectedWaystoneIds) ? collectedWaystoneIds.length : 1;
    storyState.waystonesAttuned = count;

    const goldGain = awardScaledGold(75);
    playerState.maxHealth = Math.min(650, (playerState.maxHealth || 100) + 5);
    playerState.health = playerState.maxHealth;

    if (spawnSparkBurst) spawnSparkBurst(entry.worldPos, 28, 0x68e8ff, 1.75);
    if (audio && audio.playQuestFanfare) audio.playQuestFanfare();

    const isNo = getLang() === 'no';
    showFrontierToast(
      isNo
        ? `✨ Magisk Veistein aktivert (${count}/${TOTAL_WAYSTONE_SHRINES})! +${goldGain} Gull, +5 Maks HP & +${count}% Veistein-kraft!`
        : `✨ Mystical Waystone Attuned (${count}/${TOTAL_WAYSTONE_SHRINES})! +${goldGain} Gold, +5 Max HP & +${count}% Waystone Power!`,
      5.2
    );

    recordQuestKill(['sun_rune', 'treasure_any']);
    checkStoryProgression();
    saveCareerProgress();
    updateStatusUI();
    return true;
  }

  function checkBulletWaystoneHit(prevPos, currPos) {
    for (let i = 0; i < waystoneShrines.length; i++) {
      const ws = waystoneShrines[i];
      if (ws.attuned) continue;
      if (segmentPointDistance(prevPos, currPos, ws.worldPos) < 1.25) {
        attuneWaystoneShrine(ws);
        return true;
      }
    }
    return false;
  }

  function tryRayWaystoneInteraction(raycaster) {
    if (waystoneHitMeshes.length === 0) return false;
    const hits = raycaster.intersectObjects(waystoneHitMeshes, false);
    if (hits.length > 0 && hits[0].distance <= 8.5) {
      const ws = hits[0].object.userData.waystoneEntry;
      if (ws && !ws.attuned) {
        attuneWaystoneShrine(ws);
        return true;
      }
    }
    return false;
  }

  // ==========================================================================
  // 7. HOVEDLØKKE-OPPDATERING & RENDERING (0 PER-FRAME ALLOKERINGER)
  // ==========================================================================
  const tmpSunDir = new THREE.Vector3();

  function updateMagicalAtmosphere(dt, worldTime, nightAmount, bloodMoonBlend = 0, activeLightDir = null) {
    const px = playerRig.position.x;
    const py = playerRig.position.y;
    const pz = playerRig.position.z;
    const night = THREE.MathUtils.clamp(nightAmount, 0, 1);

    // 1) Hold Nordlys-kuppel og Sol-glorie sentrert rundt spilleren på tvers av hele 2.4km-kontinentet!
    auroraMesh.position.set(px, py + 195, pz);
    auroraUniforms.uTime.value = worldTime;
    auroraUniforms.uOpacity.value = Math.max(0, (night - 0.12) / 0.88) * 0.72;
    auroraUniforms.uBloodMoon.value = bloodMoonBlend;
    auroraMesh.visible = night > 0.12;

    if (activeLightDir) {
      tmpSunDir.copy(activeLightDir).normalize();
    } else {
      tmpSunDir.set(0.65, 0.24, 0.52).normalize();
    }
    waterUniforms.uSunDir.value.copy(tmpSunDir);
    waterUniforms.uTime.value = worldTime;
    waterUniforms.uNight.value = night;

    const dayGlow = Math.max(0, 1.0 - night * 1.45);
    sunCoronaGroup.visible = dayGlow > 0.02;
    if (sunCoronaGroup.visible) {
      sunCoronaGroup.position.set(
        px + tmpSunDir.x * 420,
        py + Math.max(46, tmpSunDir.y * 420),
        pz + tmpSunDir.z * 420
      );
      sunInnerMat.opacity = dayGlow * (0.72 + Math.sin(worldTime * 1.8) * 0.06);
      sunOuterMat.opacity = dayGlow * 0.42;
    }

    // 2) GPU-ildfluer & bioluminescerende krystaller
    fireflyUniforms.uTime.value = worldTime;
    fireflyUniforms.uNight.value = night;
    fireflyUniforms.uPlayerPos.value.set(px, py, pz);

    if (magicRoot.userData.crysMat) {
      magicRoot.userData.crysMat.emissiveIntensity = THREE.MathUtils.lerp(0.55, 2.25, night) + Math.sin(worldTime * 2.4) * 0.18;
    }

    // 3) Drivende dal-tåke rundt spilleren
    for (let i = 0; i < mistRings.length; i++) {
      const m = mistRings[i];
      const a = m.angle + worldTime * m.speed;
      const mx = px + Math.cos(a) * m.dist;
      const mz = pz + Math.sin(a) * m.dist;
      const my = getTerrainBaseHeight(mx, mz) + 0.55 + Math.sin(worldTime * 0.8 + i) * 0.2;
      m.mesh.position.set(mx, my, mz);
      m.mesh.rotation.z = worldTime * 0.04 * (i % 2 === 0 ? 1 : -1);
      m.mat.color.setHex(night > 0.5 ? 0x74b8e8 : 0xffe4be);
      m.mat.opacity = THREE.MathUtils.lerp(0.065, 0.135, night);
    }

    // 4) Stjerneskudd på nattehimmelen
    for (let i = 0; i < shootingStars.length; i++) {
      const st = shootingStars[i];
      if (!st.active) {
        if (night > 0.45) {
          st.timer -= dt;
          if (st.timer <= 0) {
            st.active = true;
            st.life = 0;
            st.maxLife = 0.95 + (i % 2) * 0.35;
            st.timer = 9 + i * 6.5;
            const ang = (worldTime * 1.7 + i * 2.1) % (Math.PI * 2);
            st.mesh.position.set(px + Math.cos(ang) * 280, py + 155 + i * 24, pz + Math.sin(ang) * 280);
            st.vx = -Math.sin(ang) * 185;
            st.vy = -48;
            st.vz = Math.cos(ang) * 185;
            st.mesh.rotation.set(0, Math.atan2(-st.vz, st.vx), -0.25);
            st.mesh.visible = true;
          }
        }
      } else {
        st.life += dt;
        const u = st.life / st.maxLife;
        if (u >= 1) {
          st.active = false;
          st.mesh.visible = false;
        } else {
          st.mesh.position.x += st.vx * dt;
          st.mesh.position.y += st.vy * dt;
          st.mesh.position.z += st.vz * dt;
          st.mat.opacity = Math.sin(u * Math.PI) * 0.92;
        }
      }
    }

    // 5) Roter og sjekk nærhets-aktivering for de 36 Mystiske Veistein-Helligdommene
    for (let i = 0; i < waystoneShrines.length; i++) {
      const ws = waystoneShrines[i];
      ws.orb.rotation.y += dt * 1.5;
      ws.orb.position.y = 4.35 + Math.sin(worldTime * 2.4 + i) * 0.16;
      if (!ws.attuned) {
        const dx = px - ws.worldPos.x;
        const dz = pz - ws.worldPos.z;
        if (dx * dx + dz * dz < 11.5) {
          attuneWaystoneShrine(ws);
        }
      }
    }

    // 6) Synk post-processing parametre
    if (composerReady && bloomPass && magicGradePass) {
      bloomPass.strength = THREE.MathUtils.lerp(0.32, 0.52, night);
      magicGradePass.uniforms.uNight.value = night;
      magicGradePass.uniforms.uBloodMoon.value = bloodMoonBlend;
      magicGradePass.uniforms.uTime.value = worldTime;
    }
  }

  function renderMagicalFrame() {
    // I Meta Quest WebXR VR eller 'fast' FPS-modus brukes direkte stereo-rendering for 90Hz null-latens!
    if (
      renderer.xr.isPresenting ||
      !composerReady ||
      !composer ||
      (controlSettings && controlSettings.perfMode === 'fast')
    ) {
      renderer.render(scene, camera);
      return;
    }
    composer.render();
  }

  function drawWaystonesOnMinimap(minimapCtx, toRadar) {
    for (let i = 0; i < waystoneShrines.length; i++) {
      const ws = waystoneShrines[i];
      if (ws.attuned) continue;
      const pt = toRadar(ws.worldPos.x, ws.worldPos.z);
      if (pt.clamped) continue;
      minimapCtx.fillStyle = '#5ee8ff';
      minimapCtx.beginPath();
      minimapCtx.arc(pt.sx, pt.sy, 2.8, 0, Math.PI * 2);
      minimapCtx.fill();
    }
  }

  buildContinentOuterTerrain();
  buildSparklingFrontierRiversAndLakes();
  buildGPUFirefliesAndMist();
  buildMysticalWaystoneShrines();

  return {
    TOTAL_WAYSTONE_SHRINES,
    waystoneShrines,
    auroraMesh,
    composerReady: () => composerReady,
    onResize,
    checkBulletWaystoneHit,
    tryRayWaystoneInteraction,
    updateMagicalAtmosphere,
    renderMagicalFrame,
    drawWaystonesOnMinimap
  };
}
