import { Game } from "./game.js";
const BLACK = 0xff070b10,
  GREEN = 0xff62e179,
  WHITE = 0xfff0eedf,
  ORANGE = 0xffffa34d,
  PURPLE = 0xffb877ef,
  BLUE = 0xff698adf,
  RED = 0xffff6d65,
  DIM = 0xff85968e;
const color = (v) =>
  typeof v === "string"
    ? v
    : "#" +
      (v >>> 0).toString(16).padStart(8, "0").slice(2) +
      (v >>> 24).toString(16).padStart(2, "0");
export function createRenderer(ctx) {
  let game,
    camera = 0,
    soundEnabled = true;
  const c = {
    save: () => ctx.save(),
    restore: () => ctx.restore(),
    translate: (x, y) => ctx.translate(x, y),
    scale: (x, y) => ctx.scale(x, y),
    rotate: (a) => ctx.rotate((a * Math.PI) / 180),
  };
  const paint = {
    setTextSize: (s) => (ctx.font = s + "px monospace"),
    measureText: (s) => ctx.measureText(s).width,
  };
  function rect(c, l, t, r, b, col) {
    ctx.fillStyle = color(col);
    ctx.fillRect(l, t, r - l, b - t);
  }
  function text(c, s, x, y, size, col) {
    ctx.font = size + "px monospace";
    ctx.fillStyle = color(col);
    ctx.fillText(s, x, y);
  }
  function line(c, x, y, x2, y2, col, width) {
    ctx.strokeStyle = color(col);
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  function panel(c, l, t, r, b, border) {
    rect(c, l, t, r, b, border);
    rect(c, l + 2, t + 2, r - 2, b - 2, BLACK);
  }
  function sprite(c, pixels, x, y, body) {
    for (let row = 0; row < pixels.length; row++)
      for (let col = 0; col < pixels[row].length; col++) {
        const v = pixels[row][col];
        if (v === " ") continue;
        rect(
          c,
          x + col * 2,
          y + row * 2,
          x + col * 2 + 2,
          y + row * 2 + 2,
          v === "W" ? WHITE : v === "B" ? BLUE : body,
        );
      }
  }
  const SIDE = [
    "           W             ",
    " WWWWWWWWWWWWWWWWWWWWWWW ",
    "           W             ",
    "          GGGGGGG        ",
    " G        GGGGGBBBB      ",
    " GGG      GGGGGBBBBB     ",
    " GGGGGGGGGGGGGGBBBBBG    ",
    " G        GGGGGGGGGGGG   ",
    "          GGGGGGGGGGGG   ",
    "           GGGGGGGGGG    ",
    "             W    W      ",
    "             W    W      ",
    "          WWWWWWWWWWWW   ",
  ];
  const FRONT = [
    " WWWWWWWWWWWWWWWWWWWWW ",
    "           W           ",
    "        GGGGGGG        ",
    "       GBBBBBBBG       ",
    "      GGBBBBBBBGG      ",
    "      GGGGGGGGGGG      ",
    "       GGGGGGGGG       ",
    "        GGGGGGG        ",
    "      W         W      ",
    "     W           W     ",
    "    WWWWWWWWWWWWWWW    ",
  ];
  function drawWorld(c) {
    // Discrete, restricted palette; no borrowed sprites or textures.
    for (let i = -1; i < 13; i++) {
      let px = i * 100 - ((camera * 0.15) % 100);
      rect(c, px, 310 + (i % 3) * 12, px + 100, 390, 0xff202b21);
      rect(c, px + 18, 294 + (i % 3) * 12, px + 82, 390, 0xff202b21);
    }
    rect(c, 0, 390, 960, 412, 0xff49392d);
    rect(c, 0, 390, 960, 394, GREEN);
    for (let i = 0; i < 80; i++) {
      let px = i * 16 - (camera % 16);
      rect(c, px, 401, px + 6, 403, ORANGE);
    }
    c.save();
    c.translate(-camera, 0);
    // Post office and its adjacent landing pad.
    rect(c, 0, 332, 88, 390, PURPLE);
    rect(c, 0, 326, 92, 334, WHITE);
    rect(c, 56, 356, 76, 390, BLACK);
    rect(c, 12, 344, 34, 362, BLUE);
    text(c, "POST", 4, 384, 14, WHITE);
    rect(c, 102, 396, 264, 400, WHITE);
    text(c, "H", 172, 386, 25, WHITE);
    for (let i = 0; i < 5; i++) {
      rect(
        c,
        Game.BARRIER + i * 4,
        350 - i * 2,
        Game.BARRIER + i * 4 + 2,
        390,
        GREEN,
      );
    }
    line(c, Game.BARRIER, 349, Game.BARRIER + 16, 341, GREEN, 2);
    for (let i = 0; i < 4; i++) {
      let b = game.buildings[i];
      let active = i == game.activeBuilding();
      let color = b.open ? ORANGE : PURPLE;
      rect(c, b.x - 56, 330, b.x + 56, 390, color);
      rect(c, b.x - 60, 324, b.x + 60, 332, WHITE);
      for (let brick = 0; brick < 5; brick++)
        line(c, b.x - 54, 342 + brick * 9, b.x + 54, 342 + brick * 9, BLACK, 2);
      rect(c, b.x - 15, 352, b.x + 15, 390, b.open ? BLACK : BLUE);
      if (b.open) {
        rect(c, b.x - 27, 326, b.x - 7, 342, BLACK);
        rect(c, b.x + 14, 326, b.x + 37, 337, BLACK);
      }
      text(c, "0" + (i + 1), b.x - 12, 314, 16, active ? GREEN : DIM);
      if (active && game.mode == Game.Mode.ASSISTED) {
        rect(c, b.x + 78, 392, b.x + 172, 396, GREEN);
        text(c, "POSEZ ICI", b.x + 78, 414, 12, GREEN);
      }
      if (b.open && game.waiting(i) > 0)
        text(c, "" + game.waiting(i), b.x + 32, 365, 14, WHITE);
    }
    let savedShown = 0;
    for (const p of game.people) {
      if (p.state == Game.State.FREE)
        drawPerson(c, p.x, 390, WHITE, game.count(Game.State.ONBOARD) >= 16);
      else if (p.state == Game.State.SAVED && savedShown++ < 12)
        drawPerson(c, p.x, 390, GREEN, true);
    }
    for (const t of game.tanks) {
      if (t.hp <= 0) {
        rect(c, t.x - 20, 384, t.x + 20, 390, 0xff49392d);
        continue;
      }
      rect(c, t.x - 26, 379, t.x + 26, 390, WHITE);
      rect(c, t.x - 22, 373, t.x + 22, 384, ORANGE);
      rect(c, t.x - 10, 366, t.x + 10, 376, ORANGE);
      rect(c, t.x - 18, 384, t.x - 12, 388, BLACK);
      rect(c, t.x - 4, 384, t.x + 2, 388, BLACK);
      rect(c, t.x + 10, 384, t.x + 16, 388, BLACK);
      line(c, t.x, 369, t.x + (game.x < t.x ? -34 : 34), 365, WHITE, 4);
    }
    for (const j of game.jets)
      if (j.hp > 0) {
        c.save();
        c.translate(j.x, j.y);
        c.scale(j.vx < 0 ? -1 : 1, 1);
        rect(c, -26, -2, 28, 4, WHITE);
        rect(c, 14, -5, 24, 6, WHITE);
        rect(c, -10, -12, 2, 12, PURPLE);
        rect(c, -28, -9, -22, 3, PURPLE);
        rect(c, -34, 0, -28, 4, ORANGE);
        c.restore();
      }
    for (const m of game.mines)
      if (m.hp > 0) {
        let flash = Math.trunc(game.time * 7) % 2 == 0 ? PURPLE : ORANGE;
        rect(c, m.x - 12, m.y - 7, m.x + 12, m.y + 7, flash);
        rect(c, m.x - 6, m.y - 12, m.x + 6, m.y + 12, flash);
        rect(c, m.x - 3, m.y - 3, m.x + 3, m.y + 3, WHITE);
        line(c, m.x - 18, m.y, m.x + 18, m.y, WHITE, 2);
      }
    for (const s of game.shots)
      rect(
        c,
        s.x - 3,
        s.y - 2,
        s.x + 3,
        s.y + (s.bomb ? 5 : 2),
        s.enemy ? RED : WHITE,
      );
    drawHelicopter(c);
    c.restore();
  }
  function drawPerson(c, x, y, color, wave) {
    x = Math.round(x / 2) * 2;
    let gait = Math.trunc(game.time * 7 + x) % 2 == 0 ? 2 : -2;
    rect(c, x - 2, y - 17, x + 2, y - 13, color);
    rect(c, x - 2, y - 12, x + 2, y - 5, color);
    line(c, x, y - 6, x - 3 - gait, y, color, 2);
    line(c, x, y - 6, x + 3 + gait, y, color, 2);
    line(c, x - 1, y - 11, x - 6, y - (wave ? 17 : 8), color, 2);
    line(c, x + 1, y - 11, x + 6, y - (wave ? 17 : 8), color, 2);
  }
  function drawHelicopter(c) {
    c.save();
    c.translate(Math.round(game.x / 2) * 2, Math.round(game.y / 2) * 2);
    if (game.crashTimer > 0) {
      let phase = Math.trunc(game.crashTimer * 8);
      for (let i = 0; i < 12; i++) {
        let angle = (i * Math.PI) / 6;
        let radius = (2.2 - game.crashTimer) * 38;
        let px = Math.cos(angle) * radius,
          py = Math.sin(angle) * radius;
        rect(
          c,
          px - 4,
          py - 4,
          px + 4,
          py + 4,
          (i + phase) % 2 == 0 ? ORANGE : WHITE,
        );
      }
      c.restore();
      return;
    }
    if (game.invulnerable > 0 && Math.trunc(game.time * 10) % 2 == 0) {
      c.restore();
      return;
    }
    let color = game.mode == Game.Mode.ASSISTED && game.hp < 35 ? RED : GREEN;
    if (game.facing == 0) sprite(c, FRONT, -23, -22, color);
    else {
      c.scale(game.facing, 1);
      c.rotate(game.landed() ? 0 : game.tilt());
      sprite(c, SIDE, -26, -24, color);
    }
    if (!game.paused && !game.landed() && Math.trunc(game.time * 24) % 2 == 0) {
      rect(c, -25, -22, 25, -20, BLACK);
      rect(c, -12, -22, 12, -20, WHITE);
    }
    c.restore();
  }
  function drawHud(c) {
    panel(c, 14, 10, 946, 70, GREEN);
    text(c, "CHOPLIFTER!", 26, 36, 19, GREEN);
    text(c, "WEB · OLDGAMES", 26, 57, 12, DIM);
    text(c, "MORTS", 222, 31, 12, RED);
    text(c, "" + game.count(Game.State.DEAD), 240, 57, 23, RED);
    text(c, "À BORD", 352, 31, 12, WHITE);
    text(c, game.count(Game.State.ONBOARD) + "/16", 350, 57, 23, WHITE);
    text(c, "SAUVÉS", 510, 31, 12, GREEN);
    text(c, game.count(Game.State.SAVED) + "/64", 507, 57, 23, GREEN);
    text(
      c,
      game.mode == Game.Mode.CLASSIC ? "APPAREILS" : "COQUE",
      660,
      31,
      12,
      ORANGE,
    );
    text(
      c,
      game.mode == Game.Mode.CLASSIC ? "" + game.lives : game.hp + "%",
      678,
      57,
      23,
      ORANGE,
    );
    text(c, soundEnabled ? "SON ON" : "SON OFF", 780, 44, 11, DIM);
    text(c, game.paused ? "PAUSE" : "EN VOL", 860, 44, 11, GREEN);
    rect(c, 270, 83, 690, 85, DIM);
    for (let i = 0; i < 4; i++) {
      let b = game.buildings[i];
      rect(
        c,
        270 + (b.x / Game.WORLD) * 420,
        80,
        276 + (b.x / Game.WORLD) * 420,
        88,
        b.open ? GREEN : PURPLE,
      );
    }
    rect(
      c,
      270 + (game.x / Game.WORLD) * 420,
      78,
      274 + (game.x / Game.WORLD) * 420,
      88,
      WHITE,
    );
    text(
      c,
      "BASE ← " + Math.trunc(Math.abs(game.x - Game.BASE)),
      22,
      91,
      12,
      DIM,
    );
    if (game.warningTime > 0)
      text(c, "! " + game.warning, 280, 113, 15, ORANGE);
    else if (game.messageTime > 0) text(c, game.message, 250, 113, 13, WHITE);
  }
  function button(c, l, t, r, b, title, border, size) {
    panel(c, l, t, r, b, border);
    paint.setTextSize(size);
    let width = paint.measureText(title);
    text(c, title, (l + r - width) / 2, (t + b + size) / 2 - 2, size, border);
  }
  return (g, sound = true) => {
    game = g;
    soundEnabled = sound;
    camera =
      Math.round(Math.max(0, Math.min(Game.WORLD - 960, game.x - 380)) / 2) * 2;
    ctx.fillStyle = color(BLACK);
    ctx.fillRect(0, 0, 960, 420);
    drawWorld(c);
    drawHud(c);
  };
}
