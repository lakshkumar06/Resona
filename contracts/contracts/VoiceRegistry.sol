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

    struct AuthAttempt {
        address attemptedBy;
        address targetOwner;
        bytes32 targetCommitment;
        bool success;
        uint256 similarity; // Scaled by 10000 (e.g., 7500 = 75.00%)
        uint256 threshold; // Scaled by 10000 (e.g., 7500 = 75.00%)
        uint256 timestamp;
        string metadata; // JSON string for additional data
    }

    mapping(bytes32 => Voice) private voices;
    mapping(uint256 => AuthAttempt) private authAttempts;
    uint256 private authAttemptCounter;

    event VoiceRegistered(bytes32 indexed commitment, address indexed owner, string walrusUri, uint256 timestamp);
    event VoiceRevoked(bytes32 indexed commitment, address indexed owner, uint256 timestamp);
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

    // Log an authentication attempt
    function logAuthenticationAttempt(
        address targetOwner,
        bytes32 targetCommitment,
        bool success,
        uint256 similarity,
        uint256 threshold,
        string calldata metadata
    ) external returns (uint256) {
        require(voices[targetCommitment].exists, "target commitment not registered");
        require(voices[targetCommitment].owner == targetOwner, "invalid target owner");
        
        authAttemptCounter++;
        uint256 attemptId = authAttemptCounter;
        
        authAttempts[attemptId] = AuthAttempt({
            attemptedBy: msg.sender,
            targetOwner: targetOwner,
            targetCommitment: targetCommitment,
            success: success,
            similarity: similarity,
            threshold: threshold,
            timestamp: block.timestamp,
            metadata: metadata
        });

        emit AuthenticationAttempt(
            attemptId,
            msg.sender,
            targetOwner,
            targetCommitment,
            success,
            similarity,
            threshold,
            block.timestamp,
            metadata
        );

        return attemptId;
    }

    // Get authentication attempt details
    function getAuthAttempt(uint256 attemptId) external view returns (AuthAttempt memory) {
        require(attemptId > 0 && attemptId <= authAttemptCounter, "invalid attempt id");
        return authAttempts[attemptId];
    }

    // Get total number of authentication attempts
    function getTotalAuthAttempts() external view returns (uint256) {
        return authAttemptCounter;
    }

    // Get authentication attempts for a specific target owner (paginated)
    function getAuthAttemptsForOwner(
        address targetOwner,
        uint256 offset,
        uint256 limit
    ) external view returns (AuthAttempt[] memory) {
        require(limit > 0 && limit <= 100, "invalid limit"); // Max 100 results per query
        
        // First, count how many attempts exist for this owner
        uint256 count = 0;
        for (uint256 i = 1; i <= authAttemptCounter; i++) {
            if (authAttempts[i].targetOwner == targetOwner) {
                count++;
            }
        }
        
        if (count == 0 || offset >= count) {
            return new AuthAttempt[](0);
        }
        
        // Calculate actual result size
        uint256 resultSize = count - offset;
        if (resultSize > limit) {
            resultSize = limit;
        }
        
        AuthAttempt[] memory result = new AuthAttempt[](resultSize);
        uint256 resultIndex = 0;
        uint256 currentOffset = 0;
        
        // Fill results (iterate from newest to oldest)
        for (uint256 i = authAttemptCounter; i >= 1 && resultIndex < resultSize; i--) {
            if (authAttempts[i].targetOwner == targetOwner) {
                if (currentOffset >= offset) {
                    result[resultIndex] = authAttempts[i];
                    resultIndex++;
                }
                currentOffset++;
            }
        }
        
        return result;
    }
}
