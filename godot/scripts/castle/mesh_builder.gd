class_name MeshBuilder
## Collects triangles per material and emits one mesh per material, so the
## whole building is a handful of draw calls. Surfaces use world-mapped
## materials, so only positions and normals are needed.

var parts := {}  ## material key -> { st, material }


func _part(key: String, material: Material) -> SurfaceTool:
	if not parts.has(key):
		var st := SurfaceTool.new()
		st.begin(Mesh.PRIMITIVE_TRIANGLES)
		parts[key] = { st = st, material = material }
	return parts[key].st


## A quad from four corners, counter-clockwise seen from the front.
func quad(key: String, m: Material, a: Vector3, b: Vector3, c: Vector3, d: Vector3) -> void:
	var st := _part(key, m)
	var n := (b - a).cross(c - a).normalized()
	st.set_normal(n)
	for p in [a, c, b, a, d, c]:
		st.set_uv(Vector2(p.x + p.z, p.y))
		st.add_vertex(p)


func tri(key: String, m: Material, a: Vector3, b: Vector3, c: Vector3) -> void:
	var st := _part(key, m)
	st.set_normal((b - a).cross(c - a).normalized())
	for p in [a, c, b]:
		st.set_uv(Vector2(p.x + p.z, p.y))
		st.add_vertex(p)


## Vertical wall quad along an edge, facing (nx, nz).
func wall(key: String, m: Material, x0: float, z0: float, x1: float, z1: float, y0: float, y1: float) -> void:
	quad(key, m, Vector3(x0, y0, z0), Vector3(x1, y0, z1), Vector3(x1, y1, z1), Vector3(x0, y1, z0))


## Horizontal rectangle at height y, facing up (or down).
func flat(key: String, m: Material, x0: float, z0: float, x1: float, z1: float, y: float, down := false) -> void:
	if down:
		quad(key, m, Vector3(x0, y, z0), Vector3(x1, y, z0), Vector3(x1, y, z1), Vector3(x0, y, z1))
	else:
		quad(key, m, Vector3(x0, y, z1), Vector3(x1, y, z1), Vector3(x1, y, z0), Vector3(x0, y, z0))


## An axis-aligned (optionally rotated about Y) box with all six faces.
func box(key: String, m: Material, center: Vector3, size: Vector3, yaw := 0.0) -> void:
	var h := size / 2.0
	var bs := Basis(Vector3.UP, yaw)
	var c := func(x, y, z): return center + bs * Vector3(x * h.x, y * h.y, z * h.z)
	var v := [c.call(-1, -1, -1), c.call(1, -1, -1), c.call(1, 1, -1), c.call(-1, 1, -1),
		c.call(-1, -1, 1), c.call(1, -1, 1), c.call(1, 1, 1), c.call(-1, 1, 1)]
	quad(key, m, v[4], v[5], v[6], v[7])  # +z
	quad(key, m, v[1], v[0], v[3], v[2])  # -z
	quad(key, m, v[5], v[1], v[2], v[6])  # +x
	quad(key, m, v[0], v[4], v[7], v[3])  # -x
	quad(key, m, v[7], v[6], v[2], v[3])  # +y
	quad(key, m, v[0], v[1], v[5], v[4])  # -y


func build(parent: Node3D, shadows := true) -> void:
	for key in parts:
		var p: Dictionary = parts[key]
		var mi := MeshInstance3D.new()
		mi.mesh = p.st.commit()
		mi.material_override = p.material
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if shadows else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		mi.name = key
		parent.add_child(mi)
	parts = {}
