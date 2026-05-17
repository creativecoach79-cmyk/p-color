import React, { useState, useRef, ChangeEvent } from "react";
import { 
  Camera, 
  Upload, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ChevronRight,
  Palette,
  User,
  Scissors,
  Shirt,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { analyzePersonalColor, AnalysisResult } from "./services/geminiService";

// --- Components ---

const ColorBadge = ({ hex, name, reason }: { hex: string; name: string; reason?: string }) => (
  <div className="flex flex-col items-center gap-2 group relative">
    <div 
      className="w-16 h-16 rounded-xl shadow-sm border-2 border-white/80 transition-transform group-hover:scale-110"
      style={{ backgroundColor: hex }}
    />
    <span className="text-[10px] font-bold text-neutral-400 text-center line-clamp-1 uppercase tracking-wider">{name}</span>
    {reason && (
      <div className="absolute bottom-full mb-2 hidden group-hover:block w-32 p-2 bg-primary/90 backdrop-blur text-white text-[10px] rounded-lg shadow-lg z-10 transition-all">
        {reason}
      </div>
    )}
  </div>
);

const AnalysisSection = ({ title, content, icon: Icon }: { title: string; content: string; icon: any }) => (
  <div className="p-5 glass-dark rounded-[24px]">
    <div className="flex items-center gap-2 mb-3">
      <span className="w-1 h-4 bg-primary rounded-full" />
      <h4 className="text-xs font-bold uppercase tracking-widest text-[#3d5a80]">{title}</h4>
    </div>
    <p className="text-[13px] text-[#666] leading-relaxed">{content}</p>
  </div>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-sm font-bold text-[#3d5a80] mb-4 uppercase tracking-[0.1em] flex items-center gap-2">
    <span className="w-3 h-[2px] bg-primary rounded-full" />
    {children}
  </h3>
);

// --- Main App ---

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError("파일 크기가 너무 큽니다 (최대 10MB).");
        return;
      }
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setError(null);
      setResult(null);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const startAnalysis = async () => {
    if (!preview) return;
    setLoading(true);
    setError(null);

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file!);
      });

      const base64 = await base64Promise;
      const data = await analyzePersonalColor(base64);
      setResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err instanceof Error ? err.message : "분석 중 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  const downloadPDF = async () => {
    if (!reportRef.current || !result) return;
    
    setLoading(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const { jsPDF } = await import("jspdf");
      
      const element = reportRef.current;
      
      // Ensure all images are loaded
      const images = Array.from(element.getElementsByTagName('img')) as HTMLImageElement[];
      await Promise.all(images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }));

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#fdfaf7",
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });
      
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF("p", "mm", "a4");
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const ratio = canvasWidth / canvasHeight;
      const height = pdfWidth / ratio;
      
      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, height);
      pdf.save(`ColorLab_Report_${result.season_type.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error("PDF Export Error:", err);
      setError("PDF 저장이 실패했습니다. 이미지로 다운로드를 시도해 보세요.");
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = async () => {
    if (!reportRef.current || !result) return;
    
    setLoading(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const element = reportRef.current;
      
      const images = Array.from(element.getElementsByTagName('img')) as HTMLImageElement[];
      await Promise.all(images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }));

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#fdfaf7",
      });
      
      const link = document.createElement('a');
      link.download = `ColorLab_Report_${result.season_type.replace(/\s+/g, '_')}.jpg`;
      link.href = canvas.toDataURL("image/jpeg", 0.9);
      link.click();
    } catch (err) {
      console.error("Image Export Error:", err);
      setError("이미지 저장이 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 overflow-x-hidden relative">
      {/* Mesh Background Decor */}
      <div className="fixed top-[-10%] right-[-5%] w-[500px] h-[500px] bg-accent-blue rounded-full blur-[120px] opacity-30 z-0 pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-5%] w-[550px] h-[550px] bg-accent-pink rounded-full blur-[120px] opacity-30 z-0 pointer-events-none" />
      
      {/* Header */}
      <header className="relative z-10 pt-20 pb-12 px-6 flex flex-col items-center border-b border-white/20">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="bg-primary/95 p-4 rounded-[28px] shadow-2xl shadow-primary/30 backdrop-blur-md border border-white/20">
            <Palette className="w-8 h-8 text-white" />
          </div>
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-4xl font-display font-light tracking-tight text-[#1a1a1a] sm:text-5xl uppercase"
        >
          PERSONAL <span className="font-bold">COLOR</span> LAB
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-4 text-[#666] max-w-md mx-auto text-balance text-xs italic tracking-widest opacity-80"
        >
          ※ AI-POWERED PERSONALIZED ANALYSIS TOOL V2.5
        </motion.p>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-6 mt-12">
        <AnimatePresence mode="wait">
          {!result && !loading ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              {/* Dropzone */}
              <div 
                onClick={handleUploadClick}
                className={`
                  relative aspect-square sm:aspect-[21/9] rounded-[40px] glass-dark
                  transition-all cursor-pointer flex flex-col items-center justify-center p-8
                  ${preview ? 'border-primary/40 bg-white/60' : 'hover:border-primary/40 hover:bg-white/80'}
                `}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                
                {preview ? (
                  <img src={preview} alt="Preview" className="absolute inset-0 w-full h-full object-cover rounded-3xl opacity-20" />
                ) : null}

                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                    <Camera className="w-10 h-10 text-primary" />
                  </div>
                  <p className="text-xl font-display font-bold text-[#333]">분석할 사진을 업로드해 주세요</p>
                  <p className="text-xs text-[#999] mt-2 uppercase tracking-widest">Natural lighting is best for accuracy</p>
                  <button className="mt-8 px-8 py-3 bg-primary text-white rounded-full text-sm font-bold flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
                    <Upload className="w-4 h-4" />
                    SELECT IMAGE
                  </button>
                </div>
              </div>

              {preview && (
                <div className="flex justify-center pt-4">
                  <button 
                    onClick={startAnalysis}
                    className="w-full sm:w-80 px-12 py-5 bg-primary text-white rounded-[24px] text-lg font-bold shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                  >
                    <Sparkles className="w-6 h-6" />
                    분석 시작하기
                  </button>
                </div>
              )}
              
              {error && (
                <div className="p-5 glass border-red-200 text-red-600 rounded-[24px] flex items-center gap-4">
                  <AlertCircle className="w-6 h-6 flex-shrink-0" />
                  <span className="text-sm font-medium">{error}</span>
                </div>
              )}
            </motion.div>
          ) : loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="relative w-32 h-32 mb-8">
                <div className="absolute inset-0 border-4 border-white rounded-full" />
                <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin" />
                <div className="absolute inset-4 bg-white/40 rounded-full backdrop-blur-sm shadow-inner flex items-center justify-center">
                  <Palette className="w-8 h-8 text-primary animate-pulse" />
                </div>
              </div>
              <h2 className="text-3xl font-display font-bold text-[#1a1a1a] mb-3">이미지 전문가 분석 중</h2>
              <p className="text-[#666] max-w-xs text-sm uppercase tracking-widest">Calculating skin tone, saturation, and contrast...</p>
            </motion.div>
          ) : result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-12"
            >
              <div ref={reportRef} className="space-y-12 p-10 bg-[#fdfaf7] rounded-[48px] border border-white relative overflow-hidden">
                {/* PDF Decor */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-accent-blue rounded-full blur-[100px] opacity-10 pointer-events-none" />
                
                <div className="grid grid-cols-12 gap-10">
                  {/* Left Side: Summary & Profile */}
                  <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                    <div className="glass rounded-[40px] overflow-hidden flex flex-col h-full min-h-[500px] border-white/80 shadow-md">
                      <div className="h-[65%] relative group overflow-hidden">
                        <img src={preview!} alt="Analyzed" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                        <div className="absolute bottom-6 left-6">
                          <span className="px-3 py-1 bg-white/95 text-[9px] font-bold rounded-full shadow-sm text-primary uppercase tracking-[0.2em] border border-white">Profile Reference</span>
                        </div>
                      </div>
                      <div className="p-10 flex flex-col items-center justify-center text-center flex-1">
                        <div className="text-[10px] uppercase tracking-[0.3em] text-[#999] font-bold mb-3">Diagnostic Result</div>
                        <h2 className="text-4xl font-bold text-[#3d5a80] tracking-tight">{result.season_type}</h2>
                        <p className="text-sm text-[#555] mt-3 font-semibold tracking-wide">{result.sub_type}</p>
                        <div className="mt-8 flex gap-2">
                          <div className="w-10 h-1.5 rounded-full bg-accent-blue/60" />
                          <div className="w-10 h-1.5 rounded-full bg-accent-pink/60" />
                          <div className="w-10 h-1.5 rounded-full bg-primary/20" />
                        </div>
                      </div>
                    </div>

                    <div className="p-8 glass-dark rounded-[32px] border-white/80 shadow-sm">
                      <h3 className="text-xs font-bold mb-5 flex items-center gap-2 text-primary uppercase tracking-[0.2em]">
                        <span className="w-1.5 h-4 bg-primary rounded-full"></span> Expert Summary
                      </h3>
                      <p className="text-[13px] text-[#555] leading-relaxed italic font-medium">
                        "{result.summary}"
                      </p>
                    </div>
                  </div>

                  {/* Right Side: Technical Data & Palette */}
                  <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
                    {/* Summary Card */}
                    <div className="p-10 bg-primary text-white rounded-[40px] shadow-2xl shadow-primary/30 flex flex-col justify-between relative overflow-hidden">
                      <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                      <div className="relative z-10">
                        <div className="text-[10px] opacity-70 uppercase tracking-[0.3em] font-bold mb-3">Lab Technical Report</div>
                        <p className="text-3xl font-display font-medium leading-[1.15] tracking-tight">
                          데이터 사이언스로 분석한 <br/><span className="font-bold underline decoration-white/30 underline-offset-8">당신의 퍼스널 컬러 리포트</span>
                        </p>
                      </div>
                      <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-8 relative z-10">
                        <div className="border-l-2 border-white/20 pl-5">
                          <div className="text-[9px] opacity-60 uppercase tracking-widest font-bold mb-1.5">Base Tone</div>
                          <div className="text-lg font-bold tracking-tight">{result.tone_direction.toUpperCase()}</div>
                        </div>
                        <div className="border-l-2 border-white/20 pl-5">
                          <div className="text-[9px] opacity-60 uppercase tracking-widest font-bold mb-1.5">Confidence</div>
                          <div className="text-lg font-bold tracking-tight">{Math.round(result.confidence * 100)}%</div>
                        </div>
                        <div className="border-l-2 border-white/20 pl-5">
                          <div className="text-[9px] opacity-60 uppercase tracking-widest font-bold mb-1.5">Season</div>
                          <div className="text-lg font-bold tracking-tight">{result.season_type.split(' ')[0]}</div>
                        </div>
                        <div className="border-l-2 border-white/20 pl-5">
                          <div className="text-[9px] opacity-60 uppercase tracking-widest font-bold mb-1.5">Intensity</div>
                          <div className="text-lg font-bold tracking-tight">Level 4.2</div>
                        </div>
                      </div>
                    </div>

                    {/* Palette & Recommendations */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="p-8 glass-dark rounded-[36px] shadow-sm border-white">
                        <h3 className="text-[10px] font-bold mb-8 uppercase tracking-[0.3em] text-primary flex items-center gap-2">
                          Best Palette <span className="text-[#999] opacity-50">/ Top 8</span>
                        </h3>
                        <div className="grid grid-cols-4 gap-4">
                          {result.recommended_colors.slice(0, 8).map((color, idx) => (
                            <div 
                              key={idx} 
                              className="aspect-square rounded-2xl shadow-inner border border-white/60 cursor-crosshair transform transition-transform hover:scale-110" 
                              style={{ backgroundColor: color.hex }}
                              title={`${color.name}: ${color.reason}`}
                            />
                          ))}
                        </div>

                        <h3 className="text-[10px] font-bold mt-12 mb-8 uppercase tracking-[0.3em] text-red-400 flex items-center gap-2">
                          Avoid Palette <span className="text-[#999] opacity-50">/ Warning</span>
                        </h3>
                        <div className="grid grid-cols-5 gap-3">
                          {result.avoid_colors.map((color, idx) => (
                            <div 
                              key={idx} 
                              className="aspect-square rounded-full shadow-inner border border-white/60" 
                              style={{ backgroundColor: color.hex }}
                              title={color.name}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col gap-8">
                        <div className="grid grid-cols-1 gap-5">
                          <AnalysisSection title="Pixel Skin Tone" content={result.analysis.skin_tone} icon={User} />
                          <AnalysisSection title="Harmony Contrast" content={result.analysis.contrast} icon={ChevronRight} />
                        </div>
                        
                        <div className="p-8 glass-dark border-white rounded-[36px] shadow-sm flex-1 flex flex-col">
                          <h4 className="text-[11px] font-bold text-[#333] mb-6 uppercase tracking-[0.2em] flex items-center gap-2">
                            <span className="w-1 h-3 bg-[#333] rounded-full"></span> Recommended Styles
                          </h4>
                          <div className="flex flex-wrap gap-2.5 mb-8">
                            {result.hair_recommendations.slice(0, 2).map((item, i) => (
                              <span key={i} className="px-3.5 py-2 bg-white text-[10px] font-bold rounded-xl border border-[#ececec] text-[#555] shadow-sm tracking-tight">{item}</span>
                            ))}
                            {result.fashion_recommendations.slice(0, 2).map((item, i) => (
                              <span key={i} className="px-3.5 py-2 bg-white text-[10px] font-bold rounded-xl border border-[#ececec] text-[#555] shadow-sm tracking-tight">{item}</span>
                            ))}
                          </div>
                          <div className="mt-auto bg-primary/5 p-5 rounded-2xl border border-primary/10">
                            <p className="text-[12px] text-[#555] leading-relaxed italic opacity-80">
                              "{result.style_tip}"
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="pt-12 flex flex-col sm:flex-row gap-6">
                <button 
                  onClick={reset}
                  className="flex-1 px-10 py-5 glass-dark text-primary rounded-[28px] font-bold flex items-center justify-center gap-3 hover:bg-white/80 transition-all border-white"
                >
                  <RefreshCw className="w-5 h-5" />
                  RETAKE ANALYSIS
                </button>
                <div className="flex-[2] flex flex-col sm:flex-row gap-4">
                  <button 
                    onClick={downloadImage}
                    disabled={loading}
                    className={`
                      flex-1 px-8 py-5 bg-white text-primary rounded-[28px] font-bold 
                      flex items-center justify-center gap-3 shadow-xl border border-primary/10
                      transition-all duration-500 disabled:opacity-70 disabled:cursor-wait
                      ${loading ? 'animate-pulse' : 'hover:scale-[1.02] active:scale-[0.98]'}
                    `}
                  >
                    {loading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Camera className="w-5 h-5" />
                    )}
                    <span className="uppercase tracking-widest text-[10px]">Download Image</span>
                  </button>
                  <button 
                    onClick={downloadPDF}
                    disabled={loading}
                    className={`
                      flex-1 px-8 py-5 bg-primary text-white rounded-[28px] font-bold 
                      flex items-center justify-center gap-3 shadow-2xl shadow-primary/30 
                      transition-all duration-500 disabled:opacity-70 disabled:cursor-wait
                      ${loading ? 'animate-pulse' : 'hover:scale-[1.02] hover:shadow-primary/40 active:scale-[0.98]'}
                    `}
                  >
                    {loading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Upload className="w-5 h-5" />
                    )}
                    <span className="uppercase tracking-widest text-[10px]">Download PDF</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="mt-32 py-10 px-10 flex flex-col sm:flex-row justify-between items-center bg-white/40 backdrop-blur-md border-t border-white/40 gap-6">
        <div className="text-[9px] text-[#999] font-bold tracking-[0.2em] uppercase">
          Personal Color Lab © 2026 Studio Lab. AI Analysis V.2.5.4
        </div>
        <div className="flex gap-8">
          <div className="flex items-center gap-2 text-[9px] text-[#999] font-bold uppercase tracking-[0.2em]">
            <div className="w-2 h-2 rounded-full bg-green-400 shadow-sm animate-pulse" /> Scanner Online
          </div>
          <div className="flex items-center gap-2 text-[9px] text-[#999] font-bold uppercase tracking-[0.2em]">
            <div className="w-2 h-2 rounded-full bg-green-400 shadow-sm animate-pulse" /> Database Synced
          </div>
        </div>
      </footer>
    </div>
  );
}
