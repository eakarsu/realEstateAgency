const tokenOptions = Object.freeze({
  algorithm: 'HS256',
  expiresIn: '1h',
  issuer: 'real-estate-agency-api',
  audience: 'real-estate-agency-client',
});

const verifyOptions = Object.freeze({
  algorithms: ['HS256'],
  issuer: tokenOptions.issuer,
  audience: tokenOptions.audience,
});

module.exports = { tokenOptions, verifyOptions };
