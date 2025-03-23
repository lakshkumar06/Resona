import hashlib
import time
import json
from typing import List, Dict
import os

class Block:
    def __init__(self, index: int, timestamp: float, data: Dict, previous_hash: str):
        self.index = index
        self.timestamp = timestamp
        self.data = data
        self.previous_hash = previous_hash
        self.hash = self.calculate_hash()
        self.nonce = 0

    def calculate_hash(self) -> str:
        block_string = json.dumps({
            "index": self.index,
            "timestamp": self.timestamp,
            "data": self.data,
            "previous_hash": self.previous_hash,
            "nonce": self.nonce
        }, sort_keys=True)
        return hashlib.sha256(block_string.encode()).hexdigest()

    def mine_block(self, difficulty: int):
        while self.hash[:difficulty] != '0' * difficulty:
            self.nonce += 1
            self.hash = self.calculate_hash()

class Blockchain:
    def __init__(self, difficulty: int = 2):
        self.chain: List[Block] = []
        self.difficulty = difficulty
        self.create_genesis_block()

    def create_genesis_block(self):
        genesis_block = Block(0, time.time(), {"message": "Genesis Block"}, "0")
        genesis_block.mine_block(self.difficulty)
        self.chain.append(genesis_block)

    def get_latest_block(self) -> Block:
        return self.chain[-1]

    def add_block(self, data: Dict):
        previous_block = self.get_latest_block()
        new_block = Block(
            len(self.chain),
            time.time(),
            data,
            previous_block.hash
        )
        new_block.mine_block(self.difficulty)
        self.chain.append(new_block)

    def is_chain_valid(self) -> bool:
        for i in range(1, len(self.chain)):
            current_block = self.chain[i]
            previous_block = self.chain[i-1]

            if current_block.hash != current_block.calculate_hash():
                return False
            if current_block.previous_hash != previous_block.hash:
                return False
            if current_block.hash[:self.difficulty] != '0' * self.difficulty:
                return False

        return True

    def save_chain(self, filepath: str):
        chain_data = []
        for block in self.chain:
            block_data = {
                "index": block.index,
                "timestamp": block.timestamp,
                "data": block.data,
                "previous_hash": block.previous_hash,
                "hash": block.hash,
                "nonce": block.nonce
            }
            chain_data.append(block_data)
        
        with open(filepath, 'w') as f:
            json.dump(chain_data, f, indent=4)

    @classmethod
    def load_chain(cls, filepath: str, difficulty: int = 2) -> 'Blockchain':
        if not os.path.exists(filepath):
            return cls(difficulty)

        with open(filepath, 'r') as f:
            chain_data = json.load(f)

        blockchain = cls(difficulty)
        blockchain.chain = []

        for block_data in chain_data:
            block = Block(
                block_data["index"],
                block_data["timestamp"],
                block_data["data"],
                block_data["previous_hash"]
            )
            block.hash = block_data["hash"]
            block.nonce = block_data["nonce"]
            blockchain.chain.append(block)

        return blockchain 