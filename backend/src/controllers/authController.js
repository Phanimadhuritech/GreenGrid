const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendEmail } = require("../services/emailService");
const { logAuditEvent } = require("../services/auditService");

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

const ALLOWED_ROLES = [
  "PLATFORM_ADMIN",
  "FACILITY_MANAGER",
  "UNIT_USER",
  "TECHNICIAN",
  "FINANCE_OFFICER",
];

// Register user
const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    // Password length validation
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Validate role if specified
    const selectedRole = role ? String(role).trim().toUpperCase() : "UNIT_USER";
    if (!ALLOWED_ROLES.includes(selectedRole)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role specified. Allowed roles are: ${ALLOWED_ROLES.join(", ")}`,
      });
    }

    const existingUser = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists with this email address",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: selectedRole,
    });

    await logAuditEvent({
      actor: user._id,
      action: "USER_REGISTERED",
      entityType: "USER",
      entityId: user._id,
      metadata: { role: user.role, email: user.email },
      req,
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Registration failed",
    });
  }
};

// Login user
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = generateToken(user._id);

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await logAuditEvent({
      actor: user._id,
      action: "USER_LOGGED_IN",
      entityType: "USER",
      entityId: user._id,
      metadata: { role: user.role, email: user.email },
      req,
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization: user.organization || null,
        unit: user.unit || null,
        phone: user.phone || "",
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
};

// Logout user
const logoutUser = (req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    expires: new Date(0),
    secure: true,
    sameSite: "none",
  });

  res.json({
    success: true,
    message: "Logged out successfully",
  });
};

// Get current user
const getCurrentUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    const fullUser = await User.findById(req.user._id)
      .select("-password -resetPasswordToken -resetPasswordExpires")
      .populate("organization", "name code email address")
      .populate("unit", "unitNumber floor building");

    res.json({
      success: true,
      user: fullUser || req.user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get current user",
    });
  }
};

// Update user profile (Name and Phone)
const updateProfile = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    const { name, phone } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name cannot be empty",
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.name = name.trim();
    if (phone !== undefined) {
      user.phone = String(phone).trim();
    }
    await user.save();

    const populated = await User.findById(user._id)
      .select("-password -resetPasswordToken -resetPasswordExpires")
      .populate("organization", "name code email address")
      .populate("unit", "unitNumber floor building");

    await logAuditEvent({
      actor: user._id,
      action: "USER_PROFILE_UPDATED",
      entityType: "USER",
      entityId: user._id,
      metadata: { name: user.name, phone: user.phone },
      req,
    });

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: populated,
    });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
};

// Forgot Password — Generates single-use cryptographically secure reset token
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    // Generic response message to avoid email enumeration
    const genericResponse = {
      success: true,
      message: "If an account exists for this email, a password reset link has been sent.",
    };

    if (!user) {
      return res.status(200).json(genericResponse);
    }

    // Generate random 32-byte hex token
    const rawResetToken = crypto.randomBytes(32).toString("hex");

    // Store SHA256 hashed token in DB
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawResetToken)
      .digest("hex");

    // Token expires in 1 hour
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000;
    await user.save();

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const resetUrl = `${clientUrl}/reset-password/${rawResetToken}`;

    // Send reset email via emailService
    await sendEmail({
      to: user.email,
      subject: "GreenGrid — Password Reset Request",
      text: `You requested a password reset for your GreenGrid account. Please click the following link to reset your password:\n\n${resetUrl}\n\nThis link will expire in 1 hour. If you did not request this, please ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #DCE5DF; border-radius: 8px;">
          <h2 style="color: #166534;">GreenGrid Password Reset</h2>
          <p>Hello <strong>${user.name}</strong>,</p>
          <p>We received a request to reset your password for your GreenGrid account.</p>
          <div style="margin: 24px 0;">
            <a href="${resetUrl}" style="background-color: #166534; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
          </div>
          <p style="color: #64748B; font-size: 13px;">This link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.</p>
          <p style="color: #64748B; font-size: 12px; border-top: 1px solid #EBF1ED; padding-top: 12px;">Link: ${resetUrl}</p>
        </div>
      `,
    });

    console.log(`[Auth / Password Reset] Generated reset link for ${user.email}: ${resetUrl}`);

    await logAuditEvent({
      actor: user._id,
      action: "PASSWORD_RESET_REQUESTED",
      entityType: "USER",
      entityId: user._id,
      metadata: { email: user.email },
      req,
    });

    // In non-production environments, provide dev helper token for automated tests/verification
    if (process.env.NODE_ENV !== "production") {
      return res.status(200).json({
        ...genericResponse,
        devResetToken: rawResetToken,
        devResetUrl: resetUrl,
      });
    }

    res.status(200).json(genericResponse);
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while processing your password reset request",
    });
  }
};

// Reset Password — Verifies token and updates password
const resetPassword = async (req, res) => {
  try {
    const token = req.params.token || req.body.token;
    const { password, confirmPassword } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Password reset token is required",
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "New password is required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    // Hash the incoming raw token to compare with DB
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired password reset token",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password and clear reset token/expiry
    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    await logAuditEvent({
      actor: user._id,
      action: "PASSWORD_RESET_COMPLETED",
      entityType: "USER",
      entityId: user._id,
      metadata: { email: user.email },
      req,
    });

    res.status(200).json({
      success: true,
      message: "Password reset successful. You can now log in with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reset password",
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  updateProfile,
  forgotPassword,
  resetPassword,
};


