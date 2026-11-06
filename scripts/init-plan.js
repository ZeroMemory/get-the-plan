#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { createHash, randomUUID } = require("crypto");

function parseArgs(argv) {
  const args = { title: "", slug: "", mode: "deep", root: process.cwd(), force: false, json: false };
  for (let i = 2; i < argv.length; i += 1) {
    const value = argv[i];
    if (["--title", "--slug", "--mode", "--root"].includes(value)) {
      const next = argv[++i];
      if (!next || next.startsWith("--")) throw new Error(`Missing value for ${value}`);
      args[value.slice(2)] = next;
    }
    else if (value === "--force") args.force = true;
    else if (value === "--json") args.json = true;
    else if (!value.startsWith("-") && !args.title) args.title = value;
    else throw new Error(`Unknown argument: ${value}`);
  }
  return args;
}

function slugify(input) {
  return String(input || "plan")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "plan";
}

function readTemplate(pluginRoot, name) {
  return fs.readFileSync(path.join(pluginRoot, "assets", "templates", name), "utf8");
}

function render(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || "");
}

function publishExclusive(source, destination, onPublish = () => {}) {
  try {
    fs.linkSync(source, destination);
    onPublish(true);
    return true;
  } catch (error) {
    if (!['ENOTSUP', 'EOPNOTSUPP', 'ENOSYS', 'EPERM'].includes(error.code)) throw error;
    const descriptor = fs.openSync(destination, 'wx');
    try {
      onPublish(false, fs.fstatSync(descriptor));
      fs.writeFileSync(descriptor, fs.readFileSync(source));
    } finally { fs.closeSync(descriptor); }
    return false;
  }
}

function snapshot(file, allowLinks = false) {
  try {
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink() || (!allowLinks && stat.nlink > 1)) throw new Error(`Refusing linked or non-file plan path: ${file}`);
    const fd = fs.openSync(file, 'r');
    try {
      const opened = fs.fstatSync(fd);
      const hash = createHash('sha256').update(fs.readFileSync(fd)).digest('hex');
      const after = fs.fstatSync(fd), named = fs.lstatSync(file);
      for (const info of [opened, after, named]) {
        if (info.dev !== stat.dev || info.ino !== stat.ino || info.nlink !== stat.nlink || info.size !== stat.size || info.mtimeMs !== stat.mtimeMs || info.ctimeMs !== stat.ctimeMs) throw new Error(`Plan file changed during read: ${file}`);
      }
      return { dev: stat.dev, ino: stat.ino, nlink: stat.nlink, hash };
    } finally { fs.closeSync(fd); }
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function sameSnapshot(a, b) {
  return a && b && a.dev === b.dev && a.ino === b.ino && a.nlink === b.nlink && a.hash === b.hash;
}

function writePlan(entries, force) {
  const pending = entries.filter(({ baseline }) => force || !baseline);
  if (!pending.length) return [];
  const workspace = path.join(path.dirname(pending[0].file), `.plan-${randomUUID()}`);
  fs.mkdirSync(workspace);
  let preserveWorkspace = false;
  try {
    for (const entry of pending) {
      entry.staged = path.join(workspace, `${path.basename(entry.file)}.tmp`);
      fs.writeFileSync(entry.staged, entry.content, { flag: 'wx' });
      entry.publishedHash = createHash('sha256').update(entry.content).digest('hex');
      try { entry.stagedIdentity = snapshot(entry.staged); } catch (error) { preserveWorkspace = true; throw error; }
      if (!entry.stagedIdentity || entry.stagedIdentity.hash !== entry.publishedHash) { preserveWorkspace = true; throw new Error(`Prepared plan changed: ${entry.staged}`); }
    }
    for (const entry of pending) {
      rejectLink(entry.file);
      if (entry.baseline) {
        entry.backup = path.join(workspace, `${path.basename(entry.file)}.bak`);
        fs.renameSync(entry.file, entry.backup);
        if (!sameSnapshot(entry.baseline, snapshot(entry.backup))) throw new Error(`Plan file changed during preparation: ${entry.file}`);
      }
      const staged = fs.lstatSync(entry.staged);
      preserveWorkspace = true;
      if (!sameSnapshot(entry.stagedIdentity, snapshot(entry.staged, true))) throw new Error(`Prepared plan changed: ${entry.staged}`);
      preserveWorkspace = false;
      const linked = publishExclusive(entry.staged, entry.file, (isLink, info) => {
        entry.published = true;
        entry.identity = isLink ? { dev: staged.dev, ino: staged.ino, nlink: staged.nlink + 1 } : info;
      });
      entry.complete = true;
      preserveWorkspace = true;
      if (!sameSnapshot(snapshot(entry.file, true), { ...entry.identity, hash: entry.publishedHash })) throw new Error(`Published plan changed: ${entry.file}`);
      preserveWorkspace = false;
      fs.unlinkSync(entry.staged);
      if (linked) entry.identity.nlink -= 1;
      preserveWorkspace = true;
      if (!sameSnapshot(snapshot(entry.file, true), { ...entry.identity, hash: entry.publishedHash })) throw new Error(`Published plan changed: ${entry.file}`);
      preserveWorkspace = false;
    }
  } catch (error) {
    const unrestored = [];
    for (const entry of [...pending].reverse()) {
      try {
        if (entry.published) {
          const current = path.join(workspace, `${path.basename(entry.file)}.current`);
          fs.renameSync(entry.file, current);
          const saved = snapshot(current, true);
          if (!entry.complete && saved && saved.dev === entry.identity.dev && saved.ino === entry.identity.ino && saved.nlink === entry.identity.nlink) {
            if (entry.backup) { publishExclusive(entry.backup, entry.file); fs.unlinkSync(entry.backup); entry.backup = null; }
            throw new Error(`Partial output retained: ${current}`);
          }
          if (!sameSnapshot(saved, { ...entry.identity, hash: entry.publishedHash })) {
            publishExclusive(current, entry.file);
            throw new Error(`Plan file changed during rollback: ${current}`);
          }
          if (entry.backup) {
            publishExclusive(entry.backup, entry.file);
            fs.unlinkSync(entry.backup);
            entry.backup = null;
          }
          fs.unlinkSync(current);
        } else if (entry.backup && fs.existsSync(entry.backup)) {
          publishExclusive(entry.backup, entry.file);
          fs.unlinkSync(entry.backup);
          entry.backup = null;
        }
      } catch {
        unrestored.push(entry.file);
      }
    }
    if (unrestored.length || preserveWorkspace) {
      const detail = unrestored.length ? `rollback incomplete for ${unrestored.join(', ')}` : 'prepared files retained';
      throw new Error(`${error.message}; ${detail}; recovery files: ${workspace}`, { cause: error });
    }
    throw error;
  } finally {
    if (!preserveWorkspace) {
      for (const entry of pending) if (entry.staged && fs.existsSync(entry.staged)) fs.unlinkSync(entry.staged);
      try { fs.rmdirSync(workspace); } catch (error) { if (error.code !== 'ENOTEMPTY') throw error; }
    }
  }
  try {
    for (const entry of pending) if (entry.backup) fs.unlinkSync(entry.backup);
    try { fs.rmdirSync(workspace); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  } catch (error) {
    throw new Error(`Plan outputs were published but backup cleanup failed: ${error.message}; recovery files: ${workspace}`, { cause: error });
  }
  return pending.map(({ file }) => file);
}
function rejectLink(file) {
  try {
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink() || (stat.isFile() && stat.nlink > 1)) throw new Error(`Refusing linked plan path: ${file}`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

function main() {
  const args = parseArgs(process.argv);
  const pluginRoot = path.resolve(__dirname, "..");
  const title = args.title || "Development Plan";
  const slug = args.slug || slugify(title);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 64 || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(slug)) {
    throw new Error("Slug must be a non-reserved kebab-case name of at most 64 characters");
  }
  if (!["quick", "deep", "agent", "review"].includes(args.mode)) throw new Error("Invalid plan mode");
  const root = path.resolve(args.root);
  const planDir = path.join(root, ".plans", slug);
  rejectLink(path.join(root, ".plans"));
  rejectLink(planDir);
  fs.mkdirSync(planDir, { recursive: true });

  const vars = {
    title,
    slug,
    repo_root: root,
    stack: "unknown until repo scan",
    test_commands: "unknown until repo scan",
    build_commands: "unknown until repo scan"
  };

  const files = ["context.md", "brief.md", "plan.md", "tasks.md", "critique.md", "handoff.md"];
  const baseline = {};
  for (const file of [...files, "state.json"]) {
    const out = path.join(planDir, file);
    rejectLink(out);
    baseline[out] = snapshot(out);
  }
  const entries = files.map(file => ({ file: path.join(planDir, file), content: render(readTemplate(pluginRoot, file), vars), baseline: baseline[path.join(planDir, file)] }));

  const now = new Date().toISOString();
  const state = {
    slug,
    mode: args.mode,
    status: "draft",
    createdAt: now,
    updatedAt: now,
    ambiguity: null,
    scores: {
      clarity: 0,
      testability: 0,
      decomposition: 0,
      riskControl: 0,
      executionReadiness: 0
    },
    artifacts: Object.fromEntries(files.map((file) => [path.basename(file, ".md"), path.join(".plans", slug, file).replace(/\\/g, "/")])),
    openQuestions: [],
    criticalFindings: []
  };

  const statePath = path.join(planDir, "state.json");
  entries.push({ file: statePath, content: JSON.stringify(state, null, 2) + "\n", baseline: baseline[statePath] });
  const written = writePlan(entries, args.force);
  const skipped = entries.map(({ file }) => file).filter(file => !written.includes(file));

  const result = { planDir, slug, title, written, skipped };
  if (args.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } else {
    process.stdout.write(`Created plan directory: ${planDir}\n`);
    if (written.length) process.stdout.write(`Written:\n${written.map((f) => `- ${f}`).join("\n")}\n`);
    if (skipped.length) process.stdout.write(`Skipped existing:\n${skipped.map((f) => `- ${f}`).join("\n")}\n`);
  }
}

try { main(); } catch (error) {
  process.stderr.write(`init-plan: ${error.message}\n`);
  process.exitCode = 2;
}
