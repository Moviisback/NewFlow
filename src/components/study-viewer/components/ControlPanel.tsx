// src/components/study-viewer/components/ControlPanel.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  X,
  List,
  Info,
  Search,
  BookOpen,
  Highlighter,
  MessageSquare,
  MousePointer,
  Moon,
  Sun,
  AlignJustify,
  TextCursor,
  Columns,
  HelpCircle,
  Maximize,
  Minimize,
  Keyboard,
  BookOpenCheck,
  ChevronUp
} from 'lucide-react';

// Updated props interface to include optional extra controls slot
interface ControlPanelProps {
  title: string;
  format?: string;
  viewMode: string;
  setViewMode: (mode: any) => void;
  showLeftSidebar: boolean;
  setShowLeftSidebar: (show: boolean) => void;
  showRightSidebar: boolean;
  setShowRightSidebar: (show: boolean) => void;
  onClose: () => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  toggleSearch: () => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  textDensity: string;
  toggleTextDensity: () => void;
  highlightColor: string;
  setHighlightColor: (color: any) => void;
  showKeyboardShortcuts: () => void;
  toggleQuickQuiz: () => void;
  enterFocusMode: () => void;
  exitFocusMode: () => void;
  showControlPanel: boolean;
  setShowControlPanel: (show: boolean) => void;
  readingProgress: number;
  extraControls?: React.ReactNode; // New prop for extra controls like document view selector
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  title,
  format,
  viewMode,
  setViewMode,
  showLeftSidebar,
  setShowLeftSidebar,
  showRightSidebar,
  setShowRightSidebar,
  onClose,
  isFullscreen,
  toggleFullscreen,
  isDarkMode,
  toggleDarkMode,
  toggleSearch,
  fontSize,
  setFontSize,
  textDensity,
  toggleTextDensity,
  highlightColor,
  setHighlightColor,
  showKeyboardShortcuts,
  toggleQuickQuiz,
  enterFocusMode,
  exitFocusMode,
  showControlPanel,
  setShowControlPanel,
  readingProgress,
  extraControls
}) => {
  return (
    <>
      {/* Top Toolbar */}
      <div className={`${showControlPanel ? 'flex' : 'hidden'} flex-col bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700`}>
        <div className="flex items-center justify-between p-2">
          <div className="flex items-center gap-2">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="h-8 w-8 p-0 rounded-full"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Close (Esc)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* Toolbar group: Sidebar controls */}
            <div className="flex items-center gap-1 bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowLeftSidebar(!showLeftSidebar)}
                      className={`h-8 w-8 p-0 rounded-full ${showLeftSidebar ? 'bg-gray-300 dark:bg-gray-600' : ''}`}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Toggle Table of Contents (T)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowRightSidebar(!showRightSidebar)}
                      className={`h-8 w-8 p-0 rounded-full ${showRightSidebar ? 'bg-gray-300 dark:bg-gray-600' : ''}`}
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Toggle Info Panel (I)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <Separator orientation="vertical" className="h-6 mx-1" />
            
            {/* Toolbar group: View mode */}
            <div className="hidden sm:flex items-center gap-1 bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewMode('read')}
                      className={`h-8 w-8 p-0 rounded-full ${viewMode === 'read' ? 'bg-gray-300 dark:bg-gray-600' : ''}`}
                    >
                      <BookOpen className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Read Mode</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewMode('highlight')}
                      className={`h-8 w-8 p-0 rounded-full ${viewMode === 'highlight' ? 'bg-gray-300 dark:bg-gray-600' : ''}`}
                    >
                      <Highlighter className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Highlight Mode (H) - Select text to highlight</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewMode('note')}
                      className={`h-8 w-8 p-0 rounded-full ${viewMode === 'note' ? 'bg-gray-300 dark:bg-gray-600' : ''}`}
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Note Mode (N)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={viewMode === 'focus' ? exitFocusMode : enterFocusMode}
                      className={`h-8 w-8 p-0 rounded-full ${viewMode === 'focus' ? 'bg-gray-300 dark:bg-gray-600' : ''}`}
                    >
                      <MousePointer className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Focus Mode (Z) - Highlight active paragraph</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            {/* Highlight color selector (only shown in highlight mode) */}
            {viewMode === 'highlight' && (
              <DropdownMenu>
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 px-2 text-xs flex items-center gap-1.5"
                        >
                          <div className={`w-3 h-3 rounded-full ${
                            highlightColor === 'yellow' ? 'bg-yellow-300' :
                            highlightColor === 'green' ? 'bg-green-300' :
                            highlightColor === 'blue' ? 'bg-blue-300' :
                            'bg-pink-300'
                          }`} />
                          Color
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Choose highlight color</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <DropdownMenuContent align="end" className="w-32">
                  <DropdownMenuItem onClick={() => setHighlightColor('yellow')} className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-yellow-300 mr-2" />
                    Yellow
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setHighlightColor('green')} className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-green-300 mr-2" />
                    Green
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setHighlightColor('blue')} className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-blue-300 mr-2" />
                    Blue
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setHighlightColor('pink')} className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-pink-300 mr-2" />
                    Pink
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            <Separator orientation="vertical" className="h-6 mx-1" />
            
            {/* Search button */}
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleSearch}
                    className="h-8 text-sm font-medium flex items-center gap-1.5 rounded-md"
                  >
                    <Search className="h-4 w-4" />
                    <span className="hidden sm:block">Search</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Search in document (Ctrl+F)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <div className="flex items-center gap-2">
            {/* NEW: Document View Selector (if provided) */}
            {extraControls && (
              <div className="mx-2">
                {extraControls}
              </div>
            )}
            
            {/* Text formatting options */}
            <div className="hidden md:flex items-center gap-1 bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleTextDensity}
                      className="h-8 w-8 p-0 rounded-full"
                      title="Text Density"
                    >
                      {textDensity === 'comfortable' ? (
                        <AlignJustify className="h-4 w-4" />
                      ) : (
                        <Columns className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{textDensity === 'comfortable' ? 'Comfortable' : 'Compact'} Text Density</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 px-2">
                      <TextCursor className="h-3 w-3 text-gray-500" />
                      <Slider
                        value={[fontSize]}
                        min={12}
                        max={24}
                        step={1}
                        onValueChange={(value) => setFontSize(value[0])}
                        className="w-24 h-2"
                      />
                      <span className="text-xs text-gray-500">{fontSize}px</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Adjust font size</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            {/* Format badge */}
            {format && (
              <div className="hidden sm:flex items-center">
                <BookOpenCheck className="h-3.5 w-3.5 text-blue-500 mr-1" />
                <span className="text-xs text-blue-700 dark:text-blue-300">{format}</span>
              </div>
            )}
            
            {/* Quick quiz button */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleQuickQuiz}
              className="h-8 px-2 text-xs hidden sm:flex items-center gap-1.5"
            >
              <HelpCircle className="h-4 w-4 text-amber-500" />
              <span>Quiz</span>
            </Button>
            
            {/* Toolbar group: Settings */}
            <div className="flex items-center gap-1 bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleDarkMode}
                      className="h-8 w-8 p-0 rounded-full"
                    >
                      {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Toggle Dark Mode (Ctrl+D)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={showKeyboardShortcuts}
                      className="h-8 w-8 p-0 rounded-full"
                    >
                      <Keyboard className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Keyboard Shortcuts (?)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleFullscreen}
                      className="h-8 w-8 p-0 rounded-full"
                    >
                      {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isFullscreen ? 'Exit' : 'Enter'} Fullscreen (F)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
        
        {/* Reading Progress Bar */}
        <div className="relative h-2 w-full bg-gray-200 dark:bg-gray-700">
          <div 
            className="absolute h-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-300 ease-out"
            style={{ width: `${readingProgress}%` }} 
          />
          <div className="absolute top-3 right-3 text-xs text-gray-500 dark:text-gray-400">
            {readingProgress <= 0 ? "Starting to read..." : 
             readingProgress < 25 ? "Just beginning..." : 
             readingProgress < 50 ? "Making progress" : 
             readingProgress < 75 ? "Halfway through" : 
             readingProgress < 100 ? "Almost there" : 
             "Reading complete"}
          </div>
        </div>
      </div>
      
      {/* Collapsible Control Panel Button */}
      <div className="absolute top-2 right-1/2 translate-x-1/2 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowControlPanel(!showControlPanel)}
          className={`h-6 w-12 p-0 rounded-full bg-gray-200 dark:bg-gray-700 shadow-md flex items-center justify-center ${
            !showControlPanel ? 'opacity-60 hover:opacity-100' : ''
          }`}
        >
          <ChevronUp className={`h-4 w-4 transition-transform ${!showControlPanel ? 'rotate-180' : ''}`} />
        </Button>
      </div>
    </>
  );
};

export default ControlPanel;