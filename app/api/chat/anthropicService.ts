import { Effect, Console, Context, Data, Layer, Stream, Option } from "effect";
import * as Http from "@effect/platform/HttpClient";
import { Message } from "./messages";
import { AppConfig } from "./config";
import { ConfigError } from "effect/ConfigError";

export class UnavailableError extends Data.TaggedError("Unavailable")<{
  message: string;
}> {}

type AnthropicError = UnavailableError | ConfigError;

export class AnthropicChat extends Context.Tag("AnthropicChat")<
  AnthropicChat,
  {
    completions: (
      messages: Array<Message>,
    ) => Effect.Effect<Array<string>, AnthropicError>;
  }
>() {}

const completions = (messages: Array<Message>) =>
  Effect.gen(function* (_) {
    const { anthropicToken } = yield* _(AppConfig);
    const system = yield* _(
      Option.fromNullable(messages.find(({ role }) => role === "system")),
    );
    const body = yield* _(
      Http.body.json({
        model: "claude-3-opus-20240229",
        system: system.content,
        messages: messages.filter(({ role }) => role === "user"),
        max_tokens: 256,
        stream: true,
      }),
    );

    const stream = yield* _(
      Http.request.post("https://api.anthropic.com/v1/messages").pipe(
        Http.request.setHeaders({
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
          "anthropic-beta": "messages-2023-12-15",
          "x-api-key": anthropicToken,
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
      NoSuchElementException: () =>
        new UnavailableError({ message: "Expected a system prompt" }),
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

export const AnthropicChatLive = Layer.succeed(
  AnthropicChat,
  AnthropicChat.of({
    completions,
  }),
);
