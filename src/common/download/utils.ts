import crypto from "node:crypto";
import { homedir } from "node:os";
import path from "node:path";
import fsPromise from "node:fs/promises";
import fs from "node:fs";
import Logger from "../logger";

export const checkFileOrFolderExists = async (pathToCheck: string) => {
  try {
    await fsPromise.access(pathToCheck, fsPromise.constants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
};

export const getSaveFolder = async () => {
  const pathSaveFolder = path.join(homedir(), ".firecoder");

  const folderIsExist = await checkFileOrFolderExists(pathSaveFolder);

  if (folderIsExist === false) {
    await fsPromise.mkdir(pathSaveFolder);
  }

  return pathSaveFolder;
};

export const getChecksum = async (path: string) => {
  // TODO: Use sha256sum
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
