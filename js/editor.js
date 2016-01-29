// editor
ZenPen = window.ZenPen || {};
ZenPen.editor = (function() {

    // Editor elements
    var headerField, contentField, cleanSlate, lastType, currentNodeList, savedSelection;

    // Editor Bubble elements
    var textOptions, optionsBox, boldButton, italicButton, quoteButton, urlButton, urlInput;

    var composing;

    var flowTimeout, flowLastKeyWasShortcut = flowMode = false,
        flowRefreshKeys = [
            // Numbers
            48, 49, 50, 51, 52, 53, 54, 55, 56, 57,
            // Letters
            58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90
        ],
        flowAllowKeys = [
            13, // Enter
            32 // Space
        ];

    function init() {

        composing = false;
        bindElements();

        // Set cursor position
        var range = document.createRange();
        var selection = window.getSelection();
        range.setStart(headerField, 1);
        selection.removeAllRanges();
        selection.addRange(range);

        createEventBindings();

        // Load state if storage is supported
        if (ZenPen.util.supportsHtmlStorage()) {
            loadState();
        }
    }

    function createEventBindings() {

        // Key up bindings
        if (ZenPen.util.supportsHtmlStorage()) {

            document.onkeyup = function(event) {
                checkTextHighlighting(event);
                saveState();
            }

        } else {
            document.onkeyup = checkTextHighlighting;
        }

        // Mouse bindings
        document.onmousedown = checkTextHighlighting;
        document.onmouseup = function(event) {

            setTimeout(function() {
                checkTextHighlighting(event);
            }, 1);
        };

        // Window bindings
        window.addEventListener('resize', function(event) {
            updateBubblePosition();
        });


        document.body.addEventListener('scroll', function() {

            // TODO: Debounce update bubble position to stop excessive redraws
            updateBubblePosition();
        });

        // Composition bindings. We need them to distinguish
        // IME composition from text selection
        document.addEventListener('compositionstart', onCompositionStart);
        document.addEventListener('compositionend', onCompositionEnd);
    }


    function bindElements() {

        headerField = document.querySelector('.header');
        contentField = document.querySelector('.content');
        textOptions = document.querySelector('.text-options');

        optionsBox = textOptions.querySelector('.options');

        boldButton = textOptions.querySelector('.bold');
        boldButton.onclick = onBoldClick;

        italicButton = textOptions.querySelector('.italic');
        italicButton.onclick = onItalicClick;

        quoteButton = textOptions.querySelector('.quote');
        quoteButton.onclick = onQuoteClick;

        urlButton = textOptions.querySelector('.url');
        urlButton.onmousedown = onUrlClick;

        urlInput = textOptions.querySelector('.url-input');
        urlInput.onblur = onUrlInputBlur;
        urlInput.onkeydown = onUrlInputKeyDown;
    }

    function checkTextHighlighting(event) {

        var selection = window.getSelection();


        if (event.target.tagName.toLowerCase() != "html" &&
            (event.target.className === "url-input" ||
                event.target.classList.contains("url") ||
                event.target.parentNode.classList.contains("ui-inputs"))) {

            currentNodeList = findNodes(selection.focusNode);
            updateBubbleStates();
            return;
        }

        // Check selections exist
        if (selection.isCollapsed === true && lastType === false) {

            onSelectorBlur();
        }

        // Text is selected
        if (selection.isCollapsed === false && composing === false) {

            currentNodeList = findNodes(selection.focusNode);

            // Find if highlighting is in the editable area
            if (hasNode(currentNodeList, "ARTICLE")) {
                updateBubbleStates();
                updateBubblePosition();

                // Show the ui bubble
                textOptions.className = "text-options active";
            }
        }

        lastType = selection.isCollapsed;
    }

    function updateBubblePosition() {
        var selection = window.getSelection();
        var range = selection.getRangeAt(0);
        var boundary = range.getBoundingClientRect();

        textOptions.style.top = boundary.top - 5 + window.pageYOffset + "px";
        textOptions.style.left = (boundary.left + boundary.right) / 2 + "px";
    }

    function updateBubbleStates() {

        // It would be possible to use classList here, but I feel that the
        // browser support isn't quite there, and this functionality doesn't
        // warrent a shim.

        if (hasNode(currentNodeList, 'B')) {
            boldButton.className = "bold active"
        } else {
            boldButton.className = "bold"
        }

        if (hasNode(currentNodeList, 'I')) {
            italicButton.className = "italic active"
        } else {
            italicButton.className = "italic"
        }

        if (hasNode(currentNodeList, 'BLOCKQUOTE')) {
            quoteButton.className = "quote active"
        } else {
            quoteButton.className = "quote"
        }

        if (hasNode(currentNodeList, 'A')) {
            urlButton.className = "url useicons active"
        } else {
            urlButton.className = "url useicons"
        }
    }

    function onSelectorBlur() {

        textOptions.className = "text-options fade";
        setTimeout(function() {

            if (textOptions.className == "text-options fade") {

                textOptions.className = "text-options";
                textOptions.style.top = '-999px';
                textOptions.style.left = '-999px';
            }
        }, 260)
    }

    function findNodes(element) {

        var nodeNames = {};

        // Internal node?
        var selection = window.getSelection();

        // if( selection.containsNode( document.querySelector('b'), false ) ) {
        // 	nodeNames[ 'B' ] = true;
        // }

        while (element.parentNode) {

            nodeNames[element.nodeName] = true;
            element = element.parentNode;

            if (element.nodeName === 'A') {
                nodeNames.url = element.href;
            }
        }

        return nodeNames;
    }

    function hasNode(nodeList, name) {

        return !!nodeList[name];
    }

    function saveState(event) {

        localStorage['header'] = headerField.innerHTML;
        localStorage['content'] = contentField.innerHTML;
    }

    function loadState() {

        if (localStorage['header']) {
            headerField.innerHTML = localStorage['header'];
        }

        if (localStorage['content']) {
            contentField.innerHTML = localStorage['content'];
        }
    }

    function onBoldClick() {
        document.execCommand('bold', false);
    }

    function onItalicClick() {
        document.execCommand('italic', false);
    }

    function onQuoteClick() {

        var nodeNames = findNodes(window.getSelection().focusNode);

        if (hasNode(nodeNames, 'BLOCKQUOTE')) {
            document.execCommand('formatBlock', false, 'p');
            document.execCommand('outdent');
        } else {
            document.execCommand('formatBlock', false, 'blockquote');
        }
    }

    function onUrlClick() {

        if (optionsBox.className == 'options') {

            optionsBox.className = 'options url-mode';

            // Set timeout here to debounce the focus action
            setTimeout(function() {

                var nodeNames = findNodes(window.getSelection().focusNode);

                if (hasNode(nodeNames, "A")) {
                    urlInput.value = nodeNames.url;
                } else {
                    // Symbolize text turning into a link, which is temporary, and will never be seen.
                    document.execCommand('createLink', false, '/');
                }

                // Since typing in the input box kills the highlighted text we need
                // to save this selection, to add the url link if it is provided.
                lastSelection = window.getSelection().getRangeAt(0);
                lastType = false;

                urlInput.focus();

            }, 100);

        } else {

            optionsBox.className = 'options';
        }
    }

    function onUrlInputKeyDown(event) {

        if (event.keyCode === 13) {
            event.preventDefault();
            applyURL(urlInput.value);
            urlInput.blur();
        }
    }

    function onUrlInputBlur(event) {

        optionsBox.className = 'options';
        applyURL(urlInput.value);
        urlInput.value = '';

        currentNodeList = findNodes(window.getSelection().focusNode);
        updateBubbleStates();
    }

    function applyURL(url) {

        rehighlightLastSelection();

        // Unlink any current links
        document.execCommand('unlink', false);

        if (url !== "") {

            // Insert HTTP if it doesn't exist.
            if (!url.match("^(http|https)://")) {

                url = "http://" + url;
            }

            document.execCommand('createLink', false, url);
        }
        event.target
    }

    function rehighlightLastSelection() {

        window.getSelection().addRange(lastSelection);
    }

    function getWordCount() {

        var text = ZenPen.util.getText(contentField);

        if (text === "") {
            return 0
        } else {
            return text.split(/\s+/).length;
        }
    }

    function onCompositionStart(event) {
        composing = true;
    }

    function onCompositionEnd(event) {
        composing = false;
    }

    function startFlowMode(minutes) {
        flowMode = true;
        refreshFlow();
        contentField.addEventListener("keydown", flowKeyDownListener);
        contentField.addEventListener("mouseup", flowResetCaretAndScroll);
        document.body.classList.add("flow-mode");
    }

    function stopFlowMode() {
        flowEnd();
        contentField.removeEventListener("keydown", flowKeyDownListener);
        contentField.addEventListener("mouseup", flowResetCaretAndScroll);
        flowMode = false;
        document.body.classList.remove("flow-mode");
    }

    function refreshFlow() {
        clearTimeout(flowTimeout);
        contentField.classList.remove("flow-animation");
        contentField.offsetWidth = contentField.offsetWidth;
        contentField.classList.add("flow-animation");
        flowTimeout = setTimeout(function() {
            flowEnd();
        }, 7000);
    }

    function flowEnd() {
        contentField.innerHTML = "";
        contentField.classList.remove("flow-animation");
    }

    function flowKeyDownListener(event) {
        // Deselect text if selected
        if (window.getSelection() + "" != "") {
            window.getSelection().removeAllRanges()
        }

        // Make sure shortcuts work while keeping the scroll and the caret at the end
        if (event.ctrlKey && (
                event.keyCode === 66 ||
                event.keyCode === 73 ||
                event.keyCode === 85)) {
            flowLastKeyWasShortcut = true;
        } else if (!flowLastKeyWasShortcut) {
            flowResetCaretAndScroll();
        } else {
            flowLastKeyWasShortcut = false;
        }

        // Block ctrl + Z and ctrl + Y
        if (event.ctrlKey && (
                event.keyCode === 89 ||
                event.keyCode === 90)) {
            event.preventDefault();
            return;
        }

        // Refresh flow timeout if valid key pressed without ctrl
        if (!event.ctrlKey && flowRefreshKeys.indexOf(event.keyCode) > -1) {
            refreshFlow();
        }

        // Prevent certain keys from working
        if (flowRefreshKeys.indexOf(event.keyCode) < 0 && flowAllowKeys.indexOf(event.keyCode) < 0) {
            event.preventDefault();
            return false;
        }
    }

    function flowResetCaretAndScroll() {
        document.body.scrollTop = document.body.scrollHeight;
        var el = document.querySelector(".content");
        var n = el.childNodes.length;
        if (n === 0) {
            return;
        }
        var element = el.childNodes[n - 1];
        n = element.childNodes.length;
        while (n > 0) {
            element = element.childNodes[n - 1];
            n = element.childNodes.length;
        }
        var offset = element.length;
        var range = document.createRange();
        var sel = window.getSelection();
        range.setStart(element, offset);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
    }

    return {
        init: init,
        saveState: saveState,
        getWordCount: getWordCount,
        flow: {
            start: startFlowMode,
            stop: stopFlowMode,
            refreshDEBUG: refreshFlow
        }
    }

})();
