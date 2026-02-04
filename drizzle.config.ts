import "dotenv/config";
import "dotenv";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations/",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
  verbose: true,
  // Disable strict to avoid aggressive NOT NULL drops on primary keys during push
  strict: false,
});
