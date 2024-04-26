<h1 align="center">LLM Fallback Handler</h1>
<p>
  <img alt="Version" src="https://img.shields.io/badge/version-0.1.0-blue.svg?cacheSeconds=2592000" />
</p>

> A vercel function written in Effect which calls out to OpenAI's completions endpoint, falling back to Anthropic's messages endpoint in the event that OpenAI's endpoint is down.

## Setting up your dev environment

### Prequisites
With nix and nix flakes enabled, you should be able to clone this repo and run to get dropped into a shell with the correct versions of node and pnpm to get started with `nix develop`. Otherwise, you can install the correct versions of `node` and `pnpm` as stated in their respective bootstrapping guides.

To use Jaeger to visualize the exported open telemetry traces, you'll need `docker` as well.

The first time setting up the repo you'll need to install the project's node dependencies using `pnpm install`.

### Secrets
The project expects API keys for Open AI and Anthropic.
- [Open AI API Keys](https://platform.openai.com/api-keys)
- [Anthropic API Keys](https://console.anthropic.com/settings/keys)

Grab keys from the dashboards above and drop them into a `.env.local` file at the project's root.

```
# .env.local

OPEN_AI_TOKEN=<OPEN_AI_API_KEY>
ANTHROPIC_TOKEN=<ANTHROPIC_API_KEY>
```

## Dev

Run Jaeger with the docker command below. You can pull up Jaeger's UI at http://localhost:16686

```sh
docker run --rm \
  -e COLLECTOR_ZIPKIN_HOST_PORT=:9411 \
  -p 16686:16686 \
  -p 4317:4317 \
  -p 4318:4318 \
  -p 9411:9411 \
  jaegertracing/all-in-one:latest
```

Run the dev handler with
```sh
pnpm dev
```
To send a request to the endpoint, run the following from a terminal:
```sh
curl -v localhost:3000/api/chat
```

## Run tests

```sh
pnpm test
```

## Deploy
To deploy the function, run

```sh
vercel --env OPEN_AI_TOKEN=<OPEN_AI_TOKEN> --env ANTHROPIC__TOKEN=<ANTHROPIC_TOKEN>
```
