// src/components/study-viewer/components/InfoSidebar.tsx
import React from 'react';
import { InfoSidebarProps, SidebarItem } from '../types';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronRight, Info, Lightbulb, BookmarkCheck, BookmarkPlus, MessageSquare, Zap, LayoutDashboard, Highlighter, HelpCircle, Sparkles, BookMarked, Clock } from 'lucide-react';

const InfoSidebar: React.FC<InfoSidebarProps> = ({
  keyInformation,
  bookmarks,
  userNotes,
  highlights,
  rightSidebarTab,
  setRightSidebarTab,
  scrollToSection,
  highlightKeyConceptInContent,
  readingProgress,
  tableOfContents,
  setViewMode,
  setShowRightSidebar,
  toggleQuickQuiz
}) => {
  // Render sidebar content for key information
  const renderSidebarItem = (item: SidebarItem, index: number) => {
    if (item.type === 'objectives') {
      return (
        <div key={`objective-${index}`} className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-400 dark:border-green-600 rounded-lg shadow-sm">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium mb-2">
            <Lightbulb className="h-5 w-5" />
            <h4>Learning Objectives</h4>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
            {item.content.split('\n').map((line: string, i: number) => (
              line.trim().startsWith('-') && 
              <li key={i} className="ml-2">{line.trim().substring(1)}</li>
            ))}
          </ul>
        </div>
      );
    } else if (item.type === 'definition') {
      return (
        <div key={`definition-${index}`} className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 dark:border-blue-600 rounded-lg shadow-sm">
          <div className="font-medium text-blue-700 dark:text-blue-400 mb-1">{item.title || 'Definition'}</div>
          <p className="text-sm text-gray-700 dark:text-gray-300" dangerouslySetInnerHTML={{ __html: item.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}></p>
        </div>
      );
    } else if (item.type === 'concept') {
      return (
        <div key={`concept-${index}`} className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 dark:border-amber-600 rounded-lg shadow-sm">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-medium mb-2">
            <Info className="h-5 w-5" />
            <h4>Key Concept</h4>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong 
              className="text-amber-700 dark:text-amber-400 hover:underline cursor-pointer" 
              onClick={() => highlightKeyConceptInContent(item.title || '')}
              title="Click to highlight in text"
            >
              {item.title}:
            </strong> {item.content}
          </p>
          <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
            <button className="flex items-center hover:underline">
              <Lightbulb className="h-3 w-3 mr-1" />
              Study this concept
            </button>
          </div>
        </div>
      );
    }
    
    return null;
  };

  // Render study aids tab content
  const renderStudyAidsTab = () => (
    <div className="space-y-4 p-3">
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 p-4 rounded-lg shadow-sm border border-indigo-200 dark:border-indigo-800">
        <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-medium mb-3">
          <Zap className="h-5 w-5" />
          <h4 className="text-base">Quick Study</h4>
        </div>
        <div className="space-y-3">
          <button 
            className="w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
            onClick={toggleQuickQuiz}
          >
            <span className="flex items-center text-sm text-gray-700 dark:text-gray-300">
              <HelpCircle className="h-4 w-4 text-amber-500 mr-2" />
              Practice Quiz
            </span>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </button>
          <button className="w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
            <span className="flex items-center text-sm text-gray-700 dark:text-gray-300">
              <Sparkles className="h-4 w-4 text-purple-500 mr-2" />
              Flashcard Generator
            </span>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </button>
          <button className="w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
            <span className="flex items-center text-sm text-gray-700 dark:text-gray-300">
              <BookMarked className="h-4 w-4 text-blue-500 mr-2" />
              Create Summary
            </span>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      </div>

      {highlights.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium mb-3">
            <Highlighter className="h-5 w-5" />
            <h4 className="text-base">Your Highlights</h4>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {highlights.map((highlight) => (
              <div 
                key={highlight.id}
                className={`p-2 rounded-md text-xs text-gray-700 dark:text-gray-300 ${
                  highlight.color === 'yellow' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-l-2 border-yellow-300' :
                  highlight.color === 'green' ? 'bg-green-50 dark:bg-green-900/20 border-l-2 border-green-300' :
                  highlight.color === 'blue' ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-300' :
                  'bg-pink-50 dark:bg-pink-900/20 border-l-2 border-pink-300'
                }`}
              >
                "{highlight.text}"
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="w-64 flex-shrink-0 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        <Tabs value={rightSidebarTab} onValueChange={(v) => setRightSidebarTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-8">
            <TabsTrigger value="info" className="text-xs py-1">Info</TabsTrigger>
            <TabsTrigger value="bookmarks" className="text-xs py-1">Marks</TabsTrigger>
            <TabsTrigger value="notes" className="text-xs py-1">Notes</TabsTrigger>
            <TabsTrigger value="study-aids" className="text-xs py-1">Study</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowRightSidebar(false)}
          className="h-6 w-6 p-0 rounded-full ml-1 flex-shrink-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-3">
          {/* Key Information Tab */}
          {rightSidebarTab === 'info' && (
            <>
              {keyInformation.length > 0 ? (
                keyInformation.map((item, index) => renderSidebarItem(item, index))
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">No additional information available.</p>
              )}
            </>
          )}
          
          {/* Bookmarks Tab */}
          {rightSidebarTab === 'bookmarks' && (
            <>
              {bookmarks.length > 0 ? (
                <div className="space-y-2">
                  {bookmarks.map((bookmark) => (
                    <button
                      key={bookmark.id}
                      onClick={() => scrollToSection(bookmark.sectionId)}
                      className="w-full text-left p-2 rounded-md text-xs bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2 transition-colors"
                    >
                      <BookmarkCheck className="h-3 w-3 text-indigo-500 flex-shrink-0" />
                      <span className="truncate text-gray-700 dark:text-gray-300">{bookmark.title}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BookmarkPlus className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                    No bookmarks yet. Click the bookmark icon next to a section heading or use the bookmark button in the table of contents.
                  </p>
                </div>
              )}
            </>
          )}
          
          {/* Notes Tab */}
          {rightSidebarTab === 'notes' && (
            <>
              {userNotes.length > 0 ? (
                <div className="space-y-3">
                  {userNotes.map((note) => (
                    <div key={note.id} className="p-3 rounded-md text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                      {note.sectionId && (
                        <div className="mb-1.5 text-indigo-600 dark:text-indigo-400 font-medium text-[11px] flex items-center gap-1">
                          <button 
                            className="hover:underline flex items-center"
                            onClick={() => scrollToSection(note.sectionId!)}
                          >
                            <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                            {tableOfContents.find(t => t.id === note.sectionId)?.title || 'Untitled section'}
                          </button>
                        </div>
                      )}
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{note.text}</p>
                      <div className="mt-2 text-gray-400 dark:text-gray-500 text-[10px]">
                        {note.timestamp.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic mb-2">
                    No notes yet. Add notes to keep track of important information.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setViewMode('note')}
                    className="mx-auto text-xs"
                  >
                    <MessageSquare className="h-3 w-3 mr-1" />
                    Add Note
                  </Button>
                </div>
              )}
              
              {/* Quick Add Note Button */}
              {userNotes.length > 0 && (
                <div className="mt-4 flex justify-center">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setViewMode('note')}
                    className="text-xs"
                  >
                    <MessageSquare className="h-3 w-3 mr-1" />
                    Add Note
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Study Aids Tab */}
          {rightSidebarTab === 'study-aids' && renderStudyAidsTab()}
        </div>
      </div>
    </div>
  );
};

export default InfoSidebar;