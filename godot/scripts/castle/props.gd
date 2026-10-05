class_name CastleProps
## The 40 station objects, one distinct object per station. Local frame: stands
## on y=0, front faces +z. 15 of them are real CC0 models (Poly Haven), some
## keeping part of the built object (the gate keeps its stone piers).
## META: r = collision radius, cols = extra [x, z, r] circles, h = badge height.

const META := {
	gate = { r = 0.6, h = 5.2 }, fountain = { r = 1.45, h = 3.0 }, tree = { r = 0.7, h = 5.4 }, well = { r = 1.1, h = 3.0 }, sundial = { r = 0.6, h = 2.2 },
	hourglass = { r = 0.75, h = 3.6 }, clock = { r = 0.5, h = 3.4 }, staircase = { r = 0.0, cols = [[-2.2, -0.2, 1.4], [0, -0.2, 1.4], [2.2, -0.2, 1.4]], h = 4.8 },
	armour = { r = 0.5, h = 2.9 }, knightportrait = { r = 0.3, h = 4.2 }, harp = { r = 0.6, h = 2.8 },
	longtable = { r = 0.0, cols = [[-2.6, 0, 1.3], [0, 0, 1.3], [2.6, 0, 1.3]], h = 2.4 }, fireplace = { r = 0.0, cols = [[0, -0.1, 1.2]], h = 4.4 },
	lectern = { r = 0.5, h = 2.8 }, throne = { r = 1.0, h = 4.3 }, mirror = { r = 0.3, h = 4.0 }, ladyportrait = { r = 0.3, h = 4.0 }, tapestry = { r = 0.2, h = 5.0 },
	vase = { r = 0.6, h = 2.7 }, bust = { r = 0.5, h = 2.7 }, bookshelf = { r = 0.0, cols = [[-0.8, 0, 0.55], [0.8, 0, 0.55]], h = 4.6 },
	desk = { r = 0.9, h = 2.4 }, chained = { r = 0.0, cols = [[-0.8, 0, 0.55], [0.8, 0, 0.55]], h = 4.4 }, globe = { r = 0.8, h = 3.3 }, armchair = { r = 0.9, h = 2.7 },
	potions = { r = 0.4, h = 3.4 }, cauldron = { r = 1.0, h = 2.9 }, barrels = { r = 1.1, h = 3.0 }, scales = { r = 0.7, h = 2.7 }, cage = { r = 0.9, h = 3.3 },
	trophies = { r = 0.6, h = 3.5 }, shield = { r = 0.3, h = 4.0 }, spears = { r = 0.5, h = 3.7 }, chest = { r = 0.7, h = 2.0 },
	cannon = { r = 0.0, cols = [[0, 0.4, 0.9], [0, -0.7, 0.7]], h = 2.5 }, telescope = { r = 0.7, h = 3.3 }, starchart = { r = 0.9, h = 2.5 },
	orrery = { r = 1.0, h = 3.5 }, crystal = { r = 0.5, h = 2.6 }, armillary = { r = 0.7, h = 3.3 },
}

## Real models: id, fit (height/width/length in metres), position, optional
## rotation, extra models, and which built children to hide ("all", n = the
## first n, from = from index n on). add = keep the built object entirely.
const MODELS := {
	gate = { id = "large_iron_gate", fit = { width = 4.1 }, pos = [0, 0, -0.42], hide = { from = 3 } },
	clock = { id = "vintage_grandfather_clock_01", fit = { height = 2.7 }, pos = [0, 0, -0.05] },
	throne = { id = "WoodenChair_01", fit = { height = 3.3 }, pos = [0, 0.32, -0.5], hide = { from = 2 } },
	mirror = { id = "ornate_mirror_01", fit = { height = 2.5 }, pos = [0, 3.0, -0.2] },
	vase = { id = "antique_ceramic_vase_01", fit = { height = 1.15 }, pos = [0, 0.9, 0], hide = { from = 1 } },
	bust = { id = "marble_bust_01", fit = { height = 0.85 }, pos = [0, 1.3, 0], hide = { from = 2 } },
	bookshelf = { id = "wooden_bookshelf_worn", fit = { height = 3.6 }, pos = [0, 0, -0.1] },
	armchair = { id = "ArmChair_01", fit = { height = 1.25 }, pos = [0, 0, 0], hide = { first = 9 } },
	barrels = { id = "wooden_barrels_01", fit = { width = 2.6 }, pos = [0, 0, 0] },
	shield = { id = "kite_shield", fit = { height = 1.7 }, pos = [0, 3.0, -0.2], extra = [
		{ id = "antique_estoc", fit = { height = 1.9 }, pos = [-0.15, 2.9, -0.28], rot = [0, 0, 0.75] },
		{ id = "antique_estoc", fit = { height = 1.9 }, pos = [0.15, 2.9, -0.28], rot = [0, 0, -0.75] }] },
	chest = { id = "treasure_chest", fit = { width = 1.3 }, pos = [0, 0, 0] },
	cannon = { id = "cannon_01", fit = { length = 2.4 }, pos = [0, 0, -0.2], rot = [0, PI, 0] },
	trophies = { id = "vintage_cabinet_01", fit = { height = 2.6 }, pos = [0, 0, -0.1] },
	desk = { add = true, id = "vintage_oil_lamp", fit = { height = 0.6 }, pos = [-0.62, 0.9, -0.25], extra = [
		{ id = "book_encyclopedia_set_01", fit = { width = 0.6 }, pos = [0.1, 0.9, -0.33] }] },
	scales = { add = true, id = "chemistry_set", fit = { width = 1.0 }, pos = [-0.3, 0.96, -0.2] },
	well = { add = true, id = "wooden_bucket_01", fit = { height = 0.5 }, pos = [0.7, 0.95, 0.35] },
	longtable = { add = true, id = "brass_goblets", fit = { width = 0.45 }, pos = [-1.5, 0.92, 0.1], extra = [
		{ id = "jug_01", fit = { height = 0.32 }, pos = [1.2, 0.92, 0] }, { id = "brass_goblets", fit = { width = 0.45 }, pos = [2.4, 0.92, -0.1], rot = [0, 2, 0] }] },
}


static func m(c, o := {}) -> StandardMaterial3D:
	return Mats.mat(c, o)


## Builds a station's object, with its real model if it has one.
static func build(prop: String) -> Node3D:
	if _inst == null:
		_inst = CastleProps.new()
	var g: Node3D = _inst.call(prop) if META.has(prop) else Geo.group([Geo.box(0.6, 0.6, 0.6, Mats.stone(), 0, 0.3, 0)])
	var spec: Dictionary = MODELS.get(prop, {})
	if not spec.is_empty():
		var parts: Array = [spec] + spec.get("extra", [])
		var built := g.get_children()
		for p in parts:
			var model := load_model(p.id, p.fit)
			if model == null:
				continue
			model.position = Vector3(p.pos[0], p.pos[1], p.pos[2])
			if p.has("rot"):
				model.rotation = Vector3(p.rot[0], p.rot[1], p.rot[2])
			g.add_child(model)
		if not spec.get("add", false):
			var hide = spec.get("hide", "all")
			for i in built.size():
				var c: Node = built[i]
				if c is OmniLight3D:
					continue
				var hidden := true
				if hide is Dictionary and hide.has("from"):
					hidden = i >= hide.from
				elif hide is Dictionary and hide.has("first"):
					hidden = i < hide.first
				if hidden:
					c.queue_free()
	return g


static var _inst: CastleProps = null
static var _models := {}


## A real model, scaled to fit. fit: {height} | {width} | {length}.
static func load_model(id: String, fit: Dictionary) -> Node3D:
	var path := "res://assets/castle/models/%s.glb" % id
	if not _models.has(id):
		_models[id] = load(path) if ResourceLoader.exists(path) else null
	if _models[id] == null:
		return null
	var node: Node3D = _models[id].instantiate()
	var box := aabb(node)
	var k := 1.0
	if fit.has("height"):
		k = fit.height / max(box.size.y, 0.001)
	elif fit.has("width"):
		k = fit.width / max(box.size.x, 0.001)
	elif fit.has("length"):
		k = fit.length / max(box.size.x, box.size.z, 0.001)
	node.scale = Vector3.ONE * k
	var big: bool = max(box.size.x, box.size.y, box.size.z) * k > 1.0
	for mi in node.find_children("*", "MeshInstance3D", true, false):
		(mi as MeshInstance3D).cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if big else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		# lamp glass glows warm, as if lit from inside
		var mesh: Mesh = mi.mesh
		for s in mesh.get_surface_count():
			var mat := mesh.surface_get_material(s)
			if mat is StandardMaterial3D and mat.resource_name.to_lower().contains("glass"):
				var lit := (mat as StandardMaterial3D).duplicate() as StandardMaterial3D
				lit.albedo_color = Color("#ffc888")
				lit.emission_enabled = true
				lit.emission = Color("#ffa24a")
				lit.emission_energy_multiplier = 1.3
				mi.set_surface_override_material(s, lit)
	return node


## Bounding box of a model in its own space (before scaling).
static func aabb(node: Node3D) -> AABB:
	var out := AABB()
	var first := true
	for mi in node.find_children("*", "MeshInstance3D", true, false):
		var t := Transform3D()
		var n: Node = mi
		while n and n != node:
			t = (n as Node3D).transform * t
			n = n.get_parent()
		var b := t * (mi as MeshInstance3D).get_aabb()
		out = b if first else out.merge(b)
		first = false
	return out


# ---------- shared pieces ----------

static func painting(w: float, h: float, img: Image) -> Node3D:
	var pm := StandardMaterial3D.new()
	pm.albedo_texture = ImageTexture.create_from_image(img)
	pm.roughness = 0.6
	var pic := Geo.quad(w, h, pm, 0, 0, 0.06)
	return Geo.group([Geo.box(w + 0.3, h + 0.3, 0.1, Mats.gold()), pic])


static func books(w: float, h: float, seed_value: int) -> Node3D:
	var r := RandomNumberGenerator.new()
	r.seed = seed_value
	var cols := [0x7a2a2a, 0x2a4a7a, 0x2f6a3a, 0x8a6a2a, 0x5a2a6a, 0x3a3a3a, 0x9a4a2a]
	var g := Node3D.new()
	var x := -w / 2.0 + 0.05
	while x < w / 2.0 - 0.12:
		var bw := 0.07 + r.randf() * 0.08
		var bh := h * (0.7 + r.randf() * 0.28)
		g.add_child(Geo.box(bw, bh, 0.28, m(cols[r.randi_range(0, cols.size() - 1)], { roughness = 0.8 }), x + bw / 2.0, bh / 2.0, 0))
		x += bw + 0.01
	return g


static func shelf_unit(w: float, h: float, levels: int, seed_value: int, chained := false) -> Node3D:
	var g := Geo.group([Geo.box(w, h, 0.45, Mats.darkwood(), 0, h / 2.0, -0.05)])
	for i in levels:
		var y := 0.15 + i * (h - 0.3) / levels
		g.add_child(Geo.box(w - 0.1, 0.05, 0.42, Mats.wood(), 0, y, 0.0))
		var b := books(w - 0.2, (h - 0.3) / levels - 0.12, seed_value + i)
		b.position = Vector3(0, y + 0.03, 0.05)
		g.add_child(b)
	if chained:
		for i in 3:
			var y := 0.6 + i * 1.1
			for k in range(-4, 5):
				var l := Geo.torus(0.07, 0.018, m(0x9a9aa2, { metal = 0.7, roughness = 0.4 }), k * 0.13 * (w / 1.2), y, 0.28, TAU, 6, 12)
				l.rotation.y = PI / 2.0 if k % 2 else 0.0
				g.add_child(l)
		g.add_child(Geo.box(0.22, 0.26, 0.1, Mats.gold(), 0, 1.7, 0.32))
		g.add_child(Geo.torus(0.07, 0.02, Mats.gold(), 0, 1.86, 0.32, PI, 6, 12))
	return g


## A picture painted from simple shapes: [kind, color, ...] in 0..1 coordinates.
static func paint(size: int, bg: Color, shapes: Array) -> Image:
	var img := Image.create(size, size, false, Image.FORMAT_RGB8)
	img.fill(bg)
	for s in shapes:
		var c: Color = s[1]
		match s[0]:
			"rect":
				img.fill_rect(Rect2i(int(s[2] * size), int(s[3] * size), int(s[4] * size), int(s[5] * size)), c)
			"circle":
				var cx: float = s[2] * size
				var cy: float = s[3] * size
				var r: float = s[4] * size
				for y in range(int(cy - r), int(cy + r) + 1):
					for x in range(int(cx - r), int(cx + r) + 1):
						if x >= 0 and y >= 0 and x < size and y < size and Vector2(x - cx, y - cy).length() <= r:
							img.set_pixel(x, y, c)
			"tri":
				var pts := PackedVector2Array([Vector2(s[2], s[3]) * size, Vector2(s[4], s[5]) * size, Vector2(s[6], s[7]) * size])
				for y in size:
					for x in size:
						if Geometry2D.is_point_in_polygon(Vector2(x, y), pts):
							img.set_pixel(x, y, c)
	# soft varnish and canvas grain so it reads as paint, not a flat graphic
	var rng := RandomNumberGenerator.new()
	rng.seed = size
	for y in size:
		for x in size:
			var px := img.get_pixel(x, y)
			var v := 0.92 + rng.randf() * 0.1 - Vector2(x - size / 2.0, y - size / 2.0).length() / size * 0.35
			img.set_pixel(x, y, Color(px.r * v, px.g * v * 0.98, px.b * v * 0.92))
	return img


# ---------- the 40 station objects ----------

static func gate() -> Node3D:
	var g := Geo.group([Geo.box(1, 5, 1, Mats.stone(), -2.5, 2.5, -0.4), Geo.box(1, 5, 1, Mats.stone(), 2.5, 2.5, -0.4), Geo.box(6, 0.8, 1, Mats.stone(), 0, 5.1, -0.4)])
	for i in range(-4, 5):
		g.add_child(Geo.cyl(0.05, 0.05, 4.6, Mats.iron(), i * 0.45, 2.3, -0.4, 6))
		g.add_child(Geo.cone(0.09, 0.25, Mats.iron(), i * 0.45, 4.7, -0.4, 6))
	g.add_child(Geo.box(4, 0.12, 0.12, Mats.iron(), 0, 1.2, -0.4))
	g.add_child(Geo.box(4, 0.12, 0.12, Mats.iron(), 0, 3.4, -0.4))
	g.add_child(Geo.sph(0.35, Mats.gold(), 0, 5.7, -0.1))
	return g


static func fountain() -> Node3D:
	var water := m(0x0e151b, { roughness = 0.04, metal = 0.2 })
	var rim := Geo.torus(0.7, 0.05, Mats.stone(), 0, 2.2, 0)
	rim.rotation.x = PI / 2.0
	var g := Geo.group([Geo.cyl(1.4, 1.5, 0.6, Mats.stone(), 0, 0.3, 0, 32), Geo.cyl(1.25, 1.25, 0.05, water, 0, 0.55, 0, 32),
		Geo.cyl(0.2, 0.3, 1.6, Mats.stone(), 0, 1.2, 0, 16), Geo.cyl(0.7, 0.3, 0.3, Mats.stone(), 0, 2.05, 0, 24),
		Geo.cyl(0.6, 0.6, 0.04, water, 0, 2.18, 0, 24), rim, Geo.cyl(0.07, 0.1, 0.3, Mats.stone(), 0, 2.32, 0, 10)])
	# a thin veil of water spilling over the upper tier
	var veil_mat := ShaderMaterial.new()
	veil_mat.shader = load("res://shaders/water_veil.gdshader")
	var veil := Geo.cyl(0.72, 0.8, 1.62, veil_mat, 0, 1.38, 0, 32, true)
	veil.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	g.add_child(veil)
	var jet := Geo.cyl(0.018, 0.03, 0.32, veil_mat, 0, 2.6, 0, 8, true)
	g.add_child(jet)
	return g


static func tree() -> Node3D:
	var bark := Mats.mat(0xffffff, { roughness = 0.95, tex = "bark" })
	var g := Geo.group([_gnarled_tree(7, bark)])
	var leaf := m(0x5a4426, { roughness = 0.7, double = true })
	var r := RandomNumberGenerator.new()
	r.seed = 17
	for i in 40:
		var a := r.randf() * TAU
		var d := 0.5 + r.randf() * 1.8
		var l := Geo.cyl(0.06 + r.randf() * 0.04, 0.06, 0.004, leaf, cos(a) * d, 0.012, sin(a) * d, 5)
		l.rotation = Vector3((r.randf() - 0.5) * 0.3, r.randf() * 6.0, 0)
		g.add_child(l)
	return g


## An old, gnarled, leafless oak: a twisting trunk, root flare, limbs that fork twice.
static func _gnarled_tree(seed_value: int, bark: Material) -> MeshInstance3D:
	var r := RandomNumberGenerator.new()
	r.seed = seed_value
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var meshes := []
	var limb := func(self_ref: Callable, start: Vector3, dir: Vector3, length: float, r0: float, r1: float, depth: int) -> void:
		var pts := [start]
		var p := start
		var d := dir.normalized()
		for i in range(1, 6):
			d = (d + Vector3((r.randf() - 0.5) * 0.55, (r.randf() - 0.5) * 0.35 - depth * 0.04, (r.randf() - 0.5) * 0.55)).normalized()
			p = p + d * length / 5.0
			pts.append(p)
		meshes.append(Geo.tube_mesh(pts, r0, r1, 14 if depth < 2 else 8, 12 if depth < 1 else (8 if depth < 2 else 5)))
		if depth >= 3:
			return
		var kids := 3 if depth == 0 else 2 + (1 if r.randf() < 0.5 else 0)
		for k in kids:
			var t := 0.62 + k * 0.13 if depth == 0 else 0.45 + r.randf() * 0.5
			var idx := clampi(int(t * 5.0), 0, 4)
			var at: Vector3 = pts[idx].lerp(pts[idx + 1], t * 5.0 - idx)
			var tan: Vector3 = (pts[idx + 1] - pts[idx]).normalized()
			var yaw := float(k) / kids * TAU + r.randf() * 1.2
			var out := Vector3(cos(yaw), 0, sin(yaw))
			var nd := tan * 0.8 + out * (0.9 if depth == 0 else 0.7) + Vector3(0, 0.25, 0)
			var rr := r0 + (r1 - r0) * t
			self_ref.call(self_ref, at, nd, length * (0.55 + r.randf() * 0.2), rr * 0.62, rr * 0.18, depth + 1)
	limb.call(limb, Vector3.ZERO, Vector3(0.15, 1, 0.05), 3.3, 0.36, 0.2, 0)
	for k in 5:
		var a := float(k) / 5.0 * TAU + r.randf() * 0.6
		var o := Vector3(cos(a), 0, sin(a))
		meshes.append(Geo.tube_mesh([Vector3(0, 0.6, 0), o * 0.35 + Vector3(0, 0.25, 0), o * 0.95 + Vector3(0, 0.02, 0), o * 1.3 + Vector3(0, -0.08, 0)], 0.2, 0.03, 8, 8))
	for mesh in meshes:
		st.append_from(mesh, 0, Transform3D())
	var mi := MeshInstance3D.new()
	mi.mesh = st.commit()
	mi.material_override = bark
	return mi


static func well() -> Node3D:
	var rim := Geo.torus(0.96, 0.1, Mats.stone(), 0, 0.95, 0)
	rim.rotation.x = PI / 2.0
	var g := Geo.group([Geo.cyl(1.0, 1.08, 0.95, Mats.stone(), 0, 0.47, 0, 24), Geo.cyl(0.84, 0.84, 0.04, m(0x0c1218, { roughness = 0.04, metal = 0.3 }), 0, 0.55, 0, 24), rim])
	for sx in [-0.88, 0.88]:
		g.add_child(Geo.box(0.14, 2.3, 0.14, Mats.darkwood(), sx, 1.15, 0))
	g.add_child(Geo.rot_z(Geo.box(1.4, 0.07, 1.5, Mats.wood(), -0.5, 2.45, 0), 0.62))
	g.add_child(Geo.rot_z(Geo.box(1.4, 0.07, 1.5, Mats.wood(), 0.5, 2.45, 0), -0.62))
	g.add_child(Geo.rot_z(Geo.cyl(0.09, 0.09, 1.8, Mats.wood(), 0, 1.85, 0, 10), PI / 2.0))
	g.add_child(Geo.box(0.05, 0.4, 0.05, Mats.iron(), 0.98, 1.68, 0.12))
	g.add_child(Geo.cyl(0.012, 0.012, 1.1, m(0x8a7a5a), 0, 1.3, 0, 4))
	return g


static func sundial() -> Node3D:
	var g := Geo.group([Geo.cyl(0.25, 0.35, 1.1, Mats.stone(), 0, 0.55, 0, 10), Geo.cyl(0.55, 0.55, 0.06, Mats.gold(), 0, 1.13, 0, 24)])
	g.add_child(Geo.rot_x(Geo.box(0.03, 0.4, 0.45, Mats.gold(), 0, 1.33, 0), -0.4))
	for i in 12:
		g.add_child(Geo.box(0.03, 0.02, 0.12, m(0x3a2a10), sin(i / 12.0 * TAU) * 0.45, 1.17, cos(i / 12.0 * TAU) * 0.45))
	return g


static func _hourglass_frame(color: Color) -> Node3D:
	var sand := Mats.glow(color, 1.2)
	var glass := m(0xccddee, { alpha = 0.35, roughness = 0.05 })
	return Geo.group([
		Geo.box(0.5, 0.06, 0.5, Mats.gold(), 0, 0.03, 0), Geo.box(0.5, 0.06, 0.5, Mats.gold(), 0, 1.47, 0),
		Geo.cyl(0.03, 0.03, 1.44, Mats.gold(), 0.21, 0.75, 0.21, 6), Geo.cyl(0.03, 0.03, 1.44, Mats.gold(), -0.21, 0.75, -0.21, 6),
		Geo.cyl(0.03, 0.03, 1.44, Mats.gold(), 0.21, 0.75, -0.21, 6), Geo.cyl(0.03, 0.03, 1.44, Mats.gold(), -0.21, 0.75, 0.21, 6),
		Geo.cone(0.18, 0.6, glass, 0, 1.12, 0), Geo.rot_x(Geo.cone(0.18, 0.6, glass, 0, 0.38, 0), PI),
		Geo.cone(0.12, 0.25, sand, 0, 1.05, 0), Geo.cyl(0.17, 0.17, 0.22, sand, 0, 0.17, 0)])


static func hourglass() -> Node3D:
	var g := Geo.group([Geo.cyl(0.55, 0.65, 0.9, Mats.stone(), 0, 0.45, 0, 16), Geo.cyl(0.62, 0.62, 0.08, Mats.gold(), 0, 0.92, 0, 16)])
	var h := _hourglass_frame(Color("#e8c060"))
	h.scale = Vector3.ONE * 1.55
	h.position.y = 0.96
	h.set_meta("dynamic", true)
	g.add_child(h)
	var top: Node3D = h.get_child(8)
	var bottom: Node3D = h.get_child(9)
	Geo.anims.append(func(t, _dt):
		var k := fmod(t * 0.03, 1.0)
		top.scale = Vector3(1.0 - k * 0.8, 1.0 - k * 0.9, 1.0 - k * 0.8)
		bottom.scale = Vector3(1, 0.3 + k * 0.9, 1))
	return g


static func clock() -> Node3D:
	var face := Geo.cyl(0.36, 0.36, 0.05, m(0xf1ead6), 0, 2.15, 0.17, 24)
	face.rotation.x = PI / 2.0
	return Geo.group([Geo.box(0.9, 2.6, 0.5, Mats.darkwood(), 0, 1.3, -0.1), Geo.box(1.0, 0.25, 0.55, Mats.wood(), 0, 2.72, -0.1), face,
		Geo.torus(0.36, 0.04, Mats.gold(), 0, 2.15, 0.17)])


static func staircase() -> Node3D:
	var g := Node3D.new()
	for i in 9:
		var hh := (i + 1) * 0.38
		var d := 0.32
		g.add_child(Geo.box(5.4, hh, d, Mats.mat(0xffffff, { tex = "marble", tint = Color("#b8b0a2") if i % 2 else Color("#c4bcae") }), 0, hh / 2.0, 1.2 - i * d - d / 2.0))
	g.add_child(Geo.box(5.6, 0.12, 2.9, m(0x6b1d22, { roughness = 0.95 }), 0, 3.48, -0.25))
	for sx in [-2.85, 2.85]:
		g.add_child(Geo.rot_x(Geo.box(0.12, 0.12, 3.5, Mats.darkwood(), sx, 2.3, -0.3), -0.85))
		for i in 5:
			g.add_child(Geo.cyl(0.04, 0.04, 1.0, Mats.gold(), sx, 0.9 + i * 0.62, 1.0 - i * 0.62, 6))
		g.add_child(Geo.sph(0.16, Mats.gold(), sx, 1.25, 1.2))
	return g


static func armour() -> Node3D:
	var steel := m(0xb8bcc4, { metal = 0.9, roughness = 0.35 })
	var dark := m(0x5a5e66, { metal = 0.8, roughness = 0.5 })
	return Geo.group([Geo.box(0.6, 0.15, 0.4, Mats.stone(), 0, 0.07, 0),
		Geo.cyl(0.09, 0.08, 0.85, steel, -0.13, 0.57, 0, 8), Geo.cyl(0.09, 0.08, 0.85, steel, 0.13, 0.57, 0, 8),
		Geo.box(0.5, 0.65, 0.3, steel, 0, 1.3, 0), Geo.cyl(0.27, 0.22, 0.25, dark, 0, 0.98, 0, 10),
		Geo.sph(0.16, steel, 0, 1.82, 0), Geo.box(0.18, 0.04, 0.05, m(0x111111), 0, 1.84, 0.14), Geo.cone(0.05, 0.3, m(0xb03030), 0, 2.05, -0.04, 6),
		Geo.sph(0.12, steel, -0.33, 1.55, 0), Geo.sph(0.12, steel, 0.33, 1.55, 0),
		Geo.cyl(0.06, 0.06, 0.6, steel, -0.34, 1.2, 0.05, 8), Geo.cyl(0.06, 0.06, 0.6, steel, 0.34, 1.2, 0.05, 8),
		Geo.cyl(0.025, 0.025, 2.5, Mats.darkwood(), 0.42, 1.3, 0.18, 6), Geo.box(0.4, 0.3, 0.03, steel, 0.42, 2.45, 0.18), Geo.cone(0.05, 0.3, steel, 0.42, 2.7, 0.18, 6)])


static func knightportrait() -> Node3D:
	var img := paint(256, Color("#2b3b2a"), [["rect", Color("#5a3a1a"), 0, 0.8, 1, 0.2], ["rect", Color("#9aa0aa"), 0.36, 0.32, 0.28, 0.4],
		["circle", Color("#9aa0aa"), 0.5, 0.24, 0.11], ["rect", Color("#111111"), 0.43, 0.22, 0.14, 0.025], ["rect", Color("#b02a2a"), 0.36, 0.42, 0.28, 0.06],
		["rect", Color("#c9a23a"), 0.7, 0.15, 0.03, 0.6], ["rect", Color("#c9a23a"), 0.64, 0.3, 0.15, 0.03]])
	var p := painting(1.7, 2.3, img)
	p.position = Vector3(0, 3.0, -0.1)
	return Geo.group([p])


static func harp() -> Node3D:
	var gold := Mats.gold()
	var wood := m(0x9a6230, { roughness = 0.45, tex = "beam", tint = Color("#c08a58") })
	var g := Geo.group([Geo.box(0.8, 0.12, 0.5, Mats.darkwood(), 0.05, 0.06, 0)])
	g.add_child(Geo.cyl(0.05, 0.075, 1.95, gold, -0.32, 1.05, 0, 10))
	g.add_child(Geo.rot_z(Geo.box(0.24, 2.0, 0.2, wood, 0.28, 1.02, 0), -0.3))
	g.add_child(Geo.tube([Vector3(-0.32, 2.0, 0), Vector3(-0.08, 2.2, 0), Vector3(0.25, 1.98, 0), Vector3(0.6, 1.98, 0)], 0.06, 0.06, gold, 24, 8))
	var string_mat := m(0xe8dcc0, { metal = 0.6, roughness = 0.3 })
	for i in 13:
		var x := -0.24 + i * 0.065
		var y_top := 2.02 + sin((x + 0.32) / 0.92 * PI) * 0.12
		var y_bot := 0.25 + (x + 0.3) * 1.05
		g.add_child(Geo.cyl(0.005, 0.005, y_top - y_bot, string_mat, x, (y_top + y_bot) / 2.0, 0, 4))
	return g


static func longtable() -> Node3D:
	var g := Geo.group([Geo.box(7, 0.14, 1.6, Mats.wood(), 0, 0.85, 0)])
	for lx in [-3.2, 0.0, 3.2]:
		for lz in [-0.65, 0.65]:
			g.add_child(Geo.box(0.14, 0.8, 0.14, Mats.darkwood(), lx, 0.4, lz))
	for bz in [-1.2, 1.2]:
		g.add_child(Geo.box(6.8, 0.1, 0.4, Mats.darkwood(), 0, 0.5, bz))
		g.add_child(Geo.box(0.1, 0.45, 0.3, Mats.darkwood(), -3, 0.22, bz))
		g.add_child(Geo.box(0.1, 0.45, 0.3, Mats.darkwood(), 3, 0.22, bz))
	var plate := m(0xd6d0c0, { roughness = 0.3 })
	for i in 7:
		var x := -3.0 + i
		for z in [-0.45, 0.45]:
			g.add_child(Geo.cyl(0.18, 0.18, 0.02, plate, x, 0.93, z, 16))
			g.add_child(Geo.cyl(0.06, 0.03, 0.12, Mats.gold(), x + 0.25, 1.0, z, 8))
			g.add_child(Geo.cyl(0.015, 0.015, 0.1, Mats.gold(), x + 0.25, 0.97, z, 6))
			g.add_child(Geo.cyl(0.07, 0.07, 0.01, Mats.gold(), x + 0.25, 0.925, z, 8))
	var loaf := Geo.sph(0.22, m(0x7a4a24, { roughness = 0.9 }), 0, 1.02, 0, 16, 10)
	loaf.scale = Vector3(1.5, 0.62, 0.95)
	g.add_child(Geo.box(0.7, 0.04, 0.4, Mats.darkwood(), 0, 0.94, 0))
	g.add_child(loaf)
	g.add_child(Geo.cyl(0.2, 0.2, 0.13, m(0xc9a256, { roughness = 0.75 }), -1.5, 0.99, 0, 20))
	g.add_child(Geo.cyl(0.26, 0.24, 0.03, m(0x8c8c88, { metal = 0.8, roughness = 0.45 }), 1.5, 0.94, 0, 24))
	return g


static func fireplace() -> Node3D:
	var g := Geo.group([Geo.box(3, 0.4, 0.9, Mats.stone(), 0, 0.2, -0.2), Geo.box(0.6, 2.6, 0.9, Mats.stone(), -1.2, 1.3, -0.2), Geo.box(0.6, 2.6, 0.9, Mats.stone(), 1.2, 1.3, -0.2),
		Geo.box(3.4, 0.4, 1.1, Mats.mat(0xffffff, { tex = "ashlar", tint = Color("#c8c0b0") }), 0, 2.75, -0.15), Geo.box(1.8, 2.2, 0.1, m(0x1a1410), 0, 1.4, -0.6),
		Geo.box(2.4, 3.6, 0.6, Mats.mat(0xffffff, { tex = "ashlar", tint = Color("#a8a090") }), 0, 4.75, -0.35)])
	for i in 3:
		g.add_child(Geo.rot_z(Geo.cyl(0.1, 0.1, 1.2, Mats.mat(0xffffff, { tex = "bark" }), 0, 0.55, -0.25 + i * 0.12, 8), PI / 2.0 + (i - 1) * 0.3))
	for i in 5:
		var f := Geo.flame(2.2 + (i % 2) * 0.8)
		f.position = Vector3(-0.6 + i * 0.3, 0.55, -0.2)
		g.add_child(f)
	var glow := Geo.glow(Color(1.0, 0.55, 0.16, 0.9), 3.2)
	glow.position = Vector3(0, 1.0, 0.1)
	g.add_child(glow)
	for i in 3:
		g.add_child(Geo.cyl(0.12, 0.1, 0.35, m([0x2a4a8a, 0x8a2a2a, 0x2f6a3a][i], { roughness = 0.4 }), -0.9 + i * 0.9, 3.12, -0.1, 10))
	g.add_child(Geo.light(0, 1.2, 0.9, Color("#ff8a3a"), 60, 16, "fire", true))
	return g


static func lectern() -> Node3D:
	var gold := Mats.gold()
	var g := Geo.group([Geo.cyl(0.35, 0.45, 0.2, Mats.stone(), 0, 0.1, 0, 12), Geo.cyl(0.1, 0.14, 1.1, gold, 0, 0.75, 0, 10), Geo.sph(0.28, gold, 0, 1.25, 0, 12, 10)])
	var body := Geo.sph(0.32, gold, 0, 1.62, 0, 14, 12)
	body.scale = Vector3(0.9, 1.25, 0.8)
	g.add_child(body)
	g.add_child(Geo.sph(0.17, gold, 0, 2.05, 0.1, 14, 12))
	g.add_child(Geo.rot_x(Geo.cone(0.06, 0.2, gold, 0, 2.02, 0.28, 8), PI / 2.4))
	g.add_child(Geo.sph(0.03, m(0x111111, { roughness = 0.2 }), -0.08, 2.1, 0.22, 6, 4))
	g.add_child(Geo.sph(0.03, m(0x111111, { roughness = 0.2 }), 0.08, 2.1, 0.22, 6, 4))
	for sx in [-1.0, 1.0]:
		g.add_child(Geo.rot_z(Geo.box(0.75, 0.06, 0.45, gold, sx * 0.42, 1.88, -0.02), sx * 0.35))
		for k in 4:
			g.add_child(Geo.rot_z(Geo.box(0.16, 0.04, 0.12, gold, sx * (0.72 + k * 0.04), 1.98 + k * 0.02, -0.18 + k * 0.11), sx * 0.5))
	var page := m(0xf2ead6)
	g.add_child(Geo.rot_z(Geo.box(0.42, 0.03, 0.5, page, -0.22, 2.05, 0), 0.25))
	g.add_child(Geo.rot_z(Geo.box(0.42, 0.03, 0.5, page, 0.22, 2.05, 0), -0.25))
	g.add_child(Geo.box(0.04, 0.05, 0.52, m(0x5a1a1a), 0, 2.0, 0))
	return g


static func throne() -> Node3D:
	var velvet := Mats.velvet()
	var gold := Mats.gold()
	return Geo.group([Geo.box(2.4, 0.3, 2.2, Mats.stone(), 0, 0.15, -0.5), Geo.box(2.6, 0.06, 2.4, m(0x6b1d22, { roughness = 0.95 }), 0, 0.31, -0.5),
		Geo.box(1.1, 0.5, 0.9, gold, 0, 0.6, -0.4), Geo.box(1.0, 0.15, 0.85, velvet, 0, 0.92, -0.38),
		Geo.box(1.1, 2.6, 0.18, gold, 0, 2.1, -0.9), Geo.box(0.85, 2.2, 0.06, velvet, 0, 2.0, -0.8),
		Geo.box(0.14, 0.5, 0.9, gold, -0.55, 1.15, -0.4), Geo.box(0.14, 0.5, 0.9, gold, 0.55, 1.15, -0.4),
		Geo.sph(0.12, gold, -0.55, 3.45, -0.9), Geo.sph(0.12, gold, 0.55, 3.45, -0.9), Geo.cone(0.2, 0.5, gold, 0, 3.6, -0.9, 4)])


static func mirror() -> Node3D:
	return Geo.group([Geo.box(1.3, 2.9, 0.14, Mats.gold(), 0, 1.75, -0.15), Geo.box(1.05, 2.6, 0.02, m(0x9fc6e8, { emissive = 0x284a6a, metal = 0.8, roughness = 0.05 }), 0, 1.75, -0.07),
		Geo.sph(0.18, Mats.gold(), 0, 3.3, -0.15), Geo.box(1.5, 0.14, 0.3, Mats.gold(), 0, 0.3, -0.1)])


static func ladyportrait() -> Node3D:
	var shapes := [["tri", Color("#6a2a5a"), 0.25, 1.0, 0.5, 0.42, 0.75, 1.0], ["circle", Color("#7a4a1a"), 0.5, 0.29, 0.12],
		["circle", Color("#e8c8a8"), 0.5, 0.33, 0.1]]
	for i in 7:
		shapes.append(["circle", Color("#e8d070"), 0.4 + i * 0.033, 0.46, 0.012])
	var p := painting(1.6, 2.1, paint(256, Color("#3a2a4a"), shapes))
	p.position = Vector3(0, 2.9, -0.1)
	return Geo.group([p])


static func tapestry() -> Node3D:
	var img := paint(256, Color("#20402a"), [["rect", Color("#c9a23a"), 0.03, 0.03, 0.94, 0.02], ["rect", Color("#c9a23a"), 0.03, 0.95, 0.94, 0.02],
		["tri", Color("#b02a2a"), 0.2, 0.7, 0.6, 0.45, 0.78, 0.2], ["tri", Color("#b02a2a"), 0.45, 0.48, 0.3, 0.22, 0.6, 0.42],
		["tri", Color("#b02a2a"), 0.2, 0.7, 0.55, 0.6, 0.85, 0.28], ["tri", Color("#f0a030"), 0.85, 0.24, 0.95, 0.18, 0.92, 0.3]])
	var cm := StandardMaterial3D.new()
	cm.albedo_texture = ImageTexture.create_from_image(img)
	cm.roughness = 0.95
	cm.cull_mode = BaseMaterial3D.CULL_DISABLED
	var cloth := Geo.quad(2.2, 3.4, cm, 0, 3.2, -0.05)
	return Geo.group([cloth, Geo.rot_z(Geo.cyl(0.05, 0.05, 2.6, Mats.gold(), 0, 4.95, 0, 8), PI / 2.0)])


static func vase() -> Node3D:
	var v := Geo.lathe([[0.2, 0], [0.42, 0.25], [0.5, 0.6], [0.38, 1.0], [0.18, 1.25], [0.22, 1.45]], m(0x2a5aa8, { roughness = 0.2 }), 20)
	v.position.y = 0.9
	return Geo.group([Geo.box(0.8, 0.9, 0.8, m(0xd8d2c4), 0, 0.45, 0), v])


static func bust() -> Node3D:
	var marble := Mats.marble()
	var plinth := m(0x9a948a, { roughness = 0.6 })
	var g := Geo.group([Geo.cyl(0.3, 0.35, 1.2, plinth, 0, 0.6, 0, 12), Geo.box(0.75, 0.1, 0.75, plinth, 0, 1.25, 0),
		Geo.box(0.6, 0.45, 0.35, marble, 0, 1.52, 0), Geo.sph(0.22, marble, 0, 1.98, 0.02), Geo.cyl(0.09, 0.1, 0.18, marble, 0, 1.78, 0, 10)])
	return g


static func bookshelf() -> Node3D:
	return shelf_unit(2.4, 4, 6, 41)


static func chained() -> Node3D:
	return shelf_unit(2.4, 3.8, 5, 71, true)


static func desk() -> Node3D:
	var g := Geo.group([Geo.box(1.8, 0.1, 0.9, Mats.wood(), 0, 0.85, 0)])
	for lx in [-0.8, 0.8]:
		for lz in [-0.38, 0.38]:
			g.add_child(Geo.box(0.08, 0.8, 0.08, Mats.darkwood(), lx, 0.4, lz))
	var page := m(0xf2ead6)
	g.add_child(Geo.rot_z(Geo.box(0.4, 0.02, 0.55, page, -0.2, 0.93, 0.05), 0.1))
	g.add_child(Geo.rot_z(Geo.box(0.4, 0.02, 0.55, page, 0.2, 0.93, 0.05), -0.1))
	g.add_child(Geo.box(0.06, 0.04, 0.56, m(0x5a2a1a), 0, 0.91, 0.05))
	g.add_child(Geo.cyl(0.05, 0.06, 0.25, m(0xf0e8d0), 0.65, 1.02, -0.2, 8))
	var f := Geo.flame(0.8)
	f.position = Vector3(0.65, 1.15, -0.2)
	g.add_child(f)
	g.add_child(Geo.cyl(0.02, 0.0, 0.35, m(0xeeeeee), -0.6, 1.05, -0.25, 6))
	g.add_child(Geo.cyl(0.07, 0.07, 0.1, m(0x1a1a2a), -0.6, 0.95, -0.25, 8))
	g.add_child(Geo.box(0.6, 0.08, 0.6, Mats.darkwood(), 0, 0.5, -0.9))
	g.add_child(Geo.box(0.6, 0.9, 0.08, Mats.darkwood(), 0, 0.95, -1.18))
	g.add_child(Geo.light(0.65, 1.4, -0.2, Color("#ffb060"), 6, 5, "candle"))
	return g


static func globe() -> Node3D:
	var shapes := []
	var r := RandomNumberGenerator.new()
	r.seed = 31
	for i in 9:
		shapes.append(["circle", Color("#c8b070"), r.randf(), 0.2 + r.randf() * 0.6, 0.05 + r.randf() * 0.08])
	var gm := StandardMaterial3D.new()
	gm.albedo_texture = ImageTexture.create_from_image(paint(256, Color("#2a5a8a"), shapes))
	gm.roughness = 0.35
	var ball := Geo.sph(0.75, gm, 0, 2.0, 0, 24, 16)
	ball.rotation.z = 0.4
	Geo.spin(ball, 0.25)
	return Geo.group([Geo.cyl(0.45, 0.6, 0.15, Mats.darkwood(), 0, 0.08, 0, 12), Geo.cyl(0.08, 0.12, 1.1, Mats.wood(), 0, 0.7, 0, 10),
		Geo.torus(0.85, 0.04, Mats.gold(), 0, 2.0, 0), ball])


static func armchair() -> Node3D:
	var red := m(0x8a2a2a, { roughness = 0.9 })
	var g := Geo.group([Geo.box(1.2, 0.5, 1.0, red, 0, 0.45, 0), Geo.box(1.2, 1.1, 0.25, red, 0, 1.1, -0.42), Geo.box(0.22, 0.75, 1.0, red, -0.6, 0.65, 0), Geo.box(0.22, 0.75, 1.0, red, 0.6, 0.65, 0),
		Geo.box(1.0, 0.12, 0.8, m(0xa83a3a), 0, 0.75, 0.05)])
	for lx in [-0.5, 0.5]:
		for lz in [-0.4, 0.4]:
			g.add_child(Geo.cyl(0.05, 0.04, 0.2, Mats.darkwood(), lx, 0.1, lz, 6))
	g.add_child(Geo.cyl(0.03, 0.03, 1.9, Mats.gold(), 1.1, 0.95, -0.3, 6))
	g.add_child(Geo.cyl(0.2, 0.25, 0.05, Mats.gold(), 1.1, 0.03, -0.3, 10))
	g.add_child(Geo.cone(0.32, 0.4, m(0xe8d6a0, { emissive = 0x6a5020 }), 1.1, 1.95, -0.3, 12))
	var glow := Geo.glow(Color(1.0, 0.86, 0.6, 0.8), 1.2)
	glow.position = Vector3(1.1, 1.85, -0.3)
	g.add_child(glow)
	g.add_child(Geo.light(1.1, 1.8, -0.3, Color("#ffd09a"), 14, 7, "lamp"))
	return g


static func potions() -> Node3D:
	var g := Geo.group([Geo.box(2.6, 2.6, 0.45, Mats.darkwood(), 0, 1.3, -0.1)])
	var r := RandomNumberGenerator.new()
	r.seed = 51
	# old apothecary glass: amber, green, cobalt, clear
	var cols := [0x8a5a20, 0x2f5a30, 0x23407a, 0x6a2a2a, 0xa8a090, 0x4a3a5a]
	for lvl in 3:
		var y := 0.35 + lvl * 0.8
		g.add_child(Geo.box(2.5, 0.05, 0.45, Mats.wood(), 0, y, 0.0))
		for i in 7:
			var c: int = cols[r.randi_range(0, cols.size() - 1)]
			var hh := 0.2 + r.randf() * 0.25
			var bottle := Geo.group([Geo.cyl(0.08, 0.1, hh, m(c, { alpha = 0.85, roughness = 0.08, metal = 0.1 }), 0, hh / 2.0, 0, 10),
				Geo.cyl(0.03, 0.03, 0.1, m(0xddddcc), 0, hh + 0.05, 0, 6)])
			bottle.position = Vector3(-1.05 + i * 0.35, y + 0.03, 0.05)
			g.add_child(bottle)
	return g


static func cauldron() -> Node3D:
	var brew := m(0x23402a, { emissive = 0x2e8a44, energy = 0.55, roughness = 0.15 })
	var pot := Geo.sph(0.85, m(0x1c1c20, { double = true, metal = 0.6, roughness = 0.6 }), 0, 0.95, 0, 20, 14)
	var rim := Geo.torus(0.62, 0.07, m(0x2a2a30, { metal = 0.6 }), 0, 1.55, 0)
	rim.rotation.x = PI / 2.0
	var g := Geo.group([pot, rim, Geo.cyl(0.6, 0.6, 0.05, brew, 0, 1.45, 0, 20)])
	for i in 3:
		var a := i / 3.0 * TAU
		g.add_child(Geo.rot_z(Geo.cyl(0.06, 0.04, 0.5, m(0x1c1c20), cos(a) * 0.55, 0.2, sin(a) * 0.55, 6), 0.2))
	var bubbles := Node3D.new()
	bubbles.set_meta("dynamic", true)
	g.add_child(bubbles)
	for i in 6:
		var bub := Geo.sph(0.06 + randf() * 0.05, brew, (randf() - 0.5) * 0.8, 1.5, (randf() - 0.5) * 0.8, 8, 6)
		var ph := randf() * 3.0
		bubbles.add_child(bub)
		Geo.anims.append(func(t, _dt):
			var k := fmod(t * 0.8 + ph, 1.6) / 1.6
			bub.position.y = 1.47 + k * 0.9
			bub.scale = Vector3.ONE * (1.0 - k))
	var glow := Geo.glow(Color(0.5, 0.86, 0.6, 0.45), 1.6)
	glow.position.y = 1.65
	g.add_child(glow)
	g.add_child(Geo.flame(2.2))
	g.add_child(Geo.light(0, 2.0, 0, Color("#8ad49a"), 9, 7, "magic"))
	return g


static func barrels() -> Node3D:
	var g := Node3D.new()
	for p in [[-0.55, 0, 0], [0.55, 0, 0], [0, 0.95, 0]]:
		var b := Geo.group([Geo.cyl(0.48, 0.48, 0.95, Mats.mat(0xffffff, { tex = "oak" }), 0, 0.47, 0, 14)])
		b.position = Vector3(p[0], p[1], p[2])
		g.add_child(b)
	return g


static func scales() -> Node3D:
	var brass := m(0xc89a3a, { metal = 1.0, roughness = 0.4 })
	var g := Geo.group([Geo.box(2.0, 0.12, 0.9, Mats.wood(), 0, 0.9, -0.05)])
	for lx in [-0.9, 0.9]:
		for lz in [-0.4, 0.3]:
			g.add_child(Geo.box(0.1, 0.85, 0.1, Mats.darkwood(), lx, 0.43, lz))
	g.add_child(Geo.cyl(0.15, 0.2, 0.06, brass, 0, 0.99, 0, 12))
	g.add_child(Geo.cyl(0.03, 0.03, 0.9, brass, 0, 1.45, 0, 8))
	var beam := Geo.group([Geo.box(1.0, 0.04, 0.04, brass)])
	for sx in [-0.48, 0.48]:
		beam.add_child(Geo.cyl(0.005, 0.005, 0.45, brass, sx, -0.22, 0, 4))
		beam.add_child(Geo.cyl(0.18, 0.12, 0.05, brass, sx, -0.45, 0, 12))
	beam.position.y = 1.9
	beam.set_meta("dynamic", true)
	g.add_child(beam)
	Geo.anims.append(func(t, _dt): beam.rotation.z = sin(t * 0.9) * 0.12)
	return g


static func cage() -> Node3D:
	var g := Geo.group([Geo.cyl(0.9, 0.9, 0.1, Mats.iron(), 0, 0.05, 0, 16), Geo.cyl(0.9, 0.9, 0.1, Mats.iron(), 0, 2.5, 0, 16), Geo.cone(0.9, 0.6, Mats.iron(), 0, 2.85, 0, 16)])
	for i in 14:
		var a := i / 14.0 * TAU
		g.add_child(Geo.cyl(0.03, 0.03, 2.4, Mats.iron(), cos(a) * 0.88, 1.25, sin(a) * 0.88, 5))
	var bone := m(0xe8e2cc, { roughness = 0.8 })
	var sk := Geo.group([Geo.sph(0.16, bone, 0, 1.55, 0), Geo.cyl(0.04, 0.04, 0.6, bone, 0, 1.15, 0, 6)])
	for i in 4:
		sk.add_child(Geo.rot_z(Geo.torus(0.13, 0.02, bone, 0, 1.3 - i * 0.11, 0), PI / 2.0))
	sk.add_child(Geo.rot_z(Geo.cyl(0.025, 0.025, 0.55, bone, -0.22, 1.12, 0, 6), 0.3))
	sk.add_child(Geo.rot_z(Geo.cyl(0.025, 0.025, 0.55, bone, 0.22, 1.12, 0, 6), -0.3))
	sk.add_child(Geo.cyl(0.03, 0.03, 0.7, bone, -0.1, 0.5, 0, 6))
	sk.add_child(Geo.cyl(0.03, 0.03, 0.7, bone, 0.1, 0.5, 0, 6))
	sk.add_child(Geo.box(0.3, 0.1, 0.1, bone, 0, 0.85, 0))
	sk.position.y = 0.1
	g.add_child(sk)
	g.add_child(Geo.cyl(0.03, 0.03, 4.0, Mats.iron(), 0, 5.1, 0, 5))
	return g


static func trophies() -> Node3D:
	return Geo.group([Geo.box(1.8, 0.3, 0.6, Mats.darkwood(), 0, 0.15, -0.05)])


static func shield() -> Node3D:
	var sh := Geo.cyl(0.8, 0.8, 0.1, m(0x8a2a2a), 0, 3.0, -0.2, 3)
	sh.rotation = Vector3(PI / 2.0, 0, PI)
	sh.scale = Vector3(1, 1, 1.25)
	return Geo.group([sh, Geo.sph(0.18, Mats.gold(), 0, 3.15, -0.12)])


static func spears() -> Node3D:
	var g := Geo.group([Geo.box(2.0, 0.12, 0.35, Mats.wood(), 0, 0.3, -0.1), Geo.box(2.0, 0.12, 0.25, Mats.wood(), 0, 2.2, -0.2),
		Geo.box(0.12, 2.3, 0.15, Mats.darkwood(), -0.95, 1.15, -0.25), Geo.box(0.12, 2.3, 0.15, Mats.darkwood(), 0.95, 1.15, -0.25)])
	for i in 5:
		var sp := Geo.group([Geo.cyl(0.03, 0.03, 3.0, Mats.wood(), 0, 1.5, 0, 6), Geo.cone(0.07, 0.4, Mats.steel(), 0, 3.2, 0, 6),
			Geo.box(0.12, 0.25, 0.01, m(0x2a4a8a, { roughness = 0.9 }), 0.08, 2.8, 0)])
		sp.position = Vector3(-0.7 + i * 0.35, 0.2, -0.1)
		sp.rotation.z = (i - 2) * 0.03
		g.add_child(sp)
	return g


static func chest() -> Node3D:
	var g := Geo.group([Geo.box(1.2, 0.6, 0.75, m(0x6b3a1a)), Geo.light(0, 1.0, 0.2, Color("#ffc860"), 4, 3.5, "glow")])
	return g


static func cannon() -> Node3D:
	return Geo.group([Geo.box(0.8, 0.35, 1.6, Mats.darkwood(), 0, 0.45, -0.3)])


static func telescope() -> Node3D:
	var brass := m(0xc89a3a, { metal = 1.0, roughness = 0.35 })
	var g := Node3D.new()
	for i in 3:
		var a := i / 3.0 * TAU
		g.add_child(Geo.rot_z(Geo.cyl(0.04, 0.04, 1.6, Mats.darkwood(), cos(a) * 0.3, 0.75, sin(a) * 0.3, 6), cos(a) * -0.2))
	var tube := Geo.group([Geo.cyl(0.12, 0.18, 2.2, brass, 0, 0, 0, 14), Geo.torus(0.19, 0.03, Mats.gold(), 0, -1.0, 0), Geo.torus(0.14, 0.02, Mats.gold(), 0, 0.6, 0)])
	tube.get_child(1).rotation.x = PI / 2.0
	tube.get_child(2).rotation.x = PI / 2.0
	tube.position = Vector3(0, 1.7, 0)
	tube.rotation.x = -0.9
	tube.set_meta("dynamic", true)
	g.add_child(tube)
	Geo.anims.append(func(t, _dt): tube.rotation.y = sin(t * 0.2) * 0.4)
	return g


static func starchart() -> Node3D:
	var r := RandomNumberGenerator.new()
	r.seed = 61
	var shapes := []
	for i in 40:
		shapes.append(["circle", Color("#fff6d0"), r.randf(), r.randf(), 0.004 + r.randf() * 0.008])
	var cm := StandardMaterial3D.new()
	cm.albedo_texture = ImageTexture.create_from_image(paint(256, Color("#121a3a"), shapes))
	cm.emission_enabled = true
	cm.emission = Color("#111a33")
	var chart := Geo.quad(1.6, 1.0, cm, 0, 1.0, 0)
	chart.rotation.x = -PI / 2.0 + 0.25
	var g := Geo.group([Geo.box(1.9, 0.08, 1.2, Mats.wood(), 0, 0.85, 0), chart])
	for lx in [-0.85, 0.85]:
		for lz in [-0.5, 0.5]:
			g.add_child(Geo.box(0.08, 0.85, 0.08, Mats.darkwood(), lx, 0.42, lz))
	g.add_child(Geo.cyl(0.02, 0.02, 0.3, Mats.gold(), 0.6, 1.05, 0.3, 6))
	g.add_child(Geo.cyl(0.05, 0.05, 0.6, m(0xe8dcb8), -0.6, 0.95, -0.4, 10))
	return g


static func orrery() -> Node3D:
	var g := Geo.group([Geo.cyl(0.5, 0.7, 0.2, Mats.darkwood(), 0, 0.1, 0, 14), Geo.cyl(0.06, 0.08, 1.6, Mats.gold(), 0, 0.9, 0, 8)])
	g.add_child(Geo.sph(0.3, m(0xd8a84a, { metal = 1.0, roughness = 0.25, emissive = 0x6a4410, energy = 0.3 }), 0, 1.9, 0))
	var planets := [[0.8, 0.09, m(0xb4b4b8, { metal = 1.0, roughness = 0.3 }), 1.4], [1.2, 0.13, m(0xb87333, { metal = 1.0, roughness = 0.35 }), 0.9],
		[1.6, 0.14, m(0x2c4677, { roughness = 0.25 }), 0.6], [2.0, 0.11, m(0x7a3a2c, { roughness = 0.3 }), 0.4]]
	for p in planets:
		var arm := Geo.group([Geo.box(p[0], 0.02, 0.02, Mats.gold(), p[0] / 2.0, 0, 0), Geo.sph(p[1], p[2], p[0], 0, 0)])
		arm.position.y = 1.9
		arm.rotation.y = randf() * 6.0
		g.add_child(arm)
		Geo.spin(arm, p[3])
	return g


static func crystal() -> Node3D:
	var ball := Geo.sph(0.32, m(0xcfd8e4, { emissive = 0x2a3550, energy = 0.5, roughness = 0.04, alpha = 0.55 }), 0, 1.45, 0, 24, 18)
	var g := Geo.group([Geo.cyl(0.3, 0.45, 0.25, Mats.darkwood(), 0, 0.12, 0, 10), Geo.cyl(0.08, 0.12, 0.85, m(0x3a2a4a), 0, 0.65, 0, 8),
		Geo.cyl(0.25, 0.15, 0.12, Mats.gold(), 0, 1.12, 0, 10), ball])
	var swirl := Geo.sph(0.18, m(0xe8deff, { unshaded = true, alpha = 0.5 }), 0, 1.45, 0, 8, 6)
	g.add_child(swirl)
	Geo.spin(swirl, 1.5)
	Geo.anims.append(func(t, _dt): swirl.scale = Vector3.ONE * (0.7 + sin(t * 2.0) * 0.25))
	g.add_child(Geo.light(0, 1.5, 0, Color("#b08cff"), 6, 5, "magic"))
	return g


static func armillary() -> Node3D:
	var g := Geo.group([Geo.cyl(0.35, 0.5, 0.15, Mats.darkwood(), 0, 0.08, 0, 12), Geo.cyl(0.06, 0.1, 1.3, Mats.gold(), 0, 0.75, 0, 8),
		Geo.sph(0.12, Mats.glow(Color("#88aaff"), 1.2), 0, 2.15, 0)])
	var rings := Node3D.new()
	rings.position.y = 2.15
	for rr in [[0.75, 0.0, 0.0], [0.68, PI / 2.0, 0.0], [0.6, PI / 2.0, PI / 2.0], [0.52, 0.4, 0.9]]:
		var tr := Geo.torus(rr[0], 0.025, Mats.gold(), 0, 0, 0, TAU, 6, 40)
		tr.rotation = Vector3(rr[1], rr[2], 0)
		rings.add_child(tr)
	g.add_child(rings)
	Geo.spin(rings, 0.35)
	return g
