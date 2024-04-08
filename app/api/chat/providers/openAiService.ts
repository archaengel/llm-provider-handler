import { Effect, Context, Data, Layer, Stream } from "effect";
import * as Http from "@effect/platform/HttpClient";
import { Message } from "../messages";
import { AppConfig } from "../config";
import { ConfigError } from "effect/ConfigError";

export class UnavailableError extends Data.TaggedError("Unavailable")<{
  message: string;
}> {}

type OpenAiChatError = UnavailableError | ConfigError;

export class OpenAiChat extends Context.Tag("OpenAiChat")<
  OpenAiChat,
  {
    completions: (
      messages: Array<Message>,
    ) => Effect.Effect<Array<string>, OpenAiChatError>;
  }
>() {}

const completions = (messages: Array<Message>) =>
  Effect.gen(function* (_) {
    const { openAiToken } = yield* _(AppConfig);
    const body = yield* _(
      Http.body.json({
        model: "gpt-3.5-turbo",
        messages,
        stream: true,
      }),
    );

    const stream = yield* _(
      Http.request.post("https://api.openai.com/v1/chat/completions").pipe(
        Http.request.setHeaders({
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiToken}`,
        }),
        Http.request.setBody(body),
        Http.client.fetch(),
        Effect.map((res) => res.stream),
        Effect.map(Stream.decodeText("utf-8")),
        Effect.flatMap((stream) =>
          Stream.runFold([], (acc: string[], msg: string) => [...acc, msg])(
            stream,
          ),
        ),
      ),
    );

    return stream;
  }).pipe(
    Effect.scoped,
    Effect.catchTags({
      BodyError: () =>
        new UnavailableError({
          message: `Error setting body with messages ${messages}`,
        }),
      RequestError: ({ message, methodAndUrl }) =>
        new UnavailableError({
          message: `Unexpected error occurred hitting ${methodAndUrl}: ${message}`,
        }),
      ResponseError: ({ message, methodAndUrl }) =>
        new UnavailableError({
          message: `Unexpected error occurred hitting ${methodAndUrl}: ${message}`,
        }),
    }),
  );

export const OpenAiLive = Layer.succeed(
  OpenAiChat,
  OpenAiChat.of({
    completions,
  }),
);
