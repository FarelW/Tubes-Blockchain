import { Link } from 'react-router-dom'

function Home() {
  return (
    <div className="max-w-6xl mx-auto">
      <section className="text-center py-12 bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl text-white mb-12 shadow-xl">
        <h1 className="text-5xl font-bold mb-4">B2B Logistics Escrow System</h1>
        <p className="text-xl mb-8 opacity-90">
          Secure payment escrow for logistics with IoT sensor verification
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            to="/create"
            className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition shadow-lg"
          >
            Create New Escrow
          </Link>
          <Link
            to="/dashboard"
            className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition"
          >
            View Dashboard
          </Link>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition text-center">
            <div className="text-5xl mb-4">🔒</div>
            <h3 className="text-xl font-semibold mb-2 text-gray-800">Secure Escrow</h3>
            <p className="text-gray-600">
              Funds are held securely in a smart contract until delivery conditions are met
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition text-center">
            <div className="text-5xl mb-4">📡</div>
            <h3 className="text-xl font-semibold mb-2 text-gray-800">IoT Verification</h3>
            <p className="text-gray-600">
              Automatic verification using GPS and temperature sensors to ensure safe delivery
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition text-center">
            <div className="text-5xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold mb-2 text-gray-800">Oracle Integration</h3>
            <p className="text-gray-600">
              Real-time data from IoT sensors verified by blockchain oracle for transparency
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition text-center">
            <div className="text-5xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold mb-2 text-gray-800">Auto Release</h3>
            <p className="text-gray-600">
              Automatic fund release when all conditions are verified, no manual intervention needed
            </p>
          </div>
        </div>
      </section>

    </div>
  )
}

export default Home
