import React, { useState } from 'react';
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { 
  Card, 
  Button, 
  InputNumber, 
  Row, 
  Col, 
  Space, 
  Typography, 
  Statistic, 
  message 
} from 'antd';

const { Text } = Typography;

const config = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(config);

const MODULE_ADDRESS = "0x14e72b44314ea3fde52ad42db5c40d8f40e138f64fdab577c9de3f4c51561e48";

interface GameStats {
  lastRoll?: number;
  lastResult?: 'win' | 'lose';
  totalGames?: number;
  totalWins?: number;
}

function DiceGame() {
  const { account, signAndSubmitTransaction, connected } = useWallet();
  const [betAmount, setBetAmount] = useState(1);
  const [betType, setBetType] = useState<'high' | 'low'>('high');
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameStats, setGameStats] = useState<GameStats>({});

  const playDice = async () => {
    if (!connected || !account) {
      message.error('Please connect your wallet first');
      return;
    }
    
    setIsPlaying(true);
    
    try {
      const response = await signAndSubmitTransaction({
        sender: account.address,
        data: {
          function: `${MODULE_ADDRESS}::DiceGame::play_dice`,
          functionArguments: [
            MODULE_ADDRESS, // house owner
            betAmount,
            betType === 'high'
          ],
        }
      });

      await aptos.waitForTransaction({ transactionHash: response.hash });

      message.success('Dice rolled successfully! Check your result.');

      // Simulate result (in real app, you'd query the blockchain for actual result)
      const simulatedRoll = Math.floor(Math.random() * 6) + 1;
      const won = (betType === 'high' && simulatedRoll >= 4) || (betType === 'low' && simulatedRoll <= 3);
      
      // Update game stats
      setGameStats(prev => ({
        lastRoll: simulatedRoll,
        lastResult: won ? 'win' : 'lose',
        totalGames: (prev.totalGames || 0) + 1,
        totalWins: (prev.totalWins || 0) + (won ? 1 : 0)
      }));

    } catch (error) {
      console.error("Game failed:", error);
      message.error('Transaction failed. Please try again.');
    } finally {
      setIsPlaying(false);
    }
  };

  if (!connected) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Text>Please connect your wallet to play the dice game!</Text>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card title="🎲 Place Your Bet">
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div>
                <Text strong>Bet Amount (APT):</Text>
                <InputNumber
                  value={betAmount}
                  onChange={(value) => setBetAmount(value || 1)}
                  min={1}
                  style={{ width: '100%', marginTop: 8 }}
                />
              </div>

              <div>
                <Text strong>Bet Type:</Text>
                <div style={{ marginTop: 8 }}>
                  <Button.Group>
                    <Button
                      type={betType === 'low' ? 'primary' : 'default'}
                      onClick={() => setBetType('low')}
                    >
                      Low (1-3)
                    </Button>
                    <Button
                      type={betType === 'high' ? 'primary' : 'default'}
                      onClick={() => setBetType('high')}
                    >
                      High (4-6)
                    </Button>
                  </Button.Group>
                </div>
              </div>

              <Button
                type="primary"
                size="large"
                onClick={playDice}
                loading={isPlaying}
                disabled={isPlaying}
                block
              >
                {isPlaying ? 'Rolling Dice...' : '🎲 Roll Dice'}
              </Button>
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="📊 Game Stats">
            <Space direction="vertical" style={{ width: '100%' }}>
              {gameStats.lastRoll && (
                <Statistic
                  title="Last Roll"
                  value={gameStats.lastRoll}
                  prefix="🎲"
                />
              )}
              
              {gameStats.lastResult && (
                <div>
                  <Text strong>Last Result: </Text>
                  <Text type={gameStats.lastResult === 'win' ? 'success' : 'danger'}>
                    {gameStats.lastResult === 'win' ? '🎉 Won' : '😔 Lost'}
                  </Text>
                </div>
              )}

              {gameStats.totalGames && (
                <>
                  <Statistic
                    title="Total Games"
                    value={gameStats.totalGames}
                  />
                  <Statistic
                    title="Total Wins"
                    value={gameStats.totalWins || 0}
                  />
                  <Statistic
                    title="Win Rate"
                    value={((gameStats.totalWins || 0) / gameStats.totalGames * 100).toFixed(1)}
                    suffix="%"
                  />
                </>
              )}
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default DiceGame;