export interface WordProgress {
  wordId: string;
  status: 'unknown' | 'ok' | 'ng';
}

const STORAGE_KEY = 'english-vocab-progress';

export function getProgress(): WordProgress[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveProgress(progress: WordProgress[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error('Failed to save progress:', error);
  }
}

export function updateWordStatus(wordId: string, status: 'ok' | 'ng'): void {
  const progress = getProgress();
  const index = progress.findIndex(p => p.wordId === wordId);
  
  if (index >= 0) {
    progress[index].status = status;
  } else {
    progress.push({ wordId, status });
  }
  
  saveProgress(progress);
}

export function resetProgress(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(STORAGE_KEY);
    // 日次回答数データもリセット
    localStorage.removeItem(DAILY_ANSWERED_KEY);
    localStorage.removeItem(DAILY_NG_KEY);
    // 現在のインデックスもリセット
    localStorage.removeItem(CURRENT_INDEX_KEY);
  } catch (error) {
    console.error('Failed to reset progress:', error);
  }
}

export function initializeProgress(wordIds: string[], reset: boolean = false): void {
  if (reset) {
    // リセット時はすべての単語を'unknown'に設定
    const newProgress = wordIds.map(id => ({ wordId: id, status: 'unknown' as const }));
    saveProgress(newProgress);
    return;
  }
  
  const progress = getProgress();
  const existingIds = new Set(progress.map(p => p.wordId));
  
  // 新しい単語IDを追加
  wordIds.forEach(id => {
    if (!existingIds.has(id)) {
      progress.push({ wordId: id, status: 'unknown' });
    }
  });
  
  // 存在しない単語IDを削除
  const wordIdSet = new Set(wordIds);
  const filteredProgress = progress.filter(p => wordIdSet.has(p.wordId));
  
  saveProgress(filteredProgress);
}

// 日付ごとの回答数を記録
const DAILY_ANSWERED_KEY = 'english-vocab-daily-answered';
const DAILY_NG_KEY = 'english-vocab-daily-ng'; // 後方互換性のため

export interface DailyAnsweredRecord {
  date: string; // YYYY-MM-DD形式
  count: number;
}

export function recordAnswered(): void {
  if (typeof window === 'undefined') return;
  
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // 直接localStorageから取得（無限ループを避けるため）
    let records: DailyAnsweredRecord[] = [];
    const stored = localStorage.getItem(DAILY_ANSWERED_KEY);
    if (stored) {
      records = JSON.parse(stored);
    } else {
      // 古いNGデータがある場合は移行
      const oldNGData = localStorage.getItem(DAILY_NG_KEY);
      if (oldNGData) {
        records = JSON.parse(oldNGData);
      }
    }
    
    const todayRecord = records.find(r => r.date === today);
    
    if (todayRecord) {
      todayRecord.count += 1;
    } else {
      records.push({ date: today, count: 1 });
    }
    
    localStorage.setItem(DAILY_ANSWERED_KEY, JSON.stringify(records));
  } catch (error) {
    console.error('Failed to record answered:', error);
  }
}

export function getDailyAnsweredRecords(): DailyAnsweredRecord[] {
  if (typeof window === 'undefined') return [];
  
  try {
    // 回答数データを取得
    const stored = localStorage.getItem(DAILY_ANSWERED_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    
    return [];
  } catch {
    return [];
  }
}

// 後方互換性のため、NG記録も残す（recordNGはrecordAnsweredを呼ぶ）
export function recordNG(): void {
  recordAnswered();
}

export interface DailyNGRecord {
  date: string;
  count: number;
}

export function getDailyNGRecords(): DailyNGRecord[] {
  return getDailyAnsweredRecords();
}

// 累計回答数を取得
export function getTotalAnsweredCount(): number {
  const progress = getProgress();
  return progress.filter(p => p.status === 'ok' || p.status === 'ng').length;
}

// 現在の単語インデックスを保存・取得
const CURRENT_INDEX_KEY = 'english-vocab-current-index';

export function saveCurrentIndex(index: number): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(CURRENT_INDEX_KEY, index.toString());
  } catch (error) {
    console.error('Failed to save current index:', error);
  }
}

export function getCurrentIndex(): number {
  if (typeof window === 'undefined') return 0;
  
  try {
    const stored = localStorage.getItem(CURRENT_INDEX_KEY);
    return stored ? parseInt(stored, 10) : 0;
  } catch {
    return 0;
  }
}

