const fs = require('fs');
const {
    ethers
} = require("ethers");
const jsonfile = require('jsonfile');
var axios = require('axios');
const {
    CRV_ABI,
    REGISTRY_ABI,
    BOOSTER_ABI,
    MULTICALL_ABI
} = require('./abi');
var BN = require('big-number');

const config = jsonfile.readFileSync('./config.json');

//Setup ethers providers
const provider = new ethers.providers.InfuraProvider(config.NETWORK, config.INFURA_KEY);
//const provider = new ethers.providers.AlchemyProvider (config.NETWORK, config.ALCHEMY_KEY);
//const provider = new ethers.providers.JsonRpcProvider(config.GETH_NODE, config.NETWORK);


const boosterAddress = "0xF403C135812408BFbE8713b5A23a04b3D48AAE31";
const currentRegistryAddress = "0x90E00ACe148ca3b23Ac1bC8C240C2a7Dd9c2d7f5";
const cvxAddress = "0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B";
const cvxRewardsAddress = "0xCF50b810E57Ac33B91dCF525C6ddd9881B139332";
const cvxcrvAddress = "0x62B9c7356A2Dc64a1969e19C23e4f579F9810Aa7";

const boosterContract = new ethers.Contract(boosterAddress, BOOSTER_ABI, provider);
const boosterInstance = boosterContract.connect(provider);

const cvxRewardsContract = new ethers.Contract(cvxRewardsAddress, CRV_ABI, provider);
const cvxRewardsInstance = cvxRewardsContract.connect(provider);

const cvxcrvContract = new ethers.Contract(cvxcrvAddress, CRV_ABI, provider);
const cvxcrvInstance = cvxcrvContract.connect(provider);

const multicallContract = new ethers.Contract("0x5e227AD1969Ea493B43F840cfF78d08a6fc17796", MULTICALL_ABI, provider);
const multicallInstance = multicallContract.connect(provider);


var allCoins = {};

const main = async () => {
    var snapshotBlock = await provider.getBlockNumber();
    console.log('snapshotBlock block:' + snapshotBlock)

    let boosteriface = new ethers.utils.Interface(BOOSTER_ABI);
    var poolLength = await boosterInstance.poolLength({
        blockTag: snapshotBlock
    });
    var poolInfo = [];
    calldata = [];
    for (var i = 0; i < poolLength; i++) {
        calldata.push([boosterAddress, boosteriface.encodeFunctionData("poolInfo(uint256)", [i])]);
    }
    var returnData = await multicallInstance.aggregate(calldata, {
        blockTag: snapshotBlock
    });
    for (var i = 0; i < poolLength; i++) {
        var pdata = boosteriface.decodeFunctionResult("poolInfo(uint256)", returnData[1][i]);
        poolInfo.push(pdata);
    }

    let registryiface = new ethers.utils.Interface(REGISTRY_ABI);
    let tokeniface = new ethers.utils.Interface(CRV_ABI);

    for (var i = 0; i < poolInfo.length; i++) {
        console.log("getting supplies and balances for pool " + i + "...");

        calldata = [];
        calldata.push([poolInfo[i].token, tokeniface.encodeFunctionData("totalSupply()", [])]);
        calldata.push([poolInfo[i].lptoken, tokeniface.encodeFunctionData("totalSupply()", [])]);
        calldata.push([currentRegistryAddress, registryiface.encodeFunctionData("get_pool_from_lp_token(address)", [poolInfo[i].lptoken])]);
        var returnData = await multicallInstance.aggregate(calldata, {
            blockTag: snapshotBlock
        });

        var convexsupply = tokeniface.decodeFunctionResult("totalSupply()", returnData[1][0])[0];
        var totalsupply = tokeniface.decodeFunctionResult("totalSupply()", returnData[1][1])[0];
        var pool = registryiface.decodeFunctionResult("get_pool_from_lp_token(address)", returnData[1][2])[0];

        //console.log("convexsupply: " +convexsupply);
        //console.log("totalsupply: " +totalsupply);
        var share = new BN(convexsupply.toString()).multiply(1e18).divide(totalsupply.toString());
        share = Number(share) / 1e18;
        //console.log("share: " +share);
        //console.log("pool address: " +pool);

        calldata = [];
        calldata.push([currentRegistryAddress, registryiface.encodeFunctionData("get_underlying_coins(address)", [pool])]);
        calldata.push([currentRegistryAddress, registryiface.encodeFunctionData("get_coins(address)", [pool])]);
        calldata.push([currentRegistryAddress, registryiface.encodeFunctionData("get_underlying_balances(address)", [pool])]);
        calldata.push([currentRegistryAddress, registryiface.encodeFunctionData("get_underlying_decimals(address)", [pool])]);
        calldata.push([currentRegistryAddress, registryiface.encodeFunctionData("get_decimals(address)", [pool])]);

        var returnData = await multicallInstance.aggregate(calldata, {
            blockTag: snapshotBlock
        });
        var underlyingcoins = registryiface.decodeFunctionResult("get_underlying_coins(address)", returnData[1][0])[0];
        var maincoins = registryiface.decodeFunctionResult("get_coins(address)", returnData[1][1])[0];
        var balances = registryiface.decodeFunctionResult("get_underlying_balances(address)", returnData[1][2])[0];
        var underlyingDecimals = registryiface.decodeFunctionResult("get_underlying_decimals(address)", returnData[1][3])[0];
        var mainDecimals = registryiface.decodeFunctionResult("get_decimals(address)", returnData[1][4])[0];


        //there is a pool with 0 for underlying decimals, revert to normal decimals
        var decimals = [];
        for (var d = 0; d < underlyingDecimals.length; d++) {
            if (underlyingDecimals[d].toString() == "0") {
                decimals.push(mainDecimals[d])
            } else {
                decimals.push(underlyingDecimals[d]);
            }
        }

        //fix some other discrepancies         
        var coins = [];
        for (var c = 0; c < underlyingcoins.length; c++) {

            //there are pools (ex. ren) that return underlying coins of 0x0 address. replace those with normal coin address
            if (underlyingcoins[c] == "0x0000000000000000000000000000000000000000") {
                coins.push(maincoins[c]);
            } else {
                coins.push(underlyingcoins[c]);
            }

            //balances returned do not always match the decimals returns
            if (maincoins[c] == "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643") { //cDai
                decimals[c] = 18;
            }
            if (maincoins[c] == "0x39AA39c021dfbaE8faC545936693aC917d5E7563") { //cUsdc
                decimals[c] = 18;
            }
            if (maincoins[c] == "0xdAC17F958D2ee523a2206206994597C13D831ec7") { //usdt
                decimals[c] = 6;
            }
            if (pool == "0x45F783CCE6B7FF23B2ab2D70e416cdb7D6055f51" //ypool
                ||
                pool == "0x79a8C46DeA5aDa233ABaFFD40F3A0A2B1e5A4F27" //busd
                ||
                pool == "0x06364f10B501e868329afBc005b3492902d6C763" //pax
                ||
                pool == "0x2dded6Da1BF5DBdF597C45fcFaa3194e53EcfeAF" //iron
                ||
                pool == "0xDeBF20617708857ebe4F679508E7b7863a8A8EeE" //aave
                ||
                pool == "0xEB16Ae0052ed37f479f7fe63849198Df1765a733" //saave
            ) {
                decimals[c] = 18;
            }
        }

        //format decimals
        var formattedBalances = [];
        for (var b = 0; b < balances.length; b++) {
            var dec = Math.pow(10, Number(decimals[b]));
            var formattedBal = new BN(balances[b].toString()).multiply(1e5).divide(dec.toString());
            formattedBal = Number(formattedBal) / 1e5;
            formattedBal *= share;
            formattedBalances.push(formattedBal);
        }

        //sum pools together
        for (var c = 0; c < coins.length; c++) {
            if (coins[c] == "0x0000000000000000000000000000000000000000") break;

            if (allCoins[coins[c]] == undefined) {
                allCoins[coins[c]] = formattedBalances[c];
            } else {
                allCoins[coins[c]] = allCoins[coins[c]] + formattedBalances[c];
            }
        }
    }


    //staked cvx
    var cvxStakedSupply = await cvxRewardsInstance.totalSupply({
        blockTag: snapshotBlock
    });
    var formattedCvx = new BN(cvxStakedSupply.toString()).multiply(1e5).divide(Math.pow(10, 18).toString());
    allCoins[cvxAddress] = Number(formattedCvx) / 1e5;

    //cvxcrv
    var cvxcrvSupply = await cvxcrvInstance.totalSupply({
        blockTag: snapshotBlock
    });
    var formattedCvxCrv = new BN(cvxcrvSupply.toString()).multiply(1e5).divide(Math.pow(10, 18).toString());
    allCoins[cvxcrvAddress] = Number(formattedCvxCrv) / 1e5;


    console.log(allCoins);
    var keys = Object.keys(allCoins);
    var usdvalues = {};
    for (var i = 0; i < keys.length; i++) {
        console.log("getting price for " + keys[i]);
        if (keys[i] == "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE") {
            var url = "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=USD";
        } else {
            var url = "https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=" + keys[i] + "&vs_currencies=USD";
        }
        await axios.get(url)
            .then(response => {
                if (response.data.ethereum != undefined) {
                    usdvalues[keys[i]] = allCoins[keys[i]] * Number(response.data.ethereum.usd);
                } else {
                    usdvalues[keys[i]] = allCoins[keys[i]] * Number(response.data[keys[i].toLowerCase()].usd);
                }

            })
            .catch(error => {
                console.log(error);
            });
    }
    //console.log(usdvalues);
    var totalusd = 0;
    for (value in usdvalues) {
        totalusd += (Number(usdvalues[value]) / 1e6);
    }
    console.log("total usd: " + totalusd + "m");
}

main();