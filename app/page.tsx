'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { parseWordsFromFile } from '@/lib/parseWords';
import { 
  getProgress, 
  resetProgress, 
  initializeProgress,
  getDailyAnsweredRecords,
  getTotalAnsweredCount
} from '@/lib/storage';
import type { WordProgress } from '@/lib/storage';
import type { DailyAnsweredRecord } from '@/lib/storage';

export default function Dashboard() {
  const router = useRouter();
  const [words, setWords] = useState<any[]>([]);
  const [progress, setProgress] = useState<WordProgress[]>([]);
  const [dailyAnsweredRecords, setDailyAnsweredRecords] = useState<DailyAnsweredRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/words')
      .then(res => res.json())
      .then(data => {
        setWords(data);
        const wordIds = data.map((w: any) => w.id);
        initializeProgress(wordIds);
        setProgress(getProgress());
        setDailyAnsweredRecords(getDailyAnsweredRecords());
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to load words:', err);
        setIsLoading(false);
      });
  }, []);

  // 進捗統計を計算
  const totalWords = words.length;
  const okCount = progress.filter(p => p.status === 'ok').length;
  const ngCount = progress.filter(p => p.status === 'ng').length;
  const unknownCount = totalWords - okCount - ngCount;
  
  const okPercentage = totalWords > 0 ? (okCount / totalWords) * 100 : 0;
  const ngPercentage = totalWords > 0 ? (ngCount / totalWords) * 100 : 0;
  const unknownPercentage = totalWords > 0 ? (unknownCount / totalWords) * 100 : 0;
  
  const progressPercentage = totalWords > 0 ? Math.round((okCount / totalWords) * 100) : 0;
  const totalAnswered = getTotalAnsweredCount();

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
      return `M ${centerX} ${centerY} m -${radius}, 0 a ${radius},${radius} 0 1,0 ${radius * 2},0 a ${radius},${radius} 0 1,0 -${radius * 2},0`;
    }
    const start = polarToCartesian(centerX, centerY, radius, startAngle);
    const end = polarToCartesian(centerX, centerY, radius, endAngle);
    const largeArcFlag = endAngle - startAngle > 180 ? "1" : "0";
    return `M ${centerX} ${centerY} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`;
  };
  
  // 各セグメントの角度を計算
  const radius = 70;
  const minVisibleAngle = 2;
  
  let okAngle = okPercentage * 3.6;
  let ngAngle = ngPercentage * 3.6;
  let unknownAngle = unknownPercentage * 3.6;
  
  if (okCount > 0 && okAngle > 0 && okAngle < minVisibleAngle) {
    okAngle = minVisibleAngle;
  }
  if (ngCount > 0 && ngAngle > 0 && ngAngle < minVisibleAngle) {
    ngAngle = minVisibleAngle;
  }
  
  const totalAngle = okAngle + ngAngle + unknownAngle;
  if (totalAngle > 360) {
    unknownAngle = Math.max(0, unknownAngle - (totalAngle - 360));
  } else if (totalAngle < 360 && unknownCount > 0) {
    unknownAngle = 360 - okAngle - ngAngle;
  }
  
  const startAngle = 0;

  // 折れ線グラフ用データ（過去30日間）
  const getLast30Days = () => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date.toISOString().split('T')[0]);
    }
    return days;
  };

  const last30Days = getLast30Days();
  const chartData = last30Days.map(date => {
    const record = dailyAnsweredRecords.find(r => r.date === date);
    return {
      date,
      count: record ? record.count : 0,
      displayDate: new Date(date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
    };
  });

  // デバッグ用：データの確認
  if (process.env.NODE_ENV === 'development') {
    console.log('Daily answered records:', dailyAnsweredRecords);
    console.log('Chart data:', chartData);
  }

  const maxCount = Math.max(...chartData.map(d => d.count), 0);
  // Y軸の最大値は、データの最大値に基づいて設定
  // maxCountが0の場合は1に設定（グラフの表示のため）
  const displayMaxCount = maxCount === 0 ? 1 : maxCount;

  const handleReset = () => {
    if (confirm('進捗をリセットしますか？')) {
      resetProgress();
      const wordIds = words.map((w: any) => w.id);
      initializeProgress(wordIds, true); // リセットフラグをtrueに
      setProgress(getProgress());
      setDailyAnsweredRecords(getDailyAnsweredRecords());
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-pink-50">
        <div className="text-2xl text-gray-600">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50 py-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">
            📚 英単語アプリ
          </h1>
        </div>

        {/* 進捗ゲージ */}
        <div className="mb-6 bg-white rounded-2xl shadow-lg p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* 円形ゲージ */}
            <div className="relative flex-shrink-0">
              <svg width="160" height="160" viewBox="0 0 160 160">
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="12"
                />
                {okAngle > 0 && (
                  <path
                    d={getArcPath(startAngle, startAngle + okAngle, radius, 80, 80)}
                    fill="#4ade80"
                    className="transition-all duration-500 ease-out"
                  />
                )}
                {ngAngle > 0 && (
                  <path
                    d={getArcPath(startAngle + okAngle, startAngle + okAngle + ngAngle, radius, 80, 80)}
                    fill="#f87171"
                    className="transition-all duration-500 ease-out"
                  />
                )}
                {unknownAngle > 0 && (
                  <path
                    d={getArcPath(startAngle + okAngle + ngAngle, startAngle + okAngle + ngAngle + unknownAngle, radius, 80, 80)}
                    fill="#9ca3af"
                    className="transition-all duration-500 ease-out"
                  />
                )}
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-400"></div>
                    <span className="text-sm sm:text-base text-gray-700">OK</span>
                  </div>
                  <div className="text-sm sm:text-base font-semibold text-gray-800">
                    {okCount} ({Math.round(okPercentage)}%)
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-red-400"></div>
                    <span className="text-sm sm:text-base text-gray-700">NG</span>
                  </div>
                  <div className="text-sm sm:text-base font-semibold text-gray-800">
                    {ngCount} ({Math.round(ngPercentage)}%)
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-gray-400"></div>
                    <span className="text-sm sm:text-base text-gray-700">未回答</span>
                  </div>
                  <div className="text-sm sm:text-base font-semibold text-gray-800">
                    {unknownCount} ({Math.round(unknownPercentage)}%)
                  </div>
                </div>
                
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

        {/* 折れ線グラフ（過去7日間のNG回数） */}
        <div className="mb-6 bg-white rounded-2xl shadow-lg p-4 sm:p-6 relative">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">
              過去30日間の回答数
            </h2>
            {/* 累計回答数 - 右端上に表示 */}
            <div className="text-right">
              <div className="text-xs sm:text-sm text-gray-600">累計回答数</div>
              <div className="text-xl sm:text-2xl font-bold text-purple-600">
                {totalAnswered}
              </div>
              <div className="text-xs text-gray-500">単語</div>
            </div>
          </div>
          <div className="relative">
            {/* Y軸ラベル */}
            <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-xs text-gray-500 pr-2">
              {(() => {
                // データがすべて0の場合は0のみ表示
                if (maxCount === 0) {
                  return [0].map((value, idx) => (
                    <div key={idx} className="text-right">{value}</div>
                  ));
                }
                // Y軸の目盛りを計算
                let yAxisLabels: number[];
                if (displayMaxCount <= 5) {
                  // 小さい値の場合は0からmaxCountまでの整数を表示
                  yAxisLabels = Array.from({ length: displayMaxCount + 1 }, (_, i) => displayMaxCount - i);
                } else {
                  // 大きい値の場合は4分割
                  const steps = [
                    displayMaxCount,
                    Math.max(0, Math.ceil(displayMaxCount * 0.75)),
                    Math.max(0, Math.ceil(displayMaxCount * 0.5)),
                    Math.max(0, Math.ceil(displayMaxCount * 0.25)),
                    0
                  ];
                  // 重複を除去して降順にソート
                  yAxisLabels = Array.from(new Set(steps)).sort((a, b) => b - a);
                }
                return yAxisLabels.map((value, idx) => (
                  <div key={idx} className="text-right">{value}</div>
                ));
              })()}
            </div>
            {/* グラフエリア */}
            <div className="h-48 sm:h-64 ml-8 relative pb-8 overflow-x-auto">
              <div className="min-w-full h-full flex items-end justify-between gap-1 sm:gap-2">
                {chartData.map((data, index) => {
                  const heightPercent = displayMaxCount > 0 ? (data.count / displayMaxCount) * 100 : 0;
                  // スマホでは日付ラベルを間引く（5日ごと）
                  const shouldShowDate = index === 0 || index === chartData.length - 1 || (index + 1) % 5 === 0;
                  return (
                    <div key={data.date} className="flex-1 min-w-[20px] sm:min-w-0 flex flex-col items-center gap-1 sm:gap-2 h-full">
                      <div className="relative w-full h-full flex items-end">
                        {data.count > 0 && (
                          <div
                            className="w-full bg-blue-400 rounded-t transition-all duration-500 ease-out hover:bg-blue-500"
                            style={{ 
                              height: `${heightPercent}%`,
                              minHeight: '4px'
                            }}
                            title={`${data.date}: ${data.count}回`}
                          />
                        )}
                      </div>
                      {shouldShowDate && (
                        <div className="text-[10px] sm:text-xs text-gray-600 text-center whitespace-nowrap">
                          {data.displayDate}
                        </div>
                      )}
                      {data.count > 0 && (
                        <div className="text-[10px] sm:text-xs font-semibold text-blue-600">
                          {data.count}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ボタンエリア */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
          <button
            onClick={() => router.push('/quiz')}
            className="px-6 sm:px-8 py-3 sm:py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold text-base sm:text-lg shadow-lg transition-all transform hover:scale-105 active:scale-95"
          >
            🎯 単語テストを開始
          </button>
          <button
            onClick={handleReset}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg text-sm sm:text-base shadow-md transition-all transform hover:scale-105 active:scale-95"
          >
            🔄 進捗をリセット
          </button>
        </div>
      </div>
    </div>
  );
}
