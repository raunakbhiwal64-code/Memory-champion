extends Node
## Headless test suite. Run from the repo root:
##   godot --headless --path godot res://tests/test_runner.tscn
## Exits with code 0 when every check passes, 1 otherwise.

var passed := 0
var failed := 0
var tests: Array = []


func check(label: String, cond: bool) -> void:
	if cond:
		passed += 1
	else:
		failed += 1
		print("FAIL ", label)


func _ready() -> void:
	# keep the real save file untouched: tests write to a scratch folder
	DB.dir = "user://test-%d" % Time.get_ticks_usec()
	DB.load_db()
	var files := []
	for f in DirAccess.get_files_at("res://tests"):
		if f.begins_with("test_") and f.ends_with(".gd") and f != "test_runner.gd":
			files.append(f)
	files.sort()
	# never hang CI: a script error inside a suite would otherwise stop us reaching quit()
	get_tree().create_timer(600.0).timeout.connect(func():
		print("TIMEOUT: test run took too long")
		get_tree().quit(1))
	for f in files:
		var script = load("res://tests/" + f)
		if script == null or not script.can_instantiate():
			check("%s compiles" % f, false)
			continue
		var suite = script.new()
		print("=== ", f)
		var before := failed
		await suite.run(self)
		if failed == before:
			print("    ok")
		if suite is Node:
			suite.queue_free()
	_cleanup(DB.dir)
	print("\n%d passed, %d failed" % [passed, failed])
	get_tree().quit(1 if failed else 0)


func _cleanup(path: String) -> void:
	for sub in DirAccess.get_directories_at(path):
		_cleanup(path.path_join(sub))
	for f in DirAccess.get_files_at(path):
		DirAccess.remove_absolute(path.path_join(f))
	DirAccess.remove_absolute(path)


## Fresh, empty data for a test.
func reset_db() -> void:
	DB.data = Backup.empty_data()
	DB.save("all")
