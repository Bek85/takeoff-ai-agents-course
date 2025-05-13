import { config } from "dotenv";
import { encode } from "gpt-tokenizer";
import OpenAI from "openai";
import { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources";
import * as readline from "readline";
import { db } from "../../db";
import { memoriesTable } from "../../db/schema/memories-schema";
import { generateEmbeddings } from "../../helpers/generate-embeddings";
import { retrieveMemories } from "../../helpers/retrieve-memories";

config({ path: ".env.local" });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const GREEN = "\x1b[32m";
const BLUE = "\x1b[34m";
const RESET = "\x1b[0m";

async function main() {
  let conversationHistory: ChatCompletionMessageParam[] = [];

  let memoryTools: ChatCompletionTool[] = [
    {
      type: "function",
      function: {
        name: "getMemory",
        description: "Use this function to get a memory from your long term memory.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The query to search your long term memory."
            }
          },
          required: ["query"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "saveMemory",
        description: "Use this function to save a memory to your long term memory.",
        parameters: {
          type: "object",
          properties: {
            content: {
              type: "string",
              description: "The content to save to your long term memory."
            }
          },
          required: ["content"]
        }
      }
    }
  ];

  const tools = [...memoryTools];

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const askQuestion = (query: string): Promise<string> => {
    return new Promise((resolve) => rl.question(query, resolve));
  };

  const handleToolCalls = async (message: OpenAI.Chat.Completions.ChatCompletionMessage) => {
    for (const toolCall of message.tool_calls) {
      const args = JSON.parse(toolCall.function.arguments);
      let result: any;

      if (toolCall.function.name === "getMemory") {
        const memories = await retrieveMemories(args.query);
        result = memories.map((m) => m.content).join("\n");
        console.log(BLUE + "\nRetrieved memories:" + RESET);
        console.log(BLUE + result + "\n" + RESET);
      } else if (toolCall.function.name === "saveMemory") {
        const [embedding] = await generateEmbeddings([args.content]);
        const tokenCount = encode(args.content).length;
        await db.insert(memoriesTable).values({
          content: args.content,
          embedding: embedding,
          tokenCount: tokenCount
        });
        result = "Memory saved successfully.";
        console.log(GREEN + "\nSaved memory:" + RESET);
        console.log(GREEN + args.content + "\n" + RESET);
      }

      const functionCallResultMessage: ChatCompletionMessageParam = {
        role: "tool",
        content: JSON.stringify(result),
        tool_call_id: toolCall.id
      };

      conversationHistory.push(message);
      conversationHistory.push(functionCallResultMessage);
    }
  };

  while (true) {
    const userInput = await askQuestion("You: ");
    if (userInput.toLowerCase() === "exit") break;

    const systemPrompt = `You are a helpful assistant with access to long-term memory.

You can use the getMemory function to retrieve relevant memories, and the saveMemory function to save new information to your long-term memory.

Use your memories to keep track of information about the user.`;

    conversationHistory.push({ role: "user", content: userInput });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }, ...conversationHistory],
      tools: tools,
      tool_choice: "auto"
    });

    const message = response.choices[0].message;

    if (message.tool_calls) {
      await handleToolCalls(message);

      const finalResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }, ...conversationHistory]
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
