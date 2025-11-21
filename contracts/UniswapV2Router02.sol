// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

interface IUniswapV2Factory {
    function createPair(address tokenA, address tokenB) external returns (address pair);
    function getPair(address tokenA, address tokenB) external view returns (address);
}

interface IUniswapV2Pair {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function mint(address to) external returns (uint liquidity);
    function burn(address to) external returns (uint amount0, uint amount1);
    function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external;
}

interface IERC20 {
    function balanceOf(address owner) external view returns (uint);
    function approve(address spender, uint value) external returns (bool);
    function transfer(address to, uint value) external returns (bool);
    function transferFrom(address from, address to, uint value) external returns (bool);
}

interface IWETH {
    function deposit() external payable;
    function transfer(address to, uint value) external returns (bool);
    function withdraw(uint) external;
}

contract UniswapV2Router02 {
    address public immutable factory;
    address public immutable WETH;

    event Approval(address indexed owner, address indexed spender, uint value);

    modifier ensure(uint deadline) {
        require(deadline >= block.timestamp, 'UniswapV2Router: EXPIRED');
        _;
    }

    constructor(address _factory, address _WETH) {
        factory = _factory;
        WETH = _WETH;
    }

    receive() external payable {}

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external ensure(deadline) returns (uint amountA, uint amountB, uint liquidity) {
        (amountA, amountB) = _addLiquidity(tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin);
        address pair = IUniswapV2Factory(factory).getPair(tokenA, tokenB);
        if (pair == address(0)) {
            pair = IUniswapV2Factory(factory).createPair(tokenA, tokenB);
        }
        _safeTransferFrom(tokenA, msg.sender, pair, amountA);
        _safeTransferFrom(tokenB, msg.sender, pair, amountB);
        liquidity = IUniswapV2Pair(pair).mint(to);
    }

    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable ensure(deadline) returns (uint amountToken, uint amountETH, uint liquidity) {
        (amountToken, amountETH) = _addLiquidity(
            token,
            WETH,
            amountTokenDesired,
            msg.value,
            amountTokenMin,
            amountETHMin
        );
        address pair = IUniswapV2Factory(factory).getPair(token, WETH);
        if (pair == address(0)) {
            pair = IUniswapV2Factory(factory).createPair(token, WETH);
        }
        _safeTransferFrom(token, msg.sender, pair, amountToken);
        IWETH(WETH).deposit{value: amountETH}();
        IWETH(WETH).transfer(pair, amountETH);
        liquidity = IUniswapV2Pair(pair).mint(to);
        if (msg.value > amountETH) _safeTransferETH(msg.sender, msg.value - amountETH);
    }

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external ensure(deadline) returns (uint amountA, uint amountB) {
        address pair = IUniswapV2Factory(factory).getPair(tokenA, tokenB);
        require(pair != address(0), 'UniswapV2Router: PAIR_NOT_FOUND');
        _safeTransferFrom(pair, msg.sender, pair, liquidity);
        (uint amount0, uint amount1) = IUniswapV2Pair(pair).burn(to);
        (address token0,) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        (amountA, amountB) = tokenA == token0 ? (amount0, amount1) : (amount1, amount0);
        require(amountA >= amountAMin, 'UniswapV2Router: INSUFFICIENT_A_AMOUNT');
        require(amountB >= amountBMin, 'UniswapV2Router: INSUFFICIENT_B_AMOUNT');
    }

    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external ensure(deadline) returns (uint[] memory amounts) {
        amounts = getAmountsOut(amountIn, path);
        require(amounts[amounts.length - 1] >= amountOutMin, 'UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT');
        _safeTransferFrom(path[0], msg.sender, _pairFor(path[0], path[1]), amounts[0]);
        _swap(amounts, path, to);
    }

    function swapTokensForExactTokens(
        uint amountOut,
        uint amountInMax,
        address[] calldata path,
        address to,
        uint deadline
    ) external ensure(deadline) returns (uint[] memory amounts) {
        amounts = getAmountsIn(amountOut, path);
        require(amounts[0] <= amountInMax, 'UniswapV2Router: EXCESSIVE_INPUT_AMOUNT');
        _safeTransferFrom(path[0], msg.sender, _pairFor(path[0], path[1]), amounts[0]);
        _swap(amounts, path, to);
    }

    function swapExactETHForTokens(
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external payable ensure(deadline) returns (uint[] memory amounts) {
        require(path[0] == WETH, 'UniswapV2Router: INVALID_PATH');
        amounts = getAmountsOut(msg.value, path);
        require(amounts[amounts.length - 1] >= amountOutMin, 'UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT');
        IWETH(WETH).deposit{value: amounts[0]}();
        IWETH(WETH).transfer(_pairFor(path[0], path[1]), amounts[0]);
        _swap(amounts, path, to);
    }

    function swapTokensForExactETH(
        uint amountOut,
        uint amountInMax,
        address[] calldata path,
        address to,
        uint deadline
    ) external ensure(deadline) returns (uint[] memory amounts) {
        require(path[path.length - 1] == WETH, 'UniswapV2Router: INVALID_PATH');
        amounts = getAmountsIn(amountOut, path);
        require(amounts[0] <= amountInMax, 'UniswapV2Router: EXCESSIVE_INPUT_AMOUNT');
        _safeTransferFrom(path[0], msg.sender, _pairFor(path[0], path[1]), amounts[0]);
        _swap(amounts, path, address(this));
        IWETH(WETH).withdraw(amounts[amounts.length - 1]);
        _safeTransferETH(to, amounts[amounts.length - 1]);
    }

    function swapExactTokensForETH(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external ensure(deadline) returns (uint[] memory amounts) {
        require(path[path.length - 1] == WETH, 'UniswapV2Router: INVALID_PATH');
        amounts = getAmountsOut(amountIn, path);
        require(amounts[amounts.length - 1] >= amountOutMin, 'UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT');
        _safeTransferFrom(path[0], msg.sender, _pairFor(path[0], path[1]), amounts[0]);
        _swap(amounts, path, address(this));
        IWETH(WETH).withdraw(amounts[amounts.length - 1]);
        _safeTransferETH(to, amounts[amounts.length - 1]);
    }

    function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts) {
        require(path.length >= 2, 'UniswapV2Router: INVALID_PATH');
        amounts = new uint[](path.length);
        amounts[0] = amountIn;
        for (uint i; i < path.length - 1; i++) {
            amounts[i + 1] = getAmountOut(amounts[i], path[i], path[i + 1]);
        }
    }

    function getAmountsIn(uint amountOut, address[] memory path) public view returns (uint[] memory amounts) {
        require(path.length >= 2, 'UniswapV2Router: INVALID_PATH');
        amounts = new uint[](path.length);
        amounts[amounts.length - 1] = amountOut;
        for (uint i = path.length - 1; i > 0; i--) {
            amounts[i - 1] = getAmountIn(amounts[i], path[i - 1], path[i]);
        }
    }

    function getAmountOut(uint amountIn, address tokenIn, address tokenOut) public view returns (uint amountOut) {
        require(amountIn > 0, 'UniswapV2Router: INSUFFICIENT_INPUT_AMOUNT');
        address pair = _pairFor(tokenIn, tokenOut);
        (uint112 reserve0, uint112 reserve1,) = IUniswapV2Pair(pair).getReserves();
        (uint reserveIn, uint reserveOut) = tokenIn < tokenOut ? (uint(reserve0), uint(reserve1)) : (uint(reserve1), uint(reserve0));
        require(reserveIn > 0 && reserveOut > 0, 'UniswapV2Router: INSUFFICIENT_LIQUIDITY');
        uint amountInWithFee = amountIn * 997;
        uint numerator = amountInWithFee * reserveOut;
        uint denominator = reserveIn * 1000 + amountInWithFee;
        amountOut = numerator / denominator;
    }

    function getAmountIn(uint amountOut, address tokenIn, address tokenOut) public view returns (uint amountIn) {
        require(amountOut > 0, 'UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT');
        address pair = _pairFor(tokenIn, tokenOut);
        (uint112 reserve0, uint112 reserve1,) = IUniswapV2Pair(pair).getReserves();
        (uint reserveIn, uint reserveOut) = tokenIn < tokenOut ? (uint(reserve0), uint(reserve1)) : (uint(reserve1), uint(reserve0));
        require(reserveIn > 0 && reserveOut > 0, 'UniswapV2Router: INSUFFICIENT_LIQUIDITY');
        uint numerator = reserveIn * amountOut * 1000;
        uint denominator = (reserveOut - amountOut) * 997;
        amountIn = (numerator / denominator) + 1;
    }

    function _swap(uint[] memory amounts, address[] memory path, address _to) private {
        for (uint i; i < path.length - 1; i++) {
            (address input, address output) = (path[i], path[i + 1]);
            (address token0,) = input < output ? (input, output) : (output, input);
            uint amountOut = amounts[i + 1];
            (uint amount0Out, uint amount1Out) = input == token0 ? (uint(0), amountOut) : (amountOut, uint(0));
            address to = i < path.length - 2 ? _pairFor(output, path[i + 2]) : _to;
            IUniswapV2Pair(_pairFor(input, output)).swap(amount0Out, amount1Out, to, new bytes(0));
        }
    }

    function _pairFor(address tokenA, address tokenB) private view returns (address) {
        address pair = IUniswapV2Factory(factory).getPair(tokenA, tokenB);
        require(pair != address(0), 'UniswapV2Router: PAIR_NOT_FOUND');
        return pair;
    }

    function _addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin
    ) private view returns (uint amountA, uint amountB) {
        address pair = IUniswapV2Factory(factory).getPair(tokenA, tokenB);
        if (pair == address(0)) {
            amountA = amountADesired;
            amountB = amountBDesired;
        } else {
            (uint112 reserve0, uint112 reserve1,) = IUniswapV2Pair(pair).getReserves();
            (uint reserveA, uint reserveB) = tokenA < tokenB ? (uint(reserve0), uint(reserve1)) : (uint(reserve1), uint(reserve0));
            if (reserveA == 0 && reserveB == 0) {
                (amountA, amountB) = (amountADesired, amountBDesired);
            } else {
                uint amountBOptimal = _quote(amountADesired, reserveA, reserveB);
                if (amountBOptimal <= amountBDesired) {
                    require(amountBOptimal >= amountBMin, 'UniswapV2Router: INSUFFICIENT_B_AMOUNT');
                    (amountA, amountB) = (amountADesired, amountBOptimal);
                } else {
                    uint amountAOptimal = _quote(amountBDesired, reserveB, reserveA);
                    require(amountAOptimal <= amountADesired, 'UniswapV2Router: EXCESSIVE_A_AMOUNT');
                    require(amountAOptimal >= amountAMin, 'UniswapV2Router: INSUFFICIENT_A_AMOUNT');
                    (amountA, amountB) = (amountAOptimal, amountBDesired);
                }
            }
        }
    }

    function _quote(uint amountA, uint reserveA, uint reserveB) private pure returns (uint amountB) {
        require(amountA > 0, 'UniswapV2Router: INSUFFICIENT_AMOUNT');
        require(reserveA > 0 && reserveB > 0, 'UniswapV2Router: INSUFFICIENT_LIQUIDITY');
        amountB = (amountA * reserveB) / reserveA;
    }

    function _safeTransfer(address token, address to, uint value) private {
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(0xa9059cbb, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), 'UniswapV2Router: TRANSFER_FAILED');
    }

    function _safeTransferFrom(address token, address from, address to, uint value) private {
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(0x23b872dd, from, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), 'UniswapV2Router: TRANSFER_FROM_FAILED');
    }

    function _safeTransferETH(address to, uint value) private {
        (bool success,) = to.call{value: value}(new bytes(0));
        require(success, 'UniswapV2Router: ETH_TRANSFER_FAILED');
    }
}
