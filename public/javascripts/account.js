kiwi.plugin('account', function(kiwi, log) {

    const logoutPage = ({
        template: `<div
            class="kiwi-appsettings-block"
        >
            <h3>Account</h3>
            <div class="kiwi-appsettings-section kiwi-appsettings-advanced-enable">
                <a class="u-link" href="/auth/logout">Logout</a>
            </div>
        </div>`,
        data() {
            return {

            }
        },
        computed: {
            user() {
                return this.network.currentUser();
            }
        },
        methods: {

        }
    })
    kiwi.addTab('settings', 'Account', logoutPage)
})