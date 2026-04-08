import express from 'express'
import * as tokenController from '../controllers/tokenController.js'

const router = express.Router()

/* =======================================================
   1. TOKEN INFORMATION
======================================================= */

// GET /api/token/info
router.get('/info', tokenController.getTokenInfo)

// GET /api/token/balance/:address
router.get('/balance/:address', tokenController.getBalance)


/* =======================================================
   2. TRANSFER OPERATIONS
======================================================= */

// POST /api/token/transfer
router.post('/transfer', tokenController.transfer)

// POST /api/token/transfer-from
router.post('/transfer-from', tokenController.transferFrom)


/* =======================================================
   3. MINTING OPERATIONS (MINTER_ROLE)
======================================================= */

// POST /api/token/mint
router.post('/mint', tokenController.mint)

// GET /api/token/minters
// router.get('/minters', tokenController.getMinters)


/* =======================================================
   4. ROLE MANAGEMENT (ADMIN)
======================================================= */

// POST /api/token/add-minter
router.post('/add-minter', tokenController.addMinter)

// POST /api/token/remove-minter
router.post('/remove-minter', tokenController.removeMinter)

// GET /api/token/roles/:address
router.get('/roles/:address', tokenController.getRoles)


/* =======================================================
   5. PAUSABLE OPERATIONS
======================================================= */

// POST /api/token/pause
router.post('/pause', tokenController.pause)

// POST /api/token/unpause
router.post('/unpause', tokenController.unpause)

// GET /api/token/paused
router.get('/paused', tokenController.isPaused)


/* =======================================================
   6. BLACKLIST OPERATIONS
======================================================= */

// POST /api/token/blacklist
router.post('/blacklist', tokenController.blacklist)

// POST /api/token/unblacklist
router.post('/unblacklist', tokenController.unblacklist)

// GET /api/token/blacklist/:address
router.get('/blacklist/:address', tokenController.isBlacklisted)

// GET /api/token/blacklist/all
router.get('/blacklist/all', tokenController.getAllBlacklisted)


/* =======================================================
   7. ALLOWANCE OPERATIONS
======================================================= */

// GET /api/token/allowance/:owner/:spender
router.get('/allowance/:owner/:spender', tokenController.getAllowance)

// POST /api/token/approve
router.post('/approve', tokenController.approve)


/* =======================================================
   8. PERMIT (GASLESS APPROVAL)
======================================================= */

// POST /api/token/permit
router.post('/permit', tokenController.permit)


/* =======================================================
   9. TRANSACTION & EVENTS
======================================================= */

// GET /api/token/transaction/:txHash
router.get('/transaction/:txHash', tokenController.getTransactionStatus)

// GET /api/token/events/:eventName
router.get('/events/:eventName', tokenController.getEvents)

export default router