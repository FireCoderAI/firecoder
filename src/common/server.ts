import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { downloadModel, downloadServer } from "../download";
import Logger from "./logger";
import statusBar from "./statusBar";

let server: ChildProcessWithoutNullStreams | null;

export const startServer = async () => {
  const { stopTask } = statusBar.startTask();
  const serverPath = await downloadServer();
  const modelPath = await downloadModel();

  if (!serverPath || !modelPath) {
    return null;
  }

  server = spawn(
    serverPath,
    [
      `--model`,
      modelPath,
      "--port",
      "39129",
      "--parallel",
      "4",
      "--threads",
      "8",
      "--threads-batch",
      "8",
      "--ctx-size",
      "4096",
    ],
    {
      detached: false,
    }
  );

  server.stdout.on("data", function (msg) {
    Logger.trace(msg, "llama");
  });
  server.stderr.on("data", function (msg) {
    Logger.trace(msg, "llama");
  });
  server.on("error", (err) => {
    Logger.trace(`error: ${err.message}`, "llama");
    Logger.trace(`name: ${err.name}`, "llama");
    Logger.trace(`stack: ${err.stack}`, "llama");
    Logger.trace(`cause: ${err.cause}`, "llama");
  });
  server.on("close", (code) => {
    Logger.trace(`child process exited with code ${code}`, "llama");
  });
  stopTask();
};

export const stopServer = async () => {
  if (server) {
    const result = server.kill(9);
    if (result === false) {
      Logger.error("Server is not running or is not responding");
    }
  }
};
