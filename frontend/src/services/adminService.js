import api from "./api";

export const fetchClientes = async ({ buscar = "", page = 1, limit = 20, solo_activos = 0 } = {}) => {
  const { data } = await api.get("/api/clientes", {
    params: { buscar, page, limit, solo_activos }
  });
  return data;
};