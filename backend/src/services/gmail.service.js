import { google } from "googleapis";
import { User } from "../models/user.model.js";

export const getAuthenticatedClient = async (userId) => {
  const user = await User.findById(userId);
  
  if (!user || !user.googleAccessToken) {
    throw new Error("User not connected to Gmail");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: user.googleAccessToken,
    refresh_token: user.googleRefreshToken
  });

  oauth2Client.on("tokens", (tokens) => {
    if (tokens.access_token) {
      user.googleAccessToken = tokens.access_token;
    }
    if (tokens.expiry_date) {
      user.googleTokenExpiry = new Date(tokens.expiry_date);
    }
    user.save().catch(console.error);
  });

  return oauth2Client;
};

export const fetchJobEmails = async (auth) => {
  const gmail = google.gmail({ version: "v1", auth });

  const response = await gmail.users.messages.list({
    userId: "me",
    q: "subject:(job OR interview OR offer OR application OR regret OR assessment OR coding)",
    maxResults: 500,
  });

  return response.data.messages || [];
};

export const getEmailDetails = async (auth, messageId) => {
  const gmail = google.gmail({ version: "v1", auth });
  
  const message = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full"
  });

  const headers = message.data.payload.headers;
  const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || "";

  let body = "";
  if (message.data.payload.body?.data) {
    body = Buffer.from(message.data.payload.body.data, "base64").toString("utf-8");
  } else if (message.data.payload.parts) {
    for (const part of message.data.payload.parts) {
      if (part.body?.data) {
        body = Buffer.from(part.body.data, "base64").toString("utf-8");
        break;
      }
    }
  }

  return {
    message_id: message.data.id,
    thread_id: message.data.threadId,
    date: getHeader("Date"),
    from: getHeader("From"),
    subject: getHeader("Subject"),
    body: body.substring(0, 10000)
  };
};

export const refreshUserTokens = async (userId) => {
  const user = await User.findById(userId);
  
  if (!user || !user.googleRefreshToken) {
    throw new Error("No refresh token available");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: user.googleAccessToken,
    refresh_token: user.googleRefreshToken
  });

  const { credentials } = await oauth2Client.refreshAccessToken();
  
  user.googleAccessToken = credentials.access_token;
  user.googleTokenExpiry = credentials.expiry_date;
  await user.save();

  return credentials;
};
