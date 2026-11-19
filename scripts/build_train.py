#!/usr/bin/env python3
"""
Builds Western Armored Steam Train (assets/train.glb) aligned along X axis:
- Steam Locomotive (front -X at x=-22.0..-8.5)
- Coal Tender (-8.0..-2.5)
- Armored Outlaw Boxcar (-1.8..+10.5)
- Gatling Flatbed Car (+11.2..+20.5) with swivel Brass Gatling Gun
All wheels touch y=0.0 so placing at railhead y works cleanly.
"""

import math
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from glb_core import GLBBuilder, MeshPart


def add_wheel_pair(p_iron, p_rim, x_pos, radius, half_track=0.92):
    """Adds left and right flanged iron railway wheels at x_pos resting on y=0."""
    cy = radius
    for side in (-1.0, 1.0):
        wz = side * half_track
        p_iron.add_faceted_prism(16, radius * 0.92, radius * 0.92, 0.14, center=(x_pos, cy, wz), rot_euler=(math.pi * 0.5, 0.0, 0.0))
        p_iron.add_faceted_prism(16, radius, radius, 0.04, center=(x_pos, cy, wz - side * 0.075), rot_euler=(math.pi * 0.5, 0.0, 0.0))
        p_rim.add_faceted_prism(12, radius * 0.42, radius * 0.42, 0.16, center=(x_pos, cy, wz), rot_euler=(math.pi * 0.5, 0.0, 0.0))
    # Connecting axle
    p_iron.add_faceted_prism(10, 0.085, 0.085, half_track * 2.0, center=(x_pos, cy, 0.0), rot_euler=(math.pi * 0.5, 0.0, 0.0))


def build_train(out_path):
    g = GLBBuilder()

    mat_boiler_iron = g.add_material("TrainBoilerIron", (0.12, 0.13, 0.15, 1.0), metallic=0.80, roughness=0.38)
    mat_armor_steel = g.add_material("TrainArmorSteel", (0.24, 0.27, 0.30, 1.0), metallic=0.84, roughness=0.32)
    mat_crimson_trim = g.add_material("TrainCrimson", (0.48, 0.10, 0.09, 1.0), metallic=0.20, roughness=0.52)
    mat_brass = g.add_material("TrainBrass", (0.86, 0.67, 0.24, 1.0), metallic=0.90, roughness=0.22)
    mat_timber = g.add_material("TrainTimber", (0.34, 0.19, 0.10, 1.0), metallic=0.04, roughness=0.72)
    mat_coal = g.add_material("TrainCoal", (0.06, 0.06, 0.07, 1.0), metallic=0.05, roughness=0.92)
    mat_headlamp = g.add_material("TrainLampGlow", (1.0, 0.88, 0.58, 1.0), metallic=0.1, roughness=0.2, emissive=(1.0, 0.80, 0.35))

    p_iron = MeshPart(mat_boiler_iron)
    p_armor = MeshPart(mat_armor_steel)
    p_trim = MeshPart(mat_crimson_trim)
    p_brass = MeshPart(mat_brass)
    p_wood = MeshPart(mat_timber)
    p_coal = MeshPart(mat_coal)
    p_lamp = MeshPart(mat_headlamp)

    # =========================================================================
    # 1. STEAM LOCOMOTIVE (x = -22.2 .. -8.6)
    # =========================================================================
    # Chassis frame
    p_iron.add_beveled_box(-14.8, 0.92, 0.0, 12.6, 0.34, 2.25, bevel=0.025)
    # Cowcatcher prow (-22.0 .. -20.2)
    p_trim.add_beveled_box(-21.0, 0.56, 0.0, 1.4, 0.42, 2.05, bevel=0.03, rot_euler=(0.0, 0.0, 0.28))
    for k in range(-4, 5):
        p_iron.add_beveled_box(-21.25, 0.48, k * 0.22, 1.85, 0.07, 0.06, bevel=0.01, rot_euler=(0.0, 0.0, 0.46))

    # Main cylindrical boiler along X
    p_iron.add_faceted_prism(20, 0.96, 0.96, 8.2, center=(-16.2, 2.18, 0.0), rot_euler=(0.0, 0.0, math.pi * 0.5))
    # Smokebox nose
    p_iron.add_faceted_prism(20, 1.00, 1.00, 1.6, center=(-20.1, 2.18, 0.0), rot_euler=(0.0, 0.0, math.pi * 0.5))
    p_brass.add_faceted_prism(16, 0.46, 0.54, 0.16, center=(-20.92, 2.18, 0.0), rot_euler=(0.0, 0.0, math.pi * 0.5))
    # Boiler brass straps
    for bx in (-19.1, -17.3, -15.4, -13.5):
        p_brass.add_faceted_prism(20, 0.99, 0.99, 0.10, center=(bx, 2.18, 0.0), rot_euler=(0.0, 0.0, math.pi * 0.5))

    # Diamond smokestack
    p_iron.add_faceted_prism(14, 0.30, 0.22, 1.15, center=(-19.6, 3.56, 0.0))
    p_iron.add_faceted_prism(14, 0.54, 0.30, 0.48, center=(-19.6, 4.25, 0.0))
    p_brass.add_faceted_prism(14, 0.56, 0.56, 0.12, center=(-19.6, 4.49, 0.0))

    # Steam dome + sand dome + brass bell
    p_iron.add_ellipsoid((-16.9, 3.22, 0.0), (0.42, 0.52, 0.42), u_segs=14, v_segs=10)
    p_brass.add_ellipsoid((-14.6, 3.25, 0.0), (0.38, 0.46, 0.38), u_segs=14, v_segs=10)
    p_brass.add_faceted_prism(12, 0.18, 0.24, 0.32, center=(-18.2, 3.35, 0.0))

    # Headlamp housing & bright amber lens
    p_iron.add_beveled_box(-20.45, 3.45, 0.0, 0.52, 0.56, 0.46, bevel=0.025)
    p_lamp.add_faceted_prism(14, 0.20, 0.20, 0.12, center=(-20.72, 3.45, 0.0), rot_euler=(0.0, 0.0, math.pi * 0.5))

    # Side steam cylinders & pistons
    for side in (-1.0, 1.0):
        p_iron.add_faceted_prism(14, 0.32, 0.32, 1.25, center=(-19.4, 0.88, side * 1.12), rot_euler=(0.0, 0.0, math.pi * 0.5))
        # Coupling rod along drive wheels
        p_armor.add_beveled_box(-15.5, 0.72, side * 1.04, 4.8, 0.10, 0.07, bevel=0.01)

    # Locomotive Drive Wheels (large) & Front Pilot Bogie
    for wx in (-19.8, -18.3):
        add_wheel_pair(p_iron, p_trim, wx, 0.44)
    for wx in (-16.6, -14.7, -12.8):
        add_wheel_pair(p_iron, p_trim, wx, 0.72)

    # Engineer Cab (-11.9 .. -8.6)
    p_trim.add_beveled_box(-10.25, 2.38, 0.0, 3.25, 2.35, 2.55, bevel=0.03)
    p_wood.add_beveled_box(-10.25, 2.52, 0.0, 2.95, 1.35, 2.62, bevel=0.02)
    # Cab Arched Roof
    p_iron.add_beveled_box(-10.25, 3.74, 0.0, 3.80, 0.20, 2.86, bevel=0.04)

    # =========================================================================
    # 2. COAL TENDER (-8.1 .. -2.7)
    # =========================================================================
    p_iron.add_beveled_box(-5.4, 0.92, 0.0, 5.4, 0.28, 2.35, bevel=0.02)
    p_armor.add_beveled_box(-5.4, 1.72, 0.0, 5.1, 1.38, 2.28, bevel=0.025)
    p_trim.add_beveled_box(-5.4, 2.36, 0.0, 5.24, 0.14, 2.38, bevel=0.02)
    p_coal.add_ellipsoid((-5.4, 2.52, 0.0), (2.15, 0.44, 0.95), u_segs=14, v_segs=8)
    for wx in (-7.0, -5.8, -4.0, -2.9):
        add_wheel_pair(p_iron, p_armor, wx, 0.42)
    # Coupler link to boxcar
    p_iron.add_beveled_box(-2.35, 0.92, 0.0, 0.95, 0.14, 0.22, bevel=0.015)

    # =========================================================================
    # 3. ARMORED OUTLAW BOXCAR (-2.0 .. +10.2)
    # =========================================================================
    p_iron.add_beveled_box(4.1, 0.92, 0.0, 12.2, 0.30, 2.50, bevel=0.025)
    # Floor deck
    p_wood.add_beveled_box(4.1, 1.12, 0.0, 12.0, 0.16, 2.46, bevel=0.02)
    # Armored riveted side plates with doorway gap around x=3.2..5.4
    for x_seg, seg_len in ((0.6, 5.0), (7.7, 4.8)):
        p_armor.add_beveled_box(x_seg, 2.28, -1.16, seg_len, 2.20, 0.14, bevel=0.02)
        p_armor.add_beveled_box(x_seg, 2.28, 1.16, seg_len, 2.20, 0.14, bevel=0.02)
    # Armored front/rear bulkheads
    p_armor.add_beveled_box(-1.82, 2.28, 0.0, 0.16, 2.20, 2.42, bevel=0.02)
    p_armor.add_beveled_box(10.02, 2.28, 0.0, 0.16, 2.20, 2.42, bevel=0.02)
    # Heavy armor ribs along sides
    for rx in (-1.2, 0.6, 2.4, 5.8, 7.6, 9.4):
        for side in (-1.0, 1.0):
            p_iron.add_beveled_box(rx, 2.28, side * 1.24, 0.12, 2.16, 0.07, bevel=0.01)
    # Slotted gun ports & crimson insignia band
    p_trim.add_beveled_box(4.1, 1.48, 0.0, 12.06, 0.14, 2.52, bevel=0.015)
    # Roof + roof catwalk
    p_iron.add_beveled_box(4.1, 3.44, 0.0, 12.35, 0.22, 2.66, bevel=0.04)
    p_wood.add_beveled_box(4.1, 3.60, 0.0, 11.4, 0.08, 0.72, bevel=0.01)
    for wx in (-0.4, 0.9, 7.3, 8.6):
        add_wheel_pair(p_iron, p_armor, wx, 0.42)
    # Coupler link to flatbed
    p_iron.add_beveled_box(10.65, 0.92, 0.0, 1.10, 0.14, 0.22, bevel=0.015)

    # =========================================================================
    # 4. GATLING FLATBED WAGON (+11.1 .. +20.6)
    # =========================================================================
    p_iron.add_beveled_box(15.85, 0.92, 0.0, 9.5, 0.28, 2.52, bevel=0.025)
    p_wood.add_beveled_box(15.85, 1.12, 0.0, 9.4, 0.16, 2.48, bevel=0.02)
    # Low side stake rails (open near x=13..15 for easy boarding)
    p_wood.add_beveled_box(17.8, 1.52, -1.16, 5.2, 0.12, 0.10, bevel=0.01)
    p_wood.add_beveled_box(17.8, 1.52, 1.16, 5.2, 0.12, 0.10, bevel=0.01)
    for px in (15.4, 17.8, 20.2):
        for side in (-1.0, 1.0):
            p_iron.add_beveled_box(px, 1.42, side * 1.16, 0.12, 0.56, 0.12, bevel=0.01)
    for wx in (12.4, 13.7, 18.0, 19.3):
        add_wheel_pair(p_iron, p_armor, wx, 0.42)

    # Wooden munitions crates on flatbed
    p_wood.add_beveled_box(12.8, 1.48, -0.58, 0.95, 0.56, 0.78, bevel=0.02)
    p_wood.add_beveled_box(19.2, 1.50, 0.55, 1.05, 0.60, 0.85, bevel=0.02)

    # Centerpiece Brass Gatling Gun mounted at (16.4, 1.20, 0.0) facing -Z (toward Dustwood!)
    p_iron.add_faceted_prism(8, 0.36, 0.52, 0.16, center=(16.4, 1.28, 0.0))
    p_iron.add_faceted_prism(10, 0.10, 0.14, 0.92, center=(16.4, 1.76, 0.0))
    # Carriage yoke + brass receiver
    p_armor.add_beveled_box(16.4, 2.26, 0.0, 0.36, 0.24, 0.46, bevel=0.02)
    p_brass.add_faceted_prism(12, 0.16, 0.16, 0.65, center=(16.4, 2.34, -0.10), rot_euler=(math.pi * 0.5, 0.0, 0.0))
    # 6 brass rotary barrels pointing -Z
    for bi in range(6):
        ang = (bi / 6.0) * math.pi * 2.0
        bx = 16.4 + math.cos(ang) * 0.085
        by = 2.34 + math.sin(ang) * 0.085
        p_brass.add_faceted_prism(8, 0.026, 0.026, 1.10, center=(bx, by, -0.78), rot_euler=(math.pi * 0.5, 0.0, 0.0))
    # Front barrel clamp ring + top hopper
    p_brass.add_faceted_prism(14, 0.13, 0.13, 0.09, center=(16.4, 2.34, -1.16), rot_euler=(math.pi * 0.5, 0.0, 0.0))
    p_brass.add_beveled_box(16.4, 2.58, -0.14, 0.16, 0.30, 0.22, bevel=0.015)

    train_mesh = g.add_mesh_from_parts("ArmoredTrainMesh", [p_iron, p_armor, p_trim, p_brass, p_wood, p_coal, p_lamp])
    g.add_node("ArmoredTrainRoot", mesh_idx=train_mesh)

    return g.export_glb(out_path)


if __name__ == "__main__":
    os.makedirs(os.path.join(SCRIPT_DIR, "..", "assets"), exist_ok=True)
    out = os.path.join(SCRIPT_DIR, "..", "assets", "train.glb")
    print(build_train(out))
