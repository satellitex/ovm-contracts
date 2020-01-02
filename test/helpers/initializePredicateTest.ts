import { deployContract } from 'ethereum-waffle'
import { randomAddress } from './utils'
import { ethers } from 'ethers'

export async function deployPredicate(
  wallet: ethers.Wallet,
  adjudicationContract: ethers.Contract,
  utils: ethers.Contract,
  predicateJson: any,
  logicalConnectives: { [key: string]: string },
  atomicPredicates: { [key: string]: string },
  args: string[]
): Promise<ethers.Contract> {
  const predicate = await deployContract(wallet, predicateJson, [
    adjudicationContract.address,
    utils.address,
    logicalConnectives['Not'],
    logicalConnectives['And'],
    logicalConnectives['ForAllSuchThat'],
    ...args
  ])
  const payoutContractAddress = randomAddress()
  await predicate.setPredicateAddresses(
    getAddress('isLessThanAddress'),
    getAddress('equalAddress'),
    getAddress('isValidSignatureAddress'),
    getAddress('isContainedAddress'),
    getAddress('verifyInclusionAddress'),
    getAddress('isSameAmountAddress'),
    payoutContractAddress
  )

  return predicate

  function getAddress(name: string) {
    return atomicPredicates[name] || randomAddress()
  }
}
