import dotenv from "dotenv";
import OpenAI from "openai";
import { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources";
import * as readline from "readline";

// Load environment variables from .env.local file
dotenv.config({ path: ".env.local" });

// Initialize OpenAI client with API key from environment variables
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface Flight {
  airline: string;
  flightNumber: string;
  departureLocation: string;
  arrivalLocation: string;
  price: number;
  duration: string;
  stops: number;
}

interface Hotel {
  name: string;
  location: string;
  address: string;
  rating: number;
  pricePerNight: number;
  amenities: string[];
  distanceToCenter: string;
}

interface Attraction {
  name: string;
  location: string;
  description: string;
  price: number;
  openingHours: { open: string; close: string };
  rating: number;
  estimatedTimeNeeded: string;
}

interface Restaurant {
  name: string;
  location: string;
  cuisine: string;
  priceRange: string;
  rating: number;
  address: string;
  mustTryDish: string;
}

const flights: Flight[] = [
  {
    airline: "Air France",
    flightNumber: "AF1234",
    departureLocation: "New York, USA",
    arrivalLocation: "Paris, France",
    price: 500,
    duration: "7h 30m",
    stops: 0
  },
  {
    airline: "Delta",
    flightNumber: "DL405",
    departureLocation: "New York, USA",
    arrivalLocation: "Paris, France",
    price: 450,
    duration: "7h 45m",
    stops: 0
  },
  {
    airline: "United",
    flightNumber: "UA57",
    departureLocation: "New York, USA",
    arrivalLocation: "Paris, France",
    price: 400,
    duration: "7h 45m",
    stops: 1
  },
  {
    airline: "British Airways",
    flightNumber: "BA1234",
    departureLocation: "New York, USA",
    arrivalLocation: "London, UK",
    price: 550,
    duration: "7h 15m",
    stops: 0
  },
  {
    airline: "Virgin Atlantic",
    flightNumber: "VS4",
    departureLocation: "New York, USA",
    arrivalLocation: "London, UK",
    price: 525,
    duration: "7h 05m",
    stops: 0
  },
  {
    airline: "American Airlines",
    flightNumber: "AA100",
    departureLocation: "New York, USA",
    arrivalLocation: "London, UK",
    price: 480,
    duration: "7h 20m",
    stops: 0
  },
  {
    airline: "United Airlines",
    flightNumber: "UA14",
    departureLocation: "New York, USA",
    arrivalLocation: "London, UK",
    price: 510,
    duration: "7h 10m",
    stops: 0
  },
  {
    airline: "Delta Air Lines",
    flightNumber: "DL2",
    departureLocation: "New York, USA",
    arrivalLocation: "London, UK",
    price: 495,
    duration: "7h 25m",
    stops: 0
  },
  {
    airline: "Norwegian Air",
    flightNumber: "DY7014",
    departureLocation: "New York, USA",
    arrivalLocation: "London, UK",
    price: 420,
    duration: "7h 30m",
    stops: 0
  }
];

const hotels: Hotel[] = [
  {
    name: "Grand Hotel Paris",
    location: "Paris, France",
    address: "1 Rue de la Paix, 75002 Paris, France",
    rating: 4.5,
    pricePerNight: 200,
    amenities: ["Free Wi-Fi", "Restaurant", "Fitness Center", "Spa"],
    distanceToCenter: "0.5 km"
  },
  {
    name: "Cozy Montmartre Inn",
    location: "Paris, France",
    address: "20 Rue d'Orsel, 75018 Paris, France",
    rating: 4.2,
    pricePerNight: 150,
    amenities: ["Free Wi-Fi", "Breakfast Included", "Terrace"],
    distanceToCenter: "3 km"
  },
  {
    name: "Luxury Seine View",
    location: "Paris, France",
    address: "5 Avenue de New York, 75116 Paris, France",
    rating: 4.8,
    pricePerNight: 350,
    amenities: ["Free Wi-Fi", "Pool", "Spa", "Michelin Star Restaurant"],
    distanceToCenter: "4 km"
  },
  {
    name: "The Ritz London",
    location: "London, UK",
    address: "150 Piccadilly, St. James's, London W1J 9BR, UK",
    rating: 4.7,
    pricePerNight: 450,
    amenities: ["Free Wi-Fi", "Spa", "Fine Dining", "Concierge"],
    distanceToCenter: "0.5 km"
  },
  {
    name: "Covent Garden Hotel",
    location: "London, UK",
    address: "10 Monmouth St, London WC2H 9HB, UK",
    rating: 4.5,
    pricePerNight: 300,
    amenities: ["Free Wi-Fi", "Gym", "Restaurant", "Bar"],
    distanceToCenter: "1 km"
  },
  {
    name: "The Shard Hotel",
    location: "London, UK",
    address: "32 London Bridge St, London SE1 9SG, UK",
    rating: 4.6,
    pricePerNight: 400,
    amenities: ["Free Wi-Fi", "Skyline View", "Spa", "Multiple Restaurants"],
    distanceToCenter: "2 km"
  },
  {
    name: "The Savoy",
    location: "London, UK",
    address: "Strand, London WC2R 0EU, UK",
    rating: 4.8,
    pricePerNight: 500,
    amenities: ["Free Wi-Fi", "Pool", "Spa", "River View"],
    distanceToCenter: "0.8 km"
  },
  {
    name: "Claridge's",
    location: "London, UK",
    address: "Brook Street, Mayfair, London W1K 4HR, UK",
    rating: 4.7,
    pricePerNight: 550,
    amenities: ["Free Wi-Fi", "Spa", "Michelin Star Restaurant", "Afternoon Tea"],
    distanceToCenter: "1.5 km"
  },
  {
    name: "CitizenM Tower of London",
    location: "London, UK",
    address: "40 Trinity Square, London EC3N 4DJ, UK",
    rating: 4.4,
    pricePerNight: 150,
    amenities: ["Free Wi-Fi", "Rooftop Bar", "Modern Rooms", "Self Check-In"],
    distanceToCenter: "3 km"
  }
];

const attractions: Attraction[] = [
  {
    name: "Eiffel Tower",
    location: "Paris, France",
    description: "Iconic iron lattice tower on the Champ de Mars",
    price: 25,
    openingHours: { open: "09:00", close: "23:45" },
    rating: 4.7,
    estimatedTimeNeeded: "2-3 hours"
  },
  {
    name: "Louvre Museum",
    location: "Paris, France",
    description: "World's largest art museum and home to the Mona Lisa",
    price: 17,
    openingHours: { open: "09:00", close: "18:00" },
    rating: 4.8,
    estimatedTimeNeeded: "3-4 hours"
  },
  {
    name: "Notre-Dame Cathedral",
    location: "Paris, France",
    description: "Medieval Catholic cathedral with Gothic architecture",
    price: 0,
    openingHours: { open: "08:00", close: "18:45" },
    rating: 4.7,
    estimatedTimeNeeded: "1-2 hours"
  },
  {
    name: "Tower of London",
    location: "London, UK",
    description: "Historic castle and fortress on the north bank of the River Thames",
    price: 30,
    openingHours: { open: "09:00", close: "17:30" },
    rating: 4.6,
    estimatedTimeNeeded: "3-4 hours"
  },
  {
    name: "British Museum",
    location: "London, UK",
    description: "World-famous museum of human history and culture",
    price: 0,
    openingHours: { open: "10:00", close: "17:00" },
    rating: 4.7,
    estimatedTimeNeeded: "3-4 hours"
  },
  {
    name: "Buckingham Palace",
    location: "London, UK",
    description: "The official London residence of the UK's sovereigns since 1837",
    price: 30,
    openingHours: { open: "09:30", close: "17:15" },
    rating: 4.5,
    estimatedTimeNeeded: "2-3 hours"
  },
  {
    name: "London Eye",
    location: "London, UK",
    description: "Giant Ferris wheel on the South Bank of the River Thames",
    price: 27,
    openingHours: { open: "11:00", close: "18:00" },
    rating: 4.4,
    estimatedTimeNeeded: "1-2 hours"
  },
  {
    name: "Westminster Abbey",
    location: "London, UK",
    description: "Historic, mainly Gothic, church in the City of Westminster",
    price: 23,
    openingHours: { open: "09:30", close: "15:30" },
    rating: 4.6,
    estimatedTimeNeeded: "1-2 hours"
  },
  {
    name: "Tate Modern",
    location: "London, UK",
    description: "Modern and contemporary art gallery",
    price: 0,
    openingHours: { open: "10:00", close: "18:00" },
    rating: 4.5,
    estimatedTimeNeeded: "2-3 hours"
  }
];

const restaurants: Restaurant[] = [
  {
    name: "Le Chateaubriand",
    location: "Paris, France",
    cuisine: "Modern French",
    priceRange: "$$$",
    rating: 4.4,
    address: "129 Avenue Parmentier, 75011 Paris",
    mustTryDish: "Tasting Menu"
  },
  {
    name: "L'As du Fallafel",
    location: "Paris, France",
    cuisine: "Middle Eastern",
    priceRange: "$",
    rating: 4.5,
    address: "34 Rue des Rosiers, 75004 Paris",
    mustTryDish: "Falafel Pita"
  },
  {
    name: "Septime",
    location: "Paris, France",
    cuisine: "Contemporary",
    priceRange: "$$$",
    rating: 4.6,
    address: "80 Rue de Charonne, 75011 Paris",
    mustTryDish: "Seasonal Tasting Menu"
  },
  {
    name: "The Ledbury",
    location: "London, UK",
    cuisine: "Modern European",
    priceRange: "$$$$",
    rating: 4.7,
    address: "127 Ledbury Rd, London W11 2AQ, UK",
    mustTryDish: "Tasting Menu"
  },
  {
    name: "Dishoom",
    location: "London, UK",
    cuisine: "Indian",
    priceRange: "$$",
    rating: 4.6,
    address: "12 Upper St. Martin's Lane, London WC2H 9FB, UK",
    mustTryDish: "Bacon Naan Roll"
  },
  {
    name: "The Clove Club",
    location: "London, UK",
    cuisine: "Modern British",
    priceRange: "$$$$",
    rating: 4.5,
    address: "Shoreditch Town Hall, 380 Old St, London EC1V 9LT, UK",
    mustTryDish: "Buttermilk Fried Chicken"
  },
  {
    name: "Sketch",
    location: "London, UK",
    cuisine: "Modern European",
    priceRange: "$$$$",
    rating: 4.4,
    address: "9 Conduit St, Mayfair, London W1S 2XG, UK",
    mustTryDish: "Afternoon Tea"
  },
  {
    name: "Padella",
    location: "London, UK",
    cuisine: "Italian",
    priceRange: "$$",
    rating: 4.5,
    address: "6 Southwark St, London SE1 1TQ, UK",
    mustTryDish: "Pici Cacio e Pepe"
  },
  {
    name: "Bao",
    location: "London, UK",
    cuisine: "Taiwanese",
    priceRange: "$$",
    rating: 4.3,
    address: "53 Lexington St, Carnaby, London W1F 9AS, UK",
    mustTryDish: "Classic Bao"
  }
];

// Define tools (functions) that the AI can use for travel planning
const mainTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "planTrip",
      description: "Plan a trip based on destination, budget, and trip length",
      parameters: {
        type: "object",
        properties: {
          destination: { type: "string", description: "City, Country (Example: London, UK)" },
          budget: { type: "number", description: "Trip budget in USD" },
          tripLength: { type: "number", description: "Trip length in days" }
        },
        required: ["destination", "budget", "tripLength"]
      }
    }
  }
];

// Define tools (functions) that the AI can use for travel planning
const planTripTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "getFlights",
      description: "Get flights to a destination",
      parameters: {
        type: "object",
        properties: {
          arrivalLocation: { type: "string", description: "City, Country (Example: New York, USA)" }
        },
        required: ["arrivalLocation"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getHotels",
      description: "Get hotels in a location",
      parameters: {
        type: "object",
        properties: {
          location: { type: "string", description: "City, Country (Example: New York, USA)" }
        },
        required: ["location"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getAttractions",
      description: "Get attractions in a location",
      parameters: {
        type: "object",
        properties: {
          location: { type: "string", description: "City, Country (Example: New York, USA)" }
        },
        required: ["location"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getRestaurants",
      description: "Get restaurants in a location",
      parameters: {
        type: "object",
        properties: {
          location: { type: "string", description: "City, Country (Example: New York, USA)" }
        },
        required: ["location"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "checkBudget",
      description: "Check if total cost is within budget",
      parameters: {
        type: "object",
        properties: {
          totalCost: { type: "number", description: "Total cost of the trip" },
          budget: { type: "number", description: "User's budget for the trip" }
        },
        required: ["totalCost", "budget"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "isTripPlanned",
      description: "Check if the trip is fully planned (including being within budget). Include a simple financial breakdown of the trip at the end of the final itinerary.",
      parameters: {
        type: "object",
        properties: {
          isPlanned: { type: "boolean", description: "Whether the trip is fully planned" },
          finalItinerary: { type: "string", description: "The final itinerary of the trip" }
        },
        required: ["isPlanned", "finalItinerary"]
      }
    }
  }
];

// Define color codes for console output
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const BLUE = "\x1b[34m";

// Function to log messages with color
function logWithColor(message: string, color: string = YELLOW) {
  console.log(color + message + RESET);
}

// Add these helper functions at the top of the file
function logSeparator() {
  console.log("\n" + "=".repeat(50) + "\n");
}

function logStep(step: string) {
  console.log(YELLOW + step + RESET);
}

function logAIResponse(content: string | null) {
  if (content) {
    console.log(GREEN + "AI: " + RESET + content);
  }
}

function logError(error: any) {
  console.error(RED + "Error: " + RESET + error.message);
}

// Modify the main function
async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const askQuestion = (query: string): Promise<string> => {
    return new Promise((resolve) => rl.question(query, resolve));
  };

  console.log("Welcome to the AI Travel Planner! Type 'exit' to quit.");

  let conversationHistory: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `You are a travel planner assistant. Gather the destination, budget (in USD), and trip length (in days) from the user. Once you have all this information, use the planTrip function to create a travel plan. If any information is missing, ask the user for it.`
    }
  ];

  while (true) {
    logSeparator();
    const userInput = await askQuestion("You: ");
    if (userInput.toLowerCase() === "exit") break;

    conversationHistory.push({ role: "user", content: userInput });

    try {
      logStep("Sending request to OpenAI...");
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: conversationHistory,
        tools: mainTools
      });

      const message = response.choices[0].message;
      logAIResponse(message.content);

      if (message.tool_calls) {
        for (const toolCall of message.tool_calls) {
          const args = JSON.parse(toolCall.function.arguments);
          logStep(`Calling ${toolCall.function.name} function...`);
          const result = await executeFunction(toolCall.function.name, args);
          conversationHistory.push({ role: "assistant", content: message.content, tool_calls: message.tool_calls }, { role: "function", name: toolCall.function.name, content: JSON.stringify(result) });
        }
      } else {
        conversationHistory.push(message);
      }

      // Log conversation history after each turn
      logSeparator();
      logWithColor("Conversation History:", BLUE);
      console.log(JSON.stringify(conversationHistory, null, 2));
    } catch (error) {
      logError(error);
    }
  }

  rl.close();
}

async function planTrip(destination: string, budget: number, tripLength: number): Promise<string> {
  logWithColor(`Planning trip to ${destination} for ${tripLength} days with budget $${budget}`, YELLOW);

  let planningHistory: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `You are planning a trip to ${destination} for ${tripLength} days with a budget of $${budget}. Use the provided tools to search for flights, hotels, attractions, and restaurants. Then create a detailed itinerary.`
    }
  ];

  const MAX_ITERATIONS = 10;
  let iterations = 0;
  let finalItinerary = "";

  while (iterations < MAX_ITERATIONS) {
    logWithColor(`Iteration ${iterations + 1}/${MAX_ITERATIONS}`, YELLOW);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: planningHistory,
      tools: planTripTools,
      tool_choice: "auto"
    });

    logWithColor(`AI Response:`, YELLOW);
    console.log(response.choices[0].message);

    const message = response.choices[0].message;

    if (message.tool_calls) {
      planningHistory.push({ role: "assistant", content: message.content, tool_calls: message.tool_calls });

      for (const toolCall of message.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);
        const result = await executeFunction(toolCall.function.name, args);

        planningHistory.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result)
        });

        if (toolCall.function.name === "isTripPlanned" && result.isPlanned) {
          return result.finalItinerary; // Return the final itinerary from the function result
        }
      }
    } else {
      planningHistory.push(message);
    }

    iterations++;
  }

  return "Failed to generate a complete trip plan within the maximum number of iterations.";
}

async function executeFunction(name: string, args: any): Promise<any> {
  logWithColor(`Executing function ${name} with args:`, YELLOW);
  console.log(args);

  let result;
  switch (name) {
    case "planTrip":
      result = await planTrip(args.destination, args.budget, args.tripLength);
      break;
    case "getFlights":
      result = flights.filter((flight) => flight.arrivalLocation === args.arrivalLocation);
      break;
    case "getHotels":
      result = hotels.filter((hotel) => hotel.location === args.location);
      break;
    case "getAttractions":
      result = attractions.filter((attraction) => attraction.location === args.location);
      break;
    case "getRestaurants":
      result = restaurants.filter((restaurant) => restaurant.location === args.location);
      break;
    case "checkBudget":
      result = {
        withinBudget: args.totalCost <= args.budget,
        difference: args.budget - args.totalCost,
        totalCost: args.totalCost,
        budget: args.budget
      };
      break;
    case "isTripPlanned":
      result = {
        isPlanned: args.isPlanned,
        finalItinerary: args.finalItinerary
      };
      break;
    default:
      throw new Error(`Unknown function: ${name}`);
  }

  logWithColor(`Function ${name} result:`, YELLOW);
  console.log(result);

  return result;
}

main();
