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
