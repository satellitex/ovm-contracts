import * as OwnershipPredicate from '../../../build/contracts/OwnershipPredicate.json'
import * as StateUpdatePredicate from '../../../build/contracts/StateUpdatePredicate.json'
import { ethers } from 'ethers'
import {
  encodeLabel,
  encodeString,
  encodeProperty,
  encodeVariable,
  encodeConstant,
  randomAddress,
  encodeRange,
  encodeInteger
} from '../../helpers/utils'

const transaction = '0x001234567890'
const signature = '0x001234567890'
const txAddress = randomAddress()
const token = ethers.constants.AddressZero
const range = encodeRange(0, 100)
const blockNumber = encodeInteger(10)

export const createTestCases = (
  [notAddress, andAddress, forAllSuchThatAddress]: string[],
  wallet: ethers.Wallet
) => [
  {
    name: 'OwnershipPredicate',
    contract: OwnershipPredicate,
    extraArgs: [encodeString('secp256k1')],
    validChallenges: [
      {
        name: 'OwnershipT',
        getProperty: (
          ownershipPredicate: ethers.Contract,
          compiledPredicate: ethers.Contract
        ) => {
          return {
            predicateAddress: ownershipPredicate.address,
            inputs: [encodeLabel('OwnershipT'), wallet.address, transaction]
          }
        },
        getChallenge: (
          ownershipPredicate: ethers.Contract,
          [isValidSignatureAddress]: string[],
          compiledPredicate: ethers.Contract
        ) => {
          return {
            predicateAddress: forAllSuchThatAddress,
            inputs: [
              '0x',
              encodeString('v0'),
              encodeProperty({
                predicateAddress: notAddress,
                inputs: [
                  encodeProperty({
                    predicateAddress: isValidSignatureAddress,
                    inputs: [
                      transaction,
                      encodeVariable('v0'),
                      wallet.address,
                      encodeConstant('secp256k1')
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
        name: 'OwnershipT',
        createParameters: (compiledPredicate: ethers.Contract) => {
          return {
            inputs: [encodeLabel('OwnershipT'), wallet.address, transaction],
            witnesses: [signature]
          }
        }
      }
    ]
  },
  {
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
          [isValidSignatureAddress]: string[],
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
    ]
  }
]
