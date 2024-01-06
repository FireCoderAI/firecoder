import path from "node:path";
import fs from "node:fs";
import fsPromise from "node:fs/promises";
import * as os from "node:os";
import { Readable, Transform } from "node:stream";
import { finished } from "node:stream/promises";
import { ReadableStream } from "node:stream/web";
import { createProgress } from "../utils/progress";
import { formatBytes } from "../utils/formatBytes";
import { checkFileOrFolderExists, getChecksum, getSaveFolder } from "./utils";

interface ResourceInfo {
  url: string;
  checksum: string;
}

interface Spec {
  linux: {
    "x86-64": {
      cpu: ResourceInfo;
      cublas: ResourceInfo;
    };
  };
  win32: {
    "x86-64": {
      cpu: ResourceInfo;
      cublas: ResourceInfo;
    };
  };
  darwin: {
    "x86-64": {
      cpu: ResourceInfo;
      metal: ResourceInfo;
    };
  };
}

const downloadFileWithProgress = async (
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

const getServerInfo = async (): Promise<ResourceInfo | null> => {
  const osplatform = os.platform();
  const osmachine = os.machine();

  const response = await fetch(
    "https://pub-ad9e0b7360bc4259878d0f81b89c5405.r2.dev/spec.json"
  );

  if (!response.ok) {
    return null;
  }

  const spec = (await response.json()) as Spec;

  if (osplatform === "win32") {
    if (osmachine === "x86_64") {
      return spec["win32"]["x86-64"]["cpu"];
    }
  }
  if (osplatform === "linux") {
    if (osmachine === "x86_64") {
      return spec["linux"]["x86-64"]["cpu"];
    }
  }

  if (osplatform === "darwin") {
    if (osmachine === "x86_64") {
      return spec["darwin"]["x86-64"]["cpu"];
    }
  }

  return null;
};

const getModelInfo = async (): Promise<ResourceInfo | null> => {
  // TODO: get latest version
  return {
    url: "https://pub-ad9e0b7360bc4259878d0f81b89c5405.r2.dev/deepseek-coder-1.3b-base.Q8_0.gguf",
    checksum:
      "9fcdcb283ef5b1d80ec7365b307c1ceab0c0f8ea079b49969f7febc06a11bccd",
  };
};

export const downloadServer = async () => {
  const osplatform = os.platform();

  const pathToSave = await getSaveFolder();

  const serverPath = path.join(
    pathToSave,
    "server" + (osplatform === "win32" ? ".exe" : "")
  );

  const serverFileInfo = await getServerInfo();

  if (serverFileInfo === null) {
    // TODO: throw error
    return;
  }

  const isExists = await checkFileOrFolderExists(serverPath);
  if (isExists) {
    const checksum = await getChecksum(serverPath);

    if (checksum === serverFileInfo.checksum) {
      return serverPath;
    }

    console.log("Checksum server mismatch");
  }

  if (isExists) {
    await fsPromise.unlink(serverPath);
  }

  await downloadFileWithProgress(
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

  const modelFileInfo = await getModelInfo();

  if (modelFileInfo === null) {
    // TODO: throw error
    return;
  }

  const isExists = await checkFileOrFolderExists(modelPath);

  if (isExists) {
    const checksum = await getChecksum(modelPath);

    if (checksum === modelFileInfo.checksum) {
      return modelPath;
    }
    console.log("Checksum model mismatch");
  }

  if (isExists) {
    await fsPromise.unlink(modelPath);
  }

  await downloadFileWithProgress(
    modelFileInfo.url,
    modelPath,
    "Downloading model",
    (downloaded, total) => `Downloading model: ${downloaded} / ${total}`
  );

  return modelPath;
};
