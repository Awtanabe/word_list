'use client';

import { useState, useEffect, useCallback } from 'react';
import { parseWordsFromFile } from '@/lib/parseWords';
import { 
  getProgress, 
  updateWordStatus, 
  resetProgress, 
  initializeProgress 
} from '@/lib/storage';
import type { Word } from '@/lib/parseWords';
import type { WordProgress } from '@/lib/storage';

export default function Home() {
  const [words, setWords] = useState<Word[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);
  const [progress, setProgress] = useState<WordProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // クライアント側でデータを読み込む
    fetch('/api/words')
      .then(res => res.json())
      .then(data => {
        setWords(data);
        const wordIds = data.map((w: Word) => w.id);
        initializeProgress(wordIds);
        setProgress(getProgress());
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to load words:', err);
        setIsLoading(false);
      });
  }, []);

  const getUnansweredWords = useCallback(() => {
    const progressMap = new Map(progress.map(p => [p.wordId, p.status]));
    return words.filter(word => {
      const status = progressMap.get(word.id);
      return status === 'unknown' || status === 'ng' || !status;
    });
  }, [words, progress]);

  const unansweredWords = getUnansweredWords();
  const currentWord = unansweredWords[currentWordIndex];
  const totalWords = words.length;
  
  // 進捗統計を計算
  const progressMap = new Map(progress.map(p => [p.wordId, p.status]));
  const okCount = progress.filter(p => p.status === 'ok').length;
  const ngCount = progress.filter(p => p.status === 'ng').length;
  const unknownCount = totalWords - okCount - ngCount;
  
  const okPercentage = totalWords > 0 ? (okCount / totalWords) * 100 : 0;
  const ngPercentage = totalWords > 0 ? (ngCount / totalWords) * 100 : 0;
  const unknownPercentage = totalWords > 0 ? (unknownCount / totalWords) * 100 : 0;
  
  const progressPercentage = totalWords > 0 ? Math.round((okCount / totalWords) * 100) : 0;
  
  // 円弧の計算用ヘルパー関数
  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };
  
  const getArcPath = (startAngle: number, endAngle: number, radius: number, centerX: number, centerY: number) => {
    if (endAngle - startAngle >= 360) {
      // 完全な円の場合
      return `M ${centerX} ${centerY} m -${radius}, 0 a ${radius},${radius} 0 1,0 ${radius * 2},0 a ${radius},${radius} 0 1,0 -${radius * 2},0`;
    }
    const start = polarToCartesian(centerX, centerY, radius, startAngle);
    const end = polarToCartesian(centerX, centerY, radius, endAngle);
    const largeArcFlag = endAngle - startAngle > 180 ? "1" : "0";
    return `M ${centerX} ${centerY} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`;
  };
  
  // 各セグメントの角度を計算（0度から時計回り）
  const radius = 70;
  const minVisibleAngle = 2; // 最小表示角度（度）- 0.5%以上は視認できるように
  
  // 実際の角度を計算
  let okAngle = okPercentage * 3.6; // 100% = 360度
  let ngAngle = ngPercentage * 3.6;
  let unknownAngle = unknownPercentage * 3.6;
  
  // 最小表示角度を適用（0より大きく、かつ最小角度未満の場合は最小角度にする）
  if (okCount > 0 && okAngle > 0 && okAngle < minVisibleAngle) {
    okAngle = minVisibleAngle;
  }
  if (ngCount > 0 && ngAngle > 0 && ngAngle < minVisibleAngle) {
    ngAngle = minVisibleAngle;
  }
  
  // 未回答の角度を調整（合計が360度になるように）
  const totalAngle = okAngle + ngAngle + unknownAngle;
  if (totalAngle > 360) {
    // 超過分を未回答から減らす
    unknownAngle = Math.max(0, unknownAngle - (totalAngle - 360));
  } else if (totalAngle < 360 && unknownCount > 0) {
    // 不足分を未回答に追加
    unknownAngle = 360 - okAngle - ngAngle;
  }
  
  // 各セグメントの開始角度（12時の位置から開始）
  const startAngle = 0;

  const handleOK = () => {
    if (!currentWord) return;
    updateWordStatus(currentWord.id, 'ok');
    const newProgress = getProgress();
    setProgress(newProgress);
    setShowMeaning(false);
    
    // 次の単語に移動
    setTimeout(() => {
      const newUnanswered = words.filter(word => {
        const status = newProgress.find(p => p.wordId === word.id)?.status;
        return status === 'unknown' || status === 'ng' || !status;
      });
      if (currentWordIndex < newUnanswered.length - 1) {
        setCurrentWordIndex(currentWordIndex + 1);
      } else {
        setCurrentWordIndex(0);
      }
    }, 100);
  };

  const handleNG = () => {
    if (!currentWord) return;
    updateWordStatus(currentWord.id, 'ng');
    const newProgress = getProgress();
    setProgress(newProgress);
    setShowMeaning(false);
    
    // 次の単語に移動
    setTimeout(() => {
      const newUnanswered = words.filter(word => {
        const status = newProgress.find(p => p.wordId === word.id)?.status;
        return status === 'unknown' || status === 'ng' || !status;
      });
      if (currentWordIndex < newUnanswered.length - 1) {
        setCurrentWordIndex(currentWordIndex + 1);
      } else {
        setCurrentWordIndex(0);
      }
    }, 100);
  };

  const handleReset = () => {
    if (confirm('進捗をリセットしますか？')) {
      resetProgress();
      const wordIds = words.map(w => w.id);
      initializeProgress(wordIds);
      setProgress(getProgress());
      setCurrentWordIndex(0);
      setShowMeaning(false);
    }
  };

  const speakWord = (text: string, lang: string = 'en-US') => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.9;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleShowMeaning = () => {
    setShowMeaning(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-pink-50">
        <div className="text-2xl text-gray-600">読み込み中...</div>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-pink-50">
        <div className="text-2xl text-gray-600">単語データが見つかりません</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50 py-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">
            📚 英単語アプリ
          </h1>
          <div className="text-sm sm:text-base text-gray-600">
            残り: {unansweredWords.length} / {totalWords} 単語
          </div>
        </div>

        {/* 進捗ゲージ */}
        <div className="mb-6 bg-white rounded-2xl shadow-lg p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* 円形ゲージ */}
            <div className="relative flex-shrink-0">
              <svg width="160" height="160" viewBox="0 0 160 160">
                {/* 背景円 */}
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="12"
                />
                {/* OK（緑）- 最初のセグメント */}
                {okAngle > 0 && (
                  <path
                    d={getArcPath(startAngle, startAngle + okAngle, radius, 80, 80)}
                    fill="#4ade80"
                    className="transition-all duration-500 ease-out"
                  />
                )}
                {/* NG（赤）- OKの後に続く */}
                {ngAngle > 0 && (
                  <path
                    d={getArcPath(startAngle + okAngle, startAngle + okAngle + ngAngle, radius, 80, 80)}
                    fill="#f87171"
                    className="transition-all duration-500 ease-out"
                  />
                )}
                {/* 未回答（グレー）- NGの後に続く */}
                {unknownAngle > 0 && (
                  <path
                    d={getArcPath(startAngle + okAngle + ngAngle, startAngle + okAngle + ngAngle + unknownAngle, radius, 80, 80)}
                    fill="#9ca3af"
                    className="transition-all duration-500 ease-out"
                  />
                )}
                {/* 内側の円（白）で中央をくり抜く */}
                <circle
                  cx="80"
                  cy="80"
                  r="58"
                  fill="white"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-gray-800">
                    {progressPercentage}%
                  </div>
                  <div className="text-xs text-gray-500">マスター</div>
                </div>
              </div>
            </div>
            
            {/* 凡例と統計 */}
            <div className="flex-1 w-full sm:w-auto">
              <div className="space-y-2 sm:space-y-3">
                {/* OK */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-400"></div>
                    <span className="text-sm sm:text-base text-gray-700">OK</span>
                  </div>
                  <div className="text-sm sm:text-base font-semibold text-gray-800">
                    {okCount} ({Math.round(okPercentage)}%)
                  </div>
                </div>
                
                {/* NG */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-red-400"></div>
                    <span className="text-sm sm:text-base text-gray-700">NG</span>
                  </div>
                  <div className="text-sm sm:text-base font-semibold text-gray-800">
                    {ngCount} ({Math.round(ngPercentage)}%)
                  </div>
                </div>
                
                {/* 未回答 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-gray-400"></div>
                    <span className="text-sm sm:text-base text-gray-700">未回答</span>
                  </div>
                  <div className="text-sm sm:text-base font-semibold text-gray-800">
                    {unknownCount} ({Math.round(unknownPercentage)}%)
                  </div>
                </div>
                
                {/* 合計 */}
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm sm:text-base font-medium text-gray-700">合計</span>
                    <span className="text-sm sm:text-base font-bold text-gray-800">
                      {totalWords} 単語
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* フラッシュカード */}
        {unansweredWords.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 mb-6 min-h-[300px] sm:min-h-[400px] flex flex-col justify-between">
            <div className="flex-1 flex flex-col justify-center items-center">
              <div className="text-lg sm:text-xl text-gray-500 mb-4">
                単語 {currentWordIndex + 1} / {unansweredWords.length}
              </div>
              
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-800 mb-6 text-center break-words">
                {currentWord?.word}
              </div>

              {showMeaning ? (
                <div className="w-full">
                  <div className="text-xl sm:text-2xl text-gray-700 mb-6 text-center break-words px-4">
                    {currentWord?.meaning}
                  </div>
                  <div className="flex gap-3 sm:gap-4 justify-center">
                    <button
                      onClick={handleNG}
                      className="px-6 sm:px-8 py-3 sm:py-4 bg-red-400 hover:bg-red-500 text-white rounded-xl font-semibold text-base sm:text-lg shadow-lg transition-all transform hover:scale-105 active:scale-95"
                    >
                      ❌ NG
                    </button>
                    <button
                      onClick={handleOK}
                      className="px-6 sm:px-8 py-3 sm:py-4 bg-green-400 hover:bg-green-500 text-white rounded-xl font-semibold text-base sm:text-lg shadow-lg transition-all transform hover:scale-105 active:scale-95"
                    >
                      ✅ OK
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleShowMeaning}
                  className="px-6 sm:px-8 py-3 sm:py-4 bg-blue-400 hover:bg-blue-500 text-white rounded-xl font-semibold text-base sm:text-lg shadow-lg transition-all transform hover:scale-105 active:scale-95"
                >
                  意味を表示
                </button>
              )}
            </div>

            {/* 音声ボタン */}
            <div className="flex gap-3 sm:gap-4 justify-center mt-6">
              <button
                onClick={() => currentWord && speakWord(currentWord.word)}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-purple-300 hover:bg-purple-400 text-white rounded-lg text-sm sm:text-base shadow-md transition-all transform hover:scale-105 active:scale-95"
                title="単語を読み上げ"
              >
                🔊 単語
              </button>
              {showMeaning && (
                <button
                  onClick={() => currentWord && speakWord(currentWord.meaning)}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-pink-300 hover:bg-pink-400 text-white rounded-lg text-sm sm:text-base shadow-md transition-all transform hover:scale-105 active:scale-95"
                  title="意味を読み上げ"
                >
                  🔊 意味
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12 text-center">
            <div className="text-4xl sm:text-6xl mb-4">🎉</div>
            <div className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">
              おめでとうございます！
            </div>
            <div className="text-lg sm:text-xl text-gray-600 mb-6">
              すべての単語を学習しました
            </div>
            <button
              onClick={handleReset}
              className="px-6 sm:px-8 py-3 sm:py-4 bg-purple-400 hover:bg-purple-500 text-white rounded-xl font-semibold text-base sm:text-lg shadow-lg transition-all transform hover:scale-105 active:scale-95"
            >
              リセットして最初から
            </button>
          </div>
        )}

        {/* リセットボタン */}
        {unansweredWords.length > 0 && (
          <div className="text-center">
            <button
              onClick={handleReset}
              className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg text-sm sm:text-base shadow-md transition-all transform hover:scale-105 active:scale-95"
            >
              🔄 進捗をリセット
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

