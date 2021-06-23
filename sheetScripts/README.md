# Google SpreadSheet Script

## How to use

### Setup
```
var ETHERSCAN_KEY = "INSERT_KEY_HERE";
```
Replace INSERT_KEY_HERE with an etherscan API key.


### Balance
Curve LP Balance:
```
=convexBalance("poolname", YourEthAddress)
```
where poolname is the name of the pool and YourEthAddress is your wallet address.  To find pool names look in the json data at the bottom of the script.


Staked CVX:
```
=convexStakedCVX(YourEthAddress)
```

Staked cvxCRV:
```
=convexStakedCvxCRV(YourEthAddress)
```


Sushi CVX/ETH:
```
=convexLpCVXETH(YourEthAddress)
```

Sushi cvxCrv/Crv:
```
=convexLpCvxCRVCRV(YourEthAddress)
```


### APR

Curve LP APR:
```
=convexAPR("poolname")
```

Staked CVX APR:
```
=convexStakedCVXAPR()
```

Staked cvxCRV APR:
```
=convexStakedCvxCRVAPR(YourEthAddress)
```


Sushi CVX/ETH APR:
```
=convexLpCVXETHAPR(YourEthAddress)
```

Sushi cvxCrv/Crv APR:
```
=convexLpcvxCRVCRVAPR(YourEthAddress)
```