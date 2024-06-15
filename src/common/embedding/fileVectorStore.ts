import { randomUUID } from "crypto";
import { EmbeddingsInterface } from "langchain/embeddings/base";
import {
  MemoryVectorStore,
  MemoryVectorStoreArgs,
} from "langchain/vectorstores/memory";

export class FileVectorStore extends MemoryVectorStore {
  constructor(
    embeddings: EmbeddingsInterface,
    {
      similarity,
      memoryVectors,
      ...rest
    }: MemoryVectorStoreArgs & { memoryVectors?: any } = {}
  ) {
    super(embeddings, { similarity, ...rest });
    if (memoryVectors) {
      this.memoryVectors = memoryVectors;
    }
  }
  override async addDocuments(
    documents: any[],
    options?: { ids?: string[] }
  ): Promise<void> {
    const texts = documents.map(({ pageContent }) => pageContent);
    return this.addVectors(
      await this.embeddings.embedDocuments(texts),
      documents.map((doc, index) => {
        return {
          ...doc,
          metadata: {
            ...doc.metadata,
            id: options?.ids?.[index] ?? randomUUID(),
          },
        };
      })
    );
  }

  public serialize(): string {
    return JSON.stringify(this.memoryVectors);
  }

  static deserialize(
    index: string,
    embeddings: EmbeddingsInterface,
    dbConfig?: MemoryVectorStoreArgs
  ): FileVectorStore {
    const memoryVectors = JSON.parse(index);
    const instance = new FileVectorStore(embeddings, {
      memoryVectors,
      similarity: dbConfig?.similarity,
      ...dbConfig,
    });
    return instance;
  }

  public async delete(params: { ids: string[] }): Promise<void> {
    params.ids.forEach((id) => {
      const index = this.memoryVectors.findIndex((v) => v.metadata.id === id);
      if (index !== -1) {
        this.memoryVectors.splice(index, 1);
      }
    });
  }
}
