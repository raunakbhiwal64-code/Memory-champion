extends View
## The curriculum: 6 levels, 18 lessons, each with "mark as learned" and a
## button that takes you straight to the tool it teaches.

var expanded := {}


func open(new_args: Dictionary) -> void:
	if new_args.has("lesson"):
		expanded[new_args.lesson] = true
	super.open(new_args)
	if new_args.has("lesson"):
		_scroll_to(new_args.lesson)


func build() -> void:
	header("01 — FOUNDATIONS", "Learn", "A step-by-step curriculum, mostly from Kevin Horsley's Unlimited Memory. Lessons marked 'general technique' fill gaps his book doesn't cover, and say so.")
	for level in Content.curriculum:
		var done := 0
		for l in level.lessons:
			if DB.is_lesson_done(l.id):
				done += 1
		var head := UI.hbox([UI.label("Level %d — %s" % [level.levelNum, level.levelTitle], "H3", true),
			UI.label("%d/%d learned" % [done, level.lessons.size()], "MonoGold" if done == level.lessons.size() else "Mono")])
		var col := UI.vbox([head], 8)
		for l in level.lessons:
			col.add_child(_lesson(l))
		content.add_child(col)


func _lesson(l: Dictionary) -> Control:
	var done := DB.is_lesson_done(l.id)
	var open_now: bool = expanded.get(l.id, false)
	var p := UI.panel([], "CardGold" if open_now else "Card", 12)
	p.name = "lesson-" + l.id
	var title := UI.button(("▾  " if open_now else "▸  ") + l.title, "ButtonLink", func():
		expanded[l.id] = not open_now
		refresh())
	title.alignment = HORIZONTAL_ALIGNMENT_LEFT
	title.add_theme_color_override("font_color", ThemeBuilder.INK)
	title.add_theme_font_size_override("font_size", 15)
	title.size_flags_horizontal = SIZE_EXPAND_FILL
	title.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	var status := UI.pill("✓ learned" if done else ("general technique" if l.gap else "not started"), "PillGold" if done else "Pill")
	UI.body(p).add_child(UI.hbox([title, status]))
	if open_now:
		UI.body(p).add_child(UI.pill("General technique — not from Horsley's book" if l.gap else "Kevin Horsley — Unlimited Memory", "PillRed" if l.gap else "PillBlue"))
		UI.body(p).add_child(UI.rich(l.body, true))
		var actions := UI.flow([UI.button("Mark as not yet learned" if done else "Mark as learned", "ButtonGhost" if done else "ButtonGold", func():
			DB.toggle_lesson(l.id)
			refresh(), true)])
		if l.tryAction:
			actions.add_child(UI.button(l.tryLabel if l.tryLabel else "Try it now", "ButtonPrimary", func(): run_try_action(l.tryAction), true))
		if l.secondaryAction:
			actions.add_child(UI.button(l.secondaryLabel if l.secondaryLabel else "Open", "ButtonGhost", func(): run_try_action(l.secondaryAction), true))
		UI.body(p).add_child(actions)
	return p


func _scroll_to(id: String) -> void:
	await get_tree().process_frame
	await get_tree().process_frame
	var node := content.find_child("lesson-" + id, true, false)
	if node:
		ensure_control_visible(node)


static func run_try_action(action: String) -> void:
	match action:
		"goto-palaces":
			App.go("palaces")
		"goto-library":
			App.go("library")
		"goto-castle":
			App.go("palace", { id = DB.open_or_create_castle().id, castle = "study" })
		"goto-numbersystem":
			App.go("numbers", { tab = "major" })
		"goto-pao":
			App.go("numbers", { tab = "pao" })
		_:
			if action.begins_with("drill:"):
				App.go("drills", { setup = action.split(":")[1] })
