import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Home, Search, PlusCircle, User, Activity, Shield, ExternalLink } from 'lucide-react';
import { cn } from '../lib/utils';

export const Layout: React.FC = () => {
  return (
    <div className="min-h-screen pb-20 md:pb-0 md:pl-20">
      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-4 md:p-8">
        <Outlet />
      </main>

      {/* Navigation - Bottom for Mobile, Left Rail for Desktop */}
      <nav className={cn(
        "fixed bottom-0 left-0 right-0 h-16 glass z-50 flex items-center justify-around px-4",
        "md:top-0 md:bottom-0 md:left-0 md:right-auto md:w-20 md:h-full md:flex-col md:justify-center md:gap-8"
      )}>
        <NavIcon to="/" icon={<Home />} label="Home" />
        <NavIcon to="/search" icon={<Search />} label="Search" />
        <NavIcon to="/log" icon={<PlusCircle className="w-8 h-8 text-accent" />} label="Log" />
        <NavIcon to="/feed" icon={<Activity />} label="Feed" />
        <NavIcon to="/profile" icon={<User />} label="Profile" />
        
        <button 
          onClick={() => window.open(window.location.href, '_blank')}
          className="flex flex-col items-center gap-1 text-muted hover:text-white transition-colors"
          title="Open in new window"
        >
          <ExternalLink className="w-5 h-5" />
          <span className="text-[10px] uppercase tracking-widest font-bold md:hidden">Popup</span>
        </button>

        <NavIcon to="/admin" icon={<Shield className="w-5 h-5 text-red-500/50" />} label="Admin" />
      </nav>
    </div>
  );
};

interface NavIconProps {
  to: string;
  icon: React.ReactNode;
  label: string;
}

const NavIcon: React.FC<NavIconProps> = ({ to, icon, label }) => {
  return (
    <NavLink 
      to={to} 
      className={({ isActive }) => cn(
        "flex flex-col items-center gap-1 transition-colors",
        isActive ? "text-accent" : "text-muted hover:text-white"
      )}
    >
      {icon}
      <span className="text-[10px] uppercase tracking-widest font-bold md:hidden">{label}</span>
    </NavLink>
  );
};
