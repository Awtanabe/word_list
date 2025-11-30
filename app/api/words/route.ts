import { NextResponse } from 'next/server';
import { parseWordsFromFile } from '@/lib/parseWords';

export async function GET() {
  try {
    const words = parseWordsFromFile();
    return NextResponse.json(words);
  } catch (error) {
    console.error('Error parsing words:', error);
    return NextResponse.json(
      { error: 'Failed to load words' },
      { status: 500 }
    );
  }
}

