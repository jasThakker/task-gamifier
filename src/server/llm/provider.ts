import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export type LlmProvider = "anthropic" | "openai" | "google";

const DEFAULTS: Record<LlmProvider, string> = {
  anthropic: "claude-sonnet-4-5",
  openai: "gpt-4o",
  google: "gemini-1.5-pro",
};

function resolveProvider(): LlmProvider {
  const raw = (process.env.LLM_PROVIDER ?? "anthropic").toLowerCase();
  if (raw === "anthropic" || raw === "openai" || raw === "google") return raw;
  throw new Error(`unknown LLM_PROVIDER: ${raw}`);
}

export function getModel(): LanguageModel {
  const provider = resolveProvider();
  const modelId = process.env.LLM_MODEL ?? DEFAULTS[provider];
  switch (provider) {
    case "anthropic":
      return anthropic(modelId);
    case "openai":
      return openai(modelId);
    case "google":
      return google(modelId);
  }
}
