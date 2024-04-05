import { PromptTemplate } from "langchain/prompts";
import * as vscode from "vscode";

export const getHighlightedTextDetails = (): {
  content: string;
  startLine: number;
  endLine: number;
  filePath: string;
} | null => {
  // Get the active vscode text editor instance.
  let editor = vscode.window.activeTextEditor;

  if (!editor) {
    return null; // If no editor is open, we'll return null.
  }

  const selection = editor?.selection;

  if (selection && !selection.isEmpty) {
    // Create a new Range object with the start and end of selected text in vscode document.
    let rangeSelectionText: vscode.Range = new vscode.Range(
      selection.start.line,
      selection.start.character,
      selection.end.line,
      selection.end.character
    );

    // Get the text from selected lines in document using Range object we created above.
    let content = editor?.document.getText(rangeSelectionText) || "";

    return {
      filePath: (editor && editor.document.uri.fsPath) || "",
      startLine: selection.start.line, // line number where the selected text starts from
      endLine: selection.end.line, // line number where the selected text ends to
      content: content, // The actual highlighted code/text in string format
    };
  } else {
    return null;
  }
};

export const systemTemplate = `
You are an AI Assistant who\`s a coding expert. Answer on below question.

Input format:
- The provided code is the code that the user selected for this question, usually, it is relative to the question.
- User question.

Instructions:
- Answer in short form.
- Don't answer, if you don't know the answer.
- Don't explain why you did this change.
- Only answer what the user asked.
- If the code is not relative to the question, don't use it for the answer.
- If the answer expects any code examples, please provide examples. 

Rules for code in response:
- Suggest only changes. 
- Provide only the necessary code.
- Write as less as possible comments.
`;

export const humanMessageWithCodePrompt = new PromptTemplate({
  inputVariables: ["highlightedCode", "question"],
  template: `Please provide an answer on this question using a provided code.

Provided Code: 
\`\`\`
{highlightedCode}
\`\`\`

Question: {question}
`,
});
