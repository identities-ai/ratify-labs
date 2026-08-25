# Ratify Labs product requirements

Status: implementation contract
Date: 2026-08-24

## Product

Ratify Labs is the shared public catalog for executable authority-aware agent
references. It helps developers and enterprise evaluators understand what
Ratify adds, run real boundary decisions, inspect source, and distinguish a
working reference from a diagram or product claim.

## Information architecture

- `/` is the Labs explanation, design template, and complete catalog.
- Each available reference has a stable path such as `/maritime`.
- The root never becomes platform-specific.
- Only independently verified references are interactive.
- Upcoming entries are visibly unavailable and have no runnable control.

## Requirements

- LAB-001: The root MUST explain the value of executable authority references
  without requiring cryptographic or agent-framework knowledge.
- LAB-002: The catalog MUST distinguish live, upcoming, and unavailable items
  with text rather than color alone.
- LAB-003: Every live card MUST state the problem demonstrated and link to one
  stable Labs path.
- LAB-004: The shared visual system MUST use the official Ratify mark and MUST
  NOT display unapproved partner marks.
- LAB-005: The catalog MUST be responsive at 320, 390, 480, and 1440 CSS pixels
  with no clipping, overlap, or unreadable content.
- LAB-006: Motion MUST be restrained and honor reduced-motion preferences.
- LAB-007: Reference routes MUST come from a closed registry; arbitrary origins,
  paths, methods, and headers MUST NOT be forwarded.
- LAB-008: A routed origin MUST require a secret held outside both repositories.
  Direct provider-host access to documents and execution routes MUST fail
  closed. The hosting platform may serve byte-identical public static assets
  from its provider hostname; those assets carry no credentials or execution
  capability.
- LAB-009: The router MUST strip client-supplied routing credentials, cookies,
  authorization, and forwarding metadata before origin contact.
- LAB-010: Origin failure MUST produce a fixed, redacted response with no URL,
  credential, exception, or traceback.
- LAB-011: Catalog copy MUST distinguish open references from Ratify Verify and
  MUST NOT imply platform endorsement or partnership.
- LAB-012: A reference MUST NOT be marked live before its public source,
  executable gate, immutable revision, and independent closure evidence exist.
- LAB-013: The root catalog and every routed reference document or execution
  route MUST be served only from `labs.ratifyprotocol.com`; provider hostnames
  return 404 for those routes. Public static assets may also be served by the
  hosting provider as a documented platform limitation.
- LAB-014: Deployment evidence MUST record the catalog revision, routed
  reference revision, origin-denial result, and live reference smoke result.

## First release

Maritime is the only live catalog entry. `/maritime` routes to the independently
built console from `identities-ai/ratify-maritime-reference`. The reference
demonstrates the same agent allowed at 420 USD and denied at 501 USD by a signed
500 USD delegation.

LangChain, GitHub Copilot, and Google ADK may appear only as upcoming catalog
context until their publication requirements are complete.

## Non-goals

Labs is not an account system, analytics product, general reverse proxy,
credential broker, evidence database, Ratify Verify frontend, or endorsement
surface. It stores no visitor identity and grants no Ratify authority.
