// src/components/study-viewer/utils/formatContent.ts

// UTILITY HELPERS (moved to top-level)

// Process basic text formatting with improved styling
function processInlineFormatting(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-gray-900 dark:text-gray-100 font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="text-gray-700 dark:text-gray-300 italic">$1</em>')
    .replace(/~~(.+?)~~/g, '<del class="text-gray-500 dark:text-gray-400">$1</del>')
    .replace(/`(.+?)`/g, '<code class="bg-gray-200/60 dark:bg-gray-700/60 px-1.5 py-0.5 rounded text-xs sm:text-sm font-mono">$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-indigo-600 dark:text-indigo-400 hover:underline font-medium" target="_blank" rel="noopener noreferrer">$1</a>');
};

// Process tables from markdown-style tables
function processTable(tableLines: string[]): string {
  if (!tableLines || tableLines.length < 2) return '';
  
  const headerLine = tableLines[0];
  const dataLines = tableLines.slice(2); 
  
  const extractCells = (line: string): string[] => {
    return line.split('|').filter(cell => cell.trim() !== '').map(cell => cell.trim());
  };
  
  const headers = extractCells(headerLine);
  
  let tableHtml = `
    <div class="my-6 overflow-x-auto rounded-lg shadow-sm border border-gray-300 dark:border-gray-600">
      <table class="w-full border-collapse text-sm">
        <thead>
          <tr class="bg-gray-100 dark:bg-gray-700">
  `;
  
  headers.forEach(header => {
    const content = processInlineFormatting(header);
    tableHtml += `<th class="border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-gray-700 dark:text-gray-200 font-semibold text-left">${content}</th>`;
  });
  
  tableHtml += `
          </tr>
        </thead>
        <tbody>
  `;
  
  dataLines.forEach((line, index) => {
    if (line.trim() === '' || !line.includes('|')) return;
    
    const cells = extractCells(line);
    const rowClass = index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/70 dark:bg-gray-700/30';
    tableHtml += `<tr class="${rowClass}">`;
    
    cells.forEach(cell => {
      const content = processInlineFormatting(cell);
      tableHtml += `<td class="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-700 dark:text-gray-300">${content}</td>`;
    });
    
    tableHtml += '</tr>';
  });
  
  tableHtml += `
          </tbody>
        </table>
      </div>
  `;
  
  return tableHtml;
};


/**
 * Formats raw content for display in the study viewer.
 */
export const formatContent = (content: string, isOriginal: boolean = false): string => {
  const noContentMsg = `<p class="text-gray-500 dark:text-gray-400">No content available.</p>`;
  const wrapperStart = `<div class="max-w-4xl mx-auto p-6 sm:p-8 md:p-10 bg-white dark:bg-gray-900 shadow-xl rounded-lg font-serif text-gray-700 dark:text-gray-300 leading-relaxed">`;
  const wrapperEnd = `</div>`;

  if (!content) {
    return `${wrapperStart}${noContentMsg}${wrapperEnd}`;
  }

  if (isOriginal) {
    return formatOriginalContent(content); // This function will add its own wrapper
  }
  return formatSummaryContent(content); // This function will add its own wrapper
};

/**
 * Detects if content is likely binary data
 */
function isBinaryContent(content: string): boolean {
  if (content.startsWith('%PDF')) return true;
  if (content.includes('\u0000') || /[\x00-\x08\x0E-\x1F\x7F-\xFF]/.test(content.substring(0, 100))) return true;
  const sample = content.substring(0, 1000);
  const nonPrintableCount = sample.split('').filter(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) > 126).length;
  return nonPrintableCount / sample.length > 0.15;
}

/**
 * Format original document content
 */
export const formatOriginalContent = (content: string): string => {
  const wrapperStart = `<div class="max-w-4xl mx-auto p-6 sm:p-8 md:p-10 bg-white dark:bg-gray-900 shadow-xl rounded-lg font-serif text-gray-700 dark:text-gray-300 leading-relaxed">`;
  const wrapperEnd = `</div>`;
  let formattedOutput = '';

  if (!content) {
    formattedOutput = '<p class="text-gray-500 dark:text-gray-400">No original content available.</p>';
  } else if (isBinaryContent(content)) {
    if (content.startsWith('%PDF')) {
      formattedOutput = `
        <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div class="p-6 bg-gray-100 dark:bg-gray-800 rounded-xl shadow-sm mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto text-gray-500 dark:text-gray-400"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path><path d="M16 13H8"></path><path d="M16 17H8"></path><path d="M10 9H8"></path></svg>
          </div>
          <h3 class="font-sans text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">PDF Document</h3>
          <p class="text-gray-600 dark:text-gray-400 max-w-md">The original content is a PDF document which cannot be displayed directly. The summary view provides a text representation of this content.</p>
        </div>`;
    } else {
      formattedOutput = `
        <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
           <div class="p-6 bg-gray-100 dark:bg-gray-800 rounded-xl shadow-sm mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto text-gray-500 dark:text-gray-400"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path></svg>
          </div>
          <h3 class="font-sans text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">Binary Document</h3>
          <p class="text-gray-600 dark:text-gray-400 max-w-md">The original content is in a binary format that cannot be displayed directly as text. Please use the summary view to see the extracted content.</p>
        </div>`;
    }
  } else {
    const paragraphs = content.split(/\n\s*\n/);
    const formattedParagraphs = paragraphs.map(paragraph => {
      if (!paragraph.trim()) return '';
      const formattedText = paragraph
        .replace(/\n/g, '<br>')
        .replace(/^(#+)\s+(.+)$/gm, (match, hashes, title) => {
          const level = Math.min(6, hashes.length);
          return `<h${level} class="font-sans text-${level === 1 ? 'xl' : level === 2 ? 'lg' : 'md'} font-bold my-4">${title}</h${level}>`;
        })
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code class="bg-gray-200/60 dark:bg-gray-700/60 px-1 py-0.5 rounded text-xs sm:text-sm font-mono">$1</code>');
      return `<p class="mb-4 leading-relaxed">${formattedText}</p>`;
    }).join('');
    formattedOutput = `<div class="original-content prose prose-sm sm:prose dark:prose-invert max-w-none">${formattedParagraphs}</div>`;
  }
  return `${wrapperStart}${formattedOutput}${wrapperEnd}`;
};

/**
 * Format summary content
 */
export const formatSummaryContent = (content: string): string => {
  const wrapperStart = `<div class="max-w-4xl mx-auto p-6 sm:p-8 md:p-10 bg-white dark:bg-gray-900 shadow-xl rounded-lg font-serif text-gray-700 dark:text-gray-300 leading-relaxed">`;
  const wrapperEnd = `</div>`;

  if (!content) {
    return `${wrapperStart}<p class="text-gray-500 dark:text-gray-400">No summary content available.</p>${wrapperEnd}`;
  }

  const codeBlockPlaceholders: Record<string, string> = {};
  let codeBlockCounter = 0;
  
  const processedContentForCodeBlocks = content.replace(/```(?:(\w+)\n)?([\s\S]*?)```/g, (match, language, code) => {
    const placeholder = `CODE_BLOCK_${codeBlockCounter++}`;
    const escapedCode = code.replace(/</g, '<').replace(/>/g, '>');
    codeBlockPlaceholders[placeholder] = `
      <div class="my-6 rounded-md shadow-lg">
        <div class="bg-gray-700 dark:bg-gray-800 px-4 py-2 rounded-t-md flex justify-between items-center">
          <span class="text-xs font-mono text-gray-300 dark:text-gray-400">${language || 'code'}</span>
          <!-- Placeholder for a copy button -->
        </div>
        <pre class="bg-gray-800 dark:bg-gray-900 text-white p-4 rounded-b-md overflow-x-auto text-sm leading-relaxed">
          <code class="language-${language || 'plaintext'} font-mono">${escapedCode}</code>
        </pre>
      </div>`;
    return placeholder;
  });

  const processedWithBlocks = processSpecialBlocks(processedContentForCodeBlocks);

  const processHeadings = (text: string): string => {
    return text.replace(/^(#{1,6})\s+(.+)$/gm, (match, hashes, title) => {
      const level = hashes.length;
      const id = title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
      let icon = '';
      if (title.toLowerCase().includes('introduction') || level === 1) icon = '🔍';
      else if (title.toLowerCase().includes('history')) icon = '⏳';
      else if (title.toLowerCase().includes('application')) icon = '🏥';
      else if (title.toLowerCase().includes('ethic') || title.toLowerCase().includes('consideration')) icon = '💡';
      else if (title.toLowerCase().includes('conclusion')) icon = '🏁';
      else if (title.toLowerCase().includes('method') || title.toLowerCase().includes('procedure')) icon = '🔧';
      else if (title.toLowerCase().includes('example')) icon = '📝';
      else if (level === 2) icon = '📌';
      
      let headingClasses = 'font-sans ';
      let iconSizeClass = 'mr-2 text-xl';

      if (level === 1) {
        headingClasses += 'text-3xl lg:text-4xl font-bold mt-12 mb-6 pb-3 border-b-2 border-indigo-200 dark:border-indigo-700 text-gray-800 dark:text-gray-100';
        iconSizeClass = 'mr-3 text-2xl';
      } else if (level === 2) {
        headingClasses += 'text-2xl lg:text-3xl font-semibold mt-10 mb-5 text-indigo-700 dark:text-indigo-400';
        iconSizeClass = 'mr-2.5 text-xl'; // slight adjustment
      } else if (level === 3) {
        headingClasses += 'text-xl lg:text-2xl font-semibold mt-8 mb-4 text-gray-700 dark:text-gray-200';
      } else {
        headingClasses += 'text-lg font-medium mt-6 mb-3 text-gray-600 dark:text-gray-400'; // Darker gray for h4+
      }
      return `<h${level} id="${id}" class="${headingClasses}">${icon ? `<span class="${iconSizeClass} inline-block">${icon}</span>` : ''}${processInlineFormatting(title)}</h${level}>`;
    });
  };

  const processLists = (text: string): string => {
    text = text.replace(/^(\s*)[*\-+]\s+(.+)$/gm, (match, indent, listItemContent) => {
      const indentLevel = Math.floor(indent.length / 2) || 0;
      return `<li class="ml-${indentLevel * 4} mb-1.5 text-sm leading-relaxed">${processInlineFormatting(listItemContent)}</li>`;
    });
    text = text.replace(/^(\s*)\d+\.\s+(.+)$/gm, (match, indent, listItemContent) => {
      const indentLevel = Math.floor(indent.length / 2) || 0;
      return `<li class="ml-${indentLevel * 4} mb-1.5 text-sm leading-relaxed">${processInlineFormatting(listItemContent)}</li>`;
    });
    
    // Wrap adjacent list items
    // Use [\s\S]*? to match content across newlines, and ensure it captures the <li> tags correctly.
    // The lookahead (?=...) ensures we group correctly until the next different element or end of block.
    text = text.replace(/(<li class="ml-\d+ mb-1.5 text-sm leading-relaxed">[\s\S]*?<\/li>\s*)+(?=(?!<li class="ml-\d+ mb-1.5 text-sm leading-relaxed">))/g, 
        (match) => `<ul class="list-disc pl-5 mb-4 space-y-0.5">${match.replace(/<\/li>\s*<li/g, '</li><li')}</ul>`);
    
    text = text.replace(/(<li class="ml-\d+ mb-1.5 text-sm leading-relaxed list-decimal">[\s\S]*?<\/li>\s*)+(?=(?!<li class="ml-\d+ mb-1.5 text-sm leading-relaxed list-decimal">))/g, 
        (match) => `<ol class="list-decimal pl-5 mb-4 space-y-0.5">${match.replace(/<\/li>\s*<li/g, '</li><li')}</ul>`);
    
    // Remove list-decimal class from li if it's already on ol
    text = text.replace(/<ol([^>]*)>([\s\S]*?)<\/ol>/g, (match, olAttrs, olContent) => {
        return `<ol${olAttrs}>${olContent.replace(/list-decimal/g, '')}</ol>`;
    });

    return text;
  };


  const lines = processedWithBlocks.split('\n');
  let htmlLines: string[] = [];
  let inParagraph = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      if (inParagraph) { htmlLines.push('</p>'); inParagraph = false; }
      continue;
    }
    if (Object.keys(codeBlockPlaceholders).includes(line)) {
      if (inParagraph) { htmlLines.push('</p>'); inParagraph = false; }
      htmlLines.push(codeBlockPlaceholders[line]);
      continue;
    }
    if (line.startsWith('<') && (line.endsWith('>') || line.includes('</div>') || line.includes('</p>') || line.includes('</blockquote>') || line.includes('</table>'))) {
      if (inParagraph) { htmlLines.push('</p>'); inParagraph = false; }
      htmlLines.push(line);
      continue;
    }
    if (/^#{1,6}\s+.+$/.test(line)) {
      if (inParagraph) { htmlLines.push('</p>'); inParagraph = false; }
      htmlLines.push(processHeadings(line));
      continue;
    }
    
    // Improved List Detection and Grouping
    if (/^(\s*)(?:[*\-+]|\d+\.)\s+.+$/.test(line)) {
        if (inParagraph) { htmlLines.push('</p>'); inParagraph = false; }
        let listBlockContent = '';
        let j = i;
        // Collect all consecutive list items
        while (j < lines.length && lines[j].trim().match(/^(\s*)(?:[*\-+]|\d+\.)\s+.+$/)) {
            listBlockContent += lines[j] + '\n';
            j++;
        }
        htmlLines.push(processLists(listBlockContent.trim()));
        i = j - 1; // Move parser past this list block
        continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      if (inParagraph) { htmlLines.push('</p>'); inParagraph = false; }
      htmlLines.push('<hr class="my-8 border-t border-gray-300 dark:border-gray-600" />');
      continue;
    }
    if (line.includes('|') && line.trim().startsWith('|') && lines[i+1]?.includes('---')) { // Check for separator too
      if (inParagraph) { htmlLines.push('</p>'); inParagraph = false; }
      const tableLinesArr = [];
      let j = i;
      while (j < lines.length && lines[j].includes('|')) {
        tableLinesArr.push(lines[j]);
        j++;
      }
      htmlLines.push(processTable(tableLinesArr));
      i = j - 1;
      continue;
    }
    if (!inParagraph) {
      htmlLines.push('<p class="mb-5 leading-relaxed text-base">'); // Slightly larger mb, text-base for paragraphs
      inParagraph = true;
    } else {
      // For multi-line paragraphs, ensure space before next line unless it's an explicit break
      if (lines[i-1]?.trim() !== '') { // if previous line was not empty
        htmlLines.push(' '); // Add a space to join lines naturally in a paragraph
      }
    }
    htmlLines.push(processInlineFormatting(line));
  }
  if (inParagraph) { htmlLines.push('</p>'); }
  
  let result = htmlLines.join('\n');
  
  result = result.replace(/(?<!<[^>]*)(^|\s)([A-Z][A-Za-z\s]{0,30}):(\s+)([^<\n]+?)(?=$|<|\.)/g, 
    '$1<strong class="font-sans font-medium text-gray-800 dark:text-gray-100">$2:</strong>$3$4');
  
  return `${wrapperStart}${result}${wrapperEnd}`;
}

/**
 * Process special content blocks
 */
function processSpecialBlocks(content: string): string {
  let processedContent = content;

  // [DEFINITION]
  processedContent = processedContent.replace(/\[DEFINITION\]([\s\S]*?)\[\/DEFINITION\]/gi, (match, defContent) => {
    const titleMatch = defContent.match(/\*\*(.+?)(?:\*\*|:)/);
    const term = titleMatch ? titleMatch[1] : 'Definition';
    const definition = processInlineFormatting(defContent.replace(/\*\*(.+?)(?:\*\*|:)/, '').trim());
    return `
      <div class="my-5 p-4 border border-indigo-200 dark:border-indigo-700 rounded-md bg-indigo-50/30 dark:bg-indigo-900/20 shadow-sm">
        <div class="flex items-start gap-2.5 text-indigo-700 dark:text-indigo-400 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5 flex-shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
          <h4 class="font-sans font-semibold text-md">Definition: ${processInlineFormatting(term)}</h4>
        </div>
        <div class="text-sm text-gray-700 dark:text-gray-300 pl-7 leading-normal">${definition}</div>
      </div>`;
  });

  // [KEY_CONCEPT]
  processedContent = processedContent.replace(/\[KEY_CONCEPT\]([\s\S]*?)\[\/KEY_CONCEPT\]/gi, (match, conceptContent) => {
    const titleMatch = conceptContent.match(/\*\*(.+?)(?:\*\*|:)/);
    const title = titleMatch ? titleMatch[1] : 'Key Concept';
    const description = processInlineFormatting(conceptContent.replace(/\*\*(.+?)(?:\*\*|:)/, '').trim());
    return `
      <div class="my-5 p-4 border border-blue-200 dark:border-blue-700 rounded-md bg-blue-50/30 dark:bg-blue-900/20 shadow-sm">
        <div class="flex items-start gap-2.5 text-blue-700 dark:text-blue-400 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5 flex-shrink-0 mt-0.5"><line x1="12" x2="12" y1="18" y2="18"></line><path d="M6.3 15h11.4"></path><path d="m19 10-5.7-5.7a1 1 0 0 0-1.4 0L6.2 10a1 1 0 0 0 0 1.4l5.7 5.7a1 1 0 0 0 1.4 0l5.7-5.7a1 1 0 0 0 0-1.4Z"></path></svg>
          <h4 class="font-sans font-semibold text-md">Key Concept: ${processInlineFormatting(title)}</h4>
        </div>
        <div class="text-sm text-gray-700 dark:text-gray-300 pl-7 leading-normal">${description}</div>
      </div>`;
  });

  // [EXAMPLE]
  processedContent = processedContent.replace(/\[EXAMPLE\]([\s\S]*?)\[\/EXAMPLE\]/gi, (match, exampleContent) => {
    const titleMatch = exampleContent.match(/\*\*(.+?)(?:\*\*|:)/);
    const title = titleMatch ? titleMatch[1] : 'Example';
    const description = processInlineFormatting(exampleContent.replace(/\*\*(.+?)(?:\*\*|:)/, '').trim());
    return `
      <div class="my-5 p-4 border-l-4 border-amber-400 dark:border-amber-500 bg-gray-50 dark:bg-gray-800/40 rounded-r-md shadow-sm">
        <div class="flex items-start gap-2.5 text-amber-700 dark:text-amber-400 font-medium mb-2">
          <div class="bg-amber-100 dark:bg-amber-700/50 text-amber-700 dark:text-amber-200 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">Ex</div>
          <h4 class="font-sans font-semibold text-md">${processInlineFormatting(title)}</h4>
        </div>
        <div class="text-sm text-gray-700 dark:text-gray-300 pl-8 leading-normal">${description}</div>
      </div>`;
  });

  // [CASE_STUDY]
  processedContent = processedContent.replace(/\[CASE_STUDY\]([\s\S]*?)\[\/CASE_STUDY\]/gi, (match, caseContent) => {
    const titleMatch = caseContent.match(/\*\*(.+?)(?:\*\*|:)/);
    const titleText = titleMatch ? titleMatch[1] : 'Case Study'; // Renamed title to titleText
    const description = processInlineFormatting(caseContent.replace(/\*\*(.+?)(?:\*\*|:)/, '').trim());
    return `
      <div class="my-6 p-5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-md bg-white dark:bg-gray-800/30">
        <div class="flex items-center gap-3 text-gray-700 dark:text-gray-200 font-semibold mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6 flex-shrink-0 text-indigo-500"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg>
          <h4 class="font-sans text-lg">Case Study: ${processInlineFormatting(titleText)}</h4>
        </div>
        <div class="text-sm text-gray-700 dark:text-gray-300 space-y-3 leading-normal">${description}</div>
      </div>`;
  });
  
  // [ACTIVE_LEARNING] - REINTEGRATED
  processedContent = processedContent.replace(/\[ACTIVE_LEARNING\]([\s\S]*?)\[\/ACTIVE_LEARNING\]/gi, (match, activeContent) => {
    const processedActiveContent = processInlineFormatting(activeContent.trim());
    return `
      <div class="my-6 p-4 bg-green-50/70 dark:bg-green-900/40 border-l-4 border-green-500 dark:border-green-600 rounded-r-lg shadow-sm">
        <div class="flex items-center gap-2.5 text-green-700 dark:text-green-300 font-semibold mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5 flex-shrink-0"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9"></path><path d="M17.5 8.5a1 1 0 1 0 1 1.5 1 1 0 1 0-1-1.5"></path></svg>
          <h4 class="font-sans text-md">Active Learning Exercise</h4>
        </div>
        <div class="text-sm text-gray-700 dark:text-gray-300 pl-7 leading-normal">${processedActiveContent}</div>
        <div class="flex justify-end mt-3 pl-7">
          <button class="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md text-xs font-medium shadow hover:shadow-md transition-shadow">Check Understanding</button>
        </div>
      </div>`;
  });

  // [STEPS]
  processedContent = processedContent.replace(/\[STEPS\]([\s\S]*?)\[\/STEPS\]/gi, (match, stepsContent) => {
    const titleMatch = stepsContent.match(/\*\*(.+?)(?:\*\*|:)/);
    const titleText = titleMatch ? titleMatch[1] : 'Step-by-Step Guide'; // Renamed title to titleText
    let contentToProcess = stepsContent.replace(/\*\*(.+?)(?:\*\*|:)/, '').trim();
    const steps = contentToProcess.split('\n').filter((step: string) => step.trim().match(/^\d+\.\s+/));
    let stepsHtml = '';
    if (steps.length > 0) {
      stepsHtml = '<div class="mt-3 space-y-3">';
      steps.forEach((step: string) => {
        const stepMatch = step.match(/^(\d+)\.\s+(.*)/);
        if (stepMatch) {
          stepsHtml += `
            <div class="flex items-start gap-3">
              <div class="flex-shrink-0 w-6 h-6 bg-yellow-200 dark:bg-yellow-700/60 rounded-full flex items-center justify-center text-xs font-medium text-yellow-700 dark:text-yellow-200">${stepMatch[1]}</div>
              <div class="flex-1 text-sm text-gray-700 dark:text-gray-300 leading-normal">${processInlineFormatting(stepMatch[2])}</div>
            </div>`;
        }
      });
      stepsHtml += '</div>';
    } else {
      stepsHtml = `<div class="text-sm text-gray-700 dark:text-gray-300 leading-normal">${processInlineFormatting(contentToProcess)}</div>`;
    }
    return `
      <div class="my-6 p-5 bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700 rounded-lg shadow">
        <div class="flex items-center gap-3 text-yellow-700 dark:text-yellow-400 font-semibold mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6 flex-shrink-0"><path d="M10 2h4"></path><path d="M12 14v-4"></path><path d="M4 13a8 8 0 0 0 8 8 8 8 0 0 0 8-8 8 8 0 0 0-8-8 8 8 0 0 0-8 8z"></path></svg>
         <h4 class="font-sans text-lg">🔢 ${processInlineFormatting(titleText)}</h4>
       </div>
       ${stepsHtml}
     </div>`;
  });

  // [IMPORTANT_NOTE]
  processedContent = processedContent.replace(/\[IMPORTANT_NOTE\]([\s\S]*?)\[\/IMPORTANT_NOTE\]/gi, (match, noteContent) => {
    const processedNote = processInlineFormatting(noteContent.trim());
    return `
      <div class="my-5 p-4 border-l-4 border-red-500 dark:border-red-600 bg-red-50/50 dark:bg-red-900/30 rounded-r-md shadow-sm">
        <div class="flex items-start gap-2.5 text-red-700 dark:text-red-400 font-semibold mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5 flex-shrink-0 mt-0.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>
          <h4 class="font-sans text-md">Important Note</h4>
        </div>
        <div class="text-sm text-gray-700 dark:text-gray-300 pl-7 leading-normal">${processedNote}</div>
      </div>`;
  });

  // [PROS_CONS]
  processedContent = processedContent.replace(/\[PROS_CONS\]([\s\S]*?)\[\/PROS_CONS\]/gi, (match, prosConsMainContent) => {
    const titleMatch = prosConsMainContent.match(/\*\*(.+?)(?:\*\*|:)/);
    const titleText = titleMatch ? titleMatch[1] : 'Pros & Cons'; // Renamed title to titleText
    const pcContent = prosConsMainContent.replace(/\*\*(.+?)(?:\*\*|:)/, '').trim();
    const sections = pcContent.split(/(?:\r?\n){2,}/);
    let prosSection = '', consSection = '';
    sections.forEach((section: string) => {
      if (section.toLowerCase().includes('pros:') || section.toLowerCase().includes('advantages:')) prosSection = section.replace(/pros:|advantages:/i, '').trim();
      else if (section.toLowerCase().includes('cons:') || section.toLowerCase().includes('disadvantages:')) consSection = section.replace(/cons:|disadvantages:/i, '').trim();
    });
    const formatListItems = (text: string, type: 'pros' | 'cons') => {
      if (!text) return `<li class="text-gray-400 dark:text-gray-500 italic">No ${type} listed.</li>`;
      const items = text.split('\n').map(line => line.trim()).filter(line => line.startsWith('- ') || line.startsWith('* ')).map(line => line.substring(2).trim());
      if (items.length === 0) return text.split('\n').filter(line => line.trim()).map(line => `<li class="mb-1">${processInlineFormatting(line)}</li>`).join('');
      return items.map(item => `<li class="mb-1">${processInlineFormatting(item)}</li>`).join('');
    };
    return `
      <div class="my-6 border border-gray-300 dark:border-gray-600 rounded-lg shadow-md overflow-hidden">
        <div class="bg-gray-100 dark:bg-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
          <div class="flex items-center gap-2 font-sans font-semibold text-gray-700 dark:text-gray-200">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M12 22V2"></path><path d="M17 5H7.5a2.5 2.5 0 0 0 0 5h9a2.5 2.5 0 0 1 0 5H7"></path></svg>
            <h4 class="text-md">⚖️ ${processInlineFormatting(titleText)}</h4>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2">
          <div class="p-4 bg-green-50/30 dark:bg-green-900/20 ${consSection ? 'md:border-r md:border-gray-200 dark:md:border-gray-600' : ''}">
            <h5 class="font-sans font-semibold text-green-700 dark:text-green-400 flex items-center gap-2 mb-2 text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4 text-green-500"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"></path></svg>
              Pros
            </h5>
            <ul class="list-none pl-1 text-sm text-green-800 dark:text-green-300 space-y-1 leading-normal">${formatListItems(prosSection, 'pros')}</ul>
          </div>
          <div class="p-4 bg-red-50/30 dark:bg-red-900/20">
            <h5 class="font-sans font-semibold text-red-700 dark:text-red-400 flex items-center gap-2 mb-2 text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4 text-red-500"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"></path></svg>
              Cons
            </h5>
            <ul class="list-none pl-1 text-sm text-red-800 dark:text-red-300 space-y-1 leading-normal">${formatListItems(consSection, 'cons')}</ul>
          </div>
        </div>
      </div>`;
  });
  
  // [SECTION_SUMMARY] - REINTEGRATED
  processedContent = processedContent.replace(/\[SECTION_SUMMARY\]([\s\S]*?)\[\/SECTION_SUMMARY\]/gi, (match, summaryContent) => {
    const processedSummary = processInlineFormatting(summaryContent.trim());
    return `
      <div class="my-6 p-4 bg-gray-100 dark:bg-gray-800/50 border-t border-b border-gray-300 dark:border-gray-700 shadow-inner">
        <div class="flex items-center gap-2.5 text-gray-700 dark:text-gray-300 font-semibold mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5 flex-shrink-0"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
          <h4 class="font-sans text-md">Section Summary</h4>
        </div>
        <div class="text-sm text-gray-600 dark:text-gray-400 pl-7 leading-normal">${processedSummary}</div>
      </div>`;
  });

  // [DISCUSSION_PROMPT] - REINTEGRATED
  processedContent = processedContent.replace(/\[DISCUSSION_PROMPT\]([\s\S]*?)\[\/DISCUSSION_PROMPT\]/gi, (match, promptContent) => {
    const processedPrompt = processInlineFormatting(promptContent.trim());
    return `
      <div class="my-6 p-4 bg-purple-50/70 dark:bg-purple-900/40 border-l-4 border-purple-500 dark:border-purple-600 rounded-r-lg shadow-sm">
        <div class="flex items-center gap-2.5 text-purple-700 dark:text-purple-300 font-semibold mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5 flex-shrink-0"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          <h4 class="font-sans text-md">💡 Think About It</h4>
        </div>
        <div class="text-sm text-gray-700 dark:text-gray-300 pl-7 leading-normal">${processedPrompt}</div>
      </div>`;
  });

  // [PULL_QUOTE]
  processedContent = processedContent.replace(/\[PULL_QUOTE\]([\s\S]*?)\[\/PULL_QUOTE\]/gi, (match, quoteContent) => {
    const processedQuote = processInlineFormatting(quoteContent.trim());
    return `
      <blockquote class="my-8 py-4 px-2 sm:px-6 text-center relative">
        <span class="absolute -top-2 left-0 sm:left-2 text-6xl text-indigo-200 dark:text-indigo-700 opacity-50 font-serif">“</span>
        <p class="text-xl lg:text-2xl italic text-gray-600 dark:text-gray-400 leading-snug px-6 sm:px-10">
          ${processedQuote}
        </p>
        <span class="absolute -bottom-4 right-0 sm:right-2 text-6xl text-indigo-200 dark:text-indigo-700 opacity-50 font-serif">”</span>
      </blockquote>`;
  });

  // [FURTHER_READING] - REINTEGRATED
  processedContent = processedContent.replace(/\[FURTHER_READING\]([\s\S]*?)\[\/FURTHER_READING\]/gi, (match, frContent) => { // Renamed content to frContent
    let formattedFrContent = frContent.trim();
    formattedFrContent = formattedFrContent.replace(/^(-|\*)\s+(.*?):\s+(https?:\/\/\S+)/gm, 
     '<li class="mb-1.5"><strong class="font-sans font-medium">$2:</strong> <a href="$3" class="text-teal-600 dark:text-teal-400 hover:underline" target="_blank" rel="noopener noreferrer">$3</a></li>');
    if (!formattedFrContent.includes('<li')) {
      formattedFrContent = `<p class="leading-normal">${processInlineFormatting(formattedFrContent)}</p>`;
    } else {
      formattedFrContent = `<ul class="list-none space-y-1">${formattedFrContent}</ul>`;
    }
    return `
      <div class="my-6 p-4 bg-teal-50/50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-700 rounded-lg shadow-sm">
        <div class="flex items-center gap-2.5 text-teal-700 dark:text-teal-300 font-semibold mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5 flex-shrink-0"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg>
          <h4 class="font-sans text-md">📚 Dive Deeper</h4>
        </div>
        <div class="text-sm text-gray-700 dark:text-gray-300 pl-7">${formattedFrContent}</div>
      </div>`;
  });

  // [MISCONCEPTION] - REINTEGRATED
  processedContent = processedContent.replace(/\[MISCONCEPTION\]([\s\S]*?)\[\/MISCONCEPTION\]/gi, (match, mcContent) => { // Renamed content to mcContent
    const titleMatch = mcContent.match(/\*\*(.+?)(?:\*\*|:)/);
    const misconception = titleMatch ? titleMatch[1] : 'Common Misconception';
    const explanation = processInlineFormatting(mcContent.replace(/\*\*(.+?)(?:\*\*|:)/, '').trim());
    return `
      <div class="my-6 p-4 bg-red-50/50 dark:bg-red-900/30 border-l-4 border-red-400 dark:border-red-600 rounded-r-lg shadow-sm">
        <div class="flex items-start gap-2.5 text-red-700 dark:text-red-400 font-semibold mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5 flex-shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" x2="9" y1="9" y2="15"></line><line x1="9" x2="15" y1="9" y2="15"></line></svg>
          <h4 class="font-sans text-md">⚠️ Common Misconception: ${processInlineFormatting(misconception)}</h4>
        </div>
        <div class="text-sm text-gray-700 dark:text-gray-300 pl-7 leading-normal">${explanation}</div>
      </div>`;
  });

  // [CODE_SNIPPET]
  processedContent = processedContent.replace(/\[CODE_SNIPPET\]([\s\S]*?)\[\/CODE_SNIPPET\]/gi, (match, snippetContent) => {
    const titleMatch = snippetContent.match(/\*\*(.+?)(?:\*\*|:)/);
    const titleText = titleMatch ? titleMatch[1] : 'Code Snippet'; // Renamed title to titleText
    const code = snippetContent.replace(/\*\*(.+?)(?:\*\*|:)/, '').trim().replace(/</g, '<').replace(/>/g, '>');
    return `
      <div class="my-6 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden shadow-md">
        <div class="bg-gray-100 dark:bg-gray-700 px-4 py-2.5 flex items-center justify-between border-b border-gray-200 dark:border-gray-600">
          <div class="flex items-center gap-2 text-gray-700 dark:text-gray-200 font-sans font-semibold text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
            <span>${processInlineFormatting(titleText)}</span>
          </div>
        </div>
        <pre class="bg-gray-800 dark:bg-gray-900 text-white p-4 m-0 overflow-x-auto"><code class="text-xs sm:text-sm font-mono leading-relaxed">${code}</code></pre>
      </div>`;
  });

  // [COMPARISON]
  processedContent = processedContent.replace(/\[COMPARISON\]([\s\S]*?)\[\/COMPARISON\]/gi, (match, comparisonContent) => {
    const titleMatch = comparisonContent.match(/\*\*(.+?)(?:\*\*|:)/);
    const titleText = titleMatch ? titleMatch[1] : 'Comparison'; // Renamed title to titleText
    let tableContent = comparisonContent.replace(/\*\*(.+?)(?:\*\*|:)/, '').trim();
     if (!tableContent.includes('|')) {
       const rows = tableContent.split('\n').map((line: string) => line.trim()).filter((line: string) => line);
       const listItems = rows.filter((row: string) => row.startsWith('- ') || row.startsWith('* '));
       if (listItems.length > 0) {
         tableContent = '| Feature | Description |\n| --- | --- |\n';
         listItems.forEach((item: string) => {
           const parts = item.substring(2).split(':');
           tableContent += `| ${processInlineFormatting(parts[0].trim())} | ${parts.length >= 2 ? processInlineFormatting(parts.slice(1).join(':').trim()) : ''} |\n`;
         });
       }
     }
    const tableHTML = processTable(tableContent.split('\n'));
    const cleanedTableHTML = tableHTML.replace('my-6 ', '').replace('rounded-lg', 'rounded-b-lg border-x border-b border-blue-200 dark:border-blue-700/50');
    return `
      <div class="my-6">
        <div class="bg-blue-50 dark:bg-blue-900/20 px-4 py-3 rounded-t-lg border-t border-x border-blue-200 dark:border-blue-700/50">
          <div class="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-sans font-semibold">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M8 3H5a2 2 0 0 0-2 2v3"></path><path d="M21 8V5a2 2 0 0 0-2-2h-3"></path><path d="M3 16v3a2 2 0 0 0 2 2h3"></path><path d="M16 21h3a2 2 0 0 0 2-2v-3"></path></svg>
            <h4 class="text-md">📊 ${processInlineFormatting(titleText)}</h4>
          </div>
        </div>
        ${cleanedTableHTML}
      </div>`;
  });

 return processedContent;
}