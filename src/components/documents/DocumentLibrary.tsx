import React, { useState, useEffect } from 'react';
import DocumentCard from './DocumentCard';
import EmptyLibrary from './EmptyLibrary';
import SearchAndFilter from './SearchAndFilter';
import { LibraryItem } from './types';
import { getFileTypeKey } from './colorUtils';
import { saveLibraryToStorage } from './fileHelpers';

interface DocumentLibraryProps {
  items: LibraryItem[];
  onSelectItem: (item: LibraryItem) => void;
  onUpload: () => void;
  onAddDocument: (document: LibraryItem) => void;
  setLibraryItems: (items: LibraryItem[]) => void;
}

const DocumentLibrary: React.FC<DocumentLibraryProps> = ({ 
  items, 
  onSelectItem, 
  onUpload, 
  onAddDocument,
  setLibraryItems 
}) => {
  // State for UI controls
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<string>('grid');
  const [sortFilterOpen, setSortFilterOpen] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<string>('desc');
  
  // Derive available types from library items for filtering
  const availableTypes = [...new Set(items.map(item => getFileTypeKey(item)))];
  
  // Initial Filters based on derived available types
  const [filters, setFilters] = useState<string[]>(availableTypes);

  // Save to localStorage whenever items change
  useEffect(() => {
    if (items.length > 0) {
      saveLibraryToStorage(items);
      console.log(`Saved ${items.length} items to localStorage`);
    }
  }, [items]);

  // Handle sort change
  const handleSortChange = (newSortBy: string, newDirection: string | null = null) => {
    const direction = newDirection || (newSortBy === sortBy 
      ? (sortDirection === 'asc' ? 'desc' : 'asc') 
      : sortDirection);
    
    setSortBy(newSortBy);
    setSortDirection(direction);
  };
  
  // Handle filter change
  const handleFilterChange = (filterType: string) => {
    setFilters(prevFilters =>
      prevFilters.includes(filterType)
        ? prevFilters.filter(f => f !== filterType)
        : [...prevFilters, filterType]
    );
  };

  // Function for handling document deletion
  const handleDeleteDocument = (id: number) => {
    console.log(`Deleting document with ID: ${id}`);
    // Filter out the item with the matching ID
    const updatedItems = items.filter(item => item.id !== id);
    // Update state in parent component
    setLibraryItems(updatedItems);
    // Could also save to localStorage here, but the useEffect will handle it
  };

  // Function for handling document editing
  const handleEditDocument = (item: LibraryItem) => {
    console.log(`Editing document: ${item.title}`);
    // Here you would typically open a modal or navigate to an edit page
    // For simplicity, we'll just prompt for a new title
    const newTitle = prompt("Enter a new title for this document:", item.title);
    
    if (newTitle && newTitle !== item.title) {
      // Map through items and update the matching one
      const updatedItems = items.map(doc => 
        doc.id === item.id ? { ...doc, title: newTitle } : doc
      );
      // Update state in parent component
      setLibraryItems(updatedItems);
    }
  };

  // Function for handling document sharing
  const handleShareDocument = (item: LibraryItem) => {
    console.log(`Sharing document: ${item.title}`);
    
    // Create a dummy share URL (in a real app, this would be a proper sharing mechanism)
    const shareUrl = `https://yourdomain.com/shared/${item.id}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        alert(`Link copied to clipboard!\n\n${shareUrl}`);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
        alert(`Share link: ${shareUrl}`);
      });
  };

  // Filter and sort documents for library view
  const filteredItems = items
    .filter(item =>
      (searchQuery === '' ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.type.toLowerCase().includes(searchQuery.toLowerCase())
      ) &&
      (filters.length === 0 || filters.includes(getFileTypeKey(item)))
    )
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = (new Date(b.date).getTime() || 0) - (new Date(a.date).getTime() || 0);
      } else if (sortBy === 'title') {
        comparison = a.title.localeCompare(b.title);
      } else if (sortBy === 'type') {
        comparison = getFileTypeKey(a).localeCompare(getFileTypeKey(b));
      }

      return sortDirection === 'asc' ? comparison : comparison * -1;
    });

  return (
    <div className="dark:bg-gray-900 p-4 rounded-lg">
      <SearchAndFilter
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        viewMode={viewMode}
        setViewMode={setViewMode}
        sortFilterOpen={sortFilterOpen}
        setSortFilterOpen={setSortFilterOpen}
        sortBy={sortBy}
        sortDirection={sortDirection}
        filters={filters}
        handleSortChange={handleSortChange}
        handleFilterChange={handleFilterChange}
        availableTypes={availableTypes}
      />

      {filteredItems.length === 0 ? (
        <EmptyLibrary onUpload={onUpload} />
      ) : (
        <div className={viewMode === 'grid'
          ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5'
          : 'space-y-3'
        }>
          {filteredItems.map(item => (
            <DocumentCard
              key={item.id}
              document={item}
              viewMode={viewMode as "grid" | "list"}
              onSelect={onSelectItem}
              onDelete={handleDeleteDocument}
              onEdit={handleEditDocument}
              onShare={handleShareDocument}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentLibrary;