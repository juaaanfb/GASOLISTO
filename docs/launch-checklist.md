# GASOLISTO Launch Checklist

Use this checklist before publishing the custom-domain launch.

## Domain And Vercel

- Buy the final domain.
- Add the domain to the Vercel project.
- Configure DNS or nameservers as Vercel indicates.
- Wait until the domain resolves with HTTPS.
- Update `SITE_URL` in `lib/site.ts`.
- Deploy production again after updating `SITE_URL`.

## Code Checks

- Run `npm run typecheck`.
- Run `npm run build`.
- Confirm `sitemap.xml` uses the final domain.
- Confirm `robots.txt` points to the final sitemap.
- Confirm Open Graph/Twitter cards use the final domain.

## Manual Review

- Open the home page on mobile width.
- Allow location and confirm nearby prices load.
- Deny location and confirm the Madrid fallback is understandable.
- Open the list view and station detail.
- Try route planning with an origin and destination.
- Open `/como-funciona`.
- Open `/privacidad`.
- Test a broken URL and confirm the not-found page looks clean.

## Launch Posts

- Publish from Juan's personal X profile.
- Publish from Juan's personal LinkedIn profile.
- Create or update Gasolisto profiles on X and LinkedIn.
- Schedule 5-7 human-reviewed posts for the first week.

## Do Not Do Before Launch

- Do not add login.
- Do not add a backend database.
- Do not start aggressive social automation.
- Do not redesign the full UI.
- Do not introduce new dependencies unless a launch blocker requires it.
