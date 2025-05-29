import React from 'react';
import { Search, Filter, Grid, List, ChevronDown, X, Check, ChevronRight } from 'lucide-react';
import { SearchAndFilterProps } from './types';
import { typeColors } from './colorUtils';

const SearchAndFilter: React.FC<SearchAndFilterProps> = ({
  searchQuery,
  setSearchQuery,
  viewMode,
  setViewMode,
  sortFilterOpen,
  setSortFilterOpen,
  sortBy,
  sortDirection,
  filters,
  handleSortChange,
  handleFilterChange,
  availableTypes
}) => {
  // Simplified type filters based on available types
  const simpleTypeFilters = ['pdf', 'docx', 'summary', 'flashcard'].filter(t => 
    availableTypes.includes(t)
  );

  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
      {/* Search Input */}
      <div className="relative flex-grow min-w-[250px] sm:min-w-[300px] md:max-w-md lg:max-w-lg">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
          <Search size={18} className="text-indigo-400 dark:text-indigo-300" />
        </div>
        <input
          type="text"
          className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-2.5 pl-10 pr-4 shadow-sm focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-sm text-gray-800 dark:text-gray-200"
          placeholder="Search documents, subjects, or content..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="flex items-center flex-wrap gap-3">
        {/* Simplified File type filter toggles */}
        <div className="flex items-center gap-2 flex-wrap">
          {simpleTypeFilters.map(typeKey => {
            const typeStyle = typeColors[typeKey] || typeColors.default;
            const isActive = filters.includes(typeKey);
            return (
              <button
                key={typeKey}
                onClick={() => handleFilterChange(typeKey)}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
                  isActive
                    ? `${typeStyle.light} ${typeStyle.text} ${typeStyle.border} ring-1 ring-offset-1 ${typeStyle.border} dark:bg-opacity-20 dark:text-gray-200`
                    : `bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600`
                }`}
              >
                {typeKey.toUpperCase()}
                {isActive && <Check size={12} className="ml-0.5" />}
              </button>
            )
          })}
        </div>

        {/* More Filters Button & Dropdown */}
        <div className="relative">
          <button
            className="flex items-center gap-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300"
            onClick={() => setSortFilterOpen(!sortFilterOpen)}
          >
            <Filter size={16} className="text-gray-500 dark:text-gray-400" />
            <span>Sort & Filter</span>
            <ChevronDown size={16} className={`text-gray-500 dark:text-gray-400 transition-transform ${sortFilterOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Advanced filter dropdown */}
          {sortFilterOpen && (
            <div className="absolute right-0 top-full z-20 mt-2 w-72 sm:w-80 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-xl">
              {/* Close button */}
              <button
                className="absolute top-2 right-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                onClick={() => setSortFilterOpen(false)}
              >
                <X size={18} />
              </button>

              {/* Sort By */}
              <div className="mb-5">
                <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Sort by</h3>
                <div className="grid grid-cols-3 gap-2">
                  {['date', 'title', 'type'].map(sortKey => (
                    <button
                      key={sortKey}
                      className={`flex flex-col items-center justify-center rounded-lg p-2.5 text-xs transition-colors ${sortBy === sortKey
                          ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-200 dark:ring-indigo-700 font-medium'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      onClick={() => handleSortChange(sortKey)}
                    >
                      <span className="capitalize">{sortKey}</span>
                      {sortBy === sortKey && <Check size={12} className="mt-1" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort Direction */}
              <div className="mb-5">
                <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">Direction</h3>
                <div className="flex gap-2">
                  <button
                    className={`flex-1 flex flex-col items-center justify-center rounded-lg p-2 text-xs transition-colors ${sortDirection === 'asc'
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-200 dark:ring-indigo-700 font-medium'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    onClick={() => handleSortChange(sortBy, 'asc')}
                  >
                    <span className="mb-1">Ascending</span>
                    <ChevronRight size={14} className="rotate-90 transform" />
                  </button>
                  <button
                    className={`flex-1 flex flex-col items-center justify-center rounded-lg p-2 text-xs transition-colors ${sortDirection === 'desc'
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-200 dark:ring-indigo-700 font-medium'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    onClick={() => handleSortChange(sortBy, 'desc')}
                  >
                    <span className="mb-1">Descending</span>
                    <ChevronRight size={14} className="-rotate-90 transform" />
                  </button>
                </div>
              </div>

              {/* Filter by Format Type */}
              <div className="mb-5">
                <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Format Type</h3>
                <div className="grid grid-cols-2 gap-2">
                  {availableTypes.map(filterKey => (
                    <button
                      key={filterKey}
                      className={`flex items-center justify-center gap-1.5 rounded-lg p-2 text-xs transition-colors ${filters.includes(filterKey)
                          ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-200 dark:ring-indigo-700 font-medium'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      onClick={() => handleFilterChange(filterKey)}
                    >
                      <Check size={12} className={filters.includes(filterKey) ? 'opacity-100' : 'opacity-0'} />
                      <span className="capitalize">{filterKey}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Example Subject Tags (Static) */}
              <div className="mb-5">
                <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Subject Tags</h3>
                <div className="flex flex-wrap gap-1.5">
                  <button className="rounded-full bg-blue-100 dark:bg-blue-900/40 px-3 py-1 text-xs font-medium text-blue-800 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/60">
                    Biology
                  </button>
                  <button className="rounded-full bg-purple-100 dark:bg-purple-900/40 px-3 py-1 text-xs font-medium text-purple-800 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800/60">
                    Psychology
                  </button>
                  <button className="rounded-full bg-gray-100 dark:bg-gray-700 px-3 py-1 text-xs font-medium text-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">
                    + Add Tag
                  </button>
                </div>
              </div>

              {/* Status Filter (Placeholder) */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Status</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button className="flex items-center justify-center gap-1 rounded-lg bg-gray-100 dark:bg-gray-700 p-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">
                    <Check size={12} className="opacity-0" />
                    <span>Verified</span>
                  </button>
                  <button className="flex items-center justify-center gap-1 rounded-lg bg-gray-100 dark:bg-gray-700 p-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">
                    <Check size={12} className="opacity-0" />
                    <span>Unverified</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
          <button
            className={`p-2.5 transition-colors ${viewMode === 'grid' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            onClick={() => setViewMode('grid')}
            title="Grid view"
          >
            <Grid size={18} />
          </button>
          <button
            className={`p-2.5 transition-colors ${viewMode === 'list' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            onClick={() => setViewMode('list')}
            title="List view"
          >
            <List size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchAndFilter;