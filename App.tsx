
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
      if (process.env.API_KEY && process.env.API_KEY.length > 10) {
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
    const timer = setInterval(checkKey, 3000);
    return () => clearInterval(timer);
  }, []);

  const handleApplyManualKey = () => {
    const key = manualKey.trim();
    if (key.length > 10) {
      (window as any).process.env.API_KEY = key;
      setHasKey(true);
      setState(prev => ({ ...prev, error: null }));
    } else {
      setState(prev => ({ ...prev, error: "金鑰長度不正確。" }));
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
      const currentStep = prev.step;
      let nextStep = currentStep;
      if (currentStep === GenerationStep.CharacterSelection) nextStep = GenerationStep.Upload;
      else if (currentStep === GenerationStep.TextEntry) nextStep = GenerationStep.CharacterSelection;
      else if (currentStep === GenerationStep.FinalResult) nextStep = GenerationStep.TextEntry;
      return { ...prev, step: nextStep };
    });
  };

  const handleGenerateCharacters = async () => {
    if (!hasKey) {
      setState(prev => ({ ...prev, error: "請先輸入 API Key。" }));
      return; 
    }
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const urls = await generateCharacterOptions(state.referenceImages, state.style);
      const options: CharacterOption[] = urls.map((url, idx) => ({ id: `char-${idx}`, url, base64: url }));
      setState(prev => ({ ...prev, characterOptions: options, step: GenerationStep.CharacterSelection, isLoading: false }));
    } catch (err: any) {
      const errorMsg = err.message || "未知錯誤";
      setState(prev => ({ ...prev, error: `生成失敗：${errorMsg}`, isLoading: false }));
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
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Nano Banana <span className="text-indigo-600">Pro</span></h1>
          <p className="text-gray-500 font-medium mt-1 text-lg">旗艦版一致性貼圖代理</p>
        </div>
        
        <div className={`bg-white p-4 rounded-3xl shadow-xl border-2 transition-all ${hasKey ? 'border-green-100' : 'border-indigo-100'} flex flex-col sm:flex-row items-center gap-4 min-w-[320px]`}>
          <div className="flex flex-col flex-1 w-full">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-3 h-3 rounded-full ${hasKey ? 'bg-green-500' : 'bg-red-400'}`}></div>
              <span className="text-sm font-black text-gray-700">{hasKey ? 'API 已連線' : '尚未輸入金鑰'}</span>
            </div>
            {!hasKey && (
              <div className="flex gap-2">
                <input 
                  type="password"
                  placeholder="在此貼上 API Key..."
                  value={manualKey}
                  onChange={(e) => setManualKey(e.target.value)}
                  className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs font-mono outline-none w-full"
                />
                <button onClick={handleApplyManualKey} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-black">套用</button>
              </div>
            )}
            {hasKey && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-400">安全性狀態：用戶端儲存</span>
                <button onClick={() => { setHasKey(false); (window as any).process.env.API_KEY = ""; }} className="text-[10px] text-red-400 font-bold">清除</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {state.error && (
        <div className="mb-8 bg-red-50 border-l-8 border-red-500 p-6 rounded-r-3xl flex items-center gap-4">
          <p className="text-red-700 font-black">{state.error}</p>
          <button onClick={() => setState(prev => ({ ...prev, error: null }))} className="ml-auto text-red-300">✕</button>
        </div>
      )}

      {state.isLoading && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-2xl z-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-6"></div>
          <h3 className="text-2xl font-black mb-2">正在與 Nano Banana 通訊中...</h3>
          <p className="text-gray-500 font-bold">旗艦影像生成中，請稍候約 15-30 秒。</p>
        </div>
      )}

      {/* 回到上一頁按鈕 (僅在非第一步時顯示) */}
      {state.step !== GenerationStep.Upload && !state.isLoading && (
        <button 
          onClick={handleGoBack}
          className="mb-6 flex items-center gap-2 text-indigo-600 font-black hover:bg-indigo-50 px-4 py-2 rounded-xl transition-all"
        >
          <span className="text-xl">←</span> 回到上一頁
        </button>
      )}

      {state.step === GenerationStep.Upload && (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
          <section className="bg-white p-10 rounded-[3rem] shadow-2xl border border-gray-100">
            <h2 className="text-2xl font-black mb-8 flex items-center gap-4">
               <span className="bg-indigo-600 text-white w-8 h-8 rounded-xl flex items-center justify-center text-sm shadow-md">1</span>
               上傳角色參考
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-10">
              {state.referenceImages.map((img, idx) => (
                <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border shadow-sm group">
                  <img src={img} className="w-full h-full object-cover" />
                  <button onClick={() => setState(prev => ({ ...prev, referenceImages: prev.referenceImages.filter((_, i) => i !== idx)}))} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                </div>
              ))}
              {state.referenceImages.length < 5 && (
                <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-indigo-100 rounded-2xl bg-indigo-50/10 cursor-pointer hover:bg-indigo-50 transition-all">
                  <input type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" />
                  <span className="text-2xl text-indigo-300">+</span>
                </label>
              )}
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-black text-gray-400 mb-3 uppercase tracking-wider">風格快捷鍵</label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {STYLE_PRESETS.map(preset => (
                    <button 
                      key={preset}
                      type="button"
                      onClick={() => setState(prev => ({ ...prev, style: preset }))}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${state.style === preset ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-50 text-gray-400 hover:text-indigo-600'}`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <input 
                  type="text" 
                  value={state.style} 
                  onChange={(e) => setState(prev => ({ ...prev, style: e.target.value }))}
                  className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none font-black text-lg focus:border-indigo-600"
                />
              </div>
              <button 
                onClick={handleGenerateCharacters}
                disabled={state.referenceImages.length === 0 || !hasKey}
                className={`w-full py-6 rounded-[2rem] font-black text-xl shadow-xl transition-all ${state.referenceImages.length === 0 || !hasKey ? 'bg-gray-100 text-gray-300' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
              >
                生成一致性角色原型
              </button>
            </div>
          </section>
        </div>
      )}

      {state.step === GenerationStep.CharacterSelection && (
        <div className="animate-in zoom-in duration-500">
          <h2 className="text-3xl font-black mb-8 text-center">選取您的基準角色</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {state.characterOptions.map((char) => (
              <div key={char.id} className="cursor-pointer bg-white rounded-[2.5rem] overflow-hidden shadow-xl border-4 border-transparent hover:border-indigo-600 transition-all" onClick={() => handleSelectCharacter(char)}>
                <img src={char.url} className="w-full aspect-square object-cover" />
                <div className="p-4 text-center font-black text-indigo-600">以此為基準製作貼圖</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {state.step === GenerationStep.TextEntry && (
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-gray-100 animate-in slide-in-from-right-12 duration-700">
          <h2 className="text-2xl font-black mb-10">2. 規劃貼圖語境與標語</h2>
          <div className="space-y-8">
            <div>
              <label className="block text-sm font-black text-gray-400 mb-3 uppercase">12 組貼圖標語 (請用逗號分隔)</label>
              <textarea 
                value={state.stickerText} 
                onChange={(e) => setState(prev => ({ ...prev, stickerText: e.target.value }))} 
                className="w-full p-6 bg-gray-50 border-2 border-gray-100 focus:border-indigo-600 rounded-3xl outline-none font-black text-xl min-h-[120px]"
              />
            </div>
            <div>
              <label className="block text-sm font-black text-gray-400 mb-3 uppercase">表情包形容詞 (影響整體氛圍)</label>
              <input 
                type="text"
                value={state.stickerAdjectives} 
                onChange={(e) => setState(prev => ({ ...prev, stickerAdjectives: e.target.value }))} 
                placeholder="例如：誇張表情, 幽默, 少女心..."
                className="w-full p-6 bg-gray-50 border-2 border-gray-100 focus:border-indigo-600 rounded-3xl outline-none font-black text-xl"
              />
            </div>
            <button onClick={handleGenerateStickers} className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-2xl hover:bg-indigo-700 shadow-2xl transition-all">
              生成 4x3 貼圖表情包
            </button>
          </div>
        </div>
      )}

      {state.step === GenerationStep.FinalResult && state.finalGridUrl && (
        <div className="text-center animate-in zoom-in-50 duration-700">
          <h2 className="text-4xl font-black mb-8">貼圖組合鑄造成功！</h2>
          <img src={state.finalGridUrl} className="max-w-full rounded-[2.5rem] shadow-2xl mb-10 mx-auto border-8 border-white" alt="Final Stickers" />
          <div className="flex flex-wrap gap-4 justify-center">
            <a href={state.finalGridUrl} download="sticker-grid.png" className="px-8 py-5 bg-green-600 text-white rounded-2xl font-black text-xl shadow-lg hover:bg-green-700 transition-all">下載表情包圖檔</a>
            <button onClick={() => window.location.reload()} className="px-8 py-5 bg-gray-100 text-gray-600 rounded-2xl font-black text-xl hover:bg-gray-200">製作新角色</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
