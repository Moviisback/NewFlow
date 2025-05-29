// components/documents/colorUtils.ts
import { ColorTheme, LibraryItem } from './types';
import { getIconByType } from './IconComponents';

// Enhanced document type color mapping with explicit index signature
export const typeColors: { [key: string]: ColorTheme } = {
  pdf: {
    bg: "bg-gradient-to-br from-red-50 to-red-100",
    border: "border-red-200",
    text: "text-red-800",
    icon: "text-red-500",
    accent: "bg-red-500",
    light: "bg-red-50"
  },
  docx: {
    bg: "bg-gradient-to-br from-blue-50 to-blue-100",
    border: "border-blue-200",
    text: "text-blue-800",
    icon: "text-blue-500",
    accent: "bg-blue-500",
    light: "bg-blue-50"
  },
  xlsx: {
    bg: "bg-gradient-to-br from-green-50 to-green-100",
    border: "border-green-200",
    text: "text-green-800",
    icon: "text-green-500",
    accent: "bg-green-500",
    light: "bg-green-50"
  },
  txt: {
    bg: "bg-gradient-to-br from-gray-50 to-gray-100",
    border: "border-gray-200",
    text: "text-gray-800",
    icon: "text-gray-500",
    accent: "bg-gray-500",
    light: "bg-gray-50"
  },
  image: { // For potential future use
    bg: "bg-gradient-to-br from-purple-50 to-purple-100",
    border: "border-purple-200",
    text: "text-purple-800",
    icon: "text-purple-500",
    accent: "bg-purple-500",
    light: "bg-purple-50"
  },
  // Map existing types
  summary: { // Map 'summary' type to 'txt' style
    bg: "bg-gradient-to-br from-gray-50 to-gray-100",
    border: "border-gray-200",
    text: "text-gray-800",
    icon: "text-gray-500",
    accent: "bg-gray-500",
    light: "bg-gray-50"
  },
  flashcard: { // Map 'flashcard' type to 'purple' style (like image)
    bg: "bg-gradient-to-br from-purple-50 to-purple-100",
    border: "border-purple-200",
    text: "text-purple-800",
    icon: "text-purple-500",
    accent: "bg-purple-500",
    light: "bg-purple-50"
  },
  notes: { // Map 'notes' type to 'blue' style (like docx)
    bg: "bg-gradient-to-br from-blue-50 to-blue-100",
    border: "border-blue-200",
    text: "text-blue-800",
    icon: "text-blue-500",
    accent: "bg-blue-500",
    light: "bg-blue-50"
  },
  quiz: { // Map 'quiz' type to 'green' style (like xlsx)
    bg: "bg-gradient-to-br from-green-50 to-green-100",
    border: "border-green-200",
    text: "text-green-800",
    icon: "text-green-500",
    accent: "bg-green-500",
    light: "bg-green-50"
  },
  default: {
    bg: "bg-gradient-to-br from-gray-50 to-gray-100",
    border: "border-gray-200",
    text: "text-gray-800",
    icon: "text-gray-500",
    accent: "bg-gray-500",
    light: "bg-gray-50"
  }
};

// Enhanced document type icons
export const getTypeIcon = (fileTypeKey: string): JSX.Element => {
  // Use the mapped colors for consistency
  const colorClass = typeColors[fileTypeKey]?.icon || typeColors.default.icon;
  return getIconByType(fileTypeKey, colorClass);
};

// Determine file type key for styling/icons
export const getFileTypeKey = (doc: LibraryItem | { title: string; type?: string }): string => {
  // Null/undefined check to prevent runtime errors
  if (!doc) {
    return 'default';
  }
  
  const filename = doc.title || "";
  
  // Prioritize item.type if it's a known key (summary, flashcard, etc.)
  if (doc.type && typeColors[doc.type]) {
    return doc.type;
  }
  
  // Otherwise, check file extensions
  if (filename.endsWith('.pdf')) return 'pdf';
  if (filename.endsWith('.docx') || filename.endsWith('.doc')) return 'docx';
  if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) return 'xlsx';
  if (filename.endsWith('.txt')) return 'txt';
  if (filename.endsWith('.jpg') || filename.endsWith('.png') ||
      filename.endsWith('.jpeg') || filename.endsWith('.gif')) return 'image';

  return 'default';
};