import * as vscode from "vscode";
import path from "node:path";
import Logger from "../logger";

const tokenize = async (text: string, url: string) => {
  try {
    const body = JSON.stringify({
      content: text,
    });
    const res = await fetch(`${url}/tokenize`, {
      body: body,
      method: "POST",
      headers: {
        Connection: "keep-alive",
        "Content-Type": "application/json",
      },
      keepalive: true,
    });

    const json = (await res.json()) as {
      tokens: number[];
    };

    return json.tokens.length;
  } catch (error) {
    return 0;
  }
};

const getTextNormalized = (text: string) => {
  return text
    .replace("<｜fim▁begin｜>", "")
    .replace("<｜fim▁hole｜>", "")
    .replace("<｜fim▁end｜>", "");
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
const inverseSquareRoot = (x: number) => 1 / Math.sqrt(x);
const randomFromInterval = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1) + min);

const processingDocumentWithPosition = async ({
  document,
  position,
  url,
  maxToken,
}: {
  document: vscode.TextDocument;
  position: vscode.Position;
  url: string;
  maxToken: number;
}) => {
  const [textBefore, textAfter] = spliteDocumentByPosition(document, position);

  let beforeTokens = maxToken / 2;
  let afterTokens = maxToken / 2;

  let textBeforeSlice: string;
  let textAfterSlice: string;

  let tokens = 0;

  while (true) {
    textBeforeSlice = textBefore.slice(beforeTokens * 3 * -1);
    textAfterSlice = textAfter.slice(0, afterTokens * 3);

    tokens = await tokenize(textBeforeSlice + textAfterSlice, url);
    const tokenDifference = Math.abs(maxToken - tokens);
    const maxDifference = Math.max(maxToken * 0.1, 10);

    const documentName = document.fileName;
    Logger.debug(`${documentName} document tokens: ${tokens}`);
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
      beforeTokens +=
        inverseSquareRoot(beforeTokens / maxToken) *
        randomFromInterval(30, 60) *
        4;
      afterTokens +=
        inverseSquareRoot(afterTokens / maxToken) *
        randomFromInterval(30, 60) *
        4;
    } else {
      beforeTokens -=
        inverseSquareRoot(beforeTokens / maxToken) *
        randomFromInterval(30, 60) *
        4;
      afterTokens -=
        inverseSquareRoot(afterTokens / maxToken) *
        randomFromInterval(30, 60) *
        4;
    }
  }
};

const processingDocument = async ({
  document,
  url,
  maxToken,
}: {
  document: vscode.TextDocument;
  url: string;
  maxToken: number;
}) => {
  const text = getTextNormalized(document.getText());

  let tokens = maxToken;

  let textSlice: string;

  while (true) {
    Logger.debug("New iteration of the while loop");

    textSlice = text.slice(0, Number(tokens.toFixed(0)) * 3);

    tokens = await tokenize(textSlice, url);

    const tokenDifference = Math.abs(maxToken - tokens);
    const maxDifference = Math.max(maxToken * 0.05, 10);

    const logMessage = `Text slice length: ${textSlice.length}, Tokens after tokenization: ${tokens}, Max token: ${maxToken}, Token difference: ${tokenDifference}`;

    Logger.debug(logMessage);

    const documentName = document.fileName;
    Logger.debug(`${documentName} document tokens: ${tokens}`);
    if (
      (tokens <= maxToken && textSlice.length >= text.length) ||
      tokenDifference <= maxDifference
    ) {
      Logger.debug(`${documentName} document tokens resualt: ${tokens}`);

      return {
        documentText: textSlice,
        documentTokens: tokens,
      };
    }

    if (tokens <= maxToken) {
      const ratio = tokens / maxToken;
      Logger.debug(`Calculating increment for ratio: ${ratio}`);

      const increment = inverseSquareRoot(ratio) * randomFromInterval(10, 20);
      Logger.debug(`Increment calculated: ${increment}`);

      tokens += increment;
      Logger.debug(`Tokens incremented by: ${increment}`);
    } else {
      const ratio = tokens / maxToken;
      Logger.debug(`Calculating decrement for ratio: ${ratio}`);

      const decrement = inverseSquareRoot(ratio) * randomFromInterval(250, 500);
      Logger.debug(`Decrement calculated: ${decrement}`);

      tokens -= decrement;
      Logger.debug(`Tokens decremented by: ${decrement}`);
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
  url,
}: {
  activeDocument: vscode.TextDocument;
  additionalDocuments: vscode.TextDocument[];
  position: vscode.Position;
  maxTokenExpect: number;
  url: string;
}) => {
  const maxTokenHardLimit = 10000;
  const maxToken =
    maxTokenExpect > maxTokenHardLimit ? maxTokenHardLimit : maxTokenExpect;

  const {
    documentTokens: activeDocumentTokens,
    documentText: activeDocumentText,
  } = await processingDocumentWithPosition({
    document: activeDocument,
    position,
    maxToken,
    url,
  });

  let additionalDocumentsText = "";

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
        url,
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
      ? ""
      : "\n" +
        "/" +
        getRelativePath(activeDocument.uri) +
        "\n" +
        "<|fim_prefix|>";

  const prompt = `${additionalDocumentsText}${activeDocumentFileName}${activeDocumentText}<|fim_middle|>`;

  return prompt;
};
