import {
  pgTable,
  serial,
  integer,
  timestamp,
  foreignKey,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users-schema";
import { productsTable } from "./products-schema";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orderProductsTable = pgTable("order_products", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => ordersTable.id),
  productId: integer("product_id")
    .notNull()
    .references(() => productsTable.id),
  quantity: integer("quantity").notNull(),
});

export type InsertOrders = typeof ordersTable.$inferInsert;
export type SelectOrders = typeof ordersTable.$inferSelect;
export type InsertOrderProducts = typeof orderProductsTable.$inferInsert;
export type SelectOrderProducts = typeof orderProductsTable.$inferSelect;
