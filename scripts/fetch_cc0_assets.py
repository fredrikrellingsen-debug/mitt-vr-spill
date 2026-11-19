#!/usr/bin/env python3
"""
Downloads genuine CC0 1.0 Public Domain HDRIs, 1K photographic PBR texture sets
(Poly Haven), and sculpted, rigged, skeletal-animated open-licensed 3D .glb models
into ./assets/ (see CREDITS.md for full attribution & licenses).

Safety & Plug-and-Play protection:
- Existing files in ./assets/env/ and ./assets/textures/ are never re-downloaded
  unless missing (or --force is passed).
- Existing .glb files in ./assets/ are ONLY replaced if the file does not exist
  OR its glTF generator string starts with "WesternVR-GLBBuilder-" (procedural
  placeholder). Custom external .glb models are NEVER overwritten.
"""

import colorsys
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

USER_AGENT = "Mozilla/5.0 WesternVR-AssetFetcher/2.0"
WARBELL_RAW = "https://raw.githubusercontent.com/miskibin/warbell/main/assets"

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

DIRECT_ANIMAL_JOBS = [
    (
        "vampire.glb",
        "https://raw.githubusercontent.com/511action/descent-3d-assets/main/models/CreepCreature.glb",
        "raw",
    ),
    (
        "horse.glb",
        f"{WARBELL_RAW}/animals/horse.glb",
        "horse",
    ),
    (
        "deer.glb",
        f"{WARBELL_RAW}/animals/deer_stag.glb",
        "deer",
    ),
    (
        "wolf.glb",
        f"{WARBELL_RAW}/animals/wolf.glb",
        "wolf",
    ),
    (
        "bear.glb",
        f"{WARBELL_RAW}/animals/bear.glb",
        "bear",
    ),
]

MAKEHUMAN_NPC_JOBS = [
    {
        "filename": "tailor_npc.glb",
        "look": "merchant",
        "skin_tint": [0.92, 0.88, 0.86, 1.0],
        "cloth_tint": [0.84, 0.72, 0.76, 1.0],
        "hair_tint": [0.34, 0.23, 0.16, 1.0],
        "clips": {
            "Idle": "Idle_Talking_Loop",
            "Walk": "Walk_Loop",
        },
    },
    {
        "filename": "gunsmith_npc.glb",
        "look": "woodcutter",
        "skin_tint": [0.90, 0.86, 0.84, 1.0],
        "cloth_tint": [0.82, 0.74, 0.66, 1.0],
        "hair_tint": [0.26, 0.18, 0.13, 1.0],
        "clips": {
            "Idle": "Idle_FoldArms_Loop",
            "Walk": "Walk_Loop",
        },
    },
    {
        "filename": "sheriff_npc.glb",
        "look": "elder_m",
        "skin_tint": [0.91, 0.87, 0.85, 1.0],
        "cloth_tint": [0.64, 0.72, 0.86, 1.0],
        "hair_tint": [0.76, 0.74, 0.70, 1.0],
        "clips": {
            "Idle": "Idle_FoldArms_Loop",
            "Walk": "Walk_Loop",
        },
    },
    {
        "filename": "bandit.glb",
        "look": "archer",
        "skin_tint": [0.88, 0.83, 0.79, 1.0],
        "cloth_tint": [0.68, 0.60, 0.54, 1.0],
        "hair_tint": [0.22, 0.16, 0.12, 1.0],
        "clips": {
            "Idle": "Idle_Loop",
            "Walk": "Walk_Loop",
            "Run": "Jog_Fwd_Loop",
            "Attack": "Spell_Simple_Shoot",
            "HitReact": "Hit_Chest",
            "Death": "Death01",
        },
    },
    {
        "filename": "boss_vampire.glb",
        "look": "priest",
        "skin_tint": [0.64, 0.66, 0.74, 1.0],
        "cloth_tint": [0.56, 0.15, 0.22, 1.0],
        "hair_tint": [0.15, 0.13, 0.18, 1.0],
        "clips": {
            "Idle": "Spell_Simple_Idle_Loop",
            "Walk": "Walk_Loop",
            "Run": "Jog_Fwd_Loop",
            "Attack": "Spell_Simple_Shoot",
            "HitReact": "Hit_Chest",
            "Death": "Death01",
        },
    },
]

_DOWNLOAD_CACHE = {}


def download_bytes(url):
    if url in _DOWNLOAD_CACHE:
        return _DOWNLOAD_CACHE[url]
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=90) as resp:
        data = resp.read()
    _DOWNLOAD_CACHE[url] = data
    return data


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


def unpack_glb(raw_glb):
    magic, ver, _, clen, ctype = struct.unpack("<IIIII", raw_glb[:20])
    if magic != 0x46546C67 or ver != 2 or ctype != 0x4E4F534A:
        raise ValueError("Invalid GLB container")
    doc = json.loads(raw_glb[20 : 20 + clen].decode("utf-8"))
    b_off = 20 + clen
    b_len, _ = struct.unpack("<II", raw_glb[b_off : b_off + 8])
    bin_data = bytearray(raw_glb[b_off + 8 : b_off + 8 + b_len])
    return doc, bin_data


def pack_glb(doc, bin_data, generator_tag="External-PBR-1K-WebXR-v2"):
    while len(bin_data) % 4 != 0:
        bin_data.append(0)
    doc["buffers"][0]["byteLength"] = len(bin_data)
    doc.setdefault("asset", {})["generator"] = generator_tag

    json_bytes = json.dumps(doc, separators=(",", ":")).encode("utf-8")
    while len(json_bytes) % 4 != 0:
        json_bytes += b" "

    total_len = 12 + 8 + len(json_bytes) + 8 + len(bin_data)
    out = bytearray()
    out.extend(struct.pack("<III", 0x46546C67, 2, total_len))
    out.extend(struct.pack("<II", len(json_bytes), 0x4E4F534A))
    out.extend(json_bytes)
    out.extend(struct.pack("<II", len(bin_data), 0x004E4942))
    out.extend(bin_data)
    return bytes(out)


def should_build_glb(dest, force=False):
    if force or not os.path.isfile(dest):
        return True
    gen = ""
    try:
        with open(dest, "rb") as gf:
            hdr = gf.read(20)
            if len(hdr) == 20:
                magic, _, _, chunk_len, chunk_type = struct.unpack("<IIIII", hdr)
                if magic == 0x46546C67 and chunk_type == 0x4E4F534A and chunk_len < 6_000_000:
                    doc = json.loads(gf.read(chunk_len).decode("utf-8", errors="ignore").rstrip(" \t\r\n\x00"))
                    gen = str(doc.get("asset", {}).get("generator", ""))
    except Exception:
        gen = ""
    if not gen.startswith("WesternVR-GLBBuilder-"):
        print(f"  [PROTECTED] {os.path.basename(dest)} exists ({os.path.getsize(dest) // 1024} KB, generator={gen!r}) — preserving")
        return False
    print(f"  [UPGRADING PROCEDURAL] {os.path.basename(dest)} ({gen!r}) -> sculpted external PBR model")
    return True


def optimize_embedded_animal_glb(raw_glb, animal_kind):
    """Downscales embedded 2K PNG textures to 1K JPEG/PNG for WebXR VRAM & calibrates PBR fur/leather roughness."""
    from PIL import Image

    doc, bin_data = unpack_glb(raw_glb)

    alpha_img_indices = set()
    for mat in doc.get("materials", []):
        mname = (mat.get("name") or "").lower()
        pbr = mat.setdefault("pbrMetallicRoughness", {})
        if mat.get("alphaMode") in ("MASK", "BLEND"):
            tex = pbr.get("baseColorTexture")
            if tex is not None:
                src_idx = doc["textures"][tex["index"]]["source"]
                alpha_img_indices.add(src_idx)

        if animal_kind == "horse":
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
        elif animal_kind == "deer":
            if "eye" in mname:
                pbr["baseColorFactor"] = [0.028, 0.018, 0.014, 1.0]
                pbr["metallicFactor"] = 0.02
                pbr["roughnessFactor"] = 0.16
            elif "antler" in mname:
                pbr["metallicFactor"] = 0.0
                pbr["roughnessFactor"] = 0.66
            else:
                pbr["metallicFactor"] = 0.0
                pbr["roughnessFactor"] = 0.88
        elif animal_kind in ("wolf", "bear"):
            pbr["metallicFactor"] = 0.0
            pbr["roughnessFactor"] = 0.89

    if animal_kind == "deer":
        for anim in doc.get("animations", []):
            if anim.get("name") == "Die":
                anim["name"] = "Death"

    img_bvs = {im["bufferView"]: idx for idx, im in enumerate(doc.get("images", []))}
    new_bin = bytearray()
    for bv_idx, bv in enumerate(doc["bufferViews"]):
        old_off = bv.get("byteOffset", 0)
        old_len = bv["byteLength"]
        chunk = bytes(bin_data[old_off : old_off + old_len])
        if bv_idx in img_bvs:
            im_idx = img_bvs[bv_idx]
            im_meta = doc["images"][im_idx]
            with Image.open(io.BytesIO(chunk)) as pil_im:
                w, h = pil_im.size
                if max(w, h) > 1024:
                    scale = 1024.0 / max(w, h)
                    pil_im = pil_im.resize(
                        (max(1, round(w * scale)), max(1, round(h * scale))),
                        Image.Resampling.LANCZOS,
                    )
                out_io = io.BytesIO()
                if im_idx in alpha_img_indices:
                    pil_im.convert("RGBA").save(out_io, format="PNG", optimize=True)
                    im_meta["mimeType"] = "image/png"
                else:
                    pil_im.convert("RGB").save(out_io, format="JPEG", quality=89, optimize=True)
                    im_meta["mimeType"] = "image/jpeg"
                chunk = out_io.getvalue()
        while len(new_bin) % 4 != 0:
            new_bin.append(0)
        bv["byteOffset"] = len(new_bin)
        bv["byteLength"] = len(chunk)
        new_bin.extend(chunk)

    tag = (
        "Khronos glTF Blender I/O (External-CC-BY-4.0-HenryS)"
        if animal_kind == "horse"
        else f"External-PBR-1K-WebXR-{animal_kind}"
    )
    return pack_glb(doc, new_bin, generator_tag=tag)


def encode_dds_to_embedded_bytes(dds_bytes, max_dim=1024, as_png_rgba=False, jpeg_quality=88):
    from PIL import Image

    with Image.open(io.BytesIO(dds_bytes)) as im:
        w, h = im.size
        if max(w, h) > max_dim:
            scale = float(max_dim) / float(max(w, h))
            im = im.resize(
                (max(1, round(w * scale)), max(1, round(h * scale))),
                Image.Resampling.LANCZOS,
            )
        out_io = io.BytesIO()
        if as_png_rgba:
            im.convert("RGBA").save(out_io, format="PNG", optimize=True)
            return out_io.getvalue(), "image/png"
        im.convert("RGB").save(out_io, format="JPEG", quality=jpeg_quality, optimize=True)
        return out_io.getvalue(), "image/jpeg"


def append_embedded_texture(doc, bin_data, img_bytes, mime_type, name, sampler_idx=0):
    while len(bin_data) % 4 != 0:
        bin_data.append(0)
    bv_idx = len(doc.setdefault("bufferViews", []))
    doc["bufferViews"].append(
        {
            "buffer": 0,
            "byteOffset": len(bin_data),
            "byteLength": len(img_bytes),
        }
    )
    bin_data.extend(img_bytes)

    img_idx = len(doc.setdefault("images", []))
    doc["images"].append(
        {
            "name": name,
            "bufferView": bv_idx,
            "mimeType": mime_type,
        }
    )

    tex_idx = len(doc.setdefault("textures", []))
    doc["textures"].append(
        {
            "sampler": sampler_idx,
            "source": img_idx,
        }
    )
    return tex_idx


def ensure_standard_samplers(doc):
    # sampler 0 = REPEAT + trilinear, sampler 1 = CLAMP_TO_EDGE + trilinear
    doc["samplers"] = [
        {
            "magFilter": 9729,
            "minFilter": 9987,
            "wrapS": 10497,
            "wrapT": 10497,
        },
        {
            "magFilter": 9729,
            "minFilter": 9987,
            "wrapS": 33071,
            "wrapT": 33071,
        },
    ]


def build_makehuman_npc_glb(job):
    look = job["look"]
    base_url = f"{WARBELL_RAW}/npc/npc_{look}"
    raw_glb = download_bytes(f"{base_url}.glb")
    meta = json.loads(download_bytes(f"{base_url}.json").decode("utf-8"))
    available_cards = set(meta.get("cards", []))

    doc, bin_data = unpack_glb(raw_glb)
    ensure_standard_samplers(doc)
    doc["images"] = []
    doc["textures"] = []

    albedo_b, albedo_m = encode_dds_to_embedded_bytes(download_bytes(f"{base_url}_albedo.dds"), max_dim=1024, as_png_rgba=False, jpeg_quality=90)
    normal_b, normal_m = encode_dds_to_embedded_bytes(download_bytes(f"{base_url}_normal.dds"), max_dim=1024, as_png_rgba=False, jpeg_quality=88)
    orm_b, orm_m = encode_dds_to_embedded_bytes(download_bytes(f"{base_url}_orm.dds"), max_dim=1024, as_png_rgba=False, jpeg_quality=86)

    tex_albedo = append_embedded_texture(doc, bin_data, albedo_b, albedo_m, f"{look}_albedo", sampler_idx=1)
    tex_normal = append_embedded_texture(doc, bin_data, normal_b, normal_m, f"{look}_normal", sampler_idx=1)
    tex_orm = append_embedded_texture(doc, bin_data, orm_b, orm_m, f"{look}_orm", sampler_idx=1)

    card_tex_map = {}
    for card in ("hair", "beard", "brow", "lash"):
        if card in available_cards:
            cb, cm = encode_dds_to_embedded_bytes(
                download_bytes(f"{base_url}_{card}.dds"),
                max_dim=512,
                as_png_rgba=True,
            )
            card_tex_map[card] = append_embedded_texture(doc, bin_data, cb, cm, f"{look}_{card}", sampler_idx=1)

    for mat in doc.get("materials", []):
        mname = (mat.get("name") or "").lower()
        mat.pop("extensions", None)
        if mname == "npc_body":
            mat["pbrMetallicRoughness"] = {
                "baseColorFactor": job["skin_tint"],
                "baseColorTexture": {"index": tex_albedo},
                "metallicRoughnessTexture": {"index": tex_orm},
                "metallicFactor": 0.0,
                "roughnessFactor": 0.94,
            }
            mat["normalTexture"] = {"index": tex_normal, "scale": 0.9}
            mat["occlusionTexture"] = {"index": tex_orm, "strength": 0.85}
            mat["doubleSided"] = False
        elif mname == "npc_cloth":
            mat["pbrMetallicRoughness"] = {
                "baseColorFactor": job["cloth_tint"],
                "baseColorTexture": {"index": tex_albedo},
                "metallicRoughnessTexture": {"index": tex_orm},
                "metallicFactor": 0.0,
                "roughnessFactor": 0.95,
            }
            mat["normalTexture"] = {"index": tex_normal, "scale": 1.0}
            mat["occlusionTexture"] = {"index": tex_orm, "strength": 0.9}
            mat["doubleSided"] = True
        elif mname in ("npc_hair", "npc_beard", "npc_brow", "npc_lash"):
            card_key = mname.replace("npc_", "")
            c_tex = card_tex_map.get(card_key)
            pbr = {
                "baseColorFactor": job["hair_tint"] if card_key in ("hair", "beard", "brow") else [0.12, 0.10, 0.09, 1.0],
                "metallicFactor": 0.0,
                "roughnessFactor": 0.82,
            }
            if c_tex is not None:
                pbr["baseColorTexture"] = {"index": c_tex}
                mat["alphaMode"] = "MASK"
                mat["alphaCutoff"] = 0.42
            mat["pbrMetallicRoughness"] = pbr
            mat["doubleSided"] = True
        elif mname == "npc_mouth":
            mat["pbrMetallicRoughness"] = {
                "baseColorFactor": [0.58, 0.52, 0.50, 1.0],
                "metallicFactor": 0.0,
                "roughnessFactor": 0.62,
            }
            mat["doubleSided"] = False

    # Filter and rename skeletal animation clips so Idle/Walk/Run/Attack/Death match entities.js cleanly
    src_anims = {a.get("name"): a for a in doc.get("animations", [])}
    selected_anims = []
    for target_name, src_name in job["clips"].items():
        if src_name in src_anims:
            clip_copy = dict(src_anims[src_name])
            clip_copy["name"] = target_name
            selected_anims.append(clip_copy)
    doc["animations"] = selected_anims

    return pack_glb(doc, bin_data, generator_tag=f"External-MakeHuman-Quaternius-{look}")


def build_trees_glb():
    raw_glb = download_bytes(f"{WARBELL_RAW}/forest_pbr/trees.glb")
    doc, bin_data = unpack_glb(raw_glb)
    ensure_standard_samplers(doc)
    doc["images"] = []
    doc["textures"] = []

    tex_cache = {}
    for bark_name in ("bark_oak", "bark_pine", "bark_beech"):
        ab, am = encode_dds_to_embedded_bytes(download_bytes(f"{WARBELL_RAW}/forest_pbr/{bark_name}_albedo.dds"), max_dim=512, as_png_rgba=False, jpeg_quality=87)
        nb, nm = encode_dds_to_embedded_bytes(download_bytes(f"{WARBELL_RAW}/forest_pbr/{bark_name}_normal.dds"), max_dim=512, as_png_rgba=False, jpeg_quality=85)
        tex_cache[f"{bark_name}_a"] = append_embedded_texture(doc, bin_data, ab, am, f"{bark_name}_albedo", sampler_idx=0)
        tex_cache[f"{bark_name}_n"] = append_embedded_texture(doc, bin_data, nb, nm, f"{bark_name}_normal", sampler_idx=0)

    can_ab, can_am = encode_dds_to_embedded_bytes(download_bytes(f"{WARBELL_RAW}/forest_pbr/canopy_albedo.dds"), max_dim=1024, as_png_rgba=True)
    can_nb, can_nm = encode_dds_to_embedded_bytes(download_bytes(f"{WARBELL_RAW}/forest_pbr/canopy_normal.dds"), max_dim=1024, as_png_rgba=False, jpeg_quality=86)
    tex_can_a = append_embedded_texture(doc, bin_data, can_ab, can_am, "canopy_albedo", sampler_idx=1)
    tex_can_n = append_embedded_texture(doc, bin_data, can_nb, can_nm, "canopy_normal", sampler_idx=1)

    for mat in doc.get("materials", []):
        mname = (mat.get("name") or "").lower()
        mat.pop("extensions", None)
        if mname in ("bark_oak", "bark_pine", "bark_beech"):
            mat["pbrMetallicRoughness"] = {
                "baseColorFactor": [1.0, 1.0, 1.0, 1.0],
                "baseColorTexture": {"index": tex_cache[f"{mname}_a"]},
                "metallicFactor": 0.0,
                "roughnessFactor": 0.92,
            }
            mat["normalTexture"] = {"index": tex_cache[f"{mname}_n"], "scale": 1.0}
            mat["doubleSided"] = False
        elif mname == "canopy":
            mat["pbrMetallicRoughness"] = {
                "baseColorFactor": [1.08, 1.10, 1.02, 1.0],
                "baseColorTexture": {"index": tex_can_a},
                "metallicFactor": 0.0,
                "roughnessFactor": 0.86,
            }
            mat["normalTexture"] = {"index": tex_can_n, "scale": 0.85}
            mat["alphaMode"] = "MASK"
            mat["alphaCutoff"] = 0.40
            mat["doubleSided"] = True
        else:
            mat["pbrMetallicRoughness"] = {
                "baseColorFactor": [0.78, 0.24, 0.18, 1.0],
                "metallicFactor": 0.0,
                "roughnessFactor": 0.65,
            }

    return pack_glb(doc, bin_data, generator_tag="External-PolyHaven-BotanicalTrees-CC0")


def build_shrubs_glb():
    raw_glb = download_bytes(f"{WARBELL_RAW}/forest_pbr/scanned_props.glb")
    doc, bin_data = unpack_glb(raw_glb)
    ensure_standard_samplers(doc)
    doc["images"] = []
    doc["textures"] = []

    # Keep only bush_a / bush_b nodes in scene 0
    keep_indices = []
    for ni in doc["scenes"][0]["nodes"]:
        nname = (doc["nodes"][ni].get("name") or "").lower()
        if nname.startswith("bush_"):
            keep_indices.append(ni)
    doc["scenes"][0]["nodes"] = keep_indices

    ab, am = encode_dds_to_embedded_bytes(download_bytes(f"{WARBELL_RAW}/forest_pbr/ph_shrub_02_albedo.dds"), max_dim=512, as_png_rgba=False, jpeg_quality=88)
    nb, nm = encode_dds_to_embedded_bytes(download_bytes(f"{WARBELL_RAW}/forest_pbr/ph_shrub_02_normal.dds"), max_dim=512, as_png_rgba=False, jpeg_quality=86)
    tex_a = append_embedded_texture(doc, bin_data, ab, am, "ph_shrub_02_albedo", sampler_idx=0)
    tex_n = append_embedded_texture(doc, bin_data, nb, nm, "ph_shrub_02_normal", sampler_idx=0)

    for mat in doc.get("materials", []):
        mname = (mat.get("name") or "").lower()
        mat.pop("extensions", None)
        if mname == "ph_shrub_02":
            mat["pbrMetallicRoughness"] = {
                "baseColorFactor": [1.05, 1.02, 0.96, 1.0],
                "baseColorTexture": {"index": tex_a},
                "metallicFactor": 0.0,
                "roughnessFactor": 0.88,
            }
            mat["normalTexture"] = {"index": tex_n, "scale": 0.9}
            mat["doubleSided"] = True

    return pack_glb(doc, bin_data, generator_tag="External-PolyHaven-Shrub02-CC0")


def build_undergrowth_glb():
    raw_glb = download_bytes(f"{WARBELL_RAW}/forest_pbr/undergrowth.glb")
    doc, bin_data = unpack_glb(raw_glb)
    ensure_standard_samplers(doc)
    doc["images"] = []
    doc["textures"] = []

    ab, am = encode_dds_to_embedded_bytes(download_bytes(f"{WARBELL_RAW}/forest_pbr/undergrowth_albedo.dds"), max_dim=1024, as_png_rgba=True)
    nb, nm = encode_dds_to_embedded_bytes(download_bytes(f"{WARBELL_RAW}/forest_pbr/undergrowth_normal.dds"), max_dim=1024, as_png_rgba=False, jpeg_quality=86)
    tex_a = append_embedded_texture(doc, bin_data, ab, am, "undergrowth_albedo", sampler_idx=1)
    tex_n = append_embedded_texture(doc, bin_data, nb, nm, "undergrowth_normal", sampler_idx=1)

    for mat in doc.get("materials", []):
        mat.pop("extensions", None)
        mat["pbrMetallicRoughness"] = {
            "baseColorFactor": [1.10, 1.10, 1.05, 1.0],
            "baseColorTexture": {"index": tex_a},
            "metallicFactor": 0.0,
            "roughnessFactor": 0.86,
        }
        mat["normalTexture"] = {"index": tex_n, "scale": 0.85}
        mat["alphaMode"] = "MASK"
        mat["alphaCutoff"] = 0.36
        mat["doubleSided"] = True

    return pack_glb(doc, bin_data, generator_tag="External-PolyHaven-Undergrowth-CC0")


def build_wildlife_glb():
    raw_glb = download_bytes(f"{WARBELL_RAW}/forest_pbr/dl_creatures.glb")
    doc, bin_data = unpack_glb(raw_glb)
    ensure_standard_samplers(doc)
    doc["images"] = []
    doc["textures"] = []

    # Decode HSV-packed vertex colors on dl_vulture_* (marked by alpha < 1.0) into linear RGB + alpha=1.0
    for mesh in doc.get("meshes", []):
        mname = (mesh.get("name") or "").lower()
        if "vulture" not in mname:
            continue
        for prim in mesh.get("primitives", []):
            if "COLOR_0" not in prim.get("attributes", {}):
                continue
            acc = doc["accessors"][prim["attributes"]["COLOR_0"]]
            if acc.get("componentType") != 5123 or acc.get("type") != "VEC4":
                continue
            bv = doc["bufferViews"][acc["bufferView"]]
            base_off = bv.get("byteOffset", 0) + acc.get("byteOffset", 0)
            for k in range(acc["count"]):
                off = base_off + k * 8
                h_u, s_u, v_u, a_u = struct.unpack_from("<4H", bin_data, off)
                if a_u < 62000:
                    r_f, g_f, b_f = colorsys.hsv_to_rgb(h_u / 65535.0, s_u / 65535.0, v_u / 65535.0)
                    struct.pack_into(
                        "<4H",
                        bin_data,
                        off,
                        min(65535, max(0, round(r_f * 65535.0))),
                        min(65535, max(0, round(g_f * 65535.0))),
                        min(65535, max(0, round(b_f * 65535.0))),
                        65535,
                    )

    ab, am = encode_dds_to_embedded_bytes(download_bytes(f"{WARBELL_RAW}/forest_pbr/creature_albedo.dds"), max_dim=512, as_png_rgba=False, jpeg_quality=88)
    nb, nm = encode_dds_to_embedded_bytes(download_bytes(f"{WARBELL_RAW}/forest_pbr/creature_normal.dds"), max_dim=512, as_png_rgba=False, jpeg_quality=86)
    tex_a = append_embedded_texture(doc, bin_data, ab, am, "creature_albedo", sampler_idx=0)
    tex_n = append_embedded_texture(doc, bin_data, nb, nm, "creature_normal", sampler_idx=0)

    for mat in doc.get("materials", []):
        mat.pop("extensions", None)
        mat["pbrMetallicRoughness"] = {
            "baseColorFactor": [1.35, 1.32, 1.28, 1.0],
            "baseColorTexture": {"index": tex_a},
            "metallicFactor": 0.0,
            "roughnessFactor": 0.86,
        }
        mat["normalTexture"] = {"index": tex_n, "scale": 0.75}
        mat["doubleSided"] = False

    return pack_glb(doc, bin_data, generator_tag="External-OpenGameArt-Wildlife-CC0")


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

    print("=== Building / Checking Sculpted Animals & Monsters ===")
    for fname, url, kind in DIRECT_ANIMAL_JOBS:
        dest = os.path.join(ASSETS_DIR, fname)
        if not should_build_glb(dest, force=force):
            continue
        raw = download_bytes(url)
        validate_payload(fname, raw)
        if kind != "raw":
            raw = optimize_embedded_animal_glb(raw, kind)
            validate_payload(fname, raw)
        with open(dest, "wb") as f:
            f.write(raw)
        print(f"  [BUILT] {fname} -> sculpted PBR model ({len(raw) // 1024} KB)")

    print("=== Building / Checking Skinned Humans & Vampire Boss ===")
    for job in MAKEHUMAN_NPC_JOBS:
        fname = job["filename"]
        dest = os.path.join(ASSETS_DIR, fname)
        if not should_build_glb(dest, force=force):
            continue
        built = build_makehuman_npc_glb(job)
        validate_payload(fname, built)
        with open(dest, "wb") as f:
            f.write(built)
        print(f"  [BUILT] {fname} -> MakeHuman + Quaternius PBR model ({len(built) // 1024} KB)")

    print("=== Building / Checking Botanical PBR Trees, Shrubs, Grass/Ferns & Wildlife ===")
    botanical_builders = [
        ("trees.glb", build_trees_glb),
        ("shrubs.glb", build_shrubs_glb),
        ("undergrowth.glb", build_undergrowth_glb),
        ("wildlife.glb", build_wildlife_glb),
    ]
    for fname, builder_fn in botanical_builders:
        dest = os.path.join(ASSETS_DIR, fname)
        if not should_build_glb(dest, force=force):
            continue
        built = builder_fn()
        validate_payload(fname, built)
        with open(dest, "wb") as f:
            f.write(built)
        print(f"  [BUILT] {fname} -> botanical/wildlife PBR pack ({len(built) // 1024} KB)")


if __name__ == "__main__":
    main()
