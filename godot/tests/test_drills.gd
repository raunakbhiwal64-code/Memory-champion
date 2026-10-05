extends RefCounted
## Drills and number systems, played through the real screens.

var t
var main


func frame() -> void:
	await t.get_tree().process_frame
	await t.get_tree().process_frame


func press(text: String) -> bool:
	var root: Node = main.modal_scroll if main.modal_open() else main
	for b in root.find_children("*", "Button", true, false):
		if b.text == text and b.is_visible_in_tree() and not b.disabled:
			b.pressed.emit()
			return true
	t.check("button '%s' exists" % text, false)
	return false


func run(runner):
	t = runner
	t.reset_db()
	main = App.main
	if main == null:
		main = load("res://scenes/main.tscn").instantiate()
		t.add_child(main)
		await frame()

	App.go("drills")
	await frame()
	t.check("drills start locked until their lesson is learned", main.views.drills.content.find_children("*", "Button", true, false).any(func(b): return b.text == "Go learn it"))
	press("I already know this")
	await frame()
	App.go("drills", { setup = "numbers" })
	await frame()
	t.check("Run again / setup opens the level picker", main.modal_open())
	press("Start")
	await frame()
	var v = main.views.drill
	t.check("level 3 numbers shows 16 digits", main.current == "drill" and v.items.size() == 16)
	press("I'm ready — start recall")
	await frame()
	t.check("recall has one box per digit", v.inputs.size() == 16)
	for i in 16:
		v.inputs[i].text = v.items[i] if i != 5 else str((int(v.items[i]) + 1) % 10)
	press("Submit & score")
	await frame()
	t.check("numbers are scored with the opening run", v.result.correct == 15 and v.result.run == 5)
	t.check("the drill is logged", DB.data.history[0].type == "drill" and DB.data.history[0].correct == 15 and DB.data.history[0].level == 3)

	for disc in ["words", "cards", "names", "images"]:
		App.go("drill", { discipline = disc, level = 0, time = 30, seed = 7 })
		await frame()
		v.start_recall()
		await frame()
		match disc:
			"words":
				for i in v.items.size():
					v.inputs[i].text = str(v.items[i]).to_upper()
			"cards":
				for i in v.items.size():
					var c: Dictionary = v.items[i]
					v.inputs[i].text = (("t" if c.rank == "10" else c.rank) + c.suit).to_lower()
			"names":
				for i in v.items.size():
					v.inputs[i].text = v.items[i].name
			"images":
				v.click_order = range(v.items.size())
		v.submit()
		await frame()
		t.check("%s: a perfect recall scores %d/%d" % [disc, v.items.size(), v.items.size()], v.result.correct == v.items.size())
	t.check("best score shows on the drills tab", DB.best_score_for("words").correct == 8)

	App.go("drill", { discipline = "words", level = 0, time = 30 })
	await frame()
	v.time_left = 0.01
	v._process(0.1)
	await frame()
	t.check("the clock running out moves on to recall", v.phase == "recall")

	# ---- number systems ----
	App.go("numbers", { tab = "major" })
	await frame()
	var nv = main.views.numbers
	var row07: LineEdit = nv.content.find_children("*", "LineEdit", true, false).filter(func(e): return e.placeholder_text == "sack")[0]
	row07.text = "sock"
	row07.text_submitted.emit("sock")
	t.check("a Major System word can be replaced", DB.major_word("07") == "sock")
	var search: LineEdit = nv.content.find_children("*", "LineEdit", true, false)[0]
	search.text = "sock"
	search.text_changed.emit("sock")
	await frame()
	t.check("filtering finds your own words", nv.grid_host.find_children("*", "LineEdit", true, false).size() == 1)
	press("PAO (Person-Action-Object)")
	await frame()
	t.check("switching to PAO remembers the choice", DB.data.numberSystemPref == "pao" and nv.tab == "pao")
	var p12: Array = nv.content.find_children("*", "LineEdit", true, false).filter(func(e): return e.placeholder_text in ["Person", "Action", "Object"]).slice(36, 39)
	for i in 3:
		p12[i].text = ["Tina", "dances", "tuba"][i]
		p12[i].text_submitted.emit(p12[i].text)
	t.check("a PAO row is saved and counts as built", DB.data.pao.entries["12"].object == "tuba" and DB.pao_complete_count() == 1)
	return true
