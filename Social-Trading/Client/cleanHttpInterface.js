exports.newHttpInterface = function newHttpInterface() {

    /*
    This module represent the HTTP API of the 
    Social Trading App Client. All HTTP request are processed
    by this module.
    */

    let thisObject = {
        initialize: initialize,
        finalize: finalize
    }

    return thisObject

    function finalize() {
    }

    function initialize() {
        let port = ST.socialTradingApp.p2pNetworkClient.p2pNetworkClientIdentity.node.config.webPort
        /*
        We will create an HTTP Server and leave it running forever.
        */
        SA.nodeModules.http.createServer(onHttpRequest).listen(port)
        /* Starting the browser now is optional */
        if (process.argv.includes("noBrowser")) {
            //Running Client only with no UI.
        } else {
            SA.nodeModules.open('http://localhost:' + port)
        }
    }

    function onHttpRequest(httpRequest, httpResponse) {
        // If the UI selected is the standard Clean UI we serve it from here
        try {
            let requestPathAndParameters = httpRequest.url.split('?') // Remove version information
            let requestPath = requestPathAndParameters[0].split('/')
            let endpointOrFile = requestPath[1]

            switch (endpointOrFile) {
                case 'Environment':
                    {
                        SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(global.env), httpResponse)
                    }
                    break
                case 'ClientNode':
                    {
                        let clientNode = {
                            name: ST.socialTradingApp.p2pNetworkClient.p2pNetworkClientIdentity.node.name,
                            type: ST.socialTradingApp.p2pNetworkClient.p2pNetworkClientIdentity.node.type,
                            id: ST.socialTradingApp.p2pNetworkClient.p2pNetworkClientIdentity.node.id,
                            project: ST.socialTradingApp.p2pNetworkClient.p2pNetworkClientIdentity.node.project,
                            config: JSON.stringify(ST.socialTradingApp.p2pNetworkClient.p2pNetworkClientIdentity.node.config)                            
                        }
                        SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(clientNode), httpResponse)
                    }
                    break
                case 'ProjectsSchema':
                    {
                        let path = global.env.PATH_TO_PROJECTS + '/' + 'ProjectsSchema.json'
                        SA.projects.foundations.utilities.httpResponses.respondWithFile(path, httpResponse)
                    }
                    break
                case 'Projects':
                    {
                        let path = ''
                        for (let i = 2; i < 10; i++) {
                            if (requestPath[i] !== undefined) {
                                let parameter = unescape(requestPath[i])
                                path = path + '/' + parameter
                            }

                        }
                        let filePath = global.env.PATH_TO_PROJECTS + path
                        SA.projects.foundations.utilities.httpResponses.respondWithFile(filePath, httpResponse)
                    }
                    break
                case 'Images': // This means the Images folder.
                    {
                        let path = global.env.PATH_TO_SOCIALTRADING + '/Clean-UI/WebServer/Images/' + requestPath[2]

                        if (requestPath[3] !== undefined) {
                            path = path + '/' + requestPath[3]
                        }

                        if (requestPath[4] !== undefined) {
                            path = path + '/' + requestPath[4]
                        }

                        if (requestPath[5] !== undefined) {
                            path = path + '/' + requestPath[5]
                        }

                        path = unescape(path)

                        SA.projects.foundations.utilities.httpResponses.respondWithImage(path, httpResponse)
                    }
                    break
                default:
                    {
                        SA.projects.foundations.utilities.httpResponses.respondWithWebFile(httpResponse, endpointOrFile, global.env.PATH_TO_SOCIALTRADING + '/Clean-UI')
                    }
            }
        } catch (err) {
            console.log(err.stack)
        }
    }
}
