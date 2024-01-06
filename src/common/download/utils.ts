import crypto from "node:crypto";
import { homedir } from "node:os";
import path from "node:path";
import fs from "node:fs/promises";

export const checkFileOrFolderExists = async (pathToCheck: string) => {
  try {
    await fs.access(pathToCheck, fs.constants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
};

export const getSaveFolder = async () => {
  const pathSaveFolder = path.join(homedir(), ".firecoder");

  const folderIsExist = await checkFileOrFolderExists(pathSaveFolder);

  if (folderIsExist === false) {
    await fs.mkdir(pathSaveFolder);
  }

  return pathSaveFolder;
};

export const getChecksum = async (path: string) => {
  const file = await fs.readFile(path);

  const hash = crypto.createHash("sha256").update(file).digest("hex");

  return hash;
};
