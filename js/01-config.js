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

const SPEED_K = 0.75;      // one knob: every speed in the game (people, cops, cars) is scaled by this
const CAR_TYPES = {
  sedan:  { name: 'SEDAN',  len: 54, wid: 26, max: 430, acc: 420, turn: 2.7, grip: 5.5, hp: 100, mass: 1.0,  colors: ['#ff2bd6', '#2bf3ff', '#a259ff', '#ffe14a', '#3dffa6', '#6f86ff'] },
  sports: { name: 'SPORTS', len: 52, wid: 24, max: 610, acc: 650, turn: 3.0, grip: 3.4, hp: 70,  mass: 0.85, colors: ['#ff2bd6', '#ffe14a', '#2bf3ff', '#ff4d4d'] },
  truck:  { name: 'TRUCK',  len: 78, wid: 33, max: 330, acc: 250, turn: 1.9, grip: 6.5, hp: 220, mass: 2.4,  colors: ['#3d6fff', '#ff7a3d', '#3dffa6', '#b79cff'] },
  police: { name: 'POLICE', len: 54, wid: 26, max: 570, acc: 570, turn: 2.9, grip: 5.0, hp: 130, mass: 1.1,  colors: ['#171a24'] }
};
for (const k in CAR_TYPES) { CAR_TYPES[k].max *= SPEED_K; CAR_TYPES[k].acc *= SPEED_K; }
const WEAPONS = [
  { name: 'PISTOL', rate: 0.27, dmg: 28, spread: 0.03, range: 560, heat: 3.2, auto: false, mag: 7, hear: 140 },
  { name: 'MACHINE GUN', rate: 0.085, dmg: 13, spread: 0.09, range: 600, heat: 1.5, auto: true, mag: 30, hear: 200 }
];
const RELOAD_T = 5;   // seconds to swap a magazine
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

