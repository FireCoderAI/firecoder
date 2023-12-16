import path from "node:path";
import fs from "node:fs";
import { Readable } from "stream";
import { finished } from "stream/promises";
import { ReadableStream } from "node:stream/web";

export const getServerUrl = async (os: string) => {
  if (os === "win32") {
    return "https://pub-ad9e0b7360bc4259878d0f81b89c5405.r2.dev/server.exe";
  }
  if (os === "linux") {
    return "https://pub-ad9e0b7360bc4259878d0f81b89c5405.r2.dev/server";
  }

  if (os === "darwin") {
    return null;
  }

  return null;
};

export const getModelUrl = async () => {
  return "https://pub-ad9e0b7360bc4259878d0f81b89c5405.r2.dev/deepseek-coder-1.3b-base.Q8_0.gguf";
};

export const downloadServer = async (extensionPath: string) => {
  const os = process.platform;

  const serverUrl = await getServerUrl(os);
  if (serverUrl === null) {
    return;
  }

  const serverPath = path.join(
    extensionPath,
    "server" + (os === "win32" ? ".exe" : "")
  );
  const response = await fetch(serverUrl);

  const fileStream = fs.createWriteStream(serverPath, { flags: "wx" });
  await finished(
    Readable.fromWeb(response.body as ReadableStream<any>).pipe(fileStream)
  );
};

export const downloadModel = async (extensionPath: string) => {
  const modelUrl = await getModelUrl();
  if (modelUrl === null) {
    return;
  }

  const modelPath = path.join(extensionPath, "model.gguf");
  const response = await fetch(modelUrl);

  const fileStream = fs.createWriteStream(modelPath, { flags: "wx" });
  await finished(
    Readable.fromWeb(response.body as ReadableStream<any>).pipe(fileStream)
  );
};
