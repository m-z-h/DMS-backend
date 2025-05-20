const forge = require('node-forge');
const CryptoJS = require('crypto-js');

/**
 * Simplified ABE implementation for hospital data sharing
 * In a production environment, you would use a dedicated ABE library
 */
class ABEEncryption {
  /**
   * Generate encryption policy
   * @param {Object} attributes - Key-value pairs of attributes
   * @returns {String} - Policy string
   */
  static generatePolicy(attributes) {
    // Convert attributes to policy string
    // Format: (hospital:manipalhospital.com AND department:Cardiology)
    const conditions = Object.entries(attributes).map(
      ([key, value]) => `${key}:${value}`
    );
    
    return `(${conditions.join(' AND ')})`;
  }
  
  /**
   * Encrypt data using attribute-based policy
   * @param {Object} data - Data to encrypt
   * @param {Object} attributes - Attribute policy for encryption
   * @returns {Object} - Encrypted data with policy
   */
  static encrypt(data, attributes) {
    // Generate a random AES key
    const aesKey = forge.random.getBytesSync(32); // 256 bits
    
    // Generate the policy from attributes
    const policy = this.generatePolicy(attributes);
    
    // Encrypt the data with AES
    const encryptedData = CryptoJS.AES.encrypt(
      JSON.stringify(data),
      CryptoJS.enc.Hex.parse(forge.util.bytesToHex(aesKey)),
      {
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }
    ).toString();
    
    // In a real ABE system, the key would be encrypted with the policy
    // Here we're simulating by storing the policy with the encrypted key
    const encryptedKey = forge.util.bytesToHex(aesKey);
    
    return {
      encryptedData,
      encryptedKey,
      policy,
      iv: forge.random.getBytesSync(16).toString('hex'),
      isEncrypted: true
    };
  }
  
  /**
   * Decrypt data if user attributes satisfy the policy
   * @param {Object} encryptedObject - Object with encrypted data and policy
   * @param {Object} userAttributes - User attributes
   * @returns {Object|null} - Decrypted data or null if policy not satisfied
   */
  static decrypt(encryptedObject, userAttributes) {
    const { encryptedData, encryptedKey, policy, isEncrypted } = encryptedObject;
    
    if (!isEncrypted) {
      return JSON.parse(encryptedData);
    }
    
    // Parse the policy
    const policyAttributes = this.parsePolicy(policy);
    
    // Check if user attributes satisfy the policy
    if (this.satisfiesPolicy(policyAttributes, userAttributes)) {
      // In a real ABE system, the key would be decrypted using the attributes
      // Here we're simulating by retrieving the key if policy is satisfied
      const aesKey = forge.util.hexToBytes(encryptedKey);
      
      // Decrypt the data
      const decryptedData = CryptoJS.AES.decrypt(
        encryptedData,
        CryptoJS.enc.Hex.parse(forge.util.bytesToHex(aesKey)),
        {
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7
        }
      ).toString(CryptoJS.enc.Utf8);
      
      return JSON.parse(decryptedData);
    }
    
    return null; // Policy not satisfied
  }
  
  /**
   * Parse policy string into attributes object
   * @param {String} policy - Policy string
   * @returns {Object} - Attributes object
   */
  static parsePolicy(policy) {
    // Remove parentheses and split by AND
    const cleanPolicy = policy.replace(/[()]/g, '');
    const conditions = cleanPolicy.split(' AND ');
    
    // Convert conditions to attributes object
    const attributes = {};
    conditions.forEach(condition => {
      const [key, value] = condition.split(':');
      attributes[key] = value;
    });
    
    return attributes;
  }
  
  /**
   * Check if user attributes satisfy policy
   * @param {Object} policyAttributes - Required attributes from policy
   * @param {Object} userAttributes - User's attributes
   * @returns {Boolean} - True if policy is satisfied
   */
  static satisfiesPolicy(policyAttributes, userAttributes) {
    // Check that all required attributes are present and match
    return Object.entries(policyAttributes).every(([key, value]) => {
      return userAttributes[key] && userAttributes[key] === value;
    });
  }
}

module.exports = ABEEncryption; 