import HeroSection from "@/components/predigoal/HeroSection";
import FeatureGrid from "@/components/predigoal/FeatureGrid";
import InfiniteMarquee from "@/components/predigoal/InfiniteMarquee";
import PricingTiers from "@/components/predigoal/PricingTiers";
import FAQAccordion from "@/components/predigoal/FAQAccordion";

export default function PredigoalPage() {
  return (
    <main>
      <HeroSection />
      <FeatureGrid />
      <InfiniteMarquee />
      <PricingTiers />
      <FAQAccordion />
    </main>
  );
}
