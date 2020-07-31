import { Chunks } from "./decoder/decodeData";
import { Rect } from "./screen_locator";
export interface QRCode {
    binaryData: number[];
    data: string;
    chunks: Chunks;
    bounds: Rect;
}
export interface Options {
    inversionAttempts?: "dontInvert" | "onlyInvert" | "attemptBoth" | "invertFirst";
}
declare function jsQR(data: Uint8ClampedArray, width: number, height: number, providedOptions?: Options): QRCode[];
export default jsQR;
