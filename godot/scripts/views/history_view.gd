class_name HistoryView
extends View
## Every logged session: drills, palace walks and library recall.


func build() -> void:
	header("RECORD", "History", "Every drill, palace walk and library recall you've finished.", [
		UI.button("Export backup", "ButtonGold", func(): App.go("backup"), true),
		UI.button("Clear log", "ButtonGhost", _clear, true)])
	if DB.data.history.is_empty():
		content.add_child(UI.empty("No sessions logged yet."))
		return
	var list := UI.panel([], "CardFlat", 0)
	for h in DB.data.history.slice(0, 300):
		UI.body(list).add_child(row(h))
	content.add_child(list)


func _clear() -> void:
	App.confirm("Clear your entire training history? Your palaces, memories and their review schedules stay; only this log is erased.", "Clear history", func():
		DB.data.history = []
		DB.save("history")
		refresh())


static func describe(h: Dictionary) -> String:
	match h.type:
		"drill":
			return "%s — Level %d" % [Content.disciplines.get(h.get("discipline", ""), {}).get("label", "Drill"), int(h.get("level", 0))]
		"palace-walk":
			return "Palace walk — " + str(h.get("label", ""))
		"deck-recall":
			return "Library recall — " + str(h.get("label", ""))
	return str(h.get("label", h.type))


static func row(h: Dictionary) -> Control:
	var left := UI.vbox([UI.label(describe(h), "", true), UI.label(Util.date_label(float(h.ts)), "Mono")], 2)
	left.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var p := PanelContainer.new()
	p.theme_type_variation = "Row"
	p.add_child(UI.hbox([left, UI.label("%d/%d" % [int(h.get("correct", 0)), int(h.get("total", 0))], "MonoGold")]))
	var wrap := UI.vbox([p, UI.sep()], 0)
	return wrap
