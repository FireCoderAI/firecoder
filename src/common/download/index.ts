import * as vscode from "vscode";
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
import Logger from "../logger";
import { TypeModel } from "../server";

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
    arm64: {
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

  try {
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
  } catch (error) {
    throw error;
  } finally {
    progress.finishProgress();
  }
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
      const useGPU = vscode.workspace
        .getConfiguration("firecoder")
        .get("experimental.windows.usegpu.nvidia");
      if (useGPU) {
        return spec["win32"]["x86-64"]["cublas"];
      } else {
        return spec["win32"]["x86-64"]["cpu"];
      }
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
    if (osmachine === "arm64") {
      return spec["darwin"]["arm64"]["cpu"];
    }
  }

  return null;
};

const getModelInfo = async (
  typeModel: TypeModel
): Promise<ResourceInfo | null> => {
  const models: Record<TypeModel, { url: string; checksum: string }> = {
    "base-small": {
      url: "https://huggingface.co/TheBloke/deepseek-coder-1.3b-base-GGUF/resolve/main/deepseek-coder-1.3b-base.Q8_0.gguf",
      checksum:
        "9fcdcb283ef5b1d80ec7365b307c1ceab0c0f8ea079b49969f7febc06a11bccd",
    },
    "base-medium": {
      url: "https://huggingface.co/TheBloke/deepseek-coder-6.7B-base-GGUF/resolve/main/deepseek-coder-6.7b-base.Q8_0.gguf",
      checksum:
        "a2f82242ac5e465037cbf1ed754f04f0be044ee196e1589905f9e4dcd0e6559d",
    },
    "base-large": {
      url: "https://huggingface.co/TheBloke/deepseek-coder-33B-base-GGUF/resolve/main/deepseek-coder-33b-base.Q8_0.gguf",
      checksum:
        "9b9210b7de8c26d94773146613ee86844a714aae997223355bb520927627feff",
    },
    "chat-small": {
      url: "https://huggingface.co/TheBloke/deepseek-coder-1.3b-instruct-GGUF/resolve/main/deepseek-coder-1.3b-instruct.Q8_0.gguf",
      checksum:
        "36eb025121a50ee6d37fe900659393ff8fb5ea34adc0e3c11fc635e07624dcdb",
    },
    "chat-medium": {
      url: "https://huggingface.co/TheBloke/deepseek-coder-6.7B-instruct-GGUF/resolve/main/deepseek-coder-6.7b-instruct.Q8_0.gguf",
      checksum:
        "02cd6ce7ccec670cf6d3dd147932f13e584f9e964d5a3297a74b401b658471ae",
    },
    "chat-large": {
      url: "https://huggingface.co/TheBloke/deepseek-coder-33B-instruct-GGUF/resolve/main/deepseek-coder-33b-instruct.Q8_0.gguf",
      checksum:
        "86529f8eefc87a80bd20d62229ee5acdc32d5773be8575a143bc491924865c21",
    },
  };

  return models[typeModel];
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
    throw new Error("Server file info not found");
  }

  Logger.info("Got server file info", {
    component: "download>server",
    sendTelemetry: true,
  });

  const isExists = await checkFileOrFolderExists(serverPath);
  if (isExists) {
    const checksum = await getChecksum(serverPath);

    if (checksum === serverFileInfo.checksum) {
      await fsPromise.chmod(serverPath, 0o755);
      Logger.info("Checksum server is correct, just return server path", {
        component: "download>server",
        sendTelemetry: true,
      });
      return serverPath;
    }

    Logger.info("Checksum server mismatch", {
      component: "download>server",
      sendTelemetry: true,
    });
  }

  if (isExists) {
    await fsPromise.unlink(serverPath);
  }

  Logger.info("Started download server", {
    component: "download>server",
    sendTelemetry: true,
  });

  await downloadFileWithProgress(
    serverFileInfo.url,
    serverPath,
    "Downloading server",
    (downloaded, total) => `Downloading server: ${downloaded} / ${total}`
  );

  await fsPromise.chmod(serverPath, 0o755);

  Logger.info("Finish download server", {
    component: "download>server",
    sendTelemetry: true,
  });

  return serverPath;
};

export const downloadModel = async (typeModel: TypeModel) => {
  const pathToSave = await getSaveFolder();

  const modelPath = path.join(pathToSave, "model.gguf");

  const modelFileInfo = await getModelInfo(typeModel);

  if (modelFileInfo === null) {
    throw new Error("Server file info not found");
  }

  Logger.info("Got model file info", {
    component: "download>model",
    sendTelemetry: true,
  });

  const isExists = await checkFileOrFolderExists(modelPath);

  if (isExists) {
    const checksum = await getChecksum(modelPath);

    if (checksum === modelFileInfo.checksum) {
      Logger.info("Checksum model is correct, just return model path", {
        component: "download>model",
        sendTelemetry: true,
      });
      return modelPath;
    }
    Logger.info("Checksum model mismatch", {
      component: "download>model",
      sendTelemetry: true,
    });
  }

  if (isExists) {
    await fsPromise.unlink(modelPath);
  }

  Logger.info("Started download model", {
    component: "download>model",
    sendTelemetry: true,
  });

  await downloadFileWithProgress(
    modelFileInfo.url,
    modelPath,
    "Downloading model",
    (downloaded, total) => `Downloading model: ${downloaded} / ${total}`
  );

  Logger.info("Finish download model", {
    component: "download>model",
    sendTelemetry: true,
  });

  return modelPath;
};
