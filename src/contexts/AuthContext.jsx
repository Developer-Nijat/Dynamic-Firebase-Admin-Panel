import { createContext, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
// CUSTOM IMPORTS
import { auth } from "../config/firebase";
import useAuthStore from "../store/authStore";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const { loading, setLoading, user, setUser } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, [setUser, setLoading]);

  const value = {
    user,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
