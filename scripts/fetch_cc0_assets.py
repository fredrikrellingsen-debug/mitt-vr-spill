#!/usr/bin/env python3
"""
Downloads genuine CC0 1.0 Public Domain HDRIs, 1K photographic PBR texture sets
(Poly Haven), and rigged/textured CC0 3D .glb models (Quaternius) into ./assets/.

Safety & Plug-and-Play protection:
- Existing files in ./assets/env/ and ./assets/textures/ are never re-downloaded
  unless missing (or --force is passed).
- Existing .glb files in ./assets/ are ONLY replaced if the file does not exist
  OR its SHA-256 matches the legacy procedural Python generator hash. Custom
  external .glb models (e.g. from Tripo3D / Meshy) are NEVER overwritten.
"""

import hashlib
import os
import struct
import sys
import urllib.request

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPTS_DIR)
ASSETS_DIR = os.path.join(PROJECT_ROOT, "assets")
ENV_DIR = os.path.join(ASSETS_DIR, "env")
TEX_DIR = os.path.join(ASSETS_DIR, "textures")

USER_AGENT = "Mozilla/5.0 WesternVR-AssetFetcher/1.0"

HDRI_JOBS = [
    (
        "desert_sunset.hdr",
        "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/rogland_sunset_1k.hdr",
    ),
    (
        "moonlit_night.hdr",
        "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/rogland_moonlit_night_1k.hdr",
    ),
]

TEXTURE_JOBS = [
    # Desert Sand (Poly Haven: aerial_sand, CC0)
    ("sand_diff.jpg", "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/aerial_sand/aerial_sand_diff_1k.jpg"),
    ("sand_nor.jpg", "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/aerial_sand/aerial_sand_nor_gl_1k.jpg"),
    ("sand_rough.jpg", "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/aerial_sand/aerial_sand_rough_1k.jpg"),
    # Packed Dirt & Trail Road (Poly Haven: dirt_floor, CC0)
    ("road_diff.jpg", "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/dirt_floor/dirt_floor_diff_1k.jpg"),
    ("road_nor.jpg", "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/dirt_floor/dirt_floor_nor_gl_1k.jpg"),
    ("road_rough.jpg", "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/dirt_floor/dirt_floor_rough_1k.jpg"),
    # Weathered Western Wood Planks (Poly Haven: weathered_brown_planks, CC0)
    ("wood_diff.jpg", "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/weathered_brown_planks/weathered_brown_planks_diff_1k.jpg"),
    ("wood_nor.jpg", "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/weathered_brown_planks/weathered_brown_planks_nor_gl_1k.jpg"),
    ("wood_rough.jpg", "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/weathered_brown_planks/weathered_brown_planks_rough_1k.jpg"),
    # Dark Timber & Roof Planks (Poly Haven: dark_wooden_planks, CC0)
    ("roof_diff.jpg", "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/dark_wooden_planks/dark_wooden_planks_diff_1k.jpg"),
    ("roof_nor.jpg", "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/dark_wooden_planks/dark_wooden_planks_nor_gl_1k.jpg"),
    ("roof_rough.jpg", "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/dark_wooden_planks/dark_wooden_planks_rough_1k.jpg"),
    # Canyon Sandstone Rock (Poly Haven: sandstone_cracks, CC0)
    ("sandstone_diff.jpg", "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/sandstone_cracks/sandstone_cracks_diff_1k.jpg"),
    ("sandstone_nor.jpg", "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/sandstone_cracks/sandstone_cracks_nor_gl_1k.jpg"),
    ("sandstone_rough.jpg", "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/sandstone_cracks/sandstone_cracks_rough_1k.jpg"),
    # Tree Bark & Cabin Logs (Poly Haven: bark_brown_02, CC0)
    ("bark_diff.jpg", "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/bark_brown_02/bark_brown_02_diff_1k.jpg"),
    ("bark_nor.jpg", "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/bark_brown_02/bark_brown_02_nor_gl_1k.jpg"),
    ("bark_rough.jpg", "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/bark_brown_02/bark_brown_02_rough_1k.jpg"),
    # Forest Foliage & Ground Leaves (Poly Haven: forest_leaves_02, CC0)
    ("foliage_diff.jpg", "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/forest_leaves_02/forest_leaves_02_diffuse_1k.jpg"),
    ("foliage_nor.jpg", "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/forest_leaves_02/forest_leaves_02_nor_gl_1k.jpg"),
    ("foliage_rough.jpg", "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/forest_leaves_02/forest_leaves_02_rough_1k.jpg"),
    # Worn Western Leather for Outfits, Saddles & Gear (Poly Haven: brown_leather, CC0)
    ("leather_diff.jpg", "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/brown_leather/brown_leather_albedo_1k.jpg"),
    ("leather_nor.jpg", "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/brown_leather/brown_leather_nor_gl_1k.jpg"),
    ("leather_rough.jpg", "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/brown_leather/brown_leather_rough_1k.jpg"),
]

# Genuine CC0 rigged & animated 3D models (Quaternius CC0 1.0 Public Domain)
# Only replaces target .glb if missing or matching the exact legacy procedural SHA-256.
CC0_GLB_UPGRADES = [
    (
        "deer.glb",
        "https://raw.githubusercontent.com/trebeljahr/quaternius-showcase/main/public/glb/animals_pack/Stag.glb",
        {"d7b4c0d82a8f11ee1756ef21c69352a524ca0817c5b6338c9d624e8e27e20f05"},
    ),
    (
        "wolf.glb",
        "https://raw.githubusercontent.com/trebeljahr/quaternius-showcase/main/public/glb/animals_pack/Wolf.glb",
        {"0d01c81e81174e3427cc4cb909f1aa97f0081693f24afdbadc4b71af03da2416"},
    ),
    (
        "horse.glb",
        "https://raw.githubusercontent.com/trebeljahr/quaternius-showcase/main/public/glb/animals_pack/Horse.glb",
        {"6e75c0d633f1a2b363159b2cdb5c0e20d9e0d0c4d03627d179ba23508ff4fd11"},
    ),
    (
        "vampire.glb",
        "https://raw.githubusercontent.com/511action/descent-3d-assets/main/models/CreepCreature.glb",
        {"b40996e9ae65227b3e2131c5478f200b33209128239c70f24e5d70f962f93ae5"},
    ),
]


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while True:
            chunk = f.read(65536)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def download_bytes(url):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=45) as resp:
        return resp.read()


def validate_payload(filename, data):
    if filename.endswith(".hdr"):
        if not (data.startswith(b"#?RADIANCE") or data.startswith(b"#?RGBE")):
            raise ValueError(f"Invalid Radiance HDR header for {filename}")
    elif filename.endswith(".jpg"):
        if len(data) < 256 or data[:2] != b"\xff\xd8":
            raise ValueError(f"Invalid JPEG payload for {filename}")
    elif filename.endswith(".glb"):
        if len(data) < 28:
            raise ValueError(f"GLB payload too small for {filename}")
        magic, version, total_len = struct.unpack("<III", data[:12])
        if magic != 0x46546C67 or version != 2 or total_len != len(data):
            raise ValueError(f"Invalid GLB header for {filename}")


def main():
    force = "--force" in sys.argv
    os.makedirs(ENV_DIR, exist_ok=True)
    os.makedirs(TEX_DIR, exist_ok=True)
    os.makedirs(ASSETS_DIR, exist_ok=True)

    print("=== Fetching CC0 1K HDRIs (./assets/env/) ===")
    for fname, url in HDRI_JOBS:
        dest = os.path.join(ENV_DIR, fname)
        if os.path.isfile(dest) and os.path.getsize(dest) > 1024 and not force:
            print(f"  [KEEP] {fname} ({os.path.getsize(dest) // 1024} KB)")
            continue
        raw = download_bytes(url)
        validate_payload(fname, raw)
        with open(dest, "wb") as f:
            f.write(raw)
        print(f"  [OK]   {fname} ({len(raw) // 1024} KB)")

    print("=== Fetching CC0 1K Photographic PBR Textures (./assets/textures/) ===")
    for fname, url in TEXTURE_JOBS:
        dest = os.path.join(TEX_DIR, fname)
        if os.path.isfile(dest) and os.path.getsize(dest) > 1024 and not force:
            print(f"  [KEEP] {fname} ({os.path.getsize(dest) // 1024} KB)")
            continue
        raw = download_bytes(url)
        validate_payload(fname, raw)
        with open(dest, "wb") as f:
            f.write(raw)
        print(f"  [OK]   {fname} ({len(raw) // 1024} KB)")

    print("=== Upgrading Selected Procedural GLBs to Sculpted/Rigged CC0 GLBs ===")
    for fname, url, legacy_hashes in CC0_GLB_UPGRADES:
        dest = os.path.join(ASSETS_DIR, fname)
        if os.path.isfile(dest) and not force:
            cur_hash = sha256_file(dest)
            if cur_hash not in legacy_hashes:
                print(f"  [PROTECTED] {fname} already external/custom ({os.path.getsize(dest) // 1024} KB) — skipping")
                continue
        raw = download_bytes(url)
        validate_payload(fname, raw)
        with open(dest, "wb") as f:
            f.write(raw)
        print(f"  [UPGRADED]  {fname} -> CC0 model ({len(raw) // 1024} KB)")


if __name__ == "__main__":
    main()
