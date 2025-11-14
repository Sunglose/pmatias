import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, loginRequest } from "../context/AuthContext";
import { FaEye, FaEyeSlash, FaLock } from "react-icons/fa6";
import { FiMail } from "react-icons/fi";
import { parseError } from "../utils/errores";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, login } = useAuth();
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await loginRequest(email, password);
      login(data);
      const role = String(data?.user?.rol || "cliente").toLowerCase();
      const base = role === "admin" ? "/admin" : role === "cajera" ? "/cajera" : "/cliente";
      navigate(base, { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.message || parseError(err) || "Error al iniciar sesión.";
      // Mensaje claro para credenciales
      setError(err?.response?.status === 401 ? "Correo o contraseña incorrectos." : msg);
    } finally {
      setLoading(false);
    }
  }

return (
    <section
      className="min-h-screen w-screen flex items-center justify-center px-6 py-8  overflow-hidden relative dark:bg-gray-900"
    >
      <div className="border border-[#8F5400] w-full max-w-xl bg-white rounded-lg shadow dark:border overflow-hidden dark:bg-gray-800 dark:border-gray-700 relative z-10">
        <div className="bg-[#8F5400] p-4">
          <h2 className="text-xl font-bold text-white text-center">
            Panadería Matías
          </h2>
        </div>
        <div className="w-full grid bg-white dark:bg-gray-800">
          
          {/* FORMULARIO */}
          <div className="p-10 space-y-6">
            <h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white text-center">
              Inicia sesión en tu cuenta
            </h1>

            {error && (
              <div
                role="alert"
                aria-live="polite"
                className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-2"
              >
                {error}
              </div>
            )}

            <form className="space-y-4 md:space-y-6" onSubmit={onSubmit}>
              
              {/* Email Input */}
              <div>
                <label
                  htmlFor="email"
                  className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                >
                Correo electrónico
                </label>
                <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 z-10 peer-[:not(:placeholder-shown)]:hidden" />
                <input
                  type="email"
                  id="email"
                  placeholder="correo@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="peer bg-gray-50 border border-[#8F5400] text-gray-900 sm:text-sm rounded-lg
                            focus:ring-gray-600 focus:border-gray-600 block w-full p-2.5 pl-10 pr-10
                            dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400
                            dark:text-white dark:focus:ring-gray-500 dark:focus:border-gray-500"
                />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label
                  htmlFor="password"
                  className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 z-10 peer-[:not(:placeholder-shown)]:hidden" />
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    placeholder= "••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="peer bg-gray-50 border border-[#8F5400] text-gray-900 sm:text-sm rounded-lg
                            focus:ring-gray-600 focus:border-gray-600 block w-full p-2.5 pl-10 pr-10
                            dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400
                            dark:text-white dark:focus:ring-gray-500 dark:focus:border-gray-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    aria-label={
                      showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                    }
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full text-white bg-[#8F5400] hover:bg-[#8a6615] focus:ring-4 focus:outline-none
                          focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center
                          dark:bg-gray-600 dark:hover:bg-gray-700 dark:focus:ring-gray-800 disabled:opacity-60"
              >
                {loading ? "Ingresando..." : "Ingresar"}
              </button>

              {/* Botón para agendar sin cuenta */}
              <button
                type="button"
                onClick={() => navigate("/agendar")}
                className="w-full mt-2 border border-[#8F5400] text-[#8F5400] bg-transparent hover:bg-[#8F5400]/10
                           focus:ring-4 focus:outline-none focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-2.5
                           dark:border-gray-300 dark:text-white dark:hover:bg-gray-700"
              >
                Agendar sin cuenta
              </button>

              <div className="text-center">
                <Link
                  to="/recuperar-password" 
                  className="text-sm font-medium text-gray-600 hover:underline dark:text-gray-400"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}