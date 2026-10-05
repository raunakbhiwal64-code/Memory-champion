extends RefCounted
## The app shell: every screen opens without errors and shows real content.

func run(t):
	var main = load("res://scenes/main.tscn").instantiate()
	t.add_child(main)
	await t.get_tree().process_frame
	t.check("the main screen registers with App", App.main == main)
	for tab in main.TABS:
		App.go(tab[0])
		await t.get_tree().process_frame
		t.check("%s opens with content" % tab[0], main.current == tab[0] and main.views[tab[0]].content.get_child_count() > 0)
		t.check("%s highlights its tab" % tab[0], main.tab_buttons[tab[0]].button_pressed)
	App.go("learn", { lesson = "l2-2" })
	await t.get_tree().process_frame
	var lesson = main.views.learn.content.find_child("lesson-l2-2", true, false)
	t.check("opening a lesson by id expands it", lesson != null and lesson.theme_type_variation == "CardGold")
	t.check("the expanded lesson's Try-it opens the castle", _find_button(lesson, "Take an empty walk through the castle") != null)
	App.toast("hello")
	t.check("toasts appear", main.toast_box.get_child_count() > 0)
	App.confirm("Sure?", "Yes", func(): t.set_meta("confirmed", true))
	await t.get_tree().process_frame
	t.check("confirm opens a modal", main.modal_open())
	_find_button(main.modal_scroll, "Yes").pressed.emit()
	t.check("confirming runs the action and closes the modal", t.get_meta("confirmed", false) and not main.modal_open())
	t.set_meta("main", main)
	return true


static func _find_button(root: Node, text: String) -> Button:
	if root == null:
		return null
	if root is Button and root.text == text:
		return root
	for c in root.get_children():
		var b := _find_button(c, text)
		if b:
			return b
	return null
