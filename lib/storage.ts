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
  } catch (error) {
    console.error('Failed to reset progress:', error);
  }
}

export function initializeProgress(wordIds: string[]): void {
  const progress = getProgress();
  const existingIds = new Set(progress.map(p => p.wordId));
  
  wordIds.forEach(id => {
    if (!existingIds.has(id)) {
      progress.push({ wordId: id, status: 'unknown' });
    }
  });
  
  saveProgress(progress);
}

