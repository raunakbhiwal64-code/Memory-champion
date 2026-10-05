class_name DrillLogic
## Memory-League-style drills: generate what to memorise, then score the recall.

const SUITS := [
	{ l = "S", sym = "♠", red = false }, { l = "H", sym = "♥", red = true },
	{ l = "D", sym = "♦", red = true }, { l = "C", sym = "♣", red = false },
]
const RANKS := ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]


static func item_count(discipline: String, level_idx: int) -> int:
	var n: int = Content.levels[clampi(level_idx, 0, Content.levels.size() - 1)]
	return min(n, 52) if discipline == "cards" else n


static func generate(discipline: String, count: int, rng: RandomNumberGenerator) -> Array:
	match discipline:
		"numbers":
			var out := []
			for i in count:
				out.append(str(rng.randi_range(0, 9)))
			return out
		"words":
			var pool: Array = Content.word_bank.duplicate()
			var out := []
			for i in min(count, pool.size()):
				out.append(pool.pop_at(rng.randi_range(0, pool.size() - 1)))
			return out
		"cards":
			var deck := []
			for s in SUITS:
				for r in RANKS:
					deck.append({ rank = r, suit = s.l, sym = s.sym, red = s.red, canon = r + s.l })
			for i in range(deck.size() - 1, 0, -1):
				var j := rng.randi_range(0, i)
				var tmp = deck[i]
				deck[i] = deck[j]
				deck[j] = tmp
			return deck.slice(0, min(count, 52))
		"images":
			var out := []
			for i in count:
				out.append(rng.randi())  # a seed: each one draws a distinct abstract picture
			return out
		"names":
			var out := []
			for i in count:
				out.append({ name = "%s %s" % [Content.first_names[rng.randi_range(0, Content.first_names.size() - 1)],
					Content.last_names[rng.randi_range(0, Content.last_names.size() - 1)]], seed = rng.randi() })
			return out
	return []


static func normalize_card(s: String) -> String:
	s = s.strip_edges().to_upper().replace(" ", "")
	if s.begins_with("T"):
		s = "10" + s.substr(1)
	return s


## Correct count, total, and the unbroken run of correct answers from the start.
static func score_sequence(actual: Array, typed: Array, case_insensitive: bool) -> Dictionary:
	var correct := 0
	var run := 0
	var broken := false
	for i in actual.size():
		var a := str(actual[i]).strip_edges()
		var t := str(typed[i] if i < typed.size() else "").strip_edges()
		if case_insensitive:
			a = a.to_lower()
			t = t.to_lower()
		var ok := a == t and t != ""
		if ok:
			correct += 1
		if not broken:
			if ok:
				run += 1
			else:
				broken = true
	return { correct = correct, total = actual.size(), run = run }


## For images: `order` lists the original indices in the order the user picked them.
static func score_order(order: Array, total: int) -> Dictionary:
	var correct := 0
	var run := 0
	var broken := false
	for i in total:
		if i < order.size() and order[i] == i:
			correct += 1
			if not broken:
				run += 1
		else:
			broken = true
	return { correct = correct, total = total, run = run }


static func score_names(items: Array, typed: Array) -> Dictionary:
	var correct := 0
	for i in items.size():
		var t := str(typed[i] if i < typed.size() else "").strip_edges().to_lower()
		if t != "" and t == str(items[i].name).strip_edges().to_lower():
			correct += 1
	return { correct = correct, total = items.size(), run = null }
