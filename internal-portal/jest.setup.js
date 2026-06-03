// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'
global.Request = require("node-fetch").Request;
const nodeFetchResponse = require("node-fetch").Response;
global.Response = class Response extends nodeFetchResponse {
  static json(body, init) {
    return new Response(JSON.stringify(body), {
      ...init,
      headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
    });
  }
};
global.Response.json = global.Response.json;
