// src/services/pin.service.js
export function genPIN(len = Number(process.env.PIN_LENGTH || 6)) {
  return Array.from({ length: len }, () => Math.floor(Math.random() * 10)).join("");
}

export function pinExpiryDate() {
  const mins = Number(process.env.PIN_TTL_MIN || 30);
  return new Date(Date.now() + mins * 60 * 1000);
}
