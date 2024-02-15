import { HuggingFaceTransformersEmbeddingsLocal } from "./hft";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { MemoryVectorStore } from "langchain/vectorstores/memory";

export const startTest = async () => {
  const loader = new DirectoryLoader(
    "/home/gespispace/helper/helper-coder/src",
    {
      ".ts": (path) => new TextLoader(path),
    }
  );

  const docs = await loader.load();

  const splitter = RecursiveCharacterTextSplitter.fromLanguage("js", {
    chunkSize: 4000,
    chunkOverlap: 0,
  });
  const jsOutput = await splitter.splitDocuments(docs);
  const vectorStore = await MemoryVectorStore.fromDocuments(
    jsOutput,
    new HuggingFaceTransformersEmbeddingsLocal({
      // modelName: "jinaai/jina-embeddings-v2-base-code",
      modelName: "Xenova/bge-m3",
      maxConcurrency: 1,
    })
  );

  const resultOne = await vectorStore.similaritySearchWithScore(
    "what properties do we send with each events to telemetry?",
    20
  );
  console.log(resultOne);
  // const model = new HuggingFaceTransformersEmbeddingsLocal({
  //   // modelName: "jinaai/jina-embeddings-v2-base-code",
  //   modelName: "Xenova/bge-m3",
  // });

  // /* Embed queries */
  // const res = await model.embedQuery(
  //   "What would be a good company name for a company that makes colorful socks?"
  // );
  // console.log({ res });
  // /* Embed documents */
  // const documentRes = await model.embedDocuments(["Hello world", "Bye bye"]);
  // console.log({ documentRes });
};
