import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { Toaster } from "react-hot-toast";
// CUSTOM IMPORTS
import { db } from "./config/firebase";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import CollectionBuilder from "./pages/CollectionBuilder";
import CollectionView from "./pages/CollectionView";
import FirstTimeSetup from "./pages/FirstTimeSetup";
import Layout from "./components/Layout";
import CollectionEdit from "./pages/CollectionEdit";
import { AuthProvider } from "./contexts/AuthContext";
import ItemCreate from "./pages/ItemCreate";
import ItemEdit from "./pages/ItemEdit";
import useAuthStore from "./store/authStore";

function AppContent() {
  const { user, loading } = useAuthStore();
  const [hasAdmin, setHasAdmin] = useState(null);

  useEffect(() => {
    const checkAdminExists = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        const hasAdminUser = !usersSnapshot.empty;
        setHasAdmin(hasAdminUser);
      } catch (error) {
        console.error("Error checking admin users:", error);
        setHasAdmin(false);
      }
    };

    checkAdminExists();
  }, []);

  if (loading || hasAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <Routes>
        {!hasAdmin ? (
          <Route path="*" element={<FirstTimeSetup />} />
        ) : (
          <>
            <Route
              path="/login"
              element={!user ? <Login /> : <Navigate to="/dashboard" />}
            />
            <Route
              path="/forgot-password"
              element={
                !user ? <ForgotPassword /> : <Navigate to="/dashboard" />
              }
            />

            <Route
              path="/"
              element={user ? <Layout /> : <Navigate to="/login" />}
            >
              <Route index element={<Navigate to="/dashboard" />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="collections/new" element={<CollectionBuilder />} />
              <Route
                path="collections/:collectionId"
                element={<CollectionView />}
              />
              <Route
                path="collections/:collectionId/edit"
                element={<CollectionEdit />}
              />
              <Route
                path="/collections/:collectionId/items/new"
                element={<ItemCreate />}
              />
              <Route
                path="/collections/:collectionId/items/:itemId/edit"
                element={<ItemEdit />}
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </>
        )}
      </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
