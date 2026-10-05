class_name CastleAtmosphere
## Lighting environment, weather and sound: the night sky and moon, global
## illumination, fog, rain in the courtyard, embers, dust and a soundscape
## synthesised on the fly (no audio files).

const QUALITY := {
	low = { sdfgi = false, ssao = false, ssil = false, vfog = false, glow = true, shadows = 1, scale = 0.75 },
	medium = { sdfgi = false, ssao = true, ssil = false, vfog = true, glow = true, shadows = 2, scale = 1.0 },
	high = { sdfgi = true, ssao = true, ssil = true, vfog = true, glow = true, shadows = 3, scale = 1.0 },
}

var env: Environment
var world_env: WorldEnvironment
var moon: DirectionalLight3D
var audio := {}
var muted := false
var _gens := {}


func build(root: Node3D, rooms: Dictionary) -> void:
	env = Environment.new()
	env.background_mode = Environment.BG_SKY
	var sky := Sky.new()
	var sm := ShaderMaterial.new()
	sm.shader = load("res://shaders/night_sky.gdshader")
	sky.sky_material = sm
	sky.radiance_size = Sky.RADIANCE_SIZE_128
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	env.ambient_light_energy = 0.35
	env.reflected_light_source = Environment.REFLECTION_SOURCE_SKY
	env.tonemap_mode = Environment.TONE_MAPPER_ACES
	env.tonemap_exposure = 1.15
	env.tonemap_white = 6.0
	env.glow_enabled = true
	env.glow_intensity = 0.5
	env.glow_strength = 0.9
	env.glow_bloom = 0.04
	env.glow_hdr_threshold = 1.4
	env.glow_blend_mode = Environment.GLOW_BLEND_MODE_SOFTLIGHT
	env.fog_enabled = true
	env.fog_light_color = Color(0.06, 0.08, 0.14)
	env.fog_density = 0.006
	env.fog_sky_affect = 0.15
	env.volumetric_fog_density = 0.012
	env.volumetric_fog_albedo = Color(0.85, 0.88, 0.95)
	env.volumetric_fog_emission = Color(0.0, 0.0, 0.0)
	env.volumetric_fog_length = 48.0
	env.volumetric_fog_ambient_inject = 0.15
	env.ssao_radius = 1.2
	env.ssao_intensity = 1.6
	env.ssil_radius = 4.0
	env.sdfgi_use_occlusion = true
	env.sdfgi_cascades = 3
	env.sdfgi_min_cell_size = 0.25
	env.sdfgi_energy = 1.0
	env.adjustment_enabled = true
	env.adjustment_contrast = 1.06
	env.adjustment_saturation = 0.92
	world_env = WorldEnvironment.new()
	world_env.environment = env
	var cam_attr := CameraAttributesPractical.new()
	world_env.camera_attributes = cam_attr
	root.add_child(world_env)

	moon = DirectionalLight3D.new()
	moon.light_color = Color(0.67, 0.75, 1.0)
	moon.light_energy = 0.45
	moon.shadow_enabled = true
	moon.directional_shadow_max_distance = 70.0
	moon.directional_shadow_mode = DirectionalLight3D.SHADOW_PARALLEL_2_SPLITS
	moon.light_volumetric_fog_energy = 1.5
	moon.look_at_from_position(Vector3(-20, 60, -40), Vector3(40, 0, 40))
	root.add_child(moon)
	var sky_dir := -moon.global_transform.basis.z
	sm.set_shader_parameter("moon_dir", -sky_dir)

	_ground(root)
	_hills(root)
	_rain(rooms.courtyard)
	_points(rooms.entrance, CastleLayout.room("entrance"), Color(1.0, 0.88, 0.67, 0.7), 160, 0.03, 0.12, 0.0)
	_points(rooms.library, CastleLayout.room("library"), Color(1.0, 0.88, 0.67, 0.7), 160, 0.03, 0.12, 0.0)
	_points(rooms.gallery, CastleLayout.room("gallery"), Color(1.0, 0.88, 0.67, 0.7), 120, 0.03, 0.12, 0.0)
	_embers(rooms.hall, Vector3(5.5, 0.5, 26), Vector3(2.5, 0.1, 4), Color(1.0, 0.55, 0.2), 120, 0.9)
	_embers(rooms.armoury, Vector3(63.5, 1.2, 34), Vector3(2.0, 0.1, 1.5), Color(1.0, 0.67, 0.24), 90, 1.6)


func _ground(root: Node3D) -> void:
	var g := Geo.cyl(260, 260, 0.1, Mats.mat(0x141a14, { roughness = 1.0 }), 34, -0.1, 31, 32)
	g.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	root.add_child(g)


func _hills(root: Node3D) -> void:
	var r := RandomNumberGenerator.new()
	r.seed = 5
	var hill := Mats.mat(0x0e1420, { roughness = 1.0 })
	for i in 26:
		var a := i / 26.0 * TAU
		var d := 160.0 + r.randf() * 60.0
		var hh := 18.0 + r.randf() * 40.0
		var cone := Geo.cone(30.0 + r.randf() * 30.0, hh, hill, 34 + cos(a) * d, hh / 2.0 - 6.0, 31 + sin(a) * d, 6)
		cone.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		root.add_child(cone)


func _particle_mat(color: Color, additive: bool) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	if additive:
		m.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	m.albedo_color = color
	m.albedo_texture = Mats.glow_texture()
	m.billboard_mode = BaseMaterial3D.BILLBOARD_PARTICLES
	m.vertex_color_use_as_albedo = true
	return m


## Rain over the courtyard: thin streaks falling fast at a slight angle.
func _rain(room: Node3D) -> void:
	var r := CastleLayout.room_rect(CastleLayout.room("courtyard"))
	var p := GPUParticles3D.new()
	p.amount = 2400
	p.lifetime = 1.2
	p.preprocess = 1.2
	p.visibility_aabb = AABB(Vector3(-12, -14, -10), Vector3(24, 18, 20))
	var pm := ParticleProcessMaterial.new()
	pm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
	pm.emission_box_extents = Vector3(r.size.x / 2.0, 0.5, r.size.y / 2.0)
	pm.direction = Vector3(0.12, -1, 0.05)
	pm.spread = 2.0
	pm.initial_velocity_min = 14.0
	pm.initial_velocity_max = 17.0
	pm.gravity = Vector3(0, -6, 0)
	p.process_material = pm
	var streak := QuadMesh.new()
	streak.size = Vector2(0.008, 0.42)
	var sm := StandardMaterial3D.new()
	sm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	sm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	sm.albedo_color = Color(0.75, 0.82, 0.95, 0.16)
	sm.billboard_mode = BaseMaterial3D.BILLBOARD_FIXED_Y
	streak.material = sm
	p.draw_pass_1 = streak
	p.position = Vector3(r.get_center().x, 12.0, r.get_center().y)
	p.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	room.add_child(p)


## Dust motes drifting in lamplight.
func _points(room: Node3D, r: Dictionary, color: Color, count: int, size: float, drift: float, rise: float) -> void:
	var rr := CastleLayout.room_rect(r)
	var p := GPUParticles3D.new()
	p.amount = count
	p.lifetime = 12.0
	p.preprocess = 12.0
	var pm := ParticleProcessMaterial.new()
	pm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
	pm.emission_box_extents = Vector3(rr.size.x / 2.0, float(r.h) * 0.4, rr.size.y / 2.0)
	pm.gravity = Vector3(0, rise, 0)
	pm.initial_velocity_min = 0.0
	pm.initial_velocity_max = drift
	pm.spread = 180.0
	pm.turbulence_enabled = true
	pm.turbulence_noise_strength = 0.4
	p.process_material = pm
	var q := QuadMesh.new()
	q.size = Vector2(size, size)
	q.material = _particle_mat(color, true)
	p.draw_pass_1 = q
	p.position = Vector3(rr.get_center().x, float(r.h) * 0.45, rr.get_center().y)
	p.visibility_aabb = AABB(Vector3(-rr.size.x, -r.h, -rr.size.y), Vector3(rr.size.x * 2, r.h * 2, rr.size.y * 2))
	room.add_child(p)


## Embers or sparks rising from a fire.
func _embers(room: Node3D, at: Vector3, extents: Vector3, color: Color, count: int, speed: float) -> void:
	var p := GPUParticles3D.new()
	p.amount = count
	p.lifetime = 3.5
	p.preprocess = 3.5
	var pm := ParticleProcessMaterial.new()
	pm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
	pm.emission_box_extents = extents
	pm.direction = Vector3(0, 1, 0)
	pm.spread = 25.0
	pm.initial_velocity_min = speed * 0.5
	pm.initial_velocity_max = speed
	pm.gravity = Vector3(0, 0.3, 0)
	pm.turbulence_enabled = true
	pm.turbulence_noise_strength = 1.2
	pm.scale_min = 0.5
	pm.scale_max = 1.0
	var fade := Gradient.new()
	fade.set_color(0, Color(1, 1, 1, 1))
	fade.set_color(1, Color(1, 1, 1, 0))
	var gt := GradientTexture1D.new()
	gt.gradient = fade
	pm.color_ramp = gt
	p.process_material = pm
	var q := QuadMesh.new()
	q.size = Vector2(0.07, 0.07)
	q.material = _particle_mat(color, true)
	p.draw_pass_1 = q
	p.position = at
	room.add_child(p)


func apply_quality(name: String, viewport: Viewport, lights: Array) -> void:
	var q: Dictionary = QUALITY.get(name, QUALITY.medium)
	var mobile := RenderingServer.get_current_rendering_method() != "forward_plus"
	env.sdfgi_enabled = q.sdfgi and not mobile
	env.ssao_enabled = q.ssao and not mobile
	env.ssil_enabled = q.ssil and not mobile
	env.volumetric_fog_enabled = q.vfog and not mobile
	env.glow_enabled = q.glow
	viewport.scaling_3d_scale = q.scale
	viewport.msaa_3d = Viewport.MSAA_4X if name == "high" else (Viewport.MSAA_2X if name == "medium" else Viewport.MSAA_DISABLED)
	viewport.screen_space_aa = Viewport.SCREEN_SPACE_AA_FXAA if name == "low" else Viewport.SCREEN_SPACE_AA_DISABLED
	# the biggest fires and lanterns keep their shadows; the rest are cheap point lights
	var shadowed := lights.filter(func(l): return l.get_meta("kind", "") in ["fire", "lantern"])
	for i in shadowed.size():
		shadowed[i].shadow_enabled = i < q.shadows * 3
	moon.shadow_enabled = name != "low"


# ---------- sound, synthesised ----------

func build_audio(root: Node3D) -> void:
	for kind in ["rain", "fire", "room", "cave", "wind"]:
		var p := AudioStreamPlayer.new()
		var gen := AudioStreamGenerator.new()
		gen.mix_rate = 11025.0
		gen.buffer_length = 0.25
		p.stream = gen
		p.volume_db = -80.0
		p.bus = "Master"
		root.add_child(p)
		audio[kind] = p
		_gens[kind] = { lp = 0.0, lp2 = 0.0, crackle = 0.0, phase = randf() * 100.0 }


func start_audio() -> void:
	for k in audio:
		if not audio[k].playing:
			audio[k].play()


func stop_audio() -> void:
	for k in audio:
		audio[k].stop()


## Room-dependent mix: rain in the courtyard, fire in the hall and forge, a low
## room tone indoors, wind in the observatory, drips in the cellar.
func update_audio(room_id: String, near_fire: float, dt: float) -> void:
	if audio.is_empty():
		return
	var target := { rain = -80.0, fire = -80.0, room = -26.0, cave = -80.0, wind = -80.0 }
	match room_id:
		"courtyard":
			target.rain = -10.0
			target.room = -80.0
		"tower":
			target.wind = -16.0
		"dungeon":
			target.cave = -18.0
		_:
			target.rain = -32.0  # heard faintly through the walls
	target.fire = lerpf(-80.0, -12.0, clampf(near_fire, 0.0, 1.0))
	for k in audio:
		var p: AudioStreamPlayer = audio[k]
		var goal: float = -80.0 if muted else target[k]
		p.volume_db = lerpf(p.volume_db, goal, clampf(dt * 2.0, 0.0, 1.0))
		if p.playing and (p.volume_db > -60.0 or goal > -60.0):
			_fill(k, p)


func _fill(kind: String, p: AudioStreamPlayer) -> void:
	var pb := p.get_stream_playback() as AudioStreamGeneratorPlayback
	if pb == null:
		return
	var s: Dictionary = _gens[kind]
	var n := pb.get_frames_available()
	for i in n:
		var w := randf() * 2.0 - 1.0
		var v := 0.0
		match kind:
			"rain":
				s.lp += (w - s.lp) * 0.35
				v = (w - s.lp) * 0.5 + s.lp * 0.3
			"fire":
				s.lp += (w - s.lp) * 0.05
				s.crackle *= 0.995
				if randf() < 0.0007:
					s.crackle = 0.9
				v = s.lp * 0.6 + w * s.crackle * 0.5
			"room":
				s.lp += (w - s.lp) * 0.008
				s.lp2 += (s.lp - s.lp2) * 0.02
				v = s.lp2 * 3.0
			"wind":
				s.phase += 1.0 / 11025.0
				s.lp += (w - s.lp) * (0.01 + 0.02 * (0.5 + 0.5 * sin(s.phase * 0.7)))
				v = s.lp * 2.2
			"cave":
				s.lp += (w - s.lp) * 0.01
				s.crackle *= 0.9993
				s.phase += 1.0
				if randf() < 0.00004:
					s.crackle = 1.0
				v = s.lp * 1.2 + sin(s.phase * 0.18) * s.crackle * 0.4
		pb.push_frame(Vector2(v, v))
