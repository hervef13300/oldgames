import assert from "node:assert/strict";
import { Game, Mode, State as S } from "../choplifter-src/game.js";
import { createRenderer } from "../choplifter-src/render.js";
let tests = 0;
function test(name, fn) {
  fn();
  tests++;
  console.log("PASS", name);
}
function running() {
  const g = new Game();
  g.start();
  return g;
}
function peaceful() {
  const g = running();
  g.tanks.forEach((t) => (t.hp = 0));
  g.invulnerable = 10000;
  g.jetCountdown = g.mineCountdown = Infinity;
  return g;
}
function tick(g, t, ax = 0, ay = 0, fire = false) {
  for (let i = 0; i < Math.round(t * 60); i++) g.update(1 / 60, ax, ay, fire);
}
test("Initial population and mode", () => {
  const g = running();
  assert.equal(g.people.length, 64);
  assert.equal(g.count(S.FREE), 16);
  assert.equal(g.count(S.HELD), 48);
  assert.equal(g.lives, 3);
});
test("Orientation independent of movement", () => {
  const g = peaceful();
  g.x = 500;
  g.y = 200;
  g.orient(-1);
  tick(g, 2, 1);
  assert(g.vx > 100);
  assert.equal(g.facing, -1);
  g.orient(7);
  assert.equal(g.facing, -1);
});
test("Capacity and group order", () => {
  const g = peaceful();
  g.x = 960;
  for (const p of g.people.filter((p) => p.group === 0)) {
    p.x = g.x;
    assert(g.board(p));
  }
  const p = g.people[16];
  p.state = S.FREE;
  p.x = g.x;
  assert(!g.board(p));
  assert(!g.free(1));
  assert.equal(g.count(S.ONBOARD), 16);
});
test("Four rescue rotations save all 64", () => {
  const g = peaceful();
  for (let i = 0; i < 4; i++) {
    if (i) assert(g.free(i));
    g.x = g.buildings[i].x + 110;
    g.y = 370;
    g.vx = g.vy = 0;
    tick(g, 15);
    assert.equal(g.count(S.ONBOARD), 16);
    g.x = 160;
    tick(g, 3);
    assert.equal(g.count(S.SAVED), (i + 1) * 16);
  }
  assert(g.over);
  assert.equal(g.message, "SAUVETAGE PARFAIT");
  assert.equal(g.count(S.DEAD), 0);
});
test("Classic destruction and assisted damage", () => {
  const g = running();
  g.people[0].state = S.ONBOARD;
  g.damage(1);
  g.damage(100);
  assert.equal(g.lives, 2);
  assert.equal(g.count(S.DEAD), 1);
  tick(g, 2.5);
  assert.equal(g.x, 160);
  const a = new Game(Mode.ASSISTED);
  a.start();
  a.x = 500;
  a.damage(20);
  assert.equal(a.hp, 80);
  a.x = 160;
  tick(a, 0.5);
  assert.equal(a.hp, 100);
});
test("Pause freezes simulation", () => {
  const g = running();
  g.paused = true;
  g.update(0.2, 1, -1, true);
  assert.equal(g.time, 0);
  assert.equal(g.shots.length, 0);
});
test("Front and side fire", () => {
  const g = peaceful();
  g.x = 600;
  g.y = 200;
  g.orient(0);
  g.update(0.01, 0, 0, true);
  assert.equal(g.shots[0].vx, 0);
  assert.equal(g.shots[0].vy, 430);
  g.shots = [];
  g.cooldown = 0;
  g.orient(-1);
  g.update(0.01, 0, 0, true);
  assert.equal(g.shots[0].vx, -560);
  assert.equal(g.shots[0].vy, 0);
});
test("Full flight rescue and return, without teleporting", () => {
  const g = peaceful();
  g.invulnerable = 0;
  const fly = (cond, ax, ay) => {
    for (let n = 0; n < 600 && cond(); n++) g.update(1 / 60, ax, ay, false);
  };
  fly(() => g.y > 240, 0, -1);
  tick(g, 1);
  fly(() => g.x < 910, 1, 0);
  tick(g, 1);
  fly(() => g.y < 370, 0, 0.4);
  tick(g, 15);
  assert.equal(g.count(S.ONBOARD), 16);
  fly(() => g.y > 240, 0, -1);
  tick(g, 1);
  fly(() => g.x > 240, -1, 0);
  tick(g, 1);
  fly(() => g.y < 370, 0, 0.4);
  tick(g, 3);
  assert.equal(g.count(S.SAVED), 16);
  assert.equal(g.lives, 3);
});
test("Population conserved in combat", () => {
  const g = running();
  for (let i = 0; i < 24000 && !g.over; i++) {
    g.orient((Math.floor(i / 200) % 3) - 1);
    g.update(1 / 60, Math.sin(i * 0.02), Math.cos(i * 0.04), true);
    assert.equal(
      Object.values(S).reduce((n, s) => n + g.count(s), 0),
      64,
    );
    assert(g.count(S.ONBOARD) <= 16);
  }
});
test("Mines cross barrier and jets stay away from base", () => {
  const g = peaceful();
  g.mines.push({ x: 480, y: 200, vx: 0, vy: 0, hp: 1, ttl: 40 });
  g.jetCountdown = 0;
  tick(g, 3);
  assert(g.mines[0].x < 430);
  assert.equal(g.jets.length, 0);
});
test("Save roundtrip preserves simulation", () => {
  const g = running();
  tick(g, 1, 0, -1);
  const a = Object.assign(new Game(), JSON.parse(JSON.stringify(g)));
  tick(g, 0.5, 1);
  tick(a, 0.5, 1);
  assert.deepEqual(a, g);
});
test("Renderer covers world and enemy states", () => {
  let calls = 0;
  const ctx = new Proxy(
      { measureText: (s) => ({ width: s.length * 8 }) },
      {
        get: (t, p) => (p in t ? t[p] : () => calls++),
        set: (t, p, v) => ((t[p] = v), true),
      },
    ),
    draw = createRenderer(ctx),
    g = running();
  g.x = 900;
  g.y = 200;
  g.jets.push({ x: 1000, y: 120, vx: -200, hp: 1 });
  g.mines.push({ x: 800, y: 180, hp: 1 });
  draw(g);
  g.facing = 0;
  draw(g);
  g.crashTimer = 1;
  draw(g);
  assert(calls > 1000);
});
console.log(
  tests +
    " simulation/render checks passed. Browser interaction QA remains unavailable.",
);
