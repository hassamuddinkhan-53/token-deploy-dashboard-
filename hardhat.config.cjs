require('dotenv').config();
require('@nomicfoundation/hardhat-ethers');
require('@nomicfoundation/hardhat-chai-matchers');

const getPrivateKey = () => {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) return '';
  return pk.startsWith('0x') ? pk : '0x' + pk;
};

module.exports = {
  solidity: {
    compilers: [
      { version: '0.5.16' },
      { version: '0.6.6' },
      { version: '0.8.19' },
      { version: '0.8.20' }
    ]
  },
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || '',
      accounts: getPrivateKey() ? [getPrivateKey()] : []
    }
  }
};
