import chai from 'chai'
import {
  createMockProvider,
  deployContract,
  getWallets,
  solidity
} from 'ethereum-waffle'
import * as MockAdjudicationContract from '../../../build/MockAdjudicationContract.json'
import * as MockChallenge from '../../../build/MockChallenge.json'
import * as Utils from '../../../build/Utils.json'
import * as OwnershipPredicate from '../../../build/OwnershipPredicate.json'
import * as ethers from 'ethers'
import {
  encodeProperty,
  encodeString,
  randomAddress
} from '../../helpers/utils'

chai.use(solidity)
chai.use(require('chai-as-promised'))
const { expect, assert } = chai

describe('OwnershipPredicate', () => {
  let provider = createMockProvider()
  let wallets = getWallets(provider)
  let wallet = wallets[0]
  let ownershipPredicate: ethers.Contract
  let mockChallenge: ethers.Contract
  const notAddress = randomAddress()
  const equalAddress = randomAddress()
  const forAllSuchThatAddress = randomAddress()
  const txAddress = randomAddress()
  const isValidSignatureAddress = randomAddress()

  beforeEach(async () => {
    const utils = await deployContract(wallet, Utils, [])
    const adjudicationContract = await deployContract(
      wallet,
      MockAdjudicationContract,
      [false]
    )
    mockChallenge = await deployContract(wallet, MockChallenge, [])
    ownershipPredicate = await deployContract(wallet, OwnershipPredicate, [
      utils.address,
      adjudicationContract.address,
      notAddress,
      equalAddress,
      forAllSuchThatAddress,
      txAddress,
      isValidSignatureAddress
    ])
  })

  describe('isValidChallenge', () => {
    const transaction = '0x001234567890'
    it('return true', async () => {
      const ownershipProperty = {
        predicateAddress: ownershipPredicate.address,
        inputs: [wallet.address, transaction]
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
                  wallet.address,
                  encodeString('__VARIABLE__sig'),
                  encodeString('secp256k1')
                ]
              })
            ]
          })
        ]
      }
      const challengeInput = '0x'
      const result = await mockChallenge.isValidChallenge(
        ownershipProperty,
        challengeInput,
        forAllSuchThatProperty
      )
      assert.isTrue(result)
    })

    it('throw exception with invalid challenge', async () => {
      const ownershipProperty = {
        predicateAddress: ownershipPredicate.address,
        inputs: [wallet.address, transaction]
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
                  wallets[1].address,
                  encodeString('__VARIABLE__sig'),
                  encodeString('secp256k1')
                ]
              })
            ]
          })
        ]
      }
      const challengeInput = '0x'
      await expect(
        mockChallenge.isValidChallenge(
          ownershipProperty,
          challengeInput,
          forAllSuchThatProperty
        )
      ).to.be.revertedWith('_challenge must be valud child of game tree')
    })
  })
})
