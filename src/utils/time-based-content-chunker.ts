// utils/time-based-content-chunker.ts - FIXED VERSION
import { analyzeContentForLearning } from './content-analysis';

export interface TimeBasedChunk {
  content: string;
  topics: string[];
  index: number;
  title: string;
  keyConcepts: string[];
  learningObjectives: string[];
  educationalValue: number;
  difficultyLevel: 'basic' | 'intermediate' | 'advanced';
  wordCount: number;
  estimatedReadingTime: number; // in seconds
  actualReadingTime: number; // target reading time in seconds
  semanticBoundaries: {
    startsWithHeader: boolean;
    endsWithConclusion: boolean;
    conceptualCompleteness: number;
  };
}

export class TimeBasedContentChunker {
  private wordsPerMinute = 200; // Average reading speed
  private minChunkTime = 120; // 2 minutes minimum
  private maxChunkTime = 900; // 15 minutes maximum

  public divideIntoTimeBasedChunks(
    content: string, 
    targetReadingTimeSeconds: number = 180
  ): TimeBasedChunk[] {
    console.log('⏱️ Starting time-based content chunking...', {
      contentLength: content.length,
      targetReadingTime: `${Math.round(targetReadingTimeSeconds / 60)} minutes`
    });
    
    if (!content || content.trim().length < 100) {
      throw new Error('Content too short for time-based chunking (minimum 100 characters)');
    }

    // Clamp target reading time to reasonable bounds
    const clampedTargetTime = Math.max(this.minChunkTime, Math.min(this.maxChunkTime, targetReadingTimeSeconds));
    
    try {
      // Step 1: Clean and analyze content
      const cleanedContent = this.preprocessContent(content);
      const totalWords = this.countWords(cleanedContent);
      const totalReadingTime = (totalWords / this.wordsPerMinute) * 60; // in seconds
      
      console.log('📊 Content analysis:', {
        totalWords,
        totalReadingTime: `${Math.round(totalReadingTime / 60)} minutes`,
        targetTime: `${Math.round(clampedTargetTime / 60)} minutes`
      });
      
      // Step 2: Determine chunking strategy
      if (totalReadingTime <= clampedTargetTime * 1.2) {
        // Content fits in one chunk (with 20% buffer)
        console.log('📄 Content fits in single chunk');
        return [this.createSingleChunk(cleanedContent, clampedTargetTime)];
      }
      
      // Step 3: Calculate target chunk count and size
      const estimatedChunks = Math.ceil(totalReadingTime / clampedTargetTime);
      const targetWordsPerChunk = Math.round(totalWords / estimatedChunks);
      
      console.log('🔢 Chunking strategy:', {
        estimatedChunks,
        targetWordsPerChunk,
        targetTimePerChunk: `${Math.round(clampedTargetTime / 60)} minutes`
      });
      
      // Step 4: Create time-based chunks
      const chunks = this.createTimeBasedChunks(cleanedContent, targetWordsPerChunk, clampedTargetTime);
      
      // Step 5: Validate and refine chunks
      const refinedChunks = this.validateAndRefineChunks(chunks, clampedTargetTime);
      
      console.log(`✅ Created ${refinedChunks.length} time-based chunks:`, 
        refinedChunks.map(chunk => ({
          index: chunk.index,
          words: chunk.wordCount,
          readingTime: `${Math.round(chunk.estimatedReadingTime / 60)}min`,
          title: chunk.title
        }))
      );
      
      return refinedChunks;
      
    } catch (error) {
      console.error('❌ Time-based chunking failed:', error);
      throw new Error(`Time-based chunking failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private preprocessContent(content: string): string {
    return content
      .replace(/\s+/g, ' ')
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      .replace(/\n\s*\n\s*\n+/g, '\n\n')
      .replace(/\u00A0/g, ' ')
      .replace(/\u2013|\u2014/g, '-')
      .trim();
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  private createSingleChunk(content: string, targetTime: number): TimeBasedChunk {
    const wordCount = this.countWords(content);
    const estimatedTime = (wordCount / this.wordsPerMinute) * 60;
    const topics = this.extractTopics(content);
    const concepts = this.extractConcepts(content);
    
    return {
      content: content.trim(),
      topics,
      index: 0,
      title: this.generateChunkTitle(content, topics),
      keyConcepts: concepts,
      learningObjectives: this.generateLearningObjectives(content, concepts),
      educationalValue: this.assessEducationalValue(content, concepts),
      difficultyLevel: this.assessDifficulty(content, concepts),
      wordCount,
      estimatedReadingTime: estimatedTime,
      actualReadingTime: targetTime,
      semanticBoundaries: {
        startsWithHeader: this.startsWithHeader(content),
        endsWithConclusion: this.endsWithConclusion(content),
        conceptualCompleteness: 10 // Single chunk is complete by definition
      }
    };
  }

  private createTimeBasedChunks(content: string, targetWordsPerChunk: number, targetTime: number): TimeBasedChunk[] {
    const paragraphs = content.split(/\n\s*\n+/).filter(p => p.trim().length > 30);
    const chunks: TimeBasedChunk[] = [];
    
    let currentChunk = '';
    let currentWordCount = 0;
    let chunkIndex = 0;
    
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i].trim();
      const paragraphWords = this.countWords(paragraph);
      
      // Check if adding this paragraph would exceed target
      const wouldExceedTarget = currentWordCount > 0 && 
                               (currentWordCount + paragraphWords) > targetWordsPerChunk * 1.3; // 30% buffer
      
      // Check if current chunk meets minimum requirements
      const meetsMinimum = currentWordCount >= targetWordsPerChunk * 0.7; // 70% of target
      
      if (wouldExceedTarget && meetsMinimum) {
        // Create chunk from current content
        if (currentChunk.trim()) {
          chunks.push(this.createChunkFromContent(currentChunk, chunkIndex, targetTime));
          chunkIndex++;
        }
        
        // Start new chunk
        currentChunk = paragraph + '\n\n';
        currentWordCount = paragraphWords;
      } else {
        // Add to current chunk
        currentChunk += paragraph + '\n\n';
        currentWordCount += paragraphWords;
      }
    }
    
    // Add final chunk
    if (currentChunk.trim()) {
      chunks.push(this.createChunkFromContent(currentChunk, chunkIndex, targetTime));
    }
    
    return chunks;
  }

  private createChunkFromContent(content: string, index: number, targetTime: number): TimeBasedChunk {
    const wordCount = this.countWords(content.trim());
    const estimatedTime = (wordCount / this.wordsPerMinute) * 60;
    const topics = this.extractTopics(content);
    const concepts = this.extractConcepts(content);
    
    return {
      content: content.trim(),
      topics,
      index,
      title: this.generateChunkTitle(content, topics, index),
      keyConcepts: concepts,
      learningObjectives: this.generateLearningObjectives(content, concepts),
      educationalValue: this.assessEducationalValue(content, concepts),
      difficultyLevel: this.assessDifficulty(content, concepts),
      wordCount,
      estimatedReadingTime: estimatedTime,
      actualReadingTime: targetTime,
      semanticBoundaries: {
        startsWithHeader: this.startsWithHeader(content),
        endsWithConclusion: this.endsWithConclusion(content),
        conceptualCompleteness: this.assessConceptualCompleteness(content, concepts)
      }
    };
  }

  private extractTopics(content: string): string[] {
    const topics = new Set<string>();
    
    // Extract capitalized terms
    const capitalizedTerms = content.match(/\b[A-Z][a-zA-Z]{2,}\b/g) || [];
    capitalizedTerms.forEach(term => {
      if (term.length > 3 && term.length < 25) {
        topics.add(term);
      }
    });
    
    // Extract quoted terms
    const quotedTerms = content.match(/"([^"]{3,25})"/g) || [];
    quotedTerms.forEach(quoted => {
      const term = quoted.replace(/"/g, '');
      topics.add(term);
    });
    
    // Extract emphasized terms (markdown-style)
    const emphasizedTerms = content.match(/\*\*([^*]{3,25})\*\*/g) || [];
    emphasizedTerms.forEach(emphasized => {
      const term = emphasized.replace(/\*\*/g, '');
      topics.add(term);
    });
    
    return Array.from(topics).slice(0, 5);
  }

  private extractConcepts(content: string): string[] {
    const concepts = new Set<string>();
    
    // Pattern 1: Definition patterns
    const definitionPatterns = [
      /([A-Za-z\s]{3,30})\s+(?:is|are|means|refers to|defined as)\s+([^.!?]{10,100})[.!?]/gi,
      /([A-Za-z\s]{3,30}):\s*([^.\n]{10,100})[.\n]/gi
    ];
    
    definitionPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const concept = match[1].trim();
        if (concept.length > 2 && concept.length < 30) {
          concepts.add(concept);
        }
      }
    });
    
    // Pattern 2: Technical terms
    const technicalTerms = content.match(/\b[A-Z][a-zA-Z]{3,20}\b/g) || [];
    technicalTerms.forEach(term => {
      if (term.length > 3 && !this.isCommonWord(term)) {
        concepts.add(term);
      }
    });
    
    // Pattern 3: Frequently mentioned terms
    const words = content.toLowerCase().match(/\b[a-z]{4,15}\b/g) || [];
    const frequency = new Map<string, number>();
    
    words.forEach(word => {
      if (!this.isStopWord(word)) {
        frequency.set(word, (frequency.get(word) || 0) + 1);
      }
    });
    
    frequency.forEach((count, word) => {
      if (count >= 2 && word.length > 4) { // Reduced threshold for time-based chunks
        concepts.add(this.titleCase(word));
      }
    });
    
    return Array.from(concepts).slice(0, 8);
  }

  private generateChunkTitle(content: string, topics: string[], index?: number): string {
    if (topics.length > 0) {
      const mainTopic = topics[0];
      const emoji = this.getTopicEmoji(mainTopic);
      return `${emoji} ${mainTopic}`;
    }
    
    // Try to extract from first sentence
    const firstSentence = content.split(/[.!?]/)[0];
    const titleMatch = firstSentence.match(/\b([A-Z][a-zA-Z\s]{5,40})\b/);
    if (titleMatch) {
      return `📄 ${titleMatch[1].trim()}`;
    }
    
    return index !== undefined ? `📚 Section ${index + 1}` : '📚 Study Material';
  }

  private getTopicEmoji(topic: string): string {
    const lowercaseTopic = topic.toLowerCase();
    if (lowercaseTopic.includes('introduction') || lowercaseTopic.includes('overview')) return '🔍';
    if (lowercaseTopic.includes('history') || lowercaseTopic.includes('background')) return '📜';
    if (lowercaseTopic.includes('application') || lowercaseTopic.includes('practice')) return '⚙️';
    if (lowercaseTopic.includes('future') || lowercaseTopic.includes('trend')) return '🔮';
    if (lowercaseTopic.includes('challenge') || lowercaseTopic.includes('problem')) return '🧩';
    if (lowercaseTopic.includes('benefit') || lowercaseTopic.includes('advantage')) return '✅';
    if (lowercaseTopic.includes('data') || lowercaseTopic.includes('analysis')) return '📊';
    if (lowercaseTopic.includes('conclusion') || lowercaseTopic.includes('summary')) return '📝';
    if (lowercaseTopic.includes('artificial') || lowercaseTopic.includes('intelligence')) return '🤖';
    if (lowercaseTopic.includes('technology') || lowercaseTopic.includes('tech')) return '💻';
    return '📑';
  }

  private generateLearningObjectives(content: string, concepts: string[]): string[] {
    const objectives: string[] = [];
    const actionVerbs = ['Understand', 'Explain', 'Identify', 'Analyze', 'Describe'];
    
    // Generate objectives based on concepts
    concepts.slice(0, 3).forEach((concept, index) => {
      const verb = actionVerbs[index % actionVerbs.length];
      objectives.push(`${verb} the concept of ${concept} and its significance`);
    });
    
    // Add general comprehension objective
    if (objectives.length < 2) {
      objectives.push('Understand the main ideas presented in this section');
      objectives.push('Identify key relationships between concepts');
    }
    
    return objectives.slice(0, 4);
  }

  private assessEducationalValue(content: string, concepts: string[]): number {
    let score = 5; // Base score
    
    // Content length factor
    const wordCount = this.countWords(content);
    if (wordCount >= 200) score += 1;
    if (wordCount >= 400) score += 1;
    
    // Concept richness
    if (concepts.length >= 2) score += 1;
    if (concepts.length >= 4) score += 1;
    
    // Educational indicators
    const indicators = [
      /\b(define|definition|explain|concept|principle|theory|method|process)\b/i,
      /\b(important|significant|key|main|primary|essential)\b/i,
      /\b(because|therefore|thus|however|moreover)\b/i,
      /\b(example|such as|for instance|including)\b/i
    ];
    
    indicators.forEach(pattern => {
      if (pattern.test(content)) score += 0.5;
    });
    
    // Structure bonus
    if (content.includes('\n\n') || content.includes('•') || content.includes('-')) {
      score += 0.5;
    }
    
    return Math.min(10, Math.max(1, Math.round(score)));
  }

  private assessDifficulty(content: string, concepts: string[]): 'basic' | 'intermediate' | 'advanced' {
    let difficultyScore = 0;
    
    // Word complexity
    const words = content.split(/\s+/);
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    if (avgWordLength > 5.5) difficultyScore += 1;
    if (avgWordLength > 7) difficultyScore += 1;
    
    // Technical term density
    if (concepts.length > 3) difficultyScore += 1;
    if (concepts.length > 6) difficultyScore += 1;
    
    // Sentence complexity
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = words.length / sentences.length;
    if (avgSentenceLength > 15) difficultyScore += 1;
    if (avgSentenceLength > 25) difficultyScore += 1;
    
    if (difficultyScore <= 2) return 'basic';
    if (difficultyScore <= 4) return 'intermediate';
    return 'advanced';
  }

  private startsWithHeader(content: string): boolean {
    const firstLine = content.split('\n')[0].trim();
    return /^(#{1,6}\s+|[A-Z][A-Z\s]+$|\d+\.\s+|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*:?)/.test(firstLine);
  }

  private endsWithConclusion(content: string): boolean {
    const lastSentences = content.split(/[.!?]/).slice(-2).join(' ').toLowerCase();
    const conclusionWords = ['conclusion', 'summary', 'therefore', 'thus', 'in summary', 'finally'];
    return conclusionWords.some(word => lastSentences.includes(word));
  }

  private assessConceptualCompleteness(content: string, concepts: string[]): number {
    let completeness = 5; // Base completeness
    
    // Check if concepts are well explained
    concepts.forEach(concept => {
      const conceptMentions = (content.toLowerCase().match(new RegExp(concept.toLowerCase(), 'g')) || []).length;
      const hasDefinition = new RegExp(`${concept}\\s+(?:is|are|means)`, 'i').test(content);
      
      if (conceptMentions > 1) completeness += 0.5;
      if (hasDefinition) completeness += 1;
    });
    
    // Check for explanatory structure
    const explanatoryPatterns = [
      /because|since|due to|therefore|thus/i,
      /however|although|despite|nevertheless/i,
      /for example|such as|including/i
    ];
    
    explanatoryPatterns.forEach(pattern => {
      if (pattern.test(content)) completeness += 0.5;
    });
    
    return Math.min(10, Math.max(1, Math.round(completeness)));
  }

  private validateAndRefineChunks(chunks: TimeBasedChunk[], targetTime: number): TimeBasedChunk[] {
    const validatedChunks: TimeBasedChunk[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Check if chunk is too small and can be merged
      if (chunk.estimatedReadingTime < targetTime * 0.5 && i < chunks.length - 1) {
        const nextChunk = chunks[i + 1];
        if (chunk.estimatedReadingTime + nextChunk.estimatedReadingTime <= targetTime * 1.3) {
          // Merge chunks
          const mergedChunk = this.mergeChunks(chunk, nextChunk, targetTime);
          validatedChunks.push(mergedChunk);
          i++; // Skip next chunk as it's been merged
          continue;
        }
      }
      
      // Re-index chunks
      chunk.index = validatedChunks.length;
      validatedChunks.push(chunk);
    }
    
    return validatedChunks;
  }

  private mergeChunks(chunk1: TimeBasedChunk, chunk2: TimeBasedChunk, targetTime: number): TimeBasedChunk {
    const mergedContent = chunk1.content + '\n\n' + chunk2.content;
    const mergedTopics = [...new Set([...chunk1.topics, ...chunk2.topics])];
    const mergedConcepts = [...new Set([...chunk1.keyConcepts, ...chunk2.keyConcepts])];
    
    return {
      ...chunk1,
      content: mergedContent,
      topics: mergedTopics,
      keyConcepts: mergedConcepts,
      wordCount: chunk1.wordCount + chunk2.wordCount,
      estimatedReadingTime: chunk1.estimatedReadingTime + chunk2.estimatedReadingTime,
      actualReadingTime: targetTime,
      title: chunk1.title.includes('Section') ? 
        chunk1.title : 
        `${chunk1.title} & ${chunk2.title}`,
      educationalValue: Math.max(chunk1.educationalValue, chunk2.educationalValue),
      learningObjectives: [...new Set([...chunk1.learningObjectives, ...chunk2.learningObjectives])],
      semanticBoundaries: {
        startsWithHeader: chunk1.semanticBoundaries.startsWithHeader,
        endsWithConclusion: chunk2.semanticBoundaries.endsWithConclusion,
        conceptualCompleteness: Math.max(
          chunk1.semanticBoundaries.conceptualCompleteness,
          chunk2.semanticBoundaries.conceptualCompleteness
        )
      }
    };
  }

  private isCommonWord(word: string): boolean {
    const commonWords = new Set([
      'The', 'This', 'That', 'These', 'Those', 'With', 'From', 'They', 'Were', 
      'Been', 'Have', 'Will', 'Would', 'Could', 'Should', 'When', 'Where'
    ]);
    return commonWords.has(word);
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
      'this', 'that', 'these', 'those', 'some', 'any', 'all', 'each', 'every',
      'when', 'where', 'why', 'how', 'what', 'which', 'who'
    ]);
    return stopWords.has(word.toLowerCase());
  }

  private titleCase(str: string): string {
    return str.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  }
}

export const timeBasedContentChunker = new TimeBasedContentChunker();