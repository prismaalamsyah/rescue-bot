import { Wallet, WebSocketProvider, Contract, parseEther } from "ethers";
import * as dotenv from "dotenv";
import { ERC20_ABI, formatToken } from "./utils.js";
import { TOKEN_LIST } from "./tokenList.js";

dotenv.config();

// Setup provider dan wallet
const provider = new WebSocketProvider(process.env.RPC_WSS!);
const compromisedWallet = new Wallet(process.env.PRIVATE_KEY_COMPROMISED!, provider);
const safeWallet = new Wallet(process.env.PRIVATE_KEY_SAFE!, provider);
const safeAddress = process.env.SAFE_WALLET!;
const compromisedAddress = process.env.COMPROMISED_WALLET!;

const ETH_THRESHOLD = parseEther("0.000002");
const ETH_TOPUP_AMOUNT = parseEther("0.000002");

async function checkAndRescue(token: any) {
  const tokenContract = new Contract(token.address, ERC20_ABI, compromisedWallet);
  const balance: bigint = await tokenContract.balanceOf(compromisedAddress);

  if (balance > 0n) {
    const ethBalance = await provider.getBalance(compromisedAddress);

    // Kirim ETH kalau belum cukup
    if (ethBalance < ETH_THRESHOLD) {
      console.log(`⚠️ Not enough ETH for gas. Sending from safe wallet...`);
      const gasTx = await safeWallet.sendTransaction({
        to: compromisedAddress,
        value: ETH_TOPUP_AMOUNT,
        gasLimit: 21000n
      });
      console.log(`🚀 ETH sent for gas: ${gasTx.hash}`);

      // Tunggu konfirmasi sebelum rescue
      await gasTx.wait();
    }

    // Rescue token
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice ? feeData.gasPrice * 2n : 1_000_000_000n;

    const formatted = formatToken(balance, token.decimals);
    console.log(`[${token.symbol}] Detected: ${formatted} → Sending to ${safeAddress}`);

    const rescueTx = await tokenContract.transfer(safeAddress, balance, {
      gasPrice,
      gasLimit: 60000n
    });

    console.log(`[${token.symbol}] Rescue tx sent: ${rescueTx.hash}`);
  }
}

async function monitor() {
  console.log("🛡️ Rescue + Auto-Gas Bot Running...");

  setInterval(async () => {
    for (const token of TOKEN_LIST) {
      try {
        await checkAndRescue(token);
      } catch (err: any) {
        console.error(`[${token.symbol}] ERROR:`, err.message);
      }
    }
  }, 5000);
}

monitor();
