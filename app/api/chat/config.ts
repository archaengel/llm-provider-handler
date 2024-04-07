import { Config } from "effect";

export const AppConfig = Config.all({
  region: Config.string("VERCEL_REGION").pipe(Config.option),
  openAiToken: Config.string("OPEN_AI_TOKEN"),
  anthropicToken: Config.string("ANTHROPIC_TOKEN"),
});
