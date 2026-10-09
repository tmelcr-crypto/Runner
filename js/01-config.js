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
const WALK = 1.4 * MPS, RUN = 5 * MPS, SPRINT = 7 * MPS;      // people: a stroll, a run, a flat-out sprint
const FOOT = 1.15;                                              // the player is 15% quicker on foot than other people
// the weapons: js/01f-weapon-data.js (WEAPONS)

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

