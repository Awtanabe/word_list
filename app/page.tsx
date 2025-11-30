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
  const answeredWords = progress.filter(p => p.status === 'ok').length;
  const progressPercentage = totalWords > 0 ? Math.round((answeredWords / totalWords) * 100) : 0;

  const handleOK = () => {
    if (!currentWord) return;
    updateWordStatus(currentWord.id, 'ok');
    setProgress(getProgress());
    setShowMeaning(false);
    
    if (currentWordIndex < unansweredWords.length - 1) {
      setCurrentWordIndex(currentWordIndex + 1);
    } else {
      setCurrentWordIndex(0);
    }
  };

  const handleNG = () => {
    if (!currentWord) return;
    updateWordStatus(currentWord.id, 'ng');
    setProgress(getProgress());
    setShowMeaning(false);
    
    if (currentWordIndex < unansweredWords.length - 1) {
      setCurrentWordIndex(currentWordIndex + 1);
    } else {
      setCurrentWordIndex(0);
    }
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

        {/* 進捗バー */}
        <div className="mb-6 bg-white rounded-2xl shadow-lg p-4 sm:p-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm sm:text-base font-medium text-gray-700">進捗</span>
            <span className="text-sm sm:text-base font-bold text-purple-600">
              {progressPercentage}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 sm:h-5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-purple-400 to-pink-400 h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="mt-2 text-xs sm:text-sm text-gray-500 text-center">
            {answeredWords} / {totalWords} 単語をマスター
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

