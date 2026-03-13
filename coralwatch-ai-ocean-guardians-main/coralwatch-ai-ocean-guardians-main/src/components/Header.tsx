import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Link } from "react-router-dom";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { name: "Home", href: "#home", type: "anchor" },
    { name: "Coral Health Check", href: "/coral-health", type: "link" },
    { name: "Detect Debris", href: "/detect-debris", type: "link" },
    { name: "Reef Dashboard", href: "/dashboard", type: "link" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-ocean border-b border-accent/20">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <img
              src="/lovable-uploads/b0145202-4348-4c0d-b788-39ea583ccec6.png"
              alt="CoralWatch Logo"
              className="h-12 w-auto"
            />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) =>
              item.type === "link" ? (
                <Link
                  key={item.name}
                  to={item.href}
                  className="text-foreground hover:text-accent transition-colors duration-300 font-medium relative group"
                >
                  {item.name}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-accent transition-all duration-300 group-hover:w-full"></span>
                </Link>
              ) : (
                <a
                  key={item.name}
                  href={item.href}
                  className="text-foreground hover:text-accent transition-colors duration-300 font-medium relative group"
                >
                  {item.name}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-accent transition-all duration-300 group-hover:w-full"></span>
                </a>
              )
            )}
          </div>

          <div className="hidden md:block">
            <Link to="/dashboard">
              <Button variant="ocean" size="lg">
                Explore Reefs
              </Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 glass-coral rounded-lg mt-2">
              {navItems.map((item) =>
                item.type === "link" ? (
                  <Link
                    key={item.name}
                    to={item.href}
                    className="block px-3 py-2 text-foreground hover:text-accent transition-colors duration-300 font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                ) : (
                  <a
                    key={item.name}
                    href={item.href}
                    className="block px-3 py-2 text-foreground hover:text-accent transition-colors duration-300 font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.name}
                  </a>
                )
              )}
              <div className="px-3 py-2">
                <Link to="/dashboard" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="ocean" className="w-full">
                    Explore Reefs
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Header;