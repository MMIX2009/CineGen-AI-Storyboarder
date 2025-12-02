import React from 'react';
import { GeneratedShot, GenerationStatus } from '../types';
import { Download, Loader2, AlertCircle, Maximize2 } from 'lucide-react';

interface ShotCardProps {
  shot: GeneratedShot;
  index: number;
}

export const ShotCard: React.FC<ShotCardProps> = ({ shot, index }) => {
  const isPending = shot.status === GenerationStatus.PENDING;
  const isError = shot.status === GenerationStatus.ERROR;
  const isSuccess = shot.status === GenerationStatus.SUCCESS;

  const handleFullScreen = () => {
    if (!shot.imageUrl) return;

    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Shot #${index + 1} - ${shot.shot_type}</title>
            <style>
              body { 
                margin: 0; 
                padding: 0; 
                background-color: #09090b; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                height: 100vh; 
                width: 100vw;
                overflow: hidden;
              }
              img { 
                max-width: 95%; 
                max-height: 95%; 
                object-fit: contain; 
                box-shadow: 0 0 40px rgba(0,0,0,0.5);
                border-radius: 4px;
              }
            </style>
          </head>
          <body>
            <img src="${shot.imageUrl}" alt="${shot.prompt}" />
          </body>
        </html>
      `);
      newWindow.document.close();
    }
  };

  return (
    <div className="group relative flex flex-col bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden hover:border-blue-500/50 transition-all duration-300 shadow-lg">
      {/* Header */}
      <div className="px-3 py-2 bg-zinc-900 border-b border-zinc-800 flex justify-between items-center text-xs text-zinc-400 font-mono uppercase tracking-wider">
        <span className="flex items-center gap-2">
          <span className="text-blue-500 font-bold">#{index + 1}</span>
          {shot.shot_type}
        </span>
        <span>{shot.aspect_ratio}</span>
      </div>

      {/* Image Area */}
      <div className="relative aspect-video w-full bg-zinc-950 flex items-center justify-center overflow-hidden">
        {isPending && (
          <div className="flex flex-col items-center gap-3 text-blue-400">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="text-xs font-mono animate-pulse">RENDERING SHOT...</span>
          </div>
        )}
        
        {isError && (
          <div className="flex flex-col items-center gap-2 text-red-400 px-4 text-center">
            <AlertCircle className="w-8 h-8" />
            <span className="text-xs">{shot.error || "Generation Failed"}</span>
          </div>
        )}

        {isSuccess && shot.imageUrl && (
          <img 
            src={shot.imageUrl} 
            alt={shot.prompt} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        )}
        
        {/* Overlay Actions */}
        {isSuccess && (
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
            <a 
              href={shot.imageUrl} 
              download={`shot-${index + 1}.png`}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm transition-colors"
              title="Download High Res"
            >
              <Download className="w-5 h-5" />
            </a>
            <button 
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm transition-colors"
              title="View Fullscreen"
              onClick={handleFullScreen}
            >
              <Maximize2 className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 bg-zinc-900 border-t border-zinc-800 flex-grow flex flex-col justify-between">
        <p className="text-sm text-zinc-300 line-clamp-2 leading-relaxed font-light">
          {shot.prompt}
        </p>
      </div>
    </div>
  );
};