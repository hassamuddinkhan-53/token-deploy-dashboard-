// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

interface ISimplePair {
    function addLiquidity(uint256 amountA, uint256 amountB) external;
    function swap(uint256 amount0Out, uint256 amount1Out, address to) external;
    function getReserves() external view returns (uint112, uint112);
    function token0() external view returns (address);
    function token1() external view returns (address);
}

interface ISimpleFactory {
    function getPair(address tokenA, address tokenB) external view returns (address);
    function createPair(address tokenA, address tokenB) external returns (address);
}

contract RouterV2 {
    address public immutable factory;
    constructor(address _factory) { factory = _factory; }

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256,
        uint256,
        address to,
        uint256
    ) external returns (uint256, uint256, uint256) {
        address pair = ISimpleFactory(factory).getPair(tokenA, tokenB);
        if (pair == address(0)) {
            pair = ISimpleFactory(factory).createPair(tokenA, tokenB);
        }

        IERC20(tokenA).transferFrom(msg.sender, address(this), amountADesired);
        IERC20(tokenB).transferFrom(msg.sender, address(this), amountBDesired);

        IERC20(tokenA).approve(pair, amountADesired);
        IERC20(tokenB).approve(pair, amountBDesired);

        ISimplePair(pair).addLiquidity(amountADesired, amountBDesired);

        return (amountADesired, amountBDesired, 0);
    }

    function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) internal pure returns (uint amountOut) {
        require(amountIn > 0, "INSUFFICIENT_INPUT_AMOUNT");
        require(reserveIn > 0 && reserveOut > 0, "INSUFFICIENT_LIQUIDITY");
        uint amountInWithFee = amountIn * 997;
        uint numerator = amountInWithFee * reserveOut;
        uint denominator = reserveIn * 1000 + amountInWithFee;
        amountOut = numerator / denominator;
    }

    function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts) {
        require(path.length >= 2, "Invalid path");
        amounts = new uint[](path.length);
        amounts[0] = amountIn;
        for (uint i; i < path.length - 1; i++) {
            address pair = ISimpleFactory(factory).getPair(path[i], path[i+1]);
            (uint112 r0, uint112 r1) = ISimplePair(pair).getReserves();
            address token0 = ISimplePair(pair).token0();
            (uint reserveIn, uint reserveOut) = path[i] == token0 ? (uint(r0), uint(r1)) : (uint(r1), uint(r0));
            amounts[i+1] = getAmountOut(amounts[i], reserveIn, reserveOut);
        }
    }

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256
    ) external returns (uint256[] memory amounts) {
        amounts = getAmountsOut(amountIn, path);
        require(amounts[amounts.length - 1] >= amountOutMin, "INSUFFICIENT_OUTPUT_AMOUNT");
        
        address pair = ISimpleFactory(factory).getPair(path[0], path[1]);
        require(pair != address(0), "Pair does not exist");
        
        IERC20(path[0]).transferFrom(msg.sender, pair, amounts[0]);
        
        address token0 = ISimplePair(pair).token0();
        (uint amount0Out, uint amount1Out) = path[0] == token0 ? (uint(0), amounts[1]) : (amounts[1], uint(0));
        
        ISimplePair(pair).swap(amount0Out, amount1Out, to);
    }
}
