import HeroSection from "@/components/HeroSection";
import Marquee from "@/components/Marquee";
import ScrollCarousel from "@/components/ScrollCarousel";
import Lookbook from "@/components/Lookbook";
import BrandPhilosophy from "@/components/BrandPhilosophy";
import Newsletter from "@/components/Newsletter";
import SoundToggle from "@/components/SoundToggle";

export default function Home() {
  return (
    <>
      <HeroSection />
      <Marquee />
      <ScrollCarousel />
      <Lookbook />
      <BrandPhilosophy />
      <Newsletter />
      <SoundToggle />
    </>
  );
}
