// ─────────────────────────────────────────────────────────────
// CazaPAL desktop shell (Electron).
//
// Responsibilities:
//   1. First run: show a small settings window to paste the free Gemini key.
//      The key is stored ONLY on this machine (userData/config.json), never in
//      the .exe.
//   2. Launch the packaged Next.js standalone server as a child process, with
//      the key + Vinted access injected as environment variables.
//   3. Open the app window pointing at that local server.
//
// Packaged layout (electron-builder extraResources):
//   <resources>/app/server.js        ← Next standalone server
//   <resources>/app/.next/static/…   ← static assets
//   <resources>/app/public/…         ← public assets
// ─────────────────────────────────────────────────────────────

const { app, BrowserWindow, ipcMain, Menu, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const net = require("node:net");
const http = require("node:http");
const { spawn } = require("node:child_process");

let mainWindow = null;
let settingsWindow = null;
let serverProc = null;
let serverPort = 0;

const CONFIG_PATH = () => path.join(app.getPath("userData"), "config.json");
const CACHE_PATH = () => path.join(app.getPath("userData"), "cache.json");

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH(), "utf8"));
  } catch {
    return { geminiKey: "", enableVinted: true };
  }
}
function writeConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH(), JSON.stringify(cfg, null, 2), "utf8");
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
  });
}

function waitForServer(port, timeoutMs = 20000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const req = http.get(
        { host: "127.0.0.1", port, path: "/", timeout: 1500 },
        (res) => {
          res.destroy();
          resolve();
        }
      );
      req.on("error", () => {
        if (Date.now() - start > timeoutMs) reject(new Error("server timeout"));
        else setTimeout(tryOnce, 400);
      });
      req.on("timeout", () => req.destroy());
    };
    tryOnce();
  });
}

async function startServer(cfg) {
  serverPort = await getFreePort();
  const appDir = path.join(process.resourcesPath, "app");
  const serverJs = path.join(appDir, "server.js");

  // Run the Next standalone server using Electron's bundled Node.
  serverProc = spawn(process.execPath, [serverJs], {
    cwd: appDir,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      PORT: String(serverPort),
      HOSTNAME: "127.0.0.1",
      GEMINI_API_KEY: cfg.geminiKey || "",
      ENABLE_VINTED: cfg.enableVinted === false ? "false" : "true",
      CAZAPAL_DB_PATH: CACHE_PATH(),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  serverProc.stdout.on("data", (d) => console.log("[next]", d.toString()));
  serverProc.stderr.on("data", (d) => console.error("[next]", d.toString()));
  serverProc.on("exit", (code) => {
    console.error("Next server exited with code", code);
  });

  await waitForServer(serverPort);
  return `http://127.0.0.1:${serverPort}`;
}

function createMainWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 860,
    minWidth: 380,
    title: "CazaPAL",
    backgroundColor: "#fafaf9",
    webPreferences: { contextIsolation: true },
  });
  mainWindow.loadURL(url);
  // Open external links (the actual Vinted listings) in the system browser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.on("closed", () => (mainWindow = null));
}

function openSettings(initial) {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }
  settingsWindow = new BrowserWindow({
    width: 520,
    height: 460,
    resizable: false,
    title: "CazaPAL — Ajustes",
    backgroundColor: "#fafaf9",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    },
  });
  settingsWindow.setMenuBarVisibility(false);
  settingsWindow.loadFile(path.join(__dirname, "settings.html"));
  settingsWindow.on("closed", () => {
    settingsWindow = null;
    // If the user closed settings without ever configuring a key and nothing
    // is running, quit rather than leave a headless process.
    if (!mainWindow && !serverProc) app.quit();
  });
}

async function boot() {
  const cfg = readConfig();
  if (!app.isPackaged) {
    // Dev: assume `npm run dev` is running; just open the window.
    createMainWindow("http://localhost:3000");
    return;
  }
  if (!cfg.geminiKey) {
    openSettings(cfg);
    return;
  }
  try {
    const url = await startServer(cfg);
    createMainWindow(url);
  } catch (e) {
    console.error(e);
    openSettings(cfg);
  }
}

// ── IPC from the settings window ───────────────────────────────
ipcMain.handle("cazapal:get-config", () => {
  const cfg = readConfig();
  return { hasKey: !!cfg.geminiKey, enableVinted: cfg.enableVinted !== false };
});

ipcMain.handle("cazapal:save-config", async (_e, payload) => {
  const cfg = readConfig();
  // Only overwrite the stored key when a new one is typed (blank = keep it).
  if ((payload?.geminiKey || "").trim()) cfg.geminiKey = payload.geminiKey.trim();
  cfg.enableVinted = payload?.enableVinted !== false;
  writeConfig(cfg);

  const running = !!serverProc;
  if (settingsWindow) settingsWindow.close();

  if (!running) {
    try {
      const url = await startServer(cfg);
      createMainWindow(url);
    } catch (e) {
      console.error(e);
    }
  } else {
    // Key changed while running: restart the app so the server picks it up.
    app.relaunch();
    app.exit(0);
  }
  return { ok: true };
});

function buildMenu() {
  const template = [
    {
      label: "CazaPAL",
      submenu: [
        {
          label: "Ajustes (clave de Gemini)…",
          click: () => openSettings(readConfig()),
        },
        { type: "separator" },
        { role: "reload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "quit", label: "Salir" },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  buildMenu();
  boot();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) boot();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (serverProc) {
    try {
      serverProc.kill();
    } catch {
      /* ignore */
    }
  }
});
