extends View
## One drill run: memorise against the clock, recall, then see the score.

var discipline := ""
var level_idx := 0
var mem_time := 60
var items: Array = []
var phase := "memorize"
var time_left := 0.0
var timer_label: Label
var inputs: Array = []
var click_order: Array = []
var shuffled: Array = []
var result := {}


func open(new_args: Dictionary) -> void:
	discipline = new_args.get("discipline", "numbers")
	level_idx = int(new_args.get("level", 0))
	mem_time = int(new_args.get("time", 60))
	var rng := RandomNumberGenerator.new()
	rng.randomize()
	if new_args.has("seed"):
		rng.seed = int(new_args.seed)
	items = DrillLogic.generate(discipline, DrillLogic.item_count(discipline, level_idx), rng)
	phase = "memorize"
	time_left = mem_time
	click_order = []
	super.open(new_args)


func _process(delta: float) -> void:
	if phase != "memorize" or not visible:
		return
	time_left -= delta
	if timer_label:
		timer_label.text = Util.format_time(int(ceil(time_left)))
	if time_left <= 0.0:
		start_recall()


func _title() -> String:
	return "%s — LEVEL %d — %s" % [Content.disciplines[discipline].label.to_upper(), level_idx + 1, phase.to_upper()]


func build() -> void:
	inputs = []
	match phase:
		"memorize":
			_build_memorize()
		"recall":
			_build_recall()
		"result":
			_build_result()


func _build_memorize() -> void:
	timer_label = UI.label(Util.format_time(int(ceil(time_left))), "MonoGold")
	timer_label.add_theme_font_size_override("font_size", 34)
	header(_title(), "Study these %s" % Util.plural(items.size(), "card" if discipline == "cards" else "item"), "", [
		timer_label, UI.button("Exit", "ButtonGhost", _exit, true)])
	var card := UI.panel([], "Card", 12)
	var body := UI.body(card)
	match discipline:
		"numbers":
			var groups := Util.chunk_string("".join(items), 5)
			var f := UI.flow([], 22)
			for g in groups:
				var l := UI.label(g, "Mono")
				l.add_theme_font_size_override("font_size", 28)
				l.add_theme_color_override("font_color", ThemeBuilder.INK)
				f.add_child(l)
			body.add_child(f)
		"words":
			var g := UI.grid(180, 6)
			for i in items.size():
				g.add_child(UI.label("%d. %s" % [i + 1, items[i]]))
			body.add_child(g)
		"cards":
			var f := UI.flow([], 8)
			for c in items:
				f.add_child(_card_tile(c))
			body.add_child(f)
		"images":
			var f := UI.flow([], 10)
			for i in items.size():
				var t := DrillTiles.Abstract.new(items[i])
				t.badge = str(i + 1)
				f.add_child(t)
			body.add_child(f)
		"names":
			var g := UI.grid(130, 14)
			for n in items:
				var face := DrillTiles.Face.new(n.seed)
				face.custom_minimum_size = Vector2(80, 80)
				var name_l := UI.label(n.name, "", true)
				name_l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
				g.add_child(UI.vbox([face, name_l], 6))
			body.add_child(g)
	content.add_child(card)
	content.add_child(UI.flow([UI.button("I'm ready — start recall", "ButtonPrimary", start_recall)]))


func _card_tile(c: Dictionary) -> Control:
	var p := UI.panel([], "Inset", 0)
	p.custom_minimum_size = Vector2(60, 70)
	var l := UI.label("%s\n%s" % [c.rank, c.sym])
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.add_theme_font_size_override("font_size", 18)
	l.add_theme_color_override("font_color", ThemeBuilder.RED if c.red else ThemeBuilder.INK)
	UI.body(p).add_child(l)
	return p


func start_recall() -> void:
	if phase != "memorize":
		return
	phase = "recall"
	if discipline == "images":
		shuffled = range(items.size())
		shuffled.shuffle()
	refresh()
	scroll_vertical = 0


func _build_recall() -> void:
	header(_title(), "What did you see?", "", [])
	var card := UI.panel([], "Card", 12)
	var body := UI.body(card)
	match discipline:
		"numbers":
			var f := UI.flow([], 6)
			for i in items.size():
				var e := _answer_box("", 1)
				e.custom_minimum_size = Vector2(34, 40)
				e.alignment = HORIZONTAL_ALIGNMENT_CENTER
				e.virtual_keyboard_type = LineEdit.KEYBOARD_TYPE_NUMBER
				e.size_flags_horizontal = SIZE_SHRINK_BEGIN
				f.add_child(e)
			body.add_child(f)
		"words", "cards":
			var g := UI.grid(150 if discipline == "words" else 90, 8)
			for i in items.size():
				var e := _answer_box("AS" if discipline == "cards" else "", 3 if discipline == "cards" else 0)
				g.add_child(UI.hbox([UI.label(str(i + 1), "Mono"), e], 6))
			body.add_child(g)
		"images":
			body.add_child(UI.label("Tap the images in the order you saw them.", "Mute"))
			var progress := UI.label("0 of %d placed" % items.size(), "Mono")
			body.add_child(progress)
			var f := UI.flow([], 10)
			for orig in shuffled:
				var tile := DrillTiles.Abstract.new(items[orig])
				tile.mouse_default_cursor_shape = CURSOR_POINTING_HAND
				tile.gui_input.connect(func(ev):
					if ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT and tile.badge == "":
						click_order.append(orig)
						tile.badge = str(click_order.size())
						tile.modulate.a = 0.6
						tile.queue_redraw()
						progress.text = "%d of %d placed" % [click_order.size(), items.size()])
				f.add_child(tile)
			body.add_child(f)
		"names":
			var g := UI.grid(140, 14)
			for n in items:
				var face := DrillTiles.Face.new(n.seed)
				face.custom_minimum_size = Vector2(80, 80)
				g.add_child(UI.vbox([face, _answer_box("Name", 0)], 6))
			body.add_child(g)
	content.add_child(card)
	content.add_child(UI.flow([UI.button("Exit", "ButtonGhost", _exit), UI.button("Submit & score", "ButtonPrimary", submit)]))
	if not inputs.is_empty():
		inputs[0].grab_focus.call_deferred()


func _answer_box(placeholder: String, max_len: int) -> LineEdit:
	var e := UI.line_edit("", placeholder)
	e.max_length = max_len
	var i := inputs.size()
	inputs.append(e)
	e.text_submitted.connect(func(_t): _focus(i + 1))
	if max_len == 1:
		e.text_changed.connect(func(t):
			if t.length() >= 1:
				_focus(i + 1))
	return e


func _focus(i: int) -> void:
	if i < inputs.size():
		inputs[i].grab_focus()


func submit() -> void:
	var typed: Array = inputs.map(func(e): return e.text)
	match discipline:
		"numbers":
			result = DrillLogic.score_sequence(items, typed, false)
		"words":
			result = DrillLogic.score_sequence(items, typed, true)
		"cards":
			result = DrillLogic.score_sequence(items.map(func(c): return c.canon), typed.map(func(x): return DrillLogic.normalize_card(x)), false)
		"images":
			result = DrillLogic.score_order(click_order, items.size())
		"names":
			result = DrillLogic.score_names(items, typed)
	var total: int = result.total
	result.accuracy = int(round(100.0 * result.correct / total)) if total else 0
	DB.log_history({ type = "drill", discipline = discipline, label = Content.disciplines[discipline].label, level = level_idx + 1,
		correct = result.correct, total = total, accuracy = result.accuracy, run = result.run, memTime = mem_time })
	phase = "result"
	refresh()


func _build_result() -> void:
	header(_title(), "%d / %d correct" % [result.correct, result.total])
	var stats := UI.grid(200, 12)
	stats.add_child(UI.stat("Accuracy", "%d%%" % result.accuracy))
	if result.run != null:
		stats.add_child(UI.stat("Correct run from start", str(result.run)))
	else:
		stats.add_child(UI.stat("Memorise time", "%ds" % mem_time))
	content.add_child(stats)
	if discipline != "images":
		content.add_child(_answers())
	content.add_child(UI.flow([UI.button("Run again", "ButtonPrimary", func(): App.go("drills", { setup = discipline })),
		UI.button("Back to drills", "ButtonGhost", _exit)]))


## What was shown, so you can see where it went wrong.
func _answers() -> Control:
	var card := UI.panel([UI.label("What you were shown", "H3")], "Card", 8)
	var text := ""
	match discipline:
		"numbers":
			text = "  ".join(Util.chunk_string("".join(items), 5))
		"words":
			text = ", ".join(items)
		"cards":
			text = "  ".join(items.map(func(c): return c.rank + c.sym))
		"names":
			text = ", ".join(items.map(func(n): return n.name))
	UI.body(card).add_child(UI.label(text, "Dim", true))
	return card


func _exit() -> void:
	phase = "done"
	App.go("drills")
