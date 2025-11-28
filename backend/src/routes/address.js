import express from "express";
import fetch from "node-fetch";
const router = express.Router();

router.get("/nominatim", async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 3) return res.json([]);
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&addressdetails=1&limit=5`;
  try {
    const response = await fetch(url, { headers: { "User-Agent": "pmatias-app/1.0" } });
    const data = await response.json();
    res.json(data);
  } catch (e) {
    res.status(500).json([]);
  }
});

export default router;