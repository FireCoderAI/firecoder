import * as vscode from "vscode";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { readFileSync } from "node:fs";
import { FileVectorStore } from "./fileVectorStore";
import { VSCodeDirectoryLoader } from "./vscodeDirectoryLoader";
import { index } from "langchain/indexes";
import { InMemoryRecordManager } from "@langchain/community/indexes/memory";
import { state } from "../utils/state";
import { Document } from "langchain/document";

const embedding = new OpenAIEmbeddings({
  apiKey: "YOUR-API-KEY",
  batchSize: 64,
  maxConcurrency: 10,
  configuration: {
    baseURL: "http://localhost:39729/v1",
  },
});

class Embeddings {
  private vectorStore?: FileVectorStore;
  private recordManager?: InMemoryRecordManager;
  private workspacePath!: vscode.Uri;

  public async init(workspacePath: vscode.Uri) {
    this.workspacePath = workspacePath;
  }

  public async refreshIndex() {
    const vectorStore = this.initVectorStore();
    const recordManager = this.initRecordManager();
    const document = await this.loadDocuments();

    const processedDocument = await this.splitDocuments(document);

    const resultIndex = await index({
      docsSource: processedDocument,
      recordManager,
      vectorStore: vectorStore,
      options: {
        cleanup: "full",
        sourceIdKey: (doc) => doc.metadata.source,
      },
    });

    console.log(resultIndex);

    state.workspace.update("embedding", vectorStore.serialize());
    const recordManagerState = JSON.stringify(
      Object.fromEntries(recordManager.records)
    );

    state.workspace.update("recordManager", recordManagerState);
  }

  initRecordManager() {
    if (this.recordManager) {
      return this.recordManager;
    }

    const recordManager = new InMemoryRecordManager();
    const recordManagerStateExist = state.workspace.get("recordManager");

    if (recordManagerStateExist) {
      recordManager.records = new Map(
        Object.entries(JSON.parse(recordManagerStateExist))
      );
    }

    this.recordManager = recordManager;

    return recordManager;
  }

  initVectorStore() {
    if (this.vectorStore) {
      return this.vectorStore;
    }

    const savedVectorStore = state.workspace.get("embedding");
    const vectorStore = savedVectorStore
      ? FileVectorStore.deserialize(savedVectorStore, embedding)
      : new FileVectorStore(embedding);
    this.vectorStore = vectorStore;
    return vectorStore;
  }

  async loadDocuments() {
    const loader = new VSCodeDirectoryLoader(this.workspacePath);
    const docs = await loader.load();

    return docs;
  }

  async splitDocuments(docs: Document[]) {
    const splitter = RecursiveCharacterTextSplitter.fromLanguage("js", {
      chunkSize: 7000,
      chunkOverlap: 0,
    });

    const splittedDocuments = await splitter.splitDocuments(
      docs.map((doc) => ({
        ...doc,
        pageContent: "search_document: " + doc.pageContent,
      }))
    );
    return splittedDocuments;
  }

  public async getRelativeDocuments(
    activeDocument: vscode.TextDocument
  ): Promise<vscode.TextDocument[]> {
    if (this.vectorStore) {
      const results = await this.vectorStore.similaritySearchWithScore(
        `search_document: ${activeDocument.getText()}`,
        20,
        (doc) => doc.metadata.source !== activeDocument.uri.fsPath
      );

      const documents = await Promise.all(
        results.map((document) =>
          vscode.workspace.openTextDocument(
            vscode.Uri.parse(document[0].metadata.source)
          )
        )
      );

      return documents;
    }
    return [];
  }
}

export const embeddings = new Embeddings();

export const startTest = async () => {
  const workspacePath = vscode.workspace.workspaceFolders![0].uri;

  const loader = new VSCodeDirectoryLoader(workspacePath);

  const docs = await loader.load();

  const splitter = RecursiveCharacterTextSplitter.fromLanguage("js", {
    chunkSize: 7000,
    chunkOverlap: 0,
  });

  const jsOutput = await splitter.splitDocuments(
    docs.map((doc) => ({
      ...doc,
      pageContent: "search_document: " + doc.pageContent,
    }))
  );

  const savedVectorStore = state.workspace.get("embedding");
  const vectorStore = savedVectorStore
    ? FileVectorStore.deserialize(savedVectorStore, embedding)
    : new FileVectorStore(embedding);

  const recordManager = new InMemoryRecordManager();
  const recordManagerStateExist = state.workspace.get("recordManager");

  if (recordManagerStateExist) {
    recordManager.records = new Map(
      Object.entries(JSON.parse(recordManagerStateExist))
    );
  }

  console.log(
    await index({
      docsSource: jsOutput,
      recordManager,
      vectorStore,
      options: {
        cleanup: "full",
        sourceIdKey: (doc) => doc.metadata.source,
      },
    })
  );

  state.workspace.update("embedding", vectorStore.serialize());
  const recordManagerState = JSON.stringify(
    Object.fromEntries(recordManager.records)
  );

  state.workspace.update("recordManager", recordManagerState);

  const file = readFileSync(
    "/home/gespispace/firecoder/llm-backend/src/completions/completions.module.ts",
    { encoding: "utf-8" }
  );

  const start = performance.now();
  const resultOne = await vectorStore.similaritySearchWithScore(
    `search_document: ${file}`,
    20
  );
  const end = performance.now();

  console.log(`Full Time: ${(end - start).toFixed(2)}ms`);
  console.log(
    resultOne.map((document) => [document[1], document[0].metadata.source])
  );
};
