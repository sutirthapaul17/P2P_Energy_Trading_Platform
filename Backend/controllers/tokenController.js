import * as tokenService from '../services/tokenService.js'

/* =======================================================
   1. TOKEN INFORMATION
======================================================= */

export async function getTokenInfo(req, res) {
  try {
    const info = await tokenService.getTokenInfo()

    res.json({
      success: true,
      ...info,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

export async function getBalance(req, res) {
  try {
    const { address } = req.params

    if (!address) {
      return res.status(400).json({ success: false, error: 'address required' })
    }

    const balance = await tokenService.getBalance(address)

    res.json({
      success: true,
      balance,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

/* =======================================================
   2. TRANSFER OPERATIONS
======================================================= */

export async function transfer(req, res) {
  try {
    const { privateKey, toAddress, amount } = req.body

    if (!privateKey || !toAddress || !amount) {
      return res.status(400).json({ success: false, error: 'missing fields' })
    }

    const txHash = await tokenService.transfer(privateKey, toAddress, amount)

    res.json({ success: true, txHash })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

export async function transferFrom(req, res) {
  try {
    const { privateKey, fromAddress, toAddress, amount } = req.body

    if (!privateKey || !fromAddress || !toAddress || !amount) {
      return res.status(400).json({ success: false, error: 'missing fields' })
    }

    const txHash = await tokenService.transferFrom(
      privateKey,
      fromAddress,
      toAddress,
      amount
    )

    res.json({ success: true, txHash })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

/* =======================================================
   3. MINTING OPERATIONS
======================================================= */

export async function mint(req, res) {
  try {
    const { privateKey, toAddress, amount } = req.body

    if (!privateKey || !toAddress || !amount) {
      return res.status(400).json({ success: false, error: 'missing fields' })
    }

    const txHash = await tokenService.mint(privateKey, toAddress, amount)

    res.json({ success: true, txHash })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

export async function getMinters(req, res) {
  try {
    const data = await tokenService.getMinters()

    res.json({ success: true, ...data })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

/* =======================================================
   4. ROLE MANAGEMENT
======================================================= */

export async function addMinter(req, res) {
  try {
    const { privateKey, accountAddress } = req.body

    if (!privateKey || !accountAddress) {
      return res.status(400).json({ success: false, error: 'missing fields' })
    }

    const txHash = await tokenService.addMinter(privateKey, accountAddress)

    res.json({ success: true, txHash })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

export async function removeMinter(req, res) {
  try {
    const { privateKey, accountAddress } = req.body

    if (!privateKey || !accountAddress) {
      return res.status(400).json({ success: false, error: 'missing fields' })
    }

    const txHash = await tokenService.removeMinter(privateKey, accountAddress)

    res.json({ success: true, txHash })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

export async function getRoles(req, res) {
  try {
    const { address } = req.params

    const roles = await tokenService.getRoles(address)

    res.json({ success: true, ...roles })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

/* =======================================================
   5. PAUSABLE
======================================================= */

export async function pause(req, res) {
  try {
    const { privateKey } = req.body

    const txHash = await tokenService.pause(privateKey)

    res.json({ success: true, txHash })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

export async function unpause(req, res) {
  try {
    const { privateKey } = req.body

    const txHash = await tokenService.unpause(privateKey)

    res.json({ success: true, txHash })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

export async function isPaused(req, res) {
  try {
    const paused = await tokenService.isPaused()

    res.json({ success: true, paused })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

/* =======================================================
   6. BLACKLIST
======================================================= */

export async function blacklist(req, res) {
  try {
    const { privateKey, accountAddress } = req.body

    const txHash = await tokenService.blacklist(privateKey, accountAddress)

    res.json({ success: true, txHash })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

export async function unblacklist(req, res) {
  try {
    const { privateKey, accountAddress } = req.body

    const txHash = await tokenService.unblacklist(privateKey, accountAddress)

    res.json({ success: true, txHash })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

export async function isBlacklisted(req, res) {
  try {
    const { address } = req.params

    const result = await tokenService.isBlacklisted(address)

    res.json({ success: true, blacklisted: result })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

export async function getAllBlacklisted(req, res) {
  try {
    const data = await tokenService.getAllBlacklisted()

    res.json({ success: true, ...data })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

/* =======================================================
   7. ALLOWANCE
======================================================= */

export async function getAllowance(req, res) {
  try {
    const { owner, spender } = req.params

    const allowance = await tokenService.getAllowance(owner, spender)

    res.json({ success: true, allowance })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

export async function approve(req, res) {
  try {
    const { privateKey, spenderAddress, amount } = req.body

    const txHash = await tokenService.approve(
      privateKey,
      spenderAddress,
      amount
    )

    res.json({ success: true, txHash })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

/* =======================================================
   8. PERMIT
======================================================= */

export async function permit(req, res) {
  try {
    const { owner, spender, value, deadline, v, r, s } = req.body

    const txHash = await tokenService.permit(
      owner,
      spender,
      value,
      deadline,
      v,
      r,
      s
    )

    res.json({ success: true, txHash })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

/* =======================================================
   9. TRANSACTION & EVENTS
======================================================= */

export async function getTransactionStatus(req, res) {
  try {
    const { txHash } = req.params

    const status = await tokenService.getTransactionStatus(txHash)

    res.json({ success: true, ...status })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}

export async function getEvents(req, res) {
  try {
    const { eventName } = req.params

    const events = await tokenService.getEvents(eventName)

    res.json({ success: true, events })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}