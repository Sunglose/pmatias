export function formatRut(value) {
  let rut = value.replace(/[^0-9kK]/g, "").toUpperCase();
  if (rut.length > 1) {
    const cuerpo = rut.slice(0, -1);
    const dv = rut.slice(-1);
    return `${cuerpo}-${dv}`;
  }
  return rut;
}

export function validateRut(rut) {
  rut = rut.replace(/\./g, "").replace(/-/g, "").toUpperCase();
  if (rut.length < 2) return false;
  const cuerpo = rut.slice(0, -1);
  let dv = rut.slice(-1);

  let suma = 0;
  let multiplo = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i]) * multiplo;
    multiplo = multiplo < 7 ? multiplo + 1 : 2;
  }
  let dvEsperado = 11 - (suma % 11);
  dvEsperado = dvEsperado === 11 ? "0" : dvEsperado === 10 ? "K" : dvEsperado.toString();
  return dv === dvEsperado;
}