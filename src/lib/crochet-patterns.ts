// Crochet pattern definitions

import { StitchType, StitchInstruction } from './crochet-stitches';

export interface CrochetPattern {
  id: string;
  name: string;
  category: 'simple' | 'amigurumi';
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  rows: StitchInstruction[][];
  workInRound: boolean;
  defaultColor: string;
  colorPalette?: string[];
}

// Pattern 1: Foundation Chain
export const FOUNDATION_CHAIN: CrochetPattern = {
  id: 'foundation-chain',
  name: 'Foundation Chain',
  category: 'simple',
  description: 'A simple chain of stitches - the foundation for most crochet projects',
  difficulty: 'beginner',
  rows: [
    [{ type: StitchType.CHAIN, count: 20 }],
  ],
  workInRound: false,
  defaultColor: '#F4A460', // Sandy brown
};

// Pattern 2: Square Coaster
export const SQUARE_COASTER: CrochetPattern = {
  id: 'square-coaster',
  name: 'Square Coaster',
  category: 'simple',
  description: 'A simple square coaster made with single crochet stitches',
  difficulty: 'beginner',
  rows: [
    [{ type: StitchType.CHAIN, count: 15 }],
    [{ type: StitchType.SINGLE_CROCHET, count: 14 }],
    [{ type: StitchType.SINGLE_CROCHET, count: 14 }],
    [{ type: StitchType.SINGLE_CROCHET, count: 14 }],
    [{ type: StitchType.SINGLE_CROCHET, count: 14 }],
    [{ type: StitchType.SINGLE_CROCHET, count: 14 }],
  ],
  workInRound: false,
  defaultColor: '#87CEEB', // Sky blue
};

// Pattern 3: Striped Scarf
export const STRIPED_SCARF: CrochetPattern = {
  id: 'striped-scarf',
  name: 'Striped Scarf',
  category: 'simple',
  description: 'A colorful striped scarf with alternating colors',
  difficulty: 'beginner',
  rows: [
    [{ type: StitchType.CHAIN, count: 12 }],
    [{ type: StitchType.DOUBLE_CROCHET, count: 11, color: '#FF6B6B' }],
    [{ type: StitchType.DOUBLE_CROCHET, count: 11, color: '#4ECDC4' }],
    [{ type: StitchType.DOUBLE_CROCHET, count: 11, color: '#FFE66D' }],
    [{ type: StitchType.DOUBLE_CROCHET, count: 11, color: '#FF6B6B' }],
    [{ type: StitchType.DOUBLE_CROCHET, count: 11, color: '#4ECDC4' }],
    [{ type: StitchType.DOUBLE_CROCHET, count: 11, color: '#FFE66D' }],
    [{ type: StitchType.DOUBLE_CROCHET, count: 11, color: '#FF6B6B' }],
  ],
  workInRound: false,
  defaultColor: '#FF6B6B',
  colorPalette: ['#FF6B6B', '#4ECDC4', '#FFE66D'],
};

// Pattern 4: Mini Octopus (Amigurumi)
export const MINI_OCTOPUS: CrochetPattern = {
  id: 'mini-octopus',
  name: 'Mini Octopus',
  category: 'amigurumi',
  description: 'A cute little octopus with 8 tentacles',
  difficulty: 'intermediate',
  rows: [
    // Round 1: Magic ring + 6 sc
    [
      { type: StitchType.MAGIC_RING, count: 1 },
      { type: StitchType.SINGLE_CROCHET, count: 6 },
    ],
    // Round 2: 6 increases (12 stitches)
    [{ type: StitchType.INCREASE, count: 6 }],
    // Round 3: (sc, inc) × 6 (18 stitches)
    [
      { type: StitchType.SINGLE_CROCHET, count: 1 },
      { type: StitchType.INCREASE, count: 1 },
      { type: StitchType.SINGLE_CROCHET, count: 1 },
      { type: StitchType.INCREASE, count: 1 },
      { type: StitchType.SINGLE_CROCHET, count: 1 },
      { type: StitchType.INCREASE, count: 1 },
      { type: StitchType.SINGLE_CROCHET, count: 1 },
      { type: StitchType.INCREASE, count: 1 },
      { type: StitchType.SINGLE_CROCHET, count: 1 },
      { type: StitchType.INCREASE, count: 1 },
      { type: StitchType.SINGLE_CROCHET, count: 1 },
      { type: StitchType.INCREASE, count: 1 },
    ],
    // Round 4: sc in each (18 stitches)
    [{ type: StitchType.SINGLE_CROCHET, count: 18 }],
    // Round 5: sc in each (18 stitches)
    [{ type: StitchType.SINGLE_CROCHET, count: 18 }],
    // Round 6: sc in each (18 stitches)
    [{ type: StitchType.SINGLE_CROCHET, count: 18 }],
    // Round 7: (sc, dec) × 6 (12 stitches)
    [
      { type: StitchType.SINGLE_CROCHET, count: 1 },
      { type: StitchType.DECREASE, count: 1 },
      { type: StitchType.SINGLE_CROCHET, count: 1 },
      { type: StitchType.DECREASE, count: 1 },
      { type: StitchType.SINGLE_CROCHET, count: 1 },
      { type: StitchType.DECREASE, count: 1 },
      { type: StitchType.SINGLE_CROCHET, count: 1 },
      { type: StitchType.DECREASE, count: 1 },
      { type: StitchType.SINGLE_CROCHET, count: 1 },
      { type: StitchType.DECREASE, count: 1 },
      { type: StitchType.SINGLE_CROCHET, count: 1 },
      { type: StitchType.DECREASE, count: 1 },
    ],
    // Round 8: 6 decreases (6 stitches)
    [{ type: StitchType.DECREASE, count: 6 }],
    // Tentacles: 8 small tentacles (chain + sc)
    [{ type: StitchType.CHAIN, count: 5 }],
    [{ type: StitchType.CHAIN, count: 5 }],
    [{ type: StitchType.CHAIN, count: 5 }],
    [{ type: StitchType.CHAIN, count: 5 }],
    [{ type: StitchType.CHAIN, count: 5 }],
    [{ type: StitchType.CHAIN, count: 5 }],
    [{ type: StitchType.CHAIN, count: 5 }],
    [{ type: StitchType.CHAIN, count: 5 }],
  ],
  workInRound: true,
  defaultColor: '#FF69B4', // Hot pink
  colorPalette: ['#FF69B4', '#DDA0DD', '#40E0D0'],
};

// Pattern 5: Bear Face (Amigurumi)
export const BEAR_FACE: CrochetPattern = {
  id: 'bear-face',
  name: 'Bear Face',
  category: 'amigurumi',
  description: 'A cute teddy bear face with ears',
  difficulty: 'intermediate',
  rows: [
    // Main face
    [
      { type: StitchType.MAGIC_RING, count: 1 },
      { type: StitchType.SINGLE_CROCHET, count: 6 },
    ],
    [{ type: StitchType.INCREASE, count: 6 }],
    [
      { type: StitchType.SINGLE_CROCHET, count: 1 },
      { type: StitchType.INCREASE, count: 1 },
      { type: StitchType.SINGLE_CROCHET, count: 1 },
      { type: StitchType.INCREASE, count: 1 },
      { type: StitchType.SINGLE_CROCHET, count: 1 },
      { type: StitchType.INCREASE, count: 1 },
      { type: StitchType.SINGLE_CROCHET, count: 1 },
      { type: StitchType.INCREASE, count: 1 },
      { type: StitchType.SINGLE_CROCHET, count: 1 },
      { type: StitchType.INCREASE, count: 1 },
      { type: StitchType.SINGLE_CROCHET, count: 1 },
      { type: StitchType.INCREASE, count: 1 },
    ],
    [{ type: StitchType.SINGLE_CROCHET, count: 18 }],
    [{ type: StitchType.SINGLE_CROCHET, count: 18 }],
    [{ type: StitchType.SINGLE_CROCHET, count: 18 }],
    // Left ear
    [{ type: StitchType.MAGIC_RING, count: 1 }, { type: StitchType.SINGLE_CROCHET, count: 5 }],
    [{ type: StitchType.INCREASE, count: 5 }],
    // Right ear
    [{ type: StitchType.MAGIC_RING, count: 1 }, { type: StitchType.SINGLE_CROCHET, count: 5 }],
    [{ type: StitchType.INCREASE, count: 5 }],
  ],
  workInRound: true,
  defaultColor: '#8B4513', // Saddle brown
  colorPalette: ['#8B4513', '#DEB887'],
};

// Pattern 6: Bunny (Amigurumi)
export const BUNNY: CrochetPattern = {
  id: 'bunny',
  name: 'Cute Bunny',
  category: 'amigurumi',
  description: 'An adorable bunny with long ears',
  difficulty: 'intermediate',
  rows: [
    // Body
    [
      { type: StitchType.MAGIC_RING, count: 1 },
      { type: StitchType.SINGLE_CROCHET, count: 6 },
    ],
    [{ type: StitchType.INCREASE, count: 6 }],
    [
      { type: StitchType.SINGLE_CROCHET, count: 1 },
      { type: StitchType.INCREASE, count: 1 },
      { type: StitchType.SINGLE_CROCHET, count: 1 },
      { type: StitchType.INCREASE, count: 1 },
      { type: StitchType.SINGLE_CROCHET, count: 1 },
      { type: StitchType.INCREASE, count: 1 },
      { type: StitchType.SINGLE_CROCHET, count: 1 },
      { type: StitchType.INCREASE, count: 1 },
      { type: StitchType.SINGLE_CROCHET, count: 1 },
      { type: StitchType.INCREASE, count: 1 },
      { type: StitchType.SINGLE_CROCHET, count: 1 },
      { type: StitchType.INCREASE, count: 1 },
    ],
    [{ type: StitchType.SINGLE_CROCHET, count: 18 }],
    [{ type: StitchType.SINGLE_CROCHET, count: 18 }],
    // Left ear (elongated)
    [{ type: StitchType.CHAIN, count: 8, color: '#FFFFFF' }],
    [{ type: StitchType.SINGLE_CROCHET, count: 7, color: '#FFB6C1' }],
    [{ type: StitchType.SINGLE_CROCHET, count: 7, color: '#FFFFFF' }],
    // Right ear (elongated)
    [{ type: StitchType.CHAIN, count: 8, color: '#FFFFFF' }],
    [{ type: StitchType.SINGLE_CROCHET, count: 7, color: '#FFB6C1' }],
    [{ type: StitchType.SINGLE_CROCHET, count: 7, color: '#FFFFFF' }],
    // Tail (small pom-pom)
    [{ type: StitchType.MAGIC_RING, count: 1 }, { type: StitchType.SINGLE_CROCHET, count: 4 }],
  ],
  workInRound: true,
  defaultColor: '#FFFFFF', // White
  colorPalette: ['#FFFFFF', '#FFB6C1'],
};

// All patterns array
export const CROCHET_PATTERNS: CrochetPattern[] = [
  FOUNDATION_CHAIN,
  SQUARE_COASTER,
  STRIPED_SCARF,
  MINI_OCTOPUS,
  BEAR_FACE,
  BUNNY,
];

// Get patterns by category
export function getPatternsByCategory(category: 'simple' | 'amigurumi'): CrochetPattern[] {
  return CROCHET_PATTERNS.filter(p => p.category === category);
}

// Get pattern by ID
export function getPatternById(id: string): CrochetPattern | undefined {
  return CROCHET_PATTERNS.find(p => p.id === id);
}
