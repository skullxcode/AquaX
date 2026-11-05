import { Router } from "express";
import { protect } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { validate } from "../validators/auth.validator.js";
import { createManagedUserSchema, updateManagedUserSchema } from "../validators/user.validator.js";
import * as controller from "../controllers/users.controller.js";

const router = Router();
router.use(
  protect,
  authorize("PANCHAYAT_ADMIN"),
  (req, res, next) => {
    if (!req.user.panchayatId) return res.status(403).json({ success: false, message: "A Panchayat administrator account is required." });
    next();
  },
);
router.get("/", controller.listUsers);
router.post("/", validate(createManagedUserSchema), controller.createUser);
router.patch("/:id", validate(updateManagedUserSchema), controller.updateUser);
router.delete("/:id", controller.deactivateUser);

export default router;
