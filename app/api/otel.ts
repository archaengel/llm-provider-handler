import { NodeSdk } from "@effect/opentelemetry";
import {
  BatchSpanProcessor,
  ConsoleSpanExporter,
} from "@opentelemetry/sdk-trace-base";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

const SERVICE_NAME = "markprompt-chat";
const SERVICE_VERSION = "dont-cry";
const RESOURCE = { serviceName: SERVICE_NAME, serviceVersion: SERVICE_VERSION };

export const NodeSdkLive = NodeSdk.layer(() => ({
  resource: RESOURCE,
  spanProcessor: new BatchSpanProcessor(new OTLPTraceExporter()),
}));

export const NodeSdkTest = NodeSdk.layer(() => ({
  resource: RESOURCE,
  spanProcessor: new BatchSpanProcessor(new ConsoleSpanExporter()),
}));

