// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IFactory {
    function getPair(address a, address b) external view returns (address);
    function createPair(address a, address b) external returns (address);
}

interface IPair {
    function addLiquidity(uint256 amount0, uint256 amount1) external returns (uint256, uint256);
    function swap(uint256 amount0Out, uint256 amount1Out, address to) external;
    function getReserves() external view returns (uint112, uint112);
}

contract UniswapStyleRouter {
    address public factory;

    constructor(address _factory) {
        factory = _factory;
    }

    function ensurePair(address tokenA, address tokenB) internal returns (address pair) {
        pair = IFactory(factory).getPair(tokenA, tokenB);
        if (pair == address(0)) {
            pair = IFactory(factory).createPair(tokenA, tokenB);
        }
    }

    function addLiquidity(address tokenA, address tokenB, uint256 amountA, uint256 amountB) external returns (uint256, uint256) {
        address pair = ensurePair(tokenA, tokenB);
        require(IERC20(tokenA).transferFrom(msg.sender, pair, amountA));
        require(IERC20(tokenB).transferFrom(msg.sender, pair, amountB));
        return IPair(pair).addLiquidity(0,0);
    }

    function swapExactTokensForTokens(uint256 amountIn, uint256 /*amountOutMin*/, address[] calldata path, address to, uint256 /*deadline*/) external returns (bool) {
        require(path.length >= 2, "INVALID_PATH");
        address input = path[0];
        address output = path[path.length - 1];
        address pair = ensurePair(input, output);
        require(IERC20(input).transferFrom(msg.sender, pair, amountIn));
        (uint112 r0, uint112 r1) = IPair(pair).getReserves();
        if (input < output) {
            uint256 amountOut = getAmountOut(amountIn, r0, r1);
            IPair(pair).swap(0, amountOut, to);
        } else {
            uint256 amountOut = getAmountOut(amountIn, r1, r0);
            IPair(pair).swap(amountOut, 0, to);
        }
        return true;
    }

    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) public pure returns (uint256) {
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn * 1000 + amountInWithFee;
        return numerator / denominator;
    }

}
