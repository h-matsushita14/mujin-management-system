import { createContext, useContext, useState } from 'react';

const UserContext = createContext();

export function useUser() {
  return useContext(UserContext);
}

export function UserProvider({ children }) {
  const [selectedUser] = useState({ name: 'Test User' }); // Dummy user

  const value = {
    selectedUser,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
