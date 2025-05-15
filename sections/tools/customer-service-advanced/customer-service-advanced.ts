import dotenv from "dotenv";
import { eq } from "drizzle-orm";
import OpenAI from "openai";
import {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources";
import * as readline from "readline";
import { db } from "../../../db";
import { customersTable } from "../../../db/schema/customers-schema";

dotenv.config({ path: ".env.local" });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const GREEN = "\x1b[32m";
const BLUE = "\x1b[34m";
const RESET = "\x1b[0m";

async function addCustomerToDB(customer: typeof customersTable.$inferInsert) {
  await db.insert(customersTable).values(customer);
}

async function getAllCustomersFromDB() {
  return await db.query.customers.findMany();
}

async function getCustomerFromDB(email: string) {
  return await db.query.customers.findFirst({
    where: eq(customersTable.email, email),
  });
}

async function updateCustomerInDB(
  oldEmail: string,
  updates: Partial<typeof customersTable.$inferInsert>
) {
  await db
    .update(customersTable)
    .set(updates)
    .where(eq(customersTable.email, oldEmail));
  return await getCustomerFromDB(updates.email || oldEmail);
}

async function issueRefundInDB(email: string, reason: string) {
  await db
    .update(customersTable)
    .set({ isRefunded: true, refundReason: reason })
    .where(eq(customersTable.email, email));
  return await getCustomerFromDB(email);
}

async function main() {
  let conversationHistory: ChatCompletionMessageParam[] = [];

  const customerServiceTools: ChatCompletionTool[] = [
    {
      type: "function",
      function: {
        name: "addCustomer",
        description: "Adds a customer to the database.",
        parameters: {
          type: "object",
          properties: {
            email: {
              type: "string",
              description: "The customer's email address.",
            },
            name: {
              type: "string",
              description: "The customer's name.",
            },
          },
          required: ["email", "name"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "getAllCustomers",
        description: "Gets all customers from the database.",
        parameters: {
          type: "object",
          properties: {},
          required: [],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "getCustomer",
        description:
          "Gets the customer information for a given customer email.",
        parameters: {
          type: "object",
          properties: {
            email: {
              type: "string",
              description: "The customer email.",
            },
          },
          required: ["email"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "updateCustomer",
        description:
          "Updates the customer's information. At least one field (besides oldEmail) must be provided.",
        parameters: {
          type: "object",
          properties: {
            oldEmail: {
              type: "string",
              description: "The customer's current email address.",
            },
            newEmail: {
              type: "string",
              description: "The customer's new email address (optional).",
            },
            name: {
              type: "string",
              description: "The customer's new name (optional).",
            },
            isRefunded: {
              type: "boolean",
              description: "Whether the customer has been refunded (optional).",
            },
            refundReason: {
              type: "string",
              description: "The reason for the refund (optional).",
            },
          },
          required: ["oldEmail"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "issueRefund",
        description: "Issues a refund to a customer.",
        parameters: {
          type: "object",
          properties: {
            email: {
              type: "string",
              description: "The customer's email address.",
            },
            reason: {
              type: "string",
              description: "The reason for the refund.",
            },
          },
          required: ["email", "reason"],
        },
      },
    },
  ];

  const tools = [...customerServiceTools];

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const askQuestion = (query: string): Promise<string> => {
    return new Promise((resolve) => rl.question(query, resolve));
  };

  while (true) {
    const userInput = await askQuestion("You: ");
    if (userInput.toLowerCase() === "exit") break;

    conversationHistory.push({ role: "user", content: userInput });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      // model: "gpt-4o",
      messages: conversationHistory,
      tools: tools,
      tool_choice: "auto",
    });

    const message = response.choices[0].message;

    if (message.tool_calls) {
      conversationHistory.push(message);

      const toolCallPromises = message.tool_calls.map(async (toolCall) => {
        console.log(
          BLUE + `\nCalling function: ${toolCall.function.name}` + RESET
        );
        const args = JSON.parse(toolCall.function.arguments);

        if (toolCall.function.name === "addCustomer") {
          console.log(GREEN + "Adding customer..." + RESET);
          const newCustomer = await addCustomerToDB({
            email: args.email,
            name: args.name,
          });

          const result = `Customer ${args.email} added successfully.`;
          console.log(GREEN + result + "\n" + RESET);

          return {
            role: "tool",
            content: result,
            tool_call_id: toolCall.id,
          } as ChatCompletionMessageParam;
        }

        if (toolCall.function.name === "getAllCustomers") {
          console.log(GREEN + "Getting all customers..." + RESET);
          const customers = await getAllCustomersFromDB();
          const result = JSON.stringify(customers);
          console.log(GREEN + "All customers:" + RESET);
          console.log(GREEN + result + "\n" + RESET);

          return {
            role: "tool",
            content: result,
            tool_call_id: toolCall.id,
          } as ChatCompletionMessageParam;
        }

        if (toolCall.function.name === "getCustomer") {
          console.log(
            GREEN + `\nGetting customer info for: ${args.email}` + RESET
          );
          const customerData = await getCustomerFromDB(args.email);
          const result = customerData
            ? JSON.stringify(customerData)
            : "Customer not found.";
          console.log(GREEN + "Customer data:" + RESET);
          console.log(GREEN + result + "\n" + RESET);

          return {
            role: "tool",
            content: result,
            tool_call_id: toolCall.id,
          } as ChatCompletionMessageParam;
        } else if (toolCall.function.name === "issueRefund") {
          console.log(GREEN + `\nIssuing refund for: ${args.email}` + RESET);
          const updatedCustomer = await issueRefundInDB(
            args.email,
            args.reason
          );

          if (updatedCustomer) {
            const result = `Refund issued to ${args.email}. Reason: ${args.reason}`;
            console.log(GREEN + result + "\n" + RESET);

            return {
              role: "tool",
              content: result,
              tool_call_id: toolCall.id,
            } as ChatCompletionMessageParam;
          } else {
            const result = "Customer not found. Refund could not be issued.";
            console.log(GREEN + result + "\n" + RESET);

            return {
              role: "tool",
              content: result,
              tool_call_id: toolCall.id,
            } as ChatCompletionMessageParam;
          }
        } else if (toolCall.function.name === "updateCustomer") {
          console.log(
            GREEN + `\nUpdating customer info for: ${args.oldEmail}` + RESET
          );

          const updates: Partial<typeof customersTable.$inferInsert> = {};
          if (args.newEmail) updates.email = args.newEmail;
          if (args.name) updates.name = args.name;
          if (args.isRefunded !== undefined)
            updates.isRefunded = args.isRefunded;
          if (args.refundReason !== undefined)
            updates.refundReason = args.refundReason;

          const updatedCustomer = await updateCustomerInDB(
            args.oldEmail,
            updates
          );

          if (updatedCustomer) {
            const result = `Customer ${args.oldEmail} updated successfully. New email: ${updatedCustomer.email}`;
            console.log(GREEN + result + "\n" + RESET);

            return {
              role: "tool",
              content: result,
              tool_call_id: toolCall.id,
            } as ChatCompletionMessageParam;
          } else {
            const result = `Customer with email ${args.oldEmail} not found. Update failed.`;
            console.log(GREEN + result + "\n" + RESET);

            return {
              role: "tool",
              content: result,
              tool_call_id: toolCall.id,
            } as ChatCompletionMessageParam;
          }
        }
      });

      const toolCallResults = await Promise.all(toolCallPromises);

      conversationHistory.push(...toolCallResults.filter(Boolean));

      const finalResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: conversationHistory,
      });

      const finalMessage = finalResponse.choices[0].message;
      if (finalMessage.content) {
        console.log("AI:", finalMessage.content);
        conversationHistory.push({
          role: "assistant",
          content: finalMessage.content,
        });
      }
    } else if (message.content) {
      console.log("AI:", message.content);
      conversationHistory.push({ role: "assistant", content: message.content });
    }
  }

  rl.close();
}

main();
