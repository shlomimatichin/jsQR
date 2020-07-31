import {loadBinarized, loadPng} from "../../tests/helpers";
import {locateHorizontalTimingPatterns, locateTimingPatterns} from "./";
import jsQR from '../';

describe("screen locate", () => {
  // it("handles images with missing finder patterns", async () => {
  //   const binarized = await loadBinarized("./src/locator/test-data/missing-finder-patterns.png");
  //   expect(() => locate(binarized)).not.toThrow();
  //   expect(locate(binarized)).toEqual(null);
  // });

  // it('locates a "perfect" image', async () => {
  //   const binarized = await loadBinarized("./src/locator/test-data/perfect.png");
  //   expect(locate(binarized)[0]).toEqual({
  //     alignmentPattern: {x: 170.5, y: 170.5},
  //     bottomLeft: {x: 3.5, y: 173.5},
  //     dimension: 177,
  //     topLeft: {x: 3.5, y: 3.5},
  //     topRight: {x: 173.5, y: 3.5},
  //   });
  // });

  it("find several horizontal timing patterns", async () => {
    const binarized = await loadBinarized("./src/screen_locator/test-data/presentation.png");
    expect(locateHorizontalTimingPatterns(binarized)).toEqual(
      [{left: 1007, row: 363, width: 20},
       {left: 905, row: 391, width: 21},
       {left: 566, row: 554, width: 160},
       {left: 1180, row: 566, width: 87},
       {left: 444, row: 747, width: 67},
       {left: 1169, row: 755, width: 87}]);
  });
  it("find several timing patterns", async () => {
    const binarized = await loadBinarized("./src/screen_locator/test-data/presentation.png");
    expect(locateTimingPatterns(binarized)).toEqual(
      [{finderPatternHeight: 38, finderPatternWidth: 38,
        height: 160, width: 160, x: 566, y: 517},
       {finderPatternHeight: 20, finderPatternWidth: 20,
        height: 87, width: 87, x: 1180, y: 547},
       {finderPatternHeight: 15, finderPatternWidth: 15,
        height: 67, width: 67, x: 444, y: 733},
       {finderPatternHeight: 20, finderPatternWidth: 20,
        height: 87, width: 87, x: 1169, y: 736}]);
  });
  it("full cycle", async () => {
    const image = await loadPng("./src/screen_locator/test-data/presentation.png");
    const result = jsQR(image.data, image.width, image.height, {inversionAttempts: "dontInvert"});
    expect(result.map(r => ({data: r.data, bounds: r.bounds}))).toEqual([
      {bounds: {height: 162, width: 162, x: 565, y: 516},
       data: "engageli-op://\"{\\\"op\\\":\\\"PBM\\\"}\""},
      {bounds: {height: 89, width: 89, x: 1179, y: 546},
       data: "engageli-op://\"{\\\"op\\\":\\\"PBM\\\"}\""},
      {bounds: {height: 89, width: 89, x: 1168, y: 735},
       data: "engageli-op://\"{\\\"op\\\":\\\"PBM\\\"}\""}
    ]);
  });
});
