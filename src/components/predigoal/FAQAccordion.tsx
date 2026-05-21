"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const faqs = [
  {
    q: "How does Predigoal predict football matches?",
    a: "Predigoal uses advanced AI models trained on millions of historical data points — including team form, head-to-head records, player stats, tactical setups, and real-time conditions. The AI cross-references 220+ sources to generate win/draw/loss probabilities, expected goals, and scenario breakdowns for every match.",
  },
  {
    q: "What makes Predigoal different from other prediction sites?",
    a: "Most prediction sites rely on simple algorithms or crowd opinions. Predigoal combines deep statistical modeling with live data ingestion from 220+ sources, giving you professional-grade analysis in seconds. Our AI also explains the \"why\" behind every prediction with key factors and scenario analysis.",
  },
  {
    q: "What data does Predigoal's AI analyze?",
    a: "We analyze player and team statistics, recent form, head-to-head history, injury reports, transfer news, betting market movements, weather conditions, referee tendencies, and social sentiment — all in real time. Over 1 million data points are processed for each prediction.",
  },
  {
    q: "How accurate are Predigoal's match predictions?",
    a: "Our models maintain a 92%+ directional accuracy rate across major leagues, verified over hundreds of matches each week. We display our live accuracy stats on the homepage so you can always see how the AI is performing.",
  },
  {
    q: "Do I need betting experience to use Predigoal?",
    a: "Not at all. Predigoal is designed for anyone who loves football — whether you're a casual fan curious about an upcoming match or an experienced analyst. The AI breaks everything down into clear, easy-to-understand insights with plain-language explanations.",
  },
  {
    q: "Which leagues and matches can I analyze with Predigoal?",
    a: "Predigoal covers 200+ leagues worldwide including the Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Champions League, Europa League, and many more. We add new competitions regularly based on data availability and user demand.",
  },
];

export default function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="bg-[#0B101B] py-24 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-xs font-semibold tracking-[0.2em] text-emerald-400 uppercase">
            Frequently Asked Questions
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-white mt-4">
            Any questions?
          </h2>
          <p className="text-gray-400 mt-3">Everything you need to know. Answered.</p>
        </div>

        {/* Accordion */}
        <div className="space-y-3">
          {faqs.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={i}
                className={`rounded-2xl border backdrop-blur-sm transition-all duration-300 ${
                  isOpen
                    ? "border-emerald-500/30 bg-emerald-500/[0.04]"
                    : "border-emerald-500/5 bg-emerald-500/[0.02] hover:border-emerald-500/20"
                }`}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full flex items-center justify-between p-6 text-left transition-all duration-300 hover:bg-emerald-500/[0.02] rounded-2xl"
                >
                  <span className="text-white font-medium pr-4">{faq.q}</span>
                  <motion.svg
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="w-5 h-5 text-gray-400 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </motion.svg>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 text-gray-400 leading-relaxed text-sm">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
