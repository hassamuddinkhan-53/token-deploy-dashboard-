// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    constructor(string memory name_, string memory symbol_, uint256 initialSupply) ERC20(name_, symbol_) {
        owner = msg.sender;
        _mint(msg.sender, initialSupply);
    }

    /**
     * @dev Mint new tokens (only owner)
     * @param to Address to receive the minted tokens
     * @param amount Amount of tokens to mint (in wei, with decimals)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Burn tokens from caller's balance
     * @param amount Amount of tokens to burn (in wei, with decimals)
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
