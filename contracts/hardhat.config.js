require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const ZIRCUIT_PRIVATE_KEY = "0a5ddc6cfa8e084c6503c18fa85dc9d45e804df0edc55c7fe60ea99d5017933a";
const POLYGON_PRIVATE_KEY = "ff79176574c3e9cd6e4f3d161c7a5d57227c5a0320018e59a68f85326a4c5840"
module.exports = {
  solidity: "0.8.20",
  networks: {
    zircuit: {
      url: "https://garfield-testnet.zircuit.com/",
      accounts: [ZIRCUIT_PRIVATE_KEY]
    },
    polygonAmoy: {
      url: "https://rpc-amoy.polygon.technology",
      accounts: [POLYGON_PRIVATE_KEY],
      chainId: 80002
    }
  }
};