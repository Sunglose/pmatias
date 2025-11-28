import { createContext, useContext, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export const loginRequest = async (email, password) => {
  const { data } = await api.post("/auth/login", { email, password });
  return data;
};

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem("token");
    const userRaw = localStorage.getItem("user");
    let user = null;
    try {
      user = userRaw && userRaw !== "undefined" ? JSON.parse(userRaw) : null;
    } catch {
      user = null;
    }
    return token && user ? { token, user } : { token: null, user: null };
  });

  const login = ({ accessToken, refreshToken, user }) => {
    localStorage.setItem("token", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    localStorage.setItem("user", JSON.stringify(user));
    setAuth({ token: accessToken, user });
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("agendar_cart");
    localStorage.removeItem("agendar_draft");
    sessionStorage.removeItem("agendar_cart:pasajero:anon");
    sessionStorage.removeItem("agendar_draft:pasajero:anon");

    // Elimina todos los carritos/drafts por rol y userId
    const roles = ["cliente", "admin", "cajera", "pasajero"];
    const userIds = [auth.user?.id, "anon"];
    roles.forEach(role => {
      userIds.forEach(uid => {
        localStorage.removeItem(`agendar_cart:${role}:${uid}`);
        localStorage.removeItem(`agendar_draft:${role}:${uid}`);
        sessionStorage.removeItem(`agendar_cart:${role}:${uid}`);
        sessionStorage.removeItem(`agendar_draft:${role}:${uid}`);
      });
    });

    window.location.href = "/auth/login";
  };

  // Derivar role y userId del user
  const role = auth.user?.rol || "pasajero";
  const userId = auth.user?.id || "anon";

  return (
    <AuthContext.Provider value={{ ...auth, login, logout, role, userId }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);