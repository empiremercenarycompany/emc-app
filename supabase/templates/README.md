# Auth email templates

These files are not applied. Nothing here is pushed to Supabase.

They are the Confirm signup and Magic Link messages. The button opens `/auth/confirm` and does not spend the link until the player presses Continue. Paste them into the dashboard only after that page is deployed. The wording matches the app button: your sign-in link.

## Apply in the dashboard

1. Open the Supabase project.
2. Go to Authentication, then Emails, then Templates.
3. Open **Confirm signup**. Set the subject to `Your sign-in link`. Paste the contents of `confirm-signup.html` into the body.
4. Open **Magic Link**. Set the subject to `Your sign-in link`. Paste the contents of `magic-link.html` into the body.
5. Save each template. Send yourself a link and confirm the button opens the app.

Do not run `supabase config push` from this folder unless you mean to change the hosted project.
