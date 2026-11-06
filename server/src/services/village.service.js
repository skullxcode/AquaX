import prisma from "../config/database.js";

export const getVillages = (panchayatId) => {
  return prisma.village.findMany({
    where: { panchayatId },
    include: {
      _count: { select: { schemes: true, consumers: true } },
    },
    orderBy: { name: "asc" },
  });
};

export const getVillageById = (id, panchayatId) => {
  return prisma.village.findFirst({
    where: { id, panchayatId },
    include: {
      schemes: true,
      _count: { select: { consumers: true } },
    },
  });
};

export const createVillage = (name, panchayatId) => {
  return prisma.village.create({ data: { name, panchayatId } });
};

export const updateVillage = async (id, name, panchayatId) => {
  const existing = await prisma.village.findFirst({ where: { id, panchayatId } });
  if (!existing) return null;
  return prisma.village.update({ where: { id }, data: { name } });
};

export const deleteVillage = async (id, panchayatId) => {
  const village = await prisma.village.findFirst({
    where: { id, panchayatId },
    include: { _count: { select: { schemes: true, consumers: true } } },
  });

  if (!village) return null;

  if (village._count.schemes > 0 || village._count.consumers > 0) {
    const error = new Error("Cannot delete a village that has schemes or consumers.");
    error.statusCode = 409;
    throw error;
  }

  return prisma.village.delete({ where: { id } });
};
