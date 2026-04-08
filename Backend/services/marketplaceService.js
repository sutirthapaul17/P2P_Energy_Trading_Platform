import 'dotenv/config'
import {
  createWalletClient,
  createPublicClient,
  http,
  parseUnits,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import { keccak256, toBytes } from 'viem'
import { getAddress } from 'viem'

// import marketplaceAbi from '../abi/EnergyMarketplace.json' assert { type: 'json' }
import marketplaceJson  from '../abi/EnergyMarketplace.json' with { type: 'json' }
import { erc20Abi } from 'viem'


const marketplaceAbi = marketplaceJson.abi
const MARKETPLACE_ADDRESS = process.env.MARKETPLACE_ADDRESS
const TOKEN_ADDRESS = process.env.ENERGY_TOKEN_ADDRESS
const RPC_URL = process.env.RPC_URL

/* =======================================================
   CLIENTS
======================================================= */

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(RPC_URL),
})

function getWalletClient(privateKey) {
  try {
    // Validate private key format
    if (!privateKey) {
      throw new Error('Private key is required')
    }
    
    // Ensure private key has 0x prefix
    let formattedPrivateKey = privateKey
    if (!privateKey.startsWith('0x')) {
      formattedPrivateKey = `0x${privateKey}`
    }
    
    // Validate private key length
    if (formattedPrivateKey.length !== 66) {
      throw new Error('Invalid private key length. Expected 64 hex chars + 0x prefix')
    }
    
    const account = privateKeyToAccount(formattedPrivateKey)
    
    return createWalletClient({
      account,
      chain: sepolia,
      transport: http(RPC_URL),
    })
  } catch (error) {
    console.error('Failed to create wallet client:', error)
    throw new Error(`Invalid private key: ${error.message}`)
  }
}

// Helper function to convert energy type enum to string
function getEnergyTypeString(energyTypeIndex) {
  const energyTypes = ['SOLAR', 'WIND', 'HYDRO', 'BIOMASS']
  return energyTypes[energyTypeIndex] || 'UNKNOWN'
}

function getEnergyTypeIndex(energyType) {
  const energyTypeMap = {
    SOLAR: 0,
    BIOGAS: 1,
    WIND: 2,
    HYDRO: 3,
    OTHER: 4
  }

  if (typeof energyType === 'number') {
    if (energyType < 0 || energyType > 4) {
      throw new Error('Invalid energy type index. Must be 0-4')
    }
    return energyType
  }

  if (typeof energyType === 'string') {
    const cleanedType = energyType.trim().toUpperCase() // 🔥 IMPORTANT
    const index = energyTypeMap[cleanedType]

    console.log("Incoming energyType:", energyType)
    console.log("Cleaned energyType:", cleanedType)
    console.log("Mapped index:", index)

    if (index === undefined) {
      throw new Error(
        `Invalid energy type: ${energyType}. Must be SOLAR, BIOGAS, WIND, HYDRO, or OTHER`
      )
    }

    return index
  }

  throw new Error('Energy type must be a string or number')
}


/* =======================================================
   1. LISTING
======================================================= */
// helper function
function toUnixTimestamp(dateString) {
  const date = new Date(dateString)
  if (isNaN(date.getTime())) throw new Error(`Invalid date: ${dateString}`)
  return Math.floor(date.getTime() / 1000)
}


export async function listEnergy(privateKey, units, pricePerUnit, startTime, endTime, minPurchaseAmount, maxPurchaseAmount, qualityCertificate) {
  try {
    if (!privateKey) throw new Error('Private key is required')
    if (!units || units <= 0) throw new Error('Units must be positive')
    if (!pricePerUnit || pricePerUnit <= 0) throw new Error('Price per unit must be positive')
    if (!startTime) throw new Error('Start time is required')
    if (!endTime) throw new Error('End time is required')
    if (!minPurchaseAmount || minPurchaseAmount <= 0) throw new Error('Min purchase amount is required')
    if (!maxPurchaseAmount || maxPurchaseAmount < minPurchaseAmount) throw new Error('Invalid max purchase amount')

    const walletClient = getWalletClient(privateKey)
    const account = privateKeyToAccount(privateKey)
    console.log(`Creating listing from address: ${account.address}`)
    const startUnix = toUnixTimestamp(startTime)
    const endUnix = toUnixTimestamp(endTime)



    const hash = await walletClient.writeContract({
      address: MARKETPLACE_ADDRESS,
      abi: marketplaceAbi,
      functionName: 'createListing',
      args: [
        BigInt(units),                                    // amount
        parseUnits(pricePerUnit.toString(), 18),          // pricePerUnit
        BigInt(startUnix),                                // startTime (unix timestamp)
        BigInt(endUnix),                                  // endTime (unix timestamp)
        BigInt(minPurchaseAmount),                        // minPurchaseAmount
        BigInt(maxPurchaseAmount),                        // maxPurchaseAmount
        qualityCertificate ?? '',                         // qualityCertificate (IPFS hash)
      ],
    })

    console.log(`Listing created with hash: ${hash}`)
    return hash
  } catch (error) {
    console.error('Failed to create listing:', error)
    throw new Error(`Failed to create listing: ${error.message}`)
  }
}

export async function cancelListing(privateKey, listingId) {
  try {
    if (!privateKey) throw new Error('Private key is required')
    if (!listingId && listingId !== 0) throw new Error('Listing ID is required')
    
    const walletClient = getWalletClient(privateKey)
    const account = privateKeyToAccount(privateKey)
    console.log(`Cancelling listing ${listingId} from address: ${account.address}`)

    const hash = await walletClient.writeContract({
      address: MARKETPLACE_ADDRESS,
      abi: marketplaceAbi,
      functionName: 'cancelListing',
      args: [BigInt(listingId)],
    })
    
    console.log(`Listing cancelled with hash: ${hash}`)
    return hash
  } catch (error) {
    console.error('Failed to cancel listing:', error)
    throw new Error(`Failed to cancel listing: ${error.message}`)
  }
}

export async function updateFeeConfig(privateKey, fee) {
  try {
    if (!privateKey) throw new Error('Private key is required')
    if (!fee && fee !== 0) throw new Error('Fee is required')
    
    const walletClient = getWalletClient(privateKey)
    const account = privateKeyToAccount(privateKey)
    console.log(`Updating fee config from address: ${account.address}`)

    const hash = await walletClient.writeContract({
      address: MARKETPLACE_ADDRESS,
      abi: marketplaceAbi,
      functionName: 'updateFeeConfig',
      args: [fee],
    })
    
    console.log(`Fee config updated with hash: ${hash}`)
    return hash
  } catch (error) {
    console.error('Failed to update fee config:', error)
    throw new Error(`Failed to update fee config: ${error.message}`)
  }
}

/* =======================================================
   2. BUY
======================================================= */
const safeERC20Errors = [
  {
    type: 'error',
    name: 'SafeERC20FailedOperation',
    inputs: [{ name: 'token', type: 'address' }],
  },
  {
    type: 'error', 
    name: 'ERC20InsufficientBalance',
    inputs: [
      { name: 'sender', type: 'address' },
      { name: 'balance', type: 'uint256' },
      { name: 'needed', type: 'uint256' },
    ],
  },
  {
    type: 'error',
    name: 'ERC20InsufficientAllowance',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'allowance', type: 'uint256' },
      { name: 'needed', type: 'uint256' },
    ],
  },
]

export async function approveMarketplace(privateKey, amount) {
  const walletClient = getWalletClient(privateKey)

  const hash = await walletClient.writeContract({
    address: TOKEN_ADDRESS,
    abi: erc20Abi,
    functionName: 'approve',
    args: [MARKETPLACE_ADDRESS, BigInt(amount)],
  })

  console.log(`Approval tx: ${hash}`)
  return hash
}


export async function buyEnergy(privateKey, listingId, units) {
  try {
    if (!privateKey) throw new Error('Private key is required')
    if (!listingId && listingId !== 0) throw new Error('Listing ID is required')
    if (!units || units <= 0) throw new Error('Units must be positive')

    const walletClient = getWalletClient(privateKey)
    const account = privateKeyToAccount(privateKey)

    // 1. Fetch listing to get pricePerUnit
    const listing = await publicClient.readContract({
      address: MARKETPLACE_ADDRESS,
      abi: marketplaceAbi,
      functionName: 'listings', // check your ABI for the correct function name
      args: [BigInt(listingId)],
    })

    const pricePerUnit = listing[3] // adjust based on your struct fields
    const totalCost = pricePerUnit * BigInt(units)
    console.log(`Price per unit: ${pricePerUnit}, Total cost: ${totalCost}`)

    // 2. Approve exact total cost
    const approvalHash = await walletClient.writeContract({
      address: TOKEN_ADDRESS,
      abi: erc20Abi,
      functionName: 'approve',
      args: [MARKETPLACE_ADDRESS, totalCost], // ✅ pricePerUnit * units
    })
    console.log(`Approval tx: ${approvalHash}`)
    await publicClient.waitForTransactionReceipt({ hash: approvalHash })

    // 3. Now purchase
    const hash = await walletClient.writeContract({
      address: MARKETPLACE_ADDRESS,
      abi: [...marketplaceAbi, ...erc20Abi, ...safeERC20Errors],
      functionName: 'purchaseEnergy',
      args: [BigInt(listingId), BigInt(units)],
    })

    console.log(`Energy purchased: ${hash}`)
    return hash
  } catch (error) {
    console.error('Failed to purchase energy:', error)
    throw new Error(`Failed to purchase energy: ${error.message}`)
  }
}

/* =======================================================
   3. LISTING QUERIES (No private key needed - read only)
======================================================= */

export async function getListingById(id) {
  try {
    if (!id) throw new Error('Listing ID is required')

    const listing = await publicClient.readContract({
      address: MARKETPLACE_ADDRESS,
      abi: marketplaceAbi,
      functionName: 'listings',
      args: [BigInt(id)],
    })

    return {
      id: listing[0].toString(),
      producer: listing[1],
      amount: listing[2].toString(),
      pricePerUnit: listing[3].toString(),
      startTime: listing[4].toString(),
      endTime: listing[5].toString(),
      energyType: listing[6],
      energyTypeString: getEnergyTypeString(listing[6]),
      qualityCertificate: listing[7],
      status: listing[8],
      createdAt: listing[9].toString(),
      minPurchaseAmount: listing[10].toString(),
      maxPurchaseAmount: listing[11].toString(),
    }

  } catch (error) {
    console.error('Failed to get listing:', error)
    throw new Error(`Failed to get listing: ${error.message}`)
  }
}

export async function getAllListings() {
  try {
    const total = await publicClient.readContract({
      address: MARKETPLACE_ADDRESS,
      abi: marketplaceAbi,
      functionName: 'getListingCount',
    })

    const listings = []

    for (let i = 0; i < total; i++) {
      const l = await getListingById(i)
      listings.push(l)
    }

    return { total: total.toString(), listings }
  } catch (error) {
    console.error('Failed to get all listings:', error)
    throw new Error(`Failed to get all listings: ${error.message}`)
  }
}

export async function getListingsBySeller(address) {
  try {
    if (!address) throw new Error('Address is required')
    
    const ids = await publicClient.readContract({
      address: MARKETPLACE_ADDRESS,
      abi: marketplaceAbi,
      functionName: 'userListings',
      args: [address],
    })

    const listings = await Promise.all(
      ids.map(id => getListingById(id))
    )

    return { address, listings }
  } catch (error) {
    console.error('Failed to get listings by seller:', error)
    throw new Error(`Failed to get listings by seller: ${error.message}`)
  }
}

export async function getActiveListings() {
  try {
    const { listings } = await getAllListings()

    const active = listings.filter(l => l.active === true)

    return { total: active.length, listings: active }
  } catch (error) {
    console.error('Failed to get active listings:', error)
    throw new Error(`Failed to get active listings: ${error.message}`)
  }
}

/* =======================================================
   4. TRADES
======================================================= */

export async function getAllTrades() {
  try {
    const total = await publicClient.readContract({
      address: MARKETPLACE_ADDRESS,
      abi: marketplaceAbi,
      functionName: 'getTradeCount',
    })

    const trades = []

    for (let i = 0; i < total; i++) {
      const t = await publicClient.readContract({
        address: MARKETPLACE_ADDRESS,
        abi: marketplaceAbi,
        functionName: 'trades',
        args: [i],
      })
      trades.push(t)
    }

    return { total: total.toString(), trades }
  } catch (error) {
    console.error('Failed to get all trades:', error)
    throw new Error(`Failed to get all trades: ${error.message}`)
  }
}

export async function getUserTrades(address) {
  try {
    if (!address) throw new Error('Address is required')
    
    const ids = await publicClient.readContract({
      address: MARKETPLACE_ADDRESS,
      abi: marketplaceAbi,
      functionName: 'userTrades',
      args: [address],
    })

    const trades = await Promise.all(
      ids.map(id =>
        publicClient.readContract({
          address: MARKETPLACE_ADDRESS,
          abi: marketplaceAbi,
          functionName: 'trades',
          args: [id],
        })
      )
    )

    return { address, trades }
  } catch (error) {
    console.error('Failed to get user trades:', error)
    throw new Error(`Failed to get user trades: ${error.message}`)
  }
}

/* =======================================================
   5. ANALYTICS
======================================================= */

export async function getMarketplaceStats() {
  try {
    const { trades } = await getAllTrades()

    let totalVolume = 0n
    let totalValue = 0n

    for (let t of trades) {
      totalVolume += t.units
      totalValue += t.totalPrice
    }

    const avgPrice = totalVolume === 0n ? 0 : totalValue / totalVolume

    return {
      totalTrades: trades.length,
      totalVolume: totalVolume.toString(),
      totalValue: totalValue.toString(),
      averagePrice: avgPrice.toString(),
    }
  } catch (error) {
    console.error('Failed to get marketplace stats:', error)
    throw new Error(`Failed to get marketplace stats: ${error.message}`)
  }
}

export async function getAveragePrice() {
  try {
    const stats = await getMarketplaceStats()
    return { averagePrice: stats.averagePrice }
  } catch (error) {
    console.error('Failed to get average price:', error)
    throw new Error(`Failed to get average price: ${error.message}`)
  }
}

export async function getTotalVolume() {
  try {
    const stats = await getMarketplaceStats()
    return { totalVolume: stats.totalVolume }
  } catch (error) {
    console.error('Failed to get total volume:', error)
    throw new Error(`Failed to get total volume: ${error.message}`)
  }
}

/* =======================================================
   6. ADMIN
======================================================= */

export async function pauseMarketplace(privateKey) {
  try {
    if (!privateKey) throw new Error('Private key is required')
    
    const walletClient = getWalletClient(privateKey)
    const account = privateKeyToAccount(privateKey)
    console.log(`Pausing marketplace from address: ${account.address}`)

    const hash = await walletClient.writeContract({
      address: MARKETPLACE_ADDRESS,
      abi: marketplaceAbi,
      functionName: 'pause',
    })
    
    console.log(`Marketplace paused with hash: ${hash}`)
    return hash
  } catch (error) {
    console.error('Failed to pause marketplace:', error)
    throw new Error(`Failed to pause marketplace: ${error.message}`)
  }
}

export async function unpauseMarketplace(privateKey) {
  try {
    if (!privateKey) throw new Error('Private key is required')
    
    const walletClient = getWalletClient(privateKey)
    const account = privateKeyToAccount(privateKey)
    console.log(`Unpausing marketplace from address: ${account.address}`)

    const hash = await walletClient.writeContract({
      address: MARKETPLACE_ADDRESS,
      abi: marketplaceAbi,
      functionName: 'unpause',
    })
    
    console.log(`Marketplace unpaused with hash: ${hash}`)
    return hash
  } catch (error) {
    console.error('Failed to unpause marketplace:', error)
    throw new Error(`Failed to unpause marketplace: ${error.message}`)
  }
}

export async function isPaused() {
  try {
    return await publicClient.readContract({
      address: MARKETPLACE_ADDRESS,
      abi: marketplaceAbi,
      functionName: 'paused',
    })
  } catch (error) {
    console.error('Failed to check if paused:', error)
    throw new Error(`Failed to check if paused: ${error.message}`)
  }
}

/* =======================================================
   7. EVENTS
======================================================= */

export async function getEvents(eventName) {
  try {
    return { message: `Implement logs for ${eventName}` }
  } catch (error) {
    console.error('Failed to get events:', error)
    throw new Error(`Failed to get events: ${error.message}`)
  }
}

export async function getListedEvents() {
  try {
    return { message: 'Use getLogs() for EnergyListed' }
  } catch (error) {
    console.error('Failed to get listed events:', error)
    throw new Error(`Failed to get listed events: ${error.message}`)
  }
}

export async function getPurchasedEvents() {
  try {
    return { message: 'Use getLogs() for EnergyPurchased' }
  } catch (error) {
    console.error('Failed to get purchased events:', error)
    throw new Error(`Failed to get purchased events: ${error.message}`)
  }
}

export async function getCancelledEvents() {
  try {
    return { message: 'Use getLogs() for Cancelled' }
  } catch (error) {
    console.error('Failed to get cancelled events:', error)
    throw new Error(`Failed to get cancelled events: ${error.message}`)
  }
}

/* =======================================================
   8. DISPUTES
======================================================= */

export async function createDispute(privateKey, tradeId, reason) {
  try {
    if (!privateKey) throw new Error('Private key is required')
    if (!tradeId && tradeId !== 0) throw new Error('Trade ID is required')
    if (!reason) throw new Error('Reason is required')
    
    const walletClient = getWalletClient(privateKey)
    const account = privateKeyToAccount(privateKey)
    console.log(`Creating dispute for trade ${tradeId} from address: ${account.address}`)

    const hash = await walletClient.writeContract({
      address: MARKETPLACE_ADDRESS,
      abi: marketplaceAbi,
      functionName: 'raiseDispute',
      args: [BigInt(tradeId), reason],
    })
    
    console.log(`Dispute created with hash: ${hash}`)
    return hash
  } catch (error) {
    console.error('Failed to create dispute:', error)
    throw new Error(`Failed to create dispute: ${error.message}`)
  }
}

export async function assignArbitrator(privateKey, disputeId, arbitrator) {
  try {
    if (!privateKey) throw new Error('Private key is required')
    if (!disputeId && disputeId !== 0) throw new Error('Dispute ID is required')
    if (!arbitrator) throw new Error('Arbitrator address is required')
    
    const walletClient = getWalletClient(privateKey)
    const account = privateKeyToAccount(privateKey)
    console.log(`Assigning arbitrator for dispute ${disputeId} from address: ${account.address}`)

    const hash = await walletClient.writeContract({
      address: MARKETPLACE_ADDRESS,
      abi: marketplaceAbi,
      functionName: 'assignArbitrator',
      args: [BigInt(disputeId), arbitrator],
    })
    
    console.log(`Arbitrator assigned with hash: ${hash}`)
    return hash
  } catch (error) {
    console.error('Failed to assign arbitrator:', error)
    throw new Error(`Failed to assign arbitrator: ${error.message}`)
  }
}

export async function resolveDispute(privateKey, disputeId, decision) {
  try {
    if (!privateKey) throw new Error('Private key is required')
    if (!disputeId && disputeId !== 0) throw new Error('Dispute ID is required')
    if (!decision && decision !== 0) throw new Error('Decision is required')
    
    const walletClient = getWalletClient(privateKey)
    const account = privateKeyToAccount(privateKey)
    console.log(`Resolving dispute ${disputeId} from address: ${account.address}`)

    const hash = await walletClient.writeContract({
      address: MARKETPLACE_ADDRESS,
      abi: marketplaceAbi,
      functionName: 'resolveDispute',
      args: [BigInt(disputeId), decision],
    })
    
    console.log(`Dispute resolved with hash: ${hash}`)
    return hash
  } catch (error) {
    console.error('Failed to resolve dispute:', error)
    throw new Error(`Failed to resolve dispute: ${error.message}`)
  }
}

export async function getDisputeById(id) {
  try {
    return await publicClient.readContract({
      address: MARKETPLACE_ADDRESS,
      abi: marketplaceAbi,
      functionName: 'disputes',
      args: [BigInt(id)],
    })
  } catch (error) {
    console.error('Failed to get dispute:', error)
    throw new Error(`Failed to get dispute: ${error.message}`)
  }
}

export async function getAllDisputes() {
  try {
    const total = await publicClient.readContract({
      address: MARKETPLACE_ADDRESS,
      abi: marketplaceAbi,
      functionName: 'getDisputeCount',
    })

    const disputes = []

    for (let i = 0; i < total; i++) {
      const d = await getDisputeById(i)
      disputes.push(d)
    }

    return { total: total.toString(), disputes }
  } catch (error) {
    console.error('Failed to get all disputes:', error)
    throw new Error(`Failed to get all disputes: ${error.message}`)
  }
}

/* =======================================================
   9. ROLES
======================================================= */

export async function grantRole(privateKey, role, account) {
  try {
    if (!privateKey) throw new Error('Private key is required')
    if (!role) throw new Error('Role is required')
    if (!account) throw new Error('Account address is required')
    
    const walletClient = getWalletClient(privateKey)
    const adminAccount = privateKeyToAccount(privateKey)
    console.log(`Granting role to ${account} from address: ${adminAccount.address}`)

    const hash = await walletClient.writeContract({
      address: MARKETPLACE_ADDRESS,
      abi: marketplaceAbi,
      functionName: 'grantRole',
      args: [role, account],
    })
    
    console.log(`Role granted with hash: ${hash}`)
    return hash
  } catch (error) {
    console.error('Failed to grant role:', error)
    throw new Error(`Failed to grant role: ${error.message}`)
  }
}

export async function revokeRole(privateKey, role, account) {
  try {
    if (!privateKey) throw new Error('Private key is required')
    if (!role) throw new Error('Role is required')
    if (!account) throw new Error('Account address is required')
    
    const walletClient = getWalletClient(privateKey)
    const adminAccount = privateKeyToAccount(privateKey)
    console.log(`Revoking role from ${account} from address: ${adminAccount.address}`)

    const hash = await walletClient.writeContract({
      address: MARKETPLACE_ADDRESS,
      abi: marketplaceAbi,
      functionName: 'revokeRole',
      args: [role, account],
    })
    
    console.log(`Role revoked with hash: ${hash}`)
    return hash
  } catch (error) {
    console.error('Failed to revoke role:', error)
    throw new Error(`Failed to revoke role: ${error.message}`)
  }
}


export async function checkRole(role, address) {
  try {
    if (!role) throw new Error('Role is required')
    if (!address) throw new Error('Address is required')
    const checksumAddress = getAddress(address)

    let roleHash;

    // 1. Check if the user is asking for the root admin
    if (role === 'DEFAULT_ADMIN_ROLE' || role === '0x00') {
      // The default admin role is 32 bytes of zeros
      roleHash = pad('0x00', { size: 32 }); 
    } else {
      // 2. Convert standard strings like "PRODUCER_ROLE" or "ADMIN_ROLE"
      roleHash = keccak256(toBytes(role));
    }

    console.log(`Checking ${role} (${roleHash}) for ${address}`);

    return await publicClient.readContract({
      address: MARKETPLACE_ADDRESS,
      abi: marketplaceAbi,
      functionName: 'hasRole',
      args: [roleHash, checksumAddress], // ✅ use normalized address
    });

  } catch (error) {
    console.error('Failed to check role:', error);
    throw new Error(`Failed to check role: ${error.message}`);
  }
}

export async function getAllRoles(address) {
  try {
    return {
      message: 'Manually check roles like in tokenService',
    }
  } catch (error) {
    console.error('Failed to get all roles:', error)
    throw new Error(`Failed to get all roles: ${error.message}`)
  }
}

/* =======================================================
   10. PRODUCER MANAGEMENT
======================================================= */

export async function registerProducer(
  privateKey,
  name,
  location,
  totalCapacity,
  energyType
) {
  try {
    // Validate inputs
    if (!privateKey) throw new Error('Private key is required')
    if (!name || name.trim() === '') throw new Error('Name is required')
    if (!location || location.trim() === '') throw new Error('Location is required')
    if (!totalCapacity || totalCapacity <= 0) throw new Error('Total capacity must be positive')
    
    const walletClient = getWalletClient(privateKey)
    const account = privateKeyToAccount(privateKey)
    console.log(`Registering producer with address: ${account.address}`)
    
    // Convert energyType to enum index using helper
    const energyTypeIndex = getEnergyTypeIndex(energyType)
    
    console.log(`Registering producer with energy type: ${energyTypeIndex} (${getEnergyTypeString(energyTypeIndex)})`)
    
    // Execute transaction
    const hash = await walletClient.writeContract({
      address: MARKETPLACE_ADDRESS,
      abi: marketplaceAbi,
      functionName: 'registerProducer',
      args: [
        name,
        location,
        BigInt(totalCapacity),
        energyTypeIndex
      ],
    })
    
    console.log(`Producer registration transaction sent: ${hash}`)
    return hash
    
  } catch (error) {
    console.error('Producer registration failed:', error)
    throw new Error(`Registration failed: ${error.message}`)
  }
}

export async function verifyProducer(privateKey, producerAddress) {
  try {
    // Validate inputs
    if (!privateKey) throw new Error('Private key is required')
    if (!producerAddress) throw new Error('Producer address is required')
    
    const walletClient = getWalletClient(privateKey)
    const account = privateKeyToAccount(privateKey)
    console.log(`Verifying producer ${producerAddress} with admin address: ${account.address}`)
    
    const hash = await walletClient.writeContract({
      address: MARKETPLACE_ADDRESS,
      abi: marketplaceAbi,
      functionName: 'verifyProducer',
      args: [producerAddress],
    })
    
    console.log(`Producer verification transaction sent: ${hash}`)
    return hash
    
  } catch (error) {
    console.error('Producer verification failed:', error)
    throw new Error(`Verification failed: ${error.message}`)
  }
}

export async function getProducer(address) {
  try {
    if (!address) throw new Error('Address is required')
    
    const producer = await publicClient.readContract({
      address: MARKETPLACE_ADDRESS,
      abi: marketplaceAbi,
      functionName: 'producers',
      args: [address],
    })

    // viem returns struct as array, access by index
    return {
      address: producer[0],
      name: producer[1],
      location: producer[2],
      totalCapacity: producer[3].toString(),
      availableCapacity: producer[4].toString(),
      energyType: producer[5],
      energyTypeString: getEnergyTypeString(producer[5]),
      isVerified: producer[6],
      verificationTimestamp: producer[7].toString(),
      totalTrades: producer[8].toString(),
      totalEnergySold: producer[9].toString(),
      reputation: producer[10].toString()
    }
    
  } catch (error) {
    console.error('Failed to get producer:', error)
    throw new Error(`Failed to get producer: ${error.message}`)
  }
}

export async function getAllProducers() {
  try {
    // This depends on your contract implementation
    // If you have a way to get all producers, implement it here
    // For now, this is a placeholder
    throw new Error('Get all producers not implemented yet - depends on contract structure')
  } catch (error) {
    console.error('Failed to get all producers:', error)
    throw error
  }
}

export async function updateProducerCapacity(privateKey, newCapacity) {
  try {
    if (!privateKey) throw new Error('Private key is required')
    if (!newCapacity || newCapacity <= 0) throw new Error('New capacity must be positive')
    
    const walletClient = getWalletClient(privateKey)
    const account = privateKeyToAccount(privateKey)
    console.log(`Updating producer capacity to ${newCapacity} from address: ${account.address}`)
    
    const hash = await walletClient.writeContract({
      address: MARKETPLACE_ADDRESS,
      abi: marketplaceAbi,
      functionName: 'updateProducerCapacity', // Make sure this function exists in your contract
      args: [BigInt(newCapacity)],
    })
    
    console.log(`Producer capacity update transaction sent: ${hash}`)
    return hash
    
  } catch (error) {
    console.error('Failed to update producer capacity:', error)
    throw new Error(`Update failed: ${error.message}`)
  }
}

/* =======================================================
   COMMON
======================================================= */

export async function getTransactionStatus(txHash) {
  try {
    if (!txHash) throw new Error('Transaction hash is required')
    
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash })

    if (!receipt) return { status: 'PENDING' }

    return {
      status: receipt.status === 'success' ? 'SUCCESS' : 'FAILED',
      blockNumber: receipt.blockNumber.toString(),
      gasUsed: receipt.gasUsed.toString(),
      effectiveGasPrice: receipt.effectiveGasPrice.toString()
    }
  } catch (error) {
    console.error('Failed to get transaction status:', error)
    throw new Error(`Failed to get transaction status: ${error.message}`)
  }
}


export async function reportMeterReading(
  privateKey,
  tradeId,
  readingBefore,
  readingAfter
) {
  try {
    // Validation (keep consistent with your style)
    if (!privateKey) throw new Error('Private key is required')
    if (tradeId === undefined) throw new Error('Trade ID is required')
    if (readingBefore === undefined) throw new Error('readingBefore is required')
    if (readingAfter === undefined) throw new Error('readingAfter is required')

    if (readingAfter < readingBefore) {
      throw new Error('Invalid meter data: after < before')
    }

    const walletClient = getWalletClient(privateKey)
    const account = privateKeyToAccount(privateKey)

    console.log(
      `Reporting meter reading for trade ${tradeId} from ${account.address}`
    )

    const hash = await walletClient.writeContract({
      address: MARKETPLACE_ADDRESS,
      abi: marketplaceAbi,
      functionName: 'reportMeterReading',
      args: [
        BigInt(tradeId),
        BigInt(readingBefore),
        BigInt(readingAfter),
      ],
    })

    console.log(`Meter reading reported: ${hash}`)
    return hash
  } catch (error) {
    console.error('Failed to report meter reading:', error)

    // Better viem error handling (same pattern as others)
    if (error.shortMessage) {
      throw new Error(`Failed to report meter reading: ${error.shortMessage}`)
    }

    throw new Error(`Failed to report meter reading: ${error.message}`)
  }
}