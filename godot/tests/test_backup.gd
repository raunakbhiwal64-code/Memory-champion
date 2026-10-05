extends RefCounted
## Backups: export, import (including the web app's format), merge, and the save file.

const PIXEL := "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="


func web_backup() -> Dictionary:
	var now := Util.now_ms()
	return { app = "mnemosyne", schema = 1, exportedAt = now, data = {
		palaces = [
			{ id = "p1", name = "Childhood home", description = "", createdAt = now, loci = [
				{ id = "l1", title = "Front door", content = { text = "a giant 7", source = null }, image = null },
				{ id = "l2", title = "Hallway", content = null, image = PIXEL },
				{ id = "l3", title = "Kitchen", content = null, image = null }],
				srs = { ef = 2.5, interval = 6, reps = 2, dueAt = now + 86400000.0 * 2, lastAt = now - 86400000.0 * 4 } },
			{ id = "c1", kind = "castle", name = "The Keep", createdAt = now, loci = [
				{ id = "x", anchor = "s05", title = "old title", content = { text = "purple elephant", source = "Deck" }, image = null }] }],
		decks = [{ id = "d1", title = "Meditations", sourceName = "m.pdf", createdAt = now, items = [
			{ id = "i1", text = "The obstacle is the way.", marked = true, suggestion = "a boulder on a road" },
			{ id = "i2", text = "", marked = false }], srs = { ef = 2.3, interval = 1, reps = 1, dueAt = now - 1000.0, lastAt = now - 86400000.0 } }],
		history = [{ id = "h1", ts = now - 5000.0, type = "drill", discipline = "numbers", label = "Numbers", level = 3, correct = 14, total = 16, accuracy = 88 }],
		learn = { completed = ["l1-1", "l1-2"] },
		majorSystem = { overrides = { "07": "sock", "08": "" } },
		pao = { entries = { "12": { person = "Tina", action = "dances", object = "tuba" } } },
		numberSystemPref = "pao",
	} }


func run(t):
	var res := Backup.parse(JSON.stringify(web_backup()))
	t.check("a web-app backup parses", res.ok)
	var d: Dictionary = res.data
	t.check("its palaces, decks and history come across", d.palaces.size() == 2 and d.decks.size() == 1 and d.history.size() == 1)
	var p: Dictionary = d.palaces[0]
	t.check("text memories keep their content", p.loci[0].content.text == "a giant 7")
	t.check("photos survive the trip", p.loci[1].image == PIXEL)
	t.check("filled stations inherit the old palace schedule", p.loci[0].review != null and p.loci[1].review != null)
	t.check("empty stations stay unscheduled", p.loci[2].review == null)
	t.check("the old palace-wide schedule is dropped", not p.has("srs"))
	t.check("castle palaces keep their kind and anchors", d.palaces[1].kind == "castle" and d.palaces[1].loci[0].anchor == "s05")
	t.check("an old single suggestion becomes a list", d.decks[0].items[0].suggestions == ["a boulder on a road"])
	t.check("deck items inherit the deck schedule; blank items don't", d.decks[0].items[0].review != null and d.decks[0].items[1].review == null)
	t.check("blank Major System overrides are dropped", d.majorSystem.overrides.size() == 1 and d.majorSystem.overrides["07"] == "sock")
	t.check("PAO entries and preference come across", d.pao.entries["12"].object == "tuba" and d.numberSystemPref == "pao")
	t.check("the summary counts what's inside", res.summary.begins_with("2 palaces (3 of 4 stations filled)"))

	# round trip through our own format
	var again := Backup.parse(Backup.to_json(d))
	t.check("our own backups round-trip", again.ok and again.schema == 2 and again.data.palaces[0].loci[0].review.due == p.loci[0].review.due)
	t.check("garbage is rejected kindly", not Backup.parse("not json").ok and not Backup.parse("{\"hello\":1}").ok)
	t.check("other apps' files are rejected", not Backup.parse(JSON.stringify({ app = "other", data = {} })).ok)
	t.check("newer-version backups are refused, not mangled", not Backup.parse(JSON.stringify({ app = "mnemosyne", schema = 99, data = {} })).ok)
	t.check("a bare data dump (no wrapper) is accepted", Backup.parse(JSON.stringify({ palaces = [], history = [] })).ok)

	# merging keeps both sides
	var mine := Backup.normalize({ palaces = [{ id = "p9", name = "Office", loci = [] }],
		history = [{ id = "h9", ts = Util.now_ms(), type = "drill", discipline = "words", correct = 1, total = 8 }] })
	var merged := Backup.merge(mine, d)
	t.check("merge keeps my palaces and adds theirs", merged.palaces.size() == 3)
	t.check("merge unions history without duplicates", Backup.merge(merged, d).history.size() == 2)
	t.check("merge adds learned lessons", merged.learn.completed.has("l1-2"))

	# importing through DB, and the save file on disk
	t.reset_db()
	DB.new_palace("Mine")
	var r := DB.import_text(JSON.stringify(web_backup()), "merge")
	t.check("import (merge) via DB works", r.ok and DB.data.palaces.size() == 3)
	t.check("imported castles are brought in line with the 40 stations", DB.data.palaces.filter(func(x): return DB.is_castle(x))[0].loci.size() == 40)
	var castle = DB.data.palaces.filter(func(x): return DB.is_castle(x))[0]
	t.check("castle memories stay at their station", castle.loci[4].content.text == "purple elephant" and castle.loci[4].title.begins_with("Sundial"))
	DB.load_db()
	t.check("data reloads from disk intact", DB.data.palaces.size() == 3 and DB.data.decks.size() == 1)
	t.check("a daily snapshot is kept", DB.list_snapshots().size() == 1)
	DB.import_text(JSON.stringify(web_backup()), "replace")
	t.check("import (replace) replaces", DB.data.palaces.size() == 2)
	var f := FileAccess.open(DB.save_path(), FileAccess.WRITE)
	f.store_string("{ broken")
	f.close()
	DB.load_db()
	var snap = JSON.parse_string(FileAccess.get_file_as_string(DB.list_snapshots()[0]))
	t.check("a damaged save file falls back to the latest snapshot", DB.data.palaces.size() == snap.data.palaces.size())
	var damaged := Array(DirAccess.get_files_at(DB.dir)).filter(func(x): return x.contains(".damaged-"))
	t.check("the damaged file is kept aside, not deleted", damaged.size() == 1)
	var out_path := DB.dir.path_join("export.json")
	t.check("export to a file works", DB.export_to_file(out_path) and Backup.parse(FileAccess.get_file_as_string(out_path)).ok)
	t.check("the last backup time is remembered", DB.data.settings.has("lastBackupAt"))
	return true
