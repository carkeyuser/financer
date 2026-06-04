import { describe, it, expect, vi, beforeEach } from "vitest"
import { render } from "@testing-library/react"
import { useTheme } from "next-themes"
import { RetrowaveAmbience } from "@/components/theme/RetrowaveAmbience"

vi.mock("next-themes", () => ({
  useTheme: vi.fn(),
}))

describe("RetrowaveAmbience", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    )
    vi.mocked(useTheme).mockReturnValue({
      resolvedTheme: "light",
    } as ReturnType<typeof useTheme>)
  })

  it("renders nothing when theme is not retrowave", () => {
    const { container } = render(<RetrowaveAmbience />)
    expect(container.firstChild).toBeNull()
  })

  it("renders canvas when theme is retrowave", () => {
    vi.mocked(useTheme).mockReturnValue({
      resolvedTheme: "retrowave",
    } as ReturnType<typeof useTheme>)

    const { container } = render(<RetrowaveAmbience />)
    expect(container.querySelector("canvas")).not.toBeNull()
  })
})
