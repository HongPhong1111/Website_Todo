const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");
const { z } = require("zod");
const User = require("../models/User");
const { signAccessToken } = require("../utils/jwt");
const { env } = require("../config/env");

const googleClient = new OAuth2Client(env.google.clientId);

class AuthController {
  // Register
  static async register(req, res, next) {
    try {
      const schema = z.object({
        email: z.string().email().toLowerCase().trim(),
        password: z.string().min(6),
        fullName: z.string().min(1).optional(),
      });

      const body = schema.parse(req.body);

      // Check if user exists
      const existingUser = await User.findOne({ email: body.email });
      if (existingUser) {
        return res.status(409).json({
          message: "Email already exists",
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(body.password, 10);

      // Create user
      const user = await User.create({
        email: body.email,
        passwordHash,
        fullName: body.fullName || null,
        provider: "local",
      });

      // Generate token
      const token = signAccessToken({
        userId: user._id,
        role: user.role,
      });

      return res.status(201).json({
        token,
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Login
  static async login(req, res, next) {
    try {
      const schema = z.object({
        email: z.string().email().toLowerCase().trim(),
        password: z.string().min(1),
      });

      const body = schema.parse(req.body);

      // Find user
      const user = await User.findOne({
        email: body.email,
        provider: "local",
      });

      if (!user) {
        return res.status(401).json({
          message: "Invalid credentials",
        });
      }

      // Check if active
      if (!user.isActive) {
        return res.status(403).json({
          message: "Account is disabled",
        });
      }

      // Verify password
      const isValid = await user.comparePassword(body.password);
      if (!isValid) {
        return res.status(401).json({
          message: "Invalid credentials",
        });
      }

      // Update last login
      user.lastLoginAt = new Date();
      await user.save();

      // Generate token
      const token = signAccessToken({
        userId: user._id,
        role: user.role,
      });

      return res.json({
        token,
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          avatarUrl: user.avatarUrl,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Google OAuth
  static async googleAuth(req, res, next) {
    try {
      const schema = z.object({
        idToken: z.string().min(1),
      });

      const body = schema.parse(req.body);

      // Verify Google token
      let ticket;
      try {
        ticket = await googleClient.verifyIdToken({
          idToken: body.idToken,
          audience: env.google.clientId,
        });
      } catch (error) {
        console.error("Google token verification error:", error);
        return res.status(400).json({
          message: "Invalid Google token",
          error: error.message,
        });
      }

      const payload = ticket.getPayload();
      const email = payload?.email;

      if (!email) {
        return res.status(400).json({
          message: "Google token missing email",
        });
      }

      const fullName = payload?.name || null;
      const avatarUrl = payload?.picture || null;

      // Find or create user
      let user = await User.findOne({ email });

      if (!user) {
        // Create new user
        user = await User.create({
          email,
          fullName,
          avatarUrl,
          provider: "google",
        });
      } else {
        // Update existing user
        if (!user.isActive) {
          return res.status(403).json({
            message: "Account is disabled",
          });
        }

        // Update profile if needed
        if (fullName && !user.fullName) {
          user.fullName = fullName;
        }
        if (avatarUrl && !user.avatarUrl) {
          user.avatarUrl = avatarUrl;
        }
        user.lastLoginAt = new Date();
        await user.save();
      }

      // Generate token
      const token = signAccessToken({
        userId: user._id,
        role: user.role,
      });

      return res.json({
        token,
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          avatarUrl: user.avatarUrl,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Get current user
  static async getCurrentUser(req, res, next) {
    try {
      const user = await User.findById(req.user.userId).select(
        "-passwordHash -__v",
      );

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      return res.json({ user });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
