// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";

import {Faction} from "./types/GameTypes.sol";

/// @title SeasonNFT — Commemorative ERC-721 for top-3 players per season
/// @notice Minted by GameEngine at the end of each season for the top-3 contributors
///         from the winning faction. Collectible only, no financial rights.
/// @dev    Fully on-chain metadata (SVG + JSON). No external dependencies.
contract SeasonNFT is ERC721, Ownable {
    using Strings for uint256;

    // ═══════════════════════════════════════════
    //                  STORAGE
    // ═══════════════════════════════════════════

    struct TokenData {
        uint256 seasonId;
        uint8 rank;        // 1, 2, or 3
        uint8 faction;     // 1=PEPE, 2=SHIB
        address player;
    }

    /// @notice Token ID → metadata
    mapping(uint256 => TokenData) public tokenData;

    /// @notice Next token ID (starts at 1)
    uint256 public nextTokenId;

    /// @notice Address authorized to mint (GameEngine)
    address public minter;

    /// @notice Track minted seasons to prevent double-minting
    mapping(uint256 => bool) public seasonMinted;

    // ═══════════════════════════════════════════
    //                  EVENTS
    // ═══════════════════════════════════════════

    event SeasonNFTMinted(
        uint256 indexed tokenId,
        uint256 indexed seasonId,
        uint8 rank,
        uint8 faction,
        address indexed player
    );

    // ═══════════════════════════════════════════
    //               CONSTRUCTOR
    // ═══════════════════════════════════════════

    constructor() ERC721("PEPE vs SHIB Season Champion", "PVSC") Ownable(msg.sender) {
        nextTokenId = 1;
    }

    // ═══════════════════════════════════════════
    //                  ADMIN
    // ═══════════════════════════════════════════

    /// @notice Set the minter address (GameEngine).
    function setMinter(address _minter) external onlyOwner {
        require(_minter != address(0), "Invalid minter");
        minter = _minter;
    }

    // ═══════════════════════════════════════════
    //                  MINTING
    // ═══════════════════════════════════════════

    /// @notice Mint top-3 NFTs for a season. Only callable by the authorized minter.
    /// @param seasonId The season that ended.
    /// @param faction  Winning faction (1=PEPE, 2=SHIB).
    /// @param top3     Addresses of the top-3 players (by Contribution Score).
    function mintSeasonRewards(
        uint256 seasonId,
        uint8 faction,
        address[3] calldata top3
    ) external {
        require(msg.sender == minter, "Only minter");
        require(!seasonMinted[seasonId], "Already minted");
        require(faction == 1 || faction == 2, "Invalid faction");

        seasonMinted[seasonId] = true;

        for (uint8 rank = 1; rank <= 3; rank++) {
            address player = top3[rank - 1];
            if (player == address(0)) continue; // Skip empty slots

            uint256 tokenId = nextTokenId++;

            tokenData[tokenId] = TokenData({
                seasonId: seasonId,
                rank: rank,
                faction: faction,
                player: player
            });

            _safeMint(player, tokenId);

            emit SeasonNFTMinted(tokenId, seasonId, rank, faction, player);
        }
    }

    // ═══════════════════════════════════════════
    //          ON-CHAIN METADATA (SVG)
    // ═══════════════════════════════════════════

    /// @notice Returns fully on-chain token URI with SVG artwork.
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        TokenData memory data = tokenData[tokenId];
        string memory factionName = data.faction == 1 ? "PEPE" : "SHIB";
        string memory rankStr = _rankToString(data.rank);
        string memory rankEmoji = _rankToEmoji(data.rank);
        string memory factionColor = data.faction == 1 ? "#4CAF50" : "#FF9800";
        string memory bgGradient = data.faction == 1
            ? "#1a472a,#2d6b3f"
            : "#4a2800,#6b3f00";

        string memory svg = string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" style="background:linear-gradient(180deg,',
            bgGradient,
            ')"><style>text{font-family:monospace;fill:white;text-anchor:middle}</style>',
            '<rect width="400" height="500" rx="20" fill="none" stroke="',
            factionColor,
            '" stroke-width="4"/>',
            '<text x="200" y="60" font-size="20" font-weight="bold">PEPE vs SHIB</text>',
            '<text x="200" y="100" font-size="48">',
            rankEmoji,
            '</text>'
        ));

        svg = string(abi.encodePacked(
            svg,
            '<text x="200" y="170" font-size="28" fill="',
            factionColor,
            '" font-weight="bold">',
            rankStr,
            ' PLACE</text>',
            '<text x="200" y="220" font-size="22">Season #',
            data.seasonId.toString(),
            '</text>',
            '<text x="200" y="270" font-size="24" fill="',
            factionColor,
            '">Team ',
            factionName,
            '</text>'
        ));

        svg = string(abi.encodePacked(
            svg,
            '<text x="200" y="350" font-size="12" opacity="0.7">Champion</text>',
            '<text x="200" y="380" font-size="10" opacity="0.5">',
            _addressToString(data.player),
            '</text>',
            '<text x="200" y="460" font-size="11" opacity="0.4">On-chain commemorative NFT</text>',
            '<text x="200" y="480" font-size="11" opacity="0.4">No financial rights</text>',
            '</svg>'
        ));

        string memory json = string(abi.encodePacked(
            '{"name":"Season #',
            data.seasonId.toString(),
            ' - ',
            rankStr,
            ' Place (',
            factionName,
            ')","description":"Commemorative NFT for top-3 contributor in PEPE vs SHIB Season #',
            data.seasonId.toString(),
            '. Collectible only, no financial rights.",'
        ));

        json = string(abi.encodePacked(
            json,
            '"image":"data:image/svg+xml;base64,',
            Base64.encode(bytes(svg)),
            '","attributes":[{"trait_type":"Season","value":',
            data.seasonId.toString(),
            '},{"trait_type":"Rank","value":',
            uint256(data.rank).toString(),
            '},{"trait_type":"Faction","value":"',
            factionName,
            '"}]}'
        ));

        return string(abi.encodePacked(
            "data:application/json;base64,",
            Base64.encode(bytes(json))
        ));
    }

    // ═══════════════════════════════════════════
    //              INTERNAL HELPERS
    // ═══════════════════════════════════════════

    function _rankToString(uint8 rank) internal pure returns (string memory) {
        if (rank == 1) return "1ST";
        if (rank == 2) return "2ND";
        return "3RD";
    }

    function _rankToEmoji(uint8 rank) internal pure returns (string memory) {
        if (rank == 1) return unicode"🥇";
        if (rank == 2) return unicode"🥈";
        return unicode"🥉";
    }

    function _addressToString(address addr) internal pure returns (string memory) {
        bytes memory alphabet = "0123456789abcdef";
        bytes20 value = bytes20(addr);
        bytes memory str = new bytes(42);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2] = alphabet[uint8(value[i] >> 4)];
            str[3 + i * 2] = alphabet[uint8(value[i] & 0x0f)];
        }
        return string(str);
    }
}
