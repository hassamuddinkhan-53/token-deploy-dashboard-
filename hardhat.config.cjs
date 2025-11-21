require('dotenv').config();
require('@nomicfoundation/hardhat-ethers');
require('@nomicfoundation/hardhat-chai-matchers');

const getPrivateKey = () => {
  const pk = process.env.PRIVATE_KEY;
  if (!pk || pk === 'your_wallet_private_key_here') return '';
  return pk.startsWith('0x') ? pk : '0x' + pk;
};

module.exports = {
  solidity: {
    compilers: [
      { version: '0.8.19' },
      { version: '0.8.20' }
    ]
  },
  networks: {
    localhost: {
      url: 'http://127.0.0.1:8666',
      chainId: 31337
    },
    sepolia: {
      url: process.env.INFURA_SEPOLIA_URL || process.env.ALCHEMY_SEPOLIA_URL || '',
      accounts: getPrivateKey() ? [getPrivateKey()] : []
    }
  }
};
