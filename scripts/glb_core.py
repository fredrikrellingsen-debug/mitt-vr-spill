#!/usr/bin/env python3
"""
Pure-Python glTF 2.0 binary (.glb) geometry & animation builder.
Generates smooth-shaded organic meshes, beveled hard-surface parts, PBR materials,
hierarchical nodes, and quaternion/translation keyframe animations with zero external dependencies.
"""

import json
import math
import os
import struct


# ---------------------------------------------------------------------------
# Vector & Quaternion Math
# ---------------------------------------------------------------------------

def v_add(a, b):
    return (a[0] + b[0], a[1] + b[1], a[2] + b[2])


def v_sub(a, b):
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def v_mul(a, s):
    return (a[0] * s, a[1] * s, a[2] * s)


def v_dot(a, b):
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


def v_cross(a, b):
    return (
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    )


def v_len(a):
    return math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2])


def v_norm(a, fallback=(0.0, 1.0, 0.0)):
    l = v_len(a)
    if l < 1e-9:
        return fallback
    inv = 1.0 / l
    return (a[0] * inv, a[1] * inv, a[2] * inv)


def v_lerp(a, b, t):
    return (
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t,
    )


def quat_mul(q1, q2):
    x1, y1, z1, w1 = q1
    x2, y2, z2, w2 = q2
    return (
        w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2,
        w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2,
        w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2,
        w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2,
    )


def quat_from_axis_angle(axis, angle_rad):
    ax = v_norm(axis)
    half = angle_rad * 0.5
    s = math.sin(half)
    return (ax[0] * s, ax[1] * s, ax[2] * s, math.cos(half))


def quat_from_euler_xyz(rx, ry, rz):
    """Three.js default XYZ intrinsic Euler order -> glTF unit quaternion (x, y, z, w)."""
    qx = quat_from_axis_angle((1.0, 0.0, 0.0), rx)
    qy = quat_from_axis_angle((0.0, 1.0, 0.0), ry)
    qz = quat_from_axis_angle((0.0, 0.0, 1.0), rz)
    q = quat_mul(quat_mul(qx, qy), qz)
    l = math.sqrt(sum(c * c for c in q))
    return tuple(c / l for c in q)


def quat_rotate_vec(q, v):
    qx, qy, qz, qw = q
    uv = v_cross((qx, qy, qz), v)
    uuv = v_cross((qx, qy, qz), uv)
    return v_add(v, v_add(v_mul(uv, 2.0 * qw), v_mul(uuv, 2.0)))


def rotate_vec_between(u, v, vec):
    """Minimal rotation mapping unit vector u -> unit vector v, applied to vec."""
    u = v_norm(u)
    v = v_norm(v)
    d = max(-1.0, min(1.0, v_dot(u, v)))
    if d > 0.999999:
        return vec
    if d < -0.999999:
        ortho = (1.0, 0.0, 0.0) if abs(u[0]) < 0.8 else (0.0, 1.0, 0.0)
        axis = v_norm(v_cross(u, ortho))
        q = quat_from_axis_angle(axis, math.pi)
        return quat_rotate_vec(q, vec)
    axis = v_norm(v_cross(u, v))
    angle = math.acos(d)
    q = quat_from_axis_angle(axis, angle)
    return quat_rotate_vec(q, vec)


def catmull_rom_chain(ctrl_pts, samples_per_seg=8):
    """Evaluates a smooth 3D Catmull-Rom spline through ctrl_pts."""
    n = len(ctrl_pts)
    if n < 2:
        return list(ctrl_pts)
    if n == 2:
        return [v_lerp(ctrl_pts[0], ctrl_pts[1], i / samples_per_seg) for i in range(samples_per_seg + 1)]

    ext = [v_sub(v_mul(ctrl_pts[0], 2.0), ctrl_pts[1])] + list(ctrl_pts) + [
        v_sub(v_mul(ctrl_pts[-1], 2.0), ctrl_pts[-2])
    ]
    out = []
    for seg in range(n - 1):
        p0, p1, p2, p3 = ext[seg], ext[seg + 1], ext[seg + 2], ext[seg + 3]
        steps = samples_per_seg
        for s in range(steps):
            t = s / steps
            t2 = t * t
            t3 = t2 * t
            x = 0.5 * (
                (2.0 * p1[0])
                + (-p0[0] + p2[0]) * t
                + (2.0 * p0[0] - 5.0 * p1[0] + 4.0 * p2[0] - p3[0]) * t2
                + (-p0[0] + 3.0 * p1[0] - 3.0 * p2[0] + p3[0]) * t3
            )
            y = 0.5 * (
                (2.0 * p1[1])
                + (-p0[1] + p2[1]) * t
                + (2.0 * p0[1] - 5.0 * p1[1] + 4.0 * p2[1] - p3[1]) * t2
                + (-p0[1] + 3.0 * p1[1] - 3.0 * p2[1] + p3[1]) * t3
            )
            z = 0.5 * (
                (2.0 * p1[2])
                + (-p0[2] + p2[2]) * t
                + (2.0 * p0[2] - 5.0 * p1[2] + 4.0 * p2[2] - p3[2]) * t2
                + (-p0[2] + 3.0 * p1[2] - 3.0 * p2[2] + p3[2]) * t3
            )
            out.append((x, y, z))
    out.append(ctrl_pts[-1])
    return out


# ---------------------------------------------------------------------------
# Mesh Primitive Builder (Positions, Smooth/Faceted Normals, UVs, Indices)
# ---------------------------------------------------------------------------

class MeshPart:
    """Accumulates triangles for a single PBR material slot."""

    def __init__(self, material_idx):
        self.material_idx = material_idx
        self.positions = []   # list of (x, y, z)
        self.normals = []     # list of (nx, ny, nz)
        self.uvs = []         # list of (u, v)
        self.indices = []     # flat list of int (multiples of 3, CCW)

    def _transform_point(self, p, translate, q_rot, scale):
        sp = (p[0] * scale[0], p[1] * scale[1], p[2] * scale[2])
        rp = quat_rotate_vec(q_rot, sp) if q_rot is not None else sp
        return v_add(rp, translate) if translate is not None else rp

    def _transform_normal(self, n, q_rot, scale):
        # Inverse-transpose for non-uniform scale
        sn = (
            n[0] / (scale[0] if abs(scale[0]) > 1e-6 else 1.0),
            n[1] / (scale[1] if abs(scale[1]) > 1e-6 else 1.0),
            n[2] / (scale[2] if abs(scale[2]) > 1e-6 else 1.0),
        )
        rn = quat_rotate_vec(q_rot, sn) if q_rot is not None else sn
        return v_norm(rn)

    def add_flat_tri(self, p0, p1, p2, uv0=(0.0, 0.0), uv1=(1.0, 0.0), uv2=(0.5, 1.0)):
        n = v_norm(v_cross(v_sub(p1, p0), v_sub(p2, p0)))
        base = len(self.positions)
        self.positions.extend([p0, p1, p2])
        self.normals.extend([n, n, n])
        self.uvs.extend([uv0, uv1, uv2])
        self.indices.extend([base, base + 1, base + 2])

    def add_flat_quad(self, p0, p1, p2, p3, uvs=None):
        """CCW quad (p0 -> p1 -> p2 -> p3) with crisp faceted face normal."""
        n = v_norm(v_cross(v_sub(p1, p0), v_sub(p2, p0)))
        if v_len(v_cross(v_sub(p1, p0), v_sub(p2, p0))) < 1e-11:
            n = v_norm(v_cross(v_sub(p2, p0), v_sub(p3, p0)))
        if uvs is None:
            w = v_len(v_sub(p1, p0))
            h = v_len(v_sub(p3, p0))
            uvs = [(0.0, 0.0), (w, 0.0), (w, h), (0.0, h)]
        base = len(self.positions)
        self.positions.extend([p0, p1, p2, p3])
        self.normals.extend([n, n, n, n])
        self.uvs.extend(uvs)
        self.indices.extend([base, base + 1, base + 2, base, base + 2, base + 3])

    def add_smooth_grid(
        self,
        rings,
        closed_u=True,
        uv_u_scale=1.0,
        uv_v_scale=1.0,
        translate=(0.0, 0.0, 0.0),
        rot_euler=(0.0, 0.0, 0.0),
        scale=(1.0, 1.0, 1.0),
        ensure_outward=True,
        flip=False,
    ):
        """
        Builds a smooth-shaded surface from rings[v][u] (v = 0..V-1, u = 0..U-1).
        When closed_u=True, ring[v] has U unique points around the loop and we add a seam column U
        sharing smooth normals with u=0 so UVs wrap cleanly without normal seams!
        """
        v_count = len(rings)
        if v_count < 2:
            return
        u_unique = len(rings[0])
        if u_unique < 3 and closed_u:
            return

        q_rot = quat_from_euler_xyz(*rot_euler) if any(abs(a) > 1e-9 for a in rot_euler) else None

        # Transform all unique points first
        t_rings = []
        for ring in rings:
            t_rings.append([self._transform_point(p, translate, q_rot, scale) for p in ring])

        # Automatically verify outward winding against ring centroids if requested
        do_flip = flip
        if ensure_outward and closed_u:
            outward_score = 0.0
            for v in range(v_count - 1):
                cx = sum(p[0] for p in t_rings[v]) / u_unique
                cy = sum(p[1] for p in t_rings[v]) / u_unique
                cz = sum(p[2] for p in t_rings[v]) / u_unique
                cx2 = sum(p[0] for p in t_rings[v + 1]) / u_unique
                cy2 = sum(p[1] for p in t_rings[v + 1]) / u_unique
                cz2 = sum(p[2] for p in t_rings[v + 1]) / u_unique
                mid_c = ((cx + cx2) * 0.5, (cy + cy2) * 0.5, (cz + cz2) * 0.5)
                for u in range(u_unique):
                    un = (u + 1) % u_unique
                    p00 = t_rings[v][u]
                    p10 = t_rings[v][un]
                    p11 = t_rings[v + 1][un]
                    fn = v_cross(v_sub(p10, p00), v_sub(p11, p00))
                    tri_mid = (
                        (p00[0] + p10[0] + p11[0]) / 3.0,
                        (p00[1] + p10[1] + p11[1]) / 3.0,
                        (p00[2] + p10[2] + p11[2]) / 3.0,
                    )
                    outward_score += v_dot(fn, v_sub(tri_mid, mid_c))
            if outward_score < 0.0:
                do_flip = not flip

        # Accumulate smooth area-weighted normals on unique (v, u) vertices
        unique_normals = [[(0.0, 0.0, 0.0) for _ in range(u_unique)] for _ in range(v_count)]
        u_quads = u_unique if closed_u else (u_unique - 1)

        for v in range(v_count - 1):
            for u in range(u_quads):
                u1 = (u + 1) % u_unique if closed_u else (u + 1)
                p00 = t_rings[v][u]
                p10 = t_rings[v][u1]
                p01 = t_rings[v + 1][u]
                p11 = t_rings[v + 1][u1]

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

        for v in range(v_count):
            for u in range(u_unique):
                unique_normals[v][u] = v_norm(unique_normals[v][u])

        # Emit vertices (including seam column u = u_unique when closed_u=True)
        cols = (u_unique + 1) if closed_u else u_unique
        base_idx = len(self.positions)

        # Cumulative arc-length along v for clean UV mapping
        v_arc = [0.0]
        for v in range(1, v_count):
            d = v_len(v_sub(t_rings[v][0], t_rings[v - 1][0]))
            v_arc.append(v_arc[-1] + d)
        total_v = v_arc[-1] if v_arc[-1] > 1e-6 else 1.0

        for v in range(v_count):
            vv = (v_arc[v] / total_v) * uv_v_scale
            for col in range(cols):
                u_idx = col % u_unique
                uu = (col / (u_unique if closed_u else max(1, u_unique - 1))) * uv_u_scale
                self.positions.append(t_rings[v][u_idx])
                self.normals.append(unique_normals[v][u_idx])
                self.uvs.append((uu, vv))

        for v in range(v_count - 1):
            for u in range(u_quads):
                i00 = base_idx + v * cols + u
                i10 = base_idx + v * cols + (u + 1)
                i01 = base_idx + (v + 1) * cols + u
                i11 = base_idx + (v + 1) * cols + (u + 1)
                if not do_flip:
                    self.indices.extend([i00, i10, i11, i00, i11, i01])
                else:
                    self.indices.extend([i00, i11, i10, i00, i01, i11])

    def add_cap_ring(self, ring_pts, outward_dir, uv_scale=1.0):
        """Caps a closed ring of 3D points with a flat fan whose normal faces outward_dir."""
        n_pts = len(ring_pts)
        if n_pts < 3:
            return
        cx = sum(p[0] for p in ring_pts) / n_pts
        cy = sum(p[1] for p in ring_pts) / n_pts
        cz = sum(p[2] for p in ring_pts) / n_pts
        center = (cx, cy, cz)

        test_n = v_cross(v_sub(ring_pts[1], center), v_sub(ring_pts[2], center))
        flip = v_dot(test_n, outward_dir) < 0.0
        n = v_norm(outward_dir)

        # Orthonormal 2D basis for planar cap UVs
        ref = (1.0, 0.0, 0.0) if abs(n[0]) < 0.8 else (0.0, 1.0, 0.0)
        u_ax = v_norm(v_cross(ref, n))
        v_ax = v_norm(v_cross(n, u_ax))

        base = len(self.positions)
        self.positions.append(center)
        self.normals.append(n)
        self.uvs.append((0.5, 0.5))

        for p in ring_pts:
            rel = v_sub(p, center)
            self.positions.append(p)
            self.normals.append(n)
            self.uvs.append((0.5 + v_dot(rel, u_ax) * uv_scale, 0.5 + v_dot(rel, v_ax) * uv_scale))

        for i in range(n_pts):
            i1 = base + 1 + i
            i2 = base + 1 + ((i + 1) % n_pts)
            if not flip:
                self.indices.extend([base, i1, i2])
            else:
                self.indices.extend([base, i2, i1])

    def add_loft(
        self,
        spine_pts,
        section_fn,
        u_segs=20,
        cap_start=True,
        cap_end=True,
        uv_u_scale=1.0,
        uv_v_scale=1.0,
        translate=(0.0, 0.0, 0.0),
        rot_euler=(0.0, 0.0, 0.0),
        scale=(1.0, 1.0, 1.0),
        up_hint=(0.0, 1.0, 0.0),
    ):
        """
        Sweeps a custom 2D profile section_fn(t, theta) -> (x_right, y_up) along spine_pts
        using twist-free parallel-transport (Bishop) frames!
        """
        m = len(spine_pts)
        if m < 2:
            return

        # Compute unit tangents
        tangents = []
        for i in range(m):
            if i == 0:
                d = v_sub(spine_pts[1], spine_pts[0])
            elif i == m - 1:
                d = v_sub(spine_pts[-1], spine_pts[-2])
            else:
                d = v_sub(spine_pts[i + 1], spine_pts[i - 1])
            tangents.append(v_norm(d, (0.0, 0.0, -1.0)))

        # Initial frame
        t0 = tangents[0]
        up = up_hint
        if abs(v_dot(t0, up)) > 0.94:
            up = (0.0, 0.0, 1.0) if abs(t0[2]) < 0.8 else (1.0, 0.0, 0.0)
        right = v_norm(v_cross(up, t0))
        up_vec = v_norm(v_cross(t0, right))

        frames = [(right, up_vec)]
        for i in range(1, m):
            prev_r, prev_u = frames[-1]
            r_i = rotate_vec_between(tangents[i - 1], tangents[i], prev_r)
            # Re-orthogonalize cleanly
            r_i = v_norm(v_sub(r_i, v_mul(tangents[i], v_dot(r_i, tangents[i]))), prev_r)
            u_i = v_norm(v_cross(tangents[i], r_i))
            frames.append((r_i, u_i))

        rings = []
        for i, center in enumerate(spine_pts):
            t_param = i / (m - 1)
            r_ax, u_ax = frames[i]
            ring = []
            for u in range(u_segs):
                theta = (u / u_segs) * math.pi * 2.0
                xr, yu = section_fn(t_param, theta)
                pt = v_add(center, v_add(v_mul(r_ax, xr), v_mul(u_ax, yu)))
                ring.append(pt)
            rings.append(ring)

        self.add_smooth_grid(
            rings,
            closed_u=True,
            uv_u_scale=uv_u_scale,
            uv_v_scale=uv_v_scale,
            translate=translate,
            rot_euler=rot_euler,
            scale=scale,
            ensure_outward=True,
        )

        q_rot = quat_from_euler_xyz(*rot_euler) if any(abs(a) > 1e-9 for a in rot_euler) else None
        if cap_start:
            t_ring0 = [self._transform_point(p, translate, q_rot, scale) for p in rings[0]]
            out_dir0 = self._transform_normal(v_mul(tangents[0], -1.0), q_rot, scale)
            self.add_cap_ring(t_ring0, out_dir0, uv_scale=uv_u_scale)
        if cap_end:
            t_ring_end = [self._transform_point(p, translate, q_rot, scale) for p in rings[-1]]
            out_dir_end = self._transform_normal(tangents[-1], q_rot, scale)
            self.add_cap_ring(t_ring_end, out_dir_end, uv_scale=uv_u_scale)

    def add_tube(
        self,
        ctrl_pts,
        r_start,
        r_end=None,
        u_segs=12,
        samples_per_seg=6,
        cap_start=True,
        cap_end=True,
        scale_xy=(1.0, 1.0),
        translate=(0.0, 0.0, 0.0),
        rot_euler=(0.0, 0.0, 0.0),
    ):
        if r_end is None:
            r_end = r_start
        spine = catmull_rom_chain(ctrl_pts, samples_per_seg=samples_per_seg)

        def sec(t, theta):
            r = r_start + (r_end - r_start) * t
            return (math.cos(theta) * r * scale_xy[0], math.sin(theta) * r * scale_xy[1])

        self.add_loft(
            spine,
            sec,
            u_segs=u_segs,
            cap_start=cap_start,
            cap_end=cap_end,
            translate=translate,
            rot_euler=rot_euler,
        )

    def add_ellipsoid(
        self,
        center=(0.0, 0.0, 0.0),
        radii=(0.2, 0.2, 0.2),
        u_segs=18,
        v_segs=12,
        rot_euler=(0.0, 0.0, 0.0),
        deform_fn=None,
    ):
        """Smooth UV-mapped ellipsoid (no polar triangle pinching at smooth normals)."""
        rings = []
        for v in range(v_segs + 1):
            # Avoid exact 0 / pi singularity by tiny epsilon so ring normals stay crisp
            frac = 0.015 + 0.97 * (v / v_segs)
            phi = frac * math.pi
            sin_p = math.sin(phi)
            cos_p = math.cos(phi)
            ring = []
            for u in range(u_segs):
                theta = (u / u_segs) * math.pi * 2.0
                x = sin_p * math.cos(theta) * radii[0]
                y = -cos_p * radii[1]
                z = sin_p * math.sin(theta) * radii[2]
                if deform_fn is not None:
                    x, y, z = deform_fn(x, y, z, frac, theta)
                ring.append((x, y, z))
            rings.append(ring)

        self.add_smooth_grid(
            rings,
            closed_u=True,
            translate=center,
            rot_euler=rot_euler,
            ensure_outward=True,
        )
        q_rot = quat_from_euler_xyz(*rot_euler) if any(abs(a) > 1e-9 for a in rot_euler) else None
        t0 = [self._transform_point(p, center, q_rot, (1.0, 1.0, 1.0)) for p in rings[0]]
        t1 = [self._transform_point(p, center, q_rot, (1.0, 1.0, 1.0)) for p in rings[-1]]
        self.add_cap_ring(t0, self._transform_normal((0.0, -1.0, 0.0), q_rot, (1, 1, 1)))
        self.add_cap_ring(t1, self._transform_normal((0.0, 1.0, 0.0), q_rot, (1, 1, 1)))

    def add_lathe(
        self,
        profile_ry,
        u_segs=24,
        phi_start=0.0,
        phi_len=math.pi * 2.0,
        translate=(0.0, 0.0, 0.0),
        rot_euler=(0.0, 0.0, 0.0),
        scale=(1.0, 1.0, 1.0),
        deform_fn=None,
        closed_u=None,
    ):
        """Revolves (r, y) profile around Y axis."""
        if closed_u is None:
            closed_u = abs(phi_len - math.pi * 2.0) < 1e-4
        rings = []
        steps = u_segs if closed_u else (u_segs + 1)
        for r, y in profile_ry:
            rr = max(0.0008, r)
            ring = []
            for u in range(steps):
                ang = phi_start + (u / u_segs) * phi_len
                x = math.cos(ang) * rr
                z = math.sin(ang) * rr
                yy = y
                if deform_fn is not None:
                    x, yy, z = deform_fn(x, yy, z, ang)
                ring.append((x, yy, z))
            rings.append(ring)

        self.add_smooth_grid(
            rings,
            closed_u=closed_u,
            translate=translate,
            rot_euler=rot_euler,
            scale=scale,
            ensure_outward=closed_u,
        )

    def add_beveled_box(
        self,
        cx,
        cy,
        cz,
        sx,
        sy,
        sz,
        bevel=0.012,
        rot_euler=(0.0, 0.0, 0.0),
        uv_scale=1.0,
    ):
        """
        26-face chamfered/beveled box (6 main faces + 12 beveled edges + 8 corner triangles).
        Produces crisp specular highlights along edges under PBR environment lighting!
        """
        hx, hy, hz = sx * 0.5, sy * 0.5, sz * 0.5
        b = min(bevel, hx * 0.42, hy * 0.42, hz * 0.42)
        q_rot = quat_from_euler_xyz(*rot_euler) if any(abs(a) > 1e-9 for a in rot_euler) else None

        def tp(x, y, z):
            return self._transform_point((x, y, z), (cx, cy, cz), q_rot, (1.0, 1.0, 1.0))

        if b < 1e-5:
            # Plain box fallback
            b = 0.0

        ix, iy, iz = hx - b, hy - b, hz - b

        # Helper to map corner (sx_sign, sy_sign, sz_sign) pushed out along one axis
        def c_face(axis, sgn, u_sgn, v_sgn):
            if axis == 'x':
                return tp(sgn * hx, u_sgn * iy, v_sgn * iz)
            if axis == 'y':
                return tp(u_sgn * ix, sgn * hy, v_sgn * iz)
            return tp(u_sgn * ix, v_sgn * iy, sgn * hz)

        # 6 Main faces (CCW viewed from outside)
        # +Z, -Z
        self.add_flat_quad(
            tp(-ix, -iy, hz), tp(ix, -iy, hz), tp(ix, iy, hz), tp(-ix, iy, hz),
            [(0, 0), (sx * uv_scale, 0), (sx * uv_scale, sy * uv_scale), (0, sy * uv_scale)],
        )
        self.add_flat_quad(
            tp(ix, -iy, -hz), tp(-ix, -iy, -hz), tp(-ix, iy, -hz), tp(ix, iy, -hz),
            [(0, 0), (sx * uv_scale, 0), (sx * uv_scale, sy * uv_scale), (0, sy * uv_scale)],
        )
        # +X, -X
        self.add_flat_quad(
            tp(hx, -iy, iz), tp(hx, -iy, -iz), tp(hx, iy, -iz), tp(hx, iy, iz),
            [(0, 0), (sz * uv_scale, 0), (sz * uv_scale, sy * uv_scale), (0, sy * uv_scale)],
        )
        self.add_flat_quad(
            tp(-hx, -iy, -iz), tp(-hx, -iy, iz), tp(-hx, iy, iz), tp(-hx, iy, -iz),
            [(0, 0), (sz * uv_scale, 0), (sz * uv_scale, sy * uv_scale), (0, sy * uv_scale)],
        )
        # +Y, -Y
        self.add_flat_quad(
            tp(-ix, hy, iz), tp(ix, hy, iz), tp(ix, hy, -iz), tp(-ix, hy, -iz),
            [(0, 0), (sx * uv_scale, 0), (sx * uv_scale, sz * uv_scale), (0, sz * uv_scale)],
        )
        self.add_flat_quad(
            tp(-ix, -hy, -iz), tp(ix, -hy, -iz), tp(ix, -hy, iz), tp(-ix, -hy, iz),
            [(0, 0), (sx * uv_scale, 0), (sx * uv_scale, sz * uv_scale), (0, sz * uv_scale)],
        )

        if b < 1e-5:
            return

        # 12 Edge bevel quads
        # Top 4 edges around +Y
        self.add_flat_quad(tp(-ix, iy, hz), tp(ix, iy, hz), tp(ix, hy, iz), tp(-ix, hy, iz))
        self.add_flat_quad(tp(ix, iy, -hz), tp(-ix, iy, -hz), tp(-ix, hy, -iz), tp(ix, hy, -iz))
        self.add_flat_quad(tp(hx, iy, iz), tp(hx, iy, -iz), tp(ix, hy, -iz), tp(ix, hy, iz))
        self.add_flat_quad(tp(-hx, iy, -iz), tp(-hx, iy, iz), tp(-ix, hy, iz), tp(-ix, hy, -iz))

        # Bottom 4 edges around -Y
        self.add_flat_quad(tp(-ix, -hy, iz), tp(ix, -hy, iz), tp(ix, -iy, hz), tp(-ix, -iy, hz))
        self.add_flat_quad(tp(ix, -hy, -iz), tp(-ix, -hy, -iz), tp(-ix, -iy, -hz), tp(ix, -iy, -hz))
        self.add_flat_quad(tp(ix, -hy, iz), tp(ix, -hy, -iz), tp(hx, -iy, -iz), tp(hx, -iy, iz))
        self.add_flat_quad(tp(-ix, -hy, -iz), tp(-ix, -hy, iz), tp(-hx, -iy, iz), tp(-hx, -iy, -iz))

        # Vertical 4 edges
        self.add_flat_quad(tp(ix, -iy, hz), tp(hx, -iy, iz), tp(hx, iy, iz), tp(ix, iy, hz))
        self.add_flat_quad(tp(hx, -iy, -iz), tp(ix, -iy, -hz), tp(ix, iy, -hz), tp(hx, iy, -iz))
        self.add_flat_quad(tp(-ix, -iy, -hz), tp(-hx, -iy, -iz), tp(-hx, iy, -iz), tp(-ix, iy, -hz))
        self.add_flat_quad(tp(-hx, -iy, iz), tp(-ix, -iy, hz), tp(-ix, iy, hz), tp(-hx, iy, iz))

        # 8 Corner triangles (verified outward normal via sign product)
        for sx_s in (-1, 1):
            for sy_s in (-1, 1):
                for sz_s in (-1, 1):
                    px = c_face('x', sx_s, sy_s, sz_s)
                    py = c_face('y', sy_s, sx_s, sz_s)
                    pz = c_face('z', sz_s, sx_s, sy_s)
                    out_hint = self._transform_normal((sx_s, sy_s, sz_s), q_rot, (1, 1, 1))
                    n_try = v_cross(v_sub(py, px), v_sub(pz, px))
                    if v_dot(n_try, out_hint) >= 0.0:
                        self.add_flat_tri(px, py, pz)
                    else:
                        self.add_flat_tri(px, pz, py)

    def add_faceted_prism(
        self,
        sides,
        r_top,
        r_bot,
        length,
        center=(0.0, 0.0, 0.0),
        rot_euler=(0.0, 0.0, 0.0),
        twist_offset=0.0,
        cap_top=True,
        cap_bot=True,
        uv_scale=1.0,
    ):
        """Hard-edged faceted prism (e.g. octagonal Colt barrel, hexagonal nuts, timbers)."""
        q_rot = quat_from_euler_xyz(*rot_euler) if any(abs(a) > 1e-9 for a in rot_euler) else None
        hy = length * 0.5
        bot_pts = []
        top_pts = []
        for s in range(sides):
            ang = twist_offset + (s / sides) * math.pi * 2.0
            ca, sa = math.cos(ang), math.sin(ang)
            bot_pts.append(self._transform_point((ca * r_bot, -hy, sa * r_bot), center, q_rot, (1, 1, 1)))
            top_pts.append(self._transform_point((ca * r_top, hy, sa * r_top), center, q_rot, (1, 1, 1)))

        c_world = self._transform_point((0.0, 0.0, 0.0), center, q_rot, (1, 1, 1))
        for s in range(sides):
            sn = (s + 1) % sides
            p0, p1, p2, p3 = bot_pts[s], bot_pts[sn], top_pts[sn], top_pts[s]
            fn = v_cross(v_sub(p1, p0), v_sub(p2, p0))
            mid = ((p0[0] + p2[0]) * 0.5, (p0[1] + p2[1]) * 0.5, (p0[2] + p2[2]) * 0.5)
            if v_dot(fn, v_sub(mid, c_world)) >= 0.0:
                self.add_flat_quad(p0, p1, p2, p3)
            else:
                self.add_flat_quad(p1, p0, p3, p2)

        if cap_bot:
            self.add_cap_ring(bot_pts, self._transform_normal((0.0, -1.0, 0.0), q_rot, (1, 1, 1)), uv_scale)
        if cap_top:
            self.add_cap_ring(top_pts, self._transform_normal((0.0, 1.0, 0.0), q_rot, (1, 1, 1)), uv_scale)

    def merge_vertices_and_smooth_normals(self, pos_quant=2000.0, uv_quant=1000.0):
        """
        Welds shared vertices (within 0.5mm position & 0.001 UV) and computes unified
        area-weighted smooth normals across all vertices sharing the same 3D position
        (even across UV seams), eliminating faceted shading and seam lines.
        """
        if not self.indices or not self.positions:
            return

        vert_map = {}
        new_pos = []
        new_uvs = []
        pos_keys = []
        remap = [0] * len(self.positions)

        has_uv = len(self.uvs) == len(self.positions)
        for i, p in enumerate(self.positions):
            pk = (int(round(p[0] * pos_quant)), int(round(p[1] * pos_quant)), int(round(p[2] * pos_quant)))
            uv = self.uvs[i] if has_uv else (0.0, 0.0)
            uk = (int(round(uv[0] * uv_quant)), int(round(uv[1] * uv_quant)))
            full_key = (pk, uk)
            idx = vert_map.get(full_key)
            if idx is None:
                idx = len(new_pos)
                vert_map[full_key] = idx
                new_pos.append(p)
                new_uvs.append(uv)
                pos_keys.append(pk)
            remap[i] = idx

        new_indices = []
        for t in range(0, len(self.indices) - 2, 3):
            i0 = remap[self.indices[t]]
            i1 = remap[self.indices[t + 1]]
            i2 = remap[self.indices[t + 2]]
            if i0 == i1 or i1 == i2 or i2 == i0:
                continue
            new_indices.extend([i0, i1, i2])

        self.positions = new_pos
        self.uvs = new_uvs
        self.indices = new_indices
        self.recompute_welded_smooth_normals(pos_quant=pos_quant, _precomputed_pks=pos_keys)

    def recompute_welded_smooth_normals(self, pos_quant=2000.0, _precomputed_pks=None):
        """Computes area-weighted smooth normals welded across identical 3D positions."""
        v_cnt = len(self.positions)
        if v_cnt == 0:
            self.normals = []
            return
        pks = _precomputed_pks if _precomputed_pks is not None else [
            (int(round(p[0] * pos_quant)), int(round(p[1] * pos_quant)), int(round(p[2] * pos_quant)))
            for p in self.positions
        ]
        pk_norm = {}
        for pk in pks:
            if pk not in pk_norm:
                pk_norm[pk] = [0.0, 0.0, 0.0]

        pos = self.positions
        idx = self.indices
        for t in range(0, len(idx) - 2, 3):
            i0, i1, i2 = idx[t], idx[t + 1], idx[t + 2]
            p0, p1, p2 = pos[i0], pos[i1], pos[i2]
            fn = v_cross(v_sub(p1, p0), v_sub(p2, p0))
            for vi in (i0, i1, i2):
                acc = pk_norm[pks[vi]]
                acc[0] += fn[0]
                acc[1] += fn[1]
                acc[2] += fn[2]

        norm_by_pk = {pk: v_norm(acc, (0.0, 1.0, 0.0)) for pk, acc in pk_norm.items()}
        self.normals = [norm_by_pk[pks[i]] for i in range(v_cnt)]

    def loop_subdivide(self, levels=1, pos_quant=2000.0):
        """
        True Loop triangle mesh subdivision (1-2 levels) on the welded 3D position manifold,
        preserving UV seams cleanly while smoothing all organic silhouettes and eliminating facets.
        """
        if levels <= 0 or len(self.indices) < 3:
            return

        self.merge_vertices_and_smooth_normals(pos_quant=pos_quant)

        for _ in range(levels):
            if len(self.indices) < 3:
                break
            v_cnt = len(self.positions)
            # Map each vertex to a welded 3D position ID
            pk_to_pid = {}
            pid_pos = []
            v_to_pid = [0] * v_cnt
            for vi, p in enumerate(self.positions):
                pk = (int(round(p[0] * pos_quant)), int(round(p[1] * pos_quant)), int(round(p[2] * pos_quant)))
                pid = pk_to_pid.get(pk)
                if pid is None:
                    pid = len(pid_pos)
                    pk_to_pid[pk] = pid
                    pid_pos.append(p)
                v_to_pid[vi] = pid

            p_cnt = len(pid_pos)
            p_neighbors = [set() for _ in range(p_cnt)]
            p_edge_opps = {}

            tris_cnt = len(self.indices) // 3
            for ti in range(tris_cnt):
                v0 = self.indices[ti * 3]
                v1 = self.indices[ti * 3 + 1]
                v2 = self.indices[ti * 3 + 2]
                p0, p1, p2 = v_to_pid[v0], v_to_pid[v1], v_to_pid[v2]
                if p0 == p1 or p1 == p2 or p2 == p0:
                    continue
                p_neighbors[p0].update((p1, p2))
                p_neighbors[p1].update((p0, p2))
                p_neighbors[p2].update((p0, p1))
                for a, b, opp in ((p0, p1, p2), (p1, p2, p0), (p2, p0, p1)):
                    ek = (a, b) if a < b else (b, a)
                    lst = p_edge_opps.get(ek)
                    if lst is None:
                        p_edge_opps[ek] = [opp]
                    else:
                        lst.append(opp)

            # Identify boundary edges & boundary neighbors on the 3D position graph
            boundary_nbrs = [set() for _ in range(p_cnt)]
            p_edge_mid = {}
            for ek, opps in p_edge_opps.items():
                pa, pb = ek
                pos_a, pos_b = pid_pos[pa], pid_pos[pb]
                if len(opps) == 2:
                    po0, po1 = pid_pos[opps[0]], pid_pos[opps[1]]
                    p_edge_mid[ek] = (
                        0.375 * (pos_a[0] + pos_b[0]) + 0.125 * (po0[0] + po1[0]),
                        0.375 * (pos_a[1] + pos_b[1]) + 0.125 * (po0[1] + po1[1]),
                        0.375 * (pos_a[2] + pos_b[2]) + 0.125 * (po0[2] + po1[2]),
                    )
                else:
                    boundary_nbrs[pa].add(pb)
                    boundary_nbrs[pb].add(pa)
                    p_edge_mid[ek] = (
                        0.5 * (pos_a[0] + pos_b[0]),
                        0.5 * (pos_a[1] + pos_b[1]),
                        0.5 * (pos_a[2] + pos_b[2]),
                    )

            # Update even (original) 3D positions using Loop weights
            even_pid_pos = [None] * p_cnt
            for pid in range(p_cnt):
                cur = pid_pos[pid]
                b_set = boundary_nbrs[pid]
                if b_set:
                    if len(b_set) == 2:
                        b0, b1 = tuple(b_set)
                        pb0, pb1 = pid_pos[b0], pid_pos[b1]
                        even_pid_pos[pid] = (
                            0.75 * cur[0] + 0.125 * (pb0[0] + pb1[0]),
                            0.75 * cur[1] + 0.125 * (pb0[1] + pb1[1]),
                            0.75 * cur[2] + 0.125 * (pb0[2] + pb1[2]),
                        )
                    else:
                        even_pid_pos[pid] = cur
                else:
                    nbrs = p_neighbors[pid]
                    n = len(nbrs)
                    if n < 3:
                        even_pid_pos[pid] = cur
                    else:
                        beta = (3.0 / 16.0) if n == 3 else (3.0 / (8.0 * n))
                        w_self = 1.0 - n * beta
                        sx = sum(pid_pos[nb][0] for nb in nbrs)
                        sy = sum(pid_pos[nb][1] for nb in nbrs)
                        sz = sum(pid_pos[nb][2] for nb in nbrs)
                        even_pid_pos[pid] = (
                            w_self * cur[0] + beta * sx,
                            w_self * cur[1] + beta * sy,
                            w_self * cur[2] + beta * sz,
                        )

            new_pos = [even_pid_pos[v_to_pid[vi]] for vi in range(v_cnt)]
            new_uvs = list(self.uvs)
            v_edge_cache = {}
            new_indices = []

            def get_odd_vert(va, vb):
                vk = (va, vb) if va < vb else (vb, va)
                cached = v_edge_cache.get(vk)
                if cached is not None:
                    return cached
                pa, pb = v_to_pid[va], v_to_pid[vb]
                if pa == pb:
                    mid_p = even_pid_pos[pa]
                else:
                    ek = (pa, pb) if pa < pb else (pb, pa)
                    mid_p = p_edge_mid.get(ek)
                    if mid_p is None:
                        mid_p = v_lerp(pid_pos[pa], pid_pos[pb], 0.5)
                uva, uvb = new_uvs[va], new_uvs[vb]
                mid_uv = ((uva[0] + uvb[0]) * 0.5, (uva[1] + uvb[1]) * 0.5)
                idx_new = len(new_pos)
                new_pos.append(mid_p)
                new_uvs.append(mid_uv)
                v_edge_cache[vk] = idx_new
                return idx_new

            for ti in range(tris_cnt):
                v0 = self.indices[ti * 3]
                v1 = self.indices[ti * 3 + 1]
                v2 = self.indices[ti * 3 + 2]
                if v_to_pid[v0] == v_to_pid[v1] or v_to_pid[v1] == v_to_pid[v2] or v_to_pid[v2] == v_to_pid[v0]:
                    continue
                e01 = get_odd_vert(v0, v1)
                e12 = get_odd_vert(v1, v2)
                e20 = get_odd_vert(v2, v0)
                new_indices.extend([
                    v0, e01, e20,
                    v1, e12, e01,
                    v2, e20, e12,
                    e01, e12, e20,
                ])

            self.positions = new_pos
            self.uvs = new_uvs
            self.indices = new_indices

        self.recompute_welded_smooth_normals(pos_quant=pos_quant)


# ---------------------------------------------------------------------------
# glTF 2.0 Binary (.glb) Scene Assembler & Exporter
# ---------------------------------------------------------------------------

class GLBBuilder:
    def __init__(self):
        self.materials = []
        self.meshes = []
        self.nodes = []
        self.root_nodes = []
        self.animations = []

    def add_material(
        self,
        name,
        base_color=(0.8, 0.8, 0.8, 1.0),
        metallic=0.0,
        roughness=0.8,
        emissive=(0.0, 0.0, 0.0),
        double_sided=False,
        alpha_mode="OPAQUE",
    ):
        if len(base_color) == 3:
            base_color = (base_color[0], base_color[1], base_color[2], 1.0)
        mat = {
            "name": name,
            "pbrMetallicRoughness": {
                "baseColorFactor": [round(float(c), 5) for c in base_color],
                "metallicFactor": round(float(metallic), 5),
                "roughnessFactor": round(float(roughness), 5),
            },
        }
        if any(e > 0.0001 for e in emissive):
            mat["emissiveFactor"] = [round(float(c), 5) for c in emissive]
        if double_sided:
            mat["doubleSided"] = True
        if alpha_mode != "OPAQUE":
            mat["alphaMode"] = alpha_mode
        idx = len(self.materials)
        self.materials.append(mat)
        return idx

    def create_parts_dict(self):
        """Convenience dict auto-creating MeshPart per material index."""
        parts = {}

        def get_part(mat_idx):
            if mat_idx not in parts:
                parts[mat_idx] = MeshPart(mat_idx)
            return parts[mat_idx]

        return parts, get_part

    def add_mesh_from_parts(self, name, parts_iterable):
        non_empty = [p for p in parts_iterable if len(p.indices) > 0]
        if not non_empty:
            return None
        mesh_idx = len(self.meshes)
        self.meshes.append({"name": name, "parts": non_empty})
        return mesh_idx

    def add_node(
        self,
        name,
        translation=(0.0, 0.0, 0.0),
        rotation_euler=(0.0, 0.0, 0.0),
        rotation_quat=None,
        scale=(1.0, 1.0, 1.0),
        mesh_idx=None,
        parent_idx=None,
    ):
        q = rotation_quat if rotation_quat is not None else quat_from_euler_xyz(*rotation_euler)
        node = {"name": name}
        if any(abs(v) > 1e-7 for v in translation):
            node["translation"] = [round(float(v), 6) for v in translation]
        if any(abs(q[i] - (1.0 if i == 3 else 0.0)) > 1e-7 for i in range(4)):
            node["rotation"] = [round(float(v), 6) for v in q]
        if any(abs(v - 1.0) > 1e-7 for v in scale):
            node["scale"] = [round(float(v), 6) for v in scale]
        if mesh_idx is not None:
            node["mesh"] = mesh_idx

        idx = len(self.nodes)
        self.nodes.append(node)
        if parent_idx is None:
            self.root_nodes.append(idx)
        else:
            parent = self.nodes[parent_idx]
            parent.setdefault("children", []).append(idx)
        return idx

    def add_animation(self, name, tracks):
        """
        tracks: list of dicts:
          {
            "node": int,
            "path": "rotation" | "translation" | "scale",
            "times": [float, ...],
            "values": [(x, y, z, w) or (x, y, z), ...]
          }
        """
        self.animations.append({"name": name, "tracks": tracks})

    def _compute_mesh_ao_colors(self, parts):
        """
        Computes fast vertex-baked Ambient Occlusion (RGB floats in [0.40, 1.0])
        across all parts in a mesh using a 3D spatial hash for concave crevices,
        corners, joints, and downward-facing undersides.
        """
        all_pos = []
        for p in parts:
            all_pos.extend(p.positions)
        if not all_pos:
            return []

        xs = [p[0] for p in all_pos]
        ys = [p[1] for p in all_pos]
        zs = [p[2] for p in all_pos]
        min_x, max_x = min(xs), max(xs)
        min_y, max_y = min(ys), max(ys)
        min_z, max_z = min(zs), max(zs)
        span_x = max_x - min_x
        span_y = max_y - min_y
        span_z = max_z - min_z
        extent = max(span_x, span_y, span_z, 0.25)

        radius = max(0.055, min(0.95, extent * 0.085))
        inv_cell = 1.0 / radius
        inv_r2 = 1.0 / (radius * radius)

        grid = {}
        for part in parts:
            pos_list = part.positions
            nrm_list = part.normals
            for idx in range(len(pos_list)):
                px, py, pz = pos_list[idx]
                key = (
                    int(math.floor(px * inv_cell)),
                    int(math.floor(py * inv_cell)),
                    int(math.floor(pz * inv_cell)),
                )
                bucket = grid.get(key)
                if bucket is None:
                    grid[key] = [(px, py, pz, nrm_list[idx])]
                elif len(bucket) < 10:
                    bucket.append((px, py, pz, nrm_list[idx]))

        y_range = max(span_y, 0.08)
        part_colors = []
        for part in parts:
            pos_list = part.positions
            nrm_list = part.normals
            colors = []
            for idx in range(len(pos_list)):
                px, py, pz = pos_list[idx]
                nx, ny, nz = nrm_list[idx]

                # Soft hemispherical sky-visibility term (undersides darker, upward brighter)
                hemi = 0.80 + 0.20 * max(-0.85, min(1.0, ny))

                # Mild base-contact darkening near bottom of object
                rel_y = (py - min_y) / y_range
                base_fac = 1.0
                if rel_y < 0.14 and ny < 0.35:
                    base_fac = 0.86 + 0.14 * (rel_y / 0.14)

                # Spatial-hash concave crevice & joint proximity occlusion
                cx = int(math.floor(px * inv_cell))
                cy = int(math.floor(py * inv_cell))
                cz = int(math.floor(pz * inv_cell))

                occ = 0.0
                for dx_c in (-1, 0, 1):
                    for dy_c in (-1, 0, 1):
                        for dz_c in (-1, 0, 1):
                            bucket = grid.get((cx + dx_c, cy + dy_c, cz + dz_c))
                            if not bucket:
                                continue
                            for qx, qy, qz, qn in bucket:
                                vx = qx - px
                                vy = qy - py
                                vz = qz - pz
                                d2 = vx * vx + vy * vy + vz * vz
                                if d2 < 1e-8 or d2 >= radius * radius:
                                    continue
                                dist = math.sqrt(d2)
                                proj = (vx * nx + vy * ny + vz * nz) / dist
                                if proj > 0.10:
                                    # Check normal opposition/bend so coplanar walls stay bright
                                    ndot = nx * qn[0] + ny * qn[1] + nz * qn[2]
                                    angle_weight = 1.0 - max(0.0, ndot) * 0.65
                                    falloff = 1.0 - (dist * dist) * inv_r2
                                    occ += proj * falloff * angle_weight * 0.14
                                    if occ >= 0.44:
                                        break
                            if occ >= 0.44:
                                break
                        if occ >= 0.44:
                            break
                    if occ >= 0.44:
                        break

                crevice = 1.0 - min(0.42, occ)
                ao = max(0.42, min(1.0, hemi * base_fac * crevice))
                colors.append((ao, ao, ao))
            part_colors.append(colors)
        return part_colors

    def _calibrate_pbr_materials_and_classify_organic(self):
        """
        Enforces physically accurate non-plastic PBR roughness/metallic values across all materials
        and returns a set of material indices representing organic/cloth/leather surfaces.
        """
        hard_keywords = (
            "steel", "iron", "brass", "gold", "silver", "copper", "metal", "boiler",
            "glass", "siding", "shingle", "foundation", "brick", "counter", "shutters",
            "warmpine", "darktimber", "walnut", "dynamite", "ferrule", "buckle", "spur",
            "shear", "pin", "eye", "pupil", "fang", "tooth", "teeth", "claw", "glow", "ember"
        )
        fur_skin_keywords = (
            "fur", "coat", "skin", "face", "hair", "mane", "tail", "muzzle", "blaze",
            "belly", "flank", "brisket", "ear", "snout", "brow", "beard", "flesh", "nose"
        )
        leather_keywords = ("leather", "boot", "holster", "belt", "bridle", "cinch", "apron")
        cloth_keywords = (
            "trousers", "vest", "shirt", "bandana", "cloak", "silk", "wool", "blanket",
            "stetson", "hat", "cravat", "tape", "linen", "canvas", "robe", "hood", "collar"
        )
        wood_keywords = ("siding", "pine", "timber", "shutter", "plank", "shingle", "walnut", "wood")

        organic_mat_indices = set()
        for idx, mat in enumerate(self.materials):
            m_low = (mat.get("name") or "").lower()
            pbr = mat.get("pbrMetallicRoughness", {})
            met = float(pbr.get("metallicFactor", 0.0))
            rgh = float(pbr.get("roughnessFactor", 0.8))

            is_hard = met >= 0.40 or any(k in m_low for k in hard_keywords)
            if any(k in m_low for k in wood_keywords) and "counter" not in m_low:
                pbr["metallicFactor"] = 0.0
                pbr["roughnessFactor"] = round(min(0.92, max(0.84, rgh)), 4)
            elif not is_hard:
                if any(k in m_low for k in leather_keywords) and "saddle" not in m_low or "saddleleather" in m_low:
                    pbr["metallicFactor"] = 0.05
                    pbr["roughnessFactor"] = round(min(0.72, max(0.62, rgh)), 4)
                    organic_mat_indices.add(idx)
                elif any(k in m_low for k in cloth_keywords) and "duster" not in m_low:
                    pbr["metallicFactor"] = 0.0
                    pbr["roughnessFactor"] = round(min(0.95, max(0.88, rgh)), 4)
                    organic_mat_indices.add(idx)
                elif "duster" in m_low:
                    pbr["metallicFactor"] = 0.0
                    pbr["roughnessFactor"] = 0.90
                    organic_mat_indices.add(idx)
                elif any(k in m_low for k in fur_skin_keywords) or "hoof" in m_low or "antler" in m_low:
                    pbr["metallicFactor"] = 0.0
                    pbr["roughnessFactor"] = round(min(0.92, max(0.85, rgh)), 4)
                    organic_mat_indices.add(idx)

        return organic_mat_indices

    def _joint_loop_subdivide_parts(self, organic_parts, pos_quant=2000.0, uv_quant=1000.0):
        """
        Merges shared vertices and runs 1-2 levels of joint Loop subdivision across all
        organic parts in a mesh simultaneously so multi-material pelage/body seams stay
        100% watertight with unified C2-smooth vertex normals.
        """
        if not organic_parts:
            return

        # Step 1: Weld duplicate (pos, uv) vertices inside each organic part
        for part in organic_parts:
            part.merge_vertices_and_smooth_normals(pos_quant=pos_quant, uv_quant=uv_quant)

        total_tris = sum(len(p.indices) // 3 for p in organic_parts)
        if total_tris == 0:
            return

        explicit_levels = [getattr(p, "subdivide_levels", None) for p in organic_parts]
        explicit_levels = [lv for lv in explicit_levels if lv is not None]
        if explicit_levels:
            levels = max(explicit_levels)
        elif total_tris < 420:
            levels = 2
        elif total_tris < 3800:
            levels = 1
        else:
            levels = 0

        for _ in range(levels):
            pk_to_pid = {}
            pid_pos = []
            part_v_to_pid = []

            for part in organic_parts:
                v_map = [0] * len(part.positions)
                for vi, p in enumerate(part.positions):
                    pk = (int(round(p[0] * pos_quant)), int(round(p[1] * pos_quant)), int(round(p[2] * pos_quant)))
                    pid = pk_to_pid.get(pk)
                    if pid is None:
                        pid = len(pid_pos)
                        pk_to_pid[pk] = pid
                        pid_pos.append(p)
                    v_map[vi] = pid
                part_v_to_pid.append(v_map)

            p_cnt = len(pid_pos)
            p_neighbors = [set() for _ in range(p_cnt)]
            p_edge_opps = {}

            for p_i, part in enumerate(organic_parts):
                v_map = part_v_to_pid[p_i]
                t_cnt = len(part.indices) // 3
                for ti in range(t_cnt):
                    v0 = part.indices[ti * 3]
                    v1 = part.indices[ti * 3 + 1]
                    v2 = part.indices[ti * 3 + 2]
                    p0, p1, p2 = v_map[v0], v_map[v1], v_map[v2]
                    if p0 == p1 or p1 == p2 or p2 == p0:
                        continue
                    p_neighbors[p0].update((p1, p2))
                    p_neighbors[p1].update((p0, p2))
                    p_neighbors[p2].update((p0, p1))
                    for a, b, opp in ((p0, p1, p2), (p1, p2, p0), (p2, p0, p1)):
                        ek = (a, b) if a < b else (b, a)
                        lst = p_edge_opps.get(ek)
                        if lst is None:
                            p_edge_opps[ek] = [opp]
                        else:
                            lst.append(opp)

            boundary_nbrs = [set() for _ in range(p_cnt)]
            p_edge_mid = {}
            for ek, opps in p_edge_opps.items():
                pa, pb = ek
                pos_a, pos_b = pid_pos[pa], pid_pos[pb]
                if len(opps) == 2:
                    po0, po1 = pid_pos[opps[0]], pid_pos[opps[1]]
                    p_edge_mid[ek] = (
                        0.375 * (pos_a[0] + pos_b[0]) + 0.125 * (po0[0] + po1[0]),
                        0.375 * (pos_a[1] + pos_b[1]) + 0.125 * (po0[1] + po1[1]),
                        0.375 * (pos_a[2] + pos_b[2]) + 0.125 * (po0[2] + po1[2]),
                    )
                else:
                    boundary_nbrs[pa].add(pb)
                    boundary_nbrs[pb].add(pa)
                    p_edge_mid[ek] = (
                        0.5 * (pos_a[0] + pos_b[0]),
                        0.5 * (pos_a[1] + pos_b[1]),
                        0.5 * (pos_a[2] + pos_b[2]),
                    )

            even_pid_pos = [None] * p_cnt
            for pid in range(p_cnt):
                cur = pid_pos[pid]
                b_set = boundary_nbrs[pid]
                if b_set:
                    if len(b_set) == 2:
                        b0, b1 = tuple(b_set)
                        pb0, pb1 = pid_pos[b0], pid_pos[b1]
                        even_pid_pos[pid] = (
                            0.75 * cur[0] + 0.125 * (pb0[0] + pb1[0]),
                            0.75 * cur[1] + 0.125 * (pb0[1] + pb1[1]),
                            0.75 * cur[2] + 0.125 * (pb0[2] + pb1[2]),
                        )
                    else:
                        even_pid_pos[pid] = cur
                else:
                    nbrs = p_neighbors[pid]
                    n = len(nbrs)
                    if n < 3:
                        even_pid_pos[pid] = cur
                    else:
                        beta = (3.0 / 16.0) if n == 3 else (3.0 / (8.0 * n))
                        w_self = 1.0 - n * beta
                        sx = sum(pid_pos[nb][0] for nb in nbrs)
                        sy = sum(pid_pos[nb][1] for nb in nbrs)
                        sz = sum(pid_pos[nb][2] for nb in nbrs)
                        even_pid_pos[pid] = (
                            w_self * cur[0] + beta * sx,
                            w_self * cur[1] + beta * sy,
                            w_self * cur[2] + beta * sz,
                        )

            for p_i, part in enumerate(organic_parts):
                v_map = part_v_to_pid[p_i]
                new_pos = [even_pid_pos[v_map[vi]] for vi in range(len(part.positions))]
                new_uvs = list(part.uvs)
                v_edge_cache = {}
                new_indices = []
                t_cnt = len(part.indices) // 3

                def get_odd_v(va, vb):
                    vk = (va, vb) if va < vb else (vb, va)
                    cached = v_edge_cache.get(vk)
                    if cached is not None:
                        return cached
                    pa, pb = v_map[va], v_map[vb]
                    if pa == pb:
                        mid_p = even_pid_pos[pa]
                    else:
                        ek = (pa, pb) if pa < pb else (pb, pa)
                        mid_p = p_edge_mid.get(ek) or v_lerp(pid_pos[pa], pid_pos[pb], 0.5)
                    uva, uvb = new_uvs[va], new_uvs[vb]
                    mid_uv = ((uva[0] + uvb[0]) * 0.5, (uva[1] + uvb[1]) * 0.5)
                    idx_new = len(new_pos)
                    new_pos.append(mid_p)
                    new_uvs.append(mid_uv)
                    v_edge_cache[vk] = idx_new
                    return idx_new

                for ti in range(t_cnt):
                    v0 = part.indices[ti * 3]
                    v1 = part.indices[ti * 3 + 1]
                    v2 = part.indices[ti * 3 + 2]
                    if v_map[v0] == v_map[v1] or v_map[v1] == v_map[v2] or v_map[v2] == v_map[v0]:
                        continue
                    e01 = get_odd_v(v0, v1)
                    e12 = get_odd_v(v1, v2)
                    e20 = get_odd_v(v2, v0)
                    new_indices.extend([
                        v0, e01, e20,
                        v1, e12, e01,
                        v2, e20, e12,
                        e01, e12, e20,
                    ])

                part.positions = new_pos
                part.uvs = new_uvs
                part.indices = new_indices

        # Step 3: Compute unified area-weighted smooth normals across all organic parts together
        joint_norm = {}
        part_pks = []
        for part in organic_parts:
            pks = [
                (int(round(p[0] * pos_quant)), int(round(p[1] * pos_quant)), int(round(p[2] * pos_quant)))
                for p in part.positions
            ]
            part_pks.append(pks)
            for pk in pks:
                if pk not in joint_norm:
                    joint_norm[pk] = [0.0, 0.0, 0.0]

        for p_i, part in enumerate(organic_parts):
            pks = part_pks[p_i]
            pos = part.positions
            idx = part.indices
            for t in range(0, len(idx) - 2, 3):
                i0, i1, i2 = idx[t], idx[t + 1], idx[t + 2]
                p0, p1, p2 = pos[i0], pos[i1], pos[i2]
                fn = v_cross(v_sub(p1, p0), v_sub(p2, p0))
                for vi in (i0, i1, i2):
                    acc = joint_norm[pks[vi]]
                    acc[0] += fn[0]
                    acc[1] += fn[1]
                    acc[2] += fn[2]

        norm_lookup = {pk: v_norm(acc, (0.0, 1.0, 0.0)) for pk, acc in joint_norm.items()}
        for p_i, part in enumerate(organic_parts):
            pks = part_pks[p_i]
            part.normals = [norm_lookup[pks[vi]] for vi in range(len(part.positions))]

    def export_glb(self, filepath):
        organic_mats = self._calibrate_pbr_materials_and_classify_organic()
        for m in self.meshes:
            org_parts = [
                p for p in m["parts"]
                if p.material_idx in organic_mats or getattr(p, "subdivide_levels", 0) > 0
            ]
            if org_parts:
                self._joint_loop_subdivide_parts(org_parts)

        bin_chunks = bytearray()
        buffer_views = []
        accessors = []

        def pad4(buf, pad_byte=b"\x00"):
            rem = len(buf) % 4
            if rem:
                buf.extend(pad_byte * (4 - rem))

        def append_buffer_view(raw_bytes, target=None):
            pad4(bin_chunks, b"\x00")
            offset = len(bin_chunks)
            bin_chunks.extend(raw_bytes)
            bv = {"buffer": 0, "byteOffset": offset, "byteLength": len(raw_bytes)}
            if target is not None:
                bv["target"] = target
            bv_idx = len(buffer_views)
            buffer_views.append(bv)
            return bv_idx

        gltf_meshes = []
        total_verts = 0
        total_tris = 0

        for m in self.meshes:
            primitives = []
            ao_colors_by_part = self._compute_mesh_ao_colors(m["parts"])
            for p_idx, part in enumerate(m["parts"]):
                v_cnt = len(part.positions)
                i_cnt = len(part.indices)
                total_verts += v_cnt
                total_tris += i_cnt // 3

                # Pack POSITION
                pos_min = [min(p[k] for p in part.positions) for k in range(3)]
                pos_max = [max(p[k] for p in part.positions) for k in range(3)]
                pos_bytes = b"".join(struct.pack("<fff", *p) for p in part.positions)
                pos_bv = append_buffer_view(pos_bytes, target=34962)
                pos_acc = len(accessors)
                accessors.append({
                    "bufferView": pos_bv,
                    "componentType": 5126,
                    "count": v_cnt,
                    "type": "VEC3",
                    "min": pos_min,
                    "max": pos_max,
                })

                # Pack NORMAL
                nrm_bytes = b"".join(struct.pack("<fff", *n) for n in part.normals)
                nrm_bv = append_buffer_view(nrm_bytes, target=34962)
                nrm_acc = len(accessors)
                accessors.append({
                    "bufferView": nrm_bv,
                    "componentType": 5126,
                    "count": v_cnt,
                    "type": "VEC3",
                })

                # Pack TEXCOORD_0
                uv_bytes = b"".join(struct.pack("<ff", *uv) for uv in part.uvs)
                uv_bv = append_buffer_view(uv_bytes, target=34962)
                uv_acc = len(accessors)
                accessors.append({
                    "bufferView": uv_bv,
                    "componentType": 5126,
                    "count": v_cnt,
                    "type": "VEC2",
                })

                # Pack COLOR_0 (Vertex-Baked Ambient Occlusion)
                col_list = ao_colors_by_part[p_idx] if p_idx < len(ao_colors_by_part) else [(1.0, 1.0, 1.0)] * v_cnt
                col_bytes = b"".join(struct.pack("<fff", *c) for c in col_list)
                col_bv = append_buffer_view(col_bytes, target=34962)
                col_acc = len(accessors)
                accessors.append({
                    "bufferView": col_bv,
                    "componentType": 5126,
                    "count": v_cnt,
                    "type": "VEC3",
                })

                # Pack INDICES
                if v_cnt <= 65535:
                    idx_bytes = b"".join(struct.pack("<H", ix) for ix in part.indices)
                    idx_comp = 5123
                else:
                    idx_bytes = b"".join(struct.pack("<I", ix) for ix in part.indices)
                    idx_comp = 5125
                idx_bv = append_buffer_view(idx_bytes, target=34963)
                idx_acc = len(accessors)
                accessors.append({
                    "bufferView": idx_bv,
                    "componentType": idx_comp,
                    "count": i_cnt,
                    "type": "SCALAR",
                })

                primitives.append({
                    "attributes": {
                        "POSITION": pos_acc,
                        "NORMAL": nrm_acc,
                        "TEXCOORD_0": uv_acc,
                        "COLOR_0": col_acc,
                    },
                    "indices": idx_acc,
                    "material": part.material_idx,
                })

            gltf_meshes.append({"name": m["name"], "primitives": primitives})

        gltf_animations = []
        for anim in self.animations:
            samplers = []
            channels = []
            for tr in anim["tracks"]:
                times = tr["times"]
                values = tr["values"]
                path = tr["path"]

                t_bytes = b"".join(struct.pack("<f", t) for t in times)
                t_bv = append_buffer_view(t_bytes, target=None)
                t_acc = len(accessors)
                accessors.append({
                    "bufferView": t_bv,
                    "componentType": 5126,
                    "count": len(times),
                    "type": "SCALAR",
                    "min": [float(min(times))],
                    "max": [float(max(times))],
                })

                if path == "rotation":
                    val_bytes = b"".join(struct.pack("<ffff", *v) for v in values)
                    val_type = "VEC4"
                else:
                    val_bytes = b"".join(struct.pack("<fff", *v) for v in values)
                    val_type = "VEC3"

                v_bv = append_buffer_view(val_bytes, target=None)
                v_acc = len(accessors)
                accessors.append({
                    "bufferView": v_bv,
                    "componentType": 5126,
                    "count": len(values),
                    "type": val_type,
                })

                s_idx = len(samplers)
                samplers.append({
                    "input": t_acc,
                    "interpolation": "LINEAR",
                    "output": v_acc,
                })
                channels.append({
                    "sampler": s_idx,
                    "target": {"node": tr["node"], "path": path},
                })

            gltf_animations.append({
                "name": anim["name"],
                "samplers": samplers,
                "channels": channels,
            })

        pad4(bin_chunks, b"\x00")

        gltf_dict = {
            "asset": {"version": "2.0", "generator": "WesternVR-GLBBuilder-2.0-Subdiv"},
            "scene": 0,
            "scenes": [{"name": "Scene", "nodes": self.root_nodes}],
            "nodes": self.nodes,
            "materials": self.materials,
            "buffers": [{"byteLength": len(bin_chunks)}],
            "bufferViews": buffer_views,
            "accessors": accessors,
        }
        if gltf_meshes:
            gltf_dict["meshes"] = gltf_meshes
        if gltf_animations:
            gltf_dict["animations"] = gltf_animations

        json_bytes = bytearray(json.dumps(gltf_dict, separators=(",", ":")).encode("utf-8"))
        pad4(json_bytes, b" ")

        total_length = 12 + 8 + len(json_bytes) + 8 + len(bin_chunks)
        os.makedirs(os.path.dirname(os.path.abspath(filepath)), exist_ok=True)
        with open(filepath, "wb") as f:
            # 12-byte GLB header
            f.write(struct.pack("<III", 0x46546C67, 2, total_length))
            # Chunk 0: JSON
            f.write(struct.pack("<II", len(json_bytes), 0x4E4F534A))
            f.write(json_bytes)
            # Chunk 1: BIN
            f.write(struct.pack("<II", len(bin_chunks), 0x004E4942))
            f.write(bin_chunks)

        return {
            "filepath": filepath,
            "bytes": total_length,
            "vertices": total_verts,
            "triangles": total_tris,
            "nodes": len(self.nodes),
            "animations": len(gltf_animations),
        }
