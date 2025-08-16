require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const ZIRCUIT_PRIVATE_KEY = "0x0a5ddc6cfa8e084c6503c18fa85dc9d45e804df0edc55c7fe60ea99d5017933a";

module.exports = {
  solidity: "0.8.20",
  networks: {
    zircuit: {
      url: "https://garfield-testnet.zircuit.com/",
      accounts: [ZIRCUIT_PRIVATE_KEY]
    },
    polygonAmoy: {
      url: "https://rpc-amoy.polygon.technology",
      accounts: [ZIRCUIT_PRIVATE_KEY],
      chainId: 80002
    }
  }
};