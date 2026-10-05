class_name Fsrs
## Spaced repetition, one schedule per memory (FSRS-5, the algorithm modern Anki
## uses). A card is a Dictionary:
##   { s: stability in days, d: difficulty 1..10, due: ms, last: ms, reps, lapses }
## null means "never reviewed". Grades: 1 = missed, 2 = hard, 3 = got it, 4 = easy.

const AGAIN := 1
const HARD := 2
const GOOD := 3
const EASY := 4
const DAY_MS := 86400000.0
const DECAY := -0.5
const FACTOR := 19.0 / 81.0
## FSRS-5 default parameters, fitted on hundreds of millions of reviews.
const W := [0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192,
	1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621]
const DEFAULT_RETENTION := 0.9
const MAX_INTERVAL_DAYS := 36500.0


static func now_ms() -> float:
	return Time.get_unix_time_from_system() * 1000.0


## Probability you still remember it, 0..1, `t_days` after the last review.
static func retrievability(stability: float, t_days: float) -> float:
	return pow(1.0 + FACTOR * max(t_days, 0.0) / max(stability, 0.01), DECAY)


static func card_retrievability(card, at_ms: float) -> float:
	if card == null:
		return 0.0
	return retrievability(card.s, (at_ms - card.last) / DAY_MS)


## Days until recall probability falls to `retention`.
static func interval_days(stability: float, retention: float = DEFAULT_RETENTION) -> float:
	var days := stability / FACTOR * (pow(retention, 1.0 / DECAY) - 1.0)
	return clampf(round(days), 1.0, MAX_INTERVAL_DAYS)


static func _init_difficulty(grade: int) -> float:
	return clampf(W[4] - exp(W[5] * (grade - 1)) + 1.0, 1.0, 10.0)


static func _next_difficulty(d: float, grade: int) -> float:
	var delta: float = -W[6] * (grade - 3)
	var d2 := d + delta * (10.0 - d) / 9.0
	# drift back towards the default so one bad day doesn't stick forever
	return clampf(W[7] * _init_difficulty(EASY) + (1.0 - W[7]) * d2, 1.0, 10.0)


static func _stability_after_success(d: float, s: float, r: float, grade: int) -> float:
	var hard_penalty: float = W[15] if grade == HARD else 1.0
	var easy_bonus: float = W[16] if grade == EASY else 1.0
	return s * (exp(W[8]) * (11.0 - d) * pow(s, -W[9]) * (exp(W[10] * (1.0 - r)) - 1.0) * hard_penalty * easy_bonus + 1.0)


static func _stability_after_lapse(d: float, s: float, r: float) -> float:
	var s2: float = W[11] * pow(d, -W[12]) * (pow(s + 1.0, W[13]) - 1.0) * exp(W[14] * (1.0 - r))
	return min(s2, s)


## Returns the updated card after a review with `grade` at time `at_ms`.
static func review(card, grade: int, at_ms: float = -1.0, retention: float = DEFAULT_RETENTION) -> Dictionary:
	if at_ms < 0.0:
		at_ms = now_ms()
	grade = clampi(grade, AGAIN, EASY)
	var out := {}
	if card == null or not (card is Dictionary) or not card.has("s"):
		out = { s = float(W[grade - 1]), d = _init_difficulty(grade), reps = 1, lapses = 1 if grade == AGAIN else 0 }
	else:
		var s: float = card.s
		var d: float = card.d
		var elapsed: float = (at_ms - float(card.get("last", at_ms))) / DAY_MS
		var s2: float
		if elapsed < 1.0:
			# reviewed again the same day: only a small nudge
			s2 = s * exp(W[17] * (grade - 3 + W[18]))
		elif grade == AGAIN:
			s2 = _stability_after_lapse(d, s, retrievability(s, elapsed))
		else:
			s2 = _stability_after_success(d, s, retrievability(s, elapsed), grade)
		out = { s = max(s2, 0.1), d = _next_difficulty(d, grade), reps = int(card.get("reps", 0)) + 1,
			lapses = int(card.get("lapses", 0)) + (1 if grade == AGAIN else 0) }
	var days: float = 1.0 if grade == AGAIN else interval_days(out.s, retention)
	out.last = at_ms
	out.due = at_ms + days * DAY_MS
	return out


static func is_due(card, at_ms: float = -1.0) -> bool:
	if card == null:
		return true
	if at_ms < 0.0:
		at_ms = now_ms()
	return float(card.due) <= at_ms


## Seeds a card from the web app's old per-palace SM-2 schedule.
static func from_sm2(srs) -> Variant:
	if srs == null or not (srs is Dictionary) or not srs.has("dueAt"):
		return null
	var interval: float = max(float(srs.get("interval", 1)), 1.0)
	return { s = interval, d = 5.0, reps = int(srs.get("reps", 1)), lapses = 0,
		last = float(srs.get("lastAt", float(srs.dueAt) - interval * DAY_MS)), due = float(srs.dueAt) }
