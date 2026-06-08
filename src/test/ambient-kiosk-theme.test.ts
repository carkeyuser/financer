import { describe, it, expect, beforeEach, afterEach } from "vitest"
import {
  disableAmbientKioskTheme,
  enableAmbientKioskTheme,
  isAmbientKioskActive,
} from "@/lib/ambient/kiosk-theme"

describe("ambient kiosk theme", () => {
  beforeEach(() => {
    document.documentElement.className = "dark"
    document.documentElement.removeAttribute("data-ambient-kiosk")
  })

  afterEach(() => {
    document.documentElement.className = ""
    document.documentElement.removeAttribute("data-ambient-kiosk")
  })

  it("enables kiosk flag and adds retrowave when missing", () => {
    const had = enableAmbientKioskTheme()
    expect(had).toBe(false)
    expect(isAmbientKioskActive()).toBe(true)
    expect(document.documentElement.classList.contains("retrowave")).toBe(true)
    expect(document.documentElement.classList.contains("dark")).toBe(true)
  })

  it("does not duplicate retrowave when already active", () => {
    document.documentElement.classList.add("retrowave")
    const had = enableAmbientKioskTheme()
    expect(had).toBe(true)
    disableAmbientKioskTheme(had)
    expect(document.documentElement.classList.contains("retrowave")).toBe(true)
    expect(isAmbientKioskActive()).toBe(false)
  })

  it("removes temporary retrowave on disable", () => {
    const had = enableAmbientKioskTheme()
    disableAmbientKioskTheme(had)
    expect(document.documentElement.classList.contains("retrowave")).toBe(false)
    expect(isAmbientKioskActive()).toBe(false)
  })
})
