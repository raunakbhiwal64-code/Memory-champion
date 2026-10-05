extends RefCounted
## Per-memory scheduling.

func run(t):
	var day := Fsrs.DAY_MS
	var t0 := 1.7e12
	var c := Fsrs.review(null, Fsrs.GOOD, t0)
	t.check("first 'got it' gives a ~3 day stability", absf(c.s - 3.173) < 0.001)
	t.check("first 'got it' is due in 3 days at 90% retention", absf((c.due - t0) / day - 3.0) < 0.01)
	t.check("difficulty starts mid-range", c.d > 4.0 and c.d < 6.0)
	var easy := Fsrs.review(null, Fsrs.EASY, t0)
	var again := Fsrs.review(null, Fsrs.AGAIN, t0)
	t.check("easy starts further out than good", easy.due > c.due)
	t.check("a miss comes back tomorrow", absf((again.due - t0) / day - 1.0) < 0.01)
	t.check("a miss counts as a lapse", again.lapses == 1)

	# reviewing on time with "got it" grows the interval each time
	var card := c
	var at := t0
	var prev_interval := 0.0
	var grows := true
	for i in 5:
		at = card.due
		card = Fsrs.review(card, Fsrs.GOOD, at)
		var interval: float = (card.due - at) / day
		if interval <= prev_interval:
			grows = false
		prev_interval = interval
	t.check("intervals grow with each successful review", grows)
	t.check("after 6 good reviews the next one is months away", prev_interval > 60.0)
	var lapsed := Fsrs.review(card, Fsrs.AGAIN, card.due)
	t.check("forgetting a mature memory cuts its stability", lapsed.s < card.s)
	t.check("forgetting raises difficulty", lapsed.d > card.d)
	var hard := Fsrs.review(c, Fsrs.HARD, c.due)
	var good := Fsrs.review(c, Fsrs.GOOD, c.due)
	var easy2 := Fsrs.review(c, Fsrs.EASY, c.due)
	t.check("hard < good < easy", hard.s < good.s and good.s < easy2.s)
	var same_day := Fsrs.review(c, Fsrs.GOOD, t0 + 3600000.0)
	t.check("re-reviewing the same day barely changes stability", absf(same_day.s - c.s) / c.s < 0.6)
	t.check("retrievability is 90% when due", absf(Fsrs.card_retrievability(c, c.due) - 0.9) < 0.01)
	t.check("never-reviewed counts as due", Fsrs.is_due(null))
	t.check("not due before its date", not Fsrs.is_due(c, t0 + day))
	var higher := Fsrs.review(null, Fsrs.GOOD, t0, 0.95)
	t.check("a higher target retention schedules sooner", higher.due < c.due)
	var old := Fsrs.from_sm2({ ef = 2.5, interval = 6, reps = 2, dueAt = t0 + 2 * day, lastAt = t0 - 4 * day })
	t.check("old SM-2 schedules seed a card with the same due date", old.due == t0 + 2 * day and old.s == 6.0)
	t.check("no SM-2 schedule means a new card", Fsrs.from_sm2(null) == null)
	return true
