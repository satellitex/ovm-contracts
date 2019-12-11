import chai from 'chai'
import {
  createMockProvider,
  deployContract,
  getWallets,
  solidity
} from 'ethereum-waffle'
import * as MockAdjudicationContract from '../../../build/MockAdjudicationContract.json'
import * as MockChallenge from '../../../build/MockChallenge.json'
import * as MockOwnershipPredicate from '../../../build/MockOwnershipPredicate.json'
import * as Utils from '../../../build/Utils.json'
import * as StateUpdatePredicate from '../../../build/StateUpdatePredicate.json'
import * as IsContainedPredicate from '../../../build/IsContainedPredicate.json'
import * as ethers from 'ethers'
import {
  encodeProperty,
  encodeString,
  randomAddress
} from '../../helpers/utils'
const abi = new ethers.utils.AbiCoder()

chai.use(solidity)
chai.use(require('chai-as-promised'))
const { expect, assert } = chai

describe('StateUpdatePredicate', () => {
  let provider = createMockProvider()
  let wallets = getWallets(provider)
  let wallet = wallets[0]
  let stateUpdatePredicate: ethers.Contract
  let mockChallenge: ethers.Contract
  let isContainedPredicate: ethers.Contract
  let mockOwnershipPredicate: ethers.Contract
  const notAddress = randomAddress()
  const equalAddress = randomAddress()
  const forAllSuchThatAddress = randomAddress()
  const txAddress = randomAddress()
  const token = randomAddress()
  const range = abi.encode(['tuple(uint256, uint256)'], [[100, 200]])
  const blockNumber = '0x00001200'
  let stateObject: any
  let transaction: any

  beforeEach(async () => {
    const utils = await deployContract(wallet, Utils, [])
    mockChallenge = await deployContract(wallet, MockChallenge, [])
    mockOwnershipPredicate = await deployContract(
      wallet,
      MockOwnershipPredicate,
      [randomAddress()]
    )
    stateObject = encodeProperty({
      predicateAddress: mockOwnershipPredicate.address,
      inputs: [wallet.address]
    })
    transaction = encodeProperty({
      predicateAddress: txAddress,
      inputs: [token, range, blockNumber, stateObject]
    })
    const adjudicationContract = await deployContract(
      wallet,
      MockAdjudicationContract,
      [false]
    )
    isContainedPredicate = await deployContract(wallet, IsContainedPredicate, [
      adjudicationContract.address,
      utils.address
    ])
    stateUpdatePredicate = await deployContract(
      wallet,
      StateUpdatePredicate,
      [
        utils.address,
        adjudicationContract.address,
        notAddress,
        equalAddress,
        forAllSuchThatAddress,
        txAddress,
        isContainedPredicate.address
      ],
      { gasPrice: 8000000000, gasLimit: 4700000 }
    )
  })

  describe('isValidChallenge', () => {
    it('return true with StateUpdateT', async () => {
      const stateUpdateProperty = {
        predicateAddress: stateUpdatePredicate.address,
        inputs: [token, range, blockNumber, stateObject]
      }
      const forAllSuchThatProperty = {
        predicateAddress: forAllSuchThatAddress,
        inputs: [
          '0x',
          encodeString('tx'),
          encodeProperty({
            predicateAddress: notAddress,
            inputs: [
              encodeProperty({
                predicateAddress: stateUpdatePredicate.address,
                inputs: [
                  encodeString('StateUpdateTA'),
                  encodeString('__VARIABLE__tx'),
                  token,
                  range,
                  blockNumber,
                  stateObject
                ]
              })
            ]
          })
        ]
      }
      const challengeInput = '0x'
      const result = await mockChallenge.isValidChallenge(
        stateUpdateProperty,
        challengeInput,
        forAllSuchThatProperty
      )
      assert.isTrue(result)
    })

    it('return true with StateUpdateTA, challengeInput is 0', async () => {
      const stateUpdateProperty = {
        predicateAddress: stateUpdatePredicate.address,
        inputs: [
          encodeString('StateUpdateTA'),
          transaction,
          token,
          range,
          blockNumber,
          stateObject
        ]
      }
      const notProperty = {
        predicateAddress: notAddress,
        inputs: [
          encodeProperty({
            predicateAddress: equalAddress,
            inputs: [token, token]
          })
        ]
      }
      const challengeInput = abi.encode(['uint256'], [0])
      const result = await mockChallenge.isValidChallenge(
        stateUpdateProperty,
        challengeInput,
        notProperty
      )
      assert.isTrue(result)
    })

    it('return true with StateUpdateTA, challengeInput is 3', async () => {
      const stateUpdateProperty = {
        predicateAddress: stateUpdatePredicate.address,
        inputs: [
          encodeString('StateUpdateTA'),
          transaction,
          token,
          range,
          blockNumber,
          stateObject
        ]
      }
      const notProperty = {
        predicateAddress: notAddress,
        inputs: [
          encodeProperty({
            predicateAddress: mockOwnershipPredicate.address,
            inputs: [wallet.address, transaction]
          })
        ]
      }
      const challengeInput = abi.encode(['uint256'], [3])
      const result = await mockChallenge.isValidChallenge(
        stateUpdateProperty,
        challengeInput,
        notProperty
      )
      assert.isTrue(result)
    })

    it('throw exception with invalid challenge', async () => {
      const stateUpdateProperty = {
        predicateAddress: stateUpdatePredicate.address,
        inputs: [
          encodeString('StateUpdateTA'),
          transaction,
          token,
          range,
          blockNumber,
          stateObject
        ]
      }
      const equalProperty = {
        predicateAddress: equalAddress,
        inputs: [token, token]
      }
      const challengeInput = abi.encode(['uint256'], [1])
      await expect(
        mockChallenge.isValidChallenge(
          stateUpdateProperty,
          challengeInput,
          equalProperty
        )
      ).to.be.revertedWith('_challenge must be valud child of game tree')
    })
  })

  describe('decideTrue', () => {
    it('suceed to prove that StateUpdateT is true', async () => {
      const stateUpdateProperty = {
        predicateAddress: stateUpdatePredicate.address,
        inputs: [token, range, blockNumber, stateObject]
      }
      await stateUpdatePredicate.decideTrue(stateUpdateProperty.inputs, [
        transaction
      ])
    })

    it('suceed to prove that StateUpdateTA is true', async () => {
      const stateUpdateProperty = {
        predicateAddress: stateUpdatePredicate.address,
        inputs: [
          encodeString('StateUpdateTA'),
          transaction,
          token,
          range,
          blockNumber,
          stateObject
        ]
      }
      await stateUpdatePredicate.decideTrue(stateUpdateProperty.inputs, [])
    })

    it('fail to decide with invalid range', async () => {
      const invalidRange = abi.encode(['tuple(uint256, uint256)'], [[150, 250]])
      const stateUpdateProperty = {
        predicateAddress: stateUpdatePredicate.address,
        inputs: [
          encodeString('StateUpdateTA'),
          transaction,
          token,
          invalidRange,
          blockNumber,
          stateObject
        ]
      }
      await expect(
        stateUpdatePredicate.decideTrue(stateUpdateProperty.inputs, [])
      ).to.be.revertedWith('range must contain subrange')
    })
  })
})
