import * as vscode from "vscode";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { downloadModel, downloadServer } from "../download";
import Logger from "../logger";
import statusBar from "../statusBar";

const models = {
  "base-small": {
    port: 39720,
  },
  "base-medium": {
    port: 39721,
  },
  "base-large": {
    port: 39722,
  },
  "chat-small": {
    port: 39725,
  },
  "chat-medium": {
    port: 39726,
  },
  "chat-large": {
    port: 39727,
  },
};

export type TypeModel = keyof typeof models;

class Server {
  private serverProcess: ChildProcessWithoutNullStreams | null = null;
  private typeModel: TypeModel = "base-small";
  public status: "started" | "stopped" = "stopped";
  private stopServerStatusInterval: (() => void) | null = null;

  constructor(typeModel: TypeModel) {
    this.typeModel = typeModel;
  }

  get serverUrl() {
    return `http://localhost:${models[this.typeModel].port}`;
  }

  public async startServer() {
    const serverIsStarted = await this.checkServerStatus();
    if (serverIsStarted) {
      Logger.info("Server is started already.");
      return true;
    }

    const { stopTask } = statusBar.startTask();
    const serverPath = await downloadServer();
    const modelPath = await downloadModel();

    if (!serverPath || !modelPath) {
      Logger.error("Server is not started.");
      vscode.window.showErrorMessage(`Server is not started.`);
      stopTask();
      return false;
    }
    const port = models[this.typeModel].port;
    this.serverProcess = spawn(
      serverPath,
      [
        `--model`,
        modelPath,
        "--port",
        String(port),
        "--parallel",
        "4",
        "--ctx-size",
        "4096",
        "--cont-batching",
        "--embedding",
        "--mlock",
      ],
      {
        detached: false,
      }
    );

    this.serverProcess.stdout.on("data", function (msg) {
      Logger.trace(msg, "llama");
    });
    this.serverProcess.stderr.on("data", function (msg) {
      Logger.trace(msg, "llama");
    });
    this.serverProcess.on("error", (err) => {
      Logger.trace(`error: ${err.message}`, "llama");
      Logger.trace(`name: ${err.name}`, "llama");
      Logger.trace(`stack: ${err.stack}`, "llama");
      Logger.trace(`cause: ${err.cause}`, "llama");
    });
    this.serverProcess.on("close", (code) => {
      Logger.trace(`child process exited with code ${code}`, "llama");
    });
    const isServerStarted = await this.checkServerStatusIntervalWithTimeout(
      5000
    );

    if (!isServerStarted) {
      Logger.error("Server is not started.");
      vscode.window.showErrorMessage(`Server is not started.`);
      stopTask();
      return false;
    }

    stopTask();

    this.stopServerStatusInterval = this.checkServerStatusInterval();
    return true;
  }

  public async stopServer() {
    if (this.serverProcess) {
      const result = this.serverProcess.kill(9);
      if (result === false) {
        Logger.error("Server is not running or is not responding");
      }
      this.stopServerStatusInterval?.();
    }
  }

  public async checkServerStatus() {
    try {
      const res = await fetch(`${this.serverUrl}/model.json`, {
        method: "GET",
      });
      if (res.ok) {
        this.status = "started";
        return true;
      } else {
        this.status = "stopped";
        return false;
      }
    } catch (error) {
      this.status = "stopped";
      return false;
    }
  }

  private checkServerStatusInterval() {
    const interval = setInterval(async () => {
      const status = await this.checkServerStatus();
      if (status === false) {
        Logger.error("Server is not responding. Try to restart it.");
        const removeError = statusBar.setError(
          "Server is not responding. Try to restart it."
        );
        clearInterval(interval);
        (async () => {
          const selection = await vscode.window.showErrorMessage(
            `Server is not responding. Try to restart it.`,
            "Restart server"
          );
          if (selection === "Restart server") {
            removeError?.();
            await this.startServer();
          }
        })();
      }
    }, 500);

    return () => {
      clearInterval(interval);
    };
  }
  private async checkServerStatusIntervalWithTimeout(timeout: number) {
    return new Promise<boolean>(async (resolve) => {
      const statusFirstTrying = await this.checkServerStatus();
      if (statusFirstTrying) {
        resolve(true);
        return true;
      }

      const interval = setInterval(async () => {
        const status = await this.checkServerStatus();
        if (status) {
          clearInterval(interval);
          resolve(true);
        }
      }, 200);

      setTimeout(() => {
        clearInterval(interval);
        resolve(false);
      }, timeout);
    });
  }
}

export const servers = {
  "base-small": new Server("base-small"),
  "base-medium": new Server("base-medium"),
  "base-large": new Server("base-large"),
  "chat-small": new Server("chat-small"),
  "chat-medium": new Server("chat-medium"),
  "chat-large": new Server("chat-large"),
};
