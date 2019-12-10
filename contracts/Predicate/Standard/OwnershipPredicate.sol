pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../../DataTypes.sol";
import "../../UniversalAdjudicationContract.sol";
import "../AtomicPredicate.sol";
import "../NotPredicate.sol";
import "../../Utils.sol";

/**
 * Ownership(owner, tx)
 */
contract Ownership {

    address notAddress;
    address txAddress;
    address equalAddress;
    address forAllSuchThatAddress;
    address isValidSignatureAddress;
    Utils utils;

    constructor(
        address _utilsAddress,
        address _notAddress,
        address _equalAddress,
        address _forAllSuchThatAddress,
        address _txAddress,
        address _isValidSignatureAddress
    ) public {
        utils = Utils(_utilsAddress);
        notAddress = _notAddress;
        equalAddress = _equalAddress;
        forAllSuchThatAddress = _forAllSuchThatAddress;
        txAddress = _txAddress;
        isValidSignatureAddress = _isValidSignatureAddress;
    }

    /**
    * @dev Validates a child node of the property in game tree.
    */
    function isValidChallenge(
        bytes[] memory _inputs,
        bytes memory _challengeInput,
        types.Property memory _challenge
    ) public returns (bool) {
        require(
            keccak256(abi.encode(getChild(_inputs, _challengeInput))) == keccak256(abi.encode(_challenge)),
            "_challenge must be valud child of game tree"
        );
        return true;
    }

    function getChild(bytes[] memory inputs, bytes memory challengeInput) private returns (types.Property memory) {
        return getChildOwnership(inputs, challengeInput);
    }

   /**
     * Gets child of Ownership(owner, tx).
     */
    function getChildOwnership(bytes[] memory _inputs, bytes memory challengeInput) private returns (types.Property memory) {
        bytes[] memory childInputs = new bytes[](6);
        childInputs[0] = _inputs[1];
        childInputs[1] = _inputs[0];
        childInputs[2] = bytes("__VARIABLE__sig");
        bytes[] memory notInputs = new bytes[](1);
        notInputs[0] = abi.encode(types.Property({
            predicateAddress: isValidSignatureAddress,
            inputs: childInputs
        }));
        bytes[] memory forAllSuchThatInputs = new bytes[](2);
        forAllSuchThatInputs[0] = bytes("sig");
        forAllSuchThatInputs[1] = abi.encode(types.Property({
            predicateAddress: notAddress,
            inputs: notInputs
        }));
        return types.Property({
            predicateAddress: forAllSuchThatAddress,
            inputs: forAllSuchThatInputs
        });
    }
}
