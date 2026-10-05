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
		App.go(parts[0], args)
		for i in 6:
			await get_tree().process_frame
		get_viewport().get_texture().get_image().save_png(out_dir.path_join(parts[0] + ".png"))
		print("shot ", parts[0])
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
