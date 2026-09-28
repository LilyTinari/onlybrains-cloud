import { useEffect, useMemo, useRef, useState } from "react";

type Scope = "read" | "vault" | "operator";
type View = "product" | "mcp" | "key";

type Order = {
  id: string;
  email: string;
  scope: Scope;
  key: string;
  created: string;
};

const ORDER_KEY = "onlybrains.cloud.order";

const scopes: { id: Scope; name: string; copy: string }[] = [
  {
    id: "read",
    name: "Read",
    copy: "Curriculum graph and proof cards. Enough to ground a claim and open the card.",
  },
  {
    id: "vault",
    name: "Vault",
    copy: "Brains and agents only. The Borrow a Brain read. Not a second product.",
  },
  {
    id: "operator",
    name: "Operator",
    copy: "Generate, citation check, and the learner’s own memory graph. The key the product runs on.",
  },
];

function loadOrder(): Order | null {
  try {
    const raw = sessionStorage.getItem(ORDER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Order;
    if (parsed?.key && parsed.scope) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

function mint(scope: Scope) {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  const body = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `ob_${scope}_${body}`;
}

function Field() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let frame = 0;
    let alive = true;
    const nodes = Array.from({ length: 42 }, (_, i) => ({
      a: Math.random() * Math.PI * 2,
      r: 0.15 + Math.random() * 0.75,
      s: 0.15 + (i % 5) * 0.05,
    }));
    const draw = (t: number) => {
      if (!alive) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const pts = nodes.map((n) => ({
        x: w * 0.72 + Math.cos(n.a + t * 0.00015 * n.s) * w * 0.28 * n.r,
        y: h * 0.45 + Math.sin(n.a * 1.3 + t * 0.00012) * h * 0.38 * n.r,
      }));
      ctx.strokeStyle = "rgba(158,201,212,0.16)";
      ctx.lineWidth = 1;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          if (dx * dx + dy * dy < 140 * 140) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.stroke();
          }
        }
      }
      ctx.fillStyle = "rgba(244,244,242,0.75)";
      pts.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.4, 0, Math.PI * 2);
        ctx.fill();
      });
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
    };
  }, []);
  return <canvas ref={ref} className="field" aria-hidden="true" />;
}

export function App() {
  const [view, setView] = useState<View>("product");
  const [scope, setScope] = useState<Scope>("operator");
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [copied, setCopied] = useState("");
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setOrder(loadOrder());
  }, []);

  const mcp = useMemo(() => {
    const key = order?.key ?? "ob_operator_…";
    return JSON.stringify(
      {
        mcpServers: {
          onlybrains: {
            command: "node",
            args: ["mcp/server.mjs"],
            env: {
              ONLYBRAINS_KEY: key,
              ONLYBRAINS_API_URL: "https://YOUR_BRAIN_API",
            },
          },
        },
      },
      null,
      2,
    );
  }, [order]);

  function purchase() {
    const clean = email.trim();
    if (!clean.includes("@")) return;
    const next: Order = {
      id: `ord_${crypto.randomUUID().slice(0, 8)}`,
      email: clean,
      scope,
      key: mint(scope),
      created: new Date().toISOString(),
    };
    sessionStorage.setItem(ORDER_KEY, JSON.stringify(next));
    setOrder(next);
    setRevealed(true);
    setView("key");
  }

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
    } catch {
      setCopied("");
    }
  }

  return (
    <>
      <header className="wrap nav">
        <a className="brand" href="#top" onClick={() => setView("product")}>
          <em>Only</em>
          <b>Brains Cloud</b>
        </a>
        <nav>
          <button type="button" data-on={view === "product"} onClick={() => setView("product")}>
            API
          </button>
          <button type="button" data-on={view === "mcp"} onClick={() => setView("mcp")}>
            MCP
          </button>
          <button type="button" data-on={view === "key"} onClick={() => setView("key")}>
            Get a key
          </button>
        </nav>
      </header>

      <main id="top" className="wrap">
        {view === "product" ? (
          <>
            <section className="hero">
              <Field />
              <div className="hero-copy">
                <p className="kicker">Brain API · one key · three scopes</p>
                <h1 style={{ marginTop: 14 }}>The key for a graph that can say no.</h1>
                <p className="lede">
                  OnlyBrains Cloud sells the API key and the MCP server that carries it. Point
                  Claude, ChatGPT, or your own client at the curriculum graph. A claim without a
                  real module is dropped. A timeout is unverified. Someone else’s memories are
                  never read.
                </p>
                <div className="row">
                  <button className="solid" type="button" onClick={() => setView("key")}>
                    Purchase a key
                  </button>
                  <button className="ghost" type="button" onClick={() => setView("mcp")}>
                    MCP server
                  </button>
                </div>
              </div>
            </section>

            <section className="section">
              <div className="grid three">
                <article className="card">
                  <p className="kicker">Proof</p>
                  <h3>Every point can wear a card.</h3>
                  <p>
                    A grounded answer names the modules that backed it and a proof card anyone can
                    open. If the graph has nothing for the topic, the card says so.
                  </p>
                </article>
                <article className="card">
                  <p className="kicker">Citations</p>
                  <h3>Checked, not decorated.</h3>
                  <p>
                    Source URLs are fetched. Errors are broken. Timeouts stay unverified. A citation
                    that does not support the line is dropped before it is saved.
                  </p>
                </article>
                <article className="card">
                  <p className="kicker">Memory</p>
                  <h3>Your graph. Nobody else’s.</h3>
                  <p>
                    The operator key can look up the signed-in learner’s own sessions before it
                    answers, and say how many shaped the reply. No match, no tag.
                  </p>
                </article>
              </div>
            </section>

            <section className="section">
              <p className="kicker">Scopes</p>
              <h2 style={{ margin: "12px 0 18px" }}>One key. You pick how much it can see.</h2>
              <div className="grid three">
                {scopes.map((item) => (
                  <article className="card" key={item.id}>
                    <h3>{item.name}</h3>
                    <p>{item.copy}</p>
                    <button className="ghost" type="button" onClick={() => { setScope(item.id); setView("key"); }}>
                      Get {item.name.toLowerCase()}
                    </button>
                  </article>
                ))}
              </div>
            </section>
          </>
        ) : null}

        {view === "mcp" ? (
          <section className="section">
            <p className="kicker">MCP</p>
            <h2>A server that refuses to invent a source.</h2>
            <p className="lede">
              The server in this repo speaks MCP over stdio. It forwards to your Brain API with the
              key. If the URL is not set, the tool says the graph was not queried. It does not fill
              in a module to be helpful.
            </p>
            <div className="grid" style={{ marginTop: 22 }}>
              <article className="card">
                <h3>Tools</h3>
                <p><code>brain_ground</code> — topic in, modules and a proof card out, or a miss.</p>
                <p><code>brain_proof</code> — open a card by id.</p>
                <p><code>brain_memories</code> — the learner’s own memories, count only when something matched.</p>
              </article>
              <article className="card">
                <h3>Run it</h3>
                <pre>{`ONLYBRAINS_KEY=ob_… \\\nONLYBRAINS_API_URL=https://YOUR_BRAIN_API \\\nnode mcp/server.mjs`}</pre>
              </article>
              <article className="card">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <h3>Client config</h3>
                  <button className="ghost" type="button" onClick={() => copy("mcp", mcp)}>
                    {copied === "mcp" ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre>{mcp}</pre>
                <p className="fine">
                  Replace the base URL with the live Brain API when the account is connected. The
                  paths the server calls are <code>/v1/ground</code>, <code>/v1/proof</code>, and{" "}
                  <code>/v1/memories</code>. Those are the Cloud contract. This site is not that API.
                </p>
              </article>
            </div>
          </section>
        ) : null}

        {view === "key" ? (
          <section className="section">
            <p className="kicker">Purchase</p>
            <h2>Issue the key. Billing is not on yet.</h2>
            <p className="lede">
              Pick a scope and an email. The key is minted in this browser and shown once this
              session. No card is taken. When Stripe is connected, this same order is what gets
              billed — not before.
            </p>
            <div className="grid split" style={{ marginTop: 22 }}>
              <form
                className="card form"
                onSubmit={(e) => {
                  e.preventDefault();
                  purchase();
                }}
              >
                <label>
                  Scope
                  <select value={scope} onChange={(e) => setScope(e.target.value as Scope)}>
                    {scopes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@studio.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                <button className="solid" type="submit">
                  Issue {scope} key
                </button>
                <p className="fine">Unbilled. Stored in this tab only. Refresh clears it.</p>
              </form>
              <article className="card">
                {order ? (
                  <>
                    <p className="kicker">Order {order.id}</p>
                    <h3 style={{ textTransform: "capitalize" }}>{order.scope} · unbilled</h3>
                    <p>{order.email}</p>
                    {revealed ? (
                      <p className="key">{order.key}</p>
                    ) : (
                      <p className="fine">A key is already in this session. Issue again to reveal a new one.</p>
                    )}
                    <div className="row">
                      <button className="ghost" type="button" onClick={() => copy("key", order.key)}>
                        {copied === "key" ? "Copied" : "Copy key"}
                      </button>
                      <button className="ghost" type="button" onClick={() => setView("mcp")}>
                        MCP config
                      </button>
                    </div>
                    <p className="fine">
                      This key will not open production until the Cloud account and the base URL
                      exist. Treat it as the shape of the credential, not a live secret against the
                      graph.
                    </p>
                  </>
                ) : (
                  <>
                    <h3>What you are buying</h3>
                    <p>A scoped credential for the Brain API, plus the MCP server in this repo.</p>
                    <p>Not a seat on the course site. Not a second vault product.</p>
                  </>
                )}
              </article>
            </div>
          </section>
        ) : null}
      </main>
      <footer className="wrap">
        <p>OnlyBrains Cloud · the key, not the campus.</p>
      </footer>
    </>
  );
}
