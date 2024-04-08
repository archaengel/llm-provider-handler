import { Data, Effect, Stream, Schedule, Layer } from "effect";
import * as Http from "@effect/platform/HttpServer";
import { OpenAiChat, OpenAiLive } from "./providers/openAiService";
import { AnthropicChat, AnthropicChatLive } from "./providers/anthropicService";
import { Message } from "./messages";

export const dynamic = "force-dynamic";

const HandlerLayer = Layer.mergeAll(OpenAiLive, AnthropicChatLive);

export async function GET() {
  const res = await program.pipe(
    Effect.provide(HandlerLayer),
    Effect.runPromise,
  );
  return res;
}

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

  const messages = yield* _(
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
  );

  const res = yield* _(
    Stream.fromIterable(messages),
    Stream.map((msg) => new TextEncoder().encode(msg)),
    Http.response.stream,
    Effect.map((res) => Http.response.toWeb(res)),
  );

  return res;
});
