import { prisma } from "@repo/db";
import { auth } from "../lib/auth"; // Re-uses the server application's pre-configured auth instance
import "dotenv/config";
import fs from "fs";
import path from "path";

async function main() {
  console.log("Seeding database (Server App workflow)...");

  // 1. Create Admin User
  const adminEmail = "admin@example.com";
  // 1 & 2. Create Admin User and Account via Better Auth API
  // This ensures the password is correctly hashed
  try {
    // Delete existing admin user to ensure the new one has a properly hashed password
    const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (existing) {
        console.log(`Deleting existing user ${adminEmail} to fix hashing...`);
        await prisma.user.delete({ where: { email: adminEmail } });
    }

    await auth.api.signUpEmail({
      body: {
        name: "Admin User",
        email: adminEmail,
        password: "password123",
      },
    });
    console.log(`Created new admin account with hashed password: ${adminEmail}`);
  } catch (e: any) {
    console.warn(`Signup flow warning: ${e.message}`);
  }

  // Get the user record to use their ID for the scenario
  const adminUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!adminUser) {
    throw new Error("Failed to create or find admin user during seed.");
  }

  // 3. Load Initial Scenario (Falklands 1982)
  // Relative path jumping out of `apps/server` to `apps/web`
  const falklandPath = path.join(process.cwd(), "..", "web", "public", "scenarios", "falkland82.json");
  let falklandData: any;
  try {
    falklandData = JSON.parse(fs.readFileSync(falklandPath, "utf-8"));
  } catch (e) {
    console.warn(`Could not find Falklands JSON at ${falklandPath}, skipping or creating dummy...`);
    falklandData = { 
      name: "Falklands 1982", 
      description: "Initial scenario data from Falklands 1982." 
    };
  }

  await prisma.scenario.upsert({
    where: { id: "falkland-82-id" },
    update: {
      name: falklandData.name || "Falklands 1982",
      description: falklandData.description || "Initial scenario data from Falklands 1982.",
      startTime: falklandData.startTime ? BigInt(new Date(falklandData.startTime).getTime()) : null,
      timeZone: falklandData.timeZone || "UTC",
      data: falklandData,
    },
    create: {
      id: "falkland-82-id",
      name: falklandData.name || "Falklands 1982",
      description: falklandData.description || "Initial scenario data from Falklands 1982.",
      startTime: falklandData.startTime ? BigInt(new Date(falklandData.startTime).getTime()) : null,
      timeZone: falklandData.timeZone || "UTC",
      data: falklandData,
      userId: adminUser.id,
    },
  });

  console.log("Seed completed successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Error during seed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
