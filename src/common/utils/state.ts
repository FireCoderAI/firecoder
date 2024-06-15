import * as vscode from "vscode";
import type { Spec } from "../download";
import { Chat } from "../prompt/promptChat";

const StateValues = {
  inlineSuggestModeAuto: true,
  serverSpec: null,
  embedding: null,
  recordManager: null,
};
type StateValuesType = {
  inlineSuggestModeAuto: boolean;
  serverSpec: Spec | null;
  embedding: string | null;
  recordManager: string | null;
  [key: `chat-${string}`]: Chat | undefined;
};

class State {
  state?: vscode.Memento;
  constructor() {}

  public init(state: vscode.Memento) {
    this.state = state;
  }

  public get<T extends keyof StateValuesType & string>(
    key: T
  ): StateValuesType[T] {
    // @ts-ignore
    return this.state?.get(key) ?? StateValues[key];
  }

  public async update<T extends keyof StateValuesType>(
    key: T,
    value: StateValuesType[T]
  ) {
    await this.state?.update(key, value);
  }

  public getChats(): Chat[] {
    const allKeys = (this.state?.keys() ||
      []) as unknown as (keyof StateValuesType)[];

    return allKeys
      .filter((key) => key.startsWith("chat-"))
      .map((key) => {
        return this.get(key as `chat-${string}`) as Chat;
      });
  }
  public async delete<T extends keyof StateValuesType>(key: T) {
    await this.state?.update(key, undefined);
  }

  public async deleteChats() {
    const allKeys = (this.state?.keys() ||
      []) as unknown as (keyof StateValuesType)[];

    await Promise.all(
      allKeys
        .filter((key) => key.startsWith("chat-"))
        .map((key) => this.delete(key as `chat-${string}`))
    );
  }
}

export const state = {
  workspace: new State(),
  global: new State(),
};
