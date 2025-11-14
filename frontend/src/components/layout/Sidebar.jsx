import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useEffect, useMemo, useState } from "react";
import { FaCalendarCheck, FaClipboardList, FaUserFriends, FaGavel } from "react-icons/fa";
import { FaBreadSlice } from "react-icons/fa6";
import { MdOutlineLogout, MdOutlinePassword  } from "react-icons/md";
import LogoPM2 from "../../assets/LogoPM2.png";

export default function Sidebar({ className = "", isDrawer = false, open = true, onClose = () => {} }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Detecta “pasajero” (sin login)
  const isPasajero = !user;

  const role = (user?.rol || "cliente").toLowerCase();
  const base = role === "admin" ? "/admin" : role === "cajera" ? "/cajera" : "/cliente";

  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem("sidebarExpanded");
    return saved === "0" ? false : true;
  });

  useEffect(() => {
    localStorage.setItem("sidebarExpanded", isExpanded ? "1" : "0");
  }, [isExpanded]);

  useEffect(() => {
    document.documentElement.style.setProperty("--sidebar-w", isExpanded ? "240px" : "72px");
  }, [isExpanded]);

  // LINKS para usuarios con login
  const linksLogged = useMemo(() => {
    if (role === "admin") {
      return [
        { to: `${base}`,            label: "Agendar pedido",     icon: <FaCalendarCheck /> },
        { to: `${base}/pedidos`,    label: "Pedidos agendados",  icon: <FaClipboardList /> },
        { to: `${base}/productos`,  label: "Gestión productos",  icon: <FaBreadSlice /> },
        { to: `${base}/clientes`,   label: "Gestión clientes",   icon: <FaUserFriends /> },
        { to: `${base}/aprobar`,    label: "Aprobar pedidos",    icon: <FaGavel /> },
      ];
    }
    if (role === "cajera") {
      return [
        { to: `${base}/`,     label: "Confirmar PIN",        icon: <MdOutlinePassword /> },
        { to: `${base}/agendar`,         label: "Agendar pedido",     icon: <FaCalendarCheck /> },
        { to: `${base}/pedidos`, label: "Pedidos agendados",  icon: <FaClipboardList /> },
      ];
    }
    // cliente
    return [
      { to: `${base}`,         label: "Agendar pedido", icon: <FaCalendarCheck /> },
      { to: `${base}/pedidos`, label: "Mis pedidos",    icon: <FaClipboardList /> },
    ];
  }, [role, base]);

  // 🔹 LINKS para pasajero (sin login): solo “Agendar pedido” hacia /agendar
  const linksGuest = useMemo(
    () => [{ to: "/agendar", label: "Agendar pedido", icon: <FaCalendarCheck /> }],
    []
  );

  const baseCls =
    "flex items-center gap-3 h-11 rounded-xl transition-all focus:outline-none focus-visible:ring-2";
  const activeCls =
    "bg-[#FFEBC9] text-[#8F5400] hover:text-[#8F5400] dark:bg-white dark:text-black border-black/80 dark:border-white/80";
  const idleCls =
    "border-transparent text-gray-600 dark:text-gray-300 hover:text-[#8F5400] hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-700";

  const Item = ({ to, label, icon }) => {
    const wide = isDrawer || isExpanded; // en drawer mostrar SIEMPRE texto
    return (
      <NavLink
        to={to}
        title={label}
        end
        className={({ isActive }) =>
          [
            baseCls,
            wide ? "w-full px-4" : "w-11 justify-center",
            isActive ? activeCls : idleCls,
          ].join(" ")
        }
      >
        <span className="flex-shrink-0 text-lg">{icon}</span>
        {(isDrawer || isExpanded) && <span className="text-sm font-medium whitespace-nowrap">{label}</span>}
      </NavLink>
    );
  };

  const handleLogout = () => {
    if (confirm("¿Cerrar sesión?")) {
      logout();
      navigate("/login", { replace: true });
    }
  };

  // Drawer overlay para móviles/tablets
  if (isDrawer) {
    return (
      <div
        className={`fixed inset-0 z-[200] ${open ? "" : "pointer-events-none"} ${className}`}
        style={{ display: open ? "block" : "none" }}
      >
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <aside
          className="absolute left-0 top-0 h-full w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shadow-xl transition-transform duration-300 flex flex-col"
          style={{ transform: open ? "translateX(0)" : "translateX(-100%)" }}
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
            <img src={LogoPM2} alt="Logo" className="h-10 w-auto" />
            <button
              type="button"
              className="text-2xl text-gray-600 dark:text-gray-300"
              onClick={onClose}
              aria-label="Cerrar menú"
            >
              ×
            </button>
          </div>

          {/* Navegación */}
          <nav className="mt-2 flex-1 flex flex-col gap-2 px-2 overflow-y-auto">
            {(isPasajero ? linksGuest : linksLogged).map(l => (
              <Item key={l.to} to={l.to} label={l.label} icon={l.icon} />
            ))}
          </nav>

          {/* Logout fijo abajo */}
          {!isPasajero && (
            <div className="p-3 mt-auto">
              <button
                type="button"
                onClick={handleLogout}
                className={[
                  "flex items-center gap-3 h-11 w-full px-4 rounded-xl border transition-all focus:outline-none focus-visible:ring-2",
                  "text-gray-600 hover:bg-gray-100 hover:text-[#8F5400] hover:border-gray-100",
                ].join(" ")}
                title="Cerrar sesión"
              >
                <span className="flex-shrink-0 text-lg"><MdOutlineLogout/></span>
                <span className="text-sm font-medium whitespace-nowrap">Cerrar sesión</span>
              </button>
            </div>
          )}
        </aside>
      </div>
    );
  }

  // Sidebar fijo (escritorio)
  return (
    <aside
      aria-label="Barra lateral"
      className={`fixed inset-y-0 left-0 z-50 border-r transition-all duration-300 ease-in-out
                dark:bg-gray-900 border-gray-200 dark:border-gray-800 ${className}`}
      style={{ width: isExpanded ? "240px" : "72px" }}
    >
      <div className="h-full flex flex-col">
        {/* Header de la sidebar */}
        <div className={["flex items-center p-2 h-20", isExpanded ? "justify-between" : "justify-center"].join(" ")}>
          {isExpanded ? (
            <img src={LogoPM2} alt="Logo" className="ml-5 h-15 w-36" />
          ) : (
            <span className="w-0" />
          )}
          <button
            type="button"
            aria-label="Abrir menú"
            onClick={() => setIsExpanded(v => !v)}
            className="w-10 h-10 rounded-lg border bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300
                       hover:bg-white dark:hover:bg-gray-700 transition border-gray-200 dark:border-gray-700
                       flex items-center justify-center"
          >
            ☰
          </button>
        </div>

        {/* Navegación */}
        <nav
          aria-label="Navegación principal"
          className={["mt-2 flex flex-col gap-2 px-2", !isExpanded ? "items-center" : ""].join(" ")}
        >
          {(isPasajero ? linksGuest : linksLogged).map(l => (
            <Item key={l.to} to={l.to} label={l.label} icon={l.icon} />
          ))}
        </nav>

        {/* Footer: solo mostrar “Cerrar sesión” si hay usuario */}
        {!isPasajero && (
          <div className="mt-auto p-3">
            <button
              type="button"
              onClick={handleLogout}
              className={[
                "flex items-center gap-3 h-11 rounded-xl border transition-all focus:outline-none focus-visible:ring-2",
                isExpanded ? "w-full px-4" : "w-11 justify-center",
                "text-gray-600 hover:bg-gray-100 hover:text-[#8F5400] hover:border-gray-100",
              ].join(" ")}
              title="Cerrar sesión"
            >
              <span className="flex-shrink-0 text-lg"><MdOutlineLogout/></span>
              {isExpanded && <span className="text-sm font-medium whitespace-nowrap">Cerrar sesión</span>}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
