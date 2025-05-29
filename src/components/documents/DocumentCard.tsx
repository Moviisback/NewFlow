import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, X, Download, Trash, Share, Edit, Eye, MoreVertical, Check 
} from 'lucide-react';
import { DocumentCardProps } from './types';
import ProgressIndicator from './ProgressIndicator';
import { getFileTypeKey, getTypeIcon, typeColors } from './colorUtils';

// Enhanced document card component with improved dropdown positioning
const DocumentCard: React.FC<DocumentCardProps> = ({ 
  document: item, 
  onSelect, 
  viewMode = "grid",
  onDelete, // Add callback for deletion
  onEdit,   // Add callback for editing
  onShare   // Add callback for sharing
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  
  // Refs for menu positioning
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const fileTypeKey = getFileTypeKey(item);
  const typeColor = typeColors[fileTypeKey] || typeColors.default;
  const typeIcon = getTypeIcon(fileTypeKey);

  // Determine display type label (e.g., PDF, DOCX, Summary, Flashcard)
  const displayType = fileTypeKey.toUpperCase();

  // Calculate menu position when toggled
  useEffect(() => {
    if (showMenu && menuButtonRef.current) {
      const buttonRect = menuButtonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      // Calculate available space
      const spaceBelow = viewportHeight - buttonRect.bottom;
      const spaceRight = viewportWidth - buttonRect.right;
      
      // Set position in fixed coordinates relative to viewport
      const style: React.CSSProperties = {
        position: 'fixed',
        zIndex: 9999, // Very high z-index to ensure visibility
      };
      
      // Position horizontally - prefer right alignment
      if (spaceRight < 160) { // Not enough space to the right
        style.right = viewportWidth - buttonRect.left;
      } else {
        style.left = buttonRect.left;
      }
      
      // Position vertically - check if enough space below
      if (spaceBelow < 150) { // Not enough space below
        style.bottom = viewportHeight - buttonRect.top;
      } else {
        style.top = buttonRect.bottom + 5; // Add a small gap
      }
      
      setMenuStyle(style);
    }
  }, [showMenu]);

  // Close menu when clicking outside
  useEffect(() => {
    if (showMenu) {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          menuButtonRef.current && 
          !menuButtonRef.current.contains(event.target as Node) &&
          menuRef.current &&
          !menuRef.current.contains(event.target as Node)
        ) {
          setShowMenu(false);
        }
      };
      
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showMenu]);

  const handleAction = (action: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click when clicking action
    setShowMenu(false);

    switch (action) {
      case 'view':
        onSelect(item);
        break;
      case 'download':
        // Download logic
        const blob = new Blob([item.summary || item.content || ''], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = window.document.createElement('a');
        a.href = url;
        a.download = `${item.title}.${fileTypeKey === 'summary' ? 'txt' : fileTypeKey}`;
        window.document.body.appendChild(a);
        a.click();
        window.document.body.removeChild(a);
        URL.revokeObjectURL(url);
        break;
      case 'delete':
        // Confirm deletion before proceeding
        if (window.confirm(`Are you sure you want to delete "${item.title}"?`)) {
          if (onDelete) {
            onDelete(item.id);
          } else {
            console.warn('Delete action triggered but no onDelete handler provided');
          }
        }
        break;
      case 'share':
        if (onShare) {
          onShare(item);
        } else {
          console.warn('Share action triggered but no onShare handler provided');
          alert(`Sharing "${item.title}" (Implementation needed)`);
        }
        break;
      case 'edit':
        if (onEdit) {
          onEdit(item);
        } else {
          console.warn('Edit action triggered but no onEdit handler provided');
          alert(`Editing "${item.title}" (Implementation needed)`);
        }
        break;
      case 'preview':
        setShowPreview(!showPreview);
        break;
      default:
        break;
    }
  };

  // Dropdown menu component - rendered at document root level
  const DropdownMenu = () => {
    if (!showMenu) return null;
    
    return (
      <div 
        ref={menuRef}
        className="fixed rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1.5 shadow-lg w-40"
        style={menuStyle}
      >
        <button
          onClick={(e) => handleAction('edit', e)}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
        >
          <Edit size={14} className="text-gray-500 dark:text-gray-400" />
          <span>Edit</span>
        </button>
        <button
          onClick={(e) => handleAction('share', e)}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
        >
          <Share size={14} className="text-gray-500 dark:text-gray-400" />
          <span>Share</span>
        </button>
        <button
          onClick={(e) => handleAction('delete', e)}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
        >
          <Trash size={14} />
          <span>Delete</span>
        </button>
      </div>
    );
  };

  // Mouse enter handler for the card
  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  // Mouse leave handler for the card - DON'T close menu
  const handleMouseLeave = () => {
    setIsHovered(false);
    // We're NOT closing the menu on mouse leave anymore
    // Only close preview if shown
    if (showPreview) {
      setShowPreview(false);
    }
  };

  // Grid view card
  if (viewMode === "grid") {
    return (
      <>
        <div
          ref={cardRef}
          className={`relative overflow-hidden rounded-2xl border ${typeColor.border} dark:border-gray-700 bg-white dark:bg-gray-800 transition-all duration-300 cursor-pointer ${isHovered ? 'shadow-lg translate-y-[-4px]' : 'shadow-sm'}`}
          onClick={() => onSelect(item)}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Top accent bar */}
          <div className={`h-2 w-full ${typeColor.accent}`}></div>

          {/* Card content */}
          <div className="p-5">
            {/* Document icon and type */}
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${typeColor.bg} dark:bg-opacity-20 ${typeColor.border} dark:border-gray-600 flex-shrink-0`}>
                  {typeIcon}
                </div>
                <div className="flex flex-col gap-1">
                  <span className={`inline-flex items-center rounded-full border ${typeColor.border} dark:border-gray-600 px-2.5 py-0.5 text-xs font-medium ${typeColor.text} dark:text-gray-200`}>
                    {displayType}
                  </span>
                  {/* Subject Tag */}
                  <span className="inline-flex items-center rounded-full bg-purple-100 dark:bg-purple-900/30 px-2.5 py-0.5 text-xs font-medium text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-700">
                    Study Material
                  </span>
                </div>
              </div>
              {/* Verified Badge */}
              {item.validated &&
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-green-50 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700 flex-shrink-0">
                  <Check size={12} />
                  Verified
                </span>
              }
            </div>

            {/* Document title */}
            <h3 className="mb-1 line-clamp-2 font-medium text-base leading-tight text-gray-900 dark:text-gray-100" title={item.title}>
              {item.title}
            </h3>

            {/* Progress indicator */}
            <div className="mt-3 flex items-center gap-2">
              <ProgressIndicator percent={item.validationScore ?? 75} />
              <span className="text-xs text-gray-500 dark:text-gray-400">{item.validationScore ?? 75}% complete</span>
            </div>

            {/* Date and actions */}
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">{item.date}</span>

              {/* Quick actions */}
              <div className={`flex items-center transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                <button
                  onClick={(e) => handleAction('preview', e)}
                  className={`rounded-full p-1.5 ${showPreview ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  title="Quick Preview"
                >
                  <Eye size={16} />
                </button>
                <button
                  onClick={(e) => handleAction('download', e)}
                  className="rounded-full p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Download"
                >
                  <Download size={16} />
                </button>
                <button
                  ref={menuButtonRef}
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setShowMenu(!showMenu); 
                  }}
                  className="rounded-full p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="More options"
                >
                  <MoreVertical size={16} />
                </button>
              </div>
            </div>

            {/* Preview Panel */}
            {showPreview && (
              <div
                className="absolute inset-0 z-10 flex flex-col justify-between bg-white dark:bg-gray-800 bg-opacity-95 dark:bg-opacity-95 p-4 backdrop-blur-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 line-clamp-1">{item.title}</h4>
                    <button
                      onClick={(e) => handleAction('preview', e)}
                      className="rounded-full p-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="max-h-36 overflow-y-auto rounded-lg bg-gray-50 dark:bg-gray-700 p-2 text-xs text-gray-700 dark:text-gray-200">
                    <p>{item.summary?.substring(0, 250) || "No preview available."}...</p>
                  </div>
                </div>
                <div className="mt-2 flex justify-end">
                  <button
                    className="rounded-lg bg-indigo-600 dark:bg-indigo-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 dark:hover:bg-indigo-600"
                    onClick={(e) => handleAction('view', e)}
                  >
                    Open Full Summary
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Render dropdown menu outside card to avoid overflow containment issues */}
        <DropdownMenu />
      </>
    );
  }

  // List view card
  return (
    <>
      <div
        ref={cardRef}
        className={`relative flex items-center overflow-hidden rounded-xl border ${typeColor.border} dark:border-gray-700 bg-white dark:bg-gray-800 p-4 transition-all duration-300 cursor-pointer ${isHovered ? 'shadow-md translate-y-[-2px]' : 'shadow-sm'}`}
        onClick={() => onSelect(item)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Left accent border */}
        <div className={`absolute left-0 top-0 h-full w-1.5 ${typeColor.accent} rounded-l-xl`}></div>

        {/* Document icon */}
        <div className={`ml-1.5 mr-4 flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg ${typeColor.bg} dark:bg-opacity-20 ${typeColor.border} dark:border-gray-600`}>
          {typeIcon}
        </div>

        {/* Document info */}
        <div className="min-w-0 flex-1">
          <h3 className="mb-1 truncate font-medium text-gray-900 dark:text-gray-100" title={item.title}>
            {item.title}
          </h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className={`inline-flex items-center rounded-full border ${typeColor.border} dark:border-gray-600 px-2.5 py-0.5 text-xs font-medium ${typeColor.text} dark:text-gray-200`}>
              {displayType}
            </span>

            {/* Subject Tag */}
            <span className="inline-flex items-center rounded-full bg-purple-100 dark:bg-purple-900/30 px-2.5 py-0.5 text-xs font-medium text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-700">
              Study Material
            </span>

            <span className="text-xs text-gray-500 dark:text-gray-400">{item.date}</span>
            {item.validated &&
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700">
                <Check size={10} />
                Verified
              </span>
            }
          </div>
        </div>

        {/* Progress indicator */}
        <div className="mx-6 flex-shrink-0 hidden md:flex items-center gap-2">
          <ProgressIndicator percent={item.validationScore ?? 75} size="large" />
        </div>

        {/* Quick actions */}
        <div className={`ml-4 flex flex-shrink-0 items-center gap-1 sm:gap-2 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          <button
            onClick={(e) => handleAction('view', e)}
            className="rounded-full bg-indigo-50 dark:bg-indigo-900/30 p-2 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-800/40"
            title="View Details"
          >
            <Eye size={18} />
          </button>
          <button
            onClick={(e) => handleAction('download', e)}
            className="rounded-full bg-gray-50 dark:bg-gray-700 p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
            title="Download"
          >
            <Download size={18} />
          </button>
          <button
            ref={menuButtonRef}
            onClick={(e) => { 
              e.stopPropagation(); 
              setShowMenu(!showMenu); 
            }}
            className="rounded-full bg-gray-50 dark:bg-gray-700 p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
            title="More options"
          >
            <MoreVertical size={18} />
          </button>
        </div>
      </div>

      {/* Render dropdown menu outside card */}
      <DropdownMenu />
    </>
  );
};

export default DocumentCard;