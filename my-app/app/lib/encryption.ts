'use client'
import * as CryptoJS from "crypto-js";

export function generateRandomPassword(length = 32): string {
  const array = new Uint8Array(length);

  if (
    typeof window !== "undefined" &&
    window.crypto &&
    typeof window.crypto.getRandomValues === "function"
  ) {
    window.crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }

  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function arrayBufferToWordArray(ab: ArrayBuffer): CryptoJS.lib.WordArray {
  const u8 = new Uint8Array(ab);
  const len = u8.length;
  const words: number[] = [];

  for (let i = 0; i < len; i += 4) {
    words.push(
      ((u8[i] || 0) << 24) |
        ((u8[i + 1] || 0) << 16) |
        ((u8[i + 2] || 0) << 8) |
        (u8[i + 3] || 0)
    );
  }

  return CryptoJS.lib.WordArray.create(words, len);
}

function wordArrayToUint8Array(wordArray: CryptoJS.lib.WordArray): Uint8Array {
  const { words, sigBytes } = wordArray;
  const u8 = new Uint8Array(sigBytes);

  let idx = 0;
  for (let i = 0; i < words.length && idx < sigBytes; i++) {
    const word = words[i];
    u8[idx++] = (word >> 24) & 0xff;
    if (idx >= sigBytes) break;
    u8[idx++] = (word >> 16) & 0xff;
    if (idx >= sigBytes) break;
    u8[idx++] = (word >> 8) & 0xff;
    if (idx >= sigBytes) break;
    u8[idx++] = word & 0xff;
  }

  return u8;
}

export function encryptFile(file: File, password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      const wordArray = arrayBufferToWordArray(arrayBuffer);
      const encrypted = CryptoJS.AES.encrypt(wordArray, password).toString();
      resolve(encrypted);
    };

    reader.readAsArrayBuffer(file);
  });
}

export function decryptToBlob(
  ciphertext: string,
  password: string,
  mimeType = "application/octet-stream"
): Blob {
  const decryptedWordArray = CryptoJS.AES.decrypt(ciphertext, password);
  const u8 = wordArrayToUint8Array(decryptedWordArray);

  const arrayBuffer = new ArrayBuffer(u8.byteLength);
  new Uint8Array(arrayBuffer).set(u8);

  return new Blob([arrayBuffer], { type: mimeType });
}
