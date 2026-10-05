class_name RecallSession
extends RefCounted
## A forward-only recall run in a modal: for each entry, try to remember it,
## reveal, then grade yourself. Used by palace walks and library practice.
##   entries: [{ heading, cue, text, image }]
##   on_finish(grades: Array) is called when the last one is graded.

const GRADES := [
	[Fsrs.AGAIN, "Missed it", "ButtonDanger"], [Fsrs.HARD, "Hard", "ButtonGhost"],
	[Fsrs.GOOD, "Got it", "ButtonGreen"], [Fsrs.EASY, "Easy", "ButtonPrimary"],
]

var title := ""
var entries: Array = []
var idx := 0
var revealed := false
var grades: Array = []
var on_finish: Callable
var on_exit: Callable


static func start(session_title: String, list: Array, finish: Callable, exit: Callable = Callable()) -> RecallSession:
	var s := RecallSession.new()
	s.title = session_title
	s.entries = list
	s.on_finish = finish
	s.on_exit = exit
	s.show()
	return s


func show() -> void:
	var e: Dictionary = entries[idx]
	var box := UI.vbox([UI.label("%s — %d OF %d" % [title.to_upper(), idx + 1, entries.size()], "StatLabel")], 12)
	box.add_child(UI.label(e.heading, "H2", true))
	if e.get("cue", "") != "":
		box.add_child(UI.label(e.cue, "Mute", true))
	var inset := UI.panel([], "Inset", 10)
	if revealed:
		var tex := Util.texture_from_data_url(e.get("image"))
		if tex:
			UI.body(inset).add_child(UI.image_rect(tex, Vector2(0, 200)))
		if str(e.get("text", "")) != "":
			UI.body(inset).add_child(UI.label(e.text, "", true))
	else:
		UI.body(inset).add_child(UI.label("A picture is stored here too: recall it, then reveal." if e.get("image") else "Recall what's stored here, then reveal.", "Mute", true))
	inset.custom_minimum_size.y = 80
	box.add_child(inset)
	if revealed:
		var row := UI.flow([], 8)
		for g in GRADES:
			row.add_child(UI.button(g[1], g[2], func(): _grade(g[0]), true))
		box.add_child(UI.label("How well did you remember it?", "Mute"))
		box.add_child(row)
	else:
		box.add_child(UI.flow([UI.button("Reveal", "ButtonPrimary", func():
			revealed = true
			show())]))
	box.add_child(UI.spacer(4))
	box.add_child(UI.hbox([UI.button("Exit", "ButtonGhost", _exit, true), UI.expand(), UI.label("forward only — the order is locked", "Mono")]))
	App.open_modal(box)


func _grade(g: int) -> void:
	grades.append(g)
	if idx < entries.size() - 1:
		idx += 1
		revealed = false
		show()
	else:
		App.close_modal()
		on_finish.call(grades)
		var right := grades.filter(func(x): return x >= Fsrs.HARD).size()
		App.toast("Logged: %d/%d recalled. Each memory is now scheduled for its next review." % [right, grades.size()])


func _exit() -> void:
	App.close_modal()
	if not grades.is_empty():
		App.toast("Recall ended early — nothing was logged")
	if on_exit.is_valid():
		on_exit.call()
