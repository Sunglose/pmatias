import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Button from "../components/ui/Button";

export default function PinPedido() {
  const { id: preId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const initial = location.state || {};
  const [pin, setPin] = useState(initial.pin || "");
  const [expiresAt, setExpiresAt] = useState(initial.expiresAt || "");

  useEffect(() => {
    if (!pin) {
      try {
        const cached = JSON.parse(localStorage.getItem("last_pin_info"));
        if (cached && String(cached.id) === String(preId)) {
          setPin(cached.pin || "");
          setExpiresAt(cached.expiresAt || "");
        }
      } catch {}
    }
  }, [preId, pin]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 text-black dark:bg-gray-900 dark:text-white">
      <div className="w-full max-w-md border border-emerald-600/40 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-6">
        <h1 className="text-xl font-semibold mb-3">PIN de confirmación</h1>
        <div className="text-sm opacity-80 mb-1">Pre-pedido: #{preId}</div>
        {pin ? (
          <>
            <div className="text-4xl font-bold tracking-[0.3em] text-center my-4">{pin}</div>
            {expiresAt && (
              <div className="text-sm opacity-80 text-center">
                Vence: {new Date(expiresAt).toLocaleString()}
              </div>
            )}
            <p className="text-sm opacity-80 mt-4 text-center">
              Muéstralo a la cajera para confirmar tu pedido.
            </p>
          </>
        ) : (
          <div className="text-sm text-amber-700 dark:text-amber-200 text-center p-4 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
            <p className="font-semibold mb-2">⚠️ Pedido pendiente de aprobación</p>
            <p>Su pedido supera los límites permitidos y requiere aprobación del administrador.</p>
            <br />
            <p className="mt-2">Le notificaremos por correo electrónico cuando esté listo.</p>
          </div>
        )}

        <div className="mt-6 flex gap-2 justify-center">
          <Button onClick={() => navigate("/")}>Volver al inicio</Button>
        </div>
      </div>
    </div>
  );
}
