class_name CastleLayout
## The castle's floor plan, from Content.castle (the same data the website uses):
## a grid of 2 m tiles where each cell is a room index, -2 for a doorway or -1
## for solid wall. Rooms and doors are inclusive tile rectangles.

const T := 2.0
static var _grid: PackedInt32Array
static var _w := 0
static var _h := 0
const FACE_YAW := { s = 0.0, e = PI / 2.0, n = PI, w = -PI / 2.0 }


static func castle() -> Dictionary:
	return Content.castle


static func grid() -> PackedInt32Array:
	if _grid.is_empty():
		var c := castle()
		_w = int(c.gridW)
		_h = int(c.gridH)
		_grid.resize(_w * _h)
		_grid.fill(-1)
		for i in c.rooms.size():
			var r: Dictionary = c.rooms[i]
			for tz in range(int(r.z0), int(r.z1) + 1):
				for tx in range(int(r.x0), int(r.x1) + 1):
					_grid[tz * _w + tx] = i
		for d in c.doors:
			for tz in range(int(d.z0), int(d.z1) + 1):
				for tx in range(int(d.x0), int(d.x1) + 1):
					_grid[tz * _w + tx] = -2
	return _grid


static func w() -> int:
	grid()
	return _w


static func h() -> int:
	grid()
	return _h


static func cell_at(tx: int, tz: int) -> int:
	var g := grid()
	if tx < 0 or tz < 0 or tx >= _w or tz >= _h:
		return -1
	return g[tz * _w + tx]


static func room_at(x: float, z: float) -> Variant:
	var c := cell_at(int(floor(x / T)), int(floor(z / T)))
	return castle().rooms[c] if c >= 0 else null


static func room_index(id: String) -> int:
	var rooms: Array = castle().rooms
	for i in rooms.size():
		if rooms[i].id == id:
			return i
	return -1


static func room(id: String) -> Dictionary:
	return castle().rooms[room_index(id)]


## World-space rectangle of a room: Rect2(x0, z0, width, depth).
static func room_rect(r: Dictionary) -> Rect2:
	return Rect2(r.x0 * T, r.z0 * T, (r.x1 - r.x0 + 1) * T, (r.z1 - r.z0 + 1) * T)


static func long_x(r: Dictionary) -> bool:
	var rr := room_rect(r)
	return rr.size.x >= rr.size.y


static func vault_spring(r: Dictionary) -> float:
	var rr := room_rect(r)
	var span: float = rr.size.y if long_x(r) else rr.size.x
	return r.h - min(span / 2.0 * 0.55, r.h * 0.45)


## How tall a room's wall is on a given side (vault long walls stop at the spring).
static func wall_top(r: Dictionary, side: String) -> float:
	if r.ceiling == "vault":
		var long_edge := (side == "n" or side == "s") if long_x(r) else (side == "e" or side == "w")
		return vault_spring(r) if long_edge else float(r.h)
	return float(r.h)


## Where you stand to use a station: in front of its object.
static func ring_pos(s: Dictionary) -> Vector2:
	var v: Array = castle().faceVec[s.face]
	var off: float = castle().ringOffset.get(s.prop, 1.6)
	return Vector2(s.x + v[0] * off, s.z + v[1] * off)


static func start() -> Dictionary:
	return castle().start


## Room id -> room ids you can see into through a doorway (including itself).
static func neighbours() -> Dictionary:
	var n := {}
	for r in castle().rooms:
		n[r.id] = { r.id: true }
	for d in castle().doors:
		var ids := {}
		for tz in range(int(d.z0) - 1, int(d.z1) + 2):
			for tx in range(int(d.x0) - 1, int(d.x1) + 2):
				var c := cell_at(tx, tz)
				if c >= 0:
					ids[castle().rooms[c].id] = true
		for a in ids:
			for b in ids:
				n[a][b] = true
	return n
