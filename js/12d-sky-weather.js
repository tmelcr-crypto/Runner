'use strict';
/* ---------- 7e. DAY, NIGHT & WEATHER ----------
   A clock runs with the game: a whole day lasts SKYP.dayMinutes real minutes. Dawn and dusk are the hour and a half around sunrise
   and sunset. The light (colour, strength and where the sun stands), the fog, the sea, the lit windows, the neon, the street lights
   and the headlights all follow the hour: a hazy blue day, a pink dawn, a purple dusk, the neon night.
   Every few minutes the weather may change (chances in js/01d), blending in over SKYP.blend seconds:
     clear;  cloudy - a weaker sun, greyer light;  rain - falling streaks and splashes, roads that get wet (and shine with the lights
     at night), less grip, slower traffic, people under umbrellas, the hiss of rain;  storm - a wind-driven downpour, lightning and
     thunder;  fog - you, and the police, see less far.
   Settings: js/01d-sky-data.js (SKYP). The engine: updateSky (game time, from js/15) and applySky (every frame, from js/13). */
const SKY = { hour: 12, night: 0, kind: 'clear', left: 60, cloud: 0, rain: 0, fog: 0, storm: 0, wet: 0, flash: 0, boltT: 6, thunderT: -1, vis: 1, grip: 1, wind: 0 };
const WX_KINDS = { clear: [0, 0, 0, 0], cloudy: [0.75, 0, 0.12, 0], rain: [0.85, 0.55, 0.25, 0], storm: [1, 1, 0.35, 1], fog: [0.45, 0, 1, 0] };   // cloud, rain, fog, storm
const WX_NAME = { clear: 'CLEAR', cloudy: 'CLOUDY', rain: 'RAIN', storm: 'STORM', fog: 'FOG' };
function setWeather(k, now) {           // now: no blending (a new game, or a test)
  SKY.kind = k; SKY.left = rand(SKYP.wxMin, Math.max(SKYP.wxMin, SKYP.wxMax));
  if (now) { const w = WX_KINDS[k]; SKY.cloud = w[0]; SKY.rain = w[1]; SKY.fog = w[2]; SKY.storm = w[3]; SKY.wet = w[1] > 0 ? 1 : 0; }
}
function resetSky() { SKY.hour = OPT.time; setWeather(OPT.weather === 'change' ? 'clear' : OPT.weather, true); SKY.flash = 0; SKY.thunderT = -1; }   // OPT: js/06
function nextWeather() {
  const ch = [['clear', SKYP.pClear], ['cloudy', SKYP.pCloudy], ['rain', SKYP.pRain], ['storm', SKYP.pStorm], ['fog', SKYP.pFog]];
  let r = Math.random() * ch.reduce((a, c) => a + c[1], 0); for (const [k, p] of ch) if ((r -= p) <= 0) return k; return 'clear';
}
const smooth01 = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function dayness(h) { return smooth01(SKYP.sunrise - 0.75, SKYP.sunrise + 0.75, h) * (1 - smooth01(SKYP.sunset - 0.75, SKYP.sunset + 0.75, h)); }
function updateSky(dt) {
  SKY.hour = (SKY.hour + dt * 24 * OPT.clock / SKYP.dayMinutes) % 24;
  if ((SKY.left -= dt) <= 0) setWeather(OPT.weather === 'change' ? nextWeather() : OPT.weather);
  const w = WX_KINDS[SKY.kind], st = dt / SKYP.blend, to = (v, t) => v < t ? Math.min(t, v + st) : Math.max(t, v - st);
  SKY.cloud = to(SKY.cloud, w[0]); SKY.rain = to(SKY.rain, w[1]); SKY.fog = to(SKY.fog, w[2]); SKY.storm = to(SKY.storm, w[3]);
  SKY.wet = clamp(SKY.rain > 0.05 ? SKY.wet + dt * SKY.rain * 3 / SKYP.dryTime : SKY.wet - dt / SKYP.dryTime, 0, 1);   // soaked in a third of the drying time
  SKY.night = 1 - dayness(SKY.hour);
  SKY.vis = lerp(1, SKYP.sightNight, SKY.night) * lerp(1, SKYP.sightRain, Math.min(1, SKY.rain)) * lerp(1, SKYP.sightFog, SKY.fog);   // how far the police see (js/08b)
  SKY.grip = lerp(1, lerp(SKYP.rainGrip, SKYP.stormGrip, SKY.storm), SKY.wet);                                                     // tyre grip (js/07)
  SKY.wind = 160 * SKY.storm + 30 * SKY.rain;
  if (SKY.storm > 0.6 && (SKY.boltT -= dt) <= 0) { SKY.flash = 1; SKY.boltT = rand(4, 12) / SKY.storm; SKY.thunderT = rand(0.3, 2.5); }   // lightning, then thunder
  if (SKY.thunderT >= 0 && (SKY.thunderT -= dt) < 0) Snd.thunder();
  Snd.setRain(SKY.rain);
}

/* ---------- the look of the hour ---------- */
const SKY_P = (bg, sky, gnd, hi, sun, si, water) => ({ bg: new THREE.Color(bg), sky: new THREE.Color(sky), gnd: new THREE.Color(gnd), hi, sun: new THREE.Color(sun), si, water: new THREE.Color(water) });
const SKY_NIGHT = SKY_P(0x08030f, 0x8a7cff, 0x2a1245, 0.95, 0x9fc4ff, 0.6, 0x1d5fe0), SKY_DAY = SKY_P(0x86b4e0, 0xe8eeff, 0x6a5a80, 0.5, 0xfff0d8, 0.62, 0x2f86e8);
const SKY_DAWN = SKY_P(0xc87a8a, 0xffc0a8, 0x5a3a6a, 0.72, 0xffa070, 0.65, 0x4a6ad8), SKY_DUSK = SKY_P(0x8a3a72, 0xff9ab8, 0x4a2060, 0.75, 0xff7a48, 0.65, 0x3a4ac8);
const SKY_CUR = SKY_P(0, 0, 0, 0, 0, 0, 0), _sc = new THREE.Color(), MOON = new THREE.Vector3(-600, 1000, -400), _sv = new THREE.Vector3();
const GREY_D = new THREE.Color(0xb8c0cc), GREY_N = new THREE.Color(0x2a2a38), FOG_D = new THREE.Color(0xc8ced8), FOG_N = new THREE.Color(0x2a2438), STORM_C = new THREE.Color(0x3a3f4a), FLASH_C = new THREE.Color(0xe8eeff);
let LIGHT_POOL_M = null, ROAD_M = null;       // set by js/10: the street-light pools, the road surface
function mixPalette(h) {
  const d = dayness(h), bell = (c, x) => Math.max(0, 1 - Math.abs(x - c) / 1.1), dawn = bell(SKYP.sunrise, h) * 0.75, dusk = bell(SKYP.sunset, h) * 0.75, C = SKY_CUR;
  for (const k of ['bg', 'sky', 'gnd', 'sun', 'water']) { C[k].copy(SKY_NIGHT[k]).lerp(SKY_DAY[k], d).lerp(SKY_DAWN[k], dawn).lerp(SKY_DUSK[k], dusk); }
  for (const k of ['hi', 'si']) C[k] = lerp(lerp(lerp(SKY_NIGHT[k], SKY_DAY[k], d), SKY_DAWN[k], dawn), SKY_DUSK[k], dusk);
  return C;
}
function applySky(dt) {                       // every frame: lights, fog, sea, glows, wet roads, rain, lightning
  const C = mixPalette(SKY.hour), n = SKY.night, day = 1 - n;
  const grey = _sc.copy(GREY_N).lerp(GREY_D, day);
  C.bg.lerp(grey, 0.5 * SKY.cloud).lerp(STORM_C, 0.55 * SKY.storm * day); C.sky.lerp(grey, 0.45 * SKY.cloud);
  SKY.flash = Math.max(0, SKY.flash - dt * 3.2); const fl = SKY.flash > 0.55 || (SKY.flash > 0.15 && SKY.flash < 0.3) ? SKY.flash : SKY.flash * 0.3;   // a double flicker
  hemi.color.copy(C.sky); hemi.groundColor.copy(C.gnd); hemi.intensity = C.hi * (1 - 0.3 * SKY.storm) * (1 - 0.12 * SKY.cloud) + 2.2 * fl;
  sun.color.copy(C.sun); sun.intensity = C.si * (1 - 0.7 * SKY.cloud);
  const u = clamp((SKY.hour - SKYP.sunrise) / (SKYP.sunset - SKYP.sunrise), 0, 1), el = Math.sin(Math.PI * u);   // the sun crosses from east to west
  sun.position.lerpVectors(MOON, _sv.set(Math.cos(Math.PI * u) * 1000, 300 + 900 * el, 500 * el), day);
  const fogC = _sc.copy(FOG_N).lerp(FOG_D, day);
  scene.background.copy(C.bg).lerp(fogC, SKY.fog).lerp(FLASH_C, fl * 0.8); scene.fog.color.copy(scene.background);
  if (state !== 'preview') { const D = camDist(); scene.fog.near = lerp(1700, D * 0.42, SKY.fog) * (1 - 0.2 * SKY.rain); scene.fog.far = lerp(3800, D * 1.3, SKY.fog) * (1 - 0.15 * SKY.rain); }
  if (waterMat) waterMat.color.copy(C.water).lerp(grey, 0.3 * SKY.cloud);
  /* lit windows, neon, light pools: bright at night, faint by day; wet roads darken and shine with the lights */
  const win = lerp(SKYP.dayWindows, 1, n), neon = lerp(SKYP.dayGlow, 1, n), shine = 1 + 0.6 * SKY.wet * n;
  for (const m of EMI_MATS) m.emissiveIntensity = win;
  for (const m of NEON_MATS) m.color.setScalar(neon);
  for (const k in glowMats) { const m = glowMats[k]; m.opacity = m.userData.base * (m.userData.nightOnly ? n : neon) * shine; }
  if (LIGHT_POOL_M) LIGHT_POOL_M.opacity = 0.55 * n * shine;
  if (ROAD_M) ROAD_M.color.setScalar(1 - 0.35 * SKY.wet);
  drawRain(dt);
  const fo = fl > 0.05 ? (fl * 0.35).toFixed(2) : '0'; if (fo !== SKY.fo) { SKY.fo = fo; $('flashFx').style.opacity = fo; }   // the screen lights up
}

/* ---------- rain: streaks falling round the camera, splashes where they land ---------- */
let RAIN = null;
function rainSetup() {
  const n = Math.max(100, Math.round(SKYP.drops)), pos = new Float32Array(n * 6), g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.attributes.position.setUsage(THREE.DynamicDrawUsage);
  const mesh = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xc4d0ff, transparent: true, opacity: 0.45, depthWrite: false, fog: false }));
  mesh.frustumCulled = false; mesh.visible = false; scene.add(mesh);
  RAIN = { n, pos, mesh, x: new Float32Array(n), y: new Float32Array(n).map(() => rand(0, 420)), z: new Float32Array(n), s: new Float32Array(n).map(() => rand(750, 1050)), live: false };
}
function drawRain(dt) {
  if (!RAIN) rainSetup();
  const amt = Math.min(1, SKY.rain); RAIN.mesh.visible = amt > 0.01 && state !== 'preview'; if (!RAIN.mesh.visible) { RAIN.live = false; return; }
  const n = Math.floor(RAIN.n * amt), R = visRadius() * 1.05, cx = cam.x, cz = cam.y, wx = SKY.wind, p = RAIN.pos;
  RAIN.mesh.material.color.setHex(SKY.night > 0.5 ? 0xb8c6ff : 0xe4e8f0);
  for (let i = 0; i < n; i++) {
    let x = RAIN.x[i], y = RAIN.y[i] - RAIN.s[i] * dt, z = RAIN.z[i];
    if (!RAIN.live || y < 0 || Math.abs(x - cx) > R || Math.abs(z - cz) > R) {
      if (RAIN.live && y < 0 && i % 24 === 0 && Math.abs(x - cx) < R * 0.7) addP({ x, y: z, z: 2, vz: rand(40, 70), grav: 420, vx: rand(-18, 18), vy: rand(-18, 18), life: 0.28, max: 0.28, s0: 3, s1: 1.5, col: '#d8e4ff', drag: 0, alpha: 0.7 });   // a splash
      x = cx + rand(-R, R); z = cz + rand(-R, R); y = RAIN.live ? rand(330, 420) : rand(0, 420);
    }
    x += wx * dt; RAIN.x[i] = x; RAIN.y[i] = y; RAIN.z[i] = z;
    const L = 26 + RAIN.s[i] * 0.02, j = i * 6;
    p[j] = x; p[j + 1] = y; p[j + 2] = z; p[j + 3] = x - wx * 0.035; p[j + 4] = y + L; p[j + 5] = z;
  }
  RAIN.live = true; RAIN.mesh.geometry.setDrawRange(0, n * 2); RAIN.mesh.geometry.attributes.position.needsUpdate = true;
}
const clockText = () => { const h = Math.floor(SKY.hour), m = Math.floor((SKY.hour - h) * 60); return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'); };
function skyText() {                          // the HUD line under the stars: the time, then the weather, or the part of the day when clear
  const h = SKY.hour, near = (a, b) => Math.abs(a - b) < 0.75;
  return clockText() + '  ' + (SKY.kind !== 'clear' ? WX_NAME[SKY.kind] : near(h, SKYP.sunrise) ? 'DAWN' : near(h, SKYP.sunset) ? 'DUSK' : SKY.night > 0.5 ? 'NIGHT' : 'DAY');
}
