#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const VAGUE_TERMS = [
  "fast",
  "performant",
  "scalable",
  "robust",
  "clean",
  "simple",
  "intuitive",
  "easy",
  "secure",
  "reliable",
  "production-ready",
  "polished",
  "comprehensive",
  "seamless",
  "better",
  "optimized",
  "user-friendly",
  "flexible",
  "maintainable"
];

const REQUIRED_FILES = ["brief.md", "context.md", "plan.md", "tasks.md"];

function parseArgs(argv) {
  const args = { target: "", json: false, failOn: "critical" };
  for (let i = 2; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === "--json") args.json = true;
    else if (value === "--fail-on") {
      args.failOn = argv[++i];
      if (!["critical", "high", "medium"].includes(args.failOn)) throw new Error("--fail-on must be critical, high, or medium");
    }
    else if (!value.startsWith("-") && !args.target) args.target = value;
    else throw new Error(`Unknown argument: ${value}`);
  }
  if (!args.target) args.target = process.cwd();
  return args;
}

function readIfExists(file) {
  try {
    return fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  } catch (error) {
    if (error.code === "ENOENT") return "";
    throw error;
  }
}

function hasHeading(text, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^#{1,3}\\s+${escaped}\\s*$`, "im").test(text);
}

function sectionText(text, heading) {
  const lines = text.split(/\r?\n/);
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const wanted = new RegExp(`^#{1,3}\\s+${escaped}\\s*$`, "i");
  const anyHeading = /^#{1,3}\s+\S/;
  const start = lines.findIndex((line) => wanted.test(line));
  if (start < 0) return "";

  const body = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    if (anyHeading.test(lines[i])) break;
    body.push(lines[i]);
  }
  return body.join("\n").trim();
}

function lineOf(text, needle) {
  const idx = text.toLowerCase().indexOf(needle.toLowerCase());
  if (idx < 0) return null;
  return text.slice(0, idx).split(/\r?\n/).length;
}

function add(findings, severity, category, file, issue, fix, line) {
  const prefix = { clarity: "C", testability: "T", decomposition: "D", risk: "R", execution: "E", format: "F" }[category] || "F";
  const id = `${prefix}${String(findings.filter((f) => f.category === category).length + 1).padStart(3, "0")}`;
  findings.push({ id, severity, category, location: line ? `${file}:${line}` : file, issue, fix });
}

function countCheckedTasks(text) {
  return (text.match(/^- \[[ xX]\]\s+T\d{3}/gm) || []).length;
}

function lint(target) {
  const stats = fs.existsSync(target) ? fs.statSync(target) : null;
  if (!stats) {
    return {
      target,
      verdict: "BLOCK",
      score: 0,
      findings: [{ id: "F001", severity: "CRITICAL", category: "format", location: target, issue: "Target does not exist", fix: "Create the plan directory or pass a valid plan file" }]
    };
  }

  const dir = stats.isDirectory() ? target : path.dirname(target);
  const files = stats.isDirectory()
    ? Object.fromEntries(REQUIRED_FILES.concat(["critique.md", "handoff.md"]).map((file) => [file, path.join(dir, file)]))
    : { [path.basename(target)]: target };

  const contents = Object.fromEntries(Object.entries(files).map(([name, file]) => [name, readIfExists(file)]));
  const allText = Object.values(contents).join("\n\n");
  const findings = [];

  if (stats.isDirectory()) {
    for (const file of REQUIRED_FILES) {
      if (!contents[file]) add(findings, "CRITICAL", "format", file, "Required artifact is missing", `Create ${file} from the template`);
    }
  }

  const brief = contents["brief.md"] || allText;
  const plan = contents["plan.md"] || allText;
  const tasks = contents["tasks.md"] || allText;

  if (!hasHeading(brief, "Goal") || sectionText(brief, "Goal").length < 20) {
    add(findings, "CRITICAL", "clarity", "brief.md", "Goal is missing or too thin", "Write a concrete desired outcome, not only a feature name");
  }
  if (!hasHeading(brief, "Non-Goals") || !/-\s+\S/.test(sectionText(brief, "Non-Goals"))) {
    add(findings, "CRITICAL", "clarity", "brief.md", "Non-goals are missing", "List what must stay out of the first pass");
  }
  if (!hasHeading(brief, "Success Criteria") || !/- \[[ xX]\]\s+\S/.test(sectionText(brief, "Success Criteria"))) {
    add(findings, "CRITICAL", "testability", "brief.md", "Success criteria are missing", "Add observable criteria with checkboxes");
  }
  if (!hasHeading(brief, "Decision Boundaries") || sectionText(brief, "Decision Boundaries").length < 30) {
    add(findings, "HIGH", "clarity", "brief.md", "Decision boundaries are weak or missing", "State what Codex may decide and what needs user approval");
  }

  if (!hasHeading(plan, "Risks And Mitigations") && !hasHeading(plan, "Risks and Mitigations")) {
    add(findings, "HIGH", "risk", "plan.md", "Risk section is missing", "Add risks, severity, mitigation, and verification");
  }
  if (!hasHeading(plan, "Verification Plan") || sectionText(plan, "Verification Plan").replace(/[-:*`\s]/g, "").length < 20) {
    add(findings, "CRITICAL", "testability", "plan.md", "Verification plan is missing", "Add exact automated/manual/regression checks");
  }
  if (!hasHeading(plan, "Rollback / Recovery")) {
    add(findings, "MEDIUM", "risk", "plan.md", "Rollback or recovery plan is missing", "Add rollback guidance or explain why it is not needed");
  }

  const taskCount = countCheckedTasks(tasks);
  if (taskCount === 0) {
    add(findings, "CRITICAL", "decomposition", "tasks.md", "No task IDs found", "Use checklist tasks with IDs like T001");
  }
  const taskBlocks = tasks.split(/(?=^- \[[ xX]\]\s+T\d{3})/gm).filter((block) => /^- \[[ xX]\]\s+T\d{3}/m.test(block));
  for (const block of taskBlocks) {
    const header = (block.match(/^- \[[ xX]\]\s+(T\d{3}.*)$/m) || [null, "task"])[1];
    const line = lineOf(tasks, header);
    if (!/Acceptance:[ \t]*\S[^\r\n]*/i.test(block)) add(findings, "HIGH", "decomposition", "tasks.md", `${header} has no acceptance criteria`, "Add an Acceptance line", line);
    if (!/Verify:[ \t]*\S[^\r\n]*/i.test(block)) add(findings, "HIGH", "testability", "tasks.md", `${header} has no verification`, "Add a Verify line with command or manual check", line);
    if (!/Files:[ \t]*[^`\s][^\r\n]*|Files:[ \t]*`[^`\s]+`/i.test(block)) add(findings, "MEDIUM", "execution", "tasks.md", `${header} has no file ownership`, "Add a Files line with paths or a discovery target", line);
  }

  const placeholderRe = /\b(TBD|TODO|fill in|placeholder)\b|\{\{[^}]+\}\}/i;
  for (const [name, text] of Object.entries(contents)) {
    if (!text) continue;
    const match = text.match(placeholderRe);
    if (match) add(findings, "HIGH", "format", name, `Placeholder remains: ${match[0]}`, "Replace placeholders before execution", lineOf(text, match[0]));
  }

  const vaguePattern = new RegExp(`\\b(${VAGUE_TERMS.map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "ig");
  const vagueMatches = [...allText.matchAll(vaguePattern)].map((m) => m[1].toLowerCase());
  const uniqueVague = [...new Set(vagueMatches)].slice(0, 20);
  if (uniqueVague.length) {
    add(findings, uniqueVague.length > 5 ? "HIGH" : "MEDIUM", "clarity", "all", `Vague terms found: ${uniqueVague.join(", ")}`, "Replace vague terms with metrics, examples, or observable checks");
  }

  const severityCounts = findings.reduce((acc, finding) => {
    acc[finding.severity] = (acc[finding.severity] || 0) + 1;
    return acc;
  }, {});
  const penalty = (severityCounts.CRITICAL || 0) * 25 + (severityCounts.HIGH || 0) * 12 + (severityCounts.MEDIUM || 0) * 5 + (severityCounts.LOW || 0) * 2;
  const score = Math.max(0, Math.min(100, 100 - penalty));
  const verdict = (severityCounts.CRITICAL || 0) > 0 ? "BLOCK" : (severityCounts.HIGH || 0) > 0 ? "REVISE" : "APPROVE";
  return { target: path.resolve(target), verdict, score, severityCounts, taskCount, findings };
}

function main() {
  const args = parseArgs(process.argv);
  const result = lint(path.resolve(args.target));
  if (args.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } else {
    process.stdout.write(`Verdict: ${result.verdict}\nScore: ${result.score}\nTasks: ${result.taskCount || 0}\n`);
    for (const finding of result.findings) {
      process.stdout.write(`- [${finding.severity}] ${finding.location}: ${finding.issue} -> ${finding.fix}\n`);
    }
  }
  const failLevels = args.failOn === "high" ? ["CRITICAL", "HIGH"] : args.failOn === "medium" ? ["CRITICAL", "HIGH", "MEDIUM"] : ["CRITICAL"];
  if (result.findings.some((finding) => failLevels.includes(finding.severity))) process.exitCode = 1;
}

try { main(); } catch (error) {
  process.stderr.write(`planlint: ${error.message}\n`);
  process.exitCode = 2;
}
