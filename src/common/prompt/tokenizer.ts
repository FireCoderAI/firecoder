import Logger from "../logger";

class Tokenizer {
  private tokenizer: any;
  public async init() {
    const { AutoTokenizer } = await import("@xenova/transformers");
    this.tokenizer = await AutoTokenizer.from_pretrained(
      "Xenova/gemma-tokenizer"
    );
    Logger.info("Tokenizer inited");
  }
  public encode(text: string): number[] {
    return this.tokenizer.encode(text);
  }
}

const tokenizer = new Tokenizer();

export { tokenizer };
