import { normalize } from "./utils";

describe("normalize", () => {
  it("Changes string to lowercase", () => {
    const string = "Wonderwall ";

    expect(normalize(string)).toBe("wonderwall");
  });

  it("Does not change to lowercase when toLowerCase param is false", () => {
    const string = "Wonderwall";

    expect(normalize(string, false)).toBe("Wonderwall");
  });

  it("Removes whitespace from the end of strings", () => {
    const string = "Wonderwall ";

    expect(normalize(string)).toBe("wonderwall");
  });

  it("Removes spotify additions to album names", () => {
    const string = "Tarantula (2001 Remaster)";
    expect(normalize(string, false)).toBe("Tarantula");
  });

  it("Removes spotify additions to track names", () => {
    const string = "Black Nite Crash - 2001 Remaster";
    expect(normalize(string, false)).toBe("Black Nite Crash");
  });
});
