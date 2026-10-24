const fs = require("fs");
const path = require("path");

const assetsDirectory = path.join(__dirname, "assets");
const manifestPath = path.join(__dirname, "assets-manifest.json");
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);

const imagePaths = fs.readdirSync(assetsDirectory, { withFileTypes: true })
  .filter(entry => entry.isFile() && imageExtensions.has(path.extname(entry.name).toLowerCase()))
  .map(entry => `assets/${entry.name}`)
  .sort((left, right) => left.localeCompare(right, undefined, {
    numeric: true,
    sensitivity: "base"
  }));

fs.writeFileSync(manifestPath, `${JSON.stringify(imagePaths, null, 2)}\n`);
console.log(`Wrote ${imagePaths.length} image paths to assets-manifest.json.`);
