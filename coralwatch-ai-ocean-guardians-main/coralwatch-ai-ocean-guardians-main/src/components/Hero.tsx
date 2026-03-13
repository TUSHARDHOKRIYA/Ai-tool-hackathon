import { Button } from "@/components/ui/button";
import { Play, MapPin, BookOpen } from "lucide-react";
import heroImage from "@/assets/hero-coral-reef.jpg";
import { useState } from "react";

const Hero = () => {
  const [draggedButton, setDraggedButton] = useState<string | null>(null);
  const [buttonPositions, setButtonPositions] = useState<{[key: string]: {x: number, y: number}}>({});

  const handleMouseDown = (e: React.MouseEvent, buttonId: string) => {
    e.preventDefault();
    setDraggedButton(buttonId);
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (draggedButton === buttonId) {
        setButtonPositions(prev => ({
          ...prev,
          [buttonId]: {
            x: moveEvent.clientX - 100, // Offset for button center
            y: moveEvent.clientY - 25
          }
        }));
      }
    };

    const handleMouseUp = () => {
      setDraggedButton(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <img 
          src={heroImage}
          alt="Vibrant coral reef underwater scene"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-transparent to-primary/40"></div>
        <div className="absolute inset-0 gradient-ocean opacity-10"></div>
      </div>

      {/* Floating Bubbles Animation */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-4 h-4 bg-accent/30 rounded-full animate-bubble`}
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${i * 1.5}s`,
              animationDuration: `${6 + Math.random() * 4}s`
            }}
          ></div>
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="glass-ocean p-8 sm:p-12 rounded-3xl shadow-ocean">
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-white mb-6 animate-float">
            <span className="gradient-coral bg-clip-text text-transparent">Coral</span>
            <span className="text-white">Watch</span>
          </h1>
          
          <p className="text-xl sm:text-2xl md:text-3xl text-white/90 mb-4 font-light">
            Harnessing AI to Protect Our
          </p>
          
          <p className="text-2xl sm:text-3xl md:text-4xl font-semibold text-accent mb-8">
            Precious Coral Reefs
          </p>
          
          <p className="text-lg sm:text-xl text-white/80 mb-12 max-w-3xl mx-auto leading-relaxed">
            Using cutting-edge artificial intelligence to monitor, analyze, and protect coral reef 
            ecosystems worldwide. Join our mission to preserve these vital marine habitats for future generations.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              variant="coral" 
              size="lg" 
              className="text-lg px-8 py-4 h-auto cursor-move select-none transition-transform hover:scale-105"
              style={buttonPositions['btn1'] ? {
                position: 'fixed',
                left: buttonPositions['btn1'].x,
                top: buttonPositions['btn1'].y,
                zIndex: 1000
              } : {}}
              onMouseDown={(e) => handleMouseDown(e, 'btn1')}
            >
              <Play className="mr-2" size={20} />
              Explore Coral Reefs
            </Button>
            
            <Button 
              variant="glass" 
              size="lg" 
              className="text-lg px-8 py-4 h-auto cursor-move select-none transition-transform hover:scale-105"
              style={buttonPositions['btn2'] ? {
                position: 'fixed',
                left: buttonPositions['btn2'].x,
                top: buttonPositions['btn2'].y,
                zIndex: 1000
              } : {}}
              onMouseDown={(e) => handleMouseDown(e, 'btn2')}
            >
              <MapPin className="mr-2" size={20} />
              View Reef Map
            </Button>
            
            <Button 
              variant="outline" 
              size="lg" 
              className="text-lg px-8 py-4 h-auto bg-white/10 border-white/30 text-white hover:bg-white/20 cursor-move select-none transition-transform hover:scale-105"
              style={buttonPositions['btn3'] ? {
                position: 'fixed',
                left: buttonPositions['btn3'].x,
                top: buttonPositions['btn3'].y,
                zIndex: 1000
              } : {}}
              onMouseDown={(e) => handleMouseDown(e, 'btn3')}
            >
              <BookOpen className="mr-2" size={20} />
              Learn Why Corals Matter
            </Button>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-white/70 rounded-full mt-2 animate-pulse"></div>
        </div>
      </div>
    </section>
  );
};

export default Hero;