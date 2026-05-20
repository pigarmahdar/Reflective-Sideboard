/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { ScryfallService } from '../services/scryfall';
import { MTGCard } from '../types';
import { Loader2, ExternalLink, Image as ImageIcon, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface CardSidebarProps {
  cardName: string | null;
}

export const CardSidebar: React.FC<CardSidebarProps> = ({ cardName }) => {
  const [card, setCard] = useState<MTGCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  
  useEffect(() => {
    if (cardName) {
      setLoading(true);
      ScryfallService.getCardByName(cardName).then((data) => {
        setCard(data);
        setLoading(false);
        setExpanded(false);
      });
    }
  }, [cardName]);

  const handleCopy = () => {
    if (card) {
      const textToCopy = [
        `${card.name}${card.mana_cost ? ` ${card.mana_cost}` : ''}`,
        card.type_line || '',
        card.oracle_text || ''
      ].filter(Boolean).join('\n');
      
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <aside className="w-full h-full flex flex-col shrink-0 overflow-hidden">
      <div className="p-4 border-b border-slate-800 bg-slate-900/50">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Card Preview</h3>
          {card && (
            <button 
              onClick={handleCopy}
              className="text-slate-500 hover:text-indigo-400 transition-colors"
              title="Copy card text"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          )}
        </div>
        {card?.scryfall_uri && (
          <a 
            href={card.scryfall_uri} 
            target="_blank" 
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[9px] text-indigo-400/80 font-bold uppercase tracking-widest hover:text-indigo-400 transition-colors mt-2"
          >
            Scryfall Database <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
      <div className="flex-1 overflow-y-auto w-full">
        <AnimatePresence mode="wait">
          {!cardName && !card ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center p-8 text-center text-slate-500 mt-20"
            >
              <div className="w-16 h-16 bg-slate-800/50 rounded-xl flex items-center justify-center mb-4">
                <ImageIcon className="w-8 h-8 opacity-40" />
              </div>
              <p className="text-xs font-medium leading-relaxed">Hover over a card mention in preview to view it here.</p>
            </motion.div>
          ) : loading ? (
             <motion.div 
               key="loading" 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }} 
               className="flex justify-center flex-col items-center h-48 mt-20"
             >
               <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mb-4" />
               <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Locating...</span>
             </motion.div>
          ) : card ? (
             <motion.div 
               key={card.id} 
               initial={{ opacity: 0, y: 10 }} 
               animate={{ opacity: 1, y: 0 }} 
               exit={{ opacity: 0, y: -10 }} 
               className="flex flex-col p-6 h-full"
             >
                {card.image_uris?.normal ? (
                  <img src={card.image_uris.normal} alt={card.name} className={cn(
                    "mx-auto rounded-xl shadow-2xl mb-6 shadow-indigo-500/10 transition-all duration-500 ease-in-out origin-top",
                    expanded ? "w-1/3 opacity-40 mb-2 scale-95" : "w-3/4 scale-100"
                  )} />
                ) : (
                  <div className="w-3/4 aspect-[2.5/3.5] mx-auto bg-slate-800 rounded-xl flex items-center justify-center mb-6 border border-slate-700">
                    <span className="text-slate-500 text-xs text-center px-4">No image available</span>
                  </div>
                )}
                
                <div className="flex flex-col flex-1 space-y-4">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-bold text-lg leading-tight text-white">{card.name}</h4>
                      <span className="text-sm font-mono text-slate-400 whitespace-nowrap">{card.mana_cost}</span>
                    </div>
                    <p className="text-xs text-slate-400 font-medium pb-4 border-b border-slate-800">{card.type_line}</p>
                  </div>
                  
                  <div className="relative flex flex-col pt-1">
                    <div className={cn(
                      "text-[13px] leading-relaxed text-slate-300 whitespace-pre-wrap transition-all",
                      !expanded && "line-clamp-4"
                    )}>
                      {card.oracle_text}
                    </div>
                    
                    {card.oracle_text && card.oracle_text.length > 100 && (
                      <button 
                        onClick={() => setExpanded(!expanded)}
                        className="mt-3 flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors w-fit"
                      >
                        {expanded ? (
                          <>Collapse <ChevronUp className="w-3 h-3" /></>
                        ) : (
                          <>Read Full Oracle <ChevronDown className="w-3 h-3" /></>
                        )}
                      </button>
                    )}
                  </div>
                </div>
             </motion.div>
          ) : (
             <motion.div 
               key="error" 
               className="flex flex-col items-center justify-center p-8 text-center text-red-400 mt-20"
             >
               <span className="text-xs font-medium">Card not found.</span>
             </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
}
