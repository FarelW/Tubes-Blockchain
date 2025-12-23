import sqlite3 from 'sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dataDir = path.join(__dirname, '../../data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const dbPath = path.join(dataDir, 'escrow.db')

export const db = new sqlite3.Database(dbPath)

// Promisify database methods
export const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err)
      else resolve({ lastID: this.lastID, changes: this.changes })
    })
  })
}

export const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err)
      else resolve(row)
    })
  })
}

export const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err)
      else resolve(rows)
    })
  })
}

// Initialize database
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT,
      role TEXT NOT NULL CHECK(role IN ('admin', 'shipper', 'logistics')),
      wallet_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      wallet_address TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)

  db.run(`CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address)`)
  db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_wallet_unique ON users(wallet_address) WHERE wallet_address IS NOT NULL`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`)

  db.all(`PRAGMA table_info(users)`, (err, rows) => {
    if (err) {
      console.error('Error checking table info:', err)
      setTimeout(() => initializeAdmin(), 1000)
      return
    }

    if (rows && rows.length > 0) {
      const hasPassword = rows.some(row => row.name === 'password')

      // Check if we need to migrate roles (check for old buyer/seller roles)
      db.all(`SELECT COUNT(*) as count FROM users WHERE role IN ('buyer', 'seller')`, (checkErr, checkRows) => {
        if (checkErr) {
          console.error('Error checking for old roles:', checkErr)
          setTimeout(() => initializeAdmin(), 1000)
          return
        }

        const hasOldRoles = checkRows && checkRows.length > 0 && checkRows[0].count > 0

        if (hasOldRoles) {
          // Need to recreate table with new CHECK constraint
          console.log('Detected old role schema. Migrating to new schema...')

          // Step 1: Create temporary table with new schema
          db.run(`
            CREATE TABLE IF NOT EXISTS users_new (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              username TEXT UNIQUE NOT NULL,
              email TEXT UNIQUE NOT NULL,
              password TEXT,
              role TEXT NOT NULL CHECK(role IN ('admin', 'shipper', 'logistics')),
              wallet_address TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `, (createErr) => {
            if (createErr) {
              console.error('Error creating new users table:', createErr)
              setTimeout(() => initializeAdmin(), 1000)
              return
            }

            // Step 2: Copy data with role mapping
            db.run(`
              INSERT INTO users_new (id, username, email, password, role, wallet_address, created_at, updated_at)
              SELECT 
                id,
                username,
                email,
                password,
                CASE 
                  WHEN role = 'buyer' THEN 'shipper'
                  WHEN role = 'seller' THEN 'logistics'
                  ELSE role
                END as role,
                wallet_address,
                created_at,
                updated_at
              FROM users
            `, (copyErr) => {
              if (copyErr) {
                console.error('Error copying data to new table:', copyErr)
                setTimeout(() => initializeAdmin(), 1000)
                return
              }

              // Step 3: Drop old table
              db.run(`DROP TABLE users`, (dropErr) => {
                if (dropErr) {
                  console.error('Error dropping old table:', dropErr)
                  setTimeout(() => initializeAdmin(), 1000)
                  return
                }

                // Step 4: Rename new table
                db.run(`ALTER TABLE users_new RENAME TO users`, (renameErr) => {
                  if (renameErr) {
                    console.error('Error renaming table:', renameErr)
                    setTimeout(() => initializeAdmin(), 1000)
                    return
                  }

                  console.log('Successfully migrated users table to new role schema')

                  // Recreate indexes
                  db.run(`CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address)`)
                  db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_wallet_unique ON users(wallet_address) WHERE wallet_address IS NOT NULL`)
                  db.run(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`)

                  // Continue with password check
                  if (!hasPassword) {
                    db.run(`ALTER TABLE users ADD COLUMN password TEXT`, (alterErr) => {
                      if (alterErr) {
                        console.error('Error adding password column:', alterErr)
                      } else {
                        console.log('Password column added to users table')
                      }
                      setTimeout(() => initializeAdmin(), 500)
                    })
                  } else {
                    setTimeout(() => initializeAdmin(), 500)
                  }
                })
              })
            })
          })
        } else {
          // No old roles, just check password column
          if (!hasPassword) {
            db.run(`ALTER TABLE users ADD COLUMN password TEXT`, (alterErr) => {
              if (alterErr) {
                console.error('Error adding password column:', alterErr)
              } else {
                console.log('Password column added to users table')
              }
              setTimeout(() => initializeAdmin(), 500)
            })
          } else {
            setTimeout(() => initializeAdmin(), 500)
          }

          // Add unique constraint to wallet_address if not exists
          db.all(`PRAGMA index_list(users)`, (indexErr, indexes) => {
            if (!indexErr) {
              const hasUniqueWallet = indexes?.some(idx => idx.name === 'idx_users_wallet_unique')
              if (!hasUniqueWallet) {
                // Create unique index for wallet_address (allows NULL)
                db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_wallet_unique ON users(wallet_address) WHERE wallet_address IS NOT NULL`, (uniqueErr) => {
                  if (uniqueErr) {
                    console.error('Error creating unique wallet index:', uniqueErr)
                  } else {
                    console.log('Unique constraint added to wallet_address')
                  }
                })
              }
            }
          })
        }
      })
    } else {
      setTimeout(() => initializeAdmin(), 1000)
    }
  })
})

async function initializeDefaultUsers() {
  try {
    const { User } = await import('../models/User.js')
    const bcrypt = (await import('bcryptjs')).default
    const defaultPassword = '12345678'
    const hashedPassword = await bcrypt.hash(defaultPassword, 10)

    // Default accounts configuration
    const defaultAccounts = [
      {
        username: 'admin',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin',
        walletAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
      },
      {
        username: 'shipper',
        email: 'shipper@example.com',
        password: hashedPassword,
        role: 'shipper',
        walletAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
      },
      {
        username: 'logistics',
        email: 'logistics@example.com',
        password: hashedPassword,
        role: 'logistics',
        walletAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'
      }
    ]

    for (const account of defaultAccounts) {
      const existingUser = await User.findByUsername(account.username)

      if (!existingUser) {
        // Create user if doesn't exist
        await User.create(account)
        console.log(`${account.role} account auto-created: ${account.username}`)
        console.log(`  Password: ${defaultPassword}`)
        console.log(`  Wallet: ${account.walletAddress}`)
      } else {
        // Update password and wallet if user exists
        await User.updatePassword(existingUser.id, defaultPassword)
        
        if (!existingUser.wallet_address || existingUser.wallet_address.toLowerCase() !== account.walletAddress.toLowerCase()) {
          await User.update(existingUser.id, {
            username: existingUser.username,
            email: existingUser.email,
            role: existingUser.role,
            walletAddress: account.walletAddress
          })
          console.log(`${account.role} account wallet address set to: ${account.walletAddress}`)
        }

        console.log(`${account.role} account password updated to default: ${defaultPassword}`)
      }
    }

    console.log('Default accounts initialized successfully!')
  } catch (error) {
    console.error('Error auto-creating/updating default accounts:', error)
  }
}

// Keep initializeAdmin for backward compatibility
async function initializeAdmin() {
  await initializeDefaultUsers()
}

console.log('Database initialized at:', dbPath)

