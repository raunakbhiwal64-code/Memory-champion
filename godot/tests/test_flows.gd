extends RefCounted
## Palaces and library, driven through the real screens like a user would.

var t
var main


func press(text: String, root: Node = null) -> bool:
	var b := _find(root if root else main, text)
	if b == null:
		t.check("button '%s' exists" % text, false)
		return false
	b.pressed.emit()
	return true


func _find(root: Node, text: String) -> Button:
	if root is Button and root.text == text and root.is_visible_in_tree() and not root.disabled:
		return root
	for c in root.get_children():
		var b := _find(c, text)
		if b:
			return b
	return null


## The visible text box (LineEdit or TextEdit) whose placeholder contains `hint`.
func field(hint: String) -> Control:
	for c in main.modal_scroll.find_children("*", "", true, false):
		if (c is LineEdit or c is TextEdit) and c.placeholder_text.contains(hint) and c.is_visible_in_tree():
			return c
	t.check("field '%s' exists" % hint, false)
	return LineEdit.new()


func has_text(root: Node, text: String) -> bool:
	if (root is Label or root is Button) and root.text.contains(text):
		return true
	if root is LineEdit and root.text.contains(text):
		return true
	for c in root.get_children():
		if has_text(c, text):
			return true
	return false


func frame() -> void:
	await t.get_tree().process_frame
	await t.get_tree().process_frame


func run(runner) -> void:
	t = runner
	t.reset_db()
	main = App.main
	if main == null:
		main = load("res://scenes/main.tscn").instantiate()
		t.add_child(main)
		await frame()

	# ---- a list palace, built by a study walk ----
	App.go("palaces")
	await frame()
	press("+ New palace")
	await frame()
	t.check("new palace dialog opens", main.modal_open())
	field("Childhood home").text = "Childhood home"
	press("Create palace")
	await frame()
	t.check("creating a palace opens it", main.current == "palace" and has_text(main.views.palace, "Childhood home"))
	var p: Dictionary = DB.data.palaces[0]
	press("Study walk")
	await frame()
	field("Station name").text = "Front door"
	field("What's stored here").text = "A giant 7 knocking"
	press("+ New station here")
	await frame()
	field("Station name").text = "Hallway mirror"
	field("What's stored here").text = "Mirror shows a lion"
	press("Done")
	await frame()
	t.check("a study walk builds stations as you go", p.loci.size() == 2 and p.loci[0].title == "Front door" and p.loci[1].content.text == "Mirror shows a lion")
	t.check("new memories are due for their first review", DB.due_loci(p).size() == 2)

	# ---- recall walk with grades ----
	press("Recall walk")
	await frame()
	t.check("recall hides the memory until revealed", not has_text(main.modal_scroll, "A giant 7"))
	press("Reveal")
	await frame()
	t.check("reveal shows the memory", has_text(main.modal_scroll, "A giant 7"))
	press("Got it")
	await frame()
	press("Reveal")
	await frame()
	press("Missed it")
	await frame()
	t.check("finishing logs the walk", DB.data.history[0].type == "palace-walk" and DB.data.history[0].correct == 1)
	t.check("each memory gets its own schedule", p.loci[0].review.due > p.loci[1].review.due)
	t.check("nothing is due right after the walk", DB.due_loci(p).is_empty() and has_text(main.views.palace, "Next review"))

	# ---- dashboard due list → review walk only covers due memories ----
	p.loci[1].review.due = Util.now_ms() - 1000.0
	App.go("dashboard")
	await frame()
	t.check("the dashboard lists what's due", has_text(main.views.dashboard, "Due for review — 1 memory"))
	press("Review now")
	await frame()
	t.check("Review now starts a walk of only the due memory", main.modal_open() and has_text(main.modal_scroll, "1 OF 1") and has_text(main.modal_scroll, "Hallway mirror"))
	press("Reveal")
	await frame()
	press("Easy")
	await frame()
	t.check("the due memory is rescheduled", DB.due_loci(p).is_empty())

	# ---- library: deck from text, star, practise, send to palace ----
	App.go("library")
	await frame()
	press("+ New deck")
	await frame()
	field("Meditations").text = "Stoics"
	field("Paste the text").text = "The obstacle is the way. Memento mori! You have power over your mind?"
	press("Create deck")
	await frame()
	var d: Dictionary = DB.data.decks[0]
	t.check("a deck is split into sentence items", main.current == "deck" and d.items.size() == 3 and d.items[1].text == "Memento mori!")
	press("☆")
	await frame()
	t.check("starring marks an item", d.items[0].marked)
	press("Review 3 due")
	await frame()
	press("Start recall →")
	await frame()
	for i in 3:
		press("Reveal")
		await frame()
		press("Got it")
		await frame()
	t.check("deck practice schedules every item and logs it", DB.due_items(d).is_empty() and DB.data.history[0].type == "deck-recall" and DB.data.history[0].correct == 3)
	press("Send to palace")
	await frame()
	press("Send")
	await frame()
	t.check("items can be sent to a palace as new stations", DB.data.palaces[0].loci.size() == 5 and DB.data.palaces[0].loci[4].content.source == "Stoics")

	# ---- castle palace from the palaces tab (2D list until the 3D scene exists) ----
	App.go("palaces")
	await frame()
	press("Build your castle")
	await frame()
	var castle = DB.data.palaces.filter(func(x): return DB.is_castle(x))
	t.check("Build your castle creates the 40-station castle palace", castle.size() == 1 and castle[0].loci.size() == 40)
	App.go("palace", { id = castle[0].id })
	await frame()
	t.check("castle station titles can't be renamed", not main.views.palace.content.find_children("*", "LineEdit", true, false)[0].editable)
