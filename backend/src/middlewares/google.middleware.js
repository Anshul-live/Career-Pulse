import { oAuth2Client } from "../utils/googleAuth.js";

export const verifyGoogleAuth = (req, res, next) => {
  try {

    const tokens = oAuth2Client.credentials;

    if (!tokens || !tokens.access_token) {
      return res.status(401).json({
        message: "User not authenticated with Google"
      });
    }

    next();

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Google auth verification failed" });
  }
};
