import { Wallet, WebSocketProvider, Contract, parseUnits } from "ethers";
import * as dotenv from "dotenv";
import { ERC20_ABI, formatToken } from "./utils.js";
import { TOKEN_LIST } from "./tokenList.js";

dotenv.config();

const compromisedPk = process.env.PRIVATE_KEY_COMPROMISED!;
const safeAddress = process.env.SAFE_WALLET!;
const provider = new WebSocketProvider(process.env.RPC_WSS!);
const compromisedWallet = new Wallet(compromisedPk, provider);

async function checkAndRescue(token: { symbol: string; address: string; decimals: number }) {
  const tokenContract = new Contract(token.address, ERC20_ABI, compromisedWallet);
  const balance: bigint = await tokenContract.balanceOf(compromisedWallet.address);

  if (balance > 0n) {
    const formatted = formatToken(balance, token.decimals);
    console.log(`[${token.symbol}] Balance detected: ${formatted}`);

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice ? feeData.gasPrice * 2n : 1n * 1_000_000_000n; // Default 1 gwei if undefined

    const tx = await tokenContract.transfer(safeAddress, balance, {
      gasPrice,
      gasLimit: 60000n
    });

    console.log(`[${token.symbol}] Rescue tx sent: ${tx.hash}`);
  }
}

async function monitorTokens() {
  console.log("🛡️ Rescue bot running with Ethers v6...");

  setInterval(async () => {
    for (const token of TOKEN_LIST) {
      try {
        await checkAndRescue(token);
      } catch (err: any) {
        console.error(`[${token.symbol}] Rescue failed: ${err.message}`);
      }
    }
  }, 5000);
}

monitorTokens();
