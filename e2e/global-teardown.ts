import { config } from "dotenv";
import { Client } from "pg";

config();

export default async function globalTeardown() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query('DELETE FROM "User" WHERE email LIKE \'e2e-%@test.local\'');
  await client.end();
}
