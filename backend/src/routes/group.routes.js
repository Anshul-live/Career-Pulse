import express from "express";
import { getGroups, getGroup, changeGroupState, mergeGroup, splitGroupEmails, addNoteToGroup, deleteGroup } from "../controllers/group.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyJWT);

router.get("/", getGroups);
router.get("/:groupId", getGroup);
router.put("/:groupId/state", changeGroupState);
router.post("/merge", mergeGroup);
router.post("/:groupId/split", splitGroupEmails);
router.put("/:groupId/notes", addNoteToGroup);
router.delete("/:groupId", deleteGroup);

export default router;
