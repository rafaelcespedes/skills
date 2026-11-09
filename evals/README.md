# Evals for door-policy

Each case in `evals.json` is a prompt, a fixture site (in `fixtures/`, as it was
before the skill ran) and what should be true afterwards. They're the cases
where earlier reviews found bugs, so they catch regressions. This folder sits
outside `skills/`, so `npx skills add` doesn't install it.

To run one: copy the fixture to a scratch folder, start a fresh agent session
there with the skill installed, give it the prompt, and check each expectation
by hand or with `scripts/verify.mjs`. `should_trigger: false` cases check the
skill's description: the skill shouldn't load at all.

The shared code has its own checks, no agent needed:
`node skills/door-policy/scripts/selftest.mjs`.
