import React from 'react';
import { Stethoscope } from 'lucide-react';

export default function Hero() {
  return (
    <div className="relative overflow-hidden rounded-2xl glass-panel p-8 md:p-10 border-l-4 border-l-cyan-neon">
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="max-w-2xl">
          <div className="inline-flex items-center space-x-2 bg-cyan-neon/10 border border-cyan-neon/30 text-cyan-neon px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-4">
            <Stethoscope className="w-4 h-4" />
            <span>Sistem Pendukung Keputusan Klinis</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Deteksi Dini Penyakit Jantung
          </h2>
          <p className="text-medical-blue-200 text-lg leading-relaxed">
            Selamat datang, Tenaga Medis RSU Aulia. Sistem ini menggunakan algoritma <span className="font-semibold text-cyan-neon">Decision Tree</span> untuk menganalisis parameter klinis pasien dan memberikan rekomendasi tingkat risiko penyakit jantung secara real-time.
          </p>
        </div>
      </div>
      
      {/* Decorative ECG Background */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none">
        <svg className="w-[400px] h-[200px]" viewBox="0 0 400 200" fill="none" stroke="currentColor" strokeWidth="2">
          <path 
            className="animate-pulse"
            d="M 0 100 L 50 100 L 70 50 L 100 150 L 120 100 L 400 100" 
            stroke="#00F0FF" 
            strokeWidth="4" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
        </svg>
      </div>
    </div>
  );
}
