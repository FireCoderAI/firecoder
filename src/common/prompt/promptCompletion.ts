import * as vscode from "vscode";
import path from "node:path";

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
  let beforeTokens = 50;
  let afterTokens = 50;

  let textBeforeSlice: string;
  let textAfterSlice: string;

  let resToken = 0;

  while (true) {
    textBeforeSlice = textBefore.slice(beforeTokens * -1);
    textAfterSlice = textAfter.slice(0, afterTokens);

    resToken = await tokenize(textBeforeSlice + textAfterSlice, url);

    if (
      resToken >= maxToken ||
      (textBeforeSlice.length >= textBefore.length &&
        textAfterSlice.length >= textAfter.length)
    ) {
      return {
        documentText: `${textBeforeSlice}<｜fim▁hole｜>${textAfterSlice}`,
        documentTokens: resToken,
      };
    }

    beforeTokens =
      Number((beforeTokens * (maxToken / resToken)).toFixed(0)) + 5;
    afterTokens = Number((afterTokens * (maxToken / resToken)).toFixed(0)) + 5;
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
  let tokens = 50;

  let textSlice: string;

  let resToken = 0;

  while (true) {
    textSlice = text.slice(0, tokens);

    resToken = await tokenize(textSlice, url);

    if (resToken >= maxToken || textSlice.length >= text.length) {
      return {
        documentText: textSlice,
        documentTokens: resToken,
      };
    }

    tokens = Number((tokens * (maxToken / resToken)).toFixed(0)) + 5;
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
    url,
  });

  let additionalDocumentsText = "";

  if (
    additionalDocuments.length !== 0 &&
    maxToken - activeDocumentTokens > 100
  ) {
    let restTokens = maxToken - activeDocumentTokens;
    for (const document of additionalDocuments) {
      const { documentText, documentTokens } = await processingDocument({
        document,
        maxToken: restTokens,
        url,
      });

      additionalDocumentsText +=
        "\n" + getRelativePath(document.uri) + "\n" + documentText;
      restTokens -= documentTokens;
      if (restTokens <= 0) {
        break;
      }
    }
  }

  const activeDocumentFileName =
    additionalDocumentsText === ""
      ? ""
      : "\n" + getRelativePath(activeDocument.uri) + "\n";

  const prompt = `<｜fim▁begin｜>${additionalDocumentsText}${activeDocumentFileName}${activeDocumentText}<｜fim▁end｜>`;

  return prompt;
};
