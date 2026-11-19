import * as THREE from 'three';
import { instantiateBuildingGLB, batchStaticMeshesInGroup } from './glb-utils.js';

export function buildTownBuildings(ctx) {
  const {
    L, M, W, C,
    loadedAssets = null,
    saloonQuestTexture, saloonQuestButtonEntries, saloonQuestButtonMeshes, saloonQuestBlockMeshes,
    worldLangButtonMeshes,
    workshopBoardTexture, tailorButtonEntries, tailorButtonMeshes, tailorBlockHitMeshes,
    gunsmithBoardTexture = null, gunsmithButtonEntries = [], gunsmithButtonMeshes = [], gunsmithBlockHitMeshes = [],
    sheriffHitMeshes = [],
    hidingZone, safeHouseCenterWorld, safeHouseDoorAngle, safeHouseDoorHitMeshes
  } = ctx;

  const {
    sharedWoodTex, sharedWoodNormalTex, sharedWoodRoughTex,
    woodWallMat, lightWoodMat, darkWoodMat, weatheredPlankMatA,
    logTimberMat, roofMat, wroughtIronMat, polishedBrassMat,
    stonePlinthMat, windowMat, darkInteriorMat, createContactShadow
  } = M;

  const {
    createWesternSign, createDetailedBarrel, createWagonWheel,
    createFramedWindow, addWeatheredFacadePlanks, createCarvedBatwingDoor
  } = W;

  const { createSculptedCowboyHat, createTailorNPC, createGunsmithNPC, createSheriffVanceNPC } = C;

  function enhanceBuildingGLB(gltfScene, targetHeight = 0) {
    return instantiateBuildingGLB(gltfScene, M, { targetHeight });
  }

  let saloonMainSignMesh = null;
  let saloonLangSignMesh = null;
  let saloonQuestAnchorMesh = null;
  let tailorMainSignMesh = null;
  let tailorCounterMesh = null;
  let tailorNPCGroup = null;
  let safeHouseDoorPivot = null;
  let safeHouseMainSignMesh = null;
  let safeHouseStreetSignMesh = null;

  function buildSaloon() {
    const saloon = new THREE.Group();
    const dict = L();
    const saloonGLTF = loadedAssets && loadedAssets.saloon;

    if (saloonGLTF && saloonGLTF.scene) {
      saloon.add(enhanceBuildingGLB(saloonGLTF.scene, 6.12));
    } else {
      // Prosedyrisk fallback dersom saloon.glb ikke er tilgjengelig
      const deck = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.22, 6.0), darkWoodMat);
      deck.position.set(0, 0.11, 0.5);
      deck.receiveShadow = true;
      deck.castShadow = true;
      saloon.add(deck);

      for (let pz = 2.05; pz <= 3.42; pz += 0.28) {
        const board = new THREE.Mesh(
          new THREE.BoxGeometry(6.56, 0.03, 0.24),
          Math.round(pz * 10) % 2 === 0 ? weatheredPlankMatA : lightWoodMat
        );
        board.position.set(0, 0.23, pz);
        board.rotation.z = ((pz * 7) % 2 - 0.5) * 0.008;
        board.receiveShadow = true;
        saloon.add(board);
      }

      const stepUpper = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.11, 0.32), lightWoodMat);
      stepUpper.position.set(0, 0.12, 3.64);
      stepUpper.receiveShadow = true;
      saloon.add(stepUpper);
      const stepLower = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.09, 0.32), weatheredPlankMatA);
      stepLower.position.set(0, 0.045, 3.92);
      stepLower.receiveShadow = true;
      saloon.add(stepLower);

      const saloonFloor = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.06, 4.1), weatheredPlankMatA);
      saloonFloor.position.set(0, 0.21, -0.2);
      saloonFloor.receiveShadow = true;
      saloon.add(saloonFloor);

      [-2.06, 2.06].forEach((bx) => {
        const frontBay = new THREE.Mesh(new THREE.BoxGeometry(2.08, 4.2, 0.24), woodWallMat);
        frontBay.position.set(bx, 2.34, 1.84);
        frontBay.castShadow = true;
        frontBay.receiveShadow = true;
        saloon.add(frontBay);
      });
      const frontHeader = new THREE.Mesh(new THREE.BoxGeometry(2.06, 1.78, 0.24), woodWallMat);
      frontHeader.position.set(0, 3.55, 1.84);
      frontHeader.castShadow = true;
      saloon.add(frontHeader);

      const backSaloonWall = new THREE.Mesh(new THREE.BoxGeometry(6.2, 4.2, 0.24), woodWallMat);
      backSaloonWall.position.set(0, 2.34, -2.26);
      backSaloonWall.castShadow = true;
      saloon.add(backSaloonWall);

      [-3.04, 3.04].forEach((sx) => {
        const sideSaloonWall = new THREE.Mesh(new THREE.BoxGeometry(0.24, 4.2, 4.16), woodWallMat);
        sideSaloonWall.position.set(sx, 2.34, -0.2);
        sideSaloonWall.castShadow = true;
        saloon.add(sideSaloonWall);
      });

      const barCounter = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.96, 0.68), darkWoodMat);
      barCounter.position.set(0, 0.7, -1.46);
      barCounter.castShadow = true;
      saloon.add(barCounter);

      addWeatheredFacadePlanks(saloon, 5.8, 3.1, 4.3, 1.91, 401);
      addWeatheredFacadePlanks(saloon, 5.9, 4.55, 5.8, 2.01, 402);

      const cornerTrimGeo = new THREE.BoxGeometry(0.2, 4.26, 0.2);
      [
        [-3.06, -2.26], [3.06, -2.26], [-3.06, 1.86], [3.06, 1.86]
      ].forEach(([cx, cz]) => {
        const trim = new THREE.Mesh(cornerTrimGeo, darkWoodMat);
        trim.position.set(cx, 2.35, cz);
        trim.castShadow = true;
        saloon.add(trim);
      });

      const mainRoof = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.24, 4.5), roofMat);
      mainRoof.position.set(0, 4.52, -0.2);
      mainRoof.castShadow = true;
      saloon.add(mainRoof);

      const parapet = new THREE.Mesh(new THREE.BoxGeometry(6.4, 1.58, 0.3), lightWoodMat);
      parapet.position.set(0, 5.18, 1.85);
      parapet.castShadow = true;
      saloon.add(parapet);

      const parapetTrim = new THREE.Mesh(new THREE.BoxGeometry(6.72, 0.22, 0.52), darkWoodMat);
      parapetTrim.position.set(0, 6.0, 1.89);
      parapetTrim.castShadow = true;
      saloon.add(parapetTrim);

      for (let cx = -2.85; cx <= 2.86; cx += 0.57) {
        const corbel = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.18, 0.24), darkWoodMat);
        corbel.position.set(cx, 5.82, 2.04);
        saloon.add(corbel);
      }

      const rafterGeo = new THREE.BoxGeometry(0.1, 0.12, 1.95);
      for (let rx = -2.8; rx <= 2.81; rx += 0.8) {
        const rafter = new THREE.Mesh(rafterGeo, darkWoodMat);
        rafter.position.set(rx, 3.16, 2.66);
        rafter.rotation.x = 0.06;
        saloon.add(rafter);
      }

      const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(6.7, 0.18, 1.9), roofMat);
      porchRoof.position.set(0, 3.28, 2.68);
      porchRoof.rotation.x = 0.06;
      porchRoof.castShadow = true;
      saloon.add(porchRoof);

      const postGeo = new THREE.CylinderGeometry(0.088, 0.102, 3.05, 10);
      [-2.9, -1.1, 1.1, 2.9].forEach((px) => {
        const post = new THREE.Mesh(postGeo, darkWoodMat);
        post.position.set(px, 1.72, 3.38);
        post.castShadow = true;
        saloon.add(post);

        [-1, 1].forEach((dir) => {
          if ((px < -2.5 && dir < 0) || (px > 2.5 && dir > 0)) return;
          const knee = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.085, 0.085), lightWoodMat);
          knee.position.set(px + dir * 0.2, 2.98, 3.38);
          knee.rotation.z = dir * 0.68;
          saloon.add(knee);
        });
      });

      const leftRailTop = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.085, 0.09), lightWoodMat);
      leftRailTop.position.set(-2.0, 0.96, 3.38);
      saloon.add(leftRailTop);
      for (let bx = -2.7; bx <= -1.3; bx += 0.28) {
        const baluster = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.72, 6), darkWoodMat);
        baluster.position.set(bx, 0.58, 3.38);
        saloon.add(baluster);
      }

      const doorFrameTop = new THREE.Mesh(new THREE.BoxGeometry(2.26, 0.15, 0.16), darkWoodMat);
      doorFrameTop.position.set(0, 2.64, 1.94);
      saloon.add(doorFrameTop);
      [-1.05, 1.05].forEach((dx) => {
        const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.42, 0.22), darkWoodMat);
        jamb.position.set(dx, 1.42, 1.90);
        saloon.add(jamb);
      });

      const leftBatwing = createCarvedBatwingDoor(false);
      leftBatwing.position.set(-0.97, 1.38, 1.90);
      leftBatwing.rotation.y = 1.44;
      saloon.add(leftBatwing);

      const rightBatwing = createCarvedBatwingDoor(true);
      rightBatwing.position.set(0.97, 1.38, 1.90);
      rightBatwing.rotation.y = -1.44;
      saloon.add(rightBatwing);

      [-2.14, 2.14].forEach((wx) => {
        const win = createFramedWindow(0.80, 1.16, true);
        win.position.set(wx, 1.88, 1.92);
        saloon.add(win);
      });

      [-1.85, 1.85].forEach((sx) => {
        const strap = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.42, 6), wroughtIronMat);
        strap.position.set(sx, 5.82, 2.05);
        saloon.add(strap);
      });

      const barrel1 = createDetailedBarrel();
      barrel1.position.set(-2.55, 0.65, 2.75);
      saloon.add(barrel1);

      const barrel2 = createDetailedBarrel();
      barrel2.scale.setScalar(0.88);
      barrel2.position.set(-1.92, 0.6, 2.82);
      saloon.add(barrel2);

      const saloonWheel = createWagonWheel();
      saloonWheel.position.set(-3.12, 0.72, 2.85);
      saloonWheel.rotation.y = Math.PI / 2 - 0.15;
      saloonWheel.rotation.x = 0.22;
      saloon.add(saloonWheel);
    }

    // Klikkbar 3D-språkknapp (EN / NO) på Saloon-verandaens venstre stolpe/vegg
    saloonLangSignMesh = createWesternSign(dict.saloonLangSign, dict.saloonLangSub, 1.48, 0.42);
    saloonLangSignMesh.position.set(-2.0, 2.58, 3.45);
    saloon.add(saloonLangSignMesh);
    worldLangButtonMeshes.push(saloonLangSignMesh);

    // Stor interaktiv 3D-oppdragstavle på verandaen utenfor Saloonen (plassert på høyre side slik at trapp + inngang har >2.0m fri bredde)
    const questBoardGroup = new THREE.Group();
    questBoardGroup.position.set(2.08, 2.16, 3.48);
    saloon.add(questBoardGroup);
    saloonQuestAnchorMesh = questBoardGroup;

    [-1.12, 1.12].forEach((lx) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.11, 2.0, 0.11), darkWoodMat);
      leg.position.set(lx, -0.96, -0.05);
      questBoardGroup.add(leg);
    });

    const questBacking = new THREE.Mesh(new THREE.BoxGeometry(2.86, 1.54, 0.08), darkWoodMat);
    questBacking.position.set(0, 0, -0.05);
    questBacking.castShadow = true;
    questBoardGroup.add(questBacking);
    saloonQuestBlockMeshes.push(questBacking);

    const questBoardSurface = new THREE.Mesh(
      new THREE.PlaneGeometry(2.76, 1.44),
      new THREE.MeshBasicMaterial({ map: saloonQuestTexture, transparent: true, fog: false, toneMapped: false })
    );
    questBoardGroup.add(questBoardSurface);
    saloonQuestBlockMeshes.push(questBoardSurface);

    const questBtnY = [0.11, -0.23, -0.57];
    saloonQuestButtonEntries.forEach((entry, idx) => {
      const plaque = new THREE.Mesh(new THREE.BoxGeometry(2.62, 0.325, 0.03), darkWoodMat);
      plaque.position.set(0, questBtnY[idx], 0.016);
      questBoardGroup.add(plaque);

      entry.mesh.position.set(0, questBtnY[idx], 0.034);
      questBoardGroup.add(entry.mesh);
      saloonQuestButtonMeshes.push(entry.mesh);
    });

    // 3D-skilt øverst på Saloon-bygget
    saloonMainSignMesh = createWesternSign(dict.signSaloonTitle, dict.signSaloonSub, 4.4, 1.15);
    saloonMainSignMesh.position.set(0, 5.18, 2.07);
    saloon.add(saloonMainSignMesh);

    return saloon;
  }

  function buildTailorShop() {
    const shop = new THREE.Group();
    const dict = L();
    const tailorGLTF = loadedAssets && loadedAssets.tailor;

    if (tailorGLTF && tailorGLTF.scene) {
      shop.add(enhanceBuildingGLB(tailorGLTF.scene, 5.64));

      const counterAnchor = new THREE.Object3D();
      counterAnchor.position.set(0, 1.26, 1.25);
      shop.add(counterAnchor);
      tailorCounterMesh = counterAnchor;
    } else {
      // Prosedyrisk fallback dersom tailor.glb ikke er tilgjengelig
      const floor = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.22, 5.4), darkWoodMat);
      floor.position.set(0, 0.11, 0.4);
      floor.receiveShadow = true;
      floor.castShadow = true;
      shop.add(floor);

      const frontStep = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.11, 0.36), lightWoodMat);
      frontStep.position.set(0, 0.055, 3.24);
      frontStep.receiveShadow = true;
      shop.add(frontStep);

      const backWall = new THREE.Mesh(new THREE.BoxGeometry(5.4, 3.6, 0.26), lightWoodMat);
      backWall.position.set(0, 2.0, -1.9);
      backWall.castShadow = true;
      backWall.receiveShadow = true;
      shop.add(backWall);

      [-2.58, 2.58].forEach((wx, idx) => {
        const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.26, 3.6, 4.1), woodWallMat);
        sideWall.position.set(wx, 2.0, 0.05);
        sideWall.castShadow = true;
        sideWall.receiveShadow = true;
        shop.add(sideWall);

        const sideWin = createFramedWindow(0.88, 1.05, true);
        sideWin.position.set(wx + (idx === 0 ? -0.14 : 0.14), 2.05, 0.2);
        sideWin.rotation.y = idx === 0 ? -Math.PI / 2 : Math.PI / 2;
        shop.add(sideWin);
      });

      const ceiling = new THREE.Mesh(new THREE.BoxGeometry(5.9, 0.24, 5.3), roofMat);
      ceiling.position.set(0, 3.92, 0.45);
      ceiling.castShadow = true;
      shop.add(ceiling);

      const beamGeo = new THREE.BoxGeometry(0.11, 0.12, 5.15);
      for (let bx = -2.2; bx <= 2.21; bx += 1.1) {
        const beam = new THREE.Mesh(beamGeo, darkWoodMat);
        beam.position.set(bx, 3.76, 0.45);
        shop.add(beam);
      }

      const frontPostGeo = new THREE.CylinderGeometry(0.11, 0.125, 3.6, 10);
      [-2.58, 2.58].forEach((px, pIdx) => {
        const post = new THREE.Mesh(frontPostGeo, darkWoodMat);
        post.position.set(px, 2.0, 2.85);
        post.castShadow = true;
        shop.add(post);

        const dir = pIdx === 0 ? 1 : -1;
        const brace = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.09, 0.09), lightWoodMat);
        brace.position.set(px + dir * 0.24, 3.48, 2.85);
        brace.rotation.z = dir * 0.68;
        shop.add(brace);
      });

      const parapet = new THREE.Mesh(new THREE.BoxGeometry(5.85, 1.48, 0.28), woodWallMat);
      parapet.position.set(0, 4.74, 2.82);
      parapet.castShadow = true;
      shop.add(parapet);

      addWeatheredFacadePlanks(shop, 5.5, 4.12, 5.35, 2.97, 707);

      const parapetCap = new THREE.Mesh(new THREE.BoxGeometry(6.16, 0.2, 0.48), darkWoodMat);
      parapetCap.position.set(0, 5.54, 2.85);
      parapetCap.castShadow = true;
      shop.add(parapetCap);

      for (let cx = -2.6; cx <= 2.61; cx += 0.65) {
        const corbel = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.22), darkWoodMat);
        corbel.position.set(cx, 5.38, 2.98);
        shop.add(corbel);
      }

      const counterBase = new THREE.Mesh(new THREE.BoxGeometry(3.3, 1.0, 0.78), woodWallMat);
      counterBase.position.set(0, 0.7, 1.25);
      counterBase.castShadow = true;
      counterBase.receiveShadow = true;
      shop.add(counterBase);

      [-1.05, 0, 1.05].forEach((px) => {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.68, 0.04), darkWoodMat);
        panel.position.set(px, 0.7, 1.65);
        shop.add(panel);
      });

      const counterTop = new THREE.Mesh(
        new THREE.BoxGeometry(3.55, 0.12, 0.96),
        new THREE.MeshStandardMaterial({
          color: 0x5c361b,
          map: sharedWoodTex,
          normalMap: sharedWoodNormalTex,
          normalScale: new THREE.Vector2(0.32, 0.32),
          roughnessMap: sharedWoodRoughTex,
          roughness: 0.34,
          metalness: 0.06,
          envMapIntensity: 1.1
        })
      );
      counterTop.position.set(0, 1.26, 1.25);
      counterTop.castShadow = true;
      counterTop.receiveShadow = true;
      shop.add(counterTop);
      tailorCounterMesh = counterTop;

      const rollGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.58, 12);
      [
        { x: -0.35, color: 0x9e2820 },
        { x: 0.02, color: 0x26527e },
        { x: 1.05, color: 0xc68c48 }
      ].forEach((r) => {
        const roll = new THREE.Mesh(
          rollGeo,
          new THREE.MeshStandardMaterial({ color: r.color, roughness: 0.85 })
        );
        roll.rotation.z = Math.PI / 2;
        roll.position.set(r.x, 1.42, 1.25);
        roll.castShadow = true;
        shop.add(roll);
      });

      const standPole = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.075, 1.48, 10), darkWoodMat);
      standPole.position.set(-2.05, 0.94, 0.4);
      shop.add(standPole);

      const displayHat = createSculptedCowboyHat(
        new THREE.MeshStandardMaterial({ color: 0x6e3e1c, roughness: 0.78 }),
        polishedBrassMat
      );
      displayHat.position.set(-2.05, 1.68, 0.4);
      displayHat.rotation.z = 0.14;
      displayHat.rotation.y = 0.4;
      shop.add(displayHat);

      const shopBarrel = createDetailedBarrel();
      shopBarrel.position.set(2.25, 0.63, 2.55);
      shop.add(shopBarrel);

      const shopWheel = createWagonWheel();
      shopWheel.position.set(2.92, 0.56, 1.75);
      shopWheel.rotation.y = Math.PI / 2;
      shopWheel.rotation.z = -0.18;
      shop.add(shopWheel);
    }

    tailorMainSignMesh = createWesternSign(dict.signTailorTitle, dict.signTailorSub, 4.3, 1.1);
    tailorMainSignMesh.position.set(0, 4.74, 3.04);
    shop.add(tailorMainSignMesh);

    tailorNPCGroup = createTailorNPC();
    tailorNPCGroup.position.set(-1.12, 0.22, 0.44);
    tailorNPCGroup.rotation.y = 0.14;
    shop.add(tailorNPCGroup);

    // Stor 3D-tavle («TAILOR'S WORKSHOP» / «SKREDDERENS VERKSTED») over/bak disken
    const workshopGroup = new THREE.Group();
    workshopGroup.position.set(0.18, 2.78, -0.55);
    workshopGroup.rotation.x = 0.09;
    shop.add(workshopGroup);

    const boardBacking = new THREE.Mesh(new THREE.BoxGeometry(3.74, 1.72, 0.08), darkWoodMat);
    boardBacking.position.set(0, 0, -0.05);
    workshopGroup.add(boardBacking);
    tailorBlockHitMeshes.push(boardBacking);

    [-1.4, 1.4].forEach((hx) => {
      const hanger = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.45, 6), wroughtIronMat);
      hanger.position.set(hx, 1.02, -0.04);
      workshopGroup.add(hanger);
    });

    const workshopBoardMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(3.64, 1.64),
      new THREE.MeshBasicMaterial({ map: workshopBoardTexture, transparent: true, fog: false, toneMapped: false })
    );
    workshopGroup.add(workshopBoardMesh);
    tailorBlockHitMeshes.push(workshopBoardMesh);

    const buttonOffsetsY = [0.13, -0.22, -0.57];
    tailorButtonEntries.forEach((entry, idx) => {
      const plaque = new THREE.Mesh(new THREE.BoxGeometry(3.42, 0.32, 0.035), darkWoodMat);
      plaque.position.set(0, buttonOffsetsY[idx], 0.018);
      workshopGroup.add(plaque);

      entry.mesh.position.set(0, buttonOffsetsY[idx], 0.038);
      workshopGroup.add(entry.mesh);
      tailorButtonMeshes.push(entry.mesh);
    });

    return shop;
  }

  function buildSafeHouse() {
    const cabin = new THREE.Group();
    const dict = L();
    const cx = safeHouseCenterWorld.x;
    const cz = safeHouseCenterWorld.z;
    // hidingZone utgjør det faktiske innvendige gulvarealet; tømmerveggene ligger 0.16m utenfor på hver side
    const w = (hidingZone.maxX - hidingZone.minX) + 0.32;
    const d = (hidingZone.maxZ - hidingZone.minZ) + 0.32;
    cabin.position.set(cx, 0, cz);

    // Steinfundament og solid plankegulv
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(w + 0.56, 0.18, d + 0.56), stonePlinthMat);
    plinth.position.y = 0.09;
    plinth.receiveShadow = true;
    plinth.castShadow = true;
    cabin.add(plinth);

    const floor = new THREE.Mesh(new THREE.BoxGeometry(w + 0.22, 0.08, d + 0.22), darkWoodMat);
    floor.position.y = 0.20;
    floor.receiveShadow = true;
    cabin.add(floor);

    // Tykke tømmerstokker rundt veggene (med lafteknuter i hjørnene) og fri døråpning >= 1,92 m
    const logRadius = 0.145;
    const logRows = 9;
    const wallHeightBase = 0.34;
    const logStepY = 0.255;
    const halfW = w * 0.5;
    const halfD = d * 0.5;
    const doorWidth = 1.96;
    const doorTopRow = 8; // rader 0..7 har døråpning på østveggen (+X)

    const fullLogXGeo = new THREE.CylinderGeometry(logRadius, logRadius, w + 0.68, 8);
    fullLogXGeo.rotateZ(Math.PI / 2);
    const fullLogZGeo = new THREE.CylinderGeometry(logRadius, logRadius, d + 0.68, 8);
    fullLogZGeo.rotateX(Math.PI / 2);
    const stubSideLen = (d - doorWidth) * 0.5 + 0.34;
    const doorStubZGeo = new THREE.CylinderGeometry(logRadius, logRadius, stubSideLen, 8);
    doorStubZGeo.rotateX(Math.PI / 2);

    for (let row = 0; row < logRows; row++) {
      const ly = wallHeightBase + row * logStepY;

      // Nordvegg (-Z) og Sørvegg (+Z)
      [-halfD, halfD].forEach((wz) => {
        const logMesh = new THREE.Mesh(fullLogXGeo, logTimberMat);
        logMesh.position.set(0, ly, wz);
        logMesh.castShadow = true;
        logMesh.receiveShadow = true;
        cabin.add(logMesh);
      });

      // Vestvegg (-X, bakvegg)
      const backLog = new THREE.Mesh(fullLogZGeo, logTimberMat);
      backLog.position.set(-halfW, ly, 0);
      backLog.castShadow = true;
      backLog.receiveShadow = true;
      cabin.add(backLog);

      // Østvegg (+X, front mot gata med åpen døråpning i midten)
      if (row < doorTopRow) {
        const stubOffset = doorWidth * 0.5 + stubSideLen * 0.5 - 0.17;
        [-stubOffset, stubOffset].forEach((sz) => {
          const stub = new THREE.Mesh(doorStubZGeo, logTimberMat);
          stub.position.set(halfW, ly, sz);
          stub.castShadow = true;
          stub.receiveShadow = true;
          cabin.add(stub);
        });
      } else {
        const lintelLog = new THREE.Mesh(fullLogZGeo, logTimberMat);
        lintelLog.position.set(halfW, ly, 0);
        lintelLog.castShadow = true;
        cabin.add(lintelLog);
      }
    }

    // Kraftige dørstolper og jernbeslag rundt døråpningen
    [-doorWidth * 0.5 - 0.06, doorWidth * 0.5 + 0.06].forEach((jz) => {
      const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.32, 2.15, 0.14), darkWoodMat);
      jamb.position.set(halfW, 1.28, jz);
      jamb.castShadow = true;
      cabin.add(jamb);
    });
    const ironHeader = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, doorWidth + 0.36), wroughtIronMat);
    ironHeader.position.set(halfW, 2.38, 0);
    cabin.add(ironHeader);

    // Forsterket skråtak med bjelker
    const roofSlab = new THREE.Mesh(new THREE.BoxGeometry(w + 1.05, 0.22, d + 1.0), roofMat);
    roofSlab.position.set(0.08, 2.86, 0);
    roofSlab.rotation.z = -0.08;
    roofSlab.castShadow = true;
    roofSlab.receiveShadow = true;
    cabin.add(roofSlab);

    for (let rz = -1.6; rz <= 1.61; rz += 0.8) {
      const rafter = new THREE.Mesh(new THREE.BoxGeometry(w + 1.2, 0.1, 0.1), darkWoodMat);
      rafter.position.set(0.08, 2.73, rz);
      rafter.rotation.z = -0.08;
      cabin.add(rafter);
    }

    // Tung hengslet tredør med smijernsbeslag og messingring (åpnes/lukkes med klikk/skudd/F)
    safeHouseDoorPivot = new THREE.Group();
    safeHouseDoorPivot.position.set(halfW + 0.04, 0.24, -doorWidth * 0.5);
    safeHouseDoorPivot.rotation.y = safeHouseDoorAngle;
    cabin.add(safeHouseDoorPivot);

    const doorPlank = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 2.08, doorWidth - 0.04),
      new THREE.MeshStandardMaterial({
        color: 0x7c4b27,
        map: sharedWoodTex,
        normalMap: sharedWoodNormalTex,
        normalScale: new THREE.Vector2(0.72, 0.72),
        roughnessMap: sharedWoodRoughTex,
        roughness: 0.65,
        metalness: 0.08
      })
    );
    doorPlank.position.set(0, 1.04, (doorWidth - 0.04) * 0.5);
    doorPlank.castShadow = true;
    doorPlank.receiveShadow = true;
    safeHouseDoorPivot.add(doorPlank);
    safeHouseDoorHitMeshes.push(doorPlank);

    // Horisontale og diagonale jernbånd på døren
    [0.32, 1.76].forEach((sy) => {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.09, doorWidth - 0.12), wroughtIronMat);
      strap.position.set(0, sy, (doorWidth - 0.04) * 0.5);
      safeHouseDoorPivot.add(strap);
      safeHouseDoorHitMeshes.push(strap);
    });
    const diagBrace = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.62, 0.09), darkWoodMat);
    diagBrace.position.set(-0.02, 1.04, (doorWidth - 0.04) * 0.5);
    diagBrace.rotation.x = 0.62;
    safeHouseDoorPivot.add(diagBrace);
    safeHouseDoorHitMeshes.push(diagBrace);

    const handleRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.075, 0.016, 6, 12),
      new THREE.MeshStandardMaterial({ color: 0xe2b354, metalness: 0.85, roughness: 0.25 })
    );
    handleRing.rotation.y = Math.PI / 2;
    handleRing.position.set(0.075, 1.02, doorWidth - 0.22);
    safeHouseDoorPivot.add(handleRing);
    safeHouseDoorHitMeshes.push(handleRing);

    // Innvendige detaljer: benk/køye og forsyningskasse tett langs bakveggen
    const bunk = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.42, 1.84), lightWoodMat);
    bunk.position.set(-halfW + 0.54, 0.44, -0.82);
    bunk.receiveShadow = true;
    cabin.add(bunk);

    const supplyCrate = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.65, 0.64), woodWallMat);
    supplyCrate.position.set(-halfW + 0.48, 0.55, 1.28);
    supplyCrate.castShadow = true;
    cabin.add(supplyCrate);

    // 3D-skilt: «SAFE HOUSE» over døråpningen + uthengsskilt synlig rett nedover hovedgata
    safeHouseMainSignMesh = createWesternSign(dict.signSafeHouseTitle, dict.signSafeHouseSub, 2.7, 0.72);
    safeHouseMainSignMesh.position.set(halfW + 0.52, 3.22, 0);
    safeHouseMainSignMesh.rotation.y = Math.PI / 2;
    cabin.add(safeHouseMainSignMesh);

    const signBracket = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.08, 0.08), wroughtIronMat);
    signBracket.position.set(halfW + 0.55, 3.36, halfD + 0.08);
    cabin.add(signBracket);

    safeHouseStreetSignMesh = createWesternSign(dict.signSafeHouseTitle, dict.signSafeHouseSub, 1.85, 0.52);
    safeHouseStreetSignMesh.position.set(halfW + 0.65, 3.02, halfD + 0.1);
    cabin.add(safeHouseStreetSignMesh);

    const backStreetSign = createWesternSign(dict.signSafeHouseTitle, dict.signSafeHouseSub, 1.85, 0.52);
    backStreetSign.position.set(halfW + 0.65, 3.02, halfD + 0.06);
    backStreetSign.rotation.y = Math.PI;
    cabin.add(backStreetSign);
    safeHouseStreetSignMesh.userData.mirrorSign = backStreetSign;

    batchStaticMeshesInGroup(cabin, { protectedObjects: new Set([safeHouseDoorPivot]) });
    return cabin;
  }

  let gunsmithMainSignMesh = null;
  let gunsmithCounterMesh = null;
  let gunsmithNPCGroup = null;

  function buildGunsmithShop() {
    const shop = new THREE.Group();
    const dict = L();
    const gunsmithGLTF = loadedAssets && loadedAssets.gunsmith;

    if (gunsmithGLTF && gunsmithGLTF.scene) {
      shop.add(enhanceBuildingGLB(gunsmithGLTF.scene, 5.64));

      const counterAnchor = new THREE.Object3D();
      counterAnchor.position.set(0, 1.26, 1.25);
      shop.add(counterAnchor);
      gunsmithCounterMesh = counterAnchor;
    } else {
      // Prosedyrisk fallback for Våpensmed-bygningen (åpen front >= 3,84 m)
      const floor = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.22, 5.4), darkWoodMat);
      floor.position.set(0, 0.11, 0.4);
      floor.receiveShadow = true;
      floor.castShadow = true;
      shop.add(floor);

      const frontStep = new THREE.Mesh(new THREE.BoxGeometry(3.84, 0.11, 0.36), lightWoodMat);
      frontStep.position.set(0, 0.055, 3.24);
      frontStep.receiveShadow = true;
      shop.add(frontStep);

      const backWall = new THREE.Mesh(new THREE.BoxGeometry(5.4, 3.6, 0.26), woodWallMat);
      backWall.position.set(0, 2.0, -1.9);
      backWall.castShadow = true;
      shop.add(backWall);

      [-2.58, 2.58].forEach((wx, idx) => {
        const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.26, 3.6, 4.1), woodWallMat);
        sideWall.position.set(wx, 2.0, 0.05);
        sideWall.castShadow = true;
        shop.add(sideWall);

        const sideWin = createFramedWindow(0.86, 1.05, true);
        sideWin.position.set(wx + (idx === 0 ? -0.14 : 0.14), 2.05, 0.2);
        sideWin.rotation.y = idx === 0 ? -Math.PI / 2 : Math.PI / 2;
        shop.add(sideWin);
      });

      const ceiling = new THREE.Mesh(new THREE.BoxGeometry(5.9, 0.24, 5.3), roofMat);
      ceiling.position.set(0, 3.92, 0.45);
      ceiling.castShadow = true;
      shop.add(ceiling);

      [-2.58, 2.58].forEach((px) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.125, 3.6, 10), darkWoodMat);
        post.position.set(px, 2.0, 2.85);
        post.castShadow = true;
        shop.add(post);
      });

      const parapet = new THREE.Mesh(new THREE.BoxGeometry(5.85, 1.48, 0.28), darkWoodMat);
      parapet.position.set(0, 4.74, 2.82);
      parapet.castShadow = true;
      shop.add(parapet);

      const parapetCap = new THREE.Mesh(new THREE.BoxGeometry(6.16, 0.2, 0.48), wroughtIronMat);
      parapetCap.position.set(0, 5.54, 2.85);
      shop.add(parapetCap);

      const counterBase = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.0, 0.78), darkWoodMat);
      counterBase.position.set(0, 0.72, 1.25);
      counterBase.castShadow = true;
      shop.add(counterBase);

      const counterTop = new THREE.Mesh(new THREE.BoxGeometry(3.58, 0.12, 0.96), lightWoodMat);
      counterTop.position.set(0, 1.26, 1.25);
      shop.add(counterTop);
      gunsmithCounterMesh = counterTop;

      // Smijerns-ambolt på eikestubbe
      const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.56, 10), logTimberMat);
      stump.position.set(2.18, 0.50, 2.32);
      shop.add(stump);
      const anvilBody = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.26, 0.22), wroughtIronMat);
      anvilBody.position.set(2.18, 0.91, 2.32);
      shop.add(anvilBody);
      const anvilHorn = new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.28, 8), wroughtIronMat);
      anvilHorn.rotation.z = -Math.PI / 2;
      anvilHorn.position.set(2.50, 0.94, 2.32);
      shop.add(anvilHorn);

      // Ammunisjonskasser og våpenstativ
      const ammoCrate1 = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.44, 0.48), woodWallMat);
      ammoCrate1.position.set(2.04, 0.44, 0.28);
      shop.add(ammoCrate1);
      const ammoCrate2 = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.38, 0.44), lightWoodMat);
      ammoCrate2.position.set(2.02, 0.85, 0.26);
      ammoCrate2.rotation.y = 0.2;
      shop.add(ammoCrate2);
    }

    gunsmithMainSignMesh = createWesternSign(dict.signGunsmithTitle, dict.signGunsmithSub, 4.3, 1.1);
    gunsmithMainSignMesh.position.set(0, 4.74, 3.04);
    shop.add(gunsmithMainSignMesh);

    if (createGunsmithNPC) {
      gunsmithNPCGroup = createGunsmithNPC(gunsmithBlockHitMeshes);
      gunsmithNPCGroup.position.set(-1.12, 0.22, 0.44);
      gunsmithNPCGroup.rotation.y = 0.12;
      shop.add(gunsmithNPCGroup);
    }

    // Interaktiv 3D-tavle («GUNSMITH'S ARMORY» / «VÅPENSMEDENS VERKSTED») med opptil 5 klikkbare knapper
    if (gunsmithBoardTexture) {
      const armoryGroup = new THREE.Group();
      armoryGroup.position.set(0.18, 2.74, -0.54);
      armoryGroup.rotation.x = 0.08;
      shop.add(armoryGroup);

      const backing = new THREE.Mesh(new THREE.BoxGeometry(3.84, 2.24, 0.08), darkWoodMat);
      backing.position.set(0, 0, -0.05);
      armoryGroup.add(backing);
      gunsmithBlockHitMeshes.push(backing);

      [-1.45, 1.45].forEach((hx) => {
        const hanger = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.45, 6), wroughtIronMat);
        hanger.position.set(hx, 1.24, -0.04);
        armoryGroup.add(hanger);
      });

      const boardMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(3.74, 2.14),
        new THREE.MeshBasicMaterial({ map: gunsmithBoardTexture, transparent: true, fog: false, toneMapped: false })
      );
      armoryGroup.add(boardMesh);
      gunsmithBlockHitMeshes.push(boardMesh);

      const btnY = gunsmithButtonEntries.length > 4
        ? [0.36, 0.08, -0.20, -0.48, -0.76]
        : [0.22, -0.09, -0.40, -0.71];
      const plaqueH = gunsmithButtonEntries.length > 4 ? 0.24 : 0.275;
      gunsmithButtonEntries.forEach((entry, idx) => {
        const py = btnY[idx] !== undefined ? btnY[idx] : (-0.76 - (idx - 4) * 0.28);
        const plaque = new THREE.Mesh(new THREE.BoxGeometry(3.48, plaqueH, 0.035), darkWoodMat);
        plaque.position.set(0, py, 0.018);
        armoryGroup.add(plaque);

        entry.mesh.position.set(0, py, 0.038);
        armoryGroup.add(entry.mesh);
        gunsmithButtonMeshes.push(entry.mesh);
      });
    }

    return shop;
  }

  // Lesbare 3D Lore / Wanted-plakater (CanvasTexture på EN/NO)
  const lorePosters = [];

  function renderPosterCanvas(canvas, ctx, posterData) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Slitt pergament med brent kant
    ctx.fillStyle = '#e7cf9e';
    ctx.fillRect(14, 14, canvas.width - 28, canvas.height - 28);
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#4f2c14';
    ctx.strokeRect(14, 14, canvas.width - 28, canvas.height - 28);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#8b572a';
    ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

    // Smijernsnagler i hjørnene
    [[38, 38], [474, 38], [38, 602], [474, 602]].forEach(([nx, ny]) => {
      ctx.fillStyle = '#2b2018';
      ctx.beginPath();
      ctx.arc(nx, ny, 7, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.textAlign = 'center';
    ctx.fillStyle = '#6e1914';
    ctx.font = 'bold 30px Georgia, serif';
    ctx.fillText(posterData.header, 256, 88);

    ctx.fillStyle = '#241309';
    ctx.font = 'bold 38px Georgia, serif';
    ctx.fillText(posterData.title, 256, 146);

    ctx.strokeStyle = '#6b3e1e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(56, 176);
    ctx.lineTo(456, 176);
    ctx.stroke();

    ctx.font = 'bold 24px Georgia, serif';
    ctx.fillStyle = '#2f1b0d';
    posterData.lines.forEach((line, idx) => {
      ctx.fillText(line, 256, 245 + idx * 66);
    });

    // Dekorativ Sheriff-stjerne nederst
    ctx.fillStyle = '#9c6820';
    ctx.font = 'bold 28px Georgia, serif';
    ctx.fillText('★  DUSTWOOD  ★', 256, 560);
  }

  function createLorePoster(posterIndex) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 640;
    const pCtx = canvas.getContext('2d');
    const dict = L();
    const pData = (dict.posters && dict.posters[posterIndex]) || { header: '', title: '', lines: [] };
    renderPosterCanvas(canvas, pCtx, pData);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

    const group = new THREE.Group();
    const backing = new THREE.Mesh(new THREE.BoxGeometry(0.92, 1.14, 0.04), darkWoodMat);
    backing.position.z = -0.022;
    group.add(backing);

    const paper = new THREE.Mesh(
      new THREE.PlaneGeometry(0.84, 1.05),
      new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })
    );
    group.add(paper);

    group.userData.refreshPoster = () => {
      const d = L();
      if (d.posters && d.posters[posterIndex]) {
        renderPosterCanvas(canvas, pCtx, d.posters[posterIndex]);
        tex.needsUpdate = true;
      }
    };
    lorePosters.push(group);
    return group;
  }

  // Sheriff Vance + lesbar dialogtavle over ham utenfor Safe House / Saloonen
  let sheriffVanceGroup = null;
  let sheriffDialogueMesh = null;

  if (createSheriffVanceNPC) {
    sheriffVanceGroup = createSheriffVanceNPC(sheriffHitMeshes);

    const sCanvas = document.createElement('canvas');
    sCanvas.width = 768;
    sCanvas.height = 192;
    const sCtx = sCanvas.getContext('2d');
    const sTex = new THREE.CanvasTexture(sCanvas);
    sTex.colorSpace = THREE.SRGBColorSpace;

    function updateSheriffDialogue(actIdx = 0) {
      const d = L();
      const quote = (d.sheriffQuotes && d.sheriffQuotes[Math.min(actIdx, d.sheriffQuotes.length - 1)]) || '';
      sCtx.clearRect(0, 0, 768, 192);
      sCtx.fillStyle = 'rgba(34, 19, 10, 0.94)';
      sCtx.strokeStyle = '#ffd066';
      sCtx.lineWidth = 6;
      sCtx.beginPath();
      sCtx.roundRect(8, 8, 752, 176, 18);
      sCtx.fill();
      sCtx.stroke();

      sCtx.textAlign = 'center';
      sCtx.fillStyle = '#ffd875';
      sCtx.font = 'bold 28px Georgia, serif';
      sCtx.fillText(`★ ${d.sheriffBannerTitle || 'SHERIFF VANCE'} ★`, 384, 46);

      // To-linjers automatisk tekstbryting
      sCtx.fillStyle = '#fff5df';
      sCtx.font = 'bold 22px sans-serif';
      const words = quote.split(' ');
      let line1 = '';
      let line2 = '';
      for (let i = 0; i < words.length; i++) {
        const test = line1 ? `${line1} ${words[i]}` : words[i];
        if (sCtx.measureText(test).width < 700 || !line1) {
          line1 = test;
        } else {
          line2 = words.slice(i).join(' ');
          break;
        }
      }
      sCtx.fillText(line1, 384, line2 ? 98 : 114);
      if (line2) sCtx.fillText(line2, 384, 138);
      sTex.needsUpdate = true;
    }

    updateSheriffDialogue(0);
    const sSpriteMat = new THREE.SpriteMaterial({
      map: sTex,
      transparent: true,
      depthWrite: false,
      fog: false,
      toneMapped: false
    });
    sheriffDialogueMesh = new THREE.Sprite(sSpriteMat);
    sheriffDialogueMesh.scale.set(2.65, 0.66, 1);
    sheriffDialogueMesh.position.set(0, 2.32, 0);
    sheriffVanceGroup.add(sheriffDialogueMesh);
    sheriffVanceGroup.userData.updateSheriffDialogue = updateSheriffDialogue;
  }

  const saloonBuilding = buildSaloon();
  const tailorBuilding = buildTailorShop();
  const gunsmithBuilding = buildGunsmithShop();
  const safeHouseBuilding = buildSafeHouse();

  // Plasser Plakat #1 på Saloon-veggen og Plakat #2 på Skredder/Våpensmed-stolpen
  const saloonPoster = createLorePoster(0);
  saloonPoster.position.set(-0.98, 1.56, 2.04);
  saloonBuilding.add(saloonPoster);

  const townLorePoster = createLorePoster(1);
  townLorePoster.position.set(-2.58, 1.58, 3.02);
  gunsmithBuilding.add(townLorePoster);

  // Kontaktskygger under tønner på verandaene
  if (createContactShadow) {
    const sBarrelShadow = createContactShadow(0.55, 0.55, 0.245);
    sBarrelShadow.position.set(-2.25, 0.245, 2.78);
    saloonBuilding.add(sBarrelShadow);
  }

  return {
    saloonBuilding,
    saloonMainSignMesh,
    saloonLangSignMesh,
    saloonQuestAnchorMesh,
    tailorBuilding,
    tailorMainSignMesh,
    tailorCounterMesh,
    tailorNPCGroup,
    gunsmithBuilding,
    gunsmithMainSignMesh,
    gunsmithCounterMesh,
    gunsmithNPCGroup,
    safeHouseBuilding,
    safeHouseDoorPivot,
    safeHouseMainSignMesh,
    safeHouseStreetSignMesh,
    sheriffVanceGroup,
    createLorePoster,
    lorePosters
  };
}
