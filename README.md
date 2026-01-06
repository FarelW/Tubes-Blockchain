# B2B Logistics Escrow System

Sistem escrow berbasis blockchain untuk transaksi B2B logistics dengan verifikasi IoT otomatis menggunakan smart contract Ethereum.

## Daftar Isi

1. [Deskripsi Aplikasi](#deskripsi-aplikasi)
2. [Requirements](#requirements)
3. [Struktur Repository](#struktur-repository)
4. [Langkah Menjalankan Private Chain](#langkah-menjalankan-private-chain)
5. [Deployment Smart Contract](#deployment-smart-contract)
6. [Deployment dan Integrasi Oracle](#deployment-dan-integrasi-oracle)
7. [Menjalankan Aplikasi](#menjalankan-aplikasi)
8. [Cara Menggunakan Aplikasi](#cara-menggunakan-aplikasi)

---

## Deskripsi Aplikasi

**B2B Logistics Escrow System** adalah aplikasi decentralized (dApp) yang memfasilitasi transaksi escrow untuk layanan logistics B2B dengan fitur:

### Fitur Utama

- **Smart Contract Escrow**: Dana ditahan di smart contract hingga delivery terverifikasi
- **Role-Based Access**: Tiga role utama (Shipper, Logistics, Admin)
- **Price Negotiation**: Logistics menentukan harga, shipper membayar setelah approve
- **IoT Verification**: Verifikasi otomatis menggunakan data GPS dan suhu dari IoT sensors
- **Status Tracking**: Real-time tracking status delivery dari request hingga completed
- **Wallet Integration**: Integrasi dengan MetaMask untuk transaksi blockchain

### Workflow

1. **Shipper** membuat request escrow (tanpa bayar)
2. **Logistics** set harga dan approve/reject request
3. **Shipper** membayar setelah approve
4. **Logistics** mulai delivery dan update status
5. **Oracle** verifikasi delivery menggunakan data IoT (GPS & suhu)
6. **Admin** dapat mengubah status secara manual jika diperlukan
7. **Funds** otomatis released ke logistics saat completed

### Status Escrow

- `Created` (0): Shipper mengirim request
- `PriceProposed` (1): Logistics mengusulkan harga
- `PriceRejected` (2): Logistics menolak request
- `Funded` (3): Shipper telah membayar
- `InTransit` (4): Logistics sedang mengantar
- `Delivered` (5): Logistics menandai sebagai delivered
- `Completed` (6): Admin verifikasi dan complete (funds released)
- `Refunded` (7): Dana dikembalikan ke shipper
- `Disputed` (8): Terjadi dispute

---

## Requirements

1. **Node.js & npm**

2. **MetaMask Browser Extension**

---

## Struktur Repository

```
TUBES-BLOCKCHAIN/
├── frontend/              # React + TypeScript frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── contexts/      # React contexts (Auth, Toast, Role)
│   │   ├── pages/         # Page components
│   │   ├── services/      # API & contract services
│   │   └── utils/         # Constants & utilities
│   ├── package.json
│   └── vite.config.ts
│
├── smart-contract/        # Hardhat smart contract project
│   ├── contracts/         # Solidity contracts
│   │   └── EscrowContract.sol
│   ├── scripts/           # Deployment scripts
│   │   ├── deploy.js
│   │   └── updateOracle.js
│   ├── test/              # Contract tests
│   ├── hardhat.config.js
│   └── package.json
│
├── oracle/                # Node.js backend (Oracle + Auth API)
│   ├── src/
│   │   ├── config/        # Configuration files
│   │   ├── database/     # Database setup
│   │   ├── models/        # Data models
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   └── scripts/       # Database scripts
│   ├── data/              # SQLite database
│   ├── env.example
│   └── package.json
│
├── LICENSE                # MIT License
├── README.md              # This file
├── deploy.sh              # Deployment script (Linux/macOS)
└── deploy.ps1             # Deployment script (Windows)
```

---

## Langkah Menjalankan Private Chain

Kami menggunakan **Hardhat Network** sebagai private blockchain untuk development.

### Metode 1: Hardhat Node (Recommended untuk Development)

Hardhat menyediakan local blockchain yang sudah terkonfigurasi dengan 20 akun default yang masing-masing memiliki 10,000 ETH.

#### Langkah-langkah:

1. **Install Dependencies**
   ```bash
   cd smart-contract
   npm install
   ```

2. **Jalankan Hardhat Node**
   ```bash
   npm run node
   # atau
   npx hardhat node
   ```

   Node akan berjalan di `http://127.0.0.1:8545` dengan Chain ID `31337`

3. **Import Account ke MetaMask**
   
   Hardhat node akan menampilkan daftar akun dan private keys:
   ```
   Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
   Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
   ```

   **Cara import ke MetaMask:**
   - Buka MetaMask
   - Klik icon account → Import Account
   - Paste private key
   - Network akan otomatis terdeteksi sebagai "Hardhat Network"

4. **Konfigurasi Network di MetaMask**
   - Network Name: `Hardhat Local`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency Symbol: `ETH`

---

## Deployment Smart Contract

### Prerequisites

1. Hardhat node sudah berjalan
2. Dependencies sudah terinstall
3. MetaMask sudah terhubung ke Hardhat network

### Langkah Deployment

1. **Pastikan Hardhat Node Berjalan**
   ```bash
   cd smart-contract
   npm run node
   ```

2. **Deploy Contract**
   ```bash
   # Di terminal baru
   cd smart-contract
   npm run deploy
   ```

3. **Catat Contract Address**
   
   Setelah deployment, script akan menampilkan:
   ```
   EscrowContract deployed to: 0x.....
   ```
   
   **PENTING**: Simpan address ini untuk konfigurasi frontend dan oracle!

4. **Update Contract Address**

   **Frontend:**
   ```typescript
   // frontend/src/utils/constants.ts
   export const ESCROW_CONTRACT_ADDRESS = '0x.....'
   ```

   **Oracle:**
   ```bash
   # oracle/.env
   ESCROW_CONTRACT_ADDRESS=0x.....
   ```

### Script Deployment (`smart-contract/scripts/deploy.js`)

Script ini akan:
- Menggunakan akun pertama dari Hardhat node sebagai deployer
- Deploy EscrowContract dengan deployer sebagai oracle
- Menyimpan deployment info ke `deployments/localhost.json`
- Menampilkan contract address dan oracle address

### Update Oracle Address (Jika Perlu)

Jika ingin menggunakan oracle address yang berbeda:

```bash
cd smart-contract
npx hardhat run scripts/updateOracle.js --network localhost
```

---

## Deployment dan Integrasi Oracle

Oracle service berfungsi sebagai:
1. **Backend API**: Authentication & Authorization
2. **Oracle Service**: Verifikasi delivery menggunakan data IoT
3. **Event Listener**: Monitor blockchain events untuk trigger otomatis

### Langkah Deployment Oracle

1. **Install Dependencies**
   ```bash
   cd oracle
   npm install
   ```

2. **Setup Environment Variables**
   ```bash
   # Copy env.example ke .env
   cp env.example .env
   
   # Edit .env dan isi dengan:
   PORT=3001
   RPC_URL=http://127.0.0.1:8545
   CHAIN_ID=31337
   ESCROW_CONTRACT_ADDRESS=0x.....
   ORACLE_PRIVATE_KEY=0x.....
   IOT_API_ENDPOINT=http://localhost:3001/api/oracle/mock-iot
   LOG_LEVEL=info
   ```

   **Catatan**: 
   - `ESCROW_CONTRACT_ADDRESS`: Gunakan address dari deployment sebelumnya
   - `ORACLE_PRIVATE_KEY`: Gunakan private key dari akun yang digunakan sebagai oracle

3. **Initialize Database**
   ```bash
   npm run init-db
   ```
   
   Script ini akan membuat:
   - Database SQLite di `oracle/data/escrow.db`
   - Tabel `users` dan `sessions`
   - Default accounts (admin, shipper, logistics)

4. **Reset Database (Opsional)**
   
   Jika ingin reset database ke kondisi awal:
   ```bash
   npm run reset-db
   ```
   
   Script ini akan:
   - Menghapus semua sessions
   - Menghapus semua users kecuali default accounts
   - Reset default accounts (admin, shipper, logistics)
   - Reset smart contract escrow counter

5. **Start Oracle Service**
   ```bash
   npm start
   ```

---

## Menjalankan Aplikasi

### 1. Start Hardhat Node
```bash
cd smart-contract
npm run node
```
**Biarkan terminal ini tetap terbuka!**

### 2. Deploy Smart Contract
```bash
# Di terminal baru
cd smart-contract
npm run deploy
```

### 3. Start Oracle Service
```bash
# Di terminal baru
cd oracle
npm start
```

### 4. Start Frontend
```bash
# Di terminal baru
cd frontend
npm install
npm run dev
```

Frontend akan berjalan di `http://localhost:3000`

### 5. Setup MetaMask

1. Install MetaMask extension
2. Import account dari Hardhat node (lihat langkah "Langkah Menjalankan Private Chain")
3. Connect ke Hardhat network (Chain ID: 31337)

---

## 📖 Cara Menggunakan Aplikasi

### Default Accounts

Setelah `npm run init-db`, tersedia 3 default accounts: (Wallet disesuaikan dengan hasil hardhat masing-masing)

1. **Admin**
   - Username: `admin`
   - Password: `12345678`
   - Wallet: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`

2. **Shipper**
   - Username: `shipper`
   - Password: `12345678`
   - Wallet: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`

3. **Logistics**
   - Username: `logistics`
   - Password: `12345678`
   - Wallet: `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`

### Workflow Penggunaan

#### 1. Shipper Membuat Request

1. Login sebagai **shipper**
2. Klik "Create New Escrow"
3. Pilih logistics provider
4. Isi detail:
   - Destination GPS coordinates
   - Min & Max temperature
   - Deadline (dalam hari)
5. Submit request
6. Status: `Created` (Send Request)

#### 2. Logistics Set Price & Approve

1. Login sebagai **logistics**
2. Lihat request di dashboard
3. Klik "Set Price & Approve"
4. Input harga (dalam ETH)
5. Klik "Approve"
6. Status berubah menjadi: `PriceProposed`

**Atau** klik "Reject" untuk menolak request
7. Status berubah menjadi: `PriceRejected`

#### 3. Shipper Membayar

1. Login sebagai **shipper**
2. Lihat order dengan status `PriceProposed`
3. Klik "Pay [amount] ETH"
4. Confirm payment di MetaMask
5. Status berubah menjadi: `Funded`

#### 4. Logistics Start Delivery

1. Login sebagai **logistics**
2. Lihat order dengan status `Funded`
3. Klik "Start Delivery"
4. Status berubah menjadi: `InTransit` (Delivering)

#### 5. Logistics Mark Delivered

1. Login sebagai **logistics**
2. Lihat order dengan status `InTransit`
3. Klik "Mark Delivered"
4. Status berubah menjadi: `Delivered`

#### 6. Admin Verify & Complete

1. Login sebagai **admin**
2. Lihat semua orders
3. Klik "Update Status" pada order yang sudah `Delivered`
4. Klik "✓ Complete (Release Funds to Logistics)"
5. Oracle akan otomatis verify menggunakan data IoT
6. Jika verifikasi berhasil, status menjadi `Completed` dan funds released ke logistics

#### 7. Refund (Jika Gagal)

Admin dapat mengubah status menjadi `Refunded` untuk mengembalikan dana ke shipper.

---

## License

MIT License - Lihat file [LICENSE](LICENSE) untuk detail lengkap.

---

## Contributors

- 13522047 / Farel Winalda
- 13522055 / Benardo
- 13522073 / Juan Alfred Wijaya

---