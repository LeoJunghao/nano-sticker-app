
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
  const [isAiStudioEnv, setIsAiStudioEnv] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      // 1. 檢查是否有環境變數 (Vercel Setting)
      if (process.env.API_KEY && process.env.API_KEY.length > 10) {
        setHasKey(true);
        return;
      }

      // 2. 檢查是否在 AI Studio 環境
      // @ts-ignore
      const aiStudio = window.aistudio;
      if (aiStudio && typeof aiStudio.hasSelectedApiKey === 'function') {
        setIsAiStudioEnv(true);
        try {
          const isSelected = await aiStudio.hasSelectedApiKey();
          if (isSelected) setHasKey(true);
        } catch (e) {}
      }
    };
    checkKey();
    const timer = setInterval(checkKey, 3000);
    return () => clearInterval(timer);
  }, []);

  const handleApplyManualKey = () => {
    const key = manualKey.trim();
    if (key.length > 10) {
      // 注入到全域 shim 供 SDK 使用
      (window as any).process.env.API_KEY = key;
      setHasKey(true);
      setState(prev => ({ ...prev, error: null }));
    } else {
      setState(prev => ({ ...prev, error: "請輸入有效的 API 金鑰（通常以 AIza... 開頭）。" }));
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
      setState(prev => ({ ...prev, error: "尚未偵測到金鑰。請在右上角輸入 API Key 並點擊「套用」。" }));
      return; 
    }
    if (state.referenceImages.length === 0) {
      setState(prev => ({ ...prev, error: "請上傳角色參考照片（建議 3-5 張）。" }));
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
      console.error(err);
      setState(prev => ({ 
        ...prev, 
        error: "生成失敗。請檢查：1. 金鑰是否正確。 2. 金鑰是否為付費專案 (Gemini 3 Pro 需要 Tier 1+)。", 
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
      setState(prev => ({ ...prev, error: "繪製貼圖網格失敗。請縮減文字長度或更換描述詞後重試。", isLoading: false }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-20">
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Nano Banana <span className="text-indigo-600">Pro</span></h1>
          <p className="text-gray-500 font-medium mt-1 text-lg">旗艦版 Gemini 3 Pro 一致性角色代理</p>
        </div>
        
        <div className={`bg-white p-4 rounded-3xl shadow-xl border-2 transition-all ${hasKey ? 'border-green-100' : 'border-indigo-100'} flex flex-col sm:flex-row items-center gap-4 min-w-[350px]`}>
          <div className="flex flex-col flex-1 w-full">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-3 h-3 rounded-full ${hasKey ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`}></div>
              <span className="text-sm font-black text-gray-700">
                {hasKey ? 'Gemini 3 Pro 已就緒' : '模型尚未授權'}
              </span>
            </div>
            
            {!hasKey && (
              <div className="flex gap-2 group">
                <input 
                  type="password"
                  placeholder="在此貼上 API Key (AIza...)"
                  value={manualKey}
                  onChange={(e) => setManualKey(e.target.value)}
                  className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-indigo-400 transition-all w-full shadow-inner"
                />
                <button 
                  onClick={handleApplyManualKey}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap hover:bg-indigo-700 shadow-lg shadow-indigo-100 active:scale-95 transition-all"
                >
                  套用
                </button>
              </div>
            )}
            
            {hasKey && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400 font-medium italic">目前使用：Paid Tier API</p>
                <button 
                  onClick={() => { setHasKey(false); (window as any).process.env.API_KEY = ""; }}
                  className="text-[10px] text-red-400 font-bold hover:underline"
                >
                  清除金鑰
                </button>
              </div>
            )}
          </div>

          {isAiStudioEnv && !hasKey && (
            <button 
              type="button"
              onClick={handleOpenKeyDialog}
              className="px-4 py-2 rounded-xl text-xs font-black bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
            >
              官方選取
            </button>
          )}
        </div>
      </header>

      {state.error && (
        <div className="mb-8 bg-red-50 border-l-8 border-red-500 p-6 rounded-r-3xl flex items-center justify-between animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-4">
            <div className="bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-black">!</div>
            <p className="text-red-700 font-black">{state.error}</p>
          </div>
          <button onClick={() => setState(prev => ({ ...prev, error: null }))} className="text-red-300 hover:text-red-500 text-xl font-black">✕</button>
        </div>
      )}

      {state.isLoading && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-2xl z-50 flex flex-col items-center justify-center p-6">
          <div className="relative mb-10">
            <div className="w-24 h-24 bg-indigo-600 rounded-[2.5rem] animate-spin duration-[3000ms] flex items-center justify-center"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>
          <h3 className="text-3xl font-black mb-3 tracking-tighter">Gemini 3 Pro 正在繪製...</h3>
          <p className="text-gray-500 font-bold text-lg animate-pulse">正在處理 1K 高畫質細節，這需要約 15-30 秒</p>
        </div>
      )}

      {state.step === GenerationStep.Upload && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <section className="bg-white p-8 md:p-14 rounded-[4rem] shadow-2xl border border-gray-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/30 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            
            <div className="mb-12">
              <h2 className="text-3xl font-black text-gray-900 mb-4 flex items-center gap-4">
                <span className="bg-indigo-600 text-white w-10 h-10 rounded-2xl flex items-center justify-center text-lg rotate-3 shadow-lg shadow-indigo-200">1</span>
                提供角色 DNA
              </h2>
              <p className="text-gray-500 font-bold ml-14 text-lg">旗艦版模型會深度分析多張照片，萃取角色長相特徵。</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-6 mb-12 ml-14">
              {state.referenceImages.map((img, idx) => (
                <div key={idx} className="relative group aspect-square rounded-3xl overflow-hidden border-4 border-gray-50 shadow-md hover:scale-105 transition-transform">
                  <img src={img} className="w-full h-full object-cover" />
                  <button onClick={() => removeImage(idx)} className="absolute top-2 right-2 bg-red-500 text-white rounded-xl p-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
              {state.referenceImages.length < 5 && (
                <label className="flex flex-col items-center justify-center aspect-square border-4 border-dashed border-indigo-100 rounded-3xl bg-indigo-50/10 cursor-pointer hover:bg-indigo-50 group transition-all">
                  <input type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" />
                  <span className="text-4xl text-indigo-300 group-hover:text-indigo-500 group-hover:scale-125 transition-all">+</span>
                  <span className="text-[10px] font-black text-indigo-300 mt-2">上傳照片</span>
                </label>
              )}
            </div>

            <div className="space-y-10 ml-14">
              <div>
                <label className="block text-sm font-black text-gray-400 mb-5 uppercase tracking-[0.3em]">想要生成的風格</label>
                <div className="flex flex-wrap gap-3 mb-6">
                  {STYLE_PRESETS.map(preset => (
                    <button 
                      key={preset}
                      onClick={() => setState(prev => ({ ...prev, style: preset }))}
                      className={`px-5 py-3 rounded-2xl text-sm font-black transition-all transform active:scale-95 ${state.style === preset ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 -translate-y-1' : 'bg-white border-2 border-gray-100 text-gray-400 hover:border-indigo-200 hover:text-indigo-600'}`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <input 
                  type="text" 
                  value={state.style} 
                  onChange={(e) => setState(prev => ({ ...prev, style: e.target.value }))}
                  placeholder="或手動輸入風格描述..."
                  className="w-full px-8 py-6 bg-gray-50 border-2 border-gray-100 focus:border-indigo-600 rounded-3xl outline-none font-black text-xl shadow-inner transition-all"
                />
              </div>

              <button 
                type="button"
                onClick={handleGenerateCharacters}
                disabled={state.referenceImages.length === 0 || !hasKey}
                className={`w-full py-8 rounded-[2.5rem] font-black text-3xl shadow-2xl transition-all transform active:scale-95 flex items-center justify-center gap-4 ${state.referenceImages.length === 0 || !hasKey ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-200'}`}
              >
                {!hasKey && <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>}
                鑄造旗艦級角色原型
              </button>
            </div>
          </section>
        </div>
      )}

      {state.step === GenerationStep.CharacterSelection && (
        <div className="animate-in fade-in zoom-in duration-500">
          <div className="text-center mb-12">
            <h2 className="text-5xl font-black mb-4 tracking-tighter">選取最強基因</h2>
            <p className="text-gray-500 font-bold text-xl">這些是 Gemini 3 Pro 深度解構後生成的三個原型。</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {state.characterOptions.map((char) => (
              <div 
                key={char.id} 
                className="group cursor-pointer bg-white rounded-[4rem] overflow-hidden shadow-2xl hover:shadow-indigo-100 transition-all border-8 border-transparent hover:border-indigo-600 transform hover:-translate-y-4" 
                onClick={() => handleSelectCharacter(char)}
              >
                <img src={char.url} className="w-full aspect-square object-cover" />
                <div className="p-8 text-center font-black text-indigo-600 bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white transition-all text-2xl">
                  以此製作全套
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {state.step === GenerationStep.TextEntry && (
        <div className="bg-white p-12 md:p-16 rounded-[4.5rem] shadow-2xl border border-gray-100 animate-in slide-in-from-right-12 duration-700">
          <h2 className="text-3xl font-black text-gray-900 mb-10 flex items-center gap-5">
             <span className="bg-indigo-600 text-white w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-indigo-100 rotate-6">2</span>
             貼圖包內容規劃
          </h2>
          <div className="space-y-12 ml-16">
            <div>
              <label className="block text-sm font-black text-gray-400 mb-5 uppercase tracking-widest">貼圖標語 (12組，逗號分隔，繁體中文)</label>
              <textarea 
                value={state.stickerText} 
                onChange={(e) => setState(prev => ({ ...prev, stickerText: e.target.value }))} 
                className="w-full p-8 bg-gray-50 border-2 border-gray-100 focus:border-indigo-600 rounded-[2.5rem] outline-none font-black text-2xl min-h-[200px] shadow-inner transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-black text-gray-400 mb-5 uppercase tracking-widest">動態情緒氛圍描述</label>
              <input 
                value={state.stickerAdjectives} 
                onChange={(e) => setState(prev => ({ ...prev, stickerAdjectives: e.target.value }))} 
                className="w-full px-8 py-6 bg-gray-50 border-2 border-gray-100 focus:border-indigo-600 rounded-[1.5rem] outline-none font-black text-2xl shadow-inner transition-all" 
              />
            </div>
            <button 
              type="button"
              onClick={handleGenerateStickers} 
              className="w-full py-8 bg-indigo-600 text-white rounded-[3rem] font-black text-3xl hover:bg-indigo-700 shadow-2xl shadow-indigo-100 transition-all transform active:scale-95"
            >
              生成 Pro 級 12 幀大網格
            </button>
          </div>
        </div>
      )}

      {state.step === GenerationStep.FinalResult && state.finalGridUrl && (
        <div className="text-center animate-in zoom-in-50 duration-700">
          <h2 className="text-5xl font-black text-gray-900 mb-12 tracking-tighter">鑄造成功！</h2>
          <div className="bg-white p-10 rounded-[5rem] shadow-2xl inline-block mb-12 border-2 border-gray-50 max-w-full">
            <img src={state.finalGridUrl} className="max-w-full rounded-3xl" alt="Final Sticker Sheet" />
          </div>
          <div className="flex flex-col sm:flex-row gap-8 justify-center max-w-2xl mx-auto pb-10">
            <a 
              href={state.finalGridUrl} 
              download="nano-banana-pro-sheet.png" 
              className="flex-1 py-7 bg-green-600 text-white rounded-[2.5rem] font-black text-2xl hover:bg-green-700 shadow-2xl transition-all flex items-center justify-center gap-4"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              下載 1K PNG
            </a>
            <button 
              type="button"
              onClick={() => setState(prev => ({ ...prev, step: GenerationStep.Upload, finalGridUrl: null, referenceImages: [] }))} 
              className="flex-1 py-7 bg-gray-100 text-gray-600 rounded-[2.5rem] font-black text-2xl hover:bg-gray-200 transition-all"
            >
              鑄造新角色
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
