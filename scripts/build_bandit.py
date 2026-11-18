#!/usr/bin/env python3
"""
Generates the game-ready Western Bandit character model (`assets/bandit.glb`).

Design & Engine Contract:
  - Standing cleanly with cowboy boot soles at y = 0.0 (y_min within [0.0, 0.02]),
    total height ~1.84m, facing -Z (z < 0 is forward).
  - Target ~4,500–8,000 triangles with smooth-shaded organic/cloth surfaces and
    crisp beveled/faceted metallic details — zero boxy/Roblox shapes:
      * Cowboy boots (underslung Cuban heel, welted sole, pointed vamp with toe-bug,
        scalloped stitched shaft, side pull-straps, curved brass heel spurs & 8-point star rowels)
      * Lofted riding trousers (calf swell, articulated knee creases, muscular thigh, pelvis)
      * Fitted saddle-leather waistcoat (V-neck, notched lapels, welt pockets, brass watch chain,
        brass buttons) over a buttoned Western henley shirt
      * Long billowing open-front & split-tail Western duster coat (doubleSided=True) with flared
        drapery folds, clean center-back riding split (zero stray polygons between boots),
        sculpted shoulder yoke, overhanging drover storm capelet, wide lapels & cuffs
      * Slanted leather gunbelt with ornate frontier brass buckle (-Z), individual brass-cased
        copper-tipped cartridges in leather loops, and right-thigh Mexican-loop holster + tie-down
      * Anatomical head (cheekbones, brow ridge, recessed sockets, sclera/iris/eyelids, fierce
        angled brows, ears), pleated red triangular outlaw bandana mask + rear knot & tails,
        and curved Cattleman Stetson hat (pinched crown crease, rolled side brims, outlaw front dip)
      * Bent left arm with inward-tucked deltoid shoulder cap, sculpted palm, thumb & curled fingers
      * Articulated right shooting arm hierarchy:
          "rightUpper" (shoulder) -> "rightFore" (elbow) -> hand + fluted-cylinder octagonal-barrel
          Colt revolver pointing -Z -> empty child node "muzzle" at exact barrel tip
  - Embedded glTF quaternion animations:
      * "Idle"   (2.0s breathing & subtle gunslinger aim sway on rightUpper & rightFore)
      * "Attack" (0.35s crisp upward gunshot recoil kick & recovery on rightUpper & rightFore)
"""

import json
import math
import os
import struct
import sys

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPT_DIR not in sys.path:
    sys.path.insert(0, _SCRIPT_DIR)

from glb_core import (
    GLBBuilder,
    catmull_rom_chain,
    quat_from_euler_xyz,
    quat_mul,
    quat_rotate_vec,
    v_add,
    v_cross,
    v_dot,
    v_len,
    v_sub,
)


# ---------------------------------------------------------------------------
# Custom Organic & Sartorial Sculpting Helpers
# ---------------------------------------------------------------------------

def add_open_grid_outward(
    part,
    rings,
    ref_center_fn=None,
    uv_u_scale=1.0,
    uv_v_scale=1.0,
    translate=(0.0, 0.0, 0.0),
    rot_euler=(0.0, 0.0, 0.0),
    scale=(1.0, 1.0, 1.0),
):
    """
    Adds an open smooth-shaded grid (closed_u=False) while automatically verifying
    that face normals point outward away from ref_center_fn(p) (defaults to Y-axis (0, p.y, 0)).
    """
    if len(rings) < 2 or len(rings[0]) < 2:
        return
    if ref_center_fn is None:
        ref_center_fn = lambda p: (0.0, p[1], 0.0)

    q_rot = quat_from_euler_xyz(*rot_euler) if any(abs(a) > 1e-9 for a in rot_euler) else None

    def tp(p):
        sp = (p[0] * scale[0], p[1] * scale[1], p[2] * scale[2])
        rp = quat_rotate_vec(q_rot, sp) if q_rot is not None else sp
        return v_add(rp, translate)

    score = 0.0
    v_cnt = len(rings)
    u_cnt = len(rings[0])
    for v in range(v_cnt - 1):
        for u in range(u_cnt - 1):
            p00 = tp(rings[v][u])
            p10 = tp(rings[v][u + 1])
            p11 = tp(rings[v + 1][u + 1])
            fn = v_cross(v_sub(p10, p00), v_sub(p11, p00))
            mid = (
                (p00[0] + p10[0] + p11[0]) / 3.0,
                (p00[1] + p10[1] + p11[1]) / 3.0,
                (p00[2] + p10[2] + p11[2]) / 3.0,
            )
            score += v_dot(fn, v_sub(mid, ref_center_fn(mid)))

    part.add_smooth_grid(
        rings,
        closed_u=False,
        uv_u_scale=uv_u_scale,
        uv_v_scale=uv_v_scale,
        translate=translate,
        rot_euler=rot_euler,
        scale=scale,
        ensure_outward=False,
        flip=(score < 0.0),
    )


def add_star_rowel(part, cx, cy, cz, points=8, r_outer=0.023, r_inner=0.0095, thickness=0.0042):
    """Builds a crisp metallic 8-point Western spur star rowel spinning in the YZ plane."""
    n_verts = points * 2
    hx = thickness * 0.5
    ring_l = []
    ring_r = []
    for i in range(n_verts):
        ang = (i / n_verts) * math.pi * 2.0
        r = r_outer if (i % 2 == 0) else r_inner
        py = cy + math.cos(ang) * r
        pz = cz + math.sin(ang) * r
        ring_l.append((cx - hx, py, pz))
        ring_r.append((cx + hx, py, pz))

    c_l = (cx - hx, cy, cz)
    c_r = (cx + hx, cy, cz)

    for i in range(n_verts):
        inext = (i + 1) % n_verts
        fn_l = v_cross(v_sub(ring_l[i], c_l), v_sub(ring_l[inext], c_l))
        if fn_l[0] <= 0.0:
            part.add_flat_tri(c_l, ring_l[i], ring_l[inext])
        else:
            part.add_flat_tri(c_l, ring_l[inext], ring_l[i])

        fn_r = v_cross(v_sub(ring_r[i], c_r), v_sub(ring_r[inext], c_r))
        if fn_r[0] >= 0.0:
            part.add_flat_tri(c_r, ring_r[i], ring_r[inext])
        else:
            part.add_flat_tri(c_r, ring_r[inext], ring_r[i])

        p0, p1, p2, p3 = ring_l[i], ring_r[i], ring_r[inext], ring_l[inext]
        mid = ((p0[0] + p2[0]) * 0.5, (p0[1] + p2[1]) * 0.5, (p0[2] + p2[2]) * 0.5)
        fn_e = v_cross(v_sub(p1, p0), v_sub(p2, p0))
        if v_dot(fn_e, v_sub(mid, (cx, cy, cz))) >= 0.0:
            part.add_flat_quad(p0, p1, p2, p3)
        else:
            part.add_flat_quad(p1, p0, p3, p2)


def build_cowboy_boot_and_leg(boot_part, sole_part, pants_part, brass_part, steel_part, side_sgn):
    """
    Sculpts one complete Western outlaw leg & boot (facing -Z):
      - Underslung angled Cuban heel resting cleanly at y = 0.002
      - Contoured leather outsole & welt curving to pointed Western toe
      - Sculpted leather vamp, instep arch & toe-bug crest
      - Scalloped stitched cowboy boot shaft with V-dips & side leather pull-straps
      - Curved brass heel spur yoke, instep strap, shank & 8-point star rowel
      - Anatomically lofted riding trouser leg with boot-top blousing, knee flex & thigh muscle
    """
    sx = side_sgn * 0.136

    # 1. Underslung Western Cuban Heel (y = 0.002 .. 0.048, z = +0.022 .. +0.088)
    heel_rings = []
    for hy, taper, z_shift in [(0.002, 0.80, -0.006), (0.024, 0.90, -0.002), (0.048, 1.02, 0.003)]:
        ring = []
        u_segs = 8
        for u in range(u_segs):
            th = (u / u_segs) * math.pi * 2.0
            ca, sa = math.cos(th), math.sin(th)
            rx = 0.044 * taper
            rz = (0.036 if sa > 0 else 0.026) * taper
            sa_eff = (-0.35 + (sa + 0.35) * 0.25) if sa < -0.35 else sa
            ring.append((sx + ca * rx, hy, 0.054 + z_shift + sa_eff * rz))
        heel_rings.append(ring)
    sole_part.add_smooth_grid(heel_rings, closed_u=True, ensure_outward=True)
    sole_part.add_cap_ring(heel_rings[0], (0.0, -1.0, 0.0))

    # 2. Contoured Outsole & Stitched Welt (z = +0.078 -> -0.206, resting at y = 0.002 under ball)
    sole_spine = catmull_rom_chain([
        (sx, 0.044, 0.078),
        (sx, 0.024, 0.008),
        (sx, 0.008, -0.074),
        (sx, 0.020, -0.206),
    ], samples_per_seg=2)

    def sole_sec(t, theta):
        ball_bulge = math.exp(-((t - 0.52) / 0.24) ** 2) * 0.013
        waist_pinch = math.exp(-((t - 0.24) / 0.14) ** 2) * 0.008
        toe_taper = max(0.18, 1.0 - 0.84 * (max(0.0, (t - 0.55) / 0.45) ** 1.45))
        w = (0.048 + ball_bulge - waist_pinch) * toe_taper
        h = 0.0062 * (1.0 - 0.25 * t)
        asym = -side_sgn * 0.004 * math.sin(t * math.pi)
        return (asym + math.cos(theta) * w, math.sin(theta) * h)

    sole_part.add_loft(sole_spine, sole_sec, u_segs=8, cap_start=False, cap_end=True, up_hint=(0.0, 1.0, 0.0))

    # 3. Sculpted Cowboy Boot Vamp, Instep & Pointed Toe
    vamp_spine = catmull_rom_chain([
        (sx, 0.068, 0.062),
        (sx, 0.062, -0.022),
        (sx, 0.038, -0.115),
        (sx, 0.025, -0.200),
    ], samples_per_seg=2)

    def vamp_sec(t, theta):
        toe_k = max(0.0, (t - 0.45) / 0.55)
        w = (0.050 - 0.036 * (toe_k ** 1.35)) * (1.0 + 0.08 * math.sin(t * math.pi))
        h_up = 0.042 * (1.0 - 0.62 * (toe_k ** 1.15))
        h_dn = 0.024 * (1.0 - 0.55 * toe_k)
        s, c = math.sin(theta), math.cos(theta)
        crest = 0.0035 * (max(0.0, s) ** 3) * math.sin(t * math.pi)
        yu = (s * h_up + crest) if s >= 0.0 else (s * h_dn)
        asym = -side_sgn * 0.0035 * math.sin(t * math.pi)
        return (asym + c * w, yu)

    boot_part.add_loft(vamp_spine, vamp_sec, u_segs=10, cap_start=False, cap_end=True, up_hint=(0.0, 1.0, 0.0))

    # 4. Scalloped Stitched Cowboy Boot Shaft (y = 0.065 .. 0.350) with front/back V-dips
    shaft_rings = []
    v_steps = 4
    u_segs = 10
    for v in range(v_steps + 1):
        tf = v / v_steps
        base_y = 0.065 + tf * 0.285
        scallop_amp = (tf ** 2.4) * 0.026
        ankle_pinch = 1.0 - 0.09 * math.exp(-((tf - 0.16) / 0.18) ** 2) + 0.14 * (tf ** 1.1)
        z_lean = -0.006 * math.sin(tf * math.pi)
        ring = []
        for u in range(u_segs):
            ang = (u / u_segs) * math.pi * 2.0
            ca, sa = math.cos(ang), math.sin(ang)
            rx = 0.056 * ankle_pinch
            rz = 0.064 * ankle_pinch
            crease = 1.0 + 0.028 * math.sin(tf * math.pi * 4.0) * math.exp(-((tf - 0.22) / 0.18) ** 2)
            py = base_y + scallop_amp * (ca * ca - sa * sa * 0.65)
            ring.append((sx + ca * rx * crease, py, 0.012 + z_lean + sa * rz * crease))
        shaft_rings.append(ring)
    boot_part.add_smooth_grid(shaft_rings, closed_u=True, ensure_outward=True)

    # Mule-Ear Pull Straps on inner & outer shaft sides
    for strap_sgn in (-1, 1):
        px = sx + strap_sgn * 0.064
        boot_part.add_tube(
            [(px, 0.325, 0.012), (px + strap_sgn * 0.013, 0.368, 0.012), (px - strap_sgn * 0.004, 0.350, 0.012)],
            0.0055, 0.0050, u_segs=4, samples_per_seg=1, cap_start=False, cap_end=False, scale_xy=(0.55, 1.35),
        )

    # 5. Curved Brass Heel Spur, Leather Instep Strap & 8-Point Star Rowel
    spur_y = 0.066
    spur_arc = [
        (sx - 0.054, spur_y + 0.004, 0.004),
        (sx - 0.054, spur_y, 0.062),
        (sx, spur_y - 0.003, 0.098),
        (sx + 0.054, spur_y, 0.062),
        (sx + 0.054, spur_y + 0.004, 0.004),
    ]
    brass_part.add_tube(spur_arc, 0.0065, 0.0065, u_segs=5, samples_per_seg=1, cap_start=False, cap_end=False, scale_xy=(0.75, 1.35))
    sole_part.add_tube(
        [(sx - 0.054, spur_y + 0.005, 0.002), (sx, spur_y + 0.042, -0.046), (sx + 0.054, spur_y + 0.005, 0.002)],
        0.0060, 0.0060, u_segs=4, samples_per_seg=1, cap_start=False, cap_end=False, scale_xy=(1.2, 0.55),
    )
    brass_part.add_tube(
        [(sx, spur_y - 0.003, 0.095), (sx, spur_y - 0.006, 0.132)],
        0.0065, 0.0048, u_segs=5, samples_per_seg=1, cap_start=False, cap_end=False,
    )
    add_star_rowel(brass_part, sx, spur_y - 0.006, 0.138, points=8, r_outer=0.023, r_inner=0.0095, thickness=0.0042)
    steel_part.add_faceted_prism(
        sides=6, r_top=0.0045, r_bot=0.0045, length=0.014,
        center=(sx, spur_y - 0.006, 0.138), rot_euler=(0.0, 0.0, math.pi * 0.5),
    )

    # 6. Anatomically Lofted Riding Trouser Leg (y = 0.318 .. 0.845)
    leg_spine = catmull_rom_chain([
        (sx, 0.318, 0.010),
        (sx * 1.03, 0.505, -0.022),
        (sx * 0.99, 0.675, -0.008),
        (sx * 0.84, 0.845, 0.008),
    ], samples_per_seg=2)

    def leg_sec(t, theta):
        ca, sa = math.cos(theta), math.sin(theta)
        blouse = math.exp(-((t - 0.11) / 0.10) ** 2) * 0.010
        calf = math.exp(-((t - 0.24) / 0.15) ** 2) * 0.008 * max(0.0, sa)
        knee_narrow = -math.exp(-((t - 0.38) / 0.10) ** 2) * 0.006
        thigh = (max(0.0, (t - 0.35) / 0.65) ** 0.88) * 0.032
        crease = 0.0035 * math.sin(t * math.pi * 6.0) * math.exp(-((t - 0.38) / 0.18) ** 2)
        rx = 0.068 + blouse + knee_narrow + thigh * 0.94 + crease
        rz = 0.074 + blouse + calf + knee_narrow + thigh * 1.06 + crease
        return (ca * rx, sa * rz)

    pants_part.add_loft(leg_spine, leg_sec, u_segs=10, cap_start=False, cap_end=False, up_hint=(0.0, 0.0, 1.0))


def build_pelvis_torso_and_waistcoat(pants_part, vest_part, shirt_part, brass_part):
    """
    Builds seamless pelvis/seat, Western henley shirt chest/collar, and fitted saddle-leather
    waistcoat (V-neck cutout, pointed hem tips, notched lapels, welt pockets, brass buttons & watch chain).
    """
    pants_part.add_ellipsoid(
        center=(0.0, 0.835, 0.012),
        radii=(0.205, 0.115, 0.148),
        u_segs=12, v_segs=6,
        deform_fn=lambda x, y, z, f, th: (x * 1.02, y, z * (1.12 if (z > 0.0 and y < 0.03) else (0.92 if z < -0.04 else 1.0))),
    )

    # Upper Shirt Chest & Collar (visible inside V-neck & throat)
    shirt_spine = [(0.0, 1.12, -0.008), (0.0, 1.28, -0.008), (0.0, 1.425, -0.004)]

    def shirt_sec(t, theta):
        tf = 0.48 + 0.52 * t
        w = 0.182 + 0.046 * math.sin(tf * math.pi * 0.74) - 0.055 * (tf ** 3.2)
        d = 0.132 + 0.024 * math.sin(tf * math.pi * 0.68) - 0.035 * (tf ** 3.0)
        return (math.cos(theta) * w, math.sin(theta) * d)

    shirt_part.add_loft(shirt_spine, shirt_sec, u_segs=10, cap_start=False, cap_end=True, up_hint=(0.0, 0.0, 1.0))

    collar_loop = [
        (math.cos(a) * 0.082, 1.425 - 0.012 * max(0.0, -math.sin(a)), -0.006 + math.sin(a) * 0.084)
        for a in [k * math.pi * 2.0 / 10 for k in range(11)]
    ]
    shirt_part.add_tube(collar_loop, 0.015, 0.015, u_segs=5, samples_per_seg=1, cap_start=False, cap_end=False)

    # Fitted Saddle-Leather Waistcoat with V-Neck Cutout & Twin Pointed Front Tips
    vest_rings = []
    v_rows = 7
    u_cols = 14
    for vr in range(v_rows + 1):
        tf = vr / v_rows
        base_y = 0.845 + tf * 0.565
        w = 0.194 + 0.048 * math.sin(tf * math.pi * 0.74) - 0.042 * (tf ** 3.0)
        d = 0.140 + 0.026 * math.sin(tf * math.pi * 0.68) - 0.028 * (tf ** 3.0)
        cz = -0.008 * math.sin(tf * math.pi)
        ring = []
        for uc in range(u_cols):
            ang = (uc / u_cols) * math.pi * 2.0
            ca, sa = math.cos(ang), math.sin(ang)
            py = base_y
            rr_scale = 1.0
            if tf < 0.20 and sa < -0.25:
                tip_f = (1.0 - tf / 0.20) * max(0.0, -sa - 0.25) / 0.75
                notch = 0.032 * math.exp(-((ca / 0.18) ** 2)) - 0.036 * math.exp(-(((abs(ca) - 0.42) / 0.22) ** 2))
                py += notch * tip_f
            if tf > 0.60 and sa < -0.35 and abs(ca) < 0.54:
                v_open = ((tf - 0.60) / 0.40) * (1.0 - abs(ca) / 0.54) * ((-sa - 0.35) / 0.65)
                rr_scale = 1.0 - 0.16 * v_open
                py -= 0.045 * v_open
            ring.append((ca * w * rr_scale, py, cz + sa * d * rr_scale))
        vest_rings.append(ring)
    vest_part.add_smooth_grid(vest_rings, closed_u=True, ensure_outward=True)

    # Waistcoat Lapels, Welt Pockets, 5 Brass Buttons & Watch Chain
    for sgn in (-1, 1):
        vest_part.add_tube(
            [(sgn * 0.016, 1.19, -0.163), (sgn * 0.056, 1.285, -0.152), (sgn * 0.092, 1.375, -0.114)],
            0.020, 0.015, u_segs=5, samples_per_seg=1, cap_start=False, cap_end=False, scale_xy=(1.45, 0.42),
        )
        vest_part.add_tube(
            [(sgn * 0.058, 0.945, -0.152), (sgn * 0.132, 0.960, -0.128)],
            0.009, 0.009, u_segs=5, samples_per_seg=1, cap_start=False, cap_end=False, scale_xy=(0.8, 1.2),
        )

    for by, bz in [(0.895, -0.151), (0.965, -0.157), (1.035, -0.162), (1.105, -0.164), (1.175, -0.163)]:
        brass_part.add_faceted_prism(
            sides=6, r_top=0.0095, r_bot=0.0105, length=0.006,
            center=(0.0, by, bz), rot_euler=(-math.pi * 0.5, 0.0, 0.0), cap_bot=False,
        )

    brass_part.add_tube(
        [(0.004, 0.965, -0.163), (-0.052, 0.916, -0.163), (-0.104, 0.952, -0.144)],
        0.0042, 0.0042, u_segs=4, samples_per_seg=2, cap_start=False, cap_end=False,
    )


def build_duster_coat(coat_part, trim_part, brass_part):
    """
    Builds the signature long, wind-swept open-front & split-tail Western duster coat:
      - Open front (-Z) revealing waistcoat, gunbelt & holster
      - True Western riding split at center-back (+Z) below y = 0.62, dividing cleanly into
        left & right flared coattails behind each leg so the space between the boots/shins is 100% clean!
      - Solid sculpted shoulder yoke + overhanging drover storm capelet covering both arm sockets seamlessly
      - Wide notched lapels, upturned collar & flapped side pockets
    """
    # 1. Closed Sculpted Duster Shoulder Yoke (y = 1.28..1.41) bridging collar smoothly into both deltoid sockets!
    def yoke_deform(x, y, z, frac, theta):
        xx, yy, zz = x, y, z
        # Gentle anatomical slope down toward outer deltoids (±X)
        slope = -0.022 * ((abs(xx) / 0.24) ** 1.6)
        # Keep front V-neck chest zone clear so shirt & waistcoat V-neck shine cleanly
        if zz < -0.05 and abs(xx) < 0.125:
            v_recess = (1.0 - abs(xx) / 0.125) * min(1.0, (-zz - 0.05) / 0.09)
            zz += 0.055 * v_recess
        return (xx, yy + slope, zz)

    coat_part.add_ellipsoid(
        center=(0.0, 1.356, 0.002),
        radii=(0.242, 0.064, 0.146),
        u_segs=16, v_segs=8,
        deform_fn=yoke_deform,
    )

    # 2. Split-Tail Western Riding Duster Panels (Right +1 & Left -1):
    #    Seamless center-back seam above y = 0.62 (hf >= 0.34), parting cleanly into two billowing
    #    riding coattails behind each leg below y = 0.62 so zero polygons cross between the boots!
    v_rows = 12
    u_half = 12
    vent_hf = 0.48  # y ≈ 0.795 (waist-high cavalry riding vent right below gunbelt!)

    for side_sgn in (1, -1):
        panel_rings = []
        for vr in range(v_rows + 1):
            hf = vr / v_rows
            base_y = 0.235 + hf * 1.165  # 0.235 .. 1.400
            skirt_flare = ((max(0.0, 0.58 - hf) / 0.58) ** 1.35) * 0.142
            waist_cinch = -math.exp(-((hf - 0.55) / 0.14) ** 2) * 0.020
            chest_full = math.exp(-((hf - 0.80) / 0.18) ** 2) * 0.030
            shoulder_in = -((max(0.0, hf - 0.88) / 0.12) ** 1.5) * 0.026
            base_rx = 0.244 + skirt_flare * 1.06 + waist_cinch + chest_full + shoulder_in
            base_rz = 0.178 + skirt_flare * 0.90 + waist_cinch * 0.8 + chest_full * 0.85 + shoulder_in * 0.8
            sweep_z = 0.014 + ((1.0 - hf) ** 1.8) * 0.064

            # Front placket opening angle (from -Z = -pi/2) & Back riding-vent split angle (from +Z = +pi/2)
            front_gap = 0.44 + 0.10 * (1.0 - hf)
            back_gap = (0.42 * (((vent_hf - hf) / vent_hf) ** 0.72)) if hf < vent_hf else 0.0

            ring = []
            for uc in range(u_half):
                uf = uc / (u_half - 1)  # 0.0 = front placket edge (-Z side), 1.0 = center-back / vent edge (+Z side)
                # Sweep angle on +X side from (-pi/2 + front_gap) to (+pi/2 - back_gap), mirrored cleanly for -X!
                ang_pos = (-math.pi * 0.5 + front_gap) + uf * (math.pi - front_gap - back_gap)
                ca_abs = math.cos(ang_pos)  # >= 0
                sa = math.sin(ang_pos)
                ca = side_sgn * ca_abs

                # Dampen drapery wave to 0 right at center-back seam (uf -> 1 above vent) so left/right weld seamlessly!
                seam_damp = 1.0 - (max(0.0, (uf - 0.78) / 0.22) ** 2) * (1.0 if hf >= vent_hf else 0.0)
                fold_amp = ((1.0 - hf * 0.78) ** 1.25) * 0.025 * seam_damp
                fold = fold_amp * (math.sin(ang_pos * 7.0 + 0.35 * side_sgn) + 0.42 * math.cos(ang_pos * 11.0))
                holster_clear = (0.028 * math.exp(-((hf - 0.44) / 0.13) ** 2) * ca_abs) if side_sgn > 0 else 0.0

                rx = base_rx + fold + holster_clear
                rz = base_rz + fold * 0.9
                hem_wave = (1.0 - hf) * 0.011 * math.cos(ang_pos * 6.0) * seam_damp
                ring.append((ca * rx, base_y + hem_wave, sweep_z + sa * rz))
            panel_rings.append(ring)

        add_open_grid_outward(coat_part, panel_rings, uv_u_scale=1.0, uv_v_scale=2.0)

        # Rolled 3D Cloth Placket along open front edge + individual coattail bottom hem (strictly behind its own leg!)
        front_edge = [panel_rings[v][0] for v in range(0, v_rows + 1, 2)]
        tail_hem = [panel_rings[0][u] for u in range(0, u_half, 2)] + [panel_rings[0][-1]]
        coat_part.add_tube(front_edge, 0.0085, 0.0075, u_segs=4, samples_per_seg=1, cap_start=False, cap_end=False, scale_xy=(0.85, 1.2))
        coat_part.add_tube(tail_hem, 0.0070, 0.0070, u_segs=4, samples_per_seg=1, cap_start=False, cap_end=False)

        if side_sgn > 0:
            for vr_idx in (4, 6, 8, 10):
                bp = panel_rings[vr_idx][1]
                brass_part.add_faceted_prism(
                    sides=6, r_top=0.0085, r_bot=0.009, length=0.006,
                    center=(bp[0] + 0.004, bp[1], bp[2] - 0.005), rot_euler=(-math.pi * 0.5, 0.0, 0.0), cap_bot=False,
                )

    # 3. Overhanging Western Shoulder Storm Capelet (y = 1.145 .. 1.418)
    #    Generously drapes out over both deltoid caps (rx up to 0.345m) so both shoulder sockets are 100% hooded!
    cape_rings = []
    c_rows = 5
    c_cols = 18
    for vr in range(c_rows + 1):
        hf = vr / c_rows  # 0 = lower overhanging hem, 1 = collar seam
        py_base = 1.168 + hf * 0.248
        # Convex shoulder curve: stays broad over deltoids (hf = 0..0.75) before curving snugly into neck collar
        shoulder_arch = 1.0 - 0.62 * (hf ** 2.15)
        rx_c = 0.346 * shoulder_arch + 0.018 * math.sin(hf * math.pi)
        rz_c = 0.232 * (1.0 - 0.46 * (hf ** 1.65)) + 0.012 * math.sin(hf * math.pi)
        cz_c = 0.008 * (1.0 - hf)
        ring = []
        for uc in range(c_cols):
            uf = uc / (c_cols - 1)
            ang = (-math.pi * 0.5 + 0.34) + uf * (math.pi * 2.0 - 0.68)
            ca, sa = math.cos(ang), math.sin(ang)
            ripple = (1.0 - hf) * 0.013 * math.sin(ang * 8.0)
            # Drapes lower (-0.032m) directly over left & right deltoids (±X) to hood arm sockets completely!
            deltoid_drape = -0.032 * (1.0 - hf * 0.85) * (ca * ca)
            ring.append((ca * (rx_c + ripple), py_base + deltoid_drape, cz_c + sa * (rz_c + ripple)))
        cape_rings.append(ring)
    add_open_grid_outward(coat_part, cape_rings)
    cape_hem = [cape_rings[0][u] for u in range(0, c_cols, 2)] + [cape_rings[0][-1]]
    coat_part.add_tube(cape_hem, 0.0065, 0.0065, u_segs=4, samples_per_seg=1, cap_start=False, cap_end=False)

    # 4. Wide Sculpted Duster Lapels & Flapped Hip Pockets
    for sgn in (-1, 1):
        lapel_rings = []
        for ly, w_in, w_out, z_in, z_out in [
            (1.04, 0.118, 0.142, -0.156, -0.164),
            (1.16, 0.110, 0.175, -0.160, -0.174),
            (1.28, 0.102, 0.186, -0.150, -0.162),
            (1.40, 0.090, 0.122, -0.085, -0.098),
        ]:
            lapel_rings.append([
                (sgn * w_in, ly, z_in),
                (sgn * ((w_in + w_out) * 0.5), ly, (z_in + z_out) * 0.5 - 0.008),
                (sgn * w_out, ly - 0.008, z_out),
            ])
        add_open_grid_outward(trim_part, lapel_rings)

        flap_spine = [(sgn * 0.258, 0.72, -0.085), (sgn * 0.275, 0.715, -0.015), (sgn * 0.264, 0.71, 0.055)]
        trim_part.add_tube(flap_spine, 0.016, 0.015, u_segs=4, samples_per_seg=1, cap_start=False, cap_end=False, scale_xy=(0.42, 1.65))

    # 5. Standing Upturned Leather-Trimmed Duster Collar
    collar_rings = []
    for vr in range(3):
        hf = vr / 2.0
        py = 1.385 + hf * 0.075
        rx_k = 0.112 + hf * 0.018
        rz_k = 0.108 + hf * 0.020
        ring = []
        for uc in range(10):
            ang = (-math.pi * 0.5 + 0.52) + (uc / 9.0) * (math.pi * 2.0 - 1.04)
            ring.append((math.cos(ang) * rx_k, py, 0.005 + math.sin(ang) * rz_k))
        collar_rings.append(ring)
    add_open_grid_outward(trim_part, collar_rings)


def build_gunbelt_and_holster(belt_part, holster_part, brass_part, copper_part):
    """
    Builds the slanted outlaw gunbelt, sculpted frontier trophy/frame brass buckle (-Z),
    10 individual brass-cased copper-tipped cartridges in leather loops, and right-thigh
    Mexican-loop contoured leather holster with rawhide thigh tie-down strap.
    """
    u_pts = 16
    belt_pts = []
    for i in range(u_pts + 1):
        ang = (i / u_pts) * math.pi * 2.0
        ca, sa = math.cos(ang), math.sin(ang)
        belt_pts.append((ca * 0.228, 0.825 - ca * 0.032 + 0.004 * math.cos(ang * 2.0), 0.008 + sa * 0.168))

    belt_part.add_loft(
        belt_pts,
        lambda t, th: (math.cos(th) * 0.013, math.sin(th) * 0.031),
        u_segs=6, cap_start=False, cap_end=False, up_hint=(0.0, 1.0, 0.0),
    )

    # Ornate Frontier Brass Frame Buckle at -Z
    buckle_loop = [
        (-0.036, 0.854, -0.166),
        (0.036, 0.848, -0.166),
        (0.036, 0.804, -0.164),
        (-0.036, 0.810, -0.164),
        (-0.036, 0.854, -0.166),
    ]
    brass_part.add_tube(buckle_loop, 0.0075, 0.0075, u_segs=5, samples_per_seg=1, cap_start=False, cap_end=False)
    brass_part.add_tube([(0.0, 0.851, -0.166), (0.0, 0.807, -0.164)], 0.0045, 0.0045, u_segs=4, samples_per_seg=1, cap_start=False, cap_end=False)
    brass_part.add_tube([(0.002, 0.829, -0.168), (-0.034, 0.831, -0.173)], 0.0038, 0.0025, u_segs=4, samples_per_seg=1, cap_start=False)

    # 10 Individual Brass-Cased Copper-Tipped .45 Colt Cartridges in Leather Belt Loops
    for ang in (-2.52, -2.28, -2.04, 2.82, 2.54, 2.26, 1.98, 1.70, 1.42, 1.16):
        ca, sa = math.cos(ang), math.sin(ang)
        cx = ca * 0.240
        cz = 0.008 + sa * 0.180
        cy = 0.825 - ca * 0.032
        brass_part.add_faceted_prism(sides=5, r_top=0.0054, r_bot=0.0054, length=0.031, center=(cx, cy + 0.004, cz), cap_bot=False)
        copper_part.add_faceted_prism(sides=5, r_top=0.0050, r_bot=0.0018, length=0.013, center=(cx, cy - 0.018, cz), cap_top=False)
        holster_part.add_faceted_prism(sides=5, r_top=0.0066, r_bot=0.0066, length=0.014, center=(cx, cy + 0.002, cz), cap_top=False, cap_bot=False)

    # Sculpted Right-Thigh Mexican-Loop Leather Holster (+X, y = 0.525 .. 0.805)
    skirt_spine = [(0.236, 0.805, -0.008), (0.252, 0.680, -0.014), (0.234, 0.530, -0.006)]
    holster_part.add_loft(
        skirt_spine,
        lambda t, th: (math.cos(th) * 0.008, math.sin(th) * 0.056 * math.sin(t * math.pi * 0.82 + 0.25)),
        u_segs=6, cap_start=False, cap_end=True, up_hint=(0.0, 0.0, 1.0),
    )

    pouch_spine = catmull_rom_chain([(0.256, 0.775, -0.022), (0.268, 0.665, -0.025), (0.248, 0.525, -0.012)], samples_per_seg=2)
    holster_part.add_loft(
        pouch_spine,
        lambda t, th: (math.cos(th) * 0.032 * (1.0 - 0.46 * (t ** 1.15)), math.sin(th) * 0.048 * (1.0 - 0.50 * (t ** 1.15))),
        u_segs=8, cap_start=False, cap_end=True, up_hint=(0.0, 0.0, 1.0),
    )
    throat_ring = [
        (0.256 + math.cos(a) * 0.033, 0.776 + 0.010 * math.sin(a), -0.022 + math.sin(a) * 0.049)
        for a in [k * math.pi * 2.0 / 8 for k in range(9)]
    ]
    holster_part.add_tube(throat_ring, 0.0055, 0.0055, u_segs=4, samples_per_seg=1, cap_start=False, cap_end=False)

    # Leather Thigh Tie-Down Strap wrapping around right leg at y = 0.605
    thigh_cx, thigh_cz = 0.136, -0.008
    tie_loop = [
        (thigh_cx + math.cos(a) * 0.104 + (0.012 if math.cos(a) > 0 else 0.0), 0.605, thigh_cz + math.sin(a) * 0.108)
        for a in [k * math.pi * 2.0 / 9 for k in range(10)]
    ]
    belt_part.add_tube(tie_loop, 0.0075, 0.0075, u_segs=4, samples_per_seg=1, cap_start=False, cap_end=False, scale_xy=(0.55, 1.35))


def build_head_bandana_and_stetson(skin_part, sclera_part, dark_part, bandana_part, hat_part, brass_part):
    """
    Sculpts the anatomical frontier head (facing -Z), fierce eyes & angled brows,
    pleated red outlaw bandana mask with rear knot & tails, and authentic Cattleman Stetson hat
    topping cleanly at y ≈ 1.840m.
    """
    skin_part.add_tube(
        [(0.0, 1.395, -0.004), (0.0, 1.520, -0.010)],
        0.068, 0.061, u_segs=8, samples_per_seg=1, cap_start=False, cap_end=False,
    )

    def head_deform(x, y, z, frac, theta):
        xx, yy, zz = x, y, z
        if yy < -0.015:
            jaw_f = min(1.0, (-yy - 0.015) / 0.13)
            xx *= 1.0 - 0.24 * jaw_f
            if zz < 0.0:
                zz *= 1.0 + 0.06 * jaw_f
        cheek = math.exp(-((yy - 0.002) / 0.036) ** 2) * (1.0 if zz < -0.03 else 0.0)
        xx *= 1.0 + 0.08 * cheek
        if zz < -0.07:
            eye_dip = math.exp(-((yy - 0.018) / 0.024) ** 2) * math.exp(-(((abs(xx) - 0.050) / 0.032) ** 2))
            zz += 0.016 * eye_dip
            brow_push = math.exp(-((yy - 0.044) / 0.018) ** 2) * math.exp(-((xx / 0.095) ** 2))
            zz -= 0.015 * brow_push
        temple = math.exp(-((yy - 0.038) / 0.045) ** 2) * (1.0 if abs(zz) < 0.06 else 0.0)
        xx *= 1.0 - 0.05 * temple
        return (xx, yy, zz)

    skin_part.add_ellipsoid(
        center=(0.0, 1.578, -0.012),
        radii=(0.126, 0.148, 0.142),
        u_segs=14, v_segs=10,
        deform_fn=head_deform,
    )

    skin_part.add_tube(
        [(0.0, 1.612, -0.146), (0.0, 1.582, -0.166), (0.0, 1.556, -0.178)],
        0.014, 0.019, u_segs=6, samples_per_seg=1, cap_start=False, cap_end=False, scale_xy=(0.85, 1.1),
    )

    for sgn in (-1, 1):
        ear_arc = [
            (sgn * 0.122, 1.598, -0.018),
            (sgn * 0.141, 1.586, 0.004),
            (sgn * 0.132, 1.548, 0.000),
        ]
        skin_part.add_tube(ear_arc, 0.011, 0.009, u_segs=5, samples_per_seg=1, cap_start=False, scale_xy=(0.65, 1.25))
        dark_part.add_tube(
            [(sgn * 0.118, 1.635, -0.032), (sgn * 0.122, 1.585, -0.036)],
            0.012, 0.007, u_segs=4, samples_per_seg=1, cap_start=False, scale_xy=(0.45, 1.2),
        )

        ex, ey, ez = sgn * 0.049, 1.596, -0.140
        sclera_part.add_ellipsoid(center=(ex, ey, ez), radii=(0.019, 0.013, 0.014), u_segs=7, v_segs=4)
        dark_part.add_ellipsoid(center=(ex - sgn * 0.002, ey, ez - 0.0105), radii=(0.0095, 0.0095, 0.0055), u_segs=6, v_segs=4)

        skin_part.add_tube(
            [(sgn * 0.030, ey + 0.003, ez - 0.009), (ex, ey + 0.009, ez - 0.013), (sgn * 0.068, ey + 0.002, ez - 0.006)],
            0.0048, 0.0042, u_segs=4, samples_per_seg=1, cap_start=False, cap_end=False,
        )
        dark_part.add_tube(
            [(sgn * 0.018, 1.608, -0.156), (sgn * 0.050, 1.621, -0.153), (sgn * 0.082, 1.615, -0.136)],
            0.0095, 0.0055, u_segs=5, samples_per_seg=1, cap_start=False, scale_xy=(1.1, 0.8),
        )

    # Pleated Red Triangular Outlaw Bandana Mask
    b_rows = 6
    b_cols = 14
    bandana_rings = []
    for vr in range(b_rows + 1):
        tf = vr / b_rows
        ring = []
        for uc in range(b_cols):
            ang = (uc / b_cols) * math.pi * 2.0
            ca, sa = math.cos(ang), math.sin(ang)
            front_w = max(0.0, -sa)

            y_top = 1.540 + 0.028 * (-sa)
            tri_point = (front_w ** 1.65) * 0.145
            y_bot = 1.462 - tri_point - 0.020 * (1.0 - abs(sa))
            py = y_bot + tf * (y_top - y_bot)

            taper_front = 1.0 - (1.0 - tf) * 0.58 * (front_w ** 1.4)
            rx = (0.118 + 0.018 * tf) * taper_front
            rz = (0.172 * (0.62 + 0.38 * tf) + 0.018 * (front_w ** 2) * tf) if sa < 0.0 else (0.136 + 0.014 * tf)

            pleat = 0.0055 * math.sin(tf * math.pi * 5.0 + abs(ca) * 3.5) * (0.35 + 0.65 * front_w) * math.sin(tf * math.pi)
            ring.append((ca * (rx + pleat), py, -0.010 + sa * (rz + pleat)))
        bandana_rings.append(ring)
    bandana_part.add_smooth_grid(bandana_rings, closed_u=True, ensure_outward=True)

    top_hem = [bandana_rings[-1][u] for u in range(0, b_cols, 2)] + [bandana_rings[-1][0]]
    bandana_part.add_tube(top_hem, 0.0065, 0.0065, u_segs=4, samples_per_seg=1, cap_start=False, cap_end=False)
    bandana_part.add_ellipsoid(center=(0.0, 1.508, 0.144), radii=(0.032, 0.026, 0.026), u_segs=7, v_segs=5)
    for sgn in (-1, 1):
        bandana_part.add_tube(
            [(sgn * 0.012, 1.502, 0.152), (sgn * 0.042, 1.448, 0.178), (sgn * 0.068, 1.380, 0.188)],
            0.019, 0.006, u_segs=5, samples_per_seg=1, cap_start=False, scale_xy=(1.35, 0.45),
        )

    # Authentic Curved Cattleman Stetson Cowboy Hat (crown peak y_max ≈ 1.841m)
    hat_cx, hat_cy, hat_cz = 0.0, 1.636, -0.014
    hat_tilt = (0.105, 0.0, -0.045)
    hat_scale = 0.94

    stetson_profile = [
        (0.002, 0.142),
        (0.144, 0.018),
        (0.172, -0.004),
        (0.268, -0.010),
        (0.354, 0.006),
        (0.358, 0.017),
        (0.264, 0.003),
        (0.176, 0.012),
        (0.160, 0.135),
        (0.118, 0.205),
        (0.056, 0.182),
        (0.002, 0.176),
    ]

    def stetson_deform(x, y, z, ang):
        r = math.hypot(x, z)
        xx = x * 0.93
        zz = z * 1.13
        yy = y
        front_z = -zz

        if r > 0.174:
            side_f = min(1.2, abs(xx) / 0.32)
            yy += (side_f * side_f) * 0.084
            if front_z > 0.12:
                yy -= ((front_z - 0.12) / 0.26) * 0.032
            elif front_z < -0.14:
                yy += ((-front_z - 0.14) / 0.24) * 0.018
        elif yy > 0.09:
            h_f = min(1.0, (yy - 0.09) / 0.11)
            if front_z > -0.02:
                pinch = max(0.0, min(1.0, (front_z + 0.02) / 0.18)) * h_f
                xx *= 1.0 - 0.28 * pinch
            yy -= max(0.0, -front_z) * 0.055 * h_f

        return (xx * hat_scale, yy * hat_scale, zz * hat_scale)

    hat_part.add_lathe(
        stetson_profile,
        u_segs=20,
        translate=(hat_cx, hat_cy, hat_cz),
        rot_euler=hat_tilt,
        deform_fn=stetson_deform,
    )

    band_pts = [
        (
            math.cos((k / 14.0) * math.pi * 2.0) * 0.176 * 0.93 * hat_scale,
            0.024 * hat_scale,
            math.sin((k / 14.0) * math.pi * 2.0) * 0.176 * 1.13 * hat_scale,
        )
        for k in range(15)
    ]
    bandana_part.add_tube(
        band_pts, 0.0125 * hat_scale, 0.0125 * hat_scale,
        u_segs=4, samples_per_seg=1, cap_start=False, cap_end=False,
        scale_xy=(0.65, 1.35),
        translate=(hat_cx, hat_cy, hat_cz), rot_euler=hat_tilt,
    )
    brass_part.add_beveled_box(
        hat_cx - 0.160 * hat_scale, hat_cy + 0.032 * hat_scale, hat_cz - 0.038 * hat_scale,
        0.010, 0.026, 0.030, bevel=0.0025, rot_euler=hat_tilt,
    )


def build_left_arm_and_hand(coat_part, trim_part, shirt_part, skin_part, brass_part):
    """
    Sculpts the natural bent left outlaw arm (-X) tucked seamlessly into the shoulder yoke
    with a rounded deltoid cap, sleeve creases, cuff, contoured palm, thumb & 4 curled fingers.
    """
    # Rounded inward-tucked deltoid shoulder dome bridging seamlessly into duster shoulder yoke!
    coat_part.add_ellipsoid(
        center=(-0.208, 1.344, -0.004),
        radii=(0.076, 0.072, 0.070),
        u_segs=10, v_segs=6,
        rot_euler=(0.0, 0.0, 0.25),
    )

    sleeve_spine = catmull_rom_chain([
        (-0.178, 1.362, -0.006),   # tucked deep inside shoulder yoke
        (-0.222, 1.328, -0.002),   # smooth deltoid curve
        (-0.296, 1.118, 0.026),    # bent elbow
        (-0.316, 0.905, -0.078),   # wrist
    ], samples_per_seg=2)

    def sleeve_sec(t, theta):
        r_base = 0.065 * (1.0 - 0.18 * t)
        elbow_fold = 0.0055 * math.sin(t * math.pi * 6.0) * math.exp(-((t - 0.56) / 0.18) ** 2)
        return (math.cos(theta) * (r_base + elbow_fold) * 0.94, math.sin(theta) * (r_base + elbow_fold) * 1.06)

    coat_part.add_loft(sleeve_spine, sleeve_sec, u_segs=9, cap_start=True, cap_end=False, up_hint=(0.0, 0.0, 1.0))

    trim_part.add_tube([(-0.314, 0.942, -0.056), (-0.316, 0.896, -0.084)], 0.057, 0.059, u_segs=8, samples_per_seg=1, cap_start=False)
    brass_part.add_faceted_prism(sides=6, r_top=0.007, r_bot=0.007, length=0.006, center=(-0.372, 0.922, -0.068), rot_euler=(0.0, 0.0, math.pi * 0.5))
    shirt_part.add_tube([(-0.316, 0.900, -0.082), (-0.314, 0.882, -0.094)], 0.045, 0.043, u_segs=7, samples_per_seg=1, cap_start=False)

    wx, wy, wz = -0.312, 0.858, -0.112
    skin_part.add_ellipsoid(center=(wx, wy, wz), radii=(0.026, 0.042, 0.036), u_segs=8, v_segs=5, rot_euler=(0.45, 0.15, 0.12))
    skin_part.add_tube(
        [(wx + 0.016, wy + 0.008, wz - 0.012), (wx + 0.028, wy - 0.012, wz - 0.034), (wx + 0.024, wy - 0.032, wz - 0.044)],
        0.012, 0.0085, u_segs=5, samples_per_seg=1, cap_start=False,
    )
    for z_off, len_s in [(-0.022, 1.02), (-0.007, 1.08), (0.008, 1.00), (0.021, 0.86)]:
        skin_part.add_tube(
            [
                (wx - 0.006, wy - 0.028, wz + z_off - 0.012),
                (wx - 0.004, wy - 0.056 * len_s, wz + z_off - 0.020),
                (wx + 0.014, wy - 0.068 * len_s, wz + z_off - 0.006),
            ],
            0.0095, 0.0068, u_segs=4, samples_per_seg=1, cap_start=False,
        )


def build_colt_revolver_and_right_forearm(rf_gp, mats):
    """
    Populates the "rightFore" elbow-pivoted mesh with forearm, cuff, sculpted gun-hand,
    and detailed fluted-cylinder octagonal-barrel Colt revolver pointing -Z.
    Returns exact local (x, y, z) coordinates for the "muzzle" child node.
    """
    coat = rf_gp(mats["coat"])
    trim = rf_gp(mats["trim"])
    shirt = rf_gp(mats["shirt"])
    skin = rf_gp(mats["skin"])
    steel = rf_gp(mats["gun_blued"])
    silver = rf_gp(mats["gun_silver"])
    brass = rf_gp(mats["brass"])
    walnut = rf_gp(mats["walnut"])
    dark = rf_gp(mats["dark"])

    coat.add_ellipsoid(center=(0.0, 0.0, 0.0), radii=(0.056, 0.058, 0.056), u_segs=8, v_segs=5)
    fore_spine = [(0.0, 0.0, 0.0), (0.006, 0.010, -0.102), (0.010, 0.018, -0.198)]
    coat.add_loft(
        fore_spine,
        lambda t, th: (math.cos(th) * (0.056 * (1.0 - 0.16 * t)) * 0.95, math.sin(th) * (0.056 * (1.0 - 0.16 * t)) * 1.05),
        u_segs=8, cap_start=False, cap_end=False, up_hint=(0.0, 1.0, 0.0),
    )

    trim.add_tube([(0.009, 0.016, -0.168), (0.010, 0.018, -0.204)], 0.053, 0.055, u_segs=8, samples_per_seg=1, cap_start=False)
    brass.add_faceted_prism(sides=6, r_top=0.007, r_bot=0.007, length=0.006, center=(0.064, 0.020, -0.186), rot_euler=(0.0, 0.0, math.pi * 0.5))
    shirt.add_tube([(0.010, 0.018, -0.200), (0.010, 0.018, -0.216)], 0.042, 0.040, u_segs=7, samples_per_seg=1, cap_start=False)

    # Sculpted Right Gun-Hand
    gx = 0.010
    skin.add_ellipsoid(center=(gx + 0.006, 0.016, -0.240), radii=(0.026, 0.036, 0.034), u_segs=8, v_segs=5, rot_euler=(0.15, -0.08, -0.10))
    skin.add_tube([(gx - 0.012, 0.028, -0.232), (gx - 0.022, 0.036, -0.256), (gx - 0.015, 0.030, -0.278)], 0.0115, 0.0085, u_segs=4, samples_per_seg=1, cap_start=False)
    skin.add_tube([(gx + 0.018, 0.022, -0.256), (gx + 0.018, 0.015, -0.285), (gx + 0.004, 0.012, -0.292)], 0.0090, 0.0068, u_segs=4, samples_per_seg=1, cap_start=False)
    for fi, gy_off in enumerate((-0.004, -0.021, -0.037)):
        z_f = -0.260 + fi * 0.006
        skin.add_tube(
            [(gx + 0.020, gy_off + 0.004, z_f + 0.010), (gx + 0.012, gy_off, z_f - 0.015), (gx - 0.014, gy_off + 0.002, z_f - 0.010)],
            0.0092, 0.0070, u_segs=4, samples_per_seg=1, cap_start=False,
        )

    # Colt Single-Action / Navy Revolver pointing -Z
    grip_spine = [(gx, 0.024, -0.254), (gx, -0.016, -0.242), (gx, -0.056, -0.222)]
    walnut.add_loft(
        grip_spine,
        lambda t, th: (math.cos(th) * (0.014 + 0.005 * (t ** 1.2)), math.sin(th) * (0.021 + 0.008 * (t ** 1.1))),
        u_segs=8, cap_start=False, cap_end=True, up_hint=(0.0, 0.0, -1.0),
    )
    brass.add_tube([(gx, 0.034, -0.244), (gx, -0.014, -0.224), (gx, -0.058, -0.204)], 0.0065, 0.0075, u_segs=4, samples_per_seg=1, cap_start=False, scale_xy=(1.1, 0.65))

    steel.add_beveled_box(gx, 0.026, -0.308, 0.024, 0.020, 0.098, bevel=0.0035)
    steel.add_beveled_box(gx, 0.066, -0.312, 0.018, 0.009, 0.092, bevel=0.0025)
    steel.add_beveled_box(gx, 0.046, -0.352, 0.024, 0.042, 0.018, bevel=0.0035)
    steel.add_ellipsoid(center=(gx, 0.045, -0.264), radii=(0.024, 0.024, 0.012), u_segs=8, v_segs=5)

    brass.add_tube([(gx, 0.018, -0.268), (gx, -0.009, -0.282), (gx, -0.009, -0.304), (gx, 0.018, -0.316)], 0.0042, 0.0042, u_segs=4, samples_per_seg=1, cap_start=False, cap_end=False, scale_xy=(1.3, 0.85))
    silver.add_tube([(gx, 0.019, -0.286), (gx, 0.002, -0.292)], 0.0035, 0.0022, u_segs=4, samples_per_seg=1, cap_start=False)
    silver.add_tube([(gx, 0.052, -0.256), (gx, 0.072, -0.250), (gx, 0.078, -0.236)], 0.0048, 0.0035, u_segs=4, samples_per_seg=1, cap_start=False, scale_xy=(0.8, 1.3))

    # Sculpted 6-Chamber Fluted Revolving Cylinder
    cyl_spine = [(gx, 0.045, -0.272), (gx, 0.045, -0.306), (gx, 0.045, -0.340)]

    def cyl_sec(t, theta):
        flute = 0.0030 * max(0.0, math.cos(theta * 6.0 + math.pi / 6.0)) * (0.35 + 0.65 * math.sin(t * math.pi))
        r = 0.0255 - flute
        return (math.cos(theta) * r, math.sin(theta) * r)

    steel.add_loft(cyl_spine, cyl_sec, u_segs=18, cap_start=True, cap_end=True, up_hint=(0.0, 1.0, 0.0))

    # Crisp Faceted Octagonal Colt Barrel (z = -0.356 .. -0.578 at y = 0.051)
    barrel_y = 0.051
    barrel_len = 0.222
    barrel_mid_z = -0.356 - barrel_len * 0.5
    steel.add_faceted_prism(
        sides=8, r_top=0.0132, r_bot=0.0156, length=barrel_len,
        center=(gx, barrel_y, barrel_mid_z), rot_euler=(-math.pi * 0.5, 0.0, 0.0), twist_offset=math.pi / 8.0,
    )
    steel.add_faceted_prism(
        sides=8, r_top=0.0172, r_bot=0.0182, length=0.022,
        center=(gx, barrel_y, -0.360), rot_euler=(-math.pi * 0.5, 0.0, 0.0), twist_offset=math.pi / 8.0,
    )
    steel.add_beveled_box(gx, barrel_y + 0.014, barrel_mid_z, 0.009, 0.005, barrel_len * 0.94, bevel=0.0012)
    brass.add_beveled_box(gx, barrel_y + 0.021, -0.558, 0.0038, 0.013, 0.016, bevel=0.0010, rot_euler=(-0.22, 0.0, 0.0))

    # Under-barrel Ejector Rod Housing, Steel Pin & Brass Crescent Button
    steel.add_tube([(gx + 0.008, barrel_y - 0.016, -0.360), (gx + 0.008, barrel_y - 0.016, -0.538)], 0.0065, 0.0060, u_segs=6, samples_per_seg=1, cap_start=False)
    silver.add_tube([(gx, barrel_y - 0.017, -0.356), (gx, barrel_y - 0.017, -0.548)], 0.0038, 0.0038, u_segs=5, samples_per_seg=1, cap_start=False)
    brass.add_faceted_prism(sides=8, r_top=0.0082, r_bot=0.0082, length=0.014, center=(gx + 0.007, barrel_y - 0.018, -0.546), rot_euler=(-math.pi * 0.5, 0.0, 0.0))

    # Beveled Muzzle Crown & Dark Recessed Bore
    silver.add_faceted_prism(sides=8, r_top=0.0126, r_bot=0.0132, length=0.005, center=(gx, barrel_y, -0.580), rot_euler=(-math.pi * 0.5, 0.0, 0.0), cap_bot=False)
    dark.add_faceted_prism(sides=8, r_top=0.0082, r_bot=0.0082, length=0.006, center=(gx, barrel_y, -0.581), rot_euler=(-math.pi * 0.5, 0.0, 0.0), cap_bot=False)

    return (gx, barrel_y, -0.586)


# ---------------------------------------------------------------------------
# Main Builder Entrypoint
# ---------------------------------------------------------------------------

def build_bandit_glb(out_path):
    """Builds the sculpted & animated Western Bandit GLB at `out_path` and returns export stats."""
    b = GLBBuilder()

    mats = {
        "coat": b.add_material("BanditDusterCoat", (0.23, 0.16, 0.12), metallic=0.02, roughness=0.84, double_sided=True),
        "trim": b.add_material("BanditCoatTrim", (0.15, 0.10, 0.07), metallic=0.04, roughness=0.68, double_sided=True),
        "vest": b.add_material("BanditLeatherVest", (0.44, 0.25, 0.13), metallic=0.04, roughness=0.68),
        "shirt": b.add_material("BanditShirt", (0.76, 0.70, 0.59), metallic=0.01, roughness=0.86),
        "pants": b.add_material("BanditTrousers", (0.15, 0.17, 0.20), metallic=0.02, roughness=0.87),
        "boot": b.add_material("BanditBootLeather", (0.12, 0.075, 0.05), metallic=0.07, roughness=0.46),
        "sole": b.add_material("BanditOutsoleLeather", (0.08, 0.05, 0.035), metallic=0.04, roughness=0.62),
        "holster": b.add_material("BanditHolsterLeather", (0.20, 0.11, 0.06), metallic=0.06, roughness=0.50, double_sided=True),
        "skin": b.add_material("BanditSkin", (0.78, 0.55, 0.40), metallic=0.01, roughness=0.66),
        "hat": b.add_material("BanditStetson", (0.16, 0.10, 0.07), metallic=0.02, roughness=0.80, double_sided=True),
        "bandana": b.add_material("BanditRedBandana", (0.68, 0.09, 0.09), metallic=0.02, roughness=0.75, double_sided=True),
        "brass": b.add_material("PolishedBrass", (0.88, 0.70, 0.33), metallic=0.92, roughness=0.22),
        "copper": b.add_material("CopperBulletTip", (0.78, 0.43, 0.25), metallic=0.86, roughness=0.28),
        "gun_blued": b.add_material("GunBluedSteel", (0.20, 0.23, 0.28), metallic=0.90, roughness=0.24),
        "gun_silver": b.add_material("GunSilverSteel", (0.74, 0.77, 0.82), metallic=0.92, roughness=0.20),
        "walnut": b.add_material("GunWalnutGrip", (0.34, 0.16, 0.07), metallic=0.04, roughness=0.42),
        "sclera": b.add_material("BanditEyeSclera", (0.90, 0.87, 0.82), metallic=0.0, roughness=0.25),
        "dark": b.add_material("BanditDarkAccent", (0.07, 0.045, 0.035), metallic=0.04, roughness=0.28),
    }

    root = b.add_node("BanditRoot")

    # 1. Main Body Mesh
    body_parts, gp = b.create_parts_dict()
    for sgn in (-1, 1):
        build_cowboy_boot_and_leg(
            gp(mats["boot"]),
            gp(mats["sole"]),
            gp(mats["pants"]),
            gp(mats["brass"]),
            gp(mats["gun_silver"]),
            sgn,
        )

    build_pelvis_torso_and_waistcoat(
        gp(mats["pants"]),
        gp(mats["vest"]),
        gp(mats["shirt"]),
        gp(mats["brass"]),
    )

    build_duster_coat(
        gp(mats["coat"]),
        gp(mats["trim"]),
        gp(mats["brass"]),
    )

    build_gunbelt_and_holster(
        gp(mats["boot"]),
        gp(mats["holster"]),
        gp(mats["brass"]),
        gp(mats["copper"]),
    )

    build_left_arm_and_hand(
        gp(mats["coat"]),
        gp(mats["trim"]),
        gp(mats["shirt"]),
        gp(mats["skin"]),
        gp(mats["brass"]),
    )

    body_mesh = b.add_mesh_from_parts("BanditBodyMesh", body_parts.values())
    b.add_node("BanditBody", mesh_idx=body_mesh, parent_idx=root)

    # 2. Head, Outlaw Bandana & Curved Stetson Node ("head")
    head_parts, h_gp = b.create_parts_dict()
    build_head_bandana_and_stetson(
        h_gp(mats["skin"]),
        h_gp(mats["sclera"]),
        h_gp(mats["dark"]),
        h_gp(mats["bandana"]),
        h_gp(mats["hat"]),
        h_gp(mats["brass"]),
    )
    head_mesh = b.add_mesh_from_parts("BanditHeadMesh", head_parts.values())
    b.add_node("head", mesh_idx=head_mesh, parent_idx=root)

    # 3. Articulated Right Shooting Arm Hierarchy:
    #    "rightUpper" (inward-tucked shoulder pivot) -> "rightFore" (elbow pivot) -> Colt Revolver -> "muzzle"
    ru_parts, ru_gp = b.create_parts_dict()
    ru_coat = ru_gp(mats["coat"])
    # Inward-tucked rounded deltoid dome bridging seamlessly into duster shoulder yoke & storm capelet!
    ru_coat.add_ellipsoid(
        center=(-0.012, 0.006, 0.004),
        radii=(0.078, 0.074, 0.070),
        u_segs=10, v_segs=6,
        rot_euler=(0.0, 0.0, -0.22),
    )
    ru_spine = catmull_rom_chain([
        (-0.022, 0.014, 0.006),
        (0.018, -0.038, -0.095),
        (0.064, -0.114, -0.213),
    ], samples_per_seg=2)
    ru_coat.add_loft(
        ru_spine,
        lambda t, th: (math.cos(th) * (0.065 * (1.0 - 0.14 * t)) * 0.95, math.sin(th) * (0.065 * (1.0 - 0.14 * t)) * 1.05),
        u_segs=9, cap_start=True, cap_end=False, up_hint=(0.0, 1.0, 0.0),
    )
    ru_mesh = b.add_mesh_from_parts("BanditRightUpperMesh", ru_parts.values())
    ru_node = b.add_node("rightUpper", translation=(0.216, 1.348, -0.012), mesh_idx=ru_mesh, parent_idx=root)

    rf_parts, rf_gp = b.create_parts_dict()
    muzzle_local = build_colt_revolver_and_right_forearm(rf_gp, mats)
    rf_mesh = b.add_mesh_from_parts("BanditRightForeMesh", rf_parts.values())
    rf_node = b.add_node("rightFore", translation=(0.064, -0.114, -0.213), mesh_idx=rf_mesh, parent_idx=ru_node)

    b.add_node("muzzle", translation=muzzle_local, parent_idx=rf_node)

    # 4. Embedded glTF Quaternion Animations ("Idle" 2.0s & "Attack" 0.35s)
    idle_times = [0.0, 0.5, 1.0, 1.5, 2.0]
    b.add_animation("Idle", [
        {
            "node": ru_node,
            "path": "rotation",
            "times": idle_times,
            "values": [
                quat_from_euler_xyz(0.0, 0.0, 0.0),
                quat_from_euler_xyz(0.022, -0.015, 0.008),
                quat_from_euler_xyz(0.036, 0.0, 0.012),
                quat_from_euler_xyz(0.016, 0.014, 0.004),
                quat_from_euler_xyz(0.0, 0.0, 0.0),
            ],
        },
        {
            "node": rf_node,
            "path": "rotation",
            "times": idle_times,
            "values": [
                quat_from_euler_xyz(0.0, 0.0, 0.0),
                quat_from_euler_xyz(0.018, 0.010, 0.0),
                quat_from_euler_xyz(0.028, -0.008, -0.010),
                quat_from_euler_xyz(0.012, -0.012, 0.0),
                quat_from_euler_xyz(0.0, 0.0, 0.0),
            ],
        },
    ])

    attack_times = [0.0, 0.055, 0.13, 0.25, 0.35]
    b.add_animation("Attack", [
        {
            "node": ru_node,
            "path": "rotation",
            "times": attack_times,
            "values": [
                quat_from_euler_xyz(0.0, 0.0, 0.0),
                quat_from_euler_xyz(0.20, -0.035, -0.025),
                quat_from_euler_xyz(0.14, -0.020, -0.015),
                quat_from_euler_xyz(-0.022, 0.006, 0.0),
                quat_from_euler_xyz(0.0, 0.0, 0.0),
            ],
        },
        {
            "node": rf_node,
            "path": "rotation",
            "times": attack_times,
            "values": [
                quat_from_euler_xyz(0.0, 0.0, 0.0),
                quat_from_euler_xyz(0.32, 0.025, -0.045),
                quat_from_euler_xyz(0.21, 0.015, -0.025),
                quat_from_euler_xyz(-0.028, 0.0, 0.0),
                quat_from_euler_xyz(0.0, 0.0, 0.0),
            ],
        },
    ])

    return b.export_glb(out_path)


# ---------------------------------------------------------------------------
# Strict GLB Binary & Geometry Verifier
# ---------------------------------------------------------------------------

def verify_bandit_glb(filepath):
    """Parses the exported .glb binary and verifies header, hierarchy, world AABB, normals & clean leg gap."""
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
    accessors = gltf["accessors"]
    buffer_views = gltf["bufferViews"]

    def read_vec_accessor(acc_idx):
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
    zero_area_tris = 0
    shin_gap_intrusions = 0
    total_tris = 0

    def walk_node(n_idx, parent_t=(0.0, 0.0, 0.0), parent_q=(0.0, 0.0, 0.0, 1.0)):
        nonlocal degenerate_normals, zero_area_tris, shin_gap_intrusions, total_tris
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
                positions = read_vec_accessor(prim["attributes"]["POSITION"])
                normals = read_vec_accessor(prim["attributes"]["NORMAL"])
                indices = read_vec_accessor(prim["indices"])
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
                    if abs(wp[0]) < 0.055 and 0.05 < wp[1] < 0.55:
                        shin_gap_intrusions += 1
                for n in normals:
                    nl = v_len(n)
                    if not (0.98 <= nl <= 1.02) or any(math.isnan(c) for c in n):
                        degenerate_normals += 1
                for ti in range(0, len(indices), 3):
                    p0, p1, p2 = w_pts[indices[ti]], w_pts[indices[ti + 1]], w_pts[indices[ti + 2]]
                    if v_len(v_cross(v_sub(p1, p0), v_sub(p2, p0))) < 1e-11:
                        zero_area_tris += 1
                    # Also ensure no triangle edge bridges across x=0 between the shins (0.05 < y < 0.55)!
                    if all(0.05 < pt[1] < 0.55 for pt in (p0, p1, p2)):
                        xs = (p0[0], p1[0], p2[0])
                        if min(xs) < -0.02 and max(xs) > 0.02:
                            shin_gap_intrusions += 1
            mesh_tris[m_obj["name"]] = m_sum

        for ch in nd.get("children", []):
            walk_node(ch, wt, wq)

    for r_idx in gltf["scenes"][0]["nodes"]:
        walk_node(r_idx)

    for req_node in ("rightUpper", "rightFore", "muzzle"):
        assert req_node in node_world_pos, f"Missing required node: {req_node}"

    anim_summary = {}
    for anim in gltf.get("animations", []):
        max_t = 0.0
        for s in anim["samplers"]:
            ts = read_vec_accessor(s["input"])
            qs = read_vec_accessor(s["output"])
            max_t = max(max_t, max(ts))
            for q in qs:
                ql = math.sqrt(sum(c * c for c in q))
                assert 0.999 <= ql <= 1.001, f"Non-unit quaternion in {anim['name']}: {ql}"
        anim_summary[anim["name"]] = round(max_t, 3)

    assert "Idle" in anim_summary and "Attack" in anim_summary, f"Missing animations: {anim_summary}"
    assert 0.0 <= world_min[1] <= 0.02, f"Boot soles not grounded cleanly: y_min={world_min[1]:.5f}"
    assert degenerate_normals == 0, f"Found {degenerate_normals} degenerate normals!"
    assert shin_gap_intrusions == 0, f"Found {shin_gap_intrusions} vertices/bridging tris in lower shin gap!"

    return {
        "file_bytes": len(data),
        "triangles": total_tris,
        "mesh_triangles": mesh_tris,
        "bbox_min": [round(c, 4) for c in world_min],
        "bbox_max": [round(c, 4) for c in world_max],
        "height_m": round(world_max[1] - world_min[1], 4),
        "nodes": list(node_world_pos.keys()),
        "muzzle_world": [round(c, 4) for c in node_world_pos["muzzle"]],
        "animations": anim_summary,
        "degenerate_normals": degenerate_normals,
        "zero_area_triangles": zero_area_tris,
        "shin_gap_intrusions": shin_gap_intrusions,
    }


if __name__ == "__main__":
    default_out = os.path.abspath(os.path.join(_SCRIPT_DIR, "..", "assets", "bandit.glb"))
    out_file = sys.argv[1] if len(sys.argv) > 1 else default_out
    stats = build_bandit_glb(out_file)
    check = verify_bandit_glb(out_file)
    print(f"[build_bandit] Generated {out_file}")
    print(json.dumps({"export": stats, "verification": check}, indent=2))
