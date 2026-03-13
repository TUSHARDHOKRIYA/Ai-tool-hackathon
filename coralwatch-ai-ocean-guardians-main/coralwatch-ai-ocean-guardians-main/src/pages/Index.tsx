import Header from "@/components/Header";
import Hero from "@/components/Hero";
import CoralInfo from "@/components/CoralInfo";
import AnalysisCards from "@/components/AnalysisCards";
import MapSection from "@/components/MapSection";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <CoralInfo />
        <AnalysisCards />
        <MapSection />
      </main>
    </div>
  );
};

export default Index;
