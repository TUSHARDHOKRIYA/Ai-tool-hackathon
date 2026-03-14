import { ArrowLeft, Trash2, AlertTriangle, Waves, TestTube, Lightbulb } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import MarineDebrisDetector from "@/components/MarineDebrisDetector";

const DetectDebris = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Header />

      <main className="container mx-auto px-4 pt-24 pb-8 sm:px-6 lg:px-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6 group"
        >
          <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </Button>

        <div className="max-w-6xl mx-auto">
          {/* Page header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-red-600 mb-4 shadow-lg shadow-orange-500/25">
              <Trash2 className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-3">Marine Debris Detection</h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Upload an underwater or reef image and our AI model will identify
              and classify marine debris in real time.
            </p>
          </div>

          {/* New Informational Section */}
          <div className="bg-white rounded-xl shadow-sm border border-orange-200/50 p-6 sm:p-8 mb-10">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center justify-center gap-2">
                <AlertTriangle className="text-orange-500 w-6 h-6" /> The Devastating Impact of Marine Debris
              </h2>
              <p className="text-slate-500 text-sm">Understanding how pollution threatens our coral reefs and ocean ecosystems</p>
            </div>

            <div className="rounded-xl overflow-hidden mb-6 shadow-md border-2 border-orange-100">
              <img
                src="https://images.unsplash.com/photo-1621451537084-482c73073a0f?auto=format&fit=crop&q=80&w=1200"
                alt="Marine debris and plastic pollution floating among fish in the ocean"
                className="w-full h-[300px] object-cover"
              />
            </div>
            
            <p className="text-center text-slate-400 text-sm italic mb-8">
              Marine debris poses a severe threat to coral health and marine biodiversity
            </p>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-orange-50/50 rounded-xl p-6 text-center border border-orange-100">
                <p className="text-3xl font-bold text-orange-600 mb-2">11 Million</p>
                <p className="text-xs text-slate-500">Metric tons of plastic enter oceans annually</p>
              </div>
              <div className="bg-rose-50/50 rounded-xl p-6 text-center border border-rose-100">
                <p className="text-3xl font-bold text-rose-600 mb-2">89%</p>
                <p className="text-xs text-slate-500">Of coral reefs affected by plastic pollution</p>
              </div>
              <div className="bg-orange-50/50 rounded-xl p-6 text-center border border-orange-100">
                <p className="text-3xl font-bold text-orange-600 mb-2">20x</p>
                <p className="text-xs text-slate-500">Increased disease risk from debris contact</p>
              </div>
            </div>

            {/* Impact Grid */}
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <div className="bg-slate-50 rounded-lg p-5 border border-slate-200 hover:border-orange-200 transition-colors">
                <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" /> Physical Damage
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Debris entangles, breaks, and smothers coral structures, preventing growth and causing tissue damage
                </p>
              </div>
              
              <div className="bg-slate-50 rounded-lg p-5 border border-slate-200 hover:border-orange-200 transition-colors">
                <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                  <Waves className="w-4 h-4 text-orange-500" /> Chemical Pollution
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Plastics leach toxic chemicals and microplastics that corals ingest, disrupting their biological processes
                </p>
              </div>

              <div className="bg-slate-50 rounded-lg p-5 border border-slate-200 hover:border-orange-200 transition-colors">
                <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                  <TestTube className="w-4 h-4 text-orange-500" /> Disease Spread
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Debris acts as a vector for pathogens, increasing coral disease likelihood by up to 20 times
                </p>
              </div>

              <div className="bg-slate-50 rounded-lg p-5 border border-slate-200 hover:border-orange-200 transition-colors">
                <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-orange-500" /> Light Blockage
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Floating debris blocks sunlight essential for photosynthesis by symbiotic zooxanthellae
                </p>
              </div>
            </div>

            {/* Footer Alert */}
            <div className="bg-rose-50 border-l-4 border-rose-500 p-5 rounded-r-lg">
              <h3 className="text-rose-600 font-semibold mb-2">The Cascading Effect</h3>
              <p className="text-sm text-rose-800/80 leading-relaxed">
                When debris damages coral reefs, it triggers a devastating chain reaction. Healthy reefs support over 25% of all marine species, protect coastlines from storms, and provide food and income for 500+ million people. Every piece of debris we remove is a step toward preserving these irreplaceable ecosystems.
              </p>
            </div>
          </div>

          {/* Main detector — all API logic lives inside MarineDebrisDetector */}
          <MarineDebrisDetector />
        </div>
      </main>
    </div>
  );
};

export default DetectDebris;
