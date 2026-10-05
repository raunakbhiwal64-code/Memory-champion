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
