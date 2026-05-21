"use client";

import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0B101B]">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: "url('https://predigoal.com/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fbackground_image.e76a875b.png&w=1920&q=75')" }}
      />

      {/* Radial gradient overlay — matches predigoal's glow at top */}
      <div className="pointer-events-none absolute h-[40%] w-full inset-0 z-1 bg-[radial-gradient(circle_at_50%_0%,rgba(52,211,153,0.12),transparent_60%)]" />

      {/* Grid pattern overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-1 opacity-15"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2334d399' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      {/* Main gradient bottom fade */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B101B]/60 via-[#0B101B]/80 to-[#0B101B] z-10" />

      <motion.div
        className="relative z-20 max-w-5xl mx-auto px-4 text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Badge */}
        <motion.div
          variants={itemVariants}
          className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm text-emerald-400 mb-6 backdrop-blur-sm"
        >
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          #1 Predictor Tool recommended by Tipsters
        </motion.div>

        {/* Heading */}
        <motion.h1
          variants={itemVariants}
          className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-white leading-[1.1]"
        >
          Predict any Football
          <br />
          Match with <span className="text-emerald-400">AI</span>
        </motion.h1>

        {/* Subtext */}
        <motion.p
          variants={itemVariants}
          className="mt-6 text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed"
        >
          Let our AI break down team stats, recent results,
          and match history to predict who will win.
        </motion.p>

        {/* CTA with glow + shimmer */}
        <motion.div variants={itemVariants} className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button className="relative overflow-hidden rounded-xl bg-emerald-500 hover:bg-emerald-400 px-8 py-4 text-base font-semibold text-[#0B101B] transition-all hover:scale-105 active:scale-95 animate-cta-glow animate-shimmer">
            Analyze with AI
          </button>
        </motion.div>

        {/* Accuracy metric */}
        <motion.div
          variants={itemVariants}
          className="mt-8 flex items-center justify-center gap-2 text-gray-500 text-sm"
        >
          <span className="text-emerald-400 font-semibold text-lg">92.2%</span>
          <span>accuracy over the 879 games analyzed last week</span>
        </motion.div>
      </motion.div>
    </section>
  );
}
