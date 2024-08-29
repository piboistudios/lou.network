require('./preset-env');
const uncss = require('uncss');
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const oauthRouter = require('./routes/oauth');
const wellKnownRouter = require('./routes/well-known');
const authRouter = require('./routes/auth');
const { mkLogger } = require('./logger');
const applogger = mkLogger('app');
const session = require('express-session');
const { randomUUID } = require('crypto');
const app = express();
const STYLE_START = '<!-- style-start-->';
const STYLE_END = '<!-- style-end-->';
const cache = {};
function doUncss(view, html, opts, callback) {
  if (cache[view]) return callback(null, cache[view]);
  else return uncss(html, opts, (err, css) => {
    if (!err) cache[view] = css;
    callback(err, css);
  })
}
// const FA = '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css" integrity="sha512-Kc323vGBEqzTmouAECnVceyQqyqdsSiqLQISBL29aUW4U/M7pSPA/gEUZQqv1cwx4OnYxTxve5UMg5GT6L4JJg==" crossorigin="anonymous" referrerpolicy="no-referrer"/>'
// app.use((req, res, next) => {
//   const originalRender = res.render.bind(res);
//   res.render = (view, locals, callback) => {
//     console.time('render');
//     return originalRender(view, locals || {}, (err, html) => {
//       if (err) return callback ? callback(err) : req.next(err);
//       const length = html.length;
//       console.time('uncss');
//       doUncss(view, html, {}, callback || ((err, css) => {
//         if(err) return req.next(err);
//         if(css) {
//           console.log('huh');
//           const range = [html.indexOf(STYLE_START) + STYLE_START.length, html.indexOf(STYLE_END)];
//           html = html.slice(0, range[0]) + `<style>${css}</style>` + FA + html.slice(range[1])
//           console.timeEnd('uncss');
//         }
//         // if (err) {
//         //   applogger.fatal("UNCSS error:", err);
//         //   return req.next(err);
//         // }
//         res.send(html);
//         console.timeEnd('render');
//       }))

//     })
//   }
//   next();
// })
app.use(cookieParser());

app.session = session({
  // genid: req => {
  //   applogger.trace("cookies:", req.cookies, req.cookie);
  //   if (!app.session.store.has(req.cookies['connect.sid'])) return randomUUID();
  //   return req.cookies['connect.sid'] || randomUUID();
  // },
  // store, 
  secret: process.env.OAUTH_JWT_SECRET,
  cookie: {
    // secure: app.get('env') !== 'development',
    // httpOnly: true,
    // sameSite: 'none',
    maxAge: 60 * 60 * 24 * 1000
  },
});
app.use(app.session)
app.use((req, res, next) => {
  if (!req.query.r) req.query.r = "/";
  res.locals.querystring = req.query ? new URLSearchParams(req.query) : ''
  next();
})
app.use((req, res, next) => {
  applogger.trace("Request:", { ip: req.ip, headers: req.rawHeaders, method: req.method, path: req.path, query: req.query, params: req.params, body: req.body })
  next();
})
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/users', usersRouter);
app.use("/auth", authRouter)
app.use("/oauth", oauthRouter)
app.use("/.well-known", wellKnownRouter)
app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.locals.status = err.status;
  applogger.error("ERROR:", err, JSON.stringify({ ...err }, null, 4), err.status);
  applogger.error(err.stack);
  // render the error page
  res.status(err.status || 500);
  req.method === 'get' ? res.render('error') : res.json({
    ...err,
    code: err.status,
    status: err.name
  });
});

module.exports = app;
