import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

const client = postgres(connectionString, {
  // DB_POOL_MAX: lower it locally when DATABASE_URL points at the session
  // pooler (port 5432, capped at 15 clients); production keeps 20.
  max: Number(process.env.DB_POOL_MAX) || 20,
  idle_timeout: 20,
  max_lifetime: 60 * 10,
  // Supabase connection pooler (port 6543) requires this
  prepare: false,
});

export const db = drizzle(client, { schema });
