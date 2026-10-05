// Walls, floors and ceilings: real photo-scanned textures mapped in world space
// (so they never stretch, whatever the shape), with large-scale variation that
// hides tiling, grime rising from the floor and soot on ceilings.
shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_back, diffuse_burley, specular_schlick_ggx;

uniform sampler2D albedo_tex : source_color, filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D normal_tex : hint_normal, filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D rough_tex : hint_default_white, filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D noise_tex : hint_default_white, filter_linear_mipmap, repeat_enable;
uniform vec3 tint : source_color = vec3(1.0);
uniform float tile_metres = 2.0;
uniform float grime = 0.3;
uniform float wet = 0.0;
uniform float normal_strength = 1.0;
uniform float roughness_scale = 1.0;

varying vec3 wpos;
varying vec3 wnorm;

void vertex() {
	wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	wnorm = normalize((MODEL_MATRIX * vec4(NORMAL, 0.0)).xyz);
}

vec3 unpack_n(vec4 c) {
	vec3 n = c.xyz * 2.0 - 1.0;
	n.xy *= normal_strength;
	return n;
}

void fragment() {
	vec3 n = normalize(wnorm);
	vec3 bw = pow(abs(n), vec3(6.0));
	bw /= (bw.x + bw.y + bw.z);
	vec3 p = wpos / tile_metres;
	vec2 ux = p.zy, uy = p.xz, uz = p.xy;

	vec3 col = texture(albedo_tex, ux).rgb * bw.x + texture(albedo_tex, uy).rgb * bw.y + texture(albedo_tex, uz).rgb * bw.z;
	float rough = texture(rough_tex, ux).r * bw.x + texture(rough_tex, uy).r * bw.y + texture(rough_tex, uz).r * bw.z;

	// world-space normal mapping, blended across the three projections
	vec3 tx = unpack_n(texture(normal_tex, ux));
	vec3 ty = unpack_n(texture(normal_tex, uy));
	vec3 tz = unpack_n(texture(normal_tex, uz));
	vec3 nx = vec3(tx.xy + n.zy, abs(tx.z) * n.x).zyx;
	vec3 ny = vec3(ty.xy + n.xz, abs(ty.z) * n.y).xzy;
	vec3 nz = vec3(tz.xy + n.xy, abs(tz.z) * n.z);
	vec3 wn = normalize(nx * bw.x + ny * bw.y + nz * bw.z);

	// age: two octaves of large-scale variation, grime from the floor, soot overhead
	vec2 gp = abs(n.y) > 0.5 ? wpos.xz : vec2(wpos.x + wpos.z, wpos.y);
	float g1 = texture(noise_tex, gp / 13.0).r;
	float g2 = texture(noise_tex, gp / 3.1 + 0.37).g;
	float v = mix(0.78, 1.1, g1) * mix(0.9, 1.06, g2);
	float wall = 1.0 - abs(n.y);
	v *= 1.0 - grime * wall * (1.0 - smoothstep(0.0, 0.5 + g1 * 1.1, wpos.y));
	v *= 1.0 - 0.22 * step(0.5, -n.y) * g2;
	col *= v * tint;

	// rain-soaked floors: darker, glossier where puddles gather
	float puddle = wet * step(0.5, n.y) * smoothstep(0.45, 0.7, g1 * 0.6 + g2 * 0.5);
	col *= 1.0 - 0.35 * wet * step(0.5, n.y) - 0.15 * puddle;
	rough = clamp(rough * roughness_scale * mix(0.82, 1.12, g1), 0.04, 1.0);
	rough = mix(rough, 0.06, puddle);

	ALBEDO = col;
	ROUGHNESS = rough;
	METALLIC = 0.0;
	SPECULAR = 0.5;
	NORMAL = normalize((VIEW_MATRIX * vec4(mix(n, wn, 1.0 - puddle * 0.8), 0.0)).xyz);
}
