import fs from 'fs';
import path from 'path';

export interface Word {
  id: string;
  word: string;
  meaning: string;
}

export function parseWordsFromFile(): Word[] {
  const filePath = path.join(process.cwd(), 'data.md');
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  const words: Word[] = [];
  let id = 0;
  
  lines.forEach((line) => {
    if (!line.trim()) return;
    
    // タブ区切りで分割
    const parts = line.split('\t').filter(part => part.trim());
    
    // 単語と意味が交互に並んでいるので、2つずつ処理
    for (let i = 0; i < parts.length; i += 2) {
      if (i + 1 < parts.length) {
        words.push({
          id: `word-${id++}`,
          word: parts[i].trim(),
          meaning: parts[i + 1].trim(),
        });
      }
    }
  });
  
  return words;
}

