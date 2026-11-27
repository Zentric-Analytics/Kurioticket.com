# Users activity flow and clarity

## Purpose

Make the Users workspace easier to scan and navigate while preserving recorded evidence, identity ownership, consent boundaries, and reporting scope. Bot Management is outside this change.

## Updated flow

| View | Role |
| --- | --- |
| Users Directory | Find an account or recorded guest; carry the selected reporting period into their profile. |
| User activity | Compact identity and latest-access context, period metrics, and the newest five recorded actions. |
| All activity | Complete paginated history for the same identity and period, with category, product, action and text filters. |
| Action details | Expand the selected record in place; inspect recorded metadata and, where available, its exact original search. |
| Journey history | Journey summaries and exact linked steps; one scoped route to separately recorded account or guest actions. |
| Device & Access / Pages visited | Dedicated evidence views with the same period and a validated return destination. |

Fresh dated views use Today. Explicit All time, custom dates and supported legacy bookmarks retain their scope. Online Users remains a live observation view. Opening a particular journey continues to show that journey's complete chronology.

## Evidence and attribution

- A source search with a stored null user ID is labelled as originally recorded as guest. Its original search record is not relabelled as a registered account.
- Missing source-identity evidence does not produce a guest label.
- Action platform and source-search platform are distinguished. A later action's device is never inferred from its search.
- A failed search uses its recorded outcome; zero results alone does not imply failure.
- Separate save and remove actions remain separate events. Removing repeated navigation does not remove records.
- The additional account-action feed under Journey history has been replaced by a link into All activity with identity, date and applicable product context. No historical records are rewritten or reassigned.
- Temporary live guests without attributable history see an availability explanation and verified current access, without empty metric tiles or a history button leading to unavailable records. Existing full-view bookmarks retain their recovery behaviour.

## Automatic updates

The existing Users and Online polling intervals remain unchanged. Updates defer during filter interaction and action review. A same-route payload already in flight is held while its action details are open, then released on close. Explicit navigation and authorization failures take precedence over held content.

Online snapshots retain their recorded rows and counts during delayed updates. Current-status claims expire at the earliest retained heartbeat deadline. Expired samples are visibly labelled as last observed; they are never replaced with fabricated zero counts.

## Latest-device timing correction

The before-change replay ran against an isolated PostgreSQL database using the actual production heartbeat writer and access reader: [CI job 140407086071](https://github.com/Zentric-Analytics/Kurioticket.com/actions/runs/45969775749/job/140407086071).

At revision `0f19d24bf468f7322e38656098a37291e368b4bb`, the test established:

1. The current device was selected before a heartbeat.
2. The heartbeat advanced its mutable `lastSeenAt` after the profile's captured timestamp.
3. Reusing that earlier cutoff selected an older signed-out device.
4. A later request selected the still-existing current device.
5. Another account's newer device remained excluded.

That job executed eight database tests with zero skips. This proves the timing mechanism under controlled ordering; it does not prove the exact timing of the previously recorded video or exercise HTTP authentication.

The correction removes the request-start upper cutoff only from the profile's all-time latest-access lookup. It retains exact account ownership, descending order, one-row selection and safe metadata projection. Latest access is an observation, not a claim that the session is online. Date-filtered device history and session-status rules remain separate.

The final regression requires the current device both before and after the heartbeat, including when the profile still holds its original request timestamp.

## Verification scope

Focused tests cover period inheritance, local-day boundaries, source-identity projection, newest-five ordering and read-only rendering. Browser gates exercise actual components and routes with explicitly labelled synthetic data: keyboard disclosure, pending refreshes, identity and filter navigation, historical pagination, small viewports and browser zoom. Database gates run only on disposable local PostgreSQL services in CI.

Browser screenshots validate implementation layout with synthetic records; they are not evidence of physical iOS/Android app behaviour or a live customer session. Final CI conclusions and the delivered revision belong in the pull request after the combined changes finish validation.
