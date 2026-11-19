import * as THREE from 'three';

export function createSeededRng(seed) {
  let s = seed >>> 0;
  return function nextRng() {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Rask Sobel høydekart -> tangent-rom RGB normalMap (THREE.NoColorSpace, sømløs RepeatWrapping)
export function createNormalCanvasFromHeight(bumpCanvas, strength = 2.0) {
  const w = bumpCanvas.width;
  const h = bumpCanvas.height;
  const srcCtx = bumpCanvas.getContext('2d');
  const srcData = srcCtx.getImageData(0, 0, w, h).data;

  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = w;
  normalCanvas.height = h;
  const dstCtx = normalCanvas.getContext('2d');
  const dstImg = dstCtx.createImageData(w, h);
  const dstData = dstImg.data;

  const len = w * h;
  const heights = new Float32Array(len);
  const inv255 = 1.0 / 255.0;
  for (let i = 0, p = 0; i < len; i++, p += 4) {
    heights[i] = srcData[p] * inv255;
  }

  const wMask = (w & (w - 1)) === 0 ? (w - 1) : -1;
  const hMask = (h & (h - 1)) === 0 ? (h - 1) : -1;

  for (let y = 0; y < h; y++) {
    const ym1 = (hMask >= 0 ? ((y - 1) & hMask) : ((y - 1 + h) % h)) * w;
    const y0 = y * w;
    const yp1 = (hMask >= 0 ? ((y + 1) & hMask) : ((y + 1) % h)) * w;

    for (let x = 0; x < w; x++) {
      const xm1 = wMask >= 0 ? ((x - 1) & wMask) : ((x - 1 + w) % w);
      const xp1 = wMask >= 0 ? ((x + 1) & wMask) : ((x + 1) % w);

      const tl = heights[ym1 + xm1];
      const tc = heights[ym1 + x];
      const tr = heights[ym1 + xp1];
      const ml = heights[y0 + xm1];
      const mr = heights[y0 + xp1];
      const bl = heights[yp1 + xm1];
      const bc = heights[yp1 + x];
      const br = heights[yp1 + xp1];

      const dX = (tr + 2.0 * mr + br) - (tl + 2.0 * ml + bl);
      const dY = (bl + 2.0 * bc + br) - (tl + 2.0 * tc + tr);

      const nx = -dX * strength;
      const ny = dY * strength;
      const invLen = 1.0 / Math.sqrt(nx * nx + ny * ny + 1.0);

      const outIdx = (y0 + x) << 2;
      dstData[outIdx] = (nx * invLen * 127.5 + 127.5) | 0;
      dstData[outIdx + 1] = (ny * invLen * 127.5 + 127.5) | 0;
      dstData[outIdx + 2] = (invLen * 127.5 + 127.5) | 0;
      dstData[outIdx + 3] = 255;
    }
  }

  dstCtx.putImageData(dstImg, 0, 0);
  return normalCanvas;
}

// Rask mikro-korn/fiber-pass med ImageData for 1024x1024 PBR-detalj uten treg løkke
function applyPixelMicroDetail(cCtx, bCtx, rCtx, w, h, seed, colorAmp, bumpAmp, roughAmp, streakX = 1) {
  const cImg = cCtx.getImageData(0, 0, w, h);
  const bImg = bCtx.getImageData(0, 0, w, h);
  const rImg = rCtx.getImageData(0, 0, w, h);
  const cd = cImg.data;
  const bd = bImg.data;
  const rd = rImg.data;
  let s = (seed >>> 0) || 1;
  const total = w * h * 4;
  for (let i = 0; i < total; i += 4) {
    if (streakX <= 1 || ((i >> 2) % streakX) === 0) {
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
    }
    const n = ((s & 255) - 128) * 0.0078125;
    if (colorAmp !== 0) {
      const dc = (n * colorAmp) | 0;
      const r = cd[i] + dc;
      const g = cd[i + 1] + ((dc * 3) >> 2);
      const b = cd[i + 2] + (dc >> 1);
      cd[i] = r < 0 ? 0 : (r > 255 ? 255 : r);
      cd[i + 1] = g < 0 ? 0 : (g > 255 ? 255 : g);
      cd[i + 2] = b < 0 ? 0 : (b > 255 ? 255 : b);
    }
    if (bumpAmp !== 0) {
      let bv = bd[i] + ((n * bumpAmp) | 0);
      bv = bv < 0 ? 0 : (bv > 255 ? 255 : bv);
      bd[i] = bd[i + 1] = bd[i + 2] = bv;
    }
    if (roughAmp !== 0) {
      let rv = rd[i] + ((n * roughAmp) | 0);
      rv = rv < 0 ? 0 : (rv > 255 ? 255 : rv);
      rd[i] = rd[i + 1] = rd[i + 2] = rv;
    }
  }
  cCtx.putImageData(cImg, 0, 0);
  bCtx.putImageData(bImg, 0, 0);
  rCtx.putImageData(rImg, 0, 0);
}

// 3a. Værbitt treverk (1024x1024): fargekart + bumpMap/normalMap + roughnessMap
function createWeatheredWoodMaps() {
  const S = 1024;
  const K = 4;
  const rng = createSeededRng(1885);
  const colorCanvas = document.createElement('canvas');
  const bumpCanvas = document.createElement('canvas');
  const roughCanvas = document.createElement('canvas');
  colorCanvas.width = bumpCanvas.width = roughCanvas.width = S;
  colorCanvas.height = bumpCanvas.height = roughCanvas.height = S;

  const cCtx = colorCanvas.getContext('2d');
  const bCtx = bumpCanvas.getContext('2d');
  const rCtx = roughCanvas.getContext('2d');

  bCtx.fillStyle = 'rgb(150,150,150)';
  bCtx.fillRect(0, 0, S, S);
  rCtx.fillStyle = 'rgb(198,198,198)';
  rCtx.fillRect(0, 0, S, S);

  const plankCount = 8;
  const plankH = S / plankCount;

  for (let p = 0; p < plankCount; p++) {
    const y0 = p * plankH;
    const shade = 154 + Math.floor((rng() - 0.5) * 36);
    const r = Math.min(255, shade + 28);
    const g = Math.floor(shade * 0.76);
    const b = Math.floor(shade * 0.50);
    cCtx.fillStyle = `rgb(${r},${g},${b})`;
    cCtx.fillRect(0, y0, S, plankH);

    const plankBump = 138 + Math.floor((rng() - 0.5) * 28);
    bCtx.fillStyle = `rgb(${plankBump},${plankBump},${plankBump})`;
    bCtx.fillRect(0, y0 + 2 * K, S, plankH - 3 * K);

    const plankRough = 175 + Math.floor((rng() - 0.5) * 36);
    rCtx.fillStyle = `rgb(${plankRough},${plankRough},${plankRough})`;
    rCtx.fillRect(0, y0, S, plankH);

    for (let line = 0; line < 24; line++) {
      const ly = y0 + 8 + (line / 24) * (plankH - 16);
      const waveAmp = (0.8 + rng() * 1.9) * K * 0.7;
      const phase = rng() * Math.PI * 2;
      const isDarkGrain = line % 2 === 0;
      cCtx.strokeStyle = isDarkGrain ? 'rgba(54, 28, 11, 0.28)' : 'rgba(238, 198, 148, 0.17)';
      bCtx.strokeStyle = isDarkGrain ? 'rgba(72, 72, 72, 0.52)' : 'rgba(215, 215, 215, 0.40)';
      rCtx.strokeStyle = isDarkGrain ? 'rgba(235, 235, 235, 0.38)' : 'rgba(135, 135, 135, 0.34)';
      cCtx.lineWidth = bCtx.lineWidth = rCtx.lineWidth = 2.4;

      cCtx.beginPath();
      bCtx.beginPath();
      rCtx.beginPath();
      for (let x = 0; x <= S; x += 32) {
        const wy = ly + Math.sin((x / S) * Math.PI * 2 + phase) * waveAmp;
        if (x === 0) {
          cCtx.moveTo(x, wy);
          bCtx.moveTo(x, wy);
          rCtx.moveTo(x, wy);
        } else {
          cCtx.lineTo(x, wy);
          bCtx.lineTo(x, wy);
          rCtx.lineTo(x, wy);
        }
      }
      cCtx.stroke();
      bCtx.stroke();
      rCtx.stroke();
    }

    if (rng() > 0.28) {
      const kx = (34 + rng() * 188) * K;
      const ky = y0 + plankH * (0.32 + rng() * 0.36);
      cCtx.lineWidth = bCtx.lineWidth = 2.6;
      for (let ring = 4; ring >= 1; ring--) {
        cCtx.beginPath();
        cCtx.ellipse(kx, ky, ring * 4.0 * K, ring * 1.9 * K, 0, 0, Math.PI * 2);
        cCtx.strokeStyle = 'rgba(48, 23, 8, 0.36)';
        cCtx.stroke();

        bCtx.beginPath();
        bCtx.ellipse(kx, ky, ring * 4.0 * K, ring * 1.9 * K, 0, 0, Math.PI * 2);
        bCtx.strokeStyle = ring === 1 ? 'rgba(40,40,40,0.85)' : 'rgba(95,95,95,0.58)';
        bCtx.stroke();
      }
    }
    for (let cr = 0; cr < 3; cr++) {
      if (rng() > 0.32) {
        const cx = (14 + rng() * 180) * K;
        const cy = y0 + 16 + rng() * (plankH - 32);
        const len = (24 + rng() * 44) * K;
        const dy = (rng() - 0.5) * 10;
        cCtx.strokeStyle = 'rgba(30, 14, 5, 0.55)';
        bCtx.strokeStyle = 'rgba(18, 18, 18, 0.9)';
        rCtx.strokeStyle = 'rgba(248, 248, 248, 0.8)';
        cCtx.lineWidth = bCtx.lineWidth = 3.0;
        cCtx.beginPath(); cCtx.moveTo(cx, cy); cCtx.lineTo(cx + len, cy + dy); cCtx.stroke();
        bCtx.beginPath(); bCtx.moveTo(cx, cy); bCtx.lineTo(cx + len, cy + dy); bCtx.stroke();
        rCtx.beginPath(); rCtx.moveTo(cx, cy); rCtx.lineTo(cx + len, cy + dy); rCtx.stroke();
      }
    }

    cCtx.fillStyle = 'rgba(26, 12, 4, 0.78)';
    cCtx.fillRect(0, y0, S, 7);
    bCtx.fillStyle = 'rgb(14, 14, 14)';
    bCtx.fillRect(0, y0, S, 9);
    rCtx.fillStyle = 'rgb(250, 250, 250)';
    rCtx.fillRect(0, y0, S, 9);

    [38, 512, 986].forEach((nx) => {
      [0.27, 0.73].forEach((nyFrac) => {
        const ny = y0 + plankH * nyFrac;
        cCtx.fillStyle = 'rgba(32, 20, 12, 0.84)';
        cCtx.beginPath(); cCtx.arc(nx, ny, 5.5, 0, Math.PI * 2); cCtx.fill();
        bCtx.fillStyle = 'rgb(235, 235, 235)';
        bCtx.beginPath(); bCtx.arc(nx, ny, 5.2, 0, Math.PI * 2); bCtx.fill();
        rCtx.fillStyle = 'rgb(95, 95, 95)';
        rCtx.beginPath(); rCtx.arc(nx, ny, 5.5, 0, Math.PI * 2); rCtx.fill();
      });
    });
  }

  applyPixelMicroDetail(cCtx, bCtx, rCtx, S, S, 188501, 14, 18, 12, 4);
  const normalCanvas = createNormalCanvasFromHeight(bumpCanvas, 2.2);
  return { colorCanvas, bumpCanvas, roughCanvas, normalCanvas };
}

// 3b. Takshingel (1024x1024: farge + bump/normal + roughness)
function createShingleRoofMaps() {
  const S = 1024;
  const rng = createSeededRng(2911);
  const colorCanvas = document.createElement('canvas');
  const bumpCanvas = document.createElement('canvas');
  const roughCanvas = document.createElement('canvas');
  colorCanvas.width = bumpCanvas.width = roughCanvas.width = S;
  colorCanvas.height = bumpCanvas.height = roughCanvas.height = S;
  const cCtx = colorCanvas.getContext('2d');
  const bCtx = bumpCanvas.getContext('2d');
  const rCtx = roughCanvas.getContext('2d');

  cCtx.fillStyle = '#3e2311';
  cCtx.fillRect(0, 0, S, S);
  bCtx.fillStyle = 'rgb(30,30,30)';
  bCtx.fillRect(0, 0, S, S);
  rCtx.fillStyle = 'rgb(246,246,246)';
  rCtx.fillRect(0, 0, S, S);

  const rows = 10;
  const cols = 10;
  const rh = S / rows;
  const cw = S / cols;
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (cw * 0.5);
    for (let c = -1; c <= cols; c++) {
      const x = c * cw + offset;
      const y = r * rh;
      const v = 86 + Math.floor((rng() - 0.5) * 34);
      cCtx.fillStyle = `rgb(${v + 26},${Math.floor(v * 0.70)},${Math.floor(v * 0.44)})`;
      cCtx.fillRect(x + 3, y + 3, cw - 6, rh - 9);
      cCtx.fillStyle = 'rgba(18, 8, 3, 0.68)';
      cCtx.fillRect(x, y + rh - 9, cw, 9);

      const grad = bCtx.createLinearGradient(0, y, 0, y + rh - 6);
      grad.addColorStop(0, 'rgb(102,102,102)');
      grad.addColorStop(0.85, 'rgb(218,218,218)');
      grad.addColorStop(1, 'rgb(24,24,24)');
      bCtx.fillStyle = grad;
      bCtx.fillRect(x + 3, y + 3, cw - 6, rh - 6);

      const rVal = 176 + Math.floor((rng() - 0.5) * 34);
      rCtx.fillStyle = `rgb(${rVal},${rVal},${rVal})`;
      rCtx.fillRect(x + 3, y + 3, cw - 6, rh - 9);
      rCtx.fillStyle = 'rgb(248,248,248)';
      rCtx.fillRect(x, y + rh - 9, cw, 9);
    }
  }

  applyPixelMicroDetail(cCtx, bCtx, rCtx, S, S, 291101, 14, 16, 12, 2);
  const normalCanvas = createNormalCanvasFromHeight(bumpCanvas, 2.35);
  return { colorCanvas, bumpCanvas, roughCanvas, normalCanvas };
}

// 3c. Ørkensand (1024x1024) med skarpe vindribber, glimmerkorn og småstein
function createDesertSandMaps() {
  const S = 1024;
  const rng = createSeededRng(4407);
  const colorCanvas = document.createElement('canvas');
  const bumpCanvas = document.createElement('canvas');
  const roughCanvas = document.createElement('canvas');
  colorCanvas.width = bumpCanvas.width = roughCanvas.width = S;
  colorCanvas.height = bumpCanvas.height = roughCanvas.height = S;

  const cCtx = colorCanvas.getContext('2d');
  const bCtx = bumpCanvas.getContext('2d');
  const rCtx = roughCanvas.getContext('2d');

  const cImg = cCtx.createImageData(S, S);
  const bImg = bCtx.createImageData(S, S);
  const rImg = rCtx.createImageData(S, S);
  const cd = cImg.data;
  const bd = bImg.data;
  const rd = rImg.data;

  const twoPiInvS = (Math.PI * 2) / S;
  const rowShift = new Float32Array(S);
  for (let x = 0; x < S; x++) {
    rowShift[x] = Math.sin(x * twoPiInvS * 3.0) * 1.45 + Math.cos(x * twoPiInvS * 7.0) * 0.45;
  }

  let s = 440713 >>> 0;
  for (let y = 0; y < S; y++) {
    const yPhase = y * twoPiInvS * 14.0;
    const ySub = y * twoPiInvS * 28.0;
    const rowOff = y * S;
    for (let x = 0; x < S; x++) {
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      const grain = ((s & 255) - 128) * 0.0078125;
      const rawSin = Math.sin(yPhase + rowShift[x]);
      const asymmetric = rawSin + 0.28 * Math.sin(2.0 * (yPhase + rowShift[x]) + 0.6);
      const wave = 0.5 + 0.42 * asymmetric + 0.08 * Math.sin(ySub + x * twoPiInvS * 5.0);

      let cr = 216 + (wave - 0.5) * 42 + grain * 15;
      let cg = 165 + (wave - 0.5) * 34 + grain * 12;
      let cb = 104 + (wave - 0.5) * 24 + grain * 10;

      const isSparkle = (s & 1023) < 6;
      if (isSparkle) {
        cr += 28;
        cg += 24;
        cb += 16;
      }

      const idx = (rowOff + x) << 2;
      cd[idx] = cr < 0 ? 0 : (cr > 255 ? 255 : cr | 0);
      cd[idx + 1] = cg < 0 ? 0 : (cg > 255 ? 255 : cg | 0);
      cd[idx + 2] = cb < 0 ? 0 : (cb > 255 ? 255 : cb | 0);
      cd[idx + 3] = 255;

      const bv = Math.max(0, Math.min(255, (64 + wave * 136 + grain * 24) | 0));
      bd[idx] = bd[idx + 1] = bd[idx + 2] = bv;
      bd[idx + 3] = 255;

      const rv = isSparkle ? 105 : Math.max(135, Math.min(248, (234 - wave * 36 + grain * 18) | 0));
      rd[idx] = rd[idx + 1] = rd[idx + 2] = rv;
      rd[idx + 3] = 255;
    }
  }

  cCtx.putImageData(cImg, 0, 0);
  bCtx.putImageData(bImg, 0, 0);
  rCtx.putImageData(rImg, 0, 0);

  for (let p = 0; p < 180; p++) {
    const px = 12 + rng() * (S - 24);
    const py = 12 + rng() * (S - 24);
    const rx = 3.2 + rng() * 7.5;
    const ry = 2.4 + rng() * 5.2;
    const rot = rng() * Math.PI;
    cCtx.fillStyle = rng() > 0.45 ? 'rgba(122, 88, 56, 0.62)' : 'rgba(166, 126, 86, 0.56)';
    cCtx.beginPath(); cCtx.ellipse(px, py, rx, ry, rot, 0, Math.PI * 2); cCtx.fill();

    bCtx.fillStyle = 'rgb(236,236,236)';
    bCtx.beginPath(); bCtx.ellipse(px, py, rx, ry, rot, 0, Math.PI * 2); bCtx.fill();

    rCtx.fillStyle = 'rgb(152,152,152)';
    rCtx.beginPath(); rCtx.ellipse(px, py, rx, ry, rot, 0, Math.PI * 2); rCtx.fill();
  }

  const normalCanvas = createNormalCanvasFromHeight(bumpCanvas, 2.0);
  return { colorCanvas, bumpCanvas, roughCanvas, normalCanvas };
}

// 3d. Ru lagdelt sandstein (1024x1024) til klipper, Monument Valley-mesas og steiner
function createSandstoneMaps() {
  const S = 1024;
  const rng = createSeededRng(7719);
  const colorCanvas = document.createElement('canvas');
  const bumpCanvas = document.createElement('canvas');
  const roughCanvas = document.createElement('canvas');
  colorCanvas.width = bumpCanvas.width = roughCanvas.width = S;
  colorCanvas.height = bumpCanvas.height = roughCanvas.height = S;

  const cCtx = colorCanvas.getContext('2d');
  const bCtx = bumpCanvas.getContext('2d');
  const rCtx = roughCanvas.getContext('2d');

  cCtx.fillStyle = '#c2784e';
  cCtx.fillRect(0, 0, S, S);
  bCtx.fillStyle = 'rgb(138,138,138)';
  bCtx.fillRect(0, 0, S, S);
  rCtx.fillStyle = 'rgb(212,212,212)';
  rCtx.fillRect(0, 0, S, S);

  for (let y = 0; y < S; y += 8) {
    const strata = Math.sin((y / S) * Math.PI * 14) * 22 + Math.cos((y / S) * Math.PI * 32) * 10 + (rng() - 0.5) * 14;
    const r = Math.min(255, Math.max(82, 196 + strata));
    const g = Math.min(255, Math.max(54, 122 + strata * 0.68));
    const b = Math.min(255, Math.max(38, 84 + strata * 0.46));
    cCtx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},0.65)`;
    cCtx.fillRect(0, y, S, 8);

    const ledge = Math.min(245, Math.max(35, 138 + strata * 2.1));
    bCtx.fillStyle = `rgb(${ledge | 0},${ledge | 0},${ledge | 0})`;
    bCtx.fillRect(0, y, S, 8);

    const rBand = Math.min(245, Math.max(150, 206 - strata * 0.9));
    rCtx.fillStyle = `rgb(${rBand | 0},${rBand | 0},${rBand | 0})`;
    rCtx.fillRect(0, y, S, 8);
  }

  for (let c = 0; c < 48; c++) {
    let cx = rng() * S;
    let cy = rng() * S;
    cCtx.strokeStyle = 'rgba(48, 26, 15, 0.52)';
    bCtx.strokeStyle = 'rgba(15, 15, 15, 0.92)';
    rCtx.strokeStyle = 'rgba(250, 250, 250, 0.8)';
    cCtx.lineWidth = bCtx.lineWidth = 3.2;
    cCtx.beginPath(); cCtx.moveTo(cx, cy);
    bCtx.beginPath(); bCtx.moveTo(cx, cy);
    rCtx.beginPath(); rCtx.moveTo(cx, cy);
    for (let seg = 0; seg < 6; seg++) {
      cx += (rng() - 0.35) * 65;
      cy += (rng() - 0.45) * 58;
      cCtx.lineTo(cx, cy);
      bCtx.lineTo(cx, cy);
      rCtx.lineTo(cx, cy);
    }
    cCtx.stroke();
    bCtx.stroke();
    rCtx.stroke();
  }

  applyPixelMicroDetail(cCtx, bCtx, rCtx, S, S, 771901, 20, 26, 16, 1);
  const normalCanvas = createNormalCanvasFromHeight(bumpCanvas, 2.5);
  return { colorCanvas, bumpCanvas, roughCanvas, normalCanvas };
}

// 3e. Trebark og løvverk (1024x1024: farge + bump/normal + roughness)
function createTreeBarkMaps() {
  const S = 1024;
  const rng = createSeededRng(9013);
  const colorCanvas = document.createElement('canvas');
  const bumpCanvas = document.createElement('canvas');
  const roughCanvas = document.createElement('canvas');
  colorCanvas.width = bumpCanvas.width = roughCanvas.width = S;
  colorCanvas.height = bumpCanvas.height = roughCanvas.height = S;

  const cCtx = colorCanvas.getContext('2d');
  const bCtx = bumpCanvas.getContext('2d');
  const rCtx = roughCanvas.getContext('2d');

  cCtx.fillStyle = '#6b4323';
  cCtx.fillRect(0, 0, S, S);
  bCtx.fillStyle = 'rgb(148,148,148)';
  bCtx.fillRect(0, 0, S, S);
  rCtx.fillStyle = 'rgb(224,224,224)';
  rCtx.fillRect(0, 0, S, S);

  for (let x = 0; x < S; x += 8) {
    const ridge = Math.sin((x / S) * Math.PI * 24) * 0.5 + 0.5;
    const dark = rng() > 0.48;
    cCtx.fillStyle = dark ? 'rgba(38, 20, 8, 0.44)' : 'rgba(154, 106, 62, 0.30)';
    cCtx.fillRect(x, 0, 8, S);
    const bv = Math.floor(65 + ridge * 145 + (dark ? -25 : 20));
    bCtx.fillStyle = `rgb(${bv},${bv},${bv})`;
    bCtx.fillRect(x, 0, 8, S);
    const rv = Math.max(150, Math.min(250, Math.floor(236 - ridge * 48)));
    rCtx.fillStyle = `rgb(${rv},${rv},${rv})`;
    rCtx.fillRect(x, 0, 8, S);
  }
  for (let f = 0; f < 220; f++) {
    const fx = rng() * S;
    const fy = rng() * S;
    const len = 48 + rng() * 96;
    const dx = (rng() - 0.5) * 14;
    cCtx.strokeStyle = 'rgba(24, 12, 4, 0.65)';
    bCtx.strokeStyle = 'rgba(12, 12, 12, 0.92)';
    rCtx.strokeStyle = 'rgba(250, 250, 250, 0.85)';
    cCtx.lineWidth = bCtx.lineWidth = 3.5;
    cCtx.beginPath(); cCtx.moveTo(fx, fy); cCtx.lineTo(fx + dx, fy + len); cCtx.stroke();
    bCtx.beginPath(); bCtx.moveTo(fx, fy); bCtx.lineTo(fx + dx, fy + len); bCtx.stroke();
    rCtx.beginPath(); rCtx.moveTo(fx, fy); rCtx.lineTo(fx + dx, fy + len); rCtx.stroke();
  }

  applyPixelMicroDetail(cCtx, bCtx, rCtx, S, S, 901301, 16, 22, 14, 1);
  const normalCanvas = createNormalCanvasFromHeight(bumpCanvas, 2.5);
  return { colorCanvas, bumpCanvas, roughCanvas, normalCanvas };
}

function createFoliageMaps() {
  const S = 1024;
  const rng = createSeededRng(6151);
  const colorCanvas = document.createElement('canvas');
  const bumpCanvas = document.createElement('canvas');
  const roughCanvas = document.createElement('canvas');
  colorCanvas.width = bumpCanvas.width = roughCanvas.width = S;
  colorCanvas.height = bumpCanvas.height = roughCanvas.height = S;
  const cCtx = colorCanvas.getContext('2d');
  const bCtx = bumpCanvas.getContext('2d');
  const rCtx = roughCanvas.getContext('2d');

  cCtx.fillStyle = '#346d33';
  cCtx.fillRect(0, 0, S, S);
  bCtx.fillStyle = 'rgb(110,110,110)';
  bCtx.fillRect(0, 0, S, S);
  rCtx.fillStyle = 'rgb(214,214,214)';
  rCtx.fillRect(0, 0, S, S);

  for (let i = 0; i < 1100; i++) {
    const x = rng() * S;
    const y = rng() * S;
    const rad = 10 + rng() * 28;
    const pick = rng();
    if (pick < 0.34) {
      cCtx.fillStyle = 'rgba(22, 56, 24, 0.48)';
      bCtx.fillStyle = 'rgba(55, 55, 55, 0.55)';
      rCtx.fillStyle = 'rgba(242, 242, 242, 0.55)';
    } else if (pick < 0.74) {
      cCtx.fillStyle = 'rgba(68, 132, 58, 0.40)';
      bCtx.fillStyle = 'rgba(165, 165, 165, 0.5)';
      rCtx.fillStyle = 'rgba(196, 196, 196, 0.5)';
    } else {
      cCtx.fillStyle = 'rgba(118, 172, 82, 0.30)';
      bCtx.fillStyle = 'rgba(225, 225, 225, 0.45)';
      rCtx.fillStyle = 'rgba(168, 168, 168, 0.45)';
    }
    cCtx.beginPath(); cCtx.arc(x, y, rad, 0, Math.PI * 2); cCtx.fill();
    bCtx.beginPath(); bCtx.arc(x, y, rad, 0, Math.PI * 2); bCtx.fill();
    rCtx.beginPath(); rCtx.arc(x, y, rad, 0, Math.PI * 2); rCtx.fill();
  }

  applyPixelMicroDetail(cCtx, bCtx, rCtx, S, S, 615101, 14, 18, 12, 1);
  const normalCanvas = createNormalCanvasFromHeight(bumpCanvas, 1.85);
  return { colorCanvas, bumpCanvas, roughCanvas, normalCanvas };
}

export function createSoftRadialGlowTexture(rCol, gCol, bCol) {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 1, 32, 32, 31);
  grad.addColorStop(0.0, `rgba(${rCol},${gCol},${bCol},1.0)`);
  grad.addColorStop(0.32, `rgba(${rCol},${gCol},${bCol},0.62)`);
  grad.addColorStop(0.7, `rgba(${rCol},${gCol},${bCol},0.16)`);
  grad.addColorStop(1.0, `rgba(${rCol},${gCol},${bCol},0.0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function initTexturesAndMaterials(maxAnisotropy) {
  function makeRepeatingTexture(canvas, repeatX = 1, repeatY = 1, isColor = true, flipY = true) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    tex.flipY = flipY;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.anisotropy = maxAnisotropy;
    return tex;
  }

  const woodMaps = createWeatheredWoodMaps();
  const shingleMaps = createShingleRoofMaps();
  const sandMaps = createDesertSandMaps();
  const sandstoneMaps = createSandstoneMaps();
  const barkMaps = createTreeBarkMaps();
  const foliageMaps = createFoliageMaps();

  // Delte teksturer (farge + normalMap + roughnessMap) for 72–90 FPS på Meta Quest
  const sharedWoodTex = makeRepeatingTexture(woodMaps.colorCanvas, 2, 2, true);
  const sharedWoodBumpTex = makeRepeatingTexture(woodMaps.bumpCanvas, 2, 2, false);
  const sharedWoodNormalTex = makeRepeatingTexture(woodMaps.normalCanvas, 2, 2, false);
  const sharedWoodRoughTex = makeRepeatingTexture(woodMaps.roughCanvas, 2, 2, false);

  const sharedRoofShingleTex = makeRepeatingTexture(shingleMaps.colorCanvas, 3, 2, true);
  const sharedShingleBumpTex = makeRepeatingTexture(shingleMaps.bumpCanvas, 3, 2, false);
  const sharedShingleNormalTex = makeRepeatingTexture(shingleMaps.normalCanvas, 3, 2, false);
  const sharedShingleRoughTex = makeRepeatingTexture(shingleMaps.roughCanvas, 3, 2, false);

  const sharedDesertSandTex = makeRepeatingTexture(sandMaps.colorCanvas, 62, 62, true);
  const sharedDesertSandBumpTex = makeRepeatingTexture(sandMaps.bumpCanvas, 62, 62, false);
  const sharedDesertSandNormalTex = makeRepeatingTexture(sandMaps.normalCanvas, 62, 62, false);
  const sharedDesertSandRoughTex = makeRepeatingTexture(sandMaps.roughCanvas, 62, 62, false);

  const sharedRoadSandTex = makeRepeatingTexture(sandMaps.colorCanvas, 3, 15, true);
  const sharedRoadBumpTex = makeRepeatingTexture(sandMaps.bumpCanvas, 3, 15, false);
  const sharedRoadNormalTex = makeRepeatingTexture(sandMaps.normalCanvas, 3, 15, false);
  const sharedRoadRoughTex = makeRepeatingTexture(sandMaps.roughCanvas, 3, 15, false);

  const sharedSandstoneTex = makeRepeatingTexture(sandstoneMaps.colorCanvas, 2, 2, true);
  const sharedSandstoneBumpTex = makeRepeatingTexture(sandstoneMaps.bumpCanvas, 2, 2, false);
  const sharedSandstoneNormalTex = makeRepeatingTexture(sandstoneMaps.normalCanvas, 2, 2, false);
  const sharedSandstoneRoughTex = makeRepeatingTexture(sandstoneMaps.roughCanvas, 2, 2, false);

  const sharedMesaTex = makeRepeatingTexture(sandstoneMaps.colorCanvas, 4, 3, true);
  const sharedMesaBumpTex = makeRepeatingTexture(sandstoneMaps.bumpCanvas, 4, 3, false);
  const sharedMesaNormalTex = makeRepeatingTexture(sandstoneMaps.normalCanvas, 4, 3, false);
  const sharedMesaRoughTex = makeRepeatingTexture(sandstoneMaps.roughCanvas, 4, 3, false);

  const sharedBarkTex = makeRepeatingTexture(barkMaps.colorCanvas, 2, 2, true);
  const sharedBarkBumpTex = makeRepeatingTexture(barkMaps.bumpCanvas, 2, 2, false);
  const sharedBarkNormalTex = makeRepeatingTexture(barkMaps.normalCanvas, 2, 2, false);
  const sharedBarkRoughTex = makeRepeatingTexture(barkMaps.roughCanvas, 2, 2, false);

  const sharedFoliageTex = makeRepeatingTexture(foliageMaps.colorCanvas, 2, 2, true);
  const sharedFoliageBumpTex = makeRepeatingTexture(foliageMaps.bumpCanvas, 2, 2, false);
  const sharedFoliageNormalTex = makeRepeatingTexture(foliageMaps.normalCanvas, 2, 2, false);
  const sharedFoliageRoughTex = makeRepeatingTexture(foliageMaps.roughCanvas, 2, 2, false);

  // Dedikerte glTF-teksturer (flipY = false) til .glb-arkitektur og våpenskjefte
  const gltfWoodNormalTex = makeRepeatingTexture(woodMaps.normalCanvas, 1.25, 1.25, false, false);
  const gltfWoodRoughTex = makeRepeatingTexture(woodMaps.roughCanvas, 1.25, 1.25, false, false);
  const gltfShingleNormalTex = makeRepeatingTexture(shingleMaps.normalCanvas, 1.6, 1.6, false, false);
  const gltfShingleRoughTex = makeRepeatingTexture(shingleMaps.roughCanvas, 1.6, 1.6, false, false);
  const gltfSandstoneNormalTex = makeRepeatingTexture(sandstoneMaps.normalCanvas, 1.35, 1.35, false, false);
  const gltfSandstoneRoughTex = makeRepeatingTexture(sandstoneMaps.roughCanvas, 1.35, 1.35, false, false);

  // Felles PBR-bygningsmaterialer med tangent-rom normalMap, roughnessMap og ekte miljørefleksjoner
  const woodWallMat = new THREE.MeshStandardMaterial({
    color: 0xb67847,
    map: sharedWoodTex,
    normalMap: sharedWoodNormalTex,
    normalScale: new THREE.Vector2(0.75, 0.75),
    roughnessMap: sharedWoodRoughTex,
    roughness: 0.84,
    metalness: 0.03
  });
  const lightWoodMat = new THREE.MeshStandardMaterial({
    color: 0xcf925c,
    map: sharedWoodTex,
    normalMap: sharedWoodNormalTex,
    normalScale: new THREE.Vector2(0.65, 0.65),
    roughnessMap: sharedWoodRoughTex,
    roughness: 0.78,
    metalness: 0.04
  });
  const darkWoodMat = new THREE.MeshStandardMaterial({
    color: 0x673d20,
    map: sharedWoodTex,
    normalMap: sharedWoodNormalTex,
    normalScale: new THREE.Vector2(0.82, 0.82),
    roughnessMap: sharedWoodRoughTex,
    roughness: 0.82,
    metalness: 0.05
  });
  const weatheredPlankMatA = new THREE.MeshStandardMaterial({
    color: 0xa4683b,
    map: sharedWoodTex,
    normalMap: sharedWoodNormalTex,
    normalScale: new THREE.Vector2(0.92, 0.92),
    roughnessMap: sharedWoodRoughTex,
    roughness: 0.88,
    metalness: 0.02
  });
  const weatheredPlankMatB = new THREE.MeshStandardMaterial({
    color: 0xc58955,
    map: sharedWoodTex,
    normalMap: sharedWoodNormalTex,
    normalScale: new THREE.Vector2(0.84, 0.84),
    roughnessMap: sharedWoodRoughTex,
    roughness: 0.84,
    metalness: 0.03
  });
  const shutterWoodMat = new THREE.MeshStandardMaterial({
    color: 0x4b5d46,
    map: sharedWoodTex,
    normalMap: sharedWoodNormalTex,
    normalScale: new THREE.Vector2(0.68, 0.68),
    roughnessMap: sharedWoodRoughTex,
    roughness: 0.8,
    metalness: 0.04
  });
  const logTimberMat = new THREE.MeshStandardMaterial({
    color: 0x8d5932,
    map: sharedBarkTex,
    normalMap: sharedBarkNormalTex,
    normalScale: new THREE.Vector2(0.95, 0.95),
    roughnessMap: sharedBarkRoughTex,
    roughness: 0.88,
    metalness: 0.02
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x693f22,
    map: sharedRoofShingleTex,
    normalMap: sharedShingleNormalTex,
    normalScale: new THREE.Vector2(0.92, 0.92),
    roughnessMap: sharedShingleRoughTex,
    roughness: 0.86,
    metalness: 0.03
  });
  const wroughtIronMat = new THREE.MeshStandardMaterial({
    color: 0x2c3035,
    metalness: 0.84,
    roughness: 0.34,
    envMapIntensity: 1.15
  });
  const polishedBrassMat = new THREE.MeshStandardMaterial({
    color: 0xe4b658,
    metalness: 0.88,
    roughness: 0.22,
    envMapIntensity: 1.25
  });
  const stonePlinthMat = new THREE.MeshStandardMaterial({
    color: 0x9c8570,
    map: sharedSandstoneTex,
    normalMap: sharedSandstoneNormalTex,
    normalScale: new THREE.Vector2(0.98, 0.98),
    roughnessMap: sharedSandstoneRoughTex,
    roughness: 0.9,
    metalness: 0.02
  });
  // Ekte reflekterende vindusglass om dagen som gløder varmt innenfra om natten
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0x526574,
    emissive: 0xffb347,
    emissiveIntensity: 0.18,
    roughness: 0.1,
    metalness: 0.22,
    envMapIntensity: 1.35
  });
  const darkInteriorMat = new THREE.MeshBasicMaterial({ color: 0x160c05 });

  const sharedParticleGlowTex = createSoftRadialGlowTexture(255, 240, 200);
  const sharedRedEyeGlowTex = createSoftRadialGlowTexture(255, 38, 38);
  const sharedSparkGlowTex = createSoftRadialGlowTexture(255, 215, 95);

  // Grafikk 3.0: én delt myk radial kontaktsygge-tekstur (CanvasTexture) for alle figurer, dyr, trær, tønner og gravsteiner
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 64;
  shadowCanvas.height = 64;
  {
    const sCtx = shadowCanvas.getContext('2d');
    const sGrad = sCtx.createRadialGradient(32, 32, 2, 32, 32, 31);
    sGrad.addColorStop(0.0, 'rgba(12, 7, 4, 0.68)');
    sGrad.addColorStop(0.45, 'rgba(14, 8, 4, 0.42)');
    sGrad.addColorStop(0.78, 'rgba(16, 9, 5, 0.14)');
    sGrad.addColorStop(1.0, 'rgba(16, 9, 5, 0.0)');
    sCtx.fillStyle = sGrad;
    sCtx.fillRect(0, 0, 64, 64);
  }
  const sharedContactShadowTex = new THREE.CanvasTexture(shadowCanvas);
  sharedContactShadowTex.colorSpace = THREE.SRGBColorSpace;

  const sharedContactShadowMat = new THREE.MeshBasicMaterial({
    map: sharedContactShadowTex,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -2
  });
  const sharedContactShadowGeo = new THREE.PlaneGeometry(1, 1);
  sharedContactShadowGeo.rotateX(-Math.PI / 2);

  function createContactShadow(radiusX = 0.65, radiusZ = radiusX, yOffset = 0.026) {
    const mesh = new THREE.Mesh(sharedContactShadowGeo, sharedContactShadowMat);
    mesh.scale.set(radiusX * 2, 1, radiusZ * 2);
    mesh.position.y = yOffset;
    mesh.renderOrder = 1;
    return mesh;
  }

  // Delt myk røyksky-tekstur til kruttrøyk og tåke på Boot Hill
  const smokeCanvas = document.createElement('canvas');
  smokeCanvas.width = 64;
  smokeCanvas.height = 64;
  {
    const smCtx = smokeCanvas.getContext('2d');
    const smGrad = smCtx.createRadialGradient(32, 32, 2, 32, 32, 30);
    smGrad.addColorStop(0.0, 'rgba(232, 224, 212, 0.85)');
    smGrad.addColorStop(0.45, 'rgba(196, 186, 174, 0.46)');
    smGrad.addColorStop(0.8, 'rgba(155, 146, 138, 0.14)');
    smGrad.addColorStop(1.0, 'rgba(155, 146, 138, 0.0)');
    smCtx.fillStyle = smGrad;
    smCtx.fillRect(0, 0, 64, 64);
  }
  const sharedSmokePuffTex = new THREE.CanvasTexture(smokeCanvas);
  sharedSmokePuffTex.colorSpace = THREE.SRGBColorSpace;

  // Volumetrisk lysstråle-tekstur (God Rays) med myk vertikal og horisontal avtoning
  const rayCanvas = document.createElement('canvas');
  rayCanvas.width = 64;
  rayCanvas.height = 128;
  {
    const rCtx = rayCanvas.getContext('2d');
    const vGrad = rCtx.createLinearGradient(0, 0, 0, 128);
    vGrad.addColorStop(0.0, 'rgba(255, 240, 200, 0.0)');
    vGrad.addColorStop(0.18, 'rgba(255, 240, 200, 0.85)');
    vGrad.addColorStop(0.65, 'rgba(255, 228, 175, 0.36)');
    vGrad.addColorStop(1.0, 'rgba(255, 220, 160, 0.0)');
    rCtx.fillStyle = vGrad;
    rCtx.fillRect(0, 0, 64, 128);
    rCtx.globalCompositeOperation = 'destination-in';
    const hGrad = rCtx.createLinearGradient(0, 0, 64, 0);
    hGrad.addColorStop(0.0, 'rgba(0,0,0,0)');
    hGrad.addColorStop(0.5, 'rgba(0,0,0,1)');
    hGrad.addColorStop(1.0, 'rgba(0,0,0,0)');
    rCtx.fillStyle = hGrad;
    rCtx.fillRect(0, 0, 64, 128);
    rCtx.globalCompositeOperation = 'source-over';
  }
  const sharedGodRayTex = new THREE.CanvasTexture(rayCanvas);
  sharedGodRayTex.colorSpace = THREE.SRGBColorSpace;

  // Delte region-materialer for Crimson Canyon (rød sandstein) og Boot Hill Kapell (mørk forvitret granitt)
  const crimsonRockMat = new THREE.MeshStandardMaterial({
    color: 0xb8462c,
    map: sharedSandstoneTex,
    normalMap: sharedSandstoneNormalTex,
    normalScale: new THREE.Vector2(1.25, 1.25),
    roughnessMap: sharedSandstoneRoughTex,
    roughness: 0.88,
    metalness: 0.03
  });
  const darkGraveStoneMat = new THREE.MeshStandardMaterial({
    color: 0x5c5b63,
    map: sharedSandstoneTex,
    normalMap: sharedSandstoneNormalTex,
    normalScale: new THREE.Vector2(1.05, 1.05),
    roughnessMap: sharedSandstoneRoughTex,
    roughness: 0.9,
    metalness: 0.04
  });

  return {
    sharedWoodTex, sharedWoodBumpTex, sharedWoodNormalTex, sharedWoodRoughTex,
    sharedRoofShingleTex, sharedShingleBumpTex, sharedShingleNormalTex, sharedShingleRoughTex,
    sharedDesertSandTex, sharedDesertSandBumpTex, sharedDesertSandNormalTex, sharedDesertSandRoughTex,
    sharedRoadSandTex, sharedRoadBumpTex, sharedRoadNormalTex, sharedRoadRoughTex,
    sharedSandstoneTex, sharedSandstoneBumpTex, sharedSandstoneNormalTex, sharedSandstoneRoughTex,
    sharedMesaTex, sharedMesaBumpTex, sharedMesaNormalTex, sharedMesaRoughTex,
    sharedBarkTex, sharedBarkBumpTex, sharedBarkNormalTex, sharedBarkRoughTex,
    sharedFoliageTex, sharedFoliageBumpTex, sharedFoliageNormalTex, sharedFoliageRoughTex,
    gltfWoodNormalTex, gltfWoodRoughTex,
    gltfShingleNormalTex, gltfShingleRoughTex,
    gltfSandstoneNormalTex, gltfSandstoneRoughTex,
    woodWallMat, lightWoodMat, darkWoodMat,
    weatheredPlankMatA, weatheredPlankMatB, shutterWoodMat,
    logTimberMat, roofMat, wroughtIronMat, polishedBrassMat,
    stonePlinthMat, crimsonRockMat, darkGraveStoneMat, windowMat, darkInteriorMat,
    sharedParticleGlowTex, sharedRedEyeGlowTex, sharedSparkGlowTex,
    sharedContactShadowTex, sharedContactShadowMat, createContactShadow,
    sharedSmokePuffTex, sharedGodRayTex
  };
}
