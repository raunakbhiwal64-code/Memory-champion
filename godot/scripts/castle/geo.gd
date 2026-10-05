class_name Geo
## Building blocks for the castle, mirroring the helpers the web version used
## (box, cyl, sph, cone, torus, lathe, tube...), so a prop reads the same in
## both. Godot and three.js share axes: Y up, -Z forward.

## Everything that moves each frame: callables taking (t, dt).
static var anims: Array = []
## Lights created while building, with their room and flicker kind.
static var lights: Array = []


static func reset() -> void:
	anims = []
	lights = []


static func _mi(mesh: Mesh, m: Material, x: float, y: float, z: float) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = m
	mi.position = Vector3(x, y, z)
	return mi


static func box(w: float, h: float, d: float, m: Material, x := 0.0, y := 0.0, z := 0.0) -> MeshInstance3D:
	var b := BoxMesh.new()
	b.size = Vector3(w, h, d)
	return _mi(b, m, x, y, z)


static func cyl(rt: float, rb: float, h: float, m: Material, x := 0.0, y := 0.0, z := 0.0, seg := 16, open := false) -> MeshInstance3D:
	var c := CylinderMesh.new()
	c.top_radius = rt
	c.bottom_radius = rb
	c.height = h
	c.radial_segments = seg
	c.rings = 1
	c.cap_top = not open
	c.cap_bottom = not open
	return _mi(c, m, x, y, z)


static func cone(r: float, h: float, m: Material, x := 0.0, y := 0.0, z := 0.0, seg := 16) -> MeshInstance3D:
	return cyl(0.0, r, h, m, x, y, z, seg)


static func sph(r: float, m: Material, x := 0.0, y := 0.0, z := 0.0, ws := 18, hs := 14) -> MeshInstance3D:
	var s := SphereMesh.new()
	s.radius = r
	s.height = r * 2.0
	s.radial_segments = ws
	s.rings = hs
	return _mi(s, m, x, y, z)


## A ring around the Z axis in the XY plane, like three.js's TorusGeometry;
## `arc` < TAU gives a partial ring.
static func torus(r: float, t: float, m: Material, x := 0.0, y := 0.0, z := 0.0, arc := TAU, radial := 8, tubular := 32) -> MeshInstance3D:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	for i in tubular + 1:
		var u := arc * i / tubular
		for j in radial + 1:
			var v := TAU * j / radial
			var cx := cos(u) * r
			var cy := sin(u) * r
			var nrm := Vector3(cos(v) * cos(u), cos(v) * sin(u), sin(v))
			st.set_normal(nrm)
			st.set_uv(Vector2(float(i) / tubular, float(j) / radial))
			st.add_vertex(Vector3(cx, cy, 0) + nrm * t)
	for i in tubular:
		for j in radial:
			var a := i * (radial + 1) + j
			var b := a + radial + 1
			st.add_index(a)
			st.add_index(b)
			st.add_index(a + 1)
			st.add_index(b)
			st.add_index(b + 1)
			st.add_index(a + 1)
	return _mi(st.commit(), m, x, y, z)


## Flat ring on the ground (an annulus), facing up.
static func ring(inner: float, outer: float, m: Material, seg := 48) -> MeshInstance3D:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	st.set_normal(Vector3.UP)
	for i in seg:
		var a0 := TAU * i / seg
		var a1 := TAU * (i + 1) / seg
		var p := [Vector3(cos(a0) * inner, 0, sin(a0) * inner), Vector3(cos(a0) * outer, 0, sin(a0) * outer),
			Vector3(cos(a1) * outer, 0, sin(a1) * outer), Vector3(cos(a1) * inner, 0, sin(a1) * inner)]
		for k in [0, 2, 1, 0, 3, 2]:
			st.add_vertex(p[k])
	return _mi(st.commit(), m, 0, 0, 0)


## Surface of revolution around Y; points are [radius, y], bottom to top.
static func lathe(points: Array, m: Material, seg := 28) -> MeshInstance3D:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var n := points.size()
	for i in seg + 1:
		var a := TAU * i / seg
		for j in n:
			st.set_uv(Vector2(float(i) / seg, float(j) / (n - 1)))
			st.add_vertex(Vector3(cos(a) * points[j][0], points[j][1], sin(a) * points[j][0]))
	for i in seg:
		for j in n - 1:
			var a := i * n + j
			var b := a + n
			for k in [a, a + 1, b, b, a + 1, b + 1]:
				st.add_index(k)
	st.generate_normals()
	return _mi(st.commit(), m, 0, 0, 0)


## A tube along a smooth curve through `pts`, tapering from r0 to r1.
static func tube(pts: Array, r0: float, r1: float, m: Material, segs := 16, radial := 8) -> MeshInstance3D:
	return _mi(tube_mesh(pts, r0, r1, segs, radial), m, 0, 0, 0)


static func tube_mesh(pts: Array, r0: float, r1: float, segs := 16, radial := 8, uv_scale := 1.0) -> ArrayMesh:
	var curve := Curve3D.new()
	for p in pts:
		curve.add_point(p)
	_smooth(curve)
	var length := curve.get_baked_length()
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var prev_n := Vector3.UP
	for i in segs + 1:
		var t := float(i) / segs
		var p := curve.sample_baked(t * length, true)
		var ahead := curve.sample_baked(min(t * length + 0.02, length), true)
		var behind := curve.sample_baked(max(t * length - 0.02, 0.0), true)
		var tan := (ahead - behind).normalized()
		if tan.length_squared() < 0.5:
			tan = Vector3.UP
		var nrm := prev_n - tan * prev_n.dot(tan)
		if nrm.length_squared() < 1e-4:
			nrm = tan.cross(Vector3.RIGHT)
		nrm = nrm.normalized()
		prev_n = nrm
		var bin := tan.cross(nrm).normalized()
		var r := r0 + (r1 - r0) * pow(t, 0.8)
		for j in radial + 1:
			var a := TAU * j / radial
			var dir := nrm * cos(a) + bin * sin(a)
			st.set_normal(dir)
			st.set_uv(Vector2(float(j) / radial * max(0.3, TAU * r0) * uv_scale, t * length * uv_scale))
			st.add_vertex(p + dir * r)
	for i in segs:
		for j in radial:
			var a := i * (radial + 1) + j
			var b := a + radial + 1
			for k in [a, b, a + 1, b, b + 1, a + 1]:
				st.add_index(k)
	return st.commit()


## Catmull-Rom style handles so the curve passes smoothly through each point.
static func _smooth(c: Curve3D) -> void:
	var n := c.point_count
	for i in n:
		var prev := c.get_point_position(max(i - 1, 0))
		var next := c.get_point_position(min(i + 1, n - 1))
		var h := (next - prev) / 6.0
		c.set_point_in(i, -h)
		c.set_point_out(i, h)


static func quad(w: float, h: float, m: Material, x := 0.0, y := 0.0, z := 0.0) -> MeshInstance3D:
	var q := QuadMesh.new()
	q.size = Vector2(w, h)
	return _mi(q, m, x, y, z)


static func group(kids: Array = []) -> Node3D:
	var g := Node3D.new()
	for k in kids:
		if k:
			g.add_child(k)
	return g


static func rot_x(n: Node3D, a: float) -> Node3D:
	n.rotation.x = a
	return n


static func rot_z(n: Node3D, a: float) -> Node3D:
	n.rotation.z = a
	return n


static func at(n: Node3D, x: float, y: float, z: float) -> Node3D:
	n.position = Vector3(x, y, z)
	return n


## A soft halo that always faces the camera.
static func glow(color: Color, size: float) -> MeshInstance3D:
	var q := QuadMesh.new()
	q.size = Vector2(size, size)
	var mi := _mi(q, Mats.glow_sprite_material(color), 0, 0, 0)
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	return mi


## A candle or torch flame that flickers.
static func flame(size: float) -> Node3D:
	var core := cone(0.07 * size, 0.22 * size, Mats.glow(Color("#ffa030"), 4.0), 0, 0.11 * size, 0, 8)
	core.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var halo := glow(Color(1.0, 0.67, 0.27, 0.9), 0.9 * size)
	halo.position.y = 0.12 * size
	var g := group([core, halo])
	g.set_meta("dynamic", true)
	var phase := randf() * 10.0
	anims.append(func(t, _dt):
		var f := 1.0 + sin(t * 13.0 + phase) * 0.08 + sin(t * 7.3 + phase) * 0.06
		g.scale = Vector3(f, f * 1.05, f))
	return g


## A real light. `intensity` and `distance` are the web version's numbers.
static func light(x: float, y: float, z: float, color, intensity: float, distance: float, kind := "", shadow := false) -> OmniLight3D:
	var l := OmniLight3D.new()
	l.position = Vector3(x, y, z)
	l.light_color = color if color is Color else Color.hex((int(color) << 8) | 0xff)
	l.light_energy = 0.4 + intensity * 0.055
	l.omni_range = distance * 1.15
	l.omni_attenuation = 1.4
	l.shadow_enabled = shadow
	l.shadow_bias = 0.06
	l.shadow_normal_bias = 1.5
	l.set_meta("kind", kind)
	l.set_meta("base_energy", l.light_energy)
	l.set_meta("phase", randf() * 10.0)
	lights.append(l)
	return l


## Spin a node around an axis forever.
static func spin(n: Node3D, speed: float, axis := "y") -> Node3D:
	n.set_meta("dynamic", true)
	anims.append(func(_t, dt):
		if is_instance_valid(n):
			n.rotation[axis] += dt * speed)
	return n


## Merges every static mesh under `root` into one mesh per material: thousands
## of books, stones and balusters become a handful of draw calls.
static func merge_static(root: Node3D) -> Node3D:
	var groups := {}
	_collect(root, root.global_transform.affine_inverse(), groups)
	var out := Node3D.new()
	for key in groups:
		var g: Dictionary = groups[key]
		if g.items.size() < 2:
			continue
		var st := SurfaceTool.new()
		st.begin(Mesh.PRIMITIVE_TRIANGLES)
		for it in g.items:
			var mi: MeshInstance3D = it[0]
			for s in mi.mesh.get_surface_count():
				st.append_from(mi.mesh, s, it[1])
			mi.get_parent().remove_child(mi)
			mi.queue_free()
		var merged := MeshInstance3D.new()
		merged.mesh = st.commit()
		merged.material_override = g.material
		merged.cast_shadow = g.shadow
		out.add_child(merged)
	root.add_child(out)
	return out


static func _collect(n: Node, inv: Transform3D, groups: Dictionary) -> void:
	if n.has_meta("dynamic"):
		return
	for c in n.get_children():
		_collect(c, inv, groups)
	if n is MeshInstance3D and n.mesh and n.material_override and n.get_child_count() == 0:
		var m: Material = n.material_override
		if m is StandardMaterial3D and (m.billboard_mode != BaseMaterial3D.BILLBOARD_DISABLED or m.blend_mode == BaseMaterial3D.BLEND_MODE_ADD):
			return
		var key := "%d|%d" % [m.get_instance_id(), n.cast_shadow]
		if not groups.has(key):
			groups[key] = { material = m, shadow = n.cast_shadow, items = [] }
		groups[key].items.append([n, inv * n.global_transform])
