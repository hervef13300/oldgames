import { Apple2 } from "../vendor/apple2js/js/apple2";
import DiskII from "../vendor/apple2js/js/cards/disk2";
const $ = (id: string) => document.getElementById(id)!;
let statusTimer: number;
const status = (s: string, persistent = false) => {
  $("status").textContent = s;
  clearTimeout(statusTimer);
  if (!persistent) statusTimer = window.setTimeout(() => {
    $("status").textContent = "";
  }, 6000);
};
let apple: Apple2,
  disk: DiskII,
  ready = false,
  paused = false,
  sound: AudioContext | undefined;
let inputTimer: number,
  moveKey = 0,
  aimKey = 0;
const held = new Map<number, number>();
let db: IDBDatabase | undefined;
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("castle-wolfenstein", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("machine");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
function readSave(): Promise<any> {
  if (!db) return Promise.resolve(undefined);
  return new Promise((res, rej) => {
    const r = db
      .transaction("machine")
      .objectStore("machine")
      .get("snapshot-v1");
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function save() {
  if (!ready) return;
  if (!db) {
    status("Sauvegarde indisponible dans ce navigateur. Vous pouvez continuer à jouer.");
    return;
  }
  try {
    const state = apple.getState();
    await new Promise<void>((res, rej) => {
      const tx = db.transaction("machine", "readwrite");
      tx.objectStore("machine").put(
        { version: 1, state, paused },
        "snapshot-v1",
      );
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
    status("Partie sauvegardée sur cet appareil");
  } catch (e) {
    status("Sauvegarde impossible : " + e);
  }
}
function key(k: number) {
  if (ready) apple.getIO().keyDown(k);
}
function clearInputs() {
  held.clear();
  pressed.clear();
  moveKey = aimKey = 0;
  if (ready) {
    apple.getIO().keyUp();
    key(83);
  }
  document
    .querySelectorAll(".stick i")
    .forEach((e: HTMLElement) => (e.style.transform = ""));
  document.querySelectorAll(".held").forEach((e) => e.classList.remove("held"));
}
function setPaused(p: boolean) {
  if (!ready) return;
  clearInputs();
  paused = p;
  if (p) {
    apple.stop();
    apple.getVideoModes().refresh();
    apple.getVideoModes().blit();
    sound?.suspend();
  } else {
    apple.run();
    sound?.resume();
  }
  $("pause").textContent = p ? "Reprendre" : "Pause";
}
function startSound() {
  if (!ready) return;
  if (sound) {
    sound.resume();
    return;
  }
  sound = new AudioContext();
  const queue: Float32Array[] = [];
  const node = sound.createScriptProcessor(1024, 1, 1);
  apple.getIO().sampleRate(sound.sampleRate, 1024);
  apple.getIO().addSampleListener((s) => {
    if (queue.length < 6) queue.push(new Float32Array(s));
  });
  node.onaudioprocess = (e) => {
    const dst = e.outputBuffer.getChannelData(0);
    dst.fill(0);
    const src = queue.shift();
    if (src) dst.set(src.subarray(0, dst.length));
  };
  node.connect(sound.destination);
  sound.resume();
}
document.addEventListener("pointerdown", startSound);
const pressed = new Set<string>();
const direction = () => {
  const x =
    Number(pressed.has("arrowright") || pressed.has("d")) -
    Number(pressed.has("arrowleft") || pressed.has("q"));
  const y =
    Number(pressed.has("arrowdown") || pressed.has("s")) -
    Number(pressed.has("arrowup") || pressed.has("z"));
  return (
    {
      "-1,-1": 81,
      "0,-1": 87,
      "1,-1": 69,
      "-1,0": 65,
      "0,0": 0,
      "1,0": 68,
      "-1,1": 90,
      "0,1": 88,
      "1,1": 67,
    }[`${x},${y}`] || 0
  );
};
let turn = 0;
inputTimer = window.setInterval(() => {
  if (!ready || paused) return;
  moveKey = direction();
  const actions = [
    moveKey,
    ...["i", "o", "p", "k", ";", "m", ",", "."]
      .filter((k) => pressed.has(k))
      .map((k) => k.toUpperCase().charCodeAt(0)),
    pressed.has(" ") || pressed.has("l") ? 76 : 0,
    pressed.has("e") ? 32 : 0,
  ].filter(Boolean);
  if (actions.length) key(actions[turn++ % actions.length]);
  else apple.getIO().keyUp();
}, 45);
window.addEventListener("keydown", (e) => {
  if (!ready || e.altKey || e.metaKey || ($("guide") as HTMLDialogElement).open)
    return;
  const k = e.key.toLowerCase();
  if (
    ![
      "arrowleft",
      "arrowright",
      "arrowup",
      "arrowdown",
      "z",
      "q",
      "s",
      "d",
      "i",
      "o",
      "p",
      "k",
      ";",
      "m",
      ",",
      ".",
      "l",
      " ",
      "e",
      "t",
      "u",
      "enter",
      "escape",
    ].includes(k)
  )
    return;
  e.preventDefault();
  startSound();
  if (e.repeat) return;
  pressed.add(k);
  if (e.ctrlKey) {
    key(k.toUpperCase().charCodeAt(0) - 64);
    return;
  }
  const code =
    { " ": 76, e: 32, t: 84, u: 85, enter: 13, escape: 27 }[k] ||
    direction() ||
    k.toUpperCase().charCodeAt(0);
  key(code);
});
window.addEventListener("keyup", (e) => {
  const before = direction();
  pressed.delete(e.key.toLowerCase());
  if (ready) {
    if (before && !direction()) key(83);
    apple.getIO().keyUp();
  }
});
window.addEventListener("blur", () => {
  pressed.clear();
  clearInputs();
});
$("pause").onclick = () => setPaused(!paused);
$("save").onclick = save;
let wasPaused = false;
$("help").onclick = () => {
  wasPaused = paused;
  setPaused(true);
  ($("guide") as HTMLDialogElement).showModal();
};
$("close-help").onclick = () => ($("guide") as HTMLDialogElement).close();
$("guide").addEventListener("close", () => setPaused(wasPaused));
$("restart").onclick = async () => {
  if (!confirm("Redémarrer la machine et effacer la reprise automatique ?"))
    return;
  if (db) await new Promise<void>((res, rej) => {
    const t = db.transaction("machine", "readwrite");
    t.objectStore("machine").delete("snapshot-v1");
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
  });
  location.reload();
};
let backgroundWasPaused = false;
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    backgroundWasPaused = paused;
    setPaused(true);
    save();
  } else if (!backgroundWasPaused) setPaused(false);
});
// Called by the Android activity before backgrounding; save is also available explicitly.
(window as any).castlePause = () => {
  backgroundWasPaused = paused;
  setPaused(true);
  save();
};
(window as any).castleResume = () => {
  if (!backgroundWasPaused) setPaused(false);
};
async function boot() {
  try {
    // Storage is optional: privacy settings must not block the emulator.
    try {
      db = await Promise.race([
        database(),
        new Promise<never>((_, reject) => window.setTimeout(
          () => reject(new Error("Storage timeout")), 2000,
        )),
      ]);
    } catch {
      db = undefined;
    }
    apple = new Apple2({
      canvas: $("screen") as HTMLCanvasElement,
      gl: false,
      rom: "fpbasic",
      characterRom: "apple2_char",
      e: false,
      enhanced: false,
      tick: () => {},
    });
    await apple.ready;
    disk = new DiskII(
      apple.getIO(),
      { driveLight: () => {}, dirty: () => {}, label: () => {} },
      16,
    );
    apple.getIO().setSlot(6, disk);
    const response = await fetch("castle.dsk");
    if (!response.ok) throw Error("Disquette absente");
    await disk.setBinary(
      1,
      "Castle Wolfenstein",
      "dsk",
      await response.arrayBuffer(),
    );
    apple.reset();
    const state = await readSave().catch(() => undefined);
    if (state) {
      try {
        apple.setState(state.state ?? state);
        // Visibility changes pause before saving. Resume on a fresh visit.
        paused = false;
        apple.getVideoModes().blit();
        status("Partie reprise");
      } catch {
        apple.reset();
        status("Reprise invalide : redémarrage");
      }
    } else status("Au titre : Entrée, puis K pour jouer au clavier.", true);
    ready = true;
    if (!paused) apple.run();
    else $("pause").textContent = "Reprendre";
    (window as any).castle = { apple, disk, save, key, setPaused, clearInputs };
  } catch (e) {
    status("Démarrage impossible : " + e + ". Rechargez la page pour réessayer.", true);
    console.error(e);
  }
}
boot();

$("view-toggle").onclick = () => {
  clearInputs();
  const hidden = document.body.classList.toggle("controls-hidden");
  $("view-toggle").textContent = hidden ? "Commandes" : "Écran seul";
  $("view-toggle").setAttribute("aria-pressed", String(hidden));
};

$("fullscreen").onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.documentElement.requestFullscreen)
      await document.documentElement.requestFullscreen();
    else status("Utilisez le mode paysage pour agrandir le jeu.");
  } catch {
    status("Le plein écran est indisponible dans ce navigateur.");
  }
};
document.addEventListener("fullscreenchange", () => {
  $("fullscreen").textContent = document.fullscreenElement
    ? "Quitter plein écran"
    : "Plein écran";
});
