class_name CastleArchitecture
## Builds the castle's structure from the floor plan: floors, solid stone wall
## blocks (with colliders), doorway tunnels and headers, base courses and
## cornices, the five ceiling styles, roofs, turrets, arched door surrounds and
## windows. Shared structure goes under `root`; per-room pieces under `rooms`.

const T := CastleLayout.T
var root: Node3D
var rooms: Dictionary  ## room id -> Node3D
var b := MeshBuilder.new()
var block_h := {}  ## Vector2i -> height of the solid wall block in that cell
var door_h: float
var body: StaticBody3D

const PLINTH := { plaster = "beam", panel = "beam" }


func _init(p_root: Node3D, p_rooms: Dictionary) -> void:
	root = p_root
	rooms = p_rooms
	door_h = float(CastleLayout.castle().doorH)


func surf(key: String, opts := {}) -> Material:
	return Mats.surface(key, opts)


func build() -> void:
	body = StaticBody3D.new()
	body.name = "Walls"
	root.add_child(body)
	_floors()
	_wall_blocks()
	_door_headers()
	for r in CastleLayout.castle().rooms:
		_ceiling(r)
		if r.ceiling != "sky" and r.ceiling != "dome":
			_roof(r)
	b.build(root)
	for d in CastleLayout.castle().doors:
		_door_surround(d)
	_windows()
	_turrets()
	# the ground plane everyone walks on
	var floor_shape := CollisionShape3D.new()
	var bs := BoxShape3D.new()
	bs.size = Vector3(200, 1, 200)
	floor_shape.shape = bs
	floor_shape.position = Vector3(34, -0.5, 31)
	body.add_child(floor_shape)


func _floors() -> void:
	for r in CastleLayout.castle().rooms:
		var rr := CastleLayout.room_rect(r)
		var opts := { wet = 0.8 } if r.mood == "rain" else {}
		b.flat("floor_" + r.floor, surf(r.floor, opts), rr.position.x, rr.position.y, rr.end.x, rr.end.y, 0.0)
	for d in CastleLayout.castle().doors:
		b.flat("floor_flag", surf("flag"), d.x0 * T, d.z0 * T, (d.x1 + 1) * T, (d.z1 + 1) * T, 0.0)


## Height of the masonry in a wall cell: a little above the tallest room it touches.
func _block_height(tx: int, tz: int) -> float:
	var h := 0.0
	for dz in range(-1, 2):
		for dx in range(-1, 2):
			var c := CastleLayout.cell_at(tx + dx, tz + dz)
			if c >= 0:
				var r: Dictionary = CastleLayout.castle().rooms[c]
				h = max(h, float(r.h) + (0.0 if r.ceiling in ["sky", "dome"] else 0.6))
			elif c == -2:
				h = max(h, 6.0)
	return h


func _near_sky(tx: int, tz: int) -> bool:
	for dz in range(-1, 2):
		for dx in range(-1, 2):
			var c := CastleLayout.cell_at(tx + dx, tz + dz)
			if c >= 0 and CastleLayout.castle().rooms[c].ceiling in ["sky", "dome"]:
				return true
	return false


func _wall_blocks() -> void:
	var W := CastleLayout.w()
	var H := CastleLayout.h()
	for tz in range(-1, H + 1):
		for tx in range(-1, W + 1):
			if CastleLayout.cell_at(tx, tz) == -1:
				var h := _block_height(tx, tz)
				if h > 0.0:
					block_h[Vector2i(tx, tz)] = h
	var ext := surf("ashlar")
	const DIRS := [["n", 0, -1], ["s", 0, 1], ["w", -1, 0], ["e", 1, 0]]
	for cell in block_h:
		var tx: int = cell.x
		var tz: int = cell.y
		var bh: float = block_h[cell]
		var x0 := tx * T
		var z0 := tz * T
		var x1 := x0 + T
		var z1 := z0 + T
		b.flat("masonry", ext, x0, z0, x1, z1, bh)
		for d in DIRS:
			var nc := CastleLayout.cell_at(tx + d[1], tz + d[2])
			# the shared edge, ordered so the face points towards the neighbour
			var e: Array
			match d[0]:
				"n": e = [x1, z0, x0, z0]
				"s": e = [x0, z1, x1, z1]
				"w": e = [x0, z0, x0, z1]
				"e": e = [x1, z1, x1, z0]
			if nc >= 0:
				var r: Dictionary = CastleLayout.castle().rooms[nc]
				var side: String = { n = "s", s = "n", w = "e", e = "w" }[d[0]]  # the room's wall on this side
				var top := CastleLayout.wall_top(r, side)
				b.wall("wall_" + r.wall, surf(r.wall), e[0], e[1], e[2], e[3], 0.0, bh)
				_plinth(r, e, d)
				if r.ceiling in ["beams", "coffer", "hammer", "dome"] or (r.ceiling == "vault" and top < float(r.h)):
					_cornice(r, e, d, top)
			elif nc == -2:
				b.wall("wall_door", ext, e[0], e[1], e[2], e[3], 0.0, door_h)
			else:
				var nh: float = block_h.get(Vector2i(tx + d[1], tz + d[2]), 0.0)
				if bh > nh:
					b.wall("masonry", ext, e[0], e[1], e[2], e[3], nh, bh)
		if _near_sky(tx, tz):
			for m in [[0.25, 0.25], [0.75, 0.75]]:
				b.box("masonry", ext, Vector3(x0 + m[0] * T, bh + 0.42, z0 + m[1] * T), Vector3(0.64, 0.85, 0.64))
	_wall_colliders()


## One collision box per horizontal run of wall cells.
func _wall_colliders() -> void:
	var W := CastleLayout.w()
	var H := CastleLayout.h()
	for tz in range(-1, H + 1):
		var tx := -1
		while tx <= W:
			if not block_h.has(Vector2i(tx, tz)):
				tx += 1
				continue
			var start := tx
			while block_h.has(Vector2i(tx, tz)):
				tx += 1
			var cs := CollisionShape3D.new()
			var bs := BoxShape3D.new()
			bs.size = Vector3((tx - start) * T, 12.0, T)
			cs.shape = bs
			cs.position = Vector3((start + tx) / 2.0 * T, 6.0, (tz + 0.5) * T)
			body.add_child(cs)


## A stone or oak base course along the foot of a wall face.
func _plinth(r: Dictionary, e: Array, d: Array) -> void:
	var key: String = PLINTH.get(r.wall, "rubble" if r.wall == "rubble" else "flag")
	var hgt := 0.28 if PLINTH.has(r.wall) else 0.42
	var depth := 0.05 if PLINTH.has(r.wall) else 0.11
	_band("plinth_" + key, surf(key), e, d, 0.0, hgt, depth)


## A stepped moulding under the ceiling.
func _cornice(r: Dictionary, e: Array, d: Array, top: float) -> void:
	var key := "beam" if r.wall in ["panel", "plaster"] else "ashlar"
	_band("cornice_" + key, surf(key), e, d, top - 0.32, top - 0.02, 0.2)
	_band("cornice_" + key, surf(key), e, d, top - 0.52, top - 0.32, 0.1)


## A box standing proud of a wall face, towards the room (d is the outward direction of the wall cell).
func _band(key: String, m: Material, e: Array, d: Array, y0: float, y1: float, depth: float) -> void:
	var dir := Vector3(d[1], 0, d[2])
	var a := Vector3(e[0], 0, e[1])
	var c := Vector3(e[2], 0, e[3])
	var mid := (a + c) / 2.0 + dir * depth / 2.0
	var along := (c - a).length()
	var yaw := 0.0 if absf(d[1]) < 0.5 else PI / 2.0
	b.box(key, m, Vector3(mid.x, (y0 + y1) / 2.0, mid.z), Vector3(along, y1 - y0, depth), yaw)


func _door_headers() -> void:
	var ext := surf("ashlar")
	var seen := {}
	for d in CastleLayout.castle().doors:
		for tz in range(int(d.z0), int(d.z1) + 1):
			for tx in range(int(d.x0), int(d.x1) + 1):
				var hb := 6.0
				for nd in [[0, -1], [0, 1], [-1, 0], [1, 0]]:
					var c := CastleLayout.cell_at(tx + nd[0], tz + nd[1])
					if c >= 0:
						var r: Dictionary = CastleLayout.castle().rooms[c]
						hb = max(hb, float(r.h) + (0.0 if r.ceiling in ["sky", "dome"] else 0.6))
				var x0 := tx * T
				var z0 := tz * T
				b.flat("wall_door", ext, x0, z0, x0 + T, z0 + T, door_h, true)
				b.flat("masonry", ext, x0, z0, x0 + T, z0 + T, hb)
				for nd in [["n", 0, -1], ["s", 0, 1], ["w", -1, 0], ["e", 1, 0]]:
					var c := CastleLayout.cell_at(tx + nd[1], tz + nd[2])
					if c < 0:
						continue
					var r: Dictionary = CastleLayout.castle().rooms[c]
					var e: Array
					match nd[0]:
						"n": e = [x0 + T, z0, x0, z0]
						"s": e = [x0, z0 + T, x0 + T, z0 + T]
						"w": e = [x0, z0, x0, z0 + T]
						"e": e = [x0 + T, z0 + T, x0 + T, z0]
					b.wall("wall_" + r.wall, surf(r.wall), e[0], e[1], e[2], e[3], door_h, hb)
				seen[Vector2i(tx, tz)] = true


# ---------- ceilings ----------

func _ceiling(r: Dictionary) -> void:
	var rr := CastleLayout.room_rect(r)
	var x0 := rr.position.x
	var z0 := rr.position.y
	var x1 := rr.end.x
	var z1 := rr.end.y
	var lx := rr.size.x
	var lz := rr.size.y
	var longx := CastleLayout.long_x(r)
	var node: Node3D = rooms[r.id]
	var h := float(r.h)
	match r.ceiling:
		"beams", "coffer":
			b.flat("ceil_beam", surf("beam"), x0, z0, x1, z1, h, true)
			var wood := Mats.darkwood()
			var step := 2.5
			if longx:
				var x := x0 + step
				while x < x1 - 0.5:
					node.add_child(Geo.box(0.35, 0.5, lz, wood, x, h - 0.25, (z0 + z1) / 2.0))
					x += step
			else:
				var z := z0 + step
				while z < z1 - 0.5:
					node.add_child(Geo.box(lx, 0.5, 0.35, wood, (x0 + x1) / 2.0, h - 0.25, z))
					z += step
			if r.ceiling == "coffer":
				if longx:
					var z := z0 + step
					while z < z1 - 0.5:
						node.add_child(Geo.box(lx, 0.4, 0.25, wood, (x0 + x1) / 2.0, h - 0.2, z))
						z += step
				else:
					var x := x0 + step
					while x < x1 - 0.5:
						node.add_child(Geo.box(0.25, 0.4, lz, wood, x, h - 0.2, (z0 + z1) / 2.0))
						x += step
		"vault":
			_vault(r, x0, z0, x1, z1, longx)
		"hammer":
			_hammer(r, x0, z0, x1, z1, longx)
		"dome":
			_dome(r, x0, z0, x1, z1)


## A barrel vault: an inward-facing half cylinder along the room, with stone ribs.
func _vault(r: Dictionary, x0: float, z0: float, x1: float, z1: float, longx: bool) -> void:
	var spring := CastleLayout.vault_spring(r)
	var w := (z1 - z0) if longx else (x1 - x0)
	var rise := float(r.h) - spring
	var key := "rubble" if r.wall == "rubble" else "plaster"
	var m := surf(key)
	var segs := 24
	var len0 := x0 if longx else z0
	var len1 := x1 if longx else z1
	var cross_mid := (z0 + z1) / 2.0 if longx else (x0 + x1) / 2.0
	var pt := func(a: float, along: float) -> Vector3:
		var across := cross_mid + cos(a) * w / 2.0
		var y := spring + sin(a) * rise
		return Vector3(along, y, across) if longx else Vector3(across, y, along)
	for i in segs:
		var a0 := PI * i / segs
		var a1 := PI * (i + 1) / segs
		# wound so the face looks down into the room
		if longx:
			b.quad("vault_" + key, m, pt.call(a0, len0), pt.call(a1, len0), pt.call(a1, len1), pt.call(a0, len1))
		else:
			b.quad("vault_" + key, m, pt.call(a0, len1), pt.call(a1, len1), pt.call(a1, len0), pt.call(a0, len0))
	var node: Node3D = rooms[r.id]
	var k := 1
	while k < (len1 - len0) / 4.0:
		var rib := Geo.torus(w / 2.0 - 0.05, 0.14, Mats.stone(), 0, 0, 0, PI, 6, 24)
		rib.scale = Vector3(1, rise / (w / 2.0), 1)
		var along := len0 + k * 4.0
		if longx:
			rib.position = Vector3(along, spring, cross_mid)
			rib.rotation.y = PI / 2.0
		else:
			rib.position = Vector3(cross_mid, spring, along)
		node.add_child(rib)
		k += 1


## A pitched timber roof seen from below, with hammer-beam trusses.
func _hammer(r: Dictionary, x0: float, z0: float, x1: float, z1: float, longx: bool) -> void:
	if longx:
		return  # the great hall runs north-south
	var h := float(r.h)
	var rise := (x1 - x0) * 0.35
	var ridge := h + rise
	var xm := (x0 + x1) / 2.0
	var m := surf("beam")
	b.quad("ceil_roof", m, Vector3(x0, h, z1), Vector3(x0, h, z0), Vector3(xm, ridge, z0), Vector3(xm, ridge, z1))
	b.quad("ceil_roof", m, Vector3(x1, h, z0), Vector3(x1, h, z1), Vector3(xm, ridge, z1), Vector3(xm, ridge, z0))
	var wm := surf(r.wall)
	b.tri("wall_" + r.wall, wm, Vector3(x0, h, z0), Vector3(x1, h, z0), Vector3(xm, ridge, z0))
	b.tri("wall_" + r.wall, wm, Vector3(x1, h, z1), Vector3(x0, h, z1), Vector3(xm, ridge, z1))
	var node: Node3D = rooms[r.id]
	var wood := Mats.darkwood()
	var z := z0 + 3.0
	while z < z1 - 1.0:
		var slope := Vector2(xm - x0, rise).length()
		var ang := atan2(rise, xm - x0)
		for sgn in [-1.0, 1.0]:
			var raf := Geo.box(slope, 0.45, 0.35, wood, xm + sgn * (xm - x0) / 2.0, h + rise / 2.0 - 0.25, z)
			raf.rotation.z = -sgn * ang
			node.add_child(raf)
			var brace := Geo.torus(2.2, 0.16, wood, x0 + 2.2 if sgn < 0 else x1 - 2.2, h - 2.2, z, PI / 2.0, 6, 16)
			brace.rotation.z = PI / 2.0 if sgn < 0 else 0.0
			node.add_child(brace)
			node.add_child(Geo.box(2.4, 0.4, 0.4, wood, x0 + 1.2 if sgn < 0 else x1 - 1.2, h, z))
			node.add_child(Geo.sph(0.22, Mats.gold(), x0 + 2.35 if sgn < 0 else x1 - 2.35, h - 0.15, z, 10, 8))
		node.add_child(Geo.box((xm - x0) * 0.9, 0.4, 0.35, wood, xm, h + rise * 0.55, z))
		z += 3.2


## The observatory's open dome: cornice ring, brass ribs meeting at an oculus, corner piers.
func _dome(r: Dictionary, x0: float, z0: float, x1: float, z1: float) -> void:
	var node: Node3D = rooms[r.id]
	var h := float(r.h)
	var cx := (x0 + x1) / 2.0
	var cz := (z0 + z1) / 2.0
	var rad: float = min(x1 - x0, z1 - z0) / 2.0 - 0.4
	var cornice := Geo.torus(rad, 0.3, Mats.stone(), cx, h, cz, TAU, 8, 64)
	cornice.rotation.x = PI / 2.0
	node.add_child(cornice)
	var oculus := Geo.torus(2.2, 0.25, Mats.brass(), cx, h + 6.0, cz, TAU, 8, 32)
	oculus.rotation.x = PI / 2.0
	node.add_child(oculus)
	for k in 10:
		var a := TAU * k / 10.0
		var pts := []
		for i in 13:
			var t := i / 12.0
			var rr := rad + (2.2 - rad) * sin(t * PI / 2.0)
			pts.append(Vector3(cx + cos(a) * rr, h + 6.0 * (1.0 - cos(t * PI / 2.0)), cz + sin(a) * rr))
		node.add_child(Geo.tube(pts, 0.16, 0.16, Mats.brass(), 16, 6))
	for p in [[x0 + 1.2, z0 + 1.2], [x1 - 1.2, z0 + 1.2], [x0 + 1.2, z1 - 1.2], [x1 - 1.2, z1 - 1.2]]:
		b.box("pier", surf("ashlar"), Vector3(p[0], h / 2.0, p[1]), Vector3(1.4, h, 1.4))
		var cs := CollisionShape3D.new()
		var bs := BoxShape3D.new()
		bs.size = Vector3(1.4, h, 1.4)
		cs.shape = bs
		cs.position = Vector3(p[0], h / 2.0, p[1])
		body.add_child(cs)


## Slate roofs over the halls, seen from the courtyard and the observatory.
func _roof(r: Dictionary) -> void:
	var rr := CastleLayout.room_rect(r)
	var x0 := rr.position.x - 0.6
	var z0 := rr.position.y - 0.6
	var x1 := rr.end.x + 0.6
	var z1 := rr.end.y + 0.6
	var longx := CastleLayout.long_x(r)
	var base := float(r.h) + (0.2 if r.ceiling == "hammer" else 0.6)
	var span := (z1 - z0) if longx else (x1 - x0)
	var rise := span * (0.36 if r.ceiling == "hammer" else 0.3)
	var top := base + rise
	var m := surf("slate")
	var wm := surf("ashlar")
	if longx:
		var zm := (z0 + z1) / 2.0
		b.quad("roof", m, Vector3(x1, base, z0), Vector3(x0, base, z0), Vector3(x0, top, zm), Vector3(x1, top, zm))
		b.quad("roof", m, Vector3(x0, base, z1), Vector3(x1, base, z1), Vector3(x1, top, zm), Vector3(x0, top, zm))
		b.tri("masonry", wm, Vector3(x0, base, z0), Vector3(x0, base, z1), Vector3(x0, top, zm))
		b.tri("masonry", wm, Vector3(x1, base, z1), Vector3(x1, base, z0), Vector3(x1, top, zm))
	else:
		var xm := (x0 + x1) / 2.0
		b.quad("roof", m, Vector3(x0, base, z0), Vector3(x0, base, z1), Vector3(xm, top, z1), Vector3(xm, top, z0))
		b.quad("roof", m, Vector3(x1, base, z1), Vector3(x1, base, z0), Vector3(xm, top, z0), Vector3(xm, top, z1))
		b.tri("masonry", wm, Vector3(x1, base, z0), Vector3(x0, base, z0), Vector3(xm, top, z0))
		b.tri("masonry", wm, Vector3(x0, base, z1), Vector3(x1, base, z1), Vector3(xm, top, z1))
	if r.id == "hall":
		b.box("chimney", surf("brick"), Vector3(1.2, base + rise * 0.6, 26), Vector3(2.2, rise * 1.4, 2.4))
	if r.id == "armoury":
		b.box("chimney", surf("brick"), Vector3(64.5, base + rise * 0.6, 34), Vector3(2, rise * 1.3, 2))


# ---------- doorways ----------

## A stone arch around a doorway, on both faces of the wall. The outline runs up
## one jamb, over the arch and down the other, open at the bottom.
func _door_surround(d: Dictionary) -> void:
	var along_x: bool = (d.x1 - d.x0 >= d.z1 - d.z0) and d.z0 == d.z1
	var w: float = ((d.x1 - d.x0 + 1) if along_x else (d.z1 - d.z0 + 1)) * T
	var cx: float = (d.x0 + d.x1 + 1) / 2.0 * T
	var cz: float = (d.z0 + d.z1 + 1) / 2.0 * T
	var ow := w / 2.0 + 0.55
	var oh := door_h + 0.7
	var hw := w / 2.0
	var spring: float = door_h - minf(hw, door_h * 0.45)
	var outline := PackedVector2Array([Vector2(-ow, 0), Vector2(-hw, 0), Vector2(-hw, spring)])
	for i in 25:
		var a := PI - PI * i / 24.0
		outline.append(Vector2(cos(a) * hw, spring + sin(a) * (door_h - spring)))
	outline.append_array([Vector2(hw, 0), Vector2(ow, 0), Vector2(ow, oh), Vector2(-ow, oh)])
	var mesh := extrude(outline, 0.2)
	for side in [-1.0, 1.0]:
		var mi := MeshInstance3D.new()
		mi.mesh = mesh
		mi.material_override = surf("ashlar", { tint = Color(0.92, 0.88, 0.82), double = true })
		if along_x:
			mi.position = Vector3(cx, 0, cz + side * (T / 2.0 + 0.02))
			if side < 0:
				mi.rotation.y = PI
		else:
			mi.position = Vector3(cx + side * (T / 2.0 + 0.02), 0, cz)
			mi.rotation.y = PI / 2.0 if side > 0 else -PI / 2.0
		root.add_child(mi)


## A flat outline (no holes) extruded along +z by `depth`.
static func extrude(outline: PackedVector2Array, depth: float) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var pts := outline
	if Geometry2D.is_polygon_clockwise(pts):
		pts = pts.duplicate()
		pts.reverse()
	var tris := Geometry2D.triangulate_polygon(pts)
	for face in [[depth, Vector3.BACK], [0.0, Vector3.FORWARD]]:
		st.set_normal(face[1])
		for i in range(0, tris.size(), 3):
			var idx := [tris[i], tris[i + 1], tris[i + 2]] if face[0] == 0.0 else [tris[i], tris[i + 2], tris[i + 1]]
			for k in idx:
				st.add_vertex(Vector3(pts[k].x, pts[k].y, face[0]))
	for i in pts.size():
		var a := pts[i]
		var c := pts[(i + 1) % pts.size()]
		var n := Vector3(c.y - a.y, -(c.x - a.x), 0).normalized()
		st.set_normal(n)
		for v in [Vector3(a.x, a.y, 0), Vector3(c.x, c.y, depth), Vector3(c.x, c.y, 0), Vector3(a.x, a.y, 0), Vector3(a.x, a.y, depth), Vector3(c.x, c.y, depth)]:
			st.add_vertex(v)
	return st.commit()


# ---------- windows ----------

const WINDOWS := [
	["hall", "w", 20.0, 3.5, 1.6, 5.2, "lancet"], ["hall", "w", 32.0, 3.5, 1.6, 5.2, "lancet"], ["hall", "w", 38.5, 3.5, 1.6, 5.2, "lancet"],
	["hall", "n", 15.0, 11.6, 4.2, 4.2, "rose"],
	["gallery", "n", 4.5, 2.2, 1.1, 2.6, "lancet"], ["gallery", "n", 11.5, 2.2, 1.1, 2.6, "lancet"], ["gallery", "n", 19.5, 2.4, 1.1, 2.4, "lancet"],
	["library", "n", 30.0, 6.2, 1.4, 3.2, "lancet"], ["library", "n", 38.0, 6.2, 1.4, 3.2, "lancet"], ["library", "e", 19.0, 6.2, 1.4, 3.2, "lancet"],
	["entrance", "s", 27.5, 3.0, 1.5, 4.5, "lancet"], ["entrance", "s", 40.5, 3.0, 1.5, 4.5, "lancet"],
	["dungeon", "n", 57.0, 2.4, 1.0, 0.8, "slit"], ["dungeon", "n", 63.0, 2.4, 1.0, 0.8, "slit"],
	["armoury", "e", 29.0, 3.2, 1.4, 3.2, "lancet"],
	["courtyard", "n", 27.4, 5.2, 1.2, 2.5, "lit"], ["courtyard", "n", 40.6, 5.2, 1.2, 2.5, "lit"], ["courtyard", "n", 34.0, 6.0, 1.0, 2.0, "lit"],
	["courtyard", "w", 50.6, 5.4, 1.1, 2.3, "lit"], ["courtyard", "w", 58.0, 5.6, 1.0, 2.0, "lit"],
	["courtyard", "e", 47.6, 5.4, 1.1, 2.3, "lit"], ["courtyard", "e", 53.2, 5.5, 1.1, 2.3, "lit"],
]


func _window_shape(w: float, h: float, style: String) -> PackedVector2Array:
	var pts := PackedVector2Array()
	if style == "rose":
		for i in 48:
			var a := TAU * i / 48.0
			pts.append(Vector2(cos(a), sin(a)) * w / 2.0)
		return pts
	var hw := w / 2.0
	var spring := h if style == "slit" else h - hw * 1.2
	pts.append_array([Vector2(-hw, 0), Vector2(hw, 0), Vector2(hw, spring)])
	if style != "slit":
		# a pointed (lancet) arch: two curves meeting at the apex
		for i in range(1, 9):
			var t := i / 8.0
			pts.append(Vector2(hw * (1.0 - t * t), spring + (h - spring) * sin(t * PI / 2.0)))
		for i in range(7, 0, -1):
			var t := i / 8.0
			pts.append(Vector2(-hw * (1.0 - t * t), spring + (h - spring) * sin(t * PI / 2.0)))
	pts.append(Vector2(-hw, spring))
	return pts


func _windows() -> void:
	var leaded := _glass_texture(Color("#3a5684"), Color("#9ab4e6"), 9)
	var warm := _glass_texture(Color("#c47a2c"), Color("#ffd28a"), 19)
	var rose := _rose_texture()
	for wdef in WINDOWS:
		var r := CastleLayout.room(wdef[0])
		var rr := CastleLayout.room_rect(r)
		var side: String = wdef[1]
		var along: float = wdef[2]
		var sill: float = wdef[3]
		var w: float = wdef[4]
		var h: float = wdef[5]
		var style: String = wdef[6]
		# under a vault the long walls stop where the curve springs: keep the window below it
		var top: float = CastleLayout.wall_top(r, side) - 0.3
		if style != "rose" and sill + h > top:
			sill = maxf(0.9, top - h)
			h = minf(h, top - sill)
		var g := Node3D.new()
		match side:
			"n": g.position = Vector3(along, sill, rr.position.y + 0.03)
			"s":
				g.position = Vector3(along, sill, rr.end.y - 0.03)
				g.rotation.y = PI
			"w":
				g.position = Vector3(rr.position.x + 0.03, sill, along)
				g.rotation.y = PI / 2.0
			"e":
				g.position = Vector3(rr.end.x - 0.03, sill, along)
				g.rotation.y = -PI / 2.0
		var shape := _window_shape(w, h, style)
		var lit := style == "lit"
		var gm := StandardMaterial3D.new()
		gm.albedo_texture = rose if style == "rose" else (warm if lit else leaded)
		gm.emission_enabled = true
		gm.emission_texture = gm.albedo_texture
		gm.emission_energy_multiplier = 1.6 if style == "rose" else (1.4 if lit else 0.9)
		gm.roughness = 0.2
		var glass := MeshInstance3D.new()
		glass.mesh = _flat_poly(shape, w, h if style != "rose" else w, style == "rose")
		glass.material_override = gm
		glass.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		g.add_child(glass)
		# stone surround: a band following the window's outline
		var frame := MeshInstance3D.new()
		frame.mesh = _frame_band(shape, 0.3, 0.22, style == "rose")
		frame.material_override = surf("ashlar", { tint = Color(0.86, 0.82, 0.76), double = true })
		g.add_child(frame)
		if style != "rose":
			if style != "slit":
				g.add_child(Geo.box(0.08, h, 0.1, Mats.iron(), 0, h / 2.0, 0.05))
			g.add_child(Geo.box(w, 0.07, 0.1, Mats.iron(), 0, h * 0.45, 0.05))
		if lit:
			g.add_child(Geo.box(w + 0.7, 0.14, 0.42, Mats.stone(), 0, -0.36, 0.2))
		(rooms[r.id] as Node3D).add_child(g)
		if style == "rose":
			(rooms[r.id] as Node3D).add_child(Geo.light(g.position.x, sill - 1.0, g.position.z + 3.0, Color("#ffd8b0"), 25.0, 16.0, "window"))


func _flat_poly(shape: PackedVector2Array, w: float, h: float, centred: bool) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var pts := shape
	if Geometry2D.is_polygon_clockwise(pts):
		pts = pts.duplicate()
		pts.reverse()
	var tris := Geometry2D.triangulate_polygon(pts)
	st.set_normal(Vector3.BACK)
	for i in range(0, tris.size(), 3):
		for k in [tris[i], tris[i + 2], tris[i + 1]]:
			var p := pts[k]
			st.set_uv(Vector2((p.x + w / 2.0) / w, 1.0 - ((p.y + (h / 2.0 if centred else 0.0)) / h)))
			st.add_vertex(Vector3(p.x, p.y, 0.0))
	return st.commit()


## A ring of stone `width` wide around an outline, `depth` deep.
func _frame_band(shape: PackedVector2Array, width: float, depth: float, closed: bool) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var n := shape.size()
	var centre := Vector2.ZERO
	for p in shape:
		centre += p
	centre /= n
	var outer := PackedVector2Array()
	for p in shape:
		var dir := (p - centre).normalized()
		outer.append(p + dir * width)
	for i in n:
		var j := (i + 1) % n
		var a := Vector3(shape[i].x, shape[i].y, depth)
		var b2 := Vector3(shape[j].x, shape[j].y, depth)
		var c := Vector3(outer[j].x, outer[j].y, depth)
		var d := Vector3(outer[i].x, outer[i].y, depth)
		st.set_normal(Vector3.BACK)
		for v in [a, c, b2, a, d, c]:
			st.add_vertex(v)
		# inner reveal
		st.set_normal(Vector3(centre.x - shape[i].x, centre.y - shape[i].y, 0).normalized())
		for v in [Vector3(a.x, a.y, 0), a, b2, Vector3(a.x, a.y, 0), b2, Vector3(b2.x, b2.y, 0)]:
			st.add_vertex(v)
	st.generate_normals()
	return st.commit()


func _glass_texture(base: Color, light: Color, seed_value: int) -> ImageTexture:
	var img := Image.create(128, 128, false, Image.FORMAT_RGB8)
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_value
	for by in range(0, 128, 16):
		for bx in range(0, 128, 16):
			var c := base.lerp(light, 0.25 + rng.randf() * 0.4)
			img.fill_rect(Rect2i(bx, by, 16, 16), c)
	for y in 128:
		for x in 128:
			if (x + y) % 16 == 0 or (x - y + 128) % 16 == 0:
				img.set_pixel(x, y, Color("#151820"))
	return ImageTexture.create_from_image(img)


func _rose_texture() -> ImageTexture:
	var img := Image.create(256, 256, false, Image.FORMAT_RGB8)
	img.fill(Color("#151820"))
	var cols := [Color("#b02a2a"), Color("#2a5aa8"), Color("#d8b030"), Color("#2f8a4a"), Color("#7a3aa8")]
	for y in 256:
		for x in 256:
			var d := Vector2(x - 128, y - 128)
			var r := d.length()
			if r > 126:
				continue
			var a := fposmod(d.angle(), TAU)
			var petal := int(a / (TAU / 12.0))
			var ring := int(r / 26.0)
			var edge := fposmod(a, TAU / 12.0) < 0.04 or fposmod(r, 26.0) < 2.5
			if not edge:
				img.set_pixel(x, y, cols[(petal + ring) % cols.size()].lerp(Color.WHITE, 0.15))
	return ImageTexture.create_from_image(img)


# ---------- the castle's silhouette ----------

func _turrets() -> void:
	var stone := surf("ashlar")
	var slate := surf("slate")
	var lit := Mats.glow(Color("#ffb860"), 1.6)
	for t in [[-2.5, -2.5, 3.6, 19], [70.5, -2.5, 3.6, 19], [-2.5, 64.5, 3.6, 17], [70.5, 64.5, 3.6, 17],
			[26.5, 63.5, 2.6, 14], [41.5, 63.5, 2.6, 14], [34.0, -5.0, 4.6, 27], [70.0, 31.0, 3.0, 16]]:
		var x: float = t[0]
		var z: float = t[1]
		var rad: float = t[2]
		var h: float = t[3]
		root.add_child(Geo.cyl(rad, rad * 1.08, h, stone, x, h / 2.0, z, 28))
		root.add_child(Geo.cone(rad * 1.25, rad * 2.4, slate, x, h + rad * 1.2, z, 28))
		root.add_child(Geo.cone(0.12, 1.4, Mats.gold(), x, h + rad * 2.4 + 0.6, z, 6))
		for k in 2:
			var a := fposmod(k * 2.3 + x, TAU)
			var y := h * (0.45 + k * 0.25)
			var win := Geo.quad(0.6, 1.1, lit, x + cos(a) * (rad + 0.03), y, z + sin(a) * (rad + 0.03))
			win.rotation.y = -a + PI / 2.0
			root.add_child(win)
