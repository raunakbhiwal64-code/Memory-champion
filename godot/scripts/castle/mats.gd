class_name Mats
## Materials for the castle: world-mapped surfaces for architecture, physically
## based props, and glows. Everything is cached, so identical materials are shared.

const TEX_DIR := "res://assets/castle/textures/"
static var _cache := {}
static var _manifest := {}
static var _noise: Texture2D
static var _surface_shader: Shader
static var _surface_shader_2s: Shader
static var _glow_tex: Texture2D
const GRIME := { plaster = 0.18, panel = 0.18, parquet = 0.18 }


static func manifest() -> Dictionary:
	if _manifest.is_empty():
		var f := FileAccess.open("res://assets/castle/manifest.json", FileAccess.READ)
		_manifest = JSON.parse_string(f.get_as_text()) if f else { textures = {} }
	return _manifest


## Real-world size of one tile of a texture set, in metres.
static func tile_metres(key: String) -> float:
	if key == "starmap":
		return 6.0
	return float(manifest().textures.get(key, {}).get("scale", 2.0))


static func tex(key: String, map: String) -> Texture2D:
	if key == "starmap":
		return _starmap() if map == "color" else null
	var path := TEX_DIR + key + "/" + map + ".webp"
	return load(path) if ResourceLoader.exists(path) else null


## The observatory floor: midnight-blue tiles inlaid with gilt stars and a ring.
static func _starmap() -> Texture2D:
	if _cache.has("tex:starmap"):
		return _cache["tex:starmap"]
	var n := 256
	var img := Image.create(n, n, false, Image.FORMAT_RGB8)
	var noise := FastNoiseLite.new()
	noise.frequency = 0.03
	var rng := RandomNumberGenerator.new()
	rng.seed = 141
	var stars := []
	for k in 30:
		stars.append(Vector3(rng.randf() * n, rng.randf() * n, 0.8 + rng.randf() * 1.6))
	var gold := Color8(212, 176, 92)
	var tw := n / 2
	for y in n:
		for x in n:
			var c := Color8(28, 38, 74) * (0.85 + noise.get_noise_2d(x, y) * 0.3)
			var ring := absf(Vector2(x - n / 2.0, y - n / 2.0).length() - n * 0.42)
			if ring < 1.2:
				c = Color8(190, 156, 80)
			var edge: int = mini(mini(x % tw, tw - x % tw), mini(y % tw, tw - y % tw))
			if edge < 1:
				c = c.darkened(0.5)
			img.set_pixel(x, y, c)
	for s in stars:
		for dy in range(-3, 4):
			for dx in range(-3, 4):
				if Vector2(dx, dy).length() < s.z:
					img.set_pixel(clampi(int(s.x) + dx, 0, n - 1), clampi(int(s.y) + dy, 0, n - 1), gold)
	img.generate_mipmaps()
	var t := ImageTexture.create_from_image(img)
	_cache["tex:starmap"] = t
	return t


static func noise() -> Texture2D:
	if _noise == null:
		var n := FastNoiseLite.new()
		n.noise_type = FastNoiseLite.TYPE_VALUE_CUBIC
		n.fractal_octaves = 3
		n.frequency = 0.02
		var t := NoiseTexture2D.new()
		t.width = 256
		t.height = 256
		t.seamless = true
		t.noise = n
		t.generate_mipmaps = true
		_noise = t
	return _noise


## Walls, floors and ceilings: world-mapped real textures with weathering.
static func surface(key: String, opts: Dictionary = {}) -> Material:
	var ck := "surf:" + key + str(opts)
	if _cache.has(ck):
		return _cache[ck]
	if _surface_shader == null:
		_surface_shader = load("res://shaders/surface.gdshader")
		_surface_shader_2s = Shader.new()
		_surface_shader_2s.code = _surface_shader.code.replace("cull_back", "cull_disabled")
	var m := ShaderMaterial.new()
	m.shader = _surface_shader_2s if opts.get("double", false) else _surface_shader
	m.set_shader_parameter("albedo_tex", tex(key, "color"))
	m.set_shader_parameter("normal_tex", tex(key, "normal"))
	m.set_shader_parameter("rough_tex", tex(key, "rough"))
	m.set_shader_parameter("noise_tex", noise())
	m.set_shader_parameter("tile_metres", opts.get("tile", tile_metres(key)))
	m.set_shader_parameter("grime", GRIME.get(key, 0.3))
	m.set_shader_parameter("wet", opts.get("wet", 0.0))
	m.set_shader_parameter("tint", opts.get("tint", Color.WHITE))
	m.set_shader_parameter("normal_strength", opts.get("normal", 1.0))
	m.set_shader_parameter("roughness_scale", opts.get("rough", 1.0))
	_cache[ck] = m
	return m


## Props: a physically based material. opts: roughness, metal, emissive,
## energy, alpha, double, tex (a texture set, mapped in object space), unshaded.
static func mat(color, opts: Dictionary = {}) -> StandardMaterial3D:
	var c: Color = color if color is Color else Color.hex((int(color) << 8) | 0xff)
	var ck := "mat:%s%s" % [c.to_html(), str(opts)]
	if _cache.has(ck):
		return _cache[ck]
	var m := StandardMaterial3D.new()
	m.albedo_color = c
	m.roughness = opts.get("roughness", 0.7)
	m.metallic = opts.get("metal", 0.0)
	if opts.has("emissive"):
		m.emission_enabled = true
		var e = opts.emissive
		m.emission = e if e is Color else Color.hex((int(e) << 8) | 0xff)
		m.emission_energy_multiplier = opts.get("energy", 1.0)
	if opts.has("alpha"):
		m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		m.albedo_color.a = opts.alpha
		m.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_OPAQUE_ONLY
	if opts.get("double", false):
		m.cull_mode = BaseMaterial3D.CULL_DISABLED
	if opts.get("unshaded", false):
		m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	if opts.has("tex"):
		var key: String = opts.tex
		m.albedo_texture = tex(key, "color")
		m.normal_enabled = true
		m.normal_texture = tex(key, "normal")
		m.roughness_texture = tex(key, "rough")
		m.roughness_texture_channel = BaseMaterial3D.TEXTURE_CHANNEL_RED
		m.roughness = 1.0
		m.uv1_triplanar = true
		m.uv1_triplanar_sharpness = 4.0
		m.uv1_scale = Vector3.ONE / tile_metres(key)
		m.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
		if not opts.has("tint"):
			m.albedo_color = Color(1, 1, 1, m.albedo_color.a)
		else:
			m.albedo_color = opts.tint
	_cache[ck] = m
	return m


static func gold() -> StandardMaterial3D: return mat(0xd4a64a, { metal = 1.0, roughness = 0.32 })
static func brass() -> StandardMaterial3D: return mat(0xc29a50, { metal = 1.0, roughness = 0.4 })
static func bronze() -> StandardMaterial3D: return mat(0xa8763a, { metal = 1.0, roughness = 0.45 })
static func iron() -> StandardMaterial3D: return mat(0x3a3b40, { metal = 0.85, roughness = 0.55 })
static func steel() -> StandardMaterial3D: return mat(0xc4c8d0, { metal = 1.0, roughness = 0.28 })
static func wood() -> StandardMaterial3D: return mat(0xffffff, { roughness = 0.6, tex = "oak" })
static func darkwood() -> StandardMaterial3D: return mat(0xffffff, { roughness = 0.65, tex = "beam" })
static func stone() -> StandardMaterial3D: return mat(0xffffff, { roughness = 0.9, tex = "ashlar" })
static func marble() -> StandardMaterial3D: return mat(0xf0ece4, { roughness = 0.18 })
static func velvet() -> StandardMaterial3D: return mat(0x7a1a22, { roughness = 0.95 })
static func glow(color, energy: float = 2.5) -> StandardMaterial3D: return mat(color, { emissive = color, energy = energy, roughness = 0.6 })


## A soft additive halo (lens glare around a flame or lamp).
static func glow_texture() -> Texture2D:
	if _glow_tex == null:
		var g := Gradient.new()
		g.set_color(0, Color(1, 1, 1, 1))
		g.set_color(1, Color(1, 1, 1, 0))
		g.add_point(0.12, Color(1, 1, 1, 0.5))
		g.add_point(0.35, Color(1, 1, 1, 0.1))
		var t := GradientTexture2D.new()
		t.gradient = g
		t.fill = GradientTexture2D.FILL_RADIAL
		t.fill_from = Vector2(0.5, 0.5)
		t.fill_to = Vector2(1.0, 0.5)
		t.width = 64
		t.height = 64
		_glow_tex = t
	return _glow_tex


static func glow_sprite_material(color: Color) -> StandardMaterial3D:
	var ck := "glowspr:" + color.to_html()
	if _cache.has(ck):
		return _cache[ck]
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	m.albedo_texture = glow_texture()
	m.albedo_color = color
	m.billboard_mode = BaseMaterial3D.BILLBOARD_ENABLED
	m.no_depth_test = false
	m.disable_receive_shadows = true
	_cache[ck] = m
	return m
