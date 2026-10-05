extends Control
## The app window: brand and tab bar on top, the current view below, plus the
## toast and modal layers. Views are created once and reused.

const TABS := [
	["dashboard", "Dashboard"], ["learn", "Learn"], ["palaces", "Palaces"], ["library", "Library"],
	["drills", "Drills"], ["history", "History"], ["backup", "Backup"],
]
## sub-screens and the tab they belong to
const PARENT_TAB := { palace = "palaces", deck = "library", drill = "drills", numbers = "drills" }
const VIEW_SCRIPTS := {
	dashboard = "res://scripts/views/dashboard_view.gd",
	learn = "res://scripts/views/learn_view.gd",
	palaces = "res://scripts/views/palaces_view.gd",
	palace = "res://scripts/views/palace_view.gd",
	library = "res://scripts/views/library_view.gd",
	deck = "res://scripts/views/deck_view.gd",
	drills = "res://scripts/views/drills_view.gd",
	drill = "res://scripts/views/drill_view.gd",
	numbers = "res://scripts/views/numbers_view.gd",
	history = "res://scripts/views/history_view.gd",
	backup = "res://scripts/views/backup_view.gd",
}

var views := {}
var current := ""
var tab_buttons := {}
var view_host: Control
var toast_box: VBoxContainer
var modal_layer: Control
var modal_panel: PanelContainer
var modal_scroll: ScrollContainer
var header: PanelContainer
var overlay_host: Control  ## full-screen experiences (the 3D castle) go here
var castle: Node3D = null
var _chrome: Array = []  ## the background and app layout, hidden while the castle is open


func _ready() -> void:
	theme = ThemeBuilder.build()
	_apply_scale()
	set_anchors_preset(PRESET_FULL_RECT)
	var bg := ColorRect.new()
	bg.color = ThemeBuilder.BG
	bg.set_anchors_preset(PRESET_FULL_RECT)
	add_child(bg)

	var root := VBoxContainer.new()
	root.set_anchors_preset(PRESET_FULL_RECT)
	root.add_theme_constant_override("separation", 0)
	add_child(root)
	_chrome = [bg, root]

	header = PanelContainer.new()
	header.theme_type_variation = "Header"
	root.add_child(header)
	var hm := MarginContainer.new()
	for side in ["left", "right"]:
		hm.add_theme_constant_override("margin_" + side, 16)
	hm.add_theme_constant_override("margin_top", 10)
	hm.add_theme_constant_override("margin_bottom", 4)
	header.add_child(hm)
	var hrow := HBoxContainer.new()
	hrow.add_theme_constant_override("separation", 18)
	hm.add_child(hrow)
	var brand := UI.vbox([UI.label("MNEMOSYNE", "Brand")], 0)
	brand.add_child(UI.label("MEMORY PALACE TRAINING", "StatLabel"))
	hrow.add_child(brand)
	var tab_scroll := ScrollContainer.new()
	tab_scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	tab_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_SHOW_NEVER
	tab_scroll.size_flags_horizontal = SIZE_EXPAND_FILL
	tab_scroll.follow_focus = true
	hrow.add_child(tab_scroll)
	var tabs := HBoxContainer.new()
	tabs.add_theme_constant_override("separation", 2)
	tab_scroll.add_child(tabs)
	for t in TABS:
		var b := UI.button(t[1], "TabButton", func(): go(t[0]))
		b.toggle_mode = true
		b.custom_minimum_size.y = 40
		tabs.add_child(b)
		tab_buttons[t[0]] = b
	var line := ColorRect.new()
	line.color = ThemeBuilder.LINE_SOFT
	line.custom_minimum_size.y = 1
	root.add_child(line)

	view_host = Control.new()
	view_host.size_flags_vertical = SIZE_EXPAND_FILL
	view_host.clip_contents = true
	root.add_child(view_host)

	overlay_host = Control.new()
	overlay_host.set_anchors_preset(PRESET_FULL_RECT)
	overlay_host.mouse_filter = MOUSE_FILTER_IGNORE
	add_child(overlay_host)

	_build_modal_layer()
	toast_box = VBoxContainer.new()
	toast_box.set_anchors_preset(PRESET_BOTTOM_RIGHT)
	toast_box.grow_horizontal = GROW_DIRECTION_BEGIN
	toast_box.grow_vertical = GROW_DIRECTION_BEGIN
	toast_box.position = Vector2(-24, -24)
	toast_box.alignment = BoxContainer.ALIGNMENT_END
	toast_box.mouse_filter = MOUSE_FILTER_IGNORE
	add_child(toast_box)

	App.main = self
	go("dashboard")


## Phones have dense screens: scale the whole UI so text is a comfortable size.
func _apply_scale() -> void:
	var s := 1.0
	if OS.has_feature("mobile"):
		s = clampf(DisplayServer.screen_get_dpi() / 160.0, 1.0, 3.5)
	else:
		s = clampf(DisplayServer.screen_get_scale(), 1.0, 3.0)
	get_window().content_scale_factor = s


func view(name: String) -> View:
	if not views.has(name):
		var v: View = load(VIEW_SCRIPTS[name]).new()
		v.name = name
		v.set_anchors_preset(PRESET_FULL_RECT)
		v.visible = false
		view_host.add_child(v)
		views[name] = v
	return views[name]


func go(name: String, args: Dictionary = {}) -> void:
	if not VIEW_SCRIPTS.has(name):
		push_error("unknown view " + name)
		return
	close_modal()
	for k in views:
		views[k].visible = false
	current = name
	var v := view(name)
	v.visible = true
	v.open(args)
	var tab: String = PARENT_TAB.get(name, name)
	for k in tab_buttons:
		tab_buttons[k].button_pressed = k == tab


# ---------- the 3D castle ----------

## Opens the castle full screen. mode: study | recall | due
func open_castle(palace_id: String, mode: String = "study") -> void:
	if castle:
		return
	close_modal()
	var c = load("res://scenes/castle.tscn").instantiate()
	c.setup(palace_id, mode)
	castle = c
	for n in _chrome:
		n.visible = false
	overlay_host.add_child(c)


func close_castle() -> void:
	if castle == null:
		return
	close_modal()
	var c := castle
	castle = null
	c.queue_free()
	for n in _chrome:
		n.visible = true
	refresh_current()


func refresh_current() -> void:
	if current != "" and views.has(current):
		views[current].refresh()


# ---------- toasts ----------

func toast(msg: String) -> void:
	var p := PanelContainer.new()
	p.theme_type_variation = "Toast"
	var l := UI.label(msg, "", true)
	l.custom_minimum_size.x = min(380.0, get_viewport_rect().size.x / get_window().content_scale_factor - 60.0)
	p.add_child(l)
	p.mouse_filter = MOUSE_FILTER_IGNORE
	toast_box.add_child(p)
	toast_box.position = Vector2(-24, -24)
	var tw := create_tween()
	tw.tween_interval(2.8)
	tw.tween_property(p, "modulate:a", 0.0, 0.4)
	tw.tween_callback(p.queue_free)


# ---------- modals ----------

func _build_modal_layer() -> void:
	modal_layer = Control.new()
	modal_layer.set_anchors_preset(PRESET_FULL_RECT)
	modal_layer.visible = false
	add_child(modal_layer)
	var dim := ColorRect.new()
	dim.color = Color(0, 0, 0, 0.62)
	dim.set_anchors_preset(PRESET_FULL_RECT)
	modal_layer.add_child(dim)
	var center := CenterContainer.new()
	center.set_anchors_preset(PRESET_FULL_RECT)
	modal_layer.add_child(center)
	modal_panel = PanelContainer.new()
	modal_panel.theme_type_variation = "Modal"
	center.add_child(modal_panel)
	modal_scroll = ScrollContainer.new()
	modal_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	modal_panel.add_child(modal_scroll)


func open_modal(content_node: Control, wide: bool = false) -> void:
	UI.clear(modal_scroll)
	var vp := get_viewport_rect().size / get_window().content_scale_factor
	var w: float = min(760.0 if wide else 560.0, vp.x - 32.0)
	content_node.custom_minimum_size.x = w - 52.0
	content_node.size_flags_horizontal = SIZE_EXPAND_FILL
	modal_scroll.add_child(content_node)
	modal_scroll.custom_minimum_size = Vector2(w - 52.0, 0)
	modal_layer.visible = true
	await get_tree().process_frame
	var h: float = min(content_node.get_combined_minimum_size().y, vp.y * 0.86 - 50.0)
	modal_scroll.custom_minimum_size.y = h


func close_modal() -> void:
	if modal_layer:
		modal_layer.visible = false
		UI.clear(modal_scroll)


func modal_open() -> bool:
	return modal_layer.visible


## A yes/no question in a modal.
func confirm(text: String, ok_label: String, on_ok: Callable, danger: bool = true) -> void:
	var box := UI.vbox([UI.label(text, "", true)], 18)
	box.add_child(UI.flow([
		UI.button("Cancel", "ButtonGhost", close_modal),
		UI.button(ok_label, "ButtonDanger" if danger else "ButtonPrimary", func():
			close_modal()
			on_ok.call()),
	]))
	open_modal(box)


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("ui_cancel") and modal_layer.visible:
		close_modal()
		get_viewport().set_input_as_handled()
