import * as THREE from 'three';
import { instantiateCharacterGLB } from './glb-utils.js';

export function initCreatureModels(M, tailorBlockHitMeshes, loadedAssets = null) {
  const {
    sharedWoodTex, sharedWoodBumpTex, sharedFoliageBumpTex,
    sharedLeatherTex, sharedLeatherNormalTex, sharedLeatherRoughTex,
    polishedBrassMat, wroughtIronMat, sharedRedEyeGlowTex, sharedSparkGlowTex,
    createContactShadow, applyCharacterRimLighting
  } = M;

  function instantiateGLTFCreature(gltf, prefix, targetHeight = 1.82, desiredForwardZ = -1, tintColorHex = null) {
    return instantiateCharacterGLB(gltf, M, {
      prefix,
      targetHeight,
      desiredForwardZ,
      tintColorHex
    });
  }

  // --- Felles skulpturert Cowboyhatt (LatheGeometry nedenfra-og-opp med utadrettede normaler, glatt krone og buet brem) ---
  function buildSculptedCowboyHatGeo() {
    // VIKTIG: I Three.js LatheGeometry må profilpunktene gå NEDENFRA OG OPP (stigende Y langs ytterveggen)
    // for at trekant-normalene skal peke UTAD (ellers vrenges hatten på vrangen og fronten blir usynlig!).
    const rawControlPts = [
      new THREE.Vector2(0.154, 0.028),  // Innvendig svetterem
      new THREE.Vector2(0.172, -0.004), // Underside brem-rot
      new THREE.Vector2(0.275, -0.014), // Underside midtre brem
      new THREE.Vector2(0.358, 0.004),  // Ytterkant brem nede
      new THREE.Vector2(0.362, 0.018),  // Ytterkant brem oppe
      new THREE.Vector2(0.276, 0.005),  // Overside midtre brem
      new THREE.Vector2(0.186, 0.014),  // Brem-rot ved hattebånd
      new THREE.Vector2(0.182, 0.048),  // Nedre kronevegg
      new THREE.Vector2(0.174, 0.115),  // Midtre kronevegg
      new THREE.Vector2(0.160, 0.178),  // Øvre kronevegg
      new THREE.Vector2(0.132, 0.226),  // Krone-skulder (Cattleman ridge)
      new THREE.Vector2(0.068, 0.212),  // Midtre kronegrop
      new THREE.Vector2(0.001, 0.220)   // Topp senter (lukket)
    ];
    const smoothCurve = new THREE.SplineCurve(rawControlPts);
    const profile = smoothCurve.getPoints(32);
    profile[profile.length - 1].x = 0.0005;

    const geo = new THREE.LatheGeometry(profile, 48);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);
      const r = Math.hypot(x, z);
      // Klassisk Stetson-fasong: oval hodeform (lengre foran/bak), oppbøyd sidebrem og front-knekk (pinch)
      z *= 1.14;
      x *= 0.95;
      if (r > 0.188) {
        const sideFrac = Math.abs(x) / 0.34;
        y += sideFrac * sideFrac * 0.082;
        if (z < -0.15) y -= 0.020; // Svak cowboy-dupp foran på bremmen
      } else if (y > 0.125 && z < 0) {
        const pinch = Math.max(0, -z / 0.19) * ((y - 0.125) / 0.105);
        x *= 1 - pinch * 0.22;
      }
      pos.setXYZ(i, x, y, z);
    }
    geo.computeVertexNormals();
    return geo;
  }

  const sharedCowboyHatGeo = buildSculptedCowboyHatGeo();
  const sharedHatBandGeo = new THREE.TorusGeometry(0.181, 0.015, 10, 36);
  sharedHatBandGeo.rotateX(Math.PI / 2);
  sharedHatBandGeo.scale(0.95, 1, 1.13);

  function createSculptedCowboyHat(hatMat, bandMat = polishedBrassMat) {
    const g = new THREE.Group();
    const hatMesh = new THREE.Mesh(sharedCowboyHatGeo, hatMat);
    hatMesh.castShadow = true;
    hatMesh.receiveShadow = true;
    g.add(hatMesh);

    const band = new THREE.Mesh(sharedHatBandGeo, bandMat);
    band.position.y = 0.028;
    band.castShadow = true;
    g.add(band);

    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.028, 0.012), polishedBrassMat);
    buckle.position.set(-0.172, 0.028, -0.04);
    buckle.rotation.y = 0.35;
    g.add(buckle);
    return g;
  }

  const sharedStetsonDarkBrownMat = new THREE.MeshStandardMaterial({
    color: 0x462916,
    map: sharedLeatherTex || sharedWoodTex,
    normalMap: sharedLeatherNormalTex || null,
    roughnessMap: sharedLeatherRoughTex || null,
    roughness: 0.78,
    metalness: 0.02,
    envMapIntensity: 0.38,
    side: THREE.DoubleSide
  });
  const sharedStetsonSaddleMat = new THREE.MeshStandardMaterial({
    color: 0x5c361d,
    map: sharedLeatherTex || sharedWoodTex,
    normalMap: sharedLeatherNormalTex || null,
    roughnessMap: sharedLeatherRoughTex || null,
    roughness: 0.76,
    metalness: 0.02,
    envMapIntensity: 0.38,
    side: THREE.DoubleSide
  });
  const sharedStetsonOutlawMat = new THREE.MeshStandardMaterial({
    color: 0x241913,
    map: sharedLeatherTex || sharedWoodTex,
    normalMap: sharedLeatherNormalTex || null,
    roughnessMap: sharedLeatherRoughTex || null,
    roughness: 0.82,
    metalness: 0.02,
    envMapIntensity: 0.34,
    side: THREE.DoubleSide
  });
  const sharedStetsonCreamMat = new THREE.MeshStandardMaterial({
    color: 0xe6d5b8,
    roughnessMap: sharedLeatherRoughTex || null,
    normalMap: sharedLeatherNormalTex || null,
    normalScale: new THREE.Vector2(0.22, 0.22),
    roughness: 0.82,
    metalness: 0.0,
    envMapIntensity: 0.36,
    side: THREE.DoubleSide
  });
  const sharedHolsterLeatherMat = new THREE.MeshStandardMaterial({
    color: 0x3b2010,
    map: sharedLeatherTex || null,
    normalMap: sharedLeatherNormalTex || null,
    roughnessMap: sharedLeatherRoughTex || null,
    roughness: 0.68,
    metalness: 0.04,
    envMapIntensity: 0.40
  });
  const sharedCrimsonClothMat = new THREE.MeshStandardMaterial({
    color: 0x9e1b1b,
    roughness: 0.88,
    metalness: 0.0,
    envMapIntensity: 0.30
  });

  function attachWesternHumanGear(model, group, opts = {}) {
    const headBone = model.getObjectByName('head') || model.getObjectByName('Head');
    const chestBone = model.getObjectByName('spine_03') || model.getObjectByName('spine_02');
    const pelvisBone = model.getObjectByName('pelvis');
    const handRBone = model.getObjectByName('hand_r');

    if (opts.hatMat && headBone) {
      const hat = createSculptedCowboyHat(opts.hatMat, opts.bandMat || polishedBrassMat);
      // MakeHuman head bone har +Y opp og +Z fremover; tilpasset ekte menneskeskalle-proporsjoner
      hat.rotation.set(opts.hatTiltX || 0.04, Math.PI, opts.hatTiltZ || 0);
      hat.position.set(0, 0.075, -0.002);
      hat.scale.setScalar((opts.hatScale || 0.56) * 1.11);
      headBone.add(hat);
    }

    if (opts.bandana && headBone) {
      const bd = new THREE.Mesh(
        new THREE.ConeGeometry(0.092, 0.135, 12),
        sharedCrimsonClothMat
      );
      bd.rotation.x = Math.PI - 0.18;
      bd.scale.set(0.92, 1.0, 1.06);
      bd.position.set(0, -0.032, 0.044);
      headBone.add(bd);
    }

    if (opts.holster && pelvisBone) {
      const hol = new THREE.Mesh(
        new THREE.ConeGeometry(0.048, 0.21, 9),
        sharedHolsterLeatherMat
      );
      hol.rotation.x = Math.PI;
      hol.rotation.z = -0.14;
      hol.position.set(-0.185, -0.08, 0.02);
      pelvisBone.add(hol);
    }

    return { headBone, chestBone, pelvisBone, handRBone };
  }

  function createTailorNPC() {
    const tailorNpcGLTF = loadedAssets && loadedAssets.tailorNpc;
    if (tailorNpcGLTF && tailorNpcGLTF.scene) {
      const { group: npc, model } = instantiateGLTFCreature(tailorNpcGLTF, 'tailorNpc', 1.80, 1);
      if (createContactShadow) npc.add(createContactShadow(0.46, 0.46, 0.015));

      const { chestBone } = attachWesternHumanGear(model, npc, {
        hatMat: sharedStetsonDarkBrownMat,
        bandMat: polishedBrassMat,
        hatScale: 0.55,
        hatTiltX: -0.03
      });
      if (chestBone) {
        const tapeRing = new THREE.Mesh(
          new THREE.TorusGeometry(0.115, 0.011, 6, 18, Math.PI * 1.35),
          new THREE.MeshStandardMaterial({ color: 0xf0d258, roughness: 0.62 })
        );
        tapeRing.rotation.set(Math.PI * 0.46, 0, Math.PI * 0.82);
        tapeRing.position.set(0, 0.21, 0.045);
        chestBone.add(tapeRing);
      }

      const npcShield = new THREE.Mesh(
        new THREE.BoxGeometry(0.85, 1.95, 0.6),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      npcShield.position.set(0, 1.0, 0);
      npc.add(npcShield);
      tailorBlockHitMeshes.push(npcShield);

      return npc;
    }

    const npc = new THREE.Group();
    if (createContactShadow) npc.add(createContactShadow(0.46, 0.46, 0.015));

    const trouserMat = new THREE.MeshStandardMaterial({ color: 0x2f251d, roughness: 0.88 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x1d130c, roughness: 0.55, metalness: 0.08 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0xf4ead4, roughness: 0.85 });
    const vestMat = new THREE.MeshStandardMaterial({ color: 0x7e1e28, roughness: 0.68, metalness: 0.05 });
    const tieMat = new THREE.MeshStandardMaterial({ color: 0x1f4368, roughness: 0.55 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xdca780, roughness: 0.72 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x382010, roughness: 0.82 });
    const hatMat = new THREE.MeshStandardMaterial({
      color: 0x4b2c17,
      map: sharedWoodTex,
      bumpMap: sharedWoodBumpTex,
      bumpScale: 0.06,
      roughness: 0.78
    });
    const tapeMat = new THREE.MeshStandardMaterial({ color: 0xf0d258, roughness: 0.55 });

    // Organiske støvler og ben (CapsuleGeometry i stedet for klosser)
    [-0.125, 0.125].forEach((lx) => {
      const bootShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.068, 0.24, 10), bootMat);
      bootShaft.position.set(lx, 0.14, 0);
      npc.add(bootShaft);

      const bootFoot = new THREE.Mesh(new THREE.CapsuleGeometry(0.062, 0.11, 5, 10), bootMat);
      bootFoot.rotation.x = Math.PI / 2;
      bootFoot.position.set(lx, 0.062, 0.048);
      npc.add(bootFoot);

      const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.082, 0.42, 5, 10), trouserMat);
      thigh.position.set(lx, 0.52, 0);
      npc.add(thigh);
    });

    // Skulpturert hofte, skjortebryst og innsvinget skreddervest (LatheGeometry)
    const pelvis = new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 8), trouserMat);
    pelvis.scale.set(1.05, 0.68, 0.74);
    pelvis.position.set(0, 0.78, 0);
    npc.add(pelvis);

    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.222, 0.226, 0.065, 16), bootMat);
    belt.scale.set(1.02, 1, 0.74);
    belt.position.set(0, 0.83, 0.005);
    npc.add(belt);

    const buckle = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.009, 6, 12), polishedBrassMat);
    buckle.position.set(0, 0.83, 0.168);
    npc.add(buckle);

    const vestProfile = [
      new THREE.Vector2(0.001, 0.0),
      new THREE.Vector2(0.215, 0.0),
      new THREE.Vector2(0.198, 0.18),
      new THREE.Vector2(0.228, 0.40),
      new THREE.Vector2(0.185, 0.54),
      new THREE.Vector2(0.105, 0.58),
      new THREE.Vector2(0.001, 0.58)
    ];
    const vestGeo = new THREE.LatheGeometry(vestProfile, 18);
    vestGeo.scale(1.05, 1, 0.68);
    const vestMesh = new THREE.Mesh(vestGeo, vestMat);
    vestMesh.position.set(0, 0.85, 0);
    vestMesh.castShadow = true;
    npc.add(vestMesh);

    // Hvit skjorte-V og krage + silkeslips
    const shirtFront = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.28, 10), shirtMat);
    shirtFront.rotation.x = Math.PI;
    shirtFront.scale.set(0.95, 1, 0.45);
    shirtFront.position.set(0, 1.32, 0.115);
    npc.add(shirtFront);

    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.024, 7, 14), shirtMat);
    collar.rotation.x = Math.PI / 2 + 0.12;
    collar.position.set(0, 1.43, 0.015);
    npc.add(collar);

    const tieCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 1.41, 0.125),
      new THREE.Vector3(0, 1.31, 0.158),
      new THREE.Vector3(0, 1.21, 0.154)
    ]);
    const tieMesh = new THREE.Mesh(new THREE.TubeGeometry(tieCurve, 8, 0.024, 6, false), tieMat);
    tieMesh.scale.set(1.2, 1, 0.45);
    npc.add(tieMesh);

    [0.95, 1.06, 1.17].forEach((by) => {
      const btn = new THREE.Mesh(new THREE.SphereGeometry(0.015, 7, 6), polishedBrassMat);
      btn.position.set(0, by, 0.154);
      npc.add(btn);
    });

    // Målebånd skulpturert naturlig rundt nakken og ned langs vesten (TubeGeometry)
    const tapeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.125, 0.96, 0.155),
      new THREE.Vector3(-0.13, 1.25, 0.152),
      new THREE.Vector3(-0.095, 1.45, 0.03),
      new THREE.Vector3(0, 1.465, -0.085),
      new THREE.Vector3(0.095, 1.45, 0.03),
      new THREE.Vector3(0.13, 1.25, 0.152),
      new THREE.Vector3(0.12, 0.94, 0.155)
    ]);
    const tapeMesh = new THREE.Mesh(new THREE.TubeGeometry(tapeCurve, 22, 0.014, 6, false), tapeMat);
    npc.add(tapeMesh);

    // Skuldre, overarmer, oppbrettede ermer og underarmer (CapsuleGeometry)
    [-1, 1].forEach((side) => {
      const upperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.064, 0.22, 5, 10), shirtMat);
      upperArm.position.set(side * 0.265, 1.26, 0.02);
      upperArm.rotation.z = side * -0.22;
      upperArm.rotation.x = -0.24;
      upperArm.castShadow = true;
      npc.add(upperArm);

      const rolledCuff = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.018, 6, 12), shirtMat);
      rolledCuff.rotation.x = Math.PI / 2 - 0.35;
      rolledCuff.position.set(side * 0.305, 1.11, 0.08);
      npc.add(rolledCuff);

      const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.2, 5, 9), skinMat);
      forearm.position.set(side * 0.29, 0.99, 0.16);
      forearm.rotation.x = -0.68;
      forearm.rotation.z = side * 0.12;
      npc.add(forearm);

      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.056, 9, 7), skinMat);
      hand.scale.set(0.95, 0.85, 1.15);
      hand.position.set(side * 0.27, 0.89, 0.25);
      npc.add(hand);
    });

    // Hals, skulpturert hode med kjeve/kinnben og snurrebart (TubeGeometry)
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.078, 0.12, 10), skinMat);
    neck.position.set(0, 1.47, 0.01);
    npc.add(neck);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.152, 14, 12), skinMat);
    head.scale.set(0.94, 1.08, 0.98);
    head.position.set(0, 1.6, 0.015);
    head.castShadow = true;
    npc.add(head);

    const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.115, 10, 8), skinMat);
    jaw.scale.set(0.92, 0.85, 0.95);
    jaw.position.set(0, 1.52, 0.042);
    npc.add(jaw);

    [-1, 1].forEach((side) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.032, 7, 6), skinMat);
      ear.scale.set(0.45, 0.95, 0.7);
      ear.position.set(side * 0.142, 1.59, 0.01);
      npc.add(ear);

      const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.022, 7, 6), shirtMat);
      eyeWhite.position.set(side * 0.052, 1.62, 0.145);
      npc.add(eyeWhite);

      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), bootMat);
      pupil.position.set(side * 0.052, 1.62, 0.162);
      npc.add(pupil);

      const browCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.022, 1.652, 0.152),
        new THREE.Vector3(side * 0.055, 1.662, 0.150),
        new THREE.Vector3(side * 0.084, 1.648, 0.138)
      ]);
      npc.add(new THREE.Mesh(new THREE.TubeGeometry(browCurve, 6, 0.0085, 5, false), hairMat));

      // Ekte svungen handlebar-bart
      const stacheCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 1.542, 0.168),
        new THREE.Vector3(side * 0.048, 1.536, 0.162),
        new THREE.Vector3(side * 0.098, 1.522, 0.142),
        new THREE.Vector3(side * 0.128, 1.548, 0.132)
      ]);
      const stache = new THREE.Mesh(new THREE.TubeGeometry(stacheCurve, 10, 0.016, 6, false), hairMat);
      npc.add(stache);
    });

    const nose = new THREE.Mesh(new THREE.CapsuleGeometry(0.019, 0.028, 4, 7), skinMat);
    nose.rotation.x = 0.35;
    nose.position.set(0, 1.585, 0.168);
    npc.add(nose);

    // Skulpturert Stetson-hatt med buet brem
    const tailorHat = createSculptedCowboyHat(hatMat, polishedBrassMat);
    tailorHat.position.set(0, 1.71, 0.012);
    tailorHat.rotation.x = -0.06;
    tailorHat.scale.setScalar(0.92);
    npc.add(tailorHat);

    const npcShield = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 1.95, 0.6),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    npcShield.position.set(0, 1.0, 0);
    npc.add(npcShield);
    tailorBlockHitMeshes.push(npcShield);

    return npc;
  }

  // --- Skulpturert Hjort (CapsuleGeometry, S-buet TubeGeometry-hals og forgrenet gevir) ---
  const deerFurMat = new THREE.MeshStandardMaterial({
    color: 0x9c6135,
    bumpMap: sharedFoliageBumpTex,
    bumpScale: 0.03,
    roughness: 0.84
  });
  const deerLightFurMat = new THREE.MeshStandardMaterial({ color: 0xe8cfb0, roughness: 0.86 });
  const deerDarkMat = new THREE.MeshStandardMaterial({ color: 0x261810, roughness: 0.45 });
  const deerAntlerMat = new THREE.MeshStandardMaterial({
    color: 0xe5d6b5,
    bumpMap: sharedWoodBumpTex,
    bumpScale: 0.04,
    roughness: 0.62
  });
  const deerEyeMat = new THREE.MeshStandardMaterial({ color: 0x120d0a, roughness: 0.15, envMapIntensity: 1.4 });

  const deerTorsoGeo = new THREE.CapsuleGeometry(0.245, 0.66, 7, 14);
  deerTorsoGeo.rotateX(Math.PI / 2);
  deerTorsoGeo.scale(0.92, 1.02, 1.0);
  const deerBellyGeo = new THREE.CapsuleGeometry(0.19, 0.58, 5, 10);
  deerBellyGeo.rotateX(Math.PI / 2);
  deerBellyGeo.scale(0.86, 0.48, 1.0);
  const deerChestSphereGeo = new THREE.SphereGeometry(0.255, 12, 10);
  const deerHaunchSphereGeo = new THREE.SphereGeometry(0.245, 12, 10);

  const deerNeckCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.96, -0.38),
    new THREE.Vector3(0, 1.14, -0.54),
    new THREE.Vector3(0, 1.33, -0.64),
    new THREE.Vector3(0, 1.44, -0.71)
  ]);
  const deerNeckGeo = new THREE.TubeGeometry(deerNeckCurve, 12, 0.115, 10, false);

  const deerCraniumGeo = new THREE.SphereGeometry(0.135, 12, 10);
  const deerMuzzleGeo = new THREE.CapsuleGeometry(0.072, 0.18, 5, 10);
  deerMuzzleGeo.rotateX(Math.PI / 2);
  const deerNoseGeo = new THREE.SphereGeometry(0.042, 8, 6);
  const deerEyeGeo = new THREE.SphereGeometry(0.025, 8, 6);
  const deerEarGeo = new THREE.ConeGeometry(0.056, 0.21, 8);
  deerEarGeo.scale(0.62, 1, 1.1);

  const deerUpperLegGeo = new THREE.CapsuleGeometry(0.058, 0.30, 5, 9);
  const deerLowerLegGeo = new THREE.CapsuleGeometry(0.036, 0.34, 4, 8);
  const deerHoofGeo = new THREE.CylinderGeometry(0.036, 0.046, 0.075, 8);
  const deerTailGeo = new THREE.ConeGeometry(0.072, 0.23, 8);

  function buildAntlerSideGroup(side) {
    const antlerGroup = new THREE.Group();
    const beamCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.055, 1.53, -0.73),
      new THREE.Vector3(side * 0.14, 1.66, -0.69),
      new THREE.Vector3(side * 0.20, 1.79, -0.74),
      new THREE.Vector3(side * 0.16, 1.91, -0.84)
    ]);
    antlerGroup.add(new THREE.Mesh(new THREE.TubeGeometry(beamCurve, 12, 0.015, 6, false), deerAntlerMat));

    const browTine = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.11, 1.61, -0.71),
      new THREE.Vector3(side * 0.12, 1.67, -0.83),
      new THREE.Vector3(side * 0.09, 1.73, -0.89)
    ]);
    antlerGroup.add(new THREE.Mesh(new THREE.TubeGeometry(browTine, 7, 0.0105, 5, false), deerAntlerMat));

    const trezTine = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.18, 1.73, -0.72),
      new THREE.Vector3(side * 0.25, 1.83, -0.77),
      new THREE.Vector3(side * 0.24, 1.92, -0.82)
    ]);
    antlerGroup.add(new THREE.Mesh(new THREE.TubeGeometry(trezTine, 7, 0.0105, 5, false), deerAntlerMat));

    const backFork = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.19, 1.81, -0.75),
      new THREE.Vector3(side * 0.21, 1.90, -0.68)
    ]);
    antlerGroup.add(new THREE.Mesh(new THREE.TubeGeometry(backFork, 5, 0.0095, 5, false), deerAntlerMat));
    return antlerGroup;
  }

  function addQuadrupedFootShadows(group, footCoords, footRadius = 0.16) {
    if (!createContactShadow) return;
    for (let i = 0; i < footCoords.length; i++) {
      const sh = createContactShadow(footRadius, footRadius, 0.020);
      sh.position.x = footCoords[i][0];
      sh.position.z = footCoords[i][1];
      group.add(sh);
    }
  }

  function createDeerModel() {
    const deerGLTF = loadedAssets && loadedAssets.deer;
    if (deerGLTF && deerGLTF.scene) {
      const { group, model } = instantiateGLTFCreature(deerGLTF, 'deer', 1.86, -1);
      if (createContactShadow) group.add(createContactShadow(0.64, 1.04));
      addQuadrupedFootShadows(group, [[-0.16, -0.37], [0.16, -0.37], [-0.16, 0.37], [0.16, 0.37]], 0.15);
      group.userData.legs = [0, 1, 2, 3]
        .map((i) => model.getObjectByName(`leg${i}`))
        .filter(Boolean);
      return group;
    }

    const group = new THREE.Group();
    if (createContactShadow) group.add(createContactShadow(0.58, 0.92));

    const body = new THREE.Mesh(deerTorsoGeo, deerFurMat);
    body.position.set(0, 0.94, 0.05);
    body.castShadow = true;
    group.add(body);

    const chest = new THREE.Mesh(deerChestSphereGeo, deerFurMat);
    chest.scale.set(0.92, 1.05, 1.08);
    chest.position.set(0, 0.95, -0.34);
    chest.castShadow = true;
    group.add(chest);

    const haunch = new THREE.Mesh(deerHaunchSphereGeo, deerFurMat);
    haunch.scale.set(0.92, 1.04, 1.08);
    haunch.position.set(0, 0.96, 0.39);
    haunch.castShadow = true;
    group.add(haunch);

    const belly = new THREE.Mesh(deerBellyGeo, deerLightFurMat);
    belly.position.set(0, 0.75, 0.04);
    group.add(belly);

    const chestPatch = new THREE.Mesh(deerChestSphereGeo, deerLightFurMat);
    chestPatch.scale.set(0.62, 0.82, 0.55);
    chestPatch.position.set(0, 0.89, -0.5);
    group.add(chestPatch);

    const neck = new THREE.Mesh(deerNeckGeo, deerFurMat);
    neck.castShadow = true;
    group.add(neck);

    const head = new THREE.Mesh(deerCraniumGeo, deerFurMat);
    head.name = 'head';
    head.scale.set(0.88, 0.96, 1.25);
    head.position.set(0, 1.46, -0.77);
    head.castShadow = true;
    group.add(head);

    const muzzle = new THREE.Mesh(deerMuzzleGeo, deerFurMat);
    muzzle.position.set(0, 1.41, -0.94);
    muzzle.rotation.x = 0.14;
    group.add(muzzle);

    const nose = new THREE.Mesh(deerNoseGeo, deerDarkMat);
    nose.scale.set(1.0, 0.82, 0.85);
    nose.position.set(0, 1.40, -1.08);
    group.add(nose);

    [-1, 1].forEach((side) => {
      const eye = new THREE.Mesh(deerEyeGeo, deerEyeMat);
      eye.position.set(side * 0.108, 1.48, -0.82);
      group.add(eye);

      const ear = new THREE.Mesh(deerEarGeo, deerFurMat);
      ear.position.set(side * 0.135, 1.56, -0.72);
      ear.rotation.z = side * -0.62;
      ear.rotation.x = -0.22;
      group.add(ear);

      group.add(buildAntlerSideGroup(side));
    });

    const legs = [];
    [-1, 1].forEach((side) => {
      [-1, 1].forEach((end) => {
        const legPivot = new THREE.Group();
        legPivot.name = `leg${legs.length}`;
        legPivot.position.set(side * 0.165, 0.82, end * 0.37);

        const upper = new THREE.Mesh(deerUpperLegGeo, deerFurMat);
        upper.position.set(0, -0.18, 0);
        upper.rotation.x = end < 0 ? 0.05 : -0.06;
        upper.castShadow = true;
        legPivot.add(upper);

        const lower = new THREE.Mesh(deerLowerLegGeo, deerFurMat);
        lower.position.set(0, -0.54, 0.01);
        legPivot.add(lower);

        const hoof = new THREE.Mesh(deerHoofGeo, deerDarkMat);
        hoof.position.set(0, -0.78, 0.015);
        legPivot.add(hoof);

        group.add(legPivot);
        legs.push(legPivot);
      });
    });
    group.userData.legs = legs;

    const tail = new THREE.Mesh(deerTailGeo, deerLightFurMat);
    tail.position.set(0, 1.04, 0.66);
    tail.rotation.x = 0.68;
    group.add(tail);

    return group;
  }

  // --- Skulpturert Ulv (CapsuleGeometry, pelskrage, spiss snute og buskete TubeGeometry-hale) ---
  const wolfFurMat = new THREE.MeshStandardMaterial({
    color: 0x6d7584,
    bumpMap: sharedFoliageBumpTex,
    bumpScale: 0.04,
    roughness: 0.88
  });
  const wolfDarkMat = new THREE.MeshStandardMaterial({
    color: 0x363c48,
    bumpMap: sharedFoliageBumpTex,
    bumpScale: 0.04,
    roughness: 0.9
  });
  const wolfLightMat = new THREE.MeshStandardMaterial({ color: 0xbac2ce, roughness: 0.88 });
  const wolfEyeMat = new THREE.MeshBasicMaterial({ color: 0xffca42, fog: false, toneMapped: false });

  const wolfTorsoGeo = new THREE.CapsuleGeometry(0.195, 0.56, 6, 12);
  wolfTorsoGeo.rotateX(Math.PI / 2);
  const wolfRibcageGeo = new THREE.SphereGeometry(0.225, 12, 10);
  const wolfRuffGeo = new THREE.ConeGeometry(0.245, 0.34, 12);
  wolfRuffGeo.rotateX(Math.PI / 2 + 0.38);
  const wolfSkullGeo = new THREE.SphereGeometry(0.148, 12, 10);
  const wolfSnoutGeo = new THREE.ConeGeometry(0.088, 0.28, 10);
  wolfSnoutGeo.rotateX(-Math.PI / 2);
  const wolfEarGeo = new THREE.ConeGeometry(0.056, 0.16, 6);
  const wolfUpperLegGeo = new THREE.CapsuleGeometry(0.048, 0.22, 4, 8);
  const wolfLowerLegGeo = new THREE.CapsuleGeometry(0.034, 0.22, 4, 8);
  const wolfPawGeo = new THREE.SphereGeometry(0.048, 8, 6);
  const wolfEyeGeo = new THREE.SphereGeometry(0.024, 7, 5);

  const wolfTailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.62, 0.44),
    new THREE.Vector3(0, 0.54, 0.68),
    new THREE.Vector3(0, 0.39, 0.86),
    new THREE.Vector3(0, 0.31, 0.96)
  ]);
  const wolfTailGeo = new THREE.TubeGeometry(wolfTailCurve, 10, 0.068, 8, false);

  function createWolfModel() {
    const wolfGLTF = loadedAssets && loadedAssets.wolf;
    if (wolfGLTF && wolfGLTF.scene) {
      const { group, model } = instantiateGLTFCreature(wolfGLTF, 'wolf', 0.92, -1);
      if (createContactShadow) group.add(createContactShadow(0.54, 0.88));
      addQuadrupedFootShadows(group, [[-0.14, -0.31], [0.14, -0.31], [-0.14, 0.31], [0.14, 0.31]], 0.14);
      group.userData.legs = [0, 1, 2, 3]
        .map((i) => model.getObjectByName(`leg${i}`))
        .filter(Boolean);
      return group;
    }

    const group = new THREE.Group();
    if (createContactShadow) group.add(createContactShadow(0.48, 0.78));

    const body = new THREE.Mesh(wolfTorsoGeo, wolfFurMat);
    body.scale.set(0.92, 0.98, 1.0);
    body.position.set(0, 0.58, 0.08);
    body.castShadow = true;
    group.add(body);

    const ribcage = new THREE.Mesh(wolfRibcageGeo, wolfDarkMat);
    ribcage.scale.set(0.92, 1.04, 1.15);
    ribcage.position.set(0, 0.60, -0.26);
    ribcage.castShadow = true;
    group.add(ribcage);

    const chestLight = new THREE.Mesh(wolfRibcageGeo, wolfLightMat);
    chestLight.scale.set(0.68, 0.78, 0.62);
    chestLight.position.set(0, 0.52, -0.42);
    group.add(chestLight);

    // Kraftig skulpturert pelskrage rundt skuldre og nakke
    const ruff = new THREE.Mesh(wolfRuffGeo, wolfDarkMat);
    ruff.position.set(0, 0.67, -0.48);
    ruff.castShadow = true;
    group.add(ruff);

    const ruffLight = new THREE.Mesh(wolfRuffGeo, wolfLightMat);
    ruffLight.scale.set(0.76, 0.76, 0.85);
    ruffLight.position.set(0, 0.61, -0.52);
    group.add(ruffLight);

    const head = new THREE.Mesh(wolfSkullGeo, wolfFurMat);
    head.name = 'head';
    head.scale.set(0.96, 0.92, 1.12);
    head.position.set(0, 0.74, -0.68);
    head.castShadow = true;
    group.add(head);

    const snout = new THREE.Mesh(wolfSnoutGeo, wolfDarkMat);
    snout.scale.set(0.9, 0.82, 1.0);
    snout.position.set(0, 0.69, -0.88);
    group.add(snout);

    const jawLight = new THREE.Mesh(wolfSnoutGeo, wolfLightMat);
    jawLight.scale.set(0.72, 0.48, 0.88);
    jawLight.position.set(0, 0.65, -0.86);
    group.add(jawLight);

    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.028, 7, 5), deerDarkMat);
    nose.position.set(0, 0.70, -1.01);
    group.add(nose);

    [-1, 1].forEach((side) => {
      const ear = new THREE.Mesh(wolfEarGeo, wolfDarkMat);
      ear.position.set(side * 0.092, 0.88, -0.64);
      ear.rotation.z = side * -0.16;
      ear.rotation.x = 0.12;
      group.add(ear);

      const eye = new THREE.Mesh(wolfEyeGeo, wolfEyeMat);
      eye.position.set(side * 0.068, 0.765, -0.81);
      group.add(eye);
    });

    const legs = [];
    [-1, 1].forEach((side) => {
      [-1, 1].forEach((end) => {
        const legPivot = new THREE.Group();
        legPivot.name = `leg${legs.length}`;
        legPivot.position.set(side * 0.14, 0.50, end * 0.31);

        const upper = new THREE.Mesh(wolfUpperLegGeo, wolfFurMat);
        upper.position.set(0, -0.12, 0);
        upper.rotation.x = end < 0 ? 0.08 : -0.12;
        legPivot.add(upper);

        const lower = new THREE.Mesh(wolfLowerLegGeo, wolfDarkMat);
        lower.position.set(0, -0.34, 0.01);
        legPivot.add(lower);

        const paw = new THREE.Mesh(wolfPawGeo, wolfDarkMat);
        paw.scale.set(0.95, 0.58, 1.25);
        paw.position.set(0, -0.47, -0.02);
        legPivot.add(paw);

        group.add(legPivot);
        legs.push(legPivot);
      });
    });
    group.userData.legs = legs;

    const tail = new THREE.Mesh(wolfTailGeo, wolfDarkMat);
    tail.castShadow = true;
    group.add(tail);

    const tailTip = new THREE.Mesh(new THREE.ConeGeometry(0.062, 0.18, 7), wolfLightMat);
    tailTip.position.set(0, 0.27, 1.01);
    tailTip.rotation.x = -Math.PI * 0.68;
    group.add(tailTip);

    return group;
  }

  // --- Skulpturert Banditt (LatheGeometry duster-frakk, buet cowboyhatt, skjerf, beltespenne og hylster) ---
  const banditCoatMat = new THREE.MeshStandardMaterial({
    color: 0x3b2c22,
    map: sharedWoodTex,
    bumpMap: sharedWoodBumpTex,
    bumpScale: 0.05,
    roughness: 0.86
  });
  const banditVestMat = new THREE.MeshStandardMaterial({ color: 0x613d22, roughness: 0.78 });
  const banditPantsMat = new THREE.MeshStandardMaterial({ color: 0x23272e, roughness: 0.88 });
  const banditBootMat = new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 0.52, metalness: 0.08 });
  const banditSkinMat = new THREE.MeshStandardMaterial({ color: 0xcf9a72, roughness: 0.72 });
  const banditHatMat = new THREE.MeshStandardMaterial({ color: 0x261910, roughness: 0.82 });
  const banditBandanaMat = new THREE.MeshStandardMaterial({ color: 0xa61919, roughness: 0.74 });
  const banditGunMat = new THREE.MeshStandardMaterial({
    color: 0x343942,
    metalness: 0.84,
    roughness: 0.28,
    envMapIntensity: 1.35
  });
  const banditEyeMat = new THREE.MeshBasicMaterial({ color: 0x18110d });

  // Skulpturert lang støvfrakk (duster coat) med åpen frontsplitt
  function buildDusterCoatGeo() {
    const profile = [
      new THREE.Vector2(0.30, 0.0),
      new THREE.Vector2(0.275, 0.28),
      new THREE.Vector2(0.225, 0.56),
      new THREE.Vector2(0.245, 0.88),
      new THREE.Vector2(0.205, 1.06)
    ];
    const geo = new THREE.LatheGeometry(profile, 18, 0.36, Math.PI * 2 - 0.72);
    geo.rotateY(Math.PI);
    geo.scale(1.06, 1, 0.76);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y < 0.35) {
        const ang = Math.atan2(pos.getZ(i), pos.getX(i));
        const flare = 1.0 + (0.35 - y) * 0.22 * (0.6 + 0.4 * Math.sin(ang * 5));
        pos.setX(i, pos.getX(i) * flare);
        pos.setZ(i, pos.getZ(i) * flare);
      }
    }
    geo.computeVertexNormals();
    return geo;
  }

  const banditDusterGeo = buildDusterCoatGeo();
  const banditChestGeo = new THREE.CapsuleGeometry(0.185, 0.32, 6, 12);
  banditChestGeo.scale(1.12, 1, 0.74);
  const banditThighGeo = new THREE.CapsuleGeometry(0.082, 0.38, 5, 10);
  const banditBootShaftGeo = new THREE.CylinderGeometry(0.072, 0.068, 0.26, 10);
  const banditBootFootGeo = new THREE.CapsuleGeometry(0.06, 0.11, 5, 9);
  banditBootFootGeo.rotateX(Math.PI / 2);
  const banditBeltGeo = new THREE.CylinderGeometry(0.228, 0.232, 0.072, 16);
  banditBeltGeo.scale(1.06, 1, 0.76);
  const banditHolsterGeo = new THREE.ConeGeometry(0.062, 0.25, 9);
  const banditUpperArmGeo = new THREE.CapsuleGeometry(0.064, 0.22, 5, 10);
  const banditForearmGeo = new THREE.CapsuleGeometry(0.056, 0.21, 5, 9);
  const banditHandGeo = new THREE.SphereGeometry(0.054, 8, 6);
  const banditHeadGeo = new THREE.SphereGeometry(0.158, 14, 12);
  const banditEyeGeo = new THREE.SphereGeometry(0.021, 6, 5);
  const banditBandanaGeo = new THREE.ConeGeometry(0.182, 0.25, 12);
  const banditGunFrameGeo = new THREE.BoxGeometry(0.048, 0.075, 0.22);
  const banditGunBarrelGeo = new THREE.CylinderGeometry(0.017, 0.017, 0.24, 10);
  const banditGunDrumGeo = new THREE.CylinderGeometry(0.036, 0.036, 0.075, 10);

  function createBanditModel() {
    const banditGLTF = loadedAssets && loadedAssets.bandit;
    if (banditGLTF && banditGLTF.scene) {
      const { group, model } = instantiateGLTFCreature(banditGLTF, 'bandit', 1.82, -1);
      if (createContactShadow) group.add(createContactShadow(0.52, 0.52));

      const { handRBone } = attachWesternHumanGear(model, group, {
        hatMat: sharedStetsonOutlawMat,
        bandMat: sharedCrimsonClothMat,
        hatScale: 0.57,
        hatTiltX: 0.06,
        hatTiltZ: -0.04,
        bandana: true,
        holster: true
      });

      let muzzle =
        model.getObjectByName('muzzle') ||
        model.getObjectByName('Muzzle') ||
        model.getObjectByName('MuzzlePoint');

      if (!muzzle && handRBone) {
        const gunGrp = new THREE.Group();
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.14, 0.032), banditGunMat);
        frame.position.set(0.02, 0.07, 0);
        gunGrp.add(frame);
        const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.056, 10), banditGunMat);
        drum.position.set(0.025, 0.065, 0);
        gunGrp.add(drum);
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.014, 0.18, 10), banditGunMat);
        barrel.position.set(0.032, 0.17, 0);
        gunGrp.add(barrel);
        const grip = new THREE.Mesh(
          new THREE.BoxGeometry(0.082, 0.038, 0.028),
          sharedStetsonDarkBrownMat
        );
        grip.rotation.z = -0.34;
        grip.position.set(-0.028, 0.015, 0);
        gunGrp.add(grip);

        muzzle = new THREE.Object3D();
        muzzle.name = 'muzzle';
        muzzle.position.set(0.032, 0.27, 0);
        gunGrp.add(muzzle);
        handRBone.add(gunGrp);
      }

      if (!muzzle) {
        muzzle = new THREE.Object3D();
        muzzle.position.set(0.32, 1.28, -0.84);
        group.add(muzzle);
      }
      group.userData.muzzle = muzzle;
      return group;
    }

    const group = new THREE.Group();
    if (createContactShadow) group.add(createContactShadow(0.52, 0.52));

    // Skulpturerte støvler med hælsporer + bukseben
    [-1, 1].forEach((side) => {
      const leg = new THREE.Mesh(banditThighGeo, banditPantsMat);
      leg.position.set(side * 0.135, 0.54, 0);
      leg.castShadow = true;
      group.add(leg);

      const shaft = new THREE.Mesh(banditBootShaftGeo, banditBootMat);
      shaft.position.set(side * 0.135, 0.16, 0);
      group.add(shaft);

      const foot = new THREE.Mesh(banditBootFootGeo, banditBootMat);
      foot.position.set(side * 0.135, 0.062, -0.048);
      group.add(foot);

      const spur = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.006, 5, 8), polishedBrassMat);
      spur.rotation.y = Math.PI / 2;
      spur.position.set(side * 0.135, 0.075, 0.065);
      group.add(spur);
    });

    // Lang flagrende støvfrakk (duster) + lærvest inni
    const duster = new THREE.Mesh(banditDusterGeo, banditCoatMat);
    duster.position.set(0, 0.30, 0.01);
    duster.castShadow = true;
    group.add(duster);

    const vestTorso = new THREE.Mesh(banditChestGeo, banditVestMat);
    vestTorso.position.set(0, 1.07, -0.005);
    vestTorso.castShadow = true;
    group.add(vestTorso);

    // Slag/krage på støvfrakken
    [-1, 1].forEach((side) => {
      const lapel = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.24, 4, 8), banditCoatMat);
      lapel.scale.set(1, 1, 0.45);
      lapel.position.set(side * 0.125, 1.21, -0.145);
      lapel.rotation.z = side * -0.22;
      group.add(lapel);
    });

    // Revolverbelte på skrå med messingspenne og hylster
    const belt = new THREE.Mesh(banditBeltGeo, banditBootMat);
    belt.position.set(0, 0.83, 0);
    belt.rotation.z = -0.06;
    group.add(belt);

    const buckle = new THREE.Mesh(new THREE.TorusGeometry(0.038, 0.01, 6, 12), polishedBrassMat);
    buckle.position.set(0, 0.83, -0.18);
    group.add(buckle);

    const holster = new THREE.Mesh(banditHolsterGeo, banditBootMat);
    holster.position.set(0.255, 0.69, -0.02);
    holster.rotation.x = Math.PI;
    holster.rotation.z = 0.14;
    group.add(holster);

    // Skulpturert hode, sinte øyenbryn og skjerf/bandana med knute i nakken
    const head = new THREE.Mesh(banditHeadGeo, banditSkinMat);
    head.name = 'head';
    head.scale.set(0.95, 1.06, 0.98);
    head.position.set(0, 1.54, 0);
    head.castShadow = true;
    group.add(head);

    [-1, 1].forEach((side) => {
      const eye = new THREE.Mesh(banditEyeGeo, banditEyeMat);
      eye.position.set(side * 0.055, 1.568, -0.146);
      group.add(eye);

      const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.009, 0.042, 4, 6), banditHatMat);
      brow.rotation.z = Math.PI / 2 + side * -0.28;
      brow.position.set(side * 0.055, 1.595, -0.152);
      group.add(brow);
    });

    const bandana = new THREE.Mesh(banditBandanaGeo, banditBandanaMat);
    bandana.scale.set(0.95, 1, 1.08);
    bandana.position.set(0, 1.42, -0.045);
    bandana.rotation.x = Math.PI - 0.18;
    group.add(bandana);

    const bandanaKnot = new THREE.Mesh(new THREE.SphereGeometry(0.042, 7, 6), banditBandanaMat);
    bandanaKnot.position.set(0, 1.49, 0.145);
    group.add(bandanaKnot);

    // Skulpturert Stetson-cowboyhatt trukket lavt over øynene
    const outlawHat = createSculptedCowboyHat(banditHatMat, banditBandanaMat);
    outlawHat.position.set(0, 1.66, -0.01);
    outlawHat.rotation.x = 0.12;
    outlawHat.rotation.z = -0.06;
    group.add(outlawHat);

    // Venstre arm med albuknekk
    const leftUpper = new THREE.Mesh(banditUpperArmGeo, banditCoatMat);
    leftUpper.name = 'leftUpper';
    leftUpper.position.set(-0.27, 1.21, 0.01);
    leftUpper.rotation.z = 0.22;
    leftUpper.rotation.x = 0.14;
    leftUpper.castShadow = true;
    group.add(leftUpper);

    const leftFore = new THREE.Mesh(banditForearmGeo, banditCoatMat);
    leftFore.name = 'leftFore';
    leftFore.position.set(-0.32, 0.99, -0.04);
    leftFore.rotation.x = -0.35;
    group.add(leftFore);

    const leftHand = new THREE.Mesh(banditHandGeo, banditSkinMat);
    leftHand.position.set(-0.33, 0.85, -0.11);
    group.add(leftHand);

    // Høyre skytearm + detaljert revolver
    const rightUpper = new THREE.Mesh(banditUpperArmGeo, banditCoatMat);
    rightUpper.name = 'rightUpper';
    rightUpper.position.set(0.27, 1.23, -0.08);
    rightUpper.rotation.x = -0.95;
    rightUpper.rotation.z = -0.12;
    rightUpper.castShadow = true;
    group.add(rightUpper);

    const rightFore = new THREE.Mesh(banditForearmGeo, banditCoatMat);
    rightFore.name = 'rightFore';
    rightFore.position.set(0.31, 1.24, -0.29);
    rightFore.rotation.x = -1.48;
    group.add(rightFore);

    const rightHand = new THREE.Mesh(banditHandGeo, banditSkinMat);
    rightHand.position.set(0.32, 1.25, -0.44);
    group.add(rightHand);

    const gun = new THREE.Mesh(banditGunFrameGeo, banditGunMat);
    gun.position.set(0.32, 1.26, -0.53);
    group.add(gun);

    const drum = new THREE.Mesh(banditGunDrumGeo, banditGunMat);
    drum.rotation.x = Math.PI / 2;
    drum.position.set(0.32, 1.27, -0.52);
    group.add(drum);

    const barrel = new THREE.Mesh(banditGunBarrelGeo, banditGunMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0.32, 1.28, -0.71);
    group.add(barrel);

    const muzzle = new THREE.Object3D();
    muzzle.position.set(0.32, 1.28, -0.84);
    group.add(muzzle);
    group.userData.muzzle = muzzle;

    return group;
  }

  // --- Skulpturert Nattmonster / Vampyr (fillete kappe, krum rygg, klør og rød øyeglorie) ---
  const nightCloakMat = new THREE.MeshStandardMaterial({
    color: 0x181124,
    emissive: 0x07030e,
    roughness: 0.9,
    side: THREE.DoubleSide
  });
  const nightLiningMat = new THREE.MeshStandardMaterial({
    color: 0x680e22,
    emissive: 0x1d0309,
    roughness: 0.78,
    side: THREE.DoubleSide
  });
  const nightHoodMat = new THREE.MeshStandardMaterial({
    color: 0x221632,
    emissive: 0x080310,
    roughness: 0.88
  });
  const nightFaceMat = new THREE.MeshStandardMaterial({
    color: 0xcbc5ba,
    emissive: 0x1c1a18,
    roughness: 0.68
  });
  const nightEyeMat = new THREE.MeshBasicMaterial({ color: 0xff2626, fog: false, toneMapped: false });
  const nightEyeHaloMat = new THREE.SpriteMaterial({
    map: sharedRedEyeGlowTex,
    color: 0xff2222,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
    toneMapped: false
  });

  function buildTatteredVampireCloakGeo() {
    const radialSegs = 22;
    const heightSegs = 8;
    const geo = new THREE.CylinderGeometry(0.18, 0.54, 1.48, radialSegs, heightSegs, true);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);
      const hNorm = (y + 0.74) / 1.48;
      const ang = Math.atan2(z, x);

      const fold = 1.0 + (1 - hNorm) * 0.18 * Math.sin(ang * 7);
      x *= fold;
      z *= fold;

      z += (1 - hNorm) * 0.18 - hNorm * 0.08;

      if (hNorm < 0.16) {
        const tatter = Math.sin(ang * 9) * 0.11 + Math.cos(ang * 5) * 0.06;
        y += tatter * (1 - hNorm / 0.16);
      }
      pos.setXYZ(i, x, y, z);
    }
    geo.computeVertexNormals();
    return geo;
  }

  const nightCloakGeo = buildTatteredVampireCloakGeo();
  const nightHunchGeo = new THREE.CapsuleGeometry(0.18, 0.36, 5, 10);
  const nightCollarGeo = new THREE.CylinderGeometry(0.32, 0.17, 0.28, 12, 1, true, Math.PI * 0.18, Math.PI * 1.64);
  const nightSkullGeo = new THREE.SphereGeometry(0.145, 12, 10);
  const nightJawGeo = new THREE.ConeGeometry(0.095, 0.16, 8);
  const nightEyeGeo = new THREE.SphereGeometry(0.032, 7, 5);
  const nightUpperArmGeo = new THREE.CapsuleGeometry(0.052, 0.28, 4, 8);
  const nightForearmGeo = new THREE.CapsuleGeometry(0.042, 0.28, 4, 8);
  const nightClawGeo = new THREE.ConeGeometry(0.016, 0.145, 5);

  function createNightEnemyModel() {
    const vampireGLTF = loadedAssets && loadedAssets.vampire;
    if (vampireGLTF && vampireGLTF.scene) {
      const { group, model } = instantiateGLTFCreature(vampireGLTF, 'vampire', 1.92, -1, 0x7a7288);
      if (createContactShadow) group.add(createContactShadow(0.62, 0.62));

      const eyeHalo = new THREE.Sprite(nightEyeHaloMat);
      eyeHalo.scale.set(0.38, 0.18, 1);
      eyeHalo.position.set(0, 1.56, -0.38);
      group.add(eyeHalo);

      const arm0 = model.getObjectByName('arm0');
      const arm1 = model.getObjectByName('arm1');
      group.userData.arms = [arm0, arm1].filter(Boolean);
      return group;
    }

    const group = new THREE.Group();
    if (createContactShadow) group.add(createContactShadow(0.62, 0.62));

    const cloak = new THREE.Mesh(nightCloakGeo, nightCloakMat);
    cloak.position.y = 0.78;
    cloak.castShadow = true;
    group.add(cloak);

    const hunch = new THREE.Mesh(nightHunchGeo, nightHoodMat);
    hunch.position.set(0, 1.18, -0.05);
    hunch.rotation.x = 0.38;
    hunch.castShadow = true;
    group.add(hunch);

    const collar = new THREE.Mesh(nightCollarGeo, nightLiningMat);
    collar.position.set(0, 1.38, -0.02);
    collar.rotation.x = 0.18;
    group.add(collar);

    const skull = new THREE.Mesh(nightSkullGeo, nightFaceMat);
    skull.scale.set(0.84, 1.02, 0.94);
    skull.position.set(0, 1.44, -0.16);
    skull.castShadow = true;
    group.add(skull);

    const jaw = new THREE.Mesh(nightJawGeo, nightFaceMat);
    jaw.rotation.x = Math.PI - 0.15;
    jaw.scale.set(0.82, 1, 0.85);
    jaw.position.set(0, 1.33, -0.18);
    group.add(jaw);

    const eyeHalo = new THREE.Sprite(nightEyeHaloMat);
    eyeHalo.scale.set(0.46, 0.26, 1);
    eyeHalo.position.set(0, 1.45, -0.31);
    group.add(eyeHalo);

    const armGroups = [];
    [-1, 1].forEach((side) => {
      const eye = new THREE.Mesh(nightEyeGeo, nightEyeMat);
      eye.position.set(side * 0.054, 1.45, -0.285);
      group.add(eye);

      const vEar = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.12, 5), nightFaceMat);
      vEar.position.set(side * 0.135, 1.47, -0.15);
      vEar.rotation.z = side * -0.85;
      vEar.rotation.x = -0.2;
      group.add(vEar);

      const armPivot = new THREE.Group();
      armPivot.name = `arm${armGroups.length}`;
      armPivot.position.set(side * 0.24, 1.26, -0.08);

      const upperArm = new THREE.Mesh(nightUpperArmGeo, nightCloakMat);
      upperArm.position.set(side * 0.05, -0.08, -0.11);
      upperArm.rotation.x = -0.95;
      upperArm.rotation.z = side * -0.22;
      armPivot.add(upperArm);

      const sleeveTatter = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.34, 5), nightLiningMat);
      sleeveTatter.position.set(side * 0.06, -0.22, -0.14);
      sleeveTatter.rotation.x = Math.PI + 0.15;
      armPivot.add(sleeveTatter);

      const forearm = new THREE.Mesh(nightForearmGeo, nightFaceMat);
      forearm.position.set(side * 0.07, -0.10, -0.32);
      forearm.rotation.x = -1.42;
      forearm.rotation.z = side * 0.14;
      armPivot.add(forearm);

      [-0.028, 0, 0.028].forEach((cx, cIdx) => {
        const claw = new THREE.Mesh(nightClawGeo, nightFaceMat);
        claw.position.set(side * 0.06 + cx, -0.12 + (cIdx === 1 ? 0.015 : 0), -0.52);
        claw.rotation.x = -Math.PI * 0.62;
        claw.rotation.z = cx * -2.2;
        armPivot.add(claw);
      });

      group.add(armPivot);
      armGroups.push(armPivot);
    });
    group.userData.arms = armGroups;

    return group;
  }

  // --- Våpensmed-NPC (Master Caleb) inne hos Gunsmith (assets/gunsmith_npc.glb + fallback) ---
  function createGunsmithNPC(gunsmithBlockHitMeshes) {
    const gunsmithNpcGLTF = loadedAssets && loadedAssets.gunsmithNpc;
    if (gunsmithNpcGLTF && gunsmithNpcGLTF.scene) {
      const { group: npc, model } = instantiateGLTFCreature(gunsmithNpcGLTF, 'gunsmithNpc', 1.82, 1);
      if (createContactShadow) npc.add(createContactShadow(0.48, 0.48, 0.015));

      attachWesternHumanGear(model, npc, {
        hatMat: sharedStetsonSaddleMat,
        bandMat: polishedBrassMat,
        hatScale: 0.57,
        hatTiltX: -0.03,
        holster: true
      });

      const shield = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 1.95, 0.65),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      shield.position.set(0, 1.0, 0);
      npc.add(shield);
      if (gunsmithBlockHitMeshes) gunsmithBlockHitMeshes.push(shield);
      return npc;
    }

    // Prosedyrisk fallback for Våpensmed-NPC (vendt mot +Z som skredderen)
    const npc = new THREE.Group();
    if (createContactShadow) npc.add(createContactShadow(0.48, 0.48, 0.015));
    const apronMat = new THREE.MeshStandardMaterial({ color: 0x4a2914, roughness: 0.78 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0x8f2d22, roughness: 0.85 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.88 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd49c74, roughness: 0.72 });
    const beardMat = new THREE.MeshStandardMaterial({ color: 0x2e1c10, roughness: 0.86 });

    [-0.13, 0.13].forEach((lx) => {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.56, 5, 10), pantsMat);
      leg.position.set(lx, 0.44, 0);
      npc.add(leg);
    });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.42, 6, 12), shirtMat);
    torso.scale.set(1.08, 1, 0.76);
    torso.position.set(0, 1.12, 0);
    npc.add(torso);

    const apron = new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.26, 0.76, 14, 1, false, -Math.PI * 0.48, Math.PI * 0.96), apronMat);
    apron.position.set(0, 0.96, 0.02);
    npc.add(apron);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.155, 12, 10), skinMat);
    head.position.set(0, 1.58, 0.02);
    npc.add(head);

    const beard = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.24, 10), beardMat);
    beard.rotation.x = Math.PI - 0.12;
    beard.position.set(0, 1.46, 0.09);
    npc.add(beard);

    const hat = createSculptedCowboyHat(apronMat, polishedBrassMat);
    hat.position.set(0, 1.70, 0.01);
    npc.add(hat);

    const shield = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 1.95, 0.65),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    shield.position.set(0, 1.0, 0);
    npc.add(shield);
    if (gunsmithBlockHitMeshes) gunsmithBlockHitMeshes.push(shield);
    return npc;
  }

  // --- Sheriff Vance utenfor Safe House / Saloonen (høydetaljert .glb-lovmann + gull Sheriff-stjerne) ---
  function createSheriffVanceNPC(sheriffHitMeshes) {
    const goldStarMat = new THREE.MeshStandardMaterial({
      color: 0xffd857,
      emissive: 0x452d00,
      metalness: 0.92,
      roughness: 0.24
    });

    const baseGLTF = (loadedAssets && loadedAssets.sheriffNpc) || (loadedAssets && loadedAssets.tailorNpc);
    if (baseGLTF && baseGLTF.scene) {
      const { group, model } = instantiateGLTFCreature(baseGLTF, 'sheriffNpc', 1.84, 1);
      if (createContactShadow) group.add(createContactShadow(0.54, 0.54));

      const { chestBone } = attachWesternHumanGear(model, group, {
        hatMat: sharedStetsonCreamMat,
        bandMat: goldStarMat,
        hatScale: 0.57,
        hatTiltX: -0.03,
        holster: true
      });

      // Gull 6-tagget Sheriff-stjerne festet på øvre venstre brystslag (over kryssede armer)
      const starGroup = new THREE.Group();
      const triGeo = new THREE.CylinderGeometry(0.034, 0.034, 0.010, 3);
      const tA = new THREE.Mesh(triGeo, goldStarMat);
      tA.rotation.x = Math.PI / 2;
      const tB = new THREE.Mesh(triGeo, goldStarMat);
      tB.rotation.x = Math.PI / 2;
      tB.rotation.z = Math.PI;
      starGroup.add(tA, tB);
      if (chestBone) {
        starGroup.position.set(0.076, 0.235, 0.118);
        chestBone.add(starGroup);
      } else {
        starGroup.position.set(-0.105, 1.25, 0.172);
        group.add(starGroup);
      }

      const hitBox = new THREE.Mesh(
        new THREE.BoxGeometry(0.95, 2.05, 0.75),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hitBox.position.set(0, 1.02, 0);
      group.add(hitBox);
      if (sheriffHitMeshes) sheriffHitMeshes.push(hitBox);

      return group;
    }

    const group = new THREE.Group();
    if (createContactShadow) group.add(createContactShadow(0.54, 0.54));

    const coatMat = new THREE.MeshStandardMaterial({ color: 0x6f4a2b, roughness: 0.78 });
    const vestMat = new THREE.MeshStandardMaterial({ color: 0x26384d, roughness: 0.72 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x2b2620, roughness: 0.86 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x1a110b, roughness: 0.52 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xdba47c, roughness: 0.7 });
    const creamHatMat = new THREE.MeshStandardMaterial({ color: 0xe6d4b5, roughness: 0.74 });

    [-1, 1].forEach((side) => {
      const leg = new THREE.Mesh(banditThighGeo, pantsMat);
      leg.position.set(side * 0.13, 0.54, 0);
      leg.castShadow = true;
      group.add(leg);

      const boot = new THREE.Mesh(banditBootShaftGeo, bootMat);
      boot.position.set(side * 0.13, 0.16, 0);
      group.add(boot);

      const foot = new THREE.Mesh(banditBootFootGeo, bootMat);
      foot.position.set(side * 0.13, 0.062, 0.048);
      group.add(foot);
    });

    const duster = new THREE.Mesh(banditDusterGeo, coatMat);
    duster.rotation.y = Math.PI;
    duster.position.set(0, 0.30, 0);
    duster.castShadow = true;
    group.add(duster);

    const vest = new THREE.Mesh(banditChestGeo, vestMat);
    vest.position.set(0, 1.09, 0.01);
    vest.castShadow = true;
    group.add(vest);

    const belt = new THREE.Mesh(banditBeltGeo, bootMat);
    belt.position.set(0, 0.84, 0);
    group.add(belt);
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.052, 0.02), polishedBrassMat);
    buckle.position.set(0, 0.84, 0.175);
    group.add(buckle);

    // Gull 6-tagget Sheriff-stjerne på venstre bryst (+Z er fremover for vennlige by-NPCer)
    const starGroup = new THREE.Group();
    const triGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.012, 3);
    const tA = new THREE.Mesh(triGeo, goldStarMat);
    tA.rotation.x = Math.PI / 2;
    const tB = new THREE.Mesh(triGeo, goldStarMat);
    tB.rotation.x = Math.PI / 2;
    tB.rotation.z = Math.PI;
    starGroup.add(tA, tB);
    starGroup.position.set(-0.095, 1.24, 0.155);
    group.add(starGroup);

    [-1, 1].forEach((side) => {
      const arm = new THREE.Mesh(banditUpperArmGeo, coatMat);
      arm.position.set(side * 0.27, 1.18, 0.02);
      arm.rotation.z = side * -0.18;
      arm.rotation.x = -0.18;
      arm.castShadow = true;
      group.add(arm);

      const fore = new THREE.Mesh(banditForearmGeo, coatMat);
      fore.position.set(side * 0.30, 0.96, 0.09);
      fore.rotation.x = -0.45;
      group.add(fore);

      const hand = new THREE.Mesh(banditHandGeo, skinMat);
      hand.position.set(side * 0.29, 0.84, 0.16);
      group.add(hand);
    });

    const head = new THREE.Mesh(banditHeadGeo, skinMat);
    head.position.set(0, 1.56, 0.015);
    head.castShadow = true;
    group.add(head);

    [-1, 1].forEach((side) => {
      const eye = new THREE.Mesh(banditEyeGeo, banditEyeMat);
      eye.position.set(side * 0.052, 1.585, 0.148);
      group.add(eye);

      const stache = new THREE.Mesh(new THREE.CapsuleGeometry(0.016, 0.055, 4, 6), new THREE.MeshStandardMaterial({ color: 0x8c7b68, roughness: 0.8 }));
      stache.rotation.z = Math.PI / 2 + side * 0.28;
      stache.position.set(side * 0.042, 1.515, 0.156);
      group.add(stache);
    });

    const whiteHat = createSculptedCowboyHat(creamHatMat, goldStarMat);
    whiteHat.position.set(0, 1.69, 0.01);
    whiteHat.rotation.x = -0.05;
    group.add(whiteHat);

    const hitBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 2.05, 0.75),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitBox.position.set(0, 1.02, 0);
    group.add(hitBox);
    if (sheriffHitMeshes) sheriffHitMeshes.push(hitBox);

    return group;
  }

  // --- Bandittkaptein («Captain Iron-Jaw») ved den forlatte gullgruven i Crimson Canyon ---
  function createBanditCaptainModel() {
    const group = createBanditModel();
    group.scale.setScalar(1.14);

    // Gi kapteinen dyp karmosinrød frakk-fargetone og gylne skulder-epauletter på brystbenet
    const captainCrimson = new THREE.Color(0xb83232);
    group.traverse((node) => {
      if (!node.isMesh || !node.material) return;
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      let changed = false;
      const nextMats = mats.map((mat) => {
        if (!mat) return mat;
        const mName = (mat.name || '').toLowerCase();
        if (mName.includes('cloth') || mName.includes('coat') || mName.includes('duster')) {
          const cloned = mat.clone();
          cloned.color.copy(captainCrimson);
          if (applyCharacterRimLighting) applyCharacterRimLighting(cloned);
          changed = true;
          return cloned;
        }
        return mat;
      });
      if (changed) {
        node.material = Array.isArray(node.material) ? nextMats : nextMats[0];
      }
    });

    const animRoot = group.userData.animRoot;
    const chestBone = animRoot && (animRoot.getObjectByName('spine_03') || animRoot.getObjectByName('spine_02'));
    [-1, 1].forEach((side) => {
      const ep = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.032, 0.14), polishedBrassMat);
      if (chestBone) {
        ep.position.set(side * 0.185, 0.22, 0.0);
        ep.rotation.z = side * -0.18;
        chestBone.add(ep);
      } else {
        ep.position.set(side * 0.24, 1.38, -0.02);
        ep.rotation.z = side * -0.18;
        group.add(ep);
      }
    });

    return group;
  }

  // --- Grizzlybjørn i Whispering Woods (assets/bear.glb + skulpturert fallback) ---
  const bearFurMat = new THREE.MeshStandardMaterial({
    color: 0x4f301b,
    bumpMap: sharedFoliageBumpTex,
    bumpScale: 0.05,
    roughness: 0.9
  });
  const bearGrizzleMat = new THREE.MeshStandardMaterial({
    color: 0x6c482e,
    bumpMap: sharedFoliageBumpTex,
    bumpScale: 0.05,
    roughness: 0.88
  });
  const bearSnoutMat = new THREE.MeshStandardMaterial({ color: 0xa87d56, roughness: 0.84 });

  function createBearModel() {
    const bearGLTF = loadedAssets && loadedAssets.bear;
    if (bearGLTF && bearGLTF.scene) {
      const { group, model } = instantiateGLTFCreature(bearGLTF, 'bear', 1.58, -1);
      if (createContactShadow) group.add(createContactShadow(1.04, 1.48));
      addQuadrupedFootShadows(group, [[-0.30, -0.52], [0.30, -0.52], [-0.30, 0.52], [0.30, 0.52]], 0.24);
      group.userData.legs = [0, 1, 2, 3]
        .map((i) => model.getObjectByName(`leg${i}`))
        .filter(Boolean);
      return group;
    }

    const group = new THREE.Group();
    if (createContactShadow) group.add(createContactShadow(0.95, 1.38));

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.46, 0.92, 7, 14), bearFurMat);
    torso.rotation.x = Math.PI / 2;
    torso.position.set(0, 0.88, 0.06);
    torso.castShadow = true;
    group.add(torso);

    const hump = new THREE.Mesh(new THREE.SphereGeometry(0.48, 12, 10), bearGrizzleMat);
    hump.scale.set(0.95, 1.08, 1.1);
    hump.position.set(0, 1.04, -0.38);
    hump.castShadow = true;
    group.add(hump);

    const head = new THREE.Group();
    head.name = 'head';
    head.position.set(0, 1.08, -0.92);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), bearFurMat);
    skull.castShadow = true;
    head.add(skull);
    const snout = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.22, 5, 10), bearSnoutMat);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, -0.06, -0.24);
    head.add(snout);
    [-1, 1].forEach((side) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), bearFurMat);
      ear.position.set(side * 0.21, 0.22, 0.04);
      head.add(ear);
    });
    group.add(head);

    const legs = [];
    [-1, 1].forEach((side) => {
      [-1, 1].forEach((end) => {
        const legPivot = new THREE.Group();
        legPivot.name = `leg${legs.length}`;
        legPivot.position.set(side * 0.30, 0.72, end * 0.52);
        const limb = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.44, 5, 10), bearFurMat);
        limb.position.y = -0.34;
        limb.castShadow = true;
        legPivot.add(limb);
        group.add(legPivot);
        legs.push(legPivot);
      });
    });
    group.userData.legs = legs;

    return group;
  }

  // --- Sluttboss: Lord Malakor – Vampyrfyrste (assets/boss_vampire.glb + 3D helsemåler over hodet) ---
  function createBossVampireModel() {
    let group;
    let model = null;
    const bossGLTF = loadedAssets && loadedAssets.bossVampire;

    if (bossGLTF && bossGLTF.scene) {
      const inst = instantiateGLTFCreature(bossGLTF, 'bossVampire', 2.75, -1);
      group = inst.group;
      model = inst.model;
      const arm0 = model.getObjectByName('arm0');
      const arm1 = model.getObjectByName('arm1');
      group.userData.arms = [arm0, arm1].filter(Boolean);

      // Glødende blodrøde vampyrøyne og gotisk høykrage festet direkte til skjelettet til Lord Malakor
      const headBone = model.getObjectByName('head') || model.getObjectByName('Head');
      const chestBone = model.getObjectByName('spine_03') || model.getObjectByName('spine_02');
      if (headBone) {
        [-1, 1].forEach((side) => {
          const vEye = new THREE.Mesh(new THREE.SphereGeometry(0.015, 7, 6), nightEyeMat);
          vEye.position.set(side * 0.033, 0.028, 0.092);
          headBone.add(vEye);
        });
      }
      if (chestBone) {
        const highCollar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.185, 0.115, 0.16, 14, 1, true, Math.PI * 0.68, Math.PI * 1.64),
          nightLiningMat
        );
        highCollar.position.set(0, 0.215, -0.028);
        highCollar.rotation.x = -0.16;
        chestBone.add(highCollar);
      }
    } else {
      group = createNightEnemyModel();
      group.scale.setScalar(1.55);
    }

    if (createContactShadow) group.add(createContactShadow(1.05, 1.05));

    // Glødende rød øye- og aura-halo rundt Lord Malakor
    const bossEyeHalo = new THREE.Sprite(nightEyeHaloMat);
    bossEyeHalo.scale.set(0.95, 0.55, 1);
    bossEyeHalo.position.set(0, 2.28, -0.42);
    group.add(bossEyeHalo);

    if (sharedSparkGlowTex) {
      const auraMat = new THREE.SpriteMaterial({
        map: sharedRedEyeGlowTex,
        color: 0xff1e38,
        transparent: true,
        opacity: 0.38,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
        toneMapped: false
      });
      const auraSprite = new THREE.Sprite(auraMat);
      auraSprite.scale.set(2.8, 3.1, 1);
      auraSprite.position.set(0, 1.45, 0.05);
      group.add(auraSprite);
    }

    // 3D Helsemåler (Sprite m/ CanvasTexture) over hodet på Lord Malakor
    const barCanvas = document.createElement('canvas');
    barCanvas.width = 512;
    barCanvas.height = 112;
    const barCtx = barCanvas.getContext('2d');
    const barTex = new THREE.CanvasTexture(barCanvas);
    barTex.colorSpace = THREE.SRGBColorSpace;

    const barMat = new THREE.SpriteMaterial({
      map: barTex,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      fog: false,
      toneMapped: false
    });
    const barSprite = new THREE.Sprite(barMat);
    barSprite.scale.set(2.75, 0.60, 1);
    barSprite.position.set(0, 2.86, 0);
    group.add(barSprite);

    function updateBossHealthBar(hp, maxHp, titleLabel = 'LORD MALAKOR') {
      const ratio = Math.max(0, Math.min(1, hp / Math.max(1, maxHp)));
      barCtx.clearRect(0, 0, 512, 112);

      barCtx.fillStyle = 'rgba(22, 8, 14, 0.92)';
      barCtx.strokeStyle = '#e5b354';
      barCtx.lineWidth = 5;
      barCtx.beginPath();
      barCtx.roundRect(8, 8, 496, 96, 16);
      barCtx.fill();
      barCtx.stroke();

      barCtx.font = 'bold 26px Georgia, serif';
      barCtx.fillStyle = '#ffe6b3';
      barCtx.textAlign = 'center';
      barCtx.fillText(`${titleLabel} (${Math.max(0, Math.ceil(hp))}/${maxHp})`, 256, 40);

      barCtx.fillStyle = '#2d0d14';
      barCtx.fillRect(32, 56, 448, 30);

      const grad = barCtx.createLinearGradient(32, 0, 480, 0);
      grad.addColorStop(0, '#a30b24');
      grad.addColorStop(0.5, '#e61e32');
      grad.addColorStop(1, '#ff6838');
      barCtx.fillStyle = grad;
      barCtx.fillRect(32, 56, Math.round(448 * ratio), 30);

      barCtx.strokeStyle = 'rgba(255, 220, 150, 0.7)';
      barCtx.lineWidth = 2;
      barCtx.strokeRect(32, 56, 448, 30);

      barTex.needsUpdate = true;
    }

    updateBossHealthBar(30, 30);
    group.userData.updateBossHealthBar = updateBossHealthBar;
    group.userData.healthBarSprite = barSprite;

    return group;
  }

  const horseSaddleLeatherMat = new THREE.MeshStandardMaterial({
    color: 0x562c15,
    map: sharedLeatherTex || null,
    normalMap: sharedLeatherNormalTex || null,
    normalScale: new THREE.Vector2(0.42, 0.42),
    roughnessMap: sharedLeatherRoughTex || null,
    roughness: 0.66,
    metalness: 0.05,
    envMapIntensity: 0.42
  });
  const horseBlanketMat = new THREE.MeshStandardMaterial({
    color: 0x5c201a,
    roughness: 0.92,
    metalness: 0.0,
    envMapIntensity: 0.30
  });
  if (applyCharacterRimLighting) {
    [deerFurMat, wolfFurMat, wolfDarkMat, banditCoatMat, nightCloakMat, bearFurMat, horseSaddleLeatherMat].forEach((m) => {
      if (m) applyCharacterRimLighting(m);
    });
  }

  function buildWesternSaddleGroup() {
    const saddleGrp = new THREE.Group();
    saddleGrp.name = 'SaddleSeat';

    // Krummet salteppe som følger hesteryggen tett (ingen firkantede hjørner som stikker ut)
    const blanketGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.54, 16, 1, false, -Math.PI * 0.42, Math.PI * 0.84);
    blanketGeo.rotateZ(Math.PI * 0.5);
    blanketGeo.rotateY(Math.PI * 0.5);
    const blanket = new THREE.Mesh(blanketGeo, horseBlanketMat);
    blanket.position.set(0, -0.22, 0.02);
    blanket.castShadow = true;
    saddleGrp.add(blanket);

    const seat = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.24, 6, 12), horseSaddleLeatherMat);
    seat.rotation.x = Math.PI / 2;
    seat.scale.set(1.12, 0.42, 1.0);
    seat.position.set(0, 0.04, 0.02);
    seat.castShadow = true;
    saddleGrp.add(seat);

    const cantle = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.11, 14, 1, false, -Math.PI * 0.45, Math.PI * 0.9), horseSaddleLeatherMat);
    cantle.position.set(0, 0.09, 0.15);
    cantle.rotation.x = -0.25;
    saddleGrp.add(cantle);

    const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), horseSaddleLeatherMat);
    pommel.scale.set(1.15, 0.75, 0.72);
    pommel.position.set(0, 0.08, -0.17);
    saddleGrp.add(pommel);

    const hornNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.032, 0.085, 10), horseSaddleLeatherMat);
    hornNeck.position.set(0, 0.155, -0.19);
    hornNeck.rotation.x = 0.24;
    saddleGrp.add(hornNeck);

    const hornCap = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.036, 0.022, 12), polishedBrassMat);
    hornCap.position.set(0, 0.198, -0.20);
    hornCap.rotation.x = 0.24;
    saddleGrp.add(hornCap);

    [-1, 1].forEach((side) => {
      const fender = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.24, 4, 8), horseSaddleLeatherMat);
      fender.scale.set(0.22, 1.0, 1.0);
      fender.position.set(side * 0.21, -0.17, -0.02);
      fender.rotation.z = side * 0.12;
      saddleGrp.add(fender);

      const stirrup = new THREE.Mesh(new THREE.TorusGeometry(0.046, 0.011, 6, 12), wroughtIronMat);
      stirrup.rotation.y = Math.PI / 2;
      stirrup.position.set(side * 0.23, -0.35, -0.02);
      saddleGrp.add(stirrup);
    });

    return saddleGrp;
  }

  function createHorseModel() {
    const horseGLTF = loadedAssets && loadedAssets.horse;
    if (horseGLTF && horseGLTF.scene) {
      const { group, model } = instantiateGLTFCreature(horseGLTF, 'horse', 1.94, -1);
      if (createContactShadow) group.add(createContactShadow(0.74, 1.28, 0.028));
      addQuadrupedFootShadows(group, [[-0.14, -0.32], [0.14, -0.32], [-0.15, 0.44], [0.15, 0.44]], 0.17);
      let hasBuiltInSaddle = false;
      model.traverse((n) => {
        if (!n.isMesh) return;
        const nm = (n.name || '').toLowerCase();
        const mats = Array.isArray(n.material) ? n.material : [n.material];
        if (nm.includes('saddle') || mats.some((m) => m && (m.name || '').toLowerCase().includes('saddle'))) {
          hasBuiltInSaddle = true;
        }
      });
      let seat = model.getObjectByName('SaddleSeat');
      if (!seat) {
        if (hasBuiltInSaddle) {
          seat = new THREE.Object3D();
          seat.name = 'SaddleSeat';
          seat.position.set(0, 1.34, 0.06);
          group.add(seat);
        } else {
          seat = buildWesternSaddleGroup();
          seat.position.set(0, 1.14, 0.05);
          group.add(seat);
        }
      }
      group.userData.saddleSeat = seat;
      group.userData.legs = [0, 1, 2, 3]
        .map((i) => model.getObjectByName(`leg${i}`))
        .filter(Boolean);
      return group;
    }

    const group = new THREE.Group();
    if (createContactShadow) group.add(createContactShadow(0.68, 1.18, 0.03));
    const coatMat = new THREE.MeshStandardMaterial({ color: 0x6e3519, roughness: 0.68 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x1a120f, roughness: 0.85 });
    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x3b1e0d, roughness: 0.55 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.95, 6, 12), coatMat);
    body.rotation.x = Math.PI / 2;
    body.position.set(0, 1.06, 0);
    body.castShadow = true;
    group.add(body);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 0.68, 10), coatMat);
    neck.position.set(0, 1.44, -0.78);
    neck.rotation.x = 0.52;
    neck.castShadow = true;
    group.add(neck);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.44), coatMat);
    head.position.set(0, 1.66, -1.04);
    head.rotation.x = 0.45;
    group.add(head);
    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.48), leatherMat);
    saddle.position.set(0, 1.38, 0.04);
    group.add(saddle);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.72, 8), hairMat);
    tail.position.set(0, 0.88, 0.84);
    tail.rotation.x = 0.25;
    group.add(tail);

    const legs = [];
    [[-0.19, -0.54], [0.19, -0.54], [-0.19, 0.58], [0.19, 0.58]].forEach(([lx, lz]) => {
      const piv = new THREE.Group();
      piv.position.set(lx, 0.96, lz);
      const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.055, 0.96, 8), coatMat);
      limb.position.y = -0.48;
      limb.castShadow = true;
      piv.add(limb);
      group.add(piv);
      legs.push(piv);
    });
    group.userData.legs = legs;
    return group;
  }

  function createForemanSladeModel() {
    const g = createBanditModel(false);
    g.scale.setScalar(1.22);
    // Gylden gruvelykt på front/belte og gulldraktering for å skille Foreman Slade ut
    const beltLight = new THREE.Mesh(
      new THREE.SphereGeometry(0.10, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xffd24c, emissive: 0xff9a18, emissiveIntensity: 1.8 })
    );
    beltLight.position.set(0, 1.35, -0.24);
    g.add(beltLight);
    return g;
  }

  function createCatacombGuardianModel() {
    const g = createNightEnemyModel();
    g.scale.setScalar(1.16);
    const crest = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.13, 0),
      new THREE.MeshStandardMaterial({ color: 0x70d4ff, emissive: 0x329eff, emissiveIntensity: 2.1 })
    );
    crest.position.set(0, 1.42, -0.18);
    g.add(crest);
    return g;
  }

  function createSilverRelicMesh() {
    const grp = new THREE.Group();
    const silMat = new THREE.MeshStandardMaterial({
      color: 0xe6f2ff,
      emissive: 0x4aa8ff,
      emissiveIntensity: 0.95,
      metalness: 0.92,
      roughness: 0.16
    });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.30, 0.18, 12), silMat);
    base.position.y = 0.09;
    grp.add(base);
    const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.56, 0.09), silMat);
    vBar.position.y = 0.44;
    grp.add(vBar);
    const hBar = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.10, 0.09), silMat);
    hBar.position.y = 0.52;
    grp.add(hBar);
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: sharedSparkGlowTex || sharedRedEyeGlowTex,
        color: 0x8ad8ff,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    halo.scale.set(1.5, 1.5, 1);
    halo.position.y = 0.48;
    grp.add(halo);
    return { group: grp, hitMesh: vBar };
  }

  function animateQuadrupedLegs(group, stridePhase, amp) {
    const legs = group.userData.legs;
    if (!legs || legs.length < 4) return;
    const s = Math.sin(stridePhase) * amp;
    legs[0].rotation.x = s;
    legs[1].rotation.x = -s;
    legs[2].rotation.x = -s;
    legs[3].rotation.x = s;
  }

  return {
    createSculptedCowboyHat,
    createTailorNPC,
    createGunsmithNPC,
    createSheriffVanceNPC,
    createDeerModel,
    createWolfModel,
    createBearModel,
    createHorseModel,
    createBanditModel,
    createBanditCaptainModel,
    createForemanSladeModel,
    createNightEnemyModel,
    createCatacombGuardianModel,
    createBossVampireModel,
    createSilverRelicMesh,
    animateQuadrupedLegs
  };
}
