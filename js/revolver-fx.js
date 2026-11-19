import * as THREE from 'three';
import { createSeededRng } from './textures.js';

export function initRevolverAndAtmosphereFX({
  scene,
  camera,
  M,
  saloonBuilding,
  tailorBuilding,
  gunsmithBuilding = null,
  safeHouseBuilding,
  loadedAssets = null
}) {
  const {
    sharedWoodTex, sharedWoodNormalTex, sharedWoodRoughTex,
    gltfWoodNormalTex, gltfWoodRoughTex,
    lightWoodMat, darkWoodMat, wroughtIronMat,
    sharedParticleGlowTex, sharedSparkGlowTex, createContactShadow
  } = M;

  let damageVignetteTimer = 0;
  let isGoldUpgraded = false;

  // --- 7a. Western-revolver (.glb + prosedyrisk fallback) med PBR-stål, valnøttskjefte og miljørefleksjon ---
  const gunSteelMat = new THREE.MeshStandardMaterial({
    color: 0xb6bec8,
    metalness: 0.86,
    roughness: 0.22,
    envMapIntensity: 1.45
  });
  const gunDarkMat = new THREE.MeshStandardMaterial({
    color: 0x3b4049,
    metalness: 0.82,
    roughness: 0.30,
    envMapIntensity: 1.35
  });
  const gunWoodMat = new THREE.MeshStandardMaterial({
    color: 0x6e3b19,
    map: sharedWoodTex,
    normalMap: sharedWoodNormalTex,
    normalScale: new THREE.Vector2(0.45, 0.45),
    roughnessMap: sharedWoodRoughTex,
    metalness: 0.04,
    roughness: 0.48,
    envMapIntensity: 0.9
  });
  const gunBrassMat = new THREE.MeshStandardMaterial({
    color: 0xdeb05a,
    metalness: 0.90,
    roughness: 0.20,
    envMapIntensity: 1.5
  });

  const goldSteelMaterials = [gunSteelMat];
  const goldDarkMaterials = [gunDarkMat];
  const goldBrassMaterials = [gunBrassMat];

  function applyGoldSteel(mat) {
    mat.color.setHex(0xffd24c);
    mat.emissive.setHex(0x3a2600);
    mat.metalness = 0.94;
    mat.roughness = 0.16;
    mat.envMapIntensity = 1.65;
  }

  function applyGoldDark(mat) {
    mat.color.setHex(0xd99b26);
    mat.emissive.setHex(0x261700);
    mat.metalness = 0.90;
    mat.roughness = 0.20;
    mat.envMapIntensity = 1.55;
  }

  function applyGoldBrass(mat) {
    mat.color.setHex(0xffe98a);
    mat.emissive.setHex(0x2e1e00);
    mat.metalness = 0.95;
    mat.roughness = 0.14;
    mat.envMapIntensity = 1.70;
  }

  function upgradeRevolverToGold() {
    isGoldUpgraded = true;
    for (let i = 0; i < goldSteelMaterials.length; i++) applyGoldSteel(goldSteelMaterials[i]);
    for (let i = 0; i < goldDarkMaterials.length; i++) applyGoldDark(goldDarkMaterials[i]);
    for (let i = 0; i < goldBrassMaterials.length; i++) applyGoldBrass(goldBrassMaterials[i]);
  }

  const gunBarrelGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.24, 14);
  const gunDrumGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.09, 16);
  const gunEjectorGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.2, 8);
  const gunFrameGeo = new THREE.BoxGeometry(0.052, 0.056, 0.15);
  const gunRibGeo = new THREE.BoxGeometry(0.026, 0.016, 0.17);
  const gunGripGeo = new THREE.BoxGeometry(0.05, 0.125, 0.075);
  const gunGripCapGeo = new THREE.BoxGeometry(0.058, 0.018, 0.085);
  const gunGripPanelGeo = new THREE.CapsuleGeometry(0.026, 0.052, 4, 8);
  gunGripPanelGeo.scale(0.18, 1.0, 1.15);
  const gunBackstrapGeo = new THREE.BoxGeometry(0.014, 0.125, 0.012);
  const gunHammerGeo = new THREE.BoxGeometry(0.02, 0.035, 0.022);
  const gunSightGeo = new THREE.BoxGeometry(0.01, 0.02, 0.014);
  const gunTriggerGeo = new THREE.BoxGeometry(0.012, 0.028, 0.01);
  const gunGuardGeo = new THREE.TorusGeometry(0.032, 0.0065, 6, 16);
  const gunRingGeo = new THREE.TorusGeometry(0.043, 0.004, 6, 16);
  const gunLatchGeo = new THREE.BoxGeometry(0.012, 0.014, 0.03);
  const gunLanyardGeo = new THREE.TorusGeometry(0.012, 0.003, 5, 8);
  const gunMuzzleRingGeo = new THREE.CylinderGeometry(0.019, 0.019, 0.014, 12);
  const gunEjectorHeadGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.022, 8);
  const gunGripPanelMat = new THREE.MeshStandardMaterial({
    color: 0x4c250f,
    map: sharedWoodTex,
    normalMap: sharedWoodNormalTex,
    normalScale: new THREE.Vector2(0.45, 0.45),
    roughnessMap: sharedWoodRoughTex,
    metalness: 0.04,
    roughness: 0.42
  });

  function attachMuzzleFX(muzzle) {
    // Munningsglimt: liten glødende mesh + kortvarig PointLight
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xffd257,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false
    });
    const flash = new THREE.Group();
    flash.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 0), flashMat));
    const flashCone = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.13, 6), flashMat);
    flashCone.rotation.x = -Math.PI / 2;
    flashCone.position.set(0, 0, -0.08);
    flash.add(flashCone);
    flash.position.set(0, 0, 0.015);
    flash.visible = false;
    muzzle.add(flash);

    // Lyset holdes alltid i scenen med intensitet 0 for å unngå shader-rekompilering på Meta Quest.
    const flashLight = new THREE.PointLight(0xffb347, 0, 7, 2);
    flashLight.position.set(0, 0, 0.01);
    muzzle.add(flashLight);

    return { flash, flashMat, flashLight };
  }

  function createRevolver() {
    const revolverGLTF = loadedAssets && loadedAssets.revolver;
    if (revolverGLTF && revolverGLTF.scene) {
      const root = new THREE.Group();
      const body = new THREE.Group();
      root.add(body);

      const gltfModel = revolverGLTF.scene.clone(true);
      const clonedMatMap = new Map();

      gltfModel.traverse((node) => {
        if (!node.isMesh || !node.material) return;
        node.castShadow = false;
        node.receiveShadow = false;

        const origMat = node.material;
        let mat = clonedMatMap.get(origMat);
        if (!mat) {
          mat = origMat.clone();
          const mName = mat.name || '';
          if (mName === 'GunSteel') {
            mat.envMapIntensity = 1.5;
            goldSteelMaterials.push(mat);
            if (isGoldUpgraded) applyGoldSteel(mat);
          } else if (mName === 'GunDarkSteel') {
            mat.envMapIntensity = 1.4;
            goldDarkMaterials.push(mat);
            if (isGoldUpgraded) applyGoldDark(mat);
          } else if (mName === 'GunBrass') {
            mat.envMapIntensity = 1.55;
            goldBrassMaterials.push(mat);
            if (isGoldUpgraded) applyGoldBrass(mat);
          } else if (mName === 'GunCopper') {
            mat.envMapIntensity = 1.35;
          } else if (mName === 'GunWalnut') {
            mat.envMapIntensity = 0.95;
            if (gltfWoodNormalTex) {
              mat.normalMap = gltfWoodNormalTex;
              mat.normalScale = new THREE.Vector2(0.32, -0.32);
            }
            if (gltfWoodRoughTex) {
              mat.roughnessMap = gltfWoodRoughTex;
            }
          }
          clonedMatMap.set(origMat, mat);
        }
        node.material = mat;
      });

      body.add(gltfModel);

      let muzzle = gltfModel.getObjectByName('MuzzlePoint') || gltfModel.getObjectByName('muzzle');
      if (!muzzle) {
        muzzle = new THREE.Object3D();
        muzzle.position.set(0, 0.032, -0.3);
        body.add(muzzle);
      }

      const { flash, flashMat, flashLight } = attachMuzzleFX(muzzle);

      root.userData = {
        body,
        muzzle,
        flash,
        flashMat,
        flashLight,
        cylinder: gltfModel.getObjectByName('Cylinder') || null,
        hammer: gltfModel.getObjectByName('Hammer') || null,
        recoilAngle: 0,
        recoilVel: 0,
        flashTimer: 0
      };
      return root;
    }

    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);

    // Løp som peker langs revolverens -Z
    const barrel = new THREE.Mesh(gunBarrelGeo, gunSteelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.03, -0.16);
    body.add(barrel);

    const rib = new THREE.Mesh(gunRibGeo, gunDarkMat);
    rib.position.set(0, 0.047, -0.15);
    body.add(rib);

    const muzzleRing = new THREE.Mesh(gunMuzzleRingGeo, gunDarkMat);
    muzzleRing.rotation.x = Math.PI / 2;
    muzzleRing.position.set(0, 0.03, -0.274);
    body.add(muzzleRing);

    const ejector = new THREE.Mesh(gunEjectorGeo, gunDarkMat);
    ejector.rotation.x = Math.PI / 2;
    ejector.position.set(0, 0.005, -0.14);
    body.add(ejector);

    const ejectorHead = new THREE.Mesh(gunEjectorHeadGeo, gunBrassMat);
    ejectorHead.rotation.x = Math.PI / 2;
    ejectorHead.position.set(0, 0.005, -0.25);
    body.add(ejectorHead);

    // Tønne med messingringer
    const drum = new THREE.Mesh(gunDrumGeo, gunDarkMat);
    drum.rotation.x = Math.PI / 2;
    drum.position.set(0, 0.03, -0.02);
    body.add(drum);

    [-0.047, 0.047].forEach((z) => {
      const ring = new THREE.Mesh(gunRingGeo, gunBrassMat);
      ring.position.set(0, 0.03, -0.02 + z);
      body.add(ring);
    });

    // Ramme
    const frame = new THREE.Mesh(gunFrameGeo, gunSteelMat);
    frame.position.set(0, 0.022, 0.045);
    body.add(frame);

    // Skjefte i tre, vinklet ned og bakover
    const grip = new THREE.Mesh(gunGripGeo, gunWoodMat);
    grip.position.set(0, -0.05, 0.09);
    grip.rotation.x = -0.32;
    body.add(grip);

    const gripCap = new THREE.Mesh(gunGripCapGeo, gunBrassMat);
    gripCap.position.set(0, -0.107, 0.109);
    gripCap.rotation.x = -0.32;
    body.add(gripCap);

    // Messingbeslag bak på skjeftet
    const backstrap = new THREE.Mesh(gunBackstrapGeo, gunBrassMat);
    backstrap.position.set(0, -0.0385, 0.1255);
    backstrap.rotation.x = -0.32;
    body.add(backstrap);

    // Mørke treplater på begge sider av skjeftet
    [-0.0265, 0.0265].forEach((x) => {
      const panel = new THREE.Mesh(gunGripPanelGeo, gunGripPanelMat);
      panel.position.set(x, -0.05, 0.09);
      panel.rotation.x = -0.32;
      body.add(panel);
    });

    // Cowboy-ringer i skjeftet
    const lanyard = new THREE.Mesh(gunLanyardGeo, gunBrassMat);
    lanyard.position.set(0, -0.121, 0.117);
    lanyard.rotation.x = 0.2;
    body.add(lanyard);

    // Sylinderlås på venstre side av rammen
    const latch = new THREE.Mesh(gunLatchGeo, gunDarkMat);
    latch.position.set(-0.031, 0.045, 0.012);
    body.add(latch);

    // Hanen
    const hammer = new THREE.Mesh(gunHammerGeo, gunDarkMat);
    hammer.position.set(0, 0.055, 0.1);
    hammer.rotation.x = -0.35;
    body.add(hammer);

    // Avtrekker og avtrekkerbøyle
    const trigger = new THREE.Mesh(gunTriggerGeo, gunBrassMat);
    trigger.position.set(0, -0.03, 0.03);
    body.add(trigger);

    const guard = new THREE.Mesh(gunGuardGeo, gunBrassMat);
    guard.position.set(0, -0.034, 0.02);
    guard.rotation.y = Math.PI / 2;
    body.add(guard);

    // Kimfrontsikte og baksikte
    const frontSight = new THREE.Mesh(gunSightGeo, gunBrassMat);
    frontSight.position.set(0, 0.058, -0.265);
    body.add(frontSight);

    const rearSight = new THREE.Mesh(gunSightGeo, gunDarkMat);
    rearSight.position.set(0, 0.058, 0.078);
    body.add(rearSight);

    // Munningsglimt: liten glødende mesh + kortvarig PointLight
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xffd257,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false
    });
    const flash = new THREE.Group();
    flash.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 0), flashMat));
    const flashCone = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.13, 6), flashMat);
    flashCone.rotation.x = -Math.PI / 2;
    flashCone.position.set(0, 0, -0.08);
    flash.add(flashCone);
    flash.position.set(0, 0.03, -0.285);
    flash.visible = false;
    body.add(flash);

    // Lyset holdes alltid i scenen med intensitet 0. Da slipper vi å bygge
    // om shaderne hver gang man skyter (viktig for ytelsen på Meta Quest).
    const flashLight = new THREE.PointLight(0xffb347, 0, 7, 2);
    flashLight.position.set(0, 0.03, -0.29);
    body.add(flashLight);

    // Munningspunkt der kula starter
    const muzzle = new THREE.Object3D();
    muzzle.position.set(0, 0.03, -0.3);
    body.add(muzzle);

    root.userData = {
      body,
      muzzle,
      flash,
      flashMat,
      flashLight,
      recoilAngle: 0,
      recoilVel: 0,
      flashTimer: 0
    };

    return root;
  }

  // Felles PBR-forbedring for nye .glb-våpen (Shotgun, Winchester, Crossbow, Dynamite)
  function enhanceWeaponGLB(gltfScene) {
    const model = gltfScene.clone(true);
    const clonedMap = new Map();
    model.traverse((node) => {
      if (!node.isMesh || !node.material) return;
      node.castShadow = false;
      node.receiveShadow = false;
      const orig = node.material;
      let mat = clonedMap.get(orig);
      if (!mat) {
        mat = orig.clone();
        const mName = mat.name || '';
        if (mName === 'GunSteel' || mName === 'SilverMetal') {
          mat.envMapIntensity = 1.55;
        } else if (mName === 'GunDarkSteel' || mName === 'GunBrass') {
          mat.envMapIntensity = 1.45;
        } else if (mName === 'GunWalnut') {
          mat.envMapIntensity = 0.92;
          if (gltfWoodNormalTex) {
            mat.normalMap = gltfWoodNormalTex;
            mat.normalScale = new THREE.Vector2(0.32, -0.32);
          }
          if (gltfWoodRoughTex) mat.roughnessMap = gltfWoodRoughTex;
        }
        clonedMap.set(orig, mat);
      }
      node.material = mat;
    });
    return model;
  }

  const silverMetalMat = new THREE.MeshStandardMaterial({
    color: 0xe6eefc,
    metalness: 0.94,
    roughness: 0.16,
    envMapIntensity: 1.65
  });
  const silverGlowMat = new THREE.MeshStandardMaterial({
    color: 0xbde4ff,
    emissive: 0x56b4ff,
    emissiveIntensity: 1.8,
    metalness: 0.6,
    roughness: 0.2
  });
  const dynamiteRedMat = new THREE.MeshStandardMaterial({
    color: 0xb81d18,
    roughness: 0.72,
    metalness: 0.04
  });
  const fuseSparkSpriteMat = new THREE.SpriteMaterial({
    map: sharedSparkGlowTex || sharedParticleGlowTex,
    color: 0xffb84a,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
    toneMapped: false
  });

  function createShotgun() {
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);

    const gltf = loadedAssets && loadedAssets.shotgun;
    let muzzle = null;
    if (gltf && gltf.scene) {
      const m = enhanceWeaponGLB(gltf.scene);
      body.add(m);
      muzzle = m.getObjectByName('MuzzlePoint') || m.getObjectByName('muzzle');
    } else {
      // Prosedyrisk avsaget dobbeltløpet hagle fallback
      [-0.014, 0.014].forEach((bx) => {
        const bMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.014, 0.38, 12), gunDarkMat);
        bMesh.rotation.x = Math.PI / 2;
        bMesh.position.set(bx, 0.028, -0.22);
        body.add(bMesh);
      });
      const rec = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.052, 0.12), gunSteelMat);
      rec.position.set(0, 0.02, 0.02);
      body.add(rec);
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.095, 0.18), gunWoodMat);
      stock.position.set(0, -0.032, 0.12);
      stock.rotation.x = -0.26;
      body.add(stock);
      const fore = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.036, 0.16), gunWoodMat);
      fore.position.set(0, 0.008, -0.14);
      body.add(fore);
    }

    if (!muzzle) {
      muzzle = new THREE.Object3D();
      muzzle.position.set(0, 0.03, -0.43);
      body.add(muzzle);
    }
    const { flash, flashMat, flashLight } = attachMuzzleFX(muzzle);
    root.userData = {
      weaponId: 'shotgun',
      body,
      muzzle,
      flash,
      flashMat,
      flashLight,
      recoilAngle: 0,
      recoilVel: 0,
      flashTimer: 0
    };
    return root;
  }

  function createRifle() {
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);

    const gltf = loadedAssets && loadedAssets.rifle;
    let muzzle = null;
    let lever = null;
    if (gltf && gltf.scene) {
      const m = enhanceWeaponGLB(gltf.scene);
      body.add(m);
      muzzle = m.getObjectByName('MuzzlePoint') || m.getObjectByName('muzzle');
      lever = m.getObjectByName('Lever') || null;
    } else {
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.014, 0.54, 8), gunSteelMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.036, -0.30);
      body.add(barrel);
      const mag = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.48, 10), gunDarkMat);
      mag.rotation.x = Math.PI / 2;
      mag.position.set(0, 0.015, -0.27);
      body.add(mag);
      const rec = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.062, 0.15), gunBrassMat);
      rec.position.set(0, 0.024, 0.03);
      body.add(rec);
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.095, 0.20), gunWoodMat);
      stock.position.set(0, -0.028, 0.15);
      stock.rotation.x = -0.22;
      body.add(stock);
    }

    if (!muzzle) {
      muzzle = new THREE.Object3D();
      muzzle.position.set(0, 0.036, -0.58);
      body.add(muzzle);
    }
    const { flash, flashMat, flashLight } = attachMuzzleFX(muzzle);
    root.userData = {
      weaponId: 'rifle',
      body,
      muzzle,
      lever,
      flash,
      flashMat,
      flashLight,
      recoilAngle: 0,
      recoilVel: 0,
      flashTimer: 0
    };
    return root;
  }

  function createCrossbow() {
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);

    const gltf = loadedAssets && loadedAssets.crossbow;
    let muzzle = null;
    let loadedBolt = null;
    if (gltf && gltf.scene) {
      const m = enhanceWeaponGLB(gltf.scene);
      body.add(m);
      muzzle = m.getObjectByName('MuzzlePoint') || m.getObjectByName('muzzle');
      loadedBolt = m.getObjectByName('LoadedBolt') || null;
    } else {
      const tiller = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.055, 0.48), gunWoodMat);
      tiller.position.set(0, 0.012, -0.14);
      body.add(tiller);
      const bowArc = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.014, 7, 18, Math.PI * 0.85), silverMetalMat);
      bowArc.rotation.x = Math.PI / 2;
      bowArc.rotation.z = Math.PI * 0.075;
      bowArc.position.set(0, 0.028, -0.22);
      body.add(bowArc);
      loadedBolt = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.34, 8), silverGlowMat);
      loadedBolt.rotation.x = Math.PI / 2;
      loadedBolt.position.set(0, 0.044, -0.26);
      body.add(loadedBolt);
    }

    if (!muzzle) {
      muzzle = new THREE.Object3D();
      muzzle.position.set(0, 0.038, -0.45);
      body.add(muzzle);
    }
    const { flash, flashMat, flashLight } = attachMuzzleFX(muzzle);
    flashMat.color.setHex(0x8fd4ff);
    flashLight.color.setHex(0x88ccff);
    root.userData = {
      weaponId: 'crossbow',
      body,
      muzzle,
      loadedBolt,
      boltReloadTimer: 0,
      flash,
      flashMat,
      flashLight,
      recoilAngle: 0,
      recoilVel: 0,
      flashTimer: 0
    };
    return root;
  }

  function buildDynamiteVisual() {
    const gltf = loadedAssets && loadedAssets.dynamite;
    const holder = new THREE.Group();
    let fuseTip = null;
    if (gltf && gltf.scene) {
      const m = enhanceWeaponGLB(gltf.scene);
      holder.add(m);
      fuseTip = m.getObjectByName('FuseTip') || null;
    } else {
      [[-0.018, -0.01], [0.018, -0.01], [0, 0.018]].forEach(([ox, oz]) => {
        const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.21, 10), dynamiteRedMat);
        stick.position.set(ox, 0, oz);
        holder.add(stick);
      });
      [-0.055, 0.055].forEach((by) => {
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.039, 0.039, 0.018, 12), darkWoodMat);
        band.position.y = by;
        holder.add(band);
      });
    }
    if (!fuseTip) {
      fuseTip = new THREE.Object3D();
      fuseTip.position.set(0, 0.145, -0.015);
      holder.add(fuseTip);
    }
    const spark = new THREE.Sprite(fuseSparkSpriteMat);
    spark.scale.set(0.095, 0.095, 1);
    fuseTip.add(spark);
    holder.userData.fuseTip = fuseTip;
    holder.userData.spark = spark;
    return holder;
  }

  function createDynamiteInHand() {
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);
    const dyn = buildDynamiteVisual();
    dyn.position.set(0, 0.02, -0.16);
    dyn.rotation.set(0.28, 0.15, -0.12);
    body.add(dyn);

    const muzzle = new THREE.Object3D();
    muzzle.position.set(0, 0.06, -0.22);
    body.add(muzzle);

    root.userData = {
      weaponId: 'dynamite',
      body,
      muzzle,
      fuseSpark: dyn.userData.spark,
      recoilAngle: 0,
      recoilVel: 0,
      flashTimer: 0
    };
    return root;
  }

  function createHellfire() {
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);

    const gltf = loadedAssets && loadedAssets.hellfire;
    let muzzle = null;
    let barrelCluster = null;
    if (gltf && gltf.scene) {
      const m = enhanceWeaponGLB(gltf.scene);
      body.add(m);
      muzzle = m.getObjectByName('MuzzlePoint') || m.getObjectByName('muzzle');
      barrelCluster = m.getObjectByName('BarrelCluster') || null;
    } else {
      const rec = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.068, 0.22), gunDarkMat);
      rec.position.set(0, 0.048, -0.09);
      body.add(rec);
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.075, 0.22), gunWoodMat);
      stock.position.set(0, 0.02, 0.14);
      body.add(stock);
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.046, 14), gunBrassMat);
      drum.rotation.x = Math.PI / 2;
      drum.position.set(0, 0, -0.12);
      body.add(drum);
      barrelCluster = new THREE.Group();
      barrelCluster.position.set(0, 0.054, -0.19);
      for (let b = 0; b < 4; b++) {
        const ang = (b / 4) * Math.PI * 2 + Math.PI * 0.25;
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.34, 8), silverMetalMat);
        bar.rotation.x = Math.PI / 2;
        bar.position.set(Math.cos(ang) * 0.015, Math.sin(ang) * 0.015, -0.15);
        barrelCluster.add(bar);
      }
      body.add(barrelCluster);
    }

    if (!muzzle) {
      muzzle = new THREE.Object3D();
      muzzle.position.set(0, 0.054, -0.52);
      body.add(muzzle);
    }
    const { flash, flashMat, flashLight } = attachMuzzleFX(muzzle);
    flashMat.color.setHex(0x88dcff);
    flashLight.color.setHex(0x74ccff);
    root.userData = {
      weaponId: 'hellfire',
      body,
      muzzle,
      barrelCluster,
      spinVel: 0,
      flash,
      flashMat,
      flashLight,
      recoilAngle: 0,
      recoilVel: 0,
      flashTimer: 0
    };
    return root;
  }

  function createWeaponModel(weaponId) {
    if (weaponId === 'shotgun') return createShotgun();
    if (weaponId === 'rifle') return createRifle();
    if (weaponId === 'crossbow') return createCrossbow();
    if (weaponId === 'dynamite') return createDynamiteInHand();
    if (weaponId === 'hellfire') return createHellfire();
    const rev = createRevolver();
    rev.userData.weaponId = 'revolver';
    return rev;
  }

  function createThrownDynamiteMesh() {
    return buildDynamiteVisual();
  }

  // --- 7c. Øvingsblinker: 5 flasker på en trestokk utenfor Saloonen ---
  const practiceRange = new THREE.Group();
  practiceRange.position.set(-3.9, 0, 5.2);
  practiceRange.rotation.y = 0.38;
  scene.add(practiceRange);

  const rangePostGeo = new THREE.CylinderGeometry(0.07, 0.09, 1.15, 8);
  [-1.55, 1.55].forEach((px) => {
    const post = new THREE.Mesh(rangePostGeo, darkWoodMat);
    post.position.set(px, 0.575, 0);
    practiceRange.add(post);
  });

  const rangeRailGeo = new THREE.CylinderGeometry(0.075, 0.075, 3.45, 8);
  const rangeRail = new THREE.Mesh(rangeRailGeo, lightWoodMat);
  rangeRail.rotation.z = Math.PI / 2;
  rangeRail.position.set(0, 1.12, 0);
  practiceRange.add(rangeRail);

  const rangeBraceGeo = new THREE.BoxGeometry(0.09, 0.95, 0.07);
  [-1.55, 1.55].forEach((px) => {
    const brace = new THREE.Mesh(rangeBraceGeo, darkWoodMat);
    brace.position.set(px * 0.82, 0.55, 0.28);
    brace.rotation.x = -0.45;
    practiceRange.add(brace);
  });

  const practiceBottles = [];
  const bottleBodyGeo = new THREE.CylinderGeometry(0.058, 0.064, 0.19, 10);
  const bottleShoulderGeo = new THREE.CylinderGeometry(0.03, 0.06, 0.06, 10);
  const bottleNeckGeo = new THREE.CylinderGeometry(0.024, 0.03, 0.07, 8);
  const bottleLipGeo = new THREE.TorusGeometry(0.027, 0.007, 5, 10);
  const bottleLabelGeo = new THREE.CylinderGeometry(0.063, 0.063, 0.07, 10);
  const bottleGlassMats = [
    new THREE.MeshStandardMaterial({ color: 0x3f8a5b, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.9 }),
    new THREE.MeshStandardMaterial({ color: 0xa4642c, roughness: 0.3, metalness: 0.1, transparent: true, opacity: 0.9 })
  ];
  const bottleLabelMat = new THREE.MeshLambertMaterial({ color: 0xf2e2bd });

  function createPracticeBottle(index) {
    const bottle = new THREE.Group();
    const glassMat = bottleGlassMats[index % bottleGlassMats.length];

    const bodyMesh = new THREE.Mesh(bottleBodyGeo, glassMat);
    bodyMesh.position.y = -0.05;
    bottle.add(bodyMesh);

    const shoulder = new THREE.Mesh(bottleShoulderGeo, glassMat);
    shoulder.position.y = 0.075;
    bottle.add(shoulder);

    const neck = new THREE.Mesh(bottleNeckGeo, glassMat);
    neck.position.y = 0.14;
    bottle.add(neck);

    const lip = new THREE.Mesh(bottleLipGeo, glassMat);
    lip.rotation.x = Math.PI / 2;
    lip.position.y = 0.178;
    bottle.add(lip);

    const label = new THREE.Mesh(bottleLabelGeo, bottleLabelMat);
    label.position.y = -0.04;
    bottle.add(label);

    const x = (index - 2) * 0.62;
    bottle.position.set(x, 1.34, 0);
    bottle.rotation.y = (index * 0.7) % (Math.PI * 2);
    bottle.userData = {
      knocked: false,
      vel: new THREE.Vector3(),
      angVel: new THREE.Vector3(),
      home: bottle.position.clone(),
      homeQuat: bottle.quaternion.clone()
    };
    practiceRange.add(bottle);
    return bottle;
  }

  for (let i = 0; i < 5; i++) {
    practiceBottles.push(createPracticeBottle(i));
  }

  const moonGroup = new THREE.Group();
  const moonMesh = new THREE.Mesh(
    new THREE.SphereGeometry(5.6, 18, 16),
    new THREE.MeshBasicMaterial({ color: 0xe8f0ff, transparent: true, opacity: 0, fog: false, toneMapped: false })
  );
  moonGroup.add(moonMesh);

  const moonHaloMat = new THREE.SpriteMaterial({
    map: sharedParticleGlowTex,
    color: 0xaec8ff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
    toneMapped: false
  });
  const moonHalo = new THREE.Sprite(moonHaloMat);
  moonHalo.scale.set(28, 28, 1);
  moonGroup.add(moonHalo);
  moonGroup.position.set(-76, 86, -155);
  scene.add(moonGroup);

  const STAR_COUNT = 380;
  const starPositions = new Float32Array(STAR_COUNT * 3);
  {
    const starRng = createSeededRng(8842);
    for (let i = 0; i < STAR_COUNT; i++) {
      const angle = starRng() * Math.PI * 2;
      const elev = 0.14 + starRng() * 1.32;
      const radius = 210 + starRng() * 70;
      starPositions[i * 3] = Math.cos(angle) * Math.cos(elev) * radius;
      starPositions[i * 3 + 1] = Math.sin(elev) * radius;
      starPositions[i * 3 + 2] = Math.sin(angle) * Math.cos(elev) * radius;
    }
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xeef4ff,
    map: sharedParticleGlowTex,
    size: 2.6,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
    toneMapped: false
  });
  const stars = new THREE.Points(starGeometry, starMat);
  stars.visible = false;
  scene.add(stars);

  // --- 8b. Skulpturerte parafinlykter ved Saloonen, Skredderen og Safe House ---
  const lanternGlassProfile = [
    new THREE.Vector2(0.048, -0.11),
    new THREE.Vector2(0.082, -0.04),
    new THREE.Vector2(0.086, 0.03),
    new THREE.Vector2(0.056, 0.11)
  ];
  const lanternFrameGeo = new THREE.LatheGeometry(lanternGlassProfile, 12);
  const lanternCapGeo = new THREE.ConeGeometry(0.115, 0.085, 10);
  const lanternBaseGeo = new THREE.CylinderGeometry(0.075, 0.092, 0.055, 10);
  const lanternChainGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.3, 6);
  const lanternBailGeo = new THREE.TorusGeometry(0.095, 0.008, 5, 12, Math.PI);
  const lanternMetalMat = wroughtIronMat;
  const lanternGlassMat = new THREE.MeshBasicMaterial({
    color: 0xffd27d,
    transparent: true,
    opacity: 0.62,
    fog: false,
    toneMapped: false
  });
  const lanternGlowMat = new THREE.SpriteMaterial({
    map: sharedParticleGlowTex,
    color: 0xffa648,
    transparent: true,
    opacity: 0.25,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
    toneMapped: false
  });

  function createLantern() {
    const group = new THREE.Group();

    const glass = new THREE.Mesh(lanternFrameGeo, lanternGlassMat);
    group.add(glass);

    const cap = new THREE.Mesh(lanternCapGeo, lanternMetalMat);
    cap.position.y = 0.145;
    group.add(cap);

    const base = new THREE.Mesh(lanternBaseGeo, lanternMetalMat);
    base.position.y = -0.135;
    group.add(base);

    const bail = new THREE.Mesh(lanternBailGeo, lanternMetalMat);
    bail.position.y = 0.06;
    group.add(bail);

    const chain = new THREE.Mesh(lanternChainGeo, lanternMetalMat);
    chain.position.y = 0.33;
    group.add(chain);

    const glow = new THREE.Sprite(lanternGlowMat);
    glow.scale.set(0.68, 0.68, 1);
    group.add(glow);

    // Grafikk 3.0: bred, varm additiv lyshalo rundt alle lykter
    const outerHalo = new THREE.Sprite(lanternGlowMat);
    outerHalo.scale.set(1.85, 1.85, 1);
    group.add(outerHalo);

    // Konstant lysantall: intensiteten moduleres mykt uten å fjerne lyset fra scenen
    const light = new THREE.PointLight(0xffa448, 0.5, 18, 2);
    group.add(light);

    return { group, light };
  }

  const saloonLantern = createLantern();
  saloonLantern.group.position.set(2.55, 2.72, 3.12);
  saloonBuilding.add(saloonLantern.group);

  const tailorLantern = createLantern();
  tailorLantern.group.position.set(-2.35, 3.3, 2.62);
  tailorBuilding.add(tailorLantern.group);

  const gunsmithLantern = createLantern();
  gunsmithLantern.group.position.set(-2.35, 3.3, 2.62);
  if (gunsmithBuilding) gunsmithBuilding.add(gunsmithLantern.group);

  const safeHouseLantern = createLantern();
  safeHouseLantern.group.position.set(-0.9, 2.28, 0);
  safeHouseBuilding.add(safeHouseLantern.group);

  // --- Grafikk 3.0: Stigende glør over leirbålene (byen + Crimson Canyon) uten objektallokering ---
  const EMBER_COUNT = 44;
  const emberPositions = new Float32Array(EMBER_COUNT * 3);
  const emberSeeds = new Float32Array(EMBER_COUNT * 3);
  const campfireAnchors = [
    { x: 5.1, z: 7.6 },
    { x: 82.0, z: 4.5 }
  ];
  {
    const eRng = createSeededRng(7331);
    for (let i = 0; i < EMBER_COUNT; i++) {
      const i3 = i * 3;
      const anchor = campfireAnchors[i % campfireAnchors.length];
      emberPositions[i3] = anchor.x + (eRng() - 0.5) * 0.5;
      emberPositions[i3 + 1] = 0.2 + eRng() * 2.6;
      emberPositions[i3 + 2] = anchor.z + (eRng() - 0.5) * 0.5;
      emberSeeds[i3] = eRng() * Math.PI * 2;
      emberSeeds[i3 + 1] = 0.65 + eRng() * 0.85;
      emberSeeds[i3 + 2] = i % campfireAnchors.length;
    }
  }
  const emberGeo = new THREE.BufferGeometry();
  const emberPosAttr = new THREE.BufferAttribute(emberPositions, 3);
  emberGeo.setAttribute('position', emberPosAttr);
  const emberMat = new THREE.PointsMaterial({
    map: sharedSparkGlowTex || sharedParticleGlowTex,
    color: 0xff8c2b,
    size: 0.13,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.88,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
    toneMapped: false
  });
  const emberPoints = new THREE.Points(emberGeo, emberMat);
  emberPoints.frustumCulled = false;
  scene.add(emberPoints);

  // --- Grafikk 3.0: 4 rullende ørkenbusker (Tumbleweeds) som blåser gjennom byen og ødemarken ---
  const tumbleweedMat = new THREE.MeshStandardMaterial({
    color: 0xa67c46,
    roughness: 0.92,
    metalness: 0.02,
    wireframe: false
  });
  const tumbleweedRingGeoA = new THREE.TorusGeometry(0.36, 0.022, 5, 11);
  const tumbleweedRingGeoB = new THREE.TorusGeometry(0.31, 0.018, 5, 10);
  const tumbleweeds = [];
  [
    { x: -38, z: 12.5, vx: 2.3, vz: 0.25, phase: 0.4, r: 0.42 },
    { x: 12, z: -18.5, vx: 1.95, vz: -0.32, phase: 1.9, r: 0.38 },
    { x: -72, z: -26.0, vx: 2.6, vz: 0.4, phase: 3.3, r: 0.46 },
    { x: 46, z: 24.0, vx: -2.15, vz: 0.28, phase: 4.8, r: 0.40 }
  ].forEach((spec) => {
    const holder = new THREE.Group();
    const ball = new THREE.Group();
    for (let k = 0; k < 5; k++) {
      const ring = new THREE.Mesh(k % 2 === 0 ? tumbleweedRingGeoA : tumbleweedRingGeoB, tumbleweedMat);
      ring.rotation.set(k * 0.68, k * 1.12, k * 0.45);
      ring.castShadow = true;
      ball.add(ring);
    }
    holder.add(ball);
    if (createContactShadow) {
      holder.add(createContactShadow(spec.r * 1.05, spec.r * 1.05, -spec.r + 0.03));
    }
    holder.position.set(spec.x, spec.r, spec.z);
    scene.add(holder);
    tumbleweeds.push({ holder, ball, vx: spec.vx, vz: spec.vz, phase: spec.phase, r: spec.r });
  });

  function updateTumbleweeds(dt, worldTime, getTerrainHeightFn) {
    for (let i = 0; i < tumbleweeds.length; i++) {
      const tw = tumbleweeds[i];
      const gust = 0.85 + 0.35 * Math.sin(worldTime * 0.55 + tw.phase);
      let nx = tw.holder.position.x + tw.vx * gust * dt;
      let nz = tw.holder.position.z + tw.vz * gust * dt;
      if (nx > 115) nx = -115;
      else if (nx < -115) nx = 115;
      if (nz > 115) nz = -115;
      else if (nz < -115) nz = 115;

      const groundY = getTerrainHeightFn ? getTerrainHeightFn(nx, nz) : 0;
      const bounce = Math.abs(Math.sin(worldTime * 3.8 + tw.phase)) * 0.22;
      tw.holder.position.set(nx, groundY + tw.r + bounce, nz);
      tw.ball.rotation.z -= (tw.vx * gust * dt) / tw.r;
      tw.ball.rotation.x += (tw.vz * gust * dt) / tw.r;
    }
  }

  // --- 8b2. Svevende støvkorn (dag) og glør/ildfluer (natt) med ett delt THREE.Points (200 partikler) ---
  const AMBIENT_PARTICLE_COUNT = 200; // Under maksgrensen på 220, null objektallokeringer per frame
  const AMBIENT_BOX_HALF = 14.0;
  const AMBIENT_BOX_SPAN = AMBIENT_BOX_HALF * 2;
  const ambientPositions = new Float32Array(AMBIENT_PARTICLE_COUNT * 3);
  const ambientSeeds = new Float32Array(AMBIENT_PARTICLE_COUNT * 3);
  {
    const pRng = createSeededRng(5150);
    for (let i = 0; i < AMBIENT_PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      ambientPositions[i3] = (pRng() - 0.5) * AMBIENT_BOX_SPAN;
      ambientPositions[i3 + 1] = 0.25 + pRng() * 4.2;
      ambientPositions[i3 + 2] = (pRng() - 0.5) * AMBIENT_BOX_SPAN;
      ambientSeeds[i3] = pRng() * Math.PI * 2;     // fase
      ambientSeeds[i3 + 1] = 0.25 + pRng() * 0.55; // hastighet
      ambientSeeds[i3 + 2] = (pRng() - 0.5) * 0.5; // sidevind
    }
  }
  const ambientGeo = new THREE.BufferGeometry();
  const ambientPosAttr = new THREE.BufferAttribute(ambientPositions, 3);
  ambientGeo.setAttribute('position', ambientPosAttr);

  const dayDustColor = new THREE.Color(0xffe1a6);
  const nightEmberColor = new THREE.Color(0xff9c38);
  const ambientParticleMat = new THREE.PointsMaterial({
    map: sharedParticleGlowTex,
    color: 0xffe1a6,
    size: 0.115,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.52,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
    toneMapped: false
  });
  const ambientParticles = new THREE.Points(ambientGeo, ambientParticleMat);
  ambientParticles.frustumCulled = false;
  scene.add(ambientParticles);

  function updateAmbientParticles(dt, playerPos, nightAmount, worldTime, getTerrainHeightFn) {
    const px = playerPos.x;
    const py = playerPos.y;
    const pz = playerPos.z;
    const night = nightAmount;

    ambientParticleMat.color.copy(dayDustColor).lerp(nightEmberColor, night);
    ambientParticleMat.size = 0.105 + night * 0.045;
    ambientParticleMat.opacity = 0.44 + night * 0.34 + Math.sin(worldTime * 2.1) * 0.05;

    const windX = 0.28 + Math.sin(worldTime * 0.35) * 0.18;
    const riseFactor = -0.06 + night * 0.28;

    for (let i = 0; i < AMBIENT_PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const phase = ambientSeeds[i3];
      const spd = ambientSeeds[i3 + 1];
      const driftZ = ambientSeeds[i3 + 2];

      let x = ambientPositions[i3] + (windX * spd + Math.sin(worldTime * 1.3 + phase) * 0.16) * dt;
      let y = ambientPositions[i3 + 1] + (riseFactor * spd + Math.cos(worldTime * 1.7 + phase) * 0.14) * dt;
      let z = ambientPositions[i3 + 2] + (driftZ + Math.cos(worldTime * 1.1 + phase) * 0.16) * dt;

      const dx = x - px;
      if (dx > AMBIENT_BOX_HALF) x -= AMBIENT_BOX_SPAN;
      else if (dx < -AMBIENT_BOX_HALF) x += AMBIENT_BOX_SPAN;

      const dz = z - pz;
      if (dz > AMBIENT_BOX_HALF) z -= AMBIENT_BOX_SPAN;
      else if (dz < -AMBIENT_BOX_HALF) z += AMBIENT_BOX_SPAN;

      const minY = py + 0.22;
      const maxY = py + 4.6;
      if (y > maxY) y = minY + (y - maxY) % 4.38;
      else if (y < minY) y = maxY - (minY - y) % 4.38;

      ambientPositions[i3] = x;
      ambientPositions[i3 + 1] = y;
      ambientPositions[i3 + 2] = z;
    }
    ambientPosAttr.needsUpdate = true;

    // Oppdater stigende gnister over leirbålene (0 allokeringer)
    for (let i = 0; i < EMBER_COUNT; i++) {
      const i3 = i * 3;
      const phase = emberSeeds[i3];
      const spd = emberSeeds[i3 + 1];
      const aIdx = emberSeeds[i3 + 2] | 0;
      const anchor = campfireAnchors[aIdx];
      const baseY = getTerrainHeightFn ? getTerrainHeightFn(anchor.x, anchor.z) : 0;

      let ey = emberPositions[i3 + 1] + spd * 1.15 * dt;
      if (ey > baseY + 3.1) {
        ey = baseY + 0.22;
        emberPositions[i3] = anchor.x + Math.sin(worldTime * 3.7 + phase) * 0.22;
        emberPositions[i3 + 2] = anchor.z + Math.cos(worldTime * 4.1 + phase) * 0.22;
      } else {
        emberPositions[i3] += Math.sin(worldTime * 2.8 + phase) * 0.22 * dt;
        emberPositions[i3 + 2] += Math.cos(worldTime * 2.4 + phase) * 0.18 * dt;
      }
      emberPositions[i3 + 1] = ey;
    }
    emberPosAttr.needsUpdate = true;

    if (getTerrainHeightFn) {
      updateTumbleweeds(dt, worldTime, getTerrainHeightFn);
    }
  }

  // --- 8d. Rød skadevignett som også vises inne i VR-headsettet ---
  const vignetteCanvas = document.createElement('canvas');
  vignetteCanvas.width = 256;
  vignetteCanvas.height = 256;
  const vignetteCtx = vignetteCanvas.getContext('2d');
  const vignetteGradient = vignetteCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
  vignetteGradient.addColorStop(0, 'rgba(150, 0, 0, 0)');
  vignetteGradient.addColorStop(0.55, 'rgba(150, 0, 0, 0)');
  vignetteGradient.addColorStop(0.68, 'rgba(180, 0, 0, 0.18)');
  vignetteGradient.addColorStop(0.83, 'rgba(205, 0, 0, 0.55)');
  vignetteGradient.addColorStop(1, 'rgba(235, 0, 0, 0.95)');
  vignetteCtx.fillStyle = vignetteGradient;
  vignetteCtx.fillRect(0, 0, 256, 256);

  const damageVignetteTexture = new THREE.CanvasTexture(vignetteCanvas);
  damageVignetteTexture.colorSpace = THREE.SRGBColorSpace;
  const damageVignetteMat = new THREE.MeshBasicMaterial({
    map: damageVignetteTexture,
    transparent: true,
    opacity: 0,
    depthTest: false,
    depthWrite: false,
    fog: false,
    side: THREE.DoubleSide,
    toneMapped: false
  });
  const damageVignetteMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), damageVignetteMat);
  damageVignetteMesh.position.set(0, 0, -0.45);
  damageVignetteMesh.renderOrder = 999;
  damageVignetteMesh.visible = false;
  camera.add(damageVignetteMesh);

  function flashDamageVignette(duration = 0.28) {
    damageVignetteTimer = Math.max(damageVignetteTimer, duration);
    damageVignetteMesh.visible = true;
  }

  function updateDamageVignette(dt) {
    if (damageVignetteTimer > 0) {
      damageVignetteTimer = Math.max(0, damageVignetteTimer - dt);
      damageVignetteMat.opacity = Math.min(1, damageVignetteTimer / 0.28) * 0.9;
      damageVignetteMesh.visible = true;
    } else if (damageVignetteMesh.visible) {
      damageVignetteMesh.visible = false;
      damageVignetteMat.opacity = 0;
    }
  }

  // --- 8e. Object Pool (25) med glitrende tomhylser i messing ---
  const SHELL_POOL_SIZE = 25;
  const shellGeo = new THREE.CylinderGeometry(0.0085, 0.0092, 0.034, 8);
  const shellMat = new THREE.MeshStandardMaterial({
    color: 0xe6b64c,
    metalness: 0.92,
    roughness: 0.22,
    envMapIntensity: 1.45
  });
  const shellPool = [];
  for (let i = 0; i < SHELL_POOL_SIZE; i++) {
    const m = new THREE.Mesh(shellGeo, shellMat);
    m.visible = false;
    scene.add(m);
    shellPool.push({
      mesh: m,
      active: false,
      life: 0,
      vx: 0, vy: 0, vz: 0,
      rx: 0, ry: 0, rz: 0,
      bounced: false
    });
  }
  let shellPoolCursor = 0;

  function ejectShellCasing(origin, rightVec, upVec, fwdVec, count = 1, onBounceSfx = null) {
    for (let c = 0; c < count; c++) {
      const slot = shellPool[shellPoolCursor];
      shellPoolCursor = (shellPoolCursor + 1) % SHELL_POOL_SIZE;
      const m = slot.mesh;
      m.position.copy(origin);
      m.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      m.visible = true;
      const sideSpeed = 1.65 + Math.random() * 0.95 + c * 0.25;
      const upSpeed = 1.55 + Math.random() * 0.65;
      const backSpeed = -0.35 - Math.random() * 0.45;
      slot.vx = rightVec.x * sideSpeed + upVec.x * upSpeed + fwdVec.x * backSpeed;
      slot.vy = rightVec.y * sideSpeed + upVec.y * upSpeed + fwdVec.y * backSpeed;
      slot.vz = rightVec.z * sideSpeed + upVec.z * upSpeed + fwdVec.z * backSpeed;
      slot.rx = (Math.random() - 0.5) * 18;
      slot.ry = (Math.random() - 0.5) * 16;
      slot.rz = (Math.random() - 0.5) * 18;
      slot.life = 4.5;
      slot.bounced = false;
      slot.onBounceSfx = onBounceSfx;
      slot.active = true;
    }
  }

  function updateShellCasings(dt, getTerrainHeightFn) {
    for (let i = 0; i < SHELL_POOL_SIZE; i++) {
      const s = shellPool[i];
      if (!s.active) continue;
      s.life -= dt;
      if (s.life <= 0) {
        s.active = false;
        s.mesh.visible = false;
        continue;
      }
      const m = s.mesh;
      s.vy -= 9.8 * dt;
      m.position.x += s.vx * dt;
      m.position.y += s.vy * dt;
      m.position.z += s.vz * dt;
      m.rotation.x += s.rx * dt;
      m.rotation.y += s.ry * dt;
      m.rotation.z += s.rz * dt;

      const floorY = getTerrainHeightFn ? getTerrainHeightFn(m.position.x, m.position.z, m.position.y) : 0;
      if (m.position.y <= floorY + 0.018) {
        m.position.y = floorY + 0.018;
        if (!s.bounced) {
          s.bounced = true;
          s.vy = Math.abs(s.vy) * 0.34;
          s.vx *= 0.42;
          s.vz *= 0.42;
          s.rx *= 0.35;
          s.ry *= 0.35;
          s.rz *= 0.35;
          if (s.onBounceSfx) s.onBounceSfx();
        } else {
          s.vy = 0;
          s.vx *= 0.84;
          s.vz *= 0.84;
          s.rx = s.ry = s.rz = 0;
          m.rotation.x = Math.PI * 0.5;
        }
      }
    }
  }

  // --- 8f. Blodmåne-visuell effekt (Level 8 Finale) ---
  function updateBloodMoonVisuals(bloodMoonBlend) {
    const b = Math.max(0, Math.min(1, bloodMoonBlend));
    if (b <= 0.01) {
      moonMesh.material.color.setHex(0xe8f0ff);
      moonHaloMat.color.setHex(0xaec8ff);
      moonHalo.scale.set(28, 28, 1);
      moonGroup.scale.setScalar(1.0);
    } else {
      moonMesh.material.color.setHex(0xe8f0ff).lerp(new THREE.Color(0xff2b38), b);
      moonHaloMat.color.setHex(0xaec8ff).lerp(new THREE.Color(0xff1428), b);
      const hScale = 28 + b * 24;
      moonHalo.scale.set(hScale, hScale, 1);
      moonGroup.scale.setScalar(1.0 + b * 0.35);
      moonMesh.material.opacity = Math.max(moonMesh.material.opacity, 0.85 * b);
      moonHaloMat.opacity = Math.max(moonHaloMat.opacity, 0.72 * b);
      moonGroup.visible = true;
    }
  }

  return {
    createRevolver,
    createWeaponModel,
    createThrownDynamiteMesh,
    upgradeRevolverToGold,
    practiceBottles,
    moonMesh,
    moonHaloMat,
    moonGroup,
    starMat,
    stars,
    lanternGlassMat,
    lanternGlowMat,
    saloonLantern,
    tailorLantern,
    gunsmithLantern,
    safeHouseLantern,
    updateAmbientParticles,
    ejectShellCasing,
    updateShellCasings,
    updateBloodMoonVisuals,
    flashDamageVignette,
    updateDamageVignette
  };
}
