
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { User } from "../models/user.model.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:8000/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {

      let user = await User.findOne({ email: profile.emails[0].value });

      if (!user) {
        user = await User.create({
          email: profile.emails[0].value,
          fullName: profile.displayName,
          googleAccessToken: accessToken
        });
      } else {
        user.googleAccessToken = accessToken;
        await user.save();
      }

      return done(null, user);
    }
  )
);


passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});


export default passport;
