extends Node
## App-wide UI services: navigation between views, toasts and modal dialogs.
## The main scene registers itself here on start.

var main: Node = null


func go(view: String, args: Dictionary = {}) -> void:
	if main:
		main.go(view, args)


func toast(msg: String) -> void:
	if main:
		main.toast(msg)
	else:
		print("[toast] ", msg)


func open_modal(content: Control, wide: bool = false) -> void:
	if main:
		main.open_modal(content, wide)


func close_modal() -> void:
	if main:
		main.close_modal()
