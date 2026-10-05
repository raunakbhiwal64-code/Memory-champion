extends View
## All palaces, with the 3D castle featured at the top.


func build() -> void:
	header("02 — METHOD OF LOCI", "Palaces", "Buildings you know by heart. Each one holds a sequence of stations you can fill with anything you need to remember.",
		[UI.button("+ New palace", "ButtonPrimary", new_palace_dialog)])
	tip("l2-1", "New to memory palaces? This lesson covers how to pick a route and why it works, before you build one.")
	content.add_child(_castle_card())
	if DB.data.palaces.is_empty():
		content.add_child(UI.empty("No palaces yet. A palace is a route through a place you know well, broken into stations you can hang things on.", "+ New palace", new_palace_dialog))
		return
	var grid := UI.grid(330, 14)
	for p in DB.data.palaces:
		grid.add_child(_card(p))
	content.add_child(grid)


func _castle_card() -> Control:
	var castles: Array = DB.data.palaces.filter(func(x): return DB.is_castle(x))
	var filled := 0
	for c in castles:
		filled += DB.filled_count(c)
	var text := UI.vbox([UI.label("3D PALACE", "Eyebrow"), UI.label(Content.castle.name, "H2"),
		UI.label("Walk a hooded keeper, lantern in hand, through a castle of eight rooms: a rain-swept courtyard, a firelit great hall, a two-storey library, an alchemist's cellar, an observatory open to the stars and more. Leave a memory at each of 40 stations, then walk the same route to recall them.", "Dim", true)], 6)
	if not castles.is_empty():
		text.add_child(UI.label("%s · %s placed" % [Util.plural(castles.size(), "castle palace"), Util.plural(filled, "memory", "memories")], "Mono"))
	text.custom_minimum_size.x = 280
	text.size_flags_horizontal = SIZE_EXPAND_FILL
	var btn := UI.button("Enter the castle" if not castles.is_empty() else "Build your castle", "ButtonGold", func():
		App.go("palace", { id = DB.open_or_create_castle().id, castle = "study" }))
	btn.size_flags_vertical = SIZE_SHRINK_CENTER
	return UI.panel([UI.flow([text, btn], 16)], "CardGold")


func _card(p: Dictionary) -> Control:
	var st := DB.palace_status(p)
	var pills := UI.flow([UI.pill(("3D castle · " if DB.is_castle(p) else "") + Util.plural(p.loci.size(), "station"), "PillBlue"),
		UI.pill(st.text, "PillGold" if st.due else "Pill")], 6)
	var card := UI.panel([pills, UI.label(p.name, "H2", true), UI.label(p.description if p.description != "" else "No description", "Mute", true)], "Card", 8)
	var foot := UI.hbox([UI.label("%d/%d stations filled" % [DB.filled_count(p), p.loci.size()], "Mono"), UI.expand()])
	if st.due:
		foot.add_child(UI.button("Review due", "ButtonGold", func(): App.go("palace", { id = p.id, walk = "due" }), true))
	elif DB.is_castle(p):
		foot.add_child(UI.button("Enter castle", "ButtonGold", func(): App.go("palace", { id = p.id, castle = "study" }), true))
	UI.body(card).add_child(foot)
	return clickable(card, func(): App.go("palace", { id = p.id }))


static func new_palace_dialog() -> void:
	var kind := UI.option([["A real place you know (you list the stations)", "list"], ["The 3D castle (40 stations, walk it in 3D)", "castle"]], "list")
	var name := UI.line_edit("", "e.g. Childhood home, my walk to work")
	var desc := UI.text_edit("", "Any notes on the route or layout", Callable(), 60)
	var box := UI.vbox([UI.label("New palace", "H2"), UI.label("Base it on somewhere you can walk through with your eyes closed.", "Mute", true),
		UI.field("Type", kind), UI.field("Name", name), UI.field("Description (optional)", desc)], 14)
	box.add_child(UI.flow([UI.button("Cancel", "ButtonGhost", App.close_modal), UI.button("Create palace", "ButtonPrimary", func():
		var castle: bool = UI.option_value(kind) == "castle"
		if name.text.strip_edges() == "" and not castle:
			App.toast("Give the palace a name")
			return
		App.close_modal()
		if castle:
			var c := DB.new_castle_palace(name.text.strip_edges(), desc.text.strip_edges())
			App.go("palace", { id = c.id, castle = "study" })
		else:
			var p := DB.new_palace(name.text.strip_edges(), desc.text.strip_edges())
			App.go("palace", { id = p.id }))]))
	App.open_modal(box)
	name.grab_focus.call_deferred()
