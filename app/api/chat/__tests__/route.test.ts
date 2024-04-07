import {
  Context,
  Effect,
  Either,
  Fiber,
  Layer,
  Option,
  TestClock,
  TestContext,
  pipe,
} from "effect";
import { OpenAiChat, UnavailableError } from "../providers/openAiService";
import { Message } from "../messages";
import { program } from "../route";
import { AnthropicChat as AnthropicChat } from "../providers/anthropicService";

type FailureCaseLiterals = "Unavailable" | undefined;

class OpenAiFailureCase extends Context.Tag("OpenAiFailureCase")<
  OpenAiFailureCase,
  FailureCaseLiterals
>() {}

const OpenAiTest = Layer.effect(
  OpenAiChat,
  Effect.gen(function* (_) {
    const failureCase = yield* _(OpenAiFailureCase);

    return {
      completions: (_messages: Message[]) =>
        Effect.gen(function* (_) {
          if (failureCase) {
            return yield* _(
              Effect.fail(new UnavailableError({ message: "Open AI is down" })),
            );
          }

          return ["This", "is", "an", "OpenAI", "completion"];
        }),
    };
  }),
);

class AnthropicFailureCase extends Context.Tag("AnthropicFailureCase")<
  AnthropicFailureCase,
  FailureCaseLiterals
>() {}

const AnthropicTest = Layer.effect(
  AnthropicChat,
  Effect.gen(function* (_) {
    const failureCase = yield* _(AnthropicFailureCase);

    return {
      completions: (_messages: Message[]) =>
        Effect.gen(function* (_) {
          if (failureCase) {
            return yield* _(
              Effect.fail(
                new UnavailableError({ message: "Anthropic is down" }),
              ),
            );
          }

          return ["This", "is", "an", "Anthropic", "completion"];
        }),
    };
  }),
);

const TestLayer = Layer.mergeAll(OpenAiTest, AnthropicTest);

describe("route", () => {
  it("times out when both providers are down", async () => {
    await Effect.gen(function* (_) {
      const f = yield* _(
        program.pipe(
          Effect.provide(TestLayer),
          Effect.provideService(OpenAiFailureCase, "Unavailable"),
          Effect.provideService(AnthropicFailureCase, "Unavailable"),
          Effect.either,
          Effect.fork,
        ),
      );

      yield* _(TestClock.adjust("8 seconds"));

      const result = yield* _(Fiber.join(f));

      expect(Either.isLeft(result)).toBeTruthy();
      const left = pipe(result, Either.getLeft, Option.getOrNull);
      expect(left?._tag).toBe("Timeout");
    }).pipe(Effect.provide(TestContext.TestContext), Effect.runPromise);
  });

  it("returns a stream of responses when open ai is available", async () => {
    await Effect.gen(function* (_) {
      const f = yield* _(
        program.pipe(
          Effect.provide(TestLayer),
          Effect.provideService(OpenAiFailureCase, undefined),
          Effect.provideService(AnthropicFailureCase, "Unavailable"),
          Effect.either,
          Effect.fork,
        ),
      );

      yield* _(TestClock.adjust("8 seconds"));

      const result = yield* _(Fiber.join(f));

      expect(Either.isRight(result)).toBeTruthy();
      const right = pipe(result, Either.getOrThrow);
      expect(right).toBeTruthy();
      expect(right.body).toBeTruthy();
    }).pipe(Effect.provide(TestContext.TestContext), Effect.runPromise);
  });

  it("returns a stream of responses when open ai is unavailable and anthropic is up", async () => {
    await Effect.gen(function* (_) {
      const f = yield* _(
        program.pipe(
          Effect.provide(TestLayer),
          Effect.provideService(OpenAiFailureCase, "Unavailable"),
          Effect.provideService(AnthropicFailureCase, undefined),
          Effect.either,
          Effect.fork,
        ),
      );

      yield* _(TestClock.adjust("8 seconds"));

      const result = yield* _(Fiber.join(f));

      expect(Either.isRight(result)).toBeTruthy();
      const right = pipe(result, Either.getOrThrow);
      expect(right).toBeTruthy();
      expect(right.body).toBeTruthy();
    }).pipe(Effect.provide(TestContext.TestContext), Effect.runPromise);
  });
});
