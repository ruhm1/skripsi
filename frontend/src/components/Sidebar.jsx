import { Activity, ShieldCheck, HeartPulse, LayoutDashboard, Settings, History } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Sidebar() {
  return (
    <aside className="w-72 bg-medical-blue-900 border-r border-medical-blue-700/50 flex flex-col shadow-2xl z-20">
      {/* Branding Section */}
      <div className="p-6 flex flex-col items-center border-b border-medical-blue-700/50">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-neon/20 to-medical-blue-800 border border-cyan-neon/30 flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
          <HeartPulse className="w-10 h-10 text-cyan-neon" />
        </div>
        <h1 className="text-xl font-bold tracking-wide glow-text mb-1">RSU AULIA</h1>
        <div className="flex items-center space-x-2 text-xs text-cyan-neon/80 font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Tipe C - Akreditasi PARIPURNA</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-4 space-y-2">
        <a href="#" className="flex items-center space-x-3 px-4 py-3 rounded-lg bg-cyan-neon/10 text-cyan-neon border border-cyan-neon/20 transition-all">
          <Activity className="w-5 h-5" />
          <span className="font-medium">Deteksi Dini (CDSS)</span>
        </a>
        <a href="#" className="flex items-center space-x-3 px-4 py-3 rounded-lg text-medical-blue-300 hover:bg-medical-blue-800/50 hover:text-slate-100 transition-all">
          <LayoutDashboard className="w-5 h-5" />
          <span className="font-medium">Dashboard Metrik</span>
        </a>
        <a href="#" className="flex items-center space-x-3 px-4 py-3 rounded-lg text-medical-blue-300 hover:bg-medical-blue-800/50 hover:text-slate-100 transition-all">
          <History className="w-5 h-5" />
          <span className="font-medium">Riwayat Pasien</span>
        </a>
        <a href="#" className="flex items-center space-x-3 px-4 py-3 rounded-lg text-medical-blue-300 hover:bg-medical-blue-800/50 hover:text-slate-100 transition-all">
          <Settings className="w-5 h-5" />
          <span className="font-medium">Pengaturan Model</span>
        </a>
      </nav>

      {/* Performance Widget */}
      <div className="p-4 mx-4 mb-6 rounded-xl glass-panel relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-neon/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        
        <h3 className="text-xs font-semibold text-medical-blue-300 uppercase tracking-wider mb-4 flex items-center">
          <Activity className="w-4 h-4 mr-2 text-cyan-neon" />
          Performa Model
        </h3>
        
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-200">Akurasi</span>
              <span className="text-cyan-neon font-bold">63.87%</span>
            </div>
            <div className="w-full bg-medical-blue-900/50 rounded-full h-1.5 border border-medical-blue-700">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '63.87%' }}
                transition={{ duration: 1.5, delay: 0.5 }}
                className="bg-cyan-neon h-1.5 rounded-full shadow-[0_0_8px_rgba(0,240,255,0.8)]"
              ></motion.div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-200">Presisi</span>
              <span className="text-cyan-neon/80 font-bold">24.17%</span>
            </div>
            <div className="w-full bg-medical-blue-900/50 rounded-full h-1.5 border border-medical-blue-700">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '24.17%' }}
                transition={{ duration: 1.5, delay: 0.7 }}
                className="bg-cyan-neon/80 h-1.5 rounded-full"
              ></motion.div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-200">Recall</span>
              <span className="text-cyan-neon/80 font-bold">86.79%</span>
            </div>
            <div className="w-full bg-medical-blue-900/50 rounded-full h-1.5 border border-medical-blue-700">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '86.79%' }}
                transition={{ duration: 1.5, delay: 0.9 }}
                className="bg-cyan-neon/80 h-1.5 rounded-full"
              ></motion.div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
