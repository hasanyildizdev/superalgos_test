function newFoundationsDocsMainSearchPage() {
    let thisObject = {
        addSearchHeader: addSearchHeader,
        detectEnterOnSearchBox: detectEnterOnSearchBox,
        setFocusOnSearchBox: setFocusOnSearchBox,
        render: render,
        initialize: initialize,
        finalize: finalize
    }

    return thisObject

    function initialize() {

    }

    function finalize() {

    }

    function render() {
        let docsHeaderMenu = document.getElementById('docs-navigation-elements-header-menu')
        docsHeaderMenu.innerHTML = UI.projects.education.spaces.docsSpace.navigationElements.getTopNavPanel()

        let HTML = ''
        HTML = HTML + '<div id="docs-search-page-div">'
        HTML = HTML + '<center><img src="Images/superalgos-logo.png" class="docs-image-logo-search" width=400></center>'
        HTML = HTML + '<center><div class="docs-font-normal docs-search-box"><input class="docs-search-input" placeholder="search the docs or run a command" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"></input></div></center>'
        HTML = HTML + '</div>'
        let docsContentDiv = document.getElementById('docs-content-div')
        docsContentDiv.innerHTML = HTML + UI.projects.education.spaces.docsSpace.footer.addFooter()

        UI.projects.education.spaces.docsSpace.mainSearchPage.detectEnterOnSearchBox()
        UI.projects.education.spaces.docsSpace.mainSearchPage.setFocusOnSearchBox()
    }

    function addSearchHeader() {
        let HTML = ''
        // Logo & Search Box
        HTML = HTML + '<div class="docs-search-results-header">'
        HTML = HTML + '<div class="docs-image-logo-search-results"><img src="Images/superalgos-logo.png" width=200></div>'
        HTML = HTML + '<div class="docs-search-results-box">'
        HTML = HTML + '<input class="docs-search-input" placeholder="search the docs or run a command" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"></input>'
        HTML = HTML + '</div>'
        HTML = HTML + '</div>'

        return HTML
    }

    function detectEnterOnSearchBox() {
        const element = document.getElementsByClassName("docs-search-input")[0]
        if (UI.projects.education.spaces.docsSpace.commandInterface.command !== undefined) {
            element.value = UI.projects.education.spaces.docsSpace.commandInterface.command
        }
        element.addEventListener("keyup", function (event) {
            if (event.key === "Enter" || event.keyCode === 13) {
                UI.projects.education.spaces.docsSpace.exitEditMode()
                UI.projects.education.spaces.docsSpace.currentBookBeingRendered = undefined
                UI.projects.education.spaces.docsSpace.currentDocumentBeingRendered = undefined
                UI.projects.education.spaces.docsSpace.contextMenu.removeContextMenuFromScreen()
                UI.projects.education.spaces.docsSpace.commandInterface.command = element.value.trim()
                UI.projects.education.spaces.docsSpace.commandInterface.detectCommands()
            }
        });
    }

    function setFocusOnSearchBox() {
        const element = document.getElementsByClassName("docs-search-input")[0]
        element.focus()
    }
}