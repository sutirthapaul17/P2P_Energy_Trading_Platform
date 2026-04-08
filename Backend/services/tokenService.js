import 'dotenv/config'
import {
  createWalletClient,
  createPublicClient,
  http,
  parseUnits,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'

import tokenJson from '../abi/EnergyToken.json' assert { type: 'json' }

const TOKEN_ADDRESS = process.env.ENERGY_TOKEN_ADDRESS
const RPC_URL = process.env.RPC_URL
const tokenAbi = tokenJson.abi

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
   1. TOKEN INFO
======================================================= */

export async function getTokenInfo() {
  const [name, symbol, decimals, totalSupply] = await Promise.all([
    publicClient.readContract({
      address: TOKEN_ADDRESS,
      abi: tokenAbi,
      functionName: 'name',
    }),
    publicClient.readContract({
      address: TOKEN_ADDRESS,
      abi: tokenAbi,
      functionName: 'symbol',
    }),
    publicClient.readContract({
      address: TOKEN_ADDRESS,
      abi: tokenAbi,
      functionName: 'decimals',
    }),
    publicClient.readContract({
      address: TOKEN_ADDRESS,
      abi: tokenAbi,
      functionName: 'totalSupply',
    }),
  ])

  return { name, symbol, decimals, totalSupply }
}

export async function getBalance(address) {
  return await publicClient.readContract({
    address: TOKEN_ADDRESS,
    abi: tokenAbi,
    functionName: 'balanceOf',
    args: [address],
  })
}

/* =======================================================
   2. TRANSFERS
======================================================= */

export async function transfer(privateKey, toAddress, amount) {
  const walletClient = getWalletClient(privateKey)

  const amountWei = parseUnits(amount.toString(), 18)

  return await walletClient.writeContract({
    address: TOKEN_ADDRESS,
    abi: tokenAbi,
    functionName: 'transfer',
    args: [toAddress, amountWei],
  })
}

export async function transferFrom(privateKey, from, to, amount) {
  const walletClient = getWalletClient(privateKey)

  const amountWei = parseUnits(amount.toString(), 18)

  return await walletClient.writeContract({
    address: TOKEN_ADDRESS,
    abi: tokenAbi,
    functionName: 'transferFrom',
    args: [from, to, amountWei],
  })
}

/* =======================================================
   3. MINTING
======================================================= */

export async function mint(privateKey, toAddress, amount) {
  const walletClient = getWalletClient(privateKey)

  const amountWei = parseUnits(amount.toString(), 18)

  return await walletClient.writeContract({
    address: TOKEN_ADDRESS,
    abi: tokenAbi,
    functionName: 'mint',
    args: [toAddress, amountWei],
  })
}

export async function getMinters() {
  // ⚠️ Only works if contract supports enumeration
  return { message: 'Implement via events or contract support' }
}

/* =======================================================
   4. ROLES
======================================================= */

export async function addMinter(privateKey, accountAddress) {
  const walletClient = getWalletClient(privateKey)

  const MINTER_ROLE = await publicClient.readContract({
    address: TOKEN_ADDRESS,
    abi: tokenAbi,
    functionName: 'MINTER_ROLE',
  })

  return await walletClient.writeContract({
    address: TOKEN_ADDRESS,
    abi: tokenAbi,
    functionName: 'grantRole',
    args: [MINTER_ROLE, accountAddress],
  })
}

export async function removeMinter(privateKey, accountAddress) {
  const walletClient = getWalletClient(privateKey)

  const MINTER_ROLE = await publicClient.readContract({
    address: TOKEN_ADDRESS,
    abi: tokenAbi,
    functionName: 'MINTER_ROLE',
  })

  return await walletClient.writeContract({
    address: TOKEN_ADDRESS,
    abi: tokenAbi,
    functionName: 'revokeRole',
    args: [MINTER_ROLE, accountAddress],
  })
}

export async function getRoles(address) {
  const roles = ['MINTER_ROLE', 'PAUSER_ROLE', 'DEFAULT_ADMIN_ROLE']

  const result = {}

  for (let roleName of roles) {
    const role = await publicClient.readContract({
      address: TOKEN_ADDRESS,
      abi: tokenAbi,
      functionName: roleName,
    })

    const hasRole = await publicClient.readContract({
      address: TOKEN_ADDRESS,
      abi: tokenAbi,
      functionName: 'hasRole',
      args: [role, address],
    })

    result[roleName] = hasRole
  }

  return result
}

/* =======================================================
   5. PAUSABLE
======================================================= */

export async function pause(privateKey) {
  const walletClient = getWalletClient(privateKey)

  return await walletClient.writeContract({
    address: TOKEN_ADDRESS,
    abi: tokenAbi,
    functionName: 'pause',
  })
}

export async function unpause(privateKey) {
  const walletClient = getWalletClient(privateKey)

  return await walletClient.writeContract({
    address: TOKEN_ADDRESS,
    abi: tokenAbi,
    functionName: 'unpause',
  })
}

export async function isPaused() {
  return await publicClient.readContract({
    address: TOKEN_ADDRESS,
    abi: tokenAbi,
    functionName: 'paused',
  })
}

/* =======================================================
   6. BLACKLIST
======================================================= */

export async function blacklist(privateKey, accountAddress) {
  const walletClient = getWalletClient(privateKey)

  return await walletClient.writeContract({
    address: TOKEN_ADDRESS,
    abi: tokenAbi,
    functionName: 'blacklist',
    args: [accountAddress],
  })
}

export async function unblacklist(privateKey, accountAddress) {
  const walletClient = getWalletClient(privateKey)

  return await walletClient.writeContract({
    address: TOKEN_ADDRESS,
    abi: tokenAbi,
    functionName: 'unblacklist',
    args: [accountAddress],
  })
}

export async function isBlacklisted(address) {
  return await publicClient.readContract({
    address: TOKEN_ADDRESS,
    abi: tokenAbi,
    functionName: 'isBlacklisted',
    args: [address],
  })
}

export async function getAllBlacklisted() {
  return { message: 'Requires event indexing or custom storage' }
}

/* =======================================================
   7. ALLOWANCE
======================================================= */

export async function getAllowance(owner, spender) {
  return await publicClient.readContract({
    address: TOKEN_ADDRESS,
    abi: tokenAbi,
    functionName: 'allowance',
    args: [owner, spender],
  })
}

export async function approve(privateKey, spenderAddress, amount) {
  const walletClient = getWalletClient(privateKey)

  const amountWei = parseUnits(amount.toString(), 18)

  return await walletClient.writeContract({
    address: TOKEN_ADDRESS,
    abi: tokenAbi,
    functionName: 'approve',
    args: [spenderAddress, amountWei],
  })
}

/* =======================================================
   8. PERMIT
======================================================= */

export async function permit(owner, spender, value, deadline, v, r, s) {
  const walletClient = getWalletClient(process.env.PRIVATE_KEY)

  return await walletClient.writeContract({
    address: TOKEN_ADDRESS,
    abi: tokenAbi,
    functionName: 'permit',
    args: [owner, spender, value, deadline, v, r, s],
  })
}

/* =======================================================
   9. TRANSACTION & EVENTS
======================================================= */

export async function getTransactionStatus(txHash) {
  const receipt = await publicClient.getTransactionReceipt({ hash: txHash })

  if (!receipt) return { status: 'PENDING' }

  return {
    status: receipt.status === 'success' ? 'SUCCESS' : 'FAILED',
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed,
  }
}

export async function getEvents(eventName) {
  return { message: `Implement event parsing for ${eventName}` }
}