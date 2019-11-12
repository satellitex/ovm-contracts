/* contract imports */
const chai = require('chai');
const {createMockProvider, deployContract, getWallets, solidity, link} = require('ethereum-waffle');
const UniversalAdjudicationContract = require('../build/UniversalAdjudicationContract');
const Utils = require('../build/Utils');
const AndPredicate = require('../build/AndPredicate');
const NotPredicate = require('../build/NotPredicate');
const TestPredicate = require('../build/TestPredicate');
const ethers = require('ethers');
const abi = new ethers.utils.AbiCoder();
const { getGameIdFromProperty } = require('./helpers/getGameId')

chai.use(solidity);
chai.use(require('chai-as-promised'));
const {expect, assert} = chai;

describe('AndPredicate', () => {
  let provider = createMockProvider();
  let wallets = getWallets(provider);
  let wallet = wallets[0];
  let utils;
  let testPredicate, andPredicate, notPredicate, adjudicationContract;
  let trueProperty, andProperty;

  before(async () => {
		utils = await deployContract(wallet, Utils, []);
  })

  beforeEach(async () => {
    adjudicationContract = await deployContract(wallet, UniversalAdjudicationContract, [utils.address]);
    notPredicate = await deployContract(wallet, NotPredicate, [adjudicationContract.address]);
    andPredicate = await deployContract(wallet, AndPredicate, [adjudicationContract.address, notPredicate.address]);
    testPredicate = await deployContract(wallet, TestPredicate, [adjudicationContract.address]);
    trueProperty = {
      predicateAddress: testPredicate.address,
      inputs: ['0x01']
    };
    andProperty = {
      predicateAddress: andPredicate.address,
      inputs: [
        abi.encode(['tuple(address, bytes[])'], [[testPredicate.address, ['0x01']]]),
        abi.encode(['tuple(address, bytes[])'], [[testPredicate.address, []]]),
      ]
    };
    notTrueProperty = {
      predicateAddress: notPredicate.address,
      inputs: [abi.encode(['tuple(address, bytes[])'], [[testPredicate.address, ['0x01']]])]
    };
    notFalseProperty = {
      predicateAddress: notPredicate.address,
      inputs: [abi.encode(['tuple(address, bytes[])'], [[testPredicate.address, []]])]
    };
  });

  describe('isValidChallenge', () => {
    it('suceed to challenge and(t, f) with not(t)', async () => {
      const challengeInput = abi.encode(['uint256'], [0]);
      await adjudicationContract.claimProperty(andProperty);
      await adjudicationContract.claimProperty(notTrueProperty);
      const gameId = getGameIdFromProperty(andProperty);
      const challengingGameId = getGameIdFromProperty(notTrueProperty);
      await adjudicationContract.challenge(gameId, [challengeInput], challengingGameId);
      const game = await adjudicationContract.getGame(gameId);
      assert.equal(game.challenges.length, 1);
    });
    it('suceed to challenge and(t, f) with not(f)', async () => {
      const challengeInput = abi.encode(['uint256'], [1]);
      await adjudicationContract.claimProperty(andProperty);
      await adjudicationContract.claimProperty(notFalseProperty);
      const gameId = getGameIdFromProperty(andProperty);
      const challengingGameId = getGameIdFromProperty(notFalseProperty);
      await adjudicationContract.challenge(gameId, [challengeInput], challengingGameId);
      const game = await adjudicationContract.getGame(gameId);
      assert.equal(game.challenges.length, 1);
    });
    it('fail to challenge and(t, f) with t', async () => {
      const challengeInput = abi.encode(['uint256'], [1]);
      await adjudicationContract.claimProperty(andProperty);
      await adjudicationContract.claimProperty(trueProperty);
      const gameId = getGameIdFromProperty(andProperty);
      const challengingGameId = getGameIdFromProperty(trueProperty);
      await expect(adjudicationContract.challenge(gameId, [challengeInput], challengingGameId)).to.be.reverted;
    });
  });
});
