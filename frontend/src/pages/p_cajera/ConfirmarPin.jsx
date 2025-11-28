import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { useAuth } from "../../context/AuthContext";
import React from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function CajaConfirmarPin() {
  const { user } = useAuth();
  const token = useMemo(() => localStorage.getItem("token"), []);
  const { search } = useLocation();

  const params = new URLSearchParams(search);
  const preIdParam = params.get("preId") || "";

  const [preId, setPreId] = useState(preIdParam);
  const [pin, setPin] = useState("");
  const [abono, setAbono] = useState("");
  const [loading, setLoading] = useState(false);
  const [okMsg, setOkMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");

  const isAuthorized = !!token && (user?.rol === "cajera" || user?.rol === "admin");

  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    if (preIdParam) setPreId(preIdParam);
  }, [preIdParam]);

  useEffect(() => {
    if (okMsg) {
      const timer = setTimeout(() => {
        setOkMsg("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [okMsg]);

  useEffect(() => {
    setPreview(null);
  }, [preId, pin]);

  const handlePinChange = (index, value) => {
    const newPin = pin.split('');
    newPin[index] = value.replace(/\D/g, "");
    setPin(newPin.join(''));
  };

  async function verDetalles() {
    setOkMsg(""); setErrMsg("");
    if (!isAuthorized) return setErrMsg("No autorizado.");
    const cleanPreId = (preId || "").trim();
    const cleanPin = (pin || "").trim();
    if (!cleanPreId || isNaN(cleanPreId)) return setErrMsg("Ingresa un ID numérico válido.");
    if (!cleanPin || cleanPin.length < 4) return setErrMsg("Ingresa un PIN válido (mínimo 4 dígitos).");

    setLoadingPreview(true);
    try {
      const res = await fetch(`${API}/api/prepedidos/${cleanPreId}/preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ pin: cleanPin }),
      });
      const body = await safeJson(res);
      if (!res.ok) throw new Error(body?.message || "No se pudo obtener el detalle.");
      setPreview(body);
    } catch (e) {
      setPreview(null);
      setErrMsg(e?.message || "Error obteniendo detalle.");
    } finally {
      setLoadingPreview(false);
    }
  }

  async function onConfirmarPin(e) {
    e.preventDefault();
    setOkMsg(""); setErrMsg("");

    const abonoNum = Number(String(abono).replace(/\D/g, ""));
    if (!Number.isFinite(abonoNum) || abonoNum < 0) {
      return setErrMsg("Ingresa un abono válido (en pesos CLP).");
    }

    if (!isAuthorized) return setErrMsg("No autorizado. Inicia sesión como cajera o admin.");
    if (!preview)   return setErrMsg("Primero visualiza los detalles del pre-pedido.");

    const cleanPreId = preId.trim();
    const cleanPin = pin.trim();

    if (!cleanPreId || isNaN(cleanPreId)) {
      return setErrMsg("Ingresa un ID numérico válido del pre-pedido.");
    }
    if (!cleanPin || cleanPin.length < 4) {
      return setErrMsg("Ingresa un PIN válido (mínimo 4 dígitos).");
    }

    setLoading(true);
    try {
      console.log("Enviando confirmación:", { preId: cleanPreId, pin: cleanPin });
      
      const res = await fetch(`${API}/api/prepedidos/${cleanPreId}/confirmar-pin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ pin: cleanPin, abono: abonoNum }),
      });

      const body = await safeJson(res);
      console.log("Respuesta del servidor:", { status: res.status, body });
      
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("No autorizado. Inicia sesión nuevamente.");
        }
        if (res.status === 403) {
          throw new Error(`Permisos insuficientes. Rol actual: ${user?.rol || "desconocido"}.`);
        }
        throw new Error(body?.message || body?.error || `Error ${res.status}: No se pudo confirmar el pre-pedido.`);
      }

      setOkMsg(`Listo Pre-pedido #${cleanPreId} promovido a Pedido #${body?.pedido_id || "?"}.`);
      setPin("");
      setPreId("");
      setAbono("");
    } catch (e) {
      console.error("Error al confirmar PIN:", e);
      setErrMsg(e?.message || "Error al confirmar PIN.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto mt-8">
      <h1 className="text-2xl font-bold mb-4 text-center">
        Confirmar PIN 
      </h1>

      {!isAuthorized && (
        <div className="mb-4 p-3 rounded border-l-4 border-yellow-400 bg-yellow-50 text-sm text-yellow-800">
          Debes iniciar sesión como cajera o admin para confirmar pre-pedidos.
        </div>
      )}

      <form onSubmit={onConfirmarPin} className={`space-y-4 border rounded-xl p-4 ${!isAuthorized ? "opacity-60 pointer-events-none" : ""}`}>
        {/* ID y PIN */}
        <label className="block text-center">
          <div className="text-sm mb-1">ID del pre-pedido</div>
          <Input
            value={preId}
            onChange={(e) => setPreId(e.target.value.replace(/\D/g, ""))}
            placeholder="Ej: 123"
            className="max-w-xs mx-auto"
          />
        </label>

        <label className="block text-center">
          <div className="text-sm mb-1">PIN</div>
          <div className="flex space-x-2 justify-center">
            {Array.from({ length: 6 }).map((_, index) => (
              <Input
                key={index}
                value={pin[index] || ""}
                onChange={(e) => {
                  handlePinChange(index, e.target.value);
                  if (e.target.value && index < 5) {
                    document.getElementById(`pin-input-${index + 1}`).focus();
                  }
                }}
                id={`pin-input-${index}`}
                maxLength={1}
                placeholder="0"
                className="w-12 text-center"
              />
            ))}
          </div>
        </label>

        <label className="block text-center">
          <div className="text-sm mb-1">Abono recibido (CLP)</div>
          <Input
            type="tel"
            inputMode="numeric"
            value={abono}
            onChange={(e) => setAbono(e.target.value.replace(/\D/g, ""))}
            placeholder="Ej: 5000"
            className="max-w-xs mx-auto"
          />
        </label>

        {/* Acciones: Ver detalles y luego Confirmar */}
        <div className="flex justify-center items-center gap-2">
          {!preview ? (
            <Button variant="primary" type="button" onClick={verDetalles} disabled={loadingPreview}>
              {loadingPreview ? "Cargando…" : "Ver detalles"}
            </Button>
          ) : (
            <Button type="submit">
              Confirmar
            </Button>
          )}
        </div>

        {errMsg && <div className="text-red-600 text-sm">{errMsg}</div>}
        {okMsg && <div className="text-green-600 text-sm">{okMsg}</div>}

        {/* Panel de detalles */}
        {preview && (
          <div className="mt-4 border rounded-lg p-3">
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              <div><strong>Cliente:</strong> {preview.prepedido.cliente_nombre || "—"}</div>
              <div><strong>Contacto:</strong> {preview.prepedido.cliente_email || "—"} {preview.prepedido.cliente_telefono ? ` / ${preview.prepedido.cliente_telefono}` : ""}</div>
              <div><strong>Entrega:</strong> {preview.prepedido.tipo_entrega === "reparto" ? "Reparto" : "Retiro"} — {preview.prepedido.fecha_entrega} {preview.prepedido.hora_entrega}h</div>
              {preview.prepedido.tipo_entrega === "reparto" && (
                <div><strong>Dirección:</strong> {preview.prepedido.direccion_entrega || "—"}</div>
              )}
              {preview.prepedido.observaciones && (
                <div><strong>Obs:</strong> {preview.prepedido.observaciones}</div>
              )}
            </div>
            <div className="text-sm">
              <div className="font-semibold mb-1">Ítems</div>
              <ul className="list-disc pl-5 space-y-1">
                {preview.items.map((it, idx) => (
                  <li key={idx}>
                    {it.producto}: {it.unidad === "kg" ? `${String(it.cantidad).replace(".", ",")} KG` : `${parseInt(it.cantidad, 10)} UN`}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

async function safeJson(res) {
  try { return await res.json(); } catch { return null; }
}
