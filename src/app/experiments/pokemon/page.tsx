'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface Pokemon {
  id: number;
  name: string;
  type: string;
  color: string;
  secondaryColor: string;
  x: number;
  y: number;
  speed: number;
  pokedexId: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary' | 'mythic';
  basePoints: number;
}

type BallType = 'poke-ball' | 'great-ball' | 'ultra-ball' | 'luxury-ball' | 'master-ball';

interface PowerUpBall {
  id: number;
  ballType: BallType;
  x: number;
  y: number;
  speed: number;
  sizeMultiplier: number;
  sprite: string;
}

const BALL_TYPES: Record<BallType, { sizeMultiplier: number; sprite: string; name: string }> = {
  'poke-ball': {
    sizeMultiplier: 1,
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png',
    name: 'Poke Ball'
  },
  'great-ball': {
    sizeMultiplier: 1.5,
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/great-ball.png',
    name: 'Great Ball'
  },
  'ultra-ball': {
    sizeMultiplier: 2,
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/ultra-ball.png',
    name: 'Ultra Ball'
  },
  'luxury-ball': {
    sizeMultiplier: 2.5,
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/luxury-ball.png',
    name: 'Luxury Ball'
  },
  'master-ball': {
    sizeMultiplier: 3,
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/master-ball.png',
    name: 'Master Ball'
  },
};

const POKEMON_TYPES = [
  // Common Pokemon (10 points)
  { name: 'Bulbasaur', type: 'grass', color: '#32CD32', secondaryColor: '#228B22', pokedexId: 1, rarity: 'common' as const, basePoints: 10 },
  { name: 'Charmander', type: 'fire', color: '#FF6347', secondaryColor: '#FFD700', pokedexId: 4, rarity: 'common' as const, basePoints: 10 },
  { name: 'Squirtle', type: 'water', color: '#4169E1', secondaryColor: '#87CEEB', pokedexId: 7, rarity: 'common' as const, basePoints: 10 },
  { name: 'Caterpie', type: 'bug', color: '#A8B820', secondaryColor: '#6D7815', pokedexId: 10, rarity: 'common' as const, basePoints: 10 },
  { name: 'Pidgey', type: 'flying', color: '#A890F0', secondaryColor: '#6D5E9C', pokedexId: 16, rarity: 'common' as const, basePoints: 10 },
  { name: 'Rattata', type: 'normal', color: '#A8A878', secondaryColor: '#6D6D4E', pokedexId: 19, rarity: 'common' as const, basePoints: 10 },
  { name: 'Psyduck', type: 'water', color: '#FFD700', secondaryColor: '#4169E1', pokedexId: 54, rarity: 'common' as const, basePoints: 10 },
  { name: 'Magikarp', type: 'water', color: '#FF6B6B', secondaryColor: '#FFA500', pokedexId: 129, rarity: 'common' as const, basePoints: 10 },

  // Uncommon Pokemon (20 points)
  { name: 'Pikachu', type: 'electric', color: '#FFD700', secondaryColor: '#FFA500', pokedexId: 25, rarity: 'uncommon' as const, basePoints: 20 },
  { name: 'Jigglypuff', type: 'fairy', color: '#FFB6C1', secondaryColor: '#FF69B4', pokedexId: 39, rarity: 'uncommon' as const, basePoints: 20 },
  { name: 'Meowth', type: 'normal', color: '#F4E7C3', secondaryColor: '#D4A76A', pokedexId: 52, rarity: 'uncommon' as const, basePoints: 20 },
  { name: 'Machop', type: 'fighting', color: '#C03028', secondaryColor: '#7D1F1A', pokedexId: 66, rarity: 'uncommon' as const, basePoints: 20 },
  { name: 'Cubone', type: 'ground', color: '#E0C068', secondaryColor: '#927D44', pokedexId: 104, rarity: 'uncommon' as const, basePoints: 20 },

  // Rare Pokemon (30 points)
  { name: 'Raichu', type: 'electric', color: '#F7B731', secondaryColor: '#FFA500', pokedexId: 26, rarity: 'rare' as const, basePoints: 30 },
  { name: 'Arcanine', type: 'fire', color: '#FF6347', secondaryColor: '#FFA500', pokedexId: 59, rarity: 'rare' as const, basePoints: 30 },
  { name: 'Gengar', type: 'ghost', color: '#6A5ACD', secondaryColor: '#483D8B', pokedexId: 94, rarity: 'rare' as const, basePoints: 30 },
  { name: 'Gyarados', type: 'water', color: '#4169E1', secondaryColor: '#1E3A8A', pokedexId: 130, rarity: 'rare' as const, basePoints: 30 },
  { name: 'Eevee', type: 'normal', color: '#D2691E', secondaryColor: '#F5DEB3', pokedexId: 133, rarity: 'rare' as const, basePoints: 30 },
  { name: 'Lapras', type: 'water', color: '#4A90E2', secondaryColor: '#2E5C8A', pokedexId: 131, rarity: 'rare' as const, basePoints: 30 },

  // Legendary Pokemon (50 points)
  { name: 'Charizard', type: 'fire', color: '#FF4500', secondaryColor: '#FFD700', pokedexId: 6, rarity: 'legendary' as const, basePoints: 50 },
  { name: 'Blastoise', type: 'water', color: '#1E90FF', secondaryColor: '#87CEEB', pokedexId: 9, rarity: 'legendary' as const, basePoints: 50 },
  { name: 'Snorlax', type: 'normal', color: '#2C5F77', secondaryColor: '#E8D5B7', pokedexId: 143, rarity: 'legendary' as const, basePoints: 50 },
  { name: 'Dragonite', type: 'dragon', color: '#FFA500', secondaryColor: '#FF8C00', pokedexId: 149, rarity: 'legendary' as const, basePoints: 50 },
  { name: 'Mewtwo', type: 'psychic', color: '#B565D8', secondaryColor: '#8B4DC9', pokedexId: 150, rarity: 'legendary' as const, basePoints: 50 },

  // Mythic Pokemon (100 points) - Ultra rare!
  { name: 'Mew', type: 'psychic', color: '#FFB6C1', secondaryColor: '#FF69B4', pokedexId: 151, rarity: 'mythic' as const, basePoints: 100 },
  { name: 'Celebi', type: 'psychic', color: '#90EE90', secondaryColor: '#32CD32', pokedexId: 251, rarity: 'mythic' as const, basePoints: 100 },
  { name: 'Jirachi', type: 'steel', color: '#FFD700', secondaryColor: '#FFA500', pokedexId: 385, rarity: 'mythic' as const, basePoints: 100 },
  { name: 'Deoxys', type: 'psychic', color: '#FF6347', secondaryColor: '#8B4DC9', pokedexId: 386, rarity: 'mythic' as const, basePoints: 100 },
  { name: 'Darkrai', type: 'dark', color: '#4B0082', secondaryColor: '#8B008B', pokedexId: 491, rarity: 'mythic' as const, basePoints: 100 },
  { name: 'Arceus', type: 'normal', color: '#FFFFFF', secondaryColor: '#FFD700', pokedexId: 493, rarity: 'mythic' as const, basePoints: 100 },
];

// Rarity affects speed - rarer Pokemon move faster!
// Common is 50% slower, mythic unchanged, others scaled in between
const RARITY_SPEED = {
  common: { min: 0.34, max: 0.57 },      // Very slow (easiest to catch)
  uncommon: { min: 0.79, max: 1.11 },    // Slow-medium speed
  rare: { min: 1.34, max: 1.73 },        // Medium-fast (harder to catch)
  legendary: { min: 2.04, max: 2.71 },   // Very fast (challenging!)
  mythic: { min: 2.71, max: 3.62 },      // ULTRA FAST (extremely rare & hard!)
};

interface HighScoreEntry {
  name: string;
  score: number;
  date: string;
  caughtPokemon: string[];
}

export default function PokemonCatchingGame() {
  const [score, setScore] = useState(0);
  const [caughtPokemon, setCaughtPokemon] = useState<string[]>([]);
  const [activePokemon, setActivePokemon] = useState<Pokemon[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [message, setMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes in seconds
  const [highScores, setHighScores] = useState<HighScoreEntry[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showNameInput, setShowNameInput] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<HighScoreEntry | null>(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [activePowerUpBalls, setActivePowerUpBalls] = useState<PowerUpBall[]>([]);
  const [currentBallType, setCurrentBallType] = useState<BallType>('poke-ball');
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);
  const gameAreaRef = React.useRef<HTMLDivElement>(null);

  // Create a single AudioContext to reuse (performance optimization)
  const audioContextRef = React.useRef<AudioContext | null>(null);

  // Store message timeout to prevent premature clearing
  const messageTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Initialize AudioContext once
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Preload all Pokemon images and ball sprites on mount
  useEffect(() => {
    const preloadImages = async () => {
      // Preload all Pokemon images
      const pokemonImagePromises = POKEMON_TYPES.map((pokemon) => {
        return new Promise((resolve, reject) => {
          const img = new window.Image();
          img.crossOrigin = 'anonymous';
          img.onload = resolve;
          img.onerror = reject;
          img.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.pokedexId}.png`;
        });
      });

      // Preload all ball sprites
      const ballImagePromises = Object.values(BALL_TYPES).map((ball) => {
        return new Promise((resolve, reject) => {
          const img = new window.Image();
          img.crossOrigin = 'anonymous';
          img.onload = resolve;
          img.onerror = reject;
          img.src = ball.sprite;
        });
      });

      try {
        await Promise.all([...pokemonImagePromises, ...ballImagePromises]);
        setImagesLoaded(true);
      } catch (error) {
        console.error('Failed to preload some images:', error);
        // Still mark as loaded even if some images failed
        setImagesLoaded(true);
      }
    };

    preloadImages();
  }, []);

  // Load high scores from API on mount
  useEffect(() => {
    const fetchHighScores = async () => {
      try {
        const response = await fetch('/api/pokemon-high-scores');
        const data = await response.json();
        if (data.highScores) {
          setHighScores(data.highScores);
        }
      } catch (error) {
        console.error('Failed to load high scores:', error);
        // Fallback to empty array on error
        setHighScores([]);
      }
    };
    fetchHighScores();
  }, []);

  // Prevent force-click/Look Up on macOS
  useEffect(() => {
    const gameArea = gameAreaRef.current;
    if (!gameArea) return;

    const preventForceClick = (e: Event) => {
      e.preventDefault();
    };

    // Prevent webkit force events (macOS force-click)
    gameArea.addEventListener('webkitmouseforcedown', preventForceClick);
    gameArea.addEventListener('webkitmouseforcechanged', preventForceClick);

    return () => {
      gameArea.removeEventListener('webkitmouseforcedown', preventForceClick);
      gameArea.removeEventListener('webkitmouseforcechanged', preventForceClick);
    };
  }, []);

  // Track mouse position for custom cursor
  useEffect(() => {
    const gameArea = gameAreaRef.current;
    if (!gameArea) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = gameArea.getBoundingClientRect();
      setCursorPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };

    const handleMouseEnter = (e: MouseEvent) => {
      const rect = gameArea.getBoundingClientRect();
      setCursorPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };

    const handleMouseLeave = () => {
      setCursorPosition(null);
    };

    gameArea.addEventListener('mousemove', handleMouseMove);
    gameArea.addEventListener('mouseenter', handleMouseEnter);
    gameArea.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      gameArea.removeEventListener('mousemove', handleMouseMove);
      gameArea.removeEventListener('mouseenter', handleMouseEnter);
      gameArea.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // Spawn a new Pokemon
  const spawnPokemon = useCallback(() => {
    const randomType = POKEMON_TYPES[Math.floor(Math.random() * POKEMON_TYPES.length)];
    const speedRange = RARITY_SPEED[randomType.rarity];
    const speed = Math.random() * (speedRange.max - speedRange.min) + speedRange.min;

    const newPokemon: Pokemon = {
      id: Date.now() + Math.random(),
      name: randomType.name,
      type: randomType.type,
      color: randomType.color,
      secondaryColor: randomType.secondaryColor,
      pokedexId: randomType.pokedexId,
      rarity: randomType.rarity,
      basePoints: randomType.basePoints,
      x: 95, // Start from the right side of screen
      y: Math.random() * 60 + 10, // 10-70% of screen height
      speed: speed,
    };
    setActivePokemon(prev => [...prev, newPokemon]);
  }, []);

  // Spawn a power-up ball
  const spawnPowerUpBall = useCallback(() => {
    const ballTypes: BallType[] = ['great-ball', 'ultra-ball', 'luxury-ball', 'master-ball'];
    const randomBallType = ballTypes[Math.floor(Math.random() * ballTypes.length)];
    const ballConfig = BALL_TYPES[randomBallType];

    const newPowerUpBall: PowerUpBall = {
      id: Date.now() + Math.random(),
      ballType: randomBallType,
      x: 95, // Start from the right side of screen
      y: Math.random() * 60 + 10, // 10-70% of screen height
      speed: 1.5, // Medium speed
      sizeMultiplier: ballConfig.sizeMultiplier,
      sprite: ballConfig.sprite,
    };
    setActivePowerUpBalls(prev => [...prev, newPowerUpBall]);
  }, []);

  // Game loop - spawn Pokemon periodically
  useEffect(() => {
    if (!gameStarted) return;

    const spawnInterval = setInterval(() => {
      spawnPokemon();
    }, 2000); // Spawn every 2 seconds

    return () => clearInterval(spawnInterval);
  }, [gameStarted, spawnPokemon]);

  // Game loop - spawn power-up balls periodically
  useEffect(() => {
    if (!gameStarted) return;

    const spawnInterval = setInterval(() => {
      // Spawn power-up balls less frequently (every 8 seconds)
      if (Math.random() < 0.4) { // 40% chance every 8 seconds
        spawnPowerUpBall();
      }
    }, 8000);

    return () => clearInterval(spawnInterval);
  }, [gameStarted, spawnPowerUpBall]);

  // Move Pokemon and remove if they go off screen
  useEffect(() => {
    if (!gameStarted) return;

    const moveInterval = setInterval(() => {
      setActivePokemon(prev =>
        prev
          .map(p => ({ ...p, x: p.x - p.speed }))
          .filter(p => p.x > -10) // Remove if off screen
      );
    }, 30); // Update every 30ms for smooth 60fps movement

    return () => clearInterval(moveInterval);
  }, [gameStarted]);

  // Move power-up balls and remove if they go off screen
  useEffect(() => {
    if (!gameStarted) return;

    const moveInterval = setInterval(() => {
      setActivePowerUpBalls(prev =>
        prev
          .map(b => ({ ...b, x: b.x - b.speed }))
          .filter(b => b.x > -10) // Remove if off screen
      );
    }, 30); // Update every 30ms for smooth movement

    return () => clearInterval(moveInterval);
  }, [gameStarted]);

  // Check if score qualifies for top 5
  const isTopScore = (currentScore: number) => {
    if (highScores.length < 5) return true;
    return currentScore > highScores[highScores.length - 1].score;
  };

  // Timer countdown
  useEffect(() => {
    if (!gameStarted) return;

    const timerInterval = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [gameStarted]);

  // Handle game over when timer reaches 0
  useEffect(() => {
    if (!gameStarted || timeLeft > 0) return;

    setGameStarted(false);
    setActivePokemon([]);

    // Check if it's a high score
    if (isTopScore(score)) {
      setMessage('🎉 New High Score! Enter your name!');
      setShowNameInput(true);
    } else {
      setMessage('⏰ Time\'s up! Final score: ' + score);
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
      messageTimeoutRef.current = setTimeout(() => setMessage(''), 3000);
    }
  }, [gameStarted, timeLeft, score, highScores, isTopScore]);

  // Play pokeball throw sound (on every tap)
  const playThrowSound = () => {
    const audioContext = audioContextRef.current;
    if (!audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  };

  // Play capture success sound
  const playCaptureSound = () => {
    const audioContext = audioContextRef.current;
    if (!audioContext) return;

    const gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);

    // Create a happy "success" arpeggio
    const notes = [523.25, 659.25, 783.99]; // C, E, G
    notes.forEach((freq, i) => {
      const oscillator = audioContext.createOscillator();
      oscillator.connect(gainNode);
      oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
      oscillator.start(audioContext.currentTime + i * 0.1);
      oscillator.stop(audioContext.currentTime + i * 0.1 + 0.2);
    });

    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
  };

  const catchPokemon = (pokemon: Pokemon, event?: React.MouseEvent) => {
    // Stop event propagation to prevent game area click
    event?.stopPropagation();

    // Play capture success sound immediately (before state updates)
    playCaptureSound();

    // Calculate points based on rarity
    const pointsEarned = pokemon.basePoints;

    // Batch all state updates together
    React.startTransition(() => {
      // Remove the caught Pokemon
      setActivePokemon(prev => prev.filter(p => p.id !== pokemon.id));

      // Add to caught collection
      setCaughtPokemon(prev => [...prev, pokemon.name]);

      // Update score
      setScore(prev => prev + pointsEarned);

      // Show message with rarity badge
      const rarityEmoji = {
        common: '⚪',
        uncommon: '🟢',
        rare: '🔵',
        legendary: '🟡',
        mythic: '💎'
      };

      setMessage(`${rarityEmoji[pokemon.rarity]} You caught ${pokemon.name}! +${pointsEarned} points!`);

      // Clear any existing timeout to prevent premature message clearing
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
      messageTimeoutRef.current = setTimeout(() => setMessage(''), 2000);
    });
  };

  const catchPowerUpBall = (ball: PowerUpBall, event?: React.MouseEvent) => {
    // Stop event propagation to prevent game area click
    event?.stopPropagation();

    // Play capture success sound
    playCaptureSound();

    // Batch all state updates together
    React.startTransition(() => {
      // Remove the caught power-up ball
      setActivePowerUpBalls(prev => prev.filter(b => b.id !== ball.id));

      // Update current ball type
      setCurrentBallType(ball.ballType);

      // Show message
      const ballName = BALL_TYPES[ball.ballType].name;
      setMessage(`⚡ You got a ${ballName}! Cursor size: ${ball.sizeMultiplier}x`);

      // Clear any existing timeout to prevent premature message clearing
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
      messageTimeoutRef.current = setTimeout(() => setMessage(''), 2000);
    });
  };

  // Circle-Rectangle collision detection
  const circleRectangleCollision = (
    circleX: number,
    circleY: number,
    radius: number,
    rectX: number,
    rectY: number,
    rectWidth: number,
    rectHeight: number
  ): boolean => {
    // Find the closest point on the rectangle to the circle's center
    const closestX = Math.max(rectX, Math.min(circleX, rectX + rectWidth));
    const closestY = Math.max(rectY, Math.min(circleY, rectY + rectHeight));

    // Calculate the distance from the circle's center to this closest point
    const dx = circleX - closestX;
    const dy = circleY - closestY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // If the distance is less than the circle's radius, they overlap
    return distance <= radius;
  };

  // Handle clicks on the game area with cursor size-based collision detection
  const handleGameAreaClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!gameStarted || !gameAreaRef.current) return;

    playThrowSound();

    const rect = gameAreaRef.current.getBoundingClientRect();

    // Work in pixels for accurate collision detection
    const clickXPixels = event.clientX - rect.left;
    const clickYPixels = event.clientY - rect.top;

    // Cursor is 40px * sizeMultiplier, so radius is 20px * sizeMultiplier * 0.85
    // For larger balls, apply an additional 0.9 multiplier
    const baseRadius = 20 * BALL_TYPES[currentBallType].sizeMultiplier * 0.85;
    const cursorRadius = currentBallType === 'poke-ball' ? baseRadius : baseRadius * 0.9;

    // Pokemon are 100px x 100px images
    const pokemonWidth = 100;
    const pokemonHeight = 100;

    // Check if cursor (circle) overlaps with any Pokemon (rectangle)
    const pokemonInRange = activePokemon.filter(pokemon => {
      // Convert Pokemon position from percentage to pixels
      // pokemon.x and pokemon.y represent the TOP-LEFT corner (from CSS left/top)
      const pokemonRectX = (pokemon.x / 100) * rect.width;
      const pokemonRectY = (pokemon.y / 100) * rect.height;

      return circleRectangleCollision(
        clickXPixels,
        clickYPixels,
        cursorRadius,
        pokemonRectX,
        pokemonRectY,
        pokemonWidth,
        pokemonHeight
      );
    });

    // Catch the closest Pokemon if any are in range
    if (pokemonInRange.length > 0) {
      const closest = pokemonInRange.reduce((prev, curr) => {
        // Calculate distance to center of each Pokemon for comparison
        const prevCenterX = (prev.x / 100) * rect.width + pokemonWidth / 2;
        const prevCenterY = (prev.y / 100) * rect.height + pokemonHeight / 2;
        const currCenterX = (curr.x / 100) * rect.width + pokemonWidth / 2;
        const currCenterY = (curr.y / 100) * rect.height + pokemonHeight / 2;

        const prevDist = Math.sqrt((clickXPixels - prevCenterX) ** 2 + (clickYPixels - prevCenterY) ** 2);
        const currDist = Math.sqrt((clickXPixels - currCenterX) ** 2 + (clickYPixels - currCenterY) ** 2);
        return currDist < prevDist ? curr : prev;
      });
      catchPokemon(closest);
      return; // Don't check power-up balls if we caught a Pokemon
    }

    // Power-up balls dimensions
    const powerUpBallWidth = 40;
    const powerUpBallHeight = 40;

    // Check if cursor (circle) overlaps with any power-up balls (rectangle)
    const ballsInRange = activePowerUpBalls.filter(ball => {
      // Convert ball position from percentage to pixels
      // ball.x and ball.y represent the TOP-LEFT corner (from CSS left/top)
      const ballRectWidth = powerUpBallWidth * ball.sizeMultiplier;
      const ballRectHeight = powerUpBallHeight * ball.sizeMultiplier;
      const ballRectX = (ball.x / 100) * rect.width;
      const ballRectY = (ball.y / 100) * rect.height;

      return circleRectangleCollision(
        clickXPixels,
        clickYPixels,
        cursorRadius,
        ballRectX,
        ballRectY,
        ballRectWidth,
        ballRectHeight
      );
    });

    // Catch the closest power-up ball if any are in range
    if (ballsInRange.length > 0) {
      const closest = ballsInRange.reduce((prev, curr) => {
        // Calculate distance to center of each ball for comparison
        const prevWidth = powerUpBallWidth * prev.sizeMultiplier;
        const prevHeight = powerUpBallHeight * prev.sizeMultiplier;
        const prevCenterX = (prev.x / 100) * rect.width + prevWidth / 2;
        const prevCenterY = (prev.y / 100) * rect.height + prevHeight / 2;

        const currWidth = powerUpBallWidth * curr.sizeMultiplier;
        const currHeight = powerUpBallHeight * curr.sizeMultiplier;
        const currCenterX = (curr.x / 100) * rect.width + currWidth / 2;
        const currCenterY = (curr.y / 100) * rect.height + currHeight / 2;

        const prevDist = Math.sqrt((clickXPixels - prevCenterX) ** 2 + (clickYPixels - prevCenterY) ** 2);
        const currDist = Math.sqrt((clickXPixels - currCenterX) ** 2 + (clickYPixels - currCenterY) ** 2);
        return currDist < prevDist ? curr : prev;
      });
      catchPowerUpBall(closest);
    }
  };

  const startGame = () => {
    setGameStarted(true);
    setScore(0);
    setCaughtPokemon([]);
    setActivePokemon([]);
    setActivePowerUpBalls([]);
    setCurrentBallType('poke-ball'); // Reset to standard ball
    setMessage('');
    setTimeLeft(120); // Reset timer to 2 minutes
    spawnPokemon(); // Spawn first Pokemon immediately
  };

  const stopGame = () => {
    setGameStarted(false);
    setActivePokemon([]);
    setActivePowerUpBalls([]);
  };

  // Save high score
  const saveHighScore = async (name: string) => {
    const newEntry: HighScoreEntry = {
      name: name || 'Anonymous',
      score: score,
      date: new Date().toLocaleDateString(),
      caughtPokemon: caughtPokemon
    };

    try {
      const response = await fetch('/api/pokemon-high-scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newEntry),
      });

      const data = await response.json();
      
      if (data.success && data.highScores) {
        setHighScores(data.highScores);
        setShowNameInput(false);
        setPlayerName('');
        setMessage('🏆 High score saved! Check the leaderboard!');
        if (messageTimeoutRef.current) {
          clearTimeout(messageTimeoutRef.current);
        }
        messageTimeoutRef.current = setTimeout(() => setMessage(''), 3000);
      } else {
        throw new Error(data.error || 'Failed to save high score');
      }
    } catch (error) {
      console.error('Failed to save high score:', error);
      setMessage('❌ Failed to save high score. Please try again.');
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
      messageTimeoutRef.current = setTimeout(() => setMessage(''), 3000);
    }
  };

  // Handle name submission
  const handleNameSubmit = async () => {
    if (playerName.trim()) {
      await saveHighScore(playerName.trim());
    }
  };

  // Count how many of each Pokemon was caught
  const pokemonCounts = caughtPokemon.reduce((acc, name) => {
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom, #87CEEB 0%, #98D8C8 100%)',
      padding: '12px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      WebkitTouchCallout: 'none',
      msUserSelect: 'none',
      MozUserSelect: 'none',
    }}>
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '12px'
      }}>
        <Link
          href="/"
          style={{
            position: 'absolute',
            left: 0,
            color: '#333',
            textDecoration: 'none',
            fontSize: '18px',
            fontWeight: 600,
          }}
        >
          ← Back to Menu
        </Link>
        <h1 style={{
          fontSize: '48px',
          margin: 0,
          color: '#FFF',
          textShadow: '3px 3px 6px rgba(0,0,0,0.3)'
        }}>
          Pokemon Catch
        </h1>
      </div>

      {/* Score and Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '20px',
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        <div style={{
          background: '#FFF',
          padding: '16px 32px',
          borderRadius: '12px',
          boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#333'
        }}>
          Score: {score}
        </div>
        <div style={{
          background: '#FFF',
          padding: '16px 32px',
          borderRadius: '12px',
          boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#333'
        }}>
          High Score: {highScores.length > 0 ? highScores[0].score : 0}
        </div>
        <div style={{
          background: timeLeft <= 10 ? '#FF6B6B' : '#FFF',
          padding: '16px 32px',
          borderRadius: '12px',
          boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
          fontSize: '24px',
          fontWeight: 'bold',
          color: timeLeft <= 10 ? '#FFF' : '#333',
          minWidth: '150px',
          textAlign: 'center',
        }}>
          ⏱️ {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
        </div>
        <button
          onClick={gameStarted ? stopGame : startGame}
          disabled={!imagesLoaded && !gameStarted}
          style={{
            padding: '16px 32px',
            fontSize: '20px',
            fontWeight: 'bold',
            borderRadius: '12px',
            border: 'none',
            background: !imagesLoaded && !gameStarted ? '#999' : '#333',
            color: '#FFF',
            cursor: !imagesLoaded && !gameStarted ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            transition: 'transform 0.1s',
            opacity: !imagesLoaded && !gameStarted ? 0.6 : 1,
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          {!imagesLoaded && !gameStarted ? '⏳ Loading...' : gameStarted ? '⏸️ Stop Game' : '▶️ Start Game'}
        </button>
        <button
          onClick={() => setShowLeaderboard(!showLeaderboard)}
          style={{
            padding: '16px 32px',
            fontSize: '20px',
            fontWeight: 'bold',
            borderRadius: '12px',
            border: 'none',
            background: '#333',
            color: '#FFF',
            cursor: 'pointer',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            transition: 'transform 0.1s',
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          🏆 Leaderboard
        </button>
      </div>

      {/* Message Display Area */}
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        borderRadius: '12px',
        padding: '16px 24px',
        marginBottom: '24px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        minHeight: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {message ? (
          <div style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#4CAF50',
            textAlign: 'center',
            animation: 'fadeIn 0.3s ease',
          }}>
            {message}
          </div>
        ) : (
          <div style={{
            fontSize: '16px',
            color: '#999',
            textAlign: 'center',
            fontStyle: 'italic',
          }}>
            {gameStarted ? 'Click Pokemon to catch them!' : 'Press Start Game to begin catching Pokemon!'}
          </div>
        )}
      </div>

      {/* Game Area and Collection Container */}
      <div style={{
        display: 'flex',
        gap: '24px',
        alignItems: 'flex-start',
      }}>
        {/* Game Area */}
        <div
          ref={gameAreaRef}
          onClick={handleGameAreaClick}
          onContextMenu={(e) => e.preventDefault()}
          onTouchStart={(e) => {
            // Prevent long-press behaviors on mobile
            if (e.touches.length > 1) {
              e.preventDefault();
            }
          }}
          style={{
            flex: '1',
            position: 'relative',
            background: 'rgba(255,255,255,0.3)',
            borderRadius: '16px',
            minHeight: '500px',
            overflow: 'hidden',
            border: '4px solid rgba(255,255,255,0.6)',
            cursor: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            WebkitTouchCallout: 'none',
            msUserSelect: 'none',
            MozUserSelect: 'none',
            touchAction: 'manipulation',
          }}>
        {!gameStarted && activePokemon.length === 0 && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '28px',
            color: '#FFF',
            textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
            textAlign: 'center',
          }}>
            Click &quot;Start Game&quot; to begin catching Pokemon! 🎯
          </div>
        )}

        {activePokemon.map(pokemon => {
          const rarityColors = {
            common: '#9E9E9E',
            uncommon: '#4CAF50',
            rare: '#2196F3',
            legendary: '#FFD700',
            mythic: '#FF00FF'
          };

          return (
            <div
              key={pokemon.id}
              onContextMenu={(e) => e.preventDefault()}
              onTouchStart={(e) => {
                // Prevent long-press on Pokemon
                e.stopPropagation();
              }}
              style={{
                position: 'absolute',
                left: `${pokemon.x}%`,
                top: `${pokemon.y}%`,
                pointerEvents: 'none',
                transition: 'transform 0.1s',
                animation: 'float 2s ease-in-out infinite',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                WebkitTouchCallout: 'none',
                touchAction: 'manipulation',
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{ position: 'relative' }}>
                <Image
                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.pokedexId}.png`}
                  alt={pokemon.name}
                  width={100}
                  height={100}
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                  onContextMenu={(e) => e.preventDefault()}
                  unoptimized
                  style={{
                    filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))',
                    imageRendering: 'auto',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    pointerEvents: 'none',
                  }}
                />
                {/* Rarity Badge */}
                <div style={{
                  position: 'absolute',
                  top: '-5px',
                  right: '-5px',
                  background: rarityColors[pokemon.rarity],
                  color: '#FFF',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  border: '2px solid #FFF',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                }}>
                  {pokemon.basePoints}
                </div>
              </div>
            </div>
          );
        })}

        {/* Render power-up balls */}
        {activePowerUpBalls.map(ball => (
          <div
            key={ball.id}
            onContextMenu={(e) => e.preventDefault()}
            onTouchStart={(e) => {
              e.stopPropagation();
            }}
            style={{
              position: 'absolute',
              left: `${ball.x}%`,
              top: `${ball.y}%`,
              pointerEvents: 'none',
              transition: 'transform 0.1s',
              animation: 'float 2s ease-in-out infinite',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none',
              touchAction: 'manipulation',
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2) rotate(10deg)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1) rotate(0deg)'}
          >
            <div style={{ position: 'relative' }}>
              <Image
                src={ball.sprite}
                alt={BALL_TYPES[ball.ballType].name}
                width={40 * ball.sizeMultiplier}
                height={40 * ball.sizeMultiplier}
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                onContextMenu={(e) => e.preventDefault()}
                unoptimized
                style={{
                  filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3)) brightness(1.1)',
                  imageRendering: 'auto',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  pointerEvents: 'none',
                }}
              />
              {/* Sparkle effect to indicate it's a power-up */}
              <div style={{
                position: 'absolute',
                top: '-5px',
                right: '-5px',
                fontSize: '20px',
                animation: 'sparkle 1s ease-in-out infinite',
              }}>
                ✨
              </div>
            </div>
          </div>
        ))}

        {/* Custom Cursor */}
        {cursorPosition && (
          <div
            style={{
              position: 'absolute',
              left: cursorPosition.x,
              top: cursorPosition.y,
              pointerEvents: 'none',
              transform: 'translate(-50%, -50%)',
              zIndex: 10000,
            }}
          >
            <Image
              src={BALL_TYPES[currentBallType].sprite}
              alt={BALL_TYPES[currentBallType].name}
              width={40 * BALL_TYPES[currentBallType].sizeMultiplier}
              height={40 * BALL_TYPES[currentBallType].sizeMultiplier}
              unoptimized
              style={{
                filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.5))',
                imageRendering: 'auto',
              }}
            />
          </div>
        )}
        </div>

        {/* Collection Display */}
        <div style={{
          width: '320px',
          background: '#FFF',
          borderRadius: '16px',
          padding: '16px',
          boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
          maxHeight: '500px',
          overflowY: 'auto',
        }}>
          <h2 style={{
            margin: '0 0 12px 0',
            color: '#333',
            fontSize: '18px',
            textAlign: 'center',
          }}>
            🏆 Collection ({caughtPokemon.length})
          </h2>

          {Object.keys(pokemonCounts).length === 0 ? (
            <p style={{ fontSize: '14px', color: '#666', textAlign: 'center' }}>
              No Pokemon caught yet!
            </p>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
            }}>
            {Object.entries(pokemonCounts).map(([name, count]) => {
              const pokemonType = POKEMON_TYPES.find(p => p.name === name);
              return (
                <div
                  key={name}
                  style={{
                    background: `linear-gradient(135deg, ${pokemonType?.color} 0%, ${pokemonType?.secondaryColor} 100%)`,
                    borderRadius: '8px',
                    padding: '8px',
                    textAlign: 'center',
                    color: '#FFF',
                    fontWeight: 'bold',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '50px',
                    marginBottom: '4px'
                  }}>
                    <Image
                      src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonType?.pokedexId}.png`}
                      alt={name}
                      width={50}
                      height={50}
                      unoptimized
                      style={{
                        imageRendering: 'auto',
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '11px', marginTop: '4px', textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}>
                    {name}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    marginTop: '2px',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
                  }}>
                    × {count}
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>
      </div>

      {/* Name Input Modal */}
      {showNameInput && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#FFF',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
          }}>
            <h2 style={{
              margin: '0 0 16px 0',
              fontSize: '28px',
              color: '#333',
              textAlign: 'center',
            }}>
              🎉 New High Score!
            </h2>
            <p style={{
              fontSize: '18px',
              color: '#666',
              textAlign: 'center',
              marginBottom: '24px',
            }}>
              You scored {score} points!<br/>Enter your name:
            </p>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleNameSubmit()}
              placeholder="Your name"
              autoFocus
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '18px',
                borderRadius: '8px',
                border: '2px solid #ddd',
                marginBottom: '16px',
                boxSizing: 'border-box',
              }}
            />
            <button
              onClick={handleNameSubmit}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '18px',
                fontWeight: 'bold',
                borderRadius: '8px',
                border: 'none',
                background: '#333',
                color: '#FFF',
                cursor: 'pointer',
              }}
            >
              Save Score
            </button>
          </div>
        </div>
      )}

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}
        onClick={() => setShowLeaderboard(false)}
        >
          <div style={{
            background: '#FFF',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{
              margin: '0 0 24px 0',
              fontSize: '32px',
              color: '#333',
              textAlign: 'center',
            }}>
              🏆 Top 5 Leaderboard
            </h2>
            {highScores.length === 0 ? (
              <p style={{
                fontSize: '18px',
                color: '#666',
                textAlign: 'center',
              }}>
                No high scores yet. Be the first!
              </p>
            ) : (
              <div>
                {highScores.map((entry, index) => (
                  <div
                    key={index}
                    onClick={() => setSelectedEntry(entry)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      marginBottom: '8px',
                      background: index === 0 ? '#FFD700' : '#f5f5f5',
                      borderRadius: '8px',
                      color: index === 0 ? '#FFF' : '#333',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'transform 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <span style={{ fontSize: '20px', minWidth: '40px' }}>
                      {index + 1}.
                    </span>
                    <span style={{ flex: 1, fontSize: '18px' }}>
                      {entry.name}
                    </span>
                    <span style={{ fontSize: '18px' }}>
                      {entry.score} pts
                    </span>
                    <span style={{ fontSize: '12px', marginLeft: '12px', opacity: 0.7 }}>
                      {entry.date}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowLeaderboard(false)}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '18px',
                fontWeight: 'bold',
                borderRadius: '8px',
                border: 'none',
                background: '#333',
                color: '#FFF',
                cursor: 'pointer',
                marginTop: '16px',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Collection Modal */}
      {selectedEntry && (
        <div
          onClick={() => setSelectedEntry(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1001,
          }}
        >
          <div
            style={{
              background: '#FFF',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '1200px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{
              margin: '0 0 16px 0',
              fontSize: '28px',
              color: '#333',
              textAlign: 'center',
            }}>
              {selectedEntry.name}&apos;s Collection
            </h2>
            <p style={{
              textAlign: 'center',
              fontSize: '18px',
              color: '#666',
              marginBottom: '24px',
            }}>
              Score: {selectedEntry.score} pts • {selectedEntry.date}
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
              gap: '12px',
            }}>
              {Object.entries(
                selectedEntry.caughtPokemon.reduce((acc, name) => {
                  acc[name] = (acc[name] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              )
              .sort(([nameA], [nameB]) => nameA.localeCompare(nameB))
              .map(([pokemonName, count]) => {
                const pokemonData = POKEMON_TYPES.find(p => p.name === pokemonName);
                if (!pokemonData) return null;

                return (
                  <div
                    key={pokemonName}
                    style={{
                      textAlign: 'center',
                      padding: '8px',
                      background: `linear-gradient(135deg, ${pokemonData.color} 0%, ${pokemonData.secondaryColor} 100%)`,
                      borderRadius: '8px',
                      position: 'relative',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    }}
                  >
                    <Image
                      src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonData.pokedexId}.png`}
                      alt={pokemonName}
                      width={80}
                      height={80}
                      unoptimized
                      style={{
                        margin: '0 auto',
                        display: 'block'
                      }}
                    />
                    <div style={{
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: '#FFF',
                      marginTop: '4px',
                      textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                    }}>
                      {pokemonName}
                    </div>
                    <div style={{
                      fontSize: '10px',
                      color: '#FFF',
                      marginTop: '2px',
                      textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                      textTransform: 'capitalize',
                      opacity: 0.9,
                    }}>
                      {pokemonData.rarity}
                    </div>
                    {count > 1 && (
                      <div style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        background: 'rgba(0,0,0,0.7)',
                        color: '#FFF',
                        borderRadius: '12px',
                        padding: '4px 8px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                      }}>
                        ×{count}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => setSelectedEntry(null)}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '18px',
                fontWeight: 'bold',
                borderRadius: '8px',
                border: 'none',
                background: '#333',
                color: '#FFF',
                cursor: 'pointer',
                marginTop: '24px',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        @keyframes fadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        @keyframes sparkle {
          0%, 100% {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.3) rotate(180deg);
          }
        }
      `}</style>
    </div>
  );
}
