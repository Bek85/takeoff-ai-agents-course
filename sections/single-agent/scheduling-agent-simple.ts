import dotenv from "dotenv";
import OpenAI from "openai";
import { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources";
import * as readline from "readline";

// Load environment variables from .env.local file
dotenv.config({ path: ".env.local" });

// Initialize OpenAI client with API key from environment variables
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Get today's date and format it
const today = new Date();
const formatDate = (date: Date) => date.toISOString().split("T")[0];

// Function to add days to a date
const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// Updated combined structure for time slots and meetings
const calendarSlots: {
  date: string;
  day: string;
  time: string;
  meeting?: {
    title: string;
    duration: number;
    attendees: string[];
  };
}[] = [
  { date: formatDate(addDays(today, 1)), day: addDays(today, 1).toLocaleDateString("en-US", { weekday: "long" }), time: "09:00" },
  {
    date: formatDate(addDays(today, 1)),
    day: addDays(today, 1).toLocaleDateString("en-US", { weekday: "long" }),
    time: "10:00",
    meeting: {
      title: "Project Kickoff",
      duration: 60,
      attendees: ["John", "Sarah", "David"]
    }
  },
  { date: formatDate(addDays(today, 1)), day: addDays(today, 1).toLocaleDateString("en-US", { weekday: "long" }), time: "11:00" },
  { date: formatDate(addDays(today, 2)), day: addDays(today, 2).toLocaleDateString("en-US", { weekday: "long" }), time: "12:00" },
  {
    date: formatDate(addDays(today, 2)),
    day: addDays(today, 2).toLocaleDateString("en-US", { weekday: "long" }),
    time: "13:00",
    meeting: {
      title: "1:1 with Olivia",
      duration: 60,
      attendees: ["Olivia"]
    }
  }
];

const mockContactInfo: {
  name: string;
  email: string;
  phone: string;
  preferredTime?: string;
  avoidDay?: string;
}[] = [
  { name: "John", email: "john@example.com", phone: "123-456-7890", preferredTime: "morning" },
  { name: "Sarah", email: "sarah@example.com", phone: "234-567-8901", preferredTime: "afternoon", avoidDay: "Friday" },
  { name: "David", email: "david@example.com", phone: "345-678-9012", preferredTime: "early afternoon" },
  { name: "Emma", email: "emma@example.com", phone: "456-789-0123", avoidDay: "Monday" },
  { name: "Michael", email: "michael@example.com", phone: "567-890-1234", preferredTime: "morning", avoidDay: "Wednesday" },
  { name: "Olivia", email: "olivia@example.com", phone: "678-901-2345" },
  { name: "William", email: "william@example.com", phone: "789-012-3456", preferredTime: "late afternoon" },
  { name: "Sophia", email: "sophia@example.com", phone: "890-123-4567", avoidDay: "Tuesday" }
];

const mockUserPreferences: { preferredTimes: string[]; avoidDays: string[]; preferredDuration: number } = {
  preferredTimes: ["morning"],
  avoidDays: ["Friday", "Saturday", "Sunday"],
  preferredDuration: 60 // in minutes
};

// Define tools (functions) that the AI can use for scheduling
const schedulingTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "checkAvailability",
      description: "Check available time slots in the user's calendar. If no dates are provided, checks the entire calendar. If only startDate is provided, checks that specific day. If both startDate and endDate are provided, checks the date range inclusive.",
      parameters: {
        type: "object",
        properties: {
          startDate: { type: "string", description: "The start date to check availability from (YYYY-MM-DD format)." },
          endDate: { type: "string", description: "The end date to check availability to (YYYY-MM-DD format)." }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getContactInfo",
      description: "Get contact information for a person",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" }
        },
        required: ["name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "scheduleEvent",
      description: "Schedule an event in the user's calendar",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "The date of the event (YYYY-MM-DD format)" },
          time: { type: "string", description: "The start time of the event (HH:MM format, 24-hour clock)" },
          duration: { type: "number", description: "The duration of the event in minutes" },
          attendees: {
            type: "array",
            items: { type: "string" },
            description: "Array of attendee names or email addresses"
          },
          title: { type: "string", description: "The title or subject of the event" }
        },
        required: ["date", "time", "duration", "attendees", "title"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getUserPreferences",
      description: "Get user's scheduling preferences",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  }
];

// Define color codes for console output
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const BLUE = "\x1b[34m";
const RESET = "\x1b[0m";

// Main function to run the scheduling assistant
async function main() {
  let conversationHistory: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `You are an advanced scheduling assistant. Today's date is ${formatDate(today)}. Schedule appointments based on the user's input. 
      Use the provided tools to check availability, get contact information, schedule appointments, and consider user preferences.`
    }
  ];

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const askQuestion = (query: string): Promise<string> => {
    return new Promise((resolve) => rl.question(query, resolve));
  };

  console.log(GREEN + "Welcome to the Scheduling Assistant. Type 'exit' to quit." + RESET);

  while (true) {
    const userInput = await askQuestion(BLUE + "You: " + RESET);
    if (userInput.toLowerCase() === "exit") break;

    conversationHistory.push({ role: "user", content: userInput });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: conversationHistory,
      tools: schedulingTools,
      tool_choice: "auto"
    });

    const message = response.choices[0].message;
    console.log(YELLOW + "Received response from OpenAI:" + RESET, message);

    if (message.tool_calls) {
      conversationHistory.push(message);

      const toolResults = await Promise.all(
        message.tool_calls.map(async (toolCall) => {
          console.log(BLUE + `Executing function: ${toolCall.function.name}` + RESET);
          const result = await executeFunction(toolCall.function.name, JSON.parse(toolCall.function.arguments));
          console.log(GREEN + `Result for ${toolCall.function.name}:` + RESET, result);
          return {
            role: "tool" as const,
            content: JSON.stringify(result),
            tool_call_id: toolCall.id
          };
        })
      );

      conversationHistory.push(...toolResults);

      const finalResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: conversationHistory
      });

      const finalMessage = finalResponse.choices[0].message;
      if (finalMessage.content) {
        console.log(GREEN + "AI:" + RESET, finalMessage.content);
        conversationHistory.push({ role: "assistant", content: finalMessage.content });
      }
    } else if (message.content) {
      console.log(GREEN + "AI:" + RESET, message.content);
      conversationHistory.push({ role: "assistant", content: message.content });
    }
  }

  rl.close();
}

// Function to simulate execution of scheduling-related functions
async function executeFunction(name: string, args: any): Promise<any> {
  console.log(`Executing function ${name} with args:`, args);
  switch (name) {
    case "checkAvailability":
      let filteredSlots = calendarSlots;
      if (args.startDate) {
        filteredSlots = filteredSlots.filter((slot) => slot.date >= args.startDate);
      }
      if (args.endDate) {
        filteredSlots = filteredSlots.filter((slot) => slot.date <= args.endDate);
      }
      return {
        timeSlots: filteredSlots
      };
    case "getContactInfo":
      const contactName = args.name.toLowerCase();
      const contact = mockContactInfo.find((c) => c.name.toLowerCase() === contactName);
      return contact || { name: args.name, email: `${contactName}@example.com`, phone: "123-456-7890" };
    case "scheduleEvent":
      const slotIndex = calendarSlots.findIndex((slot) => slot.date === args.date && slot.time === args.time && !slot.meeting);
      if (slotIndex !== -1) {
        calendarSlots[slotIndex].meeting = {
          title: args.title,
          duration: args.duration,
          attendees: args.attendees
        };
        return { success: true, event: calendarSlots[slotIndex] };
      }
      return { success: false, message: "Time slot not available" };
    case "getUserPreferences":
      return mockUserPreferences;
    default:
      throw new Error(`Unknown function: ${name}`);
  }
}

// Run the main function
main().catch((error) => {
  console.error(RED + "Error in scheduling assistant:" + RESET, error);
});
