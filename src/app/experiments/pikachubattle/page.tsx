"use client";
import Image from 'next/image';
import Link from 'next/link';
import React, { useState } from 'react';

const PIKACHU_HP = 80;
const GENGAR_HP = 90;
const PIKACHU_ATTACKS = [
  { name: 'Thunderbolt', damage: 30, accuracy: 90 },
  { name: 'Quick Attack', damage: 10, accuracy: 100 },
  { name: 'Iron Tail', damage: 20, accuracy: 75 },
  { name: 'Electro Ball', damage: 25, accuracy: 85 },
];
const GENGAR_ATTACKS = [
  { name: 'Shadow Ball', damage: 30, accuracy: 90 },
  { name: 'Sludge Bomb', damage: 25, accuracy: 85 },
  { name: 'Dark Pulse', damage: 20, accuracy: 95 },
  { name: 'Dream Eater', damage: 35, accuracy: 70 },
];

export default function PikachuBattle() {
  const [pikachuHp, setPikachuHp] = useState(PIKACHU_HP);
  const [gengarHp, setGengarHp] = useState(GENGAR_HP);
  const [tossResult, setTossResult] = useState<string | null>(null);
  const [isTossing, setIsTossing] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [currentTurn, setCurrentTurn] = useState<string | null>(null);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);

  const tossCoin = () => {
    setIsTossing(true);
    setTossResult(null);
    setBattleLog([]);
    
    // Simulate coin toss animation
    setTimeout(() => {
      const result = Math.random() < 0.5 ? 'Pikachu' : 'Gengar';
      setTossResult(result);
      setCurrentTurn(result);
      setIsTossing(false);
      setGameStarted(true);
      setBattleLog([`🎲 ${result} wins the coin toss and goes first!`]);
      
      // If Gengar goes first, trigger AI decision after a short delay
      if (result === 'Gengar') {
        setTimeout(() => {
          // Force Gengar to make a decision by calling it directly
          const selectedAttack = GENGAR_ATTACKS.reduce((best, current) => {
            const currentScore = current.damage * current.accuracy / 100;
            const bestScore = best.damage * best.accuracy / 100;
            return currentScore > bestScore ? current : best;
          });
          executeAttack('Gengar', selectedAttack);
        }, 1500);
      }
    }, 1500);
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 90) return '#388e3c'; // Green for high accuracy
    if (accuracy >= 80) return '#f57c00'; // Orange for medium accuracy
    return '#d32f2f'; // Red for low accuracy
  };

  const executeAttack = (attacker: string, attack: { name: string; damage: number; accuracy: number }) => {
    if (gameOver || currentTurn !== attacker) return;

    // Check if attack hits based on accuracy
    const hitRoll = Math.random() * 100;
    const hit = hitRoll <= attack.accuracy;
    
    const newLog = [...battleLog];
    let isGameOver = false;
    let gameWinner = null;
    
    // Log the attack attempt
    newLog.push(`🎯 ${attacker} used ${attack.name}!`);
    
    if (hit) {
      // Apply damage
      if (attacker === 'Pikachu') {
        const newHp = Math.max(0, gengarHp - attack.damage);
        setGengarHp(newHp);
        newLog.push(`✅ It hit for ${attack.damage} damage!`);
        
        if (newHp <= 0) {
          isGameOver = true;
          gameWinner = 'Pikachu';
          newLog.push(`🏆 Pikachu wins the battle!`);
        } else {
          newLog.push(`👻 Gengar's HP: ${newHp}`);
        }
      } else {
        const newHp = Math.max(0, pikachuHp - attack.damage);
        setPikachuHp(newHp);
        newLog.push(`✅ It hit for ${attack.damage} damage!`);
        
        if (newHp <= 0) {
          isGameOver = true;
          gameWinner = 'Gengar';
          newLog.push(`🏆 Gengar wins the battle!`);
        } else {
          newLog.push(`⚡ Pikachu&apos;s HP: ${newHp}`);
        }
      }
    } else {
      newLog.push(`❌ But it missed!`);
    }

    // Switch turns if game isn't over
    if (!isGameOver) {
      const nextTurn = attacker === 'Pikachu' ? 'Gengar' : 'Pikachu';
      setCurrentTurn(nextTurn);
      newLog.push(`🔄 ${nextTurn}'s turn!`);
      
      // If it's Gengar's turn, make AI decision after a short delay
      if (nextTurn === 'Gengar') {
        setTimeout(() => {
          makeGengarDecision();
        }, 1000);
      }
    } else {
      setGameOver(true);
      setWinner(gameWinner);
    }

    setBattleLog(newLog);
  };

  const makeGengarDecision = () => {
    console.log('makeGengarDecision called', { currentTurn, gameOver, pikachuHp });
    
    // Check current state again to ensure it's still Gengar's turn
    if (currentTurn !== 'Gengar' || gameOver) {
      console.log('makeGengarDecision early return', { currentTurn, gameOver });
      return;
    }

    // Simple AI strategy: prefer high damage moves when opponent HP is low, otherwise balance damage and accuracy
    let selectedAttack;
    
    if (pikachuHp <= 20) {
      // If Pikachu is low on HP, go for high damage moves
      selectedAttack = GENGAR_ATTACKS.reduce((best, current) => 
        current.damage > best.damage ? current : best
      );
    } else if (pikachuHp <= 40) {
      // If Pikachu is moderately low, prefer reliable high-damage moves
      selectedAttack = GENGAR_ATTACKS.find(atk => atk.damage >= 25 && atk.accuracy >= 85) || 
                      GENGAR_ATTACKS.reduce((best, current) => 
                        (current.damage * current.accuracy / 100) > (best.damage * best.accuracy / 100) ? current : best
                      );
    } else {
      // Otherwise, prefer moves with good damage/accuracy balance
      selectedAttack = GENGAR_ATTACKS.reduce((best, current) => {
        const currentScore = current.damage * current.accuracy / 100;
        const bestScore = best.damage * best.accuracy / 100;
        return currentScore > bestScore ? current : best;
      });
    }

    console.log('Gengar selected attack:', selectedAttack);
    
    // Execute the selected attack
    executeAttack('Gengar', selectedAttack);
  };

  const resetGame = () => {
    setTossResult(null);
    setGameStarted(false);
    setCurrentTurn(null);
    setPikachuHp(PIKACHU_HP);
    setGengarHp(GENGAR_HP);
    setBattleLog([]);
    setGameOver(false);
    setWinner(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minHeight: '100vh', padding: 24 }}>
      <Link href="/experiments" style={{ marginBottom: 16, textDecoration: 'none', color: '#333', fontWeight: 500 }}>
        ← Back
      </Link>
      
      {/* Latest Battle Message Banner */}
      {gameStarted && battleLog.length > 0 && (
        <div style={{ 
          width: '100%', 
          marginBottom: 24,
          padding: '16px 20px',
          background: '#e3f2fd',
          borderRadius: '8px',
          border: '2px solid #2196f3',
          textAlign: 'center',
          fontSize: 18,
          fontWeight: 600,
          color: '#1976d2',
          boxShadow: '0 2px 8px rgba(33, 150, 243, 0.2)'
        }}>
          {battleLog[battleLog.length - 1]}
        </div>
      )}
      
      {/* Coin Toss Section */}
      {!gameStarted && (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          width: '100%', 
          marginBottom: 32,
          padding: '24px',
          background: '#f8f9fa',
          borderRadius: '12px',
          border: '2px solid #e9ecef'
        }}>
          <h2 style={{ marginBottom: 16, color: '#495057' }}>Battle Start!</h2>
          <p style={{ marginBottom: 24, color: '#6c757d', textAlign: 'center' }}>
            Toss the coin to see which Pokémon goes first!
          </p>
          
          <button
            onClick={tossCoin}
            disabled={isTossing}
            style={{
              padding: '12px 24px',
              fontSize: 18,
              fontWeight: 600,
              borderRadius: '8px',
              border: 'none',
              background: isTossing ? '#6c757d' : '#007bff',
              color: 'white',
              cursor: isTossing ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
              minWidth: '120px'
            }}
          >
            {isTossing ? 'Tossing...' : 'Toss Coin'}
          </button>
          
          {isTossing && (
            <div style={{ marginTop: 16, fontSize: 16, color: '#6c757d' }}>
              🪙 The coin is spinning...
            </div>
          )}
          
          {tossResult && (
            <div style={{ 
              marginTop: 16, 
              padding: '12px 24px',
              background: tossResult === 'Pikachu' ? '#fffbe7' : '#f3e7ff',
              borderRadius: '8px',
              border: `2px solid ${tossResult === 'Pikachu' ? '#ffd54f' : '#9c27b0'}`,
              fontSize: 18,
              fontWeight: 600,
              color: tossResult === 'Pikachu' ? '#f57c00' : '#7b1fa2'
            }}>
              🎉 {tossResult} goes first!
            </div>
          )}
        </div>
      )}
      
      {/* Battle Status */}
      {gameStarted && currentTurn && !gameOver && (
        <div style={{ 
          width: '100%', 
          marginBottom: 24,
          padding: '12px 16px',
          background: currentTurn === 'Pikachu' ? '#fffbe7' : '#f3e7ff',
          borderRadius: '8px',
          border: `1px solid ${currentTurn === 'Pikachu' ? '#ffd54f' : '#9c27b0'}`,
          textAlign: 'center',
          fontSize: 16,
          fontWeight: 500,
          color: currentTurn === 'Pikachu' ? '#f57c00' : '#7b1fa2'
        }}>
          ⚡ {currentTurn}'s turn!
        </div>
      )}

      {/* Game Over Message */}
      {gameOver && winner && (
        <div style={{ 
          width: '100%', 
          marginBottom: 24,
          padding: '16px',
          background: winner === 'Pikachu' ? '#fffbe7' : '#f3e7ff',
          borderRadius: '8px',
          border: `2px solid ${winner === 'Pikachu' ? '#ffd54f' : '#9c27b0'}`,
          textAlign: 'center',
          fontSize: 20,
          fontWeight: 600,
          color: winner === 'Pikachu' ? '#f57c00' : '#7b1fa2'
        }}>
          🏆 {winner} wins the battle! 🏆
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 64, width: '100%', justifyContent: 'center' }}>
        {/* Pikachu Side */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 220 }}>
          <Image src="/pikachu.png" alt="Pikachu" width={180} height={180} style={{ imageRendering: 'pixelated' }} />
          <div style={{ marginTop: 16, fontSize: 20, fontWeight: 600 }}>Pikachu</div>
          <div style={{ marginTop: 8, fontSize: 16 }}>HP: <span style={{ color: pikachuHp > 30 ? '#388e3c' : '#d32f2f', fontWeight: 700 }}>{pikachuHp}</span></div>
          <div style={{ marginTop: 24, width: '100%' }}>
            {PIKACHU_ATTACKS.map((atk) => (
              <button
                key={atk.name}
                style={{
                  width: '100%',
                  marginBottom: 6,
                  padding: '8px 6px',
                  fontSize: 12,
                  fontWeight: 500,
                  borderRadius: 6,
                  border: '1px solid #ccc',
                  background: currentTurn === 'Pikachu' && !gameOver ? '#fffbe7' : '#f5f5f5',
                  cursor: currentTurn === 'Pikachu' && !gameOver ? 'pointer' : 'not-allowed',
                  opacity: currentTurn === 'Pikachu' && !gameOver ? 1 : 0.6,
                  transition: 'background 0.2s',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  textAlign: 'left'
                }}
                onClick={() => executeAttack('Pikachu', atk)}
                disabled={currentTurn !== 'Pikachu' || gameOver}
              >
                <div style={{ fontWeight: 600, fontSize: 13 }}>{atk.name}</div>
                <div style={{ fontSize: 11, color: '#666', display: 'flex', gap: 8 }}>
                  <span>DMG: <span style={{ color: '#d32f2f', fontWeight: 600 }}>{atk.damage}</span></span>
                  <span>ACC: <span style={{ color: getAccuracyColor(atk.accuracy), fontWeight: 600 }}>{atk.accuracy}%</span></span>
                </div>
              </button>
            ))}
          </div>
        </div>
        {/* Gengar Side */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 220 }}>
          <Image src="/gengar.png" alt="Gengar" width={180} height={180} style={{ imageRendering: 'pixelated' }} />
          <div style={{ marginTop: 16, fontSize: 20, fontWeight: 600 }}>Gengar</div>
          <div style={{ marginTop: 8, fontSize: 16 }}>HP: <span style={{ color: gengarHp > 30 ? '#388e3c' : '#d32f2f', fontWeight: 700 }}>{gengarHp}</span></div>
          <div style={{ marginTop: 24, width: '100%' }}>
            {GENGAR_ATTACKS.map((atk) => (
              <button
                key={atk.name}
                style={{
                  width: '100%',
                  marginBottom: 6,
                  padding: '8px 6px',
                  fontSize: 12,
                  fontWeight: 500,
                  borderRadius: 6,
                  border: '1px solid #ccc',
                  background: currentTurn === 'Gengar' && !gameOver ? '#f3e7ff' : '#f5f5f5',
                  cursor: currentTurn === 'Gengar' && !gameOver ? 'pointer' : 'not-allowed',
                  opacity: currentTurn === 'Gengar' && !gameOver ? 1 : 0.6,
                  transition: 'background 0.2s',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  textAlign: 'left'
                }}
                onClick={() => executeAttack('Gengar', atk)}
                disabled={currentTurn !== 'Gengar' || gameOver}
              >
                <div style={{ fontWeight: 600, fontSize: 13 }}>{atk.name}</div>
                <div style={{ fontSize: 11, color: '#666', display: 'flex', gap: 8 }}>
                  <span>DMG: <span style={{ color: '#d32f2f', fontWeight: 600 }}>{atk.damage}</span></span>
                  <span>ACC: <span style={{ color: getAccuracyColor(atk.accuracy), fontWeight: 600 }}>{atk.accuracy}%</span></span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Battle Log */}
      {gameStarted && battleLog.length > 0 && (
        <div style={{ 
          width: '100%', 
          marginTop: 24,
          padding: '16px',
          background: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #e9ecef',
          maxHeight: '200px',
          overflowY: 'auto'
        }}>
          <h3 style={{ marginBottom: 12, color: '#495057', fontSize: 16 }}>Battle Log:</h3>
          {battleLog.map((log, index) => (
            <div key={index} style={{ 
              fontSize: 14, 
              color: '#6c757d', 
              marginBottom: 4,
              padding: '4px 0'
            }}>
              {log}
            </div>
          ))}
        </div>
      )}
      
      {/* Reset Button */}
      {gameStarted && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          width: '100%', 
          marginTop: 32 
        }}>
          <button
            onClick={resetGame}
            style={{
              padding: '10px 20px',
              fontSize: 16,
              fontWeight: 500,
              borderRadius: '8px',
              border: '1px solid #dc3545',
              background: '#fff',
              color: '#dc3545',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#dc3545';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#fff';
              e.currentTarget.style.color = '#dc3545';
            }}
          >
            {gameOver ? 'New Battle' : 'Reset Battle'}
          </button>
        </div>
      )}
    </div>
  );
} 