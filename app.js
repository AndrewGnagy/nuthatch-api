"use strict";
require("dotenv").config();
const express = require("express");
const cors = require('cors');
const birdsRoute = require("./birdsRoute");
const birdsRouteV2 = require("./birdsRouteV2");
const { router: keysRoute } = require("./keysRoute");

// Pulling in the routes
const app = express();
app.use(express.json());
app.use(cors());

app.use("/", express.static("web"));
app.use("/keys", keysRoute);
app.use("/birds", birdsRoute);
app.use("/v2/birds", birdsRouteV2);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  return console.log("Welcome to nuthatch-api on port " + PORT);
});
