// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import AppShell from "./components/layout/AppShell.jsx";

import ClientePedidos from "./pages/p_cliente/ClientePedidos";
import ClientePerfil from "./pages/p_cliente/ClientePerfil";

import CajaConfirmarPin from "./pages/p_cajera/ConfirmarPin.jsx";

import AdminClientes from "./pages/p_admin/AdminClientes";
import AdminProductos from "./pages/p_admin/AdminProductos";
import AdminAprobar from "./pages/p_admin/AdminAprobar.jsx";

import Login from "./pages/Login";
import AuthOlvido from "./pages/AuthOlvido";
import AuthReset from "./pages/AuthReset";
import AgendarPedido from "./pages/AgendarPedido";
import AgendarConfirmacion from "./pages/AgendarConfirmacion.jsx";
import HistorialPedidos from "./pages/HistorialPedidos.jsx";
import PinPedido from "./pages/PinPedido.jsx";

import ErrorNotFound from "./404";
import ErrorNoAccess from "./403";

function Forbidden(){ return <div style={{ padding: 24 }}><ErrorNoAccess/></div>; }

function SessionAwarePassengerRoute({ element }) {
  const { user } = useAuth();
  if (user) {
    const role = (user.rol || "").toLowerCase();
    const base = role === "admin" ? "/admin" : role === "cajera" ? "/cajera" : "/cliente";
    return <Navigate to={base} replace />;
  }
  return element;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ===== RUTAS PÚBLICAS (PASAJERO SIN LOGIN) ===== */}
          {/* Dejo la raíz al kiosco/QR para que el pasajero entre directo */}
          <Route path="/" element={<AppShell title="Panadería Matías" />}>
            <Route
              path="/"
              element={<SessionAwarePassengerRoute element={<AgendarPedido />} />}
            />
            <Route
              path="/agendar"
              element={<SessionAwarePassengerRoute element={<AgendarPedido />} />}
            />
            <Route
              path="/agendar/confirmacion"
              element={<SessionAwarePassengerRoute element={<AgendarConfirmacion />} />}
            />
          </Route>

          <Route path="/pin/:id" element={<PinPedido />} />

          {/* redirigir /login -> /auth/login */}
          <Route path="/login" element={<Navigate to="/auth/login" replace />} />

          {/* ===== AUTENTICACIÓN (anidada en /auth) ===== */}
          <Route path="/auth" >
            <Route index element={<Navigate to="login" replace />} />
            <Route path="login" element={<Login />} />
            <Route path="olvido" element={<AuthOlvido />} />
            <Route path="reset" element={<AuthReset />} />
            <Route path="reset/:token" element={<AuthReset />} />
          </Route>

          {/* ===== RUTAS PROTEGIDAS (CLIENTE / CAJERA / ADMIN) ===== */}
          <Route element={<ProtectedRoute/>}>
            {/* CLIENTE */}
            <Route path="/cliente" element={<AppShell title="Panadería Matías" />}>
              {/* index del cliente → su propia pantalla de agendar */}
              <Route path="/cliente" element={<AgendarPedido />} />
              <Route path="/cliente/agendar/confirmacion" element={<AgendarConfirmacion />} />
              <Route path="/cliente/pedidos" element={<ClientePedidos />} />
              <Route path="/cliente/perfil" element={<ClientePerfil />} />
            </Route>

            {/* CAJERA */}
            <Route path="/cajera" element={<AppShell title="Administación"/>}>
              <Route path="/cajera/" element={<CajaConfirmarPin />} />
              <Route path="/cajera/agendar" element={<AgendarPedido />} />
              <Route path="/cajera/agendar/confirmacion" element={<AgendarConfirmacion />} />
              <Route path="/cajera/pedidos" element={<HistorialPedidos />} />
            </Route>

            {/* ADMIN */}
            <Route path="/admin" element={<AppShell title="Administación" />}>
              <Route path="/admin" element={<AgendarPedido />} />
              <Route path="/admin/agendar/confirmacion" element={<AgendarConfirmacion />} />
              <Route path="/admin/pedidos" element={<HistorialPedidos />} />
              <Route path="/admin/clientes" element={<AdminClientes/>} />
              <Route path="/admin/productos" element={<AdminProductos />} />
              <Route path="/admin/aprobar" element={<AdminAprobar />} />
            </Route>

            {/* 403 dentro de protegidas */}
            <Route path="/403" element={<Forbidden />} />
          </Route>

          {/* ===== 404 GLOBAL (para públicas y protegidas) ===== */}
          <Route path="*" element={<ErrorNotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
