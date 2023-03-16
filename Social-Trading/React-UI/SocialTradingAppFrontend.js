exports.newSocialTradingAppFrontend = function newSocialTradingAppFrontend() {

    let thisObject = {
        run: run
    }

    return thisObject

    async function run() {

        await setupServices()

        async function setupServices() {

            let react = require('./frontend/scripts/start')
            let port = 33249;
            react.start(port); // todo get port from node config
            console.log(`react Interface ................................................ Listening at port ${port}`);

        }
    }
}

let app = this.newSocialTradingAppFrontend();
app.run();