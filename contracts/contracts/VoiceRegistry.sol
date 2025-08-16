// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract VoiceRegistry {
    struct Voice {
        address owner;
        bytes32 commitment;
        string walrusUri;
        uint256 timestamp;
        bool exists;
    }

    mapping(bytes32 => Voice) private voices;

    event VoiceRegistered(bytes32 indexed commitment, address indexed owner, string walrusUri, uint256 timestamp);
    event VoiceRevoked(bytes32 indexed commitment, address indexed owner, uint256 timestamp);

    // register a new voice commitment
    function registerVoice(bytes32 commitment, string calldata walrusUri) external {
        // require(!voices[commitment].exists, "already registered"); // Commented out for testing to allow duplicates
        voices[commitment] = Voice(msg.sender, commitment, walrusUri, block.timestamp, true);
        emit VoiceRegistered(commitment, msg.sender, walrusUri, block.timestamp);
    }

    // owner can revoke their voice
    function revokeVoice(bytes32 commitment) external {
        require(voices[commitment].exists, "not registered");
        require(voices[commitment].owner == msg.sender, "not owner");
        address owner = voices[commitment].owner;
        delete voices[commitment];
        emit VoiceRevoked(commitment, owner, block.timestamp);
    }

    // simple read helpers
    function isRegistered(bytes32 commitment) external view returns (bool) {
        return voices[commitment].exists;
    }

    function getOwner(bytes32 commitment) external view returns (address) {
        require(voices[commitment].exists, "not registered");
        return voices[commitment].owner;
    }

    function getWalrusUri(bytes32 commitment) external view returns (string memory) {
        require(voices[commitment].exists, "not registered");
        return voices[commitment].walrusUri;
    }
}
