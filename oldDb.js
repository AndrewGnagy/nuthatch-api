"use strict";
require("dotenv").config();
const express = require("express");
const sqlite3 = require("sqlite3");
const db = new sqlite3.Database(process.env.GAE_ENV ? "/tmp/birds.db" : "./birds.db");

app.get("/birds", checkKey, async (req, res) => {
  let filters = {
    name: req.query.name,
    sciName: req.query.sciName,
    conservationStatus: req.query.status,
    ordr: req.query.order,
    family: req.query.family,
  };
  let query = "SELECT * FROM birds";
  let filterArgs = [];
  if (Object.values(filters).some((x) => x)) {
    query += " WHERE ";
    let filterVals = [];
    for (const [key, value] of Object.entries(filters)) {
      if (!value) {
        continue;
      }
      filterVals.push(`${key} like ?`);
      filterArgs.push("%" + value + "%");
    }
    if (req.query.operator === "OR") {
      query += filterVals.join(" OR ");
    } else {
      query += filterVals.join(" AND ");
    }
  }
  db.all(query, filterArgs, function (err, rows) {
    if (err) {
      console.log(err);
      res.status = 500;
      res.json({ error: "" });
    }
    let results = rows.map((row) => {
      return {
        id: row.id,
        name: row.name,
        sciName: row.sciName,
        status: row.conservationStatus,
        order: row.order,
        family: row.family,
      };
    });
    res.json(results);
  });
});


app.use("/", express.static("web"));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  return console.log("Welcome to nuthatch-api on port " + PORT);
});
