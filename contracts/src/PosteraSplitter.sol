// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @title PosteraSplitter
/// @notice Splits USDC sponsorship payments: 90% to author, 10% to protocol.
///         User must approve this contract to spend their USDC before calling sponsor().
contract PosteraSplitter {
    IERC20 public immutable usdc;
    address public immutable protocol;
    uint256 public constant AUTHOR_BPS = 9000;
    uint256 public constant BPS_BASE = 10000;

    event Sponsor(
        address indexed payer,
        address indexed author,
        uint256 total,
        uint256 authorAmount,
        uint256 protocolAmount
    );

    constructor(address _usdc, address _protocol) {
        require(_usdc != address(0), "zero usdc");
        require(_protocol != address(0), "zero protocol");
        usdc = IERC20(_usdc);
        protocol = _protocol;
    }

    /// @notice Split a USDC payment: 90% to author, 10% to protocol.
    /// @param author The author's payout address.
    /// @param total  The total USDC amount (in smallest units, 6 decimals).
    function sponsor(address author, uint256 total) external {
        require(author != address(0), "zero author");
        require(total > 0, "zero amount");

        uint256 authorAmount = (total * AUTHOR_BPS) / BPS_BASE;
        uint256 protocolAmount = total - authorAmount;

        require(usdc.transferFrom(msg.sender, author, authorAmount), "author transfer failed");
        require(usdc.transferFrom(msg.sender, protocol, protocolAmount), "protocol transfer failed");

        emit Sponsor(msg.sender, author, total, authorAmount, protocolAmount);
    }
}
