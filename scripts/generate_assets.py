#!/usr/bin/env python3
"""
Master asset generator & external .glb protector for Western Cowboy VR (WebXR).

Protection rules for external / photorealistic .glb models in ./assets/:
  1. By default (and with --skip-existing), ONLY generates a .glb file if it does NOT
     already exist in ./assets/.
  2. Any file listed in ./assets/external-models.json OR whose glTF JSON header
     `asset.generator` is NOT `WesternVR-GLBBuilder-*` is treated as a protected
     external model (e.g. Tripo3D / Meshy / Blender / PBR scan) and is NEVER overwritten,
     even when --upgrade-subdiv is used to upgrade legacy 1.0 procedural models to
     Loop-subdivided 2.0 models.
"""

import hashlib
import json
import os
import struct
import sys
import time

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPTS_DIR)
ASSETS_DIR = os.path.join(PROJECT_ROOT, "assets")
EXTERNAL_MANIFEST = os.path.join(ASSETS_DIR, "external-models.json")

if SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, SCRIPTS_DIR)

from build_weapons_and_buildings import (  # noqa: E402
    build_revolver_glb,
    build_saloon_glb,
    build_tailor_glb,
)
from build_arsenal import (  # noqa: E402
    build_shotgun_glb,
    build_rifle_glb,
    build_crossbow_glb,
    build_dynamite_glb,
)
from build_gunsmith_and_npc import (  # noqa: E402
    build_gunsmith_glb,
    build_gunsmith_npc_glb,
)
from build_bandit import build_bandit_glb  # noqa: E402
from build_tailor_npc import build_tailor_npc_glb  # noqa: E402
from build_vampire import build_vampire_glb  # noqa: E402
from build_deer import build_deer_glb  # noqa: E402
from build_wolf import build_wolf_glb  # noqa: E402
from build_bear import build_bear_glb  # noqa: E402
from build_boss_vampire import build_boss_vampire_glb  # noqa: E402
from build_horse import build_horse as build_horse_glb  # noqa: E402
from build_train import build_train as build_train_glb  # noqa: E402
from build_hellfire import build_hellfire as build_hellfire_glb  # noqa: E402


ASSET_JOBS = [
    ("revolver.glb", build_revolver_glb),
    ("shotgun.glb", build_shotgun_glb),
    ("rifle.glb", build_rifle_glb),
    ("crossbow.glb", build_crossbow_glb),
    ("dynamite.glb", build_dynamite_glb),
    ("hellfire.glb", build_hellfire_glb),
    ("saloon.glb", build_saloon_glb),
    ("tailor.glb", build_tailor_glb),
    ("gunsmith.glb", build_gunsmith_glb),
    ("train.glb", build_train_glb),
    ("bandit.glb", build_bandit_glb),
    ("tailor_npc.glb", build_tailor_npc_glb),
    ("gunsmith_npc.glb", build_gunsmith_npc_glb),
    ("vampire.glb", build_vampire_glb),
    ("deer.glb", build_deer_glb),
    ("wolf.glb", build_wolf_glb),
    ("bear.glb", build_bear_glb),
    ("horse.glb", build_horse_glb),
    ("boss_vampire.glb", build_boss_vampire_glb),
]

# Deprecated low-poly flat-shaded animal hashes that should be upgraded to smooth 2.0 subdivided models
DEPRECATED_LOWPOLY_HASHES = {
    "34818768f3e9298c9580ea79bfca2b79854a36877888a5e1e5df374b015f9e89",  # old low-poly deer
    "8382f3d3b97e2338d2fd26190ddcc095d34d642d0e97105bda807ec87ccfd534",  # old low-poly wolf
    "fbddb2c97179eca896ec69c985cd9cc74540484510776c400df64e088e9f2414",  # old low-poly horse
}


def sha256_file(filepath):
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while True:
            chunk = f.read(65536)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def inspect_glb_metadata(filepath):
    if not os.path.isfile(filepath):
        raise FileNotFoundError(f"Missing GLB: {filepath}")
    size = os.path.getsize(filepath)
    if size < 28:
        raise ValueError(f"GLB too small ({size} bytes): {filepath}")
    with open(filepath, "rb") as f:
        magic, version, total_len = struct.unpack("<III", f.read(12))
        if magic != 0x46546C67 or version != 2 or total_len != size:
            raise ValueError(
                f"Invalid GLB header in {filepath}: magic=0x{magic:08X}, version={version}, len={total_len} vs {size}"
            )
        json_len, json_type = struct.unpack("<II", f.read(8))
        generator = ""
        is_marked_external = False
        if json_type == 0x4E4F534A and json_len > 0:
            meta = json.loads(f.read(json_len).decode("utf-8"))
            asset_obj = meta.get("asset") or {}
            generator = asset_obj.get("generator") or ""
            extras = asset_obj.get("extras") or {}
            is_marked_external = bool(extras.get("external"))
    return size, generator, is_marked_external


def load_external_manifest():
    if not os.path.isfile(EXTERNAL_MANIFEST):
        return set()
    try:
        with open(EXTERNAL_MANIFEST, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, list):
            return set(str(x) for x in data)
        if isinstance(data, dict):
            return set(str(k) for k, v in data.items() if v)
    except Exception:
        pass
    return set()


def main():
    force_all = "--force-all" in sys.argv
    upgrade_subdiv = "--upgrade-subdiv" in sys.argv
    os.makedirs(ASSETS_DIR, exist_ok=True)
    external_set = load_external_manifest()
    t0 = time.perf_counter()

    if force_all:
        mode_str = "FORCE ALL"
    elif upgrade_subdiv:
        mode_str = "UPGRADE LEGACY PROCEDURAL -> 2.0 SUBDIV (PROTECT EXTERNAL)"
    else:
        mode_str = "MISSING-ONLY (PROTECT ALL EXISTING)"

    print(f"Checking {len(ASSET_JOBS)} WebXR .glb assets in {ASSETS_DIR} [{mode_str}]")
    print("-" * 82)

    total_bytes = 0
    built_count = 0
    kept_count = 0

    for filename, builder_fn in ASSET_JOBS:
        out_path = os.path.join(ASSETS_DIR, filename)
        if os.path.isfile(out_path) and not force_all:
            size, generator, marked_ext = inspect_glb_metadata(out_path)
            file_hash = sha256_file(out_path)
            is_deprecated_lowpoly = file_hash in DEPRECATED_LOWPOLY_HASHES
            is_external = (
                filename in external_set
                or marked_ext
                or (not generator.startswith("WesternVR-GLBBuilder") and not is_deprecated_lowpoly)
            )

            if is_external:
                total_bytes += size
                kept_count += 1
                print(f"[EXTERNAL PROTECTED] {filename:<18} {size / 1024.0:>9.1f} KB (gen='{generator or 'external'}')")
                continue

            if not upgrade_subdiv:
                total_bytes += size
                kept_count += 1
                print(f"[EXISTING KEPT]      {filename:<18} {size / 1024.0:>9.1f} KB")
                continue

            if generator == "WesternVR-GLBBuilder-2.0-Subdiv" and filename != "horse.glb":
                total_bytes += size
                kept_count += 1
                print(f"[UP-TO-DATE 2.0]     {filename:<18} {size / 1024.0:>9.1f} KB")
                continue

        info = builder_fn(out_path)
        size, _, _ = inspect_glb_metadata(out_path)
        verts = info.get("vertices", 0) if isinstance(info, dict) else 0
        tris = info.get("triangles", 0) if isinstance(info, dict) else 0
        total_bytes += size
        built_count += 1
        print(f"[GENERATED 2.0]      {filename:<18} {size / 1024.0:>9.1f} KB ({verts:,d} verts, {tris:,d} tris)")

    elapsed = time.perf_counter() - t0
    print("-" * 82)
    print(
        f"Done in {elapsed:.2f}s — {kept_count} preserved, {built_count} generated "
        f"({total_bytes / 1024.0:.1f} KB total)."
    )


if __name__ == "__main__":
    main()
