#!/usr/bin/env python3
"""
Builds a game-ready, organically sculpted Timber Wolf binary glTF 2.0 asset (`assets/wolf.glb`).

Architecture & Game Contract:
  - Facing -Z (z < 0 is forward), digitigrade paws resting cleanly at y = 0.0.
  - Shoulder height ~0.70m, total nose-to-tail length ~1.90m, ~6,200 triangles.
  - Seamless anatomical lupine body loft (muscular croup -> tucked waist -> deep keel brisket -> withers -> neck)
    with tucked-edge two-tone charcoal dorsal mantle, slate-grey flanks, silver-cream chest/belly,
    and a 4-layered sculpted jagged winter fur ruff (`pelskrage`) with zero sphere/cone seams.
  - Articulated child nodes:
      * "head" at (0.0, 0.74, -0.64): broad cranium, cheek ruffs, tapered snout, wet black nose pad,
        parted snarling jaws with dark mouth interior + 4 curved white canine fangs + incisor rows,
        heavy lupine brows, glowing amber emissive eyes, and erect cupped wolf ears.
      * "tail" at (0.0, 0.62, 0.45): S-curved bushy brush tail with fur-tuft fluting & silver-white tip.
      * "leg0" (FL), "leg1" (BL), "leg2" (FR), "leg3" (BR): anatomical digitigrade limbs, angled hind hocks,
        4 sculpted toes + 4 curved claws per paw touching y = 0.0.
  - Embedded glTF quaternion animations: "Idle" (2.0s), "Walk" (1.0s), "Run" (0.55s), "Attack" (0.35s).
"""

import json
import math
import os
import struct
import sys

# Ensure sibling glb_core is importable regardless of current working directory
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPT_DIR not in sys.path:
    sys.path.insert(0, _SCRIPT_DIR)

from glb_core import (
    GLBBuilder,
    catmull_rom_chain,
    quat_from_euler_xyz,
    quat_rotate_vec,
    v_add,
    v_cross,
    v_dot,
    v_mul,
    v_norm,
    v_sub,
)


# ---------------------------------------------------------------------------
# Organic Lupine Surface & Fur-Sculpting Helpers
# ---------------------------------------------------------------------------

def _smoothstep(edge0, edge1, x):
    if abs(edge1 - edge0) < 1e-9:
        return 1.0 if x >= edge1 else 0.0
    t = max(0.0, min(1.0, (x - edge0) / (edge1 - edge0)))
    return t * t * (3.0 - 2.0 * t)


def _compute_bishop_frames(spine_pts, up_hint=(0.0, 1.0, 0.0)):
    """Computes twist-free parallel-transport frames (tangent, right, up) along spine_pts."""
    m = len(spine_pts)
    tangents = []
    for i in range(m):
        if i == 0:
            d = v_sub(spine_pts[1], spine_pts[0])
        elif i == m - 1:
            d = v_sub(spine_pts[-1], spine_pts[-2])
        else:
            d = v_sub(spine_pts[i + 1], spine_pts[i - 1])
        tangents.append(v_norm(d, (0.0, 0.0, -1.0)))

    t0 = tangents[0]
    up = up_hint
    if abs(v_dot(t0, up)) > 0.94:
        up = (0.0, 0.0, 1.0) if abs(t0[2]) < 0.8 else (1.0, 0.0, 0.0)
    right = v_norm(v_cross(up, t0))
    up_vec = v_norm(v_cross(t0, right))

    frames = [(tangents[0], right, up_vec)]
    for i in range(1, m):
        prev_t, prev_r, _ = frames[-1]
        cur_t = tangents[i]
        d_dot = max(-1.0, min(1.0, v_dot(prev_t, cur_t)))
        if d_dot > 0.999999:
            r_i = prev_r
        else:
            ax = v_norm(v_cross(prev_t, cur_t), (1.0, 0.0, 0.0))
            ang = math.acos(d_dot)
            half = ang * 0.5
            q = (ax[0] * math.sin(half), ax[1] * math.sin(half), ax[2] * math.sin(half), math.cos(half))
            r_i = quat_rotate_vec(q, prev_r)
        r_i = v_norm(v_sub(r_i, v_mul(cur_t, v_dot(r_i, cur_t))), prev_r)
        u_i = v_norm(v_cross(cur_t, r_i))
        frames.append((cur_t, r_i, u_i))
    return frames


def _wolf_torso_profile(t, theta):
    """
    Returns anatomical 2D lupine cross-section (x_right, y_up) at normalized spine parameter t in [0..1].
      t = 0.00: tail root / croup tip (z = +0.49)
      t = 0.17: muscular pelvis / hindquarters (z = +0.32)
      t = 0.43: narrow tucked lupine abdomen / loin (z = +0.04)
      t = 0.72: deep keel ribcage / brisket & withers (z = -0.30, dorsal y ~ 0.70m)
      t = 0.88: thick muscular neck base (z = -0.49)
      t = 1.00: upper neck socket at skull base (z = -0.64)
    """
    rear_taper = _smoothstep(0.0, 0.09, t) * 0.95 + 0.05
    neck_taper = 1.0 - 0.34 * _smoothstep(0.78, 1.0, t)

    pelvis_bulge = math.exp(-((t - 0.17) / 0.13) ** 2)
    waist_tuck = math.exp(-((t - 0.43) / 0.16) ** 2)
    rib_depth = math.exp(-((t - 0.71) / 0.19) ** 2)
    withers_crest = math.exp(-((t - 0.73) / 0.14) ** 2)

    rx = (0.160 + 0.024 * pelvis_bulge - 0.022 * waist_tuck + 0.036 * rib_depth) * rear_taper * neck_taper
    ry_top = (0.148 + 0.020 * pelvis_bulge - 0.010 * waist_tuck + 0.042 * withers_crest) * rear_taper * neck_taper
    ry_bot = (0.172 + 0.016 * pelvis_bulge - 0.056 * waist_tuck + 0.068 * rib_depth) * rear_taper * neck_taper

    ct = math.cos(theta)
    st = math.sin(theta)

    if st >= 0.0:
        y = st * ry_top
        shoulder_blade = 1.0 + 0.06 * withers_crest * (st ** 2)
        x = ct * rx * (1.0 - 0.08 * (st ** 3)) * shoulder_blade
    else:
        # Canine keel sternum (V-tapered brisket below)
        keel = 1.0 - 0.26 * ((-st) ** 1.5) * (0.55 + 0.45 * rib_depth)
        x = ct * rx * keel
        y = st * ry_bot

    return (x, y)


def _add_tucked_fur_mantle(
    part,
    spine_pts,
    frames,
    t_min,
    t_max,
    theta_center,
    half_span_fn,
    thickness=0.008,
    tuft_amp=0.09,
    tuft_freq=9.0,
    v_steps=13,
    u_steps=10,
):
    """
    Sculpts a zero-seam two-tone fur mantle (dorsal saddle or ventral chest/belly) that hugs
    the continuous torso loft. Along its entire perimeter (v=0, v=1, u=0, u=1), its radial
    offset smoothly tucks -5.5mm inside the base torso, guaranteeing zero gaps or sphere seams!
    """
    m = len(spine_pts)
    rings = []
    for vi in range(v_steps + 1):
        vf = vi / v_steps
        t = t_min + (t_max - t_min) * vf

        f_idx = t * (m - 1)
        i0 = min(m - 2, max(0, int(f_idx)))
        frac = f_idx - i0
        c_pt = (
            spine_pts[i0][0] + (spine_pts[i0 + 1][0] - spine_pts[i0][0]) * frac,
            spine_pts[i0][1] + (spine_pts[i0 + 1][1] - spine_pts[i0][1]) * frac,
            spine_pts[i0][2] + (spine_pts[i0 + 1][2] - spine_pts[i0][2]) * frac,
        )
        r_ax = v_norm(v_add(v_mul(frames[i0][1], 1.0 - frac), v_mul(frames[i0 + 1][1], frac)))
        u_ax = v_norm(v_add(v_mul(frames[i0][2], 1.0 - frac), v_mul(frames[i0 + 1][2], frac)))

        v_env = _smoothstep(0.0, 0.14, vf) * _smoothstep(0.0, 0.14, 1.0 - vf)
        base_half_span = half_span_fn(vf)

        ring = []
        for ui in range(u_steps + 1):
            uf = (ui / u_steps) * 2.0 - 1.0
            edge_dist = 1.0 - abs(uf)
            u_env = _smoothstep(0.0, 0.24, edge_dist)

            serration = tuft_amp * math.sin(vf * math.pi * tuft_freq) * (abs(uf) ** 1.4)
            theta = theta_center + uf * (base_half_span + serration)

            bx, by = _wolf_torso_profile(t, theta)
            rad_len = max(1e-5, math.hypot(bx, by))
            nx, ny = bx / rad_len, by / rad_len

            env = v_env * u_env
            fur_ridge = 0.0025 * math.cos(uf * math.pi * 4.0) * env
            offset = -0.0055 * (1.0 - env) + (thickness + fur_ridge) * env

            px = bx + nx * offset
            py = by + ny * offset
            world_pt = v_add(c_pt, v_add(v_mul(r_ax, px), v_mul(u_ax, py)))
            ring.append(world_pt)
        rings.append(ring)

    vm = v_steps // 2
    um = u_steps // 2
    p00 = rings[vm][um]
    p10 = rings[vm][um + 1]
    p11 = rings[vm + 1][um + 1]
    fn = v_cross(v_sub(p10, p00), v_sub(p11, p00))
    f_mid = int((t_min + (t_max - t_min) * 0.5) * (m - 1))
    out_ref = v_sub(p00, spine_pts[min(m - 1, max(0, f_mid))])
    flip = v_dot(fn, out_ref) < 0.0

    part.add_smooth_grid(rings, closed_u=False, ensure_outward=False, flip=flip)


def _add_sculpted_fur_ruff_layer(
    part,
    center_front,
    center_back,
    r_inner_front,
    r_crest_x,
    r_crest_y_top,
    r_crest_y_bot,
    r_inner_back,
    sweep_back_z,
    odd_harm=5,
    even_harm=8,
    spike_amp=0.072,
    ventral_drop=0.030,
    harm_sign=1.0,
    u_segs=26,
):
    """
    Watertight closed_u=True winter wolf fur-ruff collar layer (`pelskrage`).
    Uses high circumferential resolution (u_segs=26) with gentle, well-sampled fur-lock waves
    (harmonics 5..8 << Nyquist 13) so the ruff forms smooth, plush organic fur locks hugging
    the neck (~+-0.21m) with zero coarse low-poly side-wing facets!
    """
    ring_specs = [
        (0.00, 0.68, 0.00, 0.00),
        (0.26, 0.90, 0.25, 0.48),
        (0.58, 1.00, 0.88, 1.00),
        (0.82, 0.88, 0.52, 0.45),
        (1.00, 0.66, 0.06, 0.00),
    ]
    rings = []
    for s_pos, r_mult, sweep_mult, spike_mult in ring_specs:
        cx = center_front[0] + (center_back[0] - center_front[0]) * s_pos
        cy = center_front[1] + (center_back[1] - center_front[1]) * s_pos
        cz = center_front[2] + (center_back[2] - center_front[2]) * s_pos
        ring = []
        for u in range(u_segs):
            ang = (u / u_segs) * math.pi * 2.0
            ca = math.cos(ang)
            sa = math.sin(ang)

            # Smooth organic fur-lock undulation (symmetric left/right under x -> -x)
            tuft_wave = harm_sign * 0.62 * math.sin(ang * odd_harm) + 0.38 * math.cos(ang * even_harm)
            tuft_factor = 1.0 + spike_amp * spike_mult * tuft_wave

            r_crest_y = r_crest_y_top if sa >= 0.0 else r_crest_y_bot

            base_r = r_inner_front * (1.0 - s_pos) + r_inner_back * s_pos
            rx = (base_r * (1.0 - spike_mult) + r_crest_x * spike_mult) * r_mult * tuft_factor
            ry = (base_r * 0.80 * (1.0 - spike_mult) + r_crest_y * spike_mult) * r_mult * tuft_factor

            dz_tuft = sweep_back_z * sweep_mult * (0.78 + 0.35 * max(0.0, tuft_wave))
            dy_chest = -ventral_drop * sweep_mult * max(0.0, -sa) * (0.7 + 0.3 * (sa * sa))

            ring.append((cx + ca * rx, cy + sa * ry + dy_chest, cz + dz_tuft))
        rings.append(ring)

    part.add_smooth_grid(rings, closed_u=True, ensure_outward=True)


def _add_fur_tuft_lock(part, base_pt, mid_pt, tip_pt, r_base, width_scale=1.25, u_segs=6):
    """Sculpts an individual pointed, swept fur lock (cheek ruff, elbow feathering, hackle tuft)."""
    spine = catmull_rom_chain([base_pt, mid_pt, tip_pt], samples_per_seg=2)

    def sec(t, theta):
        r = max(0.0012, r_base * ((1.0 - t) ** 1.15) * (0.85 + 0.15 * math.sin(t * math.pi)))
        return (math.cos(theta) * r * width_scale, math.sin(theta) * r * 0.62)

    part.add_loft(spine, sec, u_segs=u_segs, cap_start=False, cap_end=True, up_hint=(0.0, 1.0, 0.0))


def _add_cupped_wolf_ear(dorsal_part, inner_part, tuft_part, side_sgn):
    """
    Sculpts an erect, alert triangular cupped lupine ear (`øre`) in "head" local space:
      - Thick furred charcoal/slate outer pinna curving gracefully to a wolf ear tip
      - Recessed silver-cream inner fur hollow + fluffy ear-canal fur wisps
    """
    ear_spine = catmull_rom_chain([
        (side_sgn * 0.072, 0.068, 0.028),
        (side_sgn * 0.096, 0.125, 0.018),
        (side_sgn * 0.114, 0.180, 0.006),
        (side_sgn * 0.120, 0.222, -0.004),
    ], samples_per_seg=2)

    def outer_ear_sec(t, theta):
        w = 0.048 * (1.0 - 0.80 * (t ** 1.35)) * (1.0 + 0.15 * math.sin(t * math.pi))
        d = 0.026 * (1.0 - 0.78 * (t ** 1.30))
        ct, st = math.cos(theta), math.sin(theta)
        if st < 0.0:
            cup = 0.35 + 0.65 * (ct * ct)
            return (ct * w, st * d * cup)
        return (ct * w, st * d * 1.15)

    dorsal_part.add_loft(
        ear_spine,
        outer_ear_sec,
        u_segs=10,
        cap_start=False,
        cap_end=True,
        up_hint=(-side_sgn * 0.30, 0.0, 1.0),
    )

    inner_spine = catmull_rom_chain([
        (side_sgn * 0.078, 0.082, 0.014),
        (side_sgn * 0.098, 0.132, 0.005),
        (side_sgn * 0.111, 0.182, -0.005),
    ], samples_per_seg=2)

    def inner_ear_sec(t, theta):
        w = 0.029 * (1.0 - 0.72 * (t ** 1.25))
        d = 0.010 * (1.0 - 0.68 * t)
        return (math.cos(theta) * w, math.sin(theta) * d)

    inner_part.add_loft(
        inner_spine,
        inner_ear_sec,
        u_segs=8,
        cap_start=False,
        cap_end=True,
        up_hint=(-side_sgn * 0.30, 0.0, 1.0),
    )

    _add_fur_tuft_lock(
        tuft_part,
        (side_sgn * 0.080, 0.084, 0.012),
        (side_sgn * 0.096, 0.114, -0.005),
        (side_sgn * 0.106, 0.138, -0.016),
        r_base=0.014,
        width_scale=1.15,
        u_segs=5,
    )


def _add_digitigrade_wolf_paw(fur_part, pad_part, claw_part, ground_y, z_center):
    """
    Sculpts an anatomical digitigrade wolf paw resting cleanly at local y = ground_y (world y = 0.0):
      - Arched central metacarpal/metatarsal paw cushion + dark leathery sole pad
      - 4 distinct furred arched wolf toes + 4 curved dark keratin claws
    """
    paw_spine = [
        (0.0, ground_y + 0.052, z_center + 0.022),
        (0.0, ground_y + 0.032, z_center - 0.006),
        (0.0, ground_y + 0.020, z_center - 0.034),
    ]

    def paw_sec(t, theta):
        rx = 0.038 + 0.010 * math.sin(t * math.pi * 0.85)
        ry = 0.024 * (1.0 - 0.22 * t)
        y = max(-0.018, math.sin(theta) * ry)
        return (math.cos(theta) * rx, y)

    fur_part.add_loft(paw_spine, paw_sec, u_segs=8, cap_start=False, cap_end=True, up_hint=(0.0, 1.0, 0.0))

    # Dark sole metacarpal pad resting flat at ground_y + 0.001
    pad_spine = [
        (0.0, ground_y + 0.009, z_center + 0.014),
        (0.0, ground_y + 0.008, z_center - 0.026),
    ]

    def pad_sec(t, theta):
        rx = 0.032 * (1.0 - 0.15 * abs(t - 0.5))
        y = max(-0.007, math.sin(theta) * 0.008)
        return (math.cos(theta) * rx, y)

    pad_part.add_loft(pad_spine, pad_sec, u_segs=6, cap_start=True, cap_end=True, up_hint=(0.0, 1.0, 0.0))

    # 4 Individual Sculpted Arched Digitigrade Toes + 4 Curved Claws
    toe_configs = [
        (-0.033, -0.060, 0.0135, -0.007),
        (-0.012, -0.074, 0.0148, -0.002),
        (0.012, -0.074, 0.0148, 0.002),
        (0.033, -0.060, 0.0135, 0.007),
    ]
    for tx, tz_end, tr, splay in toe_configs:
        t_start_z = z_center - 0.020
        t_end_z = z_center + tz_end
        toe_spine = [
            (tx * 0.85, ground_y + 0.024, t_start_z),
            (tx + splay * 0.5, ground_y + 0.021, (t_start_z + t_end_z) * 0.5),
            (tx + splay, ground_y + 0.012, t_end_z),
        ]

        def make_toe_sec(r_val):
            def _sec(t, theta):
                rx = r_val * (1.0 - 0.22 * t)
                ry = r_val * 0.82 * (1.0 - 0.20 * t)
                return (math.cos(theta) * rx, max(-0.010, math.sin(theta) * ry))
            return _sec

        fur_part.add_loft(toe_spine, make_toe_sec(tr), u_segs=5, cap_start=False, cap_end=True, up_hint=(0.0, 1.0, 0.0))

        claw_pts = [
            (tx + splay, ground_y + 0.014, t_end_z + 0.003),
            (tx + splay * 1.12, ground_y + 0.009, t_end_z - 0.012),
            (tx + splay * 1.18, ground_y + 0.003, t_end_z - 0.023),
        ]
        claw_part.add_tube(claw_pts, 0.0052, 0.0012, u_segs=4, samples_per_seg=1, cap_start=False, cap_end=True, scale_xy=(0.78, 1.15))


# ---------------------------------------------------------------------------
# Main Timber Wolf Builder (`assets/wolf.glb`)
# ---------------------------------------------------------------------------

def build_wolf_glb(out_path):
    b = GLBBuilder()

    # Cohesive PBR Materials for Western Timber Wolf
    mat_dorsal = b.add_material("WolfCharcoalFur", (0.19, 0.21, 0.26), metallic=0.02, roughness=0.88)
    mat_flank = b.add_material("WolfSlateFur", (0.42, 0.46, 0.53), metallic=0.02, roughness=0.86)
    mat_tawny = b.add_material("WolfTimberBuffFur", (0.56, 0.54, 0.50), metallic=0.01, roughness=0.87)
    mat_light = b.add_material("WolfSilverCreamFur", (0.80, 0.83, 0.88), metallic=0.01, roughness=0.85)
    mat_dark = b.add_material("WolfNoseAndClaws", (0.07, 0.07, 0.09), metallic=0.08, roughness=0.28)
    mat_mouth = b.add_material("WolfMouthInterior", (0.28, 0.07, 0.09), metallic=0.02, roughness=0.52)
    mat_fang = b.add_material("WolfIvoryFangs", (0.96, 0.95, 0.90), metallic=0.04, roughness=0.18)
    mat_eye = b.add_material(
        "WolfGlowingAmberEye",
        (1.0, 0.80, 0.16),
        metallic=0.0,
        roughness=0.10,
        emissive=(1.0, 0.68, 0.08),
    )

    root = b.add_node("WolfRoot")

    # =========================================================================
    # 1. SEAMLESS LOFTED LUPINE BODY & MULTI-LAYERED JAGGED FUR RUFF (`pelskrage`)
    # =========================================================================
    body_parts, bgp = b.create_parts_dict()
    b_dorsal = bgp(mat_dorsal)
    b_flank = bgp(mat_flank)
    b_tawny = bgp(mat_tawny)
    b_light = bgp(mat_light)

    # Continuous spine: croup (z=+0.49) -> muscular pelvis -> narrow tucked abdomen ->
    # deep keel ribcage/withers (~0.70m shoulder height) -> thick neck meeting "head" at (0, 0.74, -0.64)
    torso_spine = catmull_rom_chain([
        (0.0, 0.54, 0.49),
        (0.0, 0.57, 0.33),
        (0.0, 0.55, 0.06),
        (0.0, 0.55, -0.20),
        (0.0, 0.56, -0.34),
        (0.0, 0.63, -0.50),
        (0.0, 0.72, -0.64),
    ], samples_per_seg=3)

    b_flank.add_loft(
        torso_spine,
        _wolf_torso_profile,
        u_segs=16,
        cap_start=True,
        cap_end=True,
        up_hint=(0.0, 1.0, 0.0),
    )

    torso_frames = _compute_bishop_frames(torso_spine, up_hint=(0.0, 1.0, 0.0))

    # Conforming Charcoal Dorsal Saddle Mantle (tucked perimeter -> zero seams!)
    _add_tucked_fur_mantle(
        b_dorsal,
        torso_spine,
        torso_frames,
        t_min=0.04,
        t_max=0.98,
        theta_center=math.pi * 0.5,
        half_span_fn=lambda vf: 0.88 + 0.34 * math.exp(-((vf - 0.72) / 0.22) ** 2) - 0.16 * ((1.0 - vf) ** 2),
        thickness=0.0085,
        tuft_amp=0.11,
        tuft_freq=11.0,
        v_steps=10,
        u_steps=9,
    )

    # Conforming Silver-Cream Brisket Keel, Throat Bib & Tucked Underbelly
    _add_tucked_fur_mantle(
        b_light,
        torso_spine,
        torso_frames,
        t_min=0.12,
        t_max=0.98,
        theta_center=-math.pi * 0.5,
        half_span_fn=lambda vf: 0.62 + 0.30 * _smoothstep(0.55, 0.92, vf),
        thickness=0.0075,
        tuft_amp=0.08,
        tuft_freq=9.0,
        v_steps=9,
        u_steps=7,
    )

    # 3-Layered Plush Organic Winter Fur Ruff / Mane (`pelskrage`) around Neck & Shoulders
    # Sleek natural lupine silhouette (~+-0.21m half-width) with smooth well-sampled fur locks!
    _add_sculpted_fur_ruff_layer(
        b_light,
        center_front=(0.0, 0.65, -0.61),
        center_back=(0.0, 0.61, -0.48),
        r_inner_front=0.096,
        r_crest_x=0.158,
        r_crest_y_top=0.092,
        r_crest_y_bot=0.170,
        r_inner_back=0.125,
        sweep_back_z=0.075,
        odd_harm=5,
        even_harm=8,
        spike_amp=0.068,
        ventral_drop=0.042,
        harm_sign=1.0,
        u_segs=26,
    )
    _add_sculpted_fur_ruff_layer(
        b_tawny,
        center_front=(0.0, 0.62, -0.55),
        center_back=(0.0, 0.58, -0.39),
        r_inner_front=0.114,
        r_crest_x=0.178,
        r_crest_y_top=0.100,
        r_crest_y_bot=0.184,
        r_inner_back=0.142,
        sweep_back_z=0.090,
        odd_harm=7,
        even_harm=6,
        spike_amp=0.072,
        ventral_drop=0.036,
        harm_sign=-1.0,
        u_segs=28,
    )
    _add_sculpted_fur_ruff_layer(
        b_dorsal,
        center_front=(0.0, 0.59, -0.47),
        center_back=(0.0, 0.56, -0.28),
        r_inner_front=0.125,
        r_crest_x=0.186,
        r_crest_y_top=0.108,
        r_crest_y_bot=0.172,
        r_inner_back=0.146,
        sweep_back_z=0.105,
        odd_harm=7,
        even_harm=8,
        spike_amp=0.075,
        ventral_drop=0.015,
        harm_sign=1.0,
        u_segs=28,
    )

    # Dorsal hackle fur locks & plush silver chest jabot locks
    for hz, hy, hl in ((-0.46, 0.70, 0.12), (-0.36, 0.71, 0.13), (-0.26, 0.69, 0.11)):
        _add_fur_tuft_lock(
            b_dorsal,
            (0.0, hy - 0.04, hz),
            (0.0, hy + 0.010, hz + hl * 0.55),
            (0.0, hy - 0.005, hz + hl),
            r_base=0.032,
            width_scale=1.35,
            u_segs=6,
        )
    for sgn in (-1, 1):
        _add_fur_tuft_lock(
            b_light,
            (sgn * 0.042, 0.52, -0.49),
            (sgn * 0.052, 0.45, -0.46),
            (sgn * 0.038, 0.39, -0.40),
            r_base=0.035,
            width_scale=1.25,
            u_segs=6,
        )

    body_mesh = b.add_mesh_from_parts("WolfBodyMesh", body_parts.values())
    b.add_node("WolfBody", mesh_idx=body_mesh, parent_idx=root)

    # =========================================================================
    # 2. ARTICULATED HEAD NODE ("head") AT (0.0, 0.74, -0.64)
    # =========================================================================
    hp, hgp = b.create_parts_dict()
    h_dorsal = hgp(mat_dorsal)
    h_flank = hgp(mat_flank)
    h_tawny = hgp(mat_tawny)
    h_light = hgp(mat_light)
    h_dark = hgp(mat_dark)
    h_mouth = hgp(mat_mouth)
    h_fang = hgp(mat_fang)
    h_eye = hgp(mat_eye)

    # Continuous Cranium -> Distinct Forward Orbital Stop -> Tapered Pointed Snout (`spiss snute`)
    head_spine = catmull_rom_chain([
        (0.0, 0.005, 0.095),
        (0.0, 0.022, 0.005),
        (0.0, 0.016, -0.090),
        (0.0, -0.010, -0.165),
        (0.0, -0.018, -0.265),
        (0.0, -0.022, -0.354),
    ], samples_per_seg=3)

    def wolf_skull_snout_sec(t, theta):
        back_taper = _smoothstep(0.0, 0.10, t) * 0.82 + 0.18
        # Step cleanly down from broad cranium into narrow snout BEFORE z = -0.155
        # so the forward-facing orbital sockets leave both glowing amber eyes 100% unobstructed!
        snout_blend = _smoothstep(0.28, 0.52, t)
        tip_taper = 1.0 - 0.56 * _smoothstep(0.54, 1.0, t)

        skull_rx = 0.128 * (1.0 + 0.08 * math.exp(-((t - 0.26) / 0.14) ** 2))
        skull_ry = 0.110 * (1.0 + 0.07 * math.exp(-((t - 0.22) / 0.15) ** 2))
        snout_rx = 0.064 * tip_taper
        snout_ry = 0.050 * tip_taper

        rx = (skull_rx * (1.0 - snout_blend) + snout_rx * snout_blend) * back_taper
        ry = (skull_ry * (1.0 - snout_blend) + snout_ry * snout_blend) * back_taper

        ct, st = math.cos(theta), math.sin(theta)
        if snout_blend > 0.05 and st < 0.0:
            flat_jaw = 1.0 - 0.52 * snout_blend * ((-st) ** 0.8)
            return (ct * rx * (1.0 + 0.08 * snout_blend), st * ry * flat_jaw)
        if st > 0.0:
            bridge_sq = 1.0 + 0.05 * snout_blend * (ct * ct)
            return (ct * rx * bridge_sq, st * ry)
        return (ct * rx, st * ry)

    h_flank.add_loft(head_spine, wolf_skull_snout_sec, u_segs=18, cap_start=True, cap_end=True, up_hint=(0.0, 1.0, 0.0))

    # Smooth Tucked-Edge Cranial Crown Cap (replaces harsh sharp forehead triangle!)
    # Wraps organically across the upper dome behind the brows and tucks -3.5mm into the skull perimeter.
    head_frames = _compute_bishop_frames(head_spine, up_hint=(0.0, 1.0, 0.0))
    crown_rings = []
    hm = len(head_spine)
    for vi in range(10):
        vf = vi / 9.0
        # Spans only the cranium dome (t = 0.06 .. 0.41, ending softly above the brow arch)
        t_h = 0.06 + 0.35 * vf
        f_idx = t_h * (hm - 1)
        i0 = min(hm - 2, max(0, int(f_idx)))
        frac = f_idx - i0
        c_pt = (
            head_spine[i0][0] + (head_spine[i0 + 1][0] - head_spine[i0][0]) * frac,
            head_spine[i0][1] + (head_spine[i0 + 1][1] - head_spine[i0][1]) * frac,
            head_spine[i0][2] + (head_spine[i0 + 1][2] - head_spine[i0][2]) * frac,
        )
        r_ax = v_norm(v_add(v_mul(head_frames[i0][1], 1.0 - frac), v_mul(head_frames[i0 + 1][1], frac)))
        u_ax = v_norm(v_add(v_mul(head_frames[i0][2], 1.0 - frac), v_mul(head_frames[i0 + 1][2], frac)))
        v_env = _smoothstep(0.0, 0.22, vf) * _smoothstep(0.0, 0.28, 1.0 - vf)
        half_span = 0.92 - 0.18 * (vf ** 1.5)
        c_ring = []
        for ui in range(13):
            uf = (ui / 12.0) * 2.0 - 1.0
            u_env = _smoothstep(0.0, 0.26, 1.0 - abs(uf))
            theta = math.pi * 0.5 + uf * half_span
            bx, by = wolf_skull_snout_sec(t_h, theta)
            rad_l = max(1e-5, math.hypot(bx, by))
            env = v_env * u_env
            off = -0.0035 * (1.0 - env) + 0.0055 * env
            px = bx + (bx / rad_l) * off
            py = by + (by / rad_l) * off
            c_ring.append(v_add(c_pt, v_add(v_mul(r_ax, px), v_mul(u_ax, py))))
        crown_rings.append(c_ring)
    c_p00, c_p10, c_p11 = crown_rings[4][6], crown_rings[4][7], crown_rings[5][7]
    c_fn = v_cross(v_sub(c_p10, c_p00), v_sub(c_p11, c_p00))
    c_flip = v_dot(c_fn, (0.0, 1.0, 0.0)) < 0.0
    h_dorsal.add_smooth_grid(crown_rings, closed_u=False, ensure_outward=False, flip=c_flip)

    # Wet Black Lupine Nose Pad (`rhinarium`) -> front tip at world z = -0.64 - 0.375 = -1.015
    nose_spine = [
        (0.0, -0.012, -0.340),
        (0.0, -0.008, -0.360),
        (0.0, -0.014, -0.375),
    ]

    def nose_sec(t, theta):
        scale_t = math.sin(max(0.12, min(0.92, t)) * math.pi) ** 0.55
        ct, st = math.cos(theta), math.sin(theta)
        w = (0.032 if st >= 0.0 else 0.020) * scale_t
        h = 0.025 * scale_t
        return (ct * w, st * h)

    h_dark.add_loft(nose_spine, nose_sec, u_segs=10, cap_start=False, cap_end=True, up_hint=(0.0, 1.0, 0.0))

    # Snarling Upper Lip Flews + Dark Crimson Mouth Roof
    for sgn in (-1, 1):
        flew_pts = [
            (sgn * 0.056, -0.036, -0.165),
            (sgn * 0.044, -0.030, -0.240),
            (sgn * 0.032, -0.026, -0.308),
            (0.0, -0.026, -0.348),
        ]
        h_dark.add_tube(flew_pts, 0.011, 0.007, u_segs=6, samples_per_seg=2, cap_start=False, cap_end=False, scale_xy=(0.85, 1.15))

    h_mouth.add_loft(
        [(0.0, -0.033, -0.155), (0.0, -0.031, -0.250), (0.0, -0.029, -0.330)],
        lambda t, th: (math.cos(th) * 0.040 * (1.0 - 0.45 * t), math.sin(th) * 0.009),
        u_segs=8,
        cap_start=False,
        cap_end=True,
        up_hint=(0.0, 1.0, 0.0),
    )

    # Parted Snarling Lower Jaw (`mandible` — silver-cream chin, dark lips, crimson gums & tongue)
    jaw_spine = catmull_rom_chain([
        (0.0, -0.042, -0.085),
        (0.0, -0.068, -0.175),
        (0.0, -0.086, -0.260),
        (0.0, -0.094, -0.330),
    ], samples_per_seg=2)

    def lower_jaw_sec(t, theta):
        rx = 0.068 * (1.0 - 0.56 * (t ** 1.15))
        ry = 0.032 * (1.0 - 0.48 * t)
        ct, st = math.cos(theta), math.sin(theta)
        if st > 0.0:
            return (ct * rx * 0.92, st * ry * 0.42)
        return (ct * rx, st * ry)

    h_light.add_loft(jaw_spine, lower_jaw_sec, u_segs=10, cap_start=False, cap_end=True, up_hint=(0.0, 1.0, 0.0))

    for sgn in (-1, 1):
        h_dark.add_tube(
            [(sgn * 0.048, -0.056, -0.165), (sgn * 0.034, -0.076, -0.250), (0.0, -0.084, -0.324)],
            0.0085,
            0.006,
            u_segs=5,
            samples_per_seg=1,
            cap_start=False,
            cap_end=False,
        )
    h_mouth.add_loft(
        [(0.0, -0.056, -0.160), (0.0, -0.072, -0.240), (0.0, -0.080, -0.305)],
        lambda t, th: (math.cos(th) * 0.028 * (1.0 - 0.35 * t), math.sin(th) * 0.009),
        u_segs=8,
        cap_start=False,
        cap_end=True,
        up_hint=(0.0, 1.0, 0.0),
    )

    # 4 Curved Razor-Sharp White Canine Fangs + Carnassial / Incisor Teeth
    for sgn in (-1, 1):
        # Upper Canine Fang
        h_fang.add_tube(
            [(sgn * 0.027, -0.026, -0.292), (sgn * 0.026, -0.052, -0.296), (sgn * 0.024, -0.074, -0.293)],
            0.0082,
            0.0012,
            u_segs=6,
            samples_per_seg=2,
            cap_start=False,
            cap_end=True,
        )
        # Lower Canine Fang
        h_fang.add_tube(
            [(sgn * 0.022, -0.086, -0.276), (sgn * 0.021, -0.066, -0.279), (sgn * 0.020, -0.048, -0.277)],
            0.0070,
            0.0012,
            u_segs=6,
            samples_per_seg=2,
            cap_start=False,
            cap_end=True,
        )
        # Premolar tooth points
        h_fang.add_tube(
            [(sgn * 0.033, -0.032, -0.245), (sgn * 0.031, -0.048, -0.245)],
            0.0052,
            0.0014,
            u_segs=5,
            samples_per_seg=1,
            cap_start=False,
            cap_end=True,
        )
        h_fang.add_tube(
            [(sgn * 0.028, -0.074, -0.245), (sgn * 0.027, -0.060, -0.245)],
            0.0046,
            0.0014,
            u_segs=5,
            samples_per_seg=1,
            cap_start=False,
            cap_end=True,
        )

    for ix in (-0.011, 0.011):
        h_fang.add_tube([(ix, -0.027, -0.328), (ix, -0.040, -0.330)], 0.0038, 0.0012, u_segs=4, samples_per_seg=1, cap_start=False, cap_end=True)
        h_fang.add_tube([(ix * 0.85, -0.085, -0.312), (ix * 0.85, -0.073, -0.314)], 0.0034, 0.0012, u_segs=4, samples_per_seg=1, cap_start=False, cap_end=True)

    # Symmetric Facial Features: Cheek Fur Tufts, Heavy Brows, Glowing Amber Eyes & Cupped Ears
    for sgn in (-1, 1):
        # Sleek Swept-Back Lupine Cheek Fur Ruffs (flowing naturally into the +-0.21m neck ruff)
        _add_fur_tuft_lock(
            h_tawny,
            (sgn * 0.098, 0.006, -0.055),
            (sgn * 0.138, -0.008, -0.005),
            (sgn * 0.155, -0.020, 0.052),
            r_base=0.032,
            width_scale=1.25,
            u_segs=7,
        )
        _add_fur_tuft_lock(
            h_light,
            (sgn * 0.092, -0.024, -0.075),
            (sgn * 0.134, -0.042, -0.020),
            (sgn * 0.150, -0.056, 0.040),
            r_base=0.030,
            width_scale=1.25,
            u_segs=7,
        )
        _add_fur_tuft_lock(
            h_light,
            (sgn * 0.078, -0.048, -0.095),
            (sgn * 0.114, -0.070, -0.042),
            (sgn * 0.128, -0.082, 0.018),
            r_base=0.024,
            width_scale=1.20,
            u_segs=6,
        )

        # Fierce Angled Supraorbital Brow Ridge + Pale Brow Slash (strictly ABOVE eye line y=0.052+)
        brow_pts = [
            (sgn * 0.024, 0.048, -0.168),
            (sgn * 0.058, 0.060, -0.156),
            (sgn * 0.092, 0.048, -0.125),
        ]
        h_dorsal.add_tube(brow_pts, 0.012, 0.009, u_segs=6, samples_per_seg=2, cap_start=False, cap_end=True, scale_xy=(1.25, 0.80))
        h_light.add_tube(
            [(sgn * 0.032, 0.058, -0.162), (sgn * 0.074, 0.066, -0.142)],
            0.008,
            0.005,
            u_segs=5,
            samples_per_seg=1,
            cap_start=False,
            cap_end=True,
        )

        # Forward-Facing Orbital Eye Socket:
        # 1) Recessed dark eyeliner socket ring strictly behind the iris (-0.148) for crisp contrast
        # 2) Proud fierce glowing amber iris (`WolfGlowingAmberEye`) at (-0.160) facing forward & slightly out
        # 3) Sharp small vertical dark predator pupil at front tip (-0.177) leaving ~88% glowing amber!
        eye_rot = (0.04, sgn * -0.20, sgn * -0.22)
        h_dark.add_ellipsoid(
            center=(sgn * 0.056, 0.036, -0.149),
            radii=(0.027, 0.020, 0.013),
            u_segs=9,
            v_segs=6,
            rot_euler=eye_rot,
        )
        h_eye.add_ellipsoid(
            center=(sgn * 0.057, 0.036, -0.160),
            radii=(0.023, 0.0165, 0.0175),
            u_segs=10,
            v_segs=6,
            rot_euler=eye_rot,
        )
        h_dark.add_ellipsoid(
            center=(sgn * 0.060, 0.036, -0.1765),
            radii=(0.0040, 0.0095, 0.0030),
            u_segs=6,
            v_segs=4,
            rot_euler=eye_rot,
        )

        # Erect Triangular Cupped Wolf Ear (`øre`)
        _add_cupped_wolf_ear(h_dorsal, h_light, h_light, sgn)

    head_mesh = b.add_mesh_from_parts("WolfHeadMesh", hp.values())
    head_node = b.add_node("head", translation=(0.0, 0.74, -0.64), mesh_idx=head_mesh, parent_idx=root)

    # =========================================================================
    # 3. ARTICULATED BUSHY "tail" NODE AT (0.0, 0.62, 0.45)
    # =========================================================================
    tp_dict, tgp = b.create_parts_dict()
    t_dorsal = tgp(mat_dorsal)
    t_flank = tgp(mat_flank)
    t_light = tgp(mat_light)

    # S-curved natural timber-wolf brush tail (local to (0, 0.58, 0.45) -> tip at world z = +0.895, total len ~1.91m!)
    tail_full_pts = catmull_rom_chain([
        (0.0, 0.00, -0.02),
        (0.0, -0.02, 0.10),
        (0.0, -0.10, 0.23),
        (0.0, -0.20, 0.35),
        (0.0, -0.27, 0.445),
    ], samples_per_seg=3)

    def _tail_brush_radius_and_tuft(t_global, theta):
        env = math.sin(max(0.04, min(0.985, t_global)) * math.pi) ** 0.72
        base_r = 0.016 * (1.0 - t_global) + 0.086 * env
        # Left-right symmetric fur-tuft fluting + plush ventral brush feathering
        tuft = 1.0 + 0.13 * math.sin(theta * 7.0) + 0.06 * math.cos(theta * 10.0)
        ventral_plume = 1.16 if math.sin(theta) < 0.0 else 0.96
        rx = base_r * tuft * 0.92
        ry = base_r * tuft * ventral_plume
        return (math.cos(theta) * rx, math.sin(theta) * ry)

    n_tail = len(tail_full_pts)
    split_i = int(n_tail * 0.75)
    prox_pts = tail_full_pts[: split_i + 2]

    def prox_tail_sec(t_local, theta):
        t_glob = t_local * ((split_i + 1) / (n_tail - 1))
        end_tuck = 1.0 - 0.38 * _smoothstep(0.82, 1.0, t_local)
        x, y = _tail_brush_radius_and_tuft(t_glob, theta)
        return (x * end_tuck, y * end_tuck)

    t_dorsal.add_loft(prox_pts, prox_tail_sec, u_segs=12, cap_start=True, cap_end=True, up_hint=(0.0, 1.0, 0.0))

    mid_pts = tail_full_pts[2:split_i]
    t_flank.add_loft(
        mid_pts,
        lambda tl, th: (
            math.cos(th) * 0.055 * math.sin(max(0.1, min(0.9, tl)) * math.pi),
            math.sin(th) * 0.046 * math.sin(max(0.1, min(0.9, tl)) * math.pi) - 0.026,
        ),
        u_segs=7,
        cap_start=False,
        cap_end=False,
        up_hint=(0.0, 1.0, 0.0),
    )

    # Seamless Silver-White Brush Tip
    tip_start_i = int(n_tail * 0.65)
    dist_pts = tail_full_pts[tip_start_i:]

    def dist_tail_sec(t_local, theta):
        t_glob = (tip_start_i + t_local * (n_tail - 1 - tip_start_i)) / (n_tail - 1)
        start_tuck = 0.72 + 0.28 * _smoothstep(0.0, 0.25, t_local)
        tip_pinch = max(0.04, 1.0 - 0.94 * (t_local ** 2.3))
        x, y = _tail_brush_radius_and_tuft(t_glob, theta)
        return (x * start_tuck * tip_pinch, y * start_tuck * tip_pinch)

    t_light.add_loft(dist_pts, dist_tail_sec, u_segs=12, cap_start=True, cap_end=True, up_hint=(0.0, 1.0, 0.0))

    tail_mesh = b.add_mesh_from_parts("WolfTailMesh", tp_dict.values())
    tail_node = b.add_node("tail", translation=(0.0, 0.58, 0.45), mesh_idx=tail_mesh, parent_idx=root)

    # =========================================================================
    # 4. 4 ARTICULATED DIGITIGRADE LEGS ("leg0".."leg3") RESTING AT y = 0.0
    #    leg0: front-left (x<0, z<0)   leg1: back-left (x<0, z>0)
    #    leg2: front-right (x>0, z<0)  leg3: back-right (x>0, z>0)
    # =========================================================================
    leg_nodes = []
    leg_idx = 0
    for side_sgn in (-1, 1):
        for end_sgn in (-1, 1):
            lp_dict, lgp = b.create_parts_dict()
            l_dorsal = lgp(mat_dorsal)
            l_flank = lgp(mat_flank)
            l_tawny = lgp(mat_tawny)
            l_dark = lgp(mat_dark)

            if end_sgn < 0:
                # FRONT LEG (leg0 = FL, leg2 = FR): pivot at (side_sgn * 0.142, 0.54, -0.31)
                pivot_x, pivot_y, pivot_z = side_sgn * 0.142, 0.54, -0.31
                ground_local_y = -0.540

                upper_spine = catmull_rom_chain([
                    (-side_sgn * 0.018, 0.075, -0.010),
                    (0.0, -0.045, 0.015),
                    (0.0, -0.155, 0.036),
                    (0.0, -0.265, 0.022),
                ], samples_per_seg=2)

                def front_upper_sec(t, theta):
                    rx = 0.062 * (1.0 - 0.42 * t)
                    rz = 0.082 * (1.0 - 0.46 * t)
                    return (math.cos(theta) * rx, math.sin(theta) * rz)

                l_flank.add_loft(upper_spine, front_upper_sec, u_segs=8, cap_start=True, cap_end=False, up_hint=(0.0, 0.0, 1.0))

                lower_spine = catmull_rom_chain([
                    (0.0, -0.225, 0.028),
                    (0.0, -0.385, 0.012),
                    (0.0, -0.492, -0.022),
                ], samples_per_seg=2)

                def front_lower_sec(t, theta):
                    r = 0.039 * (1.0 - 0.24 * t) + (0.004 if 0.45 < t < 0.68 else 0.0)
                    return (math.cos(theta) * r * 0.90, math.sin(theta) * r * 1.12)

                l_tawny.add_loft(lower_spine, front_lower_sec, u_segs=7, cap_start=False, cap_end=False, up_hint=(0.0, 0.0, 1.0))

                _add_fur_tuft_lock(
                    l_flank,
                    (0.0, -0.13, 0.035),
                    (0.0, -0.16, 0.075),
                    (0.0, -0.20, 0.098),
                    r_base=0.022,
                    width_scale=0.85,
                    u_segs=4,
                )

                _add_digitigrade_wolf_paw(l_tawny, l_dark, l_dark, ground_local_y, z_center=-0.026)

            else:
                # HIND LEG (leg1 = BL, leg3 = BR): pivot at (side_sgn * 0.146, 0.56, +0.32)
                pivot_x, pivot_y, pivot_z = side_sgn * 0.146, 0.56, 0.32
                ground_local_y = -0.560

                thigh_spine = catmull_rom_chain([
                    (-side_sgn * 0.024, 0.085, -0.015),
                    (0.0, -0.045, -0.025),
                    (0.0, -0.155, -0.038),
                    (0.0, -0.265, 0.018),
                    (0.0, -0.345, 0.068),
                ], samples_per_seg=2)

                def hind_thigh_sec(t, theta):
                    rx = 0.072 * ((1.0 - t) ** 0.75) + 0.022
                    rz = 0.106 * ((1.0 - t) ** 0.82) + 0.028
                    return (math.cos(theta) * rx, math.sin(theta) * rz)

                l_flank.add_loft(thigh_spine, hind_thigh_sec, u_segs=8, cap_start=True, cap_end=True, up_hint=(0.0, 0.0, 1.0))

                l_dorsal.add_loft(
                    [(-side_sgn * 0.018, 0.080, 0.005), (side_sgn * 0.010, -0.065, 0.015)],
                    lambda t, th: (math.cos(th) * 0.056 * (1.0 - 0.35 * t), math.sin(th) * 0.082 * (1.0 - 0.35 * t)),
                    u_segs=7,
                    cap_start=True,
                    cap_end=False,
                    up_hint=(0.0, 0.0, 1.0),
                )

                hock_spine = catmull_rom_chain([
                    (0.0, -0.325, 0.066),
                    (0.0, -0.430, 0.032),
                    (0.0, -0.512, -0.004),
                ], samples_per_seg=2)

                def hind_lower_sec(t, theta):
                    r = 0.036 * (1.0 - 0.18 * t) + (0.006 if t < 0.25 else 0.0)
                    return (math.cos(theta) * r * 0.88, math.sin(theta) * r * 1.15)

                l_tawny.add_loft(hock_spine, hind_lower_sec, u_segs=7, cap_start=False, cap_end=False, up_hint=(0.0, 0.0, 1.0))

                _add_fur_tuft_lock(
                    l_flank,
                    (0.0, -0.08, 0.052),
                    (0.0, -0.13, 0.095),
                    (0.0, -0.18, 0.115),
                    r_base=0.025,
                    width_scale=0.90,
                    u_segs=4,
                )

                _add_digitigrade_wolf_paw(l_tawny, l_dark, l_dark, ground_local_y, z_center=-0.008)

            # Guarantee exact ground contact on leg vertices
            for part in lp_dict.values():
                part.positions = [
                    (px, max(ground_local_y, py), pz) for (px, py, pz) in part.positions
                ]

            l_mesh = b.add_mesh_from_parts(f"WolfLeg{leg_idx}Mesh", lp_dict.values())
            l_node = b.add_node(
                f"leg{leg_idx}",
                translation=(pivot_x, pivot_y, pivot_z),
                mesh_idx=l_mesh,
                parent_idx=root,
            )
            leg_nodes.append(l_node)
            leg_idx += 1

    # =========================================================================
    # 5. EMBEDDED glTF QUATERNION ANIMATIONS: Idle, Walk, Run, Attack
    # =========================================================================
    _add_wolf_animations(b, head_node, tail_node, leg_nodes)

    return b.export_glb(out_path)


def _add_wolf_animations(b, head_node, tail_node, leg_nodes):
    """
    Embeds game-ready lupine animations using unit quaternions:
      - "Idle"   (2.00s): alert predator head scan + organic tail sway
      - "Walk"   (1.00s): prowling diagonal trot (leg0 & leg3 opposite leg1 & leg2) + lowered prowl head + tail sway
      - "Run"    (0.55s): fast chase stride + forward head drive + streaming horizontal tail
      - "Attack" (0.35s): ferocious lunging bite snap on head & pouncing front legs
    """
    q0 = quat_from_euler_xyz(0.0, 0.0, 0.0)

    # --- 1. "Idle" (2.0s) ---
    idle_tracks = [
        {
            "node": head_node,
            "path": "rotation",
            "times": [0.0, 0.55, 1.15, 1.65, 2.0],
            "values": [
                q0,
                quat_from_euler_xyz(0.045, 0.11, -0.035),
                quat_from_euler_xyz(-0.025, -0.095, 0.030),
                quat_from_euler_xyz(0.035, 0.025, -0.015),
                q0,
            ],
        },
        {
            "node": tail_node,
            "path": "rotation",
            "times": [0.0, 0.50, 1.00, 1.50, 2.0],
            "values": [
                q0,
                quat_from_euler_xyz(-0.05, 0.14, 0.03),
                quat_from_euler_xyz(-0.08, 0.0, 0.0),
                quat_from_euler_xyz(-0.05, -0.14, -0.03),
                q0,
            ],
        },
    ]
    for ln in leg_nodes:
        idle_tracks.append({"node": ln, "path": "rotation", "times": [0.0, 2.0], "values": [q0, q0]})
    b.add_animation("Idle", idle_tracks)

    # --- 2. "Walk" (1.0s prowling diagonal trot: leg0 & leg3 opposite leg1 & leg2) ---
    walk_amp = 0.32
    walk_tracks = [
        {
            "node": head_node,
            "path": "rotation",
            "times": [0.0, 0.25, 0.50, 0.75, 1.0],
            "values": [
                quat_from_euler_xyz(-0.05, 0.0, 0.0),
                quat_from_euler_xyz(-0.09, 0.025, 0.0),
                quat_from_euler_xyz(-0.05, 0.0, 0.0),
                quat_from_euler_xyz(-0.09, -0.025, 0.0),
                quat_from_euler_xyz(-0.05, 0.0, 0.0),
            ],
        },
        {
            "node": tail_node,
            "path": "rotation",
            "times": [0.0, 0.25, 0.50, 0.75, 1.0],
            "values": [
                quat_from_euler_xyz(-0.18, 0.0, 0.0),
                quat_from_euler_xyz(-0.22, 0.15, 0.04),
                quat_from_euler_xyz(-0.18, 0.0, 0.0),
                quat_from_euler_xyz(-0.22, -0.15, -0.04),
                quat_from_euler_xyz(-0.18, 0.0, 0.0),
            ],
        },
    ]
    for i, ln in enumerate(leg_nodes):
        ph = 1.0 if (i == 0 or i == 3) else -1.0
        walk_tracks.append({
            "node": ln,
            "path": "rotation",
            "times": [0.0, 0.25, 0.50, 0.75, 1.0],
            "values": [
                q0,
                quat_from_euler_xyz(walk_amp * ph, 0.0, 0.0),
                q0,
                quat_from_euler_xyz(-walk_amp * ph, 0.0, 0.0),
                q0,
            ],
        })
    b.add_animation("Walk", walk_tracks)

    # --- 3. "Run" (0.55s fast chase stride + streaming horizontal tail) ---
    run_amp = 0.54
    run_tracks = [
        {
            "node": head_node,
            "path": "rotation",
            "times": [0.0, 0.1375, 0.275, 0.4125, 0.55],
            "values": [
                quat_from_euler_xyz(-0.06, 0.0, 0.0),
                quat_from_euler_xyz(0.09, 0.0, 0.0),
                quat_from_euler_xyz(-0.06, 0.0, 0.0),
                quat_from_euler_xyz(0.09, 0.0, 0.0),
                quat_from_euler_xyz(-0.06, 0.0, 0.0),
            ],
        },
        {
            "node": tail_node,
            "path": "rotation",
            "times": [0.0, 0.1375, 0.275, 0.4125, 0.55],
            "values": [
                quat_from_euler_xyz(-0.54, 0.0, 0.0),
                quat_from_euler_xyz(-0.64, 0.06, 0.0),
                quat_from_euler_xyz(-0.54, 0.0, 0.0),
                quat_from_euler_xyz(-0.64, -0.06, 0.0),
                quat_from_euler_xyz(-0.54, 0.0, 0.0),
            ],
        },
    ]
    for i, ln in enumerate(leg_nodes):
        ph = 1.0 if (i == 0 or i == 3) else -1.0
        run_tracks.append({
            "node": ln,
            "path": "rotation",
            "times": [0.0, 0.1375, 0.275, 0.4125, 0.55],
            "values": [
                q0,
                quat_from_euler_xyz(run_amp * ph, 0.0, 0.0),
                q0,
                quat_from_euler_xyz(-run_amp * ph, 0.0, 0.0),
                q0,
            ],
        })
    b.add_animation("Run", run_tracks)

    # --- 4. "Attack" (0.35s lunging bite snap on head & front legs) ---
    attack_tracks = [
        {
            "node": head_node,
            "path": "rotation",
            "times": [0.0, 0.09, 0.19, 0.35],
            "values": [
                q0,
                quat_from_euler_xyz(0.20, 0.05, -0.09),
                quat_from_euler_xyz(-0.46, -0.04, 0.06),
                q0,
            ],
        },
        {
            "node": tail_node,
            "path": "rotation",
            "times": [0.0, 0.16, 0.35],
            "values": [
                q0,
                quat_from_euler_xyz(-0.48, 0.0, 0.0),
                q0,
            ],
        },
        {
            "node": leg_nodes[0],
            "path": "rotation",
            "times": [0.0, 0.10, 0.21, 0.35],
            "values": [
                q0,
                quat_from_euler_xyz(0.42, 0.0, 0.0),
                quat_from_euler_xyz(-0.18, 0.0, 0.0),
                q0,
            ],
        },
        {
            "node": leg_nodes[2],
            "path": "rotation",
            "times": [0.0, 0.10, 0.21, 0.35],
            "values": [
                q0,
                quat_from_euler_xyz(0.36, 0.0, 0.0),
                quat_from_euler_xyz(-0.18, 0.0, 0.0),
                q0,
            ],
        },
        {
            "node": leg_nodes[1],
            "path": "rotation",
            "times": [0.0, 0.17, 0.35],
            "values": [
                q0,
                quat_from_euler_xyz(-0.26, 0.0, 0.0),
                q0,
            ],
        },
        {
            "node": leg_nodes[3],
            "path": "rotation",
            "times": [0.0, 0.17, 0.35],
            "values": [
                q0,
                quat_from_euler_xyz(-0.26, 0.0, 0.0),
                q0,
            ],
        },
    ]
    b.add_animation("Attack", attack_tracks)


def _verify_wolf_glb(glb_path):
    """Validates GLB binary header, world-space bounding box, shoulder height, nodes, normals & animations."""
    with open(glb_path, "rb") as f:
        raw = f.read()

    magic, version, total_len = struct.unpack_from("<III", raw, 0)
    assert magic == 0x46546C67, f"Invalid GLB magic: {hex(magic)}"
    assert version == 2, f"Invalid GLB version: {version}"
    assert total_len == len(raw), f"Length mismatch: {total_len} != {len(raw)}"

    json_len, json_type = struct.unpack_from("<II", raw, 12)
    assert json_type == 0x4E4F534A, "Missing JSON chunk"
    gltf = json.loads(raw[20 : 20 + json_len].decode("utf-8"))

    bin_offset = 20 + json_len
    bin_len, bin_type = struct.unpack_from("<II", raw, bin_offset)
    assert bin_type == 0x004E4942, "Missing BIN chunk"
    bin_buf = raw[bin_offset + 8 : bin_offset + 8 + bin_len]

    nodes = gltf["nodes"]
    meshes = gltf["meshes"]
    accessors = gltf["accessors"]
    buffer_views = gltf["bufferViews"]

    world_min = [float("inf"), float("inf"), float("inf")]
    world_max = [float("-inf"), float("-inf"), float("-inf")]
    shoulder_y_max = float("-inf")
    degenerate_normals = 0

    def walk_node(n_idx, parent_t=(0.0, 0.0, 0.0), parent_q=(0.0, 0.0, 0.0, 1.0)):
        nonlocal degenerate_normals, shoulder_y_max
        node = nodes[n_idx]
        nt = tuple(node.get("translation", [0.0, 0.0, 0.0]))
        nq = tuple(node.get("rotation", [0.0, 0.0, 0.0, 1.0]))
        wt = v_add(parent_t, quat_rotate_vec(parent_q, nt))
        x1, y1, z1, w1 = parent_q
        x2, y2, z2, w2 = nq
        wq = (
            w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2,
            w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2,
            w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2,
            w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2,
        )

        if "mesh" in node:
            is_body = node.get("name") == "WolfBody"
            for prim in meshes[node["mesh"]]["primitives"]:
                mat_name = gltf["materials"][prim["material"]]["name"]
                pos_acc = accessors[prim["attributes"]["POSITION"]]
                pos_bv = buffer_views[pos_acc["bufferView"]]
                base_off = pos_bv["byteOffset"]
                w_verts = []
                for vi in range(pos_acc["count"]):
                    lp = struct.unpack_from("<fff", bin_buf, base_off + vi * 12)
                    wp = v_add(wt, quat_rotate_vec(wq, lp))
                    w_verts.append(wp)
                    for k in range(3):
                        world_min[k] = min(world_min[k], wp[k])
                        world_max[k] = max(world_max[k], wp[k])
                    if is_body and -0.40 <= wp[2] <= -0.20:
                        shoulder_y_max = max(shoulder_y_max, wp[1])

                idx_acc = accessors[prim["indices"]]
                idx_bv = buffer_views[idx_acc["bufferView"]]
                i_off = idx_bv["byteOffset"]
                fmt = "<H" if idx_acc["componentType"] == 5123 else "<I"
                step = 2 if idx_acc["componentType"] == 5123 else 4
                for ti in range(0, idx_acc["count"], 3):
                    i0 = struct.unpack_from(fmt, bin_buf, i_off + ti * step)[0]
                    i1 = struct.unpack_from(fmt, bin_buf, i_off + (ti + 1) * step)[0]
                    i2 = struct.unpack_from(fmt, bin_buf, i_off + (ti + 2) * step)[0]
                    world_tris.append((w_verts[i0], w_verts[i1], w_verts[i2], mat_name))

                nrm_acc = accessors[prim["attributes"]["NORMAL"]]
                nrm_bv = buffer_views[nrm_acc["bufferView"]]
                n_off = nrm_bv["byteOffset"]
                for vi in range(nrm_acc["count"]):
                    nx, ny, nz = struct.unpack_from("<fff", bin_buf, n_off + vi * 12)
                    nl = math.sqrt(nx * nx + ny * ny + nz * nz)
                    if not (0.98 <= nl <= 1.02) or math.isnan(nl):
                        degenerate_normals += 1

        for c_idx in node.get("children", []):
            walk_node(c_idx, wt, wq)

    world_tris = []
    for r_idx in gltf["scenes"][0]["nodes"]:
        walk_node(r_idx)

    # Möller–Trumbore raycast to mathematically verify glowing amber eyes are directly visible
    # from straight front (-Z) AND 3/4 angles without brow/cheek/snout occlusion!
    def first_hit_mat(orig, direction):
        rd = v_norm(direction)
        best_t = float("inf")
        best_m = None
        for p0, p1, p2, mname in world_tris:
            e1 = v_sub(p1, p0)
            e2 = v_sub(p2, p0)
            h = v_cross(rd, e2)
            a = v_dot(e1, h)
            if abs(a) < 1e-9:
                continue
            f = 1.0 / a
            s = v_sub(orig, p0)
            u = f * v_dot(s, h)
            if u < 0.0 or u > 1.0:
                continue
            q = v_cross(s, e1)
            v_b = f * v_dot(rd, q)
            if v_b < 0.0 or u + v_b > 1.0:
                continue
            t_hit = f * v_dot(e2, q)
            if 1e-4 < t_hit < best_t:
                best_t = t_hit
                best_m = mname
        return best_m

    eye_hits_front = {-1: 0, 1: 0}
    eye_hits_3q = {-1: 0, 1: 0}
    for sgn in (-1, 1):
        for dx in (-0.014, -0.008, -0.003, 0.003, 0.008, 0.014):
            for dy in (-0.010, -0.005, 0.0, 0.005, 0.010):
                target = (sgn * 0.057 + dx, 0.74 + 0.036 + dy, -0.64 - 0.166)
                if first_hit_mat((target[0], target[1], -2.5), (0.0, 0.0, 1.0)) == "WolfGlowingAmberEye":
                    eye_hits_front[sgn] += 1
                cam_3q = (sgn * 1.1, 0.80, -2.2)
                if first_hit_mat(cam_3q, v_sub(target, cam_3q)) == "WolfGlowingAmberEye":
                    eye_hits_3q[sgn] += 1

    node_names = [n["name"] for n in nodes]
    anim_names = [a["name"] for a in gltf.get("animations", [])]

    required_nodes = {"head", "tail", "leg0", "leg1", "leg2", "leg3"}
    assert required_nodes.issubset(set(node_names)), f"Missing required nodes: {required_nodes - set(node_names)}"
    assert anim_names == ["Idle", "Walk", "Run", "Attack"], f"Unexpected animations: {anim_names}"
    assert -0.005 <= world_min[1] <= 0.01, f"y_min out of ground tolerance: {world_min[1]:.5f}"
    assert abs(world_min[0]) <= 0.228 and world_max[0] <= 0.228, f"Ruff width too wide: {world_min[0]}..{world_max[0]}"
    assert eye_hits_front[-1] >= 12 and eye_hits_front[1] >= 12, f"Eyes occluded head-on! Hits: {eye_hits_front}"
    assert eye_hits_3q[-1] >= 12 and eye_hits_3q[1] >= 12, f"Eyes occluded at 3/4! Hits: {eye_hits_3q}"
    assert degenerate_normals == 0, f"Found {degenerate_normals} degenerate normals!"

    return {
        "world_min": [round(v, 4) for v in world_min],
        "world_max": [round(v, 4) for v in world_max],
        "dimensions": [round(world_max[k] - world_min[k], 4) for k in range(3)],
        "shoulder_height": round(shoulder_y_max, 4),
        "eye_hits_front": eye_hits_front,
        "eye_hits_3q": eye_hits_3q,
        "node_names": node_names,
        "anim_names": anim_names,
        "degenerate_normals": degenerate_normals,
    }


if __name__ == "__main__":
    project_root = os.path.dirname(_SCRIPT_DIR)
    default_out = os.path.join(project_root, "assets", "wolf.glb")
    stats = build_wolf_glb(default_out)
    check = _verify_wolf_glb(default_out)
    print(f"[wolf.glb] Built {stats['filepath']} ({stats['bytes']:,} bytes)")
    print(f"  Triangles : {stats['triangles']:,}  |  Vertices: {stats['vertices']:,}")
    print(f"  World BBox: min={check['world_min']}  max={check['world_max']}  size={check['dimensions']}")
    print(f"  Shoulder H: {check['shoulder_height']}m  |  Eye Ray Hits (Front={check['eye_hits_front']}, 3/4={check['eye_hits_3q']})")
    print(f"  Animations: {check['anim_names']}  |  Degenerate normals: {check['degenerate_normals']}")
