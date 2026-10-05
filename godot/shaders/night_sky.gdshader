// A clear night: deep blue overhead fading to a faint glow at the horizon,
// thousands of stars, a band of the Milky Way and a full moon with its halo.
shader_type sky;

uniform vec3 moon_dir = vec3(-0.3, 0.75, -0.6);

float hash(vec3 p) {
	p = fract(p * 0.3183099 + 0.1);
	p *= 17.0;
	return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float stars(vec3 d, float scale, float threshold) {
	vec3 p = d * scale;
	vec3 i = floor(p);
	vec3 f = fract(p) - 0.5;
	float h = hash(i);
	float s = smoothstep(threshold, 1.0, h);
	return s * smoothstep(0.5, 0.0, length(f + (vec3(hash(i + 1.7), hash(i + 3.1), hash(i + 5.3)) - 0.5) * 0.6));
}

void sky() {
	vec3 d = normalize(EYEDIR);
	float up = clamp(d.y, -1.0, 1.0);
	vec3 col = mix(vec3(0.07, 0.09, 0.17), vec3(0.008, 0.012, 0.035), smoothstep(0.0, 0.55, up));
	col = mix(col, vec3(0.13, 0.16, 0.26), smoothstep(0.12, 0.0, abs(up)) * 0.6);
	if (up < 0.0) col = vec3(0.02, 0.025, 0.03);
	float twinkle = 0.75 + 0.25 * sin(TIME * 3.0 + hash(floor(d * 300.0)) * 40.0);
	float st = stars(d, 300.0, 0.985) * 1.4 + stars(d, 700.0, 0.992) * 0.9;
	// the Milky Way: a tilted band of faint haze and dense small stars
	vec3 band_n = normalize(vec3(0.3, 0.55, 0.78));
	float band = exp(-pow(dot(d, band_n) * 4.5, 2.0));
	col += vec3(0.09, 0.1, 0.14) * band * (0.6 + 0.4 * hash(floor(d * 60.0)));
	st += stars(d, 1400.0, 0.985) * band * 1.2;
	col += vec3(1.0, 0.96, 0.9) * st * twinkle * smoothstep(-0.02, 0.15, up);
	vec3 md = normalize(moon_dir);
	float m = dot(d, md);
	col += vec3(0.75, 0.8, 1.0) * pow(max(m, 0.0), 300.0) * 0.6;
	col += vec3(0.55, 0.62, 0.85) * pow(max(m, 0.0), 30.0) * 0.12;
	col = mix(col, vec3(1.0, 0.97, 0.9) * 3.0, smoothstep(0.99965, 0.99975, m));
	COLOR = col;
}
