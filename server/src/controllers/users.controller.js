import * as service from "../services/users.service.js";

const endpoint = (work, status = 200, message) => async (req, res, next) => {
  try {
    const data = await work(req);
    if (data == null) return res.status(404).json({ success: false, message: "User not found in this Panchayat." });
    return res.status(status).json({ success: true, ...(message ? { message } : {}), data });
  } catch (error) {
    return next(error);
  }
};

export const listUsers = endpoint((req) => service.listPanchayatUsers(req.user.panchayatId));
export const createUser = endpoint((req) => service.createPanchayatUser(req.user.panchayatId, req.body), 201, "User created successfully.");
export const updateUser = endpoint((req) => service.updatePanchayatUser(req.user.panchayatId, req.user.id, req.params.id, req.body), 200, "User updated successfully.");
export const deactivateUser = endpoint((req) => service.deactivatePanchayatUser(req.user.panchayatId, req.user.id, req.params.id), 200, "User deactivated successfully.");
