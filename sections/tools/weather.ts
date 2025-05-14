import dotenv from "dotenv";
import OpenAI from "openai";
import {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources";
import * as readline from "readline";
import fetch from "node-fetch";

dotenv.config({ path: ".env.local" });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Weather API key
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

const GREEN = "\x1b[32m";
const BLUE = "\x1b[34m";
const RESET = "\x1b[0m";

// Function to get real weather data from WeatherAPI.com
async function fetchWeatherData(location: string) {
  try {
    // Using the exact format from the example
    const response = await fetch(
      `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(
        location
      )}&aqi=no`
    );

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();

    // Format the data to match our expected structure
    return {
      location: `${data.location.name}, ${data.location.region}`,
      temperature: `${data.current.temp_c}°C`,
      conditions: data.current.condition.text,
      wind: `${data.current.wind_kph} kph`,
      humidity: `${data.current.humidity}%`,
      // Add more details from the rich response
      feelsLike: `${data.current.feelslike_c}°C`,
      uvIndex: data.current.uv,
      updated: data.current.last_updated,
    };
  } catch (error) {
    console.error("Error fetching weather data:", error);
    return null;
  }
}

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
            description:
              "The city and state/country, e.g. San Francisco, CA or London, UK",
          },
        },
        required: ["location"],
      },
    },
  };

  const tools = [weatherTool];

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

        if (toolCall.function.name === "getWeather") {
          console.log(
            GREEN + `\nGetting weather for: ${args.location}` + RESET
          );

          // Call the real weather API
          const weatherData = await fetchWeatherData(args.location);

          const result = weatherData
            ? JSON.stringify(weatherData)
            : "Weather data not found for this location.";

          console.log(GREEN + "Weather data:" + RESET);
          console.log(GREEN + result + "\n" + RESET);

          return {
            role: "tool",
            content: result,
            tool_call_id: toolCall.id,
          } as ChatCompletionMessageParam;
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
