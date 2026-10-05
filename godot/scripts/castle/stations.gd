class_name CastleStations
## The 40 stations: each one's object, an engraved brass medallion in the
## floor where you stand to use it, a thin inlay that lights up only when it
## matters, and its number and memory card, which fade in as you approach.

var views: Array = []  ## per station: { s, ring_pos, ring_mat, badge, card, card_key, orb, prop }
var colliders: Array


func _init(p_colliders: Array) -> void:
	colliders = p_colliders


func build(rooms: Dictionary) -> void:
	var brass := Mats.mat(0xc8a060, { metal = 0.9, roughness = 0.42 })
	var engraving := Color("#2d1c08")
	for s in CastleLayout.castle().stations:
		var room: Node3D = rooms[s.room]
		var yaw: float = CastleLayout.FACE_YAW[s.face]
		var prop := CastleProps.build(s.prop)
		prop.position = Vector3(s.x, 0, s.z)
		prop.rotation.y = yaw
		room.add_child(prop)
		var meta: Dictionary = CastleProps.META.get(s.prop, {})
		if meta.get("r", 0.0) > 0.0:
			colliders.append([s.x, s.z, meta.r])
		for c in meta.get("cols", []):
			colliders.append([s.x + c[0] * cos(yaw) + c[1] * sin(yaw), s.z - c[0] * sin(yaw) + c[1] * cos(yaw), c[2]])
		var rp := CastleLayout.ring_pos(s)
		# brass medallion, the number engraved so it reads upright as you step on facing the object
		var disc := Geo.cyl(0.5, 0.53, 0.024, brass, rp.x, 0.012, rp.y, 40)
		room.add_child(disc)
		var num := Label3D.new()
		num.text = str(int(s.n))
		num.font = ThemeBuilder.serif if ThemeBuilder.serif else null
		num.font_size = 140
		num.pixel_size = 0.0028
		num.modulate = engraving
		num.outline_size = 0
		num.shaded = true
		num.double_sided = false
		num.position = Vector3(rp.x, 0.026, rp.y)
		num.rotation = Vector3(-PI / 2.0, atan2(-(s.x - rp.x), -(s.z - rp.y)), 0)
		room.add_child(num)
		var ring_mat := StandardMaterial3D.new()
		ring_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		ring_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		ring_mat.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
		ring_mat.albedo_color = Color(0.91, 0.76, 0.48, 0.0)
		var ring := Geo.ring(0.5, 0.57, ring_mat)
		ring.position = Vector3(rp.x, 0.028, rp.y)
		ring.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		room.add_child(ring)
		var h: float = meta.get("h", 3.0)
		var badge := Label3D.new()
		badge.text = str(int(s.n))
		badge.font_size = 72
		badge.pixel_size = 0.005
		badge.billboard = BaseMaterial3D.BILLBOARD_ENABLED
		badge.modulate = Color("#f3e7c4")
		badge.outline_modulate = Color(0.08, 0.07, 0.05, 0.9)
		badge.outline_size = 16
		badge.position = Vector3(s.x, h, s.z)
		_fade(badge, 3.5, 7.5)
		room.add_child(badge)
		var card := Node3D.new()
		card.position = Vector3(s.x, h + 0.9, s.z)
		card.visible = false
		room.add_child(card)
		var orb := Geo.glow(Color(1.0, 0.82, 0.43, 0.7), 0.5)
		orb.position = Vector3(s.x, h + 0.6, s.z)
		orb.visible = false
		room.add_child(orb)
		views.append({ s = s, ring_pos = rp, ring_mat = ring_mat, badge = badge, card = card, card_key = "", orb = orb, prop = prop, base = 0.0, color = Color(0.91, 0.76, 0.48) })


static func _fade(g: GeometryInstance3D, near: float, far: float) -> void:
	g.visibility_range_end = far
	g.visibility_range_end_margin = far - near
	g.visibility_range_fade_mode = GeometryInstance3D.VISIBILITY_RANGE_FADE_SELF


## Index of the station whose medallion the keeper is standing on, or -1.
func nearby(pos: Vector3, within := 1.5) -> int:
	var best := -1
	var best_d := within
	for i in views.size():
		var rp: Vector2 = views[i].ring_pos
		var d := Vector2(pos.x - rp.x, pos.z - rp.y).length()
		if d < best_d:
			best_d = d
			best = i
	return best


## Colours and visibility for each station, from the palace data and walk state.
## mode: study | recall; target: the station you're heading for.
func refresh(palace: Dictionary, mode: String, target: int, done: Dictionary, revealed: int) -> void:
	for i in views.size():
		var v: Dictionary = views[i]
		var l: Dictionary = palace.loci[i] if i < palace.loci.size() else {}
		var filled := not l.is_empty() and DB.is_locus_filled(l)
		var color := Color(0.88, 0.7, 0.35) if filled else Color(0.62, 0.76, 0.88)
		var base := 0.3 if filled else 0.0
		var show_card := false
		var show_orb := false
		if mode == "recall":
			if i == target:
				color = Color(1.0, 0.95, 0.75)
				base = 0.8
				show_orb = true
			elif done.has(i):
				color = Color(0.51, 0.73, 0.55) if done[i] else Color(0.83, 0.46, 0.42)
				base = 0.55
				show_card = true
			elif filled:
				base = 0.25
			else:
				base = 0.0
			if i == revealed:
				show_card = true
				show_orb = false
		else:
			show_card = filled
		v.color = color
		v.base = base
		v.orb.visible = show_orb and not show_card
		v.card.visible = show_card
		if show_card:
			_card(v, l)


## A parchment card above the object showing what's stored there.
func _card(v: Dictionary, l: Dictionary) -> void:
	var text: String = l.content.text if l.get("content") is Dictionary else ""
	var key := text + "|" + str(str(l.get("image", "")).length())
	if v.card_key == key:
		return
	v.card_key = key
	var card: Node3D = v.card
	for c in card.get_children():
		c.queue_free()
	var tex := Util.texture_from_data_url(l.get("image"))
	var w := 2.2
	var parchment := Sprite3D.new()
	parchment.texture = _parchment()
	parchment.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	parchment.pixel_size = w / 512.0
	parchment.modulate = Color(0.86, 0.84, 0.78)
	parchment.shaded = false
	_fade(parchment, 9.0, 16.0)
	card.add_child(parchment)
	var label := Label3D.new()
	label.text = "%d · %s\n%s" % [v.s.n, v.s.title, text if text.length() <= 90 else text.substr(0, 88) + "…"]
	label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.width = 440 if tex == null else 280
	label.font_size = 38
	label.pixel_size = w / 512.0
	label.modulate = Color("#2a2014")
	label.outline_size = 0
	label.position.x = 0.0 if tex == null else 0.32
	label.sorting_offset = 0.1
	label.no_depth_test = false
	_fade(label, 9.0, 16.0)
	card.add_child(label)
	if tex:
		var pic := Sprite3D.new()
		pic.texture = tex
		pic.billboard = BaseMaterial3D.BILLBOARD_ENABLED
		pic.pixel_size = 0.75 / max(tex.get_height(), 1)
		pic.position.x = -0.62
		pic.sorting_offset = 0.1
		_fade(pic, 9.0, 16.0)
		card.add_child(pic)


static var _parch: Texture2D


static func _parchment() -> Texture2D:
	if _parch == null:
		var img := Image.create(512, 256, false, Image.FORMAT_RGBA8)
		var n := FastNoiseLite.new()
		n.frequency = 0.02
		for y in 256:
			for x in 512:
				var edge: bool = x < 6 or y < 6 or x >= 506 or y >= 250
				var border: bool = x < 12 or y < 12 or x >= 500 or y >= 244
				var c := Color("#efe3c2").darkened(0.08 + n.get_noise_2d(x, y) * 0.08)
				if border:
					c = Color("#8a6a2a")
				img.set_pixel(x, y, Color(0, 0, 0, 0) if edge else c)
		_parch = ImageTexture.create_from_image(img)
	return _parch


## Per frame: the inlay breathes on the station you're heading for and
## brightens when you're on it.
func animate(t: float, near: int, target: int, next_empty: int, pos: Vector3) -> void:
	for i in views.size():
		var v: Dictionary = views[i]
		var o: float = v.base
		var d := Vector2(pos.x - v.s.x, pos.z - v.s.z).length()
		if i == near:
			o = max(o, 0.75 + sin(t * 4.0) * 0.1)
		elif i == target or i == next_empty:
			o = max(o, (0.35 + sin(t * 2.5) * 0.12) * clampf((22.0 - d) / 16.0, 0.0, 1.0))
		var c: Color = v.color
		v.ring_mat.albedo_color = Color(c.r, c.g, c.b, o)
		v.orb.position.y = CastleProps.META.get(v.s.prop, {}).get("h", 3.0) + 0.6 + sin(t * 2.0 + i) * 0.05
