class_name CastleDecor
## Room dressing that gives each room its character, plus the light fixtures.
## Everything is added to its room's node, so whole rooms can be hidden at once.

const T := CastleLayout.T
var rooms: Dictionary
var colliders: Array  ## [x, z, r] circles the keeper can't walk through


func _init(p_rooms: Dictionary, p_colliders: Array) -> void:
	rooms = p_rooms
	colliders = p_colliders


func add(room: String, n: Node3D, x := 0.0, y := 0.0, z := 0.0, ry := 0.0) -> Node3D:
	n.position = Vector3(x, y, z)
	n.rotation.y = ry
	(rooms[room] as Node3D).add_child(n)
	return n


## On the inside face of a room wall: side n/s/e/w, `along` = world coordinate along it.
func on_wall(room: String, side: String, along: float, y: float, n: Node3D, inset := 0.05) -> Node3D:
	var rr := CastleLayout.room_rect(CastleLayout.room(room))
	match side:
		"n": return add(room, n, along, y, rr.position.y + inset, 0.0)
		"s": return add(room, n, along, y, rr.end.y - inset, PI)
		"w": return add(room, n, rr.position.x + inset, y, along, PI / 2.0)
	return add(room, n, rr.end.x - inset, y, along, -PI / 2.0)


func model(id: String, fit: Dictionary) -> Node3D:
	var n := CastleProps.load_model(id, fit)
	return n if n else Node3D.new()


# ---------- fixtures ----------

## A wrought-iron chandelier on chains, or a real model, with its light.
func chandelier(room: String, x: float, z: float, radius: float, drop_to: float, ceiling: float) -> void:
	var big := radius >= 1.3
	var g := Node3D.new()
	var lamp := model("Chandelier_03" if big else "lantern_chandelier_01", { height = 2.3 if big else 1.6 })
	var box := CastleProps.aabb(lamp)
	lamp.position.y = -0.35 - box.position.y * lamp.scale.y
	g.add_child(lamp)
	for i in 4:
		var a := i / 4.0 * TAU
		g.add_child(Geo.cyl(0.015, 0.015, ceiling - drop_to, Mats.iron(), cos(a) * radius * 0.5, (ceiling - drop_to) / 2.0, sin(a) * radius * 0.5, 4))
	g.add_child(Geo.light(0, -0.2, 0, Color("#ffb066"), 40 + radius * 15, 14 + radius * 2, "chandelier"))
	add(room, g, x, drop_to, z)


## An iron wall sconce with a burning torch.
func sconce() -> Node3D:
	var g := Node3D.new()
	g.add_child(Geo.box(0.18, 0.4, 0.08, Mats.iron(), 0, 0, -0.02))
	g.add_child(Geo.rot_x(Geo.cyl(0.03, 0.03, 0.45, Mats.iron(), 0, 0.12, 0.2, 6), 0.9))
	g.add_child(Geo.cyl(0.09, 0.05, 0.16, Mats.iron(), 0, 0.3, 0.38, 8))
	g.add_child(Geo.cyl(0.04, 0.035, 0.3, Mats.darkwood(), 0, 0.42, 0.38, 6))
	var f := Geo.flame(1.3)
	f.position = Vector3(0, 0.56, 0.38)
	g.add_child(f)
	g.add_child(Geo.light(0, 0.9, 1.3, Color("#ff9a48"), 7, 8, "torch"))
	return g


func banker_lamp() -> Node3D:
	var g := Geo.group([Geo.cyl(0.1, 0.12, 0.04, Mats.brass(), 0, 0.02, 0, 12), Geo.cyl(0.015, 0.015, 0.35, Mats.brass(), 0, 0.2, 0, 6)])
	var shade := Geo.rot_z(Geo.cyl(0.06, 0.16, 0.1, Mats.mat(0x1f6a3a, { roughness = 0.3, double = true, emissive = 0x0a3018 }), 0, 0.38, 0, 16, true), PI / 2.0)
	g.add_child(shade)
	var glow := Geo.glow(Color(1.0, 0.86, 0.6, 0.9), 0.6)
	glow.position.y = 0.33
	g.add_child(glow)
	g.add_child(Geo.light(0, 0.4, 0.2, Color("#ffd49a"), 6, 5, "lamp"))
	return g


func bench(length: float) -> Node3D:
	var g := Geo.group([Geo.box(length, 0.08, 0.38, Mats.darkwood(), 0, 0.46, 0)])
	for x in [-length / 2.0 + 0.2, length / 2.0 - 0.2]:
		g.add_child(Geo.box(0.08, 0.44, 0.32, Mats.darkwood(), x, 0.22, 0))
	return g


func column(h: float, rad: float) -> Node3D:
	return Geo.group([Geo.box(rad * 2.6, 0.3, rad * 2.6, Mats.stone(), 0, 0.15, 0),
		Geo.cyl(rad, rad * 1.08, h - 0.7, Mats.mat(0xffffff, { tex = "marble", tint = Color("#e8e0d0"), roughness = 0.4 }), 0, (h - 0.7) / 2.0 + 0.3, 0, 24),
		Geo.box(rad * 2.6, 0.4, rad * 2.6, Mats.stone(), 0, h - 0.2, 0)])


## The Keep's own heraldry: a key under an open eye, on midnight blue.
func crest_banner() -> Node3D:
	var img := Image.create(64, 128, false, Image.FORMAT_RGB8)
	img.fill(Color("#1c2a52"))
	var gold := Color("#d4a64a")
	for y in 128:
		for x in 64:
			if x < 4 or x >= 60 or y < 4 or y >= 124:
				img.set_pixel(x, y, gold)
			var e := Vector2((x - 32) / 18.0, (y - 46) / 15.0)
			if e.length() <= 1.0 and Vector2(x - 32, y - 46).length() > 8:
				img.set_pixel(x, y, gold)
			if absi(x - 32) <= 3 and y >= 64 and y < 110:
				img.set_pixel(x, y, gold)
			if Vector2(x - 32, y - 66).length() <= 9 and Vector2(x - 32, y - 66).length() >= 5:
				img.set_pixel(x, y, gold)
			if x >= 32 and x < 46 and (y >= 94 and y < 99 or y >= 103 and y < 108):
				img.set_pixel(x, y, gold)
	var cm := StandardMaterial3D.new()
	cm.albedo_texture = ImageTexture.create_from_image(img)
	cm.roughness = 0.95
	cm.cull_mode = BaseMaterial3D.CULL_DISABLED
	var cloth := Geo.quad(1.3, 2.6, cm, 0, 0, 0.02)
	return Geo.group([cloth, Geo.rot_z(Geo.cyl(0.04, 0.04, 1.6, Mats.gold(), 0, 1.35, 0.02, 6), PI / 2.0)])


# ---------- the rooms ----------

func build() -> void:
	_courtyard()
	_entrance()
	_hall()
	_gallery()
	_library()
	_cellar()
	_armoury()
	_observatory()
	_sconces()


func _courtyard() -> void:
	for p in [[30.0, 45.6], [38.0, 45.6], [26.0, 57.6], [41.5, 58.0]]:
		var lamp := add("courtyard", model("street_lamp_01", { height = 3.9 }), p[0], 0, p[1])
		lamp.add_child(Geo.light(0, 3.3, 0, Color("#ffc070"), 30, 12, "lantern", true))
		colliders.append([p[0], p[1], 0.25])
	for w in [["n", 30.3], ["n", 37.7], ["e", 50.5], ["w", 52.0]]:
		var lamp := model("street_lamp_02", { height = 1.7 })
		var box := CastleProps.aabb(lamp)
		lamp.position.y = 2.2 - 2.6 - box.position.y * lamp.scale.y
		var holder := Geo.group([lamp, Geo.light(0, 0.3, 0.75, Color("#ffb868"), 9, 8, "lantern")])
		on_wall("courtyard", w[0], w[1], 2.6, holder, 0.02)
	_ivy()
	for p in [[42.6, 45.4], [42.6, 46.6], [41.5, 45.4]]:
		add("courtyard", model("wooden_crate_01", { width = 1.0 }), p[0], 0, p[1], randf() * 0.3)
		colliders.append([p[0], p[1], 0.6])
	add("courtyard", model("wine_barrel_01", { height = 1.1 }), 42.6, 0, 47.6, 0.4)
	add("courtyard", model("wooden_lantern_01", { height = 0.55 }), 41.7, 0.92, 46.6)
	add("courtyard", model("wine_barrel_01", { height = 1.1 }), 25.2, 0, 44.9, 1.2)
	colliders.append([42.6, 47.6, 0.5])
	colliders.append([25.2, 44.9, 0.5])
	# planting: a hedge along the east wall, ferns by the walls
	_centred("courtyard", "shrub_02", { length = 4.6 }, 43.1, 52.0, PI / 2.0)
	for c in [[43.1, 50.0], [43.1, 52.0], [43.1, 54.0]]:
		colliders.append([c[0], c[1], 0.7])
	for f in [[24.9, 49.6, 0.3, 2.6], [28.6, 58.6, 2.1, 2.4], [38.2, 58.7, -1.2, 2.2], [27.6, 44.95, 1.0, 2.0]]:
		_centred("courtyard", "fern_02", { length = f[3] }, f[0], f[1], f[2])


## A model whose origin sits at one end (planting rows), centred on (x, z).
func _centred(room: String, id: String, fit: Dictionary, x: float, z: float, yaw: float) -> void:
	var n := model(id, fit)
	var box := CastleProps.aabb(n)
	var c := box.get_center() * n.scale
	var pivot := Node3D.new()
	n.position = Vector3(-c.x, 0, -c.z)
	pivot.add_child(n)
	add(room, pivot, x, 0, z, yaw)


## Ivy: thousands of small pointed leaves climbing the courtyard walls.
func _ivy() -> void:
	var leaf := PackedVector2Array([Vector2(0, -0.05), Vector2(0.06, -0.02), Vector2(0.06, 0.03), Vector2(0.02, 0.025), Vector2(0, 0.075),
		Vector2(-0.02, 0.025), Vector2(-0.06, 0.03), Vector2(-0.06, -0.02)])
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	st.set_normal(Vector3.BACK)
	var tris := Geometry2D.triangulate_polygon(leaf)
	for i in tris:
		st.add_vertex(Vector3(leaf[i].x, leaf[i].y, 0))
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.use_colors = true
	mm.mesh = st.commit()
	var leaves := 3200
	mm.instance_count = leaves
	var r := RandomNumberGenerator.new()
	r.seed = 12
	var patches := [[24.05, 47.0, "w"], [24.05, 55.0, "w"], [29.0, 59.95, "s"], [43.95, 56.0, "e"]]
	for i in leaves:
		var p: Array = patches[i % patches.size()]
		var up := pow(r.randf(), 0.85) * 5.8
		var spread := 1.2 + 2.4 * sqrt(up / 5.8) * (1.15 - up / 7.0)
		var off := (r.randf() - 0.5) * spread + sin(up * 1.7 + p[0]) * 0.35
		var x: float
		var z: float
		if p[2] == "s":
			x = p[0] + off
			z = p[1] - 0.03 * (1.0 + r.randf() * 2.0)
		else:
			x = p[0] + (0.03 if p[2] == "w" else -0.03) * (1.0 + r.randf() * 2.0)
			z = p[1] + off
		var basis := Basis.from_euler(Vector3((r.randf() - 0.5) * 0.9, (0.0 if p[2] == "s" else PI / 2.0) + (r.randf() - 0.5) * 0.6, (r.randf() - 0.5) * 1.2))
		var sc := 0.8 + r.randf() * 0.9
		mm.set_instance_transform(i, Transform3D(basis.scaled(Vector3.ONE * sc), Vector3(x, 0.15 + up, z)))
		mm.set_instance_color(i, Color.from_hsv(0.27 + r.randf() * 0.06, 0.45 + r.randf() * 0.2, 0.16 + r.randf() * 0.12 - (0.04 if up < 1.0 else 0.0)))
	var mi := MultiMeshInstance3D.new()
	mi.multimesh = mm
	var mat := StandardMaterial3D.new()
	mat.vertex_color_use_as_albedo = true
	mat.roughness = 0.55
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	mi.material_override = mat
	(rooms.courtyard as Node3D).add_child(mi)


func _entrance() -> void:
	for x in [28.0, 40.0]:
		for z in [33.0, 39.0]:
			add("entrance", column(CastleLayout.room("entrance").h - 0.2, 0.42), x, 0, z)
			colliders.append([x, z, 0.6])
	add("entrance", Geo.box(3.2, 0.02, 11, Mats.mat(0x7a1a22, { roughness = 0.95 })), 34, 0.012, 36.5)
	chandelier("entrance", 34, 35.5, 1.6, 6.2, 10)
	on_wall("entrance", "w", 31, 5.6, crest_banner(), 0.08)
	on_wall("entrance", "e", 35, 5.2, crest_banner(), 0.08)
	on_wall("entrance", "n", 28, 3.2, sconce())
	on_wall("entrance", "n", 40, 3.2, sconce())
	add("entrance", model("gothic_statue", { height = 1.9 }), 41.6, 0, 41.2, -2.4)
	add("entrance", model("GothicCabinet_01", { height = 2.6 }), 31, 0, 28.7)
	colliders.append([41.6, 41.2, 0.5])
	colliders.append([31.0, 28.9, 0.7])


func _hall() -> void:
	for p in [[7.0, 30.0], [18.0, 28.5]]:
		var t := CastleProps.longtable()
		add("hall", t, p[0], 0, p[1], PI / 2.0)
		for dz in [-2.6, 0.0, 2.6]:
			colliders.append([p[0], p[1] + dz, 1.3])
	for z in [22.0, 29.0, 36.0]:
		chandelier("hall", 12, z, 1.3, 7.2, 11)
	on_wall("hall", "e", 21, 5.5, crest_banner(), 0.08)
	on_wall("hall", "e", 31, 5.5, crest_banner(), 0.08)
	on_wall("hall", "w", 35, 5.5, crest_banner(), 0.08)
	add("hall", Geo.box(14, 0.12, 4.4, Mats.stone()), 12, 0.06, 18.4)
	add("hall", Geo.box(14.2, 0.02, 4.6, Mats.mat(0x5a1018, { roughness = 0.95 })), 12, 0.13, 18.4)
	on_wall("hall", "e", 40, 3.4, sconce())
	on_wall("hall", "w", 23, 3.4, sconce())
	add("hall", model("GothicCabinet_01", { height = 2.6 }), 21.1, 0, 25, -PI / 2.0)
	var lion := model("lion_head", { height = 0.75 })
	add("hall", lion, 2.7, 4.6, 26, PI / 2.0)
	add("hall", model("brass_goblets", { width = 0.45 }), 7, 0.92, 27.5, 0.5)
	add("hall", model("jug_01", { height = 0.32 }), 18, 0.92, 30, 2)
	colliders.append([21.1, 25.0, 0.7])


func _gallery() -> void:
	add("gallery", Geo.box(17, 0.02, 2.2, Mats.mat(0x6a1520, { roughness = 0.95 })), 12, 0.012, 8)
	var cols := [[Color("#3a2a1a"), Color("#a0703a")], [Color("#1a2a3a"), Color("#c8b090")]]
	for i in 2:
		var img := CastleProps.paint(128, cols[i][0], [["circle", cols[i][1], 0.5, 0.38, 0.15], ["rect", cols[i][1], 0.3, 0.52, 0.4, 0.48]])
		var p := CastleProps.painting(1.05, 1.4, img)
		p.add_child(Geo.box(0.6, 0.06, 0.12, Mats.brass(), 0, 0.95, 0.18))
		p.add_child(Geo.light(0, 0.8, 0.5, Color("#ffdca0"), 3, 2.5, "lamp"))
		on_wall("gallery", "s", [11.0, 19.0][i], 2.7, p, 0.08)
	on_wall("gallery", "s", 15.5, 3.4, sconce())
	chandelier("gallery", 12, 8, 0.9, 4.0, 6)
	for x in [6.0, 19.0]:
		add("gallery", bench(1.6), x, 0, 10.6)
		colliders.append([x, 10.6, 0.7])
	add("gallery", model("GothicCommode_01", { height = 1.3 }), 2.7, 0, 11.2, PI / 2.0)
	add("gallery", model("spinning_wheel_01", { height = 1.2 }), 20.8, 0, 12.6, -2.4)
	colliders.append([2.9, 11.2, 0.6])
	colliders.append([20.8, 12.6, 0.6])


func _library() -> void:
	var rr := CastleLayout.room_rect(CastleLayout.room("library"))
	var lx0 := rr.position.x
	var lx1 := rr.end.x
	var lz0 := rr.position.y
	var lz1 := rr.end.y
	var bal := 5.2
	var i := 0
	for x in [28.0, 31.2, 34.4]:
		add("library", CastleProps.shelf_unit(2.4, 4, 6, 90 + i), x, 0, lz0 + 0.35)
		colliders.append([x - 0.8, lz0 + 0.6, 0.55])
		colliders.append([x + 0.8, lz0 + 0.6, 0.55])
		i += 1
	var x := lx0 + 1.4
	while x < lx1 - 1.0:
		add("library", CastleProps.shelf_unit(2.4, 3.6, 5, 200 + int(x)), x, bal + 0.1, lz0 + 0.35)
		x += 2.5
	var z := lz0 + 3.0
	while z < lz1 - 2.0:
		add("library", CastleProps.shelf_unit(2.4, 3.6, 5, 300 + int(z)), lx1 - 0.35, bal + 0.1, z, -PI / 2.0)
		add("library", CastleProps.shelf_unit(2.4, 3.6, 5, 400 + int(z)), lx0 + 0.35, bal + 0.1, z, PI / 2.0)
		z += 2.5
	var deck := Mats.mat(0xffffff, { roughness = 0.7, tex = "oak" })
	add("library", Geo.box(lx1 - lx0, 0.25, 1.8, deck), (lx0 + lx1) / 2.0, bal, lz0 + 0.9)
	add("library", Geo.box(1.8, 0.25, lz1 - lz0 - 1.8, deck), lx0 + 0.9, bal, (lz0 + lz1) / 2.0 + 0.9)
	add("library", Geo.box(1.8, 0.25, lz1 - lz0 - 1.8, deck), lx1 - 0.9, bal, (lz0 + lz1) / 2.0 + 0.9)
	var rail := Mats.darkwood()
	add("library", Geo.box(lx1 - lx0 - 3.6, 0.08, 0.08, rail), (lx0 + lx1) / 2.0, bal + 1.0, lz0 + 1.8)
	add("library", Geo.box(0.08, 0.08, lz1 - lz0 - 1.8, rail), lx0 + 1.8, bal + 1.0, (lz0 + lz1) / 2.0 + 0.9)
	add("library", Geo.box(0.08, 0.08, lz1 - lz0 - 1.8, rail), lx1 - 1.8, bal + 1.0, (lz0 + lz1) / 2.0 + 0.9)
	x = lx0 + 1.8
	while x <= lx1 - 1.8:
		add("library", Geo.cyl(0.025, 0.025, 1.0, rail, 0, 0, 0, 6), x, bal + 0.5, lz0 + 1.8)
		x += 0.6
	z = lz0 + 1.8
	while z <= lz1 - 0.2:
		add("library", Geo.cyl(0.025, 0.025, 1.0, rail, 0, 0, 0, 6), lx0 + 1.8, bal + 0.5, z)
		add("library", Geo.cyl(0.025, 0.025, 1.0, rail, 0, 0, 0, 6), lx1 - 1.8, bal + 0.5, z)
		z += 0.6
	for p in [[lx0 + 1.8, lz0 + 1.8], [lx1 - 1.8, lz0 + 1.8], [lx0 + 1.8, 12.0], [lx1 - 1.8, 12.0]]:
		add("library", Geo.box(0.3, bal, 0.3, rail), p[0], bal / 2.0, p[1])
		colliders.append([p[0], p[1], 0.3])
	var ladder := Node3D.new()
	for sx in [-0.25, 0.25]:
		ladder.add_child(Geo.box(0.06, 5.2, 0.06, Mats.wood(), sx, 2.6, 0))
	for k in 12:
		ladder.add_child(Geo.box(0.5, 0.04, 0.04, Mats.wood(), 0, 0.3 + k * 0.42, 0))
	ladder.rotation.x = -0.18
	add("library", ladder, 33, 0, 4.3)
	ladder.rotation.x = -0.18
	colliders.append([33.0, 4.1, 0.35])
	chandelier("library", 34, 14, 1.4, 7.6, 10)
	var t := Node3D.new()
	t.add_child(Geo.box(1.4, 0.08, 0.8, Mats.wood(), 0, 0.82, 0))
	for sx in [-0.6, 0.6]:
		for sz in [-0.3, 0.3]:
			t.add_child(Geo.box(0.07, 0.8, 0.07, Mats.darkwood(), sx, 0.4, sz))
	add("library", t, 38.5, 0, 12)
	colliders.append([38.5, 12.0, 0.8])
	add("library", banker_lamp(), 38.9, 0.86, 12)
	add("library", model("horse_statue_01", { height = 0.32 }), 38.5, 0.9, 12, -1)


func _cellar() -> void:
	for p in [[52.0, 12.0], [60.0, 6.0], [58.0, 15.0]]:
		for i in 8:
			var l := Geo.torus(0.08, 0.02, Mats.iron(), 0, 0, 0, TAU, 6, 12)
			l.rotation.y = PI / 2.0 if i % 2 else 0.0
			add("dungeon", l, p[0], 4.2 - i * 0.17, p[1], PI / 2.0 if i % 2 else 0.0)
	for i in 6:
		add("dungeon", Geo.rot_x(Geo.cone(0.12, 0.5, Mats.mat(0x4a6a2a, { roughness = 0.95 }), 0, 0, 0, 6), PI), 48 + i * 1.4, 3.6, 3.2)
	for p in [[54.0, 3.0], [62.0, 9.0], [50.0, 9.5]]:
		var c := Geo.group([Geo.cyl(0.06, 0.07, 0.35, Mats.mat(0xeee6cc, { roughness = 0.5 }), 0, 0.18, 0, 8)])
		var f := Geo.flame(0.8)
		f.position.y = 0.4
		c.add_child(f)
		c.add_child(Geo.light(0, 0.6, 0, Color("#ffa050"), 5, 4, "candle"))
		add("dungeon", c, p[0], 0.95, p[1])
		add("dungeon", Geo.box(0.7, 0.95, 0.7, Mats.darkwood()), p[0], 0.47, p[1])
		colliders.append([p[0], p[1], 0.5])
	add("dungeon", model("painted_wooden_shelves", { height = 1.9 }), 46.5, 0, 13.5, PI / 2.0)
	add("dungeon", model("wine_barrel_01", { height = 1.1 }), 64.9, 0, 9.4, 0.3)
	colliders.append([46.7, 13.5, 0.5])
	colliders.append([64.9, 9.4, 0.5])


func _armoury() -> void:
	var forge := Node3D.new()
	forge.add_child(Geo.box(2.6, 1.0, 1.8, Mats.surface("brick"), 0, 0.5, 0))
	forge.add_child(Geo.box(2.2, 0.1, 1.4, Mats.glow(Color("#ff5a1a"), 3.0), 0, 1.02, 0))
	var hood := Geo.cyl(0.5, 1.5, 2.2, Mats.mat(0x2a2624, { roughness = 0.8, double = true, metal = 0.4 }), 0, 3.3, 0, 4, true)
	hood.rotation.y = PI / 4.0
	forge.add_child(hood)
	forge.add_child(Geo.cyl(0.45, 0.45, 2.6, Mats.surface("brick"), 0, 5.6, 0, 8))
	var coals := Geo.glow(Color(1.0, 0.43, 0.12, 1.0), 3.4)
	coals.position.y = 1.3
	forge.add_child(coals)
	forge.add_child(Geo.light(0, 1.6, 0.6, Color("#ff6a24"), 70, 14, "fire", true))
	add("armoury", forge, 63.5, 0, 34)
	colliders.append([63.5, 34.0, 1.3])
	var anvil := Geo.group([Geo.cyl(0.3, 0.38, 0.6, Mats.darkwood(), 0, 0.3, 0, 10), Geo.box(0.9, 0.25, 0.32, Mats.iron(), 0, 0.72, 0), Geo.box(0.4, 0.2, 0.25, Mats.iron(), 0, 0.52, 0)])
	anvil.add_child(Geo.rot_z(Geo.cone(0.12, 0.4, Mats.iron(), 0.62, 0.72, 0, 8), PI / 2.0))
	add("armoury", anvil, 58.5, 0, 29)
	colliders.append([58.5, 29.0, 0.6])
	for z in [27.0, 35.5]:
		var sh := Geo.rot_z(Geo.cyl(0.55, 0.55, 0.08, Mats.mat(0x2a4a8a if z == 27.0 else 0x8a7a2a, { roughness = 0.5, metal = 0.3 }), 0, 0, 0, 24), PI / 2.0)
		on_wall("armoury", "w", z, 3.6, Geo.group([sh]), 0.1)
	on_wall("armoury", "n", 52, 3.2, sconce())
	on_wall("armoury", "n", 60, 3.2, sconce())
	add("armoury", model("ornate_medieval_mace", { height = 0.9 }), 46.15, 2.1, 27.8, PI / 2.0)
	add("armoury", model("ornate_war_hammer", { height = 1.0 }), 46.15, 2.1, 28.8, PI / 2.0)
	add("armoury", model("wooden_axe", { height = 0.9 }), 46.15, 2.1, 29.7, PI / 2.0)
	add("armoury", model("wooden_crate_02", { length = 1.4 }), 49.2, 0, 21, 0.2)
	colliders.append([49.2, 21.0, 0.7])


func _observatory() -> void:
	var brazier := Geo.group([Geo.cyl(0.5, 0.25, 0.4, Mats.iron(), 0, 1.0, 0, 12)])
	for i in 3:
		var a := i / 3.0 * TAU
		brazier.add_child(Geo.rot_z(Geo.cyl(0.03, 0.03, 1.0, Mats.iron(), cos(a) * 0.3, 0.5, sin(a) * 0.3, 6), cos(a) * 0.3))
	for i in 3:
		var f := Geo.flame(2.0)
		f.position = Vector3((i - 1) * 0.15, 1.15, 0)
		brazier.add_child(f)
	brazier.add_child(Geo.light(0, 1.6, 0, Color("#ff9a50"), 40, 12, "fire", true))
	add("tower", brazier, 56, 0, 46)
	colliders.append([56.0, 46.0, 0.6])
	add("tower", model("gothic_statue", { height = 1.7 }), 47.6, 0, 50.2, PI / 2.0)
	colliders.append([47.8, 50.2, 0.5])


## Torches on a free wall in each room that isn't dressed with its own.
func _sconces() -> void:
	for r in CastleLayout.castle().rooms:
		if r.ceiling == "sky" or r.id in ["hall", "entrance", "gallery", "armoury", "library"]:
			continue
		var mx := int(floor((r.x0 + r.x1) / 2.0))
		var mz := int(floor((r.z0 + r.z1) / 2.0))
		for spot in [[mx, int(r.z0) - 1, "n"], [mx, int(r.z1) + 1, "s"], [int(r.x0) - 1, mz, "w"], [int(r.x1) + 1, mz, "e"]]:
			if CastleLayout.cell_at(spot[0], spot[1]) != -1:
				continue
			var along: float = (spot[0] * T + T / 2.0) if spot[2] in ["n", "s"] else (spot[1] * T + T / 2.0)
			on_wall(r.id, spot[2], along, 3.0, sconce())
