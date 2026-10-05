class_name DeckView
extends View
## One deck: its items (editable, starrable), practice and review.

var deck: Dictionary = {}
var marked_only := false


func open(new_args: Dictionary) -> void:
	var d = DB.find_deck(new_args.get("id", ""))
	if d == null:
		App.go("library")
		return
	if d != deck:
		marked_only = false
	deck = d
	super.open(new_args)
	if new_args.get("practice", "") == "due":
		_practise_due.call_deferred()


func build() -> void:
	var due := DB.due_items(deck).size()
	var actions := []
	if due > 0:
		actions.append(UI.button("Review %d due" % due, "ButtonGold", _practise_due))
	actions.append(UI.button("Practise all", "ButtonPrimary", func(): practise(deck.title, deck.items.filter(func(it): return str(it.text).strip_edges() != ""))))
	actions.append(UI.button("Send to palace", "ButtonGhost", _send))
	content.add_child(back_button("Library", "library"))
	header("DECK", deck.title, "From " + deck.sourceName if deck.sourceName != "" else "Typed or pasted in", actions)
	var marked: int = deck.items.filter(func(it): return it.get("marked", false)).size()
	if not deck.items.is_empty():
		content.add_child(UI.flow([UI.button("★ %d marked to learn%s" % [marked, " — showing only these" if marked_only else ""], "ButtonGold" if marked_only else "ButtonGhost", func():
			marked_only = not marked_only
			refresh(), true), UI.pill(DB.deck_status(deck).text, "PillGold" if due else "Pill")], 10))
	var shown: Array = deck.items.filter(func(it): return it.get("marked", false)) if marked_only else deck.items
	if deck.items.is_empty():
		content.add_child(UI.empty("No items yet. Add them one by one."))
	elif shown.is_empty():
		content.add_child(UI.empty("Nothing marked yet in this deck: tap the star on any item to flag it."))
	for it in shown:
		content.add_child(_item(it))
	content.add_child(UI.flow([UI.button("+ Add item", "ButtonPrimary", func():
		deck.items.append({ id = Util.uid(), text = "", marked = false, review = null })
		marked_only = false
		DB.save("decks")
		refresh()), UI.button("Delete deck", "ButtonDanger", _delete)]))


func _item(it: Dictionary) -> Control:
	var i: int = deck.items.find(it)
	var star := UI.button("★" if it.get("marked", false) else "☆", "ButtonGhost", func():
		it.marked = not it.get("marked", false)
		DB.save("decks")
		refresh(), true)
	star.add_theme_color_override("font_color", ThemeBuilder.GOLD if it.get("marked", false) else ThemeBuilder.INK_MUTE)
	star.tooltip_text = "Unmark" if it.get("marked", false) else "Mark to learn"
	var text := UI.text_edit(it.text, "Item text", func(t):
		if t.strip_edges() != str(it.text).strip_edges():
			it.text = t.strip_edges()
			it.review = null
			DB.save("decks"), 50)
	var col := UI.vbox([text], 8)
	col.size_flags_horizontal = SIZE_EXPAND_FILL
	var meta := UI.flow([], 8)
	if str(it.text).strip_edges() != "":
		var r = it.get("review")
		meta.add_child(UI.pill("new" if r == null else ("due" if Fsrs.is_due(r) else "next review " + Util.due_label(r.due)), "PillGold" if Fsrs.is_due(r) else "Pill"))
	col.add_child(meta)
	for s in it.get("suggestions", []):
		col.add_child(UI.panel([UI.label("Image idea: " + str(s), "Dim", true)], "Inset", 4))
	var num := UI.label(str(i + 1), "Mono")
	num.custom_minimum_size.x = 22
	return UI.panel([UI.hbox([star, num, col, UI.button("✕", "ButtonDanger", func():
		deck.items.erase(it)
		DB.save("decks")
		refresh(), true)], 12)], "CardGold" if it.get("marked", false) else "Card")


func _send() -> void:
	var marked: Array = deck.items.filter(func(it): return it.get("marked", false))
	var use: Array = marked if not marked.is_empty() and marked_only else deck.items.filter(func(it): return str(it.text).strip_edges() != "")
	LibraryView.send_to_palace_dialog("\"%s\"" % deck.title, use.map(func(it): return { text = it.text, source = deck.title }))


func _practise_due() -> void:
	var due := DB.due_items(deck)
	if due.is_empty():
		App.toast("Nothing is due in this deck right now")
		return
	practise(deck.title, due)


func _delete() -> void:
	App.confirm("Delete \"%s\"? (Today's snapshot under Backup still has it.)" % deck.title, "Delete deck", func():
		DB.data.decks.erase(deck)
		DB.save("decks")
		App.go("library"))


## Study the list, then recall it item by item and grade each one.
static func practise(title: String, items: Array) -> void:
	if items.is_empty():
		App.toast("Add items first")
		return
	var list := UI.vbox([], 0)
	for i in items.size():
		var row := PanelContainer.new()
		row.theme_type_variation = "Row"
		row.add_child(UI.hbox([UI.label(str(i + 1), "Mono"), UI.label(items[i].text, "", true)]))
		list.add_child(row)
		list.add_child(UI.sep())
	var box := UI.vbox([UI.label("STUDY — %s" % Util.plural(items.size(), "ITEM", "ITEMS"), "StatLabel"), UI.label(title, "H2", true),
		UI.panel([list], "CardFlat", 0)], 12)
	box.add_child(UI.hbox([UI.button("Exit", "ButtonGhost", App.close_modal, true), UI.expand(), UI.button("Start recall →", "ButtonPrimary", func():
		var entries := []
		for i in items.size():
			entries.append({ heading = "Item %d of %d" % [i + 1, items.size()], cue = title, text = items[i].text })
		RecallSession.start("Recall", entries, func(grades):
			DB.finish_deck_practice(title, items, grades)
			App.refresh()), true)]))
	App.open_modal(box, true)
