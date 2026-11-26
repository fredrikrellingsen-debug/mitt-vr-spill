    // =========================================================================
    // 8. DAG/NATTSYKLUS, HELSE, SKADE OG ATMOSFÆRE
    // =========================================================================
    const DAY_DURATION = 90;
    const NIGHT_DURATION = 60;
    const FULL_DAY_CYCLE = DAY_DURATION + NIGHT_DURATION;
    const FOREST_BOUNDS = { minX: -58, maxX: 58, minZ: -145, maxZ: -28 };

    let cycleTime = 0;
    let isNight = false;
    let nightAmount = 0;
    let worldTime = 0;
    let gunshotAlertTimer = 0;
    let playerInvulnerableTimer = 0;
    let damageVignetteTimer = 0;
    let lastVRDayNightToggle = 0;
    let pcPitch = 0;
    const MAX_LOOK_PITCH = 1.18; // +-67.6 grader så man kan sikte høyt (gribber/balkonger) og lavt (ulver/kasser)

    // Pre-allokerte hjelpeobjekter for animasjonsløkken. Løkken skal ikke
    // opprette nye Vector3/Matrix4/Raycaster-objekter (GC-hakking på Quest).
    const lastGunshotPosition = new THREE.Vector3();
    const playerHeadPosition = new THREE.Vector3();
    const playerChestPosition = new THREE.Vector3();
    const combatCenter = new THREE.Vector3();
    const nightBurnStartPosition = new THREE.Vector3();
    const nightDeathImpactPosition = new THREE.Vector3();
    const nightBurnImpactPosition = new THREE.Vector3();
    const nightAttackImpactPosition = new THREE.Vector3();
    const nightRespawnPosition = new THREE.Vector3();
    const nightSpawnPosition = new THREE.Vector3();
    const combatHitResult = { type: '', entity: null, point: new THREE.Vector3() };
    let combatHitFound = false;
    let combatHitBestDistance = Infinity;

    const daySkyColor = new THREE.Color(0xcfa884);
    const nightSkyColor = new THREE.Color(0x060b16);
    const fallbackBgColor = new THREE.Color(0xcfa884);
    const dayFogColor = new THREE.Color(0xcfb193);
    const nightFogColor = new THREE.Color(0x060b16);
    const dayHemiSkyColor = new THREE.Color(0xffd8ad);
    const nightHemiSkyColor = new THREE.Color(0x3b5284);
    const dayHemiGroundColor = new THREE.Color(0x4c4778);
    const nightHemiGroundColor = new THREE.Color(0x161428);
    const daySunColor = new THREE.Color(0xffb86b);
    const nightSunColor = new THREE.Color(0x8db2ff);
    const bloodSunColor = new THREE.Color(0xff5258);
    const dayRimColor = new THREE.Color(0xffbe73);
    const nightRimColor = new THREE.Color(0x7db2ff);
    const bloodRimColor = new THREE.Color(0xff3d52);
    const activeLightDir = new THREE.Vector3(0.45, 0.25, -0.85);

    // --- 8a. Sol, måne med glorie og stjernehimmel ---
    sunMesh.material.transparent = true;
    sunMesh.material.opacity = 0.92;

    // Myk radial glorie-tekstur delt mellom måneglorie, nattøyne og svevende partikler
    const lanterns = [saloonLantern, tailorLantern, gunsmithLantern].filter(Boolean);
    const dayWindowColor = new THREE.Color(0x5a6e7e);
    const nightWindowColor = new THREE.Color(0xffcf6e);

    let baseLanternIntensity = 0.45;
    let baseSafeLanternIntensity = 1.85;
    let baseCampfireIntensity = 2.4;

    const bloodSkyColor = new THREE.Color(0x28080e);
    const bloodFogColor = new THREE.Color(0x3a0c14);
    let currentBloodMoonBlend = 0;
    let bossEnemyRef = null;

    function applyDayNightLighting(amount) {
      const night = THREE.MathUtils.clamp(amount, 0, 1);
      const isBloodMoonStage = storyState.currentLevel === 8 || (bossEnemyRef && bossEnemyRef.alive);
      currentBloodMoonBlend = isBloodMoonStage ? night : 0;
      const hasHDRI = !!(hdrState && hdrState.hasRealHDRI);

      if (hasHDRI) {
        sky.visible = false;
        sunMesh.visible = false;
        const useNightHDR = night > 0.55;
        scene.environment = useNightHDR ? (hdrState.nightEnvTex || hdrState.dayEnvTex) : hdrState.dayEnvTex;
        scene.background = useNightHDR ? (hdrState.nightBgTex || hdrState.dayBgTex) : hdrState.dayBgTex;
        scene.environmentIntensity = THREE.MathUtils.lerp(1.12, 0.44, night);
        const bgInt = THREE.MathUtils.lerp(0.96, 0.065, night);
        scene.backgroundIntensity = currentBloodMoonBlend > 0.01 ? bgInt * 0.65 : bgInt;
      } else {
        // Fallback til syntetisk Sky-shader og PMREM dersom .hdr-filene ikke ble lastet
        sky.visible = true;
        applySkyShaderParams(sky, night, skySunVec);
        sky.material.opacity = 1;
        scene.environment = night > 0.55 ? nightEnvRT.texture : dayEnvRT.texture;
        scene.environmentIntensity = THREE.MathUtils.lerp(0.95, 0.45, night);
        fallbackBgColor.copy(daySkyColor).lerp(nightSkyColor, night);
        if (currentBloodMoonBlend > 0.01) {
          fallbackBgColor.lerp(bloodSkyColor, currentBloodMoonBlend * 0.72);
        }
        scene.background = fallbackBgColor;
        sunMesh.position.copy(skySunVec).multiplyScalar(225);
        sunMesh.material.opacity = Math.max(0, 1 - night * 1.35) * 0.9;
        sunMesh.visible = night < 0.75;
      }

      renderer.toneMappingExposure = THREE.MathUtils.lerp(1.08, 0.94, night);

      // Varm gyllen horisontdis om dagen og dyp, tett blåsvart nattetåke om natten
      scene.fog.color.copy(dayFogColor).lerp(nightFogColor, night);
      if (currentBloodMoonBlend > 0.01) {
        scene.fog.color.lerp(bloodFogColor, currentBloodMoonBlend * 0.78);
      }
      scene.fog.near = THREE.MathUtils.lerp(68, 18, night);
      scene.fog.far = THREE.MathUtils.lerp(395, 145, night);

      // Kinematisk Golden Hour-lys med kjølige blå-lilla skygger (HemisphereLight)
      hemiLight.color.copy(dayHemiSkyColor).lerp(nightHemiSkyColor, night);
      hemiLight.groundColor.copy(dayHemiGroundColor).lerp(nightHemiGroundColor, night);
      if (currentBloodMoonBlend > 0.01) {
        hemiLight.color.lerp(bloodFogColor, currentBloodMoonBlend * 0.55);
      }
      hemiLight.intensity = THREE.MathUtils.lerp(0.86, 0.42, night);

      sunLight.color.copy(daySunColor).lerp(nightSunColor, night);
      if (currentBloodMoonBlend > 0.01) {
        sunLight.color.lerp(bloodSunColor, currentBloodMoonBlend * 0.65);
      }
      sunLight.intensity = THREE.MathUtils.lerp(2.25, 0.62, night);

      if (hasHDRI) {
        activeLightDir.copy(night < 0.55 ? hdrState.daySunDir : hdrState.nightMoonDir);
      } else if (night < 0.85) {
        activeLightDir.set(skySunVec.x, Math.max(0.22, skySunVec.y), skySunVec.z).normalize();
      } else {
        activeLightDir.set(-0.46, 0.54, -0.70).normalize();
      }

      // Hold 2048x2048 skyggekameraet snappet rundt spilleren (0 objektallokeringer, sylskarpe skygger over hele verdenen)
      const sx = Math.round(playerRig.position.x);
      const sz = Math.round(playerRig.position.z);
      sunLight.target.position.set(sx, 0, sz);
      sunLight.target.updateMatrixWorld();
      sunLight.position.set(
        sx + activeLightDir.x * 88,
        Math.max(18, activeLightDir.y * 88),
        sz + activeLightDir.z * 88
      );

      // Subtilt Fresnel rim-light på karakterer, fiender og dyr slik at silhuetter trer frem i mørket
      if (rimUniforms) {
        rimUniforms.uRimColor.value.copy(dayRimColor).lerp(nightRimColor, night);
        if (currentBloodMoonBlend > 0.01) {
          rimUniforms.uRimColor.value.lerp(bloodRimColor, currentBloodMoonBlend * 0.72);
        }
        rimUniforms.uRimStrength.value = THREE.MathUtils.lerp(0.11, 0.36, night);
      }

      moonMesh.material.opacity = night;
      moonHaloMat.opacity = night * 0.56;
      moonGroup.visible = night > 0.02;
      if (updateBloodMoonVisuals) updateBloodMoonVisuals(currentBloodMoonBlend);
      if (updateGodRays) updateGodRays(night, currentBloodMoonBlend);

      starMat.opacity = Math.max(0, (night - 0.18) / 0.82) * (hasHDRI ? 0.58 : 0.95);
      stars.visible = night > 0.18;

      // Vinduer reflekterer HDRI-himmelen om dagen og gløder varmt innenfra om natten
      windowMat.color.copy(dayWindowColor).lerp(nightWindowColor, night);
      windowMat.emissiveIntensity = THREE.MathUtils.lerp(0.14, 2.05, night);

      lanternGlassMat.opacity = 0.62 + 0.38 * night;
      lanternGlowMat.opacity = 0.22 + night * 0.76;
      baseLanternIntensity = 0.45 + night * 9.5;
      baseSafeLanternIntensity = 1.85 + night * 6.8;
      baseCampfireIntensity = 2.4 + night * 6.4;
    }

    // Naturlig flakkende lys på lykter og leirbål (kun skalarmatematikk i animasjonsløkken)
    function updateFlickeringLights(t) {
      const f1 = 1.0 + Math.sin(t * 7.3) * 0.07 + Math.sin(t * 17.9) * 0.04;
      const f2 = 1.0 + Math.sin(t * 8.1 + 1.9) * 0.07 + Math.cos(t * 19.3) * 0.04;
      const f3 = 1.0 + Math.sin(t * 7.7 + 3.4) * 0.07 + Math.sin(t * 16.4) * 0.04;
      saloonLantern.light.intensity = baseLanternIntensity * f1;
      tailorLantern.light.intensity = baseLanternIntensity * f2;
      if (gunsmithLantern && gunsmithLantern.light) {
        gunsmithLantern.light.intensity = baseLanternIntensity * f3;
      }
      safeHouseLantern.light.intensity = baseSafeLanternIntensity * (0.97 + Math.sin(t * 6.4 + 0.7) * 0.05);

      const fireFlicker = 1.0 + Math.sin(t * 11.4) * 0.14 + Math.cos(t * 23.7) * 0.08;
      if (campfireLight) {
        campfireLight.intensity = baseCampfireIntensity * fireFlicker;
      }
      if (campfireEmberMat) {
        campfireEmberMat.emissiveIntensity = 1.1 + Math.sin(t * 5.5) * 0.28 + nightAmount * 0.45;
      }
      for (let i = 0; i < campfireFlameMeshes.length; i++) {
        const fl = campfireFlameMeshes[i];
        const ph = fl.userData.phase;
        const sY = 0.86 + Math.sin(t * 12.5 + ph) * 0.22 + Math.cos(t * 21.0 + ph) * 0.1;
        const sXZ = 0.92 + Math.cos(t * 10.2 + ph) * 0.1;
        fl.scale.set(sXZ, sY, sXZ);
        fl.position.y = fl.userData.baseH * (0.9 + 0.1 * sY);
        fl.rotation.z = Math.sin(t * 8.6 + ph) * 0.12;
      }
    }

    let onNightStateChangedBossHook = null;

    // --- 8c. Tidssyklus og bytte mellom dag og natt ---
    function setTimeOfDay(night, immediate = false) {
      if (isNight === night) return;
      isNight = night;
      isNightStateFlag = night;
      if (immediate) nightAmount = night ? 1 : 0;
      updateStatusUI();

      if (night) {
        for (const deer of deerList) deer.group.visible = false;
        for (const bandit of banditList) {
          if (bandit.isForemanSlade || bandit.isGeneralCortez || bandit.isBrimstoneMarshal) continue;
          bandit.active = false;
          bandit.group.visible = false;
        }
        spawnNightEnemies();
      } else {
        startNightEnemiesBurning();
        resetBanditsForDay();
        for (const deer of deerList) {
          deer.group.visible = deer.alive;
        }
      }
      if (onNightStateChangedBossHook) onNightStateChangedBossHook(night);

      applyDayNightLighting(nightAmount);
    }

    function toggleDayNight() {
      if (isNight) {
        cycleTime = 0;
        setTimeOfDay(false, true);
      } else {
        cycleTime = DAY_DURATION;
        setTimeOfDay(true, true);
      }
    }

    forceNightForBloodMoonHook = () => {
      if (!isNight) {
        cycleTime = DAY_DURATION;
        setTimeOfDay(true, true);
      } else {
        applyDayNightLighting(nightAmount);
      }
    };

    function updateDayNight(dt) {
      cycleTime += dt;
      if (cycleTime >= FULL_DAY_CYCLE) cycleTime -= FULL_DAY_CYCLE;

      const shouldBeNight = cycleTime >= DAY_DURATION;
      if (shouldBeNight !== isNight) setTimeOfDay(shouldBeNight, false);

      const target = isNight ? 1 : 0;
      nightAmount += (target - nightAmount) * (1 - Math.exp(-dt / 2.2));
      applyDayNightLighting(nightAmount);
    }

    function notifyGunshot(position) {
      lastGunshotPosition.copy(position);
      gunshotAlertTimer = 0.6;
    }

    // --- Mat-spising (+35 HP), Skredder-, Våpensmed- og Sheriff-interaksjon (innenfor 6 meter) ---
    function tryEatFood() {
      const effMax = playerState.maxHealth + (mmoSystem ? mmoSystem.getBonusMaxHp() : 0);
      if (playerState.food <= 0 || playerState.health >= effMax) return false;
      playerState.food -= 1;
      playerState.health = Math.min(effMax, playerState.health + 35);
      saveCareerProgress();
      updateStatusUI();
      playHealSound();
      return true;
    }

    const uiRaycaster = new THREE.Raycaster();
    uiRaycaster.near = 0.01;
    uiRaycaster.far = 30;
    const uiTempMatrix = new THREE.Matrix4();
    const uiPointerNDC = new THREE.Vector2();
    const tailorCounterWorldPos = new THREE.Vector3();
    const gunsmithCounterWorldPos = new THREE.Vector3();
    const homesteadCounterWorldPos = new THREE.Vector3();
    const saloonQuestWorldPos = new THREE.Vector3();
    const sheriffWorldPos = new THREE.Vector3();
    const playerCheckWorldPos = new THREE.Vector3();
    const bottleCheckWorldPos = new THREE.Vector3();
    const bottleRayOffset = new THREE.Vector3();

    function isPlayerNearTailorCounter(maxRange = 12.5) {
      if (!tailorCounterMesh) return false;
      tailorCounterMesh.getWorldPosition(tailorCounterWorldPos);
      camera.getWorldPosition(playerCheckWorldPos);
      const camDist = Math.hypot(
        playerCheckWorldPos.x - tailorCounterWorldPos.x,
        playerCheckWorldPos.z - tailorCounterWorldPos.z
      );
      const rigDist = Math.hypot(
        playerRig.position.x - tailorCounterWorldPos.x,
        playerRig.position.z - tailorCounterWorldPos.z
      );
      return Math.min(camDist, rigDist) <= maxRange;
    }

    function isPlayerNearGunsmithCounter(maxRange = 12.5) {
      if (!gunsmithCounterMesh) return false;
      gunsmithCounterMesh.getWorldPosition(gunsmithCounterWorldPos);
      camera.getWorldPosition(playerCheckWorldPos);
      const camDist = Math.hypot(
        playerCheckWorldPos.x - gunsmithCounterWorldPos.x,
        playerCheckWorldPos.z - gunsmithCounterWorldPos.z
      );
      const rigDist = Math.hypot(
        playerRig.position.x - gunsmithCounterWorldPos.x,
        playerRig.position.z - gunsmithCounterWorldPos.z
      );
      return Math.min(camDist, rigDist) <= maxRange;
    }

    function isPlayerNearHomesteadCounter(maxRange = 12.5) {
      if (!homesteadCounterMesh) return false;
      homesteadCounterMesh.getWorldPosition(homesteadCounterWorldPos);
      camera.getWorldPosition(playerCheckWorldPos);
      const camDist = Math.hypot(
        playerCheckWorldPos.x - homesteadCounterWorldPos.x,
        playerCheckWorldPos.z - homesteadCounterWorldPos.z
      );
      const rigDist = Math.hypot(
        playerRig.position.x - homesteadCounterWorldPos.x,
        playerRig.position.z - homesteadCounterWorldPos.z
      );
      return Math.min(camDist, rigDist) <= maxRange;
    }

    function isPlayerNearSaloonQuestBoard(maxRange = 12.5) {
      if (!saloonQuestAnchorMesh) return false;
      saloonQuestAnchorMesh.getWorldPosition(saloonQuestWorldPos);
      camera.getWorldPosition(playerCheckWorldPos);
      const camDist = Math.hypot(
        playerCheckWorldPos.x - saloonQuestWorldPos.x,
        playerCheckWorldPos.z - saloonQuestWorldPos.z
      );
      const rigDist = Math.hypot(
        playerRig.position.x - saloonQuestWorldPos.x,
        playerRig.position.z - saloonQuestWorldPos.z
      );
      return Math.min(camDist, rigDist) <= maxRange;
    }

    function isPlayerNearSheriff() {
      if (!sheriffVanceGroup) return false;
      sheriffVanceGroup.getWorldPosition(sheriffWorldPos);
      camera.getWorldPosition(playerCheckWorldPos);
      const camDist = Math.hypot(
        playerCheckWorldPos.x - sheriffWorldPos.x,
        playerCheckWorldPos.z - sheriffWorldPos.z
      );
      const rigDist = Math.hypot(
        playerRig.position.x - sheriffWorldPos.x,
        playerRig.position.z - sheriffWorldPos.z
      );
      return Math.min(camDist, rigDist) <= 6.5;
    }

    let lastDoorToggleMs = 0;

    function toggleSafeHouseDoor() {
      const nowMs = performance.now();
      if (nowMs - lastDoorToggleMs < 180) return;
      lastDoorToggleMs = nowMs;
      safeHouseDoorOpen = !safeHouseDoorOpen;
      playDoorToggleSound(safeHouseDoorOpen);
    }

    function isPlayerNearSafeHouseDoor(maxDist = 7.5) {
      camera.getWorldPosition(playerCheckWorldPos);
      const camDist = Math.hypot(
        playerCheckWorldPos.x - safeHouseDoorwayWorld.x,
        playerCheckWorldPos.z - safeHouseDoorwayWorld.z
      );
      const rigDist = Math.hypot(
        playerRig.position.x - safeHouseDoorwayWorld.x,
        playerRig.position.z - safeHouseDoorwayWorld.z
      );
      return isPlayerInHidingZone() || Math.min(camDist, rigDist) <= maxDist;
    }

    function tryKeyFSafeHouseDoor() {
      if (shopAndCameraSystem && shopAndCameraSystem.getNearbyShopTab()) {
        shopAndCameraSystem.toggleStoreModal(true, shopAndCameraSystem.getNearbyShopTab());
        return;
      }
      if (frontierExpansion) {
        const nearOuter = frontierExpansion.getNearbyOuterTownShop();
        if (nearOuter && shopAndCameraSystem) {
          shopAndCameraSystem.toggleStoreModal(true, nearOuter.tab || 'armor');
          return;
        }
      }
      if (isPlayerNearSafeHouseDoor(14.0)) {
        toggleSafeHouseDoor();
      }
    }

    function isPracticeBottleCloserOnRay(ray, boardHitDistance) {
      for (const bottle of practiceBottles) {
        if (bottle.userData.knocked) continue;
        bottle.getWorldPosition(bottleCheckWorldPos);
        const distAlong = bottleRayOffset.copy(bottleCheckWorldPos).sub(ray.origin).dot(ray.direction);
        if (distAlong > 0 && distAlong < boardHitDistance) {
          const perpDist = ray.distanceToPoint(bottleCheckWorldPos);
          if (perpDist < 0.16) return true;
        }
      }
      return false;
    }

    function setQuestBoardFeedback(messageKey, isSuccess, duration = 3.2, arg = null) {
      questBoardMessageKey = messageKey;
      questBoardMessageArg = arg;
      questBoardMessageSuccess = isSuccess;
      questBoardTimer = duration;
      updateSaloonQuestBoardUI();
    }

    function ensureQuestTargetsAvailable(quest) {
      if (!quest) return;
      const t = quest.targetType;

      if (t === 'bottle' && playerState.targets > 0) {
        resetTargets();
      }

      if (
        t === 'bandit_any' || t === 'train_sniper' || t === 'fort_bandit' ||
        t === 'cortez' || t === 'marshal' || t === 'mine_action' ||
        t === 'caldera_foe' || t === 'el_fuego' || t === 'observatory_foe' || t === 'blackfeather' ||
        t === 'elite_foe' || t === 'any_boss' || t === 'combat_any' || t === 'brimstone_foe'
      ) {
        if (typeof banditList !== 'undefined' && Array.isArray(banditList)) {
          for (let i = 0; i < banditList.length; i++) {
            const b = banditList[i];
            if (!b.alive && (!b.respawnTimer || b.respawnTimer > 3.5)) {
              b.respawnTimer = 2.5;
            }
          }
        }
      }

      if (
        t === 'deer_any' || t === 'white_stag' || t === 'wolf' || t === 'cougar' ||
        t === 'alpha_wolf' || t === 'hellhound' || t === 'grizzly' || t === 'goliath' || t === 'bison' ||
        t === 'wild_beast' || t === 'apex_predator' || t === 'caldera_foe'
      ) {
        if (typeof deerList !== 'undefined' && Array.isArray(deerList)) {
          for (let i = 0; i < deerList.length; i++) {
            const d = deerList[i];
            if (!d.alive && (!d.respawnTimer || d.respawnTimer > 3.5)) d.respawnTimer = 2.5;
          }
        }
        if (typeof wolfList !== 'undefined' && Array.isArray(wolfList)) {
          for (let i = 0; i < wolfList.length; i++) {
            const w = wolfList[i];
            if (!w.alive && (!w.respawnTimer || w.respawnTimer > 3.5)) w.respawnTimer = 2.5;
          }
        }
        if (typeof bearList !== 'undefined' && Array.isArray(bearList)) {
          for (let i = 0; i < bearList.length; i++) {
            const br = bearList[i];
            if (!br.alive && (!br.respawnTimer || br.respawnTimer > 3.5)) br.respawnTimer = 2.5;
          }
        }
      }

      if (
        t === 'night_any' || t === 'vampire_or_catacomb' || t === 'catacomb_guardian' ||
        t === 'wendigo' || t === 'oasis_foe' || t === 'sandwraith' ||
        t === 'brimstone_foe' || t === 'elite_foe' || t === 'combat_any'
      ) {
        if (typeof nightEnemies !== 'undefined' && Array.isArray(nightEnemies)) {
          for (let i = 0; i < nightEnemies.length; i++) {
            const ne = nightEnemies[i];
            if (!ne.alive && (!ne.respawnTimer || ne.respawnTimer > 3.5)) ne.respawnTimer = 2.5;
          }
        }
      }

      if ((t === 'gold_pickup' || t === 'treasure_any' || t === 'mine_action') && goldPickups) {
        for (let i = 0; i < goldPickups.length; i++) {
          const gp = goldPickups[i];
          if (gp.collected && gp.respawnTimer > 1.5) gp.respawnTimer = 1.0;
        }
      }

      const respawnPickupMap = [
        ['moonstone', moonstoneTotems],
        ['strongbox', fortStrongboxes],
        ['sun_rune', ancientRunes],
        ['oasis_idol', oasisIdols],
        ['mill_crate', millCrates],
        ['meteor_core', meteorCores],
        ['star_shard', starShards]
      ];
      for (let rIdx = 0; rIdx < respawnPickupMap.length; rIdx++) {
        const [kindKey, arr] = respawnPickupMap[rIdx];
        if ((t === kindKey || t === 'treasure_any') && arr) {
          for (let i = 0; i < arr.length; i++) {
            const item = arr[i];
            if (item.collected) {
              item.collected = false;
              item.respawnTimer = 0;
              item.group.visible = true;
            }
          }
        }
      }
      if (t === 'brimstone_totem' && brimstoneTotems) {
        for (let i = 0; i < brimstoneTotems.length; i++) {
          const bt = brimstoneTotems[i];
          if (bt.destroyed) {
            bt.destroyed = false;
            bt.hp = bt.maxHp || 3;
            bt.respawnTimer = 0;
            bt.group.visible = true;
          }
        }
      }
      if ((t === 'silver_relic' || t === 'treasure_any') && respawnSilverRelicsHook) {
        respawnSilverRelicsHook();
      }
      if (t === 'mine_action' && respawnMineBarricadesHook) {
        respawnMineBarricadesHook();
      }
    }

    function selectSaloonQuestSlot(slotIndex) {
      if (typeof slotIndex !== 'number' || slotIndex < 0 || slotIndex >= questBoardSlots.length) return;

      // Hvis plassen fortsatt viser «✓ FULLFØRT!»-feiringen, fjern den med én gang og åpne det nye oppdraget!
      if (slotCompletedFlash[slotIndex]) {
        slotCompletedFlash[slotIndex] = null;
      }
      hudCompletedBanner = null;

      const seq = questBoardSlots[slotIndex];
      const quest = getQuestBySeq(seq, storyState.prestigeRank || 0);

      if (activeQuest && activeQuest.seq === seq) {
        setQuestBoardFeedback('active_now', true, 3.0, activeQuest);
        updateStatusUI();
        playQuestSelectSound();
        return;
      }

      if (activeQuest && questProgress > 0) {
        questProgressMap[activeQuest.seq] = questProgress;
      }

      activeQuest = quest;
      activeQuestSeq = seq;
      questProgress = Math.min(quest.goal - 1, questProgressMap[seq] || 0);
      ensureQuestTargetsAvailable(quest);

      setQuestBoardFeedback('accepted', true, 3.2, quest);
      saveCareerProgress();
      updateSaloonQuestBoardUI();
      updateStatusUI();
      playQuestSelectSound();
    }

    function acceptOrCycleBoardQuest() {
      hudCompletedBanner = null;
      if (!activeQuest) {
        const bestSlot = getLowestOpenBoardSlotIndex();
        selectSaloonQuestSlot(bestSlot);
        return;
      }
      const curSlot = questBoardSlots.indexOf(activeQuest.seq);
      const nextSlot = curSlot >= 0 ? (curSlot + 1) % questBoardSlots.length : getLowestOpenBoardSlotIndex();
      selectSaloonQuestSlot(nextSlot);
    }

    if (questHudBarEl) {
      questHudBarEl.addEventListener('click', (e) => {
        e.stopPropagation();
        acceptOrCycleBoardQuest();
      });
    }

    function completeActiveQuest() {
      if (!activeQuest) return;
      const finished = activeQuest;
      const slotIdx = questBoardSlots.indexOf(finished.seq);

      const enFmt = formatQuestTexts(finished, 'en', { hasSheriffStar, hasGoldenRevolver });
      const noFmt = formatQuestTexts(finished, 'no', { hasSheriffStar, hasGoldenRevolver });

      awardScaledGold(finished.gold);
      if (finished.food > 0) playerState.food += finished.food;
      if (finished.pelts > 0) playerState.pelt += finished.pelts;
      if (finished.dynamite > 0) playerState.dynamite += finished.dynamite;

      if (finished.grantsSheriffStar) {
        hasSheriffStar = true;
        sheriffStarBadge.visible = true;
      }
      if (finished.grantsGoldRevolver) {
        weaponDamage = Math.max(weaponDamage, 2);
        if (!hasGoldenRevolver) {
          hasGoldenRevolver = true;
          upgradeRevolverToGold();
        } else {
          playerState.dynamite += 1;
        }
      }
      if (finished.fullHeal) {
        playerState.health = playerState.maxHealth;
      }

      if (!completedQuests.includes(finished.id)) {
        completedQuests.push(finished.id);
        if (completedQuests.length > 200) completedQuests.shift();
      }
      delete questProgressMap[finished.seq];
      storyState.totalBountiesDone = (storyState.totalBountiesDone || 0) + 1;

      // Bytt ut det fullførte oppdraget i plassen med neste nye oppdrag i den uendelige køen (#4, #5, #6 ...)
      const replacementSeq = nextQuestSeq++;
      if (slotIdx >= 0) {
        questBoardSlots[slotIdx] = replacementSeq;
        slotCompletedFlash[slotIdx] = {
          seq: finished.seq,
          enTitle: enFmt.title,
          noTitle: noFmt.title,
          rewardEn: enFmt.rewardSummary,
          rewardNo: noFmt.rewardSummary,
          timer: 2.8
        };
      }

      hudCompletedBanner = {
        seq: finished.seq,
        enTitle: enFmt.title,
        noTitle: noFmt.title,
        rewardEn: enFmt.rewardSummary,
        rewardNo: noFmt.rewardSummary,
        timer: 4.2
      };

      activeQuest = null;
      activeQuestSeq = 0;
      questProgress = 0;

      setQuestBoardFeedback('completed_toast', true, 4.2, {
        seq: finished.seq,
        enTitle: enFmt.title,
        noTitle: noFmt.title,
        rewardEn: enFmt.rewardSummary,
        rewardNo: noFmt.rewardSummary
      });

      checkStoryProgression();
      saveCareerProgress();
      updateSaloonQuestBoardUI();
      updateStatusUI();
      playQuestFanfare();
    }

    function recordSaloonQuestKillFromCoop(tagsArr) {
      if (!activeQuest || !Array.isArray(tagsArr)) return;
      if (!tagsArr.includes(activeQuest.targetType)) return;
      questProgress += 1;
      questProgressMap[activeQuest.seq] = questProgress;
      if (questProgress >= activeQuest.goal) {
        completeActiveQuest();
      } else {
        updateSaloonQuestBoardUI();
        updateStatusUI();
      }
    }

    function recordQuestKill(tagsInput) {
      if (mmoSystem) {
        mmoSystem.onCombatOrObjectiveEvent(tagsInput, false);
      }
      const isArr = Array.isArray(tagsInput);
      const isBeast = isArr
        ? (tagsInput.includes('wild_beast') || tagsInput.includes('deer'))
        : tagsInput === 'deer';
      const isFoe = isArr
        ? (tagsInput.includes('combat_any') || tagsInput.includes('bandit') || tagsInput.includes('night'))
        : (tagsInput === 'bandit' || tagsInput === 'night');

      if (isBeast && storyState.currentLevel >= 22) {
        storyState.s22Beasts = (storyState.s22Beasts || 0) + 1;
      }
      if (isArr && storyState.currentLevel === 50) {
        if (tagsInput.includes('malakor')) storyState.immortalFinaleMalakor = true;
        if (tagsInput.includes('wendigo_boss')) storyState.immortalFinaleWendigo = true;
      }

      // Oppdater også evige Prestisje-kapitler (Kapittel 51+) ved hvert nedlagte vilt/fiende!
      if (storyState.currentLevel >= 51) {
        if (isBeast) {
          storyState.prestigeBeasts = (storyState.prestigeBeasts || 0) + 1;
        } else if (isFoe) {
          storyState.prestigeFoes = (storyState.prestigeFoes || 0) + 1;
        }
      }

      if (!activeQuest) return;
      const matches = isArr
        ? tagsInput.includes(activeQuest.targetType)
        : activeQuest.targetType === tagsInput;
      if (!matches) return;

      questProgress += 1;
      questProgressMap[activeQuest.seq] = questProgress;

      if (questProgress >= activeQuest.goal) {
        completeActiveQuest();
      } else {
        updateSaloonQuestBoardUI();
        updateStatusUI();
      }
    }

    function setTailorFeedback(messageKey, isSuccess, duration = 3.0) {
      tailorStatusMessageKey = messageKey;
      tailorStatusIsSuccess = isSuccess;
      tailorStatusTimer = duration;
      updateTailorWorkshopUI();
    }

    function purchaseTailorOutfit(outfit) {
      if (!outfit) return;

      // Sluttspill-modus hos Skredderen når Vampyrjeger-rustning (Tier 4) allerede er låst opp!
      if (currentOutfitTier >= 4) {
        if (outfit.level === 1) {
          if (currentOutfitTier >= 6) {
            setTailorFeedback('same', false, 3.0);
            playShopDenySound();
            return;
          }
          if (shopAndCameraSystem) {
            const res = shopAndCameraSystem.buyOrEquipArmorTier(6, true);
            if (res.ok) {
              setTailorFeedback('crafted', true, 3.2);
            } else {
              setTailorFeedback('no_pelts', false, 3.0);
            }
            return;
          }
        }
        if (outfit.level === 2) {
          if (playerState.maxHealth >= 500) {
            setTailorFeedback('same', false, 3.0);
            playShopDenySound();
            return;
          }
          if (shopAndCameraSystem && shopAndCameraSystem.buyArmorPaddingUpgrade()) {
            setTailorFeedback('hp_up', true, 3.2);
            return;
          }
          const hpCost = 5 + armorPaddingRanks * 3;
          if (playerState.pelt < hpCost) {
            setTailorFeedback('no_pelts', false, 3.0);
            playShopDenySound();
            return;
          }
          playerState.pelt -= hpCost;
          armorPaddingRanks += 1;
          playerState.maxHealth = Math.min(500, playerState.maxHealth + 20);
          playerState.health = playerState.maxHealth;
          storyState.masterUpgradeBought = true;
          setTailorFeedback('hp_up', true, 3.2);
          checkStoryProgression();
          saveCareerProgress();
          updateStatusUI();
          playUpgradeSound();
          return;
        }
        // Slot 3: Røkt Viltproviant (15 Gull eller 2 Skinn -> +4 Mat & Full Helse)
        if (playerState.gold >= 15) {
          playerState.gold -= 15;
        } else if (playerState.pelt >= 2) {
          playerState.pelt -= 2;
        } else {
          setTailorFeedback('no_pelts', false, 3.0);
          playShopDenySound();
          return;
        }
        playerState.food += 4;
        playerState.health = playerState.maxHealth;
        setTailorFeedback('rations', true, 3.0);
        saveCareerProgress();
        updateStatusUI();
        playHealSound();
        return;
      }

      const targetTier = outfit.tier || outfit.level;
      if (currentOutfitTier >= targetTier) {
        const key = currentOutfitTier === targetTier ? 'same' : 'better';
        setTailorFeedback(key, false, 3.0);
        playShopDenySound();
        return;
      }

      if (shopAndCameraSystem) {
        const res = shopAndCameraSystem.buyOrEquipArmorTier(targetTier, true);
        if (res.ok) {
          setTailorFeedback('crafted', true, 3.0);
        } else {
          setTailorFeedback('no_pelts', false, 3.0);
        }
        return;
      }
    }

    function setGunsmithFeedback(key, isSuccess, duration = 3.2, arg = null) {
      gunsmithStatusKey = key;
      gunsmithStatusArg = arg;
      gunsmithStatusSuccess = isSuccess;
      gunsmithStatusTimer = duration;
      updateGunsmithUI();
    }

    function purchaseGunsmithItem(item) {
      if (!item) return;

      // Når Hellfire Repeater er låst opp, fungerer Slot 5 som repeterbar Våpenmestring (+20 % skade per nivå!)
      if (item.id === 'hellfire' && unlockedWeapons.hellfire) {
        const masteryCost = 90 + weaponMasteryRank * 45;
        if (playerState.gold < masteryCost) {
          setGunsmithFeedback('no_gold', false, 3.2);
          playShopDenySound();
          return;
        }
        playerState.gold -= masteryCost;
        weaponMasteryRank += 1;
        storyState.masterUpgradeBought = true;
        setGunsmithFeedback('mastery_up', true, 3.5);
        checkStoryProgression();
        saveCareerProgress();
        updateStatusUI();
        playUpgradeSound();
        return;
      }

      if (item.type === 'weapon') {
        if (unlockedWeapons[item.weaponId]) {
          equipWeapon(item.weaponId);
          setGunsmithFeedback('owned', true, 3.0, item.weaponId);
          return;
        }
        const canBuyDiscount =
          (!item.minLevel || storyState.currentLevel >= item.minLevel) &&
          playerState.gold >= item.goldCost &&
          playerState.pelt >= item.peltCost;
        const canBuyPureGold = !!(item.pureGoldCost && playerState.gold >= item.pureGoldCost);

        if (!canBuyDiscount && !canBuyPureGold) {
          if (item.minLevel && storyState.currentLevel < item.minLevel && (!item.pureGoldCost || playerState.gold < item.pureGoldCost)) {
            setGunsmithFeedback('no_gold', false, 3.2);
          } else if (playerState.gold < item.goldCost) {
            setGunsmithFeedback('no_gold', false, 3.2);
          } else {
            setGunsmithFeedback('no_pelts', false, 3.2);
          }
          playShopDenySound();
          return;
        }
        if (canBuyDiscount) {
          playerState.gold -= item.goldCost;
          playerState.pelt -= item.peltCost;
        } else {
          playerState.gold -= item.pureGoldCost;
        }
        unlockedWeapons[item.weaponId] = true;
        storyState.boughtGear = true;
        if (item.weaponId === 'crossbow') {
          storyState.hasVampireGear = true;
        }
        if (item.weaponId === 'hellfire') {
          storyState.hellfireCollected = true;
          if (hellfirePickup) {
            hellfirePickup.collected = true;
            hellfirePickup.group.visible = false;
          }
        }
        equipWeapon(item.weaponId, true);
        setGunsmithFeedback('bought_weapon', true, 3.5, item.weaponId);
        checkStoryProgression();
        saveCareerProgress();
        updateStatusUI();
        playUpgradeSound();
        return;
      }

      // 3x Dynamitt-pakke
      if (playerState.gold < item.goldCost) {
        setGunsmithFeedback('no_gold', false, 3.2);
        playShopDenySound();
        return;
      }
      playerState.gold -= item.goldCost;
      playerState.dynamite += item.amount;
      storyState.boughtGear = true;
      setGunsmithFeedback('bought_dynamite', true, 3.2);
      checkStoryProgression();
      saveCareerProgress();
      updateStatusUI();
      playUpgradeSound();
    }

    function setHomesteadFeedback(key, isSuccess, duration = 3.2, arg = null) {
      homesteadStatusKey = key;
      homesteadStatusArg = arg;
      homesteadStatusSuccess = isSuccess;
      homesteadStatusTimer = duration;
      updateHomesteadUI();
    }

    function purchaseHomesteadUpgrade(slotDef) {
      if (!slotDef) return false;
      const { lv, goldCost, peltCost } = getHomesteadSlotCost(slotDef);
      if (lv >= slotDef.maxLv) {
        setHomesteadFeedback('maxed', false, 3.0);
        playShopDenySound();
        return false;
      }
      if (playerState.gold < goldCost || playerState.pelt < peltCost) {
        setHomesteadFeedback('no_res', false, 3.2);
        playShopDenySound();
        return false;
      }
      playerState.gold -= goldCost;
      playerState.pelt -= peltCost;
      homesteadRanks[slotDef.key] = lv + 1;
      storyState.boughtGear = true;
      if (slotDef.key === 'trailblazer') {
        playerState.maxHealth = Math.min(600, playerState.maxHealth + 10);
        playerState.health = Math.min(playerState.maxHealth, playerState.health + 20);
      } else if (slotDef.key === 'warhound' && lv === 0) {
        if (playHorseWhistleSound) playHorseWhistleSound();
      }
      syncHomesteadStoryCounters();
      setHomesteadFeedback('bought', true, 3.4, {
        enName: slotDef.enName,
        noName: slotDef.noName,
        lv: lv + 1
      });
      checkStoryProgression();
      saveCareerProgress();
      updateStatusUI();
      playUpgradeSound();
      return true;
    }

    function talkToSheriffVance() {
      storyState.talkedSheriff = true;
      playQuestSelectSound();
      checkStoryProgression();
      updateStatusUI();
    }

    function collectMineMapPickup() {
      if (!mineMapPickup || mineMapPickup.collected) return false;
      mineMapPickup.collected = true;
      mineMapPickup.group.visible = false;
      storyState.mineMapCollected = true;
      storyState.mineGoldCollected = true;
      playerState.gold += 30;
      if (playRelicPickupSound) playRelicPickupSound();
      else playGoldPickupSound();
      spawnSparkBurst(mineMapPickup.worldPos, 16, 0xffe066, 1.35);
      recordQuestKill(['mine_action', 'treasure_any']);
      checkStoryProgression();
      updateStatusUI();
      return true;
    }

    function collectHellfirePickup() {
      if (!hellfirePickup || hellfirePickup.collected) return false;
      hellfirePickup.collected = true;
      if (hellfirePickup.orb) hellfirePickup.orb.visible = false;
      if (hellfirePickup.halo) hellfirePickup.halo.visible = false;
      unlockedWeapons.hellfire = true;
      storyState.hellfireCollected = true;
      storyState.hasVampireGear = true;
      playerState.gold += 50;
      equipWeapon('hellfire', true);
      if (playRelicPickupSound) playRelicPickupSound();
      else playUpgradeSound();
      spawnSparkBurst(hellfirePickup.worldPos, 22, 0x74d4ff, 1.55);
      checkStoryProgression();
      updateStatusUI();
      return true;
    }

    function tryCaptureTrainGatling() {
      if (storyState.trainGatlingCaptured) return false;
      storyState.trainGatlingCaptured = true;
      playerState.gold += 45;
      if (gatlingHalo && gatlingHalo.material) {
        gatlingHalo.material.color.setHex(0x68f088);
      }
      if (playRelicPickupSound) playRelicPickupSound();
      else playUpgradeSound();
      checkStoryProgression();
      updateStatusUI();
      return true;
    }

    let horseEntityRef = null;
    let silverRelicHitMeshesRef = null;
    let collectSilverRelicHook = null;

    function isNearRideableHorse() {
      if (!horseEntityRef) return false;
      const hx = horseEntityRef.group.position.x;
      const hz = horseEntityRef.group.position.z;
      return Math.hypot(playerRig.position.x - hx, playerRig.position.z - hz) <= 4.0 &&
        Math.abs(playerRig.position.y - horseEntityRef.group.position.y) <= 2.5;
    }

    function toggleHorseMount() {
      if (isRidingHorse) {
        isRidingHorse = false;
        const gY = getTerrainHeight(playerRig.position.x, playerRig.position.z, playerRig.position.y - 1.15);
        playerRig.position.y = gY;
        if (horseEntityRef) {
          const yaw = playerRig.rotation.y;
          const hx = playerRig.position.x + Math.cos(yaw) * 1.25;
          const hz = playerRig.position.z - Math.sin(yaw) * 1.25;
          horseEntityRef.group.position.set(hx, getTerrainHeight(hx, hz, gY), hz);
          resolveWallCollisions(horseEntityRef.group.position, 0.72, true);
        }
        playQuestSelectSound();
        updateStatusUI();
        return true;
      }
      if (isNearRideableHorse()) {
        isRidingHorse = true;
        clampPlayerRig();
        if (playHorseWhistleSound) playHorseWhistleSound();
        updateStatusUI();
        return true;
      }
      return false;
    }
    toggleHorseMountHook = toggleHorseMount;

    function stagecoachTravelTo(reg) {
      if (!reg || typeof reg.x !== 'number' || typeof reg.z !== 'number') return false;
      const gY = getTerrainHeight(reg.x, reg.z, 0);
      playerRig.position.set(reg.x, gY + (isRidingHorse ? 1.15 : 0), reg.z);
      if (typeof reg.yaw === 'number') {
        playerRig.rotation.y = reg.yaw;
      }
      resetPCCameraPitch();
      resolveWallCollisions(playerRig.position, PLAYER_RADIUS, false);
      clampPlayerRig();
      if (horseEntityRef) {
        if (isRidingHorse) {
          horseEntityRef.group.position.set(playerRig.position.x, gY, playerRig.position.z);
        } else {
          const hx = reg.x + 2.4;
          const hz = reg.z + 1.8;
          horseEntityRef.group.position.set(hx, getTerrainHeight(hx, hz, gY), hz);
          resolveWallCollisions(horseEntityRef.group.position, 0.72, true);
        }
      }
      toggleCodexModal(false);
      if (playHorseWhistleSound) playHorseWhistleSound();
      updateStatusUI();
      return true;
    }
    stagecoachTravelHook = stagecoachTravelTo;

    function setRayFromVRController(controller) {
      controller.updateMatrixWorld(true);
      uiTempMatrix.identity().extractRotation(controller.matrixWorld);
      uiRaycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      uiRaycaster.ray.direction.set(0, 0, -1).applyMatrix4(uiTempMatrix).normalize();
    }

    function tryRayBoardInteractions() {
      // 1. Skredder-butikken (innenfor 12,5m — sjekkes FØR NPC-er slik at tavle, skilt og skredder alltid kan handles fra!)
      if (isPlayerNearTailorCounter()) {
        const btnHits = uiRaycaster.intersectObjects(tailorButtonMeshes, false);
        if (btnHits.length > 0) {
          purchaseTailorOutfit(btnHits[0].object.userData.outfit);
          return true;
        }
        const shieldHits = uiRaycaster.intersectObjects(tailorBlockHitMeshes, false);
        const signHit = tailorMainSignMesh ? uiRaycaster.intersectObject(tailorMainSignMesh, true) : [];
        const bldgHit = (isPlayerNearTailorCounter(7.5) && tailorBuilding) ? uiRaycaster.intersectObject(tailorBuilding, true) : [];
        if (shieldHits.length > 0 || signHit.length > 0 || (bldgHit.length > 0 && bldgHit[0].distance <= 9.5)) {
          if (shopAndCameraSystem && !renderer.xr.isPresenting) {
            shopAndCameraSystem.toggleStoreModal(true, 'armor');
          }
          return true;
        }
      }

      // 2. Våpensmed-butikken (innenfor 12,5m)
      if (isPlayerNearGunsmithCounter()) {
        const gHits = uiRaycaster.intersectObjects(gunsmithButtonMeshes, false);
        if (gHits.length > 0) {
          purchaseGunsmithItem(gHits[0].object.userData.gunsmithItem);
          return true;
        }
        const gShieldHits = uiRaycaster.intersectObjects(gunsmithBlockHitMeshes, false);
        const gSignHit = gunsmithMainSignMesh ? uiRaycaster.intersectObject(gunsmithMainSignMesh, true) : [];
        const gBldgHit = (isPlayerNearGunsmithCounter(7.5) && gunsmithBuilding) ? uiRaycaster.intersectObject(gunsmithBuilding, true) : [];
        if (gShieldHits.length > 0 || gSignHit.length > 0 || (gBldgHit.length > 0 && gBldgHit[0].distance <= 9.5)) {
          if (shopAndCameraSystem && !renderer.xr.isPresenting) {
            shopAndCameraSystem.toggleStoreModal(true, 'weapons');
          }
          return true;
        }
      }

      // 3. Homestead Ranch & Talenttavle i Dustwood (innenfor 12,5m)
      if (isPlayerNearHomesteadCounter()) {
        const hHits = uiRaycaster.intersectObjects(homesteadButtonMeshes, false);
        if (hHits.length > 0) {
          purchaseHomesteadUpgrade(hHits[0].object.userData.homesteadSlot);
          return true;
        }
        const hShieldHits = uiRaycaster.intersectObjects(homesteadBlockHitMeshes, false);
        if (hShieldHits.length > 0) {
          return true;
        }
      }

      // 4. Sheriffens oppdragstavle utenfor Saloonen (innenfor 12,5m)
      if (isPlayerNearSaloonQuestBoard()) {
        const qHits = uiRaycaster.intersectObjects(saloonQuestButtonMeshes, false);
        if (qHits.length > 0 && !isPracticeBottleCloserOnRay(uiRaycaster.ray, qHits[0].distance)) {
          selectSaloonQuestSlot(qHits[0].object.userData.questSlotIndex);
          return true;
        }
        const qShieldHits = uiRaycaster.intersectObjects(saloonQuestBlockMeshes, false);
        if (qShieldHits.length > 0 && !isPracticeBottleCloserOnRay(uiRaycaster.ray, qShieldHits[0].distance)) {
          return true;
        }
      }

      // 5. Klikk / pek på WoW Quest-Giver NPC-er i verden (gyllen ! og ?)
      if (mmoSystem && mmoSystem.tryRayNpcInteraction(uiRaycaster)) {
        return true;
      }

      // 5b. Klikk på bybutikker i de 4 nye byene eller tørre vedstabler langs stiene
      if (frontierExpansion && frontierExpansion.tryRayExpansionInteractions(uiRaycaster)) {
        return true;
      }

      // 6. Klikk på 3D-språkskiltet på Saloonen (EN / NO)
      if (worldLangButtonMeshes.length > 0) {
        const langHits = uiRaycaster.intersectObjects(worldLangButtonMeshes, false);
        if (langHits.length > 0 && langHits[0].distance <= 12.0) {
          toggleLanguage();
          playQuestSelectSound();
          return true;
        }
      }

      // 7. Klikk på den tunge Safe House-tredøren (åpne/lukke uten å bruke skudd nær døren)
      if (isPlayerNearSafeHouseDoor(9.5) && safeHouseDoorHitMeshes.length > 0) {
        const doorHits = uiRaycaster.intersectObjects(safeHouseDoorHitMeshes, false);
        if (doorHits.length > 0) {
          toggleSafeHouseDoor();
          return true;
        }
      }

      // 8. Klikk på Sheriff Vance utenfor Safe House / Saloonen (innenfor 7,5m)
      if (isPlayerNearSheriff() && sheriffHitMeshes.length > 0) {
        const sHits = uiRaycaster.intersectObjects(sheriffHitMeshes, false);
        if (sHits.length > 0) {
          talkToSheriffVance();
          return true;
        }
      }

      // 7. Klikk på Gullklumper/kister på nært hold (innenfor 5,5m)
      if (goldHitMeshes && goldHitMeshes.length > 0) {
        const gPickHits = uiRaycaster.intersectObjects(goldHitMeshes, false);
        if (gPickHits.length > 0 && gPickHits[0].distance <= 5.5) {
          const gp = gPickHits[0].object.userData.goldEntry;
          if (gp && !gp.collected) {
            collectGoldPickup(gp);
            return true;
          }
        }
      }

      // 8. Klikk på Blodalteret i Boot Hill-kapellet eller Ur-Obelisken i Steinringen (SV)
      if (chapelAltarHitMeshes && chapelAltarHitMeshes.length > 0) {
        const altarHits = uiRaycaster.intersectObjects(chapelAltarHitMeshes, false);
        if (altarHits.length > 0 && altarHits[0].distance <= 7.5) {
          if (summonBossFromAltarHook) summonBossFromAltarHook();
          return true;
        }
      }
      if (wendigoAltarHitMeshes && wendigoAltarHitMeshes.length > 0) {
        const wHits = uiRaycaster.intersectObjects(wendigoAltarHitMeshes, false);
        if (wHits.length > 0 && wHits[0].distance <= 7.5) {
          if (summonWendigoFromObeliskHook) summonWendigoFromObeliskHook();
          return true;
        }
      }
      const frontierHitArrays = [
        moonstoneHitMeshes,
        fortStrongboxHitMeshes,
        ancientRuneHitMeshes,
        oasisIdolHitMeshes,
        millCrateHitMeshes,
        meteorCoreHitMeshes,
        starShardHitMeshes
      ];
      for (let fIdx = 0; fIdx < frontierHitArrays.length; fIdx++) {
        const arr = frontierHitArrays[fIdx];
        if (!arr || arr.length === 0) continue;
        const fHits = uiRaycaster.intersectObjects(arr, false);
        if (fHits.length > 0 && fHits[0].distance <= 6.2) {
          const fo = fHits[0].object.userData.frontierObjective;
          if (fo && !fo.collected) {
            collectFrontierObjective(fo);
            return true;
          }
        }
      }
      if (goldenHorseshoeHitMeshes && goldenHorseshoeHitMeshes.length > 0) {
        const hsHits = uiRaycaster.intersectObjects(goldenHorseshoeHitMeshes, false);
        if (hsHits.length > 0 && hsHits[0].distance <= 6.5) {
          const hs = hsHits[0].object.userData.horseshoeEntry;
          if (hs && !hs.collected) {
            collectGoldenHorseshoe(hs);
            return true;
          }
        }
      }

      // 9. Klikk på Gammelt Gruvekart, Sølvrelikvier, Hellfire Repeater eller Tog-Gatling på nært hold
      if (mineMapPickup && !mineMapPickup.collected && mineMapPickup.hitMesh) {
        const mHits = uiRaycaster.intersectObject(mineMapPickup.hitMesh, false);
        if (mHits.length > 0 && mHits[0].distance <= 6.0) {
          collectMineMapPickup();
          return true;
        }
      }
      if (hellfirePickup && !hellfirePickup.collected && hellfirePickup.hitMesh) {
        const hHits = uiRaycaster.intersectObject(hellfirePickup.hitMesh, false);
        if (hHits.length > 0 && hHits[0].distance <= 6.0) {
          collectHellfirePickup();
          return true;
        }
      }
      if (trainGatlingHitMeshes && trainGatlingHitMeshes.length > 0 && !storyState.trainGatlingCaptured) {
        const tgHits = uiRaycaster.intersectObjects(trainGatlingHitMeshes, false);
        if (tgHits.length > 0 && tgHits[0].distance <= 6.5) {
          tryCaptureTrainGatling();
          return true;
        }
      }
      if (silverRelicHitMeshesRef && silverRelicHitMeshesRef.length > 0 && collectSilverRelicHook) {
        const relHits = uiRaycaster.intersectObjects(silverRelicHitMeshesRef, false);
        if (relHits.length > 0 && relHits[0].distance <= 6.0) {
          const entry = relHits[0].object.userData.relicEntry;
          if (entry && !entry.collected) {
            collectSilverRelicHook(entry);
            return true;
          }
        }
      }

      return false;
    }

    function tryVRRightTriggerUI(controller) {
      setRayFromVRController(controller);

      // 1. Sjekk klikk på spiseknapp, språkknapp, våpenknapp eller hesteknapp på venstre håndledd
      leftWristRig.updateMatrixWorld(true);
      if (uiRaycaster.intersectObject(langWristButton, false).length > 0) {
        toggleLanguage();
        playQuestSelectSound();
        return true;
      }
      if (uiRaycaster.intersectObject(eatWristButton, false).length > 0) {
        tryEatFood();
        return true;
      }
      if (uiRaycaster.intersectObject(weaponWristButton, false).length > 0) {
        cycleUnlockedWeapon(1);
        return true;
      }
      if (uiRaycaster.intersectObject(horseWristButton, false).length > 0) {
        if (isRidingHorse) toggleHorseMount();
        else if (callHorseHook) callHorseHook();
        return true;
      }
      // I VR: klikk direkte på selve wristBoard når intet oppdrag er aktivt for å starte neste oppdrag med én gang!
      if (!activeQuest && uiRaycaster.intersectObject(wristBoard, false).length > 0) {
        acceptOrCycleBoardQuest();
        return true;
      }

      // 2. Sjekk klikk på skredder, våpensmed, Sheriff, oppdragstavle, Safe House-dør eller språkskilt
      return tryRayBoardInteractions();
    }

    function tryVRLeftTriggerShopUI(controller) {
      setRayFromVRController(controller);
      return tryRayBoardInteractions();
    }

    function tryPCShopInteraction(clientX, clientY) {
      // Sjekk først der musepekeren klikket, deretter midtsiktet (#crosshair)
      uiPointerNDC.set(
        (clientX / window.innerWidth) * 2 - 1,
        -(clientY / window.innerHeight) * 2 + 1
      );
      uiRaycaster.setFromCamera(uiPointerNDC, camera);
      if (tryRayBoardInteractions()) return true;

      uiPointerNDC.set(0, 0);
      uiRaycaster.setFromCamera(uiPointerNDC, camera);
      if (tryRayBoardInteractions()) return true;

      return false;
    }

    // --- 8f. Spillerens helse, skade og gjenoppliving ---
    function updatePlayerBodyPoints() {
      if (!renderer.xr.isPresenting && shopAndCameraSystem && shopAndCameraSystem.isThirdPersonActive()) {
        playerHeadPosition.set(playerRig.position.x, playerRig.position.y + 1.65, playerRig.position.z);
        playerChestPosition.set(playerRig.position.x, playerRig.position.y + 1.20, playerRig.position.z);
        return;
      }
      camera.getWorldPosition(playerHeadPosition);
      playerChestPosition.copy(playerHeadPosition);
      playerChestPosition.y -= 0.45;
    }

    function damagePlayer(amount) {
      if (playerInvulnerableTimer > 0) return;

      const classMitigation = mmoSystem ? mmoSystem.getDamageTakenMultiplier() : 1.0;
      const finalDamage = Math.max(1, Math.round(amount * damageMultiplier * classMitigation));
      playerState.health = Math.max(0, playerState.health - finalDamage);
      updateStatusUI();
      playPlayerHitSound();
      flashDamageVignette();

      if (playerState.health <= 0) {
        handlePlayerDeath();
      }
    }

    function handlePlayerDeath() {
      playPlayerDeathSound();
      flashDamageVignette(0.65);

      playerState.health = playerState.maxHealth;
      playerState.food = Math.floor(playerState.food / 2);
      playerState.pelt = Math.floor(playerState.pelt / 2);

      playerRig.position.set(0, 0, 14.5);
      playerRig.rotation.set(0, 0, 0);
      resetPCCameraPitch();

      playerInvulnerableTimer = 2;
      saveCareerProgress();
      updateStatusUI();
    }

    function updatePlayerStatus(dt) {
      if (playerInvulnerableTimer > 0) {
        playerInvulnerableTimer = Math.max(0, playerInvulnerableTimer - dt);
      }
      if (gunshotAlertTimer > 0) {
        gunshotAlertTimer = Math.max(0, gunshotAlertTimer - dt);
      }
    }

    applyDayNightLighting(0);

    const E = initWorldEntities({
      scene,
      playerRig,
      playerState,
      storyState,
      S: {
        get nightMonsterDamage() { return nightMonsterDamage; },
        get weaponDamage() {
          const mult = 1 + weaponMasteryRank * 0.20 + (homesteadRanks.deadeye || 0) * 0.12 + collectedHorseshoeIds.length * 0.02;
          const stormMult = activeWorldEventId === 'frontier_storm' ? 1.35 : 1.0;
          const mmoMult = mmoSystem ? mmoSystem.getEffectiveDamageMultiplier() : 1.0;
          return weaponDamage * mult * stormMult * mmoMult;
        },
        get warhoundRank() {
          return (homesteadRanks.warhound || 0) + (mmoSystem ? mmoSystem.getBonusWarhoundRank() : 0);
        },
        get goldBonusMult() { return getCurrentGoldMultiplier(); },
        get extraPeltBonus() {
          const evPelt = (activeWorldEventId === 'great_migration' || activeWorldEventId === 'blood_eclipse') ? 1 : 0;
          return evPelt + ((homesteadRanks.trapper || 0) >= 8 ? 1 : 0);
        },
        get extraFoodBonus() {
          const evFood = activeWorldEventId === 'great_migration' ? 1 : 0;
          return evFood + ((homesteadRanks.cattle || 0) >= 8 ? 1 : 0);
        },
        get playerHiddenStatus() { return playerHiddenStatus; },
        get safeHouseDoorOpen() { return safeHouseDoorOpen; },
        get isNight() { return isNight; },
        get worldTime() { return worldTime; },
        get gunshotAlertTimer() { return gunshotAlertTimer; },
        get isRidingHorse() { return isRidingHorse; },
        grantLegendTitle() { hasLegendTitle = true; },
        forceNightNow() {
          if (!isNight) {
            cycleTime = DAY_DURATION;
            setTimeOfDay(true, true);
          }
        }
      },
      L,
      C,
      audio: {
        playFleshHitSound,
        playCollectSound,
        playGoldPickupSound,
        playBearRoarSound,
        playBossVictoryFanfare,
        playBanditShotSound,
        playHorseWhistleSound,
        playHoofbeatSound,
        playBarricadeBlastSound,
        playRelicPickupSound
      },
      practiceBottles,
      safeHouseCenterWorld,
      safeHouseOutsidePoint,
      DEER_RADIUS,
      WOLF_RADIUS,
      BEAR_RADIUS,
      BANDIT_RADIUS,
      NIGHT_RADIUS,
      BOSS_RADIUS,
      UP,
      FORWARD,
      PROJECTILE_MAX_HORIZONTAL,
      PROJECTILE_MAX_HEIGHT,
      FOREST_BOUNDS,
      lastGunshotPosition,
      playerHeadPosition,
      playerChestPosition,
      bottleWorldPos,
      getTerrainHeight,
      checkStoryProgression,
      updateStatusUI,
      resolveWallCollisions,
      resolveCircleAgainstWalls,
      pointHitsSolidWall,
      pushOutOfHidingZone,
      spawnSparkBurst,
      spawnVampireAshDissolution,
      spawnImpact,
      segmentPointDistance,
      knockBottle,
      recordQuestKill,
      updatePlayerBodyPoints,
      damagePlayer,
      tailorNPCGroup,
      gunsmithNPCGroup,
      sheriffVanceGroup,
      mineBarricades,
      brimstoneTotems
    });

    const {
      deerList,
      wolfList,
      bearList,
      banditList,
      nightEnemies,
      bossEnemy,
      wendigoBossEnemy,
      horseEntity,
      silverRelicHitMeshes,
      collectSilverRelic,
      callHorseToPlayer,
      damageBarricade,
      damageBrimstoneTotem,
      resetBanditsForDay,
      spawnNightEnemies,
      startNightEnemiesBurning,
      updateDeer,
      updateWolves,
      updateBears,
      updateBandits,
      updateNightEnemies,
      updateBossEnemy,
      updateWendigoBoss,
      updateHorseAndRelics,
      updateAnimationMixers,
      updateEnemyBullets,
      findCombatHit,
      damageCombatTarget
    } = E;
    bossEnemyRef = bossEnemy;
    horseEntityRef = horseEntity;
    silverRelicHitMeshesRef = silverRelicHitMeshes;
    collectSilverRelicHook = collectSilverRelic;
    callHorseHook = () => {
      if (callHorseToPlayer) callHorseToPlayer();
    };
    damageBarricadeHook = damageBarricade;
    damageBrimstoneTotemHook = damageBrimstoneTotem;
    respawnSilverRelicsHook = E.respawnSilverRelicsNow;
    respawnMineBarricadesHook = E.respawnMineBarricadesNow;
    refreshBossBarHook = E.syncBossHealthBarUI;
    summonBossFromAltarHook = E.summonBossFromAltar;
    summonWendigoFromObeliskHook = E.summonWendigoFromObelisk;
    onNightStateChangedBossHook = E.onNightStateChangedBoss;
    applyDynamiteBlastHook = E.applyDynamiteBlast;

    mmoSystem = initMMOAndCoopSystem({
      scene,
      camera,
      playerRig,
      playerState,
      storyState,
      M,
      C,
      FX,
      getLang: () => currentLang,
      getTerrainHeight,
      resolveWallCollisions,
      clampPlayerRig,
      awardScaledGold,
      showFrontierToast,
      spawnSparkBurst,
      updateStatusUI,
      saveCareerHook: saveCareerProgress,
      recordSaloonQuestKillFromCoop,
      getActiveSaloonQuestTargetType: () => (activeQuest ? activeQuest.targetType : ''),
      getActiveWeaponId: () => activeWeaponId,
      getIsRidingHorse: () => isRidingHorse,
      getOutfitTier: () => currentOutfitTier,
      getExpansion: () => frontierExpansion,
      audio: {
        playQuestSelectSound,
        playQuestFanfare,
        playUpgradeSound,
        playHealSound,
        playShopDenySound,
        playHellfireSound,
        playHorseWhistleSound,
        playBanditShotSound
      },
      entities: E
    });

    shopAndCameraSystem = initShopAndCameraSystem({
      scene,
      camera,
      renderer,
      playerRig,
      playerState,
      storyState,
      controlSettings,
      saveControlSettings,
      M,
      C,
      FX,
      WEAPON_ORDER,
      pcWeapons,
      unlockedWeapons,
      getLang: () => currentLang,
      getActiveWeaponId: () => activeWeaponId,
      equipWeapon,
      getIsRidingHorse: () => isRidingHorse,
      getHorseEntity: () => horseEntity,
      getPcPitch: () => pcPitch,
      getMoveSpeed: () => currentMoveSpeed,
      getTerrainHeight,
      pointHitsSolidWall,
      findCombatHit,
      triggerWeaponKick,
      updateWeaponViewFX,
      getOutfitTier: () => currentOutfitTier,
      setOutfitStats(newTier, newMult, newNightDmg) {
        currentOutfitTier = Math.max(currentOutfitTier, newTier);
        damageMultiplier = Math.min(damageMultiplier, newMult);
        nightMonsterDamage = Math.max(nightMonsterDamage, newNightDmg || 1);
      },
      getVisualOutfitTier: () => visualOutfitTier,
      setVisualOutfitTier(vTier) {
        visualOutfitTier = Math.max(0, Math.min(currentOutfitTier, vTier));
      },
      getArmorPaddingRanks: () => armorPaddingRanks,
      setArmorPaddingRanks(r) {
        armorPaddingRanks = Math.max(0, Math.min(25, r));
      },
      getTrailblazerRank: () => homesteadRanks.trailblazer || 0,
      getHasSheriffStar: () => hasSheriffStar,
      getHasGoldenRevolver: () => hasGoldenRevolver,
      grantGoldenRevolver() {
        weaponDamage = Math.max(weaponDamage, 2);
        if (!hasGoldenRevolver) {
          hasGoldenRevolver = true;
          upgradeRevolverToGold();
        }
      },
      getWeaponMasteryRank: () => weaponMasteryRank,
      incrementWeaponMasteryRank() {
        weaponMasteryRank = Math.min(40, weaponMasteryRank + 1);
      },
      getRedeemedStripeSessions: () => redeemedStripeSessions,
      addRedeemedStripeSession(sid) {
        if (sid && !redeemedStripeSessions.includes(sid)) redeemedStripeSessions.push(sid);
      },
      updateLeftSleeveAppearance,
      checkStoryProgression,
      saveCareerProgress,
      updateStatusUI,
      showFrontierToast,
      spawnSparkBurst,
      audio: {
        playQuestSelectSound,
        playQuestFanfare,
        playUpgradeSound,
        playHealSound,
        playShopDenySound
      }
    });

    frontierExpansion = initFrontierExpansion({
      scene,
      camera,
      playerRig,
      playerState,
      storyState,
      M,
      W,
      C,
      getLang: () => currentLang,
      getTerrainHeight,
      addWorldWallCollider,
      resolveWallCollisions,
      pointHitsSolidWall,
      segmentPointDistance,
      awardScaledGold,
      recordQuestKill,
      checkStoryProgression,
      saveCareerProgress,
      updateStatusUI,
      showFrontierToast,
      spawnSparkBurst,
      spawnImpact,
      spawnVampireAshDissolution,
      damagePlayer,
      playerHeadPosition,
      playerChestPosition,
      updatePlayerBodyPoints,
      getWeaponDamage: () => {
        const mult = 1 + weaponMasteryRank * 0.20 + (homesteadRanks.deadeye || 0) * 0.12 + collectedHorseshoeIds.length * 0.02;
        const stormMult = activeWorldEventId === 'frontier_storm' ? 1.35 : 1.0;
        const mmoMult = mmoSystem ? mmoSystem.getEffectiveDamageMultiplier() : 1.0;
        return weaponDamage * mult * stormMult * mmoMult;
      },
      getNightMonsterDamage: () => nightMonsterDamage,
      getExtraFoodBonus: () => {
        const evFood = activeWorldEventId === 'great_migration' ? 1 : 0;
        return evFood + ((homesteadRanks.cattle || 0) >= 8 ? 1 : 0);
      },
      getExtraPeltBonus: () => {
        const evPelt = (activeWorldEventId === 'great_migration' || activeWorldEventId === 'blood_eclipse') ? 1 : 0;
        return evPelt + ((homesteadRanks.trapper || 0) >= 8 ? 1 : 0);
      },
      getPrestigeHpMult: () => 1 + (storyState.prestigeRank || 0) * 0.35,
      getIsNight: () => isNight,
      getPlayerHiddenStatus: () => playerHiddenStatus,
      openStoreModal: (open, tab) => {
        if (shopAndCameraSystem && !renderer.xr.isPresenting) {
          shopAndCameraSystem.toggleStoreModal(open, tab);
        }
      },
      entities: E,
      audio: {
        playCollectSound,
        playGoldPickupSound,
        playFleshHitSound,
        playUpgradeSound,
        playShopDenySound,
        playBanditShotSound
      }
    });
    if (E.setExpansionHooks) {
      E.setExpansionHooks(frontierExpansion);
    }
    updateStatusUI();

    if (activeQuest) ensureQuestTargetsAvailable(activeQuest);
    // --- 8o. VR-kontrollerknapper: høyre grip = spis mat, venstre grip = sitt opp/av hest nær hest (ellers dag/natt) ---
    function tryVRDayNightToggle(controller, data) {
      if (!renderer.xr.isPresenting) return;

      const handedness = data && data.handedness;
      const isLeft = handedness === 'left' || (!handedness && vrHands.left === controller);
      if (!isLeft) return;

      const now = performance.now();
      if (now - lastVRDayNightToggle < 350) return;
      lastVRDayNightToggle = now;
      toggleDayNight();
    }

    controllers.forEach((controller) => {
      controller.addEventListener('squeezestart', (e) => {
        if (!renderer.xr.isPresenting) return;
        const data = e.data || {};
        const handedness = data.handedness;
        const isRight = handedness === 'right' || (!handedness && vrHands.right === controller);
        if (isRight) {
          tryEatFood();
          return;
        }
        if (toggleHorseMount()) {
          return;
        }
        tryVRDayNightToggle(controller, data);
      });

      controller.addEventListener('selectstart', (e) => {
        if (!renderer.xr.isPresenting) return;
        const data = e.data || {};
        const handedness = data.handedness;
        const isLeft = handedness === 'left' || (!handedness && vrHands.left === controller);
        if (isLeft) {
          if (tryVRLeftTriggerShopUI(controller)) return;
          tryVRDayNightToggle(controller, data);
        }
      });
    });

    // =========================================================================
    // 9. KRYSSPLATTFORM KONTROLLMOTOR FOR VR, TELEFON, PAD OG PC (FØLSOMHET + MULTI-TOUCH + POINTER LOCK)
    // =========================================================================
    function resetPCCameraPitch() {
      pcPitch = 0;
      camera.rotation.x = 0;
    }

    function isPadViewport() {
      const minEdge = Math.min(window.innerWidth, window.innerHeight);
      return minEdge >= 600;
    }

    let touchUIEnabled = false;
    function setTouchUIEnabled(enabled) {
      touchUIEnabled = !!enabled;
      document.body.classList.toggle('touch-ui', touchUIEnabled);
    }

    // Aktiver touch-kontroller automatisk på Telefon & Pad (coarse pointer / berøringsskjerm)
    const coarseMediaQuery = window.matchMedia ? window.matchMedia('(pointer: coarse)') : null;
    if (
      (coarseMediaQuery && coarseMediaQuery.matches) ||
      (navigator.maxTouchPoints > 0 && Math.min(window.innerWidth, window.innerHeight) <= 1024)
    ) {
      setTouchUIEnabled(true);
    }
    if (coarseMediaQuery && coarseMediaQuery.addEventListener) {
      coarseMediaQuery.addEventListener('change', (ev) => {
        if (ev.matches) setTouchUIEnabled(true);
      });
    }

    // --- Følsomhets- og innstillingspanel (#sens-btn / #sens-panel) ---
    function setLookSensitivityPct(newPct) {
      controlSettings.sensPct = Math.max(25, Math.min(250, Math.round(newPct / 5) * 5));
      saveControlSettings();
      syncControlsLocalizationUI();
    }

    if (sensBtnEl && sensPanelEl) {
      sensBtnEl.addEventListener('click', (e) => {
        e.stopPropagation();
        const willOpen = !sensPanelEl.classList.contains('open');
        sensPanelEl.classList.toggle('open', willOpen);
        if (willOpen && document.pointerLockElement && document.exitPointerLock) {
          document.exitPointerLock();
        }
      });
    }
    if (sensPanelEl) {
      sensPanelEl.addEventListener('pointerdown', (e) => e.stopPropagation());
    }
    if (sensRangeEl) {
      sensRangeEl.addEventListener('input', () => {
        setLookSensitivityPct(Number(sensRangeEl.value) || 100);
      });
    }
    if (sensMinusBtnEl) {
      sensMinusBtnEl.addEventListener('click', (e) => {
        e.stopPropagation();
        setLookSensitivityPct(controlSettings.sensPct - 15);
      });
    }
    if (sensPlusBtnEl) {
      sensPlusBtnEl.addEventListener('click', (e) => {
        e.stopPropagation();
        setLookSensitivityPct(controlSettings.sensPct + 15);
      });
    }
    if (sensInvertBtnEl) {
      sensInvertBtnEl.addEventListener('click', (e) => {
        e.stopPropagation();
        controlSettings.invertY = !controlSettings.invertY;
        saveControlSettings();
        syncControlsLocalizationUI();
      });
    }
    if (sensVrBtnEl) {
      sensVrBtnEl.addEventListener('click', (e) => {
        e.stopPropagation();
        controlSettings.vrSmoothTurn = !controlSettings.vrSmoothTurn;
        saveControlSettings();
        syncControlsLocalizationUI();
      });
    }
    if (sensPerfBtnEl) {
      sensPerfBtnEl.addEventListener('click', (e) => {
        e.stopPropagation();
        const order = ['auto', 'fast', 'ultra'];
        const nextIdx = (order.indexOf(controlSettings.perfMode) + 1) % order.length;
        controlSettings.perfMode = order[nextIdx];
        adaptiveDprCap = isSmallMobileScreen ? 1.35 : 1.25;
        applyQualityPixelRatio();
        saveControlSettings();
        syncControlsLocalizationUI();
      });
    }
    if (sensCareerResetBtnEl) {
      let careerConfirmTimeout = null;
      sensCareerResetBtnEl.addEventListener('click', (e) => {
        e.stopPropagation();
        const dict = L();
        if (!sensCareerResetBtnEl.dataset.confirming) {
          sensCareerResetBtnEl.dataset.confirming = '1';
          sensCareerResetBtnEl.textContent = dict.careerResetConfirmBtn || 'Confirm Reset?';
          sensCareerResetBtnEl.classList.add('active');
          careerConfirmTimeout = setTimeout(() => {
            delete sensCareerResetBtnEl.dataset.confirming;
            sensCareerResetBtnEl.classList.remove('active');
            syncControlsLocalizationUI();
          }, 3500);
          return;
        }
        if (careerConfirmTimeout) clearTimeout(careerConfirmTimeout);
        try {
          localStorage.removeItem(CAREER_SAVE_KEY);
        } catch (_) {}
        location.reload();
      });
    }
    if (sensResetBtnEl) {
      sensResetBtnEl.addEventListener('click', (e) => {
        e.stopPropagation();
        controlSettings.sensPct = 100;
        controlSettings.invertY = false;
        controlSettings.vrSmoothTurn = false;
        controlSettings.perfMode = 'auto';
        controlSettings.viewMode = 'first';
        adaptiveDprCap = isSmallMobileScreen ? 1.35 : 1.25;
        applyQualityPixelRatio();
        saveControlSettings();
        if (shopAndCameraSystem) shopAndCameraSystem.applyCameraAndWeaponVisibility();
        syncControlsLocalizationUI();
      });
    }
    if (dayNightTopBtnEl) {
      dayNightTopBtnEl.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDayNight();
      });
    }

    // --- Kalibrert kamerarotasjon for Telefon, Pad og PC (med hastighetsakselerasjon på touch) ---
    function applyTouchLookDelta(dx, dy, dtMs) {
      const sensScale = controlSettings.sensPct / 100;
      const invertSign = controlSettings.invertY ? -1 : 1;

      // Kalibrert for reell tommelrekkevidde: ~105px sveip på Telefon og ~140px på Pad gir rask 180° vending, mens små bevegelser gir presis sikting
      const refSpan = isPadViewport()
        ? 310
        : Math.max(260, Math.min(window.innerWidth, window.innerHeight) * 0.58);
      const baseRadPerPx = (isPadViewport() ? 3.15 : 3.25) / refSpan;

      // Myk akselerasjonskurve: rolige mikro-bevegelser (<0.18 px/ms) = stødig fin-sikting, rask tommel-sveip = 180° på ett drag
      const speedPxPerMs = Math.hypot(dx, dy) / Math.max(4, dtMs);
      const accel = 1.0 + Math.min(1.45, Math.max(0, speedPxPerMs - 0.18) * 0.78);

      const yawDelta = dx * baseRadPerPx * accel * sensScale;
      const pitchDelta = dy * baseRadPerPx * 0.74 * accel * sensScale * invertSign;

      playerRig.rotation.y -= yawDelta;
      pcPitch = Math.max(-MAX_LOOK_PITCH, Math.min(MAX_LOOK_PITCH, pcPitch - pitchDelta));
      camera.rotation.x = pcPitch;
    }

    function applyMouseLookDelta(dx, dy, isPointerLocked) {
      const sensScale = controlSettings.sensPct / 100;
      const invertSign = controlSettings.invertY ? -1 : 1;
      const baseYaw = isPointerLocked ? 0.0022 : 0.0038;
      const basePitch = isPointerLocked ? 0.00185 : 0.0030;

      playerRig.rotation.y -= dx * baseYaw * sensScale;
      pcPitch = Math.max(-MAX_LOOK_PITCH, Math.min(MAX_LOOK_PITCH, pcPitch - dy * basePitch * sensScale * invertSign));
      camera.rotation.x = pcPitch;
    }

    // --- Multi-Touch tilstand (isolert per pointerId slik at venstre spak + høyre sikte/skyt aldri forstyrrer hverandre!) ---
    let joyPointerId = null;
    let joyOriginX = 0;
    let joyOriginY = 0;
    let joyMaxRadius = 46;

    let lookPointerId = null;
    let lookStartX = 0;
    let lookStartY = 0;
    let lookPrevX = 0;
    let lookPrevY = 0;
    let lookPrevTime = 0;
    let lookMoved = false;
    let lookIsTouch = false;

    let firePointerId = null;
    let firePrevX = 0;
    let firePrevY = 0;
    let firePrevTime = 0;
    let isHoldingFireButton = false;
    let isHoldingMouseFire = false;

    function resetTouchJoystick() {
      joyPointerId = null;
      touchStickX = 0;
      touchStickY = 0;
      if (touchJoyKnobEl) {
        touchJoyKnobEl.style.transform = 'translate3d(0px, 0px, 0px)';
      }
      if (touchJoyRingEl) {
        touchJoyRingEl.style.left = '';
        touchJoyRingEl.style.bottom = '';
        touchJoyRingEl.style.top = '';
      }
    }

    function updateTouchJoystickFromPoint(clientX, clientY) {
      const dx = clientX - joyOriginX;
      const dy = clientY - joyOriginY;
      const dist = Math.hypot(dx, dy);
      const clamped = Math.min(joyMaxRadius, dist);
      const angle = dist > 1e-4 ? Math.atan2(dy, dx) : 0;
      const kx = Math.cos(angle) * clamped;
      const ky = Math.sin(angle) * clamped;
      touchStickX = kx / joyMaxRadius;
      touchStickY = ky / joyMaxRadius;
      if (touchJoyKnobEl) {
        touchJoyKnobEl.style.transform = `translate3d(${kx.toFixed(1)}px, ${ky.toFixed(1)}px, 0px)`;
      }
    }

    // --- Touch-handlingsknapper (Våpen, Hest, Spis, Dør/Velg og Sikt-mens-du-skyter SKYT-knapp!) ---
    function bindTapActionButton(btnEl, handler) {
      if (!btnEl) return;
      btnEl.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        setTouchUIEnabled(true);
        btnEl.classList.add('pressed');
        handler();
      });
      const clearPress = (e) => {
        if (e) e.stopPropagation();
        btnEl.classList.remove('pressed');
      };
      btnEl.addEventListener('pointerup', clearPress);
      btnEl.addEventListener('pointercancel', clearPress);
      btnEl.addEventListener('pointerleave', clearPress);
    }

    bindTapActionButton(btnTouchWeaponEl, () => {
      cycleUnlockedWeapon(1);
    });
    bindTapActionButton(btnTouchHorseEl, () => {
      if (toggleHorseMountHook && toggleHorseMountHook()) return;
      if (callHorseHook) callHorseHook();
    });
    bindTapActionButton(btnTouchEatEl, () => {
      tryEatFood();
    });
    bindTapActionButton(btnTouchUseEl, () => {
      if (!tryPCShopInteraction(window.innerWidth * 0.5, window.innerHeight * 0.5)) {
        tryKeyFSafeHouseDoor();
      }
    });

    if (btnTouchFireEl) {
      btnTouchFireEl.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (renderer.xr.isPresenting) return;
        if (audioCtx.state === 'suspended') audioCtx.resume();
        setTouchUIEnabled(true);
        btnTouchFireEl.classList.add('pressed');
        firePointerId = e.pointerId;
        firePrevX = e.clientX;
        firePrevY = e.clientY;
        firePrevTime = performance.now();
        isHoldingFireButton = true;
        if (btnTouchFireEl.setPointerCapture) {
          try { btnTouchFireEl.setPointerCapture(e.pointerId); } catch (_) {}
        }
        if (!tryPCShopInteraction(window.innerWidth * 0.5, window.innerHeight * 0.5)) {
          shoot();
        }
      });

      btnTouchFireEl.addEventListener('pointermove', (e) => {
        if (e.pointerId !== firePointerId || renderer.xr.isPresenting) return;
        e.preventDefault();
        e.stopPropagation();
        const now = performance.now();
        const dx = e.clientX - firePrevX;
        const dy = e.clientY - firePrevY;
        const dtMs = now - firePrevTime;
        firePrevX = e.clientX;
        firePrevY = e.clientY;
        firePrevTime = now;
        // Sikt sømløst mens man holder inne SKYT-knappen!
        applyTouchLookDelta(dx, dy, dtMs);
      });

      const releaseFireBtn = (e) => {
        if (e && e.pointerId !== undefined && e.pointerId !== firePointerId) return;
        if (e) e.stopPropagation();
        firePointerId = null;
        isHoldingFireButton = false;
        btnTouchFireEl.classList.remove('pressed');
      };
      btnTouchFireEl.addEventListener('pointerup', releaseFireBtn);
      btnTouchFireEl.addEventListener('pointercancel', releaseFireBtn);
    }

    function isInteractiveUIElement(target) {
      if (!target || !target.closest) return false;
      return !!(
        target.closest('button') ||
        target.closest('input') ||
        target.closest('#sens-panel') ||
        target.closest('#codex-modal') ||
        target.closest('#npc-quest-modal') ||
        target.closest('#coop-modal') ||
        target.closest('#store-modal') ||
        target.closest('#wow-quest-tracker') ||
        target.closest('#wow-party-panel') ||
        target.closest('#touch-actions')
      );
    }

    // --- PC Pointer Lock + Multi-Touch Venstre Spak / Høyre Sveip-Sikte ---
    document.addEventListener('mousemove', (e) => {
      if (renderer.xr.isPresenting) return;
      if (document.pointerLockElement === renderer.domElement) {
        const mx = e.movementX || 0;
        const my = e.movementY || 0;
        // Ignorer sjeldne nettleser-hopp akkurat idet Pointer Lock aktiveres
        if (Math.abs(mx) < 360 && Math.abs(my) < 360) {
          applyMouseLookDelta(mx, my, true);
        }
      }
    });

    window.addEventListener('pointerdown', (e) => {
      if (renderer.xr.isPresenting) return;
      if (audioCtx.state === 'suspended') audioCtx.resume();

      const isTouch = e.pointerType === 'touch' || e.pointerType === 'pen';
      if (isTouch) {
        setTouchUIEnabled(true);
      }

      if (isInteractiveUIElement(e.target)) return;

      // Lukk innstillingspanelet når man trykker tilbake i spillverdenen
      if (sensPanelEl && sensPanelEl.classList.contains('open')) {
        sensPanelEl.classList.remove('open');
      }

      // 1. PC med mus: aktiver ekte 360° FPS Pointer Lock + klikk/hold for å skyte / samhandle med butikkskilt
      if (!isTouch) {
        if (e.button !== 0) return;
        if (document.pointerLockElement === renderer.domElement) {
          if (!tryPCShopInteraction(window.innerWidth * 0.5, window.innerHeight * 0.5)) {
            shoot();
            isHoldingMouseFire = true;
          }
          return;
        }

        // Hvis pekeren ikke er låst ennå: sjekk først om spilleren klikket på et 3D-butikkskilt i verdenen
        if (tryPCShopInteraction(e.clientX, e.clientY)) {
          return;
        }

        // Lås musepekeren for fri PC-sikting (og støtt dra-sikting som fallback hvis nettleser avviser Pointer Lock)
        if (renderer.domElement && renderer.domElement.requestPointerLock) {
          try {
            const p = renderer.domElement.requestPointerLock();
            if (p && typeof p.catch === 'function') p.catch(() => {});
          } catch (_) {}
        }

        lookPointerId = e.pointerId;
        lookIsTouch = false;
        lookMoved = false;
        lookStartX = e.clientX;
        lookStartY = e.clientY;
        lookPrevX = e.clientX;
        lookPrevY = e.clientY;
        lookPrevTime = performance.now();
        isHoldingMouseFire = true;
        shoot();
        return;
      }

      // 2. Telefon & Pad: venstre skjermhalvdel (under topp-HUD) styrer flytende analog styrespak!
      const inLeftStickZone =
        joyPointerId === null &&
        e.clientX < window.innerWidth * 0.44 &&
        e.clientY > Math.min(125, window.innerHeight * 0.24);

      if (inLeftStickZone) {
        joyPointerId = e.pointerId;
        const ringW = touchJoyRingEl ? touchJoyRingEl.offsetWidth || 116 : 116;
        joyMaxRadius = Math.max(36, ringW * 0.40);
        joyOriginX = Math.max(ringW * 0.5 + 8, Math.min(window.innerWidth * 0.42, e.clientX));
        joyOriginY = Math.max(ringW * 0.5 + 90, Math.min(window.innerHeight - ringW * 0.5 - 8, e.clientY));
        if (touchJoyRingEl) {
          touchJoyRingEl.style.left = `${(joyOriginX - ringW * 0.5).toFixed(1)}px`;
          touchJoyRingEl.style.top = `${(joyOriginY - ringW * 0.5).toFixed(1)}px`;
          touchJoyRingEl.style.bottom = 'auto';
        }
        updateTouchJoystickFromPoint(e.clientX, e.clientY);
        return;
      }

      // 3. Telefon & Pad: høyre skjermhalvdel (og ledige områder) styrer presis kamerasveip + trykk på 3D-butikktavler!
      if (lookPointerId === null) {
        lookPointerId = e.pointerId;
        lookIsTouch = true;
        lookMoved = false;
        lookStartX = e.clientX;
        lookStartY = e.clientY;
        lookPrevX = e.clientX;
        lookPrevY = e.clientY;
        lookPrevTime = performance.now();
      }
    });

    window.addEventListener('pointermove', (e) => {
      if (renderer.xr.isPresenting) return;

      if (e.pointerId === joyPointerId) {
        updateTouchJoystickFromPoint(e.clientX, e.clientY);
        return;
      }

      if (e.pointerId === lookPointerId) {
        const now = performance.now();
        const dx = e.clientX - lookPrevX;
        const dy = e.clientY - lookPrevY;
        const dtMs = now - lookPrevTime;
        lookPrevX = e.clientX;
        lookPrevY = e.clientY;
        lookPrevTime = now;

        const moveThreshold = lookIsTouch ? 9 : 6;
        if (Math.hypot(e.clientX - lookStartX, e.clientY - lookStartY) > moveThreshold) {
          lookMoved = true;
        }

        if (lookIsTouch) {
          applyTouchLookDelta(dx, dy, dtMs);
        } else if (document.pointerLockElement !== renderer.domElement) {
          applyMouseLookDelta(dx, dy, false);
        }
      }
    });

    function handleGlobalPointerEnd(e) {
      if (e.pointerId === joyPointerId) {
        resetTouchJoystick();
        return;
      }

      if (e.type === 'pointerup' && !e.isPrimary && e.pointerId !== lookPointerId) {
        return;
      }

      if (e.pointerId === lookPointerId) {
        if (e.type === 'pointerup' && !renderer.xr.isPresenting && lookIsTouch && !lookMoved) {
          // Kort berøring i verdenen på Telefon/Pad: velg direkte på Saloon-/Skredder-/Våpensmed-tavle!
          tryPCShopInteraction(e.clientX, e.clientY);
        }
        lookPointerId = null;
        lookMoved = false;
      }

      if (!lookIsTouch) {
        isHoldingMouseFire = false;
      }
    }

    window.addEventListener('pointerup', handleGlobalPointerEnd);
    window.addEventListener('pointercancel', (e) => {
      if (e.pointerId === joyPointerId) resetTouchJoystick();
      if (e.pointerId === lookPointerId) {
        lookPointerId = null;
        lookMoved = false;
      }
      if (e.pointerId === firePointerId) {
        firePointerId = null;
        isHoldingFireButton = false;
        if (btnTouchFireEl) btnTouchFireEl.classList.remove('pressed');
      }
      isHoldingMouseFire = false;
    });

    function updateContinuousTrigger() {
      if (renderer.xr.isPresenting) return;
      if ((isHoldingFireButton || isHoldingMouseFire) && shotCooldownTimer <= 0) {
        shoot();
      }
    }

    // Nullstill PC/Mobil-pitch og skjul 2D-touch-UI når man går inn i WebXR VR
    renderer.xr.addEventListener('sessionstart', () => {
      document.body.classList.add('in-vr');
      resetTouchJoystick();
      isHoldingFireButton = false;
      isHoldingMouseFire = false;
      if (document.pointerLockElement && document.exitPointerLock) {
        document.exitPointerLock();
      }
      camera.position.set(0, 1.65, 0);
      camera.rotation.set(0, 0, 0);
      if (shopAndCameraSystem) shopAndCameraSystem.applyCameraAndWeaponVisibility();
    });
    renderer.xr.addEventListener('sessionend', () => {
      document.body.classList.remove('in-vr');
      if (shopAndCameraSystem) shopAndCameraSystem.applyCameraAndWeaponVisibility();
    });

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      applyQualityPixelRatio();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Garanter at resolveWallCollisions kjøres for ALLE aktører i hver eneste frame (0 allokeringer)
    function enforceAllActorWallCollisions() {
      resolveWallCollisions(playerRig.position, PLAYER_RADIUS, false);
      clampPlayerRig();

      for (let i = 0; i < nightEnemies.length; i++) {
        const enemy = nightEnemies[i];
        if (!enemy.alive || !enemy.group.visible || enemy.burning) continue;
        pushOutOfHidingZone(enemy.group, NIGHT_RADIUS);
        resolveWallCollisions(enemy.group.position, NIGHT_RADIUS, true);
        pushOutOfHidingZone(enemy.group, NIGHT_RADIUS);
      }

      if (bossEnemy.alive && bossEnemy.group.visible) {
        pushOutOfHidingZone(bossEnemy.group, BOSS_RADIUS);
        resolveWallCollisions(bossEnemy.group.position, BOSS_RADIUS, true);
        pushOutOfHidingZone(bossEnemy.group, BOSS_RADIUS);
      }

      for (let i = 0; i < wolfList.length; i++) {
        const wolf = wolfList[i];
        if (!wolf.alive || !wolf.group.visible) continue;
        pushOutOfHidingZone(wolf.group, WOLF_RADIUS);
        resolveWallCollisions(wolf.group.position, WOLF_RADIUS, true);
        pushOutOfHidingZone(wolf.group, WOLF_RADIUS);
      }

      for (let i = 0; i < bearList.length; i++) {
        const bear = bearList[i];
        if (!bear.alive || !bear.group.visible) continue;
        pushOutOfHidingZone(bear.group, BEAR_RADIUS);
        resolveWallCollisions(bear.group.position, BEAR_RADIUS, true);
        pushOutOfHidingZone(bear.group, BEAR_RADIUS);
      }

      for (let i = 0; i < banditList.length; i++) {
        const bandit = banditList[i];
        if (!bandit.alive || !bandit.group.visible) continue;
        resolveWallCollisions(bandit.group.position, BANDIT_RADIUS, true);
      }

      for (let i = 0; i < deerList.length; i++) {
        const deer = deerList[i];
        if (!deer.alive || !deer.group.visible) continue;
        resolveWallCollisions(deer.group.position, DEER_RADIUS, true);
      }
    }

    // =========================================================================
    // 11. HOVEDLØKKE (72–90 FPS OPTIMALISERT FOR META QUEST, 0 PER-FRAME ALLOKERINGER)
    // =========================================================================
    const clock = new THREE.Clock();
    let perfFrameCounter = 0;
    let perfWindowStart = 0;
    let perfWindowFrames = 0;

    renderer.setAnimationLoop(() => {
      const dt = Math.min(clock.getDelta(), 0.05);
      worldTime += dt;
      totalPlaySeconds += dt;
      autoSaveAccum += dt;
      if (autoSaveAccum >= 8.0) {
        autoSaveAccum = 0;
        saveCareerProgress();
      }
      if (windUniforms) windUniforms.uWindTime.value = worldTime;
      if (shotCooldownTimer > 0) shotCooldownTimer = Math.max(0, shotCooldownTimer - dt);
      currentMoveSpeed = 0;

      // Dag/natt-syklus, flakkende lykter/leirbål, svevende støvkorn/glør/tumbleweeds, helse og skadetimere
      updateDayNight(dt);
      updateFlickeringLights(worldTime);
      updateBackgroundAmbience(dt);
      updatePlayerStatus(dt);

      // Tidsbegrenset statusmelding på skredder-, våpensmed- og oppdragstavlen + NPC- og Safe House-døranimasjon
      if (tailorStatusTimer > 0) {
        tailorStatusTimer = Math.max(0, tailorStatusTimer - dt);
        if (tailorStatusTimer === 0) {
          tailorStatusMessageKey = '';
          updateTailorWorkshopUI();
        }
      }
      if (gunsmithStatusTimer > 0) {
        gunsmithStatusTimer = Math.max(0, gunsmithStatusTimer - dt);
        if (gunsmithStatusTimer === 0) {
          gunsmithStatusKey = '';
          gunsmithStatusArg = null;
          updateGunsmithUI();
        }
      }
      if (homesteadStatusTimer > 0) {
        homesteadStatusTimer = Math.max(0, homesteadStatusTimer - dt);
        if (homesteadStatusTimer === 0) {
          homesteadStatusKey = '';
          homesteadStatusArg = null;
          updateHomesteadUI();
        }
      }
      if (homesteadWindmillWheel) {
        homesteadWindmillWheel.rotation.z += dt * 1.15;
      }
      if ((homesteadRanks.cattle || 0) > 0 || (homesteadRanks.trapper || 0) > 0) {
        ranchDividendAccum += dt;
        if (ranchDividendAccum >= 60.0) {
          ranchDividendAccum -= 60.0;
          const baseDiv = (homesteadRanks.cattle || 0) * 8 + (homesteadRanks.trapper || 0) * 4;
          const goldDiv = awardScaledGold(baseDiv);
          const foodDiv = (homesteadRanks.cattle || 0) >= 3 ? Math.max(1, Math.floor(homesteadRanks.cattle / 4)) : 0;
          const peltDiv = (homesteadRanks.trapper || 0) >= 2 ? Math.max(1, Math.floor(homesteadRanks.trapper / 4)) : 0;
          playerState.food += foodDiv;
          playerState.pelt += peltDiv;
          const dict = L();
          if (dict.ranchIncomeToast) {
            showFrontierToast(dict.ranchIncomeToast(goldDiv, foodDiv, peltDiv), 5.0);
          }
          updateStatusUI();
        }
      }
      if (toastBannerTimer > 0) {
        toastBannerTimer = Math.max(0, toastBannerTimer - dt);
        if (toastBannerTimer === 0) {
          toastBannerText = '';
          syncWorldEventBar();
        }
      }
      if (worldEventTimer > 0) {
        const prevCeil = Math.ceil(worldEventTimer);
        worldEventTimer = Math.max(0, worldEventTimer - dt);
        if (worldEventTimer === 0) {
          activeWorldEventId = '';
          syncWorldEventBar();
        } else if (Math.ceil(worldEventTimer) !== prevCeil && toastBannerTimer <= 0) {
          syncWorldEventBar();
        }
      } else {
        worldEventCooldown -= dt;
        if (worldEventCooldown <= 0) {
          triggerWorldEvent();
        }
      }
      if (questBoardTimer > 0) {
        questBoardTimer = Math.max(0, questBoardTimer - dt);
        if (questBoardTimer === 0) {
          questBoardMessageKey = '';
          questBoardMessageArg = null;
          updateSaloonQuestBoardUI();
        }
      }
      let slotFlashChanged = false;
      for (let sIdx = 0; sIdx < 3; sIdx++) {
        const fl = slotCompletedFlash[sIdx];
        if (fl && fl.timer > 0) {
          fl.timer = Math.max(0, fl.timer - dt);
          if (fl.timer === 0) {
            slotCompletedFlash[sIdx] = null;
            slotFlashChanged = true;
          }
        }
      }
      if (slotFlashChanged) {
        updateSaloonQuestBoardUI();
      }
      if (hudCompletedBanner && hudCompletedBanner.timer > 0) {
        hudCompletedBanner.timer = Math.max(0, hudCompletedBanner.timer - dt);
        if (hudCompletedBanner.timer === 0) {
          hudCompletedBanner = null;
          syncQuestHudBar();
          updateStatusUI();
        }
      }
      if (tailorNPCGroup) {
        tailorNPCGroup.rotation.y = 0.14 + Math.sin(worldTime * 1.4) * 0.08;
      }
      if (gunsmithNPCGroup) {
        gunsmithNPCGroup.rotation.y = 0.12 + Math.sin(worldTime * 1.25 + 1.1) * 0.07;
      }
      if (updateAmbientWildlife) {
        updateAmbientWildlife(dt, worldTime);
      }
      if (mmoSystem) {
        mmoSystem.updateMMOAndCoop(dt, worldTime);
      }
      if (sheriffVanceGroup) {
        sheriffVanceGroup.rotation.y = 0.28 + Math.sin(worldTime * 1.1) * 0.06;
        // Snakk automatisk med Sheriff Vance i Level 1 når spilleren går bort til ham (< 4.2m)
        if (!storyState.talkedSheriff) {
          const sdx = playerRig.position.x - sheriffVanceGroup.position.x;
          const sdz = playerRig.position.z - sheriffVanceGroup.position.z;
          if (sdx * sdx + sdz * sdz < 17.6) {
            talkToSheriffVance();
          }
        }
      }
      if (safeHouseDoorPivot) {
        const targetDoorAngle = safeHouseDoorOpen ? 1.62 : 0;
        safeHouseDoorAngle += (targetDoorAngle - safeHouseDoorAngle) * Math.min(1, dt * 8.5);
        safeHouseDoorPivot.rotation.y = safeHouseDoorAngle;
      }

      // Bevegelse, sikte, kontinuerlig avtrekker og våpenbytte på tvers av VR, Telefon, Pad og PC
      updateVRWeaponSwitchButton();
      updateVRMovement(dt);
      updatePCMovement(dt);
      updateSnapTurn(dt);
      updateContinuousTrigger();

      // Skapninger, Mustang-hest, Grizzlybjørn, Banditter, Katakombevoktere, Lord Malakor og solide veggkollisjoner
      updateDeer(dt);
      updateWolves(dt);
      updateBears(dt);
      updateBandits(dt);
      updateNightEnemies(dt);
      updateBossEnemy(dt);
      if (updateWendigoBoss) updateWendigoBoss(dt);
      if (updateHorseAndRelics) {
        updateHorseAndRelics(dt, worldTime, currentMoveSpeed, currentMoveDirX, currentMoveDirZ);
      }
      if (frontierExpansion) {
        frontierExpansion.updateFrontierExpansion(dt, worldTime);
      }
      enforceAllActorWallCollisions();
      updatePlayerBodyPoints();
      updatePlayerHiddenStatus();

      // Nærhets-oppsamling for Level 4 Gruvekart, Level 5 Gatling-vogn & Level 7 Hellfire Repeater
      if (mineMapPickup && !mineMapPickup.collected) {
        mineMapPickup.hitMesh.rotation.y += dt * 1.4;
        if (Math.hypot(playerRig.position.x - mineMapPickup.worldPos.x, playerRig.position.z - mineMapPickup.worldPos.z) < 2.3) {
          collectMineMapPickup();
        }
      }
      if (hellfirePickup && !hellfirePickup.collected) {
        if (hellfirePickup.orb) hellfirePickup.orb.rotation.y += dt * 1.6;
        if (
          playerRig.position.y < -4.0 &&
          Math.hypot(playerRig.position.x - hellfirePickup.worldPos.x, playerRig.position.z - hellfirePickup.worldPos.z) < 2.35
        ) {
          collectHellfirePickup();
        }
      }
      if (!storyState.trainGatlingCaptured && storyState.trainSnipersKilled >= 4) {
        if (Math.hypot(playerRig.position.x - 16.4, playerRig.position.z - 75.0) < 3.5) {
          tryCaptureTrainGatling();
        }
      }

      if (isNight && playerHiddenStatus && !storyState.act3NightSurvived) {
        storyState.act3SafeHouseTimer += dt;
        if (storyState.act3SafeHouseTimer >= 4.0) {
          storyState.act3NightSurvived = true;
          checkStoryProgression();
          updateStatusUI();
        }
      }

      updateAnimationMixers(dt);
      updateEnemyBullets(dt);
      updateGoldPickups(dt);

      // Skyting, kastet dynamitt, tomhylser i messing, treff, kruttrøyk/gnister/aske, blinkfysikk og tumbleweeds
      updateBullets(dt);
      updateThrownDynamites(dt);
      if (updateShellCasings) updateShellCasings(dt, getTerrainHeight);
      updateBottles(dt);
      updateImpacts(dt);
      updateFXParticles(dt);
      updateAmbientParticles(dt, playerRig.position, nightAmount, worldTime, getTerrainHeight);
      updateDamageVignette(dt);

      if (weaponDamage >= 2 && !hasGoldenRevolver) {
        hasGoldenRevolver = true;
        upgradeRevolverToGold();
        updateStatusUI();
      }
      updateWeaponViewFX(pcWeapons[activeWeaponId], dt);
      if (vrActiveWeapon) updateWeaponViewFX(vrActiveWeapon, dt);
      if (shopAndCameraSystem) {
        shopAndCameraSystem.updateThirdPersonCameraAndAvatar(dt, worldTime);
        const outerShop = frontierExpansion ? frontierExpansion.getNearbyOuterTownShop() : null;
        shopAndCameraSystem.updateNearbyShopPrompt(
          isPlayerNearTailorCounter(5.5) || !!(outerShop && outerShop.tab === 'armor'),
          isPlayerNearGunsmithCounter(5.5) || !!(outerShop && outerShop.tab === 'weapons')
        );
      }

      // Nullstill blinkene automatisk litt etter at alle er truffet
      if (targetResetTimer > 0) {
        targetResetTimer -= dt;
        if (targetResetTimer <= 0) resetTargets();
      }

      if (updateWorldPerformanceAndLights) {
        updateWorldPerformanceAndLights(playerRig.position);
      }

      // Dynamisk skyggekart-oppdatering og automatisk oppløsningsvern mot hakking på PC/Laptop
      perfFrameCounter = (perfFrameCounter + 1) | 0;
      const shadowStride = controlSettings.perfMode === 'ultra' ? 1 : (controlSettings.perfMode === 'fast' ? 3 : 2);
      if (perfFrameCounter % shadowStride === 0) {
        renderer.shadowMap.needsUpdate = true;
      }

      if (!renderer.xr.isPresenting && controlSettings.perfMode === 'auto') {
        const nowPerf = performance.now();
        if (perfWindowStart === 0) perfWindowStart = nowPerf;
        perfWindowFrames++;
        const elapsedMs = nowPerf - perfWindowStart;
        if (elapsedMs >= 1400) {
          const avgFps = (perfWindowFrames * 1000) / elapsedMs;
          if (avgFps < 48 && adaptiveDprCap > 0.85) {
            adaptiveDprCap = Math.max(0.85, Math.round((adaptiveDprCap - 0.18) * 100) / 100);
            applyQualityPixelRatio();
          } else if (avgFps > 59 && adaptiveDprCap < 1.25) {
            adaptiveDprCap = Math.min(1.25, Math.round((adaptiveDprCap + 0.08) * 100) / 100);
            applyQualityPixelRatio();
          }
          perfWindowStart = nowPerf;
          perfWindowFrames = 0;
        }
      }

      renderer.render(scene, camera);
    });

    window.__westernScene = {
      scene,
      camera,
      renderer,
      playerRig,
      hdrState,
      sunLight,
      rimUniforms,
      deerList,
      wolfList,
      bearList,
      banditList,
      nightEnemies,
      bossEnemy,
      horseEntity,
      saloonBuilding,
      tailorBuilding,
      gunsmithBuilding,
      safeHouseBuilding,
      homesteadBuilding,
      homesteadRanks,
      HOMESTEAD_SLOTS,
      purchaseHomesteadUpgrade,
      goldenHorseshoes,
      collectedHorseshoeIds,
      collectGoldenHorseshoe,
      getCompletionData,
      toggleCodexModal,
      stagecoachTravelTo,
      triggerWorldEvent,
      mmoSystem,
      shopAndCameraSystem,
      frontierExpansion,
      playerState,
      storyState,
      toggleDayNight,
      equipWeapon,
      unlockedWeapons,
      isPlayerInHidingZone,
      controlSettings,
      setTouchUIEnabled,
      setLookSensitivityPct,
      selectSaloonQuestSlot,
      acceptOrCycleBoardQuest,
      recordQuestKill,
      getQuestState() {
        return {
          questBoardSlots: [...questBoardSlots],
          nextQuestSeq,
          activeQuest: activeQuest ? { ...activeQuest } : null,
          questProgress,
          totalBountiesDone: storyState.totalBountiesDone || 0,
          slotCompletedFlash: slotCompletedFlash.map((f) => (f ? { ...f } : null)),
          hudCompletedBanner: hudCompletedBanner ? { ...hudCompletedBanner } : null
        };
      },
      setLookYawPitch(yaw, pitch = 0) {
        playerRig.rotation.y = yaw;
        pcPitch = pitch;
        camera.rotation.x = pitch;
      }
    };
