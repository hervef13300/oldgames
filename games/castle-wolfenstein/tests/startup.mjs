import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const bundle = await readFile('dist/games/castle-wolfenstein/app.js', 'utf8');
const disk = await readFile('dist/games/castle-wolfenstein/castle.dsk');

async function boot({ storageBlocked = false, saved, gamepadBlocked = true } = {}) {
  const elements = new Map();
  const frames = new Map();
  const listeners = new Map();
  let clock = 0, frameId = 0, gamepadCalls = 0;
  const context2d = {
    createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    putImageData() {}, drawImage() {},
  };
  const element = () => ({ textContent: '', style: {}, open: false, width: 560, height: 384,
    getContext: () => context2d, addEventListener() {}, setAttribute() {},
    classList: { remove() {}, toggle() { return false; } },
  });
  const request = (value) => {
    const r = { result: value };
    queueMicrotask(() => r.onsuccess?.());
    return r;
  };
  const db = { transaction: () => ({ objectStore: () => ({ get: () => request(saved) }) }) };
  const sandbox = {
    console, Uint8Array, Uint8ClampedArray, Float32Array, ArrayBuffer, TextDecoder, URL,
    setTimeout: () => 1, clearTimeout() {}, setInterval: () => 1, clearInterval() {},
    Date: class extends Date { static now() { return clock; } },
    performance: { now: () => clock },
    requestAnimationFrame: (fn) => { frames.set(++frameId, fn); return frameId; },
    cancelAnimationFrame: (id) => frames.delete(id),
    indexedDB: { open() { if (storageBlocked) throw new Error('Storage denied'); return request(db); } },
    navigator: { getGamepads() { gamepadCalls++; if (gamepadBlocked) throw new Error('Gamepad access denied by permissions policy'); return []; } },
    document: { hidden: false, createElement: element, querySelectorAll: () => [],
      getElementById(id) { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); },
      addEventListener() {},
    },
    addEventListener: (name, fn) => listeners.set(name, fn),
    fetch: async () => ({ ok: true, arrayBuffer: async () => disk.buffer.slice(disk.byteOffset, disk.byteOffset + disk.byteLength) }),
  };
  sandbox.window = sandbox;
  vm.runInNewContext(bundle, sandbox);
  for (let i = 0; i < 20 && !sandbox.castle; i++) await new Promise(setImmediate);
  assert(sandbox.castle, `Emulator failed to start: ${elements.get('status').textContent}`);
  return { ...sandbox.castle, elements, listeners, gamepadCalls: () => gamepadCalls,
    frame() { clock += 20; const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(clock)); },
    pendingFrames: () => frames.size,
  };
}

const normal = await boot();
normal.frame(); normal.frame();
assert(normal.apple.getStats().cycles > 20000);
assert.equal(normal.pendingFrames(), 1, 'Emulation loop must keep scheduling frames');
assert.equal(normal.gamepadCalls(), 0, 'Keyboard-only game must not request gamepad permissions');
console.log('PASS: emulator keeps running when gamepad access is denied');
const restricted = await boot({ storageBlocked: true });
restricted.frame(); restricted.frame();
assert(restricted.apple.getStats().cycles > 20000);
console.log('PASS: unavailable browser storage does not prevent startup');
const restored = await boot({ saved: { state: normal.apple.getState(), paused: true } });
restored.frame(); restored.frame();
assert.equal(restored.pendingFrames(), 1);
assert(restored.apple.getStats().cycles > 0);
console.log('PASS: a save made in the background resumes running');

// Exercise the actual disk and 6502 program through title, keyboard choice,
// and castle generation. Canvas is mocked; this is not browser visual QA.
const cpu = normal.apple.getCPU();
cpu.stepCycles(20_000_000);
normal.key(13);
cpu.stepCycles(3_000_000);
normal.key(75);
cpu.stepCycles(200_000_000);
assert.equal(cpu.read(0x4347), 10, 'A new game must start with ten bullets');
console.log('PASS: original disk boots and starts a keyboard game');
