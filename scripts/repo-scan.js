#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");

const DEFAULT_IGNORES = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "out",
  "target",
  ".next",
  ".turbo",
  ".venv",
  "venv",
  "__pycache__",
  "reference-projects"
]);

function parseArgs(argv) {
  const args = { root: process.cwd(), json: false, maxFiles: 4000, includeReferenceProjects: false };
  for (let i = 2; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === "--root") {
      args.root = argv[++i];
      if (!args.root || args.root.startsWith("--")) throw new Error("Missing --root value");
    }
    else if (value === "--json") args.json = true;
    else if (value === "--max-files") {
      args.maxFiles = Number(argv[++i]);
      if (!Number.isSafeInteger(args.maxFiles) || args.maxFiles < 1 || args.maxFiles > 1000000) throw new Error("--max-files must be an integer from 1 to 1000000");
    }
    else if (value === "--include-reference-projects") args.includeReferenceProjects = true;
    else throw new Error(`Unknown argument: ${value}`);
  }
  return args;
}

function safeReadJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
  } catch {
    return null;
  }
}

function exists(root, rel) {
  return fs.existsSync(path.join(root, rel));
}

function walk(root, args) {
  const files = [];
  const dirs = [];
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      const rel = path.relative(root, full).replace(/\\/g, "/");
      if (entry.isDirectory()) {
        if (DEFAULT_IGNORES.has(entry.name) && !(entry.name === "reference-projects" && args.includeReferenceProjects)) continue;
        dirs.push(rel);
        stack.push(full);
      } else if (entry.isFile()) {
        if (files.length >= args.maxFiles) return { files, dirs, truncated: true };
        files.push(rel);
      }
    }
  }
  return { files, dirs, truncated: false };
}

function detectPackageScripts(root) {
  const pkgPath = path.join(root, "package.json");
  const pkg = safeReadJson(pkgPath);
  if (!pkg) return null;
  const scripts = pkg.scripts || {};
  return {
    packageManager: exists(root, "pnpm-lock.yaml") ? "pnpm" : exists(root, "yarn.lock") ? "yarn" : "npm",
    scripts,
    testCommands: Object.keys(scripts).filter((key) => /test|spec|vitest|jest|playwright|e2e/i.test(key)).map((key) => `${key}: ${scripts[key]}`),
    buildCommands: Object.keys(scripts).filter((key) => /build|typecheck|lint/i.test(key)).map((key) => `${key}: ${scripts[key]}`)
  };
}

function tryGit(root, args) {
  try {
    const branch = childProcess.execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    const status = childProcess.execFileSync("git", ["status", "--short"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    return { isRepo: true, branch, dirty: Boolean(status), statusLines: status ? status.split(/\r?\n/).slice(0, 80) : [] };
  } catch {
    return { isRepo: false };
  }
}

function main() {
  const args = parseArgs(process.argv);
  const root = path.resolve(args.root);
  if (!fs.statSync(root).isDirectory()) throw new Error("Root must be a directory");
  const inventory = walk(root, args);
  const fileSet = new Set(inventory.files);

  const packageInfo = detectPackageScripts(root);
  const markers = {
    node: fileSet.has("package.json"),
    python: fileSet.has("pyproject.toml") || fileSet.has("requirements.txt") || fileSet.has("setup.py"),
    rust: fileSet.has("Cargo.toml"),
    go: fileSet.has("go.mod"),
    dotnet: inventory.files.some((f) => /\.csproj$|\.sln$/i.test(f)),
    java: fileSet.has("pom.xml") || fileSet.has("build.gradle") || fileSet.has("settings.gradle"),
    docker: inventory.files.some((f) => /^Dockerfile|docker-compose\.ya?ml$/i.test(f))
  };

  const docs = inventory.files.filter((f) => /(^|\/)(README|AGENTS|CLAUDE|CONTEXT|CONTEXT-MAP|codex)\.md$/i.test(f) || /^docs\//i.test(f)).slice(0, 120);
  const tests = inventory.files.filter((f) => /(^|\/)(test|tests|spec|__tests__)\//i.test(f) || /\.(test|spec)\.[a-z0-9]+$/i.test(f)).slice(0, 160);
  const plans = inventory.files.filter((f) => /^\.plans\//i.test(f) || /^specs\//i.test(f) || /plan|prd|roadmap|architecture|adr/i.test(f)).slice(0, 160);
  const standards = inventory.files.filter((f) => /(^|\/)(agent-os\/standards|\.cursor\/rules|\.github\/copilot-instructions|AGENTS\.md|CLAUDE\.md|CONTEXT\.md)/i.test(f)).slice(0, 120);

  const result = {
    root,
    git: tryGit(root, args),
    markers,
    package: packageInfo,
    counts: {
      files: inventory.files.length,
      dirs: inventory.dirs.length,
      tests: tests.length,
      docs: docs.length,
      plans: plans.length,
      standards: standards.length
    },
    truncated: inventory.truncated,
    topLevelDirs: inventory.dirs.filter((d) => !d.includes("/")).sort(),
    docs,
    tests,
    plans,
    standards,
    likelyCommands: {
      test: packageInfo ? packageInfo.testCommands : [],
      build: packageInfo ? packageInfo.buildCommands : []
    }
  };

  if (args.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } else {
    process.stdout.write(`Root: ${result.root}\n`);
    process.stdout.write(`Files scanned: ${result.counts.files}${result.truncated ? " (truncated)" : ""}\n`);
    process.stdout.write(`Stack markers: ${Object.entries(markers).filter(([, v]) => v).map(([k]) => k).join(", ") || "unknown"}\n`);
    if (result.likelyCommands.test.length) process.stdout.write(`Test scripts:\n${result.likelyCommands.test.map((x) => `- ${x}`).join("\n")}\n`);
    if (result.docs.length) process.stdout.write(`Docs:\n${result.docs.slice(0, 20).map((x) => `- ${x}`).join("\n")}\n`);
  }
}

try { main(); } catch (error) {
  process.stderr.write(`repo-scan: ${error.message}\n`);
  process.exitCode = 2;
}
