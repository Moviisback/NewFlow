// Enhanced content analysis with proper NLP techniques
export interface ContentAnalysis {
  keyConcepts: ConceptInfo[];
  mainTopics: TopicInfo[];
  learningObjectives: string[];
  importantTerms: TermInfo[];
  conceptualRelationships: ConceptRelationship[];
  difficultyLevel: 'basic' | 'intermediate' | 'advanced';
  contentQuality: number; // 1-10 scale
  educationalValue: number; // 1-10 scale
  readabilityScore: number;
  topicCoherence: number;
}

interface ConceptInfo {
  term: string;
  frequency: number;
  importance: number; // 1-10 scale
  context: string[];
  definitions: string[];
  isMainConcept: boolean;
}

interface TopicInfo {
  topic: string;
  relevance: number;
  keywords: string[];
  coherenceScore: number;
}

interface TermInfo {
  term: string;
  type: 'technical' | 'concept' | 'definition' | 'example';
  importance: number;
  context: string;
}

interface ConceptRelationship {
  concept1: string;
  concept2: string;
  relationship: 'defines' | 'explains' | 'contrasts' | 'exemplifies' | 'causes' | 'relates_to';
  strength: number; // 0-1
  evidence: string[];
}

export function analyzeContentForLearning(content: string): ContentAnalysis {
  console.log('🔍 Starting enhanced content analysis...');
  
  // Clean and prepare content
  const cleanContent = preprocessContent(content);
  const sentences = segmentIntoSentences(cleanContent);
  const paragraphs = segmentIntoParagraphs(content);
  
  // Extract concepts with advanced techniques
  const concepts = extractAdvancedConcepts(cleanContent, sentences);
  console.log(`📝 Extracted ${concepts.length} concepts`);
  
  // Identify main topics using clustering
  const topics = identifyTopicsWithClustering(paragraphs, concepts);
  console.log(`📊 Identified ${topics.length} main topics`);
  
  // Extract important terms with context
  const terms = extractTermsWithContext(cleanContent, concepts);
  
  // Generate evidence-based learning objectives
  const objectives = generateEvidenceBasedObjectives(concepts, topics, sentences);
  
  // Map concept relationships
  const relationships = mapConceptRelationships(concepts, sentences);
  
  // Assess multiple quality metrics
  const contentQuality = assessContentQuality(cleanContent, concepts, topics);
  const educationalValue = assessEducationalValue(concepts, objectives, relationships);
  const readabilityScore = calculateReadabilityScore(cleanContent);
  const topicCoherence = assessTopicCoherence(topics, paragraphs);
  const difficultyLevel = assessContentDifficulty(cleanContent, concepts, readabilityScore);
  
  console.log('📈 Analysis complete:', {
    concepts: concepts.length,
    mainConcepts: concepts.filter(c => c.isMainConcept).length,
    topics: topics.length,
    quality: contentQuality,
    educationalValue,
    difficulty: difficultyLevel
  });
  
  return {
    keyConcepts: concepts,
    mainTopics: topics,
    learningObjectives: objectives,
    importantTerms: terms,
    conceptualRelationships: relationships,
    difficultyLevel,
    contentQuality,
    educationalValue,
    readabilityScore,
    topicCoherence
  };
}

function preprocessContent(content: string): string {
  return content
    .replace(/\s+/g, ' ')
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .trim();
}

function segmentIntoSentences(content: string): string[] {
  // Enhanced sentence segmentation
  return content
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .filter(s => s.trim().length > 10)
    .map(s => s.trim());
}

function segmentIntoParagraphs(content: string): string[] {
  return content
    .split(/\n\s*\n+/)
    .filter(p => p.trim().length > 50)
    .map(p => p.trim());
}

function extractAdvancedConcepts(content: string, sentences: string[]): ConceptInfo[] {
  const concepts: Map<string, ConceptInfo> = new Map();
  
  // 1. Extract multi-word technical terms and proper nouns
  const technicalTerms = extractTechnicalTerms(content);
  technicalTerms.forEach(term => addOrUpdateConcept(concepts, term, 'technical', content));
  
  // 2. Extract terms with definitions
  const definedTerms = extractDefinedTerms(content);
  definedTerms.forEach(term => addOrUpdateConcept(concepts, term.term, 'definition', content, term.definition));
  
  // 3. Extract emphasized terms (quotes, bold, etc.)
  const emphasizedTerms = extractEmphasizedTerms(content);
  emphasizedTerms.forEach(term => addOrUpdateConcept(concepts, term, 'emphasized', content));
  
  // 4. Extract frequently mentioned significant terms
  const frequentTerms = extractFrequentSignificantTerms(content);
  frequentTerms.forEach(term => addOrUpdateConcept(concepts, term.term, 'frequent', content));
  
  // 5. Score and rank concepts
  const rankedConcepts = Array.from(concepts.values())
    .map(concept => ({
      ...concept,
      importance: calculateConceptImportance(concept, content, sentences)
    }))
    .sort((a, b) => b.importance - a.importance);
  
  // 6. Mark main concepts (top 30% or importance > 7)
  const threshold = Math.max(3, Math.ceil(rankedConcepts.length * 0.3));
  rankedConcepts.forEach((concept, index) => {
    concept.isMainConcept = index < threshold || concept.importance > 7;
  });
  
  return rankedConcepts.slice(0, 20); // Limit to top 20 concepts
}

function extractTechnicalTerms(content: string): string[] {
  const patterns = [
    /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\b/g, // Multi-word proper nouns
    /\b[A-Z]{2,}\b(?!\s*[.!?])/g, // Acronyms (not at sentence end)
    /\b[a-z]+(?:-[a-z]+)+\b/g, // Hyphenated terms
    /\b\w+(?:tion|sion|ment|ness|ity|ism|ology|graphy)\b/g // Technical suffixes
  ];
  
  const terms = new Set<string>();
  patterns.forEach(pattern => {
    const matches = content.match(pattern) || [];
    matches.forEach(match => {
      if (match.length > 3 && match.length < 50) {
        terms.add(match.trim());
      }
    });
  });
  
  return Array.from(terms);
}

function extractDefinedTerms(content: string): Array<{term: string, definition: string}> {
  const definitions: Array<{term: string, definition: string}> = [];
  
  // Pattern 1: "Term is/are/means/refers to [definition]"
  const pattern1 = /([A-Za-z][A-Za-z\s]{2,30})\s+(?:is|are|means|refers to|defined as)\s+([^.!?]{10,200})[.!?]/gi;
  let match;
  while ((match = pattern1.exec(content)) !== null) {
    definitions.push({
      term: match[1].trim(),
      definition: match[2].trim()
    });
  }
  
  // Pattern 2: "Term: [definition]" or "Term - [definition]"
  const pattern2 = /([A-Za-z][A-Za-z\s]{2,30}):\s*([^.\n]{10,200})[.\n]/gi;
  while ((match = pattern2.exec(content)) !== null) {
    definitions.push({
      term: match[1].trim(),
      definition: match[2].trim()
    });
  }
  
  return definitions;
}

function extractEmphasizedTerms(content: string): string[] {
  const patterns = [
    /"([^"]{3,50})"/g, // Quoted terms
    /\*\*([^*]{3,50})\*\*/g, // Bold markdown
    /\*([^*]{3,50})\*/g, // Italic markdown
    /\b([A-Z][A-Z\s]{3,30})\b/g, // ALL CAPS terms
  ];
  
  const terms = new Set<string>();
  patterns.forEach(pattern => {
    const matches = Array.from(content.matchAll(pattern));
    matches.forEach(match => {
      const term = match[1].trim();
      if (term.length > 2 && term.length < 50) {
        terms.add(term);
      }
    });
  });
  
  return Array.from(terms);
}

function extractFrequentSignificantTerms(content: string): Array<{term: string, frequency: number}> {
  // Common stop words to exclude
  const stopWords = new Set([
    'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'an', 'a', 'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were',
    'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'could', 'should', 'may', 'might', 'can', 'must', 'then', 'than',
    'when', 'where', 'why', 'how', 'what', 'which', 'who', 'whom', 'whose',
    'some', 'any', 'each', 'every', 'all', 'both', 'either', 'neither',
    'more', 'most', 'less', 'least', 'much', 'many', 'few', 'several',
    'other', 'another', 'same', 'different', 'such', 'very', 'really',
    'just', 'only', 'also', 'even', 'still', 'already', 'yet', 'again'
  ]);
  
  // Extract words and calculate frequency
  const words = content.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  const frequency: Map<string, number> = new Map();
  
  words.forEach(word => {
    if (!stopWords.has(word) && word.length > 3) {
      frequency.set(word, (frequency.get(word) || 0) + 1);
    }
  });
  
  // Filter for significant frequency (appears at least 3 times) and sort
  return Array.from(frequency.entries())
    .filter(([word, freq]) => freq >= 3)
    .map(([term, frequency]) => ({ term, frequency }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 15);
}

function addOrUpdateConcept(
  concepts: Map<string, ConceptInfo>,
  term: string,
  type: string,
  content: string,
  definition?: string
): void {
  const normalizedTerm = term.toLowerCase().trim();
  
  if (normalizedTerm.length < 2) return;
  
  const existing = concepts.get(normalizedTerm);
  if (existing) {
    existing.frequency += 1;
    if (definition && !existing.definitions.includes(definition)) {
      existing.definitions.push(definition);
    }
  } else {
    concepts.set(normalizedTerm, {
      term: term.trim(),
      frequency: 1,
      importance: 0, // Will be calculated later
      context: extractContexts(term, content),
      definitions: definition ? [definition] : [],
      isMainConcept: false
    });
  }
}

function extractContexts(term: string, content: string, maxContexts: number = 3): string[] {
  const contexts: string[] = [];
  const regex = new RegExp(`[^.!?]*\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b[^.!?]*[.!?]`, 'gi');
  const matches = content.match(regex) || [];
  
  return matches
    .slice(0, maxContexts)
    .map(match => match.trim().substring(0, 150) + (match.length > 150 ? '...' : ''));
}

function calculateConceptImportance(concept: ConceptInfo, content: string, sentences: string[]): number {
  let score = 0;
  
  // Base frequency score (0-3 points)
  score += Math.min(3, concept.frequency / 2);
  
  // Definition bonus (2 points if has definition)
  if (concept.definitions.length > 0) score += 2;
  
  // Length appropriateness (1 point for good length)
  if (concept.term.length >= 4 && concept.term.length <= 25) score += 1;
  
  // Position importance (2 points if appears in first 20% of content)
  const firstPartContent = content.substring(0, content.length * 0.2);
  if (firstPartContent.toLowerCase().includes(concept.term.toLowerCase())) {
    score += 2;
  }
  
  // Context diversity (1 point for appearing in multiple contexts)
  if (concept.context.length > 1) score += 1;
  
  // Technical term bonus (1 point)
  if (/^[A-Z]/.test(concept.term) || /[A-Z]{2,}/.test(concept.term)) {
    score += 1;
  }
  
  return Math.min(10, score);
}

function identifyTopicsWithClustering(paragraphs: string[], concepts: ConceptInfo[]): TopicInfo[] {
  const topics: TopicInfo[] = [];
  
  // Group paragraphs by conceptual similarity
  const paragraphTopics = paragraphs.map(paragraph => {
    const paragraphConcepts = concepts.filter(concept =>
      paragraph.toLowerCase().includes(concept.term.toLowerCase())
    );
    
    return {
      paragraph,
      concepts: paragraphConcepts,
      mainConcept: paragraphConcepts.sort((a, b) => b.importance - a.importance)[0]
    };
  });
  
  // Cluster similar paragraphs
  const topicClusters: Map<string, string[]> = new Map();
  
  paragraphTopics.forEach(({ paragraph, mainConcept }) => {
    if (mainConcept) {
      const topicKey = mainConcept.term;
      if (!topicClusters.has(topicKey)) {
        topicClusters.set(topicKey, []);
      }
      topicClusters.get(topicKey)!.push(paragraph);
    }
  });
  
  // Convert clusters to topics
  topicClusters.forEach((paragraphsInTopic, topicName) => {
    const relevantConcepts = concepts.filter(concept =>
      paragraphsInTopic.some(p => p.toLowerCase().includes(concept.term.toLowerCase()))
    );
    
    topics.push({
      topic: topicName,
      relevance: relevantConcepts.reduce((sum, c) => sum + c.importance, 0) / relevantConcepts.length,
      keywords: relevantConcepts.slice(0, 5).map(c => c.term),
      coherenceScore: calculateTopicCoherence(paragraphsInTopic, relevantConcepts)
    });
  });
  
  return topics
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 8);
}

function calculateTopicCoherence(paragraphs: string[], concepts: ConceptInfo[]): number {
  if (paragraphs.length === 0 || concepts.length === 0) return 0;
  
  // Calculate how consistently concepts appear across paragraphs
  let totalCoherence = 0;
  
  concepts.forEach(concept => {
    const appearanceCount = paragraphs.filter(p =>
      p.toLowerCase().includes(concept.term.toLowerCase())
    ).length;
    
    const consistencyScore = appearanceCount / paragraphs.length;
    totalCoherence += consistencyScore * concept.importance;
  });
  
  return Math.min(10, totalCoherence / concepts.length);
}

function extractTermsWithContext(content: string, concepts: ConceptInfo[]): TermInfo[] {
  const terms: TermInfo[] = [];
  
  // Convert main concepts to terms
  concepts.forEach(concept => {
    let type: 'technical' | 'concept' | 'definition' | 'example' = 'concept';
    
    if (concept.definitions.length > 0) type = 'definition';
    else if (/^[A-Z]/.test(concept.term) || /[A-Z]{2,}/.test(concept.term)) type = 'technical';
    
    terms.push({
      term: concept.term,
      type,
      importance: concept.importance,
      context: concept.context[0] || ''
    });
  });
  
  return terms.slice(0, 15);
}

function generateEvidenceBasedObjectives(
  concepts: ConceptInfo[],
  topics: TopicInfo[],
  sentences: string[]
): string[] {
  const objectives: string[] = [];
  const actionVerbs = {
    basic: ['Identify', 'Define', 'List', 'Describe'],
    intermediate: ['Explain', 'Compare', 'Analyze', 'Classify'],
    advanced: ['Evaluate', 'Create', 'Synthesize', 'Critique']
  };
  
  // Generate objectives for main concepts
  const mainConcepts = concepts.filter(c => c.isMainConcept).slice(0, 3);
  mainConcepts.forEach((concept, index) => {
    const verbSet = concept.importance > 8 ? actionVerbs.advanced :
                   concept.importance > 6 ? actionVerbs.intermediate : actionVerbs.basic;
    const verb = verbSet[index % verbSet.length];
    
    if (concept.definitions.length > 0) {
      objectives.push(`${verb} the concept of ${concept.term} and its significance`);
    } else {
      objectives.push(`${verb} how ${concept.term} relates to the main topic`);
    }
  });
  
  // Generate objectives for main topics
  topics.slice(0, 2).forEach(topic => {
    objectives.push(`Analyze the key principles and applications of ${topic.topic}`);
  });
  
  // Add synthesis objective if multiple concepts exist
  if (mainConcepts.length > 1) {
    objectives.push(`Evaluate the relationships between ${mainConcepts.slice(0, 2).map(c => c.term).join(' and ')}`);
  }
  
  return objectives.slice(0, 5);
}

function mapConceptRelationships(concepts: ConceptInfo[], sentences: string[]): ConceptRelationship[] {
  const relationships: ConceptRelationship[] = [];
  
  concepts.forEach(concept1 => {
    concepts.forEach(concept2 => {
      if (concept1.term === concept2.term) return;
      
      // Find sentences containing both concepts
      const sharedSentences = sentences.filter(sentence => {
        const lowerSentence = sentence.toLowerCase();
        return lowerSentence.includes(concept1.term.toLowerCase()) &&
               lowerSentence.includes(concept2.term.toLowerCase());
      });
      
      if (sharedSentences.length > 0) {
        const relationship = inferRelationshipType(concept1, concept2, sharedSentences);
        if (relationship) {
          relationships.push({
            concept1: concept1.term,
            concept2: concept2.term,
            relationship: relationship.type,
            strength: relationship.strength,
            evidence: sharedSentences.slice(0, 2)
          });
        }
      }
    });
  });
  
  return relationships
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 10);
}

function inferRelationshipType(
  concept1: ConceptInfo,
  concept2: ConceptInfo,
  sentences: string[]
): { type: ConceptRelationship['relationship'], strength: number } | null {
  const combinedText = sentences.join(' ').toLowerCase();
  
  // Definition relationship
  if (combinedText.includes('is a') || combinedText.includes('defined as')) {
    return { type: 'defines', strength: 0.9 };
  }
  
  // Causal relationship
  if (combinedText.includes('because') || combinedText.includes('causes') || combinedText.includes('results in')) {
    return { type: 'causes', strength: 0.8 };
  }
  
  // Contrast relationship
  if (combinedText.includes('however') || combinedText.includes('unlike') || combinedText.includes('different')) {
    return { type: 'contrasts', strength: 0.7 };
  }
  
  // Example relationship
  if (combinedText.includes('example') || combinedText.includes('such as') || combinedText.includes('for instance')) {
    return { type: 'exemplifies', strength: 0.6 };
  }
  
  // Explanation relationship
  if (combinedText.includes('explain') || combinedText.includes('because') || combinedText.includes('therefore')) {
    return { type: 'explains', strength: 0.7 };
  }
  
  // General relationship (co-occurrence)
  return { type: 'relates_to', strength: 0.5 };
}

function assessContentQuality(content: string, concepts: ConceptInfo[], topics: TopicInfo[]): number {
  let score = 0;
  
  // Content length appropriateness (0-2 points)
  const wordCount = content.split(/\s+/).length;
  if (wordCount > 100 && wordCount < 5000) score += 2;
  else if (wordCount > 50) score += 1;
  
  // Concept richness (0-3 points)
  const mainConcepts = concepts.filter(c => c.isMainConcept).length;
  if (mainConcepts > 5) score += 3;
  else if (mainConcepts > 2) score += 2;
  else if (mainConcepts > 0) score += 1;
  
  // Topic coherence (0-2 points)
  const avgTopicCoherence = topics.reduce((sum, t) => sum + t.coherenceScore, 0) / topics.length;
  if (avgTopicCoherence > 7) score += 2;
  else if (avgTopicCoherence > 5) score += 1;
  
  // Definition presence (0-2 points)
  const definedConcepts = concepts.filter(c => c.definitions.length > 0).length;
  if (definedConcepts > 3) score += 2;
  else if (definedConcepts > 0) score += 1;
  
  // Structure indicators (0-1 point)
  if (/\n\s*\n/.test(content) || /\d+\./.test(content) || /#{1,6}/.test(content)) {
    score += 1;
  }
  
  return Math.min(10, score);
}

function assessEducationalValue(
  concepts: ConceptInfo[],
  objectives: string[],
  relationships: ConceptRelationship[]
): number {
  let score = 0;
  
  // Concept importance (0-3 points)
  const highImportanceConcepts = concepts.filter(c => c.importance > 7).length;
  if (highImportanceConcepts > 3) score += 3;
  else if (highImportanceConcepts > 1) score += 2;
  else if (highImportanceConcepts > 0) score += 1;
  
  // Learning objectives quality (0-2 points)
  if (objectives.length > 3) score += 2;
  else if (objectives.length > 1) score += 1;
  
  // Conceptual relationships (0-2 points)
  const strongRelationships = relationships.filter(r => r.strength > 0.7).length;
  if (strongRelationships > 2) score += 2;
  else if (strongRelationships > 0) score += 1;
  
  // Definition richness (0-2 points)
  const conceptsWithDefinitions = concepts.filter(c => c.definitions.length > 0).length;
  if (conceptsWithDefinitions > 2) score += 2;
  else if (conceptsWithDefinitions > 0) score += 1;
  
  // Context diversity (0-1 point)
  const conceptsWithMultipleContexts = concepts.filter(c => c.context.length > 1).length;
  if (conceptsWithMultipleContexts > 2) score += 1;
  
  return Math.min(10, score);
}

function calculateReadabilityScore(content: string): number {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 5);
  const words = content.split(/\s+/).filter(w => w.length > 0);
  const syllables = words.reduce((sum, word) => sum + countSyllables(word), 0);
  
  if (sentences.length === 0 || words.length === 0) return 5;
  
  // Simplified Flesch Reading Ease Score
  const avgWordsPerSentence = words.length / sentences.length;
  const avgSyllablesPerWord = syllables / words.length;
  
  const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
  
  // Convert to 1-10 scale (higher = more readable)
  return Math.max(1, Math.min(10, score / 10));
}

function countSyllables(word: string): number {
  word = word.toLowerCase();
  if (word.length <= 3) return 1;
  
  const vowels = 'aeiouy';
  let syllableCount = 0;
  let previousWasVowel = false;
  
  for (let i = 0; i < word.length; i++) {
    const isVowel = vowels.includes(word[i]);
    if (isVowel && !previousWasVowel) {
      syllableCount++;
    }
    previousWasVowel = isVowel;
  }
  
  // Adjust for silent 'e'
  if (word.endsWith('e') && syllableCount > 1) {
    syllableCount--;
  }
  
  return Math.max(1, syllableCount);
}

function assessTopicCoherence(topics: TopicInfo[], paragraphs: string[]): number {
  if (topics.length === 0 || paragraphs.length === 0) return 0;
  
  const avgCoherence = topics.reduce((sum, topic) => sum + topic.coherenceScore, 0) / topics.length;
  return Math.min(10, avgCoherence);
}

function assessContentDifficulty(
  content: string,
  concepts: ConceptInfo[],
  readabilityScore: number
): 'basic' | 'intermediate' | 'advanced' {
  let difficultyScore = 0;
  
  // Readability (lower readability = higher difficulty)
  if (readabilityScore < 4) difficultyScore += 2;
  else if (readabilityScore < 6) difficultyScore += 1;
  
  // Technical term density
  const technicalTerms = concepts.filter(c => 
    /^[A-Z]/.test(c.term) || /[A-Z]{2,}/.test(c.term) || c.definitions.length > 0
  ).length;
  
  if (technicalTerms > 8) difficultyScore += 2;
  else if (technicalTerms > 4) difficultyScore += 1;
  
  // Abstract concept indicators
  const abstractTerms = ['theory', 'concept', 'framework', 'principle', 'methodology', 'paradigm', 'hypothesis'];
  const hasAbstractTerms = abstractTerms.some(term => content.toLowerCase().includes(term));
  if (hasAbstractTerms) difficultyScore += 1;
  
  // Relationship complexity
  const complexConcepts = concepts.filter(c => c.importance > 8).length;
  if (complexConcepts > 3) difficultyScore += 1;
  
  if (difficultyScore <= 1) return 'basic';
  if (difficultyScore <= 3) return 'intermediate';
  return 'advanced';
}

// Export enhanced key concept extraction (backward compatibility)
export function extractKeyConcepts(content: string): string[] {
  const analysis = analyzeContentForLearning(content);
  return analysis.keyConcepts.map(c => c.term);
}