import { formatUnits } from "ethers";

export const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)"
];

export function formatToken(balance: bigint, decimals: number): string {
  return formatUnits(balance.toString(), decimals);
}
