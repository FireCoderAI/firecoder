import * as vscode from "vscode";

const SecretStorageValues = {
  token: {
    default: "",
  },
  refreshToken: {
    default: "",
  },
};

interface SecretStorageValuesType
  extends Record<keyof typeof SecretStorageValues, any> {
  token: {
    possibleValues: string;
  };
  refreshToken: {
    possibleValues: string;
  };
}
class SecretsStorage {
  secretStorage?: vscode.SecretStorage;
  constructor() {}

  public init(secretStorage: vscode.SecretStorage) {
    this.secretStorage = secretStorage;
  }

  public async get<T extends keyof SecretStorageValuesType>(
    key: T
  ): Promise<SecretStorageValuesType[T]["possibleValues"]> {
    const value = await this.secretStorage?.get(key);
    if (value) {
      return value;
    } else {
      return SecretStorageValues[key]["default"];
    }
  }

  public async update<T extends keyof SecretStorageValuesType>(
    key: T,
    value: SecretStorageValuesType[T]["possibleValues"]
  ) {
    await this.secretStorage?.store(key, value);
  }

  public async getItem(key: string) {
    const value = await this.secretStorage?.get(key);
    return value ?? null;
  }

  public async removeItem(key: string) {
    await this.secretStorage?.delete(key);
  }

  public async setItem(key: string, value: string) {
    await this.secretStorage?.store(key, value);
  }
}

export const secretsStorage = new SecretsStorage();
