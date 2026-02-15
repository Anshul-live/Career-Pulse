import { google } from "googleapis";

export const fetchJobEmails = async (accessToken) => {

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const gmail = google.gmail({ version: "v1", auth });

  const response = await gmail.users.messages.list({
    userId: "me",
    q: "subject:(job OR interview OR offer OR application OR regret)",
    maxResults: 50,
  });

  return response.data.messages || [];
};
