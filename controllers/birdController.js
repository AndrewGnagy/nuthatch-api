const { pagedResponse, readPagingParams } = require("../paging");

// Imports the Google Cloud client library
const { Datastore } = require("@google-cloud/datastore");
// Creates a client
const datastore = new Datastore();

//There's not that much data, we can keep it in memory for now
let birdsList = [];

async function getBirdsV1(req, res) {
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
  return Promise.resolve();
};

async function getBird(req, res) {
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
  return Promise.resolve();
};

let filterCheck = (key, bird, value) => {
  if (key == "hasImg") {
    return (value == "true") == (bird["images"] && bird["images"].length > 0);
  } else if (key == "region") {
    return bird[key]?.indexOf(value) != -1;
  } else {
    return bird[key]?.toLowerCase().indexOf(value?.toLowerCase()) != -1;
  }
};

async function getBirdsV2(req, res) {
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
    hasImg: req.query.hasImg,
  };
  let sentFilterKeys = Object.keys(filters).filter(
    (n) => filters[n] !== undefined
  );
  let filteredList = [];
  if (req.query.operator === "OR") {
    filteredList = birdsList.filter((bird) => {
      return sentFilterKeys.some((key) => {
        if (key == "status") {
          key = "conservationStatus";
        }
        return filterCheck(key, bird, filters[key]);
      });
    });
  } else {
    filteredList = birdsList.filter((bird) => {
      return sentFilterKeys.every((key) => {
        if (key == "status") {
          key = "conservationStatus";
        }
        return filterCheck(key, bird, filters[key]);
      });
    });
  }
  res.json(pagedResponse(filteredList, pageParams.page, pageParams.pageSize));
  return Promise.resolve();
};

module.exports = { getBirdsV1, getBird, getBirdsV2 };
