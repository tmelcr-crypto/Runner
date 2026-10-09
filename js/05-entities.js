'use strict';
/* ---------- 5. ENTITIES & EFFECTS ---------- */
let cars = [], peds = [], officers = [], pickups = [], parts = [], decals = [], pops = [], tracers = [], skids = [];

function makeCar(type, x, y, ang, driver, color) {
  const t = CAR_TYPES[type];
  return { type, t, x, y, ang, vx: 0, vy: 0, av: 0, hp: t.hp, maxhp: t.hp, color: color || pick(t.colors), driver: driver || null,
    thr: 0, str: 0, hb: false, e: -1, fw: 1, s: 0, nx: null, burn: 0, dead: false, deadT: 0, stuck: 0, rev: 0,
    slip: 0, smokeT: 0, hitCd: 0, way: null, wayT: 0, sirenT: rand(0, 2) };
}
function carCircles(c) {
  const t = c.t, r = t.wid * 0.5 + 1, o = t.len * 0.5 - r, fx = Math.cos(c.ang), fy = Math.sin(c.ang);
  return [[c.x + fx * o, c.y + fy * o, r], [c.x, c.y, r], [c.x - fx * o, c.y - fy * o, r]];
}
const carSpeed = c => Math.hypot(c.vx, c.vy);
// w: a sidewalk spot { e, fw, s, side } from sidewalkSpot(); without one the person finds the nearest sidewalk on the next update
function makePed(x, y, w) {
  return { x, y, e: w ? w.e : -1, fw: w ? w.fw : 1, s: w ? w.s : 0, side: w ? w.side : 1, speed: rand(1.15, 1.6) * MPS, hp: 30, state: 'walk', fl: 0, fx: 0, fy: 0, dead: false, deadT: 0, wait: 0,
    shirt: pick(['#e0554b', '#4f8fe0', '#e0c34a', '#58b36b', '#c97be0', '#f08a3a', '#e8e8e8', '#3fd0c0']),
    skin: pick(['#f2c6a0', '#d9a074', '#a8714a', '#7a4d30']), bob: rand(0, 6), vx: 0, vy: 0 };
}
function makeFootCop(x, y, w) { const p = makePed(x, y, w); p.cop = true; p.hp = 45; p.speed = rand(1.2, 1.5) * MPS; p.hd = 0; p.ang = 0; return p; }
function makeOfficer(x, y) { return { x, y, ang: 0, hp: 45, cool: rand(0.3, 1), speed: 5.5 * MPS, dead: false, deadT: 0, bob: 0, vx: 0, vy: 0 }; }

function addP(p) { if (parts.length < 1150) parts.push(p); }
function spark(x, y, n, col) { for (let k = 0; k < n; k++) { const a = rand(0, TAU), s = rand(40, 200); addP({ x, y, z: rand(5, 14), vz: rand(10, 90), grav: 220, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.12, 0.3), max: 0.3, s0: 2.2, s1: 0.5, col: col || '#ffe27a', drag: 4 }); } }
function bloodFx(x, y, n, ang) {
  for (let k = 0; k < n; k++) { const a = (ang === undefined ? rand(0, TAU) : ang + rand(-0.7, 0.7)), s = rand(30, 170); addP({ x, y, z: rand(8, 16), vz: rand(10, 70), grav: 260, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.25, 0.6), max: 0.6, s0: 3, s1: 1, col: '#b3122a', drag: 5 }); }
  if (decals.length < 120 && Math.random() < 0.6) decals.push({ x: x + rand(-5, 5), y: y + rand(-5, 5), r: rand(3, 7), life: 40, blood: true });
}
function smokeFx(x, y, dark) { addP({ x: x + rand(-4, 4), y: y + rand(-4, 4), z: rand(8, 16), vz: rand(20, 45), grav: 0, vx: rand(-14, 14), vy: rand(-14, 14), life: rand(0.8, 1.4), max: 1.4, s0: 5, s1: 15, col: dark ? '#22232b' : '#8d8f9c', drag: 1, alpha: 0.55 }); }
function fireFx(x, y) { addP({ x: x + rand(-6, 6), y: y + rand(-6, 6), z: rand(6, 14), vz: rand(25, 60), grav: 0, vx: rand(-20, 20), vy: rand(-20, 20), life: rand(0.25, 0.55), max: 0.55, s0: 8, s1: 2, col: pick(['#ff9d2b', '#ffd23f', '#ff5a1f']), drag: 2, alpha: 0.9 }); }
function ringFx(x, y, r) { addP({ x, y, z: 4, vz: 0, grav: 0, vx: 0, vy: 0, life: 0.45, max: 0.45, s0: 10, s1: r, col: '#ffd9a0', drag: 0, ring: true }); }
function splashFx(x, y, n) { for (let k = 0; k < n; k++) { const a = rand(0, TAU), v = rand(30, 120); addP({ x, y, z: rand(2, 6), vz: rand(40, 110), grav: 260, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.3, 0.6), max: 0.6, s0: 3, s1: 1, col: pick(['#dff3ff', '#9fd4ff', '#ffffff']), drag: 3 }); } }
function sinkCar(c) {
  c.sunk = true; c.sinkT = 0; c.dead = true; c.deadT = 0; c.burn = 0; c.hp = 0; c.thr = 0; c.str = 0;
  splashFx(c.x, c.y, 40); cam.shake = Math.max(cam.shake, 6);
  if (P.car === c) { $('wasted').textContent = 'DROWNED'; killPlayer(); }
  c.driver = null;
}
function popup(x, y, txt, col) { pops.push({ x, y, txt, col: col || '#ffd23f', life: 1.1 }); }
function toast(msg, bad) {
  const el = $('toast'); el.textContent = msg; el.className = bad ? 'bad' : ''; void el.offsetWidth; el.className = (bad ? 'bad ' : '') + 'show';
}

