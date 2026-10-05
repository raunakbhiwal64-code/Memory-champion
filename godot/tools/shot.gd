extends Node
## Takes screenshots of app screens for review:
##   godot --path godot --scene res://tools/shot.tscn -- out_dir view1,view2 [WxH]
## Runs the real main scene, visits each view and saves PNGs.

func _ready() -> void:
	var argv := OS.get_cmdline_user_args()
	var out_dir: String = argv[0] if argv.size() > 0 else "user://shots"
	var names: PackedStringArray = (argv[1] if argv.size() > 1 else "dashboard,learn,history,backup").split(";")
	if argv.size() > 2:
		var wh := argv[2].split("x")
		get_window().size = Vector2i(int(wh[0]), int(wh[1]))
	DirAccess.make_dir_recursive_absolute(out_dir)
	var main = load("res://scenes/main.tscn").instantiate()
	get_tree().root.add_child.call_deferred(main)
	await get_tree().create_timer(0.5).timeout
	for n in names:
		if n == "seed":
			_seed()
			continue
		var parts := n.split(":", true, 1)
		var args := {}
		if parts.size() > 1:
			args = JSON.parse_string(parts[1].replace("'", "\""))
		var file: String = args.get("name", parts[0])
		if parts[0] == "castle":
			await _castle(args)
		else:
			App.go(parts[0], args)
			for i in 6:
				await get_tree().process_frame
		get_viewport().get_texture().get_image().save_png(out_dir.path_join(file + ".png"))
		print("shot ", file)
	get_tree().quit()


## Sample data so screens have something to show.
func _seed() -> void:
	DB.data = Backup.empty_data()
	var p := DB.new_palace("Childhood home", "From the front gate to the back garden")
	for pair in [["Front gate", "A giant 7 swinging on the gate"], ["Front door", "Mirror shows a lion roaring"], ["Hallway", ""], ["Kitchen", "Grandma juggling three suns"]]:
		var l := DB.new_locus(pair[0])
		if pair[1] != "":
			l.content = { text = pair[1], source = null }
		p.loci.append(l)
	DB.finish_palace_walk(p, [p.loci[0]], [Fsrs.GOOD])
	var c := DB.open_or_create_castle()
	DB.place_items_in_palace(c, [{ text = "The obstacle is the way", source = "Stoics" }, { text = "Memento mori", source = "Stoics" }], "fill")
	var d := DB.new_deck("Stoics", "meditations.txt", ["The obstacle is the way.", "Memento mori.", "You have power over your mind, not outside events."])
	d.items[0].marked = true
	DB.toggle_lesson("l1-1")
	DB.log_history({ type = "drill", discipline = "numbers", label = "Numbers", level = 3, correct = 14, total = 16, accuracy = 88 })
	DB.save("all")


## castle:{name, mode, at (station index), x, z, yaw, cam_yaw, pitch, dist, quality, map, panel, frames}
func _castle(args: Dictionary) -> void:
	var main = App.main
	if main.castle == null:
		main.open_castle(DB.open_or_create_castle().id, args.get("mode", "study"))
		await main.castle.built
	var c: Castle = main.castle
	App.close_modal()
	if args.has("quality"):
		c.set_quality(args.quality, false)
	if args.has("at"):
		c.teleport_to(int(args.at))
	if args.has("x"):
		c.player.place_at(float(args.x), float(args.z), float(args.get("yaw", 0.0)))
	if args.has("cam_yaw"):
		c.player.cam_yaw = float(args.cam_yaw)
	if args.has("pitch"):
		c.player.cam_pitch = float(args.pitch)
	if args.has("dist"):
		c.player.cam_dist = float(args.dist)
		c.player.cur_dist = float(args.dist)
	if args.get("map", false) and not c.hud.map.big:
		c.hud.map.toggle()
	if not args.get("map", false) and c.hud.map.big:
		c.hud.map.toggle()
	var t0 := Time.get_ticks_msec()
	for i in int(args.get("frames", 60)):
		await get_tree().process_frame
	print("frames took %d ms" % (Time.get_ticks_msec() - t0))
	if args.get("panel", false):
		c.interact()
		for i in 4:
			await get_tree().process_frame
	print(JSON.stringify(c.state()))
