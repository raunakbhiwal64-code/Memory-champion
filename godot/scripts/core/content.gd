extends Node
## Built-in content: curriculum, drill settings, word lists, Major System and
## the castle layout. Generated from the web app by scripts/export-godot-data.mjs
## into data/content.json, so both versions teach exactly the same things.

var data: Dictionary = {}
var curriculum: Array = []
var disciplines: Dictionary = {}
var levels: Array = []
var word_bank: Array = []
var first_names: Array = []
var last_names: Array = []
var major_legend: Array = []
var major_defaults: Dictionary = {}
var drill_prerequisites: Dictionary = {}
var castle: Dictionary = {}

const DISCIPLINE_ORDER := ["numbers", "words", "images", "cards", "names"]


func _init() -> void:
	var f := FileAccess.open("res://data/content.json", FileAccess.READ)
	if f == null:
		push_error("content.json missing")
		return
	data = JSON.parse_string(f.get_as_text())
	curriculum = data.curriculum
	disciplines = data.disciplines
	levels = data.levels
	word_bank = data.wordBank
	first_names = data.firstNames
	last_names = data.lastNames
	major_legend = data.majorLegend
	major_defaults = data.majorDefaults
	drill_prerequisites = data.drillPrerequisites
	castle = data.castle


func all_lessons() -> Array:
	var out := []
	for level in curriculum:
		out.append_array(level.lessons)
	return out


func find_lesson(id: String) -> Variant:
	for level in curriculum:
		for l in level.lessons:
			if l.id == id:
				return l
	return null


func castle_room(id: String) -> Variant:
	for r in castle.rooms:
		if r.id == id:
			return r
	return null


func castle_room_name(id: String) -> String:
	var r = castle_room(id)
	return r.name if r else ""


func castle_station(id: String) -> Variant:
	for s in castle.stations:
		if s.id == id:
			return s
	return null


func castle_locus_title(s: Dictionary) -> String:
	return "%s — %s" % [s.title, castle_room_name(s.room)]
