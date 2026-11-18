#!/usr/bin/env python3
"""
Generates the game-ready Western Tailor NPC (`assets/tailor_npc.glb`).

Specification highlights:
  - Standing cleanly with boot soles at y = 0.0, total height ~1.78m.
  - CRITICAL: Facing +Z (z > 0 is forward toward the Tailor Shop counter and customer).
  - Polished dress leather boots (stacked heels, welted soles, smooth sculpted vamp/shaft),
    tailored dark wool trousers with pressed front creases & cuff break, leather belt & brass buckle.
  - Burgundy brocade waistcoat with double-pointed notched hem, lapels, 4 welt pockets, satin back
    with cinch strap, 5 brass buttons, and a gleaming brass pocket-watch catenary chain + fob.
  - Crisp cream pleated dress shirt with turn-down collar, rolled-up sleeves, and folded blue silk
    cravat/ascot scarf with knot and pearl-topped brass stickpin.
  - Yellow fabric measuring tape draped around the neck & hanging down both sides with tick marks
    and brass end ferrules.
  - Anatomically sculpted forearms, wrists, hands & articulated fingers posed warmly forward (+Z)
    above counter level (y > 1.12): right hand (x < 0) holding detailed gleaming brass tailor's
    shears (crossed bevel blades, pivot screw, thumb ring & bow handle); left hand (x > 0) holding
    a folded cloth swatch & tufted red velvet pincushion with dressmaker pins.
  - Expressive friendly sculpted face (+Z) with orbital sockets, cheekbones, jaw/chin, nose &
    nostrils, detailed ears, multi-part eyes (sclera, iris, dark pupils, eyelids), arched brows,
    sideburns, magnificent curled handlebar mustache, and brown curved Stetson hat with ribbon band
    & brass buckle.
"""

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from glb_core import (
    GLBBuilder,
    catmull_rom_chain,
    quat_from_euler_xyz,
    v_add,
    v_cross,
    v_dot,
    v_mul,
    v_norm,
    v_sub,
)


# ---------------------------------------------------------------------------
# Custom Sculpting Helpers (Ribbon Loft, Seamless Loop Tube, Articulated Finger)
# ---------------------------------------------------------------------------

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
    """
    Sweeps a rounded rectangular ribbon cross-section (width x thickness) along ctrl_pts,
    orienting the flat face normal toward normal_fn(t, pt) at every station so belts, lapels,
    measuring tapes, and scissor blades lie flush without Bishop-frame twist drift.
    """
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
    """Builds a seamless closed tubular ring through periodic loop_pts (no open seam)."""
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
    """Sculpts a tapered 3-joint finger with subtle knuckle swells and rounded fingertip."""
    spine = catmull_rom_chain(joint_pts, samples_per_seg=1)

    def finger_sec(t, theta):
        r = r_base + (r_tip - r_base) * (t ** 0.9)
        knuckle = 0.0009 * (
            math.exp(-((t - 0.36) / 0.13) ** 2) + 0.7 * math.exp(-((t - 0.68) / 0.12) ** 2)
        )
        rx = (r + knuckle) * 0.96
        ry = (r + knuckle) * 1.04
        if t > 0.86:
            tip_f = max(0.24, math.sqrt(max(0.0, 1.0 - ((t - 0.86) / 0.145) ** 2)))
            rx *= tip_f
            ry *= tip_f
        return (math.cos(theta) * rx, math.sin(theta) * ry)

    skin_part.add_loft(spine, finger_sec, u_segs=u_segs, cap_start=True, cap_end=True)


def add_tape_tick_quad(part, cx, cy, cz, width, height, yaw_y=0.0):
    """Lightweight crisp measurement tick mark on the front of the yellow measuring tape."""
    hw, hh = width * 0.5, height * 0.5
    ca, sa = math.cos(yaw_y), math.sin(yaw_y)
    p0 = (cx - hw * ca, cy - hh, cz + hw * sa)
    p1 = (cx + hw * ca, cy - hh, cz - hw * sa)
    p2 = (cx + hw * ca, cy + hh, cz - hw * sa)
    p3 = (cx - hw * ca, cy + hh, cz + hw * sa)
    part.add_flat_quad(p0, p1, p2, p3)


# ---------------------------------------------------------------------------
# 1. Boots, Tailored Wool Trousers, Pelvis & Brass-Buckled Belt (facing +Z)
# ---------------------------------------------------------------------------

def build_boots_and_trousers(boot_part, sole_part, pants_part, belt_part, brass_part):
    """
    Polished dress leather boots resting flat on y = 0.0, tailored charcoal-brown wool
    trousers with pressed front crease & cuff break, and leather belt with brass buckle at +Z.
    """
    for sgn in (-1, 1):
        lx = sgn * 0.120
        splay = sgn * 0.014

        # 1a. Stacked leather dress heel (y = 0.000 .. 0.028, rear of boot z = -0.088 .. -0.018)
        heel_spine = [(lx, 0.000, -0.052), (lx, 0.014, -0.052), (lx, 0.028, -0.050)]

        def heel_sec(t, theta):
            w = 0.044 + 0.003 * t
            d = 0.036 + 0.002 * t
            ct, st = math.cos(theta), math.sin(theta)
            z_off = st * d
            if z_off > 0.024:
                z_off = 0.024 + (z_off - 0.024) * 0.25
            return (ct * w, z_off)

        sole_part.add_loft(
            heel_spine, heel_sec, u_segs=6,
            rot_euler=(0.0, splay, 0.0), up_hint=(0.0, 0.0, 1.0),
        )

        # 1b. Welted leather dress sole (y = 0.000 .. 0.014 under forefoot, arch rise behind)
        sole_spine = [
            (lx - sgn * 0.001, 0.018, -0.018),
            (lx + sgn * 0.002, 0.007, 0.042),
            (lx + sgn * 0.005, 0.007, 0.115),
            (lx + sgn * 0.008, 0.008, 0.178),
        ]

        def sole_sec(t, theta):
            w = 0.042 + 0.013 * math.sin(t * math.pi * 0.82) - 0.022 * (t ** 2.4)
            ct, st = math.cos(theta), math.sin(theta)
            yy = st * 0.0075
            if t >= 0.22 and yy < -0.007:
                yy = -0.007
            return (ct * w, yy)

        sole_part.add_loft(sole_spine, sole_sec, u_segs=6, up_hint=(0.0, 1.0, 0.0))

        # 1c. Smooth polished dress-boot vamp, instep & ankle shaft (y = 0.012 .. 0.245)
        vamp_spine = catmull_rom_chain([
            (lx + sgn * 0.008, 0.022, 0.174),
            (lx + sgn * 0.005, 0.036, 0.112),
            (lx + sgn * 0.002, 0.062, 0.046),
            (lx, 0.095, -0.006),
            (lx, 0.165, -0.012),
            (lx, 0.245, -0.010),
        ], samples_per_seg=1)

        def boot_vamp_sec(t, theta):
            if t < 0.45:
                u_f = t / 0.45
                rx = 0.024 + 0.028 * math.sin(u_f * math.pi * 0.65)
                ry = 0.014 + 0.030 * (u_f ** 0.85)
            else:
                v_f = (t - 0.45) / 0.55
                rx = 0.049 + 0.008 * v_f
                ry = 0.054 + 0.008 * v_f
            ct, st = math.cos(theta), math.sin(theta)
            yy = st * ry
            if t < 0.35 and yy < -0.012:
                yy = -0.012
            return (ct * rx, yy)

        boot_part.add_loft(vamp_spine, boot_vamp_sec, u_segs=7, up_hint=(0.0, 1.0, 0.0))
        boot_part.add_ellipsoid(
            center=(lx, 0.062, -0.038),
            radii=(0.045, 0.042, 0.046),
            u_segs=6, v_segs=4,
        )

        # 1d. Tailored dark wool trouser leg (y = 0.205 .. 0.825) with pressed crease & hem break
        leg_spine = catmull_rom_chain([
            (lx, 0.205, 0.004),
            (lx * 1.01, 0.265, -0.002),
            (lx * 1.02, 0.485, 0.016),
            (lx * 0.99, 0.665, 0.004),
            (lx * 0.88, 0.825, -0.006),
        ], samples_per_seg=2)

        def trouser_sec(t, theta):
            base_r = 0.069 + 0.029 * (t ** 0.88)
            hem_break = 0.0045 * math.sin(t * math.pi * 9.0) * max(0.0, 1.0 - t / 0.24)
            crease = 0.0045 * (abs(math.sin(theta)) ** 6) * (0.35 + 0.65 * math.sin(t * math.pi))
            r = base_r + hem_break + crease
            return (math.cos(theta) * r * 0.94, math.sin(theta) * r * 1.05)

        pants_part.add_loft(leg_spine, trouser_sec, u_segs=7, cap_end=False, up_hint=(0.0, 0.0, 1.0))

        cuff_loop = [
            (lx + math.cos(a) * 0.068, 0.215 + 0.004 * math.sin(a), 0.004 + math.sin(a) * 0.074)
            for a in [k * math.pi * 2.0 / 8 for k in range(8)]
        ]
        add_closed_loop_tube(pants_part, cuff_loop, 0.007, 0.013, u_segs=4)

    # 1e. Sculpted tailored pelvis / seat (y = 0.735 .. 0.855)
    pelvis_spine = [(0.0, 0.735, -0.008), (0.0, 0.795, -0.006), (0.0, 0.855, -0.002)]

    def pelvis_sec(t, theta):
        s = math.sin(t * math.pi * 0.82 + 0.18)
        rx = 0.175 + 0.026 * s
        rz = 0.125 + 0.022 * s
        if math.sin(theta) < -0.2:
            rz += 0.008 * abs(math.sin(theta)) * math.sin(t * math.pi)
        return (math.cos(theta) * rx, math.sin(theta) * rz)

    pants_part.add_loft(pelvis_spine, pelvis_sec, u_segs=10, cap_end=False, up_hint=(0.0, 0.0, 1.0))

    # 1f. Smooth dark leather belt, 5 wool belt loops & ornate brass buckle at +Z (y = 0.836)
    belt_loop_pts = [
        (math.cos(a) * 0.203, 0.836, math.sin(a) * 0.149 - 0.002)
        for a in [k * math.pi * 2.0 / 14 for k in range(14)]
    ]
    add_closed_loop_tube(belt_part, belt_loop_pts, 0.010, 0.021, u_segs=4)

    for loop_ang in (-0.55, 0.55, math.pi * 0.5 + 0.65, math.pi * 0.5 - 0.65, -math.pi * 0.5):
        bx_l = math.cos(loop_ang) * 0.209
        bz_l = math.sin(loop_ang) * 0.155 - 0.002
        pants_part.add_faceted_prism(
            sides=4, r_top=0.008, r_bot=0.008, length=0.046,
            center=(bx_l, 0.836, bz_l), rot_euler=(0.0, -loop_ang, 0.0), twist_offset=math.pi * 0.25,
        )

    buckle_ring = [
        (-0.028, 0.858, 0.156),
        (0.028, 0.858, 0.156),
        (0.028, 0.814, 0.156),
        (-0.028, 0.814, 0.156),
    ]
    add_closed_loop_tube(brass_part, buckle_ring, 0.0055, 0.0055, u_segs=4)
    brass_part.add_faceted_prism(sides=4, r_top=0.005, r_bot=0.005, length=0.044, center=(0.0, 0.836, 0.156), twist_offset=math.pi * 0.25)
    brass_part.add_faceted_prism(sides=4, r_top=0.004, r_bot=0.004, length=0.026, center=(-0.012, 0.836, 0.161), rot_euler=(0.0, 0.0, math.pi * 0.5), twist_offset=math.pi * 0.25)


# ---------------------------------------------------------------------------
# 2. Burgundy Brocade Waistcoat, Watch Chain, Shirt, Cravat & Measuring Tape
# ---------------------------------------------------------------------------

def build_torso_vest_cravat_and_tape(
    vest_part,
    lapel_part,
    satin_back_part,
    shirt_part,
    cravat_part,
    tape_part,
    tick_part,
    brass_part,
    pearl_part,
):
    """
    Sculpts the tailored burgundy brocade waistcoat (double-pointed hem, notched lapels,
    4 welt pockets, brass buttons, catenary pocket-watch chain), pleated cream shirt & collar,
    folded blue silk cravat with pearl pin, and yellow measuring tape with dark inch ticks.
    """
    # 2a. Pleated cream dress shirt under-torso & chest plastron (strictly inside waistcoat
    # everywhere except the central front V-neck bib |x| < 0.09 and collar y > 1.405!)
    shirt_spine = [
        (0.0, 0.88, 0.002),
        (0.0, 1.06, 0.004),
        (0.0, 1.22, 0.006),
        (0.0, 1.34, 0.005),
        (0.0, 1.40, 0.004),
        (0.0, 1.43, 0.004),
    ]

    def shirt_torso_sec(t, theta):
        # Taper width & depth faster than vest_rings as t -> 1 so shirt NEVER pokes through
        # waistcoat shoulder straps, lapels, or measuring tape!
        w = 0.158 * (1.0 - 0.48 * (t ** 1.8))
        d = 0.118 + 0.018 * math.sin(t * math.pi * 0.65) - 0.042 * (t ** 2.2)
        # Push chest bib slightly forward ONLY near center V-neck (|cos(theta)| < 0.55, sin(theta) > 0.65)
        ct, st = math.cos(theta), math.sin(theta)
        if st > 0.65 and abs(ct) < 0.62 and 0.35 < t < 0.92:
            bib_mask = (1.0 - abs(ct) / 0.62) * ((st - 0.65) / 0.35)
            d += 0.022 * bib_mask + 0.0024 * math.cos(theta * 24.0) * bib_mask
        return (ct * w, st * d)

    shirt_part.add_loft(shirt_spine, shirt_torso_sec, u_segs=16, cap_start=False, up_hint=(0.0, 0.0, 1.0))

    # 2b. Tailored Burgundy Brocade Waistcoat front & sides (y = 0.790 .. 1.405)
    v_levels = [0.0, 0.12, 0.30, 0.52, 0.72, 0.88, 1.0]
    u_segs_vest = 22
    vest_rings = []
    for tv in v_levels:
        ring = []
        for u in range(u_segs_vest):
            theta = (u / u_segs_vest) * math.pi * 2.0
            ct, st = math.cos(theta), math.sin(theta)

            w = 0.194 - 0.006 * math.sin(tv * math.pi) + 0.030 * math.sin(tv * math.pi * 0.76) - 0.048 * (tv ** 3.0)
            d = 0.140 + 0.024 * math.sin(tv * math.pi * 0.72) - 0.028 * (tv ** 2.8)

            if tv > 0.52:
                arm_cut = max(0.0, (abs(ct) - 0.62) / 0.38) * ((tv - 0.52) / 0.48)
                w *= 1.0 - 0.16 * arm_cut

            y_base = 0.838 + tv * (1.405 - 0.838)
            if st > 0.15:
                point_wave = math.exp(-((abs(ct) - 0.35) / 0.20) ** 2) * (st ** 1.4)
                center_notch = math.exp(-((ct / 0.13) ** 2)) * (st ** 2.0)
                hem_dip = (-0.048 * point_wave + 0.024 * center_notch) * max(0.0, 1.0 - tv / 0.28)
                y_base += hem_dip

            z_mod = st * d + 0.005 * math.sin(tv * math.pi)
            if st > 0.48 and tv > 0.56:
                v_open_half_w = 0.098 * ((tv - 0.56) / 0.44) ** 0.85
                if abs(ct * w) < v_open_half_w:
                    depth_recess = (1.0 - abs(ct * w) / max(0.005, v_open_half_w)) * 0.036
                    z_mod -= depth_recess

            ring.append((ct * w, y_base, z_mod))
        vest_rings.append(ring)

    vest_part.add_smooth_grid(vest_rings, closed_u=True, ensure_outward=True)
    vest_part.add_cap_ring(vest_rings[-1], (0.0, 1.0, 0.0))

    # Darker satin back cinch strap & small brass buckle (-Z)
    satin_cinch = [
        (-0.105, 0.965, -0.145),
        (0.0, 0.960, -0.156),
        (0.105, 0.965, -0.145),
    ]
    add_oriented_ribbon(
        satin_back_part, satin_cinch, width=0.026, thickness=0.007,
        normal_fn=lambda t, p: (0.0, 0.0, -1.0), samples_per_seg=2, u_segs=4,
    )
    brass_part.add_faceted_prism(sides=4, r_top=0.014, r_bot=0.014, length=0.008, center=(0.0, 0.960, -0.159), rot_euler=(-math.pi * 0.5, 0.0, 0.0), twist_offset=math.pi * 0.25)

    # 2c. Sculpted Notched Waistcoat Lapels framing the V-neck (+Z)
    for sgn in (-1, 1):
        lapel_pts = [
            (sgn * 0.012, 1.145, 0.161),
            (sgn * 0.046, 1.235, 0.158),
            (sgn * 0.082, 1.325, 0.142),
            (sgn * 0.102, 1.398, 0.102),
        ]
        add_oriented_ribbon(
            lapel_part,
            lapel_pts,
            width=lambda t: 0.022 + 0.018 * math.sin(t * math.pi * 0.85),
            thickness=0.009,
            normal_fn=lambda t, p, s=sgn: (s * 0.25, 0.12, 0.96),
            samples_per_seg=2,
            u_segs=4,
        )

    # 2d. 4 Tailored Welt Pockets (2 lower watch pockets + 2 upper ticket pockets)
    for sgn in (-1, 1):
        low_welt = [
            (sgn * 0.056, 0.922, 0.152),
            (sgn * 0.098, 0.928, 0.142),
            (sgn * 0.136, 0.936, 0.122),
        ]
        add_oriented_ribbon(
            lapel_part, low_welt, width=0.016, thickness=0.008,
            normal_fn=lambda t, p, s=sgn: (s * 0.45, 0.05, 0.89), samples_per_seg=1, u_segs=4,
        )
        up_welt = [
            (sgn * 0.068, 1.092, 0.154),
            (sgn * 0.104, 1.098, 0.144),
            (sgn * 0.136, 1.105, 0.126),
        ]
        add_oriented_ribbon(
            lapel_part, up_welt, width=0.014, thickness=0.007,
            normal_fn=lambda t, p, s=sgn: (s * 0.45, 0.05, 0.89), samples_per_seg=1, u_segs=4,
        )

    # 2e. 5 Domed Brass Waistcoat Buttons down center placket (+Z)
    button_ys = (0.855, 0.925, 0.995, 1.065, 1.135)
    for idx_b, by in enumerate(button_ys):
        bz = 0.150 + 0.012 * math.sin((idx_b / 4.0) * math.pi * 0.75 + 0.2)
        brass_part.add_ellipsoid(center=(0.0, by, bz), radii=(0.0105, 0.0105, 0.0065), u_segs=6, v_segs=3)

    # 2f. Gleaming Brass Double-Albert Pocket-Watch Catenary Chain & Fob!
    brass_part.add_faceted_prism(
        sides=5, r_top=0.003, r_bot=0.003, length=0.022,
        center=(0.0, 0.995, 0.165), rot_euler=(0.0, 0.0, math.pi * 0.5),
    )
    for sgn in (-1, 1):
        chain_ctrl = [
            (0.0, 0.992, 0.165),
            (sgn * 0.036, 0.935, 0.164),
            (sgn * 0.076, 0.904, 0.156),
            (sgn * 0.106, 0.928, 0.143),
        ]
        chain_spine = catmull_rom_chain(chain_ctrl, samples_per_seg=3)

        def chain_sec(t, theta):
            link_r = 0.0040 + 0.0010 * math.cos(t * math.pi * 12.0)
            return (math.cos(theta) * link_r, math.sin(theta) * link_r)

        brass_part.add_loft(chain_spine, chain_sec, u_segs=5, up_hint=(0.0, 0.0, 1.0))

    brass_part.add_tube([(0.0, 0.992, 0.165), (0.0, 0.958, 0.167)], 0.0032, 0.0032, u_segs=4, samples_per_seg=1)
    brass_part.add_ellipsoid(center=(0.0, 0.948, 0.167), radii=(0.011, 0.012, 0.0045), u_segs=6, v_segs=3)
    brass_part.add_ellipsoid(center=(0.102, 0.938, 0.141), radii=(0.020, 0.018, 0.006), u_segs=7, v_segs=3, rot_euler=(0.0, -0.35, 0.0))

    # 2g. Crisp Cream Turn-Down Wing Collar & Folded Blue Silk Cravat / Ascot + Stickpin
    collar_ring = [
        (math.cos(a) * 0.079, 1.425 - 0.010 * math.sin(a), math.sin(a) * 0.082 + 0.008)
        for a in [k * math.pi * 2.0 / 10 for k in range(10)]
    ]
    add_closed_loop_tube(shirt_part, collar_ring, 0.012, 0.022, u_segs=4)
    for sgn in (-1, 1):
        wing_pts = [
            (sgn * 0.068, 1.432, 0.048),
            (sgn * 0.056, 1.418, 0.098),
            (sgn * 0.036, 1.396, 0.134),
        ]
        add_oriented_ribbon(
            shirt_part, wing_pts,
            width=lambda t: 0.030 * (1.0 - 0.45 * t),
            thickness=0.007,
            normal_fn=lambda t, p, s=sgn: (s * 0.48, -0.15, 0.86),
            samples_per_seg=2, u_segs=4,
        )

    cravat_neck = [
        (math.cos(a) * 0.075, 1.410 - 0.008 * math.sin(a), math.sin(a) * 0.078 + 0.009)
        for a in [k * math.pi * 2.0 / 10 for k in range(10)]
    ]
    add_closed_loop_tube(cravat_part, cravat_neck, 0.009, 0.014, u_segs=4)
    cravat_part.add_ellipsoid(center=(0.0, 1.392, 0.118), radii=(0.027, 0.023, 0.020), u_segs=8, v_segs=4)

    for sgn, z_bias in ((-1, 0.004), (1, 0.0)):
        ascot_pts = [
            (sgn * 0.012, 1.385, 0.124 + z_bias),
            (-sgn * 0.016, 1.320, 0.146 + z_bias),
            (0.0, 1.240, 0.150 + z_bias * 0.5),
            (0.0, 1.185, 0.146),
        ]
        add_oriented_ribbon(
            cravat_part, ascot_pts,
            width=lambda t: 0.034 + 0.024 * math.sin(t * math.pi * 0.82),
            thickness=0.011,
            normal_fn=lambda t, p: (0.0, 0.14, 0.99),
            samples_per_seg=2, u_segs=4,
        )
    brass_part.add_tube([(0.0, 1.335, 0.156), (0.004, 1.305, 0.148)], 0.0022, 0.0014, u_segs=4, samples_per_seg=1)
    brass_part.add_ellipsoid(center=(0.0, 1.338, 0.158), radii=(0.0075, 0.0075, 0.0055), u_segs=6, v_segs=3)
    pearl_part.add_ellipsoid(center=(0.0, 1.338, 0.162), radii=(0.0052, 0.0052, 0.0052), u_segs=6, v_segs=3)

    # 2h. Yellow Fabric Measuring Tape Draped Around Back of Neck & Hanging Down Both Sides
    tape_ctrl = [
        (-0.128, 0.915, 0.154),
        (-0.132, 1.060, 0.158),
        (-0.130, 1.220, 0.154),
        (-0.112, 1.365, 0.112),
        (-0.088, 1.448, 0.022),
        (0.0, 1.458, -0.088),
        (0.088, 1.448, 0.022),
        (0.112, 1.365, 0.112),
        (0.130, 1.220, 0.154),
        (0.132, 1.070, 0.158),
        (0.126, 0.945, 0.153),
    ]

    def tape_normal(t, pt):
        if 0.36 < t < 0.64:
            return v_norm((pt[0] * 1.4, 0.32, pt[2] - 0.01))
        return v_norm((pt[0] * 0.55, 0.10, 0.95))

    add_oriented_ribbon(
        tape_part, tape_ctrl,
        width=0.021, thickness=0.0045,
        normal_fn=tape_normal,
        samples_per_seg=2, u_segs=4,
    )

    brass_part.add_faceted_prism(sides=4, r_top=0.009, r_bot=0.009, length=0.021, center=(-0.128, 0.910, 0.154), rot_euler=(0.0, -0.22, math.pi * 0.5), twist_offset=math.pi * 0.25)
    brass_part.add_faceted_prism(sides=4, r_top=0.009, r_bot=0.009, length=0.021, center=(0.126, 0.940, 0.153), rot_euler=(0.0, 0.22, math.pi * 0.5), twist_offset=math.pi * 0.25)

    for sgn, y_bot in ((-1, 0.935), (1, 0.965)):
        ty = y_bot
        idx_t = 0
        while ty <= 1.335:
            frac_h = (ty - 0.92) / 0.44
            tz = 0.156 + 0.005 * math.sin(frac_h * math.pi) - (0.028 * max(0.0, frac_h - 0.72) / 0.28)
            tx = sgn * (0.129 - 0.010 * max(0.0, frac_h - 0.68) / 0.32)
            tick_w = 0.012 if (idx_t % 3 == 0) else 0.0075
            x_shift = -sgn * (0.021 - tick_w) * 0.35
            add_tape_tick_quad(
                tick_part,
                tx + x_shift, ty, tz + 0.0030,
                width=tick_w, height=0.0030, yaw_y=sgn * 0.24,
            )
            ty += 0.028
            idx_t += 1


# ---------------------------------------------------------------------------
# 3. Sculpted Rolled-Sleeve Arms, Hands, Brass Shears & Pincushion/Cloth
# ---------------------------------------------------------------------------

def build_arm_mesh(shirt_part, skin_part, sgn):
    """
    Rolled-sleeve upper arm with inward-curved rounded deltoid shoulder cap tucked
    deep inside the waistcoat armhole + bare sculpted forearm around shoulder pivot
    (sgn * 0.205, 1.345, 0.008). Kept cleanly above counter y = 1.10!
    """
    # Root starts 6.8cm medial inside the waistcoat shoulder (-sgn * 0.068 -> world x = +-0.137, y = 1.340)
    # below the waistcoat shoulder strap (y = 1.408), curving smoothly outward & downward over a rounded
    # anatomical deltoid contour so there is zero flat stump, zero protrusion above the vest, and zero gap!
    sleeve_spine = catmull_rom_chain([
        (-sgn * 0.078, 0.004, -0.014),
        (-sgn * 0.034, 0.002, -0.006),
        (sgn * 0.008, -0.028, 0.008),
        (sgn * 0.046, -0.120, 0.032),
        (sgn * 0.078, -0.220, 0.068),
        (sgn * 0.090, -0.252, 0.082),
    ], samples_per_seg=2)

    def sleeve_sec(t, theta):
        if t < 0.28:
            u_f = t / 0.28
            r = 0.028 + 0.031 * math.sin(u_f * math.pi * 0.5)
        else:
            v_f = (t - 0.28) / 0.72
            r = 0.059 - 0.006 * v_f + 0.003 * math.sin(v_f * math.pi * 2.5)
        wrinkle = 0.0022 * math.cos(theta * 5.0) * (max(0.0, t - 0.30) ** 1.5)
        return (math.cos(theta) * (r + wrinkle) * 0.96, math.sin(theta) * (r + wrinkle) * 1.04)

    shirt_part.add_loft(sleeve_spine, sleeve_sec, u_segs=8, up_hint=(0.0, 0.0, 1.0))

    elbow_c = (sgn * 0.090, -0.250, 0.084)
    for roll_i, (off_y, off_z, r_tube) in enumerate(((0.012, -0.012, 0.015), (-0.004, 0.008, 0.016))):
        cuff_ring = []
        for k in range(8):
            a = (k / 8.0) * math.pi * 2.0
            px = elbow_c[0] + math.cos(a) * (0.056 - roll_i * 0.002)
            py = elbow_c[1] + off_y + math.sin(a) * 0.044
            pz = elbow_c[2] + off_z - math.sin(a) * 0.036
            cuff_ring.append((px, py, pz))
        add_closed_loop_tube(shirt_part, cuff_ring, r_tube, r_tube * 0.92, u_segs=4)

    forearm_spine = catmull_rom_chain([
        (sgn * 0.088, -0.252, 0.092),
        (sgn * 0.066, -0.228, 0.148),
        (sgn * 0.034, -0.206, 0.204),
        (sgn * 0.008, -0.190, 0.246),
    ], samples_per_seg=2)

    def forearm_sec(t, theta):
        muscle = 0.046 + 0.005 * math.sin(t * math.pi * 0.85) - 0.016 * (t ** 1.15)
        flat_x = 1.0 - 0.12 * t
        flat_y = 1.0 + 0.10 * t
        return (math.cos(theta) * muscle * flat_x, math.sin(theta) * muscle * flat_y)

    skin_part.add_loft(forearm_spine, forearm_sec, u_segs=8, up_hint=(0.0, 1.0, 0.0))


def build_right_hand_and_shears(skin_part, brass_part, steel_part):
    """
    Right hand (x < 0 when facing +Z) holding gleaming brass tailor's shears
    (crossed bevel blades, pivot screw, round thumb ring & oval 3-finger bow handle).
    """
    palm_spine = [
        (-0.008, -0.190, 0.246),
        (0.006, -0.186, 0.272),
        (0.018, -0.184, 0.296),
    ]

    def palm_sec(t, theta):
        w = 0.020 + 0.004 * math.sin(t * math.pi)
        h = 0.036 + 0.006 * math.sin(t * math.pi * 0.8)
        return (math.cos(theta) * w, math.sin(theta) * h)

    skin_part.add_loft(palm_spine, palm_sec, u_segs=7, up_hint=(0.0, 1.0, 0.0))
    skin_part.add_ellipsoid(center=(0.012, -0.168, 0.268), radii=(0.018, 0.020, 0.024), u_segs=6, v_segs=3)

    add_articulated_finger(
        skin_part,
        [
            (0.008, -0.166, 0.262),
            (0.020, -0.150, 0.276),
            (0.034, -0.148, 0.288),
            (0.042, -0.156, 0.284),
        ],
        r_base=0.0115, r_tip=0.0085, u_segs=4,
    )
    add_articulated_finger(
        skin_part,
        [
            (0.018, -0.172, 0.294),
            (0.030, -0.174, 0.318),
            (0.036, -0.182, 0.332),
            (0.026, -0.190, 0.324),
        ],
        r_base=0.0098, r_tip=0.0072, u_segs=4,
    )
    for f_idx, (y_off, z_off) in enumerate(((-0.186, 0.294), (-0.199, 0.290), (-0.211, 0.284))):
        r_f = 0.0096 - f_idx * 0.0008
        add_articulated_finger(
            skin_part,
            [
                (0.016, y_off, z_off),
                (0.034, y_off - 0.004, z_off + 0.012),
                (0.040, y_off - 0.012, z_off - 0.004),
                (0.024, y_off - 0.014, z_off - 0.014),
            ],
            r_base=r_f, r_tip=r_f * 0.75, u_segs=4,
        )

    piv = (0.038, -0.168, 0.342)

    thumb_loop = [
        (0.024, -0.150 + math.sin(a) * 0.020, 0.282 + math.cos(a) * 0.024)
        for a in [k * math.pi * 2.0 / 9 for k in range(9)]
    ]
    add_closed_loop_tube(brass_part, thumb_loop, 0.0048, 0.0058, u_segs=4)

    bow_loop = [
        (0.026, -0.198 + math.sin(a) * 0.023, 0.284 + math.cos(a) * 0.038)
        for a in [k * math.pi * 2.0 / 10 for k in range(10)]
    ]
    add_closed_loop_tube(brass_part, bow_loop, 0.0052, 0.0062, u_segs=4)

    brass_part.add_tube(
        [(0.025, -0.152, 0.305), (0.032, -0.160, 0.324), (0.036, -0.168, 0.342)],
        0.0068, 0.0082, u_segs=5, samples_per_seg=1, scale_xy=(0.55, 1.35),
    )
    brass_part.add_tube(
        [(0.027, -0.194, 0.320), (0.034, -0.180, 0.332), (0.040, -0.168, 0.342)],
        0.0072, 0.0085, u_segs=5, samples_per_seg=1, scale_xy=(0.55, 1.40),
    )

    lower_blade_pts = [
        (0.036, -0.164, 0.330),
        (0.042, -0.172, 0.365),
        (0.056, -0.186, 0.425),
        (0.070, -0.198, 0.482),
    ]
    add_oriented_ribbon(
        brass_part,
        lower_blade_pts,
        width=lambda t: (0.024 * (1.0 - 0.84 * (t ** 1.15))),
        thickness=lambda t: 0.0046 * (1.0 - 0.55 * t),
        normal_fn=lambda t, p: (0.96, 0.06, -0.26),
        samples_per_seg=2, u_segs=4,
    )

    upper_blade_pts = [
        (0.041, -0.172, 0.330),
        (0.048, -0.162, 0.365),
        (0.062, -0.144, 0.425),
        (0.076, -0.128, 0.480),
    ]
    add_oriented_ribbon(
        brass_part,
        upper_blade_pts,
        width=lambda t: (0.026 * (1.0 - 0.84 * (t ** 1.18))),
        thickness=lambda t: 0.0048 * (1.0 - 0.55 * t),
        normal_fn=lambda t, p: (0.96, -0.06, -0.26),
        samples_per_seg=2, u_segs=4,
    )

    steel_part.add_tube(
        [(0.038, -0.168, 0.342), (0.069, -0.197, 0.478)],
        0.0018, 0.0009, u_segs=4, samples_per_seg=1,
    )
    steel_part.add_tube(
        [(0.040, -0.168, 0.342), (0.075, -0.130, 0.476)],
        0.0018, 0.0009, u_segs=4, samples_per_seg=1,
    )

    brass_part.add_faceted_prism(
        sides=8, r_top=0.0085, r_bot=0.0085, length=0.013,
        center=piv, rot_euler=(0.0, 0.0, math.pi * 0.5),
    )
    steel_part.add_faceted_prism(sides=4, r_top=0.002, r_bot=0.002, length=0.013, center=(piv[0] - 0.0068, piv[1], piv[2]), twist_offset=math.pi * 0.25)


def build_left_hand_cloth_and_pincushion(
    skin_part,
    cloth_part,
    shirt_part,
    pincushion_part,
    brass_part,
    pearl_part,
):
    """
    Left hand (x > 0 when facing +Z) cupped palm-up holding a folded cloth swatch
    and a tufted red velvet tomato pincushion with 5 dressmaker pins.
    """
    palm_spine = [
        (0.008, -0.190, 0.246),
        (-0.004, -0.192, 0.272),
        (-0.014, -0.190, 0.298),
    ]

    def cup_palm_sec(t, theta):
        w = 0.036 + 0.005 * math.sin(t * math.pi * 0.8)
        h = 0.018 + 0.003 * math.sin(t * math.pi)
        return (math.cos(theta) * w, math.sin(theta) * h)

    skin_part.add_loft(palm_spine, cup_palm_sec, u_segs=7, up_hint=(0.0, 1.0, 0.0))

    add_articulated_finger(
        skin_part,
        [
            (-0.022, -0.186, 0.258),
            (-0.042, -0.174, 0.272),
            (-0.048, -0.166, 0.290),
            (-0.042, -0.164, 0.304),
        ],
        r_base=0.0110, r_tip=0.0082, u_segs=4,
    )

    for f_idx, x_off in enumerate((-0.034, -0.014, 0.006, 0.024)):
        r_f = 0.0094 - abs(f_idx - 1) * 0.0006
        len_f = 0.044 - abs(f_idx - 1.3) * 0.004
        add_articulated_finger(
            skin_part,
            [
                (x_off, -0.190, 0.298),
                (x_off - 0.003, -0.188, 0.298 + len_f * 0.45),
                (x_off - 0.005, -0.178, 0.298 + len_f * 0.82),
                (x_off - 0.006, -0.166, 0.298 + len_f * 0.98),
            ],
            r_base=r_f, r_tip=r_f * 0.74, u_segs=4,
        )

    swatch_layers = [
        (cloth_part, -0.174, 0.095, 0.110),
        (shirt_part, -0.165, 0.088, 0.100),
        (cloth_part, -0.156, 0.082, 0.092),
    ]
    for layer_part, ly, lw, ld in swatch_layers:
        fold_pts = [
            (-0.010 - lw * 0.5, ly - 0.006, 0.292),
            (-0.010 - lw * 0.22, ly + 0.002, 0.292),
            (-0.010 + lw * 0.22, ly + 0.002, 0.292),
            (-0.010 + lw * 0.5, ly - 0.008, 0.292),
        ]
        add_oriented_ribbon(
            layer_part, fold_pts,
            width=ld, thickness=0.009,
            normal_fn=lambda t, p: (0.0, 1.0, 0.08),
            samples_per_seg=1, u_segs=4,
        )

    pin_c = (-0.008, -0.130, 0.292)

    def tomato_deform(x, y, z, frac, theta):
        lobe = 1.0 + 0.085 * abs(math.cos(theta * 3.0))
        pole_dist = min(frac, 1.0 - frac)
        dimple = 1.0 - 0.22 * math.exp(-((pole_dist / 0.16) ** 2))
        return (x * lobe, y * dimple, z * lobe)

    pincushion_part.add_ellipsoid(
        center=pin_c,
        radii=(0.036, 0.024, 0.036),
        u_segs=10, v_segs=5,
        deform_fn=tomato_deform,
    )
    brass_part.add_ellipsoid(center=(pin_c[0], pin_c[1] + 0.019, pin_c[2]), radii=(0.006, 0.003, 0.006), u_segs=5, v_segs=3)

    pin_specs = [
        ((-0.014, 0.016, 0.010), (-0.030, 0.048, 0.024), pearl_part),
        ((0.014, 0.016, 0.008), (0.032, 0.046, 0.020), brass_part),
        ((0.0, 0.018, -0.012), (0.002, 0.050, -0.028), pearl_part),
        ((-0.010, 0.017, -0.010), (-0.024, 0.045, -0.022), brass_part),
        ((0.010, 0.017, 0.012), (0.022, 0.047, 0.028), pearl_part),
    ]
    for p_base_off, p_tip_off, head_part in pin_specs:
        p0 = v_add(pin_c, p_base_off)
        p1 = v_add(pin_c, p_tip_off)
        brass_part.add_tube([p0, p1], 0.0013, 0.0011, u_segs=4, samples_per_seg=1)
        head_part.add_ellipsoid(center=p1, radii=(0.0042, 0.0042, 0.0042), u_segs=5, v_segs=3)


# ---------------------------------------------------------------------------
# 4. Expressive Sculpted Face (+Z), Handlebar Mustache & Curved Stetson Hat
# ---------------------------------------------------------------------------

def build_head_mustache_and_stetson(
    skin_part,
    lip_part,
    sclera_part,
    iris_part,
    pupil_part,
    hair_part,
    hat_part,
    band_part,
    brass_part,
):
    """
    Sculpts the friendly Tailor's head in local coordinates relative to Head pivot (0.0, 1.455, 0.008).
    """
    # 4a. Anatomical Neck
    neck_spine = [(0.0, -0.055, -0.002), (0.0, 0.010, 0.002), (0.0, 0.075, 0.004)]

    def neck_sec(t, theta):
        rx = 0.066 - 0.006 * t
        rz = 0.068 - 0.005 * t
        if math.sin(theta) > 0.6:
            rz += 0.004 * math.sin(t * math.pi) * (math.sin(theta) ** 3)
        return (math.cos(theta) * rx, math.sin(theta) * rz)

    skin_part.add_loft(neck_spine, neck_sec, u_segs=9, up_hint=(0.0, 0.0, 1.0))

    # 4b. Continuous Parametric Anatomical Head Mesh (facing +Z!)
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

            x = sp * ct * 0.118
            y = cp * 0.146
            z = sp * st * 0.134

            if cp < 0.05:
                jaw_f = min(1.0, (0.05 - cp) / 0.95)
                x *= 1.0 - 0.24 * (jaw_f ** 1.25)
                if st < 0.0:
                    z *= 1.0 - 0.22 * (jaw_f ** 1.3)

            if st > 0.0:
                chin = math.exp(-((cp + 0.76) / 0.22) ** 2) * (st ** 3.0)
                z += 0.018 * chin
                y -= 0.006 * chin

                cheek = (
                    math.exp(-((cp + 0.06) / 0.24) ** 2)
                    * math.exp(-((abs(ct) - 0.56) / 0.24) ** 2)
                    * (st ** 0.8)
                )
                x += math.copysign(0.012 * cheek, ct)
                z += 0.013 * cheek

                brow = math.exp(-((cp - 0.31) / 0.13) ** 2) * (st ** 2.2) * (1.0 - 0.35 * (ct ** 2))
                z += 0.012 * brow

                socket = (
                    math.exp(-((cp - 0.14) / 0.14) ** 2)
                    * math.exp(-((abs(ct) - 0.37) / 0.16) ** 2)
                    * (st ** 1.5)
                )
                z -= 0.018 * socket

            ring.append((x, 0.135 + y, 0.012 + z))
        head_rings.append(ring)

    skin_part.add_smooth_grid(head_rings, closed_u=True, ensure_outward=True)
    skin_part.add_cap_ring(head_rings[0], (0.0, -1.0, 0.0))
    skin_part.add_cap_ring(head_rings[-1], (0.0, 1.0, 0.0))

    # 4c. Sculpted Nose Bridge, Rounded Tip, Nostril Wings & Recessed Nostrils (+Z)
    nose_spine = catmull_rom_chain([
        (0.0, 0.162, 0.132),
        (0.0, 0.138, 0.154),
        (0.0, 0.114, 0.172),
        (0.0, 0.104, 0.152),
    ], samples_per_seg=2)

    def nose_sec(t, theta):
        w = 0.013 + 0.008 * math.sin(t * math.pi * 0.82)
        d = 0.012 + 0.009 * math.sin(t * math.pi * 0.78)
        return (math.cos(theta) * w, math.sin(theta) * d)

    skin_part.add_loft(nose_spine, nose_sec, u_segs=7, up_hint=(0.0, 0.0, 1.0))
    for sgn in (-1, 1):
        skin_part.add_ellipsoid(
            center=(sgn * 0.0155, 0.109, 0.154),
            radii=(0.0105, 0.0085, 0.0120),
            u_segs=6, v_segs=3,
        )
        pupil_part.add_ellipsoid(
            center=(sgn * 0.0115, 0.103, 0.157),
            radii=(0.0048, 0.0028, 0.0062),
            u_segs=5, v_segs=3,
        )

    # Warm smiling lower lip peeking under handlebar mustache
    lip_pts = [
        (-0.026, 0.068, 0.132),
        (0.0, 0.062, 0.144),
        (0.026, 0.068, 0.132),
    ]
    lip_part.add_tube(lip_pts, 0.0055, 0.0055, u_segs=5, samples_per_seg=2, scale_xy=(1.1, 0.75))

    # 4d. Sculpted Ears (C-curved helix rim, earlobe & inner concha)
    for sgn in (-1, 1):
        ear_x = sgn * 0.118
        skin_part.add_ellipsoid(
            center=(ear_x, 0.132, 0.006),
            radii=(0.011, 0.030, 0.020),
            u_segs=6, v_segs=4,
            rot_euler=(-0.12, sgn * -0.28, sgn * -0.08),
        )
        helix_pts = [
            (ear_x + sgn * 0.004, 0.148, 0.016),
            (ear_x + sgn * 0.012, 0.158, 0.004),
            (ear_x + sgn * 0.014, 0.136, -0.012),
            (ear_x + sgn * 0.010, 0.110, -0.006),
            (ear_x + sgn * 0.005, 0.105, 0.008),
        ]
        skin_part.add_tube(helix_pts, 0.0058, 0.0052, u_segs=4, samples_per_seg=1)

    # 4e. Expressive Multi-Part Eyes (Sclera, Iris, Dark Pupil & Eyelids) + Brows
    for sgn in (-1, 1):
        ex, ey, ez = sgn * 0.044, 0.153, 0.129
        sclera_part.add_ellipsoid(
            center=(ex, ey, ez),
            radii=(0.0175, 0.0140, 0.0140),
            u_segs=6, v_segs=4,
        )
        iris_part.add_ellipsoid(
            center=(ex, ey, ez + 0.0098),
            radii=(0.0092, 0.0092, 0.0055),
            u_segs=6, v_segs=3,
        )
        pupil_part.add_ellipsoid(
            center=(ex, ey, ez + 0.0132),
            radii=(0.0050, 0.0050, 0.0038),
            u_segs=5, v_segs=3,
        )
        up_lid = [
            (ex - sgn * 0.017, ey - 0.001, ez + 0.008),
            (ex, ey + 0.011, ez + 0.013),
            (ex + sgn * 0.017, ey - 0.002, ez + 0.005),
        ]
        skin_part.add_tube(up_lid, 0.0042, 0.0038, u_segs=4, samples_per_seg=2, scale_xy=(1.2, 0.8))
        low_lid = [
            (ex - sgn * 0.016, ey - 0.003, ez + 0.007),
            (ex, ey - 0.010, ez + 0.012),
            (ex + sgn * 0.016, ey - 0.004, ez + 0.005),
        ]
        skin_part.add_tube(low_lid, 0.0032, 0.0030, u_segs=4, samples_per_seg=2)

        brow_pts = [
            (sgn * 0.020, 0.178, 0.140),
            (sgn * 0.046, 0.188, 0.138),
            (sgn * 0.072, 0.176, 0.122),
        ]
        hair_part.add_tube(brow_pts, 0.0078, 0.0052, u_segs=5, samples_per_seg=2, scale_xy=(1.2, 0.78))

    # 4f. Rear/Nape Hair Fringe & Classic Tailor Sideburns under Stetson
    hair_cap_rings = []
    for v_idx, (hy, hr_x, hr_z) in enumerate((
        (0.082, 0.095, 0.105),
        (0.122, 0.116, 0.128),
        (0.168, 0.122, 0.136),
    )):
        ring = []
        steps_h = 10
        for u in range(steps_h + 1):
            ang = 0.15 - (u / steps_h) * (math.pi + 0.30)
            wave = 1.0 + 0.025 * math.cos(u * 2.2) * (1.0 if v_idx == 0 else 0.4)
            ring.append((math.cos(ang) * hr_x * wave, hy, 0.010 + math.sin(ang) * hr_z * wave))
        hair_cap_rings.append(ring)
    hair_part.add_smooth_grid(hair_cap_rings, closed_u=False, ensure_outward=False)

    for sgn in (-1, 1):
        sb_pts = [
            (sgn * 0.110, 0.185, 0.032),
            (sgn * 0.114, 0.148, 0.038),
            (sgn * 0.108, 0.108, 0.052),
        ]
        add_oriented_ribbon(
            hair_part, sb_pts,
            width=lambda t: 0.024 + 0.008 * t,
            thickness=0.010,
            normal_fn=lambda t, p, s=sgn: (s * 0.92, 0.0, 0.38),
            samples_per_seg=1, u_segs=4,
        )

    # 4g. Magnificent Waxed Curled Handlebar Mustache!
    for sgn in (-1, 1):
        stache_ctrl = [
            (0.0, 0.090, 0.152),
            (sgn * 0.028, 0.086, 0.154),
            (sgn * 0.062, 0.074, 0.142),
            (sgn * 0.096, 0.076, 0.124),
            (sgn * 0.116, 0.096, 0.118),
            (sgn * 0.104, 0.112, 0.122),
        ]
        stache_spine = catmull_rom_chain(stache_ctrl, samples_per_seg=2)

        def stache_sec(t, theta):
            r = 0.0165 * (1.0 - 0.82 * (t ** 1.35)) + 0.0018
            strand = 1.0 + 0.08 * math.cos(theta * 5.0)
            return (math.cos(theta) * r * strand * 0.92, math.sin(theta) * r * strand * 1.12)

        hair_part.add_loft(stache_spine, stache_sec, u_segs=6, up_hint=(0.0, 1.0, 0.0))

    # 4h. Dapper Brown Curved Stetson Cowboy Hat (y_max = 1.781m!)
    hat_cx, hat_cy, hat_cz = 0.0, 0.197, 0.006
    hat_tilt = (-0.085, 0.0, 0.025)
    hat_scale = 0.90

    hat_profile = [
        (0.002, 0.085),
        (0.146, 0.004),
        (0.172, -0.002),
        (0.268, -0.010),
        (0.354, 0.008),
        (0.358, 0.022),
        (0.272, 0.004),
        (0.180, 0.014),
        (0.172, 0.048),
        (0.158, 0.112),
        (0.124, 0.132),
        (0.062, 0.112),
        (0.002, 0.116),
    ]

    def stetson_plus_z_deform(x, y, z, ang):
        r = math.hypot(x, z)
        zz = z * 1.13
        xx = x * 0.94
        yy = y
        front_z = zz
        if r > 0.182:
            side_f = abs(xx) / 0.335
            yy += (side_f * side_f) * 0.076
            if front_z > 0.14:
                yy -= 0.015 * ((front_z - 0.14) / 0.22)
        elif yy > 0.065 and front_z > 0.0:
            pinch = max(0.0, min(1.0, front_z / 0.17)) * ((yy - 0.065) / 0.07)
            xx *= 1.0 - pinch * 0.26
        return (xx * hat_scale, yy * hat_scale, zz * hat_scale)

    hat_part.add_lathe(
        hat_profile,
        u_segs=16,
        translate=(hat_cx, hat_cy, hat_cz),
        rot_euler=hat_tilt,
        deform_fn=stetson_plus_z_deform,
    )

    band_loop = [
        (
            math.cos(a) * 0.175 * 0.95 * hat_scale,
            0.025 * hat_scale,
            math.sin(a) * 0.175 * 1.13 * hat_scale,
        )
        for a in [k * math.pi * 2.0 / 16 for k in range(16)]
    ]
    add_closed_loop_tube(
        band_part, band_loop,
        0.008 * hat_scale, 0.015 * hat_scale,
        u_segs=4, translate=(hat_cx, hat_cy, hat_cz), rot_euler=hat_tilt,
    )
    brass_part.add_beveled_box(
        hat_cx - 0.165 * hat_scale,
        hat_cy + 0.026 * hat_scale,
        hat_cz + 0.042 * hat_scale,
        0.011 * hat_scale,
        0.030 * hat_scale,
        0.032 * hat_scale,
        bevel=0.002,
        rot_euler=hat_tilt,
    )


# ---------------------------------------------------------------------------
# Public Entry Point: build_tailor_npc_glb(out_path)
# ---------------------------------------------------------------------------

def build_tailor_npc_glb(out_path):
    b = GLBBuilder()

    mat_pants = b.add_material("TailorWoolTrousers", (0.17, 0.14, 0.12), metallic=0.02, roughness=0.86)
    mat_boot = b.add_material("TailorDressBoots", (0.11, 0.065, 0.042), metallic=0.08, roughness=0.38)
    mat_sole = b.add_material("TailorBootSole", (0.06, 0.038, 0.026), metallic=0.02, roughness=0.72)
    mat_belt = b.add_material("TailorBeltLeather", (0.14, 0.08, 0.05), metallic=0.06, roughness=0.46)
    mat_shirt = b.add_material("TailorCreamShirt", (0.95, 0.91, 0.83), metallic=0.01, roughness=0.82)
    mat_vest = b.add_material("TailorBrocadeVest", (0.50, 0.095, 0.145), metallic=0.07, roughness=0.56)
    mat_lapel = b.add_material("TailorVestLapel", (0.58, 0.12, 0.18), metallic=0.08, roughness=0.48)
    mat_satin = b.add_material("TailorVestSatinBack", (0.22, 0.07, 0.09), metallic=0.06, roughness=0.44)
    mat_cravat = b.add_material("TailorSilkCravat", (0.12, 0.27, 0.46), metallic=0.06, roughness=0.38)
    mat_skin = b.add_material("TailorSkin", (0.86, 0.65, 0.50), metallic=0.01, roughness=0.68)
    mat_lip = b.add_material("TailorLip", (0.72, 0.46, 0.38), metallic=0.02, roughness=0.58)
    mat_hair = b.add_material("TailorHair", (0.24, 0.13, 0.07), metallic=0.03, roughness=0.78)
    mat_hat = b.add_material("TailorStetson", (0.34, 0.19, 0.10), metallic=0.02, roughness=0.76)
    mat_tape = b.add_material("MeasuringTape", (0.95, 0.81, 0.28), metallic=0.02, roughness=0.50)
    mat_tick = b.add_material("TapeTickDark", (0.16, 0.12, 0.06), metallic=0.02, roughness=0.68)
    mat_brass = b.add_material("PolishedBrass", (0.91, 0.73, 0.35), metallic=0.92, roughness=0.19)
    mat_steel = b.add_material("ShearEdgeSteel", (0.86, 0.88, 0.90), metallic=0.94, roughness=0.16)
    mat_pincushion = b.add_material("RedPincushion", (0.74, 0.09, 0.13), metallic=0.02, roughness=0.74)
    mat_pearl = b.add_material("PearlPin", (0.96, 0.94, 0.90), metallic=0.08, roughness=0.18)
    mat_sclera = b.add_material("EyeSclera", (0.97, 0.96, 0.94), metallic=0.01, roughness=0.22)
    mat_iris = b.add_material("EyeIris", (0.24, 0.40, 0.52), metallic=0.02, roughness=0.18)
    mat_pupil = b.add_material("EyePupil", (0.04, 0.04, 0.05), metallic=0.04, roughness=0.08)

    root = b.add_node("TailorNPCRoot")

    body_parts, body_gp = b.create_parts_dict()
    build_boots_and_trousers(
        boot_part=body_gp(mat_boot),
        sole_part=body_gp(mat_sole),
        pants_part=body_gp(mat_pants),
        belt_part=body_gp(mat_belt),
        brass_part=body_gp(mat_brass),
    )
    build_torso_vest_cravat_and_tape(
        vest_part=body_gp(mat_vest),
        lapel_part=body_gp(mat_lapel),
        satin_back_part=body_gp(mat_satin),
        shirt_part=body_gp(mat_shirt),
        cravat_part=body_gp(mat_cravat),
        tape_part=body_gp(mat_tape),
        tick_part=body_gp(mat_tick),
        brass_part=body_gp(mat_brass),
        pearl_part=body_gp(mat_pearl),
    )
    body_mesh = b.add_mesh_from_parts("TailorBodyMesh", body_parts.values())
    b.add_node("TailorBody", mesh_idx=body_mesh, parent_idx=root)

    ra_parts, ra_gp = b.create_parts_dict()
    build_arm_mesh(ra_gp(mat_shirt), ra_gp(mat_skin), sgn=-1)
    build_right_hand_and_shears(ra_gp(mat_skin), ra_gp(mat_brass), ra_gp(mat_steel))
    ra_mesh = b.add_mesh_from_parts("TailorRightArmMesh", ra_parts.values())
    ra_node = b.add_node("RightArm", translation=(-0.205, 1.345, 0.008), mesh_idx=ra_mesh, parent_idx=root)

    la_parts, la_gp = b.create_parts_dict()
    build_arm_mesh(la_gp(mat_shirt), la_gp(mat_skin), sgn=1)
    build_left_hand_cloth_and_pincushion(
        skin_part=la_gp(mat_skin),
        cloth_part=la_gp(mat_cravat),
        shirt_part=la_gp(mat_shirt),
        pincushion_part=la_gp(mat_pincushion),
        brass_part=la_gp(mat_brass),
        pearl_part=la_gp(mat_pearl),
    )
    la_mesh = b.add_mesh_from_parts("TailorLeftArmMesh", la_parts.values())
    la_node = b.add_node("LeftArm", translation=(0.205, 1.345, 0.008), mesh_idx=la_mesh, parent_idx=root)

    hd_parts, hd_gp = b.create_parts_dict()
    build_head_mustache_and_stetson(
        skin_part=hd_gp(mat_skin),
        lip_part=hd_gp(mat_lip),
        sclera_part=hd_gp(mat_sclera),
        iris_part=hd_gp(mat_iris),
        pupil_part=hd_gp(mat_pupil),
        hair_part=hd_gp(mat_hair),
        hat_part=hd_gp(mat_hat),
        band_part=hd_gp(mat_cravat),
        brass_part=hd_gp(mat_brass),
    )
    hd_mesh = b.add_mesh_from_parts("TailorHeadMesh", hd_parts.values())
    hd_node = b.add_node("Head", translation=(0.0, 1.455, 0.008), mesh_idx=hd_mesh, parent_idx=root)

    b.add_animation("Idle", [
        {
            "node": hd_node,
            "path": "rotation",
            "times": [0.0, 1.4, 2.8],
            "values": [
                quat_from_euler_xyz(0.0, 0.0, 0.0),
                quat_from_euler_xyz(0.028, -0.045, 0.012),
                quat_from_euler_xyz(0.0, 0.0, 0.0),
            ],
        },
        {
            "node": ra_node,
            "path": "rotation",
            "times": [0.0, 1.4, 2.8],
            "values": [
                quat_from_euler_xyz(0.0, 0.0, 0.0),
                quat_from_euler_xyz(-0.022, 0.018, 0.0),
                quat_from_euler_xyz(0.0, 0.0, 0.0),
            ],
        },
        {
            "node": la_node,
            "path": "rotation",
            "times": [0.0, 1.4, 2.8],
            "values": [
                quat_from_euler_xyz(0.0, 0.0, 0.0),
                quat_from_euler_xyz(-0.016, -0.015, 0.0),
                quat_from_euler_xyz(0.0, 0.0, 0.0),
            ],
        },
    ])

    return b.export_glb(out_path)


if __name__ == "__main__":
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    target_glb = os.path.join(project_root, "assets", "tailor_npc.glb")
    stats = build_tailor_npc_glb(target_glb)
    print(
        f"[build_tailor_npc] Wrote {stats['filepath']} | "
        f"{stats['bytes']:,} bytes | {stats['vertices']:,} verts | "
        f"{stats['triangles']:,} tris | {stats['nodes']} nodes | {stats['animations']} anims"
    )
