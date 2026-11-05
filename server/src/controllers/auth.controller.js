import { registerPanchayat, loginUser, getCurrentUser } from '../services/auth.service.js';

const cookieSameSite = (process.env.COOKIE_SAME_SITE || "lax").toLowerCase();
const cookieSecure = process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production";

if (!new Set(["lax", "strict", "none"]).has(cookieSameSite)) {
  throw new Error("COOKIE_SAME_SITE must be lax, strict, or none.");
}
if (cookieSameSite === "none" && !cookieSecure) {
  throw new Error("COOKIE_SAME_SITE=none requires COOKIE_SECURE=true (HTTPS).");
}

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: cookieSecure,
  sameSite: cookieSameSite,
  maxAge: 24 * 60 * 60 * 1000,
  path: '/',
};

export const register = async (req, res, next) => {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PUBLIC_REGISTRATION !== "true") {
    return res.status(403).json({ success: false, message: "Public Panchayat registration is disabled. Contact the system administrator." });
  }
  try {
    const result = await registerPanchayat(req.body);

    res.cookie('token', result.token, COOKIE_OPTIONS);

    res.status(201).json({
      success: true,
      message: 'Panchayat registered successfully',
      data: {
        user: result.user,
        panchayat: result.panchayat,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const result = await loginUser(req.body);

    res.cookie('token', result.token, COOKIE_OPTIONS);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: result.user,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await getCurrentUser(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: cookieSameSite,
    path: '/',
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};
