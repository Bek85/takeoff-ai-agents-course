import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { customersTable } from "./schema/customers-schema";
import { memoriesTable } from "./schema/memories-schema";
import { productsTable } from "./schema/products-schema";
import { ordersTable, orderProductsTable } from "./schema/orders-schema";
import { addressesTable } from "./schema/addresses-schema";
import { cartsTable } from "./schema/carts-schema";

config({ path: ".env.local" });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const dbSchema = {
  // Tables
  memories: memoriesTable,
  customers: customersTable,
  products: productsTable,
  orders: ordersTable,
  orderProducts: orderProductsTable,
  addresses: addressesTable,
  carts: cartsTable,
};

function initializeDb(url: string) {
  const client = postgres(url, { prepare: false });
  return drizzle(client, { schema: dbSchema });
}

export const db = initializeDb(databaseUrl);
