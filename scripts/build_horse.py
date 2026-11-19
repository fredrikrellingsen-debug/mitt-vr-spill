#!/usr/bin/env python3
"""Builds detailed articulated Western Mustang horse (assets/horse.glb) facing -Z."""

import math
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from glb_core import (
    GLBBuilder,
    MeshPart,
    quat_from_axis_angle,
    quat_from_euler_xyz,
    quat_mul,
)


def build_horse(out_path):
    g = GLBBuilder()

    mat_coat = g.add_material("HorseCoat", (0.43, 0.20, 0.09, 1.0), metallic=0.02, roughness=0.68)
    mat_dark = g.add_material("HorseDarkHair", (0.09, 0.06, 0.05, 1.0), metallic=0.02, roughness=0.82)
    mat_hoof = g.add_material("HorseHoof", (0.14, 0.13, 0.12, 1.0), metallic=0.06, roughness=0.42)
    mat_leather = g.add_material("SaddleLeather", (0.25, 0.12, 0.05, 1.0), metallic=0.05, roughness=0.52)
    mat_blanket = g.add_material("SaddleBlanket", (0.58, 0.14, 0.11, 1.0), metallic=0.02, roughness=0.86)
    mat_brass = g.add_material("BrassHardware", (0.84, 0.66, 0.24, 1.0), metallic=0.88, roughness=0.22)
    mat_eye = g.add_material("HorseEye", (0.05, 0.04, 0.03, 1.0), metallic=0.15, roughness=0.12)
    mat_blaze = g.add_material("HorseBlaze", (0.86, 0.82, 0.76, 1.0), metallic=0.02, roughness=0.72)

    # --- 1. Torso + Saddle + Blanket (pelvis/barrel centered around y=1.08) ---
    p_torso_coat = MeshPart(mat_coat)
    spine_pts = [
        (0.0, 1.10, -0.78),
        (0.0, 1.12, -0.48),
        (0.0, 1.06, -0.08),
        (0.0, 1.07, 0.34),
        (0.0, 1.09, 0.68),
        (0.0, 1.00, 0.86),
    ]

    def body_sec(t, theta):
        # Cross section: (x_right, y_up)
        # Chest wide/deep at t=0.15, slight saddle dip t=0.45, muscular croup t=0.72
        rx = 0.18 + 0.12 * math.sin(t * math.pi) + (0.06 if t > 0.55 else 0.0)
        ry = 0.22 + 0.14 * math.sin(t * math.pi)
        if t < 0.22:
            rx *= 0.85
            ry *= 0.92
        elif t > 0.88:
            rx *= 0.52
            ry *= 0.58
        x = math.cos(theta) * rx
        y = math.sin(theta) * ry
        # Tuck belly slightly higher toward hindquarters
        if math.sin(theta) < 0:
            y *= (0.94 - 0.16 * max(0.0, t - 0.35))
        return (x, y)

    p_torso_coat.add_loft(spine_pts, body_sec, u_segs=22, cap_start=True, cap_end=True)
    # Muscular chest & shoulder swells
    p_torso_coat.add_ellipsoid((-0.14, 1.04, -0.56), (0.14, 0.24, 0.20), u_segs=14, v_segs=10)
    p_torso_coat.add_ellipsoid((0.14, 1.04, -0.56), (0.14, 0.24, 0.20), u_segs=14, v_segs=10)
    # Hindquarters haunches
    p_torso_coat.add_ellipsoid((-0.15, 1.04, 0.56), (0.16, 0.25, 0.24), u_segs=14, v_segs=10)
    p_torso_coat.add_ellipsoid((0.15, 1.04, 0.56), (0.16, 0.25, 0.24), u_segs=14, v_segs=10)

    # Scarlet saddle blanket draped across the back
    p_blanket = MeshPart(mat_blanket)
    for side in (-1.0, 1.0):
        p_blanket.add_beveled_box(
            side * 0.16, 1.18, 0.04,
            0.22, 0.26, 0.68,
            bevel=0.014,
            rot_euler=(0.0, 0.0, -side * 0.92),
        )
    p_blanket.add_beveled_box(0.0, 1.32, 0.04, 0.36, 0.04, 0.68, bevel=0.012)

    # Western leather saddle (seat, cantle, pommel, horn, skirts, stirrup straps)
    p_saddle = MeshPart(mat_leather)
    p_saddle.add_beveled_box(0.0, 1.35, 0.04, 0.34, 0.055, 0.44, bevel=0.016)
    # Cantle (high rear back)
    p_saddle.add_beveled_box(0.0, 1.43, 0.24, 0.30, 0.14, 0.07, bevel=0.018, rot_euler=(-0.38, 0.0, 0.0))
    # Pommel fork + horn
    p_saddle.add_beveled_box(0.0, 1.42, -0.15, 0.28, 0.11, 0.08, bevel=0.018, rot_euler=(0.24, 0.0, 0.0))
    p_saddle.add_tube([(0.0, 1.46, -0.16), (0.0, 1.54, -0.18)], 0.024, 0.036, u_segs=10)
    # Fenders & girth strap
    for side in (-1.0, 1.0):
        p_saddle.add_beveled_box(side * 0.26, 1.10, -0.02, 0.035, 0.42, 0.24, bevel=0.01, rot_euler=(0.0, 0.0, side * 0.22))
        p_saddle.add_beveled_box(side * 0.28, 0.92, -0.01, 0.022, 0.36, 0.045, bevel=0.006, rot_euler=(0.0, 0.0, side * 0.12))
    # Girth cinch under belly
    p_saddle.add_faceted_prism(14, 0.265, 0.265, 0.07, center=(0.0, 1.06, -0.08), rot_euler=(math.pi * 0.5, 0.0, 0.0))

    p_brass = MeshPart(mat_brass)
    for side in (-1.0, 1.0):
        p_brass.add_beveled_box(side * 0.30, 0.72, -0.01, 0.03, 0.10, 0.12, bevel=0.008)
        p_brass.add_beveled_box(side * 0.30, 0.67, -0.01, 0.05, 0.025, 0.12, bevel=0.006)
        # Brass conchos on saddle
        p_brass.add_faceted_prism(10, 0.028, 0.028, 0.014, center=(side * 0.19, 1.36, 0.20), rot_euler=(0.0, 0.0, math.pi * 0.5))

    torso_mesh = g.add_mesh_from_parts("HorseTorsoMesh", [p_torso_coat, p_blanket, p_saddle, p_brass])
    torso_node = g.add_node("HorseTorso", mesh_idx=torso_mesh)
    g.add_node("SaddleSeat", translation=(0.0, 1.40, 0.03), parent_idx=torso_node)

    # --- 2. Neck & Head Pivot (at shoulder (0, 1.24, -0.68)) ---
    p_neck_coat = MeshPart(mat_coat)
    neck_pts = [
        (0.0, -0.04, 0.04),
        (0.0, 0.20, -0.12),
        (0.0, 0.44, -0.26),
        (0.0, 0.56, -0.34),
    ]

    def neck_sec(t, theta):
        rx = 0.14 - 0.045 * t
        ry = 0.20 - 0.065 * t
        return (math.cos(theta) * rx, math.sin(theta) * ry)

    p_neck_coat.add_loft(neck_pts, neck_sec, u_segs=18)
    # Skull & tapered muzzle extending toward -Z / down-forward
    head_pts = [
        (0.0, 0.56, -0.28),
        (0.0, 0.54, -0.44),
        (0.0, 0.44, -0.64),
        (0.0, 0.33, -0.78),
    ]

    def head_sec(t, theta):
        rx = 0.115 - 0.052 * t
        ry = 0.125 - 0.052 * t
        return (math.cos(theta) * rx, math.sin(theta) * ry)

    p_neck_coat.add_loft(head_pts, head_sec, u_segs=16)
    # Ears
    for side in (-1.0, 1.0):
        p_neck_coat.add_tube(
            [(side * 0.065, 0.65, -0.34), (side * 0.085, 0.77, -0.32), (side * 0.095, 0.85, -0.30)],
            0.032, 0.008, u_segs=8,
        )

    # Dark muzzle tip + flowing mane crest
    p_neck_dark = MeshPart(mat_dark)
    p_neck_dark.add_ellipsoid((0.0, 0.32, -0.80), (0.068, 0.065, 0.075), u_segs=12, v_segs=8)
    for m_i in range(6):
        frac = m_i / 5.0
        mx = 0.035
        my = 0.16 + frac * 0.52
        mz = -0.02 - frac * 0.32
        p_neck_dark.add_ellipsoid((mx, my, mz), (0.05, 0.09, 0.11), u_segs=10, v_segs=6, rot_euler=(0.35, 0.12, -0.28))

    # White blaze on forehead + glossy eyes + leather bridle + brass bit rings
    p_blaze = MeshPart(mat_blaze)
    p_blaze.add_beveled_box(0.0, 0.50, -0.58, 0.042, 0.035, 0.28, bevel=0.01, rot_euler=(-0.56, 0.0, 0.0))

    p_eyes = MeshPart(mat_eye)
    for side in (-1.0, 1.0):
        p_eyes.add_ellipsoid((side * 0.095, 0.55, -0.46), (0.024, 0.024, 0.026), u_segs=10, v_segs=8)

    p_bridle = MeshPart(mat_leather)
    p_bridle.add_faceted_prism(14, 0.092, 0.092, 0.024, center=(0.0, 0.39, -0.71), rot_euler=(1.05, 0.0, 0.0))
    p_bridle.add_faceted_prism(14, 0.125, 0.125, 0.022, center=(0.0, 0.54, -0.40), rot_euler=(1.05, 0.0, 0.0))
    for side in (-1.0, 1.0):
        p_bridle.add_tube([(side * 0.10, 0.56, -0.42), (side * 0.08, 0.38, -0.71)], 0.011, 0.011, u_segs=6)
        p_bridle.add_tube([(side * 0.08, 0.36, -0.73), (side * 0.14, 0.25, -0.35), (side * 0.10, 0.14, 0.22)], 0.009, 0.009, u_segs=6)

    p_head_brass = MeshPart(mat_brass)
    for side in (-1.0, 1.0):
        p_head_brass.add_faceted_prism(12, 0.024, 0.024, 0.012, center=(side * 0.082, 0.36, -0.73), rot_euler=(0.0, 0.0, math.pi * 0.5))

    neck_mesh = g.add_mesh_from_parts("HorseNeckHeadMesh", [p_neck_coat, p_neck_dark, p_blaze, p_eyes, p_bridle, p_head_brass])
    neck_node = g.add_node("HorseNeckHead", translation=(0.0, 1.24, -0.66), mesh_idx=neck_mesh, parent_idx=torso_node)

    # --- 3. Flowing Tail Pivot (dock at (0, 1.12, 0.84)) ---
    p_tail = MeshPart(mat_dark)
    tail_pts = [
        (0.0, 0.0, 0.0),
        (0.0, -0.10, 0.14),
        (0.0, -0.36, 0.22),
        (0.0, -0.66, 0.20),
        (0.0, -0.82, 0.24),
    ]

    def tail_sec(t, theta):
        r = 0.05 + 0.045 * math.sin(t * math.pi * 0.85) - 0.03 * t
        r = max(0.012, r)
        return (math.cos(theta) * r * 0.78, math.sin(theta) * r)

    p_tail.add_loft(tail_pts, tail_sec, u_segs=12)
    tail_mesh = g.add_mesh_from_parts("HorseTailMesh", [p_tail])
    tail_node = g.add_node("HorseTail", translation=(0.0, 1.10, 0.84), mesh_idx=tail_mesh, parent_idx=torso_node)

    # --- 4. Four Articulated Legs (pivot at hip/shoulder y=1.00 down to hooves at y=0) ---
    def build_leg_mesh(is_front, side_sign):
        p_leg_coat = MeshPart(mat_coat)
        p_leg_dark = MeshPart(mat_dark)
        p_leg_hoof = MeshPart(mat_hoof)

        if is_front:
            upper_pts = [(0.0, 0.0, 0.0), (0.0, -0.26, 0.02), (0.0, -0.48, 0.01)]
            lower_pts = [(0.0, -0.48, 0.01), (0.0, -0.74, 0.0), (0.0, -0.88, -0.02), (0.0, -0.94, -0.04)]
        else:
            upper_pts = [(0.0, 0.0, 0.0), (0.0, -0.24, -0.05), (0.0, -0.46, 0.06)]
            lower_pts = [(0.0, -0.46, 0.06), (0.0, -0.74, 0.01), (0.0, -0.89, -0.02), (0.0, -0.94, -0.04)]

        p_leg_coat.add_tube(upper_pts, 0.115 if not is_front else 0.095, 0.058, u_segs=12, samples_per_seg=4)
        p_leg_dark.add_tube(lower_pts, 0.056, 0.046, u_segs=12, samples_per_seg=4)
        # Hard dark hoof touching local y = -1.00 (world y = 0.0)
        p_leg_hoof.add_faceted_prism(12, 0.048, 0.062, 0.08, center=(0.0, -0.96, -0.05))
        return g.add_mesh_from_parts(f"HorseLegMesh_{'F' if is_front else 'B'}_{'R' if side_sign > 0 else 'L'}", [p_leg_coat, p_leg_dark, p_leg_hoof])

    leg_fl = g.add_node("HorseLegFL", translation=(-0.19, 1.00, -0.54), mesh_idx=build_leg_mesh(True, -1), parent_idx=torso_node)
    leg_fr = g.add_node("HorseLegFR", translation=(0.19, 1.00, -0.54), mesh_idx=build_leg_mesh(True, 1), parent_idx=torso_node)
    leg_bl = g.add_node("HorseLegBL", translation=(-0.19, 1.00, 0.58), mesh_idx=build_leg_mesh(False, -1), parent_idx=torso_node)
    leg_br = g.add_node("HorseLegBR", translation=(0.19, 1.00, 0.58), mesh_idx=build_leg_mesh(False, 1), parent_idx=torso_node)

    # --- 5. Animations: Idle + Gallop ---
    idle_times = [0.0, 0.8, 1.6, 2.4]
    g.add_animation("Idle", [
        {
            "node": neck_node,
            "path": "rotation",
            "times": idle_times,
            "values": [
                quat_from_euler_xyz(0.0, 0.0, 0.0),
                quat_from_euler_xyz(0.08, 0.04, 0.0),
                quat_from_euler_xyz(-0.02, -0.04, 0.0),
                quat_from_euler_xyz(0.0, 0.0, 0.0),
            ],
        },
        {
            "node": tail_node,
            "path": "rotation",
            "times": idle_times,
            "values": [
                quat_from_euler_xyz(0.0, 0.0, 0.0),
                quat_from_euler_xyz(0.06, 0.0, 0.14),
                quat_from_euler_xyz(0.03, 0.0, -0.14),
                quat_from_euler_xyz(0.0, 0.0, 0.0),
            ],
        },
    ])

    gal_times = [0.0, 0.15, 0.30, 0.45, 0.60]
    g.add_animation("Gallop", [
        {
            "node": torso_node,
            "path": "translation",
            "times": gal_times,
            "values": [(0.0, 0.0, 0.0), (0.0, 0.08, 0.0), (0.0, 0.01, 0.0), (0.0, 0.09, 0.0), (0.0, 0.0, 0.0)],
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
                quat_from_euler_xyz(0.35, 0.0, 0.0),
                quat_from_euler_xyz(0.52, 0.0, 0.06),
                quat_from_euler_xyz(0.38, 0.0, 0.0),
                quat_from_euler_xyz(0.54, 0.0, -0.06),
                quat_from_euler_xyz(0.35, 0.0, 0.0),
            ],
        },
        {
            "node": leg_fl,
            "path": "rotation",
            "times": gal_times,
            "values": [
                quat_from_euler_xyz(0.62, 0.0, 0.0),
                quat_from_euler_xyz(-0.15, 0.0, 0.0),
                quat_from_euler_xyz(-0.58, 0.0, 0.0),
                quat_from_euler_xyz(0.10, 0.0, 0.0),
                quat_from_euler_xyz(0.62, 0.0, 0.0),
            ],
        },
        {
            "node": leg_fr,
            "path": "rotation",
            "times": gal_times,
            "values": [
                quat_from_euler_xyz(0.38, 0.0, 0.0),
                quat_from_euler_xyz(0.64, 0.0, 0.0),
                quat_from_euler_xyz(-0.22, 0.0, 0.0),
                quat_from_euler_xyz(-0.60, 0.0, 0.0),
                quat_from_euler_xyz(0.38, 0.0, 0.0),
            ],
        },
        {
            "node": leg_bl,
            "path": "rotation",
            "times": gal_times,
            "values": [
                quat_from_euler_xyz(-0.56, 0.0, 0.0),
                quat_from_euler_xyz(0.18, 0.0, 0.0),
                quat_from_euler_xyz(0.58, 0.0, 0.0),
                quat_from_euler_xyz(-0.18, 0.0, 0.0),
                quat_from_euler_xyz(-0.56, 0.0, 0.0),
            ],
        },
        {
            "node": leg_br,
            "path": "rotation",
            "times": gal_times,
            "values": [
                quat_from_euler_xyz(-0.30, 0.0, 0.0),
                quat_from_euler_xyz(-0.58, 0.0, 0.0),
                quat_from_euler_xyz(0.24, 0.0, 0.0),
                quat_from_euler_xyz(0.60, 0.0, 0.0),
                quat_from_euler_xyz(-0.30, 0.0, 0.0),
            ],
        },
    ])

    return g.export_glb(out_path)


if __name__ == "__main__":
    os.makedirs(os.path.join(SCRIPT_DIR, "..", "assets"), exist_ok=True)
    out = os.path.join(SCRIPT_DIR, "..", "assets", "horse.glb")
    print(build_horse(out))
