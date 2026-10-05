class_name Util
## Small shared helpers.

static var _counter := 0


static func uid() -> String:
	_counter += 1
	var t := int(Time.get_unix_time_from_system() * 1000.0)
	return _to36(t) + _to36(randi() % 2176782336).pad_zeros(6).substr(0, 6) + _to36(_counter % 1296)


static func _to36(n: int) -> String:
	const DIGITS := "0123456789abcdefghijklmnopqrstuvwxyz"
	if n <= 0:
		return "0"
	var s := ""
	while n > 0:
		s = DIGITS[n % 36] + s
		n /= 36
	return s


static func now_ms() -> float:
	return Time.get_unix_time_from_system() * 1000.0


static func format_time(seconds: int) -> String:
	seconds = max(seconds, 0)
	return "%02d:%02d" % [seconds / 60, seconds % 60]


static func plural(n: int, word: String, plural_word: String = "") -> String:
	return "%d %s" % [n, word if n == 1 else (plural_word if plural_word != "" else word + "s")]


static func chunk_string(s: String, size: int) -> Array:
	var out := []
	var i := 0
	while i < s.length():
		out.append(s.substr(i, size))
		i += size
	return out


## "Mar 4 · 14:05" in local time.
static func date_label(ms: float) -> String:
	const MONTHS := ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
	var unix := int(ms / 1000.0) + _tz_offset_seconds()
	var d := Time.get_datetime_dict_from_unix_time(unix)
	return "%s %d · %02d:%02d" % [MONTHS[d.month - 1], d.day, d.hour, d.minute]


## Local calendar day key, e.g. "2026-10-05".
static func day_key(ms: float) -> String:
	var d := Time.get_datetime_dict_from_unix_time(int(ms / 1000.0) + _tz_offset_seconds())
	return "%04d-%02d-%02d" % [d.year, d.month, d.day]


static func _tz_offset_seconds() -> int:
	return int(Time.get_time_zone_from_system().get("bias", 0)) * 60


## "in 3 days", "tomorrow", "today"
static func due_label(due_ms: float) -> String:
	var days := int(ceil((due_ms - now_ms()) / 86400000.0))
	if days <= 0:
		return "due now"
	if days == 1:
		return "tomorrow"
	if days < 60:
		return "in %d days" % days
	if days < 730:
		return "in %d months" % int(round(days / 30.0))
	return "in %d years" % int(round(days / 365.0))


# ---------- pictures stored as data URLs (same format as the web app) ----------

static func image_from_data_url(url: String) -> Image:
	if url == "" or not url.begins_with("data:image/"):
		return null
	var comma := url.find(",")
	if comma < 0:
		return null
	var raw := Marshalls.base64_to_raw(url.substr(comma + 1))
	var img := Image.new()
	var err := ERR_FILE_UNRECOGNIZED
	if url.begins_with("data:image/jpeg") or url.begins_with("data:image/jpg"):
		err = img.load_jpg_from_buffer(raw)
	elif url.begins_with("data:image/png"):
		err = img.load_png_from_buffer(raw)
	elif url.begins_with("data:image/webp"):
		err = img.load_webp_from_buffer(raw)
	return img if err == OK else null


static func texture_from_data_url(url) -> Texture2D:
	if url == null or not (url is String):
		return null
	var img := image_from_data_url(url)
	return ImageTexture.create_from_image(img) if img else null


## Shrinks a picture to fit `max_dim` and stores it as a JPEG data URL (~15-40 KB).
static func data_url_from_image(img: Image, max_dim: int = 480, quality: float = 0.62) -> String:
	var copy := img.duplicate() as Image
	if copy.is_compressed():
		copy.decompress()
	var w := copy.get_width()
	var h := copy.get_height()
	if w > max_dim or h > max_dim:
		var k := float(max_dim) / maxi(w, h)
		copy.resize(max(1, int(w * k)), max(1, int(h * k)), Image.INTERPOLATE_LANCZOS)
	copy.convert(Image.FORMAT_RGB8)
	return "data:image/jpeg;base64," + Marshalls.raw_to_base64(copy.save_jpg_to_buffer(quality))


static func load_image_file(path: String) -> Image:
	var img := Image.new()
	return img if img.load(path) == OK else null
