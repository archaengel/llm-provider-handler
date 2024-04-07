import { Data, Effect, Console, Stream, Schedule } from "effect";
import * as Http from "@effect/platform/HttpServer";
import { OpenAiChat, OpenAiLive } from "../chatService";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const res = await program.pipe(Effect.provide(OpenAiLive), Effect.runPromise);
  return res;
}

class TimeoutError extends Data.TaggedError("Timeout")<{
  message: string;
}> {}

const program = Effect.gen(function* (_) {
  const { completions } = yield* _(OpenAiChat);

  const messages = yield* _(
    completions([
      { role: "system" as const, content: "You are a friendly assistant." },
      { role: "user" as const, content: "Hello!" },
    ]),
    Effect.retry(Schedule.exponential("10 millis")),
    Effect.timeoutFail({
      duration: "1 seconds",
      onTimeout: () =>
        new TimeoutError({ message: "Timed out waiting for Open AI" }),
    }),
  );

  for (const message of messages) {
    yield* _(Console.log(message));
  }

  const res = yield* _(
    Stream.fromIterable(messages),
    Stream.map((msg) => new TextEncoder().encode(msg)),
    Http.response.stream,
    Effect.map((res) => Http.response.toWeb(res)),
  );

  return res;
});
