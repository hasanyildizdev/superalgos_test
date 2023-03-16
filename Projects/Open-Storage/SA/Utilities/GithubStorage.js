exports.newOpenStorageUtilitiesGithubStorage = function () {

    let thisObject = {
        saveFile: saveFile,
        loadFile: loadFile
    }

    return thisObject

    async function saveFile(fileName, filePath, fileContent, storageContainer) {

        let promise = new Promise(saveAtGithub)

        async function saveAtGithub(resolve, reject) {

            const secret = SA.secrets.apisSecrets.map.get(storageContainer.config.codeName)
            if (secret === undefined) {
                SA.logger.warn('You need at the Apis Secrets File a record for the codeName = ' + storageContainer.config.codeName)
                reject()
                return
            }
            const token = secret.apiToken
            const { Octokit } = SA.nodeModules.octokit
            const octokit = new Octokit({
                auth: token,
                userAgent: 'Superalgos ' + SA.version
            })
            const repo = storageContainer.config.repositoryName
            const owner = storageContainer.config.githubUserName
            const branch = 'main'
            const message = 'Open Storage: New File.'
            const completePath = filePath + '/' + fileName + '.json'
            const buff = new Buffer.from(fileContent, 'utf-8');
            const content = buff.toString('base64');


                const data = await octokit.repos.getContent({
                    owner: owner,
                    repo: repo,
                    path: completePath,
                    ref: branch
                  })
                    .catch(function (err) {
                        if (err.status === 404) {
                            createNewFile()
                        } else {
                            SA.logger.error('File could not be saved at Github.com. -> err.stack = ' + err.stack)
                            reject(err)
                        }
                    })
                if (data !== undefined) {
                    await octokit.repos.createOrUpdateFileContents({
                        owner: owner,
                        repo: repo,
                        path: completePath,
                        message: message,
                        content: content,
                        branch: branch,
                        sha: data.data.sha
                    })
                        .then(githubSaysOK)
                        .catch(githubError)
                } 


            async function createNewFile() {
                await octokit.repos.createOrUpdateFileContents({
                    owner: owner,
                    repo: repo,
                    path: completePath,
                    message: message,
                    content: content,
                    branch: branch
                })
                    .then(githubSaysOK)
                    .catch(githubError)
            }

            function githubSaysOK() {
                /*
                We will give github a few seconds to make the file accessible via http. Without these few seconds, the bots following the signal might get a 404 error.
                */
                SA.logger.info('File just created on Github. completePath = ' + completePath)
                setTimeout(resolve, 3000)
            }

            function githubError(err) {
                SA.logger.error('Github Storage -> saveFile -> err.stack = ' + err.stack + ' full error = ' + err)
                reject(err)
            }
        }

        return promise
    }

    async function loadFile(fileName, filePath, storageContainer) {

        const completePath = filePath + '/' + fileName + '.json'
        const repo = storageContainer.config.repositoryName
        const owner = storageContainer.config.githubUserName
        const branch = 'main'
        const URL = "https://raw.githubusercontent.com/" + owner + "/" + repo + "/" + branch + "/" + completePath
        /*
        This function helps a caller to use await syntax while the called
        function uses callbacks, specifically for retrieving files.
        */
        let promise = new Promise((resolve, reject) => {

            const axios = SA.nodeModules.axios
            axios
                .get(URL)
                .then(res => {
                    //SA.logger.info(`statusCode: ${res.status}`)

                    resolve(res.data)
                })
                .catch(error => {

                    SA.logger.error('Github Storage -> Load File -> Error = ' + error)
                    SA.logger.error('Github Storage -> Load File -> completePath = ' + completePath)
                    SA.logger.error('Github Storage -> Load File -> repo = ' + repo)
                    SA.logger.error('Github Storage -> Load File -> owner = ' + owner)
                    SA.logger.error('Github Storage -> Load File -> branch = ' + branch)
                    SA.logger.error('Github Storage -> Load File -> URL = ' + URL)

                    reject()
                })
        })

        return promise
    }
}