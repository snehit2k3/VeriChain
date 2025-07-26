// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract VeriChain is ERC721, ERC721URIStorage, AccessControl {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;

    bytes32 public constant PRODUCER_ROLE = keccak256("PRODUCER_ROLE");
    bytes32 public constant REFINERY_ROLE = keccak256("REFINERY_ROLE");

    mapping(uint256 => uint256) public originOf;

    event RawMaterialCreated(address indexed producer, uint256 indexed tokenId, string tokenURI);
    event BatchRefined(address indexed refinery, uint256 indexed originTokenId, uint256[] newTokenIds);

    constructor(address adminAddress) ERC721("VeriChain", "VCN") {
        _grantRole(DEFAULT_ADMIN_ROLE, adminAddress);
        _grantRole(PRODUCER_ROLE, adminAddress);
        _grantRole(REFINERY_ROLE, adminAddress);
    }

    function createRawMaterial(string memory _tokenURI) public onlyRole(PRODUCER_ROLE) {
        uint256 newItemId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(msg.sender, newItemId);
        _setTokenURI(newItemId, _tokenURI);
        emit RawMaterialCreated(msg.sender, newItemId, _tokenURI);
    }

    function refineBatch(uint256 _originTokenId, string[] memory _newURIs) public onlyRole(REFINERY_ROLE) {
        require(ownerOf(_originTokenId) == msg.sender, "VeriChain: Caller must own the token");
        _burn(_originTokenId);
        uint256[] memory newTokenIds = new uint256[](_newURIs.length);
        for (uint256 i = 0; i < _newURIs.length; i++) {
            uint256 newItemId = _tokenIdCounter.current();
            _tokenIdCounter.increment();
            _safeMint(msg.sender, newItemId);
            _setTokenURI(newItemId, _newURIs[i]);
            originOf[newItemId] = _originTokenId;
            newTokenIds[i] = newItemId;
        }
        emit BatchRefined(msg.sender, _originTokenId, newTokenIds);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
