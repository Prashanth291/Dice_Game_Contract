module MyModule::DiceGame {
    use aptos_framework::signer;
    use aptos_framework::timestamp;
    use std::bcs;

    /// Struct representing the dice game house
    struct DiceHouse has store, key {
        total_games: u64,       // Total games played
        house_edge: u64,        // House edge percentage (e.g., 2 for 2%)
    }

    /// Struct for storing game result
    struct GameResult has store, key {
        last_roll: u64,         // Last dice roll result (1-6)
        last_bet: u64,          // Last bet amount
        last_win: bool,         // Whether last game was won
        games_played: u64,      // Total games played by user
    }

    /// Function to initialize the dice house
    public entry fun initialize_house(owner: &signer, house_edge: u64) {
        assert!(house_edge <= 10, 1); // Max house edge 10%
        
        let house = DiceHouse {
            total_games: 0,
            house_edge,
        };
        move_to(owner, house);
    }

    /// Function to play dice game - user bets on high (4-6) or low (1-3)
    public entry fun play_dice(
        player: &signer, 
        house_owner: address, 
        bet_amount: u64, 
        bet_high: bool
    ) acquires DiceHouse, GameResult {
        let house = borrow_global_mut<DiceHouse>(house_owner);
        
        // Generate pseudo-random number (1-6) using timestamp
        let player_addr = signer::address_of(player);
        let current_time = timestamp::now_microseconds();
        
        // Convert address to bytes and get a number from it
        let addr_bytes = bcs::to_bytes(&player_addr);
        let addr_num = (*std::vector::borrow(&addr_bytes, 0) as u64);
        
        // Simple pseudo-random generation
        let dice_roll = ((current_time + addr_num) % 6) + 1;
        
        // Determine if player wins
        let player_wins = (bet_high && dice_roll >= 4) || (!bet_high && dice_roll <= 3);
        
        // Update game stats
        house.total_games = house.total_games + 1;
        
        // Store player's game result
        if (!exists<GameResult>(player_addr)) {
            let result = GameResult {
                last_roll: dice_roll,
                last_bet: bet_amount,
                last_win: player_wins,
                games_played: 1,
            };
            move_to(player, result);
        } else {
            let result = borrow_global_mut<GameResult>(player_addr);
            result.last_roll = dice_roll;
            result.last_bet = bet_amount;
            result.last_win = player_wins;
            result.games_played = result.games_played + 1;
        };
    }

    // View function to get game result
    #[view]
    public fun get_game_result(player_addr: address): (u64, u64, bool, u64) acquires GameResult {
        if (!exists<GameResult>(player_addr)) {
            return (0, 0, false, 0)
        };
        let result = borrow_global<GameResult>(player_addr);
        (result.last_roll, result.last_bet, result.last_win, result.games_played)
    }
}