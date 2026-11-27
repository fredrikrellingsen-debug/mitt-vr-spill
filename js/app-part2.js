    // --- 5b2. Våpensmed-butikk («GUNSMITH'S ARMORY» / «VÅPENSMEDENS VERKSTED») ---
    const GUNSMITH_ITEMS = [
      { id: 'shotgun', type: 'weapon', weaponId: 'shotgun', goldCost: 45, peltCost: 0 },
      { id: 'rifle', type: 'weapon', weaponId: 'rifle', goldCost: 80, peltCost: 0 },
      { id: 'crossbow', type: 'weapon', weaponId: 'crossbow', goldCost: 65, pureGoldCost: 155, peltCost: 2 },
      { id: 'dynamite_pack', type: 'ammo', amount: 3, goldCost: 15, peltCost: 0 },
      { id: 'hellfire', type: 'weapon', weaponId: 'hellfire', goldCost: 120, pureGoldCost: 420, peltCost: 0, minLevel: 7 }
    ];

    let gunsmithCounterMesh = null;
    let gunsmithNPCGroup = null;
    const gunsmithButtonMeshes = [];
    const gunsmithBlockHitMeshes = [];
    const sheriffHitMeshes = [];
    let gunsmithStatusKey = '';
    let gunsmithStatusArg = null;
    let gunsmithStatusSuccess = true;
    let gunsmithStatusTimer = 0;

    const gunsmithBoardCanvas = document.createElement('canvas');
    gunsmithBoardCanvas.width = 1024;
    gunsmithBoardCanvas.height = 576;
    const gunsmithBoardCtx = gunsmithBoardCanvas.getContext('2d');
    const gunsmithBoardTexture = new THREE.CanvasTexture(gunsmithBoardCanvas);
    gunsmithBoardTexture.colorSpace = THREE.SRGBColorSpace;
    gunsmithBoardTexture.anisotropy = maxAnisotropy;

    function createGunsmithButtonEntry(item) {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 88;
      const ctx = canvas.getContext('2d');
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = maxAnisotropy;

      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(3.44, 0.228),
        new THREE.MeshBasicMaterial({ map: texture, transparent: true, fog: false, toneMapped: false })
      );
      mesh.userData.gunsmithItem = item;
      return { item, canvas, ctx, texture, mesh };
    }

    const gunsmithButtonEntries = GUNSMITH_ITEMS.map((item) => createGunsmithButtonEntry(item));

    function resolveGunsmithMessage() {
      const dict = L();
      if (!gunsmithStatusKey) return '';
      if (gunsmithStatusKey === 'owned') return dict.gunsmithMsgOwned;
      if (gunsmithStatusKey === 'locked_level') return dict.gunsmithMsgLockedLevel;
      if (gunsmithStatusKey === 'no_gold') return dict.gunsmithMsgNoGold;
      if (gunsmithStatusKey === 'no_pelts') return dict.gunsmithMsgNoPelts;
      if (gunsmithStatusKey === 'bought_weapon') {
        return dict.gunsmithMsgBoughtWeapon(getLocalizedWeaponName(gunsmithStatusArg || 'shotgun'));
      }
      if (gunsmithStatusKey === 'bought_dynamite') {
        return dict.gunsmithMsgBoughtDynamite(playerState.dynamite);
      }
      if (gunsmithStatusKey === 'mastery_up' && dict.gunsmithMsgMasteryUp) {
        return dict.gunsmithMsgMasteryUp(weaponMasteryRank, weaponMasteryRank * 20);
      }
      return gunsmithStatusKey;
    }

    function updateGunsmithUI() {
      const dict = L();
      gunsmithBoardCtx.clearRect(0, 0, gunsmithBoardCanvas.width, gunsmithBoardCanvas.height);

      drawRoundedRect(gunsmithBoardCtx, 8, 8, 1008, gunsmithBoardCanvas.height - 16, 22);
      gunsmithBoardCtx.fillStyle = 'rgba(32, 22, 16, 0.97)';
      gunsmithBoardCtx.fill();
      gunsmithBoardCtx.lineWidth = 8;
      gunsmithBoardCtx.strokeStyle = '#d9a04e';
      gunsmithBoardCtx.stroke();

      drawRoundedRect(gunsmithBoardCtx, 22, 22, 980, gunsmithBoardCanvas.height - 44, 14);
      gunsmithBoardCtx.lineWidth = 2;
      gunsmithBoardCtx.strokeStyle = 'rgba(245, 205, 130, 0.45)';
      gunsmithBoardCtx.stroke();

      gunsmithBoardCtx.textAlign = 'center';
      gunsmithBoardCtx.textBaseline = 'middle';
      gunsmithBoardCtx.font = 'bold 42px Georgia, serif';
      gunsmithBoardCtx.fillStyle = '#fff1cf';
      gunsmithBoardCtx.fillText(dict.gunsmithBoardTitle, 512, 54);

      const banner = resolveGunsmithMessage();
      if (gunsmithStatusTimer > 0 && banner) {
        drawRoundedRect(gunsmithBoardCtx, 52, 82, 920, 46, 12);
        gunsmithBoardCtx.fillStyle = gunsmithStatusSuccess
          ? 'rgba(34, 96, 44, 0.96)'
          : 'rgba(132, 34, 26, 0.96)';
        gunsmithBoardCtx.fill();
        gunsmithBoardCtx.lineWidth = 3;
        gunsmithBoardCtx.strokeStyle = gunsmithStatusSuccess ? '#9bf08a' : '#ff9a8a';
        gunsmithBoardCtx.stroke();

        gunsmithBoardCtx.font = 'bold 25px sans-serif';
        gunsmithBoardCtx.fillStyle = '#ffffff';
        gunsmithBoardCtx.fillText(banner, 512, 106);
      } else {
        gunsmithBoardCtx.font = 'bold 23px sans-serif';
        gunsmithBoardCtx.fillStyle = '#ffd67a';
        gunsmithBoardCtx.fillText(
          dict.gunsmithInfo(playerState.gold, playerState.pelt, playerState.dynamite, weaponMasteryRank),
          512,
          106
        );
      }

      gunsmithBoardTexture.needsUpdate = true;

      const masteryCost = 90 + weaponMasteryRank * 45;
      gunsmithButtonEntries.forEach((entry, idx) => {
        const { item, canvas, ctx, texture } = entry;
        const showMasterySlot = item.id === 'hellfire' && unlockedWeapons.hellfire;
        const isWeapon = !showMasterySlot && item.type === 'weapon';
        const isOwned = isWeapon && !!unlockedWeapons[item.weaponId];
        const isEquipped = isWeapon && activeWeaponId === item.weaponId;
        const canAfford = showMasterySlot
          ? playerState.gold >= masteryCost
          : (
              (item.pureGoldCost && playerState.gold >= item.pureGoldCost) ||
              ((!item.minLevel || storyState.currentLevel >= item.minLevel) && playerState.gold >= item.goldCost && playerState.pelt >= item.peltCost)
            );

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        drawRoundedRect(ctx, 6, 5, canvas.width - 12, canvas.height - 10, 15);
        if (isEquipped) {
          ctx.fillStyle = '#1f4e28';
          ctx.strokeStyle = '#92f08a';
        } else if (isOwned) {
          ctx.fillStyle = '#263f4a';
          ctx.strokeStyle = '#89d4ff';
        } else if (canAfford) {
          ctx.fillStyle = '#5c3416';
          ctx.strokeStyle = '#ffd275';
        } else {
          ctx.fillStyle = '#3d2213';
          ctx.strokeStyle = '#a87639';
        }
        ctx.fill();
        ctx.lineWidth = 4.5;
        ctx.stroke();

        const baseLabel = showMasterySlot && dict.gunsmithMasteryBtn
          ? dict.gunsmithMasteryBtn(weaponMasteryRank + 1, masteryCost)
          : (dict.gunsmithButtons[idx] || '');
        const tag = showMasterySlot
          ? ''
          : (isEquipped ? ` ${dict.equippedTag}` : (isOwned ? ` ${dict.ownedTag}` : ''));
        const fullLabel = `${baseLabel}${tag}`;

        let fontSize = 26;
        ctx.font = `bold ${fontSize}px sans-serif`;
        while (fontSize > 17 && ctx.measureText(fullLabel).width > 968) {
          fontSize -= 1;
          ctx.font = `bold ${fontSize}px sans-serif`;
        }

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff6e3';
        ctx.fillText(fullLabel, canvas.width / 2, canvas.height / 2 + 1);
        texture.needsUpdate = true;
      });
    }

    refreshGunsmithHook = updateGunsmithUI;

    // --- 5b3. Dustwood Homestead Ranch & Cowboy Talent Board (Passiv gull/skinn-inntekt, Deadeye, Mustang-fart & Jakthund "Rex") ---
    const HOMESTEAD_SLOTS = [
      { key: 'cattle', maxLv: 25, baseGold: 45, stepGold: 28, basePelts: 0, stepPelts: 0, enName: 'Cattle & Gold Shares', noName: 'Kveg & Gullandeler' },
      { key: 'trapper', maxLv: 20, baseGold: 55, stepGold: 32, basePelts: 0, stepPelts: 0, enName: "Trapper's Post", noName: 'Pelsjeger-stasjon' },
      { key: 'deadeye', maxLv: 25, baseGold: 60, stepGold: 35, basePelts: 0, stepPelts: 0, enName: 'Deadeye Talent', noName: 'Deadeye-talent' },
      { key: 'trailblazer', maxLv: 20, baseGold: 50, stepGold: 30, basePelts: 2, stepPelts: 1, enName: 'Ironhide & Mustang Speed', noName: 'Jernhud & Mustang-fart' },
      { key: 'warhound', maxLv: 15, baseGold: 65, stepGold: 45, basePelts: 2, stepPelts: 1, enName: 'Warhound "Rex"', noName: 'Jakthunden «Rex»' }
    ];

    let homesteadMainSignMesh = null;
    let homesteadCounterMesh = null;
    let homesteadWindmillWheel = null;
    const homesteadButtonMeshes = [];
    const homesteadBlockHitMeshes = [];
    let homesteadStatusKey = '';
    let homesteadStatusArg = null;
    let homesteadStatusSuccess = true;
    let homesteadStatusTimer = 0;

    const homesteadBoardCanvas = document.createElement('canvas');
    homesteadBoardCanvas.width = 1024;
    homesteadBoardCanvas.height = 576;
    const homesteadBoardCtx = homesteadBoardCanvas.getContext('2d');
    const homesteadBoardTexture = new THREE.CanvasTexture(homesteadBoardCanvas);
    homesteadBoardTexture.colorSpace = THREE.SRGBColorSpace;
    homesteadBoardTexture.anisotropy = maxAnisotropy;

    function getHomesteadSlotCost(slotDef) {
      const lv = homesteadRanks[slotDef.key] || 0;
      return {
        lv,
        goldCost: slotDef.baseGold + lv * slotDef.stepGold,
        peltCost: slotDef.basePelts > 0 ? slotDef.basePelts + Math.floor(lv * slotDef.stepPelts) : 0
      };
    }

    function createHomesteadButtonEntry(slotDef) {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 88;
      const ctx = canvas.getContext('2d');
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = maxAnisotropy;

      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(3.44, 0.228),
        new THREE.MeshBasicMaterial({ map: texture, transparent: true, fog: false, toneMapped: false })
      );
      mesh.userData.homesteadSlot = slotDef;
      return { slotDef, canvas, ctx, texture, mesh };
    }

    const homesteadButtonEntries = HOMESTEAD_SLOTS.map((s) => createHomesteadButtonEntry(s));

    function resolveHomesteadMessage() {
      const dict = L();
      if (!homesteadStatusKey) return '';
      if (homesteadStatusKey === 'maxed') return dict.homesteadMsgMaxed || 'Maximum rank reached!';
      if (homesteadStatusKey === 'no_res') return dict.homesteadMsgNoRes || 'Need more Gold or Pelts!';
      if (homesteadStatusKey === 'bought' && homesteadStatusArg && dict.homesteadMsgBought) {
        const sName = currentLang === 'no' ? homesteadStatusArg.noName : homesteadStatusArg.enName;
        return dict.homesteadMsgBought(sName, homesteadStatusArg.lv);
      }
      return homesteadStatusKey;
    }

    function updateHomesteadUI() {
      const dict = L();
      homesteadBoardCtx.clearRect(0, 0, homesteadBoardCanvas.width, homesteadBoardCanvas.height);

      drawRoundedRect(homesteadBoardCtx, 8, 8, 1008, homesteadBoardCanvas.height - 16, 22);
      homesteadBoardCtx.fillStyle = 'rgba(36, 22, 12, 0.97)';
      homesteadBoardCtx.fill();
      homesteadBoardCtx.lineWidth = 8;
      homesteadBoardCtx.strokeStyle = '#e0a84c';
      homesteadBoardCtx.stroke();

      drawRoundedRect(homesteadBoardCtx, 22, 22, 980, homesteadBoardCanvas.height - 44, 14);
      homesteadBoardCtx.lineWidth = 2;
      homesteadBoardCtx.strokeStyle = 'rgba(245, 205, 130, 0.45)';
      homesteadBoardCtx.stroke();

      homesteadBoardCtx.textAlign = 'center';
      homesteadBoardCtx.textBaseline = 'middle';
      homesteadBoardCtx.font = 'bold 40px Georgia, serif';
      homesteadBoardCtx.fillStyle = '#fff1cf';
      homesteadBoardCtx.fillText(dict.homesteadBoardTitle || 'HOMESTEAD RANCH & TALENTS', 512, 54);

      const banner = resolveHomesteadMessage();
      const incomePerMin = (homesteadRanks.cattle || 0) * 8 + (homesteadRanks.trapper || 0) * 4;
      if (homesteadStatusTimer > 0 && banner) {
        drawRoundedRect(homesteadBoardCtx, 52, 82, 920, 46, 12);
        homesteadBoardCtx.fillStyle = homesteadStatusSuccess
          ? 'rgba(32, 96, 42, 0.96)'
          : 'rgba(132, 34, 26, 0.96)';
        homesteadBoardCtx.fill();
        homesteadBoardCtx.lineWidth = 3;
        homesteadBoardCtx.strokeStyle = homesteadStatusSuccess ? '#9bf08a' : '#ff9a8a';
        homesteadBoardCtx.stroke();

        homesteadBoardCtx.font = 'bold 24px sans-serif';
        homesteadBoardCtx.fillStyle = '#ffffff';
        homesteadBoardCtx.fillText(banner, 512, 106);
      } else if (dict.homesteadInfo) {
        homesteadBoardCtx.font = 'bold 22.5px sans-serif';
        homesteadBoardCtx.fillStyle = '#ffd878';
        homesteadBoardCtx.fillText(
          dict.homesteadInfo(playerState.gold, playerState.pelt, incomePerMin, homesteadRanks.warhound || 0),
          512,
          106
        );
      }
      homesteadBoardTexture.needsUpdate = true;

      homesteadButtonEntries.forEach((entry) => {
        const { slotDef, canvas, ctx, texture } = entry;
        const { lv, goldCost, peltCost } = getHomesteadSlotCost(slotDef);
        const isMaxed = lv >= slotDef.maxLv;
        const canAfford = !isMaxed && playerState.gold >= goldCost && playerState.pelt >= peltCost;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawRoundedRect(ctx, 6, 5, canvas.width - 12, canvas.height - 10, 15);
        if (isMaxed) {
          ctx.fillStyle = '#1f4e28';
          ctx.strokeStyle = '#92f08a';
        } else if (canAfford) {
          ctx.fillStyle = '#5c3416';
          ctx.strokeStyle = '#ffd275';
        } else {
          ctx.fillStyle = '#3d2213';
          ctx.strokeStyle = '#a87639';
        }
        ctx.fill();
        ctx.lineWidth = 4.5;
        ctx.stroke();

        let label = slotDef.enName;
        if (dict.homesteadSlots && dict.homesteadSlots[slotDef.key]) {
          label = dict.homesteadSlots[slotDef.key](lv, slotDef.maxLv, goldCost, peltCost);
        }

        let fontSize = 24;
        ctx.font = `bold ${fontSize}px sans-serif`;
        while (fontSize > 16 && ctx.measureText(label).width > 968) {
          fontSize -= 1;
          ctx.font = `bold ${fontSize}px sans-serif`;
        }
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff6e3';
        ctx.fillText(label, canvas.width / 2, canvas.height / 2 + 1);
        texture.needsUpdate = true;
      });
    }

    refreshHomesteadHook = updateHomesteadUI;

    // --- 5c. FYSISK GJEMMESTED (SAFE HOUSE / HIDEOUT) VED SIDEN AV SALOONEN ---
    // Nøyaktig innvendig gulvareal inne i Safe House-hytta (tømmerveggene står rett utenfor sonen).
    const hidingZone = {
      minX: -7.66,
      maxX: -3.90,
      minZ: -8.66,
      maxZ: -4.74
    };

    let safeHouseDoorOpen = true;
    let safeHouseDoorAngle = 1.62;
    let safeHouseDoorPivot = null;
    const safeHouseDoorHitMeshes = [];
    const safeHouseCenterWorld = new THREE.Vector3(
      (hidingZone.minX + hidingZone.maxX) * 0.5,
      0,
      (hidingZone.minZ + hidingZone.maxZ) * 0.5
    );
    const safeHouseDoorwayWorld = new THREE.Vector3(
      hidingZone.maxX + 0.16,
      1.2,
      (hidingZone.minZ + hidingZone.maxZ) * 0.5
    );
    // Pre-allokert: hiding-sjekken skal ikke lage nye Vector3-objekter i løkken.
    const hidingCheckWorldPos = new THREE.Vector3();
    const safeHouseOutsidePoint = new THREE.Vector3(
      hidingZone.maxX + 2.6,
      0,
      (hidingZone.minZ + hidingZone.maxZ) * 0.5
    );

    function isPointInHidingZone(px, pz) {
      if (frontierExpansion && frontierExpansion.isPointSafeFromMonsters(px, pz)) {
        return true;
      }
      return (
        px >= hidingZone.minX &&
        px <= hidingZone.maxX &&
        pz >= hidingZone.minZ &&
        pz <= hidingZone.maxZ
      );
    }

    function isPlayerInHidingZone() {
      if (isPointInHidingZone(playerRig.position.x, playerRig.position.z)) {
        return true;
      }

      // I VR kan spilleren fysisk gå inn i hytta mens riggens origo står utenfor.
      camera.getWorldPosition(hidingCheckWorldPos);
      return isPointInHidingZone(hidingCheckWorldPos.x, hidingCheckWorldPos.z);
    }

    function updatePlayerHiddenStatus() {
      const hiddenNow = isPlayerInHidingZone();
      if (hiddenNow !== playerHiddenStatus) {
        playerHiddenStatus = hiddenNow;
        updateStatusUI();
      }
    }

    const C = initCreatureModels(M, tailorBlockHitMeshes, loadedAssets);
    const {
      createDeerModel,
      createWolfModel,
      createBearModel,
      createBanditModel,
      createBanditCaptainModel,
      createNightEnemyModel,
      createBossVampireModel,
      animateQuadrupedLegs
    } = C;

    const townBuilt = buildTownBuildings({
      L, M, W, C,
      loadedAssets,
      saloonQuestTexture, saloonQuestButtonEntries, saloonQuestButtonMeshes, saloonQuestBlockMeshes,
      worldLangButtonMeshes,
      workshopBoardTexture, tailorButtonEntries, tailorButtonMeshes, tailorBlockHitMeshes,
      gunsmithBoardTexture, gunsmithButtonEntries, gunsmithButtonMeshes, gunsmithBlockHitMeshes,
      homesteadBoardTexture, homesteadButtonEntries, homesteadButtonMeshes, homesteadBlockHitMeshes,
      sheriffHitMeshes,
      hidingZone, safeHouseCenterWorld, safeHouseDoorAngle, safeHouseDoorHitMeshes
    });

    const { sheriffVanceGroup, createLorePoster, lorePosters } = townBuilt;

    // Mål faktiske lokale og globale dimensjoner med THREE.Box3 før/etter plassering
    const buildingMeasureBox = new THREE.Box3();

    const saloonBuilding = townBuilt.saloonBuilding;
    saloonMainSignMesh = townBuilt.saloonMainSignMesh;
    saloonLangSignMesh = townBuilt.saloonLangSignMesh;
    saloonQuestAnchorMesh = townBuilt.saloonQuestAnchorMesh;
    saloonBuilding.position.set(0, 0, 0);
    saloonBuilding.rotation.y = 0;
    scene.add(saloonBuilding);
    saloonBuilding.updateMatrixWorld(true);
    buildingMeasureBox.setFromObject(saloonBuilding);
    const saloonLocalBounds = {
      minX: buildingMeasureBox.min.x,
      maxX: buildingMeasureBox.max.x,
      minZ: buildingMeasureBox.min.z,
      maxZ: buildingMeasureBox.max.z
    };
    saloonBuilding.position.set(-6.8, 0, 1.0);
    saloonBuilding.rotation.y = 0.45;
    saloonBuilding.updateMatrixWorld(true);
    updateSaloonQuestBoardUI();

    const tailorBuilding = townBuilt.tailorBuilding;
    tailorMainSignMesh = townBuilt.tailorMainSignMesh;
    tailorCounterMesh = townBuilt.tailorCounterMesh;
    tailorNPCGroup = townBuilt.tailorNPCGroup;
    tailorBuilding.position.set(0, 0, 0);
    tailorBuilding.rotation.y = 0;
    scene.add(tailorBuilding);
    tailorBuilding.updateMatrixWorld(true);
    buildingMeasureBox.setFromObject(tailorBuilding);
    const tailorLocalBounds = {
      minX: buildingMeasureBox.min.x,
      maxX: buildingMeasureBox.max.x,
      minZ: buildingMeasureBox.min.z,
      maxZ: buildingMeasureBox.max.z
    };
    tailorBuilding.position.set(6.8, 0, 1.0);
    tailorBuilding.rotation.y = -0.45;
    tailorBuilding.updateMatrixWorld(true);
    updateTailorWorkshopUI();

    const gunsmithBuilding = townBuilt.gunsmithBuilding;
    gunsmithMainSignMesh = townBuilt.gunsmithMainSignMesh;
    gunsmithCounterMesh = townBuilt.gunsmithCounterMesh;
    gunsmithNPCGroup = townBuilt.gunsmithNPCGroup;
    gunsmithBuilding.position.set(0, 0, 0);
    gunsmithBuilding.rotation.y = 0;
    scene.add(gunsmithBuilding);
    gunsmithBuilding.updateMatrixWorld(true);
    buildingMeasureBox.setFromObject(gunsmithBuilding);
    const gunsmithLocalBounds = {
      minX: buildingMeasureBox.min.x,
      maxX: buildingMeasureBox.max.x,
      minZ: buildingMeasureBox.min.z,
      maxZ: buildingMeasureBox.max.z
    };
    gunsmithBuilding.position.set(7.2, 0, -10.8);
    gunsmithBuilding.rotation.y = -0.42;
    gunsmithBuilding.updateMatrixWorld(true);
    updateGunsmithUI();

    const safeHouseBuilding = townBuilt.safeHouseBuilding;
    safeHouseDoorPivot = townBuilt.safeHouseDoorPivot;
    safeHouseMainSignMesh = townBuilt.safeHouseMainSignMesh;
    safeHouseStreetSignMesh = townBuilt.safeHouseStreetSignMesh;
    scene.add(safeHouseBuilding);
    safeHouseBuilding.updateMatrixWorld(true);
    buildingMeasureBox.setFromObject(safeHouseBuilding);
    const safeHouseWorldBounds = {
      minX: buildingMeasureBox.min.x,
      maxX: buildingMeasureBox.max.x,
      minZ: buildingMeasureBox.min.z,
      maxZ: buildingMeasureBox.max.z
    };

    const homesteadBuilding = townBuilt.homesteadBuilding;
    homesteadMainSignMesh = townBuilt.homesteadMainSignMesh;
    homesteadCounterMesh = townBuilt.homesteadCounterMesh;
    homesteadWindmillWheel = townBuilt.homesteadWindmillWheel;
    if (homesteadBuilding) {
      homesteadBuilding.position.set(11.8, 0, 12.4);
      homesteadBuilding.rotation.y = -0.68;
      scene.add(homesteadBuilding);
      homesteadBuilding.updateMatrixWorld(true);
      updateHomesteadUI();
    }

    // Plasser Sheriff Vance utenfor Safe House / Saloonen
    if (sheriffVanceGroup) {
      sheriffVanceGroup.position.set(-2.75, 0, -3.65);
      sheriffVanceGroup.rotation.y = 0.28;
      scene.add(sheriffVanceGroup);
    }

    // Plasser Lore-plakat #3 ved Gullgruven i øst og Lore-plakat #4 ved Boot Hill-porten i vest
    if (createLorePoster) {
      const minePoster = createLorePoster(2);
      minePoster.position.set(-0.42, 1.78, 2.24);
      minePoster.rotation.y = -Math.PI / 2;
      if (mineGroup) mineGroup.add(minePoster);

      const graveyardPoster = createLorePoster(3);
      graveyardPoster.position.set(-61.4, getTerrainHeight(-61.4, 2.55) + 1.56, 2.55);
      graveyardPoster.rotation.y = Math.PI / 2;
      scene.add(graveyardPoster);
    }

    refreshSheriffHook = () => {
      if (sheriffVanceGroup && sheriffVanceGroup.userData.updateSheriffDialogue) {
        const quoteIdx = storyState.currentLevel > 50
          ? 50
          : Math.max(0, Math.min(50, storyState.currentLevel - 1));
        sheriffVanceGroup.userData.updateSheriffDialogue(quoteIdx);
      }
    };
    refreshSheriffHook();

    // =========================================================================
    // 5d. NØYAKTIGE VEGGKOLLISJONER (AABB / OBB) OG AKTØRKOLLISJON I HVER FRAME
    // =========================================================================
    const wallColliders = [];
    const PLAYER_RADIUS = 0.45;
    const DEER_RADIUS = 0.45;
    const WOLF_RADIUS = 0.38;
    const BEAR_RADIUS = 0.68;
    const BANDIT_RADIUS = 0.38;
    const NIGHT_RADIUS = 0.42;
    const BOSS_RADIUS = 0.64;

    function addLocalWallCollider(group, minX, maxX, minZ, maxZ, isSafeHouseDoor = false, maxY = 4.8) {
      wallColliders.push({
        group,
        ox: group.position.x,
        oz: group.position.z,
        cos: Math.cos(group.rotation.y),
        sin: Math.sin(group.rotation.y),
        minX,
        maxX,
        minZ,
        maxZ,
        maxY,
        isSafeHouseDoor
      });
    }

    function addWorldWallCollider(minX, maxX, minZ, maxZ, maxY = 3.8, minY = -20, source = null) {
      wallColliders.push({
        group: null,
        ox: 0,
        oz: 0,
        cos: 1,
        sin: 0,
        minX,
        maxX,
        minZ,
        maxZ,
        minY,
        maxY,
        isSafeHouseDoor: false,
        source
      });
    }

    // 1) Saloon (målt fra saloon.glb): venstre vegg + venstre veranda, høyre vegg + oppdragstavle,
    //    bakvegg, bardisk inne i lokalet, og frontvegger på hver side av 1,96 m fri døråpning (-0.98..+0.98).
    const sLeftOuter = Math.min(-3.24, saloonLocalBounds.minX + 0.14);
    const sRightOuter = Math.max(3.24, saloonLocalBounds.maxX - 0.14);
    const sBackOuter = Math.min(-2.44, saloonLocalBounds.minZ + 0.10);
    addLocalWallCollider(saloonBuilding, sLeftOuter, -2.90, sBackOuter, 2.02);
    addLocalWallCollider(saloonBuilding, sLeftOuter, -1.06, 2.00, 3.50, false, 1.35);
    addLocalWallCollider(saloonBuilding, 2.90, sRightOuter, sBackOuter, 3.50);
    addLocalWallCollider(saloonBuilding, 0.98, sRightOuter, 3.28, 3.60, false, 2.95);
    addLocalWallCollider(saloonBuilding, sLeftOuter, sRightOuter, sBackOuter, -2.10);
    addLocalWallCollider(saloonBuilding, -2.22, 2.22, -1.86, -1.04, false, 1.32);
    addLocalWallCollider(saloonBuilding, sLeftOuter, -0.98, 1.72, 2.02);
    addLocalWallCollider(saloonBuilding, 0.98, sRightOuter, 1.72, 2.02);

    // 2) Skredderbutikk (målt fra tailor.glb): venstre vegg, høyre vegg + vognhjul, bakvegg,
    //    frontstolper/tønne på hver side av 3,84 m fri inngang (-1.92..+1.92), samt skredderdisken inne.
    const tLeftOuter = Math.min(-2.86, tailorLocalBounds.minX + 0.16);
    const tRightOuter = Math.min(3.22, Math.max(2.92, tailorLocalBounds.maxX - 0.08));
    const tBackOuter = Math.min(-2.14, tailorLocalBounds.minZ + 0.12);
    addLocalWallCollider(tailorBuilding, tLeftOuter, -2.42, tBackOuter, 3.00);
    addLocalWallCollider(tailorBuilding, 2.42, tRightOuter, tBackOuter, 3.00);
    addLocalWallCollider(tailorBuilding, tLeftOuter, tRightOuter, tBackOuter, -1.74);
    addLocalWallCollider(tailorBuilding, tLeftOuter, -1.92, 2.68, 3.02);
    addLocalWallCollider(tailorBuilding, 1.92, tRightOuter, 2.22, 3.02, false, 1.35);
    addLocalWallCollider(tailorBuilding, -2.44, 2.44, 0.78, 1.72, false, 1.32);

    // 2b) Våpensmed-bygning (målt fra gunsmith.glb): venstre vegg, høyre vegg + essepipe, bakvegg,
    //     frontstolper + ambolt på hver side av >= 3,84 m åpen butikkfront (-1.92..+1.92), samt våpendisken.
    const gLeftOuter = Math.min(-2.86, gunsmithLocalBounds.minX + 0.16);
    const gRightOuter = Math.min(3.48, Math.max(2.96, gunsmithLocalBounds.maxX - 0.08));
    const gBackOuter = Math.min(-2.14, gunsmithLocalBounds.minZ + 0.12);
    addLocalWallCollider(gunsmithBuilding, gLeftOuter, -2.42, gBackOuter, 3.00);
    addLocalWallCollider(gunsmithBuilding, 2.42, gRightOuter, gBackOuter, 3.00);
    addLocalWallCollider(gunsmithBuilding, gLeftOuter, gRightOuter, gBackOuter, -1.74);
    addLocalWallCollider(gunsmithBuilding, gLeftOuter, -1.92, 2.68, 3.02);
    addLocalWallCollider(gunsmithBuilding, 1.92, gRightOuter, 1.96, 3.02, false, 1.38);
    addLocalWallCollider(gunsmithBuilding, -2.44, 2.44, 0.78, 1.72, false, 1.32);

    // 3) Safe House (målt fra safeHouseBuilding): bakvegg, nordvegg, sørvegg og to frontvegg-segmenter
    //    rundt en fri døråpning på 1,92 m (-0.96..+0.96), pluss dynamisk dørboks når døren er lukket.
    const shHalfW = (hidingZone.maxX - hidingZone.minX + 0.32) * 0.5;
    const shHalfD = (hidingZone.maxZ - hidingZone.minZ + 0.32) * 0.5;
    const shBackOuter = Math.min(-(shHalfW + 0.22), safeHouseWorldBounds.minX - safeHouseCenterWorld.x + 0.28);
    addLocalWallCollider(safeHouseBuilding, shBackOuter, -(shHalfW - 0.16), -(shHalfD + 0.22), shHalfD + 0.22, false, 3.1);
    addLocalWallCollider(safeHouseBuilding, shBackOuter, shHalfW + 0.22, -(shHalfD + 0.22), -(shHalfD - 0.16), false, 3.1);
    addLocalWallCollider(safeHouseBuilding, shBackOuter, shHalfW + 0.22, shHalfD - 0.16, shHalfD + 0.22, false, 3.1);
    addLocalWallCollider(safeHouseBuilding, shHalfW - 0.16, shHalfW + 0.22, -(shHalfD + 0.22), -0.96, false, 3.1);
    addLocalWallCollider(safeHouseBuilding, shHalfW - 0.16, shHalfW + 0.22, 0.96, shHalfD + 0.22, false, 3.1);
    // Egen kollisjonsboks for selve Safe House-døren (kun aktiv for spilleren når døren er lukket)
    addLocalWallCollider(safeHouseBuilding, shHalfW - 0.16, shHalfW + 0.18, -0.98, 0.98, true, 2.42);
    // Smal køye og forsyningskasse helt inntil bakveggen inne i Safe House
    addLocalWallCollider(safeHouseBuilding, -(shHalfW - 0.12), -(shHalfW - 0.92), -1.76, 0.10, false, 0.9);
    addLocalWallCollider(safeHouseBuilding, -(shHalfW - 0.12), -(shHalfW - 0.82), 0.94, 1.62, false, 0.95);

    // 3b) Homestead Ranch & Vindmølle: bakvegg + vindmøllefot (åpen veranda foran mot byen)
    if (homesteadBuilding) {
      addLocalWallCollider(homesteadBuilding, -2.75, 2.75, -2.10, -1.55, false, 3.6);
      addLocalWallCollider(homesteadBuilding, 3.15, 4.55, -1.50, -0.10, false, 4.2);
    }

    // 4) Store sandsteinsklipper, Gullgruve-inngang, Boot Hill-kapell og rekkverk (målt med THREE.Box3 i world.js)
    for (let i = 0; i < rockColliders.length; i++) {
      const rock = rockColliders[i];
      addWorldWallCollider(rock.minX, rock.maxX, rock.minZ, rock.maxZ, rock.maxY || 4.2);
    }
    if (structureWallColliders) {
      for (let i = 0; i < structureWallColliders.length; i++) {
        const sc = structureWallColliders[i];
        addWorldWallCollider(
          sc.minX,
          sc.maxX,
          sc.minZ,
          sc.maxZ,
          sc.maxY !== undefined ? sc.maxY : 4.4,
          sc.minY !== undefined ? sc.minY : -20,
          sc
        );
      }
    }

    // Glatt vegg-glidning med ekte Sirkel-mot-OBB nærmeste-punkt-projeksjon (0 objektallokeringer per frame)
    function resolveWallCollisions(position, radius, blockOpenSafeDoor = false) {
      const rSq = radius * radius;
      for (let pass = 0; pass < 3; pass++) {
        let moved = false;

        for (let i = 0; i < wallColliders.length; i++) {
          const collider = wallColliders[i];
          if (collider.disabled || (collider.source && collider.source.disabled)) continue;
          if (collider.isSafeHouseDoor && safeHouseDoorOpen && !blockOpenSafeDoor) continue;
          if (collider.minY !== undefined && (position.y + 1.65) <= collider.minY) continue;
          if (collider.maxY !== undefined && position.y >= collider.maxY) continue;

          let localX;
          let localZ;
          if (collider.group) {
            const dx = position.x - collider.ox;
            const dz = position.z - collider.oz;
            localX = dx * collider.cos - dz * collider.sin;
            localZ = dx * collider.sin + dz * collider.cos;
          } else {
            localX = position.x;
            localZ = position.z;
          }

          const closestX = localX < collider.minX ? collider.minX : (localX > collider.maxX ? collider.maxX : localX);
          const closestZ = localZ < collider.minZ ? collider.minZ : (localZ > collider.maxZ ? collider.maxZ : localZ);

          const diffX = localX - closestX;
          const diffZ = localZ - closestZ;
          const distSq = diffX * diffX + diffZ * diffZ;

          if (distSq >= rSq) continue;

          let pushX = 0;
          let pushZ = 0;

          if (distSq > 1e-8) {
            const dist = Math.sqrt(distSq);
            const pen = radius - dist;
            pushX = (diffX / dist) * pen;
            pushZ = (diffZ / dist) * pen;
          } else {
            const dLeft = localX - collider.minX;
            const dRight = collider.maxX - localX;
            const dBack = localZ - collider.minZ;
            const dFront = collider.maxZ - localZ;
            const minFace = Math.min(dLeft, dRight, dBack, dFront);
            if (minFace === dLeft) pushX = -(dLeft + radius);
            else if (minFace === dRight) pushX = dRight + radius;
            else if (minFace === dBack) pushZ = -(dBack + radius);
            else pushZ = dFront + radius;
          }

          if (collider.group) {
            position.x += pushX * collider.cos + pushZ * collider.sin;
            position.z += -pushX * collider.sin + pushZ * collider.cos;
          } else {
            position.x += pushX;
            position.z += pushZ;
          }
          moved = true;
        }

        if (!moved) break;
      }
    }

    const resolveCircleAgainstWalls = resolveWallCollisions;

    function pointHitsSolidWall(wx, wy, wz) {
      for (let i = 0; i < wallColliders.length; i++) {
        const collider = wallColliders[i];
        if (collider.disabled || (collider.source && collider.source.disabled)) continue;
        if (collider.minY !== undefined && wy < collider.minY) continue;
        if (wy > collider.maxY) continue;
        if (collider.isSafeHouseDoor && safeHouseDoorOpen) continue;

        let localX;
        let localZ;
        if (collider.group) {
          const dx = wx - collider.ox;
          const dz = wz - collider.oz;
          localX = dx * collider.cos - dz * collider.sin;
          localZ = dx * collider.sin + dz * collider.cos;
        } else {
          localX = wx;
          localZ = wz;
        }

        if (
          localX >= collider.minX &&
          localX <= collider.maxX &&
          localZ >= collider.minZ &&
          localZ <= collider.maxZ
        ) {
          return true;
        }
      }
      return false;
    }

    // Vampyrer, rovdyr og monstre skal ALDRI kunne gå inn i Fristeder eller innenfor et tent Leirbål!
    function pushOutOfHidingZone(group, radius) {
      if (frontierExpansion) {
        frontierExpansion.repelGroupFromSafeZonesAndCampfires(group, radius);
      }
      const pad = radius + 0.34;
      const boxMinX = hidingZone.minX - 0.36;
      const boxMaxX = hidingZone.maxX + 0.36;
      const boxMinZ = hidingZone.minZ - 0.36;
      const boxMaxZ = hidingZone.maxZ + 0.36;

      const x = group.position.x;
      const z = group.position.z;
      const closestX = x < boxMinX ? boxMinX : (x > boxMaxX ? boxMaxX : x);
      const closestZ = z < boxMinZ ? boxMinZ : (z > boxMaxZ ? boxMaxZ : z);
      const diffX = x - closestX;
      const diffZ = z - closestZ;
      const distSq = diffX * diffX + diffZ * diffZ;
      if (distSq >= pad * pad) return;

      if (distSq > 1e-8) {
        const dist = Math.sqrt(distSq);
        const pen = pad - dist;
        group.position.x += (diffX / dist) * pen;
        group.position.z += (diffZ / dist) * pen;
      } else {
        const dLeft = x - boxMinX;
        const dRight = boxMaxX - x;
        const dBack = z - boxMinZ;
        const dFront = boxMaxZ - z;
        const minDelta = Math.min(dLeft, dRight, dBack, dFront);
        if (minDelta === dLeft) group.position.x = boxMinX - pad;
        else if (minDelta === dRight) group.position.x = boxMaxX + pad;
        else if (minDelta === dBack) group.position.z = boxMinZ - pad;
        else group.position.z = boxMaxZ + pad;
      }
    }

    let refreshBossBarHook = null;

    refreshWorldSignsHook = () => {
      const dict = L();
      if (saloonMainSignMesh) saloonMainSignMesh.userData.updateSign(dict.signSaloonTitle, dict.signSaloonSub);
      if (tailorMainSignMesh) tailorMainSignMesh.userData.updateSign(dict.signTailorTitle, dict.signTailorSub);
      if (gunsmithMainSignMesh) gunsmithMainSignMesh.userData.updateSign(dict.signGunsmithTitle, dict.signGunsmithSub);
      if (homesteadMainSignMesh) homesteadMainSignMesh.userData.updateSign(dict.signHomesteadTitle, dict.signHomesteadSub);
      if (safeHouseMainSignMesh) safeHouseMainSignMesh.userData.updateSign(dict.signSafeHouseTitle, dict.signSafeHouseSub);
      if (safeHouseStreetSignMesh) {
        safeHouseStreetSignMesh.userData.updateSign(dict.signSafeHouseTitle, dict.signSafeHouseSub);
        if (safeHouseStreetSignMesh.userData.mirrorSign) {
          safeHouseStreetSignMesh.userData.mirrorSign.userData.updateSign(dict.signSafeHouseTitle, dict.signSafeHouseSub);
        }
      }
      if (saloonLangSignMesh) saloonLangSignMesh.userData.updateSign(dict.saloonLangSign, dict.saloonLangSub);
      if (refreshRegionSigns) refreshRegionSigns();
      if (lorePosters) {
        for (let i = 0; i < lorePosters.length; i++) {
          if (lorePosters[i].userData.refreshPoster) lorePosters[i].userData.refreshPoster();
        }
      }
      if (refreshBossBarHook) refreshBossBarHook();
    };


    const UP = new THREE.Vector3(0, 1, 0);
    const FORWARD = new THREE.Vector3(0, 0, -1);

    const vrHands = { left: null, right: null };
    let vrActiveWeapon = null;

    function getHandGamepad(handedness) {
      const session = renderer.xr.getSession();
      if (!session || !session.inputSources) return null;
      for (const source of session.inputSources) {
        if (source.handedness === handedness && source.gamepad) return source.gamepad;
      }
      return null;
    }

    const FX = initRevolverAndAtmosphereFX({
      scene, camera, M, saloonBuilding, tailorBuilding, gunsmithBuilding, safeHouseBuilding, loadedAssets
    });
    const {
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
    } = FX;

    if (registerWorldVirtualLight) {
      if (saloonLantern && saloonLantern.light) registerWorldVirtualLight(saloonLantern.light);
      if (tailorLantern && tailorLantern.light) registerWorldVirtualLight(tailorLantern.light);
      if (gunsmithLantern && gunsmithLantern.light) registerWorldVirtualLight(gunsmithLantern.light);
      if (safeHouseLantern && safeHouseLantern.light) registerWorldVirtualLight(safeHouseLantern.light);
    }

    // --- 7a. 6 Spillbare Våpen på PC og i VR (Revolver, Shotgun, Winchester, Silver Crossbow, Dynamite, Hellfire Repeater) ---
    const PC_WEAPON_TRANSFORMS = {
      revolver: { scale: 0.82, pos: [0.33, -0.245, -0.78], rot: [0.018, 0.07, 0.02] },
      shotgun:  { scale: 0.80, pos: [0.31, -0.235, -0.70], rot: [0.022, 0.08, 0.015] },
      rifle:    { scale: 0.78, pos: [0.29, -0.230, -0.66], rot: [0.015, 0.075, 0.01] },
      crossbow: { scale: 0.78, pos: [0.30, -0.235, -0.72], rot: [0.030, 0.07, 0.015] },
      dynamite: { scale: 0.88, pos: [0.31, -0.220, -0.64], rot: [0.040, 0.12, -0.04] },
      hellfire: { scale: 0.80, pos: [0.30, -0.235, -0.68], rot: [0.016, 0.075, 0.012] }
    };

    const VR_RAY_STYLES = {
      revolver: { color: 0xffe2a0, len: 9.0 },
      shotgun:  { color: 0xff9d5c, len: 5.5 },
      rifle:    { color: 0xfff4cc, len: 16.0 },
      crossbow: { color: 0x8fd8ff, len: 13.5 },
      dynamite: { color: 0xff6242, len: 7.5 },
      hellfire: { color: 0x74d4ff, len: 18.0 }
    };

    const pcWeapons = Object.create(null);
    WEAPON_ORDER.forEach((wId) => {
      const wModel = createWeaponModel(wId);
      const tf = PC_WEAPON_TRANSFORMS[wId];
      wModel.scale.setScalar(tf.scale);
      wModel.position.set(tf.pos[0], tf.pos[1], tf.pos[2]);
      wModel.rotation.set(tf.rot[0], tf.rot[1], tf.rot[2]);
      wModel.visible = wId === activeWeaponId;
      camera.add(wModel);
      pcWeapons[wId] = wModel;
    });
    if (hasGoldenRevolver) {
      upgradeRevolverToGold();
    }

    function updateControllerRayStyle(controller, wId) {
      if (!controller) return;
      const style = VR_RAY_STYLES[wId] || VR_RAY_STYLES.revolver;
      controller.traverse((child) => {
        if (child.isLine && child.material) {
          child.material.color.setHex(style.color);
          const posAttr = child.geometry && child.geometry.attributes && child.geometry.attributes.position;
          if (posAttr && posAttr.count >= 2) {
            posAttr.setZ(1, -style.len);
            posAttr.needsUpdate = true;
          }
        }
      });
    }

    function attachWeaponsToVRHand(controller) {
      if (!controller.userData.weapons) {
        const map = Object.create(null);
        WEAPON_ORDER.forEach((wId) => {
          const wm = createWeaponModel(wId);
          wm.scale.setScalar(0.94);
          wm.position.set(0, -0.02, -0.03);
          wm.visible = wId === activeWeaponId;
          controller.add(wm);
          map[wId] = wm;
        });
        controller.userData.weapons = map;
      } else {
        WEAPON_ORDER.forEach((wId) => {
          if (controller.userData.weapons[wId]) {
            controller.userData.weapons[wId].visible = wId === activeWeaponId;
          }
        });
      }
      vrActiveWeapon = controller.userData.weapons[activeWeaponId];
      updateControllerRayStyle(controller, activeWeaponId);

      const marker = controller.getObjectByName('handMarker');
      if (marker) marker.visible = false;
      const handle = controller.getObjectByName('handleMesh');
      if (handle) handle.visible = false;
    }

    let playWeaponSwitchSfxFn = null;

    function equipWeapon(wId, silent = false) {
      if (!unlockedWeapons[wId]) return false;
      if (wId === 'dynamite' && playerState.dynamite <= 0) return false;
      activeWeaponId = wId;

      const inVR = renderer.xr.isPresenting;
      const inThird = !!(shopAndCameraSystem && shopAndCameraSystem.isThirdPersonActive());
      WEAPON_ORDER.forEach((id) => {
        if (pcWeapons[id]) {
          pcWeapons[id].visible = !inVR && !inThird && id === activeWeaponId;
        }
        if (vrHands.right && vrHands.right.userData.weapons && vrHands.right.userData.weapons[id]) {
          vrHands.right.userData.weapons[id].visible = id === activeWeaponId;
        }
      });
      if (vrHands.right && vrHands.right.userData.weapons) {
        vrActiveWeapon = vrHands.right.userData.weapons[activeWeaponId];
        updateControllerRayStyle(vrHands.right, activeWeaponId);
      }
      if (shopAndCameraSystem) shopAndCameraSystem.syncAvatarAppearance();

      updateStatusUI();
      if (!silent && playWeaponSwitchSfxFn) playWeaponSwitchSfxFn();
      return true;
    }
    equipWeaponHook = equipWeapon;

    function cycleUnlockedWeapon(step = 1) {
      const startIdx = Math.max(0, WEAPON_ORDER.indexOf(activeWeaponId));
      for (let k = 1; k <= WEAPON_ORDER.length; k++) {
        const idx = (startIdx + k * step + WEAPON_ORDER.length * 4) % WEAPON_ORDER.length;
        const candidate = WEAPON_ORDER[idx];
        if (!unlockedWeapons[candidate]) continue;
        if (candidate === 'dynamite' && playerState.dynamite <= 0) continue;
        if (candidate !== activeWeaponId) {
          equipWeapon(candidate);
          return;
        }
      }
    }

    controllers.forEach((controller) => {
      controller.addEventListener('connected', (e) => {
        const data = e.data || {};
        controller.userData.gamepad = data.gamepad || null;

        if (data.handedness === 'left') vrHands.left = controller;
        if (data.handedness === 'right') {
          vrHands.right = controller;
          attachWeaponsToVRHand(controller);
        }
      });

      controller.addEventListener('disconnected', (e) => {
        const data = e.data || {};
        if (data.handedness === 'right' && vrHands.right === controller) {
          vrHands.right = null;
          vrActiveWeapon = null;
        }
        if (data.handedness === 'left' && vrHands.left === controller) {
          vrHands.left = null;
        }
      });

      // Høyre avtrekker = velg 3D-knapp (håndledd/skredder/våpensmed) eller skyt/kast
      controller.addEventListener('selectstart', (e) => {
        if (!renderer.xr.isPresenting) return;
        const data = e.data || {};
        if (data.handedness === 'right' || (!data.handedness && controller === vrHands.right)) {
          if (tryVRRightTriggerUI(controller)) return;
          shoot();
        }
      });
    });

    renderer.xr.addEventListener('sessionstart', () => {
      WEAPON_ORDER.forEach((id) => {
        if (pcWeapons[id]) pcWeapons[id].visible = false;
      });
      const crosshair = document.getElementById('crosshair');
      if (crosshair) crosshair.style.display = 'none';
    });

    renderer.xr.addEventListener('sessionend', () => {
      const inThird = !!(shopAndCameraSystem && shopAndCameraSystem.isThirdPersonActive());
      WEAPON_ORDER.forEach((id) => {
        if (pcWeapons[id]) pcWeapons[id].visible = !inThird && id === activeWeaponId;
      });
      const crosshair = document.getElementById('crosshair');
      if (crosshair) crosshair.style.display = 'block';
    });

    // --- 7b. Skyting, Hagle-spredning, Winchester, Sølv-armbrøst, Dynamitt og Grafikk 3.0 FX ---
    const shotQuat = new THREE.Quaternion();
    const shotPos = new THREE.Vector3();
    const shotDir = new THREE.Vector3();
    const pelletDir = new THREE.Vector3();
    const spreadRight = new THREE.Vector3();
    const spreadUp = new THREE.Vector3();
    const aimCamPos = new THREE.Vector3();
    const aimCamDir = new THREE.Vector3();
    const aimPoint = new THREE.Vector3();
    let shotCooldownTimer = 0;

    // Grafikk 3.0 partikkeleffekter: kruttrøyk, gule gnister, sandstøv og glødende vampyr-aske
    const fxParticles = [];
    const smokeSpriteBaseMat = new THREE.SpriteMaterial({
      map: M.sharedSmokePuffTex || M.sharedParticleGlowTex,
      color: 0xd8d2c8,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      fog: false
    });

    function spawnGunsmoke(origin, count = 2, scaleMul = 1.0) {
      for (let i = 0; i < count; i++) {
        const mat = smokeSpriteBaseMat.clone();
        mat.opacity = 0.42;
        const sprite = new THREE.Sprite(mat);
        sprite.position.set(
          origin.x + (Math.random() - 0.5) * 0.06,
          origin.y + (Math.random() - 0.5) * 0.06,
          origin.z + (Math.random() - 0.5) * 0.06
        );
        const startS = 0.08 * scaleMul;
        sprite.scale.set(startS, startS, 1);
        scene.add(sprite);
        fxParticles.push({
          mesh: sprite,
          mat,
          vx: (Math.random() - 0.5) * 0.45,
          vy: 0.42 + Math.random() * 0.45,
          vz: (Math.random() - 0.5) * 0.45,
          startScale: startS,
          endScale: (0.34 + Math.random() * 0.18) * scaleMul,
          baseOpacity: 0.42,
          life: 0.52,
          maxLife: 0.52,
          gravity: 0
        });
      }
    }

    function spawnSparkBurst(origin, count = 6, colorHex = 0xffdf6b, speedScale = 1.0) {
      for (let i = 0; i < count; i++) {
        const mat = new THREE.SpriteMaterial({
          map: M.sharedSparkGlowTex || M.sharedParticleGlowTex,
          color: colorHex,
          transparent: true,
          opacity: 0.95,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          fog: false,
          toneMapped: false
        });
        const sprite = new THREE.Sprite(mat);
        sprite.position.copy(origin);
        const s = 0.08 + Math.random() * 0.07;
        sprite.scale.set(s, s, 1);
        scene.add(sprite);
        fxParticles.push({
          mesh: sprite,
          mat,
          vx: (Math.random() - 0.5) * 4.4 * speedScale,
          vy: (1.2 + Math.random() * 2.8) * speedScale,
          vz: (Math.random() - 0.5) * 4.4 * speedScale,
          startScale: s,
          endScale: s * 0.25,
          baseOpacity: 0.95,
          life: 0.34 + Math.random() * 0.18,
          maxLife: 0.45,
          gravity: 9.2
        });
      }
    }

    function spawnSandDust(origin) {
      spawnSparkBurst(origin, 3, 0xd8aa72, 0.48);
      spawnGunsmoke(origin, 1, 0.85);
    }

    function spawnVampireAshDissolution(origin, scaleMul = 1.0) {
      const count = Math.round(14 * scaleMul);
      for (let i = 0; i < count; i++) {
        const isEmber = i % 2 === 0;
        const mat = new THREE.SpriteMaterial({
          map: isEmber ? (M.sharedSparkGlowTex || M.sharedParticleGlowTex) : (M.sharedSmokePuffTex || M.sharedParticleGlowTex),
          color: isEmber ? 0xff4e1f : 0x3b2426,
          transparent: true,
          opacity: isEmber ? 0.95 : 0.62,
          blending: isEmber ? THREE.AdditiveBlending : THREE.NormalBlending,
          depthWrite: false,
          fog: false,
          toneMapped: false
        });
        const sprite = new THREE.Sprite(mat);
        sprite.position.set(
          origin.x + (Math.random() - 0.5) * 0.7 * scaleMul,
          origin.y + Math.random() * 1.6 * scaleMul,
          origin.z + (Math.random() - 0.5) * 0.7 * scaleMul
        );
        const s = (isEmber ? 0.14 : 0.24) * scaleMul;
        sprite.scale.set(s, s, 1);
        scene.add(sprite);
        fxParticles.push({
          mesh: sprite,
          mat,
          vx: (Math.random() - 0.5) * 1.1,
          vy: 1.1 + Math.random() * 1.6,
          vz: (Math.random() - 0.5) * 1.1,
          startScale: s,
          endScale: s * (isEmber ? 0.2 : 1.7),
          baseOpacity: isEmber ? 0.95 : 0.58,
          life: 0.85 + Math.random() * 0.45,
          maxLife: 1.15,
          gravity: -0.4
        });
      }
    }

    function updateFXParticles(dt) {
      for (let i = fxParticles.length - 1; i >= 0; i--) {
        const p = fxParticles[i];
        p.life -= dt;
        if (p.life <= 0) {
          scene.remove(p.mesh);
          p.mat.dispose();
          fxParticles.splice(i, 1);
          continue;
        }
        p.vy -= p.gravity * dt;
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        const t = 1 - Math.max(0, p.life) / p.maxLife;
        const sc = THREE.MathUtils.lerp(p.startScale, p.endScale, t);
        p.mesh.scale.set(sc, sc, 1);
        p.mat.opacity = Math.max(0, (1 - t) * p.baseOpacity);
      }
    }

    function triggerWeaponKick(weaponObj, kickStrength = 7.5, flashIntensity = 22) {
      if (!weaponObj) return;
      const data = weaponObj.userData;
      data.recoilVel += kickStrength;
      if (data.weaponId === 'revolver') {
        data.cylinderTargetRot = (data.cylinderTargetRot || 0) + Math.PI / 3;
      }
      if (data.weaponId === 'rifle') {
        data.leverAnimTimer = 0.34;
      }
      if (data.weaponId === 'crossbow') {
        data.boltReloadTimer = 0.38;
      }
      if (data.weaponId === 'hellfire') {
        data.spinVel = 24.0;
      }
      if (data.flash && flashIntensity > 0) {
        data.flashTimer = 0.08;
        data.flash.visible = true;
        data.flashLight.intensity = flashIntensity;
      }
    }

    function updateWeaponViewFX(weaponObj, dt) {
      if (!weaponObj) return;
      const data = weaponObj.userData;
      const spring = 320;
      const damping = 24;

      let remaining = Math.min(dt, 0.1);
      while (remaining > 0) {
        const step = Math.min(remaining, 1 / 120);
        data.recoilVel += (-spring * data.recoilAngle - damping * data.recoilVel) * step;
        data.recoilAngle += data.recoilVel * step;
        remaining -= step;
      }
      data.recoilAngle = THREE.MathUtils.clamp(data.recoilAngle, -0.08, 0.56);
      if (data.body) {
        data.body.rotation.x = data.recoilAngle;
        data.body.position.z = data.recoilAngle * 0.055;
      }
      if (data.cylinder && data.cylinderTargetRot !== undefined) {
        data.cylinder.rotation.z += (data.cylinderTargetRot - data.cylinder.rotation.z) * Math.min(1, dt * 18);
      }
      if (data.barrelCluster) {
        if (data.spinVel && data.spinVel > 0.02) {
          data.barrelCluster.rotation.z += data.spinVel * dt;
          data.spinVel *= Math.exp(-dt * 4.5);
        } else {
          data.spinVel = 0;
        }
      }
      if (data.hammer) {
        data.hammer.rotation.x = -Math.max(0, data.recoilAngle) * 0.65;
      }
      if (data.lever) {
        if (data.leverAnimTimer > 0) {
          data.leverAnimTimer = Math.max(0, data.leverAnimTimer - dt);
          const lt = 1 - data.leverAnimTimer / 0.34;
          data.lever.rotation.x = Math.sin(lt * Math.PI) * 0.62;
        } else {
          data.lever.rotation.x = 0;
        }
      }
      if (data.loadedBolt) {
        if (data.boltReloadTimer > 0) {
          data.boltReloadTimer = Math.max(0, data.boltReloadTimer - dt);
          data.loadedBolt.visible = data.boltReloadTimer < 0.08;
        } else {
          data.loadedBolt.visible = true;
        }
      }
      if (data.fuseSpark) {
        const sp = 0.085 + Math.sin(worldTime * 28) * 0.025;
        data.fuseSpark.scale.set(sp, sp, 1);
      }

      if (data.flash) {
        if (data.flashTimer > 0) {
          data.flashTimer = Math.max(0, data.flashTimer - dt);
          const t = data.flashTimer / 0.08;
          data.flash.visible = t > 0.02;
          data.flashMat.opacity = t;
          data.flashLight.intensity = 22 * t * t;
          data.flash.scale.setScalar(0.7 + 0.9 * t);
        } else if (data.flash.visible) {
          data.flash.visible = false;
          data.flashLight.intensity = 0;
          data.flashMat.opacity = 0;
        }
      }
    }

    // --- Kastet Dynamitt (ballistisk bue, luntegnister og 2,2s eksplosjon med trykkbølge og AoE-skade) ---
    const thrownDynamites = [];
    const shockwaves = [];
    const shockwaveGeo = new THREE.RingGeometry(0.35, 1.0, 24);
    shockwaveGeo.rotateX(-Math.PI / 2);

    function throwDynamite(origin, direction) {
      if (playerState.dynamite <= 0) {
        playShopDenySound();
        equipWeapon('revolver');
        return;
      }
      playerState.dynamite -= 1;
      const dynMesh = createThrownDynamiteMesh();
      dynMesh.position.copy(origin);
      scene.add(dynMesh);

      const vel = direction.clone().multiplyScalar(15.0);
      vel.y += 4.6;

      thrownDynamites.push({
        mesh: dynMesh,
        vel,
        fuse: 2.2,
        sparkAccum: 0
      });

      playDynamiteThrowSound();
      updateStatusUI();
      if (playerState.dynamite <= 0 && activeWeaponId === 'dynamite') {
        equipWeapon('revolver', true);
      }
    }

    let applyDynamiteBlastHook = null;

    function explodeDynamite(pos) {
      playExplosionSound();
      spawnImpact(pos, 0xff8a2a, 3.2);
      spawnSparkBurst(pos, 18, 0xffb838, 1.85);
      spawnGunsmoke(pos, 8, 3.2);

      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xffaa3b,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
        toneMapped: false
      });
      const ringMesh = new THREE.Mesh(shockwaveGeo, ringMat);
      ringMesh.position.set(pos.x, getTerrainHeight(pos.x, pos.z) + 0.12, pos.z);
      ringMesh.scale.setScalar(0.3);
      scene.add(ringMesh);
      shockwaves.push({ mesh: ringMesh, mat: ringMat, life: 0.46, maxLife: 0.46 });

      if (applyDynamiteBlastHook) {
        applyDynamiteBlastHook(pos, 7.2);
      }
    }

    function updateThrownDynamites(dt) {
      for (let i = thrownDynamites.length - 1; i >= 0; i--) {
        const d = thrownDynamites[i];
        d.fuse -= dt;
        d.vel.y -= 13.5 * dt;

        d.mesh.position.addScaledVector(d.vel, dt);
        d.mesh.rotation.x += dt * 7.5;
        d.mesh.rotation.z += dt * 5.2;

        if (pointHitsSolidWall(d.mesh.position.x, d.mesh.position.y, d.mesh.position.z)) {
          d.vel.x *= -0.38;
          d.vel.z *= -0.38;
        }

        const gy = getTerrainHeight(d.mesh.position.x, d.mesh.position.z) + 0.11;
        if (d.mesh.position.y < gy) {
          d.mesh.position.y = gy;
          if (d.vel.y < -1.2) {
            d.vel.y *= -0.36;
            d.vel.x *= 0.65;
            d.vel.z *= 0.65;
          } else {
            d.vel.set(0, 0, 0);
          }
        }

        d.sparkAccum += dt;
        if (d.sparkAccum >= 0.07) {
          d.sparkAccum = 0;
          spawnSparkBurst(d.mesh.position, 1, 0xffd25a, 0.42);
        }

        if (d.fuse <= 0) {
          const blastPos = d.mesh.position.clone();
          scene.remove(d.mesh);
          thrownDynamites.splice(i, 1);
          explodeDynamite(blastPos);
        }
      }

      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.life -= dt;
        if (sw.life <= 0) {
          scene.remove(sw.mesh);
          sw.mat.dispose();
          shockwaves.splice(i, 1);
          continue;
        }
        const t = 1 - sw.life / sw.maxLife;
        sw.mesh.scale.setScalar(0.4 + t * 7.2);
        sw.mat.opacity = Math.max(0, (1 - t) * 0.9);
      }
    }

    function shoot() {
      if (shotCooldownTimer > 0) return;
      if (audioCtx.state === 'suspended') audioCtx.resume();

      const useVR = renderer.xr.isPresenting && vrActiveWeapon;
      const useThird = !useVR && !!(shopAndCameraSystem && shopAndCameraSystem.isThirdPersonActive());
      const weaponObj = useVR ? vrActiveWeapon : pcWeapons[activeWeaponId];
      if (!weaponObj && !useThird) return;

      if (useThird) {
        shopAndCameraSystem.getThirdPersonShotOriginAndDir(shotPos, shotDir);
      } else {
        weaponObj.userData.muzzle.getWorldPosition(shotPos);
        shotDir.set(0, 0, 0);

        if (useVR) {
          weaponObj.getWorldQuaternion(shotQuat);
          shotDir.copy(FORWARD).applyQuaternion(shotQuat).normalize();
        } else {
          camera.getWorldPosition(aimCamPos);
          camera.getWorldDirection(aimCamDir);
          const convergeDist = activeWeaponId === 'rifle' ? 28 : 16;
          aimPoint.copy(aimCamPos).addScaledVector(aimCamDir, convergeDist);
          shotDir.copy(aimPoint).sub(shotPos).normalize();
        }
      }

      if (activeWeaponId === 'dynamite') {
        shotCooldownTimer = 0.52;
        triggerWeaponKick(weaponObj, 6.0, 0);
        throwDynamite(shotPos, shotDir);
        pulseRightHaptic();
        return;
      }

      if (mmoSystem) {
        mmoSystem.notifyLocalShot(shotPos.x, shotPos.y, shotPos.z, shotDir.x, shotDir.y, shotDir.z);
      }

      if (activeWeaponId === 'shotgun') {
        shotCooldownTimer = 0.52;
        spreadRight.crossVectors(shotDir, UP);
        if (spreadRight.lengthSq() < 1e-5) spreadRight.set(1, 0, 0);
        spreadRight.normalize();
        spreadUp.crossVectors(spreadRight, shotDir).normalize();

        for (let p = 0; p < 6; p++) {
          const ang = (p / 6) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
          const rad = 0.025 + Math.random() * 0.068;
          pelletDir
            .copy(shotDir)
            .addScaledVector(spreadRight, Math.cos(ang) * rad)
            .addScaledVector(spreadUp, Math.sin(ang) * rad)
            .normalize();
          spawnBullet(shotPos, pelletDir, { speed: 58, life: 0.68, dmgMult: 1, kind: 'pellet' });
        }
        if (ejectShellCasing) {
          casingOrigin.copy(shotPos).addScaledVector(shotDir, -0.22);
          ejectShellCasing(casingOrigin, spreadRight, spreadUp, shotDir, 2, playCasingClinkSound);
        }
        spawnGunsmoke(shotPos, 4, 1.35);
        notifyGunshot(shotPos);
        triggerWeaponKick(weaponObj, 13.5, 28);
        playShotgunSound();
        pulseRightHaptic();
        return;
      }

      if (activeWeaponId === 'rifle') {
        shotCooldownTimer = 0.42;
        spawnBullet(shotPos, shotDir, { speed: 98, life: 3.2, dmgMult: 3, kind: 'rifle' });
        if (ejectShellCasing) {
          spreadRight.crossVectors(shotDir, UP);
          if (spreadRight.lengthSq() < 1e-5) spreadRight.set(1, 0, 0);
          spreadRight.normalize();
          spreadUp.crossVectors(spreadRight, shotDir).normalize();
          casingOrigin.copy(shotPos).addScaledVector(shotDir, -0.28);
          ejectShellCasing(casingOrigin, spreadRight, spreadUp, shotDir, 1, playCasingClinkSound);
        }
        spawnGunsmoke(shotPos, 2, 1.1);
        notifyGunshot(shotPos);
        triggerWeaponKick(weaponObj, 9.5, 25);
        playRifleSound();
        pulseRightHaptic();
        return;
      }

      if (activeWeaponId === 'crossbow') {
        shotCooldownTimer = 0.46;
        spawnBullet(shotPos, shotDir, { speed: 78, life: 2.8, dmgMult: 1, isSilverBolt: true, kind: 'silver' });
        spawnSparkBurst(shotPos, 4, 0x8fd8ff, 0.45);
        triggerWeaponKick(weaponObj, 4.5, 14);
        playCrossbowSound();
        pulseRightHaptic();
        return;
      }

      if (activeWeaponId === 'hellfire') {
        shotCooldownTimer = 0.095;
        spawnBullet(shotPos, shotDir, { speed: 108, life: 3.0, dmgMult: 2, isSilverBolt: true, kind: 'silver' });
        if (ejectShellCasing) {
          spreadRight.crossVectors(shotDir, UP);
          if (spreadRight.lengthSq() < 1e-5) spreadRight.set(1, 0, 0);
          spreadRight.normalize();
          spreadUp.crossVectors(spreadRight, shotDir).normalize();
          casingOrigin.copy(shotPos).addScaledVector(shotDir, -0.26);
          ejectShellCasing(casingOrigin, spreadRight, spreadUp, shotDir, 1, playCasingClinkSound);
        }
        spawnSparkBurst(shotPos, 3, 0x74d4ff, 0.5);
        notifyGunshot(shotPos);
        triggerWeaponKick(weaponObj, 4.2, 24);
        playHellfireSound();
        pulseRightHaptic();
        return;
      }

      // Standard / Gull Peacemaker Revolver
      shotCooldownTimer = 0.16;
      spawnBullet(shotPos, shotDir, { speed: 64, life: 2.6, dmgMult: 1, kind: 'revolver' });
      if (ejectShellCasing) {
        spreadRight.crossVectors(shotDir, UP);
        if (spreadRight.lengthSq() < 1e-5) spreadRight.set(1, 0, 0);
        spreadRight.normalize();
        spreadUp.crossVectors(spreadRight, shotDir).normalize();
        casingOrigin.copy(shotPos).addScaledVector(shotDir, -0.18);
        ejectShellCasing(casingOrigin, spreadRight, spreadUp, shotDir, 1, playCasingClinkSound);
      }
      spawnGunsmoke(shotPos, 2, 0.95);
      notifyGunshot(shotPos);
      triggerWeaponKick(weaponObj, 7.5, 22);
      playGunshot();
      pulseRightHaptic();
    }

    const casingOrigin = new THREE.Vector3();

    // Prosjektiler fjernes ved treff, bakken, livstid eller maks rekkevidde (utvidet til +-235m).
    const PROJECTILE_MAX_HORIZONTAL = 1240;
    const PROJECTILE_MAX_HEIGHT = 110;
    const bullets = [];
    const bulletGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.42, 6);
    bulletGeo.rotateX(Math.PI / 2);
    const silverBoltGeo = new THREE.CylinderGeometry(0.014, 0.018, 0.58, 6);
    silverBoltGeo.rotateX(Math.PI / 2);
    const bulletMat = new THREE.MeshBasicMaterial({ color: 0xffd66b, fog: false });
    const silverBoltMat = new THREE.MeshBasicMaterial({ color: 0xd8f2ff, fog: false });
    const bulletGlowGeo = new THREE.SphereGeometry(0.06, 8, 6);
    const bulletGlowMat = new THREE.MeshBasicMaterial({
      color: 0xffe9a8,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false
    });
    const silverGlowBoltMat = new THREE.MeshBasicMaterial({
      color: 0x6ec6ff,
      transparent: true,
      opacity: 0.62,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false
    });

    function spawnBullet(origin, direction, opts = {}) {
      const isSilver = !!opts.isSilverBolt;
      const mesh = new THREE.Group();
      mesh.add(new THREE.Mesh(isSilver ? silverBoltGeo : bulletGeo, isSilver ? silverBoltMat : bulletMat));
      const glow = new THREE.Mesh(bulletGlowGeo, isSilver ? silverGlowBoltMat : bulletGlowMat);
      glow.position.z = 0.13;
      mesh.add(glow);

      mesh.position.copy(origin);
      mesh.quaternion.setFromUnitVectors(FORWARD, direction);
      scene.add(mesh);

      bullets.push({
        mesh,
        dir: direction.clone(),
        prev: origin.clone(),
        speed: opts.speed || 64,
        life: opts.life || 2.5,
        dmgMult: opts.dmgMult || 1,
        isSilverBolt: isSilver
      });
    }

    function removeBullet(index) {
      // Geometri og materiale er delt mellom alle kuler, så bare scenenoden fjernes.
      scene.remove(bullets[index].mesh);
      bullets.splice(index, 1);
    }

    const impactPuffs = [];
    const impactGeo = new THREE.SphereGeometry(1, 6, 5);

    function spawnImpact(position, color = 0xffdf9c, size = 0.18) {
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false
      });
      const mesh = new THREE.Mesh(impactGeo, mat);
      mesh.position.copy(position);
      mesh.scale.setScalar(0.04);
      scene.add(mesh);
      impactPuffs.push({ mesh, mat, life: 0.22, maxLife: 0.22, size });
    }

    function updateImpacts(dt) {
      for (let i = impactPuffs.length - 1; i >= 0; i--) {
        const puff = impactPuffs[i];
        puff.life -= dt;
        const t = 1 - Math.max(0, puff.life) / puff.maxLife;
        puff.mesh.scale.setScalar(0.04 + t * puff.size);
        puff.mat.opacity = Math.max(0, 1 - t) * 0.9;
        puff.mesh.position.y += dt * 0.4;
        if (puff.life <= 0) {
          // Treffeffekten fjernes helt; materialet er unikt, geometrien er delt.
          scene.remove(puff.mesh);
          puff.mat.dispose();
          impactPuffs.splice(i, 1);
        }
      }
    }

    let targetResetTimer = 0;

    function resetTargets() {
      targetResetTimer = 0;
      playerState.targets = 0;
      practiceBottles.forEach((bottle) => {
        const data = bottle.userData;
        data.knocked = false;
        data.vel.set(0, 0, 0);
        data.angVel.set(0, 0, 0);
        bottle.position.copy(data.home);
        bottle.quaternion.copy(data.homeQuat);
      });
      updateStatusUI();
    }

    const segA = new THREE.Vector3();
    const segB = new THREE.Vector3();
    const segC = new THREE.Vector3();

    function segmentPointDistance(a, b, p) {
      segA.subVectors(b, a);
      const lenSq = segA.lengthSq();
      const t = lenSq > 0 ? THREE.MathUtils.clamp(segB.subVectors(p, a).dot(segA) / lenSq, 0, 1) : 0;
      return segC.copy(a).addScaledVector(segA, t).distanceTo(p);
    }

    function knockBottle(bottle, direction) {
      const data = bottle.userData;
      data.knocked = true;
      data.vel.copy(direction).multiplyScalar(2.8);
      data.vel.y = 2.9;
      data.vel.x += (Math.random() - 0.5) * 1.6;
      data.vel.z += (Math.random() - 0.5) * 1.6;
      data.angVel.set(
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 9,
        (Math.random() - 0.5) * 14
      );

      playerState.targets += 1;
      playBottleHit();
      recordQuestKill(['bottle']);
      updateStatusUI();

      if (playerState.targets >= practiceBottles.length) {
        targetResetTimer = (activeQuest && activeQuest.targetType === 'bottle') ? 1.15 : 2.6;
      }
    }

    const bottleWorldPos = new THREE.Vector3();

    function updateBottles(dt) {
      practiceBottles.forEach((bottle) => {
        const data = bottle.userData;
        if (!data.knocked) return;

        data.vel.y -= 9.8 * dt;
        bottle.position.addScaledVector(data.vel, dt);
        bottle.rotation.x += data.angVel.x * dt;
        bottle.rotation.y += data.angVel.y * dt;
        bottle.rotation.z += data.angVel.z * dt;

        if (bottle.position.y < 0.15) {
          bottle.position.y = 0.15;
          if (data.vel.y < -0.6) {
            data.vel.y *= -0.32;
            data.vel.x *= 0.72;
            data.vel.z *= 0.72;
            data.angVel.multiplyScalar(0.7);
          } else {
            data.vel.y = 0;
            data.vel.x *= 0.9;
            data.vel.z *= 0.9;
            data.angVel.multiplyScalar(0.86);
          }
        }
      });
    }

    const safeHouseDoorBulletCheckPos = new THREE.Vector3();
    const altarBulletCheckPos = new THREE.Vector3();
    const goldBulletCheckPos = new THREE.Vector3();
    let summonBossFromAltarHook = null;
    let summonWendigoFromObeliskHook = null;
    let damageBrimstoneTotemHook = null;

    function getCurrentGoldMultiplier() {
      const hsMult = 1 + collectedHorseshoeIds.length * 0.02;
      const relicMult = mmoSystem ? mmoSystem.getRelicGoldMultiplier() : 1.0;
      let evMult = 1.0;
      if (activeWorldEventId === 'gold_rush' || activeWorldEventId === 'blood_eclipse') evMult = 2.0;
      else if (activeWorldEventId === 'frontier_storm') evMult = 1.5;
      return hsMult * relicMult * evMult;
    }

    function awardScaledGold(baseGold) {
      const gained = Math.max(1, Math.round(baseGold * getCurrentGoldMultiplier()));
      playerState.gold += gained;
      return gained;
    }

    function collectFrontierObjective(entry) {
      if (!entry || entry.collected) return false;
      entry.collected = true;
      entry.group.visible = false;
      entry.respawnTimer = 85;
      if (entry.kind === 'moonstone') {
        storyState.moonstonesCollected = (storyState.moonstonesCollected || 0) + 1;
        awardScaledGold(25);
        spawnSparkBurst(entry.worldPos, 16, 0x8ad8ff, 1.35);
        recordQuestKill(['moonstone', 'treasure_any']);
      } else if (entry.kind === 'strongbox') {
        storyState.strongboxesRecovered = (storyState.strongboxesRecovered || 0) + 1;
        awardScaledGold(35);
        spawnSparkBurst(entry.worldPos, 18, 0xffd24c, 1.4);
        recordQuestKill(['strongbox', 'treasure_any']);
      } else if (entry.kind === 'sun_rune') {
        storyState.ancientRunesAttuned = (storyState.ancientRunesAttuned || 0) + 1;
        awardScaledGold(28);
        spawnSparkBurst(entry.worldPos, 16, 0xffe26a, 1.35);
        recordQuestKill(['sun_rune', 'treasure_any']);
      } else if (entry.kind === 'oasis_idol') {
        storyState.oasisIdolsCollected = (storyState.oasisIdolsCollected || 0) + 1;
        awardScaledGold(32);
        spawnSparkBurst(entry.worldPos, 18, 0xffd84a, 1.4);
        recordQuestKill(['oasis_idol', 'treasure_any']);
      } else if (entry.kind === 'mill_crate') {
        storyState.millCratesCollected = (storyState.millCratesCollected || 0) + 1;
        awardScaledGold(28);
        playerState.food += 1;
        spawnSparkBurst(entry.worldPos, 16, 0xffb86c, 1.35);
        recordQuestKill(['mill_crate', 'treasure_any']);
      } else if (entry.kind === 'meteor_core') {
        storyState.meteorCoresCollected = (storyState.meteorCoresCollected || 0) + 1;
        awardScaledGold(36);
        spawnSparkBurst(entry.worldPos, 20, 0xff5a22, 1.45);
        recordQuestKill(['meteor_core', 'treasure_any']);
      } else if (entry.kind === 'star_shard') {
        storyState.starShardsCollected = (storyState.starShardsCollected || 0) + 1;
        awardScaledGold(38);
        spawnSparkBurst(entry.worldPos, 20, 0x9ad8ff, 1.45);
        recordQuestKill(['star_shard', 'treasure_any']);
      }
      if (playRelicPickupSound) playRelicPickupSound();
      else playGoldPickupSound();
      checkStoryProgression();
      updateStatusUI();
      return true;
    }

    function collectGoldenHorseshoe(hs) {
      if (!hs || hs.collected) return false;
      hs.collected = true;
      hs.group.visible = false;
      if (!collectedHorseshoeIds.includes(hs.id)) {
        collectedHorseshoeIds.push(hs.id);
      }
      syncHomesteadStoryCounters();
      awardScaledGold(50);
      spawnSparkBurst(hs.worldPos, 24, 0xffe066, 1.55);
      if (playQuestFanfare) playQuestFanfare();
      else playGoldPickupSound();
      const dict = L();
      const count = collectedHorseshoeIds.length;
      if (dict.horseshoeToast) {
        showFrontierToast(dict.horseshoeToast(count, count * 2), 6.0);
      }
      recordQuestKill(['horseshoe', 'treasure_any']);
      checkStoryProgression();
      saveCareerProgress();
      updateStatusUI();
      return true;
    }

    function collectGoldPickup(gp) {
      if (!gp || gp.collected) return;
      gp.collected = true;
      gp.group.visible = false;
      gp.respawnTimer = 45;
      awardScaledGold(gp.amount);
      const inMineArea = gp.group.position.x > 65;
      if (inMineArea) {
        storyState.mineGoldCollected = true;
      }
      playGoldPickupSound();
      recordQuestKill(inMineArea ? ['gold_pickup', 'treasure_any', 'mine_action'] : ['gold_pickup', 'treasure_any']);
      checkStoryProgression();
      updateStatusUI();
    }

    function updateGoldPickups(dt) {
      if (!goldPickups) return;
      for (let i = 0; i < goldPickups.length; i++) {
        const gp = goldPickups[i];
        if (gp.collected) {
          if (gp.respawnTimer > 0) {
            gp.respawnTimer -= dt;
            if (gp.respawnTimer <= 0) {
              gp.collected = false;
              gp.group.visible = true;
            }
          }
          continue;
        }
        gp.hitMesh.rotation.y += dt * 1.4;
        const dx = playerRig.position.x - gp.group.position.x;
        const dz = playerRig.position.z - gp.group.position.z;
        if (dx * dx + dz * dz < 5.8) {
          collectGoldPickup(gp);
        }
      }
      if (bloodChaliceOrb) {
        bloodChaliceOrb.rotation.y += dt * 1.6;
        bloodChaliceOrb.position.y = 1.52 + Math.sin(worldTime * 2.8) * 0.06;
      }
      if (wendigoObeliskOrb) {
        wendigoObeliskOrb.rotation.y += dt * 1.5;
        wendigoObeliskOrb.position.y = 1.62 + Math.sin(worldTime * 2.6) * 0.06;
      }
      // Rotasjon, nærhets-oppsamling og respawn for alle 7 regionale skatte-/relikvietyper + 24 Gylne Hestesko
      const frontierLists = [moonstoneTotems, fortStrongboxes, ancientRunes, oasisIdols, millCrates, meteorCores, starShards];
      for (let l = 0; l < frontierLists.length; l++) {
        const list = frontierLists[l];
        if (!list) continue;
        for (let i = 0; i < list.length; i++) {
          const obj = list[i];
          if (obj.collected) {
            if (obj.respawnTimer > 0) {
              obj.respawnTimer -= dt;
              if (obj.respawnTimer <= 0) {
                obj.collected = false;
                obj.group.visible = true;
              }
            }
            continue;
          }
          if (obj.hitMesh) obj.hitMesh.rotation.y += dt * 1.45;
          const dx = playerRig.position.x - obj.worldPos.x;
          const dz = playerRig.position.z - obj.worldPos.z;
          if (dx * dx + dz * dz < 6.2) {
            collectFrontierObjective(obj);
          }
        }
      }
      if (goldenHorseshoes) {
        for (let i = 0; i < goldenHorseshoes.length; i++) {
          const hs = goldenHorseshoes[i];
          if (hs.collected) continue;
          hs.group.rotation.y += dt * 1.85;
          const dx = playerRig.position.x - hs.worldPos.x;
          const dz = playerRig.position.z - hs.worldPos.z;
          if (dx * dx + dz * dz < 6.5) {
            collectGoldenHorseshoe(hs);
          }
        }
      }
      if (brimstoneTotems) {
        for (let i = 0; i < brimstoneTotems.length; i++) {
          const bt = brimstoneTotems[i];
          if (bt.destroyed) {
            if (bt.respawnTimer > 0) {
              bt.respawnTimer -= dt;
              if (bt.respawnTimer <= 0) {
                bt.destroyed = false;
                bt.hp = bt.maxHp || 3;
                bt.group.visible = true;
              }
            }
            continue;
          }
          if (bt.hitMesh) bt.hitMesh.rotation.y += dt * 1.8;
        }
      }
    }

    function updateBullets(dt) {
      for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.prev.copy(bullet.mesh.position);
        bullet.mesh.position.addScaledVector(bullet.dir, bullet.speed * dt);
        bullet.life -= dt;

        // Sjekk om kula treffer den tunge Safe House-døren på avstand
        if (safeHouseDoorHitMeshes.length > 0) {
          safeHouseDoorHitMeshes[0].getWorldPosition(safeHouseDoorBulletCheckPos);
          if (
            Math.abs(bullet.mesh.position.y - safeHouseDoorBulletCheckPos.y) < 1.08 &&
            segmentPointDistance(bullet.prev, bullet.mesh.position, safeHouseDoorBulletCheckPos) < 0.68
          ) {
            spawnSparkBurst(bullet.mesh.position, 5, 0xffd28a, 0.8);
            toggleSafeHouseDoor();
            removeBullet(i);
            continue;
          }
        }

        // Sjekk om kula treffer Blodalteret i Boot Hill-kapellet eller Obelisken i Steinringen (SV)
        if (bloodChaliceOrb) {
          bloodChaliceOrb.getWorldPosition(altarBulletCheckPos);
          if (segmentPointDistance(bullet.prev, bullet.mesh.position, altarBulletCheckPos) < 0.72) {
            spawnSparkBurst(altarBulletCheckPos, 14, 0xff2442, 1.35);
            if (summonBossFromAltarHook) summonBossFromAltarHook();
            removeBullet(i);
            continue;
          }
        }
        if (wendigoAltarWorldPos && segmentPointDistance(bullet.prev, bullet.mesh.position, wendigoAltarWorldPos) < 0.85) {
          spawnSparkBurst(wendigoAltarWorldPos, 16, 0x4effa8, 1.45);
          if (summonWendigoFromObeliskHook) summonWendigoFromObeliskHook();
          removeBullet(i);
          continue;
        }
        if (brimstoneTotems && brimstoneTotems.length > 0) {
          let hitTotem = null;
          for (let tIdx = 0; tIdx < brimstoneTotems.length; tIdx++) {
            const bt = brimstoneTotems[tIdx];
            if (bt.destroyed) continue;
            if (segmentPointDistance(bullet.prev, bullet.mesh.position, bt.worldPos) < 0.88) {
              hitTotem = bt;
              break;
            }
          }
          if (hitTotem) {
            if (damageBrimstoneTotemHook) damageBrimstoneTotemHook(hitTotem, bullet.dmgMult || 1);
            removeBullet(i);
            continue;
          }
        }
        const shootPickupLists = [moonstoneTotems, fortStrongboxes, ancientRunes, oasisIdols, millCrates, meteorCores, starShards];
        let shotFrontierObj = null;
        for (let l = 0; l < shootPickupLists.length && !shotFrontierObj; l++) {
          const list = shootPickupLists[l];
          if (!list) continue;
          for (let k = 0; k < list.length; k++) {
            const fo = list[k];
            if (!fo.collected && segmentPointDistance(bullet.prev, bullet.mesh.position, fo.worldPos) < 0.78) {
              shotFrontierObj = fo;
              break;
            }
          }
        }
        if (shotFrontierObj) {
          collectFrontierObjective(shotFrontierObj);
          removeBullet(i);
          continue;
        }
        if (goldenHorseshoes) {
          let shotHs = null;
          for (let hIdx = 0; hIdx < goldenHorseshoes.length; hIdx++) {
            const hs = goldenHorseshoes[hIdx];
            if (!hs.collected && segmentPointDistance(bullet.prev, bullet.mesh.position, hs.worldPos) < 0.82) {
              shotHs = hs;
              break;
            }
          }
          if (shotHs) {
            collectGoldenHorseshoe(shotHs);
            removeBullet(i);
            continue;
          }
        }

        if (frontierExpansion && frontierExpansion.checkBulletFirewoodHit(bullet.prev, bullet.mesh.position)) {
          removeBullet(i);
          continue;
        }
        if (magicGraphics && magicGraphics.checkBulletWaystoneHit(bullet.prev, bullet.mesh.position)) {
          removeBullet(i);
          continue;
        }

        // Sjekk om kula treffer en gullklump/gullkiste i Crimson Canyon
        if (goldPickups) {
          let hitGold = null;
          for (let g = 0; g < goldPickups.length; g++) {
            const gp = goldPickups[g];
            if (gp.collected) continue;
            goldBulletCheckPos.set(gp.group.position.x, gp.group.position.y + 0.30, gp.group.position.z);
            if (segmentPointDistance(bullet.prev, bullet.mesh.position, goldBulletCheckPos) < 0.65) {
              hitGold = gp;
              break;
            }
          }
          if (hitGold) {
            spawnSparkBurst(bullet.mesh.position, 8, 0xffe066, 0.95);
            collectGoldPickup(hitGold);
            removeBullet(i);
            continue;
          }
        }

        let hitBottle = null;
        let nearest = Infinity;
        for (const bottle of practiceBottles) {
          if (bottle.userData.knocked) continue;
          bottle.getWorldPosition(bottleWorldPos);
          if (segmentPointDistance(bullet.prev, bullet.mesh.position, bottleWorldPos) < 0.17) {
            const distance = bullet.prev.distanceToSquared(bottleWorldPos);
            if (distance < nearest) {
              nearest = distance;
              hitBottle = bottle;
            }
          }
        }

        if (hitBottle) {
          hitBottle.getWorldPosition(bottleWorldPos);
          spawnSparkBurst(bottleWorldPos, 6, 0xffe6a8, 0.8);
          knockBottle(hitBottle, bullet.dir);
          removeBullet(i);
          continue;
        }

        // Sjekk treff på sprengbare dynamitt-barrikader inne i gullgruven
        if (mineBarricades && mineBarricades.length > 0) {
          let hitBar = null;
          for (let bIdx = 0; bIdx < mineBarricades.length; bIdx++) {
            const bar = mineBarricades[bIdx];
            if (bar.destroyed) continue;
            if (segmentPointDistance(bullet.prev, bullet.mesh.position, bar.worldPos) < 1.35) {
              hitBar = bar;
              break;
            }
          }
          if (hitBar) {
            spawnSparkBurst(bullet.mesh.position, 6, 0xff9438, 0.9);
            if (damageBarricadeHook) damageBarricadeHook(hitBar, bullet.dmgMult || 1);
            removeBullet(i);
            continue;
          }
        }

        // Sjekk om kula treffer Gammelt Gruvekart, Sølvrelikvie, Hellfire-piedestal eller Tog-Gatling
        if (mineMapPickup && !mineMapPickup.collected && segmentPointDistance(bullet.prev, bullet.mesh.position, mineMapPickup.worldPos) < 0.85) {
          collectMineMapPickup();
          removeBullet(i);
          continue;
        }
        if (hellfirePickup && !hellfirePickup.collected && segmentPointDistance(bullet.prev, bullet.mesh.position, hellfirePickup.worldPos) < 0.95) {
          collectHellfirePickup();
          removeBullet(i);
          continue;
        }

        const combatHit = findCombatHit(bullet.prev, bullet.mesh.position);
        if (combatHit) {
          spawnImpact(combatHit.point, bullet.isSilverBolt ? 0x8ad8ff : 0xffcf8a, 0.2);
          if (bullet.isSilverBolt && (combatHit.type === 'night' || combatHit.type === 'boss' || combatHit.type === 'wendigo_boss')) {
            spawnSparkBurst(combatHit.point, 10, 0xff6a1f, 1.15);
          }
          if (mmoSystem && (combatHit.type === 'boss' || combatHit.type === 'wendigo_boss')) {
            mmoSystem.notifyLocalBossHit(combatHit.type === 'boss' ? 'malakor' : 'wendigo', 3);
          }
          damageCombatTarget(combatHit, bullet.dir, bullet);
          removeBullet(i);
          continue;
        }

        if (pointHitsSolidWall(bullet.mesh.position.x, bullet.mesh.position.y, bullet.mesh.position.z)) {
          spawnImpact(bullet.mesh.position, 0xffdf7a, 0.15);
          spawnSparkBurst(bullet.mesh.position, 5, 0xffd85a, 0.9);
          playRockRicochetSound();
          removeBullet(i);
          continue;
        }

        const groundY = getTerrainHeight(bullet.mesh.position.x, bullet.mesh.position.z, bullet.mesh.position.y);
        if (bullet.mesh.position.y < groundY + 0.05) {
          spawnImpact(bullet.mesh.position, 0xd9b07c, 0.16);
          spawnSandDust(bullet.mesh.position);
          removeBullet(i);
          continue;
        }

        if (
          bullet.life <= 0 ||
          Math.abs(bullet.mesh.position.x) > PROJECTILE_MAX_HORIZONTAL ||
          Math.abs(bullet.mesh.position.z) > PROJECTILE_MAX_HORIZONTAL ||
          bullet.mesh.position.y > PROJECTILE_MAX_HEIGHT
        ) {
          removeBullet(i);
        }
      }
    }

    const {
      playGunshot,
      playShotgunSound,
      playRifleSound,
      playCrossbowSound,
      playDynamiteThrowSound,
      playExplosionSound,
      playHellfireSound,
      playWeaponSwitchSound,
      playGoldPickupSound,
      playRockRicochetSound,
      playBearRoarSound,
      playBossVictoryFanfare,
      playHoofbeatSound,
      playHorseWhistleSound,
      playCasingClinkSound,
      playBarricadeBlastSound,
      playRelicPickupSound,
      playBottleHit,
      playFleshHitSound,
      playPlayerHitSound,
      playPlayerDeathSound,
      playCollectSound,
      playUpgradeSound,
      playShopDenySound,
      playHealSound,
      playQuestSelectSound,
      playQuestFanfare,
      playDoorToggleSound,
      playBanditShotSound,
      updateBackgroundAmbience
    } = initWesternAudio(audioCtx, controllers, () => nightAmount);

    playWeaponSwitchSfxFn = playWeaponSwitchSound;
    playStoryFanfareHook = playQuestFanfare;

    function pulseRightHaptic() {
      if (!renderer.xr.isPresenting) return;
      const gamepad = getHandGamepad('right');
      const actuator = gamepad && gamepad.hapticActuators && gamepad.hapticActuators[0];
      if (actuator && typeof actuator.pulse === 'function') {
        try {
          actuator.pulse(0.9, 60);
        } catch (err) {
          // Haptikk er valgfritt
        }
      }
    }

    // --- 7e. Bevegelse: venstre spak i VR, WASD/piltaster på PC (Kartgrenser -215..+215, 2x fart til hest) ---
    const VR_MOVE_SPEED = 3.1;
    const PC_MOVE_SPEED = 7.4;
    const PLAY_AREA_LIMIT = 1180;
    const SNAP_TURN_ANGLE = Math.PI / 6;
    const SNAP_TURN_COOLDOWN = 0.35;

    let snapTurnCooldown = 0;
    let snapTurnReady = true;
    let vrWeaponBtnPrev = false;

    function updateVRWeaponSwitchButton() {
      if (!renderer.xr.isPresenting) {
        vrWeaponBtnPrev = false;
        return;
      }
      const gpR = getHandGamepad('right') || (vrHands.right && vrHands.right.userData.gamepad) || null;
      const gpL = getHandGamepad('left') || (vrHands.left && vrHands.left.userData.gamepad) || null;
      const aPressed = !!(gpR && gpR.buttons && ((gpR.buttons[4] && gpR.buttons[4].pressed) || (gpR.buttons[5] && gpR.buttons[5].pressed)));
      const xPressed = !!(gpL && gpL.buttons && ((gpL.buttons[4] && gpL.buttons[4].pressed) || (gpL.buttons[5] && gpL.buttons[5].pressed)));
      const nowPressed = aPressed || xPressed;
      if (nowPressed && !vrWeaponBtnPrev) {
        cycleUnlockedWeapon(1);
      }
      vrWeaponBtnPrev = nowPressed;
    }

    const moveForward = new THREE.Vector3();
    const moveRight = new THREE.Vector3();
    const moveVector = new THREE.Vector3();

    function clampPlayerRig() {
      playerRig.position.x = THREE.MathUtils.clamp(playerRig.position.x, -PLAY_AREA_LIMIT, PLAY_AREA_LIMIT);
      playerRig.position.z = THREE.MathUtils.clamp(playerRig.position.z, -PLAY_AREA_LIMIT, PLAY_AREA_LIMIT);
      const refY = isRidingHorse ? (playerRig.position.y - 1.15) : playerRig.position.y;
      const gY = getTerrainHeight(playerRig.position.x, playerRig.position.z, refY);
      if (isRidingHorse && gY < -1.1) {
        isRidingHorse = false;
        updateStatusUI();
      }
      playerRig.position.y = gY + (isRidingHorse ? 1.15 : 0);
    }

    function moveInLookDirection(strafe, forwardAmount, speed, dt) {
      camera.getWorldDirection(moveForward);
      moveForward.y = 0;
      if (moveForward.lengthSq() < 1e-6) return;
      moveForward.normalize();
      moveRight.crossVectors(moveForward, UP).normalize();

      moveVector.set(0, 0, 0);
      moveVector.addScaledVector(moveForward, forwardAmount);
      moveVector.addScaledVector(moveRight, strafe);
      if (moveVector.lengthSq() > 1) moveVector.normalize();
      if (moveVector.lengthSq() === 0) return;

      const trailMult = (1 + (homesteadRanks.trailblazer || 0) * 0.02) * (mmoSystem ? mmoSystem.getMoveSpeedMultiplier() : 1.0);
      const actualSpeed = (isRidingHorse ? speed * 2.0 : speed) * trailMult;
      currentMoveSpeed = actualSpeed;
      currentMoveDirX = moveVector.x;
      currentMoveDirZ = moveVector.z;

      const totalStep = actualSpeed * dt;
      const subSteps = totalStep > 0.22 ? 2 : 1;
      const stepDelta = totalStep / subSteps;
      for (let s = 0; s < subSteps; s++) {
        playerRig.position.addScaledVector(moveVector, stepDelta);
        resolveWallCollisions(playerRig.position, PLAYER_RADIUS, false);
      }
      clampPlayerRig();
    }

    function updateVRMovement(dt) {
      if (!renderer.xr.isPresenting) return;
      const gamepad = getHandGamepad('left') || (vrHands.left && vrHands.left.userData.gamepad) || null;
      if (!gamepad || !gamepad.axes) return;

      const rawX = gamepad.axes[2] !== undefined ? gamepad.axes[2] : (gamepad.axes[0] || 0);
      const rawY = gamepad.axes[3] !== undefined ? gamepad.axes[3] : (gamepad.axes[1] || 0);
      const mag = Math.hypot(rawX, rawY);
      const dz = 0.14;
      if (mag <= dz) return;

      // Myk radial død-sone og respons-kurve for behagelig og presis VR-gange i Meta Quest
      const norm = Math.min(1, (mag - dz) / (1 - dz));
      const curved = norm * (0.65 + 0.35 * norm);
      const invMag = 1 / mag;
      const strafe = rawX * invMag * curved;
      const forwardAmount = -rawY * invMag * curved;

      moveInLookDirection(strafe, forwardAmount, VR_MOVE_SPEED * curved, dt);
    }

    const pcKeys = Object.create(null);

    function updatePCMovement(dt) {
      if (renderer.xr.isPresenting) return;

      const forwardKey = (pcKeys.KeyW || pcKeys.ArrowUp) ? 1 : 0;
      const backKey = (pcKeys.KeyS || pcKeys.ArrowDown) ? 1 : 0;
      const rightKey = (pcKeys.KeyD || pcKeys.ArrowRight) ? 1 : 0;
      const leftKey = (pcKeys.KeyA || pcKeys.ArrowLeft) ? 1 : 0;

      const keyForward = forwardKey - backKey;
      const keyStrafe = rightKey - leftKey;

      if (keyForward !== 0 || keyStrafe !== 0) {
        moveInLookDirection(keyStrafe, keyForward, PC_MOVE_SPEED, dt);
        return;
      }

      // Analog berøringsspak på Telefon & Pad (proporsjonal gang- til løpefart!)
      const stickMag = Math.min(1, Math.hypot(touchStickX, touchStickY));
      if (stickMag > 0.06) {
        const speedScale = 0.32 + 0.68 * stickMag;
        moveInLookDirection(touchStickX, -touchStickY, PC_MOVE_SPEED * speedScale, dt);
      }
    }

    const rigCamWorld = new THREE.Vector3();
    const rigCamLocal = new THREE.Vector3();
    // Pre-allokert: rotasjon i VR skal aldri lage nye Vector3-objekter per frame
    const snapTurnRotated = new THREE.Vector3();

    function rotateRigAroundCamera(angleDeltaRad) {
      playerRig.updateMatrixWorld(true);
      camera.getWorldPosition(rigCamWorld);
      rigCamLocal.copy(camera.position);

      playerRig.rotation.y += angleDeltaRad;

      const rotated = snapTurnRotated.copy(rigCamLocal).applyAxisAngle(UP, playerRig.rotation.y);
      playerRig.position.x = rigCamWorld.x - rotated.x;
      playerRig.position.z = rigCamWorld.z - rotated.z;
      resolveCircleAgainstWalls(playerRig.position, PLAYER_RADIUS);
      clampPlayerRig();
    }

    function snapTurn(direction) {
      rotateRigAroundCamera(direction * SNAP_TURN_ANGLE);
    }

    function updateSnapTurn(dt) {
      if (!renderer.xr.isPresenting) {
        snapTurnCooldown = 0;
        snapTurnReady = true;
        return;
      }

      const gamepad = getHandGamepad('right') || (vrHands.right && vrHands.right.userData.gamepad) || null;
      const axis = gamepad && gamepad.axes
        ? (gamepad.axes[2] !== undefined ? gamepad.axes[2] : (gamepad.axes[0] || 0))
        : 0;

      if (controlSettings.vrSmoothTurn) {
        if (Math.abs(axis) > 0.16) {
          const norm = (Math.abs(axis) - 0.16) / 0.84;
          const sensScale = controlSettings.sensPct / 100;
          const turnRate = 2.15 * sensScale * norm * (axis > 0 ? -1 : 1);
          rotateRigAroundCamera(turnRate * dt);
        }
        return;
      }

      snapTurnCooldown = Math.max(0, snapTurnCooldown - dt);
      if (Math.abs(axis) < 0.35) snapTurnReady = true;

      if (snapTurnReady && snapTurnCooldown <= 0 && Math.abs(axis) > 0.65) {
        snapTurn(axis > 0 ? -1 : 1);
        snapTurnReady = false;
        snapTurnCooldown = SNAP_TURN_COOLDOWN;
      }
    }

    const moveKeyCodes = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    const weaponDigitMap = {
      Digit1: 'revolver',
      Digit2: 'shotgun',
      Digit3: 'rifle',
      Digit4: 'crossbow',
      Digit5: 'dynamite',
      Digit6: 'hellfire'
    };

    let callHorseHook = null;
    let toggleHorseMountHook = null;
    let damageBarricadeHook = null;

    window.addEventListener('keydown', (e) => {
      pcKeys[e.code] = true;
      const keyLower = typeof e.key === 'string' ? e.key.toLowerCase() : '';
      if (moveKeyCodes.includes(e.code)) e.preventDefault();
      if (!e.repeat && !renderer.xr.isPresenting && weaponDigitMap[e.code]) {
        const targetWeapon = weaponDigitMap[e.code];
        if (!equipWeapon(targetWeapon)) {
          playShopDenySound();
        }
      }
      if ((e.code === 'KeyQ' || keyLower === 'q') && !e.repeat && !renderer.xr.isPresenting) {
        cycleUnlockedWeapon(1);
      }
      if ((e.code === 'KeyE' || e.code === 'KeyH' || keyLower === 'e' || keyLower === 'h') && !e.repeat && !renderer.xr.isPresenting) {
        tryEatFood();
      }
      if ((e.code === 'KeyF' || keyLower === 'f') && !e.repeat && !renderer.xr.isPresenting) {
        tryKeyFSafeHouseDoor();
      }
      if ((e.code === 'KeyC' || keyLower === 'c') && !e.repeat && !renderer.xr.isPresenting) {
        if (callHorseHook) callHorseHook();
      }
      if ((e.code === 'KeyR' || keyLower === 'r') && !e.repeat && !renderer.xr.isPresenting) {
        if (toggleHorseMountHook) toggleHorseMountHook();
      }
      if ((e.code === 'KeyT' || keyLower === 't') && !e.repeat && !renderer.xr.isPresenting) resetTargets();
      if ((e.code === 'KeyN' || keyLower === 'n') && !e.repeat && !renderer.xr.isPresenting) toggleDayNight();
      if ((e.code === 'KeyJ' || keyLower === 'j') && !e.repeat && !renderer.xr.isPresenting) {
        acceptOrCycleBoardQuest();
      }
      if ((e.code === 'KeyK' || keyLower === 'k') && !e.repeat && !renderer.xr.isPresenting) {
        toggleCodexModal();
      }
      if ((e.code === 'KeyG' || keyLower === 'g') && !e.repeat && !renderer.xr.isPresenting) {
        if (mmoSystem) mmoSystem.triggerClassSkill();
      }
      if ((e.code === 'KeyM' || keyLower === 'm') && !e.repeat && !renderer.xr.isPresenting) {
        if (mmoSystem) mmoSystem.toggleCoopModal();
      }
      if ((e.code === 'KeyV' || keyLower === 'v') && !e.repeat && !renderer.xr.isPresenting) {
        if (shopAndCameraSystem) shopAndCameraSystem.toggleViewMode();
      }
      if ((e.code === 'KeyB' || keyLower === 'b') && !e.repeat && !renderer.xr.isPresenting) {
        if (shopAndCameraSystem) shopAndCameraSystem.toggleStoreModal();
      }
      if ((e.code === 'KeyX' || keyLower === 'x') && !e.repeat && !renderer.xr.isPresenting) {
        if (frontierExpansion) frontierExpansion.tryBuildOrStokeCampfire();
      }
      if (e.code === 'Escape') {
        if (codexModalEl && codexModalEl.classList.contains('open')) toggleCodexModal(false);
        if (shopAndCameraSystem) shopAndCameraSystem.toggleStoreModal(false);
        if (mmoSystem) {
          mmoSystem.closeNpcQuestDialog();
          mmoSystem.toggleCoopModal(false);
        }
      }
    });

    window.addEventListener('wheel', (e) => {
      if (renderer.xr.isPresenting) return;
      if (Math.abs(e.deltaY) < 4) return;
      cycleUnlockedWeapon(e.deltaY > 0 ? 1 : -1);
    }, { passive: true });

    window.addEventListener('keyup', (e) => {
      pcKeys[e.code] = false;
    });

    window.addEventListener('blur', () => {
      Object.keys(pcKeys).forEach((code) => {
        pcKeys[code] = false;
      });
    });

