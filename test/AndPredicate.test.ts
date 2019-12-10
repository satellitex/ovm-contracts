/* contract imports */
import chai from 'chai'
import {
  createMockProvider,
  deployContract,
  getWallets,
  solidity
} from 'ethereum-waffle'
import * as MockAdjudicationContract from '../build/MockAdjudicationContract.json'
import * as MockChallenge from '../build/MockChallenge.json'
import * as Utils from '../build/Utils.json'
import * as AndPredicate from '../build/AndPredicate.json'
import * as NotPredicate from '../build/NotPredicate.json'
import * as TestPredicate from '../build/TestPredicate.json'
import * as ethers from 'ethers'
const abi = new ethers.utils.AbiCoder()
import { OvmProperty } from './helpers/getGameId'

chai.use(solidity)
chai.use(require('chai-as-promised'))
const { expect, assert } = chai

describe('AndPredicate', () => {
  let provider = createMockProvider()
  let wallets = getWallets(provider)
  let wallet = wallets[0]
  let utils
  let testPredicate, andPredicate, notPredicate
  let mockChallenge: ethers.Contract
  let adjudicationContract: any
  let trueProperty: OvmProperty,
    andProperty: OvmProperty,
    notTrueProperty: OvmProperty,
    notFalseProperty: OvmProperty

  beforeEach(async () => {
    mockChallenge = await deployContract(wallet, MockChallenge, [])
    utils = await deployContract(wallet, Utils, [])
    adjudicationContract = await deployContract(
      wallet,
      MockAdjudicationContract,
      [utils.address]
    )
    notPredicate = await deployContract(wallet, NotPredicate, [
      adjudicationContract.address,
      utils.address
    ])
    andPredicate = await deployContract(wallet, AndPredicate, [
      adjudicationContract.address,
      notPredicate.address,
      utils.address
    ])
    testPredicate = await deployContract(wallet, TestPredicate, [
      adjudicationContract.address,
      utils.address
    ])
    trueProperty = {
      predicateAddress: testPredicate.address,
      inputs: ['0x01']
    }
    andProperty = {
      predicateAddress: andPredicate.address,
      inputs: [
        abi.encode(
          ['tuple(address, bytes[])'],
          [[testPredicate.address, ['0x01']]]
        ),
        abi.encode(['tuple(address, bytes[])'], [[testPredicate.address, []]])
      ]
    }
    notTrueProperty = {
      predicateAddress: notPredicate.address,
      inputs: [
        abi.encode(
          ['tuple(address, bytes[])'],
          [[testPredicate.address, ['0x01']]]
        )
      ]
    }
    notFalseProperty = {
      predicateAddress: notPredicate.address,
      inputs: [
        abi.encode(['tuple(address, bytes[])'], [[testPredicate.address, []]])
      ]
    }
  })

  describe('isValidChallenge', () => {
    it('suceed to challenge and(t, f) with not(t)', async () => {
      const challengeInput = abi.encode(['uint256'], [0])
      const result = await mockChallenge.isValidChallenge(
        andProperty,
        challengeInput,
        notTrueProperty
      )
      assert.isTrue(result)
    })
    it('suceed to challenge and(t, f) with not(f)', async () => {
      const challengeInput = abi.encode(['uint256'], [1])
      const result = await mockChallenge.isValidChallenge(
        andProperty,
        challengeInput,
        notFalseProperty
      )
      assert.isTrue(result)
    })
    it('fail to challenge and(t, f) with t', async () => {
      const challengeInput = abi.encode(['uint256'], [1])
      await expect(
        mockChallenge.isValidChallenge(
          andProperty,
          challengeInput,
          trueProperty
        )
      ).to.be.reverted
    })
    it('throw exception with empty challengeInput', async () => {
      await expect(
        mockChallenge.isValidChallenge(andProperty, '0x', notFalseProperty)
      ).to.be.reverted
    })
  })
})
