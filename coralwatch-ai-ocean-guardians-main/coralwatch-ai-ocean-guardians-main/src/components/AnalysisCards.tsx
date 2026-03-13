import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AnalysisCards = () => {
  const navigate = useNavigate();

  const cards = [
    {
      title: "Coral Health Check",
      description: "Upload images to analyze coral health and detect diseases",
      icon: Activity,
      path: "/coral-health",
      gradient: "from-emerald-500 to-teal-600"
    },
    {
      title: "Detect Debris",
      description: "Identify and track debris in coral reef environments",
      icon: Trash2,
      path: "/detect-debris",
      gradient: "from-orange-500 to-red-600"
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-muted/20 to-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            AI-Powered Analysis
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Use our advanced AI tools to monitor coral health and detect environmental threats
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.path}
                className="group cursor-pointer hover:shadow-2xl transition-all duration-300 border-2 hover:border-primary/50 overflow-hidden"
                onClick={() => navigate(card.path)}
              >
                <div className={`h-2 bg-gradient-to-r ${card.gradient}`} />
                <CardHeader className="pb-4">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${card.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl">{card.title}</CardTitle>
                  <CardDescription className="text-base">
                    {card.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <button className="text-primary font-semibold group-hover:translate-x-2 transition-transform duration-300 inline-flex items-center">
                    Get Started
                    <span className="ml-2">→</span>
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default AnalysisCards;
