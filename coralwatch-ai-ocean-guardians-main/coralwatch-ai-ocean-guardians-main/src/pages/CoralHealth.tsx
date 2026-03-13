import { ArrowLeft, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import CoralHealthDetector from "@/components/CoralHealthDetector";

const CoralHealth = () => {
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
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 mb-4 shadow-lg shadow-emerald-500/25">
              <Activity className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-3">Coral Health Check</h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Upload an underwater image and our YOLOv11 model will detect and
              isolate every coral specimen in real time.
            </p>
          </div>

          {/* Main detector — all API logic lives inside CoralHealthDetector */}
          <CoralHealthDetector />
        </div>
      </main>
    </div>
  );
};

export default CoralHealth;
