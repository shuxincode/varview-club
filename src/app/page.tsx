'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { SearchBar } from '@/components/fixture/search-bar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  BarChart3,
  Brain,
  Shield,
  TrendingUp,
  ArrowRight,
  Zap,
  Sigma,
  CheckCircle,
  MessageCircle,
  Lock,
} from 'lucide-react';

const easeOutExpo = [0.19, 1, 0.22, 1] as const;
const easeOutQuart = [0.25, 1, 0.5, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: easeOutExpo },
  }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [buying, setBuying] = useState(false);

  async function handleBuy() {
    setBuying(true);
    try {
      const res = await fetch('/api/checkout', { method: 'POST' });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch {
      setBuying(false);
    }
  }

  return (
    <div className="min-h-screen">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-[oklch(0.85_0.012_75/0.5)]">
        <div className="absolute inset-0 bg-gradient-to-b from-[oklch(0.45_0.18_265/0.08)] via-transparent to-transparent pointer-events-none" />
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10 py-24 lg:py-36 relative">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="max-w-3xl"
          >
            <motion.div
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: easeOutExpo } } }}
              className="flex items-center gap-3 mb-6"
            >
              <Badge variant="premium">AI-Powered</Badge>
              <Badge variant="info">Dixon-Coles Engine</Badge>
            </motion.div>
            <motion.h1
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: easeOutExpo } } }}
              className="text-[clamp(2.25rem,5vw,4rem)] font-bold tracking-tight text-[oklch(0.22_0.025_260)] mb-5 leading-[1.08]"
            >
              Predictive Football{' '}
              <span className="text-[oklch(0.45_0.18_265)]">Analytics</span>
            </motion.h1>
            <motion.p
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.1, ease: easeOutExpo } } }}
              className="text-lg sm:text-xl text-[oklch(0.55_0.018_70)] mb-10 max-w-xl leading-relaxed"
            >
              Dixon-Coles statistical modeling + Bayesian confidence intervals + AI agent reasoning.
              Make data-driven predictions with quantified certainty.
            </motion.p>

            {/* Search */}
            <motion.div
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.2, ease: easeOutExpo } } }}
              className="max-w-lg mb-10"
            >
              <SearchBar
                onSearch={(q) => {
                  setSearchQuery(q);
                  window.location.href = `/search?q=${encodeURIComponent(q)}`;
                }}
              />
            </motion.div>

            <motion.div
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.3, ease: easeOutExpo } } }}
              className="flex items-center gap-4 flex-wrap"
            >
              <Link href="/pricing">
                <Button size="lg" variant="emerald">
                  View Pricing
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <Link href="/search">
                <Button variant="outline" size="lg">
                  Browse Fixtures
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Features Grid — asymmetric bento ── */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10 py-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="mb-14"
        >
          <motion.h2
            variants={fadeUp}
            custom={0}
            className="text-[clamp(1.5rem,3.5vw,2.5rem)] font-bold text-[oklch(0.22_0.025_260)] mb-3 tracking-tight"
          >
            The Four Pillars of{' '}
            <span className="text-[oklch(0.45_0.18_265)]">Prediction</span>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            custom={1}
            className="text-[oklch(0.55_0.018_70)] max-w-lg text-lg"
          >
            Every analysis is built on four statistical pillars, each with a Bayesian confidence score.
          </motion.p>
        </motion.div>

        {/* Asymmetric 2-1-1 grid (taste: avoid centered symmetry) */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="grid grid-cols-1 md:grid-cols-12 gap-5"
        >
          {/* Pillar 1 — wide */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: easeOutQuart } } }}
            className="md:col-span-7"
          >
            <Card className="h-full">
              <CardContent className="p-8">
                <div className="rounded-2xl bg-[oklch(0.45_0.18_265/0.08)] p-4 w-fit mb-5">
                  <TrendingUp className="h-7 w-7 text-[oklch(0.45_0.18_265)]" />
                </div>
                <h3 className="text-xl font-bold text-[oklch(0.22_0.025_260)] mb-2">Total Goals</h3>
                <p className="text-[oklch(0.55_0.018_70)] leading-relaxed">Over/Under 2.5 with Poisson probability</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Pillar 2 — narrow */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: easeOutQuart } } }}
            className="md:col-span-5"
          >
            <Card className="h-full">
              <CardContent className="p-8">
                <div className="rounded-2xl bg-[oklch(0.62_0.18_160/0.1)] p-4 w-fit mb-5">
                  <CheckCircle className="h-7 w-7 text-[oklch(0.62_0.18_160)]" />
                </div>
                <h3 className="text-xl font-bold text-[oklch(0.22_0.025_260)] mb-2">BTTS</h3>
                <p className="text-[oklch(0.55_0.018_70)] leading-relaxed">Both Teams to Score probability</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Pillar 3 — narrow */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: easeOutQuart } } }}
            className="md:col-span-5"
          >
            <Card className="h-full">
              <CardContent className="p-8">
                <div className="rounded-2xl bg-[oklch(0.9_0.08_80/0.3)] p-4 w-fit mb-5">
                  <Shield className="h-7 w-7 text-[oklch(0.55_0.15_80)]" />
                </div>
                <h3 className="text-xl font-bold text-[oklch(0.22_0.025_260)] mb-2">Winner</h3>
                <p className="text-[oklch(0.55_0.018_70)] leading-relaxed">Home/Away/Draw with confidence</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Pillar 4 — wide */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: easeOutQuart } } }}
            className="md:col-span-7"
          >
            <Card className="h-full">
              <CardContent className="p-8">
                <div className="rounded-2xl bg-[oklch(0.45_0.18_265/0.08)] p-4 w-fit mb-5">
                  <BarChart3 className="h-7 w-7 text-[oklch(0.45_0.18_265)]" />
                </div>
                <h3 className="text-xl font-bold text-[oklch(0.22_0.025_260)] mb-2">First Half Goals</h3>
                <p className="text-[oklch(0.55_0.018_70)] leading-relaxed">Over/Under 0.5 first-half prediction</p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </section>

      {/* ── How It Works ── */}
      <section className="border-t border-[oklch(0.85_0.012_75/0.5)] py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="mb-14"
          >
            <motion.h2 variants={fadeUp} custom={0} className="text-[clamp(1.5rem,3.5vw,2.5rem)] font-bold text-[oklch(0.22_0.025_260)] mb-3 tracking-tight">
              The <span className="text-[oklch(0.45_0.18_265)]">VARview</span> Edge
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-[oklch(0.55_0.018_70)] max-w-lg text-lg">
              Three layers of analysis stacked for maximum predictive accuracy.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {[
              {
                icon: Sigma,
                title: 'Dixon-Coles Model',
                desc: 'Bivariate Poisson regression modeling home/away goal dependence. The mathematical foundation of all predictions.',
                stat: 'λ',
                statLabel: 'Goal expectancy',
                iconBg: 'bg-[oklch(0.45_0.18_265/0.08)]',
                iconColor: 'text-[oklch(0.45_0.18_265)]',
              },
              {
                icon: Brain,
                title: 'Bayesian Confidence',
                desc: 'Beta-distributed posterior sampling with Jeffreys prior. Every prediction includes a calibrated confidence interval.',
                stat: '90%',
                statLabel: 'CI coverage',
                iconBg: 'bg-[oklch(0.62_0.18_160/0.1)]',
                iconColor: 'text-[oklch(0.62_0.18_160)]',
              },
              {
                icon: Zap,
                title: 'AI Agent Trio',
                desc: "Analyst A (tactical) + Analyst B (intel) + Chairman (arbiter). The Chairman's Blue Tick is the final seal of approval.",
                stat: '3',
                statLabel: 'AI agents',
                iconBg: 'bg-[oklch(0.9_0.08_80/0.3)]',
                iconColor: 'text-[oklch(0.55_0.15_80)]',
              },
            ].map((step) => (
              <motion.div
                key={step.title}
                variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: easeOutQuart } } }}
              >
                <Card className="h-full">
                  <CardContent className="p-8">
                    <div className={`rounded-2xl ${step.iconBg} p-4 w-fit mb-5`}>
                      <step.icon className={`h-7 w-7 ${step.iconColor}`} />
                    </div>
                    <h3 className="text-xl font-bold text-[oklch(0.22_0.025_260)] mb-2">{step.title}</h3>
                    <p className="text-[oklch(0.55_0.018_70)] mb-6 leading-relaxed text-sm">{step.desc}</p>
                    <div className="border-t border-[oklch(0.85_0.012_75/0.5)] pt-4">
                      <span className="text-2xl font-bold text-[oklch(0.45_0.18_265)]">{step.stat}</span>
                      <span className="text-xs text-[oklch(0.55_0.018_70)] ml-1.5">{step.statLabel}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Telegram Access CTA ── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        variants={stagger}
        className="border-t border-[oklch(0.85_0.012_75/0.5)] py-24"
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <motion.div variants={fadeUp} custom={0} className="max-w-xl">
            <h2 className="text-[clamp(1.5rem,3.5vw,2.5rem)] font-bold text-[oklch(0.22_0.025_260)] mb-3 tracking-tight">
              Chairman's Picks on{' '}
              <span className="text-[oklch(0.45_0.18_265)]">Telegram</span>
            </h2>
            <p className="text-[oklch(0.55_0.018_70)] mb-8 text-lg">
              One-time payment. Lifetime access. The Chairman's over-4.5 goal outliers delivered directly to your DM.
            </p>
          </motion.div>
          <motion.div variants={fadeUp} custom={2} className="flex items-center gap-4 flex-wrap">
            <Button
              size="lg"
              variant="emerald"
              onClick={handleBuy}
              disabled={buying}
            >
              {buying ? 'Opening Stripe...' : (
                <>
                  Get Access — $89
                  <MessageCircle className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
            <div className="flex items-center gap-2 text-xs text-[oklch(0.55_0.018_70)]">
              <Lock className="h-3 w-3" />
              <span>Secure payment via Stripe</span>
            </div>
          </motion.div>
        </div>
      </motion.section>
    </div>
  );
}
