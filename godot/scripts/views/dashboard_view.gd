extends View
## Overview: progress, what's due for review today, recent sessions, best scores.


func build() -> void:
	header("TODAY", "Dashboard", "Your memory practice at a glance: what's due, how you're progressing, and your best scores.")
	var d := DB.data
	var total_loci := 0
	var filled := 0
	for p in d.palaces:
		total_loci += p.loci.size()
		filled += DB.filled_count(p)
	var items := 0
	for deck in d.decks:
		items += deck.items.size()
	var streak := DB.compute_streak()
	var stats := UI.grid(200, 12)
	stats.add_child(UI.stat("Curriculum", "%d/%d" % [d.learn.completed.size(), Content.all_lessons().size()], "lessons learned"))
	stats.add_child(UI.stat("Palaces", str(d.palaces.size()), "%d/%d stations filled" % [filled, total_loci]))
	stats.add_child(UI.stat("Library items", str(items), Util.plural(d.decks.size(), "deck")))
	stats.add_child(UI.stat("Practice streak", str(streak), "day in a row" if streak == 1 else "days in a row"))
	content.add_child(stats)

	_due_card()
	_backup_reminder()

	var lower := UI.grid(340, 16)
	var recent := UI.vbox([UI.label("Recent sessions", "H3")], 12)
	if d.history.is_empty():
		recent.add_child(UI.empty("No sessions logged yet. Walk a palace or run a drill to begin."))
	else:
		var list := UI.panel([], "CardFlat", 0)
		for h in d.history.slice(0, 6):
			UI.body(list).add_child(HistoryView.row(h))
		recent.add_child(list)
	lower.add_child(recent)
	var best := UI.panel([UI.label("Best by discipline", "H3")], "Card", 6)
	for key in Content.DISCIPLINE_ORDER:
		var b = DB.best_score_for(key)
		var score := UI.label("%d/%d" % [b.correct, b.total] if b else "—", "MonoGold" if b else "Mono")
		UI.body(best).add_child(UI.hbox([UI.label(Content.disciplines[key].label, "Dim"), UI.expand(), score]))
	lower.add_child(best)
	content.add_child(lower)


## Every palace and deck with memories due today, each with a one-tap review.
func _due_card() -> void:
	var rows := []
	for p in DB.data.palaces:
		var n := DB.due_loci(p).size()
		if n > 0:
			rows.append([p.name, "palace", n, func(): App.go("palace", { id = p.id, walk = "due" })])
	for deck in DB.data.decks:
		var n := DB.due_items(deck).size()
		if n > 0:
			rows.append([deck.title, "deck", n, func(): App.go("deck", { id = deck.id, practice = "due" })])
	if rows.is_empty():
		if DB.total_due() == 0 and (not DB.data.palaces.is_empty() or not DB.data.decks.is_empty()):
			content.add_child(UI.panel([UI.label("Nothing due today", "H3"),
				UI.label("Every memory is scheduled for later. Each one comes back just before you'd be likely to forget it.", "Mute", true)], "Card", 6))
		return
	var total := 0
	for r in rows:
		total += r[2]
	var card := UI.panel([UI.label("Due for review — %s" % Util.plural(total, "memory", "memories"), "H3"),
		UI.label("Reviewing just before you'd forget is what moves a memory into long-term storage.", "Mute", true)], "CardGold", 10)
	for r in rows:
		var row := UI.hbox([UI.label(r[0], "", true), UI.pill(r[1]), UI.pill("%d due" % r[2], "PillGold"),
			UI.button("Review now", "ButtonGold", r[3], true)], 10)
		UI.body(card).add_child(row)
	content.add_child(card)


func _backup_reminder() -> void:
	var d := DB.data
	if d.palaces.is_empty() and d.decks.is_empty():
		return
	var last: float = d.settings.get("lastBackupAt", 0.0)
	var days := (Util.now_ms() - last) / 86400000.0
	if last > 0.0 and days < 14.0:
		return
	var msg := "You've never saved a backup file." if last == 0.0 else "Your last backup file is %d days old." % int(days)
	content.add_child(UI.panel([UI.label("Keep your memories safe", "H3"),
		UI.label(msg + " The app keeps daily copies on this device, but a backup file also survives losing or replacing the device.", "Mute", true),
		UI.flow([UI.button("Back up now", "ButtonGold", func(): App.go("backup"), true)])], "Card", 8))
