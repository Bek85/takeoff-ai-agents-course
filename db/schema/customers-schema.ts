import { boolean, pgTable, serial, text } from "drizzle-orm/pg-core";

export const customersTable = pgTable("customers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  password: text("password").notNull(),
  isRefunded: boolean("is_refunded").notNull().default(false),
  refundReason: text("refund_reason"),
});

export type InsertCustomers = typeof customersTable.$inferInsert;
export type SelectCustomers = typeof customersTable.$inferSelect;
