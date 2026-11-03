# Triage Labels

Skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Role in mattpocock/skills | Label in our tracker | Meaning |
| ------------------------- | -------------------- | ------------------------------------------- |
| `needs-triage` | `needs-triage` | Maintainer needs to evaluate the issue |
| `needs-info` | `needs-info` | Waiting on the reporter for more information |
| `ready-for-agent` | `ready-for-agent` | Fully specified, ready for an AFK agent |
| `ready-for-human` | `ready-for-human` | Requires human implementation |
| `wontfix` | `wontfix` | Will not be actioned |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

The tracker is local markdown rather than a label-based tracker, so the role string is recorded as the `Status:` value near the top of the issue file instead of as an applied label.

Edit the "Label in our tracker" column to match the vocabulary you actually use.
