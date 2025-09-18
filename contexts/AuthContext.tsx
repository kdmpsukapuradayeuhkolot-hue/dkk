import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User, Role } from '../types';
import { db, ensureDemoUsers } from '../db/db';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string, role: Role) => Promise<boolean>;
  logout: () => void;
  updateUser: (updatedUserData: Partial<User>) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await ensureDemoUsers();
        const storedUser = localStorage.getItem('warung_pos_user');
        if (storedUser) {
          const parsedUser: User = JSON.parse(storedUser);
          // Re-validate user from DB to ensure they still exist
          const dbUser = await db.users.where('username').equals(parsedUser.username).first();
          if (dbUser) {
            const userToSet = { ...dbUser };
            delete userToSet.password;
            setUser(userToSet);
          } else {
            localStorage.removeItem('warung_pos_user');
          }
        }
      } catch (error) {
        console.error("Failed to initialize app or load user from storage", error);
        localStorage.removeItem('warung_pos_user');
      } finally {
        setLoading(false);
      }
    };
    initializeApp();
  }, []);

  const login = useCallback(async (username: string, password: string, _role: Role): Promise<boolean> => {
    const usernameNorm = username.trim().toLowerCase();
    const dbUser = await db.users.where('usernameNorm').equals(usernameNorm).first();

    if (dbUser && dbUser.password === password) {
      const userToStore = { ...dbUser };
      delete userToStore.password; 

      setUser(userToStore);
      localStorage.setItem('warung_pos_user', JSON.stringify(userToStore));
      
      if (dbUser.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/pos');
      }
      return true;
    }
    
    return false;
  }, [navigate]);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('warung_pos_user');
    navigate('/login');
  }, [navigate]);

  const updateUser = useCallback((updatedUserData: Partial<User>) => {
    setUser(prevUser => {
        if (!prevUser) return null;
        const newUser = { ...prevUser, ...updatedUserData };
        localStorage.setItem('warung_pos_user', JSON.stringify(newUser));
        return newUser;
    });
  }, []);


  const value = useMemo(() => ({ user, loading, login, logout, updateUser }), [user, loading, login, logout, updateUser]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
