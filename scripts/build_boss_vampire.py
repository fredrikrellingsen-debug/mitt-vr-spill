#!/usr/bin/env python3
"""
Generates Lord Malakor — The Vampire Overlord of Boot Hill (`assets/boss_vampire.glb`).

Conventions (matching `vampire.glb` & Western Cowboy VR enemy pipeline):
  - Grounded cleanly at `y = 0.0`, facing `-Z` (`z < 0` is forward).
  - Towering Boss stature `~2.72m` (`1.45x` taller and grander than standard vampires).
  - Named child nodes: `"arm0"` (left arm), `"arm1"` (right arm), and `"head"` (`y ~ 2.28m`).
  - Embedded glTF quaternion keyframe animations:
      * `"Idle"` (2.2s menacing hover/breathe & claw flex)
      * `"Walk"` (1.0s stalking stride/arm sweep)
      * `"Attack"` (0.45s twin-claw dark slash)
  - Pure Python using `glb_core.GLBBuilder` with zero external dependencies.
"""

import json
import math
import os
import struct
import sys

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPT_DIR not in sys.path:
    sys.path.insert(0, _SCRIPT_DIR)

from glb_core import (  # noqa: E402
    GLBBuilder,
    catmull_rom_chain,
    quat_from_euler_xyz,
    quat_mul,
    quat_rotate_vec,
    rotate_vec_between,
    v_add,
    v_cross,
    v_dot,
    v_len,
    v_mul,
    v_norm,
    v_sub,
)


# ---------------------------------------------------------------------------
# Gothic Cloth, Horn & Talon Sculpting Helpers
# ---------------------------------------------------------------------------

def _compute_grid_normals(rings, closed_u=False):
    """Computes smooth area-weighted vertex normals for rings[v][u]."""
    v_cnt = len(rings)
    u_cnt = len(rings[0])
    nrms = [[(0.0, 0.0, 0.0) for _ in range(u_cnt)] for _ in range(v_cnt)]
    u_quads = u_cnt if closed_u else (u_cnt - 1)

    for v in range(v_cnt - 1):
        for u in range(u_quads):
            u1 = (u + 1) % u_cnt if closed_u else (u + 1)
            p00 = rings[v][u]
            p10 = rings[v][u1]
            p01 = rings[v + 1][u]
            p11 = rings[v + 1][u1]
            n1 = v_cross(v_sub(p10, p00), v_sub(p11, p00))
            n2 = v_cross(v_sub(p11, p00), v_sub(p01, p00))
            nrms[v][u] = v_add(nrms[v][u], v_add(n1, n2))
            nrms[v][u1] = v_add(nrms[v][u1], n1)
            nrms[v + 1][u1] = v_add(nrms[v + 1][u1], v_add(n1, n2))
            nrms[v + 1][u] = v_add(nrms[v + 1][u], n2)

    for v in range(v_cnt):
        for u in range(u_cnt):
            nrms[v][u] = v_norm(nrms[v][u], (0.0, 1.0, 0.0))
    return nrms


def add_dual_sided_gothic_drapery(
    outer_part,
    inner_part,
    rings,
    ref_center_fn,
    thickness=0.008,
    closed_u=False,
    uv_u_scale=1.0,
    uv_v_scale=1.0,
    min_y=None,
):
    """
    Emits an outward-facing outer velvet shell (`MalakorOuterCloak`) and an inward-facing
    offset inner silk shell (`MalakorCrimsonSilk`) with verified normal orientation
    against `ref_center_fn(y) -> (cx, cy, cz)`.
    """
    raw_nrms = _compute_grid_normals(rings, closed_u=closed_u)
    score = 0.0
    for v, ring in enumerate(rings):
        for u, p in enumerate(ring):
            c = ref_center_fn(p[1])
            score += v_dot(raw_nrms[v][u], v_sub(p, c))

    outer_flip = score < 0.0
    sign = -1.0 if outer_flip else 1.0

    outer_part.add_smooth_grid(
        rings,
        closed_u=closed_u,
        uv_u_scale=uv_u_scale,
        uv_v_scale=uv_v_scale,
        ensure_outward=False,
        flip=outer_flip,
    )

    if inner_part is not None and thickness > 0.0:
        inner_rings = []
        for v, ring in enumerate(rings):
            i_ring = []
            for u, p in enumerate(ring):
                out_n = v_mul(raw_nrms[v][u], sign)
                ip = v_sub(p, v_mul(out_n, thickness))
                if min_y is not None and ip[1] < min_y:
                    ip = (ip[0], min_y + 0.004 * v, ip[2])
                i_ring.append(ip)
            inner_rings.append(i_ring)

        inner_part.add_smooth_grid(
            inner_rings,
            closed_u=closed_u,
            uv_u_scale=uv_u_scale,
            uv_v_scale=uv_v_scale,
            ensure_outward=False,
            flip=not outer_flip,
        )


def add_tattered_ribbon(
    part,
    ctrl_pts,
    width_start,
    width_end,
    normal_hint=(0.0, 0.0, 1.0),
    samples_per_seg=2,
    twist_rad=0.0,
    wave_amp=0.0,
    min_y=None,
):
    """Builds a smooth curved & tapered gothic cloth tatter strip along a 3D spline."""
    spine = catmull_rom_chain(ctrl_pts, samples_per_seg=samples_per_seg)
    m = len(spine)
    if m < 2:
        return

    tangents = []
    for i in range(m):
        if i == 0:
            d = v_sub(spine[1], spine[0])
        elif i == m - 1:
            d = v_sub(spine[-1], spine[-2])
        else:
            d = v_sub(spine[i + 1], spine[i - 1])
        tangents.append(v_norm(d, (0.0, -1.0, 0.0)))

    nh = v_norm(normal_hint, (0.0, 0.0, 1.0))
    if abs(v_dot(tangents[0], nh)) > 0.94:
        nh = (1.0, 0.0, 0.0) if abs(tangents[0][0]) < 0.8 else (0.0, 0.0, 1.0)
    side = v_norm(v_cross(tangents[0], nh))

    rings = []
    u_steps = 3
    for i, pt in enumerate(spine):
        if i > 0:
            side = rotate_vec_between(tangents[i - 1], tangents[i], side)
            side = v_norm(v_sub(side, v_mul(tangents[i], v_dot(side, tangents[i]))), side)
        b_nrm = v_norm(v_cross(side, tangents[i]))

        t = i / (m - 1)
        w = width_start * (1.0 - t) + width_end * t
        if t > 0.78:
            w *= max(0.18, (1.0 - t) / 0.22)

        ang = twist_rad * t
        ca, sa = math.cos(ang), math.sin(ang)
        s_dir = v_add(v_mul(side, ca), v_mul(b_nrm, sa))
        n_dir = v_add(v_mul(b_nrm, ca), v_mul(side, -sa))
        wave_off = math.sin(t * math.pi * 2.5) * wave_amp * t

        ring = []
        for u in range(u_steps):
            uf = (u / (u_steps - 1)) * 2.0 - 1.0
            camber = (1.0 - uf * uf) * 0.006 + wave_off
            p = v_add(pt, v_add(v_mul(s_dir, uf * w * 0.5), v_mul(n_dir, camber)))
            if min_y is not None and p[1] < min_y:
                p = (p[0], min_y, p[2])
            ring.append(p)
        rings.append(ring)

    nrms = _compute_grid_normals(rings, closed_u=False)
    flip = v_dot(nrms[len(rings) // 2][1], normal_hint) < 0.0
    part.add_smooth_grid(rings, closed_u=False, ensure_outward=False, flip=flip)


def add_curved_claw_or_fang(
    part,
    ctrl_pts,
    r_base,
    r_tip=0.0016,
    u_segs=5,
    samples_per_seg=1,
    blade_aspect=(0.74, 1.28),
    up_hint=(0.0, 1.0, 0.0),
    cap_start=False,
):
    """Sculpts a curved, diamond-pinched razor talon, armor spike, or vampire fang."""
    spine = catmull_rom_chain(ctrl_pts, samples_per_seg=samples_per_seg)

    def sec(t, theta):
        r = r_base * ((1.0 - t) ** 1.15) + r_tip * t
        pinch = 1.0 + 0.15 * math.cos(theta * 2.0)
        return (
            math.cos(theta) * r * blade_aspect[0] * pinch,
            math.sin(theta) * r * blade_aspect[1],
        )

    part.add_loft(
        spine,
        sec,
        u_segs=u_segs,
        cap_start=cap_start,
        cap_end=True,
        up_hint=up_hint,
    )


def add_planar_ring_tube(part, center_y, r_major, rx_tube, ry_tube, u_segs=20, v_segs=4, cz=0.0, rot_euler=(0.0, 0.0, 0.0)):
    """Builds a clean closed torus/ring with diamond/elliptical cross-section and zero degenerate faces."""
    rings = []
    for v in range(v_segs):
        phi = (v / v_segs) * math.pi * 2.0
        cp, sp = math.cos(phi), math.sin(phi)
        ring = []
        for u in range(u_segs):
            th = (u / u_segs) * math.pi * 2.0
            rr = r_major + cp * rx_tube
            ring.append((math.cos(th) * rr, sp * ry_tube, math.sin(th) * rr))
        rings.append(ring)
    rings.append(list(rings[0]))
    part.add_smooth_grid(
        rings,
        closed_u=True,
        translate=(0.0, center_y, cz),
        rot_euler=rot_euler,
        ensure_outward=True,
    )


# ---------------------------------------------------------------------------
# Subsystem Builders — Lord Malakor (2.72m Gothic-Western Vampire Overlord)
# ---------------------------------------------------------------------------

def _build_boots_spurs_and_legs(leather, armor, gold, talons, crimson_silk):
    """
    Armored gothic-western cavalry boots grounded cleanly at y = 0.002m,
    3 obsidian toe talons per foot (-Z), ornate gold western spurs (+Z),
    spiked obsidian knee poleyns, and commanding aristocratic legs.
    """
    for sgn in (-1.0, 1.0):
        bx = sgn * 0.188

        # 1. Boot foot & armored vamp (grounded cleanly near y = 0.0, toe pointing -Z)
        foot_spine = catmull_rom_chain([
            (bx, 0.062, 0.072),
            (bx, 0.068, -0.040),
            (bx, 0.058, -0.185),
            (bx, 0.044, -0.308),
        ], samples_per_seg=1)

        def foot_sec(t, theta):
            w = (0.076 - 0.036 * (t ** 1.45)) * (1.0 + 0.08 * math.sin(t * math.pi))
            h_top = 0.062 * (1.0 - 0.34 * (t ** 1.3))
            sy = math.sin(theta)
            y_off = sy * h_top if sy >= 0.0 else max(-0.050 + 0.016 * t, sy * 0.052)
            return (math.cos(theta) * w, y_off)

        leather.add_loft(foot_spine, foot_sec, u_segs=8, up_hint=(0.0, 1.0, 0.0))

        # Grounded western boot heel block (exact bottom at y = 0.002) & armored sole welt
        leather.add_beveled_box(bx, 0.024, 0.050, 0.110, 0.044, 0.095, bevel=0.006)
        armor.add_beveled_box(bx, 0.014, -0.165, 0.102, 0.022, 0.205, bevel=0.004)

        # 3 Curved obsidian-crimson boot talons per foot (-Z)
        for t_idx, tx_off in enumerate((-0.030, 0.0, 0.030)):
            t_len = 0.086 if t_idx == 1 else 0.066
            talon_pts = [
                (bx + tx_off * 0.85, 0.038, -0.290),
                (bx + tx_off * 1.15, 0.030, -0.290 - t_len * 0.55),
                (bx + tx_off * 1.35, 0.010, -0.290 - t_len),
            ]
            add_curved_claw_or_fang(
                talons, talon_pts, r_base=0.013, r_tip=0.0018, u_segs=4, samples_per_seg=1
            )

        # Ornate Gold Western Outlaw Spur at Heel (+Z) with 5-point spiked rowel
        spur_yoke = [
            (bx - 0.060, 0.056, 0.018),
            (bx - 0.062, 0.056, 0.092),
            (bx, 0.056, 0.128),
            (bx + 0.062, 0.056, 0.092),
            (bx + 0.060, 0.056, 0.018),
        ]
        gold.add_tube(spur_yoke, 0.0072, 0.0072, u_segs=4, samples_per_seg=1, cap_start=False, cap_end=False)
        for sp_i in range(5):
            sa = (sp_i / 5.0) * math.pi * 2.0
            r_pt = (bx, 0.054 + math.sin(sa) * 0.028, 0.158 + math.cos(sa) * 0.028)
            gold.add_tube([(bx, 0.054, 0.128), r_pt], 0.0045, 0.0015, u_segs=4, samples_per_seg=1, cap_start=False)

        # 2. Tall Gothic-Cavalry Boot Shaft + Obsidian Shin Greave (y = 0.09..0.58)
        shaft_spine = [
            (bx, 0.095, -0.018),
            (bx, 0.320, -0.042),
            (bx, 0.555, -0.062),
        ]

        def shaft_sec(t, theta):
            rx = 0.078 + 0.022 * t
            rz = 0.088 + 0.024 * t
            ridge = max(0.0, -math.sin(theta)) * 0.024 * (t ** 1.4)
            return (math.cos(theta) * rx, math.sin(theta) * rz - ridge)

        leather.add_loft(shaft_spine, shaft_sec, u_segs=8, cap_start=False, up_hint=(0.0, 0.0, 1.0))

        # Fluted Obsidian shin greave plate on front (-Z) + Gold Buckles
        greave_spine = [(bx, 0.155, -0.092), (bx, 0.545, -0.140)]
        armor.add_loft(
            greave_spine,
            lambda t, th: (math.cos(th) * (0.054 + 0.014 * t), math.sin(th) * 0.025),
            u_segs=6, cap_start=True, cap_end=True, up_hint=(0.0, 0.0, 1.0),
        )
        for sy, sz in ((0.190, -0.030), (0.420, -0.052)):
            gold.add_beveled_box(bx + sgn * 0.086, sy, sz - 0.025, 0.014, 0.030, 0.028, bevel=0.003)

        # Spiked Gothic Knee Poleyn (y ~ 0.60m)
        armor.add_ellipsoid(
            center=(bx, 0.600, -0.138),
            radii=(0.076, 0.084, 0.052),
            u_segs=7, v_segs=5,
            rot_euler=(-0.15, 0.0, 0.0),
        )
        add_curved_claw_or_fang(
            armor,
            [(bx, 0.610, -0.172), (bx, 0.655, -0.222), (bx, 0.715, -0.238)],
            r_base=0.018, r_tip=0.002, u_segs=4, samples_per_seg=1,
        )

        # 3. Commanding Aristocratic Thigh rising into Pelvis (y = 0.56..1.28)
        thigh_spine = catmull_rom_chain([
            (bx, 0.560, -0.058),
            (bx * 1.02, 0.840, -0.042),
            (bx * 0.82, 1.285, 0.032),
        ], samples_per_seg=2)

        crimson_silk.add_loft(
            thigh_spine,
            lambda t, th: (math.cos(th) * (0.090 + 0.026 * t) * 0.94, math.sin(th) * (0.090 + 0.026 * t) * 1.06),
            u_segs=7, cap_start=False, cap_end=False, up_hint=(0.0, 0.0, 1.0),
        )


def _build_breastplate_ribcage_and_medallion(
    outer_cloak, crimson_silk, inner_shadow, skin, leather, armor, gold, ruby
):
    """
    Sculpted gothic breastplate over undead ribcage featuring a blazing crimson
    `BloodRubyGem` chest medallion, heavy gold chains, gothic-western waist cincture,
    armored hip tassets, and parted inner crimson silk coat tails.
    """
    # 1. Parted Royal Crimson Silk Coat-Skirt (open in front -Z so armored boots & greaves shine)
    sk_rows = 6
    sk_cols = 15
    skirt_rings = []
    for vr in range(sk_rows):
        hf = vr / (sk_rows - 1)
        yy = 0.14 + hf * 1.14
        rx = 0.39 * ((1.0 - hf) ** 0.68) + 0.205
        rz = 0.34 * ((1.0 - hf) ** 0.68) + 0.178
        cz = 0.07 * (1.0 - hf) + 0.025 * hf
        gap_half = 0.42 * (1.0 - hf * 0.55)
        phi_s = -math.pi * 0.5 + gap_half
        phi_l = math.pi * 2.0 - 2.0 * gap_half
        ring = []
        for uc in range(sk_cols):
            ang = phi_s + (uc / (sk_cols - 1)) * phi_l
            pleat = 1.0 + (1.0 - hf * 0.65) * 0.10 * math.sin(ang * 9.0)
            jag = (math.sin(ang * 11.0) * 0.050 + math.cos(ang * 7.0) * 0.028) * max(0.0, 1.0 - hf / 0.28)
            ring.append((
                math.cos(ang) * rx * pleat,
                max(0.085, yy + jag),
                cz + math.sin(ang) * rz * pleat,
            ))
        skirt_rings.append(ring)

    sk_nrms = _compute_grid_normals(skirt_rings, closed_u=False)
    sk_score = sum(
        v_dot(sk_nrms[v][u], (skirt_rings[v][u][0], 0.0, skirt_rings[v][u][2] - 0.04))
        for v in range(sk_rows) for u in range(sk_cols)
    )
    crimson_silk.add_smooth_grid(skirt_rings, closed_u=False, ensure_outward=False, flip=(sk_score < 0.0))

    # 2. Towering Regal V-Taper Torso Core (y = 1.22..2.12m)
    torso_spine = catmull_rom_chain([
        (0.0, 1.22, 0.035),
        (0.0, 1.54, 0.042),
        (0.0, 1.88, -0.005),
        (0.0, 2.12, -0.075),
    ], samples_per_seg=2)

    def torso_sec(t, theta):
        waist_pinch = 1.0 - 0.22 * math.exp(-((t - 0.16) / 0.18) ** 2)
        chest_swell = 0.092 * math.exp(-((t - 0.66) / 0.28) ** 2)
        w = (0.218 * waist_pinch + chest_swell) * (1.0 - 0.22 * (t ** 4))
        d = (0.154 * waist_pinch + chest_swell * 0.68) * (1.0 - 0.20 * (t ** 4))
        return (math.cos(theta) * w, math.sin(theta) * d)

    outer_cloak.add_loft(torso_spine, torso_sec, u_segs=10, cap_start=False, cap_end=False, up_hint=(0.0, 0.0, 1.0))

    # Deep recessed chest shadow cavity + gaunt alabaster upper sternum/clavicle V
    inner_shadow.add_ellipsoid(
        center=(0.0, 1.72, -0.128),
        radii=(0.170, 0.240, 0.065),
        u_segs=8, v_segs=5,
        rot_euler=(0.14, 0.0, 0.0),
    )
    skin.add_ellipsoid(
        center=(0.0, 1.98, -0.142),
        radii=(0.122, 0.102, 0.052),
        u_segs=8, v_segs=5,
        rot_euler=(0.24, 0.0, 0.0),
    )

    # 3. Sculpted Gothic Breastplate over Exposed Undead Ribcage!
    sternum_pts = [
        (0.0, 2.02, -0.195),
        (0.0, 1.76, -0.215),
        (0.0, 1.48, -0.175),
    ]
    skin.add_tube(sternum_pts, 0.024, 0.015, u_segs=5, samples_per_seg=1, cap_start=False, scale_xy=(1.25, 0.78))
    armor.add_tube(
        [(0.0, 1.96, -0.206), (0.0, 1.68, -0.216), (0.0, 1.44, -0.182)],
        0.028, 0.014, u_segs=5, samples_per_seg=1, cap_start=False, scale_xy=(1.35, 0.62),
    )

    # Clavicles + 5 pairs of sculpted skeletal ribs & overlapping ObsidianArmor cuirass ribs!
    for sgn in (-1.0, 1.0):
        clav_pts = [
            (sgn * 0.022, 2.025, -0.195),
            (sgn * 0.185, 2.040, -0.162),
            (sgn * 0.345, 2.005, -0.095),
        ]
        skin.add_tube(clav_pts, 0.018, 0.014, u_segs=4, samples_per_seg=1, cap_start=False, cap_end=False)

        for r_idx in range(5):
            rf = r_idx / 4.0
            ry = 1.93 - rf * 0.37
            rz_front = -0.208 + rf * 0.036
            rw = 0.222 + 0.042 * math.sin(rf * math.pi * 0.85) - 0.040 * rf

            # Underlying pale undead bone rib arch
            bone_rib = [
                (sgn * 0.022, ry, rz_front + 0.008),
                (sgn * rw * 0.56, ry - 0.016, rz_front - 0.008),
                (sgn * rw * 1.02, ry + 0.038, rz_front + 0.145),
            ]
            skin.add_tube(
                bone_rib, 0.014 - 0.002 * rf, 0.009, u_segs=4, samples_per_seg=1,
                cap_start=False, cap_end=False, scale_xy=(0.92, 1.15),
            )

            # Outer sculpted ObsidianArmor gothic rib-plate sweeping across chest
            plate_rib = [
                (sgn * 0.036, ry - 0.008, rz_front - 0.008),
                (sgn * rw * 0.58, ry - 0.024, rz_front - 0.022),
                (sgn * rw * 1.06, ry + 0.048, rz_front + 0.148),
            ]
            armor.add_tube(
                plate_rib, 0.020 - 0.002 * rf, 0.011, u_segs=4, samples_per_seg=1,
                cap_start=False, cap_end=False, scale_xy=(0.72, 1.38),
            )

        # Gold filigree breastplate lapel edging framing the ribcage
        gold_edge = [
            (sgn * 0.095, 1.44, -0.175),
            (sgn * 0.212, 1.72, -0.200),
            (sgn * 0.252, 1.98, -0.176),
        ]
        gold.add_tube(gold_edge, 0.012, 0.010, u_segs=4, samples_per_seg=1, cap_start=False, cap_end=False, scale_xy=(1.2, 0.8))

    # 4. Blazing Crimson `BloodRubyGem` Chest Medallion & Gold Chains!
    med_x, med_y, med_z = 0.0, 1.815, -0.228
    gold.add_faceted_prism(
        sides=8, r_top=0.058, r_bot=0.066, length=0.024,
        center=(med_x, med_y, med_z), rot_euler=(-math.pi * 0.5, 0.0, 0.0), twist_offset=math.pi / 8.0,
    )
    for sgn in (-1.0, 1.0):
        wing_med = [
            (sgn * 0.052, med_y + 0.008, med_z),
            (sgn * 0.125, med_y + 0.038, med_z + 0.014),
            (sgn * 0.175, med_y + 0.015, med_z + 0.030),
        ]
        gold.add_tube(wing_med, 0.013, 0.004, u_segs=4, samples_per_seg=1, cap_start=False, scale_xy=(0.75, 1.45))

    # Central blazing BloodRubyGem cabochon + faceted crown!
    ruby.add_ellipsoid(
        center=(med_x, med_y, med_z - 0.018),
        radii=(0.038, 0.050, 0.024),
        u_segs=10, v_segs=6,
    )
    ruby.add_faceted_prism(
        sides=8, r_top=0.022, r_bot=0.036, length=0.016,
        center=(med_x, med_y, med_z - 0.026), rot_euler=(-math.pi * 0.5, 0.0, 0.0), twist_offset=math.pi / 8.0,
    )

    # Heavy Royal Gold Chains draped from chest medallion to shoulder pauldrons & lower ribs!
    for sgn in (-1.0, 1.0):
        upper_chain = [
            (sgn * 0.052, med_y + 0.012, med_z - 0.008),
            (sgn * 0.190, med_y + 0.035, med_z + 0.028),
            (sgn * 0.330, 2.015, -0.125),
        ]
        lower_chain = [
            (sgn * 0.045, med_y - 0.028, med_z - 0.006),
            (sgn * 0.175, med_y - 0.115, med_z + 0.020),
            (sgn * 0.290, 1.945, -0.135),
        ]
        gold.add_tube(upper_chain, 0.0095, 0.0095, u_segs=5, samples_per_seg=2, cap_start=False, cap_end=False)
        gold.add_tube(lower_chain, 0.0080, 0.0080, u_segs=4, samples_per_seg=2, cap_start=False, cap_end=False)

    # 5. Gothic-Western Outlaw Cincture Belt, Ornate Gold Buckle & Armored Hip Tassets
    belt_pts = [
        (math.cos(a) * 0.246, 1.295 - math.sin(a) * 0.018, 0.030 + math.sin(a) * 0.186)
        for a in [k * math.pi * 2.0 / 10 for k in range(11)]
    ]
    leather.add_tube(belt_pts, 0.035, 0.035, u_segs=5, samples_per_seg=1, cap_start=False, cap_end=False, scale_xy=(0.55, 1.38))
    gold.add_beveled_box(0.0, 1.310, -0.162, 0.090, 0.074, 0.024, bevel=0.006)
    ruby.add_ellipsoid(center=(0.0, 1.310, -0.174), radii=(0.022, 0.028, 0.012), u_segs=7, v_segs=5)

    for sgn in (-1.0, 1.0):
        for l_i in range(2):
            ty = 1.235 - l_i * 0.105
            armor.add_beveled_box(
                sgn * (0.244 + l_i * 0.016), ty, 0.015 - l_i * 0.010,
                0.024, 0.105, 0.210 - l_i * 0.022, bevel=0.005,
                rot_euler=(0.0, sgn * 0.12, sgn * -0.18),
            )


def _build_royal_cloak_collar_and_pauldrons(outer_cloak, crimson_silk, armor, gold, ruby, talons):
    """
    Sweeping regal gothic-western multi-layered royal cloak (`MalakorOuterCloak` +
    `MalakorCrimsonSilk`) with jagged tattered train (+Z), Inverness duster capelet,
    dramatic tall flared cathedral bat-wing collar, and ornate spiked shoulder pauldrons.
    """
    # 1. Layer 1 — Full-Length Sweeping Royal Overcloak & Jagged Tattered Train
    v_rows = 9
    u_cols = 17
    cloak_rings = []
    for vr in range(v_rows):
        hf = vr / (v_rows - 1)
        base_y = 0.055 + hf * 1.985

        cz = 0.26 * ((1.0 - hf) ** 1.35) - 0.055 * (hf ** 1.3)
        rx = 0.50 * ((1.0 - hf) ** 0.74) + 0.265
        rz = 0.46 * ((1.0 - hf) ** 0.80) + 0.220

        gap_half = 0.54 * ((1.0 - hf) ** 0.78) + 0.26
        phi_s = -math.pi * 0.5 + gap_half
        phi_l = math.pi * 2.0 - 2.0 * gap_half

        ring = []
        for uc in range(u_cols):
            uf = uc / (u_cols - 1)
            ang = phi_s + uf * phi_l
            sym_u = uf - 0.5

            fold_env = 1.0 - hf * 0.78
            fold = 1.0 + fold_env * (
                0.14 * math.cos(sym_u * math.pi * 12.0)
                + 0.06 * math.cos(sym_u * math.pi * 20.0)
            )
            train_billow = max(0.0, math.sin(ang)) * 0.20 * ((1.0 - hf) ** 1.45)

            xx = math.cos(ang) * rx * fold
            zz = cz + math.sin(ang) * rz * fold + train_billow
            yy = base_y

            if hf < 0.26:
                hem_f = 1.0 - (hf / 0.26)
                bat_scallop = -abs(math.sin(uf * math.pi * 8.0)) * 0.105 + 0.045
                shred = math.cos(sym_u * math.pi * 16.0) * 0.036
                yy = max(0.024 + vr * 0.012, yy + (bat_scallop + shred) * hem_f)

            if hf > 0.70 and math.sin(ang) > -0.15:
                yy += ((hf - 0.70) / 0.30) * 0.080 * max(0.0, math.sin(ang))

            ring.append((xx, yy, zz))
        cloak_rings.append(ring)

    add_dual_sided_gothic_drapery(
        outer_cloak,
        crimson_silk,
        cloak_rings,
        ref_center_fn=lambda y: (0.0, y, 0.06 * max(0.0, 1.0 - y / 2.0)),
        thickness=0.010,
        closed_u=False,
        uv_u_scale=2.5,
        uv_v_scale=2.5,
        min_y=0.022,
    )

    # 2. Layer 2 — Regal Gothic-Western Inverness Shoulder Capelet / Duster Mantle
    m_rows = 5
    m_cols = 17
    mantle_rings = []
    for vr in range(m_rows):
        hf = vr / (m_rows - 1)
        yy = 1.44 + hf * 0.62
        cz = 0.13 * (1.0 - hf) - 0.045 * hf
        rx = 0.48 * ((1.0 - hf) ** 0.58) + 0.255
        rz = 0.40 * ((1.0 - hf) ** 0.62) + 0.215
        gap_half = 0.44 * (1.0 - hf * 0.32)
        phi_s = -math.pi * 0.5 + gap_half
        phi_l = math.pi * 2.0 - 2.0 * gap_half
        ring = []
        for uc in range(m_cols):
            uf = uc / (m_cols - 1)
            ang = phi_s + uf * phi_l
            fold = 1.0 + (1.0 - hf) * 0.11 * math.cos(uf * math.pi * 8.0)
            scallop = (abs(math.cos(uf * math.pi * 7.0)) * 0.115 - 0.050) * (1.0 - hf)
            shoulder_arch = 0.070 * max(0.0, math.sin(ang)) * (hf ** 0.85)
            ring.append((
                math.cos(ang) * rx * fold,
                yy - scallop + shoulder_arch,
                cz + math.sin(ang) * rz * fold,
            ))
        mantle_rings.append(ring)

    add_dual_sided_gothic_drapery(
        outer_cloak,
        crimson_silk,
        mantle_rings,
        ref_center_fn=lambda y: (0.0, y, 0.0),
        thickness=0.008,
        closed_u=False,
        uv_u_scale=2.0,
        uv_v_scale=1.5,
    )

    # 3. Jagged Tattered Train Ribbons trailing behind the Overcloak (+Z)
    tatter_angles = (-0.20, 0.35, 0.95, 1.57, 2.19, 2.79, 3.34)
    for idx_t, t_ang in enumerate(tatter_angles):
        ca, sa = math.cos(t_ang), math.sin(t_ang)
        r_top = 0.44
        r_bot = 0.62 + 0.03 * (idx_t % 2)
        z_top = 0.18 + max(0.0, sa) * 0.12
        z_bot = 0.28 + max(0.0, sa) * 0.22
        pts = [
            (ca * r_top, 0.54, z_top + sa * (r_top * 0.82)),
            (ca * ((r_top + r_bot) * 0.5), 0.26, (z_top + z_bot) * 0.5 + sa * 0.48),
            (ca * r_bot, 0.032 + 0.015 * (idx_t % 3), z_bot + sa * (r_bot * 0.86)),
        ]
        strip_part = outer_cloak if (idx_t % 2 == 0) else crimson_silk
        add_tattered_ribbon(
            strip_part,
            pts,
            width_start=0.130,
            width_end=0.018,
            normal_hint=(ca, 0.15, sa),
            samples_per_seg=2,
            twist_rad=0.28 * (1 if idx_t % 2 == 0 else -1),
            wave_amp=0.020,
            min_y=0.022,
        )

    # 4. Dramatic Tall Flared Cathedral Bat-Wing Collar (rising to y ~ 2.58m!)
    c_rows = 6
    c_cols = 19  # 6 webbed cathedral spans between 7 ribbed spires
    collar_rings = []
    num_webs = 6
    phi_s = -math.pi * 0.5 + 0.62
    phi_l = math.pi * 2.0 - 1.24

    for vr in range(c_rows):
        hf = vr / (c_rows - 1)
        ring = []
        for uc in range(c_cols):
            uf = uc / (c_cols - 1)
            ang = phi_s + uf * phi_l

            crown_arch = math.sin(uf * math.pi) ** 0.55
            cathedral_peaks = 1.0 + 0.075 * math.cos((uf - 0.5) * math.pi * 4.0)
            top_h = 2.18 + 0.39 * crown_arch * cathedral_peaks

            web_phase = abs(math.sin(uf * num_webs * math.pi))
            scallop_dip = web_phase * 0.085 * (hf ** 1.55)
            yy = 2.02 + hf * (top_h - 2.02) - scallop_dip

            flare_r = 0.225 + (0.285 + 0.055 * crown_arch) * (hf ** 1.08) - web_phase * 0.020 * hf
            cz = -0.055 + 0.205 * (hf ** 1.15) * (0.45 + 0.55 * crown_arch)
            xx = math.cos(ang) * flare_r * 1.06
            zz = cz + math.sin(ang) * flare_r * 0.88
            ring.append((xx, yy, zz))
        collar_rings.append(ring)

    add_dual_sided_gothic_drapery(
        outer_cloak,
        crimson_silk,
        collar_rings,
        ref_center_fn=lambda y: (0.0, y, -0.26),
        thickness=0.008,
        closed_u=False,
        uv_u_scale=2.0,
        uv_v_scale=1.5,
    )

    # 7 Cathedral Collar Ribs in ObsidianArmor + Gold finial spikes!
    for rib_i in range(num_webs + 1):
        col_idx = round(rib_i * (c_cols - 1) / num_webs)
        rib_pts = [collar_rings[vr][col_idx] for vr in (0, 2, 4, c_rows - 1)]
        tip_dir = v_norm(v_sub(rib_pts[-1], rib_pts[-2]))
        finial_tip = v_add(rib_pts[-1], v_mul(tip_dir, 0.035))
        armor.add_tube(rib_pts, 0.012, 0.005, u_segs=4, samples_per_seg=1, cap_start=False)
        add_curved_claw_or_fang(
            gold,
            [rib_pts[-2], rib_pts[-1], finial_tip],
            r_base=0.009, r_tip=0.0018, u_segs=4, samples_per_seg=1,
        )

    # 5. Ornate Spiked Dark-Iron & Gold Shoulder Pauldrons (`ObsidianArmor` + `MalakorGold`)
    for sgn in (-1.0, 1.0):
        px, py, pz = sgn * 0.365, 2.045, -0.045

        for lame_i in range(2):
            ly = py - lame_i * 0.068
            lx = px + sgn * lame_i * 0.032
            rx_l = 0.142 - lame_i * 0.015
            ry_l = 0.086 - lame_i * 0.010
            rz_l = 0.154 - lame_i * 0.015
            rot_p = (0.06, sgn * -0.10, sgn * (-0.32 - lame_i * 0.14))
            armor.add_ellipsoid(
                center=(lx, ly, pz),
                radii=(rx_l, ry_l, rz_l),
                u_segs=8, v_segs=5,
                rot_euler=rot_p,
            )
            rim_pts = [
                (
                    lx + math.cos(a) * (rx_l + 0.005),
                    ly - 0.012 - abs(math.cos(a)) * 0.024,
                    pz + math.sin(a) * (rz_l + 0.005),
                )
                for a in [k * math.pi * 2.0 / 8 for k in range(9)]
            ]
            gold.add_tube(rim_pts, 0.0075, 0.0075, u_segs=4, samples_per_seg=1, cap_start=False, cap_end=False)

        # BloodRubyGem cabochon set in gold bezel on front-outer pauldron face
        gold.add_ellipsoid(
            center=(px + sgn * 0.052, py + 0.015, pz - 0.112),
            radii=(0.026, 0.030, 0.015),
            u_segs=6, v_segs=4,
        )
        ruby.add_ellipsoid(
            center=(px + sgn * 0.055, py + 0.015, pz - 0.122),
            radii=(0.017, 0.021, 0.011),
            u_segs=6, v_segs=4,
        )

        # 3 Curved Obsidian & Gold Pauldron Spikes sweeping skyward!
        spike_defs = [
            (0.015, 0.055, -0.050, 0.185, 0.090),
            (0.062, 0.048, 0.008, 0.225, 0.130),
            (0.092, 0.022, 0.060, 0.170, 0.140),
        ]
        for sx_o, sy_o, sz_o, s_h, s_out in spike_defs:
            sb = (px + sgn * sx_o, py + sy_o, pz + sz_o)
            sm = (sb[0] + sgn * s_out * 0.52, sb[1] + s_h * 0.56, sb[2] + 0.022)
            st = (sb[0] + sgn * s_out, sb[1] + s_h, sb[2] + 0.052)
            gold.add_ellipsoid(center=sb, radii=(0.022, 0.018, 0.022), u_segs=5, v_segs=4)
            add_curved_claw_or_fang(
                talons if s_h > 0.20 else armor,
                [sb, sm, st],
                r_base=0.019, r_tip=0.0020, u_segs=5, samples_per_seg=1,
            )

    # Armored Gorget Collar Ring bridging torso into `"head"` neck pivot
    gorget_pts = [
        (math.cos(a) * 0.132, 2.095 - 0.024 * math.cos(a), -0.105 + math.sin(a) * 0.122)
        for a in [k * math.pi * 2.0 / 10 for k in range(11)]
    ]
    armor.add_tube(gorget_pts, 0.026, 0.026, u_segs=5, samples_per_seg=1, cap_start=False, cap_end=False, scale_xy=(0.65, 1.35))


def _build_malakor_head_node(b, root_node, mats):
    """
    Sculpted aristocratic undead `"head"` node (`translation=(0.0, 2.28, -0.14)`):
      - Gaunt cheekbones, stern aristocratic nose, pointed vampire ears
      - Snarling fanged mouth with 4 long ivory vampire fangs
      - Blazing emissive eyes (`VampireGlowingRedEyes`, `emissive=(1.0, 0.08, 0.12)`)
      - Spiked dark-gold Gothic Crown (5 sharp spires with `BloodRubyGem` blood rubies)
      - Two swept-back curved obsidian demonic horns curving up to world `y = 2.720m`!
    """
    hp, hgp = b.create_parts_dict()
    skin = hgp(mats["skin"])
    crimson = hgp(mats["crimson_silk"])
    shadow = hgp(mats["inner_shadow"])
    fangs = hgp(mats["fangs"])
    eyes = hgp(mats["eyes"])
    gold = hgp(mats["gold"])
    ruby = hgp(mats["ruby"])
    horns = hgp(mats["talons"])
    armor = hgp(mats["armor"])

    # 1. Sinewy Aristocratic Neck tucking cleanly into Gorget (y_local = -0.21..-0.04)
    neck_pts = [(0.0, -0.210, 0.032), (0.0, -0.125, 0.010), (0.0, -0.035, -0.012)]
    skin.add_tube(neck_pts, 0.080, 0.068, u_segs=8, samples_per_seg=1, cap_start=False, scale_xy=(0.90, 1.05))
    for sgn in (-1.0, 1.0):
        tendon = [(sgn * 0.028, -0.205, -0.042), (sgn * 0.058, -0.120, -0.048), (sgn * 0.076, -0.035, -0.020)]
        skin.add_tube(tendon, 0.013, 0.011, u_segs=4, samples_per_seg=1, cap_start=False, cap_end=False)

    # 2. Sculpted Gaunt Aristocratic Cranium (centered at (0, +0.022, -0.022))
    def malakor_skull_deform(x, y, z, frac, theta):
        xx, yy, zz = x, y, z
        if yy > 0.02:
            dome = (yy - 0.02) / 0.16
            xx *= 1.0 + 0.06 * math.sin(dome * math.pi)
            zz *= 1.0 + 0.05 * math.sin(dome * math.pi)
        if zz < -0.02:
            cheek = math.exp(-(((yy + 0.028) / 0.032) ** 2)) * math.exp(-(((abs(xx) - 0.102) / 0.038) ** 2))
            xx += math.copysign(0.024 * cheek, xx)
            zz -= 0.016 * cheek
        if yy < -0.045 and zz < 0.03:
            hollow = min(1.0, (-0.045 - yy) / 0.105)
            xx *= 1.0 - 0.36 * hollow
            if zz < -0.075 and yy < -0.085:
                yy = max(-0.115, yy)
        if zz < -0.07:
            eye_d2 = ((abs(xx) - 0.056) / 0.036) ** 2 + ((yy + 0.018) / 0.028) ** 2
            zz += 0.028 * math.exp(-eye_d2)
        return (xx, yy, zz)

    skin.add_ellipsoid(
        center=(0.0, 0.022, -0.022),
        radii=(0.138, 0.175, 0.162),
        u_segs=14,
        v_segs=10,
        deform_fn=malakor_skull_deform,
    )

    # Swept-back obsidian-dark widow's peak hair/crest & heavy furrowed V-brow
    armor.add_ellipsoid(
        center=(0.0, 0.078, 0.008),
        radii=(0.136, 0.128, 0.158),
        u_segs=9, v_segs=6,
        rot_euler=(-0.18, 0.0, 0.0),
    )
    for sgn in (-1.0, 1.0):
        brow_pts = [
            (sgn * 0.010, 0.016, -0.178),
            (sgn * 0.056, 0.038, -0.174),
            (sgn * 0.098, 0.028, -0.142),
            (sgn * 0.114, 0.008, -0.098),
        ]
        skin.add_tube(brow_pts, 0.018, 0.008, u_segs=4, samples_per_seg=1, cap_start=False, cap_end=False, scale_xy=(1.15, 0.85))

    # 3. Aristocratic Aquiline Vampire Nose & Snarl Creases
    nose_spine = catmull_rom_chain([
        (0.0, 0.024, -0.170),
        (0.0, -0.012, -0.208),
        (0.0, -0.048, -0.214),
        (0.0, -0.056, -0.182),
    ], samples_per_seg=1)

    skin.add_loft(
        nose_spine,
        lambda t, th: (
            math.cos(th) * (0.017 + 0.006 * math.sin(t * math.pi) - 0.005 * (t ** 2)),
            math.sin(th) * (0.021 * (1.0 - 0.32 * t)),
        ),
        u_segs=6, cap_start=False, up_hint=(0.0, 1.0, 0.0),
    )
    for sgn in (-1.0, 1.0):
        snarl = [(sgn * 0.026, -0.048, -0.188), (sgn * 0.056, -0.086, -0.168), (sgn * 0.064, -0.128, -0.135)]
        skin.add_tube(snarl, 0.009, 0.0045, u_segs=4, samples_per_seg=1, cap_start=False, cap_end=False)

    # 4. Blazing Emissive Eyes (`VampireGlowingRedEyes`, `emissive=(1.0, 0.08, 0.12)`)
    for sgn in (-1.0, 1.0):
        shadow.add_ellipsoid(
            center=(sgn * 0.056, 0.004, -0.146),
            radii=(0.036, 0.024, 0.022),
            u_segs=7, v_segs=5,
            rot_euler=(0.0, sgn * 0.18, sgn * -0.15),
        )
        eyes.add_ellipsoid(
            center=(sgn * 0.056, 0.004, -0.158),
            radii=(0.028, 0.017, 0.018),
            u_segs=8, v_segs=5,
            rot_euler=(0.05, sgn * 0.18, sgn * -0.18),
        )

    # 5. Snarling Fanged Mouth with 4 Long Ivory Vampire Fangs + Incisors!
    shadow.add_ellipsoid(
        center=(0.0, -0.108, -0.128),
        radii=(0.056, 0.055, 0.048),
        u_segs=7, v_segs=5,
    )
    upper_lip = [
        (-0.064, -0.085, -0.136),
        (-0.034, -0.064, -0.174),
        (0.0, -0.062, -0.184),
        (0.034, -0.064, -0.174),
        (0.064, -0.085, -0.136),
    ]
    skin.add_tube(upper_lip, 0.013, 0.013, u_segs=4, samples_per_seg=1, cap_start=False, cap_end=False)

    jaw_pts = [
        (-0.084, -0.052, -0.055),
        (-0.058, -0.148, -0.128),
        (0.0, -0.192, -0.168),
        (0.058, -0.148, -0.128),
        (0.084, -0.052, -0.055),
    ]
    skin.add_tube(jaw_pts, 0.024, 0.024, u_segs=6, samples_per_seg=1, cap_start=False, cap_end=False, scale_xy=(0.88, 1.18))
    skin.add_ellipsoid(
        center=(0.0, -0.196, -0.165),
        radii=(0.032, 0.028, 0.034),
        u_segs=6, v_segs=4,
        rot_euler=(0.32, 0.0, 0.0),
    )
    crimson.add_tube(
        [(0.0, -0.142, -0.115), (0.0, -0.145, -0.148), (0.0, -0.156, -0.172)],
        0.022, 0.010, u_segs=4, samples_per_seg=1, cap_start=False, scale_xy=(1.25, 0.55),
    )

    # 4 Long Ivory Vampire Fangs (2 long upper canines + 2 sharp lower canines)
    for sgn in (-1.0, 1.0):
        u_fang = [
            (sgn * 0.034, -0.066, -0.172),
            (sgn * 0.033, -0.106, -0.182),
            (sgn * 0.029, -0.146, -0.180),
        ]
        add_curved_claw_or_fang(fangs, u_fang, r_base=0.0110, r_tip=0.0014, u_segs=5, samples_per_seg=2)

        l_fang = [
            (sgn * 0.023, -0.166, -0.160),
            (sgn * 0.023, -0.140, -0.168),
            (sgn * 0.021, -0.118, -0.166),
        ]
        add_curved_claw_or_fang(fangs, l_fang, r_base=0.0078, r_tip=0.0013, u_segs=5, samples_per_seg=1)

    # 6. Long Aristocratic Pointed Bat-Like Ears
    for sgn in (-1.0, 1.0):
        ear_spine = catmull_rom_chain([
            (sgn * 0.126, 0.002, -0.018),
            (sgn * 0.195, 0.072, 0.022),
            (sgn * 0.268, 0.180, 0.080),
        ], samples_per_seg=2)

        def ear_sec(t, theta):
            w = 0.048 * (1.0 - 0.85 * (t ** 1.25)) + 0.0028
            d = 0.017 * (1.0 - 0.80 * (t ** 1.25)) + 0.0022
            cx = math.cos(theta) * w
            cy = math.sin(theta) * d
            if cy < 0.0:
                cy *= 0.32
            cy += (cx * cx) / max(0.014, w) * 0.42
            return (cx, cy)

        skin.add_loft(ear_spine, ear_sec, u_segs=6, cap_start=False, up_hint=(0.0, 0.0, 1.0))

    # 7. Spiked Dark-Gold Gothic Crown (5 Sharp Spires with Blood Rubies!)
    crown_y = 0.105
    crown_cz = -0.020
    crown_rx, crown_rz = 0.144, 0.166

    circlet_profile = [
        (1.00, -0.022),
        (1.06, -0.008),
        (1.07, 0.024),
        (0.95, 0.025),
        (0.95, -0.020),
    ]
    gold.add_lathe(
        circlet_profile,
        u_segs=18,
        translate=(0.0, crown_y, crown_cz),
        rot_euler=(0.08, 0.0, 0.0),
        scale=(crown_rx, 1.0, crown_rz),
    )

    # 5 Sharp Gothic Crown Spires facing forward/sides (-Z = -pi/2) with 5 BloodRubyGems!
    spire_specs = [
        (-math.pi * 0.5, 0.235, 0.028),          # Center tallest sovereign spire (-Z)
        (-math.pi * 0.5 - 0.58, 0.188, 0.023),   # Front-left spire
        (-math.pi * 0.5 + 0.58, 0.188, 0.023),   # Front-right spire
        (-math.pi * 0.5 - 1.18, 0.152, 0.020),   # Outer-left spire
        (-math.pi * 0.5 + 1.18, 0.152, 0.020),   # Outer-right spire
    ]
    for s_ang, s_height, s_rad in spire_specs:
        ca, sa = math.cos(s_ang), math.sin(s_ang)
        bx_s = ca * crown_rx * 1.02
        bz_s = crown_cz + sa * crown_rz * 1.02
        by_s = crown_y + 0.018 - sa * 0.012

        spire_pts = [
            (bx_s, by_s - 0.012, bz_s),
            (bx_s + ca * 0.014, by_s + s_height * 0.52, bz_s + sa * 0.014),
            (bx_s + ca * 0.024, by_s + s_height, bz_s + sa * 0.024),
        ]
        add_curved_claw_or_fang(
            gold,
            spire_pts,
            r_base=s_rad,
            r_tip=0.0022,
            u_segs=5,
            samples_per_seg=1,
            blade_aspect=(0.86, 1.16),
            up_hint=(0.0, 0.0, 1.0),
        )
        gem_pos = (bx_s + ca * (s_rad * 0.72), by_s + 0.016, bz_s + sa * (s_rad * 0.72))
        ruby.add_ellipsoid(
            center=gem_pos,
            radii=(s_rad * 0.58, s_rad * 0.78, s_rad * 0.58),
            u_segs=6, v_segs=4,
        )

    # 8. Two Swept-Back Curved Obsidian Demonic Horns curving majestically up to y = 2.720m!
    for sgn in (-1.0, 1.0):
        gold.add_ellipsoid(
            center=(sgn * 0.132, 0.115, -0.022),
            radii=(0.044, 0.042, 0.044),
            u_segs=6, v_segs=4,
        )

        horn_ctrl = [
            (sgn * 0.125, 0.112, -0.022),   # Temple root
            (sgn * 0.215, 0.168, 0.035),    # Sweeps wide & backward
            (sgn * 0.278, 0.268, 0.118),    # Powerful outward-back arc
            (sgn * 0.268, 0.368, 0.155),    # Curves sharply skyward
            (sgn * 0.218, 0.438, 0.132),    # Razor tip at world y = 2.720m!
        ]
        horn_spine = catmull_rom_chain(horn_ctrl, samples_per_seg=2)

        def horn_sec(t, theta):
            base_r = 0.042 * ((1.0 - t) ** 1.08) + 0.0022
            annular = 1.0 + 0.10 * math.sin(t * math.pi * 16.0) * ((1.0 - t) ** 0.75)
            keel = 1.0 + 0.14 * math.cos(theta * 2.0)
            r = base_r * annular
            return (math.cos(theta) * r * 0.90 * keel, math.sin(theta) * r * 1.10)

        horns.add_loft(
            horn_spine,
            horn_sec,
            u_segs=9,
            cap_start=False,
            cap_end=True,
            up_hint=(0.0, 1.0, 0.0),
        )

    head_mesh = b.add_mesh_from_parts("MalakorHeadMesh", hp.values())
    return b.add_node(
        "head",
        translation=(0.0, 2.280, -0.140),
        mesh_idx=head_mesh,
        parent_idx=root_node,
    )


def _build_malakor_arm_node(b, idx, sgn, root_node, mats):
    """
    Articulated `"arm0"` (left, x<0) and `"arm1"` (right, x>0) nodes:
      - Upper royal velvet sleeve + gold armlet
      - Sculpted ObsidianArmor & MalakorGold gothic vambrace + elbow couter spike + dorsal fin blade
      - Tattered crimson bat-wing drapes hanging beneath arm
      - Gaunt pale undead hand + armored knuckle plate + 5 long curved obsidian-crimson talons!
    """
    ap, agp = b.create_parts_dict()
    a_cloak = agp(mats["outer_cloak"])
    a_silk = agp(mats["crimson_silk"])
    a_skin = agp(mats["skin"])
    a_armor = agp(mats["armor"])
    a_gold = agp(mats["gold"])
    a_talons = agp(mats["talons"])

    elbow = (sgn * 0.105, -0.205, -0.255)
    wrist = (sgn * 0.052, -0.135, -0.585)

    # 1. Upper Arm in Royal Cloak Velvet ((0,0,0) -> elbow)
    upper_spine = catmull_rom_chain([
        (0.0, 0.015, 0.015),
        (sgn * 0.058, -0.102, -0.125),
        elbow,
    ], samples_per_seg=2)

    a_cloak.add_loft(
        upper_spine,
        lambda t, th: (math.cos(th) * (0.086 * (1.0 - 0.20 * t)) * 0.94, math.sin(th) * (0.086 * (1.0 - 0.20 * t)) * 1.06),
        u_segs=7, up_hint=(0.0, 1.0, 0.0),
    )

    # Spiked Gothic Elbow Couter
    a_armor.add_ellipsoid(
        center=(elbow[0] + sgn * 0.018, elbow[1] - 0.018, elbow[2] + 0.025),
        radii=(0.066, 0.062, 0.066),
        u_segs=6, v_segs=4,
    )
    add_curved_claw_or_fang(
        a_armor,
        [
            (elbow[0] + sgn * 0.032, elbow[1] - 0.024, elbow[2] + 0.045),
            (elbow[0] + sgn * 0.068, elbow[1] - 0.058, elbow[2] + 0.115),
            (elbow[0] + sgn * 0.085, elbow[1] - 0.072, elbow[2] + 0.185),
        ],
        r_base=0.017, r_tip=0.002, u_segs=4, samples_per_seg=1,
    )

    # 2. Tattered Crimson Bat-Wing Arm Drape + Trailing Ribbon
    s_rows = 4
    s_cols = 9
    sleeve_rings = []
    for vr in range(s_rows):
        vf = vr / (s_rows - 1)
        ring = []
        for uc in range(s_cols):
            uf = uc / (s_cols - 1)
            ax = sgn * (0.038 + 0.062 * math.sin(uf * math.pi * 0.85))
            ay = -0.065 - 0.135 * math.sin(uf * math.pi * 0.78)
            az = -0.085 - uf * 0.385

            jag_peak = abs(math.cos(uf * math.pi * 3.5))
            drop_len = (0.24 + 0.32 * jag_peak) * (1.0 - 0.20 * uf)
            flare_x = sgn * (0.040 * vf * math.sin(uf * math.pi * 3.0))
            sweep_z = 0.085 * (vf ** 1.3)

            ring.append((ax + flare_x, ay - vf * drop_len, az + sweep_z))
        sleeve_rings.append(ring)

    add_dual_sided_gothic_drapery(
        a_cloak,
        a_silk,
        sleeve_rings,
        ref_center_fn=lambda y: (0.0, y, -0.26),
        thickness=0.006,
        closed_u=False,
    )

    add_tattered_ribbon(
        a_silk,
        [
            (sgn * 0.082, -0.19, -0.22),
            (sgn * 0.105, -0.41, -0.16),
            (sgn * 0.092, -0.59, -0.09),
        ],
        width_start=0.075, width_end=0.012,
        normal_hint=(sgn, 0.0, 0.2),
        samples_per_seg=2, twist_rad=0.35 * sgn, wave_amp=0.015,
    )

    # 3. Sculpted Obsidian & Gold Armored Vambrace (elbow -> wrist)
    fore_spine = catmull_rom_chain([
        elbow,
        (sgn * 0.082, -0.178, -0.420),
        wrist,
    ], samples_per_seg=2)

    def vambrace_sec(t, theta):
        flute = 1.0 + 0.08 * math.cos(theta * 6.0)
        r = (0.066 * (1.0 - 0.24 * t)) * flute
        return (math.cos(theta) * r * 0.94, math.sin(theta) * r * 1.06)

    a_armor.add_loft(fore_spine, vambrace_sec, u_segs=8, cap_start=False, up_hint=(0.0, 1.0, 0.0))

    cuff_ring = [
        (wrist[0] + math.cos(a) * 0.054, wrist[1] + math.sin(a) * 0.057, wrist[2] + 0.025)
        for a in [k * math.pi * 2.0 / 6 for k in range(7)]
    ]
    a_gold.add_tube(cuff_ring, 0.008, 0.008, u_segs=4, samples_per_seg=1, cap_start=False, cap_end=False)

    add_curved_claw_or_fang(
        a_armor,
        [
            (sgn * 0.118, -0.155, -0.465),
            (sgn * 0.156, -0.145, -0.385),
            (sgn * 0.175, -0.138, -0.295),
        ],
        r_base=0.015, r_tip=0.002, u_segs=4, samples_per_seg=1,
    )

    # 4. Gaunt Pale Undead Hand, Armored Knuckle Plate & 5 Long Curved Obsidian-Crimson Talons!
    palm_center = (wrist[0] - sgn * 0.006, wrist[1] - 0.008, wrist[2] - 0.068)
    a_skin.add_ellipsoid(
        center=palm_center,
        radii=(0.058, 0.026, 0.072),
        u_segs=7, v_segs=5,
        rot_euler=(0.14, sgn * -0.10, sgn * 0.18),
    )
    a_armor.add_beveled_box(
        palm_center[0], palm_center[1] + 0.022, palm_center[2] - 0.006,
        0.086, 0.016, 0.080, bevel=0.004,
        rot_euler=(0.14, sgn * -0.10, sgn * 0.18),
    )

    finger_defs = [
        (-0.052, -0.028,  0.022, 0.074, 0.175, -0.044, 0.092),  # Thumb
        (-0.035,  0.008, -0.050, 0.090, 0.208, -0.024, 0.112),  # Index
        (-0.008,  0.014, -0.058, 0.098, 0.228, -0.004, 0.126),  # Middle
        ( 0.020,  0.008, -0.052, 0.092, 0.212,  0.020, 0.118),  # Ring
        ( 0.044, -0.004, -0.042, 0.078, 0.185,  0.038, 0.104),  # Pinky
    ]

    for f_idx, (lat_x, ky_off, kz_off, p_len, c_len, sp_x, curl_y) in enumerate(finger_defs):
        kx = palm_center[0] + sgn * lat_x
        ky = palm_center[1] + ky_off
        kz = palm_center[2] + kz_off

        a_gold.add_ellipsoid(
            center=(kx, ky + 0.008, kz),
            radii=(0.013, 0.011, 0.014),
            u_segs=5, v_segs=4,
        )

        f_mid = (kx + sgn * sp_x * 0.45, ky - curl_y * 0.18, kz - p_len * 0.55)
        f_tip = (kx + sgn * sp_x * 0.90, ky - curl_y * 0.48, kz - p_len)
        a_skin.add_tube([(kx, ky, kz), f_mid, f_tip], 0.013, 0.010, u_segs=4, samples_per_seg=1, cap_start=False)

        inward_hook = -sgn * 0.024 if f_idx > 0 else sgn * 0.034
        claw_pts = [
            f_tip,
            (
                f_tip[0] + sgn * sp_x * 0.45 + inward_hook * 0.35,
                f_tip[1] - curl_y * 0.46,
                f_tip[2] - c_len * 0.54,
            ),
            (
                f_tip[0] + sgn * sp_x * 0.65 + inward_hook,
                f_tip[1] - curl_y * 1.14,
                f_tip[2] - c_len,
            ),
        ]
        add_curved_claw_or_fang(
            a_talons,
            claw_pts,
            r_base=0.0138 if f_idx != 2 else 0.0152,
            r_tip=0.0015,
            u_segs=4,
            samples_per_seg=2,
        )

    a_mesh = b.add_mesh_from_parts(f"MalakorArm{idx}Mesh", ap.values())
    return b.add_node(
        f"arm{idx}",
        translation=(sgn * 0.375, 1.985, -0.075),
        mesh_idx=a_mesh,
        parent_idx=root_node,
    )


def _build_arcane_aura_nodes(b, root_node, mats):
    """
    Subtle glowing crimson arcane rune rings (`ArcaneAuraRing`, `emissive=(0.95, 0.08, 0.18)`)
    hovering cleanly around Lord Malakor's base (`y ~ 0.045m`) and shoulders (`y ~ 2.08m`).
    """
    # 1. Hovering Base Arcane Rune Circle (`y = 0.045m`, strictly above boot soles y = 0.002m)
    bp, bgp = b.create_parts_dict()
    aura_b = bgp(mats["aura"])
    add_planar_ring_tube(aura_b, 0.0, r_major=0.68, rx_tube=0.015, ry_tube=0.005, u_segs=22, v_segs=4)
    add_planar_ring_tube(aura_b, 0.004, r_major=0.55, rx_tube=0.009, ry_tube=0.004, u_segs=18, v_segs=4)

    for r_i in range(8):
        ang = (r_i / 8.0) * math.pi * 2.0
        ca, sa = math.cos(ang), math.sin(ang)
        aura_b.add_faceted_prism(
            sides=4,
            r_top=0.004,
            r_bot=0.020,
            length=0.16,
            center=(ca * 0.62, 0.005, sa * 0.62),
            rot_euler=(0.0, -ang, -math.pi * 0.5),
            twist_offset=math.pi * 0.25,
        )

    base_aura_mesh = b.add_mesh_from_parts("MalakorBaseAuraMesh", bp.values())
    aura_base_node = b.add_node(
        "arcaneAuraBase",
        translation=(0.0, 0.045, 0.05),
        mesh_idx=base_aura_mesh,
        parent_idx=root_node,
    )

    # 2. Hovering Shoulder / Cathedral-Collar Arcane Halo Sigil (`y = 2.08m, z = +0.20m`)
    sp, sgp = b.create_parts_dict()
    aura_s = sgp(mats["aura"])
    add_planar_ring_tube(
        aura_s, 0.0, r_major=0.44, rx_tube=0.011, ry_tube=0.006,
        u_segs=20, v_segs=4, rot_euler=(math.pi * 0.5 - 0.22, 0.0, 0.0),
    )
    for s_i in range(8):
        ang = (s_i / 8.0) * math.pi * 2.0 + math.pi / 8.0
        ca, sa = math.cos(ang), math.sin(ang)
        p_in = (ca * 0.40, sa * 0.40 * math.cos(0.22), -sa * 0.40 * math.sin(0.22))
        p_out = (ca * 0.52, sa * 0.52 * math.cos(0.22), -sa * 0.52 * math.sin(0.22))
        add_curved_claw_or_fang(
            aura_s,
            [p_in, v_mul(v_add(p_in, p_out), 0.5), p_out],
            r_base=0.011, r_tip=0.002, u_segs=4, samples_per_seg=1,
            up_hint=(0.0, 0.0, 1.0),
        )

    sh_aura_mesh = b.add_mesh_from_parts("MalakorShoulderAuraMesh", sp.values())
    aura_sh_node = b.add_node(
        "arcaneAuraShoulders",
        translation=(0.0, 2.08, 0.20),
        mesh_idx=sh_aura_mesh,
        parent_idx=root_node,
    )
    return aura_base_node, aura_sh_node


# ---------------------------------------------------------------------------
# Public Entry Point
# ---------------------------------------------------------------------------

def build_boss_vampire_glb(out_path):
    """Builds and exports `assets/boss_vampire.glb` (Lord Malakor — The Vampire Overlord of Boot Hill)."""
    b = GLBBuilder()

    mats = {
        "outer_cloak": b.add_material(
            "MalakorOuterCloak",
            (0.075, 0.025, 0.055),
            metallic=0.08,
            roughness=0.78,
            emissive=(0.025, 0.004, 0.012),
            double_sided=True,
        ),
        "crimson_silk": b.add_material(
            "MalakorCrimsonSilk",
            (0.56, 0.035, 0.095),
            metallic=0.10,
            roughness=0.54,
            emissive=(0.10, 0.008, 0.024),
            double_sided=True,
        ),
        "armor": b.add_material(
            "ObsidianArmor",
            (0.13, 0.12, 0.15),
            metallic=0.88,
            roughness=0.24,
            emissive=(0.015, 0.006, 0.012),
        ),
        "gold": b.add_material(
            "MalakorGold",
            (0.84, 0.64, 0.24),
            metallic=0.92,
            roughness=0.25,
            emissive=(0.06, 0.04, 0.01),
        ),
        "ruby": b.add_material(
            "BloodRubyGem",
            (1.0, 0.08, 0.18),
            metallic=0.08,
            roughness=0.12,
            emissive=(1.0, 0.06, 0.14),
        ),
        "eyes": b.add_material(
            "VampireGlowingRedEyes",
            (1.0, 0.10, 0.14),
            metallic=0.0,
            roughness=0.10,
            emissive=(1.0, 0.08, 0.12),
        ),
        "aura": b.add_material(
            "ArcaneAuraRing",
            (1.0, 0.12, 0.24),
            metallic=0.05,
            roughness=0.18,
            emissive=(0.95, 0.08, 0.18),
            double_sided=True,
        ),
        "skin": b.add_material(
            "MalakorPaleSkin",
            (0.79, 0.76, 0.74),
            metallic=0.02,
            roughness=0.58,
            emissive=(0.045, 0.042, 0.044),
        ),
        "talons": b.add_material(
            "MalakorObsidianTalonsAndHorns",
            (0.10, 0.035, 0.055),
            metallic=0.45,
            roughness=0.16,
            emissive=(0.065, 0.006, 0.016),
        ),
        "fangs": b.add_material(
            "VampireIvoryFangs",
            (0.97, 0.95, 0.89),
            metallic=0.04,
            roughness=0.16,
            emissive=(0.08, 0.07, 0.06),
        ),
        "leather": b.add_material(
            "MalakorDarkLeather",
            (0.08, 0.06, 0.07),
            metallic=0.15,
            roughness=0.42,
        ),
        "inner_shadow": b.add_material(
            "MalakorInnerShadow",
            (0.14, 0.02, 0.04),
            metallic=0.02,
            roughness=0.86,
            double_sided=True,
        ),
    }

    root = b.add_node("BossVampireRoot")
    parts, gp = b.create_parts_dict()

    outer_cloak = gp(mats["outer_cloak"])
    crimson_silk = gp(mats["crimson_silk"])
    armor = gp(mats["armor"])
    gold = gp(mats["gold"])
    ruby = gp(mats["ruby"])
    skin = gp(mats["skin"])
    talons = gp(mats["talons"])
    leather = gp(mats["leather"])
    inner_shadow = gp(mats["inner_shadow"])

    # 1. Armored gothic-western boots, gold spurs, obsidian boot talons & regal legs
    _build_boots_spurs_and_legs(leather, armor, gold, talons, crimson_silk)

    # 2. Gothic breastplate over ribcage, BloodRubyGem medallion, gold chains & waist cincture
    _build_breastplate_ribcage_and_medallion(
        outer_cloak, crimson_silk, inner_shadow, skin, leather, armor, gold, ruby
    )

    # 3. Sweeping multi-layered royal cloak, tattered train, cathedral collar & spiked pauldrons
    _build_royal_cloak_collar_and_pauldrons(
        outer_cloak, crimson_silk, armor, gold, ruby, talons
    )

    body_mesh = b.add_mesh_from_parts("BossVampireBodyMesh", parts.values())
    body_node = b.add_node("BossVampireBody", mesh_idx=body_mesh, parent_idx=root)

    # 4. Named child nodes: `"head"`, `"arm0"` (left), `"arm1"` (right) + arcane aura rings
    head_node = _build_malakor_head_node(b, root, mats)
    arm0 = _build_malakor_arm_node(b, 0, -1.0, root, mats)
    arm1 = _build_malakor_arm_node(b, 1, 1.0, root, mats)
    aura_base, aura_sh = _build_arcane_aura_nodes(b, root, mats)

    # 5. Embedded glTF Quaternion Keyframe Animations:
    #    - "Idle" (2.2s menacing hover/breathe & claw flex)
    #    - "Walk" (1.0s stalking stride/arm sweep)
    #    - "Attack" (0.45s twin-claw dark slash)
    idle_t = [0.0, 0.55, 1.10, 1.65, 2.20]
    b.add_animation("Idle", [
        {
            "node": body_node,
            "path": "rotation",
            "times": idle_t,
            "values": [
                quat_from_euler_xyz(0.0, 0.0, 0.0),
                quat_from_euler_xyz(-0.018, 0.016, 0.008),
                quat_from_euler_xyz(-0.030, 0.0, 0.0),
                quat_from_euler_xyz(-0.012, -0.016, -0.008),
                quat_from_euler_xyz(0.0, 0.0, 0.0),
            ],
        },
        {
            "node": head_node,
            "path": "rotation",
            "times": idle_t,
            "values": [
                quat_from_euler_xyz(0.0, 0.0, 0.0),
                quat_from_euler_xyz(0.035, 0.065, -0.020),
                quat_from_euler_xyz(-0.025, 0.0, 0.0),
                quat_from_euler_xyz(0.030, -0.065, 0.020),
                quat_from_euler_xyz(0.0, 0.0, 0.0),
            ],
        },
        {
            "node": arm0,
            "path": "rotation",
            "times": idle_t,
            "values": [
                quat_from_euler_xyz(0.0, 0.0, 0.0),
                quat_from_euler_xyz(0.11, 0.07, -0.06),
                quat_from_euler_xyz(0.18, 0.12, -0.10),
                quat_from_euler_xyz(-0.05, -0.04, 0.04),
                quat_from_euler_xyz(0.0, 0.0, 0.0),
            ],
        },
        {
            "node": arm1,
            "path": "rotation",
            "times": idle_t,
            "values": [
                quat_from_euler_xyz(0.0, 0.0, 0.0),
                quat_from_euler_xyz(0.09, -0.07, 0.06),
                quat_from_euler_xyz(0.17, -0.12, 0.10),
                quat_from_euler_xyz(-0.05, 0.04, -0.04),
                quat_from_euler_xyz(0.0, 0.0, 0.0),
            ],
        },
        {
            "node": aura_base,
            "path": "rotation",
            "times": idle_t,
            "values": [
                quat_from_euler_xyz(0.0, 0.0, 0.0),
                quat_from_euler_xyz(0.0, math.pi * 0.25, 0.0),
                quat_from_euler_xyz(0.0, math.pi * 0.50, 0.0),
                quat_from_euler_xyz(0.0, math.pi * 0.25, 0.0),
                quat_from_euler_xyz(0.0, 0.0, 0.0),
            ],
        },
        {
            "node": aura_sh,
            "path": "rotation",
            "times": idle_t,
            "values": [
                quat_from_euler_xyz(0.0, 0.0, 0.0),
                quat_from_euler_xyz(0.02, 0.0, 0.18),
                quat_from_euler_xyz(0.04, 0.0, 0.0),
                quat_from_euler_xyz(0.02, 0.0, -0.18),
                quat_from_euler_xyz(0.0, 0.0, 0.0),
            ],
        },
    ])

    walk_t = [0.0, 0.25, 0.50, 0.75, 1.00]
    b.add_animation("Walk", [
        {
            "node": body_node,
            "path": "rotation",
            "times": walk_t,
            "values": [
                quat_from_euler_xyz(0.035, -0.045, 0.018),
                quat_from_euler_xyz(0.020, 0.0, 0.0),
                quat_from_euler_xyz(0.035, 0.045, -0.018),
                quat_from_euler_xyz(0.020, 0.0, 0.0),
                quat_from_euler_xyz(0.035, -0.045, 0.018),
            ],
        },
        {
            "node": head_node,
            "path": "rotation",
            "times": walk_t,
            "values": [
                quat_from_euler_xyz(-0.025, 0.045, -0.015),
                quat_from_euler_xyz(0.015, 0.0, 0.0),
                quat_from_euler_xyz(-0.025, -0.045, 0.015),
                quat_from_euler_xyz(0.015, 0.0, 0.0),
                quat_from_euler_xyz(-0.025, 0.045, -0.015),
            ],
        },
        {
            "node": arm0,
            "path": "rotation",
            "times": walk_t,
            "values": [
                quat_from_euler_xyz(-0.22, 0.10, -0.06),
                quat_from_euler_xyz(0.08, 0.02, 0.0),
                quat_from_euler_xyz(0.32, -0.12, 0.08),
                quat_from_euler_xyz(0.04, 0.0, 0.0),
                quat_from_euler_xyz(-0.22, 0.10, -0.06),
            ],
        },
        {
            "node": arm1,
            "path": "rotation",
            "times": walk_t,
            "values": [
                quat_from_euler_xyz(0.32, 0.12, -0.08),
                quat_from_euler_xyz(0.04, 0.0, 0.0),
                quat_from_euler_xyz(-0.22, -0.10, 0.06),
                quat_from_euler_xyz(0.08, -0.02, 0.0),
                quat_from_euler_xyz(0.32, 0.12, -0.08),
            ],
        },
        {
            "node": aura_base,
            "path": "rotation",
            "times": walk_t,
            "values": [
                quat_from_euler_xyz(0.0, 0.0, 0.0),
                quat_from_euler_xyz(0.0, math.pi * 0.25, 0.0),
                quat_from_euler_xyz(0.0, math.pi * 0.50, 0.0),
                quat_from_euler_xyz(0.0, math.pi * 0.25, 0.0),
                quat_from_euler_xyz(0.0, 0.0, 0.0),
            ],
        },
    ])

    atk_t = [0.0, 0.14, 0.27, 0.37, 0.45]
    b.add_animation("Attack", [
        {
            "node": body_node,
            "path": "rotation",
            "times": atk_t,
            "values": [
                quat_from_euler_xyz(0.0, 0.0, 0.0),
                quat_from_euler_xyz(-0.075, 0.0, 0.0),
                quat_from_euler_xyz(0.115, 0.0, 0.0),
                quat_from_euler_xyz(0.045, 0.0, 0.0),
                quat_from_euler_xyz(0.0, 0.0, 0.0),
            ],
        },
        {
            "node": head_node,
            "path": "rotation",
            "times": atk_t,
            "values": [
                quat_from_euler_xyz(0.0, 0.0, 0.0),
                quat_from_euler_xyz(-0.14, 0.0, 0.0),
                quat_from_euler_xyz(0.18, 0.0, 0.0),
                quat_from_euler_xyz(0.06, 0.0, 0.0),
                quat_from_euler_xyz(0.0, 0.0, 0.0),
            ],
        },
        {
            "node": arm0,
            "path": "rotation",
            "times": atk_t,
            "values": [
                quat_from_euler_xyz(0.0, 0.0, 0.0),
                quat_from_euler_xyz(0.66, 0.34, -0.26),
                quat_from_euler_xyz(-0.56, -0.42, 0.28),
                quat_from_euler_xyz(-0.18, -0.14, 0.10),
                quat_from_euler_xyz(0.0, 0.0, 0.0),
            ],
        },
        {
            "node": arm1,
            "path": "rotation",
            "times": atk_t,
            "values": [
                quat_from_euler_xyz(0.0, 0.0, 0.0),
                quat_from_euler_xyz(0.66, -0.34, 0.26),
                quat_from_euler_xyz(-0.56, 0.42, -0.28),
                quat_from_euler_xyz(-0.18, 0.14, -0.10),
                quat_from_euler_xyz(0.0, 0.0, 0.0),
            ],
        },
        {
            "node": aura_sh,
            "path": "rotation",
            "times": atk_t,
            "values": [
                quat_from_euler_xyz(0.0, 0.0, 0.0),
                quat_from_euler_xyz(-0.08, 0.0, -0.35),
                quat_from_euler_xyz(0.12, 0.0, 0.45),
                quat_from_euler_xyz(0.04, 0.0, 0.15),
                quat_from_euler_xyz(0.0, 0.0, 0.0),
            ],
        },
    ])

    return b.export_glb(out_path)


# ---------------------------------------------------------------------------
# Strict GLB Binary, Hierarchy, Bounds & Zero-Degenerate-Face Verifier
# ---------------------------------------------------------------------------

def verify_boss_vampire_glb(filepath):
    """Parses the exported .glb binary and verifies header, nodes, world AABB, animations & 0 degenerate faces."""
    with open(filepath, "rb") as f:
        data = f.read()

    magic, version, total_len = struct.unpack_from("<III", data, 0)
    assert magic == 0x46546C67, f"Invalid GLB magic: {hex(magic)}"
    assert version == 2, f"Invalid GLB version: {version}"
    assert total_len == len(data), f"Length mismatch: header={total_len}, file={len(data)}"

    json_len, json_type = struct.unpack_from("<II", data, 12)
    assert json_type == 0x4E4F534A, "Missing JSON chunk"
    gltf = json.loads(data[20 : 20 + json_len].decode("utf-8"))

    bin_off = 20 + json_len
    bin_len, bin_type = struct.unpack_from("<II", data, bin_off)
    assert bin_type == 0x004E4942, "Missing BIN chunk"
    bin_buf = data[bin_off + 8 : bin_off + 8 + bin_len]

    nodes = gltf["nodes"]
    meshes = gltf["meshes"]
    materials = gltf["materials"]
    accessors = gltf["accessors"]
    buffer_views = gltf["bufferViews"]

    def read_accessor(acc_idx):
        acc = accessors[acc_idx]
        bv = buffer_views[acc["bufferView"]]
        off = bv.get("byteOffset", 0) + acc.get("byteOffset", 0)
        cnt = acc["count"]
        t = acc["type"]
        if t == "VEC3":
            return [struct.unpack_from("<fff", bin_buf, off + i * 12) for i in range(cnt)]
        if t == "VEC4":
            return [struct.unpack_from("<ffff", bin_buf, off + i * 16) for i in range(cnt)]
        if t == "SCALAR":
            if acc["componentType"] == 5123:
                return [struct.unpack_from("<H", bin_buf, off + i * 2)[0] for i in range(cnt)]
            if acc["componentType"] == 5125:
                return [struct.unpack_from("<I", bin_buf, off + i * 4)[0] for i in range(cnt)]
            return [struct.unpack_from("<f", bin_buf, off + i * 4)[0] for i in range(cnt)]
        raise ValueError(f"Unsupported accessor type {t}")

    world_min = [float("inf")] * 3
    world_max = [float("-inf")] * 3
    node_world_pos = {}
    mesh_tris = {}
    degenerate_normals = 0
    degenerate_faces = 0
    total_tris = 0

    def walk_node(n_idx, parent_t=(0.0, 0.0, 0.0), parent_q=(0.0, 0.0, 0.0, 1.0)):
        nonlocal degenerate_normals, degenerate_faces, total_tris
        nd = nodes[n_idx]
        lt = tuple(nd.get("translation", [0.0, 0.0, 0.0]))
        lq = tuple(nd.get("rotation", [0.0, 0.0, 0.0, 1.0]))
        wt = v_add(parent_t, quat_rotate_vec(parent_q, lt))
        wq = quat_mul(parent_q, lq)
        node_world_pos[nd["name"]] = wt

        if "mesh" in nd:
            m_obj = meshes[nd["mesh"]]
            m_sum = 0
            for prim in m_obj["primitives"]:
                positions = read_accessor(prim["attributes"]["POSITION"])
                normals = read_accessor(prim["attributes"]["NORMAL"])
                indices = read_accessor(prim["indices"])
                nt = len(indices) // 3
                total_tris += nt
                m_sum += nt
                w_pts = []
                for p in positions:
                    wp = v_add(wt, quat_rotate_vec(wq, p))
                    w_pts.append(wp)
                    for k in range(3):
                        world_min[k] = min(world_min[k], wp[k])
                        world_max[k] = max(world_max[k], wp[k])
                for n in normals:
                    nl = v_len(n)
                    if not (0.98 <= nl <= 1.02) or any(math.isnan(c) for c in n):
                        degenerate_normals += 1
                for ti in range(0, len(indices), 3):
                    i0, i1, i2 = indices[ti], indices[ti + 1], indices[ti + 2]
                    if i0 == i1 or i1 == i2 or i0 == i2:
                        degenerate_faces += 1
                        continue
                    p0, p1, p2 = w_pts[i0], w_pts[i1], w_pts[i2]
                    if v_len(v_cross(v_sub(p1, p0), v_sub(p2, p0))) < 1e-10:
                        degenerate_faces += 1
            mesh_tris[m_obj["name"]] = m_sum

        for ch in nd.get("children", []):
            walk_node(ch, wt, wq)

    for r_idx in gltf["scenes"][0]["nodes"]:
        walk_node(r_idx)

    for req_node in ("arm0", "arm1", "head"):
        assert req_node in node_world_pos, f"Missing required child node: {req_node}"

    mat_names = {m["name"] for m in materials}
    for req_mat in (
        "MalakorOuterCloak",
        "MalakorCrimsonSilk",
        "ObsidianArmor",
        "MalakorGold",
        "BloodRubyGem",
        "VampireGlowingRedEyes",
        "ArcaneAuraRing",
    ):
        assert req_mat in mat_names, f"Missing required material: {req_mat}"

    anim_summary = {}
    for anim in gltf.get("animations", []):
        max_t = 0.0
        for s in anim["samplers"]:
            ts = read_accessor(s["input"])
            qs = read_accessor(s["output"])
            max_t = max(max_t, max(ts))
            for q in qs:
                ql = math.sqrt(sum(c * c for c in q))
                assert 0.999 <= ql <= 1.001, f"Non-unit quaternion in {anim['name']}: {ql}"
        anim_summary[anim["name"]] = round(max_t, 3)

    assert anim_summary == {"Idle": 2.2, "Walk": 1.0, "Attack": 0.45}, f"Unexpected animations: {anim_summary}"
    assert 0.0 <= world_min[1] <= 0.01, f"Boots not grounded cleanly at y=0: y_min={world_min[1]:.5f}"
    assert 2.70 <= world_max[1] <= 2.74, f"Boss top height should be ~2.72m: y_max={world_max[1]:.5f}"
    assert 8000 <= total_tris <= 11500, f"Triangle count {total_tris} outside target 8,000-11,500!"
    assert degenerate_normals == 0, f"Found {degenerate_normals} degenerate normals!"
    assert degenerate_faces == 0, f"Found {degenerate_faces} degenerate faces!"

    return {
        "file_bytes": len(data),
        "file_kb": round(len(data) / 1024.0, 2),
        "triangles": total_tris,
        "mesh_triangles": mesh_tris,
        "bbox_min": [round(c, 4) for c in world_min],
        "bbox_max": [round(c, 4) for c in world_max],
        "dimensions_m": [round(world_max[k] - world_min[k], 4) for k in range(3)],
        "head_world": [round(c, 4) for c in node_world_pos["head"]],
        "arm0_world": [round(c, 4) for c in node_world_pos["arm0"]],
        "arm1_world": [round(c, 4) for c in node_world_pos["arm1"]],
        "animations": anim_summary,
        "degenerate_normals": degenerate_normals,
        "degenerate_faces": degenerate_faces,
    }


if __name__ == "__main__":
    default_out = os.path.abspath(os.path.join(_SCRIPT_DIR, "..", "assets", "boss_vampire.glb"))
    out_file = sys.argv[1] if len(sys.argv) > 1 else default_out
    stats = build_boss_vampire_glb(out_file)
    check = verify_boss_vampire_glb(out_file)
    print(f"[build_boss_vampire] Generated {out_file}")
    print(json.dumps({"export": stats, "verification": check}, indent=2))
