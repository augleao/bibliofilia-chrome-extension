#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const pemPath = process.env.CHROME_EXTENSION_PEM || path.join(root, 'keys/extension.pem');
const outPath = path.join(root, 'keys/extension-identity.json');

if (!fs.existsSync(pemPath)) {
  console.error('PEM não encontrado:', pemPath);
  process.exit(1);
}

const pem = fs.readFileSync(pemPath, 'utf8');
const key = crypto.createPrivateKey(pem);
const pubDer = crypto.createPublicKey(key).export({ type: 'spki', format: 'der' });
const publicKeyBase64 = pubDer.toString('base64');
const hash = crypto.createHash('sha256').update(pubDer).digest();
const alphabet = 'abcdefghijklmnop';
let extensionId = '';
for (let i = 0; i < 16; i += 1) {
  extensionId += alphabet[hash[i] >> 4];
  extensionId += alphabet[hash[i] & 0xf];
}

const identity = {
  extensionId,
  publicKeyBase64,
  generatedAt: new Date().toISOString(),
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(identity, null, 2)}\n`);
console.log(JSON.stringify(identity, null, 2));
