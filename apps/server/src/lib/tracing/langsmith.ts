import { env } from "../env";

export const tracingEnabled =
  env.LANGCHAIN_TRACING === "true" && env.LANGSMITH_API_KEY.length > 0;

// Set LangChain env vars so the langsmith SDK auto-activates
if (tracingEnabled) {
  process.env["LANGCHAIN_API_KEY"]    = env.LANGSMITH_API_KEY;
  process.env["LANGCHAIN_PROJECT"]    = env.LANGSMITH_PROJECT;
  process.env["LANGCHAIN_ENDPOINT"]   = env.LANGSMITH_ENDPOINT;
  process.env["LANGCHAIN_TRACING_V2"] = "true";
  console.log(
    `[tracing] LangSmith ON → project="${env.LANGSMITH_PROJECT}" endpoint=${env.LANGSMITH_ENDPOINT}`
  );
} else {
  process.env["LANGCHAIN_TRACING_V2"] = "false";
  const reason = !env.LANGSMITH_API_KEY
    ? "no LANGSMITH_API_KEY"
    : "LANGCHAIN_TRACING not set to true";
  console.log(`[tracing] LangSmith OFF (${reason})`);
}

// Re-export helpers for use in route handlers
export {
  wrapAISDK,
  createLangSmithProviderOptions,
} from "langsmith/experimental/vercel";
