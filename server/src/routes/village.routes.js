import { Router } from "express";
import { protect } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { validate } from "../validators/auth.validator.js";
import { createVillageSchema, updateVillageSchema } from "../validators/village.validator.js";
import {
  listVillages,
  showVillage,
  addVillage,
  editVillage,
  removeVillage,
} from "../controllers/village.controller.js";

const router = Router();
router.use(protect, (req, res, next) => {
  if (!req.user.panchayatId) {
    return res.status(403).json({ success: false, message: "A Panchayat account is required." });
  }
  next();
});

router.get("/", listVillages);
router.get("/:id", showVillage);
router.post("/", authorize("SUPER_ADMIN", "PANCHAYAT_ADMIN"), validate(createVillageSchema), addVillage);
router.patch("/:id", authorize("SUPER_ADMIN", "PANCHAYAT_ADMIN"), validate(updateVillageSchema), editVillage);
router.delete("/:id", authorize("SUPER_ADMIN", "PANCHAYAT_ADMIN"), removeVillage);

export default router;
