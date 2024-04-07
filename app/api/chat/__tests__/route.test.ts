import {
  Chunk,
  Context,
  Effect,
  Either,
  Layer,
  Option,
  Stream,
  pipe,
} from "effect";
import { OpenAiChat, UnavailableError } from "../../chatService";
import { Message } from "../../messages";
import { program } from "../route";
import { fromReadableStream } from "effect/Stream";

type FailureCaseLiterals = "Unavailable" | undefined;

class FailureCase extends Context.Tag("FailureCase")<
  FailureCase,
  FailureCaseLiterals
>() {}

const OpenAiTest = Layer.effect(
  OpenAiChat,
  Effect.gen(function* (_) {
    const failureCase = yield* _(FailureCase);

    return {
      completions: (_messages: Message[]) =>
        Effect.gen(function* (_) {
          if (failureCase) {
            return yield* _(
              Effect.fail(new UnavailableError({ message: "Open AI is down" })),
            );
          }

          return ["This", "is", "a", "completion"];
        }),
    };
  }),
);

describe("route", () => {
  it("times out when open ai is down", async () => {
    const result = await program.pipe(
      Effect.provide(OpenAiTest),
      Effect.provideService(FailureCase, "Unavailable"),
      Effect.either,
      Effect.runPromise,
    );

    expect(Either.isLeft(result)).toBeTruthy();
    const left = pipe(result, Either.getLeft, Option.getOrNull);
    expect(left?._tag).toBe("Timeout");
  });

  it("returns a stream of responses when open ai is available", async () => {
    const result = await program.pipe(
      Effect.provide(OpenAiTest),
      Effect.provideService(FailureCase, undefined),
      Effect.either,
      Effect.runPromise,
    );

    expect(Either.isRight(result)).toBeTruthy();
    const right = pipe(result, Either.getOrThrow);
    expect(right).toBeTruthy();
    expect(right.body).toBeTruthy();
  });
});
