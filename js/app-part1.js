const {
  THREE, VRButton, Sky, GLTFLoader, RGBELoader,
  I18N, drawRoundedRect, drawSheriffStar2D, getQuestBySeq, formatQuestTexts,
  initTexturesAndMaterials, initCreatureModels,
  applySkyShaderParams, getTerrainHeight, buildEnvironmentAndScenery,
  buildTownBuildings, initWesternAudio, initRevolverAndAtmosphereFX,
  initWorldEntities, initMMOAndCoopSystem, initShopAndCameraSystem, getArmorDefByTier, initFrontierExpansion, initMagicalGraphicsAndContinent
} = window.__WVR_DEPS;

    // =========================================================================
    // 1. SCENE, RENDERER OG SPILLER-RIGG (playerRig)
    // =========================================================================
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xd99b66);
    scene.fog = new THREE.Fog(0xe2b483, 85, 860);

    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1850);
    camera.position.set(0, 1.65, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    const isSmallMobileScreen = Math.min(window.innerWidth, window.innerHeight) < 600;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSmallMobileScreen ? 1.4 : 1.25));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);
    const vrBtnEl = VRButton.createButton(renderer);
    document.body.appendChild(vrBtnEl);
    setTimeout(() => {
      if (vrBtnEl && (vrBtnEl.textContent || '').toUpperCase().includes('NOT SUPPORTED')) {
        vrBtnEl.dataset.xrUnsupported = '1';
      }
    }, 600);

    // Spiller-rigg som samler kamera og begge VR-kontrollerne
    const playerRig = new THREE.Group();
    playerRig.position.set(0, 0, 14.5);
    playerRig.add(camera);
    scene.add(playerRig);

    // Lydkontekst klar for videre spillmekanikk
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const maxAnisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());

    // =========================================================================
    // 2. SENTRALT SPRÅKSYSTEM (EN STANDARD / NO VALG), STATUS OG WRISTBOARD
    // =========================================================================
    let currentLang = 'en';

    function L() {
      return I18N[currentLang] || I18N.en;
    }

    const playerState = {
      health: 100,
      maxHealth: 100,
      gold: 120,
      food: 1,
      pelt: 0,
      wood: 2,
      dynamite: 2,
      outfit: 'Plain',
      weapon: 'Peacemaker',
      timeOfDay: 'Day',
      targets: 0,
      title: ''
    };

    // Globale kamp-, våpen-, rustnings-, mestrings-, gull- og 20-nivås + Prestisje historievariabler
    let damageMultiplier = 1.0;
    let nightMonsterDamage = 1;
    let currentOutfitTier = 0;
    let visualOutfitTier = 0;
    let armorPaddingRanks = 0;
    const redeemedStripeSessions = [];
    let weaponMasteryRank = 0; // +20 % all våpenskade per nivå hos Våpensmeden
    let totalPlaySeconds = 0;
    let autoSaveAccum = 0;

    let weaponDamage = 1;
    const WEAPON_ORDER = ['revolver', 'shotgun', 'rifle', 'crossbow', 'dynamite', 'hellfire'];
    const unlockedWeapons = {
      revolver: true,
      shotgun: false,
      rifle: false,
      crossbow: false,
      dynamite: true,
      hellfire: false
    };
    let activeWeaponId = 'revolver';
    let isRidingHorse = false;
    let currentMoveSpeed = 0;
    let currentMoveDirX = 0;
    let currentMoveDirZ = 0;

    let questBoardSlots = [1, 2, 3];
    let nextQuestSeq = 4;
    let activeQuest = null;
    let activeQuestSeq = 0;
    let questProgress = 0;
    const completedQuests = [];
    const questProgressMap = Object.create(null);
    const slotCompletedFlash = [null, null, null];
    let hudCompletedBanner = null;
    let respawnSilverRelicsHook = null;
    let respawnMineBarricadesHook = null;
    let hasSheriffStar = false;
    let hasGoldenRevolver = false;
    let hasLegendTitle = false;
    let isNightStateFlag = false;
    let playerHiddenStatus = false;

    const HOMESTEAD_MAX_RANKS = {
      cattle: 25,
      trapper: 20,
      deadeye: 25,
      trailblazer: 20,
      warhound: 15
    };
    const homesteadRanks = {
      cattle: 0,
      trapper: 0,
      deadeye: 0,
      trailblazer: 0,
      warhound: 0
    };
    const collectedHorseshoeIds = [];
    const collectedWaystoneIds = [];
    let ranchDividendAccum = 0;
    const WORLD_EVENT_IDS = ['gold_rush', 'great_migration', 'frontier_storm', 'blood_eclipse'];
    let activeWorldEventId = '';
    let worldEventTimer = 0;
    let worldEventCooldown = 75;
    let worldEventSeqIdx = 0;
    let toastBannerText = '';
    let toastBannerTimer = 0;

    // 50-Level Grand Campaign + Infinite Frontier Prestige Chapters (200h+ Complete Edition)
    const storyState = {
      currentLevel: 1, // 1..50 kampanje, 51+ evige Prestisje-kapitler
      currentAct: 1,
      prestigeRank: 0,
      prestigeBeasts: 0,
      prestigeFoes: 0,
      prestigeBosses: 0,
      prestigeGoalBeasts: 8,
      prestigeGoalFoes: 10,
      prestigeGoalBosses: 1,
      talkedSheriff: false,
      act1Deer: 0,
      boughtGear: false,
      level2Wolves: 0,
      grizzlyDefeated: false,
      act2Bandits: 0,
      captainDefeated: false,
      barricadesCleared: 0,
      sladeDefeated: false,
      mineMapCollected: false,
      mineGoldCollected: false,
      trainSnipersKilled: 0,
      trainGatlingCaptured: false,
      bootHillVampires: 0,
      bootHillRelics: 0,
      catacombGuardiansKilled: 0,
      hellfireCollected: false,
      hasVampireGear: false,
      act3NightKills: 0,
      act3SafeHouseTimer: 0,
      act3NightSurvived: false,
      bossActive: false,
      bossHp: 30,
      bossMaxHp: 30,
      bossDefeated: false,
      bisonHunted: 0,
      cougarsHunted: 0,
      whiteStagsHunted: 0,
      alphaWolvesKilled: 0,
      moonstonesCollected: 0,
      fortBanditsKilled: 0,
      strongboxesRecovered: 0,
      cortezDefeated: false,
      brimstoneFoesKilled: 0,
      brimstoneTotemsShattered: 0,
      brimstoneMarshalDefeated: false,
      ancientRunesAttuned: 0,
      wendigosKilled: 0,
      wendigoBossActive: false,
      wendigoBossHp: 42,
      wendigoBossMaxHp: 42,
      wendigoBossDefeated: false,
      totalBountiesDone: 0,
      masterUpgradeBought: false,
      eliteKills: 0,
      eclipseKills: 0,
      ascendedMalakorDefeated: false,
      ranchTotalRanks: 0,
      warhoundRank: 0,
      s22Beasts: 0,
      horseshoesFound: 0,
      oasisIdolsCollected: 0,
      oasisFoesKilled: 0,
      sandwraithDefeated: false,
      millCratesCollected: 0,
      goliathDefeated: false,
      meteorCoresCollected: 0,
      hellhoundsKilled: 0,
      calderaFoesKilled: 0,
      elFuegoDefeated: false,
      starShardsCollected: 0,
      observatoryFoesKilled: 0,
      blackfeatherDefeated: false,
      immortalFinaleMalakor: false,
      immortalFinaleWendigo: false,
      waystonesAttuned: 0,
      continentBossesSlain: [],
      totalKills: 0
    };

    function syncHomesteadStoryCounters() {
      storyState.ranchTotalRanks =
        (homesteadRanks.cattle || 0) +
        (homesteadRanks.trapper || 0) +
        (homesteadRanks.deadeye || 0) +
        (homesteadRanks.trailblazer || 0) +
        (homesteadRanks.warhound || 0);
      storyState.warhoundRank = homesteadRanks.warhound || 0;
      storyState.horseshoesFound = collectedHorseshoeIds.length;
    }

    const CAREER_SAVE_KEY = 'western_vr_career_v2';
    function saveCareerProgress() {
      try {
        syncHomesteadStoryCounters();
        const payload = {
          v: 3,
          lang: currentLang,
          health: playerState.health,
          maxHealth: playerState.maxHealth,
          gold: playerState.gold,
          food: playerState.food,
          pelt: playerState.pelt,
          wood: playerState.wood,
          dynamite: playerState.dynamite,
          outfitTier: currentOutfitTier,
          visualOutfitTier,
          armorPaddingRanks,
          starterGoldGrantedV4: true,
          redeemedStripeSessions: redeemedStripeSessions.slice(-100),
          damageMultiplier,
          nightMonsterDamage,
          weaponDamage,
          weaponMasteryRank,
          homesteadRanks: { ...homesteadRanks },
          collectedHorseshoeIds: [...collectedHorseshoeIds],
          collectedWaystoneIds: [...collectedWaystoneIds],
          unlockedWeapons: { ...unlockedWeapons },
          activeWeaponId,
          hasSheriffStar,
          hasGoldenRevolver,
          hasLegendTitle,
          completedQuests: completedQuests.slice(-300),
          questBoardSlots: [...questBoardSlots],
          nextQuestSeq,
          activeQuestSeq: activeQuest ? activeQuest.seq : 0,
          questProgress,
          questProgressMap: { ...questProgressMap },
          totalPlaySeconds: Math.round(totalPlaySeconds),
          story: {
            ...storyState,
            bossActive: false,
            wendigoBossActive: false
          }
        };
        localStorage.setItem(CAREER_SAVE_KEY, JSON.stringify(payload));
      } catch (_) {
        // localStorage er valgfri
      }
    }

    function loadCareerSave() {
      try {
        const raw = localStorage.getItem(CAREER_SAVE_KEY);
        if (!raw) return;
        const data = JSON.parse(raw);
        if (!data || typeof data !== 'object') return;
        if (data.lang === 'no' || data.lang === 'en') currentLang = data.lang;
        if (typeof data.maxHealth === 'number') playerState.maxHealth = Math.max(100, Math.min(600, Math.round(data.maxHealth)));
        if (typeof data.health === 'number') playerState.health = Math.max(25, Math.min(playerState.maxHealth, Math.round(data.health)));
        if (typeof data.gold === 'number') playerState.gold = Math.max(0, Math.round(data.gold));
        if (typeof data.food === 'number') playerState.food = Math.max(0, Math.round(data.food));
        if (typeof data.pelt === 'number') playerState.pelt = Math.max(0, Math.round(data.pelt));
        if (typeof data.wood === 'number') playerState.wood = Math.max(0, Math.round(data.wood));
        if (typeof data.dynamite === 'number') playerState.dynamite = Math.max(0, Math.round(data.dynamite));
        if (typeof data.outfitTier === 'number') currentOutfitTier = Math.max(0, Math.min(6, Math.round(data.outfitTier)));
        visualOutfitTier = typeof data.visualOutfitTier === 'number'
          ? Math.max(0, Math.min(currentOutfitTier, Math.round(data.visualOutfitTier)))
          : currentOutfitTier;
        if (typeof data.armorPaddingRanks === 'number') {
          armorPaddingRanks = Math.max(0, Math.min(25, Math.round(data.armorPaddingRanks)));
        }
        if (Array.isArray(data.redeemedStripeSessions)) {
          redeemedStripeSessions.length = 0;
          data.redeemedStripeSessions.forEach((sid) => {
            if (typeof sid === 'string' && !redeemedStripeSessions.includes(sid)) {
              redeemedStripeSessions.push(sid);
            }
          });
        }
        if (typeof data.damageMultiplier === 'number') damageMultiplier = Math.max(0.15, Math.min(1, data.damageMultiplier));
        // Gi eksisterende start-lagringer med <= 20 Gull opptil 120 start-gull én gang slik at man kan handle i butikkene med én gang!
        if (!data.starterGoldGrantedV4 && playerState.gold < 120 && currentOutfitTier === 0 && !(data.story && data.story.boughtGear)) {
          playerState.gold = 120;
        }
        if (typeof data.nightMonsterDamage === 'number') nightMonsterDamage = Math.max(1, Math.min(4, data.nightMonsterDamage));
        if (typeof data.weaponDamage === 'number') weaponDamage = Math.max(1, data.weaponDamage);
        if (typeof data.weaponMasteryRank === 'number') weaponMasteryRank = Math.max(0, Math.min(40, Math.round(data.weaponMasteryRank)));
        if (data.homesteadRanks && typeof data.homesteadRanks === 'object') {
          for (const hk of Object.keys(HOMESTEAD_MAX_RANKS)) {
            if (typeof data.homesteadRanks[hk] === 'number') {
              homesteadRanks[hk] = Math.max(0, Math.min(HOMESTEAD_MAX_RANKS[hk], Math.round(data.homesteadRanks[hk])));
            }
          }
        }
        if (Array.isArray(data.collectedHorseshoeIds)) {
          collectedHorseshoeIds.length = 0;
          data.collectedHorseshoeIds.forEach((hid) => {
            if (typeof hid === 'string' && !collectedHorseshoeIds.includes(hid)) {
              collectedHorseshoeIds.push(hid);
            }
          });
        }
        if (Array.isArray(data.collectedWaystoneIds)) {
          collectedWaystoneIds.length = 0;
          data.collectedWaystoneIds.forEach((wid) => {
            if (typeof wid === 'string' && !collectedWaystoneIds.includes(wid)) {
              collectedWaystoneIds.push(wid);
            }
          });
        }
        if (data.unlockedWeapons && typeof data.unlockedWeapons === 'object') {
          for (const wk of WEAPON_ORDER) {
            if (typeof data.unlockedWeapons[wk] === 'boolean') unlockedWeapons[wk] = data.unlockedWeapons[wk];
          }
          unlockedWeapons.revolver = true;
          unlockedWeapons.dynamite = true;
        }
        if (typeof data.activeWeaponId === 'string' && unlockedWeapons[data.activeWeaponId]) {
          activeWeaponId = data.activeWeaponId;
        }
        if (typeof data.hasSheriffStar === 'boolean') hasSheriffStar = data.hasSheriffStar;
        if (typeof data.hasGoldenRevolver === 'boolean') hasGoldenRevolver = data.hasGoldenRevolver;
        if (typeof data.hasLegendTitle === 'boolean') hasLegendTitle = data.hasLegendTitle;
        if (Array.isArray(data.completedQuests)) {
          completedQuests.length = 0;
          data.completedQuests.forEach((qid) => {
            if (typeof qid === 'string') completedQuests.push(qid);
          });
        }
        if (typeof data.totalPlaySeconds === 'number') totalPlaySeconds = Math.max(0, data.totalPlaySeconds);
        if (data.story && typeof data.story === 'object') {
          for (const sk of Object.keys(storyState)) {
            if (sk === 'bossActive' || sk === 'wendigoBossActive') continue;
            if (data.story[sk] !== undefined) storyState[sk] = data.story[sk];
          }
        }
        syncHomesteadStoryCounters();
        if (data.questProgressMap && typeof data.questProgressMap === 'object') {
          for (const [qk, qv] of Object.entries(data.questProgressMap)) {
            if (typeof qv === 'number' && qv > 0) questProgressMap[qk] = Math.round(qv);
          }
        }
        if (Array.isArray(data.questBoardSlots) && data.questBoardSlots.length === 3) {
          const seen = new Set();
          let fallbackSeq = 1;
          questBoardSlots = data.questBoardSlots.map((rawSeq) => {
            let s = Math.max(1, Math.round(Number(rawSeq) || fallbackSeq));
            while (seen.has(s)) s += 1;
            seen.add(s);
            fallbackSeq = s + 1;
            return s;
          });
          const minNext = Math.max(...questBoardSlots) + 1;
          nextQuestSeq = Math.max(minNext, Math.round(Number(data.nextQuestSeq) || minNext));
          if (typeof data.activeQuestSeq === 'number' && data.activeQuestSeq > 0 && questBoardSlots.includes(data.activeQuestSeq)) {
            activeQuestSeq = data.activeQuestSeq;
            activeQuest = getQuestBySeq(activeQuestSeq, storyState.prestigeRank || 0);
            questProgress = Math.max(0, Math.min(activeQuest.goal - 1, Math.round(Number(data.questProgress) || 0)));
          }
        } else {
          // Migrer sømløst fra eldre lagring slik at allerede fullførte start-quests byttes ut med nye
          const migSlots = [1, 2, 3];
          let migNext = 4;
          if (completedQuests.includes('deer_hunt')) migSlots[0] = migNext++;
          if (completedQuests.includes('bandit_clear')) migSlots[1] = migNext++;
          if (completedQuests.includes('night_guardian')) migSlots[2] = migNext++;
          questBoardSlots = migSlots;
          nextQuestSeq = migNext;
        }
      } catch (_) {
        // Ignorer korrupt lagring
      }
    }
    loadCareerSave();
    window.addEventListener('pagehide', saveCareerProgress);

    let refreshGunsmithHook = null;
    let refreshHomesteadHook = null;
    let mmoSystem = null;
    let shopAndCameraSystem = null;
    let frontierExpansion = null;
    let magicGraphics = null;
    let refreshSheriffHook = null;
    let equipWeaponHook = null;
    let playStoryFanfareHook = null;
    let forceNightForBloodMoonHook = null;

    const hudEl = document.getElementById('hud');
    const questHudBarEl = document.getElementById('quest-hud-bar');
    const worldEventBarEl = document.getElementById('world-event-bar');
    const codexBtnEl = document.getElementById('codex-btn');
    const codexModalEl = document.getElementById('codex-modal');
    const codexTitleEl = document.getElementById('codex-title');
    const codexCloseBtnEl = document.getElementById('codex-close-btn');
    const codexOverallLabelEl = document.getElementById('codex-overall-label');
    const codexBarFillEl = document.getElementById('codex-bar-fill');
    const codexPillarsGridEl = document.getElementById('codex-pillars-grid');
    const codexTravelHdrEl = document.getElementById('codex-travel-hdr');
    const codexTravelGridEl = document.getElementById('codex-travel-grid');
    const pcHintEl = document.getElementById('pc-hint');
    const langBtnEl = document.getElementById('lang-btn');
    const sensBtnEl = document.getElementById('sens-btn');
    const dayNightTopBtnEl = document.getElementById('daynight-top-btn');
    const sensPanelEl = document.getElementById('sens-panel');
    const sensTitleEl = document.getElementById('sens-title');
    const sensLookLabelEl = document.getElementById('sens-look-label');
    const sensValLabelEl = document.getElementById('sens-val-label');
    const sensRangeEl = document.getElementById('sens-range');
    const sensMinusBtnEl = document.getElementById('sens-minus-btn');
    const sensPlusBtnEl = document.getElementById('sens-plus-btn');
    const sensInvertLabelEl = document.getElementById('sens-invert-label');
    const sensInvertBtnEl = document.getElementById('sens-invert-btn');
    const sensVrLabelEl = document.getElementById('sens-vr-label');
    const sensVrBtnEl = document.getElementById('sens-vr-btn');
    const sensPerfLabelEl = document.getElementById('sens-perf-label');
    const sensPerfBtnEl = document.getElementById('sens-perf-btn');
    const sensCareerLabelEl = document.getElementById('sens-career-label');
    const sensCareerResetBtnEl = document.getElementById('sens-career-reset-btn');
    const sensResetBtnEl = document.getElementById('sens-reset-btn');

    const touchJoyRingEl = document.getElementById('touch-joy-ring');
    const touchJoyKnobEl = document.getElementById('touch-joy-knob');
    const btnTouchWeaponEl = document.getElementById('btn-touch-weapon');
    const btnTouchHorseEl = document.getElementById('btn-touch-horse');
    const btnTouchEatEl = document.getElementById('btn-touch-eat');
    const btnTouchUseEl = document.getElementById('btn-touch-use');
    const btnTouchFireEl = document.getElementById('btn-touch-fire');

    // Lagrede følsomhets-, grafikk- og kontrollinnstillinger for VR, Telefon, PC og Pad
    const CONTROL_STORAGE_KEY = 'western_vr_controls_v1';
    const controlSettings = {
      sensPct: 100,
      invertY: false,
      vrSmoothTurn: false,
      perfMode: 'auto', // 'auto' | 'fast' | 'ultra'
      viewMode: 'first' // 'first' | 'third'
    };
    try {
      const savedRaw = localStorage.getItem(CONTROL_STORAGE_KEY);
      if (savedRaw) {
        const parsed = JSON.parse(savedRaw);
        if (typeof parsed.sensPct === 'number') {
          controlSettings.sensPct = Math.max(25, Math.min(250, Math.round(parsed.sensPct)));
        }
        if (typeof parsed.invertY === 'boolean') controlSettings.invertY = parsed.invertY;
        if (typeof parsed.vrSmoothTurn === 'boolean') controlSettings.vrSmoothTurn = parsed.vrSmoothTurn;
        if (parsed.perfMode === 'auto' || parsed.perfMode === 'fast' || parsed.perfMode === 'ultra') {
          controlSettings.perfMode = parsed.perfMode;
        }
        if (parsed.viewMode === 'first' || parsed.viewMode === 'third') {
          controlSettings.viewMode = parsed.viewMode;
        }
      }
    } catch (_) {
      // localStorage er valgfri
    }

    function saveControlSettings() {
      try {
        localStorage.setItem(CONTROL_STORAGE_KEY, JSON.stringify(controlSettings));
      } catch (_) {
        // localStorage er valgfri
      }
    }

    let adaptiveDprCap = isSmallMobileScreen ? 1.35 : 1.25;
    function applyQualityPixelRatio() {
      if (renderer.xr.isPresenting) return;
      const hwDpr = window.devicePixelRatio || 1;
      let targetDpr = Math.min(hwDpr, adaptiveDprCap);
      if (controlSettings.perfMode === 'fast') {
        targetDpr = Math.min(hwDpr, 0.92);
      } else if (controlSettings.perfMode === 'ultra') {
        targetDpr = Math.min(hwDpr, 1.75);
      }
      if (Math.abs(renderer.getPixelRatio() - targetDpr) > 0.03) {
        renderer.setPixelRatio(targetDpr);
        renderer.setSize(window.innerWidth, window.innerHeight);
        if (magicGraphics) magicGraphics.onResize();
      }
    }
    applyQualityPixelRatio();

    let touchStickX = 0;
    let touchStickY = 0;

    function syncControlsLocalizationUI() {
      const dict = L();
      const pct = controlSettings.sensPct;
      if (sensBtnEl) sensBtnEl.textContent = dict.sensBtn ? dict.sensBtn(pct) : `⚙ Sens: ${pct}%`;
      if (sensTitleEl && dict.sensTitle) sensTitleEl.textContent = dict.sensTitle;
      if (sensLookLabelEl && dict.sensLookLabel) sensLookLabelEl.textContent = dict.sensLookLabel;
      if (sensValLabelEl) sensValLabelEl.textContent = `${pct}%`;
      if (sensRangeEl) sensRangeEl.value = String(pct);
      if (sensInvertLabelEl && dict.sensInvertLabel) sensInvertLabelEl.textContent = dict.sensInvertLabel;
      if (sensInvertBtnEl) {
        sensInvertBtnEl.textContent = controlSettings.invertY ? 'ON' : 'OFF';
        sensInvertBtnEl.classList.toggle('active', controlSettings.invertY);
      }
      if (sensVrLabelEl && dict.sensVrTurnLabel) sensVrLabelEl.textContent = dict.sensVrTurnLabel;
      if (sensVrBtnEl) {
        sensVrBtnEl.textContent = controlSettings.vrSmoothTurn
          ? (dict.sensVrSmooth || 'Smooth')
          : (dict.sensVrSnap || 'Snap 30°');
        sensVrBtnEl.classList.toggle('active', controlSettings.vrSmoothTurn);
      }
      if (sensPerfLabelEl && dict.sensPerfLabel) sensPerfLabelEl.textContent = dict.sensPerfLabel;
      if (sensPerfBtnEl) {
        if (controlSettings.perfMode === 'fast') {
          sensPerfBtnEl.textContent = dict.sensPerfFast || 'Max FPS';
        } else if (controlSettings.perfMode === 'ultra') {
          sensPerfBtnEl.textContent = dict.sensPerfUltra || 'Ultra';
        } else {
          sensPerfBtnEl.textContent = dict.sensPerfAuto || 'Auto (Smooth)';
        }
        sensPerfBtnEl.classList.toggle('active', controlSettings.perfMode !== 'ultra');
      }
      if (sensResetBtnEl && dict.sensResetBtn) sensResetBtnEl.textContent = dict.sensResetBtn;
      if (sensCareerLabelEl && dict.careerSaveLabel) sensCareerLabelEl.textContent = dict.careerSaveLabel;
      if (sensCareerResetBtnEl && !sensCareerResetBtnEl.dataset.confirming && dict.careerResetBtn) {
        sensCareerResetBtnEl.textContent = dict.careerResetBtn;
      }
      if (btnTouchFireEl && dict.touchFire) btnTouchFireEl.textContent = dict.touchFire;
      if (btnTouchWeaponEl && dict.touchWeapon) btnTouchWeaponEl.textContent = dict.touchWeapon;
      if (btnTouchHorseEl && dict.touchHorse) btnTouchHorseEl.textContent = dict.touchHorse;
      if (btnTouchEatEl && dict.touchEat) btnTouchEatEl.textContent = dict.touchEat;
      if (btnTouchUseEl && dict.touchUse) btnTouchUseEl.textContent = dict.touchUse;
    }

    function getLocalizedWeaponName(wId) {
      const dict = L();
      if (wId === 'revolver' && (hasGoldenRevolver || weaponDamage >= 2)) {
        return dict.weapons.revolverGold;
      }
      return dict.weapons[wId] || wId;
    }

    function formatPlaytimeShort(sec) {
      const totalMin = Math.floor(Math.max(0, sec) / 60);
      const hrs = Math.floor(totalMin / 60);
      const mins = totalMin % 60;
      return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
    }

    function syncLocalizedStateStrings() {
      const dict = L();
      playerState.outfit = dict.outfits[currentOutfitTier] || dict.outfits[0];
      const baseWName = getLocalizedWeaponName(activeWeaponId);
      playerState.weapon = weaponMasteryRank > 0 ? `${baseWName} +${weaponMasteryRank}` : baseWName;
      playerState.timeOfDay = isNightStateFlag ? dict.night : dict.day;
      if ((storyState.prestigeRank || 0) > 0 && dict.prestigeTitle) {
        playerState.title = dict.prestigeTitle(storyState.prestigeRank);
      } else {
        playerState.title = hasLegendTitle ? dict.legendTitle : '';
      }
    }

    function getStoryStatusLine() {
      const dict = L();
      storyState.hasVampireGear = currentOutfitTier >= 3 || unlockedWeapons.crossbow || unlockedWeapons.hellfire;
      syncHomesteadStoryCounters();
      if (storyState.currentLevel > 50) {
        return dict.formatPrestigeProgress ? dict.formatPrestigeProgress(storyState) : dict.storyComplete;
      }
      const lvlDef = dict.acts[storyState.currentLevel - 1];
      return lvlDef ? lvlDef.formatProgress(storyState) : dict.storyComplete;
    }

    function countUniqueBossesDefeated() {
      const coreBosses = [
        storyState.bossDefeated,
        storyState.cortezDefeated,
        storyState.brimstoneMarshalDefeated,
        storyState.wendigoBossDefeated,
        storyState.sandwraithDefeated,
        storyState.goliathDefeated,
        storyState.elFuegoDefeated,
        storyState.blackfeatherDefeated
      ].filter(Boolean).length;
      const farBosses = Array.isArray(storyState.continentBossesSlain)
        ? Math.min(4, storyState.continentBossesSlain.length)
        : 0;
      return coreBosses + farBosses;
    }

    function checkStoryProgression() {
      storyState.hasVampireGear = currentOutfitTier >= 3 || unlockedWeapons.crossbow || unlockedWeapons.hellfire;
      syncHomesteadStoryCounters();
      let advanced = false;

      if (
        storyState.currentLevel === 1 &&
        storyState.talkedSheriff &&
        storyState.act1Deer >= 2 &&
        storyState.boughtGear
      ) {
        storyState.currentLevel = 2;
        playerState.gold += 20;
        hasSheriffStar = true;
        sheriffStarBadge.visible = true;
        advanced = true;
      }

      if (storyState.currentLevel === 2 && storyState.level2Wolves >= 3 && storyState.grizzlyDefeated) {
        storyState.currentLevel = 3;
        playerState.gold += 35;
        advanced = true;
      }

      if (storyState.currentLevel === 3 && storyState.act2Bandits >= 4 && storyState.captainDefeated) {
        storyState.currentLevel = 4;
        playerState.gold += 40;
        weaponDamage = Math.max(weaponDamage, 2);
        advanced = true;
      }

      if (
        storyState.currentLevel === 4 &&
        storyState.barricadesCleared >= 2 &&
        storyState.sladeDefeated &&
        storyState.mineMapCollected
      ) {
        storyState.currentLevel = 5;
        playerState.gold += 45;
        playerState.dynamite += 3;
        advanced = true;
      }

      if (storyState.currentLevel === 5 && storyState.trainSnipersKilled >= 4 && storyState.trainGatlingCaptured) {
        storyState.currentLevel = 6;
        playerState.gold += 55;
        advanced = true;
      }

      if (storyState.currentLevel === 6 && storyState.bootHillVampires >= 4 && storyState.bootHillRelics >= 2) {
        storyState.currentLevel = 7;
        playerState.gold += 60;
        advanced = true;
      }

      if (storyState.currentLevel === 7 && storyState.catacombGuardiansKilled >= 3 && storyState.hellfireCollected) {
        storyState.currentLevel = 8;
        playerState.gold += 75;
        if (forceNightForBloodMoonHook) forceNightForBloodMoonHook();
        advanced = true;
      }

      if (storyState.currentLevel === 8 && storyState.bossDefeated) {
        storyState.currentLevel = 9;
        hasLegendTitle = true;
        playerState.gold += 120;
        playerState.health = playerState.maxHealth;
        advanced = true;
      }

      if (storyState.currentLevel === 9 && (storyState.bisonHunted || 0) >= 3 && (storyState.cougarsHunted || 0) >= 2) {
        storyState.currentLevel = 10;
        playerState.gold += 85;
        playerState.food += 3;
        advanced = true;
      }

      if (
        storyState.currentLevel === 10 &&
        (storyState.whiteStagsHunted || 0) >= 1 &&
        (storyState.alphaWolvesKilled || 0) >= 3 &&
        (storyState.moonstonesCollected || 0) >= 3
      ) {
        storyState.currentLevel = 11;
        playerState.gold += 110;
        playerState.pelt += 3;
        advanced = true;
      }

      if (
        storyState.currentLevel === 11 &&
        (storyState.fortBanditsKilled || 0) >= 5 &&
        (storyState.strongboxesRecovered || 0) >= 3
      ) {
        storyState.currentLevel = 12;
        playerState.gold += 120;
        playerState.dynamite += 3;
        advanced = true;
      }

      if (storyState.currentLevel === 12 && storyState.cortezDefeated) {
        storyState.currentLevel = 13;
        playerState.gold += 140;
        advanced = true;
      }

      if (
        storyState.currentLevel === 13 &&
        (storyState.brimstoneFoesKilled || 0) >= 5 &&
        (storyState.brimstoneTotemsShattered || 0) >= 3
      ) {
        storyState.currentLevel = 14;
        playerState.gold += 145;
        advanced = true;
      }

      if (storyState.currentLevel === 14 && storyState.brimstoneMarshalDefeated) {
        storyState.currentLevel = 15;
        playerState.gold += 160;
        advanced = true;
      }

      if (
        storyState.currentLevel === 15 &&
        (storyState.ancientRunesAttuned || 0) >= 3 &&
        (storyState.wendigosKilled || 0) >= 4
      ) {
        storyState.currentLevel = 16;
        playerState.gold += 170;
        advanced = true;
      }

      if (storyState.currentLevel === 16 && storyState.wendigoBossDefeated) {
        storyState.currentLevel = 17;
        playerState.gold += 190;
        advanced = true;
      }

      if (
        storyState.currentLevel === 17 &&
        (storyState.totalBountiesDone || 0) >= 5 &&
        storyState.masterUpgradeBought
      ) {
        storyState.currentLevel = 18;
        playerState.gold += 200;
        advanced = true;
      }

      if (storyState.currentLevel === 18 && (storyState.eliteKills || 0) >= 12) {
        storyState.currentLevel = 19;
        playerState.gold += 220;
        advanced = true;
      }

      if (storyState.currentLevel === 19 && (storyState.eclipseKills || 0) >= 10) {
        storyState.currentLevel = 20;
        storyState.ascendedMalakorDefeated = false;
        playerState.gold += 240;
        if (forceNightForBloodMoonHook) forceNightForBloodMoonHook();
        advanced = true;
      }

      if (storyState.currentLevel === 20 && storyState.ascendedMalakorDefeated) {
        storyState.currentLevel = 21;
        hasLegendTitle = true;
        playerState.gold += 260;
        playerState.health = playerState.maxHealth;
        advanced = true;
      }

      if (storyState.currentLevel === 21 && (storyState.ranchTotalRanks || 0) >= 2) {
        storyState.currentLevel = 22;
        playerState.gold += 150;
        advanced = true;
      }

      if (storyState.currentLevel === 22 && (storyState.warhoundRank || 0) >= 1 && (storyState.s22Beasts || 0) >= 4) {
        storyState.currentLevel = 23;
        playerState.gold += 165;
        advanced = true;
      }

      if (storyState.currentLevel === 23 && (storyState.horseshoesFound || 0) >= 4) {
        storyState.currentLevel = 24;
        playerState.gold += 180;
        advanced = true;
      }

      if (
        storyState.currentLevel === 24 &&
        (storyState.oasisIdolsCollected || 0) >= 3 &&
        (storyState.oasisFoesKilled || 0) >= 3
      ) {
        storyState.currentLevel = 25;
        playerState.gold += 195;
        advanced = true;
      }

      if (storyState.currentLevel === 25 && storyState.sandwraithDefeated) {
        storyState.currentLevel = 26;
        playerState.gold += 220;
        advanced = true;
      }

      if (
        storyState.currentLevel === 26 &&
        (storyState.ranchTotalRanks || 0) >= 5 &&
        (storyState.totalBountiesDone || 0) >= 10
      ) {
        storyState.currentLevel = 27;
        playerState.gold += 230;
        advanced = true;
      }

      if (
        storyState.currentLevel === 27 &&
        (storyState.millCratesCollected || 0) >= 3 &&
        (storyState.alphaWolvesKilled || 0) >= 5
      ) {
        storyState.currentLevel = 28;
        playerState.gold += 240;
        advanced = true;
      }

      if (storyState.currentLevel === 28 && storyState.goliathDefeated) {
        storyState.currentLevel = 29;
        playerState.gold += 260;
        advanced = true;
      }

      if (storyState.currentLevel === 29 && (storyState.horseshoesFound || 0) >= 8) {
        storyState.currentLevel = 30;
        playerState.gold += 270;
        advanced = true;
      }

      if (
        storyState.currentLevel === 30 &&
        (storyState.meteorCoresCollected || 0) >= 3 &&
        (storyState.hellhoundsKilled || 0) >= 3
      ) {
        storyState.currentLevel = 31;
        playerState.gold += 285;
        advanced = true;
      }

      if (storyState.currentLevel === 31 && storyState.elFuegoDefeated) {
        storyState.currentLevel = 32;
        playerState.gold += 310;
        advanced = true;
      }

      if (
        storyState.currentLevel === 32 &&
        (storyState.ranchTotalRanks || 0) >= 12 &&
        (storyState.totalBountiesDone || 0) >= 20
      ) {
        storyState.currentLevel = 33;
        playerState.gold += 320;
        advanced = true;
      }

      if (
        storyState.currentLevel === 33 &&
        (storyState.starShardsCollected || 0) >= 3 &&
        (storyState.observatoryFoesKilled || 0) >= 3
      ) {
        storyState.currentLevel = 34;
        playerState.gold += 335;
        advanced = true;
      }

      if (storyState.currentLevel === 34 && storyState.blackfeatherDefeated) {
        storyState.currentLevel = 35;
        playerState.gold += 360;
        advanced = true;
      }

      if (storyState.currentLevel === 35 && (storyState.horseshoesFound || 0) >= 14) {
        storyState.currentLevel = 36;
        playerState.gold += 375;
        advanced = true;
      }

      if (storyState.currentLevel === 36 && countUniqueBossesDefeated() >= 8) {
        storyState.currentLevel = 37;
        playerState.gold += 420;
        advanced = true;
      }

      if (storyState.currentLevel === 37 && (storyState.totalBountiesDone || 0) >= 35) {
        storyState.currentLevel = 38;
        playerState.gold += 430;
        advanced = true;
      }

      if (
        storyState.currentLevel === 38 &&
        (storyState.warhoundRank || 0) >= 5 &&
        (storyState.eliteKills || 0) >= 35
      ) {
        storyState.currentLevel = 39;
        playerState.gold += 450;
        advanced = true;
      }

      if (storyState.currentLevel === 39 && (storyState.horseshoesFound || 0) >= 20) {
        storyState.currentLevel = 40;
        playerState.gold += 475;
        advanced = true;
      }

      if (storyState.currentLevel === 40 && (storyState.ranchTotalRanks || 0) >= 25) {
        storyState.currentLevel = 41;
        playerState.gold += 500;
        advanced = true;
      }

      if (
        storyState.currentLevel === 41 &&
        (storyState.bisonHunted || 0) >= 12 &&
        (storyState.cougarsHunted || 0) >= 10 &&
        (storyState.whiteStagsHunted || 0) >= 4
      ) {
        storyState.currentLevel = 42;
        playerState.gold += 525;
        advanced = true;
      }

      if (
        storyState.currentLevel === 42 &&
        (storyState.totalBountiesDone || 0) >= 55 &&
        (storyState.totalKills || 0) >= 250
      ) {
        storyState.currentLevel = 43;
        playerState.gold += 550;
        advanced = true;
      }

      if (storyState.currentLevel === 43 && (storyState.horseshoesFound || 0) >= 24) {
        storyState.currentLevel = 44;
        playerState.gold += 600;
        advanced = true;
      }

      if (storyState.currentLevel === 44 && (storyState.eclipseKills || 0) >= 50) {
        storyState.currentLevel = 45;
        playerState.gold += 620;
        advanced = true;
      }

      if (storyState.currentLevel === 45 && (storyState.ranchTotalRanks || 0) >= 40) {
        storyState.currentLevel = 46;
        playerState.gold += 650;
        advanced = true;
      }

      if (storyState.currentLevel === 46 && (storyState.totalBountiesDone || 0) >= 80) {
        storyState.currentLevel = 47;
        playerState.gold += 700;
        advanced = true;
      }

      if (storyState.currentLevel === 47 && (storyState.eliteKills || 0) >= 80) {
        storyState.currentLevel = 48;
        playerState.gold += 750;
        advanced = true;
      }

      if (
        storyState.currentLevel === 48 &&
        (storyState.totalKills || 0) >= 450 &&
        (storyState.ranchTotalRanks || 0) >= 55
      ) {
        storyState.currentLevel = 49;
        playerState.gold += 800;
        advanced = true;
      }

      if (storyState.currentLevel === 49 && (storyState.totalBountiesDone || 0) >= 100) {
        storyState.currentLevel = 50;
        storyState.immortalFinaleMalakor = false;
        storyState.immortalFinaleWendigo = false;
        playerState.gold += 900;
        if (forceNightForBloodMoonHook) forceNightForBloodMoonHook();
        advanced = true;
      }

      if (
        storyState.currentLevel === 50 &&
        storyState.immortalFinaleMalakor &&
        storyState.immortalFinaleWendigo
      ) {
        storyState.currentLevel = 51;
        storyState.prestigeRank = Math.max(1, storyState.prestigeRank || 1);
        storyState.prestigeBeasts = 0;
        storyState.prestigeFoes = 0;
        storyState.prestigeBosses = 0;
        storyState.prestigeGoalBeasts = 10;
        storyState.prestigeGoalFoes = 12;
        storyState.prestigeGoalBosses = 1;
        hasLegendTitle = true;
        playerState.gold += 1500;
        playerState.health = playerState.maxHealth;
        advanced = true;
      }

      // Evige Prestisje-kapitler (Kapittel 51..999+ for 200+ timer fullføring!)
      if (
        storyState.currentLevel >= 51 &&
        (storyState.prestigeBeasts || 0) >= (storyState.prestigeGoalBeasts || 10) &&
        (storyState.prestigeFoes || 0) >= (storyState.prestigeGoalFoes || 12) &&
        (storyState.prestigeBosses || 0) >= (storyState.prestigeGoalBosses || 1)
      ) {
        storyState.currentLevel += 1;
        storyState.prestigeRank = (storyState.prestigeRank || 1) + 1;
        storyState.prestigeBeasts = 0;
        storyState.prestigeFoes = 0;
        storyState.prestigeBosses = 0;
        storyState.prestigeGoalBeasts = 10 + storyState.prestigeRank * 2;
        storyState.prestigeGoalFoes = 12 + storyState.prestigeRank * 2;
        storyState.prestigeGoalBosses = 1 + Math.floor(storyState.prestigeRank / 3);
        playerState.gold += 350 + storyState.prestigeRank * 85;
        playerState.dynamite += 3;
        playerState.health = playerState.maxHealth;
        advanced = true;
      }

      storyState.currentAct = Math.min(12, Math.ceil(storyState.currentLevel / 5));

      if (advanced) {
        saveCareerProgress();
        if (playStoryFanfareHook) playStoryFanfareHook();
        updateStatusUI();
      }
    }

    // Venstre håndleddsgruppe: inneholder erme/mansjett, Sheriff-stjerne, wristBoard, spiseknapp og språkknapp
    const leftWristRig = new THREE.Group();

    const leftSleeveMat = new THREE.MeshLambertMaterial({ color: 0xc8b28e });
    const leftCuffMat = new THREE.MeshLambertMaterial({ color: 0x8c6d46 });

    const leftSleeveMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.056, 0.21, 10),
      leftSleeveMat
    );
    leftSleeveMesh.rotation.x = Math.PI / 2;
    leftSleeveMesh.position.set(0, -0.015, 0.115);
    leftWristRig.add(leftSleeveMesh);

    const leftCuffMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.049, 0.049, 0.032, 10),
      leftCuffMat
    );
    leftCuffMesh.rotation.x = Math.PI / 2;
    leftCuffMesh.position.set(0, -0.015, 0.02);
    leftWristRig.add(leftCuffMesh);

    // Gullfarget 3D Sheriff-stjerne på venstre håndledd (låses opp av Oppdrag 1)
    const sheriffStarBadge = new THREE.Group();
    const sheriffGoldMat = new THREE.MeshStandardMaterial({
      color: 0xffd24a,
      emissive: 0x3b2600,
      metalness: 0.88,
      roughness: 0.22
    });
    const starTriGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.005, 3);
    const starTriA = new THREE.Mesh(starTriGeo, sheriffGoldMat);
    const starTriB = new THREE.Mesh(starTriGeo, sheriffGoldMat);
    starTriB.rotation.y = Math.PI;
    sheriffStarBadge.add(starTriA);
    sheriffStarBadge.add(starTriB);

    const starCenterBoss = new THREE.Mesh(
      new THREE.CylinderGeometry(0.009, 0.009, 0.007, 10),
      sheriffGoldMat
    );
    sheriffStarBadge.add(starCenterBoss);

    const starTipGeo = new THREE.SphereGeometry(0.0032, 6, 5);
    for (let i = 0; i < 6; i++) {
      const tipAngle = (i * Math.PI) / 3;
      const tip = new THREE.Mesh(starTipGeo, sheriffGoldMat);
      tip.position.set(Math.sin(tipAngle) * 0.024, 0, Math.cos(tipAngle) * 0.024);
      sheriffStarBadge.add(tip);
    }
    sheriffStarBadge.position.set(-0.018, 0.036, 0.045);
    sheriffStarBadge.rotation.set(0.2, 0, 0.28);
    sheriffStarBadge.visible = hasSheriffStar;
    leftWristRig.add(sheriffStarBadge);

    function updateLeftSleeveAppearance(tier) {
      if (tier === 1) {
        leftSleeveMat.color.setHex(0x8f491d);
        leftCuffMat.color.setHex(0xd49b4b);
      } else if (tier === 2) {
        leftSleeveMat.color.setHex(0x6d5239);
        leftCuffMat.color.setHex(0xe2b34c);
      } else if (tier === 3) {
        leftSleeveMat.color.setHex(0x556070);
        leftCuffMat.color.setHex(0xdce6f5);
      } else if (tier === 4) {
        leftSleeveMat.color.setHex(0x5c1424);
        leftCuffMat.color.setHex(0xe8bd54);
      } else if (tier === 5) {
        leftSleeveMat.color.setHex(0x1f3654);
        leftCuffMat.color.setHex(0xffd25a);
      } else if (tier >= 6) {
        leftSleeveMat.color.setHex(0x261d12);
        leftCuffMat.color.setHex(0xffdf4f);
      } else {
        leftSleeveMat.color.setHex(0xc8b28e);
        leftCuffMat.color.setHex(0x8c6d46);
      }
    }
    updateLeftSleeveAppearance(visualOutfitTier);

    const wristCanvas = document.createElement('canvas');
    wristCanvas.width = 640;
    wristCanvas.height = 448;
    const wristCtx = wristCanvas.getContext('2d');

    const wristTexture = new THREE.CanvasTexture(wristCanvas);
    wristTexture.colorSpace = THREE.SRGBColorSpace;
    wristTexture.anisotropy = maxAnisotropy;

    const wristBoard = new THREE.Mesh(
      new THREE.PlaneGeometry(0.28, 0.196),
      new THREE.MeshBasicMaterial({
        map: wristTexture,
        transparent: true,
        side: THREE.DoubleSide,
        fog: false,
        toneMapped: false
      })
    );
    wristBoard.position.set(0.055, 0.068, -0.04);
    wristBoard.rotation.set(-0.65, 0.25, 0.15);
    leftWristRig.add(wristBoard);

    // Klikkbar 3D-spiseknapp rett under wristBoard på venstre håndledd
    const eatBtnCanvas = document.createElement('canvas');
    eatBtnCanvas.width = 384;
    eatBtnCanvas.height = 96;
    const eatBtnCtx = eatBtnCanvas.getContext('2d');

    const eatBtnTexture = new THREE.CanvasTexture(eatBtnCanvas);
    eatBtnTexture.colorSpace = THREE.SRGBColorSpace;
    eatBtnTexture.anisotropy = maxAnisotropy;

    const eatWristButton = new THREE.Mesh(
      new THREE.PlaneGeometry(0.192, 0.048),
      new THREE.MeshBasicMaterial({
        map: eatBtnTexture,
        transparent: true,
        side: THREE.DoubleSide,
        fog: false,
        toneMapped: false
      })
    );
    eatWristButton.position.set(-0.044, -0.128, 0.002);
    wristBoard.add(eatWristButton);

    // Klikkbar 3D-språkknapp (EN / NO) ved siden av spiseknappen på wristBoard i VR
    const langWristCanvas = document.createElement('canvas');
    langWristCanvas.width = 192;
    langWristCanvas.height = 96;
    const langWristCtx = langWristCanvas.getContext('2d');

    const langWristTexture = new THREE.CanvasTexture(langWristCanvas);
    langWristTexture.colorSpace = THREE.SRGBColorSpace;
    langWristTexture.anisotropy = maxAnisotropy;

    const langWristButton = new THREE.Mesh(
      new THREE.PlaneGeometry(0.082, 0.048),
      new THREE.MeshBasicMaterial({
        map: langWristTexture,
        transparent: true,
        side: THREE.DoubleSide,
        fog: false,
        toneMapped: false
      })
    );
    langWristButton.position.set(0.099, -0.128, 0.002);
    wristBoard.add(langWristButton);

    // Klikkbar 3D-våpenbytteknapp («WEAPON / VÅPEN») rett under spise-/språkknappen i VR
    const weaponWristCanvas = document.createElement('canvas');
    weaponWristCanvas.width = 576;
    weaponWristCanvas.height = 96;
    const weaponWristCtx = weaponWristCanvas.getContext('2d');

    const weaponWristTexture = new THREE.CanvasTexture(weaponWristCanvas);
    weaponWristTexture.colorSpace = THREE.SRGBColorSpace;
    weaponWristTexture.anisotropy = maxAnisotropy;

    const weaponWristButton = new THREE.Mesh(
      new THREE.PlaneGeometry(0.28, 0.048),
      new THREE.MeshBasicMaterial({
        map: weaponWristTexture,
        transparent: true,
        side: THREE.DoubleSide,
        fog: false,
        toneMapped: false
      })
    );
    weaponWristButton.position.set(0, -0.182, 0.002);
    wristBoard.add(weaponWristButton);

    // Klikkbar 3D-hesteknapp («CALL HORSE / ROP PÅ HEST») rett under våpenknappen i VR
    const horseWristCanvas = document.createElement('canvas');
    horseWristCanvas.width = 576;
    horseWristCanvas.height = 96;
    const horseWristCtx = horseWristCanvas.getContext('2d');

    const horseWristTexture = new THREE.CanvasTexture(horseWristCanvas);
    horseWristTexture.colorSpace = THREE.SRGBColorSpace;
    horseWristTexture.anisotropy = maxAnisotropy;

    const horseWristButton = new THREE.Mesh(
      new THREE.PlaneGeometry(0.28, 0.048),
      new THREE.MeshBasicMaterial({
        map: horseWristTexture,
        transparent: true,
        side: THREE.DoubleSide,
        fog: false,
        toneMapped: false
      })
    );
    horseWristButton.position.set(0, -0.236, 0.002);
    wristBoard.add(horseWristButton);

    function updateEatWristButton() {
      const dict = L();
      const canEat = playerState.food > 0 && playerState.health < playerState.maxHealth;
      eatBtnCtx.clearRect(0, 0, eatBtnCanvas.width, eatBtnCanvas.height);

      drawRoundedRect(eatBtnCtx, 6, 6, eatBtnCanvas.width - 12, 84, 18);
      eatBtnCtx.fillStyle = canEat ? 'rgba(34, 82, 34, 0.96)' : 'rgba(46, 30, 18, 0.92)';
      eatBtnCtx.fill();
      eatBtnCtx.lineWidth = 5;
      eatBtnCtx.strokeStyle = canEat ? '#8be27b' : '#9c7848';
      eatBtnCtx.stroke();

      eatBtnCtx.textAlign = 'center';
      eatBtnCtx.textBaseline = 'middle';
      eatBtnCtx.font = 'bold 28px sans-serif';
      eatBtnCtx.fillStyle = canEat ? '#f3ffe8' : '#cbb698';
      eatBtnCtx.fillText(dict.eatBtn, eatBtnCanvas.width / 2, 50);

      eatBtnTexture.needsUpdate = true;

      // Oppdater 3D EN/NO-knappen på håndleddet
      langWristCtx.clearRect(0, 0, langWristCanvas.width, langWristCanvas.height);
      drawRoundedRect(langWristCtx, 6, 6, langWristCanvas.width - 12, 84, 18);
      langWristCtx.fillStyle = 'rgba(66, 38, 16, 0.96)';
      langWristCtx.fill();
      langWristCtx.lineWidth = 5;
      langWristCtx.strokeStyle = '#ffd275';
      langWristCtx.stroke();

      langWristCtx.textAlign = 'center';
      langWristCtx.textBaseline = 'middle';
      langWristCtx.font = 'bold 26px sans-serif';
      langWristCtx.fillStyle = '#fff5db';
      langWristCtx.fillText(dict.wristLangBtn, langWristCanvas.width / 2, 50);
      langWristTexture.needsUpdate = true;

      // Oppdater 3D VÅPEN / WEAPON-knappen på håndleddet
      weaponWristCtx.clearRect(0, 0, weaponWristCanvas.width, weaponWristCanvas.height);
      drawRoundedRect(weaponWristCtx, 6, 6, weaponWristCanvas.width - 12, 84, 18);
      weaponWristCtx.fillStyle = 'rgba(48, 32, 18, 0.96)';
      weaponWristCtx.fill();
      weaponWristCtx.lineWidth = 5;
      weaponWristCtx.strokeStyle = '#9fd4ff';
      weaponWristCtx.stroke();

      const wLabel = activeWeaponId === 'dynamite'
        ? `${dict.weaponCycleBtn(playerState.weapon)} (${playerState.dynamite})`
        : dict.weaponCycleBtn(playerState.weapon);
      weaponWristCtx.textAlign = 'center';
      weaponWristCtx.textBaseline = 'middle';
      weaponWristCtx.font = 'bold 26px sans-serif';
      weaponWristCtx.fillStyle = '#eef8ff';
      weaponWristCtx.fillText(wLabel, weaponWristCanvas.width / 2, 50);
      weaponWristTexture.needsUpdate = true;

      // Oppdater 3D ROP PÅ HEST / GÅ AV HEST-knappen på håndleddet
      horseWristCtx.clearRect(0, 0, horseWristCanvas.width, horseWristCanvas.height);
      drawRoundedRect(horseWristCtx, 6, 6, horseWristCanvas.width - 12, 84, 18);
      horseWristCtx.fillStyle = isRidingHorse ? 'rgba(84, 48, 18, 0.96)' : 'rgba(54, 34, 18, 0.96)';
      horseWristCtx.fill();
      horseWristCtx.lineWidth = 5;
      horseWristCtx.strokeStyle = isRidingHorse ? '#ffd670' : '#d49d56';
      horseWristCtx.stroke();

      horseWristCtx.textAlign = 'center';
      horseWristCtx.textBaseline = 'middle';
      horseWristCtx.font = 'bold 26px sans-serif';
      horseWristCtx.fillStyle = '#fff3dc';
      horseWristCtx.fillText(isRidingHorse ? dict.horseMountBtn : dict.horseCallBtn, horseWristCanvas.width / 2, 50);
      horseWristTexture.needsUpdate = true;
    }

    let refreshTailorWorkshopHook = null;
    let refreshQuestBoardHook = null;
    let refreshWorldSignsHook = null;
    function getLowestOpenBoardSlotIndex() {
      let bestIdx = 0;
      let bestSeq = Infinity;
      for (let i = 0; i < questBoardSlots.length; i++) {
        const seq = questBoardSlots[i];
        if (seq < bestSeq) {
          bestSeq = seq;
          bestIdx = i;
        }
      }
      return bestIdx;
    }

    function syncQuestHudBar() {
      if (!questHudBarEl) return;
      const dict = L();
      const isNo = currentLang === 'no';

      if (hudCompletedBanner && hudCompletedBanner.timer > 0) {
        const doneTitle = isNo ? hudCompletedBanner.noTitle : hudCompletedBanner.enTitle;
        const doneReward = isNo ? hudCompletedBanner.rewardNo : hudCompletedBanner.rewardEn;
        questHudBarEl.classList.remove('active-quest');
        questHudBarEl.classList.add('completed-flash');
        questHudBarEl.textContent = dict.questHudDoneBanner(hudCompletedBanner.seq, doneTitle, doneReward);
        return;
      }

      questHudBarEl.classList.remove('completed-flash');
      if (activeQuest) {
        const fmt = formatQuestTexts(activeQuest, currentLang, { hasSheriffStar, hasGoldenRevolver });
        questHudBarEl.classList.add('active-quest');
        questHudBarEl.textContent = dict.questHudActiveBtn(
          activeQuest.seq,
          `${fmt.title} — ${fmt.task}`,
          questProgress,
          activeQuest.goal,
          fmt.rewardSummary
        );
      } else {
        questHudBarEl.classList.remove('active-quest');
        const nextIdx = getLowestOpenBoardSlotIndex();
        const nextQuest = getQuestBySeq(questBoardSlots[nextIdx], storyState.prestigeRank || 0);
        const fmt = formatQuestTexts(nextQuest, currentLang, { hasSheriffStar, hasGoldenRevolver });
        questHudBarEl.textContent = dict.questHudIdleBtn(nextQuest.seq, `${fmt.title} — ${fmt.task}`);
      }
    }

    function getActiveQuestStatusLine() {
      const dict = L();
      if (hudCompletedBanner && hudCompletedBanner.timer > 0) {
        const doneTitle = currentLang === 'no' ? hudCompletedBanner.noTitle : hudCompletedBanner.enTitle;
        return `✓ #${hudCompletedBanner.seq} ${doneTitle} (${dict.badgeCompleted})`;
      }
      if (activeQuest) {
        const fmt = formatQuestTexts(activeQuest, currentLang, { hasSheriffStar, hasGoldenRevolver });
        return `${dict.questPrefix} #${activeQuest.seq}: ${fmt.title} (${questProgress}/${activeQuest.goal})`;
      }
      if ((storyState.totalBountiesDone || 0) > 0) {
        return dict.questAllDone;
      }
      return dict.questNone;
    }

    function getCompletionData() {
      syncHomesteadStoryCounters();
      const level = Math.min(50, Math.max(1, storyState.currentLevel || 1));
      const campCompleted = storyState.currentLevel > 50 ? 50 : Math.max(0, level - 1);
      const prestige = Math.max(0, storyState.prestigeRank || 0);
      const bounties = Math.max(0, storyState.totalBountiesDone || completedQuests.length);
      const horseshoes = Math.min(24, collectedHorseshoeIds.length);
      const waystones = Math.min(36, collectedWaystoneIds.length);
      const bosses = countUniqueBossesDefeated();
      const ranchRanks = Math.max(0, storyState.ranchTotalRanks || 0);
      const hpTailorRanks = Math.max(0, Math.round((Math.min(300, playerState.maxHealth) - 100) / 15));
      const gearRanks = Math.max(0, currentOutfitTier) + Math.max(0, weaponMasteryRank) + hpTailorRanks;
      const kills = Math.max(0, storyState.totalKills || 0);

      const p1 = Math.min(1, campCompleted / 50);
      const p2 = Math.min(1, prestige / 15);
      const p3 = Math.min(1, bounties / 300);
      const p4 = Math.min(1, horseshoes / 24);
      const p5 = Math.min(1, waystones / 36);
      const p6 = Math.min(1, bosses / 12);
      const p7 = Math.min(1, ranchRanks / 85);
      const p8 = Math.min(1, gearRanks / 40);
      const p9 = Math.min(1, kills / 3000);

      const overallFrac = (p1 + p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9) / 9;
      const pct = Math.min(100, Math.round(overallFrac * 1000) / 10);
      const pctStr = pct.toFixed(1);

      return {
        pct,
        pctStr,
        level: storyState.currentLevel > 50 ? 50 : level,
        prestige,
        bounties,
        horseshoes,
        waystones,
        bosses,
        ranchRanks,
        gearRanks,
        kills
      };
    }

    function showFrontierToast(msg, duration = 5.5) {
      toastBannerText = msg || '';
      toastBannerTimer = duration;
      syncWorldEventBar();
    }

    function syncWorldEventBar() {
      if (!worldEventBarEl) return;
      const dict = L();
      if (toastBannerTimer > 0 && toastBannerText) {
        worldEventBarEl.style.display = 'block';
        worldEventBarEl.textContent = toastBannerText;
        return;
      }
      if (activeWorldEventId && worldEventTimer > 0 && dict.worldEvents && dict.worldEvents[activeWorldEventId]) {
        worldEventBarEl.style.display = 'block';
        const secLeft = Math.max(1, Math.ceil(worldEventTimer));
        worldEventBarEl.textContent = `${dict.worldEvents[activeWorldEventId]} [${secLeft}s]`;
        return;
      }
      worldEventBarEl.style.display = 'none';
    }

    function triggerWorldEvent(evId) {
      const chosen = evId && WORLD_EVENT_IDS.includes(evId)
        ? evId
        : WORLD_EVENT_IDS[worldEventSeqIdx++ % WORLD_EVENT_IDS.length];
      activeWorldEventId = chosen;
      worldEventTimer = 90;
      worldEventCooldown = 190;
      syncWorldEventBar();
      if (playStoryFanfareHook) playStoryFanfareHook();
    }

    let stagecoachTravelHook = null;

    function renderCodexModal() {
      if (!codexModalEl) return;
      const dict = L();
      const comp = getCompletionData();
      if (codexTitleEl && dict.codexTitle) codexTitleEl.textContent = dict.codexTitle;
      if (codexCloseBtnEl && dict.codexCloseBtn) codexCloseBtnEl.textContent = dict.codexCloseBtn;
      if (codexOverallLabelEl && dict.codexOverallLabel) {
        codexOverallLabelEl.textContent = dict.codexOverallLabel(comp.pctStr, formatPlaytimeShort(totalPlaySeconds));
      }
      if (codexBarFillEl) codexBarFillEl.style.width = `${comp.pct}%`;

      if (codexPillarsGridEl && dict.codexPillars) {
        const lines = dict.codexPillars(comp);
        codexPillarsGridEl.innerHTML = '';
        lines.forEach((txt) => {
          const div = document.createElement('div');
          div.className = 'codex-pillar-item';
          div.textContent = txt;
          codexPillarsGridEl.appendChild(div);
        });
      }

      if (codexTravelHdrEl && dict.codexTravelHeader) {
        codexTravelHdrEl.textContent = dict.codexTravelHeader;
      }
      if (codexTravelGridEl && Array.isArray(dict.codexRegions)) {
        codexTravelGridEl.innerHTML = '';
        dict.codexRegions.forEach((reg) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'codex-travel-btn';
          btn.dataset.regionId = reg.id;
          btn.textContent = reg.label;
          btn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            if (stagecoachTravelHook) stagecoachTravelHook(reg);
          });
          codexTravelGridEl.appendChild(btn);
        });
      }
    }

    function toggleCodexModal(forceState) {
      if (!codexModalEl) return;
      const willOpen = typeof forceState === 'boolean' ? forceState : !codexModalEl.classList.contains('open');
      codexModalEl.classList.toggle('open', willOpen);
      if (willOpen) {
        renderCodexModal();
        if (document.pointerLockElement && document.exitPointerLock) {
          document.exitPointerLock();
        }
      }
    }

    if (codexBtnEl) {
      codexBtnEl.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleCodexModal();
      });
    }
    if (codexCloseBtnEl) {
      codexCloseBtnEl.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleCodexModal(false);
      });
    }
    if (codexModalEl) {
      codexModalEl.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        if (e.target === codexModalEl) toggleCodexModal(false);
      });
    }

    function updateStatusUI() {
      syncLocalizedStateStrings();
      syncQuestHudBar();
      syncWorldEventBar();
      const dict = L();
      const comp = getCompletionData();
      document.documentElement.lang = currentLang === 'no' ? 'no' : 'en';
      if (langBtnEl) langBtnEl.textContent = dict.langBtn;
      if (codexBtnEl) {
        codexBtnEl.textContent = dict.codexBtn ? dict.codexBtn(comp.pctStr) : `📖 Codex: ${comp.pctStr}%`;
      }
      if (codexModalEl && codexModalEl.classList.contains('open')) {
        renderCodexModal();
      }
      if (pcHintEl) pcHintEl.innerHTML = dict.pcHintHtml;
      syncControlsLocalizationUI();

      const titleSuffix = playerState.title ? ` | ${dict.hudTitle}: ${playerState.title}` : '';
      const storyLine = getStoryStatusLine();
      const questLine = getActiveQuestStatusLine();
      const horseHudSuffix = isRidingHorse ? `  |  ${dict.horseRidingHud}` : '';
      const effMaxHp = playerState.maxHealth + (mmoSystem ? mmoSystem.getBonusMaxHp() : 0);
      const hpDisplay = effMaxHp > 100
        ? `${playerState.health}/${effMaxHp}`
        : `${playerState.health}`;
      const careerSuffix = ` | ${dict.hudKills || 'Kills'}: ${storyState.totalKills || 0} | ⏱ ${formatPlaytimeShort(totalPlaySeconds)}`;
      const summaryText =
        `${dict.hudHealth}: ${hpDisplay} | ${dict.hudGold}: ${playerState.gold} | ` +
        `${dict.hudWeapon}: ${playerState.weapon} | ${dict.hudDynamite}: ${playerState.dynamite} | ` +
        `${dict.hudFood}: ${playerState.food} ${dict.hudEatHint} | ${dict.hudPelts}: ${playerState.pelt} | 🪵 ${dict.hudWood || 'Wood'}: ${playerState.wood || 0} [X] | ` +
        `${dict.hudOutfit}: ${playerState.outfit} | ${dict.hudTime}: ${playerState.timeOfDay}${titleSuffix}${horseHudSuffix}${careerSuffix}\n` +
        `${storyLine}  •  ${questLine}`;
      hudEl.textContent = playerHiddenStatus ? `${summaryText}\n${dict.hiddenStatus}` : summaryText;

      wristCtx.clearRect(0, 0, wristCanvas.width, wristCanvas.height);

      // Mørk lær-/trebakgrunn med messingramme
      drawRoundedRect(wristCtx, 8, 8, 624, 432, 24);
      wristCtx.fillStyle = 'rgba(38, 22, 11, 0.95)';
      wristCtx.fill();
      wristCtx.lineWidth = 6;
      wristCtx.strokeStyle = '#d9a04e';
      wristCtx.stroke();

      wristCtx.textAlign = 'left';
      wristCtx.textBaseline = 'middle';

      wristCtx.font = 'bold 24px Georgia, serif';
      wristCtx.fillStyle = playerState.title ? '#ffe07a' : '#f2c16b';
      const headerLabel = playerState.title
        ? `${dict.wristLegendPrefix}${playerState.title.toUpperCase()}`
        : dict.wristHeader;
      wristCtx.fillText(headerLabel, 34, 44);

      if (hasSheriffStar) {
        drawSheriffStar2D(wristCtx, 584, 44, 19, 9.5);
      }

      wristCtx.strokeStyle = 'rgba(217, 160, 78, 0.4)';
      wristCtx.lineWidth = 2;
      wristCtx.beginPath();
      wristCtx.moveTo(34, 72);
      wristCtx.lineTo(606, 72);
      wristCtx.stroke();

      wristCtx.font = 'bold 29px sans-serif';
      wristCtx.fillStyle = '#fff4dc';
      wristCtx.fillText(`${dict.hudHealth}: ${playerState.health}`, 34, 108);
      wristCtx.fillStyle = '#ffe07a';
      wristCtx.fillText(`${dict.hudGold}: ${playerState.gold}`, 250, 108);
      wristCtx.fillStyle = '#fff4dc';
      wristCtx.fillText(`${dict.hudTime}: ${playerState.timeOfDay}`, 440, 108);

      wristCtx.fillText(`${dict.hudFood}: ${playerState.food}`, 34, 156);
      wristCtx.fillText(`${dict.hudPelts}: ${playerState.pelt}`, 205, 156);
      wristCtx.fillStyle = '#ffe082';
      wristCtx.fillText(`🪵 ${playerState.wood || 0}`, 360, 156);
      wristCtx.fillStyle = '#ffb88a';
      wristCtx.fillText(`Dyn: ${playerState.dynamite}`, 465, 156);

      wristCtx.font = 'bold 26px sans-serif';
      wristCtx.fillStyle = '#bfe4ff';
      wristCtx.fillText(`${dict.hudWeapon}: ${playerState.weapon}`, 34, 204);

      wristCtx.font = 'bold 25px sans-serif';
      wristCtx.fillStyle = '#ffd98e';
      wristCtx.fillText(`${dict.hudOutfit}: ${playerState.outfit}`, 34, 248);

      // Skillelinje før 4-akts historie og dusøroppdrag på wristBoard
      wristCtx.strokeStyle = 'rgba(217, 160, 78, 0.35)';
      wristCtx.beginPath();
      wristCtx.moveTo(34, 280);
      wristCtx.lineTo(606, 280);
      wristCtx.stroke();

      let storyFontSize = 23;
      wristCtx.font = `bold ${storyFontSize}px sans-serif`;
      while (storyFontSize > 15 && wristCtx.measureText(storyLine).width > 572) {
        storyFontSize -= 1;
        wristCtx.font = `bold ${storyFontSize}px sans-serif`;
      }
      wristCtx.fillStyle = '#ffe89e';
      wristCtx.fillText(storyLine, 34, 316);

      let questFontSize = 23;
      wristCtx.font = `bold ${questFontSize}px sans-serif`;
      while (questFontSize > 16 && wristCtx.measureText(questLine).width > 572) {
        questFontSize -= 1;
        wristCtx.font = `bold ${questFontSize}px sans-serif`;
      }
      wristCtx.fillStyle = activeQuest ? '#a6f096' : '#f5d284';
      wristCtx.fillText(questLine, 34, 358);

      if (playerHiddenStatus) {
        wristCtx.font = 'bold 22px sans-serif';
        wristCtx.fillStyle = '#8ff0a8';
        wristCtx.fillText(dict.hiddenStatus, 34, 398);
      }

      wristTexture.needsUpdate = true;

      updateEatWristButton();
      if (refreshTailorWorkshopHook) refreshTailorWorkshopHook();
      if (refreshGunsmithHook) refreshGunsmithHook();
      if (refreshHomesteadHook) refreshHomesteadHook();
      if (refreshQuestBoardHook) refreshQuestBoardHook();
      if (refreshSheriffHook) refreshSheriffHook();
      if (refreshWorldSignsHook) refreshWorldSignsHook();
      if (mmoSystem) mmoSystem.refreshLanguage();
      if (shopAndCameraSystem) {
        shopAndCameraSystem.syncViewButtonsUI();
        if (shopAndCameraSystem.isStoreModalOpen()) shopAndCameraSystem.renderStoreModal();
      }
      if (frontierExpansion) {
        frontierExpansion.refreshLanguage();
      }
    }

    function setLanguage(lang) {
      currentLang = lang === 'no' ? 'no' : 'en';
      updateStatusUI();
    }

    function toggleLanguage() {
      setLanguage(currentLang === 'en' ? 'no' : 'en');
    }

    if (langBtnEl) {
      langBtnEl.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleLanguage();
      });
    }

    updateStatusUI();

    // Opprett begge VR-kontrollerne og legg dem i playerRig
    const controllers = [];
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x4a2e18, roughness: 0.8 });
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x555b62, roughness: 0.4, metalness: 0.6 });

    for (let i = 0; i < 2; i++) {
      const controller = renderer.xr.getController(i);

      // Enkel synlig hånd-/revolvermarkør og siktestråle i VR
      const handMarker = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.14), barrelMat);
      handMarker.name = 'handMarker';
      handMarker.position.set(0, 0, -0.04);
      controller.add(handMarker);

      const handleMesh = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.08, 0.045), gripMat);
      handleMesh.name = 'handleMesh';
      handleMesh.position.set(0, -0.045, 0.01);
      handleMesh.rotation.x = 0.3;
      controller.add(handleMesh);

      const rayGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, -0.1),
        new THREE.Vector3(0, 0, -8)
      ]);
      const rayLine = new THREE.Line(
        rayGeo,
        new THREE.LineBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0.65 })
      );
      controller.add(rayLine);

      // Fest håndleddsgruppen (erme, wristBoard og spiseknapp) til kontroller 0 som standard,
      // og flytt automatisk til den kontrolleren WebXR rapporterer som venstre hånd ('left')
      if (i === 0) {
        controller.add(leftWristRig);
      }
      controller.addEventListener('connected', (e) => {
        if (e.data && e.data.handedness === 'left') {
          controller.add(leftWristRig);
        }
      });

      // Vis kontroller-modeller og håndleddstavle i VR (unngår løs stråle på bakken på PC)
      controller.visible = false;

      playerRig.add(controller);
      controllers.push(controller);
    }

    renderer.xr.addEventListener('sessionstart', () => {
      controllers.forEach((c) => { c.visible = true; });
    });
    renderer.xr.addEventListener('sessionend', () => {
      controllers.forEach((c) => { c.visible = false; });
    });

    // =========================================================================
    // 3–6. PBR-TEKSTURER, SKY/PMREM, ØRKENLANDSKAP, SKULPTURERTE MODELLER OG BY
    // =========================================================================
    const M = initTexturesAndMaterials(maxAnisotropy);
    const { windowMat, rimUniforms, texturesReadyPromise } = M;

    const W = buildEnvironmentAndScenery({ scene, renderer, L, M, maxAnisotropy, Sky });
    const {
      sky, skySunVec, dayEnvRT, nightEnvRT,
      hdrState, mountHDRIEnvironments,
      hemiLight, sunLight, sunMesh,
      rockColliders,
      structureWallColliders,
      goldPickups,
      goldHitMeshes,
      moonstoneTotems,
      moonstoneHitMeshes,
      fortStrongboxes,
      fortStrongboxHitMeshes,
      brimstoneTotems,
      brimstoneTotemHitMeshes,
      ancientRunes,
      ancientRuneHitMeshes,
      oasisIdols,
      oasisIdolHitMeshes,
      millCrates,
      millCrateHitMeshes,
      meteorCores,
      meteorCoreHitMeshes,
      starShards,
      starShardHitMeshes,
      goldenHorseshoes,
      goldenHorseshoeHitMeshes,
      wendigoAltarHitMeshes,
      wendigoObeliskOrb,
      wendigoAltarWorldPos,
      mineBarricades,
      barricadeHitMeshes,
      mineMapPickup,
      hellfirePickup,
      mountTrainAsset,
      mountWorldBotanicalAndWildlifeAssets,
      updateAmbientWildlife,
      registerWorldVirtualLight,
      updateWorldPerformanceAndLights,
      trainGatlingHitMeshes,
      gatlingHalo,
      windUniforms,
      updateGodRays,
      chapelAltarHitMeshes,
      bloodChaliceOrb,
      mineGroup,
      chapelGroup,
      refreshRegionSigns,
      campfireFlameMeshes, campfireLight, campfireEmberMat
    } = W;

    if (goldenHorseshoes && collectedHorseshoeIds.length > 0) {
      for (let i = 0; i < goldenHorseshoes.length; i++) {
        const hs = goldenHorseshoes[i];
        if (collectedHorseshoeIds.includes(hs.id)) {
          hs.collected = true;
          hs.group.visible = false;
        }
      }
    }

    const [
      desertSunsetHDR,
      moonlitNightHDR,
      revolverGLTF,
      shotgunGLTF,
      rifleGLTF,
      crossbowGLTF,
      dynamiteGLTF,
      hellfireGLTF,
      saloonGLTF,
      tailorGLTF,
      gunsmithGLTF,
      trainGLTF,
      banditGLTF,
      tailorNpcGLTF,
      gunsmithNpcGLTF,
      sheriffNpcGLTF,
      vampireGLTF,
      deerGLTF,
      wolfGLTF,
      bearGLTF,
      horseGLTF,
      bossVampireGLTF,
      treesGLTF,
      shrubsGLTF,
      undergrowthGLTF,
      wildlifeGLTF
    ] = window.__WVR_DEPS.preloaded;
    if (mountHDRIEnvironments) {
      mountHDRIEnvironments(desertSunsetHDR, moonlitNightHDR);
    }

    if (mountTrainAsset && trainGLTF) {
      mountTrainAsset(trainGLTF);
    }

    if (mountWorldBotanicalAndWildlifeAssets) {
      mountWorldBotanicalAndWildlifeAssets({
        trees: treesGLTF,
        shrubs: shrubsGLTF,
        undergrowth: undergrowthGLTF,
        wildlife: wildlifeGLTF
      });
    }

    const loadedAssets = {
      revolver: revolverGLTF,
      shotgun: shotgunGLTF,
      rifle: rifleGLTF,
      crossbow: crossbowGLTF,
      dynamite: dynamiteGLTF,
      hellfire: hellfireGLTF,
      saloon: saloonGLTF,
      tailor: tailorGLTF,
      gunsmith: gunsmithGLTF,
      train: trainGLTF,
      bandit: banditGLTF,
      tailorNpc: tailorNpcGLTF,
      gunsmithNpc: gunsmithNpcGLTF,
      sheriffNpc: sheriffNpcGLTF,
      vampire: vampireGLTF,
      deer: deerGLTF,
      wolf: wolfGLTF,
      bear: bearGLTF,
      horse: horseGLTF,
      bossVampire: bossVampireGLTF,
      trees: treesGLTF,
      shrubs: shrubsGLTF,
      undergrowth: undergrowthGLTF,
      wildlife: wildlifeGLTF
    };

    // --- 5a. Saloon / Oppdragsbygg og roterende «SHERIFF'S BOUNTY BOARD» (Oppdrag #1 -> #2 -> #3 -> #4 ... #999+!) ---
    let saloonMainSignMesh = null;
    let tailorMainSignMesh = null;
    let gunsmithMainSignMesh = null;
    let safeHouseMainSignMesh = null;
    let safeHouseStreetSignMesh = null;
    let saloonLangSignMesh = null;
    const worldLangButtonMeshes = [];

    let saloonQuestAnchorMesh = null;
    const saloonQuestButtonMeshes = [];
    const saloonQuestBlockMeshes = [];
    let questBoardMessageKey = '';
    let questBoardMessageArg = null;
    let questBoardMessageSuccess = true;
    let questBoardTimer = 0;

    const saloonQuestCanvas = document.createElement('canvas');
    saloonQuestCanvas.width = 1024;
    saloonQuestCanvas.height = 512;
    const saloonQuestCtx = saloonQuestCanvas.getContext('2d');
    const saloonQuestTexture = new THREE.CanvasTexture(saloonQuestCanvas);
    saloonQuestTexture.colorSpace = THREE.SRGBColorSpace;
    saloonQuestTexture.anisotropy = maxAnisotropy;

    function createQuestButtonEntry(slotIndex) {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 126;
      const ctx = canvas.getContext('2d');
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = maxAnisotropy;

      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(2.58, 0.31),
        new THREE.MeshBasicMaterial({ map: texture, transparent: true, fog: false, toneMapped: false })
      );
      mesh.userData.questSlotIndex = slotIndex;
      return { slotIndex, canvas, ctx, texture, mesh };
    }

    const saloonQuestButtonEntries = [0, 1, 2].map((slotIdx) => createQuestButtonEntry(slotIdx));

    function resolveQuestBoardMessage() {
      const dict = L();
      const isNo = currentLang === 'no';
      if (!questBoardMessageKey) return '';
      if (questBoardMessageKey === 'active_now' && questBoardMessageArg) {
        const q = questBoardMessageArg;
        const qTitle = isNo ? q.noTitle : q.enTitle;
        return dict.questMsgActiveNow(q.seq, qTitle, questProgress, q.goal);
      }
      if (questBoardMessageKey === 'accepted' && questBoardMessageArg) {
        const q = questBoardMessageArg;
        const qTitle = isNo ? q.noTitle : q.enTitle;
        return dict.questMsgAccepted(q.seq, qTitle);
      }
      if (questBoardMessageKey === 'completed_toast' && questBoardMessageArg) {
        const info = questBoardMessageArg;
        const qTitle = isNo ? info.noTitle : info.enTitle;
        const rew = isNo ? info.rewardNo : info.rewardEn;
        return dict.questMsgCompletedToast(info.seq, qTitle, rew);
      }
      return questBoardMessageKey;
    }

    function updateSaloonQuestBoardUI() {
      const dict = L();
      const isNo = currentLang === 'no';
      const totalDone = storyState.totalBountiesDone || completedQuests.length;
      saloonQuestCtx.clearRect(0, 0, saloonQuestCanvas.width, saloonQuestCanvas.height);

      drawRoundedRect(saloonQuestCtx, 8, 8, 1008, 496, 22);
      saloonQuestCtx.fillStyle = 'rgba(42, 24, 12, 0.97)';
      saloonQuestCtx.fill();
      saloonQuestCtx.lineWidth = 8;
      saloonQuestCtx.strokeStyle = '#d9a04e';
      saloonQuestCtx.stroke();

      drawRoundedRect(saloonQuestCtx, 22, 22, 980, 468, 14);
      saloonQuestCtx.lineWidth = 2;
      saloonQuestCtx.strokeStyle = 'rgba(245, 205, 130, 0.45)';
      saloonQuestCtx.stroke();

      drawSheriffStar2D(saloonQuestCtx, 92, 58, 22, 11);
      drawSheriffStar2D(saloonQuestCtx, 932, 58, 22, 11);

      saloonQuestCtx.textAlign = 'center';
      saloonQuestCtx.textBaseline = 'middle';
      saloonQuestCtx.font = 'bold 42px Georgia, serif';
      saloonQuestCtx.fillStyle = '#fff1cf';
      saloonQuestCtx.fillText(dict.questBoardTitle, 512, 58);

      const bannerMsg = resolveQuestBoardMessage();
      if (questBoardTimer > 0 && bannerMsg) {
        drawRoundedRect(saloonQuestCtx, 44, 90, 936, 50, 12);
        saloonQuestCtx.fillStyle = questBoardMessageSuccess
          ? 'rgba(30, 98, 40, 0.96)'
          : 'rgba(132, 34, 26, 0.96)';
        saloonQuestCtx.fill();
        saloonQuestCtx.lineWidth = 3;
        saloonQuestCtx.strokeStyle = questBoardMessageSuccess ? '#9bf08a' : '#ff9a8a';
        saloonQuestCtx.stroke();

        let bFont = 25;
        saloonQuestCtx.font = `bold ${bFont}px sans-serif`;
        while (bFont > 17 && saloonQuestCtx.measureText(bannerMsg).width > 904) {
          bFont -= 1;
          saloonQuestCtx.font = `bold ${bFont}px sans-serif`;
        }
        saloonQuestCtx.fillStyle = '#ffffff';
        saloonQuestCtx.fillText(bannerMsg, 512, 116);
      } else {
        const activeTitle = activeQuest ? (isNo ? activeQuest.noTitle : activeQuest.enTitle) : '';
        const subText = activeQuest
          ? dict.questBoardActiveSub(
              activeQuest.seq,
              activeTitle,
              questProgress,
              activeQuest.goal,
              totalDone,
              playerState.gold
            )
          : dict.questBoardIdleSub(totalDone, playerState.gold);
        let subFont = 23;
        saloonQuestCtx.font = `bold ${subFont}px sans-serif`;
        while (subFont > 17 && saloonQuestCtx.measureText(subText).width > 930) {
          subFont -= 1;
          saloonQuestCtx.font = `bold ${subFont}px sans-serif`;
        }
        saloonQuestCtx.fillStyle = '#f2c16b';
        saloonQuestCtx.fillText(subText, 512, 116);
      }

      saloonQuestTexture.needsUpdate = true;

      saloonQuestButtonEntries.forEach((entry) => {
        const { slotIndex, canvas, ctx, texture } = entry;
        const flash = slotCompletedFlash[slotIndex];
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Vis tydelig grønn «✓ FULLFØRT!»-markering i 2.8s før oppdraget forsvinner og erstattes av neste i køen!
        if (flash && flash.timer > 0) {
          drawRoundedRect(ctx, 6, 6, canvas.width - 12, canvas.height - 12, 16);
          ctx.fillStyle = '#1d5e28';
          ctx.strokeStyle = '#9cff91';
          ctx.fill();
          ctx.lineWidth = 5.5;
          ctx.stroke();

          drawRoundedRect(ctx, 744, 18, 256, 44, 10);
          ctx.fillStyle = 'rgba(130, 255, 130, 0.30)';
          ctx.fill();

          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = 'bold 21px sans-serif';
          ctx.fillStyle = '#ebffea';
          ctx.fillText(dict.badgeCompleted, 872, 41);

          const fTitle = isNo ? flash.noTitle : flash.enTitle;
          const fRew = isNo ? flash.rewardNo : flash.rewardEn;
          const line1 = dict.questCompletedSlotLine1(flash.seq, fTitle);
          const line2 = dict.questCompletedSlotLine2(fRew);

          ctx.textAlign = 'left';
          let tFont = 25;
          ctx.font = `bold ${tFont}px sans-serif`;
          while (tFont > 17 && ctx.measureText(line1).width > 706) {
            tFont -= 1;
            ctx.font = `bold ${tFont}px sans-serif`;
          }
          ctx.fillStyle = '#eaffea';
          ctx.fillText(line1, 28, 41);

          let rFont = 20;
          ctx.font = `bold ${rFont}px sans-serif`;
          while (rFont > 15 && ctx.measureText(line2).width > 960) {
            rFont -= 1;
            ctx.font = `bold ${rFont}px sans-serif`;
          }
          ctx.fillStyle = '#b9ffb5';
          ctx.fillText(line2, 28, 88);

          texture.needsUpdate = true;
          return;
        }

        const seq = questBoardSlots[slotIndex];
        const quest = (activeQuest && activeQuest.seq === seq)
          ? activeQuest
          : getQuestBySeq(seq, storyState.prestigeRank || 0);
        const fmt = formatQuestTexts(quest, currentLang, { hasSheriffStar, hasGoldenRevolver });
        const isActive = !!(activeQuest && activeQuest.seq === seq);
        const savedProg = questProgressMap[seq] || 0;
        const shownProg = isActive ? questProgress : savedProg;

        drawRoundedRect(ctx, 6, 6, canvas.width - 12, canvas.height - 12, 16);
        if (isActive) {
          ctx.fillStyle = '#683f12';
          ctx.strokeStyle = '#ffe074';
        } else {
          ctx.fillStyle = '#4c2c15';
          ctx.strokeStyle = '#cc9548';
        }
        ctx.fill();
        ctx.lineWidth = 5;
        ctx.stroke();

        let statusLabel = dict.badgeOpen;
        let badgeBg = 'rgba(217, 160, 78, 0.22)';
        let badgeTextCol = '#ffe3a3';
        if (isActive) {
          statusLabel = `${dict.badgeActive} (${shownProg}/${quest.goal})`;
          badgeBg = 'rgba(255, 214, 90, 0.30)';
          badgeTextCol = '#fff3a6';
        } else if (savedProg > 0) {
          statusLabel = `${dict.badgeOpen} (${savedProg}/${quest.goal})`;
        }

        drawRoundedRect(ctx, 756, 18, 244, 44, 10);
        ctx.fillStyle = badgeBg;
        ctx.fill();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 21px sans-serif';
        ctx.fillStyle = badgeTextCol;
        ctx.fillText(statusLabel, 878, 41);

        ctx.textAlign = 'left';
        let titleFont = 25;
        ctx.font = `bold ${titleFont}px sans-serif`;
        while (titleFont > 16 && ctx.measureText(fmt.cardTitleLine).width > 716) {
          titleFont -= 1;
          ctx.font = `bold ${titleFont}px sans-serif`;
        }
        ctx.fillStyle = '#fff7e5';
        ctx.fillText(fmt.cardTitleLine, 28, 41);

        let rewFont = 20.5;
        ctx.font = `bold ${rewFont}px sans-serif`;
        while (rewFont > 15 && ctx.measureText(fmt.rewardLine).width > 960) {
          rewFont -= 1;
          ctx.font = `bold ${rewFont}px sans-serif`;
        }
        ctx.fillStyle = '#f5c76e';
        ctx.fillText(fmt.rewardLine, 28, 88);

        texture.needsUpdate = true;
      });
    }

    refreshQuestBoardHook = updateSaloonQuestBoardUI;

    // --- 5b. Skredder-butikk med disk, skulpturert skredder-NPC og interaktivt verksted ---
    const TAILOR_OUTFITS = [
      { level: 1, tier: 1, cost: 2, goldCost: 35, damageMultiplier: 0.75, nightMonsterDamage: 1 },
      { level: 2, tier: 3, cost: 4, goldCost: 180, damageMultiplier: 0.45, nightMonsterDamage: 2 },
      { level: 3, tier: 4, cost: 6, goldCost: 340, damageMultiplier: 0.30, nightMonsterDamage: 2 }
    ];

    let tailorCounterMesh = null;
    let tailorNPCGroup = null;
    const tailorButtonMeshes = [];
    const tailorBlockHitMeshes = [];
    let tailorStatusMessageKey = '';
    let tailorStatusIsSuccess = true;
    let tailorStatusTimer = 0;

    const workshopBoardCanvas = document.createElement('canvas');
    workshopBoardCanvas.width = 1024;
    workshopBoardCanvas.height = 460;
    const workshopBoardCtx = workshopBoardCanvas.getContext('2d');
    const workshopBoardTexture = new THREE.CanvasTexture(workshopBoardCanvas);
    workshopBoardTexture.colorSpace = THREE.SRGBColorSpace;
    workshopBoardTexture.anisotropy = maxAnisotropy;

    function createTailorButtonEntry(outfit) {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 96;
      const ctx = canvas.getContext('2d');
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = maxAnisotropy;

      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(3.38, 0.30),
        new THREE.MeshBasicMaterial({ map: texture, transparent: true, fog: false, toneMapped: false })
      );
      mesh.userData.outfit = outfit;
      return { outfit, canvas, ctx, texture, mesh };
    }

    const tailorButtonEntries = TAILOR_OUTFITS.map((outfit) => createTailorButtonEntry(outfit));

    function resolveTailorStatusMessage() {
      const dict = L();
      if (!tailorStatusMessageKey) return '';
      if (tailorStatusMessageKey === 'same') return dict.tailorMsgSame;
      if (tailorStatusMessageKey === 'better') return dict.tailorMsgBetter;
      if (tailorStatusMessageKey === 'no_pelts') return dict.tailorMsgNoPelts;
      if (tailorStatusMessageKey === 'crafted') return dict.tailorMsgCrafted;
      if (tailorStatusMessageKey === 'hp_up' && dict.tailorMsgHpUp) return dict.tailorMsgHpUp(playerState.maxHealth);
      if (tailorStatusMessageKey === 'rations' && dict.tailorMsgRations) return dict.tailorMsgRations;
      return tailorStatusMessageKey;
    }

    function updateTailorWorkshopUI() {
      const dict = L();
      syncLocalizedStateStrings();

      workshopBoardCtx.clearRect(0, 0, workshopBoardCanvas.width, workshopBoardCanvas.height);

      drawRoundedRect(workshopBoardCtx, 8, 8, 1008, 444, 22);
      workshopBoardCtx.fillStyle = 'rgba(40, 23, 12, 0.97)';
      workshopBoardCtx.fill();
      workshopBoardCtx.lineWidth = 8;
      workshopBoardCtx.strokeStyle = '#d9a04e';
      workshopBoardCtx.stroke();

      drawRoundedRect(workshopBoardCtx, 22, 22, 980, 416, 14);
      workshopBoardCtx.lineWidth = 2;
      workshopBoardCtx.strokeStyle = 'rgba(245, 205, 130, 0.45)';
      workshopBoardCtx.stroke();

      workshopBoardCtx.textAlign = 'center';
      workshopBoardCtx.textBaseline = 'middle';
      workshopBoardCtx.font = 'bold 44px Georgia, serif';
      workshopBoardCtx.fillStyle = '#fff1cf';
      workshopBoardCtx.fillText(dict.tailorBoardTitle, 512, 58);

      const statusMsg = resolveTailorStatusMessage();
      if (tailorStatusTimer > 0 && statusMsg) {
        drawRoundedRect(workshopBoardCtx, 56, 88, 912, 48, 12);
        workshopBoardCtx.fillStyle = tailorStatusIsSuccess
          ? 'rgba(36, 98, 42, 0.95)'
          : 'rgba(132, 34, 26, 0.95)';
        workshopBoardCtx.fill();
        workshopBoardCtx.lineWidth = 3;
        workshopBoardCtx.strokeStyle = tailorStatusIsSuccess ? '#9bf08a' : '#ff9a8a';
        workshopBoardCtx.stroke();

        workshopBoardCtx.font = 'bold 27px sans-serif';
        workshopBoardCtx.fillStyle = '#ffffff';
        workshopBoardCtx.fillText(statusMsg, 512, 113);
      } else {
        workshopBoardCtx.font = 'bold 24px sans-serif';
        workshopBoardCtx.fillStyle = '#f2c16b';
        workshopBoardCtx.fillText(
          dict.tailorInfo(playerState.pelt, playerState.outfit, playerState.maxHealth, playerState.gold),
          512,
          112
        );
      }

      workshopBoardTexture.needsUpdate = true;

      const endgameMode = currentOutfitTier >= 4;
      const hpRanks = armorPaddingRanks;
      const hpCost = 5 + hpRanks * 3;
      const hpGoldCost = 95 + hpRanks * 35;

      tailorButtonEntries.forEach((entry, idx) => {
        const { outfit, canvas, ctx, texture } = entry;
        let displayLabel = '';
        let isEquipped = false;
        let isLowerTier = false;
        let canAfford = false;

        if (!endgameMode) {
          const targetT = outfit.tier || outfit.level;
          isEquipped = currentOutfitTier === targetT;
          isLowerTier = currentOutfitTier > targetT;
          canAfford = (playerState.gold >= outfit.goldCost || playerState.pelt >= outfit.cost) && !isEquipped && !isLowerTier;
          const baseLabel = dict.tailorButtons[idx] || '';
          displayLabel = isEquipped ? `${baseLabel} ${dict.equippedTag}` : baseLabel;
        } else if (idx === 0) {
          isEquipped = currentOutfitTier >= 6;
          canAfford = !isEquipped && (playerState.gold >= 1200 || playerState.pelt >= 16);
          displayLabel = dict.tailorMythicBtn ? dict.tailorMythicBtn(isEquipped) : 'Golden Legend Armor (1200 Gold)';
        } else if (idx === 1) {
          isEquipped = playerState.maxHealth >= 500;
          canAfford = !isEquipped && (playerState.gold >= hpGoldCost || playerState.pelt >= hpCost);
          displayLabel = dict.tailorReinforceBtn
            ? dict.tailorReinforceBtn(hpCost, playerState.maxHealth)
            : `Reinforce Armor (${hpGoldCost}G / ${hpCost}P) -> +20 Max HP`;
        } else {
          canAfford = playerState.gold >= 15 || playerState.pelt >= 2;
          displayLabel = dict.tailorRationsBtn || 'Smoked Venison Pack (15G / 2 Pelts) -> +4 Food & Heal';
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        drawRoundedRect(ctx, 6, 6, canvas.width - 12, canvas.height - 12, 16);
        if (isEquipped) {
          ctx.fillStyle = '#245228';
          ctx.strokeStyle = '#92e686';
        } else if (isLowerTier) {
          ctx.fillStyle = '#38291d';
          ctx.strokeStyle = '#7c6549';
        } else if (canAfford) {
          ctx.fillStyle = '#5c3416';
          ctx.strokeStyle = '#ffd275';
        } else {
          ctx.fillStyle = '#472814';
          ctx.strokeStyle = '#c48d42';
        }
        ctx.fill();
        ctx.lineWidth = 5;
        ctx.stroke();

        let fontSize = 28;
        ctx.font = `bold ${fontSize}px sans-serif`;
        while (fontSize > 17 && ctx.measureText(displayLabel).width > 968) {
          fontSize -= 1;
          ctx.font = `bold ${fontSize}px sans-serif`;
        }

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = isLowerTier ? '#b5a28c' : '#fff6e3';
        ctx.fillText(displayLabel, canvas.width / 2, canvas.height / 2 + 1);

        texture.needsUpdate = true;
      });
    }

    refreshTailorWorkshopHook = updateTailorWorkshopUI;

