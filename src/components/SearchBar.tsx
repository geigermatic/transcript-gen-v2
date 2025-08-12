import { useState, useEffect } from 'react';
import { useAppStore } from '../store';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export function SearchBar({ onSearch, placeholder = "Search documents..." }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { addLog } = useAppStore();

  useEffect(() => {
    // Debounce search to avoid too many filter operations
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim() !== '') {
        addLog({
          level: 'info',
          category: 'library-management',
          message: `Filter applied: "${searchQuery}"`,
          details: { query: searchQuery }
        });
      }
      onSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, onSearch, addLog]);

  const handleClear = () => {
    setSearchQuery('');
    onSearch('');
    addLog({
      level: 'info',
      category: 'library-management',
      message: 'Search filter cleared'
    });
  };

  return (
    <div className="relative">
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            🔍
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={placeholder}
            className="glass-input w-full pl-10 pr-10"
          />
          {searchQuery && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      
      {searchQuery && (
        <div className="mt-2 text-sm text-gray-400">
          Searching for: "{searchQuery}"
        </div>
      )}
    </div>
  );
}
