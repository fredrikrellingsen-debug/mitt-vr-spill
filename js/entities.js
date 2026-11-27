import * as THREE from 'three';

export function initWorldEntities(ctx) {
  const {
    scene,
    playerRig,
    playerState,
    storyState,
    S,
    L,
    C,
    audio,
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
    mineBarricades = [],
    brimstoneTotems = []
  } = ctx;

  const {
    createDeerModel,
    createWhiteStagModel,
    createWolfModel,
    createCougarModel,
    createAlphaDirewolfModel,
    createWarhoundCompanionModel,
    createHellhoundModel,
    createBearModel,
    createBisonModel,
    createElderKodiakBossModel,
    createHorseModel,
    createBanditModel,
    createFortDesperadoModel,
    createBrimstoneRaiderModel,
    createBanditCaptainModel,
    createGeneralCortezModel,
    createBrimstoneMarshalModel,
    createElFuegoBossModel,
    createBlackfeatherBossModel,
    createForemanSladeModel,
    createNightEnemyModel,
    createBrimstoneRevenantModel,
    createWendigoStalkerModel,
    createCatacombGuardianModel,
    createBossVampireModel,
    createAncientWendigoBossModel,
    createSandwraithBossModel,
    createSilverRelicMesh,
    animateQuadrupedLegs
  } = C;

  function getPrestigeHpMult() {
    return 1 + (storyState.prestigeRank || 0) * 0.22;
  }
  function scaleGoldReward(baseGold) {
    const bonusMult = S.goldBonusMult || 1;
    return Math.max(1, Math.round(baseGold * (1 + (storyState.prestigeRank || 0) * 0.35) * bonusMult));
  }

  const {
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
  } = audio;

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

    // --- 8g. Enkle delte geometrier og materialer for alle skapninger ---
    function faceToward(group, targetX, targetZ) {
      const dx = targetX - group.position.x;
      const dz = targetZ - group.position.z;
      if (dx * dx + dz * dz < 0.0001) return;
      group.rotation.y = Math.atan2(-dx, -dz);
    }

    function moveEntityToward(group, targetX, targetZ, speed, dt, stopDistance = 0, radius = 0, blockOpenSafeDoor = false) {
      const dx = targetX - group.position.x;
      const dz = targetZ - group.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance < 0.0001) return distance;

      const step = Math.min(speed * dt, Math.max(0, distance - stopDistance));
      if (step <= 0) return distance;

      const dirX = dx / distance;
      const dirZ = dz / distance;
      const startX = group.position.x;
      const startZ = group.position.z;

      group.position.x = startX + dirX * step;
      group.position.z = startZ + dirZ * step;

      if (radius > 0) {
        if (blockOpenSafeDoor) pushOutOfHidingZone(group, radius);
        resolveWallCollisions(group.position, radius, blockOpenSafeDoor);

        const movedX = group.position.x - startX;
        const movedZ = group.position.z - startZ;
        const movedDist = Math.hypot(movedX, movedZ);

        if (movedDist >= step * 0.55) {
          group.userData.slideSign = 0;
        } else if (movedDist < step * 0.38) {
          const slideStep = step * 0.85;
          let sign = group.userData.slideSign || 0;

          if (sign === 0) {
            group.position.x = startX - dirZ * slideStep;
            group.position.z = startZ + dirX * slideStep;
            if (blockOpenSafeDoor) pushOutOfHidingZone(group, radius);
            resolveWallCollisions(group.position, radius, blockOpenSafeDoor);
            const lx = group.position.x;
            const lz = group.position.z;
            const lTargetSq = (targetX - lx) * (targetX - lx) + (targetZ - lz) * (targetZ - lz);

            group.position.x = startX + dirZ * slideStep;
            group.position.z = startZ - dirX * slideStep;
            if (blockOpenSafeDoor) pushOutOfHidingZone(group, radius);
            resolveWallCollisions(group.position, radius, blockOpenSafeDoor);
            const rx = group.position.x;
            const rz = group.position.z;
            const rTargetSq = (targetX - rx) * (targetX - rx) + (targetZ - rz) * (targetZ - rz);

            sign = lTargetSq <= rTargetSq ? -1 : 1;
            group.userData.slideSign = sign;
          }

          group.position.x = startX + sign * dirZ * slideStep;
          group.position.z = startZ - sign * dirX * slideStep;
          if (blockOpenSafeDoor) pushOutOfHidingZone(group, radius);
          resolveWallCollisions(group.position, radius, blockOpenSafeDoor);

          const sMovedSq =
            (group.position.x - startX) * (group.position.x - startX) +
            (group.position.z - startZ) * (group.position.z - startZ);
          if (sMovedSq < 1e-6) {
            sign = -sign;
            group.userData.slideSign = sign;
            group.position.x = startX + sign * dirZ * slideStep;
            group.position.z = startZ - sign * dirX * slideStep;
            if (blockOpenSafeDoor) pushOutOfHidingZone(group, radius);
            resolveWallCollisions(group.position, radius, blockOpenSafeDoor);
          }
        }

        const actualDX = group.position.x - startX;
        const actualDZ = group.position.z - startZ;
        if (actualDX * actualDX + actualDZ * actualDZ > 1e-6) {
          group.rotation.y = Math.atan2(-actualDX, -actualDZ);
        } else {
          faceToward(group, targetX, targetZ);
        }
        return distance;
      }

      faceToward(group, targetX, targetZ);
      return distance;
    }

    // --- 8g2. Animasjonskontroll: AnimationMixer + tilstander ---
    const animationMixers = [];

    function createQuadrupedAnimationClips() {
      const idleTracks = [];
      const walkTracks = [];
      const runTracks = [];
      for (let i = 0; i < 4; i++) {
        const phase = (i === 0 || i === 3) ? 1 : -1;
        idleTracks.push(new THREE.NumberKeyframeTrack(`leg${i}.rotation[x]`, [0, 1], [0, 0]));
        walkTracks.push(new THREE.NumberKeyframeTrack(`leg${i}.rotation[x]`, [0, 0.5, 1], [0, 0.28 * phase, 0]));
        runTracks.push(new THREE.NumberKeyframeTrack(`leg${i}.rotation[x]`, [0, 0.275, 0.55], [0, 0.5 * phase, 0]));
      }

      return [
        new THREE.AnimationClip('Idle', 1, idleTracks),
        new THREE.AnimationClip('Walk', 1, walkTracks),
        new THREE.AnimationClip('Run', 0.55, runTracks),
        new THREE.AnimationClip('Attack', 0.35, [
          new THREE.NumberKeyframeTrack('head.rotation[x]', [0, 0.15, 0.35], [0, -0.35, 0])
        ])
      ];
    }

    function createNightAnimationClips() {
      return [
        new THREE.AnimationClip('Idle', 2, [
          new THREE.NumberKeyframeTrack('arm0.rotation[x]', [0, 1, 2], [0, 0.06, 0]),
          new THREE.NumberKeyframeTrack('arm1.rotation[x]', [0, 1, 2], [0, -0.06, 0])
        ]),
        new THREE.AnimationClip('Walk', 1, [
          new THREE.NumberKeyframeTrack('arm0.rotation[x]', [0, 0.5, 1], [0, 0.3, 0]),
          new THREE.NumberKeyframeTrack('arm1.rotation[x]', [0, 0.5, 1], [0, -0.3, 0])
        ]),
        new THREE.AnimationClip('Attack', 0.35, [
          new THREE.NumberKeyframeTrack('arm0.rotation[x]', [0, 0.12, 0.35], [0, -0.55, 0]),
          new THREE.NumberKeyframeTrack('arm1.rotation[x]', [0, 0.12, 0.35], [0, -0.55, 0])
        ])
      ];
    }

    function createBanditAnimationClips() {
      return [
        new THREE.AnimationClip('Idle', 2, [
          new THREE.NumberKeyframeTrack('rightUpper.rotation[x]', [0, 1, 2], [-0.95, -0.93, -0.95]),
          new THREE.NumberKeyframeTrack('rightFore.rotation[x]', [0, 1, 2], [-1.48, -1.46, -1.48])
        ]),
        new THREE.AnimationClip('Attack', 0.35, [
          new THREE.NumberKeyframeTrack('rightUpper.rotation[x]', [0, 0.1, 0.35], [-0.95, -1.28, -0.95]),
          new THREE.NumberKeyframeTrack('rightFore.rotation[x]', [0, 0.1, 0.35], [-1.48, -1.62, -1.48])
        ])
      ];
    }

    const quadrupedAnimationClips = createQuadrupedAnimationClips();
    const nightAnimationClips = createNightAnimationClips();
    const banditAnimationClips = createBanditAnimationClips();

    function findBestClipAction(actions, candidates, avoidWords = []) {
      for (let c = 0; c < candidates.length; c++) {
        const cand = candidates[c];
        if (actions[cand]) return actions[cand];
        for (const key in actions) {
          if (
            key === `${cand}_action` ||
            key.endsWith(`|${cand}`) ||
            key.endsWith(`_${cand}`)
          ) {
            return actions[key];
          }
        }
      }
      for (let c = 0; c < candidates.length; c++) {
        const cand = candidates[c];
        for (const key in actions) {
          if (!key.includes(cand)) continue;
          let blocked = false;
          for (let a = 0; a < avoidWords.length; a++) {
            if (key.includes(avoidWords[a])) {
              blocked = true;
              break;
            }
          }
          if (!blocked) return actions[key];
        }
      }
      return null;
    }

    function registerEntityAnimations(entity, fallbackClips) {
      entity.animationMixer = null;
      entity.animationActions = null;
      entity.resolvedActions = null;
      entity.hasDeathClip = false;
      entity.animationState = '';
      entity.currentAnimationAction = null;
      entity.attackAnimTimer = 0;

      // GLB-modeller leverer clips på gruppen eller via userData; bruk animRoot slik at spor treffer klonet GLTF-scene.
      const groupClips = entity.group.animations && entity.group.animations.length
        ? entity.group.animations
        : (entity.group.userData.animations && entity.group.userData.animations.length
          ? entity.group.userData.animations
          : null);
      const clips = entity.animationClips || groupClips || fallbackClips;
      if (!clips || clips.length === 0) return;

      const mixerRoot = entity.group.userData.animRoot || entity.group;
      const mixer = new THREE.AnimationMixer(mixerRoot);
      const actions = Object.create(null);
      for (let i = 0; i < clips.length; i++) {
        const clip = clips[i];
        if (!clip) continue;
        actions[(clip.name || '').toLowerCase()] = mixer.clipAction(clip);
      }

      const idleAct = findBestClipAction(actions, ['idle', 'idle1', 'stand', 'breathe'], ['hitreact', 'toidle', 'jump']);
      const walkAct = findBestClipAction(actions, ['walk', 'walk1', 'trot', 'move'], ['back']);
      const runAct = findBestClipAction(actions, ['run', 'gallop', 'sprint', 'fast'], ['jump', 'toidle']);
      const gallopAct = findBestClipAction(actions, ['gallop', 'run', 'sprint'], ['jump', 'toidle']);
      const attackAct = findBestClipAction(actions, ['attack', 'bite', 'punch', 'slash', 'claw', 'headbutt', 'strike'], []);
      const deathAct = findBestClipAction(actions, ['death', 'die'], []);

      entity.resolvedActions = {
        idle: idleAct,
        walk: walkAct || idleAct,
        run: runAct || walkAct || idleAct,
        gallop: gallopAct || runAct || walkAct || idleAct,
        attack: attackAct || walkAct || idleAct,
        death: deathAct
      };
      entity.hasDeathClip = !!deathAct;
      entity.animationMixer = mixer;
      entity.animationActions = actions;
      animationMixers.push(entity);
      setEntityAnimation(entity, 'Idle');
    }

    function setEntityAnimation(entity, stateName) {
      const actions = entity.animationActions;
      if (!actions) return;
      if (entity.animationState === stateName) return;

      const lower = stateName.toLowerCase();
      let action = (entity.resolvedActions && entity.resolvedActions[lower]) || actions[lower];

      if (!action) {
        action = findBestClipAction(actions, [lower], []);
      }

      if (!action && entity.resolvedActions) action = entity.resolvedActions.idle;
      if (!action) {
        const keys = Object.keys(actions);
        if (keys.length > 0) action = actions[keys[0]];
      }
      if (!action) return;

      entity.animationState = stateName;
      if (entity.currentAnimationAction === action) {
        if (stateName === 'Attack' || stateName === 'Death') {
          action.reset();
          action.play();
        }
        return;
      }

      if (entity.currentAnimationAction) {
        entity.currentAnimationAction.fadeOut(0.18);
      }

      action.reset();
      action.setEffectiveWeight(1);
      action.fadeIn(0.18);
      if (stateName === 'Attack' || stateName === 'Death') {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      } else {
        action.setLoop(THREE.LoopRepeat, Infinity);
        action.clampWhenFinished = false;
      }
      action.play();
      entity.currentAnimationAction = action;
    }

    function setEntityShadowCasting(entity, enabled) {
      if (entity._shadowCastState === enabled) return;
      entity._shadowCastState = enabled;
      const root = entity.group.userData.normalizedWrapper || entity.group;
      root.traverse((n) => {
        if (n.isMesh && !n.userData.neverCastShadow) {
          n.castShadow = enabled;
        }
      });
    }

    function updateAnimationMixers(dt) {
      const px = playerRig.position.x;
      const py = playerRig.position.y;
      const pz = playerRig.position.z;

      for (let i = 0; i < animationMixers.length; i++) {
        const entity = animationMixers[i];
        if (!entity.group || !entity.group.visible) continue;

        const ex = entity.group.position.x;
        const ey = entity.group.position.y;
        const ez = entity.group.position.z;
        const dx = ex - px;
        const dz = ez - pz;
        const distSq = dx * dx + dz * dz;

        const wrapper = entity.group.userData.normalizedWrapper;
        const undergroundHidden = ey < -3.0 && py > -1.4;
        let maxCullDistSq = 62 * 62;
        if (entity.kind === 'boss') {
          maxCullDistSq = 120 * 120;
        } else if (entity.kind === 'horse') {
          maxCullDistSq = 88 * 88;
        } else if (entity.kind === 'npc') {
          // Skredder og børsemaker står inne i butikkene sine; sheriffen står ute på gata
          maxCullDistSq = Math.abs(ex) > 5.0 ? 46 * 46 : 78 * 78;
        }
        const shouldShowMesh = !undergroundHidden && distSq <= maxCullDistSq;

        if (wrapper && wrapper.visible !== shouldShowMesh) {
          wrapper.visible = shouldShowMesh;
        }
        if (!shouldShowMesh) continue;

        // Kun karakterer/dyr innenfor 22 meter trenger ekte retningsbestemt skyggekart (fjernere bruker rask kontaktsygge på bakken)
        setEntityShadowCasting(entity, distSq <= 22 * 22);

        if (!entity.animationMixer) continue;
        if (distSq <= 24 * 24) {
          entity.animationMixer.update(dt + (entity._animAccumDt || 0));
          entity._animAccumDt = 0;
        } else if (distSq <= 56 * 56) {
          entity._animAccumDt = (entity._animAccumDt || 0) + dt;
          if (entity._animAccumDt >= 0.052) {
            entity.animationMixer.update(entity._animAccumDt);
            entity._animAccumDt = 0;
          }
        }
      }
    }

    // --- 8h. Opprett og plasser skapninger i alle 8 regioner (følger terrenghøyden) ---
    const deerList = [];
    const wolfList = [];
    const bearList = [];
    const banditList = [];
    const nightEnemies = [];

    const SILVERPINE_BOUNDS = { minX: -195, maxX: -90, minZ: -192, maxZ: -90 };
    const PLAINS_BOUNDS = { minX: -195, maxX: -82, minZ: 82, maxZ: 192 };
    const WIDE_NORTH_BOUNDS = { minX: -195, maxX: 185, minZ: -195, maxZ: -26 };
    const MILL_BOUNDS = { minX: -28, maxX: 32, minZ: -198, maxZ: -150 };
    const CALDERA_BOUNDS = { minX: 148, maxX: 198, minZ: 36, maxZ: 88 };

    const deerHomes = [
      { x: -12, z: -34, whiteStag: false },
      { x: 10, z: -46, whiteStag: false },
      { x: -8, z: -60, whiteStag: false },
      { x: 18, z: -66, whiteStag: false },
      { x: -16, z: -96, whiteStag: false },
      { x: 12, z: -116, whiteStag: false },
      // 2 Legendariske Hvite Kronhjorter på NV Silverpine Peak
      { x: -136, z: -146, whiteStag: true, bounds: SILVERPINE_BOUNDS },
      { x: -156, z: -128, whiteStag: true, bounds: SILVERPINE_BOUNDS }
    ];

    function chooseDeerTarget(deer) {
      const home = deer.home;
      const b = deer.bounds || FOREST_BOUNDS;
      deer.wanderTarget.set(
        THREE.MathUtils.clamp(home.x + (Math.random() - 0.5) * 22, b.minX, b.maxX),
        0,
        THREE.MathUtils.clamp(home.z + (Math.random() - 0.5) * 22, b.minZ, b.maxZ)
      );
    }

    function createDeerAt(x, z, opts = {}) {
      const isWhiteStag = !!opts.whiteStag;
      const group = (isWhiteStag && createWhiteStagModel) ? createWhiteStagModel() : createDeerModel();
      group.position.set(x, getTerrainHeight(x, z), z);
      group.rotation.y = Math.random() * Math.PI * 2;
      scene.add(group);

      const maxHp = isWhiteStag ? 5 : 2;
      const deer = {
        kind: 'deer',
        isWhiteStag,
        bounds: opts.bounds || FOREST_BOUNDS,
        group,
        alive: true,
        hp: maxHp,
        maxHp,
        state: 'wander',
        home: new THREE.Vector3(x, 0, z),
        wanderTarget: new THREE.Vector3(),
        wanderPause: Math.random() * 2,
        fleeTimer: 0,
        respawnTimer: 0,
        deathTimer: 0,
        stride: Math.random() * Math.PI * 2
      };

      chooseDeerTarget(deer);
      registerEntityAnimations(deer, quadrupedAnimationClips);
      deerList.push(deer);
    }

    const wolfHomes = [
      { x: -18, z: -48, bounds: FOREST_BOUNDS },
      { x: 15, z: -36, bounds: FOREST_BOUNDS },
      { x: -22, z: -92, bounds: FOREST_BOUNDS },
      { x: 20, z: -108, bounds: FOREST_BOUNDS },
      // Fjellpumaer (Mountain Cougars) & Alfa-ulver (Alpha Direwolves)
      { x: -126, z: -118, isCougar: true, bounds: SILVERPINE_BOUNDS },
      { x: -158, z: -148, isCougar: true, bounds: SILVERPINE_BOUNDS },
      { x: 66, z: -98, isCougar: true, bounds: WIDE_NORTH_BOUNDS },
      { x: -148, z: -124, isAlphaWolf: true, bounds: SILVERPINE_BOUNDS },
      { x: -132, z: -160, isAlphaWolf: true, bounds: SILVERPINE_BOUNDS },
      { x: -28, z: -128, isAlphaWolf: true, bounds: WIDE_NORTH_BOUNDS },
      // Frostfang Timber Mill vaktulver + Diablo Caldera Hellhounds
      { x: -9, z: -167, isAlphaWolf: true, bounds: MILL_BOUNDS },
      { x: 12, z: -183, isAlphaWolf: true, bounds: MILL_BOUNDS },
      { x: 165, z: 55, isHellhound: true, bounds: CALDERA_BOUNDS },
      { x: 184, z: 65, isHellhound: true, bounds: CALDERA_BOUNDS },
      { x: 174, z: 74, isHellhound: true, bounds: CALDERA_BOUNDS }
    ];

    function chooseWolfTarget(wolf) {
      const home = wolf.home;
      const b = wolf.bounds || FOREST_BOUNDS;
      wolf.wanderTarget.set(
        THREE.MathUtils.clamp(home.x + (Math.random() - 0.5) * 18, b.minX, b.maxX),
        0,
        THREE.MathUtils.clamp(home.z + (Math.random() - 0.5) * 18, b.minZ, b.maxZ)
      );
    }

    function createWolfAt(x, z, opts = {}) {
      const isCougar = !!opts.isCougar;
      const isAlphaWolf = !!opts.isAlphaWolf;
      const isHellhound = !!opts.isHellhound;
      const group = (isHellhound && createHellhoundModel)
        ? createHellhoundModel()
        : ((isCougar && createCougarModel)
          ? createCougarModel()
          : ((isAlphaWolf && createAlphaDirewolfModel) ? createAlphaDirewolfModel() : createWolfModel()));
      group.position.set(x, getTerrainHeight(x, z), z);
      group.rotation.y = Math.random() * Math.PI * 2;
      scene.add(group);

      const maxHp = isHellhound ? 7 : (isAlphaWolf ? 5 : (isCougar ? 4 : 2));
      const wolf = {
        kind: 'wolf',
        isCougar,
        isAlphaWolf,
        isHellhound,
        bounds: opts.bounds || FOREST_BOUNDS,
        group,
        alive: true,
        hp: maxHp,
        maxHp,
        state: 'patrol',
        home: new THREE.Vector3(x, 0, z),
        wanderTarget: new THREE.Vector3(),
        wanderPause: Math.random() * 2,
        attackCooldown: 0,
        respawnTimer: 0,
        deathTimer: 0,
        stride: Math.random() * Math.PI * 2,
        hidingTimer: 0,
        lostTrail: false
      };

      chooseWolfTarget(wolf);
      registerEntityAnimations(wolf, quadrupedAnimationClips);
      wolfList.push(wolf);
    }

    // --- Tungt vilt: Grizzlybjørn i Whispering Woods + Præriebison på SV Thunder Plains ---
    const bearHomes = [
      { x: -14, z: -96, isBison: false, bounds: { minX: FOREST_BOUNDS.minX, maxX: FOREST_BOUNDS.maxX, minZ: -142, maxZ: -62 } },
      { x: 16, z: -122, isBison: false, bounds: { minX: FOREST_BOUNDS.minX, maxX: FOREST_BOUNDS.maxX, minZ: -142, maxZ: -62 } },
      { x: -122, z: 118, isBison: true, bounds: PLAINS_BOUNDS },
      { x: -152, z: 122, isBison: true, bounds: PLAINS_BOUNDS },
      { x: -128, z: 152, isBison: true, bounds: PLAINS_BOUNDS },
      { x: -158, z: 148, isBison: true, bounds: PLAINS_BOUNDS },
      // Boss #6 ved Frostfang Timber Mill i Nord: Old Goliath (Elder Kodiak Boss!)
      { x: 2.0, z: -170.5, isOldGoliath: true, bounds: MILL_BOUNDS }
    ];

    function chooseBearTarget(bear) {
      const home = bear.home;
      const b = bear.bounds || FOREST_BOUNDS;
      bear.wanderTarget.set(
        THREE.MathUtils.clamp(home.x + (Math.random() - 0.5) * 20, b.minX, b.maxX),
        0,
        THREE.MathUtils.clamp(home.z + (Math.random() - 0.5) * 20, b.minZ, b.maxZ)
      );
    }

    function createBearAt(x, z, opts = {}) {
      const isBison = !!opts.isBison;
      const isOldGoliath = !!opts.isOldGoliath;
      const group = (isOldGoliath && createElderKodiakBossModel)
        ? createElderKodiakBossModel()
        : ((isBison && createBisonModel) ? createBisonModel() : createBearModel());
      group.position.set(x, getTerrainHeight(x, z), z);
      group.rotation.y = Math.random() * Math.PI * 2;
      scene.add(group);

      const maxHp = isOldGoliath ? 52 : (isBison ? 9 : 6);
      const bear = {
        kind: 'bear',
        isBison,
        isOldGoliath,
        bounds: opts.bounds || { minX: -148, maxX: 148, minZ: -148, maxZ: -26 },
        group,
        alive: true,
        hp: maxHp,
        maxHp,
        state: 'patrol',
        roared: false,
        home: new THREE.Vector3(x, 0, z),
        wanderTarget: new THREE.Vector3(),
        wanderPause: Math.random() * 2,
        attackCooldown: 0,
        respawnTimer: 0,
        deathTimer: 0,
        stride: Math.random() * Math.PI * 2,
        hidingTimer: 0,
        lostTrail: false
      };

      chooseBearTarget(bear);
      registerEntityAnimations(bear, quadrupedAnimationClips);
      bearList.push(bear);
    }

    // --- Banditter i byen, Crimson Canyon, Formann Slade, Tog-skarpskyttere, Fort Rattlesnake & Brimstone Ghost Town ---
    const banditDefs = [
      { pos: new THREE.Vector3(-28, 0, 4), isCaptain: false, faceX: 0, faceZ: 8 },
      { pos: new THREE.Vector3(32, 0, -16), isCaptain: false, faceX: 0, faceZ: 0 },
      { pos: new THREE.Vector3(68, 0, -5.5), isCaptain: false, faceX: 40, faceZ: -1.5 },
      { pos: new THREE.Vector3(80, 0, 6.2), isCaptain: false, faceX: 60, faceZ: -1.5 },
      { pos: new THREE.Vector3(88, 0, -7.2), isCaptain: false, faceX: 70, faceZ: -1.5 },
      { pos: new THREE.Vector3(96, 0, 5.0), isCaptain: false, faceX: 78, faceZ: -1.5 },
      { pos: new THREE.Vector3(107, 0, -1.5), isCaptain: true, faceX: 75, faceZ: -1.5 },
      // Level 4 Boss: Formann Slade innerst i Den forlatte Gullgruven (x = 158, z = -1.5)
      { pos: new THREE.Vector3(158, 0, -1.5), isCaptain: false, isForemanSlade: true, faceX: 124, faceZ: -1.5 },
      // Level 5: 4 Tog-skarpskyttere ved Det Pansrede Damptoget (z = +75)
      { pos: new THREE.Vector3(-15.5, 0, 72.0), isCaptain: false, isTrainSniper: true, faceX: 0, faceZ: 45 },
      { pos: new THREE.Vector3(-3.0, 0, 78.2), isCaptain: false, isTrainSniper: true, faceX: 0, faceZ: 55 },
      { pos: new THREE.Vector3(7.5, 0, 71.8), isCaptain: false, isTrainSniper: true, faceX: 4, faceZ: 45 },
      { pos: new THREE.Vector3(17.4, 0, 74.8), isCaptain: false, isTrainSniper: true, customGroundY: 1.46, faceX: 12, faceZ: 60 },
      // Level 11–12: Fort Rattlesnake i Sunscorch Badlands (NØ: 5 Fort-desperadoer + General Cortez Boss!)
      { pos: new THREE.Vector3(132.5, 0, -121.0), isFortDesperado: true, faceX: 120, faceZ: -105 },
      { pos: new THREE.Vector3(147.5, 0, -121.0), isFortDesperado: true, faceX: 125, faceZ: -105 },
      { pos: new THREE.Vector3(134.5, 0, -130.5), isFortDesperado: true, faceX: 140, faceZ: -120 },
      { pos: new THREE.Vector3(145.5, 0, -130.5), isFortDesperado: true, faceX: 140, faceZ: -120 },
      { pos: new THREE.Vector3(135.0, 0, -138.0), isFortDesperado: true, faceX: 140, faceZ: -126 },
      { pos: new THREE.Vector3(140.0, 0, -136.2), isGeneralCortez: true, faceX: 140, faceZ: -120 },
      // Level 13–14: Brimstone Ghost Town i Devil's Basin (SØ: 4 Brimstone-plyndrere + The Brimstone Marshal Boss!)
      { pos: new THREE.Vector3(128.0, 0, 133.5), isBrimstoneRaider: true, faceX: 112, faceZ: 125 },
      { pos: new THREE.Vector3(135.5, 0, 139.5), isBrimstoneRaider: true, faceX: 125, faceZ: 136 },
      { pos: new THREE.Vector3(146.0, 0, 132.5), isBrimstoneRaider: true, faceX: 135, faceZ: 136 },
      { pos: new THREE.Vector3(151.5, 0, 139.0), isBrimstoneRaider: true, faceX: 138, faceZ: 136 },
      { pos: new THREE.Vector3(142.5, 0, 136.0), isBrimstoneMarshal: true, faceX: 125, faceZ: 136 },
      // Diablo Caldera (Øst-SØ): 2 Obsidian-plyndrere + Boss #7 El Fuego!
      { pos: new THREE.Vector3(167.0, 0, 66.5), isCalderaRaider: true, isBrimstoneRaider: true, faceX: 150, faceZ: 55 },
      { pos: new THREE.Vector3(182.5, 0, 55.0), isCalderaRaider: true, isBrimstoneRaider: true, faceX: 165, faceZ: 55 },
      { pos: new THREE.Vector3(178.5, 0, 62.0), isElFuego: true, faceX: 155, faceZ: 62 },
      // Raven's Roost Observatory (Vest-NV): 3 Spøkelsesskyttere + Boss #8 Blackfeather!
      { pos: new THREE.Vector3(-166.5, 0, -61.5), isObservatoryOutlaw: true, isFortDesperado: true, faceX: -145, faceZ: -55 },
      { pos: new THREE.Vector3(-183.5, 0, -63.5), isObservatoryOutlaw: true, isFortDesperado: true, faceX: -165, faceZ: -60 },
      { pos: new THREE.Vector3(-174.5, 0, -76.5), isObservatoryOutlaw: true, isFortDesperado: true, faceX: -165, faceZ: -66 },
      { pos: new THREE.Vector3(-176.0, 0, -69.5), isBlackfeather: true, faceX: -155, faceZ: -62 }
    ];

    function createBanditFromDef(def, index) {
      let group;
      if (def.isElFuego && createElFuegoBossModel) {
        group = createElFuegoBossModel();
      } else if (def.isBlackfeather && createBlackfeatherBossModel) {
        group = createBlackfeatherBossModel();
      } else if (def.isGeneralCortez && createGeneralCortezModel) {
        group = createGeneralCortezModel();
      } else if (def.isBrimstoneMarshal && createBrimstoneMarshalModel) {
        group = createBrimstoneMarshalModel();
      } else if (def.isForemanSlade && createForemanSladeModel) {
        group = createForemanSladeModel();
      } else if (def.isCaptain) {
        group = createBanditCaptainModel();
      } else if (def.isFortDesperado && createFortDesperadoModel) {
        group = createFortDesperadoModel();
      } else if (def.isBrimstoneRaider && createBrimstoneRaiderModel) {
        group = createBrimstoneRaiderModel();
      } else {
        group = createBanditModel();
      }
      const spawnGrounded = def.pos.clone();
      spawnGrounded.y = def.customGroundY !== undefined
        ? def.customGroundY
        : getTerrainHeight(spawnGrounded.x, spawnGrounded.z);
      group.position.copy(spawnGrounded);
      faceToward(group, def.faceX, def.faceZ);
      scene.add(group);

      const baseHp = def.isElFuego
        ? 56
        : (def.isBlackfeather
          ? 54
          : (def.isBrimstoneMarshal
            ? 34
            : (def.isGeneralCortez
              ? 26
              : (def.isForemanSlade
                ? 12
                : (def.isCaptain
                  ? 8
                  : (def.isBrimstoneRaider ? 6 : (def.isFortDesperado ? 5 : (def.isTrainSniper ? 4 : 3))))))));
      const maxHp = Math.round(baseHp * getPrestigeHpMult());
      const bandit = {
        kind: 'bandit',
        isCaptain: !!def.isCaptain,
        isForemanSlade: !!def.isForemanSlade,
        isTrainSniper: !!def.isTrainSniper,
        isFortDesperado: !!def.isFortDesperado,
        isGeneralCortez: !!def.isGeneralCortez,
        isBrimstoneRaider: !!def.isBrimstoneRaider,
        isBrimstoneMarshal: !!def.isBrimstoneMarshal,
        isElFuego: !!def.isElFuego,
        isBlackfeather: !!def.isBlackfeather,
        isCalderaRaider: !!def.isCalderaRaider,
        isObservatoryOutlaw: !!def.isObservatoryOutlaw,
        baseHp,
        customGroundY: def.customGroundY,
        group,
        muzzle: group.userData.muzzle,
        alive: true,
        hp: maxHp,
        maxHp,
        active: true,
        cooldown: 1.2 + (index % 4) * 0.4,
        spawn: spawnGrounded,
        baseYaw: group.rotation.y,
        faceX: def.faceX,
        faceZ: def.faceZ,
        deathTimer: 0,
        attackAnimTimer: 0
      };

      registerEntityAnimations(bandit, banditAnimationClips);
      banditList.push(bandit);
    }

    // --- 8 Nattmonstre + 3 Katakombe-voktere + 3 Brimstone-gjengangere + 4 Wendigo-skyggerovdyr ---
    const nightSpawnPoints = [
      new THREE.Vector3(-30, 0, -8),
      new THREE.Vector3(30, 0, -4),
      new THREE.Vector3(-20, 0, -48),
      new THREE.Vector3(18, 0, -54),
      new THREE.Vector3(-74, 0, -6),
      new THREE.Vector3(-86, 0, 6.5),
      new THREE.Vector3(-98, 0, -7),
      new THREE.Vector3(-108, 0, 6),
      new THREE.Vector3(-146, -6.5, -5.5),
      new THREE.Vector3(-154, -6.5, 3.5),
      new THREE.Vector3(-162, -6.5, -1.5),
      // Index 11..13: Brimstone Revenants (aktive dag & natt i SØ Brimstone Ghost Town!)
      new THREE.Vector3(132, 0, 143),
      new THREE.Vector3(148, 0, 128),
      new THREE.Vector3(154, 0, 144),
      // Index 14..17: Wendigo Stalkers (aktive dag & natt ved SV Steinringen / dyp skog!)
      new THREE.Vector3(-128, 0, 142),
      new THREE.Vector3(-152, 0, 130),
      new THREE.Vector3(-142, 0, 152),
      new THREE.Vector3(-145, 0, -148),
      // Index 18..20: Dead Man's Oasis voktere + Boss #5 Sandwraith King (Sør: x=-6, z=168)!
      new THREE.Vector3(-16, 0, 163),
      new THREE.Vector3(4, 0, 163),
      new THREE.Vector3(-6, 0, 173.5)
    ];

    function chooseNightWanderAwayTarget(enemy) {
      const awayX = enemy.group.position.x - safeHouseCenterWorld.x;
      const awayZ = enemy.group.position.z - safeHouseCenterWorld.z;
      const baseAngle = (awayX * awayX + awayZ * awayZ > 0.25)
        ? Math.atan2(awayZ, awayX)
        : (Math.random() * Math.PI * 2);
      const spreadAngle = baseAngle + (Math.random() - 0.5) * 1.45;
      const dist = 34 + Math.random() * 26;
      const tx = THREE.MathUtils.clamp(safeHouseCenterWorld.x + Math.cos(spreadAngle) * dist, -205, 205);
      const tz = THREE.MathUtils.clamp(safeHouseCenterWorld.z + Math.sin(spreadAngle) * dist, -205, 205);
      enemy.wanderTarget.set(tx, 0, tz);
    }

    function createNightEnemyAt(index) {
      const isCatacomb = index >= 8 && index <= 10;
      const isBrimstoneRevenant = index >= 11 && index <= 13;
      const isWendigoStalker = index >= 14 && index <= 17;
      const isOasisStalker = index === 18 || index === 19;
      const isSandwraithBoss = index === 20;
      const isAlwaysActiveSurface = isBrimstoneRevenant || isWendigoStalker || isOasisStalker || isSandwraithBoss;

      let group;
      if (isSandwraithBoss && createSandwraithBossModel) {
        group = createSandwraithBossModel();
      } else if (isCatacomb && createCatacombGuardianModel) {
        group = createCatacombGuardianModel();
      } else if ((isBrimstoneRevenant || isOasisStalker) && createBrimstoneRevenantModel) {
        group = createBrimstoneRevenantModel();
      } else if (isWendigoStalker && createWendigoStalkerModel) {
        group = createWendigoStalkerModel();
      } else {
        group = createNightEnemyModel();
      }
      const sp = nightSpawnPoints[index];
      const spawnY = isCatacomb ? -6.5 : getTerrainHeight(sp.x, sp.z);
      group.position.set(sp.x, spawnY, sp.z);
      group.visible = isCatacomb || isAlwaysActiveSurface;
      scene.add(group);

      const baseHp = isSandwraithBoss ? 48 : (isWendigoStalker ? 9 : ((isBrimstoneRevenant || isOasisStalker) ? 7 : (isCatacomb ? 5 : 3)));
      const maxHp = Math.round(baseHp * getPrestigeHpMult());
      const enemy = {
        kind: 'night',
        isCatacombGuardian: isCatacomb,
        isBrimstoneRevenant,
        isWendigoStalker,
        isOasisStalker,
        isSandwraithBoss,
        isAlwaysActiveSurface,
        baseHp,
        group,
        alive: isCatacomb || isAlwaysActiveSurface,
        hp: maxHp,
        maxHp,
        burning: false,
        burnTimer: 0,
        igniteTimer: 0,
        igniteTick: 0,
        attackCooldown: 0,
        spawnIndex: index,
        deathTimer: 0,
        respawnTimer: 0,
        hidingTimer: 0,
        lostTrail: false,
        wanderTarget: new THREE.Vector3(sp.x, spawnY, sp.z)
      };

      registerEntityAnimations(enemy, nightAnimationClips);
      nightEnemies.push(enemy);
    }

    // --- Level 6: 2 Glødende Sølvrelikvier på Boot Hill Kirkegård ---
    const silverRelics = [];
    const silverRelicHitMeshes = [];
    if (createSilverRelicMesh) {
      [
        { x: -84.0, z: -8.5 },
        { x: -106.0, z: 7.2 }
      ].forEach((posSpec) => {
        const { group, hitMesh } = createSilverRelicMesh();
        const ry = getTerrainHeight(posSpec.x, posSpec.z);
        group.position.set(posSpec.x, ry, posSpec.z);
        scene.add(group);
        const relicEntry = { group, hitMesh, collected: false };
        hitMesh.userData.relicEntry = relicEntry;
        silverRelics.push(relicEntry);
        silverRelicHitMeshes.push(hitMesh);
      });
    }

    // --- Ridbar Western Mustang (Hest) utenfor Saloonen ---
    const horseHomePos = new THREE.Vector3(-3.6, getTerrainHeight(-3.6, 9.6), 9.6);
    const horseGroup = createHorseModel ? createHorseModel() : new THREE.Group();
    horseGroup.position.copy(horseHomePos);
    horseGroup.rotation.y = Math.PI * 0.15;
    scene.add(horseGroup);
    const horseEntity = {
      kind: 'horse',
      group: horseGroup,
      calling: false,
      targetPos: horseHomePos.clone(),
      stride: 0,
      hoofTimer: 0
    };
    registerEntityAnimations(horseEntity, null);

    function callHorseToPlayer() {
      const yaw = playerRig.rotation.y;
      const sideX = Math.cos(yaw) * 2.8 - Math.sin(yaw) * 1.8;
      const sideZ = -Math.sin(yaw) * 2.8 - Math.cos(yaw) * 1.8;
      const tx = THREE.MathUtils.clamp(playerRig.position.x + sideX, -1172, 1172);
      const tz = THREE.MathUtils.clamp(playerRig.position.z + sideZ, -1172, 1172);
      if (playerRig.position.y < -1.8) {
        horseEntity.targetPos.set(-112.0, getTerrainHeight(-112.0, -1.5), -1.5);
      } else {
        horseEntity.targetPos.set(tx, getTerrainHeight(tx, tz), tz);
      }
      resolveWallCollisions(horseEntity.targetPos, 0.75, true);
      horseEntity.calling = true;
      if (playHorseWhistleSound) playHorseWhistleSound();
    }

    // --- Sluttboss: Lord Malakor ved Boot Hill Ruined Chapel (-113, z = -1.5) ---
    const bossHomePos = new THREE.Vector3(-112.5, getTerrainHeight(-112.5, -1.5), -1.5);
    const bossGroup = createBossVampireModel();
    bossGroup.position.copy(bossHomePos);
    faceToward(bossGroup, -70, -1.5);
    bossGroup.visible = false;
    scene.add(bossGroup);

    const bossEnemy = {
      kind: 'boss',
      group: bossGroup,
      alive: false,
      active: false,
      summonedByAltar: false,
      hp: 30,
      maxHp: 30,
      burning: false,
      igniteTimer: 0,
      igniteTick: 0,
      attackCooldown: 1.2,
      waveCooldown: 3.4,
      summonStage: 0,
      attackAnimTimer: 0
    };
    registerEntityAnimations(bossEnemy, nightAnimationClips);

    // --- Ur-Boss i SV Steinringen (Level 16+ / Prestisje): The Ancient Wendigo (-140, 136) ---
    const wendigoBossHomePos = new THREE.Vector3(-135.5, getTerrainHeight(-135.5, 136.0), 136.0);
    const wendigoBossGroup = createAncientWendigoBossModel ? createAncientWendigoBossModel() : createBossVampireModel();
    wendigoBossGroup.position.copy(wendigoBossHomePos);
    faceToward(wendigoBossGroup, -110, 110);
    wendigoBossGroup.visible = false;
    scene.add(wendigoBossGroup);

    const wendigoBossEnemy = {
      kind: 'boss',
      isWendigoBoss: true,
      group: wendigoBossGroup,
      alive: false,
      active: false,
      hp: 42,
      maxHp: 42,
      igniteTimer: 0,
      igniteTick: 0,
      attackCooldown: 1.2,
      waveCooldown: 3.4,
      attackAnimTimer: 0
    };
    registerEntityAnimations(wendigoBossEnemy, nightAnimationClips);

    function syncWendigoBossHealthBarUI() {
      storyState.wendigoBossHp = wendigoBossEnemy.hp;
      storyState.wendigoBossMaxHp = wendigoBossEnemy.maxHp;
      if (wendigoBossEnemy.group.userData.updateBossHealthBar) {
        wendigoBossEnemy.group.userData.updateBossHealthBar(
          wendigoBossEnemy.hp,
          wendigoBossEnemy.maxHp,
          L().wendigoBossBarTitle || 'ANCIENT WENDIGO'
        );
      }
    }

    function awakenAncientWendigo(forceSummon = false) {
      if (storyState.wendigoBossDefeated && !forceSummon) return;
      if (wendigoBossEnemy.alive && wendigoBossEnemy.group.visible) return;
      storyState.wendigoBossDefeated = false;
      wendigoBossEnemy.maxHp = Math.round(42 * getPrestigeHpMult());
      wendigoBossEnemy.hp = wendigoBossEnemy.maxHp;
      wendigoBossEnemy.alive = true;
      wendigoBossEnemy.active = true;
      wendigoBossEnemy.igniteTimer = 0;
      wendigoBossEnemy.attackCooldown = 1.1;
      wendigoBossEnemy.waveCooldown = 3.2;
      wendigoBossEnemy.group.position.copy(wendigoBossHomePos);
      resolveWallCollisions(wendigoBossEnemy.group.position, BOSS_RADIUS, true);
      wendigoBossEnemy.group.position.y = getTerrainHeight(wendigoBossEnemy.group.position.x, wendigoBossEnemy.group.position.z);
      wendigoBossEnemy.group.scale.setScalar(1);
      wendigoBossEnemy.group.visible = true;
      faceToward(wendigoBossEnemy.group, playerRig.position.x, playerRig.position.z);
      setEntityAnimation(wendigoBossEnemy, 'Idle');
      storyState.wendigoBossActive = true;
      syncWendigoBossHealthBarUI();
      updateStatusUI();
      playBearRoarSound();
    }

    const summonWendigoFromObelisk = () => {
      awakenAncientWendigo(true);
    };

    function getBanditBossTitle(b) {
      const d = L();
      if (b.isElFuego) return d.elFuegoBarTitle || 'EL FUEGO';
      if (b.isBlackfeather) return d.blackfeatherBarTitle || 'BLACKFEATHER';
      if (b.isGeneralCortez) return d.cortezBarTitle || 'GENERAL CORTEZ';
      return d.marshalBarTitle || 'BRIMSTONE MARSHAL';
    }

    function syncBossHealthBarUI() {
      storyState.bossHp = bossEnemy.hp;
      storyState.bossMaxHp = bossEnemy.maxHp;
      if (bossEnemy.group.userData.updateBossHealthBar) {
        bossEnemy.group.userData.updateBossHealthBar(
          bossEnemy.hp,
          bossEnemy.maxHp,
          L().bossBarTitle || 'LORD MALAKOR'
        );
      }
      syncWendigoBossHealthBarUI();
      for (let i = 0; i < banditList.length; i++) {
        const b = banditList[i];
        if (b.group && b.group.userData.updateBossHealthBar) {
          b.group.userData.updateBossHealthBar(b.hp, b.maxHp, getBanditBossTitle(b));
        }
      }
      for (let i = 0; i < bearList.length; i++) {
        const br = bearList[i];
        if (br.group && br.group.userData.updateBossHealthBar) {
          br.group.userData.updateBossHealthBar(br.hp, br.maxHp, L().goliathBarTitle || 'OLD GOLIATH');
        }
      }
      for (let i = 0; i < nightEnemies.length; i++) {
        const ne = nightEnemies[i];
        if (ne.group && ne.group.userData.updateBossHealthBar) {
          ne.group.userData.updateBossHealthBar(ne.hp, ne.maxHp, L().sandwraithBarTitle || 'SANDWRAITH KING');
        }
      }
    }

    function awakenBossMalakor(fromAltar = false) {
      const needFinalMalakor = storyState.currentLevel === 20 && !storyState.ascendedMalakorDefeated;
      if (storyState.bossDefeated && !needFinalMalakor && !fromAltar) return;
      if (bossEnemy.alive && bossEnemy.group.visible) return;

      const baseMalakorHp = (storyState.currentLevel >= 20 || storyState.bossDefeated) ? 60 : 30;
      bossEnemy.maxHp = Math.round(baseMalakorHp * getPrestigeHpMult());
      bossEnemy.alive = true;
      bossEnemy.active = true;
      bossEnemy.summonedByAltar = fromAltar || bossEnemy.summonedByAltar;
      bossEnemy.hp = bossEnemy.maxHp;
      bossEnemy.igniteTimer = 0;
      bossEnemy.igniteTick = 0;
      bossEnemy.attackCooldown = 1.2;
      bossEnemy.waveCooldown = 3.2;
      bossEnemy.summonStage = 0;
      bossEnemy.group.position.copy(bossHomePos);
      resolveWallCollisions(bossEnemy.group.position, BOSS_RADIUS, true);
      bossEnemy.group.position.y = getTerrainHeight(bossEnemy.group.position.x, bossEnemy.group.position.z);
      bossEnemy.group.scale.setScalar(1);
      bossEnemy.group.visible = true;
      faceToward(bossEnemy.group, playerRig.position.x, playerRig.position.z);
      setEntityAnimation(bossEnemy, 'Idle');

      storyState.bossActive = true;
      syncBossHealthBarUI();
      updateStatusUI();
      playBearRoarSound();
    }

    const summonBossFromAltar = () => {
      if (storyState.bossDefeated) {
        // Tillat omkamp hvis spilleren skyter Blodalteret etter fullført historie!
        storyState.bossDefeated = false;
      }
      if (!S.isNight) {
        S.forceNightNow();
      }
      awakenBossMalakor(true);
    };

    const onNightStateChangedBoss = (night) => {
      if (night) {
        const shouldWakeMalakor =
          (!storyState.bossDefeated && (storyState.currentLevel === 8 || playerRig.position.x < -60)) ||
          (storyState.currentLevel === 20 && !storyState.ascendedMalakorDefeated);
        if (shouldWakeMalakor) {
          awakenBossMalakor(false);
        }
      } else if (bossEnemy.alive && !bossEnemy.summonedByAltar) {
        bossEnemy.alive = false;
        bossEnemy.active = false;
        bossEnemy.group.visible = false;
        storyState.bossActive = false;
        updateStatusUI();
      }
    };

    // --- 8i. Respawn, dagsreset og nattspawn ---
    function respawnDeer(deer) {
      const b = deer.bounds || FOREST_BOUNDS;
      let x = 0;
      let z = 0;
      for (let attempt = 0; attempt < 10; attempt++) {
        x = THREE.MathUtils.randFloat(b.minX + 3, b.maxX - 3);
        z = THREE.MathUtils.randFloat(b.minZ + 3, b.maxZ - 3);
        const distance = Math.hypot(x - playerRig.position.x, z - playerRig.position.z);
        if (distance > 15) break;
      }

      deer.alive = true;
      deer.hp = deer.maxHp || 2;
      deer.state = 'wander';
      deer.deathTimer = 0;
      deer.respawnTimer = 0;
      deer.fleeTimer = 0;
      deer.wanderPause = 0.5 + Math.random() * 2;
      deer.home.set(x, 0, z);
      deer.group.position.set(x, getTerrainHeight(x, z), z);
      deer.group.rotation.set(0, Math.random() * Math.PI * 2, 0);
      deer.group.scale.setScalar(deer.isWhiteStag ? 1.18 : 1);
      deer.group.visible = !S.isNight;
      deer.attackAnimTimer = 0;
      if (!deer.animationMixer) animateQuadrupedLegs(deer.group, 0, 0);
      setEntityAnimation(deer, 'Idle');
      chooseDeerTarget(deer);
    }

    function respawnWolf(wolf) {
      const b = wolf.bounds || FOREST_BOUNDS;
      wolf.alive = true;
      wolf.hp = Math.round((wolf.maxHp || 2) * getPrestigeHpMult());
      wolf.state = 'patrol';
      wolf.deathTimer = 0;
      wolf.respawnTimer = 0;
      wolf.attackCooldown = 0;
      wolf.attackAnimTimer = 0;
      wolf.hidingTimer = 0;
      wolf.lostTrail = false;
      wolf.wanderPause = 0.5 + Math.random() * 2;
      const wx = THREE.MathUtils.clamp(wolf.home.x + (Math.random() - 0.5) * 14, b.minX, b.maxX);
      const wz = THREE.MathUtils.clamp(wolf.home.z + (Math.random() - 0.5) * 14, b.minZ, b.maxZ);
      wolf.group.position.set(wx, getTerrainHeight(wx, wz), wz);
      wolf.group.rotation.set(0, Math.random() * Math.PI * 2, 0);
      if (wolf.isAlphaWolf) wolf.group.scale.setScalar(1.28);
      else if (wolf.isHellhound) wolf.group.scale.setScalar(1.22);
      else if (wolf.isCougar) wolf.group.scale.set(1.06, 1.04, 1.12);
      else wolf.group.scale.setScalar(1);
      wolf.group.visible = true;
      if (!wolf.animationMixer) animateQuadrupedLegs(wolf.group, 0, 0);
      setEntityAnimation(wolf, 'Idle');
      chooseWolfTarget(wolf);
    }

    function respawnBear(bear) {
      const b = bear.bounds || { minX: FOREST_BOUNDS.minX, maxX: FOREST_BOUNDS.maxX, minZ: -142, maxZ: -62 };
      bear.alive = true;
      bear.maxHp = Math.round((bear.isOldGoliath ? 52 : (bear.isBison ? 9 : 6)) * getPrestigeHpMult());
      bear.hp = bear.maxHp;
      bear.state = 'patrol';
      bear.roared = false;
      bear.deathTimer = 0;
      bear.respawnTimer = 0;
      bear.attackCooldown = 0;
      bear.attackAnimTimer = 0;
      bear.hidingTimer = 0;
      bear.lostTrail = false;
      bear.wanderPause = 0.8 + Math.random() * 2;
      const bx = THREE.MathUtils.clamp(bear.home.x + (Math.random() - 0.5) * 14, b.minX, b.maxX);
      const bz = THREE.MathUtils.clamp(bear.home.z + (Math.random() - 0.5) * 14, b.minZ, b.maxZ);
      bear.group.position.set(bx, getTerrainHeight(bx, bz), bz);
      bear.group.rotation.set(0, Math.random() * Math.PI * 2, 0);
      if (bear.isOldGoliath) bear.group.scale.setScalar(1.48);
      else if (bear.isBison) bear.group.scale.set(1.14, 1.12, 1.18);
      else bear.group.scale.setScalar(1);
      if (bear.group.userData.updateBossHealthBar) {
        bear.group.userData.updateBossHealthBar(bear.hp, bear.maxHp, L().goliathBarTitle || 'OLD GOLIATH');
      }
      bear.group.visible = true;
      if (!bear.animationMixer) animateQuadrupedLegs(bear.group, 0, 0);
      setEntityAnimation(bear, 'Idle');
      chooseBearTarget(bear);
    }

    function resetBanditsForDay() {
      banditList.forEach((bandit, index) => {
        if (bandit.isCaptain && storyState.captainDefeated && (storyState.prestigeRank || 0) === 0 && storyState.currentLevel < 18) {
          bandit.alive = false;
          bandit.active = false;
          bandit.group.visible = false;
          return;
        }
        bandit.maxHp = Math.round((bandit.baseHp || 3) * getPrestigeHpMult());
        bandit.alive = true;
        bandit.hp = bandit.maxHp;
        const activeAtNightToo =
          bandit.isForemanSlade || bandit.isBrimstoneMarshal ||
          bandit.isGeneralCortez || bandit.isElFuego || bandit.isBlackfeather;
        bandit.active = !S.isNight || activeAtNightToo;
        bandit.deathTimer = 0;
        bandit.attackAnimTimer = 0;
        bandit.cooldown = 1.0 + (index % 4) * 0.38;
        bandit.group.position.copy(bandit.spawn);
        resolveCircleAgainstWalls(bandit.group.position, BANDIT_RADIUS);
        bandit.group.position.y = bandit.customGroundY !== undefined
          ? bandit.customGroundY
          : getTerrainHeight(bandit.group.position.x, bandit.group.position.z);
        bandit.group.rotation.set(0, bandit.baseYaw, 0);
        const sc = bandit.isElFuego
          ? 1.38
          : (bandit.isBrimstoneMarshal
            ? 1.34
            : (bandit.isBlackfeather
              ? 1.32
              : (bandit.isGeneralCortez ? 1.26 : (bandit.isForemanSlade ? 1.22 : (bandit.isCaptain ? 1.14 : 1)))));
        bandit.group.scale.setScalar(sc);
        bandit.group.visible = !S.isNight || activeAtNightToo;
        if (bandit.group.userData.updateBossHealthBar) {
          bandit.group.userData.updateBossHealthBar(bandit.hp, bandit.maxHp, getBanditBossTitle(bandit));
        }
        setEntityAnimation(bandit, 'Idle');
      });
    }

    function spawnNightEnemies() {
      nightEnemies.forEach((enemy, index) => {
        if (enemy.isCatacombGuardian || enemy.isAlwaysActiveSurface) return;
        const point = nightSpawnPosition.copy(nightSpawnPoints[index]);
        point.x += (Math.random() - 0.5) * 4;
        point.z += (Math.random() - 0.5) * 4;

        const dx = point.x - playerRig.position.x;
        const dz = point.z - playerRig.position.z;
        const distance = Math.hypot(dx, dz);
        if (distance < 15) {
          const scale = 15 / Math.max(distance, 0.1);
          point.x = playerRig.position.x + dx * scale;
          point.z = playerRig.position.z + dz * scale;
        }

        point.x = THREE.MathUtils.clamp(point.x, -205, 205);
        point.z = THREE.MathUtils.clamp(point.z, -205, 205);
        point.y = getTerrainHeight(point.x, point.z);

        enemy.maxHp = Math.round((enemy.baseHp || 3) * getPrestigeHpMult());
        enemy.alive = true;
        enemy.hp = enemy.maxHp;
        enemy.burning = false;
        enemy.burnTimer = 0;
        enemy.igniteTimer = 0;
        enemy.igniteTick = 0;
        enemy.attackCooldown = 0.8 + Math.random() * 0.6;
        enemy.deathTimer = 0;
        enemy.attackAnimTimer = 0;
        enemy.hidingTimer = 0;
        enemy.lostTrail = false;
        enemy.group.position.copy(point);
        pushOutOfHidingZone(enemy.group, NIGHT_RADIUS);
        resolveCircleAgainstWalls(enemy.group.position, NIGHT_RADIUS);
        enemy.group.position.y = getTerrainHeight(enemy.group.position.x, enemy.group.position.z);
        enemy.group.rotation.set(0, 0, 0);
        enemy.group.scale.setScalar(1);
        enemy.group.visible = true;
        faceToward(enemy.group, playerRig.position.x, playerRig.position.z);
        setEntityAnimation(enemy, 'Idle');
      });
    }

    function startNightEnemiesBurning() {
      nightEnemies.forEach((enemy) => {
        if (!enemy.group.visible || enemy.isCatacombGuardian || enemy.isAlwaysActiveSurface) return;
        enemy.burning = true;
        enemy.burnTimer = 1.0;
        enemy.igniteTimer = 0;
        enemy.attackCooldown = 999;
        enemy.attackAnimTimer = 0;
        setEntityAnimation(enemy, 'Idle');

        nightBurnStartPosition.copy(enemy.group.position);
        nightBurnStartPosition.y += 0.9;
        spawnVampireAshDissolution(nightBurnStartPosition, 0.85);
      });
    }

    // --- 8j. Skade på skapninger, Sølv-brann (3x mot vampyrer), Grizzlybjørn og Lord Malakor ---
    function computeShotBaseDamage(bulletInfo) {
      const mult = bulletInfo && bulletInfo.dmgMult ? bulletInfo.dmgMult : 1;
      return S.weaponDamage * mult;
    }

    function damageDeer(deer, _dir, bulletInfo, rawOverride = 0) {
      if (!deer.alive) return;
      const dmg = rawOverride > 0 ? rawOverride : computeShotBaseDamage(bulletInfo);
      deer.hp -= dmg;
      playFleshHitSound();

      if (deer.hp > 0) {
        deer.state = 'flee';
        deer.fleeTimer = 5.5;
        return;
      }

      deer.alive = false;
      deer.state = 'dead';
      deer.deathTimer = 1.25;
      deer.respawnTimer = deer.isWhiteStag ? 45 : 20;
      deer.group.rotation.z = 0;
      setEntityAnimation(deer, deer.hasDeathClip ? 'Death' : 'Idle');

      if (deer.isWhiteStag) {
        playerState.food += 3 + (S.extraFoodBonus || 0);
        playerState.pelt += 4 + (S.extraPeltBonus || 0);
        playerState.gold += scaleGoldReward(35);
        storyState.whiteStagsHunted = (storyState.whiteStagsHunted || 0) + 1;
        playGoldPickupSound();
      } else {
        playerState.food += 1 + (S.extraFoodBonus || 0);
        playerState.pelt += 1 + (S.extraPeltBonus || 0);
        playerState.gold += scaleGoldReward(5);
        playCollectSound();
      }
      storyState.act1Deer += 1;
      storyState.totalKills = (storyState.totalKills || 0) + 1;
      recordQuestKill(
        deer.isWhiteStag
          ? ['wild_beast', 'deer_any', 'white_stag', 'deer']
          : ['wild_beast', 'deer_any', 'deer']
      );
      checkStoryProgression();
      updateStatusUI();
      return;
    }

    function damageWolf(wolf, _dir, bulletInfo, rawOverride = 0) {
      if (!wolf.alive) return;
      const dmg = rawOverride > 0 ? rawOverride : computeShotBaseDamage(bulletInfo);
      wolf.hp -= dmg;
      playFleshHitSound();

      if (wolf.hp > 0) {
        wolf.state = 'chase';
        wolf.attackCooldown = Math.min(wolf.attackCooldown, 0.4);
        return;
      }

      wolf.alive = false;
      wolf.deathTimer = 1.25;
      wolf.respawnTimer = (wolf.isAlphaWolf || wolf.isHellhound) ? 30 : 20;
      wolf.group.rotation.z = 0;
      setEntityAnimation(wolf, wolf.hasDeathClip ? 'Death' : 'Idle');

      if (wolf.isHellhound) {
        playerState.pelt += 2 + (S.extraPeltBonus || 0);
        playerState.gold += scaleGoldReward(22);
        storyState.hellhoundsKilled = (storyState.hellhoundsKilled || 0) + 1;
        storyState.eliteKills = (storyState.eliteKills || 0) + 1;
      } else if (wolf.isAlphaWolf) {
        playerState.pelt += 2 + (S.extraPeltBonus || 0);
        playerState.gold += scaleGoldReward(14);
        storyState.alphaWolvesKilled = (storyState.alphaWolvesKilled || 0) + 1;
      } else if (wolf.isCougar) {
        playerState.food += 1 + (S.extraFoodBonus || 0);
        playerState.pelt += 2 + (S.extraPeltBonus || 0);
        playerState.gold += scaleGoldReward(12);
        storyState.cougarsHunted = (storyState.cougarsHunted || 0) + 1;
      } else {
        playerState.pelt += 1 + (S.extraPeltBonus || 0);
        playerState.gold += scaleGoldReward(6);
      }
      storyState.level2Wolves += 1;
      storyState.totalKills = (storyState.totalKills || 0) + 1;
      if (wolf.isHellhound) {
        recordQuestKill(['wild_beast', 'wolf', 'hellhound', 'caldera_foe', 'apex_predator', 'elite_foe', 'deer']);
      } else if (wolf.isAlphaWolf) {
        recordQuestKill(['wild_beast', 'wolf', 'alpha_wolf', 'apex_predator', 'deer']);
      } else if (wolf.isCougar) {
        recordQuestKill(['wild_beast', 'cougar', 'apex_predator', 'deer']);
      } else {
        recordQuestKill(['wild_beast', 'wolf', 'deer']);
      }
      checkStoryProgression();
      updateStatusUI();
      playCollectSound();
    }

    function damageBear(bear, _dir, bulletInfo, rawOverride = 0) {
      if (!bear.alive) return;
      const dmg = rawOverride > 0 ? rawOverride : computeShotBaseDamage(bulletInfo);
      bear.hp = Math.max(0, bear.hp - dmg);
      playFleshHitSound();
      if (bear.group.userData.updateBossHealthBar) {
        bear.group.userData.updateBossHealthBar(bear.hp, bear.maxHp, L().goliathBarTitle || 'OLD GOLIATH');
      }

      if (bear.hp > 0) {
        if (!bear.roared) {
          bear.roared = true;
          playBearRoarSound();
        }
        bear.state = 'chase';
        bear.attackCooldown = Math.min(bear.attackCooldown, 0.5);
        return;
      }

      bear.alive = false;
      bear.deathTimer = 1.3;
      bear.respawnTimer = bear.isOldGoliath ? 72 : 32;
      bear.group.rotation.z = 0;
      setEntityAnimation(bear, bear.hasDeathClip ? 'Death' : 'Idle');

      if (bear.isOldGoliath) {
        playerState.food += 5 + (S.extraFoodBonus || 0);
        playerState.pelt += 5 + (S.extraPeltBonus || 0);
        playerState.gold += scaleGoldReward(125);
        storyState.goliathDefeated = true;
        storyState.grizzlyDefeated = true;
        storyState.eliteKills = (storyState.eliteKills || 0) + 1;
        if (storyState.currentLevel >= 51) storyState.prestigeBosses = (storyState.prestigeBosses || 0) + 1;
        playBossVictoryFanfare();
      } else if (bear.isBison) {
        playerState.food += 4 + (S.extraFoodBonus || 0);
        playerState.pelt += 3 + (S.extraPeltBonus || 0);
        playerState.gold += scaleGoldReward(18);
        storyState.bisonHunted = (storyState.bisonHunted || 0) + 1;
        playGoldPickupSound();
      } else {
        playerState.food += 3 + (S.extraFoodBonus || 0);
        playerState.pelt += 3 + (S.extraPeltBonus || 0);
        playerState.gold += scaleGoldReward(15);
        storyState.grizzlyDefeated = true;
        playGoldPickupSound();
      }
      storyState.act1Deer += 1;
      storyState.totalKills = (storyState.totalKills || 0) + 1;
      recordQuestKill(
        bear.isOldGoliath
          ? ['wild_beast', 'grizzly', 'goliath', 'apex_predator', 'any_boss', 'elite_foe', 'deer']
          : (bear.isBison
            ? ['wild_beast', 'bison', 'deer']
            : ['wild_beast', 'grizzly', 'apex_predator', 'deer'])
      );
      checkStoryProgression();
      updateStatusUI();
    }

    function damageBandit(bandit, _dir, bulletInfo, rawOverride = 0) {
      if (!bandit.alive) return;
      const dmg = rawOverride > 0 ? rawOverride : computeShotBaseDamage(bulletInfo);
      bandit.hp = Math.max(0, bandit.hp - dmg);
      playFleshHitSound();
      if (bandit.group.userData.updateBossHealthBar) {
        bandit.group.userData.updateBossHealthBar(bandit.hp, bandit.maxHp, getBanditBossTitle(bandit));
      }

      if (bandit.hp > 0) return;

      bandit.alive = false;
      bandit.active = false;
      bandit.deathTimer = 1.2;
      bandit.respawnTimer = (
        bandit.isGeneralCortez || bandit.isBrimstoneMarshal ||
        bandit.isElFuego || bandit.isBlackfeather ||
        bandit.isCaptain || bandit.isForemanSlade
      ) ? 75 : 24;
      bandit.group.rotation.z = 0;
      setEntityAnimation(bandit, bandit.hasDeathClip ? 'Death' : 'Idle');

      const banditQuestTags = ['bandit_any', 'combat_any', 'bandit'];
      if (bandit.isElFuego) {
        playerState.gold += scaleGoldReward(140);
        storyState.elFuegoDefeated = true;
        storyState.eliteKills = (storyState.eliteKills || 0) + 1;
        if (storyState.currentLevel >= 51) storyState.prestigeBosses = (storyState.prestigeBosses || 0) + 1;
        banditQuestTags.push('el_fuego', 'caldera_foe', 'elite_foe', 'any_boss');
        playBossVictoryFanfare();
      } else if (bandit.isBlackfeather) {
        playerState.gold += scaleGoldReward(135);
        storyState.blackfeatherDefeated = true;
        storyState.eliteKills = (storyState.eliteKills || 0) + 1;
        if (storyState.currentLevel >= 51) storyState.prestigeBosses = (storyState.prestigeBosses || 0) + 1;
        banditQuestTags.push('blackfeather', 'observatory_foe', 'elite_foe', 'any_boss');
        playBossVictoryFanfare();
      } else if (bandit.isGeneralCortez) {
        playerState.gold += scaleGoldReward(75);
        storyState.cortezDefeated = true;
        storyState.eliteKills = (storyState.eliteKills || 0) + 1;
        if (storyState.currentLevel >= 51) storyState.prestigeBosses = (storyState.prestigeBosses || 0) + 1;
        banditQuestTags.push('cortez', 'fort_bandit', 'elite_foe', 'any_boss');
        playBossVictoryFanfare();
      } else if (bandit.isBrimstoneMarshal) {
        playerState.gold += scaleGoldReward(90);
        storyState.brimstoneMarshalDefeated = true;
        storyState.eliteKills = (storyState.eliteKills || 0) + 1;
        if (storyState.currentLevel >= 51) storyState.prestigeBosses = (storyState.prestigeBosses || 0) + 1;
        banditQuestTags.push('marshal', 'brimstone_foe', 'elite_foe', 'any_boss');
        playBossVictoryFanfare();
      } else if (bandit.isForemanSlade) {
        playerState.gold += scaleGoldReward(50);
        storyState.sladeDefeated = true;
        storyState.eliteKills = (storyState.eliteKills || 0) + 1;
        if (storyState.currentLevel >= 51) storyState.prestigeBosses = (storyState.prestigeBosses || 0) + 1;
        banditQuestTags.push('mine_action', 'elite_foe', 'any_boss');
        playGoldPickupSound();
      } else if (bandit.isFortDesperado) {
        playerState.gold += scaleGoldReward(18);
        storyState.fortBanditsKilled = (storyState.fortBanditsKilled || 0) + 1;
        storyState.eliteKills = (storyState.eliteKills || 0) + 1;
        banditQuestTags.push('fort_bandit', 'elite_foe');
        if (bandit.isObservatoryOutlaw) {
          storyState.observatoryFoesKilled = (storyState.observatoryFoesKilled || 0) + 1;
          banditQuestTags.push('observatory_foe');
        }
      } else if (bandit.isBrimstoneRaider) {
        playerState.gold += scaleGoldReward(22);
        storyState.brimstoneFoesKilled = (storyState.brimstoneFoesKilled || 0) + 1;
        storyState.eliteKills = (storyState.eliteKills || 0) + 1;
        banditQuestTags.push('brimstone_foe', 'elite_foe');
        if (bandit.isCalderaRaider) {
          storyState.calderaFoesKilled = (storyState.calderaFoesKilled || 0) + 1;
          banditQuestTags.push('caldera_foe');
        }
      } else if (bandit.isTrainSniper) {
        playerState.gold += scaleGoldReward(15);
        storyState.trainSnipersKilled += 1;
        banditQuestTags.push('train_sniper', 'elite_foe');
      } else if (bandit.isCaptain) {
        playerState.gold += scaleGoldReward(35);
        storyState.captainDefeated = true;
        storyState.act2Bandits += 1;
        storyState.eliteKills = (storyState.eliteKills || 0) + 1;
        banditQuestTags.push('elite_foe', 'any_boss');
        playGoldPickupSound();
      } else {
        playerState.gold += scaleGoldReward(10);
        storyState.act2Bandits += 1;
        if (bandit.group.position.x > 65 && !banditQuestTags.includes('mine_action')) {
          banditQuestTags.push('mine_action');
        }
      }
      storyState.totalKills = (storyState.totalKills || 0) + 1;
      recordQuestKill(banditQuestTags);
      checkStoryProgression();
      updateStatusUI();
    }

    function killNightEnemy(enemy) {
      enemy.alive = false;
      enemy.igniteTimer = 0;
      enemy.group.visible = false;
      enemy.group.scale.setScalar(1);
      enemy.respawnTimer = enemy.isSandwraithBoss ? 75 : ((enemy.isCatacombGuardian || enemy.isAlwaysActiveSurface) ? 36 : 15);
      setEntityAnimation(enemy, 'Idle');

      nightDeathImpactPosition.copy(enemy.group.position);
      nightDeathImpactPosition.y += 1.0;
      spawnImpact(nightDeathImpactPosition, enemy.isSandwraithBoss ? 0xffd24c : (enemy.isWendigoStalker ? 0x4effa8 : (enemy.isCatacombGuardian ? 0x62ccff : 0xff3a1f)), enemy.isSandwraithBoss ? 1.55 : 0.38);
      spawnVampireAshDissolution(enemy.group.position, enemy.isSandwraithBoss ? 2.1 : 1.0);

      const nightQuestTags = ['night_any', 'combat_any', 'night'];
      if (enemy.isSandwraithBoss) {
        playerState.gold += scaleGoldReward(130);
        playerState.pelt += 3;
        storyState.sandwraithDefeated = true;
        storyState.oasisFoesKilled = (storyState.oasisFoesKilled || 0) + 1;
        storyState.eclipseKills = (storyState.eclipseKills || 0) + 1;
        storyState.eliteKills = (storyState.eliteKills || 0) + 1;
        if (storyState.currentLevel >= 51) storyState.prestigeBosses = (storyState.prestigeBosses || 0) + 1;
        nightQuestTags.push('sandwraith', 'oasis_foe', 'any_boss', 'elite_foe');
        playBossVictoryFanfare();
      } else if (enemy.isOasisStalker) {
        playerState.gold += scaleGoldReward(24);
        storyState.oasisFoesKilled = (storyState.oasisFoesKilled || 0) + 1;
        storyState.eclipseKills = (storyState.eclipseKills || 0) + 1;
        storyState.eliteKills = (storyState.eliteKills || 0) + 1;
        nightQuestTags.push('oasis_foe', 'elite_foe');
      } else if (enemy.isWendigoStalker) {
        playerState.gold += scaleGoldReward(28);
        playerState.pelt += 2;
        storyState.wendigosKilled = (storyState.wendigosKilled || 0) + 1;
        storyState.eclipseKills = (storyState.eclipseKills || 0) + 1;
        storyState.eliteKills = (storyState.eliteKills || 0) + 1;
        nightQuestTags.push('wendigo', 'elite_foe');
      } else if (enemy.isBrimstoneRevenant) {
        playerState.gold += scaleGoldReward(24);
        storyState.brimstoneFoesKilled = (storyState.brimstoneFoesKilled || 0) + 1;
        storyState.eclipseKills = (storyState.eclipseKills || 0) + 1;
        storyState.eliteKills = (storyState.eliteKills || 0) + 1;
        nightQuestTags.push('brimstone_foe', 'elite_foe');
      } else if (enemy.isCatacombGuardian) {
        playerState.gold += scaleGoldReward(18);
        storyState.catacombGuardiansKilled += 1;
        storyState.eclipseKills = (storyState.eclipseKills || 0) + 1;
        nightQuestTags.push('catacomb_guardian', 'vampire_or_catacomb', 'elite_foe');
      } else {
        playerState.gold += scaleGoldReward(8);
        storyState.act3NightKills += 1;
        storyState.eclipseKills = (storyState.eclipseKills || 0) + 1;
        nightQuestTags.push('vampire_or_catacomb');
        if (enemy.group.position.x < -45 || storyState.currentLevel >= 6) {
          storyState.bootHillVampires += 1;
        }
        if (storyState.act3NightKills >= 3) {
          storyState.act3NightSurvived = true;
        }
      }
      storyState.totalKills = (storyState.totalKills || 0) + 1;
      recordQuestKill(nightQuestTags);
      checkStoryProgression();
      updateStatusUI();
    }

    function damageNightEnemy(enemy, _dir, bulletInfo, rawOverride = 0) {
      if (!enemy.alive || enemy.burning) return;
      const isSilver = !!(bulletInfo && bulletInfo.isSilverBolt);
      const vampMult = isSilver ? Math.max(3, S.nightMonsterDamage * 2) : S.nightMonsterDamage;
      const totalDamage = rawOverride > 0 ? rawOverride : computeShotBaseDamage(bulletInfo) * vampMult;
      enemy.hp = Math.max(0, enemy.hp - totalDamage);
      if (enemy.group.userData.updateBossHealthBar) {
        enemy.group.userData.updateBossHealthBar(enemy.hp, enemy.maxHp, L().sandwraithBarTitle || 'SANDWRAITH KING');
      }
      if (isSilver) {
        enemy.igniteTimer = 3.2;
        enemy.igniteTick = 0.25;
      }
      playFleshHitSound();

      if (enemy.hp > 0) return;
      killNightEnemy(enemy);
    }

    function defeatBossMalakor() {
      bossEnemy.alive = false;
      bossEnemy.active = false;
      bossEnemy.igniteTimer = 0;
      bossEnemy.group.visible = false;

      nightDeathImpactPosition.copy(bossEnemy.group.position);
      nightDeathImpactPosition.y += 1.4;
      spawnImpact(nightDeathImpactPosition, 0xff4422, 1.8);
      spawnVampireAshDissolution(bossEnemy.group.position, 2.4);
      spawnSparkBurst(nightDeathImpactPosition, 24, 0xffd25a, 1.8);

      storyState.bossActive = false;
      storyState.bossHp = 0;
      if (storyState.currentLevel >= 20 || storyState.bossDefeated) {
        storyState.ascendedMalakorDefeated = true;
      }
      storyState.bossDefeated = true;
      storyState.totalKills = (storyState.totalKills || 0) + 1;
      storyState.eliteKills = (storyState.eliteKills || 0) + 1;
      if (storyState.currentLevel >= 51) storyState.prestigeBosses = (storyState.prestigeBosses || 0) + 1;
      S.grantLegendTitle();
      playerState.gold += scaleGoldReward(120);
      playerState.health = playerState.maxHealth || 100;

      recordQuestKill(['night_any', 'vampire_or_catacomb', 'malakor', 'any_boss', 'elite_foe', 'combat_any', 'night']);
      playBossVictoryFanfare();
      checkStoryProgression();
      updateStatusUI();
    }

    function damageWendigoBoss(_dir, bulletInfo, rawOverride = 0) {
      if (!wendigoBossEnemy.alive) return;
      const isSilver = !!(bulletInfo && bulletInfo.isSilverBolt);
      const mult = isSilver ? 3 : S.nightMonsterDamage;
      const dmg = rawOverride > 0 ? rawOverride : computeShotBaseDamage(bulletInfo) * mult;
      wendigoBossEnemy.hp = Math.max(0, wendigoBossEnemy.hp - dmg);
      if (isSilver) {
        wendigoBossEnemy.igniteTimer = 3.2;
        wendigoBossEnemy.igniteTick = 0.4;
      }
      playFleshHitSound();
      syncWendigoBossHealthBarUI();
      updateStatusUI();

      if (wendigoBossEnemy.hp <= 0) {
        wendigoBossEnemy.alive = false;
        wendigoBossEnemy.active = false;
        wendigoBossEnemy.group.visible = false;
        nightDeathImpactPosition.copy(wendigoBossEnemy.group.position);
        nightDeathImpactPosition.y += 1.5;
        spawnImpact(nightDeathImpactPosition, 0x4effa8, 1.9);
        spawnVampireAshDissolution(wendigoBossEnemy.group.position, 2.5);
        spawnSparkBurst(nightDeathImpactPosition, 26, 0x7affc8, 1.85);
        storyState.wendigoBossActive = false;
        storyState.wendigoBossDefeated = true;
        storyState.totalKills = (storyState.totalKills || 0) + 1;
        storyState.eliteKills = (storyState.eliteKills || 0) + 1;
        if (storyState.currentLevel >= 51) storyState.prestigeBosses = (storyState.prestigeBosses || 0) + 1;
        playerState.gold += scaleGoldReward(110);
        playerState.pelt += 4;
        recordQuestKill(['night_any', 'wendigo', 'wendigo_boss', 'any_boss', 'elite_foe', 'combat_any', 'night']);
        playBossVictoryFanfare();
        checkStoryProgression();
        updateStatusUI();
      }
    }

    function damageBrimstoneTotem(totem, rawDmg = 1) {
      if (!totem || totem.destroyed) return;
      totem.hp -= rawDmg;
      spawnSparkBurst(totem.worldPos, 8, 0xff7028, 1.0);
      if (totem.hp <= 0) {
        totem.destroyed = true;
        totem.group.visible = false;
        totem.respawnTimer = 85;
        spawnImpact(totem.worldPos, 0xff4510, 1.5);
        spawnSparkBurst(totem.worldPos, 18, 0xffaa38, 1.45);
        if (playBarricadeBlastSound) playBarricadeBlastSound();
        storyState.brimstoneTotemsShattered = (storyState.brimstoneTotemsShattered || 0) + 1;
        playerState.gold += scaleGoldReward(22);
        recordQuestKill(['brimstone_totem']);
        checkStoryProgression();
        updateStatusUI();
      }
    }

    function damageBossEnemy(_dir, bulletInfo, rawOverride = 0) {
      if (!bossEnemy.alive) return;
      const isSilver = !!(bulletInfo && bulletInfo.isSilverBolt);
      const vampMult = isSilver ? 3 : S.nightMonsterDamage;
      const dmg = rawOverride > 0 ? rawOverride : computeShotBaseDamage(bulletInfo) * vampMult;
      bossEnemy.hp = Math.max(0, bossEnemy.hp - dmg);
      if (isSilver) {
        bossEnemy.igniteTimer = 3.2;
        bossEnemy.igniteTick = 0.35;
      }
      playFleshHitSound();
      syncBossHealthBarUI();
      updateStatusUI();

      // Tilkall 2 nattmonstre ved 20 HP og 10 HP
      if (bossEnemy.hp > 0 && bossEnemy.hp <= 20 && bossEnemy.summonStage < 1) {
        bossEnemy.summonStage = 1;
        summonMinionsNearBoss();
      } else if (bossEnemy.hp > 0 && bossEnemy.hp <= 10 && bossEnemy.summonStage < 2) {
        bossEnemy.summonStage = 2;
        summonMinionsNearBoss();
      }

      if (bossEnemy.hp <= 0) {
        defeatBossMalakor();
      }
    }

    function summonMinionsNearBoss() {
      let count = 0;
      for (let i = 0; i < nightEnemies.length && count < 2; i++) {
        const e = nightEnemies[i];
        if (!e.alive && !e.burning) {
          const offsetZ = count === 0 ? -3.4 : 3.4;
          const sx = bossEnemy.group.position.x + 4.0;
          const sz = bossEnemy.group.position.z + offsetZ;
          e.alive = true;
          e.hp = 3;
          e.burning = false;
          e.igniteTimer = 0;
          e.attackCooldown = 1.0;
          e.group.position.set(sx, getTerrainHeight(sx, sz), sz);
          resolveWallCollisions(e.group.position, NIGHT_RADIUS, true);
          e.group.scale.setScalar(1);
          e.group.visible = true;
          spawnSparkBurst(e.group.position, 8, 0xff2a3a, 1.1);
          count += 1;
        }
      }
    }

    function damageBarricade(barEntry, rawDmg = 1) {
      if (!barEntry || barEntry.destroyed) return;
      barEntry.hp -= rawDmg;
      spawnSparkBurst(barEntry.worldPos, 8, 0xff9a38, 1.0);
      if (barEntry.hp <= 0) {
        barEntry.destroyed = true;
        barEntry.respawnTimer = 80;
        barEntry.group.visible = false;
        if (barEntry.colliderRef) barEntry.colliderRef.disabled = true;
        spawnImpact(barEntry.worldPos, 0xff6622, 1.6);
        spawnSparkBurst(barEntry.worldPos, 20, 0xffcc44, 1.5);
        if (playBarricadeBlastSound) playBarricadeBlastSound();
        storyState.barricadesCleared += 1;
        playerState.gold += 15;
        recordQuestKill(['mine_action']);
        checkStoryProgression();
        updateStatusUI();
      }
    }

    // Dynamitt AoE-eksplosjonsskade på alle fiender, barrikader, dyr og øvingsflasker innenfor radius
    const dynamitePushDir = new THREE.Vector3();
    const applyDynamiteBlast = (blastPos, radius) => {
      for (const bar of mineBarricades) {
        if (bar.destroyed) continue;
        const d = blastPos.distanceTo(bar.worldPos);
        if (d < radius + 1.4) {
          damageBarricade(bar, 10);
        }
      }
      for (const bottle of practiceBottles) {
        if (bottle.userData.knocked) continue;
        bottle.getWorldPosition(bottleWorldPos);
        if (bottleWorldPos.distanceTo(blastPos) < radius) {
          dynamitePushDir.copy(bottleWorldPos).sub(blastPos).normalize();
          knockBottle(bottle, dynamitePushDir);
        }
      }
      for (const bandit of banditList) {
        if (!bandit.alive || !bandit.group.visible) continue;
        const d = Math.hypot(bandit.group.position.x - blastPos.x, bandit.group.position.z - blastPos.z);
        if (d < radius) {
          const dmg = Math.max(3, Math.round(9 * (1 - d / (radius * 1.15))));
          damageBandit(bandit, null, null, dmg);
        }
      }
      for (const bear of bearList) {
        if (!bear.alive || !bear.group.visible) continue;
        const d = Math.hypot(bear.group.position.x - blastPos.x, bear.group.position.z - blastPos.z);
        if (d < radius) {
          const dmg = Math.max(3, Math.round(8 * (1 - d / (radius * 1.15))));
          damageBear(bear, null, null, dmg);
        }
      }
      for (const wolf of wolfList) {
        if (!wolf.alive || !wolf.group.visible) continue;
        const d = Math.hypot(wolf.group.position.x - blastPos.x, wolf.group.position.z - blastPos.z);
        if (d < radius) damageWolf(wolf, null, null, 6);
      }
      for (const deer of deerList) {
        if (!deer.alive || !deer.group.visible) continue;
        const d = Math.hypot(deer.group.position.x - blastPos.x, deer.group.position.z - blastPos.z);
        if (d < radius) damageDeer(deer, null, null, 6);
      }
      for (const enemy of nightEnemies) {
        if (!enemy.alive || !enemy.group.visible || enemy.burning) continue;
        const d = Math.hypot(enemy.group.position.x - blastPos.x, enemy.group.position.z - blastPos.z);
        if (d < radius) {
          const dmg = Math.max(3, Math.round(8 * (1 - d / (radius * 1.15))));
          damageNightEnemy(enemy, null, null, dmg);
        }
      }
      if (bossEnemy.alive && bossEnemy.group.visible) {
        const d = Math.hypot(bossEnemy.group.position.x - blastPos.x, bossEnemy.group.position.z - blastPos.z);
        if (d < radius + 0.8) {
          const dmg = Math.max(4, Math.round(9 * (1 - d / (radius * 1.2))));
          damageBossEnemy(null, null, dmg);
        }
      }
      if (wendigoBossEnemy.alive && wendigoBossEnemy.group.visible) {
        const d = Math.hypot(wendigoBossEnemy.group.position.x - blastPos.x, wendigoBossEnemy.group.position.z - blastPos.z);
        if (d < radius + 1.0) {
          const dmg = Math.max(4, Math.round(9 * (1 - d / (radius * 1.2))));
          damageWendigoBoss(null, null, dmg);
        }
      }
      for (const bt of brimstoneTotems) {
        if (bt.destroyed) continue;
        if (blastPos.distanceTo(bt.worldPos) < radius + 1.4) {
          damageBrimstoneTotem(bt, 8);
        }
      }
      if (expansionHooks && expansionHooks.applyDynamiteToExpansion) {
        expansionHooks.applyDynamiteToExpansion(blastPos, radius);
      }
    };

    // --- 8k. Oppdatering av dyre-, rovdyr-, grizzly-, banditt-, nattmonster- og Boss-AI ---
    function updateFallingEntity(entity, dt) {
      if (entity.deathTimer <= 0) return;

      entity.deathTimer = Math.max(0, entity.deathTimer - dt);
      if (!entity.hasDeathClip) {
        const progress = 1 - entity.deathTimer / 1.2;
        entity.group.rotation.z = -Math.PI / 2 * Math.min(1, progress * 1.5);
      }

      if (entity.deathTimer <= 0) {
        entity.group.visible = false;
        entity.group.rotation.z = 0;
      }
    }

    function updateDeer(dt) {
      for (const deer of deerList) {
        if (!deer.alive) {
          updateFallingEntity(deer, dt);
          if (deer.respawnTimer > 0) {
            deer.respawnTimer -= dt;
            if (deer.respawnTimer <= 0) respawnDeer(deer);
          }
          continue;
        }

        if (S.isNight || !deer.group.visible) continue;

        const distanceToPlayer = Math.hypot(
          deer.group.position.x - playerRig.position.x,
          deer.group.position.z - playerRig.position.z
        );

        if (S.gunshotAlertTimer > 0 && deer.group.position.distanceTo(lastGunshotPosition) < 30) {
          deer.state = 'flee';
          deer.fleeTimer = Math.max(deer.fleeTimer, 4.5);
        }

        if (distanceToPlayer < 8) {
          deer.state = 'flee';
          deer.fleeTimer = Math.max(deer.fleeTimer, 4);
        }

        let movingSpeed = 0;
        if (deer.state === 'flee') {
          deer.fleeTimer -= dt;

          const dx = deer.group.position.x - playerRig.position.x;
          const dz = deer.group.position.z - playerRig.position.z;
          const len = Math.hypot(dx, dz) || 1;

          moveEntityToward(
            deer.group,
            deer.group.position.x + (dx / len) * 12,
            deer.group.position.z + (dz / len) * 12,
            5.6,
            dt,
            0,
            DEER_RADIUS,
            true
          );
          movingSpeed = 5.6;

          if (deer.fleeTimer <= 0) {
            deer.state = 'wander';
            deer.wanderPause = 0.8 + Math.random() * 2;
            chooseDeerTarget(deer);
          }
        } else if (deer.wanderPause > 0) {
          deer.wanderPause -= dt;
        } else {
          const dx = deer.wanderTarget.x - deer.group.position.x;
          const dz = deer.wanderTarget.z - deer.group.position.z;

          if (Math.hypot(dx, dz) < 0.8) {
            deer.wanderPause = 1 + Math.random() * 4;
            chooseDeerTarget(deer);
          } else {
            moveEntityToward(deer.group, deer.wanderTarget.x, deer.wanderTarget.z, 1.3, dt, 0, DEER_RADIUS, true);
            movingSpeed = 1.3;
          }
        }

        const dBounds = deer.bounds || FOREST_BOUNDS;
        deer.group.position.x = THREE.MathUtils.clamp(deer.group.position.x, dBounds.minX, dBounds.maxX);
        deer.group.position.z = THREE.MathUtils.clamp(deer.group.position.z, dBounds.minZ, dBounds.maxZ);
        resolveWallCollisions(deer.group.position, DEER_RADIUS, true);
        deer.group.position.x = THREE.MathUtils.clamp(deer.group.position.x, dBounds.minX, dBounds.maxX);
        deer.group.position.z = THREE.MathUtils.clamp(deer.group.position.z, dBounds.minZ, dBounds.maxZ);

        const groundY = getTerrainHeight(deer.group.position.x, deer.group.position.z);
        if (movingSpeed > 0) {
          deer.stride += dt * (movingSpeed > 3 ? 13 : 6);
          deer.group.position.y = groundY + (movingSpeed > 3 ? Math.abs(Math.sin(deer.stride)) * 0.08 : 0);
        } else {
          deer.group.position.y = groundY;
        }

        if (!deer.animationMixer) {
          if (movingSpeed > 0) {
            animateQuadrupedLegs(deer.group, deer.stride, movingSpeed > 3 ? 0.48 : 0.24);
          } else {
            animateQuadrupedLegs(deer.group, 0, 0);
          }
        }

        setEntityAnimation(deer, movingSpeed > 3 ? 'Run' : movingSpeed > 0 ? 'Walk' : 'Idle');
      }
    }

    function updateWolfPatrol(wolf, dt, speed) {
      wolf.attackCooldown = Math.max(0, wolf.attackCooldown - dt);

      if (wolf.wanderPause > 0) {
        wolf.wanderPause -= dt;
        return 0;
      }

      const dx = wolf.wanderTarget.x - wolf.group.position.x;
      const dz = wolf.wanderTarget.z - wolf.group.position.z;

      if (Math.hypot(dx, dz) < 0.8) {
        wolf.wanderPause = 1 + Math.random() * 3;
        chooseWolfTarget(wolf);
        return 0;
      }

      moveEntityToward(wolf.group, wolf.wanderTarget.x, wolf.wanderTarget.z, speed, dt, 0, WOLF_RADIUS, true);
      return speed;
    }

    function updateWolves(dt) {
      for (const wolf of wolfList) {
        if (!wolf.alive) {
          updateFallingEntity(wolf, dt);
          if (wolf.respawnTimer > 0) {
            wolf.respawnTimer -= dt;
            if (wolf.respawnTimer <= 0) respawnWolf(wolf);
          }
          continue;
        }

        if (!wolf.group.visible) continue;

        wolf.attackAnimTimer = Math.max(0, wolf.attackAnimTimer - dt);

        const dx = playerRig.position.x - wolf.group.position.x;
        const dz = playerRig.position.z - wolf.group.position.z;
        const distance = Math.hypot(dx, dz);
        let movingSpeed = 0;

        if (S.playerHiddenStatus) {
          const distanceToSafeHouse = Math.hypot(
            wolf.group.position.x - safeHouseCenterWorld.x,
            wolf.group.position.z - safeHouseCenterWorld.z
          );

          if (wolf.state === 'chase' || distanceToSafeHouse < 24) {
            if (!wolf.lostTrail) {
              if (wolf.hidingTimer <= 0) wolf.hidingTimer = 1.5;
              wolf.hidingTimer -= dt * (S.safeHouseDoorOpen ? 1.0 : 1.35);

              if (wolf.hidingTimer > 0) {
                moveEntityToward(
                  wolf.group,
                  safeHouseOutsidePoint.x,
                  safeHouseOutsidePoint.z,
                  2.6,
                  dt,
                  1.8,
                  WOLF_RADIUS,
                  true
                );
                movingSpeed = 2.6;
              } else {
                wolf.lostTrail = true;
                wolf.state = 'patrol';
                wolf.wanderPause = 0;
                chooseWolfTarget(wolf);
                movingSpeed = updateWolfPatrol(wolf, dt, 2.1);
              }
            } else {
              movingSpeed = updateWolfPatrol(wolf, dt, 1.9);
            }
          } else {
            movingSpeed = updateWolfPatrol(wolf, dt, 1.6);
          }
        } else {
          wolf.hidingTimer = 0;
          wolf.lostTrail = false;

          if (distance < 12) wolf.state = 'chase';
          else if (distance > 22) wolf.state = 'patrol';

          if (wolf.state === 'chase') {
            if (wolf.attackCooldown > 0) wolf.attackCooldown -= dt;

            if (distance > 1.7) {
              moveEntityToward(wolf.group, playerRig.position.x, playerRig.position.z, 4.3, dt, 1.4, WOLF_RADIUS, true);
              movingSpeed = 4.3;
            } else {
              faceToward(wolf.group, playerRig.position.x, playerRig.position.z);
              if (wolf.attackCooldown <= 0) {
                wolf.attackCooldown = 1.5;
                wolf.attackAnimTimer = 0.45;
                damagePlayer(12);
              }
            }
          } else {
            movingSpeed = updateWolfPatrol(wolf, dt, 1.7);
          }
        }

        const wBounds = wolf.bounds || FOREST_BOUNDS;
        pushOutOfHidingZone(wolf.group, WOLF_RADIUS);
        wolf.group.position.x = THREE.MathUtils.clamp(wolf.group.position.x, wBounds.minX, wBounds.maxX);
        wolf.group.position.z = THREE.MathUtils.clamp(wolf.group.position.z, wBounds.minZ, wBounds.maxZ);
        resolveWallCollisions(wolf.group.position, WOLF_RADIUS, true);
        pushOutOfHidingZone(wolf.group, WOLF_RADIUS);

        wolf.group.position.y = getTerrainHeight(wolf.group.position.x, wolf.group.position.z);

        if (movingSpeed > 0) {
          wolf.stride += dt * (movingSpeed > 3 ? 12 : 6.5);
        }

        if (!wolf.animationMixer) {
          if (movingSpeed > 0) {
            animateQuadrupedLegs(wolf.group, wolf.stride, movingSpeed > 3 ? 0.45 : 0.24);
          } else {
            animateQuadrupedLegs(wolf.group, 0, 0);
          }
        }

        const animationState = S.playerHiddenStatus
          ? (movingSpeed > 0 ? 'Walk' : 'Idle')
          : (wolf.attackAnimTimer > 0 ? 'Attack' : (movingSpeed > 3 ? 'Run' : (movingSpeed > 0 ? 'Walk' : 'Idle')));
        setEntityAnimation(wolf, animationState);
      }
    }

    function updateBears(dt) {
      for (const bear of bearList) {
        if (!bear.alive) {
          updateFallingEntity(bear, dt);
          if (bear.respawnTimer > 0) {
            bear.respawnTimer -= dt;
            if (bear.respawnTimer <= 0) respawnBear(bear);
          }
          continue;
        }
        if (!bear.group.visible) continue;

        bear.attackAnimTimer = Math.max(0, bear.attackAnimTimer - dt);
        const dx = playerRig.position.x - bear.group.position.x;
        const dz = playerRig.position.z - bear.group.position.z;
        const distance = Math.hypot(dx, dz);
        let movingSpeed = 0;

        if (S.playerHiddenStatus) {
          bear.state = 'patrol';
          bear.roared = false;
          if (bear.wanderPause > 0) {
            bear.wanderPause -= dt;
          } else {
            const wdx = bear.wanderTarget.x - bear.group.position.x;
            const wdz = bear.wanderTarget.z - bear.group.position.z;
            if (Math.hypot(wdx, wdz) < 1.2) {
              bear.wanderPause = 1.5 + Math.random() * 2.5;
              chooseBearTarget(bear);
            } else {
              moveEntityToward(bear.group, bear.wanderTarget.x, bear.wanderTarget.z, 1.5, dt, 0, BEAR_RADIUS, true);
              movingSpeed = 1.5;
            }
          }
        } else {
          if (distance < 15) {
            if (bear.state !== 'chase' && !bear.roared) {
              bear.roared = true;
              playBearRoarSound();
            }
            bear.state = 'chase';
          } else if (distance > 28) {
            bear.state = 'patrol';
            bear.roared = false;
          }

          if (bear.state === 'chase') {
            if (bear.attackCooldown > 0) bear.attackCooldown -= dt;
            if (distance > 2.35) {
              moveEntityToward(bear.group, playerRig.position.x, playerRig.position.z, 3.85, dt, 1.95, BEAR_RADIUS, true);
              movingSpeed = 3.85;
            } else {
              faceToward(bear.group, playerRig.position.x, playerRig.position.z);
              if (bear.attackCooldown <= 0) {
                bear.attackCooldown = 1.65;
                bear.attackAnimTimer = 0.5;
                damagePlayer(22);
              }
            }
          } else if (bear.wanderPause > 0) {
            bear.wanderPause -= dt;
          } else {
            const wdx = bear.wanderTarget.x - bear.group.position.x;
            const wdz = bear.wanderTarget.z - bear.group.position.z;
            if (Math.hypot(wdx, wdz) < 1.2) {
              bear.wanderPause = 1.5 + Math.random() * 3.0;
              chooseBearTarget(bear);
            } else {
              moveEntityToward(bear.group, bear.wanderTarget.x, bear.wanderTarget.z, 1.45, dt, 0, BEAR_RADIUS, true);
              movingSpeed = 1.45;
            }
          }
        }

        const bBounds = bear.bounds || { minX: -148, maxX: 148, minZ: -148, maxZ: -26 };
        pushOutOfHidingZone(bear.group, BEAR_RADIUS);
        bear.group.position.x = THREE.MathUtils.clamp(bear.group.position.x, bBounds.minX, bBounds.maxX);
        bear.group.position.z = THREE.MathUtils.clamp(bear.group.position.z, bBounds.minZ, bBounds.maxZ);
        resolveWallCollisions(bear.group.position, BEAR_RADIUS, true);
        pushOutOfHidingZone(bear.group, BEAR_RADIUS);
        bear.group.position.y = getTerrainHeight(bear.group.position.x, bear.group.position.z);

        if (movingSpeed > 0) bear.stride += dt * (movingSpeed > 2.5 ? 10 : 5.5);
        if (!bear.animationMixer) {
          animateQuadrupedLegs(bear.group, movingSpeed > 0 ? bear.stride : 0, movingSpeed > 2.5 ? 0.42 : (movingSpeed > 0 ? 0.22 : 0));
        }

        const animState = bear.attackAnimTimer > 0 ? 'Attack' : (movingSpeed > 2.5 ? 'Run' : (movingSpeed > 0 ? 'Walk' : 'Idle'));
        setEntityAnimation(bear, animState);
      }
    }

    const banditShotOrigin = new THREE.Vector3();
    const banditShotTarget = new THREE.Vector3();
    const banditShotDir = new THREE.Vector3();

    function fireBanditBullet(bandit) {
      bandit.muzzle.getWorldPosition(banditShotOrigin);
      updatePlayerBodyPoints();
      banditShotTarget.copy(playerChestPosition);

      banditShotDir.copy(banditShotTarget).sub(banditShotOrigin).normalize();
      const isWarlord = bandit.isGeneralCortez || bandit.isBrimstoneMarshal;
      if (isWarlord) {
        for (let w = -1; w <= 1; w++) {
          bossWaveDir.copy(banditShotDir).applyAxisAngle(UP, w * 0.14).normalize();
          spawnEnemyBullet(banditShotOrigin, bossWaveDir, 27, bandit.isBrimstoneMarshal ? 20 : 17);
        }
        playBanditShotSound();
        return;
      }
      const spread = bandit.isCaptain ? 0.03 : 0.05;
      banditShotDir.x += (Math.random() - 0.5) * spread;
      banditShotDir.y += (Math.random() - 0.5) * 0.03;
      banditShotDir.z += (Math.random() - 0.5) * spread;
      banditShotDir.normalize();

      const spd = bandit.isBrimstoneRaider ? 30 : (bandit.isCaptain ? 28 : 24);
      const dmg = bandit.isBrimstoneRaider ? 17 : (bandit.isFortDesperado ? 15 : (bandit.isCaptain ? 18 : 14));
      spawnEnemyBullet(banditShotOrigin, banditShotDir, spd, dmg);
      playBanditShotSound();
    }

    function updateBandits(dt) {
      for (const bandit of banditList) {
        const activeAtNightToo = bandit.isForemanSlade || bandit.isBrimstoneMarshal || bandit.isGeneralCortez;
        if (!bandit.alive) {
          updateFallingEntity(bandit, dt);
          if ((!S.isNight || activeAtNightToo) && !(bandit.isCaptain && storyState.captainDefeated && storyState.currentLevel < 18) && bandit.respawnTimer > 0) {
            bandit.respawnTimer -= dt;
            if (bandit.respawnTimer <= 0) {
              bandit.maxHp = Math.round((bandit.baseHp || 3) * getPrestigeHpMult());
              bandit.alive = true;
              bandit.hp = bandit.maxHp;
              bandit.active = true;
              bandit.deathTimer = 0;
              bandit.attackAnimTimer = 0;
              bandit.cooldown = 1.4;
              bandit.group.position.copy(bandit.spawn);
              resolveWallCollisions(bandit.group.position, BANDIT_RADIUS, true);
              bandit.group.position.y = bandit.customGroundY !== undefined
                ? bandit.customGroundY
                : getTerrainHeight(bandit.group.position.x, bandit.group.position.z);
              bandit.group.rotation.set(0, bandit.baseYaw, 0);
              const sc = bandit.isBrimstoneMarshal ? 1.34 : (bandit.isGeneralCortez ? 1.26 : (bandit.isForemanSlade ? 1.22 : (bandit.isCaptain ? 1.14 : 1)));
              bandit.group.scale.setScalar(sc);
              bandit.group.visible = true;
              if (bandit.group.userData.updateBossHealthBar) {
                const lbl = bandit.isGeneralCortez
                  ? (L().cortezBarTitle || 'GENERAL CORTEZ')
                  : (L().marshalBarTitle || 'BRIMSTONE MARSHAL');
                bandit.group.userData.updateBossHealthBar(bandit.hp, bandit.maxHp, lbl);
              }
              setEntityAnimation(bandit, 'Idle');
            }
          }
          continue;
        }

        if (!bandit.active || (S.isNight && !activeAtNightToo)) continue;

        bandit.attackAnimTimer = Math.max(0, bandit.attackAnimTimer - dt);

        const dx = playerRig.position.x - bandit.group.position.x;
        const dz = playerRig.position.z - bandit.group.position.z;
        const distance = Math.hypot(dx, dz);
        const aggroDist = (bandit.isGeneralCortez || bandit.isBrimstoneMarshal)
          ? 34
          : ((bandit.isCaptain || bandit.isForemanSlade || bandit.isFortDesperado || bandit.isBrimstoneRaider) ? 28 : 24);

        if (!S.playerHiddenStatus && distance < aggroDist) {
          faceToward(bandit.group, playerRig.position.x, playerRig.position.z);
          bandit.cooldown -= dt;

          if (bandit.cooldown <= 0) {
            bandit.cooldown = (bandit.isGeneralCortez || bandit.isBrimstoneMarshal)
              ? 1.55
              : ((bandit.isCaptain || bandit.isForemanSlade || bandit.isFortDesperado) ? 1.45 : 2.05);
            bandit.attackAnimTimer = 0.45;
            fireBanditBullet(bandit);
          }
        } else {
          bandit.cooldown = Math.max(0, bandit.cooldown - dt);
          faceToward(bandit.group, bandit.faceX, bandit.faceZ);
        }

        resolveWallCollisions(bandit.group.position, BANDIT_RADIUS, true);
        bandit.group.position.y = bandit.customGroundY !== undefined
          ? bandit.customGroundY
          : getTerrainHeight(bandit.group.position.x, bandit.group.position.z);
        setEntityAnimation(bandit, bandit.attackAnimTimer > 0 ? 'Attack' : 'Idle');
      }
    }

    function updateNightEnemies(dt) {
      for (let index = 0; index < nightEnemies.length; index++) {
        const enemy = nightEnemies[index];
        const isCatacomb = !!enemy.isCatacombGuardian;
        const isAlwaysSurface = !!enemy.isAlwaysActiveSurface;
        if (!enemy.group.visible) {
          if ((S.isNight || isCatacomb || isAlwaysSurface) && !enemy.alive && !enemy.burning && enemy.respawnTimer > 0) {
            enemy.respawnTimer -= dt;
            if (enemy.respawnTimer <= 0) {
              const point = nightRespawnPosition.copy(nightSpawnPoints[index]);
              point.x += (Math.random() - 0.5) * 4;
              point.z += (Math.random() - 0.5) * 4;
              if (!isCatacomb) {
                const dx = point.x - playerRig.position.x;
                const dz = point.z - playerRig.position.z;
                const dist = Math.hypot(dx, dz);
                if (dist < 16) {
                  const sc = 16 / Math.max(dist, 0.1);
                  point.x = playerRig.position.x + dx * sc;
                  point.z = playerRig.position.z + dz * sc;
                }
                point.x = THREE.MathUtils.clamp(point.x, -1172, 1172);
                point.z = THREE.MathUtils.clamp(point.z, -1172, 1172);
                point.y = getTerrainHeight(point.x, point.z);
              } else {
                point.x = THREE.MathUtils.clamp(point.x, -170, -136);
                point.z = THREE.MathUtils.clamp(point.z, -12, 9);
                point.y = -6.5;
              }

              enemy.maxHp = Math.round((enemy.baseHp || 3) * getPrestigeHpMult());
              enemy.alive = true;
              enemy.hp = enemy.maxHp;
              if (enemy.group.userData.updateBossHealthBar) {
                enemy.group.userData.updateBossHealthBar(enemy.hp, enemy.maxHp, L().sandwraithBarTitle || 'SANDWRAITH KING');
              }
              enemy.burning = false;
              enemy.burnTimer = 0;
              enemy.igniteTimer = 0;
              enemy.attackCooldown = 1.0;
              enemy.attackAnimTimer = 0;
              enemy.hidingTimer = 0;
              enemy.lostTrail = false;
              enemy.group.position.copy(point);
              if (!isCatacomb) pushOutOfHidingZone(enemy.group, NIGHT_RADIUS);
              resolveWallCollisions(enemy.group.position, NIGHT_RADIUS, true);
              enemy.group.position.y = isCatacomb ? -6.5 : getTerrainHeight(enemy.group.position.x, enemy.group.position.z);
              enemy.group.rotation.set(0, 0, 0);
              enemy.group.scale.setScalar(1);
              enemy.group.visible = true;
              faceToward(enemy.group, playerRig.position.x, playerRig.position.z);
              setEntityAnimation(enemy, 'Idle');
            }
          }
          continue;
        }

        if (enemy.burning) {
          enemy.burnTimer -= dt;
          enemy.group.scale.setScalar(Math.max(0.01, enemy.burnTimer));
          enemy.group.position.y += dt * 1.1;

          if (Math.random() < dt * 14) {
            nightBurnImpactPosition.copy(enemy.group.position);
            nightBurnImpactPosition.y += 0.8;
            spawnImpact(nightBurnImpactPosition, 0xff6a1f, 0.22);
          }

          if (enemy.burnTimer <= 0) {
            enemy.group.visible = false;
            enemy.group.scale.setScalar(1);
            enemy.group.position.y = 0;
            enemy.burning = false;
            enemy.alive = false;
          }
          continue;
        }

        if (!enemy.alive) continue;

        // Sølv-armbrøst brannskade over tid
        if (enemy.igniteTimer > 0) {
          enemy.igniteTimer = Math.max(0, enemy.igniteTimer - dt);
          enemy.igniteTick -= dt;
          if (enemy.igniteTick <= 0) {
            enemy.igniteTick = 0.45;
            nightBurnImpactPosition.copy(enemy.group.position);
            nightBurnImpactPosition.y += 1.05;
            spawnSparkBurst(nightBurnImpactPosition, 4, 0xff7824, 0.7);
            enemy.hp -= 1;
            if (enemy.hp <= 0) {
              killNightEnemy(enemy);
              continue;
            }
          }
        }

        enemy.attackAnimTimer = Math.max(0, enemy.attackAnimTimer - dt);

        const dx = playerRig.position.x - enemy.group.position.x;
        const dz = playerRig.position.z - enemy.group.position.z;
        const distance = Math.hypot(dx, dz);
        let movingSpeed = 0;

        if (enemy.isCatacombGuardian) {
          if (playerRig.position.y < -1.5 && distance < 32 && !S.playerHiddenStatus) {
            if (distance > 1.8) {
              moveEntityToward(enemy.group, playerRig.position.x, playerRig.position.z, 2.25, dt, 1.55, NIGHT_RADIUS, false);
              movingSpeed = 2.25;
              enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
            } else {
              faceToward(enemy.group, playerRig.position.x, playerRig.position.z);
              enemy.attackCooldown -= dt;
              if (enemy.attackCooldown <= 0) {
                enemy.attackCooldown = 1.25;
                enemy.attackAnimTimer = 0.45;
                damagePlayer(20);
                nightAttackImpactPosition.copy(playerChestPosition);
                spawnImpact(nightAttackImpactPosition, 0x64c8ff, 0.20);
              }
            }
          } else {
            const hPt = nightSpawnPoints[index];
            if (Math.hypot(hPt.x - enemy.group.position.x, hPt.z - enemy.group.position.z) > 1.2) {
              moveEntityToward(enemy.group, hPt.x, hPt.z, 1.5, dt, 0.4, NIGHT_RADIUS, false);
              movingSpeed = 1.5;
            }
          }
          enemy.group.position.x = THREE.MathUtils.clamp(enemy.group.position.x, -170.5, -135.5);
          enemy.group.position.z = THREE.MathUtils.clamp(enemy.group.position.z, -12.5, 9.5);
          resolveWallCollisions(enemy.group.position, NIGHT_RADIUS, true);
          enemy.group.position.y = -6.5 + 0.04 + Math.sin(S.worldTime * 3.1 + index) * 0.035;
          setEntityAnimation(enemy, enemy.attackAnimTimer > 0 ? 'Attack' : (movingSpeed > 0 ? 'Walk' : 'Idle'));
          continue;
        }

        if (isAlwaysSurface && (S.playerHiddenStatus || distance > 38)) {
          const hPt = nightSpawnPoints[index];
          if (Math.hypot(hPt.x - enemy.group.position.x, hPt.z - enemy.group.position.z) > 1.5) {
            moveEntityToward(enemy.group, hPt.x, hPt.z, 2.0, dt, 0.6, NIGHT_RADIUS, true);
            movingSpeed = 2.0;
          }
          resolveWallCollisions(enemy.group.position, NIGHT_RADIUS, true);
          enemy.group.position.y = getTerrainHeight(enemy.group.position.x, enemy.group.position.z) + 0.05;
          setEntityAnimation(enemy, movingSpeed > 0 ? 'Walk' : 'Idle');
          continue;
        }

        if (S.playerHiddenStatus) {
          if (!enemy.lostTrail) {
            if (enemy.hidingTimer <= 0) enemy.hidingTimer = 1.5;
            enemy.hidingTimer -= dt * (S.safeHouseDoorOpen ? 1.0 : 1.35);

            if (enemy.hidingTimer > 0) {
              moveEntityToward(
                enemy.group,
                safeHouseOutsidePoint.x,
                safeHouseOutsidePoint.z,
                2.0,
                dt,
                1.8,
                NIGHT_RADIUS,
                true
              );
              movingSpeed = 2.0;
            } else {
              enemy.lostTrail = true;
              chooseNightWanderAwayTarget(enemy);
              moveEntityToward(
                enemy.group,
                enemy.wanderTarget.x,
                enemy.wanderTarget.z,
                2.15,
                dt,
                0,
                NIGHT_RADIUS,
                true
              );
              movingSpeed = 2.15;
            }
          } else {
            const wdx = enemy.wanderTarget.x - enemy.group.position.x;
            const wdz = enemy.wanderTarget.z - enemy.group.position.z;
            if (wdx * wdx + wdz * wdz < 2.25) {
              chooseNightWanderAwayTarget(enemy);
            }
            moveEntityToward(
              enemy.group,
              enemy.wanderTarget.x,
              enemy.wanderTarget.z,
              2.15,
              dt,
              0,
              NIGHT_RADIUS,
              true
            );
            movingSpeed = 2.15;
          }

          enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
        } else {
          enemy.hidingTimer = 0;
          enemy.lostTrail = false;

          if (distance > 1.8) {
            moveEntityToward(enemy.group, playerRig.position.x, playerRig.position.z, 2.35, dt, 1.55, NIGHT_RADIUS, true);
            movingSpeed = 2.35;
            enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
          } else {
            faceToward(enemy.group, playerRig.position.x, playerRig.position.z);
            enemy.attackCooldown -= dt;

            if (enemy.attackCooldown <= 0) {
              enemy.attackCooldown = 1.2;
              enemy.attackAnimTimer = 0.45;
              damagePlayer(20);

              nightAttackImpactPosition.copy(playerChestPosition);
              spawnImpact(nightAttackImpactPosition, 0xff2a2a, 0.18);
            }
          }
        }

        pushOutOfHidingZone(enemy.group, NIGHT_RADIUS);
        enemy.group.position.x = THREE.MathUtils.clamp(enemy.group.position.x, -1172, 1172);
        enemy.group.position.z = THREE.MathUtils.clamp(enemy.group.position.z, -1172, 1172);
        resolveWallCollisions(enemy.group.position, NIGHT_RADIUS, true);
        pushOutOfHidingZone(enemy.group, NIGHT_RADIUS);

        enemy.group.rotation.z = Math.sin(S.worldTime * 2.4 + index) * 0.04;

        if (!enemy.animationMixer) {
          const arms = enemy.group.userData.arms;
          if (arms && arms.length === 2) {
            const clawReach = Math.sin(S.worldTime * 4.2 + index) * 0.12;
            arms[0].rotation.x = clawReach;
            arms[1].rotation.x = -clawReach;
          }
        }

        enemy.group.position.y =
          getTerrainHeight(enemy.group.position.x, enemy.group.position.z) +
          0.05 +
          Math.sin(S.worldTime * 3.1 + index) * 0.045;

        const animationState = S.playerHiddenStatus
          ? (movingSpeed > 0 ? 'Walk' : 'Idle')
          : (enemy.attackAnimTimer > 0 ? 'Attack' : (movingSpeed > 0 ? 'Walk' : 'Idle'));
        setEntityAnimation(enemy, animationState);
      }
    }

    const bossWaveOrigin = new THREE.Vector3();
    const bossWaveDir = new THREE.Vector3();
    const bossWaveBaseDir = new THREE.Vector3();

    function updateBossEnemy(dt) {
      // Automatisk oppvåkning om natten i Boot Hill eller i Level 8
      if (
        !bossEnemy.alive &&
        !storyState.bossDefeated &&
        S.isNight &&
        (storyState.currentLevel >= 8 || storyState.currentAct >= 4 || playerRig.position.x < -60)
      ) {
        awakenBossMalakor(false);
      }

      if (!bossEnemy.alive || !bossEnemy.group.visible) return;

      if (bossEnemy.igniteTimer > 0) {
        bossEnemy.igniteTimer = Math.max(0, bossEnemy.igniteTimer - dt);
        bossEnemy.igniteTick -= dt;
        if (bossEnemy.igniteTick <= 0) {
          bossEnemy.igniteTick = 0.55;
          nightBurnImpactPosition.copy(bossEnemy.group.position);
          nightBurnImpactPosition.y += 1.6;
          spawnSparkBurst(nightBurnImpactPosition, 5, 0xff7824, 0.9);
          damageBossEnemy(null, null, 1);
          if (!bossEnemy.alive) return;
        }
      }

      bossEnemy.attackAnimTimer = Math.max(0, bossEnemy.attackAnimTimer - dt);
      const dx = playerRig.position.x - bossEnemy.group.position.x;
      const dz = playerRig.position.z - bossEnemy.group.position.z;
      const dist = Math.hypot(dx, dz);
      let movingSpeed = 0;

      if (S.playerHiddenStatus || dist > 56) {
        // Hold vakt ved Boot Hill-kapellet hvis spilleren er langt unna eller i Safe House
        if (Math.hypot(bossEnemy.group.position.x - bossHomePos.x, bossEnemy.group.position.z - bossHomePos.z) > 2.2) {
          moveEntityToward(bossEnemy.group, bossHomePos.x, bossHomePos.z, 2.5, dt, 1.0, BOSS_RADIUS, true);
          movingSpeed = 2.5;
        } else {
          faceToward(bossEnemy.group, playerRig.position.x, playerRig.position.z);
        }
      } else {
        if (dist > 2.4) {
          moveEntityToward(bossEnemy.group, playerRig.position.x, playerRig.position.z, 2.85, dt, 2.1, BOSS_RADIUS, true);
          movingSpeed = 2.85;
        } else {
          faceToward(bossEnemy.group, playerRig.position.x, playerRig.position.z);
          bossEnemy.attackCooldown -= dt;
          if (bossEnemy.attackCooldown <= 0) {
            bossEnemy.attackCooldown = 1.25;
            bossEnemy.attackAnimTimer = 0.5;
            damagePlayer(24);
            nightAttackImpactPosition.copy(playerChestPosition);
            spawnImpact(nightAttackImpactPosition, 0xff1e38, 0.26);
          }
        }

        // Spesialangrep: 3-veis blodkulesalve hvert 4. sekund innenfor 34m
        bossEnemy.waveCooldown -= dt;
        if (bossEnemy.waveCooldown <= 0 && dist < 34) {
          bossEnemy.waveCooldown = 4.0;
          bossEnemy.attackAnimTimer = 0.5;
          bossWaveOrigin.copy(bossEnemy.group.position);
          bossWaveOrigin.y += 1.65;
          updatePlayerBodyPoints();
          bossWaveBaseDir.copy(playerChestPosition).sub(bossWaveOrigin).normalize();

          for (let w = -1; w <= 1; w++) {
            bossWaveDir.copy(bossWaveBaseDir).applyAxisAngle(UP, w * 0.16).normalize();
            spawnEnemyBullet(bossWaveOrigin, bossWaveDir, 22, 16);
          }
          playBanditShotSound();
        }
      }

      pushOutOfHidingZone(bossEnemy.group, BOSS_RADIUS);
      bossEnemy.group.position.x = THREE.MathUtils.clamp(bossEnemy.group.position.x, -1172, 1172);
      bossEnemy.group.position.z = THREE.MathUtils.clamp(bossEnemy.group.position.z, -1172, 1172);
      resolveWallCollisions(bossEnemy.group.position, BOSS_RADIUS, true);
      pushOutOfHidingZone(bossEnemy.group, BOSS_RADIUS);
      bossEnemy.group.position.y =
        getTerrainHeight(bossEnemy.group.position.x, bossEnemy.group.position.z) +
        0.04 +
        Math.sin(S.worldTime * 2.5) * 0.05;

      const bAnim = bossEnemy.attackAnimTimer > 0 ? 'Attack' : (movingSpeed > 0 ? 'Walk' : 'Idle');
      setEntityAnimation(bossEnemy, bAnim);
    }

    function updateWendigoBoss(dt) {
      if (
        !wendigoBossEnemy.alive &&
        !storyState.wendigoBossDefeated &&
        (storyState.currentLevel >= 16 || (storyState.prestigeRank || 0) > 0) &&
        Math.hypot(playerRig.position.x + 140.0, playerRig.position.z - 136.0) < 38.0
      ) {
        awakenAncientWendigo(false);
      }
      if (!wendigoBossEnemy.alive || !wendigoBossEnemy.group.visible) return;

      if (wendigoBossEnemy.igniteTimer > 0) {
        wendigoBossEnemy.igniteTimer = Math.max(0, wendigoBossEnemy.igniteTimer - dt);
        wendigoBossEnemy.igniteTick -= dt;
        if (wendigoBossEnemy.igniteTick <= 0) {
          wendigoBossEnemy.igniteTick = 0.55;
          nightBurnImpactPosition.copy(wendigoBossEnemy.group.position);
          nightBurnImpactPosition.y += 1.7;
          spawnSparkBurst(nightBurnImpactPosition, 5, 0x58ffb8, 0.95);
          damageWendigoBoss(null, null, 1);
          if (!wendigoBossEnemy.alive) return;
        }
      }

      wendigoBossEnemy.attackAnimTimer = Math.max(0, wendigoBossEnemy.attackAnimTimer - dt);
      const dx = playerRig.position.x - wendigoBossEnemy.group.position.x;
      const dz = playerRig.position.z - wendigoBossEnemy.group.position.z;
      const dist = Math.hypot(dx, dz);
      let movingSpeed = 0;

      if (S.playerHiddenStatus || dist > 54) {
        if (Math.hypot(wendigoBossEnemy.group.position.x - wendigoBossHomePos.x, wendigoBossEnemy.group.position.z - wendigoBossHomePos.z) > 2.2) {
          moveEntityToward(wendigoBossEnemy.group, wendigoBossHomePos.x, wendigoBossHomePos.z, 2.7, dt, 1.0, BOSS_RADIUS, true);
          movingSpeed = 2.7;
        }
      } else {
        if (dist > 2.4) {
          moveEntityToward(wendigoBossEnemy.group, playerRig.position.x, playerRig.position.z, 3.25, dt, 2.0, BOSS_RADIUS, true);
          movingSpeed = 3.25;
        } else {
          faceToward(wendigoBossEnemy.group, playerRig.position.x, playerRig.position.z);
          wendigoBossEnemy.attackCooldown -= dt;
          if (wendigoBossEnemy.attackCooldown <= 0) {
            wendigoBossEnemy.attackCooldown = 1.15;
            wendigoBossEnemy.attackAnimTimer = 0.5;
            damagePlayer(26);
            nightAttackImpactPosition.copy(playerChestPosition);
            spawnImpact(nightAttackImpactPosition, 0x38ffa2, 0.28);
          }
        }

        wendigoBossEnemy.waveCooldown -= dt;
        if (wendigoBossEnemy.waveCooldown <= 0 && dist < 36) {
          wendigoBossEnemy.waveCooldown = 3.6;
          wendigoBossEnemy.attackAnimTimer = 0.5;
          bossWaveOrigin.copy(wendigoBossEnemy.group.position);
          bossWaveOrigin.y += 1.75;
          updatePlayerBodyPoints();
          bossWaveBaseDir.copy(playerChestPosition).sub(bossWaveOrigin).normalize();
          for (let w = -1; w <= 1; w++) {
            bossWaveDir.copy(bossWaveBaseDir).applyAxisAngle(UP, w * 0.17).normalize();
            spawnEnemyBullet(bossWaveOrigin, bossWaveDir, 25, 18);
          }
          playBanditShotSound();
        }
      }

      pushOutOfHidingZone(wendigoBossEnemy.group, BOSS_RADIUS);
      wendigoBossEnemy.group.position.x = THREE.MathUtils.clamp(wendigoBossEnemy.group.position.x, -1172, 1172);
      wendigoBossEnemy.group.position.z = THREE.MathUtils.clamp(wendigoBossEnemy.group.position.z, -1172, 1172);
      resolveWallCollisions(wendigoBossEnemy.group.position, BOSS_RADIUS, true);
      wendigoBossEnemy.group.position.y =
        getTerrainHeight(wendigoBossEnemy.group.position.x, wendigoBossEnemy.group.position.z) + 0.04;
      setEntityAnimation(wendigoBossEnemy, wendigoBossEnemy.attackAnimTimer > 0 ? 'Attack' : (movingSpeed > 0 ? 'Walk' : 'Idle'));
    }

    // --- 8l. Fiendekuler / Blodbølger og treff på spilleren ---
    const enemyBulletGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.4, 6);
    enemyBulletGeo.rotateX(Math.PI / 2);
    const enemyBulletMat = new THREE.MeshBasicMaterial({ color: 0xff7a3c, fog: false });
    const enemyBulletGlowGeo = new THREE.SphereGeometry(0.07, 6, 4);
    const enemyBulletGlowMat = new THREE.MeshBasicMaterial({
      color: 0xff4a2a,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false
    });
    const enemyBullets = [];

    function spawnEnemyBullet(origin, direction, speed, damage) {
      const mesh = new THREE.Group();
      mesh.add(new THREE.Mesh(enemyBulletGeo, enemyBulletMat));

      const glow = new THREE.Mesh(enemyBulletGlowGeo, enemyBulletGlowMat);
      glow.position.z = 0.12;
      mesh.add(glow);

      mesh.position.copy(origin);
      mesh.quaternion.setFromUnitVectors(FORWARD, direction);
      scene.add(mesh);

      enemyBullets.push({
        mesh,
        dir: direction.clone(),
        prev: origin.clone(),
        speed,
        damage,
        life: 4
      });
    }

    function removeEnemyBullet(index) {
      scene.remove(enemyBullets[index].mesh);
      enemyBullets.splice(index, 1);
    }

    function updateEnemyBullets(dt) {
      updatePlayerBodyPoints();

      for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];
        bullet.prev.copy(bullet.mesh.position);
        bullet.mesh.position.addScaledVector(bullet.dir, bullet.speed * dt);
        bullet.life -= dt;

        if (pointHitsSolidWall(bullet.mesh.position.x, bullet.mesh.position.y, bullet.mesh.position.z)) {
          spawnImpact(bullet.mesh.position, 0xd9b07c, 0.14);
          removeEnemyBullet(i);
          continue;
        }

        const headHit = !S.playerHiddenStatus && segmentPointDistance(bullet.prev, bullet.mesh.position, playerHeadPosition) < 0.42;
        const chestHit = !S.playerHiddenStatus && segmentPointDistance(bullet.prev, bullet.mesh.position, playerChestPosition) < 0.5;

        if (headHit || chestHit) {
          damagePlayer(bullet.damage);
          spawnImpact(bullet.mesh.position, 0xff4030, 0.16);
          removeEnemyBullet(i);
          continue;
        }

        const enemyGroundY = getTerrainHeight(bullet.mesh.position.x, bullet.mesh.position.z);
        if (bullet.mesh.position.y < enemyGroundY + 0.05) {
          spawnImpact(bullet.mesh.position, 0xd9b07c, 0.14);
          removeEnemyBullet(i);
          continue;
        }

        if (
          bullet.life <= 0 ||
          Math.abs(bullet.mesh.position.x) > PROJECTILE_MAX_HORIZONTAL ||
          Math.abs(bullet.mesh.position.z) > PROJECTILE_MAX_HORIZONTAL ||
          bullet.mesh.position.y > PROJECTILE_MAX_HEIGHT
        ) {
          removeEnemyBullet(i);
        }
      }
    }

    let expansionHooks = null;
    function setExpansionHooks(hooks) {
      expansionHooks = hooks || null;
    }

    // --- 8m. Finn spillerkulas treff blant alle skapninger ---
    function considerCombatTarget(a, b, entity, type, centerY, radius) {
      if (!entity.alive || !entity.group.visible || entity.burning) return;

      combatCenter.set(
        entity.group.position.x,
        entity.group.position.y + centerY,
        entity.group.position.z
      );

      if (segmentPointDistance(a, b, combatCenter) >= radius) return;

      const distance = a.distanceToSquared(combatCenter);
      if (distance < combatHitBestDistance) {
        combatHitBestDistance = distance;
        combatHitFound = true;
        combatHitResult.type = type;
        combatHitResult.entity = entity;
        combatHitResult.point.copy(combatCenter);
      }
    }

    function findCombatHit(a, b) {
      combatHitFound = false;
      combatHitBestDistance = Infinity;
      combatHitResult.type = '';
      combatHitResult.entity = null;

      for (const deer of deerList) {
        considerCombatTarget(a, b, deer, 'deer', 0.95, 0.8);
      }
      for (const wolf of wolfList) {
        considerCombatTarget(a, b, wolf, 'wolf', 0.6, 0.62);
      }
      for (const bear of bearList) {
        considerCombatTarget(a, b, bear, 'bear', bear.isOldGoliath ? 1.25 : 0.95, bear.isOldGoliath ? 1.38 : 1.05);
      }
      for (const bandit of banditList) {
        const bRad = (bandit.isGeneralCortez || bandit.isBrimstoneMarshal || bandit.isElFuego || bandit.isBlackfeather)
          ? 0.94
          : (bandit.isCaptain ? 0.78 : 0.66);
        considerCombatTarget(a, b, bandit, 'bandit', 1.0, bRad);
      }
      for (const enemy of nightEnemies) {
        const nRad = enemy.isSandwraithBoss ? 1.12 : (enemy.isWendigoStalker ? 0.85 : 0.7);
        const nCenterY = enemy.isSandwraithBoss ? 1.42 : 1.0;
        considerCombatTarget(a, b, enemy, 'night', nCenterY, nRad);
      }
      if (bossEnemy.alive && bossEnemy.group.visible) {
        considerCombatTarget(a, b, bossEnemy, 'boss', 1.45, 1.12);
      }
      if (wendigoBossEnemy.alive && wendigoBossEnemy.group.visible) {
        considerCombatTarget(a, b, wendigoBossEnemy, 'wendigo_boss', 1.5, 1.18);
      }
      if (expansionHooks && expansionHooks.considerExpansionHits) {
        expansionHooks.considerExpansionHits(a, b, considerCombatTarget);
      }

      return combatHitFound ? combatHitResult : null;
    }

    function damageCombatTarget(hit, direction, bulletInfo) {
      if (hit.type === 'deer') damageDeer(hit.entity, direction, bulletInfo);
      else if (hit.type === 'wolf') damageWolf(hit.entity, direction, bulletInfo);
      else if (hit.type === 'bear') damageBear(hit.entity, direction, bulletInfo);
      else if (hit.type === 'bandit') damageBandit(hit.entity, direction, bulletInfo);
      else if (hit.type === 'night') damageNightEnemy(hit.entity, direction, bulletInfo);
      else if (hit.type === 'boss') damageBossEnemy(direction, bulletInfo);
      else if (hit.type === 'wendigo_boss') damageWendigoBoss(direction, bulletInfo);
      else if (expansionHooks && expansionHooks.damageExpansionTarget) {
        expansionHooks.damageExpansionTarget(hit, direction, bulletInfo);
      }
    }

    // --- 8n. Plasser alle skapningene og NPC-animasjoner i verdenen ---
    if (tailorNPCGroup && tailorNPCGroup.userData.animations && tailorNPCGroup.userData.animations.length > 0) {
      registerEntityAnimations({ kind: 'npc', group: tailorNPCGroup }, null);
    }
    if (gunsmithNPCGroup && gunsmithNPCGroup.userData.animations && gunsmithNPCGroup.userData.animations.length > 0) {
      registerEntityAnimations({ kind: 'npc', group: gunsmithNPCGroup }, null);
    }
    if (sheriffVanceGroup && sheriffVanceGroup.userData.animations && sheriffVanceGroup.userData.animations.length > 0) {
      registerEntityAnimations({ kind: 'npc', group: sheriffVanceGroup }, null);
    }
    deerHomes.forEach((home) => createDeerAt(home.x, home.z, home));
    wolfHomes.forEach((home) => createWolfAt(home.x, home.z, home));
    bearHomes.forEach((home) => createBearAt(home.x, home.z, home));
    banditDefs.forEach((def, index) => createBanditFromDef(def, index));
    for (let i = 0; i < nightSpawnPoints.length; i++) createNightEnemyAt(i);


    // --- Lojal Grenselands-Jakthund «Rex» (følger spilleren & angriper fiender automatisk når rekruttert på Ranchen!) ---
    const warhoundGroup = createWarhoundCompanionModel ? createWarhoundCompanionModel() : createWolfModel();
    warhoundGroup.position.set(9.2, getTerrainHeight(9.2, 12.8), 12.8);
    warhoundGroup.visible = false;
    scene.add(warhoundGroup);
    const warhoundEntity = {
      kind: 'wolf',
      isCompanion: true,
      group: warhoundGroup,
      stride: 0,
      biteCooldown: 0,
      attackAnimTimer: 0
    };
    registerEntityAnimations(warhoundEntity, quadrupedAnimationClips);

    function updateWarhoundCompanion(dt) {
      const rank = S.warhoundRank || 0;
      if (rank <= 0) {
        if (warhoundEntity.group.visible) warhoundEntity.group.visible = false;
        return;
      }
      if (!warhoundEntity.group.visible) {
        warhoundEntity.group.position.set(
          playerRig.position.x + 1.8,
          getTerrainHeight(playerRig.position.x + 1.8, playerRig.position.z - 1.2, playerRig.position.y),
          playerRig.position.z - 1.2
        );
        warhoundEntity.group.visible = true;
      }

      warhoundEntity.biteCooldown = Math.max(0, warhoundEntity.biteCooldown - dt);
      warhoundEntity.attackAnimTimer = Math.max(0, warhoundEntity.attackAnimTimer - dt);

      const px = playerRig.position.x;
      const pz = playerRig.position.z;
      const distToPlayer = Math.hypot(warhoundEntity.group.position.x - px, warhoundEntity.group.position.z - pz);

      // Teleporter hunden pent ved siden av spilleren ved Diligense-hurtigreise eller stort sprang (> 36m)
      if (distToPlayer > 36.0) {
        warhoundEntity.group.position.set(px + 2.0, getTerrainHeight(px + 2.0, pz - 1.4, playerRig.position.y), pz - 1.4);
      }

      // Søk nærmeste levende fiende innenfor 15m fra spilleren (ikke i Safe House)
      let bestTarget = null;
      let bestKind = '';
      let bestDistSq = 15.5 * 15.5;
      if (!S.playerHiddenStatus && distToPlayer < 24.0) {
        for (let i = 0; i < wolfList.length; i++) {
          const w = wolfList[i];
          if (!w.alive || !w.group.visible) continue;
          const dSq = (w.group.position.x - px) ** 2 + (w.group.position.z - pz) ** 2;
          if (dSq < bestDistSq) { bestDistSq = dSq; bestTarget = w; bestKind = 'wolf'; }
        }
        for (let i = 0; i < bearList.length; i++) {
          const b = bearList[i];
          if (!b.alive || !b.group.visible) continue;
          const dSq = (b.group.position.x - px) ** 2 + (b.group.position.z - pz) ** 2;
          if (dSq < bestDistSq) { bestDistSq = dSq; bestTarget = b; bestKind = 'bear'; }
        }
        for (let i = 0; i < banditList.length; i++) {
          const bd = banditList[i];
          if (!bd.alive || !bd.group.visible) continue;
          const dSq = (bd.group.position.x - px) ** 2 + (bd.group.position.z - pz) ** 2;
          if (dSq < bestDistSq) { bestDistSq = dSq; bestTarget = bd; bestKind = 'bandit'; }
        }
        for (let i = 0; i < nightEnemies.length; i++) {
          const ne = nightEnemies[i];
          if (!ne.alive || !ne.group.visible || ne.burning) continue;
          const dSq = (ne.group.position.x - px) ** 2 + (ne.group.position.z - pz) ** 2;
          if (dSq < bestDistSq) { bestDistSq = dSq; bestTarget = ne; bestKind = 'night'; }
        }
        if (bossEnemy.alive && bossEnemy.group.visible) {
          const dSq = (bossEnemy.group.position.x - px) ** 2 + (bossEnemy.group.position.z - pz) ** 2;
          if (dSq < bestDistSq) { bestDistSq = dSq; bestTarget = bossEnemy; bestKind = 'boss'; }
        }
        if (wendigoBossEnemy.alive && wendigoBossEnemy.group.visible) {
          const dSq = (wendigoBossEnemy.group.position.x - px) ** 2 + (wendigoBossEnemy.group.position.z - pz) ** 2;
          if (dSq < bestDistSq) { bestDistSq = dSq; bestTarget = wendigoBossEnemy; bestKind = 'wendigo_boss'; }
        }
        if (expansionHooks && Array.isArray(expansionHooks.regionalMonsters)) {
          for (let i = 0; i < expansionHooks.regionalMonsters.length; i++) {
            const rm = expansionHooks.regionalMonsters[i];
            if (!rm.alive || !rm.group.visible) continue;
            const dSq = (rm.group.position.x - px) ** 2 + (rm.group.position.z - pz) ** 2;
            if (dSq < bestDistSq) { bestDistSq = dSq; bestTarget = rm; bestKind = 'exp_monster'; }
          }
        }
      }

      let speed = 0;
      if (bestTarget) {
        const tx = bestTarget.group.position.x;
        const tz = bestTarget.group.position.z;
        const dEnemy = Math.hypot(tx - warhoundEntity.group.position.x, tz - warhoundEntity.group.position.z);
        if (dEnemy > 1.75) {
          moveEntityToward(warhoundEntity.group, tx, tz, 8.2, dt, 1.35, 0.48, false);
          speed = 8.2;
        } else {
          faceToward(warhoundEntity.group, tx, tz);
          if (warhoundEntity.biteCooldown <= 0) {
            warhoundEntity.biteCooldown = Math.max(0.85, 1.75 - rank * 0.05);
            warhoundEntity.attackAnimTimer = 0.4;
            const biteDmg = 1.5 + rank * 0.9;
            spawnSparkBurst(bestTarget.group.position, 6, 0xffd668, 0.85);
            if (bestKind === 'wolf') damageWolf(bestTarget, null, null, biteDmg);
            else if (bestKind === 'bear') damageBear(bestTarget, null, null, biteDmg);
            else if (bestKind === 'bandit') damageBandit(bestTarget, null, null, biteDmg);
            else if (bestKind === 'night') damageNightEnemy(bestTarget, null, null, biteDmg);
            else if (bestKind === 'boss') damageBossEnemy(null, null, biteDmg);
            else if (bestKind === 'wendigo_boss') damageWendigoBoss(null, null, biteDmg);
            else if (bestKind === 'exp_monster' && expansionHooks) {
              expansionHooks.damageExpansionTarget({ type: 'exp_monster', entity: bestTarget }, null, { dmgMult: biteDmg });
            }
          }
        }
      } else {
        const yaw = playerRig.rotation.y;
        const flankX = px + Math.cos(yaw) * 2.15 - Math.sin(yaw) * 1.1;
        const flankZ = pz - Math.sin(yaw) * 2.15 - Math.cos(yaw) * 1.1;
        const dFlank = Math.hypot(flankX - warhoundEntity.group.position.x, flankZ - warhoundEntity.group.position.z);
        if (dFlank > 0.85) {
          const followSpd = dFlank > 5.0 ? 11.5 : 5.8;
          moveEntityToward(warhoundEntity.group, flankX, flankZ, followSpd, dt, 0.55, 0.45, false);
          speed = followSpd;
        }
      }

      resolveWallCollisions(warhoundEntity.group.position, 0.45, false);
      warhoundEntity.group.position.y = getTerrainHeight(
        warhoundEntity.group.position.x,
        warhoundEntity.group.position.z,
        playerRig.position.y
      );
      if (!warhoundEntity.animationMixer) {
        warhoundEntity.stride += dt * (speed > 0.3 ? 13 : 0);
        animateQuadrupedLegs(warhoundEntity.group, speed > 0.3 ? warhoundEntity.stride : 0, speed > 0.3 ? 0.48 : 0);
      }
      setEntityAnimation(
        warhoundEntity,
        warhoundEntity.attackAnimTimer > 0 ? 'Attack' : (speed > 4.2 ? 'Run' : (speed > 0.2 ? 'Walk' : 'Idle'))
      );
    }

    function collectSilverRelic(relicEntry) {
      if (!relicEntry || relicEntry.collected) return false;
      relicEntry.collected = true;
      relicEntry.respawnTimer = 65;
      relicEntry.group.visible = false;
      storyState.bootHillRelics += 1;
      playerState.gold += 25;
      if (playRelicPickupSound) playRelicPickupSound();
      spawnSparkBurst(relicEntry.group.position, 14, 0x8ad8ff, 1.3);
      recordQuestKill(['silver_relic', 'treasure_any']);
      checkStoryProgression();
      updateStatusUI();
      return true;
    }

    function respawnSilverRelicsNow() {
      for (let i = 0; i < silverRelics.length; i++) {
        const rel = silverRelics[i];
        if (rel.collected) {
          rel.collected = false;
          rel.respawnTimer = 0;
          rel.group.visible = true;
        }
      }
    }

    function respawnMineBarricadesNow() {
      for (let i = 0; i < mineBarricades.length; i++) {
        const bar = mineBarricades[i];
        if (bar.destroyed && Math.hypot(playerRig.position.x - bar.worldPos.x, playerRig.position.z - bar.worldPos.z) > 8.0) {
          bar.destroyed = false;
          bar.hp = bar.maxHp || 6;
          bar.respawnTimer = 0;
          bar.group.visible = true;
          if (bar.colliderRef) bar.colliderRef.disabled = false;
        }
      }
    }

    function updateHorseAndRelics(dt, worldTime, playerMovingSpeed = 0, moveDirX = 0, moveDirZ = 0) {
      // Roter, respawn og sjekk automatisk oppsamling av Sølvrelikvier ved nærkontakt
      for (let i = 0; i < silverRelics.length; i++) {
        const rel = silverRelics[i];
        if (rel.collected) {
          if (rel.respawnTimer > 0) {
            rel.respawnTimer -= dt;
            if (rel.respawnTimer <= 0) {
              rel.collected = false;
              rel.group.visible = true;
            }
          }
          continue;
        }
        rel.group.rotation.y += dt * 1.4;
        if (
          Math.hypot(playerRig.position.x - rel.group.position.x, playerRig.position.z - rel.group.position.z) < 2.25 &&
          Math.abs(playerRig.position.y - rel.group.position.y) < 2.2
        ) {
          collectSilverRelic(rel);
        }
      }

      // Regenerer sprengte gruvebarrikader når spilleren har forlatt gruven slik at nye gruve-quests alltid kan fullføres
      for (let i = 0; i < mineBarricades.length; i++) {
        const bar = mineBarricades[i];
        if (bar.destroyed && bar.respawnTimer > 0) {
          if (Math.hypot(playerRig.position.x - bar.worldPos.x, playerRig.position.z - bar.worldPos.z) > 15.0) {
            bar.respawnTimer -= dt;
            if (bar.respawnTimer <= 0) {
              bar.destroyed = false;
              bar.hp = bar.maxHp || 6;
              bar.group.visible = true;
              if (bar.colliderRef) bar.colliderRef.disabled = false;
            }
          }
        }
      }

      // Oppdater lojal jakthund «Rex»
      updateWarhoundCompanion(dt);

      // Ridbar Western Mustang
      if (S.isRidingHorse) {
        horseEntity.calling = false;
        const groundY = getTerrainHeight(playerRig.position.x, playerRig.position.z, playerRig.position.y - 1.0);
        horseEntity.group.position.set(playerRig.position.x, groundY, playerRig.position.z);
        if (playerMovingSpeed > 0.25 && (Math.abs(moveDirX) + Math.abs(moveDirZ)) > 0.01) {
          const targetYaw = Math.atan2(-moveDirX, -moveDirZ);
          horseEntity.group.rotation.y = targetYaw;
        } else {
          horseEntity.group.rotation.y = playerRig.rotation.y;
        }
        const galloping = playerMovingSpeed > 0.35;
        setEntityAnimation(horseEntity, galloping ? 'Gallop' : 'Idle');
        if (!horseEntity.animationMixer) {
          horseEntity.stride += dt * (galloping ? 13 : 0);
          animateQuadrupedLegs(horseEntity.group, galloping ? horseEntity.stride : 0, galloping ? 0.52 : 0);
        }
        if (galloping) {
          horseEntity.hoofTimer -= dt;
          if (horseEntity.hoofTimer <= 0) {
            horseEntity.hoofTimer = 0.28;
            if (playHoofbeatSound) playHoofbeatSound(true);
          }
        }
      } else if (horseEntity.calling) {
        const dx = horseEntity.targetPos.x - horseEntity.group.position.x;
        const dz = horseEntity.targetPos.z - horseEntity.group.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 1.2) {
          moveEntityToward(horseEntity.group, horseEntity.targetPos.x, horseEntity.targetPos.z, 9.2, dt, 0.8, 0.72, false);
          resolveWallCollisions(horseEntity.group.position, 0.72, true);
          horseEntity.group.position.y = getTerrainHeight(horseEntity.group.position.x, horseEntity.group.position.z);
          setEntityAnimation(horseEntity, 'Gallop');
          if (!horseEntity.animationMixer) {
            horseEntity.stride += dt * 13;
            animateQuadrupedLegs(horseEntity.group, horseEntity.stride, 0.5);
          }
          horseEntity.hoofTimer -= dt;
          if (horseEntity.hoofTimer <= 0) {
            horseEntity.hoofTimer = 0.26;
            if (playHoofbeatSound) playHoofbeatSound(true);
          }
        } else {
          horseEntity.calling = false;
          setEntityAnimation(horseEntity, 'Idle');
          if (!horseEntity.animationMixer) animateQuadrupedLegs(horseEntity.group, 0, 0);
        }
      } else {
        horseEntity.group.position.y = getTerrainHeight(horseEntity.group.position.x, horseEntity.group.position.z);
        setEntityAnimation(horseEntity, 'Idle');
        if (!horseEntity.animationMixer) animateQuadrupedLegs(horseEntity.group, 0, 0);
      }
    }

  return {
    deerList,
    wolfList,
    bearList,
    banditList,
    nightEnemies,
    bossEnemy,
    wendigoBossEnemy,
    horseEntity,
    warhoundEntity,
    silverRelics,
    silverRelicHitMeshes,
    collectSilverRelic,
    respawnSilverRelicsNow,
    respawnMineBarricadesNow,
    callHorseToPlayer,
    damageBarricade,
    damageBrimstoneTotem,
    syncBossHealthBarUI,
    summonBossFromAltar,
    summonWendigoFromObelisk,
    onNightStateChangedBoss,
    applyDynamiteBlast,
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
    damageCombatTarget,
    setExpansionHooks
  };
}
