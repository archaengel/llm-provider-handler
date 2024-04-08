import { Data, Effect, Stream, Schedule, Either } from "effect";
import * as Http from "@effect/platform/HttpServer";
import { OpenAiChat } from "./providers/openAiService";
import { AnthropicChat } from "./providers/anthropicService";
import { Message } from "./messages";

class TimeoutError extends Data.TaggedError("Timeout")<{
  message: string;
}> {}

export const program = Effect.gen(function* (_) {
  const { completions } = yield* _(OpenAiChat);
  const { completions: antCompletions } = yield* _(AnthropicChat);

  const input: Message[] = [
    { role: "system", content: "You are a friendly assistant." },
    { role: "user", content: "Hello!" },
  ];

  const eitherMessages = yield* _(
    completions(input),
    Effect.retry(Schedule.exponential("10 millis")),
    Effect.timeoutFail({
      duration: "4 seconds",
      onTimeout: () =>
        new TimeoutError({ message: "Timed out waiting for Open AI" }),
    }),
    Effect.orElse(() =>
      antCompletions(input).pipe(
        Effect.retry(Schedule.exponential("10 millis")),
        Effect.timeoutFail({
          duration: "4 seconds",
          onTimeout: () =>
            new TimeoutError({ message: "Timed out waiting for Anthropic" }),
        }),
      ),
    ),
    Effect.withSpan("completions"),
    Effect.either,
  );

  if (Either.isLeft(eitherMessages)) {
    return yield* _(
      Http.response.empty(),
      Http.response.setStatus(500, "Internal Server Error"),
      Effect.map((res) => Http.response.toWeb(res)),
    );
  }

  const messages = eitherMessages.right;

  const res = yield* _(
    Stream.fromIterable(messages),
    Stream.encodeText,
    Http.response.stream,
    Effect.map((res) => Http.response.toWeb(res)),
  );

  return res;
});
