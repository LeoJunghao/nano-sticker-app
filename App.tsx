
import React, { useState, useEffect } from 'react';
import { GenerationStep, AppState, CharacterOption } from './types';
import { generateCharacterOptions, generateStickerGrid } from './services/geminiService';

const STYLE_PRESETS = [
  '2D Q版擬真圖',
  '3D Q版擬真圖',
  '超擬真彩色鉛筆素描風格',
  'Q版誇張諷刺畫（Caricature 美式漫畫畫風）'
];

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    step: GenerationStep.Upload,
    referenceImages: [],
    style: STYLE_PRESETS[0],
    characterOptions: [],
    selectedCharacter: null,
    stickerText: "早安, 謝謝, 辛苦了, 讚啦, 沒問題, 傻眼, 哭哭, 哈哈, 忙碌中, 想你, 拜託, 晚安",
    stickerAdjectives: "逗趣, 誇張表情, 充滿活力, 搞怪",
    finalGridUrl: null,
    isLoading: false,
    error: null,
  });

  const [hasKey, setHasKey] = useState(false);
  const [manualKey, setManualKey] = useState("");

  useEffect(() => {
    const checkKey = async () => {
      // 檢查環境變數
      if (process.env.API_KEY && process.env.API_KEY.length > 10) {
        setHasKey(true);
        return;
      }

      // 檢查 AI Studio 注入
      // @ts-ignore
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        try {
          // @ts-ignore
          const isSelected = await window.aistudio.hasSelectedApiKey();
          if (isSelected) setHasKey(true);
        } catch (e) {}
      }
    };
    checkKey();
    const timer = setInterval(checkKey, 3000);
    return () => clearInterval(timer);
  }, []);

  const handleApplyManualKey = () => {
    if (manualKey.trim().length > 10) {
      // 確保注入到 process.env 以供 SDK 使用
      (window as any).process.env.API_KEY = manualKey.trim();
      setHasKey(true);
      setState(prev => ({ ...prev, error: null }));
    } else {
      setState(prev => ({ ...prev, error: "請輸入有效的 API 金鑰。" }));
    }
  };

  const handleOpenKeyDialog = async () => {
    // @ts-ignore
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      try {
        // @ts-ignore
        await window.aistudio.openSelectKey();
        setHasKey(true);
      } catch (e) {}
    } else {
      if (window.confirm("建議在 Google AI Studio 環境下運行。若您已設定環境變數，點擊確定繼續。")) {
        setHasKey(true);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const fileList = Array.from(files).slice(0, 5) as File[];
    const promises = fileList.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.readAsDataURL(file);
      });
    });
    Promise.all(promises).then(base64Images => {
      setState(prev => ({ 
        ...prev, 
        referenceImages: [...prev.referenceImages, ...base64Images].slice(0, 5) 
      }));
    });
  };

  const removeImage = (index: number) => {
    setState(prev => ({
      ...prev,
      referenceImages: prev.referenceImages.filter((_, i) => i !== index)
    }));
  };

  const handleGenerateCharacters = async () => {
    if (!hasKey) {
      setState(prev => ({ ...prev, error: "請先輸入 API 金鑰。" }));
      return; 
    }
    if (state.referenceImages.length === 0) {
      setState(prev => ({ ...prev, error: "請上傳角色參考照。" }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const urls = await generateCharacterOptions(state.referenceImages, state.style);
      const options: CharacterOption[] = urls.map((url, idx) => ({ id: `char-${idx}`, url, base64: url }));
      setState(prev => ({ 
        ...prev, 
        characterOptions: options, 
        step: GenerationStep.CharacterSelection, 
        isLoading: false 
      }));
    } catch (err: any) {
      setState(prev => ({ 
        ...prev, 
        error: "生成失敗。請確認金鑰為『付費專案』且支援 Gemini 3 Pro 模型。", 
        isLoading: false 
      }));
    }
  };

  const handleSelectCharacter = (char: CharacterOption) => {
    setState(prev => ({ ...prev, selectedCharacter: char, step: GenerationStep.TextEntry }));
  };

  const handleGenerateStickers = async () => {
    if (!state.selectedCharacter) return;
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const gridUrl = await generateStickerGrid(state.selectedCharacter.base64, state.stickerText, state.stickerAdjectives);
      setState(prev => ({ ...prev, finalGridUrl: gridUrl, step: GenerationStep.FinalResult, isLoading: false }));
    } catch (err: any) {
      setState(prev => ({ ...prev, error: "繪製貼圖網格失敗。", isLoading: false }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-20">
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Nano Banana <span className="text-indigo-600">Pro</span></h1>
          <p className="text-gray-500 font-medium mt-1 text-lg">旗艦版 Gemini 3 Pro 一致性貼圖代理</p>
        </div>
        
        <div className="bg-white p-4 rounded-3xl shadow-lg border border-indigo-50 flex flex-col sm:flex-row items-center gap-4 min-w-[320px]">
          <div className="flex flex-col flex-1 w-full">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-3 h-3 rounded-full ${hasKey ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`}></div>
              <span className="text-sm font-black text-gray-700">{hasKey ? '旗艦版模型已就緒' : '請輸入 API 金鑰'}</span>
            </div>
            {!hasKey && (
              <div className="flex gap-2">
                <input 
                  type="password"
                  placeholder="Paste your API Key here..."
                  value={manualKey}
                  onChange={(e) => setManualKey(e.target.value)}
                  className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5 text-xs font-mono outline-none focus:border-indigo-300 transition-all w-full"
                />
                <button 
                  onClick={handleApplyManualKey}
                  className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-black whitespace-nowrap hover:bg-indigo-700"
                >
                  套用
                </button>
              </div>
            )}
            {hasKey && <p className="text-xs text-gray-400 font-medium">權限等級：Gemini 3 Pro (Paid Tier)</p>}
          </div>
          <button 
            type="button"
            onClick={handleOpenKeyDialog}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${hasKey ? 'bg-gray-50 text-gray-400' : 'bg-indigo-50 text-indigo-600'}`}
          >
            {hasKey ? '更換' : '官方選取'}
          </button>
        </div>
      </header>

      {state.error && (
        <div className="mb-8 bg-red-50 border-l-4 border-red-500 p-5 rounded-r-2xl flex items-center justify-between animate-in fade-in">
          <p className="text-red-700 font-black">{state.error}</p>
          <button onClick={() => setState(prev => ({ ...prev, error: null }))} className="text-red-400">✕</button>
        </div>
      )}

      {state.isLoading && (
        <div className="fixed inset-0 bg-white/90 backdrop-blur-xl z-50 flex flex-col items-center justify-center p-6">
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl animate-bounce flex items-center justify-center mb-8">
            <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 className="text-2xl font-black mb-2">Nano Banana Pro 正在繪製...</h3>
          <p className="text-gray-500 font-medium">旗艦模型正在處理 1K 高畫質細節，請稍候。</p>
        </div>
      )}

      {state.step === GenerationStep.Upload && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <section className="bg-white p-8 md:p-12 rounded-[3rem] shadow-2xl border border-gray-100">
            <div className="mb-10">
              <h2 className="text-2xl font-black text-gray-900 mb-3 flex items-center gap-3">
                <span className="bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
                提供角色特徵
              </h2>
              <p className="text-gray-500 font-medium ml-11">Nano Banana Pro 會精準分析多張照片中的人臉基因。</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-10 ml-11">
              {state.referenceImages.map((img, idx) => (
                <div key={idx} className="relative group aspect-square rounded-2xl overflow-hidden border shadow-sm">
                  <img src={img} className="w-full h-full object-cover" />
                  <button onClick={() => removeImage(idx)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
              {state.referenceImages.length < 5 && (
                <label className="flex items-center justify-center aspect-square border-2 border-dashed border-indigo-100 rounded-2xl bg-indigo-50/10 cursor-pointer hover:bg-indigo-50 group">
                  <input type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" />
                  <span className="text-3xl text-indigo-200 group-hover:text-indigo-400">+</span>
                </label>
              )}
            </div>

            <div className="space-y-8 ml-11">
              <div>
                <label className="block text-sm font-black text-gray-700 mb-4 uppercase tracking-widest">欲生成的風格</label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {STYLE_PRESETS.map(preset => (
                    <button 
                      key={preset}
                      onClick={() => setState(prev => ({ ...prev, style: preset }))}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${state.style === preset ? 'bg-indigo-600 text-white shadow-md' : 'bg-white border-2 border-gray-100 text-gray-400 hover:border-indigo-200'}`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <input 
                  type="text" 
                  value={state.style} 
                  onChange={(e) => setState(prev => ({ ...prev, style: e.target.value }))}
                  className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 focus:border-indigo-600 rounded-2xl outline-none font-bold text-lg"
                />
              </div>

              <button 
                type="button"
                onClick={handleGenerateCharacters}
                disabled={state.referenceImages.length === 0 || !hasKey}
                className={`w-full py-6 rounded-3xl font-black text-2xl shadow-xl transition-all active:scale-95 ${state.referenceImages.length === 0 || !hasKey ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
              >
                鑄造旗艦級角色原型
              </button>
            </div>
          </section>
        </div>
      )}

      {state.step === GenerationStep.CharacterSelection && (
        <div className="animate-in fade-in duration-500">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black mb-2">選取最強原型</h2>
            <p className="text-gray-500 font-medium">這些圖像是由 Gemini 3 Pro 深度學習您的照片後生成的。</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {state.characterOptions.map((char) => (
              <div 
                key={char.id} 
                className="group cursor-pointer bg-white rounded-[2.5rem] overflow-hidden shadow-lg hover:shadow-2xl transition-all border-4 border-transparent hover:border-indigo-600" 
                onClick={() => handleSelectCharacter(char)}
              >
                <img src={char.url} className="w-full aspect-square object-cover" />
                <div className="p-5 text-center font-black text-indigo-600 bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  以此角色製作全套
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {state.step === GenerationStep.TextEntry && (
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-gray-100 animate-in slide-in-from-right-8 duration-500">
          <h2 className="text-2xl font-black text-gray-900 mb-8 flex items-center gap-4">
             <span className="bg-indigo-600 text-white w-10 h-10 rounded-full flex items-center justify-center text-base">2</span>
             貼圖包細節設定
          </h2>
          <div className="space-y-8 ml-14">
            <div>
              <label className="block text-xs font-black text-gray-400 mb-3 uppercase tracking-widest">繁體中文標語 (12組，逗號分隔)</label>
              <textarea 
                value={state.stickerText} 
                onChange={(e) => setState(prev => ({ ...prev, stickerText: e.target.value }))} 
                className="w-full p-6 bg-gray-50 border-2 border-gray-100 focus:border-indigo-600 rounded-2xl outline-none font-bold text-lg min-h-[150px]"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 mb-3 uppercase tracking-widest">動態情緒氛圍</label>
              <input 
                value={state.stickerAdjectives} 
                onChange={(e) => setState(prev => ({ ...prev, stickerAdjectives: e.target.value }))} 
                className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 focus:border-indigo-600 rounded-xl outline-none font-bold text-lg" 
              />
            </div>
            <button 
              type="button"
              onClick={handleGenerateStickers} 
              className="w-full py-6 bg-indigo-600 text-white rounded-3xl font-black text-2xl hover:bg-indigo-700 shadow-xl transition-all active:scale-95"
            >
              生成 Pro 級 12 幀組合圖
            </button>
          </div>
        </div>
      )}

      {state.step === GenerationStep.FinalResult && state.finalGridUrl && (
        <div className="text-center animate-in zoom-in duration-500">
          <h2 className="text-3xl font-black text-gray-900 mb-10">Nano Banana Pro 鑄造成功！</h2>
          <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl inline-block mb-10 border max-w-full">
            <img src={state.finalGridUrl} className="max-w-full rounded-xl" alt="Final Sticker Grid" />
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-lg mx-auto">
            <a 
              href={state.finalGridUrl} 
              download="nano-banana-pro-stickers.png" 
              className="flex-1 py-5 bg-green-600 text-white rounded-2xl font-black text-xl hover:bg-green-700 shadow-lg transition-all"
            >
              下載 PNG
            </a>
            <button 
              type="button"
              onClick={() => setState(prev => ({ ...prev, step: GenerationStep.Upload, finalGridUrl: null, referenceImages: [] }))} 
              className="flex-1 py-5 bg-gray-100 text-gray-600 rounded-2xl font-black text-xl hover:bg-gray-200"
            >
              製作新角色
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
