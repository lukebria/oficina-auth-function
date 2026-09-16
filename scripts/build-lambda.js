#!/usr/bin/env node
const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const stagingDir = path.join(root, "terraform", ".build", "lambda");

execSync("npm run build", { cwd: root, stdio: "inherit" });

fs.rmSync(stagingDir, { recursive: true, force: true });
fs.mkdirSync(stagingDir, { recursive: true });

const skipMaps = { filter: (src) => !src.endsWith(".js.map") };

fs.cpSync(path.join(root, "dist", "src"), path.join(stagingDir, "src"), {
  recursive: true,
  ...skipMaps,
});

fs.cpSync(
  path.join(root, "node_modules", "jose"),
  path.join(stagingDir, "node_modules", "jose"),
  { recursive: true },
);

console.log(`Pacote da Lambda preparado em ${stagingDir}`);
