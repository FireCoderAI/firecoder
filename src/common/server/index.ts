import * as vscode from "vscode";
import * as os from "node:os";
import { ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { downloadModel, downloadServer } from "../download";
import Logger from "../logger";
import statusBar from "../statusBar";
import { FirecoderTelemetrySenderInstance } from "../telemetry";
import { configuration } from "../utils/configuration";

const modelsBase = {
  "base-small": {
    port: 39720,
  },
  "base-medium": {
    port: 39721,
  },
  "base-large": {
    port: 39722,
  },
};
export type TypeModelsBase = keyof typeof modelsBase;

const modelsChat = {
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

export type TypeModelsChat = keyof typeof modelsChat;

const models = {
  ...modelsBase,
  ...modelsChat,
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
    const osplatform = os.platform();
    const osmachine = os.machine();
    const isMacArm64 = osplatform === "darwin" && osmachine === "arm64";

    const serverIsStarted = await this.checkServerStatus();
    if (serverIsStarted) {
      Logger.info("Server is started already.", {
        component: "server",
        sendTelemetry: true,
      });
      return true;
    }

    const { stopTask } = statusBar.startTask();

    let serverPath: string | undefined, modelPath: string | undefined;

    try {
      serverPath = await downloadServer();
      modelPath = await downloadModel(this.typeModel);
    } catch (error) {
      Logger.error(String(error), {
        component: "server",
        sendTelemetry: true,
      });
      FirecoderTelemetrySenderInstance.sendErrorData(error as Error, {
        step: `Error while downloading server or model ${this.typeModel}`,
      });
      stopTask();
      throw error;
    }

    if (!serverPath || !modelPath) {
      Logger.error(
        `Server ${this.typeModel} is not started. Don't have server or model path.`,
        {
          component: "server",
          sendTelemetry: true,
        }
      );

      stopTask();
      return false;
    }

    Logger.info("Server is ready to start.", {
      component: "server",
      sendTelemetry: true,
    });
    const isChatModel = this.typeModel in modelsChat;
    const isBaseModel = this.typeModel in modelsBase;

    const gpuEnabled =
      configuration.get("experimental.useGpu.linux.nvidia") ||
      configuration.get("experimental.useGpu.osx.metal") ||
      configuration.get("experimental.useGpu.windows.nvidia");

    const useGPUChat =
      configuration.get("experimental.chat.useGpu") && isChatModel;

    const useGPUCompletionAuto =
      configuration.get("completion.autoMode.useGpu") &&
      this.typeModel === configuration.get("completion.autoMode");

    const useGPUCompletionManual =
      configuration.get("completion.manualMode.useGpu") &&
      this.typeModel === configuration.get("completion.manualMode");

    const useGpu =
      gpuEnabled &&
      (useGPUCompletionAuto || useGPUCompletionManual || useGPUChat);

    const port = models[this.typeModel].port;

    this.serverProcess = spawn(
      serverPath,
      [
        `--model`,
        modelPath,
        "--port",
        String(port),
        ...(isChatModel ? ["--ctx-size", "16384"] : ["--ctx-size", "4096"]),
        ...(isBaseModel ? ["--parallel", "4"] : []),
        ...(isMacArm64 ? ["--nobrowser"] : []),
        ...(useGpu ? ["--n-gpu-layers", "100"] : []),
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
          msgString.includes("/model.json") ||
          msgString.includes("sampled token:")
        ) {
          return;
        }
        Logger.trace(msgString, { component: "llama", sendTelemetry: true });
      } catch (error) {
        FirecoderTelemetrySenderInstance.sendErrorData(error as Error);
      }
    });
    this.serverProcess.stderr.on("data", function (msg) {
      try {
        const msgString = msg.toString();
        if (
          msgString.includes('"path":"/health"') ||
          msgString.includes('"path":"/tokenize"') ||
          msgString.includes("/model.json") ||
          msgString.includes("sampled token:")
        ) {
          return;
        }
        Logger.trace(msgString, { component: "llama", sendTelemetry: true });
      } catch (error) {
        FirecoderTelemetrySenderInstance.sendErrorData(error as Error);
      }
    });
    this.serverProcess.on("error", (err) => {
      Logger.error(
        `error: ${err.message}; name: ${err.name}; stack: ${err.stack}; cause: ${err.cause}`,
        {
          component: "llama",
          sendTelemetry: true,
        }
      );
    });
    this.serverProcess.on("message", (message) => {
      Logger.error(String(message), {
        component: "llama",
        sendTelemetry: true,
      });
    });
    this.serverProcess.on("close", (code) => {
      Logger.trace(`child process exited with code ${code}`, {
        component: "llama",
      });
    });

    const isServerStarted = await this.checkServerStatusIntervalWithTimeout(
      10000
    );

    if (!isServerStarted) {
      Logger.error("Server is not started.", {
        component: "server",
        sendTelemetry: true,
      });

      vscode.window.showErrorMessage(`Server is not started.`);
      stopTask();
      return true;
    }

    stopTask();

    this.stopServerStatusInterval = this.checkServerStatusInterval();
    return true;
  }

  public async stopServer() {
    if (this.serverProcess) {
      const result = this.serverProcess.kill(9);
      if (result === false) {
        Logger.error("Server is not running or is not responding", {
          component: "server",
          sendTelemetry: true,
        });
      }
      this.stopServerStatusInterval?.();
    }
  }

  public async checkServerStatus() {
    try {
      const osplatform = os.platform();
      const osmachine = os.machine();
      const isMacArm64 = osplatform === "darwin" && osmachine === "arm64";
      const res = await fetch(
        `${this.serverUrl}/${isMacArm64 ? "model.json" : "health"}`,
        {
          method: "GET",
        }
      );
      if (res.ok) {
        if (isMacArm64) {
          this.status = "started";
          return true;
        }
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
