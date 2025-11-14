// frontend/src/hooks/useAuth.js (consolidar con el existente)
export function useAuthHeaders() {
  const token = useMemo(() => localStorage.getItem('token'), []);
  return useMemo(
    () => ({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token]
  );
}