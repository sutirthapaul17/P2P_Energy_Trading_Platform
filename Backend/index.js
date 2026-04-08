import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'

import tokenRoutes from './routes/tokenRoute.js'
import marketplaceRoutes from './routes/marketPlaceRoute.js'
import saleRoutes from './routes/saleRoutes.js'

dotenv.config()

const app = express()

// Middleware
app.use(cors())
app.use(express.json())

// Routes
app.use('/api/token', tokenRoutes)
app.use('/api/marketplace', marketplaceRoutes)
app.use('/api/sale', saleRoutes)

// Error handling middleware (MUST be last)
app.use((err, req, res, next) => {
  console.error('❌ Error occurred:')
  console.error('➡️ Method:', req.method)
  console.error('➡️ URL:', req.originalUrl)
  console.error('➡️ Body:', req.body)
  console.error('➡️ Error:', err.message)
  console.error(err.stack)

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  })
})


app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
  })
})


// Health check (optional but useful)
app.get('/', (req, res) => {
  res.send('API is running 🚀')
})

// Start server
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})