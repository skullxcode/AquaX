import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import prisma from '../config/database.js';

const generateToken = (userId) => {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: '1d' });
};

export const registerPanchayat = async (data) => {
  const hashedPassword = await bcrypt.hash(data.password, 12);

  try {
    const panchayat = await prisma.panchayat.create({
      data: {
        name: data.panchayatName,
        code: data.panchayatCode,
        district: data.district,
        state: data.state,

        users: {
          create: {
            name: data.name,
            email: data.email,
            password: hashedPassword,
            role: 'PANCHAYAT_ADMIN',
          },
        },
      },

      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    const user = panchayat.users[0];

    return {
      user,
      panchayat: {
        id: panchayat.id,
        name: panchayat.name,
        code: panchayat.code,
      },
      token: generateToken(user.id),
    };
  } catch (error) {
    if (error.code === 'P2002') {
      throw Object.assign(new Error('Email or Panchayat code already exists'), { statusCode: 409 });
    }

    throw error;
  }
};

export const loginUser = async ({ email, password }) => {
  const user = await prisma.user.findUnique({
    where: { email },

    include: {
      panchayat: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  });

  if (!user || !user.isActive) {
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }

  const { password: _, ...safeUser } = user;

  return {
    user: safeUser,
    token: generateToken(user.id),
  };
};

export const getCurrentUser = async (userId) => {
  return prisma.user.findUnique({
    where: { id: userId },

    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      panchayatId: true,
      isActive: true,

      panchayat: {
        select: {
          id: true,
          name: true,
          code: true,
          district: true,
          state: true,
        },
      },
    },
  });
};
