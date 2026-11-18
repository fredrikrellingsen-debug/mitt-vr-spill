#!/usr/bin/env python3
"""
Procedural organic glTF 2.0 (.glb) sculptor for the Forest Buck / Deer (`assets/deer.glb`).

Features:
  - Zero sphere-cylinder primitive seams: continuous dual-rail smooth-shaded anatomical torso +
    withers (~1.02m) + deep noble brisket + tucked inguinal flank + graceful S-curved muscular neck,
    with contour-warped pelage zones (warm buckskin coat, toasted chestnut dorsal saddle, soft cream
    rump mirror, underbelly, and brisket/throat blaze) sharing unified C1 smooth normals.
  - Articulated `"tail"` node at (0, 0.97, 0.58): uplifted leaf-shaped white-tailed deer flag
    (chestnut/buckskin upper, bright cream underside).
  - Articulated `"head"` node at (0, 1.44, -0.71): smooth-lofted cervid skull with sculpted orbital
    brow arches, slender tapered muzzle & mandible, moist dark rhinarium with flared nostrils,
    gentle side-set glossy dark eyes with upper lash rims, concave cupped leaf-shaped ears, furred
    pedicels, pearled coronet burrs, and symmetrical 10-point (5 per side) royal antlers (~1.92m peak)
    welded directly onto the exact main-beam spline centerline.
  - 4 articulated anatomical legs (`"leg0"` FL, `"leg1"` BL, `"leg2"` FR, `"leg3"` BR) differentiating
    foreleg carpus vs. angled hindleg hock, slender cannon bones, fetlocks, rear dewclaws, and
    split cloven dark hooves resting cleanly at y = 0.0.
  - Embedded glTF quaternion animations: `"Idle"` (2.0s), `"Walk"` (1.0s), `"Run"` (0.55s), `"Attack"` (0.35s).
"""

import math
import os
import sys

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPT_DIR not in sys.path:
    sys.path.insert(0, _SCRIPT_DIR)

from glb_core import (  # noqa: E402
    GLBBuilder,
    catmull_rom_chain,
    quat_from_euler_xyz,
    rotate_vec_between,
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
# Custom Seamless Organic Sculpting Helpers
# ---------------------------------------------------------------------------

def _eval_piecewise_theta(u_idx, u_total, u_cream, theta_cream, u_dorsal_half, theta_dorsal_half):
    """
    Piecewise-smooth angular mapping around a symmetric bilateral cross-section (u = 0..u_total-1).
      - u = 0             : ventral midline (theta = 0, bottom)
      - u = u_cream       : right ventral cream-to-buckskin boundary (theta = theta_cream)
      - u = u_total//2    : dorsal midline (theta = pi, top spine)
      - u = u_total - u_cream : left ventral cream-to-buckskin boundary
    Aligning the angular warp to exact quad column indices eliminates stair-stepping while
    keeping the mesh 100% watertight with unified smooth normals.
    """
    half = u_total // 2
    mirror = u_idx > half
    u_sym = (u_total - u_idx) if mirror else u_idx

    u_dors_start = half - u_dorsal_half
    theta_dors_start = math.pi - theta_dorsal_half

    if u_sym <= u_cream:
        f = u_sym / max(1, u_cream)
        th = f * theta_cream
    elif u_sym <= u_dors_start:
        f = (u_sym - u_cream) / max(1, u_dors_start - u_cream)
        th = theta_cream + f * (theta_dors_start - theta_cream)
    else:
        f = (u_sym - u_dors_start) / max(1, half - u_dors_start)
        th = theta_dors_start + f * (math.pi - theta_dors_start)

    return (2.0 * math.pi - th) if mirror else th


def emit_unified_smooth_grid(
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
    ENTIRE unified surface before splitting quads by material. Shared boundary vertices between
    materials have identical positions AND identical normals (zero shading seam, zero overdraw).
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


def add_antler_branch(part, spine, r_base, r_tip, u_segs=7, flutes=5, flute_amp=0.045, gusset_flare=0.28):
    """
    Sculpts a smooth organic curved antler beam/tine from pre-sampled `spine` points with subtle
    longitudinal bone fluting near the base and a flared gusset collar that welds organically
    into the parent beam centerline, tapering to a polished rounded ivory tip.
    """
    m = len(spine)
    if m < 2:
        return spine

    tangents = []
    for i in range(m):
        if i == 0:
            d = v_sub(spine[1], spine[0])
        elif i == m - 1:
            d = v_sub(spine[-1], spine[-2])
        else:
            d = v_sub(spine[i + 1], spine[i - 1])
        tangents.append(v_norm(d, (0.0, 1.0, 0.0)))

    t0 = tangents[0]
    up = (0.0, 0.0, -1.0) if abs(v_dot(t0, (0.0, 1.0, 0.0))) > 0.92 else (0.0, 1.0, 0.0)
    r_ax = v_norm(v_cross(up, t0))
    u_ax = v_norm(v_cross(t0, r_ax))
    frames = [(r_ax, u_ax)]
    for i in range(1, m):
        pr, pu = frames[-1]
        ri = rotate_vec_between(tangents[i - 1], tangents[i], pr)
        ri = v_norm(v_sub(ri, v_mul(tangents[i], v_dot(ri, tangents[i]))), pr)
        ui = v_norm(v_cross(tangents[i], ri))
        frames.append((ri, ui))

    rings = []
    for i, c in enumerate(spine):
        t = i / (m - 1)
        flare = 1.0 + gusset_flare * ((1.0 - min(1.0, t / 0.18)) ** 2)
        r_interp = r_base * ((1.0 - t) ** 0.80) + r_tip * (t ** 0.80)
        if t > 0.85:
            tip_f = (t - 0.85) / 0.15
            r_cur = max(0.0018, r_interp * math.cos(tip_f * math.pi * 0.44))
        else:
            r_cur = r_interp * flare

        flute_strength = flute_amp * max(0.0, 1.0 - t * 1.25)
        ri, ui = frames[i]
        ring = []
        for u in range(u_segs):
            th = (u / u_segs) * math.pi * 2.0
            rr = r_cur * (1.0 + flute_strength * math.cos(th * flutes))
            pt = v_add(c, v_add(v_mul(ri, math.cos(th) * rr), v_mul(ui, math.sin(th) * rr)))
            ring.append(pt)
        rings.append(ring)

    part.add_smooth_grid(rings, closed_u=True, uv_u_scale=1.0, uv_v_scale=2.0, ensure_outward=True)
    part.add_cap_ring(rings[0], v_mul(tangents[0], -1.0))
    part.add_cap_ring(rings[-1], tangents[-1])
    return spine


# ---------------------------------------------------------------------------
# Anatomical Sub-Assemblers for Forest Buck
# ---------------------------------------------------------------------------

def _build_seamless_body_and_neck(gp, mat_coat, mat_dorsal, mat_cream):
    """
    Constructs a continuous smooth-shaded dual-rail surface from rear rump (z=+0.61) through
    muscular haunches, sleek tucked flank, deep noble brisket/ribcage, ~1.02m shoulder withers,
    and graceful S-curved muscular neck into the skull atlas socket around (0, 1.44, -0.71).
    """
    stations_ctrl = [
        # (y_dorsal, z_dorsal, y_ventral, z_ventral, rx, cream_h, dorsal_h)
        (0.948,  0.612, 0.875,  0.610, 0.048, 0.68, 0.14),  # 0: rear rump dome ring
        (0.988,  0.568, 0.785,  0.568, 0.152, 0.62, 0.16),  # 1: rump mirror flare
        (1.012,  0.475, 0.728,  0.480, 0.218, 0.34, 0.18),  # 2: rear muscular haunch
        (1.016,  0.365, 0.712,  0.370, 0.236, 0.18, 0.19),  # 3: hip / upper thigh barrel
        (0.990,  0.200, 0.738,  0.205, 0.202, 0.21, 0.19),  # 4: sleek tucked inguinal flank!
        (0.984,  0.015, 0.692,  0.015, 0.224, 0.22, 0.20),  # 5: mid barrel / ribcage
        (1.005, -0.175, 0.652, -0.175, 0.232, 0.19, 0.21),  # 6: deep fore-ribcage
        (1.022, -0.335, 0.634, -0.345, 0.224, 0.15, 0.22),  # 7: shoulder withers (~1.02m) & deep brisket
        (1.014, -0.425, 0.688, -0.478, 0.188, 0.21, 0.22),  # 8: cervid neck-base dip & sweeping brisket
        (1.088, -0.502, 0.822, -0.598, 0.150, 0.22, 0.21),  # 9: muscular lower S-neck swell
        (1.202, -0.568, 0.992, -0.682, 0.124, 0.21, 0.20),  # 10: graceful S-neck inflection
        (1.322, -0.612, 1.168, -0.734, 0.106, 0.22, 0.20),  # 11: upper arched neck crest
        (1.425, -0.642, 1.312, -0.766, 0.094, 0.27, 0.21),  # 12: throat latch blaze
        (1.488, -0.665, 1.376, -0.766, 0.086, 0.28, 0.22),  # 13: seamless occipital/jaw collar
        (1.472, -0.702, 1.418, -0.732, 0.044, 0.26, 0.22),  # 14: inner ball condyle inside head socket
    ]

    dorsal_pts = catmull_rom_chain([(c[0], c[1], 0.0) for c in stations_ctrl], samples_per_seg=2)
    ventral_pts = catmull_rom_chain([(c[2], c[3], 0.0) for c in stations_ctrl], samples_per_seg=2)
    meta_pts = catmull_rom_chain([(c[4], c[5], c[6]) for c in stations_ctrl], samples_per_seg=2)

    v_count = len(dorsal_pts)
    u_segs = 22
    u_cream = 3          # 6 ventral quads around midline -> smooth cream pelage
    u_dorsal_half = 2    # 4 dorsal quads around spine -> rich chestnut saddle

    rings = []
    for v in range(v_count):
        s = v / (v_count - 1)
        yd, zd, _ = dorsal_pts[v]
        yv, zv, _ = ventral_pts[v]
        rx_base, cream_h, dorsal_h = meta_pts[v]
        rx_base = max(0.015, rx_base)
        cream_h = max(0.08, min(0.72, cream_h))
        dorsal_h = max(0.10, min(0.28, dorsal_h))

        theta_cream = math.acos(max(-0.98, min(0.98, 1.0 - 2.0 * cream_h)))
        theta_dorsal_half = math.acos(max(-0.98, min(0.98, 1.0 - 2.0 * dorsal_h)))

        c_mid = (0.0, 0.5 * (yd + yv), 0.5 * (zd + zv))
        up_half = (0.0, 0.5 * (yd - yv), 0.5 * (zd - zv))

        haunch_w = math.exp(-((s - 0.21) / 0.09) ** 2)
        shoulder_w = math.exp(-((s - 0.50) / 0.08) ** 2)
        neck_w = max(0.0, (s - 0.56) / 0.44)

        ring = []
        for u in range(u_segs):
            th = _eval_piecewise_theta(u, u_segs, u_cream, theta_cream, u_dorsal_half, theta_dorsal_half)
            u_vert = -math.cos(th)
            u_lat = math.sin(th)

            keel_taper = 1.0 - 0.22 * (max(0.0, -u_vert) ** 1.6) * (1.0 - 0.55 * neck_w)
            withers_taper = 1.0 - (0.22 * shoulder_w + 0.15 * neck_w) * (max(0.0, u_vert) ** 1.8)
            hip_muscle = 1.0 + 0.12 * haunch_w * math.exp(-((u_vert + 0.18) / 0.46) ** 2)
            scapula_muscle = 1.0 + 0.10 * shoulder_w * math.exp(-((u_vert - 0.12) / 0.44) ** 2)

            rx = rx_base * keel_taper * withers_taper * hip_muscle * scapula_muscle
            px = u_lat * rx
            py = c_mid[1] + u_vert * up_half[1]
            pz = c_mid[2] + u_vert * up_half[2]
            ring.append((px, py, pz))
        rings.append(ring)

    half = u_segs // 2

    def body_quad_mat(v, u):
        if u < u_cream or u >= (u_segs - u_cream):
            return mat_cream
        if (half - u_dorsal_half) <= u < (half + u_dorsal_half) and v >= 2:
            return mat_dorsal
        return mat_coat

    emit_unified_smooth_grid(
        gp,
        rings,
        body_quad_mat,
        closed_u=True,
        uv_u_scale=2.0,
        uv_v_scale=3.0,
        cap_start_mat=mat_cream,
        cap_start_apex=(0.0, 0.912, 0.622),
        cap_start_normal=(0.0, -0.08, 1.0),
        cap_end_mat=mat_coat,
        cap_end_apex=(0.0, 1.448, -0.718),
        cap_end_normal=(0.0, 0.62, -0.78),
    )


def _build_tail_mesh(gp, mat_coat, mat_dorsal, mat_cream):
    """
    Sculpts an uplifted leaf-shaped white-tailed deer flag in local space of `"tail"`
    (pivot at (0.0, 0.97, 0.58)): rich chestnut/buckskin upper side and fluffy white/cream flag underneath.
    """
    spine_ctrl = [
        (0.0, -0.012, -0.018),
        (0.0,  0.032,  0.042),
        (0.0,  0.096,  0.106),
        (0.0,  0.150,  0.146),
        (0.0,  0.180,  0.162),
    ]
    spine = catmull_rom_chain(spine_ctrl, samples_per_seg=2)
    m = len(spine)
    u_segs = 10
    rings = []

    for i, c in enumerate(spine):
        t = i / (m - 1)
        plume = math.sin(max(0.08, min(0.96, t)) * math.pi) ** 0.78
        rx = 0.058 * plume + 0.012 * (1.0 - t)
        ry = 0.034 * plume + 0.010 * (1.0 - t)

        ring = []
        for u in range(u_segs):
            th = (u / u_segs) * math.pi * 2.0
            u_v = -math.cos(th)
            u_l = math.sin(th)
            tuft = 1.0 + 0.07 * math.cos(th * 4.0) * plume
            px = u_l * rx * tuft
            py = c[1] + u_v * ry * 0.72
            pz = c[2] - u_v * ry * 0.69
            ring.append((px, py, pz))
        rings.append(ring)

    def tail_quad_mat(v, u):
        if u < 3 or u >= 7:
            return mat_cream
        if 4 <= u < 6:
            return mat_dorsal
        return mat_coat

    emit_unified_smooth_grid(
        gp,
        rings,
        tail_quad_mat,
        closed_u=True,
        uv_u_scale=1.0,
        uv_v_scale=1.0,
        cap_start_mat=mat_cream,
        cap_start_apex=(0.0, -0.020, -0.026),
        cap_start_normal=(0.0, -0.5, -0.86),
        cap_end_mat=mat_cream,
        cap_end_apex=(0.0, 0.196, 0.172),
        cap_end_normal=(0.0, 0.76, 0.65),
    )


def _add_cupped_deer_ear(gp, mat_coat, mat_dorsal, mat_cream, sgn):
    """
    Builds a true concave cupped leaf-shaped cervid ear (pinna) in `"head"` local space:
    buckskin convex outer shell with dark tip rim and pale cream concave inner hollow.
    """
    ear_ctrl = [
        (sgn * 0.080, 0.068, 0.012),
        (sgn * 0.130, 0.118, 0.024),
        (sgn * 0.188, 0.172, 0.036),
        (sgn * 0.234, 0.220, 0.044),
        (sgn * 0.258, 0.248, 0.048),
    ]
    spine = catmull_rom_chain(ear_ctrl, samples_per_seg=2)
    m = len(spine)
    u_segs = 12

    axis = v_norm(v_sub(spine[-1], spine[0]))
    hollow_dir = v_norm((sgn * 0.22, 0.12, -0.96))
    blade_wide = v_norm(v_cross(axis, hollow_dir))
    hollow_dir = v_norm(v_cross(blade_wide, axis))

    rings = []
    for i, c in enumerate(spine):
        t = i / (m - 1)
        leaf_w = 0.018 * (1.0 - t) + 0.056 * (math.sin(min(0.97, max(0.06, t)) * math.pi) ** 0.72)
        cup_depth = 0.026 * (math.sin(min(0.95, max(0.08, t)) * math.pi) ** 0.85)
        wall_thick = 0.010 * (1.0 - 0.55 * t) + 0.003

        ring = []
        for u in range(u_segs):
            th = (u / u_segs) * math.pi * 2.0
            lat = math.cos(th) * leaf_w
            s_th = math.sin(th)
            if s_th >= 0.0:
                d_hol = -(cup_depth * s_th + wall_thick)
            else:
                rim_roll = (-s_th)
                if t < 0.18:
                    d_hol = wall_thick * (1.0 - rim_roll)
                else:
                    d_hol = -(cup_depth * 0.72 * rim_roll) + wall_thick * 0.35

            pt = v_add(c, v_add(v_mul(blade_wide, lat), v_mul(hollow_dir, d_hol)))
            ring.append(pt)
        rings.append(ring)

    def ear_quad_mat(v, u):
        if 7 <= u <= 10 and v >= 1:
            return mat_cream
        if v >= m - 3:
            return mat_dorsal
        return mat_coat

    tip_apex = v_add(spine[-1], v_mul(axis, 0.012))
    base_apex = v_add(spine[0], v_mul(axis, -0.010))
    emit_unified_smooth_grid(
        gp,
        rings,
        ear_quad_mat,
        closed_u=True,
        uv_u_scale=1.0,
        uv_v_scale=1.0,
        cap_start_mat=mat_coat,
        cap_start_apex=base_apex,
        cap_start_normal=v_mul(axis, -1.0),
        cap_end_mat=mat_dorsal,
        cap_end_apex=tip_apex,
        cap_end_normal=axis,
    )


def _build_head_and_antlers(gp, mat_coat, mat_dorsal, mat_cream, mat_dark, mat_antler, mat_eye):
    """
    Sculpts the articulated `"head"` node (origin at (0, 1.44, -0.71) -> world antler max y ≈ 1.92m):
      - Unified smooth-shaded cranium + sculpted supraorbital brow arches + slender muzzle + jaw
      - Moist dark rhinarium with flared nostrils
      - Gentle side-set glossy dark eyes with thin upper lash rim
      - 2 cupped leaf-shaped ears
      - Furred pedicels, pearled burrs, and symmetrical 10-point royal antlers welded to beam spline
    """
    # 1. Unified Cervid Skull + Brow Arch + Slender Muzzle + Mandible
    head_ctrl = [
        # (y_top, z_top, y_bot, z_bot, rx, cream_h, dorsal_h)
        ( 0.068,  0.072, -0.056,  0.052, 0.076, 0.27, 0.24),  # 0: occipital socket back
        ( 0.102,  0.022, -0.072, -0.002, 0.104, 0.27, 0.26),  # 1: rounded braincase / neck wrap
        ( 0.112, -0.042, -0.078, -0.052, 0.112, 0.25, 0.28),  # 2: frontal crown
        ( 0.098, -0.102, -0.074, -0.108, 0.106, 0.23, 0.28),  # 3: supraorbital brow & eye plane
        ( 0.055, -0.158, -0.068, -0.162, 0.076, 0.23, 0.26),  # 4: gentle cervid stop
        ( 0.030, -0.222, -0.068, -0.225, 0.058, 0.25, 0.25),  # 5: slender nasal bridge & mandible
        ( 0.008, -0.278, -0.066, -0.280, 0.047, 0.28, 0.24),  # 6: fore-muzzle
        (-0.012, -0.318, -0.062, -0.314, 0.039, 0.30, 0.24),  # 7: muzzle tip into rhinarium
    ]

    h_dors = catmull_rom_chain([(c[0], c[1], 0.0) for c in head_ctrl], samples_per_seg=2)
    h_vent = catmull_rom_chain([(c[2], c[3], 0.0) for c in head_ctrl], samples_per_seg=2)
    h_meta = catmull_rom_chain([(c[4], c[5], c[6]) for c in head_ctrl], samples_per_seg=2)

    hv_cnt = len(h_dors)
    hu_segs = 18
    hu_cream = 3
    hu_dors_half = 2

    h_rings = []
    for v in range(hv_cnt):
        s = v / (hv_cnt - 1)
        yd, zd, _ = h_dors[v]
        yv, zv, _ = h_vent[v]
        rx_b, cr_h, dr_h = h_meta[v]
        rx_b = max(0.020, rx_b)
        cr_h = max(0.14, min(0.40, cr_h))
        dr_h = max(0.16, min(0.32, dr_h))

        th_cr = math.acos(1.0 - 2.0 * cr_h)
        th_dr = math.acos(1.0 - 2.0 * dr_h)
        cy = 0.5 * (yd + yv)
        cz = 0.5 * (zd + zv)
        hy = 0.5 * (yd - yv)
        hz = 0.5 * (zd - zv)

        brow_zone = math.exp(-((s - 0.41) / 0.11) ** 2)
        eye_socket = math.exp(-((s - 0.43) / 0.08) ** 2)
        muzzle_zone = max(0.0, (s - 0.48) / 0.52)

        ring = []
        for u in range(hu_segs):
            th = _eval_piecewise_theta(u, hu_segs, hu_cream, th_cr, hu_dors_half, th_dr)
            uv_y = -math.cos(th)
            ul_x = math.sin(th)

            # Sculpted cranial brow arch above eye + gentle orbital recess at eye level + slender jaw
            jaw_taper = 1.0 - 0.28 * (max(0.0, -uv_y) ** 1.4)
            brow_arch = 1.0 + 0.15 * brow_zone * math.exp(-((uv_y - 0.56) / 0.26) ** 2)
            orbit_cup = 1.0 - 0.08 * eye_socket * math.exp(-((uv_y - 0.18) / 0.24) ** 2)
            bridge_profile = 1.0 + 0.06 * muzzle_zone * math.exp(-((uv_y - 0.25) / 0.45) ** 2)

            rx = rx_b * jaw_taper * brow_arch * orbit_cup * bridge_profile
            ring.append((ul_x * rx, cy + uv_y * hy, cz + uv_y * hz))
        h_rings.append(ring)

    h_half = hu_segs // 2

    def head_quad_mat(v, u):
        if u < hu_cream or u >= (hu_segs - hu_cream):
            return mat_cream
        if (h_half - hu_dors_half) <= u < (h_half + hu_dors_half) and v >= 2:
            return mat_dorsal
        return mat_coat

    emit_unified_smooth_grid(
        gp,
        h_rings,
        head_quad_mat,
        closed_u=True,
        uv_u_scale=1.5,
        uv_v_scale=1.5,
        cap_start_mat=mat_coat,
        cap_start_apex=(0.0, 0.012, 0.082),
        cap_start_normal=(0.0, 0.05, 1.0),
        cap_end_mat=mat_dark,
        cap_end_apex=(0.0, -0.036, -0.332),
        cap_end_normal=(0.0, -0.08, -1.0),
    )

    dark_p = gp(mat_dark)
    eye_p = gp(mat_eye)
    coat_p = gp(mat_coat)
    ant_p = gp(mat_antler)

    # 2. Sculpted Moist Dark Rhinarium (Shield Nose Pad) & Flared Nostrils
    def nose_deform(x, y, z, frac, th):
        widen_top = 1.0 + 0.24 * (y / 0.028)
        return (x * widen_top, y, z)

    dark_p.add_ellipsoid(
        center=(0.0, -0.030, -0.324),
        radii=(0.033, 0.026, 0.022),
        u_segs=12,
        v_segs=7,
        deform_fn=nose_deform,
    )
    # Subtle dark lip cleft below rhinarium
    dark_p.add_tube(
        [(-0.028, -0.050, -0.275), (0.0, -0.048, -0.332), (0.028, -0.050, -0.275)],
        0.0042,
        0.0042,
        u_segs=5,
        samples_per_seg=2,
    )

    for sgn in (-1, 1):
        # Comma-shaped nostril wing
        dark_p.add_tube(
            [
                (sgn * 0.011, -0.030, -0.342),
                (sgn * 0.026, -0.021, -0.335),
                (sgn * 0.032, -0.027, -0.320),
            ],
            0.0058,
            0.0036,
            u_segs=6,
            samples_per_seg=2,
        )

        # 3. Gentle Large Glossy Side-Set Cervid Eyes + Thin Upper Lash Rim
        eye_p.add_ellipsoid(
            center=(sgn * 0.089, 0.030, -0.102),
            radii=(0.021, 0.020, 0.025),
            u_segs=12,
            v_segs=7,
            rot_euler=(0.04, sgn * -0.26, 0.0),
        )
        dark_p.add_tube(
            [
                (sgn * 0.082, 0.032, -0.127),
                (sgn * 0.098, 0.046, -0.103),
                (sgn * 0.093, 0.034, -0.079),
            ],
            0.0050,
            0.0040,
            u_segs=6,
            samples_per_seg=2,
        )

        # 4. Cupped Leaf-Shaped Deer Ear
        _add_cupped_deer_ear(gp, mat_coat, mat_dorsal, mat_cream, sgn)

        # 5. Skull Pedicel + Pearled Burr + Symmetrical 10-Point (5 per side) Royal Antlers
        # Head node at y = 1.44 -> y_local = +0.480 gives exact world y = 1.920m!
        coat_p.add_tube(
            [(sgn * 0.048, 0.086, -0.022), (sgn * 0.062, 0.112, -0.016)],
            0.023,
            0.020,
            u_segs=8,
            samples_per_seg=1,
        )

        def burr_deform(x, y, z, frac, th):
            pearl = 1.0 + 0.12 * math.cos(th * 9.0)
            return (x * pearl, y, z * pearl)

        ant_p.add_ellipsoid(
            center=(sgn * 0.064, 0.116, -0.015),
            radii=(0.026, 0.012, 0.026),
            u_segs=10,
            v_segs=5,
            rot_euler=(0.12, 0.0, sgn * -0.42),
            deform_fn=burr_deform,
        )

        # Evaluate dense main beam spline FIRST so every tine starts on the EXACT beam centerline!
        main_beam_ctrl = [
            (sgn * 0.064, 0.116, -0.015),
            (sgn * 0.148, 0.202,  0.022),
            (sgn * 0.220, 0.304, -0.008),
            (sgn * 0.208, 0.390, -0.098),
            (sgn * 0.140, 0.458, -0.198),  # Point 5: Forward Main Beam Tip (1.898m)
        ]
        beam_spine = catmull_rom_chain(main_beam_ctrl, samples_per_seg=3)  # 13 pts (indices 0..12)
        add_antler_branch(ant_p, beam_spine, r_base=0.021, r_tip=0.0036, u_segs=8, flutes=6, flute_amp=0.055, gusset_flare=0.18)

        # Point 1: Brow Tine / Eye Guard (welded strictly onto beam_spine[2]!)
        brow_spine = catmull_rom_chain([
            beam_spine[2],
            (sgn * 0.112, 0.212, -0.092),
            (sgn * 0.076, 0.278, -0.152),
        ], samples_per_seg=3)
        add_antler_branch(ant_p, brow_spine, r_base=0.0135, r_tip=0.0030, u_segs=6, flutes=5, flute_amp=0.04, gusset_flare=0.32)

        # Point 2: Bez / Bay Tine (welded strictly onto beam_spine[4]!)
        bez_spine = catmull_rom_chain([
            beam_spine[4],
            (sgn * 0.172, 0.302, -0.028),
            (sgn * 0.148, 0.382, -0.072),
        ], samples_per_seg=3)
        add_antler_branch(ant_p, bez_spine, r_base=0.0125, r_tip=0.0028, u_segs=6, flutes=5, flute_amp=0.035, gusset_flare=0.32)

        # Point 3: Trez / Tray Tine (welded strictly onto beam_spine[6]!)
        trez_spine = catmull_rom_chain([
            beam_spine[6],
            (sgn * 0.252, 0.392, -0.040),
            (sgn * 0.236, 0.468, -0.076),
        ], samples_per_seg=3)
        add_antler_branch(ant_p, trez_spine, r_base=0.0122, r_tip=0.0028, u_segs=6, flutes=5, flute_amp=0.035, gusset_flare=0.32)

        # Point 4: Royal Upper Crown Tine (welded strictly onto beam_spine[9], reaching y_local = +0.480 -> 1.920m!)
        crown_spine = catmull_rom_chain([
            beam_spine[9],
            (sgn * 0.215, 0.438, -0.058),
            (sgn * 0.202, 0.480, -0.040),
        ], samples_per_seg=3)
        add_antler_branch(ant_p, crown_spine, r_base=0.0112, r_tip=0.0026, u_segs=6, flutes=4, flute_amp=0.03, gusset_flare=0.32)


def _add_cloven_hoof_cleat(dark_part, x_center, sole_y, z_offset, toe_splay_x):
    """
    Sculpts a single anatomical ungulate hoof cleat whose flat sole lies strictly on y = sole_y
    (world y_min == 0.0000!), with rounded heel bulb (+Z), sloped anterior wall (-Z), flat inner
    interdigital cleft wall, and convex outer wall.
    """
    is_right_cleat = x_center > 0.0
    u_segs = 8
    heights = [0.000, 0.018, 0.044, 0.072]
    rings = []

    for hi, dy in enumerate(heights):
        hf = hi / (len(heights) - 1)
        z_front = z_offset - 0.052 * (1.0 - 0.46 * hf)
        z_back = z_offset + 0.028 * (1.0 - 0.22 * hf)
        z_mid = 0.5 * (z_front + z_back)
        rz = 0.5 * (z_back - z_front)

        w_outer = 0.0185 * (1.0 - 0.22 * hf)
        w_inner = 0.0095 * (1.0 - 0.12 * hf)
        cx = x_center + toe_splay_x * (1.0 - hf)

        ring = []
        for u in range(u_segs):
            th = (u / u_segs) * math.pi * 2.0
            ca = math.cos(th)
            sa = math.sin(th)
            if (is_right_cleat and ca < 0.0) or ((not is_right_cleat) and ca > 0.0):
                dx = ca * w_inner * 0.55
            else:
                dx = ca * w_outer
            front_narrow = 1.0 - 0.32 * max(0.0, -sa)
            pz = z_mid + sa * rz
            px = cx + dx * front_narrow
            ring.append((px, sole_y + dy, pz))
        rings.append(ring)

    dark_part.add_smooth_grid(rings, closed_u=True, ensure_outward=True)
    dark_part.add_cap_ring(rings[0], (0.0, -1.0, 0.0))
    dark_part.add_cap_ring(rings[-1], (0.0, 1.0, 0.0))


def _build_anatomical_leg(gp, mat_coat, mat_dark, sgn, is_hind, pivot_y):
    """
    Sculpts a complete seamless anatomical deer foreleg or hindleg from muscular upper shoulder/haunch
    (tucked cleanly inside the deep brisket/haunch barrel) through distinct carpus (knee) or angled
    tarsus (hock) joint, slender cannon bone, fetlock, rear dewclaws, pastern, and split cloven hooves
    resting cleanly at y = -pivot_y (world y = 0.0).
    """
    sole_y = -pivot_y

    if not is_hind:
        ctrl = [
            (-sgn * 0.026,  0.115,  0.005, 0.062, 0.094),
            (-sgn * 0.006,  0.010,  0.012, 0.066, 0.092),
            (0.0,          -0.145,  0.026, 0.050, 0.068),
            (0.0,          -0.290,  0.006, 0.036, 0.046),
            (0.0,          -0.415, -0.008, 0.031, 0.037),  # carpal knee joint
            (0.0,          -0.555, -0.002, 0.022, 0.027),  # slender metacarpal cannon
            (0.0,          -0.688,  0.008, 0.026, 0.032),  # fetlock
            (0.0,          -0.758, -0.010, 0.023, 0.026),  # pastern
        ]
        dewclaw_y = -0.698
        dewclaw_z = 0.032
        hoof_z = -0.012
    else:
        ctrl = [
            (-sgn * 0.030,  0.125, -0.005, 0.072, 0.116),
            (-sgn * 0.008,  0.015, -0.012, 0.072, 0.114),
            (0.0,          -0.155, -0.022, 0.055, 0.084),  # muscular stifle
            (0.0,          -0.295,  0.032, 0.038, 0.055),  # gaskin
            (0.0,          -0.415,  0.078, 0.031, 0.047),  # prominent angled hock
            (0.0,          -0.565,  0.042, 0.022, 0.028),  # slender metatarsal cannon
            (0.0,          -0.705,  0.016, 0.026, 0.032),  # fetlock
            (0.0,          -0.778, -0.004, 0.023, 0.026),  # pastern
        ]
        dewclaw_y = -0.715
        dewclaw_z = 0.038
        hoof_z = -0.006

    pos_chain = catmull_rom_chain([(c[0], c[1], c[2]) for c in ctrl], samples_per_seg=2)
    rad_chain = catmull_rom_chain([(c[3], c[4], 0.0) for c in ctrl], samples_per_seg=2)

    v_cnt = len(pos_chain)
    u_segs = 10
    rings = []

    for v in range(v_cnt):
        cx, cy, cz = pos_chain[v]
        rx, rz, _ = rad_chain[v]
        rx = max(0.018, rx)
        rz = max(0.022, rz)
        ring = []
        for u in range(u_segs):
            th = (u / u_segs) * math.pi * 2.0
            lat_x = -sgn * math.cos(th) * rx
            fb_z = math.sin(th) * rz
            ring.append((cx + lat_x, cy, cz + fb_z))
        rings.append(ring)

    top_c = pos_chain[0]
    bot_c = pos_chain[-1]
    emit_unified_smooth_grid(
        gp,
        rings,
        lambda v, u: mat_coat,
        closed_u=True,
        uv_u_scale=1.0,
        uv_v_scale=2.0,
        cap_start_mat=mat_coat,
        cap_start_apex=(top_c[0], top_c[1] + 0.018, top_c[2]),
        cap_start_normal=(0.0, 1.0, 0.0),
        cap_end_mat=mat_dark,
        cap_end_apex=(bot_c[0], bot_c[1] - 0.010, bot_c[2]),
        cap_end_normal=(0.0, -1.0, 0.0),
    )

    dark_p = gp(mat_dark)
    for dc_x in (-0.013, 0.013):
        dark_p.add_tube(
            [(dc_x, dewclaw_y + 0.012, dewclaw_z - 0.008), (dc_x * 1.15, dewclaw_y - 0.016, dewclaw_z + 0.012)],
            0.0062,
            0.0020,
            u_segs=5,
            samples_per_seg=1,
        )

    _add_cloven_hoof_cleat(dark_p, -0.0135, sole_y, hoof_z, -0.0025)
    _add_cloven_hoof_cleat(dark_p,  0.0135, sole_y, hoof_z,  0.0025)


# ---------------------------------------------------------------------------
# Embedded glTF 2.0 Quaternion Animations (Idle, Walk, Run, Attack)
# ---------------------------------------------------------------------------

def _add_deer_animations(b, head_node, tail_node, leg_nodes):
    """
    Adds smooth loopable glTF quaternion animations:
      - "Idle"   (2.0s): Gentle alert forest head scan + crisp tail twitch
      - "Walk"   (1.0s): Natural diagonal gait (leg0 & leg3 opposite leg1 & leg2) + head bob + tail sway
      - "Run"    (0.55s): Bounding cervid gallop + upright white-flagged tail
      - "Attack" (0.35s): Crisp antler head dip + foreleg brace
    """
    q0 = quat_from_euler_xyz(0.0, 0.0, 0.0)

    # 1. Idle (2.0s)
    idle_tracks = [
        {
            "node": head_node,
            "path": "rotation",
            "times": [0.0, 0.55, 1.05, 1.55, 2.0],
            "values": [
                q0,
                quat_from_euler_xyz(0.055,  0.085,  0.018),
                quat_from_euler_xyz(-0.035, 0.010,  0.0),
                quat_from_euler_xyz(0.045, -0.075, -0.015),
                q0,
            ],
        },
        {
            "node": tail_node,
            "path": "rotation",
            "times": [0.0, 0.62, 0.76, 0.90, 1.06, 2.0],
            "values": [
                q0,
                quat_from_euler_xyz(-0.04, 0.0, 0.0),
                quat_from_euler_xyz(-0.18,  0.16,  0.22),
                quat_from_euler_xyz(-0.22, -0.18, -0.22),
                quat_from_euler_xyz(-0.05,  0.03,  0.0),
                q0,
            ],
        },
    ]
    for ln in leg_nodes:
        idle_tracks.append({"node": ln, "path": "rotation", "times": [0.0, 2.0], "values": [q0, q0]})
    b.add_animation("Idle", idle_tracks)

    # 2. Walk (1.0s) — diagonal gait: leg0 (FL) & leg3 (BR) in phase, opposite leg1 (BL) & leg2 (FR)
    walk_steps = 8
    walk_times = [round(k / walk_steps, 4) for k in range(walk_steps + 1)]
    walk_amp = 0.30
    walk_tracks = [
        {
            "node": head_node,
            "path": "rotation",
            "times": walk_times,
            "values": [
                quat_from_euler_xyz(0.042 * math.sin(t * math.pi * 4.0), 0.018 * math.sin(t * math.pi * 2.0), 0.0)
                for t in walk_times
            ],
        },
        {
            "node": tail_node,
            "path": "rotation",
            "times": walk_times,
            "values": [
                quat_from_euler_xyz(-0.08 + 0.03 * math.cos(t * math.pi * 4.0), 0.09 * math.sin(t * math.pi * 2.0), 0.10 * math.sin(t * math.pi * 2.0))
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

    # 3. Run (0.55s) — bounding deer gallop + white-flagged tail
    run_dur = 0.55
    run_steps = 8
    run_times = [round((k / run_steps) * run_dur, 4) for k in range(run_steps + 1)]
    gallop_phases = [0.0, math.pi + 0.22, 0.28, math.pi]
    run_amp = 0.54

    run_tracks = [
        {
            "node": head_node,
            "path": "rotation",
            "times": run_times,
            "values": [
                quat_from_euler_xyz(0.08 * math.cos((t / run_dur) * math.pi * 2.0) + 0.04, 0.0, 0.0)
                for t in run_times
            ],
        },
        {
            "node": tail_node,
            "path": "rotation",
            "times": run_times,
            "values": [
                quat_from_euler_xyz(-0.52 + 0.10 * math.sin((t / run_dur) * math.pi * 2.0), 0.0, 0.06 * math.cos((t / run_dur) * math.pi * 2.0))
                for t in run_times
            ],
        },
    ]
    for i, ln in enumerate(leg_nodes):
        g_ph = gallop_phases[i]
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

    # 4. Attack (0.35s) — crisp head dip lowering the 10-point antlers forward
    b.add_animation("Attack", [
        {
            "node": head_node,
            "path": "rotation",
            "times": [0.0, 0.14, 0.26, 0.35],
            "values": [
                q0,
                quat_from_euler_xyz(-0.42, 0.0, 0.0),
                quat_from_euler_xyz(-0.12, 0.0, 0.0),
                q0,
            ],
        },
        {
            "node": tail_node,
            "path": "rotation",
            "times": [0.0, 0.14, 0.35],
            "values": [
                q0,
                quat_from_euler_xyz(-0.30, 0.0, 0.0),
                q0,
            ],
        },
        {
            "node": leg_nodes[0],
            "path": "rotation",
            "times": [0.0, 0.14, 0.35],
            "values": [q0, quat_from_euler_xyz(0.12, 0.0, 0.0), q0],
        },
        {
            "node": leg_nodes[2],
            "path": "rotation",
            "times": [0.0, 0.14, 0.35],
            "values": [q0, quat_from_euler_xyz(-0.10, 0.0, 0.0), q0],
        },
    ])


# ---------------------------------------------------------------------------
# Public Entry Point
# ---------------------------------------------------------------------------

def build_deer_glb(out_path):
    """Builds and exports the sculpted Forest Buck (`assets/deer.glb`)."""
    b = GLBBuilder()

    # PBR Material Palette
    mat_coat = b.add_material("DeerBuckskinCoat", (0.63, 0.38, 0.19), metallic=0.01, roughness=0.80)
    mat_dorsal = b.add_material("DeerChestnutSaddle", (0.45, 0.25, 0.12), metallic=0.01, roughness=0.82)
    mat_cream = b.add_material("DeerCreamPelage", (0.92, 0.85, 0.74), metallic=0.01, roughness=0.85)
    mat_dark = b.add_material("DeerHoofAndNose", (0.12, 0.08, 0.06), metallic=0.05, roughness=0.32)
    mat_antler = b.add_material("DeerAntlerIvory", (0.90, 0.84, 0.70), metallic=0.02, roughness=0.52)
    mat_eye = b.add_material("DeerGlossyEye", (0.05, 0.035, 0.025), metallic=0.06, roughness=0.08)

    root = b.add_node("DeerRoot")

    # 1. Seamless Continuous Torso + S-Neck Mesh
    body_parts, body_gp = b.create_parts_dict()
    _build_seamless_body_and_neck(body_gp, mat_coat, mat_dorsal, mat_cream)
    body_mesh = b.add_mesh_from_parts("DeerBodyMesh", body_parts.values())
    b.add_node("DeerBody", mesh_idx=body_mesh, parent_idx=root)

    # 2. Articulated Uplifted White-Lined Deer Tail ("tail")
    tail_parts, tail_gp = b.create_parts_dict()
    _build_tail_mesh(tail_gp, mat_coat, mat_dorsal, mat_cream)
    tail_mesh = b.add_mesh_from_parts("DeerTailMesh", tail_parts.values())
    tail_node = b.add_node("tail", translation=(0.0, 0.97, 0.58), mesh_idx=tail_mesh, parent_idx=root)

    # 3. Articulated Head ("head" at (0, 1.44, -0.71)) + 10-Point Royal Antlers
    head_parts, head_gp = b.create_parts_dict()
    _build_head_and_antlers(head_gp, mat_coat, mat_dorsal, mat_cream, mat_dark, mat_antler, mat_eye)
    head_mesh = b.add_mesh_from_parts("DeerHeadMesh", head_parts.values())
    head_node = b.add_node("head", translation=(0.0, 1.44, -0.71), mesh_idx=head_mesh, parent_idx=root)

    # 4. 4 Articulated Anatomical Legs:
    #    leg0: front-left  (x < 0, z < 0)
    #    leg1: back-left   (x < 0, z > 0)
    #    leg2: front-right (x > 0, z < 0)
    #    leg3: back-right  (x > 0, z > 0)
    leg_specs = [
        ("leg0", -1, False, (-0.146, 0.80, -0.34)),
        ("leg1", -1, True,  (-0.150, 0.82,  0.38)),
        ("leg2",  1, False, ( 0.146, 0.80, -0.34)),
        ("leg3",  1, True,  ( 0.150, 0.82,  0.38)),
    ]
    leg_nodes = []
    for leg_name, sgn, is_hind, pivot_pos in leg_specs:
        lp_dict, lgp = b.create_parts_dict()
        _build_anatomical_leg(lgp, mat_coat, mat_dark, sgn=sgn, is_hind=is_hind, pivot_y=pivot_pos[1])
        l_mesh = b.add_mesh_from_parts(f"{leg_name}_Mesh", lp_dict.values())
        l_node = b.add_node(leg_name, translation=pivot_pos, mesh_idx=l_mesh, parent_idx=root)
        leg_nodes.append(l_node)

    # 5. Embedded glTF Animations
    _add_deer_animations(b, head_node=head_node, tail_node=tail_node, leg_nodes=leg_nodes)

    return b.export_glb(out_path)


if __name__ == "__main__":
    project_root = os.path.dirname(_SCRIPT_DIR)
    default_out = os.path.join(project_root, "assets", "deer.glb")
    out_file = sys.argv[1] if len(sys.argv) > 1 else default_out
    stats = build_deer_glb(out_file)
    print(f"[build_deer] Generated {stats['filepath']} | {stats['bytes']} bytes | "
          f"{stats['triangles']} tris | {stats['vertices']} verts | "
          f"{stats['nodes']} nodes | {stats['animations']} animations")
