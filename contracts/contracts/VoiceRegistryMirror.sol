// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract VoiceRegistryMirror {
    event VoiceRegistered(
        bytes32 indexed commitment,
        address indexed owner,
        string walrusUri,
        uint256 timestamp
    );

    event AuthenticationAttempt(
        uint256 indexed attemptId,
        address indexed attemptedBy,
        address indexed targetOwner,
        bytes32 targetCommitment,
        bool success,
        uint256 similarity,
        uint256 threshold,
        uint256 timestamp,
        string metadata
    );

    function mirrorVoiceRegistration(
        bytes32 commitment,
        string calldata walrusUri,
        uint256 timestamp
    ) external {
        emit VoiceRegistered(commitment, msg.sender, walrusUri, timestamp);
    }

    function mirrorAuthenticationAttempt(
        uint256 attemptId,
        address attemptedBy,
        address targetOwner,
        bytes32 targetCommitment,
        bool success,
        uint256 similarity,
        uint256 threshold,
        uint256 timestamp,
        string calldata metadata
    ) external {
        emit AuthenticationAttempt(
            attemptId,
            attemptedBy,
            targetOwner,
            targetCommitment,
            success,
            similarity,
            threshold,
            timestamp,
            metadata
        );
    }
}
