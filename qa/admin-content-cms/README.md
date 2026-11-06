# Content CMS review fixture

Run `node qa/admin-content-cms/run.mjs` and open the printed local URL. The fixture uses the repository's actual editors, previews, dropdowns, action controls and reorder list with synthetic records. The API handlers reject every write; it does not connect to an account or database.

Use the five navigation links to review FAQ, Homepage destinations, Flight routes, Hotel destinations and Reorder. Check desktop and mobile widths, open each dropdown near the viewport bottom, click its field again to close it, enter paragraph text, try a blank or excessive Order, and leave an edited page to review the discard warning.

For a compilation smoke check of all five views:

```sh
CMS_QA_SMOKE=1 node qa/admin-content-cms/run.mjs
```

Run the automated interaction and reader regressions with `npm run test:cms`. The fixture smoke check does not replace a visual review or a deployed lifecycle test.
