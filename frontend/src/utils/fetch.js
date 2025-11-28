// frontend/src/utils/fetch.js
export async function fetchJSON(url, opts = {}) {
  let token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(opts.headers || {}),
  };

  let res = await fetch(url, { ...opts, headers });
  if (res.status === 401 && localStorage.getItem("refreshToken")) {
    try {
      const refreshRes = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:4000"}/auth/refresh`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: localStorage.getItem("refreshToken") }),
        }
      );
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        localStorage.setItem("token", data.accessToken);
        if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
        token = data.accessToken;
        headers.Authorization = `Bearer ${token}`;
        res = await fetch(url, { ...opts, headers });
      } else {
        // Refresh falló, limpiar y redirigir SOLO UNA VEZ
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("refreshToken");
        if (!window._refreshRedirected) {
          window._refreshRedirected = true;
          alert("Tu sesión expiró. Por favor, inicia sesión nuevamente.");
          window.location.href = "/auth/login";
        }
        throw new Error("Sesión expirada");
      }
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("refreshToken");
      if (!window._refreshRedirected) {
        window._refreshRedirected = true;
        alert("Tu sesión expiró. Por favor, inicia sesión nuevamente.");
        window.location.href = "/auth/login";
      }
      throw new Error("Sesión expirada");
    }
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}