import { BitMatrix } from "../BitMatrix";

const MAX_FINDERPATTERNS_TO_SEARCH = 4;
const MIN_QUAD_RATIO = 0.5;
const MAX_QUAD_RATIO = 1.5;

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

const distance = (a: Point, b: Point) => Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);

function sum(values: number[]) {
  return values.reduce((a, b) => a + b);
}

// Takes three finder patterns and organizes them into topLeft, topRight, etc
function reorderFinderPatterns(pattern1: Point, pattern2: Point, pattern3: Point) {
  // Find distances between pattern centers
  const oneTwoDistance = distance(pattern1, pattern2);
  const twoThreeDistance = distance(pattern2, pattern3);
  const oneThreeDistance = distance(pattern1, pattern3);

  let bottomLeft: Point;
  let topLeft: Point;
  let topRight: Point;

  // Assume one closest to other two is B; A and C will just be guesses at first
  if (twoThreeDistance >= oneTwoDistance && twoThreeDistance >= oneThreeDistance) {
    [bottomLeft, topLeft, topRight] = [pattern2, pattern1, pattern3];
  } else if (oneThreeDistance >= twoThreeDistance && oneThreeDistance >= oneTwoDistance) {
    [bottomLeft, topLeft, topRight] = [pattern1, pattern2, pattern3];
  } else {
    [bottomLeft, topLeft, topRight] = [pattern1, pattern3, pattern2];
  }

  // Use cross product to figure out whether bottomLeft (A) and topRight (C) are correct or flipped in relation to topLeft (B)
  // This asks whether BC x BA has a positive z component, which is the arrangement we want. If it's negative, then
  // we've got it flipped around and should swap topRight and bottomLeft.
  if (((topRight.x - topLeft.x) * (bottomLeft.y - topLeft.y)) - ((topRight.y - topLeft.y) * (bottomLeft.x - topLeft.x)) < 0) {
    [bottomLeft, topRight] = [topRight, bottomLeft];
  }

  return { bottomLeft, topLeft, topRight };
}

// Computes the dimension (number of modules on a side) of the QR Code based on the position of the finder patterns
function computeDimension(topLeft: Point, topRight: Point, bottomLeft: Point, matrix: BitMatrix) {
  const moduleSize = (
    sum(countBlackWhiteRun(topLeft, bottomLeft, matrix, 5)) / 7 + // Divide by 7 since the ratio is 1:1:3:1:1
    sum(countBlackWhiteRun(topLeft, topRight, matrix, 5)) / 7 +
    sum(countBlackWhiteRun(bottomLeft, topLeft, matrix, 5)) / 7 +
    sum(countBlackWhiteRun(topRight, topLeft, matrix, 5)) / 7
  ) / 4;

  if (moduleSize < 1) {
    throw new Error("Invalid module size");
  }

  const topDimension = Math.round(distance(topLeft, topRight) / moduleSize);
  const sideDimension = Math.round(distance(topLeft, bottomLeft) / moduleSize);
  let dimension = Math.floor((topDimension + sideDimension) / 2) + 7;
  switch (dimension % 4) {
    case 0:
      dimension++;
      break;
    case 2:
      dimension--;
      break;
  }
  return { dimension, moduleSize };
}

// Takes an origin point and an end point and counts the sizes of the black white run from the origin towards the end point.
// Returns an array of elements, representing the pixel size of the black white run.
// Uses a variant of http://en.wikipedia.org/wiki/Bresenham's_line_algorithm
function countBlackWhiteRunTowardsPoint(origin: Point, end: Point, matrix: BitMatrix, length: number) {
  const switchPoints: Point[] = [{x: Math.floor(origin.x), y: Math.floor(origin.y)}];
  const steep = Math.abs(end.y - origin.y) > Math.abs(end.x - origin.x);

  let fromX: number;
  let fromY: number;
  let toX: number;
  let toY: number;
  if (steep) {
    fromX = Math.floor(origin.y);
    fromY = Math.floor(origin.x);
    toX = Math.floor(end.y);
    toY = Math.floor(end.x);
  } else {
    fromX = Math.floor(origin.x);
    fromY = Math.floor(origin.y);
    toX = Math.floor(end.x);
    toY = Math.floor(end.y);
  }

  const dx = Math.abs(toX - fromX);
  const dy = Math.abs(toY - fromY);
  let error = Math.floor(-dx / 2);
  const xStep = fromX < toX ? 1 : -1;
  const yStep = fromY < toY ? 1 : -1;

  let currentPixel = true;
  // Loop up until x == toX, but not beyond
  for (let x = fromX, y = fromY; x !== toX + xStep; x += xStep) {
    // Does current pixel mean we have moved white to black or vice versa?
    // Scanning black in state 0,2 and white in state 1, so if we find the wrong
    // color, advance to next state or end if we are in state 2 already
    const realX = steep ? y : x;
    const realY = steep ? x : y;
    if (matrix.get(realX, realY) !== currentPixel) {
      currentPixel = !currentPixel;
      switchPoints.push({x: realX, y: realY});
      if (switchPoints.length === length + 1) {
        break;
      }
    }
    error += dy;
    if (error > 0) {
      if (y === toY) {
        break;
      }
      y += yStep;
      error -= dx;
    }
  }
  const distances: number[] = [];
  for (let i = 0; i < length; i++) {
    if (switchPoints[i] && switchPoints[i + 1]) {
      distances.push(distance(switchPoints[i], switchPoints[i + 1]));
    } else {
      distances.push(0);
    }
  }
  return distances;
}

// Takes an origin point and an end point and counts the sizes of the black white run in the origin point
// along the line that intersects with the end point. Returns an array of elements, representing the pixel sizes
// of the black white run. Takes a length which represents the number of switches from black to white to look for.
function countBlackWhiteRun(origin: Point, end: Point, matrix: BitMatrix, length: number) {
  const rise = end.y - origin.y;
  const run = end.x - origin.x;

  const towardsEnd = countBlackWhiteRunTowardsPoint(origin, end, matrix, Math.ceil(length / 2));
  const awayFromEnd = countBlackWhiteRunTowardsPoint(origin, {x: origin.x - run, y: origin.y - rise}, matrix, Math.ceil(length / 2));

  const middleValue = towardsEnd.shift() + awayFromEnd.shift() - 1; // Substract one so we don't double count a pixel
  return awayFromEnd.concat(middleValue).concat(...towardsEnd);
}

// Takes in a black white run and an array of expected ratios. Returns the average size of the run as well as the "error" -
// that is the amount the run diverges from the expected ratio
function scoreBlackWhiteRun(sequence: number[], ratios: number[]) {
  const averageSize = sum(sequence) / sum(ratios);
  let error = 0;
  ratios.forEach((ratio, i) => {
    error += (sequence[i] - ratio * averageSize) ** 2;
  });

  return { averageSize, error };
}

// Takes an X,Y point and an array of sizes and scores the point against those ratios.
// For example for a finder pattern takes the ratio list of 1:1:3:1:1 and checks horizontal, vertical and diagonal ratios
// against that.
function scorePattern(point: Point, ratios: number[], matrix: BitMatrix) {
  try {
    const horizontalRun = countBlackWhiteRun(point, {x: -1, y: point.y}, matrix, ratios.length);
    const verticalRun = countBlackWhiteRun(point, {x: point.x, y: -1}, matrix, ratios.length);

    const topLeftPoint = {
      x: Math.max(0, point.x - point.y) - 1,
      y: Math.max(0, point.y - point.x) - 1,
    };
    const topLeftBottomRightRun = countBlackWhiteRun(point, topLeftPoint, matrix, ratios.length);

    const bottomLeftPoint = {
      x: Math.min(matrix.width, point.x + point.y) + 1,
      y: Math.min(matrix.height, point.y + point.x) + 1,
    };
    const bottomLeftTopRightRun = countBlackWhiteRun(point, bottomLeftPoint, matrix, ratios.length);

    const horzError = scoreBlackWhiteRun(horizontalRun, ratios);
    const vertError = scoreBlackWhiteRun(verticalRun, ratios);
    const diagDownError = scoreBlackWhiteRun(topLeftBottomRightRun, ratios);
    const diagUpError = scoreBlackWhiteRun(bottomLeftTopRightRun, ratios);

    const ratioError = Math.sqrt(horzError.error * horzError.error +
      vertError.error * vertError.error +
      diagDownError.error * diagDownError.error +
      diagUpError.error * diagUpError.error);

    const avgSize = (horzError.averageSize + vertError.averageSize + diagDownError.averageSize + diagUpError.averageSize) / 4;

    const sizeError = ((horzError.averageSize - avgSize) ** 2 +
      (vertError.averageSize - avgSize) ** 2 +
      (diagDownError.averageSize - avgSize) ** 2 +
      (diagUpError.averageSize - avgSize) ** 2) / avgSize;
    return ratioError + sizeError;
  } catch {
    return Infinity;
  }
}

function recenterLocation(matrix: BitMatrix, p: Point): Point {
  let leftX = Math.round(p.x);
  while (matrix.get(leftX, Math.round(p.y))) {
    leftX--;
  }
  let rightX = Math.round(p.x);
  while (matrix.get(rightX, Math.round(p.y))) {
    rightX++;
  }
  const x = (leftX + rightX) / 2;

  let topY = Math.round(p.y);
  while (matrix.get(Math.round(x), topY)) {
    topY--;
  }
  let bottomY = Math.round(p.y);
  while (matrix.get(Math.round(x), bottomY)) {
    bottomY++;
  }
  const y = (topY + bottomY) / 2;

  return { x, y };
}

interface Quad {
  top: {
    startX: number;
    endX: number;
    y: number;
  };
  bottom: {
    startX: number;
    endX: number;
    y: number;
  };
}

export function screen_locate(matrix: BitMatrix): QRLocation[] {
  const result: QRLocation[] = [];
  for (const pattern of locateTimingPatterns(matrix)) {
    const topLeft: Point = {x: pattern.x + pattern.finderPatternWidth / 2,
                            y: pattern.y + pattern.finderPatternHeight / 2};
    const topRight: Point = {x: pattern.x + pattern.width - pattern.finderPatternWidth / 2,
                             y: pattern.y + pattern.finderPatternHeight / 2};
    const bottomLeft: Point = {x: pattern.x + pattern.finderPatternWidth / 2,
                               y: pattern.y + pattern.height - pattern.finderPatternHeight / 2};
    const alignmentPattern: Point = {x: pattern.x + pattern.width - pattern.finderPatternWidth * 13 / 14,
                                     y: pattern.y + pattern.height - pattern.finderPatternHeight * 13 / 14};
    result.push({
      alignmentPattern,
      bottomLeft,
      dimension: pattern.dataBitsInRow,
      topLeft,
      topRight,
      bounds: {
        x: pattern.x,
        y: pattern.y,
        width: pattern.width,
        height: pattern.height,
      },
    });
  }
  if (result.length === 0) {
    return null;
  }

  return result;
}

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

function checkForHorizontalTimingPatternFromFinderPatternSize(
    matrix: BitMatrix,
    row: number,
    finderPatternLeftX: number,
    finderPatternWidth: number): HorizontalTimingPattern | null {
  let lastEdge = finderPatternLeftX + finderPatternWidth;
  let lastEdgeDark = false;
  const pixelMinWidth = Math.floor(finderPatternWidth / 7) - 1;
  const pixelMaxWidth = Math.ceil(finderPatternWidth / 7) + 1;
  const finderMinWidth = finderPatternWidth - 1;
  const finderMaxWidth = finderPatternWidth + 1;
  // console.assert(matrix.get(lastEdge, row));
  let dataBitsInRow = 7;
  for (let x = lastEdge + 1; x < matrix.width; x++) {
    const black = matrix.get(x, row);
    if (lastEdgeDark && !black || !lastEdgeDark && black) {
      const width = x - lastEdge;
      if (width >= pixelMinWidth && width <= pixelMaxWidth) {
        lastEdgeDark = black;
        lastEdge = x;
        dataBitsInRow ++;
        continue;
          // timing pattern pixel, keep looking
      } else if (width >= finderMinWidth && width <= finderMaxWidth) {
        if (lastEdgeDark) {
          return {
            row, left: finderPatternLeftX, width: x - finderPatternLeftX,
            finderPatternWidth,
            dataBitsInRow: dataBitsInRow + 7,
          };
        } else {
          break; // light block, this is not a timing pattern
        }
      } else {
        break; // not a timing pattern
      }
    }
  }
  return null;
}

export function locateHorizontalTimingPatterns(matrix: BitMatrix): HorizontalTimingPattern[] {
  // dark pixel v===true
  let timingPatterns: HorizontalTimingPattern[] = [];
  for (let y = 0; y <= matrix.height; y++) {
    let lastLightToDarkEdge = 0;
    for (let x = 0; x <= matrix.width; x++) {
      const black = matrix.get(x, y);
      if (black) {
        if (lastLightToDarkEdge < 0) {
          lastLightToDarkEdge = x;
        }
      } else {
        if (lastLightToDarkEdge >= 0) {
          const darkWidth = x - lastLightToDarkEdge;
          if (darkWidth > 7) { // Finder pattern minimum required pixels
            const timingPattern = checkForHorizontalTimingPatternFromFinderPatternSize(matrix, y, lastLightToDarkEdge, darkWidth);
            if (timingPattern) {
              timingPatterns = timingPatterns.filter(prev => !(
                  prev.row === timingPattern.row - 1 &&
                  prev.width === timingPattern.width &&
                  prev.left === timingPattern.left));
              // keep last line if height of timing pattern bigger than 1 px
              timingPatterns.push(timingPattern);
            }
          }
          lastLightToDarkEdge = -1;
        }
      }
    }
  }

  return timingPatterns;
}

function checkForTimingPatternFromHorizontalTimingPattern(
    matrix: BitMatrix,
    horizontalTimingPattern: HorizontalTimingPattern,
    column: number): QrAreaFromTimingPattern | null {
  let lastEdge = 0;
  let lastEdgeDark = false;
  const row = horizontalTimingPattern.row;
  for (let y = lastEdge + 1; y < matrix.height && y <= row + 1; y++) {
    const black2 = matrix.get(column, y);
    if (lastEdgeDark && !black2 || !lastEdgeDark && black2) {
      if (y >= row - 1 && lastEdgeDark) {
        const top = lastEdge;
        const finderPatternHeight = y - lastEdge;
        lastEdgeDark = false;
        lastEdge = y;
        // top for loop will never be called again, continue to look for timing pattern here
        const pixelMinHeight = Math.floor(finderPatternHeight / 7) - 1;
        const pixelMaxHeight = Math.ceil(finderPatternHeight / 7) + 1;
        const finderMinHeight = finderPatternHeight - 1;
        const finderMaxHeight = finderPatternHeight + 1;
        // console.assert(matrix.get(lastEdge, row));
        for (y++; y < matrix.height; y++) {
          const black = matrix.get(column, y);
          if (lastEdgeDark && !black || !lastEdgeDark && black) {
            const height = y - lastEdge;
            if (height >= pixelMinHeight && height <= pixelMaxHeight) {
              lastEdgeDark = black;
              lastEdge = y;
              continue;
                // timing pattern pixel, keep looking
            } else if (height >= finderMinHeight && height <= finderMaxHeight) {
              if (lastEdgeDark) {
                return {
                  x: horizontalTimingPattern.left,
                  y: top,
                  width: horizontalTimingPattern.width,
                  height: y - top,
                  finderPatternWidth: horizontalTimingPattern.finderPatternWidth,
                  finderPatternHeight,
                  dataBitsInRow: horizontalTimingPattern.dataBitsInRow,
                };
              } else {
                return null; // light block, this is not a timing pattern
              }
            } else {
              return null; // not a timing pattern
            }
          }
        }
        return null;
      }
      lastEdgeDark = black2;
      lastEdge = y;
    }
  }
  return null;
}

export function locateTimingPatterns(matrix: BitMatrix): QrAreaFromTimingPattern[] {
  const result: QrAreaFromTimingPattern[] = [];

  for (const pattern of locateHorizontalTimingPatterns(matrix)) {
    for (let delta = +1; delta >= -1; delta--) {
      const found = checkForTimingPatternFromHorizontalTimingPattern(
        matrix, pattern, pattern.left + pattern.finderPatternWidth - 1 + delta);
      if (found) {
        result.push(found);
        break;
      }
    }
  }

  return result;
}

function findAlignmentPattern(matrix: BitMatrix, alignmentPatternQuads: Quad[], topRight: Point, topLeft: Point, bottomLeft: Point) {
  // Now that we've found the three finder patterns we can determine the blockSize and the size of the QR code.
  // We'll use these to help find the alignment pattern but also later when we do the extraction.
  let dimension: number;
  let moduleSize: number;
  try {
    ({ dimension, moduleSize } = computeDimension(topLeft, topRight, bottomLeft, matrix));
  } catch (e) {
    return null;
  }

  // Now find the alignment pattern
  const bottomRightFinderPattern = { // Best guess at where a bottomRight finder pattern would be
    x: topRight.x - topLeft.x + bottomLeft.x,
    y: topRight.y - topLeft.y + bottomLeft.y,
  };
  const modulesBetweenFinderPatterns = ((distance(topLeft, bottomLeft) + distance(topLeft, topRight)) / 2 / moduleSize);
  const correctionToTopLeft = 1 - (3 / modulesBetweenFinderPatterns);
  const expectedAlignmentPattern = {
    x: topLeft.x + correctionToTopLeft * (bottomRightFinderPattern.x - topLeft.x),
    y: topLeft.y + correctionToTopLeft * (bottomRightFinderPattern.y - topLeft.y),
  };

  const alignmentPatterns = alignmentPatternQuads
    .map(q => {
      const x = (q.top.startX + q.top.endX + q.bottom.startX + q.bottom.endX) / 4;
      const y = (q.top.y + q.bottom.y + 1) / 2;
      if (!matrix.get(Math.floor(x), Math.floor(y))) {
        return;
      }

      const lengths = [q.top.endX - q.top.startX, q.bottom.endX - q.bottom.startX, (q.bottom.y - q.top.y + 1)];
      const size = sum(lengths) / lengths.length;
      const sizeScore = scorePattern({x: Math.floor(x), y: Math.floor(y)}, [1, 1, 1], matrix);
      const score = sizeScore + distance({x, y}, expectedAlignmentPattern);
      return { x, y, score };
    })
    .filter(v => !!v)
    .sort((a, b) => a.score - b.score);

  // If there are less than 15 modules between finder patterns it's a version 1 QR code and as such has no alignmemnt pattern
  // so we can only use our best guess.
  const alignmentPattern = modulesBetweenFinderPatterns >= 15 && alignmentPatterns.length ? alignmentPatterns[0] : expectedAlignmentPattern;

  return { alignmentPattern, dimension };
}
