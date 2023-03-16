exports.newNetworkModulesWebSocketsNetworkClient = function newNetworkModulesWebSocketsNetworkClient() {

    let thisObject = {
        socketNetworkClients: undefined,
        p2pNetworkNode: undefined,
        host: undefined,
        port: undefined,
        initialize: initialize,
        finalize: finalize
    }

    return thisObject

    function finalize() {
        thisObject.socketNetworkClients = undefined
        thisObject.p2pNetworkNode = undefined
        thisObject.host = undefined
        thisObject.port = undefined
    }

    async function initialize(
        callerRole,
        p2pNetworkClientIdentity,
        p2pNetworkNode,
        p2pNetworkClient,
        onConnectionClosedCallBack
    ) {

        thisObject.p2pNetworkNode = p2pNetworkNode
        thisObject.host = thisObject.p2pNetworkNode.node.config.host   
        thisObject.port = thisObject.p2pNetworkNode.node.networkInterfaces.websocketsNetworkInterface.config.webSocketsPort

        /*
        DEBUG NOTE: If you are having trouble undestanding why you can not connect to a certain network node, then you can activate the following Console Logs, otherwise you keep them commented out.
        */
        SA.logger.debug('Websockets Client will try to Connect to Network Node via Web Sockets ........ Trying to Connect to ' + thisObject.p2pNetworkNode.userProfile.config.codeName + ' -> ' + thisObject.p2pNetworkNode.node.name + ' -> ' + thisObject.host + ':' + thisObject.port)
        

        let socket = new SA.nodeModules.ws('ws://' + thisObject.host + ':' + thisObject.port)

        thisObject.socketNetworkClients = SA.projects.network.modules.socketNetworkClients.newNetworkModulesSocketNetworkClients()
        thisObject.socketNetworkClients.initialize(
            socket,
            callerRole,
            p2pNetworkClientIdentity,
            p2pNetworkNode,
            p2pNetworkClient,
            onConnectionClosedCallBack
        )

        await setUpWebSocketClient(socket)

        SA.logger.info('')
        SA.logger.info('Websockets Client Connected to Network Node via Web Sockets .................. Connected to ' + thisObject.p2pNetworkNode.userProfile.config.codeName + ' -> ' + thisObject.p2pNetworkNode.node.name + ' -> ' + thisObject.host + ':' + thisObject.port)
        SA.logger.info('')
        thisObject.socketNetworkClients.isConnected = true

    }

    async function setUpWebSocketClient(socket) {

        return new Promise(connectToNewtwork)

        function connectToNewtwork(resolve, reject) {

            try {

                socket.onopen = () => { onConnectionOpened() }
                socket.onclose = () => { onConnectionClosed() }
                socket.onerror = err => { onError(err) }
                socket.on('ping', heartbeat)

                function onConnectionOpened() {
                    heartbeat()
                    thisObject.socketNetworkClients.handshakeProcedure(resolve, reject)
                }

                function onConnectionClosed() {
                    clearTimeout(socket.pingTimeout)
                    if (thisObject.socketNetworkClients.isConnected === true) {
                        SA.logger.info('')
                        SA.logger.info('Websockets Client Disconnected from Network Node via Web Sockets ............. Disconnected from ' + thisObject.p2pNetworkNode.userProfile.config.codeName + ' -> ' + thisObject.p2pNetworkNode.node.name + ' -> ' + thisObject.host + ':' + thisObject.port)
                        SA.logger.info('')
                    }
                    if (thisObject.onConnectionClosedCallBack !== undefined) {
                        thisObject.onConnectionClosedCallBack(thisObject.id)
                    }
                    thisObject.socketNetworkClients.isConnected = false
                }

                function onError(err) {
                    if (err.message.indexOf('ECONNREFUSED') >= 0) {
                        /*
                        DEBUG NOTE: If you are having trouble undestanding why you can not connect to a certain network node, then you can activate the following Console Logs, otherwise you keep them commented out.
                        */ 
                        SA.logger.error('Web Sockets Network Client -> onError -> Nobody home at ' + thisObject.host + ':' + thisObject.port)
                        
                        reject()
                        return
                    } else if (err.message.indexOf('ETIMEDOUT') >= 0) {
                        /*
                        DEBUG NOTE: If you are having trouble undestanding why you can not connect to a certain network node, then you can activate the following Console Logs, otherwise you keep them commented out.
                        */ 
                        SA.logger.error('Web Sockets Network Client -> onError -> Connection Timed out ' + thisObject.host + ':' + thisObject.port)
                        
                        reject()
                        return
                    }
                    SA.logger.error('Web Sockets Network Client -> onError -> err.message = ' + err.message)
                    SA.logger.error('Web Sockets Network Client -> onError -> err.stack = ' + err.stack)
                    reject()
                    return
                }

                /* This function awaits a heartbeat from the server every 30 seconds + 15 seconds grace and re-initializes if not received. Prevents hidden connection drops. Ensure timeout matches with WebSocketsInterface.js
                Longer grace period is required due to large Bitcoin Factory files being transferred, this blocking the connection for the ping for a little while. 
                */
                function heartbeat() {
                    clearTimeout(socket.pingTimeout)
                    socket.pingTimeout = setTimeout(() => {
                        SA.logger.info('No Websockets heartbeat received from server, re-initializing connection...')
                        socket.terminate()
                    }, 30000 + 15000)
                }

            } catch (err) {
                SA.logger.error('Web Sockets Network Client -> setUpWebSocketClient -> err.stack = ' + err.stack)
            }
        }
    }
}