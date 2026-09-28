#!/usr/bin/env node
import readline from "node:readline";
/**
 * OnlyBrains Cloud MCP server.
 * Speaks MCP over stdio. Calls ONLYBRAINS_API_URL with ONLYBRAINS_KEY.
 * If either is missing, it returns that fact. It does not invent a graph.
 */

const KEY = process.env.ONLYBRAINS_KEY?.trim() || "";
const BASE = process.env.ONLYBRAINS_API_URL?.trim().replace(/\/$/, "") || "";

const tools = [
  {
    name: "brain_ground",
    description:
      "Ground a topic in the OnlyBrains curriculum graph. Returns matching modules and a proof card, or an honest miss. Drops a claim that does not match a real module.",
    inputSchema: {
      type: "object",
      properties: { topic: { type: "string", description: "What to ground." } },
      required: ["topic"],
    },
  },
  {
    name: "brain_proof",
    description:
      "Open a proof card by id. The card names the program, the modules that backed it, and how to challenge it.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "Proof card id, for example PC-EA18956D." } },
      required: ["id"],
    },
  },
  {
    name: "brain_memories",
    description:
      "Look up the signed-in learner's own memories before an answer. Returns a count only when something matched. Never another person's graph.",
    inputSchema: {
      type: "object",
      properties: { question: { type: "string" } },
      required: ["question"],
    },
  },
];

function text(body) {
  return { content: [{ type: "text", text: typeof body === "string" ? body : JSON.stringify(body, null, 2) }] };
}

function missing(what) {
  return text({
    ok: false,
    error: what,
    keyPresent: Boolean(KEY),
    urlPresent: Boolean(BASE),
  });
}

async function callApi(path, payload) {
  if (!KEY) return missing("No ONLYBRAINS_KEY. Issue one in OnlyBrains Cloud. Nothing was called.");
  if (!BASE) {
    return missing(
      "The key is present. ONLYBRAINS_API_URL is not set, so the graph was not queried and no proof card was invented.",
    );
  }
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${KEY}`,
      "x-api-key": KEY,
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(12000),
  });
  const raw = await res.text();
  let parsed = raw;
  try {
    parsed = JSON.parse(raw);
  } catch {
    /* leave text */
  }
  if (!res.ok) {
    return text({ ok: false, status: res.status, body: parsed });
  }
  return text({ ok: true, status: res.status, body: parsed });
}

async function callTool(name, args) {
  const a = args && typeof args === "object" ? args : {};
  if (name === "brain_ground") return callApi("/v1/ground", { topic: String(a.topic || "") });
  if (name === "brain_proof") return callApi("/v1/proof", { id: String(a.id || "") });
  if (name === "brain_memories") return callApi("/v1/memories", { question: String(a.question || "") });
  return text({ ok: false, error: `Unknown tool ${name}` });
}

function reply(id, result) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result }) + "\n");
}

function fail(id, message) {
  process.stdout.write(
    JSON.stringify({ jsonrpc: "2.0", id, error: { code: -32601, message } }) + "\n",
  );
}

const rl = readline.createInterface({ input: process.stdin });

rl.on("line", (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let msg;
  try {
    msg = JSON.parse(trimmed);
  } catch {
    return;
  }
  const { id, method, params } = msg;
  if (id === undefined) return;

  if (method === "initialize") {
    reply(id, {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "onlybrains-cloud", version: "0.1.0" },
    });
    return;
  }
  if (method === "tools/list") {
    reply(id, { tools });
    return;
  }
  if (method === "tools/call") {
    const name = params?.name;
    callTool(name, params?.arguments)
      .then((result) => reply(id, result))
      .catch((err) => reply(id, text({ ok: false, error: err instanceof Error ? err.message : "Call failed" })));
    return;
  }
  if (method === "ping") {
    reply(id, {});
    return;
  }
  fail(id, `Unsupported method ${method}`);
});
