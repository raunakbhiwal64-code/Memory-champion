class_name DrillTiles
## Pictures for the Images and Names & Faces drills, drawn from a seed so they
## need no files or network: abstract shape compositions, and simple faces.

const PALETTE := [Color("#6cabd6"), Color("#cda13a"), Color("#d3766a"), Color("#82b98d"), Color("#9a8fc9"), Color("#e0a75e")]


class Abstract extends Control:
	var seed_value := 0
	var badge := ""

	func _init(s: int = 0) -> void:
		seed_value = s
		custom_minimum_size = Vector2(90, 90)

	func _draw() -> void:
		var r := RandomNumberGenerator.new()
		r.seed = seed_value
		var s: float = min(size.x, size.y)
		var o := (size - Vector2(s, s)) / 2.0
		draw_rect(Rect2(o, Vector2(s, s)), Color("#20232d"))
		var k := s / 100.0
		for i in 3 + r.randi_range(0, 2):
			var kind := r.randf()
			var c := o + Vector2(15 + r.randf() * 70, 15 + r.randf() * 70) * k
			var rad := (8 + r.randf() * 18) * k
			var col: Color = PALETTE[r.randi_range(0, PALETTE.size() - 1)]
			col.a = 0.88
			var rot := r.randf() * TAU
			if kind < 0.34:
				draw_circle(c, rad, col)
			elif kind < 0.67:
				var pts := PackedVector2Array()
				for a in [0.25, 0.75, 1.25, 1.75]:
					pts.append(c + Vector2(cos(a * PI + rot), sin(a * PI + rot)) * rad * 1.414)
				draw_colored_polygon(pts, col)
			else:
				var pts := PackedVector2Array()
				for a in [-0.5, 0.1667, 0.8333]:
					pts.append(c + Vector2(cos(a * PI + rot), sin(a * PI + rot)) * rad * 1.2)
				draw_colored_polygon(pts, col)
		draw_rect(Rect2(o, Vector2(s, s)), ThemeBuilder.LINE, false, 1.0)
		if badge != "":
			draw_rect(Rect2(o + Vector2(4, 4), Vector2(24, 20)), ThemeBuilder.GOLD)
			draw_string(ThemeBuilder.mono, o + Vector2(6, 19), badge, HORIZONTAL_ALIGNMENT_CENTER, 20, 13, Color("#1a1508"))


class Face extends Control:
	var seed_value := 0
	const SKIN := [Color("#f2d0b1"), Color("#e0b18f"), Color("#c68c62"), Color("#9c6440"), Color("#6f4428"), Color("#f5d9c4")]
	const HAIR := [Color("#1d1611"), Color("#3b2a1c"), Color("#6b4423"), Color("#a8743c"), Color("#d8c08a"), Color("#8b8b8b"), Color("#b0452f")]
	const SHIRT := [Color("#3d5164"), Color("#5a4d2a"), Color("#4a3b5c"), Color("#2f4f3f"), Color("#6b2f2f"), Color("#3a3f4a")]

	func _init(s: int = 0) -> void:
		seed_value = s
		custom_minimum_size = Vector2(76, 76)
		clip_contents = true  # a bust: shoulders are cut off at the frame

	func _draw() -> void:
		var r := RandomNumberGenerator.new()
		r.seed = seed_value
		var s: float = min(size.x, size.y)
		var c := size / 2.0
		var k := s / 100.0
		draw_circle(c, 50 * k, Color("#20232d"))
		var skin: Color = SKIN[r.randi_range(0, SKIN.size() - 1)]
		var hair: Color = HAIR[r.randi_range(0, HAIR.size() - 1)]
		var shirt: Color = SHIRT[r.randi_range(0, SHIRT.size() - 1)]
		var face_w := (24 + r.randf() * 7) * k
		var face_h := (29 + r.randf() * 6) * k
		var head := c + Vector2(0, -4 * k)
		# shoulders
		draw_circle(c + Vector2(0, 58 * k), 40 * k, shirt)
		# long hair behind the head
		var style := r.randi_range(0, 4)
		if style == 3:
			draw_rect(Rect2(head + Vector2(-face_w - 4 * k, -6 * k), Vector2(face_w * 2 + 8 * k, face_h + 22 * k)), hair)
		_ellipse(head, face_w, face_h, skin)
		# hair on top
		if style != 4:
			var top := PackedVector2Array()
			for i in 13:
				var a := PI + PI * i / 12.0
				var bump := 1.0 + (0.08 * sin(i * 2.3 + seed_value) if style == 2 else 0.0)
				top.append(head + Vector2(cos(a) * (face_w + 3 * k), sin(a) * (face_h + 3 * k) * bump - 2 * k))
			top.append(head + Vector2(face_w * 0.9, -face_h * 0.25))
			top.append(head + Vector2(-face_w * 0.9, -face_h * 0.3 - (6 * k if style == 1 else 0.0)))
			draw_colored_polygon(top, hair)
		# eyes, brows, nose, mouth
		var eye_y := head.y + (-2 + r.randf() * 4) * k
		var eye_dx := (9 + r.randf() * 3) * k
		for sx in [-1.0, 1.0]:
			draw_circle(Vector2(head.x + sx * eye_dx, eye_y), 2.6 * k, Color("#1c1c22"))
			draw_line(Vector2(head.x + sx * (eye_dx - 4 * k), eye_y - 6 * k), Vector2(head.x + sx * (eye_dx + 4 * k), eye_y - (6 + r.randf() * 2) * k), hair.darkened(0.2), 2.0 * k)
		draw_line(Vector2(head.x, eye_y + 3 * k), Vector2(head.x - 2 * k, eye_y + 11 * k), skin.darkened(0.25), 1.6 * k)
		var smile := r.randf() * 4.0 - 1.0
		var mouth := PackedVector2Array()
		for i in 7:
			var x := -7.0 + i * 14.0 / 6.0
			mouth.append(Vector2(head.x + x * k, eye_y + (17 + smile * (1.0 - pow(x / 7.0, 2))) * k))
		draw_polyline(mouth, Color("#7a3b34"), 2.0 * k)
		if r.randf() < 0.25:  # glasses
			for sx in [-1.0, 1.0]:
				draw_arc(Vector2(head.x + sx * eye_dx, eye_y), 6 * k, 0, TAU, 20, Color("#2a2a30"), 1.5 * k)
		if r.randf() < 0.2 and style != 3:  # beard
			_ellipse(head + Vector2(0, face_h * 0.62), face_w * 0.75, face_h * 0.38, Color(hair, 0.85))

	func _ellipse(center: Vector2, rx: float, ry: float, col: Color) -> void:
		var pts := PackedVector2Array()
		for i in 28:
			var a := TAU * i / 28.0
			pts.append(center + Vector2(cos(a) * rx, sin(a) * ry))
		draw_colored_polygon(pts, col)
