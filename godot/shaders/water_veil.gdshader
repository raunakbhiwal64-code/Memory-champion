// A thin sheet of water falling over a basin's rim: streaks scrolling down.
shader_type spatial;
render_mode blend_mix, depth_draw_never, cull_disabled, specular_schlick_ggx;

float hash(float n) { return fract(sin(n) * 43758.5453); }

void fragment() {
	float u = UV.x * 64.0;
	float col = floor(u);
	float streak = smoothstep(0.5, 0.0, abs(fract(u) - 0.5) * (1.0 + hash(col) * 2.0));
	float flow = fract(UV.y * (1.5 + hash(col + 3.0)) - TIME * (1.2 + hash(col + 7.0)));
	float a = streak * (0.25 + 0.6 * smoothstep(0.0, 0.6, flow)) * (0.4 + hash(col + 11.0) * 0.6);
	ALBEDO = vec3(0.78, 0.86, 0.92);
	ROUGHNESS = 0.08;
	SPECULAR = 0.8;
	ALPHA = clamp(a * 0.75, 0.0, 0.8);
}
