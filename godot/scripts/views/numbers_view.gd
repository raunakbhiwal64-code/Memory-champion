extends View
## Number systems: the Major System (100 words, defaults you can replace) and
## a PAO table (Person-Action-Object, entirely yours to build).

var tab := "major"
var filter := ""
var grid_host: VBoxContainer


func open(new_args: Dictionary) -> void:
	tab = new_args.get("tab", DB.data.numberSystemPref)
	filter = ""
	super.open(new_args)


func build() -> void:
	content.add_child(back_button("Drills", "drills"))
	var major := tab == "major"
	header("NUMBER SYSTEMS", "Your number systems", "Every 2-digit pair, 00 through 99, gets one word. Starting defaults are filled in: replace any of them with your own and it saves." if major else
		"Give each number a Person, an Action and an Object, then combine three numbers (or three cards) into one scene: the first pair's person does the second pair's action to the third pair's object. Nothing is pre-filled: the people who work best are the ones already vivid to you.")
	content.add_child(UI.flow([_tab_button("major", "Major System"), _tab_button("pao", "PAO (Person-Action-Object)")], 8))
	if major:
		var legend := UI.flow([], 16)
		for l in Content.major_legend:
			legend.add_child(UI.hbox([UI.label(l.d, "MonoGold"), UI.label("= " + l.s, "Dim")], 4))
		content.add_child(UI.panel([UI.label("SOUND LEGEND — DIGIT: CONSONANT SOUND", "StatLabel"), legend], "Card", 8))
	var search := UI.line_edit(filter, "Filter by number or word…" if major else "Filter by number, person, action, or object…")
	search.text_changed.connect(func(t):
		filter = t
		_fill_grid())
	search.custom_minimum_size.x = 260
	search.size_flags_horizontal = SIZE_SHRINK_BEGIN
	var progress := UI.label("%d/100 replaced with your own words" % DB.data.majorSystem.overrides.size() if major else "%d/100 fully built" % DB.pao_complete_count(), "Mute")
	content.add_child(UI.flow([search, progress], 14))
	grid_host = UI.vbox([], 0)
	content.add_child(grid_host)
	_fill_grid()


func _tab_button(key: String, label: String) -> Button:
	return UI.button(label, "ButtonPrimary" if tab == key else "ButtonGhost", func():
		tab = key
		DB.data.numberSystemPref = key
		DB.save("numbers")
		filter = ""
		refresh(), true)


func _numbers() -> Array:
	var nums: Array = Content.major_defaults.keys()
	nums.sort()
	var f := filter.strip_edges().to_lower()
	if f == "":
		return nums
	return nums.filter(func(n):
		if n.begins_with(f):
			return true
		if tab == "major":
			return DB.major_word(n).to_lower().contains(f)
		var e: Dictionary = DB.data.pao.entries.get(n, {})
		return [e.get("person", ""), e.get("action", ""), e.get("object", "")].any(func(v): return v.to_lower().contains(f)))


func _fill_grid() -> void:
	UI.clear(grid_host)
	var nums := _numbers()
	if nums.is_empty():
		grid_host.add_child(UI.empty("Nothing matches \"%s\"" % filter))
		return
	var g := UI.grid(230 if tab == "major" else 330, 8)
	for n in nums:
		g.add_child(_major_row(n) if tab == "major" else _pao_row(n))
	grid_host.add_child(g)


func _major_row(n: String) -> Control:
	var ov: String = DB.data.majorSystem.overrides.get(n, "")
	var e := UI.line_edit(ov, Content.major_defaults[n], func(t):
		var v: String = t.strip_edges()
		if v == DB.data.majorSystem.overrides.get(n, ""):
			return
		if v != "":
			DB.data.majorSystem.overrides[n] = v
		else:
			DB.data.majorSystem.overrides.erase(n)
		DB.save("numbers"))
	var row := UI.hbox([UI.label(n, "MonoGold"), e], 8)
	if ov != "":
		row.add_child(UI.button("↺", "ButtonGhost", func():
			DB.data.majorSystem.overrides.erase(n)
			DB.save("numbers")
			_fill_grid(), true))
	return UI.panel([row], "Inset", 0)


func _pao_row(n: String) -> Control:
	var e: Dictionary = DB.data.pao.entries.get(n, {})
	var complete: bool = e.get("person", "") != "" and e.get("action", "") != "" and e.get("object", "") != ""
	var head := UI.hbox([UI.label(n, "MonoGold")], 8)
	if complete:
		head.add_child(UI.pill("built", "PillGold"))
	var fields := UI.hbox([], 6)
	for field in ["person", "action", "object"]:
		var le := UI.line_edit(e.get(field, ""), field.capitalize(), func(t):
			var entry: Dictionary = DB.data.pao.entries.get(n, { person = "", action = "", object = "" }).duplicate()
			if entry.get(field, "") == t.strip_edges():
				return
			entry[field] = t.strip_edges()
			if entry.person != "" or entry.action != "" or entry.object != "":
				DB.data.pao.entries[n] = entry
			else:
				DB.data.pao.entries.erase(n)
			DB.save("numbers"))
		le.add_theme_font_size_override("font_size", 13)
		fields.add_child(le)
	return UI.panel([head, fields], "Inset", 6)
