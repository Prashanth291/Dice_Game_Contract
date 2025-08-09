import { Types } from "aptos";

const MODULE_ADDRESS = "YOUR_CONTRACT_ADDRESS";
const MODULE_NAME = "DiceGame";

export async function playDice(
  signAndSubmitTransaction: (payload: Types.TransactionPayload) => Promise<any>,
  betAmount: number,
  betHigh: boolean
) {
  const payload = {
    type: "entry_function_payload",
    function: `${MODULE_ADDRESS}::${MODULE_NAME}::play_dice`,
    type_arguments: [],
    arguments: [
      MODULE_ADDRESS,
      betAmount * 100000000, // Convert to Octas
      betHigh,
    ],
  };

  return await signAndSubmitTransaction(payload);
}
