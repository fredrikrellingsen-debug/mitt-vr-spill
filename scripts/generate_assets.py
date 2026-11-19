#!/usr/bin/env python3
"""
Master fallback asset pipeline for Western Cowboy VR (WebXR).
Protects external / CC0 / Tripo3D / Meshy .glb files in ./assets/:
By default, ONLY generates a .glb file if it does NOT already exist in ./assets/
(pass --force explicitly to rebuild procedural models).
"""

import os
import struct
import sys
import time

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPTS_DIR)
ASSETS_DIR = os.path.join(PROJECT_ROOT, "assets")

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


def verify_glb_header(filepath):
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
    return size


def main():
    force_overwrite = "--force" in sys.argv
    os.makedirs(ASSETS_DIR, exist_ok=True)
    t0 = time.perf_counter()

    mode_str = "FORCE OVERWRITE" if force_overwrite else "PROTECT EXISTING (missing-only)"
    print(f"Checking {len(ASSET_JOBS)} WebXR .glb assets in {ASSETS_DIR} [{mode_str}]")
    print("-" * 78)

    total_bytes = 0
    built_count = 0
    kept_count = 0

    for filename, builder_fn in ASSET_JOBS:
        out_path = os.path.join(ASSETS_DIR, filename)
        if os.path.isfile(out_path) and not force_overwrite:
            size = verify_glb_header(out_path)
            total_bytes += size
            kept_count += 1
            print(f"[PROTECTED] {filename:<20} {size / 1024.0:>10.1f} KB (existing .glb preserved)")
            continue

        info = builder_fn(out_path)
        size = verify_glb_header(out_path)
        verts = info.get("vertices", 0) if isinstance(info, dict) else 0
        tris = info.get("triangles", 0) if isinstance(info, dict) else 0
        total_bytes += size
        built_count += 1
        print(f"[GENERATED] {filename:<20} {size / 1024.0:>10.1f} KB ({verts:,d} verts, {tris:,d} tris)")

    elapsed = time.perf_counter() - t0
    print("-" * 78)
    print(
        f"Done in {elapsed:.2f}s — {kept_count} preserved, {built_count} generated "
        f"({total_bytes / 1024.0:.1f} KB total)."
    )


if __name__ == "__main__":
    main()
