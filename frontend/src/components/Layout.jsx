import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Cake, Settings, Home } from "lucide-react";

const Layout = ({ children }) => {
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Dashboard", icon: Home },
    { path: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-cream relative">
      {/* Decorative shapes */}
      <div className="confetti-bg">
        <div className="confetti-shape triangle" style={{ top: '10%', left: '5%' }} />
        <div className="confetti-shape circle" style={{ top: '20%', right: '10%' }} />
        <div className="confetti-shape square" style={{ bottom: '30%', left: '8%' }} />
        <div className="confetti-shape triangle" style={{ bottom: '15%', right: '5%', transform: 'rotate(180deg)' }} />
        <div className="confetti-shape circle" style={{ top: '50%', right: '3%' }} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-cream border-b-2 border-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group" data-testid="logo-link">
              <div className="w-10 h-10 bg-coral border-2 border-black rounded-lg shadow-neo flex items-center justify-center group-hover:translate-x-[2px] group-hover:translate-y-[2px] group-hover:shadow-neo-hover transition-all duration-150">
                <Cake className="w-5 h-5 text-white" />
              </div>
              <span className="font-heading text-lg sm:text-xl font-bold tracking-tight hidden sm:block">
                BIRTHDAY<span className="text-coral">BUDDY</span>
              </span>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    data-testid={`nav-${item.label.toLowerCase()}`}
                    className={`flex items-center gap-2 px-4 py-2 border-2 border-black rounded-md font-bold text-sm uppercase tracking-wide transition-all duration-150 ${
                      isActive
                        ? "bg-black text-white shadow-none"
                        : "bg-white hover:bg-lime hover:translate-x-[2px] hover:translate-y-[2px] shadow-neo hover:shadow-neo-hover"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-black mt-12 py-6 bg-white relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="font-body text-sm text-gray-600">
            Never forget a birthday again! Made with{" "}
            <span className="text-coral">♥</span>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
