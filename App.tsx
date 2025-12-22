
import React, { useState, useEffect } from 'react';
import { GenerationStep, AppState, CharacterOption } from './types';
import { generateCharacterOptions, generateStickerGrid } from './services/geminiService';

const STYLE_PRESETS = [
  '2D Q版擬真圖',
  '3D Q版擬真圖',
  '超擬真彩色鉛筆素描風格',
  'Q版誇張諷刺畫'
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
  const [showManualInput, setShowManualInput] = useState(false);

  // 檢查環境是否支援平台金鑰選擇器
  const isPlatformEnv = !!((window as any).aistudio && (window as any).aistudio.openSelectKey);

  useEffect(() => {
    const checkKey = () => {
      const win = window as any;
      const key = win.process?.env?.API_KEY || win.API_KEY;
      if (key && key.length > 10) {
        setHasKey(true);
      } else {
        setHasKey(false);
      }
    };
    checkKey();
    const timer = setInterval(checkKey, 2000);
    return () => clearInterval(timer);
  }, []);

  const handleApplyManualKey = () => {
    const key = manualKey.trim();
    if (key.length > 10) {
      (window as any).process.env.API_KEY = key;
      setHasKey(true);
      setShowManualInput(false);
      setState(prev => ({ ...prev, error: null }));
    } else {
      setState(prev => ({ ...prev, error: "無效的金鑰格式。" }));
    }
  };

  const handleOpenKeySelector = async () => {
    if (isPlatformEnv) {
      try {
        // @ts-ignore
        await window.aistudio.openSelectKey();
        setHasKey(true);
      } catch (e) {
        setShowManualInput(true);
      }
    } else {
      setShowManualInput(true);
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
      let nextStep = GenerationStep.Upload;
      if (prev.step === GenerationStep.CharacterSelection) nextStep = GenerationStep.Upload;
      else if (prev.step === GenerationStep.TextEntry) nextStep = GenerationStep.CharacterSelection;
      else if (prev.step === GenerationStep.FinalResult) nextStep = GenerationStep.TextEntry;
      return { ...prev, step: nextStep, error: null };
    });
  };

  const handleGenerateCharacters = async () => {
    if (!hasKey) {
      setState(prev => ({ ...prev, error: "請先點擊上方授權金鑰。" }));
      return; 
    }
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const urls = await generateCharacterOptions(state.referenceImages, state.style);
      const options: CharacterOption[] = urls.map((url, idx) => ({ id: `char-${idx}`, url, base64: url }));
      setState(prev => ({ ...prev, characterOptions: options, step: GenerationStep.CharacterSelection, isLoading: false }));
    } catch (err: any) {
      const msg = err.message === "API_KEY_MISSING" ? "金鑰未正確設定，請重新嘗試授權。" : (err.message || "未知錯誤");
      setState(prev => ({ ...prev, error: `生成失敗: ${msg}`, isLoading: false }));
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
      setState(prev => ({ ...prev, error: `繪製失敗: ${err.message}`, isLoading: false }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-20">
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight italic">Nano Banana <span className="text-indigo-600">PRO</span></h1>
          <p className="text-gray-500 font-bold mt-1">一致性旗艦貼圖生成系統</p>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          {hasKey ? (
            <div className="bg-green-50 border-2 border-green-200 px-6 py-3 rounded-2xl flex items-center gap-3 shadow-sm">
               <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
               <span className="text-green-700 font-black text-sm">PRO 金鑰已連線</span>
               <button onClick={() => setHasKey(false)} className="text-[10px] text-red-400 font-bold ml-2">重設</button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 w-full sm:w-auto">
              <button 
                onClick={handleOpenKeySelector}
                className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 active:scale-95"
              >
                🔐 授權 Pro 模型
              </button>
              {showManualInput && (
                <div className="flex gap-2 animate-in fade-in slide-in-from-top-2">
                  <input 
                    type="password" 
                    placeholder="輸入 API Key..." 
                    value={manualKey} 
                    onChange={(e) => setManualKey(e.target.value)}
                    className="bg-white border-2 border-indigo-100 rounded-xl px-4 py-2 text-sm outline-none focus:border-indigo-600 w-48"
                  />
                  <button onClick={handleApplyManualKey} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-black">套用</button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {state.error && (
        <div className="mb-8 bg-red-50 border-l-8 border-red-500 p-6 rounded-r-3xl flex items-center gap-4 animate-in slide-in-from-top-4">
          <p className="text-red-700 font-black flex-1">{state.error}</p>
          <button onClick={() => setState(prev => ({ ...prev, error: null }))} className="text-red-300 hover:text-red-500">✕</button>
        </div>
      )}

      {state.isLoading && (
        <div className="fixed inset-0 bg-white/90 backdrop-blur-xl z-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-24 h-24 border-8 border-indigo-600 border-t-transparent rounded-full animate-spin mb-8 shadow-2xl"></div>
          <h3 className="text-3xl font-black mb-4 tracking-widest text-indigo-900 animate-pulse">繪製 4x3 繁體包中...</h3>
          <p className="text-gray-500 font-bold text-lg max-w-md">正在調用 Gemini 3 Pro 旗艦影像能力，預計 20-40 秒完成。</p>
        </div>
      )}

      {state.step !== GenerationStep.Upload && !state.isLoading && (
        <button 
          onClick={handleGoBack}
          className="mb-8 flex items-center gap-2 text-indigo-600 font-black bg-white border border-indigo-100 px-6 py-3 rounded-2xl hover:bg-indigo-50 transition-all shadow-sm group"
        >
          <span className="text-2xl group-hover:-translate-x-1 transition-transform">←</span> 回到上一頁
        </button>
      )}

      {state.step === GenerationStep.Upload && (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
          <section className="bg-white p-10 rounded-[3.5rem] shadow-2xl border border-gray-100">
            <h2 className="text-3xl font-black mb-8 flex items-center gap-4 italic">
               <span className="bg-indigo-600 text-white w-10 h-10 rounded-2xl flex items-center justify-center text-lg shadow-lg">1</span>
               角色基因庫
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-10">
              {state.referenceImages.map((img, idx) => (
                <div key={idx} className="relative aspect-square rounded-[2rem] overflow-hidden border-4 border-gray-50 shadow-md group transform transition hover:scale-105">
                  <img src={img} className="w-full h-full object-cover" />
                  <button onClick={() => setState(prev => ({ ...prev, referenceImages: prev.referenceImages.filter((_, i) => i !== idx)}))} className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-xl opacity-0 group-hover:opacity-100">✕</button>
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
                <label className="block text-xs font-black text-gray-400 mb-4 uppercase tracking-[0.2em]">畫風預設</label>
                <div className="flex flex-wrap gap-2 mb-6">
                  {STYLE_PRESETS.map(preset => (
                    <button 
                      key={preset}
                      onClick={() => setState(prev => ({ ...prev, style: preset }))}
                      className={`px-6 py-3 rounded-2xl text-sm font-black transition-all ${state.style === preset ? 'bg-indigo-600 text-white shadow-xl -translate-y-1' : 'bg-gray-50 text-gray-400 hover:text-indigo-600'}`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <input 
                  type="text" 
                  value={state.style} 
                  onChange={(e) => setState(prev => ({ ...prev, style: e.target.value }))}
                  placeholder="或自定義細節描述..."
                  className="w-full px-8 py-5 bg-gray-50 border-2 border-transparent rounded-[2.5rem] outline-none font-black text-xl focus:border-indigo-600 focus:bg-white shadow-inner"
                />
              </div>
              <button 
                onClick={handleGenerateCharacters}
                disabled={state.referenceImages.length === 0 || !hasKey}
                className={`w-full py-8 rounded-[3rem] font-black text-2xl shadow-2xl transition-all ${state.referenceImages.length === 0 || !hasKey ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'}`}
              >
                {!hasKey ? '請先完成金鑰授權' : '生成一致性基準角色'}
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
              <div key={char.id} className="cursor-pointer bg-white rounded-[3.5rem] overflow-hidden shadow-2xl border-8 border-transparent hover:border-indigo-600 transform transition-all hover:-translate-y-4" onClick={() => handleSelectCharacter(char)}>
                <img src={char.url} className="w-full aspect-square object-cover" />
                <div className="p-6 text-center font-black text-indigo-600 text-xl bg-indigo-50/30">選取此原型</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {state.step === GenerationStep.TextEntry && (
        <div className="bg-white p-12 rounded-[4rem] shadow-2xl border border-gray-100 animate-in slide-in-from-right-12 duration-700">
          <h2 className="text-3xl font-black mb-10 italic">貼圖規劃：標語與氛圍</h2>
          <div className="space-y-10">
            <div>
              <label className="block text-sm font-black text-gray-400 mb-4 uppercase tracking-widest">12 組標語 (轉化為繁體手寫文字)</label>
              <textarea 
                value={state.stickerText} 
                onChange={(e) => setState(prev => ({ ...prev, stickerText: e.target.value }))} 
                className="w-full p-8 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-[3rem] outline-none font-black text-2xl min-h-[180px] shadow-inner transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-black text-gray-400 mb-4 uppercase tracking-widest">表情包形容詞 (決定互動氛圍)</label>
              <input 
                type="text"
                value={state.stickerAdjectives} 
                onChange={(e) => setState(prev => ({ ...prev, stickerAdjectives: e.target.value }))} 
                placeholder="例如：誇張顏藝, 超級可愛, 搞怪幽默, 日系甜美..."
                className="w-full p-8 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-[2.5rem] outline-none font-black text-2xl shadow-inner transition-all"
              />
            </div>
            <button onClick={handleGenerateStickers} className="w-full py-8 bg-indigo-600 text-white rounded-[3.5rem] font-black text-3xl hover:bg-indigo-700 shadow-2xl active:scale-95 transition-all">
              鑄造 4x3 高清貼圖組合
            </button>
          </div>
        </div>
      )}

      {state.step === GenerationStep.FinalResult && state.finalGridUrl && (
        <div className="text-center animate-in zoom-in-50 duration-700">
          <h2 className="text-5xl font-black mb-10 italic text-indigo-900">鑄造成功！</h2>
          <div className="inline-block relative">
             <img src={state.finalGridUrl} className="max-w-full rounded-[4rem] shadow-2xl mb-12 border-[12px] border-white" alt="Final Stickers" />
          </div>
          <div className="flex flex-wrap gap-6 justify-center">
            <a href={state.finalGridUrl} download="pro-stickers-grid.png" className="px-14 py-7 bg-green-600 text-white rounded-[2.5rem] font-black text-2xl shadow-2xl hover:bg-green-700 transition-all hover:scale-105">下載貼圖包 (16:9)</a>
            <button onClick={() => window.location.reload()} className="px-14 py-7 bg-gray-200 text-gray-600 rounded-[2.5rem] font-black text-2xl hover:bg-gray-300 transition-all">開啟新計畫</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
