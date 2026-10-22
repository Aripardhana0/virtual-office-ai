const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createOfficeSession } = require("./omp-session");

test("createOfficeSession forwards dialogs, aborts, and commands correctly", async (t) => {
  // Buat mock OMP CLI sederhana yang mengembalikan event JSONL nyata
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "omp-mock-"));
  t.after(() => fs.rm(tempDir, { recursive: true, force: true }));

  const mockScript = path.join(tempDir, "mock-omp.js");
  await fs.writeFile(
    mockScript,
    `
    const { createInterface } = require("node:readline");
    console.log(JSON.stringify({ type: "ready", protocolVersion: 1 }));
    createInterface({ input: process.stdin }).on("line", (line) => {
      try {
        const cmd = JSON.parse(line);
        if (cmd.type === "get_state") {
          console.log(JSON.stringify({ id: cmd.id, type: "response", command: "get_state", success: true, data: { sessionId: "test-sess", isStreaming: false } }));
        } else if (cmd.type === "prompt") {
          console.log(JSON.stringify({ id: cmd.id, type: "response", command: "prompt", success: true, data: { agentInvoked: true } }));
          console.log(JSON.stringify({ type: "agent_start" }));
          console.log(JSON.stringify({ type: "subagent_lifecycle", subagent: { id: "test-coder", name: "CODER-WORKER", status: "running", task: "Tulis unit test" } }));
          console.log(JSON.stringify({ type: "subagent_progress", subagentId: "test-coder", text: "Menulis kode...\\n" }));
          console.log(JSON.stringify({ type: "extension_ui_request", id: "ask_1", method: "confirm", message: "Izinkan eksekusi?" }));
        } else if (cmd.type === "abort") {
          console.log(JSON.stringify({ id: cmd.id, type: "response", command: "abort", success: true }));
          console.log(JSON.stringify({ type: "prompt_result", id: cmd.id, status: "aborted", sessionSettled: true }));
          console.log(JSON.stringify({ type: "session_settled" }));
        }
      } catch (e) {}
    });
  `
  );

  const events = [];
  const agentStates = [];
  const session = createOfficeSession({
    broadcast: (msg) => events.push(msg),
    setAgent: (id, state) => agentStates.push({ id, ...state }),
    cwd: tempDir,
    executable: process.execPath,
  });

  // Override argumen agar menjalankan mock script
  session.handle = (original => async (msg) => {
    return original(msg);
  })(session.handle);

  t.after(() => session.close());

  // Pastikan snapshot awal kosong & stabil
  const snap0 = session.snapshot();
  assert.equal(snap0.state.ready, false);

  // Inisialisasi melalui handle dispatch_task
  // Ganti process spawn di mock dengan executable = node + mockScript
  const sessionWithMock = createOfficeSession({
    broadcast: (msg) => events.push(msg),
    setAgent: (id, state) => agentStates.push({ id, ...state }),
    cwd: tempDir,
    executable: `${process.execPath} "${mockScript}"`,
  });
  t.after(() => sessionWithMock.close());

  // Jalankan perintah prompt
  const resPrompt = await sessionWithMock.handle({
    type: "dispatch_task",
    agentId: "leada",
    prompt: "Buatkan fitur login",
  });
  assert.equal(resPrompt.success, true);

  // Tunggu beberapa ms agar event loop mock OMP memproses stdout
  await new Promise((r) => setTimeout(r, 400));

  // Pastikan subagent coder aktif dan terpetakan
  const snap1 = sessionWithMock.snapshot();
  assert.equal(snap1.state.ready, true);
  assert.ok(snap1.subagents.length > 0);
  assert.equal(snap1.subagents[0].visualRole, "coder");

  // Pastikan dialog OMP ask_1 tertangkap
  assert.equal(snap1.dialogs.length, 1);
  assert.equal(snap1.dialogs[0].id, "ask_1");

  // Kirim respon dialog
  await sessionWithMock.handle({
    type: "omp_ui_response",
    response: { type: "extension_ui_response", id: "ask_1", confirmed: true },
  });
  assert.equal(sessionWithMock.snapshot().dialogs.length, 0);

  // Kirim abort
  const resAbort = await sessionWithMock.handle({ type: "omp_abort" });
  assert.equal(resAbort.success, true);
  await new Promise((r) => setTimeout(r, 200));

  // Selesai dengan bersih
  assert.equal(sessionWithMock.snapshot().state.busy, false);
});
