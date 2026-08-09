#!/usr/bin/env node
// Advisory file-length report — docs/CodingStandards.md §1.2/§1.3. Counts
// code lines only (comments and blanks excluded), compares against the
// per-category soft budget, and honours the `@maxLines N` escape hatch.
// Never exits non-zero: "size never blocks a merge" (PLAN §20.3).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../src", import.meta.url));

// [pattern to match against the path relative to src/, budget, label]
// First match wins — order matters. `null` budget means "unlimited": still
// walked and reported, never flagged.
const CATEGORIES = [
    [/\.types\.ts$/, 400, "types"],
    [/^i18n\//, null, "i18n data"],
    [/^constants\//, null, "constants/data"],
    [/^components\/.*\/use[A-Z].*\.tsx?$/, 150, "hook"],
    [/(^|\/)use[A-Z][^/]*\.tsx?$/, 150, "hook"],
    [/\.tsx$/, 200, "component"],
    [/^engines\//, 300, "engine orchestration"],
    [/\.ts$/, null, "other"],
];

const categorize = (relPath) => {
    for (const [pattern, budget, label] of CATEGORIES) {
        if (pattern.test(relPath)) return { budget, label };
    }
    return { budget: null, label: "other" };
};

const walk = (dir, out = []) => {
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        const stat = statSync(full);
        if (stat.isDirectory()) {
            if (entry === "_private" || entry === "node_modules") continue;
            walk(full, out);
        } else if ([".ts", ".tsx"].includes(extname(entry)) && !entry.endsWith(".d.ts")) {
            out.push(full);
        }
    }
    return out;
};

const countCodeLines = (text) => {
    let inBlockComment = false;
    let count = 0;
    for (const raw of text.split("\n")) {
        const line = raw.trim();
        if (inBlockComment) {
            if (line.includes("*/")) inBlockComment = false;
            continue;
        }
        if (!line) continue;
        if (line.startsWith("//")) continue;
        if (line.startsWith("/*")) {
            if (!line.includes("*/")) inBlockComment = true;
            continue;
        }
        count += 1;
    }
    return count;
};

const findMaxLinesOverride = (text) => {
    const match = /@maxLines\s+(\d+)/.exec(text);
    return match ? Number(match[1]) : null;
};

const files = walk(ROOT);
const rows = files.map((path) => {
    const relPath = relative(ROOT, path).split("\\").join("/");
    const text = readFileSync(path, "utf8");
    const codeLines = countCodeLines(text);
    const override = findMaxLinesOverride(text);
    const { budget: categoryBudget, label } = categorize(relPath);
    const budget = override ?? categoryBudget;
    const status = budget === null ? "unlimited" : codeLines > budget ? "OVER" : "ok";
    return { relPath, label, codeLines, budget, status, hasException: override !== null };
});

const over = rows.filter((r) => r.status === "OVER");
const exceptions = rows.filter((r) => r.hasException);

console.log(`Checked ${rows.length} files under src/.\n`);

if (over.length) {
    console.log(`Over budget (advisory — does not fail the build):`);
    for (const r of over) {
        console.log(`  ${r.relPath}  ${r.codeLines} lines > ${r.budget} (${r.label})`);
    }
    console.log("");
} else {
    console.log("Nothing over its category budget.\n");
}

if (exceptions.length) {
    console.log(`@maxLines exceptions on record:`);
    for (const r of exceptions) {
        console.log(`  ${r.relPath}  budget raised to ${r.budget}`);
    }
    console.log("");
}

process.exit(0);
