extends View
## One palace: its stations in route order, and the walks (study, recall,
## review what's due). Castles can also be walked in 3D.

var palace: Dictionary = {}


func open(new_args: Dictionary) -> void:
	var p = DB.find_palace(new_args.get("id", ""))
	if p == null:
		App.go("palaces")
		return
	palace = p
	super.open(new_args)
	if new_args.get("castle", "") != "" and has_castle_3d():
		open_castle(new_args.castle)
	elif new_args.get("walk", "") != "":
		start_walk.call_deferred(new_args.walk)


static func has_castle_3d() -> bool:
	return ResourceLoader.exists("res://scenes/castle.tscn")


func open_castle(mode: String) -> void:
	if App.main and App.main.has_method("open_castle"):
		App.main.open_castle(palace.id, mode)


func build() -> void:
	var castle := DB.is_castle(palace)
	var due := DB.due_loci(palace).size()
	var actions := []
	if castle and has_castle_3d():
		actions.append(UI.button("Enter the 3D castle", "ButtonGold", func(): open_castle("study")))
	if due > 0:
		actions.append(UI.button("Review %d due" % due, "ButtonGold", func(): start_walk("due")))
	actions.append(UI.button("Study walk", "ButtonGhost", func(): start_walk("study")))
	actions.append(UI.button("Recall walk", "ButtonPrimary", func(): start_walk("recall")))
	content.add_child(back_button("All palaces", "palaces"))
	header("CASTLE PALACE" if castle else "PALACE", palace.name, palace.description, actions)
	var st := DB.palace_status(palace)
	content.add_child(UI.flow([UI.pill("%d/%d stations filled" % [DB.filled_count(palace), palace.loci.size()], "PillBlue"),
		UI.pill(st.text, "PillGold" if st.due else "Pill")], 8))
	if palace.loci.is_empty():
		content.add_child(UI.empty("No stations yet. Add the stops along your route, in order.", "+ Add station", _add_locus))
	for i in palace.loci.size():
		content.add_child(_locus_card(i))
	var foot := UI.flow([], 10)
	if not castle:
		foot.add_child(UI.button("+ Add station", "ButtonPrimary", _add_locus))
	foot.add_child(UI.button("Delete palace", "ButtonDanger", _delete))
	content.add_child(foot)


func _locus_card(i: int) -> Control:
	var l: Dictionary = palace.loci[i]
	var castle := DB.is_castle(palace)
	var num := UI.label("%02d" % (i + 1), "MonoGold")
	num.add_theme_font_size_override("font_size", 20)
	num.custom_minimum_size.x = 36
	var title := UI.line_edit(l.title, "Station name (e.g. front door, hallway mirror)", func(text): _set_title(l, text))
	title.editable = not castle
	var c = l.get("content")
	var text := UI.text_edit(c.text if c is Dictionary else "", "What's stored here: an image, a phrase, an association…", func(t): _set_text(l, t), 56)
	var col := UI.vbox([title, text], 8)
	col.size_flags_horizontal = SIZE_EXPAND_FILL
	var meta := UI.flow([], 8)
	if c is Dictionary and c.get("source"):
		meta.add_child(UI.pill("from " + str(c.source), "PillGold"))
	if DB.is_locus_filled(l):
		var r = l.get("review")
		if r == null:
			meta.add_child(UI.pill("new — due for first review", "PillGold"))
		elif Fsrs.is_due(r):
			meta.add_child(UI.pill("due for review", "PillGold"))
		else:
			meta.add_child(UI.pill("next review %s" % Util.due_label(r.due)))
	var tex := Util.texture_from_data_url(l.get("image"))
	if tex:
		meta.add_child(UI.image_rect(tex, Vector2(56, 56)))
	meta.add_child(UI.button("Replace photo" if tex else "+ Add photo", "ButtonGhost", func(): pick_image(func(url):
		l.image = url
		DB.save("palaces")
		refresh()), true))
	if tex:
		meta.add_child(UI.button("Remove photo", "ButtonDanger", func():
			l.image = null
			DB.save("palaces")
			refresh(), true))
	col.add_child(meta)
	var row := UI.hbox([num, col], 14)
	if not castle:
		row.add_child(UI.vbox([UI.button("↑", "ButtonGhost", func(): _move(i, -1), true), UI.button("↓", "ButtonGhost", func(): _move(i, 1), true),
			UI.button("✕", "ButtonDanger", func(): _remove(i), true)], 6))
	return UI.panel([row], "Card")


func _set_title(l: Dictionary, text: String) -> void:
	if text == l.title:
		return
	var t := text.strip_edges().to_lower()
	if t != "":
		for other in palace.loci:
			if other != l and str(other.title).strip_edges().to_lower() == t:
				App.toast("\"%s\" is already used at another station: keep stations visually distinct so recall doesn't blur them together" % text.strip_edges())
				break
	l.title = text
	DB.save("palaces")


func _set_text(l: Dictionary, text: String) -> void:
	var old: String = l.content.text if l.get("content") is Dictionary else ""
	if text.strip_edges() == old:
		return
	if text.strip_edges() == "":
		l.content = null
	else:
		l.content = { text = text.strip_edges(), source = l.content.get("source") if l.get("content") is Dictionary else null }
	l.review = null  # new content starts a fresh schedule
	DB.save("palaces")


func _add_locus() -> void:
	palace.loci.append(DB.new_locus())
	DB.save("palaces")
	refresh()
	await get_tree().process_frame
	scroll_vertical = int(get_v_scroll_bar().max_value)


func _move(i: int, dir: int) -> void:
	var j := i + dir
	if j < 0 or j >= palace.loci.size():
		return
	var tmp = palace.loci[i]
	palace.loci[i] = palace.loci[j]
	palace.loci[j] = tmp
	DB.save("palaces")
	refresh()


func _remove(i: int) -> void:
	App.confirm("Remove station %d and whatever is stored there?" % (i + 1), "Remove", func():
		palace.loci.remove_at(i)
		DB.save("palaces")
		refresh())


func _delete() -> void:
	App.confirm("Delete \"%s\" and every memory in it? (Today's snapshot under Backup still has it.)" % palace.name, "Delete palace", func():
		DB.data.palaces.erase(palace)
		DB.save("palaces")
		App.go("palaces"))


# ---------- walks ----------

func start_walk(mode: String) -> void:
	if mode == "study":
		if palace.loci.is_empty():
			palace.loci.append(DB.new_locus())
			DB.save("palaces")
		_study_step(0)
		return
	var walked: Array = DB.due_loci(palace) if mode == "due" else palace.loci.filter(func(l): return DB.is_locus_filled(l))
	if walked.is_empty():
		App.toast("Nothing is due here right now" if mode == "due" else "Store something at a station first, then walk the route to recall it")
		return
	var entries := []
	for l in walked:
		var n: int = palace.loci.find(l) + 1
		entries.append({ heading = l.title if l.title != "" else "(untitled station)", cue = "Station %d" % n,
			text = l.content.text if l.get("content") is Dictionary else "", image = l.get("image") })
	RecallSession.start("Review" if mode == "due" else "Recall walk", entries, func(grades):
		DB.finish_palace_walk(palace, walked, grades)
		refresh())


## Study mode is editable in place: walking the palace is how you build it.
func _study_step(i: int) -> void:
	var l: Dictionary = palace.loci[i]
	var castle := DB.is_castle(palace)
	var title := UI.line_edit(l.title, "Station name")
	title.editable = not castle
	title.add_theme_font_size_override("font_size", 18)
	var c = l.get("content")
	var text := UI.text_edit(c.text if c is Dictionary else "", "What's stored here? Type it in: it saves as you walk.", Callable(), 90)
	var commit := func():
		if not castle and title.text != l.title:
			_set_title(l, title.text)
		_set_text(l, text.text)
	var box := UI.vbox([UI.label("STATION %d OF %d" % [i + 1, palace.loci.size()], "StatLabel"), title], 12)
	var tex := Util.texture_from_data_url(l.get("image"))
	if tex:
		box.add_child(UI.image_rect(tex, Vector2(0, 180)))
	box.add_child(text)
	if not castle:
		box.add_child(UI.flow([UI.button("+ New station here", "ButtonGhost", func():
			commit.call()
			palace.loci.insert(i + 1, DB.new_locus())
			DB.save("palaces")
			_study_step(i + 1), true)]))
	var prev := UI.button("← Prev", "ButtonGhost", func():
		commit.call()
		_study_step(i - 1), true)
	prev.disabled = i == 0
	var last: bool = i == palace.loci.size() - 1
	box.add_child(UI.hbox([UI.button("Exit walk", "ButtonGhost", func():
		commit.call()
		App.close_modal()
		refresh(), true), UI.expand(), prev, UI.button("Done" if last else "Next →", "ButtonPrimary", func():
		commit.call()
		if last:
			App.close_modal()
			refresh()
		else:
			_study_step(i + 1), true)]))
	App.open_modal(box)
	if not castle and l.title == "":
		title.grab_focus.call_deferred()
