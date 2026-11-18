#!/usr/bin/env python3
"""
Generates the game-ready sculpted Night Monster / Vampire model (`assets/vampire.glb`).

Features:
  - Hunched undead Nosferatu posture (`krum rygg`), gaunt forward-leaning shoulders,
    visible undead ribcage, sternum & clavicles over a dark blood-crimson inner robe,
    and clawed gothic dark boots peeking beneath the front hem (`y_min` in [0.0, 0.03], height ~1.88m, facing -Z).
  - Multi-layered billowing tattered gothic cloak (`double_sided=True`) with outer midnight cloth
    and inner dark crimson lining, deep organic vertical drapery folds, swept-back jagged hem strips,
    torn shoulder mantle with bat clasp, and a dramatic high flared ribbed bat-wing vampire collar.
  - Sculpted ash-pale Nosferatu skull-head with sunken cheeks, heavy furrowed V-brow, hooked nose,
    ribbed pointed bat-like ears, wide snarling open jaw with crimson mouth interior, 4 razor-sharp
    white vampire fangs (2 long upper canines, 2 lower), and piercing glowing red emissive eyes
    (`"VampireGlowingRedEyes"`, `emissive=(1.0, 0.08, 0.05)`).
  - Articulated clawed arm pivot nodes `"arm0"` (left) and `"arm1"` (right) with shredded bat-wing
    sleeve tatters, sinewy pale forearms, bony hands/knuckles, and 5 long curved razor claws per hand.
  - Embedded glTF quaternion animations: `"Idle"` (2.0s), `"Walk"` (1.0s), and `"Attack"` (0.35s).
"""

import math
import os
import sys

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPT_DIR not in sys.path:
    sys.path.insert(0, _SCRIPT_DIR)

from glb_core import (
    GLBBuilder,
    catmull_rom_chain,
    quat_from_euler_xyz,
    rotate_vec_between,
    v_add,
    v_cross,
    v_dot,
    v_mul,
    v_norm,
    v_sub,
)


# ---------------------------------------------------------------------------
# Custom Organic & Gothic Cloth Sculpting Helpers
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
    thickness=0.006,
    closed_u=False,
    uv_u_scale=1.0,
    uv_v_scale=1.0,
):
    """
    Emits an outward-facing outer shell (midnight cloak) and an inward-facing
    offset inner lining shell (blood-crimson silk) with verified normal orientation
    against ref_center_fn(y) -> (cx, cy, cz), preventing inside-out faces or z-fighting.
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
                if ip[1] < 0.014 and p[1] >= 0.014:
                    ip = (ip[0], 0.014, ip[2])
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
):
    """Builds a smooth curved & tapered cloth tatter strip along a 3D spline."""
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
        if t > 0.75:
            w *= max(0.10, (1.0 - t) / 0.25)

        ang = twist_rad * t
        ca, sa = math.cos(ang), math.sin(ang)
        s_dir = v_add(v_mul(side, ca), v_mul(b_nrm, sa))
        n_dir = v_add(v_mul(b_nrm, ca), v_mul(side, -sa))
        wave_off = math.sin(t * math.pi * 2.0) * wave_amp * t

        ring = []
        for u in range(u_steps):
            uf = (u / (u_steps - 1)) * 2.0 - 1.0
            camber = (1.0 - uf * uf) * 0.005 + wave_off
            p = v_add(pt, v_add(v_mul(s_dir, uf * w * 0.5), v_mul(n_dir, camber)))
            if p[1] < 0.012:
                p = (p[0], 0.012, p[2])
            ring.append(p)
        rings.append(ring)

    nrms = _compute_grid_normals(rings, closed_u=False)
    flip = v_dot(nrms[len(rings) // 2][1], normal_hint) < 0.0
    part.add_smooth_grid(rings, closed_u=False, ensure_outward=False, flip=flip)


def add_curved_claw_or_fang(
    part,
    ctrl_pts,
    r_base,
    r_tip=0.0012,
    u_segs=5,
    samples_per_seg=2,
    blade_aspect=(0.72, 1.28),
    up_hint=(0.0, 1.0, 0.0),
    cap_start=False,
):
    """Sculpts a curved, diamond-pinched razor claw or canine fang with sharp ridge contour."""
    spine = catmull_rom_chain(ctrl_pts, samples_per_seg=samples_per_seg)

    def sec(t, theta):
        r = r_base * ((1.0 - t) ** 1.18) + r_tip * t
        pinch = 1.0 + 0.14 * math.cos(theta * 2.0)
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


# ---------------------------------------------------------------------------
# Subsystem Builders
# ---------------------------------------------------------------------------

def _build_clawed_boots_and_legs(leather, iron, claws, dark_robe):
    """Sculpted gothic dark boots with 3 curved toe talons + bent predatory undead legs."""
    for sgn in (-1.0, 1.0):
        bx = sgn * 0.128

        # 1. Gothic boot foot & sole (y_min = 0.006, heel at z=+0.05 -> pointed vamp at z=-0.215)
        foot_spine = catmull_rom_chain([
            (bx, 0.046, 0.050),
            (bx, 0.052, -0.025),
            (bx, 0.045, -0.125),
            (bx, 0.034, -0.212),
        ], samples_per_seg=1)

        def foot_sec(t, theta):
            w = (0.054 - 0.028 * (t ** 1.5)) * (1.0 + 0.08 * math.sin(t * math.pi))
            h_top = 0.046 * (1.0 - 0.35 * (t ** 1.3))
            sy = math.sin(theta)
            y_off = sy * h_top if sy >= 0.0 else max(-0.038 + 0.012 * t, sy * 0.040)
            return (math.cos(theta) * w, y_off)

        leather.add_loft(foot_spine, foot_sec, u_segs=8, up_hint=(0.0, 1.0, 0.0))

        # Sculpted boot heel block (bottom at y = 0.006)
        leather.add_beveled_box(bx, 0.022, 0.032, 0.080, 0.032, 0.070, bevel=0.005)

        # 3 Curved obsidian/iron boot talons peeking out from front toe!
        for t_idx, tx_off in enumerate((-0.022, 0.0, 0.022)):
            mid_len = 0.064 if t_idx == 1 else 0.050
            talon_pts = [
                (bx + tx_off * 0.8, 0.028, -0.196),
                (bx + tx_off * 1.15, 0.024, -0.196 - mid_len * 0.55),
                (bx + tx_off * 1.35, 0.009, -0.196 - mid_len),
            ]
            add_curved_claw_or_fang(
                claws, talon_pts, r_base=0.0098, r_tip=0.0014, u_segs=4, samples_per_seg=1
            )

        # 2. Flared gothic boot shaft + pointed knee-guard cuff (y = 0.06..0.34)
        shaft_spine = [
            (bx, 0.065, -0.020),
            (bx, 0.185, -0.048),
            (bx, 0.320, -0.078),
        ]

        def shaft_sec(t, theta):
            rx = 0.056 + 0.014 * t
            rz = 0.064 + 0.016 * t
            front_peak = max(0.0, -math.sin(theta)) * 0.020 * (t ** 2)
            return (math.cos(theta) * rx, math.sin(theta) * rz - front_peak)

        leather.add_loft(shaft_spine, shaft_sec, u_segs=8, cap_start=False, up_hint=(0.0, 0.0, 1.0))

        # Boot ankle & shin straps + iron buckles
        for sy, sz, sr in ((0.115, -0.032, 0.064), (0.245, -0.062, 0.070)):
            strap_pts = [
                (bx + math.cos(a) * sr * 0.95, sy, sz + math.sin(a) * sr * 1.06)
                for a in [k * math.pi * 2.0 / 8 for k in range(9)]
            ]
            leather.add_tube(strap_pts, 0.008, 0.008, u_segs=4, samples_per_seg=1, cap_start=False, cap_end=False)
            iron.add_beveled_box(bx + sgn * 0.058, sy, sz - 0.025, 0.010, 0.022, 0.020, bevel=0.002)

        # 3. Lean predatory bent thigh & knee (y = 0.29..0.86)
        leg_spine = catmull_rom_chain([
            (bx, 0.295, -0.072),
            (bx * 1.02, 0.505, -0.095),
            (bx * 0.95, 0.700, -0.020),
            (bx * 0.80, 0.865, 0.045),
        ], samples_per_seg=2)

        def leg_sec(t, theta):
            r = 0.058 + 0.022 * (t ** 0.85) + 0.005 * math.sin(t * math.pi * 2.0)
            return (math.cos(theta) * r * 0.92, math.sin(theta) * r * 1.08)

        dark_robe.add_loft(leg_spine, leg_sec, u_segs=8, cap_start=False, cap_end=False, up_hint=(0.0, 0.0, 1.0))


def _build_hunched_torso_and_ribcage(cloak, crimson, dark_robe, skin, leather, iron):
    """
    Hunched undead spine (`krum rygg`), tattered dark blood-crimson inner robe,
    and prominent visible skeletal sternum, clavicles & 5 pairs of ribcage arches!
    """
    # 1. Tattered Blood-Crimson Inner Robe Skirt (parted at front center so clawed boots peek out!)
    skirt_rows = 7
    skirt_cols = 15
    skirt_rings = []
    for vr in range(skirt_rows):
        hf = vr / (skirt_rows - 1)
        yy = 0.08 + hf * 0.80
        rx = 0.285 * ((1.0 - hf) ** 0.65) + 0.142
        rz = 0.250 * ((1.0 - hf) ** 0.65) + 0.125
        # Slight forward clearance around knees so legs never poke through skirt
        cz = 0.045 * (1.0 - hf) + 0.025 * hf - 0.020 * math.sin(hf * math.pi)
        gap_half = 0.36 * (1.0 - hf * 0.62)
        phi_s = -math.pi * 0.5 + gap_half
        phi_l = math.pi * 2.0 - 2.0 * gap_half
        ring = []
        for uc in range(skirt_cols):
            ang = phi_s + (uc / (skirt_cols - 1)) * phi_l
            pleat = 1.0 + (1.0 - hf * 0.7) * 0.11 * math.sin(ang * 8.0)
            jag = (math.sin(ang * 11.0) * 0.045 + math.cos(ang * 7.0) * 0.025) * max(0.0, 1.0 - hf / 0.30)
            ring.append((
                math.cos(ang) * rx * pleat,
                max(0.045, yy + jag),
                cz + math.sin(ang) * rz * pleat,
            ))
        skirt_rings.append(ring)

    sk_nrms = _compute_grid_normals(skirt_rings, closed_u=False)
    sk_score = sum(
        v_dot(sk_nrms[v][u], (skirt_rings[v][u][0], 0.0, skirt_rings[v][u][2] - 0.03))
        for v in range(skirt_rows) for u in range(skirt_cols)
    )
    crimson.add_smooth_grid(skirt_rings, closed_u=False, ensure_outward=False, flip=(sk_score < 0.0))

    # 2. Hunched Inner Torso (`krum rygg`)
    torso_spine = catmull_rom_chain([
        (0.0, 0.83, 0.040),
        (0.0, 1.00, 0.065),
        (0.0, 1.18, 0.085),
        (0.0, 1.32, 0.035),
        (0.0, 1.39, -0.065),
        (0.0, 1.43, -0.145),
    ], samples_per_seg=2)

    def torso_sec(t, theta):
        waist_pinch = 1.0 - 0.24 * math.exp(-((t - 0.18) / 0.16) ** 2)
        rib_swell = 0.062 * math.exp(-((t - 0.62) / 0.26) ** 2)
        w = (0.152 * waist_pinch + rib_swell) * (1.0 - 0.26 * (t ** 4))
        d = (0.108 * waist_pinch + rib_swell * 0.72) * (1.0 - 0.24 * (t ** 4))
        return (math.cos(theta) * w, math.sin(theta) * d)

    crimson.add_loft(torso_spine, torso_sec, u_segs=10, cap_start=False, cap_end=False, up_hint=(0.0, 0.0, 1.0))

    # Dark recessed chest cavity behind ribs + gaunt pale upper throat V
    dark_robe.add_ellipsoid(
        center=(0.0, 1.18, -0.075),
        radii=(0.112, 0.165, 0.042),
        u_segs=8, v_segs=6,
        rot_euler=(0.24, 0.0, 0.0),
    )
    skin.add_ellipsoid(
        center=(0.0, 1.34, -0.132),
        radii=(0.082, 0.078, 0.036),
        u_segs=8, v_segs=5,
        rot_euler=(0.34, 0.0, 0.0),
    )

    # 3. Prominent Sculpted Undead Sternum, Clavicles & 5 Pairs of Protruding Ribcage Arches!
    sternum_pts = [
        (0.0, 1.368, -0.182),
        (0.0, 1.265, -0.172),
        (0.0, 1.155, -0.150),
        (0.0, 1.075, -0.126),
    ]
    skin.add_tube(sternum_pts, 0.017, 0.010, u_segs=5, samples_per_seg=1, cap_start=False, scale_xy=(1.2, 0.72))

    for sgn in (-1.0, 1.0):
        clav_pts = [
            (sgn * 0.014, 1.366, -0.184),
            (sgn * 0.125, 1.372, -0.158),
            (sgn * 0.235, 1.350, -0.102),
        ]
        skin.add_tube(clav_pts, 0.0135, 0.011, u_segs=5, samples_per_seg=1, cap_start=False, cap_end=False)

        for r_idx in range(5):
            rf = r_idx / 4.0
            ry = 1.312 - rf * 0.220
            rz_st = -0.178 + rf * 0.044
            rw = 0.138 + 0.028 * math.sin(rf * math.pi * 0.85) - 0.022 * rf
            rib_pts = [
                (sgn * 0.014, ry, rz_st),
                (sgn * rw * 0.56, ry - 0.014, rz_st - 0.008),
                (sgn * rw * 0.96, ry + 0.008, rz_st + 0.048),
                (sgn * rw * 1.04, ry + 0.036, rz_st + 0.115),
            ]
            skin.add_tube(
                rib_pts,
                0.0125 - 0.0015 * rf,
                0.0080,
                u_segs=5,
                samples_per_seg=1,
                cap_start=False,
                cap_end=False,
                scale_xy=(0.90, 1.15),
            )

        lapel_pts = [
            (sgn * 0.068, 0.94, -0.102),
            (sgn * 0.145, 1.16, -0.142),
            (sgn * 0.165, 1.35, -0.150),
        ]
        crimson.add_tube(lapel_pts, 0.022, 0.016, u_segs=5, samples_per_seg=1, cap_start=False, cap_end=False, scale_xy=(1.35, 0.50))

    # Tattered gothic waist sash & dark iron buckle
    sash_pts = [
        (math.cos(a) * 0.174, 0.89 - math.sin(a) * 0.015, 0.038 + math.sin(a) * 0.138)
        for a in [k * math.pi * 2.0 / 10 for k in range(11)]
    ]
    leather.add_tube(sash_pts, 0.026, 0.026, u_segs=5, samples_per_seg=1, cap_start=False, cap_end=False, scale_xy=(0.55, 1.35))
    iron.add_beveled_box(0.0, 0.90, -0.102, 0.054, 0.046, 0.016, bevel=0.004)


def _build_billowing_cloak_mantle_and_collar(cloak, crimson, leather, iron):
    """
    Multi-layered gothic cloak (outer midnight + inner blood-crimson lining),
    hunched upper-back drape (`krum rygg`), swept-back tattered hem strips,
    torn bat-wing shoulder mantle, gothic clasp, and high flared bat-wing collar (~1.88m)!
    """
    # 1. Sculpted Dark Hunched Upper-Back & Broad Gaunt Shoulders (`krum rygg` silhouette!)
    hunch_spine = catmull_rom_chain([
        (0.0, 1.02, 0.095),
        (0.0, 1.24, 0.145),
        (0.0, 1.42, 0.085),
        (0.0, 1.44, -0.075),
    ], samples_per_seg=2)

    def hunch_sec(t, theta):
        w = 0.215 + 0.065 * math.sin(t * math.pi * 0.82) - 0.045 * (t ** 3)
        d = 0.135 + 0.045 * math.sin(t * math.pi * 0.85) - 0.035 * (t ** 3)
        xr = math.cos(theta) * w
        yu = math.sin(theta) * d
        if yu > 0.0:
            yu += math.exp(-((xr / max(0.03, w * 0.22)) ** 2)) * 0.032 * math.sin(t * math.pi)
        return (xr, yu)

    cloak.add_loft(hunch_spine, hunch_sec, u_segs=10, cap_start=False, up_hint=(0.0, 0.0, 1.0))

    # 2. Main Billowing Tattered Gothic Cloak (open in front around -Z, sweeping back to +Z)
    v_rows = 10
    u_cols = 19
    cloak_rings = []
    for vr in range(v_rows):
        hf = vr / (v_rows - 1)
        base_y = 0.046 + hf * 1.375

        cz = 0.20 * ((1.0 - hf) ** 1.25) - 0.065 * (hf ** 1.4)
        rx = 0.49 * ((1.0 - hf) ** 0.74) + 0.195
        rz = 0.43 * ((1.0 - hf) ** 0.78) + 0.180

        gap_half = 0.52 * ((1.0 - hf) ** 0.82) + 0.24
        phi_s = -math.pi * 0.5 + gap_half
        phi_l = math.pi * 2.0 - 2.0 * gap_half

        ring = []
        for uc in range(u_cols):
            uf = uc / (u_cols - 1)
            ang = phi_s + uf * phi_l

            fold_env = (1.0 - hf * 0.80)
            fold = 1.0 + fold_env * (
                0.16 * math.sin(ang * 7.0 + 0.4)
                + 0.075 * math.cos(ang * 11.0 - 0.3)
                + 0.04 * math.sin(ang * 15.0)
            )
            back_billow = max(0.0, math.sin(ang)) * 0.13 * ((1.0 - hf) ** 1.35)

            xx = math.cos(ang) * rx * fold
            zz = cz + math.sin(ang) * rz * fold + back_billow
            yy = base_y

            if hf < 0.28:
                hem_f = 1.0 - (hf / 0.28)
                bat_scallop = -abs(math.sin(uf * math.pi * 8.0)) * 0.095 + 0.040
                shred = math.sin(ang * 13.0) * 0.040 + math.cos(ang * 19.0) * 0.025
                yy = max(0.016, yy + (bat_scallop + shred) * hem_f)

            if hf > 0.68 and math.sin(ang) > -0.15:
                yy += ((hf - 0.68) / 0.32) * 0.065 * max(0.0, math.sin(ang))

            ring.append((xx, yy, zz))
        cloak_rings.append(ring)

    add_dual_sided_gothic_drapery(
        cloak,
        crimson,
        cloak_rings,
        ref_center_fn=lambda y: (0.0, y, 0.04 * (1.0 - y / 1.4)),
        thickness=0.007,
        closed_u=False,
        uv_u_scale=2.0,
        uv_v_scale=2.0,
    )

    # 3. Trailing Swept-Back Tattered Cloth Strips along Lower Cloak Hem
    tatter_angles = (-0.35, 0.45, 1.25, 1.95, 2.75)
    for idx_t, t_ang in enumerate(tatter_angles):
        ca, sa = math.cos(t_ang), math.sin(t_ang)
        r_top = 0.31
        r_bot = 0.43 + 0.02 * (idx_t % 2)
        z_top = 0.10 + max(0.0, sa) * 0.05
        z_bot = 0.16 + max(0.0, sa) * 0.10
        pts = [
            (ca * r_top, 0.40, z_top + sa * (r_top * 0.84)),
            (ca * ((r_top + r_bot) * 0.5), 0.20, (z_top + z_bot) * 0.5 + sa * 0.34),
            (ca * r_bot, 0.022 + 0.012 * (idx_t % 3), z_bot + sa * (r_bot * 0.84)),
        ]
        strip_part = cloak if (idx_t % 2 == 0) else crimson
        add_tattered_ribbon(
            strip_part,
            pts,
            width_start=0.095,
            width_end=0.012,
            normal_hint=(ca, 0.12, sa),
            samples_per_seg=2,
            twist_rad=0.28 * (1 if idx_t % 2 == 0 else -1),
            wave_amp=0.016,
        )

    # 4. Torn Gothic Bat-Wing Shoulder Mantle (draped over hunched back & broad shoulders)
    m_rows = 5
    m_cols = 17
    mantle_rings = []
    for vr in range(m_rows):
        hf = vr / (m_rows - 1)
        yy = 1.05 + hf * 0.40
        cz = 0.10 * (1.0 - hf) - 0.055 * hf
        rx = 0.39 * ((1.0 - hf) ** 0.56) + 0.165
        rz = 0.33 * ((1.0 - hf) ** 0.60) + 0.165
        gap_half = 0.40 * (1.0 - hf * 0.35)
        phi_s = -math.pi * 0.5 + gap_half
        phi_l = math.pi * 2.0 - 2.0 * gap_half
        ring = []
        for uc in range(m_cols):
            uf = uc / (m_cols - 1)
            ang = phi_s + uf * phi_l
            fold = 1.0 + (1.0 - hf) * 0.12 * math.cos(uf * math.pi * 7.0)
            scallop = (abs(math.cos(uf * math.pi * 6.0)) * 0.095 - 0.045) * (1.0 - hf)
            hunch_lift = 0.055 * max(0.0, math.sin(ang)) * (hf ** 0.8)
            ring.append((
                math.cos(ang) * rx * fold,
                yy - scallop + hunch_lift,
                cz + math.sin(ang) * rz * fold,
            ))
        mantle_rings.append(ring)

    add_dual_sided_gothic_drapery(
        cloak,
        crimson,
        mantle_rings,
        ref_center_fn=lambda y: (0.0, y, 0.0),
        thickness=0.005,
        closed_u=False,
    )

    # Ornate Gothic Bat-Wing Clasp + Crimson Gem & Chain at Throat
    iron.add_ellipsoid(center=(0.0, 1.360, -0.192), radii=(0.025, 0.020, 0.012), u_segs=6, v_segs=5)
    crimson.add_ellipsoid(center=(0.0, 1.360, -0.200), radii=(0.013, 0.015, 0.008), u_segs=6, v_segs=5)
    for sgn in (-1.0, 1.0):
        wing_clasp = [
            (sgn * 0.020, 1.360, -0.190),
            (sgn * 0.068, 1.378, -0.178),
            (sgn * 0.105, 1.364, -0.160),
        ]
        iron.add_tube(wing_clasp, 0.010, 0.004, u_segs=4, samples_per_seg=1, cap_start=False, scale_xy=(0.8, 1.4))
    chain_pts = [
        (-0.105, 1.360, -0.162),
        (0.0, 1.310, -0.192),
        (0.105, 1.360, -0.162),
    ]
    iron.add_tube(chain_pts, 0.0045, 0.0045, u_segs=4, samples_per_seg=2, cap_start=False, cap_end=False)

    # 5. Dramatic High Flared Ribbed Bat-Wing Vampire Collar (exact peak height ~1.880m!)
    c_rows = 6
    c_cols = 19  # 6 webbed spans between 7 bat-wing collar ribs
    collar_rings = []
    num_webs = 6
    phi_s = -math.pi * 0.5 + 0.66
    phi_l = math.pi * 2.0 - 1.32

    for vr in range(c_rows):
        hf = vr / (c_rows - 1)
        ring = []
        for uc in range(c_cols):
            uf = uc / (c_cols - 1)
            ang = phi_s + uf * phi_l

            crown_arch = math.sin(uf * math.pi) ** 0.58
            twin_peak = 1.0 + 0.060 * math.cos((uf - 0.5) * math.pi * 3.0)
            top_h = 1.555 + 0.295 * crown_arch * twin_peak

            web_phase = abs(math.sin(uf * num_webs * math.pi))
            scallop_dip = web_phase * 0.058 * (hf ** 1.6)
            yy = 1.36 + hf * (top_h - 1.36) - scallop_dip

            flare_r = 0.155 + (0.205 + 0.042 * crown_arch) * (hf ** 1.08) - web_phase * 0.015 * hf
            cz = -0.065 + 0.145 * (hf ** 1.15) * (0.45 + 0.55 * crown_arch)
            xx = math.cos(ang) * flare_r * 1.06
            zz = cz + math.sin(ang) * flare_r * 0.88
            ring.append((xx, yy, zz))
        collar_rings.append(ring)

    add_dual_sided_gothic_drapery(
        cloak,
        crimson,
        collar_rings,
        ref_center_fn=lambda y: (0.0, y, -0.22),
        thickness=0.006,
        closed_u=False,
    )

    # 7 Sculpted Dark Leather/Bone Bat-Wing Ribs stiffening the high collar!
    for rib_i in range(num_webs + 1):
        col_idx = round(rib_i * (c_cols - 1) / num_webs)
        rib_pts = [collar_rings[vr][col_idx] for vr in (0, 2, 4, c_rows - 1)]
        tip_dir = v_norm(v_sub(rib_pts[-1], rib_pts[-2]))
        rib_pts.append(v_add(rib_pts[-1], v_mul(tip_dir, 0.012)))
        leather.add_tube(rib_pts, 0.0082, 0.0020, u_segs=4, samples_per_seg=1, cap_start=False)


def _build_nosferatu_head(skin, crimson, dark_robe, fangs, eyes):
    """
    Gaunt ash-pale Nosferatu skull-head (-Z) with sunken cheeks, heavy furrowed V-brow,
    hooked aquiline nose, ribbed pointed bat-like ears, wide snarling open jaw with
    dark crimson mouth interior, 4 razor-sharp white vampire fangs, and glowing red eyes!
    """
    # 1. Forward-Craned Sinewy Undead Neck + Sternocleidomastoid Tendons
    neck_pts = [(0.0, 1.375, -0.115), (0.0, 1.435, -0.175), (0.0, 1.495, -0.225)]
    skin.add_tube(neck_pts, 0.062, 0.052, u_segs=8, samples_per_seg=1, cap_start=False, scale_xy=(0.90, 1.05))
    for sgn in (-1.0, 1.0):
        tendon_pts = [
            (sgn * 0.022, 1.368, -0.178),
            (sgn * 0.048, 1.430, -0.205),
            (sgn * 0.064, 1.495, -0.218),
        ]
        skin.add_tube(tendon_pts, 0.0105, 0.0095, u_segs=4, samples_per_seg=1, cap_start=False, cap_end=False)

    # 2. Anatomically Sculpted Gaunt Nosferatu Cranium
    def nosferatu_deform(x, y, z, frac, theta):
        xx, yy, zz = x, y, z

        if yy > 0.02:
            dome = (yy - 0.02) / 0.13
            xx *= 1.0 + 0.07 * math.sin(dome * math.pi)
            zz *= 1.0 + 0.06 * math.sin(dome * math.pi)

        if zz < -0.02:
            cheekbone = math.exp(-(((yy + 0.035) / 0.028) ** 2)) * math.exp(-(((abs(xx) - 0.088) / 0.035) ** 2))
            xx += math.copysign(0.018 * cheekbone, xx)
            zz -= 0.012 * cheekbone

        if yy < -0.045 and zz < 0.02:
            hollow = min(1.0, (-0.045 - yy) / 0.085)
            xx *= 1.0 - 0.34 * hollow
            if zz < -0.06 and yy < -0.075:
                yy = max(-0.098, yy)

        if zz < -0.06:
            eye_d2 = ((abs(xx) - 0.048) / 0.032) ** 2 + ((yy + 0.042) / 0.026) ** 2
            socket = math.exp(-eye_d2)
            zz += 0.024 * socket

        return (xx, yy, zz)

    skin.add_ellipsoid(
        center=(0.0, 1.535, -0.235),
        radii=(0.116, 0.148, 0.138),
        u_segs=16,
        v_segs=12,
        deform_fn=nosferatu_deform,
    )

    # 3. Heavy Furrowed V-Brow Ridge & Glabella Scowl Wrinkles (tucked cleanly into temple)
    for sgn in (-1.0, 1.0):
        brow_pts = [
            (sgn * 0.008, 1.505, -0.368),
            (sgn * 0.046, 1.522, -0.364),
            (sgn * 0.082, 1.514, -0.336),
            (sgn * 0.094, 1.498, -0.300),
        ]
        skin.add_tube(brow_pts, 0.015, 0.006, u_segs=5, samples_per_seg=2, cap_start=False, cap_end=False, scale_xy=(1.1, 0.85))
        skin.add_tube(
            [(sgn * 0.013, 1.508, -0.366), (sgn * 0.010, 1.538, -0.354)],
            0.007, 0.003, u_segs=4, samples_per_seg=1, cap_start=False, cap_end=False,
        )

    # 4. Hooked Aquiline / Bat-Like Vampire Nose & Flared Nostrils
    nose_spine = catmull_rom_chain([
        (0.0, 1.512, -0.358),
        (0.0, 1.484, -0.392),
        (0.0, 1.454, -0.398),
        (0.0, 1.448, -0.366),
    ], samples_per_seg=2)

    def nose_sec(t, theta):
        w = 0.014 + 0.006 * math.sin(t * math.pi) - 0.005 * (t ** 2)
        h = 0.018 * (1.0 - 0.35 * t)
        return (math.cos(theta) * w, math.sin(theta) * h)

    skin.add_loft(nose_spine, nose_sec, u_segs=7, cap_start=False, up_hint=(0.0, 1.0, 0.0))
    for sgn in (-1.0, 1.0):
        skin.add_ellipsoid(
            center=(sgn * 0.020, 1.458, -0.376),
            radii=(0.012, 0.010, 0.015),
            u_segs=6, v_segs=5,
            rot_euler=(0.0, sgn * 0.25, sgn * -0.20),
        )
        snarl_pts = [
            (sgn * 0.024, 1.456, -0.372),
            (sgn * 0.048, 1.425, -0.356),
            (sgn * 0.054, 1.388, -0.326),
        ]
        skin.add_tube(snarl_pts, 0.0075, 0.0040, u_segs=4, samples_per_seg=1, cap_start=False, cap_end=False)

    # 5. Piercing Glowing Red Emissive Eyes (`VampireGlowingRedEyes`) in Dark Orbital Sockets
    for sgn in (-1.0, 1.0):
        dark_robe.add_ellipsoid(
            center=(sgn * 0.048, 1.492, -0.336),
            radii=(0.030, 0.022, 0.018),
            u_segs=8, v_segs=6,
            rot_euler=(0.0, sgn * 0.16, sgn * -0.14),
        )
        eyes.add_ellipsoid(
            center=(sgn * 0.048, 1.492, -0.345),
            radii=(0.023, 0.015, 0.016),
            u_segs=10, v_segs=6,
            rot_euler=(0.05, sgn * 0.16, sgn * -0.18),
        )

    # 6. Wide Snarling Open Jaw, Dark Crimson Mouth Interior, Tongue & 4 Razor-Sharp White Fangs!
    dark_robe.add_ellipsoid(
        center=(0.0, 1.392, -0.318),
        radii=(0.046, 0.048, 0.042),
        u_segs=8, v_segs=6,
    )
    upper_lip_pts = [
        (-0.052, 1.418, -0.326),
        (-0.030, 1.438, -0.358),
        (0.0, 1.440, -0.368),
        (0.030, 1.438, -0.358),
        (0.052, 1.418, -0.326),
    ]
    skin.add_tube(upper_lip_pts, 0.011, 0.011, u_segs=5, samples_per_seg=1, cap_start=False, cap_end=False)
    crimson.add_tube(
        [(-0.040, 1.425, -0.336), (0.0, 1.432, -0.360), (0.040, 1.425, -0.336)],
        0.010, 0.010, u_segs=5, samples_per_seg=1, cap_start=False, cap_end=False,
    )

    jaw_pts = [
        (-0.070, 1.445, -0.255),
        (-0.048, 1.355, -0.318),
        (0.0, 1.312, -0.352),
        (0.048, 1.355, -0.318),
        (0.070, 1.445, -0.255),
    ]
    skin.add_tube(jaw_pts, 0.020, 0.020, u_segs=7, samples_per_seg=2, cap_start=False, cap_end=False, scale_xy=(0.88, 1.18))
    skin.add_ellipsoid(
        center=(0.0, 1.310, -0.348),
        radii=(0.026, 0.024, 0.028),
        u_segs=7, v_segs=5,
        rot_euler=(0.35, 0.0, 0.0),
    )
    crimson.add_tube(
        [(-0.036, 1.348, -0.328), (0.0, 1.338, -0.350), (0.036, 1.348, -0.328)],
        0.009, 0.009, u_segs=4, samples_per_seg=1, cap_start=False, cap_end=False,
    )
    crimson.add_tube(
        [(0.0, 1.358, -0.305), (0.0, 1.356, -0.335), (0.0, 1.346, -0.356)],
        0.019, 0.008, u_segs=5, samples_per_seg=1, cap_start=False, scale_xy=(1.25, 0.55),
    )

    # 4 Razor-Sharp White Vampire Fangs (2 long upper canines + 2 sharp lower canines) + small incisors!
    for sgn in (-1.0, 1.0):
        u_fang_pts = [
            (sgn * 0.028, 1.436, -0.356),
            (sgn * 0.027, 1.404, -0.365),
            (sgn * 0.024, 1.370, -0.364),
        ]
        add_curved_claw_or_fang(
            fangs, u_fang_pts, r_base=0.0090, r_tip=0.0012, u_segs=6, samples_per_seg=2
        )
        l_fang_pts = [
            (sgn * 0.019, 1.338, -0.346),
            (sgn * 0.019, 1.360, -0.353),
            (sgn * 0.018, 1.377, -0.352),
        ]
        add_curved_claw_or_fang(
            fangs, l_fang_pts, r_base=0.0064, r_tip=0.0011, u_segs=5, samples_per_seg=2
        )
        inc_pts = [
            (sgn * 0.0075, 1.438, -0.364),
            (sgn * 0.0070, 1.416, -0.366),
        ]
        add_curved_claw_or_fang(
            fangs, inc_pts, r_base=0.0046, r_tip=0.0014, u_segs=4, samples_per_seg=1
        )

    # 7. Ribbed Pointed Bat-Like Ears (cleanly cupped outer pinna + crimson inner membrane + 3 ribs)
    for sgn in (-1.0, 1.0):
        ear_spine = catmull_rom_chain([
            (sgn * 0.104, 1.494, -0.226),
            (sgn * 0.156, 1.548, -0.204),
            (sgn * 0.198, 1.614, -0.180),
            (sgn * 0.224, 1.674, -0.155),
        ], samples_per_seg=2)

        def ear_sec(t, theta):
            w = 0.044 * (1.0 - 0.85 * (t ** 1.25)) + 0.0022
            d = 0.016 * (1.0 - 0.80 * (t ** 1.25)) + 0.0018
            cx = math.cos(theta) * w
            cy = math.sin(theta) * d
            if cy < 0.0:
                cy *= 0.30
            cy += (cx * cx) / max(0.012, w) * 0.42
            return (cx, cy)

        skin.add_loft(ear_spine, ear_sec, u_segs=8, cap_start=False, up_hint=(0.0, 0.0, 1.0))

        # Recessed crimson inner ear hollow + 3 clean cartilage ribs nestled inside cup
        crimson.add_tube(
            [(sgn * 0.122, 1.508, -0.218), (sgn * 0.190, 1.606, -0.181)],
            0.015, 0.003, u_segs=5, samples_per_seg=1, cap_start=False, scale_xy=(0.82, 0.24),
        )
        for r_e in range(3):
            ef = (r_e + 0.9) / 3.9
            ex = sgn * (0.122 + ef * 0.072)
            ey = 1.510 + ef * 0.102
            ez = -0.219 + ef * 0.039
            ew = 0.016 * (1.0 - ef * 0.50)
            rib_ear_pts = [
                (ex - sgn * 0.006, ey + ew * 0.70, ez - 0.004),
                (ex + sgn * 0.009, ey - ew * 0.70, ez - 0.003),
            ]
            skin.add_tube(rib_ear_pts, 0.0034, 0.0024, u_segs=4, samples_per_seg=1, cap_start=False, cap_end=False)


def _build_clawed_arm(b, idx, sgn, root_node, mats):
    """
    Articulated shoulder-pivoted arm (`arm0` left, `arm1` right) reaching menacingly forward (-Z):
    torn upper sleeve, shredded hanging bat-wing sleeve drape, sinewy pale forearm,
    sculpted bony hand/knuckles, and 5 long curved obsidian/bone razor claws!
    """
    ap, agp = b.create_parts_dict()
    a_cloak = agp(mats["cloak"])
    a_crim = agp(mats["crimson"])
    a_skin = agp(mats["skin"])
    a_claw = agp(mats["claws"])

    elbow = (sgn * 0.068, -0.135, -0.195)
    wrist = (sgn * 0.032, -0.088, -0.435)

    # 1. Shoulder deltoid wrap & upper arm in dark cloak cloth ((0,0,0) -> elbow)
    upper_spine = catmull_rom_chain([
        (0.0, 0.010, 0.010),
        (sgn * 0.038, -0.068, -0.095),
        elbow,
    ], samples_per_seg=2)

    def upper_sec(t, theta):
        r = 0.064 * (1.0 - 0.22 * t) + 0.006 * math.sin(theta * 5.0) * t
        return (math.cos(theta) * r * 0.94, math.sin(theta) * r * 1.06)

    a_cloak.add_loft(upper_spine, upper_sec, u_segs=7, up_hint=(0.0, 1.0, 0.0))

    # Torn jagged crimson sleeve cuff around elbow
    cuff_pts = [
        (
            elbow[0] + math.cos(a) * 0.056,
            elbow[1] + math.sin(a) * 0.056,
            elbow[2] - 0.012 + 0.018 * math.sin(a * 4.0),
        )
        for a in [k * math.pi * 2.0 / 7 for k in range(8)]
    ]
    a_crim.add_tube(cuff_pts, 0.011, 0.011, u_segs=4, samples_per_seg=1, cap_start=False, cap_end=False)

    # 2. Shredded Hanging Bat-Wing Sleeve Tatters
    s_rows = 4
    s_cols = 9
    sleeve_rings = []
    for vr in range(s_rows):
        vf = vr / (s_rows - 1)
        ring = []
        for uc in range(s_cols):
            uf = uc / (s_cols - 1)
            ax = sgn * (0.025 + 0.043 * math.sin(uf * math.pi * 0.85))
            ay = -0.045 - 0.088 * math.sin(uf * math.pi * 0.78)
            az = -0.065 - uf * 0.245

            jag_peak = abs(math.cos(uf * math.pi * 3.5))
            drop_len = (0.16 + 0.21 * jag_peak) * (1.0 - 0.22 * uf)
            flare_x = sgn * (0.028 * vf * math.sin(uf * math.pi * 3.0))
            sweep_z = 0.055 * (vf ** 1.3)

            ring.append((
                ax + flare_x,
                ay - vf * drop_len,
                az + sweep_z,
            ))
        sleeve_rings.append(ring)

    add_dual_sided_gothic_drapery(
        a_cloak,
        a_crim,
        sleeve_rings,
        ref_center_fn=lambda y: (0.0, y, -0.18),
        thickness=0.004,
        closed_u=False,
    )

    # 3. Sinewy Pale Forearm (anatomical taper + ulna/extensor tendon relief)
    fore_spine = catmull_rom_chain([
        elbow,
        (sgn * 0.056, -0.118, -0.315),
        wrist,
    ], samples_per_seg=2)

    def fore_sec(t, theta):
        r = 0.044 * (1.0 - 0.28 * t) + 0.004 * math.cos(theta * 3.0)
        return (math.cos(theta) * r * 0.92, math.sin(theta) * r * 1.08)

    a_skin.add_loft(fore_spine, fore_sec, u_segs=7, cap_start=False, up_hint=(0.0, 1.0, 0.0))

    # Bony wrist styloid bump
    a_skin.add_ellipsoid(
        center=(wrist[0] + sgn * 0.025, wrist[1] + 0.006, wrist[2]),
        radii=(0.013, 0.012, 0.015),
        u_segs=5, v_segs=4,
    )

    # 4. Bony Hand, Dorsal Metacarpal Tendons & Knuckles
    palm_center = (wrist[0] - sgn * 0.004, wrist[1] - 0.006, wrist[2] - 0.048)
    a_skin.add_ellipsoid(
        center=palm_center,
        radii=(0.042, 0.020, 0.052),
        u_segs=8, v_segs=5,
        rot_euler=(0.14, sgn * -0.10, sgn * 0.18),
    )

    # 5 Fingers (index, middle, ring, pinky + opposable inner thumb) + 5 Long Curved Razor Claws!
    finger_defs = [
        (-0.038, -0.022,  0.018, 0.052, 0.120, -0.032, 0.068),  # Thumb
        (-0.025,  0.006, -0.036, 0.064, 0.144, -0.018, 0.082),  # Index
        (-0.006,  0.010, -0.042, 0.070, 0.160, -0.003, 0.092),  # Middle
        ( 0.014,  0.006, -0.038, 0.065, 0.148,  0.014, 0.086),  # Ring
        ( 0.032, -0.003, -0.030, 0.055, 0.128,  0.028, 0.078),  # Pinky
    ]

    for f_idx, (lat_x, ky_off, kz_off, p_len, c_len, sp_x, curl_y) in enumerate(finger_defs):
        kx = palm_center[0] + sgn * lat_x
        ky = palm_center[1] + ky_off
        kz = palm_center[2] + kz_off

        a_skin.add_tube(
            [(wrist[0], wrist[1] + 0.010, wrist[2] - 0.006), (kx, ky + 0.008, kz)],
            0.0062, 0.0052, u_segs=4, samples_per_seg=1, cap_start=False, cap_end=False,
        )
        a_skin.add_ellipsoid(
            center=(kx, ky + 0.004, kz),
            radii=(0.0105, 0.0095, 0.0115),
            u_segs=5, v_segs=4,
        )

        f_mid = (kx + sgn * sp_x * 0.45, ky - curl_y * 0.18, kz - p_len * 0.55)
        f_tip = (kx + sgn * sp_x * 0.90, ky - curl_y * 0.48, kz - p_len)
        a_skin.add_tube([(kx, ky, kz), f_mid, f_tip], 0.0094, 0.0072, u_segs=4, samples_per_seg=1, cap_start=False)

        inward_hook = -sgn * 0.016 if f_idx > 0 else sgn * 0.024
        claw_pts = [
            f_tip,
            (
                f_tip[0] + sgn * sp_x * 0.45 + inward_hook * 0.35,
                f_tip[1] - curl_y * 0.45,
                f_tip[2] - c_len * 0.54,
            ),
            (
                f_tip[0] + sgn * sp_x * 0.65 + inward_hook,
                f_tip[1] - curl_y * 1.12,
                f_tip[2] - c_len,
            ),
        ]
        add_curved_claw_or_fang(
            a_claw,
            claw_pts,
            r_base=0.0094 if f_idx != 2 else 0.0104,
            r_tip=0.0012,
            u_segs=4,
            samples_per_seg=2,
        )

    a_mesh = b.add_mesh_from_parts(f"VampireArm{idx}Mesh", ap.values())
    return b.add_node(
        f"arm{idx}",
        translation=(sgn * 0.25, 1.34, -0.09),
        mesh_idx=a_mesh,
        parent_idx=root_node,
    )


# ---------------------------------------------------------------------------
# Public Entry Point
# ---------------------------------------------------------------------------

def build_vampire_glb(out_path):
    b = GLBBuilder()

    mats = {
        "cloak": b.add_material(
            "VampireDarkCloak",
            (0.08, 0.05, 0.13),
            metallic=0.04,
            roughness=0.88,
            emissive=(0.015, 0.008, 0.03),
            double_sided=True,
        ),
        "crimson": b.add_material(
            "VampireCrimsonLining",
            (0.48, 0.045, 0.11),
            metallic=0.06,
            roughness=0.72,
            emissive=(0.08, 0.008, 0.02),
            double_sided=True,
        ),
        "dark_robe": b.add_material(
            "VampireInnerRobeDark",
            (0.20, 0.028, 0.055),
            metallic=0.04,
            roughness=0.84,
            double_sided=True,
        ),
        "skin": b.add_material(
            "VampirePaleSkin",
            (0.77, 0.74, 0.70),
            metallic=0.02,
            roughness=0.62,
            emissive=(0.045, 0.042, 0.04),
        ),
        "leather": b.add_material(
            "VampireDarkLeather",
            (0.09, 0.07, 0.08),
            metallic=0.12,
            roughness=0.45,
        ),
        "iron": b.add_material(
            "VampireDarkIron",
            (0.38, 0.36, 0.42),
            metallic=0.86,
            roughness=0.28,
        ),
        "claws": b.add_material(
            "VampireObsidianClaws",
            (0.13, 0.10, 0.12),
            metallic=0.28,
            roughness=0.22,
        ),
        "fangs": b.add_material(
            "VampireFangs",
            (0.97, 0.95, 0.89),
            metallic=0.04,
            roughness=0.18,
            emissive=(0.08, 0.07, 0.06),
        ),
        "eyes": b.add_material(
            "VampireGlowingRedEyes",
            (1.0, 0.12, 0.08),
            metallic=0.0,
            roughness=0.12,
            emissive=(1.0, 0.08, 0.05),
        ),
    }

    root = b.add_node("VampireRoot")
    parts, gp = b.create_parts_dict()

    cloak = gp(mats["cloak"])
    crimson = gp(mats["crimson"])
    dark_robe = gp(mats["dark_robe"])
    skin = gp(mats["skin"])
    leather = gp(mats["leather"])
    iron = gp(mats["iron"])
    claws = gp(mats["claws"])
    fangs = gp(mats["fangs"])
    eyes = gp(mats["eyes"])

    # 1. Clawed gothic boots & predatory bent legs
    _build_clawed_boots_and_legs(leather, iron, claws, dark_robe)

    # 2. Hunched undead torso (`krum rygg`), crimson inner robe & visible ribcage/sternum
    _build_hunched_torso_and_ribcage(cloak, crimson, dark_robe, skin, leather, iron)

    # 3. Billowing tattered cloak, torn shoulder mantle & high flared bat-wing collar
    _build_billowing_cloak_mantle_and_collar(cloak, crimson, leather, iron)

    # 4. Sculpted Nosferatu skull-face, ribbed bat ears, open jaw, 4 fangs & glowing red eyes
    _build_nosferatu_head(skin, crimson, dark_robe, fangs, eyes)

    body_mesh = b.add_mesh_from_parts("VampireBodyMesh", parts.values())
    b.add_node("VampireBody", mesh_idx=body_mesh, parent_idx=root)

    # 5. Articulated Clawed Arms: "arm0" (left, x<0) & "arm1" (right, x>0)
    arm0 = _build_clawed_arm(b, 0, -1.0, root, mats)
    arm1 = _build_clawed_arm(b, 1, 1.0, root, mats)

    # 6. Embedded glTF Quaternion Animations ("Idle" 2.0s, "Walk" 1.0s, "Attack" 0.35s)
    b.add_animation("Idle", [
        {
            "node": arm0,
            "path": "rotation",
            "times": [0.0, 0.5, 1.0, 1.5, 2.0],
            "values": [
                quat_from_euler_xyz(0.0, 0.0, 0.0),
                quat_from_euler_xyz(0.08, 0.05, -0.04),
                quat_from_euler_xyz(0.12, 0.08, -0.06),
                quat_from_euler_xyz(-0.04, -0.03, 0.03),
                quat_from_euler_xyz(0.0, 0.0, 0.0),
            ],
        },
        {
            "node": arm1,
            "path": "rotation",
            "times": [0.0, 0.5, 1.0, 1.5, 2.0],
            "values": [
                quat_from_euler_xyz(0.0, 0.0, 0.0),
                quat_from_euler_xyz(0.05, -0.06, 0.04),
                quat_from_euler_xyz(0.11, -0.08, 0.06),
                quat_from_euler_xyz(-0.05, 0.03, -0.03),
                quat_from_euler_xyz(0.0, 0.0, 0.0),
            ],
        },
    ])

    b.add_animation("Walk", [
        {
            "node": arm0,
            "path": "rotation",
            "times": [0.0, 0.25, 0.50, 0.75, 1.0],
            "values": [
                quat_from_euler_xyz(-0.16, 0.08, -0.04),
                quat_from_euler_xyz(0.10, 0.02, 0.0),
                quat_from_euler_xyz(0.28, -0.10, 0.06),
                quat_from_euler_xyz(0.02, 0.0, 0.0),
                quat_from_euler_xyz(-0.16, 0.08, -0.04),
            ],
        },
        {
            "node": arm1,
            "path": "rotation",
            "times": [0.0, 0.25, 0.50, 0.75, 1.0],
            "values": [
                quat_from_euler_xyz(0.28, 0.10, -0.06),
                quat_from_euler_xyz(0.02, 0.0, 0.0),
                quat_from_euler_xyz(-0.16, -0.08, 0.04),
                quat_from_euler_xyz(0.10, -0.02, 0.0),
                quat_from_euler_xyz(0.28, 0.10, -0.06),
            ],
        },
    ])

    b.add_animation("Attack", [
        {
            "node": arm0,
            "path": "rotation",
            "times": [0.0, 0.10, 0.21, 0.35],
            "values": [
                quat_from_euler_xyz(0.0, 0.0, 0.0),
                quat_from_euler_xyz(0.56, 0.26, -0.18),
                quat_from_euler_xyz(-0.48, -0.32, 0.22),
                quat_from_euler_xyz(0.0, 0.0, 0.0),
            ],
        },
        {
            "node": arm1,
            "path": "rotation",
            "times": [0.0, 0.10, 0.21, 0.35],
            "values": [
                quat_from_euler_xyz(0.0, 0.0, 0.0),
                quat_from_euler_xyz(0.56, -0.26, 0.18),
                quat_from_euler_xyz(-0.48, 0.32, -0.22),
                quat_from_euler_xyz(0.0, 0.0, 0.0),
            ],
        },
    ])

    return b.export_glb(out_path)


if __name__ == "__main__":
    default_out = os.path.join(os.path.dirname(_SCRIPT_DIR), "assets", "vampire.glb")
    info = build_vampire_glb(default_out)
    print(f"Built {info['filepath']}: {info['triangles']} tris, {info['vertices']} verts, {info['bytes']} bytes")
