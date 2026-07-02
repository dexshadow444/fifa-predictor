import React from 'react';
import { Trophy, LogIn, Shield, Menu, X } from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  totalPoints: number;
  isAdmin: boolean;
  onLogoutAdmin: () => void;
  onOpenLoginModal: () => void,
}

export default function Navbar({
  currentTab,
  setCurrentTab,
  totalPoints,
  isAdmin,
  onLogoutAdmin,
  onOpenLoginModal,
}: NavbarProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const tabs = [
    { id: 'live', label: 'LIVE MATCHES' },
    { id: 'predictions', label: 'PREDICTIONS' },
    { id: 'leaderboard', label: 'LEADERBOARD' },
    { id: 'winners', label: 'PREDICTION WINNERS' },
    { id: 'tickets', label: 'MY TICKETS' }
  ];

  return (
    <header className="fixed top-0 w-full z-50 bg-[#1c070f]/90 backdrop-blur-xl border-b border-[#e9c349]/20">
      <nav className="flex justify-between items-center px-6 py-4 w-full max-w-7xl mx-auto">
        {/* Brand Logo */}
        
        
        <div 
          onClick={() => setCurrentTab('live')} 
          className="cursor-pointer flex items-center gap-2"
        >
          <span className="font-sans font-bold text-2xl text-[#ffd9e3] tracking-tighter uppercase">
            FIFA-PREDICT
          </span>
        </div>

        {/* Desktop Tabs */}
        <div className="hidden lg:flex items-center space-x-8 font-mono text-xs font-bold tracking-wider">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`transition-all pb-1 ${
                currentTab === tab.id
                  ? 'text-[#e9c349] border-b-2 border-[#e9c349]'
                  : 'text-[#debfc2] hover:text-[#e9c349]'
              }`}
            >
              {tab.label}
            </button>
          ))}
          {isAdmin && (
            <button
              onClick={() => setCurrentTab('admin')}
              className={`flex items-center gap-1 pb-1 transition-all ${
                currentTab === 'admin'
                  ? 'text-[#ffb2bd] border-b-2 border-[#ffb2bd]'
                  : 'text-[#ffb2bd]/70 hover:text-[#ffb2bd]'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              ADMIN CONSOLE
            </button>
          )}
        </div>
        

        {/* Action Widgets */}
        <div className="flex items-center gap-4">
          {/* Points Display Widget */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#301821] rounded-full border border-[#e9c349]/20">
            <Trophy className="w-3.5 h-3.5 text-[#e9c349]" />
            <span className="font-mono text-xs font-bold text-[#e9c349]">
              {totalPoints} {totalPoints === 1 ? 'PT' : 'PTS'}
            </span>
          </div>

          {/* Admin / Login indicators */}
          {isAdmin ? (
            <button
              onClick={onLogoutAdmin}
              className="bg-[#8a1538] hover:bg-[#a51c43] text-[#ffd9e3] px-4 py-2 font-mono text-xs font-bold tracking-widest uppercase rounded transition-all active:scale-95"
            >
              LOGOUT ADMIN
            </button>
          ) : (
            <button
              onClick={onOpenLoginModal}
              className="bg-[#e9c349] hover:bg-[#ffd042] text-[#241a00] px-5 py-2 font-sans font-bold text-xs tracking-widest uppercase transition-all active:scale-95"
            >
              LOGIN
            </button>
          )}

          {/* Autosync enabled — manual sync removed */}

          {/* Mobile responsive toggle */}
          <button 
            onClick={() => setIsOpen(!isOpen)} 
            className="md:hidden text-[#debfc2] hover:text-[#e9c349]"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Panel */}
      {isOpen && (
        <div className="md:hidden bg-[#1c070f] border-t border-[#e9c349]/10 py-4 px-6 space-y-3 font-mono text-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setCurrentTab(tab.id);
                setIsOpen(false);
              }}
              className={`block w-full text-left py-2 ${
                currentTab === tab.id ? 'text-[#e9c349] font-bold' : 'text-[#debfc2]'
              }`}
            >
              {tab.label}
            </button>
          ))}
          {isAdmin && (
            <button
              onClick={() => {
                setCurrentTab('admin');
                setIsOpen(false);
              }}
              className={`flex items-center gap-2 w-full text-left py-2 font-bold ${
                currentTab === 'admin' ? 'text-[#ffb2bd]' : 'text-[#ffb2bd]/70'
              }`}
            >
              <Shield className="w-4 h-4" />
              ADMIN CONSOLE
            </button>
          )}
        </div>
      )}
    </header>
  );
}
