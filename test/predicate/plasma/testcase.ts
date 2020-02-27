import { ethers } from 'ethers'
import { createOwnershipTestCase } from './OwnershipPredicateTestCase'
import { createStateUpdateTestCase } from './StateUpdatePredicateTestCase'

interface ChallengeTestCase {
  name: string
  getProperty: (
    ownershipPredicate: ethers.Contract,
    compiledPredicate: ethers.Contract
  ) => void
  getChallenge: (
    ownershipPredicate: ethers.Contract,
    [isValidSignatureAddress]: string[],
    compiledPredicate: ethers.Contract
  ) => void
}

interface DecideTestCase {
  name: string
  createParameters: (
    compiledPredicate: ethers.Contract
  ) => { inputs: string[]; witnesses: string[] }
}

interface TestCase {
  name: string
  contract: any
  extraArgs: string[]
  validChallenges: ChallengeTestCase[]
  invalidChallenges: ChallengeTestCase[]
  decideTrueTestCases: DecideTestCase[]
  invalidDecideTestCases: DecideTestCase[]
}

export const createTestCases: (
  logicalConnectives: string[],
  wallet: ethers.Wallet
) => TestCase[] = (logicalConnectives: string[], wallet: ethers.Wallet) => [
  createOwnershipTestCase(logicalConnectives, wallet),
  createStateUpdateTestCase(logicalConnectives, wallet)
]
