import { parse } from "csv-parse/sync";
import fs from "fs";
import path from "path";
import { db } from "./index";
import { productsTable } from "./schema/products-schema";
import { usersTable } from "./schema/users-schema";
import { ordersTable, orderProductsTable } from "./schema/orders-schema";
import { addressesTable } from "./schema/addresses-schema";
import { cartsTable } from "./schema/carts-schema";

function parseAddress(address: string) {
  // Split the address into parts
  const parts = address.split(", ");
  if (parts.length < 2) {
    throw new Error(`Invalid address format: ${address}`);
  }

  // The last part should be the state and zip
  const lastPart = parts[parts.length - 1];
  const stateZipMatch = lastPart.match(/([A-Z]{2})\s+(\d{5})/);
  if (!stateZipMatch) {
    throw new Error(`Invalid state/zip format: ${lastPart}`);
  }

  const state = stateZipMatch[1];
  const zipCode = stateZipMatch[2];

  // The second to last part is usually the city
  const city = parts[parts.length - 2];

  // Everything before the city is the street
  const street = parts.slice(0, -2).join(", ");

  return {
    street,
    city,
    state,
    zipCode,
    country: "USA", // Default to USA since all addresses appear to be US addresses
  };
}

function parseDate(dateStr: string | undefined): Date {
  if (!dateStr) return new Date();
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) throw new Error();
    return date;
  } catch {
    return new Date();
  }
}

async function importCSVData() {
  try {
    // Clear existing data in reverse order of dependencies
    console.log("Clearing existing data...");
    await db.delete(cartsTable);
    await db.delete(addressesTable);
    await db.delete(orderProductsTable);
    await db.delete(ordersTable);
    await db.delete(productsTable);
    await db.delete(usersTable);
    console.log("Existing data cleared");

    // Import products
    const productsData = fs.readFileSync(
      path.join(__dirname, "csv", "products.csv"),
      "utf-8"
    );
    const products = parse(productsData, {
      columns: true,
      skip_empty_lines: true,
    }).map((row: any) => ({
      id: parseInt(row.id),
      name: row.name,
      price: parseFloat(row.price),
    }));

    await db.insert(productsTable).values(products);
    console.log("Products imported successfully");

    // Import users
    const usersData = fs.readFileSync(
      path.join(__dirname, "csv", "users.csv"),
      "utf-8"
    );
    const users = parse(usersData, {
      columns: true,
      skip_empty_lines: true,
    }).map((row: any) => ({
      id: parseInt(row.id),
      name: row.name,
      email: row.email,
      password: row.password,
    }));

    await db.insert(usersTable).values(users);
    console.log("Users imported successfully");

    // Create a set of valid user IDs for faster lookup
    const validUserIds = new Set(users.map((user) => user.id));

    // Import addresses
    const addressesData = fs.readFileSync(
      path.join(__dirname, "csv", "addresses.csv"),
      "utf-8"
    );
    const addresses = parse(addressesData, {
      columns: true,
      skip_empty_lines: true,
    })
      .map((row: any) => {
        const userId = parseInt(row.user_id);
        if (!validUserIds.has(userId)) {
          console.warn(`Skipping address for non-existent user ID: ${userId}`);
          return null;
        }

        try {
          const { street, city, state, zipCode, country } = parseAddress(
            row.address
          );
          return {
            id: parseInt(row.id),
            userId,
            street,
            city,
            state,
            zipCode,
            country,
            isDefault: false, // Default to false since we don't have this information
          };
        } catch (error) {
          console.warn(`Failed to parse address: ${row.address}`, error);
          return null;
        }
      })
      .filter(Boolean); // Remove any null entries

    if (addresses.length === 0) {
      throw new Error("No valid addresses found to import");
    }

    await db.insert(addressesTable).values(addresses);
    console.log("Addresses imported successfully");

    // Import carts
    const cartsData = fs.readFileSync(
      path.join(__dirname, "csv", "carts.csv"),
      "utf-8"
    );
    const carts = parse(cartsData, {
      columns: true,
      skip_empty_lines: true,
    })
      .map((row: any) => {
        const userId = parseInt(row.user_id);
        if (!validUserIds.has(userId)) {
          console.warn(`Skipping cart for non-existent user ID: ${userId}`);
          return null;
        }
        return {
          id: parseInt(row.id),
          userId,
          productId: parseInt(row.product_id),
          quantity: parseInt(row.quantity),
          createdAt: parseDate(row.created_at),
        };
      })
      .filter(Boolean); // Remove any null entries

    if (carts.length === 0) {
      throw new Error("No valid carts found to import");
    }

    await db.insert(cartsTable).values(carts);
    console.log("Carts imported successfully");

    // Import orders
    const ordersData = fs.readFileSync(
      path.join(__dirname, "csv", "orders.csv"),
      "utf-8"
    );
    const orders = parse(ordersData, {
      columns: true,
      skip_empty_lines: true,
    })
      .map((row: any) => {
        const userId = parseInt(row.user_id);
        if (!validUserIds.has(userId)) {
          console.warn(`Skipping order for non-existent user ID: ${userId}`);
          return null;
        }

        return {
          id: parseInt(row.id),
          userId,
          createdAt: parseDate(row.created),
        };
      })
      .filter(Boolean); // Remove any null entries

    if (orders.length === 0) {
      throw new Error("No valid orders found to import");
    }

    await db.insert(ordersTable).values(orders);
    console.log("Orders imported successfully");

    // Create a set of valid order IDs for faster lookup
    const validOrderIds = new Set(orders.map((order) => order.id));

    // Import order products
    const orderProductsData = fs.readFileSync(
      path.join(__dirname, "csv", "order_products.csv"),
      "utf-8"
    );
    const orderProducts = parse(orderProductsData, {
      columns: true,
      skip_empty_lines: true,
    })
      .map((row: any) => {
        const orderId = parseInt(row.order_id);
        if (!validOrderIds.has(orderId)) {
          console.warn(
            `Skipping order product for non-existent order ID: ${orderId}`
          );
          return null;
        }

        const quantity = parseInt(row.amount);
        if (isNaN(quantity)) {
          console.warn(
            `Invalid amount found in order_products.csv for row:`,
            row
          );
          return null;
        }
        return {
          id: parseInt(row.id),
          orderId,
          productId: parseInt(row.product_id),
          quantity: quantity,
        };
      })
      .filter(Boolean); // Remove any null entries

    if (orderProducts.length === 0) {
      throw new Error("No valid order products found to import");
    }

    await db.insert(orderProductsTable).values(orderProducts);
    console.log("Order products imported successfully");
  } catch (error) {
    console.error("Error importing data:", error);
  }
}

importCSVData();
