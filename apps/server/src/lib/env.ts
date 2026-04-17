import { config } from "dotenv";
import { resolve } from "path";
import { z } from "zod";

// Load .env files: .env.local overrides .env
config({ path: resolve(process.cwd(), ".env.local"), override: true });
config({ path: resolve(process.cwd(), ".env") });

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  BETTER_AUTH_SECRET: z.string().min(16, "BETTER_AUTH_SECRET must be at least 16 characters"),
  BETTER_AUTH_URL: z.string().optional(),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CORS_ORIGIN: z
    .string()
    .default("http://localhost:5173")
    .transform((s) => s.split(",").map((o) => o.trim())),

  // Storage
  STORAGE_PROVIDER: z.enum(["cloudinary", "vercel", "local"]).default("cloudinary"),
  UPLOAD_FOLDER_PREFIX: z.string().default("military-orbat"),

  // Cloudinary (optional — required only when STORAGE_PROVIDER=cloudinary)
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // Vercel Blob (optional — required only when STORAGE_PROVIDER=vercel)
  BLOB_READ_WRITE_TOKEN: z.string().optional(),

  // AI (optional — required only for symbol generation)
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
});

function validateEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const formatted = parsed.error.format();
    console.error("\n  Invalid environment variables:");
    for (const [key, val] of Object.entries(formatted)) {
      if (key === "_errors") continue;
      const errors = (val as { _errors: string[] })._errors;
      if (errors?.length) {
        console.error(`    ${key}: ${errors.join(", ")}`);
      }
    }
    console.error("\n  Copy .env.example to .env and fill in the values.\n");
    process.exit(1);
  }
  return parsed.data;
}

export const env = validateEnv();
