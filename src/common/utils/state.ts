import * as vscode from "vscode";
import type { Spec } from "../download";
import { Chat } from "../prompt/promptChat";

const StateValues = {
  inlineSuggestModeAuto: true,
  serverSpec: null,
};
type StateValuesType = {
  inlineSuggestModeAuto: boolean;
  serverSpec: Spec | null;
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
}

export const state = {
  workspace: new State(),
  global: new State(),
};
