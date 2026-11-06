import {
  getVillages,
  getVillageById,
  createVillage,
  updateVillage,
  deleteVillage,
} from "../services/village.service.js";

const requirePanchayat = (req, res) => {
  if (!req.user?.panchayatId) {
    res.status(403).json({ success: false, message: "A Panchayat account is required for this operation." });
    return false;
  }
  return true;
};

const handleError = (res, error) => {
  if (error.code === "P2002") {
    return res.status(409).json({ success: false, message: "A village with this name already exists in your Panchayat." });
  }
  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.statusCode ? error.message : "An unexpected server error occurred.",
  });
};

export const listVillages = async (req, res) => {
  if (!requirePanchayat(req, res)) return;
  try {
    const villages = await getVillages(req.user.panchayatId);
    return res.status(200).json({ success: true, data: villages });
  } catch (error) {
    return handleError(res, error);
  }
};

export const showVillage = async (req, res) => {
  if (!requirePanchayat(req, res)) return;
  try {
    const village = await getVillageById(req.params.id, req.user.panchayatId);
    if (!village) return res.status(404).json({ success: false, message: "Village not found." });
    return res.status(200).json({ success: true, data: village });
  } catch (error) {
    return handleError(res, error);
  }
};

export const addVillage = async (req, res) => {
  if (!requirePanchayat(req, res)) return;
  try {
    const village = await createVillage(req.body.name, req.user.panchayatId);
    return res.status(201).json({ success: true, message: "Village created successfully.", data: village });
  } catch (error) {
    return handleError(res, error);
  }
};

export const editVillage = async (req, res) => {
  if (!requirePanchayat(req, res)) return;
  try {
    const village = await updateVillage(req.params.id, req.body.name, req.user.panchayatId);
    if (!village) return res.status(404).json({ success: false, message: "Village not found." });
    return res.status(200).json({ success: true, message: "Village updated successfully.", data: village });
  } catch (error) {
    return handleError(res, error);
  }
};

export const removeVillage = async (req, res) => {
  if (!requirePanchayat(req, res)) return;
  try {
    const village = await deleteVillage(req.params.id, req.user.panchayatId);
    if (!village) return res.status(404).json({ success: false, message: "Village not found." });
    return res.status(200).json({ success: true, message: "Village deleted successfully." });
  } catch (error) {
    return handleError(res, error);
  }
};
