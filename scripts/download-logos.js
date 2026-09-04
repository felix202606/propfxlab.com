const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const FIRMS_DIR = path.join(process.cwd(), "data", "firms");
const OUTPUT_DIR = path.join(process.cwd(), "public", "logos");
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const MIN_BYTES = 200;
const PREFERRED_EDGE = 64;

function loadFirms() {
  return fs
    .readdirSync(FIRMS_DIR)
    .filter((name) => name.endsWith(".json"))
    .map((fileName) => {
      const filePath = path.join(FIRMS_DIR, fileName);
      const firm = JSON.parse(fs.readFileSync(filePath, "utf8"));
      const website = firm?.basic?.website;
      if (typeof firm?.slug !== "string" || typeof website !== "string") {
        throw new Error(`Invalid firm JSON: ${fileName}`);
      }
      return {
        slug: firm.slug,
        domain: new URL(website).hostname.replace(/^www\./, ""),
        filePath,
        data: firm,
      };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug, "en"));
}

function sourcesFor(domain) {
  return [
    {
      label: "google-256",
      url: `https://www.google.com/s2/favicons?domain=${domain}&sz=256`,
    },
    {
      label: "google-128",
      url: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    },
    {
      label: "duckduckgo",
      url: `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    },
    { label: "site-apple", url: `https://${domain}/apple-touch-icon.png` },
    { label: "site-favicon", url: `https://${domain}/favicon.ico` },
    {
      label: "www-favicon",
      url: `https://www.${domain}/favicon.ico`,
    },
  ];
}

function pngSize(buf) {
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function jpegSize(buf) {
  let offset = 2;
  while (offset < buf.length - 8) {
    if (buf[offset] !== 0xff) break;
    const marker = buf[offset + 1];
    if (
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc
    ) {
      return {
        height: buf.readUInt16BE(offset + 5),
        width: buf.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + buf.readUInt16BE(offset + 2);
  }
  return null;
}

function imageSize(buf, kind) {
  if (kind === "png") return pngSize(buf);
  if (kind === "jpeg") return jpegSize(buf);
  return null;
}

function sniffImage(buf) {
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e) {
    return "png";
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "jpeg";
  }
  if (buf.length >= 6 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
    return "gif";
  }
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45
  ) {
    return "webp";
  }
  if (buf.length >= 4 && buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x01) {
    return "ico";
  }
  return null;
}

async function fetchBuffer(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT, Accept: "image/*,*/*;q=0.8" },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const buf = Buffer.from(await response.arrayBuffer());
    if (buf.length < MIN_BYTES) {
      throw new Error(`too small (${buf.length} bytes)`);
    }
    const kind = sniffImage(buf);
    if (!kind) {
      throw new Error("not an image");
    }
    return { buf, kind };
  } finally {
    clearTimeout(timer);
  }
}

function writePng(dest, buf, kind) {
  const tmp = `${dest}.tmp`;
  fs.writeFileSync(tmp, buf);
  if (kind === "png") {
    fs.renameSync(tmp, dest);
    return;
  }

  const converted = `${tmp}.png`;
  const result = spawnSync(
    "sips",
    ["-s", "format", "png", tmp, "--out", converted],
    { encoding: "utf8" },
  );
  fs.unlinkSync(tmp);
  if (result.status !== 0 || !fs.existsSync(converted)) {
    throw new Error(result.stderr?.trim() || "sips convert failed");
  }
  fs.renameSync(converted, dest);
}

async function downloadLogo(firm) {
  const dest = path.join(OUTPUT_DIR, `${firm.slug}.png`);
  /** @type {{ buf: Buffer, kind: string, label: string, edge: number } | null} */
  let fallback = null;

  for (const source of sourcesFor(firm.domain)) {
    try {
      const { buf, kind } = await fetchBuffer(source.url);
      const size = imageSize(buf, kind);
      const edge = size
        ? Math.min(size.width, size.height)
        : buf.length > 1000
          ? PREFERRED_EDGE
          : 0;
      if (edge < PREFERRED_EDGE) {
        if (!fallback || edge > fallback.edge) {
          fallback = { buf, kind, label: source.label, edge };
        }
        throw new Error(`too small (${edge}px)`);
      }
      writePng(dest, buf, kind);
      console.log(
        `✅ [${source.label} · ${kind} · ${edge}px · ${buf.length}B] ${firm.slug}.png`,
      );
      return true;
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.log(`   ↷ ${firm.slug} ${source.label}: ${reason}`);
    }
  }

  if (fallback) {
    writePng(dest, fallback.buf, fallback.kind);
    console.log(
      `⚠️ [${fallback.label} · ${fallback.kind} · ${fallback.edge}px] ${firm.slug}.png (low-res fallback)`,
    );
    return true;
  }

  console.error(`❌ 全部源失败: ${firm.slug} (${firm.domain})`);
  return false;
}

function pointJsonToLocalLogo(firm) {
  const original = fs.readFileSync(firm.filePath, "utf8");
  const src = `/logos/${firm.slug}.png`;
  let next = original.replace(
    /("logo"\s*:\s*\{[^}]*?"src"\s*:\s*")[^"]+"/,
    `$1${src}"`,
  );
  next = next.replace(
    /("logo"\s*:\s*\{[^}]*?"width"\s*:\s*)\d+/,
    "$1128",
  );
  next = next.replace(
    /("logo"\s*:\s*\{[^}]*?"height"\s*:\s*)\d+/,
    "$1128",
  );
  if (next === original) {
    throw new Error(`Could not patch logo fields in ${firm.filePath}`);
  }
  fs.writeFileSync(firm.filePath, next);
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const firms = loadFirms();
  console.log(
    `🚀 从 data/firms 读取 ${firms.length} 家平台，下载到 public/logos/\n`,
  );

  let ok = 0;
  for (const firm of firms) {
    const saved = await downloadLogo(firm);
    if (saved) {
      pointJsonToLocalLogo(firm);
      ok += 1;
    }
  }

  console.log(`\n🎉 完成：${ok}/${firms.length} 个 Logo 已写入 public/logos/`);
  if (ok !== firms.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
