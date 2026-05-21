"use client";

import { motion } from "framer-motion";

const tiers = [
  {
    name: "Starter",
    price: "Free",
    period: null,
    badge: null,
    features: ["Basic match stats", "Limited daily predictions"],
    cta: "GET STARTED",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$19.99",
    period: "/mo",
    badge: "MOST POPULAR",
    features: [
      "Full AI match predictions",
      "Exact win probabilities",
      "Unlimited analyses",
      "Cancel anytime",
    ],
    cta: "UPGRADE TO PRO",
    highlighted: true,
  },
  {
    name: "Unlimited",
    price: "$99",
    period: "one time",
    badge: "BEST VALUE",
    features: [
      "Save $140/year vs monthly",
      "All Pro features",
      "Unlimited access",
      "No recurring payments",
    ],
    cta: "GET UNLIMITED",
    highlighted: false,
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.15, ease: "easeOut" as const },
  }),
};

export default function PricingTiers() {
  return (
    <section className="bg-[#0B101B] py-24 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-xs font-semibold tracking-[0.2em] text-emerald-400 uppercase">
            Pricing
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-white mt-4">
            Simple, transparent pricing
          </h2>
          <p className="text-gray-400 mt-3">Choose the plan that&apos;s right for you.</p>
        </div>

        {/* Tiers */}
        <div className="grid md:grid-cols-3 gap-6 items-start max-w-5xl mx-auto">
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.name}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              className={`relative rounded-2xl border p-8 flex flex-col backdrop-blur-sm transition-all duration-300 ${
                tier.highlighted
                  ? "border-emerald-500/50 bg-[linear-gradient(180deg,#0a1f15_0%,#0B101B_100%)] shadow-xl shadow-emerald-500/10 scale-105 hover:shadow-emerald-500/20"
                  : "border-emerald-500/5 bg-emerald-500/[0.02] hover:border-emerald-500/20"
              }`}
            >
              {/* Badge */}
              {tier.badge && (
                <div
                  className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur-sm ${
                    tier.highlighted
                      ? "bg-emerald-500 text-[#0B101B]"
                      : "bg-amber-500 text-[#0B101B]"
                  }`}
                >
                  {tier.badge}
                </div>
              )}

              {/* Name */}
              <h3 className="text-xl font-semibold text-white mb-2">{tier.name}</h3>

              {/* Price */}
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">{tier.price}</span>
                {tier.period && (
                  <span className="text-gray-400 text-sm ml-1">{tier.period}</span>
                )}
                {tier.badge === "MOST POPULAR" && (
                  <div className="text-gray-500 text-xs mt-1">CANCEL ANYTIME</div>
                )}
                {tier.badge === "BEST VALUE" && (
                  <div className="text-gray-500 text-xs mt-1">NO RECURRING PAYMENTS</div>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-gray-300 text-sm">
                    <svg className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                className={`relative overflow-hidden w-full rounded-xl py-3 text-sm font-semibold transition-all active:scale-95 ${
                  tier.highlighted
                    ? "bg-emerald-500 hover:bg-emerald-400 text-[#0B101B] shadow-lg shadow-emerald-500/25 animate-cta-glow animate-shimmer"
                    : "border border-emerald-500/20 text-white hover:bg-emerald-500/10"
                }`}
              >
                {tier.cta}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
