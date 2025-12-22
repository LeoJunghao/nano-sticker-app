
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

  useEffect(() => {
    const checkKeyStatus = async () => {
      // 優先檢查 window.process.env
      const key = (window as any).process?.env?.API_KEY;
      if (key && key.length > 10) {
        setHasKey(true);
        return;
      }

      // @ts-ignore - 檢查平台內建授權狀態
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        try {
          // @ts-ignore
          const isSelected = await window.aistudio.hasSelectedApiKey();
          if (isSelected) setHasKey(true);
        } catch (e) {}
      }
    };

    checkKeyStatus();
    const interval = setInterval(checkKeyStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenKeySelector = async () => {
    // @ts-ignore
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      try {
        // @ts-ignore
        await window.aistudio.openSelectKey();
        // 點擊後立即假設成功以優化體驗，狀態會由 useEffect 持續更新
        setHasKey(true);
      } catch (e) {
        console.error("Failed to open key selector", e);
      }
    } else {
      setState(prev => ({ ...prev, error: "無法開啟金鑰選擇器，請確認是否在支援的環境中執行。" }));
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
      return { ...prev, step: currentIndex > 0 ? steps[currentIndex - 1] : steps[0], error: null };
    });
  };

  const handleGenerateCharacters = async () => {
    if (!hasKey) {
      setState(prev => ({ ...prev, error: "請先點擊右上角「授權 Pro 模型」以繼續。" }));
      return; 
    }
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const urls = await generateCharacterOptions(state.referenceImages, state.style);
      const options: CharacterOption[] = urls.map((url, idx) => ({ id: `char-${idx}`, url, base64: url }));
      setState(prev => ({ ...prev, characterOptions: options, step: GenerationStep.CharacterSelection, isLoading: false }));
    } catch (err: any) {
      console.error("API Error:", err);
      let errorMsg = err.message || "生成失敗";
      
      if (errorMsg.includes("403") || errorMsg.includes("not found")) {
        errorMsg = "權限錯誤。請確保您選擇的金鑰屬於已啟用計費的 GCP 專案。";
        setHasKey(false); // 重置狀態
      } else if (errorMsg === "API_KEY_MISSING") {
        errorMsg = "API 金鑰遺失，請重新授權。";
        setHasKey(false);
      }

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
      setState(prev => ({ ...prev, error: `貼圖包繪製失敗：${err.message}`, isLoading: false }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-20">
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight italic">Nano Banana <span className="text-indigo-600">PRO</span></h1>
          <p className="text-gray-500 font-bold mt-1">一致性角色旗艦貼圖代理</p>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          {hasKey ? (
            <div className="bg-green-50 border-2 border-green-200 px-6 py-3 rounded-2xl flex items-center gap-3">
               <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
               <span className="text-green-700 font-black text-sm">Pro 模型已授權</span>
               <button onClick={handleOpenKeySelector} className="text-[10px] text-green-400 hover:underline ml-2">切換專案</button>
            </div>
          ) : (
            <button 
              onClick={handleOpenKeySelector}
              className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-3 active:scale-95"
            >
              🔐 授權 Pro 模型 (需已開啟計費)
            </button>
          )}
          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-[10px] text-gray-400 underline hover:text-indigo-600 transition-colors">
            如何開啟金鑰計費功能？
          </a>
        </div>
      </header>

      {state.error && (
        <div className="mb-8 bg-red-50 border-l-8 border-red-500 p-6 rounded-r-3xl flex items-center gap-4 animate-in fade-in slide-in-from-top-4">
          <p className="text-red-700 font-black">{state.error}</p>
          <button onClick={() => setState(prev => ({ ...prev, error: null }))} className="ml-auto text-red-300 hover:text-red-500 transition-colors">✕</button>
        </div>
      )}

      {state.isLoading && (
        <div className="fixed inset-0 bg-white/90 backdrop-blur-xl z-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-24 h-24 border-8 border-indigo-600 border-t-transparent rounded-full animate-spin mb-8 shadow-2xl shadow-indigo-100"></div>
          <h3 className="text-3xl font-black mb-4 tracking-widest text-indigo-900">PRO 級運算中...</h3>
          <p className="text-gray-500 font-bold text-lg">正在根據您的金鑰調用旗艦影像模型，請稍候 20-40 秒。</p>
        </div>
      )}

      {state.step !== GenerationStep.Upload && !state.isLoading && (
        <button 
          onClick={handleGoBack}
          className="mb-8 flex items-center gap-2 text-indigo-600 font-black bg-white border border-indigo-100 px-6 py-3 rounded-2xl hover:bg-indigo-50 transition-all shadow-sm"
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
                className={`w-full py-8 rounded-[2.5rem] font-black text-2xl shadow-2xl transition-all ${state.referenceImages.length === 0 || !hasKey ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98]'}`}
              >
                {!hasKey ? '請先點擊右上角授權' : '生成一致性角色原型'}
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
              <label className="block text-sm font-black text-gray-400 mb-4 uppercase tracking-widest">表情包形容詞 (例如：搞怪, 誇張表情, 超級可愛...)</label>
              <input 
                type="text"
                value={state.stickerAdjectives} 
                onChange={(e) => setState(prev => ({ ...prev, stickerAdjectives: e.target.value }))} 
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
          <h2 className="text-5xl font-black mb-10 italic text-indigo-900">鑄造成功：PRO 旗艦表情包</h2>
          <div className="relative group inline-block">
             <img src={state.finalGridUrl} className="max-w-full rounded-[4rem] shadow-2xl mb-12 border-[12px] border-white transform transition hover:scale-[1.02]" alt="Final Stickers" />
          </div>
          <div className="flex flex-wrap gap-6 justify-center">
            <a href={state.finalGridUrl} download="pro-stickers.png" className="px-14 py-7 bg-green-600 text-white rounded-[2.5rem] font-black text-2xl shadow-2xl hover:bg-green-700 transition-all hover:scale-105">下載貼圖包 (1K/16:9)</a>
            <button onClick={() => window.location.reload()} className="px-14 py-7 bg-gray-200 text-gray-600 rounded-[2.5rem] font-black text-2xl hover:bg-gray-300 transition-all">製作新角色</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
