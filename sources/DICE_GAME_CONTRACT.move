module SendMessage::DiceGame {
    use aptos_framework::signer;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::timestamp;
    use std::hash;
    use std::bcs;
    use std::vector;
    use aptos_framework::account;

    /// Struct representing the dice game house
    struct DiceHouse has store, key {
        house_balance: u64,     // House's available balance
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

    const RESOURCE_ACCOUNT_SEED: vector<u8> = b"DICE_GAME_HOUSE";

    /// Function to initialize the dice house with starting balance and house edge
    public entry fun initialize_house(owner: &signer, initial_balance: u64, house_edge: u64) {
        assert!(house_edge <= 10, 1); // Max house edge 10%
        
        // Create resource account for house
        let (resource_signer, _) = account::create_resource_account(owner, RESOURCE_ACCOUNT_SEED);
        
        let house = DiceHouse {
            house_balance: initial_balance,
            total_games: 0,
            house_edge,
        };
        move_to(&resource_signer, house);
        
        // Register resource account for AptosCoin
        if (!coin::is_account_registered<AptosCoin>(signer::address_of(&resource_signer))) {
            coin::register<AptosCoin>(&resource_signer);
        };
    }

    /// Helper function to generate pseudo-random number
    fun generate_random_number(player_addr: address, current_time: u64): u64 {
        let seed_addr = bcs::to_bytes(&player_addr);
        let seed_time = bcs::to_bytes(&current_time);
        vector::append(&mut seed_addr, seed_time);
        let hash_value = hash::sha3_256(seed_addr);
        ((*vector::borrow(&hash_value, 0) as u64) % 6) + 1
    }

    /// Function to play dice game - user bets on high (4-6) or low (1-3)
    public entry fun play_dice(
        player: &signer, 
        house_addr: address, 
        bet_amount: u64, 
        bet_high: bool
    ) acquires DiceHouse, GameResult {
        let house = borrow_global_mut<DiceHouse>(house_addr);
        let player_addr = signer::address_of(player);
        
        let current_time = timestamp::now_microseconds();
        let seed_addr = bcs::to_bytes(&player_addr);
        let seed_time = bcs::to_bytes(&current_time);
        vector::append(&mut seed_addr, seed_time);
        let hash_value = hash::sha3_256(seed_addr);
        let dice_roll = ((*vector::borrow(&hash_value, 0) as u64) % 6) + 1;
        
        // Determine if player wins
        let player_wins = (bet_high && dice_roll >= 4) || (!bet_high && dice_roll <= 3);
        
        // Calculate payout with house edge
        let payout = if (player_wins) {
            let gross_payout = bet_amount * 2;
            let house_cut = (gross_payout * house.house_edge) / 100;
            gross_payout - house_cut
        } else {
            0
        };

        coin::transfer<AptosCoin>(player, house_addr, bet_amount);
        house.house_balance = house.house_balance + bet_amount;

        if (player_wins && payout > 0) {
            coin::transfer<AptosCoin>(&account::create_signer_with_capability(
                &account::create_resource_address(&@0x1, RESOURCE_ACCOUNT_SEED)
            ), player_addr, payout);
            house.house_balance = house.house_balance - payout;
        };

        house.total_games = house.total_games + 1;
        
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
}