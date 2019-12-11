import chai from 'chai'
import {
  createMockProvider,
  deployContract,
  getWallets,
  solidity
} from 'ethereum-waffle'
import * as MockChallenge from '../../../build/MockChallenge.json'
import * as Utils from '../../../build/Utils.json'
import * as StateUpdatePredicate from '../../../build/StateUpdatePredicate.json'
import * as ethers from 'ethers'
import {
  encodeProperty,
  encodeString,
  randomAddress
} from '../../helpers/getGameId'
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
  const notAddress = randomAddress()
  const equalAddress = randomAddress()
  const forAllSuchThatAddress = randomAddress()
  const txAddress = randomAddress()
  const ownershipAddress = randomAddress()
  const isContainedPredicateAddress = randomAddress()

  beforeEach(async () => {
    const utils = await deployContract(wallet, Utils, [])
    mockChallenge = await deployContract(wallet, MockChallenge, [])
    stateUpdatePredicate = await deployContract(wallet, StateUpdatePredicate, [
      utils.address,
      notAddress,
      equalAddress,
      forAllSuchThatAddress,
      txAddress,
      isContainedPredicateAddress
    ])
  })

  describe('isValidChallenge', () => {
    const token = randomAddress()
    const range = abi.encode(['tuple(uint256, uint256)'], [[100, 200]])
    const blockNumber = '0x00001200'
    const stateObject = encodeProperty({
      predicateAddress: ownershipAddress,
      inputs: [wallet.address]
    })
    const transaction = encodeProperty({
      predicateAddress: txAddress,
      inputs: [token, range, blockNumber, stateObject]
    })
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
            predicateAddress: ownershipAddress,
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
})
