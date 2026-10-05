class_name CastlePlayer
extends RefCounted
## Walking and the third-person camera. Movement is camera-relative and slides
## along walls; the camera looks over the keeper's shoulder and pulls in rather
## than clipping through a wall or ceiling. Same feel as the web version.

const RADIUS := 0.42
const WALK := 3.3
const RUN := 6.2

var position := Vector3.ZERO
var yaw := 0.0
var speed := 0.0
var cam_yaw := 0.0
var cam_pitch := 0.28
var cam_dist := 5.5
var cur_dist := 5.5
var colliders: Array  ## [x, z, r]


func _init(p_colliders: Array) -> void:
	colliders = p_colliders


static func walkable(x: float, z: float) -> bool:
	return CastleLayout.cell_at(int(floor(x / CastleLayout.T)), int(floor(z / CastleLayout.T))) != -1


func blocked(x: float, z: float) -> bool:
	var r := RADIUS
	if not walkable(x - r, z - r) or not walkable(x + r, z - r) or not walkable(x - r, z + r) or not walkable(x + r, z + r):
		return true
	for c in colliders:
		var dx: float = x - c[0]
		var dz: float = z - c[1]
		var rr: float = c[2] + r
		if dx * dx + dz * dz < rr * rr:
			return true
	return false


func place_at(x: float, z: float, p_yaw: float) -> void:
	position = Vector3(x, 0, z)
	yaw = p_yaw
	speed = 0.0
	cam_yaw = p_yaw + PI
	cam_pitch = 0.28


## fwd/side in -1..1 (keyboard or joystick), turn turns the camera.
func move(dt: float, fwd: float, side: float, turn: float, run: bool) -> void:
	cam_yaw += turn * dt * 2.0
	var len := Vector2(fwd, side).length()
	if len < 0.05:
		speed = max(0.0, speed - dt * 12.0)
		return
	fwd /= max(1.0, len)
	side /= max(1.0, len)
	var target: float = (RUN if run else WALK) * minf(1.0, len)
	speed += (target - speed) * min(1.0, dt * 10.0)
	var fx := -sin(cam_yaw)
	var fz := -cos(cam_yaw)
	var rx := -fz
	var rz := fx
	var m := Vector2(fx * fwd + rx * side, fz * fwd + rz * side).normalized()
	var step := speed * dt
	var nx := position.x + m.x * step
	var nz := position.z + m.y * step
	if not blocked(nx, position.z):
		position.x = nx
	if not blocked(position.x, nz):
		position.z = nz
	yaw = lerp_angle(yaw, atan2(m.x, m.y), min(1.0, dt * 12.0))


static func _camera_clear(x: float, y: float, z: float) -> bool:
	if not walkable(x, z):
		return false
	var r = CastleLayout.room_at(x, z)
	if r == null:
		return y < float(CastleLayout.castle().doorH) - 0.3
	return y < float(r.h) - 0.5 or r.ceiling == "sky" or r.ceiling == "dome"


## Places the camera; returns how far it is from the keeper (to hide them when very close).
func update_camera(cam: Camera3D, dt: float) -> float:
	cam_pitch = clampf(cam_pitch, 0.02, 1.15)
	cam_dist = clampf(cam_dist, 2.2, 10.0)
	var sh: float = min(0.55, cur_dist * 0.12)
	var tx := position.x + cos(cam_yaw) * sh
	var tz := position.z - sin(cam_yaw) * sh
	if not walkable(tx, tz):
		tx = position.x
		tz = position.z
	var ty := 1.75
	var d := Vector3(sin(cam_yaw) * cos(cam_pitch), sin(cam_pitch), cos(cam_yaw) * cos(cam_pitch))
	var allowed := cam_dist
	var s := 0.3
	while s <= cam_dist:
		if not _camera_clear(tx + d.x * s, ty + d.y * s, tz + d.z * s):
			allowed = max(0.6, s - 0.35)
			break
		s += 0.15
	cur_dist = allowed if allowed < cur_dist else cur_dist + (allowed - cur_dist) * min(1.0, dt * 4.0)
	var target := Vector3(tx, ty, tz)
	cam.position = target + d * cur_dist
	cam.look_at(target, Vector3.UP)
	return cur_dist
