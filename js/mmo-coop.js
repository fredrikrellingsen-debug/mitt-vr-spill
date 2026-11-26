import * as THREE from 'three';
import { drawRoundedRect } from './i18n.js';
import {
  WOW_COWBOY_CLASSES,
  WOW_WESTERN_LOOT_TABLE,
  WOW_ZONE_NPCS,
  MMO_UI_STRINGS
} from './i18n-wow.js';

// ============================================================================
// WORLD OF DUSTCRAFT: WoW-INSPIRED WESTERN QUEST NPCS, CLASSES, LOOT, MINIMAP
// & REAL-TIME P2P CO-OP MULTIPLAYER (PeerJS WebRTC + BroadcastChannel)
// ============================================================================
export function initMMOAndCoopSystem(ctx) {
  const {
    scene,
    camera,
    playerRig,
    playerState,
    storyState,
    M,
    C,
    FX,
    getLang,
    getTerrainHeight,
    resolveWallCollisions,
    clampPlayerRig,
    awardScaledGold,
    showFrontierToast,
    spawnSparkBurst,
    updateStatusUI,
    saveCareerHook,
    audio,
    getActiveWeaponId,
    getIsRidingHorse,
    getOutfitTier,
    entities
  } = ctx;

  const MMO_SAVE_KEY = 'western_vr_mmo_v1';

  const mmoState = {
    gameMode: 'solo', // 'solo' | 'coop'
    playerName: `Cowboy-${Math.floor(100 + Math.random() * 899)}`,
    classId: 'gunslinger',
    cowboyLevel: 1,
    cowboyXp: 0,
    skillCooldown: 0,
    skillBuffTimer: 0,
    partyDamageBuffTimer: 0,
    marshalShieldTimer: 0,
    passiveHealAccum: 0,
    unlockedRelicIds: [],
    equippedRelicIds: [],
    // Per-NPC chain index (0..6, then >=7 repeatable heroic!)
    npcChainIndex: Object.create(null),
    // Active NPC quests: { [npcId]: { questObj, progress, completed } }
    activeNpcQuests: Object.create(null),
    totalZoneQuestsDone: 0,
    lastRoomCode: 'REALM1'
  };

  function loadMMOSave() {
    try {
      const raw = localStorage.getItem(MMO_SAVE_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (!d || typeof d !== 'object') return;
      if (typeof d.playerName === 'string' && d.playerName.trim()) {
        mmoState.playerName = d.playerName.trim().slice(0, 20);
      }
      if (typeof d.classId === 'string' && WOW_COWBOY_CLASSES.some((c) => c.id === d.classId)) {
        mmoState.classId = d.classId;
      }
      if (typeof d.cowboyLevel === 'number') {
        mmoState.cowboyLevel = Math.max(1, Math.min(60, Math.round(d.cowboyLevel)));
      }
      if (typeof d.cowboyXp === 'number') {
        mmoState.cowboyXp = Math.max(0, Math.round(d.cowboyXp));
      }
      if (Array.isArray(d.unlockedRelicIds)) {
        mmoState.unlockedRelicIds = d.unlockedRelicIds.filter((id) =>
          WOW_WESTERN_LOOT_TABLE.some((r) => r.id === id)
        );
      }
      if (d.npcChainIndex && typeof d.npcChainIndex === 'object') {
        for (const [k, v] of Object.entries(d.npcChainIndex)) {
          if (typeof v === 'number' && v >= 0) mmoState.npcChainIndex[k] = Math.round(v);
        }
      }
      if (d.activeNpcQuests && typeof d.activeNpcQuests === 'object') {
        for (const [npcId, qState] of Object.entries(d.activeNpcQuests)) {
          const npcDef = WOW_ZONE_NPCS.find((n) => n.id === npcId);
          if (!npcDef || !qState || typeof qState !== 'object') continue;
          const qDef = getQuestForNpcChain(npcDef, mmoState.npcChainIndex[npcId] || 0);
          if (qDef) {
            const prog = Math.max(0, Math.min(qDef.goal, Math.round(qState.progress || 0)));
            mmoState.activeNpcQuests[npcId] = {
              quest: qDef,
              progress: prog,
              readyToTurnIn: prog >= qDef.goal
            };
          }
        }
      }
      if (typeof d.totalZoneQuestsDone === 'number') {
        mmoState.totalZoneQuestsDone = Math.max(0, Math.round(d.totalZoneQuestsDone));
      }
      if (typeof d.lastRoomCode === 'string' && d.lastRoomCode.trim()) {
        mmoState.lastRoomCode = d.lastRoomCode.trim().toUpperCase().slice(0, 12);
      }
    } catch (_) {
      // Ignore corrupt storage
    }
    recomputeEquippedRelics();
  }

  function saveMMOProgress() {
    try {
      const compactActive = Object.create(null);
      for (const [npcId, entry] of Object.entries(mmoState.activeNpcQuests)) {
        if (entry) {
          compactActive[npcId] = { progress: entry.progress };
        }
      }
      localStorage.setItem(
        MMO_SAVE_KEY,
        JSON.stringify({
          v: 1,
          playerName: mmoState.playerName,
          classId: mmoState.classId,
          cowboyLevel: mmoState.cowboyLevel,
          cowboyXp: mmoState.cowboyXp,
          unlockedRelicIds: mmoState.unlockedRelicIds,
          npcChainIndex: mmoState.npcChainIndex,
          activeNpcQuests: compactActive,
          totalZoneQuestsDone: mmoState.totalZoneQuestsDone,
          lastRoomCode: mmoState.lastRoomCode
        })
      );
    } catch (_) {
      // Optional localStorage
    }
  }

  function ML() {
    return MMO_UI_STRINGS[getLang() === 'no' ? 'no' : 'en'] || MMO_UI_STRINGS.en;
  }

  function getClassDef(cId = mmoState.classId) {
    return WOW_COWBOY_CLASSES.find((c) => c.id === cId) || WOW_COWBOY_CLASSES[0];
  }

  function getXpForNextLevel(lv = mmoState.cowboyLevel) {
    return Math.round(90 + (lv - 1) * 45 + Math.pow(lv - 1, 1.45) * 14);
  }

  // --- Relikvie- & Klassebonuser ---
  const bonusCache = {
    dmgPct: 0,
    hpBonus: 0,
    goldPct: 0,
    critPct: 0
  };

  function recomputeEquippedRelics() {
    const ownedObjs = mmoState.unlockedRelicIds
      .map((id) => WOW_WESTERN_LOOT_TABLE.find((r) => r.id === id))
      .filter(Boolean)
      .sort((a, b) => b.power - a.power);

    mmoState.equippedRelicIds = ownedObjs.slice(0, 3).map((r) => r.id);

    let dmgPct = (mmoState.cowboyLevel - 1) * 2;
    let hpBonus = (mmoState.cowboyLevel - 1) * 5;
    let goldPct = 0;
    let critPct = 4;

    for (let i = 0; i < 3 && i < ownedObjs.length; i++) {
      dmgPct += ownedObjs[i].dmgPct || 0;
      hpBonus += ownedObjs[i].hpBonus || 0;
      goldPct += ownedObjs[i].goldPct || 0;
      critPct += ownedObjs[i].critPct || 0;
    }

    if (mmoState.classId === 'gunslinger') {
      dmgPct += 20;
      critPct += 12;
    } else if (mmoState.classId === 'marshal') {
      hpBonus += 40;
    }

    bonusCache.dmgPct = dmgPct;
    bonusCache.hpBonus = hpBonus;
    bonusCache.goldPct = goldPct;
    bonusCache.critPct = Math.min(65, critPct);
  }

  function getEffectiveDamageMultiplier() {
    let mult = 1 + bonusCache.dmgPct * 0.01;
    if (mmoState.classId === 'gunslinger' && mmoState.skillBuffTimer > 0) {
      mult *= 1.50;
    }
    if (mmoState.partyDamageBuffTimer > 0) {
      mult *= 1.25;
    }
    // Kritisk treff-sjanse fra WoW-relikvier og Gunslinger!
    if (Math.random() * 100 < bonusCache.critPct) {
      mult *= 1.65;
    }
    return mult;
  }

  function getDamageTakenMultiplier() {
    let mult = 1.0;
    if (mmoState.classId === 'marshal') mult *= 0.75;
    if (mmoState.marshalShieldTimer > 0) mult *= 0.40;
    return mult;
  }

  function getMoveSpeedMultiplier() {
    return mmoState.classId === 'beastmaster' ? 1.12 : 1.0;
  }

  function getBonusWarhoundRank() {
    return mmoState.classId === 'beastmaster' ? 3 : 0;
  }

  function getRelicGoldMultiplier() {
    return 1 + bonusCache.goldPct * 0.01;
  }

  function getBonusMaxHp() {
    return bonusCache.hpBonus;
  }

  function grantCowboyXp(amount) {
    if (amount <= 0) return;
    mmoState.cowboyXp += Math.round(amount);
    let leveledUp = false;
    while (mmoState.cowboyLevel < 60 && mmoState.cowboyXp >= getXpForNextLevel(mmoState.cowboyLevel)) {
      mmoState.cowboyXp -= getXpForNextLevel(mmoState.cowboyLevel);
      mmoState.cowboyLevel += 1;
      leveledUp = true;
    }
    if (leveledUp) {
      recomputeEquippedRelics();
      playerState.health = Math.min(650, (playerState.maxHealth || 100) + bonusCache.hpBonus);
      if (spawnSparkBurst) spawnSparkBurst(playerRig.position, 28, 0xffe055, 1.75);
      if (audio && audio.playQuestFanfare) audio.playQuestFanfare();
      showFrontierToast(ML().levelUpToast(mmoState.cowboyLevel), 5.5);
    }
    saveMMOProgress();
    syncMMOHud();
  }

  function unlockRelicLoot(lootId) {
    const item = WOW_WESTERN_LOOT_TABLE.find((r) => r.id === lootId);
    if (!item) return null;
    const isNo = getLang() === 'no';
    if (!mmoState.unlockedRelicIds.includes(item.id)) {
      mmoState.unlockedRelicIds.push(item.id);
      recomputeEquippedRelics();
      saveMMOProgress();
    } else {
      // Duplikat konverteres til bonus-gull og XP!
      awardScaledGold(35);
    }
    const rLabel = ML().rarities[item.rarity] || item.rarity.toUpperCase();
    const name = isNo ? item.noName : item.enName;
    const stats = [];
    if (item.dmgPct) stats.push(`+${item.dmgPct}% Dmg`);
    if (item.hpBonus) stats.push(`+${item.hpBonus} HP`);
    if (item.goldPct) stats.push(`+${item.goldPct}% Gold`);
    if (item.critPct) stats.push(`+${item.critPct}% Crit`);
    showFrontierToast(ML().lootToast(rLabel, name, stats.join(', ')), 6.0);
    syncMMOHud();
    if (coopModalOpen) renderCoopModal();
    return item;
  }

  function tryRandomCombatLootDrop(isBoss = false, isElite = false) {
    const roll = Math.random();
    const threshold = isBoss ? 0.85 : (isElite ? 0.22 : 0.05);
    if (roll > threshold) return;
    const pool = WOW_WESTERN_LOOT_TABLE.filter((r) => {
      if (isBoss) return r.rarity === 'epic' || r.rarity === 'legendary' || r.rarity === 'rare';
      if (isElite) return r.rarity === 'rare' || r.rarity === 'uncommon';
      return r.rarity === 'uncommon';
    });
    if (pool.length === 0) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    unlockRelicLoot(pick.id);
  }

  // ==========================================================================
  // 1. 8 IKONISKE 3D QUEST-GIVER NPC-ER MED SVEVENDE GYLLEN «!» OG «?»
  // ==========================================================================
  const npcHitMeshes = [];
  const zoneNpcEntities = [];

  function attachIdleWalkMixer(charGroup) {
    if (!charGroup) return null;
    const clips = (charGroup.animations && charGroup.animations.length)
      ? charGroup.animations
      : (charGroup.userData && charGroup.userData.animations ? charGroup.userData.animations : null);
    if (!clips || clips.length === 0) return null;

    const root = (charGroup.userData && charGroup.userData.animRoot) || charGroup;
    const mixer = new THREE.AnimationMixer(root);
    let idleClip = null;
    let walkClip = null;
    for (let i = 0; i < clips.length; i++) {
      const nm = (clips[i].name || '').toLowerCase();
      if (!idleClip && (nm.includes('idle') || nm.includes('stand') || nm.includes('breathe')) && !nm.includes('toidle')) {
        idleClip = clips[i];
      }
      if (!walkClip && (nm.includes('walk') || nm.includes('run') || nm.includes('gallop'))) {
        walkClip = clips[i];
      }
    }
    if (!idleClip) idleClip = clips[0];
    const idleAction = mixer.clipAction(idleClip);
    idleAction.play();
    const walkAction = walkClip && walkClip !== idleClip ? mixer.clipAction(walkClip) : null;
    mixer.update(0.05);
    return { mixer, idleAction, walkAction, mode: 'idle' };
  }

  function getQuestForNpcChain(npcDef, chainIdx) {
    if (!npcDef || !Array.isArray(npcDef.quests) || npcDef.quests.length === 0) return null;
    if (chainIdx < npcDef.quests.length) {
      return npcDef.quests[chainIdx];
    }
    // Etter alle 7 historie-quests i sonen tilbyr NPC-en uendelige ★ Heroiske Sone-oppdrag!
    const heroCycle = chainIdx - npcDef.quests.length + 1;
    const base = npcDef.quests[(chainIdx - npcDef.quests.length) % npcDef.quests.length];
    const scaledGoal = Math.max(1, Math.round(base.goal * (1 + Math.min(2, heroCycle * 0.25))));
    return {
      ...base,
      id: `${base.id}_hero_${heroCycle}`,
      goal: scaledGoal,
      xp: Math.round(base.xp * (1.25 + heroCycle * 0.15)),
      gold: Math.round(base.gold * (1.30 + heroCycle * 0.15)),
      enTitle: `★ Heroic: ${base.enTitle}`,
      noTitle: `★ Heroisk: ${base.noTitle}`
    };
  }

  function createQuestMarkerSprite() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 160;
    const c = canvas.getContext('2d');
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      fog: false,
      toneMapped: false
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(0.78, 0.98, 1);
    return { sprite, canvas, ctx: c, tex, state: '' };
  }

  function drawQuestMarkerState(marker, state) {
    if (marker.state === state) return;
    marker.state = state;
    const { canvas, ctx: c, tex } = marker;
    c.clearRect(0, 0, canvas.width, canvas.height);

    let symbol = '!';
    let fillA = '#fff275';
    let fillB = '#e09400';
    let stroke = '#3b1e00';
    let glow = 'rgba(255, 208, 48, 0.85)';

    if (state === 'turnin') {
      symbol = '?';
      fillA = '#fff78a';
      fillB = '#ffaa00';
      glow = 'rgba(255, 224, 66, 0.95)';
    } else if (state === 'progress') {
      symbol = '?';
      fillA = '#e5e9f0';
      fillB = '#8e99ab';
      stroke = '#222834';
      glow = 'rgba(180, 195, 220, 0.55)';
    } else if (state === 'heroic') {
      symbol = '!';
      fillA = '#8ee8ff';
      fillB = '#1d8cf8';
      stroke = '#09264a';
      glow = 'rgba(72, 185, 255, 0.88)';
    }

    c.save();
    c.shadowColor = glow;
    c.shadowBlur = 18;
    c.font = '900 118px Georgia, serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const grad = c.createLinearGradient(0, 18, 0, 138);
    grad.addColorStop(0, fillA);
    grad.addColorStop(1, fillB);
    c.lineWidth = 10;
    c.strokeStyle = stroke;
    c.strokeText(symbol, 64, 82);
    c.fillStyle = grad;
    c.fillText(symbol, 64, 82);
    c.restore();

    tex.needsUpdate = true;
  }

  function createNpcNameplateSprite(npcDef) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 112;
    const c = canvas.getContext('2d');
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        fog: false,
        toneMapped: false
      })
    );
    sprite.scale.set(2.15, 0.47, 1);

    function refresh() {
      const isNo = getLang() === 'no';
      const name = isNo ? npcDef.noName : npcDef.enName;
      const zone = isNo ? npcDef.noZone : npcDef.enZone;
      c.clearRect(0, 0, 512, 112);
      drawRoundedRect(c, 16, 12, 480, 88, 16);
      c.fillStyle = 'rgba(28, 16, 8, 0.88)';
      c.fill();
      c.lineWidth = 4;
      c.strokeStyle = '#ffd257';
      c.stroke();

      c.textAlign = 'center';
      c.fillStyle = '#ffe588';
      c.font = 'bold 28px Georgia, serif';
      c.fillText(name, 256, 46);
      c.fillStyle = '#a8f09c';
      c.font = 'bold 20px sans-serif';
      c.fillText(`<${zone}>`, 256, 78);
      tex.needsUpdate = true;
    }

    refresh();
    return { sprite, refresh };
  }

  function buildZoneQuestNpcs() {
    WOW_ZONE_NPCS.forEach((npcDef) => {
      const root = new THREE.Group();
      const gy = getTerrainHeight(npcDef.x, npcDef.z, 0);
      root.position.set(npcDef.x, gy, npcDef.z);
      root.rotation.y = npcDef.yaw || 0;

      const localHits = [];
      let model = null;
      if (npcDef.style === 'tailor' && C.createTailorNPC) {
        model = C.createTailorNPC(localHits);
      } else if (npcDef.style === 'gunsmith' && C.createGunsmithNPC) {
        model = C.createGunsmithNPC(localHits);
      } else if (C.createSheriffVanceNPC) {
        model = C.createSheriffVanceNPC(localHits);
      } else {
        model = C.createBanditModel(false);
      }
      root.add(model);

      // Romslig usynlig klikksylinder så det er superlett å klikke på NPC-en på mobil, PC og i VR!
      const hitCyl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.62, 0.62, 2.25, 8),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hitCyl.position.y = 1.12;
      hitCyl.userData.zoneNpcId = npcDef.id;
      root.add(hitCyl);
      npcHitMeshes.push(hitCyl);
      localHits.forEach((m) => {
        m.userData.zoneNpcId = npcDef.id;
        npcHitMeshes.push(m);
      });

      // Gullring på bakken (som WoW Quest-giver glorie!)
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.62, 0.76, 24),
        new THREE.MeshBasicMaterial({
          color: 0xffd54a,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.68,
          depthWrite: false
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.04;
      root.add(ring);

      const nameplate = createNpcNameplateSprite(npcDef);
      nameplate.sprite.position.set(0, 2.22, 0);
      root.add(nameplate.sprite);

      const marker = createQuestMarkerSprite();
      marker.sprite.position.set(0, 2.95, 0);
      root.add(marker.sprite);

      const anim = attachIdleWalkMixer(model);
      scene.add(root);
      zoneNpcEntities.push({
        def: npcDef,
        root,
        model,
        anim,
        ring,
        nameplate,
        marker
      });
    });
    syncAllNpcMarkers();
  }

  function getNpcMarkerState(npcDef) {
    const active = mmoState.activeNpcQuests[npcDef.id];
    if (active) {
      return active.readyToTurnIn ? 'turnin' : 'progress';
    }
    const chainIdx = mmoState.npcChainIndex[npcDef.id] || 0;
    return chainIdx >= npcDef.quests.length ? 'heroic' : 'available';
  }

  function syncAllNpcMarkers() {
    for (let i = 0; i < zoneNpcEntities.length; i++) {
      const ent = zoneNpcEntities[i];
      const st = getNpcMarkerState(ent.def);
      drawQuestMarkerState(ent.marker, st);
      if (ent.ring && ent.ring.material) {
        ent.ring.material.color.setHex(
          st === 'turnin' ? 0x7cff72 : (st === 'progress' ? 0xa8b4c8 : 0xffd54a)
        );
      }
    }
    renderQuestTracker();
  }

  // ==========================================================================
  // 2. DOM-ELEMENTER FOR WOW QUEST-RULL, TRACKER, MINIMAP, XP-BAR & CO-OP
  // ==========================================================================
  const modeBtnEl = document.getElementById('coop-mode-btn');
  const skillBtnEl = document.getElementById('class-skill-btn');
  const touchSkillBtnEl = document.getElementById('btn-touch-skill');
  const xpBarFillEl = document.getElementById('wow-xp-fill');
  const xpBarTextEl = document.getElementById('wow-xp-text');
  const trackerBoxEl = document.getElementById('wow-quest-tracker');
  const trackerListEl = document.getElementById('wow-tracker-list');
  const trackerHdrEl = document.getElementById('wow-tracker-hdr');
  const minimapCanvas = document.getElementById('wow-minimap');
  const minimapCtx = minimapCanvas ? minimapCanvas.getContext('2d') : null;

  // NPC Quest Scroll Modal
  const npcQuestModalEl = document.getElementById('npc-quest-modal');
  const npcQuestHeaderEl = document.getElementById('npc-quest-header');
  const npcQuestBadgeEl = document.getElementById('npc-quest-badge');
  const npcQuestTitleEl = document.getElementById('npc-quest-title');
  const npcQuestLoreEl = document.getElementById('npc-quest-lore');
  const npcQuestTaskEl = document.getElementById('npc-quest-task');
  const npcQuestRewardsEl = document.getElementById('npc-quest-rewards');
  const npcQuestActionBtnEl = document.getElementById('npc-quest-action-btn');
  const npcQuestCloseBtnEl = document.getElementById('npc-quest-close-btn');

  // Co-op & Character Class Modal
  const coopModalEl = document.getElementById('coop-modal');
  const coopTitleEl = document.getElementById('coop-modal-title');
  const coopCloseBtnEl = document.getElementById('coop-close-btn');
  const coopSoloBtnEl = document.getElementById('coop-solo-btn');
  const coopMultiBtnEl = document.getElementById('coop-multi-btn');
  const coopNameInputEl = document.getElementById('coop-name-input');
  const coopClassGridEl = document.getElementById('coop-class-grid');
  const coopRelicsGridEl = document.getElementById('coop-relics-grid');
  const coopStatusBoxEl = document.getElementById('coop-status-box');
  const coopRealm1BtnEl = document.getElementById('coop-realm1-btn');
  const coopRealm2BtnEl = document.getElementById('coop-realm2-btn');
  const coopHostCodeBtnEl = document.getElementById('coop-host-btn');
  const coopCopyLinkBtnEl = document.getElementById('coop-copy-link-btn');
  const coopCodeInputEl = document.getElementById('coop-code-input');
  const coopJoinCodeBtnEl = document.getElementById('coop-join-btn');
  const coopDisconnectBtnEl = document.getElementById('coop-disconnect-btn');
  const coopPartyPanelEl = document.getElementById('wow-party-panel');
  const coopPartyListEl = document.getElementById('wow-party-list');
  const coopEmoteRowEl = document.getElementById('coop-emote-row');
  const coopChatInputEl = document.getElementById('coop-chat-input');
  const coopChatSendBtnEl = document.getElementById('coop-chat-send-btn');

  let openNpcDialogId = null;
  let coopModalOpen = false;

  function openNpcQuestDialog(npcId) {
    const npcDef = WOW_ZONE_NPCS.find((n) => n.id === npcId);
    if (!npcDef || !npcQuestModalEl) return false;
    openNpcDialogId = npcId;
    renderNpcQuestDialog();
    npcQuestModalEl.classList.add('open');
    if (document.pointerLockElement && document.exitPointerLock) {
      document.exitPointerLock();
    }
    if (audio && audio.playQuestSelectSound) audio.playQuestSelectSound();
    return true;
  }

  function closeNpcQuestDialog() {
    openNpcDialogId = null;
    if (npcQuestModalEl) npcQuestModalEl.classList.remove('open');
  }

  function renderNpcQuestDialog() {
    if (!openNpcDialogId || !npcQuestModalEl) return;
    const npcDef = WOW_ZONE_NPCS.find((n) => n.id === openNpcDialogId);
    if (!npcDef) return;
    const isNo = getLang() === 'no';
    const ml = ML();
    const chainIdx = mmoState.npcChainIndex[npcDef.id] || 0;
    const active = mmoState.activeNpcQuests[npcDef.id];
    const q = active ? active.quest : getQuestForNpcChain(npcDef, chainIdx);
    if (!q) return;

    if (npcQuestHeaderEl) {
      npcQuestHeaderEl.textContent = ml.questModalHeader(
        isNo ? npcDef.noName : npcDef.enName,
        isNo ? npcDef.noZone : npcDef.enZone
      );
    }
    if (npcQuestBadgeEl) {
      if (active && active.readyToTurnIn) {
        npcQuestBadgeEl.textContent = ml.questTurnInBadge;
        npcQuestBadgeEl.style.color = '#8eff82';
      } else if (active) {
        npcQuestBadgeEl.textContent = `${ml.questInProgressBadge} (${active.progress}/${q.goal})`;
        npcQuestBadgeEl.style.color = '#ffd97d';
      } else {
        npcQuestBadgeEl.textContent = ml.questAvailableBadge;
        npcQuestBadgeEl.style.color = '#ffe45e';
      }
    }
    if (npcQuestTitleEl) npcQuestTitleEl.textContent = isNo ? q.noTitle : q.enTitle;
    if (npcQuestLoreEl) npcQuestLoreEl.textContent = `"${isNo ? q.noLore : q.enLore}"`;
    if (npcQuestTaskEl) {
      const prog = active ? active.progress : 0;
      npcQuestTaskEl.textContent = `🎯 ${isNo ? q.noTask : q.enTask} (${prog}/${q.goal})`;
    }
    if (npcQuestRewardsEl) {
      const parts = [`+${q.xp} XP`, `+${q.gold} ${isNo ? 'Gull' : 'Gold'}`];
      if (q.food) parts.push(`+${q.food} ${isNo ? 'Mat' : 'Food'}`);
      if (q.pelts) parts.push(`+${q.pelts} ${isNo ? 'Skinn' : 'Pelts'}`);
      if (q.dynamite) parts.push(`+${q.dynamite} ${isNo ? 'Dynamitt' : 'Dynamite'}`);
      let relicHtml = '';
      if (q.lootId) {
        const item = WOW_WESTERN_LOOT_TABLE.find((r) => r.id === q.lootId);
        if (item) {
          const iName = isNo ? item.noName : item.enName;
          relicHtml = ` • <span style="color:${item.color};font-weight:bold">[${iName}]</span>`;
        }
      }
      npcQuestRewardsEl.innerHTML = `<strong>${ml.questRewardsHdr}</strong> ${parts.join(' • ')}${relicHtml}`;
    }
    if (npcQuestActionBtnEl) {
      if (active && active.readyToTurnIn) {
        npcQuestActionBtnEl.textContent = ml.questTurnInBtn;
        npcQuestActionBtnEl.disabled = false;
        npcQuestActionBtnEl.className = 'wow-gold-btn turnin';
      } else if (active) {
        npcQuestActionBtnEl.textContent = `${ml.questInProgressBadge} (${active.progress}/${q.goal})`;
        npcQuestActionBtnEl.disabled = true;
        npcQuestActionBtnEl.className = 'wow-gold-btn disabled';
      } else {
        npcQuestActionBtnEl.textContent = ml.questAcceptBtn;
        npcQuestActionBtnEl.disabled = false;
        npcQuestActionBtnEl.className = 'wow-gold-btn';
      }
    }
    if (npcQuestCloseBtnEl) npcQuestCloseBtnEl.textContent = ml.questCloseBtn;
  }

  function acceptOrTurnInCurrentDialogQuest() {
    if (!openNpcDialogId) return;
    const npcDef = WOW_ZONE_NPCS.find((n) => n.id === openNpcDialogId);
    if (!npcDef) return;
    const active = mmoState.activeNpcQuests[npcDef.id];
    if (active) {
      if (!active.readyToTurnIn) return;
      completeNpcQuest(npcDef.id);
      // Vis neste oppdrag i kjeden med én gang akkurat som i World of Warcraft!
      renderNpcQuestDialog();
      return;
    }
    const chainIdx = mmoState.npcChainIndex[npcDef.id] || 0;
    const q = getQuestForNpcChain(npcDef, chainIdx);
    if (!q) return;
    mmoState.activeNpcQuests[npcDef.id] = {
      quest: q,
      progress: 0,
      readyToTurnIn: false
    };
    saveMMOProgress();
    syncAllNpcMarkers();
    if (audio && audio.playQuestSelectSound) audio.playQuestSelectSound();
    closeNpcQuestDialog();
  }

  function completeNpcQuest(npcId) {
    const active = mmoState.activeNpcQuests[npcId];
    if (!active || !active.readyToTurnIn) return false;
    const q = active.quest;
    delete mmoState.activeNpcQuests[npcId];
    mmoState.npcChainIndex[npcId] = (mmoState.npcChainIndex[npcId] || 0) + 1;
    mmoState.totalZoneQuestsDone += 1;
    storyState.totalBountiesDone = (storyState.totalBountiesDone || 0) + 1;

    awardScaledGold(q.gold || 40);
    if (q.food) playerState.food += q.food;
    if (q.pelts) playerState.pelt += q.pelts;
    if (q.dynamite) playerState.dynamite += q.dynamite;
    grantCowboyXp(q.xp || 80);
    if (q.lootId) {
      unlockRelicLoot(q.lootId);
    }
    if (audio && audio.playQuestFanfare) audio.playQuestFanfare();
    saveMMOProgress();
    if (saveCareerHook) saveCareerHook();
    syncAllNpcMarkers();
    updateStatusUI();
    return true;
  }

  if (npcQuestActionBtnEl) {
    npcQuestActionBtnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      acceptOrTurnInCurrentDialogQuest();
    });
  }
  if (npcQuestCloseBtnEl) {
    npcQuestCloseBtnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      closeNpcQuestDialog();
    });
  }
  if (npcQuestModalEl) {
    npcQuestModalEl.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (e.target === npcQuestModalEl) closeNpcQuestDialog();
    });
  }

  function renderQuestTracker() {
    if (!trackerBoxEl || !trackerListEl) return;
    const isNo = getLang() === 'no';
    const ml = ML();
    if (trackerHdrEl) trackerHdrEl.textContent = ml.trackerHeader;

    const entries = Object.entries(mmoState.activeNpcQuests);
    if (entries.length === 0) {
      // Vis nærmeste oppdragsgiver med gyllen «!» slik at spilleren alltid ser neste sone-kjede!
      let nearest = null;
      let bestDist = Infinity;
      for (let i = 0; i < WOW_ZONE_NPCS.length; i++) {
        const n = WOW_ZONE_NPCS[i];
        const d = Math.hypot(playerRig.position.x - n.x, playerRig.position.z - n.z);
        if (d < bestDist) {
          bestDist = d;
          nearest = n;
        }
      }
      trackerListEl.innerHTML = '';
      if (nearest) {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'wow-tracker-item hint';
        const nName = isNo ? nearest.noName : nearest.enName;
        const distM = Math.round(bestDist);
        item.textContent = `❗ ${nName} (${distM}m) — ${ml.npcInteractHint}`;
        item.addEventListener('click', (ev) => {
          ev.stopPropagation();
          openNpcQuestDialog(nearest.id);
        });
        trackerListEl.appendChild(item);
      }
      return;
    }

    trackerListEl.innerHTML = '';
    entries.forEach(([npcId, st]) => {
      const npcDef = WOW_ZONE_NPCS.find((n) => n.id === npcId);
      const q = st.quest;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = st.readyToTurnIn ? 'wow-tracker-item ready' : 'wow-tracker-item';
      const qTitle = isNo ? q.noTitle : q.enTitle;
      const qTask = isNo ? q.noTask : q.enTask;
      const statusTxt = st.readyToTurnIn
        ? ml.trackerTurnInReady
        : `${qTask} (${st.progress}/${q.goal})`;
      btn.innerHTML = `<div class="wt-title">${st.readyToTurnIn ? '❓' : '🎯'} ${qTitle}</div><div class="wt-sub">${statusTxt}</div>`;
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (st.readyToTurnIn) {
          openNpcQuestDialog(npcId);
        } else if (npcDef) {
          openNpcQuestDialog(npcId);
        }
      });
      trackerListEl.appendChild(btn);
    });
  }

  // Oppdateres når spilleren (eller en Co-op Posse-lagkamerat!) feller fiender / samler skatter
  function onCombatOrObjectiveEvent(tagsInput, fromNetwork = false) {
    const tags = Array.isArray(tagsInput) ? tagsInput : [tagsInput];

    // Gi Cowboy XP + sjanse for WoW-relikvie på ekte kills!
    if (!fromNetwork) {
      const isBoss = tags.includes('any_boss');
      const isElite = tags.includes('elite_foe');
      if (isBoss) {
        grantCowboyXp(140);
        tryRandomCombatLootDrop(true, true);
      } else if (isElite) {
        grantCowboyXp(36);
        tryRandomCombatLootDrop(false, true);
      } else if (tags.includes('combat_any') || tags.includes('wild_beast')) {
        grantCowboyXp(16);
        tryRandomCombatLootDrop(false, false);
      } else if (tags.includes('treasure_any')) {
        grantCowboyXp(22);
      }

      // Del oppdragsfremgang med Co-op Posse!
      if (mmoState.gameMode === 'coop') {
        broadcastCoopPacket({ type: 'quest_tags', tags });
      }
    }

    let changed = false;
    for (const [npcId, entry] of Object.entries(mmoState.activeNpcQuests)) {
      if (!entry || entry.readyToTurnIn) continue;
      if (tags.includes(entry.quest.targetType)) {
        entry.progress = Math.min(entry.quest.goal, entry.progress + 1);
        if (entry.progress >= entry.quest.goal) {
          entry.readyToTurnIn = true;
          const isNo = getLang() === 'no';
          const npcDef = WOW_ZONE_NPCS.find((n) => n.id === npcId);
          const npcName = npcDef ? (isNo ? npcDef.noName : npcDef.enName) : '';
          showFrontierToast(
            `❓ ${isNo ? entry.quest.noTitle : entry.quest.enTitle} — ${isNo ? `Klar hos ${npcName}!` : `Turn in to ${npcName}!`}`,
            5.0
          );
          if (audio && audio.playQuestFanfare) audio.playQuestFanfare();
        }
        changed = true;
      }
    }
    if (changed) {
      saveMMOProgress();
      syncAllNpcMarkers();
      if (openNpcDialogId) renderNpcQuestDialog();
    }
  }

  // ==========================================================================
  // 3. AKTIV KLASSE-FERDIGHET ([G] / TOUCH «SKILL» / CO-OP PARTY HEAL & TAUNT)
  // ==========================================================================
  function triggerClassSkill() {
    if (mmoState.skillCooldown > 0) {
      if (audio && audio.playShopDenySound) audio.playShopDenySound();
      return false;
    }
    const cls = getClassDef();
    mmoState.skillCooldown = cls.cd;
    const isNo = getLang() === 'no';

    if (cls.id === 'gunslinger') {
      mmoState.skillBuffTimer = 6.0;
      if (spawnSparkBurst) spawnSparkBurst(playerRig.position, 22, 0xffc44d, 1.5);
      if (audio && audio.playHellfireSound) audio.playHellfireSound();
      // Umiddelbar Fan-the-Hammer skuddsalve på opptil 4 nærliggende fiender innenfor 22m!
      strikeNearbyHostiles(22, 4, 3.5);
      showFrontierToast(
        isNo ? '🤠 Seksløper-storm! +50% skade i 6s & lynrask salve!' : '🤠 Fan-the-Hammer! +50% Damage for 6s & burst volley!',
        3.5
      );
    } else if (cls.id === 'marshal') {
      mmoState.marshalShieldTimer = 6.0;
      const cap = (playerState.maxHealth || 100) + bonusCache.hpBonus;
      playerState.health = Math.min(cap, playerState.health + 40);
      if (spawnSparkBurst) spawnSparkBurst(playerRig.position, 24, 0x74cbff, 1.5);
      if (audio && audio.playUpgradeSound) audio.playUpgradeSound();
      strikeNearbyHostiles(10.5, 5, 2.4);
      if (mmoState.gameMode === 'coop') {
        broadcastCoopPacket({ type: 'party_buff', kind: 'shield', heal: 25 });
      }
      showFrontierToast(
        isNo ? '🛡 Jernstjerne-skjold! +40 HP & -60% skade tatt i 6s!' : '🛡 Iron Star Bulwark! +40 HP & -60% Damage Taken for 6s!',
        3.5
      );
    } else if (cls.id === 'sawbones') {
      mmoState.partyDamageBuffTimer = 8.0;
      const cap = (playerState.maxHealth || 100) + bonusCache.hpBonus;
      playerState.health = Math.min(cap, playerState.health + 65);
      if (spawnSparkBurst) spawnSparkBurst(playerRig.position, 26, 0x6ef28d, 1.55);
      if (audio && audio.playHealSound) audio.playHealSound();
      if (mmoState.gameMode === 'coop') {
        broadcastCoopPacket({ type: 'party_buff', kind: 'heal_wave', heal: 65 });
      }
      showFrontierToast(
        isNo ? '🌿 Kaktus-eliksirbølge! +65 HP til hele laget & +25% skade i 8s!' : '🌿 Tonic Wave! +65 HP to whole Posse & +25% Damage for 8s!',
        3.8
      );
    } else if (cls.id === 'beastmaster') {
      const cap = (playerState.maxHealth || 100) + bonusCache.hpBonus;
      playerState.health = Math.min(cap, playerState.health + 22);
      if (spawnSparkBurst) spawnSparkBurst(playerRig.position, 24, 0xc79bff, 1.55);
      if (audio && audio.playHorseWhistleSound) audio.playHorseWhistleSound();
      strikeNearbyHostiles(19, 4, 4.2);
      showFrontierToast(
        isNo ? '🐺 Ulveflokkens Storm! Rex og prærieåndene angriper!' : '🐺 Alpha Pack Stampede! Rex & spirit wolves strike nearby foes!',
        3.5
      );
    }

    updateStatusUI();
    syncMMOHud();
    return true;
  }

  const skillStrikeDir = new THREE.Vector3(0, 0, -1);
  function strikeNearbyHostiles(maxRange, maxTargets, rawDmg) {
    if (!entities || !entities.damageCombatTarget) return;
    const px = playerRig.position.x;
    const pz = playerRig.position.z;
    const candidates = [];

    const pushAlive = (arr, type) => {
      if (!Array.isArray(arr)) return;
      for (let i = 0; i < arr.length; i++) {
        const e = arr[i];
        if (!e || !e.alive || !e.group || !e.group.visible) continue;
        const d = Math.hypot(e.group.position.x - px, e.group.position.z - pz);
        if (d <= maxRange) candidates.push({ type, target: e, d, point: e.group.position });
      }
    };
    pushAlive(entities.banditList, 'bandit');
    pushAlive(entities.nightEnemies, 'night');
    pushAlive(entities.wolfList, 'wolf');
    pushAlive(entities.bearList, 'bear');
    if (entities.bossEnemy && entities.bossEnemy.alive && entities.bossEnemy.group.visible) {
      const d = Math.hypot(entities.bossEnemy.group.position.x - px, entities.bossEnemy.group.position.z - pz);
      if (d <= maxRange) candidates.push({ type, target: entities.bossEnemy, d, point: entities.bossEnemy.group.position });
    }
    if (entities.wendigoBossEnemy && entities.wendigoBossEnemy.alive && entities.wendigoBossEnemy.group.visible) {
      const d = Math.hypot(entities.wendigoBossEnemy.group.position.x - px, entities.wendigoBossEnemy.group.position.z - pz);
      if (d <= maxRange) candidates.push({ type, target: entities.wendigoBossEnemy, d, point: entities.wendigoBossEnemy.group.position });
    }

    candidates.sort((a, b) => a.d - b.d);
    const bulletStub = { dmgMult: rawDmg, isSilverBolt: true };
    for (let i = 0; i < maxTargets && i < candidates.length; i++) {
      const hit = candidates[i];
      if (spawnSparkBurst) spawnSparkBurst(hit.point, 10, 0xffe066, 1.2);
      entities.damageCombatTarget(hit, skillStrikeDir, bulletStub);
    }
  }

  if (skillBtnEl) {
    skillBtnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerClassSkill();
    });
  }
  if (touchSkillBtnEl) {
    touchSkillBtnEl.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      triggerClassSkill();
    });
  }

  // ==========================================================================
  // 4. EKTE P2P FLERSPILLER (CO-OP POSSE VIA PEERJS WEBRTC + BROADCASTCHANNEL)
  // ==========================================================================
  const localPeerUuid = `p_${Math.random().toString(36).slice(2, 10)}`;
  let peerModulePromise = null;
  let activePeer = null;
  let activeHostConn = null;
  const hostClientConns = new Map(); // peerId -> DataConnection (når vi er Realm Host)
  let isRealmHost = false;
  let activeRoomCode = '';
  let netStatusState = 'solo'; // 'solo' | 'connecting' | 'online'
  let localBroadcastChan = null;
  let stateBroadcastAccum = 0;

  const remotePlayers = new Map(); // playerId -> RemotePlayerEntry
  const remoteTracerLines = [];

  function loadPeerJSClass() {
    if (window.Peer) return Promise.resolve(window.Peer);
    if (peerModulePromise) return peerModulePromise;
    peerModulePromise = import('https://esm.sh/peerjs@1.5.4')
      .then((mod) => mod.Peer || mod.default || window.Peer)
      .catch(() => null);
    return peerModulePromise;
  }

  function createRemotePlayerAvatar(info) {
    const group = new THREE.Group();
    const avatarBody = C.createPlayerHeroModel
      ? C.createPlayerHeroModel()
      : (C.createBanditModel ? C.createBanditModel(false) : C.createSheriffVanceNPC([]));
    const bodyAnim = attachIdleWalkMixer(avatarBody);
    group.add(avatarBody);

    // 3D Mustang-hest som vises når medspilleren rir!
    const horseGroup = C.createHorseModel ? C.createHorseModel() : new THREE.Group();
    const horseAnim = attachIdleWalkMixer(horseGroup);
    horseGroup.visible = false;
    group.add(horseGroup);

    // Våpen direkte i høyre hånd (hand_r) på medspilleren
    let weaponMesh = null;
    let currentWeaponId = info.weaponId || 'revolver';
    const rBones = avatarBody.userData && avatarBody.userData.heroBones;
    if (FX && FX.createWeaponModel) {
      weaponMesh = FX.createWeaponModel(currentWeaponId);
      weaponMesh.scale.setScalar(0.85);
      if (rBones && rBones.handRBone) {
        const handSocket = new THREE.Group();
        const hb = new THREE.Matrix4().makeBasis(
          new THREE.Vector3(0, 0, -1),
          new THREE.Vector3(1, 0, 0),
          new THREE.Vector3(0, -1, 0)
        );
        handSocket.quaternion.setFromRotationMatrix(hb);
        handSocket.position.set(0.022, 0.065, 0.005);
        handSocket.add(weaponMesh);
        rBones.handRBone.add(handSocket);
      } else {
        weaponMesh.position.set(0.28, 1.15, -0.42);
        group.add(weaponMesh);
      }
    }

    // WoW-stil 3D Navneskilt + Grønn Party Helsebar + Prateboble over hodet!
    const npCanvas = document.createElement('canvas');
    npCanvas.width = 512;
    npCanvas.height = 160;
    const npCtx = npCanvas.getContext('2d');
    const npTex = new THREE.CanvasTexture(npCanvas);
    npTex.colorSpace = THREE.SRGBColorSpace;
    const npSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: npTex,
        transparent: true,
        depthWrite: false,
        fog: false,
        toneMapped: false
      })
    );
    npSprite.scale.set(2.35, 0.74, 1);
    npSprite.position.set(0, 2.45, 0);
    group.add(npSprite);

    const entry = {
      id: info.id,
      name: info.name || 'Cowboy',
      classId: info.classId || 'gunslinger',
      level: info.level || 1,
      hp: info.hp || 100,
      maxHp: info.maxHp || 100,
      weaponId: currentWeaponId,
      riding: !!info.riding,
      targetPos: new THREE.Vector3(info.x || 0, info.y || 0, info.z || 12),
      targetYaw: info.yaw || 0,
      walkPhase: 0,
      chatText: '',
      chatTimer: 0,
      lastSeen: performance.now(),
      group,
      avatarBody,
      bodyAnim,
      horseGroup,
      horseAnim,
      weaponMesh,
      npCanvas,
      npCtx,
      npTex,
      npSprite
    };

    group.position.copy(entry.targetPos);
    group.rotation.y = entry.targetYaw;
    refreshRemoteNameplate(entry);
    scene.add(group);
    return entry;
  }

  function refreshRemoteNameplate(entry) {
    const { npCanvas: cv, npCtx: c, npTex } = entry;
    c.clearRect(0, 0, cv.width, cv.height);
    const cls = getClassDef(entry.classId);

    // Prateboble øverst hvis aktiv
    if (entry.chatTimer > 0 && entry.chatText) {
      drawRoundedRect(c, 24, 6, 464, 48, 14);
      c.fillStyle = 'rgba(255, 250, 232, 0.96)';
      c.fill();
      c.lineWidth = 3;
      c.strokeStyle = '#c98a2e';
      c.stroke();
      c.fillStyle = '#241409';
      c.font = 'bold 21px sans-serif';
      c.textAlign = 'center';
      c.fillText(entry.chatText.slice(0, 38), 256, 36);
    }

    drawRoundedRect(c, 46, 62, 420, 86, 16);
    c.fillStyle = 'rgba(18, 26, 18, 0.90)';
    c.fill();
    c.lineWidth = 4;
    c.strokeStyle = cls.color || '#7ef28d';
    c.stroke();

    c.textAlign = 'center';
    c.fillStyle = '#eaffea';
    c.font = 'bold 25px Georgia, serif';
    c.fillText(`${cls.icon} ${entry.name} (Lv.${entry.level})`, 256, 94);

    // Grønn WoW Party Helsebar
    const ratio = Math.max(0, Math.min(1, entry.hp / Math.max(1, entry.maxHp)));
    c.fillStyle = '#1d2b1d';
    c.fillRect(76, 112, 360, 22);
    c.fillStyle = ratio > 0.35 ? '#45e062' : '#ff5e42';
    c.fillRect(76, 112, Math.round(360 * ratio), 22);
    c.strokeStyle = 'rgba(255,255,255,0.55)';
    c.lineWidth = 2;
    c.strokeRect(76, 112, 360, 22);

    npTex.needsUpdate = true;
  }

  function removeRemotePlayer(id) {
    const ent = remotePlayers.get(id);
    if (!ent) return;
    scene.remove(ent.group);
    remotePlayers.delete(id);
    renderPartyFrames();
    syncMMOHud();
  }

  function clearAllRemotePlayers() {
    for (const id of Array.from(remotePlayers.keys())) {
      removeRemotePlayer(id);
    }
  }

  function spawnRemoteShotTracer(ox, oy, oz, dx, dy, dz) {
    const start = new THREE.Vector3(ox, oy, oz);
    const end = new THREE.Vector3(ox + dx * 28, oy + dy * 28, oz + dz * 28);
    const geo = new THREE.BufferGeometry().setFromPoints([start, end]);
    const mat = new THREE.LineBasicMaterial({ color: 0xffe27a, transparent: true, opacity: 0.9 });
    const line = new THREE.Line(geo, mat);
    scene.add(line);
    remoteTracerLines.push({ line, geo, mat, life: 0.14 });
    if (audio && audio.playBanditShotSound) audio.playBanditShotSound(start);
  }

  function handleIncomingCoopPacket(pkt, fromConn = null) {
    if (!pkt || typeof pkt !== 'object' || pkt.senderId === localPeerUuid) return;

    // Hvis vi er WebRTC-vert for dette rommet, videresend pakken til alle andre tilkoblede ryttere!
    if (isRealmHost && fromConn) {
      for (const [, conn] of hostClientConns.entries()) {
        if (conn !== fromConn && conn.open) {
          try { conn.send(pkt); } catch (_) {}
        }
      }
    }

    if (pkt.type === 'state') {
      let ent = remotePlayers.get(pkt.senderId);
      if (!ent) {
        ent = createRemotePlayerAvatar({
          id: pkt.senderId,
          name: pkt.name,
          classId: pkt.classId,
          level: pkt.level,
          hp: pkt.hp,
          maxHp: pkt.maxHp,
          weaponId: pkt.weaponId,
          riding: pkt.riding,
          x: pkt.x,
          y: pkt.y,
          z: pkt.z,
          yaw: pkt.yaw
        });
        remotePlayers.set(pkt.senderId, ent);
        renderPartyFrames();
        syncMMOHud();
      }
      const needsPlateRefresh =
        ent.name !== pkt.name ||
        ent.classId !== pkt.classId ||
        ent.level !== pkt.level ||
        Math.abs(ent.hp - pkt.hp) >= 1 ||
        ent.maxHp !== pkt.maxHp;

      ent.name = pkt.name || ent.name;
      ent.classId = pkt.classId || ent.classId;
      ent.level = pkt.level || ent.level;
      ent.hp = pkt.hp ?? ent.hp;
      ent.maxHp = pkt.maxHp || ent.maxHp;
      ent.riding = !!pkt.riding;
      ent.targetPos.set(pkt.x || 0, pkt.y || 0, pkt.z || 0);
      ent.targetYaw = pkt.yaw || 0;
      ent.lastSeen = performance.now();

      if (ent.horseGroup) {
        ent.horseGroup.visible = ent.riding;
        ent.avatarBody.position.y = ent.riding ? 0.95 : 0;
        ent.npSprite.position.y = ent.riding ? 3.35 : 2.45;
      }
      if (needsPlateRefresh) {
        refreshRemoteNameplate(ent);
        renderPartyFrames();
      }
      return;
    }

    if (pkt.type === 'bye') {
      removeRemotePlayer(pkt.senderId);
      return;
    }

    if (pkt.type === 'shot') {
      spawnRemoteShotTracer(pkt.ox, pkt.oy, pkt.oz, pkt.dx, pkt.dy, pkt.dz);
      return;
    }

    if (pkt.type === 'boss_damage' && entities) {
      if (pkt.bossKind === 'malakor' && entities.bossEnemy && entities.bossEnemy.alive) {
        entities.bossEnemy.hp = Math.max(1, entities.bossEnemy.hp - (pkt.dmg || 2));
        if (entities.syncBossHealthBarUI) entities.syncBossHealthBarUI();
      } else if (pkt.bossKind === 'wendigo' && entities.wendigoBossEnemy && entities.wendigoBossEnemy.alive) {
        entities.wendigoBossEnemy.hp = Math.max(1, entities.wendigoBossEnemy.hp - (pkt.dmg || 2));
        if (entities.syncBossHealthBarUI) entities.syncBossHealthBarUI();
      }
      return;
    }

    if (pkt.type === 'quest_tags' && Array.isArray(pkt.tags)) {
      onCombatOrObjectiveEvent(pkt.tags, true);
      if (ctx.recordSaloonQuestKillFromCoop) {
        ctx.recordSaloonQuestKillFromCoop(pkt.tags);
      }
      return;
    }

    if (pkt.type === 'party_buff') {
      const cap = (playerState.maxHealth || 100) + bonusCache.hpBonus;
      if (pkt.heal) {
        playerState.health = Math.min(cap, playerState.health + pkt.heal);
      }
      if (pkt.kind === 'heal_wave') {
        mmoState.partyDamageBuffTimer = 8.0;
        if (audio && audio.playHealSound) audio.playHealSound();
      } else if (pkt.kind === 'shield') {
        mmoState.marshalShieldTimer = 6.0;
      }
      if (spawnSparkBurst) spawnSparkBurst(playerRig.position, 18, 0x6ef28d, 1.4);
      updateStatusUI();
      return;
    }

    if (pkt.type === 'chat') {
      const ent = remotePlayers.get(pkt.senderId);
      if (ent) {
        ent.chatText = String(pkt.text || '').slice(0, 60);
        ent.chatTimer = 6.0;
        refreshRemoteNameplate(ent);
      }
      const sender = (ent && ent.name) || pkt.name || 'Posse';
      showFrontierToast(`💬 [${sender}]: ${String(pkt.text || '').slice(0, 64)}`, 5.0);
    }
  }

  function broadcastCoopPacket(payload) {
    if (mmoState.gameMode !== 'coop' || !activeRoomCode) return;
    const pkt = { ...payload, senderId: localPeerUuid };
    if (localBroadcastChan) {
      try { localBroadcastChan.postMessage(pkt); } catch (_) {}
    }
    if (isRealmHost) {
      for (const [, conn] of hostClientConns.entries()) {
        if (conn.open) {
          try { conn.send(pkt); } catch (_) {}
        }
      }
    } else if (activeHostConn && activeHostConn.open) {
      try { activeHostConn.send(pkt); } catch (_) {}
    }
  }

  function buildCurrentStatePacket() {
    const gY = getTerrainHeight(playerRig.position.x, playerRig.position.z, playerRig.position.y);
    return {
      type: 'state',
      name: mmoState.playerName,
      classId: mmoState.classId,
      level: mmoState.cowboyLevel,
      hp: playerState.health,
      maxHp: (playerState.maxHealth || 100) + bonusCache.hpBonus,
      weaponId: getActiveWeaponId ? getActiveWeaponId() : 'revolver',
      riding: getIsRidingHorse ? getIsRidingHorse() : false,
      outfitTier: getOutfitTier ? getOutfitTier() : 0,
      x: Math.round(playerRig.position.x * 100) / 100,
      y: Math.round(gY * 100) / 100,
      z: Math.round(playerRig.position.z * 100) / 100,
      yaw: Math.round(playerRig.rotation.y * 1000) / 1000
    };
  }

  function disconnectCoop(goSolo = true) {
    if (mmoState.gameMode === 'coop' && activeRoomCode) {
      broadcastCoopPacket({ type: 'bye' });
    }
    if (localBroadcastChan) {
      try { localBroadcastChan.close(); } catch (_) {}
      localBroadcastChan = null;
    }
    hostClientConns.clear();
    if (activeHostConn) {
      try { activeHostConn.close(); } catch (_) {}
      activeHostConn = null;
    }
    if (activePeer) {
      try { activePeer.destroy(); } catch (_) {}
      activePeer = null;
    }
    isRealmHost = false;
    clearAllRemotePlayers();
    if (goSolo) {
      mmoState.gameMode = 'solo';
      activeRoomCode = '';
      netStatusState = 'solo';
    }
    renderPartyFrames();
    syncMMOHud();
    if (coopModalOpen) renderCoopModal();
  }

  async function joinCoopRoom(rawCode) {
    const cleanCode = String(rawCode || 'REALM1')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 12) || 'REALM1';

    disconnectCoop(false);
    mmoState.gameMode = 'coop';
    mmoState.lastRoomCode = cleanCode;
    activeRoomCode = cleanCode;
    netStatusState = 'connecting';
    saveMMOProgress();
    syncMMOHud();
    if (coopModalOpen) renderCoopModal();

    // 1) Øyeblikkelig lokal synk mellom faner/vinduer på samme maskin (0 ms oppsett!)
    if (typeof BroadcastChannel !== 'undefined') {
      localBroadcastChan = new BroadcastChannel(`wvr_coop_v1_${cleanCode}`);
      localBroadcastChan.onmessage = (ev) => {
        if (ev && ev.data) handleIncomingCoopPacket(ev.data, null);
      };
    }

    // 2) Internett-dekkende WebRTC P2P via PeerJS (automatisk Vert / Posse-medlem!)
    const PeerClass = await loadPeerJSClass();
    if (!PeerClass || mmoState.gameMode !== 'coop' || activeRoomCode !== cleanCode) {
      netStatusState = 'online';
      isRealmHost = true;
      broadcastCoopPacket(buildCurrentStatePacket());
      syncMMOHud();
      if (coopModalOpen) renderCoopModal();
      return;
    }

    const hostPeerId = `wvr2026-posse-${cleanCode.toLowerCase()}`;
    const candidateHost = new PeerClass(hostPeerId);

    candidateHost.on('open', () => {
      if (mmoState.gameMode !== 'coop' || activeRoomCode !== cleanCode) {
        try { candidateHost.destroy(); } catch (_) {}
        return;
      }
      activePeer = candidateHost;
      isRealmHost = true;
      netStatusState = 'online';
      broadcastCoopPacket(buildCurrentStatePacket());
      syncMMOHud();
      if (coopModalOpen) renderCoopModal();
    });

    candidateHost.on('connection', (conn) => {
      hostClientConns.set(conn.peer, conn);
      conn.on('open', () => {
        conn.send(buildCurrentStatePacket());
      });
      conn.on('data', (data) => handleIncomingCoopPacket(data, conn));
      conn.on('close', () => hostClientConns.delete(conn.peer));
      conn.on('error', () => hostClientConns.delete(conn.peer));
    });

    candidateHost.on('error', (err) => {
      if (err && err.type === 'unavailable-id') {
        // En annen spiller er allerede Vert for denne serveren/koden -> koble direkte til Verten som Posse-rytter!
        try { candidateHost.destroy(); } catch (_) {}
        connectAsPosseClient(PeerClass, hostPeerId, cleanCode);
      } else {
        netStatusState = 'online';
        syncMMOHud();
        if (coopModalOpen) renderCoopModal();
      }
    });
  }

  function connectAsPosseClient(PeerClass, hostPeerId, cleanCode) {
    const clientPeer = new PeerClass();
    activePeer = clientPeer;
    isRealmHost = false;

    clientPeer.on('open', () => {
      if (mmoState.gameMode !== 'coop' || activeRoomCode !== cleanCode) {
        try { clientPeer.destroy(); } catch (_) {}
        return;
      }
      const conn = clientPeer.connect(hostPeerId, { reliable: false });
      activeHostConn = conn;
      conn.on('open', () => {
        netStatusState = 'online';
        conn.send(buildCurrentStatePacket());
        syncMMOHud();
        if (coopModalOpen) renderCoopModal();
      });
      conn.on('data', (data) => handleIncomingCoopPacket(data, null));
      conn.on('close', () => {
        if (mmoState.gameMode === 'coop' && activeRoomCode === cleanCode) {
          setTimeout(() => {
            if (mmoState.gameMode === 'coop' && activeRoomCode === cleanCode) {
              joinCoopRoom(cleanCode);
            }
          }, 1400);
        }
      });
    });
  }

  function sendPosseChat(text) {
    const msg = String(text || '').trim().slice(0, 64);
    if (!msg) return;
    if (mmoState.gameMode !== 'coop') {
      joinCoopRoom(mmoState.lastRoomCode || 'REALM1');
    }
    broadcastCoopPacket({ type: 'chat', name: mmoState.playerName, text: msg });
    showFrontierToast(`💬 [${mmoState.playerName}]: ${msg}`, 4.2);
  }

  function renderPartyFrames() {
    if (!coopPartyPanelEl || !coopPartyListEl) return;
    if (mmoState.gameMode !== 'coop') {
      coopPartyPanelEl.style.display = 'none';
      return;
    }
    coopPartyPanelEl.style.display = 'flex';
    const ml = ML();
    const hdr = document.getElementById('wow-party-hdr');
    if (hdr) hdr.textContent = `${ml.coopPartyHeader} [${activeRoomCode}] (${remotePlayers.size + 1})`;

    coopPartyListEl.innerHTML = '';
    if (remotePlayers.size === 0) {
      const waitDiv = document.createElement('div');
      waitDiv.className = 'wow-party-empty';
      waitDiv.textContent = getLang() === 'no'
        ? `Romkode: ${activeRoomCode} — Del koden eller invitasjonslenken for å ri sammen!`
        : `Room: ${activeRoomCode} — Share code or invite link to ride together!`;
      coopPartyListEl.appendChild(waitDiv);
      return;
    }

    for (const [, rp] of remotePlayers.entries()) {
      const cls = getClassDef(rp.classId);
      const row = document.createElement('div');
      row.className = 'wow-party-member';
      const pct = Math.max(0, Math.min(100, Math.round((rp.hp / Math.max(1, rp.maxHp)) * 100)));
      const dist = Math.round(Math.hypot(playerRig.position.x - rp.group.position.x, playerRig.position.z - rp.group.position.z));

      const infoDiv = document.createElement('div');
      infoDiv.innerHTML =
        `<div class="wpm-name">${cls.icon} ${rp.name} <small>Lv.${rp.level} • ${dist}m</small></div>` +
        `<div class="wpm-hp-track"><div class="wpm-hp-fill" style="width:${pct}%"></div></div>`;

      const tpBtn = document.createElement('button');
      tpBtn.type = 'button';
      tpBtn.className = 'wpm-tp-btn';
      tpBtn.textContent = ml.coopTeleportBtn;
      tpBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const tx = rp.group.position.x + 1.8;
        const tz = rp.group.position.z + 1.8;
        const gY = getTerrainHeight(tx, tz, 0);
        playerRig.position.set(tx, gY + (getIsRidingHorse && getIsRidingHorse() ? 1.15 : 0), tz);
        resolveWallCollisions(playerRig.position, 0.45, false);
        clampPlayerRig();
        if (audio && audio.playHorseWhistleSound) audio.playHorseWhistleSound();
      });

      row.appendChild(infoDiv);
      row.appendChild(tpBtn);
      coopPartyListEl.appendChild(row);
    }
  }

  // ==========================================================================
  // 5. FLERSPILLER- & KLASSE-MODAL ([M] ELLER KNAPP I TOPP-HUD)
  // ==========================================================================
  function toggleCoopModal(forceState) {
    if (!coopModalEl) return;
    coopModalOpen = typeof forceState === 'boolean' ? forceState : !coopModalEl.classList.contains('open');
    coopModalEl.classList.toggle('open', coopModalOpen);
    if (coopModalOpen) {
      renderCoopModal();
      if (document.pointerLockElement && document.exitPointerLock) {
        document.exitPointerLock();
      }
    }
  }

  function renderCoopModal() {
    if (!coopModalEl) return;
    const isNo = getLang() === 'no';
    const ml = ML();

    if (coopTitleEl) coopTitleEl.textContent = ml.coopModalTitle;
    if (coopCloseBtnEl) coopCloseBtnEl.textContent = ml.questCloseBtn;
    const modeLbl = document.getElementById('coop-mode-label');
    if (modeLbl) modeLbl.textContent = ml.coopModeLabel;
    if (coopSoloBtnEl) {
      coopSoloBtnEl.textContent = ml.coopSoloBtn;
      coopSoloBtnEl.classList.toggle('active', mmoState.gameMode === 'solo');
    }
    if (coopMultiBtnEl) {
      coopMultiBtnEl.textContent = ml.coopMultiBtn;
      coopMultiBtnEl.classList.toggle('active', mmoState.gameMode === 'coop');
    }
    const nameLbl = document.getElementById('coop-name-label');
    if (nameLbl) nameLbl.textContent = ml.coopNameLabel;
    if (coopNameInputEl && document.activeElement !== coopNameInputEl) {
      coopNameInputEl.value = mmoState.playerName;
    }

    const clsHdr = document.getElementById('coop-class-hdr');
    if (clsHdr) clsHdr.textContent = ml.coopClassHeader;
    if (coopClassGridEl) {
      coopClassGridEl.innerHTML = '';
      WOW_COWBOY_CLASSES.forEach((cDef) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `coop-class-card${mmoState.classId === cDef.id ? ' selected' : ''}`;
        btn.style.borderColor = mmoState.classId === cDef.id ? cDef.color : 'rgba(217,160,78,0.5)';
        const cTitle = isNo ? cDef.noName : cDef.enName;
        const cDesc = isNo ? cDef.noRole : cDef.enRole;
        btn.innerHTML = `<div style="color:${cDef.color};font-weight:bold;font-size:13.5px">${cDef.icon} ${cTitle}</div><div style="font-size:11.5px;color:#f5e6cc;margin-top:3px">${cDesc}</div>`;
        btn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          mmoState.classId = cDef.id;
          recomputeEquippedRelics();
          saveMMOProgress();
          syncMMOHud();
          updateStatusUI();
          renderCoopModal();
          if (audio && audio.playUpgradeSound) audio.playUpgradeSound();
        });
        coopClassGridEl.appendChild(btn);
      });
    }

    const relHdr = document.getElementById('coop-relics-hdr');
    if (relHdr) relHdr.textContent = ml.coopRelicsHeader;
    if (coopRelicsGridEl) {
      coopRelicsGridEl.innerHTML = '';
      if (mmoState.equippedRelicIds.length === 0) {
        const empty = document.createElement('div');
        empty.style.fontSize = '12px';
        empty.style.color = '#d9c5a0';
        empty.textContent = ml.coopNoRelics;
        coopRelicsGridEl.appendChild(empty);
      } else {
        mmoState.equippedRelicIds.forEach((rid) => {
          const r = WOW_WESTERN_LOOT_TABLE.find((x) => x.id === rid);
          if (!r) return;
          const badge = document.createElement('div');
          badge.className = 'wow-relic-chip';
          badge.style.borderColor = r.color;
          const rName = isNo ? r.noName : r.enName;
          const bonuses = [];
          if (r.dmgPct) bonuses.push(`+${r.dmgPct}% Dmg`);
          if (r.hpBonus) bonuses.push(`+${r.hpBonus} HP`);
          if (r.goldPct) bonuses.push(`+${r.goldPct}% Gold`);
          if (r.critPct) bonuses.push(`+${r.critPct}% Crit`);
          badge.innerHTML = `<span style="color:${r.color};font-weight:bold">[${rName}]</span> <small>${bonuses.join(' • ')}</small>`;
          coopRelicsGridEl.appendChild(badge);
        });
      }
    }

    const connHdr = document.getElementById('coop-conn-hdr');
    if (connHdr) connHdr.textContent = ml.coopConnectHeader;
    if (coopRealm1BtnEl) coopRealm1BtnEl.textContent = ml.coopRealm1Btn;
    if (coopRealm2BtnEl) coopRealm2BtnEl.textContent = ml.coopRealm2Btn;
    if (coopHostCodeBtnEl) coopHostCodeBtnEl.textContent = ml.coopHostCodeBtn;
    if (coopJoinCodeBtnEl) coopJoinCodeBtnEl.textContent = ml.coopJoinCodeBtn;
    if (coopCopyLinkBtnEl) coopCopyLinkBtnEl.textContent = ml.coopCopyLinkBtn;
    if (coopDisconnectBtnEl) {
      coopDisconnectBtnEl.textContent = ml.coopDisconnectBtn;
      coopDisconnectBtnEl.style.display = mmoState.gameMode === 'coop' ? 'inline-block' : 'none';
    }
    if (coopCodeInputEl) coopCodeInputEl.placeholder = ml.coopCodePlaceholder;
    if (coopChatInputEl) coopChatInputEl.placeholder = ml.coopChatPlaceholder;
    if (coopChatSendBtnEl) coopChatSendBtnEl.textContent = ml.coopSendBtn;

    if (coopStatusBoxEl) {
      if (mmoState.gameMode === 'solo') {
        coopStatusBoxEl.textContent = ml.coopStatusSolo;
      } else if (netStatusState === 'connecting') {
        coopStatusBoxEl.textContent = ml.coopStatusConnecting(activeRoomCode);
      } else {
        coopStatusBoxEl.textContent = ml.coopStatusOnline(activeRoomCode, remotePlayers.size, isRealmHost);
      }
    }

    if (coopEmoteRowEl) {
      coopEmoteRowEl.innerHTML = '';
      ml.emotes.forEach((em) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'sens-mini-btn';
        b.textContent = em.label;
        b.addEventListener('click', (ev) => {
          ev.stopPropagation();
          sendPosseChat(em.text);
        });
        coopEmoteRowEl.appendChild(b);
      });
    }
  }

  if (modeBtnEl) {
    modeBtnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleCoopModal();
    });
  }
  if (coopCloseBtnEl) {
    coopCloseBtnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleCoopModal(false);
    });
  }
  if (coopModalEl) {
    coopModalEl.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (e.target === coopModalEl) toggleCoopModal(false);
    });
  }
  if (coopNameInputEl) {
    coopNameInputEl.addEventListener('input', () => {
      const v = coopNameInputEl.value.trim().slice(0, 20);
      if (v) {
        mmoState.playerName = v;
        saveMMOProgress();
      }
    });
    coopNameInputEl.addEventListener('keydown', (e) => e.stopPropagation());
  }
  if (coopCodeInputEl) {
    coopCodeInputEl.addEventListener('keydown', (e) => e.stopPropagation());
  }
  if (coopChatInputEl) {
    coopChatInputEl.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        sendPosseChat(coopChatInputEl.value);
        coopChatInputEl.value = '';
      }
    });
  }
  if (coopChatSendBtnEl) {
    coopChatSendBtnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      if (coopChatInputEl) {
        sendPosseChat(coopChatInputEl.value);
        coopChatInputEl.value = '';
      }
    });
  }
  if (coopSoloBtnEl) {
    coopSoloBtnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      disconnectCoop(true);
    });
  }
  if (coopMultiBtnEl) {
    coopMultiBtnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      joinCoopRoom(mmoState.lastRoomCode || 'REALM1');
    });
  }
  if (coopRealm1BtnEl) {
    coopRealm1BtnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      joinCoopRoom('REALM1');
    });
  }
  if (coopRealm2BtnEl) {
    coopRealm2BtnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      joinCoopRoom('REALM2');
    });
  }
  if (coopHostCodeBtnEl) {
    coopHostCodeBtnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
      if (coopCodeInputEl) coopCodeInputEl.value = code;
      joinCoopRoom(code);
    });
  }
  if (coopJoinCodeBtnEl) {
    coopJoinCodeBtnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      const code = (coopCodeInputEl && coopCodeInputEl.value.trim()) || 'REALM1';
      joinCoopRoom(code);
    });
  }
  if (coopCopyLinkBtnEl) {
    coopCopyLinkBtnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      const room = activeRoomCode || (coopCodeInputEl && coopCodeInputEl.value.trim()) || 'REALM1';
      const url = `${location.origin}${location.pathname}?posse=${encodeURIComponent(room)}`;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).catch(() => {});
      }
      showFrontierToast(
        getLang() === 'no' ? `📋 Invitasjonslenke kopiert (${room})!` : `📋 Invite link copied (${room})!`,
        4.0
      );
    });
  }
  if (coopDisconnectBtnEl) {
    coopDisconnectBtnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      disconnectCoop(true);
    });
  }

  // ==========================================================================
  // 6. SIRKULÆR WESTERN-WOW MINIMAP RADAR (ØVERST TIL HØYRE) & HUD-SYNK
  // ==========================================================================
  const TARGET_REGION_COORDS = {
    bottle: { x: -4.5, z: 3.5 },
    deer_any: { x: 0, z: -78 },
    wolf: { x: -12, z: -92 },
    grizzly: { x: 10, z: -105 },
    bandit_any: { x: 95, z: 0 },
    mine_action: { x: 132, z: 0 },
    gold_pickup: { x: 112, z: 4 },
    train_sniper: { x: 6, z: 75 },
    night_any: { x: -95, z: 0 },
    silver_relic: { x: -92, z: 4 },
    catacomb_guardian: { x: -106, z: 0 },
    malakor: { x: -106, z: 0 },
    cougar: { x: -128, z: -122 },
    white_stag: { x: -138, z: -132 },
    alpha_wolf: { x: -115, z: -138 },
    moonstone: { x: -136, z: -128 },
    fort_bandit: { x: 140, z: -128 },
    strongbox: { x: 140, z: -132 },
    cortez: { x: 140, z: -132 },
    brimstone_foe: { x: 136, z: 136 },
    brimstone_totem: { x: 138, z: 138 },
    marshal: { x: 140, z: 138 },
    bison: { x: -110, z: 120 },
    sun_rune: { x: -136, z: 136 },
    wendigo: { x: -136, z: 136 },
    wendigo_boss: { x: -136, z: 136 },
    oasis_idol: { x: -6, z: 168 },
    oasis_foe: { x: -6, z: 168 },
    sandwraith: { x: -6, z: 168 },
    mill_crate: { x: 2, z: -176 },
    goliath: { x: 2, z: -176 },
    hellhound: { x: 176, z: 62 },
    meteor_core: { x: 176, z: 62 },
    caldera_foe: { x: 176, z: 62 },
    el_fuego: { x: 176, z: 62 },
    star_shard: { x: -176, z: -68 },
    observatory_foe: { x: -176, z: -68 },
    blackfeather: { x: -176, z: -68 }
  };

  function drawMinimapRadar() {
    if (!minimapCtx || !minimapCanvas) return;
    const w = minimapCanvas.width;
    const h = minimapCanvas.height;
    const cx = w * 0.5;
    const cy = h * 0.5;
    const r = cx - 6;
    const radarRange = 165; // meter i spillverdenen

    minimapCtx.clearRect(0, 0, w, h);
    minimapCtx.save();
    minimapCtx.beginPath();
    minimapCtx.arc(cx, cy, r, 0, Math.PI * 2);
    minimapCtx.clip();

    // Mørk pergament/lær-radarbakgrunn
    const bg = minimapCtx.createRadialGradient(cx, cy, 8, cx, cy, r);
    bg.addColorStop(0, 'rgba(54, 34, 18, 0.92)');
    bg.addColorStop(1, 'rgba(22, 13, 6, 0.96)');
    minimapCtx.fillStyle = bg;
    minimapCtx.fillRect(0, 0, w, h);

    // Diskrete avstandsringer
    minimapCtx.strokeStyle = 'rgba(229, 178, 93, 0.18)';
    minimapCtx.lineWidth = 1;
    [0.38, 0.72].forEach((fr) => {
      minimapCtx.beginPath();
      minimapCtx.arc(cx, cy, r * fr, 0, Math.PI * 2);
      minimapCtx.stroke();
    });

    const px = playerRig.position.x;
    const pz = playerRig.position.z;
    const yaw = playerRig.rotation.y;
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);

    // Konverter verdenskoordinat (wx, wz) til spiller-rotert radar (opp = dit du ser!)
    const toRadar = (wx, wz) => {
      const dx = wx - px;
      const dz = wz - pz;
      // Spillerens fremover-retning i Three.js er (-sin(yaw), -cos(yaw))
      const rx = dx * cosY - dz * sinY;
      const forward = -dx * sinY - dz * cosY;
      const scale = (r - 10) / radarRange;
      let sx = cx + rx * scale;
      let sy = cy - forward * scale;
      const dist = Math.hypot(sx - cx, sy - cy);
      const clamped = dist > r - 10;
      if (clamped) {
        const k = (r - 10) / dist;
        sx = cx + (sx - cx) * k;
        sy = cy + (sy - cy) * k;
      }
      return { sx, sy, clamped };
    };

    // 1) Aktivt oppdragsmål (gul lysende sirkel/pil som i WoW!)
    let targetCoord = null;
    for (const [npcId, st] of Object.entries(mmoState.activeNpcQuests)) {
      if (st.readyToTurnIn) {
        const npc = WOW_ZONE_NPCS.find((n) => n.id === npcId);
        if (npc) {
          targetCoord = { x: npc.x, z: npc.z };
          break;
        }
      } else if (TARGET_REGION_COORDS[st.quest.targetType]) {
        targetCoord = TARGET_REGION_COORDS[st.quest.targetType];
        break;
      }
    }
    if (!targetCoord && ctx.getActiveSaloonQuestTargetType) {
      const stType = ctx.getActiveSaloonQuestTargetType();
      if (stType && TARGET_REGION_COORDS[stType]) {
        targetCoord = TARGET_REGION_COORDS[stType];
      }
    }
    if (targetCoord) {
      const pt = toRadar(targetCoord.x, targetCoord.z);
      minimapCtx.fillStyle = 'rgba(255, 224, 92, 0.28)';
      minimapCtx.beginPath();
      minimapCtx.arc(pt.sx, pt.sy, 8, 0, Math.PI * 2);
      minimapCtx.fill();
      minimapCtx.strokeStyle = '#ffe45e';
      minimapCtx.lineWidth = 2;
      minimapCtx.stroke();
    }

    // 2) Alle 8 WoW Quest-Giver NPC-er (! og ?)
    minimapCtx.font = 'bold 13px Georgia, serif';
    minimapCtx.textAlign = 'center';
    minimapCtx.textBaseline = 'middle';
    for (let i = 0; i < zoneNpcEntities.length; i++) {
      const ent = zoneNpcEntities[i];
      const pt = toRadar(ent.def.x, ent.def.z);
      const st = ent.marker.state;
      minimapCtx.fillStyle = st === 'turnin' ? '#7cff72' : (st === 'progress' ? '#cfd8e6' : '#ffd84a');
      minimapCtx.fillText(st === 'turnin' || st === 'progress' ? '?' : '!', pt.sx, pt.sy);
    }

    // 3) Co-op Posse-medspillere (lysende grønne/blå prikker!)
    for (const [, rp] of remotePlayers.entries()) {
      const pt = toRadar(rp.group.position.x, rp.group.position.z);
      minimapCtx.fillStyle = '#4df5ff';
      minimapCtx.beginPath();
      minimapCtx.arc(pt.sx, pt.sy, 4.5, 0, Math.PI * 2);
      minimapCtx.fill();
      minimapCtx.strokeStyle = '#092a36';
      minimapCtx.lineWidth = 1.5;
      minimapCtx.stroke();
    }

    // 4) Spiller-pil i midten
    minimapCtx.fillStyle = '#fff8e2';
    minimapCtx.beginPath();
    minimapCtx.moveTo(cx, cy - 6.5);
    minimapCtx.lineTo(cx + 5, cy + 5.5);
    minimapCtx.lineTo(cx, cy + 2.8);
    minimapCtx.lineTo(cx - 5, cy + 5.5);
    minimapCtx.closePath();
    minimapCtx.fill();

    // Nord-bokstav «N» langs kanten
    const nAngle = yaw - Math.PI * 0.5;
    const nx = cx + Math.cos(nAngle) * (r - 10);
    const ny = cy + Math.sin(nAngle) * (r - 10);
    minimapCtx.fillStyle = '#ff9d5c';
    minimapCtx.font = 'bold 11px sans-serif';
    minimapCtx.fillText('N', nx, ny);

    minimapCtx.restore();

    // Messingramme rundt radaren
    minimapCtx.strokeStyle = '#e5b25d';
    minimapCtx.lineWidth = 3;
    minimapCtx.beginPath();
    minimapCtx.arc(cx, cy, r, 0, Math.PI * 2);
    minimapCtx.stroke();
  }

  function syncMMOHud() {
    const isNo = getLang() === 'no';
    const ml = ML();
    const cls = getClassDef();
    const sName = isNo ? cls.noSkillName : cls.enSkillName;
    const cName = isNo ? cls.noName : cls.enName;

    if (modeBtnEl) {
      modeBtnEl.textContent = mmoState.gameMode === 'coop'
        ? ml.modeBtnCoop(remotePlayers.size + 1)
        : ml.modeBtnSolo;
      modeBtnEl.style.borderColor = mmoState.gameMode === 'coop' ? '#6ef28d' : '#e5b25d';
    }
    if (skillBtnEl) {
      if (mmoState.skillCooldown > 0) {
        skillBtnEl.textContent = ml.skillCooldown(cls.icon, sName, Math.ceil(mmoState.skillCooldown));
        skillBtnEl.style.opacity = '0.76';
      } else {
        skillBtnEl.textContent = ml.skillReady(cls.icon, sName);
        skillBtnEl.style.opacity = '1';
      }
      skillBtnEl.style.borderColor = cls.color;
    }
    if (touchSkillBtnEl) {
      touchSkillBtnEl.textContent = mmoState.skillCooldown > 0
        ? `${cls.icon} ${Math.ceil(mmoState.skillCooldown)}s`
        : `${cls.icon} SKILL`;
    }
    const nextXp = getXpForNextLevel(mmoState.cowboyLevel);
    const xpPct = mmoState.cowboyLevel >= 60 ? 100 : Math.min(100, (mmoState.cowboyXp / nextXp) * 100);
    if (xpBarFillEl) xpBarFillEl.style.width = `${xpPct.toFixed(1)}%`;
    if (xpBarTextEl) {
      xpBarTextEl.textContent = ml.xpBarText(
        mmoState.cowboyLevel,
        mmoState.cowboyXp,
        nextXp,
        cName,
        mmoState.equippedRelicIds.length
      );
    }
  }

  function refreshLanguage() {
    for (let i = 0; i < zoneNpcEntities.length; i++) {
      zoneNpcEntities[i].nameplate.refresh();
    }
    renderQuestTracker();
    renderPartyFrames();
    syncMMOHud();
    if (openNpcDialogId) renderNpcQuestDialog();
    if (coopModalOpen) renderCoopModal();
  }

  function tryRayNpcInteraction(raycaster) {
    if (npcHitMeshes.length === 0) return false;
    const hits = raycaster.intersectObjects(npcHitMeshes, false);
    if (hits.length > 0 && hits[0].distance <= 9.5) {
      const npcId = hits[0].object.userData.zoneNpcId;
      if (npcId) {
        return openNpcQuestDialog(npcId);
      }
    }
    return false;
  }

  // ==========================================================================
  // 7. HOVEDLØKKE-OPPDATERING (0 PER-FRAME ALLOKERINGER)
  // ==========================================================================
  let hudTickAccum = 0;
  let minimapFrameSkip = 0;

  function updateMMOAndCoop(dt, worldTime) {
    // 1) Nedkjøling og aktive klasse-buffs + Sawbones Doc passiv regenerering
    if (mmoState.skillCooldown > 0) {
      const prevCeil = Math.ceil(mmoState.skillCooldown);
      mmoState.skillCooldown = Math.max(0, mmoState.skillCooldown - dt);
      if (Math.ceil(mmoState.skillCooldown) !== prevCeil || mmoState.skillCooldown === 0) {
        syncMMOHud();
      }
    }
    if (mmoState.skillBuffTimer > 0) mmoState.skillBuffTimer = Math.max(0, mmoState.skillBuffTimer - dt);
    if (mmoState.partyDamageBuffTimer > 0) mmoState.partyDamageBuffTimer = Math.max(0, mmoState.partyDamageBuffTimer - dt);
    if (mmoState.marshalShieldTimer > 0) mmoState.marshalShieldTimer = Math.max(0, mmoState.marshalShieldTimer - dt);

    if (mmoState.classId === 'sawbones') {
      mmoState.passiveHealAccum += dt;
      if (mmoState.passiveHealAccum >= 2.0) {
        mmoState.passiveHealAccum -= 2.0;
        const cap = (playerState.maxHealth || 100) + bonusCache.hpBonus;
        if (playerState.health > 0 && playerState.health < cap) {
          playerState.health = Math.min(cap, playerState.health + 5);
          updateStatusUI();
        }
      }
    }

    // 2) Svevende gyllen «!» / «?» over alle 8 Quest-Giver NPC-er (kun nær spilleren for topp FPS)
    const px = playerRig.position.x;
    const pz = playerRig.position.z;
    for (let i = 0; i < zoneNpcEntities.length; i++) {
      const ent = zoneNpcEntities[i];
      const dx = ent.def.x - px;
      const dz = ent.def.z - pz;
      const dSq = dx * dx + dz * dz;
      if (dSq > 165 * 165) continue;
      ent.marker.sprite.position.y = 2.94 + Math.sin(worldTime * 3.1 + i) * 0.11;
      if (ent.anim && dSq < 68 * 68) {
        ent.anim.mixer.update(dt);
      }
    }

    // 3) Co-op posisjonssynk (14 Hz) + myk interpolasjon av medspillere
    if (mmoState.gameMode === 'coop' && activeRoomCode) {
      stateBroadcastAccum += dt;
      if (stateBroadcastAccum >= 0.072) {
        stateBroadcastAccum = 0;
        broadcastCoopPacket(buildCurrentStatePacket());
      }

      const nowMs = performance.now();
      const blend = 1 - Math.exp(-12 * dt);
      for (const [id, rp] of remotePlayers.entries()) {
        if (nowMs - rp.lastSeen > 18000) {
          removeRemotePlayer(id);
          continue;
        }
        const moveDist = Math.hypot(rp.targetPos.x - rp.group.position.x, rp.targetPos.z - rp.group.position.z);
        rp.group.position.lerp(rp.targetPos, blend);
        let dYaw = rp.targetYaw - rp.group.rotation.y;
        while (dYaw > Math.PI) dYaw -= Math.PI * 2;
        while (dYaw < -Math.PI) dYaw += Math.PI * 2;
        rp.group.rotation.y += dYaw * blend;

        if (rp.bodyAnim) {
          const wantWalk = !rp.riding && moveDist > 0.03 && rp.bodyAnim.walkAction;
          if (wantWalk && rp.bodyAnim.mode !== 'walk') {
            rp.bodyAnim.idleAction.fadeOut(0.15);
            rp.bodyAnim.walkAction.reset().fadeIn(0.15).play();
            rp.bodyAnim.mode = 'walk';
          } else if (!wantWalk && rp.bodyAnim.mode !== 'idle') {
            if (rp.bodyAnim.walkAction) rp.bodyAnim.walkAction.fadeOut(0.15);
            rp.bodyAnim.idleAction.reset().fadeIn(0.15).play();
            rp.bodyAnim.mode = 'idle';
          }
          rp.bodyAnim.mixer.update(dt);
        }
        if (rp.riding && rp.horseAnim) {
          const wantGallop = moveDist > 0.03 && rp.horseAnim.walkAction;
          if (wantGallop && rp.horseAnim.mode !== 'walk') {
            rp.horseAnim.idleAction.fadeOut(0.15);
            rp.horseAnim.walkAction.reset().fadeIn(0.15).play();
            rp.horseAnim.mode = 'walk';
          } else if (!wantGallop && rp.horseAnim.mode !== 'idle') {
            if (rp.horseAnim.walkAction) rp.horseAnim.walkAction.fadeOut(0.15);
            rp.horseAnim.idleAction.reset().fadeIn(0.15).play();
            rp.horseAnim.mode = 'idle';
          }
          rp.horseAnim.mixer.update(dt);
        } else if (moveDist > 0.03 && rp.horseGroup && rp.riding && C.animateQuadrupedLegs) {
          rp.walkPhase += dt * 11;
          C.animateQuadrupedLegs(rp.horseGroup, rp.walkPhase, 0.55);
        }
        if (rp.chatTimer > 0) {
          rp.chatTimer = Math.max(0, rp.chatTimer - dt);
          if (rp.chatTimer === 0) {
            rp.chatText = '';
            refreshRemoteNameplate(rp);
          }
        }
      }
    }

    // 4) Fjern utløpte Co-op skudd-tracere
    for (let i = remoteTracerLines.length - 1; i >= 0; i--) {
      const tr = remoteTracerLines[i];
      tr.life -= dt;
      if (tr.life <= 0) {
        scene.remove(tr.line);
        tr.geo.dispose();
        tr.mat.dispose();
        remoteTracerLines.splice(i, 1);
      } else {
        tr.mat.opacity = tr.life / 0.14;
      }
    }

    // 5) Oppdater Minimap (30 Hz) og distanse på Party/Tracker hvert 1.2s
    minimapFrameSkip = (minimapFrameSkip + 1) | 0;
    if (minimapFrameSkip % 2 === 0) {
      drawMinimapRadar();
    }
    hudTickAccum += dt;
    if (hudTickAccum >= 1.2) {
      hudTickAccum = 0;
      if (Object.keys(mmoState.activeNpcQuests).length === 0) renderQuestTracker();
      if (mmoState.gameMode === 'coop' && remotePlayers.size > 0) renderPartyFrames();
    }
  }

  // Initialiser alt!
  loadMMOSave();
  buildZoneQuestNpcs();
  syncMMOHud();
  renderQuestTracker();

  // Auto-koble til Co-op Posse dersom spilleren åpnet en invitasjonslenke (?posse=XXXX)!
  try {
    const params = new URLSearchParams(location.search);
    const posseParam = params.get('posse');
    if (posseParam && posseParam.trim()) {
      setTimeout(() => joinCoopRoom(posseParam.trim()), 350);
    }
  } catch (_) {}

  window.addEventListener('pagehide', () => {
    saveMMOProgress();
    if (mmoState.gameMode === 'coop') {
      broadcastCoopPacket({ type: 'bye' });
    }
  });

  return {
    mmoState,
    zoneNpcEntities,
    remotePlayers,
    getEffectiveDamageMultiplier,
    getDamageTakenMultiplier,
    getMoveSpeedMultiplier,
    getBonusWarhoundRank,
    getRelicGoldMultiplier,
    getBonusMaxHp,
    triggerClassSkill,
    tryRayNpcInteraction,
    openNpcQuestDialog,
    closeNpcQuestDialog,
    acceptOrTurnInCurrentDialogQuest,
    onCombatOrObjectiveEvent,
    toggleCoopModal,
    joinCoopRoom,
    disconnectCoop,
    sendPosseChat,
    notifyLocalShot(ox, oy, oz, dx, dy, dz) {
      if (mmoState.gameMode === 'coop') {
        broadcastCoopPacket({
          type: 'shot',
          ox: Math.round(ox * 100) / 100,
          oy: Math.round(oy * 100) / 100,
          oz: Math.round(oz * 100) / 100,
          dx: Math.round(dx * 1000) / 1000,
          dy: Math.round(dy * 1000) / 1000,
          dz: Math.round(dz * 1000) / 1000
        });
      }
    },
    notifyLocalBossHit(bossKind, dmg) {
      if (mmoState.gameMode === 'coop') {
        broadcastCoopPacket({ type: 'boss_damage', bossKind, dmg });
      }
    },
    refreshLanguage,
    updateMMOAndCoop
  };
}
