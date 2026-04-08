import 'dotenv/config'
import {
  createWalletClient,
  createPublicClient,
  http,
  parseEther,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'

import saleJson from '../abi/EnergyTokenSale.json' assert { type: 'json' }

const SALE_ADDRESS = process.env.TOKEN_SALE_ADDRESS
const RPC_URL = process.env.RPC_URL
const saleAbi = saleJson.abi

/* =======================================================
   CLIENTS
======================================================= */

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(RPC_URL),
})

function getWalletClient(privateKey) {
  const account = privateKeyToAccount(privateKey)

  return createWalletClient({
    account,
    chain: sepolia,
    transport: http(RPC_URL),
  })
}

/* =======================================================
   1. BUY TOKENS
======================================================= */

export async function buyTokens(privateKey, amount) {
  const walletClient = getWalletClient(privateKey)

  const value = parseEther(amount.toString())

  const hash = await walletClient.writeContract({
    address: SALE_ADDRESS,
    abi: saleAbi,
    functionName: 'buyTokens',
    args: [],        // ✅ no arguments
    value,           // ✅ ETH sent as msg.value
  })

  return hash
}

/* =======================================================
   2. TOKEN PRICE
======================================================= */

export async function getTokenPrice() {
  // depends on contract
  // example: tokenPrice()

  try {
    const price = await publicClient.readContract({
      address: SALE_ADDRESS,
      abi: saleAbi,
      functionName: 'tokenPrice', // 🔴 confirm
    })

    return price
  } catch {
    return { message: 'No price function in contract' }
  }
}

/* =======================================================
   3. USER PURCHASES
======================================================= */

export async function getUserPurchases(address) {
  // depends on contract storage

  try {
    const purchased = await publicClient.readContract({
      address: SALE_ADDRESS,
      abi: saleAbi,
      functionName: 'purchased', // 🔴 confirm mapping name
      args: [address],
    })

    return {
      address,
      totalPurchased: purchased,
    }
  } catch {
    return {
      address,
      message: 'No direct mapping, use events',
    }
  }
}

/* =======================================================
   4. ADMIN
======================================================= */

export async function withdrawFunds(privateKey) {
  const walletClient = getWalletClient(privateKey)

  return await walletClient.writeContract({
    address: SALE_ADDRESS,
    abi: saleAbi,
    functionName: 'withdraw', // 🔴 confirm
  })
}

export async function getContractBalance() {
  const balance = await publicClient.getBalance({
    address: SALE_ADDRESS,
  })

  return balance
}

/* =======================================================
   5. TRANSACTION STATUS
======================================================= */

export async function getTransactionStatus(txHash) {
  const receipt = await publicClient.getTransactionReceipt({
    hash: txHash,
  })

  if (!receipt) return { status: 'PENDING' }

  return {
    status: receipt.status === 'success' ? 'SUCCESS' : 'FAILED',
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed,
  }
}

/* =======================================================
   6. EVENTS
======================================================= */

export async function getEvents(eventName) {
  // generic placeholder
  return {
    message: `Implement event parsing for ${eventName}`,
  }
}

export async function getPurchaseEvents() {
  // example: TokensPurchased event

  return {
    message: 'Use publicClient.getLogs() to fetch purchase events',
  }
}