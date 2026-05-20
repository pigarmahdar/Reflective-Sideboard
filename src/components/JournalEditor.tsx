/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { JournalEntry } from '../types';
import { CardSidebar } from './CardSidebar';
import { ScryfallService } from '../services/scryfall';
import { 
  Download, 
  Trash2, 
  Tag as TagIcon, 
  X, 
  Menu,
  Eye, 
  Edit3, 
  Sparkles,
  Command
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { saveAs } from 'file-saver';

interface JournalEditorProps {
  entry: JournalEntry;
  onChange: (updates: Partial<JournalEntry>) => void;
  onDelete: () => void;
  onOpenSidebar: () => void;
}

export const JournalEditor: React.FC<JournalEditorProps> = ({ entry, onChange, onDelete, onOpenSidebar }) => {
  const [view, setView] = useState<'edit' | 'preview'>('edit');
  const [hoveredCardName, setHoveredCardName] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionCursor, setSuggestionCursor] = useState(-1);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Scryfall Autocomplete logic
  useEffect(() => {
    const lastWord = entry.content.split(/\s+/).pop() || '';
    if (lastWord.startsWith('@') && lastWord.length > 2) {
      const query = lastWord.slice(1);
      ScryfallService.autocomplete(query).then(setSuggestions);
      setShowSuggestions(true);
    } else if (lastWord.includes('[[') && lastWord.endsWith(']]')) {
      // Logic for inline completed cards maybe? 
      // For now we rely on the @ trigger for autocomplete
      setShowSuggestions(false);
    } else {
      setShowSuggestions(false);
    }
  }, [entry.content]);

  const handleApplySuggestion = (suggestion: string) => {
    const newContent = entry.content.replace(/(^|\s)@\S*$/, `$1[[${suggestion}]] `);
    onChange({ content: newContent });
    setShowSuggestions(false);
    editorRef.current?.focus();
  };

  const handleExport = () => {
    const markdown = `# ${entry.title}\n\nDate: ${entry.date}\nTags: ${entry.tags.join(', ')}\n\n---\n\n${entry.content}`;
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    saveAs(blob, `${entry.title.toLowerCase().replace(/\s+/g, '-') || 'entry'}.md`);
  };

  const addTag = (e: React.FormEvent) => {
    e.preventDefault();
    const tag = newTag.trim().toLowerCase();
    if (tag && !entry.tags.includes(tag)) {
      onChange({ tags: [...entry.tags, tag] });
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    onChange({ tags: entry.tags.filter(t => t !== tag) });
  };

  // Helper to parse content for rendering
  const renderContent = (content: string) => {
    // Replace [[card name]] with a custom tag that we can handle in react-markdown components
    // Actually, react-markdown works better if we use standard markdown and then handle it in components
    // But [[card]] isn't standard. Let's pre-process it to something like <card-mention name="card">card</card-mention>
    const processed = content.replace(/\[\[(.*?)\]\]/g, (match, name) => {
      return `[${name}](#card-${encodeURIComponent(name)})`;
    });
    return processed;
  };

  return (
    <main className="flex-1 flex flex-col min-w-0 bg-slate-950 h-full relative">
      {/* Header */}
      <header className="h-16 border-b border-slate-800 flex items-center justify-between px-4 lg:px-8 bg-slate-950/80 backdrop-blur-md sticky top-0 z-10 shrink-0">
        <div className="flex-1 flex items-center gap-3 lg:gap-6">
          <button 
            onClick={onOpenSidebar}
            className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg border border-slate-800 bg-slate-900"
          >
            <Menu className="w-5 h-5" />
          </button>
          <input 
            type="text"
            value={entry.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Entry Title..."
            className="bg-transparent border-none focus:ring-0 text-xl lg:text-2xl font-bold text-white w-full placeholder:text-slate-700 font-serif"
          />
          <div className="hidden lg:flex items-center gap-2 flex-wrap">
            {entry.tags.map(tag => (
              <span key={tag} className="text-xs font-semibold px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded flex items-center gap-1 group">
                #{tag}
                <button onClick={() => removeTag(tag)} className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <form onSubmit={addTag} className="relative">
              <input 
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="+ tag"
                className="text-[10px] bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-slate-500 focus:outline-none focus:border-indigo-500 w-16 transition-all"
              />
            </form>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-900/50 p-1 rounded-lg flex items-center mr-4 border border-slate-800 backdrop-blur-sm self-center">
             <button 
               onClick={() => setView('edit')}
               className={cn(
                 "flex items-center gap-2 px-4 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all",
                 view === 'edit' ? "bg-indigo-600 shadow-sm text-white" : "text-slate-500 hover:text-slate-400"
               )}
             >
               <Edit3 className="w-3.5 h-3.5" /> Write
             </button>
             <button 
               onClick={() => setView('preview')}
               className={cn(
                 "flex items-center gap-2 px-4 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all",
                 view === 'preview' ? "bg-indigo-600 shadow-sm text-white" : "text-slate-500 hover:text-slate-400"
               )}
             >
               <Eye className="w-3.5 h-3.5" /> Preview
             </button>
          </div>

          <button onClick={handleExport} className="btn-icon" title="Export Markdown">
            <Download className="w-4 h-4" />
          </button>
          <button onClick={onDelete} className="btn-icon hover:text-red-400" title="Delete Entry">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Editor/Preview Area */}
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 overflow-y-auto p-6 lg:p-12 lg:px-24 relative selection:bg-indigo-500/40">
          <div className="max-w-3xl mx-auto">
            <div className="mb-4 lg:mb-8">
              <div className="text-indigo-400 text-xs lg:text-sm font-mono mb-2 uppercase tracking-tighter">
                {new Date(entry.date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
  
            <AnimatePresence mode="wait">
              {view === 'edit' ? (
                <motion.div 
                  key="edit"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="min-h-[500px] relative"
                >
                  <textarea
                    ref={editorRef}
                    value={entry.content}
                    onChange={(e) => onChange({ content: e.target.value })}
                    placeholder="# Start writing...
Use markdown formatting for headers, lists, and links.
Use @ to mention a card."
                    className="w-full h-full min-h-[500px] resize-none bg-transparent focus:outline-none font-mono text-sm leading-relaxed text-slate-300 placeholder:text-slate-700"
                  />
                  
                  {/* Autocomplete Suggestions */}
                  <AnimatePresence>
                    {showSuggestions && suggestions.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute bottom-full left-0 mb-4 w-64 bg-slate-900 rounded-xl shadow-2xl border border-slate-800 overflow-hidden z-20"
                      >
                        <div className="px-3 py-2 bg-slate-800/50 border-b border-slate-800 flex items-center gap-2">
                           <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                           <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Oracle Prediction</span>
                        </div>
                        <div className="max-h-68 overflow-y-auto">
                          {suggestions.map((s, i) => (
                            <button
                              key={s}
                              onClick={() => handleApplySuggestion(s)}
                              className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:bg-indigo-600/10 hover:text-indigo-400 border-b border-slate-800 last:border-0 transition-colors font-medium flex items-center justify-between"
                            >
                              {s}
                              <Command className="w-2.5 h-2.5 opacity-30" />
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <motion.div 
                  key="preview"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="prose prose-invert prose-slate prose-indigo max-w-none prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline"
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({ node, ...props }) => {
                        const isCard = props.href?.startsWith('#card-');
                        if (isCard) {
                          const name = decodeURIComponent(props.href!.replace('#card-', ''));
                          return (
                            <span 
                              className="card-mention cursor-pointer"
                              onMouseEnter={() => setHoveredCardName(name)}
                              onClick={() => setHoveredCardName(name)}
                            >
                              {props.children}
                            </span>
                          );
                        }
                        return <a target="_blank" rel="noopener noreferrer" {...props} />;
                      }
                    }}
                  >
                    {renderContent(entry.content)}
                  </ReactMarkdown>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        {/* Card Sidebar */}
        <AnimatePresence initial={false}>
          {view === 'preview' && (
            <>
              {/* Mobile overlay for sidebar */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 z-20 md:hidden"
                style={{ display: hoveredCardName ? 'block' : 'none' }}
                onClick={() => setHoveredCardName(null)}
              />
              <motion.div
                initial={{ width: 0, opacity: 0, y: 50 }}
                animate={{ 
                  width: window.innerWidth < 768 ? '100%' : 384, 
                  opacity: 1,
                  y: 0 
                }}
                exit={{ width: 0, opacity: 0, y: 50 }}
                transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                className={cn(
                  "shrink-0 overflow-hidden shadow-2xl bg-slate-900/90 md:bg-slate-900/30 border-t md:border-t-0 md:border-l border-slate-800 z-30",
                  "fixed md:static bottom-0 left-0 right-0 h-[60vh] md:h-auto rounded-t-2xl md:rounded-none"
                )}
                style={{
                  display: window.innerWidth < 768 && !hoveredCardName ? 'none' : 'block'
                }}
              >
                <div className="w-full md:w-[384px] h-full relative"> 
                   <CardSidebar cardName={hoveredCardName} />
                   <button 
                     onClick={() => setHoveredCardName(null)}
                     className="md:hidden absolute top-4 right-4 p-2 bg-slate-800/80 rounded-full text-slate-400 hover:text-white"
                   >
                     <X className="w-4 h-4" />
                   </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
      
      {/* Footer Info Area */}
      <footer className="h-10 border-t border-slate-800 px-4 lg:px-8 flex items-center text-slate-600 font-mono text-[9px] lg:text-[10px] space-x-3 lg:space-x-6 bg-slate-950 shrink-0">
        <span>Words: {entry.content.trim() ? entry.content.trim().split(/\s+/).length : 0}</span>
        <span>Chars: {entry.content.length}</span>
        <div className="flex-1"></div>
        <div className="flex items-center space-x-2 lg:space-x-4">
          <span className="flex items-center space-x-1.5 hidden sm:flex">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            <span>Cloud Synced</span>
          </span>
          <span className="text-[8px] lg:text-[9px] uppercase tracking-widest text-slate-700">MD v1.0</span>
        </div>
      </footer>
    </main>
  );
};
