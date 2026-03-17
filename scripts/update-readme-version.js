const fs = require("fs");
const path = require("path");

const packageJson = require("../package.json");
const readmePath = path.join(__dirname, "..", "README.md");

let readme = fs.readFileSync(readmePath, "utf8");

readme = readme.replace(
  /# 🕹️ Ninehub — v[\d.]+/,
  `# 🕹️ Ninehub — v${packageJson.version}`,
);

fs.writeFileSync(readmePath, readme);

console.log("README version updated to v" + packageJson.version);
