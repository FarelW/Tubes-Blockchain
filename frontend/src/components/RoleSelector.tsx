import { useRole, UserRole } from '../contexts/RoleContext'
import { useAuth } from '../contexts/AuthContext'

function RoleSelector() {
  const { currentRole } = useRole()
  const { authenticatedRole, logout } = useAuth()

  const handleSwitchRole = () => {
    logout()
    window.location.href = '/'
  }

  if (!currentRole || !authenticatedRole) {
    return null
  }

  return (
    <div className="bg-white px-4 py-2 rounded-lg shadow-md flex items-center gap-3">
      <div className="flex items-center gap-2">
        <span className="text-2xl">
          {currentRole === UserRole.ADMIN && '👨‍💼'}
          {currentRole === UserRole.SHIPPER && '🚢'}
          {currentRole === UserRole.LOGISTICS && '🚚'}
        </span>
        <div>
          <div className="font-semibold text-gray-800 capitalize">{currentRole}</div>
        </div>
      </div>
      <button
        onClick={handleSwitchRole}
        className="ml-auto text-xs text-gray-500 hover:text-gray-700 underline"
      >
        Switch Role
      </button>
    </div>
  )
}

export default RoleSelector

