class_name View
extends ScrollContainer
## Base for every screen: a vertical scroll area with a centred column of
## content (at most MAX_W wide). Subclasses fill `content` in build().

const MAX_W := 1100.0

var content: VBoxContainer
var margin: MarginContainer
var args: Dictionary = {}


func _init() -> void:
	horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	size_flags_horizontal = SIZE_EXPAND_FILL
	size_flags_vertical = SIZE_EXPAND_FILL
	margin = MarginContainer.new()
	margin.size_flags_horizontal = SIZE_EXPAND_FILL
	add_child(margin)
	content = VBoxContainer.new()
	content.add_theme_constant_override("separation", 16)
	content.size_flags_horizontal = SIZE_EXPAND_FILL
	margin.add_child(content)
	resized.connect(_fit)


func _fit() -> void:
	var side: float = max(16.0, (size.x - MAX_W) / 2.0)
	margin.add_theme_constant_override("margin_left", int(side))
	margin.add_theme_constant_override("margin_right", int(side))
	margin.add_theme_constant_override("margin_top", 24)
	margin.add_theme_constant_override("margin_bottom", 48)


func open(new_args: Dictionary) -> void:
	args = new_args
	refresh()
	scroll_vertical = 0


func refresh() -> void:
	UI.clear(content)
	build()


## Override: fill `content`.
func build() -> void:
	pass


## Standard heading block: eyebrow, title, description, actions on the right.
func header(eyebrow: String, title: String, desc: String = "", actions: Array = []) -> void:
	var left := UI.vbox([], 6)
	left.size_flags_horizontal = SIZE_EXPAND_FILL
	if eyebrow != "":
		left.add_child(UI.label(eyebrow, "Eyebrow"))
	left.add_child(UI.label(title, "Heading", true))
	if desc != "":
		var d := UI.label(desc, "Dim", true)
		d.custom_minimum_size.x = 200
		left.add_child(d)
	# actions sit to the right on a wide screen and wrap below the title on a phone
	left.custom_minimum_size.x = 260
	content.add_child(UI.flow([left, UI.flow(actions, 10)] if not actions.is_empty() else [left], 16))


## A nudge to read the relevant lesson, shown until it's marked learned.
func tip(lesson_id: String, text: String) -> void:
	if DB.is_lesson_done(lesson_id):
		return
	var l = Content.find_lesson(lesson_id)
	if l == null:
		return
	var t := UI.label(text, "Dim", true)
	t.custom_minimum_size.x = 260
	content.add_child(UI.panel([UI.flow([t, UI.button("Read: " + l.title, "ButtonGold", func(): App.go("learn", { lesson = lesson_id }), true)], 14)], "CardGold"))


func back_button(label: String, view: String) -> Button:
	var b := UI.button("← " + label, "ButtonGhost", func(): App.go(view), true)
	b.size_flags_horizontal = SIZE_SHRINK_BEGIN
	return b


## Opens a picker for an image file and returns it as a compressed data URL.
func pick_image(on_picked: Callable) -> void:
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


## A card that opens something when tapped anywhere on it.
func clickable(p: Control, on_click: Callable) -> Control:
	p.mouse_default_cursor_shape = CURSOR_POINTING_HAND
	p.gui_input.connect(func(ev):
		if ev is InputEventMouseButton and ev.button_index == MOUSE_BUTTON_LEFT and ev.pressed:
			on_click.call())
	return p
