// components/documents/DocumentSummaryContent.tsx
import React, { useState, useEffect } from 'react';
import { Download, BookOpen, Check, BookOpenCheck, Maximize2, Info, Lightbulb, AlertTriangle, PenTool, BookMarked } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from '@/components/ui/textarea';
import { getFileTypeKey } from './colorUtils';
import { SummaryMeta } from './types';
import dynamic from 'next/dynamic';
import { downloadContent } from './fileHelpers';
import { extractTableOfContents, extractKeyInformation } from '@/components/study-viewer';

// Define interfaces for processed content
interface SidebarItem {
  type: string;
  content: string;
  title?: string;
}

interface TableOfContentsItem {
  title: string;
  level: number;
  id: string;
}

interface ProcessedContent {
  mainContent: string;
  sidebarContent: SidebarItem[];
  tableOfContents: TableOfContentsItem[];
}

// Dynamically import the FullscreenStudyViewer to avoid server-side rendering issues
const FullscreenStudyViewer = dynamic(() => import('../study-viewer/FullscreenStudyViewer'), { ssr: false });

export interface DocumentSummaryContentProps {
  title: string;
  date?: string;
  summary: string;
  isValidated?: boolean;
  file?: File | null;
  summaryMeta?: SummaryMeta | null;
  format?: string;
  onViewInLibrary?: () => void;
  onEditSettings?: () => void;
  originalContent?: string;
}

const DocumentSummaryContent: React.FC<DocumentSummaryContentProps> = ({
  title,
  date,
  summary,
  isValidated = false,
  file = null,
  summaryMeta = null,
  format,
  onViewInLibrary,
  onEditSettings,
  originalContent = ''
}) => {
  // State for storing processed content
  const [processedContent, setProcessedContent] = useState<ProcessedContent>({
    mainContent: '',
    sidebarContent: [],
    tableOfContents: []
  });

  // State for fullscreen viewer
  const [isFullscreenViewerOpen, setIsFullscreenViewerOpen] = useState<boolean>(false);
  
  // Use the extracted table of contents and key information for simple view
  const extractedTableOfContents = extractTableOfContents(summary);
  const extractedKeyInformation = extractKeyInformation(summary);

  // Log if original content is received
  useEffect(() => {
    console.log("DocumentSummaryContent received originalContent:", 
                originalContent ? `${originalContent.length} chars` : 'none');
  }, [originalContent]);

  // Process summary when it changes
  useEffect(() => {
    if (summary) {
      setProcessedContent(formatStudyContent(summary));
    }
  }, [summary]);

  // Handle download
  const handleDownload = () => {
    // Create filename based on original file or title
    const baseFilename = file?.name ? file.name.replace(/\.[^/.]+$/, "") : (title || 'document_summary');
    const filenameWithFormat = `${baseFilename}${format ? ` (${format})` : ''}`;

    // Use the downloaded content helper
    downloadContent(summary, filenameWithFormat, 'pdf');
  };

  // Format study material with enhanced textbook styling
  function formatStudyContent(text: string): ProcessedContent {
    if (!text) return { mainContent: '', sidebarContent: [], tableOfContents: [] };

    const sidebarContent: SidebarItem[] = [];
    const tableOfContents: TableOfContentsItem[] = [];
    let mainContentText = text;

    // 1. Extract learning objectives
    const learningObjectivesMatch = text.match(/\[LEARNING_OBJECTIVES\]([\s\S]*?)(?=\[|\n\s*\n|$)/i);
    if (learningObjectivesMatch && learningObjectivesMatch[1]) {
      sidebarContent.push({
        type: 'objectives',
        content: learningObjectivesMatch[1].trim()
      });
      mainContentText = mainContentText.replace(learningObjectivesMatch[0], '');
    }

    // 2. Extract definition sections [DEFINITION]...[/DEFINITION]
    const definitionRegex = /\[DEFINITION\]([\s\S]*?)\[\/DEFINITION\]/gi;
    let definitionMatch;
    while ((definitionMatch = definitionRegex.exec(text)) !== null) {
      if (definitionMatch && definitionMatch[1]) {
        const defContent = definitionMatch[1].trim();
        const titleMatch = defContent.match(/\*\*(.*?)\*\*/);
        const title = titleMatch ? titleMatch[1] : 'Definition';

        sidebarContent.push({
          type: 'definition',
          title: title,
          content: defContent
        });
        mainContentText = mainContentText.replace(definitionMatch[0], '');
      }
    }

    // 3. Extract key concepts to add to sidebar
    const keyConceptRegex = /\*\*([\w\s-]+)\*\*:\s*((?:[^*]|(?:\*(?!\*)))+)/g;
    let conceptMatch;
    while ((conceptMatch = keyConceptRegex.exec(text)) !== null) {
      if (conceptMatch && conceptMatch[1] && conceptMatch[2]) {
        sidebarContent.push({
          type: 'concept',
          title: conceptMatch[1].trim(),
          content: conceptMatch[2].trim()
        });
      }
    }

    const lines = mainContentText.split('\n');
    let processedLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('# ') || line.startsWith('## ') || line.startsWith('### ')) {
        const level = (line.match(/^#+/) || [''])[0].length;
        const title = line.replace(/^#+\s+/, '');
        const id = `section-${title.toLowerCase().replace(/[^\w]+/g, '-')}`;
        tableOfContents.push({ title, level, id });
        if (line.startsWith('# ')) {
          processedLines.push(`<h1 id="${id}" class="text-2xl font-bold mt-8 mb-4 text-gray-800 dark:text-gray-100 pb-2 border-b border-gray-200 dark:border-gray-700">${title}</h1>`);
        } else if (line.startsWith('## ')) {
          processedLines.push(`<h2 id="${id}" class="text-xl font-semibold mt-6 mb-3 text-indigo-700 dark:text-indigo-400">${title}</h2>`);
        } else if (line.startsWith('### ')) {
          processedLines.push(`<h3 id="${id}" class="text-lg font-medium mt-5 mb-2 text-gray-800 dark:text-gray-200">${title}</h3>`);
        }
      } else {
        processedLines.push(formatTextLine(line));
      }
    }

    let mainContentHtml = processedLines.join('');
    const caseStudyRegex = /\[CASE_STUDY\]([\s\S]*?)\[\/CASE_STUDY\]/gi;
    mainContentHtml = mainContentHtml.replace(caseStudyRegex, (match: string, caseContent: string) => {
      return `<div class="my-6 p-4 bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 dark:border-blue-700 rounded-lg shadow-sm"><div class="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-semibold mb-2"><BookMarked class="h-5 w-5" /> <h4 class="text-lg">Case Study</h4></div> ${formatTextContent(caseContent.trim())}</div>`;
    });
    const pullQuoteRegex = /\[PULL_QUOTE\]([\s\S]*?)\[\/PULL_QUOTE\]/gi;
    mainContentHtml = mainContentHtml.replace(pullQuoteRegex, (match: string, quoteContent: string) => {
      return `<blockquote class="my-6 px-4 py-3 border-l-4 border-indigo-500 italic text-lg text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-r-lg shadow-sm">${quoteContent.trim()}</blockquote>`;
    });
    const discussionRegex = /\[DISCUSSION_PROMPT\]([\s\S]*?)\[\/DISCUSSION_PROMPT\]/gi;
    mainContentHtml = mainContentHtml.replace(discussionRegex, (match: string, promptContent: string) => {
      return `<div class="my-6 p-4 bg-purple-50 dark:bg-purple-900/30 border-l-4 border-purple-500 dark:border-purple-700 rounded-lg shadow-sm"><div class="flex items-center gap-2 text-purple-700 dark:text-purple-400 font-semibold mb-2"><PenTool class="h-5 w-5" /> <h4 class="text-lg">Discussion Prompt</h4></div> ${formatTextContent(promptContent.trim())}</div>`;
    });
    const activeLearningRegex = /\[ACTIVE_LEARNING\]([\s\S]*?)\[\/ACTIVE_LEARNING\]/gi;
    mainContentHtml = mainContentHtml.replace(activeLearningRegex, (match: string, content: string) => {
      return `<div class="my-6 p-4 bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500 dark:border-green-700 rounded-lg shadow-sm"><div class="flex items-center gap-2 text-green-700 dark:text-green-400 font-semibold mb-2"><Lightbulb class="h-5 w-5" /> <h4 class="text-lg">Active Learning Exercise</h4></div> ${formatTextContent(content.trim())} <div class="flex justify-end mt-3"><button class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm font-medium">Check Your Understanding</button></div></div>`;
    });
    const importantNoteRegex = /\[IMPORTANT_NOTE\]([\s\S]*?)\[\/IMPORTANT_NOTE\]/gi;
    mainContentHtml = mainContentHtml.replace(importantNoteRegex, (match: string, content: string) => {
      return `<div class="my-6 p-4 bg-amber-50 dark:bg-amber-900/30 border-l-4 border-amber-500 dark:border-amber-700 rounded-lg shadow-sm"><div class="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold mb-2"><AlertTriangle class="h-5 w-5" /> <h4 class="text-lg">Important Note</h4></div> ${formatTextContent(content.trim())}</div>`;
    });
    const exampleRegex = /\[EXAMPLE\]([\s\S]*?)\[\/EXAMPLE\]/gi;
    mainContentHtml = mainContentHtml.replace(exampleRegex, (match: string, content: string) => {
      return `<div class="my-6 p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm"><div class="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-semibold mb-2"><span class="inline-flex items-center justify-center p-1 bg-gray-200 dark:bg-gray-700 rounded-full"><span class="text-xs font-bold">Ex</span></span> <h4 class="text-base">Example</h4></div> ${formatTextContent(content.trim())}</div>`;
    });

    mainContentHtml = processLists(mainContentHtml);
    mainContentHtml = processTables(mainContentHtml);

    return {
      mainContent: mainContentHtml,
      sidebarContent: sidebarContent,
      tableOfContents: tableOfContents
    };
  }

  function formatTextLine(line: string): string {
    if (line.startsWith('*') && line.endsWith('*') && !line.startsWith('**')) {
      return `<p class="text-gray-600 dark:text-gray-400 italic mb-4">${line.substring(1, line.length-1)}</p>`;
    }
    else if (line.includes('|') && line.trim().startsWith('|')) {
      return line;
    }
    else if (line.trim().match(/^\* (?:🔍|🔗|✏️|🌐)/)) {
      const match = line.trim().match(/^\* ((?:🔍|🔗|✏️|🌐))/);
      const emoji = match ? match[1] : '';
      const content = line.trim().substring(3);
      return `<li class="ml-6 mb-2 flex items-start"><span class="mr-2 mt-0.5">${emoji}</span>${content}</li>`;
    }
    else if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
      return `<li class="ml-6 mb-2">${line.trim().substring(2)}</li>`;
    }
    else if (line.trim().match(/^\d+\.\s/)) {
      return `<li class="ml-6 mb-2 list-decimal">${line.trim().substring(line.trim().indexOf('.')+1)}</li>`;
    }
    else if (line.includes('**')) {
      const enhancedLine = line.replace(/\*\*(.*?)\*\*/g, (match, term) => {
        return `<span class="group relative inline-block"><strong class="text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1 rounded cursor-help">${term}</strong><span class="invisible group-hover:visible absolute z-10 bottom-full mb-2 w-56 p-2 bg-white dark:bg-gray-800 rounded shadow-lg border border-gray-200 dark:border-gray-700 text-sm"><strong class="block text-indigo-600 dark:text-indigo-400 mb-1">Study tip:</strong> <span class="text-gray-700 dark:text-gray-300">Create a flashcard for this key term.</span></span></span>`;
      });
      return `<p class="mb-4 leading-relaxed text-gray-700 dark:text-gray-300">${enhancedLine}</p>`;
    }
    else if (line.trim()) {
      const defMatch = line.match(/([A-Z][a-zA-Z0-9\s]+):\s*(.*)/);
      if (defMatch && defMatch[1].length < 50) { // Likely a definition
        return `<p class="mb-4 leading-relaxed text-gray-700 dark:text-gray-300"><span class="font-semibold text-gray-800 dark:text-gray-200">${defMatch[1]}:</span> ${defMatch[2]}</p>`;
      }
      return `<p class="mb-4 leading-relaxed text-gray-700 dark:text-gray-300">${line}</p>`;
    }
    else {
      return '<div class="h-2"></div>';
    }
  }

  function processLists(html: string): string {
    return html
      .replace(/<li class="ml-6 mb-2.*?">(.*?)<\/li>(\s*<li class="ml-6 mb-2.*?">.*?<\/li>)+/g, (match: string) =>
        `<ul class="list-disc mb-4">${match}</ul>`
      )
      .replace(/<li class="ml-6 mb-2 list-decimal">(.*?)<\/li>(\s*<li class="ml-6 mb-2 list-decimal">.*?<\/li>)+/g, (match: string) =>
        `<ol class="list-decimal mb-4">${match}</ol>`
      );
  }

  function processTables(html: string): string {
    const tableRows: string[] = [];
    const lines = html.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('|') && line.trim().startsWith('|')) {
        if (line.includes('---')) { continue; }
        const cells = line.split('|').slice(1, -1);
        if (cells.length === 0) continue;
        const isHeader = cells.some(cell => cell.includes('**')) || line.trim().startsWith('| Year') || line.trim().startsWith('| Feature');
        const cellsHtml = cells.map(cell => {
          const content = cell.replace(/\*\*/g, '').trim();
          return isHeader
            ? `<th class="border dark:border-gray-700 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 font-semibold">${content}</th>`
            : `<td class="border dark:border-gray-700 px-4 py-2">${content}</td>`;
        }).join('');
        tableRows.push(isHeader
          ? `<tr>${cellsHtml}</tr><tr><td colspan="${cells.length}" class="h-px bg-indigo-100 dark:bg-indigo-900/30"></td></tr>`
          : `<tr>${cellsHtml}</tr>`);
      }
    }
    let result = html;
    if (tableRows.length > 0) {
      const tableHtml = `<div class="my-6 overflow-x-auto rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"><table class="w-full border-collapse">${tableRows.join('')}</table></div>`;
      result = result.replace(/^.*\|.*$\n?/gm, '');
      if (result.includes('</h2>')) {
        result = result.replace('</h2>', '</h2>' + tableHtml);
      } else {
        result = tableHtml + result;
      }
    }
    return result;
  }

  function formatTextContent(text: string): string {
    return text.split('\n').map(formatTextLine).join('');
  }

  const renderSidebarItem = (item: SidebarItem, index: number) => {
    if (item.type === 'objectives') {
      return (
        <div key={`objective-${index}`} className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-400 dark:border-green-600 rounded-lg shadow-sm">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium mb-2"><Lightbulb className="h-5 w-5" /><h4>Learning Objectives</h4></div>
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
            {item.content.split('\n').map((line: string, i: number) => (line.trim().startsWith('-') && <li key={i} className="ml-2">{line.trim().substring(1)}</li>))}
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
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-medium mb-2"><Info className="h-5 w-5" /><h4>Key Concept</h4></div>
          <p className="text-sm text-gray-700 dark:text-gray-300"><strong className="text-amber-700 dark:text-amber-400 hover:underline cursor-pointer" title="Click to highlight in text">{item.title}:</strong> {item.content}</p>
          <div className="mt-2 text-xs text-amber-600 dark:text-amber-400"><button className="flex items-center hover:underline"><Lightbulb className="h-3 w-3 mr-1" />Study this concept</button></div>
        </div>
      );
    }
    return null;
  };

  // Use a simplified view with textarea for basic display
  const renderBasicView = () => (
    <Card className="shadow-md rounded-t-none border-t-0">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-100">{title}</CardTitle>
          {isValidated && (
            <Badge variant="outline" className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800 flex items-center gap-1.5 px-2 py-0.5">
              <Check className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Validated</span>
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs text-gray-500 dark:text-gray-400 pt-1">
          {date && `Created: ${date}`}
          {format && ` | Format: ${format}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Textarea
          value={summary}
          readOnly
          className="min-h-[300px] sm:min-h-[400px] bg-gray-50 dark:bg-gray-800 focus:ring-0 focus:outline-none border border-gray-200 dark:border-gray-700 rounded-md whitespace-pre-wrap p-4 text-sm dark:text-gray-200"
          aria-label="Generated study material content"
        />
      </CardContent>
      <CardFooter className="flex justify-between gap-3">
        <Button 
          variant="outline" 
          onClick={() => setIsFullscreenViewerOpen(true)}
          className="flex items-center gap-2"
        >
          <BookOpen size={16} /> Open in Fullscreen
        </Button>
        <div className="flex gap-2">
          {onViewInLibrary && (
            <Button 
              variant="default"
              onClick={onViewInLibrary}
              className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600 text-white flex items-center gap-2"
            >
              <BookOpen size={16} /> Save to Library
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={handleDownload}
            className="flex items-center gap-2"
          >
            <Download size={16} /> Download
          </Button>
        </div>
      </CardFooter>
    </Card>
  );

  // Use enhanced view with formatted content
  const renderEnhancedView = () => (
    <Card className="shadow-md rounded-t-none border-t-0">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-xl font-bold text-gray-800 dark:text-gray-100">
            {title || 'Generated Study Material'}
          </CardTitle>
          <div className="flex items-center gap-2">
            {isValidated && (
              <Badge variant="outline" className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700 flex items-center gap-1.5 px-2 py-0.5">
                <Check className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Validated</span>
              </Badge>
            )}
            {format && (
              <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 flex items-center gap-1.5 px-2 py-0.5">
                <BookOpenCheck className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">{format}</span>
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreenViewerOpen(true)}
              className="h-7 px-2 rounded-md"
              title="Enhanced Reading Mode"
            >
              <Maximize2 size={14} className="mr-1" />
              <span className="text-xs">Read</span>
            </Button>
          </div>
        </div>
        <CardDescription className="text-xs text-gray-500 dark:text-gray-400 pt-1 flex flex-col gap-1">
          {date && <span>Created: {date}</span>}
          {file && <span>Source: {file.name}</span>}
          {summaryMeta?.wasContentTruncated && (
            <span className="text-amber-600 dark:text-amber-400 font-medium">
              Note: Document content may have been truncated due to size limits.
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row">
          <div className="md:w-3/4">
            <ScrollArea className="h-[500px] border-r border-b border-gray-200 dark:border-gray-700">
              <div
                className="px-6 py-4 text-sm leading-relaxed text-gray-700 dark:text-gray-300 study-content"
                dangerouslySetInnerHTML={{ __html: processedContent.mainContent }}
              />
            </ScrollArea>
          </div>
          <div className="md:w-1/4 border-t md:border-t-0 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <ScrollArea className="h-[500px]">
              <div className="p-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                  Key Information
                </h3>
                {processedContent.sidebarContent.length > 0 ? (
                  processedContent.sidebarContent.map((item, index) => renderSidebarItem(item, index))
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">No additional information available.</p>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between flex-wrap gap-3 border-t border-gray-200 dark:border-gray-700 mt-0">
        <Button
          variant="outline"
          onClick={handleDownload}
          className="flex items-center gap-2"
        >
          <Download size={16} /> Download
        </Button>
        {onViewInLibrary && (
          <Button
            onClick={onViewInLibrary}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600"
          >
            <BookOpen size={16} /> View in Library
          </Button>
        )}
      </CardFooter>
    </Card>
  );

  return (
    <>
      {/* Determine which view to use based on content complexity */}
      {processedContent.mainContent ? renderEnhancedView() : renderBasicView()}

      {/* Fullscreen Study Viewer */}
      {isFullscreenViewerOpen && (
        <FullscreenStudyViewer
          isOpen={isFullscreenViewerOpen}
          onClose={() => setIsFullscreenViewerOpen(false)}
          title={title}
          date={date}
          summary={summary}
          originalContent={originalContent} // Pass the original content to the viewer
          isValidated={isValidated}
          format={format}
          tableOfContents={processedContent.tableOfContents.length > 0 
            ? processedContent.tableOfContents 
            : extractedTableOfContents}
          keyInformation={processedContent.sidebarContent.length > 0 
            ? processedContent.sidebarContent 
            : extractedKeyInformation}
          onDownload={handleDownload}
          onViewInLibrary={onViewInLibrary}
          onEditSettings={onEditSettings}
        />
      )}

      <style jsx global>{`
        .key-term {
          position: relative;
          display: inline-block;
          cursor: help;
        }
        .study-content p {
          line-height: 1.8;
        }
        @media (max-width: 768px) {
          .study-content p {
            line-height: 1.6;
          }
        }
        .key-term .tooltip {
          visibility: hidden;
          position: absolute;
          z-index: 10;
          bottom: 125%;
          left: 50%;
          transform: translateX(-50%);
          background-color: white;
          color: black;
          border-radius: 6px;
          padding: 8px 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          width: 220px;
          transition: visibility 0s, opacity 0.3s;
          opacity: 0;
        }
        .key-term:hover .tooltip {
          visibility: visible;
          opacity: 1;
        }
        .dark .key-term .tooltip {
          background-color: #2d3748;
          color: #e2e8f0;
        }
        .highlight-text {
          background-image: linear-gradient(to right, rgba(99, 102, 241, 0) 50%, rgba(99, 102, 241, 0.2) 50%);
          background-position: 0;
          background-size: 200%;
          transition: background-position 0.5s;
        }
        .highlight-text.active,
        .highlight-text:hover {
          background-position: -100%;
        }
      `}</style>
    </>
  );
};

export default DocumentSummaryContent;