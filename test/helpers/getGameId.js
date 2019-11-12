const utils = require('ethers/utils')
const abi = new utils.AbiCoder()

function getGameIdFromProperty(property) {
  return utils.keccak256(
    abi.encode(
      ['tuple(address, bytes[])'],
      [[property.predicateAddress, property.inputs]]
    )
  )
}

module.exports = {
  getGameIdFromProperty
}
