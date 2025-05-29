// utils/smart-content-chunker.ts - Complete implementation
import { analyzeContentForLearning } from './content-analysis';

export interface SemanticChunk {
  content: string;
  topics: string[];
  index: number;
  title: string;
  keyConcepts: string[];
  learningObjectives: string[];
  educationalValue: number;
  difficultyLevel: 'basic' | 'intermediate' | 'advanced';
  wordCount: number;
  readingTime: number;
  semanticBoundaries: {
    startsWithHeader: boolean;
    endsWithConclusion: boolean;
    conceptualCompleteness: number;
  };
}

export class SmartContentChunker {
  private minChunkSize = 150; // words
  private maxChunkSize = 500; // words
  private targetChunkSize = 300; // words

  public divideIntoSemanticChunks(content: string): SemanticChunk[] {
    console.log('🧠 Starting semantic content analysis...');
    
    if (!content || content.trim().length < 100) {
      throw new Error('Content too short for semantic chunking (minimum 100 characters)');
    }

    try {
      // Step 1: Clean and normalize content
      const cleanedContent = this.preprocessContent(content);
      
      // Step 2: Analyze document structure
      const documentStructure = this.analyzeDocumentStructure(cleanedContent);
      console.log('📊 Document structure analysis:', {
        headers: documentStructure.headers.length,
        paragraphs: documentStructure.paragraphs.length,
        hasMarkdown: documentStructure.hasMarkdownHeaders,
        hasNumbered: documentStructure.hasNumberedSections
      });
      
      // Step 3: Create initial sections based on structure
      const sections = this.extractStructuralSections(cleanedContent, documentStructure);
      console.log(`📑 Extracted ${sections.length} structural sections`);
      
      // Step 4: Apply semantic chunking within sections
      const semanticChunks = this.applySemanticeChunking(sections);
      console.log(`🔗 Created ${semanticChunks.length} semantic chunks`);
      
      // Step 5: Validate and refine chunks
      const refinedChunks = this.validateAndRefineChunks(semanticChunks);
      console.log(`✅ Refined to ${refinedChunks.length} final chunks`);
      
      return refinedChunks;
      
    } catch (error) {
      console.error('❌ Semantic chunking failed:', error);
      throw new Error(`Semantic chunking failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private preprocessContent(content: string): string {
    return content
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      // Normalize quotes
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      // Remove excessive line breaks but preserve paragraph structure
      .replace(/\n\s*\n\s*\n+/g, '\n\n')
      // Clean up common formatting artifacts
      .replace(/\u00A0/g, ' ') // Non-breaking spaces
      .replace(/\u2013|\u2014/g, '-') // En/em dashes
      .trim();
  }

  private analyzeDocumentStructure(content: string) {
    const lines = content.split('\n');
    const structure = {
      headers: [] as { text: string; level: number; lineIndex: number }[],
      paragraphs: [] as { text: string; lineIndex: number; isDefinition: boolean }[],
      lists: [] as { items: string[]; lineIndex: number }[],
      hasNumberedSections: false,
      hasMarkdownHeaders: false,
      definitionPatterns: 0,
      conceptDensity: 0
    };

    let definitionCount = 0;
    let conceptTermCount = 0;

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.length < 3) return;
      
      // Detect markdown headers (# ## ### etc.)
      const headerMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (headerMatch) {
        structure.headers.push({
          text: headerMatch[2],
          level: headerMatch[1].length,
          lineIndex: index
        });
        structure.hasMarkdownHeaders = true;
        return;
      }

      // Detect numbered sections (1. 2. 3. etc.)
      const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
      if (numberedMatch) {
        structure.headers.push({
          text: numberedMatch[2],
          level: 1,
          lineIndex: index
        });
        structure.hasNumberedSections = true;
        return;
      }

      // Detect ALL CAPS headers (but not random caps)
      if (trimmed.length > 5 && trimmed.length < 80 && 
          trimmed === trimmed.toUpperCase() && 
          /^[A-Z\s\-&()]+$/.test(trimmed) &&
          !trimmed.includes('.')) {
        structure.headers.push({
          text: trimmed,
          level: 1,
          lineIndex: index
        });
        return;
      }

      // Detect emphasized headers (Title Case at start of line)
      const titleCaseMatch = trimmed.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,5})(?:\s*:?\s*)?$/);
      if (titleCaseMatch && trimmed.length < 60) {
        structure.headers.push({
          text: titleCaseMatch[1],
          level: 2,
          lineIndex: index
        });
        return;
      }

      // Detect definition patterns
      const isDefinition = /(:|\bis\b|\bare\b|\bmeans\b|\brefers to\b|\bdefined as\b)/.test(trimmed);
      if (isDefinition) definitionCount++;

      // Count concept terms (capitalized terms)
      const conceptTerms = trimmed.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
      conceptTermCount += conceptTerms.length;

      // Detect substantial paragraphs
      if (trimmed.length > 30) {
        structure.paragraphs.push({
          text: trimmed,
          lineIndex: index,
          isDefinition
        });
      }

      // Detect bullet points and lists
      const listMatch = trimmed.match(/^[\-\*\+•]\s+(.+)$/);
      if (listMatch) {
        const lastList = structure.lists[structure.lists.length - 1];
        if (lastList && index - lastList.lineIndex < 5) {
          lastList.items.push(listMatch[1]);
        } else {
          structure.lists.push({
            items: [listMatch[1]],
            lineIndex: index
          });
        }
      }
    });

    structure.definitionPatterns = definitionCount;
    structure.conceptDensity = structure.paragraphs.length > 0 ? 
      conceptTermCount / structure.paragraphs.length : 0;

    return structure;
  }

  private extractStructuralSections(content: string, structure: any) {
    const sections = [];
    
    if (structure.headers.length >= 2) {
      console.log('📋 Using header-based sectioning');
      // Use headers to define sections
      for (let i = 0; i < structure.headers.length; i++) {
        const currentHeader = structure.headers[i];
        const nextHeader = structure.headers[i + 1];
        
        const startIndex = this.findLineStartIndex(content, currentHeader.lineIndex);
        const endIndex = nextHeader 
          ? this.findLineStartIndex(content, nextHeader.lineIndex)
          : content.length;
        
        const sectionContent = content.substring(startIndex, endIndex).trim();
        
        if (this.countWords(sectionContent) >= this.minChunkSize) {
          sections.push({
            content: sectionContent,
            title: this.cleanHeaderText(currentHeader.text),
            headerLevel: currentHeader.level,
            hasStructuralBoundary: true,
            sourceType: 'header'
          });
        }
      }
    } else {
      console.log('📝 Using semantic paragraph-based sectioning');
      // Fallback to semantic paragraph grouping
      sections.push(...this.createSemanticParagraphSections(content, structure));
    }

    return sections.filter(section => 
      this.countWords(section.content) >= this.minChunkSize
    );
  }

  private createSemanticParagraphSections(content: string, structure: any) {
    const paragraphs = content.split(/\n\s*\n+/).filter(p => p.trim().length > 50);
    const sections = [];
    
    let currentSection = '';
    let currentWordCount = 0;
    let currentTopics = new Set<string>();
    let sectionIndex = 0;
    
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i].trim();
      const paragraphWordCount = this.countWords(paragraph);
      const paragraphTopics = this.extractParagraphTopics(paragraph);
      
      // Calculate topic similarity with current section
      const topicSimilarity = this.calculateTopicSimilarity(currentTopics, paragraphTopics);
      
      // Decision logic for section breaks
      const shouldBreakSection = this.shouldBreakSection(
        currentWordCount,
        paragraphWordCount,
        topicSimilarity,
        paragraph,
        paragraphs[i + 1],
        structure
      );
      
      if (shouldBreakSection && currentSection.trim()) {
        // Save current section
        sections.push({
          content: currentSection.trim(),
          title: this.generateSectionTitle(currentSection, Array.from(currentTopics)),
          hasStructuralBoundary: false,
          sourceType: 'semantic',
          topicSimilarity: Array.from(currentTopics).length > 0 ? 1.0 : 0.0
        });
        
        // Start new section
        currentSection = paragraph + '\n\n';
        currentWordCount = paragraphWordCount;
        currentTopics = new Set(paragraphTopics);
        sectionIndex++;
      } else {
        // Add to current section
        currentSection += paragraph + '\n\n';
        currentWordCount += paragraphWordCount;
        paragraphTopics.forEach(topic => currentTopics.add(topic));
      }
    }
    
    // Add final section
    if (currentSection.trim() && currentWordCount >= this.minChunkSize) {
      sections.push({
        content: currentSection.trim(),
        title: this.generateSectionTitle(currentSection, Array.from(currentTopics)),
        hasStructuralBoundary: false,
        sourceType: 'semantic',
        topicSimilarity: Array.from(currentTopics).length > 0 ? 1.0 : 0.0
      });
    }
    
    return sections;
  }

  private shouldBreakSection(
    currentWordCount: number,
    paragraphWordCount: number,
    topicSimilarity: number,
    currentParagraph: string,
    nextParagraph?: string,
    structure?: any
  ): boolean {
    // Force break if section is getting too long
    if (currentWordCount + paragraphWordCount > this.maxChunkSize) {
      return true;
    }
    
    // Don't break if section is still too small
    if (currentWordCount < this.minChunkSize) {
      return false;
    }
    
    // Break on significant topic shift
    if (topicSimilarity < 0.2 && currentWordCount >= this.targetChunkSize * 0.7) {
      return true;
    }
    
    // Break on transition indicators
    const transitionIndicators = [
      /^(However|Therefore|In conclusion|Furthermore|Moreover|Additionally)/i,
      /^(On the other hand|In contrast|For example|In summary)/i,
      /^(To illustrate|Consequently|As a result|Nevertheless)/i,
      /^(Meanwhile|Subsequently|Finally|Lastly)/i
    ];
    
    const hasTransition = transitionIndicators.some(pattern => 
      pattern.test(currentParagraph.trim())
    );
    
    if (hasTransition && currentWordCount >= this.targetChunkSize * 0.8) {
      return true;
    }
    
    // Break on definition-heavy sections
    const hasDefinitions = /(:|\bis\b|\bare\b|\bmeans\b|\brefers to\b)/.test(currentParagraph);
    const nextHasDefinitions = nextParagraph ? 
      /(:|\bis\b|\bare\b|\bmeans\b|\brefers to\b)/.test(nextParagraph) : false;
    
    if (hasDefinitions && !nextHasDefinitions && currentWordCount >= this.targetChunkSize) {
      return true;
    }
    
    return false;
  }

  private extractParagraphTopics(paragraph: string): Set<string> {
    const topics = new Set<string>();
    
    // Extract capitalized terms (potential concepts)
    const capitalizedTerms = paragraph.match(/\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,}){0,2}\b/g) || [];
    capitalizedTerms.forEach(term => {
      if (term.length > 3 && term.length < 30) {
        topics.add(term.toLowerCase());
      }
    });
    
    // Extract technical terms with common suffixes
    const technicalSuffixes = /\b\w+(?:tion|sion|ment|ness|ity|ism|ology|graphy|ics)\b/gi;
    const technicalTerms = paragraph.match(technicalSuffixes) || [];
    technicalTerms.forEach(term => {
      if (term.length > 4) {
        topics.add(term.toLowerCase());
      }
    });
    
    // Extract quoted terms
    const quotedTerms = paragraph.match(/"([^"]+)"/g) || [];
    quotedTerms.forEach(quoted => {
      const term = quoted.replace(/"/g, '');
      if (term.length > 2 && term.length < 30) {
        topics.add(term.toLowerCase());
      }
    });
    
    return topics;
  }

  private calculateTopicSimilarity(topics1: Set<string>, topics2: Set<string>): number {
    if (topics1.size === 0 && topics2.size === 0) return 1.0;
    if (topics1.size === 0 || topics2.size === 0) return 0.0;
    
    const intersection = new Set([...topics1].filter(x => topics2.has(x)));
    const union = new Set([...topics1, ...topics2]);
    
    return intersection.size / union.size;
  }

  private findLineStartIndex(content: string, lineIndex: number): number {
    const lines = content.split('\n');
    let index = 0;
    for (let i = 0; i < lineIndex && i < lines.length; i++) {
      index += lines[i].length + 1; // +1 for newline
    }
    return Math.min(index, content.length);
  }

  private cleanHeaderText(text: string): string {
    return text
      .replace(/^#+\s*/, '') // Remove markdown #
      .replace(/^\d+\.\s*/, '') // Remove numbering
      .replace(/[:\-_]+$/, '') // Remove trailing punctuation
      .trim();
  }

  private generateSectionTitle(content: string, topics: string[]): string {
    // Try to use the first meaningful topic
    if (topics.length > 0) {
      const mainTopic = topics.find(topic => topic.length > 3) || topics[0];
      return this.titleCase(mainTopic);
    }
    
    // Fallback: extract from first sentence
    const firstSentence = content.split(/[.!?]/)[0];
    const titleMatch = firstSentence.match(/\b([A-Z][a-zA-Z\s]{3,40})\b/);
    if (titleMatch) {
      return titleMatch[1].trim();
    }
    
    // Last resort: generic title
    return 'Content Section';
  }

  private titleCase(str: string): string {
    return str.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  }

  private applySemanticeChunking(sections: any[]): SemanticChunk[] {
    const chunks: SemanticChunk[] = [];
    
    sections.forEach((section, sectionIndex) => {
      const wordCount = this.countWords(section.content);
      
      if (wordCount <= this.maxChunkSize) {
        // Section fits in one chunk
        chunks.push(this.createSemanticChunk(section, sectionIndex));
      } else {
        // Split large section intelligently
        const subChunks = this.splitLargeSection(section, sectionIndex);
        chunks.push(...subChunks);
      }
    });
    
    return chunks;
  }

  private splitLargeSection(section: any, sectionIndex: number): SemanticChunk[] {
    const sentences = this.extractSentences(section.content);
    const subChunks = [];
    
    let currentChunk = '';
    let currentWordCount = 0;
    let sentenceIndex = 0;
    let partIndex = 0;
    
    while (sentenceIndex < sentences.length) {
      const sentence = sentences[sentenceIndex];
      const sentenceWordCount = this.countWords(sentence);
      
      // Check if we should start a new chunk
      if (currentWordCount > 0 && 
          currentWordCount + sentenceWordCount > this.targetChunkSize) {
        
        // Look for a good breaking point
        const breakPoint = this.findSemanticBreakPoint(
          sentences, 
          Math.max(0, sentenceIndex - 2), 
          Math.min(sentences.length, sentenceIndex + 2)
        );
        
        // Create chunk up to break point
        if (currentChunk.trim()) {
          subChunks.push(this.createSemanticChunk({
            content: currentChunk.trim(),
            title: `${section.title} (Part ${partIndex + 1})`,
            hasStructuralBoundary: partIndex === 0 ? section.hasStructuralBoundary : false,
            sourceType: section.sourceType
          }, sectionIndex, partIndex));
          partIndex++;
        }
        
        // Start new chunk
        currentChunk = sentence + ' ';
        currentWordCount = sentenceWordCount;
      } else {
        currentChunk += sentence + ' ';
        currentWordCount += sentenceWordCount;
      }
      
      sentenceIndex++;
    }
    
    // Add remaining content
    if (currentChunk.trim()) {
      subChunks.push(this.createSemanticChunk({
        content: currentChunk.trim(),
        title: subChunks.length > 0 ? `${section.title} (Part ${partIndex + 1})` : section.title,
        hasStructuralBoundary: false,
        sourceType: section.sourceType
      }, sectionIndex, partIndex));
    }
    
    return subChunks;
  }

  private findSemanticBreakPoint(sentences: string[], start: number, end: number): number {
    const breakIndicators = [
      'However', 'Therefore', 'In conclusion', 'Furthermore', 'Moreover',
      'Additionally', 'On the other hand', 'In contrast', 'For example',
      'In summary', 'To illustrate', 'Consequently', 'As a result',
      'Nevertheless', 'Meanwhile', 'Subsequently', 'Finally'
    ];
    
    for (let i = start; i < end; i++) {
      if (i < 0 || i >= sentences.length) continue;
      
      const sentence = sentences[i].trim();
      
      // Check for transition words at sentence start
      for (const indicator of breakIndicators) {
        if (sentence.startsWith(indicator)) {
          return i;
        }
      }
      
      // Check for new topic indicators
      if (sentence.match(/^[A-Z][a-z]+\s+(is|are|was|were|can|will|should|must)/)) {
        return i;
      }
    }
    
    return end;
  }

  private createSemanticChunk(section: any, sectionIndex: number, subIndex = 0): SemanticChunk {
    const content = section.content;
    const wordCount = this.countWords(content);
    const topics = this.extractTopics(content);
    const keyConcepts = this.extractKeyConcepts(content);
    const learningObjectives = this.generateLearningObjectives(content, keyConcepts, topics);
    
    return {
      content,
      topics: Array.from(new Set(topics)),
      index: sectionIndex,
      title: section.title || this.generateSectionTitle(content, topics),
      keyConcepts,
      learningObjectives,
      educationalValue: this.assessEducationalValue(content, keyConcepts, topics),
      difficultyLevel: this.assessDifficultyLevel(content, keyConcepts),
      wordCount,
      readingTime: Math.ceil(wordCount / 200), // 200 words per minute
      semanticBoundaries: {
        startsWithHeader: this.startsWithHeader(content),
        endsWithConclusion: this.endsWithConclusion(content),
        conceptualCompleteness: this.assessConceptualCompleteness(content, keyConcepts, topics)
      }
    };
  }

  private extractSentences(text: string): string[] {
    // Enhanced sentence splitting that preserves abbreviations and handles edge cases
    const sentences = text
      // Handle common abbreviations
      .replace(/\b(Dr|Mr|Mrs|Ms|Prof|etc|vs|Inc|Ltd|Corp)\./g, '$1<!DOT!>')
      // Handle decimal numbers
      .replace(/\b\d+\.\d+\b/g, (match) => match.replace('.', '<!DOT!>'))
      // Split on sentence boundaries
      .split(/(?<=[.!?])\s+(?=[A-Z])/)
      .map(s => s.replace(/<!DOT!>/g, '.').trim())
      .filter(s => s.length > 10);
    
    return sentences;
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  private extractTopics(content: string): string[] {
    const topics = new Set<string>();
    
    // Extract capitalized terms (proper nouns, concepts)
    const capitalizedTerms = content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\b/g) || [];
    capitalizedTerms.forEach(term => {
      if (term.length > 3 && term.length < 40 && !this.isCommonWord(term)) {
        topics.add(term);
      }
    });
    
    // Extract quoted terms
    const quotedTerms = content.match(/"([^"]{3,30})"/g)?.map(q => q.replace(/"/g, '')) || [];
    quotedTerms.forEach(term => topics.add(term));
    
    // Extract technical terms with specific patterns
    const technicalPatterns = [
      /\b[a-z]+(?:-[a-z]+)+\b/g, // Hyphenated terms
      /\b\w+(?:tion|sion|ment|ness|ity|ism|ology|graphy|ics)\b/g // Technical suffixes
    ];
    
    technicalPatterns.forEach(pattern => {
      const matches = content.match(pattern) || [];
      matches.forEach(match => {
        if (match.length > 4 && match.length < 30) {
          topics.add(match);
        }
      });
    });
    
    return Array.from(topics).slice(0, 8);
  }

  private isCommonWord(word: string): boolean {
    const commonWords = new Set([
      'The', 'This', 'That', 'These', 'Those', 'With', 'From', 'They', 'Were', 
      'Been', 'Have', 'Will', 'Would', 'Could', 'Should', 'When', 'Where', 
      'What', 'Which', 'Some', 'Many', 'Most', 'Other', 'Each', 'Such'
    ]);
    return commonWords.has(word);
  }

  private extractKeyConcepts(content: string): string[] {
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
        if (concept.length > 2 && concept.length < 40) {
          concepts.add(concept);
        }
      }
    });
    
    // Pattern 2: Emphasized terms
    const emphasizedPatterns = [
      /\*\*([^*]{3,30})\*\*/g, // Bold markdown
      /\*([^*]{3,30})\*/g, // Italic markdown
      /`([^`]{3,30})`/g, // Code formatting
    ];
    
    emphasizedPatterns.forEach(pattern => {
      const matches = Array.from(content.matchAll(pattern));
      matches.forEach(match => {
        const concept = match[1].trim();
        if (concept.length > 2 && concept.length < 40) {
          concepts.add(concept);
        }
      });
    });
    
    // Pattern 3: Frequently mentioned significant terms
    const words = content.toLowerCase().match(/\b[a-z]{4,20}\b/g) || [];
    const frequency = new Map<string, number>();
    
    words.forEach(word => {
      if (!this.isStopWord(word)) {
        frequency.set(word, (frequency.get(word) || 0) + 1);
      }
    });
    
    // Add frequently mentioned terms
    frequency.forEach((count, word) => {
      if (count >= 3 && word.length > 4) {
        concepts.add(this.titleCase(word));
      }
    });
    
    return Array.from(concepts).slice(0, 10);
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'an', 'a', 'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were',
      'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
      'would', 'could', 'should', 'may', 'might', 'can', 'must', 'then', 'than',
      'when', 'where', 'why', 'how', 'what', 'which', 'who', 'whom', 'whose',
      'some', 'any', 'each', 'every', 'all', 'both', 'either', 'neither',
      'more', 'most', 'less', 'least', 'much', 'many', 'few', 'several',
      'other', 'another', 'same', 'different', 'such', 'very', 'really',
      'just', 'only', 'also', 'even', 'still', 'already', 'yet', 'again',
      'into', 'onto', 'from', 'through', 'during', 'before', 'after', 'above',
      'below', 'between', 'among', 'under', 'over', 'about', 'against', 'within'
    ]);
    return stopWords.has(word.toLowerCase());
  }

  private generateLearningObjectives(content: string, concepts: string[], topics: string[]): string[] {
    const objectives = [];
    const actionVerbs = {
      basic: ['Identify', 'Define', 'List', 'Describe', 'Recognize'],
      intermediate: ['Explain', 'Compare', 'Analyze', 'Classify', 'Summarize'],
      advanced: ['Evaluate', 'Create', 'Synthesize', 'Critique', 'Design']
    };
    
    // Generate objectives for main concepts
    concepts.slice(0, 3).forEach((concept, index) => {
      const verbCategory = this.assessConceptComplexity(concept, content);
      const verbs = actionVerbs[verbCategory];
      const verb = verbs[index % verbs.length];
      
      objectives.push(`${verb} the concept of ${concept} and its significance`);
    });
    
    // Generate topic-based objectives
    if (topics.length > 1) {
      objectives.push(`Analyze the relationships between ${topics.slice(0, 2).join(' and ')}`);
    }
    
    // Add synthesis objective if multiple concepts exist
    if (concepts.length > 2) {
      objectives.push(`Evaluate how ${concepts[0]} relates to the broader context`);
    }
    
    return objectives.slice(0, 4);
  }

  private assessConceptComplexity(concept: string, content: string): 'basic' | 'intermediate' | 'advanced' {
    const conceptMentions = (content.toLowerCase().match(new RegExp(concept.toLowerCase(), 'g')) || []).length;
    const hasDefinition = new RegExp(`${concept}\\s+(?:is|are|means|refers to)`).test(content);
    const hasExamples = /example|such as|for instance|including/.test(content);
    
    if (conceptMentions >= 3 && hasDefinition && hasExamples) return 'advanced';
    if (conceptMentions >= 2 && (hasDefinition || hasExamples)) return 'intermediate';
    return 'basic';
  }

  private assessEducationalValue(content: string, concepts: string[], topics: string[]): number {
    let score = 5; // Base score
    
    // Content length factor
    const wordCount = this.countWords(content);
    if (wordCount >= 200) score += 1;
    if (wordCount >= 400) score += 1;
    
    // Concept richness
    if (concepts.length >= 3) score += 1;
    if (concepts.length >= 6) score += 1;
    
    // Topic coherence
    if (topics.length >= 2) score += 1;
    
    // Educational indicators
    const indicators = [
      /\b(define|definition|explain|concept|principle|theory|method|process)\b/i,
      /\b(important|significant|key|main|primary|essential|fundamental)\b/i,
      /\b(because|therefore|thus|however|moreover|furthermore)\b/i,
      /\b(example|such as|for instance|including)\b/i,
      /\b(compare|contrast|similar|different|relationship)\b/i
    ];
    
    indicators.forEach(pattern => {
      if (pattern.test(content)) score += 0.5;
    });
    
    // Definition presence bonus
    const definitionCount = (content.match(/:\s|is\s|are\s|means\s|refers to\s/gi) || []).length;
    if (definitionCount >= 2) score += 1;
    
    return Math.min(10, Math.max(1, Math.round(score)));
  }

  private assessDifficultyLevel(content: string, concepts: string[]): 'basic' | 'intermediate' | 'advanced' {
    let difficultyScore = 0;
    
    // Word complexity
    const words = content.split(/\s+/);
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    if (avgWordLength > 6) difficultyScore += 1;
    if (avgWordLength > 7) difficultyScore += 1;
    
    // Technical term density
    const technicalTerms = concepts.length;
    if (technicalTerms > 5) difficultyScore += 1;
    if (technicalTerms > 8) difficultyScore += 1;
    
    // Sentence complexity
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = words.length / sentences.length;
    if (avgSentenceLength > 20) difficultyScore += 1;
    if (avgSentenceLength > 30) difficultyScore += 1;
    
    // Abstract concept indicators
    const abstractTerms = ['theory', 'concept', 'framework', 'principle', 'methodology', 'paradigm', 'hypothesis', 'analysis', 'synthesis'];
    const hasAbstractTerms = abstractTerms.some(term => content.toLowerCase().includes(term));
    if (hasAbstractTerms) difficultyScore += 1;
    
    // Complex relationship indicators
    const relationshipWords = ['relationship', 'correlation', 'causation', 'implication', 'consequence'];
    const hasRelationships = relationshipWords.some(word => content.toLowerCase().includes(word));
    if (hasRelationships) difficultyScore += 1;
    
    if (difficultyScore <= 2) return 'basic';
    if (difficultyScore <= 5) return 'intermediate';
    return 'advanced';
  }

  private startsWithHeader(content: string): boolean {
    const firstLine = content.split('\n')[0].trim();
    return /^(#{1,6}\s+|[A-Z][A-Z\s]+$|\d+\.\s+|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*:?)/.test(firstLine);
  }

  private endsWithConclusion(content: string): boolean {
    const lastSentences = content.split(/[.!?]/).slice(-2).join(' ').toLowerCase();
    const conclusionWords = ['conclusion', 'summary', 'therefore', 'thus', 'in summary', 'finally', 'lastly', 'to conclude'];
    return conclusionWords.some(word => lastSentences.includes(word));
  }

  private assessConceptualCompleteness(content: string, concepts: string[], topics: string[]): number {
    let completeness = 0;
    const maxCompleteness = 10;
    
    // Check if concepts are properly explained
    concepts.forEach(concept => {
      const conceptMentions = (content.toLowerCase().match(new RegExp(concept.toLowerCase(), 'g')) || []).length;
      const hasDefinition = new RegExp(`${concept}\\s+(?:is|are|means|refers to|defined as)`, 'i').test(content);
      const hasExample = /example|such as|for instance|including/.test(content);
      
      if (conceptMentions > 1) completeness += 1; // Multiple mentions
      if (hasDefinition) completeness += 2; // Has definition
      if (hasExample) completeness += 1; // Has examples
    });
    
    // Check topic coherence
    const topicCoherence = topics.length > 0 ? 
      topics.filter(topic => content.toLowerCase().includes(topic.toLowerCase())).length / topics.length : 0;
    completeness += topicCoherence * 2;
    
    // Check for explanatory structure
    const explanatoryPatterns = [
      /because|since|due to|as a result|therefore|thus|consequently/i,
      /however|although|despite|nevertheless|on the other hand/i,
      /for example|such as|including|specifically|namely/i
    ];
    
    explanatoryPatterns.forEach(pattern => {
      if (pattern.test(content)) completeness += 0.5;
    });
    
    return Math.min(maxCompleteness, Math.max(0, Math.round(completeness)));
  }

  private validateAndRefineChunks(chunks: SemanticChunk[]): SemanticChunk[] {
    const validatedChunks = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Check if chunk meets minimum quality standards
      if (chunk.wordCount < this.minChunkSize && i < chunks.length - 1) {
        const nextChunk = chunks[i + 1];
        if (nextChunk.wordCount + chunk.wordCount <= this.maxChunkSize) {
          // Merge with next chunk
          const mergedChunk = this.mergeChunks(chunk, nextChunk);
          validatedChunks.push(mergedChunk);
          i++; // Skip next chunk as it's been merged
          continue;
        }
      }
      
      // Check educational value threshold
      if (chunk.educationalValue < 4) {
        console.warn(`⚠️ Low educational value chunk: "${chunk.title}" (${chunk.educationalValue}/10)`);
        // Try to enhance or skip very low value chunks
        if (chunk.educationalValue < 3) {
          console.log(`🗑️ Skipping very low value chunk: "${chunk.title}"`);
          continue;
        }
      }
      
      validatedChunks.push(chunk);
    }
    
    // Re-index chunks
    return validatedChunks.map((chunk, index) => ({
      ...chunk,
      index
    }));
  }

  private mergeChunks(chunk1: SemanticChunk, chunk2: SemanticChunk): SemanticChunk {
    const mergedContent = chunk1.content + '\n\n' + chunk2.content;
    const mergedTopics = [...new Set([...chunk1.topics, ...chunk2.topics])];
    const mergedConcepts = [...new Set([...chunk1.keyConcepts, ...chunk2.keyConcepts])];
    const mergedObjectives = [...new Set([...chunk1.learningObjectives, ...chunk2.learningObjectives])];
    
    return {
      ...chunk1,
      content: mergedContent,
      topics: mergedTopics,
      keyConcepts: mergedConcepts,
      learningObjectives: mergedObjectives,
      wordCount: chunk1.wordCount + chunk2.wordCount,
      readingTime: chunk1.readingTime + chunk2.readingTime,
      educationalValue: Math.max(chunk1.educationalValue, chunk2.educationalValue),
      title: chunk1.title.includes('Part') ? 
        chunk1.title.replace(/ \(Part \d+\)/, '') : 
        `${chunk1.title} & ${chunk2.title}`,
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
}