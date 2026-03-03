#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".svg"]);

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : "true";
    args[key] = value;
    if (value !== "true") i += 1;
  }
  return args;
}

function toSlug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function walkFiles(rootDir) {
  const output = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (IMAGE_EXTENSIONS.has(ext)) output.push(fullPath);
      }
    }
  }

  return output.sort();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dirArg = args.dir;
  const normalizedDirArg = (dirArg || "").replace(/\\/g, "/").replace(/^\.?\//, "");
  const baseUrl = args.base || `/${normalizedDirArg}`;
  const outputFile = args.output;

  if (!dirArg) {
    console.error("Usage: node scripts/generate-media-manifest.mjs --dir <folder> [--base /gallery] [--output data/media-library.json]");
    process.exit(1);
  }

  const directory = path.resolve(process.cwd(), dirArg);
  const files = await walkFiles(directory);
  const nowIso = new Date().toISOString();

  const images = files.map((absoluteFilePath, index) => {
    const relativePath = path.relative(directory, absoluteFilePath).replace(/\\/g, "/");
    const [categoryFolder = "uncategorized"] = relativePath.split("/");
    const fileName = path.basename(relativePath);
    const fileStem = fileName.replace(path.extname(fileName), "");
    const title = fileStem.replace(/[-_]+/g, " ").trim();
    const category = categoryFolder.charAt(0).toUpperCase() + categoryFolder.slice(1).toLowerCase();
    const urlPath = `${baseUrl.replace(/\/+$/, "")}/${relativePath}`.replace(/\/{2,}/g, "/");

    return {
      id: `${toSlug(categoryFolder)}-${toSlug(fileStem)}`,
      title: title || fileStem,
      alt: title || fileStem,
      description: "",
      category,
      tags: [],
      sortOrder: index,
      width: 0,
      height: 0,
      status: "active",
      variants: {
        thumb: urlPath,
        medium: urlPath,
        large: urlPath,
      },
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  });

  const payload = {
    version: 1,
    updatedAt: nowIso,
    images,
  };
  const serialized = JSON.stringify(payload, null, 2);

  if (outputFile) {
    const resolvedOutput = path.resolve(process.cwd(), outputFile);
    await fs.mkdir(path.dirname(resolvedOutput), { recursive: true });
    await fs.writeFile(resolvedOutput, serialized, "utf8");
    console.log(`Wrote ${images.length} entries to ${resolvedOutput}`);
  } else {
    console.log(serialized);
  }
}

main().catch((error) => {
  console.error("Failed to generate manifest:", error);
  process.exit(1);
});
