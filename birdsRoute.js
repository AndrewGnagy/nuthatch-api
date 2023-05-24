"use strict";
require("dotenv").config();

const router = require("express").Router();
const { checkKey } = require("./keysRoute");

// Imports the Google Cloud client library
const { Datastore } = require("@google-cloud/datastore");
// Creates a client
const datastore = new Datastore();

//There's not that much data, we can keep it in memory for now
let birdsList = [];
router.get("/", checkKey, async (req, res) => {
  if (!birdsList.length) {
    const query = datastore.createQuery("Bird");
    [birdsList] = await datastore.runQuery(query);
  }

  let filters = {
    name: req.query.name,
    sciName: req.query.sciName,
    conservationStatus: req.query.status,
    order: req.query.order,
    family: req.query.family,
  };
  let sentFilterKeys = Object.keys(filters).filter(
    (n) => filters[n] !== undefined
  );
  let filteredList = [];
  if (req.query.operator === "OR") {
    filteredList = birdsList.filter((bird) => {
      return sentFilterKeys.some((key) => {
        return (
          bird[key].toLowerCase().indexOf(filters[key].toLowerCase()) != -1
        );
      });
    });
  } else {
    filteredList = birdsList.filter((bird) => {
      return sentFilterKeys.every((key) => {
        return (
          bird[key].toLowerCase().indexOf(filters[key].toLowerCase()) != -1
        );
      });
    });
  }

  res.json(filteredList.slice(0, 200));
});

router.get("/:birdId", checkKey, async (req, res) => {
  if (!birdsList.length) {
    const query = datastore.createQuery("Bird");
    [birdsList] = await datastore.runQuery(query);
  }

  if (!req.params.birdId) {
    res.status(400);
    res.json({ message: "invalid request" });
  }
  const birdId = parseInt(req.params.birdId);
  const bird = birdsList.find((b) => b.id == birdId);
  console.log(bird);
  if (!bird) {
    res.status(404);
    res.json({ message: "bird not found" });
    return;
  }
  const query = datastore
    .createQuery("Recording")
    .filter("birdId", "=", birdId);
  let [recordings] = await datastore.runQuery(query);
  bird["recordings"] = recordings;
  res.json(bird);
});

module.exports = router;