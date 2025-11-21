// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyToken is ERC20, Ownable {
    uint256 public immutable cap;
    uint256 public immutable deploymentTime;
    uint256 public immutable burnTime;
    bool public burnExecuted;

    event TokensAllocated(address indexed recipient, uint256 amount);
    event BurnScheduled(uint256 burnTime);
    event BurnExecuted(uint256 amountBurned, uint256 timestamp);

    constructor(address initialRecipient) ERC20("KhanX Token", "MTK") {
        cap = 100000 * 10 ** decimals();
        uint256 initial = 1000 * 10 ** decimals();
        _mint(initialRecipient, initial);
        _mint(address(this), cap - initial);

        deploymentTime = block.timestamp;
        burnTime = block.timestamp + 365 days;
        burnExecuted = false;

        emit BurnScheduled(burnTime);
    }

    // Owner can allocate reserved tokens
    function allocateTokens(address recipient, uint256 amount) external onlyOwner {
        require(balanceOf(address(this)) >= amount, "Insufficient reserved tokens");
        _transfer(address(this), recipient, amount);
        emit TokensAllocated(recipient, amount);
    }

    // Burn 50% of reserved tokens after burnTime
    function executeBurn() external onlyOwner {
        require(!burnExecuted, "Burn already executed");
        require(block.timestamp >= burnTime, "Burn not yet eligible");
        uint256 available = balanceOf(address(this));
        require(available > 0, "No tokens to burn");

        uint256 burnAmount = available / 2;
        _burn(address(this), burnAmount);
        burnExecuted = true;

        emit BurnExecuted(burnAmount, block.timestamp);
    }

    // Returns key stats for frontend
    function getStatus() external view returns (
        uint256 totalCap,
        uint256 available,
        uint256 distributed,
        uint256 scheduledBurnTime,
        bool executed
    ) {
        totalCap = cap;
        available = balanceOf(address(this));
        distributed = cap - available;
        scheduledBurnTime = burnTime;
        executed = burnExecuted;
    }

    function getAvailableTokens() external view returns (uint256) {
        return balanceOf(address(this));
    }

    function getTimeUntilBurn() external view returns (uint256) {
        if (block.timestamp >= burnTime) return 0;
        return burnTime - block.timestamp;
    }

    function isBurnEligible() external view returns (bool) {
        return !burnExecuted && block.timestamp >= burnTime;
    }

    function getTotalDistributed() external view returns (uint256) {
        return cap - balanceOf(address(this));
    }
}
