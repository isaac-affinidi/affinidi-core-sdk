import * as eccrypto from 'eccrypto-js'
import randomBytes from 'randombytes'
import { KeysService as CoreKeysService } from '@affinidi/common'

const jolocomIdentityKey = "m/73'/0'/0'/0" // eslint-disable-line

export default class KeysService extends CoreKeysService {
  /* istanbul ignore next: private method */
  private isValidPrivateKey(privateKey: any) {
    const { EC_GROUP_ORDER, ZERO32 } = eccrypto

    return privateKey.compare(ZERO32) > 0 && privateKey.compare(EC_GROUP_ORDER) < 0
  }

  getEphemKeyPair(): Buffer {
    let ephemPrivateKey = randomBytes(32)

    while (!this.isValidPrivateKey(ephemPrivateKey)) {
      ephemPrivateKey = randomBytes(32)
    }

    return ephemPrivateKey
  }

  async decryptByPrivateKey(encryptedDataString: string): Promise<any> {
    const { seed, didMethod } = this.decryptSeed()
    const seedHex = seed.toString('hex')
    const privateKey = CoreKeysService.getPrivateKey(seedHex, didMethod)

    const encryptedDataObject = JSON.parse(encryptedDataString)

    const { iv, ephemPublicKey, ciphertext, mac } = encryptedDataObject

    if (!iv || !ephemPublicKey || !ciphertext || !mac) {
      console.error('Can not decrypt message')
      return encryptedDataObject
    }

    const encryptedData = {
      iv: Buffer.from(iv, 'hex'),
      ephemPublicKey: Buffer.from(ephemPublicKey, 'hex'),
      ciphertext: Buffer.from(ciphertext, 'hex'),
      mac: Buffer.from(mac, 'hex'),
    }

    const dataBuffer = await eccrypto.decrypt(privateKey, encryptedData)

    return JSON.parse(dataBuffer.toString())
  }

  async encryptByPublicKey(publicKeyHex: string, data: any): Promise<string> {
    const dataString = JSON.stringify(data)
    const dataBuffer = Buffer.from(dataString)
    const publicKeyBuffer = Buffer.from(publicKeyHex, 'hex')

    const randomIv = randomBytes(16)
    const ephemPrivateKey = this.getEphemKeyPair()

    const options = { iv: randomIv, ephemPrivateKey }

    const encryptedData = await eccrypto.encrypt(publicKeyBuffer, dataBuffer, options)

    const { iv, ephemPublicKey, ciphertext, mac } = encryptedData

    const serializedEncryptedData = {
      iv: iv.toString('hex'),
      ephemPublicKey: ephemPublicKey.toString('hex'),
      ciphertext: ciphertext.toString('hex'),
      mac: mac.toString('hex'),
    }

    return JSON.stringify(serializedEncryptedData)
  }
}
