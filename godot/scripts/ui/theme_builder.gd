class_name ThemeBuilder
## The app's look, built in code from the same palette and fonts as the website.

const BG := Color("#14161c")
const SURFACE := Color("#1b1e27")
const SURFACE_2 := Color("#20232d")
const SURFACE_3 := Color("#262a35")
const LINE := Color("#2c303c")
const LINE_SOFT := Color("#22252f")
const INK := Color("#ece8dd")
const INK_DIM := Color("#b7b4ab")
const INK_MUTE := Color("#7d8091")
const BLUE := Color("#6cabd6")
const BLUE_DIM := Color("#3d5164")
const GOLD := Color("#cda13a")
const GOLD_DIM := Color("#5a4d2a")
const RED := Color("#d3766a")
const GREEN := Color("#82b98d")

static var serif: Font
static var sans: Font
static var sans_medium: Font
static var sans_bold: Font
static var mono: Font


static func _font(file: String) -> Font:
	var f := FontFile.new()
	var err := f.load_dynamic_font("res://assets/fonts/" + file)
	if err != OK:
		return ThemeDB.fallback_font
	# symbols the latin subsets don't have (★ ♠ ♥ ◆ ☺) come from the system
	var sys := SystemFont.new()
	sys.font_names = PackedStringArray(["Noto Sans Symbols 2", "Noto Sans Symbols", "Segoe UI Symbol", "Apple Symbols", "DejaVu Sans", "Noto Sans"])
	f.fallbacks = [sys]
	return f


static func load_fonts() -> void:
	if sans:
		return
	serif = _font("fraunces-latin-600-normal.woff2")
	sans = _font("ibm-plex-sans-latin-400-normal.woff2")
	sans_medium = _font("ibm-plex-sans-latin-500-normal.woff2")
	sans_bold = _font("ibm-plex-sans-latin-600-normal.woff2")
	mono = _font("ibm-plex-mono-latin-400-normal.woff2")


static func box(bg: Color, border: Color = Color.TRANSPARENT, radius: int = 3, pad: Vector4 = Vector4(14, 10, 14, 10), border_w: int = 1) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = bg
	s.border_color = border
	s.set_border_width_all(border_w if border.a > 0.0 else 0)
	s.set_corner_radius_all(radius)
	s.content_margin_left = pad.x
	s.content_margin_top = pad.y
	s.content_margin_right = pad.z
	s.content_margin_bottom = pad.w
	s.anti_aliasing = true
	return s


static func build() -> Theme:
	load_fonts()
	var t := Theme.new()
	t.default_font = sans
	t.default_font_size = 14

	# ---- text ----
	t.set_color("font_color", "Label", INK)
	_label(t, "Heading", serif, 26, INK)
	_label(t, "H2", serif, 20, INK)
	_label(t, "H3", serif, 17, INK)
	_label(t, "Eyebrow", mono, 11, GOLD)
	_label(t, "Dim", sans, 13, INK_DIM)
	_label(t, "Mute", sans, 12, INK_MUTE)
	_label(t, "Mono", mono, 12, INK_MUTE)
	_label(t, "MonoGold", mono, 13, GOLD)
	_label(t, "Gold", sans_medium, 13, GOLD)
	_label(t, "StatLabel", mono, 10, INK_MUTE)
	_label(t, "StatValue", serif, 30, INK)
	_label(t, "Brand", serif, 22, INK)
	t.set_color("default_color", "RichTextLabel", INK_DIM)
	t.set_font("normal_font", "RichTextLabel", sans)
	t.set_font("bold_font", "RichTextLabel", sans_bold)
	t.set_font("italics_font", "RichTextLabel", sans)
	t.set_font("mono_font", "RichTextLabel", mono)
	t.set_font_size("normal_font_size", "RichTextLabel", 14)
	t.set_font_size("bold_font_size", "RichTextLabel", 14)
	t.set_constant("line_separation", "RichTextLabel", 5)

	# ---- panels ----
	t.set_stylebox("panel", "PanelContainer", box(SURFACE, LINE, 3, Vector4(20, 18, 20, 18)))
	_panel(t, "Card", box(SURFACE, LINE, 3, Vector4(20, 18, 20, 18)))
	_panel(t, "CardGold", box(SURFACE, GOLD_DIM, 3, Vector4(20, 18, 20, 18)))
	_panel(t, "CardFlat", box(SURFACE, LINE, 3, Vector4(0, 0, 0, 0)))
	_panel(t, "Inset", box(SURFACE_2, LINE, 3, Vector4(14, 12, 14, 12)))
	_panel(t, "Stat", box(SURFACE, LINE, 3, Vector4(18, 14, 18, 14)))
	_panel(t, "Pill", box(Color.TRANSPARENT, LINE, 20, Vector4(8, 1, 8, 2)))
	_panel(t, "PillGold", box(Color.TRANSPARENT, GOLD_DIM, 20, Vector4(8, 1, 8, 2)))
	_panel(t, "PillBlue", box(Color.TRANSPARENT, BLUE_DIM, 20, Vector4(8, 1, 8, 2)))
	_panel(t, "PillRed", box(Color.TRANSPARENT, RED, 20, Vector4(8, 1, 8, 2)))
	_panel(t, "Modal", box(SURFACE, LINE, 4, Vector4(26, 24, 26, 22)))
	_panel(t, "Toast", box(SURFACE_3, GOLD, 3, Vector4(18, 12, 18, 12)))
	_panel(t, "Header", box(BG, Color.TRANSPARENT, 0, Vector4(0, 0, 0, 0)))
	_panel(t, "Row", box(Color.TRANSPARENT, Color.TRANSPARENT, 0, Vector4(18, 10, 18, 10)))

	# ---- buttons ----
	_button(t, "Button", box(Color.TRANSPARENT, LINE), box(SURFACE_2, BLUE), INK, INK)
	_button(t, "ButtonGhost", box(Color.TRANSPARENT, LINE), box(SURFACE_2, BLUE), INK, INK)
	_button(t, "ButtonPrimary", box(BLUE, BLUE), box(Color("#7cb6de"), Color("#7cb6de")), Color("#0f1319"), Color("#0f1319"), sans_bold)
	_button(t, "ButtonGold", box(GOLD, GOLD), box(Color("#ddb549"), Color("#ddb549")), Color("#1a1508"), Color("#1a1508"), sans_bold)
	_button(t, "ButtonDanger", box(Color.TRANSPARENT, RED), box(Color(RED, 0.1), RED), RED, RED)
	_button(t, "ButtonGreen", box(Color.TRANSPARENT, GREEN), box(Color(GREEN, 0.12), GREEN), GREEN, GREEN)
	_button(t, "ButtonLink", box(Color.TRANSPARENT, Color.TRANSPARENT, 0, Vector4(0, 2, 0, 2)), box(Color.TRANSPARENT, Color.TRANSPARENT, 0, Vector4(0, 2, 0, 2)), BLUE, Color("#9cc8e8"))
	var tab_n := box(Color.TRANSPARENT, Color.TRANSPARENT, 3, Vector4(12, 8, 12, 8))
	var tab_h := box(SURFACE_2, Color.TRANSPARENT, 3, Vector4(12, 8, 12, 8))
	var tab_p := StyleBoxFlat.new()
	tab_p.bg_color = SURFACE_2
	tab_p.border_color = GOLD
	tab_p.border_width_bottom = 2
	tab_p.set_corner_radius_all(3)
	tab_p.content_margin_left = 12
	tab_p.content_margin_right = 12
	tab_p.content_margin_top = 8
	tab_p.content_margin_bottom = 6
	_button(t, "TabButton", tab_n, tab_h, INK_MUTE, INK)
	t.set_stylebox("pressed", "TabButton", tab_p)
	t.set_stylebox("hover_pressed", "TabButton", tab_p)
	t.set_color("font_pressed_color", "TabButton", INK)
	t.set_color("font_hover_pressed_color", "TabButton", INK)

	# ---- inputs ----
	for type in ["LineEdit", "TextEdit"]:
		t.set_stylebox("normal", type, box(SURFACE_2, LINE, 3, Vector4(10, 8, 10, 8)))
		t.set_stylebox("focus", type, box(Color.TRANSPARENT, BLUE, 3, Vector4(10, 8, 10, 8)))
		t.set_stylebox("read_only", type, box(SURFACE, LINE_SOFT, 3, Vector4(10, 8, 10, 8)))
		t.set_color("font_color", type, INK)
		t.set_color("font_placeholder_color", type, INK_MUTE)
		t.set_color("caret_color", type, GOLD)
		t.set_color("selection_color", type, Color(BLUE, 0.35))
		t.set_color("font_readonly_color", type, INK_DIM)
	_button(t, "OptionButton", box(SURFACE_2, LINE, 3, Vector4(10, 7, 30, 7)), box(SURFACE_3, BLUE, 3, Vector4(10, 7, 30, 7)), INK, INK)
	t.set_stylebox("panel", "PopupMenu", box(SURFACE_3, LINE, 3, Vector4(6, 6, 6, 6)))
	t.set_stylebox("hover", "PopupMenu", box(SURFACE_2, Color.TRANSPARENT, 2))
	t.set_color("font_color", "PopupMenu", INK_DIM)
	t.set_color("font_hover_color", "PopupMenu", INK)
	t.set_color("font_color", "CheckBox", INK_DIM)
	t.set_color("font_hover_color", "CheckBox", INK)
	t.set_color("font_pressed_color", "CheckBox", INK)
	t.set_stylebox("normal", "CheckBox", box(Color.TRANSPARENT, Color.TRANSPARENT, 0, Vector4(0, 4, 4, 4)))
	t.set_stylebox("hover", "CheckBox", box(Color.TRANSPARENT, Color.TRANSPARENT, 0, Vector4(0, 4, 4, 4)))
	t.set_stylebox("pressed", "CheckBox", box(Color.TRANSPARENT, Color.TRANSPARENT, 0, Vector4(0, 4, 4, 4)))
	t.set_stylebox("hover_pressed", "CheckBox", box(Color.TRANSPARENT, Color.TRANSPARENT, 0, Vector4(0, 4, 4, 4)))
	t.set_stylebox("focus", "CheckBox", StyleBoxEmpty.new())
	var bar_bg := box(SURFACE_2, Color.TRANSPARENT, 3, Vector4.ZERO)
	var bar_fill := box(GOLD, Color.TRANSPARENT, 3, Vector4.ZERO)
	t.set_stylebox("background", "ProgressBar", bar_bg)
	t.set_stylebox("fill", "ProgressBar", bar_fill)
	t.set_stylebox("slider", "HSlider", box(SURFACE_3, Color.TRANSPARENT, 3, Vector4(0, 3, 0, 3)))
	t.set_stylebox("grabber_area", "HSlider", box(GOLD_DIM, Color.TRANSPARENT, 3, Vector4(0, 3, 0, 3)))
	t.set_stylebox("grabber_area_highlight", "HSlider", box(GOLD, Color.TRANSPARENT, 3, Vector4(0, 3, 0, 3)))
	t.set_stylebox("separator", "HSeparator", box(LINE_SOFT, Color.TRANSPARENT, 0, Vector4.ZERO))
	t.set_constant("separation", "HSeparator", 1)
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(LINE, 0.9)
	sb.set_corner_radius_all(3)
	sb.content_margin_left = 3
	sb.content_margin_right = 3
	t.set_stylebox("grabber", "VScrollBar", sb)
	t.set_stylebox("grabber_highlight", "VScrollBar", sb)
	t.set_stylebox("grabber_pressed", "VScrollBar", sb)
	t.set_stylebox("scroll", "VScrollBar", StyleBoxEmpty.new())
	t.set_stylebox("panel", "TooltipPanel", box(SURFACE_3, LINE, 3, Vector4(8, 5, 8, 5)))
	t.set_color("font_color", "TooltipLabel", INK)
	return t


static func _label(t: Theme, name: String, font: Font, size: int, color: Color) -> void:
	t.set_type_variation(name, "Label")
	t.set_font("font", name, font)
	t.set_font_size("font_size", name, size)
	t.set_color("font_color", name, color)


static func _panel(t: Theme, name: String, style: StyleBox) -> void:
	t.set_type_variation(name, "PanelContainer")
	t.set_stylebox("panel", name, style)


static func _button(t: Theme, name: String, normal: StyleBox, hover: StyleBox, color: Color, hover_color: Color, font: Font = null) -> void:
	if name != "Button" and name != "OptionButton":
		t.set_type_variation(name, "Button")
	t.set_stylebox("normal", name, normal)
	t.set_stylebox("hover", name, hover)
	t.set_stylebox("pressed", name, hover)
	t.set_stylebox("hover_pressed", name, hover)
	var dis := normal.duplicate() as StyleBoxFlat
	if dis:
		dis.bg_color = Color(dis.bg_color, dis.bg_color.a * 0.4)
		dis.border_color = Color(dis.border_color, dis.border_color.a * 0.4)
		t.set_stylebox("disabled", name, dis)
	t.set_stylebox("focus", name, StyleBoxEmpty.new())
	t.set_color("font_color", name, color)
	t.set_color("font_hover_color", name, hover_color)
	t.set_color("font_pressed_color", name, hover_color)
	t.set_color("font_focus_color", name, color)
	t.set_color("font_disabled_color", name, Color(color, 0.4))
	if font:
		t.set_font("font", name, font)
