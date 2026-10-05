extends RefCounted
## Content, palaces, library chunking and drill scoring.

func run(t) -> void:
	t.check("18 lessons in 6 levels", Content.all_lessons().size() == 18 and Content.curriculum.size() == 6)
	t.check("lesson bodies are BBCode, not HTML", not Content.find_lesson("l1-2").body.contains("<p>") and Content.find_lesson("l1-2").body.contains("[b]"))
	t.check("40 castle stations across 8 rooms", Content.castle.stations.size() == 40 and Content.castle.rooms.size() == 8)
	t.check("100 Major System words", Content.major_defaults.size() == 100)
	t.check("drill prerequisites point at real lessons", Content.drill_prerequisites.values().all(func(ids): return ids.all(func(id): return Content.find_lesson(id) != null)))

	t.reset_db()
	var c := DB.open_or_create_castle()
	t.check("a castle palace has 40 stations with room-qualified titles", c.loci.size() == 40 and c.loci[0].title == "Iron gate — Moonlit Courtyard")
	t.check("open_or_create_castle reuses the existing castle", DB.open_or_create_castle() == c)
	t.check("an empty castle has nothing to recall", not DB.palace_has_recall_content(c) and DB.palace_status(c).text == "Nothing stored yet")
	var placed := DB.place_items_in_palace(c, [{ text = "one", source = "Deck" }, { text = "two", source = "Deck" }], "append")
	t.check("castles fill empty stations in route order even when asked to append", placed == 2 and c.loci.size() == 40 and c.loci[1].content.text == "two")
	t.check("new memories are due for their first review", DB.due_loci(c).size() == 2 and DB.palace_status(c).due)
	DB.finish_palace_walk(c, DB.due_loci(c), [Fsrs.GOOD, Fsrs.AGAIN])
	t.check("after a walk only reviewed-and-due memories remain", DB.due_loci(c).size() == 0)
	t.check("the walk is logged with a score", DB.data.history[0].type == "palace-walk" and DB.data.history[0].correct == 1 and DB.data.history[0].total == 2)
	t.check("a missed memory comes back sooner than a remembered one", c.loci[1].review.due < c.loci[0].review.due)
	t.check("status shows the next review", DB.palace_status(c).text.begins_with("Next review"))
	t.check("tomorrow, the missed one is due again", DB.due_loci(c, Util.now_ms() + 1.5 * Fsrs.DAY_MS).size() == 1)

	var p := DB.new_palace("Office")
	t.check("a list palace appends new stations", DB.place_items_in_palace(p, [{ text = "a" }, { text = "b" }], "append") == 2 and p.loci.size() == 2)
	t.check("fill mode only uses empty stations", DB.place_items_in_palace(p, [{ text = "c" }], "fill") == 0)

	t.check("sentences split on . ! ?", TextChunker.chunk("First one here. Second one!  Third?", "sentence") == ["First one here.", "Second one!", "Third?"])
	t.check("lines split on newlines", TextChunker.chunk("alpha line\n\nbeta line\ngamma line", "line").size() == 3)
	t.check("paragraphs split on blank lines", TextChunker.chunk("para one\nstill one\n\npara two", "paragraph") == ["para one still one", "para two"])
	t.check("tiny fragments are dropped", TextChunker.chunk("ok. This one stays.", "sentence") == ["This one stays."])

	var deck := DB.new_deck("Stoics", "notes.txt", ["The obstacle is the way.", "Memento mori."])
	t.check("a new deck's items are all due", DB.due_items(deck).size() == 2)
	deck.items[0].marked = true
	t.check("marked items are gathered across decks", DB.all_marked_items().size() == 1)
	DB.finish_deck_practice(deck.title, deck.items, [Fsrs.EASY, Fsrs.HARD])
	t.check("deck practice schedules each item", DB.due_items(deck).size() == 0 and DB.data.history[0].type == "deck-recall")

	var rng := RandomNumberGenerator.new()
	rng.seed = 42
	t.check("number drills generate digits", DrillLogic.generate("numbers", 16, rng).all(func(x): return x.length() == 1 and x.is_valid_int()))
	var words := DrillLogic.generate("words", 26, rng)
	t.check("word drills never repeat a word", words.size() == 26 and words.size() == Array(words).reduce(func(acc, w): return acc if acc.has(w) else acc + [w], []).size())
	var cards := DrillLogic.generate("cards", 80, rng)
	t.check("card drills cap at one deck", cards.size() == 52 and DrillLogic.item_count("cards", 9) == 52)
	t.check("card answers accept T for 10 and lowercase", DrillLogic.normalize_card(" th ") == "10H")
	var sc := DrillLogic.score_sequence(["1", "2", "3", "4"], ["1", "2", "9", "4"], false)
	t.check("sequence scoring counts correct and the opening run", sc.correct == 3 and sc.run == 2)
	t.check("word scoring ignores case", DrillLogic.score_sequence(["Apple"], ["apple"], true).correct == 1)
	t.check("blank answers never count", DrillLogic.score_sequence([""], [""], false).correct == 0)
	t.check("image order scoring", DrillLogic.score_order([0, 1, 3, 2], 4).correct == 2 and DrillLogic.score_order([0, 1, 3, 2], 4).run == 2)
	t.check("names scoring", DrillLogic.score_names([{ name = "Meera Rao" }], ["meera rao "]).correct == 1)

	DB.toggle_lesson("l1-2")
	t.check("drills unlock as prerequisite lessons are learned", DB.missing_prerequisites("words").is_empty() and DB.missing_prerequisites("numbers").size() == 1)
	t.check("streak counts today", DB.compute_streak() == 1)
	DB.log_history({ type = "drill", discipline = "words", label = "Words", level = 2, correct = 9, total = 12, accuracy = 75 })
	DB.log_history({ type = "drill", discipline = "words", label = "Words", level = 3, correct = 11, total = 16, accuracy = 69 })
	t.check("best score per discipline", DB.best_score_for("words").correct == 11)
	DB.data.majorSystem.overrides["07"] = "sock"
	t.check("Major System overrides win over defaults", DB.major_word("07") == "sock" and DB.major_word("08") == "safe")
	var img := Image.create(800, 400, false, Image.FORMAT_RGB8)
	img.fill(Color(0.8, 0.2, 0.2))
	var url := Util.data_url_from_image(img)
	var back := Util.image_from_data_url(url)
	t.check("photos are shrunk to 480px JPEG data URLs and decode again", url.begins_with("data:image/jpeg;base64,") and back != null and back.get_width() == 480)
