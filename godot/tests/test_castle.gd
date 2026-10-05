extends RefCounted
## The 3D castle: it builds, you can walk, doors open, stations take memories,
## and a recall walk grades and schedules them, all through the real app.

var t
var main


func press(text: String) -> bool:
	var b := _find(main.modal_scroll if main.modal_open() else main, text)
	if b == null:
		t.check("button '%s' exists" % text, false)
		return false
	b.pressed.emit()
	return true


func _find(root: Node, text: String) -> Button:
	if root is Button and root.text == text and root.is_visible_in_tree() and not root.disabled:
		return root
	for c in root.get_children():
		var b := _find(c, text)
		if b:
			return b
	return null


func frames(n: int = 2) -> void:
	for i in n:
		await t.get_tree().process_frame


func run(runner):
	t = runner
	t.reset_db()
	main = App.main
	if main == null:
		main = load("res://scenes/main.tscn").instantiate()
		t.add_child(main)
		await frames()
	var src := ""
	for f in ["props.gd", "decor.gd", "architecture.gd"]:
		src += FileAccess.get_file_as_string("res://scripts/castle/" + f)
	src += JSON.stringify(Content.castle)
	t.check("only original props and names", RegEx.create_from_string("hat\\(\\)|brooms|hourglasses|owl|Potions|Astronomy").search(src) == null)
	var p := DB.open_or_create_castle()
	DB.place_items_in_palace(p, [{ text = "Memento mori", source = "Stoics" }, { text = "Amor fati", source = "Stoics" }], "fill")

	var t0 := Time.get_ticks_msec()
	main.open_castle(p.id, "study")
	var castle: Castle = main.castle
	if castle and not castle.is_built:
		await castle.built
	await frames(2)
	t.check("castle opens", castle != null and castle.is_inside_tree())
	if castle == null:
		return true
	print("    built in %d ms" % (Time.get_ticks_msec() - t0))
	t.check("40 stations", castle.stations.views.size() == 40)
	t.check("app chrome hidden behind the castle", not main._chrome[1].visible)
	t.check("hud shown", castle.hud.is_inside_tree() and castle.hud.room_label.text != "")
	t.check("starts in the courtyard", castle.current_room == "courtyard")
	t.check("rooms out of sight are culled", castle.state().hidden_rooms > 0)
	t.check("lights were built", Geo.lights.size() > 20)

	# walking: forward from the gate moves you, walls stop you
	var before := castle.player.position
	for i in 20:
		castle.player.move(0.05, 1.0, 0.0, 0.0, false)
	t.check("walking moves the keeper", castle.player.position.distance_to(before) > 1.0)
	for i in 400:
		castle.player.move(0.05, 1.0, 0.3, 0.0, true)
	t.check("walls hold", CastlePlayer.walkable(castle.player.position.x, castle.player.position.z))

	# doors swing open as you approach
	var d: Dictionary = castle.doors.doors[0]
	castle.player.place_at(d.root.position.x + 1.5, d.root.position.z + 1.5, 0.0)
	for i in 30:
		castle.doors.update(castle.player.position, 0.1)
	t.check("a door opens when you walk up", castle.doors.states()[0].open > 0.95)

	# leave a memory at an empty station
	castle.teleport_to(5)
	await frames()
	t.check("standing on station 6", castle.near == 5)
	castle.interact()
	await frames()
	t.check("station panel opens", main.modal_open() and castle.panel == 5)
	var ta: TextEdit = main.modal_scroll.find_children("*", "TextEdit", true, false)[0]
	ta.text = "Carpe diem"
	press("Save memory")
	await frames()
	t.check("memory saved at the station", DB.is_locus_filled(p.loci[5]) and p.loci[5].content.text == "Carpe diem")
	t.check("panel closed", not main.modal_open() and castle.panel == -1)
	t.check("its card shows above the object", castle.stations.views[5].card.visible)

	# a recall walk visits the three filled stations in order
	t.check("recall walk starts", castle.start_recall(false))
	t.check("first target is station 1", castle.target_index() == 0)
	var grades := ["Got it", "Missed it", "Easy"]
	for k in 3:
		var target := castle.target_index()
		castle.teleport_to(target)
		await frames()
		castle.interact()
		await frames()
		t.check("recall panel %d opens" % k, main.modal_open())
		press("Reveal")
		await frames()
		press(grades[k])
		await frames()
	t.check("walk complete", castle.state().recall.pos == 3)
	t.check("summary shown", main.modal_open() and castle.panel == -2)
	t.check("reviews scheduled", p.loci[0].review != null and p.loci[1].review != null and p.loci[5].review != null)
	t.check("walk logged", DB.data.history[0].type == "palace-walk" and DB.data.history[0].correct == 2 and DB.data.history[0].total == 3)

	press("Exit castle")
	await frames()
	t.check("exit returns to the app", main.castle == null and main._chrome[1].visible)
	return true
