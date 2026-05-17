import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, GitCommit, ArrowRight, RotateCcw, User, FileText } from 'lucide-react';

export default function AnalysisDashboard({ result, onReset }) {
  const { isHighRisk, patientData } = result;

  // Generate logic text based on the mock condition
  const getLogicPath = () => {
    if (patientData.age > 55 && patientData.chol > 240) {
      return [
        `Usia pasien > 55 (${patientData.age} Tahun)`,
        `Kadar Kolesterol > 240 mg/dl (${patientData.chol} mg/dl)`,
        'Klasifikasi Risiko Tinggi'
      ];
    }
    if (patientData.restBP > 140 && patientData.chol > 200) {
      return [
        `Tekanan Darah Istirahat > 140 mmHg (${patientData.restBP} mmHg)`,
        `Kadar Kolesterol > 200 mg/dl (${patientData.chol} mg/dl)`,
        'Klasifikasi Risiko Tinggi'
      ];
    }
    if (patientData.age > 50 && patientData.fastingBloodSugar === 'true') {
      return [
        `Usia pasien > 50 (${patientData.age} Tahun)`,
        `Gula Darah Puasa > 120 mg/dl (Ya)`,
        'Klasifikasi Risiko Tinggi'
      ];
    }
    return [
      `Parameter klinis (Usia: ${patientData.age}, Kolesterol: ${patientData.chol}, TD: ${patientData.restBP}) berada di bawah ambang batas risiko tinggi.`,
      'Klasifikasi Risiko Rendah'
    ];
  };

  const logicPath = getLogicPath();

  return (
    <div className="space-y-6">
      {/* Header Result */}
      <div className={`p-8 rounded-2xl border ${
        isHighRisk 
          ? 'bg-red-900/20 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)]' 
          : 'bg-green-900/20 border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.2)]'
      } relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[80px] rounded-full pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center shrink-0 ${
            isHighRisk ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'
          }`}>
            {isHighRisk ? <AlertTriangle className="w-10 h-10" /> : <CheckCircle className="w-10 h-10" />}
          </div>
          
          <div className="text-center md:text-left flex-1">
            <h2 className={`text-3xl font-bold mb-2 ${isHighRisk ? 'text-red-400' : 'text-green-400'}`}>
              {isHighRisk ? 'Risiko Tinggi Terdeteksi' : 'Risiko Rendah / Normal'}
            </h2>
            <p className="text-slate-300 text-lg">
              Berdasarkan model Decision Tree, pasien ini memiliki {isHighRisk ? 'indikasi kuat' : 'indikasi minim'} terhadap penyakit jantung.
            </p>
          </div>

          <button 
            onClick={onReset}
            className="flex items-center px-4 py-2 rounded-lg bg-medical-blue-800 text-slate-200 hover:bg-medical-blue-700 transition-all border border-medical-blue-600"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Analisis Baru
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient Summary */}
        <div className="lg:col-span-1 glass-panel p-6 space-y-4">
          <h3 className="font-semibold text-cyan-neon flex items-center mb-4">
            <User className="w-5 h-5 mr-2" />
            Ringkasan Pasien
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between border-b border-medical-blue-700/50 pb-2">
              <span className="text-slate-400 text-sm">No. RM</span>
              <span className="font-medium text-slate-200">{patientData.rekamMedis || '-'}</span>
            </div>
            <div className="flex justify-between border-b border-medical-blue-700/50 pb-2">
              <span className="text-slate-400 text-sm">Usia / JK</span>
              <span className="font-medium text-slate-200">{patientData.age} thn / {patientData.gender}</span>
            </div>
            <div className="flex justify-between border-b border-medical-blue-700/50 pb-2">
              <span className="text-slate-400 text-sm">Kolesterol</span>
              <span className="font-medium text-slate-200">{patientData.chol} mg/dl</span>
            </div>
            <div className="flex justify-between pb-2">
              <span className="text-slate-400 text-sm">Tekanan Darah</span>
              <span className="font-medium text-slate-200">{patientData.restBP} mmHg</span>
            </div>
          </div>
        </div>

        {/* Decision Logic Visualization */}
        <div className="lg:col-span-2 glass-panel p-6">
          <h3 className="font-semibold text-cyan-neon flex items-center mb-6">
            <GitCommit className="w-5 h-5 mr-2" />
            Logika Pohon Keputusan (If-Then Rules)
          </h3>
          
          <div className="relative">
            {/* Logic Path Tree */}
            <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-medical-blue-700 z-0"></div>
            
            <div className="space-y-6 relative z-10">
              {logicPath.map((step, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.3 }}
                  className="flex items-start"
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border-4 border-medical-blue-900 ${
                    index === logicPath.length - 1 
                      ? (isHighRisk ? 'bg-red-500 text-white' : 'bg-green-500 text-white') 
                      : 'bg-medical-blue-700 text-cyan-neon'
                  }`}>
                    {index === logicPath.length - 1 ? <FileText className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
                  </div>
                  
                  <div className={`ml-4 p-4 rounded-xl border ${
                    index === logicPath.length - 1 
                      ? (isHighRisk ? 'bg-red-900/30 border-red-500/30 text-red-200' : 'bg-green-900/30 border-green-500/30 text-green-200')
                      : 'bg-medical-blue-800/50 border-medical-blue-600/50 text-slate-200'
                  } w-full`}>
                    <p className={`font-medium ${index === logicPath.length - 1 ? 'text-lg' : ''}`}>
                      {index === logicPath.length - 1 ? 'KESIMPULAN: ' : 'JIKA '} {step}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
