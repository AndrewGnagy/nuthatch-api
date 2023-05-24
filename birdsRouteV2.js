"use strict";
require("dotenv").config();

const router = require("express").Router();
const { checkKey } = require("./keysRoute");
const { pagedResponse, readPagingParams } = require("./paging")

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
  let pageParams = readPagingParams(req);

  let filters = {
    name: req.query.name,
    sciName: req.query.sciName,
    conservationStatus: req.query.status,
    order: req.query.order,
    family: req.query.family,
    region: req.query.region,
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
  res.json(pagedResponse(filteredList, pageParams.page, pageParams.pageSize));
});

module.exports = router;