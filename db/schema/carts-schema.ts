import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

export const cartsTable = pgTable("carts", {
  id: integer("id").primaryKey(),
  userId: integer("user_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
