"use strict";
const _ = require("lodash");

const pagedResponse = (entityList, page, pageSize) => {
  let entitiesPaged;
  pageSize = pageSize || 25;
  page = page || 1;
  if (entityList.length < pageSize) {
    // Do nothing
    entitiesPaged = entityList || [];
  } else {
    entitiesPaged = _.nth(_.chunk(entityList, pageSize), page - 1) || [];
  }
  return {
    entities: entitiesPaged,
    total: entityList.length,
    page,
    pageSize,
  };
};

const readPagingParams = (eventIn) => {
  const entityOut = { page: 1, pageSize: 25 };
  if (eventIn.query) {
    entityOut.page = !isNaN(eventIn.query.page)
      ? parseInt(eventIn.query.page, 10)
      : 1;
    // Limit page size to 100
    if (
      !_.isUndefined(eventIn.query.pageSize) &&
      !isNaN(eventIn.query.pageSize)
    ) {
      entityOut.pageSize =
        eventIn.query.pageSize < 101
          ? parseInt(eventIn.query.pageSize, 10)
          : 100;
    }
  }
  return entityOut;
};

module.exports = {
  pagedResponse: pagedResponse,
  readPagingParams: readPagingParams,
};