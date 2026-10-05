class_name LibraryView
extends View
## Decks of things to learn, imported from text, plus everything starred to learn.


func build() -> void:
	header("03 — LIBRARY", "Library", "Bring in text you want to remember, split it into items, star what matters, then practise it or place it in a palace.",
		[UI.button("+ New deck", "ButtonPrimary", new_deck_dialog)])
	tip("l5-4", "Memorizing a book is a different goal from a one-shot drill. This lesson covers the spaced-review habit this tab is built around.")
	var marked := DB.all_marked_items()
	if not marked.is_empty():
		var decks := {}
		for m in marked:
			decks[m.deckId] = true
		var card := UI.panel([UI.flow([UI.label("★ Marked to learn — %d across %s" % [marked.size(), Util.plural(decks.size(), "deck")], "H3"), UI.expand(),
			UI.button("Send to palace", "ButtonGhost", func(): send_to_palace_dialog("%d marked items" % marked.size(), marked.map(func(m): return { text = m.text, source = m.deckTitle })), true),
			UI.button("Practise all marked", "ButtonGold", _practise_marked, true)], 10)], "CardGold", 6)
		for m in marked.slice(0, 12):
			UI.body(card).add_child(UI.label("%s  — %s" % [m.text, m.deckTitle], "Dim", true))
		if marked.size() > 12:
			UI.body(card).add_child(UI.label("…and %d more" % (marked.size() - 12), "Mute"))
		content.add_child(card)
	if DB.data.decks.is_empty():
		content.add_child(UI.empty("No decks yet. Paste some text or import a text file to start.", "+ New deck", new_deck_dialog))
		return
	var grid := UI.grid(330, 14)
	for d in DB.data.decks:
		grid.add_child(_card(d))
	content.add_child(grid)


func _card(d: Dictionary) -> Control:
	var st := DB.deck_status(d)
	var marked: int = d.items.filter(func(it): return it.get("marked", false)).size()
	var card := UI.panel([UI.flow([UI.pill(Util.plural(d.items.size(), "item"), "PillBlue"), UI.pill(st.text, "PillGold" if st.due else "Pill")], 6),
		UI.label(d.title, "H2", true), UI.label("From " + d.sourceName if d.sourceName != "" else "Typed or pasted in", "Mute", true)], "Card", 8)
	if marked:
		UI.body(card).add_child(UI.label("★ %d marked" % marked, "MonoGold"))
	return clickable(card, func(): App.go("deck", { id = d.id }))


func _practise_marked() -> void:
	var marked := DB.all_marked_items()
	DeckView.practise("Marked to learn", marked.map(func(m): return m.item))


static func new_deck_dialog() -> void:
	var title := UI.line_edit("", "e.g. Meditations, Book III")
	var text := UI.text_edit("", "Paste the text you want to learn…", Callable(), 160)
	var split := UI.option([["Sentence", "sentence"], ["Line break", "line"], ["Paragraph", "paragraph"]], "sentence")
	var source := { name = "" }
	var file_btn := UI.button("Import a text file…", "ButtonGhost", Callable(), true)
	file_btn.pressed.connect(func():
		var fd := FileDialog.new()
		fd.file_mode = FileDialog.FILE_MODE_OPEN_FILE
		fd.access = FileDialog.ACCESS_FILESYSTEM
		fd.use_native_dialog = true
		fd.filters = PackedStringArray(["*.txt, *.md, *.text ; Text files"])
		fd.size = Vector2i(820, 560)
		App.main.add_child(fd)
		fd.canceled.connect(fd.queue_free)
		fd.file_selected.connect(func(path):
			fd.queue_free()
			text.text = FileAccess.get_file_as_string(path)
			source.name = path.get_file()
			if title.text.strip_edges() == "":
				title.text = path.get_file().get_basename()
			file_btn.text = "Imported " + path.get_file())
		fd.popup_centered())
	var box := UI.vbox([UI.label("New deck", "H2"),
		UI.label("Paste text or import a text file; it's split into items you can study. (To use a PDF, copy its text and paste it here.)", "Mute", true),
		UI.field("Deck title", title), UI.field("Text", text), UI.flow([file_btn]), UI.field("Split by", split)], 14)
	box.add_child(UI.flow([UI.button("Cancel", "ButtonGhost", App.close_modal), UI.button("Create deck", "ButtonPrimary", func():
		if title.text.strip_edges() == "":
			App.toast("Give the deck a title")
			return
		var items := TextChunker.chunk(text.text, UI.option_value(split)) if text.text.strip_edges() != "" else []
		var d := DB.new_deck(title.text.strip_edges(), source.name, items)
		App.close_modal()
		App.go("deck", { id = d.id })
		App.toast("Deck created empty: add items one by one" if items.is_empty() else "Pulled %s into \"%s\"" % [Util.plural(items.size(), "item"), d.title]))]))
	App.open_modal(box, true)
	title.grab_focus.call_deferred()


## items: [{text, source}] — choose a palace and how to place them.
static func send_to_palace_dialog(what: String, items: Array) -> void:
	if items.is_empty():
		App.toast("Nothing to send: mark a few items first")
		return
	if DB.data.palaces.is_empty():
		App.toast("Create a palace first")
		return
	var opts := []
	for p in DB.data.palaces:
		var empty: int = p.loci.size() - DB.filled_count(p)
		opts.append([("%s (3D castle — %d empty stations, filled in route order)" % [p.name, empty]) if DB.is_castle(p) else ("%s (%s)" % [p.name, Util.plural(p.loci.size(), "station")]), p.id])
	var palace := UI.option(opts, opts[0][1])
	var mode := UI.option([["Add as new stations at the end", "append"], ["Fill existing empty stations only", "fill"]], "append")
	var box := UI.vbox([UI.label("Send %s to a palace" % what, "H2", true), UI.label("Each item becomes its own station, in order.", "Mute"),
		UI.field("Palace", palace), UI.field("How", mode)], 14)
	box.add_child(UI.flow([UI.button("Cancel", "ButtonGhost", App.close_modal), UI.button("Send", "ButtonPrimary", func():
		var p = DB.find_palace(UI.option_value(palace))
		var placed := DB.place_items_in_palace(p, items, UI.option_value(mode))
		App.close_modal()
		if placed > 0:
			App.toast("Placed %s in %s" % [Util.plural(placed, "item"), p.name])
		elif DB.is_castle(p):
			App.toast("Every castle station is already holding something")
		else:
			App.toast("No empty stations available: try \"add as new stations\" instead"))]))
	App.open_modal(box)
