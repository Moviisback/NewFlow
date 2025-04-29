import { SummaryOptions } from '@/app/types/summary-options';

export interface SummarizationResponse {
  summary: string;
}

export const summarizeDocumentWithGoogle = async ({
  documentContent,
  summaryOptions,
}: {
  documentContent: string;
  summaryOptions: SummaryOptions;
}): Promise<SummarizationResponse> => {
  try {
    console.log('Starting summarization with options:', summaryOptions);
    
    // Create prompt based on summary options
    const prompt = createSummaryPrompt(documentContent, summaryOptions);
    
    console.log('Generated prompt length:', prompt.length);
    
    // Call Google Gemini via direct API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.GOOGLE_GENAI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Google API error: ${error.error?.message || 'Unknown error'}`);
    }
    
    const data = await response.json();
    const output = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!output) {
      throw new Error('No output received from Gemini');
    }
    
    console.log('Summarization completed successfully');
    return { summary: output };
  } catch (error) {
    console.error('Error in summarizeDocumentWithGoogle:', error);
    throw error;
  }
};

function createSummaryPrompt(documentContent: string, options: SummaryOptions): string {
  let prompt = `Please summarize the following document:\n\n${documentContent}\n\n`;
  
  // Add specific instructions based on options
  prompt += 'Instructions for the summary:\n';
  
  // Length instruction
  switch (options.summaryLength) {
    case 'short':
      prompt += '- Create a brief summary (50-100 words) focusing on essential points only.\n';
      break;
    case 'medium':
      prompt += '- Create a balanced summary (150-250 words) covering all major points.\n';
      break;
    case 'detailed':
      prompt += '- Create a comprehensive summary (300-500 words) including important details and examples.\n';
      break;
  }
  
  // Focus area instruction
  switch (options.focusArea) {
    case 'general':
      prompt += '- Provide a general overview covering all aspects equally.\n';
      break;
    case 'key-points':
      prompt += '- Focus primarily on key points, main concepts, and core ideas.\n';
      break;
    case 'research':
      prompt += '- Emphasize research findings, methodology, and academic insights.\n';
      break;
    case 'action-items':
      prompt += '- Highlight actionable items, decisions, and practical takeaways.\n';
      break;
  }
  
  // Language complexity instruction
  if (options.simplifyLanguage) {
    prompt += '- Use simple, clear language that is easy to understand.\n';
    prompt += `- Adjust for language comprehension level: ${options.languageLevel}/5\n`;
  } else {
    prompt += '- Maintain the original academic/professional tone.\n';
  }
  
  // Questions instruction
  if (options.includeQuestions) {
    prompt += '- Include 3-5 study questions at the end based on the content.\n';
  }
  
  prompt += '\nPlease format the summary clearly with proper sections if needed.';
  
  return prompt;
}