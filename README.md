# OnlyBrains Cloud

Separate product from the OnlyBrains marketing site and from dnaonly.

This repo is the public counter for a **Brain API key** and the **MCP server** that carries it.

- The site issues a scoped key in the browser and writes an order. **No card is charged.** Stripe is not connected in this build.
- A key minted here does **not** authenticate production until `ONLYBRAINS_API_URL` points at the live Brain API.
- The MCP server will not invent a module, a proof card, or a memory. If the URL is unset, it says so.

```bash
npm install
npm run dev
```

MCP, from this repo:

```bash
ONLYBRAINS_KEY=ob_read_… ONLYBRAINS_API_URL=https://your-brain-api.example node mcp/server.mjs
```
