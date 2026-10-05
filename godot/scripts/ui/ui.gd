class_name UI
## Small builders for the app's screens, so views read like the layout they make.

static func label(text: String, variation: String = "", wrap: bool = false) -> Label:
	var l := Label.new()
	l.text = text
	if variation != "":
		l.theme_type_variation = variation
	if wrap:
		l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		l.custom_minimum_size.x = 60
	return l


static func rich(bbcode: String, selectable: bool = false) -> RichTextLabel:
	var r := RichTextLabel.new()
	r.bbcode_enabled = true
	r.fit_content = true
	r.scroll_active = false
	r.selection_enabled = selectable
	r.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	r.custom_minimum_size.x = 60
	r.text = bbcode
	return r


static func button(text: String, variation: String = "", on_press: Callable = Callable(), small: bool = false) -> Button:
	var b := Button.new()
	b.text = text
	if variation != "":
		b.theme_type_variation = variation
	if small:
		b.add_theme_font_size_override("font_size", 12)
		b.custom_minimum_size.y = 30
	else:
		b.custom_minimum_size.y = 38
	if on_press.is_valid():
		b.pressed.connect(on_press)
	b.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	b.focus_mode = Control.FOCUS_NONE
	return b


static func vbox(children: Array = [], sep: int = 10) -> VBoxContainer:
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", sep)
	for c in children:
		if c:
			v.add_child(c)
	return v


static func hbox(children: Array = [], sep: int = 10) -> HBoxContainer:
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", sep)
	for c in children:
		if c:
			h.add_child(c)
	return h


## A row that wraps onto the next line on narrow screens.
static func flow(children: Array = [], sep: int = 10) -> HFlowContainer:
	var f := HFlowContainer.new()
	f.add_theme_constant_override("h_separation", sep)
	f.add_theme_constant_override("v_separation", sep)
	for c in children:
		if c:
			f.add_child(c)
	return f


## Cards laid out in columns that collapse to one column on a phone.
static func grid(min_col_width: int = 320, sep: int = 14) -> GridFlow:
	var g := GridFlow.new()
	g.min_col_width = min_col_width
	g.sep = sep
	return g


static func panel(children: Array = [], variation: String = "Card", sep: int = 10) -> PanelContainer:
	var p := PanelContainer.new()
	p.theme_type_variation = variation
	p.add_child(vbox(children, sep))
	return p


## The VBox inside a panel made by `panel()`.
static func body(p: PanelContainer) -> VBoxContainer:
	return p.get_child(0)


static func pill(text: String, variation: String = "Pill") -> PanelContainer:
	var p := PanelContainer.new()
	p.theme_type_variation = variation
	var l := label(text, "Mono")
	l.add_theme_font_size_override("font_size", 10)
	if variation == "PillGold":
		l.add_theme_color_override("font_color", ThemeBuilder.GOLD)
	elif variation == "PillBlue":
		l.add_theme_color_override("font_color", ThemeBuilder.BLUE)
	elif variation == "PillRed":
		l.add_theme_color_override("font_color", ThemeBuilder.RED)
	p.add_child(l)
	p.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	p.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	return p


static func spacer(h: int = 8, w: int = 0) -> Control:
	var c := Control.new()
	c.custom_minimum_size = Vector2(w, h)
	return c


static func expand() -> Control:
	var c := Control.new()
	c.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return c


static func sep() -> HSeparator:
	return HSeparator.new()


static func line_edit(text: String = "", placeholder: String = "", on_commit: Callable = Callable()) -> LineEdit:
	var e := LineEdit.new()
	e.text = text
	e.placeholder_text = placeholder
	e.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	e.custom_minimum_size.y = 38
	if on_commit.is_valid():
		# save when the user finishes: enter, or leaving the field
		e.text_submitted.connect(func(_t): on_commit.call(e.text))
		e.focus_exited.connect(func(): on_commit.call(e.text))
	return e


static func text_edit(text: String = "", placeholder: String = "", on_commit: Callable = Callable(), min_h: int = 70) -> TextEdit:
	var e := TextEdit.new()
	e.text = text
	e.placeholder_text = placeholder
	e.wrap_mode = TextEdit.LINE_WRAPPING_BOUNDARY
	e.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	e.custom_minimum_size.y = min_h
	e.scroll_fit_content_height = true
	if on_commit.is_valid():
		e.focus_exited.connect(func(): on_commit.call(e.text))
	return e


## items: [[label, value], ...]
static func option(items: Array, selected_value = null, on_select: Callable = Callable()) -> OptionButton:
	var o := OptionButton.new()
	for i in items.size():
		o.add_item(str(items[i][0]), i)
		o.set_item_metadata(i, items[i][1])
		if items[i][1] == selected_value:
			o.select(i)
	o.custom_minimum_size.y = 38
	o.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	o.fit_to_longest_item = false
	o.clip_text = true
	if on_select.is_valid():
		o.item_selected.connect(func(i): on_select.call(o.get_item_metadata(i)))
	return o


static func option_value(o: OptionButton):
	return o.get_item_metadata(o.selected) if o.selected >= 0 else null


static func field(label_text: String, control: Control) -> VBoxContainer:
	return vbox([label(label_text.to_upper(), "StatLabel"), control], 6)


static func stat(label_text: String, value: String, sub: String = "") -> PanelContainer:
	var p := panel([label(label_text.to_upper(), "StatLabel"), label(value, "StatValue")], "Stat", 2)
	if sub != "":
		body(p).add_child(label(sub, "Mute"))
	p.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return p


static func image_rect(tex: Texture2D, size: Vector2) -> TextureRect:
	var r := TextureRect.new()
	r.texture = tex
	r.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	r.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	r.custom_minimum_size = size
	r.clip_contents = true
	return r


static func clear(node: Node) -> void:
	for c in node.get_children():
		node.remove_child(c)
		c.queue_free()


## A titled empty-state message with an optional action.
static func empty(text: String, action_label: String = "", action: Callable = Callable()) -> PanelContainer:
	var p := panel([label(text, "Mute", true)], "Card", 14)
	var b := body(p)
	b.alignment = BoxContainer.ALIGNMENT_CENTER
	if action_label != "":
		b.add_child(button(action_label, "ButtonPrimary", action))
	return p
