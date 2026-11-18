// Syntetiske Western-lydeffekter (sfxBus) og bakgrunnslyd (vind om dagen, sirisser om natten)

export function initWesternAudio(audioCtx, controllers, getNightAmount) {
  const sfxBus = audioCtx.createDynamicsCompressor();
  sfxBus.threshold.value = -16;
  sfxBus.knee.value = 16;
  sfxBus.ratio.value = 6;
  sfxBus.attack.value = 0.002;
  sfxBus.release.value = 0.2;
  sfxBus.connect(audioCtx.destination);

  let gunNoiseBuffer = null;

  function getGunNoiseBuffer() {
    if (gunNoiseBuffer) return gunNoiseBuffer;
    const length = Math.floor(audioCtx.sampleRate * 0.5);
    gunNoiseBuffer = audioCtx.createBuffer(1, length, audioCtx.sampleRate);
    const data = gunNoiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      const t = i / length;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.2);
    }
    return gunNoiseBuffer;
  }

  function playGunshot() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;

    // Kort, kraftig støypuls
    const noise = audioCtx.createBufferSource();
    noise.buffer = getGunNoiseBuffer();
    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(5200, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(700, now + 0.28);
    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.85, now + 0.004);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(sfxBus);
    noise.start(now);
    noise.stop(now + 0.5);

    // Dyp bass
    const boom = audioCtx.createOscillator();
    boom.type = 'sine';
    boom.frequency.setValueAtTime(140, now);
    boom.frequency.exponentialRampToValueAtTime(38, now + 0.22);
    const boomGain = audioCtx.createGain();
    boomGain.gain.setValueAtTime(0.0001, now);
    boomGain.gain.exponentialRampToValueAtTime(0.8, now + 0.008);
    boomGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    boom.connect(boomGain);
    boomGain.connect(sfxBus);
    boom.start(now);
    boom.stop(now + 0.55);

    // Skarp tennhette-crack
    const crack = audioCtx.createOscillator();
    crack.type = 'square';
    crack.frequency.setValueAtTime(1800, now);
    crack.frequency.exponentialRampToValueAtTime(320, now + 0.05);
    const crackGain = audioCtx.createGain();
    crackGain.gain.setValueAtTime(0.22, now);
    crackGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
    crack.connect(crackGain);
    crackGain.connect(sfxBus);
    crack.start(now);
    crack.stop(now + 0.08);
  }

  function playBottleHit() {
    if (audioCtx.state === 'suspended') return;
    const now = audioCtx.currentTime;
    const ping = audioCtx.createOscillator();
    ping.type = 'triangle';
    ping.frequency.setValueAtTime(1400 + Math.random() * 500, now);
    ping.frequency.exponentialRampToValueAtTime(520, now + 0.12);
    const pingGain = audioCtx.createGain();
    pingGain.gain.setValueAtTime(0.0001, now);
    pingGain.gain.exponentialRampToValueAtTime(0.16, now + 0.005);
    pingGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
    ping.connect(pingGain);
    pingGain.connect(sfxBus);
    ping.start(now);
    ping.stop(now + 0.2);
  }

  function ensureAudioRunning() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }

  function playFleshHitSound() {
    ensureAudioRunning();
    const now = audioCtx.currentTime;
    const noise = audioCtx.createBufferSource();
    noise.buffer = getGunNoiseBuffer();
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, now);
    filter.frequency.exponentialRampToValueAtTime(250, now + 0.09);
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(sfxBus);
    noise.start(now);
    noise.stop(now + 0.11);
  }

  function playPlayerHitSound() {
    ensureAudioRunning();
    const now = audioCtx.currentTime;

    const thud = audioCtx.createOscillator();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(140, now);
    thud.frequency.exponentialRampToValueAtTime(42, now + 0.22);
    const thudGain = audioCtx.createGain();
    thudGain.gain.setValueAtTime(0.55, now);
    thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    thud.connect(thudGain);
    thudGain.connect(sfxBus);
    thud.start(now);
    thud.stop(now + 0.27);

    const noise = audioCtx.createBufferSource();
    noise.buffer = getGunNoiseBuffer();
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(180, now + 0.12);
    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.4, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(sfxBus);
    noise.start(now);
    noise.stop(now + 0.16);
  }

  function playPlayerDeathSound() {
    ensureAudioRunning();
    const now = audioCtx.currentTime;

    const low = audioCtx.createOscillator();
    low.type = 'sawtooth';
    low.frequency.setValueAtTime(95, now);
    low.frequency.exponentialRampToValueAtTime(24, now + 1.0);
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + 1.0);
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
    low.connect(filter);
    filter.connect(gain);
    gain.connect(sfxBus);
    low.start(now);
    low.stop(now + 1.15);

    const rumble = audioCtx.createBufferSource();
    rumble.buffer = getGunNoiseBuffer();
    const rumbleFilter = audioCtx.createBiquadFilter();
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.setValueAtTime(220, now);
    const rumbleGain = audioCtx.createGain();
    rumbleGain.gain.setValueAtTime(0.28, now);
    rumbleGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
    rumble.connect(rumbleFilter);
    rumbleFilter.connect(rumbleGain);
    rumbleGain.connect(sfxBus);
    rumble.start(now);
    rumble.stop(now + 0.95);
  }

  function playCollectSound() {
    ensureAudioRunning();
    const now = audioCtx.currentTime;
    [660, 990].forEach((frequency, index) => {
      const start = now + index * 0.11;
      const osc = audioCtx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(frequency, start);
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.16, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
      osc.connect(gain);
      gain.connect(sfxBus);
      osc.start(start);
      osc.stop(start + 0.25);
    });
  }

  function playUpgradeSound() {
    ensureAudioRunning();
    const now = audioCtx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((frequency, idx) => {
      const start = now + idx * 0.085;
      const duration = idx === 3 ? 0.34 : 0.18;
      const osc = audioCtx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(frequency, start);
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.2, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(sfxBus);
      osc.start(start);
      osc.stop(start + duration + 0.02);
    });
  }

  function playShopDenySound() {
    ensureAudioRunning();
    const now = audioCtx.currentTime;
    [230, 170].forEach((frequency, idx) => {
      const start = now + idx * 0.09;
      const osc = audioCtx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(frequency, start);
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.14, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.12);
      osc.connect(gain);
      gain.connect(sfxBus);
      osc.start(start);
      osc.stop(start + 0.14);
    });
  }

  function playHealSound() {
    ensureAudioRunning();
    const now = audioCtx.currentTime;
    [392.0, 493.88, 587.33].forEach((frequency, idx) => {
      const start = now + idx * 0.055;
      const osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, start);
      osc.frequency.exponentialRampToValueAtTime(frequency * 1.02, start + 0.36);
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4);
      osc.connect(gain);
      gain.connect(sfxBus);
      osc.start(start);
      osc.stop(start + 0.42);
    });
  }

  function playQuestSelectSound() {
    ensureAudioRunning();
    const now = audioCtx.currentTime;
    [440, 587.33].forEach((freq, idx) => {
      const start = now + idx * 0.08;
      const osc = audioCtx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);
      osc.connect(gain);
      gain.connect(sfxBus);
      osc.start(start);
      osc.stop(start + 0.22);
    });
  }

  function playQuestFanfare() {
    ensureAudioRunning();
    const now = audioCtx.currentTime;
    const melody = [
      { freq: 392.0, time: 0.0, dur: 0.14 },
      { freq: 523.25, time: 0.13, dur: 0.14 },
      { freq: 659.25, time: 0.26, dur: 0.14 },
      { freq: 783.99, time: 0.39, dur: 0.24 },
      { freq: 659.25, time: 0.62, dur: 0.13 },
      { freq: 1046.5, time: 0.75, dur: 0.52 }
    ];
    melody.forEach((note) => {
      const start = now + note.time;

      // Messing-/trompet-klang (sawtooth filtrert gjennom varm lowpass + triangle-overtone)
      const brass = audioCtx.createOscillator();
      brass.type = 'sawtooth';
      brass.frequency.setValueAtTime(note.freq, start);

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(note.freq * 3.4, start);

      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.22, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + note.dur);

      brass.connect(filter);
      filter.connect(gain);
      gain.connect(sfxBus);
      brass.start(start);
      brass.stop(start + note.dur + 0.03);

      const warm = audioCtx.createOscillator();
      warm.type = 'triangle';
      warm.frequency.setValueAtTime(note.freq * 0.5, start);
      const warmGain = audioCtx.createGain();
      warmGain.gain.setValueAtTime(0.0001, start);
      warmGain.gain.exponentialRampToValueAtTime(0.14, start + 0.02);
      warmGain.gain.exponentialRampToValueAtTime(0.0001, start + note.dur);
      warm.connect(warmGain);
      warmGain.connect(sfxBus);
      warm.start(start);
      warm.stop(start + note.dur + 0.03);
    });
  }

  function playDoorToggleSound(opening) {
    ensureAudioRunning();
    const now = audioCtx.currentTime;

    // Tung treknirk + jernklinke
    const creak = audioCtx.createOscillator();
    creak.type = 'sawtooth';
    creak.frequency.setValueAtTime(opening ? 95 : 135, now);
    creak.frequency.exponentialRampToValueAtTime(opening ? 148 : 74, now + 0.22);
    const creakFilter = audioCtx.createBiquadFilter();
    creakFilter.type = 'lowpass';
    creakFilter.frequency.setValueAtTime(380, now);
    const creakGain = audioCtx.createGain();
    creakGain.gain.setValueAtTime(0.0001, now);
    creakGain.gain.exponentialRampToValueAtTime(0.16, now + 0.03);
    creakGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    creak.connect(creakFilter);
    creakFilter.connect(creakGain);
    creakGain.connect(sfxBus);
    creak.start(now);
    creak.stop(now + 0.27);

    const clunk = audioCtx.createOscillator();
    clunk.type = 'triangle';
    clunk.frequency.setValueAtTime(opening ? 220 : 150, now + 0.16);
    clunk.frequency.exponentialRampToValueAtTime(60, now + 0.26);
    const clunkGain = audioCtx.createGain();
    clunkGain.gain.setValueAtTime(0.0001, now + 0.16);
    clunkGain.gain.exponentialRampToValueAtTime(0.2, now + 0.17);
    clunkGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    clunk.connect(clunkGain);
    clunkGain.connect(sfxBus);
    clunk.start(now + 0.16);
    clunk.stop(now + 0.3);
  }

  function playBanditShotSound() {
    ensureAudioRunning();
    const now = audioCtx.currentTime;

    const noise = audioCtx.createBufferSource();
    noise.buffer = getGunNoiseBuffer();
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900, now);
    filter.Q.value = 0.8;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(sfxBus);
    noise.start(now);
    noise.stop(now + 0.2);

    const thump = audioCtx.createOscillator();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(90, now);
    thump.frequency.exponentialRampToValueAtTime(40, now + 0.16);
    const thumpGain = audioCtx.createGain();
    thumpGain.gain.setValueAtTime(0.18, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    thump.connect(thumpGain);
    thumpGain.connect(sfxBus);
    thump.start(now);
    thump.stop(now + 0.2);
  }

  function playShotgunSound() {
    ensureAudioRunning();
    const now = audioCtx.currentTime;

    const noise = audioCtx.createBufferSource();
    noise.buffer = getGunNoiseBuffer();
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3600, now);
    filter.frequency.exponentialRampToValueAtTime(340, now + 0.44);
    const nGain = audioCtx.createGain();
    nGain.gain.setValueAtTime(0.0001, now);
    nGain.gain.exponentialRampToValueAtTime(1.0, now + 0.004);
    nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.46);
    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(sfxBus);
    noise.start(now);
    noise.stop(now + 0.49);

    const sub = audioCtx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(175, now);
    sub.frequency.exponentialRampToValueAtTime(28, now + 0.34);
    const sGain = audioCtx.createGain();
    sGain.gain.setValueAtTime(0.95, now);
    sGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
    sub.connect(sGain);
    sGain.connect(sfxBus);
    sub.start(now);
    sub.stop(now + 0.45);
  }

  function playRifleSound() {
    ensureAudioRunning();
    const now = audioCtx.currentTime;

    const noise = audioCtx.createBufferSource();
    noise.buffer = getGunNoiseBuffer();
    const hp = audioCtx.createBiquadFilter();
    hp.type = 'bandpass';
    hp.frequency.setValueAtTime(2400, now);
    hp.Q.value = 0.7;
    const nGain = audioCtx.createGain();
    nGain.gain.setValueAtTime(0.82, now);
    nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    noise.connect(hp);
    hp.connect(nGain);
    nGain.connect(sfxBus);
    noise.start(now);
    noise.stop(now + 0.26);

    const crack = audioCtx.createOscillator();
    crack.type = 'sawtooth';
    crack.frequency.setValueAtTime(2650, now);
    crack.frequency.exponentialRampToValueAtTime(280, now + 0.075);
    const cGain = audioCtx.createGain();
    cGain.gain.setValueAtTime(0.32, now);
    cGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.085);
    crack.connect(cGain);
    cGain.connect(sfxBus);
    crack.start(now);
    crack.stop(now + 0.095);

    // Winchester lever-action metallklikk («chhk-chak»)
    [0.19, 0.28].forEach((offset, idx) => {
      const lever = audioCtx.createOscillator();
      lever.type = 'triangle';
      lever.frequency.setValueAtTime(idx === 0 ? 1150 : 1520, now + offset);
      lever.frequency.exponentialRampToValueAtTime(420, now + offset + 0.045);
      const lGain = audioCtx.createGain();
      lGain.gain.setValueAtTime(0.11, now + offset);
      lGain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.05);
      lever.connect(lGain);
      lGain.connect(sfxBus);
      lever.start(now + offset);
      lever.stop(now + offset + 0.06);
    });
  }

  function playCrossbowSound() {
    ensureAudioRunning();
    const now = audioCtx.currentTime;

    const twang = audioCtx.createOscillator();
    twang.type = 'triangle';
    twang.frequency.setValueAtTime(210, now);
    twang.frequency.exponentialRampToValueAtTime(88, now + 0.16);
    const tGain = audioCtx.createGain();
    tGain.gain.setValueAtTime(0.38, now);
    tGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    twang.connect(tGain);
    tGain.connect(sfxBus);
    twang.start(now);
    twang.stop(now + 0.2);

    [1760, 2637].forEach((freq, i) => {
      const silver = audioCtx.createOscillator();
      silver.type = 'sine';
      silver.frequency.setValueAtTime(freq, now + i * 0.02);
      silver.frequency.exponentialRampToValueAtTime(freq * 0.85, now + 0.24);
      const sGain = audioCtx.createGain();
      sGain.gain.setValueAtTime(0.13, now + i * 0.02);
      sGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      silver.connect(sGain);
      sGain.connect(sfxBus);
      silver.start(now + i * 0.02);
      silver.stop(now + 0.27);
    });
  }

  function playDynamiteThrowSound() {
    ensureAudioRunning();
    const now = audioCtx.currentTime;

    const hiss = audioCtx.createBufferSource();
    hiss.buffer = getGunNoiseBuffer();
    const bp = audioCtx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(4800, now);
    bp.Q.value = 1.8;
    const hGain = audioCtx.createGain();
    hGain.gain.setValueAtTime(0.18, now);
    hGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    hiss.connect(bp);
    bp.connect(hGain);
    hGain.connect(sfxBus);
    hiss.start(now);
    hiss.stop(now + 0.48);
  }

  function playExplosionSound() {
    ensureAudioRunning();
    const now = audioCtx.currentTime;

    const blast = audioCtx.createBufferSource();
    blast.buffer = getGunNoiseBuffer();
    const lp = audioCtx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2200, now);
    lp.frequency.exponentialRampToValueAtTime(140, now + 0.48);
    const bGain = audioCtx.createGain();
    bGain.gain.setValueAtTime(0.0001, now);
    bGain.gain.exponentialRampToValueAtTime(1.0, now + 0.008);
    bGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.49);
    blast.connect(lp);
    lp.connect(bGain);
    bGain.connect(sfxBus);
    blast.start(now);
    blast.stop(now + 0.5);

    const sub = audioCtx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(110, now);
    sub.frequency.exponentialRampToValueAtTime(20, now + 0.78);
    const sGain = audioCtx.createGain();
    sGain.gain.setValueAtTime(1.0, now);
    sGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);
    sub.connect(sGain);
    sGain.connect(sfxBus);
    sub.start(now);
    sub.stop(now + 0.88);
  }

  function playWeaponSwitchSound() {
    ensureAudioRunning();
    const now = audioCtx.currentTime;
    [720, 1080].forEach((freq, idx) => {
      const start = now + idx * 0.045;
      const osc = audioCtx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      const g = audioCtx.createGain();
      g.gain.setValueAtTime(0.12, start);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.06);
      osc.connect(g);
      g.connect(sfxBus);
      osc.start(start);
      osc.stop(start + 0.07);
    });
  }

  function playGoldPickupSound() {
    ensureAudioRunning();
    const now = audioCtx.currentTime;
    [1318.5, 1975.5].forEach((freq, idx) => {
      const start = now + idx * 0.075;
      const coin = audioCtx.createOscillator();
      coin.type = 'sine';
      coin.frequency.setValueAtTime(freq, start);
      const g = audioCtx.createGain();
      g.gain.setValueAtTime(0.2, start);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
      coin.connect(g);
      g.connect(sfxBus);
      coin.start(start);
      coin.stop(start + 0.3);
    });
  }

  function playRockRicochetSound() {
    if (audioCtx.state === 'suspended') return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    const f0 = 1750 + Math.random() * 650;
    osc.frequency.setValueAtTime(f0, now);
    osc.frequency.exponentialRampToValueAtTime(480, now + 0.14);
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(0.11, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
    osc.connect(g);
    g.connect(sfxBus);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  function playBearRoarSound() {
    ensureAudioRunning();
    const now = audioCtx.currentTime;
    const growl = audioCtx.createOscillator();
    growl.type = 'sawtooth';
    growl.frequency.setValueAtTime(92, now);
    growl.frequency.exponentialRampToValueAtTime(46, now + 0.48);
    const lp = audioCtx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(340, now);
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(0.32, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.52);
    growl.connect(lp);
    lp.connect(g);
    g.connect(sfxBus);
    growl.start(now);
    growl.stop(now + 0.55);
  }

  function playBossVictoryFanfare() {
    ensureAudioRunning();
    const now = audioCtx.currentTime;
    const chords = [
      { freq: 392.0, time: 0.0, dur: 0.18 },
      { freq: 523.25, time: 0.16, dur: 0.18 },
      { freq: 659.25, time: 0.32, dur: 0.18 },
      { freq: 783.99, time: 0.48, dur: 0.28 },
      { freq: 659.25, time: 0.76, dur: 0.16 },
      { freq: 783.99, time: 0.92, dur: 0.22 },
      { freq: 1046.5, time: 1.14, dur: 0.85 }
    ];
    chords.forEach((note) => {
      const start = now + note.time;
      [1.0, 0.5].forEach((mult, idx) => {
        const osc = audioCtx.createOscillator();
        osc.type = idx === 0 ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(note.freq * mult, start);
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(note.freq * 3.6, start);
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(idx === 0 ? 0.24 : 0.18, start + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + note.dur);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(sfxBus);
        osc.start(start);
        osc.stop(start + note.dur + 0.04);
      });
    });
  }

  const AMBIENCE_MASTER_VOLUME = 0.07;
  const AMBIENCE_DAY_LEVEL = 0.6;
  const AMBIENCE_NIGHT_LEVEL = 0.45;
  const AMBIENCE_FADE_TIME = 0.6;
  const AMBIENCE_UPDATE_INTERVAL = 0.12;

  let ambienceStarted = false;
  let ambienceAppliedMix = -1;
  let ambienceUpdateCooldown = 0;
  let ambienceMaster = null;
  let dayWindGain = null;
  let nightCricketGain = null;

  function createWesternWindBuffer() {
    const sampleRate = audioCtx.sampleRate;
    const duration = 4;
    const length = Math.floor(sampleRate * duration);
    const buffer = audioCtx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    // Brunaktig støy gir en dypere, mindre hvesende vind enn hvit støy.
    let brown = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      brown = (brown + 0.02 * white) / 1.02;
      data[i] = brown * 3.2;
    }

    // Kort kryssfade gjør looping uten klikk i skjøten.
    const fadeLength = Math.floor(sampleRate * 0.3);
    for (let i = 0; i < fadeLength; i++) {
      const t = i / fadeLength;
      const endIndex = length - fadeLength + i;
      data[endIndex] = data[endIndex] * (1 - t) + data[i] * t;
    }

    return buffer;
  }

  function createCricketBuffer() {
    const sampleRate = audioCtx.sampleRate;
    const duration = 6;
    const length = Math.floor(sampleRate * duration);
    const buffer = audioCtx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    // Rolige, uregelmessige chirp-grupper ved ca. 4,1–4,6 kHz.
    const chirpStarts = [0.2, 0.9, 1.6, 2.3, 3.1, 3.8, 4.6, 5.3];
    const pulseLength = Math.floor(sampleRate * 0.022);
    const pulseGap = Math.floor(sampleRate * 0.018);
    const pulsesPerChirp = 4;

    chirpStarts.forEach((offset, chirpIndex) => {
      const frequency = chirpIndex % 2 === 0 ? 4100 : 4550;
      const start = Math.floor(offset * sampleRate);

      for (let p = 0; p < pulsesPerChirp; p++) {
        const pulseStart = start + p * (pulseLength + pulseGap);
        for (let i = 0; i < pulseLength; i++) {
          const sampleIndex = pulseStart + i;
          if (sampleIndex >= length) break;
          const t = i / pulseLength;
          const envelope = Math.sin(Math.PI * t);
          data[sampleIndex] +=
            Math.sin((2 * Math.PI * frequency * i) / sampleRate) * envelope * 0.2;
        }
      }
    });

    // Kort kryssfade for jevn loop.
    const fadeLength = Math.floor(sampleRate * 0.1);
    for (let i = 0; i < fadeLength; i++) {
      const t = i / fadeLength;
      const endIndex = length - fadeLength + i;
      data[endIndex] = data[endIndex] * (1 - t) + data[i] * t;
    }

    return buffer;
  }

  function startBackgroundAmbience() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    if (ambienceStarted) return;
    ambienceStarted = true;

    ambienceMaster = audioCtx.createGain();
    ambienceMaster.gain.value = AMBIENCE_MASTER_VOLUME;
    ambienceMaster.connect(audioCtx.destination);

    // Dag: lavfrekvent, filtrert ørkenvind med langsomme kast.
    const windSource = audioCtx.createBufferSource();
    windSource.buffer = createWesternWindBuffer();
    windSource.loop = true;

    const windHighpass = audioCtx.createBiquadFilter();
    windHighpass.type = 'highpass';
    windHighpass.frequency.value = 70;

    const windFilter = audioCtx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 480;
    windFilter.Q.value = 0.4;

    dayWindGain = audioCtx.createGain();
    dayWindGain.gain.value = 0;

    windSource.connect(windHighpass);
    windHighpass.connect(windFilter);
    windFilter.connect(dayWindGain);
    dayWindGain.connect(ambienceMaster);

    const windLfo = audioCtx.createOscillator();
    windLfo.type = 'sine';
    windLfo.frequency.value = 0.07;
    const windLfoGain = audioCtx.createGain();
    windLfoGain.gain.value = 140;
    windLfo.connect(windLfoGain);
    windLfoGain.connect(windFilter.frequency);

    // Natt: sirisser med smal båndpass rundt 4,3 kHz.
    const cricketSource = audioCtx.createBufferSource();
    cricketSource.buffer = createCricketBuffer();
    cricketSource.loop = true;

    const cricketFilter = audioCtx.createBiquadFilter();
    cricketFilter.type = 'bandpass';
    cricketFilter.frequency.value = 4300;
    cricketFilter.Q.value = 4;

    nightCricketGain = audioCtx.createGain();
    nightCricketGain.gain.value = 0;

    cricketSource.connect(cricketFilter);
    cricketFilter.connect(nightCricketGain);
    nightCricketGain.connect(ambienceMaster);

    const initialNight = Math.max(0, Math.min(1, getNightAmount()));
    const now = audioCtx.currentTime;
    const dayLevel = (1 - initialNight) * AMBIENCE_DAY_LEVEL;
    const nightLevel = initialNight * AMBIENCE_NIGHT_LEVEL;

    // Myk innfading ved første interaksjon.
    dayWindGain.gain.setValueAtTime(0, now);
    nightCricketGain.gain.setValueAtTime(0, now);
    dayWindGain.gain.linearRampToValueAtTime(dayLevel, now + 1.5);
    nightCricketGain.gain.linearRampToValueAtTime(nightLevel, now + 1.5);
    ambienceAppliedMix = initialNight;

    windSource.start();
    cricketSource.start();
    windLfo.start();
  }

  function updateBackgroundAmbience(dt) {
    if (!ambienceStarted) return;

    ambienceUpdateCooldown -= dt;
    if (ambienceUpdateCooldown > 0) return;
    ambienceUpdateCooldown = AMBIENCE_UPDATE_INTERVAL;

    const mix = Math.max(0, Math.min(1, getNightAmount()));
    if (Math.abs(mix - ambienceAppliedMix) < 0.015) return;
    ambienceAppliedMix = mix;

    const now = audioCtx.currentTime;
    dayWindGain.gain.setTargetAtTime(
      (1 - mix) * AMBIENCE_DAY_LEVEL,
      now,
      AMBIENCE_FADE_TIME
    );
    nightCricketGain.gain.setTargetAtTime(
      mix * AMBIENCE_NIGHT_LEVEL,
      now,
      AMBIENCE_FADE_TIME
    );
  }

  // Start ved første klikk, skjermberøring eller VR-avtrekk.
  window.addEventListener('pointerdown', startBackgroundAmbience, { passive: true });
  window.addEventListener('touchstart', startBackgroundAmbience, { passive: true });
  controllers.forEach((controller) => {
    controller.addEventListener('selectstart', startBackgroundAmbience);
    controller.addEventListener('squeezestart', startBackgroundAmbience);
  });

  return {
    sfxBus,
    ensureAudioRunning,
    playGunshot,
    playShotgunSound,
    playRifleSound,
    playCrossbowSound,
    playDynamiteThrowSound,
    playExplosionSound,
    playWeaponSwitchSound,
    playGoldPickupSound,
    playRockRicochetSound,
    playBearRoarSound,
    playBossVictoryFanfare,
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
  };
}
