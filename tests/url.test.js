'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const Url = require('../shared/url.js');

describe('extractCodigoOsFromUrl', () => {
  it('extracts OS code from Cartosoft edit URL', () => {
    const href = 'https://cartosoftweb.recivil.com.br/cartosoft-web/ordem-de-servico/editar/AUR2600013230';
    assert.equal(Url.extractCodigoOsFromUrl(href), 'AUR2600013230');
  });

  it('is case-insensitive and uppercases', () => {
    const href = 'https://cartosoftweb.recivil.com.br/cartosoft-web/ordem-de-servico/editar/aur2600013230?x=1';
    assert.equal(Url.extractCodigoOsFromUrl(href), 'AUR2600013230');
  });

  it('returns null outside edit pages', () => {
    assert.equal(
      Url.extractCodigoOsFromUrl('https://cartosoftweb.recivil.com.br/cartosoft-web/registros/ordem-de-servico/pesquisar'),
      null
    );
  });

  it('rejects malformed codes', () => {
    assert.equal(
      Url.extractCodigoOsFromUrl('https://x/ordem-de-servico/editar/!!'),
      null
    );
  });
});
