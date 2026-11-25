# Mobile investor demo

Demo URL: **https://www.causekind.com/**.

## Release checkpoint

The public site reproduced React hydration error #418 on 25 November. The local
performance fixes must be published and checked on that URL before the meeting.
Local test success does not verify the deployed site. Use the workspace's verified
`--no-ff` merge policy; remote pushes require Sushil's explicit instruction.
An isolated release candidate based on origin/main is prepared at
`C:/Causekind/investor-mobile-release`. It excludes the unreleased Mail Center
feature/dependencies in local main. Review/publish that candidate for this demo;
its exact tip and validation are recorded in the handoff. No new branch has been
created. The Vercel connector could not inspect deployment metadata because
its current connection lacks access to the project team.

## After publishing

On the exact phone/browser intended for the presentation:

1. Cold-open Home. Confirm the photo and heading appear, no horizontal scrolling,
   blank screen or missing assets, and no hydration error in a browser inspection.
2. Tap the menu immediately, close it, then repeat. Labels should animate and the
   first tap should open the panel without waiting for a separate menu download.
3. Open Donate, Donate items, Back, then close. Check the two choices and the
   card physics while dragging. Check phone tilt if that browser supplies sensor events.
4. Log in to the prepared demo account. Open Requests, Profile, Dashboard and Home.
   Check the actual data has loaded; Profile should show cached identity while
   account details load, with Edit becoming available once they are ready.
5. Open search, type while the response is loading, and verify matching results
   appear without another keystroke. Check Escape/close and reopen.

## Shortly before presenting

Use the intended phone, network and demo account. Complete or skip any first-time
welcome/tour using its normal controls. Open Home, Profile and Dashboard once and
wait for their real data. This warms browser assets and wakes the existing cold
database through normal reads. The database's minimum-idle=0 policy stays intact.

Keep the tested session and tab ready for the walkthrough. If demonstrating new
signup, rehearse that separately so its welcome and verification steps are expected.

## Evidence and limits

Development used isolated production builds, automated tests and mobile Chrome
with 150ms latency, 1.6Mbps download, 0.75Mbps upload and 4x CPU throttling. Recorded
samples and validation are in the workspace handoff
`handoffs/INVESTOR_MOBILE_READY_2026-11-25.md`.

These are lab checks, not a physical-phone or published-release certification.
Recheck the public URL after release on the real demo phone; loading also depends
on that phone, network, API and external services.
