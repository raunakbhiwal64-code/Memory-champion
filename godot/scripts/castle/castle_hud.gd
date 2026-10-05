class_name CastleHud
extends Control
## The overlay while walking the castle: where you are, where to go next, the
## controls, a parchment map (tap to enlarge; while studying, tap a station on
## the big map to go there), and on phones a joystick and a Use button.

signal action(name: String)

var castle  ## the Castle node
var room_label: Label
var palace_label: Label
var target_title: Label
var target_text: Label
var prompt: PanelContainer
var prompt_label: Label
var help: Label
var map: CastleMap
var btn_mode: Button
var btn_due: Button
var btn_quality: Button
var btn_sound: Button
var joystick: Joystick
var use_btn: Button
var touch := false


func _init(p_castle) -> void:
	castle = p_castle
	set_anchors_preset(PRESET_FULL_RECT)
	mouse_filter = MOUSE_FILTER_IGNORE
	touch = DisplayServer.is_touchscreen_available() and OS.has_feature("mobile")


func _ready() -> void:
	var top := MarginContainer.new()
	top.set_anchors_preset(PRESET_TOP_WIDE)
	for side in ["left", "right", "top"]:
		top.add_theme_constant_override("margin_" + side, 14)
	top.mouse_filter = MOUSE_FILTER_IGNORE
	add_child(top)
	var row := HFlowContainer.new()
	row.add_theme_constant_override("h_separation", 10)
	row.add_theme_constant_override("v_separation", 8)
	row.mouse_filter = MOUSE_FILTER_IGNORE
	top.add_child(row)
	palace_label = UI.label("", "StatLabel")
	room_label = UI.label("", "H3")
	row.add_child(_chip([palace_label, room_label]))
	target_title = UI.label("NEXT", "StatLabel")
	target_text = UI.label("", "")
	row.add_child(_chip([target_title, target_text]))
	var spacer := Control.new()
	spacer.size_flags_horizontal = SIZE_EXPAND_FILL
	spacer.mouse_filter = MOUSE_FILTER_IGNORE
	row.add_child(spacer)
	btn_due = UI.button("Review due", "ButtonGold", func(): action.emit("due"), true)
	btn_mode = UI.button("Start recall walk", "ButtonPrimary", func(): action.emit("mode"), true)
	btn_quality = UI.button("Graphics: High", "ButtonGhost", func(): action.emit("quality"), true)
	btn_sound = UI.button("Sound on", "ButtonGhost", func(): action.emit("sound"), true)
	for b in [btn_due, btn_mode, btn_quality, btn_sound, UI.button("Exit castle", "ButtonGhost", func(): action.emit("exit"), true)]:
		b.add_theme_stylebox_override("normal", ThemeBuilder.box(Color(ThemeBuilder.BG, 0.82), ThemeBuilder.LINE, 3, Vector4(11, 5, 11, 5)))
		row.add_child(b)
	btn_due.add_theme_stylebox_override("normal", ThemeBuilder.box(ThemeBuilder.GOLD, ThemeBuilder.GOLD, 3, Vector4(11, 5, 11, 5)))
	btn_mode.add_theme_stylebox_override("normal", ThemeBuilder.box(ThemeBuilder.BLUE, ThemeBuilder.BLUE, 3, Vector4(11, 5, 11, 5)))

	prompt = PanelContainer.new()
	prompt.add_theme_stylebox_override("panel", ThemeBuilder.box(Color(ThemeBuilder.BG, 0.85), ThemeBuilder.GOLD_DIM, 3, Vector4(16, 9, 16, 9)))
	prompt_label = UI.label("", "")
	prompt.add_child(prompt_label)
	prompt.set_anchors_preset(PRESET_CENTER_BOTTOM)
	prompt.grow_horizontal = GROW_DIRECTION_BOTH
	prompt.grow_vertical = GROW_DIRECTION_BEGIN
	prompt.offset_bottom = -110
	prompt.offset_top = -110
	prompt.visible = false
	prompt.mouse_filter = MOUSE_FILTER_IGNORE
	add_child(prompt)

	help = UI.label("WASD or arrows to walk · Shift to run · drag to look · scroll to zoom\nE at a medallion to leave or recall a memory · M for the map · Esc closes", "Mute")
	help.grow_vertical = GROW_DIRECTION_BEGIN
	help.set_anchors_and_offsets_preset(PRESET_BOTTOM_LEFT, PRESET_MODE_MINSIZE, 16)
	help.visible = not touch
	add_child(help)

	map = CastleMap.new(castle)
	add_child(map)
	map.place_small()

	joystick = Joystick.new()
	joystick.visible = touch
	add_child(joystick)
	joystick.set_anchors_and_offsets_preset(PRESET_BOTTOM_LEFT, PRESET_MODE_KEEP_SIZE, 30)
	use_btn = UI.button("Use", "ButtonGold", func(): action.emit("interact"))
	use_btn.custom_minimum_size = Vector2(92, 92)
	use_btn.visible = touch
	add_child(use_btn)
	use_btn.set_anchors_and_offsets_preset(PRESET_BOTTOM_RIGHT, PRESET_MODE_MINSIZE, 30)
	use_btn.offset_left -= 210
	use_btn.offset_right -= 210


func _chip(kids: Array) -> PanelContainer:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", ThemeBuilder.box(Color(ThemeBuilder.BG, 0.82), ThemeBuilder.LINE, 3, Vector4(14, 8, 14, 8)))
	p.add_child(UI.vbox(kids, 2))
	p.mouse_filter = MOUSE_FILTER_IGNORE
	return p


func set_prompt(text: String) -> void:
	prompt.visible = text != ""
	prompt_label.text = text
	prompt.reset_size()
	prompt.set_anchors_and_offsets_preset(PRESET_CENTER_BOTTOM, PRESET_MODE_MINSIZE, 110)


func set_target(title: String, text: String) -> void:
	target_title.text = title
	target_text.text = text


func set_buttons(mode: String, due: int, quality: String, muted: bool) -> void:
	btn_mode.text = "Stop recall walk" if mode == "recall" else "Start recall walk"
	btn_due.visible = mode != "recall" and due > 0
	btn_due.text = "Review %d due" % due
	btn_quality.text = "Graphics: " + quality.capitalize()
	btn_sound.text = "Sound off" if muted else "Sound on"


## A thumb-stick for phones: drag inside the ring to walk.
class Joystick extends Control:
	var value := Vector2.ZERO
	var _touch := -1
	var _centre := Vector2(70, 70)

	func _init() -> void:
		custom_minimum_size = Vector2(140, 140)
		size = Vector2(140, 140)

	func _gui_input(ev: InputEvent) -> void:
		if ev is InputEventScreenTouch:
			if ev.pressed and _touch == -1:
				_touch = ev.index
				_move(ev.position)
			elif not ev.pressed and ev.index == _touch:
				_touch = -1
				value = Vector2.ZERO
				queue_redraw()
			accept_event()
		elif ev is InputEventScreenDrag and ev.index == _touch:
			_move(ev.position)
			accept_event()

	func _move(p: Vector2) -> void:
		value = ((p - _centre) / 55.0).limit_length(1.0)
		queue_redraw()

	func _draw() -> void:
		draw_circle(_centre, 62, Color(0, 0, 0, 0.35))
		draw_arc(_centre, 62, 0, TAU, 48, Color(ThemeBuilder.GOLD, 0.6), 2.0)
		draw_circle(_centre + value * 45.0, 24, Color(ThemeBuilder.GOLD, 0.8))


## The parchment map: rooms, doors, numbered stations, you, and your target.
class CastleMap extends Control:
	var castle
	var big := false

	func _init(p_castle) -> void:
		castle = p_castle
		mouse_filter = MOUSE_FILTER_STOP
		clip_contents = true

	func _aspect() -> float:
		return float(CastleLayout.h()) / float(CastleLayout.w())

	func place_small() -> void:
		custom_minimum_size = Vector2(200, 200 * _aspect())
		size = custom_minimum_size
		set_anchors_and_offsets_preset(PRESET_BOTTOM_RIGHT, PRESET_MODE_KEEP_SIZE, 16)

	func toggle() -> void:
		big = not big
		if big:
			var vp := get_parent().size as Vector2
			var s: float = min(vp.x - 40.0, (vp.y - 130.0) / _aspect())
			custom_minimum_size = Vector2(s, s * _aspect())
			size = custom_minimum_size
			set_anchors_and_offsets_preset(PRESET_CENTER, PRESET_MODE_KEEP_SIZE)
			position.y += 30
		else:
			place_small()
		queue_redraw()

	func _gui_input(ev: InputEvent) -> void:
		var pressed: bool = (ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT) or (ev is InputEventScreenTouch and ev.pressed)
		if not pressed:
			return
		accept_event()
		if not big:
			toggle()
			return
		var k := _scale()
		var best := -1
		var best_d := 14.0
		for i in castle.stations.views.size():
			var rp: Vector2 = castle.stations.views[i].ring_pos
			var d: float = (ev.position - _origin() - rp * k).length()
			if d < best_d:
				best_d = d
				best = i
		if best >= 0 and castle.mode == "study":
			castle.teleport_to(best)
			toggle()
		elif best < 0:
			toggle()

	func _scale() -> float:
		return min((size.x - 16.0) / (CastleLayout.w() * CastleLayout.T), (size.y - 16.0) / (CastleLayout.h() * CastleLayout.T))

	func _origin() -> Vector2:
		var k := _scale()
		return (size - Vector2(CastleLayout.w(), CastleLayout.h()) * CastleLayout.T * k) / 2.0

	func _process(_dt: float) -> void:
		if is_visible_in_tree():
			queue_redraw()

	func _draw() -> void:
		var k := _scale()
		var o := _origin()
		var t := CastleLayout.T
		draw_rect(Rect2(Vector2.ZERO, size), Color("#d9c9a0"))
		draw_rect(Rect2(Vector2.ZERO, size), Color("#7a5a2a"), false, 2.0)
		var ink := Color("#3a2a14")
		for r in CastleLayout.castle().rooms:
			var rr := CastleLayout.room_rect(r)
			var rect := Rect2(o + rr.position * k, rr.size * k)
			draw_rect(rect, Color("#e8dcb8") if r.id != castle.current_room else Color("#f4e6b0"))
			draw_rect(rect, ink, false, 1.5)
			if big:
				draw_string(ThemeBuilder.serif, rect.position + Vector2(6, 16), r.name, HORIZONTAL_ALIGNMENT_LEFT, rect.size.x - 8, 13, Color(ink, 0.8))
		for d in CastleLayout.castle().doors:
			var rect := Rect2(o + Vector2(d.x0, d.z0) * t * k, Vector2(d.x1 - d.x0 + 1, d.z1 - d.z0 + 1) * t * k)
			draw_rect(rect, Color("#e8dcb8"))
		var target: int = castle.target_index()
		for i in castle.stations.views.size():
			var v: Dictionary = castle.stations.views[i]
			var p: Vector2 = o + v.ring_pos * k
			var l: Dictionary = castle.palace.loci[i]
			var filled := DB.is_locus_filled(l)
			draw_circle(p, 5.5 if big else 3.0, Color("#b8862a") if filled else Color("#8a8070"))
			if i == target:
				draw_arc(p, 9.0 if big else 6.0, 0, TAU, 20, Color("#2a6aa8"), 2.0)
			if big:
				draw_string(ThemeBuilder.mono, p + Vector2(7, 4), str(int(v.s.n)), HORIZONTAL_ALIGNMENT_LEFT, -1, 11, ink)
		var pp := Vector2(castle.player.position.x, castle.player.position.z)
		var yaw: float = castle.keeper.rotation.y
		var dir := Vector2(sin(yaw), cos(yaw))
		var c: Vector2 = o + pp * k
		var side := Vector2(-dir.y, dir.x)
		var sz := 8.0 if big else 6.0
		draw_colored_polygon(PackedVector2Array([c + dir * sz, c - dir * sz * 0.6 + side * sz * 0.6, c - dir * sz * 0.6 - side * sz * 0.6]), Color("#b02a2a"))
