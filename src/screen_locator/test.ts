import {loadBinarized} from "../../tests/helpers";
import {locate, locateHorizontalTimingPatterns} from "./";

describe("screen locate", () => {
  it("handles images with missing finder patterns", async () => {
    const binarized = await loadBinarized("./src/locator/test-data/missing-finder-patterns.png");
    expect(() => locate(binarized)).not.toThrow();
    expect(locate(binarized)).toEqual(null);
  });

  it('locates a "perfect" image', async () => {
    const binarized = await loadBinarized("./src/locator/test-data/perfect.png");
    expect(locate(binarized)[0]).toEqual({
      alignmentPattern: {x: 170.5, y: 170.5},
      bottomLeft: {x: 3.5, y: 173.5},
      dimension: 177,
      topLeft: {x: 3.5, y: 3.5},
      topRight: {x: 173.5, y: 3.5},
    });
  });

  it("find several qr codes", async () => {
    const binarized = await loadBinarized("./src/screen_locator/test-data/presentation.png");
    expect(locateHorizontalTimingPatterns(binarized)).toEqual(
      [{"left": 1007, "row": 363, "width": 20},
       {"left": 905, "row": 391, "width": 21},
       {"left": 566, "row": 554, "width": 160},
       {"left": 1180, "row": 566, "width": 87},
       {"left": 444, "row": 747, "width": 67},
       {"left": 1169, "row": 755, "width": 87}]);
    });
  });
});
