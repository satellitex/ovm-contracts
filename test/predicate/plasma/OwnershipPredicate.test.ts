import chai from 'chai'
import {
  createMockProvider,
  deployContract,
  getWallets,
  solidity
} from 'ethereum-waffle'
import * as MockAdjudicationContract from '../../../build/contracts/MockAdjudicationContract.json'
import * as MockChallenge from '../../../build/contracts/MockChallenge.json'
import * as MockAtomicPredicate from '../../../build/contracts/MockAtomicPredicate.json'
import * as Utils from '../../../build/contracts/Utils.json'
import * as OwnershipPredicate from '../../../build/contracts/OwnershipPredicate.json'
import * as ethers from 'ethers'
import {
  encodeProperty,
  encodeString,
  randomAddress,
  encodeVariable,
  encodeConstant,
  encodeLabel
} from '../../helpers/utils'
import { deployPredicate } from '../../helpers/initializePredicateTest.js'

chai.use(solidity)
chai.use(require('chai-as-promised'))
const { expect, assert } = chai

describe('OwnershipPredicate', () => {
  let wallets = getWallets(createMockProvider())
  let wallet = wallets[0]
  let ownershipPredicate: ethers.Contract
  let mockChallenge: ethers.Contract
  const notAddress = randomAddress()
  const andAddress = randomAddress()
  const forAllSuchThatAddress = randomAddress()
  let isValidSignatureAddress: string

  beforeEach(async () => {
    const utils = await deployContract(wallet, Utils, [])
    const adjudicationContract = await deployContract(
      wallet,
      MockAdjudicationContract,
      [false]
    )
    const mockAtomicPredicate = await deployContract(
      wallet,
      MockAtomicPredicate,
      []
    )
    isValidSignatureAddress = mockAtomicPredicate.address
    mockChallenge = await deployContract(wallet, MockChallenge, [])
    ownershipPredicate = await deployPredicate(
      wallet,
      adjudicationContract,
      utils,
      OwnershipPredicate,
      {
        Not: notAddress,
        And: andAddress,
        ForAllSuchThat: forAllSuchThatAddress
      },
      { isValidSignatureAddress },
      [encodeString('secp256k1')]
    )
  })

  describe('isValidChallenge', () => {
    const transaction = '0x001234567890'
    it('return true', async () => {
      const ownershipProperty = {
        predicateAddress: ownershipPredicate.address,
        inputs: [encodeLabel('OwnershipT'), wallet.address, transaction]
      }
      const forAllSuchThatProperty = {
        predicateAddress: forAllSuchThatAddress,
        inputs: [
          '0x',
          encodeString('sig'),
          encodeProperty({
            predicateAddress: notAddress,
            inputs: [
              encodeProperty({
                predicateAddress: isValidSignatureAddress,
                inputs: [
                  transaction,
                  encodeVariable('sig'),
                  wallet.address,
                  encodeConstant('secp256k1')
                ]
              })
            ]
          })
        ]
      }
      const result = await mockChallenge.isValidChallenge(
        ownershipProperty,
        [],
        forAllSuchThatProperty
      )
      assert.isTrue(result)
    })

    it('throw exception with invalid challenge', async () => {
      const ownershipProperty = {
        predicateAddress: ownershipPredicate.address,
        inputs: [encodeLabel('OwnershipT'), wallet.address, transaction]
      }
      const forAllSuchThatProperty = {
        predicateAddress: forAllSuchThatAddress,
        inputs: [
          '0x',
          encodeString('sig'),
          encodeProperty({
            predicateAddress: notAddress,
            inputs: [
              encodeProperty({
                predicateAddress: isValidSignatureAddress,
                inputs: [
                  transaction,
                  encodeVariable('sig'),
                  wallets[1].address,
                  encodeConstant('secp256k1')
                ]
              })
            ]
          })
        ]
      }
      await expect(
        mockChallenge.isValidChallenge(
          ownershipProperty,
          [],
          forAllSuchThatProperty
        )
      ).to.be.revertedWith('_challenge must be valud child of game tree')
    })
  })

  describe('decide', () => {
    const transaction = '0x001234567890'
    const signature = '0x001234567890'
    it('return true', async () => {
      const result = await ownershipPredicate.decide(
        [encodeLabel('OwnershipT'), wallet.address, transaction],
        [signature]
      )
      assert.isTrue(result)
    })

    it('throw exception with invalid signature', async () => {
      await expect(
        ownershipPredicate.decide(
          [encodeLabel('OwnershipT'), wallet.address, encodeString('fail')],
          [signature]
        )
      ).to.be.reverted
    })
  })
})
