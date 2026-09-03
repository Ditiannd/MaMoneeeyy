import { Bot, Cpu, Zap, Activity } from 'lucide-react';

export default function AiArchitectureCard() {
  return (
    <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-xl">
      <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
        <Cpu className="w-5 h-5 text-indigo-400" />
        AI System Architecture
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Text Pipeline */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <Activity className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="text-lg font-medium text-white">Text Pipeline</h3>
          </div>
          <p className="text-sm text-gray-400 mb-4 leading-relaxed">
            Natural language parser for quick expense & income text commands (/in & /out).
          </p>
          <div className="space-y-4">
            <div>
              <div className="text-xs text-gray-500 uppercase font-semibold mb-1.5">Primary Model</div>
              <div className="flex items-center gap-2 text-sm text-indigo-300 bg-indigo-500/10 px-3 py-2 rounded-lg border border-indigo-500/20">
                <Zap className="w-4 h-4 shrink-0" /> 
                <span className="font-medium">gemini-3.5-flash-lite</span>
                <span className="text-xs text-indigo-400/60 ml-auto">(500 RPD)</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase font-semibold mb-1.5">Fallback Routing</div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm text-gray-300 bg-black/20 px-3 py-2 rounded-lg border border-white/5">
                  <span className="text-gray-500 font-mono text-xs">1</span> gemini-3.1-flash-lite
                  <span className="text-xs text-gray-500 ml-auto">(500 RPD)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Vision Pipeline */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-pink-500/20 rounded-lg">
              <Bot className="w-5 h-5 text-pink-400" />
            </div>
            <h3 className="text-lg font-medium text-white">Vision Pipeline</h3>
          </div>
          <p className="text-sm text-gray-400 mb-4 leading-relaxed">
            Multimodal engine for extracting data from physical receipt images.
          </p>
          <div className="space-y-4">
            <div>
              <div className="text-xs text-gray-500 uppercase font-semibold mb-1.5">Primary Model</div>
              <div className="flex items-center gap-2 text-sm text-pink-300 bg-pink-500/10 px-3 py-2 rounded-lg border border-pink-500/20">
                <Zap className="w-4 h-4 shrink-0" /> 
                <span className="font-medium">gemini-3.1-flash-lite</span>
                <span className="text-xs text-pink-400/60 ml-auto">(500 RPD)</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase font-semibold mb-1.5">Fallback Routing</div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm text-gray-300 bg-black/20 px-3 py-2 rounded-lg border border-white/5">
                  <span className="text-gray-500 font-mono text-xs">1</span> gemini-3.5-flash-lite
                  <span className="text-xs text-gray-500 ml-auto">(500 RPD)</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300 bg-black/20 px-3 py-2 rounded-lg border border-white/5">
                  <span className="text-gray-500 font-mono text-xs">2</span> 
                  <span className="truncate">gemini-3.7-flash</span>
                  <span className="text-xs text-gray-500 ml-auto shrink-0">(20 RPD)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 px-4 text-sm text-emerald-200/90 flex items-center justify-center text-center">
        The backend automatically routes your requests to fallback models if the primary AI reaches its rate limit.
      </div>
    </div>
  );
}
