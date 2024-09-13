const express = require('express');
const { getMailer } = require('../routines/get-mailer');
const path = require('path');
const crypto = require('crypto');
const pbkdf2 = require('@phc/pbkdf2');
const Router = require('express-promise-router');
const router = Router();
const pug = require('pug');
const { mkLogger } = require('../logger');
const Account = require('../models/account');
const logger = mkLogger('auth');
const uncss = require('uncss');
const fs = require('fs');
const createHttpError = require('http-errors');
const STYLE_START = '<!-- style-start-->';
const STYLE_END = '<!-- style-end-->';
const HEAD_START = '<!-- head-start-->';
const HEAD_END = '<!-- head-end-->';


/**
 * This frankenstein function basically inlines CSS classes and variables 
 * into an email. I like Bulma CSS a lot, sue me 
 */
async function sendemail({
  to,
  subject,
  text,
  template,
  context
}) {
  const inline = require('inline-css');
  const mailer = getMailer();
  const src = pug.renderFile('./views/mail/' + template + '.pug', context);
  return new Promise(async (resolve, reject) => uncss(src, async (err, css) => {
    const escape = require('escape-regex-string');

    const range = [src.indexOf(STYLE_START) + STYLE_START.length, src.indexOf(STYLE_END)];
    const reduced = src.slice(0, range[0]) + `<style>${css}</style>` + src.slice(range[1])
    const inlined = await inline(reduced, { url: "file://" + path.resolve('.') + "/some-arbitrary-path" });
    const styleRe = /style="(?<css>[^"]+)"/gi;
    let g, otherStyles = '';
    do {
      g = styleRe.exec(src);
      if (g?.groups?.css) otherStyles += g.groups.css;
    } while (g);
    // logger.trace("Other styles:", otherStyles);
    const rootVars = Object.fromEntries(fs.readFileSync('./views/assets/bulma.css', 'utf-8').concat(otherStyles.replace(/;/gi, ';\n')).split(/$/m).filter(l => l.trim().indexOf('--') === 0).map(line => {
      const references = [];
      const [varname, val] = line.split(':').map(v => v.trim());
      const re = /var\((?<variable>--[a-zA-Z0-9-_.]*)\)/g;
      let r;
      do {
        r = re.exec(line);
        r?.groups?.variable && references.push(r.groups.variable);
      } while (r != null);
      return [varname, {

        line,
        variable: varname,
        references: references,
        value: val.replace(/;/gi, '')
      }]
    }));
    const deref = v => {
      if (v.references.length) {
        v.references.forEach((ref, idx) => {
          const refersTo = rootVars[ref];
          if (!refersTo) return;
          const value = deref(refersTo);
          const before = v.value;
          v.value = v.value.replace(new RegExp(escape(`var(${ref})`)), value.replace(/;/gi, ''));
        });
      }
      return v.value;
    }
    let body = inlined.indexOf(HEAD_END) !== -1 ? inlined.slice(inlined.indexOf(HEAD_END) + HEAD_END.length) : inlined;;
    let r;
    const re = /var\((?<variable>--[a-zA-Z0-9-_.]*)\)/g;
    const seen = new Set();
    do {
      r = re.exec(body);
      if (r?.groups?.variable) {
        seen.add(r.groups.variable)
        const varData = rootVars[r.groups.variable];
        if (varData) {
          varData.references.forEach(r => seen.add(r))
        }
      }

    } while (r != null);
    Object.values(rootVars).forEach(deref)
    seen.forEach(v => {
      if (rootVars[v]) {
        logger.trace("Replacing", v, rootVars[v].value);
        body = body.replace(new RegExp(escape(`var(${v})`)), rootVars[v].value)
      }
    })
    const cssVarsReduced = Object.values(rootVars).filter(({ variable }) => seen.has(variable)).map(({ variable, value }) => [variable, value].join(': ') + ';').join('')
    const htmlWithNewHead = `${body}`
    if (process.env.NODE_ENV == "development") {

      fs.writeFileSync('./final.html', htmlWithNewHead);
      fs.writeFileSync('./vars-used.cssraw', cssVarsReduced);
      fs.writeFileSync('./vars-original.cssraw', Object.values(rootVars).map(v => v.line).join(''));

      fs.writeFileSync('./inlined.html', inlined);
      fs.writeFileSync('./reduced.html', reduced);
      fs.writeFileSync('./src.html', src);
      // fs.writeFileSync('./details.json', JSON.stringify({ seen: [...seen], cssVarsReduced, rootVars }, null, 4))
    }
    try {

      const result = await mailer.sendMail({
        to,
        from: process.env.MAIL_USER,
        subject: "[🖧lou.network] " + subject,
        text,
        html: htmlWithNewHead
      });
      resolve(result);
    } catch (e) {
      reject(e);
    }
  }));
}
async function sendpasscode({
  email,
  code: _code,
  username,
}) {
  const code = [_code.slice(0, 3), _code.slice(3)];
  const result = await sendemail({
    to: `${username} <${email}>`,
    subject: "Your One-Time Passcode 🔑",
    text: `Your lou.network one-time passcode: ${code}`,
    template: "passcode",
    context: {
      code,
      username,
      email
    }
  });
  return result;
}

/**
 * @todo [ ] Refactor (move email/passcode functions to routines)
 * @todo [ ] Encrypt :user parameters
 */

router.use((req, res, next) => {
  logger.trace("Session:", req.session);
  next();
})

/* GET home page. */
router.get('/sign-up', async (req, res, next) => {
  req.session.registration = {};
  /**
   * @todo [X] render form; username, email, password
   * @todo [X] posts to /register?$q
   * @todo [ ] validate username/email
   */
  return res.render("sign-up")
});
router.post('/registration', async (req, res, next) => {
  if (!req.session?.registration) {
    return res.redirect("/auth/sign-up?" + new URLSearchParams(req.query));
  }
  /**
   * @todo [X] body username, email password
   * @todo [X] send passcode to email
   * @todo [X] render passcode form
   * @todo [ ] posts to /registration/complete?$q
   * @todo [ ] validate input
   */
  const { username, email, password } = req.body;
  const code = ('' + Math.floor(Math.random() * 1000000)).padStart(6, '0').slice(0, 6);
  req.session.registration = req.body;
  req.session.registration.code = code;

  const result = await sendpasscode({
    username,
    email,
    code,
  })
  logger.trace("Mail result:", result);
  return res.render("passcode", {
    postTo: "/auth/registration/complete",
    username,
    email,
    querystring: new URLSearchParams(req.query),
    error: req.query.error

  });
});
router.post('/registration/complete', async (req, res, next) => {
  if (!req.session?.registration?.code) {
    return next(createHttpError((500, "Sorry, please try again.")));
  }
  logger.trace("Body:", req.body);
  /**
   * @todo [X] validate passcode
   * @todo [X] redirect to r query param
   * @todo [ ] handle errors
   */
  const { code } = req.session.registration;

  if (req.body.code.join('') !== code) {
    return res.status(401).render("passcode", {
      postTo: "/auth/registration/complete",
      querystring: new URLSearchParams(req.query),
      error: "Incorrect passcode"

    });
  }

  /**
   * @todo [X] create user
   * @todo [X] setup req.session
   */
  const newUser = new Account({
    ...req.session.registration,
    meta: {
      creationMethod: "sign-up-registration"
    },
    password: await pbkdf2.hash(req.session.registration.password)
  });
  req.session.user = newUser;
  await newUser.save();
  delete req.session.registration;
  return res.redirect(req.query.r);

});
router.post('/invite', async (req, res, next) => {
  /**
   * @todo [X] email, subject, details
   * @todo [X] send email with link to finish registration (enter username)
   * @todo [X] return JSON response
   */
  const { email, subject, details, landingPage } = req.body;
  const newUser = new Account({
    username: crypto.randomUUID(),
    email,
    meta: {
      creationMethod: "invite"
    }
  });
  await newUser.save();
  const tail = [req.body.query ? '?' + new URLSearchParams(req.body.query) : '', req.body.fragment ? req.body.fragment.charAt(0) === '#' ? req.body.fragment : '#' + req.body.fragment : ''].filter(Boolean).join('') || '#thelou';
  const link = `${process.env.BASE_URL}/auth/invite/${newUser.id}${landingPage ? '?r=' + encodeURIComponent(landingPage) : '?r=' + encodeURIComponent('/kiwi/'+tail)}`;
  const result = await sendemail({
    to: email,
    subject: "You've been invited 🖅 " + subject,
    text: `Welcome to the lou.network! 🗪 ${details ? '\n' + details : ''}\nFollow this link to get connected: ${link}`,
    template: "invite",
    context: {
      email,
      details,
      link
    }
  });

  logger.trace("Mail result:", result);
  return res.status(200).json({
    mail: {
      result
    },
    meta: {
      status: "ok",
      code: 200,
      message: "Invite sent"
    }

  })
});
router.get('/invite/:user', async (req, res, next) => {
  req.session.invite = {};
  const user = await Account.findByPk(req.params.user);
  if (user.meta?.creationMethod !== "invite" || user.meta.registrationComplete) {
    return res.redirect("/");
  }
  req.session.invite.user = user;
  logger.trace("Save?", user.save);

  /** 
   * @todo [X] fetch email/details from ticket
   * @todo [X] render form for username
   * @todo [X] posts to /invite/accept?$q
   */
  return res.render("invite", {
    user
  })

});
router.post('/invite/accept', async (req, res, next) => {
  if (!req.session.invite.user) {
    return next(createHttpError(404, "Whoops, this wasn't supposed to happen. Please contact the webmaster@lou.network"));
  }
  /**
   * @todo [X] create user with username/email
   * @todo [X] setup req.session
   * @todo [X] redirect to r query param
   */
  req.session.user = req.session.invite.user;
  req.session.user.username = req.body.username;
  req.session.user.meta.registrationComplete = true;
  logger.trace("session user:", req.session.user, req.session.user.save);
  await Account.update(req.session.user, { where: { id: req.session.user.id } })
  delete req.session.invite;
  return res.redirect(req.query.r);

});
router.get('/login', async (req, res, next) => {
  req.session.login = {};
  /**
   * @todo [X] if user logged in, redirect to r query param
   * @todo [X] if not, render login form
   */
  if (req.session.user) {
    return res.redirect(req.query.r)
  }
  return res.render("login")
});
const INVALID_CREDS = {
  error: "Username or password invalid."
};
router.post('/login', async (req, res, next) => {
  /**
   * @todo [X] if username/pass:
   *  - setup session
   *  - redirect to r query param
   * @todo [X] if username and passcode request:
   *  - send email to user by username if one exists
   *  - redirect to /login/passcode
   */
  const { username, password, passcode } = req.body;
  if (!username) {
    return res.status(400).render("login", {
      error: "Username is required."
    });
  }
  const user = await Account.findOne({
    where: { username }
  });
  if (!user) {
    return res.status(401).render("login", INVALID_CREDS);
  }
  if (passcode === 'on') {
    if (!req.session.login) {
      return res.redirect('/auth/login?' + new URLSearchParams(req.query))
    }
    const code = ('' + Math.floor(Math.random() * 1000000)).padStart(6, '0').slice(0, 6);
    req.session.login.code = code;
    req.session.login.user = user;
    const codeReadable = [code.slice(0, 3), code.slice(3)].join(' ')
    const result = await sendpasscode({
      email: user.email,
      code: codeReadable,
      username
    });
    logger.trace("Email result:", result);
    return res.redirect("/auth/login/passcode?" + new URLSearchParams(req.query));
  }
  else if (password) {

    const verified = await pbkdf2.verify(user.password, password);
    if (!verified) {
      return res.status(401).render("login", INVALID_CREDS)
    }
    req.session.user = user;
    return res.redirect(req.query.r);
  } else {
    return res.status(400).render("login", {
      error: "Password is required."
    });
  }
});
router.get('/login/passcode', async (req, res, next) => {
  if (!req.session.login.code) return req.redirect("/login")
  /**
   * @todo [X] render passcode form
   * @todo [X] posts to /login/passcode
   */
  return res.render("passcode", {
    postTo: "/auth/login/passcode",
    querystring: new URLSearchParams(req.query),
    error: req.query.error

  });

});
router.post("/login/passcode", async (req, res, next) => {
  if (!req.session.login) {
    return res.redirect('/auth/login?' + new URLSearchParams(req.query))
  }
  /**
   * @todo [X] validate passcode
   * @todo [X] setup req.user.session
   * @todo [X] redirect to r query param
   */
  const { code } = req.body;
  if (code?.length !== 6) {
    return res.render("passcode", {
      error: "6-digit passcode is required.",
      postTo: "/auth/login/passcode",
      querystring: new URLSearchParams(req.query),
    })
  }
  if (code.join('') !== req.session.login.code) {
    return res.render("passcode", {
      error: "Incorrect passcode.",
      postTo: "/auth/login/passcode",
      querystring: new URLSearchParams(req.query),
    })
  }
  req.session.user = req.session.login.user;
  delete req.session.login;
  return res.redirect(req.query.r)

})
router.get('/reset-password', async (req, res, next) => {
  /**
   * @todo [X] form for username
   * @todo [ ] posts to /reset-password
   */
  return res.render("reset-password")
});
router.post('/reset-password', async (req, res, next) => {
  /**
   * @todo [X] send reset pass link
   * @todo [X] renders page to check email
   */
  const ticket = crypto.randomUUID();
  const { email } = req.body;
  const user = await Account.findOne({
    where: {
      email
    }
  });
  if (user) {
    user.meta.passwordReset = {};
    user.meta.passwordReset.ticket = ticket;
    const url = `${process.env.BASE_URL}/auth/reset-password/${user.id}?` + new URLSearchParams(req.query)
    const result = await sendemail({
      to: `${user.username || 'network user'} <${user.email}>`,
      subject: "Password Reset",
      text: `To reset your password, follow this link: ${url}.`,
      template: "reset-password",
      context: {
        link: url,
        user
      }
    });
    logger.trace("Email result:", result);
  }
  return res.render("reset-password_instructions");
});
router.get('/reset-password/:user', async (req, res, next) => {
  /**
   * @todo [X] render form: old pass, new pass
   * @todo [ ] post to /reset-password/:user
   * @todo [ ] Form validation
   */
  return res.render("reset-password_new-pass", {
    user: req.params.user
  })
});

router.post('/reset-password/:user', async (req, res, next) => {
  /**
   * @todo [X] render success screen with link to login
   * @todo [/] input validation
   */
  const { password, confirm } = req.body;
  if (password !== confirm) {
    return res.render("reset-password_new-pass", {
      mismatch: true
    })
  }
  const user = await Account.findByPk(req.params.user);
  if (!user) {
    return res.redirect('/');
  }
  user.password = await pbkdf2.hash(password);
  await user.save();
  return res.render("reset-password_complete")
});
router.use("/logout", (req, res) => {
  req.session && req.session.destroy();
  return res.status(200).redirect('/auth/login')
})

module.exports = router; 
