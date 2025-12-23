import { db } from '../database/db.js'

console.log('Database initialized successfully!')
console.log('Tables created: users, sessions')

db.close()

