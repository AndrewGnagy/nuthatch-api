"use strict";
require("dotenv").config();
const express = require("express");
const uuid = require("uuid");
// const sqlite3 = require("sqlite3");
// const db = new sqlite3.Database(process.env.GAE_ENV ? "/tmp/birds.db" : "./birds.db");
const mailer = require("./mailer");
const validator = require("email-validator");
const fetch = require('node-fetch');

const dataKind = "ApiKey";

// Imports the Google Cloud client library
const { Datastore } = require("@google-cloud/datastore");
// Creates a client
const datastore = new Datastore();

// Pulling in the routes
const app = express();
app.use(express.json());

let keysUsages = {};
// Clear usages hourly
setInterval(clearKeyUsages, 1000 * 60 * 60);
function clearKeyUsages() {
  keysUsages = {};
}

/**
 * middleware to check for api key and  log things
 * */
async function checkKey(req, res, next) {
  const apiKey = req.get("API-Key");
  if (!apiKey) {
    res.status(401).json({ error: "unauthorised" });
    return;
  }
  const taskKey = datastore.key([dataKind, apiKey]);
  try {
    await datastore.get(taskKey);
    if (keysUsages[taskKey.name]) {
      if(keysUsages[taskKey.name] > 100) {
        res.status(429).json({ error: "too many requests" });
        return;
      } else {
        keysUsages[taskKey.name]++;
      }
    } else {
      keysUsages[taskKey.name] = 1;
    }
  } catch (e) {
    res.status(401).json({ error: "unauthorised" });
    return;
  }

  // res.on("finish", () => {
  //console.log(req, res, "Api request completed with status " + res.statusCode);
  // });
  next();
}

//There's not that much data, we can keep it in memory for now
let birdsList = [];
app.get("/birds", checkKey, async (req, res) => {
  if (!birdsList.length) {
    const query = datastore
      .createQuery("Bird");
    [birdsList] = await datastore.runQuery(query);
  }

  let filters = {
    name: req.query.name,
    sciName: req.query.sciName,
    conservationStatus: req.query.status,
    order: req.query.order,
    family: req.query.family,
  }
  let sentFilterKeys = Object.keys(filters).filter(n => filters[n] !== undefined);
  let filteredList = [];
  if (req.query.operator === "OR") {
    filteredList = birdsList.filter((bird) => {
      return sentFilterKeys.some((key) => {
        return bird[key].toLowerCase().indexOf(filters[key].toLowerCase()) != -1;
      });
    });
  } else {
    filteredList = birdsList.filter((bird) => {
      return sentFilterKeys.every((key) => {
        return bird[key].toLowerCase().indexOf(filters[key].toLowerCase()) != -1;
      });
    });
  }

  res.json(filteredList);
});

// app.get("/birds", checkKey, async (req, res) => {
//   let filters = {
//     name: req.query.name,
//     sciName: req.query.sciName,
//     conservationStatus: req.query.status,
//     ordr: req.query.order,
//     family: req.query.family,
//   };
//   let query = "SELECT * FROM birds";
//   let filterArgs = [];
//   if (Object.values(filters).some((x) => x)) {
//     query += " WHERE ";
//     let filterVals = [];
//     for (const [key, value] of Object.entries(filters)) {
//       if (!value) {
//         continue;
//       }
//       filterVals.push(`${key} like ?`);
//       filterArgs.push("%" + value + "%");
//     }
//     if (req.query.operator === "OR") {
//       query += filterVals.join(" OR ");
//     } else {
//       query += filterVals.join(" AND ");
//     }
//   }
//   db.all(query, filterArgs, function (err, rows) {
//     if (err) {
//       console.log(err);
//       res.status = 500;
//       res.json({ error: "" });
//     }
//     let results = rows.map((row) => {
//       return {
//         id: row.id,
//         name: row.name,
//         sciName: row.sciName,
//         status: row.conservationStatus,
//         order: row.order,
//         family: row.family,
//       };
//     });
//     res.json(results);
//   });
// });

const handleRecaptcha = (req, res, next) => {
  const secret_key = process.env.RECAPTCHA_SECRET_KEY;
  const token = req.body.recaptcha;
  const url = `https://www.google.com/recaptcha/api/siteverify?secret=${secret_key}&response=${token}`;

  fetch(url, {method: 'post'})
      .then(response => response.json())
      .then(google_response => {
        if(google_response.success) {
          next();
        } else {
          res.status(400);
          res.json({message: "invalid request"});
        }
      })
      .catch(error => {
        res.status(400);
        res.json({message: "invalid request"});
      });
};

app.post("/keys", handleRecaptcha, async (req, res) => {
  const email = req.body.email;
  // Validate email and block a few common spammer domains
  if (!validator.validate(email) || email.endsWith("qq.com") || email.endsWith("126.com") || email.endsWith("163.com") || email.endsWith(".ru")) {
    res.status = 400;
    res.json({message: "invalid request"});
    return;
  }
  const key = uuid.v4();

  // Check if already exists
  const query = datastore
    .createQuery(dataKind)
    .filter('email', '=', email);
  const [existingEmails] = await datastore.runQuery(query);
  console.log(existingEmails);
  if (existingEmails.length > 0) {
    res.status = 409;
    res.json({message: "key already exists for this email"});
    return;
  }

  // Saves the entity
  // The Cloud Datastore key for the new entity
  const taskKey = datastore.key([dataKind, key]);
  // Prepares the new entity
  const task = {
    key: taskKey,
    data: {
      email: email,
      usecase: req.body.usecase,
      key: key
    }
  };
  await datastore.save(task);
  console.log(`Saved new key ${task.key.name}: ${task.data.email}`);

  // Send out the email and respond 200
  mailer.sendKeyEmail(key);
  res.json({message: "api key sent"})
});

app.use("/", express.static("web"));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  return console.log("Welcome to nuthatch-api on port " + PORT);
});
