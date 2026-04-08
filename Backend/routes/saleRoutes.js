import express from 'express'
import * as saleController from '../controllers/saleController.js'
import asyncHandler from '../utils/asyncHandler.js'

const router = express.Router()

/* =======================================================
   1. BUY TOKENS (CORE FLOW)
======================================================= */

// POST /api/sale/buy
// Buy ERC20 tokens using ETH
router.post(
   '/buy',
   asyncHandler(saleController.buyTokens)
)


/* =======================================================
   2. PRICE INFO
======================================================= */

// GET /api/sale/price
// Get token price (ETH → token rate)
router.get('/price', saleController.getTokenPrice)


/* =======================================================
   3. USER PURCHASE INFO
======================================================= */

// GET /api/sale/purchased/:address
// Get total tokens bought by a user
router.get('/purchased/:address', saleController.getUserPurchases)


/* =======================================================
   4. ADMIN OPERATIONS
======================================================= */

// POST /api/sale/withdraw
// Withdraw ETH collected from token sales
router.post('/withdraw', saleController.withdrawFunds)

// GET /api/sale/balance
// Check contract ETH balance
router.get('/balance', saleController.getContractBalance)


/* =======================================================
   5. TRANSACTION & EVENTS
======================================================= */

// GET /api/sale/transaction/:txHash
router.get('/transaction/:txHash', saleController.getTransactionStatus)

// GET /api/sale/events/:eventName
router.get('/events/:eventName', saleController.getEvents)

// GET /api/sale/events/purchased
router.get('/events/purchased', saleController.getPurchaseEvents)

export default router