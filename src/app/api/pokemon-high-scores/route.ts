import { NextRequest, NextResponse } from 'next/server';
import { put, head, BlobNotFoundError } from '@vercel/blob';

interface HighScoreEntry {
  name: string;
  score: number;
  date: string;
  caughtPokemon: string[];
}

const HIGH_SCORES_BLOB_PATH = 'pokemon-high-scores.json';

// Helper function to fetch high scores from blob
async function fetchHighScores(): Promise<HighScoreEntry[]> {
  try {
    const blobInfo = await head(HIGH_SCORES_BLOB_PATH);
    const response = await fetch(blobInfo.url);
    const text = await response.text();
    return JSON.parse(text);
  } catch (error) {
    // If blob doesn't exist, return empty array
    if (error instanceof BlobNotFoundError) {
      return [];
    }
    throw error;
  }
}

// GET - Fetch high scores
export async function GET() {
  try {
    const highScores = await fetchHighScores();
    return NextResponse.json({ highScores });
  } catch (error) {
    console.error('Error fetching high scores:', error);
    return NextResponse.json(
      { error: 'Failed to fetch high scores', highScores: [] },
      { status: 500 }
    );
  }
}

// POST - Save a new high score
export async function POST(request: NextRequest) {
  try {
    const entry: HighScoreEntry = await request.json();
    
    // Validate entry
    if (!entry.name || typeof entry.score !== 'number' || !Array.isArray(entry.caughtPokemon)) {
      return NextResponse.json(
        { error: 'Invalid high score entry' },
        { status: 400 }
      );
    }

    // Get current high scores
    const highScores = await fetchHighScores();
    
    // Add new entry and sort by score (descending)
    const updatedScores = [...highScores, entry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5); // Keep only top 5
    
    // Save back to Blob storage
    await put(HIGH_SCORES_BLOB_PATH, JSON.stringify(updatedScores), {
      access: 'public',
      contentType: 'application/json',
      allowOverwrite: true,
    });
    
    return NextResponse.json({ 
      success: true, 
      highScores: updatedScores 
    });
  } catch (error) {
    console.error('Error saving high score:', error);
    return NextResponse.json(
      { error: 'Failed to save high score' },
      { status: 500 }
    );
  }
}

