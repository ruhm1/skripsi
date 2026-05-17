import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Hero from './components/Hero';
import DiagnosticForm from './components/DiagnosticForm';
import AnalysisDashboard from './components/AnalysisDashboard';

function App() {
  const [predictionState, setPredictionState] = useState('idle'); // 'idle', 'loading', 'result'
  const [predictionResult, setPredictionResult] = useState(null);

  const handleDiagnose = (formData) => {
    setPredictionState('loading');
    
    setTimeout(() => {
      // Mock Decision Tree Logic based on UI requirements
      // High Risk if: Usia > 55 AND Kolesterol > 240
      // OR Tekanan Darah > 140 AND Kolesterol > 200
      // OR Gula Darah Puasa > 120 AND Usia > 50
      const isHighRisk = 
        (formData.age > 55 && formData.chol > 240) ||
        (formData.restBP > 140 && formData.chol > 200) ||
        (formData.age > 50 && formData.fastingBloodSugar === 'true');

      setPredictionResult({
        isHighRisk,
        patientData: formData
      });
      setPredictionState('result');
    }, 2500); // 2.5 seconds loading state
  };

  const handleReset = () => {
    setPredictionState('idle');
    setPredictionResult(null);
  };

  return (
    <div className="flex min-h-screen bg-medical-blue font-sans text-slate-100 selection:bg-cyan-neon/30">
      <Sidebar />
      
      <main className="flex-1 relative overflow-y-auto">
        {/* Glow effect backgrounds */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-cyan-neon/10 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-medical-blue-400/10 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="relative z-10 max-w-5xl mx-auto px-8 py-10 min-h-screen flex flex-col">
          {predictionState === 'idle' && (
            <div className="flex-1 flex flex-col animate-in fade-in duration-500">
              <Hero />
              <div className="mt-12 mb-8">
                <DiagnosticForm onSubmit={handleDiagnose} />
              </div>
            </div>
          )}

          {predictionState === 'loading' && (
            <div className="flex-1 flex flex-col items-center justify-center space-y-8 animate-in zoom-in-95 duration-300">
              <div className="relative w-40 h-40">
                <div className="absolute inset-0 border-t-2 border-b-2 border-cyan-neon rounded-full animate-spin shadow-[0_0_15px_rgba(0,240,255,0.5)]"></div>
                <div className="absolute inset-3 border-r-2 border-l-2 border-medical-blue-300 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
                <div className="absolute inset-0 flex items-center justify-center text-cyan-neon">
                  <svg className="w-16 h-16 animate-heartbeat drop-shadow-[0_0_10px_rgba(0,240,255,0.8)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                  </svg>
                </div>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold tracking-wider glow-text">Memproses Model Decision Tree...</h3>
                <p className="text-medical-blue-300">Menganalisis parameter klinis pasien</p>
              </div>
            </div>
          )}

          {predictionState === 'result' && (
            <div className="flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <AnalysisDashboard result={predictionResult} onReset={handleReset} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
