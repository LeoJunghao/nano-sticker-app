
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

  // 定期檢查金鑰狀態
  useEffect(() => {
    const checkKey = async () => {
      // @ts-ignore
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        // @ts-ignore
        const isSelected = await window.aistudio.hasSelectedApiKey();
        setHasKey(isSelected);
      }
    };
    checkKey();
    const timer = setInterval(checkKey, 2000);
    return () => clearInterval(timer);
  }, []);

  const handleOpenKeyDialog = async () => {
    // @ts-ignore
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      try {
        // @ts-ignore
        await window.aistudio.openSelectKey();
        setHasKey(true);
      } catch (e) {
        console.error("Failed to open key dialog", e);
      }
    } else {
      alert("請在 Google AI Studio 環境中運行，或檢查瀏覽器擴充功能是否正確注入 aistudio 介面。");
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
      await handleOpenKeyDialog();
      return; 
    }

    if (state.referenceImages.length === 0) {
      setState(prev => ({ ...prev, error: "請先上傳至少一張角色照片。" }));
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
        error: "生成失敗。請確保您選取的是「付費專案」金鑰並具備 Gemini 3 Pro 權限。", 
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
      setState(prev => ({ ...prev, error: "繪製貼圖網格失敗，請檢查 API 額度。", isLoading: false }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-20">
      {/* 整合在首頁頂端的金鑰狀態區塊 */}
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Nano Banana <span className="text-indigo-600">Sticker Agent</span></h1>
          <p className="text-gray-500 font-medium mt-1 text-lg">LINE 一致性角色貼圖鑄造代理</p>
        </div>
        
        <div className="bg-white p-4 rounded-3xl shadow-lg border border-indigo-50 flex items-center gap-4 min-w-[280px]">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-3 h-3 rounded-full ${hasKey ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`}></div>
              <span className="text-sm font-black text-gray-700">{hasKey ? 'API 金鑰已備妥' : '尚未設定金鑰'}</span>
            </div>
            <p className="text-xs text-gray-400 font-medium">需要付費專案權限</p>
          </div>
          <button 
            onClick={handleOpenKeyDialog}
            className={`ml-auto px-5 py-2.5 rounded-2xl text-sm font-black transition-all transform active:scale-95 ${
              hasKey 
              ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' 
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200'
            }`}
          >
            {hasKey ? '切換金鑰' : '立即設定'}
          </button>
        </div>
      </header>

      {state.error && (
        <div className="mb-8 bg-red-50 border-l-4 border-red-500 p-5 rounded-r-2xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            <p className="text-red-700 font-black">{state.error}</p>
          </div>
          <button onClick={() => setState(prev => ({ ...prev, error: null }))} className="text-red-400 hover:text-red-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {state.isLoading && (
        <div className="fixed inset-0 bg-white/90 backdrop-blur-xl z-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-24 h-24 bg-indigo-600 rounded-[2rem] shadow-2xl flex items-center justify-center mb-8 animate-bounce">
            <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 className="text-gray-900 font-black text-3xl mb-4 tracking-tight">Gemini 正在大顯身手...</h3>
          <p className="text-gray-500 max-w-sm mx-auto font-medium">鑄造一致性角色圖像需要精密計算，預計耗時 15-30 秒。</p>
        </div>
      )}

      {state.step === GenerationStep.Upload && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <section className="bg-white p-8 md:p-12 rounded-[3rem] shadow-2xl shadow-indigo-100/50 border border-gray-100">
            <div className="mb-10">
              <h2 className="text-2xl font-black text-gray-900 mb-3 flex items-center gap-3">
                <span className="bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
                定義角色外觀
              </h2>
              <p className="text-gray-500 font-medium ml-11">請上傳 1-5 張照片。越清楚的照片，AI 捕捉的特徵越準確。</p>
            </div>

            {/* 預覽與上傳區塊 */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-10 ml-11">
              {state.referenceImages.map((img, idx) => (
                <div key={idx} className="relative group aspect-square rounded-2xl overflow-hidden border-2 border-gray-100 shadow-sm transition-transform hover:scale-105">
                  <img src={img} className="w-full h-full object-cover" />
                  <button 
                    onClick={() => removeImage(idx)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
              {state.referenceImages.length < 5 && (
                <label className="flex flex-col items-center justify-center aspect-square border-4 border-dashed border-indigo-50 rounded-2xl bg-indigo-50/20 cursor-pointer hover:bg-indigo-50 transition-all group">
                  <input type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" />
                  <svg className="w-8 h-8 text-indigo-300 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                </label>
              )}
            </div>

            <div className="space-y-8 ml-11">
              <div>
                <label className="block text-sm font-black text-gray-700 mb-4 uppercase tracking-[0.2em]">鑄造風格設定</label>
                <input 
                  type="text" 
                  value={state.style} 
                  onChange={(e) => setState(prev => ({ ...prev, style: e.target.value }))}
                  className="w-full px-8 py-5 bg-gray-50 border-2 border-gray-100 focus:border-indigo-600 rounded-[1.5rem] outline-none font-bold text-lg mb-4 transition-all"
                  placeholder="請輸入或選擇下方預設風格..."
                />
                <div className="flex flex-wrap gap-2">
                  {STYLE_PRESETS.map(preset => (
                    <button 
                      key={preset}
                      onClick={() => setState(prev => ({ ...prev, style: preset }))}
                      className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${
                        state.style === preset 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-105' 
                        : 'bg-white border-2 border-gray-100 text-gray-400 hover:border-indigo-300 hover:text-indigo-600'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={handleGenerateCharacters}
                className={`w-full py-6 rounded-[2rem] font-black text-2xl shadow-2xl transition-all transform active:scale-95 flex items-center justify-center gap-3 ${
                  state.referenceImages.length === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {!hasKey && <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>}
                {hasKey ? '開始鑄造角色原型' : '請先設定 API 金鑰'}
              </button>
            </div>
          </section>
        </div>
      )}

      {state.step === GenerationStep.CharacterSelection && (
        <div className="animate-in fade-in duration-700">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black mb-4">選取最喜歡的原型</h2>
            <p className="text-gray-500 font-medium text-lg">AI 已根據特徵生成三個原型，請選定一個作為整套貼圖的基準。</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {state.characterOptions.map((char) => (
              <div 
                key={char.id} 
                className="group cursor-pointer bg-white rounded-[3rem] overflow-hidden shadow-xl hover:shadow-2xl transition-all border-4 border-transparent hover:border-indigo-600 transform hover:-translate-y-3" 
                onClick={() => handleSelectCharacter(char)}
              >
                <div className="aspect-square relative">
                  <img src={char.url} className="w-full h-full object-cover" alt="Prototype Option" />
                  <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/10 transition-colors flex items-center justify-center">
                    <div className="bg-white/90 px-6 py-3 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity font-black text-indigo-600">
                      點擊選定
                    </div>
                  </div>
                </div>
                <div className="p-6 text-center font-black text-indigo-600 bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white transition-colors text-xl">
                  以此角色開發
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {state.step === GenerationStep.TextEntry && (
        <div className="bg-white p-10 md:p-14 rounded-[3.5rem] shadow-2xl border border-gray-100 animate-in slide-in-from-right-8 duration-500">
          <div className="mb-12">
            <h2 className="text-3xl font-black text-gray-900 mb-4 flex items-center gap-4">
               <span className="bg-indigo-600 text-white w-10 h-10 rounded-full flex items-center justify-center text-base">2</span>
               規劃貼圖包詳情
            </h2>
            <p className="text-gray-500 font-medium ml-14 text-lg">最後一步：決定 12 張貼圖要寫什麼字，以及表情的風格。</p>
          </div>
          <div className="space-y-10 ml-14">
            <div>
              <label className="block text-sm font-black text-gray-700 mb-4 uppercase tracking-[0.2em]">貼圖標語 (12組，請用半形逗號分隔)</label>
              <textarea 
                value={state.stickerText} 
                onChange={(e) => setState(prev => ({ ...prev, stickerText: e.target.value }))} 
                className="w-full p-8 bg-gray-50 border-2 border-gray-100 focus:border-indigo-600 rounded-[2rem] outline-none font-bold text-lg min-h-[180px] transition-all"
                placeholder="例如：早安, 謝謝, 辛苦了, 讚啦..."
              />
              <p className="mt-4 text-sm text-indigo-400 font-black px-2 flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                AI 將自動把文字手寫在貼圖內，維持手感溫度。
              </p>
            </div>
            <div>
              <label className="block text-sm font-black text-gray-700 mb-4 uppercase tracking-[0.2em]">動態表情氛圍</label>
              <input 
                value={state.stickerAdjectives} 
                onChange={(e) => setState(prev => ({ ...prev, stickerAdjectives: e.target.value }))} 
                className="w-full px-8 py-6 bg-gray-50 border-2 border-gray-100 focus:border-indigo-600 rounded-[1.5rem] outline-none font-bold text-xl transition-all" 
                placeholder="例如：誇張搞笑、超萌欠扁、溫馨可愛..."
              />
            </div>
            <button 
              onClick={handleGenerateStickers} 
              className="w-full py-7 bg-indigo-600 text-white rounded-[2.5rem] font-black text-2xl hover:bg-indigo-700 shadow-2xl shadow-indigo-100 transition-all active:scale-95"
            >
              繪製 4x3 貼圖網格
            </button>
          </div>
        </div>
      )}

      {state.step === GenerationStep.FinalResult && state.finalGridUrl && (
        <div className="text-center animate-in zoom-in duration-700">
          <div className="mb-12">
            <h2 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">專屬貼圖製作完成！</h2>
            <p className="text-gray-500 font-medium text-lg">這是您的 12 張貼圖組合圖，下載後可去背並上傳至 LINE 控制台。</p>
          </div>
          
          <div className="bg-white p-8 rounded-[3.5rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.1)] inline-block mb-12 border border-gray-100 max-w-full">
            <img src={state.finalGridUrl} className="max-w-full rounded-2xl shadow-inner border border-gray-50" alt="Final Stickers" />
          </div>

          <div className="flex flex-col md:flex-row gap-6 justify-center max-w-2xl mx-auto">
            <a 
              href={state.finalGridUrl} 
              download="nano-banana-line-stickers.png" 
              className="flex-1 py-7 bg-green-600 text-white rounded-3xl font-black text-2xl hover:bg-green-700 shadow-2xl shadow-green-100 transition-all flex items-center justify-center gap-3"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              下載組合圖
            </a>
            <button 
              onClick={() => setState(prev => ({ ...prev, step: GenerationStep.Upload, finalGridUrl: null, referenceImages: [] }))} 
              className="flex-1 py-7 bg-gray-100 text-gray-700 rounded-3xl font-black text-2xl hover:bg-gray-200 transition-all"
            >
              製作新貼圖
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
