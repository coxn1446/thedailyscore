const TEAM_ID = 'J668NFXJYB';
const BUNDLE_IDS = [
  'site.thedailyscore.prod',
  'site.thedailyscore.qa',
  'site.thedailyscore.dev',
];

const appleAppSiteAssociation = {
  applinks: {
    apps: [],
    details: [
      {
        appIDs: BUNDLE_IDS.map((bundleId) => `${TEAM_ID}.${bundleId}`),
        components: [
          { '/': '/api/*', exclude: true },
          { '/': '/.well-known/*', exclude: true },
          { '/': '/uploads/*', exclude: true },
          { '/': '/*' },
        ],
      },
    ],
  },
};

const sendAppleAppSiteAssociation = (req, res) => {
  res.set('Cache-Control', 'public, max-age=3600');
  res.type('application/json');
  res.send(JSON.stringify(appleAppSiteAssociation));
};

module.exports = {
  appleAppSiteAssociation,
  sendAppleAppSiteAssociation,
};
