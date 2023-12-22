"use strict";
require("dotenv").config();
const router = require("express").Router();
const { randomUUID } = require('crypto');
const mailer = require("../mailer");
const validator = require("email-validator");

const dataKind = "ApiKey";

// Imports the Google Cloud client library
const { Datastore } = require("@google-cloud/datastore");
// Creates a client
const datastore = new Datastore();

let keysUsages = {};
// Clear usages hourly
setInterval(clearKeyUsages, 1000 * 60 * 14);
async function clearKeyUsages() {
  for(const key in keysUsages) {
    updateKeyCounts(key, keysUsages[key]);
  }

  keysUsages = {};
}

// Usage overrides
let usageOverrides = {
  "1520eee2-4a26-46ca-8201-10534267b8a8": 3000, //Student
  "0fe8f758-8718-4128-8897-c97cfee45506": 3000 //Website example
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
    let foundKey = await datastore.get(taskKey);
    if(!foundKey[0]) {
      throw "Key not found";
    }
    if (keysUsages[taskKey.name]) {
      let limit = usageOverrides[apiKey] || 500;
      if (keysUsages[taskKey.name] > limit) {
        res.status(429).json({ error: `Too many requests. Limit ${limit}/hr. Need more? Contact lastelmsoft@gmail.com` });
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
  router,
  checkKey
}