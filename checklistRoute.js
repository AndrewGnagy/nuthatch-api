"use strict";
require("dotenv").config();
const { randomUUID } = require("crypto");

const router = require("express").Router();
const { checkKey } = require("./keysRoute");
const { pagedResponse, readPagingParams } = require("./paging");

// Imports the Google Cloud client library
const { Datastore } = require("@google-cloud/datastore");
// Creates a client
const datastore = new Datastore();

router.get("/", checkKey, async (req, res) => {
  const query = datastore
    .createQuery("nh_checklist")
    .filter("api_key", "=", req.get("API-Key"));
  let [checklists] = await datastore.runQuery(query);
  checklists = checklists.map((u) => {
    return {
      name: u.name,
      id: u.id,
    };
  });
  res.json(pagedResponse(checklists, 1, 25));
});

router.post("/", checkKey, async (req, res) => {
  const query = datastore
    .createQuery("nh_checklist")
    .filter("api_key", "=", req.get("API-Key"));
  let [checklists] = await datastore.runQuery(query);
  if (checklists.length >= 25) {
    res.status = 400;
    res.json({ message: "25 checklist limit exceeded" });
    return;
  }

  const guid = randomUUID();
  const checklistKey = datastore.key(["nh_checklist", guid]);
  const entity = {
    key: checklistKey,
    data: [
      {
        name: "id",
        value: guid,
      },
      {
        name: "name",
        value: req.body.name,
      },
      {
        name: "api_key",
        value: req.get("API-Key"),
      },
    ],
  };
  await datastore.save(entity);
  res.json(entity.data);
});

router.delete("/:checklistId", checkKey, async (req, res) => {
  if (!req.params.checklistId) {
    res.status(400);
    res.json({ message: "invalid request" });
  }
  //Delete checklist
  const checklistKey = datastore.key(["nh_checklist", req.params.checklistId]);
  await datastore.delete(checklistKey);
  //Delete any checklist entries
  const query = datastore
    .createQuery("nh_checklist")
    .filter("checklistId", "=", req.params.checklistId);
  let [checks] = await datastore.runQuery(query);
  await checks.map((check) => {
    return datastore.delete(check);
  });
  res.json();
});

router.get("/:checklistId/entries", checkKey, async (req, res) => {
  let pageParams = readPagingParams(req, 100);
  const query = datastore
    .createQuery("nh_checklist_entry")
    .filter("checklistId", "=", req.params.checklistId);
  let [checks] = await datastore.runQuery(query);
  res.json(pagedResponse(checks, pageParams.page, pageParams.pageSize));
});

router.post("/:checklistId/entries/:birdId", checkKey, async (req, res) => {
  //Assert params exists
  if (!req.params.checklistId || !req.params.birdId) {
    res.status(400);
    res.json({ message: "invalid request" });
  }
  //Assert checklist exists
  try {
    await datastore.get(datastore.key(["nh_checklist_entry", req.params.checklistId]));
  } catch (e) {
    res.status(404).json({ error: "No such checklist" });
    return;
  }
  //Assert checklist exists
  try {
    await datastore.get(datastore.key(["Bird", req.params.birdId]));
  } catch (e) {
    res.status(404).json({ error: "No such bird" });
    return;
  }

  const checkKey = datastore.key([
    "nh_checklist_entry",
    req.params.checklistId + ":" + req.params.birdId,
  ]);
  const entity = {
    key: checkKey,
    data: [
      {
        name: "checklistId",
        value: req.params.checklistId,
      },
      {
        name: "birdId",
        value: req.params.birdId,
      },
      {
        name: "description",
        value: req.body.description,
      },
      {
        name: "date-time",
        value: new Date().toISOString(),
      },
      {
        name: "location",
        value: req.body.location,
      },
    ],
  };
  await datastore.save(entity);
  res.json(
    entity.data.reduce((set, x) => {
      set[x.name] = x.value;
      return set;
    }, {})
  );
});

module.exports = router;
