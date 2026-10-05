extends View
## The five Memory-League-style disciplines, unlocked by the lessons they need.


func open(new_args: Dictionary) -> void:
	super.open(new_args)
	if new_args.has("setup"):
		setup_dialog.call_deferred(new_args.setup)


func build() -> void:
	header("04 — TRAINING", "Drills", "Timed disciplines in the style of Memory League: memorise, then recall in order. Each one unlocks when you've learned the technique it needs.")
	var grid := UI.grid(300, 14)
	for key in Content.DISCIPLINE_ORDER:
		grid.add_child(_card(key))
	content.add_child(grid)


func _card(key: String) -> Control:
	var d: Dictionary = Content.disciplines[key]
	var best = DB.best_score_for(key)
	var icon := UI.label(d.icon, "MonoGold")
	icon.add_theme_font_size_override("font_size", 22)
	icon.add_theme_color_override("font_color", ThemeBuilder.BLUE)
	var card := UI.panel([icon, UI.label(d.label, "H2"), UI.label(d.desc, "Mute", true),
		UI.label("Best: %d/%d at level %d" % [best.correct, best.total, best.level] if best else "No attempts yet", "Mono")], "Card", 8)
	var b := UI.body(card)
	if key == "numbers":
		b.add_child(UI.flow([UI.button("Edit number words", "ButtonGhost", func(): App.go("numbers", { tab = "major" }), true)]))
	elif key == "cards":
		b.add_child(UI.flow([UI.button("Edit PAO table", "ButtonGhost", func(): App.go("numbers", { tab = "pao" }), true)]))
	var missing := DB.missing_prerequisites(key)
	if missing.is_empty():
		b.add_child(UI.flow([UI.button("Start", "ButtonPrimary", func(): setup_dialog(key))]))
	else:
		var names := " & ".join(missing.map(func(m): return "“%s”" % m.title))
		b.add_child(UI.panel([UI.label("Learn %s first" % names, "Gold", true)], "Inset", 4))
		b.add_child(UI.flow([UI.button("Go learn it", "ButtonPrimary", func(): App.go("learn", { lesson = missing[0].id }), true),
			UI.button("I already know this", "ButtonGhost", func():
				for id in Content.drill_prerequisites.get(key, []):
					if not DB.is_lesson_done(id):
						DB.data.learn.completed.append(id)
				DB.save("learn")
				App.toast("Unlocked: you can revisit those lessons anytime from the Learn tab")
				refresh(), true)]))
	return card


static func setup_dialog(key: String) -> void:
	var d: Dictionary = Content.disciplines[key]
	var levels := []
	for i in Content.levels.size():
		levels.append(["Level %d — %d %s" % [i + 1, DrillLogic.item_count(key, i), "cards" if key == "cards" else "items"], i])
	var level := UI.option(levels, 2)
	var time := UI.option([["30 seconds", 30], ["60 seconds", 60], ["2 minutes", 120], ["5 minutes", 300]], 60)
	var box := UI.vbox([UI.label(d.label, "H2"), UI.label(d.desc, "Mute", true), UI.field("Level (item count)", level), UI.field("Memorise time", time)], 14)
	box.add_child(UI.flow([UI.button("Cancel", "ButtonGhost", App.close_modal), UI.button("Start", "ButtonPrimary", func():
		App.close_modal()
		App.go("drill", { discipline = key, level = UI.option_value(level), time = UI.option_value(time) }))]))
	App.open_modal(box)
