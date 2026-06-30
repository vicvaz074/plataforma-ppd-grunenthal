export const DAVARA_STORAGE_EVENT = "davara:storage"
export const BROWSER_STORAGE_COMPRESSION_PREFIX = "__davara_lz_utf16__:"

const STORAGE_COMPRESSION_MIN_LENGTH = 8_192

const SAME_TAB_EVENT_IGNORED_KEYS = new Set([
  "davara-notifications-v2",
  "davara-notifications-resolved-v2",
])

declare global {
  interface Window {
    __davaraStorageBridgeInstalled?: boolean
  }
}

type StorageMutationDetail = {
  action: "setItem" | "removeItem" | "clear"
  key: string | null
  oldValue?: string | null
  newValue?: string | null
}

function emitStorageMutation(detail: StorageMutationDetail) {
  window.dispatchEvent(new CustomEvent(DAVARA_STORAGE_EVENT, { detail }))
  window.dispatchEvent(new Event("storage"))
}

function compressToUtf16(input: string): string {
  if (!input) {
    return ""
  }

  return (
    compress(input, 15, (value) => String.fromCharCode(value + 32)) +
    " "
  )
}

function decompressFromUtf16(input: string): string | null {
  if (!input) {
    return ""
  }

  return decompress(input.length, 16_384, (index) => input.charCodeAt(index) - 32)
}

function compress(
  input: string,
  bitsPerChar: number,
  getCharFromInt: (value: number) => string,
): string {
  const dictionary = Object.create(null) as Record<string, number>
  const dictionaryToCreate = Object.create(null) as Record<string, true>
  const data: string[] = []
  let currentChar = ""
  let dataPosition = 0
  let dataValue = 0
  let dictSize = 3
  let enlargeIn = 2
  let numBits = 2
  let value = 0
  let currentWord = ""

  const writeBit = (bit: number) => {
    dataValue = (dataValue << 1) | bit

    if (dataPosition === bitsPerChar - 1) {
      dataPosition = 0
      data.push(getCharFromInt(dataValue))
      dataValue = 0
    } else {
      dataPosition += 1
    }
  }

  const writeValue = (bitCount: number, outputValue: number) => {
    let mutableValue = outputValue

    for (let index = 0; index < bitCount; index += 1) {
      writeBit(mutableValue & 1)
      mutableValue >>= 1
    }
  }

  const enlargeDictionary = () => {
    enlargeIn -= 1

    if (enlargeIn === 0) {
      enlargeIn = Math.pow(2, numBits)
      numBits += 1
    }
  }

  for (let index = 0; index < input.length; index += 1) {
    currentChar = input.charAt(index)

    if (!Object.prototype.hasOwnProperty.call(dictionary, currentChar)) {
      dictionary[currentChar] = dictSize
      dictSize += 1
      dictionaryToCreate[currentChar] = true
    }

    const combined = currentWord + currentChar

    if (Object.prototype.hasOwnProperty.call(dictionary, combined)) {
      currentWord = combined
      continue
    }

    if (Object.prototype.hasOwnProperty.call(dictionaryToCreate, currentWord)) {
      if (currentWord.charCodeAt(0) < 256) {
        writeValue(numBits, 0)
        writeValue(8, currentWord.charCodeAt(0))
      } else {
        writeValue(numBits, 1)
        writeValue(16, currentWord.charCodeAt(0))
      }

      enlargeDictionary()
      delete dictionaryToCreate[currentWord]
    } else {
      value = dictionary[currentWord]
      writeValue(numBits, value)
    }

    enlargeDictionary()
    dictionary[combined] = dictSize
    dictSize += 1
    currentWord = String(currentChar)
  }

  if (currentWord !== "") {
    if (Object.prototype.hasOwnProperty.call(dictionaryToCreate, currentWord)) {
      if (currentWord.charCodeAt(0) < 256) {
        writeValue(numBits, 0)
        writeValue(8, currentWord.charCodeAt(0))
      } else {
        writeValue(numBits, 1)
        writeValue(16, currentWord.charCodeAt(0))
      }

      enlargeDictionary()
      delete dictionaryToCreate[currentWord]
    } else {
      value = dictionary[currentWord]
      writeValue(numBits, value)
    }

    enlargeDictionary()
  }

  writeValue(numBits, 2)

  while (true) {
    dataValue <<= 1

    if (dataPosition === bitsPerChar - 1) {
      data.push(getCharFromInt(dataValue))
      break
    }

    dataPosition += 1
  }

  return data.join("")
}

function decompress(
  length: number,
  resetValue: number,
  getNextValue: (index: number) => number,
): string | null {
  const dictionary: Array<string | number> = [0, 1, 2]
  const result: string[] = []
  let enlargeIn = 4
  let dictSize = 4
  let numBits = 3
  let entry = ""
  let currentChar = ""
  let word = ""

  const data = {
    val: getNextValue(0),
    position: resetValue,
    index: 1,
  }

  const readBits = (bitCount: number) => {
    let bits = 0
    let maxPower = Math.pow(2, bitCount)
    let power = 1

    while (power !== maxPower) {
      const resb = data.val & data.position
      data.position >>= 1

      if (data.position === 0) {
        data.position = resetValue
        data.val = getNextValue(data.index)
        data.index += 1
      }

      bits |= (resb > 0 ? 1 : 0) * power
      power <<= 1
    }

    return bits
  }

  const next = readBits(2)

  switch (next) {
    case 0:
      currentChar = String.fromCharCode(readBits(8))
      break
    case 1:
      currentChar = String.fromCharCode(readBits(16))
      break
    case 2:
      return ""
  }

  dictionary[3] = currentChar
  word = currentChar
  result.push(currentChar)

  while (true) {
    if (data.index > length) {
      return null
    }

    const bits = readBits(numBits)
    let code = bits

    switch (code) {
      case 0:
        dictionary[dictSize] = String.fromCharCode(readBits(8))
        code = dictSize
        dictSize += 1
        enlargeIn -= 1
        break
      case 1:
        dictionary[dictSize] = String.fromCharCode(readBits(16))
        code = dictSize
        dictSize += 1
        enlargeIn -= 1
        break
      case 2:
        return result.join("")
    }

    if (enlargeIn === 0) {
      enlargeIn = Math.pow(2, numBits)
      numBits += 1
    }

    if (dictionary[code]) {
      entry = String(dictionary[code])
    } else if (code === dictSize) {
      entry = word + word.charAt(0)
    } else {
      return null
    }

    result.push(entry)
    dictionary[dictSize] = word + entry.charAt(0)
    dictSize += 1
    enlargeIn -= 1
    word = entry

    if (enlargeIn === 0) {
      enlargeIn = Math.pow(2, numBits)
      numBits += 1
    }
  }
}

export function isCompressedBrowserStorageValue(value: string | null): boolean {
  return typeof value === "string" && value.startsWith(BROWSER_STORAGE_COMPRESSION_PREFIX)
}

export function encodeBrowserStorageValue(value: string): string {
  const stringValue = String(value)

  if (
    stringValue.length < STORAGE_COMPRESSION_MIN_LENGTH ||
    isCompressedBrowserStorageValue(stringValue)
  ) {
    return stringValue
  }

  const compressedValue = BROWSER_STORAGE_COMPRESSION_PREFIX + compressToUtf16(stringValue)

  return compressedValue.length < stringValue.length ? compressedValue : stringValue
}

export function decodeBrowserStorageValue(value: string | null): string | null {
  if (!isCompressedBrowserStorageValue(value)) {
    return value
  }

  const compressedValue = value as string

  return (
    decompressFromUtf16(compressedValue.slice(BROWSER_STORAGE_COMPRESSION_PREFIX.length)) ??
    compressedValue
  )
}

export function ensureBrowserStorageEvents() {
  if (typeof window === "undefined" || window.__davaraStorageBridgeInstalled) {
    return
  }

  window.__davaraStorageBridgeInstalled = true

  const storageProto = Object.getPrototypeOf(window.localStorage) as Storage
  const originalGetItem = storageProto.getItem
  const originalSetItem = storageProto.setItem
  const originalRemoveItem = storageProto.removeItem
  const originalClear = storageProto.clear

  storageProto.getItem = function getItemWithCompression(key: string) {
    return decodeBrowserStorageValue(originalGetItem.call(this, key))
  }

  storageProto.setItem = function setItemWithEvents(key: string, value: string) {
    const stringValue = String(value)
    const oldValue =
      this === window.localStorage
        ? decodeBrowserStorageValue(originalGetItem.call(this, key))
        : null
    originalSetItem.call(this, key, encodeBrowserStorageValue(stringValue))

    if (
      this === window.localStorage &&
      oldValue !== stringValue &&
      !SAME_TAB_EVENT_IGNORED_KEYS.has(key)
    ) {
      emitStorageMutation({ action: "setItem", key, oldValue, newValue: stringValue })
    }
  }

  storageProto.removeItem = function removeItemWithEvents(key: string) {
    const oldValue =
      this === window.localStorage
        ? decodeBrowserStorageValue(originalGetItem.call(this, key))
        : null
    originalRemoveItem.call(this, key)

    if (this === window.localStorage && oldValue !== null) {
      emitStorageMutation({ action: "removeItem", key, oldValue, newValue: null })
    }
  }

  storageProto.clear = function clearWithEvents() {
    const hadValues = this === window.localStorage && this.length > 0
    originalClear.call(this)

    if (this === window.localStorage && hadValues) {
      emitStorageMutation({ action: "clear", key: null })
    }
  }
}
