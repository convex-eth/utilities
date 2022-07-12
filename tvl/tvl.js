const {
    ethers
} = require("ethers");
const jsonfile = require('jsonfile');
const {
    CRV_ABI,
    REGISTRY_ABI,
    BOOSTER_ABI,
    MULTICALL_ABI,
    SWAP_ABI,
    FOREX_PRICE_ABI
} = require('./abi');
var BN = require('big-number');
const { default: got } = require("got/dist/source");

const config = jsonfile.readFileSync('./config.json');

//Setup ethers providers
var provider;
if(config.USE_PROVIDER == "infura"){
    provider = new ethers.providers.InfuraProvider(config.NETWORK, config.INFURA_KEY);
}else if(config.USE_PROVIDER == "alchemy"){
    provider = new ethers.providers.AlchemyProvider (config.NETWORK, config.ALCHEMY_KEY);
}else{
    provider = new ethers.providers.JsonRpcProvider(config.GETH_NODE, config.NETWORK);
}

const addressZero = "0x0000000000000000000000000000000000000000"
const boosterAddress = "0xF403C135812408BFbE8713b5A23a04b3D48AAE31";
const currentRegistryAddress = "0x90E00ACe148ca3b23Ac1bC8C240C2a7Dd9c2d7f5";
const cvxAddress = "0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B";
const cvxRewardsAddress = "0xCF50b810E57Ac33B91dCF525C6ddd9881B139332";
const cvxcrvAddress = "0x62B9c7356A2Dc64a1969e19C23e4f579F9810Aa7";

const boosterInstance = new ethers.Contract(boosterAddress, BOOSTER_ABI, provider);

const cvxRewardsInstance = new ethers.Contract(cvxRewardsAddress, CRV_ABI, provider);

const cvxcrvInstance = new ethers.Contract(cvxcrvAddress, CRV_ABI, provider);

const multicallInstance = new ethers.Contract("0x5e227AD1969Ea493B43F840cfF78d08a6fc17796", MULTICALL_ABI, provider);

const fixedForexPriceContract = new ethers.Contract("0x5C08bC10F45468F18CbDC65454Cbd1dd2cB1Ac65", FOREX_PRICE_ABI, provider);

var precomputePrices = [
    "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    "0xfE18be6b3Bd88A2D2A7f928d00292E7a9963CfC6",
    "0xeb4c2781e4eba804ce9a9803c67d0893436bb27d",
    "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    "0xdac17f958d2ee523a2206206994597c13d831ec7",
    "0x6b175474e89094c44da98b954eedeac495271d0f",
    "0x57Ab1ec28D129707052df4dF418D58a2D46d5f51",
    "0x6c3f90f043a72fa612cbac8115ee7e52bde6e490",
    cvxAddress,
    cvxcrvAddress,
]

var fixedForexTokens = [
    "0x5555f75e3d5278082200Fb451D1b6bA946D8e13b", //jpy
    "0x69681f8fde45345C3870BCD5eaf4A05a60E7D227", //gbp
    "0xfafdf0c4c1cb09d430bf88c75d88bb46dae09967", //aud
    "0x96e61422b6a9ba0e068b6c5add4ffabc6a4aae27", //eur
    "0x1cc481ce2bd2ec7bf67d1be64d4878b16078f309", //chf
    "0x95dfdc8161832e4ff7816ac4b6367ce201538253", //kwr
]

var allCoins = {};

const getTVL = async () => {
    var poolSum = {};
    var coinPrices = {};
    var snapshotBlock = await provider.getBlockNumber();
    console.log('snapshotBlock block:' + snapshotBlock)


    for(var i in precomputePrices){
        coinPrices[precomputePrices[i].toLowerCase()] = await coingeckoPrice(precomputePrices[i]);
    }

    for(var i in fixedForexTokens){
        var price = await fixedForexPriceContract.price(fixedForexTokens[i]);
        coinPrices[fixedForexTokens[i].toLowerCase()] = Number(price.toString()) / 1e18;
    }
    console.log(coinPrices);

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

    await Promise.all([...Array(Number(poolLength)).keys()].map(async i => {
        // console.log("getting supplies and balances for pool " + i + "...");

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
        console.log("pool address: " +pool);

        var coins = [];
        var decimals = [];
        var balances = [];

        if(pool == addressZero){
            console.log("pool " +i +" not in registry yet.")

            var swapContract = new ethers.Contract(poolInfo[i].lptoken, SWAP_ABI, provider);
            // var swapInstance = swapContract.connect(provider);
            

            //get coins
            for(var c=0; c < 10; c++){
                try{
                    var coin = await swapContract.coins(c);
                    coins.push(coin);
                }catch(error){
                    //console.log("error: " +error);
                    break;
                }
            }
            if(coins.length == 0){
                return;
            }
            for(var d=0; d < coins.length; d++){
                try{
                    var tokenContract = new ethers.Contract(coins[d], CRV_ABI, provider);
                    // var tokenInstance = tokenContract.connect(provider);
    
                    var dec = await tokenContract.decimals();
                    decimals.push(dec);
    
                    var bal = await tokenContract.balanceOf(poolInfo[i].lptoken);
                    balances.push(bal);
                } catch(ex) {
                    console.log('\n handle exception address=', coins[d], ' continue querying')
                    decimals.push(0);
                    balances.push(0);
                }
                
            }

            // console.log(coins);
            // console.log(decimals);
            // console.log(balances);

        }else{
            //get data from registry
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
            balances = registryiface.decodeFunctionResult("get_underlying_balances(address)", returnData[1][2])[0];
            var underlyingDecimals = registryiface.decodeFunctionResult("get_underlying_decimals(address)", returnData[1][3])[0];
            var mainDecimals = registryiface.decodeFunctionResult("get_decimals(address)", returnData[1][4])[0];


            //there is a pool with 0 for underlying decimals, revert to normal decimals
            
            for (var d = 0; d < underlyingDecimals.length; d++) {
                if (underlyingDecimals[d].toString() == "0") {
                    decimals.push(mainDecimals[d])
                } else {
                    decimals.push(underlyingDecimals[d]);
                }
            }

            //fix some other discrepancies         
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
                if (maincoins[c] == "0xdAC17F958D2ee523a2206206994597C13D831ec7" || maincoins[c] == "0xC581b735A1688071A1746c968e0798D642EDE491") { //usdt
                    decimals[c] = 6;
                }
                if (underlyingcoins[c] == "0xD71eCFF9342A5Ced620049e616c5035F1dB98620") {
                    decimals[c] = 18;
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
            var coinPrice = 0;

            if (coinPrices[coins[c].toLowerCase()] == undefined) {
                coinPrice = await coingeckoPrice(coins[c]);
                coinPrices[coins[c].toLowerCase()] = coinPrice;
            } else {
                coinPrice = coinPrices[coins[c].toLowerCase()];
            }
            
            if (poolSum[i] == undefined) {
                poolSum[i] = formattedBalances[c] * coinPrice;
            } else {
                poolSum[i] = poolSum[i] + (formattedBalances[c] * coinPrice);
            }
        }

    }));

    console.log("finish querying supplies and balances for pool")

    //staked cvx
    var cvxStakedSupply = await cvxRewardsInstance.totalSupply({
        blockTag: snapshotBlock
    });
    var formattedCvx = new BN(cvxStakedSupply.toString()).multiply(1e5).divide(Math.pow(10, 18).toString());
    stakedCvxPrice = Number(formattedCvx) / 1e5 * coinPrices[cvxAddress.toLowerCase()];

    //cvxcrv
    var cvxcrvSupply = await cvxcrvInstance.totalSupply({
        blockTag: snapshotBlock
    });
    var formattedCvxCrv = new BN(cvxcrvSupply.toString()).multiply(1e5).divide(Math.pow(10, 18).toString());
    stakedCvxCrvPrice = Number(formattedCvxCrv) / 1e5 * coinPrices[cvxcrvAddress.toLowerCase()];

    console.log(poolSum);
    console.log("staked cvx: " +stakedCvxPrice);
    console.log("staked cvxcrv: " +stakedCvxCrvPrice);

    var totalusd = 0;
    for (i in poolSum) {
        totalusd += (Number(poolSum[i]) / 1e6);
    }
    totalusd += (Number(stakedCvxPrice) / 1e6);
    totalusd += (Number(stakedCvxCrvPrice) / 1e6);
    console.log("total usd: " + totalusd + " m");

    return poolSum;
}
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const coingeckoPrice = async (coinAddress) => {
    if (coinAddress == "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE") {
        var url = "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=USD";
    } else {
        var url = "https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=" + coinAddress + "&vs_currencies=USD";
    }
    try{
        //console.log("get price: " +url);
        var response = await got(url);
        var data = JSON.parse(response.body);
        if (data.ethereum != undefined) {
            return Number(data.ethereum.usd);
        } else {
            if(data[coinAddress.toLowerCase()] == undefined
                || data[coinAddress.toLowerCase()].usd == undefined){
                return Number(0);
            }
            return Number(data[coinAddress.toLowerCase()].usd);
        }
    }catch(error){

        //TODO: seed a price list at the start for common tokens

        console.log("coingecko error, waiting 1 min..." +url);
        await delay(60000);
        console.log("...retry now");
        var retry = await coingeckoPrice(coinAddress);
        return retry;
    }
}

getTVL();