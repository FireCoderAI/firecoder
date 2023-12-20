import path from "node:path";
import fs from "node:fs";
import fsPromise from "node:fs/promises";
import crypto from "node:crypto";
import { Readable, Transform } from "node:stream";
import { finished } from "node:stream/promises";
import { ReadableStream } from "node:stream/web";
import { homedir } from "node:os";
import { createProgress } from "../common/utils/progress";

const checkFileOrFolderExists = async (pathToCheck: string) => {
  try {
    await fsPromise.access(pathToCheck, fs.constants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
};

const getSaveFolder = async () => {
  const pathSaveFolder = path.join(homedir(), ".firecoder");

  const folderIsExist = await checkFileOrFolderExists(pathSaveFolder);

  if (folderIsExist === false) {
    await fsPromise.mkdir(pathSaveFolder);
  }

  return pathSaveFolder;
};

const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) {
    return "0 Bytes";
  }

  const k = 1000;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TiB", "PiB", "EiB", "ZiB", "YiB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const downloadFile = async (
  url: string,
  path: string,
  title: string,
  titleProgress: (downloaded: string, total: string) => string
) => {
  const progress = createProgress("FireCoder", title);

  const response = await fetch(url);
  const size = Number(response.headers.get("content-length"));

  let receivedLength = 0;

  const fileStream = fs.createWriteStream(path, { flags: "wx" });
  const progressStream = new Transform({
    transform(chunk, encoding, callback) {
      receivedLength += chunk.length;
      progress.setMessage(
        titleProgress(formatBytes(receivedLength), formatBytes(size))
      );
      const progressValue = (chunk.length / size) * 100;
      progress.increaseProgress(progressValue);
      callback(null, chunk);
    },
  });

  await finished(
    Readable.fromWeb(response.body as ReadableStream<any>)
      .pipe(progressStream)
      .pipe(fileStream)
  );

  progress.finishProgress();
};

export const getCheckSum = async (path: string) => {
  const file = await fsPromise.readFile(path);

  const hash = crypto.createHash("sha256").update(file).digest("hex");

  return hash;
};

export const getServerUrl = async (
  os: NodeJS.Platform
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

export const downloadServer = async () => {
  const os = process.platform;

  const pathToSave = await getSaveFolder();

  const serverPath = path.join(
    pathToSave,
    "server" + (os === "win32" ? ".exe" : "")
  );

  const serverFileInfo = await getServerUrl(os);

  if (serverFileInfo === null) {
    // TODO: throw error
    return;
  }

  const isExists = await checkFileOrFolderExists(serverPath);
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

  await downloadFile(
    serverFileInfo.url,
    serverPath,
    "Downloading server",
    (downloaded, total) => `Downloading server: ${downloaded} / ${total}`
  );

  await fsPromise.chmod(serverPath, 0o755);
  return serverPath;
};

export const downloadModel = async () => {
  const pathToSave = await getSaveFolder();

  const modelPath = path.join(pathToSave, "model.gguf");

  const modelFileInfo = await getModelUrl();

  if (modelFileInfo === null) {
    // TODO: throw error
    return;
  }

  const isExists = await checkFileOrFolderExists(modelPath);

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

  await downloadFile(
    modelFileInfo.url,
    modelPath,
    "Downloading model",
    (downloaded, total) => `Downloading model: ${downloaded} / ${total}`
  );

  return modelPath;
};
