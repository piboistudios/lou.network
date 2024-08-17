
kiwi.plugin('message-replies', function (kiwi, log) {
    const prepend = kiwi.Vue.extend({
        template: `<div @click.stop="scrollToReply" v-if="isReply" class="irc-fg-colour-grey"  >
            <div style="overflow:hidden;white-space:nowrap;display:inline-block;font-weight:initial;">↪<span>In reply to <strong>{{subject.nick}}</strong>:</span></div>
            <a
                class="u-link"
                style="margin:0;font-style: italic;"
            >
                <div class="truncate" style="max-width: 25vw;display:inline-block" ><span class="inline" v-html="subject.html"/></div>
            </a>
        </div>`,
        created() {
            log.debug("Props:", { message: this.message, buffer: this.buffer })
            log.debug("Vm:", this);
        },
        methods: {
            scrollToReply() {
                // alert()
                this.$state.$emit('scrolltoreply');
                this.$state.$emit('messageinfo.close');
                const msgid = this.subject.tags.msgid;
                this.$state.$emit('messagelist.scrollto', { id: msgid });
                const el = document.querySelector(`[data-message-id="${msgid}"]`);
                this.$nextTick(() => {

                    el.classList.add('attention');
                    document.body.addEventListener('click', f)
                    this.$state.$on('scrolltoreply', f);
                });
                function f() {
                    el.classList.remove('attention');
                    dispose();
                }
                let disposed;
                function dispose() {
                    !disposed && document.body.removeEventListener('click', f);
                    !disposed && this?.$state?.$off?.('scrolltoreply', f);
                    disposed = true;
                }
                // setTimeout(() => {
                // }, 4000)
            }
        },
        computed: {
            isReply() {
                return Boolean(this?.message?.tags?.["+draft/reply"])
            },
            subject() {
                return this.buffer.getMessages().find(m => m.tags.msgid === this.message.tags["+draft/reply"])
            }
        },
        props: ['message', 'buffer', 'color']
    });
    const reply = kiwi.Vue.extend({
        template: `<a v-if="message.tags.msgid" @click="reply" class="u-link kiwi-messageinfo-reply">Reply</a>`,
        methods: {
            reply() {
                // alert('waaa');
                this.buffer.state.reply = this.message;
                // log.debug("Props:", { message: this.message, buffer: this.buffer })
                // log.debug("Vm:", this);
                kiwi.emit('dock.update');

            }
        },
        props: ['message', 'buffer']
    });
    const HANDLES_REPLIES = Symbol('reply');
    const dockMsg = kiwi.Vue.extend({
        template: `<div style="display:flex;align-items:center;"v-if="msg">
                        <a 
                        @click="cancel" 
                        style="margin-right: 4px" 
                        class="kiwi-controlinput-button">
                            <i class="fa fa-close"/>
                        </a>
                        <span>
                            {{msg}}
                        </span>
                    </div>`,
        created() {
            kiwi.on('dock.update', () => {
                const buffer = this.$state.getActiveBuffer();
                if (!buffer[HANDLES_REPLIES]) {
                    const oldAdd = this.$state.addMessage.bind(this.$state);
                    this.$state.addMessage = function (buf, msg) {
                        if (buffer.state.reply && ['PRIVMSG'].indexOf(msg.type.toUpperCase()) && kiwi.state.getActiveNetwork().nick === msg.nick && msg.fromMe) {
                            if (!msg.tags) msg.tags = {};
                            msg.tags["+draft/reply"] = buffer.state.reply.tags.msgid;
                        }
                        oldAdd(...arguments);
                    }


                    buffer[HANDLES_REPLIES] = true;
                }
                if (!buffer?.state?.reply)
                    this.msg = null;

                else {
                    this.msg = `Replying to ${buffer.state.reply.nick}:`
                    this?.controlinput?.$refs?.input?.focus?.();

                }
            })
        },
        props: ['controlinput'],
        methods: {
            cancel() {
                this.msg = null;
                const buffer = this.$state.getActiveBuffer();
                buffer.state.reply = null;
            }
        },
        data() {
            return {
                msg: null
            }
        }
    })
    kiwi.addUi('message_prepend', prepend);
    // kiwi.addUi('message_append', component);
    kiwi.addUi('message_info', reply);
    kiwi.addUi('input_dock', dockMsg);

    kiwi.on('ircout', async (evt) => {
        /**
         * @type {import('../../kiwiirc/src/libs/state/BufferState').default}
         */
        if (['PRIVMSG'].includes(evt.message.command)) {
            let buffer = kiwi.state.getActiveBuffer();
            if (!buffer.state.reply) return;
            if (!evt.tags) evt.message.tags = {};
            evt.message.fromMe = true;
            evt.message.tags["+draft/reply"] = buffer.state.reply.tags.msgid;
            delete buffer.state.reply;
            kiwi.emit('dock.update');
            kiwi.emit('messageinfo.close');
        }
        log.debug("About to send", evt);
        /*    {
               time: eventTime,
               server_time: serverTime,
               nick: event.nick,
               message: messageBody,
               type: event.type,
               tags: event.tags || {},
           }; */

    });

})