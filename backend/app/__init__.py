"""BackForge backend — server-side engine for the BackForge PWA.

Ports the logic of the single-file frontend (~/workspace/reserved-2/index.html)
faithfully: assessment scoring, plan generation, live workout builder,
progression gate. Safety rules are enforced again server-side (defense in
depth): no loaded spinal flexion/twisting, never both knees to chest, and
extension work is excluded for extension-intolerant profiles.
"""
