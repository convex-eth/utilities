var ETHERSCAN_KEY = "INSERT_KEY_HERE";



/// ------ Balances ------- ///

function convexBalance(poolName, address) {
    var pool = pools.find(pool => pool.name == poolName)
    
    var bal = convexBASE(address, pool)
    if (isNaN(bal)) {
        Utilities.sleep(randomInt(500, 2000));
        return convexBalance(poolName, address);
    }
    return bal;
}

function convexStakedCVX(address) {
    var stakeContract = "0xCF50b810E57Ac33B91dCF525C6ddd9881B139332";
    var balance = balanceOf(address, stakeContract, 18);
    if (isNaN(balance)) {
        Utilities.sleep(randomInt(500, 1000));
        return convexStakedCVX(address);
    }
    return balance;
}

function convexStakedCvxCRV(address) {
    var stakeContract = "0x3Fe65692bfCD0e6CF84cB1E7d24108E434A7587e";
    var balance = balanceOf(address, stakeContract, 18);
    if (isNaN(balance)) {
        Utilities.sleep(randomInt(500, 1000));
        return convexStakedCvxCRV(address);
    }
    return balance;
}

function convexLpCVXETH(address) {
    var balance = masterChefBalance(address, 1);
    if (isNaN(balance)) {
        Utilities.sleep(randomInt(500, 1000));
        return convexLpCVXETH(address);
    }
    return balance;
}

function convexLpCvxCRVCRV(address) {
    var balance = masterChefBalance(address, 2);
    if (isNaN(balance)) {
        Utilities.sleep(randomInt(500, 1000));
        return convexLpCvxCRVCRV(address);
    }
    return balance;
}

//// ----------- APRs ----------- ///

function convexAPR(poolName) {
    return convexAPRWithPrice(poolName, -1, -1);
}

function convexAPRWithPrice(poolName, crvPrice, cvxPrice) {
    var pool = pools.find(pool => pool.name == poolName)
    var curveSwap = pool.swap;
    var stakeContract = pool.crvRewards;

    //get reward rate
    var rate = rewardRate(stakeContract);

    //get virtual price
    var virtualPrice = 1;
    if(pool.isV2 == undefined || pool.isV2 == false){
      virtualPrice = curveLpValue(1, curveSwap);
    }else{
      virtualPrice = curveV2LpValue(pool,pool.currency);
    }

    //get supply
    var supply = supplyOf(stakeContract);

    //virtual supply
    supply = supply * virtualPrice;

    //crv per underlying per second
    var crvPerUnderlying = rate / supply;

    //crv per year
    var crvPerYear = crvPerUnderlying * 86400 * 365;
    var cvxPerYear = getCVXMintAmount(crvPerYear);

    if (cvxPrice <= 0)
        cvxPrice = getPrice(cvxAddress, pool.currency);

    if (crvPrice <= 0)
        crvPrice = getPrice(crvAddress, pool.currency);

    var apr = (crvPerYear * crvPrice);
    apr += (cvxPerYear * cvxPrice);
    if (pool.extras != undefined && pool.extras.length > 0) {
        for (var i in pool.extras) {
            var ex = pool.extras[i];
            var exrate = rewardRate(ex.contract);
            var perUnderlying = exrate / supply;
            var perYear = perUnderlying * 86400 * 365;
            var price = getPrice(ex.token, pool.currency);
            apr += (perYear * price);
        }
    }

    if (isNaN(apr)) {
        Utilities.sleep(randomInt(500, 1000));
        return convexAPRWithPrice(poolName, crvPrice, cvxPrice);
    }

    return apr;
}


//staked CVX APR
function convexStakedCVXAPR() {
    var stakeContract = "0xCF50b810E57Ac33B91dCF525C6ddd9881B139332";
    var rate = rewardRate(stakeContract);
    var supply = supplyOf(stakeContract);
    var cvxPrice = getPrice(cvxAddress, "USD");
    supply *= cvxPrice;
    rate /= supply;

    var crvPerYear = rate * 86400 * 365;
    var crvPrice = getPrice(crvAddress, "USD");
    var apr = crvPerYear * crvPrice;

    if (isNaN(apr)) {
        Utilities.sleep(randomInt(500, 1000));
        return convexStakedCVXAPR();
    }
    return apr;
}


//staked cvxCRV apr
function convexStakedCvxCRVAPR() {
    var stakeContract = "0x3Fe65692bfCD0e6CF84cB1E7d24108E434A7587e";
    var theepoolstakeContract = "0x7091dbb7fcbA54569eF1387Ac89Eb2a5C9F6d2EA";
    var curveSwap = "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7";

    var rate = rewardRate(stakeContract);
    var threerate = rewardRate(theepoolstakeContract);
    var supply = supplyOf(stakeContract);

    var virtualPrice = curveLpValue(1, curveSwap);
    var crvPrice = getPrice(crvAddress, "USD");
    var cvxPrice = getPrice(cvxAddress, "USD");

    supply *= crvPrice;
    rate /= supply;
    threerate /= supply;

    var crvPerYear = rate * 86400 * 365;
    var cvxPerYear = getCVXMintAmount(crvPerYear);
    var threepoolPerYear = threerate * 86400 * 365;

    var apr = (crvPerYear * crvPrice) + (cvxPerYear * cvxPrice) + (threepoolPerYear * virtualPrice);

    if (isNaN(apr)) {
        Utilities.sleep(randomInt(500, 1000));
        return convexStakedCvxCRVAPR();
    }
    return apr;
}

function convexLpCVXETHAPR() {

    var stakeContract = "0x9e01aaC4b3e8781a85b21d9d9F848e72Af77B362";
    var rate = rewardRate(stakeContract);
    var supply = supplyOf(stakeContract);
    var slpBalance = balanceOf("0x05767d9EF41dC40689678fFca0608878fb3dE906", cvxAddress, 18);
    var slpSupply = supplyOf("0x05767d9EF41dC40689678fFca0608878fb3dE906");
    var slpBToS = (slpBalance * 2) / slpSupply; //approx value of slp in cvx terms by multiplying cvx balance by 2

    supply *= slpBToS;
    var cvxPrice = getPrice(cvxAddress, "USD");

    supply = supply * cvxPrice;
    rate /= supply;

    var cvxPerYear = rate * 86400 * 365;

    var apr = (cvxPerYear * cvxPrice);

    var totalAlloc = totalAllocPoint();
    var info = poolInfo(1);
    var alloc = info.result.slice(130);
    alloc = parseInt(alloc, 16)

    var sushiRate = sushiPerBlock() * (alloc / totalAlloc);

    var sushiPrice = getPrice("0x6B3595068778DD592e39A122f4f5a5cF09C90fE2", "USD");

    sushiRate /= supply;
    var sushiPerYear = sushiRate * 6400 * 365;
    var sushiApr = (sushiPerYear * sushiPrice);
    //Logger.log("sushi apr: " +sushiApr);

    apr += sushiApr;

    //TODO: base trade fees

    if (isNaN(apr)) {
        Utilities.sleep(randomInt(500, 1000));
        return convexLpCVXETHAPR();
    }

    Logger.log("cvx slp apr: " + apr);
    return apr;
}

function convexLpcvxCRVCRVAPR() {

    var stakeContract = "0x1FD97b5E5a257B0B9b9A42A96BB8870Cbdd1Eb79";
    var rate = rewardRate(stakeContract);
    var supply = supplyOf(stakeContract);
    var slpBalance = balanceOf("0x33F6DDAEa2a8a54062E021873bCaEE006CdF4007", cvxCrvAddress, 18);
    var slpSupply = supplyOf("0x33F6DDAEa2a8a54062E021873bCaEE006CdF4007");
    var slpBToS = (slpBalance * 2) / slpSupply; //approx value of slp in cvxcrv terms by multiplying cvxcrv balance by 2

    supply *= slpBToS;
    var cvxcrvPrice = getPrice(cvxCrvAddress, "USD");
    var cvxPrice = getPrice(cvxAddress, "USD");

    supply = supply * cvxcrvPrice;
    rate /= supply;

    var cvxPerYear = rate * 86400 * 365;

    var apr = (cvxPerYear * cvxPrice);
    //Logger.log("cvx apr: " +apr);

    var totalAlloc = totalAllocPoint();
    var info = poolInfo(1);
    var alloc = info.result.slice(130);
    alloc = parseInt(alloc, 16)

    var sushiRate = sushiPerBlock() * (alloc / totalAlloc);

    var sushiPrice = getPrice("0x6B3595068778DD592e39A122f4f5a5cF09C90fE2", "USD");

    sushiRate /= supply;
    var sushiPerYear = sushiRate * 6400 * 365;
    var sushiApr = (sushiPerYear * sushiPrice);
    //Logger.log("sushi apr: " +sushiApr);

    apr += sushiApr;

    //TODO: base trade fees

    if (isNaN(apr)) {
        Utilities.sleep(randomInt(500, 1000));
        return convexLpcvxCRVCRVAPR();
    }

    Logger.log("cvxcrv slp apr: " + apr);
    return apr;
}

////--------------- Util  -------------------///

let crvAddress = "0xD533a949740bb3306d119CC777fa900bA034cd52";
let cvxAddress = "0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B";
let cvxCrvAddress = "0x62B9c7356A2Dc64a1969e19C23e4f579F9810Aa7";

let cliffSize = 100000; // * 1e18; //new cliff every 100,000 tokens
let cliffCount = 1000; // 1,000 cliffs
let maxSupply = 100000000; // * 1e18; //100 mil max supply

function getCVXMintAmount(crvEarned) {
    //first get total supply
    var cvxSupply = supplyOf(cvxAddress);
    //get current cliff
    var currentCliff = cvxSupply / cliffSize;
    //if current cliff is under the max
    if (currentCliff < cliffCount) {
        //get remaining cliffs
        var remaining = cliffCount - currentCliff;

        //multiply ratio of remaining cliffs to total cliffs against amount CRV received
        var cvxEarned = crvEarned * remaining / cliffCount;

        //double check we have not gone over the max supply
        var amountTillMax = maxSupply - cvxSupply;
        if (cvxEarned > amountTillMax) {
            cvxEarned = amountTillMax;
        }
        return cvxEarned;
    }
    return 0;
}

function convertRate(rewards, compareTo) {
    var crvRate = getPrice(crvAddress, compareTo);
    var cvxRate = getPrice(cvxAddress, compareTo);

    rewards[0] = (rewards[0] * crvRate);
    rewards[1] = (rewards[1] * cvxRate);
    return rewards[0] + rewards[1];
}

function balanceOf(address, contract, decimals) {
    var balanceOfHex = "70a08231";
    address = padHex(address);
    var url = "https://api.etherscan.io/api?module=proxy&action=eth_call&to=" + contract + "&data=0x" + balanceOfHex + address + "&tag=latest&apikey=" + ETHERSCAN_KEY;
    var response = UrlFetchApp.fetch(url);
    var json = response.getContentText();
    var data = JSON.parse(json);
    // var hexValue = data.result;
    // var decimal = Math.pow(10,18);
    var balance = Number(data.result) / Math.pow(10, decimals);

    return balance;
}

function earned(address, contract) {
    var earned = "008cc262";
    address = padHex(address);
    var url = "https://api.etherscan.io/api?module=proxy&action=eth_call&to=" + contract + "&data=0x" + earned + address + "&tag=latest&apikey=" + ETHERSCAN_KEY;
    var response = UrlFetchApp.fetch(url);
    var json = response.getContentText();
    var data = JSON.parse(json);
    var hexValue = data.result;
    var decimal = Math.pow(10, 18);
    var supply = parseInt(hexValue, 16) / decimal;
    return supply;
}

function supplyOf(contract) {
    var totalSupply = "18160ddd";
    var url = "https://api.etherscan.io/api?module=proxy&action=eth_call&to=" + contract + "&data=0x" + totalSupply + "&tag=latest&apikey=" + ETHERSCAN_KEY;
    var response = UrlFetchApp.fetch(url);
    var json = response.getContentText();
    var data = JSON.parse(json);
    var hexValue = data.result;
    var decimal = Math.pow(10, 18);
    var supply = parseInt(hexValue, 16) / decimal;
    return supply;
}

function curveLpValue(amount, swapAddress) {
    var virtualPriceHash = "bb7b8b80";

    var swapurl = "https://api.etherscan.io/api?module=proxy&action=eth_call&to=" + swapAddress + "&data=0x" + virtualPriceHash + "&tag=latest&apikey=" + ETHERSCAN_KEY;
    var swapresponse = UrlFetchApp.fetch(swapurl);
    var json = swapresponse.getContentText();
    var data = JSON.parse(json);
    var hexValue = data.result.slice(0, 66);
    var priceDecimal = Math.pow(10, 18);
    var pricePerShare = parseInt(hexValue, 16) / priceDecimal;

    return amount * pricePerShare;
}

function curveV2LpValue(pool, currencyType){
  //get amount of tokens
  var supply = supplyOf(pool.lptoken);
  //Logger.log("supply: " +supply);
  var total = 0;
  for(var i=0; i < pool.coins.length; i++){
    var bal = balanceOf(pool.swap,pool.coins[i],pool.coinDecimals[i])
    //Logger.log("bal: " +i +" = " +bal);
    var price = getPrice(pool.coins[i],currencyType);
    //Logger.log("price: " +i +" = " +price);
    total += (bal*price);
  }

  var value = total / supply;
  if (isNaN(value)) {
    Utilities.sleep(randomInt(500, 1000));
    return curveV2LpValue(pool,currencyType);
  }

  return value;
}

function convexBASE(address, pool) {
    var curveSwap = pool.swap;
    var depositToken = pool.token;
    var stakeContract = pool.crvRewards;

    var stakedBalance = balanceOf(address, stakeContract, 18);

    var heldBalance = balanceOf(address, depositToken, 18);

    if(pool.isV2 != undefined && pool.isV2 == true){
      return curveV2LpValue(pool,pool.currency) * (stakedBalance+heldBalance);
    }
    return curveLpValue(stakedBalance + heldBalance, curveSwap);
}


function rewardRate(contract) {
    var rewardRate = "7b0a47ee";
    var url = "https://api.etherscan.io/api?module=proxy&action=eth_call&to=" + contract + "&data=0x" + rewardRate + "&tag=latest&apikey=" + ETHERSCAN_KEY;
    var response = UrlFetchApp.fetch(url);
    var json = response.getContentText();
    var data = JSON.parse(json);
    var hexValue = data.result;
    var decimal = Math.pow(10, 18);
    var rate = parseInt(hexValue, 16) / decimal;
    return rate;
}

function totalAllocPoint() {
    var sushiChef = "0xEF0881eC094552b2e128Cf945EF17a6752B4Ec5d"
    var sig = "17caf6f1";
    var url = "https://api.etherscan.io/api?module=proxy&action=eth_call&to=" + sushiChef + "&data=0x" + sig + "&tag=latest&apikey=" + ETHERSCAN_KEY;
    var response = UrlFetchApp.fetch(url);
    var json = response.getContentText();
    var data = JSON.parse(json);
    var hexValue = data.result;
    return parseInt(hexValue, 16);
}

function sushiPerBlock() {
    var sushiChef = "0xEF0881eC094552b2e128Cf945EF17a6752B4Ec5d"
    var sig = "b0bcf42a";
    var url = "https://api.etherscan.io/api?module=proxy&action=eth_call&to=" + sushiChef + "&data=0x" + sig + "&tag=latest&apikey=" + ETHERSCAN_KEY;
    var response = UrlFetchApp.fetch(url);
    var json = response.getContentText();
    var data = JSON.parse(json);
    var hexValue = data.result;
    var decimal = Math.pow(10, 18);
    var rate = parseInt(hexValue, 16) / decimal;
    return rate;
}

function poolInfo(pid) {
    var sushiChef = "0xEF0881eC094552b2e128Cf945EF17a6752B4Ec5d"
    var sig = "1526fe27"; //poolInfo(uint256)
    pid = padHex("" + pid);
    var url = "https://api.etherscan.io/api?module=proxy&action=eth_call&to=" + sushiChef + "&data=0x" + sig + pid + "&tag=latest&apikey=" + ETHERSCAN_KEY;
    var response = UrlFetchApp.fetch(url);
    var json = response.getContentText();
    var data = JSON.parse(json);
    return data;
}


function masterChefBalance(address, pid) {
    var stakeContract = "0xEF0881eC094552b2e128Cf945EF17a6752B4Ec5d";
    address = padHex(address)
    var pidpad = padHex("" + pid);

    var userInfoHex = "93f1a40b"; //uint256,address
    var url = "https://api.etherscan.io/api?module=proxy&action=eth_call&to=" + stakeContract + "&data=0x" + userInfoHex + pidpad + address + "&tag=latest" + ETHERSCAN_KEY;
    var response = UrlFetchApp.fetch(url);
    var json = response.getContentText();
    var data = JSON.parse(json);
    var hexValue = data.result;
    var amountHex = hexValue.substring(hexValue.length - 128, 66);
    var priceDecimal = Math.pow(10, 18);
    var lpTokenBalance = parseInt(amountHex, 16) / priceDecimal;
    Logger.log(lpTokenBalance);

    var balance = 0;
    if (pid == 2) {
        var tSupply = supplyOf("0x33F6DDAEa2a8a54062E021873bCaEE006CdF4007", 18);
        var sharePerc = lpTokenBalance / tSupply;
        Logger.log("share: " + sharePerc);
        var contractTokenBalance = balanceOf("0x33F6DDAEa2a8a54062E021873bCaEE006CdF4007", "0x62B9c7356A2Dc64a1969e19C23e4f579F9810Aa7", 18);
        //var contractTokenBalanceCrv = balanceOf("0x33F6DDAEa2a8a54062E021873bCaEE006CdF4007", crvAddress, 18);
        Logger.log("cvxcrv on lp: " + contractTokenBalance);
        // Logger.log("crv on lp: " +contractTokenBalanceCrv);
        balance = contractTokenBalance * sharePerc;
        // var crvBalance = contractTokenBalanceCrv * sharePerc;
    } else if (pid == 1) {
        var tSupply = supplyOf("0x05767d9EF41dC40689678fFca0608878fb3dE906", 18);
        var sharePerc = lpTokenBalance / tSupply;
        Logger.log("share: " + sharePerc);
        var contractTokenBalance = balanceOf("0x05767d9EF41dC40689678fFca0608878fb3dE906", "0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B", 18);
        // var contractTokenBalanceWeth = balanceOf("0x05767d9EF41dC40689678fFca0608878fb3dE906", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", 18);
        Logger.log("cvx on lp: " + contractTokenBalance);
        // Logger.log("weth on lp: " +contractTokenBalanceWeth);
        balance = contractTokenBalance * sharePerc;
        //var wethBalance = contractTokenBalanceCrv * sharePerc;
    }


    return balance * 2; //can just approx value in cvx or cvxcrv by doubling

}


function padHex(hexstring, intSize = 256) {
    hexstring = hexstring.replace("0x", "");

    var length = (intSize / 4) - hexstring.length;
    for (var i = 0; i < length; i++) {
        hexstring = "0" + hexstring;
    }
    return hexstring;
}

function numberToPaddedHex(number, intSize = 256) {
    var hexstr = number.toString(16);
    return padHex(hexstr, intSize);
}

function BigNumber(number) {
    return number.toLocaleString('fullwide', {
        useGrouping: false
    })
}

function randomInt(min, max) {
    return Math.floor(min + (Math.random() * Math.floor(max - min)));
}

function getPrice(contract_address, vsCoin) {
    var url = "https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=" + contract_address + "&vs_currencies=" + vsCoin;
    Logger.log(url);
    try {
        var response = UrlFetchApp.fetch(url);
        var json = response.getContentText();
        var data = JSON.parse(json);
        if (isNaN(data[contract_address.toLowerCase()][vsCoin.toLowerCase()])) {
            Utilities.sleep(randomInt(2000, 6000));
            return getPrice(contract_address, vsCoin);
        } else {
            return data[contract_address.toLowerCase()][vsCoin.toLowerCase()];
        }
    } catch (e) {
        Utilities.sleep(randomInt(2000, 6000));
        return getPrice(contract_address, vsCoin);
    }
}



const pools = [{
        "lptoken": "0x845838DF265Dcd2c412A1Dc9e959c7d08537f8a2",
        "token": "0x32512Bee3848bfcBb7bEAf647aa697a100f3b706",
        "gauge": "0x7ca5b0a2910B33e9759DC7dDB0413949071D7575",
        "crvRewards": "0xf34DFF761145FF0B05e917811d488B441F33a968",
        "stash": "0x0000000000000000000000000000000000000000",
        "swap": "0xA2B47E3D5c44877cca798226B7B8118F9BFb7A56",
        "currency": "USD",
        "name": "compound",
        "id": 0
    },
    {
        "lptoken": "0x9fC689CCaDa600B6DF723D9E47D84d76664a1F23",
        "token": "0xA1c3492b71938E144ad8bE4c2fB6810b01A43dD8",
        "gauge": "0xBC89cd85491d81C6AD2954E6d0362Ee29fCa8F53",
        "crvRewards": "0x8B55351ea358e5Eda371575B031ee24F462d503e",
        "stash": "0x0000000000000000000000000000000000000000",
        "swap": "0x52EA46506B9CC5Ef470C5bf89f17Dc28bB35D85C",
        "currency": "USD",
        "name": "usdt",
        "id": 1
    },
    {
        "lptoken": "0xdF5e0e81Dff6FAF3A7e52BA697820c5e32D806A8",
        "token": "0x0928F6753880A03628eB0be07b77992c8af37874",
        "gauge": "0xFA712EE4788C042e2B7BB55E6cb8ec569C4530c1",
        "crvRewards": "0xd802a8351A76ED5eCd89A7502Ca615F2225A585d",
        "stash": "0x0000000000000000000000000000000000000000",
        "swap": "0x45F783CCE6B7FF23B2ab2D70e416cdb7D6055f51",
        "currency": "USD",
        "name": "ypool",
        "id": 2
    },
    {
        "lptoken": "0x3B3Ac5386837Dc563660FB6a0937DFAa5924333B",
        "token": "0x59bB786F222d3f0f00B0dA31B799Fff80D552940",
        "gauge": "0x69Fb7c45726cfE2baDeE8317005d3F94bE838840",
        "crvRewards": "0x602c4cD53a715D8a7cf648540FAb0d3a2d546560",
        "stash": "0x0000000000000000000000000000000000000000",
        "swap": "0x79a8C46DeA5aDa233ABaFFD40F3A0A2B1e5A4F27",
        "currency": "USD",
        "name": "busd",
        "id": 3
    },
    {
        "lptoken": "0xC25a3A3b969415c80451098fa907EC722572917F",
        "token": "0x11D200ef1409cecA8D6d23e6496550f707772F11",
        "gauge": "0xA90996896660DEcC6E997655E065b23788857849",
        "crvRewards": "0x22eE18aca7F3Ee920D01F25dA85840D12d98E8Ca",
        "stash": "0xD2f2B9504Ef708b9f3Bc53f1525353bAaE1B17e4",
        "swap": "0xA5407eAE9Ba41422680e2e00537571bcC53efBfD",
        "currency": "USD",
        "name": "susd",
        "extras": [{
            "contract": "0x81fCe3E10D12Da6c7266a1A169c4C96813435263",
            "token": "0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f",
            "name": "SNX"
        }],
        "id": 4
    },
    {
        "lptoken": "0xD905e2eaeBe188fc92179b6350807D8bd91Db0D8",
        "token": "0x2eA94b0d3349A284488ACF2934E494b2f58ef647",
        "gauge": "0x64E3C23bfc40722d3B649844055F1D51c1ac041d",
        "crvRewards": "0xe3DaafC8C14147d5B4A7a56F0BfdED240158e51e",
        "stash": "0x0000000000000000000000000000000000000000",
        "swap": "0x06364f10B501e868329afBc005b3492902d6C763",
        "currency": "USD",
        "name": "pax",
        "id": 5
    },
    {
        "lptoken": "0x49849C98ae39Fff122806C06791Fa73784FB3675",
        "token": "0x74b79021Ea6De3f0D1731fb8BdfF6eE7DF10b8Ae",
        "gauge": "0xB1F2cdeC61db658F091671F5f199635aEF202CAC",
        "crvRewards": "0x8E299C62EeD737a5d5a53539dF37b5356a27b07D",
        "stash": "0x0000000000000000000000000000000000000000",
        "swap": "0x93054188d876f558f4a66B2EF1d97d16eDf0895B",
        "currency": "BTC",
        "name": "ren",
        "id": 6
    },
    {
        "lptoken": "0x075b1bb99792c9E1041bA13afEf80C91a1e70fB3",
        "token": "0xbA723E335eC2939D52a2efcA2a8199cb4CB93cC3",
        "gauge": "0x705350c4BcD35c9441419DdD5d2f097d7a55410F",
        "crvRewards": "0xd727A5A6D1C7b31Ff9Db4Db4d24045B7dF0CFF93",
        "stash": "0x7B3EE538398829c96E4B187216c7aB2946A620C4",
        "swap": "0x7fC77b5c7614E1533320Ea6DDc2Eb61fa00A9714",
        "currency": "BTC",
        "name": "sbtc",
        "id": 7
    },
    {
        "lptoken": "0xb19059ebb43466C323583928285a49f558E572Fd",
        "token": "0x33c00bF8CFDf42929E0884d230A55F963221f8f3",
        "gauge": "0x4c18E409Dc8619bFb6a1cB56D114C3f592E0aE79",
        "crvRewards": "0x618BD6cBA676a46958c63700C04318c84a7b7c0A",
        "stash": "0x0000000000000000000000000000000000000000",
        "swap": "0x4CA9b3063Ec5866A4B82E437059D2C43d1be596F",
        "currency": "BTC",
        "name": "hbtc",
        "id": 8
    },
    {
        "lptoken": "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490",
        "token": "0x30D9410ED1D5DA1F6C8391af5338C93ab8d4035C",
        "gauge": "0xbFcF63294aD7105dEa65aA58F8AE5BE2D9d0952A",
        "crvRewards": "0x689440f2Ff927E1f24c72F1087E1FAF471eCe1c8",
        "stash": "0x0000000000000000000000000000000000000000",
        "swap": "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7",
        "currency": "USD",
        "name": "3pool",
        "id": 9
    },
    {
        "lptoken": "0xD2967f45c4f384DEEa880F807Be904762a3DeA07",
        "token": "0x15c2471ef46Fa721990730cfa526BcFb45574576",
        "gauge": "0xC5cfaDA84E902aD92DD40194f0883ad49639b023",
        "crvRewards": "0x7A7bBf95C44b144979360C3300B54A7D34b44985",
        "stash": "0x0000000000000000000000000000000000000000",
        "swap": "0x4f062658EaAF2C1ccf8C8e36D6824CDf41167956",
        "currency": "USD",
        "name": "gusd",
        "id": 10
    },
    {
        "lptoken": "0x5B5CFE992AdAC0C9D48E05854B2d91C73a003858",
        "token": "0xe4de776C0eA0974bfA39B8cbB9491091C8cDc1ff",
        "gauge": "0x2db0E83599a91b508Ac268a6197b8B14F5e72840",
        "crvRewards": "0x353e489311b21355461353fEC2d02B73EF0eDe7f",
        "stash": "0x0000000000000000000000000000000000000000",
        "swap": "0x3eF6A01A0f81D6046290f3e2A8c5b843e738E604",
        "currency": "USD",
        "name": "husd",
        "id": 11
    },
    {
        "lptoken": "0x97E2768e8E73511cA874545DC5Ff8067eB19B787",
        "token": "0x47941F99F4371CC26637CaEdBbd8Ba5F4bfE5149",
        "gauge": "0xC2b1DF84112619D190193E48148000e3990Bf627",
        "crvRewards": "0xa50e9071aCaD20b31cd2bbe4dAa816882De82BBe",
        "stash": "0x0000000000000000000000000000000000000000",
        "swap": "0x3E01dD8a5E1fb3481F0F589056b428Fc308AF0Fb",
        "currency": "USD",
        "name": "usdk",
        "id": 12
    },
    {
        "lptoken": "0x4f3E8F405CF5aFC05D68142F3783bDfE13811522",
        "token": "0x3689f325E88c2363274E5F3d44b6DaB8f9e1f524",
        "gauge": "0xF98450B5602fa59CC66e1379DFfB6FDDc724CfC4",
        "crvRewards": "0x4a2631d090e8b40bBDe245e687BF09e5e534A239",
        "stash": "0x0000000000000000000000000000000000000000",
        "swap": "0x0f9cb53Ebe405d49A0bbdBD291A65Ff571bC83e1",
        "currency": "USD",
        "name": "usdn",
        "id": 13
    },
    {
        "lptoken": "0x1AEf73d49Dedc4b1778d0706583995958Dc862e6",
        "token": "0xd34d466233c5195193dF712936049729140DBBd7",
        "gauge": "0x5f626c30EC1215f4EdCc9982265E8b1F411D1352",
        "crvRewards": "0xDBFa6187C79f4fE4Cda20609E75760C5AaE88e52",
        "stash": "0x2eEa402ff31c580630b8545A33EDc00881E6949c",
        "swap": "0x8474DdbE98F5aA3179B3B3F5942D724aFcdec9f6",
        "currency": "USD",
        "name": "musd",
        "id": 14
    },
    {
        "lptoken": "0xC2Ee6b0334C261ED60C72f6054450b61B8f18E35",
        "token": "0x8b876C2C02B1f2Ac6Ec207B7f2f06034A4316A87",
        "gauge": "0x4dC4A289a8E33600D8bD4cf5F6313E43a37adec7",
        "crvRewards": "0xedfCCF611D7c40F43e77a1340cE2C29EEEC27205",
        "stash": "0x3a076e8F088bFa7a43e1209B2E460927071e15F2",
        "swap": "0xC18cC39da8b11dA8c3541C598eE022258F9744da",
        "currency": "USD",
        "name": "rsv",
        "extras": [{
            "contract": "0x94C259DC4C6dF248B0b5D23C055CB7574A587d67",
            "token": "0x8762db106b2c2a0bccb3a80d1ed41273552616e8",
            "name": "rsr"
        }],
        "id": 15
    },
    {
        "lptoken": "0x64eda51d3Ad40D56b9dFc5554E06F94e1Dd786Fd",
        "token": "0x36CED690A1516861f26755b978EE62c1157CFFF9",
        "gauge": "0x6828bcF74279eE32f2723eC536c22c51Eed383C6",
        "crvRewards": "0x081A6672f07B615B402e7558a867C97FA080Ce35",
        "stash": "0x21FdcdeBf375e67219c1Bfa266BCfDaA36a2b4Fe",
        "swap": "0xC25099792E9349C7DD09759744ea681C7de2cb66",
        "currency": "BTC",
        "name": "tbtc",
        "id": 16
    },
    {
        "lptoken": "0x3a664Ab939FD8482048609f652f9a0B0677337B9",
        "token": "0x06f4fFa5C3636AaA5C30B3DB97bfd1cd9Ac24A19",
        "gauge": "0xAEA6c312f4b3E04D752946d329693F7293bC2e6D",
        "crvRewards": "0x1992b82A8cCFC8f89785129D6403b13925d6226E",
        "stash": "0x07815651B8F1c5bE84797840543F304b7F1aeC2a",
        "swap": "0x8038C01A0390a8c547446a0b2c18fc9aEFEcc10c",
        "currency": "USD",
        "name": "dusd",
        "extras": [{
            "contract": "0x666F8eEE6FD6839853993977CC86a7A51425673C",
            "token": "0x20c36f062a31865bED8a5B1e512D9a1A20AA333A",
            "name": "dfd"
        }],
        "id": 17
    },
    {
        "lptoken": "0xDE5331AC4B3630f94853Ff322B66407e0D6331E8",
        "token": "0x21Cce64289407081744F087950b9DB32906470fC",
        "gauge": "0xd7d147c6Bb90A718c3De8C0568F9B560C79fa416",
        "crvRewards": "0x2d3C90AEB11D1393CA839Afc9587515B1325D77A",
        "stash": "0x930CfB64130a90d42eD37d4616792C9dEB791faf",
        "swap": "0x7F55DDe206dbAD629C080068923b36fe9D6bDBeF",
        "currency": "BTC",
        "name": "pbtc",
        "extras": [{
            "contract": "0xAF138B29205c2246B069Ed8f0b213b205FBc14E0",
            "token": "0x89Ab32156e46F46D02ade3FEcbe5Fc4243B9AAeD",
            "name": "PNT"
        }],
        "id": 18
    },
    {
        "lptoken": "0x410e3E86ef427e30B9235497143881f717d93c2A",
        "token": "0x2E1f902b9067b5fDd7AF29ef05D4fF6212588388",
        "gauge": "0xdFc7AdFa664b08767b735dE28f9E84cd30492aeE",
        "crvRewards": "0x61D741045cCAA5a215cF4E5e55f20E1199B4B843",
        "stash": "0xd852eFBEd0f49a065194ca92c9F305DE6DdCbF35",
        "swap": "0x071c661B4DeefB59E2a3DdB20Db036821eeE8F4b",
        "currency": "BTC",
        "name": "bbtc",
        "id": 19
    },
    {
        "lptoken": "0x2fE94ea3d5d4a175184081439753DE15AeF9d614",
        "token": "0xc1C030139eEc070Ed8FD092CC8C273C638A18bBe",
        "gauge": "0x11137B10C210b579405c21A07489e28F3c040AB1",
        "crvRewards": "0xeeeCE77e0bc5e59c77fc408789A9A172A504bD2f",
        "stash": "0x9a669fb0191D977e588b20CdA3C52EDbC6c9926c",
        "swap": "0xd81dA8D904b52208541Bade1bD6595D8a251F8dd",
        "currency": "BTC",
        "name": "obtc",
        "extras": [{
            "contract": "0xAE97D3766924526084dA88ba9B2bd7aF989Bf6fC",
            "token": "0x3c9d6c1C73b31c837832c72E04D3152f051fc1A9",
            "name": "BOR"
        }],
        "id": 20
    },
    {
        "lptoken": "0x94e131324b6054c0D789b190b2dAC504e4361b53",
        "token": "0x67c4f788FEB82FAb27E3007daa3d7b90959D5b89",
        "gauge": "0x3B7020743Bc2A4ca9EaF9D0722d42E20d6935855",
        "crvRewards": "0xd4Be1911F8a0df178d6e7fF5cE39919c273E2B7B",
        "stash": "0x6249fD91fE9FF597399c1B192D5A25Cd22Eba6dd",
        "swap": "0x890f4e345B1dAED0367A877a1612f86A1f86985f",
        "currency": "USD",
        "name": "ust",
        "id": 21
    },
    {
        "lptoken": "0x194eBd173F6cDacE046C53eACcE9B953F28411d1",
        "token": "0xd7E2b9494c529b42Dea53EF6a237C16502E6A927",
        "gauge": "0x90Bb609649E0451E5aD952683D64BD2d1f245840",
        "crvRewards": "0xcB8F69E0064d8cdD29cbEb45A14cf771D904BcD3",
        "stash": "0x007Cc4b4E9d9D088a9ae0e5261995D69e93B8E4C",
        "swap": "0x0Ce6a5fF5217e38315f87032CF90686C96627CAA",
        "currency": "EUR",
        "name": "eurs",
        "id": 22
    },
    {
        "lptoken": "0xA3D87FffcE63B53E0d54fAa1cc983B7eB0b74A9c",
        "token": "0xAF1d4C576bF55f6aE493AEebAcC3a227675e5B98",
        "gauge": "0x3C0FFFF15EA30C35d7A85B85c0782D6c94e1d238",
        "crvRewards": "0x192469CadE297D6B21F418cFA8c366b63FFC9f9b",
        "stash": "0x1e6f5B8b4CAc5806D182B33A35d0fFF5F4004e86",
        "swap": "0xc5424B857f758E906013F3555Dad202e4bdB4567",
        "currency": "ETH",
        "name": "seth",
        "id": 23
    },
    {
        "lptoken": "0xFd2a8fA60Abd58Efe3EeE34dd494cD491dC14900",
        "token": "0x23F224C37C3A69A058d86a54D3f561295A93d542",
        "gauge": "0xd662908ADA2Ea1916B3318327A97eB18aD588b5d",
        "crvRewards": "0xE82c1eB4BC6F92f85BF7EB6421ab3b882C3F5a7B",
        "stash": "0x5D4CF00939aa5F7C2cEb10c88615E9bcb0dd67fa",
        "swap": "0xDeBF20617708857ebe4F679508E7b7863a8A8EeE",
        "currency": "USD",
        "name": "aave",
        "extras": [{
            "contract": "0x00469d388b06127221D6310843A43D079eb2bB18",
            "token": "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9",
            "name": "stkAave"
        }],
        "id": 24
    },
    {
        "lptoken": "0x06325440D014e39736583c165C2963BA99fAf14E",
        "token": "0x9518c9063eB0262D791f38d8d6Eb0aca33c63ed0",
        "gauge": "0x182B723a58739a9c974cFDB385ceaDb237453c28",
        "crvRewards": "0x0A760466E1B4621579a82a39CB56Dda2F4E70f03",
        "stash": "0x9710fD4e5CA524f1049EbeD8936c07C81b5EAB9f",
        "swap": "0xDC24316b9AE028F1497c275EB9192a3Ea0f67022",
        "currency": "ETH",
        "name": "steth",
        "extras": [{
            "contract": "0x008aEa5036b819B4FEAEd10b2190FBb3954981E8",
            "token": "0x5a98fcbea516cf06857215779fd812ca3bef1b32",
            "name": "LDO"
        }],
        "id": 25
    },
    {
        "lptoken": "0x02d341CcB60fAaf662bC0554d13778015d1b285C",
        "token": "0x09CCD0892b696AB21436e51588a7a7f8b649733d",
        "gauge": "0x462253b8F74B72304c145DB0e4Eebd326B22ca39",
        "crvRewards": "0xF86AE6790654b70727dbE58BF1a863B270317fD0",
        "stash": "0xd2D46004b981FdE1e4D39d0C24E1Be1e93689DD9",
        "swap": "0xEB16Ae0052ed37f479f7fe63849198Df1765a733",
        "currency": "USD",
        "name": "saave",
        "extras": [{
            "contract": "0x20165075174b51a2f9Efbf7d6D8F3c72BBc63064",
            "token": "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9",
            "name": "stkAave"
        }],
        "id": 26
    },
    {
        "lptoken": "0xaA17A236F2bAdc98DDc0Cf999AbB47D47Fc0A6Cf",
        "token": "0x7E96955b66c89B931BBDAf187740Cc0fF2602F21",
        "gauge": "0x6d10ed2cF043E6fcf51A0e7b4C2Af3Fa06695707",
        "crvRewards": "0x8798b81b0261934aa850C8de8622472bfdc143F4",
        "stash": "0x423C444589CE5dB1E6F99820A5f95b3a57976598",
        "swap": "0xA96A65c051bF88B4095Ee1f2451C2A9d43F53Ae2",
        "currency": "ETH",
        "name": "ankreth",
        "extras": [{
                "contract": "0x177252Ac74f1D77513971aA85AF7009C43EcdEe2",
                "token": "0xe0ad1806fd3e7edf6ff52fdb822432e847411033",
                "name": "onx"
            },
            {
                "contract": "0xc095Cec98a9f8Ad6D2baA282A8e6bE246f98BD25",
                "token": "0x8290333cef9e6d528dd5618fb97a76f268f3edd4",
                "name": "ankr"
            }
        ],
        "id": 27
    },
    {
        "lptoken": "0x7Eb40E450b9655f4B3cC4259BCC731c63ff55ae6",
        "token": "0x7a5dC1FA2e1B10194bD2e2e9F1A224971A681444",
        "gauge": "0x055be5DDB7A925BfEF3417FC157f53CA77cA7222",
        "crvRewards": "0x24DfFd1949F888F91A0c8341Fc98a3F280a782a8",
        "stash": "0xBE25313c53360780e03233Cc70a4409367EC15aE",
        "swap": "0x42d7025938bEc20B69cBae5A77421082407f053A",
        "currency": "USD",
        "name": "usdp",
        "id": 28
    },
    {
        "lptoken": "0x5282a4eF67D9C33135340fB3289cc1711c13638C",
        "token": "0x912EC00eaEbf3820a9B0AC7a5E15F381A1C91f22",
        "gauge": "0xF5194c3325202F456c95c1Cf0cA36f8475C1949F",
        "crvRewards": "0x3E03fFF82F77073cc590b656D42FceB12E4910A8",
        "stash": "0x3aEaAB3eF0b5a484d8A2380215eA0A64d3101A6D",
        "swap": "0x2dded6Da1BF5DBdF597C45fcFaa3194e53EcfeAF",
        "currency": "USD",
        "name": "ironbank",
        "id": 29
    },
    {
        "lptoken": "0xcee60cFa923170e4f8204AE08B4fA6A3F5656F3a",
        "token": "0xD37969740d78C94C648d74671B8BE31eF43c30aB",
        "gauge": "0xFD4D8a17df4C27c1dD245d153ccf4499e806C87D",
        "crvRewards": "0x9700152175dc22E7d1f3245fE3c1D2cfa3602548",
        "stash": "0x63201dc22e52985153E038086c448252d44Bed40",
        "swap": "0xF178C0b5Bb7e7aBF4e12A4838C7b7c5bA2C623c0",
        "currency": "LINK",
        "name": "link",
        "id": 30
    },
    {
        "lptoken": "0xEcd5e75AFb02eFa118AF914515D6521aaBd189F1",
        "token": "0x0A2eA49EB5F9e23058deffD509D13DDd553c2A19",
        "gauge": "0x359FD5d6417aE3D8D6497d9B2e7A890798262BA4",
        "crvRewards": "0x308b48F037AAa75406426dACFACA864ebd88eDbA",
        "stash": "0x12566645C209C1518BD25BdD3B0fd0bAe0910344",
        "swap": "0xEcd5e75AFb02eFa118AF914515D6521aaBd189F1",
        "currency": "USD",
        "name": "tusd",
        "id": 31
    },
    {
        "lptoken": "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B",
        "token": "0xbE0F6478E0E4894CFb14f32855603A083A57c7dA",
        "gauge": "0x72E158d38dbd50A483501c24f792bDAAA3e7D55C",
        "crvRewards": "0xB900EF131301B307dB5eFcbed9DBb50A3e209B2e",
        "stash": "0x10a63847e6cdD2b07e0a22D1f30eB037a72eB790",
        "swap": "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B",
        "currency": "USD",
        "name": "frax",
        "extras": [{
            "contract": "0xcDEC6714eB482f28f4889A0c122868450CDBF0b0",
            "token": "0x3432b6a60d23ca0dfca7761b7ab56459d9c964d0",
            "name": "FXS"
        }],
        "id": 32
    },
    {
        "lptoken": "0xEd279fDD11cA84bEef15AF5D39BB4d4bEE23F0cA",
        "token": "0xFB9B2f06FDb404Fd3E2278E9A9edc8f252F273d0",
        "gauge": "0x9B8519A9a00100720CCdC8a120fBeD319cA47a14",
        "crvRewards": "0x2ad92A7aE036a038ff02B96c88de868ddf3f8190",
        "stash": "0x06D972728A9d05CA6F27EDc01e20b50A60b1Deed",
        "swap": "0xEd279fDD11cA84bEef15AF5D39BB4d4bEE23F0cA",
        "currency": "USD",
        "extras": [{
            "contract": "0x55d59b791f06dc519B176791c4E037E8Cf2f6361",
            "token": "0x6DEA81C8171D0bA574754EF6F8b412F2Ed88c54D",
            "name": "LQTY"
        }],
        "name": "lusd",
        "id": 33
    },
    {
        "lptoken": "0x4807862AA8b2bF68830e4C8dc86D0e9A998e085a",
        "token": "0x02D784f98A312aF3e2771297Feff1Da8273e4F29",
        "gauge": "0xd4B22fEdcA85E684919955061fDf353b9d38389b",
        "crvRewards": "0xbD223812d360C9587921292D0644D18aDb6a2ad0",
        "stash": "0xBE3ED241c90F39cC50450C4937523FCC8d3e9bbc",
        "swap": "0x4807862AA8b2bF68830e4C8dc86D0e9A998e085a",
        "currency": "USD",
        "name": "busdv2",
        "id": 34
    },
    {
        "lptoken": "0x53a901d48795C58f485cBB38df08FA96a24669D5",
        "token": "0x7ADd8D0E923CB692DF6bC65d96d510f0E2fC37af",
        "gauge": "0x824F13f1a2F29cFEEa81154b46C0fc820677A637",
        "crvRewards": "0x61dB6c2321f784c8fAb8d5eF80f58F27C831dCc8",
        "stash": "0x644C8d1eD4b6aA68738a93C5c13c7fC19e126587",
        "swap": "0xF9440930043eb3997fc70e1339dBb11F341de7A8",
        "currency": "ETH",
        "extras": [{
            "contract": "0x681A790debE586A64eea055BF0983CD6629d8359",
            "token": "0xef3A930e1FfFFAcd2fc13434aC81bD278B0ecC8d",
            "name": "FIS"
        }],
        "name": "reth",
        "id": 35
    },
    {
        "lptoken": "0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c",
        "token": "0xCA3D9F45FfA69ED454E66539298709cb2dB8cA61",
        "gauge": "0x9582C4ADACB3BCE56Fea3e590F05c3ca2fb9C477",
        "crvRewards": "0x02E2151D4F351881017ABdF2DD2b51150841d5B3",
        "stash": "0x521e6EEfDa35f7228f8f83462552bDB41D64d86B",
        "swap": "0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c",
        "currency": "USD",
        "extras": [{
            "contract": "0xd731495bb78a4250bC094686788F3fF890dEe0f4",
            "token": "0xdbdb4d16eda451d0503b854cf79d55697f90c8df",
            "name": "ALCX"
        }],
        "name": "alusd",
        "id": 36
    },
    {
      "lptoken": "0xcA3d75aC011BF5aD07a98d02f18225F9bD9A6BDF",
      "token": "0x18684099414dcEF486F4FA5b4e44e6eA53C8c554",
      "gauge": "0x6955a55416a06839309018A8B0cB72c4DDC11f15",
      "crvRewards": "0x5Edced358e6C0B435D53CC30fbE6f5f0833F404F",
      "stash": "0x35e86E54eCb0227fe33382c35E12856cF227E9ce",
      "swap": "0x80466c64868E1ab14a1Ddf27A676C3fcBE638Fe5",
      "currency":"USD",
      "name": "tricrypto",
      "isV2":true,
      "coins":[
        "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
        "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
      ],
      "coinDecimals":[
        6,8,18
      ],
      "id": 37
    }
];











