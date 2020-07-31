import { BitMatrix } from "../BitMatrix";
export interface Point {
    x: number;
    y: number;
}
export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface QRLocation {
    topRight: Point;
    bottomLeft: Point;
    topLeft: Point;
    alignmentPattern: Point;
    dimension: number;
    bounds: Rect;
}
export declare function screen_locate(matrix: BitMatrix): QRLocation[];
export interface HorizontalTimingPattern {
    row: number;
    left: number;
    width: number;
    finderPatternWidth: number;
    dataBitsInRow: number;
}
export interface QrAreaFromTimingPattern {
    x: number;
    y: number;
    width: number;
    height: number;
    finderPatternWidth: number;
    finderPatternHeight: number;
    dataBitsInRow: number;
}
export declare function locateHorizontalTimingPatterns(matrix: BitMatrix): HorizontalTimingPattern[];
export declare function locateTimingPatterns(matrix: BitMatrix): QrAreaFromTimingPattern[];
