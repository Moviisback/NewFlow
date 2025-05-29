import { NextRequest, NextResponse } from 'next/server';
import pdf from 'pdf-parse'; // For PDF parsing
import mammoth from 'mammoth'; // For DOCX parsing
import { SummaryOptions, defaultSummaryOptions, getMinLengthFromDetailLevel, detailLevelPercentages, DetailLevel } from '@/types/summaryOptions';

// --- Direct API Call Configuration ---
const API_KEY = process.env.GEMINI_API_KEY;
// NOTE: Changed model name to a common one. Adjust if 'gemini-2.0-flash' is specific and correct for your environment.
const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${API_KEY}`;
// --- End Configuration ---

// --- Word Counting Utility ---
function countWords(text: string): number {
  if (!text || text.trim() === '') return 0;
  
  const cleanedText = text
    .replace(/\r\n/g, ' ') // Normalize line breaks
    .replace(/\n/g, ' ')
    .replace(/\t/g, ' ')
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\[\/?[^\]]+\]/g, ' ') // Remove markdown-style tags
    .trim();
    
  return cleanedText.split(/\s+/).filter(Boolean).length;
}

// Progress tracking state
let progressState = {
  stage: '',
  processedChunks: 0,
  totalChunks: 0,
  lastUpdated: Date.now()
};

// Update progress
function updateProgress(update: Partial<typeof progressState>) {
  progressState = {
    ...progressState,
    ...update,
    lastUpdated: Date.now()
  };
  console.log(`Progress updated: ${JSON.stringify(progressState)}`);
}

// Reset progress
function resetProgress() {
  progressState = {
    stage: '',
    processedChunks: 0,
    totalChunks: 0,
    lastUpdated: Date.now()
  };
}

// Export progress state for the progress API
export function getProgressState() {
  return progressState;
}

// --- File Reading Logic ---
async function readFileContent(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  console.log(`Attempting to read file: ${file.name}, Type: ${file.type}, Size: ${buffer.length} bytes`);
  updateProgress({ stage: 'Reading file content...' });

  if (file.type === 'application/pdf') {
    try {
      const data = await pdf(buffer);
      console.log(`Successfully parsed PDF: ${file.name}, extracted ${data.text.length} characters`);
      return data.text;
    } catch (error) {
      console.error(`Error parsing PDF ${file.name}:`, error);
      throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') { // DOCX MIME type
    try {
      const result = await mammoth.extractRawText({ buffer });
      console.log(`Successfully parsed DOCX: ${file.name}, extracted ${result.value.length} characters`);
      return result.value;
    } catch (error) {
      console.error(`Error parsing DOCX ${file.name}:`, error);
      throw new Error(`Failed to parse DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else if (file.type === 'text/plain') {
    console.log(`Reading plain text file: ${file.name}`);
    return buffer.toString('utf-8');
  } else {
    if (!file.type || file.type.startsWith('text/')) {
      console.warn(`Unknown text-like file type '${file.type}', attempting to read as text: ${file.name}`);
      return buffer.toString('utf-8');
    }
    throw new Error(`Unsupported file type: ${file.type || 'Unknown'}`);
  }
}
// --- End File Reading Logic ---

// --- Document Processing Strategy ---
function determineProcessingStrategy(textLength: number): { 
  method: 'direct' | 'chunked', 
  chunkSize?: number, 
  maxChunks?: number,
  tokenLimit: number, // This is for OUTPUT tokens
  overlapSize?: number
} {
  const estimatedTokens = Math.ceil(textLength / 4); // Rough input token estimate
  console.log(`Document length: ${textLength} chars, estimated input tokens: ${estimatedTokens}`);
  
  // Gemini 1.5 Flash input context window is up to 1M tokens. Output is typically 8192 tokens.
  // User had 32768 for tokenLimit, which might be too high for Flash's *output*.
  // If a model truly supports 32k output, this can be reverted by the user.
  const defaultOutputTokenLimit = 8192; 

  if (textLength < 250000) { // ~62.5K input tokens. Well within 1.5 Flash's capabilities for direct processing.
    console.log(`Strategy: Direct processing. Estimated input tokens: ${estimatedTokens}`);
    return {
      method: 'direct',
      tokenLimit: defaultOutputTokenLimit 
    };
  }
  
  if (textLength < 750000) { // Up to ~187.5K input tokens
    console.log(`Strategy: Chunked (medium). Estimated input tokens: ${estimatedTokens}`);
    return {
      method: 'chunked',
      chunkSize: 200000, // ~50K input tokens per chunk
      maxChunks: 30, 
      tokenLimit: defaultOutputTokenLimit, 
      overlapSize: 20000 // 10% overlap
    };
  }
  
  // For larger documents
  console.log(`Strategy: Chunked (large). Estimated input tokens: ${estimatedTokens}`);
  return {
    method: 'chunked',
    chunkSize: 300000, // ~75K input tokens per chunk
    maxChunks: 200, // Increased maxChunks for very large docs
    tokenLimit: defaultOutputTokenLimit, 
    overlapSize: 30000 // 10% overlap
  };
}

/**
 * Split text into overlapping chunks for processing.
 * Tries to split at paragraph or sentence boundaries.
 */
function splitIntoChunks(text: string, chunkSize: number, maxChunks: number = 100, overlapSize: number = 1000): string[] {
    const effectiveChunkAdvance = chunkSize - overlapSize;
    if (effectiveChunkAdvance <= 0) {
        console.warn(`Overlap size (${overlapSize}) is too large for chunk size (${chunkSize}). Effective advance is <= 0. Adjusting overlap to half of chunk size.`);
        overlapSize = Math.floor(chunkSize / 2);
    }

    updateProgress({
        stage: 'Splitting document into chunks...',
        processedChunks: 0,
        totalChunks: Math.min(Math.ceil(text.length / Math.max(1, effectiveChunkAdvance)), maxChunks)
    });

    const chunks: string[] = [];
    let currentPosition = 0;

    while (currentPosition < text.length && chunks.length < maxChunks) {
        let chunkEndPosition = Math.min(currentPosition + chunkSize, text.length);

        // If not the last chunk, try to find a natural boundary within the desired range
        if (chunkEndPosition < text.length) {
            // Search for split points in the segment that would be the non-overlapping part of the next chunk + overlap
            // More practically, search in the latter part of the current prospective chunk.
            const searchWindowStart = currentPosition + Math.floor(chunkSize * 0.7); // Start searching from 70% of chunk
            const searchWindowEnd = chunkEndPosition;
            const potentialSplitText = text.substring(searchWindowStart, searchWindowEnd);

            let bestSplitIndexInWindow = -1;

            // Try paragraph breaks (double newlines)
            const paraBreakMatch = potentialSplitText.lastIndexOf("\n\n");
            if (paraBreakMatch !== -1) {
                bestSplitIndexInWindow = paraBreakMatch + 2; // Include the newlines
            } else {
                // Fall back to sentence boundaries (. ! ?)
                const sentenceEndMatch = potentialSplitText.match(/.*[.!?]\s/); // Find last sentence end
                if (sentenceEndMatch && sentenceEndMatch[0]) {
                     // Find the last occurrence of . ! ? followed by a space or end of string
                    const lastDot = potentialSplitText.lastIndexOf(". ");
                    const lastExclamation = potentialSplitText.lastIndexOf("! ");
                    const lastQuestion = potentialSplitText.lastIndexOf("? ");
                    const lastSentenceEnd = Math.max(lastDot, lastExclamation, lastQuestion);
                    if (lastSentenceEnd !== -1) {
                        bestSplitIndexInWindow = lastSentenceEnd + 2; // Include punctuation and space
                    }
                }
            }
            
            if (bestSplitIndexInWindow !== -1) {
                chunkEndPosition = searchWindowStart + bestSplitIndexInWindow;
            }
            // If no natural break found, chunkEndPosition remains as initially calculated
        }
        
        // Ensure we are making progress
        if (chunkEndPosition <= currentPosition && currentPosition < text.length) {
            console.warn(`Chunking not advancing at position ${currentPosition}. Forcing advance.`);
            chunkEndPosition = Math.min(currentPosition + chunkSize, text.length); // Default advance
             if (chunkEndPosition <= currentPosition) { // Still no progress (e.g. chunkSize is 0)
                console.error("Chunking failed to advance decisively. Breaking loop to prevent infinite recursion.");
                break;
            }
        }

        const chunkText = text.substring(currentPosition, chunkEndPosition);
        chunks.push(chunkText);
        console.log(`Created chunk ${chunks.length}: len=${chunkText.length}, from=${currentPosition}, to=${chunkEndPosition}, overlap=${overlapSize}`);

        if (chunkEndPosition >= text.length) break;

        currentPosition = chunkEndPosition - overlapSize;
        if (currentPosition < 0) currentPosition = 0; // Should not happen with sane overlap

        // Safety break if currentPosition doesn't advance sufficiently (e.g., if overlap is >= chunksize somehow)
        if (chunks.length > 1 && currentPosition <= (chunkEndPosition - chunkSize + (chunkSize * 0.05))) { // If new start is not much beyond old start
             // This can happen if chunkEndPosition was brought back significantly by split logic and overlap is large
             // Let's ensure we advance by at least a small portion of non-overlapped text
            const previousChunkEffectiveStart = chunkEndPosition - chunkSize; // Approximate start of current chunk's content
            if(currentPosition <= previousChunkEffectiveStart) {
                console.warn(`Potential stall in chunking due to overlap and split point. Forcing advance from end of last chunk. Position ${currentPosition} vs PrevEnd ${chunkEndPosition}`);
                currentPosition = chunkEndPosition - overlapSize; // Standard logic already applied
                // If currentPosition is still problematic, advance it more aggressively
                const minAdvance = Math.max(1, Math.floor( (chunkSize - overlapSize) * 0.1 )); // Advance at least 10% of non-overlap part
                if (chunkEndPosition - overlapSize < currentPosition - (chunkSize - overlapSize) + minAdvance ) {
                     currentPosition = (chunkEndPosition - chunkSize) + minAdvance; // Simplified forced advance
                }

            }
        }
         if (currentPosition >= text.length) break; // Reached end after overlap adjustment
    }

    console.log(`Split document into ${chunks.length} chunks.`);
    updateProgress({ totalChunks: chunks.length });
    return chunks;
}

// --- FIXED: Increased from 2 to 4 for more reliable adjustments ---
const MAX_ADJUSTMENT_ATTEMPTS = 4; 

// --- FIXED: Enhanced adjustment function with better word count control and source fidelity ---
async function adjustSummaryLength(
  currentSummaryFromAI: string, // Raw output from AI, might contain "Word count: X"
  targetMinWords: number,
  targetMaxWords: number,
  targetIdealWords: number,
  apiTokenLimit: number,
  contextForLogging: string, 
  optionsForPrompt: SummaryOptions, // Pass full options for formatting context
  fileNameForPrompt: string // Pass filename for context
): Promise<string> {
  let summaryForProcessing = currentSummaryFromAI;

  for (let attempt = 0; attempt < MAX_ADJUSTMENT_ATTEMPTS; attempt++) {
    const modelReportedWordCountMatch = summaryForProcessing.match(/Word count: (\d+)\.?$/m);
    const modelReportedWordCount = modelReportedWordCountMatch ? parseInt(modelReportedWordCountMatch[1]) : null;

    const cleanedSummary = summaryForProcessing.replace(/Word count: \d+\.?$/m, '').trim();
    const actualWordCount = countWords(cleanedSummary);

    const logPrefix = `Adjustment Attempt ${attempt + 1}/${MAX_ADJUSTMENT_ATTEMPTS} for ${contextForLogging} ("${fileNameForPrompt}"):`;
    if (modelReportedWordCount) {
      console.log(`${logPrefix} Model reported ${modelReportedWordCount} words. Our count: ${actualWordCount}. Target: ${targetMinWords}-${targetMaxWords}.`);
    } else {
      console.log(`${logPrefix} Current word count ${actualWordCount}. Target: ${targetMinWords}-${targetMaxWords}.`);
    }

    if (actualWordCount >= targetMinWords && actualWordCount <= targetMaxWords) {
      console.log(`Length for ${contextForLogging} is within target range (${actualWordCount} words) after ${attempt} adjustment retries.`);
      return cleanedSummary;
    }

    // If this was the last attempt and it's still not right, log and return best effort
    if (attempt === MAX_ADJUSTMENT_ATTEMPTS - 1) {
      console.warn(`Max adjustment attempts (${MAX_ADJUSTMENT_ATTEMPTS}) reached for ${contextForLogging}. Final count: ${actualWordCount} (Target: ${targetMinWords}-${targetMaxWords}). Returning current version.`);
      return cleanedSummary;
    }

    const isTooShort = actualWordCount < targetMinWords;
    const isTooLong = actualWordCount > targetMaxWords;
    const action = isTooShort ? "EXPAND" : "REDUCE";
    
    // Calculate word difference and percent difference for more precise adjustment
    const wordDiff = isTooShort 
      ? targetMinWords - actualWordCount
      : actualWordCount - targetMaxWords;
    
    const percentDiff = Math.round((wordDiff / actualWordCount) * 100);
    
    // More explicit instructions with emphasizing the exact target
    let retryInstruction = `Your previous attempt to create/adjust the ${contextForLogging} (for document "${fileNameForPrompt}") resulted in ${actualWordCount} words. This is ${isTooShort ? 'TOO SHORT' : 'TOO LONG'}.`;
    if (modelReportedWordCount && Math.abs(modelReportedWordCount - actualWordCount) > 100) {
      retryInstruction += ` You reported ${modelReportedWordCount} words but actual count is ${actualWordCount}. Please count accurately.`;
    }

    const adjustmentPromptText = `${retryInstruction}

CRITICAL LENGTH ISSUE - REQUIRES ${action}:
The summary MUST be EXACTLY between ${targetMinWords} and ${targetMaxWords} words (ideally ${targetIdealWords}).
${isTooShort ? `Currently MISSING approximately ${wordDiff} words (need ${percentDiff}% more).` : 
               `Currently EXCEEDING maximum by ${wordDiff} words (need ${percentDiff}% less).`}

CONTENT RESTRICTION - CRITICALLY IMPORTANT:
- You MUST ONLY use information found in the original source text
- NO external knowledge, examples, or explanations not present in the original
- You may restructure or rephrase ONLY for coherence, but not add new concepts
- Students will use this as a substitute for the original text, so accuracy is paramount

Your task is to ${action} the following summary to EXACTLY fit the required length while maintaining fidelity to the source.

Current summary (${actualWordCount} words):
--- START OF TEXT TO ADJUST ---
${cleanedSummary} 
--- END OF TEXT TO ADJUST ---

ABSOLUTELY CRITICAL INSTRUCTIONS:
1. ${isTooShort ? `ADD approximately ${wordDiff} words by expanding on existing content` : `REMOVE approximately ${wordDiff} words by condensing less essential details`}
2. Create a summary that is EXACTLY between ${targetMinWords}-${targetMaxWords} words
3. ONLY use information present in the original document - NO external information
4. Maintain the "${optionsForPrompt.studyFormat}" format for ${optionsForPrompt.knowledgeLevel} students
5. ${isTooShort ? 'Add detail to underdeveloped sections using ONLY information from the original' : 'Remove less important information while preserving key concepts'}
6. Count your words CAREFULLY before providing your answer
7. End with EXACTLY "Word count: [actual_number]"
8. DO NOT discuss the adjustment process or include any meta-text

IMPORTANT: I will verify your word count independently, so be precise.`;

    console.log(`Requesting further length adjustment for ${contextForLogging} (attempt ${attempt + 1}/${MAX_ADJUSTMENT_ATTEMPTS}). Action: ${action}, Current: ${actualWordCount}, Target: ${targetMinWords}-${targetMaxWords}`);
    updateProgress({ 
        stage: `${action === "EXPAND" ? "Expanding" : "Reducing"} ${contextForLogging} (attempt ${attempt + 1}/${MAX_ADJUSTMENT_ATTEMPTS})...`,
    });

    summaryForProcessing = await callGeminiAPI(adjustmentPromptText, apiTokenLimit); 
  }
  
  // Fallback, should ideally be caught by loop logic if MAX_ADJUSTMENT_ATTEMPTS > 0
  console.warn(`Exited adjustment loop for ${contextForLogging} unexpectedly. Returning last processed summary.`);
  return summaryForProcessing.replace(/Word count: \d+\.?$/m, '').trim();
}

// Process a document by chunks and combine the summaries
async function processDocumentByChunks(document: string, options: SummaryOptions, fileName: string): Promise<string> {
  try {
    // Reset progress at the start
    resetProgress();
    updateProgress({ stage: 'Analyzing document structure...' });
    
    // Get original document word count for metrics
    const originalWordCount = countWords(document);
    console.log(`Original document word count: ${originalWordCount}`);
    
    // Calculate target percentage based on options
    const targetPercentage = options.targetPercentage || 
      (options.detailLevel && detailLevelPercentages[options.detailLevel as DetailLevel]) || 
      0.25; 
    
    const targetWordCount = Math.round(originalWordCount * targetPercentage);
    // Ensure min acceptable words is at least a small number, e.g. 10, to avoid issues with very short targets.
    const minAcceptableWords = Math.max(10, Math.round(targetWordCount * 0.9));
    const maxAcceptableWords = Math.round(targetWordCount * 1.1);
    
    console.log(`Target summary length: ${targetWordCount} words (${Math.round(targetPercentage * 100)}% of original)`);
    console.log(`Acceptable word count range: ${minAcceptableWords}-${maxAcceptableWords} words`);
    
    if (originalWordCount === 0) {
        console.warn("Original document has 0 words. Cannot generate a meaningful summary based on percentage. Returning empty string or placeholder.");
        return "[Source document appears to be empty or non-textual, no summary generated]";
    }

    const strategy = determineProcessingStrategy(document.length);
    
    if (strategy.method === 'direct') {
      updateProgress({ 
        stage: 'Processing document directly...',
        processedChunks: 0,
        totalChunks: 1
      });
      
      console.log(`Processing document directly (length: ${document.length})`);
      const prompt = generateStudyPrompt(document, options, fileName, true, true, false, originalWordCount);
      
      updateProgress({ 
        stage: 'Generating comprehensive summary...',
        processedChunks: 0,
        totalChunks: 1
      });
      
      let result = await callGeminiAPI(prompt, strategy.tokenLimit);
      const initialResultWordCount = countWords(result.replace(/Word count: \d+\.?$/m, '').trim());
      console.log(`Initial summary generated: ${initialResultWordCount} words`);
      
      if (initialResultWordCount < minAcceptableWords || initialResultWordCount > maxAcceptableWords) {
        console.log(`Summary length (${initialResultWordCount} words) outside acceptable range (${minAcceptableWords}-${maxAcceptableWords}), attempting iterative adjustment...`);
        result = await adjustSummaryLength(
            result,
            minAcceptableWords,
            maxAcceptableWords,
            targetWordCount,
            strategy.tokenLimit,
            "summary",
            options, // pass full options object
            fileName // pass filename
        );
      }
      
      result = result.replace(/Word count: \d+\.?$/m, '').trim();
      const finalWordCount = countWords(result);
      console.log(`Final summary: ${finalWordCount} words (${Math.round((finalWordCount/originalWordCount)*100)}% of original)`);
      
      updateProgress({ 
        stage: 'Finalizing summary...',
        processedChunks: 1,
        totalChunks: 1
      });
      
      return result;
    }
    
    console.log(`Processing document by chunks (length: ${document.length}, chunk size: ${strategy.chunkSize}, overlap: ${strategy.overlapSize})`);
    const chunks = splitIntoChunks(document, strategy.chunkSize!, strategy.maxChunks, strategy.overlapSize);
    
    if (chunks.length === 0) {
        console.warn("Document splitting resulted in 0 chunks. This might be a very short document or an issue with splitting logic.");
        // Attempt to process as direct if it's small enough, otherwise report error
        if (document.length < (determineProcessingStrategy(0).chunkSize || 50000) ) { // Check against a typical small direct threshold
             console.log("Attempting direct processing for document that yielded 0 chunks.");
             // Fallback to direct processing logic here, reusing parts from above
            const directStrategy = determineProcessingStrategy(document.length); // Get direct strategy settings
            const prompt = generateStudyPrompt(document, options, fileName, true, true, false, originalWordCount);
            let result = await callGeminiAPI(prompt, directStrategy.tokenLimit);
            const initialResultWordCount = countWords(result.replace(/Word count: \d+\.?$/m, '').trim());
             if (initialResultWordCount < minAcceptableWords || initialResultWordCount > maxAcceptableWords) {
                result = await adjustSummaryLength(result,minAcceptableWords,maxAcceptableWords,targetWordCount,directStrategy.tokenLimit,"summary (fallback direct)",options,fileName);
            }
            return result.replace(/Word count: \d+\.?$/m, '').trim();
        }
        return "[Document could not be split into processable chunks]";
    }
    console.log(`Split document into ${chunks.length} chunks`);
    
    const perChunkTargetPercentage = targetPercentage;
    const chunkSummaries: string[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const isFirstChunk = i === 0;
      const isLastChunk = i === chunks.length - 1;
      const contextFileNameForChunk = `${fileName} (Part ${i+1}/${chunks.length})`;
      
      updateProgress({ 
        stage: `Processing section ${i+1} of ${chunks.length}...`,
        processedChunks: i,
        totalChunks: chunks.length
      });
      
      console.log(`Processing chunk ${i+1}/${chunks.length} (length: ${chunks[i].length})`);
      
      try {
        const chunkWordCount = countWords(chunks[i]);
        if (chunkWordCount === 0) {
            console.warn(`Chunk ${i+1} has 0 words. Skipping summarization for this chunk.`);
            chunkSummaries.push(""); // Add empty string or a placeholder
            updateProgress({ processedChunks: i + 1 });
            continue;
        }

        const chunkTargetWordCount = Math.round(chunkWordCount * perChunkTargetPercentage);
        const chunkMinAcceptable = Math.max(10, Math.round(chunkTargetWordCount * 0.9));
        const chunkMaxAcceptable = Math.round(chunkTargetWordCount * 1.1);
        
        console.log(`Chunk ${i+1} original word count: ~${chunkWordCount}, target summary: ~${chunkTargetWordCount} words (${chunkMinAcceptable}-${chunkMaxAcceptable})`);
        
        const chunkPrompt = generateStudyPrompt(
          chunks[i], 
          { ...options, targetPercentage: perChunkTargetPercentage }, 
          contextFileNameForChunk,
          isFirstChunk, // Request intro if it's the first chunk of several
          isLastChunk,  // Request conclusion if it's the last chunk of several
          chunks.length > 1, // Let model know we're doing chunked processing
          chunkWordCount
        );
        
        let chunkSummary = await callGeminiAPI(chunkPrompt, strategy.tokenLimit);
        const initialChunkSummaryWordCount = countWords(chunkSummary.replace(/Word count: \d+\.?$/m, '').trim());
        console.log(`Chunk ${i+1} initial summary: ${initialChunkSummaryWordCount} words (target: ${chunkTargetWordCount})`);
        
        if (initialChunkSummaryWordCount < chunkMinAcceptable || initialChunkSummaryWordCount > chunkMaxAcceptable) {
          console.log(`Chunk ${i+1} summary length (${initialChunkSummaryWordCount} words) outside acceptable range (${chunkMinAcceptable}-${chunkMaxAcceptable}), attempting iterative adjustment...`);
          chunkSummary = await adjustSummaryLength(
              chunkSummary,
              chunkMinAcceptable,
              chunkMaxAcceptable,
              chunkTargetWordCount,
              strategy.tokenLimit,
              `section ${i+1} summary`,
              options, 
              contextFileNameForChunk
          );
        }
        
        chunkSummary = chunkSummary.replace(/Word count: \d+\.?$/m, '').trim();
        chunkSummaries.push(chunkSummary);
        updateProgress({ processedChunks: i + 1 });

      } catch (error) {
        console.error(`Error processing chunk ${i+1}:`, error);
        chunkSummaries.push(`[Error processing this section of the document: ${error instanceof Error ? error.message : 'Unknown error'}]`);
        updateProgress({ processedChunks: i + 1 });
      }
    }
    
    // Filter out any empty summaries that might have resulted from 0-word chunks
    const validChunkSummaries = chunkSummaries.filter(s => s.trim().length > 0);

    if (validChunkSummaries.length === 0) {
        console.warn("All chunk summaries are empty. Returning placeholder.");
        return "[No valid content summarized from document sections]";
    }
    if (validChunkSummaries.length === 1) {
      const summaryWordCount = countWords(validChunkSummaries[0]);
      console.log(`Summary generated (single valid chunk): ${summaryWordCount} words (${Math.round((summaryWordCount/originalWordCount)*100)}% of original)`);
      updateProgress({ stage: 'Finalizing summary...', processedChunks: chunks.length, totalChunks: chunks.length });
      return validChunkSummaries[0];
    }
    
    updateProgress({ 
      stage: 'Combining sections into final comprehensive summary...',
      processedChunks: chunks.length,
      totalChunks: chunks.length
    });
    
    console.log(`Merging ${validChunkSummaries.length} valid chunk summaries`);
    try {
      const result = await mergeSummaries(validChunkSummaries, options, fileName, originalWordCount);
      const finalWordCount = countWords(result);
      
      console.log(`Final merged summary: ${finalWordCount} words (${Math.round((finalWordCount/originalWordCount)*100)}% of original)`);
      updateProgress({ stage: 'Summary complete!', processedChunks: chunks.length, totalChunks: chunks.length });
      return result;
    } catch (error) {
      console.error('Error merging summaries:', error);
      updateProgress({ stage: 'Finalizing summary (with errors)...', processedChunks: chunks.length, totalChunks: chunks.length });
      return validChunkSummaries.map((summary, index) => 
        `## Part ${index + 1} of ${validChunkSummaries.length}\n\n${summary}`
      ).join('\n\n');
    }
  } catch (error) {
    resetProgress();
    console.error('Critical error in processDocumentByChunks:', error);
    throw error;
  }
}

// --- FIXED: Updated to emphasize source fidelity and improve length control ---
async function mergeSummaries(
    summaries: string[], 
    options: SummaryOptions, 
    fileName: string, 
    originalDocumentWordCount: number // Word count of the original, full document
): Promise<string> {
  const targetPercentage = options.targetPercentage || 
    (options.detailLevel && detailLevelPercentages[options.detailLevel as DetailLevel]) || 
    0.25;
  
  // Target word count for the final merged summary is based on the ORIGINAL document's word count
  const targetFinalWordCount = Math.round(originalDocumentWordCount * targetPercentage);
  const minFinalWordCount = Math.max(10, Math.round(targetFinalWordCount * 0.9));
  const maxFinalWordCount = Math.round(targetFinalWordCount * 1.1);
  
  const combinedSummariesText = summaries.join("\n\n---\n\n"); // Join summaries clearly
  const combinedSummariesWordCount = countWords(combinedSummariesText);
  
  console.log(`Merging ${summaries.length} summaries. Combined word count of summaries: ${combinedSummariesWordCount}.`);
  console.log(`Target final merged summary length: ${targetFinalWordCount} words (${minFinalWordCount}-${maxFinalWordCount}), based on original doc's ${originalDocumentWordCount} words.`);
  
  // Determine token limit for the merge API call based on the length of combined summaries
  const mergeStrategy = determineProcessingStrategy(combinedSummariesText.length);
  const outputTokenLimit = mergeStrategy.tokenLimit;
  
  console.log(`Using merge output token limit of ${outputTokenLimit}`);
  
  const mergePrompt = `You are tasked with creating a single, cohesive, and comprehensive study summary.
This final summary will be created by intelligently integrating and refining the following set of partial summaries. These partial summaries were derived from different sections of a larger document titled "${fileName}". The original document had ${originalDocumentWordCount} words.

TWO PRIMARY REQUIREMENTS FOR THE FINAL MERGED SUMMARY:
1.  LENGTH: Your final merged summary MUST contain ${minFinalWordCount}-${maxFinalWordCount} words. This is approximately ${Math.round(targetPercentage * 100)}% of the original document's total word count.
2.  FORMAT: The summary must follow the "${options.studyFormat}" format and be optimized for ${options.knowledgeLevel} level students.
3.  SOURCE FIDELITY: ONLY include information found in the provided summaries - DO NOT add external knowledge.

CONTENT RESTRICTION - CRITICALLY IMPORTANT:
- You MUST ONLY use information found in the provided partial summaries
- These summaries contain ONLY information from the original source document
- NO external knowledge, examples, or explanations not found in the provided summaries
- Students will use this as a substitute for the original text, so accuracy is paramount
- Maintain the highest fidelity to the source content as reflected in the summaries

MANDATORY VERIFICATION PROCESS (YOU MUST DO THIS INTERNALLY BEFORE RESPONDING):
- After writing your final merged summary, COUNT THE WORDS.
- If the word count is outside the ${minFinalWordCount}-${maxFinalWordCount} range, REVISE your summary to fit.
- End your ENTIRE response with "Word count: [number]" where [number] is the actual word count of YOUR summary text.
- Verify that you've properly followed the "${options.studyFormat}" format style.
- Verify that ALL information comes from the provided summaries ONLY.

CRITICAL REQUIREMENTS FOR MERGING (in priority order):
1.  LENGTH ADHERENCE: ${minFinalWordCount}-${maxFinalWordCount} words for the final output.
2.  SOURCE FIDELITY: Only include information from the provided summaries. NO external knowledge.
3.  FORMAT CONSISTENCY: Strictly follow the "${options.studyFormat}" format structure.
4.  KNOWLEDGE LEVEL: Optimize for ${options.knowledgeLevel} level students.
5.  STUDY PURPOSE: Focus on ${options.studyPurpose} purpose.
6.  SUBJECT AREA: Apply best practices for ${options.subjectType} content.
7.  COHESION & COMPLETENESS:
    -   Seamlessly integrate information from all provided partial summaries.
    -   Eliminate redundancy between parts.
    -   Ensure smooth transitions and logical flow.
    -   The final summary should read as if it was created from the entire document at once, not as disjointed pieces.
    -   Preserve all unique and critical information from each partial summary.
    -   If the partial summaries included introductions or conclusions for their specific sections, synthesize these into a single, appropriate introduction and conclusion for the overall document.

The partial summaries to combine and refine are (total words in these parts: ${combinedSummariesWordCount}):

--- START OF PARTIAL SUMMARIES ---
${summaries.map((summary, index) => `PART ${index + 1} (Original chunk summary):\n${summary}\n\n--------------------\n`).join('')}
--- END OF PARTIAL SUMMARIES ---

Create one single, well-structured, and flowing study summary from all these parts, adhering to all requirements above.

FINAL REMINDERS (VERY IMPORTANT):
- YOUR ABSOLUTE TOP PRIORITY IS LENGTH: The final merged summary text (excluding the "Word count: ..." line) MUST be between ${minFinalWordCount} and ${maxFinalWordCount} words. Count carefully.
- STRICTLY USE ONLY INFORMATION FROM THE PROVIDED SUMMARIES. NO external knowledge.
- ADHERE TO THE FORMAT: Strictly follow the "${options.studyFormat}" style.
- MANDATORY ENDING: You MUST end your entire response with the line "Word count: [number]", where [number] is the total word count of the summary text you generated. Do not add any other text after this line.`;

  console.log(`Generated merge prompt, length: ${mergePrompt.length}, estimated tokens: ${Math.ceil(mergePrompt.length / 4)}`);
  
  let result = await callGeminiAPI(mergePrompt, outputTokenLimit);
  const initialResultWordCount = countWords(result.replace(/Word count: \d+\.?$/m, '').trim());
  
  if (initialResultWordCount < minFinalWordCount || initialResultWordCount > maxFinalWordCount) {
    console.log(`Merged summary length (${initialResultWordCount} words) outside acceptable range (${minFinalWordCount}-${maxFinalWordCount}), attempting iterative adjustment...`);
    
    result = await adjustSummaryLength(
        result,
        minFinalWordCount,
        maxFinalWordCount,
        targetFinalWordCount, // Ideal target for merged summary
        outputTokenLimit,
        "final merged summary",
        options,
        fileName
    );
  }
  
  result = result.replace(/Word count: \d+\.?$/m, '').trim();
  return result;
}

async function callGeminiAPI(prompt: string, maxOutputTokens: number): Promise<string> {
  console.log(`Calling Gemini API. Max output tokens: ${maxOutputTokens}. Prompt length: ${prompt.length} chars (approx ${Math.ceil(prompt.length/3.8)} tokens).`); // Adjusted char/token ratio slightly
  
  const requestBody = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: 0.1, // Slightly increased for more nuanced generation, but still low for instruction following
      maxOutputTokens: maxOutputTokens,
      topP: 0.95, 
      topK: 40 // Using a topK value as in original
    },
     // It's good practice to set safety settings to ensure desired behavior.
     // BLOCK_NONE is the most permissive, use with caution and understanding of content policies.
     // Or use BLOCK_ONLY_HIGH, BLOCK_MEDIUM_AND_ABOVE as per your needs.
    // "safetySettings": [
    //    { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_ONLY_HIGH" },
    //    { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_ONLY_HIGH" },
    //    { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_ONLY_HIGH" },
    //    { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_ONLY_HIGH" }
    // ]
  };

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(360000), // 6-minute timeout (increased for potentially long adjustments)
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error(`Gemini API Error (${response.status}):`, JSON.stringify(responseData, null, 2));
      const errorDetail = responseData?.error?.message || `Request failed with status ${response.status}`;
      const finishReason = responseData?.candidates?.[0]?.finishReason;
      const safetyRatings = responseData?.candidates?.[0]?.safetyRatings;

      if (finishReason === "MAX_TOKENS") {
         throw new Error(`Gemini API Error: Output truncated due to maximum token limit (${maxOutputTokens}). Consider increasing maxOutputTokens or if input is too large for model, simplify prompt/content. Original error: ${errorDetail}`);
      }
      if (finishReason === "SAFETY") {
        console.error("Safety block details:", safetyRatings);
        throw new Error(`Gemini API Error: Content generation blocked due to safety settings. ${errorDetail}`);
      }
      throw new Error(`Gemini API Error: ${errorDetail} (Finish Reason: ${finishReason || 'N/A'})`);
    }

    const textOutput = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;

    const finishReason = responseData?.candidates?.[0]?.finishReason;
    const safetyRatings = responseData?.candidates?.[0]?.safetyRatings;

    if (finishReason === "SAFETY") {
        console.error('Content generation blocked due to safety settings. Finish reason: SAFETY.', safetyRatings);
        throw new Error(`Content generation blocked due to safety settings. Review safety ratings in logs.`);
    }
    // Check prompt feedback as well, though candidate finishReason is often more direct for output blocks
    const promptBlockReason = responseData?.promptFeedback?.blockReason;
    if (promptBlockReason) {
      console.warn('Prompt feedback indicated potential issue:', promptBlockReason, responseData.promptFeedback);
      if(!textOutput || textOutput.trim().length === 0) { // If output is empty AND prompt was problematic
        throw new Error(`Content generation failed. Prompt issue: ${promptBlockReason}.`);
      }
    }
    
    if (!textOutput || textOutput.trim().length === 0) {
      console.error('Empty API response or no content generated. Response data:', JSON.stringify(responseData, null, 2));
       if (finishReason) {
         throw new Error(`The API returned an empty response. Finish reason: ${finishReason}.`);
       }
      throw new Error('The API returned an empty or invalid response, and no specific finish reason was provided.');
    }

    console.log(`API call successful, response length: ${textOutput.length}`);
    return textOutput;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    if (error instanceof DOMException && error.name === 'TimeoutError') {
        throw new Error('Gemini API call timed out.');
    }
    throw error; 
  }
}

// --- FIXED: Enhanced with source fidelity instructions ---
function generateStudyPrompt(
  fileContent: string, 
  options: SummaryOptions, 
  fileName: string,
  includeIntroForThisSection: boolean = true, // Renamed for clarity
  includeConclusionForThisSection: boolean = true, // Renamed for clarity
  isOverallChunkedProcessing: boolean = false, // Is this part of a larger doc being chunked?
  wordCountOfThisContent: number // Word count of fileContent specifically
): string {
  const targetPercentage = options.targetPercentage || 
    (options.detailLevel && detailLevelPercentages[options.detailLevel as DetailLevel]) || 
    0.25;
  
  const targetWordCount = Math.round(wordCountOfThisContent * targetPercentage);
  const minWordCount = Math.max(10, Math.round(targetWordCount * 0.90));
  const maxWordCount = Math.round(targetWordCount * 1.10);

  let prompt = `You are an expert academic summarizer. Your task is to create a high-quality study summary.

PRIMARY REQUIREMENTS FOR THIS SUMMARY SECTION:
1.  LENGTH: Your summary of THIS TEXT SECTION (which has ${wordCountOfThisContent} words) MUST contain ${minWordCount}-${maxWordCount} words. This is approximately ${Math.round(targetPercentage * 100)}% of this section.
2.  FORMAT: The summary must strictly follow the "${options.studyFormat}" format and be optimized for ${options.knowledgeLevel} level students.
3.  SOURCE FIDELITY: ONLY include information present in the original document - this is CRITICAL as students will use your summary instead of reading the original.

CONTENT RESTRICTION - CRITICALLY IMPORTANT:
- You MUST ONLY summarize information found in the text provided
- NO external knowledge, examples, or explanations not present in the original
- You may restructure and rephrase for clarity and organization, but not add concepts from outside
- Students will rely on this summary as a substitute for reading the original text
- Factual accuracy relative to the source document is essential

MANDATORY VERIFICATION PROCESS (YOU MUST DO THIS INTERNALLY BEFORE RESPONDING):
- After writing your summary, COUNT THE WORDS accurately.
- If the word count is outside the ${minWordCount}-${maxWordCount} range, REVISE your summary to fit precisely.
- Verify that ALL information comes DIRECTLY from the source text.
- End your ENTIRE response with the exact line "Word count: [actual_word_count_of_your_revised_text_only]".

This summary is being generated from a text section titled (or part of) "${fileName}".

CRITICAL REQUIREMENTS (in strict priority order):
1.  LENGTH ADHERENCE: ${minWordCount}-${maxWordCount} words for this summary section.
2.  SOURCE FIDELITY: ONLY include information from the provided text.
3.  FORMATTING: Rigorously apply the "${options.studyFormat}" structure.
4.  KNOWLEDGE LEVEL: Content must be tailored for ${options.knowledgeLevel} students.
5.  STUDY PURPOSE: The summary must serve the primary purpose of ${options.studyPurpose}.
6.  SUBJECT AREA FOCUS: Apply best practices for ${options.subjectType} content.
`;
  
  if (isOverallChunkedProcessing) {
    prompt += `\nCONTEXT: This text section is part of a larger document being processed in chunks. Your summary should focus ONLY on the provided text section. `;
    if (includeIntroForThisSection) {
      prompt += `Since this is marked as needing an introduction for its section (e.g., it's the first part), provide a brief introductory context relevant to THIS SECTION. `;
    } else {
      prompt += `Do NOT include a standalone introduction for this section, as it will be integrated with others. `;
    }
    if (includeConclusionForThisSection) {
      prompt += `Since this is marked as needing a conclusion for its section (e.g., it's the final part), provide a brief concluding thought summarizing THIS SECTION. `;
    } else {
      prompt += `Do NOT include a standalone conclusion for this section. `;
    }
    prompt += `\n\n`;
  } else {
    // This means it's a direct, single-pass summary of the entire content provided
    prompt += `\nCONTEXT: This is a summary of the entire provided document. Include a suitable overall introduction and conclusion for the document.\n\n`;
  }

  prompt += `KNOWLEDGE LEVEL - ${options.knowledgeLevel.toUpperCase()}:\n`;
  if (options.knowledgeLevel === 'introductory') {
    prompt += `- Explain all concepts from basics, assuming no prior knowledge.\n- Use simple language, concrete examples, and analogies.\n- Define all technical terms and jargon immediately.\n- Focus on fundamental principles and clear connections between ideas.\n\n`;
  } else if (options.knowledgeLevel === 'intermediate') {
    prompt += `- Assume basic familiarity with core concepts but provide brief refreshers.\n- Use standard terminology with clarification where needed.\n- Include more technical details, nuances, and practical applications.\n- Highlight common misconceptions and relationships between concepts.\n\n`;
  } else if (options.knowledgeLevel === 'advanced') {
    prompt += `- Use specialized, expert-level terminology.\n- Focus on complex nuances, theoretical frameworks, limitations, and advanced applications.\n- Discuss current research, debates, and unresolved questions if relevant.\n- Encourage critical analysis and synthesis of information.\n\n`;
  }

  prompt += `STUDY PURPOSE - ${options.studyPurpose.toUpperCase()}:\n`;
  if (options.studyPurpose === 'examPrep') {
    prompt += `- Organize around key testable topics, definitions, formulas, and facts.\n- Highlight critical information for assessments (e.g., using bolding or lists).\n- Structure for efficient review and memorization. Include self-test prompts or practice question styles if suitable for the format.\n\n`;
  } else if (options.studyPurpose === 'conceptUnderstanding') {
    prompt += `- Emphasize the "why" behind concepts, not just rote memorization.\n- Explain underlying principles, theoretical foundations, and interconnections.\n- Use rich examples and multiple perspectives to deepen understanding.\n- Address common misconceptions directly.\n\n`;
  } else if (options.studyPurpose === 'quickReview') {
    prompt += `- Create highly scannable content with clear visual hierarchy (headings, lists, bolding).\n- Prioritize essential information with concise language for rapid comprehension.\n- Use bullet points, numbered lists, and tables extensively.\n- Focus on core concepts, key terms, and at-a-glance summaries.\n\n`;
  }

  prompt += `SUBJECT AREA - ${options.subjectType.toUpperCase()}:\n`;
  if (options.subjectType === 'mathScience') {
    prompt += `- Present formulas clearly, define variables, include units.\n- Provide step-by-step examples for problem-solving.\n- Explain conceptual meaning behind operations and theories.\n- Describe diagrams/visuals if text-only output.\n\n`;
  } else if (options.subjectType === 'engineeringComputerScience') {
    prompt += `- Explain algorithms, system architectures, design patterns.\n- Include pseudocode or code examples (formatted as code blocks if possible).\n- Highlight technical requirements, trade-offs, and best practices.\n\n`;
  } else if (options.subjectType === 'humanitiesSocialSciences') {
    prompt += `- Structure around key theories, thinkers, movements, and historical context.\n- Analyze arguments, evidence, and multiple perspectives.\n- Connect abstract concepts to concrete examples.\n\n`;
  } else if (options.subjectType === 'lawMedicine') {
    prompt += `- Organize hierarchically; present procedures/protocols precisely.\n- Define technical terms with exactness; highlight exceptions/contraindications.\n- Reference standards/regulations and evidence-based principles.\n\n`;
  } else if (options.subjectType === 'businessFinance') {
    prompt += `- Explain financial models, metrics, KPIs, and market mechanisms.\n- Provide practical examples in business contexts; discuss strategic frameworks.\n- Address risk factors and industry standards.\n\n`;
  } else { // Default 'general'
    prompt += `- Organize logically, highlight key concepts/principles.\n- Include illustrative examples and show relationships between topics.\n- Balance theory with application; address common misconceptions.\n\n`;
  }
  
  prompt += `FORMAT - ${options.studyFormat.toUpperCase()} (Strictly Adhere):\n`;
  if (options.studyFormat === 'cornellNotes') {
    prompt += `Structure as a two-column table (or Markdown table approximation).
| Cue / Keywords / Questions (Left Column) | Detailed Notes & Explanations (Right Column) |
|------------------------------------------|----------------------------------------------|
| Key Term 1                               | Definition, examples, details...             |
| Main Question 1                          | Comprehensive answer...                      |
At the end of all notes for this section, add a "SUMMARY OF THIS SECTION:" subsection that synthesizes the key takeaways from the notes above.\n\n`;
  } else if (options.studyFormat === 'mindMap') {
    prompt += `Represent as a hierarchical outline using Markdown headings:
# Main Topic of this Section
## Key Sub-Topic 1
   - Detail 1.1
   - Detail 1.2 (→ Relates to: Key Sub-Topic 2)
## Key Sub-Topic 2
   ### Sub-Detail 2.1
       - Explanation...
Use indentation (via heading levels or lists) and relationship indicators (e.g., "→ Relates to:") to show structure.\n\n`;
  } else if (options.studyFormat === 'flashcardPrep') {
    prompt += `Format as a list of Question/Answer pairs.
## Topic Area (if multiple topics in this section)
Q: [Specific Question 1]
A: [Comprehensive Answer 1]

--- (separator)

Q: [Specific Question 2]
A: [Comprehensive Answer 2]
Ensure questions are clear and answers are self-contained and accurate.\n\n`;
  } else if (options.studyFormat === 'definitionList') {
    prompt += `Format as a list of terms with their definitions.
## Topic Area (if multiple topics in this section)
**TERM 1**: 
  * Definition: [Clear, comprehensive explanation]
  * Example: (Optional) [Concrete illustration]
  * Related: (Optional) [e.g., See also: **TERM 2**]

**TERM 2**: 
  * Definition: [...]\n\n`;
  } else { // Standard Outline Format
    prompt += `Use clear hierarchical structure (Markdown headings: #, ##, ###).
Employ paragraphs, bullet points (-), and numbered lists (1.) for clarity.
Bold important terms (**term**). Ensure logical flow.\n\n`;
  }

  if (options.includeExamples) {
    prompt += `INCLUDE EXAMPLES: Where appropriate, integrate relevant examples to illustrate concepts, using ONLY examples found in the original text. Do not invent or add examples from outside the source material.\n\n`;
  }
  
  if (options.includeCitations) {
    prompt += `INCLUDE CITATIONS: Reference specific sections or content from the original document where appropriate, to help students locate information if needed.\n\n`;
  }
  
  prompt += `FINAL INSTRUCTIONS (CRUCIAL - RE-READ BEFORE GENERATING):
-   ABSOLUTE LENGTH TARGET: The summary text (excluding the "Word count: ..." line) MUST be between ${minWordCount} and ${maxWordCount} words. This is your top priority.
-   SOURCE FIDELITY: ONLY use information from the provided document. NO external knowledge.
-   STRICT FORMATTING: Adhere rigorously to the "${options.studyFormat}" style detailed above.
-   MANDATORY ENDING: You MUST end your entire response with the single line "Word count: [number]", where [number] is the total word count of the summary text you generated just before this line. Do not add any other text after this "Word count: ..." line.

Provided text section from "${fileName}" (this section has ${wordCountOfThisContent} words):

--- Document Content Start ---
${fileContent}
--- Document Content End ---`;
  
  return prompt;
}

// --- API POST Handler ---
export async function POST(req: NextRequest) {
  if (!API_KEY) {
    console.error("CRITICAL ERROR: GEMINI_API_KEY environment variable is not set.");
    return NextResponse.json({ error: 'Server configuration error: API key not available.' }, { status: 500 });
  }

  try {
    resetProgress();
    updateProgress({ stage: 'Starting document processing...' });
    
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const originalTextFromClient = formData.get('originalText') as string | null;
    
    let summaryOptions: SummaryOptions = { ...defaultSummaryOptions };
    const optionsJson = formData.get('options') as string | null;
    
    if (optionsJson) {
      try {
        const parsedOptions = JSON.parse(optionsJson);
        console.log('Received summary options:', parsedOptions);
        
        const detailLevel = parsedOptions.detailLevel || defaultSummaryOptions.detailLevel;
        summaryOptions = {
          ...defaultSummaryOptions, // Start with defaults
          ...parsedOptions,         // Override with parsed options
          // Ensure critical fields have valid fallbacks
          studyPurpose: parsedOptions.studyPurpose || defaultSummaryOptions.studyPurpose,
          subjectType: parsedOptions.subjectType || defaultSummaryOptions.subjectType,
          studyFormat: parsedOptions.studyFormat || defaultSummaryOptions.studyFormat,
          knowledgeLevel: parsedOptions.knowledgeLevel || defaultSummaryOptions.knowledgeLevel,
          detailLevel: detailLevel,
          // minLength from UI is a guideline; targetPercentage is primary for generation
          minLength: parsedOptions.minLength || getMinLengthFromDetailLevel(detailLevel),
          // Ensure boolean flags are explicitly handled if undefined
          includeExamples: parsedOptions.includeExamples !== undefined ? parsedOptions.includeExamples : defaultSummaryOptions.includeExamples,
          includeCitations: parsedOptions.includeCitations !== undefined ? parsedOptions.includeCitations : defaultSummaryOptions.includeCitations,
          // Crucially, ensure targetPercentage is always set
          targetPercentage: parsedOptions.targetPercentage || 
                            detailLevelPercentages[detailLevel as DetailLevel] || 
                            0.25 // Absolute fallback
        };
        console.log('Validated summary options:', summaryOptions);
      } catch (e) {
        console.error('Failed to parse summary options, using defaults:', e);
        const detailLevel = defaultSummaryOptions.detailLevel;
        summaryOptions = { 
            ...defaultSummaryOptions, 
            targetPercentage: detailLevelPercentages[detailLevel as DetailLevel] || 0.25
        };
      }
    } else {
        // If no optionsJson, ensure targetPercentage is set from default detailLevel
        const detailLevel = defaultSummaryOptions.detailLevel;
        summaryOptions = { 
           ...defaultSummaryOptions, 
           targetPercentage: detailLevelPercentages[detailLevel as DetailLevel] || 0.25
       };
    }


    if (!file) {
      resetProgress();
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    console.log(`Processing uploaded file: ${file.name}, Type: ${file.type}, Size: ${file.size} bytes`);

    let fileContent = '';
    try {
      fileContent = await readFileContent(file);
      
      if (originalTextFromClient && 
          originalTextFromClient.length > 0 && 
          !originalTextFromClient.includes('Document content will be extracted') && // Heuristic to check if it's actual content
          (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt'))) {
        console.log(`Using client-provided text content for ${file.name}`);
        fileContent = originalTextFromClient;
      }
      
      if (!fileContent || fileContent.trim().length === 0) {
        resetProgress();
        console.warn(`File content is empty after parsing: ${file.name}`);
        return NextResponse.json({ error: 'File content appears to be empty or could not be read.' }, { status: 400 });
      }
      console.log(`Successfully read content from ${file.name}. Content length: ${fileContent.length}`);
      
      const originalWordCount = countWords(fileContent);
      console.log(`Original document word count: ${originalWordCount}`);
      if (originalWordCount === 0 && fileContent.length > 0) {
        console.warn("Word count is 0 but content length is > 0. This might indicate an issue with word counting for this specific content or non-standard text.");
      }
      
    } catch (readError: any) {
      resetProgress();
      console.error(`Error reading file content from ${file.name}:`, readError);
      const errorMessage = readError.message?.includes('Unsupported file type')
        ? readError.message
        : `Failed to read file content. The file might be corrupted or in an unexpected format.`;
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    
    try {
      const summary = await processDocumentByChunks(fileContent, summaryOptions, file.name);
      
      const originalDocWordCount = countWords(fileContent); 
      const summaryWordCount = countWords(summary); // Count words of the final summary
      const percentageOfOriginal = originalDocWordCount > 0 ? Math.round((summaryWordCount / originalDocWordCount) * 100) : 0;
      const targetPercentageValue = (summaryOptions.targetPercentage || 0.25) * 100;
      
      console.log(`FINAL SUMMARY STATS for file: ${file.name}:`);
      console.log(`- Original: ${originalDocWordCount} words`);
      console.log(`- Summary: ${summaryWordCount} words (${percentageOfOriginal}% of original)`);
      console.log(`- Target percentage was: ${targetPercentageValue.toFixed(0)}%`);
      const deviation = Math.abs(percentageOfOriginal - targetPercentageValue);
      // Check against the ±10% of the target word count, not percentage points of the percentage.
      const minTargetWords = Math.round( (originalDocWordCount * (summaryOptions.targetPercentage || 0.25)) * 0.9);
      const maxTargetWords = Math.round( (originalDocWordCount * (summaryOptions.targetPercentage || 0.25)) * 1.1);
      const targetMet = summaryWordCount >= minTargetWords && summaryWordCount <= maxTargetWords;

      console.log(`- Target word range: ${minTargetWords}-${maxTargetWords}. Achieved: ${summaryWordCount}. Target met: ${targetMet ? "YES" : "NO"}`);
      
      return NextResponse.json({ 
        summary,
        originalContent: fileContent, 
        meta: {
          options: summaryOptions,
          contentLength: fileContent.length,
          originalWordCount: originalDocWordCount,
          summaryWordCount: summaryWordCount,
          percentageOfOriginal: percentageOfOriginal,
          targetPercentage: summaryOptions.targetPercentage || 0.25,
          wasContentTruncated: false // This flag might need actual logic if input truncation to model can happen
        }
      });
    } catch (processingError: any) {
      resetProgress();
      console.error(`Error during document processing for ${file.name}:`, processingError);
      return NextResponse.json({ 
        error: `Failed to process document: ${processingError.message || 'Unknown processing error'}`,
        // partialSummary: "We encountered an error processing the complete document. Try a smaller document or contact support." 
      }, { status: 500 });
    }

  } catch (error: any) {
    resetProgress();
    console.error('Unhandled error in /api/summarize POST handler:', error);
    let errorMessage = 'An unexpected error occurred during summarization.';
    if (error.message) {
        errorMessage += ` Details: ${error.message}`;
    }
    // Add stack trace if available and in non-production
    // if (process.env.NODE_ENV !== 'production' && error.stack) {
    //    errorMessage += `\nStack: ${error.stack}`;
    // }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  } finally {
    // Ensure progress is reset, e.g., after a delay to allow client to fetch final status
    setTimeout(() => resetProgress(), 5000); 
  }
}