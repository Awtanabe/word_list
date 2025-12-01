'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { parseWordsFromFile } from '@/lib/parseWords';
import { 
  getProgress, 
  updateWordStatus, 
  initializeProgress,
  recordAnswered,
  saveCurrentIndex,
  getCurrentIndex
} from '@/lib/storage';
import type { Word } from '@/lib/parseWords';
import type { WordProgress } from '@/lib/storage';

export default function Quiz() {
  const router = useRouter();
  const [words, setWords] = useState<Word[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);
  const [progress, setProgress] = useState<WordProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 音声エンジンを事前に読み込む（精度向上のため）
    if ('speechSynthesis' in window) {
      // 音声リストを取得（非同期で読み込まれるため）
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (process.env.NODE_ENV === 'development') {
          console.log('Available voices:', voices.filter(v => v.lang.startsWith('en')));
        }
      };
      
      // 音声が読み込まれたら実行
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
      loadVoices(); // 既に読み込まれている場合
    }

    fetch('/api/words')
      .then(res => res.json())
      .then(data => {
        setWords(data);
        const wordIds = data.map((w: Word) => w.id);
        initializeProgress(wordIds);
        const progressData = getProgress();
        setProgress(progressData);
        
        // 保存されたインデックスを取得
        const savedIndex = getCurrentIndex();
        const progressMap = new Map(progressData.map(p => [p.wordId, p.status]));
        const unanswered = data.filter((word: Word) => {
          const status = progressMap.get(word.id);
          return status === 'unknown' || status === 'ng' || !status;
        });
        
        // 保存されたインデックスが有効な範囲内か確認
        // リセット後はインデックスも0にリセットされているはずなので、0から開始
        const initialIndex = savedIndex < unanswered.length ? savedIndex : 0;
        setCurrentWordIndex(initialIndex);
        
        // デバッグ用
        if (process.env.NODE_ENV === 'development') {
          console.log('Progress data:', progressData);
          console.log('Unanswered words:', unanswered.length);
          console.log('Saved index:', savedIndex, 'Initial index:', initialIndex);
        }
        
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

  const handleOK = () => {
    if (!currentWord) return;
    updateWordStatus(currentWord.id, 'ok');
    recordAnswered(); // 回答数を記録
    const newProgress = getProgress();
    setProgress(newProgress);
    setShowMeaning(false);
    
    setTimeout(() => {
      const newUnanswered = words.filter(word => {
        const status = newProgress.find(p => p.wordId === word.id)?.status;
        return status === 'unknown' || status === 'ng' || !status;
      });
      let nextIndex;
      if (currentWordIndex < newUnanswered.length - 1) {
        nextIndex = currentWordIndex + 1;
      } else {
        nextIndex = 0;
      }
      setCurrentWordIndex(nextIndex);
      saveCurrentIndex(nextIndex); // インデックスを保存
    }, 100);
  };

  const handleNG = () => {
    if (!currentWord) return;
    updateWordStatus(currentWord.id, 'ng');
    recordAnswered(); // 回答数を記録
    const newProgress = getProgress();
    setProgress(newProgress);
    setShowMeaning(false);
    
    setTimeout(() => {
      const newUnanswered = words.filter(word => {
        const status = newProgress.find(p => p.wordId === word.id)?.status;
        return status === 'unknown' || status === 'ng' || !status;
      });
      let nextIndex;
      if (currentWordIndex < newUnanswered.length - 1) {
        nextIndex = currentWordIndex + 1;
      } else {
        nextIndex = 0;
      }
      setCurrentWordIndex(nextIndex);
      saveCurrentIndex(nextIndex); // インデックスを保存
    }, 100);
  };

  const speakWord = (text: string, lang: string = 'en-US') => {
    if ('speechSynthesis' in window) {
      // 既存の音声を停止
      window.speechSynthesis.cancel();
      
      // 音声合成の設定を改善
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.85; // 少し遅めに設定（精度向上）
      utterance.pitch = 1;
      utterance.volume = 1;
      
      // より精度の高い音声エンジンを選択（利用可能な場合）
      const voices = window.speechSynthesis.getVoices();
      const preferredVoices = voices.filter(voice => 
        voice.lang.startsWith('en') && 
        (voice.name.includes('Google') || voice.name.includes('Microsoft') || voice.name.includes('Enhanced'))
      );
      
      if (preferredVoices.length > 0) {
        // 優先度の高い音声を選択
        utterance.voice = preferredVoices[0];
      } else {
        // 英語の音声を探す
        const englishVoices = voices.filter(voice => voice.lang.startsWith('en'));
        if (englishVoices.length > 0) {
          utterance.voice = englishVoices[0];
        }
      }
      
      // エラーハンドリング
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
      };
      
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
            📚 単語テスト
          </h1>
          <div className="text-sm sm:text-base text-gray-600">
            残り: {unansweredWords.length} / {words.length} 単語
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
          <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12 text-center mb-6">
            <div className="text-4xl sm:text-6xl mb-4">🎉</div>
            <div className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">
              おめでとうございます！
            </div>
            <div className="text-lg sm:text-xl text-gray-600 mb-6">
              すべての単語を学習しました
            </div>
          </div>
        )}

        {/* ダッシュボードに戻るボタン - 一番下 */}
        <div className="text-center">
          <button
            onClick={() => router.push('/')}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg text-sm sm:text-base shadow-md transition-all transform hover:scale-105 active:scale-95"
          >
            ← ダッシュボードに戻る
          </button>
        </div>
      </div>
    </div>
  );
}

