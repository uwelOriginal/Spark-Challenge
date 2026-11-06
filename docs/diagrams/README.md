# Diagrams

Each diagram has a Mermaid source (`.mmd`), a vector version (`.svg`) and an image for slides and documents (`.png`).

To regenerate them after an edit, from the repo root: `node docs/diagrams/render.mjs`. It needs `clara/node_modules`, Chrome and internet access.

| Diagram | Shows | Use it for |
|---|---|---|
| [01 System architecture](01-system-architecture.png) | Device, server, AI providers | Q&A, repo review |
| [02 User flow](02-user-flow.png) | Upload → Work → Professor or Finish | Pitch backup, README |
| [03 Decode sequence](03-decode-sequence.png) | One request, with the quote check | Code review |
| [04 Model routing](04-model-routing.png) | Free tier first, when it escalates | Cost questions, prompts PDF |
| [05 Whole-class audio](05-whole-class-audio.png) | Long recording to verified passages | Technical Q&A |
| [06 AI pipeline and guardrails](06-ai-pipeline-and-guardrails.png) | Extraction vs. explanation layers, checks | Responsible AI questions, prompts PDF |
| [07 Privacy data map](07-privacy-data-map.png) | What stays, passes through, is kept, is never collected | Privacy questions |
| [08 Reminders sequence](08-reminders-sequence.png) | Push reminders without assignment text on the server | Technical Q&A |

UI state and code-structure diagrams are also in [`../14_simplification.md`](../14_simplification.md).
