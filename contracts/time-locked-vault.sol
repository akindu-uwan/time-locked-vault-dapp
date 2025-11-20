// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract TimeLockedVault {
    struct Vault {
        address owner;
        string ipfsHash;
        uint256 unlockTime;
        string encryptedKey;
        bool unlocked;
    }

    mapping(address => Vault[]) public vaults;

    event VaultCreated(address indexed owner, uint256 index);
    event VaultUnlocked(address indexed owner, uint256 index, string key);

    function createVault(string memory ipfsHash, string memory encryptedKey, uint256 unlockTime) external {
        require(unlockTime > block.timestamp, "Unlock time must be in future");

        vaults[msg.sender].push(Vault({
            owner: msg.sender,
            ipfsHash: ipfsHash,
            unlockTime: unlockTime,
            encryptedKey: encryptedKey,
            unlocked: false
        }));

        emit VaultCreated(msg.sender, vaults[msg.sender].length - 1);
    }

    function unlockVault(uint256 index) external returns (string memory) {
        Vault storage vault = vaults[msg.sender][index];
        require(block.timestamp >= vault.unlockTime, "Vault is still locked");
        require(!vault.unlocked, "Already unlocked");

        vault.unlocked = true;

        emit VaultUnlocked(msg.sender, index, vault.encryptedKey);
        return vault.encryptedKey;
    }

    function getVaults(address user) external view returns (Vault[] memory) {
        return vaults[user];
    }
}
