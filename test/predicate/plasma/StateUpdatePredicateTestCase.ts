import * as StateUpdatePredicate from '../../../build/contracts/StateUpdatePredicate.json'
import { ethers } from 'ethers'
import {
  encodeLabel,
  encodeString,
  encodeProperty,
  encodeVariable,
  randomAddress,
  encodeRange,
  encodeInteger
} from '../../helpers/utils'

const txAddress = randomAddress()
const token = ethers.constants.AddressZero
const range = encodeRange(0, 100)
const blockNumber = encodeInteger(10)

export const createStateUpdateTestCase = (
  [notAddress, andAddress, forAllSuchThatAddress]: string[],
  wallet: ethers.Wallet
) => {
  return {
    name: 'StateUpdatePredicate',
    contract: StateUpdatePredicate,
    extraArgs: [txAddress],
    validChallenges: [
      {
        name: 'StateUpdateT',
        getProperty: (
          stateUpdatePredicate: ethers.Contract,
          compiledPredicate: ethers.Contract
        ) => {
          return {
            predicateAddress: stateUpdatePredicate.address,
            inputs: [
              encodeLabel('StateUpdateT'),
              token,
              range,
              blockNumber,
              encodeProperty({
                predicateAddress: compiledPredicate.address,
                inputs: ['0x01']
              })
            ]
          }
        },
        getChallenge: (
          stateUpdatePredicate: ethers.Contract,
          mockAtomicPredicateAddress: string,
          compiledPredicate: ethers.Contract
        ) => {
          return {
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
                      encodeLabel('StateUpdateTA'),
                      encodeVariable('tx'),
                      token,
                      range,
                      blockNumber,
                      encodeProperty({
                        predicateAddress: compiledPredicate.address,
                        inputs: ['0x01']
                      })
                    ]
                  })
                ]
              })
            ]
          }
        }
      }
    ],
    invalidChallenges: [
      {
        name: 'invalid StateUpdateT',
        getProperty: (
          stateUpdatePredicate: ethers.Contract,
          compiledPredicate: ethers.Contract
        ) => {
          return {
            predicateAddress: stateUpdatePredicate.address,
            inputs: [
              encodeLabel('StateUpdateT'),
              token,
              range,
              blockNumber,
              encodeProperty({
                predicateAddress: compiledPredicate.address,
                inputs: ['0x01']
              })
            ]
          }
        },
        getChallenge: (
          stateUpdatePredicate: ethers.Contract,
          mockAtomicPredicateAddress: string,
          compiledPredicate: ethers.Contract
        ) => {
          return {
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
                      encodeLabel('StateUpdateTA'),
                      encodeVariable('tx'),
                      token,
                      range,
                      blockNumber,
                      encodeProperty({
                        predicateAddress: compiledPredicate.address,
                        inputs: ['0x02']
                      })
                    ]
                  })
                ]
              })
            ]
          }
        }
      }
    ],
    decideTrueTestCases: [
      {
        name: 'StateUpdateT',
        createParameters: (compiledPredicate: ethers.Contract) => {
          const stateObject = encodeProperty({
            predicateAddress: compiledPredicate.address,
            inputs: ['0x01']
          })
          const tx = encodeProperty({
            predicateAddress: txAddress,
            inputs: [token, range, blockNumber, stateObject]
          })
          return {
            inputs: [
              encodeLabel('StateUpdateT'),
              token,
              range,
              blockNumber,
              stateObject
            ],
            witnesses: [tx, '0x00', '0x00', '0x00']
          }
        }
      }
    ],
    invalidDecideTestCases: []
  }
}
