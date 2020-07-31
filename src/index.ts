import {binarize} from "./binarizer";
import {BitMatrix} from "./BitMatrix";
import {Chunks} from "./decoder/decodeData";
import {decode} from "./decoder/decoder";
import {screen_extract} from "./screen_extractor";
import {screen_locate, Point, Rect} from "./screen_locator";

import * as utils from '../tests/helpers';
import * as fs from 'fs';

export interface QRCode {
  binaryData: number[];
  data: string;
  chunks: Chunks;
  bounds: Rect;
}

function scan(matrix: BitMatrix): QRCode[] {
  const result: QRCode[] = [];
  const locations = screen_locate(matrix);
  if (!locations) {
    return null;
  }

  for (const location of locations) {
    const extracted = screen_extract(matrix, location.bounds, location.dimension);
    const decoded = decode(extracted);
    if (decoded) {
      result.push({
        binaryData: decoded.bytes,
        data: decoded.text,
        chunks: decoded.chunks,
        bounds: location.bounds,
      });
    }
  }
  return result;
}

export interface Options {
  inversionAttempts?: "dontInvert" | "onlyInvert" | "attemptBoth" | "invertFirst";
}

const defaultOptions: Options = {
  inversionAttempts: "attemptBoth",
};

function jsQR(data: Uint8ClampedArray, width: number, height: number, providedOptions: Options = {}): QRCode[] {

  const options = defaultOptions;
  Object.keys(options || {}).forEach(opt => { // Sad implementation of Object.assign since we target es5 not es6
    (options as any)[opt] = (providedOptions as any)[opt] || (options as any)[opt];
  });

  const shouldInvert = options.inversionAttempts === "attemptBoth" || options.inversionAttempts === "invertFirst";
  const tryInvertedFirst = options.inversionAttempts === "onlyInvert" || options.inversionAttempts === "invertFirst";
  const {binarized, inverted} = binarize(data, width, height, shouldInvert);
  const result = scan(tryInvertedFirst ? inverted : binarized);
  if (!result && (options.inversionAttempts === "attemptBoth" || options.inversionAttempts === "invertFirst")) {
    const result2 = scan(tryInvertedFirst ? binarized : inverted);
    result.push(...result2);
  }
  return result;
}

(jsQR as any).default = jsQR;
export default jsQR;
