"use strict";
require("dotenv").config();

const router = require("express").Router();
const { query, param } = require("express-validator");
const { checkKey } = require("./keysRoute");
const controller = require("../controllers/birdController");
const { validate } = require("../validator");

//There's not that much data, we can keep it in memory for now
router.get("/", checkKey,
query("name").optional().isString(),
query("sciName").optional().isString(),
query("status").optional().isString(),
query("order").optional().isString(),
query("family").optional().isString(),
query("operator").optional().isString().isIn(["AND", "OR"]),
validate,
controller.getBirdsV1);

router.get("/:birdId", checkKey,
param("birdId").exists().isInt(),
controller.getBird);

module.exports = router;