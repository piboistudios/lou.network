kiwi.plugin('account', function(kiwi, log) {

    const logoutPage = ({
        template: `<div
            class="kiwi-appsettings-block"
        >
            <h3>Account</h3>
            <div class="kiwi-appsettings-section kiwi-appsettings-advanced-enable">
                <a class="u-link" :href="logoutUrl">Logout</a>
            </div>
        </div>`,
        data() {
            return {

            }
        },
        computed: {
            logoutUrl() {
                const l = new URL('' + location);
                l.searchParams.set('anon', '');
                return `/auth/logout?r=${encodeURIComponent(l)}`
            },
            user() {
                return this.network.currentUser();
            }
        },
        methods: {

        }
    })
    kiwi.addTab('settings', 'Account', logoutPage)
})