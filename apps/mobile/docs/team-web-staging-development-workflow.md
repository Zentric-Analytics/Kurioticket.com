# Team web staging development workflow

1. Open a pull request into `dev`.
2. Wait for every required check to conclude successfully.
3. Merge the reviewed pull request into `dev`.
4. Open the `Validate mobile preview` run and monitor **Web staging** independently of Android and iOS.
5. Wait for `Web staging: LIVE`.
6. Confirm the expected/live SHA equals the merge commit.
7. Open <https://staging.kurioticket.com> in a desktop or mobile browser.
8. Confirm the **Staging build** badge shows the same short SHA, then verify the intended change.

No owner approval is required for routine staging deployment. Render auto-deploys `dev`; the mobile Preview lanes are independent and do not determine web success. Production and `main` are unrelated to this flow.

When reporting a failure, include the merge SHA, Render deployment ID, live SHA, affected URL, viewport, and a screenshot. A successful health response alone is not visual-delivery proof: the workflow also checks rendered HTML with desktop and mobile user agents.
