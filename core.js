(function () {
    const SESSION_KEY = 'maniac_session';
    const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
    console.log("Initializing AB test script...")

    const queryString = window.location.search;
    const urlParams2 = new URLSearchParams(queryString);
    let debugMode = parseInt(urlParams2.get('debug_mode') || 0);

    setTimeout(() => {
        applyStyles('.hide-maniac', 'opacity: 1 !important;');
    }, 1000);

    const botRegex = new RegExp(
        " daum[ /]| deusu/| yadirectfetcher|(?:^|[^g])news(?!sapphire)|" +
        "google(?!(app|/google| pixel))|bot|spider|crawl|http|lighthouse|screenshot", "i"
    );

    const simpleBotRegex = /bot|spider|crawl|http|lighthouse|screenshot/i;
    let compiledRegex;

    function log(statement) {
        !debugMode || console.debug(statement)
    }

    function applyStyles(selector, style) {
        const styleElement = document.createElement("style");
        styleElement.innerHTML = `${selector} { ${style} }`;

        const head = document.getElementsByTagName("head")[0];
        if (head) {
            head.appendChild(styleElement);
        }
    }

    applyStyles('.hide-maniac', 'opacity: 0;');
    const observer = new MutationObserver(() => {


        const elements = document.querySelectorAll('h1, h2, h3 , h4, p, div');

        const filtered = Array.from(elements).filter(heading => {
            // Check if all child nodes are either text or <br> elements
            return Array.from(heading.childNodes).every(node =>
                node.nodeType === Node.TEXT_NODE || (node.nodeType === Node.ELEMENT_NODE && node.tagName === "BR")
            );
        });

        for (let element of filtered) {
            element.classList.add("hide-maniac");
        }
    });
    observer.observe(document.documentElement, {childList: true, subtree: true});


    function getBotRegex() {
        if (compiledRegex instanceof RegExp) return compiledRegex;
        try {
            compiledRegex = botRegex;
        } catch {
            compiledRegex = simpleBotRegex;
        }
        return compiledRegex;
    }

    function isBot(userAgent) {
        return !!userAgent && getBotRegex().test(userAgent);
    }

    if (window.Shopify && window.Shopify.designMode) {
        log("Skipping script for design mode");
        return
    }
    if (window.location.href.includes("slScreenshot=true")) {
        log("Skipping for screenshot");
        return
    }
    if (window.location.hostname.endsWith(".shopifypreview.com") || window.location.hostname.endsWith(".edgemesh.com")) {
        log("Skipping for preview mode");
        return
    }
    if (isBot(navigator.userAgent)) {
        log("skipping because ot detected.")
        return;
    }


    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return JSON.parse(decodeURIComponent(parts.pop().split(';').shift()));
    }

    function setCookie(name, data, maxAge) {
        const encodedData = encodeURIComponent(JSON.stringify(data));
        // Encode for safety
        document.cookie = `${name}=${encodedData}; max-age=${maxAge}; path=/; secure; samesite=strict`;
    }

    // Wait for the DOM to be minimally ready
    const waitForDom = new Promise(resolve => {
        if (document.body) {
            resolve(); // Body is already available
        } else {
            const observer = new MutationObserver(() => {
                if (document.body) {
                    observer.disconnect();
                    resolve(); // Body is now available
                }
            });
            observer.observe(document.documentElement, {childList: true});
        }
    });


    const scriptUrl = document.currentScript.src;
    const urlParams = new URLSearchParams(new URL(scriptUrl).search);
    const customerId = parseInt(urlParams.get("customer_id"));
    let sessionId = null;

    if (!customerId) {
        console.log("No customer ID error.");
        Promise.all([waitForDom])
            .then(() => {
                document.body.style.opacity = '1';
            })
        return;
    }

    const getSession = new Promise(resolve => {
        let session = getCookie(SESSION_KEY);
        if (session && !debugMode) {
            console.log("existing session")
            resolve(session);
        } else {
            fetch("https://maniac-functions.vercel.app/api/session", {
                method: "POST",
                body: JSON.stringify({customer_id: customerId})
            }).then(response => response.json())
                .then(r => {
                    setCookie(SESSION_KEY, r, SESSION_TIMEOUT);
                    resolve(r);
                }).catch(() => {
                console.log("Could not create new session.");
                resolve();
            });

        }
    });

    function changeElementTextByContent(textToFind, newText) {
        // Find all elements in the document
        const elements = document.querySelectorAll('*');
        for (const element of elements) {
            if (element.children.length < 2) {
                if (element.innerHTML.trim() === textToFind) {
                    // Change the text content
                    element.innerHTML = newText;
                    log(`Text changed in element:`, element);
                    return; // Stop after the first match
                }
            }
        }
        console.warn(`No element found with the text: "${textToFind}"`);
    }

    function checkFlickerId(experiment) {
        try {
            return !!document.getElementById(experiment.bandit.content.flicker_id)
        } catch {
            return false;
        }
    }


    function handleTextBandit(experiment) {
        log(experiment);
        for (let index = 0; index < experiment.bandit.content.source.length; ++index) {
            log(experiment.bandit.content.source[index]);
            log(experiment.arm.subs[index]);
            changeElementTextByContent(experiment.bandit.content.source[index].k, experiment.arm.subs[index].v);
        }

    }

    function handleSectionBandit(experiment) {
        const main = document.querySelectorAll('main')[0];
        experiment.arm.sections.forEach(sectionLocation => {
            let sections = document.querySelectorAll('section');
            for (let section of sections) {
                if (section.id.includes(sectionLocation.id)) {
                    if (main.children[sectionLocation.index]) {
                        // Move the section to the correct position in the main element
                        main.insertBefore(section, main.children[sectionLocation.index]);
                    } else {
                        // If the target index is out of bounds, append the section at the end
                        main.appendChild(section);
                    }
                }
            }
        })

    }

    function handleBlockingExperiment(experiment) {
        try {
            const observer = new MutationObserver(() => {
                if (checkFlickerId(experiment)) {
                    handleExperiment(experiment);
                    observer.disconnect();
                }

            });
            observer.observe(document.documentElement, {childList: true, subtree: true});
        } catch (err) {
            console.log(err)
        }
    }

    function handleExperiment(experiment) {
        log("Handle experiment.")
        log(experiment)
        if (!experiment.arm) {
            log("baseline experiment.")
            return
        }

        try {
            if (experiment.bandit.type === 'SECTIONS') {
                handleSectionBandit(experiment)
            }
            if (experiment.bandit.type === 'TEXT') {
                handleTextBandit(experiment)
            }
        } catch (err) {
            console.log(err)
        }
    }

    // Synchronize data fetch and DOM readiness
    Promise.all([getSession])
        .then(([session]) => {
            if (!session || !session.customer.enabled) {
                log("Stopping AB test script.");
                applyStyles('.hide-maniac', 'opacity: 1 !important;');
                return
            }
            log(session);
            sessionId = session.session_id
            session.data = session.data.filter(exp => exp.bandit.page === window.location.pathname)
            log(`Filtered ${session.data.length} experiment(s) for page ${window.location.pathname}`)

            const blockingSessions = session.data.filter(exp => exp.bandit.content.flicker_id)

            log(`Waiting for ${blockingSessions.length} blocking experiments`)
            blockingSessions.forEach(experiment => handleBlockingExperiment(experiment));
            if (document.readyState === 'complete') {
                session.data.forEach(experiment => handleExperiment(experiment));
            } else {
                document.addEventListener("DOMContentLoaded", () => {
                    session.data.forEach(experiment => handleExperiment(experiment));
                });
            }
            // Reveal the body
            applyStyles('.hide-maniac', 'opacity: 1 !important;');
            //startTracking(customerId, sessionId, session.ids);
            console.log("Done.")
        })
        .catch(err => {
            console.error('Error in script execution:', err);
            applyStyles('.hide-maniac', 'opacity: 1 !important;');
        });

})();

function startTracking(customerId, sessionId, Ids) {
    const EVENTS = []; // Local array to store events
    const API_ENDPOINT = "https://maniac-functions.vercel.app/api/track"; // Replace with your API endpoint

    // Helper function to track events
    function trackEvent(eventType, eventData) {
        console.log(eventType, eventData);
        EVENTS.push({
            session_id: sessionId,
            event_type: eventType,
            event_data: eventData,
            timestamp: new Date().toISOString(),
        });
    }

    trackEvent("page_view", {page_url: window.location.pathname});

    // Listen for clicks
    document.addEventListener("click", (e) => {
        e.preventDefault(); // Stop the default navigation
        const {pageX: x, pageY: y, target} = e;

        const clickableElement = target.closest("button, a") || target;
        const href = clickableElement.href;
        const targetDetails = target.tagName.toLowerCase();
        const pageUrl = window.location.pathname;
        // Element-specific details
        const elementDetails = {
            tagName: target.tagName.toLowerCase(), // Tag name of clicked element
            id: target.id || null, // ID if available
            classList: [...target.classList].join(" ") || null, // Classes
            textContent: target.textContent.trim().slice(0, 50) || null, // Text content (limited to 50 chars)
            href: clickableElement.tagName.toLowerCase() === "a" ? clickableElement.href : null, // Include href for links
        };

        trackEvent("click", {x, y, target: targetDetails, page_url: pageUrl, details: elementDetails});
        // Send the tracking data immediately
        sendData().then(() => {
            // After sending data, navigate to the link
            if (href)
                window.location.href = href;
        });
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            console.log('User is idle or has left the tab.');
        } else {
            console.log('User has returned to the tab.');
        }
    });

    // Listen for scrolls (debounced)
    let scrollTimeout = null;
    document.addEventListener("scroll", () => {
        if (scrollTimeout) {
            clearTimeout(scrollTimeout);
        }

        scrollTimeout = setTimeout(() => {
            const scrollDepth = window.scrollY;
            const pageHeight = document.documentElement.scrollHeight;
            const scrollPercentage = (scrollDepth / pageHeight) * 100;
            const pageUrl = window.location.pathname;

            trackEvent("scroll", {scroll_depth: scrollDepth, scroll_percentage: scrollPercentage, page_url: pageUrl});
        }, 200); // Trigger event logging 200ms after user stops scrolling
    });

    const sendData = async () => {
        if (window.sessionEvents_) {
            window.sessionEvents_.forEach(event => {
                EVENTS.push({
                    session_id: sessionId,
                    event_type: event[0],
                    event_data: {},
                    timestamp: event[1].toISOString(),
                });
            })
            window.sessionEvents_ = [];
        }
        if (EVENTS.length > 0) {
            try {
                // Send batch data to the backend
                const response = await fetch(API_ENDPOINT, {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({
                        events: EVENTS, session_id: sessionId,
                        customer_id: customerId,
                        ids: Ids,
                        agent: window.navigator.userAgent,
                    }),
                });

                if (!response.ok) {
                    console.error("Failed to send tracking data", await response.text());
                } else {
                    console.log("Tracking data sent successfully");
                }

                // Clear the events array after successful transmission
                EVENTS.length = 0;
            } catch (err) {
                console.error("Error sending tracking data:", err);
                EVENTS.length = 0;
            }
        }
    }
    sendData().then();
    // Periodically send data
    setInterval(sendData, 3000); // Send data every 2 seconds
    window.addEventListener("beforeunload", sendData);
}
