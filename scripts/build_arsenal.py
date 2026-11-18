#!/usr/bin/env python3
"""
Builds crisp, game-ready binary glTF 2.0 (.glb) Western & Vampire-Hunter VR arsenal models:
  1. assets/shotgun.glb  — Double-Barrel Coach Shotgun (avsaget hagle)
  2. assets/rifle.glb    — 1873 Winchester Lever-Action Rifle ("Yellow Boy")
  3. assets/crossbow.glb — Vampire Hunter's Ornate Silver Crossbow
  4. assets/dynamite.glb — 3-Stick Western Dynamite Bundle with Braided Fuse & Glowing Spark

Pure Python using glb_core.GLBBuilder (zero external dependencies).
Matches exact VR hand scale, grip origin (0, 0, 0), forward -Z orientation, and PBR material names of revolver.glb.
"""

import json
import math
import os
import struct
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from glb_core import (
    GLBBuilder,
    catmull_rom_chain,
    quat_from_euler_xyz,
    quat_rotate_vec,
    v_add,
    v_cross,
    v_dot,
    v_len,
    v_norm,
    v_sub,
)


def _add_shared_gun_materials(b):
    """Registers standard PBR weapon materials matching revolver.glb."""
    mat_steel = b.add_material("GunSteel", (0.77, 0.80, 0.85), metallic=0.92, roughness=0.19)
    mat_dark = b.add_material("GunDarkSteel", (0.22, 0.25, 0.30), metallic=0.88, roughness=0.27)
    mat_brass = b.add_material("GunBrass", (0.89, 0.71, 0.34), metallic=0.92, roughness=0.18)
    mat_walnut = b.add_material("GunWalnut", (0.36, 0.17, 0.07), metallic=0.04, roughness=0.40)
    mat_copper = b.add_material("GunCopper", (0.83, 0.46, 0.26), metallic=0.88, roughness=0.24)
    mat_bore = b.add_material("GunBoreDark", (0.03, 0.03, 0.04), metallic=0.15, roughness=0.92)
    return mat_steel, mat_dark, mat_brass, mat_walnut, mat_copper, mat_bore


# ---------------------------------------------------------------------------
# 1. assets/shotgun.glb — Detailed Double-Barrel Coach Shotgun (Avsaget Hagle)
# ---------------------------------------------------------------------------

def build_shotgun_glb(out_path):
    """
    Exports a detailed Double-Barrel Coach Shotgun:
      - Grip/receiver centered near (0, 0, 0), pointing forward along -Z
      - World Z span: +0.16 (brass buttplate) to -0.43 (muzzle crown)
      - Child nodes: HammerL, HammerR, MuzzlePoint at (0.0, 0.030, -0.43)
    """
    b = GLBBuilder()
    mat_steel, mat_dark, mat_brass, mat_walnut, mat_copper, mat_bore = _add_shared_gun_materials(b)

    root_idx = b.add_node("ShotgunRoot")
    parts, gp = b.create_parts_dict()

    steel = gp(mat_steel)
    dark = gp(mat_dark)
    brass = gp(mat_brass)
    walnut = gp(mat_walnut)
    copper = gp(mat_copper)
    bore = gp(mat_bore)

    # 1a. Side-by-side Twin Blued-Steel 12-Gauge Barrels (z = -0.048 to -0.430, y = 0.030)
    barrel_sep_x = 0.0136
    barrel_y = 0.030
    barrel_spine = [(0.0, 0.0, -0.048 - (k / 7.0) * (0.425 - 0.048)) for k in range(8)]

    def shotgun_barrel_sec(t, theta):
        # Reinforced chamber wall at breech (t=0..0.28) tapering smoothly toward muzzle
        chamber_boost = 0.0021 * (1.0 - min(1.0, t / 0.34)) ** 1.6
        flare_muzzle = 0.0003 * max(0.0, (t - 0.88) / 0.12)
        r = 0.0124 + chamber_boost + flare_muzzle
        return (math.cos(theta) * r, math.sin(theta) * r)

    for side in (-1, 1):
        bx = side * barrel_sep_x
        steel.add_loft(
            barrel_spine,
            shotgun_barrel_sec,
            u_segs=18,
            cap_start=True,
            cap_end=False,
            uv_u_scale=1.5,
            uv_v_scale=3.0,
            translate=(bx, barrel_y, 0.0),
            up_hint=(0.0, 1.0, 0.0),
        )
        # Machined muzzle crown lip (z = -0.425..-0.430)
        dark.add_lathe(
            [
                (0.0127, 0.0000),
                (0.0129, 0.0022),
                (0.0120, 0.0050),
                (0.0094, 0.0050),
                (0.0091, 0.0008),
            ],
            u_segs=18,
            translate=(bx, barrel_y, -0.425),
            rot_euler=(-math.pi * 0.5, 0.0, 0.0),
        )
        # Deep dark recessed 12-gauge bore
        bore.add_faceted_prism(
            sides=14,
            r_top=0.0091,
            r_bot=0.0091,
            length=0.018,
            center=(bx, barrel_y, -0.420),
            rot_euler=(-math.pi * 0.5, 0.0, 0.0),
        )
        # Breech brass shell rim & copper primer accent nestled at standing breech seam
        brass.add_faceted_prism(
            sides=14,
            r_top=0.0110,
            r_bot=0.0110,
            length=0.0035,
            center=(bx, barrel_y, -0.0472),
            rot_euler=(-math.pi * 0.5, 0.0, 0.0),
        )
        copper.add_faceted_prism(
            sides=10,
            r_top=0.0038,
            r_bot=0.0038,
            length=0.0042,
            center=(bx, barrel_y, -0.0468),
            rot_euler=(-math.pi * 0.5, 0.0, 0.0),
        )

    # Top elevated matted sighting rib & under-rib joining the twin barrels + brass bead front sight
    dark.add_beveled_box(0.0, 0.0412, -0.238, 0.0115, 0.0052, 0.378, bevel=0.0014, uv_scale=2.0)
    dark.add_beveled_box(0.0, 0.0196, -0.242, 0.0105, 0.0056, 0.368, bevel=0.0014, uv_scale=2.0)
    # Front muzzle rib filler wedge
    dark.add_beveled_box(0.0, 0.0300, -0.4255, 0.0095, 0.0165, 0.0085, bevel=0.0012)
    # Pedestal & gleaming brass bead front sight near muzzle
    dark.add_beveled_box(0.0, 0.0445, -0.413, 0.0058, 0.0034, 0.014, bevel=0.0009)
    brass.add_ellipsoid(center=(0.0, 0.0482, -0.413), radii=(0.0032, 0.0032, 0.0032), u_segs=12, v_segs=8)

    # Under-barrel steel locking lugs & hinge knuckle
    dark.add_beveled_box(0.0, 0.0105, -0.066, 0.019, 0.015, 0.042, bevel=0.0022)
    brass.add_faceted_prism(
        sides=12, r_top=0.0048, r_bot=0.0048, length=0.045,
        center=(0.0, 0.0065, -0.056), rot_euler=(0.0, 0.0, math.pi * 0.5),
    )

    # 1b. Sculpted Walnut Splinter Fore-End Wood under Barrels (z = -0.062..-0.246)
    fore_ctrl = [
        (0.0, 0.0115, -0.064),
        (0.0, 0.0125, -0.118),
        (0.0, 0.0140, -0.185),
        (0.0, 0.0168, -0.242),
    ]
    fore_spine = catmull_rom_chain(fore_ctrl, samples_per_seg=4)

    def splinter_fore_sec(t, theta):
        # Wide rounded U-cradle hugging the twin barrels, tapering forward into classic splinter tip
        taper = 1.0 - 0.34 * (t ** 1.35)
        hw = 0.0248 * taper
        hd = (0.0145 - 0.0042 * t)
        ct, st = math.cos(theta), math.sin(theta)
        sx = math.copysign(abs(ct) ** 0.78, ct) * hw
        sy = math.copysign(abs(st) ** 0.85, st) * hd
        if st > 0.15:
            # Flatten top slightly so it beds flush against underside of twin barrels
            sy *= 0.62
        return (sx, sy)

    walnut.add_loft(
        fore_spine, splinter_fore_sec, u_segs=20, cap_start=True, cap_end=True,
        uv_u_scale=1.2, uv_v_scale=1.8, up_hint=(0.0, 1.0, 0.0),
    )
    # Fore-end iron/brass escutcheon & Anson latch release button on underside
    dark.add_beveled_box(0.0, 0.0095, -0.060, 0.044, 0.016, 0.014, bevel=0.0022)
    brass.add_beveled_box(0.0, 0.0020, -0.152, 0.011, 0.0038, 0.036, bevel=0.0010)
    brass.add_beveled_box(0.0, 0.0172, -0.245, 0.024, 0.0095, 0.010, bevel=0.0020)

    # 1c. Case-Hardened Steel Receiver ("GunDarkSteel") with Bolsters, Side Lockplates & Top Break Lever
    # Watertable (flat bottom receiver bed extending forward under chambers)
    dark.add_beveled_box(0.0, 0.0065, -0.028, 0.043, 0.017, 0.066, bevel=0.0032)
    # Standing breech block with twin rounded recoil fences behind barrels
    dark.add_beveled_box(0.0, 0.0255, -0.026, 0.045, 0.038, 0.042, bevel=0.0045)
    for side in (-1, 1):
        # Twin hemispherical recoil shields / bolster fences behind left & right chambers
        dark.add_ellipsoid(
            center=(side * 0.0138, 0.030, -0.036),
            radii=(0.0148, 0.0152, 0.0125), u_segs=14, v_segs=8,
        )
        # Sculpted side lockplates extending backward along wrist cheeks
        dark.add_beveled_box(
            side * 0.0195, 0.014, 0.008, 0.0075, 0.025, 0.072,
            bevel=0.0022, rot_euler=(0.14, 0.0, 0.0),
        )
        # Brass lockplate cross-screws
        for sz_p, sy_p in ((-0.012, 0.016), (0.028, 0.011)):
            brass.add_faceted_prism(
                sides=10, r_top=0.0032, r_bot=0.0032, length=0.004,
                center=(side * 0.0228, sy_p, sz_p), rot_euler=(0.0, 0.0, math.pi * 0.5),
            )

    # Upper tang & sliding safety button behind top break lever
    dark.add_beveled_box(0.0, 0.026, 0.028, 0.015, 0.008, 0.056, bevel=0.0018, rot_euler=(-0.38, 0.0, 0.0))
    steel.add_beveled_box(0.0, 0.022, 0.046, 0.0085, 0.0055, 0.014, bevel=0.0015, rot_euler=(-0.38, 0.0, 0.0))

    # Top Break-Action Lever (Westley Richards / Scott spindle + curved thumbpiece)
    brass.add_faceted_prism(
        sides=12, r_top=0.0062, r_bot=0.0068, length=0.008,
        center=(0.0, 0.0445, -0.012),
    )
    lever_pts = [
        (0.0, 0.0455, -0.012),
        (0.0015, 0.0435, 0.006),
        (0.0045, 0.0385, 0.024),
        (0.0085, 0.0350, 0.036),
    ]
    steel.add_tube(lever_pts, 0.0045, 0.0036, u_segs=10, samples_per_seg=4, scale_xy=(1.35, 0.72))
    steel.add_ellipsoid(
        center=(0.0095, 0.0350, 0.0375),
        radii=(0.0055, 0.0036, 0.0075), u_segs=10, v_segs=6, rot_euler=(0.0, -0.25, 0.0),
    )

    # 1d. Curved Brass Trigger Guard & Double Triggers
    guard_pts = [
        (0.0, -0.002, -0.024),
        (0.0, -0.026, -0.018),
        (0.0, -0.036, 0.008),
        (0.0, -0.033, 0.034),
        (0.0, -0.016, 0.050),
        (0.0, -0.026, 0.074),
    ]
    brass.add_tube(guard_pts, 0.0048, 0.0042, u_segs=10, samples_per_seg=4, scale_xy=(1.45, 0.65))
    # Staggered twin curved coach-gun triggers inside guard
    for tx_off, tz_off, ty_top in ((0.0028, -0.002, -0.002), (-0.0028, 0.014, -0.004)):
        dark.add_tube(
            [
                (tx_off, ty_top, tz_off),
                (tx_off, ty_top - 0.014, tz_off + 0.0035),
                (tx_off, ty_top - 0.025, tz_off - 0.0040),
            ],
            0.0034, 0.0022, u_segs=8, samples_per_seg=3, scale_xy=(0.95, 1.05),
        )

    # 1e. Sculpted Walnut Pistol-Grip Buttstock ("GunWalnut") + Brass Buttplate ("GunBrass") at z = +0.16
    stock_ctrl = [
        (0.0, 0.012, 0.002),     # socketed into back of receiver
        (0.0, -0.002, 0.036),    # narrow ergonomic wrist at grip origin
        (0.0, -0.019, 0.075),    # semi-pistol grip curve
        (0.0, -0.034, 0.116),    # comb & belly expansion
        (0.0, -0.036, 0.149),    # nearly horizontal end tangent flush against brass buttplate
    ]
    stock_spine = catmull_rom_chain(stock_ctrl, samples_per_seg=4)

    def coach_stock_sec(t, theta):
        # Transitions from oval grip wrist (w=0.038, h=0.044) to deep coach buttstock (w=0.041, h=0.092)
        wrist_pinch = math.sin(min(1.0, t / 0.45) * math.pi)
        hw = 0.0205 - 0.0022 * wrist_pinch + 0.0012 * (t ** 1.4)
        hd = 0.0215 + 0.0255 * (t ** 1.35)
        ct, st = math.cos(theta), math.sin(theta)
        sx = math.copysign(abs(ct) ** 0.80, ct) * hw
        sy = math.copysign(abs(st) ** 0.82, st) * hd
        # Subtle pistol-grip swell on underside around t = 0.35..0.58
        if st < -0.2:
            swell = math.exp(-((t - 0.46) / 0.16) ** 2)
            sy -= 0.0085 * swell * ((-st) ** 1.4)
        return (sx, sy)

    walnut.add_loft(
        stock_spine, coach_stock_sec, u_segs=18, cap_start=True, cap_end=True,
        uv_u_scale=1.5, uv_v_scale=2.2, up_hint=(0.0, 1.0, 0.0),
    )

    # Sculpted curved Brass Buttplate cleanly capping buttstock right up to z = +0.160
    butt_ctrl = [
        (0.0, 0.009, 0.1545),
        (0.0, -0.037, 0.1565),
        (0.0, -0.083, 0.1545),
    ]
    butt_spine = catmull_rom_chain(butt_ctrl, samples_per_seg=4)

    def buttplate_sec(t, theta):
        arch = 1.0 - 0.22 * ((2.0 * t - 1.0) ** 2)
        hw = 0.0215 * arch
        ht = 0.0035
        ct, st = math.cos(theta), math.sin(theta)
        return (
            math.copysign(abs(ct) ** 0.76, ct) * hw,
            math.copysign(abs(st) ** 0.76, st) * ht,
        )

    brass.add_loft(
        butt_spine, buttplate_sec, u_segs=14, cap_start=True, cap_end=True,
        up_hint=(0.0, 0.0, 1.0),
    )
    # Brass buttplate heel & toe screws
    for sy_b in (-0.010, -0.068):
        dark.add_faceted_prism(
            sides=10, r_top=0.0032, r_bot=0.0032, length=0.004,
            center=(0.0, sy_b, 0.1578), rot_euler=(-math.pi * 0.5, 0.0, 0.0),
        )

    body_mesh_idx = b.add_mesh_from_parts("ShotgunBodyMesh", parts.values())
    body_node_idx = b.add_node("Body", mesh_idx=body_mesh_idx, parent_idx=root_idx)

    # 1f. Twin External Cocked Hammers ("HammerL", "HammerR")
    for h_name, side in (("HammerL", -1), ("HammerR", 1)):
        h_parts, h_gp = b.create_parts_dict()
        h_dark = h_gp(mat_dark)
        h_steel = h_gp(mat_steel)
        h_brass = h_gp(mat_brass)

        # Pivot boss & brass screw at local (0, 0, 0)
        h_dark.add_faceted_prism(
            sides=12, r_top=0.0068, r_bot=0.0068, length=0.0055,
            center=(0.0, 0.0, 0.0), rot_euler=(0.0, 0.0, math.pi * 0.5),
        )
        h_brass.add_faceted_prism(
            sides=10, r_top=0.0034, r_bot=0.0034, length=0.0070,
            center=(side * 0.0008, 0.0, 0.0), rot_euler=(0.0, 0.0, math.pi * 0.5),
        )
        # Swept S-curved cocked hammer neck & striker nose
        h_dark.add_tube(
            [
                (0.0, 0.0, 0.0),
                (-side * 0.0018, 0.014, -0.002),
                (-side * 0.0032, 0.025, 0.006),
                (-side * 0.0035, 0.031, 0.017),
            ],
            0.0048, 0.0036, u_segs=10, samples_per_seg=4, scale_xy=(0.75, 1.25),
        )
        # Striker face pointing toward firing pin
        h_steel.add_beveled_box(-side * 0.0028, 0.019, -0.009, 0.0058, 0.0095, 0.012, bevel=0.0015, rot_euler=(0.35, 0.0, 0.0))
        # Knurled rabbit-ear thumb spur
        h_steel.add_beveled_box(-side * 0.0035, 0.034, 0.021, 0.0062, 0.0052, 0.013, bevel=0.0014, rot_euler=(-0.48, 0.0, 0.0))

        h_mesh_idx = b.add_mesh_from_parts(f"{h_name}Mesh", h_parts.values())
        b.add_node(h_name, translation=(side * 0.0215, 0.015, 0.004), mesh_idx=h_mesh_idx, parent_idx=body_node_idx)

    # 1g. Child Node "MuzzlePoint" at (0.0, 0.030, -0.43)
    b.add_node("MuzzlePoint", translation=(0.0, 0.030, -0.43), parent_idx=body_node_idx)

    return b.export_glb(out_path)


# ---------------------------------------------------------------------------
# 2. assets/rifle.glb — 1873 Winchester Lever-Action Rifle
# ---------------------------------------------------------------------------

def build_rifle_glb(out_path):
    """
    Exports a detailed 1873 Winchester Lever-Action Rifle:
      - Grip/receiver near (0, 0, 0), pointing along -Z
      - World Z span: +0.18 (crescent brass buttplate) to -0.58 (muzzle)
      - Child nodes: Lever, Hammer, MuzzlePoint at (0.0, 0.036, -0.58)
    """
    b = GLBBuilder()
    mat_steel, mat_dark, mat_brass, mat_walnut, mat_copper, mat_bore = _add_shared_gun_materials(b)

    root_idx = b.add_node("RifleRoot")
    parts, gp = b.create_parts_dict()

    steel = gp(mat_steel)
    dark = gp(mat_dark)
    brass = gp(mat_brass)
    walnut = gp(mat_walnut)
    copper = gp(mat_copper)
    bore = gp(mat_bore)

    barrel_y = 0.036
    mag_y = 0.0165

    # 2a. Long Faceted Octagonal Blued Barrel ("GunSteel", sides=8, z = -0.076..-0.575)
    barrel_len = 0.499
    barrel_mid_z = -0.076 - barrel_len * 0.5
    steel.add_faceted_prism(
        sides=8,
        r_top=0.0114,    # muzzle end (-Z)
        r_bot=0.0142,    # breech end (+Z)
        length=barrel_len,
        center=(0.0, barrel_y, barrel_mid_z),
        rot_euler=(-math.pi * 0.5, 0.0, 0.0),
        twist_offset=math.pi / 8.0,  # crisp flat top, bottom, sides & 45-deg bevel flats
    )
    # Machined muzzle crown (z = -0.575..-0.580) + recessed dark .44-40 bore
    dark.add_lathe(
        [
            (0.0108, 0.0000),
            (0.0112, 0.0020),
            (0.0104, 0.0050),
            (0.0068, 0.0050),
            (0.0065, 0.0008),
        ],
        u_segs=20,
        translate=(0.0, barrel_y, -0.575),
        rot_euler=(-math.pi * 0.5, 0.0, 0.0),
    )
    bore.add_faceted_prism(
        sides=14,
        r_top=0.0066,
        r_bot=0.0066,
        length=0.016,
        center=(0.0, barrel_y, -0.571),
        rot_euler=(-math.pi * 0.5, 0.0, 0.0),
    )

    # 2b. Full-Length Under-Barrel Tubular Magazine ("GunDarkSteel") + Brass Barrel Bands
    dark.add_tube(
        [(0.0, mag_y, -0.076), (0.0, mag_y, -0.562)],
        0.0094, 0.0088, u_segs=16, samples_per_seg=3,
    )
    # Knurled brass magazine end-plug cap at front of tube
    brass.add_faceted_prism(
        sides=14, r_top=0.0094, r_bot=0.0094, length=0.011,
        center=(0.0, mag_y, -0.566), rot_euler=(-math.pi * 0.5, 0.0, 0.0),
    )

    # Two iconic figure-8 Winchester Brass Barrel Bands (fore-end cap at z=-0.278, forward band at z=-0.492)
    for z_band, band_len, w_scale in ((-0.278, 0.016, 1.08), (-0.492, 0.013, 0.96)):
        brass.add_beveled_box(
            0.0, (barrel_y + mag_y) * 0.5, z_band,
            0.0255 * w_scale, 0.0415, band_len, bevel=0.0032,
        )
        # Cross-clamp screw through barrel band web
        dark.add_faceted_prism(
            sides=10, r_top=0.0028, r_bot=0.0028, length=0.028 * w_scale,
            center=(0.0, (barrel_y + mag_y) * 0.5, z_band), rot_euler=(0.0, 0.0, math.pi * 0.5),
        )

    # 2c. Buckhorn Rear Sight (z = -0.165) + Front Shark-Fin Blade Sight (z = -0.552)
    # Dovetailed rear sight base & stepped elevator ramp
    dark.add_beveled_box(0.0, 0.0495, -0.155, 0.014, 0.0042, 0.036, bevel=0.0010)
    # Semi-buckhorn curved sight ears (left & right horns framing V-notch)
    for side in (-1, 1):
        dark.add_tube(
            [
                (side * 0.0022, 0.0510, -0.142),
                (side * 0.0068, 0.0545, -0.140),
                (side * 0.0074, 0.0595, -0.139),
                (side * 0.0036, 0.0622, -0.139),
            ],
            0.0018, 0.0013, u_segs=8, samples_per_seg=3, scale_xy=(1.2, 0.8),
        )
    # Dovetailed front sight block & gleaming brass blade
    dark.add_beveled_box(0.0, 0.0478, -0.552, 0.012, 0.0038, 0.016, bevel=0.0009)
    brass.add_beveled_box(0.0, 0.0535, -0.551, 0.0028, 0.0105, 0.013, bevel=0.0007, rot_euler=(-0.22, 0.0, 0.0))

    # 2d. Oiled Walnut Fore-End Wood ("GunWalnut", z = -0.076..-0.274)
    fore_ctrl = [
        (0.0, 0.0195, -0.076),
        (0.0, 0.0198, -0.142),
        (0.0, 0.0202, -0.212),
        (0.0, 0.0206, -0.273),
    ]
    fore_spine = catmull_rom_chain(fore_ctrl, samples_per_seg=3)

    def rifle_fore_sec(t, theta):
        taper = 1.0 - 0.14 * t
        hw = 0.0162 * taper
        hd = 0.0155 * taper
        ct, st = math.cos(theta), math.sin(theta)
        sx = math.copysign(abs(ct) ** 0.78, ct) * hw
        sy = math.copysign(abs(st) ** 0.84, st) * hd
        if st > 0.25:
            sy *= 0.72
        return (sx, sy)

    walnut.add_loft(
        fore_spine, rifle_fore_sec, u_segs=18, cap_start=True, cap_end=True,
        uv_u_scale=1.2, uv_v_scale=2.0, up_hint=(0.0, 1.0, 0.0),
    )

    # 2e. Iconic Polished "GunBrass" 1873 Winchester Receiver with Sideplates & Loading Gate
    # Main slab-sided octagonal-top brass receiver frame (z = -0.076..+0.028, y = -0.004..+0.048)
    brass.add_beveled_box(0.0, 0.022, -0.024, 0.033, 0.052, 0.104, bevel=0.0038, uv_scale=1.5)
    # Forward brass step collar meeting fore-end & barrel
    brass.add_beveled_box(0.0, 0.025, -0.071, 0.030, 0.044, 0.016, bevel=0.0028)
    # Raised Model 1873 removable sideplates on left & right receiver flats
    brass.add_beveled_box(0.0, 0.021, -0.018, 0.0365, 0.038, 0.068, bevel=0.0025)
    # Brass carrier block visible cleanly on underside of receiver ahead of lever
    brass.add_beveled_box(0.0, -0.0045, -0.032, 0.018, 0.0055, 0.054, bevel=0.0014)

    # Top ejection port & blued steel bolt + sliding Model 1873 dust cover on top rail
    dark.add_beveled_box(0.0, 0.0465, -0.012, 0.0165, 0.0065, 0.056, bevel=0.0015)
    steel.add_beveled_box(0.0, 0.0492, -0.008, 0.0195, 0.0045, 0.050, bevel=0.0014)
    # Knurled thumb serrations ridge on sliding dust cover
    dark.add_beveled_box(0.0, 0.0518, 0.006, 0.014, 0.0024, 0.014, bevel=0.0007)

    # Right-side King's Patent Loading Gate ("ladeport") with spring-steel spoon & copper cartridge rim glint
    bore.add_beveled_box(0.0176, 0.0175, -0.030, 0.0035, 0.0135, 0.034, bevel=0.0008)
    steel.add_ellipsoid(
        center=(0.0178, 0.0175, -0.028),
        radii=(0.0022, 0.0056, 0.0145), u_segs=12, v_segs=8,
    )
    copper.add_ellipsoid(
        center=(0.0172, 0.0175, -0.041),
        radii=(0.0020, 0.0042, 0.0048), u_segs=8, v_segs=6,
    )

    # Receiver sideplate screw & toggle-link cross-pins
    for sz_p, sy_p in ((-0.046, 0.026), (-0.018, 0.033), (0.012, 0.018), (-0.022, -0.001)):
        dark.add_faceted_prism(
            sides=10, r_top=0.0030, r_bot=0.0030, length=0.039,
            center=(0.0, sy_p, sz_p), rot_euler=(0.0, 0.0, math.pi * 0.5),
        )

    # Upper & lower steel receiver tangs extending back along straight-grip walnut wrist
    dark.add_beveled_box(0.0, 0.034, 0.048, 0.0135, 0.0065, 0.054, bevel=0.0015, rot_euler=(-0.27, 0.0, 0.0))
    dark.add_beveled_box(0.0, -0.008, 0.048, 0.0135, 0.0065, 0.058, bevel=0.0015, rot_euler=(-0.29, 0.0, 0.0))

    # Curved steel trigger at z = 0.010 inside the lever's front bow
    dark.add_tube(
        [(0.0, -0.003, 0.008), (0.0, -0.017, 0.012), (0.0, -0.029, 0.004)],
        0.0034, 0.0022, u_segs=8, samples_per_seg=3, scale_xy=(0.95, 1.05),
    )

    # 2f. Oiled Straight-Grip Walnut Buttstock ("GunWalnut") + Crescent Brass Buttplate at z = +0.18
    stock_ctrl = [
        (0.0, 0.014, 0.022),     # mortised into back of brass receiver
        (0.0, 0.003, 0.058),     # straight-grip carbine wrist
        (0.0, -0.014, 0.102),    # raised comb & belly sweep
        (0.0, -0.029, 0.142),    # full buttstock body
        (0.0, -0.032, 0.165),    # recessed cleanly behind crescent brass buttplate
    ]
    stock_spine = catmull_rom_chain(stock_ctrl, samples_per_seg=4)

    def winchester_stock_sec(t, theta):
        wrist_dip = math.sin(min(1.0, t / 0.42) * math.pi)
        hw = 0.0168 - 0.0018 * wrist_dip + 0.0038 * (t ** 1.35)
        hd = 0.0215 - 0.0020 * wrist_dip + 0.0285 * (t ** 1.28)
        ct, st = math.cos(theta), math.sin(theta)
        return (
            math.copysign(abs(ct) ** 0.78, ct) * hw,
            math.copysign(abs(st) ** 0.82, st) * hd,
        )

    walnut.add_loft(
        stock_spine, winchester_stock_sec, u_segs=22, cap_start=True, cap_end=True,
        uv_u_scale=1.5, uv_v_scale=2.2, up_hint=(0.0, 1.0, 0.0),
    )

    # Iconic Crescent Brass Buttplate ("GunBrass"): heel & toe sweep rearward to exact z = +0.180!
    crescent_ctrl = [
        (0.0, 0.017, 0.1755),    # sharp upper heel peak
        (0.0, -0.008, 0.1695),   # inward crescent hollow
        (0.0, -0.033, 0.1675),   # deepest shoulder pocket
        (0.0, -0.058, 0.1700),   # lower curve
        (0.0, -0.082, 0.1758),   # sharp lower toe peak (reaches z = +0.180)
    ]
    crescent_spine = catmull_rom_chain(crescent_ctrl, samples_per_seg=4)

    def crescent_sec(t, theta):
        arch = 1.0 - 0.24 * ((2.0 * t - 1.0) ** 2)
        hw = 0.0205 * arch
        ht = 0.0040
        ct, st = math.cos(theta), math.sin(theta)
        return (
            math.copysign(abs(ct) ** 0.76, ct) * hw,
            math.copysign(abs(st) ** 0.76, st) * ht,
        )

    brass.add_loft(
        crescent_spine, crescent_sec, u_segs=16, cap_start=True, cap_end=True,
        up_hint=(0.0, 0.0, 1.0),
    )
    # Upper heel tang wrap on top of buttstock
    brass.add_beveled_box(0.0, 0.0165, 0.165, 0.024, 0.0045, 0.022, bevel=0.0012, rot_euler=(-0.18, 0.0, 0.0))

    body_mesh_idx = b.add_mesh_from_parts("RifleBodyMesh", parts.values())
    body_node_idx = b.add_node("Body", mesh_idx=body_mesh_idx, parent_idx=root_idx)

    # 2g. Child Node "Lever" — Sculpted S-Loop Lever below Trigger (pivots at (0.0, -0.004, -0.022))
    lev_parts, lev_gp = b.create_parts_dict()
    l_dark = lev_gp(mat_dark)
    l_brass = lev_gp(mat_brass)

    # Closed S-loop finger bow & trigger guard loop in local coordinates relative to pivot (0, -0.004, -0.022)
    lever_bow = [
        (0.0, 0.000, 0.000),      # front hinge inside lower receiver
        (0.0, -0.025, 0.006),     # front guard drop ahead of trigger
        (0.0, -0.036, 0.030),     # bottom bow under trigger
        (0.0, -0.024, 0.048),     # S-bend dividing trigger bow from 3-finger loop
        (0.0, -0.044, 0.062),     # front of finger loop
        (0.0, -0.052, 0.088),     # bottom sweep of finger loop
        (0.0, -0.036, 0.104),     # rear turn of finger loop
        (0.0, -0.017, 0.092),     # upper return hugging lower wrist tang
        (0.0, -0.012, 0.062),     # bridge back to S-bend web
        (0.0, -0.021, 0.046),     # closes S-loop cleanly
    ]
    l_dark.add_tube(lever_bow, 0.0044, 0.0038, u_segs=10, samples_per_seg=3, scale_xy=(1.40, 0.72))
    # Rear turn-button lever latch on lower tang
    l_brass.add_faceted_prism(
        sides=10, r_top=0.0036, r_bot=0.0036, length=0.009,
        center=(0.0, -0.018, 0.098),
    )

    lev_mesh_idx = b.add_mesh_from_parts("LeverMesh", lev_parts.values())
    b.add_node("Lever", translation=(0.0, -0.004, -0.022), mesh_idx=lev_mesh_idx, parent_idx=body_node_idx)

    # 2h. Child Node "Hammer" — External Spurred Winchester Hammer at (0.0, 0.028, 0.028)
    ham_parts, ham_gp = b.create_parts_dict()
    h_dark = ham_gp(mat_dark)
    h_steel = ham_gp(mat_steel)

    h_steel.add_beveled_box(0.0, 0.014, -0.002, 0.0105, 0.028, 0.016, bevel=0.0022, rot_euler=(-0.20, 0.0, 0.0))
    h_dark.add_tube(
        [(0.0, 0.024, 0.002), (0.0, 0.031, 0.013), (0.0, 0.032, 0.025)],
        0.0044, 0.0032, u_segs=10, samples_per_seg=3, scale_xy=(1.35, 0.70),
    )
    ham_mesh_idx = b.add_mesh_from_parts("RifleHammerMesh", ham_parts.values())
    b.add_node("Hammer", translation=(0.0, 0.028, 0.028), mesh_idx=ham_mesh_idx, parent_idx=body_node_idx)

    # 2i. Child Node "MuzzlePoint" at (0.0, 0.036, -0.58)
    b.add_node("MuzzlePoint", translation=(0.0, 0.036, -0.58), parent_idx=body_node_idx)

    return b.export_glb(out_path)


# ---------------------------------------------------------------------------
# 3. assets/crossbow.glb — Vampire Hunter's Ornate Silver Crossbow
# ---------------------------------------------------------------------------

def build_crossbow_glb(out_path):
    """
    Exports a Vampire Hunter's Ornate Silver Crossbow:
      - Grip near (0, 0, 0), pointing along -Z
      - World Z span: +0.17 (stock buttcap) to -0.46 (silver broadhead tip)
      - Bow limbs span X = -0.25..+0.25 at Z = -0.34
      - Materials include GunWalnut, SilverMetal, SilverGlow (emissive=(0.45, 0.78, 1.0))
      - Child nodes: LoadedBolt, MuzzlePoint at (0.0, 0.038, -0.45)
    """
    b = GLBBuilder()
    mat_walnut = b.add_material("GunWalnut", (0.28, 0.13, 0.06), metallic=0.04, roughness=0.38)
    mat_silver = b.add_material("SilverMetal", (0.88, 0.92, 0.98), metallic=0.94, roughness=0.16)
    mat_dark = b.add_material("GunDarkSteel", (0.20, 0.23, 0.28), metallic=0.88, roughness=0.28)
    mat_brass = b.add_material("GunBrass", (0.89, 0.71, 0.34), metallic=0.92, roughness=0.18)
    mat_cord = b.add_material("BowstringCord", (0.19, 0.17, 0.15), metallic=0.05, roughness=0.78)
    mat_glow = b.add_material(
        "SilverGlow",
        base_color=(0.76, 0.92, 1.00),
        metallic=0.20,
        roughness=0.16,
        emissive=(0.45, 0.78, 1.0),
    )

    root_idx = b.add_node("CrossbowRoot")
    parts, gp = b.create_parts_dict()

    walnut = gp(mat_walnut)
    silver = gp(mat_silver)
    dark = gp(mat_dark)
    brass = gp(mat_brass)
    cord = gp(mat_cord)
    glow = gp(mat_glow)

    # 3a. Carved Dark Walnut Tiller & Cheek-Piece Stock (z = +0.166 to -0.356)
    # Forward tiller beam (z = +0.025..-0.356)
    tiller_ctrl = [
        (0.0, 0.018, 0.028),
        (0.0, 0.020, -0.095),
        (0.0, 0.021, -0.225),
        (0.0, 0.022, -0.355),
    ]
    tiller_spine = catmull_rom_chain(tiller_ctrl, samples_per_seg=4)

    def tiller_sec(t, theta):
        # Tapered gothic octagonal-chamfered beam with belly keel underneath
        hw = 0.0215 - 0.0038 * t
        hd = 0.0185 - 0.0035 * t
        ct, st = math.cos(theta), math.sin(theta)
        sx = math.copysign(abs(ct) ** 0.74, ct) * hw
        sy = math.copysign(abs(st) ** 0.78, st) * hd
        if st > 0.30:
            # Flat deck at y ~ 0.034 for silver flight groove rails
            sy = min(sy, 0.0132)
        elif st < -0.35:
            # Carved gothic keel belly peaking around mid-tiller
            keel = math.sin(t * math.pi)
            sy -= 0.0075 * keel * ((-st) ** 1.5)
        return (sx, sy)

    walnut.add_loft(
        tiller_spine, tiller_sec, u_segs=20, cap_start=True, cap_end=True,
        uv_u_scale=1.4, uv_v_scale=2.6, up_hint=(0.0, 1.0, 0.0),
    )

    # Ergonomic Carved Pistol Grip centered near (0, 0, 0) + Gothic Cheek-Piece Buttstock to z = +0.170
    grip_ctrl = [
        (0.0, 0.014, 0.004),
        (0.0, -0.020, 0.018),
        (0.0, -0.058, 0.036),
        (0.0, -0.092, 0.052),
    ]
    grip_spine = catmull_rom_chain(grip_ctrl, samples_per_seg=4)

    def cbow_grip_sec(t, theta):
        hw = 0.0168 + 0.0032 * math.sin(t * math.pi)
        hd = 0.0215 + 0.0045 * (t ** 1.3)
        ct, st = math.cos(theta), math.sin(theta)
        return (
            math.copysign(abs(ct) ** 0.78, ct) * hw,
            math.copysign(abs(st) ** 0.82, st) * hd,
        )

    walnut.add_loft(
        grip_spine, cbow_grip_sec, u_segs=18, cap_start=True, cap_end=True,
        uv_u_scale=1.0, uv_v_scale=1.5, up_hint=(0.0, 0.0, 1.0),
    )
    # Ornate silver grip pommel cap
    silver.add_beveled_box(0.0, -0.096, 0.054, 0.038, 0.011, 0.048, bevel=0.0032, rot_euler=(-0.44, 0.0, 0.0))

    # Rear carved gothic buttstock (z = +0.022..+0.164) + ornate silver buttplate reaching z = +0.170
    butt_ctrl = [
        (0.0, 0.014, 0.022),
        (0.0, 0.004, 0.072),
        (0.0, -0.012, 0.124),
        (0.0, -0.015, 0.161),
    ]
    butt_spine = catmull_rom_chain(butt_ctrl, samples_per_seg=3)

    def cbow_butt_sec(t, theta):
        arch = math.sin(t * math.pi)
        hw = 0.0195 - 0.0020 * (1.0 - t) + 0.0025 * arch
        hd = 0.0195 + 0.0225 * (t ** 1.25)
        ct, st = math.cos(theta), math.sin(theta)
        return (
            math.copysign(abs(ct) ** 0.78, ct) * hw,
            math.copysign(abs(st) ** 0.82, st) * hd,
        )

    walnut.add_loft(
        butt_spine, cbow_butt_sec, u_segs=14, cap_start=True, cap_end=True,
        uv_u_scale=1.2, uv_v_scale=1.8, up_hint=(0.0, 1.0, 0.0),
    )
    silver.add_beveled_box(0.0, -0.017, 0.167, 0.039, 0.082, 0.006, bevel=0.0022)

    # 3b. Top Silver Flight Groove, Revolving Release Nut,Bolt-Retainer Spring & Ornate Trigger Guard
    for side in (-1, 1):
        # Twin polished silver flight-track rails framing the bolt groove at y = 0.0355
        silver.add_beveled_box(side * 0.0072, 0.0352, -0.166, 0.0068, 0.0044, 0.376, bevel=0.0011, uv_scale=2.0)
    # Darkened recessed center flight groove floor
    dark.add_beveled_box(0.0, 0.0332, -0.166, 0.0082, 0.0024, 0.376, bevel=0.0005)

    # Revolving steel/silver release nut ("rolling nut") at z = 0.016 + gothic overhead bolt-clip spring
    silver.add_faceted_prism(
        sides=14, r_top=0.0105, r_bot=0.0105, length=0.016,
        center=(0.0, 0.030, 0.016), rot_euler=(0.0, 0.0, math.pi * 0.5),
    )
    # Arched silver bolt-retaining spring pressing gently over rear of bolt shaft
    silver.add_tube(
        [(0.0, 0.038, 0.038), (0.0, 0.049, 0.012), (0.0, 0.046, -0.028), (0.0, 0.0425, -0.068)],
        0.0032, 0.0020, u_segs=8, samples_per_seg=3, scale_xy=(1.6, 0.55),
    )
    # Rear folding gothic peep-sight frame + glowing rune dot
    silver.add_beveled_box(0.0, 0.049, 0.042, 0.018, 0.022, 0.0045, bevel=0.0012)
    glow.add_ellipsoid(center=(0.0, 0.055, 0.042), radii=(0.0022, 0.0022, 0.0026), u_segs=8, v_segs=6)

    # Ornate gothic silver trigger guard & S-curved trigger
    silver.add_tube(
        [
            (0.0, 0.002, -0.044),
            (0.0, -0.026, -0.034),
            (0.0, -0.036, -0.008),
            (0.0, -0.032, 0.016),
            (0.0, -0.018, 0.022),
        ],
        0.0042, 0.0038, u_segs=10, samples_per_seg=3, scale_xy=(1.45, 0.68),
    )
    dark.add_tube(
        [(0.0, 0.002, -0.006), (0.0, -0.014, -0.002), (0.0, -0.025, -0.011)],
        0.0034, 0.0022, u_segs=8, samples_per_seg=3,
    )

    # 3c. "SilverMetal" Filigree Side Plates & Raised Gothic Cross Emblems
    for side in (-1, 1):
        # Swept filigree relief sideplate along mid-tiller
        silver.add_beveled_box(side * 0.0205, 0.020, -0.085, 0.0036, 0.019, 0.145, bevel=0.0012)
        silver.add_beveled_box(side * 0.0192, 0.021, -0.225, 0.0034, 0.014, 0.088, bevel=0.0010)
        # Raised Gothic Vampire-Hunter Cross Emblem on each cheek of the stock (around z = -0.065)
        cx_e = side * 0.0226
        silver.add_beveled_box(cx_e, 0.020, -0.065, 0.0032, 0.024, 0.0052, bevel=0.0009)  # vertical cross arm
        silver.add_beveled_box(cx_e, 0.022, -0.065, 0.0032, 0.0052, 0.034, bevel=0.0009)  # longitudinal cross arm
        brass.add_ellipsoid(center=(cx_e + side * 0.0012, 0.022, -0.065), radii=(0.0018, 0.0032, 0.0032), u_segs=8, v_segs=6)
        # Consecrated glowing rune slits along forward filigree plate
        for rz in (-0.200, -0.225, -0.250):
            glow.add_beveled_box(side * 0.0208, 0.021, rz, 0.0022, 0.0032, 0.011, bevel=0.0005)

    # Heavy Forged Silver Prod-Socket Collar at z = -0.340 + Central Front Gothic Cross Crest
    silver.add_beveled_box(0.0, 0.024, -0.340, 0.052, 0.032, 0.036, bevel=0.0040)
    silver.add_beveled_box(0.0, 0.041, -0.340, 0.0065, 0.016, 0.028, bevel=0.0015)
    silver.add_beveled_box(0.0, 0.044, -0.340, 0.024, 0.0055, 0.0065, bevel=0.0015)
    glow.add_ellipsoid(center=(0.0, 0.045, -0.340), radii=(0.0032, 0.0032, 0.0042), u_segs=8, v_segs=6)

    # 3d. Swept Recurve Steel/Silver Bow Limbs at z = -0.34 (spanning exact x = -0.25..+0.25)
    for side in (-1, 1):
        limb_ctrl = [
            (side * 0.022, 0.026, -0.340),   # rooted in forged silver prod socket
            (side * 0.088, 0.027, -0.348),   # forward power arch
            (side * 0.162, 0.029, -0.312),   # inward sweep
            (side * 0.218, 0.031, -0.256),   # recurve bend
            (side * 0.248, 0.033, -0.232),   # recurve tip reaching x = ±0.250 with nock cap
        ]
        limb_spine = catmull_rom_chain(limb_ctrl, samples_per_seg=4)

        def limb_sec(t, theta):
            # Rectangular-oval prod blade: tall vertically, thin front-to-back, tapering cleanly to nock
            taper = 1.0 - 0.52 * (t ** 1.25)
            h_vert = 0.0135 * taper
            th_thick = 0.0058 * (1.0 - 0.38 * t)
            ct, st = math.cos(theta), math.sin(theta)
            # Note: along X-going spine with up_hint=(0,1,0), u_ax is ~+Y and r_ax is ~±Z
            return (
                math.copysign(abs(ct) ** 0.76, ct) * th_thick,
                math.copysign(abs(st) ** 0.78, st) * h_vert,
            )

        silver.add_loft(
            limb_spine, limb_sec, u_segs=14, cap_start=True, cap_end=True,
            uv_u_scale=1.0, uv_v_scale=2.0, up_hint=(0.0, 1.0, 0.0),
        )
        # Tempered dark spring-steel backing strip along front belly of limb
        backing_ctrl = [
            (side * 0.026, 0.026, -0.345),
            (side * 0.088, 0.027, -0.353),
            (side * 0.162, 0.029, -0.317),
            (side * 0.228, 0.032, -0.252),
        ]
        dark.add_tube(backing_ctrl, 0.0032, 0.0018, u_segs=8, samples_per_seg=3, scale_xy=(0.55, 1.65))
        # Sculpted silver horn-nock tip at x = ±0.2465..±0.2500
        silver.add_ellipsoid(
            center=(side * 0.2465, 0.0335, -0.231),
            radii=(0.0035, 0.0072, 0.0055), u_segs=8, v_segs=6,
        )

    # 3e. Taut Drawn Bowstring ("add_tube") latched into cocked release nut at z = +0.015
    cord.add_tube(
        [
            (-0.245, 0.0355, -0.230),
            (-0.122, 0.0362, -0.107),
            (0.0, 0.0368, 0.015),
            (0.122, 0.0362, -0.107),
            (0.245, 0.0355, -0.230),
        ],
        0.0021, 0.0021, u_segs=8, samples_per_seg=2,
    )
    # Reinforced center serving wrap at release nut
    dark.add_tube([(-0.022, 0.0368, -0.007), (0.0, 0.0368, 0.015), (0.022, 0.0368, -0.007)], 0.0028, 0.0028, u_segs=8, samples_per_seg=2)

    # 3f. Front Gothic Foot Stirrup (protruding forward from nose of stock to z = -0.432, behind bolt tip -0.46)
    stirrup_pts = [
        (-0.016, 0.018, -0.352),
        (-0.038, 0.012, -0.388),
        (-0.042, 0.006, -0.422),
        (0.0, 0.004, -0.434),
        (0.042, 0.006, -0.422),
        (0.038, 0.012, -0.388),
        (0.016, 0.018, -0.352),
    ]
    silver.add_tube(stirrup_pts, 0.0040, 0.0040, u_segs=10, samples_per_seg=3, scale_xy=(1.25, 0.85))

    body_mesh_idx = b.add_mesh_from_parts("CrossbowBodyMesh", parts.values())
    body_node_idx = b.add_node("Body", mesh_idx=body_mesh_idx, parent_idx=root_idx)

    # 3g. Child Node "LoadedBolt" — Gleaming Silver Shaft + Faceted Silver Broadhead + "SilverGlow" Runes
    # Positioned at (0.0, 0.038, 0.0) so bolt sits right in the top flight groove & tip reaches z = -0.460!
    bolt_parts, bolt_gp = b.create_parts_dict()
    b_silver = bolt_gp(mat_silver)
    b_dark = bolt_gp(mat_dark)
    b_glow = bolt_gp(mat_glow)

    # Gleaming cylindrical silver bolt shaft (z = +0.014 rear nock to -0.396 broadhead ferrule)
    b_silver.add_tube(
        [(0.0, 0.0, 0.014), (0.0, 0.0, -0.396)],
        0.0040, 0.0038, u_segs=12, samples_per_seg=2,
    )
    # Glowing "SilverGlow" consecrated rune rings etched along the silver shaft
    for rz_b in (-0.115, -0.195, -0.275, -0.355):
        b_glow.add_faceted_prism(
            sides=12, r_top=0.0044, r_bot=0.0044, length=0.0075,
            center=(0.0, 0.0, rz_b), rot_euler=(-math.pi * 0.5, 0.0, 0.0),
        )

    # Three swept dark-steel/silver fletching vanes near rear of shaft (60°, 180° avoided in groove -> -60°, +60°, +180° top)
    for vang in (0.0, 2.0944, -2.0944):
        # vang=0 points +Y (top dorsal vane), ±120 deg clear the flight groove rails cleanly!
        vx = math.sin(vang) * 0.0072
        vy = math.cos(vang) * 0.0072
        b_dark.add_beveled_box(
            vx, vy, -0.042,
            0.0016, 0.0115, 0.068,
            bevel=0.0004,
            rot_euler=(0.0, 0.0, -vang),
        )

    # Conical collared ferrule (z = -0.392..-0.408)
    b_silver.add_faceted_prism(
        sides=8, r_top=0.0056, r_bot=0.0045, length=0.016,
        center=(0.0, 0.0, -0.400), rot_euler=(-math.pi * 0.5, 0.0, 0.0),
    )
    # Razor-sharp 4-bladed faceted Silver Broadhead reaching exact z = -0.460!
    # Main diamond core spearhead
    b_silver.add_faceted_prism(
        sides=4, r_top=0.0009, r_bot=0.0125, length=0.054,
        center=(0.0, 0.0, -0.433), rot_euler=(-math.pi * 0.5, 0.0, 0.0),
    )
    # Crossed secondary razor barbs rotated 45 deg
    b_silver.add_faceted_prism(
        sides=4, r_top=0.0008, r_bot=0.0095, length=0.048,
        center=(0.0, 0.0, -0.432), rot_euler=(-math.pi * 0.5, 0.0, 0.0), twist_offset=math.pi * 0.25,
    )
    # Glowing "SilverGlow" consecrated rune core inside broadhead fuller
    b_glow.add_faceted_prism(
        sides=4, r_top=0.0014, r_bot=0.0054, length=0.036,
        center=(0.0, 0.0, -0.425), rot_euler=(-math.pi * 0.5, 0.0, 0.0), twist_offset=math.pi * 0.25,
    )

    bolt_mesh_idx = b.add_mesh_from_parts("LoadedBoltMesh", bolt_parts.values())
    b.add_node("LoadedBolt", translation=(0.0, 0.038, 0.0), mesh_idx=bolt_mesh_idx, parent_idx=body_node_idx)

    # 3h. Child Node "MuzzlePoint" at (0.0, 0.038, -0.45)
    b.add_node("MuzzlePoint", translation=(0.0, 0.038, -0.45), parent_idx=body_node_idx)

    return b.export_glb(out_path)


# ---------------------------------------------------------------------------
# 4. assets/dynamite.glb — 3-Stick Western Dynamite Bundle
# ---------------------------------------------------------------------------

def build_dynamite_glb(out_path):
    """
    Exports a 3-Stick Western Dynamite Bundle:
      - Held upright / slightly tilted forward around (0, 0, 0)
      - World Y span: -0.11 (bottom crimped ends) to +0.15 (glowing FuseSpark top)
      - Materials include DynamiteRed, GunBrass, FuseSpark (emissive=(1.0, 0.62, 0.12))
      - Child node: FuseTip at (0.0, 0.148, -0.02)
    """
    b = GLBBuilder()
    mat_red = b.add_material("DynamiteRed", (0.76, 0.12, 0.10), metallic=0.02, roughness=0.72)
    mat_crimp = b.add_material("DynamiteWaxCrimp", (0.56, 0.10, 0.08), metallic=0.04, roughness=0.58)
    mat_label = b.add_material("ParchmentLabel", (0.85, 0.76, 0.57), metallic=0.01, roughness=0.80)
    mat_leather = b.add_material("StrapLeather", (0.16, 0.09, 0.05), metallic=0.04, roughness=0.68)
    mat_brass = b.add_material("GunBrass", (0.89, 0.71, 0.34), metallic=0.92, roughness=0.18)
    mat_fuse = b.add_material("FuseCord", (0.27, 0.22, 0.16), metallic=0.02, roughness=0.86)
    mat_char = b.add_material("FuseChar", (0.09, 0.07, 0.06), metallic=0.05, roughness=0.92)
    mat_spark = b.add_material(
        "FuseSpark",
        base_color=(1.00, 0.88, 0.44),
        metallic=0.0,
        roughness=0.15,
        emissive=(1.0, 0.62, 0.12),
    )

    root_idx = b.add_node("DynamiteRoot")
    parts, gp = b.create_parts_dict()

    red = gp(mat_red)
    crimp = gp(mat_crimp)
    label = gp(mat_label)
    leather = gp(mat_leather)
    brass = gp(mat_brass)
    fuse = gp(mat_fuse)
    char = gp(mat_char)

    # Slight ergonomic forward tilt (-0.065 rad around X) baked cleanly around (0, 0, 0)
    # so FuseTip at (0.0, 0.148, -0.02) aligns naturally in world & local space!
    tilt_x = -0.065
    q_tilt = quat_from_euler_xyz(tilt_x, 0.0, 0.0)

    def tilt_pt(x, y, z):
        return quat_rotate_vec(q_tilt, (x, y, z))

    # Tightly nested 3-stick trefoil cluster in local XY cross-section (stick radius = 0.0172)
    stick_r = 0.0172
    cluster_r = stick_r / math.cos(math.pi / 6.0)  # ~0.01986 -> tangent sticks!
    # 1 stick forward (-Z), 2 sticks rear-left & rear-right (+Z)
    stick_offsets = [
        (0.0, -cluster_r),
        (-stick_r, cluster_r * 0.5),
        (stick_r, cluster_r * 0.5),
    ]

    # 4a. Three Crimson Wax-Paper Sticks + Star-Crimped Ends + Tan Parchment Label Bands
    # Stick body spans local y = -0.104..+0.099; crimped wax ends extend to -0.110 and +0.1035
    stick_spine_local = [(0.0, -0.104 + (k / 8.0) * 0.203, 0.0) for k in range(9)]

    def wax_stick_sec(t, theta):
        # Subtle organic hand-rolled dynamite stick profile with slight waist under the two leather straps
        strap1 = math.exp(-((t - 0.26) / 0.065) ** 2)
        strap2 = math.exp(-((t - 0.74) / 0.065) ** 2)
        end_round = 1.0 - 0.05 * (max(0.0, abs(2.0 * t - 1.0) - 0.85) / 0.15) ** 2
        r = stick_r * end_round - 0.00055 * (strap1 + strap2)
        return (math.cos(theta) * r, math.sin(theta) * r)

    def crimp_cap_deform(x, yy, z, ang):
        # 8-fold twisted paper crimp creases on stick ends
        fold = 1.0 + 0.075 * math.cos(ang * 8.0) * min(1.0, abs(yy) / 0.004)
        return (x * fold, yy, z * fold)

    cap_top_centers = []
    for ox, oz in stick_offsets:
        red.add_loft(
            stick_spine_local,
            wax_stick_sec,
            u_segs=22,
            cap_start=False,
            cap_end=False,
            uv_u_scale=1.0,
            uv_v_scale=2.0,
            translate=tilt_pt(ox, 0.0, oz),
            rot_euler=(tilt_x, 0.0, 0.0),
            up_hint=(0.0, 0.0, 1.0),
        )

        # Top folded wax-paper star crimp (local y = +0.099..+0.1035)
        crimp.add_lathe(
            [
                (stick_r * 0.96, 0.0000),
                (stick_r * 0.86, 0.0024),
                (stick_r * 0.56, 0.0042),
                (stick_r * 0.24, 0.0022),
                (0.0022, 0.0032),
            ],
            u_segs=16,
            translate=tilt_pt(ox, 0.099, oz),
            rot_euler=(tilt_x, 0.0, 0.0),
            deform_fn=crimp_cap_deform,
        )

        # Bottom folded wax-paper star crimp (local y = -0.104..-0.1085 -> world y min = -0.110)
        crimp.add_lathe(
            [
                (0.0022, -0.0034),
                (stick_r * 0.28, -0.0024),
                (stick_r * 0.62, -0.0043),
                (stick_r * 0.88, -0.0024),
                (stick_r * 0.96, 0.0000),
            ],
            u_segs=16,
            translate=tilt_pt(ox, -0.104, oz),
            rot_euler=(tilt_x, 0.0, 0.0),
            deform_fn=crimp_cap_deform,
        )

        # Tan parchment printed label band around middle of each stick (local y = -0.016..+0.024)
        label.add_lathe(
            [
                (stick_r + 0.0001, -0.020),
                (stick_r + 0.0005, -0.018),
                (stick_r + 0.0005, 0.018),
                (stick_r + 0.0001, 0.020),
            ],
            u_segs=20,
            translate=tilt_pt(ox, 0.003, oz),
            rot_euler=(tilt_x, 0.0, 0.0),
        )
        # Thin dark printed warning border stripes on parchment band
        for ly_stripe in (-0.010, 0.016):
            leather.add_lathe(
                [
                    (stick_r + 0.0005, ly_stripe - 0.0018),
                    (stick_r + 0.0008, ly_stripe),
                    (stick_r + 0.0005, ly_stripe + 0.0018),
                ],
                u_segs=18,
                translate=tilt_pt(ox, 0.0, oz),
                rot_euler=(tilt_x, 0.0, 0.0),
            )

        # Brass blasting-cap ferrule pressed into top center of each stick
        brass.add_faceted_prism(
            sides=10, r_top=0.0034, r_bot=0.0038, length=0.010,
            center=tilt_pt(ox, 0.104, oz), rot_euler=(tilt_x, 0.0, 0.0),
        )
        cap_top_centers.append(tilt_pt(ox, 0.107, oz))

    # 4b. Two Tight Dark Leather Straps + Small Brass Buckles Wrapping the Trefoil Perimeter
    # Exact convex hull perimeter around the 3 circle centers (radius = stick_r + strap_half_thick)
    hull_pts_xz = []
    # Arc order around the 3 sticks (front -> rear-right -> rear-left) so convex hull wraps tightly
    arc_defs = [
        ((0.0, -cluster_r), -math.pi * 5.0 / 6.0, -math.pi * 1.0 / 6.0),       # front stick (-Z)
        ((stick_r, cluster_r * 0.5), -math.pi * 1.0 / 6.0, math.pi * 0.5),     # rear-right stick
        ((-stick_r, cluster_r * 0.5), math.pi * 0.5, math.pi * 7.0 / 6.0),     # rear-left stick
    ]
    r_belt = stick_r + 0.0018
    for (cx_s, cz_s), a0, a1 in arc_defs:
        for step in range(7):
            ang = a0 + (a1 - a0) * (step / 6.0)
            hull_pts_xz.append((cx_s + math.cos(ang) * r_belt, cz_s + math.sin(ang) * r_belt))
    hull_pts_xz.append(hull_pts_xz[0])

    for strap_y in (-0.052, 0.048):
        strap_loop = [tilt_pt(px, strap_y, pz) for (px, pz) in hull_pts_xz]
        leather.add_tube(
            strap_loop,
            0.0022, 0.0022,
            u_segs=8,
            samples_per_seg=1,
            cap_start=False,
            cap_end=False,
            scale_xy=(0.65, 2.85),  # wide flat saddle-leather strap band!
        )

        # Small rectangular Brass Buckle + center tongue + leather strap keeper on front-right flat
        bk_pos = tilt_pt(0.0155, strap_y, -0.0165)
        bk_rot = (tilt_x, -0.52, 0.0)
        # Outer brass buckle frame (top, bottom, left, right bars for authentic open buckle look!)
        brass.add_beveled_box(
            *tilt_pt(0.0155, strap_y + 0.0062, -0.0170),
            0.014, 0.0024, 0.0032, bevel=0.0006, rot_euler=bk_rot,
        )
        brass.add_beveled_box(
            *tilt_pt(0.0155, strap_y - 0.0062, -0.0170),
            0.014, 0.0024, 0.0032, bevel=0.0006, rot_euler=bk_rot,
        )
        for b_side in (-1, 1):
            brass.add_beveled_box(
                *tilt_pt(0.0155 + b_side * 0.0056, strap_y, -0.0170 + b_side * 0.0032),
                0.0024, 0.0145, 0.0032, bevel=0.0006, rot_euler=bk_rot,
            )
        # Brass buckle pin/tongue
        brass.add_beveled_box(
            *tilt_pt(0.0162, strap_y, -0.0178),
            0.0085, 0.0022, 0.0036, bevel=0.0005, rot_euler=bk_rot,
        )
        # Tucked leather strap tail & keeper loop beside buckle
        leather.add_beveled_box(
            *tilt_pt(0.0245, strap_y, -0.0095),
            0.0038, 0.0142, 0.0055, bevel=0.0008, rot_euler=bk_rot,
        )

    # 4c. Three Tributary Fuse Strands Twisting into Main Braided Curving Fuse Cord -> (0.0, 0.148, -0.02)
    knot_pt = tilt_pt(0.0, 0.118, -0.001)
    for c_pt in cap_top_centers:
        mid_pt = (
            (c_pt[0] + knot_pt[0]) * 0.5,
            c_pt[1] + 0.0065,
            (c_pt[2] + knot_pt[2]) * 0.5,
        )
        fuse.add_tube([c_pt, mid_pt, knot_pt], 0.0024, 0.0021, u_segs=8, samples_per_seg=3)

    # Brass crimp collar gathering the 3 fuses
    brass.add_faceted_prism(
        sides=10, r_top=0.0042, r_bot=0.0046, length=0.0065,
        center=knot_pt, rot_euler=(-0.32, 0.0, 0.0),
    )

    # Braided main fuse cord sweeping organically up and forward into FuseTip at (0.0, 0.148, -0.020)
    main_fuse_ctrl = [
        knot_pt,
        (0.0025, 0.128, -0.011),
        (0.0015, 0.139, -0.016),
        (0.0, 0.1465, -0.0195),
    ]
    main_fuse_spine = catmull_rom_chain(main_fuse_ctrl, samples_per_seg=5)

    def braided_fuse_sec(t, theta):
        # 3-strand helical rope twist sculpted directly into cross-section!
        braid = 1.0 + 0.14 * math.cos(theta * 3.0 + t * math.pi * 10.0)
        r = (0.0033 - 0.0005 * t) * braid
        return (math.cos(theta) * r, math.sin(theta) * r)

    fuse.add_loft(
        main_fuse_spine, braided_fuse_sec, u_segs=14, cap_start=True, cap_end=True,
        uv_u_scale=1.0, uv_v_scale=2.5, up_hint=(0.0, 0.0, 1.0),
    )
    # Charred black powder neck right below glowing FuseTip
    char.add_faceted_prism(
        sides=10, r_top=0.0024, r_bot=0.0030, length=0.0045,
        center=(0.0, 0.1468, -0.0196), rot_euler=(-0.35, 0.0, 0.0),
    )

    body_mesh_idx = b.add_mesh_from_parts("DynamiteBodyMesh", parts.values())
    body_node_idx = b.add_node("Body", mesh_idx=body_mesh_idx, parent_idx=root_idx)

    # 4d. Child Node "FuseTip" at (0.0, 0.148, -0.02) with Glowing "FuseSpark" Core
    tip_parts, tip_gp = b.create_parts_dict()
    t_spark = tip_gp(mat_spark)

    # Incandescent glowing ember core (top reaches y = 0.148 + 0.0025 = 0.1505 ~ +0.15)
    t_spark.add_ellipsoid(
        center=(0.0, -0.0008, 0.0),
        radii=(0.0036, 0.0030, 0.0036),
        u_segs=12,
        v_segs=8,
    )
    # Crisp 3D starburst spark needles radiating from burning powder core
    spark_dirs = [
        (0.88, 0.28, 0.38),
        (-0.86, 0.30, 0.41),
        (0.35, 0.30, -0.88),
        (-0.40, 0.28, -0.87),
        (0.55, -0.45, 0.70),
        (-0.58, -0.42, -0.69),
    ]
    for dx, dy, dz in spark_dirs:
        d_u = v_norm((dx, dy, dz))
        t_spark.add_tube(
            [(0.0, -0.0005, 0.0), (d_u[0] * 0.0060, d_u[1] * 0.0048 - 0.0005, d_u[2] * 0.0060)],
            0.0012, 0.0005, u_segs=6, samples_per_seg=1,
        )

    tip_mesh_idx = b.add_mesh_from_parts("FuseTipMesh", tip_parts.values())
    b.add_node("FuseTip", translation=(0.0, 0.148, -0.02), mesh_idx=tip_mesh_idx, parent_idx=body_node_idx)

    return b.export_glb(out_path)


# ---------------------------------------------------------------------------
# Strict Binary .glb Integrity, World Bounds & Zero-Degenerate Validator
# ---------------------------------------------------------------------------

def _verify_glb(filepath, expected_nodes=(), expected_materials=()):
    with open(filepath, "rb") as f:
        raw = f.read()
    magic, version, total_len = struct.unpack_from("<III", raw, 0)
    assert magic == 0x46546C67 and version == 2 and total_len == len(raw), f"Invalid GLB header in {filepath}"

    json_len, json_type = struct.unpack_from("<II", raw, 12)
    assert json_type == 0x4E4F534A
    gltf = json.loads(raw[20 : 20 + json_len].decode("utf-8"))

    bin_off = 20 + json_len
    bin_len, bin_type = struct.unpack_from("<II", raw, bin_off)
    assert bin_type == 0x004E4942
    bin_buf = raw[bin_off + 8 : bin_off + 8 + bin_len]

    node_names = {n.get("name") for n in gltf.get("nodes", [])}
    mat_names = {m.get("name") for m in gltf.get("materials", [])}
    for req_n in expected_nodes:
        assert req_n in node_names, f"Missing node '{req_n}' in {filepath} (got {node_names})"
    for req_m in expected_materials:
        assert req_m in mat_names, f"Missing material '{req_m}' in {filepath} (got {mat_names})"

    nodes = gltf["nodes"]
    parents = {}
    for p_idx, nd in enumerate(nodes):
        for ch_idx in nd.get("children", []):
            parents[ch_idx] = p_idx

    def world_point(node_idx, pt):
        cur = node_idx
        p = pt
        while cur is not None:
            nd = nodes[cur]
            sc = nd.get("scale", [1.0, 1.0, 1.0])
            p = (p[0] * sc[0], p[1] * sc[1], p[2] * sc[2])
            if "rotation" in nd:
                p = quat_rotate_vec(tuple(nd["rotation"]), p)
            if "translation" in nd:
                tr = nd["translation"]
                p = (p[0] + tr[0], p[1] + tr[1], p[2] + tr[2])
            cur = parents.get(cur)
        return p

    bvs = gltf["bufferViews"]
    accs = gltf["accessors"]
    w_min = [1e9, 1e9, 1e9]
    w_max = [-1e9, -1e9, -1e9]
    degen_normals = 0
    degen_tris = 0

    mesh_to_nodes = {}
    for ni, nd in enumerate(nodes):
        if "mesh" in nd:
            mesh_to_nodes.setdefault(nd["mesh"], []).append(ni)

    for mi, mesh in enumerate(gltf.get("meshes", [])):
        n_list = mesh_to_nodes.get(mi, [None])
        for prim in mesh["primitives"]:
            p_acc = accs[prim["attributes"]["POSITION"]]
            n_acc = accs[prim["attributes"]["NORMAL"]]
            i_acc = accs[prim["indices"]]

            p_bv = bvs[p_acc["bufferView"]]
            n_bv = bvs[n_acc["bufferView"]]
            i_bv = bvs[i_acc["bufferView"]]

            v_cnt = p_acc["count"]
            verts = [struct.unpack_from("<fff", bin_buf, p_bv["byteOffset"] + k * 12) for k in range(v_cnt)]
            nrms = [struct.unpack_from("<fff", bin_buf, n_bv["byteOffset"] + k * 12) for k in range(v_cnt)]

            for nx, ny, nz in nrms:
                ln = math.sqrt(nx * nx + ny * ny + nz * nz)
                if math.isnan(ln) or abs(ln - 1.0) > 1e-3:
                    degen_normals += 1

            fmt = "<H" if i_acc["componentType"] == 5123 else "<I"
            step = 2 if i_acc["componentType"] == 5123 else 4
            idxs = [struct.unpack_from(fmt, bin_buf, i_bv["byteOffset"] + k * step)[0] for k in range(i_acc["count"])]

            for t in range(0, len(idxs), 3):
                a, b_p, c = verts[idxs[t]], verts[idxs[t + 1]], verts[idxs[t + 2]]
                area2 = v_len(v_cross(v_sub(b_p, a), v_sub(c, a)))
                if area2 < 1e-11:
                    degen_tris += 1

            for ni in n_list:
                for vp in verts:
                    wp = world_point(ni, vp) if ni is not None else vp
                    for k in range(3):
                        w_min[k] = min(w_min[k], wp[k])
                        w_max[k] = max(w_max[k], wp[k])

    assert degen_normals == 0, f"{degen_normals} degenerate normals in {filepath}"
    assert degen_tris == 0, f"{degen_tris} degenerate zero-area triangles in {filepath}"
    return {
        "bounds_min": [round(v, 4) for v in w_min],
        "bounds_max": [round(v, 4) for v in w_max],
        "degen_normals": degen_normals,
        "degen_tris": degen_tris,
    }


__all__ = [
    "build_shotgun_glb",
    "build_rifle_glb",
    "build_crossbow_glb",
    "build_dynamite_glb",
]


if __name__ == "__main__":
    assets_dir = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "assets"))
    os.makedirs(assets_dir, exist_ok=True)

    shotgun_path = os.path.join(assets_dir, "shotgun.glb")
    rifle_path = os.path.join(assets_dir, "rifle.glb")
    crossbow_path = os.path.join(assets_dir, "crossbow.glb")
    dynamite_path = os.path.join(assets_dir, "dynamite.glb")

    sg_stats = build_shotgun_glb(shotgun_path)
    sg_chk = _verify_glb(
        shotgun_path,
        expected_nodes=("ShotgunRoot", "Body", "HammerL", "HammerR", "MuzzlePoint"),
        expected_materials=("GunSteel", "GunDarkSteel", "GunBrass", "GunWalnut", "GunCopper", "GunBoreDark"),
    )

    rf_stats = build_rifle_glb(rifle_path)
    rf_chk = _verify_glb(
        rifle_path,
        expected_nodes=("RifleRoot", "Body", "Lever", "Hammer", "MuzzlePoint"),
        expected_materials=("GunSteel", "GunDarkSteel", "GunBrass", "GunWalnut", "GunCopper", "GunBoreDark"),
    )

    cb_stats = build_crossbow_glb(crossbow_path)
    cb_chk = _verify_glb(
        crossbow_path,
        expected_nodes=("CrossbowRoot", "Body", "LoadedBolt", "MuzzlePoint"),
        expected_materials=("GunWalnut", "SilverMetal", "GunDarkSteel", "GunBrass", "SilverGlow"),
    )

    dy_stats = build_dynamite_glb(dynamite_path)
    dy_chk = _verify_glb(
        dynamite_path,
        expected_nodes=("DynamiteRoot", "Body", "FuseTip"),
        expected_materials=("DynamiteRed", "ParchmentLabel", "StrapLeather", "GunBrass", "FuseCord", "FuseSpark"),
    )

    for label, st, chk in (
        ("shotgun.glb", sg_stats, sg_chk),
        ("rifle.glb", rf_stats, rf_chk),
        ("crossbow.glb", cb_stats, cb_chk),
        ("dynamite.glb", dy_stats, dy_chk),
    ):
        print(
            f"[OK] {label:14s} | {st['triangles']:5d} tris | {st['vertices']:5d} verts | {st['bytes']:7d} B | "
            f"bounds min={chk['bounds_min']} max={chk['bounds_max']} | degen={chk['degen_normals']}/{chk['degen_tris']}"
        )
    for label, st in (
        ("shotgun.glb", sg_stats),
        ("rifle.glb", rf_stats),
        ("crossbow.glb", cb_stats),
        ("dynamite.glb", dy_stats),
    ):
        assert 2500 <= st["triangles"] <= 6500, (
            f"{label} triangle count {st['triangles']} outside target 2500..6500 range"
        )
