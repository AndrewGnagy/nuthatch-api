"use strict";
require("dotenv").config();
const express = require("express");
const cors = require('cors');
const birdsRoute = require("./routes/birdsRoute");
const checklistRoute = require("./routes/checklistRoute");
const birdsRouteV2 = require("./routes/birdsRouteV2");
const { router: keysRoute } = require("./routes/keysRoute");

// Pulling in the routes
const app = express();
app.use(express.json());
app.use(cors());

app.use("/", express.static("web"));
app.use("/keys", keysRoute);
app.use("/birds", birdsRoute);
app.use("/v2/birds", birdsRouteV2);
app.use("/checklists", checklistRoute);

const PORT = process.env.PORT || 3000;

console.log(process.env.NODE_ENV)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    return console.log("Welcome to nuthatch-api on port " + PORT);
  });
}

module.exports = app;