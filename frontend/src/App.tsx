import React, { useState } from 'react';
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { WalletSelector } from "@aptos-labs/wallet-adapter-ant-design";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import './App.css';

const config = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(config);

const MODULE_ADDRESS = "0x14e72b44314ea3fde52ad42db5c40d8f40e138f64fdab577c9de3f4c51561e48";

function DiceGame() {
  const { account, signAndSubmitTransaction, connected } = useWallet();
  const [betAmount, setBetAmount] = useState(1);
  const [betType, setBetType] = useState<'high' | 'low'>('high');
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameResult, setGameResult] = useState<any>(null);
  const [houseInitialized, setHouseInitialized] = useState(false);

  const initializeHouse = async () => {
    if (!connected || !account) return;
    
    try {
      const response = await signAndSubmitTransaction({
        sender: account.address,
        data: {
          function: `${MODULE_ADDRESS}::DiceGame::initialize_house`,
          functionArguments: [5], // 5% house edge
        }
      });

      await aptos.waitForTransaction({ transactionHash: response.hash });
      setHouseInitialized(true);
      alert("House initialized successfully!");
    } catch (error) {
      console.error("House initialization failed:", error);
    }
  };

  const playDice = async () => {
    if (!connected || !account) return;
    
    setIsPlaying(true);
    
    try {
      const response = await signAndSubmitTransaction({
        sender: account.address,
        data: {
          function: `${MODULE_ADDRESS}::DiceGame::play_dice`,
          functionArguments: [
            MODULE_ADDRESS, // house owner (using same address for simplicity)
            betAmount,
            betType === 'high'
          ],
        }
      });

      await aptos.waitForTransaction({ transactionHash: response.hash });
      
      // Simulate result (in real app, you'd query the blockchain)
      const simulatedRoll = Math.floor(Math.random() * 6) + 1;
      const won = (betType === 'high' && simulatedRoll >= 4) || (betType === 'low' && simulatedRoll <= 3);
      
      setGameResult({
        roll: simulatedRoll,
        won: won,
        bet: betAmount,
        type: betType
      });
      
    } catch (error) {
      console.error("Game failed:", error);
    } finally {
      setIsPlaying(false);
    }
  };

  if (!connected) {
    return (
      <div className="app">
        <h1>🎲 Dice Game</h1>
        <p>Connect your wallet to start playing!</p>
        <WalletSelector />
      </div>
    );
  }

  return (
    <div className="app">
      <div className="header">
        <h1>🎲 Dice Game</h1>
        <WalletSelector />
      </div>
      
      {!houseInitialized && (
        <div className="init-section">
          <button onClick={initializeHouse} className="init-btn">
            Initialize Game House
          </button>
        </div>
      )}
      
      <div className="game-section">
        <div className="controls">
          <div>
            <label>Bet Amount:</label>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(Number(e.target.value))}
              min={1}
            />
          </div>
          
          <div>
            <label>Bet Type:</label>
            <div className="bet-buttons">
              <button
                className={betType === 'low' ? 'active' : ''}
                onClick={() => setBetType('low')}
              >
                Low (1-3)
              </button>
              <button
                className={betType === 'high' ? 'active' : ''}
                onClick={() => setBetType('high')}
              >
                High (4-6)
              </button>
            </div>
          </div>
          
          <button 
            onClick={playDice} 
            disabled={isPlaying || !houseInitialized}
            className="play-btn"
          >
            {isPlaying ? 'Rolling...' : '🎲 Roll Dice'}
          </button>
        </div>
        
        {gameResult && (
          <div className="result">
            <h3>Game Result</h3>
            <p>🎲 Rolled: {gameResult.roll}</p>
            <p>💰 Bet: {gameResult.bet} on {gameResult.type}</p>
            <p className={gameResult.won ? 'win' : 'lose'}>
              {gameResult.won ? '🎉 You Won!' : '😔 You Lost'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <AptosWalletAdapterProvider autoConnect={false}>
      <DiceGame />
    </AptosWalletAdapterProvider>
  );
}

export default App;