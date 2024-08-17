// Copyright 2022-2023 Simon Ser <contact@emersion.fr>
// Derived from https://github.com/Libera-Chat/gamja/blob/production/lib/oauth2.js
// Originally released under the AGPLv3, relicensed to the Ergo project under the MIT license
// Modifications copyright 2024 Gabriel Hayes <webmaster@gabe-develops.tech>
// Released under the MIT license
// function callsite() {
//     var orig = Error.prepareStackTrace;
//   Error.prepareStackTrace = function(_, stack){ return stack; };
//   var err = new Error;
//   Error.captureStackTrace(err, arguments.callee);
//   var stack = err.stack;
//   Error.prepareStackTrace = orig;
//   return stack;
// }
// console.log("Stack:", callsite());
function formatQueryString(params) {
    let l = [];
    for (let k in params) {
        l.push(encodeURIComponent(k) + "=" + encodeURIComponent(params[k]));
    }
    return l.join("&");
}

async function fetchServerMetadata(url) {
    // TODO: handle path in config.oauth2.url
    let resp;
    try {
        resp = await fetch(url + "/.well-known/oauth-authorization-server");
        if (!resp.ok) {
            throw new Error(`HTTP error: ${resp.status} ${resp.statusText}`);
        }
    } catch (err) {
        console.warn("OAuth 2.0 server doesn't support Authorization Server Metadata (retrying with OpenID Connect Discovery): ", err);
        resp = await fetch(url + "/.well-known/openid-configuration");
        if (!resp.ok) {
            throw new Error(`HTTP error: ${resp.status} ${resp.statusText}`);
        }
    }

    let data = await resp.json();
    if (!data.issuer) {
        throw new Error("Missing issuer in response");
    }
    if (!data.authorization_endpoint) {
        throw new Error("Missing authorization_endpoint in response");
    }
    if (!data.token_endpoint) {
        throw new Error("Missing authorization_endpoint in response");
    }
    if (!data.response_types_supported?.includes?.("code")) {
        throw new Error("Server doesn't support authorization code response type");
    }
    return data;
}

function redirectAuthorize({ serverMetadata, clientId, redirectUri, scope }) {
    // TODO: move fragment to query string in redirect_uri
    // TODO: use the state param to prevent cross-site request
    // forgery
    let params = {
        response_type: "code",
        client_id: clientId,
        redirect_uri: redirectUri,
    };
    if (scope) {
        params.scope = scope;
    }
    window.location.assign(serverMetadata.authorization_endpoint + "?" + formatQueryString(params));
}

function buildPostHeaders(clientId, clientSecret) {
    let headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
    };
    if (clientSecret) {
        headers["Authorization"] = "Basic " + btoa(encodeURIComponent(clientId) + ":" + encodeURIComponent(clientSecret));
    }
    return headers;
}

async function exchangeCode({ serverMetadata, redirectUri, code, clientId, clientSecret }) {
    let data = {
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
    };
    if (!clientSecret) {
        data.client_id = clientId;
    }

    let resp = await fetch(serverMetadata.token_endpoint, {
        method: "POST",
        headers: buildPostHeaders(clientId, clientSecret),
        body: formatQueryString(data),
    });

    if (!resp.ok) {
        throw new Error(`HTTP error: ${resp.status} ${resp.statusText}`);
    }
    data = await resp.json();

    if (data.error) {
        throw new Error("Authentication failed: " + (data.error_description || data.error));
    }
 
    return data;
}

async function introspectToken({ serverMetadata, token, clientId, clientSecret }) {
    let resp = await fetch(serverMetadata.introspection_endpoint, {
        method: "POST",
        headers: buildPostHeaders(clientId, clientSecret),
        body: formatQueryString({ token }),
    });
    if (!resp.ok) {
        throw new Error(`HTTP error: ${resp.status} ${resp.statusText}`);
    }
    let data = await resp.json();
    if (!data.active) {
        throw new Error("Expired token");
    }
    return data;
}
// END LICENSED CODE
kiwi.plugin('sasl-oauth-external-startup', function (kiwi, log) {
    /**
     * @type {import('uuid')} - uuid lib must be exported from kiwi installation
     * @example
     * ```
     * 'kiwi public'; 
     *   
     *   import uuid from 'uuid';    
     *   
     *   export default uuid;
     * ```
     */
    const { v4: uuidv4 } = kiwi.require('libs/external/uuid');
    console.log("uuid?", uuidv4());
    const Misc = kiwi.require('helpers/Misc');
    const Logger = kiwi.require('libs/Logger');
    Logger.setLevel(2);
    Logger.enableSourceLogging();
    log.debug("ayeeeee");
    kiwi.Vue.component('sasl-oauth-external', {
        template: `<p>Logging in...{{ error }}</p>`,
        data() {
            return {
                // error: "(or not, whoops broke things atm)",
                title: 'Where are you connecting today?',
                buttonText: '',
                server_type: 'default',
                server: 'lou-net.ngrok.io:443',
                tls: false,
                nick: '',
                password: '',
                encoding: 'utf8',
                channel: '',
                znc_network: '',
                znc_network_support: true,
                direct: false,
                direct_path: '',
                show_type_switcher: true,
                show_password_box: false,
                is_connecting: false,
                network: null,
            };
        },
        async created() {

            const oauth2 = kiwi.state.setting('oauth2');
            const redirectUri = window.location.toString().slice(0, window.location.toString().indexOf('?'))
            function authorize(meta) {
                redirectAuthorize({
                    serverMetadata: meta,
                    clientId: oauth2.clientId,
                    redirectUri,
                    scope: oauth2.scope
                });
            }
            const params = new URLSearchParams(location.search);

            /**
             * @type {{
            *  ircClient: import('node-irc-framework')
            * }}
            */
            let net;
            const useOAuth = params.has('code');
            let saslMech = useOAuth ? 'OAUTHBEARER' : 'EXTERNAL';
            let access_token;
            if (useOAuth && oauth2.baseURL) {
                const meta = await fetchServerMetadata(oauth2.baseURL);
                try {

                    access_token = (await exchangeCode({
                        serverMetadata: meta,
                        code: params.get('code'),
                        redirectUri,
                        clientId: oauth2.clientId
                    })).access_token
                    window.history.replaceState({}, document.title, redirectUri);

                } catch (e) {
                    console.error(e);
                    authorize(meta)
                }
            }
            // if(!params.has('code')) {

            // } else {

            // }

            let nick = this.nick;
            const hasNetwork = this.$state.networks.length > 0;
            if (hasNetwork) {
                net = this.$state.networks[0];
                this.$state.setActiveBuffer(net.id, net.serverBuffer().name);
            } else {

                net = this.$state.addNetwork('Network', nick, {
                    server: this.server.split(':')[0],
                    port: parseInt(this.server.split(':')[1] || 6667, 10),
                    tls: this.tls,
                    password: this.password,
                    direct: this.direct,
                    path: this.direct_path,
                    encoding: this.encoding,
                    sasl_mechanism: saslMech,
                    direct: true,
                    ...(kiwi.state.setting('startupOptions') || {})
                });
            }


            this.$state.persistence.watchStateForChanges();
            if (net) {
                let hasSetActiveBuffer = false;

                let bufferObjs = Misc.extractBuffers(this.channel);
                bufferObjs.forEach((bufferObj, idx) => {
                    let buffer = this.$state.addBuffer(net.id, bufferObj.name);
                    buffer.enabled = true;

                    if (bufferObj.key) {
                        buffer.key = bufferObj.key;
                    }

                    if (idx === 0) {
                        this.$state.setActiveBuffer(net.id, buffer.name);
                        hasSetActiveBuffer = true;
                    }
                });

                if (!hasSetActiveBuffer) {
                    this.$state.setActiveBuffer(net.id, net.serverBuffer().name);
                }

                this.is_connecting = true;
                this.network = net;
                net.ircClient.options.sasl_mechanism = saslMech;
                net.ircClient.requestCap('sasl');
                const server = kiwi.state.setting('startupOptions.server');
                const host = server;
                const port = kiwi.state.setting('startupOptions.port');
                const tls = kiwi.state.setting('startupOptions.tls');
                net.ircClient.connect({
                    host,
                    port,
                    tls,
                    direct: true,
                    sasl_mechanism: saslMech,
                });
                net.ircClient.use(
                    /**
                     * 
                     * @param {import('irc-framework/src/client')} client 
                     * @param {import('middleware-handler')} raw 
                     * @param {import('middleware-handler')} parsed 
                     */
                    (client, raw, parsed) => {

                        raw.use(
                            /**
                             * 
                             * @param {string} command 
                             * @param {import('irc-framework/src/ircmessage')} message 
                             * @param {string} raw_line  
                            * @param {import('irc-framework/src/client')} client 
                             * @param {*} next  
                             * @returns 
                             */
                            (command, message, raw_line, client, next) => {
                                if (command.toUpperCase() === 'AUTHENTICATE') {
                                    if (saslMech === 'EXTERNAL') {
                                        // alert('t');
                                        console.log('authenticate + teehee');
                                        return client.raw('AUTHENTICATE +');
                                    }
                                    const commands = kiwi.state.setting('sasl.client_response') || [];
                                    if (attemptedReauth && commands?.length) {
                                        while (commands.length) {
                                            const line = commands.shift();
                                            client.raw(...line);
                                        }
                                        return;
                                    }
                                    const b64 = btoa([`n,a=${this.nick},`, `host=${location.hostname}`, `port=${location.port || (location.protocol === 'https:' ? 443 : 80)}`, `auth=Bearer ${access_token}`].join('\x01'));
                                    const singleAuthCommandLength = 400;
                                    let sliceOffset = 0;
                                    function send(...args) {
                                        const line = args;
                                        commands.push(args);
                                        return client.raw(...args);
                                    }
                                    while (b64.length > sliceOffset) {
                                        send('AUTHENTICATE ' + b64.substr(sliceOffset, singleAuthCommandLength));
                                        sliceOffset += singleAuthCommandLength;
                                    }
                                    if (b64.length === sliceOffset) {
                                        send('AUTHENTICATE +');
                                    }
                                    kiwi.state.setting('sasl.client_response', commands);
                                    return;
                                }
                                next();
                            })
                        parsed.use((event_name, event_arg, client, next) => {
                            log.debug("PARSED:", event_name, event_arg)
                            next();
                        })
                    });
                let attemptedReauth = false;
                net.ircClient.on('sasl failed', async e => {
                    console.log("SASL FAIL", e);
                    if (!oauth2.baseURL || useOAuth) return;
                    if (!attemptedReauth) {
                        attemptedReauth = true;
                        saslMech = 'OAUTHBEARER';
                        net.ircClient.connection.options.sasl_mechanism = "OAUTHBEARER";
                        log.debug("Registering..?");
                        return setTimeout(() => net.ircClient.registerToNetwork(), 100);
                    }
                    kiwi.state.setting('sasl.client_response', null);
                    const meta = await fetchServerMetadata(oauth2.baseURL);
                    authorize(meta); 
                })
                net.ircClient.on('connecting', e => {
                    console.log("connecting?", e);
                })
                let onRegistered = () => {
                    setTimeout(() => { this.is_connecting = false; }, 1000);
                    this.$emit('start');
                    net.ircClient.off('registered', onRegistered);
                    net.ircClient.off('close', onClosed);
                };
                let onClosed = () => {
                    setTimeout(() => { this.is_connecting = false; }, 1000);
                    net.ircClient.off('registered', onRegistered);
                    net.ircClient.off('close', onClosed);
                };
                net.ircClient.once('registered', onRegistered);
                net.ircClient.once('close', onClosed);
            }

        }
    })
    kiwi.addStartup(
        'sasl-oauth-external', kiwi.Vue.component('sasl-oauth-external'));
    // console.log(kiwi.getStartups)
});
