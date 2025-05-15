import { pgTable, serial, text, decimal } from "drizzle-orm/pg-core";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
});

export type InsertProducts = typeof productsTable.$inferInsert;
export type SelectProducts = typeof productsTable.$inferSelect;
