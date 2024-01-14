import * as vscode from "vscode";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { downloadModel, downloadServer } from "../download";
import Logger from "../logger";
import statusBar from "../statusBar";
import { TelemetrySenderInstance } from "../telemetry";

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
    let serverPath: string | undefined, modelPath: string | undefined;
    try {
      serverPath = await downloadServer();
      modelPath = await downloadModel();
    } catch (error) {
      TelemetrySenderInstance.sendErrorData(error as Error, {
        step: "Error while downloading server or model",
      });
      stopTask();
      throw error;
    }

    if (!serverPath || !modelPath) {
      Logger.error("Server is not started. Don't have server or model path.");
      TelemetrySenderInstance.sendEventData(
        "Server is not started. Don't have server or model path."
      );
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
        "--log-disable",
      ],
      {
        detached: false,
      }
    );

    // TODO: rewrite this
    this.serverProcess.stdout.on("data", function (msg) {
      try {
        const msgString = msg.toString();
        // TODO: split it by new line and send each line
        if (
          msgString.includes('"path":"/health"') ||
          msgString.includes('"path":"/tokenize"') ||
          msgString.includes("sampled token:")
        ) {
          return;
        }
        TelemetrySenderInstance.sendLogText(msgString);
        Logger.trace(msgString, "llama");
      } catch (error) {
        TelemetrySenderInstance.sendErrorData(error as Error);
      }
    });
    this.serverProcess.stderr.on("data", function (msg) {
      try {
        const msgString = msg.toString();
        if (
          msgString.includes('"path":"/health"') ||
          msgString.includes('"path":"/tokenize"') ||
          msgString.includes("sampled token:")
        ) {
          return;
        }
        TelemetrySenderInstance.sendErrorData(new Error(msgString));
        Logger.error(msgString, "llama");
      } catch (error) {
        TelemetrySenderInstance.sendErrorData(error as Error);
      }
    });
    this.serverProcess.on("error", (err) => {
      Logger.error(`error: ${err.message}`, "llama");
      Logger.error(`name: ${err.name}`, "llama");
      Logger.error(`stack: ${err.stack}`, "llama");
      Logger.error(`cause: ${err.cause}`, "llama");
    });
    this.serverProcess.on("close", (code) => {
      TelemetrySenderInstance.sendLogText(`Server is closed with code ${code}`);
      Logger.trace(`child process exited with code ${code}`, "llama");
    });
    const isServerStarted = await this.checkServerStatusIntervalWithTimeout(
      5000
    );

    if (!isServerStarted) {
      Logger.error("Server is not started.");
      vscode.window.showErrorMessage(`Server is not started.`);
      stopTask();
      throw new Error("Server is not started.");
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
      const res = await fetch(`${this.serverUrl}/health`, {
        method: "GET",
      });
      if (res.ok) {
        const resJson = (await res.json()) as { status: string };
        if (resJson.status === "ok") {
          this.status = "started";
          return true;
        }
      }
      this.status = "stopped";
      return false;
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
