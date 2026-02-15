
import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";

const router = express.Router();

router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/auth/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {

    const token = jwt.sign(
      { _id: req.user._id, email: req.user.email },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "1d" }
    );

    res.redirect(
      `http://localhost:5173/oauth-success?token=${token}`
    );
  }
);

export default router;
