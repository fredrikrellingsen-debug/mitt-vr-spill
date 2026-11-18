import * as THREE from 'three';

export function buildTownBuildings(ctx) {
  const {
    L, M, W, C,
    saloonQuestTexture, saloonQuestButtonEntries, saloonQuestButtonMeshes, saloonQuestBlockMeshes,
    worldLangButtonMeshes,
    workshopBoardTexture, tailorButtonEntries, tailorButtonMeshes, tailorBlockHitMeshes,
    hidingZone, safeHouseCenterWorld, safeHouseDoorAngle, safeHouseDoorHitMeshes
  } = ctx;

  const {
    sharedWoodTex, sharedWoodBumpTex,
    woodWallMat, lightWoodMat, darkWoodMat, weatheredPlankMatA,
    logTimberMat, roofMat, wroughtIronMat, polishedBrassMat,
    stonePlinthMat, darkInteriorMat
  } = M;

  const {
    createWesternSign, createDetailedBarrel, createWagonWheel,
    createFramedWindow, addWeatheredFacadePlanks, createCarvedBatwingDoor
  } = W;

  const { createSculptedCowboyHat, createTailorNPC } = C;

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

    // Verandagulv bygget med tydelige plankebord langs bredden
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

    // Verandatrapp i to trinn
    const stepUpper = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.11, 0.32), lightWoodMat);
    stepUpper.position.set(0, 0.12, 3.64);
    stepUpper.receiveShadow = true;
    saloon.add(stepUpper);
    const stepLower = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.09, 0.32), weatheredPlankMatA);
    stepLower.position.set(0, 0.045, 3.92);
    stepLower.receiveShadow = true;
    saloon.add(stepLower);

    // Bygningskropp + håndlagde skjeve/slitte fasadeplanker
    const body = new THREE.Mesh(new THREE.BoxGeometry(6.2, 4.2, 4.2), woodWallMat);
    body.position.set(0, 2.34, -0.2);
    body.castShadow = true;
    body.receiveShadow = true;
    saloon.add(body);

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

    // Hovedtak bak parapeten med shingel + bumpMap
    const mainRoof = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.24, 4.5), roofMat);
    mainRoof.position.set(0, 4.52, -0.2);
    mainRoof.castShadow = true;
    saloon.add(mainRoof);

    // Klassisk høy western-fasade øverst med utskåret gesims og skråstivere
    const parapet = new THREE.Mesh(new THREE.BoxGeometry(6.4, 1.58, 0.3), lightWoodMat);
    parapet.position.set(0, 5.18, 1.85);
    parapet.castShadow = true;
    saloon.add(parapet);

    const parapetTrim = new THREE.Mesh(new THREE.BoxGeometry(6.72, 0.22, 0.52), darkWoodMat);
    parapetTrim.position.set(0, 6.0, 1.89);
    parapetTrim.castShadow = true;
    saloon.add(parapetTrim);

    // Dekorative gesimsklosser (corbels) under toppen av Saloonen
    for (let cx = -2.85; cx <= 2.86; cx += 0.57) {
      const corbel = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.18, 0.24), darkWoodMat);
      corbel.position.set(cx, 5.82, 2.04);
      saloon.add(corbel);
    }

    // Synlige takbjelker (rafters) under verandataket
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

    // Dreide verandastolper med skrå knebjelker øverst
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

    // Rekkverk på venstre del av verandaen
    const leftRailTop = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.085, 0.09), lightWoodMat);
    leftRailTop.position.set(-2.0, 0.96, 3.38);
    saloon.add(leftRailTop);
    for (let bx = -2.7; bx <= -1.3; bx += 0.28) {
      const baluster = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.72, 6), darkWoodMat);
      baluster.position.set(bx, 0.58, 3.38);
      saloon.add(baluster);
    }

    // Mørk døråpning, utskåret dørkarm og utskårne svingdører (batwing doors)
    const doorFrameTop = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.15, 0.13), darkWoodMat);
    doorFrameTop.position.set(0, 2.64, 1.94);
    saloon.add(doorFrameTop);
    [-0.78, 0.78].forEach((dx) => {
      const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.42, 0.12), darkWoodMat);
      jamb.position.set(dx, 1.42, 1.94);
      saloon.add(jamb);
    });

    const doorway = new THREE.Mesh(new THREE.PlaneGeometry(1.44, 2.36), darkInteriorMat);
    doorway.position.set(0, 1.4, 1.91);
    saloon.add(doorway);

    const leftBatwing = createCarvedBatwingDoor(false);
    leftBatwing.position.set(-0.71, 1.38, 1.97);
    leftBatwing.rotation.y = 0.24;
    saloon.add(leftBatwing);

    const rightBatwing = createCarvedBatwingDoor(true);
    rightBatwing.position.set(0.71, 1.38, 1.97);
    rightBatwing.rotation.y = -0.18;
    saloon.add(rightBatwing);

    // Innrammede saloon-vinduer med ekte treskodder og varm glød om natten
    [-2.08, 2.08].forEach((wx) => {
      const win = createFramedWindow(0.92, 1.16, true);
      win.position.set(wx, 1.88, 1.92);
      saloon.add(win);
    });

    // Klikkbar 3D-språkknapp (EN / NO) på Saloon-verandaens venstre stolpe/vegg
    saloonLangSignMesh = createWesternSign(dict.saloonLangSign, dict.saloonLangSub, 1.48, 0.42);
    saloonLangSignMesh.position.set(-2.0, 2.58, 3.45);
    saloon.add(saloonLangSignMesh);
    worldLangButtonMeshes.push(saloonLangSignMesh);

    // Stor interaktiv 3D-oppdragstavle på verandaen utenfor Saloonen
    const questBoardGroup = new THREE.Group();
    questBoardGroup.position.set(1.98, 2.16, 3.48);
    saloon.add(questBoardGroup);
    saloonQuestAnchorMesh = questBoardGroup;

    [-1.18, 1.18].forEach((lx) => {
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

    // 3D-skilt øverst på Saloon-bygget med smijernsbeslag
    saloonMainSignMesh = createWesternSign(dict.signSaloonTitle, dict.signSaloonSub, 4.4, 1.15);
    saloonMainSignMesh.position.set(0, 5.18, 2.06);
    saloon.add(saloonMainSignMesh);

    [-1.85, 1.85].forEach((sx) => {
      const strap = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.42, 6), wroughtIronMat);
      strap.position.set(sx, 5.82, 2.05);
      saloon.add(strap);
    });

    // Detaljerte tønner og vognhjul ved Saloonen
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

    return saloon;
  }

  function buildTailorShop() {
    const shop = new THREE.Group();
    const dict = L();

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

      // Sidevinduer med treskodder og varmt lys om natten
      const sideWin = createFramedWindow(0.88, 1.05, true);
      sideWin.position.set(wx + (idx === 0 ? -0.14 : 0.14), 2.05, 0.2);
      sideWin.rotation.y = idx === 0 ? -Math.PI / 2 : Math.PI / 2;
      shop.add(sideWin);
    });

    const ceiling = new THREE.Mesh(new THREE.BoxGeometry(5.9, 0.24, 5.3), roofMat);
    ceiling.position.set(0, 3.92, 0.45);
    ceiling.castShadow = true;
    shop.add(ceiling);

    // Takbjelker i himlingen
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

    tailorMainSignMesh = createWesternSign(dict.signTailorTitle, dict.signTailorSub, 4.3, 1.1);
    tailorMainSignMesh.position.set(0, 4.74, 3.03);
    shop.add(tailorMainSignMesh);

    // Butikkdisk med polert treplate og utskårne speilpaneler foran
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
        bumpMap: sharedWoodBumpTex,
        bumpScale: 0.06,
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

    tailorNPCGroup = createTailorNPC();
    tailorNPCGroup.position.set(-1.12, 0.2, 0.44);
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

    // Dreid hattestativ med ekte skulpturert Stetson-cowboyhatt
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

    // Tønne og vognhjul ved siden av Skredder-butikken
    const shopBarrel = createDetailedBarrel();
    shopBarrel.position.set(2.25, 0.63, 2.55);
    shop.add(shopBarrel);

    const shopWheel = createWagonWheel();
    shopWheel.position.set(2.92, 0.56, 1.75);
    shopWheel.rotation.y = Math.PI / 2;
    shopWheel.rotation.z = -0.18;
    shop.add(shopWheel);

    return shop;
  }

  function buildSafeHouse() {
    const cabin = new THREE.Group();
    const dict = L();
    const cx = safeHouseCenterWorld.x; // -5.45
    const cz = safeHouseCenterWorld.z; // -6.30
    const w = hidingZone.maxX - hidingZone.minX; // 3.90
    const d = hidingZone.maxZ - hidingZone.minZ; // 3.80
    cabin.position.set(cx, 0, cz);

    // Steinfundament og solid plankegulv
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(w + 0.52, 0.18, d + 0.52), stonePlinthMat);
    plinth.position.y = 0.09;
    plinth.receiveShadow = true;
    plinth.castShadow = true;
    cabin.add(plinth);

    const floor = new THREE.Mesh(new THREE.BoxGeometry(w + 0.16, 0.08, d + 0.16), darkWoodMat);
    floor.position.y = 0.20;
    floor.receiveShadow = true;
    cabin.add(floor);

    // Tykke tømmerstokker rundt veggene (med lafteknuter i hjørnene)
    const logRadius = 0.145;
    const logRows = 9;
    const wallHeightBase = 0.34;
    const logStepY = 0.255;
    const halfW = w * 0.5;
    const halfD = d * 0.5;
    const doorWidth = 1.32;
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

    // Innvendige detaljer: benk/køye og forsyningskasse langs bakveggen
    const bunk = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.42, 2.1), lightWoodMat);
    bunk.position.set(-halfW + 0.62, 0.44, -0.55);
    bunk.receiveShadow = true;
    cabin.add(bunk);

    const supplyCrate = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.65, 0.72), woodWallMat);
    supplyCrate.position.set(-halfW + 0.56, 0.55, 1.15);
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

    return cabin;
  }

  const saloonBuilding = buildSaloon();
  const tailorBuilding = buildTailorShop();
  const safeHouseBuilding = buildSafeHouse();

  return {
    saloonBuilding,
    saloonMainSignMesh,
    saloonLangSignMesh,
    saloonQuestAnchorMesh,
    tailorBuilding,
    tailorMainSignMesh,
    tailorCounterMesh,
    tailorNPCGroup,
    safeHouseBuilding,
    safeHouseDoorPivot,
    safeHouseMainSignMesh,
    safeHouseStreetSignMesh
  };
}
