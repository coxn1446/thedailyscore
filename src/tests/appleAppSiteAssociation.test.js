const http = require('http');
const express = require('express');
const { appleAppSiteAssociation, sendAppleAppSiteAssociation } = require('../../server/wellKnown/appleAppSiteAssociation');

const get = (port, path) => new Promise((resolve, reject) => {
  http.get({ hostname: '127.0.0.1', port, path }, (response) => {
    const chunks = [];
    response.on('data', (chunk) => chunks.push(chunk));
    response.on('end', () => {
      resolve({
        status: response.statusCode,
        type: response.headers['content-type'],
        body: Buffer.concat(chunks).toString('utf8'),
      });
    });
  }).on('error', reject);
});

describe('apple app site association', () => {
  test('names each iOS bundle and skips API paths', () => {
    const detail = appleAppSiteAssociation.applinks.details[0];
    expect(detail.appIDs).toEqual([
      'J668NFXJYB.site.thedailyscore.prod',
      'J668NFXJYB.site.thedailyscore.qa',
      'J668NFXJYB.site.thedailyscore.dev',
    ]);
    expect(detail.components).toEqual(expect.arrayContaining([
      { '/': '/api/*', exclude: true },
      { '/': '/*' },
    ]));
  });

  test('serves the file as JSON', async () => {
    const app = express();
    app.get('/.well-known/apple-app-site-association', sendAppleAppSiteAssociation);
    const server = await new Promise((resolve) => {
      const listening = http.createServer(app);
      listening.listen(0, '127.0.0.1', () => resolve(listening));
    });
    const { port } = server.address();
    const response = await get(port, '/.well-known/apple-app-site-association');
    expect(response.status).toBe(200);
    expect(response.type).toMatch(/application\/json/);
    expect(JSON.parse(response.body).applinks.details[0].appIDs[0]).toBe('J668NFXJYB.site.thedailyscore.prod');
    await new Promise((resolve) => server.close(resolve));
  });
});
