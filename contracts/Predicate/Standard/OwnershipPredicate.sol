pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import {DataTypes as types} from "../../DataTypes.sol";
import "../AtomicPredicate.sol";
import { UniversalAdjudicationContract } from "../../UniversalAdjudicationContract.sol";
import "../NotPredicate.sol";
import "../../Utils.sol";
import "../../DepositContract.sol";
import "../Atomic/IsValidSignaturePredicate.sol";
import "../CompiledPredicate.sol";

/**
 * Ownership(owner, tx)
 */
contract OwnershipPredicate is CompiledPredicate {

    address notAddress;
    address txAddress;
    address equalAddress;
    address forAllSuchThatAddress;
    address isValidSignatureAddress;
    Utils utils;
    UniversalAdjudicationContract adjudicationContract;

    constructor(
        address _utilsAddress,
        address _adjudicationContractAddress,
        address _notAddress,
        address _equalAddress,
        address _forAllSuchThatAddress,
        address _txAddress,
        address _isValidSignatureAddress
    ) public {
        utils = Utils(_utilsAddress);
        adjudicationContract = UniversalAdjudicationContract(_adjudicationContractAddress);
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
    ) public view returns (bool) {
        require(
            keccak256(abi.encode(getChild(_inputs, _challengeInput))) == keccak256(abi.encode(_challenge)),
            "_challenge must be valud child of game tree"
        );
        return true;
    }

    function getChild(bytes[] memory inputs, bytes memory challengeInput) private view returns (types.Property memory) {
        return getChildOwnership(inputs, challengeInput);
    }

    /**
     * Gets child of Ownership(owner, tx).
     */
    function getChildOwnership(bytes[] memory _inputs, bytes memory challengeInput) private view returns (types.Property memory) {
        bytes[] memory childInputs = new bytes[](4);
        childInputs[0] = _inputs[1];
        childInputs[1] = _inputs[0];
        childInputs[2] = bytes("__VARIABLE__sig");
        childInputs[3] = bytes("secp256k1");
        bytes[] memory notInputs = new bytes[](1);
        notInputs[0] = abi.encode(types.Property({
            predicateAddress: isValidSignatureAddress,
            inputs: childInputs
        }));
        bytes[] memory forAllSuchThatInputs = new bytes[](3);
        // forAllSuchThatInputs[0] is hint data
        forAllSuchThatInputs[0] = bytes("");
        forAllSuchThatInputs[1] = bytes("sig");
        forAllSuchThatInputs[2] = abi.encode(types.Property({
            predicateAddress: notAddress,
            inputs: notInputs
        }));
        return types.Property({
            predicateAddress: forAllSuchThatAddress,
            inputs: forAllSuchThatInputs
        });
    }

    /**
     * finalizeExit
     * @dev finalize exit and withdraw asset with ownership state.
     */
    function finalizeExit(
        address depositContractAddress,
        types.Property memory _exitProperty,
        uint256 _depositedRangeId,
        address _owner
    ) public {
        DepositContract depositContract = DepositContract(depositContractAddress);
        types.Exit memory exit = depositContract.finalizeExit(_exitProperty, _depositedRangeId);
        address owner = utils.bytesToAddress(exit.stateUpdate.stateObject.inputs[0]);
        uint256 amount = exit.subrange.end - exit.subrange.start;
        require(msg.sender == owner, "msg.sender must be owner");
        depositContract.erc20().transfer(_owner, amount);
    }

    /**
     * inputs are StateUpdate which has ownership state object
     */
    function decide(bytes[] memory _inputs, bytes[] memory _witness) public view returns (bool) {
        bytes[] memory childInputs = new bytes[](4);
        childInputs[0] = _inputs[1];
        childInputs[1] = _inputs[0];
        childInputs[2] = _witness[0];
        childInputs[3] = bytes("secp256k1");
        require(IsValidSignaturePredicate(isValidSignatureAddress).decide(childInputs), "signature must be valid");
        return true;
    }

    function decideTrue(bytes[] memory _inputs, bytes[] memory _witness) public {
        require(decide(_inputs, _witness), "must decide true");
        types.Property memory property = types.Property({
            predicateAddress: address(this),
            inputs: _inputs
        });
        adjudicationContract.setPredicateDecision(utils.getPropertyId(property), true);
    }
}
