extends Node
## Everything the user creates: palaces, library decks, history, progress and
## number systems. Saved as one JSON file in the app's private storage, written
## atomically, with a dated snapshot kept for each of the last 14 days of use.

signal changed(section: String)

const SAVE_FILE := "mnemosyne.json"
const SNAPSHOT_DIR := "backups"
const SNAPSHOTS_KEPT := 14
const HISTORY_CAP := 2000

var dir := "user://"  ## tests point this at a scratch folder
var data: Dictionary = Backup.empty_data()
var last_error := ""


func _ready() -> void:
	load_db()


func save_path() -> String:
	return dir.path_join(SAVE_FILE)


func load_db() -> void:
	data = Backup.empty_data()
	if FileAccess.file_exists(save_path()):
		var text := FileAccess.get_file_as_string(save_path())
		var parsed = JSON.parse_string(text)
		if parsed is Dictionary:
			data = Backup.normalize(parsed.get("data", parsed), int(parsed.get("schema", Backup.SCHEMA)))
		else:
			# a damaged file: keep it aside rather than overwrite it, and fall back to the newest snapshot
			DirAccess.rename_absolute(save_path(), save_path() + ".damaged-%d" % int(Util.now_ms()))
			_restore_latest_snapshot()
	for p in data.palaces:
		ensure_castle_loci(p)


func _restore_latest_snapshot() -> void:
	var snaps := list_snapshots()
	if snaps.is_empty():
		return
	var parsed = JSON.parse_string(FileAccess.get_file_as_string(snaps[0]))
	if parsed is Dictionary:
		data = Backup.normalize(parsed.get("data", parsed), int(parsed.get("schema", Backup.SCHEMA)))


func save(section: String = "") -> bool:
	if data.history.size() > HISTORY_CAP:
		data.history = data.history.slice(0, HISTORY_CAP)
	DirAccess.make_dir_recursive_absolute(dir)
	var tmp := save_path() + ".tmp"
	var f := FileAccess.open(tmp, FileAccess.WRITE)
	if f == null:
		last_error = "Could not save (%s)" % error_string(FileAccess.get_open_error())
		push_error(last_error)
		return false
	f.store_string(JSON.stringify(Backup.envelope(data)))
	f.close()
	_snapshot_daily()
	var err := DirAccess.rename_absolute(tmp, save_path())
	if err != OK:
		last_error = "Could not save (%s)" % error_string(err)
		return false
	changed.emit(section)
	return true


## The first save each day keeps a copy of the file as it was before that save,
## i.e. how things stood at the end of the previous session.
func _snapshot_daily() -> void:
	if not FileAccess.file_exists(save_path()):
		return
	var snap_dir := dir.path_join(SNAPSHOT_DIR)
	DirAccess.make_dir_recursive_absolute(snap_dir)
	var path := snap_dir.path_join("mnemosyne-%s.json" % Util.day_key(Util.now_ms()))
	if FileAccess.file_exists(path):
		return
	DirAccess.copy_absolute(save_path(), path)
	var snaps := list_snapshots()
	for i in range(SNAPSHOTS_KEPT, snaps.size()):
		DirAccess.remove_absolute(snaps[i])


## Newest first.
func list_snapshots() -> Array:
	var snap_dir := dir.path_join(SNAPSHOT_DIR)
	var out := []
	for f in DirAccess.get_files_at(snap_dir):
		if f.begins_with("mnemosyne-") and f.ends_with(".json"):
			out.append(snap_dir.path_join(f))
	out.sort()
	out.reverse()
	return out


# ---------- backup files ----------

func export_json() -> String:
	return Backup.to_json(data)


func export_to_file(path: String) -> bool:
	var f := FileAccess.open(path, FileAccess.WRITE)
	if f == null:
		last_error = "Could not write the backup (%s)" % error_string(FileAccess.get_open_error())
		return false
	f.store_string(export_json())
	f.close()
	data.settings.lastBackupAt = Util.now_ms()
	save("settings")
	return true


## mode: "replace" or "merge". Returns the parse result.
func import_text(text: String, mode: String) -> Dictionary:
	var result := Backup.parse(text)
	if not result.ok:
		return result
	var keep_settings: Dictionary = data.settings.duplicate()
	data = result.data if mode == "replace" else Backup.merge(data, result.data)
	data.settings = keep_settings
	for p in data.palaces:
		ensure_castle_loci(p)
	save("all")
	return result


# ---------- palaces ----------

func is_castle(p) -> bool:
	return p is Dictionary and p.get("kind") == "castle"


func is_locus_filled(l: Dictionary) -> bool:
	return Backup.is_filled(l)


func find_palace(id: String) -> Variant:
	for p in data.palaces:
		if p.id == id:
			return p
	return null


func new_palace(name: String, description: String = "") -> Dictionary:
	var p := { id = Util.uid(), name = name, description = description, loci = [], createdAt = Util.now_ms() }
	data.palaces.push_front(p)
	save("palaces")
	return p


func new_castle_palace(name: String = "", description: String = "") -> Dictionary:
	var p := { id = Util.uid(), kind = "castle", name = name if name != "" else Content.castle.name,
		description = description if description != "" else "A 3D castle with 40 stations along one fixed route.",
		loci = [], createdAt = Util.now_ms() }
	for s in Content.castle.stations:
		p.loci.append(new_locus(Content.castle_locus_title(s), s.id))
	data.palaces.push_front(p)
	save("palaces")
	return p


func open_or_create_castle() -> Dictionary:
	for p in data.palaces:
		if is_castle(p):
			return p
	return new_castle_palace()


func new_locus(title: String = "", anchor: String = "") -> Dictionary:
	var l := { id = Util.uid(), title = title, content = null, image = null, review = null }
	if anchor != "":
		l.anchor = anchor
	return l


## Keeps a castle palace in step with the station list: route order, every
## station present, titles always taken from the station.
func ensure_castle_loci(p: Dictionary) -> bool:
	if not is_castle(p):
		return false
	var by_anchor := {}
	for l in p.loci:
		if l.has("anchor") and not by_anchor.has(l.anchor):
			by_anchor[l.anchor] = l
	var changed_any := false
	var next := []
	for s in Content.castle.stations:
		var l: Dictionary = by_anchor.get(s.id, new_locus("", s.id))
		var title := Content.castle_locus_title(s)
		if l.title != title:
			l.title = title
			changed_any = true
		next.append(l)
	if next.size() != p.loci.size():
		changed_any = true
	else:
		for i in next.size():
			if next[i] != p.loci[i]:
				changed_any = true
	p.loci = next
	return changed_any


func palace_has_recall_content(p: Dictionary) -> bool:
	for l in p.loci:
		if is_locus_filled(l):
			return true
	return false


func filled_count(p: Dictionary) -> int:
	var n := 0
	for l in p.loci:
		if is_locus_filled(l):
			n += 1
	return n


## Filled stations whose review is due (never-reviewed ones count as due), in route order.
func due_loci(p: Dictionary, at_ms: float = -1.0) -> Array:
	var out := []
	for l in p.loci:
		if is_locus_filled(l) and Fsrs.is_due(l.get("review"), at_ms):
			out.append(l)
	return out


## Earliest upcoming review among filled stations, or -1 if none are scheduled.
func next_due_ms(items: Array) -> float:
	var best := -1.0
	for l in items:
		var r = l.get("review")
		if r is Dictionary and (best < 0.0 or float(r.due) < best):
			best = float(r.due)
	return best


func palace_status(p: Dictionary) -> Dictionary:
	if not palace_has_recall_content(p):
		return { text = "Nothing stored yet", due = false, count = 0 }
	var due := due_loci(p).size()
	if due > 0:
		return { text = "%s due" % Util.plural(due, "memory", "memories"), due = true, count = due }
	return { text = "Next review %s" % Util.due_label(next_due_ms(p.loci)), due = false, count = 0 }


## items: [{text, source}]. Castles always fill empty stations in route order.
func place_items_in_palace(p: Dictionary, items: Array, mode: String) -> int:
	var placed := 0
	if mode == "append" and not is_castle(p):
		for it in items:
			var l := new_locus()
			l.content = { text = it.text, source = it.get("source") }
			p.loci.append(l)
			placed += 1
	else:
		var empty := []
		for l in p.loci:
			if l.content == null or str(l.content.get("text", "")) == "":
				empty.append(l)
		for i in min(items.size(), empty.size()):
			empty[i].content = { text = items[i].text, source = items[i].get("source") }
			empty[i].review = null
			placed += 1
	save("palaces")
	return placed


func review_locus(l: Dictionary, grade: int) -> void:
	l.review = Fsrs.review(l.get("review"), grade, Util.now_ms(), data.settings.retention)


## Logs a finished recall walk. marks: grades per station walked.
func finish_palace_walk(p: Dictionary, walked: Array, grades: Array) -> void:
	var correct := 0
	for i in walked.size():
		if i < grades.size() and grades[i] != null:
			review_locus(walked[i], grades[i])
			if grades[i] >= Fsrs.HARD:
				correct += 1
	var total := walked.size()
	log_history({ type = "palace-walk", label = p.name, correct = correct, total = total,
		accuracy = int(round(100.0 * correct / total)) if total else 0 })
	save("palaces")


# ---------- library ----------

func find_deck(id: String) -> Variant:
	for d in data.decks:
		if d.id == id:
			return d
	return null


func new_deck(title: String, source_name: String, texts: Array) -> Dictionary:
	var d := { id = Util.uid(), title = title, sourceName = source_name, items = [], createdAt = Util.now_ms() }
	for t in texts:
		d.items.append({ id = Util.uid(), text = t, marked = false, review = null })
	data.decks.push_front(d)
	save("decks")
	return d


func due_items(d: Dictionary, at_ms: float = -1.0) -> Array:
	var out := []
	for it in d.items:
		if str(it.text).strip_edges() != "" and Fsrs.is_due(it.get("review"), at_ms):
			out.append(it)
	return out


func deck_status(d: Dictionary) -> Dictionary:
	if d.items.is_empty():
		return { text = "Empty", due = false, count = 0 }
	var due := due_items(d).size()
	if due > 0:
		return { text = "%s due" % Util.plural(due, "item"), due = true, count = due }
	return { text = "Next review %s" % Util.due_label(next_due_ms(d.items)), due = false, count = 0 }


func all_marked_items() -> Array:
	var out := []
	for d in data.decks:
		for it in d.items:
			if it.get("marked", false):
				out.append({ deckId = d.id, deckTitle = d.title, itemId = it.id, text = it.text, item = it })
	return out


func finish_deck_practice(title: String, items: Array, grades: Array) -> void:
	var correct := 0
	for i in items.size():
		if i < grades.size() and grades[i] != null:
			items[i].review = Fsrs.review(items[i].get("review"), grades[i], Util.now_ms(), data.settings.retention)
			if grades[i] >= Fsrs.HARD:
				correct += 1
	var total := items.size()
	log_history({ type = "deck-recall", label = title, correct = correct, total = total,
		accuracy = int(round(100.0 * correct / total)) if total else 0 })
	save("decks")


# ---------- learning, history, number systems ----------

func is_lesson_done(id: String) -> bool:
	return data.learn.completed.has(id)


func toggle_lesson(id: String) -> void:
	if data.learn.completed.has(id):
		data.learn.completed.erase(id)
	else:
		data.learn.completed.append(id)
	save("learn")


func missing_prerequisites(discipline: String) -> Array:
	var out := []
	for id in Content.drill_prerequisites.get(discipline, []):
		if not is_lesson_done(id):
			var l = Content.find_lesson(id)
			if l:
				out.append(l)
	return out


func log_history(entry: Dictionary) -> void:
	var e := { id = Util.uid(), ts = Util.now_ms() }
	e.merge(entry)
	data.history.push_front(e)
	save("history")


func compute_streak() -> int:
	var days := {}
	for h in data.history:
		days[Util.day_key(float(h.ts))] = true
	var streak := 0
	var t := Util.now_ms()
	while days.has(Util.day_key(t)):
		streak += 1
		t -= 86400000.0
	return streak


func best_score_for(discipline: String) -> Variant:
	var best = null
	for h in data.history:
		if h.type == "drill" and h.get("discipline") == discipline and (best == null or h.correct > best.correct):
			best = h
	return best


func total_due() -> int:
	var n := 0
	for p in data.palaces:
		n += due_loci(p).size()
	for d in data.decks:
		n += due_items(d).size()
	return n


func major_word(num: String) -> String:
	var ov = data.majorSystem.overrides.get(num, "")
	return ov.strip_edges() if ov is String and ov.strip_edges() != "" else str(Content.major_defaults.get(num, ""))


func pao_complete_count() -> int:
	var n := 0
	for k in data.pao.entries:
		var e: Dictionary = data.pao.entries[k]
		if e.person != "" and e.action != "" and e.object != "":
			n += 1
	return n
