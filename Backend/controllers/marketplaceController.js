import * as marketplaceService from '../services/marketplaceService.js'

/* =======================================================
   1. LISTING OPERATIONS
======================================================= */

export async function listEnergy(req, res) {
  try {
    const { privateKey, units, pricePerUnit, startTime, endTime, minPurchaseAmount, maxPurchaseAmount, qualityCertificate } = req.body

    const txHash = await marketplaceService.listEnergy(
      privateKey,
      units,
      pricePerUnit,
      startTime,
      endTime,
      minPurchaseAmount,
      maxPurchaseAmount,
      qualityCertificate
    )

    res.json({ success: true, txHash })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

export async function cancelListing(req, res) {
  try {
    const { privateKey, listingId } = req.body

    const txHash = await marketplaceService.cancelListing(
      privateKey,
      listingId
    )

    res.json({ success: true, txHash })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

export async function updatefeeConfig(req, res) {
  try {
    const { privateKey, fee } = req.body

    const txHash = await marketplaceService.updateFeeConfig(
      privateKey,
      fee
    )

    res.json({ success: true, txHash })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

/* =======================================================
   2. BUY OPERATIONS
======================================================= */

export async function buyEnergy(req, res) {
  try {
    const { privateKey, listingId, units } = req.body

    const txHash = await marketplaceService.buyEnergy(
      privateKey,
      listingId,
      units
    )

    res.json({ success: true, txHash })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

/* =======================================================
   3. LISTING QUERIES
======================================================= */

export async function getAllListings(req, res) {
  try {
    const data = await marketplaceService.getAllListings()

    res.json({ success: true, ...data })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

export async function getListingById(req, res) {
  try {
    const { id } = req.params

    const listing = await marketplaceService.getListingById(id)

    res.json({ success: true, listing })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

export async function getListingsBySeller(req, res) {
  try {
    const { address } = req.params

    const data = await marketplaceService.getListingsBySeller(address)

    res.json({ success: true, ...data })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

export async function getActiveListings(req, res) {
  try {
    const data = await marketplaceService.getActiveListings()

    res.json({ success: true, ...data })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

/* =======================================================
   4. TRADES
======================================================= */

export async function getAllTrades(req, res) {
  try {
    const data = await marketplaceService.getAllTrades()

    res.json({ success: true, ...data })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

export async function getUserTrades(req, res) {
  try {
    const { address } = req.params

    const data = await marketplaceService.getUserTrades(address)

    res.json({ success: true, ...data })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

export async function getTransactionStatus(req, res) {
  try {
    const { txHash } = req.params

    const status = await marketplaceService.getTransactionStatus(txHash)

    res.json({ success: true, ...status })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

/* =======================================================
   5. ANALYTICS
======================================================= */

export async function getAveragePrice(req, res) {
  try {
    const data = await marketplaceService.getAveragePrice()

    res.json({ success: true, ...data })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

export async function getTotalVolume(req, res) {
  try {
    const data = await marketplaceService.getTotalVolume()

    res.json({ success: true, ...data })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

export async function getMarketplaceStats(req, res) {
  try {
    const data = await marketplaceService.getMarketplaceStats()

    res.json({ success: true, ...data })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

/* =======================================================
   6. ADMIN
======================================================= */

export async function pauseMarketplace(req, res) {
  try {
    const { privateKey } = req.body

    const txHash = await marketplaceService.pauseMarketplace(privateKey)

    res.json({ success: true, txHash })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

export async function unpauseMarketplace(req, res) {
  try {
    const { privateKey } = req.body

    const txHash = await marketplaceService.unpauseMarketplace(privateKey)

    res.json({ success: true, txHash })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

export async function isPaused(req, res) {
  try {
    const paused = await marketplaceService.isPaused()

    res.json({ success: true, paused })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

/* =======================================================
   7. EVENTS
======================================================= */

export async function getEvents(req, res) {
  try {
    const { eventName } = req.params

    const events = await marketplaceService.getEvents(eventName)

    res.json({ success: true, events })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

export async function getListedEvents(req, res) {
  try {
    const events = await marketplaceService.getListedEvents()

    res.json({ success: true, events })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

export async function getPurchasedEvents(req, res) {
  try {
    const events = await marketplaceService.getPurchasedEvents()

    res.json({ success: true, events })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

export async function getCancelledEvents(req, res) {
  try {
    const events = await marketplaceService.getCancelledEvents()

    res.json({ success: true, events })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

/* =======================================================
   8. DISPUTES
======================================================= */

export async function createDispute(req, res) {
  try {
    const { privateKey, tradeId, reason } = req.body

    const txHash = await marketplaceService.createDispute(
      privateKey,
      tradeId,
      reason
    )

    res.json({ success: true, txHash })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

export async function assignArbitrator(req, res) {
  try {
    const { privateKey, disputeId, arbitrator } = req.body

    const txHash = await marketplaceService.assignArbitrator(
      privateKey,
      disputeId,
      arbitrator
    )

    res.json({ success: true, txHash })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

export async function resolveDispute(req, res) {
  try {
    const { privateKey, disputeId, decision } = req.body

    const txHash = await marketplaceService.resolveDispute(
      privateKey,
      disputeId,
      decision
    )

    res.json({ success: true, txHash })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

export async function getDisputeById(req, res) {
  try {
    const { id } = req.params

    const dispute = await marketplaceService.getDisputeById(id)

    res.json({ success: true, dispute })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

export async function getAllDisputes(req, res) {
  try {
    const data = await marketplaceService.getAllDisputes()

    res.json({ success: true, ...data })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

/* =======================================================
   9. ROLES
======================================================= */

export async function grantRole(req, res) {
  try {
    const { privateKey, role, account } = req.body

    const txHash = await marketplaceService.grantRole(
      privateKey,
      role,
      account
    )

    res.json({ success: true, txHash })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

export async function revokeRole(req, res) {
  try {
    const { privateKey, role, account } = req.body

    const txHash = await marketplaceService.revokeRole(
      privateKey,
      role,
      account
    )

    res.json({ success: true, txHash })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

export async function checkRole(req, res) {
  try {
    const { role, address } = req.params

    const hasRole = await marketplaceService.checkRole(role, address)

    res.json({ success: true, hasRole })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

export async function getAllRoles(req, res) {
  try {
    const { address } = req.params

    const roles = await marketplaceService.getAllRoles(address)

    res.json({ success: true, ...roles })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}



/* =======================================================
   10. PRODUCER MANAGEMENT
======================================================= */


// marketplace.controller.js
export async function registerProducer(req, res) {
  try {
    const { 
      privateKey,
      name, 
      location, 
      totalCapacity, 
      energyType 
    } = req.body

    // Validate required fields
    if (!privateKey || !name || !location || !totalCapacity) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: privateKey, name, location, totalCapacity are required',
      })
    }

    // Validate private key format (should be 0x + 64 hex chars)
    if (!privateKey.startsWith('0x') || privateKey.length !== 66) {
      return res.status(400).json({
        success: false,
        error: 'Invalid private key format. Should start with 0x and be 66 characters long',
      })
    }

    // Validate totalCapacity is positive number
    if (totalCapacity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Total capacity must be positive',
      })
    }

    const txHash = await marketplaceService.registerProducer(
      privateKey,
      name,
      location,
      parseInt(totalCapacity),
      energyType
    )

    res.json({ 
      success: true, 
      txHash,
      message: 'Producer registration transaction submitted successfully'
    })
    
  } catch (err) {
    console.error('Error in registerProducer controller:', err)
    res.status(500).json({ 
      success: false, 
      error: err.message 
    })
  }
}

export async function verifyProducer(req, res) {
  try {
    const { privateKey, producerAddress } = req.body

    const txHash = await marketplaceService.verifyProducer(
      privateKey,
      producerAddress
    )

    res.json({ success: true, txHash })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

export async function getProducer(req, res) {
  try {
    const { address } = req.params

    const producer = await marketplaceService.getProducer(address)

    res.json({ success: true, producer })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

export const reportMeterReadingController = async (req, res) => {
    try {
        const { tradeId, readingBefore, readingAfter } = req.body;

        // Basic validation
        if (
            tradeId === undefined ||
            readingBefore === undefined ||
            readingAfter === undefined
        ) {
            return res.status(400).json({
                success: false,
                error: "Missing required fields",
            });
        }

        const result = await marketplaceService.reportMeterReading({
            tradeId,
            readingBefore,
            readingAfter,
        });

        return res.status(200).json({
            success: true,
            message: "Meter reading reported successfully",
            txHash: result.txHash,
        });
    } catch (error) {
        console.error("Controller Error:", error);

        return res.status(500).json({
            success: false,
            error: error.message || "Internal server error",
        });
    }
};