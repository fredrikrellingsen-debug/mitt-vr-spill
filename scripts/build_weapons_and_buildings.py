#!/usr/bin/env python3
"""
Builds crisp, game-ready binary glTF 2.0 (.glb) hard-surface & architectural models:
  - assets/revolver.glb (Colt Single Action / Navy revolver with octagonal barrel, fluted 6-shot cylinder & ergonomic walnut grip)
  - assets/saloon.glb   (Grand Western Saloon with pitched shingled gable roof, ornate false-front facade, turned columns, louvered shutters & batwing doors)
  - assets/tailor.glb   (Western Tailor Shop & Haberdashery with open storefront, pitched gable roof, turned columns, shuttered windows, paneled counter & tailor props)
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


# ---------------------------------------------------------------------------
# Shared Architectural & Hard-Surface Helpers
# ---------------------------------------------------------------------------

def add_gable_pediment_wall(part, cx, y_base, y_peak, cz, span_x, thickness, uv_scale=0.65):
    """
    Watertight 3D triangular gable pediment wall (front +Z, back -Z, two sloped top faces, bottom face).
    Eliminates paper-thin triangles and ensures crisp outward face normals on both sides.
    """
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
    # Front (+Z): CCW viewed from +Z -> p_fl -> p_fr -> p_fp
    part.add_flat_tri(
        p_fl, p_fr, p_fp,
        (0.0, 0.0), (span_x * uv_scale, 0.0), (hw * uv_scale, h * uv_scale),
    )
    # Back (-Z): CCW viewed from -Z -> p_br -> p_bl -> p_bp
    part.add_flat_tri(
        p_br, p_bl, p_bp,
        (0.0, 0.0), (span_x * uv_scale, 0.0), (hw * uv_scale, h * uv_scale),
    )
    # Left slope: outward normal (-h, +hw, 0) -> p_bl -> p_fl -> p_fp -> p_bp
    part.add_flat_quad(p_bl, p_fl, p_fp, p_bp)
    # Right slope: outward normal (+h, +hw, 0) -> p_fr -> p_br -> p_bp -> p_fp
    part.add_flat_quad(p_fr, p_br, p_bp, p_fp)
    # Bottom face (-Y): p_bl -> p_br -> p_fr -> p_fl
    part.add_flat_quad(p_bl, p_br, p_fr, p_fl)


def add_gable_clapboards(part, cx, y_base, y_peak, cz_face, span_x, normal_sign_z=1.0, plank_h=0.20):
    """Horizontal tapered clapboard courses fitted cleanly inside a triangular gable end."""
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


def add_turned_western_column(get_part, mat_wood, mat_accent, x, y_bot, y_top, z, radius=0.105):
    """Ornate lathe-turned Victorian Western porch column with plinth, ring beads, entasis taper & capital."""
    h = y_top - y_bot
    wood = get_part(mat_wood)
    acc = get_part(mat_accent)

    plinth_h = 0.17
    cap_h = 0.15
    # Molded square plinth base + chamfered collar
    wood.add_beveled_box(x, y_bot + plinth_h * 0.42, z, radius * 2.55, plinth_h * 0.84, radius * 2.55, bevel=0.014)
    acc.add_beveled_box(x, y_bot + plinth_h * 0.92, z, radius * 2.20, plinth_h * 0.24, radius * 2.20, bevel=0.010)

    # Molded capital abacus + necking ring
    wood.add_beveled_box(x, y_top - cap_h * 0.42, z, radius * 2.65, cap_h * 0.84, radius * 2.65, bevel=0.014)
    acc.add_beveled_box(x, y_top - cap_h * 0.95, z, radius * 2.25, cap_h * 0.28, radius * 2.25, bevel=0.010)

    shaft_h = max(0.4, h - plinth_h - cap_h)
    profile = [
        (radius * 1.10, 0.000 * shaft_h),
        (radius * 1.18, 0.045 * shaft_h),
        (radius * 0.84, 0.085 * shaft_h),
        (radius * 1.08, 0.125 * shaft_h),
        (radius * 0.80, 0.165 * shaft_h),
        (radius * 1.00, 0.220 * shaft_h),
        (radius * 0.96, 0.460 * shaft_h),
        (radius * 0.88, 0.720 * shaft_h),
        (radius * 0.74, 0.805 * shaft_h),
        (radius * 1.06, 0.850 * shaft_h),
        (radius * 0.78, 0.895 * shaft_h),
        (radius * 1.14, 0.950 * shaft_h),
        (radius * 1.06, 1.000 * shaft_h),
    ]
    wood.add_lathe(profile, u_segs=20, translate=(x, y_bot + plinth_h, z))


def add_scroll_bracket(get_part, mat_wood, mat_trim, x, y_top, z, dir_x=1.0, span=0.46):
    """Carved Victorian S-scroll knee bracket with diagonal strut, volute & rosette boss."""
    trim = get_part(mat_trim)
    wood = get_part(mat_wood)

    pts = [
        (x + dir_x * 0.055, y_top - span * 0.96, z),
        (x + dir_x * (span * 0.22), y_top - span * 0.62, z),
        (x + dir_x * (span * 0.56), y_top - span * 0.34, z),
        (x + dir_x * (span * 0.96), y_top - 0.045, z),
    ]
    trim.add_tube(pts, 0.036, 0.032, u_segs=10, samples_per_seg=6, scale_xy=(0.85, 1.15))

    # Upper chord & vertical hanger bar
    wood.add_beveled_box(
        x + dir_x * (span * 0.48), y_top - span * 0.45, z,
        span * 1.04, 0.052, 0.054, bevel=0.008, rot_euler=(0.0, 0.0, dir_x * 0.76),
    )
    wood.add_beveled_box(
        x + dir_x * (span * 0.26), y_top - span * 0.22, z,
        0.042, span * 0.38, 0.046, bevel=0.006,
    )
    # Carved rosette boss in spandrel pocket
    trim.add_ellipsoid(
        center=(x + dir_x * (span * 0.26), y_top - span * 0.23, z),
        radii=(0.052, 0.052, 0.030), u_segs=12, v_segs=8,
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
    width=0.96,
    height=1.18,
    rot_y=0.0,
    with_shutters=True,
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
    # Outward-facing WindowGlass quad (CCW in right-handed local frame -> +Z' outward normal)
    glass.add_flat_quad(
        lp(-hw, -hh, g_z), lp(hw, -hh, g_z), lp(hw, hh, g_z), lp(-hw, hh, g_z),
        [(0.0, 0.0), (1.0, 0.0), (1.0, 1.0), (0.0, 1.0)],
    )

    # Projecting apron, windowsill, side casings & pediment cornice header
    frame.add_beveled_box(*lp(0.0, -hh - 0.088, 0.026), width + 0.14, 0.044, 0.065, bevel=0.008, rot_euler=(0.0, rot_y, 0.0))
    frame.add_beveled_box(*lp(0.0, -hh - 0.042, 0.052), width + 0.26, 0.078, 0.145, bevel=0.012, rot_euler=(0.0, rot_y, 0.0))
    frame.add_beveled_box(*lp(0.0, hh + 0.050, 0.040), width + 0.22, 0.092, 0.115, bevel=0.012, rot_euler=(0.0, rot_y, 0.0))
    frame.add_beveled_box(*lp(0.0, hh + 0.112, 0.052), width + 0.30, 0.044, 0.148, bevel=0.008, rot_euler=(0.0, rot_y, 0.0))
    for sx in (-hw - 0.044, hw + 0.044):
        frame.add_beveled_box(*lp(sx, 0.0, 0.030), 0.088, height + 0.04, 0.084, bevel=0.010, rot_euler=(0.0, rot_y, 0.0))

    # Sash check-rail & 6-pane colonial muntins
    frame.add_beveled_box(*lp(0.0, 0.0, 0.028), 0.030, height, 0.036, bevel=0.004, rot_euler=(0.0, rot_y, 0.0))
    frame.add_beveled_box(*lp(0.0, 0.0, 0.032), width, 0.038, 0.042, bevel=0.005, rot_euler=(0.0, rot_y, 0.0))
    for my in (-height * 0.25, height * 0.25):
        frame.add_beveled_box(*lp(0.0, my, 0.026), width, 0.024, 0.032, bevel=0.004, rot_euler=(0.0, rot_y, 0.0))

    if not with_shutters:
        return

    sh_w = width * 0.46
    sh_h = height - 0.02
    for side in (-1, 1):
        hinge_x = side * (hw + 0.078)
        yaw_open = rot_y + side * (-0.28 if side < 0 else -0.20)
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
            shutter.add_beveled_box(*sp(leaf_mid + st_off, 0.0, 0.0), 0.050, sh_h, 0.036, bevel=0.006, rot_euler=(0.0, yaw_open, 0.0))
        for ry in (-sh_h * 0.5 + 0.034, 0.0, sh_h * 0.5 - 0.034):
            shutter.add_beveled_box(*sp(leaf_mid, ry, 0.0), sh_w, 0.062, 0.036, bevel=0.006, rot_euler=(0.0, yaw_open, 0.0))

        # Angled louvered slats (crisp faceted slats for clean silhouettes & Quest 90 FPS)
        slat_y = -sh_h * 0.40
        while slat_y <= sh_h * 0.405:
            if abs(slat_y) > 0.056:
                shutter.add_beveled_box(
                    *sp(leaf_mid, slat_y, 0.003),
                    sh_w - 0.088, 0.044, 0.018, bevel=0.0, rot_euler=(0.46, yaw_open, 0.0),
                )
            slat_y += 0.095

        # Wrought-iron strap hinges & S-scroll shutter dog holdback
        for hy in (-sh_h * 0.36, sh_h * 0.36):
            iron.add_beveled_box(*sp(side * 0.072, hy, 0.018), 0.16, 0.028, 0.022, bevel=0.004, rot_euler=(0.0, yaw_open, 0.0))
            iron.add_faceted_prism(sides=8, r_top=0.014, r_bot=0.014, length=0.075, center=sp(0.0, hy, 0.010))
        iron.add_beveled_box(*sp(side * (sh_w * 0.82), -sh_h * 0.42, 0.022), 0.028, 0.075, 0.024, bevel=0.004, rot_euler=(0.0, yaw_open, side * 0.35))


def add_oak_barrel(get_part, mat_wood, mat_dark, mat_iron, cx, cy_bot, cz, scale=1.0):
    """Coopered oak whiskey/supply barrel with recessed heads, chimb rim, iron hoops & wooden bung."""
    wood = get_part(mat_wood)
    dark = get_part(mat_dark)
    iron = get_part(mat_iron)

    h = 0.84 * scale
    # Coopered stave body with recessed top & bottom chime heads (monotone/distinct (r, y) steps)
    profile = [
        (0.004 * scale, 0.022 * scale),
        (0.222 * scale, 0.022 * scale),
        (0.236 * scale, 0.000),
        (0.252 * scale, 0.004 * scale),
        (0.302 * scale, h * 0.24),
        (0.328 * scale, h * 0.50),
        (0.302 * scale, h * 0.76),
        (0.252 * scale, h * 0.996),
        (0.236 * scale, h),
        (0.222 * scale, h - 0.022 * scale),
        (0.004 * scale, h - 0.022 * scale),
    ]
    wood.add_lathe(profile, u_segs=22, translate=(cx, cy_bot, cz))

    # 4 beveled wrought-iron hoops + rivets
    for frac, r_mul in ((0.10, 0.270), (0.33, 0.318), (0.67, 0.318), (0.90, 0.270)):
        rr = r_mul * scale
        hoop_prof = [
            (rr - 0.006 * scale, -0.017 * scale),
            (rr + 0.011 * scale, -0.015 * scale),
            (rr + 0.012 * scale, 0.000),
            (rr + 0.011 * scale, 0.015 * scale),
            (rr - 0.006 * scale, 0.017 * scale),
        ]
        iron.add_lathe(hoop_prof, u_segs=22, translate=(cx, cy_bot + h * frac, cz))

    # Wooden bung stopper on bilge & top head
    dark.add_faceted_prism(
        sides=10, r_top=0.024 * scale, r_bot=0.028 * scale, length=0.032 * scale,
        center=(cx, cy_bot + h - 0.014 * scale, cz + 0.08 * scale),
    )


def add_wagon_wheel(get_part, mat_wood, mat_dark, mat_iron, cx, cy, cz, rot_euler=(0.0, 0.0, 0.0), radius=0.52):
    """12-spoke wooden frontier wagon wheel with wooden felloe rim, iron tire, turned hub & axle bands."""
    wood = get_part(mat_wood)
    dark = get_part(mat_dark)
    iron = get_part(mat_iron)

    segs = 28
    rim_pts = [(math.cos((i / segs) * math.pi * 2.0) * radius, math.sin((i / segs) * math.pi * 2.0) * radius, 0.0) for i in range(segs + 1)]
    dark.add_tube(
        rim_pts, 0.044, 0.044, u_segs=10, samples_per_seg=2,
        cap_start=False, cap_end=False, translate=(cx, cy, cz), rot_euler=rot_euler,
    )

    tire_pts = [(math.cos((i / segs) * math.pi * 2.0) * (radius + 0.040), math.sin((i / segs) * math.pi * 2.0) * (radius + 0.040), 0.0) for i in range(segs + 1)]
    iron.add_tube(
        tire_pts, 0.015, 0.015, u_segs=8, samples_per_seg=2,
        cap_start=False, cap_end=False, translate=(cx, cy, cz), rot_euler=rot_euler,
    )

    # Bulged wooden nave/hub + iron hub bands + axle box
    hub_prof = [
        (0.038, -0.115),
        (0.084, -0.110),
        (0.094, -0.055),
        (0.112, 0.000),
        (0.094, 0.055),
        (0.084, 0.110),
        (0.038, 0.115),
    ]
    hub_rot = quat_from_euler_xyz(*rot_euler)
    # Lathe axis is Y; rotate local +90 deg X so lathe Y aligns with wheel Z before applying rot_euler
    q_wheel_z = quat_from_euler_xyz(math.pi * 0.5, 0.0, 0.0)
    # Build hub via add_tube with bulged loft along Z inside wheel frame
    hub_spine = [(0.0, 0.0, -0.115 + (k / 8.0) * 0.230) for k in range(9)]
    dark.add_loft(
        hub_spine,
        lambda t, th: (
            math.cos(th) * (0.082 + 0.030 * math.sin(t * math.pi)),
            math.sin(th) * (0.082 + 0.030 * math.sin(t * math.pi)),
        ),
        u_segs=16, cap_start=True, cap_end=True, translate=(cx, cy, cz), rot_euler=rot_euler,
    )
    for hz_band in (-0.085, 0.085):
        iron.add_tube(
            [(0.0, 0.0, hz_band - 0.016), (0.0, 0.0, hz_band + 0.016)],
            0.098, 0.098, u_segs=14, samples_per_seg=1, translate=(cx, cy, cz), rot_euler=rot_euler,
        )
    iron.add_tube(
        [(0.0, 0.0, -0.135), (0.0, 0.0, 0.135)],
        0.048, 0.048, u_segs=12, samples_per_seg=1, translate=(cx, cy, cz), rot_euler=rot_euler,
    )

    # 12 tapered turned spokes
    for s in range(12):
        ang = (s / 12.0) * math.pi * 2.0
        p0 = (math.cos(ang) * 0.082, math.sin(ang) * 0.082, 0.0)
        p1 = (math.cos(ang) * (radius - 0.028), math.sin(ang) * (radius - 0.028), 0.0)
        wood.add_tube(
            [p0, p1], 0.022, 0.015, u_segs=8, samples_per_seg=2,
            translate=(cx, cy, cz), rot_euler=rot_euler,
        )


# ---------------------------------------------------------------------------
# 1. assets/revolver.glb — Detailed Colt Single Action / Navy Revolver
# ---------------------------------------------------------------------------

def build_revolver_glb(out_path):
    b = GLBBuilder()

    mat_steel = b.add_material("GunSteel", (0.77, 0.80, 0.85), metallic=0.92, roughness=0.19)
    mat_dark = b.add_material("GunDarkSteel", (0.22, 0.25, 0.30), metallic=0.88, roughness=0.27)
    mat_brass = b.add_material("GunBrass", (0.89, 0.71, 0.34), metallic=0.92, roughness=0.18)
    mat_walnut = b.add_material("GunWalnut", (0.36, 0.17, 0.07), metallic=0.04, roughness=0.40)
    mat_copper = b.add_material("GunCopper", (0.83, 0.46, 0.26), metallic=0.88, roughness=0.24)
    mat_bore = b.add_material("GunBoreDark", (0.03, 0.03, 0.04), metallic=0.15, roughness=0.92)

    root_idx = b.add_node("RevolverRoot")
    parts, gp = b.create_parts_dict()

    steel = gp(mat_steel)
    dark = gp(mat_dark)
    brass = gp(mat_brass)
    walnut = gp(mat_walnut)
    copper = gp(mat_copper)
    bore = gp(mat_bore)

    # 1a. Crisp Faceted Octagonal Colt Barrel (åttekantet løp, z = -0.066..-0.289 at y = 0.032)
    # Note: rot_euler=(-pi/2, 0, 0) maps prism +Y -> -Z (muzzle) and -Y -> +Z (breech)!
    barrel_len = 0.223
    barrel_mid_z = -0.066 - barrel_len * 0.5
    steel.add_faceted_prism(
        sides=8,
        r_top=0.0156,    # muzzle end (-Z)
        r_bot=0.0186,    # breech end (+Z)
        length=barrel_len,
        center=(0.0, 0.032, barrel_mid_z),
        rot_euler=(-math.pi * 0.5, 0.0, 0.0),
        twist_offset=math.pi / 8.0,  # flat top, flat bottom, flat left/right & 45-deg flats!
    )
    # Stepped octagonal forcing-cone breech bolster + Navy barrel-wedge accent
    dark.add_faceted_prism(
        sides=8, r_top=0.0204, r_bot=0.0216, length=0.028,
        center=(0.0, 0.032, -0.074), rot_euler=(-math.pi * 0.5, 0.0, 0.0), twist_offset=math.pi / 8.0,
    )
    brass.add_beveled_box(0.0, 0.024, -0.082, 0.041, 0.0075, 0.013, bevel=0.0014)

    # Beveled machined muzzle crown (z = -0.289..-0.295) + deep dark recessed rifled bore
    dark.add_lathe(
        [
            (0.0150, 0.000),
            (0.0156, 0.002),
            (0.0144, 0.006),
            (0.0094, 0.006),
            (0.0090, 0.001),
        ],
        u_segs=24, translate=(0.0, 0.032, -0.289), rot_euler=(-math.pi * 0.5, 0.0, 0.0),
    )
    bore.add_faceted_prism(
        sides=16, r_top=0.0091, r_bot=0.0091, length=0.016,
        center=(0.0, 0.032, -0.286), rot_euler=(-math.pi * 0.5, 0.0, 0.0),
    )

    # Top machined sighting rib + swept brass shark-fin front sight blade
    dark.add_beveled_box(0.0, 0.0490, -0.178, 0.0124, 0.0068, 0.206, bevel=0.0018)
    brass.add_beveled_box(0.0, 0.0540, -0.270, 0.0062, 0.0055, 0.024, bevel=0.0012)
    brass.add_beveled_box(0.0, 0.0595, -0.269, 0.0042, 0.0155, 0.018, bevel=0.0012, rot_euler=(-0.24, 0.0, 0.0))

    # Under-barrel ejector rod housing + barrel band + steel rod + knurled brass ejector head + cylinder base pin
    dark.add_tube(
        [(0.0105, 0.013, -0.072), (0.0105, 0.013, -0.248)],
        0.0076, 0.0072, u_segs=14, samples_per_seg=3,
    )
    dark.add_beveled_box(0.005, 0.021, -0.236, 0.024, 0.024, 0.012, bevel=0.0025)
    steel.add_tube(
        [(0.0, 0.0115, -0.068), (0.0, 0.0115, -0.258)],
        0.0046, 0.0044, u_segs=12, samples_per_seg=2,
    )
    brass.add_faceted_prism(
        sides=14, r_top=0.0108, r_bot=0.0108, length=0.018,
        center=(0.0085, 0.0105, -0.256), rot_euler=(-math.pi * 0.5, 0.0, 0.0),
    )
    # Central cylinder axis base-pin head protruding forward of frame
    steel.add_faceted_prism(
        sides=12, r_top=0.0058, r_bot=0.0062, length=0.026,
        center=(0.0, 0.032, -0.076), rot_euler=(-math.pi * 0.5, 0.0, 0.0),
    )
    brass.add_faceted_prism(
        sides=10, r_top=0.0036, r_bot=0.0036, length=0.038,
        center=(0.0, 0.021, -0.068), rot_euler=(0.0, 0.0, math.pi * 0.5),
    )
    steel.add_beveled_box(0.0, 0.017, -0.098, 0.017, 0.017, 0.068, bevel=0.003)

    # 1b. Open-Window Sculpted Colt Receiver Frame (clean cylinder window: y = -0.0065..+0.070, z = -0.060..+0.030)
    # Lower frame plate (strictly below cylinder bottom y = -0.0045!)
    steel.add_beveled_box(0.0, -0.0115, -0.010, 0.035, 0.010, 0.124, bevel=0.0028)
    # Lower side frame bolsters aft of cylinder window (visible on left & right!)
    steel.add_beveled_box(0.0, 0.002, 0.036, 0.038, 0.028, 0.042, bevel=0.004)
    steel.add_beveled_box(0.0, 0.000, -0.066, 0.036, 0.024, 0.022, bevel=0.0035)

    # Top strap over cylinder with machined central sighting groove + rear V-notch sight
    steel.add_beveled_box(-0.0088, 0.0748, -0.013, 0.0105, 0.0088, 0.122, bevel=0.0020)
    steel.add_beveled_box(0.0088, 0.0748, -0.013, 0.0105, 0.0088, 0.122, bevel=0.0020)
    steel.add_beveled_box(0.0, 0.0718, -0.013, 0.0285, 0.0042, 0.122, bevel=0.0014)
    # Rear sight notch cheeks at back of top strap
    dark.add_beveled_box(-0.0075, 0.0795, 0.041, 0.008, 0.0065, 0.016, bevel=0.0015)
    dark.add_beveled_box(0.0075, 0.0795, 0.041, 0.008, 0.0065, 0.016, bevel=0.0015)

    # Front frame upright post
    steel.add_beveled_box(0.0, 0.033, -0.066, 0.037, 0.082, 0.014, bevel=0.0032)

    # Rear standing breech & iconic Colt hemispherical recoil shield (clean gap behind cylinder z=+0.0265!)
    steel.add_beveled_box(0.0, 0.032, 0.044, 0.041, 0.074, 0.024, bevel=0.0045)
    steel.add_ellipsoid(center=(0.0, 0.032, 0.039), radii=(0.0385, 0.0385, 0.0105), u_segs=24, v_segs=14)
    # Left-side sculpted Colt recoil bolster & right-side hinged loading gate (ladeport)
    steel.add_ellipsoid(center=(-0.019, 0.024, 0.039), radii=(0.011, 0.022, 0.016), u_segs=14, v_segs=8)
    dark.add_ellipsoid(center=(0.022, 0.028, 0.033), radii=(0.011, 0.024, 0.020), u_segs=14, v_segs=10)
    brass.add_ellipsoid(center=(0.030, 0.042, 0.032), radii=(0.0055, 0.0075, 0.0085), u_segs=10, v_segs=6)

    # Iconic 3 Colt frame action screws visible on both left (-X) and right (+X) sides
    for sz_s, sy_s in ((-0.024, -0.011), (0.006, -0.011), (0.036, 0.008)):
        brass.add_faceted_prism(
            sides=12, r_top=0.0044, r_bot=0.0044, length=0.041,
            center=(0.0, sy_s, sz_s), rot_euler=(0.0, 0.0, math.pi * 0.5),
        )

    # 1c. Swept Oval Brass Trigger Guard (avtrekkerbøyle) & Lower Brass Plate
    guard_loop = [
        (0.0, -0.014, -0.030),
        (0.0, -0.036, -0.022),
        (0.0, -0.050, 0.008),
        (0.0, -0.047, 0.038),
        (0.0, -0.020, 0.051),
    ]
    brass.add_tube(guard_loop, 0.0066, 0.0066, u_segs=14, samples_per_seg=6, scale_xy=(1.42, 0.72))
    brass.add_beveled_box(0.0, -0.0165, 0.010, 0.028, 0.006, 0.094, bevel=0.0018)

    # 1d. Ergonomic Contoured Plowhandle Walnut Grip (ergonomisk treskjefte) + Flush Brass Straps & Buttcap
    grip_ctrl = [
        (0.0, 0.016, 0.050),
        (0.0, -0.018, 0.068),
        (0.0, -0.062, 0.091),
        (0.0, -0.108, 0.115),
    ]
    grip_spine = catmull_rom_chain(grip_ctrl, samples_per_seg=8)

    def grip_dims(t):
        half_w = 0.0178 + 0.0048 * math.sin(t * math.pi) + 0.0058 * (t ** 1.55)
        half_d = 0.0235 + 0.0135 * (t ** 1.32)
        return half_w, half_d

    def grip_section(t, theta):
        half_w, half_d = grip_dims(t)
        ct, st = math.cos(theta), math.sin(theta)
        sx = math.copysign(abs(ct) ** 0.76, ct) * half_w
        sy = math.copysign(abs(st) ** 0.82, st) * half_d
        return (sx, sy)

    walnut.add_loft(grip_spine, grip_section, u_segs=28, cap_start=True, cap_end=True, up_hint=(0.0, 0.0, 1.0))

    # Compute exact backstrap (+up_vec) and frontstrap (-up_vec) paths along the lofted walnut grip!
    backstrap_pts = []
    frontstrap_pts = []
    n_gs = len(grip_spine)
    for idx_g in (0, n_gs // 3, (2 * n_gs) // 3, n_gs - 1):
        t_g = idx_g / (n_gs - 1)
        if idx_g == 0:
            tan_g = v_norm(v_sub(grip_spine[1], grip_spine[0]))
        elif idx_g == n_gs - 1:
            tan_g = v_norm(v_sub(grip_spine[-1], grip_spine[-2]))
        else:
            tan_g = v_norm(v_sub(grip_spine[idx_g + 1], grip_spine[idx_g - 1]))
        r_ax = v_norm(v_cross((0.0, 0.0, 1.0), tan_g))
        u_ax = v_norm(v_cross(tan_g, r_ax))
        _, hd = grip_dims(t_g)
        backstrap_pts.append(v_add(grip_spine[idx_g], (u_ax[0] * hd, u_ax[1] * hd, u_ax[2] * hd)))
        if idx_g > 0:
            frontstrap_pts.append(v_sub(grip_spine[idx_g], (u_ax[0] * hd, u_ax[1] * hd, u_ax[2] * hd)))

    brass.add_tube(backstrap_pts, 0.0068, 0.0080, u_segs=12, samples_per_seg=6, scale_xy=(1.55, 0.48))
    brass.add_tube(frontstrap_pts, 0.0064, 0.0076, u_segs=12, samples_per_seg=6, scale_xy=(1.55, 0.48))

    # Sculpted brass buttcap aligned perpendicular to grip spine (-0.48 rad) + lanyard loop & Colt medallions
    brass.add_beveled_box(0.0, -0.112, 0.117, 0.056, 0.015, 0.078, bevel=0.005, rot_euler=(-0.48, 0.0, 0.0))
    brass.add_faceted_prism(
        sides=10, r_top=0.0055, r_bot=0.0055, length=0.010,
        center=(0.0, -0.119, 0.121), rot_euler=(-0.48, 0.0, 0.0),
    )
    lanyard_pts = [
        (0.0, -0.127 + math.sin(a) * 0.0115, 0.125 + math.cos(a) * 0.0115)
        for a in [k * math.pi * 2.0 / 16 for k in range(17)]
    ]
    brass.add_tube(lanyard_pts, 0.0028, 0.0028, u_segs=8, samples_per_seg=2, cap_start=False, cap_end=False)

    # Recessed brass Colt grip medallions on both walnut grip cheeks
    for side in (-1, 1):
        brass.add_faceted_prism(
            sides=16, r_top=0.0082, r_bot=0.0082, length=0.0045,
            center=(side * 0.0235, -0.055, 0.088), rot_euler=(0.0, 0.0, math.pi * 0.5),
        )
        dark.add_faceted_prism(
            sides=12, r_top=0.0046, r_bot=0.0046, length=0.0055,
            center=(side * 0.0238, -0.055, 0.088), rot_euler=(0.0, 0.0, math.pi * 0.5),
        )

    frame_mesh_idx = b.add_mesh_from_parts("RevolverBodyMesh", parts.values())
    body_node_idx = b.add_node("Body", mesh_idx=frame_mesh_idx, parent_idx=root_idx)

    # 1e. Separate Child Node: 6-Shot Fluted Cylinder ("Cylinder", riflet tønne) at (0, 0.032, -0.016)
    cyl_parts, cyl_gp = b.create_parts_dict()
    c_steel = cyl_gp(mat_steel)
    c_dark = cyl_gp(mat_dark)
    c_brass = cyl_gp(mat_brass)
    c_copper = cyl_gp(mat_copper)
    c_bore = cyl_gp(mat_bore)

    cyl_len = 0.084  # spans z = -0.058..+0.026 around z = -0.016
    cyl_spine = [(0.0, 0.0, -cyl_len * 0.5 + (k / 18.0) * cyl_len) for k in range(19)]

    def fluted_cyl_sec(t, theta):
        base_r = 0.0362
        # 6 deep longitudinal scoop flutes along front/mid 74% of cylinder, smooth band at rear
        flute_mask = math.sin(min(1.0, t / 0.74) * math.pi) ** 0.85 if t < 0.74 else 0.0
        # Chambers sit at k*60 deg; flutes sit midway at k*60 + 30 deg (-cos(6*theta) == +1)
        flute_wave = max(0.0, -math.cos(theta * 6.0))
        r = base_r - 0.0068 * flute_mask * (flute_wave ** 1.18)
        # 6 machined bolt-stop notches in rear locking ring
        if 0.80 < t < 0.89:
            r -= 0.0022 * (max(0.0, math.cos(theta * 6.0)) ** 2.0)
        return (math.cos(theta) * r, math.sin(theta) * r)

    c_dark.add_loft(cyl_spine, fluted_cyl_sec, u_segs=72, cap_start=True, cap_end=True, up_hint=(0.0, 1.0, 0.0))

    # Decorative inlaid brass cylinder bands + rear steel ratchet star
    for z_ring in (-cyl_len * 0.475, cyl_len * 0.465):
        ring_loop = [
            (math.cos(a) * 0.0365, math.sin(a) * 0.0365, z_ring)
            for a in [k * math.pi * 2.0 / 36 for k in range(37)]
        ]
        c_brass.add_tube(ring_loop, 0.0017, 0.0017, u_segs=6, samples_per_seg=1, cap_start=False, cap_end=False)

    c_steel.add_faceted_prism(
        sides=12, r_top=0.0105, r_bot=0.0105, length=0.005,
        center=(0.0, 0.0, cyl_len * 0.5 + 0.0015), rot_euler=(-math.pi * 0.5, 0.0, 0.0),
    )

    # 6 Recessed Front Chambers w/ Copper Bullet Noses + 6 Rear Brass Cartridge Rims & Copper Primers
    for ch in range(6):
        ang = (ch / 6.0) * math.pi * 2.0
        cx_c = math.cos(ang) * 0.0215
        cy_c = math.sin(ang) * 0.0215
        c_bore.add_faceted_prism(
            sides=14, r_top=0.0084, r_bot=0.0084, length=0.006,
            center=(cx_c, cy_c, -cyl_len * 0.5 - 0.0008), rot_euler=(-math.pi * 0.5, 0.0, 0.0),
        )
        c_copper.add_ellipsoid(
            center=(cx_c, cy_c, -cyl_len * 0.5 + 0.0012),
            radii=(0.0068, 0.0068, 0.0105), u_segs=14, v_segs=8,
        )
        c_brass.add_faceted_prism(
            sides=14, r_top=0.0090, r_bot=0.0090, length=0.0038,
            center=(cx_c, cy_c, cyl_len * 0.5 + 0.0016), rot_euler=(-math.pi * 0.5, 0.0, 0.0),
        )
        c_copper.add_faceted_prism(
            sides=10, r_top=0.0036, r_bot=0.0036, length=0.0046,
            center=(cx_c, cy_c, cyl_len * 0.5 + 0.0020), rot_euler=(-math.pi * 0.5, 0.0, 0.0),
        )

    cyl_mesh_idx = b.add_mesh_from_parts("CylinderMesh", cyl_parts.values())
    b.add_node("Cylinder", translation=(0.0, 0.032, -0.016), mesh_idx=cyl_mesh_idx, parent_idx=body_node_idx)

    # 1f. Separate Child Node: Spurred S-Curved Colt Hammer ("Hammer") at (0, 0.034, 0.050)
    ham_parts, ham_gp = b.create_parts_dict()
    h_dark = ham_gp(mat_dark)
    h_steel = ham_gp(mat_steel)
    h_brass = ham_gp(mat_brass)
    h_steel.add_beveled_box(0.0, 0.018, -0.003, 0.0115, 0.036, 0.022, bevel=0.003, rot_euler=(-0.22, 0.0, 0.0))
    # Firing-pin cone nose
    h_dark.add_faceted_prism(
        sides=8, r_top=0.0022, r_bot=0.0045, length=0.011,
        center=(0.0, 0.028, -0.015), rot_euler=(-math.pi * 0.5, 0.0, 0.0),
    )
    # S-curved knurled thumb spur
    h_dark.add_tube(
        [(0.0, 0.031, 0.002), (0.0, 0.043, 0.016), (0.0, 0.046, 0.032), (0.0, 0.043, 0.041)],
        0.0056, 0.0042, u_segs=10, samples_per_seg=4, scale_xy=(1.35, 0.72),
    )
    h_brass.add_faceted_prism(
        sides=10, r_top=0.0040, r_bot=0.0040, length=0.014,
        center=(0.0, 0.0, 0.0), rot_euler=(0.0, 0.0, math.pi * 0.5),
    )
    ham_mesh_idx = b.add_mesh_from_parts("HammerMesh", ham_parts.values())
    b.add_node("Hammer", translation=(0.0, 0.034, 0.050), mesh_idx=ham_mesh_idx, parent_idx=body_node_idx)

    # 1g. Separate Child Node: Curved Trigger ("Trigger") at (0, -0.008, 0.016)
    trig_parts, trig_gp = b.create_parts_dict()
    trig_gp(mat_dark).add_tube(
        [(0.0, 0.0, 0.0), (0.0, -0.016, 0.0045), (0.0, -0.031, -0.0055)],
        0.0044, 0.0028, u_segs=10, samples_per_seg=4, scale_xy=(1.15, 0.85),
    )
    trig_mesh_idx = b.add_mesh_from_parts("TriggerMesh", trig_parts.values())
    b.add_node("Trigger", translation=(0.0, -0.008, 0.016), mesh_idx=trig_mesh_idx, parent_idx=body_node_idx)

    # 1h. Exact MuzzlePoint empty node at (0, 0.032, -0.300)
    b.add_node("MuzzlePoint", translation=(0.0, 0.032, -0.300), parent_idx=body_node_idx)

    return b.export_glb(out_path)


# ---------------------------------------------------------------------------
# 2. assets/saloon.glb — Grand Western Saloon Building
# ---------------------------------------------------------------------------

def build_saloon_glb(out_path):
    b = GLBBuilder()

    mat_siding = b.add_material("WeatheredSiding", (0.72, 0.46, 0.27), metallic=0.02, roughness=0.84)
    mat_pine = b.add_material("WarmPine", (0.82, 0.57, 0.34), metallic=0.03, roughness=0.78)
    mat_dark = b.add_material("DarkTimber", (0.38, 0.22, 0.11), metallic=0.04, roughness=0.82)
    mat_roof = b.add_material("CedarShingles", (0.39, 0.23, 0.13), metallic=0.03, roughness=0.88)
    mat_shutter = b.add_material("PaintedShutters", (0.27, 0.37, 0.26), metallic=0.03, roughness=0.80)
    mat_stone = b.add_material("StoneFoundation", (0.58, 0.49, 0.41), metallic=0.02, roughness=0.92)
    mat_iron = b.add_material("WroughtIron", (0.18, 0.20, 0.23), metallic=0.86, roughness=0.34)
    mat_brass = b.add_material("PolishedBrass", (0.89, 0.71, 0.34), metallic=0.90, roughness=0.22)
    mat_glass = b.add_material("WindowGlass", (0.32, 0.40, 0.46), metallic=0.24, roughness=0.10, emissive=(0.18, 0.11, 0.04))
    mat_interior = b.add_material("DarkInterior", (0.07, 0.04, 0.02), metallic=0.0, roughness=0.98)
    mat_brick = b.add_material("ChimneyBrick", (0.56, 0.25, 0.17), metallic=0.02, roughness=0.90)

    root = b.add_node("SaloonRoot")
    parts, gp = b.create_parts_dict()

    siding = gp(mat_siding)
    pine = gp(mat_pine)
    dark = gp(mat_dark)
    roof = gp(mat_roof)
    stone = gp(mat_stone)
    iron = gp(mat_iron)
    brass = gp(mat_brass)
    interior = gp(mat_interior)
    brick = gp(mat_brick)

    # 2a. Grounded Stone Foundation Piers (y = 0.0..0.18), Foundation Skirt, Veranda & Interior Floor + 3-Step Stairs
    for sx in (-3.06, -1.52, 0.0, 1.52, 3.06):
        for sz in (-2.26, -0.20, 1.86, 3.36):
            stone.add_beveled_box(sx, 0.09, sz, 0.44, 0.18, 0.44, bevel=0.024)
    # Recessed stone foundation plinth under main cabin so zero daylight leaks underneath
    stone.add_beveled_box(0.0, 0.08, -0.20, 6.12, 0.16, 4.18, bevel=0.02)

    dark.add_beveled_box(0.0, 0.12, 0.56, 6.64, 0.18, 5.92, bevel=0.02, uv_scale=0.65)
    # Alternating beveled wooden floorboards from rear interior (-2.12) across front veranda (3.46), top at y = 0.238
    pz = -2.10
    idx_p = 0
    while pz <= 3.46:
        part_use = pine if (idx_p % 2 == 0) else siding
        plank_w = 5.92 if pz < 1.90 else 6.58
        part_use.add_beveled_box(0.0, 0.222, pz, plank_w, 0.032, 0.236, bevel=0.006, uv_scale=0.65)
        pz += 0.248
        idx_p += 1

    # Wide 3-step entrance staircase (trappetrinn, z = 3.50..4.28, grounded at y = 0.0) with risers & stringers
    pine.add_beveled_box(0.0, 0.165, 3.64, 2.48, 0.09, 0.30, bevel=0.012)
    dark.add_beveled_box(0.0, 0.085, 3.62, 2.44, 0.09, 0.24, bevel=0.008)
    siding.add_beveled_box(0.0, 0.105, 3.90, 2.58, 0.085, 0.30, bevel=0.012)
    dark.add_beveled_box(0.0, 0.042, 3.88, 2.54, 0.084, 0.24, bevel=0.008)
    pine.add_beveled_box(0.0, 0.044, 4.16, 2.68, 0.088, 0.30, bevel=0.012)
    for stx in (-1.35, 1.35):
        dark.add_beveled_box(stx, 0.150, 3.82, 0.095, 0.12, 0.72, bevel=0.010, rot_euler=(0.22, 0.0, 0.0))
        stone.add_beveled_box(stx, 0.04, 4.22, 0.18, 0.08, 0.18, bevel=0.012)

    # 2b. Main Cabin Walls With Wide Walk-Through Doorway (x = -1.00..+1.00, 2.00m >= 1.8m!) + Clapboard Siding
    siding.add_beveled_box(-2.06, 2.34, 1.84, 2.08, 4.24, 0.22, bevel=0.015, uv_scale=0.6)
    siding.add_beveled_box(2.06, 2.34, 1.84, 2.08, 4.24, 0.22, bevel=0.015, uv_scale=0.6)
    siding.add_beveled_box(0.0, 3.56, 1.84, 2.06, 1.80, 0.22, bevel=0.015, uv_scale=0.6)
    # Rear & side structural walls + interior ceiling
    siding.add_beveled_box(0.0, 2.34, -2.26, 6.20, 4.24, 0.22, bevel=0.015, uv_scale=0.6)
    siding.add_beveled_box(-3.04, 2.34, -0.21, 0.22, 4.24, 4.16, bevel=0.015, uv_scale=0.6)
    siding.add_beveled_box(3.04, 2.34, -0.21, 0.22, 4.24, 4.16, bevel=0.015, uv_scale=0.6)
    dark.add_beveled_box(0.0, 4.34, -0.21, 6.08, 0.14, 4.12, bevel=0.014, uv_scale=0.65)

    # Horizontal beveled clapboard courses on front, left, right & rear walls
    add_clapboard_wall_x(pine, -2.06, 0.28, 3.16, 1.94, 1.96, normal_sign_z=1.0, plank_h=0.23)
    add_clapboard_wall_x(pine, 2.06, 0.28, 3.16, 1.94, 1.96, normal_sign_z=1.0, plank_h=0.23)
    add_clapboard_wall_x(pine, 0.0, 0.28, 4.32, -2.36, 5.92, normal_sign_z=-1.0, plank_h=0.24)
    add_clapboard_wall_z(pine, -3.14, 0.28, 4.32, -0.21, 3.92, normal_sign_x=-1.0, plank_h=0.24)
    add_clapboard_wall_z(pine, 3.14, 0.28, 4.32, -0.21, 3.92, normal_sign_x=1.0, plank_h=0.24)

    # Interior Saloon Bar Counter & Back-Bar Shelves (walkable interior room z = -1.05..+1.84)
    dark.add_beveled_box(0.0, 0.70, -1.46, 4.18, 0.94, 0.64, bevel=0.016, uv_scale=0.65)
    pine.add_beveled_box(0.0, 1.20, -1.44, 4.36, 0.10, 0.78, bevel=0.014, uv_scale=0.7)
    for bpx in (-1.38, 0.0, 1.38):
        pine.add_beveled_box(bpx, 0.70, -1.12, 1.08, 0.62, 0.04, bevel=0.008)
    brass.add_tube([(-2.05, 0.34, -1.02), (2.05, 0.34, -1.02)], 0.022, 0.022, u_segs=10, samples_per_seg=2)
    for bsy in (1.42, 1.96):
        dark.add_beveled_box(0.0, bsy, -2.02, 3.80, 0.06, 0.28, bevel=0.008)
    for btx in (-1.35, -0.75, -0.15, 0.45, 1.15):
        (brass if abs(btx) > 0.6 else gp(mat_shutter)).add_lathe(
            [(0.045, 0.0), (0.048, 0.16), (0.020, 0.22), (0.022, 0.29)],
            u_segs=10, translate=(btx, 1.45, -2.00),
        )

    # Corner pilaster posts + wainscot dado & upper frieze belt moldings
    for cx_p, cz_p in ((-3.08, -2.28), (3.08, -2.28), (-3.08, 1.88), (3.08, 1.88)):
        dark.add_beveled_box(cx_p, 2.36, cz_p, 0.25, 4.30, 0.25, bevel=0.018)
    dark.add_beveled_box(0.0, 4.44, -0.20, 6.44, 0.16, 4.44, bevel=0.018)

    # 2c. True Pitched Shingled Gable Roof (saltak) + Watertight Gable Pediments + Brick Chimney
    # Strictly behind false-front parapet back face (z = 1.78) so nothing pokes through SALOON sign!
    slope_angle = 0.36  # ~20.6 degrees pitch
    slope_span = 3.56
    for side in (-1, 1):
        roof.add_beveled_box(
            side * 1.63, 5.02, -0.40,
            slope_span, 0.18, 4.32,
            bevel=0.018, rot_euler=(0.0, 0.0, -side * slope_angle), uv_scale=0.65,
        )
        # Overlapping cedar shingle battens along each slope (z_max = 1.77 <= 1.78)
        for r_step in range(6):
            frac = (r_step + 0.5) / 6.0
            rx = side * (0.30 + frac * 2.68)
            ry = 5.58 - frac * 1.01
            dark.add_beveled_box(
                rx, ry, -0.40, 0.085, 0.042, 4.34,
                bevel=0.006, rot_euler=(0.0, 0.0, -side * slope_angle),
            )
        # Exposed eave rafter tails along left & right roof overhangs
        rz_t = -2.15
        while rz_t <= 1.65:
            dark.add_beveled_box(side * 3.24, 4.38, rz_t, 0.32, 0.08, 0.08, bevel=0.008, rot_euler=(0.0, 0.0, -side * slope_angle))
            rz_t += 0.62

    # Watertight 3D gable pediment walls at rear (-Z) and tucked behind front false-front (z_max = 1.76)
    add_gable_pediment_wall(siding, 0.0, 4.46, 5.64, -2.26, 6.24, 0.20)
    add_gable_clapboards(pine, 0.0, 4.50, 5.56, -2.36, 6.12, normal_sign_z=-1.0, plank_h=0.20)
    add_gable_pediment_wall(siding, 0.0, 4.46, 5.64, 1.68, 6.24, 0.16)
    dark.add_beveled_box(0.0, 5.64, -0.40, 0.22, 0.20, 4.34, bevel=0.02)

    # Corbeled red-brick stove chimney on rear-left roof slope
    brick.add_beveled_box(-1.85, 5.66, -1.35, 0.56, 1.38, 0.56, bevel=0.02, uv_scale=0.8)
    brick.add_beveled_box(-1.85, 6.26, -1.35, 0.64, 0.10, 0.64, bevel=0.014)
    stone.add_beveled_box(-1.85, 6.38, -1.35, 0.70, 0.11, 0.70, bevel=0.016)
    iron.add_faceted_prism(sides=12, r_top=0.12, r_bot=0.12, length=0.26, center=(-1.85, 6.56, -1.35))

    # 2d. Grand Stepped Boomtown False-Front Facade (frontfasade, flat sign zone at y=5.18, z=2.00)
    pine.add_beveled_box(0.0, 5.18, 1.89, 6.46, 1.64, 0.22, bevel=0.018, uv_scale=0.65)
    add_clapboard_wall_x(siding, 0.0, 3.54, 4.42, 1.94, 6.12, normal_sign_z=1.0, plank_h=0.21)

    # Side recessed pilaster strips & scroll wings flanking the SALOON sign (x = -2.2..+2.2)
    for sx_f in (-3.08, 3.08):
        dark.add_beveled_box(sx_f, 5.18, 1.96, 0.24, 1.62, 0.18, bevel=0.014)
    for side in (-1, 1):
        # Decorative side scroll brackets flanking the center crown pediment
        dark.add_tube(
            [
                (side * 3.05, 6.10, 1.94),
                (side * 2.55, 6.18, 1.94),
                (side * 2.05, 6.36, 1.94),
                (side * 1.76, 6.46, 1.94),
            ],
            0.052, 0.044, u_segs=10, samples_per_seg=5, scale_xy=(0.9, 1.2),
        )

    # Stepped center crown pediment + projecting upper cornices
    pine.add_beveled_box(0.0, 6.20, 1.90, 3.52, 0.50, 0.24, bevel=0.016)
    dark.add_beveled_box(0.0, 6.02, 1.94, 6.78, 0.18, 0.44, bevel=0.02)
    dark.add_beveled_box(0.0, 6.48, 1.95, 3.82, 0.18, 0.44, bevel=0.02)

    # Dentil corbels along upper cornice (at y = 5.86 so SALOON sign up to y = 5.755 has clean clearance)
    cx_c = -2.94
    while cx_c <= 2.95:
        dark.add_beveled_box(cx_c, 5.86, 2.02, 0.11, 0.15, 0.22, bevel=0.01)
        cx_c += 0.49

    # 5 Lathe-turned Victorian finials crowning the false-front
    for fx, fy in ((-3.24, 6.11), (3.24, 6.11), (-1.80, 6.57), (1.80, 6.57), (0.0, 6.57)):
        dark.add_lathe(
            [
                (0.012, 0.00),
                (0.088, 0.04),
                (0.052, 0.12),
                (0.098, 0.22),
                (0.036, 0.34),
                (0.006, 0.43),
            ],
            u_segs=16, translate=(fx, fy, 1.94),
        )
    # Wrought-iron sign hanger straps (strictly above SALOON sign top y=5.755)
    for sx_s in (-1.85, 1.85):
        iron.add_beveled_box(sx_s, 5.88, 2.02, 0.042, 0.22, 0.042, bevel=0.005)

    # 2e. Porch Roof, Exposed Rafters, 4 Turned Victorian Columns & Left Balustrade
    roof.add_beveled_box(0.0, 3.30, 2.72, 6.78, 0.16, 1.94, bevel=0.016, rot_euler=(0.07, 0.0, 0.0), uv_scale=0.65)
    dark.add_beveled_box(0.0, 3.16, 3.38, 6.66, 0.16, 0.18, bevel=0.014)
    rx = -3.00
    while rx <= 3.01:
        dark.add_beveled_box(rx, 3.18, 2.68, 0.09, 0.11, 1.90, bevel=0.008, rot_euler=(0.07, 0.0, 0.0))
        rx += 0.75

    for px in (-2.92, -1.14, 1.14, 2.92):
        add_turned_western_column(gp, mat_dark, mat_pine, px, 0.22, 3.10, 3.38, radius=0.096)
        for d_s in (-1, 1):
            if (px < -2.5 and d_s < 0) or (px > 2.5 and d_s > 0):
                continue
            add_scroll_bracket(gp, mat_pine, mat_dark, px, 3.08, 3.38, dir_x=d_s, span=0.42)

    # Wrought-iron hanger rods supporting the clickable LANGUAGE sign at (-2.0, 2.58, 3.45)
    for hx_l in (-2.48, -1.52):
        iron.add_beveled_box(hx_l, 2.93, 3.44, 0.026, 0.34, 0.026, bevel=0.004)

    # Left veranda balustrade (-2.92..-1.14) with molded rails & lathe-turned spindles
    pine.add_beveled_box(-2.03, 0.98, 3.38, 1.72, 0.082, 0.105, bevel=0.010)
    pine.add_beveled_box(-2.03, 0.32, 3.38, 1.72, 0.062, 0.092, bevel=0.008)
    bx = -2.68
    while bx <= -1.36:
        dark.add_lathe(
            [(0.024, 0.0), (0.036, 0.14), (0.020, 0.31), (0.038, 0.47), (0.024, 0.62)],
            u_segs=12, translate=(bx, 0.35, 3.38),
        )
        bx += 0.22

    # 2f. Wide Walk-Through Center Doorway (2.00m >= 1.8m!) + Open Swung Carved Arched Batwing Doors
    dark.add_beveled_box(0.0, 2.66, 1.95, 2.28, 0.15, 0.18, bevel=0.014)
    for jx in (-1.05, 1.05):
        dark.add_beveled_box(jx, 1.44, 1.90, 0.12, 2.44, 0.26, bevel=0.012)

    for side, yaw_door in ((-1, 1.44), (1, -1.44)):
        hx_d = side * 0.97
        inward_sign = -side
        cy_d, sy_d = math.cos(yaw_door), math.sin(yaw_door)

        def dp(ox, oy, oz):
            return (hx_d + ox * cy_d + oz * sy_d, 1.38 + oy, 1.90 - ox * sy_d + oz * cy_d)

        w_d = 0.68
        mid_x = inward_sign * (w_d * 0.5)
        dark.add_beveled_box(*dp(inward_sign * 0.034, 0.0, 0.0), 0.068, 1.32, 0.052, bevel=0.008, rot_euler=(0.0, yaw_door, 0.0))
        dark.add_beveled_box(*dp(inward_sign * (w_d - 0.032), -0.08, 0.0), 0.062, 1.14, 0.052, bevel=0.008, rot_euler=(0.0, yaw_door, 0.0))
        dark.add_beveled_box(*dp(mid_x, -0.57, 0.0), w_d, 0.16, 0.050, bevel=0.008, rot_euler=(0.0, yaw_door, 0.0))
        dark.add_beveled_box(*dp(mid_x, -0.34, 0.0), w_d - 0.11, 0.26, 0.032, bevel=0.006, rot_euler=(0.0, yaw_door, 0.0))
        pine.add_beveled_box(*dp(mid_x, -0.34, 0.0), w_d - 0.20, 0.16, 0.042, bevel=0.005, rot_euler=(0.0, yaw_door, 0.0))
        dark.add_beveled_box(*dp(mid_x, -0.14, 0.0), w_d, 0.085, 0.050, bevel=0.008, rot_euler=(0.0, yaw_door, 0.0))

        # Carved S-curved batwing top arch rail + spindle crest
        arch_pts = [
            dp(inward_sign * 0.03, 0.62, 0.0),
            dp(inward_sign * (w_d * 0.36), 0.67, 0.0),
            dp(inward_sign * (w_d * 0.72), 0.53, 0.0),
            dp(inward_sign * (w_d - 0.03), 0.46, 0.0),
        ]
        dark.add_tube(arch_pts, 0.032, 0.030, u_segs=10, samples_per_seg=5)

        ly_d = -0.02
        while ly_d <= 0.40:
            pine.add_beveled_box(*dp(mid_x, ly_d, 0.0), w_d - 0.12, 0.044, 0.024, bevel=0.004, rot_euler=(0.36, yaw_door, 0.0))
            ly_d += 0.095

        brass.add_faceted_prism(
            sides=14, r_top=0.058, r_bot=0.058, length=0.058,
            center=dp(mid_x, -0.14, 0.0), rot_euler=(-math.pi * 0.5, yaw_door, 0.0),
        )
        for hy_h in (-0.48, 0.48):
            brass.add_faceted_prism(sides=10, r_top=0.024, r_bot=0.024, length=0.12, center=dp(0.0, hy_h, 0.0))

    # 2g. Front, Transom & Side Windows (WindowGlass) with Angled Louvered Shutters + Props
    for wx in (-2.14, 2.14):
        add_shuttered_window(gp, mat_dark, mat_shutter, mat_glass, mat_iron, wx, 1.86, 1.94, 0.80, 1.18, rot_y=0.0)
    add_shuttered_window(gp, mat_dark, mat_shutter, mat_glass, mat_iron, 0.0, 2.98, 1.94, 1.72, 0.36, rot_y=0.0, with_shutters=False)
    for wz_s in (-1.06, 0.58):
        add_shuttered_window(gp, mat_dark, mat_shutter, mat_glass, mat_iron, -3.15, 2.08, wz_s, 0.90, 1.14, rot_y=-math.pi * 0.5)
        add_shuttered_window(gp, mat_dark, mat_shutter, mat_glass, mat_iron, 3.15, 2.08, wz_s, 0.90, 1.14, rot_y=math.pi * 0.5)

    # Coopered whiskey barrels & leaning 12-spoke wagon wheel on left veranda
    add_oak_barrel(gp, mat_pine, mat_dark, mat_iron, -2.54, 0.238, 2.74, scale=1.0)
    add_oak_barrel(gp, mat_siding, mat_dark, mat_iron, -1.90, 0.238, 2.82, scale=0.88)
    add_wagon_wheel(gp, mat_pine, mat_dark, mat_iron, -3.22, 0.72, 2.82, rot_euler=(0.18, math.pi * 0.5 - 0.14, 0.0), radius=0.52)

    mesh_idx = b.add_mesh_from_parts("SaloonMesh", parts.values())
    b.add_node("SaloonArchitecture", mesh_idx=mesh_idx, parent_idx=root)
    return b.export_glb(out_path)


# ---------------------------------------------------------------------------
# 3. assets/tailor.glb — Detailed Western Tailor Shop & Haberdashery
# ---------------------------------------------------------------------------

def build_tailor_glb(out_path):
    b = GLBBuilder()

    mat_siding = b.add_material("WeatheredSiding", (0.76, 0.52, 0.32), metallic=0.02, roughness=0.82)
    mat_pine = b.add_material("WarmPine", (0.85, 0.62, 0.39), metallic=0.03, roughness=0.76)
    mat_dark = b.add_material("DarkTimber", (0.36, 0.21, 0.11), metallic=0.04, roughness=0.80)
    mat_counter = b.add_material("PolishedCounterWood", (0.40, 0.21, 0.09), metallic=0.06, roughness=0.28)
    mat_roof = b.add_material("CedarShingles", (0.42, 0.25, 0.14), metallic=0.03, roughness=0.86)
    mat_shutter = b.add_material("PaintedShutters", (0.24, 0.38, 0.34), metallic=0.03, roughness=0.78)
    mat_stone = b.add_material("StoneFoundation", (0.58, 0.50, 0.42), metallic=0.02, roughness=0.92)
    mat_iron = b.add_material("WroughtIron", (0.18, 0.20, 0.23), metallic=0.86, roughness=0.34)
    mat_brass = b.add_material("PolishedBrass", (0.90, 0.72, 0.35), metallic=0.90, roughness=0.20)
    mat_glass = b.add_material("WindowGlass", (0.32, 0.40, 0.46), metallic=0.24, roughness=0.10, emissive=(0.18, 0.11, 0.04))
    mat_cloth_red = b.add_material("CrimsonCloth", (0.64, 0.15, 0.14), metallic=0.02, roughness=0.82)
    mat_cloth_blue = b.add_material("IndigoCloth", (0.16, 0.32, 0.50), metallic=0.02, roughness=0.82)
    mat_buckskin = b.add_material("BuckskinLeather", (0.76, 0.54, 0.29), metallic=0.03, roughness=0.74)

    root = b.add_node("TailorShopRoot")
    parts, gp = b.create_parts_dict()

    siding = gp(mat_siding)
    pine = gp(mat_pine)
    dark = gp(mat_dark)
    counter_top = gp(mat_counter)
    roof = gp(mat_roof)
    stone = gp(mat_stone)
    iron = gp(mat_iron)
    brass = gp(mat_brass)
    cloth_r = gp(mat_cloth_red)
    cloth_b = gp(mat_cloth_blue)
    buck = gp(mat_buckskin)

    # 3a. Stone Foundation Piers (y = 0.0..0.18), Foundation Skirt, Planked Floor & Wide 2-Step Stairs
    for sx in (-2.75, -1.35, 0.0, 1.35, 2.75):
        for sz in (-1.95, 0.50, 2.95):
            stone.add_beveled_box(sx, 0.09, sz, 0.42, 0.18, 0.42, bevel=0.022)
    stone.add_beveled_box(0.0, 0.08, 0.42, 5.44, 0.16, 4.92, bevel=0.02)

    dark.add_beveled_box(0.0, 0.115, 0.44, 5.84, 0.19, 5.44, bevel=0.02, uv_scale=0.65)
    # Individual beveled floorboards with top surface at y = 0.22 (matches tailor_npc.glb at y = 0.22!)
    pz = -1.80
    idx = 0
    while pz <= 3.05:
        (pine if idx % 2 == 0 else siding).add_beveled_box(0.0, 0.207, pz, 5.76, 0.026, 0.262, bevel=0.005, uv_scale=0.65)
        pz += 0.28
        idx += 1

    # Wide 2-step front entrance stairs (z = 3.12..3.68, grounded cleanly at y = 0.0)
    pine.add_beveled_box(0.0, 0.145, 3.28, 3.80, 0.09, 0.32, bevel=0.012)
    dark.add_beveled_box(0.0, 0.072, 3.25, 3.74, 0.09, 0.24, bevel=0.008)
    siding.add_beveled_box(0.0, 0.050, 3.56, 3.92, 0.10, 0.32, bevel=0.012)
    for stx in (-1.98, 1.98):
        dark.add_beveled_box(stx, 0.128, 3.36, 0.095, 0.115, 0.52, bevel=0.010, rot_euler=(0.22, 0.0, 0.0))
        stone.add_beveled_box(stx, 0.04, 3.64, 0.18, 0.08, 0.18, bevel=0.012)

    # 3b. Back & Side Clapboard Walls (open front so player walks right up to counter & clicks board!)
    pine.add_beveled_box(0.0, 2.04, -1.92, 5.48, 3.68, 0.24, bevel=0.016, uv_scale=0.6)
    add_clapboard_wall_x(siding, 0.0, 0.28, 3.76, -2.04, 5.38, normal_sign_z=-1.0, plank_h=0.23)
    # Interior wainscot dado rail along back & side walls
    dark.add_beveled_box(0.0, 1.08, -1.78, 5.10, 0.08, 0.06, bevel=0.008)

    for side in (-1, 1):
        wx = side * 2.58
        siding.add_beveled_box(wx, 2.04, 0.05, 0.24, 3.68, 4.14, bevel=0.016, uv_scale=0.6)
        add_clapboard_wall_z(pine, wx + side * 0.12, 0.28, 3.76, 0.05, 3.92, normal_sign_x=side, plank_h=0.23)
        dark.add_beveled_box(wx, 2.05, -1.96, 0.26, 3.74, 0.26, bevel=0.018)
        dark.add_beveled_box(wx, 2.05, 2.08, 0.26, 3.74, 0.26, bevel=0.018)
        dark.add_beveled_box(wx - side * 0.13, 1.08, 0.05, 0.06, 0.08, 3.88, bevel=0.008)

        # 2 Shuttered windows per side wall (4 total) for balanced warm interior light day & night
        for wz_w in (-0.86, 0.96):
            add_shuttered_window(
                gp, mat_dark, mat_shutter, mat_glass, mat_iron,
                wx + side * 0.13, 2.08, wz_w, 0.86, 1.08, rot_y=side * math.pi * 0.5,
            )

    # 3c. Exposed Ceiling Beams + True Pitched Shingled Gable Roof (saltak)
    # Tucked strictly behind Tailor false-front parapet back face (z = 2.72)
    roof.add_beveled_box(0.0, 3.92, 0.36, 5.96, 0.18, 5.10, bevel=0.016, uv_scale=0.65)
    bx = -2.20
    while bx <= 2.21:
        dark.add_beveled_box(bx, 3.76, 0.36, 0.115, 0.135, 4.96, bevel=0.010)
        bx += 1.10

    slope_ang = 0.35
    for side in (-1, 1):
        roof.add_beveled_box(
            side * 1.49, 4.42, 0.22,
            3.26, 0.17, 4.94, bevel=0.016, rot_euler=(0.0, 0.0, -side * slope_ang), uv_scale=0.65,
        )
        for r_step in range(5):
            frac = (r_step + 0.5) / 5.0
            dark.add_beveled_box(
                side * (0.30 + frac * 2.34), 4.94 - frac * 0.88, 0.22,
                0.082, 0.040, 4.96, bevel=0.005, rot_euler=(0.0, 0.0, -side * slope_ang),
            )
        rz_t = -1.90
        while rz_t <= 2.55:
            dark.add_beveled_box(side * 2.98, 3.86, rz_t, 0.28, 0.075, 0.075, bevel=0.007, rot_euler=(0.0, 0.0, -side * slope_ang))
            rz_t += 0.62

    # Watertight 3D gable pediment walls at rear (-Z) and tucked behind front false-front (z_max = 2.70)
    add_gable_pediment_wall(siding, 0.0, 3.96, 5.04, -1.96, 5.68, 0.20)
    add_gable_clapboards(pine, 0.0, 4.00, 4.96, -2.06, 5.56, normal_sign_z=-1.0, plank_h=0.19)
    add_gable_pediment_wall(siding, 0.0, 3.96, 5.04, 2.62, 5.68, 0.16)
    dark.add_beveled_box(0.0, 5.04, 0.22, 0.20, 0.18, 4.96, bevel=0.016)

    # 3d. Ornate Storefront Turned Columns & Stepped False-Front Facade (TAILOR sign zone at y=4.74, z=3.03)
    for side in (-1, 1):
        px = side * 2.58
        add_turned_western_column(gp, mat_dark, mat_pine, px, 0.22, 3.82, 2.85, radius=0.112)
        add_scroll_bracket(gp, mat_pine, mat_dark, px, 3.78, 2.85, dir_x=-side, span=0.54)

    dark.add_beveled_box(0.0, 3.82, 2.85, 5.90, 0.18, 0.25, bevel=0.014)

    # False-front parapet (flat sign zone at y=4.74, front z=2.96 behind TAILOR sign at z=3.03)
    siding.add_beveled_box(0.0, 4.74, 2.84, 5.90, 1.54, 0.24, bevel=0.018, uv_scale=0.65)
    for sx_f in (-2.82, 2.82):
        dark.add_beveled_box(sx_f, 4.74, 2.91, 0.22, 1.52, 0.16, bevel=0.012)
    for side in (-1, 1):
        dark.add_tube(
            [
                (side * 2.80, 5.62, 2.88),
                (side * 2.28, 5.70, 2.88),
                (side * 1.82, 5.82, 2.88),
                (side * 1.56, 5.90, 2.88),
            ],
            0.048, 0.040, u_segs=10, samples_per_seg=5, scale_xy=(0.9, 1.2),
        )

    pine.add_beveled_box(0.0, 5.68, 2.85, 3.12, 0.40, 0.24, bevel=0.016)
    dark.add_beveled_box(0.0, 5.56, 2.88, 6.22, 0.18, 0.44, bevel=0.018)
    dark.add_beveled_box(0.0, 5.92, 2.89, 3.42, 0.16, 0.42, bevel=0.018)

    # Dentil corbels at y = 5.42 (clean clearance above TAILOR sign top y = 5.29) + iron straps & 5 finials
    cx_t = -2.60
    while cx_t <= 2.61:
        dark.add_beveled_box(cx_t, 5.42, 2.98, 0.10, 0.14, 0.20, bevel=0.01)
        cx_t += 0.52
    for sx_s in (-1.75, 1.75):
        iron.add_beveled_box(sx_s, 5.42, 2.98, 0.04, 0.22, 0.04, bevel=0.005)
    for fx, fy in ((-2.94, 5.66), (2.94, 5.66), (-1.58, 6.00), (1.58, 6.00), (0.0, 6.00)):
        dark.add_lathe(
            [(0.012, 0.0), (0.082, 0.04), (0.050, 0.12), (0.088, 0.20), (0.032, 0.30), (0.006, 0.38)],
            u_segs=16, translate=(fx, fy, 2.88),
        )

    # 3e. Paneled Tailor Shop Counter (y = 0.22..1.26, z = 1.25) + Rolled Cloth Bolts
    siding.add_beveled_box(0.0, 0.72, 1.25, 3.34, 1.00, 0.78, bevel=0.016, uv_scale=0.65)
    dark.add_beveled_box(0.0, 0.27, 1.27, 3.44, 0.10, 0.84, bevel=0.010)
    for px in (-1.06, 0.0, 1.06):
        dark.add_beveled_box(px, 0.74, 1.65, 0.86, 0.68, 0.045, bevel=0.008)
        pine.add_beveled_box(px, 0.74, 1.675, 0.68, 0.50, 0.025, bevel=0.005)
    for bx_c in (-1.62, -0.53, 0.53, 1.62):
        dark.add_beveled_box(bx_c, 0.74, 1.65, 0.10, 0.96, 0.06, bevel=0.008)

    counter_top.add_beveled_box(0.0, 1.26, 1.25, 3.58, 0.12, 0.96, bevel=0.016, uv_scale=0.7)
    for sx_b in (-1.74, 1.74):
        for sz_b in (0.82, 1.68):
            brass.add_beveled_box(sx_b, 1.265, sz_b, 0.10, 0.13, 0.10, bevel=0.008)

    # Rolled bolts of cloth placed on center-right so Tailor NPC at x=-1.12 has an unobstructed counter!
    for rx_b, yaw_b, part_cl in ((-0.12, 0.05, cloth_r), (0.36, -0.06, cloth_b), (1.14, 0.08, buck)):
        part_cl.add_tube(
            [(rx_b - 0.28, 1.425, 1.26), (rx_b + 0.28, 1.425, 1.26)],
            0.105, 0.105, u_segs=18, samples_per_seg=2, rot_euler=(0.0, yaw_b, 0.0),
        )
        pine.add_tube(
            [(rx_b - 0.33, 1.425, 1.26), (rx_b + 0.33, 1.425, 1.26)],
            0.028, 0.028, u_segs=10, samples_per_seg=2, rot_euler=(0.0, yaw_b, 0.0),
        )
    # Stacked upper bolt of crimson cloth on far right of counter
    cloth_r.add_tube([(0.88, 1.61, 1.25), (1.40, 1.61, 1.25)], 0.095, 0.095, u_segs=16, samples_per_seg=2)

    # Low back-wall haberdashery shelving (strictly below y = 1.80 so WORKSHOP board at y=1.92..3.64 is clear!)
    for sy_sh in (0.76, 1.32, 1.76):
        dark.add_beveled_box(0.0, sy_sh, -1.66, 3.80, 0.055, 0.34, bevel=0.008)
    for sx_post in (-1.86, -0.62, 0.62, 1.86):
        dark.add_beveled_box(sx_post, 0.99, -1.66, 0.075, 1.54, 0.34, bevel=0.008)
    # Fabric bolts & brass thread spools on back-wall shelves
    for bx_s, by_s, cl_s in ((-1.24, 0.90, cloth_b), (0.0, 0.90, buck), (1.24, 0.90, cloth_r), (-1.24, 1.46, cloth_r), (1.24, 1.46, cloth_b)):
        cl_s.add_tube([(bx_s - 0.24, by_s, -1.64), (bx_s + 0.24, by_s, -1.64)], 0.092, 0.092, u_segs=14, samples_per_seg=2)
    for sp_x in (-0.30, -0.10, 0.10, 0.30):
        brass.add_lathe(
            [(0.042, 0.0), (0.042, 0.018), (0.028, 0.024), (0.028, 0.106), (0.042, 0.112), (0.042, 0.130)],
            u_segs=12, translate=(sp_x, 1.35, -1.62),
        )

    # 3f. Tailor's Dressmaker Mannequin on Turned Stand + Turned Hat Rack w/ Stetson + Barrel & Wheel
    # Dress form on right side (x = 2.04, z = 0.26)
    dark.add_lathe(
        [(0.23, 0.00), (0.19, 0.05), (0.055, 0.13), (0.036, 0.84), (0.048, 0.90), (0.032, 0.95)],
        u_segs=16, translate=(2.04, 0.22, 0.26),
    )
    mannequin_prof = [
        (0.025, 0.00),
        (0.195, 0.04),
        (0.145, 0.22),
        (0.205, 0.43),
        (0.165, 0.57),
        (0.074, 0.63),
        (0.066, 0.71),
        (0.012, 0.73),
    ]
    buck.add_lathe(mannequin_prof, u_segs=20, translate=(2.04, 1.12, 0.26), scale=(1.05, 1.0, 0.74))
    # Crimson tailored sash draped diagonally across dressmaker mannequin
    cloth_r.add_tube(
        [(1.88, 1.66, 0.34), (2.04, 1.48, 0.42), (2.21, 1.28, 0.32), (2.04, 1.34, 0.09), (1.88, 1.64, 0.20)],
        0.032, 0.032, u_segs=10, samples_per_seg=4, scale_xy=(1.5, 0.45),
    )
    brass.add_ellipsoid(center=(2.04, 1.89, 0.26), radii=(0.046, 0.058, 0.046), u_segs=14, v_segs=8)

    # Turned wooden hat stand on left (x = -2.06, z = 0.40) + curved hooks + sculpted Stetson hat
    dark.add_lathe(
        [(0.22, 0.00), (0.16, 0.05), (0.048, 0.15), (0.036, 1.22), (0.054, 1.30), (0.034, 1.43), (0.062, 1.47)],
        u_segs=16, translate=(-2.06, 0.22, 0.40),
    )
    for hk_ang in (0.0, math.pi * 0.67, math.pi * 1.33):
        ca, sa = math.cos(hk_ang), math.sin(hk_ang)
        brass.add_tube(
            [
                (-2.06 + ca * 0.035, 1.46, 0.40 + sa * 0.035),
                (-2.06 + ca * 0.115, 1.49, 0.40 + sa * 0.115),
                (-2.06 + ca * 0.145, 1.56, 0.40 + sa * 0.145),
            ],
            0.010, 0.008, u_segs=8, samples_per_seg=3,
        )

    hat_prof = [
        (0.004, 0.215),
        (0.068, 0.205),
        (0.132, 0.228),
        (0.166, 0.155),
        (0.178, 0.035),
        (0.275, 0.006),
        (0.355, 0.032),
        (0.362, 0.010),
        (0.262, -0.010),
        (0.168, 0.004),
    ]
    buck.add_lathe(
        hat_prof, u_segs=26, translate=(-2.06, 1.69, 0.40), rot_euler=(0.08, 0.42, 0.14),
        deform_fn=lambda x, y, z, a: (
            x * 0.94,
            y + ((abs(x) / 0.35) ** 2) * 0.082 if math.hypot(x, z) > 0.185 else y - 0.018 * max(0.0, math.cos(a * 2.0)) * max(0.0, (y - 0.12) / 0.11),
            z * 1.12,
        ),
    )
    # Ribbon hatband around display Stetson
    band_pts = [
        (math.cos(a) * 0.172, 0.032, math.sin(a) * 0.198)
        for a in [k * math.pi * 2.0 / 24 for k in range(25)]
    ]
    cloth_r.add_tube(
        band_pts, 0.014, 0.014, u_segs=8, samples_per_seg=1,
        cap_start=False, cap_end=False, translate=(-2.06, 1.69, 0.40), rot_euler=(0.08, 0.42, 0.14),
    )

    # Exterior coopered barrel & 12-spoke wagon wheel
    add_oak_barrel(gp, mat_pine, mat_dark, mat_iron, 2.24, 0.22, 2.52, scale=0.95)
    add_wagon_wheel(gp, mat_pine, mat_dark, mat_iron, 2.94, 0.58, 1.72, rot_euler=(0.0, math.pi * 0.5, -0.18), radius=0.52)

    mesh_idx = b.add_mesh_from_parts("TailorShopMesh", parts.values())
    b.add_node("TailorArchitecture", mesh_idx=mesh_idx, parent_idx=root)
    return b.export_glb(out_path)


# ---------------------------------------------------------------------------
# Strict Binary .glb Integrity, Bounds & Normal Validator
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

    # Compute world transforms for all nodes to verify world-space bounds
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

    rev_path = os.path.join(assets_dir, "revolver.glb")
    sal_path = os.path.join(assets_dir, "saloon.glb")
    tai_path = os.path.join(assets_dir, "tailor.glb")

    r_stats = build_revolver_glb(rev_path)
    r_chk = _verify_glb(
        rev_path,
        expected_nodes=("RevolverRoot", "Body", "Cylinder", "Hammer", "Trigger", "MuzzlePoint"),
        expected_materials=("GunSteel", "GunDarkSteel", "GunBrass", "GunWalnut", "GunCopper", "GunBoreDark"),
    )

    s_stats = build_saloon_glb(sal_path)
    s_chk = _verify_glb(
        sal_path,
        expected_nodes=("SaloonRoot", "SaloonArchitecture"),
        expected_materials=("WeatheredSiding", "WarmPine", "DarkTimber", "CedarShingles", "StoneFoundation", "WindowGlass"),
    )

    t_stats = build_tailor_glb(tai_path)
    t_chk = _verify_glb(
        tai_path,
        expected_nodes=("TailorShopRoot", "TailorArchitecture"),
        expected_materials=("WeatheredSiding", "WarmPine", "DarkTimber", "CedarShingles", "StoneFoundation", "WindowGlass"),
    )

    for label, st, chk in (("revolver.glb", r_stats, r_chk), ("saloon.glb", s_stats, s_chk), ("tailor.glb", t_stats, t_chk)):
        print(
            f"[OK] {label:14s} | {st['triangles']:5d} tris | {st['vertices']:5d} verts | {st['bytes']:7d} B | "
            f"bounds min={chk['bounds_min']} max={chk['bounds_max']} | degen={chk['degen_normals']}/{chk['degen_tris']}"
        )
