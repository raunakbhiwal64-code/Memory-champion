class_name Keeper
extends Node3D
## The Keeper: a hooded figure in a long linen cloak, carrying a lantern.
## Built facing +z; the walk cycle swings legs and arms and sways the lantern.

var body: Node3D
var leg_l: Node3D
var leg_r: Node3D
var arm_l: Node3D
var arm_r: Node3D
var lantern_g: Node3D
var lantern_light: OmniLight3D
var walk_phase := 0.0


func _init() -> void:
	var cloak := Mats.mat(0x5a5e66, { roughness = 0.95, tex = "wool", tint = Color("#4a4e58") })
	var lining := Mats.mat(0x6a3030, { roughness = 0.95, double = true, tex = "wool", tint = Color("#5a2626") })
	var leather := Mats.mat(0x4a3020, { roughness = 0.7 })
	var skin := Mats.mat(0xd9a882, { roughness = 0.65 })
	# a soft contact shadow
	var shadow_mat := StandardMaterial3D.new()
	shadow_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	shadow_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	shadow_mat.albedo_texture = Mats.glow_texture()
	shadow_mat.albedo_color = Color(0, 0, 0, 0.55)
	var shadow := Geo.quad(1.3, 1.3, shadow_mat, 0, 0.015, 0)
	shadow.rotation.x = -PI / 2.0
	shadow.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(shadow)

	leg_l = _leg(leather)
	leg_r = _leg(leather)
	leg_l.position = Vector3(-0.11, 0.6, 0)
	leg_r.position = Vector3(0.11, 0.6, 0)
	add_child(leg_l)
	add_child(leg_r)

	body = Node3D.new()
	add_child(body)
	body.add_child(_drape(Geo.lathe([[0.52, 0.22], [0.5, 0.26], [0.45, 0.4], [0.42, 0.55], [0.37, 0.75], [0.33, 0.9], [0.29, 1.1], [0.27, 1.25], [0.26, 1.5], [0.2, 1.68], [0.001, 1.72]], cloak, 72)))
	var lin := _drape(Geo.lathe([[0.49, 0.24], [0.44, 0.4], [0.41, 0.55], [0.36, 0.75], [0.32, 0.9], [0.25, 1.5]], lining, 72))
	lin.scale = Vector3(0.97, 1, 0.97)
	body.add_child(lin)
	var belt := Geo.torus(0.29, 0.03, leather, 0, 1.12, 0, TAU, 6, 28)
	belt.rotation.x = PI / 2.0
	body.add_child(belt)
	body.add_child(Geo.box(0.08, 0.07, 0.03, Mats.brass(), 0, 1.12, 0.29))
	body.add_child(Geo.sph(0.15, skin, 0, 1.86, 0.03))
	var hood := Geo.sph(0.235, cloak, 0, 1.85, -0.02, 22, 16)
	hood.rotation.x = -0.55
	hood.scale = Vector3(1, 1.15, 1.08)
	body.add_child(hood)
	var tip := Geo.cone(0.12, 0.35, cloak, 0, 1.98, -0.24, 12)
	tip.rotation.x = -2.2
	body.add_child(tip)
	body.add_child(Geo.lathe([[0.3, 1.42], [0.36, 1.45], [0.3, 1.6], [0.17, 1.72]], cloak, 28))
	body.add_child(Geo.rot_z(Geo.box(0.26, 0.22, 0.1, leather, -0.32, 1.0, 0.1), 0.15))

	arm_l = _arm(cloak, skin)
	arm_r = _arm(cloak, skin)
	arm_l.position = Vector3(-0.3, 1.58, 0)
	arm_r.position = Vector3(0.3, 1.58, 0)
	add_child(arm_l)
	add_child(arm_r)

	# the lantern, hanging from the right hand
	lantern_g = Node3D.new()
	lantern_g.add_child(Geo.torus(0.05, 0.008, Mats.iron(), 0, 0, 0, PI, 6, 16))
	var cage := Node3D.new()
	cage.add_child(Geo.cone(0.1, 0.08, Mats.iron(), 0, -0.09, 0, 6))
	var flame := Geo.cyl(0.075, 0.075, 0.2, Mats.mat(0xffe2a0, { emissive = 0xffb050, energy = 3.0, alpha = 0.8 }), 0, -0.23, 0, 6, true)
	flame.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	cage.add_child(flame)
	cage.add_child(Geo.cyl(0.09, 0.09, 0.03, Mats.iron(), 0, -0.345, 0, 6))
	for i in 6:
		var a := i / 6.0 * TAU
		cage.add_child(Geo.box(0.012, 0.22, 0.012, Mats.iron(), cos(a) * 0.078, -0.23, sin(a) * 0.078))
	var glow := Geo.glow(Color(1.0, 0.78, 0.47, 0.9), 0.9)
	glow.position.y = -0.23
	cage.add_child(glow)
	lantern_light = OmniLight3D.new()
	lantern_light.light_color = Color("#ffc27a")
	lantern_light.light_energy = 1.4
	lantern_light.omni_range = 8.0
	lantern_light.omni_attenuation = 1.6
	lantern_light.position.y = -0.23
	lantern_light.shadow_enabled = false
	cage.add_child(lantern_light)
	lantern_g.add_child(cage)
	lantern_g.position = Vector3(0, -0.7, 0.04)
	arm_r.add_child(lantern_g)
	for mi in find_children("*", "MeshInstance3D", true, false):
		if mi != shadow and mi != glow and mi != flame:
			(mi as MeshInstance3D).cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON


func _leg(leather: Material) -> Node3D:
	var g := Node3D.new()
	g.add_child(Geo.cyl(0.075, 0.065, 0.55, Mats.mat(0x2a2420, { roughness = 0.9 }), 0, -0.27, 0, 10))
	g.add_child(Geo.box(0.15, 0.12, 0.27, leather, 0, -0.55, 0.05))
	return g


func _arm(cloak: Material, skin: Material) -> Node3D:
	var g := Node3D.new()
	g.add_child(Geo.cyl(0.075, 0.11, 0.6, cloak, 0, -0.3, 0, 10))
	g.add_child(Geo.sph(0.055, skin, 0, -0.64, 0, 10, 8))
	return g


## Heavy cloth hangs in folds, deeper towards the hem, and the hem isn't level.
func _drape(mi: MeshInstance3D) -> MeshInstance3D:
	var arrays := (mi.mesh as ArrayMesh).surface_get_arrays(0)
	var verts: PackedVector3Array = arrays[Mesh.ARRAY_VERTEX]
	for i in verts.size():
		var v := verts[i]
		var r := Vector2(v.x, v.z).length()
		if r < 0.01:
			continue
		var a := atan2(v.x, v.z)
		var f := clampf((1.45 - v.y) / 1.1, 0.0, 1.0)
		var k := 1.0 + 0.07 * f * sin(9.0 * a + 1.7 * sin(3.0 * a)) + 0.025 * f * sin(23.0 * a)
		verts[i] = Vector3(v.x * k, v.y + (0.03 * sin(5.0 * a + 1.0) if v.y < 0.3 else 0.0), v.z * k)
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var idx: PackedInt32Array = arrays[Mesh.ARRAY_INDEX]
	var uvs: PackedVector2Array = arrays[Mesh.ARRAY_TEX_UV]
	for i in verts.size():
		st.set_uv(uvs[i] * Vector2(3.0, 1.6))
		st.add_vertex(verts[i])
	for i in idx:
		st.add_index(i)
	st.generate_normals()
	mi.mesh = st.commit()
	return mi


func animate(speed: float, near_station: bool, dt: float, t: float) -> void:
	var moving := speed > 0.2
	walk_phase += dt * (speed * 2.6 if moving else 0.0)
	var k: float = min(1.0, speed / 3.0)
	var swing: float = sin(walk_phase) * k if moving else 0.0
	leg_l.rotation.x = swing * 0.7
	leg_r.rotation.x = -swing * 0.7
	arm_l.rotation.x = -swing * 0.5
	arm_r.rotation.x = swing * 0.25 - 0.25 + (-0.5 if near_station else 0.0)
	lantern_g.rotation.x = -arm_r.rotation.x + sin(t * 2.2) * 0.05 + swing * 0.15
	body.position.y = absf(sin(walk_phase)) * 0.045 if moving else sin(t * 1.4) * 0.01
	body.rotation.z = sin(walk_phase) * 0.025 if moving else 0.0
	lantern_light.light_energy = 1.4 * (1.0 + sin(t * 9.0) * 0.04 + sin(t * 23.0) * 0.03)
