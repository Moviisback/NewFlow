// components/documents/FlashcardGenerator.tsx
import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Shuffle, 
  RefreshCw, 
  Check,
  Lightbulb,
  AlertTriangle,
  Edit
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

type Flashcard = {
  id: string;
  term: string;
  definition: string;
  isPinned: boolean;
  timesCorrect: number;
  timesIncorrect: number;
  interval: number; // for spaced repetition
  nextReview: Date;
  tags: string[];
};

interface FlashcardGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  summary: string;
  title: string;
}

const FlashcardGenerator: React.FC<FlashcardGeneratorProps> = ({
  isOpen,
  onClose,
  summary,
  title
}) => {
  // State
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isShowingAnswer, setIsShowingAnswer] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTerm, setEditedTerm] = useState('');
  const [editedDefinition, setEditedDefinition] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('study');
  const [studyMode, setStudyMode] = useState<'regular' | 'spaced'>('regular');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortType, setSortType] = useState<'alphabetical' | 'difficulty' | 'recent'>('alphabetical');
  
  // Extract and generate flashcards from the summary
  useEffect(() => {
    if (summary && isOpen) {
      extractFlashcards();
    }
  }, [summary, isOpen]);

  // Extract flashcards from text
  const extractFlashcards = () => {
    setIsGenerating(true);
    
    // This would normally be an API call to generate flashcards
    // For now, we'll simulate it with a timeout and some example cards
    setTimeout(() => {
      // Extract definitions and key terms
      const keyTerms: Flashcard[] = [];
      
      // Extract terms in bold (enclosed in ** in Markdown)
      const boldTermRegex = /\*\*(.*?)\*\*/g;
      let match;
      
      const processedTerms = new Set<string>();
      
      while ((match = boldTermRegex.exec(summary)) !== null) {
        const term = match[1].trim();
        if (term && !processedTerms.has(term.toLowerCase())) {
          processedTerms.add(term.toLowerCase());
          
          // Find sentences containing this term to use as definition
          const sentences = findSentencesWithTerm(summary, term);
          const definition = sentences.length > 0 
            ? sentences[0].replace(`**${term}**`, term) 
            : 'Definition not found';
            
          keyTerms.push({
            id: `card-${Date.now()}-${keyTerms.length}`,
            term,
            definition,
            isPinned: false,
            timesCorrect: 0,
            timesIncorrect: 0,
            interval: 1,
            nextReview: new Date(),
            tags: []
          });
        }
      }
      
      // Also look for definition patterns (Term: definition)
      const definitionRegex = /([A-Z][a-zA-Z0-9\s]+):\s*((?:[^.!?]|(?:\.\s+[a-z]))+[.!?])/g;
      while ((match = definitionRegex.exec(summary)) !== null) {
        const term = match[1].trim();
        const definition = match[2].trim();
        
        if (term && definition && !processedTerms.has(term.toLowerCase())) {
          processedTerms.add(term.toLowerCase());
          
          keyTerms.push({
            id: `card-${Date.now()}-${keyTerms.length}`,
            term,
            definition,
            isPinned: false,
            timesCorrect: 0,
            timesIncorrect: 0,
            interval: 1,
            nextReview: new Date(),
            tags: []
          });
        }
      }
      
      // Add example cards if none were found
      if (keyTerms.length === 0) {
        keyTerms.push(
          {
            id: 'card-1',
            term: 'Internet',
            definition: 'A global system of interconnected computer networks that use standardized communication protocols to link devices worldwide.',
            isPinned: false,
            timesCorrect: 0,
            timesIncorrect: 0,
            interval: 1,
            nextReview: new Date(),
            tags: ['networking', 'technology']
          },
          {
            id: 'card-2',
            term: 'Packet Switching',
            definition: 'A method of data transmission where information is broken into smaller packets, sent individually, and reassembled at the destination.',
            isPinned: false,
            timesCorrect: 0,
            timesIncorrect: 0,
            interval: 1,
            nextReview: new Date(),
            tags: ['networking', 'technology']
          },
          {
            id: 'card-3',
            term: 'HTML',
            definition: 'HyperText Markup Language, the standard language for creating web pages and applications.',
            isPinned: false,
            timesCorrect: 0,
            timesIncorrect: 0,
            interval: 1,
            nextReview: new Date(),
            tags: ['web', 'programming']
          }
        );
      }
      
      setFlashcards(keyTerms);
      setCurrentCardIndex(0);
      setIsShowingAnswer(false);
      setIsGenerating(false);
    }, 1000);
  };

  // Helper function to find sentences containing a specific term
  const findSentencesWithTerm = (text: string, term: string): string[] => {
    // Split the text into sentences
    const sentenceRegex = /[^.!?]+[.!?]+/g;
    const sentences = text.match(sentenceRegex) || [];
    
    // Find sentences containing the term
    return sentences.filter(sentence => 
      sentence.toLowerCase().includes(term.toLowerCase()) ||
      sentence.includes(`**${term}**`)
    );
  };

  // Navigation functions
  const goToNextCard = () => {
    if (currentCardIndex < flashcards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setIsShowingAnswer(false);
    } else {
      // Loop back to first card when reaching the end
      setCurrentCardIndex(0);
      setIsShowingAnswer(false);
    }
  };

  const goToPrevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      setIsShowingAnswer(false);
    } else {
      // Loop to last card when at the beginning
      setCurrentCardIndex(flashcards.length - 1);
      setIsShowingAnswer(false);
    }
  };

  // Flashcard functions
  const toggleShowAnswer = () => {
    setIsShowingAnswer(!isShowingAnswer);
  };

  const shuffleCards = () => {
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
    setFlashcards(shuffled);
    setCurrentCardIndex(0);
    setIsShowingAnswer(false);
  };

  const markCorrect = () => {
    if (currentCardIndex >= 0 && currentCardIndex < flashcards.length) {
      const updatedCards = [...flashcards];
      updatedCards[currentCardIndex] = {
        ...updatedCards[currentCardIndex],
        timesCorrect: updatedCards[currentCardIndex].timesCorrect + 1,
        interval: updatedCards[currentCardIndex].interval * 2, // Double the interval for spaced repetition
        nextReview: new Date(Date.now() + updatedCards[currentCardIndex].interval * 24 * 60 * 60 * 1000)
      };
      setFlashcards(updatedCards);
      goToNextCard();
    }
  };

  const markIncorrect = () => {
    if (currentCardIndex >= 0 && currentCardIndex < flashcards.length) {
      const updatedCards = [...flashcards];
      updatedCards[currentCardIndex] = {
        ...updatedCards[currentCardIndex],
        timesIncorrect: updatedCards[currentCardIndex].timesIncorrect + 1,
        interval: 1, // Reset interval for spaced repetition
        nextReview: new Date() // Review again today
      };
      setFlashcards(updatedCards);
      goToNextCard();
    }
  };

  // Editing functions
  const startEditing = () => {
    if (currentCardIndex >= 0 && currentCardIndex < flashcards.length) {
      setEditedTerm(flashcards[currentCardIndex].term);
      setEditedDefinition(flashcards[currentCardIndex].definition);
      setIsEditing(true);
    }
  };

  const saveEdit = () => {
    if (currentCardIndex >= 0 && currentCardIndex < flashcards.length) {
      const updatedCards = [...flashcards];
      updatedCards[currentCardIndex] = {
        ...updatedCards[currentCardIndex],
        term: editedTerm,
        definition: editedDefinition
      };
      setFlashcards(updatedCards);
      setIsEditing(false);
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
  };

  // Card creation
  const addNewCard = () => {
    const newCard: Flashcard = {
      id: `card-${Date.now()}`,
      term: 'New Term',
      definition: 'Add your definition here',
      isPinned: false,
      timesCorrect: 0,
      timesIncorrect: 0,
      interval: 1,
      nextReview: new Date(),
      tags: []
    };
    
    setFlashcards([...flashcards, newCard]);
    setCurrentCardIndex(flashcards.length);
    setIsEditing(true);
    setEditedTerm('New Term');
    setEditedDefinition('Add your definition here');
  };

  // Download flashcards
  const downloadFlashcards = () => {
    // Format flashcards for export
    const exportData = flashcards.map(card => 
      `Term: ${card.term}\nDefinition: ${card.definition}\n\n`
    ).join('');
    
    const blob = new Blob([exportData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '-').toLowerCase()}-flashcards.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Calculate progress
  const calculateProgress = () => {
    if (flashcards.length === 0) return 0;
    const totalAttempts = flashcards.reduce((sum, card) => 
      sum + card.timesCorrect + card.timesIncorrect, 0);
    if (totalAttempts === 0) return 0;
    
    const correctRate = flashcards.reduce((sum, card) => 
      sum + card.timesCorrect, 0) / totalAttempts;
    return Math.round(correctRate * 100);
  };

  // Filter flashcards based on search
  const getFilteredFlashcards = () => {
    return flashcards.filter(card => 
      card.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.definition.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  // Sort flashcards
  const getSortedFlashcards = () => {
    const filtered = getFilteredFlashcards();
    switch (sortType) {
      case 'alphabetical':
        return [...filtered].sort((a, b) => a.term.localeCompare(b.term));
      case 'difficulty':
        return [...filtered].sort((a, b) => {
          const aRate = a.timesCorrect / (a.timesCorrect + a.timesIncorrect) || 0;
          const bRate = b.timesCorrect / (b.timesCorrect + b.timesIncorrect) || 0;
          return aRate - bRate;
        });
      case 'recent':
        return [...filtered];
      default:
        return filtered;
    }
  };

  // Due flashcards for spaced repetition
  const getDueFlashcards = () => {
    const now = new Date();
    return flashcards.filter(card => card.nextReview <= now);
  };

  if (!isOpen) return null;

  const sortedFlashcards = getSortedFlashcards();
  const currentCard = currentCardIndex < flashcards.length ? flashcards[currentCardIndex] : null;
  const progress = calculateProgress();
  const dueCards = getDueFlashcards();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 overflow-auto">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <Sparkles className="h-5 w-5 text-indigo-500 mr-2" />
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
              Flashcards: {title}
            </h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="study">Study Cards</TabsTrigger>
                <TabsTrigger value="manage">Manage Cards</TabsTrigger>
              </TabsList>
            </div>
            
            {/* Study Tab */}
            <TabsContent value="study" className="flex-1">
              <div className="p-4 md:p-6 flex flex-col items-center">
                {isGenerating ? (
                  <div className="flex flex-col items-center justify-center p-10">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">
                      Generating flashcards from your material...
                    </p>
                  </div>
                ) : flashcards.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-10">
                    <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      No flashcards found in this document.
                    </p>
                    <Button onClick={addNewCard}>Create a Flashcard</Button>
                  </div>
                ) : (
                  <>
                    {/* Study Mode Options */}
                    <div className="w-full max-w-lg flex justify-end mb-4">
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="study-mode" 
                          checked={studyMode === 'spaced'}
                          onCheckedChange={(checked) => setStudyMode(checked ? 'spaced' : 'regular')}
                        />
                        <Label htmlFor="study-mode" className="text-sm">
                          Spaced Repetition
                        </Label>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full max-w-lg mb-6">
                      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                        <span>Progress</span>
                        <span>Card {currentCardIndex + 1} of {sortedFlashcards.length}</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                    
                    {/* Flashcard */}
                    {currentCard && (
                      <div className="w-full max-w-lg">
                        <div 
                          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 md:p-8 h-64 md:h-80 flex flex-col cursor-pointer transition-all duration-300 ease-in-out transform perspective-1000"
                          onClick={toggleShowAnswer}
                          style={{ 
                            transformStyle: 'preserve-3d',
                            transform: isShowingAnswer ? 'rotateY(180deg)' : 'rotateY(0deg)'
                          }}
                        >
                          {/* Card Front */}
                          <div 
                            className="absolute inset-0 backface-hidden flex flex-col justify-center items-center p-6 text-center"
                            style={{ backfaceVisibility: 'hidden' }}
                          >
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                              TERM
                            </div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                              {currentCard.term}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-6">
                              Tap to show definition
                            </div>
                          </div>
                          
                          {/* Card Back */}
                          <div 
                            className="absolute inset-0 backface-hidden flex flex-col justify-center items-center p-6 text-center rotate-y-180"
                            style={{ 
                              backfaceVisibility: 'hidden',
                              transform: 'rotateY(180deg)'
                            }}
                          >
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                              DEFINITION
                            </div>
                            <div className="text-lg text-gray-900 dark:text-gray-100 overflow-auto">
                              {currentCard.definition}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-6">
                              Tap to show term
                            </div>
                          </div>
                        </div>
                        
                        {/* Navigation and Controls */}
                        <div className="flex justify-between mt-6">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={goToPrevCard}
                            className="flex items-center"
                          >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Previous
                          </Button>
                          
                          <div className="flex gap-2">
                            {isShowingAnswer && (
                              <>
                                <Button 
                                  variant="outline"
                                  className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-900 dark:hover:bg-red-900/20"
                                  size="sm"
                                  onClick={markIncorrect}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Incorrect
                                </Button>
                                <Button 
                                  variant="outline"
                                  className="text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-900 dark:hover:bg-green-900/20"
                                  size="sm"
                                  onClick={markCorrect}
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Correct
                                </Button>
                              </>
                            )}
                          </div>
                          
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={goToNextCard}
                            className="flex items-center"
                          >
                            Next
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* Additional Controls */}
                    <div className="flex justify-center gap-4 mt-8">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={shuffleCards}
                        className="flex items-center"
                      >
                        <Shuffle className="h-4 w-4 mr-1" />
                        Shuffle
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={startEditing}
                        className="flex items-center"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit Card
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={extractFlashcards}
                        className="flex items-center"
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Regenerate
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>
            
            {/* Manage Tab */}
            <TabsContent value="manage" className="flex-1">
              <div className="p-4 md:p-6">
                {/* Search and Sort */}
                <div className="flex flex-col sm:flex-row gap-2 mb-4">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search cards..."
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 pl-8 text-sm"
                    />
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 absolute left-2.5 top-2.5 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  
                  <select
                    value={sortType}
                    onChange={(e) => setSortType(e.target.value as any)}
                    className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md p-2 text-sm"
                  >
                    <option value="alphabetical">Sort: A-Z</option>
                    <option value="difficulty">Sort: Difficulty</option>
                    <option value="recent">Sort: Recent</option>
                  </select>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={addNewCard}
                    className="flex-shrink-0"
                  >
                    Add Card
                  </Button>
                </div>
                
                {isGenerating ? (
                  <div className="flex justify-center p-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                  </div>
                ) : sortedFlashcards.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-gray-500 dark:text-gray-400">
                      No flashcards found. Add a new card or regenerate from the document.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sortedFlashcards.map((card, index) => (
                      <div 
                        key={card.id}
                        className={`p-3 border rounded-md flex justify-between items-center ${
                          currentCardIndex === flashcards.indexOf(card) 
                            ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20' 
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                        onClick={() => setCurrentCardIndex(flashcards.indexOf(card))}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{card.term}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                            {card.definition.substring(0, 80)}...
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          {card.timesCorrect + card.timesIncorrect > 0 && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mr-2">
                              {Math.round((card.timesCorrect / (card.timesCorrect + card.timesIncorrect)) * 100)}%
                            </div>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentCardIndex(flashcards.indexOf(card));
                              startEditing();
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {flashcards.length} cards total • 
            {studyMode === 'spaced' && dueCards.length > 0 && (
              <span className="ml-1">{dueCards.length} due today</span>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={downloadFlashcards}
              className="flex items-center"
            >
              <Download className="h-4 w-4 mr-1" />
              Export Cards
            </Button>
            
            <Button
              size="sm"
              onClick={onClose}
            >
              Done
            </Button>
          </div>
        </div>
        
        {/* Edit Modal */}
        {isEditing && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full shadow-xl">
              <h3 className="text-lg font-medium mb-4 text-gray-800 dark:text-gray-200">
                Edit Flashcard
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Term
                  </label>
                  <Input
                    value={editedTerm}
                    onChange={(e) => setEditedTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Definition
                  </label>
                  <Textarea
                    value={editedDefinition}
                    onChange={(e) => setEditedDefinition(e.target.value)}
                    className="w-full min-h-[100px]"
                  />
                </div>
                
                <div className="pt-2 flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={cancelEdit}
                  >
                    Cancel
                  </Button>
                  <Button onClick={saveEdit}>
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* CSS for card flipping effects */}
      <style jsx global>{`
        .backface-hidden {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        
        .perspective-1000 {
          perspective: 1000px;
        }
        
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
};

export default FlashcardGenerator;