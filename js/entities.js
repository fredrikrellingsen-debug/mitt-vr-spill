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
    sheriffVanceGroup
  } = ctx;

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

  const {
    playFleshHitSound,
    playCollectSound,
    playGoldPickupSound,
    playBearRoarSound,
    playBossVictoryFanfare,
    playBanditShotSound
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

    function registerEntityAnimations(entity, fallbackClips) {
      entity.animationMixer = null;
      entity.animationActions = null;
      entity.animationState = '';
      entity.currentAnimationAction = null;
      entity.attackAnimTimer = 0;

      // GLB-klosser kan levere clips på gruppen eller via userData. Hvis
      // modellen er prosedyrisk, bruker vi de genererte fallback-clipene.
      const groupClips = entity.group.animations && entity.group.animations.length
        ? entity.group.animations
        : (entity.group.userData.animations && entity.group.userData.animations.length
          ? entity.group.userData.animations
          : null);
      const clips = entity.animationClips || groupClips || fallbackClips;
      if (!clips || clips.length === 0) return;

      const mixer = new THREE.AnimationMixer(entity.group);
      const actions = Object.create(null);
      for (let i = 0; i < clips.length; i++) {
        const clip = clips[i];
        if (!clip) continue;
        actions[(clip.name || '').toLowerCase()] = mixer.clipAction(clip);
      }

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
      let action = actions[lower];

      if (!action) {
        for (const key in actions) {
          if (key.includes(lower)) {
            action = actions[key];
            break;
          }
        }
      }

      if (!action) action = actions.idle;
      if (!action) {
        const keys = Object.keys(actions);
        if (keys.length > 0) action = actions[keys[0]];
      }
      if (!action) return;

      entity.animationState = stateName;
      if (entity.currentAnimationAction === action) return;

      if (entity.currentAnimationAction) {
        entity.currentAnimationAction.fadeOut(0.18);
      }

      action.reset();
      action.setEffectiveWeight(1);
      action.fadeIn(0.18);
      if (stateName === 'Attack') {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      } else {
        action.setLoop(THREE.LoopRepeat, Infinity);
        action.clampWhenFinished = false;
      }
      action.play();
      entity.currentAnimationAction = action;
    }

    function updateAnimationMixers(dt) {
      for (let i = 0; i < animationMixers.length; i++) {
        const entity = animationMixers[i];
        if (entity.animationMixer && entity.group.visible) {
          entity.animationMixer.update(dt);
        }
      }
    }

    // --- 8h. Opprett og plasser skapninger i alle 4 regioner (følger terrenghøyden) ---
    const deerList = [];
    const wolfList = [];
    const bearList = [];
    const banditList = [];
    const nightEnemies = [];

    const deerHomes = [
      new THREE.Vector3(-12, 0, -34),
      new THREE.Vector3(10, 0, -46),
      new THREE.Vector3(-8, 0, -60),
      new THREE.Vector3(18, 0, -66),
      new THREE.Vector3(-16, 0, -96),
      new THREE.Vector3(12, 0, -116)
    ];

    function chooseDeerTarget(deer) {
      const home = deer.home;
      deer.wanderTarget.set(
        THREE.MathUtils.clamp(home.x + (Math.random() - 0.5) * 22, FOREST_BOUNDS.minX, FOREST_BOUNDS.maxX),
        0,
        THREE.MathUtils.clamp(home.z + (Math.random() - 0.5) * 22, FOREST_BOUNDS.minZ, FOREST_BOUNDS.maxZ)
      );
    }

    function createDeerAt(x, z) {
      const group = createDeerModel();
      group.position.set(x, getTerrainHeight(x, z), z);
      group.rotation.y = Math.random() * Math.PI * 2;
      scene.add(group);

      const deer = {
        kind: 'deer',
        group,
        alive: true,
        hp: 2,
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
      new THREE.Vector3(-18, 0, -48),
      new THREE.Vector3(15, 0, -36),
      new THREE.Vector3(-22, 0, -92),
      new THREE.Vector3(20, 0, -108)
    ];

    function chooseWolfTarget(wolf) {
      const home = wolf.home;
      wolf.wanderTarget.set(
        THREE.MathUtils.clamp(home.x + (Math.random() - 0.5) * 16, FOREST_BOUNDS.minX, FOREST_BOUNDS.maxX),
        0,
        THREE.MathUtils.clamp(home.z + (Math.random() - 0.5) * 16, FOREST_BOUNDS.minZ, FOREST_BOUNDS.maxZ)
      );
    }

    function createWolfAt(x, z) {
      const group = createWolfModel();
      group.position.set(x, getTerrainHeight(x, z), z);
      group.rotation.y = Math.random() * Math.PI * 2;
      scene.add(group);

      const wolf = {
        kind: 'wolf',
        group,
        alive: true,
        hp: 2,
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

    // --- Tungt rovdyr i Whispering Woods: Grizzlybjørn (hp = 6 -> +3 Mat, +3 Skinn, +15 Gull) ---
    const bearHomes = [
      new THREE.Vector3(-14, 0, -96),
      new THREE.Vector3(16, 0, -122)
    ];

    function chooseBearTarget(bear) {
      const home = bear.home;
      bear.wanderTarget.set(
        THREE.MathUtils.clamp(home.x + (Math.random() - 0.5) * 18, FOREST_BOUNDS.minX, FOREST_BOUNDS.maxX),
        0,
        THREE.MathUtils.clamp(home.z + (Math.random() - 0.5) * 18, -142, -62)
      );
    }

    function createBearAt(x, z) {
      const group = createBearModel();
      group.position.set(x, getTerrainHeight(x, z), z);
      group.rotation.y = Math.random() * Math.PI * 2;
      scene.add(group);

      const bear = {
        kind: 'bear',
        group,
        alive: true,
        hp: 6,
        maxHp: 6,
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

    // --- Banditter ved bygrensen + Crimson Canyon bandittleir & Bandittkaptein ved Gullgruven ---
    const banditDefs = [
      { pos: new THREE.Vector3(-28, 0, 4), isCaptain: false, faceX: 0, faceZ: 8 },
      { pos: new THREE.Vector3(32, 0, -16), isCaptain: false, faceX: 0, faceZ: 0 },
      { pos: new THREE.Vector3(68, 0, -5.5), isCaptain: false, faceX: 40, faceZ: -1.5 },
      { pos: new THREE.Vector3(80, 0, 6.2), isCaptain: false, faceX: 60, faceZ: -1.5 },
      { pos: new THREE.Vector3(88, 0, -7.2), isCaptain: false, faceX: 70, faceZ: -1.5 },
      { pos: new THREE.Vector3(96, 0, 5.0), isCaptain: false, faceX: 78, faceZ: -1.5 },
      { pos: new THREE.Vector3(107, 0, -1.5), isCaptain: true, faceX: 75, faceZ: -1.5 }
    ];

    function createBanditFromDef(def, index) {
      const group = def.isCaptain ? createBanditCaptainModel() : createBanditModel();
      const spawnGrounded = def.pos.clone();
      spawnGrounded.y = getTerrainHeight(spawnGrounded.x, spawnGrounded.z);
      group.position.copy(spawnGrounded);
      faceToward(group, def.faceX, def.faceZ);
      scene.add(group);

      const maxHp = def.isCaptain ? 8 : 3;
      const bandit = {
        kind: 'bandit',
        isCaptain: def.isCaptain,
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

    // --- 8 Nattmonstre (4 rundt byen/skogen + 4 rundt Boot Hill Kirkegård i vest) ---
    const nightSpawnPoints = [
      new THREE.Vector3(-30, 0, -8),
      new THREE.Vector3(30, 0, -4),
      new THREE.Vector3(-20, 0, -48),
      new THREE.Vector3(18, 0, -54),
      new THREE.Vector3(-74, 0, -6),
      new THREE.Vector3(-86, 0, 6.5),
      new THREE.Vector3(-98, 0, -7),
      new THREE.Vector3(-108, 0, 6)
    ];

    function chooseNightWanderAwayTarget(enemy) {
      const awayX = enemy.group.position.x - safeHouseCenterWorld.x;
      const awayZ = enemy.group.position.z - safeHouseCenterWorld.z;
      const baseAngle = (awayX * awayX + awayZ * awayZ > 0.25)
        ? Math.atan2(awayZ, awayX)
        : (Math.random() * Math.PI * 2);
      const spreadAngle = baseAngle + (Math.random() - 0.5) * 1.45;
      const dist = 34 + Math.random() * 26;
      const tx = THREE.MathUtils.clamp(safeHouseCenterWorld.x + Math.cos(spreadAngle) * dist, -148, 148);
      const tz = THREE.MathUtils.clamp(safeHouseCenterWorld.z + Math.sin(spreadAngle) * dist, -148, 148);
      enemy.wanderTarget.set(tx, 0, tz);
    }

    function createNightEnemyAt(index) {
      const group = createNightEnemyModel();
      const sp = nightSpawnPoints[index];
      group.position.set(sp.x, getTerrainHeight(sp.x, sp.z), sp.z);
      group.visible = false;
      scene.add(group);

      const enemy = {
        kind: 'night',
        group,
        alive: false,
        hp: 3,
        burning: false,
        burnTimer: 0,
        igniteTimer: 0,
        igniteTick: 0,
        attackCooldown: 0,
        spawnIndex: index,
        deathTimer: 0,
        hidingTimer: 0,
        lostTrail: false,
        wanderTarget: new THREE.Vector3(sp.x, 0, sp.z)
      };

      registerEntityAnimations(enemy, nightAnimationClips);
      nightEnemies.push(enemy);
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
    }
    

    function awakenBossMalakor(fromAltar = false) {
      if (storyState.bossDefeated) return;
      if (bossEnemy.alive && bossEnemy.group.visible) return;

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
        if (!storyState.bossDefeated && (storyState.currentAct >= 4 || playerRig.position.x < -60)) {
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
      let x = 0;
      let z = 0;
      for (let attempt = 0; attempt < 10; attempt++) {
        x = THREE.MathUtils.randFloat(FOREST_BOUNDS.minX + 3, FOREST_BOUNDS.maxX - 3);
        z = THREE.MathUtils.randFloat(FOREST_BOUNDS.minZ + 3, FOREST_BOUNDS.maxZ - 3);
        const distance = Math.hypot(x - playerRig.position.x, z - playerRig.position.z);
        if (distance > 15) break;
      }

      deer.alive = true;
      deer.hp = 2;
      deer.state = 'wander';
      deer.deathTimer = 0;
      deer.respawnTimer = 0;
      deer.fleeTimer = 0;
      deer.wanderPause = 0.5 + Math.random() * 2;
      deer.home.set(x, 0, z);
      deer.group.position.set(x, getTerrainHeight(x, z), z);
      deer.group.rotation.set(0, Math.random() * Math.PI * 2, 0);
      deer.group.scale.setScalar(1);
      deer.group.visible = !S.isNight;
      deer.attackAnimTimer = 0;
      if (!deer.animationMixer) animateQuadrupedLegs(deer.group, 0, 0);
      setEntityAnimation(deer, 'Idle');
      chooseDeerTarget(deer);
    }

    function respawnWolf(wolf) {
      wolf.alive = true;
      wolf.hp = 2;
      wolf.state = 'patrol';
      wolf.deathTimer = 0;
      wolf.respawnTimer = 0;
      wolf.attackCooldown = 0;
      wolf.attackAnimTimer = 0;
      wolf.hidingTimer = 0;
      wolf.lostTrail = false;
      wolf.wanderPause = 0.5 + Math.random() * 2;
      const wx = THREE.MathUtils.clamp(wolf.home.x + (Math.random() - 0.5) * 14, FOREST_BOUNDS.minX, FOREST_BOUNDS.maxX);
      const wz = THREE.MathUtils.clamp(wolf.home.z + (Math.random() - 0.5) * 14, FOREST_BOUNDS.minZ, FOREST_BOUNDS.maxZ);
      wolf.group.position.set(wx, getTerrainHeight(wx, wz), wz);
      wolf.group.rotation.set(0, Math.random() * Math.PI * 2, 0);
      wolf.group.scale.setScalar(1);
      wolf.group.visible = true;
      if (!wolf.animationMixer) animateQuadrupedLegs(wolf.group, 0, 0);
      setEntityAnimation(wolf, 'Idle');
      chooseWolfTarget(wolf);
    }

    function respawnBear(bear) {
      bear.alive = true;
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
      const bx = THREE.MathUtils.clamp(bear.home.x + (Math.random() - 0.5) * 12, FOREST_BOUNDS.minX, FOREST_BOUNDS.maxX);
      const bz = THREE.MathUtils.clamp(bear.home.z + (Math.random() - 0.5) * 12, -142, -62);
      bear.group.position.set(bx, getTerrainHeight(bx, bz), bz);
      bear.group.rotation.set(0, Math.random() * Math.PI * 2, 0);
      bear.group.scale.setScalar(1);
      bear.group.visible = true;
      if (!bear.animationMixer) animateQuadrupedLegs(bear.group, 0, 0);
      setEntityAnimation(bear, 'Idle');
      chooseBearTarget(bear);
    }

    function resetBanditsForDay() {
      banditList.forEach((bandit, index) => {
        if (bandit.isCaptain && storyState.captainDefeated) {
          bandit.alive = false;
          bandit.active = false;
          bandit.group.visible = false;
          return;
        }
        bandit.alive = true;
        bandit.hp = bandit.maxHp;
        bandit.active = !S.isNight;
        bandit.deathTimer = 0;
        bandit.attackAnimTimer = 0;
        bandit.cooldown = 1.0 + (index % 4) * 0.38;
        bandit.group.position.copy(bandit.spawn);
        resolveCircleAgainstWalls(bandit.group.position, BANDIT_RADIUS);
        bandit.group.position.y = getTerrainHeight(bandit.group.position.x, bandit.group.position.z);
        bandit.group.rotation.set(0, bandit.baseYaw, 0);
        bandit.group.scale.setScalar(1);
        bandit.group.visible = !S.isNight;
        setEntityAnimation(bandit, 'Idle');
      });
    }

    function spawnNightEnemies() {
      nightEnemies.forEach((enemy, index) => {
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

        point.x = THREE.MathUtils.clamp(point.x, -148, 148);
        point.z = THREE.MathUtils.clamp(point.z, -148, 148);
        point.y = getTerrainHeight(point.x, point.z);

        enemy.alive = true;
        enemy.hp = 3;
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
        if (!enemy.group.visible) return;
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
        deer.fleeTimer = 5;
        return;
      }

      deer.alive = false;
      deer.state = 'dead';
      deer.deathTimer = 1.2;
      deer.respawnTimer = 20;
      deer.group.rotation.z = 0;
      setEntityAnimation(deer, 'Idle');

      playerState.food += 1;
      playerState.pelt += 1;
      playerState.gold += 5;
      storyState.act1Deer += 1;
      playCollectSound();
      recordQuestKill('deer');
      checkStoryProgression();
      updateStatusUI();
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
      wolf.deathTimer = 1.2;
      wolf.respawnTimer = 20;
      wolf.group.rotation.z = 0;
      setEntityAnimation(wolf, 'Idle');

      playerState.pelt += 1;
      playerState.gold += 6;
      updateStatusUI();
      playCollectSound();
    }

    function damageBear(bear, _dir, bulletInfo, rawOverride = 0) {
      if (!bear.alive) return;
      const dmg = rawOverride > 0 ? rawOverride : computeShotBaseDamage(bulletInfo);
      bear.hp -= dmg;
      playFleshHitSound();

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
      bear.respawnTimer = 32;
      bear.group.rotation.z = 0;
      setEntityAnimation(bear, 'Idle');

      playerState.food += 3;
      playerState.pelt += 3;
      playerState.gold += 15;
      storyState.act1Deer += 1;
      playGoldPickupSound();
      recordQuestKill('deer');
      checkStoryProgression();
      updateStatusUI();
    }

    function damageBandit(bandit, _dir, bulletInfo, rawOverride = 0) {
      if (!bandit.alive) return;
      const dmg = rawOverride > 0 ? rawOverride : computeShotBaseDamage(bulletInfo);
      bandit.hp -= dmg;
      playFleshHitSound();

      if (bandit.hp > 0) return;

      bandit.alive = false;
      bandit.active = false;
      bandit.deathTimer = 1.2;
      bandit.respawnTimer = bandit.isCaptain ? 60 : 24;
      bandit.group.rotation.z = 0;
      setEntityAnimation(bandit, 'Idle');

      if (bandit.isCaptain) {
        playerState.gold += 35;
        storyState.captainDefeated = true;
        playGoldPickupSound();
      } else {
        playerState.gold += 10;
      }
      storyState.act2Bandits += 1;
      recordQuestKill('bandit');
      checkStoryProgression();
      updateStatusUI();
    }

    function killNightEnemy(enemy) {
      enemy.alive = false;
      enemy.igniteTimer = 0;
      enemy.group.visible = false;
      enemy.group.scale.setScalar(1);
      enemy.respawnTimer = 15;
      setEntityAnimation(enemy, 'Idle');

      nightDeathImpactPosition.copy(enemy.group.position);
      nightDeathImpactPosition.y += 1.0;
      spawnImpact(nightDeathImpactPosition, 0xff3a1f, 0.36);
      spawnVampireAshDissolution(enemy.group.position, 1.0);

      playerState.gold += 8;
      storyState.act3NightKills += 1;
      if (storyState.act3NightKills >= 3) {
        storyState.act3NightSurvived = true;
      }
      recordQuestKill('night');
      checkStoryProgression();
      updateStatusUI();
    }

    function damageNightEnemy(enemy, _dir, bulletInfo, rawOverride = 0) {
      if (!enemy.alive || enemy.burning) return;
      const isSilver = !!(bulletInfo && bulletInfo.isSilverBolt);
      const vampMult = isSilver ? Math.max(3, S.nightMonsterDamage * 2) : S.nightMonsterDamage;
      const totalDamage = rawOverride > 0 ? rawOverride : computeShotBaseDamage(bulletInfo) * vampMult;
      enemy.hp -= totalDamage;
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
      storyState.bossDefeated = true;
      S.grantLegendTitle();
      playerState.gold += 80;
      playerState.health = 100;

      playBossVictoryFanfare();
      checkStoryProgression();
      updateStatusUI();
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

    // Dynamitt AoE-eksplosjonsskade på alle fiender, dyr og øvingsflasker innenfor radius
    const dynamitePushDir = new THREE.Vector3();
    const applyDynamiteBlast = (blastPos, radius) => {
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
    };

    // --- 8k. Oppdatering av dyre-, rovdyr-, grizzly-, banditt-, nattmonster- og Boss-AI ---
    function updateFallingEntity(entity, dt) {
      if (entity.deathTimer <= 0) return;

      entity.deathTimer = Math.max(0, entity.deathTimer - dt);
      const progress = 1 - entity.deathTimer / 1.2;
      entity.group.rotation.z = -Math.PI / 2 * Math.min(1, progress * 1.5);

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

        deer.group.position.x = THREE.MathUtils.clamp(deer.group.position.x, FOREST_BOUNDS.minX, FOREST_BOUNDS.maxX);
        deer.group.position.z = THREE.MathUtils.clamp(deer.group.position.z, FOREST_BOUNDS.minZ, FOREST_BOUNDS.maxZ);
        resolveWallCollisions(deer.group.position, DEER_RADIUS, true);
        deer.group.position.x = THREE.MathUtils.clamp(deer.group.position.x, FOREST_BOUNDS.minX, FOREST_BOUNDS.maxX);
        deer.group.position.z = THREE.MathUtils.clamp(deer.group.position.z, FOREST_BOUNDS.minZ, FOREST_BOUNDS.maxZ);

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

        pushOutOfHidingZone(wolf.group, WOLF_RADIUS);
        wolf.group.position.x = THREE.MathUtils.clamp(wolf.group.position.x, -148, 148);
        wolf.group.position.z = THREE.MathUtils.clamp(wolf.group.position.z, -148, 148);
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

        pushOutOfHidingZone(bear.group, BEAR_RADIUS);
        bear.group.position.x = THREE.MathUtils.clamp(bear.group.position.x, -148, 148);
        bear.group.position.z = THREE.MathUtils.clamp(bear.group.position.z, -148, -26);
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
      const spread = bandit.isCaptain ? 0.03 : 0.05;
      banditShotDir.x += (Math.random() - 0.5) * spread;
      banditShotDir.y += (Math.random() - 0.5) * 0.03;
      banditShotDir.z += (Math.random() - 0.5) * spread;
      banditShotDir.normalize();

      spawnEnemyBullet(banditShotOrigin, banditShotDir, bandit.isCaptain ? 28 : 24, bandit.isCaptain ? 18 : 14);
      playBanditShotSound();
    }

    function updateBandits(dt) {
      for (const bandit of banditList) {
        if (!bandit.alive) {
          updateFallingEntity(bandit, dt);
          if (!S.isNight && !(bandit.isCaptain && storyState.captainDefeated) && bandit.respawnTimer > 0) {
            bandit.respawnTimer -= dt;
            if (bandit.respawnTimer <= 0) {
              bandit.alive = true;
              bandit.hp = bandit.maxHp;
              bandit.active = true;
              bandit.deathTimer = 0;
              bandit.attackAnimTimer = 0;
              bandit.cooldown = 1.4;
              bandit.group.position.copy(bandit.spawn);
              resolveWallCollisions(bandit.group.position, BANDIT_RADIUS, true);
              bandit.group.position.y = getTerrainHeight(bandit.group.position.x, bandit.group.position.z);
              bandit.group.rotation.set(0, bandit.baseYaw, 0);
              bandit.group.scale.setScalar(1);
              bandit.group.visible = true;
              setEntityAnimation(bandit, 'Idle');
            }
          }
          continue;
        }

        if (!bandit.active || S.isNight) continue;

        bandit.attackAnimTimer = Math.max(0, bandit.attackAnimTimer - dt);

        const dx = playerRig.position.x - bandit.group.position.x;
        const dz = playerRig.position.z - bandit.group.position.z;
        const distance = Math.hypot(dx, dz);
        const aggroDist = bandit.isCaptain ? 28 : 24;

        if (!S.playerHiddenStatus && distance < aggroDist) {
          faceToward(bandit.group, playerRig.position.x, playerRig.position.z);
          bandit.cooldown -= dt;

          if (bandit.cooldown <= 0) {
            bandit.cooldown = bandit.isCaptain ? 1.55 : 2.15;
            bandit.attackAnimTimer = 0.45;
            fireBanditBullet(bandit);
          }
        } else {
          bandit.cooldown = Math.max(0, bandit.cooldown - dt);
          faceToward(bandit.group, bandit.faceX, bandit.faceZ);
        }

        resolveWallCollisions(bandit.group.position, BANDIT_RADIUS, true);
        bandit.group.position.y = getTerrainHeight(bandit.group.position.x, bandit.group.position.z);
        setEntityAnimation(bandit, bandit.attackAnimTimer > 0 ? 'Attack' : 'Idle');
      }
    }

    function updateNightEnemies(dt) {
      for (let index = 0; index < nightEnemies.length; index++) {
        const enemy = nightEnemies[index];
        if (!enemy.group.visible) {
          if (S.isNight && !enemy.alive && !enemy.burning && enemy.respawnTimer > 0) {
            enemy.respawnTimer -= dt;
            if (enemy.respawnTimer <= 0) {
              const point = nightRespawnPosition.copy(nightSpawnPoints[index]);
              point.x += (Math.random() - 0.5) * 4;
              point.z += (Math.random() - 0.5) * 4;
              const dx = point.x - playerRig.position.x;
              const dz = point.z - playerRig.position.z;
              const dist = Math.hypot(dx, dz);
              if (dist < 16) {
                const sc = 16 / Math.max(dist, 0.1);
                point.x = playerRig.position.x + dx * sc;
                point.z = playerRig.position.z + dz * sc;
              }
              point.x = THREE.MathUtils.clamp(point.x, -148, 148);
              point.z = THREE.MathUtils.clamp(point.z, -148, 148);
              point.y = getTerrainHeight(point.x, point.z);

              enemy.alive = true;
              enemy.hp = 3;
              enemy.burning = false;
              enemy.burnTimer = 0;
              enemy.igniteTimer = 0;
              enemy.attackCooldown = 1.0;
              enemy.attackAnimTimer = 0;
              enemy.hidingTimer = 0;
              enemy.lostTrail = false;
              enemy.group.position.copy(point);
              pushOutOfHidingZone(enemy.group, NIGHT_RADIUS);
              resolveWallCollisions(enemy.group.position, NIGHT_RADIUS, true);
              enemy.group.position.y = getTerrainHeight(enemy.group.position.x, enemy.group.position.z);
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
        enemy.group.position.x = THREE.MathUtils.clamp(enemy.group.position.x, -150, 150);
        enemy.group.position.z = THREE.MathUtils.clamp(enemy.group.position.z, -150, 150);
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
      // Automatisk oppvåkning om natten i Boot Hill eller i Akt 4
      if (
        !bossEnemy.alive &&
        !storyState.bossDefeated &&
        S.isNight &&
        (storyState.currentAct >= 4 || playerRig.position.x < -60)
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
      bossEnemy.group.position.x = THREE.MathUtils.clamp(bossEnemy.group.position.x, -152, 152);
      bossEnemy.group.position.z = THREE.MathUtils.clamp(bossEnemy.group.position.z, -152, 152);
      resolveWallCollisions(bossEnemy.group.position, BOSS_RADIUS, true);
      pushOutOfHidingZone(bossEnemy.group, BOSS_RADIUS);
      bossEnemy.group.position.y =
        getTerrainHeight(bossEnemy.group.position.x, bossEnemy.group.position.z) +
        0.04 +
        Math.sin(S.worldTime * 2.5) * 0.05;

      const bAnim = bossEnemy.attackAnimTimer > 0 ? 'Attack' : (movingSpeed > 0 ? 'Walk' : 'Idle');
      setEntityAnimation(bossEnemy, bAnim);
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
        considerCombatTarget(a, b, bear, 'bear', 0.95, 1.05);
      }
      for (const bandit of banditList) {
        considerCombatTarget(a, b, bandit, 'bandit', 1.0, bandit.isCaptain ? 0.78 : 0.66);
      }
      for (const enemy of nightEnemies) {
        considerCombatTarget(a, b, enemy, 'night', 1.0, 0.7);
      }
      if (bossEnemy.alive && bossEnemy.group.visible) {
        considerCombatTarget(a, b, bossEnemy, 'boss', 1.45, 1.12);
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
    deerHomes.forEach((home) => createDeerAt(home.x, home.z));
    wolfHomes.forEach((home) => createWolfAt(home.x, home.z));
    bearHomes.forEach((home) => createBearAt(home.x, home.z));
    banditDefs.forEach((def, index) => createBanditFromDef(def, index));
    for (let i = 0; i < nightSpawnPoints.length; i++) createNightEnemyAt(i);


  return {
    deerList,
    wolfList,
    bearList,
    banditList,
    nightEnemies,
    bossEnemy,
    syncBossHealthBarUI,
    summonBossFromAltar,
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
    updateAnimationMixers,
    updateEnemyBullets,
    findCombatHit,
    damageCombatTarget
  };
}
