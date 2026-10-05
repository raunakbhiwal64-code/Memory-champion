class_name TextChunker
## Splits imported text into library items (same rules as the web app).

static func chunk(text: String, mode: String) -> Array:
	var raw: Array = []
	if mode == "paragraph":
		var re := RegEx.create_from_string("\\n\\s*\\n+")
		raw = _split_regex(text, re)
	elif mode == "line":
		raw = _split_regex(text, RegEx.create_from_string("\\n+"))
	else:
		var flat := RegEx.create_from_string("\\s+").sub(text, " ", true)
		var re := RegEx.create_from_string("[^.!?]+[.!?]+(\\s|$)")
		for m in re.search_all(flat):
			raw.append(m.get_string())
		if raw.is_empty():
			raw = [text]
	var out := []
	var ws := RegEx.create_from_string("\\s+")
	for s in raw:
		var t: String = ws.sub(str(s), " ", true).strip_edges()
		if t.length() > 3 and t.length() < 600:
			out.append(t)
		if out.size() >= 400:
			break
	return out


static func _split_regex(text: String, re: RegEx) -> Array:
	var out := []
	var start := 0
	for m in re.search_all(text):
		out.append(text.substr(start, m.get_start() - start))
		start = m.get_end()
	out.append(text.substr(start))
	return out
