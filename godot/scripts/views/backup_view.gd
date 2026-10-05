extends View
## Backups and settings: save everything to a file, bring a file back (from
## this app or the website), restore a daily snapshot, and tune reviews.


func build() -> void:
	header("YOUR DATA", "Backup & settings", "Everything you create stays on this device. Save a backup file now and then so a lost or replaced device never costs you a memory.")
	var d := DB.data
	var last: float = d.settings.get("lastBackupAt", 0.0)

	var export_card := UI.panel([UI.label("Save a backup file", "H3"),
		UI.label("One file with all your palaces, memories (including photos), library, history, number systems and review schedules. Keep it in cloud storage or email it to yourself.", "Dim", true),
		UI.label("Last backup file: " + ("never" if last == 0.0 else Util.date_label(last)), "Mono"),
		UI.flow([UI.button("Save backup file…", "ButtonGold", _export)])], "Card", 10)
	content.add_child(export_card)

	content.add_child(UI.panel([UI.label("Import a backup", "H3"),
		UI.label("Bring in a backup from this app on another device, or from the Mnemosyne website (History tab → Export backup). You'll choose whether to merge it with what's here or replace everything.", "Dim", true),
		UI.flow([UI.button("Choose backup file…", "ButtonPrimary", _pick_import)])], "Card", 10))

	var snaps := DB.list_snapshots()
	var snap_card := UI.panel([UI.label("Daily snapshots", "H3"),
		UI.label("The app quietly keeps a copy of your data from each of the last %d days you used it, so a mistake can be undone." % DB.SNAPSHOTS_KEPT, "Dim", true)], "Card", 8)
	if snaps.is_empty():
		UI.body(snap_card).add_child(UI.label("No snapshots yet: the first one is made tomorrow.", "Mute"))
	for path in snaps.slice(0, 8):
		var label := DB.snapshot_label(path)
		UI.body(snap_card).add_child(UI.hbox([UI.label(label, "Mono", true),
			UI.button("Restore", "ButtonGhost", func(): _restore(path, label), true)]))
	content.add_child(snap_card)

	var pct := int(round(float(d.settings.retention) * 100.0))
	var value := UI.label("%d%%" % pct, "MonoGold")
	var slider := HSlider.new()
	slider.min_value = 80
	slider.max_value = 95
	slider.step = 1
	slider.value = pct
	slider.size_flags_horizontal = SIZE_EXPAND_FILL
	slider.custom_minimum_size.y = 28
	slider.value_changed.connect(func(v): value.text = "%d%%" % int(v))
	slider.drag_ended.connect(func(_c):
		DB.data.settings.retention = slider.value / 100.0
		DB.save("settings")
		App.toast("Reviews now aim for %d%% recall" % int(slider.value)))
	content.add_child(UI.panel([UI.label("How well to remember", "H3"),
		UI.label("Each memory is scheduled to come back just before your chance of recalling it drops below this target. Higher means more frequent reviews; 90% is a good balance.", "Dim", true),
		UI.hbox([slider, value], 14)], "Card", 10))

	content.add_child(UI.panel([UI.label("About", "H3"),
		UI.label("Mnemosyne %s · data stored at %s" % [ProjectSettings.get_setting("application/config/version"), ProjectSettings.globalize_path(DB.dir)], "Mono", true),
		UI.label(Backup.summary(d), "Mute", true)], "Card", 6))


func _file_dialog(mode: FileDialog.FileMode, title: String) -> FileDialog:
	var fd := FileDialog.new()
	fd.file_mode = mode
	fd.access = FileDialog.ACCESS_FILESYSTEM
	fd.title = title
	fd.use_native_dialog = true
	fd.filters = PackedStringArray(["*.json ; Mnemosyne backup"])
	fd.size = Vector2i(820, 560)
	add_child(fd)
	fd.canceled.connect(fd.queue_free)
	return fd


func _export() -> void:
	var name := "mnemosyne-backup-%s.json" % Util.day_key(Util.now_ms())
	if OS.has_feature("web"):
		JavaScriptBridge.download_buffer(DB.export_json().to_utf8_buffer(), name, "application/json")
		DB.data.settings.lastBackupAt = Util.now_ms()
		DB.save("settings")
		refresh()
		return
	var fd := _file_dialog(FileDialog.FILE_MODE_SAVE_FILE, "Save backup file")
	fd.current_file = name
	fd.file_selected.connect(func(path):
		fd.queue_free()
		if DB.export_to_file(path):
			App.toast("Backup saved: " + path.get_file())
			refresh()
		else:
			App.toast(DB.last_error))
	fd.popup_centered()


func _pick_import() -> void:
	var fd := _file_dialog(FileDialog.FILE_MODE_OPEN_FILE, "Choose a backup file")
	fd.file_selected.connect(func(path):
		fd.queue_free()
		var text := FileAccess.get_file_as_string(path)
		if text == "":
			App.toast("Could not read that file")
			return
		confirm_import(text, path.get_file()))
	fd.popup_centered()


## Shows what's in a backup and asks whether to merge or replace.
func confirm_import(text: String, file_name: String) -> void:
	var res := Backup.parse(text)
	if not res.ok:
		App.toast(res.error)
		return
	var from := "the Mnemosyne website" if res.schema < Backup.SCHEMA else "the Mnemosyne app"
	var box := UI.vbox([UI.label("Import " + file_name, "H2", true),
		UI.label("From %s: %s." % [from, res.summary], "Dim", true),
		UI.label("Merge adds anything new and keeps everything you have here. Replace swaps all your data for the backup's; a copy of what's here now is kept under Daily snapshots.", "Mute", true)], 12)
	box.add_child(UI.flow([UI.button("Cancel", "ButtonGhost", App.close_modal),
		UI.button("Replace everything", "ButtonDanger", func(): _do_import(text, "replace")),
		UI.button("Merge", "ButtonPrimary", func(): _do_import(text, "merge"))]))
	App.open_modal(box)


func _do_import(text: String, mode: String) -> void:
	App.close_modal()
	var res := DB.import_text(text, mode)
	App.toast(("Merged in " if mode == "merge" else "Replaced with ") + res.summary if res.ok else res.error)
	refresh()


func _restore(path: String, label: String) -> void:
	App.confirm("Restore this snapshot (%s)? A copy of your data as it is now is kept first, so this can be undone too." % label, "Restore", func():
		var res := DB.import_text(FileAccess.get_file_as_string(path), "replace")
		App.toast("Restored: " + label if res.ok else res.error)
		refresh())
