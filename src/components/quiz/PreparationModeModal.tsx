import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { timeBasedContentChunker, TimeBasedChunk } from '@/utils/time-based-content-chunker';
import { useToast } from '@/hooks/use-toast';
import { 
  Timer, 
  Brain, 
  BookOpen,
  Check, 
  X, 
  AlertCircle, 
  Clock, 
  ChevronRight, 
  ChevronLeft, 
  Lightbulb, 
  CheckSquare,
  RotateCcw,
  Settings,
  ArrowLeft,
  Info,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Star
} from 'lucide-react';

// Import components
import QuestionDisplay from '@/components/quiz/QuestionDisplay';

// Import types
import { Question, UserAnswer, ContentChunk, PreparationSession, ChunkSession, LearningProgress } from '@/types/quizTypes';
import { LibraryItem } from '@/components/documents/types';

// Import utility functions
import { getQuestionsForReview, scheduleForReview, updateWeakAreas } from '@/utils/spacedRepetition';

// Constants
const CONFIDENCE_LEVELS = [
  { value: 'low', label: 'Low', color: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800' },
  { value: 'medium', label: 'Medium', color: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800' },
  { value: 'high', label: 'High', color: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800' }
];

// Time adjustment preset buttons
const TIME_PRESETS = [
  { label: '2 min', value: 120 },
  { label: '5 min', value: 300 },
  { label: '10 min', value: 600 },
  { label: '15 min', value: 900 },
];

interface PreparationModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: LibraryItem;
  onComplete: (session: PreparationSession) => void;
  initialSession?: PreparationSession;
  initialProgress?: LearningProgress;
}

const PreparationModeModal: React.FC<PreparationModeModalProps> = ({
  isOpen,
  onClose,
  document: documentItem,
  onComplete,
  initialSession,
  initialProgress
}) => {
  const { toast } = useToast();
  
  // Transition state for fade effects
  const [isVisible, setIsVisible] = useState(false);
  
  const learnTimerRef = useRef<NodeJS.Timeout | null>(null);
  const questionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [session, setSession] = useState<PreparationSession>(initialSession || {
    id: `prep_${Date.now()}`,
    documentId: documentItem.id,
    documentTitle: documentItem.title,
    startTime: new Date(),
    status: 'in-progress',
    mode: 'preparation',
    currentChunkIndex: 0,
    totalChunks: 0,
    chunkSessions: []
  });
  
  const [progress, setProgress] = useState<LearningProgress>(initialProgress || {
    documentId: documentItem.id,
    masteredChunks: [],
    weakAreas: [],
    masteredQuestions: [],
    reviewQuestions: []
  });
  
  const [chunks, setChunks] = useState<ContentChunk[]>([]);
  const [currentChunk, setCurrentChunk] = useState<ContentChunk | null>(null);
  const [isLoadingChunks, setIsLoadingChunks] = useState<boolean>(true);
  
  const [learnTimeSeconds, setLearnTimeSeconds] = useState<number>(180); 
  const [remainingLearnTime, setRemainingLearnTime] = useState<number>(180);
  const [isLearning, setIsLearning] = useState<boolean>(true);
  const [showTimeSettings, setShowTimeSettings] = useState<boolean>(false);
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [userConfidence, setUserConfidence] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState<boolean>(false);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState<boolean>(false);
  const [hintRequested, setHintRequested] = useState<boolean>(false);
  const [questionTimer, setQuestionTimer] = useState<number>(60);
  const [remainingQuestionTime, setRemainingQuestionTime] = useState<number>(60);
  
  // Enhanced error handling states
  const [questionGenerationError, setQuestionGenerationError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [questionQuality, setQuestionQuality] = useState<'high' | 'standard' | 'low' | null>(null);
  
  const [isChunkComplete, setIsChunkComplete] = useState<boolean>(false);
  const [chunkScore, setChunkScore] = useState<number>(0);
  
  const [isSessionComplete, setIsSessionComplete] = useState<boolean>(false);
  const [sessionScore, setSessionScore] = useState<number>(0);
  
  const [isReviewMode, setIsReviewMode] = useState<boolean>(false);
  const [reviewQuestionIndex, setReviewQuestionIndex] = useState<number>(0);

  const [showLearningObjectives, setShowLearningObjectives] = useState<boolean>(true);
  const [showTopics, setShowTopics] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>("content");
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);
  
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // FIXED: Get the appropriate content source
  const getDocumentContent = useCallback((): string => {
    // Priority: 1. Summary (processed) 2. Content (raw) 3. Title as fallback
    if (documentItem.summary && documentItem.summary.trim().length > 100) {
      console.log('📄 Using processed summary for enhanced learning');
      return documentItem.summary.trim();
    } else if (documentItem.content && documentItem.content.trim().length > 100) {
      console.log('⚠️ No summary available, using raw content');
      return documentItem.content.trim();
    } else {
      console.error('❌ No suitable content found in document');
      throw new Error('Document has no usable content for study');
    }
  }, [documentItem.summary, documentItem.content]);

  // FIXED: Validate content quality before processing
  const validateDocumentContent = useCallback((content: string): { valid: boolean; issues: string[] } => {
    const issues: string[] = [];
    
    if (!content || content.trim().length < 100) {
      issues.push('Content too short for meaningful study (minimum 100 characters)');
    }
    
    if (content.length > 50000) {
      issues.push('Content too long for optimal study experience');
    }
    
    // Check for educational content indicators
    const educationalIndicators = [
      /\b(define|definition|explain|concept|principle|theory|method|process|function|purpose|important|significant|key|main|primary|essential|fundamental)\b/i,
      /\b(because|therefore|thus|however|moreover|furthermore|in addition|for example|such as|including)\b/i,
      /\b(what|how|why|when|where|which)\b/i
    ];
    
    const hasEducationalContent = educationalIndicators.some(pattern => pattern.test(content));
    if (!hasEducationalContent) {
      issues.push('Content may lack clear educational structure or concepts');
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  }, []);
  
  // FIXED: Content display that shows source information
  const renderContentInfo = useCallback(() => {
    const isUsingSummary = documentItem.summary && documentItem.summary.length > 100;
    const contentSource = isUsingSummary ? 'Enhanced Summary' : 'Original Content';
    const contentQuality = isUsingSummary ? 'Optimized for study' : 'Raw document content';
    
    return (
      <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-medium text-blue-800 dark:text-blue-300">
              📄 Content Source: {contentSource}
            </span>
            {isUsingSummary && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                ✨ Processed
              </Badge>
            )}
          </div>
          <span className="text-blue-600 dark:text-blue-400">{contentQuality}</span>
        </div>
      </div>
    );
  }, [documentItem.summary]);


  // Handle fade transition for opening/closing
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      fadeTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 300);
    }
    
    return () => {
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
    };
  }, [isOpen]);
  
  // Safe check for browser environment
  const isBrowser = typeof window !== 'undefined';
  
  const toggleFullscreen = useCallback(() => {
    try {
      if (typeof window === 'undefined') return;
      
      if (!window.document.fullscreenElement) {
        fullscreenRef.current?.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
          toast({ 
            title: "Fullscreen Error", 
            description: "Could not enable fullscreen mode. Try using the browser's fullscreen option instead.", 
            variant: "destructive" 
          });
        });
      } else {
        window.document.exitFullscreen();
      }
    } catch (err) {
      console.error("Fullscreen API error:", err);
      toast({ 
        title: "Fullscreen Not Supported", 
        description: "Your browser may not support fullscreen mode.", 
        variant: "destructive" 
      });
    }
  }, [toast]);
  
  // Update isFullscreen state based on whether we are in fullscreen mode
  useEffect(() => {
    if (!isBrowser) return;
    
    let observer: any;
    
    const updateFullscreenState = () => {
      setIsFullscreen(!!window.document.fullscreenElement);
    };
    
    try {
      window.document.addEventListener('fullscreenchange', updateFullscreenState);
    } catch (e) {
      console.warn('Fullscreen API events not supported');
      
      observer = setInterval(() => {
        setIsFullscreen(!!window.document.fullscreenElement);
      }, 1000);
    }
    
    return () => {
      if (isBrowser) {
        try {
          window.document.removeEventListener('fullscreenchange', updateFullscreenState);
        } catch (e) {
          // Ignore
        }
        
        if (observer) clearInterval(observer);
      }
    };
  }, [isBrowser]);
  
  const calculateSuggestedLearnTime = useCallback((content: string): number => {
    const wordCount = content.split(/\s+/).filter(Boolean).length;
    const baseMinutes = Math.round(wordCount / 200);
    const clampedMinutes = Math.min(Math.max(baseMinutes, 2), 10);
    return clampedMinutes * 60;
  }, []);

  const calculateReadingTime = useCallback((content: string): string => {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.ceil(wordCount / wordsPerMinute));
    return `~${minutes} min read`;
  }, []);
  
  // FIXED: Enhanced chunking with content source validation
  const divideIntoChunks = useCallback((): ContentChunk[] => {
    let content: string;
    
    try {
      content = getDocumentContent();
    } catch (error) {
      toast({
        title: "Content Error",
        description: error instanceof Error ? error.message : "Document content is missing or invalid.",
        variant: "destructive",
      });
      return [];
    }
    
    // Validate content quality
    const validation = validateDocumentContent(content);
    if (!validation.valid) {
      console.warn('⚠️ Content validation issues:', validation.issues);
      
      // Show warning but continue if content exists
      if (content.length < 100) {
        toast({
          title: "Content Too Short",
          description: "This document may be too short for effective study.",
          variant: "destructive",
        });
        return [];
      } else {
        toast({
          title: "Content Quality Warning",
          description: validation.issues.join('; ') || "Document content may have limited educational structure.",
        });
      }
    }
    
    console.log('📚 Processing content for chunking:', {
      source: documentItem.summary && documentItem.summary.trim().length > 100 ? 'summary' : 'raw content',
      length: content.length,
      title: documentItem.title
    });
    
    // Enhanced paragraph splitting that preserves context
    const paragraphs = content.split(/\n\s*\n+/).filter(p => p.trim().length > 50);
    let newChunks: ContentChunk[] = [];
    let currentChunkContent = '';
    let currentTopics: string[] = [];
    
    // FIXED: Better topic extraction that works with both summaries and raw content
    const extractTopics = (text: string): string[] => {
      const topics = new Set<string>();
      
      // Extract capitalized terms (proper nouns, concepts)
      const capitalizedTerms = text.match(/\b[A-Z][a-zA-Z]{2,}\b/g) || [];
      capitalizedTerms.forEach(term => {
        if (term.length > 3 && term.length < 25) {
          topics.add(term);
        }
      });
      
      // Extract quoted terms (often key concepts)
      const quotedTerms = text.match(/"([^"]{3,25})"/g) || [];
      quotedTerms.forEach(quoted => {
        const term = quoted.replace(/"/g, '');
        topics.add(term);
      });
      
      // Extract technical terms with specific patterns
      const technicalTerms = text.match(/\b[a-z]+(?:-[a-z]+)+\b/g) || [];
      technicalTerms.forEach(term => {
        if (term.length > 4 && term.length < 20) {
          topics.add(term);
        }
      });
      
      return Array.from(topics).slice(0, 4); // Limit to top 4 topics
    };
    
    // Process paragraphs into meaningful chunks
    paragraphs.forEach((paragraph, index) => {
      const paragraphWordCount = paragraph.split(/\s+/).filter(Boolean).length;
      const paragraphTopics = extractTopics(paragraph);
      
      // Decision logic for chunk boundaries
      const shouldCreateNewChunk = currentChunkContent && (
        // Size-based boundary
        (currentChunkContent.split(/\s+/).filter(Boolean).length + paragraphWordCount > 400) ||
        // Context-based boundary (every 3-4 paragraphs)
        (index > 0 && index % 4 === 0) ||
        // Topic shift boundary
        (currentTopics.length > 0 && paragraphTopics.length > 0 && 
         !paragraphTopics.some(topic => currentTopics.includes(topic)))
      );
      
      if (shouldCreateNewChunk) {
        // Create chunk from accumulated content
        if (currentChunkContent.trim()) {
          newChunks.push({
            content: currentChunkContent.trim(),
            topics: [...new Set(currentTopics)],
            index: newChunks.length
          });
        }
        
        // Start new chunk
        currentChunkContent = paragraph + '\n\n';
        currentTopics = [...paragraphTopics];
      } else {
        // Add to current chunk
        currentChunkContent += paragraph + '\n\n';
        currentTopics = [...currentTopics, ...paragraphTopics];
      }
    });
    
    // Add final chunk
    if (currentChunkContent.trim()) {
      newChunks.push({
        content: currentChunkContent.trim(),
        topics: [...new Set(currentTopics)],
        index: newChunks.length
      });
    }
    
    // Ensure minimum chunk quality
    newChunks = newChunks.filter(chunk => {
      const wordCount = chunk.content.split(/\s+/).filter(Boolean).length;
      return wordCount >= 50; // Minimum words per chunk
    });
    
    console.log(`📑 Created ${newChunks.length} content chunks:`, 
      newChunks.map((chunk, i) => ({
        index: i,
        words: chunk.content.split(/\s+/).filter(Boolean).length,
        topics: chunk.topics.length,
        topicSample: chunk.topics.slice(0, 2)
      }))
    );
    
    return newChunks;
  }, [documentItem.summary, documentItem.content, documentItem.title, getDocumentContent, validateDocumentContent, toast]);
  
  // Process content to enhance reading experience
  const formatContentForReading = useCallback((content: string, topics: string[] = []): string => {
    if (!content) return '';
  
    const paragraphs = content.split(/\n\n+/);
    
    const processedParagraphs = paragraphs.map(paragraph => {
      if (paragraph.trim().length === 0) return '';
      
      let processed = paragraph.replace(
        /^(\s*)(\w+(?:\s+\w+){0,2})/,
        '$1**$2**'
      );
      
      topics.forEach(topic => {
        if (topic.length < 3) return;
        
        const escapedTopic = topic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b(${escapedTopic})\\b`, 'gi');
        processed = processed.replace(regex, '`$1`');
      });
      
      return processed;
    });
    
    return processedParagraphs.join('\n\n');
  }, []);
  
  // FIXED: Enhanced chunk title generation that considers content source
  const getChunkTitle = useCallback(() => {
    if (!currentChunk) return "Section Content";
    
    // Check if we're using summary content (usually has better structure)
    const isUsingSummary = documentItem.summary && documentItem.summary.trim().length > 100;
    
    const getTopicEmoji = (topic: string) => {
      const lowercaseTopic = topic.toLowerCase();
      if (lowercaseTopic.includes('introduction') || lowercaseTopic.includes('intro')) return '🔍 Introduction';
      if (lowercaseTopic.includes('history') || lowercaseTopic.includes('background')) return '📜 Background';
      if (lowercaseTopic.includes('application') || lowercaseTopic.includes('use case')) return '⚙️ Applications';
      if (lowercaseTopic.includes('future') || lowercaseTopic.includes('trend')) return '🔮 Future';
      if (lowercaseTopic.includes('challenge') || lowercaseTopic.includes('problem')) return '🧩 Challenges';
      if (lowercaseTopic.includes('benefit') || lowercaseTopic.includes('advantage')) return '✅ Benefits';
      if (lowercaseTopic.includes('data') || lowercaseTopic.includes('analysis')) return '📊 Analysis';
      if (lowercaseTopic.includes('conclusion') || lowercaseTopic.includes('summary')) return '📝 Summary';
      
      return `📑 ${topic}`;
    };
    
    if (currentChunk.topics && currentChunk.topics.length > 0) {
      const mainTopic = currentChunk.topics[0];
      const titleWithEmoji = getTopicEmoji(mainTopic);
      
      // Add indicator if using processed summary
      return isUsingSummary ? `${titleWithEmoji} (Enhanced)` : titleWithEmoji;
    }
    
    // Fallback title with content source indicator
    const baseTitle = `📄 Section ${session.currentChunkIndex + 1}`;
    return isUsingSummary ? `${baseTitle} (Enhanced)` : baseTitle;
  }, [currentChunk, session.currentChunkIndex, documentItem.summary]);
  
  // Reset component state when opening
  useEffect(() => {
    if (isOpen) {
      setIsLoadingChunks(true);
      setIsLearning(true);
      setIsChunkComplete(false);
      setIsSessionComplete(false);
      setCurrentQuestionIndex(0);
      setAnswers([]);
      setSelectedAnswer(null);
      setUserConfidence(null);
      setShowFeedback(false);
      setHintRequested(false);
      setActiveTab("content");
      setIsFocusMode(false);
      setQuestionGenerationError(null);
      setRetryCount(0);
      setQuestionQuality(null);
      
      try {
        const documentChunks = divideIntoChunks();
        setChunks(documentChunks);
        setSession(prev => ({
          ...prev,
          id: `prep_${Date.now()}`,
          documentId: documentItem.id,
          documentTitle: documentItem.title,
          startTime: new Date(),
          currentChunkIndex: 0,
          totalChunks: documentChunks.length,
          chunkSessions: [],
          status: 'in-progress',
        }));
        
        if (documentChunks.length > 0) {
          const firstChunk = documentChunks[0];
          setCurrentChunk(firstChunk);
          const suggestedTime = calculateSuggestedLearnTime(firstChunk.content);
          setLearnTimeSeconds(suggestedTime);
          setRemainingLearnTime(suggestedTime);
        } else {
          toast({
            title: "No Content",
            description: "No study material could be extracted from this document.",
            variant: "destructive",
          });
          onClose(); // Consider if onClose is always the right action or if user should see an error state in modal
        }
      } catch (error) {
        console.error('Error initializing session:', error);
        toast({
          title: "Preparation Error",
          description: `Failed to prepare document for study. ${error instanceof Error ? error.message : ''}`,
          variant: "destructive",
        });
        onClose();
      } finally {
        setIsLoadingChunks(false);
      }
    }
    
    return () => {
      if (learnTimerRef.current) clearInterval(learnTimerRef.current);
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    };
  }, [isOpen, documentItem.id, documentItem.title, divideIntoChunks, calculateSuggestedLearnTime, toast, onClose]);
  
  // Learn timer effect
  useEffect(() => {
    if (isOpen && isLearning && remainingLearnTime > 0 && !isLoadingChunks) {
      if (learnTimerRef.current) clearInterval(learnTimerRef.current);
      
      learnTimerRef.current = setInterval(() => {
        setRemainingLearnTime(time => {
          if (time <= 1) {
            if (learnTimerRef.current) clearInterval(learnTimerRef.current);
            setIsLearning(false);
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (learnTimerRef.current) clearInterval(learnTimerRef.current);
    };
  }, [isOpen, isLearning, remainingLearnTime, isLoadingChunks]);
  
  // Question timer effect
  useEffect(() => {
    const isActive = isOpen && !isLearning && !showFeedback && !isChunkComplete && remainingQuestionTime > 0 && questions.length > 0;
    
    if (isActive) {
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
      
      questionTimerRef.current = setInterval(() => {
        setRemainingQuestionTime(time => {
          if (time <= 1) {
            if (questionTimerRef.current) clearInterval(questionTimerRef.current);
            handleCheckAnswer(); // Automatically check answer when time runs out
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    };
  }, [isOpen, isLearning, showFeedback, isChunkComplete, remainingQuestionTime, questions.length]); // Added handleCheckAnswer to dependencies
  
  // FIXED: Enhanced question generation that uses the correct content
  const generateQuestions = useCallback(async () => {
    if (!currentChunk) return;
    
    setIsLoadingQuestions(true);
    setQuestionGenerationError(null);
    let currentRetryCount = retryCount;
    const maxRetries = 2;
    
    const tryGenerateQuestions = async () => {
      try {
        // Get the source content type for logging
        const contentSource = documentItem.summary && documentItem.summary.trim().length > 100 ? 'processed summary' : 'raw content';
        
        console.log('🎯 Generating enhanced questions:', {
          title: getChunkTitle(),
          contentLength: currentChunk.content.length,
          topics: currentChunk.topics.length,
          contentSource: contentSource,
          retryAttempt: currentRetryCount,
          documentTitle: documentItem.title
        });
        
        // Enhanced content validation
        if (currentChunk.content.length < 50) {
          throw new Error(`Content chunk too short for meaningful questions (${currentChunk.content.length} characters)`);
        }
        
        // Get previously incorrect questions for review
        const reviewQuestionIds = getQuestionsForReview(
          progress,
          session.currentChunkIndex,
          [],
          2
        );

        // Determine optimal question count based on content
        const baseQuestionCount = Math.max(3, Math.min(8, Math.floor(currentChunk.topics.length * 2)));
        const adjustedCount = Math.min(baseQuestionCount, 6); // Cap at 6 questions
        
        // Determine exam level based on content characteristics
        const examLevel = currentChunk.content.length > 800 ? 'graduate' :
                          currentChunk.content.length > 400 ? 'standardized' : 'classroom';
        
        // FIXED: Enhanced API call with proper content handling
        const response = await fetch('/api/quizzes/generate-preparation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chunkContent: currentChunk.content,
            documentTitle: documentItem.title,
            userProgress: progress,
            difficultyPreference: 'medium',
            maxQuestions: adjustedCount,
            // FIXED: Request varied question types to ensure diversity
            questionTypes: [
              'multiple_choice',     // For concept recognition
              'true_false',         // For quick factual verification  
              'short_answer',       // For deeper understanding
              'fill_in_blank'       // For key term recall
            ],
            previousAnswered: reviewQuestionIds,
            examLevel: examLevel,
            enhancedMode: true,
            // FIXED: Pass content metadata for better question generation
            chunkMetadata: {
              title: getChunkTitle(),
              topics: currentChunk.topics,
              contentLength: currentChunk.content.length,
              contentSource: contentSource,
              complexity: currentChunk.content.length > 600 ? 'high' : 'medium',
              hasStructure: currentChunk.content.includes('\n\n') || currentChunk.content.includes('•'),
              conceptDensity: (currentChunk.topics.length / Math.max(1, currentChunk.content.length / 100))
            }
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Enhanced API Error:', errorData);
          
          // Handle specific error cases with better messaging
          if (errorData.code === 'INSUFFICIENT_EDUCATIONAL_VALUE') {
            throw new Error(`This section has limited educational content for quality questions. Educational value: ${errorData.details?.educationalValue || 'unknown'}/10`);
          } else if (errorData.code === 'NO_EXAM_LEVEL_CONCEPTS') {
            throw new Error('Unable to identify clear testable concepts in this section');
          } else {
            throw new Error(errorData.error || `Failed to generate questions: ${response.status} - ${response.statusText}`);
          }
        }
        
        const data = await response.json();
        
        // Enhanced validation of returned data
        if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
          throw new Error('No valid questions returned from enhanced question generation API');
        }
        
        // FIXED: Enhanced question validation with better filtering
        const validQuestions = data.questions.filter((q: any) => {
          const basicValid = q && 
                           q.id && 
                           q.question && 
                           q.correctAnswer && 
                           typeof q.correctAnswer === 'string' &&
                           q.correctAnswer.length > 1;
          
          if (!basicValid) return false;
          
          // Filter out trivial answers
          const trivialAnswers = ['the', 'and', 'or', 'a', 'an', 'is', 'are', 'yes', 'no', 'true', 'false'];
          if (trivialAnswers.includes(q.correctAnswer.toLowerCase().trim())) {
            console.log(`❌ Filtered trivial answer: "${q.correctAnswer}"`);
            return false;
          }
          
          // Ensure question is substantial
          if (q.question.length < 15) {
            console.log(`❌ Filtered short question: "${q.question}"`);
            return false;
          }
          
          return true;
        });
        
        if (validQuestions.length === 0) {
          throw new Error('No educationally valid questions were generated from this content section');
        }
        
        // Log successful generation details
        console.log('✅ Question generation successful:', {
          requested: adjustedCount,
          generated: data.questions.length,
          valid: validQuestions.length,
          contentSource: contentSource,
          types: validQuestions.map((q: any) => q.type),
          quality: data.contentMetadata?.questionQuality
        });
        
        // Set questions and reset state
        setQuestions(validQuestions);
        setCurrentQuestionIndex(0);
        setSelectedAnswer(null);
        setUserConfidence(null);
        setShowFeedback(false);
        setHintRequested(false);
        setRemainingQuestionTime(questionTimer);
        setRetryCount(0);
        
        // Set quality level based on metadata
        const qualityLevel = data.contentMetadata?.questionQuality === 'exam-level' ? 'high' :
                            data.contentMetadata?.questionQuality === 'standard' ? 'standard' : 'low';
        setQuestionQuality(qualityLevel);
        
        // Success feedback with content source info
        const successMessage = qualityLevel === 'high' 
          ? `Generated ${validQuestions.length} exam-level questions from ${contentSource}`
          : `Generated ${validQuestions.length} questions from ${contentSource}`;
          
        toast({
          title: qualityLevel === 'high' ? "✨ Enhanced Questions Generated" : "✅ Questions Generated",
          description: successMessage,
        });
        
      } catch (error) {
        console.error('Question generation error:', error);
        
        if (currentRetryCount < maxRetries) {
          currentRetryCount++;
          setRetryCount(currentRetryCount);
          console.log(`🔄 Retrying question generation (${currentRetryCount}/${maxRetries})...`);
          return tryGenerateQuestions();
        }
        
        // Set error state for final failure
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setQuestionGenerationError(errorMessage);
        
        // Enhanced error feedback based on content source
        const contentSource = documentItem.summary && documentItem.summary.trim().length > 100 ? 'processed summary' : 'raw content';
        
        if (errorMessage.includes('educational content') || errorMessage.includes('educational value')) {
          toast({
            title: "Content Analysis Issue",
            description: `The ${contentSource} needs stronger educational focus for quality questions.`,
            variant: "destructive",
          });
        } else if (errorMessage.includes('testable concepts')) {
          toast({
            title: "Concept Identification Issue", 
            description: `Unable to identify clear testable concepts in this ${contentSource}.`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Question Generation Error",
            description: `Unable to create questions from this ${contentSource}. Try again or skip ahead.`,
            variant: "destructive",
          });
        }
      }
    };
    
    await tryGenerateQuestions();
    setIsLoadingQuestions(false);
    
  }, [currentChunk, progress, session.currentChunkIndex, questionTimer, toast, retryCount, documentItem.title, documentItem.summary, getChunkTitle]);
  
  // Generate simple fallback questions if API fails
  const generateFallbackQuestions = useCallback((content: string): Question[] => {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20).slice(0, 5);
    const fallbackQuestions: Question[] = [];
    
    if (sentences.length > 0) {
      fallbackQuestions.push({
        id: `fallback_1_${Date.now()}`,
        question: `True or False: "${sentences[0].trim()}"`,
        type: 'true_false',
        correctAnswer: 'True',
        difficulty: 'medium',
        explanation: 'This statement appears directly in the text.',
      });
    }
    
    if (sentences.length > 1) {
      fallbackQuestions.push({
        id: `fallback_2_${Date.now()}`,
        question: `Which of the following is mentioned in the text?`,
        type: 'multiple_choice',
        options: [
          sentences[1].trim().substring(0, 50) + '...',
          'This option is not in the text',
          'This statement does not appear in the content',
          'None of the above'
        ],
        correctAnswer: sentences[1].trim().substring(0, 50) + '...',
        difficulty: 'easy',
        explanation: 'This option is directly quoted from the text.',
      });
    }
    
    if (fallbackQuestions.length < 2 && sentences.length > 0) {
      fallbackQuestions.push({
        id: `fallback_3_${Date.now()}`,
        question: `According to the text, is the following statement accurate?`,
        type: 'true_false',
        correctAnswer: 'True',
        difficulty: 'medium',
        explanation: 'This information is covered in the text.',
      });
    }
    
    return fallbackQuestions;
  }, []);
  
  // Trigger question generation when learning ends
  useEffect(() => {
    if (isOpen && !isLearning && questions.length === 0 && !isLoadingQuestions && !isChunkComplete && currentChunk) {
      generateQuestions();
    }
  }, [isOpen, isLearning, questions.length, isLoadingQuestions, isChunkComplete, currentChunk, generateQuestions]);
  
  // Format time display
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);
  
  // Handle "I'm ready" button click
  const handleReadyClick = useCallback(() => {
    if (learnTimerRef.current) clearInterval(learnTimerRef.current);
    setIsLearning(false);
    setRemainingLearnTime(0);
  }, []);
  
  // Handle time adjustment
  const handleTimeAdjustment = useCallback((newSeconds: number) => {
    setLearnTimeSeconds(newSeconds);
    setRemainingLearnTime(newSeconds);
    setShowTimeSettings(false);
  }, []);
  
  // Handle answer selection
  const handleAnswerSelect = useCallback((answer: string) => {
    if (showFeedback) return;
    setSelectedAnswer(answer);
  }, [showFeedback]);
  
  // Handle confidence selection
  const handleConfidenceSelect = useCallback((level: string) => {
    if (showFeedback) return;
    setUserConfidence(level);
  }, [showFeedback]);
  
  // Handle check answer button
  const handleCheckAnswer = useCallback(() => {
    if (!selectedAnswer || !questions[currentQuestionIndex] || showFeedback) return;
    
    if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    
    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    
    const userAnswer: UserAnswer = {
      questionId: currentQuestion.id,
      userAnswer: selectedAnswer,
      isCorrect,
      timeSpent: questionTimer - remainingQuestionTime,
      confidence: userConfidence as 'low' | 'medium' | 'high' | undefined,
    };
    
    setAnswers(prev => [...prev, userAnswer]);
    setProgress(prev => scheduleForReview(currentQuestion.id, isCorrect, prev));
    setShowFeedback(true);
  }, [currentQuestionIndex, questionTimer, questions, remainingQuestionTime, selectedAnswer, showFeedback, userConfidence]);
  
  // Handle next question navigation
  const handleNextQuestion = useCallback(() => {
    const nextIndex = currentQuestionIndex + 1;
    
    if (nextIndex < questions.length) {
      setCurrentQuestionIndex(nextIndex);
      setSelectedAnswer(null);
      setUserConfidence(null);
      setShowFeedback(false);
      setHintRequested(false);
      setRemainingQuestionTime(questionTimer);
    } else {
      completeChunk();
    }
  }, [currentQuestionIndex, questionTimer, questions.length]); // Added completeChunk to dependencies
  
  // Handle hint request
  const handleHintRequest = useCallback(() => {
    if (hintRequested || showFeedback || !questions[currentQuestionIndex]) return;
    
    setHintRequested(true);
    setRemainingQuestionTime(time => Math.max(0, time - 10));
    
    toast({
      title: "Hint",
      description: generateHint(questions[currentQuestionIndex]),
    });
  }, [hintRequested, questions, showFeedback, toast, currentQuestionIndex]); // Added currentQuestionIndex and generateHint to dependencies

  // Generate hint based on question type
  const generateHint = useCallback((question: Question): string => {
    if (!question) return "No hint available.";
    
    if (question.type === 'multiple_choice') {
      return "Consider key concepts from the material. Try eliminating obviously incorrect options first.";
    } else if (question.type === 'true_false') {
      return "Think about exceptions or qualifications to this statement. Is it always true?";
    } else if (question.type === 'fill_in_blank') {
      const answer = question.correctAnswer;
      return `The answer is ${answer.length} characters long and starts with "${answer[0]}".`;
    } else if (question.type === 'short_answer') {
      return "Think about the key concepts and their relationships. Provide a comprehensive explanation.";
    } else {
      return "Re-read the section carefully and look for the key concept being tested.";
    }
  }, []);
  
  // Toggle focus mode 
  const toggleFocusMode = useCallback(() => {
    setIsFocusMode(!isFocusMode);
  }, [isFocusMode]);
  
  // Complete the current chunk
  const completeChunk = useCallback(() => {
    const correctAnswersCount = answers.filter(a => a.isCorrect).length;
    const score = answers.length > 0 ? Math.round((correctAnswersCount / answers.length) * 100) : 0;
    
    const chunkSession: ChunkSession = {
      chunkIndex: session.currentChunkIndex,
      questions,
      answers,
      learnTimeSeconds, // This should be the actual time spent on learning, not initial setting
      startTime: new Date(Date.now() - (learnTimeSeconds * 1000) - (answers.reduce((acc, curr) => acc + (curr.timeSpent || 0), 0) * 1000)),
      endTime: new Date(),
      score,
      masteredQuestions: answers.filter(a => a.isCorrect).map(a => a.questionId)
    };
    
    setSession(prev => ({
      ...prev,
      chunkSessions: [...prev.chunkSessions, chunkSession]
    }));
    
    if (currentChunk) {
      const topics = currentChunk.topics.length > 0 ? currentChunk.topics : ['General'];
      
      topics.forEach(topic => {
        setProgress(prev => 
          updateWeakAreas(
            prev, 
            session.currentChunkIndex, 
            topic, 
            correctAnswersCount, 
            answers.length
          )
        );
      });
    }
    
    setChunkScore(score);
    setIsChunkComplete(true);
  }, [answers, currentChunk, learnTimeSeconds, questions, session.currentChunkIndex]);

  // FIXED: Complete the entire session - moved before handleNextChunk
  const completeSession = useCallback(() => {
    const allAnswers = session.chunkSessions.flatMap(cs => cs.answers);
    const correctAnswersCount = allAnswers.filter(a => a.isCorrect).length;
    const overallScore = allAnswers.length > 0 ? Math.round((correctAnswersCount / allAnswers.length) * 100) : 0;
    
    const completedSessionData: PreparationSession = {
      ...session,
      endTime: new Date(),
      status: 'completed',
      score: overallScore
    };
    
    setSession(completedSessionData);
    setSessionScore(overallScore);
    setIsSessionComplete(true);
    
    onComplete(completedSessionData);
  }, [onComplete, session]);
  
  // Handle moving to next chunk
  const handleNextChunk = useCallback(() => {
    const nextChunkIndex = session.currentChunkIndex + 1;
    
    if (nextChunkIndex < chunks.length) {
      setSession(prev => ({
        ...prev,
        currentChunkIndex: nextChunkIndex
      }));
      
      setCurrentChunk(chunks[nextChunkIndex]);
      setQuestions([]);
      setCurrentQuestionIndex(0);
      setAnswers([]);
      setSelectedAnswer(null);
      setUserConfidence(null);
      setShowFeedback(false);
      setHintRequested(false);
      setIsChunkComplete(false);
      setQuestionGenerationError(null);
      setRetryCount(0);
      setQuestionQuality(null);
      
      const nextChunkContent = chunks[nextChunkIndex].content;
      const suggestedTime = calculateSuggestedLearnTime(nextChunkContent);
      setLearnTimeSeconds(suggestedTime);
      setRemainingLearnTime(suggestedTime);
      
      setIsLearning(true);
      setIsFocusMode(false);
      setActiveTab("content");
    } else {
      completeSession();
    }
  }, [calculateSuggestedLearnTime, chunks, session.currentChunkIndex, completeSession]);
  
  // Review mode functions
  const handleReviewChunk = useCallback(() => {
    setIsReviewMode(true);
    setReviewQuestionIndex(0);
  }, []);
  
  const handleReviewNavigation = useCallback((direction: 'prev' | 'next') => {
    setReviewQuestionIndex(prev => 
      direction === 'prev' 
        ? Math.max(0, prev - 1) 
        : Math.min(questions.length - 1, prev + 1)
    );
  }, [questions.length]);
  
  const handleExitReview = useCallback(() => {
    setIsReviewMode(false);
    setReviewQuestionIndex(0);
  }, []);

  // Handle restart
  const handleRestartSession = useCallback(() => {
    setIsLoadingChunks(true);
    
    setSession({
      id: `prep_${Date.now()}`,
      documentId: documentItem.id,
      documentTitle: documentItem.title,
      startTime: new Date(),
      status: 'in-progress',
      mode: 'preparation',
      currentChunkIndex: 0,
      totalChunks: chunks.length,
      chunkSessions: []
    });
    
    if (chunks.length > 0) {
      const firstChunk = chunks[0];
      setCurrentChunk(firstChunk);
      const suggestedTime = calculateSuggestedLearnTime(firstChunk.content);
      setLearnTimeSeconds(suggestedTime);
      setRemainingLearnTime(suggestedTime);
    } else {
      setCurrentChunk(null);
    }
    
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setUserConfidence(null);
    setShowFeedback(false);
    setAnswers([]);
    setHintRequested(false);
    setRemainingQuestionTime(questionTimer);
    setIsChunkComplete(false);
    setChunkScore(0);
    setIsSessionComplete(false);
    setSessionScore(0);
    setIsLearning(true);
    setShowLearningObjectives(true);
    setIsFocusMode(false);
    setActiveTab("content");
    setQuestionGenerationError(null);
    setRetryCount(0);
    setQuestionQuality(null);
    setIsLoadingChunks(false);
  }, [calculateSuggestedLearnTime, chunks, documentItem.id, documentItem.title, questionTimer]);
  
  // Generate learning objectives from content
  const generateLearningObjectives = useCallback((content: string): string[] => {
    if (!content) return [];
    
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    let objectives: string[] = [];
    const keywords = ['important', 'key', 'critical', 'essential', 'fundamental', 'main point', 'conclude'];
    
    for (const sentence of sentences) {
      if (objectives.length >= 3) break;
      
      const sLower = sentence.toLowerCase();
      if (keywords.some(kw => sLower.includes(kw)) || sentence.startsWith('The main')) {
        if (sentence.length < 150) objectives.push(sentence.trim());
      }
    }
    
    if (objectives.length < 2) {
      for (let i = 0; i < Math.min(sentences.length, 3) && objectives.length < 3; i++) {
        if (sentences[i].length > 40 && sentences[i].length < 150 && !objectives.includes(sentences[i].trim())) {
          objectives.push(sentences[i].trim());
        }
      }
    }
    
    return objectives.length > 0 ? objectives : [
      "Understand main concepts presented in this section.", 
      "Identify key terms and their definitions.", 
      "Prepare to answer questions about relationships between concepts."
    ];
  }, []);

  const handleClose = useCallback(() => {
    const hasProgress = session.chunkSessions.length > 0 && session.status !== 'completed';
    
    if (hasProgress && isBrowser) {
      if (window.confirm("Exit study session? Your progress will be saved.")) {
        setIsVisible(false);
        
        setTimeout(() => {
          if (learnTimerRef.current) clearInterval(learnTimerRef.current);
          if (questionTimerRef.current) clearInterval(questionTimerRef.current);
          
          onComplete(session); // Save session on exit if in progress
          onClose();
        }, 300);
      }
    } else {
      setIsVisible(false);
      
      setTimeout(() => {
        if (learnTimerRef.current) clearInterval(learnTimerRef.current);
        if (questionTimerRef.current) clearInterval(questionTimerRef.current);
        
        onClose();
      }, 300);
    }
  }, [isBrowser, onClose, session, onComplete]); // Added onComplete and session to dependencies

  // FIXED: Retry question generation function
  const retryQuestionGeneration = useCallback(async () => {
    if (retryCount >= 2) {
      toast({
        title: "Maximum Retries Reached",
        description: "Unable to generate questions for this section. Moving to next section.",
        variant: "destructive",
      });
      handleNextChunk();
      return;
    }
    
    setRetryCount(prev => prev + 1);
    await generateQuestions();
  }, [retryCount, generateQuestions, handleNextChunk, toast]);

  // Return null if not open and animation has completed
  if (!isOpen && !isVisible) return null;

  // Render learning mode (reading content)
  const renderLearningMode = () => {
    if (!currentChunk) return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse">Loading enhanced content...</div>
      </div>
    );
    
    const readingTime = calculateReadingTime(currentChunk ? currentChunk.content : "");
    const learningObjectives = currentChunk ? generateLearningObjectives(currentChunk.content) : [];
    const formattedContent = formatContentForReading(currentChunk.content, currentChunk.topics);
    
    return (
      <div className={`flex flex-col h-full bg-slate-50/80 dark:bg-slate-900 transition-colors duration-300 ${isFocusMode ? 'bg-slate-100 dark:bg-slate-950' : ''}`}>
        {/* Header */}
        <header className={`p-0 border-b bg-white dark:bg-slate-800 sticky top-0 z-20 transition-opacity duration-300 shadow-sm ${isFocusMode ? 'opacity-50 hover:opacity-100' : ''}`}>
          <div className="max-w-4xl mx-auto px-4 py-3 flex flex-col items-center">
            <div className="w-full flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="bg-primary/10 p-1.5 rounded-md">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-md md:text-lg font-semibold flex items-center gap-1.5">
                    {getChunkTitle()}
                  </h2>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-xs text-muted-foreground">
                          {documentItem.title?.length > 30 ? 
                            documentItem.title.substring(0, 30) + '...' : 
                            documentItem.title || 'Document'}
                          <Info className="h-3 w-3 inline ml-1 cursor-help opacity-60" />
                        </p>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs max-w-xs">{documentItem.title}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
              <div className="flex items-center gap-1 md:gap-2">
                <Popover open={showTimeSettings} onOpenChange={setShowTimeSettings}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0">
                    <div className="p-4">
                      <h3 className="text-md font-semibold mb-3">Adjust Learning Time</h3>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {TIME_PRESETS.map(preset => (
                          <Button
                            key={preset.value}
                            variant={learnTimeSeconds === preset.value ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => setLearnTimeSeconds(preset.value)}
                          >
                            {preset.label}
                          </Button>
                        ))}
                      </div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">Custom Time</span>
                        <span className="text-sm text-muted-foreground">{Math.round(learnTimeSeconds / 60)} minutes</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setLearnTimeSeconds(Math.max(60, learnTimeSeconds - 60))} 
                          disabled={learnTimeSeconds <= 60}
                        >
                          -1m
                        </Button>
                        <input 
                          type="range" 
                          min="60" 
                          max="900" 
                          step="30" 
                          value={learnTimeSeconds} 
                          onChange={(e) => setLearnTimeSeconds(parseInt(e.target.value))} 
                          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setLearnTimeSeconds(Math.min(900, learnTimeSeconds + 60))} 
                          disabled={learnTimeSeconds >= 900}
                        >
                          +1m
                        </Button>
                      </div>
                      <div className="flex justify-end mt-4">
                        <Button size="sm" onClick={() => handleTimeAdjustment(learnTimeSeconds)}>
                          Apply
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={toggleFocusMode} 
                        className="h-8 w-8 rounded-full"
                        aria-label={isFocusMode ? "Exit focus mode" : "Enter focus mode"}
                      >
                        {isFocusMode ? (
                          <X className="h-4 w-4" />
                        ) : (
                          <BookOpen className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isFocusMode ? "Exit focus mode" : "Focus mode"}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={toggleFullscreen} 
                  className="h-8 w-8 rounded-full"
                  aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                >
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          
          {/* Progress Stepper */}
          <div className="max-w-lg mx-auto p-3 pb-3">
            <div className="flex justify-center mb-1">
              <div className="flex overflow-x-auto space-x-2 md:space-x-3 py-1">
                {chunks.map((chunk, index) => {
                  const isCurrent = index === session.currentChunkIndex;
                  const isPast = index < session.currentChunkIndex;
                  const topic = chunk.topics && chunk.topics[0] ? chunk.topics[0] : `Section ${index + 1}`;
                  const label = topic.length > 12 ? topic.substring(0, 12) + '...' : topic;
                  
                  return (
                    <TooltipProvider key={index}>
                      <Tooltip>
                        <TooltipTrigger>
                          <div 
                            className={`flex flex-col items-center gap-1 ${isPast ? 'cursor-pointer' : ''}`}
                            onClick={isPast ? () => {
                              if (window.confirm("Return to a previous section? Your progress on current section will be lost.")) {
                                // Logic to navigate back would go here
                                // For now, let's just log it or prevent it
                                console.warn("Navigation to past chunks not fully implemented yet.");
                                toast({
                                  title: "Navigation",
                                  description: "Returning to previous sections is under development.",
                                });
                              }
                            } : undefined}
                          >
                            <div 
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium
                                ${isCurrent 
                                  ? 'bg-primary text-white shadow-md' 
                                  : isPast 
                                    ? 'bg-primary/20 text-primary hover:bg-primary/30 transition-colors' 
                                    : 'bg-gray-100 text-gray-400 dark:bg-gray-700'}`}
                            >
                              {index + 1}
                            </div>
                            <span className={`text-xs ${isCurrent ? 'font-medium' : 'text-muted-foreground'}`}>
                              {label}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{topic}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
            </div>
          </div>
        </header>

        {/* Timer placed above content */}
        <div className={`px-4 pt-4 pb-2 bg-white dark:bg-slate-800 shadow-sm transition-opacity duration-300 ${isFocusMode ? 'opacity-40 hover:opacity-100' : ''}`}>
          <div className="max-w-3xl mx-auto">
            {renderContentInfo()}
            
            <div className="flex justify-between items-center mb-2">
              <div className="text-sm font-semibold text-foreground">⏱️ Reading Time Remaining</div>
              <div className="text-sm font-bold tabular-nums">{formatTime(remainingLearnTime)}</div>
            </div>
            <div className="relative h-3 w-full rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
              <div 
                className="h-full transition-all duration-1000 ease-out rounded-full bg-gradient-to-r from-blue-500 via-blue-400 to-green-400" 
                style={{ width: `${(remainingLearnTime / learnTimeSeconds) * 100}%` }} 
              />
            </div>
            
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {documentItem.summary && documentItem.summary.trim().length > 100 ? 
                'Study this enhanced content - optimized for learning!' : 
                'Take your time to understand this material - you\'ll be quizzed on it next!'
              }
            </p>
          </div>
        </div>
        
        {/* Content Area */}
        <div className="flex flex-col md:flex-row flex-grow overflow-hidden">
          {/* Main Content */}
          <main className={`flex flex-col ${showLearningObjectives && !isFocusMode ? 'w-full md:w-3/4' : 'w-full'} bg-background overflow-auto`}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-grow">
              <div className={`px-4 pt-3 border-b md:border-b-0 transition-opacity duration-300 ${isFocusMode ? 'opacity-30 hover:opacity-100' : ''}`}>
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="notes">Study Notes</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="content" className="m-0 flex-grow">
                <ScrollArea className="h-full p-4 md:p-6">
                  <div ref={contentRef} className="max-w-3xl mx-auto">
                    <h3 className="text-xl font-semibold text-foreground mb-3">
                      {currentChunk.topics.length > 0 ? currentChunk.topics.join(', ') : "Study Material"}
                    </h3>
                    <Separator className="mb-4" />
                    <div 
                      className="prose dark:prose-invert max-w-none font-serif whitespace-pre-wrap text-foreground/90 leading-relaxed"
                    >
                      {formattedContent.split('\n\n').map((paragraph, idx) => (
                        <p key={idx} dangerouslySetInnerHTML={{ 
                          __html: paragraph
                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                            .replace(/`(.*?)`/g, '<span class="text-primary font-medium">$1</span>')
                        }} />
                      ))}
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>
              <TabsContent value="notes" className="m-0 flex-grow">
                <ScrollArea className="h-full p-4 md:p-6">
                  <div className="max-w-3xl mx-auto">
                    <Alert className="mb-4 bg-sky-50 border-sky-200 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-700">
                      <AlertCircle className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                      <AlertTitle>Study Tip</AlertTitle>
                      <AlertDescription>
                        Connect new concepts with what you already know to improve retention. Use the space below for your notes.
                      </AlertDescription>
                    </Alert>
                    <textarea 
                      placeholder="Take notes here while you study this section..." 
                      className="w-full h-full min-h-[200px] md:min-h-[300px] p-3 focus:outline-none resize-none bg-transparent border rounded-md"
                      aria-label="Study notes"
                    />
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </main>
          
          {/* Side Panel with Learning Objectives */}
          {showLearningObjectives && !isFocusMode && (
            <aside className="w-full md:w-1/4 p-3 md:p-4 border-t md:border-t-0 md:border-l bg-slate-50 dark:bg-slate-800/50 overflow-auto">
              <h3 className="font-medium text-sm mb-3 flex items-center text-primary">
                <Info className="h-4 w-4 mr-1.5" />
                STUDY AIDS
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex w-full items-center justify-between text-xs font-semibold text-muted-foreground mb-1.5">
                    <span>TOPICS</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0"
                      onClick={() => setShowTopics(!showTopics)}
                      aria-expanded={showTopics}
                    >
                      {showTopics ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                  {showTopics && (
                    <div className="animate-in fade-in-50 duration-100 space-y-1">
                      <div className="flex flex-wrap gap-1 mb-2">
                        {currentChunk.topics.length > 0 ? currentChunk.topics.map((topic, index) => (
                          <Badge key={index} variant="secondary">{topic}</Badge>
                        )) : <span className="text-xs text-muted-foreground">No specific topics identified.</span>}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex w-full items-center justify-between text-xs font-semibold text-muted-foreground mb-1.5">
                    <span>KEY POINTS / OBJECTIVES</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0"
                      onClick={() => {
                        setShowLearningObjectives(!showLearningObjectives);
                      }}
                      aria-expanded={showLearningObjectives}
                    >
                      {showLearningObjectives ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                  {showLearningObjectives && (
                    <div className="animate-in fade-in-50 duration-100 space-y-1">
                      {learningObjectives.length > 0 ? (
                        <ul className="space-y-1.5">
                          {learningObjectives.map((objective: string, index: number) => (
                            <li key={index} className="flex items-start group">
                              <CheckSquare className="h-3.5 w-3.5 mr-2 mt-0.5 text-primary/80 flex-shrink-0 group-hover:text-primary transition-colors duration-200" />
                              <span className="text-xs text-foreground/90">{objective}</span>
                            </li>
                          ))}
                        </ul>
                      ) : <span className="text-xs text-muted-foreground">No specific objectives generated. Focus on overall understanding.</span>}
                    </div>
                  )}
                </div>
              </div>
            </aside>
          )}
        </div>
        
        {/* Footer */}
        <footer className={`p-3 md:p-4 border-t bg-background flex justify-between items-center transition-opacity duration-300 ${isFocusMode ? 'opacity-40 hover:opacity-100' : ''}`}>
          <Button variant="outline" onClick={handleClose} size="sm">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Exit Session
          </Button>
          <Button 
            onClick={handleReadyClick} 
            className="bg-primary hover:bg-primary/90 transition-transform hover:translate-y-[-2px] duration-200" 
            size="sm"
          >
            I'm Ready for Questions
            <ChevronRight className="h-4 w-4 ml-1.5" />
          </Button>
        </footer>
      </div>
    );
  };
  
  // Render quiz mode (answering questions)
  const renderQuizMode = () => {
    if (isLoadingQuestions) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-background to-muted/20">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-muted rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-primary rounded-full animate-spin"></div>
          </div>
          <div className="text-lg font-medium text-foreground mt-8 mb-2">Generating enhanced questions...</div>
          <div className="text-sm text-muted-foreground">Creating personalized learning questions</div>
          {retryCount > 0 && (
            <div className="text-xs text-amber-600 mt-2">
              Retry attempt {retryCount}/2
            </div>
          )}
          <div className="w-48 h-1 mt-8 rounded-full bg-muted overflow-hidden">
            <div className="bg-primary h-full w-1/3 rounded-full animate-pulse"></div>
          </div>
        </div>
      );
    }
    
    if (questionGenerationError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="max-w-md w-full">
            <div className="text-center mb-8">
              <AlertCircle className="h-12 w-12 text-amber-500 dark:text-amber-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">Enhanced Question Generation Issue</h3>
              <p className="text-muted-foreground">
                {questionGenerationError}
              </p>
            </div>
            
            <div className="flex flex-col gap-3">
              <Button 
                onClick={retryQuestionGeneration} 
                size="sm"
                disabled={retryCount >= 2}
                className="w-full h-10 transition-all duration-200 hover:shadow-md"
              >
                <RefreshCw className="h-4 w-4 mr-2" /> 
                {retryCount >= 2 ? 'Max Retries Reached' : 'Try Again'}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleNextChunk}
                size="sm"
                className="w-full h-10"
              >
                Skip to Next Section
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      );
    }
    
    if (questions.length === 0) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="max-w-md w-full">
            <div className="text-center mb-8">
              <AlertCircle className="h-12 w-12 text-amber-500 dark:text-amber-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">Question Generation Issue</h3>
              <p className="text-muted-foreground">
                We encountered a problem creating questions for this section. You can try again or move to the next section.
              </p>
            </div>
            
            <div className="flex flex-col gap-3">
              <Button 
                onClick={() => generateQuestions()} 
                size="sm"
                className="w-full h-10 transition-all duration-200 hover:shadow-md"
              >
                <RotateCcw className="h-4 w-4 mr-2" /> Try Again
              </Button>
              <Button 
                variant="outline" 
                onClick={handleNextChunk}
                size="sm"
                className="w-full h-10"
              >
                Skip to Next Section
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      );
    }
    
    const currentQuestion = questions[currentQuestionIndex];
    
    return (
      <div className="flex flex-col h-full bg-muted/10 dark:bg-slate-900">
        <header className="p-2 md:p-3 border-b bg-background sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary flex-shrink-0" />
              <h2 className="text-md font-semibold">Question {currentQuestionIndex + 1} of {questions.length}</h2>
            </div>
            <div className="flex items-center gap-2">
              {/* Question Timer with Progress Bar */}
              <div className="flex items-center gap-1 w-28">
                <div className="flex-grow">
                  <Progress 
                    value={(remainingQuestionTime / questionTimer) * 100} 
                    className={`h-2 ${
                      remainingQuestionTime < 10 
                        ? "bg-red-200 dark:bg-red-900" 
                        : remainingQuestionTime < 30 
                          ? "bg-amber-200 dark:bg-amber-900" 
                          : ""
                    }`} 
                  />
                </div>
                <Badge 
                  variant="outline" 
                  className={`tabular-nums text-xs px-1.5 py-0.5 ${
                    remainingQuestionTime < 10 
                      ? "bg-red-100 text-red-700 border-red-300 dark:bg-red-700/30 dark:text-red-300 dark:border-red-500 animate-pulse" 
                      : remainingQuestionTime < 30 
                        ? "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-700/30 dark:text-amber-300 dark:border-amber-500" 
                        : "bg-green-100 text-green-700 border-green-300 dark:bg-green-700/30 dark:text-green-300 dark:border-green-500"
                  }`}
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {formatTime(remainingQuestionTime)}
                </Badge>
              </div>
              
              {/* Quality Badge */}
              {questionQuality === 'high' && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <Star className="h-3.5 w-3.5 mr-1" />
                  Enhanced
                </Badge>
              )}
              
              {/* Difficulty Badge */}
              <Badge 
                variant={
                  currentQuestion.difficulty === "hard" 
                    ? "destructive" 
                    : currentQuestion.difficulty === "medium" 
                      ? "secondary" 
                      : "outline"
                } 
                className="capitalize hidden sm:inline-flex"
              >
                {currentQuestion.difficulty}
              </Badge>
              
              {/* Fullscreen Toggle */}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleFullscreen} 
                className="h-8 w-8 rounded-full"
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <Progress 
            value={((currentQuestionIndex + 1) / questions.length) * 100} 
            className="h-1 mt-1.5" 
            aria-label={`Question ${currentQuestionIndex + 1} of ${questions.length}`}
          />
        </header>
        
        <main className="flex-grow overflow-auto p-3 md:p-6 flex items-center justify-center">
          <QuestionDisplay
            question={currentQuestion}
            selectedAnswer={selectedAnswer}
            showFeedback={showFeedback}
            isBlindMode={false}
            onSelectAnswer={handleAnswerSelect}
            onRequestHint={handleHintRequest}
            onCheckAnswer={handleCheckAnswer}
            onNextQuestion={handleNextQuestion}
            confidenceLevels={CONFIDENCE_LEVELS}
            selectedConfidence={userConfidence}
            onSelectConfidence={handleConfidenceSelect}
            hintRequested={hintRequested}
            isLastQuestion={currentQuestionIndex === questions.length - 1}
            timeRemaining={remainingQuestionTime}
            totalTime={questionTimer}
          />
        </main>
      </div>
    );
  };
  
  // Render chunk complete (after a section's quiz)
  const renderChunkComplete = () => {
    return (
      <div className="flex flex-col h-full bg-muted/20 dark:bg-slate-900">
        <header className="p-3 md:p-4 border-b bg-background sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-md md:text-lg font-semibold">Section {session.currentChunkIndex + 1} Completed!</h2>
            <Badge 
              variant="outline" 
              className={`${
                chunkScore >= 80 
                  ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800' 
                  : chunkScore >=60 
                    ? 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800' 
                    : 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
              }`}
            >
              Score: {chunkScore}%
            </Badge>
          </div>
        </header>
        <main className="flex-grow overflow-auto p-3 md:p-6 flex items-center justify-center">
          {isReviewMode ? (
            <div className="w-full max-w-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Question Review</h3>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => handleReviewNavigation('prev')} 
                    disabled={reviewQuestionIndex === 0} 
                    className="h-8 w-8 transition-all duration-200 hover:bg-muted"
                    aria-label="Previous question"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm tabular-nums">{reviewQuestionIndex + 1} / {questions.length}</span>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => handleReviewNavigation('next')} 
                    disabled={reviewQuestionIndex === questions.length - 1} 
                    className="h-8 w-8 transition-all duration-200 hover:bg-muted"
                    aria-label="Next question"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Card className="mb-4 shadow-sm transition-all duration-200 hover:shadow-md">
                <CardContent className="pt-6 space-y-3 text-sm">
                  <p className="font-semibold text-base">{questions[reviewQuestionIndex].question}</p>
                  <p><span className="font-medium text-muted-foreground">Correct Answer:</span> {questions[reviewQuestionIndex].correctAnswer}</p>
                  <div className="flex items-center">
                    <span className="font-medium text-muted-foreground mr-2">Your Answer:</span> {answers[reviewQuestionIndex]?.userAnswer || 'Not answered'}
                    {answers[reviewQuestionIndex] && (
                      <Badge 
                        variant="outline" 
                        className={`ml-2 ${
                          answers[reviewQuestionIndex].isCorrect 
                            ? 'border-green-500 text-green-700 dark:border-green-800 dark:text-green-400' 
                            : 'border-red-500 text-red-700 dark:border-red-800 dark:text-red-400'
                        }`}
                      >
                        {answers[reviewQuestionIndex].isCorrect ? 'Correct' : 'Incorrect'}
                      </Badge>
                    )}
                  </div>
                  {questions[reviewQuestionIndex].explanation && (
                    <Alert variant="default" className="bg-sky-50 border-sky-200 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-700 text-xs">
                      <AlertTitle className="text-xs">Explanation</AlertTitle>
                      <AlertDescription>{questions[reviewQuestionIndex].explanation}</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
              <div className="flex justify-center">
                <Button 
                  variant="outline" 
                  onClick={handleExitReview} 
                  size="sm"
                  className="transition-all duration-200 hover:bg-muted"
                >
                  Back to Results
                </Button>
              </div>
            </div>
          ) : (
            <Card className="w-full max-w-md text-center p-6 shadow-sm transition-all duration-300 hover:shadow-md">
              <CardHeader className="p-0 mb-4">
                 <div className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-3 ${
                   chunkScore >= 80 
                     ? 'bg-green-100 dark:bg-green-900/30' 
                     : chunkScore >=60 
                       ? 'bg-amber-100 dark:bg-amber-900/30' 
                       : 'bg-red-100 dark:bg-red-900/30'
                 }`}>
                    <h2 className={`text-3xl font-bold ${
                      chunkScore >= 80 
                        ? 'text-green-600 dark:text-green-400' 
                        : chunkScore >=60 
                          ? 'text-amber-600 dark:text-amber-400' 
                          : 'text-red-600 dark:text-red-400'
                    }`}>
                      {chunkScore}%
                    </h2>
                 </div>
                <CardTitle>Section Result</CardTitle>
              </CardHeader>
              <CardContent className="p-0 mb-6">
                <Progress value={chunkScore} className="w-full mb-3 h-2" aria-label={`Score: ${chunkScore}%`} />
                <p className="text-sm text-muted-foreground">
                  {chunkScore >= 80 
                    ? "Great job! You've shown strong understanding." 
                    : chunkScore >= 60 
                      ? "Good effort! A little more review might be helpful." 
                      : "Consider reviewing this section again to strengthen your knowledge."}
                </p>
              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row gap-2 justify-center p-0">
                <Button 
                  variant="outline" 
                  onClick={handleReviewChunk} 
                  size="sm"
                  className="transition-all duration-200 hover:bg-muted hover:translate-y-[-1px]"
                >
                  <CheckSquare className="h-4 w-4 mr-2" />Review Questions
                </Button>
                <Button 
                  onClick={handleNextChunk} 
                  size="sm"
                  className="transition-all duration-200 hover:translate-y-[-2px]"
                >
                  {session.currentChunkIndex < chunks.length - 1 ? 'Next Section' : 'Complete Study Session'}
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </CardFooter>
            </Card>
          )}
        </main>
      </div>
    );
  };
  
  // Render session complete (final results)
  const renderSessionComplete = () => {
    return (
      <div className="flex flex-col h-full bg-muted/20 dark:bg-slate-900">
        <header className="p-3 md:p-4 border-b bg-background sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-md md:text-lg font-semibold">Study Session Completed!</h2>
            <Badge 
              variant="outline" 
              className={`${
                sessionScore >= 80 
                  ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800' 
                  : sessionScore >=60 
                    ? 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800' 
                    : 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
              }`}
            >
              Overall Score: {sessionScore}%
            </Badge>
          </div>
        </header>
        <main className="flex-grow overflow-auto p-3 md:p-6 flex items-center justify-center">
          <Card className="w-full max-w-lg shadow-sm transition-all duration-300 hover:shadow-md">
            <CardHeader className="items-center text-center">
              <div className={`w-28 h-28 rounded-full flex items-center justify-center mb-3 ${
                sessionScore >= 80 
                  ? 'bg-green-100 dark:bg-green-900/30' 
                  : sessionScore >=60 
                    ? 'bg-amber-100 dark:bg-amber-900/30' 
                    : 'bg-red-100 dark:bg-red-900/30'
              }`}>
                <h2 className={`text-4xl font-bold ${
                  sessionScore >= 80 
                    ? 'text-green-600 dark:text-green-400' 
                    : sessionScore >=60 
                      ? 'text-amber-600 dark:text-amber-400' 
                      : 'text-red-600 dark:text-red-400'
                }`}>
                  {sessionScore}%
                </h2>
              </div>
              <CardTitle className="text-2xl">Session Summary</CardTitle>
              <p className="text-muted-foreground text-sm">{documentItem.title}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={sessionScore} className="w-full mb-4 h-2.5" aria-label={`Overall score: ${sessionScore}%`} />
              <div>
                <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Section Performance</h3>
                <ScrollArea className="h-40 border rounded-md">
                  <div className="p-2 space-y-1.5">
                    {session.chunkSessions.map((cs, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-800/50 rounded-md text-xs hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors duration-150">
                        <span className="font-medium">Section {index + 1}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            {cs.answers.filter(a => a.isCorrect).length}/{cs.questions.length}
                          </span>
                          <Badge 
                            variant="outline" 
                            className={`px-1.5 py-0.5 ${
                              (cs.score || 0) >= 80 
                                ? 'border-green-500 text-green-700 dark:border-green-800 dark:text-green-400' 
                                : (cs.score || 0) >= 60 
                                  ? 'border-amber-500 text-amber-700 dark:border-amber-800 dark:text-amber-400' 
                                  : 'border-red-500 text-red-700 dark:border-red-800 dark:text-red-400'
                            }`}
                          >
                            {cs.score}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              {progress.weakAreas.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Areas to Focus On</h3>
                  <ScrollArea className="h-32 border rounded-md">
                    <div className="p-2 space-y-1.5">
                    {progress.weakAreas.filter(area => area.correctRate < 0.75).map((area, index) => (
                      <div key={index} className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-md border border-amber-200 dark:border-amber-700 text-xs transition-all duration-200 hover:bg-amber-100 dark:hover:bg-amber-800/30">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-amber-800 dark:text-amber-300">
                            Section {area.chunkIndex + 1}: {area.topic}
                          </span>
                          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-800 dark:text-amber-200 dark:border-amber-600">
                            {Math.round(area.correctRate * 100)}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-2 justify-center pt-5">
              <Button 
                variant="outline" 
                onClick={handleClose} 
                size="sm"
                className="transition-all duration-200 hover:bg-muted hover:translate-y-[-1px]"
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> Return to Documents
              </Button>
              <Button 
                onClick={handleRestartSession} 
                size="sm"
                className="transition-all duration-200 hover:translate-y-[-2px]"
              >
                <RotateCcw className="h-4 w-4 mr-2" /> Study This Document Again
              </Button>
            </CardFooter>
          </Card>
        </main>
      </div>
    );
  };
  
  // Main component render
  return (
    <div 
      ref={fullscreenRef} 
      className={`fixed inset-0 z-50 bg-background text-foreground flex flex-col transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="preparation-mode-title"
    >
      <div id="preparation-mode-title" className="sr-only">Preparation Mode for {documentItem.title}</div>
      
      {isLoadingChunks ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-6"></div>
          <h2 className="text-xl font-semibold mb-2">Preparing Enhanced Study Materials</h2>
          <p className="text-muted-foreground">For: <span className="font-medium text-foreground">{documentItem.title}</span></p>
          <p className="text-sm text-muted-foreground">Using advanced content analysis...</p>
        </div>
      ) : isLearning ? (
        renderLearningMode()
      ) : isChunkComplete ? (
        renderChunkComplete()
      ) : isSessionComplete ? (
        renderSessionComplete()
      ) : (
        renderQuizMode()
      )}
    </div>
  );
};

export default PreparationModeModal;