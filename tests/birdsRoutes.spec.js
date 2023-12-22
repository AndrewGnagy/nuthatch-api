const sinon = require("sinon");
const chai = require('chai');
const expect = chai.expect;
const chaiHttp = require('chai-http');
chai.use(chaiHttp);
const controller = require("../controllers/birdController");
const keysRoute = require("../routes/keysRoute");

const sandbox = sinon.createSandbox();

let app; 

describe("Testing birds routes", () => {
  before(() => {
    let sampleItemVal = {};
    sandbox.stub(controller, "getBirdsV2").callsFake(async function(req, res, next) {
      res.json(sampleItemVal);
    });
    sandbox.stub(controller, "getBird").callsFake(async function(req, res, next) {
      res.json(sampleItemVal);
    });
    sandbox
      .stub(keysRoute, "checkKey")
      .callsFake(async function(req, res, next) {
        const apiKey = req.get("API-Key");
        if (!apiKey) {
          res.status(401).json({ error: "Unauthorized. No key!!" });
          return;
        }
        next();
      });
    app = require("../app");
  });

  after(() => {
    app = require("../app");
    sandbox.restore();
  });

  describe("GET /v2/birds", () => {
    it("/v2/birds should fail without API-Key", (done) => {
      chai.request(app)
        .get("/v2/birds")
        .end((err, response) => {
          expect(response).to.have.status(401);
          expect(response.body)
            .to.have.property("error")
            .to.contain("Unauthorized");
          done(err);
        });
    });

    it("/v2/birds should fail with incorrect operator param", (done) => {
      chai.request(app)
        .get("/v2/birds")
        .query({
          operator: "NOT"
        })
        .set({ "API-Key": "foobar", Accept: "application/json" })
        .end((err, response) => {
          expect(response).to.have.status(400);
          expect(response.body)
            .to.have.property("errors");
          expect(response.body.errors[0].path).to.equal("operator");
          done(err);
        });
    });

    it("/v2/birds should succeed", (done) => {
      chai.request(app)
        .get("/v2/birds")
        .set({ "API-Key": "foobar", Accept: "application/json" })
        .end((err, response) => {
          expect(response).to.have.status(200);
          expect(response.body).to.exist;
          done(err);
        });
    });
  });
});
