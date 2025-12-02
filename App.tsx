import React, { useState, useEffect, useRef } from 'react';
import { Upload, Clapperboard, Play, FileJson, Image as ImageIcon, Trash2, AlertTriangle } from 'lucide-react';
import { DEFAULT_SHOT_LIST, GeneratedShot, GenerationStatus, ShotConfig } from './types';
import { generateStoryboardFrame, isApiKeyAvailable } from './services/geminiService';
import { Button } from './components/Button';
import { ShotCard } from './components/ShotCard';

// Helper to generate unique IDs
const generateId = () => Math.random().toString(36).substring(7);

const App: React.FC = () => {
  // --- State ---
  const [refImage, setRefImage] = useState<string | null>(null);
  const [jsonInput, setJsonInput] = useState<string>(JSON.stringify(DEFAULT_SHOT_LIST, null, 2));
  const [shots, setShots] = useState<GeneratedShot[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // File Input Refs
  const imageInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  // Check API Key on mount
  const hasApiKey = isApiKeyAvailable();

  // --- Handlers ---

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setRefImage(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setJsonInput(event.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  const validateAndParseJson = (): ShotConfig[] | null => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (!Array.isArray(parsed)) {
        setValidationError("JSON must be an array of shot objects.");
        return null;
      }
      // Simple structural check
      const valid = parsed.every(item => item.shot_type && item.prompt);
      if (!valid) {
        setValidationError("Each shot must have 'shot_type' and 'prompt' fields.");
        return null;
      }
      setValidationError(null);
      return parsed;
    } catch (e) {
      setValidationError("Invalid JSON format.");
      return null;
    }
  };

  const handleGenerate = async () => {
    if (!refImage) {
      alert("Please upload a Character Reference Image first.");
      return;
    }

    const shotConfigs = validateAndParseJson();
    if (!shotConfigs) return;

    if (!hasApiKey) {
      setValidationError("API Key missing in environment (process.env.API_KEY).");
      return;
    }

    setIsGenerating(true);
    
    // Initialize empty result cards
    const initialShots: GeneratedShot[] = shotConfigs.map(config => ({
      ...config,
      id: generateId(),
      status: GenerationStatus.PENDING
    }));
    setShots(initialShots);

    // Process sequentially to handle potential rate limits elegantly
    // We update the state item-by-item
    for (let i = 0; i < initialShots.length; i++) {
      const shot = initialShots[i];
      
      try {
        const imageUrl = await generateStoryboardFrame(refImage, shot);
        
        setShots(prev => prev.map(s => 
          s.id === shot.id 
            ? { ...s, status: GenerationStatus.SUCCESS, imageUrl } 
            : s
        ));
      } catch (error: any) {
        setShots(prev => prev.map(s => 
          s.id === shot.id 
            ? { ...s, status: GenerationStatus.ERROR, error: error.message } 
            : s
        ));
      }

      // Small delay between requests to be nice to the API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setIsGenerating(false);
  };

  const handleClear = () => {
    setShots([]);
    setIsGenerating(false);
  };

  // --- Render ---

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 selection:bg-blue-500/30">
      
      {/* Top Bar */}
      <header className="h-16 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50 flex items-center px-6 justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)]">
            <Clapperboard className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight text-white leading-tight">CineGen</h1>
            <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest">AI Storyboard Studio</p>
          </div>
        </div>
        
        {!hasApiKey && (
          <div className="flex items-center gap-2 text-amber-500 bg-amber-950/30 px-3 py-1 rounded border border-amber-900/50 text-xs">
            <AlertTriangle className="w-4 h-4" />
            <span>Missing API_KEY in env</span>
          </div>
        )}
      </header>

      <main className="flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden">
        
        {/* LEFT PANEL: Inputs (Scrollable on mobile, fixed width on desktop) */}
        <aside className="w-full lg:w-[450px] bg-zinc-950 border-r border-zinc-800 flex flex-col h-full overflow-y-auto">
          <div className="p-6 space-y-8">
            
            {/* 1. Character Reference */}
            <section className="space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-semibold text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  Character Ref
                </h2>
                {refImage && (
                  <button onClick={() => setRefImage(null)} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                    <Trash2 className="w-3 h-3" /> Clear
                  </button>
                )}
              </div>
              
              <div 
                className={`relative group border-2 border-dashed rounded-xl transition-all duration-200 overflow-hidden ${
                  refImage ? 'border-zinc-700 bg-zinc-900 h-64' : 'border-zinc-800 hover:border-blue-500/50 hover:bg-zinc-900/50 h-32'
                }`}
              >
                {!refImage ? (
                  <label className="flex flex-col items-center justify-center h-full cursor-pointer">
                    <div className="p-3 bg-zinc-800 rounded-full mb-2 group-hover:bg-blue-600/20 group-hover:text-blue-400 transition-colors text-zinc-400">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <span className="text-xs text-zinc-400 font-medium">Click to upload Character Image</span>
                    <input 
                      ref={imageInputRef}
                      type="file" 
                      accept="image/png, image/jpeg" 
                      className="hidden" 
                      onChange={handleImageUpload} 
                    />
                  </label>
                ) : (
                  <div className="relative w-full h-full">
                    <img src={refImage} alt="Reference" className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                      <p className="text-xs text-white font-mono">REF_IMG_01.PNG</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* 2. Shot List JSON */}
            <section className="space-y-3 flex-grow flex flex-col">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-semibold text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                  Shot List (JSON)
                </h2>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setJsonInput(JSON.stringify(DEFAULT_SHOT_LIST, null, 2))}
                    className="text-[10px] uppercase font-bold text-zinc-500 hover:text-zinc-300"
                  >
                    Reset Default
                  </button>
                  <label className="text-[10px] uppercase font-bold text-blue-500 hover:text-blue-400 cursor-pointer flex items-center gap-1">
                    <Upload className="w-3 h-3" />
                    Load File
                    <input 
                      ref={jsonInputRef}
                      type="file" 
                      accept=".json"
                      className="hidden" 
                      onChange={handleJsonUpload}
                    />
                  </label>
                </div>
              </div>

              <div className="relative flex-grow min-h-[200px]">
                <textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  className="w-full h-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 font-mono text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-y"
                  spellCheck={false}
                />
                <div className="absolute top-2 right-2 pointer-events-none">
                  <FileJson className="w-4 h-4 text-zinc-700" />
                </div>
              </div>
              
              {validationError && (
                <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-md text-red-400 text-xs flex gap-2 items-start">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  {validationError}
                </div>
              )}
            </section>
          </div>

          {/* Action Bar */}
          <div className="p-6 border-t border-zinc-800 bg-zinc-950 sticky bottom-0 z-10">
            <Button 
              onClick={handleGenerate} 
              isLoading={isGenerating} 
              disabled={!refImage || !jsonInput || !hasApiKey}
              className="w-full py-3 text-base shadow-lg shadow-blue-900/20"
              icon={<Play className="w-4 h-4 fill-current" />}
            >
              {isGenerating ? 'Rendering Storyboard...' : 'Generate Storyboard'}
            </Button>
          </div>
        </aside>

        {/* RIGHT PANEL: Dailies / Results */}
        <section className="flex-1 bg-zinc-950/50 overflow-y-auto p-6 lg:p-10 relative">
          
          {shots.length === 0 && !isGenerating ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-4">
              <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <Clapperboard className="w-10 h-10 opacity-20" />
              </div>
              <p className="font-mono text-sm">NO DAILIES AVAILABLE</p>
              <p className="text-sm text-zinc-500 max-w-xs text-center">
                Upload a character reference and define your shots to begin the visualization process.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-end mb-8 border-b border-zinc-800 pb-4">
                <div>
                  <h2 className="text-2xl font-light text-white tracking-tight">Dailies</h2>
                  <p className="text-zinc-500 text-sm font-mono mt-1">
                    SESSION_ID: {shots.length > 0 ? shots[0].id.substring(0, 4).toUpperCase() : '---'} • {shots.length} SHOTS
                  </p>
                </div>
                {shots.length > 0 && !isGenerating && (
                   <Button variant="ghost" onClick={handleClear} className="text-xs">
                     <Trash2 className="w-4 h-4 mr-1" /> Clear Session
                   </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
                {shots.map((shot, index) => (
                  <ShotCard key={shot.id} shot={shot} index={index} />
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

// Simple Icon for alert needed in JSX but not imported
const AlertCircle = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
);

export default App;