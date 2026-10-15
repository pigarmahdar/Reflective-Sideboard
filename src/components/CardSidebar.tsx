/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import { ScryfallService } from '../services/scryfall';
import { MTGCard } from '../types';
import { Loader2, ExternalLink, Image as ImageIcon, Copy, Check, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, useAnimate } from 'motion/react';

interface CardSidebarProps {
  cardName: string | null;
  isConsidered?: boolean;
  onToggleConsidered?: (card: MTGCard) => void;
}

interface CardSleeveTiltProps {
  card: MTGCard;
  isSleeved: boolean;
  onSleeveComplete: () => void;
}

const CardSleeveTilt: React.FC<CardSleeveTiltProps> = ({
  card,
  isSleeved,
  onSleeveComplete,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const dwellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sleeveRef, animate] = useAnimate();
  const isAnimatingRef = useRef(false);

  // Motion values for smooth 3D tilt
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Spring physics for natural, fluid settling
  const mouseX = useSpring(x, { stiffness: 220, damping: 20 });
  const mouseY = useSpring(y, { stiffness: 220, damping: 20 });

  // Transform coordinates to gentle rotation angles (-10deg to 10deg)
  const rotateX = useTransform(mouseY, [-0.5, 0.5], [10, -10]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-10, 10]);

  // Subtle, non-intrusive specular sheen that doesn't wash out card text or art
  const glareX = useTransform(mouseX, [-0.5, 0.5], ['10%', '90%']);
  const glareY = useTransform(mouseY, [-0.5, 0.5], ['10%', '90%']);
  const glareBackground = useTransform(
    [glareX, glareY],
    ([gx, gy]) =>
      `radial-gradient(circle at ${gx} ${gy}, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0) 50%)`
  );

  // Dynamic prismatic holographic foil gradient matching translucent foil inner sleeves
  const holoGradient = useTransform(
    [mouseX, mouseY],
    ([mx, my]) => {
      const angle = 118 + Number(mx) * 30;
      const spotX = ((Number(mx) + 0.5) * 100).toFixed(1);
      const spotY = ((Number(my) + 0.5) * 100).toFixed(1);
      return `linear-gradient(${angle}deg, 
        rgba(255, 255, 255, 0) 5%, 
        rgba(255, 105, 180, 0.24) 20%, 
        rgba(0, 229, 255, 0.28) 35%, 
        rgba(102, 255, 153, 0.24) 50%, 
        rgba(255, 230, 102, 0.26) 65%, 
        rgba(255, 120, 220, 0.24) 80%, 
        rgba(255, 255, 255, 0) 95%),
        radial-gradient(circle at ${spotX}% ${spotY}%, rgba(255, 255, 255, 0.3) 0%, transparent 60%)`;
    }
  );

  // Sync sleeve visibility when card is loaded or unsleeved without interrupting active animations
  useEffect(() => {
    if (isAnimatingRef.current) return;
    if (sleeveRef.current) {
      if (isSleeved) {
        animate(sleeveRef.current, { y: '0%', opacity: 1 }, { duration: 0 });
      } else {
        animate(sleeveRef.current, { y: '110%', opacity: 0 }, { duration: 0.25, ease: 'easeInOut' });
      }
    }
  }, [isSleeved, card.id, animate, sleeveRef]);

  const triggerSleeveSequence = async () => {
    if (!sleeveRef.current || isAnimatingRef.current) return;
    isAnimatingRef.current = true;

    try {
      // Stage 1: Initial smooth slide up to halfway (~45%)
      await animate(
        sleeveRef.current,
        { y: '45%', opacity: 1 },
        { duration: 0.5, ease: 'easeOut' }
      );

      // Stage 2: Tactile hesitation/resistance pause (creeps from 45% to 42%)
      await animate(
        sleeveRef.current,
        { y: '42%' },
        { duration: 0.35, ease: 'linear' }
      );

      // Stage 3: Firm, decisive push home flush to 0% with a clean spring snap
      await animate(
        sleeveRef.current,
        { y: '0%' },
        { duration: 0.45, ease: [0.22, 1, 0.36, 1] }
      );

      isAnimatingRef.current = false;
      onSleeveComplete();
    } catch {
      isAnimatingRef.current = false;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const relativeX = (e.clientX - rect.left) / rect.width - 0.5;
    const relativeY = (e.clientY - rect.top) / rect.height - 0.5;
    x.set(relativeX);
    y.set(relativeY);
  };

  const handleMouseEnter = () => {
    if (!isSleeved && !isAnimatingRef.current) {
      if (dwellTimerRef.current) clearTimeout(dwellTimerRef.current);
      // 2.0-second contemplation timer before sleeving
      dwellTimerRef.current = setTimeout(() => {
        triggerSleeveSequence();
      }, 2000);
    }
  };

  const handleMouseLeave = () => {
    if (dwellTimerRef.current) {
      clearTimeout(dwellTimerRef.current);
      dwellTimerRef.current = null;
    }
    x.set(0);
    y.set(0);
  };

  useEffect(() => {
    return () => {
      if (dwellTimerRef.current) {
        clearTimeout(dwellTimerRef.current);
      }
    };
  }, []);

  return (
    <div style={{ perspective: 1000 }} className="w-[64%] max-w-[200px] mx-auto my-4 select-none">
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
        animate={{
          scale: isSleeved ? 1.02 : 1,
        }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className="relative cursor-pointer"
      >
        {/* Animated Translucent Holographic Foil Sleeve Pocket
            Two-stage realistic slotting: slides up halfway, encounters inner-sleeve friction pause, then finishes with a snug push home */}
        <div
          ref={sleeveRef}
          style={{
            transform: isSleeved ? 'translateY(0%)' : 'translateY(110%)',
            opacity: isSleeved ? 1 : 0,
          }}
          className="absolute -inset-x-2 -bottom-2 -top-3 pointer-events-none rounded-xl overflow-hidden shadow-2xl z-20"
        >
          {/* Crisp transparent plastic border with subtle prismatic refractive glow */}
          <div className="absolute inset-0 rounded-xl border border-white/60 dark:border-white/50 shadow-[0_0_16px_rgba(168,85,247,0.3),inset_0_0_10px_rgba(255,255,255,0.35)]" />

          {/* Top opening rim of the sleeve */}
          <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-b from-white/35 to-transparent border-b border-white/40 shadow-sm" />

          {/* Dynamic Prismatic Holographic Rainbow Sheen (Screen blend mode ensures ZERO darkening) */}
          <motion.div
            style={{
              background: holoGradient,
              mixBlendMode: 'screen',
            }}
            className="absolute inset-0 rounded-xl pointer-events-none"
          />

          {/* Glass-like secondary reflection sweep */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-white/15 pointer-events-none mix-blend-overlay" />

          {/* Subtle bottom-right sleeve hallmark */}
          <div className="absolute bottom-1 right-2 text-[7px] font-mono tracking-widest text-white/90 uppercase drop-shadow">
            ✦ Foil Sleeve
          </div>
        </div>

        {/* Base Card Image Container */}
        <div className="relative rounded-lg overflow-hidden shadow-xl z-10">
          <img
            src={card.image_uris?.normal}
            alt={card.name}
            className="w-full h-auto block rounded-lg pointer-events-none"
            draggable={false}
          />

          {/* Specular Glare Layer (soft and gentle to keep text legible) */}
          <motion.div
            style={{ background: glareBackground }}
            className="absolute inset-0 pointer-events-none rounded-lg"
          />
        </div>
      </motion.div>
    </div>
  );
};

export const CardSidebar: React.FC<CardSidebarProps> = ({
  cardName,
  isConsidered = false,
  onToggleConsidered,
}) => {
  const [card, setCard] = useState<MTGCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isSleeved, setIsSleeved] = useState(false);

  // Sync internal sleeve state with isConsidered whenever the card or prop changes
  useEffect(() => {
    setIsSleeved(Boolean(isConsidered));
  }, [isConsidered, card?.id]);

  useEffect(() => {
    let isCurrent = true;

    if (cardName) {
      const cached = ScryfallService.getCachedCard(cardName);
      if (cached) {
        setCard(cached);
        setLoading(false);
        setExpanded(false);
        return;
      }

      setLoading(true);
      ScryfallService.getCardByName(cardName).then((data) => {
        if (!isCurrent) return;
        setCard(data);
        setLoading(false);
        setExpanded(false);
      });
    } else {
      setCard(null);
      setLoading(false);
    }

    return () => {
      isCurrent = false;
    };
  }, [cardName]);

  const handleCopy = () => {
    if (card) {
      const textToCopy = [
        `${card.name}${card.mana_cost ? ` ${card.mana_cost}` : ''}`,
        card.type_line || '',
        card.oracle_text || '',
      ].filter(Boolean).join('\n');

      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSleeveComplete = () => {
    setIsSleeved(true);
    if (!isConsidered && card && onToggleConsidered) {
      onToggleConsidered(card);
    }
  };

  const handleUnsleeve = () => {
    setIsSleeved(false);
    if (isConsidered && card && onToggleConsidered) {
      onToggleConsidered(card);
    }
  };

  return (
    <aside className="w-full h-full flex flex-col shrink-0 overflow-hidden">
      <div className="p-4 border-b border-line bg-surface/50">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted">Card Preview</h3>
          {card && (
            <button
              onClick={handleCopy}
              className="text-muted hover:text-indigo-400 transition-colors"
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
            className="inline-flex items-center gap-1.5 text-[9px] text-accent-mid/80 font-bold uppercase tracking-widest hover:text-accent-mid transition-colors mt-2"
          >
            Scryfall Database <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
      <div className="flex-1 overflow-y-auto w-full">
        {!cardName && !card ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-muted mt-20">
            <div className="w-16 h-16 bg-surface-raised/50 rounded-xl flex items-center justify-center mb-4">
              <ImageIcon className="w-8 h-8 opacity-40" />
            </div>
            <p className="text-xs font-medium leading-relaxed">Hover over a card mention in preview to view it here.</p>
          </div>
        ) : loading ? (
          <div className="flex justify-center flex-col items-center h-48 mt-20">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mb-4" />
            <span className="text-xs font-medium text-muted uppercase tracking-wider">Locating...</span>
          </div>
        ) : card ? (
          <div className="flex flex-col p-6 h-full">
            {card.image_uris?.normal ? (
              <>
                <CardSleeveTilt
                  card={card}
                  isSleeved={isSleeved}
                  onSleeveComplete={handleSleeveComplete}
                />

                {/* Under Consideration Status & Actions with generous breathing room */}
                <AnimatePresence>
                  {isSleeved && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.95 }}
                      transition={{ duration: 0.25 }}
                      className="w-[80%] max-w-[240px] mx-auto mt-4 mb-6 flex items-center justify-between bg-indigo-500/10 border border-indigo-500/30 rounded-lg px-3 py-1.5 shadow-sm"
                    >
                      <div className="flex items-center gap-1.5 text-xs text-indigo-400 dark:text-indigo-300 font-medium">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0 animate-pulse" />
                        <span className="truncate">In Consideration</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleUnsleeve}
                        className="text-[10px] text-muted hover:text-ink px-2 py-0.5 rounded bg-surface border border-line hover:border-line-strong transition-all shrink-0 ml-2"
                        title="Unsleeve and remove from library"
                      >
                        Unsleeve
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <div className="w-[64%] max-w-[200px] aspect-[2.5/3.5] mx-auto bg-surface-raised rounded-xl flex items-center justify-center my-6 border border-line-strong">
                <span className="text-muted text-xs text-center px-4">No image available</span>
              </div>
            )}

            <div className="flex flex-col flex-1 space-y-4 pt-1">
              <div>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="font-bold text-lg leading-tight text-ink">{card.name}</h4>
                  <span className="text-sm font-mono text-faint whitespace-nowrap">{card.mana_cost}</span>
                </div>
                <p className="text-xs text-faint font-medium pb-4 border-b border-line">{card.type_line}</p>
              </div>

              <div className="relative flex flex-col pt-1">
                <div
                  className={cn(
                    'text-[13px] leading-relaxed text-body whitespace-pre-wrap transition-all',
                    !expanded && 'line-clamp-4'
                  )}
                >
                  {card.oracle_text}
                </div>

                {card.oracle_text && card.oracle_text.length > 100 && (
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="mt-3 flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-accent-mid hover:text-accent-strong transition-colors w-fit"
                  >
                    {expanded ? (
                      <>
                        Collapse <ChevronUp className="w-3 h-3" />
                      </>
                    ) : (
                      <>
                        Read Full Oracle <ChevronDown className="w-3 h-3" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center text-red-400 mt-20">
            <span className="text-xs font-medium">Card not found.</span>
          </div>
        )}
      </div>
    </aside>
  );
};
