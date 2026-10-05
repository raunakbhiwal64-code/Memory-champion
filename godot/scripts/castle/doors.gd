class_name CastleDoors
## Oak double doors in every archway. They swing open, away from you, as you
## walk up, and close again once you've moved on: there's nothing to press.

const T := CastleLayout.T
const OPEN_R := 6.0
const CLOSE_R := 7.5
const MAX_ANGLE := 1.62
var doors: Array = []


func build(parent: Node3D) -> void:
	var door_h := float(CastleLayout.castle().doorH)
	var wood := Mats.mat(0x8a6a50, { roughness = 0.75, tex = "beam", tint = Color("#9a8878") })
	var iron := Mats.mat(0x2a2724, { metal = 0.85, roughness = 0.55 })
	for d in CastleLayout.castle().doors:
		var along_x: bool = (d.x1 - d.x0 >= d.z1 - d.z0) and d.z0 == d.z1
		var w: float = ((d.x1 - d.x0 + 1) if along_x else (d.z1 - d.z0 + 1)) * T
		var root := Node3D.new()
		root.position = Vector3((d.x0 + d.x1 + 1) / 2.0 * T, 0, (d.z0 + d.z1 + 1) / 2.0 * T)
		root.rotation.y = 0.0 if along_x else PI / 2.0
		var hw := w / 2.0 - 0.04
		var left := _leaf(hw, -1, door_h, wood, iron)
		var right := _leaf(hw, 1, door_h, wood, iron)
		root.add_child(left)
		root.add_child(right)
		parent.add_child(root)
		doors.append({ root = root, left = left, right = right, open = 0.0, swing = 1.0, want = false })


func _leaf(hw: float, side: int, door_h: float, wood: Material, iron: Material) -> Node3D:
	var pivot := Node3D.new()
	var spring: float = door_h - minf(hw, door_h * 0.45)
	var ry := door_h - spring
	var gap := 0.025
	# the half of the arch opening on this side of the centre line, hinge at x=0
	var dir := 1.0 if side < 0 else -1.0
	var pts := PackedVector2Array([Vector2(0, 0), Vector2(0, spring)])
	for i in range(1, 17):
		var a := PI - PI / 2.0 * i / 16.0
		pts.append(Vector2((hw + cos(a) * hw) * 1.0, spring + sin(a) * ry - 0.02))
	pts.append(Vector2(hw - gap, door_h - 0.02))
	pts.append(Vector2(hw - gap, 0))
	if dir < 0:
		for i in pts.size():
			pts[i].x = -pts[i].x
	var mesh := CastleArchitecture.extrude(pts, 0.11)
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = wood
	mi.position.z = -0.055
	pivot.add_child(mi)
	# three wrought-iron straps on each face, studded, and a ring pull
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	for y in [0.55, 1.9, min(3.2, spring + ry * 0.45)]:
		var width := hw if y <= spring else hw * sqrt(max(0.0, 1.0 - pow((y + 0.05 - spring) / ry, 2.0)))
		var length: float = width - 0.12
		if length < 0.4:
			continue
		for face in [-1.0, 1.0]:
			var strap := BoxMesh.new()
			strap.size = Vector3(length, 0.075, 0.018)
			st.append_from(strap, 0, Transform3D(Basis(), Vector3(dir * (0.05 + length / 2.0), y, face * 0.072)))
			var x := 0.2
			while x < length - 0.05:
				var stud := SphereMesh.new()
				stud.radius = 0.022
				stud.height = 0.044
				stud.radial_segments = 8
				stud.rings = 4
				st.append_from(stud, 0, Transform3D(Basis(), Vector3(dir * (0.05 + x), y, face * 0.081)))
				x += 0.32
	for face in [-1.0, 1.0]:
		var plate := CylinderMesh.new()
		plate.top_radius = 0.075
		plate.bottom_radius = 0.075
		plate.height = 0.02
		st.append_from(plate, 0, Transform3D(Basis(Vector3.RIGHT, PI / 2.0), Vector3(dir * (hw - 0.28), 1.15, face * 0.072)))
		var ring := TorusMesh.new()
		ring.inner_radius = 0.086
		ring.outer_radius = 0.114
		st.append_from(ring, 0, Transform3D(Basis(Vector3.RIGHT, PI / 2.0), Vector3(dir * (hw - 0.28), 1.06, face * 0.095)))
	var ironwork := MeshInstance3D.new()
	ironwork.mesh = st.commit()
	ironwork.material_override = iron
	pivot.add_child(ironwork)
	pivot.position.x = side * (hw + 0.04)
	return pivot


## Opens doors near the keeper; dt is real elapsed time.
func update(player: Vector3, dt: float) -> bool:
	var moved := false
	for d in doors:
		var root: Node3D = d.root
		var rel := player - root.position
		var dist := Vector2(rel.x, rel.z).length()
		if dist < OPEN_R:
			d.want = true
		elif dist > CLOSE_R:
			d.want = false
		if d.open < 0.02:
			# always swing away from you
			var lz := rel.x * sin(root.rotation.y) + rel.z * cos(root.rotation.y)
			d.swing = 1.0 if lz >= 0.0 else -1.0
		var target := 1.0 if d.want else 0.0
		if d.open != target:
			var speed := 2.2 if d.want else 0.8
			d.open = min(1.0, d.open + dt * speed) if target > d.open else max(0.0, d.open - dt * speed)
			var e: float = d.open * d.open * (3.0 - 2.0 * d.open)
			d.left.rotation.y = d.swing * e * MAX_ANGLE
			d.right.rotation.y = -d.swing * e * MAX_ANGLE
			moved = true
	return moved


func states() -> Array:
	return doors.map(func(d): return { open = d.open, x = d.root.position.x, z = d.root.position.z })
