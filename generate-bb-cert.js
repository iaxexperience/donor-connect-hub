const crypto = require('crypto');
const fs = require('fs');

// Generate RSA 2048 key pair
console.log("Gerando par de chaves RSA 2048...");
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

// For a real self-signed X.509 cert in Node without external libs like node-forge, 
// we'd need a lot of boilerplate or use openssl. 
// However, I will check if I can use a simple tool to generate the .crt.

fs.writeFileSync('bb_private_key.pem', privateKey);
fs.writeFileSync('bb_public_key.pem', publicKey);

console.log("Chaves geradas com sucesso.");
console.log("--- CHAVE PÚBLICA (Para o Portal BB) ---");
console.log(publicKey);
