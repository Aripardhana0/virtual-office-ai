const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const { WebSocket } = require("ws");

test("HTTP serves public files without exposing project files", async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "virtual-office-http-"));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  await fs.copyFile(path.join(__dirname, "server.js"), path.join(dir, "server.js"));
  await fs.copyFile(path.join(__dirname, "omp-session.js"), path.join(dir, "omp-session.js"));
  await fs.symlink(path.join(__dirname, "node_modules"), path.join(dir, "node_modules"), "dir");
  await fs.mkdir(path.join(dir, "public"));
  await fs.writeFile(path.join(dir, "index.html"), "<h1>Office</h1>");
  await fs.writeFile(path.join(dir, "private.txt"), "private configuration");
  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  await fs.writeFile(path.join(dir, "public", "sprite test.png"), png);
  await fs.symlink(path.join(dir, "private.txt"), path.join(dir, "public", "leak.txt"));

  const child = spawn(process.execPath, [path.join(dir, "server.js")], {
    env: { ...process.env, PORT: "0" }, stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(async () => {
    const closed = once(child, "close");
    child.kill();
    await closed;
  });
  // Read the assigned port without reserving a port ahead of the server.
  let output = "";
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Server startup timed out")), 5000);
    child.once("error", (err) => { clearTimeout(timer); reject(err); });
    child.stdout.on("data", (chunk) => {
      output += chunk;
      const match = output.match(/Web Interface : http:\/\/localhost:(\d+)/);
      if (match) { clearTimeout(timer); resolve(Number(match[1])); }
    });
  });
  async function request(url, headers = {}) {
    return new Promise((resolve, reject) => {
      http.get({ hostname: "127.0.0.1", port, path: url, headers }, (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
        res.on("error", reject);
      }).on("error", reject);
    });
  }
  for (const url of ["/", "/index.html?refresh=1"]) {
    const res = await request(url);
    assert.equal(res.status, 200);
    assert.equal(res.body.toString(), "<h1>Office</h1>");
  }
  const asset = await request("/public/sprite%20test.png");
  assert.equal(asset.status, 200);
  assert.equal(asset.headers["content-type"], "image/png");
  assert.equal(asset.headers["x-content-type-options"], "nosniff");
  assert.deepEqual(asset.body, png);
  for (const url of ["/server.js", "/private.txt", "/public/missing.png", "/public/", "/public/leak.txt", "/public/%2e%2e%2fprivate.txt"]) {
    assert.equal((await request(url)).status, 404, url);
  }
  for (const url of ["/public/%ZZ", "/public/%00"]) {
    assert.equal((await request(url)).status, 400, url);
  }
  assert.equal((await request("/", { Host: "attacker.example" })).status, 403);

  const refused = new WebSocket(`ws://127.0.0.1:${port}/ws`, { origin: "https://attacker.example" });
  assert.match((await once(refused, "error"))[0].message, /403/);
  const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`, { origin: `http://127.0.0.1:${port}` });
  const messages = [];
  socket.on("message", (raw) => messages.push(JSON.parse(raw)));
  t.after(() => socket.terminate());
  await once(socket, "open");
  const next = once(socket, "message");
  socket.send('{"type":"not_', { fin: false });
  socket.send('a_command"}', { fin: true });
  await next;
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Invalid command did not produce an error")), 3000);
    const check = () => {
      if (messages.some((m) => m.type === "log" && m.stream === "stderr")) {
        clearTimeout(timer);
        socket.off("message", check);
        resolve();
      }
    };
    socket.on("message", check);
    check();
  });
  assert.equal(messages.find((m) => m.type === "sync_state").agents.leada.status, "idle");
  assert.ok(messages.some((m) => m.type === "omp_state" && m.busy === false));
});
