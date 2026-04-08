import express from 'express'
import * as marketplaceController from '../controllers/marketplaceController.js'
import asyncHandler from '../utils/asyncHandler.js'



const router = express.Router()

/* =======================================================
   1. LISTING OPERATIONS (SELL ENERGY)
======================================================= */

// List energy -> createListing
// POST /api/marketplace/list
router.post(
   '/list',
   asyncHandler(marketplaceController.listEnergy)
)


// POST /api/marketplace/cancel
router.post('/cancel', marketplaceController.cancelListing)  //-> cancelListing

// POST /api/marketplace/update-fee  -> Admin only(updateFeeConfig)
router.post('/update-fee', marketplaceController.updatefeeConfig) 


/* =======================================================
   2. BUY OPERATIONS
======================================================= */

// POST /api/marketplace/buy    -> purchaseEnergy
router.post(
   '/buy',
   asyncHandler(marketplaceController.buyEnergy)
)



/* =======================================================
   3. LISTING QUERIES
======================================================= */

// GET /api/marketplace/listings   -> "getProducerListings" function
router.get('/listings', marketplaceController.getAllListings)

// GET /api/marketplace/listing/:id -> call the mapping "listings",pass the listingId to get the listing details
router.get(
   '/listing/:id', 
   asyncHandler(marketplaceController.getListingById)
)

// GET /api/marketplace/seller/:address  -> cal "userListings" mapping to get all listingIds created by the seller, then loop to get the details of each listing
router.get('/seller/:address', marketplaceController.getListingsBySeller)

// GET /api/marketplace/buyer/:address   -> call the "userTrades" mapping , get all trades by that buyer. get the tradeId and call "trades" mapping to get the trade details
// router.get('/buyer/:address', marketplaceController.getPurchasesByBuyer)

// GET /api/marketplace/active    ->get the listing count, and then loop in the backend to get all listings,then filter the active once
router.get('/active', marketplaceController.getActiveListings)


/* =======================================================
   4. TRANSACTION & TRADE HISTORY
======================================================= */

// GET /api/marketplace/trades    -> call "getTradeCount" to get the tradecounter, then loop through and call "trades" mapping to get all trades
router.get('/trades', marketplaceController.getAllTrades)

// GET /api/marketplace/trades/:address -> call the "userTrades" mapping , get all trades by that buyer. get the tradeId and call "trades" mapping to get the trade details
router.get('/trades/:address', marketplaceController.getUserTrades)

// GET /api/marketplace/transaction/:txHash    
router.get('/transaction/:txHash', marketplaceController.getTransactionStatus)


/* =======================================================
   5. MARKET DATA / ANALYTICS
======================================================= */

// GET /api/marketplace/price/average   -> get all trades by tradecounter and loop. then loop through trades and calculate the average price
router.get('/price/average', marketplaceController.getAveragePrice)

// GET /api/marketplace/volume   -> get all trades by tradecounter and loop. then loop through trades and calculate the total volume
router.get('/volume', marketplaceController.getTotalVolume)

// GET /api/marketplace/stats   -> get total listings, total trades, total volume, average price, active listings count, etc.
router.get('/stats', marketplaceController.getMarketplaceStats)


/* =======================================================
   6. ADMIN OPERATIONS
======================================================= */

// POST /api/marketplace/pause   -> pause function in the contract, only admin can call
router.post('/pause', marketplaceController.pauseMarketplace)

// POST /api/marketplace/unpause  -> unpause function in the contract, only admin can call
router.post('/unpause', marketplaceController.unpauseMarketplace)

// GET /api/marketplace/paused      
router.get('/paused', marketplaceController.isPaused)


/* =======================================================
   7. EVENTS (REAL-TIME DATA)
======================================================= */

// GET /api/marketplace/events/:eventName
router.get('/events/:eventName', marketplaceController.getEvents)

// GET /api/marketplace/events/listed
router.get('/events/listed', marketplaceController.getListedEvents)

// GET /api/marketplace/events/purchased
router.get('/events/purchased', marketplaceController.getPurchasedEvents)

// GET /api/marketplace/events/cancelled
router.get('/events/cancelled', marketplaceController.getCancelledEvents)




/* =======================================================
   8. DISPUTE MANAGEMENT
======================================================= */

// Raise a dispute
// POST /api/marketplace/dispute/create   -> raiseDispute
router.post('/dispute/create', marketplaceController.createDispute)


// assignArbitrator
// POST /api/marketplace/dispute/assign-arbitrator
router.post('/dispute/assign-arbitrator', marketplaceController.assignArbitrator)

// Resolve a dispute (admin/arbiter)
// POST /api/marketplace/dispute/resolve    -> resolveDispute
router.post('/dispute/resolve', marketplaceController.resolveDispute)

// Get dispute by ID
// GET /api/marketplace/dispute/:id    -> "disputes" mapping
router.get('/dispute/:id', marketplaceController.getDisputeById)

// Get disputes for a specific trade
// GET /api/marketplace/dispute/trade/:tradeId
// router.get('/dispute/trade/:tradeId', marketplaceController.getDisputesByTrade)

// Get disputes raised by a user
// GET /api/marketplace/dispute/user/:address
// router.get('/dispute/user/:address', marketplaceController.getUserDisputes)

// Get all disputes
// GET /api/marketplace/disputes   -> call "getDisputeCount" then loop and call "disputes" mapping to get all disputes
router.get('/disputes', marketplaceController.getAllDisputes)



/* =======================================================
   9. Role MANAGEMENT
======================================================= */

// POST /api/marketplace/roles/grant  -> 
router.post('/roles/grant', marketplaceController.grantRole)

// POST /api/marketplace/roles/revoke  
router.post('/roles/revoke', marketplaceController.revokeRole)

// GET /api/marketplace/roles/:role/:address
router.get(
   '/roles/:role/:address', asyncHandler(marketplaceController.checkRole)
)


// GET /api/marketplace/roles/all/:address
router.get('/roles/all/:address', marketplaceController.getAllRoles)


/* =======================================================
   10. PRODUCER MANAGEMENT
======================================================= */

// Register as producer
// POST /api/marketplace/producer/register
router.post(
  '/producer/register',
  asyncHandler(marketplaceController.registerProducer)
)


// Verify producer (admin/verifier)
// POST /api/marketplace/producer/verify
router.post(
   '/producer/verify',
   asyncHandler(marketplaceController.verifyProducer)
)

// Get producer info
// GET /api/marketplace/producer/:address
router.get(
   '/producer/:address',
   asyncHandler(marketplaceController.getProducer)
)

// POST /api/trades/report-reading
router.post(
   "/report-reading", 
   asyncHandler(marketplaceController.reportMeterReadingController)
);


export default router