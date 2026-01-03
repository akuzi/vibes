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
  const gameAreaRef = React.useRef<HTMLDivElement>(null);

  // Load high scores from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('pokemonHighScores');
    if (saved) {
      setHighScores(JSON.parse(saved));
    }
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

  // Game loop - spawn Pokemon periodically
  useEffect(() => {
    if (!gameStarted) return;

    const spawnInterval = setInterval(() => {
      spawnPokemon();
    }, 2000); // Spawn every 2 seconds

    return () => clearInterval(spawnInterval);
  }, [gameStarted, spawnPokemon]);

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

  // Check if score qualifies for top 5
  const isTopScore = (currentScore: number) => {
    if (highScores.length < 5) return true;
    return currentScore > highScores[highScores.length - 1].score;
  };

  // Timer countdown
  useEffect(() => {
    if (!gameStarted) return;
    if (timeLeft <= 0) {
      setGameStarted(false);
      setActivePokemon([]);

      // Check if it's a high score
      if (isTopScore(score)) {
        setMessage('🎉 New High Score! Enter your name!');
        setShowNameInput(true);
      } else {
        setMessage('⏰ Time\'s up! Final score: ' + score);
        setTimeout(() => setMessage(''), 3000);
      }
      return;
    }

    const timerInterval = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [gameStarted, timeLeft, score, highScores, isTopScore]);

  // Play pokeball throw sound (on every tap)
  const playThrowSound = () => {
    const audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
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
    const audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
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

  const catchPokemon = (pokemon: Pokemon) => {
    // Remove the caught Pokemon
    setActivePokemon(prev => prev.filter(p => p.id !== pokemon.id));

    // Add to caught collection
    setCaughtPokemon(prev => [...prev, pokemon.name]);

    // Calculate points based on rarity
    const pointsEarned = pokemon.basePoints;
    const newScore = score + pointsEarned;
    setScore(newScore);

    // Play capture success sound
    playCaptureSound();

    // Show message with rarity badge
    const rarityEmoji = {
      common: '⚪',
      uncommon: '🟢',
      rare: '🔵',
      legendary: '🟡',
      mythic: '💎'
    };

    setMessage(`${rarityEmoji[pokemon.rarity]} You caught ${pokemon.name}! +${pointsEarned} points!`);
    setTimeout(() => setMessage(''), 2000);
  };

  const startGame = () => {
    setGameStarted(true);
    setScore(0);
    setCaughtPokemon([]);
    setActivePokemon([]);
    setMessage('');
    setTimeLeft(120); // Reset timer to 2 minutes
    spawnPokemon(); // Spawn first Pokemon immediately
  };

  const stopGame = () => {
    setGameStarted(false);
    setActivePokemon([]);
  };

  // Save high score
  const saveHighScore = (name: string) => {
    const newEntry: HighScoreEntry = {
      name: name || 'Anonymous',
      score: score,
      date: new Date().toLocaleDateString(),
      caughtPokemon: caughtPokemon
    };

    const updatedScores = [...highScores, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    setHighScores(updatedScores);
    localStorage.setItem('pokemonHighScores', JSON.stringify(updatedScores));
    setShowNameInput(false);
    setPlayerName('');
    setMessage('🏆 High score saved! Check the leaderboard!');
    setTimeout(() => setMessage(''), 3000);
  };

  // Handle name submission
  const handleNameSubmit = () => {
    if (playerName.trim()) {
      saveHighScore(playerName.trim());
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
      padding: '24px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      WebkitTouchCallout: 'none',
      msUserSelect: 'none',
      MozUserSelect: 'none',
    }}>
      <Link
        href="/"
        style={{
          color: '#333',
          textDecoration: 'none',
          fontSize: '18px',
          fontWeight: 600,
          display: 'inline-block',
          marginBottom: '20px'
        }}
      >
        ← Back to Menu
      </Link>

      <div style={{
        textAlign: 'center',
        marginBottom: '24px'
      }}>
        <h1 style={{
          fontSize: '48px',
          margin: 0,
          color: '#FFF',
          textShadow: '3px 3px 6px rgba(0,0,0,0.3)'
        }}>
          🎮 Pokemon Catching Adventure! 🎮
        </h1>
        <p style={{
          fontSize: '20px',
          color: '#FFF',
          marginTop: '12px',
          textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
        }}>
          Click on the Pokemon to catch them before they escape!
        </p>
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
          background: '#FFD700',
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
          background: timeLeft <= 10 ? '#FF6B6B' : '#4169E1',
          padding: '16px 32px',
          borderRadius: '12px',
          boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#FFF',
          minWidth: '150px',
          textAlign: 'center',
        }}>
          ⏱️ {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
        </div>
        <button
          onClick={gameStarted ? stopGame : startGame}
          style={{
            padding: '16px 32px',
            fontSize: '20px',
            fontWeight: 'bold',
            borderRadius: '12px',
            border: 'none',
            background: gameStarted ? '#FF4444' : '#4CAF50',
            color: '#FFF',
            cursor: 'pointer',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            transition: 'transform 0.1s',
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          {gameStarted ? '⏸️ Stop Game' : '▶️ Start Game'}
        </button>
        <button
          onClick={() => setShowLeaderboard(!showLeaderboard)}
          style={{
            padding: '16px 32px',
            fontSize: '20px',
            fontWeight: 'bold',
            borderRadius: '12px',
            border: 'none',
            background: '#9C27B0',
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
            animation: 'bounce 0.5s ease',
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
          onClick={playThrowSound}
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
            cursor: 'url(https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png) 12 12, pointer',
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
              onClick={() => catchPokemon(pokemon)}
              onContextMenu={(e) => e.preventDefault()}
              onTouchStart={(e) => {
                // Prevent long-press on Pokemon
                e.stopPropagation();
              }}
              style={{
                position: 'absolute',
                left: `${pokemon.x}%`,
                top: `${pokemon.y}%`,
                cursor: 'pointer',
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
                  style={{
                    filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))',
                    imageRendering: 'auto',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    pointerEvents: 'none',
                  }}
                  unoptimized
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
                      style={{
                        imageRendering: 'auto',
                      }}
                      unoptimized
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
                background: '#4CAF50',
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
                      background: index < 3 ? ['#FFD700', '#C0C0C0', '#CD7F32'][index] : '#f5f5f5',
                      borderRadius: '8px',
                      color: index < 3 ? '#FFF' : '#333',
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
                background: '#9C27B0',
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
              maxWidth: '600px',
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
              gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
              gap: '16px',
            }}>
              {selectedEntry.caughtPokemon.map((pokemonName, idx) => {
                const pokemonData = POKEMON_TYPES.find(p => p.name === pokemonName);
                if (!pokemonData) return null;

                return (
                  <div
                    key={idx}
                    style={{
                      textAlign: 'center',
                      padding: '8px',
                      background: '#f5f5f5',
                      borderRadius: '8px',
                    }}
                  >
                    <Image
                      src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonData.pokedexId}.png`}
                      alt={pokemonName}
                      width={80}
                      height={80}
                      style={{
                        margin: '0 auto',
                        display: 'block'
                      }}
                      unoptimized
                    />
                    <div style={{
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: '#333',
                      marginTop: '4px',
                    }}>
                      {pokemonName}
                    </div>
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
                background: '#4CAF50',
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

        @keyframes bounce {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.1); }
        }
      `}</style>
    </div>
  );
}
