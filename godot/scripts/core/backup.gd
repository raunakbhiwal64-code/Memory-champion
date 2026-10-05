class_name Backup
## Backup files: export everything to one JSON file, import it on any device.
## Also reads backups made by the web app (schema 1) and upgrades them: each
## palace's single review schedule becomes a starting schedule per memory.

const APP_ID := "mnemosyne"
const SCHEMA := 2


static func empty_data() -> Dictionary:
	return {
		palaces = [], decks = [], history = [],
		learn = { completed = [] },
		majorSystem = { overrides = {} },
		pao = { entries = {} },
		numberSystemPref = "major",
		settings = { retention = Fsrs.DEFAULT_RETENTION },
	}


static func envelope(data: Dictionary) -> Dictionary:
	return { app = APP_ID, schema = SCHEMA, exportedAt = Util.now_ms(), data = data }


static func to_json(data: Dictionary) -> String:
	return JSON.stringify(envelope(data), " ")


## Parses a backup file (ours or the web app's). Returns
## { ok, data, error, schema, summary }.
static func parse(text: String) -> Dictionary:
	var json := JSON.new()
	var parsed = json.data if json.parse(text) == OK else null
	if parsed == null or not (parsed is Dictionary):
		return { ok = false, error = "That file isn't a Mnemosyne backup (not valid JSON)." }
	var schema := 1
	var raw: Dictionary
	if parsed.has("data") and parsed.data is Dictionary:
		if parsed.get("app", APP_ID) != APP_ID:
			return { ok = false, error = "That backup was made by a different app." }
		schema = int(parsed.get("schema", 1))
		raw = parsed.data
	elif parsed.has("palaces") or parsed.has("decks") or parsed.has("history"):
		raw = parsed  # a bare data dump
	else:
		return { ok = false, error = "That file doesn't contain any palaces, decks or history." }
	if schema > SCHEMA:
		return { ok = false, error = "That backup comes from a newer version of Mnemosyne. Update the app, then import it." }
	var data := normalize(raw, schema)
	return { ok = true, data = data, schema = schema, summary = summary(data) }


static func summary(data: Dictionary) -> String:
	var loci := 0
	var filled := 0
	for p in data.palaces:
		loci += p.loci.size()
		for l in p.loci:
			if is_filled(l):
				filled += 1
	var items := 0
	for d in data.decks:
		items += d.items.size()
	return "%s (%d of %d stations filled), %s with %s, %s" % [
		Util.plural(data.palaces.size(), "palace"), filled, loci,
		Util.plural(data.decks.size(), "deck"), Util.plural(items, "item"),
		Util.plural(data.history.size(), "logged session")]


static func is_filled(l: Dictionary) -> bool:
	var c = l.get("content")
	return (l.get("image") != null and str(l.get("image")) != "") or (c is Dictionary and str(c.get("text", "")).strip_edges() != "")


static func _arr(v) -> Array:
	return v if v is Array else []


static func _dict(v) -> Dictionary:
	return v if v is Dictionary else {}


static func _str(v, fallback: String = "") -> String:
	return v if v is String else fallback


## Fills in anything missing and upgrades old schemas, so the rest of the app
## can trust the shape of the data.
static func normalize(raw: Dictionary, schema: int = SCHEMA) -> Dictionary:
	var out := empty_data()
	for p in _arr(raw.get("palaces")):
		if not (p is Dictionary):
			continue
		var old_card = Fsrs.from_sm2(p.get("srs")) if schema < 2 else null
		var palace := {
			id = _str(p.get("id"), Util.uid()), name = _str(p.get("name"), "Untitled palace"),
			description = _str(p.get("description")), createdAt = float(p.get("createdAt", Util.now_ms())), loci = [],
		}
		if p.get("kind") == "castle":
			palace.kind = "castle"
		for l in _arr(p.get("loci")):
			if not (l is Dictionary):
				continue
			var locus := { id = _str(l.get("id"), Util.uid()), title = _str(l.get("title")), content = null, image = null, review = null }
			if l.has("anchor"):
				locus.anchor = _str(l.anchor)
			var c = l.get("content")
			if c is Dictionary and _str(c.get("text")) != "":
				locus.content = { text = _str(c.text), source = c.get("source") if c.get("source") is String else null }
			if l.get("image") is String and str(l.image).begins_with("data:image/"):
				locus.image = l.image
			if l.get("review") is Dictionary and l.review.has("s"):
				locus.review = l.review
			elif old_card != null and is_filled(locus):
				locus.review = old_card.duplicate()
			palace.loci.append(locus)
		out.palaces.append(palace)
	for d in _arr(raw.get("decks")):
		if not (d is Dictionary):
			continue
		var old_card = Fsrs.from_sm2(d.get("srs")) if schema < 2 else null
		var deck := { id = _str(d.get("id"), Util.uid()), title = _str(d.get("title"), "Untitled deck"),
			sourceName = _str(d.get("sourceName")), createdAt = float(d.get("createdAt", Util.now_ms())), items = [] }
		for it in _arr(d.get("items")):
			if not (it is Dictionary):
				continue
			var item := { id = _str(it.get("id"), Util.uid()), text = _str(it.get("text")), marked = bool(it.get("marked", false)), review = null }
			var sug = it.get("suggestions")
			if sug is Array and not sug.is_empty():
				item.suggestions = sug
			elif it.get("suggestion") is String:
				item.suggestions = [it.suggestion]
			if it.get("review") is Dictionary and it.review.has("s"):
				item.review = it.review
			elif old_card != null and item.text.strip_edges() != "":
				item.review = old_card.duplicate()
			deck.items.append(item)
		out.decks.append(deck)
	for h in _arr(raw.get("history")):
		if h is Dictionary and h.has("type"):
			out.history.append(h)
	var learn := _dict(raw.get("learn"))
	for id in _arr(learn.get("completed")):
		if id is String and not out.learn.completed.has(id):
			out.learn.completed.append(id)
	var major := _dict(_dict(raw.get("majorSystem")).get("overrides"))
	for k in major:
		if major[k] is String and major[k].strip_edges() != "":
			out.majorSystem.overrides[k] = major[k]
	var pao := _dict(_dict(raw.get("pao")).get("entries"))
	for k in pao:
		if pao[k] is Dictionary:
			out.pao.entries[k] = { person = _str(pao[k].get("person")), action = _str(pao[k].get("action")), object = _str(pao[k].get("object")) }
	if raw.get("numberSystemPref") in ["major", "pao"]:
		out.numberSystemPref = raw.numberSystemPref
	var settings := _dict(raw.get("settings"))
	if settings.get("retention") is float:
		out.settings.retention = clampf(settings.retention, 0.7, 0.97)
	if settings.get("castleQuality") in ["low", "medium", "high"]:
		out.settings.castleQuality = settings.castleQuality
	if settings.get("castleMuted") is bool:
		out.settings.castleMuted = settings.castleMuted
	return out


## Adds what `incoming` has that `current` doesn't: palaces, decks and history
## entries are matched by id. Where both have the same palace or deck, the
## version with more memories (or more reviews) wins.
static func merge(current: Dictionary, incoming: Dictionary) -> Dictionary:
	var out := current.duplicate(true)
	for key in ["palaces", "decks"]:
		var index := {}
		for i in out[key].size():
			index[out[key][i].id] = i
		for x in incoming[key]:
			if not index.has(x.id):
				out[key].append(x.duplicate(true))
			elif _weight(x) > _weight(out[key][index[x.id]]):
				out[key][index[x.id]] = x.duplicate(true)
	var seen := {}
	for h in out.history:
		seen[h.get("id", "")] = true
	for h in incoming.history:
		if not seen.has(h.get("id", "")):
			out.history.append(h.duplicate(true))
	out.history.sort_custom(func(a, b): return float(a.get("ts", 0)) > float(b.get("ts", 0)))
	for id in incoming.learn.completed:
		if not out.learn.completed.has(id):
			out.learn.completed.append(id)
	for k in incoming.majorSystem.overrides:
		if not out.majorSystem.overrides.has(k):
			out.majorSystem.overrides[k] = incoming.majorSystem.overrides[k]
	for k in incoming.pao.entries:
		if not out.pao.entries.has(k):
			out.pao.entries[k] = incoming.pao.entries[k].duplicate()
	return out


static func _weight(x: Dictionary) -> int:
	var w := 0
	for l in x.get("loci", x.get("items", [])):
		if is_filled(l) or str(l.get("text", "")) != "":
			w += 10
		if l.get("review") is Dictionary:
			w += int(l.review.get("reps", 0))
	return w
