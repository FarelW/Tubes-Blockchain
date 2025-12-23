import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

export enum UserRole {
  ADMIN = 'admin',
  SHIPPER = 'shipper',
  LOGISTICS = 'logistics'
}

interface RoleContextType {
  currentRole: UserRole | null
  setRole: (role: UserRole) => void
}

const RoleContext = createContext<RoleContextType | undefined>(undefined)

export const useRole = () => {
  const context = useContext(RoleContext)
  if (!context) {
    throw new Error('useRole must be used within RoleProvider')
  }
  return context
}

interface RoleProviderProps {
  children: ReactNode
}

export const RoleProvider = ({ children }: RoleProviderProps) => {
  const [currentRole, setCurrentRole] = useState<UserRole | null>(() => {
    const saved = localStorage.getItem('selectedRole')
    return saved ? (saved as UserRole) : null
  })

  const setRole = (role: UserRole) => {
    setCurrentRole(role)
    localStorage.setItem('selectedRole', role)
  }

  return (
    <RoleContext.Provider
      value={{
        currentRole,
        setRole
      }}
    >
      {children}
    </RoleContext.Provider>
  )
}

