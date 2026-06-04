require('dotenv').config();

module.exports = {
  SECRET_KEY: process.env.SECRET_KEY,
  JWT_ISSUER: 'auth0',
  JWT_EXPIRES_IN: '7d'
};