import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

if (!process.env.GOOGLE_GENAI_API_KEY) {
  console.error('GOOGLE_GENAI_API_KEY environment variable is not set');
  throw new Error('GOOGLE_GENAI_API_KEY environment variable is required');
}

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY,
    }),
  ],
  model: 'googleai/gemini-2.0-flash-exp',
});