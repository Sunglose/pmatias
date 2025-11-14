import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useAuth } from "../../context/AuthContext";
import LogoPM from "../../assets/LogoPM.png";

export default function Layout({ title, right, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const role = (user?.rol || "cliente").toLowerCase();

  const basePath = useMemo(
    () => (role === "admin" ? "/admin" : role === "cajera" ? "/cajera" : "/cliente"),
    [role]
  );

  // Dropdown perfil (cliente)
  const [openProfile, setOpenProfile] = useState(false);
  const profileBtnRef = useRef(null);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") setOpenProfile(false); }
    function onClick(e) {
      if (!openProfile) return;
      const btn = profileBtnRef.current;
      const menu = profileMenuRef.current;
      if (btn && btn.contains(e.target)) return;
      if (menu && menu.contains(e.target)) return;
      setOpenProfile(false);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("click", onClick);
    };
  }, [openProfile]);

  const goPerfil = () => {
    setOpenProfile(false);
    navigate(`${basePath}/perfil`);
  };

  const doLogout = () => {
    setOpenProfile(false);
    if (confirm("¿Cerrar sesión?")) {
      logout();
      navigate("/login", { replace: true });
    }
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Mostrar/ocultar topbar en móvil/tablet con umbrales suaves
  const [showTopbar, setShowTopbar] = useState(true);
  const lastYRef = useRef(0);
  const accRef = useRef(0);
  const tickingRef = useRef(false);

  useEffect(() => {
    function handleScroll() {
      if (window.innerWidth >= 1024) return; // solo móvil/tablet
      const y = document.scrollingElement?.scrollTop ?? window.scrollY ?? 0;

      if (tickingRef.current) return;
      tickingRef.current = true;

      requestAnimationFrame(() => {
        const last = lastYRef.current;
        const delta = y - last;

        // acumular en la dirección actual
        accRef.current = Math.sign(delta) === Math.sign(accRef.current)
          ? accRef.current + delta
          : delta;

        // umbrales
        if (accRef.current > 12) {      // bajando
          setShowTopbar(false);
          accRef.current = 0;
        } else if (accRef.current < -8) { // subiendo
          setShowTopbar(true);
          accRef.current = 0;
        }

        if (y < 20) setShowTopbar(true); // cerca del top: siempre visible

        lastYRef.current = y;
        tickingRef.current = false;
      });
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("touchmove", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("touchmove", handleScroll);
    };
  }, []);

  return (
    <div className="min-h-screen text-black dark:bg-gray-900 dark:text-white">
      {/* Sidebar escritorio y drawer móvil */}
      <Sidebar className="hidden md:block" isDrawer={false} open={true} onClose={() => {}} />
      <Sidebar className="block md:hidden" isDrawer={true} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="min-h-screen min-w-0 overflow-x-hidden flex flex-col md:ml-[var(--sidebar-w,72px)]">
        {/* Topbar fijo con transición */}
        <header
          className={[
            "fixed top-0 left-0 right-0 z-40 border-b border-gray-200 dark:border-gray-800 bg-[#FBF9F7] dark:bg-gray-900",
            "transition-transform duration-300 md:translate-y-0",
            showTopbar ? "translate-y-0" : "-translate-y-full",
            "md:pl-[var(--sidebar-w,72px)]"
          ].join(" ")}
        >
          <div className="h-16 flex items-center gap-3 px-2 sm:px-6 lg:px-8">
            {/* Hamburger móvil */}
            <button
              type="button"
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              aria-label="Abrir menú"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="text-2xl">☰</span>
            </button>

            {/* Logo escritorio */}
            <img src={LogoPM} alt="Logo" className="h-10 w-auto hidden md:block" />

            {/* Título siempre centrado */}
            <h1 className="flex-1 text-center font-extrabold text-lg sm:text-2xl md:text-3xl truncate px-2">
              {title || "Panadería Matías"}
            </h1>

            {/* Zona derecha */}
            <div className="flex items-center gap-2 shrink-0">
              {right}
              {!user && (
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700
                             bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  Iniciar sesión
                </button>
              )}
              {user && role === "cliente" && (
                <div className="relative">
                  <button
                    ref={profileBtnRef}
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={openProfile}
                    onClick={() => setOpenProfile(v => !v)}
                    title="Perfil"
                    className="w-9 h-9 rounded-full border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800
                               flex items-center justify-center text-xs font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                  >
                    {getInitials(user)}
                  </button>
                  {openProfile && (
                    <div
                      ref={profileMenuRef}
                      role="menu"
                      className="absolute right-0 mt-2 w-44 rounded-xl border border-gray-200 dark:border-gray-700
                                 bg-white dark:bg-gray-900 shadow-lg overflow-hidden z-50"
                    >
                      <button
                        type="button"
                        onClick={goPerfil}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                        role="menuitem"
                      >
                        Mi perfil
                      </button>
                      <div className="h-px bg-gray-200 dark:bg-gray-700" />
                      <button
                        type="button"
                        onClick={doLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        role="menuitem"
                      >
                        Cerrar sesión
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Contenido: compensar altura del header */}
        <div className="flex-1 pt-16 px-2 sm:px-6 md:px-12 pb-12">
          {children}
        </div>
      </main>
    </div>
  );
}

function getInitials(user) {
  const name = user?.nombre || user?.name || user?.email || "CL";
  const parts = String(name).trim().split(/\s+/);
  const first = parts[0]?.[0] || "C";
  const second = parts[1]?.[0] || "L";
  return (first + second).toUpperCase();
}
