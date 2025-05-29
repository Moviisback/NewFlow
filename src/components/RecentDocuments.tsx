import React from 'react';
import { 
  FileText, 
  Clock,
  ChevronRight,
  PlusCircle,
  ExternalLink
} from 'lucide-react';

import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardFooter
} from '@/components/ui/card';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

// Type for individual document
interface Document {
  id: string;
  title: string;
  createdAt: string;
  thumbnailUrl?: string;
  type: 'pdf' | 'doc' | 'txt' | 'other';
}

interface RecentDocumentsProps {
  documents: Document[] | null;
  loading: boolean;
  onUploadClick: () => void;
}

const DocumentItem = ({ document }: { document: Document }) => {
  // Function to get file icon based on type
  const getFileIcon = (type: string) => {
    // Could be expanded with different icons for different file types
    return <FileText className="h-4 w-4 text-blue-500" />;
  };

  // Format date to relative time (e.g., "2 days ago")
  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      if (diffInHours === 0) {
        const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
        return diffInMinutes === 0 ? 'Just now' : `${diffInMinutes}m ago`;
      }
      return `${diffInHours}h ago`;
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    }
    
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <Link href={`/documents/${document.id}`} className="block">
      <div className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
        <div className="mr-3 p-2 bg-blue-50 dark:bg-blue-900 rounded">
          {getFileIcon(document.type)}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{document.title}</h4>
          <div className="flex items-center mt-1">
            <Clock className="h-3 w-3 text-gray-400 mr-1" />
            <span className="text-xs text-gray-500">{getRelativeTime(document.createdAt)}</span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-gray-400" />
      </div>
    </Link>
  );
};

const RecentDocuments = ({ documents, loading, onUploadClick }: RecentDocumentsProps) => {
  return (
    <Card className="shadow-sm border-blue-100 dark:border-blue-800 overflow-hidden">
      <CardHeader className="bg-blue-50 dark:bg-blue-900 pb-2 border-b border-blue-100 dark:border-blue-800">
        <CardTitle className="text-base font-semibold flex items-center">
          <Clock className="h-4 w-4 mr-2 text-blue-600" />
          Recent Documents
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center p-2">
                <Skeleton className="h-10 w-10 rounded mr-3" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {documents && documents.length > 0 ? (
              documents.map(doc => <DocumentItem key={doc.id} document={doc} />)
            ) : (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <div className="bg-blue-50 dark:bg-blue-900 p-3 rounded-full mb-3">
                  <FileText className="h-6 w-6 text-blue-500" />
                </div>
                <h3 className="text-base font-medium mb-1">No documents yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload your first document to get started
                </p>
                <Button onClick={onUploadClick}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Upload Document
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
      {documents && documents.length > 0 && (
        <CardFooter className="bg-gray-50 dark:bg-gray-800 py-2 px-4 border-t border-gray-100 dark:border-gray-700">
          <div className="w-full flex justify-between items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={onUploadClick}
              className="text-xs"
            >
              <PlusCircle className="h-3 w-3 mr-1" />
              Upload New
            </Button>
            <Link href="/documents" className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center">
              View All Documents
              <ExternalLink className="h-3 w-3 ml-1" />
            </Link>
          </div>
        </CardFooter>
      )}
    </Card>
  );
};

export default RecentDocuments;