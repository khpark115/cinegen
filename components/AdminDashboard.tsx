import React, { useState, useEffect } from 'react';
import { User, Project } from '../types';
import { getAllUsers, getAllProjects, updateAdminPassword } from '../services/storageService';
import { UsersIcon, FilmIcon, ShieldIcon, SearchIcon, KeyIcon, LockIcon, SaveIcon, DollarSignIcon } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'USERS' | 'PROJECTS' | 'SETTINGS'>('USERS');
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  
  // Settings State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setUsers(getAllUsers());
    
    const fetchProjects = async () => {
        try {
            const data = await getAllProjects();
            setProjects(data);
        } catch (error) {
            console.error("Failed to fetch projects", error);
        }
    };
    fetchProjects();
  }, []);

  const handlePasswordUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMsg('Passwords do not match');
      return;
    }
    if (newPassword.length < 4) {
      setMsg('Password too short');
      return;
    }
    updateAdminPassword(newPassword);
    setMsg('Admin password updated successfully!');
    setNewPassword('');
    setConfirmPassword('');
  };

  const calculateCost = (project: Project): string => {
      const scenes = project.script.scenes || [];
      const imageCount = scenes.filter(s => s.generatedImageUrl).length;
      const videoCount = scenes.filter(s => s.generatedVideoUrl).length;
      
      // Estimated API Costs (Example Rates)
      // Flash Image: ~$0.0004
      // Veo Video: ~$0.04 (approximate/hypothetical for preview)
      const cost = (imageCount * 0.0004) + (videoCount * 0.04);
      return cost < 0.01 && cost > 0 ? "< $0.01" : `$${cost.toFixed(2)}`;
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center gap-4 mb-8">
        <div className="bg-red-500/20 p-3 rounded-xl text-red-500">
          <ShieldIcon size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Total Manager</h1>
          <p className="text-slate-400">System Administration & Statistics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <div className="text-slate-400 mb-2">Total Users</div>
          <div className="text-3xl font-bold text-white">{users.length}</div>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <div className="text-slate-400 mb-2">Total Projects</div>
          <div className="text-3xl font-bold text-indigo-400">{projects.length}</div>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <div className="text-slate-400 mb-2">System Status</div>
          <div className="text-3xl font-bold text-emerald-400">Active</div>
        </div>
      </div>

      <div className="flex gap-4 mb-6 border-b border-slate-700">
        <button
          onClick={() => setActiveTab('USERS')}
          className={`pb-3 px-4 font-medium transition-colors ${activeTab === 'USERS' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-400 hover:text-white'}`}
        >
          User Management
        </button>
        <button
          onClick={() => setActiveTab('PROJECTS')}
          className={`pb-3 px-4 font-medium transition-colors ${activeTab === 'PROJECTS' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-400 hover:text-white'}`}
        >
          Project Management
        </button>
        <button
          onClick={() => setActiveTab('SETTINGS')}
          className={`pb-3 px-4 font-medium transition-colors ${activeTab === 'SETTINGS' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-400 hover:text-white'}`}
        >
          Admin Settings
        </button>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden min-h-[400px]">
        
        {activeTab === 'USERS' && (
          <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="bg-slate-900/50 text-slate-400 text-sm border-b border-slate-700">
                   <th className="p-4 font-medium">Name</th>
                   <th className="p-4 font-medium">Email</th>
                   <th className="p-4 font-medium">Projects</th>
                   <th className="p-4 font-medium">Joined</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-700">
                 {users.map((u, i) => (
                   <tr key={i} className="hover:bg-slate-700/30 transition-colors">
                     <td className="p-4 text-white font-medium">{u.name}</td>
                     <td className="p-4 text-slate-300">{u.email}</td>
                     <td className="p-4 text-slate-400">
                       {projects.filter(p => p.userId === u.email).length}
                     </td>
                     <td className="p-4 text-slate-500 text-sm">Recently</td>
                   </tr>
                 ))}
                 {users.length === 0 && (
                   <tr>
                     <td colSpan={4} className="p-8 text-center text-slate-500">No users found.</td>
                   </tr>
                 )}
               </tbody>
             </table>
          </div>
        )}

        {activeTab === 'PROJECTS' && (
          <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="bg-slate-900/50 text-slate-400 text-sm border-b border-slate-700">
                   <th className="p-4 font-medium">Project Title</th>
                   <th className="p-4 font-medium">Owner (Email)</th>
                   <th className="p-4 font-medium">Style</th>
                   <th className="p-4 font-medium">Est. Cost</th>
                   <th className="p-4 font-medium">Created At</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-700">
                 {projects.map((p, i) => (
                   <tr key={i} className="hover:bg-slate-700/30 transition-colors">
                     <td className="p-4 text-white font-medium flex items-center gap-2">
                       <FilmIcon size={16} className="text-indigo-400"/>
                       {p.title}
                     </td>
                     <td className="p-4 text-slate-300">{p.userId}</td>
                     <td className="p-4 text-slate-400">{p.script.selectedVisualStyle}</td>
                     <td className="p-4 text-emerald-400 font-mono">{calculateCost(p)}</td>
                     <td className="p-4 text-slate-500 text-sm">{new Date(p.createdAt).toLocaleDateString()}</td>
                   </tr>
                 ))}
                 {projects.length === 0 && (
                   <tr>
                     <td colSpan={5} className="p-8 text-center text-slate-500">No projects found.</td>
                   </tr>
                 )}
               </tbody>
             </table>
          </div>
        )}

        {activeTab === 'SETTINGS' && (
          <div className="p-8 max-w-lg">
             <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
               <KeyIcon className="text-indigo-400" /> Change Admin Password
             </h3>
             <form onSubmit={handlePasswordUpdate} className="space-y-4">
               <div>
                 <label className="block text-sm text-slate-400 mb-1">New Password</label>
                 <div className="relative">
                   <LockIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                   <input 
                     type="password"
                     value={newPassword}
                     onChange={(e) => setNewPassword(e.target.value)}
                     className="w-full bg-slate-900 border border-slate-600 rounded-lg py-2 pl-9 px-4 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                   />
                 </div>
               </div>
               <div>
                 <label className="block text-sm text-slate-400 mb-1">Confirm Password</label>
                 <div className="relative">
                   <LockIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                   <input 
                     type="password"
                     value={confirmPassword}
                     onChange={(e) => setConfirmPassword(e.target.value)}
                     className="w-full bg-slate-900 border border-slate-600 rounded-lg py-2 pl-9 px-4 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                   />
                 </div>
               </div>
               
               {msg && (
                 <div className={`text-sm p-2 rounded ${msg.includes('success') ? 'text-green-400 bg-green-900/20' : 'text-red-400 bg-red-900/20'}`}>
                   {msg}
                 </div>
               )}

               <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2">
                 <SaveIcon size={18} /> Update Password
               </button>
             </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
