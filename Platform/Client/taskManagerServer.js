﻿exports.newTaskManagerServer = function newTaskManagerServer() {

    let thisObject = {
        initialize: initialize,
        finalize: finalize,
        run: run,
        newEventsServerClient: newEventsServerClient
    }

    /*
    This server creates and destroys Task Servers according to what is going on at the UI. Each of these created servers will do their own
    work. The responsibility of this server is to manage those children processes in order to be in sync with what the end user want and is defining
    at the user interface.
    */

    const { fork } = require('child_process')
    tasksMap = new Map()

    return thisObject

    function finalize() {

    }

    function initialize() {

    }

    function run() {
        /*
        Here we will create an Event Handler for this server. After that we will listen to events happening here. Elements of the UI will raise events here,
        as a way to communicate what is going on with the user interacting with UI components. That is the way this server will know for example when a new
        task needs to be created or destroyed.
        */
        let eventsServerClient = newEventsServerClient()
        eventsServerClient.createEventHandler('Task Manager')
        eventsServerClient.listenToEvent('Task Manager', 'Run Task', undefined, undefined, undefined, runTask)
        eventsServerClient.listenToEvent('Task Manager', 'Stop Task', undefined, undefined, undefined, stopTask)
        eventsServerClient.listenToEvent('Task Manager', 'Task Status', undefined, undefined, undefined, taskStatus)

        function runTask(message) {
            //SA.logger.info('Client -> Task Manager Server -> runTask -> Entering function.') 

            if (message.event === undefined) {
                SA.logger.warn('Client -> Task Manager Server -> runTask -> Message Received Without Event -> message = ' + JSON.stringify(message).substring(0, 1000))
                return
            }

            if (message.event.taskId === undefined) {
                SA.logger.warn('Client -> Task Manager Server -> runTask -> Message Received Without taskId -> message = ' + JSON.stringify(message).substring(0, 1000))
                return
            }

            if (message.event.taskDefinition === undefined) {
                SA.logger.warn('Client -> Task Manager Server -> runTask -> Message Received Without taskDefinition -> message = ' + JSON.stringify(message).substring(0, 1000))
                return
            }

            if (tasksMap.get(message.event.taskId) !== undefined) {
                let key = message.event.taskName + '-' + 'Task' + '-' + message.event.taskId
                eventsServerClient.raiseEvent(key, 'Running') // Meaning Task Running
                return
            }
            //SA.logger.info('Client -> Task Manager Server -> runTask -> Task Name = ' + message.event.taskName)
            //SA.logger.info('Client -> Task Manager Server -> runTask -> Task Id = ' + message.event.taskId) 

            let path = global.env.BASE_PATH + '/TaskServerRoot.js'

            /* Workaround to avoid having the same debug port at the forked process which makes it crash. */
            for (let i = 0; i < process.execArgv.length; i++) {
                let argument = process.execArgv[i]
                if (argument.indexOf('--inspect') > -1) {
                    process.execArgv[i] = ''
                }
            }

            const taskArgs = [message.event.taskId]
            if(global.env.LOG_LEVEL !== undefined) {
                taskArgs.push('logLevel=' + global.env.LOG_LEVEL)
            }
            
            /* 
            Forking this process: 

            The Task Server is going to run at a fork of this process. In this way we have a some communication capabilities
            between processes, which is kind of limited but good enough for what we need. We send to the forked process
            the taskId and taskName at the same time we create the process. Once the process is up and running it will 
            emit an event that is ready, and at that point we will send all the information needed to run the task.
            */
            let task = {
                childProcess: fork(path, taskArgs, { stdio: 'inherit' }),
                id: message.event.taskId,
                name: message.event.taskName
            }
            /* Remember this is a running task now */
            tasksMap.set(message.event.taskId, task)
            /* If the Task Server crashes, we remove it from our task map */
            task.childProcess.on('error', (err) => {
                SA.logger.error('Client -> Task Manager Server -> runTask -> Problem with Task Name = ' + task.name)
                SA.logger.error('Client -> Task Manager Server -> runTask -> Problem with Task Id = ' + task.id)
                SA.logger.error(`[ERROR] Client -> Task Manager Server -> runTask -> Task Server exited with error ${err}`)
                tasksMap.delete(task.id)
            })
            /* If the Task Server stops, we remove it from our task map */
            task.childProcess.on('close', (code, signal) => {
                //SA.logger.info('Client -> Task Manager Server -> runTask -> Task Terminated. -> Task Name = ' + task.name)
                //SA.logger.info('Client -> Task Manager Server -> runTask -> Task Terminated. -> Task Id = ' + task.id)
                tasksMap.delete(task.id)
            })
            /* 
            We listen to the newly created Task Server events, waiting until it is up and ready to receive all the Task specific
            instruction, to know what kind of task to execute. 
            */
            eventsServerClient.listenToEvent('Task Manager - ' + message.event.taskId, 'Nodejs Process Ready for Task', undefined, undefined, undefined, sendStartingEvent)
            /*
            Here we do send the rest of the task information we have, which is what defines what the Task Server is actually 
            going to do. From there on, here at the Task Manager, we have nothing to do until either the Task Server crashes or exit,
            or the end users requests to stop it. Note that the due to the size of the instructions can not be sent via 
            intra-process communications.
            */
            function sendStartingEvent() {
                //SA.logger.info('Client -> Task Manager Server -> runTask -> Emitting Event -> key = ' + 'Task Server - ' + task.id)
                eventsServerClient.raiseEvent('Task Server - ' + task.id, 'Run Task', message.event)
            }
        }

        function stopTask(message) {
            //SA.logger.info('Client -> Task Manager Server -> stopTask -> Entering function.')
            if (message.event === undefined) {
                SA.logger.warn('Client -> Task Manager Server -> stopTask -> Message Received Without Event -> message = ' + JSON.stringify(message).substring(0, 1000))
                return
            }

            if (message.event.taskId === undefined) {
                SA.logger.warn('Client -> Task Manager Server -> stopTask -> Message Received Without taskId -> message = ' + JSON.stringify(message).substring(0, 1000))
                return
            }
            //SA.logger.info('Client -> Task Manager Server -> stopTask -> Task Name = ' + message.event.taskName)
            //SA.logger.info('Client -> Task Manager Server -> stopTask -> Task Id = ' + message.event.taskId) 

            let task = tasksMap.get(message.event.taskId)

            /*
            The instruction to stop the Task Server process is sent via intra-process messaging. We will remove this task from
            our map once we received the onClose event of our forked process.
            */
            if (task) {
                task.childProcess.send('Stop this Task');
                //SA.logger.info('Client -> Task Manager Server -> stopTask -> Child Process instructed to finish.')
            } else {
                SA.logger.warn('Client -> Task Manager Server -> stopTask -> Cannot delete Task that does not exist.')
            }
        }

        function taskStatus(message) {
            //SA.logger.info('Client -> Task Manager Server -> taskStatus -> Entering function.')
            if (message.event === undefined) {
                SA.logger.warn('Client -> Task Manager Server -> taskStatus -> Message Received Without Event -> message = ' + JSON.stringify(message).substring(0, 1000))
                return
            }

            if (message.event.taskId === undefined) {
                SA.logger.warn('Client -> Task Manager Server -> taskStatus -> Message Received Without taskId -> message = ' + JSON.stringify(message).substring(0, 1000))
                return
            }
            //SA.logger.info('Client -> Task Manager Server -> taskStatus -> Task Name = ' + message.event.taskName)
            //SA.logger.info('Client -> Task Manager Server -> taskStatus -> Task Id = ' + message.event.taskId) 

            let task = tasksMap.get(message.event.taskId)
            let event = {}
            if (task) {
                event.status = 'Task Process Running'
                eventsServerClient.raiseEvent('Task Client - ' + message.event.taskId, 'Task Status', event)
            } else {
                event.status = 'Task Process Not Running'
                eventsServerClient.raiseEvent('Task Client - ' + message.event.taskId, 'Task Status', event)
            }
        }
    }

    function newEventsServerClient() {
        let thisObject = {
            initialize: initialize,
            finalize: finalize,
            createEventHandler: createEventHandler,
            deleteEventHandler: deleteEventHandler,
            listenToEvent: listenToEvent,
            stopListening: stopListening,
            raiseEvent: raiseEvent,
            onMessage: onMessage
        }

        let eventListeners = new Map()
        let responseWaiters = new Map()

        return thisObject


        function finalize() {
            /* Before disconnecting we will force all eventListeners to stop listening. */
            const eventListenersArray = [...eventListeners.values()]
            for (let i = 0; i < eventListenersArray.length; i++) {
                let handler = eventListenersArray[i]
                let eventCommand = {
                    action: 'stopListening',
                    eventHandlerName: handler.eventHandlerName,
                    eventType: handler.eventType,
                    callerId: handler.callerId
                }
                sendCommand(eventCommand)
            }
        }

        function initialize() {

        }

        function onMessage(data) {
            try {
                let message = JSON.parse(data)

                if (message.action === 'Event Raised') {
                    let key
                    if (message.callerId) {
                        key = message.eventHandlerName + '-' + message.eventType + '-' + message.callerId
                    } else {
                        key = message.eventHandlerName + '-' + message.eventType
                    }
                    let handler = eventListeners.get(key)
                    if (handler) {
                        handler.callBack(message)
                    } else {
                        SA.logger.error(key + ' not found so could not deliver event raised.')
                        SA.logger.error(' Message = ' + data)
                    }
                    return
                }

                if (message.action === 'Event Server Response') {
                    let handler = responseWaiters.get(message.callerId)
                    if (handler) {
                        handler(message)
                    }
                    return
                }
            } catch (err) {
                SA.logger.error('Client -> Task Manager Server -> onMessage -> Error Receiving Message from Events Server -> data = ' + JSON.stringify(data))
                SA.logger.error('Client -> Task Manager Server -> onMessage -> Error Receiving Message from Events Server -> error = ' + err.stack)
            }
        }

        function sendCommand(command, responseCallBack, eventsCallBack) {
            try {
                if (command.action === 'listenToEvent') {
                    let key
                    if (command.callerId) {
                        key = command.eventHandlerName + '-' + command.eventType + '-' + command.callerId
                    } else {
                        key = command.eventHandlerName + '-' + command.eventType
                    }
                    let handler = {
                        eventHandlerName: command.eventHandlerName,
                        eventType: command.eventType,
                        callerId: command.callerId,
                        callBack: eventsCallBack
                    }
                    eventListeners.set(key, handler)
                }
                if (command.callerId && responseCallBack) {
                    responseWaiters.set(command.callerId, responseCallBack)
                }

                PL.servers.EVENT_SERVER.onMessage(JSON.stringify(command), thisObject.onMessage)
            } catch (err) {
                SA.logger.error('Client -> Task Manager Server -> sendCommand -> Error Sending Command to Events Server -> command = ' + JSON.stringify(command))
                SA.logger.error('Client -> Task Manager Server -> sendCommand -> Error Sending Command to Events Server -> error = ' + err.stack)
            }
        }

        function createEventHandler(eventHandlerName, callerId, responseCallBack) {
            let eventCommand = {
                action: 'createEventHandler',
                eventHandlerName: eventHandlerName,
                callerId: callerId
            }
            sendCommand(eventCommand, responseCallBack)
        }

        function deleteEventHandler(eventHandlerName, callerId, responseCallBack) {
            let eventCommand = {
                action: 'deleteEventHandler',
                eventHandlerName: eventHandlerName,
                callerId: callerId
            }
            sendCommand(eventCommand, responseCallBack)
        }

        function listenToEvent(eventHandlerName, eventType, extraData, callerId, responseCallBack, eventsCallBack) {
            let eventCommand = {
                action: 'listenToEvent',
                eventHandlerName: eventHandlerName,
                eventType: eventType,
                extraData: extraData,
                callerId: callerId
            }
            sendCommand(eventCommand, responseCallBack, eventsCallBack)
        }

        function stopListening(eventHandlerName, eventType, eventSubscriptionId, callerId, responseCallBack) {
            /* User either needs to specify a valid eventSubscriptionId OR the 3 params: eventHandlerName, eventType, callerId which were used when start listening to events. */
            let eventCommand = {
                action: 'stopListening',
                eventHandlerName: eventHandlerName,
                eventType: eventType,
                eventSubscriptionId: eventSubscriptionId,
                callerId: callerId
            }
            sendCommand(eventCommand, responseCallBack)
        }

        function raiseEvent(eventHandlerName, eventType, event, callerId, responseCallBack) {
            let eventCommand = {
                action: 'raiseEvent',
                eventHandlerName: eventHandlerName,
                eventType: eventType,
                event: event,
                callerId: callerId
            }
            sendCommand(eventCommand, responseCallBack)
        }
    }
}



