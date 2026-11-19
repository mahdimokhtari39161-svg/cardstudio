import fs from "node:fs/promises";
import path from "node:path";

const endpoint = "https://kaino.dev/mcp";
const outDir = path.resolve("www/audio");
const manifestPath = path.join(outDir, "library.json");
const wanted = [
  { query: "cheerful happy upbeat", mood: "شاد و جشن", key: "wedding", icon: "🎉" },
  { query: "romantic love piano", mood: "عاشقانه", key: "love", icon: "💗" },
  { query: "hopeful uplifting warm", mood: "امید و انتظار", key: "mahdavi", icon: "🌙" },
  { query: "calm peaceful ambient", mood: "آرامش", key: "calm", icon: "🌿" },
  { query: "cinematic emotional reflective", mood: "احساسی و سوگوارانه", key: "condolence", icon: "🕊️" },
  { query: "epic heroic cinematic", mood: "حماسی", key: "martyrdom", icon: "🏴" },
  { query: "birthday celebration joyful", mood: "تولد", key: "birthday", icon: "🎂" },
  { query: "acoustic gentle spiritual", mood: "مذهبی و معنوی", key: "religious", icon: "🕌" }
];

function parseRpcResponse(raw, contentType = "") {
  if (contentType.includes("text/event-stream") || raw.includes("\ndata:")) {
    const chunks = raw.split(/\r?\n/).filter(line => line.startsWith("data:")).map(line => line.slice(5).trim()).filter(Boolean);
    for (let i = chunks.length - 1; i >= 0; i--) {
      try { const v = JSON.parse(chunks[i]); if (v && (v.result || v.error)) return v; } catch {}
    }
  }
  try { return JSON.parse(raw); } catch { return { raw }; }
}
async function mcp() {
  let sessionId = "";
  let nextId = 1;
  async function post(payload) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "accept": "application/json, text/event-stream",
        ...(sessionId ? { "mcp-session-id": sessionId } : {}),
        "mcp-protocol-version": "2025-03-26"
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(45000)
    });
    if (!response.ok) throw new Error("Kaino MCP HTTP " + response.status + ": " + (await response.text()).slice(0, 400));
    sessionId ||= response.headers.get("mcp-session-id") || "";
    return parseRpcResponse(await response.text(), response.headers.get("content-type") || "");
  }
  const init = await post({
    jsonrpc: "2.0", id: nextId++, method: "initialize",
    params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "CardStudio Music Library", version: "1.0.0" } }
  });
  if (init.error) throw new Error(init.error.message || "MCP initialize failed");
  await post({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });
  async function call(name, args) {
    const result = await post({ jsonrpc: "2.0", id: nextId++, method: "tools/call", params: { name, arguments: args } });
    if (result.error) throw new Error(result.error.message || name + " failed");
    return result.result;
  }
  const listed = await post({ jsonrpc: "2.0", id: nextId++, method: "tools/list", params: {} });
  if (listed.error) throw new Error(listed.error.message || "Could not list Kaino tools");
  return { tools: listed.result?.tools || [], call };
}
function unpack(value) {
  if (!value) return [];
  if (typeof value === "string") {
    try { return unpack(JSON.parse(value)); } catch { return []; }
  }
  if (Array.isArray(value)) return value.flatMap(unpack);
  if (typeof value === "object") {
    const found = [];
    if (value.structuredContent) found.push(...unpack(value.structuredContent));
    if (value.content) found.push(...unpack(value.content));
    if (typeof value.text === "string") found.push(...unpack(value.text));
    if (value.result) found.push(...unpack(value.result));
    if (value.data) found.push(...unpack(value.data));
    if (value.items) found.push(...unpack(value.items));
    if (value.tracks) found.push(...unpack(value.tracks));
    if (value.results) found.push(...unpack(value.results));
    if (value.library_items) found.push(...unpack(value.library_items));
    if (value.url || value.download_url || value.downloadUrl || value.slug || value.id || value.title || value.name) found.push(value);
    return found;
  }
  return [];
}
function schemaArgs(tool, values) {
  const schema = tool.inputSchema || {};
  const props = schema.properties || {};
  const args = {};
  for (const [key, def] of Object.entries(props)) {
    const k = key.toLowerCase();
    if (/query|search|keyword|term/.test(k)) args[key] = values.query || "music";
    else if (/mood/.test(k)) args[key] = values.mood || "cheerful";
    else if (/format|extension|file_type/.test(k)) args[key] = "mp3";
    else if (/collection|category|library|kind|type/.test(k)) args[key] = "music";
    else if (/limit|count|page_size|per_page/.test(k)) args[key] = 20;
    else if (/offset|page/.test(k)) args[key] = 0;
    else if (/id|slug|item|asset|track/.test(k)) {
      const source = values.item || {};
      const match = Object.keys(source).find(p => p.toLowerCase() === k) ||
        Object.keys(source).find(p => /^(id|slug|item_id|asset_id|track_id|title|name)$/i.test(p));
      if (match) args[key] = source[match];
      else if (values.identifier) args[key] = values.identifier;
    } else if (def.enum?.length) args[key] = def.enum[0];
    else if (schema.required?.includes(key)) {
      if (def.type === "boolean") args[key] = false;
      else if (def.type === "array") args[key] = [];
      else if (def.type === "number" || def.type === "integer") args[key] = 10;
      else if (def.type === "string") args[key] = values.query || "music";
    }
  }
  return args;
}
function firstAudioUrl(value) {
  const seen = new Set();
  const urls = [];
  function walk(v) {
    if (!v || typeof v !== "object" || seen.has(v)) return;
    seen.add(v);
    if (Array.isArray(v)) { v.forEach(walk); return; }
    for (const [k, x] of Object.entries(v)) {
      if (typeof x === "string" && /^https?:\/\//i.test(x) && (/\.mp3(\?|$)/i.test(x) || /\.wav(\?|$)/i.test(x) || /download/i.test(k))) urls.push(x);
      else if (x && typeof x === "object") walk(x);
    }
  }
  walk(value);
  return urls[0] || "";
}
function findItems(value) {
  return unpack(value).filter(x => x && typeof x === "object" && (x.slug || x.id || x.item_id || x.asset_id || x.track_id || x.title || x.name));
}
await fs.mkdir(outDir, { recursive: true });
const manifest = [];
try {
  const client = await mcp();
  const searchTool = client.tools.find(t => /search_library/.test(t.name));
  const downloadTool = client.tools.find(t => /get_library_download/.test(t.name));
  const itemTool = client.tools.find(t => /get_library_item/.test(t.name));
  console.log("Kaino tools:", client.tools.map(t => t.name).join(", "));\n  if (!searchTool || !downloadTool) throw new Error("Kaino music search/download tools were not advertised");
  const seen = new Set();
  for (const target of wanted) {
    try {
      const search = await client.call(searchTool.name, schemaArgs(searchTool, { query: target.query, mood: target.key }));
      console.log("Search response for", target.key, JSON.stringify(search).slice(0, 1600));\n      const items = findItems(search);\n      console.log("Candidate items:", items.length);
      for (const item of items) {
        const title = item.title || item.name || item.slug || "Music track";
        const ident = item.slug || item.id || item.item_id || item.asset_id || item.track_id || title;
        if (seen.has(String(ident))) continue;
        seen.add(String(ident));
        let details = item;
        if (itemTool) {
          try {
            const got = await client.call(itemTool.name, schemaArgs(itemTool, { item, identifier: ident, query: target.query }));
            details = { ...item, ...findItems(got)[0], ...((got && got.structuredContent) || {}) };
          } catch {}
        }
        const downloaded = await client.call(downloadTool.name, schemaArgs(downloadTool, { item: details, identifier: ident, query: target.query }));
        console.log("Download response:", JSON.stringify(downloaded).slice(0, 1200));\n        const url = firstAudioUrl(downloaded) || firstAudioUrl(details) || firstAudioUrl(item);
        if (!url) continue;
        const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
        if (!res.ok) continue;
        const type = res.headers.get("content-type") || "";
        if (!type.includes("audio") && !/\.mp3(\?|$)|\.wav(\?|$)/i.test(url)) continue;
        const bytes = Buffer.from(await res.arrayBuffer());
        if (bytes.length < 12000 || bytes.length > 12 * 1024 * 1024) continue;
        const ext = /\.wav(\?|$)/i.test(url) || type.includes("wav") ? "wav" : "mp3";
        const safe = String(title).normalize("NFKD").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 45) || "track";
        const filename = target.key + "-" + safe + "." + ext;
        await fs.writeFile(path.join(outDir, filename), bytes);
        manifest.push({
          id: target.key + "-" + manifest.length,
          title,
          artist: item.artist || item.author || details.artist || details.author || "Kaino CC0 Library",
          mood: target.key,
          moodLabel: target.mood,
          icon: target.icon,
          src: "./audio/" + filename,
          duration: item.duration || details.duration || "",
          license: "CC0 1.0",
          licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
          source: "Kaino Free Asset Library",
          sourceUrl: "https://kaino.dev/library/music"
        });
        break;
      }
    } catch (error) {
      console.warn("Music search skipped:", target.key, error.message);
    }
  }
} catch (error) {
  console.warn("Could not fetch the CC0 music catalog:", error.message);
}
await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
console.log("Prepared " + manifest.length + " licensed music tracks in " + outDir);
