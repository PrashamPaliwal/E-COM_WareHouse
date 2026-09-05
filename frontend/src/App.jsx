import React, { useState } from "react";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import Login from "./components/Login.jsx";
import StaffDashboard from "./components/StaffDashboard.jsx";
import AdminDashboard from "./components/AdminDashboard.jsx";

export default function App() {
  const [user, setUser] = useState(null);

  return (
    <ThemeProvider>
      {!user ? (
        <Login onLogin={setUser} />
      ) : user.role === "admin" ? (
        <AdminDashboard onLogout={() => setUser(null)} />
      ) : (
        <StaffDashboard user={user} onLogout={() => setUser(null)} />
      )}
    </ThemeProvider>
  );
}
