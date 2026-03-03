// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockVRFCoordinator {
    uint256 public nextRequestId = 1;

    struct Request {
        address requester;
        uint32 numWords;
    }
    mapping(uint256 => Request) public requests;

    function requestRandomWords(
        bytes32,
        uint64,
        uint16,
        uint32,
        uint32 numWords
    ) external returns (uint256 requestId) {
        requestId = nextRequestId++;
        requests[requestId] = Request(msg.sender, numWords);
    }

    function fulfillRequest(uint256 requestId, uint256[] memory randomWords) external {
        Request memory req = requests[requestId];
        require(req.requester != address(0), "No such request");
        delete requests[requestId];

        (bool ok,) = req.requester.call(
            abi.encodeWithSignature(
                "rawFulfillRandomWords(uint256,uint256[])",
                requestId,
                randomWords
            )
        );
        require(ok, "Fulfill failed");
    }
}
