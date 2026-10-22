const { spawn } = require("node:child_process");
const { createInterface } = require("node:readline");

function createOfficeSession({ broadcast, setAgent, cwd, executable }) {
  let child = null;
  let readline = null;
  let nextId = 1;
  const pendingCommands = new Map();
  const dialogs = new Map();
  const subagents = new Map();
  const logs = [];
  const MAX_LOGS = 300;

  let state = {
    ready: false,
    busy: false,
    sessionId: null,
    cwd: cwd || process.cwd(),
    model: null,
    thinkingLevel: null,
    error: null,
    route: "Runtime OMP (LEADA delegasi aktual)",
    action: "Menunggu instruksi",
  };

  const ROLE_MAP = {
    leada: "leada",
    lead: "leada",
    leader: "leada",
    coder: "coder",
    dev: "coder",
    developer: "coder",
    implementer: "coder",
    secu: "secu",
    security: "secu",
    auditor: "secu",
    qa: "secu",
    infras: "infras",
    infra: "infras",
    devops: "infras",
    cloud: "infras",
  };

  function mapRole(name) {
    if (!name) return "coder";
    const lower = String(name).toLowerCase();
    for (const [key, target] of Object.entries(ROLE_MAP)) {
      if (lower.includes(key)) return target;
    }
    return "coder";
  }

  function emitLog(log) {
    const entry = { type: "log", ...log };
    logs.push(entry);
    if (logs.length > MAX_LOGS) logs.shift();
    broadcast(entry);
  }

  function updateState(patch) {
    Object.assign(state, patch);
    broadcast({ type: "omp_state", ...state });
  }

  function sendLine(payload) {
    if (!child || !child.stdin || child.stdin.destroyed) {
      throw new Error("OMP RPC child process is not available");
    }
    child.stdin.write(JSON.stringify(payload) + "\n");
  }

  function sendCommand(type, args = {}) {
    const id = `cmd_${nextId++}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pendingCommands.delete(id);
        reject(new Error(`Command ${type} timed out`));
      }, 30000);
      pendingCommands.set(id, { resolve, reject, timer });
      try {
        sendLine({ id, type, ...args });
      } catch (err) {
        clearTimeout(timer);
        pendingCommands.delete(id);
        reject(err);
      }
    });
  }

  function ensureProcess() {
    if (child && !child.killed) return child;
    const bin = executable || "omp";
    const isCmdStringWithArgs = typeof bin === "string" && bin.includes(" ");
    child = spawn(bin, ["--mode", "rpc-ui"], {
      shell: isCmdStringWithArgs,
      cwd: state.cwd,
      env: {
        ...process.env,
        PI_NO_TITLE: "1",
      },
      stdio: ["pipe", "pipe", "pipe"],
    });

    readline = createInterface({ input: child.stdout });
    readline.on("line", handleStdoutLine);

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString("utf8");
      emitLog({ agentId: "leada", stream: "stderr", text });
    });

    child.on("error", (err) => {
      updateState({ ready: false, busy: false, error: err.message });
      emitLog({ agentId: "leada", stream: "stderr", text: `[OMP PROC ERROR] ${err.message}\n` });
    });

    child.on("close", (code) => {
      updateState({ ready: false, busy: false, error: `Exited (${code ?? "null"})` });
      emitLog({ agentId: "leada", stream: "sys", text: `\n[OMP PROC CLOSED] Exit code: ${code}\n` });
      child = null;
      readline = null;
      for (const [id, req] of dialogs) {
        broadcast({ type: "omp_ui_cancel", id });
      }
      dialogs.clear();
      for (const pending of pendingCommands.values()) {
        clearTimeout(pending.timer);
        pending.reject(new Error("OMP process closed"));
      }
      pendingCommands.clear();
      resetSprites();
    });

    return child;
  }

  function resetSprites() {
    for (const role of ["leada", "coder", "secu", "infras"]) {
      setAgent(role, { status: "idle", action: "idle", task: null, detail: "" });
    }
  }

  function handleStdoutLine(line) {
    if (!line || !line.trim()) return;
    let frame;
    try {
      frame = JSON.parse(line);
    } catch {
      return;
    }

    if (frame.type === "ready") {
      updateState({ ready: true, error: null });
      sendLine({ id: "init_subagents", type: "set_subagent_subscription", level: "events" });
      sendLine({ id: "init_ask", type: "set_ask_dialog", enabled: true });
      sendCommand("get_state")
        .then((res) => {
          if (res && res.data) {
            updateState({
              sessionId: res.data.sessionId || state.sessionId,
              cwd: res.data.cwd || state.cwd,
              model: res.data.model || state.model,
              thinkingLevel: res.data.thinkingLevel || state.thinkingLevel,
              busy: Boolean(res.data.isStreaming || (res.data.isSettled === false)),
            });
          }
        })
        .catch(() => {});
      return;
    }

    if (frame.type === "response") {
      if (frame.id && pendingCommands.has(frame.id)) {
        const { resolve, timer } = pendingCommands.get(frame.id);
        clearTimeout(timer);
        pendingCommands.delete(frame.id);
        resolve(frame);
      }
      broadcast({ type: "omp_response", response: frame });
      return;
    }

    if (frame.type === "agent_start") {
      updateState({ busy: true, action: "Agen berpikir / delegasi aktif" });
      setAgent("leada", { status: "working", action: "thinking", task: "Memproses tugas di OMP", detail: "Berjalan" });
      return;
    }

    if (frame.type === "message_update") {
      const ev = frame.assistantMessageEvent;
      if (ev?.type === "text_delta" && typeof ev.delta === "string") {
        emitLog({ agentId: "leada", stream: "stdout", text: ev.delta });
      } else if (ev?.type === "thinking_delta" && typeof ev.delta === "string") {
        emitLog({ agentId: "leada", stream: "sys", text: ev.delta });
      }
      return;
    }

    if (frame.type === "message_end") {
      const msg = frame.message;
      if (msg?.role === "custom" && typeof msg.content === "string") {
        emitLog({ agentId: "leada", stream: "sys", text: `[NOTICE] ${msg.content}\n` });
      } else if (msg?.role === "assistant" && Array.isArray(msg.content)) {
        // Baris baru setelah assistant selesai merespons
        emitLog({ agentId: "leada", stream: "stdout", text: "\n" });
      }
      return;
    }

    if (frame.type === "tool_execution_start") {
      const tool = frame.tool || frame.name || "tool";
      const role = mapRole(tool);
      updateState({ action: `Tool: ${tool}`, route: `Eksekusi tool [${tool}] via ${role.toUpperCase()}` });
      setAgent(role, { status: "working", action: "coding", task: `Tool: ${tool}`, detail: String(frame.args ? JSON.stringify(frame.args).slice(0, 40) : "") });
      emitLog({ agentId: role, stream: "stdout", text: `\n[TOOL START] ${tool}\n` });
      return;
    }

    if (frame.type === "tool_execution_end") {
      const tool = frame.tool || frame.name || "tool";
      const role = mapRole(tool);
      setAgent(role, { status: "idle", action: "idle", task: null, detail: "" });
      emitLog({ agentId: role, stream: "stdout", text: `[TOOL END] ${tool}\n` });
      return;
    }

    if (frame.type === "agent_end") {
      updateState({ busy: false, action: "Turn selesai" });
      resetSprites();
      return;
    }

    if (frame.type === "prompt_result") {
      updateState({ busy: !frame.sessionSettled });
      if (frame.error) {
        emitLog({ agentId: "leada", stream: "stderr", text: `\n[OMP ERROR] ${frame.error.message || JSON.stringify(frame.error)}\n` });
      }
      if (frame.sessionSettled) {
        resetSprites();
      }
      return;
    }

    if (frame.type === "session_settled") {
      updateState({ busy: false, action: "Sesi selesai (quiescent)" });
      resetSprites();
      return;
    }

    // Subagent lifecycle / progress / events
    if (frame.type === "subagent_lifecycle") {
      const sub = frame.subagent || {};
      const id = sub.id || frame.subagentId || "worker";
      const role = mapRole(sub.name || id);
      const entry = {
        id,
        name: sub.name || id,
        status: frame.status || sub.status || "active",
        visualRole: role,
        task: sub.task || "",
      };
      subagents.set(id, entry);
      broadcast({ type: "omp_subagents", agents: Array.from(subagents.values()) });

      if (entry.status === "running" || entry.status === "active") {
        setAgent(role, { status: "working", action: "coding", task: entry.task || id, detail: id });
        emitLog({ agentId: role, stream: "stdout", text: `\n[SUBAGENT AKTIF: ${id}] ${entry.task}\n` });
      } else {
        setAgent(role, { status: "idle", action: "idle", task: null, detail: "" });
        emitLog({ agentId: role, stream: "stdout", text: `\n[SUBAGENT SELESAI: ${id}] status: ${entry.status}\n` });
      }
      return;
    }

    if (frame.type === "subagent_progress" || frame.type === "subagent_event") {
      const id = frame.subagentId || "subagent";
      const role = mapRole(id);
      const text = frame.text || frame.delta || (frame.event?.assistantMessageEvent?.delta) || "";
      if (text) {
        emitLog({ agentId: role, stream: "stdout", text });
      }
      return;
    }

    // Extension UI requests
    if (frame.type === "extension_ui_request") {
      const req = frame;
      dialogs.set(req.id, req);
      broadcast({ type: "omp_ui", request: req });
      return;
    }

    if (frame.type === "command_output") {
      emitLog({ agentId: "leada", stream: "stdout", text: String(frame.output || "") + "\n" });
    }
  }

  return {
    async handle(message) {
      ensureProcess();
      const type = message.type;

      if (type === "dispatch_task") {
        const { agentId, prompt, streamingBehavior } = message;
        if (!prompt || typeof prompt !== "string") throw new Error("Missing prompt");

        // Jika user mengarahkan ke subagent tertentu (coder/secu/infras)
        if (agentId && agentId !== "leada" && !prompt.startsWith("/")) {
          // Cari subagent yang sedang aktif dengan role tersebut
          let activeSub = null;
          for (const s of subagents.values()) {
            if (s.visualRole === agentId && (s.status === "running" || s.status === "active")) {
              activeSub = s;
              break;
            }
          }

          if (activeSub) {
            emitLog({ agentId, stream: "sys", text: `\n[STEER SUBAGENT] Mengarahkan ${activeSub.id}: "${prompt}"\n` });
            return sendCommand("steer_subagent", { subagentId: activeSub.id, message: prompt });
          }

          // Jika tidak ada subagent aktif, minta LEADA untuk mendelegasikan secara sadar konteks
          const contextualPrompt = `[Instruksi untuk spesialis ${agentId.toUpperCase()}]: ${prompt}`;
          return sendCommand("prompt", {
            message: contextualPrompt,
            ...(state.busy ? { streamingBehavior: streamingBehavior || "followUp" } : {}),
          });
        }

        // Default: kirim langsung ke lead
        return sendCommand("prompt", {
          message: prompt,
          ...(state.busy ? { streamingBehavior: streamingBehavior || "followUp" } : {}),
        });
      }

      if (type === "omp_abort") {
        return sendCommand("abort");
      }

      if (type === "omp_ui_response") {
        const resp = message.response;
        if (!resp || !resp.id) throw new Error("Invalid UI response payload");
        dialogs.delete(resp.id);
        sendLine(resp);
        broadcast({ type: "omp_ui_cancel", id: resp.id });
        return { success: true };
      }

      if (type === "omp_command") {
        const cmd = message.command;
        if (!cmd || typeof cmd.type !== "string") throw new Error("Invalid command");
        const allowed = new Set([
          "get_state",
          "new_session",
          "get_available_models",
          "set_model",
          "get_available_thinking_levels",
          "set_thinking_level",
          "get_available_commands",
        ]);
        if (!allowed.has(cmd.type)) throw new Error(`Command not allowed: ${cmd.type}`);
        return sendCommand(cmd.type, cmd);
      }

      throw new Error(`Unknown message type: ${type}`);
    },

    snapshot() {
      return {
        state: { ...state },
        subagents: Array.from(subagents.values()),
        dialogs: Array.from(dialogs.values()),
        logs: [...logs],
      };
    },

    async close() {
      if (child) {
        try {
          child.kill("SIGTERM");
        } catch {}
      }
    },
  };
}

module.exports = { createOfficeSession };
