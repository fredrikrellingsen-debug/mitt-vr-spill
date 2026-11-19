#!/usr/bin/env python3
"""
Downloads genuine CC0 1.0 Public Domain HDRIs, 1K photographic PBR texture sets
(Poly Haven), and rigged/textured open-licensed 3D .glb models into ./assets/.

Safety & Plug-and-Play protection:
- Existing files in ./assets/env/ and ./assets/textures/ are never re-downloaded
  unless missing (or --force is passed).
- Existing .glb files in ./assets/ are ONLY replaced if the file does not exist
  OR its glTF generator string starts with "WesternVR-GLBBuilder-" (procedural
  placeholder). Custom external .glb models are NEVER overwritten.
"""

import hashlib
import io
import json
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

# Sculpted & rigged external PBR 3D models (see CREDITS.md for licenses).
# Existing external .glb files in ./assets/ are NEVER overwritten.
CC0_GLB_FALLBACKS = [
    (
        "vampire.glb",
        "https://raw.githubusercontent.com/511action/descent-3d-assets/main/models/CreepCreature.glb",
    ),
    (
        "horse.glb",
        "https://raw.githubusercontent.com/miskibin/warbell/main/assets/animals/horse.glb",
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
    with urllib.request.urlopen(req, timeout=60) as resp:
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


def optimize_horse_glb_bytes(raw_glb):
    """Downscales embedded 2K PNG textures to 1K JPEG/PNG for WebXR VRAM & calibrates PBR roughness."""
    try:
        from PIL import Image
    except ImportError:
        return raw_glb

    magic, ver, total, clen, ctype = struct.unpack("<IIIII", raw_glb[:20])
    if magic != 0x46546C67 or ver != 2 or ctype != 0x4E4F534A:
        return raw_glb

    doc = json.loads(raw_glb[20 : 20 + clen].decode("utf-8"))
    b_off = 20 + clen
    b_len, b_type = struct.unpack("<II", raw_glb[b_off : b_off + 8])
    bin_data = raw_glb[b_off + 8 : b_off + 8 + b_len]

    alpha_img_indices = set()
    for mat in doc.get("materials", []):
        mname = (mat.get("name") or "").lower()
        pbr = mat.setdefault("pbrMetallicRoughness", {})
        if mat.get("alphaMode") in ("MASK", "BLEND"):
            tex = pbr.get("baseColorTexture")
            if tex is not None:
                t_idx = tex["index"]
                src_idx = doc["textures"][t_idx]["source"]
                alpha_img_indices.add(src_idx)
        if "horse" in mname and "shoe" not in mname:
            pbr["metallicFactor"] = 0.0
            pbr["roughnessFactor"] = 0.86
        elif "hair" in mname:
            pbr["metallicFactor"] = 0.0
            pbr["roughnessFactor"] = 0.88
        elif "saddle" in mname:
            pbr["metallicFactor"] = 0.04
            pbr["roughnessFactor"] = 0.66
        elif "shoe" in mname:
            pbr["metallicFactor"] = 0.85
            pbr["roughnessFactor"] = 0.34
        elif "cornea" in mname:
            pbr["baseColorFactor"] = [0.03, 0.022, 0.018, 1.0]
            pbr["metallicFactor"] = 0.02
            pbr["roughnessFactor"] = 0.14

    img_bvs = {im["bufferView"]: idx for idx, im in enumerate(doc.get("images", []))}
    new_bin = bytearray()
    for bv_idx, bv in enumerate(doc["bufferViews"]):
        old_off = bv.get("byteOffset", 0)
        old_len = bv["byteLength"]
        chunk = bin_data[old_off : old_off + old_len]
        if bv_idx in img_bvs:
            im_idx = img_bvs[bv_idx]
            im_meta = doc["images"][im_idx]
            with Image.open(io.BytesIO(chunk)) as pil_im:
                if max(pil_im.size) > 1024:
                    pil_im = pil_im.resize((1024, 1024), Image.Resampling.LANCZOS)
                out_io = io.BytesIO()
                if im_idx in alpha_img_indices:
                    pil_im.convert("RGBA").save(out_io, format="PNG", optimize=True)
                    im_meta["mimeType"] = "image/png"
                else:
                    pil_im.convert("RGB").save(out_io, format="JPEG", quality=90, optimize=True)
                    im_meta["mimeType"] = "image/jpeg"
                chunk = out_io.getvalue()
        while len(new_bin) % 4 != 0:
            new_bin.append(0)
        bv["byteOffset"] = len(new_bin)
        bv["byteLength"] = len(chunk)
        new_bin.extend(chunk)

    while len(new_bin) % 4 != 0:
        new_bin.append(0)
    doc["buffers"][0]["byteLength"] = len(new_bin)
    doc.setdefault("asset", {})["generator"] = "Khronos glTF Blender I/O (External-CC-BY-4.0-HenryS)"

    json_bytes = json.dumps(doc, separators=(",", ":")).encode("utf-8")
    while len(json_bytes) % 4 != 0:
        json_bytes += b" "

    total_len = 12 + 8 + len(json_bytes) + 8 + len(new_bin)
    out = bytearray()
    out.extend(struct.pack("<III", 0x46546C67, 2, total_len))
    out.extend(struct.pack("<II", len(json_bytes), 0x4E4F534A))
    out.extend(json_bytes)
    out.extend(struct.pack("<II", len(new_bin), 0x004E4942))
    out.extend(new_bin)
    return bytes(out)


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

    print("=== Checking External Sculpted PBR GLBs ===")
    for fname, url in CC0_GLB_FALLBACKS:
        dest = os.path.join(ASSETS_DIR, fname)
        if os.path.isfile(dest) and not force:
            gen = ""
            try:
                with open(dest, "rb") as gf:
                    hdr = gf.read(20)
                    if len(hdr) == 20:
                        magic, ver, _, chunk_len, chunk_type = struct.unpack("<IIIII", hdr)
                        if magic == 0x46546C67 and chunk_type == 0x4E4F534A and chunk_len < 5_000_000:
                            doc = json.loads(gf.read(chunk_len).decode("utf-8", errors="ignore").rstrip(" \t\r\n\x00"))
                            gen = str(doc.get("asset", {}).get("generator", ""))
            except Exception:
                gen = ""
            if not gen.startswith("WesternVR-GLBBuilder-"):
                print(f"  [PROTECTED] {fname} exists ({os.path.getsize(dest) // 1024} KB, generator={gen!r}) — preserving")
                continue
            print(f"  [UPGRADING PROCEDURAL] {fname} ({gen!r}) -> sculpted external PBR model")
        raw = download_bytes(url)
        validate_payload(fname, raw)
        if fname == "horse.glb":
            raw = optimize_horse_glb_bytes(raw)
            validate_payload(fname, raw)
        with open(dest, "wb") as f:
            f.write(raw)
        print(f"  [FETCHED]   {fname} -> sculpted PBR model ({len(raw) // 1024} KB)")


if __name__ == "__main__":
    main()
