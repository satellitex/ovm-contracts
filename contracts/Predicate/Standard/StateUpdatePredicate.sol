pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../../DataTypes.sol";
import "../AtomicPredicate.sol";
import { UniversalAdjudicationContract } from "../../UniversalAdjudicationContract.sol";
import "../../Utils.sol";
import "../Atomic/IsContainedPredicate.sol";
import "../CompiledPredicate.sol";

/**
 * StateUpdatePredicate stands for the claim below.
 * def stateUpdate(token, range, block_number, so) :=
 * with Bytes() as tx {
 *   eq(tx.adderss, Tx.address)
 *   and eq(tx.0, token)
 *   and within(tx.1, range)
 *   and eq(tx.2, block_number)
 *   and eq(tx.3, su.3)
 *   and so()
 */
contract StateUpdatePredicate is CompiledPredicate {
    address notAddress;
    address txAddress;
    address equalAddress;
    address forAllSuchThatAddress;
    Utils utils;
    address isContainedPredicateAddress;
    bytes StateUpdateT = bytes("StateUpdateT");
    bytes StateUpdateTA = bytes("StateUpdateTA");
    UniversalAdjudicationContract adjudicationContract;

    constructor(
        address _utilsAddress,
        address _adjudicationContractAddress,
        address _notAddress,
        address _equalAddress,
        address _forAllSuchThatAddress,
        address _txAddress,
        address _isContainedPredicateAddress
    ) public {
        utils = Utils(_utilsAddress);
        adjudicationContract = UniversalAdjudicationContract(_adjudicationContractAddress);
        notAddress = _notAddress;
        equalAddress = _equalAddress;
        forAllSuchThatAddress = _forAllSuchThatAddress;
        txAddress = _txAddress;
        isContainedPredicateAddress = _isContainedPredicateAddress;
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
        if(keccak256(inputs[0]) == keccak256((StateUpdateTA))) {
            return getChildStateUpdateTA(utils.subArray(inputs, 1, inputs.length), challengeInput);
        }
        return getChildStateUpdateT(inputs, challengeInput);
    }

   /**
     * Gets child of StateUpdateT(StateUpdateT, token, range, block_number, so).
     */
    function getChildStateUpdateT(bytes[] memory _inputs, bytes memory challengeInput) private view returns (types.Property memory) {
        bytes[] memory childInputs = new bytes[](6);
        childInputs[0] = StateUpdateTA;
        childInputs[1] = bytes("__VARIABLE__tx");
        childInputs[2] = _inputs[0];
        childInputs[3] = _inputs[1];
        childInputs[4] = _inputs[2];
        childInputs[5] = _inputs[3];
        bytes[] memory notInputs = new bytes[](1);
        notInputs[0] = abi.encode(types.Property({
            predicateAddress: address(this),
            // It's hard to replace "__VARIABLE__tx" inside _inputs[4]
            // _inputs[4] is StateObject
            inputs: childInputs
        }));
        bytes[] memory forAllSuchThatInputs = new bytes[](3);
        forAllSuchThatInputs[0] = bytes("");
        forAllSuchThatInputs[1] = bytes("tx");
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
     * Gets child of StateUpdateTA(StateUpdateTA, tx, token, range, block_number, so).
     */
    function getChildStateUpdateTA(bytes[] memory _inputs, bytes memory _challengeInput) private view returns (types.Property memory) {
        types.Property memory transaction = abi.decode(_inputs[0], (types.Property));
        uint256 challengeInput = abi.decode(_challengeInput, (uint256));
        bytes[] memory notInputs = new bytes[](1);
        if(challengeInput == 0) {
            // tx.token == token
            bytes[] memory childInputs = new bytes[](2);
            childInputs[0] = transaction.inputs[0];
            childInputs[1] = _inputs[1];
            notInputs[0] = abi.encode(types.Property({
                predicateAddress: equalAddress,
                inputs: childInputs
            }));
        } else if(challengeInput == 1) {
            // tx.range within range
            bytes[] memory childInputs = new bytes[](2);
            childInputs[0] = transaction.inputs[1];
            childInputs[1] = _inputs[2];
            notInputs[0] = abi.encode(types.Property({
                predicateAddress: isContainedPredicateAddress,
                inputs: childInputs
            }));
        } else if(challengeInput == 2) {
            // tx.block_number is block_number
            bytes[] memory childInputs = new bytes[](2);
            childInputs[0] = transaction.inputs[2];
            childInputs[1] = _inputs[3];
            notInputs[0] = abi.encode(types.Property({
                predicateAddress: equalAddress,
                inputs: childInputs
            }));
        } else if(challengeInput == 3) {
            // so(tx)
            types.Property memory stateObject = abi.decode(_inputs[4], (types.Property));
            bytes[] memory childInputs = new bytes[](stateObject.inputs.length + 1);
            for(uint256 i = 0;i < stateObject.inputs.length;i++) {
                childInputs[i] = stateObject.inputs[i];
            }
            childInputs[stateObject.inputs.length] = _inputs[0];
            notInputs[0] = abi.encode(types.Property({
                predicateAddress: stateObject.predicateAddress,
                inputs: childInputs
            }));
        }
        return types.Property({
            predicateAddress: notAddress,
            inputs: notInputs
        });
    }

    function decideStateUpdateT(bytes[] memory _inputs, bytes[] memory _witness) public view returns (bool) {
        bytes[] memory childInputs = new bytes[](_inputs.length + 1);
        childInputs[0] = _witness[0];
        for(uint256 i = 0;i < _inputs.length;i++) {
            childInputs[i + 1] = _inputs[i];
        }
        return decideStateUpdateTA(childInputs, utils.subArray(_witness, 1, _witness.length));
    }

    function decideStateUpdateTA(bytes[] memory _inputs, bytes[] memory _witness) public view returns (bool) {
        types.Property memory transaction = abi.decode(_inputs[0], (types.Property));
        types.Property memory stateObject = abi.decode(_inputs[4], (types.Property));
        bytes[] memory inputsForIsContained = new bytes[](2);
        inputsForIsContained[0] = transaction.inputs[1];
        inputsForIsContained[1] = _inputs[2];
        bytes[] memory stateObjectInputs = new bytes[](stateObject.inputs.length + 1);
        for(uint256 i = 0;i < stateObject.inputs.length;i++) {
            stateObjectInputs[i] = stateObject.inputs[i];
        }
        stateObjectInputs[stateObject.inputs.length] = _inputs[0];
        require(transaction.predicateAddress == txAddress, "transaction.predicateAddress must be Tx.address");
        require(keccak256(transaction.inputs[0]) == keccak256(_inputs[1]), "token must be same");
        require(IsContainedPredicate(isContainedPredicateAddress).decide(inputsForIsContained), "range must be included");
        require(keccak256(transaction.inputs[2]) == keccak256(_inputs[3]), "input block number must be same");
        require(
            CompiledPredicate(stateObject.predicateAddress).decide(stateObjectInputs, _witness),
            "state object must be decided"
        );
        return true;
    }

    function decideTrue(bytes[] memory _inputs, bytes[] memory _witness) public {
        if(keccak256(_inputs[0]) == keccak256((StateUpdateTA))) {
            require(decideStateUpdateTA(utils.subArray(_inputs, 1, _inputs.length), _witness), "must decide true");
        } else {
            require(decideStateUpdateT(utils.subArray(_inputs, 1, _inputs.length), _witness), "must decide true");
        }
        types.Property memory property = types.Property({
            predicateAddress: address(this),
            inputs: _inputs
        });
        adjudicationContract.setPredicateDecision(utils.getPropertyId(property), true);
    }

}
