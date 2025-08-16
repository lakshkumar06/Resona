// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract VoiceRegistryMirror {
    event VoiceRegistered(
        bytes32 indexed commitment,
        address indexed owner,
        string walrusUri,
        uint256 timestamp
    );

    function mirrorVoiceRegistration(
        bytes32 commitment,
        string calldata walrusUri,
        uint256 timestamp
    ) external {
        emit VoiceRegistered(commitment, msg.sender, walrusUri, timestamp);
    }
}
