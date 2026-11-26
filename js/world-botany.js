import * as THREE from 'three';
import { createSeededRng } from './textures.js';

export function createWorldBotanyAndWildlife(ctx) {
  const {
    M, scene, forestGroup, graveyardGroup, proceduralTreeGroups, proceduralDeadTreeGroups,
    treeCoords, bootHillDeadTreeCoords, clearFallbackGrass,
    getTerrainBaseHeight, applyWindSwayShader, createContactShadow,
    millWheelPivot, astrolabeOuterRing, astrolabeInnerRing
  } = ctx;
  // =========================================================================
  // 6f. BOTANISKE PBR-TRÆR, BUSKER, GRESS/BREGNER & LEVENDE SMÅVILT (.glb)
  // =========================================================================
  const ambientVultures = [];
  const ambientRavens = [];
  const ambientRabbits = [];
  const ambientFish = [];

  function mirrorGeometryX(srcGeo) {
    const geo = srcGeo.clone();
    const pos = geo.attributes.position;
    if (pos) {
      for (let i = 0; i < pos.count; i++) {
        pos.setX(i, -pos.getX(i));
      }
    }
    const norm = geo.attributes.normal;
    if (norm) {
      for (let i = 0; i < norm.count; i++) {
        norm.setX(i, -norm.getX(i));
      }
    }
    if (geo.index) {
      const idx = geo.index.array;
      for (let i = 0; i + 2 < idx.length; i += 3) {
        const tmp = idx[i + 1];
        idx[i + 1] = idx[i + 2];
        idx[i + 2] = tmp;
      }
      geo.index.needsUpdate = true;
    }
    return geo;
  }

  function prepareBotanicalMaterial(origMat, opts = {}) {
    const mat = origMat.clone();
    const maxAniso = M.maxAnisotropy || 8;
    if (mat.map) {
      mat.map.colorSpace = THREE.SRGBColorSpace;
      mat.map.anisotropy = maxAniso;
    }
    if (mat.normalMap) {
      mat.normalMap.colorSpace = THREE.LinearSRGBColorSpace;
      mat.normalMap.anisotropy = maxAniso;
    }
    mat.flatShading = false;
    mat.metalness = 0.0;
    mat.roughness = opts.roughness ?? 0.88;
    mat.envMapIntensity = opts.envMapIntensity ?? 0.34;
    if (opts.vertexColors !== false) {
      mat.vertexColors = true;
    }
    if (opts.alphaCutout) {
      mat.alphaTest = opts.alphaCutoff ?? 0.38;
      mat.transparent = false;
      mat.side = THREE.DoubleSide;
    } else if (opts.doubleSided) {
      mat.side = THREE.DoubleSide;
    }
    if (opts.swayAmp && opts.swayAmp > 0) {
      applyWindSwayShader(mat, opts.swayAmp, opts.swayMinY ?? 0.05);
    }
    mat.needsUpdate = true;
    return mat;
  }

  function isClearForFlora(x, z) {
    // Hold Dustwood sentrum og bygningstomter rene
    if (Math.abs(x) < 22.5 && Math.abs(z) < 21.5) return false;
    // Hold hovedveiene (Nord-Sør og Øst-Vest) frie
    if (Math.abs(x) < 3.6 && z > -146 && z < 78) return false;
    if (Math.abs(z + 1.5) < 3.6 && Math.abs(x) < 132) return false;
    // Hold jernbanesporet og stasjonen i sør fri
    if (Math.abs(z - 75.0) < 4.8) return false;
    // Hold selve elveløpet og trebroen fri
    const creekZ = -78.0 + Math.sin(x * 0.065) * 3.6;
    if (Math.abs(z - creekZ) < 2.25) return false;
    if (Math.abs(x) < 4.6 && z > -85.5 && z < -70.5) return false;
    // Hold kapellgulvet på Boot Hill, gruveåpningen og de 4 nye hjørnelandemerkene fri for busker/trær
    if (x > -128 && x < -112 && Math.abs(z + 1.5) < 8.5) return false;
    if (x > 113 && x < 138 && Math.abs(z + 1.5) < 9.5) return false;
    if (Math.hypot(x + 142, z + 138) < 11.5) return false;
    if (Math.abs(x - 140) < 13.5 && Math.abs(z + 132) < 12.5) return false;
    if (Math.abs(x - 140) < 14.5 && Math.abs(z - 136) < 11.5) return false;
    if (Math.hypot(x + 140, z - 136) < 14.5) return false;
    if (Math.hypot(x + 6, z - 168) < 15.0) return false;
    if (Math.abs(x - 2) < 13.0 && Math.abs(z + 176) < 12.0) return false;
    if (Math.hypot(x - 176, z - 62) < 14.5) return false;
    if (Math.hypot(x + 176, z + 68) < 13.5) return false;
    return true;
  }

  function mountWorldBotanicalAndWildlifeAssets(assets) {
    if (!assets) return;
    const dummy = new THREE.Object3D();
    const tmpCol = new THREE.Color();

    // 1. Ekte botaniske furu-, eike-, bøke- og døde trær (assets/trees.glb)
    if (assets.trees && assets.trees.scene) {
      for (let i = 0; i < proceduralTreeGroups.length; i++) {
        forestGroup.remove(proceduralTreeGroups[i]);
      }
      proceduralTreeGroups.length = 0;

      for (let i = 0; i < proceduralDeadTreeGroups.length; i++) {
        graveyardGroup.remove(proceduralDeadTreeGroups[i]);
      }
      proceduralDeadTreeGroups.length = 0;

      const treeMatCache = new Map();
      const getTreeMat = (m) => {
        if (treeMatCache.has(m)) return treeMatCache.get(m);
        const mName = (m.name || '').toLowerCase();
        const isCanopy = mName.includes('canopy');
        const up = prepareBotanicalMaterial(m, {
          alphaCutout: isCanopy,
          alphaCutoff: 0.40,
          roughness: isCanopy ? 0.86 : 0.92,
          envMapIntensity: isCanopy ? 0.36 : 0.30,
          swayAmp: isCanopy ? 0.085 : 0.0,
          swayMinY: 1.35
        });
        treeMatCache.set(m, up);
        return up;
      };

      const extractTreeParts = (nodeName) => {
        const rootNode = assets.trees.scene.getObjectByName(nodeName);
        if (!rootNode) return null;
        const parts = [];
        rootNode.traverse((n) => {
          if (n.isMesh && n.geometry && n.material) {
            const mName = (n.material.name || '').toLowerCase();
            parts.push({
              geometry: n.geometry,
              material: getTreeMat(n.material),
              isCanopy: mName.includes('canopy')
            });
          }
        });
        return parts.length > 0 ? parts : null;
      };

      const liveTemplates = [
        extractTreeParts('pine_a_lod0'),
        extractTreeParts('pine_b_lod0'),
        extractTreeParts('oak_a_lod0'),
        extractTreeParts('pine_c_lod0'),
        extractTreeParts('oak_b_lod0'),
        extractTreeParts('beech_a_lod0')
      ].filter(Boolean);

      if (liveTemplates.length > 0) {
        const extraWoodsRng = createSeededRng(7719);
        const allTreePlacements = treeCoords.map(([x, z, s], idx) => ({
          x,
          z,
          s: s * 1.02,
          rotY: (idx * 1.93) % (Math.PI * 2),
          tplIdx: idx % liveTemplates.length
        }));

        // Legg til ekstra skogbryn- og elvebreddstrær i Whispering Woods uten å blokkere veien
        for (let i = 0; i < 90 && allTreePlacements.length < 82; i++) {
          const tx = (extraWoodsRng() - 0.5) * 88;
          const tz = -27 - extraWoodsRng() * 116;
          if (!isClearForFlora(tx, tz) || Math.abs(tx) < 5.6) continue;
          let tooClose = false;
          for (let j = 0; j < allTreePlacements.length; j++) {
            const dx = tx - allTreePlacements[j].x;
            const dz = tz - allTreePlacements[j].z;
            if (dx * dx + dz * dz < 34.0) {
              tooClose = true;
              break;
            }
          }
          if (tooClose) continue;
          allTreePlacements.push({
            x: tx,
            z: tz,
            s: 1.08 + extraWoodsRng() * 0.48,
            rotY: extraWoodsRng() * Math.PI * 2,
            tplIdx: allTreePlacements.length % liveTemplates.length
          });
        }

        // Legg til høyreiste furutrær rundt NV Silverpine Peak uten ekstra draw calls (samme InstancedMesh!)
        for (let spIdx = 0; spIdx < 28; spIdx++) {
          const ang = (spIdx / 28) * Math.PI * 2 + extraWoodsRng() * 0.22;
          const rad = 14.5 + extraWoodsRng() * 34.0;
          const sx = -142.0 + Math.cos(ang) * rad;
          const sz = -138.0 + Math.sin(ang) * rad;
          if (sx < -202 || sz < -202 || !isClearForFlora(sx, sz)) continue;
          allTreePlacements.push({
            x: sx,
            z: sz,
            s: 1.22 + extraWoodsRng() * 0.52,
            rotY: extraWoodsRng() * Math.PI * 2,
            tplIdx: 0
          });
        }

        for (let t = 0; t < liveTemplates.length; t++) {
          const bucket = allTreePlacements.filter((p) => p.tplIdx === t);
          if (bucket.length === 0) continue;
          const parts = liveTemplates[t];
          for (let pIdx = 0; pIdx < parts.length; pIdx++) {
            const part = parts[pIdx];
            const inst = new THREE.InstancedMesh(part.geometry, part.material, bucket.length);
            // Stammen kaster skarp skygge + bakke-kontaktsygge under kronen; unngå dyr alpha-discard i skyggekartet på trekronen!
            inst.castShadow = !part.isCanopy;
            inst.receiveShadow = true;
            for (let i = 0; i < bucket.length; i++) {
              const b = bucket[i];
              const ty = getTerrainBaseHeight(b.x, b.z) - 0.05;
              dummy.position.set(b.x, ty, b.z);
              dummy.rotation.set(0, b.rotY, 0);
              dummy.scale.setScalar(b.s);
              dummy.updateMatrix();
              inst.setMatrixAt(i, dummy.matrix);
              if (part.isCanopy) {
                const vTint = 0.90 + ((i * 37) % 19) * 0.01;
                tmpCol.setRGB(vTint * 0.96, vTint * 1.03, vTint * 0.92);
                inst.setColorAt(i, tmpCol);
              }
            }
            inst.instanceMatrix.needsUpdate = true;
            if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
            forestGroup.add(inst);
          }
          if (createContactShadow) {
            for (let i = 0; i < bucket.length; i++) {
              const b = bucket[i];
              if (b.z < -95) continue;
              const sh = createContactShadow(1.45 * b.s, 1.45 * b.s, 0.05);
              sh.position.set(b.x, getTerrainBaseHeight(b.x, b.z) + 0.02, b.z);
              forestGroup.add(sh);
            }
          }
        }
      }

      const deadParts = extractTreeParts('dead_a_lod0');
      if (deadParts) {
        const canyonSnags = [
          [48, -15, 1.05], [64, 14, 1.18], [82, -17, 1.12], [98, 16, 1.24],
          [112, -16, 1.15], [-46, 14, 0.96], [-58, -15, 1.08], [38, 28, 1.02],
          [122, 122, 1.14], [156, 124, 1.20], [124, 152, 1.08], [158, 150, 1.18],
          [122, -118, 1.06], [158, -148, 1.16]
        ];
        const snagPlacements = [
          ...bootHillDeadTreeCoords.map(([dx, dz], idx) => ({
            x: dx,
            z: dz,
            s: 1.02 + (idx % 3) * 0.14,
            rotY: idx * 1.37
          })),
          ...canyonSnags.map(([dx, dz, ds], idx) => ({
            x: dx,
            z: dz,
            s: ds,
            rotY: idx * 2.11 + 0.6
          }))
        ];
        for (let pIdx = 0; pIdx < deadParts.length; pIdx++) {
          const part = deadParts[pIdx];
          const inst = new THREE.InstancedMesh(part.geometry, part.material, snagPlacements.length);
          inst.castShadow = true;
          inst.receiveShadow = true;
          for (let i = 0; i < snagPlacements.length; i++) {
            const sp = snagPlacements[i];
            dummy.position.set(sp.x, getTerrainBaseHeight(sp.x, sp.z) - 0.04, sp.z);
            dummy.rotation.set(0, sp.rotY, ((i % 2) * 2 - 1) * 0.04);
            dummy.scale.setScalar(sp.s);
            dummy.updateMatrix();
            inst.setMatrixAt(i, dummy.matrix);
          }
          inst.instanceMatrix.needsUpdate = true;
          graveyardGroup.add(inst);
        }
      }
    }

    // 2. Fotogrammetri-busker (assets/shrubs.glb) i ørken, veikant, canyon og skog
    if (assets.shrubs && assets.shrubs.scene) {
      const bushNodes = ['bush_a_lod1', 'bush_b_lod1']
        .map((nm) => assets.shrubs.scene.getObjectByName(nm))
        .filter((n) => n && n.isMesh);
      if (bushNodes.length > 0) {
        const shrubMat = prepareBotanicalMaterial(bushNodes[0].material, {
          doubleSided: true,
          roughness: 0.88,
          envMapIntensity: 0.34,
          swayAmp: 0.045,
          swayMinY: 0.12
        });
        const sRng = createSeededRng(5183);
        for (let bIdx = 0; bIdx < bushNodes.length; bIdx++) {
          const maxCount = 64;
          const inst = new THREE.InstancedMesh(bushNodes[bIdx].geometry, shrubMat, maxCount);
          inst.castShadow = false;
          inst.receiveShadow = true;
          let placed = 0;
          for (let i = 0; i < 650 && placed < maxCount; i++) {
            const bx = (sRng() - 0.5) * 290;
            const bz = (sRng() - 0.5) * 290;
            if (!isClearForFlora(bx, bz)) continue;
            const by = getTerrainBaseHeight(bx, bz);
            dummy.position.set(bx, by - 0.04, bz);
            dummy.rotation.set((sRng() - 0.5) * 0.08, sRng() * Math.PI * 2, (sRng() - 0.5) * 0.08);
            const sc = (bz < -26 ? 0.92 : 0.72) + sRng() * 0.58;
            dummy.scale.set(sc, sc * (0.82 + sRng() * 0.34), sc);
            dummy.updateMatrix();
            inst.setMatrixAt(placed, dummy.matrix);
            if (bz < -26) {
              // Frodig skogsbusk i Whispering Woods
              tmpCol.setRGB(0.84 + sRng() * 0.16, 0.95 + sRng() * 0.12, 0.78 + sRng() * 0.14);
            } else if (bx < -42) {
              // Dempet aske-/olivengrønn krattbusk på Boot Hill
              tmpCol.setRGB(0.76 + sRng() * 0.12, 0.72 + sRng() * 0.12, 0.62 + sRng() * 0.10);
            } else {
              // Tørr western sagebrush / chaparral i ørken og Crimson Canyon
              tmpCol.setRGB(1.06 + sRng() * 0.14, 0.94 + sRng() * 0.12, 0.72 + sRng() * 0.10);
            }
            inst.setColorAt(placed, tmpCol);
            placed++;
          }
          inst.count = placed;
          inst.instanceMatrix.needsUpdate = true;
          if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
          scene.add(inst);
        }
      }
    }

    // 3. Ekte vindsusende 3D-gress, tørr præriegress, bregner og markblomster (assets/undergrowth.glb)
    if (assets.undergrowth && assets.undergrowth.scene) {
      if (clearFallbackGrass) clearFallbackGrass();

      let baseUnderMat = null;
      assets.undergrowth.scene.traverse((n) => {
        if (!baseUnderMat && n.isMesh && n.material) {
          baseUnderMat = prepareBotanicalMaterial(n.material, {
            alphaCutout: true,
            alphaCutoff: 0.36,
            roughness: 0.87,
            envMapIntensity: 0.34,
            swayAmp: 0.068,
            swayMinY: 0.04
          });
        }
      });

      const getUnderGeo = (nm) => {
        const n = assets.undergrowth.scene.getObjectByName(nm);
        return n && n.isMesh ? n.geometry : null;
      };

      if (baseUnderMat) {
        const uRng = createSeededRng(9047);

        // 3a. Tørt prærie- og ørkengress langs ørkendyner, veikanter, canyon og jernbane
        const prairieGeos = [getUnderGeo('grass_a'), getUnderGeo('stalks_a')].filter(Boolean);
        for (let gIdx = 0; gIdx < prairieGeos.length; gIdx++) {
          const maxCount = 480;
          const inst = new THREE.InstancedMesh(prairieGeos[gIdx], baseUnderMat, maxCount);
          inst.receiveShadow = true;
          let placed = 0;
          for (let i = 0; i < 2400 && placed < maxCount; i++) {
            const gx = (uRng() - 0.5) * 300;
            const gz = -24 + uRng() * 175;
            if (!isClearForFlora(gx, gz)) continue;
            const gy = getTerrainBaseHeight(gx, gz);
            dummy.position.set(gx, gy - 0.02, gz);
            dummy.rotation.set((uRng() - 0.5) * 0.12, uRng() * Math.PI * 2, (uRng() - 0.5) * 0.12);
            const sc = 1.15 + uRng() * 0.95;
            dummy.scale.set(sc, sc * (0.95 + uRng() * 0.55), sc);
            dummy.updateMatrix();
            inst.setMatrixAt(placed, dummy.matrix);
            // Solbleket gyllent præriegress (aldri knallgult plastgress!)
            tmpCol.setRGB(1.22 + uRng() * 0.18, 1.06 + uRng() * 0.14, 0.74 + uRng() * 0.12);
            inst.setColorAt(placed, tmpCol);
            placed++;
          }
          inst.count = placed;
          inst.instanceMatrix.needsUpdate = true;
          if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
          scene.add(inst);
        }

        // 3b. Frodig skoggress i Whispering Woods (nord, z: -24 til -145)
        const woodsGrassGeos = [getUnderGeo('lush_a'), getUnderGeo('grass_b')].filter(Boolean);
        for (let gIdx = 0; gIdx < woodsGrassGeos.length; gIdx++) {
          const maxCount = 450;
          const inst = new THREE.InstancedMesh(woodsGrassGeos[gIdx], baseUnderMat, maxCount);
          inst.receiveShadow = true;
          let placed = 0;
          for (let i = 0; i < 2200 && placed < maxCount; i++) {
            const gx = (uRng() - 0.5) * 96;
            const gz = -24.5 - uRng() * 120;
            if (!isClearForFlora(gx, gz)) continue;
            const gy = getTerrainBaseHeight(gx, gz);
            dummy.position.set(gx, gy - 0.02, gz);
            dummy.rotation.set((uRng() - 0.5) * 0.1, uRng() * Math.PI * 2, (uRng() - 0.5) * 0.1);
            const sc = 1.18 + uRng() * 0.85;
            dummy.scale.set(sc, sc * (0.95 + uRng() * 0.45), sc);
            dummy.updateMatrix();
            inst.setMatrixAt(placed, dummy.matrix);
            tmpCol.setRGB(0.84 + uRng() * 0.18, 1.02 + uRng() * 0.18, 0.78 + uRng() * 0.14);
            inst.setColorAt(placed, tmpCol);
            placed++;
          }
          inst.count = placed;
          inst.instanceMatrix.needsUpdate = true;
          if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
          forestGroup.add(inst);
        }

        // 3c. Ekte 3D skogsbregner (Poly Haven fern_02) i Whispering Woods og langs elvebredden
        const fernGeos = [getUnderGeo('fern_a'), getUnderGeo('fern_b')].filter(Boolean);
        for (let fIdx = 0; fIdx < fernGeos.length; fIdx++) {
          const maxCount = 210;
          const inst = new THREE.InstancedMesh(fernGeos[fIdx], baseUnderMat, maxCount);
          inst.receiveShadow = true;
          let placed = 0;
          for (let i = 0; i < 900 && placed < maxCount; i++) {
            const fx = (uRng() - 0.5) * 86;
            const fz = -26 - uRng() * 116;
            if (!isClearForFlora(fx, fz)) continue;
            const fy = getTerrainBaseHeight(fx, fz);
            dummy.position.set(fx, fy - 0.02, fz);
            dummy.rotation.set((uRng() - 0.5) * 0.12, uRng() * Math.PI * 2, (uRng() - 0.5) * 0.12);
            const sc = 1.22 + uRng() * 0.78;
            dummy.scale.setScalar(sc);
            dummy.updateMatrix();
            inst.setMatrixAt(placed, dummy.matrix);
            tmpCol.setRGB(0.88 + uRng() * 0.16, 1.04 + uRng() * 0.16, 0.82 + uRng() * 0.12);
            inst.setColorAt(placed, tmpCol);
            placed++;
          }
          inst.count = placed;
          inst.instanceMatrix.needsUpdate = true;
          if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
          forestGroup.add(inst);
        }

        // 3d. Markblomster (lupiner, prestekrager og smørblomster) i lysninger og langs elva
        const flowerGeos = [getUnderGeo('flower_lupine_a'), getUnderGeo('flower_daisy'), getUnderGeo('flower_yellow')].filter(Boolean);
        for (let flIdx = 0; flIdx < flowerGeos.length; flIdx++) {
          const maxCount = 85;
          const inst = new THREE.InstancedMesh(flowerGeos[flIdx], baseUnderMat, maxCount);
          inst.receiveShadow = true;
          let placed = 0;
          for (let i = 0; i < 450 && placed < maxCount; i++) {
            const fx = (uRng() - 0.5) * 76;
            const fz = -25 - uRng() * 110;
            if (!isClearForFlora(fx, fz)) continue;
            const fy = getTerrainBaseHeight(fx, fz);
            dummy.position.set(fx, fy - 0.02, fz);
            dummy.rotation.set(0, uRng() * Math.PI * 2, 0);
            const sc = 0.95 + uRng() * 0.55;
            dummy.scale.setScalar(sc);
            dummy.updateMatrix();
            inst.setMatrixAt(placed, dummy.matrix);
            tmpCol.setRGB(1.04, 1.04, 1.02);
            inst.setColorAt(placed, tmpCol);
            placed++;
          }
          inst.count = placed;
          inst.instanceMatrix.needsUpdate = true;
          if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
          forestGroup.add(inst);
        }
      }
    }

    // 4. Levende småvilt i luften, skogen og elva (assets/wildlife.glb: gribber, ravner, kaniner og gjedder)
    if (assets.wildlife && assets.wildlife.scene) {
      let creatureMat = null;
      assets.wildlife.scene.traverse((n) => {
        if (!creatureMat && n.isMesh && n.material) {
          creatureMat = prepareBotanicalMaterial(n.material, {
            vertexColors: true,
            roughness: 0.86,
            envMapIntensity: 0.36
          });
        }
      });

      const getWildGeo = (nm) => {
        const n = assets.wildlife.scene.getObjectByName(nm);
        return n && n.isMesh ? n.geometry : null;
      };

      if (creatureMat) {
        // 4a. Svevende gribber over Crimson Canyon og Boot Hill
        const vulBodyGeo = getWildGeo('dl_vulture_body');
        const vulWingRGeo = getWildGeo('dl_vulture_wing');
        const vulLegsGeo = getWildGeo('dl_vulture_legs');
        if (vulBodyGeo && vulWingRGeo) {
          const vulWingLGeo = mirrorGeometryX(vulWingRGeo);
          const vultureCenters = [
            { cx: 82, cz: -6, y: 23.5, r: 22, speed: 0.24, phase: 0.0 },
            { cx: 96, cz: 4, y: 26.5, r: 26, speed: 0.20, phase: 2.1 },
            { cx: 68, cz: -14, y: 21.0, r: 19, speed: 0.27, phase: 4.2 },
            { cx: -88, cz: -4, y: 22.0, r: 21, speed: 0.22, phase: 1.0 },
            { cx: -108, cz: 5, y: 25.0, r: 25, speed: 0.19, phase: 3.3 },
            { cx: -72, cz: 8, y: 20.5, r: 18, speed: 0.25, phase: 5.1 }
          ];
          for (let i = 0; i < vultureCenters.length; i++) {
            const vc = vultureCenters[i];
            const vg = new THREE.Group();
            const body = new THREE.Mesh(vulBodyGeo, creatureMat);
            vg.add(body);
            if (vulLegsGeo) vg.add(new THREE.Mesh(vulLegsGeo, creatureMat));
            const wingR = new THREE.Mesh(vulWingRGeo, creatureMat);
            const wingL = new THREE.Mesh(vulWingLGeo, creatureMat);
            vg.add(wingR, wingL);
            vg.scale.setScalar(1.32);
            scene.add(vg);
            ambientVultures.push({ group: vg, wingR, wingL, ...vc });
          }
        }

        // 4b. Sittende ravner på veiskiltene og Boot Hill-ruinen
        const crowGeo = getWildGeo('dl_crow');
        if (crowGeo) {
          const ravenPerches = [
            [3.2, 2.66, -21.5, 0.3],
            [-21.5, 2.66, -4.6, 1.9],
            [21.5, 2.66, -4.6, -1.2],
            [-78.0, 2.55, -8.5, 0.8],
            [-116.6, 4.18, -5.6, 2.4]
          ];
          for (let i = 0; i < ravenPerches.length; i++) {
            const [rx, ryOff, rz, rRot] = ravenPerches[i];
            const baseH = i < 3 ? getTerrainBaseHeight(rx, rz) : getTerrainBaseHeight(rx, rz);
            const rg = new THREE.Group();
            const crowMesh = new THREE.Mesh(crowGeo, creatureMat);
            crowMesh.castShadow = true;
            rg.add(crowMesh);
            rg.position.set(rx, baseH + ryOff, rz);
            rg.rotation.y = rRot;
            rg.scale.setScalar(0.56);
            scene.add(rg);
            ambientRavens.push({ group: rg, baseRotY: rRot, phase: i * 1.7 });
          }
        }

        // 4c. Ville skogskaniner som hopper mellom bregnene i Whispering Woods
        const rabTorso = getWildGeo('dl_rabbit_torso');
        const rabHead = getWildGeo('dl_rabbit_head');
        const rabFL = getWildGeo('dl_rabbit_leg_fl');
        const rabFR = getWildGeo('dl_rabbit_leg_fr');
        const rabBL = getWildGeo('dl_rabbit_leg_bl');
        const rabBR = getWildGeo('dl_rabbit_leg_br');
        if (rabTorso && rabHead) {
          const rabbitHomes = [
            [-9.5, -34], [10.5, -38], [-15.0, -49], [14.2, -55],
            [-8.5, -67], [11.5, -86], [-13.5, -98], [9.2, -110]
          ];
          for (let i = 0; i < rabbitHomes.length; i++) {
            const [hx, hz] = rabbitHomes[i];
            const rg = new THREE.Group();
            const torsoM = new THREE.Mesh(rabTorso, creatureMat);
            torsoM.castShadow = true;
            rg.add(torsoM);

            const headPiv = new THREE.Group();
            headPiv.position.set(0, 0.20, 0.22);
            const headM = new THREE.Mesh(rabHead, creatureMat);
            headM.position.set(0, -0.06, -0.02);
            headPiv.add(headM);
            rg.add(headPiv);

            const frontLegs = new THREE.Group();
            frontLegs.position.set(0, 0.16, 0.18);
            if (rabFL) frontLegs.add(new THREE.Mesh(rabFL, creatureMat));
            if (rabFR) frontLegs.add(new THREE.Mesh(rabFR, creatureMat));
            rg.add(frontLegs);

            const backLegs = new THREE.Group();
            backLegs.position.set(0, 0.18, -0.06);
            if (rabBL) backLegs.add(new THREE.Mesh(rabBL, creatureMat));
            if (rabBR) backLegs.add(new THREE.Mesh(rabBR, creatureMat));
            rg.add(backLegs);

            rg.scale.setScalar(1.18);
            rg.position.set(hx, getTerrainBaseHeight(hx, hz), hz);
            forestGroup.add(rg);
            ambientRabbits.push({
              group: rg,
              headPiv,
              frontLegs,
              backLegs,
              hx,
              hz,
              radius: 2.2 + (i % 3) * 0.9,
              speed: 0.42 + (i % 4) * 0.08,
              phase: i * 1.35
            });
          }
        }

        // 4d. Elvefisk (gjedde) som svømmer under trebroen i Whispering Woods-elva
        const pikeBody = getWildGeo('dl_pike_body');
        const pikeTail = getWildGeo('dl_pike_tail');
        if (pikeBody) {
          const fishSpawns = [-22, -14, -6, -1.5, 2.5, 9, 17, 26];
          for (let i = 0; i < fishSpawns.length; i++) {
            const fg = new THREE.Group();
            fg.add(new THREE.Mesh(pikeBody, creatureMat));
            let tailM = null;
            if (pikeTail) {
              tailM = new THREE.Mesh(pikeTail, creatureMat);
              tailM.position.set(0, 0, -0.34);
              fg.add(tailM);
            }
            fg.scale.setScalar(1.15);
            scene.add(fg);
            ambientFish.push({
              group: fg,
              tail: tailM,
              baseX: fishSpawns[i],
              rangeX: 4.5 + (i % 3) * 1.8,
              speed: 0.55 + (i % 4) * 0.12,
              phase: i * 1.9,
              zOffset: ((i % 3) - 1) * 0.85
            });
          }
        }
      }
    }
  }

  function updateAmbientWildlife(dt, worldTime) {
    // Svevende gribber i termikk over Crimson Canyon og Boot Hill
    for (let i = 0; i < ambientVultures.length; i++) {
      const v = ambientVultures[i];
      const ang = worldTime * v.speed + v.phase;
      const vx = v.cx + Math.cos(ang) * v.r;
      const vz = v.cz + Math.sin(ang) * v.r;
      const vy = v.y + Math.sin(worldTime * 0.7 + v.phase) * 1.25;
      v.group.position.set(vx, vy, vz);
      // +Z er fremover på dl_vulture_body; tangentvektoren til sirkelen er (-sin(ang), cos(ang))
      v.group.rotation.set(
        0.04 * Math.cos(worldTime * 0.7 + v.phase),
        Math.atan2(-Math.sin(ang), Math.cos(ang)),
        -0.24
      );
      const flap = Math.max(0, Math.sin(worldTime * 0.55 + v.phase * 1.7) - 0.35);
      const wingAngle = flap > 0 ? Math.sin(worldTime * 6.8 + v.phase) * 0.38 * flap : 0.06;
      v.wingR.rotation.z = wingAngle;
      v.wingL.rotation.z = -wingAngle;
    }

    // Sittende ravner som speider langs veiene
    for (let i = 0; i < ambientRavens.length; i++) {
      const rv = ambientRavens[i];
      rv.group.rotation.y = rv.baseRotY + Math.sin(worldTime * 1.1 + rv.phase) * 0.28;
      rv.group.rotation.x = Math.sin(worldTime * 2.3 + rv.phase) * 0.06;
    }

    // Ville skogskaniner som hopper og beiter i Whispering Woods
    for (let i = 0; i < ambientRabbits.length; i++) {
      const rb = ambientRabbits[i];
      const cycle = (worldTime * 0.75 + rb.phase) % 4.0;
      const moving = cycle < 2.2;
      const tMove = rb.phase * 3.0 + Math.floor((worldTime * 0.75 + rb.phase) / 4.0) * 2.2 + Math.min(cycle, 2.2);
      const ang = tMove * rb.speed;
      const rx = rb.hx + Math.cos(ang) * rb.radius;
      const rz = rb.hz + Math.sin(ang * 1.5) * (rb.radius * 0.72);
      const groundY = getTerrainBaseHeight(rx, rz);

      if (moving) {
        const hopSin = Math.abs(Math.sin(cycle * Math.PI * 2.72));
        rb.group.position.set(rx, groundY + hopSin * 0.16, rz);
        const dx = -Math.sin(ang) * rb.radius;
        const dz = Math.cos(ang * 1.5) * 1.5 * (rb.radius * 0.72);
        rb.group.rotation.y = Math.atan2(dx, dz);
        rb.frontLegs.rotation.x = -hopSin * 0.55;
        rb.backLegs.rotation.x = hopSin * 0.65;
        rb.headPiv.rotation.x = -0.08;
      } else {
        rb.group.position.set(rx, groundY, rz);
        rb.frontLegs.rotation.x = 0;
        rb.backLegs.rotation.x = 0;
        rb.headPiv.rotation.x = 0.22 + Math.sin(worldTime * 7.0 + rb.phase) * 0.08;
      }
    }

    // Elvefisk i Whispering Woods-elva
    for (let i = 0; i < ambientFish.length; i++) {
      const f = ambientFish[i];
      const s = Math.sin(worldTime * f.speed + f.phase);
      const c = Math.cos(worldTime * f.speed + f.phase);
      const fx = f.baseX + s * f.rangeX;
      const creekCenterZ = -78.0 + Math.sin(fx * 0.065) * 3.6;
      const fz = creekCenterZ + f.zOffset;
      const bedY = getTerrainBaseHeight(fx, creekCenterZ);
      f.group.position.set(fx, bedY + 0.12, fz);
      f.group.rotation.y = c >= 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
      if (f.tail) {
        f.tail.rotation.y = Math.sin(worldTime * 9.5 + f.phase) * 0.32;
      }
    }

    // Rolig rotasjon på sagbrukshjulet i nord og astrolabiet i vest (0 allokeringer)
    if (millWheelPivot) {
      millWheelPivot.rotation.x = worldTime * 0.85;
    }
    if (astrolabeOuterRing && astrolabeInnerRing) {
      astrolabeOuterRing.rotation.y = worldTime * 0.42;
      astrolabeInnerRing.rotation.z = -worldTime * 0.68;
    }
  }

  return { mountWorldBotanicalAndWildlifeAssets, updateAmbientWildlife };
}
