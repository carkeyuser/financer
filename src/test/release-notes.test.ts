import { describe, expect, it } from "vitest"
import {
  compareVersions,
  getReleaseNotesForVersion,
  getReleaseNotesUpTo,
  getUnseenReleaseNotes,
} from "@/data/release-notes"

describe("compareVersions", () => {
  it("orders patch versions", () => {
    expect(compareVersions("0.0.1", "0.0.2")).toBeLessThan(0)
    expect(compareVersions("0.0.2", "0.0.1")).toBeGreaterThan(0)
  })

  it("orders minor versions", () => {
    expect(compareVersions("0.0.9", "0.1.0")).toBeLessThan(0)
    expect(compareVersions("0.1.0", "0.0.9")).toBeGreaterThan(0)
  })

  it("treats equal versions as zero", () => {
    expect(compareVersions("0.0.1", "0.0.1")).toBe(0)
  })
})

describe("getUnseenReleaseNotes", () => {
  it("returns nothing when lastSeen is null", () => {
    expect(getUnseenReleaseNotes(null, "0.0.2")).toEqual([])
  })

  it("returns notes for versions after lastSeen up to current", () => {
    const unseen = getUnseenReleaseNotes("0.0.0", "0.0.1")
    expect(unseen).toHaveLength(1)
    expect(unseen[0]?.version).toBe("0.0.1")
  })

  it("returns nothing when already on current version", () => {
    expect(getUnseenReleaseNotes("0.0.1", "0.0.1")).toEqual([])
  })
})

describe("getReleaseNotesForVersion", () => {
  it("finds release notes by version", () => {
    expect(getReleaseNotesForVersion("0.0.1")?.version).toBe("0.0.1")
    expect(getReleaseNotesForVersion("9.9.9")).toBeUndefined()
  })
})

describe("getReleaseNotesUpTo", () => {
  it("includes current and older releases", () => {
    const notes = getReleaseNotesUpTo("0.0.8")
    expect(notes.map((entry) => entry.version)).toEqual([
      "0.0.8",
      "0.0.7",
      "0.0.6",
      "0.0.5",
      "0.0.4",
      "0.0.3",
      "0.0.2",
      "0.0.1",
    ])
  })
})
