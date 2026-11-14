import { Game, Mode } from "../src/game.js";
import { createRenderer } from "../src/render.js";
import { writeFile } from "node:fs/promises";
const parts = [],
  stack = [];
const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
let path = "";
const ctx = {
  fillStyle: "#000",
  strokeStyle: "#fff",
  font: "12px monospace",
  lineWidth: 1,
  transform: "",
  save() {
    stack.push({
      fillStyle: this.fillStyle,
      strokeStyle: this.strokeStyle,
      font: this.font,
      lineWidth: this.lineWidth,
      transform: this.transform,
    });
  },
  restore() {
    Object.assign(this, stack.pop());
  },
  translate(x, y) {
    this.transform += ` translate(${x} ${y})`;
  },
  scale(x, y) {
    this.transform += ` scale(${x} ${y})`;
  },
  rotate(r) {
    this.transform += ` rotate(${(r * 180) / Math.PI})`;
  },
  fillRect(x, y, w, h) {
    parts.push(
      `<rect x="${x}" y="${y}" width="${Math.max(0, w)}" height="${Math.max(0, h)}" fill="${this.fillStyle}" transform="${this.transform}"/>`,
    );
  },
  fillText(s, x, y) {
    parts.push(
      `<text x="${x}" y="${y}" fill="${this.fillStyle}" font-family="monospace" font-size="${parseFloat(this.font)}" transform="${this.transform}">${esc(s)}</text>`,
    );
  },
  measureText(s) {
    return { width: String(s).length * 8 };
  },
  beginPath() {
    path = "";
  },
  moveTo(x, y) {
    path += `M${x},${y}`;
  },
  lineTo(x, y) {
    path += `L${x},${y}`;
  },
  stroke() {
    parts.push(
      `<path d="${path}" fill="none" stroke="${this.strokeStyle}" stroke-width="${this.lineWidth}" transform="${this.transform}"/>`,
    );
  },
};
const g = new Game(Mode.ASSISTED);
g.start();
g.x = 980;
g.y = 220;
g.time = 12;
g.jets.push({ x: 1320, y: 145, vx: -240, hp: 1 });
g.message = "Première caserne ouverte · ramenez les personnes à la base";
createRenderer(ctx)(g);
await writeFile(
  "public/assets/choplifter.svg",
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 420">' +
    parts.join("") +
    "</svg>",
);
