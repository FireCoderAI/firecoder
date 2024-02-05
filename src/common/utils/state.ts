import * as vscode from "vscode";

const StateValues = {
  inlineSuggestModeAuto: {
    default: true,
  },
};

interface StateValuesType extends Record<keyof typeof StateValues, any> {
  inlineSuggestModeAuto: {
    possibleValues: boolean;
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
