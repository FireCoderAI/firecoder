import * as vscode from "vscode";
import Logger from "./logger";

const tokenize = async (text: string) => {
  try {
    const body = JSON.stringify({
      content: text,
    });
    const res = await fetch("http://localhost:39129/tokenize", {
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
    debugger;
    return 0;
  }
};

export const getPrompt = async (
  document: vscode.TextDocument,
  position: vscode.Position,
  maxTokenExpect = 200
) => {
  const maxTokenHardLimit = 1000;
  const maxToken =
    maxTokenExpect > maxTokenHardLimit ? maxTokenHardLimit : maxTokenExpect;

  const textBefore = document.getText(
    new vscode.Range(new vscode.Position(0, 0), position)
  );
  const textAfter = document.getText(
    new vscode.Range(
      position,
      new vscode.Position(
        document.lineCount,
        document.lineAt(document.lineCount - 1).text.length
      )
    )
  );

  let before = 50;
  let after = 50;
  let textBeforeSlice: string;
  let textAfterSlice: string;
  Logger.startPerfMarker("Prepare prompt");
  while (true) {
    textBeforeSlice = textBefore.slice(before * -1);
    textAfterSlice = textAfter.slice(0, after);
    Logger.startPerfMarker("Prepare prompt request");

    const [tokensBeforeSlice, tokensAfterSlice] = await Promise.all([
      tokenize(textBeforeSlice),
      tokenize(textAfterSlice),
    ]);
    Logger.endPerfMarker("Prepare prompt request");

    const resToken = tokensAfterSlice + tokensBeforeSlice;
    if (
      resToken >= maxToken ||
      (textBeforeSlice.length >= textBefore.length &&
        textAfterSlice.length >= textAfter.length)
    ) {
      Logger.info(`Tokens count: ${resToken}`);
      break;
    }

    before = Number((before * (maxToken / resToken)).toFixed(0)) + 5;
    after = Number((after * (maxToken / resToken)).toFixed(0)) + 5;
  }
  Logger.endPerfMarker("Prepare prompt");

  const prompt = `<｜fim▁begin｜>${textBeforeSlice}<｜fim▁hole｜>${textAfterSlice}<｜fim▁end｜>`;
  console.log(prompt);
  return prompt;
};
