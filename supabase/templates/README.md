# Auth email templates

These files are not applied. Nothing here is pushed to Supabase. Paste each template into the dashboard by hand.

They are the Confirm signup, Magic Link, and Invite messages. Confirm signup and Magic Link open `/auth/confirm` and do not spend the link until the player presses Continue. Paste those two into the dashboard only after that page is deployed. The wording matches the app button: your sign-in link.

`invite.html` is the message staff send to invite a player. Paste it by hand as well. Its button uses `{{ .ConfirmationURL }}`.

## Apply in the dashboard

1. Open the Supabase project.
2. Go to Authentication, then Emails, then Templates.
3. Open **Confirm signup**. Set the subject to `Your sign-in link`. Paste the contents of `confirm-signup.html` into the body.
4. Open **Magic Link**. Set the subject to `Your sign-in link`. Paste the contents of `magic-link.html` into the body.
5. Open **Invite user**. Set the subject to `You have been invited`. Paste the contents of `invite.html` into the body.
6. Save each template. Send yourself a link and confirm the button opens the app.

Do not run `supabase config push` from this folder unless you mean to change the hosted project.
