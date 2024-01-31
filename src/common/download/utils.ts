import crypto from "node:crypto";
import * as os from "node:os";
import path from "node:path";
import fsPromise from "node:fs/promises";
import fs from "node:fs";
import child_process from "node:child_process";
import { promisify } from "node:util";
const exec = promisify(child_process.exec);

export const checkFileOrFolderExists = async (pathToCheck: string) => {
  try {
    await fsPromise.access(pathToCheck, fsPromise.constants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
};

export const getSaveFolder = async () => {
  const pathSaveFolder = path.join(os.homedir(), ".firecoder");

  const folderIsExist = await checkFileOrFolderExists(pathSaveFolder);

  if (folderIsExist === false) {
    await fsPromise.mkdir(pathSaveFolder);
  }

  return pathSaveFolder;
};

export const getChecksum = async (path: string) => {
  const osplatform = os.platform();
  const isLinux = osplatform === "linux";
  const isWindows = osplatform === "win32";
  try {
    if (isLinux) {
      const hashOutput = await exec(`sha256sum ${path} | awk '{ print $1 }'`);

      return hashOutput.stdout.trim();
    }

    if (isWindows) {
      const hashOutput = await exec(
        `$(CertUtil -hashfile ${path} SHA256)[1] -replace " ",""`,
        { shell: "powershell.exe" }
      );

      return hashOutput.stdout.replace("\r\n", "").trim();
    }

    // fallback to default method
    return await getCheckSumNode(path);
  } catch (error) {
    return await getCheckSumNode(path);
  }
};

const getCheckSumNode = async (path: string) => {
  return await new Promise((res, rej) => {
    try {
      const fsStream = fs.createReadStream(path);
      const hash = crypto.createHash("sha256").setEncoding("hex");
      fsStream.pipe(hash);
      fsStream.on("end", () => {
        hash.end();
        res(hash.read());
      });
    } catch (error) {
      rej(error);
    }
  });
};
