import * as vscode from "vscode";
import { randomUUID } from "crypto";
import Logger from "../logger";
import statusBar from "../statusBar";

const logCompletion = (uuid = randomUUID() as string) => {
  return {
    info: (text: any) =>
      Logger.info(text, { component: `Completion: ${uuid.slice(-8)}` }),
    uuid: () => uuid,
  };
};

const defualtParameters = {
  stream: false,
  n_predict: 128,
  temperature: 0.3,
  stop: ["\n"],
  repeat_last_n: 256,
  repeat_penalty: 1.18,
  penalize_nl: false,
  top_k: 20,
  top_p: 0.5,
  min_p: 0.05,
  tfs_z: 1,
  typical_p: 1,
  presence_penalty: 0,
  frequency_penalty: 0,
  mirostat: 0,
  mirostat_tau: 5,
  mirostat_eta: 0.1,
  grammar: "",
  n_probs: 0,
  image_data: [],
  cache_prompt: false,
  slot_id: -1,
};

export const sendCompletion = async (
  prompt: string,
  parameters: Record<string, any>,
  abortController: AbortController,
  uuid: string,
  url: string
) => {
  const { stopTask } = statusBar.startTask();

  const loggerCompletion = logCompletion(uuid);

  const parametersForCompletion = {
    ...defualtParameters,
    ...parameters,
    prompt: prompt,
  };
  try {
    loggerCompletion.info("Request: started");

    const startTime = performance.now();

    const response = await fetch(`${url}/completion`, {
      body: JSON.stringify(parametersForCompletion),
      method: "POST",
      signal: abortController.signal,
    });

    if (!response.ok) {
      Logger.error(response.statusText);

      vscode.window.showErrorMessage(
        `Error: ${response.status} ${response.statusText}`
      );
      return null;
    }

    const completion: {
      content: string;
      slot_id: number;
      timings: {
        predicted_ms: number;
        predicted_n: number;
        predicted_per_second: number;
        predicted_per_token_ms: number;
        prompt_ms: number;
        prompt_n: number;
        prompt_per_second: number;
        prompt_per_token_ms: number;
      };
    } = (await response.json()) as any;

    if (completion.content === "") {
      return null;
    }

    loggerCompletion.info(
      `Slot Id: ${completion.slot_id}; ` +
        `Total time: ${(performance.now() - startTime).toFixed(2)}; ` +
        `PP: ${completion?.timings?.prompt_per_second?.toFixed(2)}; [t/s] ` +
        `TG: ${completion?.timings?.predicted_per_second?.toFixed(2)}; [t/s]`
    );

    const timing = completion?.timings?.prompt_ms
      ? completion?.timings?.prompt_ms
      : performance.now() - startTime;

    loggerCompletion.info("Request: finished");

    return { content: completion.content, timing } as const;
  } catch (error) {
    const Error = error as Error;
    if (Error.name === "AbortError") {
      loggerCompletion.info("Request: canceled by new completion abort");
      return null;
    }
    Logger.error(error);

    const errorMessage = Error.message;
    vscode.window.showErrorMessage(errorMessage);
    return null;
  } finally {
    stopTask();
  }
};
