import { config } from "dotenv";
import postgres from "postgres";
import fs from "fs";
import path from "path";

config({ path: ".env.local" });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

async function migrate() {
  const sql = postgres(databaseUrl);

  try {
    const migration = fs.readFileSync(
      path.join(__dirname, "migrations", "0003_add_addresses_and_carts.sql"),
      "utf-8"
    );

    await sql.unsafe(migration);
    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await sql.end();
  }
}

migrate();
