// components/documents/IconComponents.tsx
import React from 'react';
import { FileText, BookOpen, File, FileSpreadsheet, Image } from 'lucide-react';

interface IconProps {
  className?: string;
  size?: number;
}

export const FileTextIconComponent: React.FC<IconProps> = ({ className, size = 24 }) => {
  return <FileText size={size} className={className} />;
};

export const BookOpenIconComponent: React.FC<IconProps> = ({ className, size = 24 }) => {
  return <BookOpen size={size} className={className} />;
};

export const FileIconComponent: React.FC<IconProps> = ({ className, size = 24 }) => {
  return <File size={size} className={className} />;
};

export const SpreadsheetIconComponent: React.FC<IconProps> = ({ className, size = 24 }) => {
  return <FileSpreadsheet size={size} className={className} />;
};

export const ImageIconComponent: React.FC<IconProps> = ({ className, size = 24 }) => {
  return <Image size={size} className={className} />;
};

export const getIconByType = (fileType: string, colorClass: string, size = 24): JSX.Element => {
  switch (fileType) {
    case 'pdf':
      return <FileIconComponent className={colorClass} size={size} />;
    case 'docx':
      return <FileTextIconComponent className={colorClass} size={size} />;
    case 'xlsx':
      return <SpreadsheetIconComponent className={colorClass} size={size} />;
    case 'txt':
    case 'summary':
      return <FileTextIconComponent className={colorClass} size={size} />;
    case 'flashcard':
      return <BookOpenIconComponent className={colorClass} size={size} />;
    case 'image':
      return <ImageIconComponent className={colorClass} size={size} />;
    case 'notes':
      return <BookOpenIconComponent className={colorClass} size={size} />;
    case 'quiz':
      return <FileTextIconComponent className={colorClass} size={size} />;
    default:
      return <FileTextIconComponent className={colorClass} size={size} />;
  }
};

export default {
  FileTextIconComponent,
  BookOpenIconComponent,
  FileIconComponent,
  SpreadsheetIconComponent,
  ImageIconComponent,
  getIconByType
};