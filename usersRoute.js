"use strict";
require("dotenv").config();
const { randomUUID } = require('crypto');

const router = require("express").Router();
const { checkKey } = require("./keysRoute");
const { pagedResponse } = require("./paging")

// Imports the Google Cloud client library
const { Datastore } = require("@google-cloud/datastore");
// Creates a client
const datastore = new Datastore();

router.get("/", checkKey, async (req, res) => {
  const query = datastore.createQuery("nh_user").filter('api_key', '=', req.get("API-Key"));
  let [users] = (await datastore.runQuery(query));
  res.json(pagedResponse(users, 1, 25));
});

router.post("/", checkKey, async (req, res) => {
  const query = datastore.createQuery("nh_user").filter('api_key', '=', req.get("API-Key"));
  let [users] = (await datastore.runQuery(query));
  if (users.length >= 25) {
    res.status = 400;
    res.json({"message": "25 user limit exceeded"});
    return;
  }

  const guid = randomUUID();
  const userKey = datastore.key(['nh_user', guid]);
  const entity = {
    key: userKey,
    data: [
      {
        name: 'id',
        value: guid,
      },
      {
        name: 'name',
        value: req.body.name,
      },
      {
        name: 'api_key',
        value: req.get("API-Key"),
      },
    ],
  };
  await datastore.save(entity);
  res.json(entity.data);
});

router.delete("/:userId", checkKey, async (req, res) => {
  if (!req.params.userId) {
    res.status(400);
    res.json({ message: "invalid request" });
  }
  //Delete user
  const userKey = datastore.key(['nh_user', req.params.userId]);
  await datastore.delete(userKey);
  //Delete any checklist entries
  const query = datastore.createQuery("nh_checklist").filter('userId', '=', req.params.userId);
  let [checks] = (await datastore.runQuery(query));
  await checks.map((check) => {
    return datastore.delete(check);
  });
  res.json();
});

router.get("/:userId/checklist", checkKey, async (req, res) => {
  const query = datastore.createQuery("nh_checklist").filter('userId', '=', req.params.userId);
  let [checks] = (await datastore.runQuery(query));
  res.json(checks);
});

router.post("/:userId/checklist/:birdId", checkKey, async (req, res) => {
  //Assert params exists
  if (!req.params.userId || !req.params.birdId) {
    res.status(400);
    res.json({ message: "invalid request" });
  }
  //Assert user exists
  try {
    await datastore.get(datastore.key(['nh_user', req.params.userId]));
  } catch (e) {
    res.status(404).json({ error: "No such user" });
    return;
  }
    //Assert user exists
    try {
      await datastore.get(datastore.key(['Bird', req.params.birdId]));
    } catch (e) {
      res.status(404).json({ error: "No such bird" });
      return;
    }

  const checkKey = datastore.key(['nh_checklist', req.params.userId + ':' + req.params.birdId]);
  const entity = {
    key: checkKey,
    data: [
      {
        name: 'userId',
        value: req.params.userId,
      },
      {
        name: 'birdId',
        value: req.params.birdId,
      },
      {
        name: 'description',
        value: req.body.description,
      },
      {
        name: 'date-time',
        value: new Date().toISOString(),
      },
      {
        name: 'location',
        value: req.body.location,
      },
    ],
  };
  await datastore.save(entity);
  res.json(entity.data);
});

module.exports = router;