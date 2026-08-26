# @echo/parser

Deterministic local content analysis: dates, deadlines, temporal spans, task intent, keywords,
candidate concepts. No model, no network, no API key — `now` is injected, so the same content always
parses the same way.

`detectDates` reads the instants ("amanhã", "before Friday"), `detectPeriods` reads the stretches
("semana passada", "nas últimas 3 semanas", "no fim do mês", "recentemente", "depois que comecei
HEREZE"), and `detectMentions` returns both in one list — which is the shape that gets stored.

A span named against something that happened keeps its `anchor` unresolved: when a project started
is a fact about the corpus, and this package has none. `@echo/core` places it.
