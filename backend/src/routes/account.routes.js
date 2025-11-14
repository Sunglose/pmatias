import { Router } from "express";
import {
  profile,
  updateProfile,
  changePassword,
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "../controllers/account.controller.js";
import { authRequired, asyncHandler } from "../middlewares/auth.middleware.js";

const router = Router();

// Todas requieren login
router.use(authRequired);

// Perfil
router.get("/me", asyncHandler(profile));
router.get("/profile", authRequired, asyncHandler(profile));

// Password
router.put("/password", asyncHandler(changePassword));

// Direcciones
router.get("/addresses", asyncHandler(listAddresses));
router.post("/addresses", asyncHandler(createAddress));
router.put("/addresses/:id", asyncHandler(updateAddress));
router.delete("/addresses/:id", asyncHandler(deleteAddress));
router.patch("/addresses/:id/default", asyncHandler(setDefaultAddress));

export default router;
