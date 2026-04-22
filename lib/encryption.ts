import CryptoJS from 'crypto-js';
const SECRET = process.env.ENCRYPTION_SECRET!;
export const encrypt = (text: string) => CryptoJS.AES.encrypt(text, SECRET).toString();
export const decrypt = (cipher: string) => CryptoJS.AES.decrypt(cipher, SECRET).toString(CryptoJS.enc.Utf8);