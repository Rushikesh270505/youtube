const { app, BrowserWindow, Menu, dialog, nativeImage } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const APP_NAME = "Crypto Live Analysis";
const SERVER_HOST = "127.0.0.1";
const SERVER_PORT = 4173;
const SERVER_URL = `http://${SERVER_HOST}:${SERVER_PORT}`;
const HEALTH_URL = `${SERVER_URL}/api/health`;
const BACKEND_READY_TIMEOUT_MS = 45000;
const BACKEND_POLL_INTERVAL_MS = 500;

let mainWindow = null;
let backendProcess = null;
let backendOwned = false;

function repoRoot() {
  return path.resolve(__dirname, "..");
}

function appResourceRoot() {
  return app.isPackaged ? path.join(process.resourcesPath, "app-resources") : repoRoot();
}

function appIconPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "app-resources", "assets", "logo.png")
    : path.join(repoRoot(), "assets", "logo.png");
}

function backendExecutablePath() {
  return path.join(process.resourcesPath, "backend", "crypto-live-analysis-backend");
}

function backendCommand() {
  return app.isPackaged ? backendExecutablePath() : "python3";
}

function backendArgs() {
  return app.isPackaged ? [] : ["server.py"];
}

function logFilePath() {
  return path.join(app.getPath("userData"), "backend.log");
}

function appendBackendLog(line) {
  try {
    fs.mkdirSync(path.dirname(logFilePath()), { recursive: true });
    fs.appendFileSync(logFilePath(), `${new Date().toISOString()} ${line}\n`);
  } catch (error) {
    console.error("Failed to write backend log", error);
  }
}

function probeHealth(timeoutMs = 1500) {
  return new Promise((resolve) => {
    const request = http.get(HEALTH_URL, { timeout: timeoutMs }, (response) => {
      response.resume();
      resolve(response.statusCode === 200);
    });
    request.on("error", () => resolve(false));
    request.on("timeout", () => {
      request.destroy();
      resolve(false);
    });
  });
}

async function waitForBackendReady() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < BACKEND_READY_TIMEOUT_MS) {
    if (await probeHealth()) {
      return true;
    }
    if (backendOwned && backendProcess && backendProcess.exitCode !== null) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, BACKEND_POLL_INTERVAL_MS));
  }
  return false;
}

async function ensureBackendRunning() {
  if (await probeHealth()) {
    return true;
  }

  const child = spawn(backendCommand(), backendArgs(), {
    cwd: appResourceRoot(),
    env: {
      ...process.env,
      CRYPTO_LIVE_APP_RESOURCES: appResourceRoot(),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  backendProcess = child;
  backendOwned = true;

  child.stdout.on("data", (chunk) => appendBackendLog(`[stdout] ${String(chunk).trimEnd()}`));
  child.stderr.on("data", (chunk) => appendBackendLog(`[stderr] ${String(chunk).trimEnd()}`));
  child.on("exit", (code, signal) => {
    appendBackendLog(`[exit] code=${code ?? "null"} signal=${signal ?? "null"}`);
  });
  child.on("error", (error) => {
    appendBackendLog(`[error] ${error.message}`);
  });

  return waitForBackendReady();
}

function stopBackend() {
  if (!backendOwned || !backendProcess || backendProcess.exitCode !== null) {
    return;
  }
  backendProcess.kill("SIGTERM");
  setTimeout(() => {
    if (backendProcess && backendProcess.exitCode === null) {
      backendProcess.kill("SIGKILL");
    }
  }, 2000).unref();
}

function createMainWindow() {
  const icon = nativeImage.createFromPath(appIconPath());
  mainWindow = new BrowserWindow({
    title: APP_NAME,
    width: 1600,
    height: 980,
    minWidth: 1280,
    minHeight: 720,
    backgroundColor: "#030812",
    autoHideMenuBar: true,
    show: false,
    icon: icon.isEmpty() ? undefined : icon,
    webPreferences: {
      contextIsolation: true,
      sandbox: false,
      devTools: true,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.loadURL(SERVER_URL);
}

async function bootApplication() {
  Menu.setApplicationMenu(null);

  if (process.platform === "darwin") {
    const dockIcon = nativeImage.createFromPath(appIconPath());
    if (!dockIcon.isEmpty()) {
      app.dock.setIcon(dockIcon);
    }
  }

  const backendReady = await ensureBackendRunning();
  if (!backendReady) {
    dialog.showErrorBox(
      APP_NAME,
      `The local overlay server could not start.\n\nCheck the log at:\n${logFilePath()}`,
    );
    app.quit();
    return;
  }

  createMainWindow();
}

app.whenReady().then(bootApplication);

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

app.on("before-quit", () => {
  stopBackend();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
