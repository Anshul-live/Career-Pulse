
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const User = mongoose.model("User");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:8000/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ email: profile.emails[0].value });
        
        if (!user) {
          user = await User.create({
            email: profile.emails[0].value.toLowerCase(),
            fullName: profile.displayName,
            password: "google",
            googleAccessToken: accessToken,
            googleRefreshToken: refreshToken,
            googleTokenExpiry: new Date(Date.now() + 3600 * 1000)
          });
        } else {
          user.googleAccessToken = accessToken;
          user.googleRefreshToken = refreshToken;
          user.googleTokenExpiry = new Date(Date.now() + 3600 * 1000);
          await user.save();
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user._id.toString());
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});
