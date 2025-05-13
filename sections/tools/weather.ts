import dotenv from "dotenv";
import OpenAI from "openai";
import { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources";
import * as readline from "readline";

dotenv.config({ path: ".env.local" });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const MOCK_WEATHER_DATA: {
  location: string;
  temperature: string;
  conditions: string;
  wind: string;
  humidity: string;
}[] = [
  {
    location: "San Francisco, CA",
    temperature: "70°F",
    conditions: "Sunny",
    wind: "5 mph",
    humidity: "60%"
  },
  {
    location: "New York City, NY",
    temperature: "65°F",
    conditions: "Partly Cloudy",
    wind: "10 mph",
    humidity: "55%"
  },
  {
    location: "Phoenix, AZ",
    temperature: "95°F",
    conditions: "Sunny",
    wind: "7 mph",
    humidity: "20%"
  },
  {
    location: "Dallas, TX",
    temperature: "80°F",
    conditions: "Clear",
    wind: "8 mph",
    humidity: "45%"
  },
  {
    location: "Miami, FL",
    temperature: "85°F",
    conditions: "Scattered Thunderstorms",
    wind: "12 mph",
    humidity: "75%"
  },
  {
    location: "Chicago, IL",
    temperature: "60°F",
    conditions: "Overcast",
    wind: "15 mph",
    humidity: "65%"
  }
];

const GREEN = "\x1b[32m";
const BLUE = "\x1b[34m";
const RESET = "\x1b[0m";

async function main() {
  let conversationHistory: ChatCompletionMessageParam[] = [];

  const weatherTool: ChatCompletionTool = {
    type: "function",
    function: {
      name: "getWeather",
      description: "Get the current weather for a location",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "The city and state, e.g. San Francisco, CA"
          }
        },
        required: ["location"]
      }
    }
  };

  const tools = [weatherTool];

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

        if (toolCall.function.name === "getWeather") {
          console.log(GREEN + `\nGetting weather for: ${args.location}` + RESET);
          const weatherData = MOCK_WEATHER_DATA.find((data) => data.location === args.location);
          const result = weatherData ? JSON.stringify(weatherData) : "Weather data not found for this location.";
          console.log(GREEN + "Weather data:" + RESET);
          console.log(GREEN + result + "\n" + RESET);

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
