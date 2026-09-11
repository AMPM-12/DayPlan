# Known Issues

A running log of known limitations and deferred bugs across the app. Not a full bug tracker — just enough context to remember what's known, why, and whether it's been addressed.

## AWAKEN: multi-practice catch-up limit

When a device is locked/backgrounded through more than one AWAKEN practice's duration, only one catch-up advance happens per reopen — the timer correctly advances to the next practice, but if two or more practice windows have already elapsed, it doesn't cascade through all of them; the next practice restarts full-length from the reopen moment rather than compressing to reflect further-elapsed time.

Root cause: a pre-existing architectural limit of the single global session-timer design (shared with Focus Sessions), not something introduced by AWAKEN specifically.

Status: known, low real-world impact (requires being locked through an entire practice duration, typically 5 min), deferred — not fixed as of AWAKEN's initial implementation.
