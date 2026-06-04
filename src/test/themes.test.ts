import { describe, it, expect } from "vitest"
import { APP_THEMES, cycleTheme, isAppTheme, resolveSonnerTheme } from "@/lib/constants/themes"

describe("themes", () => {
  it("defines light, dark, and retrowave", () => {
    expect(APP_THEMES).toEqual(["light", "dark", "retrowave"])
  })

  it("cycles through app themes", () => {
    expect(cycleTheme("light")).toBe("dark")
    expect(cycleTheme("dark")).toBe("retrowave")
    expect(cycleTheme("retrowave")).toBe("light")
  })

  it("falls back to light when cycling unknown theme", () => {
    expect(cycleTheme("system")).toBe("dark")
    expect(cycleTheme(undefined)).toBe("dark")
  })

  it("recognizes app themes", () => {
    expect(isAppTheme("retrowave")).toBe(true)
    expect(isAppTheme("system")).toBe(false)
  })

  it("maps retrowave to dark for sonner", () => {
    expect(resolveSonnerTheme("retrowave")).toBe("dark")
    expect(resolveSonnerTheme("light")).toBe("light")
    expect(resolveSonnerTheme("system")).toBe("system")
  })
})
