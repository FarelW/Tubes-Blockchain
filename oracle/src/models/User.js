import { dbRun, dbGet, dbAll } from '../database/db.js'
import bcrypt from 'bcryptjs'

export class User {
  static async create({ username, email, password, role, walletAddress }) {
    const hashedPassword = await bcrypt.hash(password, 10)
    const result = await dbRun(
      `INSERT INTO users (username, email, password, role, wallet_address) VALUES (?, ?, ?, ?, ?)`,
      [username, email, hashedPassword, role, walletAddress]
    )
    
    return this.findById(result.lastID)
  }

  static async verifyPassword(user, password) {
    if (!user.password) return false
    return await bcrypt.compare(password, user.password)
  }

  static async findById(id) {
    return dbGet('SELECT * FROM users WHERE id = ?', [id])
  }

  static async findByUsername(username) {
    return dbGet('SELECT * FROM users WHERE username = ?', [username])
  }

  static async findByEmail(email) {
    return dbGet('SELECT * FROM users WHERE email = ?', [email])
  }

  static async findByWalletAddress(walletAddress) {
    // Normalize to lowercase for case-insensitive comparison
    const normalizedAddress = walletAddress.toLowerCase()
    return dbGet('SELECT * FROM users WHERE LOWER(wallet_address) = ?', [normalizedAddress])
  }

  static async findByRole(role) {
    return dbAll('SELECT * FROM users WHERE role = ?', [role])
  }

  static async countByRole(role) {
    const result = await dbGet('SELECT COUNT(*) as count FROM users WHERE role = ?', [role])
    return result ? result.count : 0
  }

  static async findAll() {
    return dbAll('SELECT id, username, email, role, wallet_address, created_at FROM users')
  }

  static async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await dbRun(
      `UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [hashedPassword, id]
    )
    return this.findById(id)
  }

  static async update(id, { username, email, role, walletAddress }) {
    await dbRun(
      `UPDATE users SET username = ?, email = ?, role = ?, wallet_address = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [username, email, role, walletAddress, id]
    )
    return this.findById(id)
  }

  static async delete(id) {
    return dbRun('DELETE FROM users WHERE id = ?', [id])
  }
}

