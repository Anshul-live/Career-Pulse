#!/usr/bin/env node
/**
 * CareerPulse - Single command startup
 * 
 * Usage:
 *   node start.js              Start MongoDB + Backend + Frontend
 *   node start.js --install    Install all dependencies first
 *   node start.js --stop       Stop all services
 * 
 * Requires: Node.js 18+, Python 3.9+, MongoDB
 */

const { spawn, execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const ROOT = __dirname;
const BACKEND = path.join(ROOT, "backend");
const FRONTEND = path.join(ROOT, "frontend");
const PIPELINE = path.join(ROOT, "pipeline");

const procs = [];
const args = process.argv.slice(2);

// ── Helpers ──

function log(tag, msg) {
  const colors = { mongo: "\x1b[32m", backend: "\x1b[36m", frontend: "\x1b[35m", setup: "\x1b[33m", info: "\x1b[37m" };
  const c = colors[tag] || "\x1b[37m";
  console.log(`${c}[${tag}]\x1b[0m ${msg}`);
}

function findPython() {
  const candidates = [
    process.env.PYTHON_PATH,
    path.join(process.env.LOCALAPPDATA || "", "Programs", "Python", "Python312", "python.exe"),
    path.join(process.env.LOCALAPPDATA || "", "Programs", "Python", "Python311", "python.exe"),
    "python3",
    "python",
  ].filter(Boolean);

  for (const p of candidates) {
    try {
      execSync(`"${p}" --version`, { stdio: "ignore" });
      return p;
    } catch {}
  }
  return null;
}

function findMongod() {
  // Check PATH first
  try { execSync("mongod --version", { stdio: "ignore" }); return "mongod"; } catch {}

  // Common Windows locations
  const windowsPaths = [
    path.join(process.env.USERPROFILE || "", "mongodb", "mongodb-win32-x86_64-windows-8.0.4", "bin", "mongod.exe"),
    "C:\\Program Files\\MongoDB\\Server\\8.0\\bin\\mongod.exe",
    "C:\\Program Files\\MongoDB\\Server\\7.0\\bin\\mongod.exe",
  ];
  for (const p of windowsPaths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function startProcess(name, cmd, cmdArgs, cwd, env = {}) {
  const fullEnv = { ...process.env, ...env };
  const proc = spawn(cmd, cmdArgs, { cwd, env: fullEnv, stdio: ["ignore", "pipe", "pipe"], shell: true });

  proc.stdout.on("data", (d) => d.toString().trim().split("\n").forEach((l) => log(name, l)));
  proc.stderr.on("data", (d) => d.toString().trim().split("\n").forEach((l) => log(name, l)));
  proc.on("close", (code) => { if (code) log(name, `exited with code ${code}`); });

  procs.push({ name, proc });
  return proc;
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function waitForPort(port, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const net = require("net");
      await new Promise((resolve, reject) => {
        const sock = net.connect(port, "localhost", () => { sock.destroy(); resolve(); });
        sock.on("error", reject);
      });
      return true;
    } catch { await sleep(500); }
  }
  return false;
}

// ── Install ──

function install() {
  log("setup", "Installing backend dependencies...");
  execSync("npm install", { cwd: BACKEND, stdio: "inherit" });

  log("setup", "Installing frontend dependencies...");
  execSync("npm install", { cwd: FRONTEND, stdio: "inherit" });

  const py = findPython();
  if (py) {
    log("setup", "Installing Python dependencies...");
    try {
      execSync(`"${py}" -m pip install -r requirements.txt`, { cwd: PIPELINE, stdio: "inherit" });
    } catch { log("setup", "Python deps install failed - install manually: pip install -r pipeline/requirements.txt"); }
  } else {
    log("setup", "Python not found - install manually: pip install -r pipeline/requirements.txt");
  }

  // Create .env files from examples if missing
  if (!fs.existsSync(path.join(BACKEND, ".env"))) {
    fs.copyFileSync(path.join(BACKEND, ".env.example"), path.join(BACKEND, ".env"));
    log("setup", "Created backend/.env from .env.example - EDIT IT with your credentials");
  }
  if (!fs.existsSync(path.join(PIPELINE, ".env"))) {
    fs.copyFileSync(path.join(PIPELINE, ".env.example"), path.join(PIPELINE, ".env"));
    log("setup", "Created pipeline/.env from .env.example - EDIT IT with your Gemini API key");
  }

  log("setup", "Install complete!");
}

// ── Start ──

async function start() {
  // Check env files
  if (!fs.existsSync(path.join(BACKEND, ".env"))) {
    log("info", "backend/.env missing - run: node start.js --install");
    process.exit(1);
  }

  // 1. MongoDB
  const mongod = findMongod();
  if (!mongod) {
    log("mongo", "mongod not found. Install MongoDB or start it manually on port 27017.");
    log("mongo", "Continuing anyway - backend will fail if MongoDB isn't running.");
  } else {
    // Check if already running
    const mongoRunning = await waitForPort(27017, 1000);
    if (mongoRunning) {
      log("mongo", "Already running on port 27017");
    } else {
      const dataDir = path.join(process.env.USERPROFILE || "/tmp", "mongodb", "data");
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      log("mongo", "Starting MongoDB...");
      startProcess("mongo", mongod, ["--dbpath", dataDir, "--port", "27017"], ROOT);
      const ok = await waitForPort(27017);
      if (ok) log("mongo", "Ready on port 27017");
      else { log("mongo", "Failed to start"); process.exit(1); }
    }
  }

  // 2. Backend
  log("backend", "Starting...");
  startProcess("backend", "npm", ["run", "dev"], BACKEND);
  const backendOk = await waitForPort(8000);
  if (backendOk) log("backend", "Ready on http://localhost:8000");
  else { log("backend", "Failed to start on port 8000"); process.exit(1); }

  // 3. Frontend
  log("frontend", "Starting...");
  startProcess("frontend", "npm", ["run", "dev"], FRONTEND);
  const frontendOk = await waitForPort(5173);
  if (frontendOk) log("frontend", "Ready on http://localhost:5173");
  else { log("frontend", "Failed to start on port 5173"); process.exit(1); }

  console.log("\n\x1b[32m" + "=".repeat(50));
  console.log("  CareerPulse is running!");
  console.log("=".repeat(50) + "\x1b[0m");
  console.log(`  Frontend:  http://localhost:5173`);
  console.log(`  Backend:   http://localhost:8000`);
  console.log(`  MongoDB:   localhost:27017`);
  console.log(`\n  Press Ctrl+C to stop all services\n`);
}

// ── Stop ──

function stopAll() {
  console.log("\nShutting down...");
  procs.forEach(({ name, proc }) => {
    log(name, "Stopping...");
    proc.kill();
  });
  process.exit(0);
}

process.on("SIGINT", stopAll);
process.on("SIGTERM", stopAll);

// ── Main ──

(async () => {
  if (args.includes("--install")) {
    install();
  } else if (args.includes("--stop")) {
    log("info", "Use Ctrl+C to stop running services, or close the terminal.");
  } else {
    if (!fs.existsSync(path.join(BACKEND, "node_modules"))) {
      log("info", "Dependencies not installed. Running install first...");
      install();
    }
    await start();
  }
})();
