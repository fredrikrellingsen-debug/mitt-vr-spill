#!/usr/bin/env python3
"""
Builds detailed Hellfire Repeater / Silver Gatling Carbine (assets/hellfire.glb).
Grip at (0,0,0), barrel pointing along -Z, rotary BarrelCluster child node & MuzzlePoint.
"""

import math
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from glb_core import GLBBuilder, MeshPart


def build_hellfire(out_path):
    g = GLBBuilder()

    mat_silver = g.add_material("GunSilver", (0.86, 0.90, 0.95, 1.0), metallic=0.92, roughness=0.18)
    mat_dark = g.add_material("GunDarkSteel", (0.20, 0.22, 0.26, 1.0), metallic=0.84, roughness=0.30)
    mat_brass = g.add_material("GunBrass", (0.88, 0.70, 0.28, 1.0), metallic=0.92, roughness=0.20)
    mat_walnut = g.add_material("GunWalnut", (0.34, 0.16, 0.07, 1.0), metallic=0.04, roughness=0.52)
    mat_arcane = g.add_material("HellfireCore", (0.38, 0.80, 1.00, 1.0), metallic=0.20, roughness=0.14, emissive=(0.24, 0.62, 0.96))

    p_silver = MeshPart(mat_silver)
    p_dark = MeshPart(mat_dark)
    p_brass = MeshPart(mat_brass)
    p_wood = MeshPart(mat_walnut)
    p_core = MeshPart(mat_arcane)

    # Ergonomic curved pistol grip + rear carbine buttstock (grip centered at (0, 0, 0))
    grip_pts = [
        (0.0, 0.036, 0.015),
        (0.0, -0.012, 0.025),
        (0.0, -0.068, 0.045),
        (0.0, -0.105, 0.062),
    ]

    def grip_sec(t, theta):
        rx = 0.018 + 0.004 * math.sin(t * math.pi)
        rz = 0.026 + 0.005 * t
        return (math.cos(theta) * rx, math.sin(theta) * rz)

    p_wood.add_loft(grip_pts, grip_sec, u_segs=14)
    p_wood.add_beveled_box(0.0, 0.024, 0.14, 0.034, 0.072, 0.20, bevel=0.008, rot_euler=(-0.08, 0.0, 0.0))
    p_brass.add_beveled_box(0.0, 0.016, 0.242, 0.036, 0.078, 0.014, bevel=0.004, rot_euler=(-0.08, 0.0, 0.0))

    # Receiver body + top silver crest + brass drum magazine underneath
    p_dark.add_beveled_box(0.0, 0.054, -0.085, 0.046, 0.056, 0.20, bevel=0.006)
    p_silver.add_beveled_box(0.0, 0.084, -0.085, 0.038, 0.018, 0.18, bevel=0.004)
    # Trigger guard & lever loop
    p_brass.add_beveled_box(0.0, 0.005, -0.036, 0.012, 0.028, 0.050, bevel=0.003)
    # Rotary Drum Magazine underneath frame
    p_brass.add_faceted_prism(18, 0.052, 0.052, 0.046, center=(0.0, 0.002, -0.12), rot_euler=(math.pi * 0.5, 0.0, 0.0))
    p_dark.add_faceted_prism(14, 0.034, 0.034, 0.050, center=(0.0, 0.002, -0.12), rot_euler=(math.pi * 0.5, 0.0, 0.0))

    # Glowing Hellfire arcane crystal cell inside side vents
    p_core.add_faceted_prism(12, 0.016, 0.016, 0.14, center=(0.0, 0.058, -0.095), rot_euler=(math.pi * 0.5, 0.0, 0.0))
    p_core.add_beveled_box(0.0, 0.058, -0.095, 0.049, 0.018, 0.11, bevel=0.002)

    # Shrouded front guard cage
    p_dark.add_beveled_box(0.0, 0.054, -0.25, 0.048, 0.048, 0.14, bevel=0.005)
    p_brass.add_faceted_prism(16, 0.030, 0.030, 0.018, center=(0.0, 0.054, -0.19), rot_euler=(math.pi * 0.5, 0.0, 0.0))

    body_mesh = g.add_mesh_from_parts("HellfireBodyMesh", [p_silver, p_dark, p_brass, p_wood, p_core])
    body_node = g.add_node("HellfireBody", mesh_idx=body_mesh)

    # Separate rotating BarrelCluster (4 fluted silver barrels + brass clamp collar)
    pb_silver = MeshPart(mat_silver)
    pb_brass = MeshPart(mat_brass)
    pb_core = MeshPart(mat_arcane)

    for bi in range(4):
        ang = (bi / 4.0) * math.pi * 2.0 + math.pi * 0.25
        ox = math.cos(ang) * 0.015
        oy = math.sin(ang) * 0.015
        pb_silver.add_faceted_prism(8, 0.0082, 0.0082, 0.34, center=(ox, oy, -0.15), rot_euler=(math.pi * 0.5, 0.0, 0.0))
        pb_brass.add_faceted_prism(8, 0.0096, 0.0096, 0.022, center=(ox, oy, -0.305), rot_euler=(math.pi * 0.5, 0.0, 0.0))

    # Central glowing core rod & front clamp collar
    pb_core.add_faceted_prism(10, 0.007, 0.007, 0.32, center=(0.0, 0.0, -0.15), rot_euler=(math.pi * 0.5, 0.0, 0.0))
    pb_brass.add_faceted_prism(14, 0.026, 0.026, 0.022, center=(0.0, 0.0, -0.275), rot_euler=(math.pi * 0.5, 0.0, 0.0))

    barrel_mesh = g.add_mesh_from_parts("HellfireBarrelClusterMesh", [pb_silver, pb_brass, pb_core])
    g.add_node("BarrelCluster", translation=(0.0, 0.054, -0.19), mesh_idx=barrel_mesh, parent_idx=body_node)

    # MuzzlePoint for bullets/muzzle flash
    g.add_node("MuzzlePoint", translation=(0.0, 0.054, -0.52), parent_idx=body_node)

    return g.export_glb(out_path)


if __name__ == "__main__":
    os.makedirs(os.path.join(SCRIPT_DIR, "..", "assets"), exist_ok=True)
    out = os.path.join(SCRIPT_DIR, "..", "assets", "hellfire.glb")
    print(build_hellfire(out))
