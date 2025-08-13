/**
 * Glossary Page with glassmorphic design
 */

import React, { useState } from 'react';
import { BookOpen, ArrowLeft, Plus, Edit3, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
  category?: string;
}

// Mock glossary terms removed - starting with empty glossary

export const GlossaryPage: React.FC = () => {
  const navigate = useNavigate();
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTerm, setNewTerm] = useState({ term: '', definition: '', category: '' });

  const handleAddTerm = () => {
    if (newTerm.term && newTerm.definition) {
      const term: GlossaryTerm = {
        id: Date.now().toString(),
        ...newTerm
      };
      setTerms([...terms, term]);
      setNewTerm({ term: '', definition: '', category: '' });
      setShowAddForm(false);
    }
  };

  const handleDeleteTerm = (id: string) => {
    setTerms(terms.filter(term => term.id !== id));
  };

  return (
    <div className="min-h-screen font-sans text-white" style={{background: 'linear-gradient(135deg, #1F2937 0%, #374151 25%, #1E3A8A 50%, #0F766E 75%, #0D9488 100%)'}}>
      {/* Top Bar */}
      <header className="glass-header sticky top-0 z-30 mx-6 mt-6 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="ghost-button p-2"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-2xl font-semibold text-white">Glossary</h1>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-accent hover:bg-accent-hover text-white font-medium px-4 py-2 rounded-xl flex items-center gap-2 transition-all"
          >
            <Plus size={20} />
            Add Term
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header Card */}
          <div className="glass-card p-8 text-center">
            <BookOpen size={48} className="mx-auto text-white/60 mb-4" />
            <h2 className="text-hierarchy-h2 text-white mb-2">
              Term Definitions
            </h2>
            <p className="text-body max-w-2xl mx-auto">
              Define key terms and concepts to improve AI summarization accuracy and consistency.
              These definitions will be used to enhance understanding of your content.
            </p>
          </div>

          {/* Terms List */}
          <div className="space-y-4">
            {terms.map((term) => (
              <div key={term.id} className="glass-card p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-hierarchy-h3 text-white">{term.term}</h3>
                      {term.category && (
                        <span className="px-3 py-1 bg-white/10 text-white/80 text-sm rounded-full">
                          {term.category}
                        </span>
                      )}
                    </div>
                    <p className="text-body">{term.definition}</p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button className="glass-button-secondary p-2">
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteTerm(term.id)}
                      className="glass-button-secondary p-2 hover:bg-red-500/20"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {terms.length === 0 && (
            <div className="glass-card p-12 text-center">
              <BookOpen size={48} className="mx-auto text-white/40 mb-4" />
              <h3 className="text-hierarchy-h3 text-white mb-2">No Terms Defined</h3>
              <p className="text-body mb-6">
                Start building your glossary by adding key terms and definitions.
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="glass-button-primary"
              >
                Add Your First Term
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Add Term Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6">
            <h3 className="text-hierarchy-h3 text-white mb-4">Add New Term</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Term
                </label>
                <input
                  type="text"
                  value={newTerm.term}
                  onChange={(e) => setNewTerm({ ...newTerm, term: e.target.value })}
                  className="glass-input w-full"
                  placeholder="Enter term..."
                />
              </div>
              
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Definition
                </label>
                <textarea
                  value={newTerm.definition}
                  onChange={(e) => setNewTerm({ ...newTerm, definition: e.target.value })}
                  className="glass-input w-full h-24 resize-none"
                  placeholder="Enter definition..."
                />
              </div>
              
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Category (Optional)
                </label>
                <input
                  type="text"
                  value={newTerm.category}
                  onChange={(e) => setNewTerm({ ...newTerm, category: e.target.value })}
                  className="glass-input w-full"
                  placeholder="e.g., Techniques, Concepts..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddForm(false)}
                className="glass-button-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTerm}
                className="glass-button-primary flex-1"
                disabled={!newTerm.term || !newTerm.definition}
              >
                Add Term
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
