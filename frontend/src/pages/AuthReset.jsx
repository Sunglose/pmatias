import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { FiLock } from "react-icons/fi";
import { resetPassword } from "../services/api"; // <-- Importa la función

export default function AuthReset() {
  const { token } = useParams(); // Si usas /auth/reestablecer/:token
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!password || !confirm) {
      setError("Completa ambos campos.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, password); // <-- Llama al endpoint real
      setSuccess("¡Contraseña restablecida correctamente! Ahora puedes iniciar sesión.");
    } catch (err) {
      setError("No se pudo restablecer la contraseña.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="min-h-screen w-screen flex items-center justify-center px-6 py-8 overflow-hidden relative dark:bg-gray-900">
      <div className="border border-[#8F5400] w-full max-w-xl bg-white rounded-lg shadow dark:border overflow-hidden dark:bg-gray-800 dark:border-gray-700 relative z-10">
        <div className="bg-[#8F5400] p-4">
          <h2 className="text-xl font-bold text-white text-center">
            Panadería Matías
          </h2>
        </div>
        <div className="w-full grid bg-white dark:bg-gray-800">
          <div className="p-10 space-y-6">
            <h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white text-center">
              Restablecer contraseña
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-2">
              Ingresa tu nueva contraseña para acceder a tu cuenta.
            </p>
            {error && (
              <div
                role="alert"
                aria-live="polite"
                className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-2"
              >
                {error}
              </div>
            )}
            {success && (
              <div
                role="status"
                aria-live="polite"
                className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md p-2"
              >
                {success}
              </div>
            )}
            <form className="space-y-4 md:space-y-6" onSubmit={onSubmit}>
              <div>
                <label
                  htmlFor="password"
                  className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                >
                  Nueva contraseña
                </label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 z-10" />
                  <input
                    type="password"
                    id="password"
                    placeholder="Nueva contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="peer bg-gray-50 border border-[#8F5400] text-gray-900 sm:text-sm rounded-lg
                              focus:ring-gray-600 focus:border-gray-600 block w-full p-2.5 pl-10 pr-10
                              dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400
                              dark:text-white dark:focus:ring-gray-500 dark:focus:border-gray-500"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="confirm"
                  className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                >
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 z-10" />
                  <input
                    type="password"
                    id="confirm"
                    placeholder="Confirma la contraseña"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    className="peer bg-gray-50 border border-[#8F5400] text-gray-900 sm:text-sm rounded-lg
                              focus:ring-gray-600 focus:border-gray-600 block w-full p-2.5 pl-10 pr-10
                              dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400
                              dark:text-white dark:focus:ring-gray-500 dark:focus:border-gray-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full text-white bg-[#8F5400] hover:bg-[#8a6615] focus:ring-4 focus:outline-none
                          focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center
                          dark:bg-gray-600 dark:hover:bg-gray-700 dark:focus:ring-gray-800 disabled:opacity-60"
              >
                {loading ? "Restableciendo..." : "Restablecer contraseña"}
              </button>
              <div className="text-center">
                <Link
                  to="/auth/login"
                  className="text-sm font-medium text-gray-600 hover:underline dark:text-gray-400"
                >
                  Volver al inicio de sesión
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}