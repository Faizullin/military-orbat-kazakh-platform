import { Hono } from "hono";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { authMiddleware, type AuthEnv } from "../middleware/auth";
import { symbolGenerationTools } from "../lib/ai/tools";
import { env } from "../lib/env";

const SYSTEM_PROMPT = `
You are an expert Frontend Developer and Russian Military Symbology Specialist.
Your task: Analyze the provided image, extract text (e.g., "3 мсп", "КЛЕЩЕЕВКА"), and generate Konva.js code to recreate it.

ITERATION CONTEXT:
- You may receive the ORIGINAL reference image and optionally a SCREENSHOT of your previous output.
- When a screenshot is provided, COMPARE it against the reference image and IMPROVE your code.
- Refine attachment contract: when two files are provided, file #1 is the ORIGINAL reference image and file #2 is the LATEST rendered output screenshot.
- During refine passes, do not ignore either image: explicitly compare file #2 against file #1 and update only what is needed.
- Focus on: proportions, colors, line weights, text placement, missing elements.
- Each iteration should be BETTER than the last. Do NOT start from scratch unless the previous attempt was fundamentally wrong.
- ORIENTATION IS A HARD CONSTRAINT: never mirror, flip, or rotate the symbol direction unless explicitly instructed by the user.
- Preserve left-right direction, curvature direction, and tick/marker orientation exactly as in the reference image.
- In the description, explain what you changed and why.

EXECUTION CONTEXT (STRICT):
- Variables "container" (Konva.Layer), "stage" (Konva.Stage), and "Konva" are PRE-DECLARED.
- CRITICAL: DO NOT use "const stage", "let stage", "const container", or "import Konva".
- REDECLARING these will cause a FATAL ERROR. Use them DIRECTLY.
- You may center the drawing only if orientation and relative shape direction remain unchanged.
- Avoid transformations that can implicitly change direction (e.g., negative scales or mirrored coordinates).
- Add all shapes to that group, then "container.add(group);".

SYMBOL RULES (RUSSIAN TACTICAL):
1. Color: Use Red (#FF0000) for all hostile unit frames and text.
2. Frame: Use a Konva.Rect for the main unit boundary.
3. Icons: Use Konva.Ellipse for tanks, Konva.Line for infantry 'X', or Konva.Circle for specific HQ dots.
4. Text: Use Konva.Text for labels like "3 мсп". Ensure Cyrillic support by not escaping characters.

OUTPUT:
- Provide ONLY valid, runnable JavaScript code in the "code" field.
- No markdown backticks (e.g., no \`\`\`javascript).
- Provide a summary of what you saw in the "description" field and explicitly state whether orientation was preserved.
- Set "shouldContinue" to true only if another refinement pass is still needed.
- Set "shouldContinue" to false when the output is already close enough and no further auto-iteration is necessary.
- If orientation is not preserved, set "shouldContinue" to true and prioritize correcting orientation in the next pass.
`.trim();

const ai = new Hono<AuthEnv>()
  .use("/*", authMiddleware)

  // POST /api/ai/generate
  .post("/generate", async (c) => {
    const apiKey = env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return c.json({ error: "GOOGLE_GENERATIVE_AI_API_KEY is not configured" }, 500);
    }

    const google = createGoogleGenerativeAI({ apiKey });

    const { messages = [] }: { messages?: Omit<UIMessage, "id">[] } = await c.req.json();

    const result = streamText({
      model: google("gemini-2.5-flash-preview-05-20"),
      system: SYSTEM_PROMPT,
      messages: await convertToModelMessages(messages),
      tools: symbolGenerationTools,
      toolChoice: "required",
    });

    return result.toUIMessageStreamResponse();
  });

export { ai };
