
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
      if (window.aistudio && await window.aistudio.hasSelectedApiKey()) {
        setHasKey(true);
      } else {
        setHasKey(false);
      }
    };
    checkKey();
    const timer = setInterval(checkKey, 2000);
    return () => clearInterval(timer);
  }, []);

  const handleOpenKeyDialog = async () => {
    // @ts-ignore
    if (window.aistudio) {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      setHasKey(true);
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
      setState(prev => ({ ...prev, referenceImages: [...prev.referenceImages, ...base64Images].slice(0, 5) }));
    });
  };

  const removeImage = (index: number) => {
    setState(prev => ({
      ...prev,
      referenceImages: prev.referenceImages.filter((_, i) => i !== index)
    }));
  };

  const handleGenerateCharacters = async () => {
    // 如果沒金鑰，先跳對話框
    if (!hasKey) {
      await handleOpenKeyDialog();
      return; 
    }

    if (state.referenceImages.length === 0) {
      setState(prev => ({ ...prev, error: "請至少上傳一張參考圖片。" }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const urls = await generateCharacterOptions(state.referenceImages, state.style);
      const options: CharacterOption[] = urls.map((url, idx) => ({ id: `char-${idx}`, url, base64: url }));
      setState(prev => ({ ...prev, characterOptions: options, step: GenerationStep.CharacterSelection, isLoading: false }));
    } catch (err: any) {
      console.error(err);
      setState(prev => ({ ...prev, error: "生成原型失敗。請確保您的金鑰屬於「付費專案」並具備 Gemini 3 Pro 權限。", isLoading: false }));
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
      setState(prev => ({ ...prev, error: "貼圖繪製失敗，請檢查 API 額度。", isLoading: false }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Nano Banana <span className="text-indigo-600">Sticker Agent</span></h1>
          <p className="text-gray-500 font-medium">使用 Gemini 3 Pro 鑄造一致性 LINE 貼圖</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-2 pr-4 rounded-2xl shadow-sm border border-gray-100">
          <div className={`w-3 h-3 rounded-full ${hasKey ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
          <span className="text-sm font-bold text-gray-600">{hasKey ? '金鑰已就緒' : '未選取金鑰'}</span>
          <button 
            onClick={handleOpenKeyDialog}
            className="ml-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-black hover:bg-indigo-100 transition-colors"
          >
            {hasKey ? '切換金鑰' : '立即設定'}
          </button>
        </div>
      </header>

      {state.error && (
        <div className="mb-8 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl flex items-center justify-between">
          <p className="text-red-700 text-sm font-bold">{state.error}</p>
          <button onClick={() => setState(prev => ({ ...prev, error: null }))} className="text-red-400 hover:text-red-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {state.isLoading && (
        <div className="fixed inset-0 bg-white/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-24 h-24 bg-indigo-600 rounded-3xl shadow-2xl flex items-center justify-center mb-8 animate-bounce">
            <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 className="text-gray-900 font-black text-3xl mb-4">Gemini 正在發揮創意...</h3>
          <p className="text-gray-500 max-w-sm mx-auto">正在分析特徵並鑄造一致性圖像，這通常需要 15-30 秒。</p>
        </div>
      )}

      {state.step === GenerationStep.Upload && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <section className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-xl shadow-indigo-100/50 border border-gray-100">
            <div className="mb-10">
              <h2 className="text-2xl font-black mb-3">1. 上傳角色參考圖</h2>
              <p className="text-gray-500 font-medium">上傳 1-5 張圖片（例如自拍、草稿），讓 AI 學習角色的長相。</p>
            </div>

            {/* 圖片預覽區域 */}
            {state.referenceImages.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
                {state.referenceImages.map((img, idx) => (
                  <div key={idx} className="relative group aspect-square rounded-2xl overflow-hidden border-2 border-gray-100 shadow-sm transition-transform hover:scale-105">
                    <img src={img} className="w-full h-full object-cover" />
                    <button 
                      onClick={() => removeImage(idx)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
                {state.referenceImages.length < 5 && (
                   <label className="flex items-center justify-center aspect-square border-2 border-dashed border-indigo-100 rounded-2xl bg-indigo-50/30 cursor-pointer hover:bg-indigo-50 transition-colors">
                      <input type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" />
                      <svg className="w-8 h-8 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                   </label>
                )}
              </div>
            )}

            {state.referenceImages.length === 0 && (
              <label className="block w-full border-4 border-dashed border-indigo-50 rounded-[2rem] p-16 text-center cursor-pointer mb-10 hover:bg-indigo-50/50 transition-all group">
                <input type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" />
                <div className="w-20 h-20 bg-indigo-100 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <p className="text-indigo-600 font-black text-xl mb-2">點擊或拖放上傳</p>
                <p className="text-gray-400 font-medium text-sm">支援 JPG, PNG，最多 5 張</p>
              </label>
            )}

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-black text-gray-700 mb-4 uppercase tracking-widest">選擇或輸入風格</label>
                <input 
                  type="text" 
                  value={state.style} 
                  onChange={(e) => setState(prev => ({ ...prev, style: e.target.value }))}
                  className="w-full px-8 py-5 bg-gray-50 border-2 border-gray-100 focus:border-indigo-600 rounded-2xl outline-none font-bold text-lg mb-4 transition-all"
                  placeholder="輸入自定義風格..."
                />
                <div className="flex flex-wrap gap-2">
                  {STYLE_PRESETS.map(preset => (
                    <button 
                      key={preset}
                      onClick={() => setState(prev => ({ ...prev, style: preset }))}
                      className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${state.style === preset ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white border-2 border-gray-100 text-gray-400 hover:border-indigo-200 hover:text-indigo-600'}`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={handleGenerateCharacters}
                className={`w-full py-6 rounded-2xl font-black text-2xl shadow-2xl transition-all transform active:scale-95 flex items-center justify-center gap-3 ${
                  state.referenceImages.length === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {!hasKey && <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>}
                {hasKey ? '開始鑄造角色原型' : '設定金鑰並開始'}
              </button>
            </div>
          </section>
        </div>
      )}

      {state.step === GenerationStep.CharacterSelection && (
        <div className="animate-in fade-in duration-700">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black mb-4">選取最滿意的原型</h2>
            <p className="text-gray-500 font-medium">選取一個原型，我們將以此開發整套貼圖包。</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {state.characterOptions.map((char) => (
              <div 
                key={char.id} 
                className="group cursor-pointer bg-white rounded-[2rem] overflow-hidden shadow-xl hover:shadow-2xl transition-all border-4 border-transparent hover:border-indigo-600 transform hover:-translate-y-3" 
                onClick={() => handleSelectCharacter(char)}
              >
                <div className="aspect-square relative">
                  <img src={char.url} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/10 transition-colors"></div>
                </div>
                <div className="p-6 text-center font-black text-indigo-600 bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white transition-colors text-lg">
                  選定此角色
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {state.step === GenerationStep.TextEntry && (
        <div className="bg-white p-10 md:p-14 rounded-[3rem] shadow-2xl border border-gray-100 animate-in slide-in-from-right-8 duration-500">
          <div className="mb-12">
            <h2 className="text-2xl font-black mb-4">2. 規劃貼圖語句</h2>
            <p className="text-gray-500 font-medium">最後一步：決定貼圖上的文字與氛圍。</p>
          </div>
          <div className="space-y-8">
            <div>
              <label className="block text-sm font-black text-gray-700 mb-4 uppercase tracking-widest">貼圖語句 (用半形逗號分隔)</label>
              <textarea 
                value={state.stickerText} 
                onChange={(e) => setState(prev => ({ ...prev, stickerText: e.target.value }))} 
                className="w-full p-8 bg-gray-50 border-2 border-gray-100 focus:border-indigo-600 rounded-3xl outline-none font-bold text-lg min-h-[160px] transition-all"
                placeholder="例如：早安, 晚安, 收到, 讚啦..."
              />
              <p className="mt-2 text-xs text-gray-400 font-bold px-2">提示：AI 將在每張貼圖上手寫這些文字</p>
            </div>
            <div>
              <label className="block text-sm font-black text-gray-700 mb-4 uppercase tracking-widest">角色表情氛圍</label>
              <input 
                value={state.stickerAdjectives} 
                onChange={(e) => setState(prev => ({ ...prev, stickerAdjectives: e.target.value }))} 
                className="w-full px-8 py-5 bg-gray-50 border-2 border-gray-100 focus:border-indigo-600 rounded-2xl outline-none font-bold text-lg transition-all" 
                placeholder="例如：誇張表情、超萌、很欠扁..."
              />
            </div>
            <button 
              onClick={handleGenerateStickers} 
              className="w-full py-6 bg-indigo-600 text-white rounded-3xl font-black text-2xl hover:bg-indigo-700 shadow-2xl shadow-indigo-100 transition-all active:scale-95"
            >
              繪製 4x3 貼圖組合圖
            </button>
          </div>
        </div>
      )}

      {state.step === GenerationStep.FinalResult && state.finalGridUrl && (
        <div className="text-center animate-in zoom-in duration-700">
          <div className="mb-10">
            <h2 className="text-3xl font-black mb-4">專屬貼圖製作完成！</h2>
            <p className="text-gray-500 font-medium">您可以下載此組合圖，並使用去背工具後上傳至 LINE Creators Market。</p>
          </div>
          
          <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl inline-block mb-12 border border-gray-100 max-w-full">
            <img src={state.finalGridUrl} className="max-w-full rounded-2xl shadow-inner border border-gray-50" alt="Final Stickers" />
          </div>

          <div className="flex flex-col md:flex-row gap-6 justify-center max-w-2xl mx-auto">
            <a 
              href={state.finalGridUrl} 
              download="nano-banana-stickers.png" 
              className="flex-1 py-6 bg-green-600 text-white rounded-2xl font-black text-2xl hover:bg-green-700 shadow-xl shadow-green-100 transition-all flex items-center justify-center gap-3"
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              下載貼圖組合
            </a>
            <button 
              onClick={() => setState(prev => ({ ...prev, step: GenerationStep.Upload, finalGridUrl: null, referenceImages: [] }))} 
              className="flex-1 py-6 bg-gray-200 text-gray-700 rounded-2xl font-black text-2xl hover:bg-gray-300 transition-all"
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
