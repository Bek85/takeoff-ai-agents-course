import dotenv from "dotenv";
import OpenAI from "openai";
import { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources";
import * as readline from "readline";

dotenv.config({ path: ".env.local" });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const MOCK_CUSTOMERS: {
  email: string;
  name: string;
  isRefunded: boolean;
  refundReason?: string;
}[] = [
  {
    email: "john.doe@example.com",
    name: "John Doe",
    isRefunded: false
  },
  {
    email: "jane.smith@example.com",
    name: "Jane Smith",
    isRefunded: true,
    refundReason: "Product was not as described"
  },
  {
    email: "alice.jones@example.com",
    name: "Alice Jones",
    isRefunded: false
  }
];
const GREEN = "\x1b[32m";
const BLUE = "\x1b[34m";
const RESET = "\x1b[0m";

async function main() {
  let conversationHistory: ChatCompletionMessageParam[] = [];

  const customerServiceTools: ChatCompletionTool[] = [
    {
      type: "function",
      function: {
        name: "getCustomer",
        description: "Gets the customer information for a given customer email.",
        parameters: {
          type: "object",
          properties: {
            email: {
              type: "string",
              description: "The customer email."
            }
          },
          required: ["email"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "updateCustomer",
        description: "Updates the customer's information. At least one field (besides oldEmail) must be provided.",
        parameters: {
          type: "object",
          properties: {
            oldEmail: {
              type: "string",
              description: "The customer's current email address."
            },
            newEmail: {
              type: "string",
              description: "The customer's new email address (optional)."
            },
            name: {
              type: "string",
              description: "The customer's new name (optional)."
            },
            isRefunded: {
              type: "boolean",
              description: "Whether the customer has been refunded (optional)."
            },
            refundReason: {
              type: "string",
              description: "The reason for the refund (optional)."
            }
          },
          required: ["oldEmail"]
        }
      }
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
              description: "The customer's email address."
            },
            reason: {
              type: "string",
              description: "The reason for the refund."
            }
          },
          required: ["email", "reason"]
        }
      }
    }
  ];

  const tools = [...customerServiceTools];

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
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
      tool_choice: "auto"
    });

    const message = response.choices[0].message;

    if (message.tool_calls) {
      conversationHistory.push(message);

      const toolCallPromises = message.tool_calls.map(async (toolCall) => {
        console.log(BLUE + `\nCalling function: ${toolCall.function.name}` + RESET);
        const args = JSON.parse(toolCall.function.arguments);

        if (toolCall.function.name === "getCustomer") {
          console.log(GREEN + `\nGetting customer info for: ${args.email}` + RESET);
          const customerData = MOCK_CUSTOMERS.find((customer) => customer.email === args.email);
          const result = customerData ? JSON.stringify(customerData) : "Customer not found.";
          console.log(GREEN + "Customer data:" + RESET);
          console.log(GREEN + result + "\n" + RESET);

          return {
            role: "tool",
            content: result,
            tool_call_id: toolCall.id
          } as ChatCompletionMessageParam;
        } else if (toolCall.function.name === "issueRefund") {
          console.log(GREEN + `\nIssuing refund for: ${args.email}` + RESET);
          const customerIndex = MOCK_CUSTOMERS.findIndex((customer) => customer.email === args.email);

          if (customerIndex !== -1) {
            MOCK_CUSTOMERS[customerIndex].isRefunded = true;
            MOCK_CUSTOMERS[customerIndex].refundReason = args.reason;
            const result = `Refund issued to ${args.email}. Reason: ${args.reason}`;
            console.log(GREEN + result + "\n" + RESET);

            return {
              role: "tool",
              content: result,
              tool_call_id: toolCall.id
            } as ChatCompletionMessageParam;
          } else {
            const result = "Customer not found. Refund could not be issued.";
            console.log(GREEN + result + "\n" + RESET);

            return {
              role: "tool",
              content: result,
              tool_call_id: toolCall.id
            } as ChatCompletionMessageParam;
          }
        } else if (toolCall.function.name === "updateCustomer") {
          console.log(GREEN + `\nUpdating customer info for: ${args.oldEmail}` + RESET);
          const customerIndex = MOCK_CUSTOMERS.findIndex((customer) => customer.email === args.oldEmail);

          if (customerIndex !== -1) {
            const customer = MOCK_CUSTOMERS[customerIndex];
            if (args.newEmail) customer.email = args.newEmail;
            if (args.name) customer.name = args.name;
            if (args.isRefunded !== undefined) customer.isRefunded = args.isRefunded;
            if (args.refundReason !== undefined) customer.refundReason = args.refundReason;

            const result = `Customer ${args.oldEmail} updated successfully. New email: ${args.newEmail || args.oldEmail}`;
            console.log(GREEN + result + "\n" + RESET);

            return {
              role: "tool",
              content: result,
              tool_call_id: toolCall.id
            } as ChatCompletionMessageParam;
          } else {
            const result = `Customer with email ${args.oldEmail} not found. Update failed.`;
            console.log(GREEN + result + "\n" + RESET);

            return {
              role: "tool",
              content: result,
              tool_call_id: toolCall.id
            } as ChatCompletionMessageParam;
          }
        }
      });

      const toolCallResults = await Promise.all(toolCallPromises);

      conversationHistory.push(...toolCallResults.filter(Boolean));

      const finalResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: conversationHistory
      });

      const finalMessage = finalResponse.choices[0].message;
      if (finalMessage.content) {
        console.log("AI:", finalMessage.content);
        conversationHistory.push({ role: "assistant", content: finalMessage.content });
      }
    } else if (message.content) {
      console.log("AI:", message.content);
      conversationHistory.push({ role: "assistant", content: message.content });
    }
  }

  rl.close();
}

main();
