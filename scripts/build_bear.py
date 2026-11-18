#!/usr/bin/env python3
"""
Builds a game-ready, anatomically sculpted Western Grizzly Bear binary glTF 2.0 asset (`assets/bear.glb`).

Architecture & Quadruped Game Contract:
  - Facing -Z (`z < 0` is forward toward nose at z ≈ -1.25m, `+Z` is rump/tail at z ≈ +1.02m, length ~2.27m).
  - Grounded cleanly with broad plantigrade paws resting at `y = 0.0`.
  - Imposing Western Grizzly proportions:
      * Prominent scapular shoulder hump height ~1.38m (`BearGrizzleFur` silver-frosted mantle).
      * Broad sculpted ursine head height ~1.32m (ears/crown slightly below the signature 1.38m shoulder hump).
      * Broad muscular chest & barrel ribcage width ~0.88m (`x` in `[-0.44, +0.44]`).
  - Named articulated child nodes:
      * `"head"` at `(0.0, 1.10, -0.84)`: broad ursine cranium, rounded furry cupped ears, heavy supraorbital
        brow ridge, glossy dark eyes with corneal catchlight & dark eyelid rim, concave stop into warm tan
        boxy muzzle (`"BearTanMuzzle"`), wet black rhinarium nose, and snarling parted jaw with curved ivory
        canines & incisors (`"IvoryClaws"`).
      * `"tail"` at `(0.0, 1.03, 0.90)`: short, thick, stubby furry grizzly tail.
      * `"leg0"` (front-left), `"leg1"` (back-left), `"leg2"` (front-right), `"leg3"` (back-right):
        thick muscular ursine limbs ending in broad plantigrade paws with leathery sole pads and
        5 sculpted toes + 5 long curved ivory grizzly claws (`"IvoryClaws"`) per paw (20 claws total).
  - Embedded glTF quaternion keyframe animations:
      * `"Idle"` (2.0s), `"Walk"` (1.0s), `"Run"` (0.6s), `"Attack"` (0.45s rearing/swiping head & foreleg maul/bite).
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

from glb_core import (  # noqa: E402
    GLBBuilder,
    catmull_rom_chain,
    quat_from_euler_xyz,
    quat_rotate_vec,
    v_add,
    v_cross,
    v_dot,
    v_len,
    v_lerp,
    v_mul,
    v_norm,
    v_sub,
)


# ---------------------------------------------------------------------------
# Seamless Multi-Material Organic Sculpting Helpers
# ---------------------------------------------------------------------------

def _smoothstep(edge0, edge1, x):
    if abs(edge1 - edge0) < 1e-9:
        return 1.0 if x >= edge1 else 0.0
    t = max(0.0, min(1.0, (x - edge0) / (edge1 - edge0)))
    return t * t * (3.0 - 2.0 * t)


def _eval_piecewise_theta(u_idx, u_total, u_ventral, theta_ventral, u_dorsal_half, theta_dorsal_half):
    """
    Piecewise-smooth angular mapping around a symmetric bilateral cross-section (u = 0..u_total-1).
      - u = 0                 : ventral midline (theta = 0, bottom)
      - u = u_ventral         : right ventral-to-flank boundary (theta = theta_ventral)
      - u = u_total // 2      : dorsal midline (theta = pi, spine/hump)
      - u = u_total - u_ventral: left ventral-to-flank boundary
    Aligning material zones to exact quad columns prevents jagged sawtooth boundaries while
    sharing 100% unified smooth vertex normals across pelage transitions.
    """
    half = u_total // 2
    mirror = u_idx > half
    u_sym = (u_total - u_idx) if mirror else u_idx

    u_dors_start = half - u_dorsal_half
    theta_dors_start = math.pi - theta_dorsal_half

    if u_sym <= u_ventral:
        f = u_sym / max(1, u_ventral)
        th = f * theta_ventral
    elif u_sym <= u_dors_start:
        f = (u_sym - u_ventral) / max(1, u_dors_start - u_ventral)
        th = theta_ventral + f * (theta_dors_start - theta_ventral)
    else:
        f = (u_sym - u_dors_start) / max(1, half - u_dors_start)
        th = theta_dors_start + f * (math.pi - theta_dors_start)

    return (2.0 * math.pi - th) if mirror else th


def _emit_unified_smooth_grid(
    gp_fn,
    rings,
    quad_mat_fn,
    closed_u=True,
    uv_u_scale=1.0,
    uv_v_scale=1.0,
    cap_start_mat=None,
    cap_start_apex=None,
    cap_start_normal=None,
    cap_end_mat=None,
    cap_end_apex=None,
    cap_end_normal=None,
):
    """
    Emits a multi-material smooth-shaded grid where vertex normals are accumulated across the
    ENTIRE unified surface before partitioning quads by material. Shared boundary vertices between
    materials have identical positions AND identical normals (zero shading seam, zero degenerate tris).
    """
    v_count = len(rings)
    if v_count < 2:
        return
    u_unique = len(rings[0])
    if closed_u and u_unique < 3:
        return

    do_flip = False
    if closed_u:
        outward_score = 0.0
        for v in range(v_count - 1):
            c0 = (
                sum(p[0] for p in rings[v]) / u_unique,
                sum(p[1] for p in rings[v]) / u_unique,
                sum(p[2] for p in rings[v]) / u_unique,
            )
            c1 = (
                sum(p[0] for p in rings[v + 1]) / u_unique,
                sum(p[1] for p in rings[v + 1]) / u_unique,
                sum(p[2] for p in rings[v + 1]) / u_unique,
            )
            mid_c = v_lerp(c0, c1, 0.5)
            for u in range(u_unique):
                un = (u + 1) % u_unique
                p00 = rings[v][u]
                p10 = rings[v][un]
                p11 = rings[v + 1][un]
                fn = v_cross(v_sub(p10, p00), v_sub(p11, p00))
                tri_mid = (
                    (p00[0] + p10[0] + p11[0]) / 3.0,
                    (p00[1] + p10[1] + p11[1]) / 3.0,
                    (p00[2] + p10[2] + p11[2]) / 3.0,
                )
                outward_score += v_dot(fn, v_sub(tri_mid, mid_c))
        if outward_score < 0.0:
            do_flip = True

    unique_normals = [[(0.0, 0.0, 0.0) for _ in range(u_unique)] for _ in range(v_count)]
    u_quads = u_unique if closed_u else (u_unique - 1)

    for v in range(v_count - 1):
        for u in range(u_quads):
            u1 = (u + 1) % u_unique if closed_u else (u + 1)
            p00 = rings[v][u]
            p10 = rings[v][u1]
            p01 = rings[v + 1][u]
            p11 = rings[v + 1][u1]
            if not do_flip:
                n1 = v_cross(v_sub(p10, p00), v_sub(p11, p00))
                n2 = v_cross(v_sub(p11, p00), v_sub(p01, p00))
            else:
                n1 = v_cross(v_sub(p11, p00), v_sub(p10, p00))
                n2 = v_cross(v_sub(p01, p00), v_sub(p11, p00))

            unique_normals[v][u] = v_add(unique_normals[v][u], v_add(n1, n2))
            unique_normals[v][u1] = v_add(unique_normals[v][u1], n1)
            unique_normals[v + 1][u1] = v_add(unique_normals[v + 1][u1], v_add(n1, n2))
            unique_normals[v + 1][u] = v_add(unique_normals[v + 1][u], n2)

    if closed_u and cap_start_apex is not None and cap_start_normal is not None:
        n_ap = v_norm(cap_start_normal)
        for u in range(u_unique):
            unique_normals[0][u] = v_add(unique_normals[0][u], v_mul(n_ap, 1e-4))
    if closed_u and cap_end_apex is not None and cap_end_normal is not None:
        n_ap = v_norm(cap_end_normal)
        for u in range(u_unique):
            unique_normals[-1][u] = v_add(unique_normals[-1][u], v_mul(n_ap, 1e-4))

    for v in range(v_count):
        for u in range(u_unique):
            unique_normals[v][u] = v_norm(unique_normals[v][u])

    v_arc = [0.0]
    for v in range(1, v_count):
        d = v_len(v_sub(rings[v][0], rings[v - 1][0]))
        v_arc.append(v_arc[-1] + d)
    total_v = v_arc[-1] if v_arc[-1] > 1e-6 else 1.0

    vert_cache = {}

    def get_vert(mat_idx, v, col):
        key = (mat_idx, v, col)
        if key in vert_cache:
            return vert_cache[key]
        part = gp_fn(mat_idx)
        u_idx = col % u_unique
        uu = (col / (u_unique if closed_u else max(1, u_unique - 1))) * uv_u_scale
        vv = (v_arc[v] / total_v) * uv_v_scale
        idx = len(part.positions)
        part.positions.append(rings[v][u_idx])
        part.normals.append(unique_normals[v][u_idx])
        part.uvs.append((uu, vv))
        vert_cache[key] = idx
        return idx

    for v in range(v_count - 1):
        for u in range(u_quads):
            mat_idx = quad_mat_fn(v, u)
            part = gp_fn(mat_idx)
            i00 = get_vert(mat_idx, v, u)
            i10 = get_vert(mat_idx, v, u + 1)
            i01 = get_vert(mat_idx, v + 1, u)
            i11 = get_vert(mat_idx, v + 1, u + 1)
            if not do_flip:
                part.indices.extend([i00, i10, i11, i00, i11, i01])
            else:
                part.indices.extend([i00, i11, i10, i00, i01, i11])

    def emit_apex_fan(ring_v, mat_idx, apex_pt, out_normal):
        part = gp_fn(mat_idx)
        n_ap = v_norm(out_normal)
        apex_idx = len(part.positions)
        part.positions.append(apex_pt)
        part.normals.append(n_ap)
        part.uvs.append((0.5 * uv_u_scale, (0.0 if ring_v == 0 else 1.0) * uv_v_scale))
        p0 = rings[ring_v][0]
        p1 = rings[ring_v][1]
        test_n = v_cross(v_sub(p0, apex_pt), v_sub(p1, apex_pt))
        fan_flip = v_dot(test_n, n_ap) < 0.0
        for u in range(u_unique):
            iv0 = get_vert(mat_idx, ring_v, u)
            iv1 = get_vert(mat_idx, ring_v, u + 1)
            if not fan_flip:
                part.indices.extend([apex_idx, iv0, iv1])
            else:
                part.indices.extend([apex_idx, iv1, iv0])

    if closed_u and cap_start_mat is not None and cap_start_apex is not None and cap_start_normal is not None:
        emit_apex_fan(0, cap_start_mat, cap_start_apex, cap_start_normal)
    if closed_u and cap_end_mat is not None and cap_end_apex is not None and cap_end_normal is not None:
        emit_apex_fan(v_count - 1, cap_end_mat, cap_end_apex, cap_end_normal)


def _add_shaggy_ruff_collar(
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
    spike_amp=0.068,
    ventral_drop=0.040,
    harm_sign=1.0,
    u_segs=24,
):
    """
    Watertight shaggy grizzly neck/shoulder fur ruff layer (`closed_u=True`).
    Tucks cleanly inside the torso at both ends while sculpting thick, plush, grizzled fur locks
    around the heavy neck, throat dewlap, and fore-shoulder.
    """
    ring_specs = [
        (0.00, 0.70, 0.00, 0.00),
        (0.26, 0.91, 0.25, 0.50),
        (0.58, 1.00, 0.88, 1.00),
        (0.82, 0.89, 0.52, 0.45),
        (1.00, 0.68, 0.06, 0.00),
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

            tuft_wave = harm_sign * 0.62 * math.sin(ang * odd_harm) + 0.38 * math.cos(ang * even_harm)
            tuft_factor = 1.0 + spike_amp * spike_mult * tuft_wave
            r_crest_y = r_crest_y_top if sa >= 0.0 else r_crest_y_bot

            base_r = r_inner_front * (1.0 - s_pos) + r_inner_back * s_pos
            rx = (base_r * (1.0 - spike_mult) + r_crest_x * spike_mult) * r_mult * tuft_factor
            ry = (base_r * 0.82 * (1.0 - spike_mult) + r_crest_y * spike_mult) * r_mult * tuft_factor

            dz_tuft = sweep_back_z * sweep_mult * (0.78 + 0.34 * max(0.0, tuft_wave))
            dy_chest = -ventral_drop * sweep_mult * max(0.0, -sa) * (0.70 + 0.30 * (sa * sa))

            ring.append((cx + ca * rx, cy + sa * ry + dy_chest, cz + dz_tuft))
        rings.append(ring)

    part.add_smooth_grid(rings, closed_u=True, ensure_outward=True)


def _add_fur_tuft_lock(part, base_pt, mid_pt, tip_pt, r_base, width_scale=1.30, u_segs=5):
    """Sculpts a thick, pointed shaggy bear fur lock (shoulder hump hackle, cheek jowl, elbow fringe)."""
    spine = catmull_rom_chain([base_pt, mid_pt, tip_pt], samples_per_seg=2)

    def sec(t, theta):
        r = max(0.0020, r_base * ((1.0 - t) ** 1.10) * (0.88 + 0.14 * math.sin(t * math.pi)))
        return (math.cos(theta) * r * width_scale, math.sin(theta) * r * 0.65)

    part.add_loft(spine, sec, u_segs=u_segs, cap_start=False, cap_end=True, up_hint=(0.0, 1.0, 0.0))


# ---------------------------------------------------------------------------
# Anatomical Sub-Assemblers for Western Grizzly Bear
# ---------------------------------------------------------------------------

def _build_seamless_grizzly_body(gp, mat_brown, mat_grizzle, mat_under):
    """
    Sculpts a massive, seamless barrel-chested Western Grizzly torso (`z` from +0.96 rump to -0.88 neck socket):
      - Broad muscular chest (`width = 0.880m`, `x` in `[-0.440, +0.440]`).
      - Prominent grizzly scapular shoulder hump peaking at `y = 1.380m` (`z ≈ -0.38`).
      - Silver-tipped `"BearGrizzleFur"` dorsal mantle across shoulder hump, neck crest & upper back,
        sharing C1 smooth normals with `"BearBrownFur"` chocolate flanks and `"BearDarkUnderfur"` belly.
      - 3-layered shaggy neck/shoulder ruff + sculpted grizzled dorsal hackle & brisket locks.
    """
    stations_ctrl = [
        # (y_dorsal, z_dorsal, y_ventral, z_ventral, rx, under_h, grizzle_h)
        (1.010,  0.948, 0.885,  0.942, 0.072, 0.28, 0.18),  # 0: rear rump dome ring
        (1.135,  0.875, 0.735,  0.865, 0.228, 0.26, 0.20),  # 1: upper rump curve
        (1.238,  0.680, 0.595,  0.675, 0.355, 0.22, 0.24),  # 2: massive rounded hindquarters
        (1.250,  0.420, 0.530,  0.420, 0.388, 0.21, 0.27),  # 3: heavy lumbar / hip barrel
        (1.238,  0.120, 0.492,  0.120, 0.402, 0.21, 0.29),  # 4: low-slung ursine mid-barrel
        (1.286, -0.155, 0.474, -0.155, 0.408, 0.20, 0.35),  # 5: broad fore-ribcage
        (1.374, -0.380, 0.466, -0.385, 0.400, 0.19, 0.42),  # 6: PROMINENT GRIZZLY SHOULDER HUMP (~1.38m) & 0.88m chest!
        (1.308, -0.565, 0.565, -0.585, 0.336, 0.19, 0.44),  # 7: anterior hump slope into muscular neck
        (1.232, -0.710, 0.728, -0.735, 0.262, 0.20, 0.42),  # 8: thick shaggy neck mid-section
        (1.192, -0.815, 0.872, -0.832, 0.202, 0.21, 0.38),  # 9: occipital neck collar around head base
        (1.148, -0.865, 0.975, -0.865, 0.112, 0.22, 0.34),  # 10: inner ball condyle inside "head" socket
    ]

    dorsal_pts = catmull_rom_chain([(c[0], c[1], 0.0) for c in stations_ctrl], samples_per_seg=2)
    ventral_pts = catmull_rom_chain([(c[2], c[3], 0.0) for c in stations_ctrl], samples_per_seg=2)
    meta_pts = catmull_rom_chain([(c[4], c[5], c[6]) for c in stations_ctrl], samples_per_seg=2)

    v_count = len(dorsal_pts)
    u_segs = 24
    u_under = 3          # 6 ventral quads around belly/brisket midline
    u_grizzle_half = 4   # 8 dorsal quads across grizzled saddle & shoulder hump

    rings = []
    for v in range(v_count):
        s = v / (v_count - 1)
        yd, zd, _ = dorsal_pts[v]
        yv, zv, _ = ventral_pts[v]
        rx_base, under_h, grizzle_h = meta_pts[v]
        rx_base = max(0.045, rx_base)
        under_h = max(0.12, min(0.42, under_h))
        grizzle_h = max(0.14, min(0.48, grizzle_h))

        th_under = math.acos(max(-0.96, min(0.96, 1.0 - 2.0 * under_h)))
        th_grizzle = math.acos(max(-0.96, min(0.96, 1.0 - 2.0 * grizzle_h)))

        c_mid = (0.0, 0.5 * (yd + yv), 0.5 * (zd + zv))
        up_half = (0.0, 0.5 * (yd - yv), 0.5 * (zd - zv))

        haunch_w = math.exp(-((s - 0.22) / 0.11) ** 2)
        chest_w = math.exp(-((s - 0.57) / 0.14) ** 2)
        hump_w = math.exp(-((s - 0.60) / 0.09) ** 2)

        ring = []
        for u in range(u_segs):
            th = _eval_piecewise_theta(u, u_segs, u_under, th_under, u_grizzle_half, th_grizzle)
            u_vert = -math.cos(th)
            u_lat = math.sin(th)

            # Broad heavy barrel chest (`max |x| = 0.440m` -> 0.880m width!) + sculpted scapular hump dome
            belly_round = 1.0 - 0.08 * (max(0.0, -u_vert) ** 1.8)
            hump_dome = 1.0 - 0.18 * hump_w * (max(0.0, u_vert) ** 2.0)
            rib_swell = 1.0 + 0.082 * chest_w * math.exp(-((u_vert + 0.06) / 0.52) ** 2)
            haunch_swell = 1.0 + 0.055 * haunch_w * math.exp(-((u_vert + 0.10) / 0.48) ** 2)

            rx = min(0.440, rx_base * belly_round * hump_dome * rib_swell * haunch_swell)
            px = u_lat * rx
            py = c_mid[1] + u_vert * up_half[1]
            pz = c_mid[2] + u_vert * up_half[2]
            ring.append((px, py, pz))
        rings.append(ring)

    half = u_segs // 2

    def body_quad_mat(v, u):
        if u < u_under or u >= (u_segs - u_under):
            return mat_under
        # Prominent grizzled silver-tipped dorsal fur across shoulder hump, neck & saddle
        s_v = v / max(1, v_count - 1)
        dors_span = u_grizzle_half if 0.36 <= s_v <= 0.90 else (u_grizzle_half - 1)
        if (half - dors_span) <= u < (half + dors_span) and v >= 2:
            return mat_grizzle
        return mat_brown

    _emit_unified_smooth_grid(
        gp,
        rings,
        body_quad_mat,
        closed_u=True,
        uv_u_scale=2.5,
        uv_v_scale=3.5,
        cap_start_mat=mat_brown,
        cap_start_apex=(0.0, 0.950, 0.968),
        cap_start_normal=(0.0, -0.05, 1.0),
        cap_end_mat=mat_brown,
        cap_end_apex=(0.0, 1.062, -0.888),
        cap_end_normal=(0.0, 0.15, -0.98),
    )

    grizzle_p = gp(mat_grizzle)
    brown_p = gp(mat_brown)

    # 3-Layered Shaggy Grizzly Neck & Fore-Shoulder Ruff (`BearGrizzleFur` + `BearBrownFur`)
    # Kept cleanly inside +-0.435m width and <= 1.380m hump peak!
    _add_shaggy_ruff_collar(
        brown_p,
        center_front=(0.0, 1.03, -0.80),
        center_back=(0.0, 0.98, -0.64),
        r_inner_front=0.175,
        r_crest_x=0.285,
        r_crest_y_top=0.185,
        r_crest_y_bot=0.245,
        r_inner_back=0.235,
        sweep_back_z=0.095,
        odd_harm=5,
        even_harm=8,
        spike_amp=0.068,
        ventral_drop=0.045,
        harm_sign=1.0,
        u_segs=20,
    )
    _add_shaggy_ruff_collar(
        grizzle_p,
        center_front=(0.0, 1.00, -0.71),
        center_back=(0.0, 0.95, -0.52),
        r_inner_front=0.225,
        r_crest_x=0.352,
        r_crest_y_top=0.245,
        r_crest_y_bot=0.295,
        r_inner_back=0.295,
        sweep_back_z=0.115,
        odd_harm=7,
        even_harm=6,
        spike_amp=0.072,
        ventral_drop=0.048,
        harm_sign=-1.0,
        u_segs=20,
    )
    _add_shaggy_ruff_collar(
        grizzle_p,
        center_front=(0.0, 0.96, -0.58),
        center_back=(0.0, 0.92, -0.36),
        r_inner_front=0.285,
        r_crest_x=0.402,
        r_crest_y_top=0.340,
        r_crest_y_bot=0.335,
        r_inner_back=0.335,
        sweep_back_z=0.130,
        odd_harm=7,
        even_harm=8,
        spike_amp=0.065,
        ventral_drop=0.038,
        harm_sign=1.0,
        u_segs=20,
    )

    # Sculpted Silver-Tipped Grizzled Dorsal Hump Crest Locks (peaking cleanly at y = 1.380m!)
    hump_locks = [
        (0.0, 1.315, -0.50, 0.0, 1.368, -0.42, 0.0, 1.352, -0.33, 0.052),
        (0.0, 1.330, -0.41, 0.0, 1.362, -0.31, 0.0, 1.335, -0.21, 0.056),
        (0.0, 1.295, -0.28, 0.0, 1.325, -0.18, 0.0, 1.295, -0.08, 0.048),
    ]
    for bx, by, bz, mx, my, mz, tx, ty, tz, rb in hump_locks:
        _add_fur_tuft_lock(grizzle_p, (bx, by, bz), (mx, my, mz), (tx, ty, tz), r_base=rb, width_scale=1.45, u_segs=6)

    for sgn in (-1, 1):
        # Lateral shoulder hump grizzled locks
        _add_fur_tuft_lock(
            grizzle_p,
            (sgn * 0.14, 1.28, -0.45),
            (sgn * 0.19, 1.31, -0.35),
            (sgn * 0.17, 1.26, -0.24),
            r_base=0.046,
            width_scale=1.35,
            u_segs=6,
        )
        # Shaggy chocolate brisket & lower flank locks
        _add_fur_tuft_lock(
            brown_p,
            (sgn * 0.12, 0.62, -0.62),
            (sgn * 0.15, 0.52, -0.55),
            (sgn * 0.12, 0.45, -0.46),
            r_base=0.048,
            width_scale=1.30,
            u_segs=6,
        )
        _add_fur_tuft_lock(
            brown_p,
            (sgn * 0.34, 0.68, -0.22),
            (sgn * 0.39, 0.58, -0.14),
            (sgn * 0.36, 0.51, -0.04),
            r_base=0.044,
            width_scale=1.25,
            u_segs=6,
        )


def _build_stubby_tail_mesh(gp, mat_brown, mat_grizzle):
    """
    Sculpts a short, thick, furry stubby grizzly tail in local space of `"tail"` at `(0.0, 1.03, 0.90)`.
    Reaches local `z = +0.120` -> world `z_max = +1.020m`!
    """
    spine = catmull_rom_chain([
        (0.0,  0.015, -0.025),
        (0.0, -0.005,  0.030),
        (0.0, -0.038,  0.078),
        (0.0, -0.072,  0.108),
    ], samples_per_seg=2)

    m = len(spine)
    u_segs = 10
    rings = []
    for i, c in enumerate(spine):
        t = i / (m - 1)
        puff = math.sin(max(0.10, min(0.92, t)) * math.pi) ** 0.55
        rx = 0.064 * (1.0 - 0.38 * t) + 0.018 * puff
        ry = 0.058 * (1.0 - 0.36 * t) + 0.016 * puff
        ring = []
        for u in range(u_segs):
            th = (u / u_segs) * math.pi * 2.0
            tuft = 1.0 + 0.08 * math.cos(th * 5.0) * puff
            px = math.sin(th) * rx * tuft
            py = c[1] - math.cos(th) * ry * 0.85 * tuft
            pz = c[2] - math.cos(th) * ry * 0.35
            ring.append((px, py, pz))
        rings.append(ring)

    def tail_mat(v, u):
        if 3 <= u <= 6 and v < m - 2:
            return mat_grizzle
        return mat_brown

    _emit_unified_smooth_grid(
        gp,
        rings,
        tail_mat,
        closed_u=True,
        uv_u_scale=1.0,
        uv_v_scale=1.0,
        cap_start_mat=mat_brown,
        cap_start_apex=(0.0, 0.025, -0.042),
        cap_start_normal=(0.0, 0.25, -0.97),
        cap_end_mat=mat_brown,
        cap_end_apex=(0.0, -0.088, 0.120),
        cap_end_normal=(0.0, -0.55, 0.83),
    )


def _add_rounded_bear_ear(gp, mat_brown, mat_grizzle, mat_tan, sgn):
    """
    Sculpts a characteristic wide-set, rounded semicircular furry grizzly ear on `"head"`
    (`origin = (0.0, 1.10, -0.84)`). Top of rounded ear rim reaches `y_local = +0.220` -> world `y = 1.320m`!
    """
    ear_ctrl = [
        (sgn * 0.118, 0.102,  0.018),
        (sgn * 0.142, 0.148,  0.014),
        (sgn * 0.158, 0.188,  0.010),
        (sgn * 0.162, 0.210,  0.008),
    ]
    spine = catmull_rom_chain(ear_ctrl, samples_per_seg=2)
    m = len(spine)
    u_segs = 10

    axis = v_norm(v_sub(spine[-1], spine[0]))
    hollow_dir = v_norm((sgn * 0.18, 0.08, -0.98))
    blade_wide = v_norm(v_cross(axis, hollow_dir))
    hollow_dir = v_norm(v_cross(blade_wide, axis))

    rings = []
    for i, c in enumerate(spine):
        t = i / (m - 1)
        # Broad rounded semicircular ursine pinna (wide near middle & rounded top, NOT pointed!)
        round_env = math.sin(min(0.94, max(0.14, 0.18 + 0.74 * t)) * math.pi) ** 0.52
        ear_w = 0.052 * round_env + 0.012 * (1.0 - t)
        cup_depth = 0.020 * (math.sin(min(0.92, max(0.10, t)) * math.pi) ** 0.75)
        wall_thick = 0.015 * (1.0 - 0.30 * t)

        ring = []
        for u in range(u_segs):
            th = (u / u_segs) * math.pi * 2.0
            lat = math.cos(th) * ear_w
            s_th = math.sin(th)
            if s_th >= 0.0:
                d_hol = -(cup_depth * s_th + wall_thick)
            else:
                rim_roll = -s_th
                if t < 0.20:
                    d_hol = wall_thick * (1.0 - 0.85 * rim_roll)
                else:
                    d_hol = -(cup_depth * 0.58 * rim_roll) + wall_thick * 0.45
            pt = v_add(c, v_add(v_mul(blade_wide, lat), v_mul(hollow_dir, d_hol)))
            ring.append(pt)
        rings.append(ring)

    def ear_quad_mat(v, u):
        if 6 <= u <= 9 and 1 <= v <= m - 2:
            return mat_tan
        if v >= m - 3:
            return mat_grizzle
        return mat_brown

    tip_apex = v_add(spine[-1], v_mul(axis, 0.010))
    base_apex = v_add(spine[0], v_mul(axis, -0.012))
    _emit_unified_smooth_grid(
        gp,
        rings,
        ear_quad_mat,
        closed_u=True,
        uv_u_scale=1.0,
        uv_v_scale=1.0,
        cap_start_mat=mat_brown,
        cap_start_apex=base_apex,
        cap_start_normal=v_mul(axis, -1.0),
        cap_end_mat=mat_grizzle,
        cap_end_apex=tip_apex,
        cap_end_normal=axis,
    )


def _build_grizzly_head(gp, mat_brown, mat_grizzle, mat_tan, mat_nose, mat_mouth, mat_ivory, mat_eye, mat_glint):
    """
    Sculpts the articulated Western Grizzly `"head"` node (pivot at `(0.0, 1.10, -0.84)`):
      - Broad massive cranium (`rx ≈ 0.195`) with sagittal/frontal dish & heavy supraorbital brow ridge.
      - Rounded furry cupped ears (`y_world_max ≈ 1.320m`).
      - Seamless transition at concave ursine stop into warm boxy `"BearTanMuzzle"`.
      - Wet black rhinarium nose with flared nostrils reaching exact `z_local = -0.410` (`z_world = -1.250m`).
      - Glossy dark eyes (`"BearGlossyEye"`) with dark eyelid rim + crisp corneal catchlight (`"BearEyeCatchlight"`),
        100% unobstructed from front (`-Z`) and 3/4 views.
      - Snarling parted lower jaw with crimson mouth interior and 4 thick curved ivory canines + incisors (`"IvoryClaws"`).
    """
    # 1. Unified Broad Ursine Cranium + Dished Stop + Boxy Tan Muzzle
    head_ctrl = [
        # (y_top, z_top, y_bot, z_bot, rx, tan_zone, grizzle_h)
        (0.115,  0.092, -0.135,  0.082, 0.155, 0.0, 0.34),  # 0: occipital socket collar
        (0.156,  0.025, -0.155,  0.015, 0.194, 0.0, 0.38),  # 1: massive zygomatic / parietal skull
        (0.162, -0.052, -0.148, -0.055, 0.194, 0.0, 0.40),  # 2: broad frontal crown
        (0.132, -0.122, -0.118, -0.125, 0.166, 0.0, 0.38),  # 3: heavy supraorbital brow plane
        (0.055, -0.185, -0.062, -0.188, 0.096, 1.0, 0.25),  # 4: concave ursine dish / orbital stop!
        (0.046, -0.258, -0.054, -0.258, 0.086, 1.0, 0.22),  # 5: strong boxy tan nasal bridge
        (0.036, -0.326, -0.050, -0.326, 0.077, 1.0, 0.20),  # 6: broad fore-muzzle
        (0.018, -0.376, -0.044, -0.372, 0.062, 1.0, 0.18),  # 7: muzzle front into wet rhinarium
    ]

    h_dors = catmull_rom_chain([(c[0], c[1], 0.0) for c in head_ctrl], samples_per_seg=2)
    h_vent = catmull_rom_chain([(c[2], c[3], 0.0) for c in head_ctrl], samples_per_seg=2)
    h_meta = catmull_rom_chain([(c[4], c[5], c[6]) for c in head_ctrl], samples_per_seg=2)

    hv_cnt = len(h_dors)
    hu_segs = 18
    hu_under = 3
    hu_griz_half = 3

    h_rings = []
    for v in range(hv_cnt):
        s = v / (hv_cnt - 1)
        yd, zd, _ = h_dors[v]
        yv, zv, _ = h_vent[v]
        rx_b, _, griz_h = h_meta[v]
        rx_b = max(0.032, rx_b)
        griz_h = max(0.16, min(0.44, griz_h))

        th_un = math.acos(1.0 - 2.0 * 0.22)
        th_gr = math.acos(1.0 - 2.0 * griz_h)
        cy = 0.5 * (yd + yv)
        cz = 0.5 * (zd + zv)
        hy = 0.5 * (yd - yv)
        hz = 0.5 * (zd - zv)

        cheek_ruff = math.exp(-((s - 0.24) / 0.14) ** 2)
        brow_zone = math.exp(-((s - 0.42) / 0.09) ** 2)
        muzzle_box = _smoothstep(0.50, 0.72, s)

        ring = []
        for u in range(hu_segs):
            th = _eval_piecewise_theta(u, hu_segs, hu_under, th_un, hu_griz_half, th_gr)
            uv_y = -math.cos(th)
            ul_x = math.sin(th)

            # Broad ursine jowls at rear skull, heavy brow arch above eye, flat upper palate on snout
            jowl_flare = 1.0 + 0.10 * cheek_ruff * math.exp(-((uv_y + 0.22) / 0.45) ** 2)
            brow_arch = 1.0 + 0.10 * brow_zone * math.exp(-((uv_y - 0.62) / 0.28) ** 2)
            snout_sq = 1.0 + 0.10 * muzzle_box * (ul_x * ul_x) * (1.0 - 0.35 * abs(uv_y))
            palate_flat = 1.0 - 0.28 * muzzle_box * max(0.0, -uv_y)

            rx = rx_b * jowl_flare * brow_arch * snout_sq
            ring.append((ul_x * rx, cy + uv_y * hy * palate_flat, cz + uv_y * hz))
        h_rings.append(ring)

    h_half = hu_segs // 2

    def head_quad_mat(v, u):
        s_v = v / max(1, hv_cnt - 1)
        # Warm tan ursine muzzle forward of the orbital stop
        if s_v >= 0.52:
            return mat_tan
        if (h_half - hu_griz_half) <= u < (h_half + hu_griz_half) and v >= 1:
            return mat_grizzle
        return mat_brown

    _emit_unified_smooth_grid(
        gp,
        h_rings,
        head_quad_mat,
        closed_u=True,
        uv_u_scale=1.8,
        uv_v_scale=1.8,
        cap_start_mat=mat_brown,
        cap_start_apex=(0.0, -0.010, 0.108),
        cap_start_normal=(0.0, 0.0, 1.0),
        cap_end_mat=mat_nose,
        cap_end_apex=(0.0, -0.012, -0.390),
        cap_end_normal=(0.0, -0.05, -1.0),
    )

    brown_p = gp(mat_brown)
    grizzle_p = gp(mat_grizzle)
    tan_p = gp(mat_tan)
    nose_p = gp(mat_nose)
    mouth_p = gp(mat_mouth)
    ivory_p = gp(mat_ivory)
    eye_p = gp(mat_eye)
    glint_p = gp(mat_glint)

    # 2. Large Wet Black Ursine Rhinarium Nose Pad (frontmost point at z_local = -0.410 -> z_world = -1.250!)
    def rhinarium_deform(x, y, z, frac, th):
        top_flare = 1.0 + 0.28 * max(-0.6, min(1.0, y / 0.034))
        philtrum = -0.0025 * math.exp(-((x / 0.010) ** 2)) * max(0.0, -z / 0.025)
        return (x * top_flare, y, z + philtrum)

    nose_p.add_ellipsoid(
        center=(0.0, 0.004, -0.384),
        radii=(0.046, 0.035, 0.026),
        u_segs=12,
        v_segs=7,
        deform_fn=rhinarium_deform,
    )
    for sgn in (-1, 1):
        # Flared comma-shaped bear nostril rims
        nose_p.add_tube(
            [
                (sgn * 0.015, 0.006, -0.406),
                (sgn * 0.034, 0.016, -0.396),
                (sgn * 0.042, 0.004, -0.378),
            ],
            0.0075,
            0.0048,
            u_segs=6,
            samples_per_seg=2,
        )

    # 3. Snarling Upper Lip Flews + Crimson Upper Palate
    for sgn in (-1, 1):
        nose_p.add_tube(
            [
                (sgn * 0.078, -0.054, -0.205),
                (sgn * 0.068, -0.044, -0.275),
                (sgn * 0.052, -0.038, -0.338),
                (0.0, -0.036, -0.378),
            ],
            0.013,
            0.009,
            u_segs=6,
            samples_per_seg=2,
            scale_xy=(0.90, 1.15),
        )

    mouth_p.add_loft(
        [(0.0, -0.046, -0.195), (0.0, -0.043, -0.285), (0.0, -0.040, -0.362)],
        lambda t, th: (math.cos(th) * 0.058 * (1.0 - 0.38 * t), math.sin(th) * 0.011),
        u_segs=8,
        cap_start=True,
        cap_end=True,
        up_hint=(0.0, 1.0, 0.0),
    )

    # 4. Parted Snarling Lower Jaw (`mandible` — chocolate chin, tan jaw sides, wet black lip, crimson tongue)
    jaw_spine = catmull_rom_chain([
        (0.0, -0.088, -0.115),
        (0.0, -0.112, -0.210),
        (0.0, -0.122, -0.295),
        (0.0, -0.120, -0.358),
    ], samples_per_seg=2)

    def lower_jaw_sec(t, theta):
        rx = 0.088 * (1.0 - 0.44 * (t ** 1.15))
        ry = 0.046 * (1.0 - 0.42 * t)
        ct, st = math.cos(theta), math.sin(theta)
        if st > 0.0:
            return (ct * rx * 0.94, st * ry * 0.38)
        return (ct * rx, st * ry)

    tan_p.add_loft(jaw_spine, lower_jaw_sec, u_segs=10, cap_start=True, cap_end=True, up_hint=(0.0, 1.0, 0.0))

    # Shaggy chocolate chin beard tuft underneath mandible
    _add_fur_tuft_lock(
        brown_p,
        (0.0, -0.125, -0.265),
        (0.0, -0.158, -0.205),
        (0.0, -0.172, -0.135),
        r_base=0.044,
        width_scale=1.45,
        u_segs=6,
    )

    for sgn in (-1, 1):
        nose_p.add_tube(
            [(sgn * 0.068, -0.094, -0.205), (sgn * 0.052, -0.106, -0.285), (0.0, -0.106, -0.352)],
            0.0105,
            0.0075,
            u_segs=5,
            samples_per_seg=2,
        )

    # Fleshy crimson bear tongue & lower gums
    mouth_p.add_loft(
        [(0.0, -0.088, -0.200), (0.0, -0.098, -0.275), (0.0, -0.098, -0.338)],
        lambda t, th: (math.cos(th) * 0.044 * (1.0 - 0.30 * t), math.sin(th) * 0.014),
        u_segs=8,
        cap_start=True,
        cap_end=True,
        up_hint=(0.0, 1.0, 0.0),
    )

    # 5. Curved Ivory Grizzly Canines, Premolars & Incisor Rows (`"IvoryClaws"`)
    for sgn in (-1, 1):
        # Massive Upper Canine Fang
        ivory_p.add_tube(
            [
                (sgn * 0.044, -0.036, -0.324),
                (sgn * 0.043, -0.064, -0.328),
                (sgn * 0.040, -0.088, -0.324),
            ],
            0.0125,
            0.0020,
            u_segs=7,
            samples_per_seg=2,
        )
        # Thick Lower Canine Fang
        ivory_p.add_tube(
            [
                (sgn * 0.036, -0.108, -0.304),
                (sgn * 0.035, -0.084, -0.308),
                (sgn * 0.033, -0.064, -0.305),
            ],
            0.0108,
            0.0020,
            u_segs=7,
            samples_per_seg=2,
        )
        # Upper & Lower Carnassial Premolars
        ivory_p.add_tube(
            [(sgn * 0.052, -0.042, -0.268), (sgn * 0.050, -0.062, -0.268)],
            0.0080,
            0.0024,
            u_segs=5,
            samples_per_seg=1,
        )
        ivory_p.add_tube(
            [(sgn * 0.045, -0.102, -0.268), (sgn * 0.044, -0.084, -0.268)],
            0.0074,
            0.0024,
            u_segs=5,
            samples_per_seg=1,
        )

    for ix in (-0.022, -0.008, 0.008, 0.022):
        ivory_p.add_tube(
            [(ix, -0.038, -0.356), (ix, -0.054, -0.358)],
            0.0046,
            0.0018,
            u_segs=5,
            samples_per_seg=1,
        )
        ivory_p.add_tube(
            [(ix * 0.86, -0.106, -0.340), (ix * 0.86, -0.091, -0.342)],
            0.0042,
            0.0018,
            u_segs=5,
            samples_per_seg=1,
        )

    # 6. Heavy Supraorbital Brow Ridge, Glossy Dark Eyes w/ Catchlight, Rounded Ears & Shaggy Cheek Ruffs
    for sgn in (-1, 1):
        # Heavy grizzly supraorbital brow ridge (strictly above eye y >= +0.074 so eye is 100% unobstructed)
        grizzle_p.add_tube(
            [
                (sgn * 0.036, 0.076, -0.180),
                (sgn * 0.082, 0.088, -0.168),
                (sgn * 0.126, 0.070, -0.136),
            ],
            0.016,
            0.012,
            u_segs=6,
            samples_per_seg=2,
            scale_xy=(1.25, 0.85),
        )

        # Dark leathery eyelid socket rim (`BearWetBlackNose`) behind cornea
        eye_rot = (0.04, sgn * -0.20, 0.0)
        nose_p.add_ellipsoid(
            center=(sgn * 0.084, 0.044, -0.165),
            radii=(0.025, 0.022, 0.015),
            u_segs=9,
            v_segs=6,
            rot_euler=eye_rot,
        )
        # Deep glossy dark bear eye (`BearGlossyEye`)
        eye_p.add_ellipsoid(
            center=(sgn * 0.086, 0.044, -0.175),
            radii=(0.0205, 0.0190, 0.0195),
            u_segs=10,
            v_segs=6,
            rot_euler=eye_rot,
        )
        # Crisp corneal catchlight (`BearEyeCatchlight`) on upper-lateral-front cornea
        glint_p.add_ellipsoid(
            center=(sgn * 0.090, 0.050, -0.193),
            radii=(0.0055, 0.0050, 0.0040),
            u_segs=6,
            v_segs=4,
            rot_euler=eye_rot,
        )

        # Shaggy wide grizzly cheek & jowl fur ruffs
        _add_fur_tuft_lock(
            grizzle_p,
            (sgn * 0.148,  0.018, -0.055),
            (sgn * 0.198, -0.004,  0.005),
            (sgn * 0.214, -0.022,  0.072),
            r_base=0.046,
            width_scale=1.30,
            u_segs=6,
        )
        _add_fur_tuft_lock(
            brown_p,
            (sgn * 0.142, -0.045, -0.075),
            (sgn * 0.192, -0.072, -0.015),
            (sgn * 0.205, -0.092,  0.055),
            r_base=0.044,
            width_scale=1.28,
            u_segs=6,
        )
        _add_fur_tuft_lock(
            brown_p,
            (sgn * 0.118, -0.095, -0.095),
            (sgn * 0.158, -0.122, -0.035),
            (sgn * 0.168, -0.138,  0.032),
            r_base=0.038,
            width_scale=1.22,
            u_segs=6,
        )

        # Wide-set Rounded Furry Cupped Grizzly Ear
        _add_rounded_bear_ear(gp, mat_brown, mat_grizzle, mat_tan, sgn)


def _add_plantigrade_paw_and_5_claws(gp, mat_brown, mat_nose, mat_ivory, sgn, is_hind, sole_y):
    """
    Sculpts a heavy, broad plantigrade grizzly paw resting cleanly at `y = sole_y` (world `y = 0.0000`)
    with ZERO vertex clamping (preventing any degenerate zero-area triangles):
      - Flat-bottomed dark leathery plantar/palmar sole cushion (`y_min == sole_y`).
      - Broad furred metacarpal/metatarsal upper paw bridge.
      - **5 distinct furred toes** + 5 digital toe pads + **5 long curved ivory grizzly claws** (`"IvoryClaws"`),
        longer on forepaws (~8.6cm iconic digging claws) and stout on hindpaws (~6.2cm).
    """
    brown_p = gp(mat_brown)
    nose_p = gp(mat_nose)
    ivory_p = gp(mat_ivory)

    z_heel = 0.088 if is_hind else 0.056
    z_arch = -0.068 if is_hind else -0.074
    paw_half_w = 0.092 if is_hind else 0.102

    # 1. Grounded Leathery Sole Pad (`y_min == sole_y` exactly!)
    sole_heights = [0.000, 0.012, 0.026]
    sole_u = 12
    sole_rings = []
    for hi, dy in enumerate(sole_heights):
        hf = hi / (len(sole_heights) - 1)
        shrink = 1.0 - 0.10 * hf
        zf = z_arch * shrink
        zb = z_heel * shrink
        z_mid = 0.5 * (zf + zb)
        rz = 0.5 * (zb - zf)
        rx = (paw_half_w * 0.88) * shrink
        ring = []
        for u in range(sole_u):
            th = (u / sole_u) * math.pi * 2.0
            ca, sa = math.cos(th), math.sin(th)
            # Slightly narrower heel (+Z, sa > 0), broader across ball of foot (-Z, sa < 0)
            heel_taper = 1.0 - 0.24 * max(0.0, sa)
            ring.append((ca * rx * heel_taper, sole_y + dy, z_mid + sa * rz))
        sole_rings.append(ring)

    nose_p.add_smooth_grid(sole_rings, closed_u=True, ensure_outward=True)
    nose_p.add_cap_ring(sole_rings[0], (0.0, -1.0, 0.0))
    nose_p.add_cap_ring(sole_rings[-1], (0.0, 1.0, 0.0))

    # 2. Broad Furred Plantigrade Upper Paw Cushion
    paw_spine = [
        (0.0, sole_y + 0.072, z_heel - 0.008),
        (0.0, sole_y + 0.058, 0.5 * (z_heel + z_arch)),
        (0.0, sole_y + 0.044, z_arch - 0.012),
    ]

    def paw_upper_sec(t, theta):
        rx = paw_half_w * (0.84 + 0.18 * math.sin(t * math.pi * 0.82))
        ry = 0.038 * (1.0 - 0.18 * t)
        st = math.sin(theta)
        y_off = st * ry if st >= 0.0 else st * ry * 0.55
        return (math.cos(theta) * rx, y_off)

    brown_p.add_loft(paw_spine, paw_upper_sec, u_segs=10, cap_start=True, cap_end=True, up_hint=(0.0, 1.0, 0.0))

    # 3. 5 Distinct Digital Toes + 5 Digital Pads + 5 Long Curved Ivory Grizzly Claws!
    claw_len = 0.062 if is_hind else 0.086
    claw_r_base = 0.0092 if is_hind else 0.0108

    # Normalized lateral positions across the 5-toed ursine paw arc (-2, -1, 0, +1, +2)
    toe_indices = (-2, -1, 0, 1, 2)
    for ti in toe_indices:
        lat_f = ti / 2.0
        arc_cos = math.cos(lat_f * 0.58)
        tx_start = lat_f * (paw_half_w * 0.74)
        tx_end = lat_f * (paw_half_w * 0.88)
        tz_start = z_arch + 0.008
        tz_end = z_arch - (0.046 * arc_cos + 0.012)
        toe_r = (0.0225 if abs(ti) <= 1 else 0.0195) * (0.94 if is_hind else 1.0)

        # Furred digital toe
        toe_spine = [
            (tx_start, sole_y + 0.038, tz_start),
            (0.5 * (tx_start + tx_end), sole_y + 0.035, 0.5 * (tz_start + tz_end)),
            (tx_end, sole_y + 0.025, tz_end),
        ]

        def make_toe_sec(r_val):
            def _sec(t, theta):
                rx = r_val * (1.0 - 0.16 * t)
                ry = r_val * 0.85 * (1.0 - 0.15 * t)
                st = math.sin(theta)
                return (math.cos(theta) * rx, st * (ry if st >= 0.0 else ry * 0.68))
            return _sec

        brown_p.add_loft(toe_spine, make_toe_sec(toe_r), u_segs=5, cap_start=False, cap_end=True, up_hint=(0.0, 1.0, 0.0))

        # Leathery digital toe pad just above sole_y (+3mm so zero coplanar overlap)
        nose_p.add_ellipsoid(
            center=(tx_end, sole_y + 0.012, tz_end + 0.004),
            radii=(toe_r * 0.78, 0.0085, toe_r * 0.92),
            u_segs=5,
            v_segs=3,
        )

        # Long Curved Ivory Grizzly Digging Claw (`"IvoryClaws"`)
        # Arches out from upper nail bed and curves gracefully downward to sole_y + 0.005m!
        splay_x = lat_f * 0.012
        claw_ctrl = [
            (tx_end, sole_y + 0.032, tz_end + 0.006),
            (tx_end + splay_x * 0.45, sole_y + 0.034, tz_end - claw_len * 0.36),
            (tx_end + splay_x * 0.82, sole_y + 0.021, tz_end - claw_len * 0.74),
            (tx_end + splay_x * 1.05, sole_y + 0.005, tz_end - claw_len),
        ]
        claw_spine = catmull_rom_chain(claw_ctrl, samples_per_seg=1)

        def make_claw_sec(rb):
            def _csec(t, theta):
                # Laterally compressed, dorsally arched grizzly claw cross-section
                r = max(0.0018, rb * ((1.0 - t) ** 0.88))
                ct, st = math.cos(theta), math.sin(theta)
                return (ct * r * 0.66, st * r * (1.28 if st >= 0.0 else 0.85))
            return _csec

        ivory_p.add_loft(claw_spine, make_claw_sec(claw_r_base), u_segs=5, cap_start=False, cap_end=True, up_hint=(0.0, 1.0, 0.0))


def _build_muscular_grizzly_leg(gp, mat_brown, mat_grizzle, mat_nose, mat_ivory, sgn, is_hind, pivot_y):
    """
    Sculpts a massive, thick muscular Western Grizzly foreleg or hindleg from shoulder/haunch
    down to the plantigrade wrist/heel and 5-clawed paw at `y = -pivot_y` (world `y = 0.0`).
    """
    sole_y = -pivot_y

    if not is_hind:
        # Foreleg (`leg0` FL, `leg2` FR): massive scapula/triceps -> thick forearm -> heavy carpus
        ctrl = [
            (-sgn * 0.035,  0.195,  0.010, 0.138, 0.182),  # upper shoulder tucked into barrel chest
            (-sgn * 0.010,  0.035,  0.018, 0.146, 0.188),  # thick deltoid / triceps mass
            (0.0,          -0.165,  0.028, 0.122, 0.152),  # heavy elbow
            (0.0,          -0.365,  0.012, 0.102, 0.122),  # thick muscular forearm
            (0.0,          -0.545, -0.005, 0.088, 0.102),  # broad carpal wrist
            (0.0,          -0.695, -0.012, 0.084, 0.095),  # ankle into plantigrade paw
        ]
    else:
        # Hindleg (`leg1` BL, `leg3` BR): enormous bear thigh/hamstring -> crus -> low plantigrade heel
        ctrl = [
            (-sgn * 0.038,  0.215, -0.010, 0.148, 0.212),  # upper hip tucked into hindquarters
            (-sgn * 0.012,  0.035, -0.015, 0.156, 0.218),  # massive thigh / quadriceps & hamstring
            (0.0,          -0.185, -0.005, 0.132, 0.175),  # muscular stifle (knee)
            (0.0,          -0.385,  0.032, 0.108, 0.142),  # thick calf / gaskin
            (0.0,          -0.565,  0.052, 0.088, 0.118),  # low ursine tarsus / calcaneus heel
            (0.0,          -0.715,  0.016, 0.082, 0.104),  # plantigrade ankle joint
        ]

    pos_chain = catmull_rom_chain([(c[0], c[1], c[2]) for c in ctrl], samples_per_seg=2)
    rad_chain = catmull_rom_chain([(c[3], c[4], 0.0) for c in ctrl], samples_per_seg=2)

    v_cnt = len(pos_chain)
    u_segs = 12
    rings = []
    for v in range(v_cnt):
        cx, cy, cz = pos_chain[v]
        rx, rz, _ = rad_chain[v]
        rx = max(0.050, rx)
        rz = max(0.060, rz)
        ring = []
        for u in range(u_segs):
            th = (u / u_segs) * math.pi * 2.0
            lat_x = -sgn * math.cos(th) * rx
            fb_z = math.sin(th) * rz
            ring.append((cx + lat_x, cy, cz + fb_z))
        rings.append(ring)

    top_c = pos_chain[0]
    bot_c = pos_chain[-1]

    def leg_quad_mat(v, u):
        # Grizzled silver-frosted outer shoulder / upper thigh dusting
        if v <= 4 and (u <= 2 or u >= u_segs - 2):
            return mat_grizzle
        return mat_brown

    _emit_unified_smooth_grid(
        gp,
        rings,
        leg_quad_mat,
        closed_u=True,
        uv_u_scale=1.5,
        uv_v_scale=2.0,
        cap_start_mat=mat_brown,
        cap_start_apex=(top_c[0], top_c[1] + 0.028, top_c[2]),
        cap_start_normal=(0.0, 1.0, 0.0),
        cap_end_mat=mat_brown,
        cap_end_apex=(bot_c[0], bot_c[1] - 0.016, bot_c[2]),
        cap_end_normal=(0.0, -1.0, 0.0),
    )

    # Shaggy posterior leg fur tufts (elbow & hamstring fringe)
    brown_p = gp(mat_brown)
    if not is_hind:
        _add_fur_tuft_lock(
            brown_p,
            (sgn * 0.02, -0.14, 0.12),
            (sgn * 0.03, -0.22, 0.17),
            (sgn * 0.02, -0.30, 0.19),
            r_base=0.042,
            width_scale=1.15,
            u_segs=6,
        )
    else:
        _add_fur_tuft_lock(
            brown_p,
            (sgn * 0.02, -0.12, 0.14),
            (sgn * 0.03, -0.21, 0.20),
            (sgn * 0.02, -0.30, 0.22),
            r_base=0.046,
            width_scale=1.20,
            u_segs=6,
        )

    _add_plantigrade_paw_and_5_claws(gp, mat_brown, mat_nose, mat_ivory, sgn=sgn, is_hind=is_hind, sole_y=sole_y)


# ---------------------------------------------------------------------------
# Embedded glTF Quaternion Keyframe Animations (Idle, Walk, Run, Attack)
# ---------------------------------------------------------------------------

def _add_bear_animations(b, head_node, tail_node, leg_nodes):
    """
    Embeds loopable & combat-ready Western Grizzly quaternion animations:
      - `"Idle"`   (2.00s): Heavy territorial head scan & sniff + subtle ear/snout roll + stubby tail twitch.
      - `"Walk"`   (1.00s): Heavy lumbering ursine diagonal gait (`leg0` & `leg3` opposite `leg1` & `leg2`) + prowling head sway.
      - `"Run"`    (0.60s): Charging grizzly rotary gallop + lowered charging head surge.
      - `"Attack"` (0.45s): Ferocious rearing/swiping head roar & foreleg maul/bite lunge!
    """
    q0 = quat_from_euler_xyz(0.0, 0.0, 0.0)

    # 1. "Idle" (2.0s)
    idle_tracks = [
        {
            "node": head_node,
            "path": "rotation",
            "times": [0.0, 0.55, 1.15, 1.65, 2.0],
            "values": [
                q0,
                quat_from_euler_xyz(0.055,  0.115, -0.040),
                quat_from_euler_xyz(-0.035, -0.105,  0.035),
                quat_from_euler_xyz(0.045,  0.025, -0.015),
                q0,
            ],
        },
        {
            "node": tail_node,
            "path": "rotation",
            "times": [0.0, 0.65, 1.00, 1.45, 2.0],
            "values": [
                q0,
                quat_from_euler_xyz(0.06,  0.10, 0.0),
                quat_from_euler_xyz(-0.05, -0.08, 0.0),
                quat_from_euler_xyz(0.04,  0.05, 0.0),
                q0,
            ],
        },
    ]
    for ln in leg_nodes:
        idle_tracks.append({"node": ln, "path": "rotation", "times": [0.0, 2.0], "values": [q0, q0]})
    b.add_animation("Idle", idle_tracks)

    # 2. "Walk" (1.0s) — Heavy lumbering grizzly stride (`leg0` FL & `leg3` BR opposite `leg1` BL & `leg2` FR)
    walk_steps = 8
    walk_times = [round(k / walk_steps, 4) for k in range(walk_steps + 1)]
    walk_amp = 0.30
    walk_tracks = [
        {
            "node": head_node,
            "path": "rotation",
            "times": walk_times,
            "values": [
                quat_from_euler_xyz(
                    -0.06 + 0.045 * math.cos(t * math.pi * 4.0),
                    0.045 * math.sin(t * math.pi * 2.0),
                    -0.035 * math.sin(t * math.pi * 2.0),
                )
                for t in walk_times
            ],
        },
        {
            "node": tail_node,
            "path": "rotation",
            "times": walk_times,
            "values": [
                quat_from_euler_xyz(
                    -0.06 + 0.04 * math.cos(t * math.pi * 4.0),
                    0.10 * math.sin(t * math.pi * 2.0),
                    0.0,
                )
                for t in walk_times
            ],
        },
    ]
    for i, ln in enumerate(leg_nodes):
        ph = 1.0 if (i == 0 or i == 3) else -1.0
        walk_tracks.append({
            "node": ln,
            "path": "rotation",
            "times": walk_times,
            "values": [
                quat_from_euler_xyz(walk_amp * ph * math.sin(t * math.pi * 2.0), 0.0, 0.0)
                for t in walk_times
            ],
        })
    b.add_animation("Walk", walk_tracks)

    # 3. "Run" (0.6s) — Charging grizzly bounding gallop (`0.0 .. 0.6`)
    run_dur = 0.6
    run_steps = 8
    run_times = [round((k / run_steps) * run_dur, 4) for k in range(run_steps + 1)]
    run_phases = [0.0, math.pi + 0.25, 0.32, math.pi]
    run_amp = 0.50

    run_tracks = [
        {
            "node": head_node,
            "path": "rotation",
            "times": run_times,
            "values": [
                quat_from_euler_xyz(
                    -0.04 + 0.11 * math.cos((t / run_dur) * math.pi * 2.0),
                    0.0,
                    0.03 * math.sin((t / run_dur) * math.pi * 2.0),
                )
                for t in run_times
            ],
        },
        {
            "node": tail_node,
            "path": "rotation",
            "times": run_times,
            "values": [
                quat_from_euler_xyz(-0.18 + 0.08 * math.sin((t / run_dur) * math.pi * 2.0), 0.0, 0.0)
                for t in run_times
            ],
        },
    ]
    for i, ln in enumerate(leg_nodes):
        g_ph = run_phases[i]
        run_tracks.append({
            "node": ln,
            "path": "rotation",
            "times": run_times,
            "values": [
                quat_from_euler_xyz(run_amp * math.sin((t / run_dur) * math.pi * 2.0 + g_ph), 0.0, 0.0)
                for t in run_times
            ],
        })
    b.add_animation("Run", run_tracks)

    # 4. "Attack" (0.45s) — Rearing/swiping head & foreleg maul/bite!
    #   0.00s -> 0.14s: Rears head up/back & raises forelegs high (`leg2` right paw cocked wide for heavy swipe)
    #   0.14s -> 0.28s: Savage downward/cross claw swipe + snapping head bite lunge forward (`-X` pitch)
    #   0.28s -> 0.45s: Settles back cleanly to grounded neutral stance
    attack_tracks = [
        {
            "node": head_node,
            "path": "rotation",
            "times": [0.0, 0.14, 0.28, 0.45],
            "values": [
                q0,
                quat_from_euler_xyz(0.32,  0.14, -0.12),
                quat_from_euler_xyz(-0.46, -0.10,  0.10),
                q0,
            ],
        },
        {
            "node": tail_node,
            "path": "rotation",
            "times": [0.0, 0.20, 0.45],
            "values": [
                q0,
                quat_from_euler_xyz(-0.24, 0.0, 0.0),
                q0,
            ],
        },
        {
            # leg0 (front-left): rears forward/up then slams down in bracing maul
            "node": leg_nodes[0],
            "path": "rotation",
            "times": [0.0, 0.14, 0.28, 0.45],
            "values": [
                q0,
                quat_from_euler_xyz(0.56, 0.0, -0.10),
                quat_from_euler_xyz(-0.22, 0.0, 0.05),
                q0,
            ],
        },
        {
            # leg2 (front-right): high wide grizzly claw swipe arcing inward & down
            "node": leg_nodes[2],
            "path": "rotation",
            "times": [0.0, 0.14, 0.28, 0.45],
            "values": [
                q0,
                quat_from_euler_xyz(0.78, -0.14, 0.26),
                quat_from_euler_xyz(-0.28,  0.16, -0.18),
                q0,
            ],
        },
        {
            # leg1 (back-left): powerful hind-leg brace during rear & lunge
            "node": leg_nodes[1],
            "path": "rotation",
            "times": [0.0, 0.16, 0.30, 0.45],
            "values": [
                q0,
                quat_from_euler_xyz(-0.28, 0.0, 0.0),
                quat_from_euler_xyz(0.12, 0.0, 0.0),
                q0,
            ],
        },
        {
            # leg3 (back-right): powerful hind-leg brace during rear & lunge
            "node": leg_nodes[3],
            "path": "rotation",
            "times": [0.0, 0.16, 0.30, 0.45],
            "values": [
                q0,
                quat_from_euler_xyz(-0.28, 0.0, 0.0),
                quat_from_euler_xyz(0.12, 0.0, 0.0),
                q0,
            ],
        },
    ]
    b.add_animation("Attack", attack_tracks)


# ---------------------------------------------------------------------------
# Public Builder Entry Point (`assets/bear.glb`)
# ---------------------------------------------------------------------------

def build_bear_glb(out_path):
    """Builds and exports the sculpted Western Grizzly Bear (`assets/bear.glb`)."""
    b = GLBBuilder()

    # Cohesive PBR Material Palette for Western Grizzly Bear
    mat_grizzle = b.add_material("BearGrizzleFur", (0.54, 0.45, 0.36), metallic=0.02, roughness=0.86)
    mat_brown = b.add_material("BearBrownFur", (0.24, 0.14, 0.08), metallic=0.02, roughness=0.88)
    mat_tan = b.add_material("BearTanMuzzle", (0.63, 0.45, 0.27), metallic=0.01, roughness=0.83)
    mat_under = b.add_material("BearDarkUnderfur", (0.14, 0.08, 0.05), metallic=0.02, roughness=0.90)
    mat_ivory = b.add_material("IvoryClaws", (0.91, 0.86, 0.74), metallic=0.04, roughness=0.28)
    mat_nose = b.add_material("BearWetBlackNose", (0.06, 0.055, 0.055), metallic=0.08, roughness=0.22)
    mat_mouth = b.add_material("BearMouthInterior", (0.30, 0.08, 0.09), metallic=0.02, roughness=0.48)
    mat_eye = b.add_material("BearGlossyEye", (0.045, 0.028, 0.018), metallic=0.06, roughness=0.06)
    mat_glint = b.add_material(
        "BearEyeCatchlight",
        (0.96, 0.96, 0.98),
        metallic=0.0,
        roughness=0.05,
        emissive=(0.35, 0.35, 0.38),
    )

    root = b.add_node("BearRoot")

    # 1. Seamless Barrel Torso + Prominent Grizzly Shoulder Hump (~1.38m) + Shaggy Neck Ruff
    body_parts, body_gp = b.create_parts_dict()
    _build_seamless_grizzly_body(body_gp, mat_brown, mat_grizzle, mat_under)
    body_mesh = b.add_mesh_from_parts("BearBodyMesh", body_parts.values())
    b.add_node("BearBody", mesh_idx=body_mesh, parent_idx=root)

    # 2. Stubby Furry Tail ("tail" at (0.0, 1.03, 0.90) -> z_max = +1.020m)
    tail_parts, tail_gp = b.create_parts_dict()
    _build_stubby_tail_mesh(tail_gp, mat_brown, mat_grizzle)
    tail_mesh = b.add_mesh_from_parts("BearTailMesh", tail_parts.values())
    tail_node = b.add_node("tail", translation=(0.0, 1.03, 0.90), mesh_idx=tail_mesh, parent_idx=root)

    # 3. Articulated Ursine Head ("head" at (0.0, 1.10, -0.84) -> z_min = -1.250m, head top = 1.320m)
    head_parts, head_gp = b.create_parts_dict()
    _build_grizzly_head(
        head_gp,
        mat_brown=mat_brown,
        mat_grizzle=mat_grizzle,
        mat_tan=mat_tan,
        mat_nose=mat_nose,
        mat_mouth=mat_mouth,
        mat_ivory=mat_ivory,
        mat_eye=mat_eye,
        mat_glint=mat_glint,
    )
    head_mesh = b.add_mesh_from_parts("BearHeadMesh", head_parts.values())
    head_node = b.add_node("head", translation=(0.0, 1.10, -0.84), mesh_idx=head_mesh, parent_idx=root)

    # 4. 4 Thick Muscular Limbs + Broad Plantigrade Paws + 5 Curved Ivory Claws per Paw:
    #    leg0: front-left  (x < 0, z < 0)
    #    leg1: back-left   (x < 0, z > 0)
    #    leg2: front-right (x > 0, z < 0)
    #    leg3: back-right  (x > 0, z > 0)
    leg_specs = [
        ("leg0", -1, False, (-0.245, 0.760, -0.430)),
        ("leg1", -1, True,  (-0.240, 0.780,  0.540)),
        ("leg2",  1, False, ( 0.245, 0.760, -0.430)),
        ("leg3",  1, True,  ( 0.240, 0.780,  0.540)),
    ]
    leg_nodes = []
    for leg_name, sgn, is_hind, pivot_pos in leg_specs:
        lp_dict, lgp = b.create_parts_dict()
        _build_muscular_grizzly_leg(
            lgp,
            mat_brown=mat_brown,
            mat_grizzle=mat_grizzle,
            mat_nose=mat_nose,
            mat_ivory=mat_ivory,
            sgn=sgn,
            is_hind=is_hind,
            pivot_y=pivot_pos[1],
        )
        l_mesh = b.add_mesh_from_parts(f"{leg_name}_Mesh", lp_dict.values())
        l_node = b.add_node(leg_name, translation=pivot_pos, mesh_idx=l_mesh, parent_idx=root)
        leg_nodes.append(l_node)

    # 5. Embedded glTF Quaternion Keyframe Animations
    _add_bear_animations(b, head_node=head_node, tail_node=tail_node, leg_nodes=leg_nodes)

    return b.export_glb(out_path)


# ---------------------------------------------------------------------------
# Strict Binary & Geometric Verification Suite
# ---------------------------------------------------------------------------

def _verify_bear_glb(glb_path):
    """Validates GLB structure, exact quadruped contract, proportions, 0 degenerate faces & animations."""
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
    mat_names = [m["name"] for m in gltf["materials"]]

    world_min = [float("inf"), float("inf"), float("inf")]
    world_max = [float("-inf"), float("-inf"), float("-inf")]
    hump_y_max = float("-inf")
    head_y_max = float("-inf")
    degenerate_faces = 0
    degenerate_normals = 0
    total_tris = 0
    world_tris = []

    def walk_node(n_idx, parent_t=(0.0, 0.0, 0.0), parent_q=(0.0, 0.0, 0.0, 1.0)):
        nonlocal hump_y_max, head_y_max, degenerate_faces, degenerate_normals, total_tris
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

        n_name = node.get("name", "")
        if "mesh" in node:
            for prim in meshes[node["mesh"]]["primitives"]:
                m_name = gltf["materials"][prim["material"]]["name"]
                pos_acc = accessors[prim["attributes"]["POSITION"]]
                pos_bv = buffer_views[pos_acc["bufferView"]]
                p_off = pos_bv["byteOffset"]
                w_verts = []
                for vi in range(pos_acc["count"]):
                    lp = struct.unpack_from("<fff", bin_buf, p_off + vi * 12)
                    wp = v_add(wt, quat_rotate_vec(wq, lp))
                    w_verts.append(wp)
                    for k in range(3):
                        world_min[k] = min(world_min[k], wp[k])
                        world_max[k] = max(world_max[k], wp[k])
                    if n_name == "BearBody" and -0.52 <= wp[2] <= -0.24:
                        hump_y_max = max(hump_y_max, wp[1])
                    if n_name == "head":
                        head_y_max = max(head_y_max, wp[1])

                idx_acc = accessors[prim["indices"]]
                idx_bv = buffer_views[idx_acc["bufferView"]]
                i_off = idx_bv["byteOffset"]
                fmt = "<H" if idx_acc["componentType"] == 5123 else "<I"
                step = 2 if idx_acc["componentType"] == 5123 else 4
                for ti in range(0, idx_acc["count"], 3):
                    i0 = struct.unpack_from(fmt, bin_buf, i_off + ti * step)[0]
                    i1 = struct.unpack_from(fmt, bin_buf, i_off + (ti + 1) * step)[0]
                    i2 = struct.unpack_from(fmt, bin_buf, i_off + (ti + 2) * step)[0]
                    p0, p1, p2 = w_verts[i0], w_verts[i1], w_verts[i2]
                    area2 = v_len(v_cross(v_sub(p1, p0), v_sub(p2, p0)))
                    if area2 <= 1e-10 or math.isnan(area2):
                        degenerate_faces += 1
                    total_tris += 1
                    world_tris.append((p0, p1, p2, m_name))

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

    for r_idx in gltf["scenes"][0]["nodes"]:
        walk_node(r_idx)

    # Verify unobstructed glossy eyes / catchlights from front (-Z)
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

    eye_hits = {-1: 0, 1: 0}
    for sgn in (-1, 1):
        for dx in (-0.010, -0.004, 0.002, 0.008):
            for dy in (-0.008, -0.002, 0.004, 0.010):
                tx = sgn * 0.086 + dx
                ty = 1.10 + 0.044 + dy
                hit = first_hit_mat((tx, ty, -2.5), (0.0, 0.0, 1.0))
                if hit in ("BearGlossyEye", "BearEyeCatchlight"):
                    eye_hits[sgn] += 1

    node_names = [n["name"] for n in nodes]
    anim_info = {}
    for anim in gltf.get("animations", []):
        max_t = max(accessors[s["input"]]["max"][0] for s in anim["samplers"])
        anim_info[anim["name"]] = round(max_t, 4)

    required_nodes = {"head", "leg0", "leg1", "leg2", "leg3"}
    required_mats = {"BearGrizzleFur", "BearBrownFur", "BearTanMuzzle", "IvoryClaws"}
    assert required_nodes.issubset(set(node_names)), f"Missing required nodes: {required_nodes - set(node_names)}"
    assert required_mats.issubset(set(mat_names)), f"Missing required materials: {required_mats - set(mat_names)}"
    assert list(anim_info.keys()) == ["Idle", "Walk", "Run", "Attack"], f"Unexpected animations: {anim_info}"
    assert abs(anim_info["Idle"] - 2.0) < 1e-3, f"Idle duration mismatch: {anim_info['Idle']}"
    assert abs(anim_info["Walk"] - 1.0) < 1e-3, f"Walk duration mismatch: {anim_info['Walk']}"
    assert abs(anim_info["Run"] - 0.6) < 1e-3, f"Run duration mismatch: {anim_info['Run']}"
    assert abs(anim_info["Attack"] - 0.45) < 1e-3, f"Attack duration mismatch: {anim_info['Attack']}"
    assert abs(world_min[1]) <= 1e-4, f"Paws not grounded at y=0.0: y_min={world_min[1]}"
    assert 6500 <= total_tris <= 9500, f"Triangle count {total_tris} outside target 6,500..9,500!"
    assert degenerate_faces == 0, f"Found {degenerate_faces} degenerate faces!"
    assert degenerate_normals == 0, f"Found {degenerate_normals} degenerate normals!"
    assert eye_hits[-1] >= 8 and eye_hits[1] >= 8, f"Eyes occluded from -Z! Hits: {eye_hits}"

    return {
        "world_min": [round(v, 4) for v in world_min],
        "world_max": [round(v, 4) for v in world_max],
        "dimensions": [round(world_max[k] - world_min[k], 4) for k in range(3)],
        "hump_height": round(hump_y_max, 4),
        "head_height": round(head_y_max, 4),
        "eye_hits": eye_hits,
        "node_names": node_names,
        "materials": mat_names,
        "animations": anim_info,
        "degenerate_faces": degenerate_faces,
        "degenerate_normals": degenerate_normals,
    }


if __name__ == "__main__":
    project_root = os.path.dirname(_SCRIPT_DIR)
    default_out = os.path.join(project_root, "assets", "bear.glb")
    out_file = sys.argv[1] if len(sys.argv) > 1 else default_out
    stats = build_bear_glb(out_file)
    check = _verify_bear_glb(out_file)
    print(f"[bear.glb] Built {stats['filepath']} ({stats['bytes']:,} bytes)")
    print(f"  Triangles : {stats['triangles']:,}  |  Vertices: {stats['vertices']:,}  |  Nodes: {stats['nodes']}")
    print(f"  World BBox: min={check['world_min']}  max={check['world_max']}  size={check['dimensions']}")
    print(f"  Heights   : Shoulder Hump={check['hump_height']}m  |  Head={check['head_height']}m")
    print(f"  Animations: {check['animations']}  |  Eye Hits={check['eye_hits']}")
    print(f"  Integrity : Degenerate faces={check['degenerate_faces']}  |  Degenerate normals={check['degenerate_normals']}")
