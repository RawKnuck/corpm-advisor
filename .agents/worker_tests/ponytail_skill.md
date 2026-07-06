# Ponytail Skill

Forces the laziest solution that actually works, simplest, shortest, most minimal.

## The ladder
1. Does this need to exist at all? (YAGNI)
2. Stdlib does it? Use it.
3. Native platform feature covers it?
4. Already-installed dependency solves it? Use it.
5. Can it be one line? One line.
6. Only then: the minimum code that works.

## Rules
- No unrequested abstractions.
- No boilerplate, no scaffolding "for later".
- Deletion over addition.
- Fewest files possible. Shortest working diff wins.
- Mark deliberate simplifications with a `ponytail:` comment.
- Non-trivial logic leaves ONE runnable check behind.
