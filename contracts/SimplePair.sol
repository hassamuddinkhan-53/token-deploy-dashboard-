// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract SimplePair {
    address public token0;
    address public token1;
    uint112 private reserve0;
    uint112 private reserve1;
    bool private initialized;

    function initialize(address _token0, address _token1) external {
        require(!initialized, "ALREADY");
        token0 = _token0;
        token1 = _token1;
        initialized = true;
    }

    function getReserves() external view returns (uint112, uint112) {
        return (reserve0, reserve1);
    }

    function _updateReserves() internal {
        uint256 bal0 = IERC20(token0).balanceOf(address(this));
        uint256 bal1 = IERC20(token1).balanceOf(address(this));
        reserve0 = uint112(bal0);
        reserve1 = uint112(bal1);
    }

    function addLiquidity(uint256 amount0, uint256 amount1) external returns (uint256, uint256) {
        if (amount0 == 0 && amount1 == 0) {
            _updateReserves();
            return (reserve0, reserve1);
        }
        require(amount0 > 0 && amount1 > 0, "INSUFFICIENT_AMOUNT");
        require(IERC20(token0).transferFrom(msg.sender, address(this), amount0));
        require(IERC20(token1).transferFrom(msg.sender, address(this), amount1));
        _updateReserves();
        return (reserve0, reserve1);
    }

    function swap(uint256 amount0Out, uint256 amount1Out, address to) external {
        require(amount0Out == 0 || amount1Out == 0, "ONE_OUTPUT_ONLY");
        (uint112 r0, uint112 r1) = (reserve0, reserve1);
        if (amount0Out > 0) {
            require(amount0Out < r0, "INSUFFICIENT_LIQUIDITY");
            require(IERC20(token0).transfer(to, amount0Out));
            uint256 balance1 = IERC20(token1).balanceOf(address(this));
            uint256 amount1In = balance1 > r1 ? balance1 - r1 : 0;
            uint256 amount1InWithFee = amount1In * 997 / 1000;
            uint256 numerator = amount1InWithFee * r0;
            uint256 denominator = uint256(r1) * 1000 + amount1InWithFee;
            uint256 amount0OutCalc = numerator / denominator;
            require(amount0OutCalc >= amount0Out, "INSUFFICIENT_INPUT_AMOUNT");
        } else {
            require(amount1Out < r1, "INSUFFICIENT_LIQUIDITY");
            require(IERC20(token1).transfer(to, amount1Out));
            uint256 balance0 = IERC20(token0).balanceOf(address(this));
            uint256 amount0In = balance0 > r0 ? balance0 - r0 : 0;
            uint256 amount0InWithFee = amount0In * 997 / 1000;
            uint256 numerator = amount0InWithFee * r1;
            uint256 denominator = uint256(r0) * 1000 + amount0InWithFee;
            uint256 amount1OutCalc = numerator / denominator;
            require(amount1OutCalc >= amount1Out, "INSUFFICIENT_INPUT_AMOUNT");
        }
        _updateReserves();
    }

}
