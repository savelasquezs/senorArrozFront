# Administrative tracking evidence

Stay duration is capped to API-confirmed evidence, never advanced by the browser clock or a playhead. Backfilled source IDs are not chronological: grouping uses recordedAt and the supported time window. A retracted inference remains visible with existing administrator notes and decisions.

The detail shows evidence-through time, sample agreement (not probability of misconduct), and last known position with its capture timestamp for prolonged absence. Old GPS reports, unknown service interruption, API transport and Android network reports have distinct labels. No rule is added to restrict stay detection to active routes or active_delivery mode.

Authenticated admin users receive DeliveryTrackingAlertChanged through the existing tenant/branch-scoped orders hub, deduplicated per account/branch/alert. The persistent server record is authoritative: a browser/push notification is not a read receipt. Current agreed stay rule is displayed as 10 minutes / 20 metres; customer over 20 minutes goes to review, branch stays remain exempt.

## Acceptance and deployment

Publish after the compatible API. Check build, complete test suite, chronological backfill grouping, frozen durations without samples, and tenant/branch/account notification isolation. A recovered communication episode remains in history; a confirmed GPS/permission/manual-stop case remains administratively pending. No automatic sanctions or changes to the 30-second / 5-minute sampling schedules are introduced.
