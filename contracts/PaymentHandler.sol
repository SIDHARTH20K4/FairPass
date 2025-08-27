// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title PaymentHandler
 * @dev Handles all payment operations for the event management system
 */
contract PaymentHandler is Ownable, ReentrancyGuard {
    
    struct PaymentInfo {
        uint256 amount;
        address organizer;
        bool processed;
        uint256 timestamp;
    }
    
    mapping(uint256 => PaymentInfo) public eventPayments;
    mapping(address => uint256) public pendingWithdrawals;
    mapping(uint256 => uint256) public refundAmount;
    
    uint256 public platformFeePercentage = 250; // 2.5%
    uint256 public constant FEE_DENOMINATOR = 10000;
    
    event PaymentReceived(uint256 indexed eventId, address indexed payer, uint256 amount, uint256 platformFee);
    event PaymentWithdrawn(address indexed organizer, uint256 amount);
    event RefundProcessed(uint256 indexed eventId, address indexed recipient, uint256 amount);
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);

    constructor(address initialOwner) Ownable(initialOwner) {}

    /**
     * @dev Process payment for a ticket purchase
     */
    function processPayment(
        uint256 eventId, 
        address organizer, 
        uint256 ticketPrice
    ) external payable nonReentrant returns (bool) {
        require(msg.value >= ticketPrice, "Insufficient payment");
        require(organizer != address(0), "Invalid organizer address");
        
        uint256 platformFee = (ticketPrice * platformFeePercentage) / FEE_DENOMINATOR;
        uint256 organizerAmount = ticketPrice - platformFee;
        
        // Handle excess payment
        uint256 excess = msg.value - ticketPrice;
        if (excess > 0) {
            payable(msg.sender).transfer(excess);
        }
        
        // Store payment info
        eventPayments[eventId] = PaymentInfo({
            amount: ticketPrice,
            organizer: organizer,
            processed: false,
            timestamp: block.timestamp
        });
        
        // Add to organizer's pending withdrawals
        pendingWithdrawals[organizer] += organizerAmount;
        
        emit PaymentReceived(eventId, msg.sender, ticketPrice, platformFee);
        return true;
    }

    /**
     * @dev Process refund for a ticket
     */
    function processRefund(
        uint256 eventId,
        address recipient,
        uint256 amount
    ) external onlyOwner nonReentrant {
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Invalid refund amount");
        require(address(this).balance >= amount, "Insufficient contract balance");
        
        PaymentInfo storage payment = eventPayments[eventId];
        require(payment.amount >= amount, "Refund exceeds payment");
        
        // Adjust organizer's pending withdrawals
        uint256 platformFee = (payment.amount * platformFeePercentage) / FEE_DENOMINATOR;
        uint256 organizerRefund = amount - ((amount * platformFeePercentage) / FEE_DENOMINATOR);
        
        if (pendingWithdrawals[payment.organizer] >= organizerRefund) {
            pendingWithdrawals[payment.organizer] -= organizerRefund;
        }
        
        payable(recipient).transfer(amount);
        refundAmount[eventId] = amount;
        
        emit RefundProcessed(eventId, recipient, amount);
    }

    /**
     * @dev Organizer withdraws their earnings
     */
    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "No funds to withdraw");
        
        pendingWithdrawals[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
        
        emit PaymentWithdrawn(msg.sender, amount);
    }

    /**
     * @dev Owner withdraws platform fees
     */
    function withdrawPlatformFees() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        
        payable(owner()).transfer(balance);
    }

    /**
     * @dev Update platform fee percentage
     */
    function setPlatformFee(uint256 newFeePercentage) external onlyOwner {
        require(newFeePercentage <= 1000, "Fee too high"); // Max 10%
        
        uint256 oldFee = platformFeePercentage;
        platformFeePercentage = newFeePercentage;
        
        emit PlatformFeeUpdated(oldFee, newFeePercentage);
    }

    /**
     * @dev Get organizer's pending withdrawal amount
     */
    function getPendingWithdrawal(address organizer) external view returns (uint256) {
        return pendingWithdrawals[organizer];
    }

    /**
     * @dev Emergency function to withdraw all funds (owner only)
     */
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    // Receive function to accept Ether
    receive() external payable {}
}
