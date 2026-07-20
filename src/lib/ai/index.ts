import type { AIProvider } from "./provider";
import { TemplateAIProvider } from "./templateProvider";

/**
 * Provider factory. The MVP ships the deterministic template provider.
 * To use a real LLM later, implement `AIProvider` with an OpenAI-compatible
 * client (server-side only — keys never reach the browser), then return it
 * here when `process.env.AI_PROVIDER === "openai"`. Nothing else changes.
 */

let provider: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (!provider) {
    provider = new TemplateAIProvider();
  }
  return provider;
}

export type { AIProvider } from "./provider";
