import { pgTable, text, integer, boolean } from "drizzle-orm/pg-core";

export const addressesTable = pgTable("addresses", {
  id: integer("id").primaryKey(),
  userId: integer("user_id").notNull(),
  street: text("street").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  country: text("country").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
});
