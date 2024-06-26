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
import type { TypeModel } from "../server";
import { configuration } from "../utils/configuration";
import { state } from "../utils/state";

interface ResourceInfo {
  url: string;
  checksum: string;
}

export interface Spec {
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
  let spec: Spec | null = null;
  try {
    const specFile = configuration.get("server.usePreRelease")
      ? "spec-pre-release.json"
      : "spec.json";

    const response = await fetch(`https://s3.firecoder.cc/${specFile}`);

    if (!response.ok) {
      return null;
    }

    spec = (await response.json()) as Spec;
    await state.global.update("serverSpec", spec);
  } catch (error) {
    spec = state.global.get("serverSpec");
    Logger.warn(`Can not get server spec`);
  }
  if (spec === null) {
    return null;
  }

  if (osplatform === "win32") {
    if (osmachine === "x86_64") {
      const useGPUNvidia = configuration.get(
        "experimental.useGpu.windows.nvidia"
      );
      if (useGPUNvidia) {
        return spec["win32"]["x86-64"]["cublas"];
      } else {
        return spec["win32"]["x86-64"]["cpu"];
      }
    }
  }

  if (osplatform === "linux") {
    if (osmachine === "x86_64") {
      const useGPUNvidia = configuration.get(
        "experimental.useGpu.linux.nvidia"
      );
      if (useGPUNvidia) {
        return spec["linux"]["x86-64"]["cublas"];
      } else {
        return spec["linux"]["x86-64"]["cpu"];
      }
    }
  }

  if (osplatform === "darwin") {
    if (osmachine === "x86_64") {
      return spec["darwin"]["x86-64"]["cpu"];
    }
    if (osmachine === "arm64") {
      const useGPUMetal = configuration.get("experimental.useGpu.osx.metal");
      if (useGPUMetal) {
        return spec["darwin"]["arm64"]["metal"];
      } else {
        return spec["darwin"]["arm64"]["cpu"];
      }
    }
  }

  return null;
};

const getModelInfo = async (
  typeModel: TypeModel
): Promise<ResourceInfo | null> => {
  const models: Record<TypeModel, { url: string; checksum: string }> = {
    "base-small": {
      url: "https://huggingface.co/lmstudio-community/codegemma-2b-GGUF/resolve/main/codegemma-2b-Q5_K_M.gguf",
      checksum:
        "95f06d59cbf697da2fe9aa00b019c4f2e464718a956352ccbbb1cb436b98a2a7",
    },
    "base-medium": {
      url: "https://huggingface.co/lmstudio-community/codegemma-7b-GGUF/resolve/main/codegemma-7b-Q5_K_M.gguf",
      checksum:
        "eb00372705e7d5d30442750e8a7c72919c8e243bee52e1cce97fcfc1008c6143",
    },
    "chat-medium": {
      url: "https://huggingface.co/lmstudio-community/codegemma-1.1-7b-it-GGUF/resolve/main/codegemma-1.1-7b-it-Q5_K_M.gguf",
      checksum:
        "ec11bacb9e0b8c8e0f483f209c487939202b04bbf4f815f0a0945c5b256da895",
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

  Logger.info(`Got server file info ${serverFileInfo.url}`, {
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

  const modelPath = path.join(pathToSave, `model-${typeModel}.gguf`);

  const modelFileInfo = await getModelInfo(typeModel);

  if (modelFileInfo === null) {
    throw new Error("Model file info not found");
  }

  Logger.info(`Got model ${typeModel} file info`, {
    component: "download>model",
    sendTelemetry: true,
  });

  const isExists = await checkFileOrFolderExists(modelPath);

  if (isExists) {
    const checksum = await getChecksum(modelPath);

    if (checksum === modelFileInfo.checksum) {
      Logger.info(
        `Checksum model ${typeModel} is correct, just return model path`,
        {
          component: "download>model",
          sendTelemetry: true,
        }
      );
      return modelPath;
    }
    Logger.info(`Checksum model ${typeModel} mismatch`, {
      component: "download>model",
      sendTelemetry: true,
    });
  }

  if (isExists) {
    await fsPromise.unlink(modelPath);
  }

  Logger.info(`Started download model ${typeModel}`, {
    component: "download>model",
    sendTelemetry: true,
  });

  await downloadFileWithProgress(
    modelFileInfo.url,
    modelPath,
    "Downloading model",
    (downloaded, total) =>
      `Downloading model ${typeModel}: ${downloaded} / ${total}`
  );

  Logger.info(`Finish download model ${typeModel}`, {
    component: "download>model",
    sendTelemetry: true,
  });

  return modelPath;
};
