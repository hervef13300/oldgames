import { Game, Mode, State } from "./game.js";
import { createRenderer } from "./render.js";
const $ = (id) => document.getElementById(id),
  canvas = $("game"),
  draw = createRenderer(canvas.getContext("2d"));
let game = new Game(),
  last = 0,
  accumulator = 0;
const keys = new Set();
let enabled = true,
  activated = false;
const storage = "oldgames:choplifter:v1";
try {
  enabled = localStorage.getItem("oldgames:choplifter:sound") !== "off";
  const v = JSON.parse(localStorage.getItem(storage) || "null");
  if (
    v?.version === 1 &&
    [Mode.CLASSIC, Mode.ASSISTED].includes(v.game.mode) &&
    v.game.people?.length === 64 &&
    v.game.buildings?.length === 4 &&
    ["x", "y", "hp", "lives", "time"].every((k) =>
      Number.isFinite(v.game[k]),
    ) &&
    ["tanks", "shots", "jets", "mines"].every((k) => Array.isArray(v.game[k]))
  ) {
    game = Object.assign(new Game(v.game.mode), v.game);
    game.paused = true;
    game.sounds = [];
  }
} catch {}
const rotor = new Audio("audio/rotor.wav");
rotor.loop = true;
rotor.volume = 0.17;
const effects = Object.fromEntries(
  ["fire", "open", "board", "save", "explosion", "win"].map((n) => [
    n,
    new Audio("audio/" + n + ".wav"),
  ]),
);
let playing = [];
function silence() {
  rotor.pause();
  for (const a of playing) a.pause();
  playing = [];
}
function audio() {
  const running =
    enabled &&
    activated &&
    game.started &&
    !game.paused &&
    !game.over &&
    game.crashTimer <= 0;
  if (running && rotor.paused) rotor.play().catch(() => {});
  else if (!running) rotor.pause();
  if (enabled && activated && !game.paused)
    for (const name of game.sounds) {
      const a = effects[name]?.cloneNode();
      if (a) {
        a.volume = 0.45;
        if (playing.length >= 6) playing.shift().pause();
        playing.push(a);
        a.play().catch(() => {});
      }
    }
  game.sounds = [];
}
function status(s) {
  $("status").textContent = s;
}
function save() {
  try {
    localStorage.setItem(
      storage,
      JSON.stringify({ version: 1, game: { ...game, sounds: [] } }),
    );
    status("Mission sauvegardée dans ce navigateur.");
  } catch {
    status("Sauvegarde indisponible : stockage du navigateur inaccessible.");
  }
}
function refresh() {
  const menu = game.paused || game.over;
  $("menu").hidden = !menu;
  $("heading").textContent = game.over
    ? game.message
    : game.started
      ? "MISSION EN PAUSE"
      : "CHOPLIFTER";
  $("description").textContent = game.over
    ? game.count(State.SAVED) +
      " sauvés / 64 · " +
      game.count(State.DEAD) +
      " pertes"
    : "4 casernes · 64 personnes · 16 places à bord";
  $("start").textContent = game.over
    ? "Rejouer · Entrée"
    : game.started
      ? "Reprendre · Entrée"
      : "Décoller · Entrée";
  $("classic").setAttribute("aria-pressed", String(game.mode === Mode.CLASSIC));
  $("assisted").setAttribute(
    "aria-pressed",
    String(game.mode === Mode.ASSISTED),
  );
  $("pause").textContent = game.paused ? "Reprendre · P" : "Pause · P";
  $("sound").textContent = enabled ? "Son : oui" : "Son : non";
}
function pause() {
  game.paused = true;
  keys.clear();
  silence();
  save();
  refresh();
}
function start() {
  activated = true;
  if (game.over) game = new Game(game.mode);
  game.start();
  keys.clear();
  last = 0;
  accumulator = 0;
  refresh();
}
function toggle() {
  if (!game.started || game.over) return;
  if (game.paused) start();
  else pause();
}
function sound() {
  enabled = !enabled;
  activated = true;
  try {
    localStorage.setItem("oldgames:choplifter:sound", enabled ? "on" : "off");
  } catch {}
  if (!enabled) silence();
  refresh();
}
function mode(m) {
  if (
    game.started &&
    !game.over &&
    !confirm("Commencer une nouvelle mission dans ce mode ?")
  )
    return;
  game = new Game(m);
  keys.clear();
  silence();
  refresh();
}
$("classic").onclick = () => mode(Mode.CLASSIC);
$("assisted").onclick = () => mode(Mode.ASSISTED);
$("start").onclick = start;
$("pause").onclick = () => (game.started ? toggle() : start());
$("sound").onclick = sound;
$("save").onclick = save;
$("fullscreen").onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    status("Le plein écran est indisponible dans ce navigateur.");
  }
};
const handled = [
  "arrowleft",
  "arrowright",
  "arrowup",
  "arrowdown",
  "z",
  "q",
  "s",
  "d",
  "w",
  "a",
  "j",
  "k",
  "l",
  " ",
  "p",
  "m",
  "enter",
  "escape",
  "1",
  "2",
];
window.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.altKey || e.metaKey) return;
  const k = e.key.toLowerCase();
  if (!handled.includes(k)) return;
  e.preventDefault();
  activated = true;
  keys.add(k);
  if (e.repeat) return;
  if (k === "enter") start();
  else if (k === "p" || k === "escape") toggle();
  else if (k === "m") sound();
  else if (k === "j") game.orient(-1);
  else if (k === "k") game.orient(0);
  else if (k === "l") game.orient(1);
  else if (k === "1" && game.paused) mode(Mode.CLASSIC);
  else if (k === "2" && game.paused) mode(Mode.ASSISTED);
});
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener("blur", pause);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pause();
});
window.addEventListener("pagehide", () => {
  save();
  silence();
});
let auto = 0;
function frame(now) {
  const dt = last ? Math.min((now - last) / 1000, 0.12) : 0;
  last = now;
  if (!game.paused && !game.over) {
    accumulator += dt;
    const ax =
        Number(keys.has("arrowright") || keys.has("d")) -
        Number(keys.has("arrowleft") || keys.has("q") || keys.has("a")),
      ay =
        Number(keys.has("arrowdown") || keys.has("s")) -
        Number(keys.has("arrowup") || keys.has("z") || keys.has("w"));
    while (accumulator >= 1 / 60) {
      game.update(1 / 60, ax, ay, keys.has(" "));
      accumulator -= 1 / 60;
    }
    if (game.over) refresh();
    auto += dt;
    if (auto > 10) {
      save();
      auto = 0;
    }
  } else accumulator = 0;
  audio();
  draw(game, enabled);
  requestAnimationFrame(frame);
}
refresh();
requestAnimationFrame(frame);
