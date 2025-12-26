
import React, { useState } from 'react';
import { User } from '../types';
import { loginUser, registerUser } from '../services/storageService';
import { FilmIcon, SparklesIcon, LockIcon, MailIcon, UserIcon, ArrowRightIcon } from 'lucide-react';

interface Props {
  onLogin: (user: User) => void;
}

const AuthPage: React.FC<Props> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (isLogin) {
      const user = loginUser(email, password);
      user ? onLogin(user) : setError('Invalid credentials.');
    } else {
      if (!name || !email || !password) { setError('All fields required.'); return; }
      registerUser({ email, password, name }) ? onLogin({ email, name }) : setError('User exists.');
    }
  };

  return (
    <div className="w-full max-w-md animate-slide-up relative z-10">
      <div className="glass-panel p-8 rounded-3xl shadow-2xl relative overflow-hidden">
        {/* Decorative Glow */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
        
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-lg shadow-indigo-500/30 mb-6">
            <SparklesIcon size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-slate-400">Sign in to your creative studio</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div className="relative group">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={20} />
              <input type="text" placeholder="Director Name" value={name} onChange={e => setName(e.target.value)} 
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3.5 pl-12 px-4 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all placeholder-slate-600"
              />
            </div>
          )}
          
          <div className="relative group">
            <MailIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={20} />
            <input type="text" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} 
              className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3.5 pl-12 px-4 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all placeholder-slate-600"
            />
          </div>

          <div className="relative group">
            <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={20} />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} 
              className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3.5 pl-12 px-4 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all placeholder-slate-600"
            />
          </div>

          {error && <div className="text-red-400 text-sm text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20">{error}</div>}

          <button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-500/25 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 group">
            {isLogin ? 'Enter Studio' : 'Create Account'}
            <ArrowRightIcon size={20} className="group-hover:translate-x-1 transition-transform"/>
          </button>
        </form>

        <div className="mt-8 text-center pt-6 border-t border-slate-800">
          <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-slate-400 hover:text-white text-sm transition-colors">
            {isLogin ? "New here? Create an account" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
      <div className="text-center mt-6 text-slate-600 text-xs">
         Admin: admin / admin
      </div>
    </div>
  );
};

export default AuthPage;
