import { Effect, Layer } from "effect";
import { OpenAiLive } from "./providers/openAiService";
import { AnthropicChatLive } from "./providers/anthropicService";
import { NodeSdkLive } from "../otel";
import { program } from "./program";

export const dynamic = "force-dynamic";

const HandlerLayer = Layer.mergeAll(OpenAiLive, AnthropicChatLive, NodeSdkLive);

export async function GET(request: Request) {
  const res = await Effect.log(`referrer: ${request.referrer}`).pipe(
    Effect.zipRight(program),
    Effect.withSpan("main"),
    Effect.provide(HandlerLayer),
    Effect.runPromise,
  );
  return res;
}
