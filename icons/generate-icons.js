/**
 * This script generates PNG icons from the canvas.
 * Run by opening generate.html in a browser and saving the images.
 * Or run with Node.js + canvas package.
 */

// For Node.js with canvas package:
// npm install canvas
// node generate-icons.js

const fs = require("fs");
const { createCanvas } = require("canvas");

const sizes = [16, 32, 48, 128];

function drawIcon(ctx, size) {
  const scale = size / 128;

  // Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, size, size);
  bgGrad.addColorStop(0, "#1a5f4a");
  bgGrad.addColorStop(1, "#0d3d2e");

  // Gold gradient
  const goldGrad = ctx.createLinearGradient(0, 0, size, size);
  goldGrad.addColorStop(0, "#d4af37");
  goldGrad.addColorStop(1, "#f4d03f");

  // Background circle
  ctx.beginPath();
  ctx.arc(64 * scale, 64 * scale, 60 * scale, 0, Math.PI * 2);
  ctx.fillStyle = bgGrad;
  ctx.fill();

  // Border
  ctx.beginPath();
  ctx.arc(64 * scale, 64 * scale, 56 * scale, 0, Math.PI * 2);
  ctx.strokeStyle = "#d4af37";
  ctx.lineWidth = Math.max(1, 2 * scale);
  ctx.stroke();

  // Mosque body
  ctx.beginPath();
  ctx.moveTo(64 * scale, 25 * scale);
  ctx.bezierCurveTo(
    40 * scale,
    25 * scale,
    30 * scale,
    50 * scale,
    30 * scale,
    60 * scale
  );
  ctx.lineTo(30 * scale, 88 * scale);
  ctx.lineTo(98 * scale, 88 * scale);
  ctx.lineTo(98 * scale, 60 * scale);
  ctx.bezierCurveTo(
    98 * scale,
    50 * scale,
    88 * scale,
    25 * scale,
    64 * scale,
    25 * scale
  );
  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  ctx.fill();

  // Dome
  ctx.beginPath();
  ctx.ellipse(
    64 * scale,
    50 * scale,
    20 * scale,
    16 * scale,
    0,
    0,
    Math.PI * 2
  );
  ctx.fillStyle = "#d4af37";
  ctx.fill();

  // Crescent
  ctx.beginPath();
  ctx.arc(64 * scale, 30 * scale, 5 * scale, 0, Math.PI * 2);
  ctx.fillStyle = "#d4af37";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(66 * scale, 29 * scale, 4 * scale, 0, Math.PI * 2);
  ctx.fillStyle = "#1a5f4a";
  ctx.fill();

  if (size >= 32) {
    // Windows
    ctx.beginPath();
    ctx.ellipse(
      52 * scale,
      72 * scale,
      5 * scale,
      8 * scale,
      0,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = "#1a5f4a";
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(
      76 * scale,
      72 * scale,
      5 * scale,
      8 * scale,
      0,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = "#1a5f4a";
    ctx.fill();

    // Door
    ctx.beginPath();
    ctx.moveTo(58 * scale, 88 * scale);
    ctx.lineTo(58 * scale, 76 * scale);
    ctx.quadraticCurveTo(64 * scale, 70 * scale, 70 * scale, 76 * scale);
    ctx.lineTo(70 * scale, 88 * scale);
    ctx.fillStyle = "#1a5f4a";
    ctx.fill();
  }
}

sizes.forEach((size) => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  drawIcon(ctx, size);

  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(`icon${size}.png`, buffer);
  console.log(`Generated icon${size}.png`);
});

console.log("All icons generated!");
