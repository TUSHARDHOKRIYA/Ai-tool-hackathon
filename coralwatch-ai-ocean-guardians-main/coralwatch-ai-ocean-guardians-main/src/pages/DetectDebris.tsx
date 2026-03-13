import { ArrowLeft, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import MarineDebrisDetector from "@/components/MarineDebrisDetector";

const DetectDebris = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Header />

      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
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

          {/* Main detector — all API logic lives inside MarineDebrisDetector */}
          <MarineDebrisDetector />
        </div>
      </main>
    </div>
  );
};

export default DetectDebris;
