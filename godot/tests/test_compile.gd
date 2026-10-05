extends RefCounted
## Every script in the project compiles.

func run(t) -> void:
	for path in _scripts("res://scripts") + _scripts("res://tools"):
		var s = load(path)
		t.check("%s compiles" % path, s != null and s.can_instantiate())


func _scripts(dir: String) -> Array:
	var out := []
	for f in DirAccess.get_files_at(dir):
		if f.ends_with(".gd"):
			out.append(dir.path_join(f))
	for d in DirAccess.get_directories_at(dir):
		out.append_array(_scripts(dir.path_join(d)))
	return out
