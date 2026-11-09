// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// Local demonstration token only. Never deploy this unrestricted mint to a public network.
contract DemoUSD {
    string public constant name = "ReceiptCourt Demo USD";
    string public constant version = "1";
    string public constant symbol = "dUSD";
    uint8 public constant decimals = 6;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(bytes32 => bool)) public authorizationState;
    event Transfer(address indexed from, address indexed to, uint256 value);
    event AuthorizationUsed(address indexed authorizer, bytes32 indexed nonce);
    bytes32 private constant TYPEHASH = keccak256("TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)");

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function DOMAIN_SEPARATOR() public view returns (bytes32) {
        return keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256(bytes(name)), keccak256(bytes(version)), block.chainid, address(this)
        ));
    }

    function transferWithAuthorization(address from, address to, uint256 value,
        uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s) external {
        require(block.timestamp > validAfter && block.timestamp < validBefore, "expired");
        require(!authorizationState[from][nonce], "replay");
        require(uint256(s) <= 0x7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0, "high s");
        require(v == 27 || v == 28, "bad v");
        bytes32 body = keccak256(abi.encode(TYPEHASH, from, to, value, validAfter, validBefore, nonce));
        address signer = ecrecover(keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR(), body)), v, r, s);
        require(signer != address(0) && signer == from, "bad signature");
        require(balanceOf[from] >= value, "balance");
        authorizationState[from][nonce] = true;
        balanceOf[from] -= value;
        balanceOf[to] += value;
        emit AuthorizationUsed(from, nonce);
        emit Transfer(from, to, value);
    }
}
