import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, CheckCircle2, User, Activity, FileText } from 'lucide-react';

const STEPS = [
  { id: 1, title: 'Data Pasien & Tanda Vital', icon: User },
  { id: 2, title: 'Hasil Lab & Klinis', icon: Activity },
  { id: 3, title: 'Hasil EKG & Fluoroskopi', icon: FileText }
];

export default function DiagnosticForm({ onSubmit }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Metadata
    rekamMedis: '',
    unitPengirim: 'IGD',
    // Step 1
    age: '',
    gender: 'L',
    restBP: '',
    maxHR: '',
    // Step 2
    chol: '',
    fastingBloodSugar: 'false',
    chestPainType: 'ASY',
    exerciseAngina: 'N',
    // Step 3
    restECG: 'Normal',
    oldpeak: '',
    stSlope: 'Flat',
    majorVessels: '0',
    thalassemia: 'Normal'
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNext = () => {
    if (currentStep < 3) setCurrentStep(prev => prev + 1);
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="glass-panel p-6 md:p-8">
      {/* Stepper Header */}
      <div className="flex items-center justify-between mb-8 relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-medical-blue-700 z-0"></div>
        {STEPS.map((step) => (
          <div key={step.id} className="relative z-10 flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
              currentStep >= step.id 
                ? 'bg-cyan-neon text-medical-blue-900 shadow-[0_0_15px_rgba(0,240,255,0.6)]' 
                : 'bg-medical-blue-800 text-medical-blue-400 border border-medical-blue-600'
            }`}>
              {currentStep > step.id ? <CheckCircle2 className="w-6 h-6" /> : <step.icon className="w-5 h-5" />}
            </div>
            <span className={`text-xs mt-2 font-medium ${currentStep >= step.id ? 'text-cyan-neon' : 'text-medical-blue-400'}`}>
              {step.title}
            </span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {currentStep === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-medical-blue-200">No. Rekam Medis</label>
                  <input required type="text" name="rekamMedis" value={formData.rekamMedis} onChange={handleInputChange} className="glass-input" placeholder="Contoh: RM-2026-001" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-medical-blue-200">Unit Pengirim</label>
                  <select name="unitPengirim" value={formData.unitPengirim} onChange={handleInputChange} className="glass-input">
                    <option value="IGD">IGD</option>
                    <option value="Poliklinik Penyakit Dalam">Poliklinik Penyakit Dalam</option>
                    <option value="Poliklinik Jantung">Poliklinik Jantung</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-medical-blue-200">Usia (Tahun)</label>
                  <input required type="number" min="1" max="120" name="age" value={formData.age} onChange={handleInputChange} className="glass-input" placeholder="Masukkan usia..." />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-medical-blue-200">Jenis Kelamin</label>
                  <select name="gender" value={formData.gender} onChange={handleInputChange} className="glass-input">
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-medical-blue-200">Tekanan Darah Istirahat (mmHg)</label>
                  <input required type="number" min="50" max="300" name="restBP" value={formData.restBP} onChange={handleInputChange} className="glass-input" placeholder="Contoh: 120" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-medical-blue-200">Detak Jantung Maksimum (bpm)</label>
                  <input required type="number" min="40" max="250" name="maxHR" value={formData.maxHR} onChange={handleInputChange} className="glass-input" placeholder="Contoh: 150" />
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-medical-blue-200">Kadar Kolesterol Serum (mg/dl)</label>
                  <input required type="number" min="50" max="1000" name="chol" value={formData.chol} onChange={handleInputChange} className="glass-input" placeholder="Contoh: 200" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-medical-blue-200">Gula Darah Puasa &gt; 120 mg/dl</label>
                  <select name="fastingBloodSugar" value={formData.fastingBloodSugar} onChange={handleInputChange} className="glass-input">
                    <option value="false">Tidak (≤ 120 mg/dl)</option>
                    <option value="true">Ya (&gt; 120 mg/dl)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-medical-blue-200">Tipe Nyeri Dada</label>
                  <select name="chestPainType" value={formData.chestPainType} onChange={handleInputChange} className="glass-input">
                    <option value="ASY">Asimtomatik</option>
                    <option value="ATA">Atipikal Angina</option>
                    <option value="NAP">Non-Anginal Pain</option>
                    <option value="TA">Tipikal Angina</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-medical-blue-200">Angina Akibat Aktivitas</label>
                  <select name="exerciseAngina" value={formData.exerciseAngina} onChange={handleInputChange} className="glass-input">
                    <option value="N">Tidak</option>
                    <option value="Y">Ya</option>
                  </select>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-medical-blue-200">Hasil EKG Istirahat</label>
                  <select name="restECG" value={formData.restECG} onChange={handleInputChange} className="glass-input">
                    <option value="Normal">Normal</option>
                    <option value="ST">Kelainan ST-T</option>
                    <option value="LVH">Hipertrofi Ventrikel Kiri</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-medical-blue-200">Depresi ST (Induksi Olahraga)</label>
                  <input required type="number" step="0.1" min="-10" max="10" name="oldpeak" value={formData.oldpeak} onChange={handleInputChange} className="glass-input" placeholder="Contoh: 1.5" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-medical-blue-200">Kemiringan Segmen ST</label>
                  <select name="stSlope" value={formData.stSlope} onChange={handleInputChange} className="glass-input">
                    <option value="Up">Upsloping</option>
                    <option value="Flat">Flat</option>
                    <option value="Down">Downsloping</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-medical-blue-200">Jumlah Pembuluh Darah Utama (0-3)</label>
                  <select name="majorVessels" value={formData.majorVessels} onChange={handleInputChange} className="glass-input">
                    <option value="0">0</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                  </select>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium text-medical-blue-200">Status Thalassemia</label>
                  <select name="thalassemia" value={formData.thalassemia} onChange={handleInputChange} className="glass-input">
                    <option value="Normal">Normal</option>
                    <option value="FixedDefect">Cacat Tetap (Fixed Defect)</option>
                    <option value="ReversableDefect">Cacat Reversibel (Reversable Defect)</option>
                  </select>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Form Actions */}
        <div className="mt-8 pt-6 border-t border-medical-blue-700/50 flex justify-between">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStep === 1}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all ${
              currentStep === 1 
                ? 'opacity-50 cursor-not-allowed text-medical-blue-400' 
                : 'text-slate-200 hover:bg-medical-blue-800'
            }`}
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Sebelumnya
          </button>
          
          {currentStep < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center px-6 py-2 rounded-lg bg-cyan-neon/10 border border-cyan-neon/50 text-cyan-neon font-medium hover:bg-cyan-neon hover:text-medical-blue-900 transition-all shadow-[0_0_10px_rgba(0,240,255,0.2)]"
            >
              Selanjutnya
              <ChevronRight className="w-5 h-5 ml-1" />
            </button>
          ) : (
            <button
              type="submit"
              className="flex items-center px-6 py-2 rounded-lg bg-cyan-neon text-medical-blue-900 font-bold hover:bg-[#33F3FF] transition-all shadow-[0_0_20px_rgba(0,240,255,0.4)]"
            >
              Analisis Sekarang
              <Activity className="w-5 h-5 ml-2" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
