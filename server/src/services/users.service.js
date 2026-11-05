import bcrypt from "bcryptjs";
import prisma from "../config/database.js";

const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

export const listPanchayatUsers = (panchayatId) => prisma.user.findMany({
  where: { panchayatId },
  select: {
    ...safeUserSelect,
    _count: { select: { movements: true, maintenance: true, financials: true } },
  },
  orderBy: [{ role: "asc" }, { name: "asc" }],
});

export const createPanchayatUser = async (panchayatId, data) => {
  if (!panchayatId) throw fail("This account is not linked to a Panchayat.", 403);
  const hashedPassword = await bcrypt.hash(data.password, 12);
  return prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: data.role || "OPERATOR",
      panchayatId,
    },
    select: safeUserSelect,
  });
};

export const updatePanchayatUser = async (panchayatId, actorId, targetId, data) => prisma.$transaction(async (tx) => {
  const target = await tx.user.findFirst({ where: { id: targetId, panchayatId } });
  if (!target) return null;

  const changesRoleOrStatus = data.role !== undefined || data.isActive !== undefined;
  if (targetId === actorId && changesRoleOrStatus) {
    throw fail("You cannot change your own role or deactivate your own account.", 409);
  }

  if (data.role && !["OPERATOR", "PANCHAYAT_ADMIN"].includes(data.role)) {
    throw fail("Invalid role for a Panchayat user.", 400);
  }

  const willStopBeingAdmin = target.role === "PANCHAYAT_ADMIN" &&
    ((data.role !== undefined && data.role !== "PANCHAYAT_ADMIN") || data.isActive === false);
  if (willStopBeingAdmin) {
    const activeAdmins = await tx.user.count({
      where: { panchayatId, role: "PANCHAYAT_ADMIN", isActive: true },
    });
    if (activeAdmins <= 1) throw fail("A Panchayat must retain at least one active administrator.", 409);
  }

  const update = { ...data };
  if (update.password) update.password = await bcrypt.hash(update.password, 12);
  return tx.user.update({ where: { id: targetId }, data: update, select: safeUserSelect });
}, { isolationLevel: "Serializable" });

export const deactivatePanchayatUser = async (panchayatId, actorId, targetId) => {
  if (actorId === targetId) throw fail("You cannot deactivate your own account.", 409);
  return updatePanchayatUser(panchayatId, actorId, targetId, { isActive: false });
};
