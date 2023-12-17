import path from "node:path";
import fs from "node:fs";
import fsPromise from "node:fs/promises";
import crypto from "node:crypto";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";
import { ReadableStream } from "node:stream/web";

const checkFileExists = async (path: string) => {
  try {
    await fsPromise.access(path, fs.constants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
};

export const getCheckSum = async (path: string) => {
  const file = await fsPromise.readFile(path);

  const hash = crypto.createHash("sha256").update(file).digest("hex");

  return hash;
};

export const getServerUrl = async (
  os: string
): Promise<{
  url: string;
  checksum: string;
} | null> => {
  // TODO: get latest version
  if (os === "win32") {
    return {
      url: "https://pub-ad9e0b7360bc4259878d0f81b89c5405.r2.dev/server.exe",
      checksum:
        "0a4c8e50c56f7a7c9d267e3e5f44115685e46e4a5f50456e6b28a23dbb46dcce",
    };
  }
  if (os === "linux") {
    return {
      url: "https://pub-ad9e0b7360bc4259878d0f81b89c5405.r2.dev/server",
      checksum:
        "2d242c88534a53f8576bf06f9afe23a2211d9a9424f6ef860047cb36d0db0956",
    };
  }

  if (os === "darwin") {
    return null;
  }

  return null;
};

export const getModelUrl = async (): Promise<{
  url: string;
  checksum: string;
} | null> => {
  // TODO: get latest version
  return {
    url: "https://pub-ad9e0b7360bc4259878d0f81b89c5405.r2.dev/deepseek-coder-1.3b-base.Q8_0.gguf",
    checksum:
      "9fcdcb283ef5b1d80ec7365b307c1ceab0c0f8ea079b49969f7febc06a11bccd",
  };
};

export const downloadServer = async (extensionPath: string) => {
  console.log("Use default server");

  const os = process.platform;

  const serverPath = path.join(
    extensionPath,
    "server" + (os === "win32" ? ".exe" : "")
  );

  const serverFileInfo = await getServerUrl(os);

  if (serverFileInfo === null) {
    // TODO: throw error
    return;
  }

  const isExists = await checkFileExists(serverPath);
  if (isExists) {
    const checkSum = await getCheckSum(serverPath);

    if (checkSum === serverFileInfo.checksum) {
      return serverPath;
    }

    console.log("Checksum server mismatch");
  }

  if (isExists) {
    await fsPromise.unlink(serverPath);
  }

  const response = await fetch(serverFileInfo.url);

  const fileStream = fs.createWriteStream(serverPath, { flags: "wx" });
  await finished(
    Readable.fromWeb(response.body as ReadableStream<any>).pipe(fileStream)
  );

  await fsPromise.chmod(serverPath, 0o755);

  return serverPath;
};

export const downloadModel = async (extensionPath: string) => {
  console.log("Use default model");

  const modelPath = path.join(extensionPath, "model.gguf");

  const modelFileInfo = await getModelUrl();

  if (modelFileInfo === null) {
    // TODO: throw error
    return;
  }

  const isExists = await checkFileExists(modelPath);

  if (isExists) {
    const checkSum = await getCheckSum(modelPath);

    if (checkSum === modelFileInfo.checksum) {
      return modelPath;
    }
    console.log("Checksum model mismatch");
  }

  if (isExists) {
    await fsPromise.unlink(modelPath);
  }

  const response = await fetch(modelFileInfo.url);

  const fileStream = fs.createWriteStream(modelPath, { flags: "wx" });
  await finished(
    Readable.fromWeb(response.body as ReadableStream<any>).pipe(fileStream)
  );

  return modelPath;
};