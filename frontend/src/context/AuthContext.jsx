import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/axios";
import { connectSocket, disconnectSocket } from "../api/socket";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("tempchat_user");
    const token = localStorage.getItem("tempchat_token");
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
      connectSocket(token);
    }
    setLoading(false);
  }, []);

  const register = async (username, password) => {
    const { data } = await api.post("/auth/register", { username, password });
    localStorage.setItem("tempchat_token", data.token);
    localStorage.setItem("tempchat_user", JSON.stringify(data.user));
    setUser(data.user);
    connectSocket(data.token);
    return data.user;
  };

  const login = async (username, password) => {
    const { data } = await api.post("/auth/login", { username, password });
    localStorage.setItem("tempchat_token", data.token);
    localStorage.setItem("tempchat_user", JSON.stringify(data.user));
    setUser(data.user);
    connectSocket(data.token);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("tempchat_token");
    localStorage.removeItem("tempchat_user");
    disconnectSocket();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
