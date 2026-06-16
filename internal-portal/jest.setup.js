// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'
process.env.CSRF_SECRET = process.env.CSRF_SECRET || 'test-csrf-secret-32-bytes-long-for-jest-env-only';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'test-encryption-key-32-bytes-long-for-jest';

// Polyfill TextEncoder/TextDecoder and Web Crypto for jsdom (used by encryption.ts)
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

import { webcrypto } from 'crypto';
global.crypto = webcrypto;

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
