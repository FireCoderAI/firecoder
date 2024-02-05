import * as vscode from "vscode";
import type { Spec } from "../download";

const StateValues = {
  inlineSuggestModeAuto: {
    default: true,
  },
  serverSpec: {
    default: null,
  },
};

interface StateValuesType extends Record<keyof typeof StateValues, any> {
  inlineSuggestModeAuto: {
    possibleValues: boolean;
  };
  serverSpec: {
    possibleValues: Spec | null;
  };
}
class State {
  state?: vscode.Memento;
  constructor() {}

  public init(state: vscode.Memento) {
    this.state = state;
  }

  public get<T extends keyof StateValuesType>(
    key: T
  ): StateValuesType[T]["possibleValues"] {
    return this.state?.get(key) ?? StateValues[key]["default"];
  }

  public async update<T extends keyof StateValuesType>(
    key: T,
    value: StateValuesType[T]["possibleValues"]
  ) {
    await this.state?.update(key, value);
  }
}

export const state = {
  workspace: new State(),
  global: new State(),
};
