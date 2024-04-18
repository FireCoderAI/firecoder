export class Transform<T> {
  private open = true;
  private queue: T[] = [];
  private resolve: (() => void) | undefined;

  async *stream(): AsyncGenerator<T> {
    this.open = true;

    while (this.open) {
      if (this.queue.length) {
        yield this.queue.shift()!;
        continue;
      }

      await new Promise<void>((resolveLocal) => {
        this.resolve = resolveLocal;
      });
    }
  }

  push(data: T): void {
    this.queue.push(data);
    this.resolve?.();
  }

  close(): void {
    this.open = false;
    this.resolve?.();
  }
}
