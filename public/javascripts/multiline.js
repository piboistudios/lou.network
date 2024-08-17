kiwi.plugin('multiline', function (kiwi, log) {
    const batches = {};
    /**
     * @type {import('uuid')} - uuid must be installed in root kiwi instance
     */
    const { v4: uuidv4 } = kiwi.require('libs/external/uuid');
    /**
     * @type {typeof import('irc-framework/src/ircmessage')}
     */
    const IrcMessage = kiwi.require('libs/external/IrcMessage');

    /**
     * @type {import('irc-framework/src/linebreak')["lineBreak"]}
     */
    const lineBreak = kiwi.require('libs/external/lineBreak');

    /**
 * @type {import('irc-framework')}
 */
    const Irc = kiwi.require('libs/external/Irc');

    /**
     * @type {import('../../kiwiirc/src/libs/InputHandler')}
     */
    const InputHandler = kiwi.require('libs/InputHandler');

    kiwi.state.$on('input.raw', (input, context) => {
        // let lines = input.split('\n');
        // lines.forEach((line) => this.processLine(line, context));
        function f() {
            context = context || inputHandler.defaultContext();
            log.debug("input and context", { input, context });
            inputHandler.processLine(input, context, true);
        }
        inputHandler ? f() : deferred.push(f);
    });
    const deferred = [];
    const originalProcess = InputHandler.prototype.processLine;
    let inputHandler;
    InputHandler.prototype.processLine = function processLine(rawLine, context, actuallyProcessLine) {
        inputHandler = this;
        while (deferred.length) {
            deferred.pop()();
        }
        if (!actuallyProcessLine) return;
        return originalProcess.apply(this, [rawLine, context]);
    }
    // sending
    kiwi.on('network.connecting', async e => {
        /**@type {{network: import('../../kiwiirc/src/libs/state/NetworkState').default}} */
        const { network } = e;
        const { ircClient } = network;

        ircClient.sendMessage = function sendMessage(commandName, target, message, tags) {
            log.debug('sending msg', ...arguments, new Error().stack);
            const lines = [message];

            lines.forEach(line => {
                // Maximum length of target + message we can send to the IRC server is 500 characters
                // but we need to leave extra room for the sender prefix so the entire message can
                // be sent from the IRCd to the target without being truncated.
                const blocks = [
                    ...lineBreak(line, {
                        bytes: 512 - 64,
                        allowBreakingWords: true,
                        allowBreakingGraphemes: true,
                    })
                ].flatMap(b => b.split(/\r\n|\n|\r/));
                let batchId;
                log.debug("Blocks", { blocks });
                if (blocks.length > 1) {
                    batchId = uuidv4();
                    this.raw("BATCH", `+${batchId}`, "draft/multiline", target);
                }
                if (batchId) {
                    tags = tags || {};
                    tags.batch = batchId;
                }
                blocks.forEach(block => {
                    if (tags && Object.keys(tags).length) {
                        const msg = new IrcMessage(commandName, target, block);
                        log.debug("msg", { msg });
                        msg.tags = tags;

                        this.raw(msg.to1459());
                    } else {
                        this.raw(commandName, target, block);
                    }
                });
                if (batchId) this.raw("BATCH", `-${batchId}`);
            });

        }



        // receiving 
        kiwi.on('irc.batch start draft/multiline', (batch, network, h) => {
            log.debug('uh', batch, network, h);
            batches[batch.id] = batch;
            h.handled = true;
        });
        kiwi.on('irc.message', (message, network, h) => {
            if (message.batch && batches[message.batch?.id] && message.batch?.type === 'draft/multiline') {
                console.log("Got multiline...", message.message);
                h.handled = true;
                const batch = batches[message.batch.id];
                if (!batch.events) {
                    batch.events = []
                }
                batch.events.push(message);
            }
        });
        kiwi.on('irc.batch end draft/multiline', (batch, network, h) => {
            delete batches[batch.id];
            log.debug("events:", batch.events, batch);
            if (!batch.events) return;
            const [event] = batch.events;
            const message = {
                ...event,
                message: batch.events.map(e => e.message + (e.tags["draft/multiline-concat"] !== undefined ? '' : '\n')).join(''),
                tags: {
                    ...batch.tags,
                    ...event.tags,
                    msgid: batch.id,
                    batch: undefined
                }
            }
            h.handled = true;
            log.debug("Posting", message)
            ircClient.parsed_middleware.handle(['message', message, ircClient], function (err) {
                if (err) {
                    console.error(err.stack);
                    return;
                }

                ircClient.emit('message', message);
            });
        })

    });


})