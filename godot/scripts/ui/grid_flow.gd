class_name GridFlow
extends Container
## Lays children out in equal-width columns: as many as fit at `min_col_width`,
## so cards sit side by side on a desktop and stack on a phone.

var min_col_width := 320:
	set(v):
		min_col_width = v
		queue_sort()
var sep := 14:
	set(v):
		sep = v
		queue_sort()


func _init() -> void:
	size_flags_horizontal = SIZE_EXPAND_FILL


func columns() -> int:
	return max(1, int((size.x + sep) / (min_col_width + sep)))


func _notification(what: int) -> void:
	if what == NOTIFICATION_SORT_CHILDREN:
		_layout()


func _visible_children() -> Array:
	var out := []
	for c in get_children():
		if c is Control and c.visible and not c.top_level:
			out.append(c)
	return out


func _layout() -> void:
	var kids := _visible_children()
	var cols: int = clampi(columns(), 1, max(kids.size(), 1))
	var w: float = (size.x - sep * (cols - 1)) / cols
	var y := 0.0
	var i := 0
	while i < kids.size():
		var row_h := 0.0
		for j in cols:
			if i + j < kids.size():
				row_h = max(row_h, kids[i + j].get_combined_minimum_size().y)
		for j in cols:
			if i + j < kids.size():
				fit_child_in_rect(kids[i + j], Rect2(j * (w + sep), y, w, row_h))
		y += row_h + sep
		i += cols
	var h: float = max(y - sep, 0.0)
	if absf(custom_minimum_size.y - h) > 0.5:
		custom_minimum_size.y = h


func _get_minimum_size() -> Vector2:
	return Vector2(min(min_col_width, 260), custom_minimum_size.y)
