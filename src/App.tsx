import React, { useEffect, useState, useRef } from 'react';
import { 
  Tv, 
  Fan, 
  Thermometer, 
  Power, 
  Activity, 
  Clock, 
  ShieldCheck,
  Cpu,
  Zap,
  Globe,
  ChevronDown,
  Menu,
  X,
  Mail,
  Trash2,
  User,
  Hash,
  RefreshCcw,
  History,
  Table
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auth, db } from './lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged,
  signOut,
  updateProfile
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  where,
  deleteDoc, 
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  limit
} from 'firebase/firestore';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Message {
  id: string;
  fullName: string;
  email: string;
  message: string;
  timestamp: string;
}

interface UsageSession {
  id: string;
  startTime: string;
  endTime: string;
  wattsConsumed: number;
  cost: number;
  durationMinutes: number;
  avgTemperature?: number;
}

interface TvState {
  isOn: boolean;
  temperature: number;
  fanOn: boolean;
  lastUpdate: string;
  serialNumber?: string;
  fanThreshold?: number;
  energyUsed?: number; // in kWh
  costConsumed?: number; // in RWF
  totalWh?: number; // Total Watts used (Wh)
  dailyCostEstimate?: number; // Cost per day (RWF)
  sessionStartTime?: string | null;
  sessionStartEnergy?: number | null;
}

function Navbar({ 
  onLoginClick, 
  isAuthenticated, 
  onLogout,
  currentView,
  setCurrentView
}: { 
  onLoginClick: () => void, 
  isAuthenticated: boolean, 
  onLogout: () => void,
  currentView: string,
  setCurrentView: (view: string) => void
}) {
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [lang, setLang] = useState('EN');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const languages = ['EN', 'FR', 'RW', 'SW'];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-brand-bg/80 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4 md:gap-8">
          <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => setCurrentView(isAuthenticated ? 'dashboard' : 'home')}>
            <div className="w-6 h-6 bg-brand-accent rounded flex items-center justify-center">
              <Tv className="text-black w-4 h-4" />
            </div>
            <span className="font-bold tracking-tighter uppercase italic text-xs md:text-sm whitespace-nowrap">
              EshuliTV <span className="text-brand-accent">Ltd</span>
            </span>
          </div>

          {!isAuthenticated && (
            <div className="hidden md:flex items-center gap-6 text-[10px] font-mono uppercase tracking-widest text-white/60">
              <button 
                onClick={() => setCurrentView('home')} 
                className={cn("hover:text-brand-accent transition-colors", currentView === 'home' && "text-brand-accent")}
              >
                Home
              </button>
              <button 
                onClick={() => setCurrentView('about')} 
                className={cn("hover:text-brand-accent transition-colors", currentView === 'about' && "text-brand-accent")}
              >
                About Us
              </button>
              <button 
                onClick={() => setCurrentView('contact')} 
                className={cn("hover:text-brand-accent transition-colors", currentView === 'contact' && "text-brand-accent")}
              >
                Contact
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Language Selector */}
          <div className="relative">
            <button 
              onClick={() => setIsLangOpen(!isLangOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg text-[10px] font-mono hover:bg-white/10 transition-colors"
            >
              <Globe className="w-3 h-3 text-brand-accent" />
              <span>{lang}</span>
              <ChevronDown className={cn("w-3 h-3 transition-transform", isLangOpen && "rotate-180")} />
            </button>
            
            <AnimatePresence>
              {isLangOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full right-0 mt-2 w-24 bg-brand-card border border-white/10 rounded-xl overflow-hidden shadow-2xl"
                >
                  {languages.map(l => (
                    <button 
                      key={l}
                      onClick={() => { setLang(l); setIsLangOpen(false); }}
                      className="w-full px-4 py-2 text-left text-[10px] font-mono hover:bg-brand-accent hover:text-black transition-colors"
                    >
                      {l}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setCurrentView('dashboard')}
                className={cn(
                  "hidden md:block px-4 py-1.5 text-[10px] font-mono rounded-lg transition-all",
                  currentView === 'dashboard' ? "bg-brand-accent text-black font-bold" : "border border-white/10 text-white/60 hover:text-white"
                )}
              >
                DASHBOARD
              </button>
              <button 
                onClick={onLogout}
                className="hidden md:block px-4 py-1.5 border border-brand-danger/30 text-brand-danger text-[10px] font-mono rounded-lg hover:bg-brand-danger hover:text-white transition-all"
              >
                LOGOUT
              </button>
            </div>
          ) : (
            <button 
              onClick={onLoginClick}
              className="hidden md:block px-4 py-1.5 bg-brand-accent text-black text-[10px] font-bold font-mono rounded-lg hover:scale-105 transition-all"
            >
              LOGIN
            </button>
          )}

          <button 
            className="md:hidden p-2 text-white/60"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden bg-brand-card border-b border-white/5 overflow-hidden"
          >
            <div className="p-4 flex flex-col gap-4 text-[10px] font-mono uppercase tracking-widest text-white/60">
              {!isAuthenticated ? (
                <>
                  <button onClick={() => { setCurrentView('home'); setIsMobileMenuOpen(false); }} className="text-left hover:text-brand-accent py-2">Home</button>
                  <button onClick={() => { setCurrentView('about'); setIsMobileMenuOpen(false); }} className="text-left hover:text-brand-accent py-2">About Us</button>
                  <button onClick={() => { setCurrentView('contact'); setIsMobileMenuOpen(false); }} className="text-left hover:text-brand-accent py-2">Contact</button>
                  <button onClick={() => { onLoginClick(); setIsMobileMenuOpen(false); }} className="text-left text-brand-accent py-2">Login</button>
                </>
              ) : (
                <>
                  <button onClick={() => { setCurrentView('dashboard'); setIsMobileMenuOpen(false); }} className="text-left text-brand-accent py-2">Dashboard</button>
                  <button onClick={() => { onLogout(); setIsMobileMenuOpen(false); }} className="text-left text-brand-danger py-2">Logout</button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

function LoginPage({ onLogin }: { onLogin: (role: string, approved: boolean, name?: string) => void }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegistering) {
        if (!email || !password || !fullName || (role === 'user' && !serialNumber)) {
          throw new Error('Please fill in all required fields.');
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: fullName });
        
        // Save role to Firestore
        const isInitialAdmin = role === 'admin';
        await setDoc(doc(db, "users", userCredential.user.uid), {
          fullName,
          email,
          role,
          serialNumber: role === 'user' ? serialNumber : 'ADMIN-SYSTEM',
          isApproved: isInitialAdmin,
          createdAt: serverTimestamp()
        });

        // Initialize TV state if it doesn't exist
        if (role === 'user') {
          const tvRef = doc(db, "tv_states", userCredential.user.uid);
          await setDoc(tvRef, {
            isOn: false,
            temperature: 25,
            fanOn: false,
            lastUpdate: new Date().toISOString(),
            userId: userCredential.user.uid,
            serialNumber: serialNumber,
            energyUsed: 0,
            totalWh: 0,
            costConsumed: 0,
            dailyCostEstimate: 0
          });
        }

        alert(`Account created successfully as ${role}! ${isInitialAdmin ? '' : 'Your account is currently locked. Please contact Eshuli for support.'}`);
        onLogin(role, isInitialAdmin, fullName);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        // Fetch role from Firestore
        const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
        const userData = userDoc.data();
        onLogin(userData?.role || 'user', userData?.isApproved || userData?.role === 'admin', userData?.fullName);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      if (err.code === 'auth/network-request-failed') {
        setError('Network error: Please check your internet connection and ensure your domain is authorized in Firebase Console.');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('Invalid email or password. Please check your credentials or create a new account.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed login attempts. Please try again later or reset your password.');
      } else {
        setError(err.message || 'An error occurred during authentication.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-brand-bg p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-brand-card border border-white/5 rounded-3xl p-8 md:p-12 shadow-2xl"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-brand-accent rounded-2xl flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(0,255,65,0.2)]">
            <Tv className="text-black w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tighter uppercase italic">
            EshuliTV <span className="text-brand-accent">Ltd</span>
          </h1>
          <p className="text-white/40 font-mono text-[10px] uppercase tracking-widest mt-2">
            {isRegistering ? 'Create New Account' : 'Secure Access Portal'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {isRegistering && (
            <>
              <div>
                <label className="block text-[10px] font-mono text-white/40 uppercase tracking-widest mb-2">Full Name</label>
                <input 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-accent transition-colors font-mono text-sm"
                  placeholder="Enter your name"
                />
              </div>
              {role === 'user' && (
                <div>
                  <label className="block text-[10px] font-mono text-white/40 uppercase tracking-widest mb-2">TV Serial Number</label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input 
                      type="text" 
                      value={serialNumber}
                      onChange={(e) => setSerialNumber(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-brand-accent transition-colors font-mono text-sm"
                      placeholder="e.g. ESH-2024-XXXX"
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-[10px] font-mono text-white/40 uppercase tracking-widest mb-2">Account Type</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setRole('user')}
                    className={cn(
                      "py-3 rounded-xl border font-mono text-[10px] uppercase tracking-widest transition-all",
                      role === 'user' ? "bg-brand-accent text-black border-brand-accent" : "bg-white/5 text-white/40 border-white/10 hover:border-white/20"
                    )}
                  >
                    User / Client
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={cn(
                      "py-3 rounded-xl border font-mono text-[10px] uppercase tracking-widest transition-all",
                      role === 'admin' ? "bg-brand-accent text-black border-brand-accent" : "bg-white/5 text-white/40 border-white/10 hover:border-white/20"
                    )}
                  >
                    Admin / Staff
                  </button>
                </div>
              </div>
            </>
          )}
          <div>
            <label className="block text-[10px] font-mono text-white/40 uppercase tracking-widest mb-2">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-accent transition-colors font-mono text-sm"
              placeholder="Enter your email"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono text-white/40 uppercase tracking-widest mb-2">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-accent transition-colors font-mono text-sm"
              placeholder="••••••••"
            />
          </div>
          
          {error && <p className="text-brand-danger text-[10px] font-mono text-center">{error}</p>}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-brand-accent text-black font-bold py-4 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(0,255,65,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'PROCESSING...' : (isRegistering ? 'CREATE ACCOUNT' : 'AUTHORIZE ACCESS')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
            className="text-[10px] font-mono text-brand-accent uppercase tracking-widest hover:underline"
          >
            {isRegistering ? 'Already have an account? Login' : 'New to EshuliTV? Create Account'}
          </button>
        </div>

        <div className="mt-8 pt-8 border-t border-white/5 text-center">
          <p className="text-[10px] font-mono text-white/20 uppercase tracking-[0.2em]">System ID: ESH-SEC-01</p>
        </div>
      </motion.div>
    </div>
  );
}

function TelemetryDashboard({ 
  status, 
  toggleTv, 
  isOverheating,
  onBack,
  onResetConsumption,
  usageSessions = []
}: { 
  status: TvState | null, 
  toggleTv: () => void, 
  isOverheating: boolean,
  onBack?: () => void,
  onResetConsumption?: () => void,
  usageSessions?: UsageSession[]
}) {
  const [showHistory, setShowHistory] = useState(false);
  return (
    <>
      {onBack && (
        <button 
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-[10px] font-mono text-white/40 hover:text-brand-accent transition-colors uppercase tracking-widest"
        >
          <ChevronDown className="w-4 h-4 rotate-90" /> Back to Overview
        </button>
      )}
      {/* Primary Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      
      {/* BLOCK 1: TV POWER STATUS (CIRCULAR BUTTON) */}
      <motion.div 
        whileHover={{ y: -5 }}
        className="bg-brand-card border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[220px] md:min-h-[240px] relative overflow-hidden group/card"
      >
        <div className="absolute top-4 left-4">
          <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Power Control</p>
        </div>
        
        <div className="absolute inset-0 bg-gradient-to-br from-brand-accent/5 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-500" />
        
          <button 
            onClick={toggleTv}
            className={cn(
              "w-24 h-24 md:w-28 md:h-28 rounded-full flex items-center justify-center transition-all duration-700 relative z-10 group shadow-2xl",
              status?.isOn 
                ? "bg-brand-accent text-black shadow-[0_0_50px_rgba(0,255,65,0.5)] scale-105 border-4 border-white/20" 
                : "bg-brand-danger/10 text-brand-danger shadow-[0_0_40px_rgba(255,65,0,0.3)] border-2 border-brand-danger/40 animate-pulse hover:bg-brand-danger/20"
            )}
          >
            <Power className={cn("w-10 h-10 md:w-12 md:h-12 transition-all duration-500 group-active:scale-90", status?.isOn ? "animate-pulse" : "opacity-80")} />
            {status?.isOn ? (
              <>
                <motion.div 
                  layoutId="glow"
                  className="absolute inset-0 rounded-full bg-brand-accent/30 animate-ping"
                />
                <div className="absolute -inset-4 rounded-full border border-brand-accent/20 animate-[spin_10s_linear_infinite]" />
              </>
            ) : (
              <div className="absolute inset-0 rounded-full bg-brand-danger/5 animate-ping" />
            )}
          </button>

          <div className="mt-8 text-center relative z-10">
            <h3 className={cn("text-xl font-bold tracking-tight uppercase transition-colors duration-500", status?.isOn ? "text-brand-accent lcd-glow" : "text-brand-danger/60")}>
              {status?.isOn ? "System Active" : "System Standby"}
            </h3>
            <p className="text-[9px] font-mono text-white/30 mt-1 uppercase tracking-[0.2em]">
              {status?.isOn ? "Broadcasting Live" : "Ready for Command"}
            </p>
          </div>
      </motion.div>

      {/* BLOCK 2: TEMPERATURE GAUGE */}
      <motion.div 
        whileHover={{ y: -5 }}
        className={cn(
          "bg-brand-card border rounded-2xl p-6 flex flex-col justify-between min-h-[240px] transition-all duration-500 relative overflow-hidden",
          isOverheating ? "border-brand-danger/40 bg-brand-danger/5 shadow-[0_0_30px_rgba(255,65,0,0.1)]" : "border-white/5"
        )}
      >
        <div className="flex justify-between items-start relative z-10">
          <div className={cn("p-3 rounded-xl transition-colors", isOverheating ? "bg-brand-danger/20" : "bg-white/5")}>
            <Thermometer className={cn("w-6 h-6", isOverheating ? "text-brand-danger animate-bounce" : "text-brand-warning")} />
          </div>
          <div className="text-right">
            <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Thermal State</p>
            {isOverheating ? (
              <span className="text-[9px] font-bold text-brand-danger uppercase tracking-tighter">Critical Alert</span>
            ) : (
              <span className="text-[9px] font-bold text-brand-accent uppercase tracking-tighter">Optimal</span>
            )}
          </div>
        </div>

        <div className="relative z-10">
          <div className="flex items-baseline gap-2 mb-4">
            <h3 className={cn("text-5xl font-bold tracking-tighter", isOverheating ? "text-brand-danger danger-glow" : "text-white")}>
              {status ? status.temperature.toFixed(1) : "0.0"}<span className="text-2xl">°</span>
            </h3>
            <span className="text-xs font-mono text-white/20 uppercase tracking-widest">Celsius</span>
          </div>
          
          {/* Visual Gauge */}
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden relative">
            {/* Threshold Marker */}
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-white/40 z-20"
              style={{ left: `${status?.fanThreshold || 30}%` }}
              title={`Fan Activation Threshold: ${status?.fanThreshold || 30}°C`}
            />
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${status ? Math.min(100, (status.temperature / 100) * 100) : 0}%` }}
              className={cn(
                "h-full transition-all duration-1000 relative z-10",
                status?.temperature && status.temperature > 80 ? "bg-brand-danger" : 
                status?.temperature && status.temperature > 60 ? "bg-brand-warning" : "bg-brand-accent"
              )}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[8px] font-mono text-white/20 uppercase">0°C</span>
            <span 
              className="text-[8px] font-mono text-brand-accent/60 uppercase"
              style={{ marginRight: `${100 - (status?.fanThreshold || 30)}%`, transform: 'translateX(50%)' }}
            >
              Fan Target: {status?.fanThreshold || 30}°C
            </span>
            <span className="text-[8px] font-mono text-white/20 uppercase">100°C</span>
          </div>
        </div>
      </motion.div>

      {/* BLOCK 3: COOLING SYSTEM (FAN) */}
      <motion.div 
        whileHover={{ y: -5 }}
        className={cn(
          "bg-brand-card border rounded-2xl p-6 flex flex-col justify-between min-h-[240px] transition-all duration-500 relative overflow-hidden",
          status?.fanOn ? "border-brand-accent/30 bg-brand-accent/5 shadow-[0_0_30px_rgba(0,255,65,0.1)]" : "border-white/5"
        )}
      >
        <div className="flex justify-between items-start relative z-10">
          <div className={cn("p-3 rounded-xl transition-all duration-500", status?.fanOn ? "bg-brand-accent/20" : "bg-white/5")}>
            <Fan className={cn("w-6 h-6 transition-all duration-1000", status?.fanOn ? "text-brand-accent animate-[spin_1s_linear_infinite]" : "text-white/20")} />
          </div>
          {status?.fanOn && (
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-bold text-brand-accent uppercase tracking-widest animate-pulse">Active Cooling</span>
              <span className="text-[8px] font-mono text-white/30 uppercase">Threshold: {status?.fanThreshold || 30}°C</span>
            </div>
          )}
        </div>

        <div className="relative z-10">
          <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-1">Cooling System</p>
          <h3 className={cn("text-3xl font-bold tracking-tight uppercase mb-4", status?.fanOn ? "text-brand-accent" : "text-white/20")}>
            {status?.fanOn ? "Fan Operating" : "Fan Standby"}
          </h3>
          
          {/* Fan Speed Indicator */}
          <div className="flex gap-1 h-4 items-end">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <motion.div 
                key={i}
                animate={status?.fanOn ? { 
                  height: [8, 16, 8],
                  backgroundColor: ["#00FF41", "#00FF41", "#00FF41"]
                } : { 
                  height: 4,
                  backgroundColor: "#333"
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 0.5, 
                  delay: i * 0.1,
                  ease: "easeInOut"
                }}
                className="w-1.5 rounded-full"
              />
            ))}
          </div>
        </div>
      </motion.div>

      {/* BLOCK 4: POWER CONSUMPTION */}
      <motion.div 
        whileHover={{ y: -5 }}
        className="bg-brand-card border border-white/5 rounded-2xl p-6 flex flex-col justify-between min-h-[240px] relative overflow-hidden"
      >
        <div className="flex justify-between items-start relative z-10">
          <div className="p-3 bg-white/5 rounded-xl">
            <Zap className={cn("w-6 h-6 transition-colors", status?.isOn ? "text-brand-warning" : "text-white/20")} />
          </div>
          <div className="text-right">
            <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Monthly Energy & Cost</p>
            <span className="text-[9px] font-bold text-white/60 uppercase">Current Cycle</span>
          </div>
        </div>

        <div className="relative z-10">
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-1">Energy Used</p>
              <div className="flex items-baseline gap-2">
                <h3 className={cn("text-3xl font-bold tracking-tighter", status?.isOn ? "text-white" : "text-white/20")}>
                  {status?.energyUsed?.toFixed(4) || "0.0000"}
                </h3>
                <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest">kWh</span>
              </div>
            </div>
            
            <div>
              <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-1">Cost Consumed</p>
              <div className="flex items-baseline gap-2">
                <h3 className={cn("text-3xl font-bold tracking-tighter text-brand-accent")}>
                  {status?.costConsumed?.toFixed(2) || "0.00"}
                </h3>
                <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest">RWF</span>
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex flex-col gap-2">
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className="w-full py-2.5 bg-brand-accent/10 hover:bg-brand-accent/20 text-brand-accent text-[10px] font-mono uppercase tracking-widest rounded-xl transition-all border border-brand-accent/20 flex items-center justify-center gap-2"
            >
              <History className="w-3 h-3" />
              {showHistory ? "Hide Usage History" : "View Usage Sessions"}
            </button>

            {onResetConsumption && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onResetConsumption();
                }}
                className="w-full py-2.5 bg-white/5 hover:bg-brand-danger/20 text-white/40 hover:text-brand-danger text-[10px] font-mono uppercase tracking-widest rounded-xl transition-all border border-white/5 hover:border-brand-danger/20 active:scale-95 flex items-center justify-center gap-2"
              >
                <RefreshCcw className="w-3 h-3" />
                Reset Records
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>

    <AnimatePresence>
      {showHistory && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-8 overflow-hidden"
        >
          <div className="bg-brand-card border border-white/5 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-mono text-white/40 uppercase tracking-widest flex items-center gap-2">
                <Table className="w-4 h-4 text-brand-accent" /> Detailed Usage History
              </h3>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-mono text-white/20 uppercase">Last 20 Sessions</span>
                <span className="text-[8px] font-mono text-brand-accent/40 md:hidden uppercase tracking-tighter">Swipe to scroll →</span>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full font-mono text-[11px] text-left">
                <thead>
                  <tr className="text-white/30 border-b border-white/5">
                    <th className="pb-3 px-2 font-medium uppercase tracking-widest">System ON</th>
                    <th className="pb-3 px-2 font-medium uppercase tracking-widest">System OFF</th>
                    <th className="pb-3 px-2 font-medium uppercase tracking-widest">Duration</th>
                    <th className="pb-3 px-2 font-medium uppercase tracking-widest">Temp</th>
                    <th className="pb-3 px-2 font-medium uppercase tracking-widest">Watts Used</th>
                    <th className="pb-3 px-2 font-medium uppercase tracking-widest">Cost (RWF)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {status?.isOn && status?.sessionStartTime && (
                    <tr className="bg-brand-accent/5 animate-pulse">
                      <td className="py-3 px-2 text-brand-accent font-bold">
                        {new Date(status.sessionStartTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-2 text-brand-accent italic">
                        RUNNING...
                      </td>
                      <td className="py-3 px-2 text-brand-accent">
                        {Math.round((new Date().getTime() - new Date(status.sessionStartTime).getTime()) / 60000)} MIN
                      </td>
                      <td className="py-3 px-2 text-brand-warning font-bold">
                        {status.temperature.toFixed(1)}°C
                      </td>
                      <td className="py-3 px-2 text-brand-warning">
                        {(((status.energyUsed || 0) - (status.sessionStartEnergy || 0)) * 1000).toFixed(2)} Wh
                      </td>
                      <td className="py-3 px-2 font-bold text-white">
                        {(((status.energyUsed || 0) - (status.sessionStartEnergy || 0)) * 250).toFixed(1)} RWF
                      </td>
                    </tr>
                  )}
                  {usageSessions.length === 0 && !status?.isOn ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-white/20 uppercase tracking-widest">No sessions recorded yet</td>
                    </tr>
                  ) : (
                    usageSessions.map((session) => (
                      <tr key={session.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-2 text-white/60">
                          {new Date(session.startTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-2 text-white/60">
                          {new Date(session.endTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-2 text-brand-accent">
                          {session.durationMinutes} MIN
                        </td>
                        <td className="py-3 px-2 text-white/40">
                          {session.avgTemperature ? `${session.avgTemperature.toFixed(1)}°C` : '--'}
                        </td>
                        <td className="py-3 px-2 text-brand-warning">
                          {session.wattsConsumed.toFixed(2)} Wh
                        </td>
                        <td className="py-3 px-2 font-bold text-white">
                          {session.cost.toFixed(1)} RWF
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Detailed View / Logs */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-brand-card border border-white/5 rounded-2xl p-8">
        <div className="flex items-center justify-between mb-8">
          <h4 className="text-sm font-mono text-white/40 uppercase tracking-widest">System Activity Log</h4>
          <div className="flex gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-accent" />
            <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
            <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
          </div>
        </div>
        <div className="space-y-4 font-mono text-[11px]">
          <div className="flex gap-4 text-white/40 border-b border-white/5 pb-2">
            <span className="w-20">TIMESTAMP</span>
            <span className="w-24">EVENT</span>
            <span>DESCRIPTION</span>
          </div>
          <div className="flex gap-4 text-brand-accent/80">
            <span className="w-20 opacity-50">{new Date().toLocaleTimeString()}</span>
            <span className="w-24">[INFO]</span>
            <span>System heartbeat detected. All sensors normal.</span>
          </div>
          {status?.isOn && (
            <div className="flex gap-4 text-white/60">
              <span className="w-20 opacity-50">{new Date().toLocaleTimeString()}</span>
              <span className="w-24 text-brand-warning">[POWER]</span>
              <span>Consuming {status.fanOn ? '170W' : '150W'}. Total: {status.energyUsed?.toFixed(4)} kWh ({status.costConsumed?.toFixed(1)} RWF)</span>
            </div>
          )}
          {status?.fanOn && (
            <div className="flex gap-4 text-brand-warning">
              <span className="w-20 opacity-50">{new Date().toLocaleTimeString()}</span>
              <span className="w-24">[WARN]</span>
              <span>Thermal threshold exceeded. Initiating active cooling.</span>
            </div>
          )}
          {isOverheating && status && (
            <div className="flex gap-4 text-brand-danger">
              <span className="w-20 opacity-50">{new Date().toLocaleTimeString()}</span>
              <span className="w-24">[CRIT]</span>
              <span>CORE TEMPERATURE CRITICAL: {Math.round(status.temperature)}°C</span>
            </div>
          )}
          <div className="flex gap-4 text-white/40">
            <span className="w-20 opacity-50">14:02:11</span>
            <span className="w-24">[SYS]</span>
            <span>User session authenticated via Eshuli-Auth-v2.</span>
          </div>
        </div>
      </div>

        <div className="bg-brand-card border border-white/5 rounded-2xl p-8 flex flex-col justify-center items-center text-center">
          <div className="w-20 h-20 bg-brand-accent/10 rounded-full flex items-center justify-center mb-6">
            <ShieldCheck className="w-10 h-10 text-brand-accent" />
          </div>
          <h4 className="text-lg font-bold mb-2">System Secured</h4>
          <p className="text-sm text-white/40 mb-6">Your EshuliTV is protected by enterprise-grade monitoring systems.</p>
          <div className="w-full py-3 bg-white/5 rounded-xl border border-white/5 text-[10px] font-mono uppercase tracking-widest">
            Hardware ID: ESH-992-TV
          </div>
        </div>
      </div>
    </>
  );
}

function VideoCarousel() {
  const videos = [
    { id: 1, title: "Precision Panel Assembly", url: "https://assets.mixkit.co/videos/preview/mixkit-hardware-parts-of-a-computer-motherboard-23028-large.mp4" },
    { id: 2, title: "Circuit Board Integration", url: "https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-a-technological-circuit-board-4431-large.mp4" },
    { id: 3, title: "Final Quality Calibration", url: "https://assets.mixkit.co/videos/preview/mixkit-abstract-animation-of-a-digital-eye-4432-large.mp4" }
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % videos.length);
    }, 30000); // 30 seconds as requested

    return () => clearInterval(timer);
  }, [videos.length]);

  return (
    <div className="relative w-full aspect-video bg-brand-card border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 1 }}
          className="absolute inset-0"
        >
          <video 
            autoPlay 
            muted 
            playsInline
            className="w-full h-full object-cover"
            onEnded={() => setCurrentIndex((prev) => (prev + 1) % videos.length)}
          >
            <source src={videos[currentIndex].url} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 p-8 md:p-12">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 bg-brand-accent text-black text-[10px] font-bold rounded-full">ASSEMBLY LINE</span>
              <span className="px-3 py-1 bg-white/10 text-white text-[10px] font-mono rounded-full">30S SHOWCASE</span>
            </div>
            <h3 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">{videos[currentIndex].title}</h3>
            <p className="text-white/40 font-mono text-xs uppercase tracking-widest">EshuliTV Manufacturing • Process {currentIndex + 1} of {videos.length}</p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Progress Indicators */}
      <div className="absolute top-8 right-8 flex gap-2 z-30">
        {videos.map((_, i) => (
          <div 
            key={i}
            className={cn(
              "h-1 transition-all duration-500 rounded-full",
              i === currentIndex ? "w-8 bg-brand-accent" : "w-2 bg-white/20"
            )}
          />
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [status, setStatus] = useState<TvState | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState<boolean>(false);
  const [userSerialNumber, setUserSerialNumber] = useState<string | null>(null);
  const [userFullName, setUserFullName] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [currentView, setCurrentView] = useState('home'); // 'home', 'about', 'contact', 'dashboard'
  const [dashboardTab, setDashboardTab] = useState<'telemetry' | 'messages' | 'users'>('telemetry');
  const [firestoreMessages, setFirestoreMessages] = useState<Message[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [usageSessions, setUsageSessions] = useState<UsageSession[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Safety timeout for auth loading
    const timeout = setTimeout(() => {
      setAuthLoading(false);
    }, 5000);

    // Listen for Auth state
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      clearTimeout(timeout);
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserRole(userData.role);
            setUserFullName(userData.fullName || user.displayName);
            setIsApproved(userData.isApproved || userData.role === 'admin');
            setUserSerialNumber(userData.serialNumber || null);
            setIsAuthenticated(true);
            setCurrentView('dashboard');
          } else {
            setUserRole('user');
            setIsApproved(false);
            setIsAuthenticated(true);
            setCurrentView('dashboard');
          }
        } catch (err) {
          console.error("Error fetching user role:", err);
          setUserRole('user');
          setIsApproved(false);
          setIsAuthenticated(true);
          setCurrentView('dashboard');
        } finally {
          setAuthLoading(false);
        }
      } else {
        setIsAuthenticated(false);
        setUserRole(null);
        setIsApproved(false);
        setStatus(null);
        setUserSerialNumber(null);
        setUserFullName(null);
        setCurrentView('home');
        setAuthLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  // Usage Sessions Listener
  useEffect(() => {
    if (!auth.currentUser) return;
    
    const q = query(
      collection(db, "usage_sessions"), 
      where("userId", "==", auth.currentUser.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UsageSession[];
      
      // Sort client-side to avoid Firestore index requirement
      const sortedSessions = sessions.sort((a: any, b: any) => {
        const timeA = a.timestamp?.seconds || 0;
        const timeB = b.timestamp?.seconds || 0;
        return timeB - timeA;
      }).slice(0, 20);
      
      setUsageSessions(sortedSessions);
    });

    return () => unsubscribe();
  }, [isAuthenticated]);

  // TV State Real-time Listener
  useEffect(() => {
    let unsubscribeTv = () => {};

    if (isAuthenticated && auth.currentUser && isApproved) {
      if (userRole === 'user') {
        const tvRef = doc(db, "tv_states", auth.currentUser.uid);
        unsubscribeTv = onSnapshot(tvRef, async (docSnap) => {
          if (docSnap.exists()) {
            setStatus(docSnap.data() as TvState);
          } else {
            // If document doesn't exist, initialize it with defaults
            const defaultState: TvState = {
              isOn: false,
              temperature: 28.5, // Start closer to threshold for faster demo
              fanOn: false,
              fanThreshold: 30,
              energyUsed: 0,
              costConsumed: 0,
              lastUpdate: new Date().toISOString(),
              serialNumber: userSerialNumber || 'PENDING'
            };
            try {
              await setDoc(tvRef, defaultState);
              setStatus(defaultState);
            } catch (err) {
              console.error("Error initializing TV state:", err);
            }
          }
        }, (err) => {
          console.error("TV State listener error:", err);
          // Fallback to prevent stuck loading screen
          setStatus({
            isOn: false,
            temperature: 20,
            fanOn: false,
            lastUpdate: new Date().toISOString(),
            serialNumber: userSerialNumber || 'OFFLINE'
          });
        });
      } else if (userRole === 'admin') {
        // Admins see a system-wide status or a default one to prevent crashes
        setStatus({
          isOn: true,
          temperature: 29.5, // Start close to threshold
          fanOn: false,
          fanThreshold: 30,
          energyUsed: 1.2,
          costConsumed: 350,
          lastUpdate: new Date().toISOString(),
          serialNumber: 'SYSTEM-CORE'
        });
      }
    }

    return () => unsubscribeTv();
  }, [isAuthenticated, isApproved, userRole]);

  // Client-side Simulation Logic
  useEffect(() => {
    if (isAuthenticated && auth.currentUser && isApproved && status?.isOn !== undefined) {
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);

      simulationIntervalRef.current = setInterval(async () => {
        setStatus(prev => {
          if (!prev) return null;
          
          const next = { ...prev };
          let changed = false;
          const threshold = next.fanThreshold || 30;

          if (next.isOn) {
            // Aggressive temperature rise when TV is on to reach threshold quickly
            next.temperature += 1.5 + (Math.random() * 2.5);
            changed = true;
          } else {
            // Ambient heat or natural cooling
            if (next.temperature < 28) {
              next.temperature += Math.random() * 0.5; // Slow rise even when off
              changed = true;
            } else if (next.temperature > 22) {
              next.temperature -= Math.random() * 0.4;
              changed = true;
            }
          }

          // Automatic Fan Logic (Safety System)
          // Fan turns on if temperature exceeds threshold
          if (next.temperature > threshold && !next.fanOn) {
            next.fanOn = true;
            changed = true;
          } 
          // Fan turns off only when temperature drops below (threshold - 2)
          else if (next.temperature < (threshold - 2) && next.fanOn) {
            next.fanOn = false;
            changed = true;
          }

          // Cooling effect of the fan
          if (next.fanOn) {
            next.temperature -= Math.random() * 2.2;
            changed = true;
          }

          // Energy & Cost Calculation
          if (next.isOn || next.fanOn) {
            const powerWatts = (next.isOn ? 150 : 0) + (next.fanOn ? 25 : 0);
            const intervalHours = 2 / 3600; // 2 seconds interval
            const energyKwh = (powerWatts / 1000) * intervalHours;
            
            next.energyUsed = (next.energyUsed || 0) + energyKwh;
            next.totalWh = (next.energyUsed * 1000);
            next.costConsumed = (next.costConsumed || 0) + (energyKwh * 250); // 250 RWF per kWh
            
            // Simple daily estimate: if we assume this usage is constant for 24h
            // But user might want "cost per day" as a historical average.
            // For now, let's just show it as a field they can track.
            next.dailyCostEstimate = (next.costConsumed); 
            changed = true;
          }

          if (changed) {
            next.temperature = Math.max(20, Math.min(100, next.temperature));
            next.lastUpdate = new Date().toISOString();
            
            // Periodically sync to Firestore (every ~10 seconds to avoid too many writes)
            if (Math.random() < 0.2 && auth.currentUser) {
              setDoc(doc(db, "tv_states", auth.currentUser.uid), next, { merge: true })
                .catch(err => console.error("Sync error:", err));
            }
            return next;
          }
          return prev;
        });
      }, 2000);
    }

    return () => {
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
    };
  }, [isAuthenticated, isApproved, userRole, status?.isOn]); // Only restart if power state changes or auth changes

  const isOverheating = status ? status.temperature > 80 : false;

  useEffect(() => {
    // Listen for Firestore messages
    let unsubscribeMessages = () => {};
    let unsubscribeUsers = () => {};

    if (isAuthenticated && userRole) {
      // Fix index error by removing orderBy if filtering, or just use simple query
      const q = userRole === 'admin' 
        ? query(collection(db, "messages"), orderBy("timestamp", "desc"))
        : query(collection(db, "messages"), where("email", "==", auth.currentUser?.email));
      
      unsubscribeMessages = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({
          id: doc.id as any,
          ...doc.data()
        })) as Message[];
        // Sort manually if needed to avoid index requirement for now
        if (userRole !== 'admin') {
          msgs.sort((a, b) => (b.timestamp as any)?.seconds - (a.timestamp as any)?.seconds);
        }
        setFirestoreMessages(msgs);
      }, (error) => {
        console.error("Firestore messages error:", error);
      });

      // Admin: Listen for all users
      if (userRole === 'admin') {
        const usersQ = query(collection(db, "users"), orderBy("createdAt", "desc"));
        unsubscribeUsers = onSnapshot(usersQ, (snapshot) => {
          const users = snapshot.docs.map(doc => ({
            uid: doc.id,
            ...doc.data()
          }));
          setAllUsers(users);
        });
      }
    }

    return () => {
      unsubscribeMessages();
      unsubscribeUsers();
    };
  }, [isAuthenticated, userRole]);

  const toggleTv = async () => {
    if (auth.currentUser && status) {
      const isTurningOn = !status.isOn;
      const now = new Date().toISOString();
      
      let newState: TvState = {
        ...status,
        isOn: isTurningOn,
        lastUpdate: now
      };

      if (isTurningOn) {
        // Record session start
        newState.sessionStartTime = now;
        newState.sessionStartEnergy = status.energyUsed || 0;
      } else if (status.sessionStartTime) {
        // Record session end and save to history
        const startTime = new Date(status.sessionStartTime);
        const endTime = new Date(now);
        const durationMs = endTime.getTime() - startTime.getTime();
        const durationMinutes = Math.round(durationMs / 60000);
        
        const energyAtStart = status.sessionStartEnergy || 0;
        const energyAtEnd = status.energyUsed || 0;
        const energyUsedInSession = Math.max(0, energyAtEnd - energyAtStart);
        const wattsConsumed = energyUsedInSession * 1000;
        const cost = energyUsedInSession * 250;

        try {
          await addDoc(collection(db, "usage_sessions"), {
            userId: auth.currentUser.uid,
            startTime: status.sessionStartTime,
            endTime: now,
            wattsConsumed,
            cost,
            durationMinutes,
            avgTemperature: status.temperature,
            timestamp: serverTimestamp()
          });
        } catch (err) {
          console.error("Error saving usage session:", err);
        }

        newState.sessionStartTime = null;
        newState.sessionStartEnergy = null;
      }
      
      // Update local state immediately
      setStatus(newState);

      // Sync to Firestore
      try {
        await setDoc(doc(db, "tv_states", auth.currentUser.uid), newState, { merge: true });
      } catch (error) {
        console.error("Error toggling TV:", error);
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSending(true);
    const formData = new FormData(e.currentTarget);
    const messageData = {
      fullName: formData.get('fullName') as string,
      email: formData.get('email') as string,
      message: formData.get('message') as string,
      timestamp: new Date().toISOString(),
    };
    
    if (messageData.fullName && messageData.email && messageData.message) {
      try {
        await addDoc(collection(db, "messages"), {
          ...messageData,
          serverTimestamp: serverTimestamp()
        });
        alert('Message sent successfully! You can now see this in the Firebase Database.');
        (e.target as HTMLFormElement).reset();
      } catch (err) {
        console.error("Error adding document: ", err);
        alert('Failed to send message. Make sure your Firestore rules allow writes.');
      } finally {
        setIsSending(false);
      }
    } else {
      alert('Please fill in all fields.');
      setIsSending(false);
    }
  };

  const deleteMessage = async (id: string) => {
    try {
      await deleteDoc(doc(db, "messages", id));
    } catch (err) {
      console.error("Error deleting document: ", err);
      alert('Failed to delete message.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsAuthenticated(false);
      setCurrentView('home');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleManualSync = async () => {
    if (!status || !auth.currentUser) return;
    setIsSyncing(true);
    try {
      await addDoc(collection(db, "system_logs"), {
        event: "MANUAL_SYNC",
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        tvState: status,
        timestamp: serverTimestamp()
      });
      alert('System state synced to Firebase Database successfully!');
    } catch (err) {
      console.error("Sync error:", err);
      alert('Sync failed. Check your Firestore rules.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLoginSuccess = (role: string, approved: boolean, name?: string) => {
    setUserRole(role);
    setIsApproved(approved);
    if (name) setUserFullName(name);
    setIsAuthenticated(true);
    setShowLogin(false);
    setCurrentView('dashboard');
    setAuthLoading(false);
  };

  const resetConsumption = async () => {
    if (!auth.currentUser || !status) return;
    
    // Use a simpler confirmation or just proceed if the user is having trouble
    const confirmed = window.confirm("Eshuli: Are you sure you want to CLEAR ALL energy, watts, and cost records? This cannot be undone.");
    if (!confirmed) return;

    setIsSyncing(true);
    try {
      const newState = {
        ...status,
        energyUsed: 0,
        totalWh: 0,
        costConsumed: 0,
        dailyCostEstimate: 0,
        lastUpdate: new Date().toISOString()
      };

      // Update local state immediately
      setStatus(newState);

      // Update Firestore
      await setDoc(doc(db, "tv_states", auth.currentUser.uid), newState, { merge: true });
      
      // Clear usage sessions history for this user
      const deletePromises = usageSessions.map(session => 
        deleteDoc(doc(db, "usage_sessions", session.id))
      );
      await Promise.all(deletePromises);
      
      // Add a log message
      await addDoc(collection(db, "messages"), {
        email: auth.currentUser.email,
        fullName: userFullName || auth.currentUser.displayName || "System User",
        message: "ALL energy, watts, and cost records have been CLEARED for the new cycle.",
        timestamp: serverTimestamp(),
        type: 'system'
      });
      
      alert("SUCCESS: All energy and cost records have been cleared to 0.");
    } catch (error) {
      console.error("Error resetting consumption:", error);
      alert("Failed to reset records. Please check your connection.");
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleUserApproval = async (userId: string, currentStatus: boolean) => {
    try {
      await setDoc(doc(db, "users", userId), { isApproved: !currentStatus }, { merge: true });
    } catch (err) {
      console.error("Error toggling approval:", err);
      alert("Failed to update user status.");
    }
  };

  const deleteUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, "users", userId));
      // Also delete their TV state if it exists
      await deleteDoc(doc(db, "tv_states", userId));
    } catch (err) {
      console.error("Error deleting user:", err);
      alert("Failed to delete user.");
    }
  };

  return (
    authLoading ? (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-brand-accent border-t-transparent rounded-full animate-spin" />
        <p className="font-mono text-brand-accent animate-pulse uppercase tracking-widest text-xs">Authenticating...</p>
      </div>
    ) : (
      <div className="min-h-screen bg-brand-bg pt-16">
      <Navbar 
        isAuthenticated={isAuthenticated} 
        onLogout={handleLogout} 
        onLoginClick={() => setShowLogin(true)}
        currentView={currentView}
        setCurrentView={setCurrentView}
      />

      {showLogin && !isAuthenticated ? (
        <div className="relative">
          <button 
            onClick={() => setShowLogin(false)}
            className="absolute top-8 left-8 z-50 flex items-center gap-2 text-[10px] font-mono text-white/40 hover:text-brand-accent transition-colors"
          >
            <X className="w-4 h-4" /> BACK TO HOME
          </button>
          <LoginPage onLogin={handleLoginSuccess} />
        </div>
      ) : isAuthenticated ? (
        <div className="p-4 md:p-8 selection:bg-brand-accent selection:text-black">
          {/* Dashboard Content */}
          {(!status && userRole === 'user' && isApproved) ? (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
              <div className="w-12 h-12 border-4 border-brand-accent border-t-transparent rounded-full animate-spin" />
              <p className="font-mono text-brand-accent animate-pulse">INITIALIZING SYSTEM...</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <header className="max-w-6xl mx-auto mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-8">
                <div className="flex flex-col gap-4">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tighter uppercase italic">
                      {userRole === 'admin' ? 'Control Dashboard' : 'Client Portal'}
                    </h2>
                    <p className="text-white/40 font-mono text-xs tracking-widest uppercase">
                      {userRole === 'admin' 
                        ? (dashboardTab === 'telemetry' ? 'Live System Telemetry' : 'Support Messages Inbox')
                        : `Your Service Status • SN: ${userSerialNumber || 'PENDING'}`}
                    </p>
                  </div>
                  
                  {userRole === 'admin' && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setDashboardTab('telemetry')}
                        className={cn(
                          "px-4 py-2 rounded-lg font-mono text-[10px] uppercase tracking-widest transition-all",
                          dashboardTab === 'telemetry' ? "bg-brand-accent text-black" : "bg-white/5 text-white/40 hover:bg-white/10"
                        )}
                      >
                        Telemetry
                      </button>
                      <button 
                        onClick={handleManualSync}
                        disabled={isSyncing}
                        className="px-4 py-2 rounded-lg font-mono text-[10px] uppercase tracking-widest bg-white/5 text-white/40 hover:bg-white/10 transition-all disabled:opacity-50"
                      >
                        {isSyncing ? 'SYNCING...' : 'SYNC TO DB'}
                      </button>
                      <button 
                        onClick={() => setDashboardTab('messages')}
                        className={cn(
                          "px-4 py-2 rounded-lg font-mono text-[10px] uppercase tracking-widest transition-all relative",
                          dashboardTab === 'messages' ? "bg-brand-accent text-black" : "bg-white/5 text-white/40 hover:bg-white/10"
                        )}
                      >
                        Messages
                        {firestoreMessages.length > 0 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-danger text-white rounded-full flex items-center justify-center text-[8px] animate-bounce">
                            {firestoreMessages.length}
                          </span>
                        )}
                      </button>
                      <button 
                        onClick={() => setDashboardTab('users')}
                        className={cn(
                          "px-4 py-2 rounded-lg font-mono text-[10px] uppercase tracking-widest transition-all relative",
                          dashboardTab === 'users' ? "bg-brand-accent text-black" : "bg-white/5 text-white/40 hover:bg-white/10"
                        )}
                      >
                        Users
                        {allUsers.filter(u => !u.isApproved && u.role !== 'admin').length > 0 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-accent text-black rounded-full flex items-center justify-center text-[8px] animate-pulse">
                            {allUsers.filter(u => !u.isApproved && u.role !== 'admin').length}
                          </span>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-6 font-mono text-[10px] uppercase tracking-widest text-white/60">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full bg-brand-accent animate-pulse")} />
                    System Online
                  </div>
                  {status && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      {new Date(status.lastUpdate).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </header>

              <main className="max-w-6xl mx-auto">
                {!isApproved && userRole !== 'admin' ? (
                  <div className="bg-brand-card border border-brand-danger/20 rounded-3xl p-12 text-center">
                    <ShieldCheck className="w-16 h-16 text-brand-danger mx-auto mb-6 animate-pulse" />
                    <h3 className="text-2xl font-bold mb-4 uppercase italic tracking-tighter">Account Locked</h3>
                    <p className="text-white/60 max-w-md mx-auto leading-relaxed">
                      Your account is currently locked. Please contact Eshuli for support.
                    </p>
                    <div className="mt-8 p-4 bg-brand-danger/10 rounded-xl border border-brand-danger/20 inline-block">
                      <p className="text-brand-danger text-[10px] font-mono uppercase tracking-widest">Status: Account Locked</p>
                    </div>
                  </div>
                ) : userRole === 'admin' ? (
                  dashboardTab === 'telemetry' ? (
                    <TelemetryDashboard 
                      status={status} 
                      toggleTv={toggleTv} 
                      isOverheating={isOverheating} 
                      onResetConsumption={resetConsumption}
                      usageSessions={usageSessions}
                    />
                  ) : dashboardTab === 'users' ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-bold tracking-tight uppercase italic">User Accounts <span className="text-brand-accent">({allUsers.length})</span></h3>
                        <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Approval Management</p>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        {allUsers.length === 0 ? (
                          <div className="bg-brand-card border border-white/5 rounded-2xl p-20 flex flex-col items-center justify-center text-center">
                            <User className="w-12 h-12 text-white/10 mb-4" />
                            <p className="text-white/40 font-mono text-xs uppercase tracking-widest">No accounts found</p>
                          </div>
                        ) : (
                          allUsers.map((user) => (
                            <motion.div 
                              key={user.uid}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="bg-brand-card border border-white/5 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:border-white/10 transition-all group"
                            >
                              <div className="flex items-center gap-4">
                                <div className={cn(
                                  "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                                  user.role === 'admin' ? "bg-brand-accent/20" : "bg-white/5"
                                )}>
                                  <User className={cn("w-6 h-6", user.role === 'admin' ? "text-brand-accent" : "text-white/40")} />
                                </div>
                                <div className="overflow-hidden">
                                  <h4 className="font-bold text-white flex items-center gap-2 truncate">
                                    {user.fullName}
                                    {user.role === 'admin' && <span className="text-[8px] bg-brand-accent/20 text-brand-accent px-1.5 py-0.5 rounded uppercase font-mono shrink-0">Admin</span>}
                                  </h4>
                                  <p className="text-white/40 text-xs font-mono truncate">{user.email}</p>
                                </div>
                              </div>
                              
                              <div className="flex flex-row sm:flex-row items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 border-white/5 pt-4 sm:pt-0">
                                <div className="text-left sm:text-right">
                                  <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest">Status</p>
                                  <p className={cn(
                                    "text-xs font-bold uppercase tracking-widest",
                                    user.isApproved || user.role === 'admin' ? "text-brand-accent" : "text-brand-danger"
                                  )}>
                                    {user.isApproved || user.role === 'admin' ? "Approved" : "Pending"}
                                  </p>
                                </div>
                                
                                {user.role !== 'admin' && (
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => toggleUserApproval(user.uid, user.isApproved || false)}
                                      className={cn(
                                        "px-4 sm:px-6 py-2.5 rounded-xl text-[10px] font-mono uppercase tracking-widest transition-all font-bold whitespace-nowrap",
                                        user.isApproved 
                                          ? "bg-brand-danger/10 text-brand-danger hover:bg-brand-danger hover:text-white" 
                                          : "bg-brand-accent text-black hover:scale-105 shadow-[0_0_20px_rgba(0,255,65,0.2)]"
                                      )}
                                    >
                                      {user.isApproved ? "Revoke" : "Approve"}
                                    </button>
                                    <button
                                      onClick={() => deleteUser(user.uid)}
                                      className="p-2.5 bg-brand-danger/10 text-brand-danger rounded-xl hover:bg-brand-danger hover:text-white transition-all shrink-0"
                                      title="Delete User"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          ))
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-bold tracking-tight uppercase italic">Inbox <span className="text-brand-accent">({firestoreMessages.length})</span></h3>
                        <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Support Requests</p>
                      </div>

                  {firestoreMessages.length === 0 ? (
                    <div className="bg-brand-card border border-white/5 rounded-2xl p-20 flex flex-col items-center justify-center text-center">
                      <Mail className="w-12 h-12 text-white/10 mb-4" />
                      <p className="text-white/40 font-mono text-xs uppercase tracking-widest">No messages found</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {firestoreMessages.map((msg) => (
                        <motion.div 
                          key={msg.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="bg-brand-card border border-white/5 rounded-2xl p-6 hover:border-brand-accent/30 transition-all group"
                        >
                          <div className="flex flex-col md:flex-row justify-between gap-4">
                            <div className="flex gap-4">
                              <div className="w-12 h-12 bg-brand-accent/10 rounded-xl flex items-center justify-center shrink-0">
                                <Mail className="w-6 h-6 text-brand-accent" />
                              </div>
                              <div>
                                <div className="flex items-center gap-3 mb-1">
                                  <h4 className="font-bold text-white">{msg.fullName}</h4>
                                  <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest">{new Date(msg.timestamp).toLocaleString()}</span>
                                </div>
                                <p className="text-brand-accent text-xs mb-3">{msg.email}</p>
                                <p className="text-white/60 text-sm leading-relaxed">{msg.message}</p>
                              </div>
                            </div>
                            <div className="flex items-start">
                              <button 
                                onClick={() => deleteMessage(msg.id)}
                                className="p-2 bg-brand-danger/10 text-brand-danger rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-brand-danger hover:text-white"
                                title="Delete Message"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )) : (
                  <div className="space-y-8">
                    {dashboardTab === 'telemetry' ? (
                      <TelemetryDashboard 
                        status={status} 
                        toggleTv={toggleTv} 
                        isOverheating={isOverheating} 
                        onBack={() => setDashboardTab('overview')}
                        onResetConsumption={resetConsumption}
                        usageSessions={usageSessions}
                      />
                    ) : (
                      <div className="bg-brand-card border border-white/5 rounded-3xl p-8 md:p-12">
                        <div className="flex items-center gap-4 mb-8">
                          <div className="w-12 h-12 bg-brand-accent/10 rounded-2xl flex items-center justify-center">
                            <User className="text-brand-accent w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold">Welcome back, {auth.currentUser?.displayName}</h3>
                            <p className="text-white/40 text-sm">You are logged in as a Client.</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-white/5 border border-white/5 rounded-2xl p-6">
                            <h4 className="text-xs font-mono text-white/40 uppercase tracking-widest mb-4">Your Messages</h4>
                            <div className="space-y-4">
                              {firestoreMessages.filter(m => m.email === auth.currentUser?.email).length === 0 ? (
                                <p className="text-white/20 text-xs italic">No messages sent yet.</p>
                              ) : (
                                firestoreMessages.filter(m => m.email === auth.currentUser?.email).map(msg => (
                                  <div key={msg.id} className="border-l-2 border-brand-accent pl-4 py-1">
                                    <p className="text-white/80 text-sm">{msg.message}</p>
                                    <span className="text-[10px] text-white/20 font-mono">{new Date(msg.timestamp).toLocaleDateString()}</span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                          
                          <div className="bg-white/5 border border-white/5 rounded-2xl p-6">
                            <h4 className="text-xs font-mono text-white/40 uppercase tracking-widest mb-4">Quick Actions</h4>
                            <div className="flex flex-col gap-3">
                              <button 
                                onClick={() => setDashboardTab('telemetry')}
                                className="w-full py-3 bg-brand-accent text-black font-bold rounded-xl text-xs uppercase tracking-widest hover:scale-[1.02] transition-all"
                              >
                                View Live Telemetry
                              </button>
                              <button 
                                onClick={handleLogout}
                                className="w-full py-3 bg-white/5 text-brand-danger border border-brand-danger/20 rounded-xl text-xs uppercase tracking-widest hover:bg-brand-danger/10 transition-all"
                              >
                                Secure Logout
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </main>
            </>
          )}
        </div>
      ) : currentView === 'about' ? (
        <div className="max-w-4xl mx-auto py-20 px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl font-bold mb-8 italic uppercase tracking-tighter">About <span className="text-brand-accent">EshuliTV</span></h1>
            <div className="space-y-6 text-white/60 leading-relaxed text-lg">
              <p>EshuliTV Ltd is a pioneer in professional display monitoring and control systems. We provide high-performance solutions for managing smart displays in enterprise environments.</p>
              <p>Our technology focuses on real-time telemetry, thermal management, and energy efficiency, ensuring your hardware operates at peak performance 24/7.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
                <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
                  <Cpu className="w-8 h-8 text-brand-accent mb-4" />
                  <h4 className="font-bold mb-2">Smart Control</h4>
                  <p className="text-sm">Advanced algorithms for optimal hardware management.</p>
                </div>
                <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
                  <Activity className="w-8 h-8 text-brand-accent mb-4" />
                  <h4 className="font-bold mb-2">Real-time Data</h4>
                  <p className="text-sm">Live telemetry and system health monitoring.</p>
                </div>
                <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
                  <ShieldCheck className="w-8 h-8 text-brand-accent mb-4" />
                  <h4 className="font-bold mb-2">Enterprise Security</h4>
                  <p className="text-sm">Secure access and encrypted data transmission.</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      ) : currentView === 'contact' ? (
        <div className="max-w-4xl mx-auto py-20 px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl font-bold mb-8 italic uppercase tracking-tighter">Contact <span className="text-brand-accent">Support</span></h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <p className="text-white/60 text-lg">Need help with your EshuliTV system? Our technical team is available 24/7 to assist you with any inquiries.</p>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/5">
                    <div className="w-10 h-10 bg-brand-accent/10 rounded-lg flex items-center justify-center">
                      <Globe className="w-5 h-5 text-brand-accent" />
                    </div>
                    <div>
                      <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Email Support</p>
                      <p className="text-sm font-bold">support@eshulitv.com</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/5">
                    <div className="w-10 h-10 bg-brand-accent/10 rounded-lg flex items-center justify-center">
                      <Activity className="w-5 h-5 text-brand-accent" />
                    </div>
                    <div>
                      <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Technical Hotline</p>
                      <p className="text-sm font-bold">+250 7XX XXX XXX</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-brand-card border border-white/5 rounded-2xl p-8 shadow-2xl">
                <h4 className="font-bold mb-6 uppercase tracking-widest text-sm text-white/40">Send a Message</h4>
                <form className="space-y-4" onSubmit={handleSendMessage}>
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-white/40 uppercase">Full Name</label>
                    <input name="fullName" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-brand-accent outline-none transition-colors" placeholder="John Doe" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-white/40 uppercase">Email Address</label>
                    <input name="email" type="email" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-brand-accent outline-none transition-colors" placeholder="john@example.com" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-white/40 uppercase">Message</label>
                    <textarea name="message" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm h-32 focus:border-brand-accent outline-none transition-colors" placeholder="How can we help?" required></textarea>
                  </div>
                  <button 
                    type="submit" 
                    disabled={isSending}
                    className="w-full bg-brand-accent text-black font-bold py-4 rounded-lg text-sm hover:scale-[1.02] transition-transform shadow-lg disabled:opacity-50"
                  >
                    {isSending ? 'SENDING...' : 'SEND MESSAGE'}
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        </div>
      ) : (
        <div className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden">
          {/* Video Background */}
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-brand-bg/60 z-10 backdrop-blur-[2px]" />
            <video 
              autoPlay 
              muted 
              loop 
              playsInline
              className="w-full h-full object-cover opacity-40"
            >
              <source src="https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-a-technological-circuit-board-4431-large.mp4" type="video/mp4" />
            </video>
          </div>

          <div className="relative z-20 text-center p-8 max-w-4xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-accent/10 border border-brand-accent/20 rounded-full text-brand-accent text-[10px] font-mono uppercase tracking-widest mb-6">
                <Zap className="w-3 h-3" /> Next-Gen 4K Display Technology
              </div>
              <h1 className="text-4xl md:text-7xl font-bold mb-6 italic uppercase tracking-tighter leading-none px-4">
                Experience <span className="text-brand-accent">EshuliTV</span>
              </h1>
              <p className="text-white/60 text-base md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed px-6">
                The ultimate professional monitoring and control dashboard for enterprise-grade EshuliTV systems. 
                Manage your hardware with precision and real-time telemetry.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 px-8">
                <button 
                  onClick={() => setShowLogin(true)}
                  className="w-full sm:w-auto px-10 py-4 bg-brand-accent text-black font-bold rounded-xl hover:scale-105 transition-all shadow-[0_0_30px_rgba(0,255,65,0.3)]"
                >
                  ACCESS DASHBOARD
                </button>
                <button className="w-full sm:w-auto px-10 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-all">
                  WATCH SHOWCASE
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
      
      {/* Global Footer */}
      <footer className="max-w-7xl mx-auto px-4 py-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4 text-[10px] font-mono text-white/20 uppercase tracking-[0.2em]">
          <span>© 2026 ESHULITV LTD</span>
          <span className="w-1 h-1 bg-white/10 rounded-full" />
          <span>ALL RIGHTS RESERVED</span>
        </div>
        <div className="flex items-center gap-6">
          <Cpu className="w-4 h-4 text-white/10" />
          <Activity className="w-4 h-4 text-white/10" />
          <div className="px-3 py-1 bg-white/5 rounded text-[10px] font-mono text-white/40">
            ENCRYPTED SESSION
          </div>
        </div>
      </footer>
    </div>
    )
  );
}
