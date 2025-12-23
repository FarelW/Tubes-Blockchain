import { dbRun, dbGet, dbAll } from '../database/db.js'
import crypto from 'crypto'

export class Session {
  static async create({ userId, walletAddress, expiresInHours = 24 }) {
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000)

    await dbRun(
      `INSERT INTO sessions (user_id, token, wallet_address, expires_at) VALUES (?, ?, ?, ?)`,
      [userId, token, walletAddress, expiresAt.toISOString()]
    )
    
    return this.findByToken(token)
  }

  static async findByToken(token) {
    return dbGet(
      `SELECT s.*, u.username, u.email, u.role 
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.token = ? AND s.expires_at > datetime('now')`,
      [token]
    )
  }

  static async findByUserId(userId) {
    return dbAll(
      `SELECT * FROM sessions 
       WHERE user_id = ? AND expires_at > datetime('now')
       ORDER BY created_at DESC`,
      [userId]
    )
  }

  static async delete(token) {
    return dbRun('DELETE FROM sessions WHERE token = ?', [token])
  }

  static async deleteExpired() {
    return dbRun("DELETE FROM sessions WHERE expires_at <= datetime('now')")
  }

  static async deleteByUserId(userId) {
    return dbRun('DELETE FROM sessions WHERE user_id = ?', [userId])
  }
}

