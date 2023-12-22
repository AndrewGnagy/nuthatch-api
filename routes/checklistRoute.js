"use strict";
require("dotenv").config();
const { body, param } = require("express-validator");
const router = require("express").Router();
const { checkKey } = require("./keysRoute");
const controller = require("../controllers/checklistController");
const { validate } = require("../validator");

router.get("/", checkKey, controller.getChecklists);

router.post(
  "/",
  checkKey,
  body("name").exists().isString(),
  validate,
  controller.postChecklist
);

router.delete(
  "/:checklistId",
  checkKey,
  param("checklistId").exists().isUUID(4),
  validate,
  controller.deleteChecklist
);

router.get("/:checklistId/entries", checkKey,
param("checklistId").exists().isUUID(4),
validate,
controller.getChecklistEntries);

router.post(
  "/:checklistId/entries/:birdId",
  checkKey,
  param("checklistId").exists().isUUID(4),
  param("birdId").exists().isInt(),
  body("description").optional().isString(),
  body("location").optional().isString(),
  validate,
  controller.postChecklistEntry
);

module.exports = router;
