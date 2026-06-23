V79I IMAGE CARD REPAIR

Fixes the broken match card layout from v79h:
- no image URL is injected directly into an <img src> string inside card HTML
- image URLs are stored as data-img and hydrated after rendering
- broken/blocked images keep the clean 🎯 placeholder
- prevents malformed image URLs from breaking the card grid
- keeps level filter restricted to Level I-V

Backend is unchanged from v79h except packaged together for consistency.
