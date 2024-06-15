import * as vscode from "vscode";
import path from "node:path";
import Logger from "../logger";
import { tokenizer } from "./tokenizer";
import { embeddings } from "../embedding/embedding";

const tokenize = async (text: string): Promise<number> => {
  try {
    const startLocal = performance.now();

    const tokens = tokenizer.encode(text);

    const endLocal = performance.now();

    Logger.debug(
      `Tokenized ${text.length} local: ${(endLocal - startLocal).toFixed(
        2
      )} CountTokens: ${tokens.length}`
    );

    return tokens.length + 1;
  } catch (error) {
    return 0;
  }
};

const getTextNormalized = (text: string) => {
  return text
    .replaceAll("<|fim_prefix|>", "")
    .replaceAll("<|fim_middle|>", "")
    .replaceAll("<|fim_suffix|>", "")
    .replaceAll("<|file_separator|>", "");
};

const spliteDocumentByPosition = (
  document: vscode.TextDocument,
  position: vscode.Position
): [string, string] => {
  const textBefore = getTextNormalized(
    document.getText(new vscode.Range(new vscode.Position(0, 0), position))
  );
  const textAfter = getTextNormalized(
    document.getText(
      new vscode.Range(
        position,
        new vscode.Position(
          document.lineCount,
          document.lineAt(document.lineCount - 1).text.length
        )
      )
    )
  );
  return [textBefore, textAfter];
};

const processingDocumentWithPosition = async ({
  document,
  position,
  maxToken,
}: {
  document: vscode.TextDocument;
  position: vscode.Position;
  maxToken: number;
}) => {
  const [textBefore, textAfter] = spliteDocumentByPosition(document, position);

  let textLength = maxToken;

  let textBeforeSlice: string;
  let textAfterSlice: string;

  let tokens = 0;

  while (true) {
    textBeforeSlice = textBefore.slice((textLength / 2) * 3 * -1);
    textAfterSlice = textAfter.slice(0, (textLength / 2) * 3);

    tokens = await tokenize(textBeforeSlice + textAfterSlice);

    const tokenDifference = Math.abs(maxToken - tokens);
    const maxDifference = Math.max(maxToken * 0.1, 50);

    Logger.debug(`${document.fileName} document tokens: ${tokens}`);
    if (
      (tokens <= maxToken &&
        textBeforeSlice.length >= textBefore.length &&
        textAfterSlice.length >= textAfter.length) ||
      tokenDifference <= maxDifference
    ) {
      return {
        documentText: `${textBeforeSlice}<|fim_suffix|>${textAfterSlice}`,
        documentTokens: tokens,
      };
    }

    if (tokens <= maxToken) {
      textLength += 30;
    } else {
      textLength -= 60;
    }
  }
};

const processingDocument = async ({
  document,
  maxToken,
}: {
  document: vscode.TextDocument;
  maxToken: number;
}) => {
  const text = getTextNormalized(document.getText());

  let textLength = maxToken;

  let textSlice: string;

  let tokens = 0;

  while (true) {
    textSlice = text.slice(0, Number(textLength.toFixed(0)) * 3);

    tokens = await tokenize(textSlice);

    const tokenDifference = Math.abs(maxToken - tokens);
    const maxDifference = Math.max(maxToken * 0.1, 50);

    Logger.debug(`${document.fileName} document tokens: ${tokens}`);
    if (
      (tokens <= maxToken && textSlice.length >= text.length) ||
      tokenDifference <= maxDifference
    ) {
      return {
        documentText: textSlice,
        documentTokens: tokens,
      };
    }

    if (tokens <= maxToken) {
      textLength += 30;
    } else {
      textLength -= 60;
    }
  }
};

const getRelativePath = (uri: vscode.Uri) => {
  const workspacePath = vscode.workspace.getWorkspaceFolder(uri)?.uri.fsPath;
  const relativePath = path.relative(workspacePath ?? "", uri.fsPath);
  return relativePath;
};

export const getPromptCompletion = async ({
  activeDocument,
  additionalDocuments,
  position,
  maxTokenExpect = 200,
}: {
  activeDocument: vscode.TextDocument;
  additionalDocuments: vscode.TextDocument[];
  position: vscode.Position;
  maxTokenExpect: number;
}) => {
  const start = performance.now();

  const maxTokenHardLimit = 4000;
  const maxToken =
    maxTokenExpect > maxTokenHardLimit ? maxTokenHardLimit : maxTokenExpect;

  const {
    documentTokens: activeDocumentTokens,
    documentText: activeDocumentText,
  } = await processingDocumentWithPosition({
    document: activeDocument,
    position,
    maxToken,
  });

  let additionalDocumentsText = "";

  const documentsFromEmbeddings = await embeddings.getRelativeDocuments(
    activeDocument
  );

  if (
    additionalDocuments.length !== 0 &&
    maxToken - activeDocumentTokens > 100
  ) {
    let restTokens = maxToken - activeDocumentTokens;
    for (const document of additionalDocuments) {
      if (restTokens <= 50) {
        break;
      }
      const { documentText, documentTokens } = await processingDocument({
        document,
        maxToken: restTokens,
      });
      const documentName = document.fileName;

      Logger.debug(
        `${documentName} document tokens resualt: ${documentTokens}`
      );

      additionalDocumentsText +=
        "/" +
        getRelativePath(document.uri) +
        "\n" +
        "<|fim_prefix|>" +
        documentText +
        "<|fim_middle|>" +
        "<|file_separator|>";
      restTokens -= documentTokens;
    }
  }

  const activeDocumentFileName =
    additionalDocumentsText === ""
      ? "<|fim_prefix|>"
      : "\n" +
        "/" +
        getRelativePath(activeDocument.uri) +
        "\n" +
        "<|fim_prefix|>";
  const end = performance.now();

  Logger.debug(`Full Time: ${(end - start).toFixed(2)}ms`);
  const prompt = `${additionalDocumentsText}${activeDocumentFileName}${activeDocumentText}<|fim_middle|>`;
  console.log(prompt);
  return prompt;
};
