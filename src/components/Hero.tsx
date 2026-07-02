import React from 'react';
import { Award, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import { heroImage } from '../assets';

interface HeroProps {
  onPredictClick: () => void;
  onLiveClick: () => void;
}

export default function Hero({ onPredictClick, onLiveClick }: HeroProps) {
  return (
    <section className="relative min-h-[92vh] flex items-center justify-center pt-24 overflow-hidden bg-[#1c070f]">
      {/* High-Fidelity Full-Bleed Background Image (Complete Filling) */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <motion.img
          src={heroImage}
          alt="Messi, Neymar, Ronaldo World Cup Champions Lift"
          referrerPolicy="no-referrer"
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 0.65, scale: 1 }}
          transition={{ duration: 1.2 }}
          className="w-full h-full object-cover select-none filter brightness-[0.5] contrast-[1.15]"
        />
        {/* Layered Cinematic Gradients for premium look & excellent text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1c070f] via-[#1c070f]/50 to-[#1c070f]/30"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#1c070f]/80 via-transparent to-[#1c070f]/80"></div>
      </div>

      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6 text-center py-8 sm:py-12 flex flex-col items-center space-y-8">
        {/* Badge */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#8a1538]/60 border border-[#e9c349]/50 rounded-full backdrop-blur-md"
        >
          <Trophy className="w-4 h-4 text-[#e9c349]" />
          <span className="font-mono text-[11px] font-bold tracking-widest text-[#e9c349] uppercase">
            The Ultimate Prediction Fantasy
          </span>
        </motion.div>

        {/* Cinematic Heading */}
        <motion.h1 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="font-sans text-4xl sm:text-6xl lg:text-8xl font-extrabold text-white tracking-tight leading-[0.9] uppercase drop-shadow-[0_8px_24px_rgba(0,0,0,0.8)]"
        >
          ONE LAST <span className="text-[#e9c349]">DANCE</span>
        </motion.h1>

        {/* Prediction Contest Subtitle */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="font-mono text-base sm:text-xl font-bold text-[#e9c349] tracking-wider uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
        >
          Prediction Contest
        </motion.p>

        {/* Call to Actions */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 pt-4 w-full sm:w-auto"
        >
          <button
            onClick={onPredictClick}
            className="bg-[#e9c349] hover:bg-[#ffd042] text-[#241a00] font-mono text-sm font-bold px-10 py-4 transition-all active:scale-95 shadow-[0_6px_24px_rgba(233,195,73,0.4)] uppercase tracking-wider rounded-none"
          >
            START PREDICTION
          </button>
          <button
            onClick={onLiveClick}
            className="border-2 border-[#e9c349]/60 text-[#e9c349] hover:bg-[#e9c349]/10 font-mono text-sm font-bold px-10 py-4 bg-[#220c14]/60 backdrop-blur-md transition-all active:scale-95 uppercase tracking-wider rounded-none"
          >
            DISCOVER REWARDS & LIVE STATS
          </button>
        </motion.div>

        {/* Small AI Credit indicator for the gorgeous background */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          transition={{ delay: 1.2, duration: 1 }}
          className="inline-flex items-center gap-2 pt-6 font-mono text-[10px] text-[#ebd9dc]/70"
        >
          <Award className="w-3.5 h-3.5 text-[#e9c349]" />
          <span>EXCLUSIVE MASTERPIECE BACKGROUND</span>
        </motion.div>
      </div>
    </section>
  );
}
