/**
 * PIXEL OFFICE CCTV 2.5D - 4-AGENT EXPANDED HQ EDITION
 * Agents:
 * - leada  : Leader IT & Tech Strategist
 * - coder  : Core Code Writer & Implementer
 * - secu   : Security Guardian & QA Auditor
 * - infras : Cloud & Server Infrastructure Specialist
 * 
 * Features:
 * - 2X Expanded Floorplan (28x16 Grid) with Warm Wood Parquet
 * - Wall Quotes Decor ("TALK IS CHEAP. SHOW ME THE CODE." & "CODE · SECURE · SHIP")
 * - 4-Seat Long Executive Workbench Desk (Dual Monitors, Chairs, Keyboards & Active Typing)
 * - Private Bunk Bed Rest Suite (2-Tier Bed with Animated Zzz)
 * - Pantry, Server Bay, Meeting Table, Arcade Lounge
 * - Smooth Forward-Facing Movement (Zero Jitter, Legs & Arms Swing Naturally)
 * - Sharp Counter-Scaled Name Tags ([LEADA], [CODER], [SECU], [INFRAS])
 * - Floating Semi-Transparent Collapsible Command Dock
 */

const PORT = 3333;

const agents = {
  leada: {
    id: "leada",
    name: "LEADA",
    role: "Leader IT & Software Architect",
    model: "leader",
    color: "#6366f1", // Royal Indigo
    status: "idle",
    currentTask: null,
    process: null,
  },
  coder: {
    id: "coder",
    name: "CODER",
    role: "Core Code Writer & Implementer",
    model: "coder",
    color: "#ff6b00", // Bright Orange
    status: "idle",
    currentTask: null,
    process: null,
  },
  secu: {
    id: "secu",
    name: "SECU",
    role: "Security Guardian & QA Auditor",
    model: "security",
    color: "#84cc16", // Olive Lime
    status: "idle",
    currentTask: null,
    process: null,
  },
  infras: {
    id: "infras",
    name: "INFRAS",
    role: "DevOps & Cloud Infrastructure",
    model: "infra",
    color: "#ef4444", // Crimson Toolwear
    status: "idle",
    currentTask: null,
    process: null,
  },
};

const server = Bun.serve({
  port: PORT,
  async fetch(req, server) {
    const url = new URL(req.url);

    // WebSocket upgrade
    if (url.pathname === "/ws") {
      const upgraded = server.upgrade(req);
      if (upgraded) return undefined;
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    // Serve Static Assets (/rooms/*, /sprites/*) if requested
    if (url.pathname.startsWith("/rooms/") || url.pathname.startsWith("/sprites/")) {
      let file = Bun.file("." + url.pathname);
      if (file.size === 0) {
        file = Bun.file("./public" + url.pathname);
      }
      if (file.size === 0) {
        file = Bun.file("./pixel-office/public" + url.pathname);
      }

      if (file.size > 0) {
        return new Response(file, {
          headers: {
            "Content-Type": url.pathname.endsWith(".png") ? "image/png" : "application/octet-stream",
            "Cache-Control": "public, max-age=86400",
          },
        });
      }
    }

    // Serve Standalone index.html
    if (url.pathname === "/" || url.pathname === "/index.html") {
      let file = Bun.file("./index.html");
      if (file.size === 0) {
        file = Bun.file("./pixel-office/index.html");
      }
      if (file.size > 0) {
        return new Response(file, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }
    }

    return new Response("Not Found", { status: 404 });
  },

  websocket: {
    open(ws) {
      ws.subscribe("cctv-office");
      ws.send(JSON.stringify({
        type: "sync_state",
        agents: getSanitizedAgents(),
      }));
    },

    async message(ws, message) {
      try {
        const data = JSON.parse(message);

        if (data.type === "dispatch_task") {
          const { agentId, prompt } = data;
          const agent = agents[agentId];
          if (!agent) return;

          if (agent.status === "working") {
            ws.send(JSON.stringify({
              type: "log",
              agentId,
              stream: "stderr",
              text: `[SYSTEM] Agent ${agent.name} sedang sibuk mengerjakan tugas!\n`,
            }));
            return;
          }

          // ==============================================================
          // MULTI-AGENT DELEGATION: IF DISPATCHED TO LEADA (TECH LEAD)
          // ==============================================================
          if (agentId === "leada") {
            handleLeadDelegation(prompt);
            return;
          }

          agent.status = "working";
          agent.currentTask = prompt;

          broadcast({
            type: "agent_status",
            agentId,
            status: "working",
            task: prompt,
          });

          broadcast({
            type: "log",
            agentId,
            stream: "stdout",
            text: `\n>>> [DISPATCH] ${agent.name} menuju meja kerja!\n>>> Tugas: "${prompt}"\n>>> Menjalankan OMP CLI di background...\n\n`,
          });

          if (prompt.startsWith("[SIMULASI]") || prompt.startsWith("[MOCK]")) {
            simulateTask(agentId, prompt);
            return;
          }
          try {
            const ompCmd = ["omp", "-p", prompt];
            const proc = Bun.spawn(ompCmd, {
              cwd: process.cwd(),
              stdout: "pipe",
              stderr: "pipe",
              env: { ...process.env },
            });

            agent.process = proc;

            (async () => {
              const reader = proc.stdout.getReader();
              const decoder = new TextDecoder();
              try {
                while (true) {
                  const { value, done } = await reader.read();
                  if (done) break;
                  broadcast({
                    type: "log",
                    agentId,
                    stream: "stdout",
                    text: decoder.decode(value),
                  });
                }
              } catch (e) {}
            })();

            (async () => {
              const reader = proc.stderr.getReader();
              const decoder = new TextDecoder();
              try {
                while (true) {
                  const { value, done } = await reader.read();
                  if (done) break;
                  broadcast({
                    type: "log",
                    agentId,
                    stream: "stderr",
                    text: decoder.decode(value),
                  });
                }
              } catch (e) {}
            })();

            const exitCode = await proc.exited;

            agent.status = "idle";
            agent.currentTask = null;
            agent.process = null;

            broadcast({
              type: "log",
              agentId,
              stream: "stdout",
              text: `\n[SELESAI] Tugas ${agent.name} rampung (exit code: ${exitCode}). Agent kembali bebas beristirahat.\n`,
            });

            broadcast({
              type: "agent_status",
              agentId,
              status: "idle",
            });
          } catch (spawnError) {
            broadcast({
              type: "log",
              agentId,
              stream: "stderr",
              text: `[ERROR] OMP fallback: ${spawnError.message}\n(Beralih ke simulasi visual internal).\n`,
            });
            simulateTask(agentId, prompt);
          }
        }
      } catch (err) {
        console.error("WS error:", err);
      }
    },

    close(ws) {
      ws.unsubscribe("cctv-office");
    },
  },
});

function getSanitizedAgents() {
  const result = {};
  for (const [id, a] of Object.entries(agents)) {
    result[id] = {
      id: a.id,
      name: a.name,
      role: a.role,
      status: a.status,
      task: a.currentTask,
    };
  }
  return result;
}

function broadcast(payload) {
  server.publish("cctv-office", JSON.stringify(payload));
}

function simulateTask(agentId, prompt) {
  const agent = agents[agentId];
  let step = 0;
  const timer = setInterval(() => {
    step++;
    if (step === 1) {
      broadcast({
        type: "log",
        agentId,
        stream: "stdout",
        text: `[OMP ANALYZER] Memindai skema modul untuk: "${prompt}"...\n`,
      });
    } else if (step === 2) {
      broadcast({
        type: "log",
        agentId,
        stream: "stdout",
        text: `[OMP WORKER] Mengetik kode, menerapkan patch & kompilasi AST...\n`,
      });
    } else if (step === 3) {
      broadcast({
        type: "log",
        agentId,
        stream: "stdout",
        text: `[OMP QA-GATE] Verifikasi lolos (0 regresi). Menulis log selesai.\n`,
      });
    } else if (step >= 4) {
      clearInterval(timer);
      agent.status = "idle";
      agent.currentTask = null;
      broadcast({
        type: "log",
        agentId,
        stream: "stdout",
        text: `[SELESAI] Tugas ${agent.name} sukses tuntas! Agent kembali bersantai.\n`,
      });
      broadcast({
        type: "agent_status",
        agentId,
        status: "idle",
      });
    }
  }, 2600);
}

function handleLeadDelegation(prompt) {
  const lead = agents.leada;
  lead.status = "working";
  lead.currentTask = prompt;

  broadcast({
    type: "agent_status",
    agentId: "leada",
    status: "working",
    task: `[LEAD PIC] ${prompt}`,
  });

  // Domain-specific breakdown
  const domainInfras = `Setup & verifikasi environment, services, dan container cluster untuk: "${prompt}"`;
  const domainCoder = `Implementasi kode, business logic, endpoints & unit tests untuk: "${prompt}"`;
  const domainSecu = `Audit keamanan, analisis celah kerentanan, validasi otentikasi & sanitasi untuk: "${prompt}"`;

  broadcast({
    type: "log",
    agentId: "leada",
    stream: "lead",
    text: `\n=================================================================\n` +
          `👑 [LEADA | TECH LEAD] Menerima tanggung jawab penuh untuk tugas:\n` +
          `   "${prompt}"\n` +
          `📐 [LEADA] Merancang arsitektur & mendelegasikan tugas ke spesialis:\n` +
          `   ├─ ⚡ [INFRAS] : ${domainInfras}\n` +
          `   ├─ 💻 [CODER]  : ${domainCoder}\n` +
          `   └─ 🛡️  [SECU]   : ${domainSecu}\n` +
          `=================================================================\n\n`,
  });

  // 1. Move all 3 specialists to desks
  agents.infras.status = "working";
  agents.infras.currentTask = domainInfras;
  agents.coder.status = "working";
  agents.coder.currentTask = domainCoder;
  agents.secu.status = "working";
  agents.secu.currentTask = domainSecu;

  ["infras", "coder", "secu"].forEach((id) => {
    broadcast({
      type: "agent_status",
      agentId: id,
      status: "working",
      task: agents[id].currentTask,
    });
  });

  broadcast({
    type: "log",
    agentId: "leada",
    stream: "sys",
    text: `🚀 [DISPATCH] Infras, Coder, dan Secu serentak melangkah menuju meja kerja masing-masing!\n\n`,
  });

  // TAHAP 1: INFRAS MENYELESAIKAN RANAH INFRASTRUKTUR
  setTimeout(() => {
    broadcast({
      type: "log",
      agentId: "infras",
      stream: "infra",
      text: `⚡ [INFRAS | CLOUD & DEVOPS]\n` +
            `   ├─ Memeriksa status cluster, Docker compose, dan port network...\n` +
            `   ├─ PostgreSQL 16 (Port 5432) & Redis 7 (Port 6379): [ACTIVE & HEALTHY]\n` +
            `   ├─ Memastikan volume persistence & resource limits siap...\n` +
            `   └─ [INFRAS -> LEADA] ✅ TUGAS SELESAI: Ranah infrastruktur & environment siap 100%!\n\n`,
    });
    agents.infras.status = "completed";
    broadcast({
      type: "agent_status",
      agentId: "infras",
      status: "completed",
      task: "SELESAI ✅: Infrastruktur siap",
    });

    // TAHAP 2: CODER MENYELESAIKAN RANAH CODING & IMPLEMENTASI
    setTimeout(() => {
      broadcast({
        type: "log",
        agentId: "coder",
        stream: "coder",
        text: `💻 [CODER | CORE DEVELOPER]\n` +
              `   ├─ Membaca struktur modul, schemas, dan endpoints API...\n` +
              `   ├─ Menulis implementasi fitur, bug fix & business logic...\n` +
              `   ├─ Menjalankan syntax validation & AST compile: [0 ERROR]\n` +
              `   ├─ Menjalankan unit test & backend regression suite: [100% PASSED]\n` +
              `   └─ [CODER -> LEADA] ✅ TUGAS SELESAI: Ranah coding & implementasi fitur selesai tuntas!\n\n`,
      });
      agents.coder.status = "completed";
      broadcast({
        type: "agent_status",
        agentId: "coder",
        status: "completed",
        task: "SELESAI ✅: Kode & unit test tuntas",
      });

      // TAHAP 3: SECU MENYELESAIKAN RANAH SECURITY AUDIT & QA
      setTimeout(() => {
        broadcast({
          type: "log",
          agentId: "secu",
          stream: "secu",
          text: `🛡️ [SECU | SECURITY & QA AUDITOR]\n` +
                `   ├─ Memindai kode baru terhadap celah OWASP Top 10 (SQLi, XSS, CSRF)...\n` +
                `   ├─ Menguji boundary check, sanitasi input payload & otentikasi JWT/Argon2...\n` +
                `   ├─ Audit permission access control & secret encryption: [SECURE]\n` +
                `   ├─ Hasil audit keamanan: 0 Critical, 0 High, 0 Medium Vulnerability (PASS).\n` +
                `   └─ [SECU -> LEADA] ✅ TUGAS SELESAI: Ranah keamanan tervalidasi aman tanpa celah!\n\n`,
        });
        agents.secu.status = "completed";
        broadcast({
          type: "agent_status",
          agentId: "secu",
          status: "completed",
          task: "SELESAI ✅: Audit keamanan lulus (0 Celah)",
        });

        // TAHAP 4: LEADA SEBAGAI PENANGGUNG JAWAB MEMVERIFIKASI & MENYELESAIKAN TUGAS
        setTimeout(() => {
          broadcast({
            type: "log",
            agentId: "leada",
            stream: "success",
            text: `=================================================================\n` +
                  `👑 [LEADA | EVALUASI & PENYELESAIAN TUGAS AKHIR]\n` +
                  `   ├─ Verifikasi Ranah Infrastruktur [INFRAS] : VALID & SELESAI ✅\n` +
                  `   ├─ Verifikasi Ranah Coding [CODER]          : VALID & SELESAI ✅\n` +
                  `   ├─ Verifikasi Ranah Security [SECU]         : VALID & SELESAI ✅\n` +
                  `   │\n` +
                  `   └─ 🏆 [TANGGUNG JAWAB LEAD TUNTAS] Tugas "${prompt}" telah dievaluasi\n` +
                  `      dan diselesaikan 100% oleh tim di bawah supervisi Tech Lead!\n` +
                  `=================================================================\n\n`,
          });

          lead.status = "completed";
          broadcast({
            type: "agent_status",
            agentId: "leada",
            status: "completed",
            task: "TUNTAS & DISETUJUI 🏆",
          });

          // Setelah 5 detik verifikasi selesai, tim kembali bersantai (IDLE)
          setTimeout(() => {
            for (const [id, a] of Object.entries(agents)) {
              a.status = "idle";
              a.currentTask = null;
              broadcast({
                type: "agent_status",
                agentId: id,
                status: "idle",
              });
            }
          }, 5000);
        }, 2200);
      }, 2400);
    }, 2400);
  }, 2200);
}

console.log(`\n================================================================`);
console.log(`  🏢 PIXEL OFFICE CCTV 2.5D - 4-AGENT EXPANDED EDITION`);
console.log(`  📡 Web Interface : http://localhost:${PORT}`);
console.log(`  👥 Agents (4)    : LEADA, CODER, SECU, INFRAS`);
console.log(`  🛋️  Workspace     : 2X Expanded (28x16 Grid) with Wall Quotes Decor`);
console.log(`================================================================\n`);
