"use strict";
require("dotenv").config();

const router = require("express").Router();
const { query } = require("express-validator");
const { checkKey } = require("./keysRoute");
const controller = require("../controllers/birdController");
const { validate } = require("../validator");

router.get(
  "/",
  checkKey,
  query("name").optional().isString(),
  query("sciName").optional().isString(),
  query("status").optional().isString(),
  query("order").optional().isString(),
  query("family").optional().isString(),
  query("region").optional().isString(),
  query("operator").optional().isString().isIn(["AND", "OR"]),
  validate,
  controller.getBirdsV2
);

module.exports = router;
