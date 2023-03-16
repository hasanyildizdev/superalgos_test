var hyperquest = require('hyperquest')
const ndjson = require('ndjson')

exports.newDataMiningBotModulesFetchingProcess = function (processIndex) {

    const MODULE_NAME = "Fetching Process";

    let thisObject = {
        initialize: initialize,
        start: start
    };

    let fileStorage = TS.projects.foundations.taskModules.fileStorage.newFileStorage(processIndex)
    let statusDependencies
    let lastQueryRun                                                                                     // This holds the epoch value of the last run value passed to the query string.

    return thisObject;

    function initialize(pStatusDependencies, callBackFunction) {
        try {
            statusDependencies = pStatusDependencies;
            callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_OK_RESPONSE)
        } catch (err) {
            TS.projects.foundations.globals.processVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).UNEXPECTED_ERROR = err
            TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                "[ERROR] initialize -> err = " + err.stack)
            callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_FAIL_RESPONSE)
        }
    }

    function start(callBackFunction) {
        try {
            if (TS.projects.foundations.globals.taskVariables.IS_TASK_STOPPING === true) {
                callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_OK_RESPONSE)
                return
            }

            let thisReport          // This holds the status report.
            let processNode         // This hold the node Process Definition
            let lastPage = {}       // This holds the last page fetched for each endpoint
            let contextVariables = {}

            getContextVariables()
            startProcess()

            function getContextVariables() {
                try {
                    processNode = TS.projects.foundations.globals.taskConstants.TASK_NODE.bot.processes[processIndex].referenceParent
                    let reportKey = processNode.parentNode.parentNode.config.codeName + "-" + processNode.parentNode.config.codeName + "-" + processNode.config.codeName

                    TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                        "[INFO] start -> getContextVariables -> reportKey = " + reportKey)

                    if (statusDependencies.statusReports.get(reportKey).status === "Status Report is corrupt.") {
                        TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                            "[ERROR] start -> getContextVariables -> Can not continue because dependency Status Report is corrupt. ")
                        callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_RETRY_RESPONSE)
                        return;
                    }

                    thisReport = statusDependencies.statusReports.get(reportKey)
                    contextVariables.beginingOfMarket = thisReport.file.beginingOfMarket

                } catch (err) {
                    TS.projects.foundations.globals.processVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).UNEXPECTED_ERROR = err
                    TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                        "[ERROR] start -> getContextVariables -> err = " + err.stack)
                    if (err.message === "Cannot read property 'file' of undefined") {
                        TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                            "[HINT] start -> getContextVariables -> Check the bot Status Dependencies. ")
                        TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                            "[HINT] start -> getContextVariables -> Dependencies loaded -> keys = " + JSON.stringify(statusDependencies.keys))
                    }
                    callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_FAIL_RESPONSE)
                }
            }

            async function startProcess() {
                try {
                    processNode = TS.projects.foundations.globals.taskConstants.TASK_NODE.bot.processes[processIndex].referenceParent

                    if (TS.projects.foundations.globals.taskConstants.TASK_NODE.bot.processes[processIndex].apiMapReference === undefined) {
                        TS.projects.foundations.utilities.errorHandlingFunctions.throwHandledException(
                            processIndex,
                            MODULE_NAME,
                            'API Data Fetcher Bot',
                            { errorDetails: "startProcess -> API Map Reference Node Missing. " },
                            'API Map Reference Node Missing',
                            TS.projects.foundations.globals.taskConstants.TASK_NODE.bot.processes[processIndex]
                        )
                    }

                    let apiMap = TS.projects.foundations.globals.taskConstants.TASK_NODE.bot.processes[processIndex].apiMapReference.referenceParent
                    if (apiMap === undefined) {
                        TS.projects.foundations.utilities.errorHandlingFunctions.throwHandledException(
                            processIndex,
                            MODULE_NAME,
                            'API Data Fetcher Bot',
                            { errorDetails: "startProcess -> API Map Reference Parent Missing. " },
                            'Reference Parent Missing',
                            TS.projects.foundations.globals.taskConstants.TASK_NODE.bot.processes[processIndex].apiMapReference
                        )
                    }

                    let hostName
                    let portNumber = ""
                    let path = ""
                    let protocol = "https" // default value

                    if (apiMap.config.hostName === undefined || apiMap.config.hostName === "") {
                        TS.projects.foundations.utilities.errorHandlingFunctions.throwHandledException(
                            processIndex,
                            MODULE_NAME,
                            'API Data Fetcher Bot',
                            { errorDetails: "startProcess -> API Map Config hostName property missing. ", missingProperty: "hostName" },
                            'Config Property Missing',
                            apiMap
                        )
                    } else {
                        hostName = apiMap.config.hostName
                    }

                    if (apiMap.config.portNumber !== undefined && apiMap.config.portNumber !== "") {
                        portNumber = ":" + apiMap.config.portNumber
                    }

                    if (apiMap.config.protocol !== undefined && apiMap.config.protocol !== "") {
                        protocol = apiMap.config.protocol
                    }

                    if (apiMap.config.path !== undefined && apiMap.config.path !== "") {
                        path = "/" + apiMap.config.path
                    }

                    if (apiMap.apiVersions.length === 0) {
                        TS.projects.foundations.utilities.errorHandlingFunctions.throwHandledException(
                            processIndex,
                            MODULE_NAME,
                            'API Data Fetcher Bot',
                            { errorDetails: "startProcess -> API Version Node Missing. " },
                            'API Version Node Missing',
                            apiMap
                        )
                    }
                    if (processNode.processOutput === undefined) {
                        TS.projects.foundations.utilities.errorHandlingFunctions.throwHandledException(
                            processIndex,
                            MODULE_NAME,
                            'API Data Fetcher Bot',
                            { errorDetails: "startProcess -> Process Output Node Missing. " },
                            'Process Output Node Missing',
                            processNode
                        )
                    }
                    /*
                    Process Output Datasets determine which Datasets are going to be built by 
                    this process. We will loop though all of them and build a file for each.
                    If the file already exists, we will add new information to it.
                    */
                    for (let i = 0; i < processNode.processOutput.outputDatasets.length; i++) {
                        let outputDataset = processNode.processOutput.outputDatasets[i]
                        if (outputDataset.referenceParent === undefined) {
                            continue
                        }
                        if (outputDataset.referenceParent.parentNode === undefined) {
                            continue
                        }

                        let fileDateArray = []                                              // This holds the array of file dates to check.
                        let dataset = outputDataset.referenceParent                         // This holds the dataset that is currently being processed.
                        let productDefinition = outputDataset.referenceParent.parentNode    // This is the Product Definition Node related to the current Output Dataset.
                        let endpointNode                                                    // This holds the Endpoint Node at the API Map 
                        let existingFileContent                                             // This holds the data of the existing dataset file.
                        let queryString = ""                                                // This holds the query string to be sent at the API call.
                        let pathString = ""                                                 // This holds the path string to be sent at the API call.
                        let apiResponseReceivedText                                         // This hold the whole text received from the latest API call.
                        let apiResponseReceivedObject                                       // This is the whole response received turned into a JSON object.
                        let apiData                                                         // This holds the specific object containing the data -to be stored- inside the structure received by the API call.
                        let dataReceivedArray = []                                          // This hold the cumulative data received from all calls to the API (multiple pages of data).
                        let dataReceivedObject                                              // This hold a single data object when there is no pagination. The Data object is a node within the whole response received from the API.
                        let pageNumberParameter                                             // This holds the node that represents a Page Number parameter.
                        let pageToken                                                       // This holds the current Page Token value.
                        let pageTokenPath                                                   // This holds the path within apiData to the Page Token.
                        let pageQueryString = ""                                            // This holds the node part of query sting that deals with page numbers 
                        let recordPropertiesNodePathMap = new Map()                         // This holds the calculated nodePath for each record property, in order to help find the property value on the data received.

                        getApiEndpointAndSchema()
                        calculateRecordPropertiesNodePathMap()
                        getEndpointQueryParameters()
                        getEndpointPathParameters()

                        if (await fetchAllPages() !== 'RETRYING') {
                            await saveDataReceived()
                        } else {
                            return
                        }

                        function getApiEndpointAndSchema() {
                            /*
                            We will assume that each Dataset is built fetching data from a single endpointNode at the target API.                        
                            To get the endpointNode node, we will go through the references at the Record Definition. 
                            We will check that all references are pointing to fields belonging to the same endpointNode node.
                            If they are not, we will consider the user did not define well the relationships between nodes
                            and abort the process.                    
                            */
                            for (let j = 0; j < productDefinition.record.properties.length; j++) {
                                let recordProperty = productDefinition.record.properties[j]
                                if (recordProperty.apiResponseFieldReference !== undefined) {
                                    if (recordProperty.apiResponseFieldReference.referenceParent !== undefined) {
                                        let apiResponseField = recordProperty.apiResponseFieldReference.referenceParent
                                        let endpointNodeFound = SA.projects.visualScripting.utilities.nodeFunctions.findNodeInNodeMesh(apiResponseField, 'API Endpoint')
                                        /*
                                        Every Record Property with an apiResponseFieldReference must be on the path 
                                        to a certain endpoint.
                                        */
                                        if (endpointNodeFound === undefined) {
                                            TS.projects.foundations.utilities.errorHandlingFunctions.throwHandledException(
                                                processIndex,
                                                MODULE_NAME,
                                                'API Data Fetcher Bot',
                                                { errorDetails: "getApiEndpointAndSchema -> API Response Field Not Descendant From Endpoint. " },
                                                'API Response Field Not Descendant From Endpoint',
                                                apiResponseField
                                            )
                                        }

                                        if (endpointNode === undefined) {
                                            /* The first endpointNode found will be our endpointNode */
                                            endpointNode = endpointNodeFound
                                        }

                                        /*
                                        Here we check all endpoints are actually the same endpoint.
                                        */
                                        if (endpointNodeFound.id !== endpointNode.id) {
                                            /*
                                            We can not reference fields from different endpoints.
                                            */
                                            TS.projects.foundations.utilities.errorHandlingFunctions.throwHandledException(
                                                processIndex,
                                                MODULE_NAME,
                                                'API Data Fetcher Bot',
                                                { errorDetails: "getApiEndpointAndSchema -> More Than Two API Endpoints Detected. " },
                                                'More Than Two Endpoints Detected',
                                                apiResponseField
                                            )
                                        }
                                    }
                                }
                            }

                            if (endpointNode === undefined) {
                                /*
                                API Endpoint could not be found. Check that the at least one Record Property
                                has an API Response Field Reference child, and that this one is referencing an 
                                API Response Field.
                                */
                                TS.projects.foundations.utilities.errorHandlingFunctions.throwHandledException(
                                    processIndex,
                                    MODULE_NAME,
                                    'API Data Fetcher Bot',
                                    undefined,
                                    'API Endpoint Not Found',
                                    productDefinition.record
                                )
                            }
                        }

                        function calculateRecordPropertiesNodePathMap() {
                            /*
                            Each record property references an API Response Field, which can be deep into the
                            data structure received from the API call. What we need to do, is to find for each
                            record property the nodePath that will help us later retrieve the value of that
                            particular property.
                            
                            To do so, we will have to recursively climb the API Map until reaching the API Response
                            Schema node, which is the one from where we will get the root object of the response data
                            structure.
                            */
                            for (let j = 0; j < productDefinition.record.properties.length; j++) {
                                let recordProperty = productDefinition.record.properties[j]
                                if (recordProperty.apiResponseFieldReference !== undefined) {
                                    if (recordProperty.apiResponseFieldReference.referenceParent !== undefined) {
                                        let apiResponseField = recordProperty.apiResponseFieldReference.referenceParent
                                        let nodePath = getPath(apiResponseField)
                                        nodePath = nodePath.replace('..','.')
                                        recordPropertiesNodePathMap.set(recordProperty.config.codeName, nodePath)

                                        function getPath(node, path) {

                                            if (node.parentNode === undefined || node.parentNode.type !== "API Response Field" || node.parentNode.config.fieldType === 'array') {
                                                if (path === undefined) {
                                                    path = 'recordReceived' + '.' + node.config.codeName
                                                } else {
                                                    path = 'recordReceived' + '.' + node.config.codeName + '.' + path
                                                }
                                                return path
                                            } else {
                                                if (path === undefined) {
                                                    path = node.config.codeName
                                                } else {
                                                    path = node.config.codeName + '.' + path
                                                }
                                                return getPath(node.parentNode, path)
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        function getEndpointQueryParameters() {
                            /*
                            Parameters to the query of the API are all optional. Here we will see if
                            we need to place the API call with Parameters...

                            The Parameters defined at the API Map will be the default values that 
                            can be overwritten by the ones at the Data Mine.

                            We will create parametersMap to handle this.
                            */
                            let parametersMap = new Map()
                            if (endpointNode.apiQueryParameters !== undefined) {
                                for (let i = 0; i < endpointNode.apiQueryParameters.apiQueryParameters.length; i++) {
                                    let apiQueryParameter = endpointNode.apiQueryParameters.apiQueryParameters[i]
                                    addParameterToMap(apiQueryParameter)
                                }
                            }
                            /*
                            The parameters defined at the Data Mine will overwrite whatever is at the API Map
                            */
                            if (productDefinition.apiQueryParameters !== undefined) {
                                for (let j = 0; j < productDefinition.apiQueryParameters.apiQueryParameters.length; j++) {
                                    let apiQueryParameter = productDefinition.apiQueryParameters.apiQueryParameters[j]
                                    addParameterToMap(apiQueryParameter)
                                }
                            }

                            let separator = ""
                            queryString = '?'
                            parametersMap.forEach(addParameterToQueryString)

                            function addParameterToQueryString(value, key, map) {
                                queryString = queryString + separator + key + '=' + value
                                separator = "&"
                            }

                            function addParameterToMap(apiQueryParameter) {
                                /*
                                There is a special parameter which has a flag to indicate is a Page Number.
                                This will be treated differently since we will need to iterate to get each possible page.
                                The page number will no be added here to the query string.
                                */
                                if (apiQueryParameter.config.isPageNumber === true || apiQueryParameter.config.isPageToken) {
                                    pageNumberParameter = apiQueryParameter
                                } else {
                                    if (apiQueryParameter.config.codeName !== undefined && apiQueryParameter.config.value !== undefined) {
                                        parametersMap.set(apiQueryParameter.config.codeName, apiQueryParameter.config.value)
                                    }
                                    /*
                                    If there is a replace action to be made, then that could replace the default value.
                                    */
                                    let replaceValue = checkReplaceBy(apiQueryParameter)
                                    if (replaceValue !== undefined) {
                                        parametersMap.set(apiQueryParameter.config.codeName, replaceValue)
                                    }
                                }
                            }
                        }

                        function getEndpointPathParameters() {
                            /*
                            Parameters to the path of the API are all optional. Here we will see if
                            we need to place the API call with Parameters...
                            The Parameters defined at the API Map will be the default values that 
                            can be overwritten by the ones at the Data Mine.

                            We will create parametersMap to handle this.
                            */
                            let parametersMap = new Map()
                            if (endpointNode.apiPathParameters !== undefined) {
                                for (let i = 0; i < endpointNode.apiPathParameters.apiPathParameters.length; i++) {
                                    let apiPathParameter = endpointNode.apiPathParameters.apiPathParameters[i]
                                    addParameterToMap(apiPathParameter)
                                }
                            }
                            /*
                            The parameters defined at the Data Mine will overwrite whatever is at the API Map
                            */
                            if (productDefinition.apiPathParameters !== undefined) {
                                for (let j = 0; j < productDefinition.apiPathParameters.apiPathParameters.length; j++) {
                                    let apiPathParameter = productDefinition.apiPathParameters.apiPathParameters[j]
                                    addParameterToMap(apiPathParameter)
                                }
                            }

                            function addParameterToMap(apiPathParameter) {
                                if (apiPathParameter.config.codeName !== undefined) {
                                    parametersMap.set(apiPathParameter.config.codeName, apiPathParameter)
                                }
                            }

                            let separator = ""

                            parametersMap.forEach(addParameterToPath)

                            function addParameterToPath(value, key, map) {
                                if (pathString === "") { pathString = '/' }
                                let apiPathParameter = value
                                let parameterValue = key // This is the default value
                                let replaceValue = checkReplaceBy(apiPathParameter)

                                if (replaceValue !== undefined) {
                                    parameterValue = replaceValue
                                }

                                pathString = pathString + separator + parameterValue
                                separator = "/"
                            }
                        }

                        function checkReplaceBy(apiParameter) {
                            let parameterValue
                            let rawValue
                            if (apiParameter.config.replaceBy !== undefined) {
                                switch (apiParameter.config.replaceBy) {
                                    case '@BaseAsset': {
                                        parameterValue = TS.projects.foundations.globals.taskConstants.TASK_NODE.parentNode.parentNode.parentNode.referenceParent.baseAsset.referenceParent.config.codeName
                                        break
                                    }
                                    case '@BaseAssetNameUppercase': {
                                        rawValue = TS.projects.foundations.globals.taskConstants.TASK_NODE.parentNode.parentNode.parentNode.referenceParent.baseAsset.referenceParent.name
                                        parameterValue = rawValue.toUpperCase()
                                        break
                                    }
                                    case '@BaseAssetNameLowercase': {
                                        rawValue = TS.projects.foundations.globals.taskConstants.TASK_NODE.parentNode.parentNode.parentNode.referenceParent.baseAsset.referenceParent.name
                                        parameterValue = rawValue.toLowerCase()
                                        break
                                    }
                                    case '@QuotedAsset': {
                                        parameterValue = TS.projects.foundations.globals.taskConstants.TASK_NODE.parentNode.parentNode.parentNode.referenceParent.quotedAsset.referenceParent.config.codeName
                                        break
                                    }
                                    case '@QuotedAssetNameUppercase': {
                                        rawValue = TS.projects.foundations.globals.taskConstants.TASK_NODE.parentNode.parentNode.parentNode.referenceParent.quotedAsset.referenceParent.name
                                        parameterValue = rawValue.toUpperCase()
                                        break
                                    }
                                    case '@QuotedAssetNameLowercase': {
                                        rawValue = TS.projects.foundations.globals.taskConstants.TASK_NODE.parentNode.parentNode.parentNode.referenceParent.quotedAsset.referenceParent.name
                                        parameterValue = rawValue.toLowerCase()
                                        break
                                    }
                                    case '@Exchange': {
                                        parameterValue = TS.projects.foundations.globals.taskConstants.TASK_NODE.parentNode.parentNode.parentNode.referenceParent.parentNode.parentNode.config.codeName
                                        break
                                    }
                                    case '@ExchangeNameUppercase': {
                                        rawValue = TS.projects.foundations.globals.taskConstants.TASK_NODE.parentNode.parentNode.parentNode.referenceParent.parentNode.parentNode.name
                                        parameterValue = rawValue.toUpperCase()
                                        break
                                    }
                                    case '@ExchangeNameLowercase': {
                                        rawValue = TS.projects.foundations.globals.taskConstants.TASK_NODE.parentNode.parentNode.parentNode.referenceParent.parentNode.parentNode.name
                                        parameterValue = rawValue.toLowerCase()
                                        break
                                    }
                                    case '@BeginCurrentMinute': {
                                        parameterValue = Math.trunc((new Date()).valueOf() / SA.projects.foundations.globals.timeConstants.ONE_MIN_IN_MILISECONDS) * SA.projects.foundations.globals.timeConstants.ONE_MIN_IN_MILISECONDS
                                        break
                                    }
                                    case '@LastQueryRunISO1601': {
                                        if (lastQueryRun !== undefined) {
                                            parameterValue = new Date(new Date(thisReport.file.lastQueryRun).valueOf()).toISOString()
                                            lastQueryRun = parameterValue
                                        } else {
                                            parameterValue = new Date(((new Date()).valueOf()) - SA.projects.foundations.globals.timeConstants.ONE_MIN_IN_MILISECONDS).toISOString()
                                            lastQueryRun = parameterValue
                                        }
                                        break
                                    }
                                    case '@EndCurrentMinute': {
                                        parameterValue = Math.trunc((new Date()).valueOf() / SA.projects.foundations.globals.timeConstants.ONE_MIN_IN_MILISECONDS) * SA.projects.foundations.globals.timeConstants.ONE_MIN_IN_MILISECONDS + SA.projects.foundations.globals.timeConstants.ONE_MIN_IN_MILISECONDS - 1
                                        break
                                    }
                                }
                            }
                            return parameterValue
                        }

                        async function fetchAllPages() {

                            lastQueryRun = new Date((new Date()).valueOf()).toISOString()

                            if (pageNumberParameter === undefined) {
                                /* 
                                There is no paging mechanism at this Endpoint, so we will just make an
                                Async call to the API Server 
                                */
                                await sleep(apiMap.config.millisecondsBetweenCalls)
                                let fetchResult = await fetchAPIData()

                                if (fetchResult === 'NO_CONNECTION') {
                                    /*
                                    When there is not Internet Connection or the server can not be reached
                                    we will return requesting a retry later.
                                    */
                                    TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                                        "[WARN] start -> fetchAllPages -> Server not found or no Internet Connection. Requesting a Retry. ")
                                    callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_RETRY_RESPONSE)
                                    return 'RETRYING'
                                } else {
                                    dataReceivedObject = apiData
                                }

                            } else {
                                /*
                                There is a paging mechanism at this Endpoint, so we will iterate through all
                                the available pages. If this process was ran before, we will have at the Status
                                Report the latest page fetched. We will fetch that one again, since it might have 
                                been not full the last time we fetched it. We will assume there will be a huge amount
                                of pages available to fetch, and we will also assume that once we get an empty array
                                that will mean that we have requested already the last page with data.
                                */

                                if (pageNumberParameter.config.isPageNumber === true) {
                                    let initialPage = 1
                                    let finalPage = 1 // Number.MAX_SAFE_INTEGER
                                    if (thisReport.file.lastPage !== undefined) {
                                        initialPage = thisReport.file.lastPage[endpointNode.config.codeName]
                                    }

                                    for (let page = initialPage; page <= finalPage; page++) {
                                        if (queryString === "") {
                                            pageQueryString = "?" + pageNumberParameter.config.codeName + "=" + page
                                        } else {
                                            pageQueryString = "&" + pageNumberParameter.config.codeName + "=" + page
                                        }

                                        lastPage[endpointNode.config.codeName] = page

                                        await sleep(apiMap.config.millisecondsBetweenCalls)
                                        let fetchResult = await fetchAPIData()

                                        switch (fetchResult) {
                                            case 'NO_CONNECTION': {
                                                /*
                                                When there is not Internet Connection or the server can not be reached
                                                we will return requesting a retry later.
                                                */
                                                TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                                                    "[WARN] start -> fetchAllPages -> Server not found or no Internet Connection. Requesting a Retry. ")
                                                callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_RETRY_RESPONSE)
                                                return 'RETRYING'
                                            }
                                            case 'UNEXPECTED_API_RESPONSE': {
                                                /*
                                                Any unexpected response will abort this loop and allow the process to continue,
                                                possibly saving accumulated data.
                                                */
                                                page = finalPage
                                                break
                                            }
                                            case 'ERROR_CODE_RECEIVED': {
                                                /*
                                                An error code at the response will abort this loop and allow the process to continue,
                                                possibly saving accumulated data.
                                                */
                                                page = finalPage
                                                break
                                            }
                                            case 'NO_MORE_PAGES': {
                                                /*
                                                We will just abort this loop and continue.
                                                */
                                                page = finalPage
                                                break
                                            }
                                            case 'PAGE_FETCHED': {
                                                /*
                                                Just stay at the current loop and try to fetch more pages.
                                                This is how we accumulate the data from multiple pages into a single array.
                                                */
                                                dataReceivedArray = dataReceivedArray.concat(apiData)
                                                break
                                            }
                                        }
                                    }
                                } else if (pageNumberParameter.config.isPageToken === true) {

                                    pageToken = undefined

                                    do {

                                        if (pageToken !== undefined) {
                                            if (queryString === "") {
                                                pageQueryString = "?" + pageNumberParameter.config.codeName + "=" + pageToken
                                            } else {
                                                pageQueryString = "&" + pageNumberParameter.config.codeName + "=" + pageToken
                                            }
                                        }

                                        await sleep(apiMap.config.millisecondsBetweenCalls)
                                        let fetchResult = await fetchAPIData()

                                        switch (fetchResult) {
                                            case 'NO_CONNECTION': {
                                                /*
                                                When there is not Internet Connection or the server can not be reached
                                                we will return requesting a retry later.
                                                */
                                                TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                                                    "[WARN] start -> fetchAllPages -> Server not found or no Internet Connection. Requesting a Retry. ")
                                                callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_RETRY_RESPONSE)
                                                return 'RETRYING'
                                            }
                                            case 'UNEXPECTED_API_RESPONSE': {
                                                /*
                                                Any unexpected response will abort this loop and allow the process to continue,
                                                possibly saving accumulated data.
                                                */
                                                pageToken = false
                                                break
                                            }
                                            case 'ERROR_CODE_RECEIVED': {
                                                /*
                                                An error code at the response will abort this loop and allow the process to continue,
                                                possibly saving accumulated data.
                                                */
                                                pageToken = false
                                                break
                                            }
                                            case 'NO_MORE_PAGES': {
                                                /*
                                                A page token is slightly to a page, for a page you continue until you find a blank page.
                                                For a page token you continue until you don't get a token, but still need to concat the last data.
                                                */
                                                dataReceivedArray = dataReceivedArray.concat(apiData)
                                                pageToken = false
                                                break
                                            }
                                            case 'PAGE_FETCHED': {
                                                /*
                                                Just stay at the current loop and try to fetch more pages.
                                                This is how we accumulate the data from multiple pages into a single array.
                                                */
                                                dataReceivedArray = dataReceivedArray.concat(apiData)
                                                break
                                            }
                                        }
                                    } while(pageToken !== false)
                                }
                            }

                            function sleep(ms) {
                                return new Promise((resolve) => {
                                    setTimeout(resolve, ms)
                                })
                            }
                        }

                        async function fetchAPIData() {
                            let promise = new Promise((resolve, reject) => {
                                /* 
                                Now that we have the endpointNode, the parameters and all the information 
                                needed to place the call to the API.
                                */
                                const fetch = SA.nodeModules.nodeFetch
                                let url = protocol + '://' +
                                    hostName +
                                    portNumber +
                                    path +
                                    '/' + endpointNode.parentNode.config.codeName +
                                    '/' + endpointNode.config.codeName +
                                    pathString +
                                    queryString +
                                    pageQueryString

                                /*
                                This is how we call the API.
                                */
                                TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                                    "[INFO] start -> startProcess -> fetchAPIData -> url = " + url)

                                /*
                                Look to see if there is a key reference and if so include the keys in the fetch headers
                                 */
                                let options = getOptions(hostName)
                                let dataA = []
                                // We check if we are expecting a ndjson and if so fetch with hyperquest. (controlled at the Dataset Definition)
                                // else we use the normal fetch method.
                                if (dataset.config.ndjson === true) {
                                    let dataResponse = getDataResponse()

                                    // Here we fetch our data and then process it into a regular json object.
                                    function getDataResponse() {
                                        hyperquest(url, options)
                                        .pipe(ndjson.parse())
                                        .on("data", (obj) => {
                                            if (obj !== undefined) {
                                                dataA.push(obj)
                                            }
                                            //SA.logger.info(obj)      // Uncomment to log response to console

                                        })
                                        // When we hit the end of the data received we proceed to saving.
                                        .on("end", () => {
                                            dataReceivedObject = dataA
                                            saveDataReceived()
                                        })
                                    }
                                } else {
                                    fetch(url, options)
                                    .then((response) => {

                                        let apiResponseSchemaNode
                                        let errorCodeReceived

                                        /*
                                        At this point we have received the first http response from the API server,
                                        and from it we can extract the status code, which is the html code of the 
                                        response of our request.
                                        
                                        With that code we can get the API Response Schema, which will tell us how 
                                        to extract data from the response.
                                        */
                                        getApiResponseSchema(response.status)

                                        if (apiResponseSchemaNode === undefined) {
                                            errorCodeReceived = true
                                            TS.projects.foundations.utilities.errorHandlingFunctions.throwHandledException(
                                                processIndex,
                                                MODULE_NAME,
                                                'API Data Fetcher Bot',
                                                { resposeCodeReceived: response.status, errorDetails: 'Calling the URL ' + url + '. The response code ' + response.status + ' received is not associated with any API Query Response node.' },
                                                'Unexpected API Response Code',
                                                endpointNode
                                            )
                                        } else {
                                            getResponseBody()
                                        }

                                        function getApiResponseSchema(responseCode) {
                                            /*
                                            The API Response Schema we will depend on the response code received from the
                                            API server. Here we will locate the right Api Response Schema.
                                            */
                                            for (let j = 0; j < apiMap.apiVersions.length; j++) {
                                                let version = apiMap.apiVersions[j]
                                                for (let k = 0; k < version.apiEndpoints.length; k++) {
                                                    let endpoint = version.apiEndpoints[k]
                                                    if (endpointNode.id === endpoint.id) {
                                                        for (let i = 0; i < endpoint.apiQueryResponses.apiQueryResponses.length; i++) {
                                                            let apiQueryResponse = endpoint.apiQueryResponses.apiQueryResponses[i]

                                                            if (Number(apiQueryResponse.config.codeName) === responseCode) {
                                                                apiResponseSchemaNode = apiQueryResponse.apiResponseSchema

                                                                /*
                                                                We will check that what we received is not an error code.
                                                                */
                                                                if (apiQueryResponse.config.isError === true) {
                                                                    errorCodeReceived = true
                                                                    TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                                                                        "[WARN] start -> startProcess -> fetchAllPages -> fetchAPIData -> onResponse -> getApiResponseSchema -> API Response is an Error ->  responseCode = " + responseCode)
                                                                }
                                                                return
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }

                                        function getResponseBody() {
                                            response.text().then(body => {
                                                apiResponseReceivedText = body
                                                /*
                                                If we received an error code, we abort the processing at this point.
                                                */
                                                if (errorCodeReceived === true) {
                                                    resolve('ERROR_CODE_RECEIVED')
                                                    return
                                                }
                                                /*
                                                Here we will validate that the overall format is what we are expecting.
                                                */
                                                switch (apiResponseSchemaNode.apiResponseFields.config.fieldType) {
                                                    case 'object': {
                                                        /*
                                                        If we did not received an object, that probably means something is not 
                                                        good, and we got an HTML with the reason inside.
                                                        */
                                                        if (apiResponseReceivedText.substring(0, 1) !== "{") {
                                                            TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                                                                "[WARN] start -> startProcess -> fetchAllPages -> fetchAPIData -> onResponse -> onEnd -> Unexpected Response. Not an JSON Object. ->  apiResponseReceivedText = " + apiResponseReceivedText)
                                                            resolve('UNEXPECTED_API_RESPONSE')
                                                            return
                                                        }
                                                        break
                                                    }
                                                    case 'array': {
                                                        /*
                                                        If we did not received an array, that probably means something is not 
                                                        good, and we got an HTML with the reason inside.
                                                        */
                                                        if (apiResponseReceivedText.substring(0, 1) !== "[") {
                                                            TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                                                                "[WARN] start -> startProcess -> fetchAllPages -> fetchAPIData -> onResponse -> onEnd -> Unexpected Response. Not an Array with Data. ->  apiResponseReceivedText = " + apiResponseReceivedText)
                                                            resolve('UNEXPECTED_API_RESPONSE')
                                                            return
                                                        }
                                                        break
                                                    }
                                                }
                                                /*
                                                The actual data we need could be anywhere within the data structure received.
                                                The exact place is configured at the apiResponseSchemaNode property nodePath.
                                                We will eval the nodePath property (this assumes that the apiResponseReceivedObject is defined)
                                                */
                                                apiResponseReceivedObject = JSON.parse(apiResponseReceivedText)
                                                apiData = eval(apiResponseSchemaNode.config.nodePath)

                                                /*
                                                If we are using a Page Token, we need to search the apiData for the Page Token and set it for the next pull
                                                */

                                                pageTokenPath = undefined

                                                if(pageNumberParameter !== undefined) {
                                                    if (pageNumberParameter.config.isPageToken === true) {
                                                        getPageTokenPath(apiResponseSchemaNode.apiResponseFields)

                                                        function getPageTokenPath(node) {
                                                            if (node.config.isPageToken !== undefined) {
                                                                getPath(node)

                                                                function getPath(nodeToSearch) {
                                                                    if (nodeToSearch.config.codeName !== "") {
                                                                        if (pageTokenPath !== undefined) {
                                                                            pageTokenPath = nodeToSearch.config.codeName + "." + pageTokenPath
                                                                        } else {
                                                                            pageTokenPath = nodeToSearch.config.codeName
                                                                        }
                                                                    }

                                                                    if (nodeToSearch.parentNode !== undefined) {
                                                                        getPath(nodeToSearch.parentNode)
                                                                    } else {
                                                                        pageToken = pageTokenPath
                                                                    }
                                                                }
                                                                return
                                                            }
                                                            if (node.apiResponseFields.length > 0) {
                                                                for(let i = 0; i < node.apiResponseFields.length; i++) {
                                                                    getPageTokenPath(node.apiResponseFields[i])
                                                                }
                                                            }
                                                        }
                                                        pageToken = eval('apiData.' + pageTokenPath)
                                                    }
                                                }

                                                /*
                                                We will expect the apiData to be an Array.  Depending if it has data or not we will return
                                                NO_MORE_PAGES or PAGE_FETCHED so that pagination procedure knows when to stop.
                                                */
                                                if (apiData.length === 0 || pageToken === undefined) {
                                                    resolve('NO_MORE_PAGES')
                                                } else {
                                                    resolve('PAGE_FETCHED')
                                                }
                                            })
                                        }                                        
                                    })
                                    .catch(err => {
                                        TS.projects.foundations.globals.processVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).UNEXPECTED_ERROR = err
                                        TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                                            "[ERROR] start -> fetch -> err = " + err.stack)
                                        TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                                            "[ERROR] start -> fetch -> Connection to the API Server Failed. Maybe there is no Internet connection. Retrying later.  ")
                                        resolve('NO_CONNECTION')
                                    })
                                }
                            }
                        )
                            return promise
                        }

                        async function saveDataReceived() {
                            /*
                            We have 2 ways of saving data coming from an API. As a Single-File and
                            as One Minute Daily Files. Which one we are going to use depends on the way
                            the dataset is configured. 
                            */
                            switch (dataset.config.codeName) {
                                case 'Single-File': {
                                    await saveSingleFile()
                                    break
                                }
                                case 'One-Min': {
                                    await saveOneMinFile()
                                    break
                                }
                                case 'Save-Recursively': {
                                    await saveRecursively()
                                    break
                                }
                                default: {
                                    TS.projects.foundations.utilities.errorHandlingFunctions.throwHandledException(
                                        processIndex,
                                        MODULE_NAME,
                                        'API Data Fetcher Bot',
                                        { errorDetails: 'saveDataReceived -> Unsupported Dataset Type', datasetType: dataset.config.codeName },
                                        'Unsupported Dataset Type',
                                        dataset
                                    )
                                }
                            }

                            async function saveSingleFile() {
                                /*
                                When dealing with Single-File type of datasets, we need to append the data to the already
                                existing data, that is located in a single file. For that reason, we will first read that single file,
                                then append data to it, and finally save it to disk.
                                */
                                await readDatasetFile("")
                                appendToExistingDataset()
                                await saveDatasetFile("")

                                function appendToExistingDataset() {
                                    /* 
                                    We are going to append the current apiResponseReceivedText to the existing file.
                                    */
                                    let existingFileArray = JSON.parse(existingFileContent)
                                    /*
                                    We will create a map with all the existing record primary keys, so as to use it
                                    later to avoid appending records that already exists. The first step is to 
                                    build an array with the primary keys of the file. After that we will populate 
                                    the existingKeys map.
                                    */
                                    let primaryKeys = []
                                    let existingKeys = new Map()
                                    /*
                                    Setup the primaryKeys array.
                                    */
                                    for (let j = 0; j < productDefinition.record.properties.length; j++) {
                                        let recordProperty = productDefinition.record.properties[j]
                                        if (recordProperty.config.primaryKey === true) {
                                            primaryKeys.push(recordProperty.config.codeName)
                                        }
                                    }
                                    /*
                                    Setup the existingKeys map.
                                    */
                                    for (let i = 0; i < existingFileArray.length; i++) {
                                        let record = {
                                            values: existingFileArray[i],
                                            map: new Map()
                                        }
                                        /*
                                        Building the record map...
                                        */
                                        for (let j = 0; j < productDefinition.record.properties.length; j++) {
                                            let recordProperty = productDefinition.record.properties[j]
                                            record.map.set(recordProperty.config.codeName, record.values[j])
                                        }
                                        /*
                                        Building the current key...
                                        */
                                        let key = ""
                                        for (let j = 0; j < primaryKeys.length; j++) {
                                            let keyValue = record.map.get(primaryKeys[j])
                                            key = key + '->' + keyValue
                                        }
                                        existingKeys.set(key, record)
                                    }
                                    /*
                                    If we received an array of data then we will try to append it to the current file.
                                    */
                                    if (dataReceivedArray.length > 0) {
                                        /*
                                        Scan the dataReceivedArray array and insert records into
                                        the existingFileArray array only when they are not going to
                                        duplicate a primary key.
                                        */
                                        for (let i = 0; i < dataReceivedArray.length; i++) {
                                            let record = getRecord(dataReceivedArray[i])

                                            let key = ""
                                            for (let j = 0; j < primaryKeys.length; j++) {
                                                let keyValue = record.map.get(primaryKeys[j])
                                                key = key + '->' + keyValue
                                            }
                                            if (existingKeys.get(key) === undefined) {
                                                existingFileArray.push(record.values)
                                                existingKeys.set(key, record.values)
                                            }
                                        }
                                    }
                                    /*
                                    If we received a data object then we will try to add it to the current existing file.
                                    */
                                    if (dataReceivedObject !== undefined) {
                                        let record = getRecord(dataReceivedObject)
                                        existingFileArray.push(record.values)
                                    }

                                    existingFileContent = JSON.stringify(existingFileArray)
                                }
                            }

                            async function saveOneMinFile() {
                                /*
                                When dealing with One-Min type of datasets, we need to append the data to the already
                                existing data, distributed among Daily Files. For that reason, we will first read the 
                                dataset file of the day where the fetched data timestamp belongs to, then append data to it, 
                                and finally save it to disk.
                                */
                                let timestamp = getTimestamp()
                                let file = { date: new Date(timestamp) }
                                file.year = file.date.getUTCFullYear()
                                file.month = file.date.getUTCMonth() + 1
                                file.day = file.date.getUTCDate()
                                let dateForPath = file.year + '/' +
                                    SA.projects.foundations.utilities.miscellaneousFunctions.pad(file.month, 2) + '/' +
                                    SA.projects.foundations.utilities.miscellaneousFunctions.pad(file.day, 2)

                                /* We will need to save this at the Status Report */
                                contextVariables.lastFile = file.date
                                /*
                                Note: Possible optimation is to not read daily file but to simply append to it. 
                                Currently loads last file date, loads current file and then looks through timestamps to determine 
                                if current record should be appended to file.
                                */
                                if (thisReport.file.lastFile !== undefined) {
                                    let lastRecordDate = thisReport.file.lastFile
                                    let lastRecordDateString = JSON.stringify(lastRecordDate)
                                    let lastRecordDateYear = lastRecordDateString.substring(1, 5)
                                    let lastRecordDateMonth = lastRecordDateString.substring(6, 8)
                                    let lastRecordDateDay = lastRecordDateString.substring(9, 11)
                                    lastDate = lastRecordDateYear + "/" + lastRecordDateMonth + "/" + lastRecordDateDay
                                } else {
                                    lastDate = ""
                                }

                                if (lastDate !== dateForPath) {
                                    existingFileContent = "[]" 
                                }
                                else {
                                    await readDatasetFile("/" + dateForPath)
                                }
                                appendToExistingDataset()
                                await saveDatasetFile("/" + dateForPath)

                                function appendToExistingDataset() {
                                    /* 
                                    We are going to append the current apiResponseReceivedText to the existing file.
                                    */
                                    
                                    let existingFileArray = 
                                    JSON.parse(existingFileContent)
                                    /*
                                    If we received a data object then we will try to add it to the current existing file.
                                    */
                                    if (dataReceivedObject !== undefined) {
                                        let record = getRecord(dataReceivedObject)
                                        /*
                                        We will check that the current timestamp is not already at the existing file,
                                        and if it is not there, we will add it at the end of the file.
                                        */
                                        /* Get the Timestamp Header Index */
                                        let timestampHeaderIndex
                                        for (let i = 0; i < record.headers.length; i++) {
                                            let header = record.headers[i]
                                            if (header === 'timestamp') {
                                                timestampHeaderIndex = i
                                                break
                                            }
                                        }
                                        /* See if a record with the same timestamp is at the file.*/
                                        let timestampWasFoundInFile = false
                                        for (let i = 0; i < existingFileArray.length; i++) {
                                            let fileRecord = existingFileArray[i]
                                            let fileRecordTimestamp = fileRecord[timestampHeaderIndex]
                                            if (fileRecordTimestamp === timestamp) {
                                                timestampWasFoundInFile = true
                                                break
                                            }
                                        }
                                        if (timestampWasFoundInFile === false) {
                                            existingFileArray.push(record.values)
                                        }
                                    }

                                    let primaryKeys = []
                                    let existingKeys = new Map()
                                    /*
                                    Setup the primaryKeys array.
                                    */
                                    for (let j = 0; j < productDefinition.record.properties.length; j++) {
                                        let recordProperty = productDefinition.record.properties[j]
                                        if (recordProperty.config.primaryKey === true) {
                                            primaryKeys.push(recordProperty.config.codeName)
                                        }
                                    }
                                    /*
                                    Setup the existingKeys map.
                                    */
                                    for (let i = 0; i < existingFileArray.length; i++) {
                                        let record = {
                                            values: existingFileArray[i],
                                            map: new Map()
                                        }
                                        /*
                                        Building the record map...
                                        */
                                        for (let j = 0; j < productDefinition.record.properties.length; j++) {
                                            let recordProperty = productDefinition.record.properties[j]
                                            record.map.set(recordProperty.config.codeName, record.values[j])
                                        }
                                        /*
                                        Building the current key...
                                        */
                                        let key = ""
                                        for (let j = 0; j < primaryKeys.length; j++) {
                                            let keyValue = record.map.get(primaryKeys[j])
                                            key = key + '->' + keyValue
                                        }
                                        existingKeys.set(key, record)
                                    }
                                    /*
                                    If we received an array of data then we will try to append it to the current file.
                                    */
                                    if (dataReceivedArray !== undefined) {
                                        for (let i = 0; i < dataReceivedArray.length; i++) {
                                            let record = getRecord(dataReceivedArray[i])

                                            let key = ""
                                            for (let j = 0; j < primaryKeys.length; j++) {
                                                let keyValue = record.map.get(primaryKeys[j])
                                                key = key + '->' + keyValue
                                            }
                                            if (existingKeys.get(key) === undefined) {
                                                existingFileArray.push(record.values)
                                                existingKeys.set(key, record.values)
                                            }
                                        }
                                    }
                                    existingFileContent = JSON.stringify(existingFileArray)
                                }

                                function getTimestamp() {
                                    /*
                                    The timestamp is data that comes in the API response. Here we will extract the timestamp
                                    and return it. 
                                    */
                                    let record

                                    if (dataReceivedObject !== undefined) {
                                        record = getRecord(dataReceivedObject)
                                    }
                                    if (dataReceivedArray !== undefined) {
                                        record = getRecord(dataReceivedArray[0])
                                    }

                                    let timestamp = record.map.get('timestamp')
                                    let startStamp = timestamp
                                    let numberOfDigits = 0

                                    while (startStamp != 0 && startStamp > 1) {
                                            startStamp = startStamp / 10
                                            numberOfDigits++
                                        }
                                    
                                    if (numberOfDigits == 10) {
                                        timestamp = timestamp * 1000
                                        return timestamp
                                    }

                                    if (numberOfDigits == 19) {
                                        timestamp = timestamp / 1000000
                                        return timestamp
                                    }

                                    if (timestamp === undefined) {
                                        /*
                                        There must be a Record Property with codeName 'timestamp' defined.
                                        */
                                        TS.projects.foundations.utilities.errorHandlingFunctions.throwHandledException(
                                            processIndex,
                                            MODULE_NAME,
                                            'API Data Fetcher Bot',
                                            { errorDetails: 'saveDataReceived -> saveOneMinFile -> getTimestamp -> Timestamp Record Property Missing'},
                                            'Timestamp Record Property Missing',
                                            productDefinition.record
                                        )
                                    }

                                    return timestamp
                                }
                            }


                            /** 
                             * This function is intended for use with API responses.
                             * In its current state it can handle any API response with 0-1 arrays included in the path located at the API response field reference inside the data mine.
                             * Example:     "apiResponseReceivedObject.data[0].timestamp" 
                             *              "apiResponseReceivedObject.data.timestamp
                             */
                            async function saveRecursively() {

                                // This will hold the information we need.
                                let timestampArray = []
                                let completeRecord = new Map()

                                // These will hold the paths to the information we need.
                                let pathToTimestamp
                                let pathToData = []


                                // Main actions are here
                                getDataPaths()
                                getData()

                                // Here we handle making the first file if need be.
                                let fileP = TS.projects.foundations.globals.processVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).FILE_PATH_ROOT +
                                "/Output/" + productDefinition.config.codeName
                                let basePath = global.env.PATH_TO_DATA_STORAGE
                                // If the file does not exist we create it.
                            if (SA.nodeModules.fs.existsSync(basePath + '/' + fileP) !== true && contextVariables.beginingOfMarket === undefined) {
                                existingFileContent = []
                                saveData()
                            } else {
                                thisReport.file.lastRun = new Date()
                                // Get Timestamp ready to build path to file.
                                let thisTimestamp = timestampArray[i]
                                let length = timestampArray.length - 1
                                lastTimestamp = timestampArray[length]
                                let lastStamp = checkTimestamp(lastTimestamp)
                                let timestamp = checkTimestamp(thisTimestamp)

                                // Build file path
                                let file = { date: new Date(timestamp) }
                                    file.year = file.date.getUTCFullYear()
                                    file.month = file.date.getUTCMonth() + 1
                                    file.day = file.date.getUTCDate()
                                    let dateForPath = file.year + '/' +
                                        SA.projects.foundations.utilities.miscellaneousFunctions.pad(file.month, 2) + '/' +
                                        SA.projects.foundations.utilities.miscellaneousFunctions.pad(file.day, 2)

                                try {
                                    let fileName = 'Data.json'
                                    let filePath =
                                        TS.projects.foundations.globals.processVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).FILE_PATH_ROOT +
                                        "/Output/" + productDefinition.config.codeName + "/" + outputDataset.referenceParent.config.codeName + '/' + dateForPath

                                    // Here we get the existing file content.
                                    let basePath = global.env.PATH_TO_DATA_STORAGE
                                    let fileBuffer = SA.nodeModules.fs.readFileSync(basePath + '/' + filePath + '/' + fileName)
                                    let existingFileContentString = fileBuffer.toString()
                                    let existingFileContent = existingFileContentString.replaceAll(/\n/g, '')
                                    let existingFile = JSON.parse(existingFileContent)
                                    saveData(existingFile)
                                } catch (err) {
                                    if (err) {
                                        SA.logger.error('[ERROR]' + err.message + err.stack)
                                    } else {
                                        SA.logger.error('[Success] Files Updated')
                                    }
                                }
                            }


                                /** This function gets the paths to the data we want as defined at the API Response Field Reference at the data mine. */
                                function getDataPaths() {
                                    if (productDefinition.record !== undefined) {
                                        if (productDefinition.record.properties !== undefined) {
                                            let record = productDefinition.record.properties

                                            /**Here we loop through all record definition nodes and gather the paths to the needed information. */
                                            for (let j = 0; j < record.length; j++) {
                                                let thisRecord = record[j]
                                                /** First we get the path to the timestamp. */
                                                if (thisRecord.name === 'timestamp' || thisRecord.name === 'Timestamp') {
                                                    if (thisRecord.apiResponseFieldReference !== undefined && thisRecord.apiResponseFieldReference.config !== undefined) {
                                                        let thisConfig = thisRecord.apiResponseFieldReference.config
                                                        if (thisConfig.nodePath !== undefined && thisConfig.nodePath !== '') {
                                                            pathToTimestamp = thisConfig.nodePath
                                                        } else {
                                                            SA.logger.error('The path to the timestamp is not defined.')
                                                        }
                                                    } else {
                                                        SA.logger.error('We have encountered a problem with the apiResponseFieldReference.')
                                                    }
                                                } else {
                                                    /**If the record is not a timestamp we will assume it is data. */
                                                    if (thisRecord.apiResponseFieldReference !== undefined && thisRecord.apiResponseFieldReference.config !== undefined) {
                                                        let thisConfig = thisRecord.apiResponseFieldReference.config
                                                        if (thisConfig.nodePath !== undefined && thisConfig.nodePath !== '') {
                                                            let thisPath = thisConfig.nodePath
                                                            pathToData.push(thisPath)
                                                        } else {
                                                            SA.logger.error('The path to the data record is not defined.')
                                                        }
                                                    } else {
                                                        SA.logger.error('We have encountered a problem with the apiResponseFieldReference.')
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                function getData() {
                                    if (dataReceivedObject !== undefined) {
                                        /** Here we are going to loop through the data object received and gather all the defined information. */
                                            if (dataReceivedObject.data !== undefined) {
                                                for (let i = 0; i < dataReceivedObject.data.length; i++) {
                                                    let thisTime
                                                    let dataArray = []
                                                    let timestampPath = pathToTimestamp.split('['|']')

                                                    // First we must control our path info to iterate through all data in the API response.
                                                    switch (timestampPath.length) {
                                                        case (1): {
                                                            SA.logger.info('This data does not have anything to loop through. Please use a different save option.')
                                                            break
                                                        }
                                                        // If two we will count up and loop through all possible responses.
                                                        case (2): {
                                                            let tPath = timestampPath[0] + i + timestampPath[1]
                                                            thisTime = eval(tPath)
                                                            timestampArray.push(thisTime)
                                                            break
                                                        }
                                                        case (4): {
                                                            // TODO handle iterating through multiple arrays in the same path
                                                            break
                                                        }
                                                    }
                                                    

                                                    /** Here we will loop through the rest of the data defined at the record properties. */
                                                    for (let j = 0; j < pathToData.length; j++) {
                                                        let thisDataP = pathToData[j]
                                                        let dataPath = thisDataP.split('['|']')
        
                                                        switch (dataPath.length) {
                                                            case (1): {
                                                                SA.logger.info('This data does not have anything to loop through. Please use a different save option.')
                                                                break
                                                            }
                                                            // If two we will count up and loop through all possible responses.
                                                            case (2): {
                                                                let dPath = dataPath[0] + i + dataPath[1]
                                                                let thisData = eval(dPath)
                                                                // Here we get the name to call the record.
                                                                let nameSplit = dataPath[1].split('.')
                                                                let recordName = nameSplit[1]
                                                                let thisRecord = {
                                                                    [recordName] : thisData
                                                                }
                                                                dataArray.push(thisData)
                                                                break
                                                            }
                                                            case (4): {
                                                                // TODO handle iterating through multiple arrays in the same path
                                                                break
                                                            }
                                                        }
                                                    }
                                                    completeRecord.set(thisTime, dataArray)
                                                }
                                            }
                                            if (dataReceivedObject.length !== undefined) {
                                                for (let i = 0; i < dataReceivedObject.length; i++) {

                                                    // Here we initialize what we need inside this loop.
                                                    let thisTime
                                                    let dataArray = []
                                                    let timestampPath = pathToTimestamp.split('['|']')
                                                    let tPath
        
                                                    // First we must control our path info to iterate through all timestamps in the API response.
                                                    // Here we gather all of our defined paths and get the timestamps at those locations.
                                                    switch (timestampPath.length) {
                                                        case (1): {
                                                            let thisObject = dataReceivedObject[i]
                                                            let singlePath = pathToTimestamp.split('.')
                                                            tPath = singlePath[1]
                                                            thisTime = thisObject[tPath]
                                                            
                                                            timestampArray.push(thisTime)
                                                            break
                                                        }
                                                        // If two we will count up and loop through all possible responses.
                                                        case (2): {
                                                            tPath = timestampPath[0] + i + timestampPath[1]
                                                            thisTime = eval(tPath)
                                                            timestampArray.push(thisTime)
                                                            break
                                                        } 
                                                        case (4): {
                                                            // TODO handle iterating through multiple arrays in the same path
                                                            break
                                                        }
                                                    }

                                                    // First we must control our path info to iterate through all data in the API response.
                                                    // Here we gather all of our defined paths and get the data at those locations.
                                                    for (let j = 0; j < pathToData.length; j++) {
                                                        let thisDataP = pathToData[j]
                                                        let dataPath = thisDataP.split('['|']')
                                                        let dPath
                                                        let thisData

                                                        switch (dataPath.length) {
                                                            case (1): {
                                                                let thisObject = dataReceivedObject[i]
                                                                let singlePath = thisDataP.split('.')
                                                                let levelPath = singlePath[1]
                                                                let thisData = thisObject[levelPath]
                                                                dataArray.push(thisData)
                                                                break
                                                            }
                                                            case (2): {
                                                                let dPath = dataPath[0] + i + dataPath[1]
                                                                thisData = eval(dPath)

                                                                // Here we get the name to call the record.
                                                                let nameSplit = dataPath[1].split('.')
                                                                let recordName = nameSplit[1]
                                                                let thisRecord = {
                                                                    [recordName] : thisData
                                                                }
                                                                dataArray.push(thisData)
                                                                break
                                                            }
                                                            case (4): {
                                                                // TODO handle iterating through multiple arrays in the same path
                                                                break
                                                            }
                                                        }
                                                    }
                                                    completeRecord.set(thisTime, dataArray)
                                                }
                                            }
                                    } else {
                                        SA.logger.error('dataReceivedObject is not defined. We have no data to save.')
                                    }
                                }

                                

                                //Now what we have all the needed info, here we loop through and build the files / save the data.
                                function saveData(existingFile) {
                                    
                                    let thisFile
                                    
                                    // Here we will check to see if all timestamps received belong to the same file date or not.
                                    for (let t = 0; t < timestampArray.length; t++) {
                                        let timeToCheck = timestampArray[t]
                                        let thisTime = checkTimestamp(timeToCheck)

                                        let file = { date: new Date(thisTime) }
                                        file.year = file.date.getUTCFullYear()
                                        file.month = file.date.getUTCMonth() + 1
                                        file.day = file.date.getUTCDate()
                                        let dateForPath = file.year + '/' +
                                            SA.projects.foundations.utilities.miscellaneousFunctions.pad(file.month, 2) + '/' +
                                            SA.projects.foundations.utilities.miscellaneousFunctions.pad(file.day, 2)

                                            if (fileDateArray.length > 0) {
                                                let lastDateArrayEntryNum = fileDateArray.length - 1
                                                let lastDateArrayEntry = fileDateArray[lastDateArrayEntryNum]
                                                if (lastDateArrayEntry !== dateForPath) {
                                                    fileDateArray.push(dateForPath)
                                                }
                                            } else {
                                                fileDateArray.push(dateForPath)
                                            }
                                            
                                    }
                                    
                                        /*
                                        Note: Possible optimation is to not read daily file but to simply append to it. 
                                        Currently loads last file date, loads current file and then looks through timestamps to determine 
                                        if current record should be appended to file.
                                        */
                                        if (thisReport.file.lastFile !== undefined) {
                                            let lastRecordDate = thisReport.file.lastFile
                                            let lastRecordDateString = JSON.stringify(lastRecordDate)
                                            let lastRecordDateYear = lastRecordDateString.substring(1, 5)
                                            let lastRecordDateMonth = lastRecordDateString.substring(6, 8)
                                            let lastRecordDateDay = lastRecordDateString.substring(9, 11)
                                            lastDate = lastRecordDateYear + "/" + lastRecordDateMonth + "/" + lastRecordDateDay
                                        } else {
                                            lastDate = ""
                                        }


                                        if (existingFile !== undefined) {

                                            // We will loop through each line of the record and see about adding it to the file for saving!
                                            for (let c = 0; c < completeRecord.size; c++) {
                                                let thisFile = []
                                                let content = Array.from(completeRecord)
                                                let thisContent = content[c]
                                                // In order to not save duplicates we will check the last timestamp on file and not save any timestamps less than or equal to it.
                                                let existingFileLength = existingFile.length - 1
                                                let lastFileEntry = existingFile[existingFileLength]
                                                let lastTimeOnFile = lastFileEntry[0]

                                                let fileT = thisContent[0]
                                                let time = checkTimestamp(fileT)
                                                dateForPath = checkSameFileDate(time)
                                                let fileC = thisContent[1]

                                                // If timestamp is older the the last timestamp on file we save nothing and proceed through the data.
                                                if (lastTimeOnFile < time) {
                                                    fileC.unshift(time)
                                                    existingFile.push(fileC)
                                                }
                                            }

                                            existingFileContent = JSON.stringify(existingFile)

                                            saveDatasetFile("/" + dateForPath)
                                            writeStatusReport()
                                            SA.logger.info('[Success] API Response Saved.')
                                            return

                                        } else {
                                            // If the existingFile is not defined then this is the first time running.
                                            for (let c = 0; c < completeRecord.size; c++) {
                                                let runCount = c 
                                                let content = Array.from(completeRecord)
                                                let thisContent = content[c]

                                                // This is the timestamp we use to build the path.
                                                let fileT = thisContent[0]
                                                let time = checkTimestamp(fileT)

                                                if (runCount === 0) {
                                                    thisFile = []
                                                    // Here we handle the beginning of the market for our status report.
                                                    if (contextVariables.beginingOfMarket === undefined) {
                                                        contextVariables.beginingOfMarket = new Date(time)
                                                    }
                                                } 

                                                dateForPath = checkSameFileDate(time)
                                            
                                                let fileC = thisContent[1]
                                                fileC.unshift(time)
                                                thisFile.push(fileC)

                                            existingFileContent = JSON.stringify(thisFile)

                                            // If the path to the file does not exist we get ready to make it.
                                            let fileName = 'Data.json'
                                            let filePath =
                                                TS.projects.foundations.globals.processVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).FILE_PATH_ROOT +
                                                "/Output/" + productDefinition.config.codeName + "/" + outputDataset.referenceParent.config.codeName + '/' + dateForPath
                                    
                                            let basePath = global.env.PATH_TO_DATA_STORAGE
                                            if (SA.nodeModules.fs.existsSync(basePath + '/' + filePath + '/' + fileName) !== true) {
                                                thisReport.file.lastRun = new Date()
                                        }

                                        saveDatasetFile("/" + dateForPath)

                                        if ((content.length - 1) === c) {
                                            writeStatusReport()
                                            SA.logger.info('[Success] API Response Saved.')
                                            return
                                        }
                                    }
                                }
                            } 


                                // Here we verify the timestamp is the correct length and if it is not correct it.
                                function checkTimestamp(thisTimestamp) {
                                    let timestamp = thisTimestamp
                                    let startStamp = timestamp
                                    let numberOfDigits = 0

                                    while (startStamp != 0 && startStamp > 1) {
                                            startStamp = startStamp / 10
                                            numberOfDigits++
                                        }
                                    
                                    if (numberOfDigits == 10) {
                                        timestamp = timestamp * 1000
                                        return timestamp
                                    }

                                    if (numberOfDigits == 19) {
                                        timestamp = timestamp / 1000000
                                        return Math.trunc(timestamp)
                                    }

                                    if (numberOfDigits == 13) {
                                        return timestamp
                                    }
                                }

                                function checkSameFileDate(time) {
                                    for (let e = 0; e < fileDateArray.length; e++) {
                                        let thisFileDate = fileDateArray[e]

                                        let file = { date: new Date(time) }
                                        file.year = file.date.getUTCFullYear()
                                        file.month = file.date.getUTCMonth() + 1
                                        file.day = file.date.getUTCDate()
                                        let dateForPath = file.year + '/' +
                                            SA.projects.foundations.utilities.miscellaneousFunctions.pad(file.month, 2) + '/' +
                                            SA.projects.foundations.utilities.miscellaneousFunctions.pad(file.day, 2)

                                        if (dateForPath === thisFileDate) {
                                            /* We will need to save this at the Status Report */
                                            contextVariables.lastFile = file.date
                                            return dateForPath
                                        }
                                    }
                                }
                            }


                            async function readDatasetFile(extraFilePath) {
                                /*
                                If this process already ran before, then we are going to load the data stored so as to append
                                information to it later.
                                */
                                if (thisReport.file.lastRun !== undefined) {

                                    let fileName = 'Data.json'
                                    let filePath =
                                        TS.projects.foundations.globals.processVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).FILE_PATH_ROOT +
                                        "/Output/" + productDefinition.config.codeName + "/" + outputDataset.referenceParent.config.codeName + extraFilePath
                                    let response = await fileStorage.asyncGetTextFile(filePath + '/' + fileName)
                                    let text = response.text

                                    if (response.err !== undefined && response.err.result !== TS.projects.foundations.globals.standardResponses.DEFAULT_OK_RESPONSE.result) {
                                        TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                                            "[ERROR] start -> startProcess -> readDatasetFile -> Could read file. ->  filePath = " + filePath + "/" + fileName)
                                        throw (response.err)
                                    } else {
                                        existingFileContent = text
                                    }

                                } else {
                                    /*
                                    If there is no status report, we assume there is no previous file or that if there is we will override it.
                                    */
                                    existingFileContent = "[]"
                                }
                            }

                            async function saveDatasetFile(extraFilePath) {

                                let fileName = 'Data.json'
                                let filePath = TS.projects.foundations.globals.processVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).FILE_PATH_ROOT +
                                    "/Output/" + productDefinition.config.codeName + "/" + outputDataset.referenceParent.config.codeName + extraFilePath
                                let response = await fileStorage.asyncCreateTextFile(filePath + '/' + fileName, existingFileContent + '\n', false, true)

                                if (response.err !== undefined && response.err.result !== TS.projects.foundations.globals.standardResponses.DEFAULT_OK_RESPONSE.result) {
                                    TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                                        "[ERROR] start -> startProcess -> saveDatasetFile -> Could not save file. ->  filePath = " + filePath + "/" + fileName)
                                    throw (response.err)
                                }
                            }

                            function getRecord(recordReceived) {
                                /*
                                The record to be stored is not directly the record received. The record
                                structure depends on the list of record properties and the data fields each one is referencing.
                                */
                                let record = {
                                    values: [],
                                    headers: [],
                                    map: new Map()
                                }
                                for (let j = 0; j < productDefinition.record.properties.length; j++) {
                                    let recordProperty = productDefinition.record.properties[j]
                                    if (recordProperty.apiResponseFieldReference !== undefined) {
                                        if (recordProperty.apiResponseFieldReference.referenceParent !== undefined) {
                                            let apiResponseField = recordProperty.apiResponseFieldReference.referenceParent
                                            /*
                                            We will need to get the nodePath for this property, representing the path
                                            to the value on the received data. There are 2 ways to get this nodePath.
    
                                            1) It is explicitly declared at the node. If this exists then we will use it.
                                            2) It was calculated automatically.
                                            */

                                            let nodePath
                                            if (recordProperty.apiResponseFieldReference.config.nodePath !== "") {
                                                nodePath = recordProperty.apiResponseFieldReference.config.nodePath
                                            }

                                            if (nodePath === undefined) {
                                                nodePath = recordPropertiesNodePathMap.get(recordProperty.config.codeName)
                                            }

                                            let value = eval(nodePath)

                                            if (recordProperty.config.isDate === true) {
                                                value = (new Date(value)).valueOf()
                                            }

                                            /*
                                                Check that timestamps are saved in 13 digits.
                                                If not convert the timestamp's value to 13 digits.
                                            */    

                                                if (recordProperty.config.codeName === 'timestamp') {      

                                                let startStamp = (recordProperty.config.codeName, value)
                                                let numberOfDigits = 0
                                                let timestamp = (recordProperty.config.codeName, value)

                                                while (startStamp != 0 && startStamp > 1) {
                                                    startStamp = startStamp / 10
                                                    numberOfDigits++
                                                }

                                                if (numberOfDigits == 10) {
                                                    timestamp = timestamp * 1000
                                                    value = timestamp
                                                }
            
                                                if (numberOfDigits == 19) {
                                                    timestamp = timestamp / 1000000
                                                    value = timestamp
                                                }
                                            }

                                            /*
                                            Check that we do not accept values that will break the JSON format of the file.
                                            */
                                            if (recordProperty.config.isString !== true && recordProperty.config.isBoolean !== true && recordProperty.config.isArray !== true) {
                                                /*
                                                At this point Dates have been converted to numbers, so if the Record Property is not a string
                                                then it must be a number.
                                                */
                                                if (isNaN(value)) { value = 0 }
                                            }

                                            if (value === null || value === undefined) { value = 0 }
                                            record.values.push(value)
                                            record.headers.push(recordProperty.config.codeName)
                                            record.map.set(recordProperty.config.codeName, value)
                                        }
                                    }
                                }
                                return record
                            }
                        }
                    }

                    /*
                    When all Output Datasets have been successfully written, we can go and write
                    the Status Report.
                    */
                    writeStatusReport()

                } catch (err) {
                    TS.projects.foundations.globals.processVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).UNEXPECTED_ERROR = err
                    TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                        "[ERROR] start -> startProcess -> err = " + err.stack)
                    callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_FAIL_RESPONSE)
                }
            }

            function writeStatusReport() {
                try {
                    thisReport.file = {
                        lastRun: (new Date()).toISOString(),
                        lastQueryRun: lastQueryRun,
                        lastPage: lastPage,
                        beginingOfMarket: contextVariables.beginingOfMarket
                    }

                    /*
                    For Single-File Datasets there is no lastFile defined. 
                    */
                    if (contextVariables.lastFile !== undefined) {
                        thisReport.file.lastFile = contextVariables.lastFile.toISOString()
                    }

                    if (thisReport.file.beginingOfMarket === undefined) {
                        thisReport.file.beginingOfMarket = (new Date()).toISOString()
                    }

                    thisReport.save(onSaved)

                    function onSaved(err) {
                        if (err.result !== TS.projects.foundations.globals.standardResponses.DEFAULT_OK_RESPONSE.result) {
                            TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                                "[ERROR] start -> writeStatusReport -> onSaved -> err = " + err.stack)
                            callBackFunction(err)
                            return;
                        }
                        callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_OK_RESPONSE)
                    }
                } catch (err) {
                    TS.projects.foundations.globals.processVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).UNEXPECTED_ERROR = err
                    TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                        "[ERROR] start -> writeStatusReport -> err = " + err.stack)
                    callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_FAIL_RESPONSE)
                }
            }


            /*
            This function handles all of our custom API Access token or key needs.
            */
            function getOptions(hostName) {
                let apiAuthKey

                if (TS.projects.foundations.globals.taskConstants.TASK_NODE.keyReference !== undefined) {
                    apiAuthKey = TS.projects.foundations.globals.taskConstants.TASK_NODE.keyReference.referenceParent
                }
                /*
                Look to see if there is a key reference and if so include the keys in the fetch headers
                 */
                let options = {}
                // Depending on what API it is we need to use different methods of passing out token.
                switch (hostName) {
                    case ("hist.databento.com") : {
                        if (apiAuthKey !== undefined) {
                            let authKeyConfig = apiAuthKey.config
        
                            if (authKeyConfig !== undefined) {
                                if (authKeyConfig.key !== undefined) {
                                    let token =  authKeyConfig.key
                                    let method = "GET";
                                    options['method'] = method
                                    options['headers'] = {
                                        "Content-type": "application/json",
                                        Authorization: 'Basic ' + btoa(token + ':'),
                                    }
                                }
                            }
                        }
                        return options
                    }
                    default : {
                        /*
                        Look to see if there is a key reference and if so include the keys in the fetch headers
                         */
                        if (apiAuthKey !== undefined) {
                            let authKeyConfig = apiAuthKey.config

                            if (authKeyConfig !== undefined) {
                                if (authKeyConfig.bearer_token !== undefined) {
                                    let token =  authKeyConfig.bearer_token
                                    let method = "GET";
                                    options['method'] = method
                                    options['headers'] = {
                                        "Content-type": "application/json",
                                        Authorization: "Bearer " + token,
                                    }
                                }
                            }
                        }
                        return options
                    }
                }
            }

        } catch (err) {
            TS.projects.foundations.globals.processVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).UNEXPECTED_ERROR = err
            TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                "[ERROR] start -> err = " + err.stack)
            callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_FAIL_RESPONSE)
        }
    }
}
