# Layout
```
- bin/www - entrypoint
- fixtures - static content/data
- models - Sequelize models
   |- helpers - some helpers to define models with improved type inference
- oauth2 - OAuth 2 model (for `@node-oauth/express-oauth-server`)
- public - other static assets (served with a static middleware handler for live patches)
- routes - the HTTP routes
- routines - commonly reused functions
- views - The page templates used by the server to render webpages dynamically
```
# Overview

This basically just provides sign-up/login and other user-based auth/account management functionalities for a [`bizi-irc`](https://github.com/piboistudios/bizi-irc) instance.

~~Discord count your days~~ Just a friendly side-project