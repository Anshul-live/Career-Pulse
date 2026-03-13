import express from "express";
import passport from "passport";
import { getJobEmailStats, uploadEmails, getEmails, updateEmailStatus, refreshStatuses, getLastFetchDate, updateLastFetchDate, deleteAllEmails, deleteEmail } from "../controllers/gmail.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get(
  "/job-stats",
  passport.authenticate("session"),
  getJobEmailStats
);

router.post(
  "/upload-emails",
  verifyJWT,
  uploadEmails
);

router.get(
  "/emails",
  verifyJWT,
  getEmails
);

router.put(
  "/emails/:emailId/status",
  verifyJWT,
  updateEmailStatus
);

router.delete(
  "/emails/:emailId",
  verifyJWT,
  deleteEmail
);

router.delete(
  "/emails/all",
  verifyJWT,
  deleteAllEmails
);

router.post(
  "/emails/refresh",
  verifyJWT,
  refreshStatuses
);

router.get(
  "/last-fetch",
  verifyJWT,
  getLastFetchDate
);

router.post(
  "/last-fetch",
  verifyJWT,
  updateLastFetchDate
);

export default router;
