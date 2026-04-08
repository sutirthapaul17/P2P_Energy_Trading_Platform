import * as saleService from '../services/saleService.js'

/* =======================================================
   1. BUY TOKENS
======================================================= */

export async function buyTokens(req, res) {
  try {
    const { privateKey, amount } = req.body

    if (!privateKey || !amount) {
      return res.status(400).json({
        success: false,
        error: 'privateKey and amount are required',
      })
    }

    const txHash = await saleService.buyTokens(privateKey, amount)

    res.json({
      success: true,
      txHash,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({
      success: false,
      error: err.message,
    })
  }
}

/* =======================================================
   2. TOKEN PRICE
======================================================= */

export async function getTokenPrice(req, res) {
  try {
    const price = await saleService.getTokenPrice()

    res.json({
      success: true,
      price,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({
      success: false,
      error: err.message,
    })
  }
}

/* =======================================================
   3. USER PURCHASES
======================================================= */

export async function getUserPurchases(req, res) {
  try {
    const { address } = req.params

    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'address is required',
      })
    }

    const data = await saleService.getUserPurchases(address)

    res.json({
      success: true,
      ...data,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({
      success: false,
      error: err.message,
    })
  }
}

/* =======================================================
   4. ADMIN OPERATIONS
======================================================= */

export async function withdrawFunds(req, res) {
  try {
    const { privateKey } = req.body

    if (!privateKey) {
      return res.status(400).json({
        success: false,
        error: 'privateKey is required',
      })
    }

    const txHash = await saleService.withdrawFunds(privateKey)

    res.json({
      success: true,
      txHash,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({
      success: false,
      error: err.message,
    })
  }
}

export async function getContractBalance(req, res) {
  try {
    const balance = await saleService.getContractBalance()

    res.json({
      success: true,
      balance,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({
      success: false,
      error: err.message,
    })
  }
}

/* =======================================================
   5. TRANSACTION STATUS
======================================================= */

export async function getTransactionStatus(req, res) {
  try {
    const { txHash } = req.params

    if (!txHash) {
      return res.status(400).json({
        success: false,
        error: 'txHash is required',
      })
    }

    const status = await saleService.getTransactionStatus(txHash)

    res.json({
      success: true,
      ...status,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({
      success: false,
      error: err.message,
    })
  }
}

/* =======================================================
   6. EVENTS
======================================================= */

export async function getEvents(req, res) {
  try {
    const { eventName } = req.params

    if (!eventName) {
      return res.status(400).json({
        success: false,
        error: 'eventName is required',
      })
    }

    const events = await saleService.getEvents(eventName)

    res.json({
      success: true,
      events,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({
      success: false,
      error: err.message,
    })
  }
}

export async function getPurchaseEvents(req, res) {
  try {
    const events = await saleService.getPurchaseEvents()

    res.json({
      success: true,
      events,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({
      success: false,
      error: err.message,
    })
  }
}