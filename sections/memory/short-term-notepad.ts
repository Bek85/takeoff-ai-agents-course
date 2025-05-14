import { config } from 'dotenv';
import OpenAI from 'openai';
import {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources';
import * as readline from 'readline';

config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function main() {
  let notepad = '';
  let conversationHistory: ChatCompletionMessageParam[] = [];

  let notepadTools: ChatCompletionTool = {
    type: 'function',
    function: {
      name: 'notepad',
      description: 'Use this function to write to your notepad.',
      parameters: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description: 'The content to write to your notepad.',
          },
        },
        required: ['content'],
      },
    },
  };

  const tools = [notepadTools];

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const askQuestion = (query: string): Promise<string> => {
    return new Promise((resolve) => rl.question(query, resolve));
  };

  const GREEN = '\x1b[32m';
  const RESET = '\x1b[0m';

  while (true) {
    const userInput = await askQuestion('You: ');
    if (userInput.toLowerCase() === 'exit') break;

    const systemPrompt = `Today's date: ${new Date().toLocaleDateString()}. You are a helpful assistant.

You have a notepad that you can write to to keep track of information about the user.

Here is your notepad:
${notepad}
    `;

    conversationHistory.push({ role: 'user', content: userInput });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
      ],
      tools: tools,
      tool_choice: 'auto',
    });

    const message = response.choices[0].message;

    if (message.tool_calls) {
      for (const toolCall of message.tool_calls) {
        if (toolCall.function.name === 'notepad') {
          const args = JSON.parse(toolCall.function.arguments);
          notepad += args.content + '\n';
          console.log(GREEN + '\nUpdated notepad:' + RESET);
          console.log(GREEN + notepad + RESET);

          const functionCallResultMessage: ChatCompletionMessageParam = {
            role: 'tool',
            content: JSON.stringify({ content: args.content }),
            tool_call_id: toolCall.id,
          };

          conversationHistory.push(message);
          conversationHistory.push(functionCallResultMessage);
        }
      }

      const finalResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
        ],
      });

      const finalMessage = finalResponse.choices[0].message;
      if (finalMessage.content) {
        console.log('AI:', finalMessage.content);
        conversationHistory.push({
          role: 'assistant',
          content: finalMessage.content,
        });
      }
    } else if (message.content) {
      console.log('AI:', message.content);
      conversationHistory.push({ role: 'assistant', content: message.content });
    }

    console.log('conversationHistory', conversationHistory);
    console.log('notepad', notepad);
  }

  rl.close();
}

main();
