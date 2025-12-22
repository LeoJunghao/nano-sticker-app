
import React, { useState, useEffect } from 'react';
import { GenerationStep, AppState, CharacterOption } from './types';
import { generateCharacterOptions, generateStickerGrid } from './services/geminiService';

const App: React.FC = () => {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [state, setState] = useState<AppState>({
    step: GenerationStep.Upload,
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

  const styleSuggestions = [
    "超擬真彩色鉛筆素描風格",
    "Q版誇張諷刺畫（Caricature 美式漫畫畫風）",
    "2D Q版擬真圖",
    "3D Q版擬真圖"
  ];

  useEffect(() => {
    const checkKey = async () => {
      // @ts-ignore
      if (window.aistudio) {
        // @ts-ignore
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
      }
    };
    checkKey();
  }, []);

  const handleOpenKeyDialog = async () => {
    // @ts-ignore
    if (window.aistudio) {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      // 根據指令：觸發後直接假定成功以避免 race condition
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
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(promises).then(base64Images => {
      setState(prev => ({ ...prev, referenceImages: base64Images }));
    });
  };

  const handleGenerateCharacters = async () => {
    if (state.referenceImages.length === 0) {
      setState(prev => ({ ...prev, error: "請先上傳至少一張原圖" }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const urls = await generateCharacterOptions(state.referenceImages, state.style);
      const options: CharacterOption[] = urls.map((url, idx) => ({
        id: `char-${idx}`,
        url,
        base64: url
      }));
      setState(prev => ({ 
        ...prev, 
        characterOptions: options, 
        step: GenerationStep.CharacterSelection,
        isLoading: false 
      }));
    } catch (err: any) {
      console.error(err);
      if (err.message === "KEY_NOT_FOUND" || err.message?.includes("entity was not found")) {
        setHasKey(false);
        setState(prev => ({ ...prev, isLoading: false, error: "API 金鑰無效或未選取，請重新設定。" }));
      } else {
        setState(prev => ({ ...prev, error: "生成角色失敗，請檢查金鑰是否有餘額或網路狀態", isLoading: false }));
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
      setState(prev => ({ 
        ...prev, 
        finalGridUrl: gridUrl, 
        step: GenerationStep.FinalResult,
        isLoading: false 
      }));
    } catch (err: any) {
      if (err.message === "KEY_NOT_FOUND" || err.message?.includes("entity was not found")) {
        setHasKey(false);
        setState(prev => ({ ...prev, isLoading: false, error: "金鑰失效，請重新選取付費專案金鑰。" }));
      } else {
        setState(prev => ({ ...prev, error: "生成貼圖失敗，可能是 Token 限制或網路問題", isLoading: false }));
      }
    }
  };

  const goBack = () => {
    if (state.step > GenerationStep.Upload) {
      setState(prev => ({ ...prev, step: prev.step - 1, error: null }));
    }
  };

  const reset = () => {
    setState({
      step: GenerationStep.Upload,
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
  };

  if (hasKey === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center border border-indigo-50">
          <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">需要 Gemini 3 Pro 權限</h2>
          <p className="text-gray-600 mb-4 leading-relaxed text-sm">
            本應用程式使用高階 <b>Gemini 3 Pro Image</b> 模型。
          </p>
          <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl mb-8 text-left">
            <p className="text-xs text-amber-800 font-medium mb-2">💡 重要事項：</p>
            <p className="text-xs text-amber-700 leading-relaxed">
              您必須從具備結算功能的付費 GCP 專案選取 API 金鑰。詳細請參考 
              <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline font-bold ml-1">帳單文件</a>。
            </p>
          </div>
          <button 
            onClick={handleOpenKeyDialog}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:bg-indigo-700 transition-all active:scale-95"
          >
            設定並選取 API 金鑰
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <header className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-indigo-600 mb-2">Nano Banana LINE 貼圖代理</h1>
        <div className="flex items-center justify-center gap-2">
          <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">Gemini 3 Pro Image</span>
          <p className="text-gray-600">一致性角色與表情包生成</p>
        </div>
      </header>

      {/* Progress Stepper */}
      <div className="flex justify-between items-center mb-12 px-4 relative">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 -z-10 transform -translate-y-1/2"></div>
        {[1, 2, 3, 4].map((s) => (
          <div 
            key={s} 
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
              state.step >= s ? 'bg-indigo-600 text-white scale-110 shadow-lg' : 'bg-gray-200 text-gray-500'
            }`}
          >
            {s}
          </div>
        ))}
      </div>

      {state.error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded shadow-sm">
          <p className="text-red-700 font-medium">{state.error}</p>
        </div>
      )}

      {state.isLoading && (
        <div className="fixed inset-0 bg-white bg-opacity-90 z-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="relative w-24 h-24 mb-6">
            <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-indigo-600 font-bold text-2xl mb-2">Gemini 3 Pro 正在生成中...</p>
          <p className="text-gray-500 max-w-sm">正在精心鑄造角色表情與文字，預計需時 30-60 秒，請勿關閉視窗。</p>
        </div>
      )}

      {/* Step 1: Upload & Style */}
      {state.step === GenerationStep.Upload && (
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 animate-fadeIn">
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            <span className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded-full inline-flex items-center justify-center mr-3 text-sm">1</span>
            上傳原圖 (1~5張)
          </h2>
          <div className="mb-8">
            <label className="block w-full border-2 border-dashed border-indigo-200 rounded-xl p-12 text-center cursor-pointer hover:border-indigo-400 transition-colors bg-indigo-50/30 group">
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                onChange={handleFileUpload} 
                className="hidden" 
              />
              <div className="flex flex-col items-center">
                <svg className="w-12 h-12 text-indigo-400 group-hover:scale-110 transition-transform mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-indigo-600 font-medium font-bold">點擊或拖放圖片</p>
                <p className="text-gray-400 text-sm mt-1">上傳角色的參考照片，用於鑄造一致性角色</p>
              </div>
            </label>
            {state.referenceImages.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-4">
                {state.referenceImages.map((img, i) => (
                  <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-indigo-100 shadow-sm">
                    <img src={img} alt="Ref" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <h2 className="text-2xl font-bold mb-6 flex items-center">
            <span className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded-full inline-flex items-center justify-center mr-3 text-sm">2</span>
            輸入圖片風格
          </h2>
          <div className="mb-8">
            <input 
              type="text" 
              value={state.style}
              onChange={(e) => setState(prev => ({ ...prev, style: e.target.value }))}
              placeholder="請輸入或選擇下方風格..."
              className="w-full px-4 py-4 border-2 border-black rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all bg-white text-black font-bold text-lg"
            />
            
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-2 font-bold uppercase tracking-wider">風格推薦：</p>
              <div className="flex flex-wrap gap-2">
                {styleSuggestions.map((hint) => (
                  <button
                    key={hint}
                    type="button"
                    onClick={() => setState(prev => ({ ...prev, style: hint }))}
                    className={`text-xs px-3 py-1.5 rounded-full border-2 transition-all shadow-sm ${
                      state.style === hint 
                        ? 'bg-black border-black text-white font-bold' 
                        : 'bg-white border-black text-black hover:bg-gray-100'
                    }`}
                  >
                    + {hint}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button 
            onClick={handleGenerateCharacters}
            disabled={state.referenceImages.length === 0}
            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all ${
              state.referenceImages.length === 0 
                ? 'bg-gray-300 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-200 active:scale-[0.98]'
            }`}
          >
            生成角色原型
          </button>
        </div>
      )}

      {/* Step 2: Character Selection */}
      {state.step === GenerationStep.CharacterSelection && (
        <div className="animate-slideIn">
          <div className="flex justify-between items-center mb-8">
            <button 
              onClick={goBack}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-full font-bold hover:bg-gray-300 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              回到上一頁
            </button>
            <h2 className="text-2xl font-bold text-gray-800">請選擇一個角色原型</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {state.characterOptions.map((char) => (
              <div 
                key={char.id} 
                className="group cursor-pointer bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all border-4 border-transparent hover:border-indigo-400"
                onClick={() => handleSelectCharacter(char)}
              >
                <div className="aspect-square bg-gray-50 overflow-hidden">
                  <img src={char.url} alt="Option" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                </div>
                <div className="p-4 text-center">
                  <span className="inline-block px-6 py-2 bg-indigo-50 text-indigo-600 rounded-full font-bold group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    選擇此原型
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Text & Adjective Entry */}
      {state.step === GenerationStep.TextEntry && (
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 animate-slideIn">
          <div className="flex justify-between items-center mb-6">
            <button 
              onClick={goBack}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-full font-bold hover:bg-gray-300 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              回到上一頁
            </button>
            <h2 className="text-2xl font-bold text-gray-800">配置貼圖內容</h2>
          </div>

          <div className="space-y-8">
            <div>
              <label className="block text-gray-700 mb-2 font-bold text-lg">表情包文案 (建議 12 個短語)</label>
              <textarea 
                rows={3}
                value={state.stickerText}
                onChange={(e) => setState(prev => ({ ...prev, stickerText: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-black rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all bg-white text-black font-bold"
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2 font-bold text-lg">表情包形容詞 / 表情描述</label>
              <textarea 
                rows={2}
                value={state.stickerAdjectives}
                onChange={(e) => setState(prev => ({ ...prev, stickerAdjectives: e.target.value }))}
                placeholder="例如：驚訝, 撒嬌, 大哭, 生氣..."
                className="w-full px-4 py-3 border-2 border-black rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all bg-white text-black font-bold"
              />
              <p className="text-gray-400 text-sm mt-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                💡 形容詞將決定角色的表情細節。Gemini 3 Pro 會根據這些詞彙與文案產生具備情緒的貼圖。
              </p>
            </div>
          </div>

          <button 
            onClick={handleGenerateStickers}
            className="w-full mt-10 py-4 bg-indigo-600 rounded-xl font-bold text-white shadow-lg hover:bg-indigo-700 transition-all active:scale-[0.98]"
          >
            開始鑄造 4x3 貼圖組合
          </button>
        </div>
      )}

      {/* Step 4: Final Result */}
      {state.step === GenerationStep.FinalResult && state.finalGridUrl && (
        <div className="animate-fadeIn">
          <div className="flex justify-between items-center mb-6">
            <button 
              onClick={goBack}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-full font-bold hover:bg-gray-300 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              回到上一頁
            </button>
            <h2 className="text-2xl font-bold text-gray-800">生成結果</h2>
          </div>

          <div className="bg-white p-3 rounded-2xl shadow-2xl border border-gray-100 overflow-hidden mb-8">
            <div className="relative group">
               <img src={state.finalGridUrl} alt="Final Stickers" className="w-full h-auto rounded-xl" />
               <div className="absolute top-4 right-4 bg-white/80 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-indigo-600 shadow-sm border border-indigo-100">
                 16:9 品質產出
               </div>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <a 
              href={state.finalGridUrl} 
              download="nano-banana-sticker-sheet.png"
              className="px-10 py-4 bg-green-600 text-white rounded-xl font-bold shadow-lg hover:bg-green-700 transition-all text-center flex items-center justify-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              下載貼圖組合
            </a>
            <button 
              onClick={reset}
              className="px-10 py-4 bg-indigo-100 text-indigo-700 rounded-xl font-bold hover:bg-indigo-200 transition-all text-center"
            >
              重新開始
            </button>
          </div>
        </div>
      )}

      <footer className="mt-20 text-center pb-12">
        <p className="text-gray-400 text-sm">Powered by Gemini 3 Pro Image</p>
        <button 
          // @ts-ignore
          onClick={() => window.aistudio.openSelectKey()} 
          className="mt-4 text-indigo-400 hover:text-indigo-600 text-xs font-medium"
        >
          更換 API 金鑰
        </button>
      </footer>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.8s ease-out; }
        .animate-slideIn { animation: slideIn 0.6s ease-out; }
      `}</style>
    </div>
  );
};

export default App;
