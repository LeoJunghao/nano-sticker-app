
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
      const currentKey = (window as any).process?.env?.API_KEY || process.env.API_KEY;
      if (currentKey && currentKey.length > 10) {
        setHasKey(true);
        return;
      }
      // @ts-ignore
      const aiStudio = window.aistudio;
      if (aiStudio && typeof aiStudio.hasSelectedApiKey === 'function') {
        try {
          const isSelected = await aiStudio.hasSelectedApiKey();
          if (isSelected) setHasKey(true);
        } catch (e) {}
      }
    };
    checkKey();
    const timer = setInterval(checkKey, 2000);
    return () => clearInterval(timer);
  }, []);

  const handleApplyManualKey = () => {
    const key = manualKey.trim();
    if (key.length > 10) {
      if (!(window as any).process) (window as any).process = { env: {} };
      (window as any).process.env.API_KEY = key;
      setHasKey(true);
      setState(prev => ({ ...prev, error: null }));
    } else {
      setState(prev => ({ ...prev, error: "金鑰長度不正確，請重新輸入。" }));
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

  const handleGoBack = () => {
    setState(prev => {
      const steps = [
        GenerationStep.Upload,
        GenerationStep.CharacterSelection,
        GenerationStep.TextEntry,
        GenerationStep.FinalResult
      ];
      const currentIndex = steps.indexOf(prev.step);
      const prevStep = currentIndex > 0 ? steps[currentIndex - 1] : steps[0];
      return { ...prev, step: prevStep, error: null };
    });
  };

  const handleGenerateCharacters = async () => {
    if (!hasKey) {
      setState(prev => ({ ...prev, error: "請先輸入並套用 API Key。" }));
      return; 
    }
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const urls = await generateCharacterOptions(state.referenceImages, state.style);
      const options: CharacterOption[] = urls.map((url, idx) => ({ id: `char-${idx}`, url, base64: url }));
      setState(prev => ({ ...prev, characterOptions: options, step: GenerationStep.CharacterSelection, isLoading: false }));
    } catch (err: any) {
      const errorMsg = err.message === "API_KEY_MISSING" ? "尚未套用有效的 API 金鑰。" : (err.message || "生成失敗");
      setState(prev => ({ ...prev, error: errorMsg, isLoading: false }));
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
      setState(prev => ({ ...prev, error: `繪製失敗：${err.message}`, isLoading: false }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-20">
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight italic">Nano Banana <span className="text-indigo-600">PRO</span></h1>
          <p className="text-gray-500 font-bold mt-1">一致性角色 LINE 貼圖代理</p>
        </div>
        
        <div className={`bg-white p-4 rounded-3xl shadow-xl border-2 transition-all ${hasKey ? 'border-green-200' : 'border-indigo-100'} flex flex-col sm:flex-row items-center gap-4 min-w-[320px]`}>
          <div className="flex flex-col flex-1 w-full">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-3 h-3 rounded-full ${hasKey ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`}></div>
              <span className="text-sm font-black text-gray-700">{hasKey ? '金鑰已連線' : '金鑰未就緒'}</span>
            </div>
            {!hasKey && (
              <div className="flex gap-2">
                <input 
                  type="password"
                  placeholder="在此輸入 API Key..."
                  value={manualKey}
                  onChange={(e) => setManualKey(e.target.value)}
                  className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs font-mono outline-none w-full"
                />
                <button onClick={handleApplyManualKey} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-indigo-700">套用</button>
              </div>
            )}
            {hasKey && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-400">目前環境：用戶授權</span>
                <button onClick={() => { setHasKey(false); if((window as any).process) (window as any).process.env.API_KEY = ""; }} className="text-[10px] text-red-400 font-bold underline">重新設定</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {state.error && (
        <div className="mb-8 bg-red-50 border-l-8 border-red-500 p-6 rounded-r-3xl flex items-center gap-4 animate-bounce-short">
          <p className="text-red-700 font-black">{state.error}</p>
          <button onClick={() => setState(prev => ({ ...prev, error: null }))} className="ml-auto text-red-300">✕</button>
        </div>
      )}

      {state.isLoading && (
        <div className="fixed inset-0 bg-white/90 backdrop-blur-xl z-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 border-8 border-indigo-600 border-t-transparent rounded-full animate-spin mb-8 shadow-2xl shadow-indigo-200"></div>
          <h3 className="text-3xl font-black mb-2 tracking-widest">NANO BANANA 鑄造中...</h3>
          <p className="text-gray-500 font-bold text-lg">正在繪製 4x3 繁體中文貼圖包，預計 20-40 秒。</p>
        </div>
      )}

      {/* 導覽按鈕 */}
      {state.step !== GenerationStep.Upload && !state.isLoading && (
        <button 
          onClick={handleGoBack}
          className="mb-6 flex items-center gap-2 text-indigo-600 font-black bg-indigo-50 px-6 py-3 rounded-2xl hover:bg-indigo-100 transition-all shadow-sm"
        >
          <span className="text-2xl">←</span> 回到上一頁
        </button>
      )}

      {state.step === GenerationStep.Upload && (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
          <section className="bg-white p-10 rounded-[3.5rem] shadow-2xl border border-gray-100">
            <h2 className="text-3xl font-black mb-8 flex items-center gap-4 italic text-gray-800">
               <span className="bg-indigo-600 text-white w-10 h-10 rounded-2xl flex items-center justify-center text-lg shadow-lg">1</span>
               角色基因上傳
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-10">
              {state.referenceImages.map((img, idx) => (
                <div key={idx} className="relative aspect-square rounded-[2rem] overflow-hidden border-4 border-gray-50 shadow-md group transform transition hover:scale-105">
                  <img src={img} className="w-full h-full object-cover" />
                  <button onClick={() => setState(prev => ({ ...prev, referenceImages: prev.referenceImages.filter((_, i) => i !== idx)}))} className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                </div>
              ))}
              {state.referenceImages.length < 5 && (
                <label className="flex flex-col items-center justify-center aspect-square border-4 border-dashed border-indigo-50 rounded-[2rem] bg-indigo-50/10 cursor-pointer hover:bg-indigo-50 transition-all group">
                  <input type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" />
                  <span className="text-5xl text-indigo-200 group-hover:text-indigo-400">+</span>
                </label>
              )}
            </div>
            <div className="space-y-8">
              <div>
                <label className="block text-xs font-black text-gray-400 mb-4 uppercase tracking-[0.3em]">風格快捷鍵</label>
                <div className="flex flex-wrap gap-2 mb-6">
                  {STYLE_PRESETS.map(preset => (
                    <button 
                      key={preset}
                      type="button"
                      onClick={() => setState(prev => ({ ...prev, style: preset }))}
                      className={`px-6 py-3 rounded-2xl text-sm font-black transition-all ${state.style === preset ? 'bg-indigo-600 text-white shadow-xl -translate-y-1' : 'bg-gray-50 text-gray-400 hover:text-indigo-600 active:scale-95'}`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <input 
                  type="text" 
                  value={state.style} 
                  onChange={(e) => setState(prev => ({ ...prev, style: e.target.value }))}
                  placeholder="自定義風格描述..."
                  className="w-full px-8 py-5 bg-gray-50 border-2 border-transparent rounded-[2rem] outline-none font-black text-xl focus:border-indigo-600 focus:bg-white shadow-inner transition-all"
                />
              </div>
              <button 
                onClick={handleGenerateCharacters}
                disabled={state.referenceImages.length === 0 || !hasKey}
                className={`w-full py-8 rounded-[2.5rem] font-black text-2xl shadow-2xl transition-all ${state.referenceImages.length === 0 || !hasKey ? 'bg-gray-100 text-gray-300' : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98]'}`}
              >
                生成一致性角色原型
              </button>
            </div>
          </section>
        </div>
      )}

      {state.step === GenerationStep.CharacterSelection && (
        <div className="animate-in zoom-in duration-500">
          <h2 className="text-4xl font-black mb-10 text-center italic">基因選擇：指定核心基準</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {state.characterOptions.map((char) => (
              <div key={char.id} className="cursor-pointer bg-white rounded-[3rem] overflow-hidden shadow-2xl border-8 border-transparent hover:border-indigo-600 transform transition-all hover:-translate-y-4" onClick={() => handleSelectCharacter(char)}>
                <img src={char.url} className="w-full aspect-square object-cover" />
                <div className="p-6 text-center font-black text-indigo-600 text-xl bg-indigo-50/50">以此鑄造貼圖包</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {state.step === GenerationStep.TextEntry && (
        <div className="bg-white p-12 rounded-[4rem] shadow-2xl border border-gray-100 animate-in slide-in-from-right-12 duration-700">
          <h2 className="text-3xl font-black mb-10 italic">2. 貼圖規劃：標語與氛圍</h2>
          <div className="space-y-10">
            <div>
              <label className="block text-sm font-black text-gray-400 mb-4 uppercase tracking-widest">12 組貼圖標語 (逗號分隔，將轉化為手寫繁體)</label>
              <textarea 
                value={state.stickerText} 
                onChange={(e) => setState(prev => ({ ...prev, stickerText: e.target.value }))} 
                className="w-full p-8 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-[3rem] outline-none font-black text-2xl min-h-[180px] shadow-inner transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-black text-gray-400 mb-4 uppercase tracking-widest">表情包形容詞 (風格氛圍描述)</label>
              <input 
                type="text"
                value={state.stickerAdjectives} 
                onChange={(e) => setState(prev => ({ ...prev, stickerAdjectives: e.target.value }))} 
                placeholder="例如：誇張表情, 復古拼貼, 超級可愛, 搞怪動漫..."
                className="w-full p-8 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-[2.5rem] outline-none font-black text-2xl shadow-inner transition-all"
              />
            </div>
            <button onClick={handleGenerateStickers} className="w-full py-8 bg-indigo-600 text-white rounded-[3rem] font-black text-3xl hover:bg-indigo-700 shadow-2xl active:scale-95 transition-all">
              生成 4x3 表情組合包
            </button>
          </div>
        </div>
      )}

      {state.step === GenerationStep.FinalResult && state.finalGridUrl && (
        <div className="text-center animate-in zoom-in-50 duration-700">
          <h2 className="text-5xl font-black mb-10 italic">鑄造成功：旗艦級表情包</h2>
          <div className="relative group inline-block">
             <img src={state.finalGridUrl} className="max-w-full rounded-[4rem] shadow-2xl mb-12 border-[12px] border-white transform transition hover:scale-[1.02]" alt="Final Stickers" />
             <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 rounded-[4rem] pointer-events-none transition-opacity"></div>
          </div>
          <div className="flex flex-wrap gap-6 justify-center">
            <a href={state.finalGridUrl} download="sticker-grid-pro.png" className="px-14 py-7 bg-green-600 text-white rounded-[2.5rem] font-black text-2xl shadow-2xl hover:bg-green-700 transition-all hover:scale-105">下載表情包 (1K)</a>
            <button onClick={() => window.location.reload()} className="px-14 py-7 bg-gray-200 text-gray-600 rounded-[2.5rem] font-black text-2xl hover:bg-gray-300 transition-all">鑄造全新角色</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
