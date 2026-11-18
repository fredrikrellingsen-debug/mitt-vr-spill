#!/usr/bin/env python3
"""
Builds game-ready binary glTF 2.0 (.glb) assets for the Western Gunsmith (`Våpensmed`):
  1. build_gunsmith_glb(out_path)     -> assets/gunsmith.glb
  2. build_gunsmith_npc_glb(out_path) -> assets/gunsmith_npc.glb

Pure Python using glb_core.GLBBuilder with zero external dependencies.
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
    v_mul,
    v_norm,
    v_sub,
)


# ---------------------------------------------------------------------------
# Shared Architectural, Hard-Surface & Organic Sculpting Helpers
# ---------------------------------------------------------------------------

def add_gable_pediment_wall(part, cx, y_base, y_peak, cz, span_x, thickness, uv_scale=0.65):
    """Watertight 3D triangular gable pediment wall with crisp outward face normals."""
    hw = span_x * 0.5
    ht = thickness * 0.5
    z_f = cz + ht
    z_b = cz - ht

    p_fl = (cx - hw, y_base, z_f)
    p_fr = (cx + hw, y_base, z_f)
    p_fp = (cx, y_peak, z_f)

    p_bl = (cx - hw, y_base, z_b)
    p_br = (cx + hw, y_base, z_b)
    p_bp = (cx, y_peak, z_b)

    h = y_peak - y_base
    part.add_flat_tri(
        p_fl, p_fr, p_fp,
        (0.0, 0.0), (span_x * uv_scale, 0.0), (hw * uv_scale, h * uv_scale),
    )
    part.add_flat_tri(
        p_br, p_bl, p_bp,
        (0.0, 0.0), (span_x * uv_scale, 0.0), (hw * uv_scale, h * uv_scale),
    )
    part.add_flat_quad(p_bl, p_fl, p_fp, p_bp)
    part.add_flat_quad(p_fr, p_br, p_bp, p_fp)
    part.add_flat_quad(p_bl, p_br, p_fr, p_fl)


def add_gable_clapboards(part, cx, y_base, y_peak, cz_face, span_x, normal_sign_z=1.0, plank_h=0.20):
    """Horizontal tapered clapboard courses fitted inside a triangular gable end."""
    total_h = max(0.05, y_peak - y_base)
    y = y_base + plank_h * 0.5
    while y < y_peak - plank_h * 0.45:
        frac = (y + plank_h * 0.35 - y_base) / total_h
        w_at_y = span_x * (1.0 - frac) - 0.14
        if w_at_y > 0.32:
            part.add_beveled_box(
                cx, y, cz_face + normal_sign_z * 0.016,
                w_at_y, plank_h * 0.92, 0.032,
                bevel=0.0, rot_euler=(normal_sign_z * -0.06, 0.0, 0.0),
                uv_scale=0.65,
            )
        y += plank_h * 0.88


def add_clapboard_wall_x(part, cx, y_bot, y_top, cz, width, normal_sign_z=1.0, plank_h=0.22):
    """Overlapping horizontal clapboard siding strips along an X-aligned wall."""
    y = y_bot + plank_h * 0.5
    while y <= y_top - plank_h * 0.25:
        part.add_beveled_box(
            cx, y, cz + normal_sign_z * 0.014,
            width, plank_h * 0.94, 0.034,
            bevel=0.0, rot_euler=(normal_sign_z * -0.065, 0.0, 0.0),
            uv_scale=0.65,
        )
        y += plank_h * 0.88


def add_clapboard_wall_z(part, cx, y_bot, y_top, cz, depth_z, normal_sign_x=1.0, plank_h=0.22):
    """Overlapping horizontal clapboard siding strips along a Z-aligned side wall."""
    y = y_bot + plank_h * 0.5
    while y <= y_top - plank_h * 0.25:
        part.add_beveled_box(
            cx + normal_sign_x * 0.014, y, cz,
            0.034, plank_h * 0.94, depth_z,
            bevel=0.0, rot_euler=(0.0, 0.0, normal_sign_x * 0.065),
            uv_scale=0.65,
        )
        y += plank_h * 0.88


def add_turned_western_column(get_part, mat_wood, mat_accent, mat_iron, x, y_bot, y_top, z, radius=0.112):
    """Heavy turned & iron-banded Western gunsmith storefront column."""
    h = y_top - y_bot
    wood = get_part(mat_wood)
    acc = get_part(mat_accent)
    iron = get_part(mat_iron)

    plinth_h = 0.18
    cap_h = 0.16
    wood.add_beveled_box(x, y_bot + plinth_h * 0.42, z, radius * 2.50, plinth_h * 0.84, radius * 2.50, bevel=0.014)
    acc.add_beveled_box(x, y_bot + plinth_h * 0.92, z, radius * 2.18, plinth_h * 0.24, radius * 2.18, bevel=0.010)
    iron.add_beveled_box(x, y_bot + plinth_h * 0.42, z, radius * 2.58, 0.032, radius * 2.58, bevel=0.005)

    wood.add_beveled_box(x, y_top - cap_h * 0.42, z, radius * 2.60, cap_h * 0.84, radius * 2.60, bevel=0.014)
    acc.add_beveled_box(x, y_top - cap_h * 0.95, z, radius * 2.22, cap_h * 0.28, radius * 2.22, bevel=0.010)
    iron.add_beveled_box(x, y_top - cap_h * 0.42, z, radius * 2.66, 0.032, radius * 2.66, bevel=0.005)

    shaft_h = max(0.4, h - plinth_h - cap_h)
    profile = [
        (radius * 1.10, 0.000 * shaft_h),
        (radius * 1.18, 0.045 * shaft_h),
        (radius * 0.84, 0.085 * shaft_h),
        (radius * 1.08, 0.125 * shaft_h),
        (radius * 0.80, 0.165 * shaft_h),
        (radius * 1.02, 0.220 * shaft_h),
        (radius * 0.96, 0.460 * shaft_h),
        (radius * 0.90, 0.720 * shaft_h),
        (radius * 0.76, 0.805 * shaft_h),
        (radius * 1.06, 0.850 * shaft_h),
        (radius * 0.78, 0.895 * shaft_h),
        (radius * 1.14, 0.950 * shaft_h),
        (radius * 1.06, 1.000 * shaft_h),
    ]
    wood.add_lathe(profile, u_segs=20, translate=(x, y_bot + plinth_h, z))


def add_iron_scroll_bracket(get_part, mat_wood, mat_iron, x, y_top, z, dir_x=1.0, span=0.52):
    """Heavy timber & wrought-iron S-scroll knee bracket at top of storefront columns."""
    wood = get_part(mat_wood)
    iron = get_part(mat_iron)

    pts = [
        (x + dir_x * 0.055, y_top - span * 0.96, z),
        (x + dir_x * (span * 0.24), y_top - span * 0.62, z),
        (x + dir_x * (span * 0.58), y_top - span * 0.34, z),
        (x + dir_x * (span * 0.96), y_top - 0.045, z),
    ]
    iron.add_tube(pts, 0.032, 0.028, u_segs=10, samples_per_seg=5, scale_xy=(0.85, 1.15))

    wood.add_beveled_box(
        x + dir_x * (span * 0.48), y_top - span * 0.45, z,
        span * 1.02, 0.056, 0.058, bevel=0.008, rot_euler=(0.0, 0.0, dir_x * 0.76),
    )
    iron.add_beveled_box(
        x + dir_x * (span * 0.26), y_top - span * 0.22, z,
        0.036, span * 0.38, 0.044, bevel=0.005,
    )
    iron.add_ellipsoid(
        center=(x + dir_x * (span * 0.26), y_top - span * 0.23, z),
        radii=(0.046, 0.046, 0.028), u_segs=10, v_segs=6,
    )


def add_shuttered_window(
    get_part,
    mat_frame,
    mat_shutter,
    mat_glass,
    mat_iron,
    cx,
    cy,
    cz,
    width=0.86,
    height=1.08,
    rot_y=0.0,
):
    """Framed Western window with molded sill, pediment header, 6-pane muntins, WindowGlass & louvered shutters."""
    cos_y, sin_y = math.cos(rot_y), math.sin(rot_y)

    def lp(lx, ly, lz):
        wx = cx + lx * cos_y + lz * sin_y
        wz = cz - lx * sin_y + lz * cos_y
        return (wx, cy + ly, wz)

    frame = get_part(mat_frame)
    shutter = get_part(mat_shutter)
    glass = get_part(mat_glass)
    iron = get_part(mat_iron)

    hw, hh = width * 0.5, height * 0.5
    g_z = 0.015
    glass.add_flat_quad(
        lp(-hw, -hh, g_z), lp(hw, -hh, g_z), lp(hw, hh, g_z), lp(-hw, hh, g_z),
        [(0.0, 0.0), (1.0, 0.0), (1.0, 1.0), (0.0, 1.0)],
    )
    # Interior glass face so warm window glow is also visible from inside the shop
    glass.add_flat_quad(
        lp(hw, -hh, -g_z), lp(-hw, -hh, -g_z), lp(-hw, hh, -g_z), lp(hw, hh, -g_z),
        [(0.0, 0.0), (1.0, 0.0), (1.0, 1.0), (0.0, 1.0)],
    )

    frame.add_beveled_box(*lp(0.0, -hh - 0.088, 0.026), width + 0.14, 0.044, 0.065, bevel=0.008, rot_euler=(0.0, rot_y, 0.0))
    frame.add_beveled_box(*lp(0.0, -hh - 0.042, 0.052), width + 0.26, 0.078, 0.145, bevel=0.012, rot_euler=(0.0, rot_y, 0.0))
    frame.add_beveled_box(*lp(0.0, hh + 0.050, 0.040), width + 0.22, 0.092, 0.115, bevel=0.012, rot_euler=(0.0, rot_y, 0.0))
    frame.add_beveled_box(*lp(0.0, hh + 0.112, 0.052), width + 0.30, 0.044, 0.148, bevel=0.008, rot_euler=(0.0, rot_y, 0.0))
    for sx in (-hw - 0.044, hw + 0.044):
        frame.add_beveled_box(*lp(sx, 0.0, 0.030), 0.088, height + 0.04, 0.084, bevel=0.010, rot_euler=(0.0, rot_y, 0.0))

    frame.add_beveled_box(*lp(0.0, 0.0, 0.028), 0.030, height, 0.036, bevel=0.0, rot_euler=(0.0, rot_y, 0.0))
    frame.add_beveled_box(*lp(0.0, 0.0, 0.032), width, 0.038, 0.042, bevel=0.0, rot_euler=(0.0, rot_y, 0.0))
    for my in (-height * 0.25, height * 0.25):
        frame.add_beveled_box(*lp(0.0, my, 0.026), width, 0.024, 0.032, bevel=0.0, rot_euler=(0.0, rot_y, 0.0))

    # Iron security bars inside window frame (classic Armory touch)
    for bx in (-width * 0.26, width * 0.26):
        iron.add_faceted_prism(
            sides=6, r_top=0.009, r_bot=0.009, length=height - 0.04,
            center=lp(bx, 0.0, -0.005),
        )

    sh_w = width * 0.46
    sh_h = height - 0.02
    for side in (-1, 1):
        hinge_x = side * (hw + 0.078)
        yaw_open = rot_y + side * (-0.26 if side < 0 else -0.20)
        cy_o, sy_o = math.cos(yaw_open), math.sin(yaw_open)
        px_w, py_w, pz_w = lp(hinge_x, 0.0, 0.050)

        def sp(ox, oy, oz):
            return (
                px_w + ox * cy_o + oz * sy_o,
                py_w + oy,
                pz_w - ox * sy_o + oz * cy_o,
            )

        leaf_mid = side * (sh_w * 0.5)
        for st_off in (-sh_w * 0.5 + 0.025, sh_w * 0.5 - 0.025):
            shutter.add_beveled_box(*sp(leaf_mid + st_off, 0.0, 0.0), 0.050, sh_h, 0.036, bevel=0.0, rot_euler=(0.0, yaw_open, 0.0))
        for ry in (-sh_h * 0.5 + 0.034, 0.0, sh_h * 0.5 - 0.034):
            shutter.add_beveled_box(*sp(leaf_mid, ry, 0.0), sh_w, 0.062, 0.036, bevel=0.0, rot_euler=(0.0, yaw_open, 0.0))

        slat_y = -sh_h * 0.40
        while slat_y <= sh_h * 0.405:
            if abs(slat_y) > 0.056:
                shutter.add_beveled_box(
                    *sp(leaf_mid, slat_y, 0.003),
                    sh_w - 0.088, 0.044, 0.018, bevel=0.0, rot_euler=(0.46, yaw_open, 0.0),
                )
            slat_y += 0.095

        for hy in (-sh_h * 0.36, sh_h * 0.36):
            iron.add_beveled_box(*sp(side * 0.072, hy, 0.018), 0.16, 0.028, 0.022, bevel=0.0, rot_euler=(0.0, yaw_open, 0.0))
            iron.add_faceted_prism(sides=6, r_top=0.014, r_bot=0.014, length=0.075, center=sp(0.0, hy, 0.010))
        iron.add_beveled_box(*sp(side * (sh_w * 0.82), -sh_h * 0.42, 0.022), 0.028, 0.075, 0.024, bevel=0.0, rot_euler=(0.0, yaw_open, side * 0.35))


def add_oriented_ribbon(
    part,
    ctrl_pts,
    width,
    thickness,
    normal_fn,
    samples_per_seg=3,
    u_segs=4,
    cap_ends=True,
):
    """Sweeps a rounded rectangular ribbon cross-section along ctrl_pts without Bishop twist."""
    spine = catmull_rom_chain(ctrl_pts, samples_per_seg=samples_per_seg)
    m = len(spine)
    if m < 2:
        return

    rings = []
    tangents = []
    for i, pt in enumerate(spine):
        if i == 0:
            tan = v_norm(v_sub(spine[1], spine[0]), (0.0, -1.0, 0.0))
        elif i == m - 1:
            tan = v_norm(v_sub(spine[-1], spine[-2]), (0.0, -1.0, 0.0))
        else:
            tan = v_norm(v_sub(spine[i + 1], spine[i - 1]), (0.0, -1.0, 0.0))
        tangents.append(tan)

        t_param = i / (m - 1)
        n_hint = v_norm(normal_fn(t_param, pt), (0.0, 0.0, 1.0))
        n_vec = v_sub(n_hint, v_mul(tan, v_dot(n_hint, tan)))
        if abs(n_vec[0]) + abs(n_vec[1]) + abs(n_vec[2]) < 1e-6:
            fallback = (1.0, 0.0, 0.0) if abs(tan[0]) < 0.8 else (0.0, 1.0, 0.0)
            n_vec = v_sub(fallback, v_mul(tan, v_dot(fallback, tan)))
        n_vec = v_norm(n_vec)
        side_vec = v_norm(v_cross(tan, n_vec))

        hw = width(t_param) * 0.5 if callable(width) else width * 0.5
        ht = thickness(t_param) * 0.5 if callable(thickness) else thickness * 0.5

        ring = []
        for u in range(u_segs):
            ang = (u / u_segs) * math.pi * 2.0
            ca, sa = math.cos(ang), math.sin(ang)
            sx = math.copysign(abs(ca) ** 0.65, ca) * hw
            sy = math.copysign(abs(sa) ** 0.75, sa) * ht
            p = v_add(pt, v_add(v_mul(side_vec, sx), v_mul(n_vec, sy)))
            ring.append(p)
        rings.append(ring)

    part.add_smooth_grid(rings, closed_u=True, ensure_outward=True)
    if cap_ends:
        part.add_cap_ring(rings[0], v_mul(tangents[0], -1.0))
        part.add_cap_ring(rings[-1], tangents[-1])


def add_closed_loop_tube(
    part,
    loop_pts,
    r_x,
    r_y,
    u_segs=6,
    translate=(0.0, 0.0, 0.0),
    rot_euler=(0.0, 0.0, 0.0),
):
    """Builds a seamless closed tubular ring through periodic loop_pts."""
    n = len(loop_pts)
    if n < 3:
        return
    cx = sum(p[0] for p in loop_pts) / n
    cy = sum(p[1] for p in loop_pts) / n
    cz = sum(p[2] for p in loop_pts) / n
    rings = []
    for i in range(n):
        p_prev = loop_pts[(i - 1) % n]
        p_curr = loop_pts[i]
        p_next = loop_pts[(i + 1) % n]
        tan = v_norm(v_sub(p_next, p_prev), (1.0, 0.0, 0.0))
        rad_hint = v_norm(v_sub(p_curr, (cx, cy, cz)), (0.0, 0.0, 1.0))
        rad_vec = v_norm(v_sub(rad_hint, v_mul(tan, v_dot(rad_hint, tan))), (0.0, 0.0, 1.0))
        bi_vec = v_norm(v_cross(tan, rad_vec))

        ring = []
        for u in range(u_segs):
            ang = (u / u_segs) * math.pi * 2.0
            ca, sa = math.cos(ang), math.sin(ang)
            pt = v_add(p_curr, v_add(v_mul(rad_vec, ca * r_x), v_mul(bi_vec, sa * r_y)))
            ring.append(pt)
        rings.append(ring)
    rings.append(list(rings[0]))
    part.add_smooth_grid(
        rings,
        closed_u=True,
        translate=translate,
        rot_euler=rot_euler,
        ensure_outward=True,
    )


def add_articulated_finger(skin_part, joint_pts, r_base, r_tip, u_segs=4):
    """Sculpts a tapered 3-joint finger with knuckle swells and rounded fingertip."""
    spine = catmull_rom_chain(joint_pts, samples_per_seg=1)

    def finger_sec(t, theta):
        r = r_base + (r_tip - r_base) * (t ** 0.9)
        knuckle = 0.0010 * (
            math.exp(-((t - 0.36) / 0.13) ** 2) + 0.7 * math.exp(-((t - 0.68) / 0.12) ** 2)
        )
        rx = (r + knuckle) * 0.96
        ry = (r + knuckle) * 1.04
        if t > 0.86:
            tip_f = max(0.25, math.sqrt(max(0.0, 1.0 - ((t - 0.86) / 0.145) ** 2)))
            rx *= tip_f
            ry *= tip_f
        return (math.cos(theta) * rx, math.sin(theta) * ry)

    skin_part.add_loft(spine, finger_sec, u_segs=u_segs, cap_start=True, cap_end=True)


# ---------------------------------------------------------------------------
# Gunsmith Building Iconic Prop Builders
# ---------------------------------------------------------------------------

def add_blacksmith_anvil_and_stump(dark, pine, iron, brass, ax=2.18, ay_floor=0.22, az=2.32):
    """
    Sculpted London-pattern wrought-iron Blacksmith Anvil (flared feet, concave waist,
    stepped cutting table, tapered conical horn, recessed square hardy hole & pritchel hole)
    mounted on a thick iron-banded oak stump at (2.18, 0.22, 2.32) with a resting forging hammer.
    Oriented along Z (subtle -0.10 rad yaw) so x stays >= 1.95m (clear of x = -1.92..+1.92 entrance!).
    """
    stump_h = 0.52
    # Sculpted organic oak stump with root flare & bark flutes
    stump_prof = [
        (0.010, 0.002),
        (0.214, 0.000),
        (0.206, 0.055),
        (0.188, 0.145),
        (0.182, 0.290),
        (0.186, 0.435),
        (0.194, stump_h - 0.015),
        (0.188, stump_h),
        (0.008, stump_h - 0.002),
    ]

    def bark_deform(x, y, z, ang):
        flare = 1.0 + 0.045 * math.cos(ang * 5.0 + 0.4) * max(0.0, 1.0 - y / 0.22)
        knot = 1.0 + 0.022 * math.sin(ang * 7.0 + y * 9.0)
        return (x * flare * knot, y, z * flare * knot)

    dark.add_lathe(stump_prof, u_segs=16, translate=(ax, ay_floor, az), deform_fn=bark_deform)
    # Lighter heartwood end-grain cap on top of oak stump
    pine.add_faceted_prism(sides=14, r_top=0.178, r_bot=0.180, length=0.012, center=(ax, ay_floor + stump_h + 0.002, az))

    # Two heavy wrought-iron shrink bands around the oak stump + forged hex rivets
    for b_frac, b_rad in ((0.22, 0.190), (0.80, 0.191)):
        by = ay_floor + stump_h * b_frac
        band_prof = [
            (b_rad - 0.005, -0.020),
            (b_rad + 0.010, -0.018),
            (b_rad + 0.011, 0.000),
            (b_rad + 0.010, 0.018),
            (b_rad - 0.005, 0.020),
        ]
        iron.add_lathe(band_prof, u_segs=16, translate=(ax, by, az))
        for r_i in range(6):
            ra = (r_i / 6.0) * math.pi * 2.0
            iron.add_faceted_prism(
                sides=6, r_top=0.008, r_bot=0.008, length=0.010,
                center=(ax + math.cos(ra) * (b_rad + 0.011), by, az + math.sin(ra) * (b_rad + 0.011)),
                rot_euler=(0.0, -ra, math.pi * 0.5),
            )

    # Anvil local frame at top of stump (y_top_stump = 0.742)
    y0 = ay_floor + stump_h + 0.004
    yaw = -0.10
    cy_a, sy_a = math.cos(yaw), math.sin(yaw)

    def ap(lx, ly, lz):
        return (
            ax + lx * cy_a + lz * sy_a,
            y0 + ly,
            az - lx * sy_a + lz * cy_a,
        )

    # 1. Flared anvil base & 4 corner hold-down feet + forged iron hold-down staples
    iron.add_beveled_box(*ap(0.0, 0.028, -0.010), 0.210, 0.056, 0.270, bevel=0.012, rot_euler=(0.0, yaw, 0.0))
    for sx_f in (-0.095, 0.095):
        for sz_f in (-0.125, 0.105):
            iron.add_beveled_box(*ap(sx_f, 0.018, sz_f), 0.058, 0.036, 0.068, bevel=0.008, rot_euler=(0.0, yaw, 0.0))
            iron.add_faceted_prism(sides=6, r_top=0.011, r_bot=0.008, length=0.045, center=ap(sx_f * 1.12, 0.020, sz_f))

    # 2. Concave sculpted waist rising from base (y = 0.050) to upper body underside (y = 0.195)
    waist_spine = [
        (0.0, 0.050, -0.012),
        (0.0, 0.098, -0.012),
        (0.0, 0.148, -0.010),
        (0.0, 0.198, -0.008),
    ]

    def waist_sec(t, theta):
        pinch = math.sin(t * math.pi)
        hw = 0.096 - 0.034 * pinch
        hd = 0.126 - 0.038 * pinch
        ca, sa = math.cos(theta), math.sin(theta)
        rx = math.copysign(abs(ca) ** 0.62, ca) * hw
        rz = math.copysign(abs(sa) ** 0.62, sa) * hd
        return (rx, rz)

    iron.add_loft(waist_spine, waist_sec, u_segs=16, translate=(ax, y0, az), rot_euler=(0.0, yaw, 0.0), up_hint=(0.0, 0.0, 1.0))

    # 3. Main hardened anvil body & flat working face (heel at -Z, cutting step toward +Z)
    # Frame around the square hardy hole at lz = -0.155 so the hardy hole is a true physical 3D recess!
    # Main forward block (lz = -0.125 .. +0.105, width = 0.132, top at ly = 0.290)
    iron.add_beveled_box(*ap(0.0, 0.240, -0.010), 0.134, 0.100, 0.230, bevel=0.008, rot_euler=(0.0, yaw, 0.0))
    # Overhanging heel cheeks flanking hardy hole (lz = -0.235 .. -0.120, hardy hole opening 0.034 x 0.034 at lz = -0.155)
    for sgn_h in (-1, 1):
        iron.add_beveled_box(*ap(sgn_h * 0.044, 0.254, -0.178), 0.046, 0.072, 0.118, bevel=0.006, rot_euler=(0.0, yaw, 0.0))
    # Rear heel bridge behind hardy hole (lz = -0.235 .. -0.174) + front bridge (lz = -0.138 .. -0.118)
    iron.add_beveled_box(*ap(0.0, 0.254, -0.205), 0.134, 0.072, 0.062, bevel=0.006, rot_euler=(0.0, yaw, 0.0))
    iron.add_beveled_box(*ap(0.0, 0.254, -0.128), 0.052, 0.072, 0.022, bevel=0.004, rot_euler=(0.0, yaw, 0.0))
    # Darkened floor inside hardy hole + circular pritchel hole collar
    dark.add_beveled_box(*ap(0.0, 0.228, -0.156), 0.036, 0.018, 0.036, bevel=0.002, rot_euler=(0.0, yaw, 0.0))
    dark.add_faceted_prism(sides=10, r_top=0.009, r_bot=0.009, length=0.010, center=ap(0.026, 0.287, -0.202))

    # Heel underside taper sweep
    iron.add_beveled_box(*ap(0.0, 0.208, -0.145), 0.118, 0.044, 0.155, bevel=0.008, rot_euler=(-0.28, yaw, 0.0))

    # 4. Stepped cutting table (lz = +0.105 .. +0.152, ly_top = 0.268)
    iron.add_beveled_box(*ap(0.0, 0.232, 0.128), 0.124, 0.072, 0.052, bevel=0.006, rot_euler=(0.0, yaw, 0.0))

    # 5. Sculpted conical Blacksmith Horn projecting forward (+Z, lz = +0.142 .. +0.365)
    horn_spine = catmull_rom_chain([
        (0.0, 0.226, 0.138),
        (0.0, 0.236, 0.205),
        (0.0, 0.246, 0.285),
        (0.0, 0.254, 0.362),
    ], samples_per_seg=3)

    def horn_sec(t, theta):
        rx = 0.058 * ((1.0 - t) ** 0.88) + 0.009
        ry = 0.048 * ((1.0 - t) ** 0.84) + 0.008
        # Flattened top tangent near cutting table transitioning to round cone tip
        ca, sa = math.cos(theta), math.sin(theta)
        if sa > 0.2:
            ry *= 1.0 - 0.16 * (1.0 - t) * sa
        return (ca * rx, sa * ry)

    iron.add_loft(horn_spine, horn_sec, u_segs=16, translate=(ax, y0, az), rot_euler=(0.0, yaw, 0.0), up_hint=(0.0, 1.0, 0.0))

    # 6. Resting Blacksmith Cross-Peen Hammer on top of the anvil face (ly = 0.290)
    h_yaw = yaw + 0.62
    chy, shy = math.cos(h_yaw), math.sin(h_yaw)
    hx0, hy0, hz0 = ap(0.010, 0.318, 0.015)
    # Hickory handle angled slightly down onto the anvil face
    handle_pts = [
        (hx0 - chy * 0.045, hy0 + 0.004, hz0 + shy * 0.045),
        (hx0 + chy * 0.105, hy0 - 0.008, hz0 - shy * 0.105),
        (hx0 + chy * 0.245, hy0 - 0.020, hz0 - shy * 0.245),
    ]
    pine.add_tube(handle_pts, 0.015, 0.018, u_segs=10, samples_per_seg=3, scale_xy=(0.82, 1.15))
    # Forged iron hammer head (square face + cross-peen wedge) + brass wedge pin
    iron.add_beveled_box(hx0, hy0 + 0.004, hz0, 0.044, 0.046, 0.118, bevel=0.007, rot_euler=(0.0, h_yaw, 0.0))
    iron.add_beveled_box(
        hx0 - shy * 0.068, hy0 + 0.004, hz0 - chy * 0.068,
        0.042, 0.024, 0.036, bevel=0.005, rot_euler=(0.25, h_yaw, 0.0),
    )
    brass.add_beveled_box(hx0, hy0 + 0.028, hz0, 0.014, 0.006, 0.024, bevel=0.002, rot_euler=(0.0, h_yaw, 0.0))

    # Forged horseshoe resting against the stump base
    hs_pts = [
        (ax - 0.052, ay_floor + 0.016, az + 0.235),
        (ax - 0.068, ay_floor + 0.016, az + 0.185),
        (ax - 0.042, ay_floor + 0.016, az + 0.140),
        (ax + 0.042, ay_floor + 0.016, az + 0.140),
        (ax + 0.068, ay_floor + 0.016, az + 0.185),
        (ax + 0.052, ay_floor + 0.016, az + 0.235),
    ]
    iron.add_tube(hs_pts, 0.011, 0.011, u_segs=8, samples_per_seg=3, scale_xy=(1.35, 0.55), translate=(0.0, 0.0, 0.08))


def add_sculpted_long_gun(dark, pine, iron, brass, gx, gy_butt, gz, lean_x=0.13, variant=0):
    """
    Sculpts an authentic Western long-gun standing upright in the rifle rack (facing +X into room):
      variant 0: Winchester Model 1873 / Henry 'Yellow Boy' Lever-Action Repeating Rifle (brass receiver)
      variant 1: Sharps .45-110 Frontier Creedmoor Heavy Octagonal-Barrel Rifle
      variant 2: Frontier Coach Double-Barrel Side-by-Side Shotgun
    """
    cg, sg = math.cos(lean_x), math.sin(lean_x)

    def gp_pt(lx, ly, lz):
        # Lean upper barrel slightly toward -X (against rack upper bar) while trigger/lever face +X
        wx = gx + lx * cg - ly * sg
        wy = gy_butt + lx * sg + ly * cg
        return (wx, wy, gz + lz)

    rot_gun = (0.0, 0.0, lean_x)

    # 1. Curved Brass / Iron Crescent Buttplate at y = 0
    butt_mat = brass if variant != 2 else iron
    butt_mat.add_beveled_box(*gp_pt(0.0, 0.012, 0.0), 0.122, 0.022, 0.040, bevel=0.005, rot_euler=rot_gun)

    # 2. Ergonomic Sculpted Walnut Buttstock & Wrist (ly = 0.018 .. 0.340)
    stock_spine = catmull_rom_chain([
        gp_pt(0.000, 0.020, 0.0),
        gp_pt(0.006, 0.125, 0.0),
        gp_pt(0.014, 0.235, 0.0),
        gp_pt(0.020, 0.335, 0.0),
    ], samples_per_seg=3)

    def stock_sec(t, theta):
        # Wide tall butt tapering into narrow ergonomic wrist
        hd = 0.060 * (1.0 - 0.62 * (t ** 1.15)) + 0.004
        hw = 0.021 * (1.0 - 0.25 * t)
        ca, sa = math.cos(theta), math.sin(theta)
        return (ca * hw, sa * hd)

    dark.add_loft(stock_spine, stock_sec, u_segs=12, up_hint=(1.0, 0.0, 0.0))

    # 3. Receiver / Breech Block (ly = 0.335 .. 0.495)
    rec_part = brass if variant == 0 else iron
    rec_part.add_beveled_box(*gp_pt(0.016, 0.415, 0.0), 0.064, 0.165, 0.038, bevel=0.006, rot_euler=rot_gun)
    # Side loading gate / lockplate detail
    (iron if variant == 0 else brass).add_beveled_box(*gp_pt(0.016, 0.410, 0.020), 0.028, 0.068, 0.006, bevel=0.002, rot_euler=rot_gun)

    # Lever loop or trigger guard on +X belly side + external hammer on -X comb side
    if variant in (0, 1):
        lever_pts = [
            gp_pt(0.044, 0.405, 0.0),
            gp_pt(0.082, 0.375, 0.0),
            gp_pt(0.080, 0.305, 0.0),
            gp_pt(0.038, 0.285, 0.0),
            gp_pt(0.034, 0.355, 0.0),
        ]
        iron.add_tube(lever_pts, 0.0055, 0.0050, u_segs=8, samples_per_seg=2, scale_xy=(0.75, 1.25))
    else:
        guard_pts = [
            gp_pt(0.036, 0.395, 0.0),
            gp_pt(0.066, 0.355, 0.0),
            gp_pt(0.036, 0.315, 0.0),
        ]
        brass.add_tube(guard_pts, 0.0050, 0.0050, u_segs=8, samples_per_seg=2)

    # Spurred hammer(s)
    h_offsets = (-0.011, 0.011) if variant == 2 else (0.0,)
    for hz_off in h_offsets:
        iron.add_tube(
            [gp_pt(-0.012, 0.382, hz_off), gp_pt(-0.034, 0.398, hz_off), gp_pt(-0.042, 0.376, hz_off)],
            0.0048, 0.0036, u_segs=6, samples_per_seg=2,
        )

    # 4. Walnut Fore-End Stock + Brass/Iron Barrel Bands (ly = 0.495 .. 0.775)
    fore_part = pine if variant == 1 else dark
    fore_part.add_beveled_box(*gp_pt(0.022, 0.630, 0.0), 0.038, 0.270, 0.034, bevel=0.007, rot_euler=rot_gun)
    for b_ly in (0.555, 0.735):
        brass.add_beveled_box(*gp_pt(0.014, b_ly, 0.0), 0.056, 0.018, 0.040, bevel=0.004, rot_euler=rot_gun)

    # 5. Barrel(s), Magazine Tube & Sights
    if variant == 0:
        # Winchester octagonal barrel + full-length under-barrel tubular magazine
        iron.add_faceted_prism(sides=8, r_top=0.0135, r_bot=0.0150, length=0.68, center=gp_pt(0.002, 0.835, 0.0), rot_euler=rot_gun)
        iron.add_faceted_prism(sides=12, r_top=0.0105, r_bot=0.0105, length=0.65, center=gp_pt(0.025, 0.820, 0.0), rot_euler=rot_gun)
        brass.add_beveled_box(*gp_pt(0.014, 1.145, 0.0), 0.044, 0.016, 0.026, bevel=0.003, rot_euler=rot_gun)
        brass.add_beveled_box(*gp_pt(-0.014, 1.158, 0.0), 0.014, 0.018, 0.005, bevel=0.001, rot_euler=rot_gun)
    elif variant == 1:
        # Heavy longer Sharps octagonal buffalo barrel + vernier tang sight + globe front sight
        iron.add_faceted_prism(sides=8, r_top=0.0150, r_bot=0.0175, length=0.76, center=gp_pt(0.002, 0.875, 0.0), rot_euler=rot_gun)
        brass.add_beveled_box(*gp_pt(-0.022, 0.345, 0.0), 0.012, 0.058, 0.010, bevel=0.002, rot_euler=rot_gun)
        iron.add_faceted_prism(sides=10, r_top=0.012, r_bot=0.012, length=0.026, center=gp_pt(-0.016, 1.235, 0.0), rot_euler=(math.pi * 0.5, 0.0, lean_x))
    else:
        # Side-by-side twin coach gun barrels + brass bead sight
        for sz_b in (-0.0125, 0.0125):
            iron.add_faceted_prism(sides=12, r_top=0.0128, r_bot=0.0142, length=0.58, center=gp_pt(0.005, 0.785, sz_b), rot_euler=rot_gun)
        iron.add_beveled_box(*gp_pt(0.002, 0.785, 0.0), 0.012, 0.57, 0.012, bevel=0.002, rot_euler=rot_gun)
        brass.add_ellipsoid(center=gp_pt(-0.010, 1.062, 0.0), radii=(0.005, 0.005, 0.005), u_segs=6, v_segs=4)


def add_wooden_rifle_rack(dark, pine, iron, brass, rx=-2.26, ry_floor=0.22, rz=-0.35):
    """
    Standing Wooden Rifle Rack along the left interior wall (x = -2.26, z = -0.35)
    holding 3 sculpted Western long-guns cleanly facing into the room (+X).
    """
    rack_len = 1.18
    half_z = rack_len * 0.5

    # Heavy beveled base runners & angled A-frame side uprights
    for sz_s in (-half_z, half_z):
        dark.add_beveled_box(rx + 0.02, ry_floor + 0.032, rz + sz_s, 0.42, 0.064, 0.075, bevel=0.010)
        # Rear upright & angled front brace
        dark.add_beveled_box(rx - 0.13, ry_floor + 0.56, rz + sz_s, 0.068, 1.08, 0.068, bevel=0.009)
        pine.add_beveled_box(rx + 0.02, ry_floor + 0.54, rz + sz_s, 0.056, 1.06, 0.058, bevel=0.008, rot_euler=(0.0, 0.0, 0.26))
        # Wrought-iron gusset plate at top joint
        iron.add_beveled_box(rx - 0.09, ry_floor + 1.02, rz + sz_s, 0.14, 0.09, 0.076, bevel=0.005)

    # Bottom grooved buttstock trough (slats + front lip + rear rail)
    pine.add_beveled_box(rx + 0.03, ry_floor + 0.078, rz, 0.30, 0.034, rack_len + 0.06, bevel=0.006)
    dark.add_beveled_box(rx + 0.165, ry_floor + 0.112, rz, 0.036, 0.068, rack_len + 0.06, bevel=0.006)
    dark.add_beveled_box(rx - 0.105, ry_floor + 0.112, rz, 0.036, 0.068, rack_len + 0.06, bevel=0.006)

    # Upper notched barrel rest rail + lower cross-tie + brass locking bar
    dark.add_beveled_box(rx - 0.115, ry_floor + 0.92, rz, 0.075, 0.072, rack_len + 0.08, bevel=0.008)
    pine.add_beveled_box(rx - 0.130, ry_floor + 0.46, rz, 0.042, 0.095, rack_len + 0.02, bevel=0.006)

    # Notch dividers & brass chain/retainer bar across the 3 rifle slots
    for div_z in (-0.52, -0.18, 0.18, 0.52):
        dark.add_beveled_box(rx - 0.065, ry_floor + 0.95, rz + div_z, 0.085, 0.055, 0.042, bevel=0.005)
    brass.add_tube(
        [(rx - 0.025, ry_floor + 0.945, rz - half_z), (rx - 0.025, ry_floor + 0.945, rz + half_z)],
        0.009, 0.009, u_segs=8, samples_per_seg=2,
    )
    # Brass padlock on right end of locking bar
    brass.add_beveled_box(rx - 0.020, ry_floor + 0.915, rz + half_z + 0.02, 0.018, 0.038, 0.032, bevel=0.004)

    # 3 Sculpted Frontier Long-Guns standing in the rack slots
    gun_slots = ((-0.35, 0), (0.00, 1), (0.35, 2))
    for gz_off, var_id in gun_slots:
        add_sculpted_long_gun(
            dark, pine, iron, brass,
            gx=rx + 0.045,
            gy_butt=ry_floor + 0.098,
            gz=rz + gz_off,
            lean_x=0.135,
            variant=var_id,
        )


def add_ammo_crate_single(pine, siding, dark, iron, brass, cx, cy_bot, cz, sx, sy, sz, yaw=0.0):
    """Single planked wooden munitions crate with wrought-iron corner straps, rope/iron handles & brass latch."""
    cy_m = cy_bot + sy * 0.5
    cos_y, sin_y = math.cos(yaw), math.sin(yaw)

    def cp(lx, ly, lz):
        return (
            cx + lx * cos_y + lz * sin_y,
            cy_m + ly,
            cz - lx * sin_y + lz * cos_y,
        )

    rot_c = (0.0, yaw, 0.0)
    pine.add_beveled_box(cx, cy_m, cz, sx, sy, sz, bevel=0.010, rot_euler=rot_c, uv_scale=0.8)

    # Horizontal slat battens & end-frame cleats
    for sz_s in (-1, 1):
        for b_y in (-sy * 0.32, 0.0, sy * 0.32):
            siding.add_beveled_box(*cp(0.0, b_y, sz_s * (sz * 0.5 + 0.008)), sx - 0.04, sy * 0.22, 0.018, bevel=0.0, rot_euler=rot_c)
        for c_x in (-sx * 0.42, sx * 0.42):
            dark.add_beveled_box(*cp(c_x, 0.0, sz_s * (sz * 0.5 + 0.012)), 0.048, sy + 0.008, 0.024, bevel=0.0, rot_euler=rot_c)

    # Lid planks on top
    for lid_z in (-sz * 0.26, sz * 0.26):
        siding.add_beveled_box(*cp(0.0, sy * 0.5 + 0.012, lid_z), sx + 0.016, 0.024, sz * 0.46, bevel=0.004, rot_euler=rot_c)

    # Wrought-iron corner reinforcement brackets (top & bottom) + side carry handles
    for sx_s in (-1, 1):
        for sz_s in (-1, 1):
            for sy_s in (-1, 1):
                iron.add_beveled_box(
                    *cp(sx_s * (sx * 0.5 - 0.022), sy_s * (sy * 0.5 - 0.016), sz_s * (sz * 0.5 - 0.022)),
                    0.062, 0.048, 0.062, bevel=0.0, rot_euler=rot_c,
                )
        # Iron drop-bail carry handle on each X end
        hx_end = sx_s * (sx * 0.5 + 0.014)
        iron.add_beveled_box(*cp(hx_end, 0.02, 0.0), 0.018, 0.048, 0.14, bevel=0.0, rot_euler=rot_c)
        bail_pts = [
            cp(hx_end + sx_s * 0.008, 0.018, -0.052),
            cp(hx_end + sx_s * 0.026, -0.028, -0.042),
            cp(hx_end + sx_s * 0.026, -0.028, 0.042),
            cp(hx_end + sx_s * 0.008, 0.018, 0.052),
        ]
        iron.add_tube(bail_pts, 0.0065, 0.0065, u_segs=5, samples_per_seg=1)

    # Brass ordnance claspplate on front (-X facing shop center)
    brass.add_beveled_box(*cp(0.0, sy * 0.34, -sz * 0.5 - 0.014), 0.075, 0.085, 0.012, bevel=0.0, rot_euler=rot_c)


def add_stacked_ammunition_crates(pine, siding, dark, iron, brass, cx=2.04, cy_floor=0.22, cz=0.28):
    """
    Stacked iron-bound Ammunition Crates at (2.04, 0.22, 0.28) with an angled upper crate
    and an open brass-trimmed cartridge caddy displaying .45-70 brass shells.
    """
    # Bottom heavy ordnance crate (y = 0.22 .. 0.68)
    add_ammo_crate_single(
        pine, siding, dark, iron, brass,
        cx=cx, cy_bot=cy_floor, cz=cz,
        sx=0.68, sy=0.44, sz=0.86, yaw=math.pi * 0.5 + 0.06,
    )
    # Second stacked crate rotated slightly at y = 0.684 .. 1.064
    add_ammo_crate_single(
        pine, siding, dark, iron, brass,
        cx=cx + 0.02, cy_bot=cy_floor + 0.464, cz=cz - 0.05,
        sx=0.56, sy=0.36, sz=0.68, yaw=math.pi * 0.5 - 0.16,
    )
    # Companion smaller powder/shot box beside the stack on the floor (z = 0.90)
    add_ammo_crate_single(
        pine, siding, dark, iron, brass,
        cx=cx - 0.06, cy_bot=cy_floor, cz=cz + 0.66,
        sx=0.44, sy=0.30, sz=0.46, yaw=0.24,
    )
    # Brass artillery/rifle shells standing atop the lower companion box
    for sh_i, (ox, oz) in enumerate(((-0.08, 0.62), (-0.03, 0.65), (0.02, 0.61), (-0.06, 0.70))):
        sx_s = cx + ox
        sz_s = cz + oz
        sy_b = cy_floor + 0.324
        brass.add_faceted_prism(sides=10, r_top=0.011, r_bot=0.012, length=0.058, center=(sx_s, sy_b + 0.029, sz_s))
        iron.add_ellipsoid(center=(sx_s, sy_b + 0.064, sz_s), radii=(0.0095, 0.018, 0.0095), u_segs=8, v_segs=5)


def add_counter_cartridge_boxes_and_oil_tin(pine, dark, shutter_tin, iron, brass, y_counter_top=1.26, z_counter=1.25):
    """
    Places detailed brass cartridge boxes, loose brass rounds, and a vintage Gun-Oil Tin
    with long angled brass oiler spout strictly on the RIGHT side of the counter (x = +0.20..+1.52),
    leaving x = -1.72..+0.08 completely unobstructed in front of the Gunsmith NPC at x = -1.12!
    """
    # 1. Two stacked/angled brass-trimmed ammunition boxes (x = 0.34 .. 0.78)
    dark.add_beveled_box(0.42, y_counter_top + 0.042, z_counter + 0.04, 0.24, 0.084, 0.15, bevel=0.006, rot_euler=(0.0, 0.14, 0.0))
    brass.add_beveled_box(0.42, y_counter_top + 0.086, z_counter + 0.04, 0.248, 0.014, 0.156, bevel=0.003, rot_euler=(0.0, 0.14, 0.0))
    brass.add_beveled_box(0.42, y_counter_top + 0.044, z_counter + 0.118, 0.046, 0.036, 0.010, bevel=0.002, rot_euler=(0.0, 0.14, 0.0))

    # Second brass cartridge box resting beside/slightly angled + open tray of 8 gleaming brass cartridges
    brass.add_beveled_box(0.74, y_counter_top + 0.034, z_counter - 0.04, 0.20, 0.068, 0.13, bevel=0.006, rot_euler=(0.0, -0.20, 0.0))
    pine.add_beveled_box(0.74, y_counter_top + 0.058, z_counter - 0.04, 0.176, 0.026, 0.108, bevel=0.003, rot_euler=(0.0, -0.20, 0.0))
    for r_row in (-0.028, 0.022):
        for r_col in (-0.056, -0.019, 0.019, 0.056):
            rx_c = 0.74 + r_col * math.cos(-0.20) + r_row * math.sin(-0.20)
            rz_c = (z_counter - 0.04) - r_col * math.sin(-0.20) + r_row * math.cos(-0.20)
            brass.add_faceted_prism(sides=8, r_top=0.0085, r_bot=0.0092, length=0.042, center=(rx_c, y_counter_top + 0.084, rz_c))
            iron.add_ellipsoid(center=(rx_c, y_counter_top + 0.108, rz_c), radii=(0.0075, 0.012, 0.0075), u_segs=6, v_segs=4)

    # Stacked smaller brass percussion-cap tin at x = 0.56
    brass.add_lathe(
        [(0.004, 0.0), (0.044, 0.0), (0.046, 0.032), (0.048, 0.036), (0.046, 0.044), (0.004, 0.045)],
        u_segs=14, translate=(0.56, y_counter_top + 0.086, z_counter + 0.03),
    )

    # 2. Classic Frontier Gun-Oil Tin & Precision Oiler Can on right of counter (x = 1.12 .. 1.38)
    # Rectangular painted metal oil tin (PaintedShutters enamel + PolishedBrass shoulder, screw cap & spout)
    ox, oz = 1.18, z_counter + 0.02
    shutter_tin.add_beveled_box(ox, y_counter_top + 0.085, oz, 0.115, 0.170, 0.078, bevel=0.010, rot_euler=(0.0, -0.28, 0.0))
    brass.add_beveled_box(ox, y_counter_top + 0.174, oz, 0.119, 0.016, 0.082, bevel=0.004, rot_euler=(0.0, -0.28, 0.0))
    # Brass threaded filler neck + knurled cap + curved wire handle + precision angled oiler spout
    brass.add_faceted_prism(sides=10, r_top=0.016, r_bot=0.018, length=0.026, center=(ox - 0.020, y_counter_top + 0.192, oz + 0.006))
    brass.add_tube(
        [
            (ox + 0.018, y_counter_top + 0.180, oz - 0.005),
            (ox + 0.048, y_counter_top + 0.235, oz + 0.012),
            (ox + 0.085, y_counter_top + 0.278, oz + 0.030),
        ],
        0.0075, 0.0028, u_segs=8, samples_per_seg=3,
    )
    # Thumb-pump brass oiler can beside the rectangular tin (x = 1.38)
    brass.add_lathe(
        [(0.004, 0.0), (0.046, 0.002), (0.046, 0.038), (0.034, 0.058), (0.012, 0.072), (0.004, 0.155)],
        u_segs=14, translate=(1.38, y_counter_top, z_counter - 0.05),
    )
    brass.add_tube(
        [(1.418, y_counter_top + 0.015, z_counter - 0.05), (1.445, y_counter_top + 0.030, z_counter - 0.05), (1.415, y_counter_top + 0.048, z_counter - 0.05)],
        0.0045, 0.0045, u_segs=6, samples_per_seg=2,
    )


# ---------------------------------------------------------------------------
# 1. Public Builder: build_gunsmith_glb(out_path) -> assets/gunsmith.glb
# ---------------------------------------------------------------------------

def build_gunsmith_glb(out_path):
    """
    Builds the Western Gunsmith & Armory (`Våpensmed`) grounded at y = 0.0 with wooden
    plank floor top at y = 0.22, facing +Z, >= 3.84m open storefront, 2-step stairs,
    pitched shingled roof behind z = 2.72, stepped boomtown false-front parapet,
    iron-strapped counter with right-side brass ammo & oil tin, blacksmith anvil on stump,
    standing 3-gun rifle rack, stacked ammo crates, and brick forge chimney.
    """
    b = GLBBuilder()

    # Exact required 11 PBR material names
    mat_siding = b.add_material("WeatheredSiding", (0.70, 0.47, 0.29), metallic=0.02, roughness=0.84)
    mat_pine = b.add_material("WarmPine", (0.83, 0.60, 0.37), metallic=0.03, roughness=0.76)
    mat_dark = b.add_material("DarkTimber", (0.34, 0.20, 0.11), metallic=0.04, roughness=0.80)
    mat_counter = b.add_material("PolishedCounterWood", (0.38, 0.20, 0.09), metallic=0.06, roughness=0.30)
    mat_roof = b.add_material("CedarShingles", (0.39, 0.23, 0.13), metallic=0.03, roughness=0.87)
    mat_shutter = b.add_material("PaintedShutters", (0.22, 0.34, 0.31), metallic=0.05, roughness=0.72)
    mat_stone = b.add_material("StoneFoundation", (0.56, 0.49, 0.42), metallic=0.02, roughness=0.92)
    mat_brick = b.add_material("ChimneyBrick", (0.58, 0.25, 0.17), metallic=0.02, roughness=0.89)
    mat_iron = b.add_material("WroughtIron", (0.19, 0.21, 0.24), metallic=0.88, roughness=0.33)
    mat_brass = b.add_material("PolishedBrass", (0.90, 0.72, 0.35), metallic=0.91, roughness=0.20)
    mat_glass = b.add_material("WindowGlass", (0.34, 0.42, 0.48), metallic=0.24, roughness=0.10, emissive=(0.20, 0.12, 0.04))

    root = b.add_node("GunsmithShopRoot")
    parts, gp = b.create_parts_dict()

    siding = gp(mat_siding)
    pine = gp(mat_pine)
    dark = gp(mat_dark)
    counter_wood = gp(mat_counter)
    roof = gp(mat_roof)
    shutter = gp(mat_shutter)
    stone = gp(mat_stone)
    brick = gp(mat_brick)
    iron = gp(mat_iron)
    brass = gp(mat_brass)

    # 1a. Grounded Stone Foundation Piers (y = 0.00..0.18), Skirt & Planked Floor (top at y = 0.220!)
    for sx in (-2.75, -1.35, 0.0, 1.35, 2.75):
        for sz in (-1.95, 0.50, 2.90):
            stone.add_beveled_box(sx, 0.090, sz, 0.42, 0.180, 0.42, bevel=0.022)
    stone.add_beveled_box(0.0, 0.080, 0.42, 5.44, 0.160, 4.88, bevel=0.020)

    # Heavy timber sill & subfloor (y = 0.020..0.204)
    dark.add_beveled_box(0.0, 0.112, 0.44, 5.84, 0.184, 5.36, bevel=0.018, uv_scale=0.65)
    # Alternating beveled wooden floorboards with top surface strictly at y = 0.207 + 0.013 = 0.220
    pz = -1.80
    idx_p = 0
    while pz <= 3.00:
        (pine if idx_p % 2 == 0 else siding).add_beveled_box(
            0.0, 0.207, pz, 5.76, 0.026, 0.262, bevel=0.005, uv_scale=0.65,
        )
        pz += 0.28
        idx_p += 1

    # Wide 2-step wooden front stairs (z = 3.12..3.68, grounded cleanly at y = 0.000!)
    # Upper step: z = 3.12..3.42, top y = 0.190
    pine.add_beveled_box(0.0, 0.145, 3.27, 3.86, 0.090, 0.30, bevel=0.012)
    dark.add_beveled_box(0.0, 0.065, 3.24, 3.78, 0.110, 0.22, bevel=0.008)
    # Lower step: z = 3.38..3.68, bottom y = 0.000, top y = 0.100
    siding.add_beveled_box(0.0, 0.050, 3.53, 3.96, 0.100, 0.30, bevel=0.012)
    # Side stringers & stone pads outside the 3.84m clear opening (|x| >= 1.94)
    for stx in (-1.99, 1.99):
        dark.add_beveled_box(stx, 0.125, 3.35, 0.092, 0.100, 0.44, bevel=0.010, rot_euler=(0.20, 0.0, 0.0))
        stone.add_beveled_box(stx, 0.040, 3.59, 0.18, 0.080, 0.18, bevel=0.012)
        iron.add_beveled_box(stx, 0.105, 3.66, 0.098, 0.042, 0.032, bevel=0.004)

    # 1b. Clapboard Back Wall (z = -1.92) & Side Walls (x = +-2.58) + Shuttered Windows
    # Open storefront entrance spans x = -2.44..+2.44 (> 3.84m clear!)
    pine.add_beveled_box(0.0, 2.04, -1.92, 5.48, 3.68, 0.24, bevel=0.016, uv_scale=0.60)
    add_clapboard_wall_x(siding, 0.0, 0.28, 3.76, -2.04, 5.38, normal_sign_z=-1.0, plank_h=0.23)
    # Interior wainscot dado rail & vertical wall studs (kept flush at z = -1.78 so z = -0.55 Armory Board is 100% clear)
    dark.add_beveled_box(0.0, 1.08, -1.78, 5.10, 0.08, 0.05, bevel=0.008)

    for side in (-1, 1):
        wx = side * 2.58
        siding.add_beveled_box(wx, 2.04, 0.05, 0.24, 3.68, 4.14, bevel=0.016, uv_scale=0.60)
        add_clapboard_wall_z(pine, wx + side * 0.12, 0.28, 3.76, 0.05, 3.92, normal_sign_x=side, plank_h=0.23)
        dark.add_beveled_box(wx, 2.05, -1.96, 0.26, 3.74, 0.26, bevel=0.018)
        dark.add_beveled_box(wx, 2.05, 2.08, 0.26, 3.74, 0.26, bevel=0.018)
        dark.add_beveled_box(wx - side * 0.13, 1.08, 0.05, 0.05, 0.08, 3.88, bevel=0.008)

        # 2 Shuttered WindowGlass windows per side wall (4 total)
        for wz_w in (-0.86, 0.96):
            add_shuttered_window(
                gp, mat_dark, mat_shutter, mat_glass, mat_iron,
                wx + side * 0.13, 2.08, wz_w, 0.86, 1.08, rot_y=side * math.pi * 0.5,
            )

    # 1c. Exposed Ceiling Beams + Pitched CedarShingles Gable Roof (strictly behind z = 2.72!)
    # Ceiling deck spans z = -2.22..+2.70 (<= 2.72)
    roof.add_beveled_box(0.0, 3.92, 0.24, 5.96, 0.18, 4.92, bevel=0.016, uv_scale=0.65)
    bx = -2.20
    while bx <= 2.21:
        dark.add_beveled_box(bx, 3.76, 0.24, 0.12, 0.14, 4.82, bevel=0.010)
        # Wrought-iron beam tie straps
        iron.add_beveled_box(bx, 3.75, 1.25, 0.135, 0.15, 0.045, bevel=0.004)
        bx += 1.10

    slope_ang = 0.35
    # Roof slopes centered at cz = 0.20, sz = 4.92 -> z_max = 2.66 <= 2.72!
    for side in (-1, 1):
        roof.add_beveled_box(
            side * 1.49, 4.42, 0.20,
            3.26, 0.17, 4.92, bevel=0.016, rot_euler=(0.0, 0.0, -side * slope_ang), uv_scale=0.65,
        )
        for r_step in range(5):
            frac = (r_step + 0.5) / 5.0
            dark.add_beveled_box(
                side * (0.30 + frac * 2.34), 4.94 - frac * 0.88, 0.20,
                0.082, 0.040, 4.94, bevel=0.0, rot_euler=(0.0, 0.0, -side * slope_ang),
            )
        rz_t = -1.92
        while rz_t <= 2.52:
            dark.add_beveled_box(
                side * 2.98, 3.86, rz_t, 0.28, 0.075, 0.075, bevel=0.0, rot_euler=(0.0, 0.0, -side * slope_ang),
            )
            rz_t += 0.62

    # Watertight 3D gable pediment walls at rear (-Z) and front (cz = 2.60, z_max = 2.68 <= 2.72!)
    add_gable_pediment_wall(siding, 0.0, 3.96, 5.04, -1.96, 5.68, 0.20)
    add_gable_clapboards(pine, 0.0, 4.00, 4.96, -2.06, 5.56, normal_sign_z=-1.0, plank_h=0.19)
    add_gable_pediment_wall(siding, 0.0, 3.96, 5.04, 2.60, 5.68, 0.16)
    dark.add_beveled_box(0.0, 5.04, 0.20, 0.20, 0.18, 4.94, bevel=0.016)

    # 1d. Brick Forge Chimney on Right-Rear Roof Slope ("ChimneyBrick" + "StoneFoundation" + "WroughtIron")
    ch_x, ch_z = 1.72, -1.16
    # Lead/iron roof flashing collar around chimney base
    iron.add_beveled_box(ch_x, 4.38, ch_z, 0.72, 0.14, 0.72, bevel=0.010, rot_euler=(0.0, 0.0, -slope_ang))
    # Main brick forge chimney shaft + recessed mortar belt courses + corbeled brick crown
    brick.add_beveled_box(ch_x, 5.12, ch_z, 0.58, 1.56, 0.58, bevel=0.018, uv_scale=0.85)
    for by_belt in (4.82, 5.34, 5.76):
        brick.add_beveled_box(ch_x, by_belt, ch_z, 0.63, 0.075, 0.63, bevel=0.010)
    brick.add_beveled_box(ch_x, 5.92, ch_z, 0.68, 0.11, 0.68, bevel=0.014)
    stone.add_beveled_box(ch_x, 6.03, ch_z, 0.74, 0.10, 0.74, bevel=0.016)
    # Wrought-iron forge flue pipe, struts & conical spark-arrestor hood
    iron.add_faceted_prism(sides=12, r_top=0.135, r_bot=0.145, length=0.34, center=(ch_x, 6.24, ch_z))
    for st_a in (0.0, math.pi * 0.5, math.pi, math.pi * 1.5):
        iron.add_beveled_box(
            ch_x + math.cos(st_a) * 0.115, 6.46, ch_z + math.sin(st_a) * 0.115,
            0.020, 0.12, 0.020, bevel=0.003,
        )
    iron.add_lathe(
        [(0.23, 0.0), (0.24, 0.018), (0.09, 0.095), (0.008, 0.115)],
        u_segs=14, translate=(ch_x, 6.50, ch_z),
    )

    # 1e. Storefront Turned/Banded Columns & Stepped Boomtown False-Front Parapet
    # Columns at x = +-2.58, z = 2.88 -> inner clear span x = -2.44..+2.44 (>= 3.84m!)
    for side in (-1, 1):
        px = side * 2.58
        add_turned_western_column(gp, mat_dark, mat_pine, mat_iron, px, 0.22, 3.82, 2.88, radius=0.112)
        add_iron_scroll_bracket(gp, mat_pine, mat_iron, px, 3.78, 2.88, dir_x=-side, span=0.52)

    # Storefront main lintel beam (y = 3.82, z = 2.78..3.00)
    dark.add_beveled_box(0.0, 3.82, 2.89, 5.92, 0.18, 0.22, bevel=0.014)
    iron.add_beveled_box(0.0, 3.82, 2.995, 5.80, 0.055, 0.024, bevel=0.004)

    # Stepped Boomtown False-Front Parapet (z = 2.84..2.98, leaving flat sign zone at y = 4.74, z = 3.04!)
    siding.add_beveled_box(0.0, 4.74, 2.91, 5.90, 1.64, 0.14, bevel=0.014, uv_scale=0.65)
    # Flanking side pilasters outside x = +-2.68 so the entire central sign zone (y = 3.96..5.35) is flat at z <= 2.98!
    for sx_f in (-2.82, 2.82):
        dark.add_beveled_box(sx_f, 4.74, 2.92, 0.22, 1.62, 0.12, bevel=0.012)
        iron.add_beveled_box(sx_f, 4.74, 2.975, 0.06, 1.50, 0.02, bevel=0.003)

    # Stepped upper crown pediment & side scroll wings (strictly above y = 5.42!)
    for side in (-1, 1):
        dark.add_tube(
            [
                (side * 2.80, 5.62, 2.91),
                (side * 2.28, 5.70, 2.91),
                (side * 1.82, 5.84, 2.91),
                (side * 1.54, 5.92, 2.91),
            ],
            0.048, 0.040, u_segs=10, samples_per_seg=4, scale_xy=(0.9, 1.2),
        )

    pine.add_beveled_box(0.0, 5.72, 2.91, 3.16, 0.44, 0.14, bevel=0.014)
    dark.add_beveled_box(0.0, 5.56, 2.91, 6.22, 0.16, 0.16, bevel=0.014)
    dark.add_beveled_box(0.0, 5.96, 2.91, 3.46, 0.16, 0.16, bevel=0.014)

    # Dentil corbels & iron sign-hanger straps strictly at y = 5.42..5.46 (clean above GUNSMITH sign!)
    cx_t = -2.60
    while cx_t <= 2.61:
        dark.add_beveled_box(cx_t, 5.43, 2.94, 0.10, 0.13, 0.08, bevel=0.008)
        cx_t += 0.52
    for sx_s in (-1.78, 1.78):
        iron.add_beveled_box(sx_s, 5.44, 2.96, 0.044, 0.20, 0.036, bevel=0.005)

    # Forged brass/iron anvil medallion high in the upper crown pediment (y = 5.75, z = 2.97)
    iron.add_beveled_box(0.0, 5.74, 2.97, 0.24, 0.11, 0.025, bevel=0.004)
    brass.add_faceted_prism(sides=12, r_top=0.065, r_bot=0.065, length=0.022, center=(0.0, 5.74, 2.98), rot_euler=(math.pi * 0.5, 0.0, 0.0))

    # 5 Turned Western finials crowning the stepped parapet
    for fx, fy in ((-2.94, 5.64), (2.94, 5.64), (-1.58, 6.04), (1.58, 6.04), (0.0, 6.04)):
        dark.add_lathe(
            [(0.012, 0.0), (0.078, 0.04), (0.048, 0.12), (0.082, 0.20), (0.030, 0.30), (0.006, 0.38)],
            u_segs=14, translate=(fx, fy, 2.91),
        )

    # 1f. Heavy Iron-Strapped Oak Gunsmith Counter at z = 1.25 (y = 0.22..1.26, width = 3.45!)
    # Base plinth (y = 0.22..0.32) + heavy oak body (y = 0.30..1.16) + PolishedCounterWood slab (y = 1.14..1.26)
    dark.add_beveled_box(0.0, 0.27, 1.25, 3.38, 0.10, 0.84, bevel=0.010)
    siding.add_beveled_box(0.0, 0.73, 1.25, 3.28, 0.86, 0.78, bevel=0.016, uv_scale=0.65)
    for px in (-1.06, 0.0, 1.06):
        dark.add_beveled_box(px, 0.73, 1.645, 0.86, 0.64, 0.042, bevel=0.008)
        pine.add_beveled_box(px, 0.73, 1.668, 0.68, 0.46, 0.024, bevel=0.005)
    for bx_c in (-1.58, -0.53, 0.53, 1.58):
        dark.add_beveled_box(bx_c, 0.73, 1.645, 0.095, 0.84, 0.056, bevel=0.008)
        # Heavy wrought-iron vertical straps + forged hex rivets on counter front
        iron.add_beveled_box(bx_c, 0.73, 1.680, 0.052, 0.84, 0.020, bevel=0.0)
        for ry_r in (0.40, 0.62, 0.84, 1.06):
            iron.add_faceted_prism(
                sides=6, r_top=0.009, r_bot=0.009, length=0.010,
                center=(bx_c, ry_r, 1.692), rot_euler=(math.pi * 0.5, 0.0, 0.0),
            )

    # Polished oak counter top: exact width = 3.45, exact top y = 1.20 + 0.06 = 1.26!
    counter_wood.add_beveled_box(0.0, 1.20, 1.25, 3.45, 0.12, 0.92, bevel=0.016, uv_scale=0.70)
    # Heavy wrought-iron corner armor brackets & brass corner studs flush with counter top (y <= 1.260)
    for sx_b in (-1.685, 1.685):
        for sz_b in (0.83, 1.67):
            iron.add_beveled_box(sx_b, 1.196, sz_b, 0.098, 0.124, 0.098, bevel=0.008)
            brass.add_ellipsoid(center=(sx_b + math.copysign(0.051, sx_b), 1.196, sz_b), radii=(0.006, 0.011, 0.011), u_segs=6, v_segs=3)

    # Right-side Brass Cartridge Boxes & Gun-Oil Tin (x = -1.12 left counter completely clear for NPC!)
    add_counter_cartridge_boxes_and_oil_tin(pine, dark, shutter, iron, brass, y_counter_top=1.26, z_counter=1.25)

    # 1g. Low Rear Gunsmith Tool & Stock-Blank Bench (strictly y <= 1.72 at z = -1.64,
    # keeping back wall y = 1.85..3.70 and z = -0.55 100% clear for the 3D Armory Board!)
    for sy_sh in (0.72, 1.24):
        dark.add_beveled_box(0.0, sy_sh, -1.64, 3.56, 0.06, 0.36, bevel=0.008)
    for sx_post in (-1.72, -0.58, 0.58, 1.72):
        dark.add_beveled_box(sx_post, 0.74, -1.64, 0.075, 1.04, 0.36, bevel=0.008)

    # Benchtop gunsmith vise on right end of low rear bench (x = 1.38, y = 1.27..1.52, z = -1.52)
    iron.add_beveled_box(1.38, 1.35, -1.52, 0.14, 0.15, 0.18, bevel=0.008)
    iron.add_beveled_box(1.38, 1.44, -1.44, 0.13, 0.07, 0.06, bevel=0.005)
    brass.add_faceted_prism(sides=8, r_top=0.014, r_bot=0.014, length=0.16, center=(1.38, 1.36, -1.38), rot_euler=(math.pi * 0.5, 0.0, 0.0))
    pine.add_tube([(1.30, 1.36, -1.30), (1.46, 1.36, -1.30)], 0.008, 0.008, u_segs=6, samples_per_seg=2)

    # Brass powder flasks & gunstock blank on low rear shelves (all y < 1.55)
    for fx_p in (-1.18, -0.92):
        brass.add_ellipsoid(center=(fx_p, 1.34, -1.62), radii=(0.048, 0.068, 0.028), u_segs=10, v_segs=6)
        brass.add_faceted_prism(sides=8, r_top=0.009, r_bot=0.013, length=0.038, center=(fx_p, 1.42, -1.62))
    pine.add_beveled_box(0.05, 1.30, -1.62, 0.62, 0.065, 0.11, bevel=0.008, rot_euler=(0.0, 0.08, 0.0))
    for crate_sm_x in (-1.15, 0.0, 1.15):
        siding.add_beveled_box(crate_sm_x, 0.84, -1.62, 0.42, 0.18, 0.26, bevel=0.006)
        iron.add_beveled_box(crate_sm_x, 0.84, -1.49, 0.07, 0.04, 0.015, bevel=0.002)

    # 1h. Iconic Gunsmith Interior/Porch Details
    # Blacksmith Anvil on banded oak stump at (2.18, 0.22, 2.32) with resting hammer
    add_blacksmith_anvil_and_stump(dark, pine, iron, brass, ax=2.18, ay_floor=0.22, az=2.32)

    # Standing Wooden Rifle Rack holding 3 sculpted long-guns at (-2.26, 0.22, -0.35)
    add_wooden_rifle_rack(dark, pine, iron, brass, rx=-2.26, ry_floor=0.22, rz=-0.35)

    # Stacked Iron-Bound Ammunition Crates at (2.04, 0.22, 0.28)
    add_stacked_ammunition_crates(pine, siding, dark, iron, brass, cx=2.04, cy_floor=0.22, cz=0.28)

    mesh_idx = b.add_mesh_from_parts("GunsmithShopMesh", parts.values())
    b.add_node("GunsmithArchitecture", mesh_idx=mesh_idx, parent_idx=root)
    return b.export_glb(out_path)


# ---------------------------------------------------------------------------
# 2. Gunsmith NPC Component Sculptors (CRITICAL: Facing +Z, Grounded y = 0.0)
# ---------------------------------------------------------------------------

def build_gunsmith_boots_and_trousers(boot_part, sole_part, pants_part, belt_part, iron_part, brass_part):
    """
    Heavy frontier leather work boots grounded flat at y = 0.000, rugged charcoal canvas
    trousers, and thick leather belt with forged buckle (+Z).
    """
    for sgn in (-1, 1):
        lx = sgn * 0.126
        splay = sgn * 0.022

        # Heavy stacked work heel (y = 0.000 .. 0.032, z = -0.090 .. -0.018)
        heel_spine = [(lx, 0.000, -0.054), (lx, 0.016, -0.054), (lx, 0.032, -0.052)]

        def heel_sec(t, theta):
            w = 0.048 + 0.003 * t
            d = 0.038 + 0.002 * t
            ct, st = math.cos(theta), math.sin(theta)
            z_off = st * d
            if z_off > 0.026:
                z_off = 0.026 + (z_off - 0.026) * 0.25
            return (ct * w, z_off)

        sole_part.add_loft(
            heel_spine, heel_sec, u_segs=6,
            rot_euler=(0.0, splay, 0.0), up_hint=(0.0, 0.0, 1.0),
        )

        # Thick welted work-boot sole grounded at y = 0.000 under forefoot (+Z)
        sole_spine = [
            (lx - sgn * 0.001, 0.020, -0.018),
            (lx + sgn * 0.003, 0.008, 0.045),
            (lx + sgn * 0.006, 0.008, 0.120),
            (lx + sgn * 0.010, 0.009, 0.186),
        ]

        def sole_sec(t, theta):
            w = 0.046 + 0.015 * math.sin(t * math.pi * 0.80) - 0.022 * (t ** 2.5)
            ct, st = math.cos(theta), math.sin(theta)
            yy = st * 0.0085
            if t >= 0.20 and yy < -0.008:
                yy = -0.008
            return (ct * w, yy)

        sole_part.add_loft(sole_spine, sole_sec, u_segs=6, up_hint=(0.0, 1.0, 0.0))

        # Rugged leather work-boot vamp, reinforced steel/leather toe cap & shaft (y = 0.014 .. 0.265)
        vamp_spine = catmull_rom_chain([
            (lx + sgn * 0.010, 0.025, 0.182),
            (lx + sgn * 0.006, 0.042, 0.118),
            (lx + sgn * 0.003, 0.068, 0.050),
            (lx, 0.105, -0.006),
            (lx, 0.180, -0.012),
            (lx, 0.265, -0.010),
        ], samples_per_seg=1)

        def boot_vamp_sec(t, theta):
            if t < 0.45:
                u_f = t / 0.45
                rx = 0.028 + 0.030 * math.sin(u_f * math.pi * 0.65)
                ry = 0.018 + 0.032 * (u_f ** 0.85)
            else:
                v_f = (t - 0.45) / 0.55
                rx = 0.054 + 0.008 * v_f
                ry = 0.058 + 0.008 * v_f
            ct, st = math.cos(theta), math.sin(theta)
            yy = st * ry
            if t < 0.35 and yy < -0.013:
                yy = -0.013
            return (ct * rx, yy)

        boot_part.add_loft(vamp_spine, boot_vamp_sec, u_segs=7, up_hint=(0.0, 1.0, 0.0))
        boot_part.add_ellipsoid(
            center=(lx, 0.066, -0.040),
            radii=(0.048, 0.045, 0.048),
            u_segs=6, v_segs=4,
        )
        # Reinforced toe cap & brass boot lace hooks
        sole_part.add_ellipsoid(
            center=(lx + sgn * 0.009, 0.028, 0.158),
            radii=(0.038, 0.020, 0.034),
            u_segs=6, v_segs=3,
        )

        # Charcoal canvas trouser leg (y = 0.220 .. 0.840)
        leg_spine = catmull_rom_chain([
            (lx, 0.220, 0.004),
            (lx * 1.02, 0.295, -0.002),
            (lx * 1.03, 0.505, 0.016),
            (lx * 1.00, 0.685, 0.004),
            (lx * 0.88, 0.840, -0.006),
        ], samples_per_seg=2)

        def trouser_sec(t, theta):
            base_r = 0.074 + 0.030 * (t ** 0.85)
            wrinkle = 0.005 * math.sin(t * math.pi * 8.0) * max(0.0, 1.0 - t / 0.32)
            r = base_r + wrinkle
            return (math.cos(theta) * r * 0.96, math.sin(theta) * r * 1.04)

        pants_part.add_loft(leg_spine, trouser_sec, u_segs=8, cap_end=False, up_hint=(0.0, 0.0, 1.0))

        cuff_loop = [
            (lx + math.cos(a) * 0.074, 0.232 + 0.004 * math.sin(a), 0.004 + math.sin(a) * 0.079)
            for a in [k * math.pi * 2.0 / 8 for k in range(8)]
        ]
        add_closed_loop_tube(pants_part, cuff_loop, 0.008, 0.015, u_segs=4)

    # Sturdy frontier pelvis / seat (y = 0.745 .. 0.865)
    pelvis_spine = [(0.0, 0.745, -0.008), (0.0, 0.805, -0.006), (0.0, 0.865, -0.002)]

    def pelvis_sec(t, theta):
        s = math.sin(t * math.pi * 0.82 + 0.18)
        rx = 0.186 + 0.026 * s
        rz = 0.136 + 0.022 * s
        if math.sin(theta) < -0.2:
            rz += 0.009 * abs(math.sin(theta)) * math.sin(t * math.pi)
        return (math.cos(theta) * rx, math.sin(theta) * rz)

    pants_part.add_loft(pelvis_spine, pelvis_sec, u_segs=10, cap_end=False, up_hint=(0.0, 0.0, 1.0))

    # Heavy leather work belt at y = 0.848
    belt_pts = [
        (math.cos(a) * 0.214, 0.848, math.sin(a) * 0.158 - 0.002)
        for a in [k * math.pi * 2.0 / 14 for k in range(14)]
    ]
    add_closed_loop_tube(belt_part, belt_pts, 0.011, 0.023, u_segs=4)
    iron_part.add_beveled_box(0.0, 0.848, -0.162, 0.052, 0.044, 0.014, bevel=0.003)
    brass_part.add_ellipsoid(center=(-0.165, 0.848, -0.105), radii=(0.006, 0.006, 0.006), u_segs=5, v_segs=3)


def build_flannel_shirt_and_blacksmith_apron(
    shirt_part,
    apron_part,
    apron_trim_part,
    strap_part,
    brass_part,
    iron_part,
):
    """
    Broad muscular frontier torso in worn red/rust flannel shirt + thick scorched-brown
    leather blacksmith apron with chest bib, crossed shoulder straps, brass rivets,
    and front leather tool pocket holding wrought-iron blacksmith tongs (+Z).
    """
    # 1. Muscular Red/Rust Flannel Shirt Torso (y = 0.845 .. 1.445)
    shirt_levels = [0.0, 0.16, 0.36, 0.58, 0.78, 0.91, 1.0]
    u_segs_sh = 16
    shirt_rings = []
    for tv in shirt_levels:
        ring = []
        for u in range(u_segs_sh):
            theta = (u / u_segs_sh) * math.pi * 2.0
            ct, st = math.cos(theta), math.sin(theta)
            # Broad barrel chest tapering cleanly at collar
            w = 0.204 + 0.036 * math.sin(tv * math.pi * 0.72) - 0.118 * (tv ** 3.6)
            d = 0.148 + 0.028 * math.sin(tv * math.pi * 0.68) - 0.068 * (tv ** 3.2)
            y_lv = 0.845 + tv * (1.442 - 0.845)
            z_lv = st * d + 0.004 * math.sin(tv * math.pi)
            ring.append((ct * w, y_lv, z_lv))
        shirt_rings.append(ring)

    shirt_part.add_smooth_grid(shirt_rings, closed_u=True, ensure_outward=True)
    shirt_part.add_cap_ring(shirt_rings[-1], (0.0, 1.0, 0.0))

    # Rolled flannel shirt collar & upper throat placket (+Z)
    collar_pts = [
        (math.cos(a) * 0.088, 1.442 - 0.010 * math.sin(a), math.sin(a) * 0.090 + 0.006)
        for a in [k * math.pi * 2.0 / 12 for k in range(12)]
    ]
    add_closed_loop_tube(shirt_part, collar_pts, 0.015, 0.024, u_segs=4)
    for sgn in (-1, 1):
        collar_leaf = [
            (sgn * 0.078, 1.444, 0.052),
            (sgn * 0.062, 1.422, 0.104),
            (sgn * 0.038, 1.396, 0.138),
        ]
        add_oriented_ribbon(
            shirt_part, collar_leaf,
            width=lambda t: 0.032 * (1.0 - 0.35 * t),
            thickness=0.008,
            normal_fn=lambda t, p, s=sgn: (s * 0.45, -0.12, 0.88),
            samples_per_seg=2, u_segs=4,
        )

    # Shirt placket & 2 upper brass/iron buttons peeking above apron bib
    add_oriented_ribbon(
        apron_trim_part,
        [(0.0, 1.345, 0.156), (0.0, 1.408, 0.132)],
        width=0.024, thickness=0.006,
        normal_fn=lambda t, p: (0.0, 0.25, 0.97),
        samples_per_seg=1, u_segs=4,
    )
    brass_part.add_ellipsoid(center=(0.0, 1.372, 0.152), radii=(0.0065, 0.0065, 0.0045), u_segs=5, v_segs=3)

    # 2. Thick Scorched-Brown Leather Blacksmith Apron Skirt (y = 0.435 .. 0.865, wrapping +Z & sides)
    # Parametric open-back wrap shell with solid thickness via add_oriented_ribbon vertical panels / curved shell!
    # Using a closed-thickness curved shell (outer face + inner face -> closed u loop per v ring) guarantees watertight solid leather!
    skirt_v = [0.0, 0.25, 0.55, 0.82, 1.0]
    skirt_arc_steps = 8  # sweeps across front & sides around +Z
    skirt_rings = []
    for tv in skirt_v:
        y_sk = 0.435 + tv * (0.865 - 0.435)
        # Flare slightly wider over knees at bottom so boots/trousers have natural stride room
        rx_sk = 0.228 - 0.010 * tv + 0.008 * math.sin(tv * math.pi)
        rz_sk = 0.172 - 0.008 * tv + 0.010 * (1.0 - tv)
        thick = 0.009
        outer_pts = []
        inner_pts = []
        for k in range(skirt_arc_steps):
            frac_a = k / (skirt_arc_steps - 1)
            # Angle around Y where +Z is pi/2: sweep from pi/2 - 1.92 to pi/2 + 1.92
            ang = (math.pi * 0.5 - 1.92) + frac_a * 3.84
            ca, sa = math.cos(ang), math.sin(ang)
            # Subtle central split notch at very bottom hem (tv < 0.28) like a classic farrier/gunsmith apron
            hem_lift = 0.028 * math.exp(-((frac_a - 0.5) / 0.12) ** 2) * max(0.0, 1.0 - tv / 0.30)
            ox = ca * (rx_sk + thick * 0.5)
            oz = sa * (rz_sk + thick * 0.5) + 0.006
            ix = ca * (rx_sk - thick * 0.5)
            iz = sa * (rz_sk - thick * 0.5) + 0.006
            outer_pts.append((ox, y_sk + hem_lift, oz))
            inner_pts.append((ix, y_sk + hem_lift, iz))
        ring = outer_pts + list(reversed(inner_pts))
        skirt_rings.append(ring)

    apron_part.add_smooth_grid(skirt_rings, closed_u=True, ensure_outward=True)
    apron_part.add_cap_ring(skirt_rings[0], (0.0, -1.0, 0.0))
    apron_part.add_cap_ring(skirt_rings[-1], (0.0, 1.0, 0.0))

    # Scorched dark leather bottom border trim along apron skirt hem
    hem_trim_pts = [
        (
            math.cos((math.pi * 0.5 - 1.88) + (k / 10.0) * 3.76) * 0.233,
            0.444 + 0.026 * math.exp(-(((k / 10.0) - 0.5) / 0.12) ** 2),
            math.sin((math.pi * 0.5 - 1.88) + (k / 10.0) * 3.76) * 0.179 + 0.006,
        )
        for k in range(11)
    ]
    add_oriented_ribbon(
        apron_trim_part, hem_trim_pts,
        width=0.028, thickness=0.011,
        normal_fn=lambda t, p: (p[0], -0.08, p[2]),
        samples_per_seg=1, u_segs=4,
    )

    # 3. Thick Scorched-Leather Apron Chest Bib (+Z, y = 0.855 .. 1.345)
    bib_v = [0.0, 0.25, 0.52, 0.78, 1.0]
    bib_steps = 7
    bib_rings = []
    for tv in bib_v:
        y_b = 0.855 + tv * (1.345 - 0.855)
        half_ang = 0.88 - 0.30 * (tv ** 0.92)  # tapers cleanly from waist width to chest bib top
        rx_b = 0.218 + 0.026 * math.sin(tv * math.pi * 0.70) - 0.052 * (tv ** 2.6)
        rz_b = 0.166 + 0.022 * math.sin(tv * math.pi * 0.65) - 0.032 * (tv ** 2.4)
        thick_b = 0.0095
        o_pts = []
        i_pts = []
        for k in range(bib_steps):
            fa = k / (bib_steps - 1)
            ang = (math.pi * 0.5 - half_ang) + fa * (2.0 * half_ang)
            ca, sa = math.cos(ang), math.sin(ang)
            o_pts.append((ca * (rx_b + thick_b * 0.5), y_b, sa * (rz_b + thick_b * 0.5) + 0.005))
            i_pts.append((ca * (rx_b - thick_b * 0.5), y_b, sa * (rz_b - thick_b * 0.5) + 0.005))
        bib_rings.append(o_pts + list(reversed(i_pts)))

    apron_part.add_smooth_grid(bib_rings, closed_u=True, ensure_outward=True)
    apron_part.add_cap_ring(bib_rings[0], (0.0, -1.0, 0.0))
    apron_part.add_cap_ring(bib_rings[-1], (0.0, 1.0, 0.0))

    # Apron waist tie strap wrapping all the way around to the back (-Z)
    waist_tie_pts = [
        (math.cos(a) * 0.222, 0.862, math.sin(a) * 0.168 + 0.004)
        for a in [k * math.pi * 2.0 / 16 for k in range(16)]
    ]
    add_closed_loop_tube(strap_part, waist_tie_pts, 0.009, 0.018, u_segs=4)

    # 4. Heavy Leather Shoulder Straps (from bib top corners up over shoulders & crossed X-back on -Z)
    for sgn in (-1, 1):
        strap_ctrl = [
            (sgn * 0.098, 1.328, 0.146),
            (sgn * 0.118, 1.412, 0.088),
            (sgn * 0.126, 1.448, -0.005),
            (sgn * 0.092, 1.375, -0.118),
            (0.0, 1.155, -0.166),
            (-sgn * 0.105, 0.872, -0.152),
        ]
        add_oriented_ribbon(
            strap_part, strap_ctrl,
            width=0.032, thickness=0.0085,
            normal_fn=lambda t, p: (p[0] * 0.35, 0.85 if 0.18 < t < 0.45 else 0.12, 0.92 if t < 0.32 else -0.94),
            samples_per_seg=2, u_segs=4,
        )
        # Brass D-ring & heavy brass corner rivets at bib strap mounts (+Z)
        brass_part.add_beveled_box(sgn * 0.098, 1.332, 0.152, 0.036, 0.020, 0.012, bevel=0.003, rot_euler=(0.0, sgn * 0.28, 0.0))
        for ry_r in (1.310, 1.282):
            brass_part.add_ellipsoid(
                center=(sgn * 0.096, ry_r, 0.156),
                radii=(0.0075, 0.0075, 0.0055), u_segs=6, v_segs=3,
            )

    # Row of brass rivets reinforcing waist seam (+Z)
    for rx_ang in (-0.65, -0.32, 0.0, 0.32, 0.65):
        ang = math.pi * 0.5 + rx_ang
        brass_part.add_ellipsoid(
            center=(math.cos(ang) * 0.228, 0.862, math.sin(ang) * 0.174 + 0.004),
            radii=(0.007, 0.007, 0.006), u_segs=5, v_segs=3,
        )

    # 5. Stitched Leather Tool Pocket on Apron Front (+Z) Holding Wrought-Iron Blacksmith Tongs!
    # Pocket spans x = -0.105 .. +0.065, y = 0.665 .. 0.825 on front of apron skirt
    pocket_v = [0.0, 0.5, 1.0]
    pocket_steps = 6
    pocket_rings = []
    for tv in pocket_v:
        yp = 0.665 + tv * (0.825 - 0.665)
        o_p = []
        i_p = []
        for k in range(pocket_steps):
            fa = k / (pocket_steps - 1)
            ang = (math.pi * 0.5 - 0.34) + fa * 0.78  # centered slightly right-of-center (x ≈ -0.02)
            ca, sa = math.cos(ang), math.sin(ang)
            bulge = 0.016 * math.sin(fa * math.pi) * (0.4 + 0.6 * tv)
            o_p.append((ca * 0.232, yp, sa * (0.180 + bulge) + 0.008))
            i_p.append((ca * 0.223, yp, sa * 0.171 + 0.008))
        pocket_rings.append(o_p + list(reversed(i_p)))

    apron_trim_part.add_smooth_grid(pocket_rings, closed_u=True, ensure_outward=True)
    apron_trim_part.add_cap_ring(pocket_rings[0], (0.0, -1.0, 0.0))
    apron_trim_part.add_cap_ring(pocket_rings[-1], (0.0, 1.0, 0.0))

    # 4 Brass pocket corner rivets
    for px_r, py_r, pz_r in (
        (-0.094, 0.816, 0.174), (0.062, 0.816, 0.180),
        (-0.094, 0.676, 0.174), (0.062, 0.676, 0.180),
    ):
        brass_part.add_ellipsoid(center=(px_r, py_r, pz_r), radii=(0.007, 0.007, 0.0055), u_segs=5, v_segs=3)

    # Wrought-Iron Blacksmith Tongs tucked into the leather tool pocket (jaws projecting upward at +Z!)
    # Crossed reins emerging from pocket top (y = 0.76 .. 0.89), boss pivot at y = 0.895, curved jaws to y = 0.985
    tong_x, tong_z = -0.022, 0.188
    for jaw_s in (-1, 1):
        rein_pts = [
            (tong_x - jaw_s * 0.024, 0.755, tong_z - 0.006),
            (tong_x - jaw_s * 0.012, 0.835, tong_z),
            (tong_x, 0.895, tong_z + 0.004),
            (tong_x + jaw_s * 0.022, 0.942, tong_z + 0.006),
            (tong_x + jaw_s * 0.010, 0.988, tong_z + 0.005),
        ]
        iron_part.add_tube(rein_pts, 0.0062, 0.0052, u_segs=6, samples_per_seg=2, scale_xy=(0.85, 1.20))
    # Forged tong pivot boss + brass rivet
    iron_part.add_faceted_prism(
        sides=8, r_top=0.011, r_bot=0.011, length=0.016,
        center=(tong_x, 0.895, tong_z + 0.004), rot_euler=(math.pi * 0.5, 0.0, 0.0),
    )
    brass_part.add_ellipsoid(center=(tong_x, 0.895, tong_z + 0.013), radii=(0.0055, 0.0055, 0.004), u_segs=5, v_segs=3)


def build_gunsmith_arm_mesh(shirt_part, skin_part, sgn):
    """
    Muscular rolled-sleeve upper arm + thick blacksmith forearm around shoulder pivot
    (sgn * 0.220, 1.365, 0.010).
    CRITICAL: Elbow, forearm, hands & tools stay strictly above y > 1.14 (world y_min >= 1.165)!
    """
    sleeve_spine = catmull_rom_chain([
        (-sgn * 0.075, 0.006, -0.014),
        (-sgn * 0.030, 0.002, -0.004),
        (sgn * 0.012, -0.022, 0.012),
        (sgn * 0.048, -0.078, 0.045),
        (sgn * 0.076, -0.128, 0.086),
        (sgn * 0.084, -0.144, 0.102),
    ], samples_per_seg=2)

    def sleeve_sec(t, theta):
        if t < 0.28:
            u_f = t / 0.28
            r = 0.032 + 0.036 * math.sin(u_f * math.pi * 0.5)
        else:
            v_f = (t - 0.28) / 0.72
            r = 0.068 - 0.005 * v_f + 0.003 * math.sin(v_f * math.pi * 2.5)
        wrinkle = 0.0025 * math.cos(theta * 5.0) * (max(0.0, t - 0.30) ** 1.4)
        return (math.cos(theta) * (r + wrinkle) * 0.98, math.sin(theta) * (r + wrinkle) * 1.03)

    shirt_part.add_loft(sleeve_spine, sleeve_sec, u_segs=8, up_hint=(0.0, 0.0, 1.0))

    # Thick rolled flannel cuff at the elbow (world y_min >= 1.165)
    elbow_c = (sgn * 0.084, -0.142, 0.104)
    for roll_i, (off_y, off_z, r_tube) in enumerate(((0.010, -0.012, 0.017), (-0.002, 0.008, 0.018))):
        cuff_ring = []
        for k in range(8):
            a = (k / 8.0) * math.pi * 2.0
            px = elbow_c[0] + math.cos(a) * (0.064 - roll_i * 0.002)
            py = elbow_c[1] + off_y + math.sin(a) * 0.040
            pz = elbow_c[2] + off_z - math.sin(a) * 0.038
            cuff_ring.append((px, py, pz))
        add_closed_loop_tube(shirt_part, cuff_ring, r_tube, r_tube * 0.92, u_segs=4)

    # Muscular blacksmith forearm angling forward & slightly upward (+Z) from elbow to wrist
    forearm_spine = catmull_rom_chain([
        (sgn * 0.082, -0.142, 0.112),
        (sgn * 0.058, -0.132, 0.166),
        (sgn * 0.026, -0.120, 0.218),
        (-sgn * 0.004, -0.112, 0.258),
    ], samples_per_seg=2)

    def forearm_sec(t, theta):
        # Pronounced brachioradialis & flexor muscle belly tapering to sturdy wrist
        muscle = 0.054 + 0.008 * math.sin(t * math.pi * 0.78) - 0.019 * (t ** 1.18)
        flat_x = 1.0 - 0.10 * t
        flat_y = 1.0 + 0.10 * t
        return (math.cos(theta) * muscle * flat_x, math.sin(theta) * muscle * flat_y)

    skin_part.add_loft(forearm_spine, forearm_sec, u_segs=8, up_hint=(0.0, 1.0, 0.0))


def build_right_hand_and_ball_peen_hammer(skin_part, wood_part, iron_part, steel_part, brass_part):
    """
    Right hand (x < 0 when facing +Z, local to RightArm at (-0.220, 1.365, 0.010))
    gripping a Gunsmith's Ball-Peen Hammer above counter level (all world y >= 1.19 > 1.14!).
    """
    # Muscular gripped fist & palm (local y = -0.112 -> world y = 1.253)
    palm_spine = [
        (0.004, -0.112, 0.258),
        (0.022, -0.108, 0.282),
        (0.038, -0.106, 0.304),
    ]

    def palm_sec(t, theta):
        w = 0.024 + 0.005 * math.sin(t * math.pi)
        h = 0.040 + 0.006 * math.sin(t * math.pi * 0.8)
        return (math.cos(theta) * w, math.sin(theta) * h)

    skin_part.add_loft(palm_spine, palm_sec, u_segs=7, up_hint=(0.0, 1.0, 0.0))

    # Thumb braced up along the hammer handle shaft
    add_articulated_finger(
        skin_part,
        [
            (0.018, -0.092, 0.274),
            (0.034, -0.074, 0.292),
            (0.048, -0.064, 0.304),
            (0.056, -0.066, 0.308),
        ],
        r_base=0.0125, r_tip=0.0092, u_segs=4,
    )

    # 4 curled fingers wrapped firmly around the hickory hammer handle
    for f_idx, (y_off, z_off) in enumerate(((-0.090, 0.304), (-0.104, 0.306), (-0.118, 0.304), (-0.131, 0.298))):
        r_f = 0.0106 - f_idx * 0.0007
        add_articulated_finger(
            skin_part,
            [
                (0.036, y_off, z_off),
                (0.060, y_off + 0.002, z_off + 0.012),
                (0.064, y_off - 0.006, z_off - 0.008),
                (0.044, y_off - 0.008, z_off - 0.018),
            ],
            r_base=r_f, r_tip=r_f * 0.78, u_segs=4,
        )

    # Turned Hickory Ball-Peen Hammer Handle (butt at local y = -0.156 -> world y = 1.209 > 1.14!)
    # Angles upward & inward toward the brass barrel part held by the left hand
    h_bot = (0.030, -0.156, 0.284)
    h_head = (0.088, 0.012, 0.326)
    handle_ctrl = [
        h_bot,
        (0.048, -0.102, 0.298),
        (0.070, -0.040, 0.313),
        h_head,
    ]
    handle_spine = catmull_rom_chain(handle_ctrl, samples_per_seg=2)

    def handle_sec(t, theta):
        # Ergonomic swell at grip, slim shock-absorbing neck below head
        swell = 0.0145 + 0.0035 * math.sin(t * math.pi * 1.15) - 0.0035 * math.exp(-((t - 0.78) / 0.14) ** 2)
        return (math.cos(theta) * swell * 0.84, math.sin(theta) * swell * 1.14)

    wood_part.add_loft(handle_spine, handle_sec, u_segs=8, up_hint=(0.0, 0.0, 1.0))

    # Gunsmith's Ball-Peen Hammer Head at h_head (oriented toward inward/forward work area)
    head_rot = (0.18, -0.35, -0.32)
    # Central eye block + brass handle wedge
    iron_part.add_beveled_box(h_head[0], h_head[1], h_head[2], 0.036, 0.038, 0.042, bevel=0.005, rot_euler=head_rot)
    brass_part.add_beveled_box(h_head[0] + 0.006, h_head[1] + 0.020, h_head[2] + 0.004, 0.010, 0.006, 0.020, bevel=0.002, rot_euler=head_rot)

    # Forward/inward neck & polished octagonal flat striking face
    q_hd = quat_from_euler_xyz(*head_rot)

    def hp(ox, oy, oz):
        return v_add(h_head, quat_rotate_vec(q_hd, (ox, oy, oz)))

    iron_part.add_faceted_prism(
        sides=8, r_top=0.017, r_bot=0.014, length=0.032,
        center=hp(0.030, 0.0, 0.0), rot_euler=(0.0, -0.35, -math.pi * 0.5 - 0.32),
    )
    steel_part.add_faceted_prism(
        sides=8, r_top=0.0185, r_bot=0.0185, length=0.010,
        center=hp(0.046, 0.0, 0.0), rot_euler=(0.0, -0.35, -math.pi * 0.5 - 0.32),
    )
    # Rear neck & signature hemispherical Ball-Peen dome!
    iron_part.add_faceted_prism(
        sides=10, r_top=0.013, r_bot=0.016, length=0.024,
        center=hp(-0.026, 0.0, 0.0), rot_euler=(0.0, -0.35, -math.pi * 0.5 - 0.32),
    )
    steel_part.add_ellipsoid(
        center=hp(-0.042, 0.0, 0.0),
        radii=(0.0165, 0.0165, 0.0165), u_segs=8, v_segs=5,
    )


def build_left_hand_and_brass_barrel_part(skin_part, iron_part, steel_part, brass_part):
    """
    Left hand (x > 0 when facing +Z, local to LeftArm at (+0.220, 1.365, 0.010))
    steadying a machined octagonal gun barrel & polished brass receiver/barrel-band assembly
    above counter level (all world y >= 1.20 > 1.14!).
    """
    palm_spine = [
        (-0.004, -0.112, 0.258),
        (-0.022, -0.116, 0.284),
        (-0.036, -0.114, 0.308),
    ]

    def cup_palm_sec(t, theta):
        w = 0.036 + 0.005 * math.sin(t * math.pi * 0.8)
        h = 0.020 + 0.004 * math.sin(t * math.pi)
        return (math.cos(theta) * w, math.sin(theta) * h)

    skin_part.add_loft(palm_spine, cup_palm_sec, u_segs=7, up_hint=(0.0, 1.0, 0.0))

    # Thumb clamping over top of the brass-fitted barrel assembly
    add_articulated_finger(
        skin_part,
        [
            (-0.042, -0.106, 0.274),
            (-0.056, -0.086, 0.290),
            (-0.052, -0.078, 0.310),
            (-0.038, -0.082, 0.318),
        ],
        r_base=0.0120, r_tip=0.0088, u_segs=4,
    )

    # 4 fingers cradling underneath & curling up the front of the barrel assembly
    for f_idx, x_off in enumerate((-0.056, -0.036, -0.016, 0.002)):
        r_f = 0.0102 - abs(f_idx - 1) * 0.0006
        add_articulated_finger(
            skin_part,
            [
                (x_off, -0.118, 0.306),
                (x_off - 0.003, -0.118, 0.332),
                (x_off - 0.004, -0.100, 0.344),
                (x_off - 0.004, -0.084, 0.336),
            ],
            r_base=r_f, r_tip=r_f * 0.76, u_segs=4,
        )

    # Brass-Fitted Barrel Part held horizontally across the left palm (pointing inward toward -X / +Z)
    # Center of part at local (-0.065, -0.094, 0.316) -> world (+0.155, 1.271, 0.326)
    b_rot = (0.0, 0.22, math.pi * 0.5 - 0.06)
    q_b = quat_from_euler_xyz(*b_rot)
    bc = (-0.065, -0.094, 0.316)

    def bp(ox, oy, oz):
        return v_add(bc, quat_rotate_vec(q_b, (ox, oy, oz)))

    # Polished brass receiver frame / breech block on the inward (-X) end where the hammer works
    brass_part.add_beveled_box(*bp(0.0, -0.115, 0.0), 0.044, 0.105, 0.034, bevel=0.005, rot_euler=b_rot)
    brass_part.add_beveled_box(*bp(0.018, -0.108, 0.0), 0.022, 0.058, 0.024, bevel=0.003, rot_euler=b_rot)
    # Machined octagonal blued-steel rifle barrel + under-barrel magazine tube
    iron_part.add_faceted_prism(sides=8, r_top=0.0145, r_bot=0.0165, length=0.30, center=bp(0.0, 0.075, 0.0), rot_euler=b_rot)
    steel_part.add_faceted_prism(sides=10, r_top=0.0105, r_bot=0.0105, length=0.26, center=bp(0.022, 0.065, 0.0), rot_euler=b_rot)
    # Two gleaming fitted brass barrel bands + brass dovetail front sight blade
    for by_band in (0.015, 0.155):
        brass_part.add_beveled_box(*bp(0.009, by_band, 0.0), 0.048, 0.018, 0.032, bevel=0.004, rot_euler=b_rot)
    brass_part.add_beveled_box(*bp(-0.018, 0.208, 0.0), 0.014, 0.018, 0.006, bevel=0.001, rot_euler=b_rot)
    # Dark recessed muzzle bore cap
    iron_part.add_faceted_prism(sides=8, r_top=0.0085, r_bot=0.0085, length=0.008, center=bp(0.0, 0.226, 0.0), rot_euler=b_rot)


def build_gunsmith_head_beard_hat_and_goggles(
    skin_part,
    sclera_part,
    iris_part,
    pupil_part,
    beard_part,
    hat_part,
    strap_part,
    brass_part,
    lens_part,
):
    """
    Sculpts the Frontier Master Gunsmith's rugged face (+Z), cheekbones, nose, eyes,
    thick bushy frontier beard & mustache, flat-crowned leather gunsmith hat, and
    brass-rimmed smithing goggles resting on the front crown!
    Local to Head node at (0.0, 1.465, 0.008). Hat top reaches world y ≈ 1.80m!
    """
    # 1. Thick Muscular Neck
    neck_spine = [(0.0, -0.058, -0.004), (0.0, 0.010, 0.000), (0.0, 0.075, 0.004)]

    def neck_sec(t, theta):
        rx = 0.074 - 0.006 * t
        rz = 0.075 - 0.005 * t
        return (math.cos(theta) * rx, math.sin(theta) * rz)

    skin_part.add_loft(neck_spine, neck_sec, u_segs=9, up_hint=(0.0, 0.0, 1.0))

    # 2. Rugged Frontier Head Mesh (facing +Z!)
    u_segs_h = 16
    v_segs_h = 11
    head_rings = []
    for v in range(v_segs_h + 1):
        frac = 0.02 + 0.96 * (v / v_segs_h)
        phi = frac * math.pi
        sp = math.sin(phi)
        cp = -math.cos(phi)

        ring = []
        for u in range(u_segs_h):
            theta = (u / u_segs_h) * math.pi * 2.0
            ct, st = math.cos(theta), math.sin(theta)

            x = sp * ct * 0.122
            y = cp * 0.148
            z = sp * st * 0.136

            if cp < 0.05:
                jaw_f = min(1.0, (0.05 - cp) / 0.95)
                x *= 1.0 - 0.18 * (jaw_f ** 1.3)
                if st < 0.0:
                    z *= 1.0 - 0.22 * (jaw_f ** 1.3)

            if st > 0.0:
                # Prominent weathered cheekbones
                cheek = (
                    math.exp(-((cp + 0.04) / 0.23) ** 2)
                    * math.exp(-((abs(ct) - 0.58) / 0.24) ** 2)
                    * (st ** 0.8)
                )
                x += math.copysign(0.015 * cheek, ct)
                z += 0.015 * cheek

                # Strong frontier brow ridge
                brow = math.exp(-((cp - 0.30) / 0.13) ** 2) * (st ** 2.2) * (1.0 - 0.30 * (ct ** 2))
                z += 0.016 * brow

                # Deep-set orbital sockets
                socket = (
                    math.exp(-((cp - 0.13) / 0.14) ** 2)
                    * math.exp(-((abs(ct) - 0.38) / 0.16) ** 2)
                    * (st ** 1.5)
                )
                z -= 0.019 * socket

            ring.append((x, 0.136 + y, 0.010 + z))
        head_rings.append(ring)

    skin_part.add_smooth_grid(head_rings, closed_u=True, ensure_outward=True)
    skin_part.add_cap_ring(head_rings[0], (0.0, -1.0, 0.0))
    skin_part.add_cap_ring(head_rings[-1], (0.0, 1.0, 0.0))

    # 3. Rugged Nose Bridge, Broad Tip & Nostril Wings (+Z)
    nose_spine = catmull_rom_chain([
        (0.0, 0.164, 0.134),
        (0.0, 0.138, 0.158),
        (0.0, 0.112, 0.176),
        (0.0, 0.102, 0.155),
    ], samples_per_seg=2)

    def nose_sec(t, theta):
        w = 0.015 + 0.009 * math.sin(t * math.pi * 0.82)
        d = 0.013 + 0.010 * math.sin(t * math.pi * 0.78)
        return (math.cos(theta) * w, math.sin(theta) * d)

    skin_part.add_loft(nose_spine, nose_sec, u_segs=7, up_hint=(0.0, 0.0, 1.0))
    for sgn in (-1, 1):
        skin_part.add_ellipsoid(
            center=(sgn * 0.0175, 0.108, 0.156),
            radii=(0.0115, 0.0092, 0.0125),
            u_segs=6, v_segs=3,
        )
        pupil_part.add_ellipsoid(
            center=(sgn * 0.0125, 0.102, 0.159),
            radii=(0.0050, 0.0030, 0.0062),
            u_segs=5, v_segs=3,
        )

    # 4. Sculpted Ears
    for sgn in (-1, 1):
        ear_x = sgn * 0.122
        skin_part.add_ellipsoid(
            center=(ear_x, 0.132, 0.004),
            radii=(0.012, 0.031, 0.021),
            u_segs=6, v_segs=4,
            rot_euler=(-0.12, sgn * -0.28, sgn * -0.08),
        )
        helix_pts = [
            (ear_x + sgn * 0.004, 0.148, 0.014),
            (ear_x + sgn * 0.012, 0.158, 0.002),
            (ear_x + sgn * 0.014, 0.136, -0.014),
            (ear_x + sgn * 0.010, 0.110, -0.008),
        ]
        skin_part.add_tube(helix_pts, 0.0058, 0.0050, u_segs=4, samples_per_seg=1)

    # 5. Focused Frontier Eyes (Sclera, Amber-Brown Iris, Dark Pupil, Eyelids & Furrowed Brows)
    for sgn in (-1, 1):
        ex, ey, ez = sgn * 0.046, 0.153, 0.130
        sclera_part.add_ellipsoid(center=(ex, ey, ez), radii=(0.0175, 0.0135, 0.0140), u_segs=6, v_segs=4)
        iris_part.add_ellipsoid(center=(ex, ey, ez + 0.0098), radii=(0.0092, 0.0092, 0.0055), u_segs=6, v_segs=3)
        pupil_part.add_ellipsoid(center=(ex, ey, ez + 0.0132), radii=(0.0050, 0.0050, 0.0038), u_segs=5, v_segs=3)

        up_lid = [
            (ex - sgn * 0.017, ey, ez + 0.008),
            (ex, ey + 0.010, ez + 0.013),
            (ex + sgn * 0.017, ey - 0.002, ez + 0.005),
        ]
        skin_part.add_tube(up_lid, 0.0044, 0.0040, u_segs=4, samples_per_seg=2, scale_xy=(1.2, 0.8))
        low_lid = [
            (ex - sgn * 0.016, ey - 0.003, ez + 0.007),
            (ex, ey - 0.009, ez + 0.012),
            (ex + sgn * 0.016, ey - 0.004, ez + 0.005),
        ]
        skin_part.add_tube(low_lid, 0.0032, 0.0030, u_segs=4, samples_per_seg=2)

        # Thick bushy frontier eyebrows
        brow_pts = [
            (sgn * 0.016, 0.174, 0.144),
            (sgn * 0.048, 0.186, 0.142),
            (sgn * 0.078, 0.175, 0.124),
        ]
        beard_part.add_tube(brow_pts, 0.0105, 0.0068, u_segs=5, samples_per_seg=2, scale_xy=(1.25, 0.85))

    # 6. Rear Nape Hair + Thick Bushy Frontier Beard & Drooping Walrus/Handlebar Mustache (+Z)!
    hair_cap_rings = []
    for v_idx, (hy, hr_x, hr_z) in enumerate((
        (0.076, 0.098, 0.108),
        (0.122, 0.120, 0.132),
        (0.170, 0.126, 0.138),
    )):
        ring = []
        steps_h = 10
        for u in range(steps_h + 1):
            ang = 0.18 - (u / steps_h) * (math.pi + 0.36)
            wave = 1.0 + 0.030 * math.cos(u * 2.5) * (1.0 if v_idx == 0 else 0.4)
            ring.append((math.cos(ang) * hr_x * wave, hy, 0.008 + math.sin(ang) * hr_z * wave))
        hair_cap_rings.append(ring)
    beard_part.add_smooth_grid(hair_cap_rings, closed_u=False, ensure_outward=False)

    # Full sculpted bushy beard volume wrapping from sideburns across jaw & sweeping down over chest bib
    beard_spine = catmull_rom_chain([
        (0.0, 0.125, 0.068),
        (0.0, 0.075, 0.092),
        (0.0, 0.018, 0.118),
        (0.0, -0.042, 0.132),
        (0.0, -0.088, 0.128),
    ], samples_per_seg=2)

    def beard_vol_sec(t, theta):
        # Wide full cheeks/jaw tapering into thick rounded spade beard at chest
        taper = math.sin(min(1.0, t * 0.85 + 0.15) * math.pi * 0.88)
        rx = (0.126 - 0.056 * (t ** 1.35)) * (0.75 + 0.25 * taper)
        rz = 0.068 + 0.020 * math.sin(t * math.pi) - 0.024 * (t ** 1.8)
        tuft = 1.0 + 0.065 * math.cos(theta * 7.0 + t * 3.0)
        ca, sa = math.cos(theta), math.sin(theta)
        # Flatten back against neck/jaw (-Z) while keeping lush forward (+Z) fullness
        if sa < 0.0:
            rz *= 0.58
        return (ca * rx * tuft, sa * rz * tuft)

    beard_part.add_loft(beard_spine, beard_vol_sec, u_segs=10, up_hint=(0.0, 0.0, 1.0))

    # Sideburn connectors & 5 sculpted layered front beard locks for rich silhouette
    for sgn in (-1, 1):
        sb_pts = [
            (sgn * 0.116, 0.184, 0.032),
            (sgn * 0.120, 0.140, 0.055),
            (sgn * 0.112, 0.088, 0.085),
        ]
        beard_part.add_tube(sb_pts, 0.018, 0.024, u_segs=5, samples_per_seg=1, scale_xy=(0.75, 1.25))

    lock_offsets = (-0.064, -0.032, 0.0, 0.032, 0.064)
    for idx_l, lx_b in enumerate(lock_offsets):
        center_f = 1.0 - abs(lx_b) / 0.085
        lock_pts = [
            (lx_b * 1.12, 0.058, 0.136 - (1.0 - center_f) * 0.024),
            (lx_b * 1.04, -0.008, 0.156 - (1.0 - center_f) * 0.020),
            (lx_b * 0.86, -0.065 - 0.028 * center_f, 0.152 - (1.0 - center_f) * 0.016),
        ]
        beard_part.add_tube(
            lock_pts,
            0.020, 0.008, u_segs=5, samples_per_seg=2, scale_xy=(1.05, 0.88),
        )

    # Thick Bushy Frontier Mustache sweeping below nose (+Z)
    for sgn in (-1, 1):
        stache_pts = [
            (0.0, 0.092, 0.156),
            (sgn * 0.032, 0.086, 0.160),
            (sgn * 0.068, 0.068, 0.148),
            (sgn * 0.094, 0.050, 0.132),
            (sgn * 0.104, 0.056, 0.122),
        ]
        beard_part.add_tube(
            stache_pts,
            0.019, 0.008, u_segs=6, samples_per_seg=2, scale_xy=(0.95, 1.15),
        )

    # 7. Flat-Crowned Leather Gunsmith Hat (Plainsman / Telescoping Gambler Crown, y_max ≈ 1.800m!)
    # Head pivot is at y = 1.465; hat_cy = 0.188 + crown top 0.138 -> world y ≈ 1.800m!
    hat_cx, hat_cy, hat_cz = 0.0, 0.188, 0.006
    hat_tilt = (-0.055, 0.0, 0.018)

    hat_profile = [
        (0.004, 0.088),
        (0.146, 0.006),
        (0.172, -0.002),
        (0.285, -0.008),
        (0.338, 0.010),
        (0.342, 0.022),
        (0.282, 0.006),
        (0.180, 0.014),
        (0.174, 0.055),
        (0.164, 0.128),
        (0.152, 0.138),
        (0.128, 0.126),
        (0.055, 0.128),
        (0.004, 0.130),
    ]

    def flat_crown_hat_deform(x, y, z, ang):
        r = math.hypot(x, z)
        xx = x * 0.96
        zz = z * 1.10
        yy = y
        if r > 0.182:
            # Subtle frontier curl along left/right brim edges, dipped slightly in front (+Z)
            side_f = abs(xx) / 0.33
            yy += (side_f * side_f) * 0.042
            if zz > 0.14:
                yy -= 0.014 * ((zz - 0.14) / 0.22)
        return (xx, yy, zz)

    hat_part.add_lathe(
        hat_profile,
        u_segs=14,
        translate=(hat_cx, hat_cy, hat_cz),
        rot_euler=hat_tilt,
        deform_fn=flat_crown_hat_deform,
    )

    # Heavy leather goggle/hatband strap wrapping around the flat crown
    strap_loop = [
        (math.cos(a) * 0.173 * 0.96, 0.056, math.sin(a) * 0.173 * 1.10)
        for a in [k * math.pi * 2.0 / 12 for k in range(12)]
    ]
    add_closed_loop_tube(
        strap_part, strap_loop,
        0.009, 0.018, u_segs=4,
        translate=(hat_cx, hat_cy, hat_cz), rot_euler=hat_tilt,
    )
    # Brass strap adjustment buckle on side of crown
    q_ht = quat_from_euler_xyz(*hat_tilt)

    def htp(ox, oy, oz):
        return v_add((hat_cx, hat_cy, hat_cz), quat_rotate_vec(q_ht, (ox, oy, oz)))

    brass_part.add_beveled_box(*htp(-0.168, 0.056, 0.015), 0.012, 0.036, 0.028, bevel=0.002, rot_euler=hat_tilt)

    # 8. Brass-Rimmed Smithing Goggles Resting on the Front Crown (+Z)!
    for sgn in (-1, 1):
        gx_l = sgn * 0.052
        gy_l = 0.064
        gz_l = 0.188
        cup_rot = (math.pi * 0.5 - 0.12, sgn * 0.26, 0.0)
        # Leather side cushion cup + machined PolishedBrass outer bezel ring + smoked protective lens
        strap_part.add_faceted_prism(
            sides=10, r_top=0.031, r_bot=0.033, length=0.022,
            center=htp(gx_l, gy_l, gz_l - 0.006), rot_euler=cup_rot,
        )
        brass_part.add_faceted_prism(
            sides=10, r_top=0.0335, r_bot=0.0325, length=0.016,
            center=htp(gx_l, gy_l, gz_l + 0.008), rot_euler=cup_rot,
        )
        # Stepped inner brass retaining bezel ring
        brass_part.add_faceted_prism(
            sides=10, r_top=0.028, r_bot=0.028, length=0.008,
            center=htp(gx_l, gy_l, gz_l + 0.015), rot_euler=cup_rot,
        )
        # Convex dark smoked smithing lens
        lens_part.add_ellipsoid(
            center=htp(gx_l, gy_l, gz_l + 0.016),
            radii=(0.025, 0.025, 0.007), u_segs=8, v_segs=3,
            rot_euler=(-0.12, sgn * 0.26, 0.0),
        )
        # Side brass hinge lug connecting goggle cup to crown strap
        brass_part.add_beveled_box(
            *htp(sgn * 0.086, gy_l, gz_l - 0.010),
            0.018, 0.020, 0.014, bevel=0.002, rot_euler=(0.0, sgn * 0.35, 0.0),
        )

    # Curved brass nose-bridge arch joining the two smithing goggle cups
    bridge_pts = [
        htp(-0.024, 0.066, 0.198),
        htp(0.0, 0.075, 0.205),
        htp(0.024, 0.066, 0.198),
    ]
    brass_part.add_tube(bridge_pts, 0.0052, 0.0052, u_segs=6, samples_per_seg=2)


# ---------------------------------------------------------------------------
# 2. Public Builder: build_gunsmith_npc_glb(out_path) -> assets/gunsmith_npc.glb
# ---------------------------------------------------------------------------

def build_gunsmith_npc_glb(out_path):
    """
    Builds the Frontier Master Gunsmith NPC grounded with boot soles at y = 0.0,
    height ~1.80m, CRITICAL: facing +Z, with heavy leather boots, charcoal canvas trousers,
    scorched-brown leather blacksmith apron (bib, shoulder straps, brass rivets, pocket + iron tongs),
    rust flannel shirt with rolled sleeves, muscular forearms/hands posed above counter level (y > 1.14)
    holding a ball-peen hammer & brass-fitted barrel part, rugged bearded face, flat-crowned leather hat
    with brass smithing goggles on the front crown, and a 2.0s "Idle" keyframe animation.
    """
    b = GLBBuilder()

    mat_pants = b.add_material("CharcoalCanvasTrousers", (0.18, 0.19, 0.21), metallic=0.02, roughness=0.88)
    mat_boot = b.add_material("GunsmithWorkBoots", (0.15, 0.09, 0.055), metallic=0.06, roughness=0.52)
    mat_sole = b.add_material("GunsmithBootSole", (0.06, 0.04, 0.03), metallic=0.02, roughness=0.78)
    mat_apron = b.add_material("ScorchedLeatherApron", (0.31, 0.16, 0.085), metallic=0.05, roughness=0.62)
    mat_apron_trim = b.add_material("ScorchedApronTrim", (0.18, 0.09, 0.05), metallic=0.06, roughness=0.66)
    mat_strap = b.add_material("HarnessStrapLeather", (0.23, 0.12, 0.065), metallic=0.06, roughness=0.54)
    mat_shirt = b.add_material("RustFlannelShirt", (0.58, 0.17, 0.12), metallic=0.02, roughness=0.84)
    mat_skin = b.add_material("GunsmithSkin", (0.82, 0.59, 0.44), metallic=0.01, roughness=0.68)
    mat_beard = b.add_material("FrontierBeardHair", (0.18, 0.105, 0.065), metallic=0.03, roughness=0.82)
    mat_hat = b.add_material("GunsmithLeatherHat", (0.24, 0.135, 0.075), metallic=0.05, roughness=0.64)
    mat_wood = b.add_material("HickoryWood", (0.72, 0.50, 0.28), metallic=0.03, roughness=0.66)
    mat_iron = b.add_material("WroughtIron", (0.19, 0.21, 0.24), metallic=0.88, roughness=0.34)
    mat_steel = b.add_material("PolishedSteel", (0.76, 0.79, 0.83), metallic=0.93, roughness=0.20)
    mat_brass = b.add_material("PolishedBrass", (0.91, 0.73, 0.35), metallic=0.92, roughness=0.19)
    mat_lens = b.add_material("SmithingGoggleLens", (0.14, 0.10, 0.06), metallic=0.35, roughness=0.08, emissive=(0.04, 0.02, 0.005))
    mat_sclera = b.add_material("EyeSclera", (0.96, 0.95, 0.92), metallic=0.01, roughness=0.22)
    mat_iris = b.add_material("EyeIris", (0.38, 0.25, 0.13), metallic=0.02, roughness=0.18)
    mat_pupil = b.add_material("EyePupil", (0.04, 0.04, 0.05), metallic=0.04, roughness=0.08)

    root = b.add_node("GunsmithNPCRoot")

    # Torso, Apron, Tongs, Trousers & Boots
    body_parts, body_gp = b.create_parts_dict()
    build_gunsmith_boots_and_trousers(
        boot_part=body_gp(mat_boot),
        sole_part=body_gp(mat_sole),
        pants_part=body_gp(mat_pants),
        belt_part=body_gp(mat_strap),
        iron_part=body_gp(mat_iron),
        brass_part=body_gp(mat_brass),
    )
    build_flannel_shirt_and_blacksmith_apron(
        shirt_part=body_gp(mat_shirt),
        apron_part=body_gp(mat_apron),
        apron_trim_part=body_gp(mat_apron_trim),
        strap_part=body_gp(mat_strap),
        brass_part=body_gp(mat_brass),
        iron_part=body_gp(mat_iron),
    )
    body_mesh = b.add_mesh_from_parts("GunsmithBodyMesh", body_parts.values())
    b.add_node("GunsmithBody", mesh_idx=body_mesh, parent_idx=root)

    # Right Arm + Ball-Peen Hammer (x < 0 when facing +Z)
    ra_parts, ra_gp = b.create_parts_dict()
    build_gunsmith_arm_mesh(ra_gp(mat_shirt), ra_gp(mat_skin), sgn=-1)
    build_right_hand_and_ball_peen_hammer(
        skin_part=ra_gp(mat_skin),
        wood_part=ra_gp(mat_wood),
        iron_part=ra_gp(mat_iron),
        steel_part=ra_gp(mat_steel),
        brass_part=ra_gp(mat_brass),
    )
    ra_mesh = b.add_mesh_from_parts("GunsmithRightArmMesh", ra_parts.values())
    ra_node = b.add_node("RightArm", translation=(-0.220, 1.365, 0.010), mesh_idx=ra_mesh, parent_idx=root)

    # Left Arm + Brass-Fitted Barrel Part (x > 0 when facing +Z)
    la_parts, la_gp = b.create_parts_dict()
    build_gunsmith_arm_mesh(la_gp(mat_shirt), la_gp(mat_skin), sgn=1)
    build_left_hand_and_brass_barrel_part(
        skin_part=la_gp(mat_skin),
        iron_part=la_gp(mat_iron),
        steel_part=la_gp(mat_steel),
        brass_part=la_gp(mat_brass),
    )
    la_mesh = b.add_mesh_from_parts("GunsmithLeftArmMesh", la_parts.values())
    la_node = b.add_node("LeftArm", translation=(0.220, 1.365, 0.010), mesh_idx=la_mesh, parent_idx=root)

    # Rugged Head + Frontier Beard + Leather Hat + Brass Smithing Goggles
    hd_parts, hd_gp = b.create_parts_dict()
    build_gunsmith_head_beard_hat_and_goggles(
        skin_part=hd_gp(mat_skin),
        sclera_part=hd_gp(mat_sclera),
        iris_part=hd_gp(mat_iris),
        pupil_part=hd_gp(mat_pupil),
        beard_part=hd_gp(mat_beard),
        hat_part=hd_gp(mat_hat),
        strap_part=hd_gp(mat_strap),
        brass_part=hd_gp(mat_brass),
        lens_part=hd_gp(mat_lens),
    )
    hd_mesh = b.add_mesh_from_parts("GunsmithHeadMesh", hd_parts.values())
    hd_node = b.add_node("Head", translation=(0.0, 1.465, 0.008), mesh_idx=hd_mesh, parent_idx=root)

    # Subtle 2.0s "Idle" keyframe animation (seamless loop 0.0 -> 1.0 -> 2.0s)
    b.add_animation("Idle", [
        {
            "node": hd_node,
            "path": "rotation",
            "times": [0.0, 1.0, 2.0],
            "values": [
                quat_from_euler_xyz(0.0, 0.0, 0.0),
                quat_from_euler_xyz(0.032, 0.038, -0.010),
                quat_from_euler_xyz(0.0, 0.0, 0.0),
            ],
        },
        {
            "node": ra_node,
            "path": "rotation",
            "times": [0.0, 0.65, 1.35, 2.0],
            "values": [
                quat_from_euler_xyz(0.0, 0.0, 0.0),
                quat_from_euler_xyz(-0.034, 0.016, 0.0),
                quat_from_euler_xyz(0.014, -0.008, 0.0),
                quat_from_euler_xyz(0.0, 0.0, 0.0),
            ],
        },
        {
            "node": la_node,
            "path": "rotation",
            "times": [0.0, 1.0, 2.0],
            "values": [
                quat_from_euler_xyz(0.0, 0.0, 0.0),
                quat_from_euler_xyz(-0.018, -0.015, 0.0),
                quat_from_euler_xyz(0.0, 0.0, 0.0),
            ],
        },
    ])

    return b.export_glb(out_path)


# ---------------------------------------------------------------------------
# Strict Binary .glb Integrity, Bounds & Degeneracy Validator
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
        assert req_n in node_names, f"Missing node '{req_n}' in {filepath}"
    for req_m in expected_materials:
        assert req_m in mat_names, f"Missing material '{req_m}' in {filepath}"

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


if __name__ == "__main__":
    assets_dir = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "assets"))
    os.makedirs(assets_dir, exist_ok=True)

    gunsmith_path = os.path.join(assets_dir, "gunsmith.glb")
    gunsmith_npc_path = os.path.join(assets_dir, "gunsmith_npc.glb")

    g_stats = build_gunsmith_glb(gunsmith_path)
    g_chk = _verify_glb(
        gunsmith_path,
        expected_nodes=("GunsmithShopRoot", "GunsmithArchitecture"),
        expected_materials=(
            "WeatheredSiding",
            "WarmPine",
            "DarkTimber",
            "PolishedCounterWood",
            "CedarShingles",
            "PaintedShutters",
            "StoneFoundation",
            "ChimneyBrick",
            "WroughtIron",
            "PolishedBrass",
            "WindowGlass",
        ),
    )

    n_stats = build_gunsmith_npc_glb(gunsmith_npc_path)
    n_chk = _verify_glb(
        gunsmith_npc_path,
        expected_nodes=("GunsmithNPCRoot", "GunsmithBody", "RightArm", "LeftArm", "Head"),
    )

    for label, st, chk in (("gunsmith.glb", g_stats, g_chk), ("gunsmith_npc.glb", n_stats, n_chk)):
        print(
            f"[OK] {label:18s} | {st['triangles']:6d} tris | {st['vertices']:6d} verts | {st['bytes']:8d} B | "
            f"bounds min={chk['bounds_min']} max={chk['bounds_max']} | degen={chk['degen_normals']}/{chk['degen_tris']}"
        )
