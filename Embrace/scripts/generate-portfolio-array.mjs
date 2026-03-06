#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);
const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
const CATEGORIES = new Set(["Casting", "Refining", "Custom"]);

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      args._.push(token);
      continue;
    }
    const key = token.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : "true";
    args[key] = value;
    if (value !== "true") i += 1;
  }
  return args;
}

function toTitle(raw) {
  return raw
    .replace(/\.[^.]+$/, "")
    .replace(/[()]/g, " ")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function toSlug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeCategory(folderName) {
  const lower = folderName.toLowerCase();
  if (lower === "refining") return "Refining";
  if (lower === "casting") return "Casting";
  if (lower === "custom") return "Custom";
  if (lower === "raw") return "Custom";
  return folderName.charAt(0).toUpperCase() + folderName.slice(1).toLowerCase();
}

function defaultDescription(category) {
  if (category === "Refining") return "Precision gold refining with premium finishing details";
  if (category === "Casting") return "High-precision casting engineered for timeless luxury pieces";
  if (category === "Custom") return "Bespoke custom design crafted for signature statements";
  return "Luxury portfolio piece";
}

function parseBoolean(value) {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function inferMimeType(absolutePath) {
  const ext = path.extname(absolutePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".avif") return "image/avif";
  return "image/jpeg";
}

function escapeSingleQuotes(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function createUniqueFilePath(directory, fileStem, extension) {
  const normalizedStem = toSlug(fileStem) || "image";
  let candidate = path.join(directory, `${normalizedStem}${extension}`);
  let counter = 2;

  while (await pathExists(candidate)) {
    candidate = path.join(directory, `${normalizedStem}-${counter}${extension}`);
    counter += 1;
  }

  return candidate;
}

function extractJsonBlock(text) {
  const fencedMatch = text.match(/```json\s*([\s\S]*?)```/i);
  if (fencedMatch) return fencedMatch[1].trim();

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }
  return text.trim();
}

function normalizeModelCategory(value, fallbackCategory) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "casting") return "Casting";
  if (normalized === "refining") return "Refining";
  if (normalized === "custom") return "Custom";
  return CATEGORIES.has(fallbackCategory) ? fallbackCategory : "Custom";
}

function sanitizeModelOutput(raw, fallbackTitle, fallbackCategory) {
  const category = normalizeModelCategory(raw?.category, fallbackCategory);
  const title = String(raw?.title || fallbackTitle).trim() || fallbackTitle;
  const description = String(raw?.description || defaultDescription(category)).trim() || defaultDescription(category);
  return { category, title, description };
}

async function classifyImageWithGemini({ apiKey, model, absolutePath, fallbackTitle, fallbackCategory }) {
  const bytes = await fs.readFile(absolutePath);
  const inlineData = {
    mimeType: inferMimeType(absolutePath),
    data: bytes.toString("base64"),
  };

  const prompt = [
    "Analyze this jewelry image for a luxury portfolio.",
    'Return ONLY valid JSON with keys: "category", "title", "description".',
    'Valid category values: "Casting", "Refining", "Custom".',
    "Title: 2-5 words, premium and specific.",
    "Description: one sentence under 20 words.",
  ].join(" ");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inlineData },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini HTTP ${response.status}: ${text.slice(0, 250)}`);
  }

  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part?.text || "").join("\n") || "";
  if (!text) {
    throw new Error("Gemini returned empty text.");
  }

  const parsed = JSON.parse(extractJsonBlock(text));
  return sanitizeModelOutput(parsed, fallbackTitle, fallbackCategory);
}

async function walkFiles(rootDir) {
  const stack = [rootDir];
  const files = [];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (IMAGE_EXTENSIONS.has(ext)) files.push(full);
      }
    }
  }

  return files.sort((a, b) => a.localeCompare(b));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outputArg = args.output;
  const classify = parseBoolean(String(args.classify || "false"));
  const aiCategoryOnly = parseBoolean(String(args.aiCategoryOnly || "false"));
  const rename = parseBoolean(String(args.rename || "false"));
  const positionalDir = Array.isArray(args._) && args._.length > 0 ? args._[0] : "";
  const dirArg = args.dir || positionalDir || (classify && aiCategoryOnly ? "src/assets/portfolio/raw" : "src/assets/portfolio");
  const pathPrefix = typeof args.pathPrefix === "string" ? args.pathPrefix.trim() : "";
  const model = typeof args.model === "string" && args.model.trim() ? args.model.trim() : DEFAULT_MODEL;
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";

  if (classify && !apiKey) {
    console.error("Missing GEMINI_API_KEY (or GOOGLE_API_KEY) for --classify mode.");
    process.exit(1);
  }

  const sourceDir = path.resolve(process.cwd(), dirArg);
  const files = await walkFiles(sourceDir);

  const objects = [];
  for (let index = 0; index < files.length; index += 1) {
    let absolutePath = files[index];
    let rel = path.relative(sourceDir, absolutePath).replace(/\\/g, "/");
    const segments = rel.split("/");
    const categoryFolder = segments.length > 1 ? segments[0] : "raw";
    const fileName = segments.length > 1 ? segments.slice(1).join("/") : segments[0];
    const leafName = path.basename(fileName);
    const fallbackTitle = toTitle(leafName);
    const folderCategory = normalizeCategory(categoryFolder);
    const fallbackCategory = classify && aiCategoryOnly ? "Custom" : folderCategory;
    let title = fallbackTitle;
    let category = fallbackCategory;
    let description = defaultDescription(fallbackCategory);

    if (classify) {
      try {
        const enriched = await classifyImageWithGemini({
          apiKey,
          model,
          absolutePath,
          fallbackTitle,
          fallbackCategory,
        });
        title = enriched.title;
        category = enriched.category;
        description = enriched.description;
        console.error(`[classify] ${index + 1}/${files.length}: ${rel} -> ${category} | ${title}`);
      } catch (error) {
        console.error(`[classify] ${index + 1}/${files.length}: fallback used for ${rel} (${error instanceof Error ? error.message : "unknown error"})`);
      }
    }

    if (rename) {
      const extension = path.extname(absolutePath).toLowerCase();
      const currentDir = path.dirname(absolutePath);
      const targetPath = await createUniqueFilePath(currentDir, title, extension);
      if (targetPath !== absolutePath) {
        await fs.rename(absolutePath, targetPath);
        absolutePath = targetPath;
        rel = path.relative(sourceDir, absolutePath).replace(/\\/g, "/");
        console.error(`[rename] ${index + 1}/${files.length}: ${path.basename(files[index])} -> ${path.basename(targetPath)}`);
      }
    }

    const prefixedPath = `${pathPrefix.replace(/\/+$/, "")}${pathPrefix ? "/" : ""}${rel}`.replace(/^\/+/, "");
    objects.push(
      `  { id: '${toSlug(categoryFolder)}-${toSlug(title)}-${index + 1}', path: '${escapeSingleQuotes(prefixedPath)}', alt: '${escapeSingleQuotes(title)}', title: '${escapeSingleQuotes(title)}', cat: '${escapeSingleQuotes(category)}', desc: '${escapeSingleQuotes(description)}' },`,
    );
  }

  const body = [
    "const ALL_IMAGES: LocalImageItem[] = [",
    ...objects,
    "];",
    "",
  ].join("\n");

  if (outputArg) {
    const outPath = path.resolve(process.cwd(), outputArg);
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, body, "utf8");
    console.log(`Wrote ${files.length} entries to ${outPath}`);
    return;
  }

  console.log(body);
}

main().catch((error) => {
  console.error("Failed to generate ALL_IMAGES array:", error);
  process.exit(1);
});
