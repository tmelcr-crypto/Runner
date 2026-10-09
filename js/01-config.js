'use strict';
/* ---------- 1. CONFIG & HELPERS ---------- */
const MW = MAP.W, MH = MAP.H;                                          // world size (map from js/00-map-data.js)
// a street, from the centre line out: traffic lane (centre at LANE), parking lane (cars park at PARK_OFF), kerb at ROAD_HALF, sidewalk SW_W wide.
// With ROAD_W 132 a car parked at the kerb (only sedans and sports cars park there) stays clear of a truck passing in the lane.
const ROAD_W = MAP.roadW, ROAD_HALF = ROAD_W / 2, LANE = 19, PARK_OFF = ROAD_HALF - 14, SW_W = MAP.sw || 16;
const SIDEWALK = ROAD_HALF + SW_W / 2;                                  // people walk down the middle of the sidewalk
const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
function angDiff(a, b) { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; }

// real-world scale: 12 world units to the metre (a car is 54 units, 4.5 m long). Speeds are world units per second.
const UNITS_PER_M = 12, MPS = UNITS_PER_M, KMH = UNITS_PER_M / 3.6, G_ACC = 9.81 * UNITS_PER_M;
const LAT_GRIP = 2 * G_ACC;                                   // cornering limit: about twice a road car's grip, so driving stays fun
const acc0to100 = (top, secs) => -top * KMH * Math.log(1 - 100 / top) / secs;   // throttle force that reaches 100 km/h in `secs`
const CAR_TYPES = {  // top speed and 0-100 km/h as on the road (a little quicker off the line), braking about 1 g; armored: true stops rifle rounds (none yet)
  sedan:  { name: 'SEDAN',  len: 54, wid: 26, max: 180 * KMH, acc: acc0to100(180, 7),   brake: 9.5 * MPS,  turn: 2.7, grip: 5.5, hp: 100, mass: 1.0,  colors: ['#ff2bd6', '#2bf3ff', '#a259ff', '#ffe14a', '#3dffa6', '#6f86ff'] },
  sports: { name: 'SPORTS', len: 52, wid: 24, max: 260 * KMH, acc: acc0to100(260, 4),   brake: 10.5 * MPS, turn: 3.0, grip: 3.4, hp: 70,  mass: 0.85, colors: ['#ff2bd6', '#ffe14a', '#2bf3ff', '#ff4d4d'] },
  truck:  { name: 'TRUCK',  len: 78, wid: 33, max: 130 * KMH, acc: acc0to100(130, 12),  brake: 7.5 * MPS,  turn: 1.9, grip: 6.5, hp: 220, mass: 2.4,  colors: ['#3d6fff', '#ff7a3d', '#3dffa6', '#b79cff'] },
  police: { name: 'POLICE', len: 54, wid: 26, max: 220 * KMH, acc: acc0to100(220, 5.5), brake: 10 * MPS,   turn: 2.9, grip: 5.0, hp: 130, mass: 1.1,  colors: ['#171a24'] }
};
const WALK = 1.4 * MPS, RUN = 5 * MPS, SPRINT = 7 * MPS;      // people: a stroll, a run, a flat-out sprint
const FOOT = 1.15;                                              // the player is 15% quicker on foot than other people
// rate: seconds between shots; reload: seconds to swap a magazine; ammo: rounds you start with besides the full magazine.
// The sniper rifle only fires standing still: hold FIRE, drag to the target in a 4x scope, let go to shoot. Its range is the whole screen.
const WEAPONS = [
  { id: 'pistol', name: 'PISTOL', short: 'PISTOL', rate: 0.27, dmg: 28, spread: 0.03, range: 560, heat: 3.2, auto: false, mag: 7, ammo: 60, reload: 5, hear: 140, shake: 3 },
  { id: 'mg', name: 'MACHINE GUN', short: 'MG', rate: 0.085, dmg: 13, spread: 0.09, range: 600, heat: 1.5, auto: true, mag: 30, ammo: 120, reload: 5, hear: 200, shake: 2.2 },
  { id: 'sniper', name: 'SNIPER RIFLE', short: 'SNIPER', rate: 1.5, dmg: 160, spread: 0, range: 4000, heat: 6, auto: false, mag: 5, ammo: 15, reload: 10, hear: 320, shake: 6,
    scope: { zoom: 4, shape: 'round', blur: true, los: true, hold: true } },
  // the rocket launcher aims like the rifle (stand still, hold, drag, let go) through its own sight; one rocket per load
  { id: 'rocket', name: 'ROCKET LAUNCHER', short: 'ROCKET', rate: 0.5, dmg: 0, spread: 0, range: 2600, heat: 10, auto: false, mag: 1, ammo: 4, reload: 5, hear: 420, shake: 5,
    rocket: true, stray: 0.05, strayDeg: 40, scope: { zoom: 2, shape: 'rect', blur: false, los: false, hold: false } }
];
// scope: zoom, shape (round / rect), blur (the rest of the view blurred, else darkened), los (fires only with a clear line of sight),
// hold (stays up after the shot while the next round is chambered)
const STAR_AT = [18, 48, 90, 140, 200];   // heat needed for 1..5 stars

const $ = id => document.getElementById(id);
const cv = $('game');
const miniCv = $('mini'), mctx = miniCv.getContext('2d');
let VW = 0, VH = 0, DPR = 1, rendererReady = false;
function resize() {
  DPR = window.devicePixelRatio || 1;
  VW = window.innerWidth; VH = window.innerHeight;
  if (rendererReady) applySize();
}
addEventListener('resize', resize); resize();

