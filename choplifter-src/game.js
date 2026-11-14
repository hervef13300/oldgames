// Browser port of hervef13300/choplifter Game.java, revision f4616c4.
export const State = {
  HELD: "HELD",
  FREE: "FREE",
  ONBOARD: "ONBOARD",
  SAVED: "SAVED",
  DEAD: "DEAD",
};
export const Mode = { CLASSIC: "CLASSIC", ASSISTED: "ASSISTED" };
const { HELD, FREE, ONBOARD, SAVED, DEAD } = State;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export class Game {
  static WORLD = 3600;
  static FLOOR = 390;
  static LAND_Y = 370;
  static BASE = 160;
  static BARRIER = 430;
  static Mode = Mode;
  static State = State;
  constructor(mode = Mode.CLASSIC) {
    Object.assign(this, {
      mode,
      people: [],
      buildings: [],
      tanks: [],
      shots: [],
      jets: [],
      mines: [],
      sounds: [],
      jetCountdown: 18,
      mineCountdown: 42,
      warningTime: 0,
      warning: "",
      wave: 0,
      x: 160,
      y: 370,
      vx: 0,
      vy: 0,
      time: 0,
      crashTimer: 0,
      invulnerable: 0,
      facing: 1,
      hp: 100,
      lives: 3,
      sorties: 0,
      started: false,
      paused: true,
      over: false,
      message: "Première caserne ouverte · décollez",
      messageTime: 5,
      cooldown: 0,
      transfer: 0,
      stableTime: 0,
      unloading: false,
    });
    for (let i = 0; i < 4; i++) {
      const x = 850 + i * 760;
      this.buildings.push({ x, open: i === 0 });
      this.tanks.push({ home: x + 210, x: x + 210, hp: 2, timer: 2 });
      for (let j = 0; j < 16; j++)
        this.people.push({
          x: x + (j - 7.5) * 5,
          group: i,
          state: i === 0 ? FREE : HELD,
        });
    }
  }
  count(s) {
    return this.people.filter((p) => p.state === s).length;
  }
  activeBuilding() {
    for (let i = 0; i < 4; i++)
      if (
        this.people.some(
          (p) => p.group === i && p.state !== SAVED && p.state !== DEAD,
        )
      )
        return i;
    return 4;
  }
  waiting(i) {
    return this.people.filter((p) => p.group === i && p.state === FREE).length;
  }
  tilt() {
    return clamp(this.vx / 12, -18, 18);
  }
  landed() {
    return (
      this.crashTimer <= 0 &&
      this.y >= 369.9 &&
      Math.abs(this.vx) < 30 &&
      Math.abs(this.vy) < 1
    );
  }
  orient(d) {
    if ([-1, 0, 1].includes(d)) this.facing = d;
  }
  start() {
    this.started = true;
    this.paused = false;
  }
  event(s) {
    if (this.sounds.length < 32) this.sounds.push(s.toLowerCase());
  }
  say(s) {
    this.message = s;
    this.messageTime = 4;
  }
  free(i) {
    if (i < 0 || i >= 4 || this.buildings[i].open) return false;
    if (i !== this.activeBuilding()) {
      this.say("Ramenez d’abord le groupe précédent");
      return false;
    }
    this.buildings[i].open = true;
    for (const p of this.people)
      if (p.group === i && p.state === HELD) p.state = FREE;
    this.say("Caserne ouverte · posez-vous à côté");
    this.event("open");
    return true;
  }
  board(p) {
    if (
      p.state !== FREE ||
      this.count(ONBOARD) >= 16 ||
      !this.landed() ||
      Math.abs(p.x - this.x) > 46
    )
      return false;
    p.state = ONBOARD;
    this.event("board");
    return true;
  }
  damage(n) {
    if (this.over || this.crashTimer > 0 || this.invulnerable > 0) return;
    this.hp = this.mode === Mode.CLASSIC ? 0 : Math.max(0, this.hp - n);
    if (this.hp > 0) return;
    for (const p of this.people) if (p.state === ONBOARD) p.state = DEAD;
    this.lives--;
    this.event("explosion");
    this.crashTimer = 2.2;
    this.vx = this.vy = 0;
    this.unloading = false;
    this.say(
      this.lives > 0
        ? "Appareil perdu · retour à la base"
        : "THE END · plus d’hélicoptère",
    );
    if (this.lives === 0) this.over = true;
  }
  update(elapsed, ax, ay, fire) {
    if (this.paused || this.over || !this.started) return;
    let remaining = clamp(elapsed, 0, 0.25);
    while (remaining > 0.00001 && !this.over) {
      const dt = Math.min(remaining, 1 / 120);
      this.step(dt, ax, ay, fire);
      remaining -= dt;
    }
  }
  shot(x, y, vx, vy, enemy, bomb = false) {
    this.shots.push({ x, y, oldX: x, oldY: y, vx, vy, enemy, bomb, ttl: 4 });
  }
  step(dt, ax, ay, firing) {
    const g = this;
    g.time += dt;
    g.cooldown -= dt;
    g.transfer += dt;
    g.messageTime = Math.max(0, g.messageTime - dt);
    g.invulnerable = Math.max(0, g.invulnerable - dt);
    g.warningTime = Math.max(0, g.warningTime - dt);
    if (g.crashTimer > 0) {
      g.crashTimer -= dt;
      if (g.crashTimer <= 0) {
        g.x = 160;
        g.y = 370;
        g.vx = g.vy = 0;
        g.hp = 100;
        g.invulnerable = 2;
        g.shots = [];
        g.stableTime = 0;
      }
      g.finishIfResolved();
      return;
    }
    ax = clamp(ax, -1, 1);
    ay = clamp(ay, -1, 1);
    g.vx +=
      (ax * 230 - g.vx) * (1 - Math.exp(-(Math.abs(ax) > 0.05 ? 3.8 : 6) * dt));
    g.vy += (ay * 165 - g.vy) * (1 - Math.exp(-5 * dt));
    const oldY = g.y;
    g.x = clamp(g.x + g.vx * dt, 35, 3565);
    g.y = clamp(g.y + g.vy * dt, 100, 370);
    if (g.y >= 370) {
      if (oldY < 369.999) {
        if (g.vy > 105 || Math.abs(g.vx) > 100) {
          g.damage(35);
          g.say("Atterrissage brutal · ralentissez");
        }
        for (const p of g.people)
          if (p.state === FREE && Math.abs(p.x - g.x) < 25) p.state = DEAD;
      }
      g.vy = 0;
    }
    if (g.y > 313 && g.y < 369) {
      for (const b of g.buildings)
        if (Math.abs(g.x - b.x) < 76) {
          g.damage(100);
          break;
        }
      if (g.x < 90 && g.y > 330) g.damage(100);
    }
    if (g.crashTimer > 0 || g.over) return;
    g.stableTime = g.landed() ? g.stableTime + dt : 0;
    if (firing && g.cooldown <= 0 && !g.landed()) {
      if (g.facing === 0) g.shot(g.x, g.y + 22, 0, 430, false);
      else g.shot(g.x + g.facing * 32, g.y + 2, g.facing * 560, 0, false);
      g.cooldown = 0.2;
      g.event("fire");
    }
    g.updateShots(dt);
    if (g.crashTimer > 0 || g.over) return;
    g.updateEnemies(dt);
    if (g.crashTimer > 0 || g.over) return;
    if (g.stableTime > 0.25) {
      if (Math.abs(g.x - 160) < 105) {
        if (g.count(ONBOARD) > 0) {
          g.unloading = true;
          if (g.transfer > 0.12)
            for (const p of g.people)
              if (p.state === ONBOARD) {
                p.state = SAVED;
                p.x = 60 + (g.count(SAVED) % 12) * 8;
                g.transfer = 0;
                g.event("save");
                break;
              }
          g.say("Débarquement · " + g.count(SAVED) + " en sécurité");
        } else if (g.unloading) {
          g.sorties++;
          g.unloading = false;
          g.say("Groupe sauvé · caserne suivante");
        }
        if (g.mode === Mode.ASSISTED) g.hp = Math.min(100, g.hp + 1);
      } else {
        for (const p of g.people)
          if (
            p.state === FREE &&
            Math.abs(p.x - g.x) < 210 &&
            g.count(ONBOARD) < 16
          ) {
            const target = g.x + (p.x < g.x ? -38 : 38),
              delta = target - p.x;
            p.x += Math.sign(delta) * Math.min(Math.abs(delta), 42 * dt);
            if (g.transfer > 0.18 && g.board(p)) {
              g.transfer = 0;
              g.say(
                g.count(ONBOARD) === 16
                  ? "COMPLET · retour à la base"
                  : "Embarquement · " + g.count(ONBOARD) + " / 16",
              );
            }
          }
      }
    }
    g.finishIfResolved();
  }
  finishIfResolved() {
    if (this.count(HELD) + this.count(FREE) + this.count(ONBOARD) === 0) {
      this.over = true;
      this.message =
        this.count(SAVED) === 64
          ? "SAUVETAGE PARFAIT"
          : "THE END · mission terminée";
      this.event("win");
    }
  }
  jetInterval() {
    return Math.max(7, 18 - this.sorties * 2);
  }
  mineInterval() {
    return Math.max(14, 34 - this.sorties * 4);
  }
  updateEnemies(dt) {
    const g = this;
    for (const t of g.tanks) {
      t.timer -= dt;
      if (t.hp <= 0) continue;
      t.x = t.home + Math.sin(g.time * 0.25 + t.home) * 45;
      if (g.x > 430 && Math.abs(g.x - t.x) < 600 && g.y > 300 && t.timer <= 0) {
        g.shot(t.x, 378, g.x < t.x ? -180 : 180, 0, true);
        t.timer = Math.max(1.15, 3 - g.sorties * 0.3);
      }
    }
    g.jetCountdown -= dt;
    g.mineCountdown -= dt;
    if (g.jetCountdown < 2 && g.jetCountdown > 0 && g.x > 430) {
      g.warning = "AVION EN APPROCHE";
      g.warningTime = 2;
    }
    if (g.jetCountdown <= 0 && g.x > 430) {
      const right = g.x < 2950,
        spawn = right ? Math.min(3660, g.x + 720) : Math.max(440, g.x - 720);
      if (g.jets.length < 2)
        g.jets.push({
          x: spawn,
          y: 130 + (g.wave++ % 3) * 62,
          vx: (right ? -1 : 1) * (220 + g.sorties * 15),
          timer: 0.8,
          ttl: 9,
          hp: 1,
        });
      g.jetCountdown = g.jetInterval();
    }
    if (g.mineCountdown < 2 && g.mineCountdown > 0) {
      g.warning = "MINE AÉRIENNE EN APPROCHE";
      g.warningTime = 2;
    }
    if (g.mineCountdown <= 0) {
      if (g.mines.length < 2)
        g.mines.push({
          x: g.x < 2950 ? g.x + 650 : g.x - 650,
          y: 130,
          vx: 0,
          vy: 0,
          ttl: 40,
          hp: 1,
        });
      g.mineCountdown = g.mineInterval();
    }
    for (const j of g.jets) {
      j.x += j.vx * dt;
      j.timer -= dt;
      j.ttl -= dt;
      if (j.hp > 0 && g.x > 430 && Math.abs(j.x - g.x) < 480 && j.timer <= 0) {
        if (g.landed() && Math.abs(j.x - g.x) < 160)
          g.shot(j.x, j.y + 12, j.vx * 0.12, 100, true, true);
        else {
          const dx = g.x + g.vx * 0.3 - j.x,
            dy = g.y - j.y,
            len = Math.max(1, Math.hypot(dx, dy));
          g.shot(j.x, j.y, (dx / len) * 230, (dy / len) * 230, true);
        }
        j.timer = 1.8;
      }
      if (j.hp > 0 && Math.abs(j.x - g.x) < 38 && Math.abs(j.y - g.y) < 21) {
        g.damage(100);
        j.hp = 0;
        g.event("explosion");
      }
    }
    g.jets = g.jets.filter(
      (j) => j.hp > 0 && j.ttl > 0 && j.x >= 430 && j.x <= 3700,
    );
    for (const m of g.mines) {
      m.ttl -= dt;
      const dx = g.x - m.x,
        dy = g.y - m.y,
        len = Math.max(1, Math.hypot(dx, dy)),
        speed = 90 + g.sorties * 10,
        blend = 1 - Math.exp(-2 * dt);
      m.vx += ((dx / len) * speed - m.vx) * blend;
      m.vy += ((dy / len) * speed - m.vy) * blend;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      if (m.hp > 0 && Math.hypot(m.x - g.x, m.y - g.y) < 30) {
        g.damage(100);
        m.hp = 0;
        g.event("explosion");
      }
    }
    g.mines = g.mines.filter((m) => m.hp > 0 && m.ttl > 0);
  }
  updateShots(dt) {
    const g = this;
    g.shots = g.shots.filter((s) => {
      s.oldX = s.x;
      s.oldY = s.y;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.ttl -= dt;
      if (s.bomb) s.vy += 110 * dt;
      let hit = false;
      if (s.enemy) {
        if (Math.abs(s.x - g.x) < 29 && Math.abs(s.y - g.y) < 17) {
          g.damage(18);
          hit = true;
        }
      } else {
        for (const j of g.jets)
          if (
            !hit &&
            j.hp > 0 &&
            Math.abs(s.x - j.x) < 35 &&
            Math.abs(s.y - j.y) < 14
          ) {
            j.hp = 0;
            hit = true;
            g.event("explosion");
          }
        for (const m of g.mines)
          if (!hit && m.hp > 0 && Math.hypot(s.x - m.x, s.y - m.y) < 17) {
            m.hp = 0;
            hit = true;
            g.event("explosion");
          }
        for (let i = 0; i < 4 && !hit; i++) {
          const b = g.buildings[i];
          if (!b.open && Math.abs(s.x - b.x) < 56 && s.y > 326 && s.y < 390) {
            g.free(i);
            hit = true;
          }
        }
        for (const t of g.tanks)
          if (
            !hit &&
            t.hp > 0 &&
            Math.abs(s.x - t.x) < 29 &&
            s.y > 362 &&
            s.y < 390
          ) {
            if (s.vy > 0) {
              t.hp--;
              if (t.hp === 0) g.event("explosion");
            }
            hit = true;
          }
      }
      if (!hit && s.y > 373)
        for (const p of g.people)
          if (p.state === FREE && Math.abs(s.x - p.x) < 7) {
            p.state = DEAD;
            hit = true;
            break;
          }
      return !(
        hit ||
        s.ttl <= 0 ||
        s.y > 390 ||
        s.x < 0 ||
        s.x > 3600 ||
        (s.enemy && s.x < 430)
      );
    });
  }
}
