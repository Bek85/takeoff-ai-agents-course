import dotenv from "dotenv";
import OpenAI from "openai";
import { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources";
import * as readline from "readline";

dotenv.config({ path: ".env.local" });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const MOCK_CONTENT: {
  content: string;
  date: string;
}[] = [
  {
    content: "Mars has the largest volcano in the solar system, Olympus Mons, which is about 13.6 miles high.",
    date: "2024-10-01"
  },
  {
    content: "A day on Mars is about 40 minutes longer than a day on Earth.",
    date: "2024-10-02"
  },
  {
    content: "Mars has two moons, Phobos and Deimos, which are believed to be captured asteroids.",
    date: "2024-10-03"
  }
];

const GREEN = "\x1b[32m";
const BLUE = "\x1b[34m";
const RESET = "\x1b[0m";

async function main() {
  let conversationHistory: ChatCompletionMessageParam[] = [];

  const storageTools: ChatCompletionTool[] = [
    {
      type: "function",
      function: {
        name: "getStorage",
        description: "Get the content based on the date.",
        parameters: {
          type: "object",
          properties: {
            date: {
              type: "string",
              description: "The date to get the content for. Example: 2024-10-01"
            }
          },
          required: ["date"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "addStorage",
        description: "Add content to the storage.",
        parameters: {
          type: "object",
          properties: {
            content: {
              type: "string",
              description: "The content to add to the storage."
            },
            date: {
              type: "string",
              description: "The date to add the content for. Example: 2024-10-01"
            }
          },
          required: ["content", "date"]
        }
      }
    }
  ];

  const tools = [...storageTools];

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

        if (toolCall.function.name === "getStorage") {
          console.log(GREEN + `\nGetting storage for: ${args.date}` + RESET);
          const storageData = MOCK_CONTENT.find((data) => data.date === args.date);
          const result = storageData ? JSON.stringify(storageData) : "Storage data not found for this date.";
          console.log(GREEN + "Storage data:" + RESET);
          console.log(GREEN + result + "\n" + RESET);

          return {
            role: "tool",
            content: result,
            tool_call_id: toolCall.id
          } as ChatCompletionMessageParam;
        } else if (toolCall.function.name === "addStorage") {
          console.log(GREEN + `\nAdding storage for: ${args.date}` + RESET);
          MOCK_CONTENT.push({ content: args.content, date: args.date });
          const result = "Storage added successfully.";
          console.log(GREEN + result + RESET);

          return {
            role: "tool",
            content: result,
            tool_call_id: toolCall.id
          } as ChatCompletionMessageParam;
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
