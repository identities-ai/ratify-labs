# Ratify Labs privacy note

Ratify Labs does not create application accounts, session cookies, analytics
profiles, or an application-level visitor store. Browser authorization and
cookies are not forwarded to reference origins.

The hosting and abuse-prevention layer may set Cloudflare's necessary
`__cf_bm` cookie after the application responds. That platform cookie is not an
application login and is not available to the routed Maritime reference.
