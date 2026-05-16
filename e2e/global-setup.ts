import { createHash } from "crypto";
import { config } from "dotenv";
import { Client } from "pg";

config();

export const E2E_ONBOARD_EMAIL = "e2e-onboard@test.local";
export const E2E_ONBOARD_PASSWORD = "testpass123";
export const E2E_ONBOARD_USERNAME = "e2eonboard";
const E2E_USER_ID = "e2e_onboard_user_000001";

export default async function globalSetup() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const passwordHash = createHash("sha256")
    .update(E2E_ONBOARD_PASSWORD)
    .digest("hex");

  // Clean up today's logged entries for the demo member user to prevent accumulation
  // across repeated test runs (entries are not always cleaned up if a test fails mid-run).
  const todayDate = new Date().toISOString().split("T")[0];
  const memberRows = await client.query('SELECT id FROM "User" WHERE email = $1', ["member@demo.com"]);
  if (memberRows.rows.length > 0) {
    const memberId = memberRows.rows[0].id;
    await client.query('DELETE FROM "WorkoutLogEntry" WHERE "userId" = $1 AND date = $2', [memberId, todayDate]);
    await client.query('DELETE FROM "FoodEntry" WHERE "userId" = $1 AND date = $2', [memberId, todayDate]);
    await client.query('DELETE FROM "WaterEntry" WHERE "userId" = $1 AND date = $2', [memberId, todayDate]);
  }

  // Idempotent: delete then recreate
  await client.query('DELETE FROM "User" WHERE email LIKE \'e2e-%@test.local\'');

  await client.query(
    `INSERT INTO "User" (
      id, email, username, password,
      role, status, "planningMode",
      "onboardingComplete", "createdAt", "updatedAt"
    ) VALUES (
      $1, $2, $3, $4,
      'user'::"UserRole",
      'approved'::"UserStatus",
      'guided'::"PlanningMode",
      false, NOW(), NOW()
    )`,
    [E2E_USER_ID, E2E_ONBOARD_EMAIL, E2E_ONBOARD_USERNAME, passwordHash],
  );

  await client.end();
}
