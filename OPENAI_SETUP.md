# OpenAI setup

The Android failure dashboard uses OpenAI when this GitHub Actions secret exists:

1. Open repository **Settings** → **Secrets and variables** → **Actions**.
2. Add a repository secret named `OPENAI_API_KEY`.
3. Paste the OpenAI API key into the secret value.
4. Run the **Android tests** workflow again.

Never commit this key or paste it into source code, workflow logs, issues, or chat.

Without the secret, the dashboard still works. It uses local rule-based failure analysis instead.