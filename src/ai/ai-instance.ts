import { genkit, Genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

let ai: any; // Using 'any' for simplicity due to the dummy object.

if (!process.env.GOOGLE_GENAI_API_KEY) {
  console.error('ERROR: GOOGLE_GENAI_API_KEY environment variable is not set');
  console.error('Please set this environment variable to use the AI features.');

  const dummyAI = {
    definePrompt: (...args: any[]): any => {
      throw new Error('AI functionality unavailable: GOOGLE_GENAI_API_KEY environment variable is required (called definePrompt)');
    },
    defineFlow: (...args: any[]): any => {
      throw new Error('AI functionality unavailable: GOOGLE_GENAI_API_KEY environment variable is required (called defineFlow)');
    },
    // Add other methods as needed...
  };
  ai = dummyAI;

} else {
  // Standard initialization with API key
  ai = genkit({
    plugins: [
      googleAI({
        apiKey: process.env.GOOGLE_GENAI_API_KEY,
      }),
    ],    
    // model: 'googleai/gemini-2.0-flash-exp', // Optional: Usually set per-operation    
    enableTracingAndMetrics: true // Optional: enable OpenTelemetry tracing
  });
}

export { ai };