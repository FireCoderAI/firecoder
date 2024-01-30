import * as vscode from "vscode";
import { randomUUID } from "crypto";
import Logger from "../logger";
import statusBar from "../statusBar";

const logCompletion = (uuid = randomUUID() as string) => {
  return {
    info: (text: any) =>
      Logger.info(text, { component: `Chat: ${uuid.slice(-8)}` }),
    uuid: () => uuid,
  };
};

class CustomEvent extends Event {
  detail: any;
  constructor(message: any, data: any) {
    super(message, data);
    this.detail = data.detail;
  }
}

const defualtParameters = {
  stream: true,
  n_predict: 128,
  temperature: 0.3,
  stop: [],
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
  n_probs: 0,
  cache_prompt: true,
  slot_id: -1,
};

export async function* sendChatRequest(
  prompt: string,
  parameters: Record<string, any>,
  uuid: string,
  url: string
) {
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

    // const response = await fetch(`${url}/completion`, {
    //   body: JSON.stringify(parametersForCompletion),
    //   method: "POST",
    //   headers: {
    //     Connection: "keep-alive",
    //     "Content-Type": "application/json",
    //     Accept: "text/event-stream",
    //   },
    // });
    let content = "";
    let timings;
    for await (const chunk of llama(prompt, parametersForCompletion, { url })) {
      // @ts-ignore
      if (chunk.data) {
        // @ts-ignore
        content += chunk.data.content;
        yield content;
      }
      // @ts-ignore
      // if (chunk.data.generation_settings) {
      //   eventTarget.dispatchEvent(
      //     new CustomEvent("generation_settings", {
      //       // @ts-ignore
      //       detail: chunk.data.generation_settings,
      //     })
      //   );
      // }
      // @ts-ignore
      if (chunk.data.timings) {
        // @ts-ignore
        timings = chunk.data.timings;
      }
    }

    // if (!response.ok) {
    //   Logger.error(response.statusText);

    //   vscode.window.showErrorMessage(
    //     `Error: ${response.status} ${response.statusText}`
    //   );
    //   return null;
    // }

    // const completion: {
    //   content: string;
    //   slot_id: number;
    //   timings: {
    //     predicted_ms: number;
    //     predicted_n: number;
    //     predicted_per_second: number;
    //     predicted_per_token_ms: number;
    //     prompt_ms: number;
    //     prompt_n: number;
    //     prompt_per_second: number;
    //     prompt_per_token_ms: number;
    //   };
    // } = (await response.json()) as any;

    // if (completion.content === "") {
    //   return null;
    // }

    loggerCompletion.info(
      // `Slot Id: ${completion.slot_id}; ` +
      `Total time: ${(performance.now() - startTime).toFixed(2)}; ` +
        `PP: ${timings?.prompt_per_second?.toFixed(2)}; [t/s] ` +
        `TG: ${timings?.predicted_per_second?.toFixed(2)}; [t/s]`
    );

    // const timing = completion?.timings?.prompt_ms
    //   ? completion?.timings?.prompt_ms
    //   : performance.now() - startTime;

    loggerCompletion.info("Request: finished");
    return;
    // return { content: completion.content } as const;
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
}

const paramDefaults = {
  stream: true,
  n_predict: 500,
  temperature: 0.2,
  // stop: ["</s>"],
};

export async function* llama(
  prompt: string,
  params = {},
  config: { controller?: AbortController; url?: string } = {}
) {
  let generation_settings;
  let controller = config.controller;

  if (!controller) {
    controller = new AbortController();
  }

  const completionParams = { ...paramDefaults, ...params, prompt };

  const response = await fetch(`${config.url}/completion`, {
    method: "POST",
    body: JSON.stringify(completionParams),
    headers: {
      Connection: "keep-alive",
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    // signal: controller.signal,
  });
  // @ts-ignore
  const reader = response.body.getReader<any>();
  const decoder = new TextDecoder();

  let content = "";
  let leftover = ""; // Buffer for partially read lines

  try {
    let cont = true;

    while (cont) {
      const result = await reader.read();
      if (result.done) {
        break;
      }

      // Add any leftover data to the current chunk of data
      const text = leftover + decoder.decode(result.value);

      // Check if the last character is a line break
      const endsWithLineBreak = text.endsWith("\n");

      // Split the text into lines
      let lines = text.split("\n");

      // If the text doesn't end with a line break, then the last line is incomplete
      // Store it in leftover to be added to the next chunk of data
      if (!endsWithLineBreak) {
        // @ts-ignore
        leftover = lines.pop();
      } else {
        leftover = ""; // Reset leftover if we have a line break at the end
      }

      // Parse all sse events and add them to result
      const regex = /^(\S+):\s(.*)$/gm;
      for (const line of lines) {
        const match = regex.exec(line);
        if (match) {
          // @ts-ignore
          result[match[1]] = match[2];
          // since we know this is llama.cpp, let's just decode the json in data
          // @ts-ignore
          if (result.data) {
            // @ts-ignore
            result.data = JSON.parse(result.data);
            // @ts-ignore
            content += result.data.content;

            // yield
            yield result;

            // if we got a stop token from server, we will break here
            // @ts-ignore
            if (result.data.stop) {
              // @ts-ignore
              if (result.data.generation_settings) {
                // @ts-ignore
                generation_settings = result.data.generation_settings;
              }
              cont = false;
              break;
            }
          }
          // @ts-ignore
          if (result.error) {
            // @ts-ignore
            result.error = JSON.parse(result.error);
            // @ts-ignore
            if (result.error.content.includes("slot unavailable")) {
              // Throw an error to be caught by upstream callers
              throw new Error("slot unavailable");
            } else {
              // @ts-ignore
              console.error(`llama.cpp error: ${result.error.content}`);
            }
          }
          // @ts-ignore
          if (result.error) {
            // @ts-ignore
            result.error = JSON.parse(result.error);
            // @ts-ignore
            console.error(`llama.cpp error: ${result.error.content}`);
          }
        }
      }
    }
  } catch (e) {
    // @ts-ignore
    if (e.name !== "AbortError") {
      console.error("llama error: ", e);
    }
    throw e;
  } finally {
    controller.abort();
  }

  return content;
}

export const llamaEventTarget = (prompt: string, params = {}, config = {}) => {
  const eventTarget = new EventTarget();
  (async () => {
    let content = "";
    for await (const chunk of llama(prompt, params, config)) {
      // @ts-ignore
      if (chunk.data) {
        // @ts-ignore
        content += chunk.data.content;
        eventTarget.dispatchEvent(
          // @ts-ignore
          new CustomEvent("message", { detail: chunk.data })
        );
      }
      // @ts-ignore
      if (chunk.data.generation_settings) {
        eventTarget.dispatchEvent(
          new CustomEvent("generation_settings", {
            // @ts-ignore
            detail: chunk.data.generation_settings,
          })
        );
      }
      // @ts-ignore
      if (chunk.data.timings) {
        eventTarget.dispatchEvent(
          // @ts-ignore
          new CustomEvent("timings", { detail: chunk.data.timings })
        );
      }
    }
    eventTarget.dispatchEvent(new CustomEvent("done", { detail: { content } }));
  })();
  return eventTarget;
};
