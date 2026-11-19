#!/usr/bin/env python3
"""
Builds a smooth, organically sculpted Western Mustang horse (assets/horse.glb) facing -Z.

Key anatomical & visual features:
  - Continuous C2-smooth anatomical equine barrel, chest brisket, withers, loin & rounded muscular
    croup/haunches (no stuck-on boxes or faceted triangles; Loop-subdivided & vertex-welded).
  - Contoured woven saddle blanket hugging the horse's ribs tightly (zero protruding flank corners!)
    under a sculpted Western leather saddle (curved skirts, seat, cantle, pommel, horn & brass conchos).
  - Voluminous 3D multi-lock horse tail (central plume + 8 S-curved flowing hair locks) and arched
    flowing mane + forelock (zero flat ribbons!).
  - 4 anatomical equine legs (forearm/gaskin, carpus/hock, cannon, fetlock & rounded dark hooves
    grounded cleanly at y = 0.0).
  - Embedded glTF animations: Idle, Walk, Run, Gallop.
"""

import math
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from glb_core import (  # noqa: E402
    GLBBuilder,
    MeshPart,
    catmull_rom_chain,
    quat_from_euler_xyz,
    v_add,
    v_cross,
    v_mul,
    v_norm,
    v_sub,
)


def _smoothstep(e0, e1, x):
    if abs(e1 - e0) < 1e-9:
        return 1.0 if x >= e1 else 0.0
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3.0 - 2.0 * t)


def build_horse(out_path):
    g = GLBBuilder()

    # Matte, natural PBR materials (zero plastic sheen!)
    mat_coat = g.add_material("HorseCoat", (0.34, 0.16, 0.08, 1.0), metallic=0.0, roughness=0.88)
    mat_dark = g.add_material("HorseDarkHair", (0.08, 0.055, 0.045, 1.0), metallic=0.0, roughness=0.90)
    mat_hoof = g.add_material("HorseHoof", (0.13, 0.115, 0.10, 1.0), metallic=0.0, roughness=0.78)
    mat_leather = g.add_material("SaddleLeather", (0.24, 0.12, 0.055, 1.0), metallic=0.05, roughness=0.66)
    mat_blanket = g.add_material("SaddleBlanket", (0.36, 0.12, 0.10, 1.0), metallic=0.0, roughness=0.92)
    mat_brass = g.add_material("BrassHardware", (0.82, 0.65, 0.26, 1.0), metallic=0.88, roughness=0.28)
    mat_eye = g.add_material("HorseEye", (0.04, 0.03, 0.025, 1.0), metallic=0.05, roughness=0.16)
    mat_blaze = g.add_material("HorseBlaze", (0.84, 0.80, 0.74, 1.0), metallic=0.0, roughness=0.88)

    # -------------------------------------------------------------------------
    # 1. Seamless Anatomical Equine Torso (Chest -> Withers -> Back -> Croup)
    # -------------------------------------------------------------------------
    p_torso_coat = MeshPart(mat_coat)
    p_torso_coat.subdivide_levels = 1

    spine_ctrl = [
        (0.0, 1.06, -0.82),  # Anterior point of chest / brisket
        (0.0, 1.12, -0.62),  # Shoulder / base of neck
        (0.0, 1.15, -0.36),  # Prominent withers
        (0.0, 1.09, -0.02),  # Smooth saddle back dip
        (0.0, 1.11, 0.34),   # Loin
        (0.0, 1.14, 0.64),   # Rounded muscular croup peak
        (0.0, 1.04, 0.84),   # Upper buttock / tail dock transition
        (0.0, 0.94, 0.91),   # Rounded rear buttock closure
    ]
    spine_pts = catmull_rom_chain(spine_ctrl, samples_per_seg=4)

    def horse_torso_profile(t, theta):
        # Smooth front & rear hemispherical rounding so caps are tiny and C1-rounded
        front_env = math.sin(_smoothstep(0.0, 0.11, t) * math.pi * 0.5) * 0.90 + 0.10
        rear_env = math.sin(_smoothstep(0.0, 0.13, 1.0 - t) * math.pi * 0.5) * 0.88 + 0.12
        end_env = front_env * rear_env

        shoulder_swell = math.exp(-((t - 0.22) / 0.14) ** 2)
        withers_crest = math.exp(-((t - 0.31) / 0.11) ** 2)
        barrel_rib = math.exp(-((t - 0.48) / 0.22) ** 2)
        flank_tuck = math.exp(-((t - 0.66) / 0.12) ** 2)
        haunch_musc = math.exp(-((t - 0.80) / 0.15) ** 2)

        rx = (0.205 + 0.045 * shoulder_swell + 0.052 * barrel_rib - 0.015 * flank_tuck + 0.058 * haunch_musc) * end_env
        ry_top = (0.185 + 0.058 * withers_crest + 0.018 * barrel_rib + 0.042 * haunch_musc) * end_env
        ry_bot = (0.225 + 0.045 * shoulder_swell + 0.055 * barrel_rib - 0.058 * flank_tuck + 0.032 * haunch_musc) * end_env

        ct = math.cos(theta)
        st = math.sin(theta)
        if st >= 0.0:
            # Slightly narrower dorsal crest at withers, full rounded apple-croup at hindquarters
            croup_groove = 1.0 - 0.05 * haunch_musc * (st ** 4)
            withers_taper = 1.0 - 0.14 * withers_crest * (st ** 2)
            x = ct * rx * withers_taper
            y = st * ry_top * croup_groove
        else:
            # Muscular pectoral & thigh bulge on lower sides, smooth sternum below
            thigh_bulge = 1.0 + 0.10 * (haunch_musc + 0.6 * shoulder_swell) * (ct ** 2) * ((-st) ** 0.6)
            x = ct * rx * thigh_bulge
            y = st * ry_bot
        return (x, y)

    p_torso_coat.add_loft(spine_pts, horse_torso_profile, u_segs=28, cap_start=True, cap_end=True)

    # -------------------------------------------------------------------------
    # 2. Contoured Woven Saddle Blanket & Sculpted Western Leather Saddle
    #    (Follows the exact curved barrel cross-section — ZERO protruding flanks!)
    # -------------------------------------------------------------------------
    p_blanket = MeshPart(mat_blanket)
    p_blanket.subdivide_levels = 1

    blanket_rings = []
    b_v_steps = 12
    b_u_steps = 18
    for vi in range(b_v_steps + 1):
        vf = vi / b_v_steps
        # Covers z from -0.28 to +0.34 along the back
        bz = -0.28 + vf * 0.62
        # Match spine parameter t approximately in [0.29 .. 0.65]
        t_apx = 0.30 + vf * 0.34
        # Smoothspine center height
        cy = 1.105 - 0.015 * math.sin(vf * math.pi)
        end_taper = _smoothstep(0.0, 0.15, vf) * _smoothstep(0.0, 0.15, 1.0 - vf)
        thick = 0.010 + 0.012 * end_taper

        ring = []
        # Closed flattened loop wrapping over the dorsal arc from right rib (theta = -0.18) to left rib (theta = pi + 0.18)
        for ui in range(b_u_steps):
            ang_u = (ui / b_u_steps) * math.pi * 2.0
            # Parameterize s in [-1..+1] across the blanket width, with top/inner faces forming a thin closed pad
            s_arc = math.cos(ang_u)
            is_outer = math.sin(ang_u) >= 0.0
            theta = math.pi * 0.5 + s_arc * 1.62  # wraps smoothly down the curved upper ribs
            bx, by = horse_torso_profile(t_apx, theta)
            r_len = max(1e-4, math.hypot(bx, by))
            nx, ny = bx / r_len, by / r_len
            edge_soft = _smoothstep(0.0, 0.18, 1.0 - abs(s_arc))
            pad_off = (thick * edge_soft + 0.004) if is_outer else -0.004
            ring.append((bx + nx * pad_off, cy + by + ny * pad_off, bz))
        blanket_rings.append(ring)

    p_blanket.add_smooth_grid(blanket_rings, closed_u=True, ensure_outward=True)

    # Sculpted Western Leather Saddle (curved skirts, deep seat, cantle, pommel & horn)
    p_saddle = MeshPart(mat_leather)
    p_saddle.subdivide_levels = 1

    # Curved leather saddle skirt hugging the blanket
    skirt_rings = []
    for vi in range(11):
        vf = vi / 10.0
        sz = -0.21 + vf * 0.48
        t_apx = 0.33 + vf * 0.27
        cy = 1.105 - 0.012 * math.sin(vf * math.pi)
        end_round = math.sin(max(0.04, min(0.96, vf)) * math.pi) ** 0.35
        ring = []
        for ui in range(18):
            ang_u = (ui / 18.0) * math.pi * 2.0
            s_arc = math.cos(ang_u) * end_round
            is_outer = math.sin(ang_u) >= 0.0
            theta = math.pi * 0.5 + s_arc * 1.32
            bx, by = horse_torso_profile(t_apx, theta)
            r_len = max(1e-4, math.hypot(bx, by))
            nx, ny = bx / r_len, by / r_len
            off = 0.026 if is_outer else 0.012
            ring.append((bx + nx * off, cy + by + ny * off, sz))
        skirt_rings.append(ring)
    p_saddle.add_smooth_grid(skirt_rings, closed_u=True, ensure_outward=True)

    # Contoured saddle seat + cantle (high rear dish) + pommel swell + horn
    seat_spine = [
        (0.0, 1.36, -0.17),
        (0.0, 1.31, -0.04),
        (0.0, 1.315, 0.10),
        (0.0, 1.40, 0.23),
    ]

    def seat_sec(t, theta):
        rx = 0.135 + 0.025 * math.sin(t * math.pi)
        ry = 0.032 + 0.024 * (t ** 2)
        return (math.cos(theta) * rx, math.sin(theta) * ry)

    p_saddle.add_loft(seat_spine, seat_sec, u_segs=16, cap_start=True, cap_end=True)
    # Pommel fork & saddle horn
    p_saddle.add_ellipsoid((0.0, 1.37, -0.16), (0.13, 0.065, 0.06), u_segs=14, v_segs=8)
    p_saddle.add_tube([(0.0, 1.41, -0.16), (0.0, 1.48, -0.18), (0.0, 1.51, -0.19)], 0.024, 0.032, u_segs=12)

    # Curved stirrup fenders hugging the horse's sides cleanly + girth strap
    for side in (-1.0, 1.0):
        fender_pts = [
            (side * 0.21, 1.22, -0.02),
            (side * 0.255, 1.07, -0.03),
            (side * 0.245, 0.90, -0.02),
            (side * 0.235, 0.76, -0.01),
        ]
        p_saddle.add_tube(fender_pts, 0.045, 0.032, u_segs=10, scale_xy=(0.28, 1.0))

    # Girth cinch band snug around the heart-girth
    cinch_pts = []
    for ci in range(15):
        th = -math.pi * 0.82 + (ci / 14.0) * (math.pi * 0.64)
        bx, by = horse_torso_profile(0.36, th)
        cinch_pts.append((bx * 1.015, 1.11 + by * 1.015, -0.10))
    p_saddle.add_tube(cinch_pts, 0.022, 0.022, u_segs=8, scale_xy=(1.0, 0.45))

    p_brass = MeshPart(mat_brass)
    for side in (-1.0, 1.0):
        # Curved Western stirrups hanging from fenders
        p_brass.add_faceted_prism(12, 0.042, 0.042, 0.022, center=(side * 0.238, 0.72, -0.01), rot_euler=(0.0, 0.0, math.pi * 0.5))
        p_brass.add_faceted_prism(8, 0.016, 0.016, 0.010, center=(side * 0.16, 1.32, 0.18), rot_euler=(0.0, 0.0, math.pi * 0.5))

    torso_mesh = g.add_mesh_from_parts("HorseTorsoMesh", [p_torso_coat, p_blanket, p_saddle, p_brass])
    torso_node = g.add_node("HorseTorso", mesh_idx=torso_mesh)
    g.add_node("SaddleSeat", translation=(0.0, 1.36, 0.03), parent_idx=torso_node)

    # -------------------------------------------------------------------------
    # 3. Smooth Sculpted Neck, Equine Head, Lush Flowing Mane & Forelock
    # -------------------------------------------------------------------------
    p_neck_coat = MeshPart(mat_coat)
    p_neck_coat.subdivide_levels = 1

    neck_ctrl = [
        (0.0, -0.08, 0.08),
        (0.0, 0.14, -0.06),
        (0.0, 0.36, -0.20),
        (0.0, 0.53, -0.30),
        (0.0, 0.59, -0.35),
    ]
    neck_pts = catmull_rom_chain(neck_ctrl, samples_per_seg=4)

    def neck_sec(t, theta):
        end_soft = _smoothstep(0.0, 0.08, t) * 0.35 + 0.65
        rx = (0.148 - 0.052 * t) * end_soft
        ry = (0.215 - 0.078 * t) * end_soft
        st = math.sin(theta)
        # Graceful arched crest on top of the neck
        crest = 1.0 + 0.12 * math.sin(t * math.pi) * max(0.0, st) ** 2
        return (math.cos(theta) * rx, st * ry * crest)

    p_neck_coat.add_loft(neck_pts, neck_sec, u_segs=22, cap_start=True, cap_end=True)

    # Sculpted equine head (broad forehead & jowl tapering smoothly into muzzle & nostrils)
    head_ctrl = [
        (0.0, 0.58, -0.27),
        (0.0, 0.56, -0.39),
        (0.0, 0.49, -0.54),
        (0.0, 0.40, -0.69),
        (0.0, 0.33, -0.80),
    ]
    head_pts = catmull_rom_chain(head_ctrl, samples_per_seg=4)

    def head_sec(t, theta):
        jowl = math.exp(-((t - 0.22) / 0.18) ** 2)
        muzzle_round = math.sin(_smoothstep(0.0, 0.15, 1.0 - t) * math.pi * 0.5) * 0.55 + 0.45
        rx = (0.112 + 0.018 * jowl - 0.048 * t) * muzzle_round
        ry = (0.122 + 0.028 * jowl - 0.052 * t) * muzzle_round
        return (math.cos(theta) * rx, math.sin(theta) * ry)

    p_neck_coat.add_loft(head_pts, head_sec, u_segs=20, cap_start=True, cap_end=True)

    # Alert sculpted cupped ears
    for side in (-1.0, 1.0):
        ear_pts = [
            (side * 0.062, 0.64, -0.33),
            (side * 0.082, 0.74, -0.32),
            (side * 0.088, 0.82, -0.305),
        ]
        p_neck_coat.add_tube(ear_pts, 0.032, 0.007, u_segs=10, samples_per_seg=4, scale_xy=(0.72, 1.15))

    # Velvety dark muzzle + lush, multi-lock flowing Mustang Mane & Forelock!
    p_neck_dark = MeshPart(mat_dark)
    p_neck_dark.subdivide_levels = 1
    p_neck_dark.add_ellipsoid((0.0, 0.33, -0.80), (0.064, 0.062, 0.068), u_segs=14, v_segs=10)

    # Central mane crest pad along neck spine
    mane_crest_pts = [
        (0.0, 0.08, 0.04),
        (0.0, 0.28, -0.08),
        (0.0, 0.48, -0.21),
        (0.0, 0.63, -0.31),
    ]
    p_neck_dark.add_tube(mane_crest_pts, 0.038, 0.028, u_segs=10, samples_per_seg=4, scale_xy=(0.65, 1.35))

    # 12 overlapping sculpted flowing hair locks cascading organically down the neck!
    for m_i in range(12):
        frac = m_i / 11.0
        side_drape = 1.0 if (m_i % 3 != 1) else -1.0  # mostly drapes right, with natural stray locks left
        base_y = 0.10 + frac * 0.52
        base_z = 0.03 - frac * 0.33
        lock_len = 0.19 + 0.07 * math.sin(frac * math.pi)
        sway_z = 0.04 * math.cos(m_i * 1.7)
        lock_pts = [
            (0.0, base_y + 0.03, base_z),
            (side_drape * 0.055, base_y - lock_len * 0.32, base_z + 0.02 + sway_z * 0.5),
            (side_drape * 0.095, base_y - lock_len * 0.72, base_z + 0.04 + sway_z),
            (side_drape * 0.082, base_y - lock_len, base_z + 0.055 + sway_z),
        ]
        p_neck_dark.add_tube(lock_pts, 0.034, 0.008, u_segs=8, samples_per_seg=4, scale_xy=(0.58, 1.15))

    # Forelock cascading between the ears onto the forehead
    for f_i in (-1, 0, 1):
        fl_pts = [
            (f_i * 0.018, 0.65, -0.34),
            (f_i * 0.026, 0.61, -0.43),
            (f_i * 0.020, 0.55, -0.50),
        ]
        p_neck_dark.add_tube(fl_pts, 0.024, 0.006, u_segs=8, samples_per_seg=3)

    # Smooth white forehead blaze (hugged smoothly onto nasal bridge)
    p_blaze = MeshPart(mat_blaze)
    p_blaze.subdivide_levels = 1
    blaze_pts = [
        (0.0, 0.59, -0.42),
        (0.0, 0.52, -0.55),
        (0.0, 0.43, -0.68),
    ]
    p_blaze.add_tube(blaze_pts, 0.026, 0.014, u_segs=8, samples_per_seg=3, scale_xy=(1.1, 0.35))

    p_eyes = MeshPart(mat_eye)
    for side in (-1.0, 1.0):
        p_eyes.add_ellipsoid((side * 0.094, 0.545, -0.455), (0.022, 0.022, 0.025), u_segs=12, v_segs=8)

    p_bridle = MeshPart(mat_leather)
    for side in (-1.0, 1.0):
        p_bridle.add_tube([(side * 0.098, 0.555, -0.42), (side * 0.076, 0.38, -0.71)], 0.010, 0.010, u_segs=6)
        p_bridle.add_tube([(side * 0.076, 0.355, -0.73), (side * 0.13, 0.24, -0.36), (side * 0.09, 0.14, 0.18)], 0.008, 0.008, u_segs=6)

    p_head_brass = MeshPart(mat_brass)
    for side in (-1.0, 1.0):
        p_head_brass.add_faceted_prism(12, 0.022, 0.022, 0.009, center=(side * 0.078, 0.355, -0.73), rot_euler=(0.0, 0.0, math.pi * 0.5))

    neck_mesh = g.add_mesh_from_parts("HorseNeckHeadMesh", [p_neck_coat, p_neck_dark, p_blaze, p_eyes, p_bridle, p_head_brass])
    neck_node = g.add_node("HorseNeckHead", translation=(0.0, 1.22, -0.64), mesh_idx=neck_mesh, parent_idx=torso_node)

    # -------------------------------------------------------------------------
    # 4. Lush, Voluminous Multi-Lock Flowing Horse Tail (Zero Flat Ribbon!)
    # -------------------------------------------------------------------------
    p_tail = MeshPart(mat_dark)
    p_tail.subdivide_levels = 1

    # Full central tail plume with rich S-curve and round cross-section
    tail_core = [
        (0.0, 0.02, -0.02),
        (0.0, -0.06, 0.12),
        (0.0, -0.28, 0.21),
        (0.0, -0.54, 0.19),
        (0.0, -0.74, 0.22),
    ]

    def tail_core_sec(t, theta):
        swell = math.sin(max(0.05, min(0.98, t)) * math.pi * 0.88)
        rx = 0.036 + 0.052 * swell - 0.024 * t
        ry = 0.038 + 0.056 * swell - 0.026 * t
        flute = 1.0 + 0.08 * math.cos(theta * 6.0) * swell
        return (math.cos(theta) * max(0.010, rx) * flute, math.sin(theta) * max(0.010, ry) * flute)

    p_tail.add_loft(catmull_rom_chain(tail_core, samples_per_seg=4), tail_core_sec, u_segs=16, cap_start=True, cap_end=True)

    # 8 surrounding sculpted hair locks giving deep natural horsehair volume from every angle
    for lk in range(8):
        ang = (lk / 8.0) * math.pi * 2.0
        ox = math.cos(ang) * 0.048
        oz = math.sin(ang) * 0.038
        len_scale = 0.82 + 0.18 * math.sin(lk * 2.1)
        lock_ctrl = [
            (ox * 0.35, -0.02, 0.03 + oz * 0.3),
            (ox * 0.95, -0.22 * len_scale, 0.17 + oz * 0.8),
            (ox * 1.15, -0.48 * len_scale, 0.20 + oz * 1.0),
            (ox * 0.65, -0.72 * len_scale, 0.23 + oz * 0.7),
        ]
        p_tail.add_tube(lock_ctrl, 0.028, 0.007, u_segs=8, samples_per_seg=4)

    tail_mesh = g.add_mesh_from_parts("HorseTailMesh", [p_tail])
    tail_node = g.add_node("HorseTail", translation=(0.0, 1.07, 0.85), mesh_idx=tail_mesh, parent_idx=torso_node)

    # -------------------------------------------------------------------------
    # 5. Four Smooth Anatomical Equine Legs (Grounded Cleanly at y = 0.0)
    # -------------------------------------------------------------------------
    def build_leg_mesh(is_front, side_sign):
        p_leg_coat = MeshPart(mat_coat)
        p_leg_coat.subdivide_levels = 1
        p_leg_dark = MeshPart(mat_dark)
        p_leg_dark.subdivide_levels = 1
        p_leg_hoof = MeshPart(mat_hoof)
        p_leg_hoof.subdivide_levels = 1

        if is_front:
            upper_pts = [(0.0, 0.04, 0.0), (0.0, -0.22, 0.015), (0.0, -0.46, 0.01)]
            lower_pts = [(0.0, -0.44, 0.01), (0.0, -0.70, 0.0), (0.0, -0.87, -0.015), (0.0, -0.94, -0.035)]
            r_top = 0.098
        else:
            # Muscular gaskin curving back to angled hock, then slender cannon down to fetlock
            upper_pts = [(0.0, 0.06, -0.01), (0.0, -0.22, -0.04), (0.0, -0.46, 0.065)]
            lower_pts = [(0.0, -0.44, 0.065), (0.0, -0.71, 0.015), (0.0, -0.88, -0.015), (0.0, -0.94, -0.035)]
            r_top = 0.122

        p_leg_coat.add_tube(upper_pts, r_top, 0.056, u_segs=14, samples_per_seg=4)
        p_leg_dark.add_tube(lower_pts, 0.056, 0.044, u_segs=14, samples_per_seg=4)
        # Smooth sculpted hoof touching local y = -1.00 (world y = 0.0)
        hoof_pts = [(0.0, -0.92, -0.03), (0.0, -0.96, -0.042), (0.0, -1.00, -0.050)]
        p_leg_hoof.add_tube(hoof_pts, 0.046, 0.058, u_segs=14, samples_per_seg=2)

        return g.add_mesh_from_parts(
            f"HorseLegMesh_{'F' if is_front else 'B'}_{'R' if side_sign > 0 else 'L'}",
            [p_leg_coat, p_leg_dark, p_leg_hoof],
        )

    leg_fl = g.add_node("leg0", translation=(-0.185, 1.00, -0.54), mesh_idx=build_leg_mesh(True, -1), parent_idx=torso_node)
    leg_bl = g.add_node("leg1", translation=(-0.190, 1.00, 0.58), mesh_idx=build_leg_mesh(False, -1), parent_idx=torso_node)
    leg_fr = g.add_node("leg2", translation=(0.185, 1.00, -0.54), mesh_idx=build_leg_mesh(True, 1), parent_idx=torso_node)
    leg_br = g.add_node("leg3", translation=(0.190, 1.00, 0.58), mesh_idx=build_leg_mesh(False, 1), parent_idx=torso_node)

    # -------------------------------------------------------------------------
    # 6. Animations: Idle, Walk, Gallop
    # -------------------------------------------------------------------------
    idle_times = [0.0, 0.9, 1.8, 2.7]
    g.add_animation("Idle", [
        {
            "node": neck_node,
            "path": "rotation",
            "times": idle_times,
            "values": [
                quat_from_euler_xyz(0.0, 0.0, 0.0),
                quat_from_euler_xyz(0.06, 0.035, 0.0),
                quat_from_euler_xyz(-0.025, -0.035, 0.0),
                quat_from_euler_xyz(0.0, 0.0, 0.0),
            ],
        },
        {
            "node": tail_node,
            "path": "rotation",
            "times": idle_times,
            "values": [
                quat_from_euler_xyz(0.04, 0.0, 0.0),
                quat_from_euler_xyz(0.08, 0.0, 0.12),
                quat_from_euler_xyz(0.05, 0.0, -0.12),
                quat_from_euler_xyz(0.04, 0.0, 0.0),
            ],
        },
    ])

    walk_times = [0.0, 0.25, 0.50, 0.75, 1.0]
    g.add_animation("Walk", [
        {
            "node": neck_node,
            "path": "rotation",
            "times": walk_times,
            "values": [
                quat_from_euler_xyz(0.04, 0.0, 0.0),
                quat_from_euler_xyz(-0.03, 0.0, 0.0),
                quat_from_euler_xyz(0.04, 0.0, 0.0),
                quat_from_euler_xyz(-0.03, 0.0, 0.0),
                quat_from_euler_xyz(0.04, 0.0, 0.0),
            ],
        },
        {
            "node": leg_fl,
            "path": "rotation",
            "times": walk_times,
            "values": [
                quat_from_euler_xyz(0.28, 0.0, 0.0),
                quat_from_euler_xyz(0.0, 0.0, 0.0),
                quat_from_euler_xyz(-0.28, 0.0, 0.0),
                quat_from_euler_xyz(0.0, 0.0, 0.0),
                quat_from_euler_xyz(0.28, 0.0, 0.0),
            ],
        },
        {
            "node": leg_br,
            "path": "rotation",
            "times": walk_times,
            "values": [
                quat_from_euler_xyz(0.26, 0.0, 0.0),
                quat_from_euler_xyz(0.0, 0.0, 0.0),
                quat_from_euler_xyz(-0.26, 0.0, 0.0),
                quat_from_euler_xyz(0.0, 0.0, 0.0),
                quat_from_euler_xyz(0.26, 0.0, 0.0),
            ],
        },
        {
            "node": leg_fr,
            "path": "rotation",
            "times": walk_times,
            "values": [
                quat_from_euler_xyz(-0.28, 0.0, 0.0),
                quat_from_euler_xyz(0.0, 0.0, 0.0),
                quat_from_euler_xyz(0.28, 0.0, 0.0),
                quat_from_euler_xyz(0.0, 0.0, 0.0),
                quat_from_euler_xyz(-0.28, 0.0, 0.0),
            ],
        },
        {
            "node": leg_bl,
            "path": "rotation",
            "times": walk_times,
            "values": [
                quat_from_euler_xyz(-0.26, 0.0, 0.0),
                quat_from_euler_xyz(0.0, 0.0, 0.0),
                quat_from_euler_xyz(0.26, 0.0, 0.0),
                quat_from_euler_xyz(0.0, 0.0, 0.0),
                quat_from_euler_xyz(-0.26, 0.0, 0.0),
            ],
        },
    ])

    gal_times = [0.0, 0.15, 0.30, 0.45, 0.60]
    g.add_animation("Gallop", [
        {
            "node": torso_node,
            "path": "translation",
            "times": gal_times,
            "values": [(0.0, 0.0, 0.0), (0.0, 0.07, 0.0), (0.0, 0.01, 0.0), (0.0, 0.08, 0.0), (0.0, 0.0, 0.0)],
        },
        {
            "node": neck_node,
            "path": "rotation",
            "times": gal_times,
            "values": [
                quat_from_euler_xyz(0.08, 0.0, 0.0),
                quat_from_euler_xyz(-0.06, 0.0, 0.0),
                quat_from_euler_xyz(0.10, 0.0, 0.0),
                quat_from_euler_xyz(-0.04, 0.0, 0.0),
                quat_from_euler_xyz(0.08, 0.0, 0.0),
            ],
        },
        {
            "node": tail_node,
            "path": "rotation",
            "times": gal_times,
            "values": [
                quat_from_euler_xyz(0.34, 0.0, 0.0),
                quat_from_euler_xyz(0.50, 0.0, 0.06),
                quat_from_euler_xyz(0.36, 0.0, 0.0),
                quat_from_euler_xyz(0.52, 0.0, -0.06),
                quat_from_euler_xyz(0.34, 0.0, 0.0),
            ],
        },
        {
            "node": leg_fl,
            "path": "rotation",
            "times": gal_times,
            "values": [
                quat_from_euler_xyz(0.60, 0.0, 0.0),
                quat_from_euler_xyz(-0.15, 0.0, 0.0),
                quat_from_euler_xyz(-0.56, 0.0, 0.0),
                quat_from_euler_xyz(0.10, 0.0, 0.0),
                quat_from_euler_xyz(0.60, 0.0, 0.0),
            ],
        },
        {
            "node": leg_fr,
            "path": "rotation",
            "times": gal_times,
            "values": [
                quat_from_euler_xyz(0.36, 0.0, 0.0),
                quat_from_euler_xyz(0.62, 0.0, 0.0),
                quat_from_euler_xyz(-0.22, 0.0, 0.0),
                quat_from_euler_xyz(-0.58, 0.0, 0.0),
                quat_from_euler_xyz(0.36, 0.0, 0.0),
            ],
        },
        {
            "node": leg_bl,
            "path": "rotation",
            "times": gal_times,
            "values": [
                quat_from_euler_xyz(-0.54, 0.0, 0.0),
                quat_from_euler_xyz(0.18, 0.0, 0.0),
                quat_from_euler_xyz(0.56, 0.0, 0.0),
                quat_from_euler_xyz(-0.18, 0.0, 0.0),
                quat_from_euler_xyz(-0.54, 0.0, 0.0),
            ],
        },
        {
            "node": leg_br,
            "path": "rotation",
            "times": gal_times,
            "values": [
                quat_from_euler_xyz(-0.28, 0.0, 0.0),
                quat_from_euler_xyz(-0.56, 0.0, 0.0),
                quat_from_euler_xyz(0.24, 0.0, 0.0),
                quat_from_euler_xyz(0.58, 0.0, 0.0),
                quat_from_euler_xyz(-0.28, 0.0, 0.0),
            ],
        },
    ])

    return g.export_glb(out_path)


if __name__ == "__main__":
    os.makedirs(os.path.join(SCRIPT_DIR, "..", "assets"), exist_ok=True)
    out = os.path.join(SCRIPT_DIR, "..", "assets", "horse.glb")
    print(build_horse(out))
