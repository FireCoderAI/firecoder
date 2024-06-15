import * as vscode from "vscode";
import { BaseDocumentLoader } from "langchain/document_loaders/base";
import ignore, { Ignore } from "ignore";
import crypto from "node:crypto";
import path from "path";

const looksFiles = [
  "package-lock.json", // Used by npm to lock dependencies.
  "yarn.lock", // Used by Yarn to lock dependencies.
  "pnpm-lock.yaml", // Used by pnpm to lock dependencies.
  "Cargo.lock", // Used by Cargo to lock dependencies.
  "Pipfile.lock", // Used by Pipenv to lock dependencies.
  "go.sum", // Used by Go modules to lock dependencies.
  "composer.lock", // Used by Composer to lock dependencies.
  "Gemfile.lock", // Used by Bundler to lock dependencies.
];

export class VSCodeDirectoryLoader extends BaseDocumentLoader {
  constructor(private rootPath: vscode.Uri) {
    super();
  }
  public async load() {
    const gitignoreFile = await this.getGitignoreFile();
    let filter: Ignore = ignore().add(".git").add(looksFiles);
    if (gitignoreFile) {
      filter.add(gitignoreFile);
    }
    const filesPath = await this.loadDirectory(this.rootPath, filter);

    const docs = await Promise.all(
      filesPath.map(async (filePath) => {
        const fileBlob = await vscode.workspace.fs.readFile(filePath);
        const fileString = new TextDecoder().decode(fileBlob);
        const fileHash = crypto
          .createHash("sha256")
          .update(fileString)
          .digest("hex");

        return {
          pageContent: fileString,
          metadata: {
            source: filePath.fsPath,
            hash: fileHash,
          },
        };
      })
    );

    return docs;
  }

  private async loadDirectory(rootPath: vscode.Uri, ignore: Ignore) {
    const files = await vscode.workspace.fs.readDirectory(rootPath);
    const formatFiles = files.map((file) => ({
      name: file[0],
      type: file[1],
      path: vscode.Uri.joinPath(rootPath, file[0]),
      relativePath: path.relative(
        rootPath.fsPath,
        vscode.Uri.joinPath(rootPath, file[0]).fsPath
      ),
    }));

    const filteredFiles = formatFiles.filter(
      (file) =>
        !ignore?.ignores(path.relative(rootPath.fsPath, file.path.fsPath))
    );

    const onlyFiles = filteredFiles.filter(
      (file) => file.type === vscode.FileType.File
    );
    const onlyDirs = filteredFiles.filter(
      (file) => file.type === vscode.FileType.Directory
    );

    const docs: vscode.Uri[] = onlyFiles.map((file) => file.path);

    for (const dir of onlyDirs) {
      const dirDocs = await this.loadDirectory(dir.path, ignore);
      docs.push(...dirDocs);
    }

    return docs;
  }

  private async getGitignoreFile() {
    const gitignorePath = vscode.Uri.joinPath(this.rootPath, ".gitignore");
    try {
      const gitignoreBlob = await vscode.workspace.fs.readFile(gitignorePath);
      return gitignoreBlob.toString();
    } catch (error) {
      if (error instanceof vscode.FileSystemError.FileNotFound) {
        return null;
      } else {
        return null;
      }
    }
  }
}
