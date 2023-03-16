function newWebApp() {
    /*
    In it's current state of development, the Web App only has one module. 

    Everything is being coded here until some structure emerges. 
    */
    let thisObject = {
        webSocketsWebAppClient: undefined,
        messageReceived: messageReceived,
        initialize: initialize,
        finalize: finalize
    }

    return thisObject

    function finalize() {

    }

    async function initialize() {
        try {

            setupRootObject(UI, 'UI')
            setupRootObject(SA, 'SA')

            thisObject.webSocketsWebAppClient = newWebSocketsWebAppClient()
            await thisObject.webSocketsWebAppClient.initialize()

            loadWUserProfileTimeline()
            loadWhoToFollow()
            setupEventHandlers()
        } catch (err) {
            console.log((new Date()).toISOString(), '[ERROR] initialize -> err.stack = ' + err.stack)
        }
    }

    function setupRootObject(rootObject, rootObjectName) {
        /*
        Here we will setup the UI object, with all the
        projects and spaces.
        */
        for (let i = 0; i < UI.schemas.projectSchema.length; i++) {
            let projectDefinition = UI.schemas.projectSchema[i]
            rootObject.projects[projectDefinition.propertyName] = {}
            let projectInstance = rootObject.projects[projectDefinition.propertyName]

            projectInstance.utilities = {}
            projectInstance.globals = {}
            projectInstance.functionLibraries = {}
            projectInstance.modules = {}

            if (projectDefinition[rootObjectName] === undefined) { continue }

            /* Set up Globals of this Project */
            if (projectDefinition[rootObjectName].globals !== undefined) {
                for (let j = 0; j < projectDefinition[rootObjectName].globals.length; j++) {
                    let globalDefinition = projectDefinition[rootObjectName].globals[j]

                    if (exports[globalDefinition.functionName] === undefined) {
                        projectInstance.globals[globalDefinition.propertyName] = eval(globalDefinition.functionName + '()')
                    } else {
                        projectInstance.globals[globalDefinition.propertyName] = eval('exports.' + globalDefinition.functionName + '()')
                    }
                }
            }

            /* Set up Utilities of this Project */
            if (projectDefinition[rootObjectName].utilities !== undefined) {
                for (let j = 0; j < projectDefinition[rootObjectName].utilities.length; j++) {
                    let utilityDefinition = projectDefinition[rootObjectName].utilities[j]

                    if (exports[utilityDefinition.functionName] === undefined) {
                        projectInstance.utilities[utilityDefinition.propertyName] = eval(utilityDefinition.functionName + '()')
                    } else {
                        projectInstance.utilities[utilityDefinition.propertyName] = eval('exports.' + utilityDefinition.functionName + '()')
                    }
                }
            }

            /* Set up Function Libraries of this Project */
            if (projectDefinition[rootObjectName].functionLibraries !== undefined) {
                for (let j = 0; j < projectDefinition[rootObjectName].functionLibraries.length; j++) {
                    let functionLibraryDefinition = projectDefinition[rootObjectName].functionLibraries[j]

                    if (exports[functionLibraryDefinition.functionName] === undefined) {
                        projectInstance.functionLibraries[functionLibraryDefinition.propertyName] = eval(functionLibraryDefinition.functionName + '()')
                    } else {
                        projectInstance.functionLibraries[functionLibraryDefinition.propertyName] = eval('exports.' + functionLibraryDefinition.functionName + '()')
                    }
                }
            }

            /* Set up Modules of this Project */
            if (projectDefinition[rootObjectName].modules !== undefined) {
                for (let j = 0; j < projectDefinition[rootObjectName].modules.length; j++) {
                    let functionLibraryDefinition = projectDefinition[rootObjectName].modules[j]

                    if (exports[functionLibraryDefinition.functionName] === undefined) {
                        projectInstance.modules[functionLibraryDefinition.propertyName] = eval(functionLibraryDefinition.functionName + '()')
                    } else {
                        projectInstance.modules[functionLibraryDefinition.propertyName] = eval('exports.' + functionLibraryDefinition.functionName + '()')
                    }
                }
            }
        }
    }

    async function loadWUserProfileTimeline() {
        let queryMessage = {
            queryType: SA.projects.socialTrading.globals.queryTypes.EVENTS,
            originSocialPersonaId: undefined,
            initialIndex: SA.projects.socialTrading.globals.queryConstants.INITIAL_INDEX_LAST,
            amountRequested: 100,
            direction: SA.projects.socialTrading.globals.queryConstants.DIRECTION_PAST
        }

        let query = {
            networkService: 'Social Graph',
            requestType: 'Query',
            queryMessage: JSON.stringify(queryMessage)
        }

        await thisObject.webSocketsWebAppClient.sendMessage(
            JSON.stringify(query)
        )
            .then(addToContentDiv)
            .catch(onError)

        function onError(errorMessage) {
            console.log((new Date()).toISOString(), '[ERROR] Query not executed. ' + errorMessage)
            console.log((new Date()).toISOString(), '[ERROR] query = ' + JSON.stringify(query))
        }

        function addToContentDiv(events) {
            try {
                let contentDiv = document.getElementById('content-div')
                /*
                Delete al current content.
                */
                while (contentDiv.childNodes.length > 4) {
                    let childToRemove = contentDiv.childNodes[contentDiv.childNodes.length - 1]
                    contentDiv.removeChild(childToRemove)
                }
                /*
                Render the timeline.
                */
                for (let i = 0; i < events.length; i++) {
                    let event = events[i]

                    let postDiv = document.createElement("div")
                    postDiv.setAttribute("class", "post-div")
                    let textNode

                    switch (event.eventType) {
                        case SA.projects.socialTrading.globals.eventTypes.NEW_SOCIAL_PERSONA_POST: {
                            textNode = document.createTextNode(event.originSocialPersona.socialPersonaHandle + " POSTED " + event.postText + ' ' + event.originPostHash)
                            break
                        }
                        case SA.projects.socialTrading.globals.eventTypes.FOLLOW_USER_PROFILE: {
                            textNode = document.createTextNode(event.originSocialPersona.socialPersonaHandle + " FOLLOWED " + event.targetSocialPersona.socialPersonaHandle)
                            break
                        }
                        case SA.projects.socialTrading.globals.eventTypes.UNFOLLOW_USER_PROFILE: {
                            textNode = document.createTextNode(event.originSocialPersona.socialPersonaHandle + " UNFOLLOWED " + event.targetSocialPersona.socialPersonaHandle)
                            break
                        }
                    }

                    postDiv.appendChild(textNode)
                    contentDiv.appendChild(postDiv)
                }
            }
            catch (err) {
                console.log((new Date()).toISOString(), '[ERROR] err.stack = ' + err.stack)
            }
        }
    }

    async function loadWhoToFollow() {
        let queryMessage = {
            queryType: SA.projects.socialTrading.globals.queryTypes.UNFOLLOWED_SOCIAL_PERSONAS,
            originSocialPersonaId: undefined,
            initialIndex: SA.projects.socialTrading.globals.queryConstants.INITIAL_INDEX_FIRST,
            amountRequested: 3,
            direction: SA.projects.socialTrading.globals.queryConstants.DIRECTION_UP
        }

        let query = {
            networkService: 'Social Graph',
            requestType: 'Query',
            queryMessage: JSON.stringify(queryMessage)
        }

        await thisObject.webSocketsWebAppClient.sendMessage(
            JSON.stringify(query)
        )
            .then(addWhoToFollowTable)
            .catch(onError)

        function onError(errorMessage) {
            console.log((new Date()).toISOString(), '[ERROR] Query not executed. ' + errorMessage)
            console.log((new Date()).toISOString(), '[ERROR] query = ' + JSON.stringify(query))
        }

        function addWhoToFollowTable(socialPersonas) {

            let contextCell = document.getElementById('who-to-follow-cell')
            let table = document.createElement("table")
            let tblBody = document.createElement("tbody")

            for (let i = 0; i < socialPersonas.length; i++) {
                let socialPersona = socialPersonas[i]
                let row = document.createElement("tr")

                let cell = document.createElement("td")
                addProfileToFollowTable(cell, socialPersona)
                row.appendChild(cell)

                tblBody.appendChild(row)
            }

            table.appendChild(tblBody)
            contextCell.appendChild(table)
            table.setAttribute("class", "who-to-follow-table")

            function addProfileToFollowTable(htmlElement, socialPersona) {
                let table = document.createElement("table")
                let tblBody = document.createElement("tbody")

                let row = document.createElement("tr")

                {
                    let cell = document.createElement("td")
                    let textNode = document.createTextNode('Profile Picture')
                    cell.appendChild(textNode)
                    row.appendChild(cell)
                }
                {
                    let cell = document.createElement("td")
                    let textNode = document.createTextNode(socialPersona.socialPersonaHandle)
                    cell.appendChild(textNode)
                    row.appendChild(cell)
                }
                {
                    let cell = document.createElement("td")
                    let span = document.createElement("span")
                    let button = document.createElement("button")
                    let text = document.createTextNode('Follow')

                    span.setAttribute("id", "profile-to-follow-span-" + socialPersona.socialPersonaId)
                    button.name = 'Follow Profile'
                    button.id = socialPersona.socialPersonaId

                    span.setAttribute("class", "profile-to-follow-span")
                    button.setAttribute("class", "profile-to-follow-button")

                    button.appendChild(text)
                    span.appendChild(button)
                    cell.appendChild(span)
                    row.appendChild(cell)
                }

                tblBody.appendChild(row)

                table.appendChild(tblBody)
                htmlElement.appendChild(table)
                table.setAttribute("class", "profile-to-follow-table")
            }
        }
    }

    function setupEventHandlers() {
        /*
        Add events to process button clicks , and mouseWheel.
        */
        document.addEventListener("click", onClick)
        document.addEventListener('mousewheel', onMouseWheel, false)

        async function onClick(event) {

            if (event.target && event.target.nodeName === "BUTTON") {
                switch (event.target.name) {
                    case 'New Post': {
                        let textArea = document.getElementById("new-post-text-area")
                        await sendNewPostEvent(
                            textArea.value
                        )
                            .then(updateTextArea)
                            .catch(onError)

                        function updateTextArea() {
                            textArea.value = ""
                        }
                        break
                    }
                    case 'Follow Profile': {
                        await sendTargetUserProfileEvent(
                            event.target.id,
                            SA.projects.socialTrading.globals.eventTypes.FOLLOW_USER_PROFILE
                        )
                            .then(updateButton)
                            .catch(onError)

                        function updateButton() {
                            let span = document.getElementById('profile-to-follow-span-' + event.target.id)
                            let button = document.getElementById(event.target.id)
                            span.setAttribute("class", "profile-to-unfollow-span")
                            button.setAttribute("class", "profile-to-unfollow-button")
                            button.name = 'Unfollow Profile'
                        }
                        break
                    }
                    case 'Unfollow Profile': {
                        await sendTargetUserProfileEvent(
                            event.target.id,
                            SA.projects.socialTrading.globals.eventTypes.UNFOLLOW_USER_PROFILE
                        )
                            .then(updateButton)
                            .catch(onError)

                        function updateButton() {
                            let span = document.getElementById('profile-to-follow-span-' + event.target.id)
                            let button = document.getElementById(event.target.id)
                            span.setAttribute("class", "profile-to-follow-span")
                            button.setAttribute("class", "profile-to-follow-button")
                            button.name = 'Follow Profile'
                        }
                        break
                    }
                }
            }

            /*
            Error Handling
            */
            function onError(errorMessage) {
                console.log((new Date()).toISOString(), '[ERROR] Click event failed. ' + errorMessage)
            }
        }

        function onMouseWheel(event) {
            let scrollDiv = document.getElementById("scroll-div")
            scrollDiv.scrollTop = scrollDiv.scrollTop + event.deltaY
        }
    }

    async function sendTargetUserProfileEvent(
        id,
        eventType
    ) {

        return new Promise((resolve, reject) => { asyncCall(resolve, reject) })

        async function asyncCall(resolve, reject) {
            let eventMessage
            let event

            eventMessage = {
                eventType: eventType,
                eventId: SA.projects.foundations.utilities.miscellaneousFunctions.genereteUniqueId(),
                targetSocialPersonaId: id,
                timestamp: (new Date()).valueOf()
            }

            event = {
                networkService: 'Social Graph',
                requestType: 'Event',
                eventMessage: JSON.stringify(eventMessage)
            }

            await thisObject.webSocketsWebAppClient.sendMessage(
                JSON.stringify(event)
            )
                .then(resolve)
                .catch(onError)

            function onError(errorMessage) {
                console.log((new Date()).toISOString(), '[ERROR] Event not executed. ' + errorMessage)
                console.log((new Date()).toISOString(), '[ERROR] event = ' + JSON.stringify(event))
                reject(errorMessage)
            }
        }
    }

    async function sendNewPostEvent(
        postText
    ) {

        return new Promise((resolve, reject) => { asyncCall(resolve, reject) })

        async function asyncCall(resolve, reject) {
            let eventMessage
            let event

            eventMessage = {
                eventType: SA.projects.socialTrading.globals.eventTypes.NEW_SOCIAL_PERSONA_POST,
                eventId: SA.projects.foundations.utilities.miscellaneousFunctions.genereteUniqueId(),
                postText: postText,
                timestamp: (new Date()).valueOf()
            }

            event = {
                networkService: 'Social Graph',
                requestType: 'Event',
                eventMessage: JSON.stringify(eventMessage)
            }

            /* NEW QUERY TEST */
            queryMessage = {
                queryType: SA.projects.socialTrading.globals.queryTypes.POST,
                originPostHash: "0x66d959e1d33e26e47c2ba108da18015ff2dafc87569184ca051553d52aff97a2"
            }

            event = {
                networkService: 'Social Graph',
                requestType: 'Query',
                queryMessage: JSON.stringify(queryMessage)
            }

            await thisObject.webSocketsWebAppClient.sendMessage(
                JSON.stringify(event)
            )
                .then(onSuccess)
                .catch(onError)

            function onSuccess(reponse) {
                console.log(reponse)
                resolve()
            }
            function onError(errorMessage) {
                console.log((new Date()).toISOString(), '[ERROR] Event not executed. ' + JSON.stringify(errorMessage))
                console.log((new Date()).toISOString(), '[ERROR] event = ' + JSON.stringify(event))
                reject(errorMessage)
            }
        }
    }

    function messageReceived(message) {
        window.alert(message)
    }
}
