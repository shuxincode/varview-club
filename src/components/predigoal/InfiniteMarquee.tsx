"use client";

import { motion } from "framer-motion";

const reviews = [
  { name: "Saafir M.", text: "The AI analysis predicted the exact scoreline for the Champions League final. I've never seen anything this accurate." },
  { name: "Rayan K.", text: "I used to spend hours analyzing stats manually. Now Predigoal does it in seconds with better accuracy than I ever had." },
  { name: "Ethan R.", text: "The probability breakdowns are incredibly detailed. It's like having a professional analyst in your pocket." },
  { name: "Marcus T.", text: "My friends thought I was a football genius. Turns out I was just using Predigoal before they found out about it." },
  { name: "James L.", text: "The key factors section is gold. It highlights things I would never have considered, like weather and referee tendencies." },
  { name: "Liam O.", text: "Been using this for Premier League matches all season. The expected goals predictions are spot on most of the time." },
];

const sourcesRow1 = [
  "WhoScored", "FBref", "Transfermarkt", "SofaScore", "Sky Sports",
  "BBC Sport", "FlashScore", "Oddschecker", "AccuWeather", "Understat",
  "ESPN FC", "Bet365",
];

const sourcesRow2 = [
  "Pinnacle", "Soccerway", "L'Équipe", "FotMob", "Opta",
  "StatsBomb", "Marca", "LiveScore", "OpenWeather", "Betfair",
  "The Athletic", "Football-Data",
];

const sectionVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
};

function MarqueeRow({
  children,
  duration = 40,
  reverse = false,
}: {
  children: React.ReactNode;
  duration?: number;
  reverse?: boolean;
}) {
  return (
    <div className="group relative overflow-hidden">
      <motion.div
        className="flex gap-16 items-center"
        animate={{ x: reverse ? ["-50%", "0%"] : ["0%", "-50%"] }}
        transition={{ repeat: Infinity, ease: "linear", duration }}
      >
        {children}
      </motion.div>
      {/* Gradient fade on edges */}
      <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[#0B101B] to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-[#0B101B] to-transparent z-10 pointer-events-none" />
    </div>
  );
}

export default function InfiniteMarquee() {
  return (
    <section className="bg-[#0B101B] py-24 overflow-hidden">
      <motion.div
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
      >
        {/* Trusted section */}
        <div className="text-center mb-16 px-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm text-emerald-400 mb-6 backdrop-blur-sm"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            #1 Match Predictor of 2026
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-white mt-4 mb-2"
          >
            Trusted by Football Fans Worldwide
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            className="flex items-center justify-center gap-2 mt-4"
          >
            <span className="text-yellow-400 text-lg">★★★★★</span>
            <span className="text-gray-400 text-sm">4.7 on TrustPilot</span>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            viewport={{ once: true }}
            className="text-gray-500 text-sm mt-1"
          >
            100,000+ Users
          </motion.p>
        </div>

        {/* Reviews marquee */}
        <div className="space-y-8 mb-24">
          <MarqueeRow duration={30}>
            {[...reviews, ...reviews, ...reviews].map((r, i) => (
              <div
                key={i}
                className="min-w-[400px] flex-shrink-0 rounded-2xl border border-emerald-500/5 bg-emerald-500/[0.02] p-6 backdrop-blur-sm transition-all duration-300 hover:border-emerald-500/20 hover:bg-emerald-500/[0.05]"
              >
                <div className="text-yellow-400 text-sm mb-3">★★★★★</div>
                <p className="text-gray-300 text-sm leading-relaxed mb-4">
                  &ldquo;{r.text}&rdquo;
                </p>
                <p className="text-emerald-400 font-semibold text-sm">{r.name}</p>
              </div>
            ))}
          </MarqueeRow>
        </div>

        {/* +220 Data Sources */}
        <div className="text-center mb-12 px-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm text-emerald-400 mb-6 backdrop-blur-sm"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            +1M Data Sources
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-white mt-4"
          >
            We Scan +220 Websites
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-gray-400 mt-3 max-w-xl mx-auto"
          >
            Millions of football data points analyzed from 220+ sources to predict every match.
          </motion.p>
        </div>

        {/* Data source marquees */}
        <div className="space-y-8">
          <MarqueeRow duration={30}>
            {[...sourcesRow1, ...sourcesRow1, ...sourcesRow1].map((s, i) => (
              <span
                key={i}
                className="text-gray-500 text-lg font-medium whitespace-nowrap transition-all duration-300 hover:text-emerald-400 hover:scale-110 inline-block"
              >
                {s}
              </span>
            ))}
          </MarqueeRow>
          <MarqueeRow duration={35} reverse>
            {[...sourcesRow2, ...sourcesRow2, ...sourcesRow2].map((s, i) => (
              <span
                key={i}
                className="text-gray-500 text-lg font-medium whitespace-nowrap transition-all duration-300 hover:text-emerald-400 hover:scale-110 inline-block"
              >
                {s}
              </span>
            ))}
          </MarqueeRow>
        </div>

        {/* Source categories */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
          className="max-w-5xl mx-auto mt-20 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 px-4"
        >
          {[
            { label: "Player & Team Stats", count: "80+", color: "border-blue-500/30 text-blue-400" },
            { label: "News & Transfers", count: "50+", color: "border-purple-500/30 text-purple-400" },
            { label: "Match History", count: "40+", color: "border-amber-500/30 text-amber-400" },
            { label: "Odds & Markets", count: "30+", color: "border-green-500/30 text-green-400" },
            { label: "Weather & Pitch", count: "10+", color: "border-cyan-500/30 text-cyan-400" },
            { label: "Social Sentiment", count: "15+", color: "border-pink-500/30 text-pink-400" },
          ].map((cat) => (
            <div
              key={cat.label}
              className={`rounded-xl border ${cat.color} bg-emerald-500/[0.02] p-4 text-center backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-lg`}
            >
              <div className={`text-2xl font-bold ${cat.color.split(" ")[1]}`}>{cat.count}</div>
              <div className="text-gray-400 text-xs mt-1">{cat.label}</div>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
