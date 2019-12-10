/* contract imports */
import chai from 'chai'
import {
  createMockProvider,
  deployContract,
  getWallets,
  solidity
} from 'ethereum-waffle'
import * as UniversalAdjudicationContract from '../build/UniversalAdjudicationContract.json'
import * as Utils from '../build/Utils.json'
import * as NotPredicate from '../build/NotPredicate.json'
import * as TestPredicate from '../build/TestPredicate.json'
import * as ethers from 'ethers'
const abi = new ethers.utils.AbiCoder()
import { increaseBlocks } from './helpers/increaseBlocks'
import { getGameIdFromProperty, OvmProperty } from './helpers/getGameId'

chai.use(solidity)
chai.use(require('chai-as-promised'))
const { expect, assert } = chai

describe('UniversalAdjudicationContract', () => {
  let provider = createMockProvider()
  let wallets = getWallets(provider)
  let wallet = wallets[0]
  let adjudicationContract: ethers.Contract
  let utils: ethers.Contract
  let testPredicate: ethers.Contract
  let notPredicate: ethers.Contract
  let trueProperty: OvmProperty,
    falseProperty: OvmProperty,
    notProperty: OvmProperty,
    notNotTrueProperty: OvmProperty,
    notNotNotTrueProperty: OvmProperty,
    notNotNotNotTrueProperty: OvmProperty,
    notFalseProperty: OvmProperty
  const Undecided = 0
  const True = 1
  const False = 2

  function encodeProperty(property: OvmProperty) {
    return abi.encode(
      ['tuple(address, bytes[])'],
      [[property.predicateAddress, property.inputs]]
    )
  }

  function createNotProperty(n: number, isTrue: boolean): OvmProperty {
    if (n == 0) {
      return {
        predicateAddress: testPredicate.address,
        inputs: isTrue ? ['0x01'] : []
      }
    }
    return {
      predicateAddress: notPredicate.address,
      inputs: [encodeProperty(createNotProperty(n - 1, isTrue))]
    }
  }

  beforeEach(async () => {
    utils = await deployContract(wallet, Utils, [])
    adjudicationContract = await deployContract(
      wallet,
      UniversalAdjudicationContract,
      [utils.address],
      { gasPrice: 8000000000, gasLimit: 4700000 }
    )
    notPredicate = await deployContract(wallet, NotPredicate, [
      adjudicationContract.address,
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
    falseProperty = {
      predicateAddress: testPredicate.address,
      inputs: []
    }
    notProperty = createNotProperty(1, true)
    notNotTrueProperty = createNotProperty(2, true)
    notNotNotTrueProperty = createNotProperty(3, true)
    notNotNotNotTrueProperty = createNotProperty(4, true)
    notFalseProperty = createNotProperty(1, false)
  })

  describe('claimProperty', () => {
    it('adds a claim', async () => {
      await adjudicationContract.claimProperty(notProperty)
      const claimId = getGameIdFromProperty(notProperty)
      const game = await adjudicationContract.getGame(claimId)

      // check newly stored property is equal to the claimed property
      assert.equal(game.property.predicateAddress, notProperty.predicateAddress)
      assert.equal(game.property.inputs[0], notProperty.inputs[0])
      assert.equal(game.decision, Undecided)
    })
    it('fails to add an already claimed property and throws Error', async () => {
      // claim a property
      await adjudicationContract.claimProperty(trueProperty)
      // check if the second call of the claimProperty function throws an error
      await expect(adjudicationContract.claimProperty(trueProperty)).to.be
        .reverted
    })
  })

  describe('challenge', () => {
    it('not(true) is challenged by true', async () => {
      await adjudicationContract.claimProperty(notProperty)
      await adjudicationContract.claimProperty(trueProperty)
      const gameId = getGameIdFromProperty(notProperty)
      const challengingGameId = getGameIdFromProperty(trueProperty)
      await adjudicationContract.challenge(
        gameId,
        [['0x', trueProperty]],
        challengingGameId
      )
      const game = await adjudicationContract.getGame(gameId)

      assert.equal(game.challenges.length, 1)
    })
    it('not(true) fail to be challenged by not(false)', async () => {
      await adjudicationContract.claimProperty(notProperty)
      await adjudicationContract.claimProperty(notFalseProperty)
      const gameId = getGameIdFromProperty(notProperty)
      const challengingGameId = getGameIdFromProperty(notFalseProperty)
      await expect(
        adjudicationContract.challenge(
          gameId,
          [['0x', notFalseProperty]],
          challengingGameId
        )
      ).to.be.reverted
    })
  })

  describe('makeTrueDecisionFromTrueGame', () => {
    it('not(not(true)) is true', async () => {
      await adjudicationContract.claimProperty(notNotTrueProperty)
      await adjudicationContract.claimProperty(trueProperty)
      await testPredicate.decideTrue(trueProperty.inputs)
      const gameId = getGameIdFromProperty(notNotTrueProperty)
      const challengingGameId = getGameIdFromProperty(trueProperty)
      await adjudicationContract.makeTrueDecisionFromTrueGame(
        gameId,
        [
          ['0x', notProperty],
          ['0x', trueProperty]
        ],
        challengingGameId
      )
      const game = await adjudicationContract.getGame(gameId)

      assert.equal(game.decision, true)
    })

    it('throw exception because not(not(false)) is false', async () => {
      const notNotFalseProperty = createNotProperty(2, false)
      await adjudicationContract.claimProperty(notNotFalseProperty)
      await adjudicationContract.claimProperty(falseProperty)
      const gameId = getGameIdFromProperty(notNotFalseProperty)
      const challengingGameId = getGameIdFromProperty(falseProperty)
      await expect(
        adjudicationContract.makeTrueDecisionFromTrueGame(
          gameId,
          [
            ['0x', notFalseProperty],
            ['0x', falseProperty]
          ],
          challengingGameId
        )
      ).to.be.revertedWith('condition property must be true')
    })

    it('throw exception with not empty challengeInput', async () => {
      await adjudicationContract.claimProperty(notNotNotNotTrueProperty)
      await adjudicationContract.claimProperty(trueProperty)
      await testPredicate.decideTrue(trueProperty.inputs)
      const gameId = getGameIdFromProperty(notNotNotNotTrueProperty)
      const challengingGameId = getGameIdFromProperty(trueProperty)
      await expect(
        adjudicationContract.makeTrueDecisionFromTrueGame(
          gameId,
          [
            ['0x', notNotNotTrueProperty],
            ['0x0', notNotTrueProperty],
            ['0x1', notProperty],
            ['0x0', trueProperty]
          ],
          challengingGameId
        )
      ).to.be.revertedWith('challengeInput must be empty')
    })

    it('throw exception with odd number of challeges', async () => {
      await adjudicationContract.claimProperty(notNotTrueProperty)
      await adjudicationContract.claimProperty(trueProperty)
      const gameId = getGameIdFromProperty(notNotTrueProperty)
      const challengingGameId = getGameIdFromProperty(trueProperty)
      await expect(
        adjudicationContract.makeTrueDecisionFromTrueGame(
          gameId,
          [
            ['0x', notProperty],
            ['0x', trueProperty],
            ['0x', trueProperty]
          ],
          challengingGameId
        )
      ).to.be.revertedWith('the number of challenges must be even')
    })

    it('throw exception with invalid first challenge', async () => {
      await adjudicationContract.claimProperty(notNotTrueProperty)
      await adjudicationContract.claimProperty(trueProperty)
      const gameId = getGameIdFromProperty(notNotTrueProperty)
      const challengingGameId = getGameIdFromProperty(trueProperty)
      await expect(
        adjudicationContract.makeTrueDecisionFromTrueGame(
          gameId,
          [
            ['0x', trueProperty],
            ['0x', trueProperty]
          ],
          challengingGameId
        )
      ).to.be.revertedWith(
        'The first item of challenges must be valid challenge of gameId'
      )
    })
  })

  describe('decideClaimToFalse', () => {
    it('not(true) decided false with a challenge by true', async () => {
      await adjudicationContract.claimProperty(notProperty)
      await adjudicationContract.claimProperty(trueProperty)
      const gameId = getGameIdFromProperty(notProperty)
      const challengingGameId = getGameIdFromProperty(trueProperty)
      await adjudicationContract.challenge(
        gameId,
        [['0x', trueProperty]],
        challengingGameId
      )
      await testPredicate.decideTrue(['0x01'])
      await adjudicationContract.decideClaimToFalse(gameId, challengingGameId)
      const game = await adjudicationContract.getGame(gameId)
      // game should be decided false
      assert.equal(game.decision, False)
    })
    it('not(false) fail to decided false without challenges', async () => {
      await adjudicationContract.claimProperty(notFalseProperty)
      await adjudicationContract.claimProperty(falseProperty)
      const gameId = getGameIdFromProperty(notFalseProperty)
      const challengingGameId = getGameIdFromProperty(falseProperty)
      await adjudicationContract.challenge(
        gameId,
        [['0x', falseProperty]],
        challengingGameId
      )
      await expect(
        adjudicationContract.decideClaimToFalse(gameId, challengingGameId)
      ).to.be.reverted
    })
  })

  describe('decideClaimToTrue', () => {
    it('not(true) decided true because there are no challenges', async () => {
      await adjudicationContract.claimProperty(notProperty)
      const gameId = getGameIdFromProperty(notProperty)
      // increase 10 blocks to pass dispute period
      await increaseBlocks(wallets, 10)
      await adjudicationContract.decideClaimToTrue(gameId)

      const game = await adjudicationContract.getGame(gameId)
      // game should be decided true
      assert.equal(game.decision, True)
    })
    it('fail to decided true because dispute period has not passed', async () => {
      await adjudicationContract.claimProperty(notProperty)
      const gameId = getGameIdFromProperty(notProperty)
      await expect(adjudicationContract.decideClaimToTrue(gameId)).to.be
        .reverted
    })
  })

  describe('setPredicateDecision', () => {
    it('decide bool(true) decided true', async () => {
      await adjudicationContract.claimProperty(trueProperty)
      const gameId = getGameIdFromProperty(trueProperty)
      await testPredicate.decideTrue(trueProperty.inputs)
      const game = await adjudicationContract.getGame(gameId)
      assert.equal(game.decision, True)
    })
    it('decide bool(false) decided false', async () => {
      await adjudicationContract.claimProperty(falseProperty)
      const gameId = getGameIdFromProperty(falseProperty)
      await testPredicate.decideFalse(falseProperty.inputs)
      const game = await adjudicationContract.getGame(gameId)
      assert.equal(game.decision, False)
    })
    it('fail to call setPredicateDecision directlly', async () => {
      await adjudicationContract.claimProperty(trueProperty)
      const gameId = getGameIdFromProperty(trueProperty)
      await expect(adjudicationContract.setPredicateDecision(gameId, true)).to
        .be.reverted
    })
  })

  describe('removeChallenge', () => {
    // We can remove "False" challenge from game.
    it('remove false from not(false)', async () => {
      await adjudicationContract.claimProperty(notFalseProperty)
      await adjudicationContract.claimProperty(falseProperty)
      const gameId = getGameIdFromProperty(notFalseProperty)
      const challengeGameId = getGameIdFromProperty(falseProperty)
      await adjudicationContract.challenge(
        gameId,
        [['0x', falseProperty]],
        challengeGameId
      )
      await testPredicate.decideFalse(falseProperty.inputs)
      await adjudicationContract.removeChallenge(gameId, challengeGameId)
      const game = await adjudicationContract.getGame(gameId)
      assert.equal(game.challenges.length, 0)
    })
    it('fail to remove undecided challenge', async () => {
      await adjudicationContract.claimProperty(notFalseProperty)
      await adjudicationContract.claimProperty(falseProperty)
      const gameId = getGameIdFromProperty(notFalseProperty)
      const challengeGameId = getGameIdFromProperty(falseProperty)
      await adjudicationContract.challenge(
        gameId,
        [['0x', falseProperty]],
        challengeGameId
      )
      await expect(
        adjudicationContract.removeChallenge(gameId, challengeGameId)
      ).to.be.reverted
    })
    it('fail to remove true from not(true)', async () => {
      await adjudicationContract.claimProperty(notProperty)
      await adjudicationContract.claimProperty(trueProperty)
      const gameId = getGameIdFromProperty(notProperty)
      const challengeGameId = getGameIdFromProperty(trueProperty)
      await adjudicationContract.challenge(
        gameId,
        [['0x', trueProperty]],
        challengeGameId
      )
      await testPredicate.decideTrue(trueProperty.inputs)
      await expect(
        adjudicationContract.removeChallenge(gameId, challengeGameId)
      ).to.be.reverted
    })
  })
})
