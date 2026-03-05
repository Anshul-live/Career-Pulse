import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    getApplications,
    getApplicationById,
    regroupApplications,
    mergeApps,
    updateApplicationStatus,
    deleteApplication
} from "../controllers/application.controller.js";

const router = express.Router();

router.get("/", verifyJWT, getApplications);
router.get("/:id", verifyJWT, getApplicationById);
router.post("/regroup", verifyJWT, regroupApplications);
router.post("/merge", verifyJWT, mergeApps);
router.put("/:id/status", verifyJWT, updateApplicationStatus);
router.delete("/:id", verifyJWT, deleteApplication);

export default router;
