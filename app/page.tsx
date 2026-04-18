'use client';

import React, { useState, useEffect, Component, ErrorInfo, ReactNode, useRef } from 'react';
import { flushSync } from 'react-dom';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Github, 
  Twitter, 
  Linkedin, 
  ExternalLink,
  Moon,
  Sun,
  MapPin,
  AlertCircle,
  Settings,
  X,
  Plus,
  Trash2,
  Save,
  LogOut,
  Mail,
  Lock,
  ChevronRight,
  Eye,
  EyeOff,
  Instagram,
  Facebook,
  Youtube,
  Globe,
  Phone,
  MessageCircle,
  Music,
  Video
} from 'lucide-react';

// Firebase Imports
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  doc, 
  onSnapshot, 
  setDoc, 
  collection, 
  query, 
  orderBy, 
  addDoc, 
  deleteDoc,
  updateDoc,
  Timestamp
} from 'firebase/firestore';
import { auth, db } from '../firebase';

// --- SECURITY & PERFORMANCE OPTIMIZATIONS ---
// ... (existing comments)
// 5. Admin Panel is hidden and protected via Firebase Auth & Firestore Rules.
// --------------------------------------------

// Operation Types for Error Handling
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ... ErrorBoundary stays the same

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-6">
          <div className="text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
            <h2 className="text-xl font-bold">Something went wrong.</h2>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl font-medium"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const DEFAULT_PROFILE = {
  name: 'John Doe',
  bio: 'Digital Creator & Software Engineer.',
  location: 'Jakarta, ID',
  avatarUrl: 'https://picsum.photos/seed/bio/200/200'
};

const ICON_MAP: Record<string, ReactNode> = {
  Github: <Github className="w-5 h-5" />,
  Twitter: <Twitter className="w-5 h-5" />,
  Linkedin: <Linkedin className="w-5 h-5" />,
  Instagram: <Instagram className="w-5 h-5" />,
  Facebook: <Facebook className="w-5 h-5" />,
  Youtube: <Youtube className="w-5 h-5" />,
  Website: <Globe className="w-5 h-5" />,
  Mail: <Mail className="w-5 h-5" />,
  Phone: <Phone className="w-5 h-5" />,
  WhatsApp: <MessageCircle className="w-5 h-5" />,
  Music: <Music className="w-5 h-5" />,
  Video: <Video className="w-5 h-5" />,
  ExternalLink: <ExternalLink className="w-5 h-5" />,
};

export default function BioLinkPage() {
  return (
    <ErrorBoundary>
      <BioLinkContent />
    </ErrorBoundary>
  );
}

function BioLinkContent() {
  const [isDark, setIsDark] = useState(false);
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [links, setLinks] = useState<any[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [copyrightClicks, setCopyrightClicks] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Firestore Sync
  useEffect(() => {
    const unsubProfile = onSnapshot(doc(db, 'config', 'profile'), (snapshot) => {
      if (snapshot.exists()) {
        setProfile(snapshot.data() as any);
      }
    }, (err: any) => {
      // Ignore initial permission errors for non-admins
      if (err.code !== 'permission-denied') {
        handleFirestoreError(err, OperationType.GET, 'config/profile');
      }
    });

    const qLinks = query(collection(db, 'links'), orderBy('order', 'asc'));
    const unsubLinks = onSnapshot(qLinks, (snapshot) => {
      const linksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLinks(linksData);
      setIsLoading(false);
    }, (err: any) => {
      // Ignore initial permission errors for non-admins
      if (err.code !== 'permission-denied') {
        handleFirestoreError(err, OperationType.LIST, 'links');
      } else {
        setIsLoading(false); // Stop loading even if permission denied
      }
    });

    const unsubAuth = onAuthStateChanged(auth, (u) => setUser(u));

    return () => {
      unsubProfile();
      unsubLinks();
      unsubAuth();
    };
  }, []);

  // Theme Sync
  useEffect(() => {
    // We only want to read the initial system/html state once
    const isInitiallyDark = document.documentElement.classList.contains('dark');
    if (isInitiallyDark) {
      setIsDark(true); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, []);

  const handleAdminAccess = () => {
    setCopyrightClicks(prev => {
      if (prev + 1 >= 5) {
        setIsAdminPanelOpen(true);
        return 0;
      }
      return prev + 1;
    });
  };

  const login = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
    }
  };

  // ... (toggleTheme logic stays the same)

  const toggleTheme = (e: React.MouseEvent) => {
    const x = e.clientX;
    const y = e.clientY;
    const endRadius = Math.hypot(
      Math.max(x, innerWidth - x),
      Math.max(y, innerHeight - y)
    );

    const nextThemeIsDark = !isDark;

    const updateDOM = () => {
      flushSync(() => {
        setIsDark(nextThemeIsDark);
      });
      if (nextThemeIsDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    // Fallback for browsers that don't support View Transitions API
    if (!('startViewTransition' in document)) {
      updateDOM();
      return;
    }

    // @ts-ignore - startViewTransition is not fully typed in all TS versions yet
    const transition = document.startViewTransition(updateDOM);

    transition.ready.then(() => {
      const clipPath = [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${endRadius}px at ${x}px ${y}px)`
      ];

      document.documentElement.animate(
        {
          clipPath: nextThemeIsDark ? clipPath : [...clipPath].reverse(),
        },
        {
          duration: 400,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          pseudoElement: nextThemeIsDark
            ? '::view-transition-new(root)'
            : '::view-transition-old(root)',
        }
      );
    });
  };

  return (
    <main className="relative min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-50 flex flex-col items-center justify-center px-5 py-16 overflow-x-hidden">
      
      {/* Simple Dot Pattern Background */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(#d1d5db_1px,transparent_1px)] dark:bg-[radial-gradient(#374151_1px,transparent_1px)] [background-size:24px_24px]" aria-hidden="true" />

      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="fixed top-6 right-6 z-50 p-3 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:scale-105 transition-transform outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDark ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
      </button>

      <motion.div 
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } }
        }}
        className="relative z-10 flex flex-col items-center w-full max-w-[420px] bg-white dark:bg-gray-900/80 backdrop-blur-sm p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-8"
      >
        {/* Header Section */}
        <section className="flex flex-col items-center text-center space-y-4">
          <motion.div variants={{ hidden: { opacity: 0, scale: 0.8 }, visible: { opacity: 1, scale: 1 } }} className="relative w-24 h-24">
            <Image
              src={profile.avatarUrl || DEFAULT_PROFILE.avatarUrl}
              alt={`${profile.name}'s profile picture`}
              fill
              priority
              sizes="96px"
              className="rounded-full object-cover border-4 border-gray-50 dark:border-gray-800 shadow-sm"
              referrerPolicy="no-referrer"
            />
          </motion.div>

          <div className="space-y-3 flex flex-col items-center">
            <motion.h1 variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="text-2xl font-bold tracking-tight">
              {profile.name}
            </motion.h1>
            <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-md">
              <MapPin className="w-3 h-3" />
              <span>{profile.location}</span>
            </motion.div>
            <motion.p variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="text-gray-600 dark:text-gray-400 text-sm max-w-sm leading-relaxed whitespace-pre-wrap">
              {profile.bio}
            </motion.p>
          </div>
        </section>

        {/* Subtle Divider */}
        <div className="w-full h-px bg-gray-100 dark:bg-gray-800" aria-hidden="true" />

        {/* Links Section */}
        <section className="w-full space-y-4">
          <nav className="flex flex-col w-full gap-3" aria-label="Social and contact links">
            {isLoading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="w-full h-[58px] bg-gray-100 dark:bg-gray-800 animate-pulse rounded-xl" />
              ))
            ) : (
              links.map((link) => (
                <motion.a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center justify-between w-full p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl transition-all duration-200 group outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 hover:border-gray-300 dark:hover:border-gray-600"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" aria-hidden="true">
                      {ICON_MAP[link.icon] || <ExternalLink className="w-5 h-5" />}
                    </span>
                    <span className="text-sm font-medium">{link.title}</span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 transition-colors" aria-hidden="true" />
                </motion.a>
              ))
            )}
          </nav>
        </section>
      </motion.div>

      {/* Admin Panel Overlay */}
      <AnimatePresence>
        {isAdminPanelOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-white/20 dark:bg-black/40 backdrop-blur-xl p-4 sm:p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Admin Panel
                  </h2>
                  <p className="text-xs text-gray-400">Modify your bio page</p>
                </div>
                <button onClick={() => setIsAdminPanelOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {!user ? (
                  <div className="py-12 flex flex-col items-center space-y-6 text-center">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center">
                      <Lock className="w-8 h-8 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold">Admin Access Required</h3>
                      <p className="text-sm text-gray-500 max-w-[240px] mt-1">Please sign in with your authorized Google account.</p>
                    </div>
                    <button onClick={login} className="px-6 py-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-2xl font-semibold flex items-center gap-3 hover:scale-[1.02] transition-transform active:scale-95 shadow-lg shadow-gray-200 dark:shadow-none">
                      <svg className="w-5 h-5" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></svg>
                      Sign In with Google
                    </button>
                    <p className="text-[10px] text-gray-400">Authorized: aghna1011@gmail.com</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 px-1">Profile Info</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium ml-1">Name</label>
                          <input 
                            value={profile.name}
                            onChange={(e) => setProfile({...profile, name: e.target.value})}
                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700 outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium ml-1">Location</label>
                          <input 
                            value={profile.location}
                            onChange={(e) => setProfile({...profile, location: e.target.value})}
                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700 outline-none transition-all"
                          />
                        </div>
                        <div className="sm:col-span-2 space-y-1.5">
                          <label className="text-xs font-medium ml-1">Bio</label>
                          <textarea 
                            value={profile.bio}
                            onChange={(e) => setProfile({...profile, bio: e.target.value})}
                            rows={2}
                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700 outline-none transition-all resize-none"
                          />
                        </div>
                        <div className="sm:col-span-2 space-y-1.5">
                          <label className="text-xs font-medium ml-1">Avatar URL</label>
                          <input 
                            value={profile.avatarUrl}
                            onChange={(e) => setProfile({...profile, avatarUrl: e.target.value})}
                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700 outline-none transition-all"
                          />
                        </div>
                      </div>
                      <button 
                        onClick={() => setDoc(doc(db, 'config', 'profile'), profile)}
                        className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all"
                      >
                        <Save className="w-4 h-4" /> Save Profile
                      </button>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between px-1">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Links</h3>
                        <button 
                          onClick={() => addDoc(collection(db, 'links'), { title: 'New Link', url: 'https://', icon: 'ExternalLink', order: links.length })}
                          className="text-xs font-bold text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add New
                        </button>
                      </div>

                      <div className="space-y-3">
                        {links.map((link) => (
                          <div key={link.id} className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-4">
                            <div className="flex flex-col gap-2">
                              <div className="flex gap-3 items-center">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider w-24 shrink-0 px-1">Icon</label>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex-1 px-1">Display Text</label>
                              </div>
                              <div className="flex gap-3">
                                <select 
                                  value={link.icon}
                                  onChange={(e) => updateDoc(doc(db, 'links', link.id), { icon: e.target.value })}
                                  className="w-24 shrink-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-2 text-sm focus:ring-2 focus:ring-gray-100 outline-none"
                                >
                                  {Object.keys(ICON_MAP).map(k => <option key={k} value={k}>{k}</option>)}
                                </select>
                                <input 
                                  value={link.title}
                                  placeholder="e.g., My Portfolio"
                                  onChange={(e) => updateDoc(doc(db, 'links', link.id), { title: e.target.value })}
                                  className="flex-1 min-w-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-gray-100 outline-none"
                                />
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Destination URL</label>
                              <div className="flex gap-3">
                                <input 
                                  value={link.url}
                                  placeholder="https://..."
                                  onChange={(e) => updateDoc(doc(db, 'links', link.id), { url: e.target.value })}
                                  className="flex-1 min-w-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-gray-100 outline-none"
                                />
                                <button 
                                  onClick={() => deleteDoc(doc(db, 'links', link.id))}
                                  className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                      <button onClick={() => signOut(auth)} className="w-full py-3 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 hover:text-rose-500 transition-colors">
                        <LogOut className="w-4 h-4" /> Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="relative z-10 mt-8 flex flex-col items-center space-y-1">
        <button 
          onClick={handleAdminAccess}
          className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-widest outline-none active:opacity-50 transition-opacity"
        >
          © {new Date().getFullYear()} {profile.name}
        </button>
        <p className="text-[9px] text-gray-300 dark:text-gray-600 font-medium">
          Last updated: April 2026
        </p>
      </footer>
    </main>
  );
}

