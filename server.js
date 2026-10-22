const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { WebSocketServer, WebSocket } = require("ws");
const { createOfficeSession } = require("./omp-session");

const PORT = Number(process.env.PORT || 3333);
const HOST = process.env.HOST || "127.0.0.1";
const agents = Object.fromEntries([
  ["leada", "Tech Lead"], ["coder", "Developer"],
  ["secu", "Security & QA"], ["infras", "DevOps"],
].map(([id, role]) => [id, { id, name: id.toUpperCase(), role, status: "idle", action: "idle", task: null }]));
const sockets = new Set();

function send(socket, payload) {
  if (socket.readyState !== WebSocket.OPEN) return;
  if (socket.bufferedAmount > 4 * 1024 * 1024) {
    socket.close(1013, "Client too slow; reconnect for current state");
    return;
  }
  socket.send(JSON.stringify(payload));
}

function broadcast(payload) {
  for (const socket of sockets) send(socket, payload);
}

const office = createOfficeSession({
  broadcast,
  cwd: process.env.OMP_CWD || __dirname,
  executable: process.env.OMP_BIN || (fs.existsSync(path.join(process.env.HOME || "", ".local/bin/omp"))
    ? path.join(process.env.HOME, ".local/bin/omp") : "omp"),
  setAgent(id, state) {
    if (!Object.hasOwn(agents, id)) return;
    Object.assign(agents[id], state);
    broadcast({ type: "agent_status", agentId: id, status: agents[id].status, task: agents[id].task });
    broadcast({ type: "agent_action", agentId: id, action: agents[id].action, detail: agents[id].detail || "" });
  },
});

async function getStaticFile(requestUrl) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(requestUrl, "http://localhost").pathname);
  } catch {
    return { status: 400 };
  }
  if (pathname.includes("\0")) return { status: 400 };
  const isIndex = pathname === "/" || pathname === "/index.html";
  if (!isIndex && !pathname.startsWith("/public/")) return { status: 404 };
  const root = isIndex ? __dirname : path.join(__dirname, "public");
  const candidate = isIndex ? path.join(root, "index.html") : path.resolve(root, pathname.slice(8));
  const isWithin = (base, file) => {
    const relative = path.relative(base, file);
    return relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
  };
  if (!isWithin(root, candidate)) return { status: 404 };
  try {
    const [realRoot, filePath] = await Promise.all([fs.promises.realpath(root), fs.promises.realpath(candidate)]);
    if (!isWithin(realRoot, filePath) || !(await fs.promises.stat(filePath)).isFile()) return { status: 404 };
    const contentType = {
      ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
      ".js": "application/javascript; charset=utf-8", ".json": "application/json",
      ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
      ".svg": "image/svg+xml", ".webp": "image/webp", ".ico": "image/x-icon",
    }[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    return { status: 200, filePath, contentType };
  } catch (err) {
    if (["ENOENT", "ENOTDIR", "EACCES", "ELOOP"].includes(err.code)) return { status: 404 };
    console.error("Static file error:", err);
    return { status: 500 };
  }
}

function trustedHost(req) {
  try {
    const hostname = new URL(`http://${req.headers.host}`).hostname;
    return ["localhost", "127.0.0.1", "[::1]", HOST].includes(hostname);
  } catch {
    return false;
  }
}

const server = http.createServer(async (req, res) => {
  if (!trustedHost(req)) {
    res.writeHead(403).end("Forbidden host");
    return;
  }
  const file = await getStaticFile(req.url);
  if (file.status !== 200) {
    res.writeHead(file.status, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(http.STATUS_CODES[file.status]);
    return;
  }
  const stream = fs.createReadStream(file.filePath);
  stream.on("error", (err) => {
    console.error("Static stream error:", err);
    if (res.headersSent) return res.destroy();
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Internal Server Error");
  });
  stream.on("open", () => {
    res.writeHead(200, { "Content-Type": file.contentType, "X-Content-Type-Options": "nosniff" });
    stream.pipe(res);
  });
  res.on("close", () => stream.destroy());
});

const wss = new WebSocketServer({ noServer: true, maxPayload: 256 * 1024 });
server.on("upgrade", (req, socket, head) => {
  let allowed = false;
  try {
    const origin = req.headers.origin;
    allowed = trustedHost(req) && new URL(req.url, "http://localhost").pathname === "/ws" &&
      (!origin || ["http:", "https:"].includes(new URL(origin).protocol) && new URL(origin).host === req.headers.host);
  } catch {}
  if (!allowed) {
    socket.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws));
});

wss.on("connection", (socket) => {
  sockets.add(socket);
  send(socket, { type: "sync_state", agents });
  const snapshot = office.snapshot();
  send(socket, { type: "omp_state", ...snapshot.state });
  send(socket, { type: "omp_subagents", agents: snapshot.subagents });
  for (const log of snapshot.logs) send(socket, log);
  for (const request of snapshot.dialogs) send(socket, { type: "omp_ui", request });
  socket.on("message", async (raw, isBinary) => {
    try {
      if (isBinary) throw new Error("Only JSON text messages are supported");
      const message = JSON.parse(raw.toString("utf8"));
      if (!message || typeof message !== "object" || Array.isArray(message)) throw new Error("Invalid message");
      await office.handle(message);
    } catch (err) {
      send(socket, { type: "log", agentId: "leada", stream: "stderr", text: `[ERROR] ${err.message}\n` });
    }
  });
  socket.on("error", (err) => console.error("WebSocket error:", err.message));
  socket.on("close", () => sockets.delete(socket));
});

async function shutdown() {
  server.close();
  for (const socket of sockets) socket.close(1001, "Server shutting down");
  await office.close();
  wss.close();
}
process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
server.listen(PORT, HOST, () => {
  console.log(`Web Interface : http://localhost:${server.address().port}`);
  console.log(`OMP workspace : ${process.env.OMP_CWD || __dirname}`);
});
