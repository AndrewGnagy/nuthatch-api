"use strict";
require("dotenv").config();
const router = require("express").Router();
const { randomUUID } = require('crypto');
const mailer = require("./mailer");
const validator = require("email-validator");

const dataKind = "ApiKey";

// Imports the Google Cloud client library
const { Datastore } = require("@google-cloud/datastore");
// Creates a client
const datastore = new Datastore();

let keysUsages = {};
// Clear usages hourly
setInterval(clearKeyUsages, 1000 * 60 * 60);
async function clearKeyUsages() {
  for(const key in keysUsages) {
    updateKeyCounts(key, keysUsages[key]);
  }

  keysUsages = {};
}

async function updateKeyCounts(apiKey, callCount) {
  let tKey = datastore.key([dataKind, apiKey]);
  const oldKey = await datastore.get(tKey);
  const keyData = {
    key: tKey,
    data: {
      email: oldKey[0].email,
      usecase: oldKey[0].usecase,
      category: oldKey[0].category,
      key: oldKey[0].key,
      usage: oldKey[0].usage ? oldKey[0].usage + callCount : callCount,
    },
  };
  return await datastore.save(keyData);
}

/**
 * middleware to check for api key and  log things
 * */
async function checkKey(req, res, next) {
  const apiKey = req.get("API-Key");
  if (!apiKey) {
    res.status(401).json({ error: "Unauthorized. Did you include a valid API-Key header?" });
    return;
  }
  const taskKey = datastore.key([dataKind, apiKey]);
  try {
    await datastore.get(taskKey);
    if (keysUsages[taskKey.name]) {
      if (keysUsages[taskKey.name] > 100) {
        res.status(429).json({ error: "too many requests" });
        return;
      } else {
        keysUsages[taskKey.name]++;
      }
    } else {
      keysUsages[taskKey.name] = 1;
    }
  } catch (e) {
    res.status(401).json({ error: "Unauthorized. Did you include a valid API-Key header?" });
    return;
  }

  // res.on("finish", () => {
  //console.log(req, res, "Api request completed with status " + res.statusCode);
  // });
  next();
}

const handleRecaptcha = (req, res, next) => {
  const secret_key = process.env.RECAPTCHA_SECRET_KEY;
  const token = req.body.recaptcha;
  const url = `https://www.google.com/recaptcha/api/siteverify?secret=${secret_key}&response=${token}`;

  fetch(url, { method: "post" })
    .then((response) => response.json())
    .then((google_response) => {
      if (google_response.success) {
        next();
      } else {
        console.log("captcha fail");
        res.status(400);
        res.json({ message: "invalid request. Recaptcha failure" });
      }
    })
    .catch((error) => {
      res.status(400);
      res.json({ message: "invalid request. Recaptcha failure" });
    });
};

router.post("/", handleRecaptcha, async (req, res) => {
  const email = req.body.email;
  // Validate email and block a few common spammer domains
  if (
    !validator.validate(email) ||
    email.endsWith("qq.com") ||
    email.endsWith("126.com") ||
    email.endsWith("163.com") ||
    email.endsWith(".ru")
  ) {
    res.status(400);
    res.json({ message: "invalid request" });
    return;
  }
  const key = randomUUID();

  // Check if already exists
  const query = datastore.createQuery(dataKind).filter("email", "=", email);
  const [existingEmails] = await datastore.runQuery(query);
  console.log(existingEmails);
  if (existingEmails.length > 0) {
    res.status(409);
    res.json({ message: "key already exists for this email" });
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
      category: req.body.category,
      key: key,
    },
  };
  await datastore.save(task);
  console.log(`Saved new key ${task.key.name}: ${task.data.email}`);

  // Send out the email and respond 200
  mailer.sendKeyEmail(key, email);
  res.json({ message: "api key sent" });
});

module.exports = {
  router: router,
  checkKey: checkKey
}