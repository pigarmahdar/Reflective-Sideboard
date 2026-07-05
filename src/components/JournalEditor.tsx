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

const ALL_PROMPTS = [
  // Match Reflection
  "What matchup surprised you this week?",
  "Which decision are you still thinking about?",
  "What would you sideboard differently next time?",

  // Deckbuilding & Brewing
  "What's the deck idea that won't leave your head?",
  "If you could change one card in your current list, what would it be and why?",
  "What interaction have you discovered that nobody's talking about?",

  // Growth & Goals
  "What's one thing you learned about your play style recently?",
  "What archetype do you keep avoiding — and what happens if you try it?",
  "What would make you feel like a better player six months from now?",

  // Community & Story
  "What's the best play someone else made against you lately?",
  "Who at your LGS is brewing something you want to learn from?",
  "What moment at your last event made you remember why you play?",

  // Card Discovery & Commanders
  "What obscure or underplayed card did you find that deserves a second look?",
  "Which legendary creature has sparked a new Commander deck idea for you recently?",
  "What's a card from a recent set that completely changes how you build your sideboard?",
  "If you were to build a deck around a completely new commander today, who would it be?",
  "What hidden synergy did you find between a classic card and a newly spoiled one?"
];

interface JournalEditorProps {
  entry: JournalEntry;
  onChange: (updates: Partial<JournalEntry>) => void;
  onDelete: () => void;
  onOpenSidebar: () => void;
  isSaving?: boolean;
}

export const JournalEditor: React.FC<JournalEditorProps> = ({ entry, onChange, onDelete, onOpenSidebar, isSaving = false }) => {
  const [view, setView] = useState<'edit' | 'preview'>('edit');
  const [hoveredCardName, setHoveredCardName] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionCursor, setSuggestionCursor] = useState(-1);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Reset interacted state when switching entries
  useEffect(() => {
    setInteracted(false);
  }, [entry.id]);

  // Select 5-6 random prompts
  const activePrompts = React.useMemo(() => {
    const shuffled = [...ALL_PROMPTS].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 6);
  }, [entry.id]);

  const shouldShowPrompts = !interacted && !entry.title.trim() && !entry.content.trim() && view === 'edit';

  const handleSelectPrompt = (promptText: string) => {
    onChange({ content: promptText + "\n\n" });
    setInteracted(true);
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.focus();
        editorRef.current.setSelectionRange(promptText.length + 2, promptText.length + 2);
      }
    }, 0);
  };

  // Scryfall Autocomplete logic
  useEffect(() => {
    const textarea = editorRef.current;
    if (!textarea) return;

    const handleSelectionAndInput = () => {
      const text = entry.content;
      const cursorPos = textarea.selectionStart || text.length;
      const textBeforeCursor = text.slice(0, cursorPos);

      // Match [[ followed by any characters that are not closing braces or newlines
      const braceMatch = textBeforeCursor.match(/\[\[([^\]\n]*)$/);
      const atMatch = textBeforeCursor.match(/@(\S*)$/);

      if (braceMatch) {
        const query = braceMatch[1];
        if (query.length >= 2) {
          ScryfallService.autocomplete(query).then(setSuggestions);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } else if (atMatch) {
        const query = atMatch[1];
        if (query.length >= 2) {
          ScryfallService.autocomplete(query).then(setSuggestions);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } else {
        setShowSuggestions(false);
      }
    };

    // Run on content load / content change
    handleSelectionAndInput();

    // Attach keyboard and click listener to reactive capture caret/cursor changes
    textarea.addEventListener('keyup', handleSelectionAndInput);
    textarea.addEventListener('click', handleSelectionAndInput);

    return () => {
      textarea.removeEventListener('keyup', handleSelectionAndInput);
      textarea.removeEventListener('click', handleSelectionAndInput);
    };
  }, [entry.content]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Cmd+P / Ctrl+P to toggle preview
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        setView(prev => prev === 'edit' ? 'preview' : 'edit');
      }
      // Cmd+/ or Ctrl+/ to toggle shortcuts modal
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setShowShortcuts(prev => !prev);
      }
      if (e.key === 'Escape') {
        setShowShortcuts(false);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Dynamically adjust textarea height to fit content and remove unnecessary scroll gaps
  useEffect(() => {
    const textarea = editorRef.current;
    if (textarea && view === 'edit') {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [entry.content, view]);

  const handleApplySuggestion = (suggestion: string) => {
    const textarea = editorRef.current;
    if (!textarea) return;

    const text = entry.content;
    const cursorPos = textarea.selectionStart || text.length;
    const textBeforeCursor = text.slice(0, cursorPos);
    const textAfterCursor = text.slice(cursorPos);

    let newTextBeforeCursor = textBeforeCursor;

    if (textBeforeCursor.match(/\[\[[^\]\n]*$/)) {
      newTextBeforeCursor = textBeforeCursor.replace(/\[\[[^\]\n]*$/, `[[${suggestion}]] `);
    } else if (textBeforeCursor.match(/@\S*$/)) {
      newTextBeforeCursor = textBeforeCursor.replace(/@\S*$/, `[[${suggestion}]] `);
    }

    const newContent = newTextBeforeCursor + textAfterCursor;
    onChange({ content: newContent });
    setShowSuggestions(false);
    setSuggestionCursor(-1);

    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.focus();
        const newCursorPos = newTextBeforeCursor.length;
        editorRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleMarkdownShortcut = (type: 'bold' | 'italic' | 'code' | 'card') => {
    const textarea = editorRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = entry.content;
    
    const selectedText = text.slice(start, end);
    const before = text.slice(0, start);
    const after = text.slice(end);

    let prefix = '';
    let suffix = '';

    switch (type) {
      case 'bold':
        prefix = '**';
        suffix = '**';
        break;
      case 'italic':
        prefix = '*';
        suffix = '*';
        break;
      case 'code':
        prefix = '`';
        suffix = '`';
        break;
      case 'card':
        prefix = '[[';
        suffix = ']]';
        break;
    }

    let newContent = '';
    let newStart = start;
    let newEnd = end;

    // Check if it is already wrapped
    if (before.endsWith(prefix) && after.startsWith(suffix)) {
      // Unwrap
      newContent = before.slice(0, before.length - prefix.length) + selectedText + after.slice(suffix.length);
      newStart = start - prefix.length;
      newEnd = end - prefix.length;
    } else if (selectedText.startsWith(prefix) && selectedText.endsWith(suffix)) {
      // Unwrap from selection inner boundaries
      newContent = before + selectedText.slice(prefix.length, selectedText.length - suffix.length) + after;
      newStart = start;
      newEnd = end - prefix.length - suffix.length;
    } else {
      // Wrap
      newContent = before + prefix + selectedText + suffix + after;
      newStart = start + prefix.length;
      newEnd = end + prefix.length;
    }

    onChange({ content: newContent });
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.focus();
        editorRef.current.setSelectionRange(newStart, newEnd);
      }
    }, 0);
  };

  const handleLinkShortcut = () => {
    const textarea = editorRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = entry.content;
    
    const selectedText = text.slice(start, end);
    const before = text.slice(0, start);
    const after = text.slice(end);

    let newContent = "";
    let newStart = start;
    let newEnd = end;

    if (selectedText) {
      newContent = before + `[${selectedText}](https://)` + after;
      newStart = start + 1;
      newEnd = start + 1 + selectedText.length;
    } else {
      newContent = before + "[link text](https://)" + after;
      newStart = start + 1;
      newEnd = start + 10;
    }

    onChange({ content: newContent });
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.focus();
        editorRef.current.setSelectionRange(newStart, newEnd);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handling Scryfall suggestions if active
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSuggestionCursor(prev => (prev + 1) % suggestions.length);
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSuggestionCursor(prev => (prev - 1 + suggestions.length) % suggestions.length);
        return;
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selectedIndex = suggestionCursor >= 0 ? suggestionCursor : 0;
        if (suggestions[selectedIndex]) {
          handleApplySuggestion(suggestions[selectedIndex]);
        }
        return;
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowSuggestions(false);
        setSuggestionCursor(-1);
        return;
      }
    }

    // Markdown modifier shortcuts when typing in the textarea
    if (e.metaKey || e.ctrlKey) {
      const key = e.key.toLowerCase();
      if (key === 'b') {
        e.preventDefault();
        handleMarkdownShortcut('bold');
      } else if (key === 'i') {
        e.preventDefault();
        handleMarkdownShortcut('italic');
      } else if (key === 'e') {
        e.preventDefault();
        handleMarkdownShortcut('code');
      } else if (key === 'g') {
        e.preventDefault();
        handleMarkdownShortcut('card');
      } else if (key === 'k') {
        e.preventDefault();
        handleLinkShortcut();
      }
    }
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
            onFocus={() => setInteracted(true)}
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
                  className="min-h-[150px] relative font-mono flex flex-col"
                >
                  {shouldShowPrompts && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="border border-dashed border-slate-800 bg-slate-900/10 rounded-xl p-5 mb-6 relative select-none cursor-pointer hover:border-slate-700 transition-colors"
                      onClick={() => {
                        setInteracted(true);
                        setTimeout(() => editorRef.current?.focus(), 0);
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setInteracted(true);
                        }}
                        className="absolute top-4 right-4 p-1 text-slate-600 hover:text-slate-400 hover:bg-slate-800/40 rounded transition-all"
                        title="Dismiss prompts"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex items-center gap-2 mb-3.5 text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-widest">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Reflective Sideboard Prompts</span>
                      </div>

                      <div className="space-y-2">
                        {activePrompts.map((promptText, i) => (
                          <div
                            key={i}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectPrompt(promptText);
                            }}
                            className="flex items-start gap-2 text-slate-500/90 hover:text-indigo-300 transition-all text-xs lg:text-sm font-sans cursor-pointer group py-0.5"
                          >
                            <span className="text-indigo-500/40 group-hover:text-indigo-400 transition-colors mt-0.5 select-none text-[10px]">✦</span>
                            <span className="leading-relaxed">{promptText}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                  <textarea
                    ref={editorRef}
                    value={entry.content}
                    onChange={(e) => onChange({ content: e.target.value })}
                    onFocus={() => setInteracted(true)}
                    onKeyDown={handleKeyDown}
                    placeholder="# Start writing...
Use standard markdown formatting for headers, lists, and links.
Press [[ or @ to trigger card name suggestions instantly!"
                    className="w-full min-h-[150px] resize-none overflow-hidden bg-transparent focus:outline-none text-sm leading-relaxed text-slate-300 placeholder:text-slate-700"
                  />
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
          {(view === 'preview' || (view === 'edit' && showSuggestions && suggestions.length > 0)) && (
            <>
              {/* Mobile overlay for sidebar */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 z-20 md:hidden"
                style={{ display: (view === 'preview' && hoveredCardName) || (view === 'edit' && showSuggestions && suggestions.length > 0) ? 'block' : 'none' }}
                onClick={() => {
                  if (view === 'edit') {
                    setShowSuggestions(false);
                    setSuggestionCursor(-1);
                  } else {
                    setHoveredCardName(null);
                  }
                }}
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
                  "shrink-0 overflow-hidden flex flex-col shadow-2xl bg-slate-900/90 md:bg-slate-900/30 border-t md:border-t-0 md:border-l border-slate-800 z-30",
                  "fixed md:static bottom-0 left-0 right-0 h-[60vh] md:h-auto rounded-t-2xl md:rounded-none"
                )}
                style={{
                  display: window.innerWidth < 768 && (view === 'preview' ? !hoveredCardName : !(showSuggestions && suggestions.length > 0)) ? 'none' : 'block'
                }}
              >
                <div className="w-full md:w-[384px] h-full relative flex flex-col"> 
                   {view === 'edit' ? (
                     <div className="flex flex-col h-full bg-slate-900/50 pt-2">
                        <div className="px-5 py-4 bg-slate-800/20 border-b border-slate-800 flex items-center gap-2 shrink-0">
                           <Sparkles className="w-4 h-4 text-indigo-400" />
                           <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Oracle Prediction</span>
                        </div>
                        <div className="flex-1 overflow-y-auto w-full">
                          {suggestions.map((s, i) => (
                            <button
                              key={s}
                              onClick={() => handleApplySuggestion(s)}
                              className={cn(
                                "w-full text-left px-5 py-3 text-sm border-b border-slate-800/50 last:border-0 transition-colors font-medium flex items-center justify-between",
                                i === suggestionCursor
                                  ? "bg-indigo-600 text-white"
                                  : "text-slate-300 hover:bg-slate-800/50 hover:text-indigo-400"
                              )}
                            >
                              {s}
                              <Command className="w-3 h-3 opacity-30" />
                            </button>
                          ))}
                        </div>
                     </div>
                   ) : (
                     <CardSidebar cardName={hoveredCardName} />
                   )}
                   <button 
                     onClick={() => {
                       if (view === 'edit') {
                         setShowSuggestions(false);
                         setSuggestionCursor(-1);
                       } else {
                         setHoveredCardName(null);
                       }
                     }}
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
      <footer className="h-10 border-t border-slate-800 px-4 lg:px-8 flex items-center text-slate-600 font-mono text-[9px] lg:text-[10px] space-x-3 lg:space-x-6 bg-slate-950 shrink-0 select-none">
        <span>Words: {entry.content.trim() ? entry.content.trim().split(/\s+/).length : 0}</span>
        <span>Chars: {entry.content.length}</span>
        <span>Est. Read Time: {Math.ceil((entry.content.trim() ? entry.content.trim().split(/\s+/).length : 0) / 200)} {Math.ceil((entry.content.trim() ? entry.content.trim().split(/\s+/).length : 0) / 200) === 1 ? 'min' : 'mins'}</span>
        <div className="flex-1"></div>
        <div className="flex items-center space-x-2 lg:space-x-4">
          <button 
            onClick={() => setShowShortcuts(true)}
            className="flex items-center gap-1 hover:text-indigo-400 transition-colors py-1 cursor-pointer mr-2 text-slate-400 font-medium"
            title="Keyboard Shortcuts Guide (Ctrl+/)"
          >
            <Command className="w-3 h-3 text-indigo-400" />
            <span className="text-[9px] lg:text-[10px]">Shortcuts</span>
          </button>
          <span className="text-slate-800">|</span>
          <span className="flex items-center space-x-1.5 font-medium transition-all duration-300">
            {isSaving ? (
              <>
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                <span className="text-amber-500">Saving...</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                <span className="text-emerald-500/70">All changes saved</span>
              </>
            )}
          </span>
          <span className="text-slate-800">|</span>
          <span className="text-[8px] lg:text-[9px] uppercase tracking-widest text-slate-700">MD v1.0</span>
        </div>
      </footer>

      {/* Keyboard Shortcuts Modal */}
      <AnimatePresence>
        {showShortcuts && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowShortcuts(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-800 rounded-xl max-w-sm md:max-w-md w-full p-6 shadow-2xl relative"
            >
              <button
                onClick={() => setShowShortcuts(false)}
                className="absolute top-4 right-4 p-1.5 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2 mb-5">
                <Command className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Keyboard Shortcuts Guide</h3>
              </div>
              <div className="space-y-5">
                <div>
                  <div className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider mb-2.5">System & Navigation</div>
                  <div className="space-y-2 font-mono text-[11px]">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                      <span className="text-slate-400">Create New Entry</span>
                      <kbd className="bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-[10px] text-slate-200">⌘N / Ctrl+N</kbd>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                      <span className="text-slate-400">Toggle View / Preview</span>
                      <kbd className="bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-[10px] text-slate-200">⌘P / Ctrl+P</kbd>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                      <span className="text-slate-400">Manual Save Trigger</span>
                      <kbd className="bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-[10px] text-slate-200">⌘S / Ctrl+S</kbd>
                    </div>
                    <div className="flex items-center justify-between pb-0.5">
                      <span className="text-slate-400">Toggle This Guide</span>
                      <kbd className="bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-[10px] text-slate-200">⌘/ / Ctrl+/</kbd>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider mb-2.5">Markdown Editor & MTG Cards</div>
                  <div className="space-y-2 font-mono text-[11px]">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                      <span className="text-slate-400">Bold Selection</span>
                      <kbd className="bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-[10px] text-slate-200">⌘B / Ctrl+B</kbd>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                      <span className="text-slate-400">Italic Selection</span>
                      <kbd className="bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-[10px] text-slate-200">⌘I / Ctrl+I</kbd>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                      <span className="text-slate-400">Inline Code Block</span>
                      <kbd className="bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-[10px] text-slate-200">⌘E / Ctrl+E</kbd>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                      <span className="text-slate-400">Insert Web Link</span>
                      <kbd className="bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-[10px] text-slate-200">⌘K / Ctrl+K</kbd>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                      <span className="text-slate-400">Wrap with Card notation</span>
                      <kbd className="bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-[10px] text-slate-200">⌘G / Ctrl+G</kbd>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                      <span className="text-slate-400">Predictive Autocomplete</span>
                      <kbd className="bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-[10px] text-slate-200">[[ or @</kbd>
                    </div>
                    <div className="flex items-center justify-between pb-0.5">
                      <span className="text-slate-400">Navigate Predictions</span>
                      <kbd className="bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-[10px] text-slate-200">↑/↓ & Enter</kbd>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
};
