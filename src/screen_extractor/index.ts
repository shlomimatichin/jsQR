import {BitMatrix} from "../BitMatrix";
import {Rect} from "../screen_locator";

export function screen_extract(image: BitMatrix, bounds: Rect, dataBitsInRow: number): BitMatrix {
  const matrix = BitMatrix.createEmpty(dataBitsInRow, dataBitsInRow);
  for (let y = 0; y < dataBitsInRow; y++) {
    for (let x = 0; x < dataBitsInRow; x++) {
      const xValue = x + 0.5;
      const yValue = y + 0.5;
      const sourcePixel = image.get(Math.round(xValue * bounds.width / dataBitsInRow + bounds.x),
                                    Math.round(yValue * bounds.height / dataBitsInRow + bounds.y));
      matrix.set(x, y, sourcePixel);
    }
  }
  return matrix;
}
