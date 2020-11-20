const express = require('express');
const passport = require('passport');
const compression = require('compression');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const qsMiddleware = require('qs-middleware');
const fileUpload = require('express-fileupload');
const rateLimit = require('express-rate-limit');
const localizationMiddleware = require('../../localization/middleware');
const authenticate = require('./authenticate');
const identifyAPI = require('./identifyAPI');

const middleware = (payload) => {
  const rateLimitOptions = {
    windowMs: payload.config.rateLimit.window,
    max: payload.config.rateLimit.max,
  };

  if (typeof payload.config.rateLimit.skip === 'function') rateLimitOptions.skip = payload.config.rateLimit.skip;

  return [
    rateLimit(rateLimitOptions),
    passport.initialize(),
    identifyAPI('REST'),
    methodOverride('X-HTTP-Method-Override'),
    qsMiddleware({ depth: 10 }),
    bodyParser.urlencoded({ extended: true }),
    compression(payload.config.compression),
    localizationMiddleware(payload.config.localization),
    express.json(payload.config.express.json),
    fileUpload({
      parseNested: true,
      ...payload.config.upload,
    }),
    (req, res, next) => {
      if (payload.config.cors) {
        res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Content-Encoding');

        if (payload.config.cors === '*') {
          res.setHeader('Access-Control-Allow-Origin', '*');
        } else if (Array.isArray(payload.config.cors) && payload.config.cors.indexOf(req.headers.origin) > -1) {
          res.header('Access-Control-Allow-Credentials', true);
          res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
        }
      }

      next();
    },
    authenticate(payload.config),
    ...(payload.config.middleware || []),
  ];
};

module.exports = middleware;