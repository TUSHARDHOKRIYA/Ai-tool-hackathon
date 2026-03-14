import { ArrowLeft, Activity, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import CoralHealthDetector from "@/components/CoralHealthDetector";

const CoralHealth = () => {
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
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 mb-4 shadow-lg shadow-emerald-500/25">
              <Activity className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-3">Coral Health Check</h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Upload an underwater image and our YOLOv11 model will detect and
              isolate every coral specimen in real time.
            </p>
          </div>

          {/* New Informational Section */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8 mb-10">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">How to Identify Healthy Coral</h2>
              <p className="text-slate-500">Learn the key indicators that distinguish healthy corals from stressed or diseased ones</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
              {/* Healthy Example */}
              <div className="space-y-4 text-center">
                <div className="rounded-lg overflow-hidden border-2 border-emerald-100 shadow-sm transition-transform hover:scale-[1.02]">
                  <img
                    src="https://images.unsplash.com/photo-1582967788606-a171c1080cb0?auto=format&fit=crop&q=80&w=800"
                    alt="Healthy vibrant coral reef"
                    className="w-full h-48 object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-emerald-600 font-semibold flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-5 h-5" /> Healthy Coral Example
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">Vibrant colors and active polyps indicate thriving coral</p>
                </div>
              </div>

              {/* Unhealthy Example */}
              <div className="space-y-4 text-center">
                <div className="rounded-lg overflow-hidden border-2 border-rose-100 shadow-sm transition-transform hover:scale-[1.02]">
                  <img
                    src="/bleached_co.jpg"
                    alt="Bleached coral reef"
                    className="w-full h-48 object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-rose-500 font-semibold flex items-center justify-center gap-2">
                    <XCircle className="w-5 h-5" /> Unhealthy Coral Example
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">Bleaching and pale colors signal coral stress</p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Healthy Signs Details */}
              <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-emerald-600 font-semibold mb-4">
                  <CheckCircle2 className="w-5 h-5" /> Signs of Healthy Coral
                </h4>
                
                <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
                  <h5 className="font-medium text-emerald-800 flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4" /> Vibrant Colors
                  </h5>
                  <p className="text-xs text-emerald-600/80">Healthy corals display bright, vivid colors from symbiotic algae (zooxanthellae)</p>
                </div>
                
                <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
                  <h5 className="font-medium text-emerald-800 flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4" /> No Bleaching
                  </h5>
                  <p className="text-xs text-emerald-600/80">Absence of white or pale patches indicates the coral hasn't expelled its zooxanthellae</p>
                </div>
                
                <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
                  <h5 className="font-medium text-emerald-800 flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4" /> Intact Structure
                  </h5>
                  <p className="text-xs text-emerald-600/80">Firm, solid skeleton with no visible breaks, cracks, or erosion</p>
                </div>
                
                <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
                  <h5 className="font-medium text-emerald-800 flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4" /> Active Polyps
                  </h5>
                  <p className="text-xs text-emerald-600/80">Polyps should be extended and feeding, especially during nighttime</p>
                </div>
              </div>

              {/* Warning Signs Details */}
              <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-rose-500 font-semibold mb-4">
                  <XCircle className="w-5 h-5" /> Warning Signs to Watch For
                </h4>
                
                <div className="bg-rose-50 rounded-lg p-4 border border-rose-100">
                  <h5 className="font-medium text-rose-800 flex items-center gap-2 mb-1">
                    <XCircle className="w-4 h-4" /> Bleaching
                  </h5>
                  <p className="text-xs text-rose-600/80">White or very pale appearance means coral has lost its zooxanthellae</p>
                </div>
                
                <div className="bg-rose-50 rounded-lg p-4 border border-rose-100">
                  <h5 className="font-medium text-rose-800 flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4" /> Disease Signs
                  </h5>
                  <p className="text-xs text-rose-600/80">Black band, white band, or unusual lesions indicate bacterial or fungal infections</p>
                </div>
                
                <div className="bg-rose-50 rounded-lg p-4 border border-rose-100">
                  <h5 className="font-medium text-rose-800 flex items-center gap-2 mb-1">
                    <XCircle className="w-4 h-4" /> Tissue Loss
                  </h5>
                  <p className="text-xs text-rose-600/80">Exposed skeleton or missing tissue patches suggest stress or predation</p>
                </div>
                
                <div className="bg-rose-50 rounded-lg p-4 border border-rose-100">
                  <h5 className="font-medium text-rose-800 flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4" /> Algae Overgrowth
                  </h5>
                  <p className="text-xs text-rose-600/80">Excessive algae covering coral surface competes for space and light</p>
                </div>
              </div>
            </div>
          </div>

          {/* Main detector — all API logic lives inside CoralHealthDetector */}
          <CoralHealthDetector />
        </div>
      </main>
    </div>
  );
};

export default CoralHealth;
