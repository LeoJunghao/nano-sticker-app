
import React, { useState, useEffect } from 'react';
import { GenerationStep, AppState, CharacterOption } from './types';
import { generateCharacterOptions, generateStickerGrid } from './services/geminiService';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    step: GenerationStep.KeySetup,
    referenceImages: [],
    style: "2D Q版擬真圖",
    characterOptions: [],
    selectedCharacter: null,
    stickerText: "早安, 謝謝, 辛苦了, 讚啦, 沒問題, 傻眼, 哭哭, 哈哈, 忙碌中, 想你, 拜託, 晚安",
    stickerAdjectives: "逗趣, 誇張表情, 充滿活力, 搞怪",
    finalGridUrl: null,
    isLoading: false,
    error: null,
  });

  const [isVerifying, setIsVerifying] = useState(false);

  // 監測是否已經有金鑰，如果有則自動進入
  useEffect(() => {
    const checkKey = async () => {
      // @ts-ignore
      if (window.aistudio && await window.aistudio.hasSelectedApiKey()) {
        setState(prev => ({ ...prev, step: GenerationStep.Upload }));
      }
    };
    checkKey();
  }, []);

  const handleOpenKeyDialog = async () => {
    // @ts-ignore
    if (window.aistudio) {
      try {
        setIsVerifying(true);
        // @ts-ignore
        await window.aistudio.openSelectKey();
        
        // 重要：根據規範，呼叫 openSelectKey 後應立即進入 App
        // 不要等待驗證，因為 hasSelectedApiKey 在此時可能還沒更新
        setState(prev => ({ 
          ...prev, 
          step: GenerationStep.Upload, 
          error: null 
        }));
      } catch (e) {
        setState(prev => ({ ...prev, error: "無法啟動金鑰選擇器，請檢查瀏覽器設定。" }));
      } finally {
        setIsVerifying(false);
      }
    } else {
      // 如果不在 AI Studio 環境（例如本地開發），直接進入 Upload 階段
      setState(prev => ({ ...prev, step: GenerationStep.Upload }));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const fileList = Array.from(files).slice(0, 5) as File[];
    const promises = fileList.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
    });
    Promise.all(promises).then(base64Images => {
      setState(prev => ({ ...prev, referenceImages: base64Images }));
    });
  };

  const handleGenerateCharacters = async () => {
    if (state.referenceImages.length === 0) return;
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const urls = await generateCharacterOptions(state.referenceImages, state.style);
      const options: CharacterOption[] = urls.map((url, idx) => ({ id: `char-${idx}`, url, base64: url }));
      setState(prev => ({ ...prev, characterOptions: options, step: GenerationStep.CharacterSelection, isLoading: false }));
    } catch (err: any) {
      console.error(err);
      if (err.message === "KEY_EXPIRED" || err.message.includes("not found")) {
        setState(prev => ({ 
          ...prev, 
          step: GenerationStep.KeySetup, 
          isLoading: false, 
          error: "API 金鑰無權限。請確保選取的是具備付費方案的 Google Cloud 專案金鑰。" 
        }));
      } else {
        setState(prev => ({ ...prev, error: "生成原型失敗，請確保您的金鑰可使用 Gemini 3 Pro 模型。", isLoading: false }));
      }
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
      if (err.message === "KEY_EXPIRED" || err.message.includes("not found")) {
        setState(prev => ({ ...prev, step: GenerationStep.KeySetup, isLoading: false, error: "金鑰已過期或權限不足。" }));
      } else {
        setState(prev => ({ ...prev, error: "貼圖生成失敗，模型回應異常", isLoading: false }));
      }
    }
  };

  // --- 渲染部分保持不變，但在 KeySetup 增加錯誤顯示 ---
  if (state.step === GenerationStep.KeySetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-100 p-6">
        <div className="max-w-lg w-full bg-white rounded-3xl shadow-2xl p-10 border border-white/50 backdrop-blur-sm">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-indigo-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-6">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h1 className="text-3xl font-black text-gray-900 mb-4">啟動 Nano Banana</h1>
            <p className="text-gray-500">請點擊下方按鈕選取您的 API 金鑰以繼續。系統將使用 Gemini 3 Pro 進行創作。</p>
          </div>

          {state.error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8 rounded-r-xl">
              <p className="text-red-700 text-sm font-bold">{state.error}</p>
            </div>
          )}

          <div className="space-y-4">
            <button 
              onClick={handleOpenKeyDialog}
              disabled={isVerifying}
              className={`w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all transform active:scale-95 flex items-center justify-center gap-3 bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-200`}
            >
              {isVerifying ? '啟動中...' : '啟動並選取 API 金鑰'}
            </button>
            <div className="text-center">
              <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-indigo-600 hover:text-indigo-800 text-sm font-bold underline">
                如何獲取付費專案金鑰？
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ... 剩餘的渲染代碼與之前相同 ...
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <header className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Nano Banana <span className="text-indigo-600">LINE Sticker Agent</span></h1>
          <p className="text-gray-500">基於 Gemini 3 Pro 的一致性貼圖生成器</p>
        </div>
        <button 
          onClick={handleOpenKeyDialog}
          className="px-4 py-2 bg-white border-2 border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:border-indigo-200 hover:text-indigo-600 transition-colors"
        >
          切換金鑰
        </button>
      </header>

      {state.error && (
        <div className="mb-8 bg-red-100 border border-red-200 text-red-700 px-6 py-4 rounded-2xl font-bold">
          {state.error}
        </div>
      )}

      {state.isLoading && (
        <div className="fixed inset-0 bg-indigo-900/10 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-white rounded-3xl shadow-2xl flex items-center justify-center mb-6 animate-bounce">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 className="text-indigo-900 font-black text-2xl mb-2">正在與 Gemini 協作中...</h3>
          <p className="text-indigo-800 opacity-70">正在鑄造一致性角色與生成貼圖網格，請保持頁面開啟。</p>
        </div>
      )}

      {state.step === GenerationStep.Upload && (
        <div className="bg-white p-10 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100">
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-2">第一步：定義你的角色</h2>
            <p className="text-gray-500 text-sm">上傳 1-5 張角色的參考照片，AI 將學習其外觀特徵。</p>
          </div>
          <label className="block w-full border-4 border-dashed border-indigo-50 rounded-2xl p-16 text-center cursor-pointer mb-8 hover:bg-indigo-50/50 transition-colors group">
            <input type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" />
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            </div>
            <p className="text-indigo-600 font-bold text-lg">{state.referenceImages.length > 0 ? `已選取 ${state.referenceImages.length} 張圖片` : '點擊或拖放圖片至此'}</p>
          </label>
          <div className="mb-8">
            <label className="block text-sm font-black text-gray-700 mb-2 uppercase tracking-wider">風格描述</label>
            <input 
              type="text" 
              value={state.style} 
              onChange={(e) => setState(prev => ({ ...prev, style: e.target.value }))}
              className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 focus:border-indigo-600 rounded-2xl outline-none transition-all font-bold"
              placeholder="例如：2D Q版擬真圖, 水彩插畫風, 3D 渲染立體風..."
            />
          </div>
          <button 
            onClick={handleGenerateCharacters}
            disabled={state.referenceImages.length === 0}
            className={`w-full py-5 rounded-2xl font-black text-xl shadow-lg transition-all ${
              state.referenceImages.length === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'
            }`}
          >
            鑄造角色原型
          </button>
        </div>
      )}

      {state.step === GenerationStep.CharacterSelection && (
        <div>
          <div className="text-center mb-10">
            <h2 className="text-2xl font-black mb-2">選取最滿意的原型</h2>
            <p className="text-gray-500">選取一個做為貼圖包的基準角色。</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {state.characterOptions.map((char) => (
              <div 
                key={char.id} 
                className="group cursor-pointer bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all border-4 border-transparent hover:border-indigo-600 transform hover:-translate-y-2" 
                onClick={() => handleSelectCharacter(char)}
              >
                <img src={char.url} className="w-full aspect-square object-cover" />
                <div className="p-4 text-center font-bold text-indigo-600 bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  選擇此原型
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {state.step === GenerationStep.TextEntry && (
        <div className="bg-white p-10 rounded-3xl shadow-xl border border-gray-100">
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-2">設定貼圖包細節</h2>
            <p className="text-gray-500 text-sm">編輯貼圖文字與整體的表情氛圍。</p>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-black text-gray-700 mb-2 uppercase tracking-wider">貼圖文字內容 (逗號分隔)</label>
              <textarea 
                value={state.stickerText} 
                onChange={(e) => setState(prev => ({ ...prev, stickerText: e.target.value }))} 
                className="w-full p-6 bg-gray-50 border-2 border-gray-100 focus:border-indigo-600 rounded-2xl outline-none transition-all font-bold min-h-[120px]"
              />
            </div>
            <div>
              <label className="block text-sm font-black text-gray-700 mb-2 uppercase tracking-wider">表情與氛圍形容詞</label>
              <textarea 
                value={state.stickerAdjectives} 
                onChange={(e) => setState(prev => ({ ...prev, stickerAdjectives: e.target.value }))} 
                className="w-full p-6 bg-gray-50 border-2 border-gray-100 focus:border-indigo-600 rounded-2xl outline-none transition-all font-bold" 
                rows={2}
                placeholder="例如：誇張、呆萌、愛生氣、超級熱情..."
              />
            </div>
            <button 
              onClick={handleGenerateStickers} 
              className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95"
            >
              開始繪製 4x3 貼圖網格
            </button>
          </div>
        </div>
      )}

      {state.step === GenerationStep.FinalResult && state.finalGridUrl && (
        <div className="text-center">
          <div className="bg-white p-4 rounded-3xl shadow-2xl inline-block mb-10 overflow-hidden border border-gray-100">
            <img src={state.finalGridUrl} className="max-w-full rounded-2xl" />
          </div>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <a 
              href={state.finalGridUrl} 
              download="nano-stickers.png" 
              className="px-12 py-5 bg-green-600 text-white rounded-2xl font-black text-xl hover:bg-green-700 shadow-lg shadow-green-100 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              下載貼圖組合圖
            </a>
            <button 
              onClick={() => setState(prev => ({ ...prev, step: GenerationStep.Upload, finalGridUrl: null }))} 
              className="px-12 py-5 bg-gray-200 text-gray-700 rounded-2xl font-black text-xl hover:bg-gray-300 transition-all"
            >
              重新製作
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
