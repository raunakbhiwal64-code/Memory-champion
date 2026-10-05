class_name Castle
extends Node3D
## The Keep of Mnemosyne in 3D. Builds the castle (architecture, furnishings,
## the 40 stations, doors, sky and sound), then runs the walk: you move the
## keeper with WASD or a thumb-stick, step onto a station's medallion and press
## E to leave a memory there, or take a recall walk along the route and grade
## yourself at each station. Grades feed the same per-memory schedule as the
## 2D walks.

signal exited
signal built

## Fog colour and density per room, so each one has its own air.
const FOG := {
	courtyard = [Color("#0d1222"), 0.006], entrance = [Color("#120e0a"), 0.006], hall = [Color("#140d08"), 0.005],
	gallery = [Color("#120e0a"), 0.007], library = [Color("#120d08"), 0.006], dungeon = [Color("#06140b"), 0.017],
	armoury = [Color("#160a05"), 0.008], tower = [Color("#0a0f22"), 0.004],
}
const FLICKER := { torch = 1.0, fire = 1.0, candle = 1.0, chandelier = 0.5, lantern = 0.25, brazier = 1.0 }

var palace: Dictionary = {}
var start_mode := "study"
var mode := "study"
var recall = null  ## { order: [station index], pos, grades, revealed }
var panel := -1  ## station whose panel is open, -2 for the summary, -1 none
var current_room := ""
var quality := "high"
var user_chose_quality := false

var rooms := {}
var colliders: Array = []
var stations: CastleStations
var doors: CastleDoors
var atmosphere: CastleAtmosphere
var keeper: Keeper
var camera: Camera3D
var player: CastlePlayer
var hud: CastleHud
var near := -1
var _neighbours := {}
var _t := 0.0
var _drag := false
var _slow := 0.0
var _fires: Array = []
var _due := 0
var is_built := false
var _keep: Array = []  ## preloaded models and textures, held so they stay cached
var _loading: Control


## Call before adding to the tree. start: study | recall | due
func setup(palace_id: String, start: String = "study") -> void:
	var p = DB.find_palace(palace_id)
	if p == null:
		p = DB.open_or_create_castle()
	palace = p
	start_mode = start


func _ready() -> void:
	if palace.is_empty():
		setup("")
	if DB.ensure_castle_loci(palace):
		DB.save("palaces")
	if ThemeBuilder.serif == null:
		ThemeBuilder.load_fonts()
	await _preload()
	if not is_inside_tree():
		return
	_build()


## Loads every model and texture on background threads, with a progress screen,
## so building the castle afterwards doesn't stall on disk.
func _preload() -> void:
	var paths := asset_paths()
	if get_parent() is Control:
		_loading = ColorRect.new()
		_loading.color = Color("#07080c")
		_loading.set_anchors_preset(Control.PRESET_FULL_RECT)
		var label := UI.label("Opening the castle…", "H3")
		label.set_anchors_preset(Control.PRESET_CENTER)
		label.grow_horizontal = Control.GROW_DIRECTION_BOTH
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		_loading.add_child(label)
		get_parent().add_child(_loading)
	for p in paths:
		ResourceLoader.load_threaded_request(p, "", false)
	var pending := paths.duplicate()
	while not pending.is_empty():
		pending = pending.filter(func(p): return ResourceLoader.load_threaded_get_status(p) == ResourceLoader.THREAD_LOAD_IN_PROGRESS)
		if _loading:
			(_loading.get_child(0) as Label).text = "Opening the castle…  %d%%" % int(100.0 * (paths.size() - pending.size()) / max(1, paths.size()))
		await get_tree().process_frame
	for p in paths:
		var res = ResourceLoader.load_threaded_get(p)
		_keep.append(res)
		if p.ends_with(".glb"):
			CastleProps._models[p.get_file().get_basename()] = res
	# one more frame so the progress screen shows 100% while the castle builds
	await get_tree().process_frame


static func asset_paths() -> Array:
	var out := []
	var models := "res://assets/castle/models/"
	for f in ResourceLoader.list_directory(models):
		if f.ends_with(".glb"):
			out.append(models + f)
	var tex := "res://assets/castle/textures/"
	for d in ResourceLoader.list_directory(tex):
		if d.ends_with("/"):
			for f in ResourceLoader.list_directory(tex + d):
				if f.get_extension() in ["webp", "jpg", "png"]:
					out.append(tex + d + f)
	return out


func _build() -> void:
	Geo.reset()
	for r in CastleLayout.castle().rooms:
		var n := Node3D.new()
		n.name = r.id
		add_child(n)
		rooms[r.id] = n
	CastleArchitecture.new(self, rooms).build()
	CastleDecor.new(rooms, colliders).build()
	stations = CastleStations.new(colliders)
	stations.build(rooms)
	doors = CastleDoors.new()
	doors.build(self)
	atmosphere = CastleAtmosphere.new()
	atmosphere.build(self, rooms)
	atmosphere.build_audio(self)
	for id in rooms:
		Geo.merge_static(rooms[id])
	_neighbours = CastleLayout.neighbours()
	for l in Geo.lights:
		if l.get_meta("kind", "") in ["fire", "brazier"]:
			_fires.append(l)

	keeper = Keeper.new()
	add_child(keeper)
	camera = Camera3D.new()
	camera.fov = 60.0
	camera.near = 0.1
	camera.far = 600.0
	add_child(camera)
	camera.make_current()
	# a soft fill from the camera, so the keeper's back isn't a black silhouette
	var fill := OmniLight3D.new()
	fill.light_color = Color("#c8c0b4")
	fill.light_energy = 0.3
	fill.light_specular = 0.0
	fill.omni_range = 7.0
	fill.omni_attenuation = 2.0
	camera.add_child(fill)
	player = CastlePlayer.new(colliders)
	_teleport_start()

	hud = CastleHud.new(self)
	hud.action.connect(_on_action)
	if get_parent() is Control:
		get_parent().add_child(hud)
	else:
		var layer := CanvasLayer.new()
		add_child(layer)
		hud.theme = ThemeBuilder.build()
		layer.add_child(hud)

	var settings: Dictionary = DB.data.settings
	user_chose_quality = settings.has("castleQuality")
	quality = settings.get("castleQuality", "medium" if OS.has_feature("mobile") else "high")
	atmosphere.muted = settings.get("castleMuted", false)
	atmosphere.apply_quality(quality, get_viewport(), Geo.lights)
	atmosphere.start_audio()
	_refresh()
	if _loading:
		_loading.queue_free()
	is_built = true
	built.emit()
	if start_mode == "recall" or start_mode == "due":
		start_recall.call_deferred(start_mode == "due")


func _exit_tree() -> void:
	if is_instance_valid(hud):
		hud.queue_free()
	if is_instance_valid(_loading):
		_loading.queue_free()
	get_viewport().scaling_3d_scale = 1.0


# ---------- the frame ----------

func _process(delta: float) -> void:
	if not is_built:
		return
	var dt: float = min(delta, 0.5)
	var sdt: float = min(dt, 0.05)
	_t += dt
	if panel != -1 and not _modal_open():
		_close_panel()
	var input := _movement()
	var left := dt
	while left > 1e-4:
		player.move(min(0.05, left), input.x, input.y, input.z, input.w > 0.5)
		left -= 0.05
	var r = CastleLayout.room_at(player.position.x, player.position.z)
	if r != null and r.id != current_room:
		current_room = r.id
		_cull()
	near = stations.nearby(player.position)
	keeper.position = player.position
	keeper.rotation.y = player.yaw
	keeper.animate(player.speed, near >= 0, sdt, _t)
	keeper.visible = player.update_camera(camera, dt) > 0.9
	for f in Geo.anims:
		f.call(_t, sdt)
	stations.animate(_t, near, target_index(), _next_empty() if mode == "study" else -1, player.position)
	doors.update(player.position, dt)
	_flicker()
	_fog(dt)
	atmosphere.update_audio(current_room, _near_fire(), dt)
	_hud()
	_auto_tune(delta)


## x: forward, y: right, z: camera turn, w: running
func _movement() -> Vector4:
	if _modal_open() or (hud and hud.map.big):
		return Vector4.ZERO
	var fwd := 0.0
	var side := 0.0
	var turn := 0.0
	if Input.is_physical_key_pressed(KEY_W) or Input.is_physical_key_pressed(KEY_UP):
		fwd += 1.0
	if Input.is_physical_key_pressed(KEY_S) or Input.is_physical_key_pressed(KEY_DOWN):
		fwd -= 1.0
	if Input.is_physical_key_pressed(KEY_D):
		side += 1.0
	if Input.is_physical_key_pressed(KEY_A):
		side -= 1.0
	if Input.is_physical_key_pressed(KEY_LEFT):
		turn += 1.0
	if Input.is_physical_key_pressed(KEY_RIGHT):
		turn -= 1.0
	var run := Input.is_physical_key_pressed(KEY_SHIFT)
	if hud and hud.joystick.value.length() > 0.05:
		var j: Vector2 = hud.joystick.value
		fwd -= j.y
		side += j.x
		run = run or j.length() > 0.92
	return Vector4(fwd, side, turn, 1.0 if run else 0.0)


func _unhandled_input(ev: InputEvent) -> void:
	if not is_built or _modal_open():
		return
	if ev is InputEventMouseButton:
		if ev.button_index == MOUSE_BUTTON_LEFT:
			_drag = ev.pressed
			if ev.pressed:
				atmosphere.start_audio()
		elif ev.button_index == MOUSE_BUTTON_WHEEL_UP and ev.pressed:
			player.cam_dist -= 0.5
		elif ev.button_index == MOUSE_BUTTON_WHEEL_DOWN and ev.pressed:
			player.cam_dist += 0.5
	elif ev is InputEventMouseMotion and _drag:
		_look(ev.relative)
	elif ev is InputEventScreenDrag and ev.index > 0:
		# the first finger already arrives as mouse motion (emulate_mouse_from_touch)
		_look(ev.relative)
	elif ev is InputEventMagnifyGesture:
		player.cam_dist /= ev.factor
	elif ev is InputEventKey and ev.pressed and not ev.echo:
		match ev.physical_keycode:
			KEY_E, KEY_ENTER, KEY_SPACE:
				interact()
			KEY_M:
				hud.map.toggle()
			KEY_ESCAPE:
				if hud.map.big:
					hud.map.toggle()
				else:
					exit()
			_:
				return
		get_viewport().set_input_as_handled()


func _look(rel: Vector2) -> void:
	player.cam_yaw -= rel.x * 0.006
	player.cam_pitch += rel.y * 0.004


func _cull() -> void:
	var show: Dictionary = _neighbours.get(current_room, {})
	for id in rooms:
		rooms[id].visible = show.has(id)


func _flicker() -> void:
	for l in Geo.lights:
		if not is_instance_valid(l) or not l.is_visible_in_tree():
			continue
		var f: float = FLICKER.get(l.get_meta("kind", ""), 0.0)
		if f == 0.0:
			continue
		var ph: float = l.get_meta("phase")
		l.light_energy = float(l.get_meta("base_energy")) * (1.0 - f * (0.08 + sin(_t * 9.7 + ph) * 0.05 + sin(_t * 23.1 + ph * 2.3) * 0.04))
	keeper.lantern_light.light_energy = 1.6 + sin(_t * 11.0) * 0.08


func _fog(dt: float) -> void:
	var f: Array = FOG.get(current_room, FOG.courtyard)
	var k: float = min(1.0, dt * 1.5)
	var env := atmosphere.env
	env.fog_light_color = env.fog_light_color.lerp(f[0], k)
	env.fog_density += (float(f[1]) - env.fog_density) * k


func _near_fire() -> float:
	var best := 0.0
	for l in _fires:
		if is_instance_valid(l) and l.is_visible_in_tree():
			var d: float = (l.global_position - player.position).length()
			best = max(best, clampf(1.0 - (d - 2.0) / 9.0, 0.0, 1.0))
	return best


## Drop the graphics level if the device can't keep up, unless the user chose one.
func _auto_tune(delta: float) -> void:
	if user_chose_quality or quality == "low" or _t < 3.0:
		return
	_slow = _slow + delta if delta > 1.0 / 24.0 else max(0.0, _slow - delta * 0.5)
	if _slow > 4.0:
		_slow = 0.0
		set_quality("medium" if quality == "high" else "low", false)
		App.toast("Graphics set to %s to keep the castle smooth. Change it with the Graphics button." % quality)


func set_quality(q: String, chosen: bool = true) -> void:
	quality = q
	atmosphere.apply_quality(q, get_viewport(), Geo.lights)
	if chosen:
		user_chose_quality = true
		DB.data.settings.castleQuality = q
		DB.save("settings")


func _modal_open() -> bool:
	return App.main != null and App.main.has_method("modal_open") and App.main.modal_open()


# ---------- HUD ----------

func target_index() -> int:
	if mode == "recall" and recall != null:
		return recall.order[recall.pos] if recall.pos < recall.order.size() else -1
	return -1


func _next_empty() -> int:
	for i in palace.loci.size():
		if not DB.is_locus_filled(palace.loci[i]):
			return i
	return -1


func _station(i: int) -> Dictionary:
	return CastleLayout.castle().stations[i]


func _hud() -> void:
	if hud == null or not hud.is_inside_tree():
		return
	hud.room_label.text = CastleLayout.room(current_room).name if current_room != "" else ""
	var target := -1
	if mode == "recall" and recall != null:
		target = target_index()
		hud.palace_label.text = "RECALL WALK · %d OF %d" % [min(recall.pos + 1, recall.order.size()), recall.order.size()]
		var ts := _station(target) if target >= 0 else {}
		hud.set_target("WALK TO", "%d · %s" % [ts.n, ts.title] if target >= 0 else "Walk complete")
	else:
		target = _next_empty()
		hud.palace_label.text = "%s · %d/%d MEMORIES" % [str(palace.name).to_upper(), DB.filled_count(palace), palace.loci.size()]
		var ts := _station(target) if target >= 0 else {}
		hud.set_target("NEXT EMPTY STATION", "%d · %s (%s)" % [ts.n, ts.title, CastleLayout.room(ts.room).name] if target >= 0 else "Every station holds a memory")
	var text := ""
	if near >= 0 and panel == -1 and not _modal_open():
		var s := _station(near)
		if mode == "recall":
			if near == target:
				text = "E  Recall station %d · %s" % [s.n, s.title]
			elif target >= 0:
				text = "Not this one yet: the route goes to station %d next" % _station(target).n
			else:
				text = s.title
		else:
			text = "E  %s %d · %s" % ["See or change the memory at" if DB.is_locus_filled(palace.loci[near]) else "Leave a memory at", s.n, s.title]
		if hud.touch:
			text = text.trim_prefix("E  ")
	if text != hud.prompt_label.text or hud.prompt.visible != (text != ""):
		hud.set_prompt(text)
	hud.set_buttons(mode, _due, quality, atmosphere.muted)


func _on_action(name: String) -> void:
	match name:
		"mode":
			if mode == "recall":
				stop_recall()
			else:
				start_recall(false)
		"due":
			start_recall(true)
		"quality":
			set_quality({ high = "low", low = "medium", medium = "high" }[quality])
		"sound":
			atmosphere.muted = not atmosphere.muted
			atmosphere.start_audio()
			DB.data.settings.castleMuted = atmosphere.muted
			DB.save("settings")
		"interact":
			interact()
		"exit":
			exit()


func exit() -> void:
	if recall != null and recall.pos > 0 and recall.pos < recall.order.size():
		App.toast("Recall walk ended early: nothing was logged")
	recall = null
	mode = "study"
	atmosphere.stop_audio()
	exited.emit()
	if App.main and App.main.has_method("close_castle"):
		App.main.close_castle()


# ---------- moving around ----------

func _teleport_start(yaw = null) -> void:
	var s := CastleLayout.start()
	player.place_at(float(s.x), float(s.z), float(s.yaw) if yaw == null else float(yaw))
	player.cur_dist = player.cam_dist


func teleport_to(i: int) -> void:
	var v: Dictionary = stations.views[i]
	var rp: Vector2 = v.ring_pos
	player.place_at(rp.x, rp.y, atan2(v.s.x - rp.x, v.s.z - rp.y))
	player.cam_pitch = 0.3


func interact() -> void:
	if near < 0 or _modal_open():
		return
	if mode == "recall":
		if near == target_index():
			_recall_panel(near)
		return
	_study_panel(near)


# ---------- panels ----------

func _refresh() -> void:
	_due = DB.due_loci(palace).size()
	stations.refresh(palace, mode, target_index(), _done_map(), panel if recall != null and recall.revealed else -1)


func _done_map() -> Dictionary:
	var done := {}
	if recall != null:
		for k in recall.pos:
			done[recall.order[k]] = recall.grades[k] >= Fsrs.HARD
	return done


func _head(s: Dictionary, extra: String) -> Array:
	return [UI.label("%s · %s" % [extra, CastleLayout.room(s.room).name.to_upper()], "StatLabel"),
		UI.label("%d. %s" % [s.n, s.title], "H2", true)]


func _open_panel(i: int, box: Control) -> void:
	panel = i
	App.open_modal(box)
	_refresh()


func _close_panel() -> void:
	panel = -1
	if _modal_open():
		App.close_modal()
	_refresh()


func _study_panel(i: int) -> void:
	var l: Dictionary = palace.loci[i]
	var s := _station(i)
	var box := UI.vbox(_head(s, "STATION %d OF %d" % [s.n, palace.loci.size()]), 10)
	box.add_child(UI.label("Make it vivid: picture what you're remembering doing something loud, huge or ridiculous right here at the %s." % str(s.title).to_lower(), "Mute", true))
	var tex := Util.texture_from_data_url(l.get("image"))
	if tex:
		box.add_child(UI.image_rect(tex, Vector2(0, 200)))
	var c = l.get("content")
	var text := UI.text_edit(c.text if c is Dictionary else "", "What are you leaving here? A word, a fact, a quote, a name…", Callable(), 96)
	box.add_child(text)
	if c is Dictionary and c.get("source"):
		box.add_child(UI.flow([UI.pill("from " + str(c.source), "PillGold")]))
	var commit := func():
		var val := text.text.strip_edges()
		var old: String = l.content.text if l.get("content") is Dictionary else ""
		if val == old:
			return
		l.content = { text = val, source = l.content.get("source") if l.get("content") is Dictionary else null } if val != "" else null
		l.review = null  # new content starts a fresh schedule
		DB.save("palaces")
	var pics := UI.flow([UI.button("Replace picture" if tex else "+ Add a picture", "ButtonGhost", func():
		commit.call()
		_pick_image(func(url):
			l.image = url
			l.review = null
			DB.save("palaces")
			_study_panel(i)), true)], 8)
	if tex:
		pics.add_child(UI.button("Remove picture", "ButtonDanger", func():
			commit.call()
			l.image = null
			DB.save("palaces")
			_study_panel(i), true))
	box.add_child(pics)
	var row := UI.hbox([], 8)
	if DB.is_locus_filled(l):
		row.add_child(UI.button("Empty this station", "ButtonGhost", func():
			l.content = null
			l.image = null
			l.review = null
			DB.save("palaces")
			_close_panel(), true))
	row.add_child(UI.expand())
	row.add_child(UI.button("Close", "ButtonGhost", func():
		commit.call()
		_close_panel(), true))
	row.add_child(UI.button("Save memory", "ButtonPrimary", func():
		commit.call()
		_close_panel()
		if DB.is_locus_filled(l):
			App.toast("Saved at station %d: %s" % [s.n, s.title]), true))
	box.add_child(row)
	_open_panel(i, box)
	text.grab_focus.call_deferred()


func _pick_image(on_picked: Callable) -> void:
	var fd := FileDialog.new()
	fd.file_mode = FileDialog.FILE_MODE_OPEN_FILE
	fd.access = FileDialog.ACCESS_FILESYSTEM
	fd.title = "Choose a picture"
	fd.use_native_dialog = true
	fd.filters = PackedStringArray(["*.jpg, *.jpeg, *.png, *.webp ; Pictures"])
	fd.size = Vector2i(820, 560)
	add_child(fd)
	fd.canceled.connect(fd.queue_free)
	fd.file_selected.connect(func(path):
		fd.queue_free()
		var img := Util.load_image_file(path)
		if img == null:
			App.toast("Could not use that picture")
			return
		on_picked.call(Util.data_url_from_image(img)))
	fd.popup_centered()


# ---------- recall walk ----------

## A forward-only walk through the stations that hold something (or only the
## ones due for review), starting from the gate.
func start_recall(due_only: bool) -> bool:
	var order := []
	var due: Array = DB.due_loci(palace) if due_only else []
	for i in palace.loci.size():
		var l: Dictionary = palace.loci[i]
		if DB.is_locus_filled(l) and (not due_only or due.has(l)):
			order.append(i)
	if order.is_empty():
		App.toast("Nothing is due here right now" if due_only else "Leave a memory at a station first, then walk the route to recall it")
		return false
	_close_panel()
	recall = { order = order, pos = 0, grades = [], revealed = false, due = due_only }
	mode = "recall"
	_teleport_start(0.0)  # face the iron gate, station 1
	_refresh()
	return true


func stop_recall(silent: bool = false) -> void:
	if recall != null and recall.pos > 0 and recall.pos < recall.order.size() and not silent:
		App.toast("Recall walk ended early: nothing was logged")
	recall = null
	mode = "study"
	_close_panel()


func _recall_panel(i: int) -> void:
	var l: Dictionary = palace.loci[i]
	var s := _station(i)
	var box := UI.vbox(_head(s, "RECALL %d OF %d" % [recall.pos + 1, recall.order.size()]), 12)
	if not recall.revealed:
		box.add_child(UI.label("What did you leave here? Picture the scene at the %s, say it out loud, then reveal." % str(s.title).to_lower(), "", true))
		box.add_child(UI.hbox([
			UI.button("I can't remember", "ButtonGhost", func(): _grade(Fsrs.AGAIN), true), UI.expand(),
			UI.button("Not yet", "ButtonGhost", _close_panel, true),
			UI.button("Reveal", "ButtonPrimary", func():
				recall.revealed = true
				_recall_panel(i), true)], 8))
	else:
		var inset := UI.panel([], "Inset", 10)
		var tex := Util.texture_from_data_url(l.get("image"))
		if tex:
			UI.body(inset).add_child(UI.image_rect(tex, Vector2(0, 200)))
		var c = l.get("content")
		if c is Dictionary and str(c.get("text", "")) != "":
			UI.body(inset).add_child(UI.label(c.text, "", true))
		box.add_child(inset)
		box.add_child(UI.label("How well did you remember it?", "Mute"))
		var row := UI.flow([], 8)
		for g in RecallSession.GRADES:
			row.add_child(UI.button(g[1], g[2], func(): _grade(g[0]), true))
		box.add_child(row)
	_open_panel(i, box)


func _grade(g: int) -> void:
	recall.grades.append(g)
	recall.pos += 1
	recall.revealed = false
	panel = -1
	App.close_modal()
	if recall.pos >= recall.order.size():
		_finish_recall()
	else:
		_refresh()


func _finish_recall() -> void:
	var walked := []
	for i in recall.order:
		walked.append(palace.loci[i])
	DB.finish_palace_walk(palace, walked, recall.grades)
	var right := 0
	var missed := []
	for k in recall.order.size():
		if recall.grades[k] >= Fsrs.HARD:
			right += 1
		else:
			var s := _station(recall.order[k])
			missed.append("%d · %s" % [s.n, s.title])
	_refresh()
	var box := UI.vbox([UI.label("RECALL WALK COMPLETE", "StatLabel"), UI.label("%d of %d remembered" % [right, recall.order.size()], "H2")], 10)
	box.add_child(UI.label("Each memory is now scheduled for its next review. Logged in your history.", "Mute", true))
	if not missed.is_empty():
		box.add_child(UI.label("Worth rebuilding with a stronger image: " + ", ".join(missed), "", true))
	box.add_child(UI.hbox([
		UI.button("Exit castle", "ButtonGhost", func():
			App.close_modal()
			recall = null
			exit(), true), UI.expand(),
		UI.button("Keep exploring", "ButtonGhost", func(): stop_recall(true), true),
		UI.button("Walk it again", "ButtonGold", func():
			App.close_modal()
			start_recall(false), true)], 8))
	_open_panel(-2, box)


## For tests and screenshots: a summary of what's going on.
func state() -> Dictionary:
	return {
		room = current_room, mode = mode, near = near, target = target_index(), panel = panel,
		player = [player.position.x, player.position.z], quality = quality,
		recall = { pos = recall.pos, total = recall.order.size(), grades = recall.grades.duplicate() } if recall != null else null,
		doors = doors.states(), hidden_rooms = rooms.values().filter(func(n): return not n.visible).size(),
	}
