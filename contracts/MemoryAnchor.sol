// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MemoryAnchor
 * @notice Anchors MemoryMerge episodic memory snapshots on-chain.
 * @dev Each swarm can store root hashes of their 0G Storage Log 
 *      snapshots here for permanent, verifiable proof of memory.
 *      Deployed on 0G Galileo Testnet (chainId: 16602)
 */
contract MemoryAnchor {

    // ── Events ────────────────────────────────────────────────────────────

    event SnapshotAnchored(
        string indexed swarmId,
        uint256 indexed epochNumber,
        bytes32 rootHash,
        uint256 timestamp,
        address anchoredBy
    );

    event GoalSet(
        string indexed swarmId,
        string goal,
        uint256 timestamp
    );

    // ── Storage ───────────────────────────────────────────────────────────

    struct MemorySnapshot {
        bytes32 rootHash;
        uint256 epochNumber;
        uint256 timestamp;
        address anchoredBy;
        string label;
    }

    // swarmId => array of snapshots
    mapping(string => MemorySnapshot[]) public snapshots;

    // swarmId => current goal
    mapping(string => string) public swarmGoals;

    // swarmId => total snapshot count
    mapping(string => uint256) public snapshotCount;

    // ── Functions ─────────────────────────────────────────────────────────

    /**
     * @notice Anchor a memory snapshot root hash on-chain.
     * @param swarmId The unique identifier for the swarm
     * @param rootHash The 0G Storage root hash of the snapshot
     * @param epochNumber The reflection epoch number
     * @param label Human-readable label for this snapshot
     */
    function anchorSnapshot(
        string calldata swarmId,
        bytes32 rootHash,
        uint256 epochNumber,
        string calldata label
    ) external {
        MemorySnapshot memory snap = MemorySnapshot({
            rootHash: rootHash,
            epochNumber: epochNumber,
            timestamp: block.timestamp,
            anchoredBy: msg.sender,
            label: label
        });

        snapshots[swarmId].push(snap);
        snapshotCount[swarmId]++;

        emit SnapshotAnchored(
            swarmId,
            epochNumber,
            rootHash,
            block.timestamp,
            msg.sender
        );
    }

    /**
     * @notice Set the current goal for a swarm.
     * @param swarmId The unique identifier for the swarm
     * @param goal The research goal text
     */
    function setSwarmGoal(
        string calldata swarmId,
        string calldata goal
    ) external {
        swarmGoals[swarmId] = goal;
        emit GoalSet(swarmId, goal, block.timestamp);
    }

    /**
     * @notice Get all snapshots for a swarm.
     * @param swarmId The unique identifier for the swarm
     */
    function getSnapshots(
        string calldata swarmId
    ) external view returns (MemorySnapshot[] memory) {
        return snapshots[swarmId];
    }

    /**
     * @notice Get the latest snapshot for a swarm.
     * @param swarmId The unique identifier for the swarm
     */
    function getLatestSnapshot(
        string calldata swarmId
    ) external view returns (MemorySnapshot memory) {
        require(snapshotCount[swarmId] > 0, "No snapshots for this swarm");
        uint256 last = snapshots[swarmId].length - 1;
        return snapshots[swarmId][last];
    }

    /**
     * @notice Get total number of snapshots anchored for a swarm.
     * @param swarmId The unique identifier for the swarm
     */
    function getSnapshotCount(
        string calldata swarmId
    ) external view returns (uint256) {
        return snapshotCount[swarmId];
    }
}
