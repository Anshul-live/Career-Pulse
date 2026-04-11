
import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

const router = express.Router();

router.get(
  "/google",
  passport.authenticate("google", { 
    scope: ["profile", "email", "https://www.googleapis.com/auth/gmail.readonly"],
    accessType: "offline",
    prompt: "consent"
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
      
      if (!user.googleRefreshToken) {
        user.googleAccessToken = req.authInfo?.access_token || req.user.googleAccessToken;
        user.googleRefreshToken = req.user.googleRefreshToken;
        user.googleTokenExpiry = new Date(Date.now() + 3600 * 1000);
        await user.save();
      }

      const token = jwt.sign(
        { _id: user._id, email: user.email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1d" }
      );

      res.redirect(
        `http://localhost:5173/oauth-success?token=${token}`
      );
    } catch (error) {
      console.error("OAuth callback error:", error);
      res.redirect(`http://localhost:5173/oauth-error?error=callback_failed`);
    }
  }
);

export default router;
