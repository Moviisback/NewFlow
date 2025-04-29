// SummarizeDocument.ts
'use server';
/**
 * @fileOverview Summarizes the content of a document.
 *
 * - summarizeDocument - A function that summarizes the content of a document.
 * - SummarizeDocumentInput - The input type for the summarizeDocument function.
 * - SummarizeDocumentOutput - The return type for the summarizeDocument function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const SummarizeDocumentInputSchema = z.object({
  documentContent: z.string().describe('The content of the document to summarize.'),
});
export type SummarizeDocumentInput = z.infer<typeof SummarizeDocumentInputSchema>;

const SummarizeDocumentOutputSchema = z.object({
  summary: z.string().describe('A summary of the document content.'),
});
export type SummarizeDocumentOutput = z.infer<typeof SummarizeDocumentOutputSchema>;

export async function summarizeDocument(input: SummarizeDocumentInput): Promise<SummarizeDocumentOutput> {
  return summarizeDocumentFlow(input);
}

const summarizeDocumentPrompt = ai.definePrompt({
  name: 'summarizeDocumentPrompt',
  input: {
    schema: z.object({
      documentContent: z.string().describe('The content of the document to summarize.'),
    }),
  },
  output: {
    schema: z.object({
      summary: z.string().describe('A summary of the document content.'),
    }),
  },
  prompt: `Summarize the key topics and concepts in the following document:\n\n{{{documentContent}}}`,
});

const summarizeDocumentFlow = ai.defineFlow<
  typeof SummarizeDocumentInputSchema,
  typeof SummarizeDocumentOutputSchema
>(
  {
    name: 'summarizeDocumentFlow',
    inputSchema: SummarizeDocumentInputSchema,
    outputSchema: SummarizeDocumentOutputSchema,
  },
  async input => {
    const {output} = await summarizeDocumentPrompt(input);
    return output!;
  }
);
